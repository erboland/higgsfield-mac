# Changelog

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
