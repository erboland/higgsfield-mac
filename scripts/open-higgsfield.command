#!/bin/bash
# This app has no Apple Developer ID and is not notarized.
# A browser such as Arc attaches a quarantine flag. macOS then says the app is damaged.
# The xattr on PATH may be a different program that rejects -r. Call the system one.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/Higgsfield.app"
if [[ ! -d "$SRC" ]]; then
  echo "Could not find Higgsfield.app next to this opener."
  exit 1
fi

# A downloaded disk image is read-only, so the flag cannot be cleared in place.
if [[ -w "$SRC" ]]; then
  TARGET="$SRC"
else
  DEST="/Applications"
  if [[ ! -w "$DEST" ]]; then
    DEST="$HOME/Applications"
    /bin/mkdir -p "$DEST"
  fi
  TARGET="$DEST/Higgsfield.app"
  /bin/rm -rf "$TARGET"
  /usr/bin/ditto "$SRC" "$TARGET"
fi

echo "Clearing attributes on $TARGET"
/usr/bin/xattr -cr "$TARGET"
/usr/bin/open "$TARGET"
