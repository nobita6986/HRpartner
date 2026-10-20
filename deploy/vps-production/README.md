# HRP production on VPS

Public traffic uses `https://vieclammienbac.com.vn`. Nginx terminates TLS and
proxies to `127.0.0.1:3001`; that loopback binding is intentional and prevents
the Node.js port from being exposed directly to the Internet.

## Runtime

- `hrp-app`: immutable image from GHCR; application receives only the RLS writer
  database URL.
- `hrp-redis`: persistent Redis for distributed public-route rate limits.
- `hrp-rate-limit`: pinned Upstash-compatible REST bridge on the private Docker
  network. It has no host port.
- Nginx: the only public HTTP/TLS entry point.

Runtime secrets live only in `/etc/hrp/secrets/production.env` and
`/etc/hrp/secrets/rate-limit.env`. The database owner URL is isolated in
`/etc/hrp/secrets/migration.env` and is never passed to `hrp-app`.
The ETrust encryption key is retained as the `ETRUST_CREDENTIALS_ENCRYPTION_KEY`
secret in the GitHub `production` environment and can be synchronized to a VPS
with the owner-only `Configure ETrust encryption key on VPS` workflow. Keep that
same key when moving the database to another VPS so saved provider credentials
remain decryptable.

## Release flow

1. A push to `main` runs CI only. Merging a PR never deploys automatically.
2. The repository owner manually runs `Deploy HRP to VPS` with an optional full
   commit SHA. The workflow rejects dispatches from anyone other than the owner.
3. The VPS checks that no migration is pending, resolves the tag to an immutable
   digest, starts the release, and smoke-tests `/login` and `/viec-lam`.
4. After successful smoke tests, the workflow sends a helper from the checked-out
   release to remove old HRP image tags while retaining the new image and the
   image that was running before deployment. It does not prune volumes or other
   repositories.
5. On failure, `deploy-production.sh` restores the prior image; cleanup is skipped.

If a release contains a new migration, deployment stops before changing the
running app. The repository owner must run `Migrate production database` with the
full commit SHA and confirmation `MIGRATE_PRODUCTION`; it creates and validates
a `pg_dump` backup before `prisma migrate deploy`. Then the owner manually runs
`Deploy HRP to VPS` for the same commit.

Never put production secrets in GitHub repository files, Docker images, or
application logs.
