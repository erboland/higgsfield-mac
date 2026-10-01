# Changelog

## 0.1.1

- Generate uses the local model only. The output folder is chosen with the system folder dialog, and the app creates Pictures/Higgsfield so a run is not blocked on a typed path.
- Template cards load their demo image and video from the app bundle.

## 0.1.0

- Prompts library, template gallery, create view, model list, and licenses.
- Account jobs go through the official `higgsfield` CLI after confirmation.
- Local image and video run on BK-SDM Tiny and save into the workspace.
- Template cards include a demo image. Video templates also include a short MP4.
- Unsigned macOS disk image from GitHub Actions, created with `hdiutil` and checked with `hdiutil verify`.
