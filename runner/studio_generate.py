"""Studio runner for Higgsfield.

Sampling controls live in sample_schedule.py. Checkpoint helpers live in studio_library.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from studio_library import *  # noqa: F401,F403
from studio_fetch import *  # noqa: F401,F403
from studio_stage import *  # noqa: F401,F403
from studio_inspect import inspect_weights_file
from studio_load import choose_cache, ensure_base, ensure_sdxl, ensure_sdxl_config, family_for, load_checkpoint_file, load_pipeline, write_video


def generate(job: dict) -> None:
    prompt = str(job.get("prompt", "")).strip()
    kind = job.get("kind")
    model_id = str(job.get("modelId") or MODEL_ID)
    if not prompt:
        raise SystemExit("Write a prompt before Generate.")
    if kind not in ("image", "video"):
        raise SystemExit("Generate writes an image or a local clip.")
    if model_id in HOSTED_IDS:
        raise SystemExit(f"{model_id} has no public weights in this app.")
    output_dir = Path(job["outputDir"]).expanduser()
    if output_dir == Path(output_dir.anchor):
        raise SystemExit("Refusing to write at the filesystem root.")
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = str(job.get("fileStem") or "studio")
    aspect = str(job.get("aspectRatio") or "1:1")
    if aspect not in ASPECTS:
        raise SystemExit("Unknown aspect ratio.")
    root = library_root()
    checkpoint: Path | None = None
    model_name = MODEL_NAME
    steps = 1
    guidance = 0.0
    family = "sd-turbo"
    if model_id == MODEL_ID:
        cache = choose_cache()
        pipe, inspection = load_pipeline(cache)
    elif model_id == SDXL_ID:
        family = "sdxl-turbo"
        model_name = SDXL_NAME
        checkpoint = ensure_sdxl(root)
        config_dir = ensure_sdxl_config(root, SDXL_ID)
        inspection = inspect_weights_file(checkpoint)
        emit({"phase": "inspect", "detail": inspection["detail"], "status": "completed" if inspection["available"] else "failed"})
        pipe, steps, guidance = load_checkpoint_file(checkpoint, "sdxl-turbo", config_dir)
    elif model_id == BASE_ID:
        family = "sdxl-base"
        model_name = BASE_NAME
        checkpoint = ensure_base(root)
        config_dir = ensure_sdxl_config(root, BASE_ID)
        inspection = inspect_weights_file(checkpoint)
        emit({"phase": "inspect", "detail": inspection["detail"], "status": "completed" if inspection["available"] else "failed"})
        pipe, steps, guidance = load_checkpoint_file(checkpoint, "sdxl-base", config_dir)
    elif model_id.startswith("file:"):
        checkpoint = resolve_library_file(root, model_id)
        if checkpoint.parent.name not in CHECKPOINT_FOLDERS:
            raise SystemExit("That file is not a checkpoint. LoRAs, VAEs, and embeddings attach to the selected checkpoint.")
        model_name = checkpoint.name
        family = family_for(checkpoint)
        if family == "sdxl-turbo":
            config_dir = ensure_sdxl_config(root, SDXL_ID)
        elif family == "sdxl-base":
            config_dir = ensure_sdxl_config(root, BASE_ID)
        else:
            config_dir = None
        inspection = inspect_weights_file(checkpoint)
        emit({"phase": "inspect", "detail": inspection["detail"], "status": "completed" if inspection["available"] else "failed"})
        pipe, steps, guidance = load_checkpoint_file(checkpoint, family, config_dir)
    else:
        raise SystemExit(f"{model_id} has no public weights in this app.")
    from sample_schedule import apply_schedule, resolve_sample, sample_euler

    sample = resolve_sample(job, family)
    steps = sample["steps"]
    guidance = sample["cfg"]
    apply_schedule(pipe, sample["sampler"], sample["scheduler"])
    width, height = (SDXL_ASPECTS if family == "sdxl-base" else ASPECTS)[aspect]
    if job.get("width") and job.get("height"):
        width = int(job["width"])
        height = int(job["height"])
        if width % 8 or height % 8 or width < 64 or height < 64:
            raise SystemExit("Width and height must be multiples of 8.")
    import torch

    torch.set_num_threads(int(os.environ.get("OMP_NUM_THREADS", "4")))
    attach_addons(pipe, root, job)
    # Comfy draws the latent on CPU from torch.manual_seed, then scales a full
    # denoise by sqrt(1 + sigma^2). Passing that tensor in skips the scheduler's
    # sigma-only scale. An omitted negative prompt is stored as zeros; Comfy
    # encodes the empty string instead.
    torch.manual_seed(sample["seed"])
    seeded = torch.manual_seed(sample["seed"])
    noise = torch.randn((1, pipe.unet.config.in_channels, height // 8, width // 8), generator=seeded, device="cpu")
    pipe.scheduler.set_timesteps(steps, device="cpu")
    sigma0 = pipe.scheduler.sigmas[0].to(torch.float32)
    latents = noise * torch.sqrt(1.0 + sigma0 * sigma0) / pipe.scheduler.init_noise_sigma
    if family in ("sdxl-base", "sdxl-turbo") and sample["sampler"] == "euler" and sample["scheduler"] == "normal":
        from sample_schedule import discrete_sigmas, normal_sigmas

        original = pipe.scheduler.set_timesteps

        def snap_timesteps(count, device=None, **kwargs):
            original(count, device=device)
            sigmas, indexes = normal_sigmas(discrete_sigmas(pipe.scheduler.alphas_cumprod), count)
            pipe.scheduler.sigmas = sigmas
            pipe.scheduler.timesteps = torch.tensor(indexes).float()
            pipe.scheduler.num_inference_steps = count
            pipe.scheduler._step_index = None

        pipe.scheduler.set_timesteps = snap_timesteps
    if kind == "image":
        emit(
            {
                "phase": "generate",
                "detail": f"Generating a still, {aspect}, {sample['sampler']} {sample['scheduler']} {steps} steps CFG {guidance}",
                "percent": 5,
                "status": "active",
            }
        )
        image = pipe(
            prompt,
            negative_prompt="",
            num_inference_steps=steps,
            guidance_scale=guidance,
            width=width,
            height=height,
            latents=latents,
        ).images[0]
        path = output_dir / f"{stem}.png"
        image.save(path)
        emit({"phase": "generate", "detail": "Still ready", "percent": 100, "status": "completed"})
        result = {
            "modelId": model_id,
            "modelName": model_name,
            "checkpoint": str(checkpoint) if checkpoint else MODEL_ID,
            "kind": "image",
            "filePath": str(path),
            "aspectRatio": aspect,
            "width": width,
            "height": height,
            "sampler": sample["sampler"],
            "scheduler": sample["scheduler"],
            "steps": steps,
            "cfg": guidance,
            "seed": sample["seed"],
            "inspection": {key: value for key, value in inspection.items() if key != "report"},
        }
        emit(result)
        return

    frames: list[Path] = []
    for index in range(2):
        emit(
            {
                "phase": "generate",
                "detail": f"Generating local clip frame {index + 1} of 2",
                "percent": 10 + index * 40,
                "status": "active",
            }
        )
        torch.manual_seed(sample["seed"] + index)
        seeded = torch.manual_seed(sample["seed"] + index)
        frame_noise = torch.randn(noise.shape, generator=seeded, device="cpu")
        frame_latents = frame_noise * torch.sqrt(1.0 + sigma0 * sigma0) / pipe.scheduler.init_noise_sigma
        image = pipe(
            prompt,
            num_inference_steps=steps,
            guidance_scale=guidance,
            width=width,
            height=height,
            negative_prompt="",
            latents=frame_latents,
        ).images[0]
        frame = output_dir / f"{stem}-frame-{index}.png"
        image.save(frame)
        frames.append(frame)
    video = output_dir / f"{stem}.mp4"
    write_video(frames, video)
    emit({"phase": "generate", "detail": "Local clip ready", "percent": 100, "status": "completed"})
    emit(
        {
            "modelId": model_id,
            "modelName": model_name,
            "checkpoint": str(checkpoint) if checkpoint else MODEL_ID,
            "kind": "video",
            "filePath": str(video),
            "clip": "local-stills",
            "note": f"Two stills from {model_name}. Not Kling, Veo, Seedance, or Genjutsu.",
            "inspection": {key: value for key, value in inspection.items() if key != "report"},
        }
    )


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--describe":
        describe()
        return
    if len(sys.argv) > 1 and sys.argv[1] == "--library":
        print(json.dumps(library_report()), flush=True)
        return
    if len(sys.argv) > 1 and sys.argv[1] == "--download":
        target = sys.argv[2] if len(sys.argv) > 2 else MODEL_ID
        root = library_root()
        if target == SDXL_ID:
            ensure_sdxl(root)
            return
        if target == BASE_ID:
            ensure_base(root)
            return
        if target != MODEL_ID:
            raise SystemExit(f"{target} has no public weights in this app.")
        cache = app_cache()
        ready = repair_caches(cache)
        if ready is None:
            pin_hub_cache(cache)
            download(cache)
        else:
            emit({"phase": "download", "detail": "SD Turbo is already on disk.", "percent": 100, "status": "completed"})
        return
    job = json.loads(sys.stdin.read() or "{}")
    generate(job)


if __name__ == "__main__":
    main()
