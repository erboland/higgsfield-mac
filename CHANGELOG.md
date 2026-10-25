# Changelog

## 0.2.2 — 25 Oct 2026

- Create is a stage with the prompt on a bottom bar. Templates are cards. Models is a checkpoint catalog. LoRA, VAE, and embedding weights stay behind Weights.
- SDXL stills decode the VAE in fp32. The fp16 mid-block was overflowing into gray bars.
- SDXL Base draws near 1024 on the long side. A 384×512 frame is outside that checkpoint and comes out as noise.

## 0.2.1 — 24 Oct 2026

- SDXL Base (`sd_xl_base_1.0.safetensors`) is the full checkpoint. Generate downloads it through the Downloads tray, then writes a still at 20 steps and guidance 5. SD Turbo and SDXL Turbo stay as distilled fast models.
- `.safetensors` and `.ckpt` files in `checkpoints` and `diffusion_models` are what Generate runs. LoRAs, VAEs, and embeddings in those folders attach to the selected checkpoint.
- The packaged app includes `runner/studio_generate.py`.

## 0.2.0

- The studio is no longer the BK-SDM Tiny runner. First open picks a starter. Create takes a prompt, an open checkpoint, and a Downloads tray with percent, size, speed, and time remaining.
- SDXL Base (`sd_xl_base_1.0.safetensors`) is the full checkpoint. SD Turbo and SDXL Turbo stay available as distilled fast models. Generate also runs a `.safetensors` or `.ckpt` already in the local model folders. A missing file downloads as `.part`, then commits. Soul, Kling, Veo, Seedance, and Genjutsu stay visible and are not downloads.
- REA (`rea-agents` `inspect-model-artifact`) reads the local safetensors header. Missing REA does not invent an inspection.
- Public studio presets (Editorial still, Lifestyle at home, Product hero shot, UGC review) fill the prompt and aspect. Generate resolves the checkpoint before it draws. Hosted API catalog ids stay disabled.

## 0.1.3

- Generate deletes an incomplete BK-SDM Tiny snapshot and downloads it again. The pipeline does not start until `config.json` and the weight files are present.
- The pinned diffusers 0.32.2 load uses `torch_dtype`. That release ignores `dtype`.
- Open the disk image from Terminal with `/usr/bin/xattr`. macOS blocks `Open Higgsfield.command` before it can run. The app is not notarized.

## 0.1.2

- The disk image includes the local runtime. Generate downloads BK-SDM Tiny only when it is not already on the machine, then writes the file into `~/Pictures/Higgsfield`.
- Template demos are packed in the app and shown on the cards.
- The output folder is never `/`.

## 0.1.1

- Generate uses the local model only. The output folder is chosen with the system folder dialog, and the app creates Pictures/Higgsfield so a run is not blocked on a typed path.
- Template cards load their demo image and video from the app bundle.
- The app bundle is ad-hoc signed. It is not notarized. The disk image includes Open Higgsfield.command, which runs `/usr/bin/xattr -cr` on Higgsfield.app and then opens it.

## 0.1.0

- Prompts library, template gallery, create view, model list, and licenses.
- Account jobs go through the official `higgsfield` CLI after confirmation.
- Local image and video run on BK-SDM Tiny and save into the workspace.
- Template cards include a demo image. Video templates also include a short MP4.
- Unsigned macOS disk image from GitHub Actions, created with `hdiutil` and checked with `hdiutil verify`.

