# Contributing

Thanks for helping with Higgsfield for Mac.

## Setup

Use Node.js 22 and Python 3.12.

```bash
npm install
python3 -m venv runner/.venv
runner/.venv/bin/pip install -r runner/requirements.txt
npm test
npm run typecheck
npm run dev
```

## Pull requests

- Open an issue or a draft pull request before a large change.
- Keep the product name Higgsfield. Do not add another product's source, names, or logos to the interface.
- Hosted Higgsfield models stay on the official CLI, behind the account confirmation. Do not claim those weights ran locally.
- Local generation stays in `runner/local_generate.py`. Name the open model that actually ran.
- Run `npm test` and `npm run typecheck` before you ask for review.
- Do not commit `runner/.venv`, `runner/.cache`, `node_modules`, or model weights.

## Template demos

Gallery media in `public/demos/` is generated from each template prompt:

```bash
node --experimental-strip-types scripts/build-template-demos.ts
```

Video templates get an MP4 and a poster PNG. Commit the new files with the template change.

## Releases

Tag `vX.Y.Z` on `main`. The macOS workflow builds an unsigned dmg and attaches it to the GitHub release. Do not add an Apple certificate secret unless you mean to start signing.
