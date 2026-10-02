# Higgsfield for Mac

Open source Mac app for [Higgsfield](https://higgsfield.ai) prompts and templates. Image and video generation runs on this machine.

The window is a black studio with a lime accent. Prompts and templates are the library. Create runs the installed local model and saves the file in a folder you pick with the system folder dialog.

Hosted Higgsfield models have no public weights, so they are not listed and this app does not claim they ran.

## Screenshots

![Prompts library](docs/screenshots/prompts.jpg)

![Templates with generated demos](docs/screenshots/templates.jpg)

![Create, with the output folder and the local model](docs/screenshots/create.jpg)

## Local model

Local image and video use **BK-SDM Tiny** (`nota-ai/bk-sdm-tiny`), an open model under the CreativeML OpenRAIL-M license. See [NOTICES.md](NOTICES.md).

- Image briefs save a PNG.
- Video briefs save an MP4 made of four frames from that same model, plus a poster frame.
- The first time the app opens it creates `Pictures/Higgsfield`, so Generate is ready without typing a path.
- **Choose folder** opens the system folder dialog. Files go in `<folder>/higgsfield-jobs/local/`.
- The first run downloads the weights into the app cache. They are not committed.

Template cards ship with a demo generated from each template prompt. Those files live in `public/demos/` and are packed into the app, so the gallery shows the pictures instead of empty frames.

## Install the app

The current disk image is on [GitHub Releases](https://github.com/erboland/higgsfield-mac/releases/latest):

[Higgsfield-0.1.1-arm64.dmg](https://github.com/erboland/higgsfield-mac/releases/download/v0.1.1/Higgsfield-0.1.1-arm64.dmg)

It is built on `macos-latest` and it is unsigned, because no Apple Developer certificate is configured. macOS will say the app is from an unidentified developer. To open it: right-click the app, choose Open, then Open again. Or remove the quarantine flag:

```bash
xattr -dr com.apple.quarantine /Applications/Higgsfield.app
```

The disk image is not notarized. It is created with `hdiutil` and checked with `hdiutil verify` before it is published. If an older download says the disk image is corrupted, download 0.1.1 again and discard the older file.

## Develop

Install [Node.js 22](https://nodejs.org/) and Python 3.12, then:

```bash
npm install
python3 -m venv runner/.venv
runner/.venv/bin/pip install -r runner/requirements.txt
npm run dev
```

That starts the Electron window and the renderer at <http://127.0.0.1:43127>.

`npm run dev:web` serves the screens without a window. Choosing a folder uses the system dialog in the Electron window.

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

`npm run dist:mac` writes `release/<version>/Higgsfield-<version>-<arch>.dmg`. The app bundle is unsigned (`identity` is null). The disk image itself is created with `hdiutil` and checked with `hdiutil verify` before it is published. GitHub Actions on `macos-latest` runs that command for a `v*` tag, or for a `main` commit whose message contains `Release v`, and attaches the `.dmg` to the GitHub Release.

## What you can do

- Browse prompts and templates. Each template card shows a demo made with BK-SDM Tiny.
- Choose an output folder with the folder dialog.
- Generate an image or a short video on this machine. The result is shown in the window and saved in the folder.

## License

MIT. See [LICENSE](LICENSE), [NOTICES.md](NOTICES.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).
