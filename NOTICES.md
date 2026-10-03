# Notices

This application is original code. It does not copy the source of the projects below. It does reuse factual interface names (skill ids, CLI subcommands, and model job-set types) from public Higgsfield documentation.

## Higgsfield

Copyright (c) 2026 Higgsfield AI

- [skills](https://github.com/higgsfield-ai/skills) — MIT
- [cli](https://github.com/higgsfield-ai/cli) — MIT, with that repository's `THIRD-PARTY-NOTICES.txt` for the CLI binary's own dependencies
- [cursor-plugin](https://github.com/higgsfield-ai/cursor-plugin) — MIT
- [omagotchi](https://github.com/higgsfield-ai/omagotchi) — MIT
- [higgsfield](https://github.com/higgsfield-ai/higgsfield) — Apache-2.0, plus that repository's `NOTICES.md`
- [higgsfield-client](https://github.com/higgsfield-ai/higgsfield-client) — Apache-2.0

The MIT permission notice and the Apache-2.0 license text live in those repositories. They apply if you copy those projects. This app does not vendor them.

`higgsfield-js` declares `"license": "MIT"` in `package.json` but the git tree has no LICENSE file. It is not included.

`app-templates` and `homebrew-tap` have no license file. They are not included. The Mac install line `brew install higgsfield-ai/tap/higgsfield` is an instruction, not a copy of the formula.

Model weights for the hosted generators are not in these repositories and are not distributed here.

Local image and video runs can use Stable Diffusion 1.5 (`runwayml/stable-diffusion-v1-5`) or BK-SDM Tiny (`nota-ai/bk-sdm-tiny`). Both are open checkpoints under the CreativeML OpenRAIL-M license. Copyright remains with their authors. This repository does not vendor those weights. Generate downloads a missing checkpoint into the app model folder. Checkpoint files already stored in a ComfyUI `models/checkpoints` folder can be selected. Soul, Kling, and the other hosted Higgsfield models have no public weights and are not downloaded.

## Upstream desktop shell

[Comfy Desktop](https://github.com/Comfy-Org/Comfy-Desktop) is dual-licensed AGPL-3.0-or-later or a commercial license. Copyright (c) Comfy Org. [ComfyUI](https://github.com/Comfy-Org/ComfyUI) is GPL-3.0.

This repository does not contain their source, icons, or logos. The Mac app follows the same architectural shape (Electron main process, preload bridge, side-by-side install records, spawned local tool) with code written for this project. A later slice that vendors either tree must keep their copyright, ship the corresponding license, mark the modification date, and license the combined work under those terms. Their trademarks are not licensed.
