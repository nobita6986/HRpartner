#!/usr/bin/env bash
set -Eeuo pipefail

readonly IMAGE_REPOSITORY=ghcr.io/nobita6986/hrpartner

prune_old_hrp_images() {
  if [[ $# -ne 2 || ! $1 =~ ^${IMAGE_REPOSITORY//./\\.}:[0-9a-f]{40}$ || ! $2 =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo "usage: $0 $IMAGE_REPOSITORY:<40-char-sha> sha256:<image-id>" >&2
    return 64
  fi

  current_id=$(docker image inspect --format '{{.Id}}' "$1") || {
    echo 'warning: unable to inspect current HRP image; skipping image cleanup' >&2
    return 0
  }
  if [[ ! $current_id =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo 'warning: current HRP image returned an unexpected ID; skipping image cleanup' >&2
    return 0
  fi
  previous_id=$2

  while IFS= read -r image_ref; do
    [[ -n $image_ref ]] || continue
    image_id=$(docker image inspect --format '{{.Id}}' "$image_ref") || {
      echo "warning: unable to inspect HRP image $image_ref; leaving it untouched" >&2
      continue
    }
    if [[ $image_id != "$current_id" && $image_id != "$previous_id" ]]; then
      docker image rm "$image_ref" >/dev/null || echo "warning: unable to remove old HRP image $image_ref" >&2
    fi
  done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' "$IMAGE_REPOSITORY")
}

prune_old_hrp_images "$@"
