#!/usr/bin/env bash
set -Eeuo pipefail

readonly COMPOSE_FILE=/opt/hrp/compose.production.yaml
readonly RELEASE_FILE=/opt/hrp/.release.env
readonly LOCK_FILE=/opt/hrp/.deploy.lock
readonly DOMAIN=https://vieclammienbac.com.vn

if [[ $# -ne 1 ]]; then
  echo "usage: $0 ghcr.io/nobita6986/hrpartner:<40-char-sha>" >&2
  exit 64
fi

requested_image=$1
if [[ ! $requested_image =~ ^ghcr\.io/nobita6986/hrpartner:[0-9a-f]{40}$ ]]; then
  echo "refusing non-immutable or unexpected image reference" >&2
  exit 65
fi

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "another deployment is already running" >&2; exit 75; }

previous_image=
if [[ -f $RELEASE_FILE ]]; then
  previous_image=$(sed -n 's/^HRP_IMAGE=//p' "$RELEASE_FILE" | head -n 1)
fi

rollback() {
  if [[ -n $previous_image ]]; then
    printf 'HRP_IMAGE=%s\n' "$previous_image" >"$RELEASE_FILE"
    docker compose --env-file "$RELEASE_FILE" -f "$COMPOSE_FILE" up -d --wait --remove-orphans || true
  fi
}
trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback; fi; exit $rc' EXIT

docker pull "$requested_image"
resolved_image=$(docker image inspect --format '{{index .RepoDigests 0}}' "$requested_image")
if [[ ! $resolved_image =~ ^ghcr\.io/nobita6986/hrpartner@sha256:[0-9a-f]{64}$ ]]; then
  echo "unable to resolve an immutable GHCR digest" >&2
  exit 66
fi

printf 'HRP_IMAGE=%s\n' "$resolved_image" >"$RELEASE_FILE.new"
chmod 640 "$RELEASE_FILE.new"
mv "$RELEASE_FILE.new" "$RELEASE_FILE"

docker compose --env-file "$RELEASE_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$RELEASE_FILE" -f "$COMPOSE_FILE" up -d --wait --remove-orphans

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 10 "$DOMAIN/login" >/dev/null \
    && curl --fail --silent --show-error --max-time 10 "$DOMAIN/viec-lam" >/dev/null; then
    echo "deployment smoke test passed"
    trap - EXIT
    docker image prune -f --filter 'until=168h' >/dev/null || true
    exit 0
  fi
  sleep 2
done

echo "deployment smoke test failed" >&2
exit 1
