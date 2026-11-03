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
