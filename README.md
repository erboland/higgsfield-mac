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
- The disk image includes the runtime. Generate is the only step.
- If BK-SDM Tiny is already on the machine, Generate runs it. If it is missing, Generate downloads it into the app and then runs it.
- Files are saved in `~/Pictures/Higgsfield`. Choose folder can point somewhere else. The app never uses `/`.

Template cards ship with a demo generated from each template prompt. Those files are packed into the app next to the window.

## Install the app

The current disk image is on [GitHub Releases](https://github.com/erboland/higgsfield-mac/releases/latest):

[Higgsfield-0.1.2-arm64.dmg](https://github.com/erboland/higgsfield-mac/releases/download/v0.1.2/Higgsfield-0.1.2-arm64.dmg)

There is no Apple Developer ID. The app is ad-hoc signed, and it is not notarized. Arc and other browsers attach a quarantine flag. macOS then says “Higgsfield” is damaged, and right-click Open does not get past that dialog.

Open it this way:

1. Open the disk image.
2. Double-click **Open Higgsfield.command**.
3. If macOS asks whether to open the command, choose Open. Right-click the command and choose Open if the first click is blocked.
4. The opener copies Higgsfield into Applications when the disk image is read-only, runs `/usr/bin/xattr -cr` on `Higgsfield.app`, and opens the app.

The `xattr` on your PATH is not the system command. It rejected `-r`, so the quarantine flag stayed in place. Use `/usr/bin/xattr`.

After the app is in Applications, the same step in Terminal is:

```bash
/usr/bin/xattr -cr /Applications/Higgsfield.app
/usr/bin/open /Applications/Higgsfield.app
```

The disk image is created with `hdiutil` and checked with `hdiutil verify` before it is published. If an older download says the disk image is corrupted, or says the app is damaged, download 0.1.2 again and discard the older file.

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

`npm run dist:mac` writes `release/<version>/Higgsfield-<version>-<arch>.dmg`. electron-builder does not use a Developer ID (`identity` is null). `scripts/adhoc-sign.mjs` then ad-hoc signs the bundle, and the disk image must pass `codesign --verify --deep --strict` and `hdiutil verify`. The image also contains `Open Higgsfield.command`, which runs `/usr/bin/xattr -cr` on `Higgsfield.app` and opens it. The app is not notarized. GitHub Actions on `macos-latest` runs that command for a `v*` tag, or for a `main` commit whose message contains `Release v`, and attaches the `.dmg` to the GitHub Release.

## What you can do

- Browse prompts and templates. Each template card shows a demo made with BK-SDM Tiny.
- Choose an output folder with the folder dialog.
- Generate an image or a short video on this machine. The result is shown in the window and saved in the folder.

## License

MIT. See [LICENSE](LICENSE), [NOTICES.md](NOTICES.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).
