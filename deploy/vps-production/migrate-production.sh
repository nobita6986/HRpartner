#!/usr/bin/env bash
set -Eeuo pipefail

readonly MIGRATION_ENV=/etc/hrp/secrets/migration.env
readonly BACKUP_DIR=/srv/hrp/backups
readonly LOCK_FILE=/opt/hrp/.migration.lock
readonly POSTGRES_IMAGE=postgres:18-alpine

if [[ $# -ne 1 ]] || [[ ! $1 =~ ^ghcr\.io/nobita6986/hrpartner(@sha256:[0-9a-f]{64}|:[0-9a-f]{40})$ ]]; then
  echo "refusing unexpected image reference" >&2
  exit 65
fi

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "another migration is already running" >&2; exit 75; }

image=$1
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_name="hrp-before-migrate-${stamp}.dump"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

docker pull "$POSTGRES_IMAGE"
docker run --rm \
  --env-file "$MIGRATION_ENV" \
  -e BACKUP_NAME="$backup_name" \
  -v "$BACKUP_DIR:/backup" \
  "$POSTGRES_IMAGE" \
  sh -ceu 'pg_dump "$DATABASE_URL_ADMIN" --format=custom --file="/backup/$BACKUP_NAME"; pg_restore --list "/backup/$BACKUP_NAME" >/dev/null'

chmod 600 "$BACKUP_DIR/$backup_name"
docker run --rm --env-file "$MIGRATION_ENV" "$image" npx prisma migrate deploy
docker run --rm --env-file "$MIGRATION_ENV" "$image" npx prisma migrate status

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'hrp-before-migrate-*.dump' -mtime +30 -delete
echo "migration completed; verified backup: $BACKUP_DIR/$backup_name"
