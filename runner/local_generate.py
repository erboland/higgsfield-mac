"""Local image and video generation for Higgsfield.

This runner is original. It loads one open image model and writes the file
into the workspace. It does not call hosted Higgsfield models.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

MODEL_ID = "nota-ai/bk-sdm-tiny"
MODEL_NAME = "BK-SDM Tiny"


def describe() -> None:
    print(json.dumps({"modelId": MODEL_ID, "modelName": MODEL_NAME}), flush=True)


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
    if not output_dir.is_dir():
        raise SystemExit("The workspace output folder does not exist.")

    import torch
    from diffusers import StableDiffusionPipeline

    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        variant="fp16",
        dtype=torch.float32,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()

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
            poster = output_dir / f"{file_stem}-poster.png"
            image.save(poster)
    video = output_dir / f"{file_stem}.mp4"
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
