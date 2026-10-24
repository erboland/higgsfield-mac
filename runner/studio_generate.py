"""Studio runner for Higgsfield.

Local checkpoints live in the Comfy-style folders REA recovered. Hosted
Soul, Kling, Veo, Seedance, and Genjutsu weights are not downloaded.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

MODEL_ID = "stabilityai/sd-turbo"
MODEL_NAME = "SD Turbo"
SDXL_ID = "stabilityai/sdxl-turbo"
SDXL_NAME = "SDXL Turbo"
SDXL_FILE = "sd_xl_turbo_1.0_fp16.safetensors"
SDXL_BYTES = 6938081905
BASE_ID = "stabilityai/stable-diffusion-xl-base-1.0"
BASE_NAME = "SDXL Base"
BASE_FILE = "sd_xl_base_1.0.safetensors"
BASE_BYTES = 6938078334
BASE_STEPS = 20
BASE_GUIDANCE = 5.0
REPO_DIR = f"models--{MODEL_ID.replace('/', '--')}"
LIBRARY_FOLDERS = (
    "checkpoints",
    "diffusion_models",
    "text_encoders",
    "vae",
    "clip",
    "unet",
    "loras",
    "embeddings",
    "controlnet",
)
WEIGHT_SUFFIXES = (".safetensors", ".ckpt")
EMBEDDING_SUFFIXES = (".safetensors", ".pt", ".bin")
CHECKPOINT_FOLDERS = ("checkpoints", "diffusion_models")
HOSTED_IDS = {
    "text2image_soul_v2",
    "soul_cinematic",
    "soul_location",
    "kling3_0",
    "kling4_0",
    "kling_omni_image",
    "genjutsu",
    "genjutsu_lite",
    "veo3_1",
    "seedance_2_0",
    "seedance_2_5",
    "sora_2",
    "wan2_6",
    "nota-ai/bk-sdm-tiny",
}

# Exact files the pipeline reads. Do not use ignore globs: "*.bin" does not
# match nested diffusion_pytorch_model.bin and will pull multi-gigabyte extras.
# Sizes stay multiples of 8. SD Turbo is a 512 checkpoint; wider frames are not upscaled.
ASPECTS = {
    "1:1": (512, 512),
    "16:9": (512, 288),
    "9:16": (288, 512),
    "4:3": (512, 384),
    "3:4": (384, 512),
}

ALLOW_PATTERNS = [
    "model_index.json",
    "scheduler/scheduler_config.json",
    "text_encoder/config.json",
    "text_encoder/model.safetensors",
    "tokenizer/tokenizer_config.json",
    "tokenizer/vocab.json",
    "tokenizer/merges.txt",
    "tokenizer/special_tokens_map.json",
    "unet/config.json",
    "unet/diffusion_pytorch_model.safetensors",
    "vae/config.json",
    "vae/diffusion_pytorch_model.safetensors",
]


def describe() -> None:
    print(
        json.dumps(
            {
                "modelId": MODEL_ID,
                "modelName": MODEL_NAME,
                "models": [
                    {"id": MODEL_ID, "name": MODEL_NAME, "filename": "sd_turbo.safetensors"},
                    {"id": BASE_ID, "name": BASE_NAME, "filename": BASE_FILE},
                    {"id": SDXL_ID, "name": SDXL_NAME, "filename": SDXL_FILE},
                ],
                "inspector": "rea-agents",
                "hostedDownloadable": False,
            }
        ),
        flush=True,
    )


def emit(payload: dict) -> None:
    print(json.dumps(payload), flush=True)


def file_ok(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size > 0
    except OSError:
        return False


def revision_snapshot(cache_dir: Path) -> Path | None:
    repo = cache_dir / REPO_DIR
    ref = repo / "refs" / "main"
    snapshots = repo / "snapshots"
    if ref.is_file():
        revision = ref.read_text(encoding="utf-8").strip()
        if revision:
            return snapshots / revision
    if not snapshots.is_dir():
        return None
    children = sorted(path for path in snapshots.iterdir() if path.is_dir())
    if len(children) == 1:
        return children[0]
    return None


def snapshot_complete(snapshot: Path) -> bool:
    for name in ALLOW_PATTERNS:
        if not file_ok(snapshot / name):
            return False
    return True


def cache_is_complete(cache_dir: Path) -> bool:
    snapshot = revision_snapshot(cache_dir)
    return snapshot is not None and snapshot_complete(snapshot)


def discard_repo(cache_dir: Path) -> None:
    repo = cache_dir / REPO_DIR
    if repo.exists():
        shutil.rmtree(repo)


def machine_caches() -> list[Path]:
    found: list[Path] = []
    for key in ("HF_HUB_CACHE", "HUGGINGFACE_HUB_CACHE"):
        value = os.environ.get(key, "").strip()
        if value:
            found.append(Path(value).expanduser())
    home = os.environ.get("HF_HOME", "").strip()
    if home:
        found.append(Path(home).expanduser() / "hub")
    found.append(Path.home() / ".cache" / "huggingface" / "hub")
    return found


def known_caches(app_cache: Path) -> list[Path]:
    caches = [app_cache]
    parent = app_cache.parent
    if parent != app_cache:
        caches.append(parent)
    for existing in machine_caches():
        if existing not in caches:
            caches.append(existing)
    return caches


def repair_caches(app_cache: Path) -> Path | None:
    """Drop a missing or partial SD Turbo snapshot. Keep the first complete copy."""
    complete: Path | None = None
    for cache in known_caches(app_cache):
        if cache_is_complete(cache):
            if complete is None:
                complete = cache
            continue
        if (cache / REPO_DIR).exists():
            discard_repo(cache)
    return complete


def pin_hub_cache(cache: Path) -> None:
    os.environ["HF_HUB_CACHE"] = str(cache)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(cache)


def app_cache() -> Path:
    raw = os.environ.get("HIGGSFIELD_MODEL_HOME", "").strip()
    if not raw:
        raise SystemExit("The app model folder is not set.")
    cache = Path(raw).expanduser()
    cache.mkdir(parents=True, exist_ok=True)
    return cache


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
    relative = model_id[len("file:") :]
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
        pipe.load_lora_weights(str(path.parent), weight_name=path.name)
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
                "note": "Full SDXL checkpoint. Twenty steps at guidance 5. Not a turbo distillation.",
            },
        ],
    }


def stage_download(url: str, dest: Path, folder: str, filename: str, expected: int | None) -> None:
    """Stream to filename.part, then commit the finished file."""
    part = dest.parent / f"{dest.name}.part"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and (expected is None or dest.stat().st_size == expected):
        emit(
            {
                "phase": "download",
                "detail": f"{filename} is already in {folder}.",
                "percent": 100,
                "bytes": dest.stat().st_size,
                "total": dest.stat().st_size,
                "filename": filename,
                "folder": folder,
                "status": "completed",
            }
        )
        return
    if dest.exists():
        dest.unlink()
    existing = part.stat().st_size if part.is_file() else 0
    headers = {"User-Agent": "higgsfield-studio"}
    if existing:
        headers["Range"] = f"bytes={existing}-"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response:
        status = int(getattr(response, "status", 200))
        content_range = response.headers.get("Content-Range")
        length_header = response.headers.get("Content-Length")
        if status == 200:
            existing = 0
        if content_range and "/" in content_range:
            total = int(content_range.rsplit("/", 1)[-1])
        elif length_header:
            total = existing + int(length_header) if status == 206 else int(length_header)
        else:
            total = expected or 0
        mode = "ab" if status == 206 and existing else "wb"
        written = existing if mode == "ab" else 0
        started = time.monotonic()
        origin = written
        last_percent = -1
        with part.open(mode) as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
                written += len(chunk)
                percent = int(written * 100 / total) if total else 0
                if total and (percent == 100 or percent - last_percent >= 1):
                    last_percent = percent
                    elapsed = max(time.monotonic() - started, 0.001)
                    speed = (written - origin) / elapsed
                    eta = int(max(total - written, 0) / speed) if speed else None
                    emit(
                        {
                            "phase": "download",
                            "detail": f"Downloading {filename}, {percent}%",
                            "percent": percent,
                            "bytes": written,
                            "total": total,
                            "speed": int(speed),
                            "eta": eta,
                            "filename": filename,
                            "folder": folder,
                            "status": "active",
                        }
                    )
    if expected is not None and written != expected:
        raise SystemExit(f"{filename} stopped at {written} of {expected} bytes. {part.name} is still in {folder}.")
    if total and written != total:
        raise SystemExit(f"{filename} stopped early. {part.name} is still in {folder}.")
    os.replace(part, dest)
    emit(
        {
            "phase": "download",
            "detail": f"Committed {filename}.",
            "percent": 100,
            "bytes": dest.stat().st_size,
            "total": dest.stat().st_size,
            "filename": filename,
            "folder": folder,
            "status": "completed",
        }
    )


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
    if "turbo" in name and ("xl" in name or path.stat().st_size > 4_000_000_000):
        return "sdxl-turbo"
    if "xl" in name or path.stat().st_size > 4_000_000_000:
        return "sdxl-base"
    return "sd"


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
        steps = 2
        guidance = 0.0
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    if hasattr(pipe, "enable_vae_tiling"):
        pipe.enable_vae_tiling()
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
    # Current rea-agents documents inspect-model-artifact for safetensors headers.
    # npm 6.7.0 does not ship that command yet, so the installed CLI falls through
    # to inspect-artifact and this app does not invent tensor rows.
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
    width, height = ASPECTS[aspect]
    root = library_root()
    checkpoint: Path | None = None
    model_name = MODEL_NAME
    steps = 2
    guidance = 0.0
    if model_id == MODEL_ID:
        cache = choose_cache()
        pipe, inspection = load_pipeline(cache)
    elif model_id == SDXL_ID:
        model_name = SDXL_NAME
        checkpoint = ensure_sdxl(root)
        config_dir = ensure_sdxl_config(root, SDXL_ID)
        inspection = inspect_weights_file(checkpoint)
        emit({"phase": "inspect", "detail": inspection["detail"], "status": "completed" if inspection["available"] else "failed"})
        pipe, steps, guidance = load_checkpoint_file(checkpoint, "sdxl-turbo", config_dir)
    elif model_id == BASE_ID:
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
    import torch

    torch.set_num_threads(int(os.environ.get("OMP_NUM_THREADS", "4")))
    attach_addons(pipe, root, job)
    if kind == "image":
        emit({"phase": "generate", "detail": f"Generating a still, {aspect}", "percent": 5, "status": "active"})
        image = pipe(prompt, num_inference_steps=steps, guidance_scale=guidance, width=width, height=height).images[0]
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
            num_inference_steps=max(1, steps - 1) if steps > 1 else 1,
            guidance_scale=guidance,
            width=width,
            height=height,
            generator=torch.Generator().manual_seed(1000 + index),
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
