"""Studio runner for Higgsfield.

Sampling controls live in sample_schedule.py. Checkpoint helpers live in studio_library.py.
"""

from studio_library import *  # noqa: F401,F403
from studio_fetch import *  # noqa: F401,F403
from studio_stage import *  # noqa: F401,F403

def ensure_sdxl(root: Path) -> Path:
    dest = root / "checkpoints" / SDXL_FILE
    emit(
        {
            "phase": "download",
            "detail": "Resolving models",
            "percent": 0,
            "filename": SDXL_FILE,
            "folder": "checkpoints",
            "status": "active",
        }
    )
    ensure_sdxl_config(root)
    if dest.is_file() and dest.stat().st_size == SDXL_BYTES:
        emit(
            {
                "phase": "download",
                "detail": "Models present. SDXL Turbo is already in checkpoints.",
                "percent": 100,
                "bytes": SDXL_BYTES,
                "total": SDXL_BYTES,
                "filename": SDXL_FILE,
                "folder": "checkpoints",
                "status": "completed",
            }
        )
        return dest
    stage_download(
        f"https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/{SDXL_FILE}",
        dest,
        "checkpoints",
        SDXL_FILE,
        SDXL_BYTES,
    )
    return dest


def ensure_base(root: Path) -> Path:
    dest = root / "checkpoints" / BASE_FILE
    emit(
        {
            "phase": "download",
            "detail": "Resolving models",
            "percent": 0,
            "filename": BASE_FILE,
            "folder": "checkpoints",
            "status": "active",
        }
    )
    ensure_sdxl_config(root, BASE_ID)
    if dest.is_file() and dest.stat().st_size == BASE_BYTES:
        emit(
            {
                "phase": "download",
                "detail": "Models present. SDXL Base is already in checkpoints.",
                "percent": 100,
                "bytes": BASE_BYTES,
                "total": BASE_BYTES,
                "filename": BASE_FILE,
                "folder": "checkpoints",
                "status": "completed",
            }
        )
        return dest
    stage_download(
        f"https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/{BASE_FILE}",
        dest,
        "checkpoints",
        BASE_FILE,
        BASE_BYTES,
    )
    return dest


def ensure_sdxl_config(cache: Path, repo_id: str = SDXL_ID) -> Path:
    from huggingface_hub import snapshot_download

    config_files = [
        "model_index.json",
        "scheduler/scheduler_config.json",
        "tokenizer/tokenizer_config.json",
        "tokenizer/vocab.json",
        "tokenizer/merges.txt",
        "tokenizer/special_tokens_map.json",
        "tokenizer_2/tokenizer_config.json",
        "tokenizer_2/vocab.json",
        "tokenizer_2/merges.txt",
        "tokenizer_2/special_tokens_map.json",
        "text_encoder/config.json",
        "text_encoder_2/config.json",
        "unet/config.json",
        "vae/config.json",
    ]
    snapshot = snapshot_download(
        repo_id=repo_id,
        cache_dir=str(cache),
        allow_patterns=config_files,
    )
    return Path(snapshot)


def family_for(path: Path) -> str:
    name = path.name.lower()
    turbo = "turbo" in name
    xl = "xl" in name or path.stat().st_size > 4_000_000_000
    if turbo and xl:
        return "sdxl-turbo"
    if xl:
        return "sdxl-base"
    if turbo:
        return "sd-turbo"
    return "sd"


def keep_sdxl_vae_in_fp32(pipe) -> None:
    """Decode SDXL in fp32. The stock upcast puts the VAE mid-block back in fp16, and that overflows into gray bars."""
    import torch

    if not hasattr(pipe, "upcast_vae"):
        return

    def upcast_vae() -> None:
        pipe.vae.to(torch.float32)

    pipe.upcast_vae = upcast_vae


def load_checkpoint_file(path: Path, family: str, config_dir: Path | None):
    import torch
    from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline

    if family in ("sdxl-turbo", "sdxl-base"):
        pipe = StableDiffusionXLPipeline.from_single_file(
            str(path),
            config=str(config_dir) if config_dir else (SDXL_ID if family == "sdxl-turbo" else BASE_ID),
            torch_dtype=torch.float16,
            local_files_only=True,
        )
        keep_sdxl_vae_in_fp32(pipe)
        steps = 1 if family == "sdxl-turbo" else BASE_STEPS
        guidance = 0.0 if family == "sdxl-turbo" else BASE_GUIDANCE
    else:
        pipe = StableDiffusionPipeline.from_single_file(
            str(path),
            torch_dtype=torch.float32,
            safety_checker=None,
            requires_safety_checker=False,
            local_files_only=True,
        )
        steps = 1 if family == "sd-turbo" else BASE_STEPS
        guidance = 0.0 if family == "sd-turbo" else BASE_GUIDANCE
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    # VAEDecode is one shot. Tiling is a separate node and stays off.
    # Leave the VAE in the checkpoint dtype so the pipeline's upcast path
    # still casts the latents. keep_sdxl_vae_in_fp32 then decodes in fp32.
    if hasattr(pipe.vae, "disable_tiling"):
        pipe.vae.disable_tiling()
    return pipe, steps, guidance


def choose_cache() -> Path:
    emit(
        {
            "phase": "download",
            "detail": "Resolving models",
            "percent": 0,
            "filename": "diffusion_pytorch_model.safetensors",
            "folder": "checkpoints",
            "status": "active",
        }
    )
    cache = app_cache()
    ready = repair_caches(cache)
    if ready is not None:
        pin_hub_cache(ready)
        emit(
            {
                "phase": "download",
                "detail": "Models present. SD Turbo is already on disk.",
                "percent": 100,
                "filename": "diffusion_pytorch_model.safetensors",
                "folder": "checkpoints",
                "status": "completed",
            }
        )
        return ready
    pin_hub_cache(cache)
    download(cache)
    if not cache_is_complete(cache):
        raise SystemExit("SD Turbo failed verification. The pipeline was not loaded.")
    emit(
        {
            "phase": "download",
            "detail": "Verified the allow-listed checkpoint.",
            "percent": 100,
            "filename": "diffusion_pytorch_model.safetensors",
            "folder": "checkpoints",
            "status": "completed",
        }
    )
    return cache


def rea_prefix() -> list[str] | None:
    override = os.environ.get("REA_BIN", "").strip()
    if override:
        return [override]
    for name in ("rea", "rea-agents"):
        found = shutil.which(name)
        if found:
            return [found]
    npx = shutil.which("npx")
    if npx:
        return [npx, "--yes", "rea-agents@6.7.0"]
    return None


def run_rea(argv: list[str]) -> subprocess.CompletedProcess[str] | None:
    try:
        return subprocess.run(argv, check=False, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired):
        return None


def inspect_weights_file(weight: Path) -> dict:
    if not file_ok(weight):
        return {"available": False, "detail": "REA inspection unavailable. The unet file is not on disk."}
    prefix = rea_prefix()
    if prefix is None:
        return {"available": False, "detail": "REA inspection unavailable. rea-agents is not installed."}
    primary = run_rea([*prefix, "inspect-model-artifact", str(weight), "--detail", "summary", "--json"])
    if primary is not None and primary.returncode == 0:
        try:
            payload = json.loads(primary.stdout)
        except json.JSONDecodeError:
            return {"available": False, "detail": "REA inspection unavailable. The report was not JSON."}
        return {"available": True, "detail": "REA inspected the checkpoint header.", "report": payload}
    fallback = run_rea([*prefix, "inspect-artifact", str(weight), "--format", "json"])
    raw = "" if fallback is None else (fallback.stdout or fallback.stderr or "")
    if "unsupported binary format" in raw or "file_format_rejected" in raw or "COMMAND_NOT_FOUND" in (primary.stdout if primary else ""):
        return {
            "available": False,
            "detail": "REA inspection unavailable. Published rea-agents 6.7.0 has no inspect-model-artifact command, and inspect-artifact rejects safetensors. Tensor rows were not inferred.",
        }
    if fallback is None or fallback.returncode != 0:
        return {"available": False, "detail": "REA inspection unavailable. inspect-model-artifact is not in this REA build."}
    try:
        payload = json.loads(fallback.stdout)
    except json.JSONDecodeError:
        return {"available": False, "detail": "REA inspection unavailable. inspect-artifact did not return JSON."}
    return {
        "available": True,
        "detail": "REA inspect-artifact read the file. This REA build has no inspect-model-artifact command, so tensor rows were not inferred.",
        "report": payload,
    }


def inspect_weights(snapshot: Path) -> dict:
    return inspect_weights_file(snapshot / "unet" / "diffusion_pytorch_model.safetensors")


def load_pipeline(cache: Path):
    snapshot = revision_snapshot(cache)
    if snapshot is None or not snapshot_complete(snapshot):
        raise SystemExit("SD Turbo is incomplete. The pipeline was not loaded.")
    inspection = inspect_weights(snapshot)
    emit({"phase": "inspect", "detail": inspection["detail"], "status": "completed" if inspection["available"] else "failed"})
    import torch
    from diffusers import StableDiffusionPipeline

    pipe = StableDiffusionPipeline.from_pretrained(
        str(snapshot),
        torch_dtype=torch.float32,
        safety_checker=None,
        requires_safety_checker=False,
        local_files_only=True,
    )
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    if hasattr(pipe.vae, "disable_tiling"):
        pipe.vae.disable_tiling()
    return pipe, inspection


def write_video(frames: list[Path], video: Path) -> None:
    import numpy as np
    from PIL import Image

    images = [Image.open(frame).convert("RGB") for frame in frames]
    width, height = images[0].size
    try:
        import av
    except ImportError:
        av = None
    if av is not None:
        container = av.open(str(video), mode="w")
        stream = container.add_stream("libx264", rate=4)
        stream.width = width
        stream.height = height
        stream.pix_fmt = "yuv420p"
        for image in images:
            frame = av.VideoFrame.from_ndarray(np.array(image), format="rgb24")
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
        container.close()
        return
    raise SystemExit("A local clip needs PyAV. This is not a Kling, Veo, or Seedance file.")


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
    from sample_schedule import apply_schedule, resolve_sample

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
    generator = torch.Generator(device="cpu").manual_seed(sample["seed"])
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
            num_inference_steps=steps,
            guidance_scale=guidance,
            width=width,
            height=height,
            generator=generator,
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
        image = pipe(
            prompt,
            num_inference_steps=steps,
            guidance_scale=guidance,
            width=width,
            height=height,
            generator=torch.Generator(device="cpu").manual_seed(sample["seed"] + index),
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
