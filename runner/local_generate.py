"""Local image and video generation for Higgsfield.

This runner is original. It loads an open checkpoint the app selected and
writes the file into the output folder. Hosted Higgsfield models are not in
the catalog and are not downloaded.
"""

from __future__ import annotations

import json
import os
import shutil
import struct
import sys
from pathlib import Path

OPEN_MODELS = {
    "runwayml/stable-diffusion-v1-5": {
        "name": "Stable Diffusion 1.5",
        "steps": 20,
        "size": 512,
        "video_steps": 8,
        "video_size": 384,
    },
    "nota-ai/bk-sdm-tiny": {
        "name": "BK-SDM Tiny",
        "steps": 8,
        "size": 384,
        "video_steps": 4,
        "video_size": 320,
    },
}
DEFAULT_MODEL_ID = "runwayml/stable-diffusion-v1-5"
REPO_DIR = "models--nota-ai--bk-sdm-tiny"

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


def describe() -> None:
    models = [{"modelId": model_id, "modelName": spec["name"]} for model_id, spec in OPEN_MODELS.items()]
    print(json.dumps({"defaultModelId": DEFAULT_MODEL_ID, "models": models}), flush=True)


def emit(phase: str, detail: str, percent: int | None = None) -> None:
    payload: dict[str, object] = {"phase": phase, "detail": detail}
    if percent is not None:
        payload["percent"] = percent
    print(json.dumps(payload), flush=True)


def repo_dir(model_id: str) -> str:
    return f"models--{model_id.replace('/', '--')}"


def file_ok(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size > 0
    except OSError:
        return False


def revision_snapshot(cache_dir: Path, model_id: str) -> Path | None:
    repo = cache_dir / repo_dir(model_id)
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


def cache_is_complete(cache_dir: Path, model_id: str) -> bool:
    snapshot = revision_snapshot(cache_dir, model_id)
    return snapshot is not None and snapshot_complete(snapshot)


def discard_repo(cache_dir: Path, model_id: str) -> None:
    repo = cache_dir / repo_dir(model_id)
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


def repair_caches(app_cache: Path, model_id: str = "nota-ai/bk-sdm-tiny") -> Path | None:
    """Drop a missing or partial snapshot. Keep the first complete copy."""
    complete: Path | None = None
    for cache in known_caches(app_cache):
        if cache_is_complete(cache, model_id):
            if complete is None:
                complete = cache
            continue
        if (cache / repo_dir(model_id)).exists():
            discard_repo(cache, model_id)
    return complete


def pin_hub_cache(cache: Path) -> None:
    os.environ["HF_HUB_CACHE"] = str(cache)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(cache)


def choose_cache(model_id: str) -> Path:
    spec = OPEN_MODELS[model_id]
    app_cache = Path(os.environ.get("HIGGSFIELD_MODEL_HOME", "")).expanduser()
    if not str(app_cache):
        raise SystemExit("The app model folder is not set.")
    app_cache.mkdir(parents=True, exist_ok=True)
    ready = repair_caches(app_cache, model_id)
    if ready is not None:
        pin_hub_cache(ready)
        return ready
    pin_hub_cache(app_cache)
    emit("download", f"Downloading {spec['name']}", 0)
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
                    label = f"Downloading {spec['name']}"
                    if self.desc:
                        label = f"{label}, {self.desc}"
                    emit("download", f"{label}, {percent}%", percent)
            return displayed

    kwargs = {
        "cache_dir": str(app_cache),
        # Name the files the pipeline reads. A wildcard such as *.bin does not
        # match unet/diffusion_pytorch_model.bin, and that file is several gigabytes.
        "allow_patterns": [
            "model_index.json",
            "feature_extractor/preprocessor_config.json",
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
        ],
    }
    if "tqdm_class" in inspect.signature(snapshot_download).parameters:
        kwargs["tqdm_class"] = Report
    snapshot_download(model_id, **kwargs)
    if not cache_is_complete(app_cache, model_id):
        discard_repo(app_cache, model_id)
        raise SystemExit(f"{spec['name']} did not finish downloading.")
    return app_cache


def prepare_pipe(pipe):
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    return pipe


def load_pipeline(cache: Path, model_id: str):
    snapshot = revision_snapshot(cache, model_id)
    if snapshot is None or not snapshot_complete(snapshot):
        raise SystemExit(f"{OPEN_MODELS[model_id]['name']} is incomplete.")
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
    return prepare_pipe(pipe)


def weight_family(path: Path) -> str:
    if path.suffix.lower() != ".safetensors":
        return "sd15"
    with path.open("rb") as handle:
        raw = handle.read(8)
        if len(raw) < 8:
            return "sd15"
        length = struct.unpack("<Q", raw)[0]
        if length <= 0 or length > 8_000_000:
            return "sd15"
        header = json.loads(handle.read(length))
    keys = [key for key in header if key != "__metadata__"]
    if any(key.startswith("conditioner.embedders.1.") for key in keys):
        return "sdxl"
    return "sd15"


def load_checkpoint(path: Path):
    import torch
    from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline

    family = weight_family(path)
    pipeline = StableDiffusionXLPipeline if family == "sdxl" else StableDiffusionPipeline
    kwargs = {"torch_dtype": torch.float32}
    if family == "sd15":
        kwargs["safety_checker"] = None
        kwargs["requires_safety_checker"] = False
    try:
        pipe = pipeline.from_single_file(str(path), local_files_only=True, **kwargs)
    except TypeError:
        pipe = pipeline.from_single_file(str(path), **kwargs)
    profile = (
        {"steps": 12, "size": 768, "video_steps": 4, "video_size": 512}
        if family == "sdxl"
        else {"steps": 20, "size": 512, "video_steps": 8, "video_size": 384}
    )
    return prepare_pipe(pipe), profile


def write_video(frames: Path, video: Path) -> None:
    import numpy as np
    from PIL import Image

    first = Image.open(frames / "frame_00.png").convert("RGB")
    width, height = first.size
    width -= width % 2
    height -= height % 2
    if width < 2 or height < 2:
        raise SystemExit("The frame is too small to save as video.")

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
        for index in range(4):
            image = Image.open(frames / f"frame_{index:02d}.png").convert("RGB")
            image = image.resize((width, height))
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


def render(pipe, prompt: str, steps: int, size: int, seed: int):
    import torch

    return pipe(
        prompt,
        num_inference_steps=steps,
        guidance_scale=7.5,
        height=size,
        width=size,
        generator=torch.Generator().manual_seed(seed),
    ).images[0]


def generate(job: dict) -> None:
    prompt = str(job.get("prompt", "")).strip()
    kind = job.get("kind")
    output_dir = Path(job.get("outputDir", ""))
    file_stem = str(job.get("fileStem", "")).strip()
    model_id = str(job.get("modelId") or DEFAULT_MODEL_ID).strip()
    checkpoint = str(job.get("checkpointPath") or "").strip()
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

    if checkpoint:
        if not model_id.startswith("checkpoint:"):
            raise SystemExit("Choose a checkpoint from the library.")
        weight = Path(checkpoint)
        if weight.suffix.lower() not in {".safetensors", ".ckpt"} or not file_ok(weight):
            raise SystemExit("That checkpoint file is not on this machine.")
        emit("generate", f"Generating with {weight.name}")
        pipe, profile = load_checkpoint(weight)
        model_name = weight.name
    else:
        if model_id not in OPEN_MODELS:
            raise SystemExit("Choose an open checkpoint. Hosted Higgsfield models have no public weights.")
        profile = OPEN_MODELS[model_id]
        model_name = str(profile["name"])
        cache = choose_cache(model_id)
        emit("generate", f"Generating with {model_name}")
        pipe = load_pipeline(cache, model_id)

    if kind == "image":
        image = render(pipe, prompt, int(profile["steps"]), int(profile["size"]), 7)
        path = output_dir / f"{file_stem}.png"
        image.save(path)
        print(
            json.dumps({"modelId": model_id, "modelName": model_name, "kind": "image", "filePath": str(path)}),
            flush=True,
        )
        return

    frames = output_dir / f"{file_stem}-frames"
    frames.mkdir(exist_ok=True)
    poster = output_dir / f"{file_stem}-poster.png"
    for index in range(4):
        image = render(pipe, prompt, int(profile["video_steps"]), int(profile["video_size"]), 11 + index)
        image.save(frames / f"frame_{index:02d}.png")
        if index == 0:
            image.save(poster)
    video = output_dir / f"{file_stem}.mp4"
    write_video(frames, video)
    print(
        json.dumps(
            {
                "modelId": model_id,
                "modelName": model_name,
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
