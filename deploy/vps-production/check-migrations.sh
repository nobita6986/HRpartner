#!/usr/bin/env bash
set -Eeuo pipefail

readonly MIGRATION_ENV=/etc/hrp/secrets/migration.env

if [[ $# -ne 1 ]] || [[ ! $1 =~ ^ghcr\.io/nobita6986/hrpartner(@sha256:[0-9a-f]{64}|:[0-9a-f]{40})$ ]]; then
  echo "refusing unexpected image reference" >&2
  exit 65
fi

docker run --rm --env-file "$MIGRATION_ENV" "$1" npx prisma migrate status
