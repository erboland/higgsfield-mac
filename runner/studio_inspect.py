"""REA checkpoint header inspection.

Published rea-agents 6.7.0 has no inspect-model-artifact command. This module
does not invent tensor rows when the CLI rejects a safetensors file.
"""

from studio_library import *  # noqa: F401,F403

def rea_prefix() -> list[str] | None:
    override = os.environ.get("REA_BIN", "").strip()
    if override:
        return [override]
    for name in ("rea", "rea-agents"):
        found = shutil.which(name)
        if found:
            return [found]
    npx = shutil.which("npx")
    if npx:
        return [npx, "--yes", "rea-agents@6.7.0"]
    return None


def run_rea(argv: list[str]) -> subprocess.CompletedProcess[str] | None:
    try:
        return subprocess.run(argv, check=False, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired):
        return None


def inspect_weights_file(weight: Path) -> dict:
    if not file_ok(weight):
        return {"available": False, "detail": "REA inspection unavailable. The unet file is not on disk."}
    prefix = rea_prefix()
    if prefix is None:
        return {"available": False, "detail": "REA inspection unavailable. rea-agents is not installed."}
    # Current rea-agents documents inspect-model-artifact for safetensors headers.
    # npm 6.7.0 does not ship that command yet, so the installed CLI falls through
    # to inspect-artifact and this app does not invent tensor rows.
    primary = run_rea([*prefix, "inspect-model-artifact", str(weight), "--detail", "summary", "--json"])
    if primary is not None and primary.returncode == 0:
        try:
            payload = json.loads(primary.stdout)
        except json.JSONDecodeError:
            return {"available": False, "detail": "REA inspection unavailable. The report was not JSON."}
        return {"available": True, "detail": "REA inspected the checkpoint header.", "report": payload}
    fallback = run_rea([*prefix, "inspect-artifact", str(weight), "--format", "json"])
    raw = "" if fallback is None else (fallback.stdout or fallback.stderr or "")
    if "unsupported binary format" in raw or "file_format_rejected" in raw or "COMMAND_NOT_FOUND" in (primary.stdout if primary else ""):
        return {
            "available": False,
            "detail": "REA inspection unavailable. Published rea-agents 6.7.0 has no inspect-model-artifact command, and inspect-artifact rejects safetensors. Tensor rows were not inferred.",
        }
    if fallback is None or fallback.returncode != 0:
        return {"available": False, "detail": "REA inspection unavailable. inspect-model-artifact is not in this REA build."}
    try:
        payload = json.loads(fallback.stdout)
    except json.JSONDecodeError:
        return {"available": False, "detail": "REA inspection unavailable. inspect-artifact did not return JSON."}
    return {
        "available": True,
        "detail": "REA inspect-artifact read the file. This REA build has no inspect-model-artifact command, so tensor rows were not inferred.",
        "report": payload,
    }


def inspect_weights(snapshot: Path) -> dict:
    return inspect_weights_file(snapshot / "unet" / "diffusion_pytorch_model.safetensors")
