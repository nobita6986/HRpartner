#!/usr/bin/env bash
# Installs /etc/sudoers.d/hrpdeploy-deploy on the local host.
# Idempotent. Validates with visudo before activation.
set -Eeuo pipefail

readonly SRC="$(cd "$(dirname "$0")" && pwd)/sudoers.d/hrpdeploy-deploy"
readonly DST=/etc/sudoers.d/hrpdeploy-deploy

if [[ ! -f "$SRC" ]]; then
  echo "missing source: $SRC" >&2
  exit 1
fi

# Validate with visudo first; do not write until it parses.
visudo -c -f "$SRC" >/dev/null

install -m 0440 -o root -g root "$SRC" "$DST"
visudo -c -f "$DST" >/dev/null
visudo -c >/dev/null
echo "installed $DST (0440 root:root, visudo-c OK)"
