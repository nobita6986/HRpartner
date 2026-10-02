#!/usr/bin/env bash
set -Eeuo pipefail

readonly MIGRATION_ENV=/etc/hrp/secrets/migration.env

if [[ $# -ne 1 ]] || [[ ! $1 =~ ^ghcr\.io/nobita6986/hrpartner(@sha256:[0-9a-f]{64}|:[0-9a-f]{40})$ ]]; then
  echo "refusing unexpected image reference" >&2
  exit 65
fi

# Prisma needs DATABASE_URL, but migration.env only exposes DATABASE_URL_ADMIN.
# Set DATABASE_URL=DATABASE_URL_ADMIN in the container so Prisma can talk to the
# admin connection (which is the only place migration script is allowed to use).
ADMIN_URL=$(awk -F= '/^DATABASE_URL_ADMIN=/{sub(/^[^=]*=/, ""); print}' "$MIGRATION_ENV")
if [[ -z "$ADMIN_URL" ]]; then
  echo "DATABASE_URL_ADMIN missing from $MIGRATION_ENV" >&2
  exit 66
fi
docker run --rm --env-file "$MIGRATION_ENV" -e "DATABASE_URL=$ADMIN_URL" "$1" npx prisma migrate status
