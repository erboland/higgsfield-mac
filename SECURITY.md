# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Email the maintainers, or use the GitHub private vulnerability report for this repository.

Include what you did, what you expected, and the version or commit you ran.

## What this app handles

- Workspace paths and prompts you type stay on your machine, except when you confirm an account job. That job is the official `higgsfield` CLI, which talks to your Higgsfield account.
- The app does not ask for an API key. Sign in with `higgsfield auth login` in Terminal.
- Local generation downloads a missing open checkpoint from Hugging Face: SDXL Base (`sd_xl_base_1.0.safetensors`), SD Turbo, or SDXL Turbo. A `.safetensors` or `.ckpt` already in the model folders can be selected. Those files stay in the app model folder. Hosted Higgsfield models are not downloaded.
- The published disk image is unsigned and not notarized. Check the release checksum if one is posted, and expect Gatekeeper to warn.
