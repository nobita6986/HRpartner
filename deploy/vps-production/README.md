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

## Release flow

1. A push to `main` runs the existing CI workflow.
2. After CI succeeds, `deploy-vps.yml` builds and pushes an image tagged with
   the exact commit SHA.
3. The VPS checks that no migration is pending, resolves the tag to an immutable
   digest, starts the release, and smoke-tests `/login` and `/viec-lam`.
4. On failure, `deploy-production.sh` restores the prior image.

If a release contains a new migration, the automatic deployment stops before
changing the running app. Run the manual `Migrate production database` workflow;
it creates and validates a `pg_dump` backup before `prisma migrate deploy`.
Then re-run `Deploy HRP to VPS` for the same main commit.

Never put production secrets in GitHub repository files, Docker images, or
application logs.
