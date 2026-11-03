"""Checkpoint loading for the studio runner.

The generate entrypoint stays in studio_generate.py.
"""

from studio_library import *  # noqa: F401,F403
from studio_fetch import *  # noqa: F401,F403
from studio_stage import *  # noqa: F401,F403
from studio_inspect import inspect_weights, inspect_weights_file

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
    if dest.is_file() and checkpoint_damage(dest):
        dest.unlink()
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
    if dest.is_file() and checkpoint_damage(dest):
        dest.unlink()
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


def open_checkpoint(path: Path, family: str, config_dir: Path | None):
    """Load a single-file checkpoint, or raise a one-line reason."""
    from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline

    if path.suffix.lower() == ".safetensors":
        damage = checkpoint_damage(path)
        if damage:
            if path.name in (BASE_FILE, SDXL_FILE):
                path.unlink(missing_ok=True)
                raise SystemExit(f"{damage} Run Generate again to download a fresh copy.")
            raise SystemExit(damage)
    try:
        if family in ("sdxl-turbo", "sdxl-base"):
            return StableDiffusionXLPipeline.from_single_file(
                str(path),
                config=str(config_dir) if config_dir else (SDXL_ID if family == "sdxl-turbo" else BASE_ID),
                torch_dtype=torch.float32,
                local_files_only=True,
            )
        return StableDiffusionPipeline.from_single_file(
            str(path),
            torch_dtype=torch.float32,
            safety_checker=None,
            requires_safety_checker=False,
            local_files_only=True,
        )
    except OSError as exc:
        text = str(exc).split("\n")[0]
        if "Unable to load weights" not in text:
            raise
        try:
            from safetensors.torch import load_file

            load_file(str(path), device="cpu")
        except Exception as cause:
            reason = str(cause).split("\n")[0]
            low = reason.lower()
            if "memory" in low or "alloc" in low:
                raise SystemExit(f"Not enough free memory to open {path.name}. Close other apps and run Generate again.") from cause
            path.unlink(missing_ok=True)
            raise SystemExit(f"{path.name} could not be opened ({reason}). It was removed. Run Generate again to download it.") from cause
        raise SystemExit(f"{path.name} opened, but the pipeline could not be built. Run Generate again.") from exc


def load_checkpoint_file(path: Path, family: str, config_dir: Path | None):
    if family in ("sdxl-turbo", "sdxl-base"):
        pipe = open_checkpoint(path, family, config_dir)
        keep_sdxl_vae_in_fp32(pipe)
        steps = 1 if family == "sdxl-turbo" else BASE_STEPS
        guidance = 0.0 if family == "sdxl-turbo" else BASE_GUIDANCE
    else:
        pipe = open_checkpoint(path, family, config_dir)
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


def load_pipeline(cache: Path):
    snapshot = revision_snapshot(cache)
    if snapshot is None or not snapshot_complete(snapshot):
        raise SystemExit("SD Turbo is incomplete. The pipeline was not loaded.")
    inspection = inspect_weights(snapshot)
    emit({"phase": "inspect", "detail": inspection["detail"], "status": "completed" if inspection["available"] else "failed"})
    import torch
    from diffusers import StableDiffusionPipeline

    # requirements-mac.txt pins diffusers 0.32.2, which accepts torch_dtype.
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

