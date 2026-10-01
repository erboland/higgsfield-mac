# Higgsfield for Mac

Open source Mac app for [Higgsfield](https://higgsfield.ai) skills and prompts, with local image and video generation.

The window is a black studio with a lime accent. Prompts and templates are the library. Create checks for the official `higgsfield` CLI, keeps workspace folders, and runs an account job only after you confirm. A separate local action writes an image or a short video on this machine.

Hosted Higgsfield models (Soul, Kling, Veo, Seedance, and the rest of the CLI catalog) have no public weights. The local runner never claims those weights ran.

## Local model

Local image and video use **BK-SDM Tiny** (`nota-ai/bk-sdm-tiny`), an open model under the CreativeML OpenRAIL-M license. See [NOTICES.md](NOTICES.md).

- Image briefs save a PNG.
- Video briefs save an MP4 made of four frames from that same model, plus a poster frame.
- Files go in `<workspace>/higgsfield-jobs/local/`.
- The first run downloads the weights into `runner/.cache`. They are not committed.

Template cards ship with demos already generated from each template prompt, in `public/demos/`.

## Install the app

GitHub Releases has an unsigned disk image built on `macos-latest`. macOS will say the app is from an unidentified developer because no Apple Developer certificate is available for this project. To open it: right-click the app, choose Open, then Open again. Or remove the quarantine flag:

```bash
xattr -dr com.apple.quarantine /Applications/Higgsfield.app
```

The disk image is not notarized.

## Develop

Install [Node.js 22](https://nodejs.org/) and Python 3.12, then:

```bash
npm install
python3 -m venv runner/.venv
runner/.venv/bin/pip install -r runner/requirements.txt
npm run dev
```

That starts the Electron window and the renderer at <http://127.0.0.1:43127>.

`npm run dev:web` serves the screens without a window. Saving a folder and running the CLI need the Electron window.

Install the CLI if the studio says it is missing:

```bash
brew install higgsfield-ai/tap/higgsfield
```

or `npm install -g @higgsfield/cli`. Sign in from Terminal with `higgsfield auth login`. The app does not ask for the API key. On macOS it also looks in `/opt/homebrew/bin` and `/usr/local/bin`.

## Checks

```bash
npm test
npm run typecheck
```

## Build a disk image

On a Mac:

```bash
npm run dist:mac
```

The dmg and zip land in `release/<version>/`. The build does not sign or notarize (`identity` is null, and `--publish never`). GitHub Actions on `macos-latest` runs the same command when a `v*` tag is pushed and attaches the dmg to the release.

## What you can do

- See whether `higgsfield` is installed.
- Create workspace folders. Jobs are stored in `higgsfield-jobs/`.
- Browse prompts and templates. Template cards show a local demo.
- Use or Start to open Create, then run the official CLI after confirming it uses your account.
- Generate locally from a prompt or template into the workspace with BK-SDM Tiny.

## License

MIT. See [LICENSE](LICENSE), [NOTICES.md](NOTICES.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).
