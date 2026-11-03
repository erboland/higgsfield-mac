"""Sampling controls for the studio runner.

The numbers follow ComfyUI's KSampler widget and the Stability turbo cards.
The schedulers are Diffusers classes. This file does not contain ComfyUI source.
"""

from __future__ import annotations

SAMPLERS = ("euler", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde")
SCHEDULERS = ("normal", "karras", "simple", "sgm_uniform")

# Generic checkpoints use the KSampler widget: 20 steps, CFG 8, euler, normal, seed 0.
# Turbo checkpoints use one step and CFG 0, the Stability card for those models.
FAMILY_DEFAULTS = {
    "sd": {"steps": 20, "cfg": 8.0, "sampler": "euler", "scheduler": "normal", "seed": 0},
    "sd-turbo": {"steps": 1, "cfg": 0.0, "sampler": "euler", "scheduler": "normal", "seed": 0},
    "sdxl-base": {"steps": 20, "cfg": 8.0, "sampler": "euler", "scheduler": "normal", "seed": 0},
    "sdxl-turbo": {"steps": 1, "cfg": 0.0, "sampler": "euler", "scheduler": "normal", "seed": 0},
}


def resolve_sample(job: dict, family: str) -> dict:
    defaults = FAMILY_DEFAULTS.get(family, FAMILY_DEFAULTS["sd"])
    sampler = str(job.get("sampler") or defaults["sampler"])
    scheduler = str(job.get("scheduler") or defaults["scheduler"])
    if sampler not in SAMPLERS:
        raise SystemExit(f"Unknown sampler {sampler}.")
    if scheduler not in SCHEDULERS:
        raise SystemExit(f"Unknown scheduler {scheduler}.")
    try:
        steps = int(job["steps"]) if "steps" in job and job["steps"] is not None else int(defaults["steps"])
        cfg = float(job["cfg"]) if "cfg" in job and job["cfg"] is not None else float(defaults["cfg"])
        seed = int(job["seed"]) if "seed" in job and job["seed"] is not None else int(defaults["seed"])
    except (TypeError, ValueError):
        raise SystemExit("Steps, CFG, and seed must be numbers.")
    if steps < 1 or steps > 10000:
        raise SystemExit("Steps must be from 1 to 10000.")
    if cfg < 0 or cfg > 100:
        raise SystemExit("CFG must be from 0 to 100.")
    if seed < 0:
        raise SystemExit("Seed must be zero or greater.")
    return {"sampler": sampler, "scheduler": scheduler, "steps": steps, "cfg": cfg, "seed": seed}


def discrete_sigmas(alphas_cumprod):
    """Sigma table of a 1000-step scaled-linear beta schedule. Index 0 is the smallest sigma."""
    import torch

    alphas = alphas_cumprod.to(dtype=torch.float32, device="cpu")
    return ((1.0 - alphas) / alphas).sqrt()


def normal_sigmas(full_sigmas, steps: int):
    """Linspace the training indices, interpolate sigma in log space, and end at 0.

    The last value is 0 so the final Euler step removes the remaining noise.
    """
    import torch

    log_sigmas = full_sigmas.clamp_min(1e-12).log()
    grid = torch.linspace(float(len(full_sigmas) - 1), 0.0, steps)
    chosen = []
    indexes = []
    for tick in grid:
        low = int(torch.floor(tick).item())
        high = min(int(torch.ceil(tick).item()), len(full_sigmas) - 1)
        weight = float(tick - low)
        log_sigma = (1.0 - weight) * log_sigmas[low] + weight * log_sigmas[high]
        sigma = log_sigma.exp()
        chosen.append(sigma)
        indexes.append(int((sigma.log() - log_sigmas).abs().argmin().item()))
    chosen.append(torch.zeros((), dtype=torch.float32))
    return torch.stack(chosen), indexes


def cpu_noise(shape, seed: int):
    """Unit gaussian from the process CPU seed, the same sequence `manual_seed` draws."""
    import torch

    torch.manual_seed(seed)
    seeded = torch.manual_seed(seed)
    return torch.randn(shape, generator=seeded, device="cpu", dtype=torch.float32)


def sample_euler(pipe, prompt: str, seed: int, steps: int, cfg: float, height: int, width: int):
    """Euler / normal loop for an epsilon SDXL UNet.

    The noisy latent starts as unit noise times sqrt(1 + sigma^2). The UNet sees
    that latent divided by sqrt(sigma^2 + 1), and its timestep is the nearest
    training index. CFG is uncond + scale * (cond - uncond). The negative prompt
    is the empty string, not a zero vector. The VAE divides by its scale once.
    """
    import torch
    from diffusers.image_processor import VaeImageProcessor

    full = discrete_sigmas(pipe.scheduler.alphas_cumprod)
    sigmas, indexes = normal_sigmas(full, steps)
    noise = cpu_noise((1, pipe.unet.config.in_channels, height // 8, width // 8), seed)
    latent = noise * torch.sqrt(1.0 + sigmas[0] * sigmas[0])

    embeds, negative, pooled, negative_pooled = pipe.encode_prompt(
        prompt=prompt,
        prompt_2=None,
        device="cpu",
        num_images_per_prompt=1,
        do_classifier_free_guidance=cfg > 1.0,
        negative_prompt="",
        negative_prompt_2="",
    )
    projection = pipe.text_encoder_2.config.projection_dim
    import gc

    del pipe.text_encoder
    del pipe.text_encoder_2
    gc.collect()
    time_ids = pipe._get_add_time_ids(
        (height, width),
        (0, 0),
        (height, width),
        dtype=embeds.dtype,
        text_encoder_projection_dim=projection,
    )
    def predict(hidden, pooled_one, sigma_index):
        model_in = latent / torch.sqrt(sigmas[sigma_index] * sigmas[sigma_index] + 1.0)
        timestep = torch.tensor([indexes[sigma_index]], dtype=torch.float32)
        return pipe.unet(
            model_in,
            timestep,
            encoder_hidden_states=hidden,
            added_cond_kwargs={"text_embeds": pooled_one, "time_ids": time_ids},
            return_dict=False,
        )[0]

    for index, sigma in enumerate(sigmas[:-1]):
        if cfg > 1.0:
            uncond = predict(negative, negative_pooled, index)
            cond = predict(embeds, pooled, index)
            noise_pred = uncond + cfg * (cond - uncond)
        else:
            noise_pred = predict(embeds, pooled, index)
        denoised = latent - sigma * noise_pred
        derivative = (latent - denoised) / sigma
        latent = latent + derivative * (sigmas[index + 1] - sigma)

    decoded = pipe.vae.decode(latent.to(dtype=pipe.vae.dtype) / pipe.vae.config.scaling_factor, return_dict=False)[0]
    image = VaeImageProcessor().postprocess(decoded, output_type="pil")[0]
    return image


def apply_schedule(pipe, sampler: str, scheduler: str) -> None:
    """Select a Diffusers scheduler.

    normal keeps the checkpoint sigma grid with linspace steps.
    karras warps that grid. Euler ancestral in Diffusers 0.32 has no Karras flag,
    so that pair uses the same spacing without the warp.
    simple and sgm_uniform use trailing steps, the short uniform pick.
    """
    from diffusers import DPMSolverMultistepScheduler, EulerAncestralDiscreteScheduler, EulerDiscreteScheduler

    spacing = "linspace" if scheduler in ("normal", "karras") else "trailing"
    karras = scheduler == "karras"
    config = pipe.scheduler.config
    if sampler == "euler":
        pipe.scheduler = EulerDiscreteScheduler.from_config(config, timestep_spacing=spacing, use_karras_sigmas=karras)
        return
    if sampler == "euler_ancestral":
        pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(config, timestep_spacing=spacing)
        return
    if sampler == "dpmpp_2m":
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            config,
            algorithm_type="dpmsolver++",
            solver_order=2,
            timestep_spacing=spacing,
            use_karras_sigmas=karras,
        )
        return
    if sampler == "dpmpp_2m_sde":
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            config,
            algorithm_type="sde-dpmsolver++",
            solver_order=2,
            timestep_spacing=spacing,
            use_karras_sigmas=karras,
        )
        return
    raise SystemExit(f"Unknown sampler {sampler}.")
