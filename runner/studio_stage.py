from studio_library import *  # noqa: F401,F403
from studio_fetch import *  # noqa: F401,F403

def stage_download(url: str, dest: Path, folder: str, filename: str, expected: int | None) -> None:
    """Stream to filename.part, then commit the finished file."""
    part = dest.parent / f"{dest.name}.part"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and (expected is None or dest.stat().st_size == expected):
        emit(
            {
                "phase": "download",
                "detail": f"{filename} is already in {folder}.",
                "percent": 100,
                "bytes": dest.stat().st_size,
                "total": dest.stat().st_size,
                "filename": filename,
                "folder": folder,
                "status": "completed",
            }
        )
        return
    if dest.exists():
        dest.unlink()
    existing = part.stat().st_size if part.is_file() else 0
    headers = {"User-Agent": "higgsfield-studio"}
    if existing:
        headers["Range"] = f"bytes={existing}-"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response:
        status = int(getattr(response, "status", 200))
        content_range = response.headers.get("Content-Range")
        length_header = response.headers.get("Content-Length")
        if status == 200:
            existing = 0
        if content_range and "/" in content_range:
            total = int(content_range.rsplit("/", 1)[-1])
        elif length_header:
            total = existing + int(length_header) if status == 206 else int(length_header)
        else:
            total = expected or 0
        mode = "ab" if status == 206 and existing else "wb"
        written = existing if mode == "ab" else 0
        started = time.monotonic()
        origin = written
        last_percent = -1
        with part.open(mode) as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
                written += len(chunk)
                percent = int(written * 100 / total) if total else 0
                if total and (percent == 100 or percent - last_percent >= 1):
                    last_percent = percent
                    elapsed = max(time.monotonic() - started, 0.001)
                    speed = (written - origin) / elapsed
                    eta = int(max(total - written, 0) / speed) if speed else None
                    emit(
                        {
                            "phase": "download",
                            "detail": f"Downloading {filename}, {percent}%",
                            "percent": percent,
                            "bytes": written,
                            "total": total,
                            "speed": int(speed),
                            "eta": eta,
                            "filename": filename,
                            "folder": folder,
                            "status": "active",
                        }
                    )
    if expected is not None and written != expected:
        raise SystemExit(f"{filename} stopped at {written} of {expected} bytes. {part.name} is still in {folder}.")
    if total and written != total:
        raise SystemExit(f"{filename} stopped early. {part.name} is still in {folder}.")
    os.replace(part, dest)
    emit(
        {
            "phase": "download",
            "detail": f"Committed {filename}.",
            "percent": 100,
            "bytes": dest.stat().st_size,
            "total": dest.stat().st_size,
            "filename": filename,
            "folder": folder,
            "status": "completed",
        }
    )
