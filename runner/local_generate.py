"""Local image and video generation for Higgsfield.

This runner is original. It loads one open image model and writes the file
into the output folder. It does not call hosted Higgsfield models.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

MODEL_ID = "nota-ai/bk-sdm-tiny"
MODEL_NAME = "BK-SDM Tiny"
REPO_DIR = f"models--{MODEL_ID.replace('/', '--')}"


def describe() -> None:
    print(json.dumps({"modelId": MODEL_ID, "modelName": MODEL_NAME}), flush=True)


def emit(phase: str, detail: str) -> None:
    print(json.dumps({"phase": phase, "detail": detail}), flush=True)


# Files the pinned diffusers 0.32.2 pipeline reads. A snapshot that only has
# model_index.json still fails with "no file named config.json".
COMPONENT_FILES = {
    "feature_extractor": ("preprocessor_config.json",),
    "scheduler": ("scheduler_config.json",),
    "text_encoder": ("config.json", "model.safetensors"),
    "tokenizer": ("tokenizer_config.json", "vocab.json", "merges.txt"),
    "unet": ("config.json", "diffusion_pytorch_model.safetensors"),
    "vae": ("config.json", "diffusion_pytorch_model.safetensors"),
}


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
    if not file_ok(snapshot / "model_index.json"):
        return False
    for folder, names in COMPONENT_FILES.items():
        for name in names:
            if not file_ok(snapshot / folder / name):
                return False
    return True


def cache_is_complete(cache_dir: Path) -> bool:
    snapshot = revision_snapshot(cache_dir)
    return snapshot is not None and snapshot_complete(snapshot)


def discard_repo(cache_dir: Path) -> None:
    repo = cache_dir / REPO_DIR
    if repo.exists():
        shutil.rmtree(repo)


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
    """Drop a missing or partial BK-SDM Tiny snapshot. Keep the first complete copy."""
    complete: Path | None = None
    for cache in known_caches(app_cache):
        if cache_is_complete(cache):
            if complete is None:
                complete = cache
            continue
        if (cache / REPO_DIR).exists():
            discard_repo(cache)
    return complete


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


def pin_hub_cache(cache: Path) -> None:
    os.environ["HF_HUB_CACHE"] = str(cache)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(cache)


def choose_cache() -> Path:
    app_cache = Path(os.environ.get("HIGGSFIELD_MODEL_HOME", "")).expanduser()
    if not str(app_cache):
        raise SystemExit("The app model folder is not set.")
    app_cache.mkdir(parents=True, exist_ok=True)
    ready = repair_caches(app_cache)
    if ready is not None:
        pin_hub_cache(ready)
        return ready
    pin_hub_cache(app_cache)
    emit("download", "Downloading BK-SDM Tiny")
    import inspect

    from huggingface_hub import snapshot_download
    from tqdm.auto import tqdm

    class Report(tqdm):
        def __init__(self, *args, **kwargs):
            kwargs["disable"] = True
            super().__init__(*args, **kwargs)
            self._last = -1

        def update(self, n=1):
            displayed = super().update(n)
            total = self.total or 0
            if total:
                percent = int(self.n * 100 / total)
                if percent == 100 or percent - self._last >= 5:
                    self._last = percent
                    emit("download", f"Downloading BK-SDM Tiny, {percent}%")
            return displayed

    kwargs = {
        "cache_dir": str(app_cache),
        "ignore_patterns": ["safety_checker/*", "*.fp16.*", "*.bin", "**/.ipynb_checkpoints/*"],
    }
    if "tqdm_class" in inspect.signature(snapshot_download).parameters:
        kwargs["tqdm_class"] = Report
    snapshot_download(MODEL_ID, **kwargs)
    if not cache_is_complete(app_cache):
        discard_repo(app_cache)
        raise SystemExit("BK-SDM Tiny did not finish downloading.")
    return app_cache


def load_pipeline(cache: Path):
    snapshot = revision_snapshot(cache)
    if snapshot is None or not snapshot_complete(snapshot):
        raise SystemExit("BK-SDM Tiny is incomplete.")
    import torch
    from diffusers import StableDiffusionPipeline

    # requirements-mac.txt pins diffusers 0.32.2. That release accepts torch_dtype.
    # Passing dtype makes StableDiffusionPipeline warn and ignore the argument.
    pipe = StableDiffusionPipeline.from_pretrained(
        str(snapshot),
        torch_dtype=torch.float32,
        safety_checker=None,
        requires_safety_checker=False,
        local_files_only=True,
    )
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    return pipe


def write_video(frames: Path, video: Path) -> None:
    import numpy as np
    from PIL import Image

    try:
        import av
    except ImportError:
        av = None
    if av is not None:
        container = av.open(str(video), mode="w")
        stream = container.add_stream("libx264", rate=4)
        stream.width = 320
        stream.height = 320
        stream.pix_fmt = "yuv420p"
        for index in range(4):
            image = Image.open(frames / f"frame_{index:02d}.png").convert("RGB")
            frame = av.VideoFrame.from_ndarray(np.array(image), format="rgb24")
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
        container.close()
        return

    import subprocess

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            "4",
            "-i",
            str(frames / "frame_%02d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(video),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )


def generate(job: dict) -> None:
    prompt = str(job.get("prompt", "")).strip()
    kind = job.get("kind")
    output_dir = Path(job.get("outputDir", ""))
    file_stem = str(job.get("fileStem", "")).strip()
    if kind not in {"image", "video"}:
        raise SystemExit("Local generation only writes an image or a video.")
    if not prompt:
        raise SystemExit("Write a prompt before a local run.")
    if len(prompt) > 1000:
        prompt = prompt[:1000]
    if not file_stem or "/" in file_stem or "\\" in file_stem or ".." in file_stem:
        raise SystemExit("The output name is not valid.")
    if not output_dir.is_dir() or output_dir.resolve() == Path(output_dir.anchor):
        raise SystemExit("The output folder is not available.")

    cache = choose_cache()
    emit("generate", "Generating")
    pipe = load_pipeline(cache)
    import torch

    if kind == "image":
        image = pipe(
            prompt,
            num_inference_steps=8,
            guidance_scale=7.5,
            height=384,
            width=384,
            generator=torch.Generator().manual_seed(7),
        ).images[0]
        path = output_dir / f"{file_stem}.png"
        image.save(path)
        print(json.dumps({"modelId": MODEL_ID, "modelName": MODEL_NAME, "kind": "image", "filePath": str(path)}), flush=True)
        return

    frames = output_dir / f"{file_stem}-frames"
    frames.mkdir(exist_ok=True)
    poster = output_dir / f"{file_stem}-poster.png"
    for index in range(4):
        image = pipe(
            prompt,
            num_inference_steps=4,
            guidance_scale=7.5,
            height=320,
            width=320,
            generator=torch.Generator().manual_seed(11 + index),
        ).images[0]
        image.save(frames / f"frame_{index:02d}.png")
        if index == 0:
            image.save(poster)
    video = output_dir / f"{file_stem}.mp4"
    write_video(frames, video)
    print(
        json.dumps(
            {
                "modelId": MODEL_ID,
                "modelName": MODEL_NAME,
                "kind": "video",
                "filePath": str(video),
                "posterPath": str(poster),
            }
        ),
        flush=True,
    )


def main() -> None:
    if "--describe" in sys.argv:
        describe()
        return
    job = json.loads(sys.stdin.read() or "{}")
    try:
        generate(job)
    except SystemExit as error:
        print(str(error), file=sys.stderr)
        raise
    except Exception as error:  # noqa: BLE001 — surface the model failure to the app
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
