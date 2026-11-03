from studio_library import *  # noqa: F401,F403

def download(cache: Path) -> None:
    import inspect

    from huggingface_hub import snapshot_download
    from tqdm.auto import tqdm

    class Report(tqdm):
        def __init__(self, *args, **kwargs):
            kwargs["disable"] = True
            super().__init__(*args, **kwargs)
            self._last = -1
            self._started = time.monotonic()

        def update(self, n=1):
            displayed = super().update(n)
            total = int(self.total or 0)
            current = int(self.n or 0)
            if total <= 0:
                return displayed
            percent = int(current * 100 / total)
            if percent == 100 or percent - self._last >= 2:
                self._last = percent
                elapsed = max(time.monotonic() - self._started, 0.001)
                speed = current / elapsed
                remaining = max(total - current, 0)
                eta = int(remaining / speed) if speed else None
                emit(
                    {
                        "phase": "download",
                        "detail": f"Downloading SD Turbo, {percent}%",
                        "percent": percent,
                        "bytes": current,
                        "total": total,
                        "speed": int(speed),
                        "eta": eta,
                        "filename": "diffusion_pytorch_model.safetensors",
                        "folder": "checkpoints",
                        "status": "active",
                    }
                )
            return displayed

    emit(
        {
            "phase": "download",
            "detail": "Downloading SD Turbo",
            "percent": 0,
            "filename": "diffusion_pytorch_model.safetensors",
            "folder": "checkpoints",
            "status": "active",
        }
    )
    kwargs = {
        "repo_id": MODEL_ID,
        "cache_dir": str(cache),
        "allow_patterns": ALLOW_PATTERNS,
    }
    if "tqdm_class" in inspect.signature(snapshot_download).parameters:
        kwargs["tqdm_class"] = Report
    snapshot_download(**kwargs)
    if not cache_is_complete(cache):
        discard_repo(cache)
        emit(
            {
                "phase": "download",
                "detail": "SD Turbo download did not finish.",
                "status": "failed",
                "filename": "diffusion_pytorch_model.safetensors",
                "folder": "checkpoints",
            }
        )
        raise SystemExit("SD Turbo did not finish downloading.")
    emit(
        {
            "phase": "download",
            "detail": "SD Turbo download finished.",
            "percent": 100,
            "status": "completed",
            "filename": "diffusion_pytorch_model.safetensors",
            "folder": "checkpoints",
        }
    )


def library_root() -> Path:
    root = app_cache()
    for folder in LIBRARY_FOLDERS:
        (root / folder).mkdir(parents=True, exist_ok=True)
    return root


def weight_files(root: Path) -> list[tuple[str, Path]]:
    found: list[tuple[str, Path]] = []
    for folder in LIBRARY_FOLDERS:
        directory = root / folder
        if not directory.is_dir():
            continue
        for path in sorted(directory.iterdir()):
            if not path.is_file() or path.name.endswith(".part"):
                continue
            suffixes = EMBEDDING_SUFFIXES if folder == "embeddings" else WEIGHT_SUFFIXES
            if path.suffix.lower() not in suffixes:
                continue
            found.append((folder, path))
    return found


def file_model_id(folder: str, filename: str) -> str:
    return f"file:{folder}/{filename}"


def resolve_library_file(root: Path, model_id: str) -> Path:
    if not model_id.startswith("file:"):
        raise SystemExit(f"{model_id} is not a file in the model library.")
    relative = model_id[len("file:"):]
    parts = relative.split("/")
    if len(parts) != 2 or parts[0] not in LIBRARY_FOLDERS or parts[1] in ("", ".", ".."):
        raise SystemExit("That file is outside the model folders.")
    allowed = EMBEDDING_SUFFIXES if parts[0] == "embeddings" else WEIGHT_SUFFIXES
    if not parts[1].lower().endswith(allowed):
        raise SystemExit("Generate runs a .safetensors or .ckpt file.")
    folder = (root / parts[0]).resolve()
    path = (folder / parts[1]).resolve()
    if path.parent != folder:
        raise SystemExit("That file is outside the model folders.")
    if not path.is_file():
        raise SystemExit(f"{parts[1]} is not in {parts[0]}.")
    return path


def resolve_addon(root: Path, model_id: str, folder: str) -> Path:
    path = resolve_library_file(root, model_id)
    if path.parent.name != folder:
        raise SystemExit(f"That file is not in {folder}.")
    return path


def attach_addons(pipe, root: Path, job: dict) -> None:
    """LoRA, VAE, and embedding files apply only when this checkpoint can load them."""
    lora_id = str(job.get("loraId") or "").strip()
    vae_id = str(job.get("vaeId") or "").strip()
    embedding_id = str(job.get("embeddingId") or "").strip()
    if lora_id:
        path = resolve_addon(root, lora_id, "loras")
        if not hasattr(pipe, "load_lora_weights"):
            raise SystemExit("This checkpoint cannot use a LoRA.")
        strength_model = float(job.get("strengthModel", 1.0))
        strength_clip = float(job.get("strengthClip", 1.0))
        pipe.load_lora_weights(str(path.parent), weight_name=path.name)
        if strength_model != 1.0 or strength_clip != 1.0:
            from diffusers.utils import scale_lora_layers

            if strength_model != 1.0:
                scale_lora_layers(pipe.unet, strength_model)
            if strength_clip != 1.0:
                for attr in ("text_encoder", "text_encoder_2"):
                    module = getattr(pipe, attr, None)
                    if module is not None:
                        scale_lora_layers(module, strength_clip)
        emit({"phase": "generate", "detail": f"Loaded LoRA {path.name}", "status": "active"})
    if vae_id:
        path = resolve_addon(root, vae_id, "vae")
        from diffusers import AutoencoderKL

        pipe.vae = AutoencoderKL.from_single_file(str(path), torch_dtype=pipe.vae.dtype)
        emit({"phase": "generate", "detail": f"Loaded VAE {path.name}", "status": "active"})
    if embedding_id:
        path = resolve_addon(root, embedding_id, "embeddings")
        if not hasattr(pipe, "load_textual_inversion"):
            raise SystemExit("This checkpoint cannot use an embedding.")
        pipe.load_textual_inversion(str(path))
        emit({"phase": "generate", "detail": f"Loaded embedding {path.name}", "status": "active"})


def library_report() -> dict:
    root = library_root()
    grouped: dict[str, list[dict]] = {folder: [] for folder in LIBRARY_FOLDERS}
    for folder, path in weight_files(root):
        grouped[folder].append(
            {
                "id": file_model_id(folder, path.name),
                "folder": folder,
                "filename": path.name,
                "bytes": path.stat().st_size,
            }
        )
    sdxl_path = root / "checkpoints" / SDXL_FILE
    sdxl_ready = sdxl_path.is_file() and sdxl_path.stat().st_size == SDXL_BYTES
    base_path = root / "checkpoints" / BASE_FILE
    base_ready = base_path.is_file() and base_path.stat().st_size == BASE_BYTES
    turbo_ready = cache_is_complete(root) or any(
        item["filename"] == "sd_turbo.safetensors" for item in grouped["checkpoints"]
    )
    return {
        "root": str(root),
        "folders": [{"name": folder, "files": grouped[folder]} for folder in LIBRARY_FOLDERS],
        "models": [
            {
                "id": MODEL_ID,
                "name": MODEL_NAME,
                "folder": "checkpoints",
                "filename": "sd_turbo.safetensors",
                "installed": turbo_ready,
                "runnable": True,
                "note": "Open SD Turbo checkpoint.",
            },
            {
                "id": SDXL_ID,
                "name": SDXL_NAME,
                "folder": "checkpoints",
                "filename": SDXL_FILE,
                "installed": sdxl_ready,
                "runnable": True,
                "note": "Distilled one-step model. Not the full SDXL checkpoint.",
            },
            {
                "id": BASE_ID,
                "name": BASE_NAME,
                "folder": "checkpoints",
                "filename": BASE_FILE,
                "installed": base_ready,
                "runnable": True,
                "note": "Full SDXL checkpoint. Twenty steps, CFG 8, euler, normal. Not a turbo distillation.",
            },
        ],
    }
