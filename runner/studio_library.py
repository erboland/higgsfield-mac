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

sys.path.insert(0, str(Path(__file__).resolve().parent))

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
BASE_GUIDANCE = 8.0
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
# SDXL Base was trained near 1024 on the long side. 384×512 leaves most seeds as noise.
# Long side stays at 1024 so the VAE does not tile (tile latent threshold is 128).
SDXL_ASPECTS = {
    "1:1": (1024, 1024),
    "16:9": (1024, 576),
    "9:16": (576, 1024),
    "4:3": (1024, 768),
    "3:4": (768, 1024),
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


def checkpoint_damage(path: Path) -> str | None:
    """A short reason this file is not a readable safetensors checkpoint.

    A matching byte count is not enough. A resumed download can land on the
    expected size and still have a broken header, and diffusers then hides the
    real read error behind "Unable to load weights".
    """
    try:
        size = path.stat().st_size
    except OSError as exc:
        return f"{path.name} could not be read ({exc})."
    if size < 16:
        return f"{path.name} is too small to be a checkpoint."
    with path.open("rb") as handle:
        header_len = int.from_bytes(handle.read(8), "little")
        if header_len < 2 or header_len > 100_000_000 or 8 + header_len > size:
            return f"{path.name} is damaged."
        header = handle.read(header_len)
    if header.startswith(b"<") or header.startswith(b"version"):
        return f"{path.name} is not a checkpoint file."
    try:
        meta = json.loads(header)
    except json.JSONDecodeError:
        return f"{path.name} is damaged."
    if not isinstance(meta, dict):
        return f"{path.name} is damaged."
    tensors = [value for value in meta.values() if isinstance(value, dict) and "data_offsets" in value]
    if not tensors:
        return f"{path.name} has no weights."
    try:
        data_end = max(int(item["data_offsets"][1]) for item in tensors)
    except (KeyError, TypeError, ValueError):
        return f"{path.name} is damaged."
    if 8 + header_len + data_end != size:
        return f"{path.name} is incomplete."
    return None


def app_cache() -> Path:
    raw = os.environ.get("HIGGSFIELD_MODEL_HOME", "").strip()
    if not raw:
        raise SystemExit("The app model folder is not set.")
    cache = Path(raw).expanduser()
    cache.mkdir(parents=True, exist_ok=True)
    return cache


