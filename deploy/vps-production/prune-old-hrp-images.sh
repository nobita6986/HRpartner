#!/usr/bin/env bash
set -Eeuo pipefail

readonly IMAGE_REPOSITORY=ghcr.io/nobita6986/hrpartner

prune_old_hrp_images() {
  if [[ $# -ne 3 ]]; then
    echo "usage: $0 $IMAGE_REPOSITORY:<40-char-sha> sha256:<image-id> $IMAGE_REPOSITORY:rollback-<40-char-sha>" >&2
    return 64
  fi
  local current_ref=$1 previous_id=$2 rollback_ref=$3 current_id rollback_id image_ref image_id
  if [[ ! $current_ref =~ ^${IMAGE_REPOSITORY//./\\.}:[0-9a-f]{40}$ || ! $previous_id =~ ^sha256:[0-9a-f]{64}$ || ! $rollback_ref =~ ^${IMAGE_REPOSITORY//./\\.}:rollback-[0-9a-f]{40}$ ]]; then
    echo "usage: $0 $IMAGE_REPOSITORY:<40-char-sha> sha256:<image-id> $IMAGE_REPOSITORY:rollback-<40-char-sha>" >&2
    return 64
  fi

  current_id=$(docker image inspect --format '{{.Id}}' "$current_ref") || {
    echo 'warning: unable to inspect current HRP image; skipping image cleanup' >&2
    return 0
  }
  if [[ ! $current_id =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo 'warning: current HRP image returned an unexpected ID; skipping image cleanup' >&2
    return 0
  fi
  rollback_id=$(docker image inspect --format '{{.Id}}' "$rollback_ref") || {
    echo 'warning: unable to inspect rollback image tag; skipping image cleanup' >&2
    return 0
  }
  if [[ $rollback_id != "$previous_id" ]]; then
    echo 'warning: rollback image tag does not match the pre-deploy image; skipping image cleanup' >&2
    return 0
  fi

  while IFS= read -r image_ref; do
    [[ -n $image_ref ]] || continue
    [[ $image_ref != "$current_ref" && $image_ref != "$rollback_ref" ]] || continue
    image_id=$(docker image inspect --format '{{.Id}}' "$image_ref") || {
      echo "warning: unable to inspect HRP image $image_ref; leaving it untouched" >&2
      continue
    }
    docker image rm "$image_ref" >/dev/null || echo "warning: unable to remove old HRP image $image_ref (id $image_id)" >&2
  done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' "$IMAGE_REPOSITORY")
}

prune_old_hrp_images "$@"
