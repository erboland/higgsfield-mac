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

Local stills use SDXL Base (`stabilityai/stable-diffusion-xl-base-1.0`), SD Turbo (`stabilityai/sd-turbo`), and SDXL Turbo (`stabilityai/sdxl-turbo`). Copyright remains with Stability AI. SDXL Base is the full checkpoint. The turbo files are distilled. The weights are not vendored. Generate downloads a missing open checkpoint into the app model folder. A `.safetensors` or `.ckpt` you already have can be selected from the local model folders.

Model files are identified with [REA](https://github.com/morluto/rea) (`rea-agents`, MIT). This repository does not vendor that source. The app shells out to `rea inspect-model-artifact`. REA does not run inference.

## Card photographs

Template covers for Editorial still, Lifestyle at home, Product hero shot, and UGC review are stills drawn in this project with SDXL Base from each template's own prompt. They are not copies of higgsfield.com or ComfyUI marketing.

Hosted template cards and the checkpoint cards use photographs from [Unsplash](https://unsplash.com), stored in the app so the cards do not load them from the network. They are under the [Unsplash License](https://unsplash.com/license).

- Soul — [Aiony Haust](https://images.unsplash.com/photo-1534528741775-53994a69daeb)
- Kling — [Jakob Owens](https://unsplash.com/@jakobowens1), [photo](https://images.unsplash.com/photo-1485846234645-a62644f84728)
- Veo — [Felix Mooneeram](https://unsplash.com/@felixmooneeram), [red cinema chairs](https://unsplash.com/photos/red-cinema-chair-evlkOfkQ5rE), [photo](https://images.unsplash.com/photo-1489599849927-2ee91cede3ba)
- Angles — [Lance Anderson](https://unsplash.com/photos/QdAAasrZhdk), [photo](https://images.unsplash.com/photo-1487958449943-2429e8be8625)
- SD Turbo — Alexander Andrews, [photo](https://images.unsplash.com/photo-1516035069371-29a1b244cc32)
- SDXL Base card — [photo](https://images.unsplash.com/photo-1469334031218-e382a71b716b)
- SDXL Turbo — [photo](https://images.unsplash.com/photo-1452587925148-ce544e77e70d)
- Genjutsu — [photo](https://images.unsplash.com/photo-1518709268805-4e9042af9f23)
- Seedance — [photo](https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad)

The last four list the image because a photographer name could not be confirmed from the file or from a page that credits that exact photo.

## Upstream desktop shell

[Comfy Desktop](https://github.com/Comfy-Org/Comfy-Desktop) is dual-licensed AGPL-3.0-or-later or a commercial license. Copyright (c) Comfy Org. [ComfyUI](https://github.com/Comfy-Org/ComfyUI) is GPL-3.0.

This repository does not contain their source, icons, or logos. The Mac app follows the same architectural shape (Electron main process, preload bridge, side-by-side install records, spawned local tool) with code written for this project. A later slice that vendors either tree must keep their copyright, ship the corresponding license, mark the modification date, and license the combined work under those terms. Their trademarks are not licensed.
