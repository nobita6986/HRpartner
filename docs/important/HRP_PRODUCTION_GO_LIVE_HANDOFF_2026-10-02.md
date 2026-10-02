# HRP Production Go-Live Handoff (vieclammienbac.com.vn)

- **Date (UTC)**: 2026-10-02
- **Release SHA (initial cutover)**: `e25865ce38d353d4214928f99d2aa737a5864060`
- **Image digest (initial cutover, superseded)**: `sha256:f4c611c6478e5d2ef7f7f829803d7f1ded099d7b7751f53adf8ad5c070b91f3f`
- **Merge commit on main (post hotfix, pre-correction)**: `5a585222`
- **Release SHA (post auto-deploy correction)**: `1f863656e417fbfbd65ef7081946b166c47c7940`
- **Image digest (post auto-deploy correction, live)**: `sha256:87dd482f4ad3efc0d387076dfd076c8d274e1d60ae73b11171e54f1f3b722b9a`
- **Live release on VPS** (`/opt/hrp/.release.env`):
  `HRP_IMAGE=ghcr.io/nobita6986/hrpartner@sha256:87dd482f4ad3efc0d387076dfd076c8d274e1d60ae73b11171e54f1f3b722b9a`
- **Production URL**: https://vieclammienbac.com.vn
- **GHCR package visibility**: **public** (confirmed via https://github.com/nobita6986/hrpartner/pkgs/container/hrpartner)
- **Workflow hotfix PR**: https://github.com/nobita6986/HRpartner/pull/77
- **Hotfix title**: `fix(deploy-vps): alias DATABASE_URL_ADMIN to DATABASE_URL for Prisma`
- **Auto-deploy correction PRs**: [#79](https://github.com/nobita6986/HRpartner/pull/79), [#80](https://github.com/nobita6986/HRpartner/pull/80)
- **Successful auto-deploy run**:
  https://github.com/nobita6986/HRpartner/actions/runs/37036918560 (conclusion: success)

## Hotfix PR #77 — why it was needed

Prisma `migrate status` / `migrate deploy` require `DATABASE_URL`, but the sudo-restricted
migration wrapper reads only `DATABASE_URL_ADMIN` from `/etc/hrp/secrets/migration.env`. Without
an alias, Prisma exits with `P1012` (`Environment variable not found: DATABASE_URL`). The fix
maps `DATABASE_URL=DATABASE_URL_ADMIN` at the `docker run` boundary so the migration container
still uses the admin credential (DDL only) and the writer/admin split is preserved.

CI on PR #77: `Quality (schema · typecheck · lint · unit · build) PASS`, `Integration (DB
tests · fail-closed) PASS`, `Vercel PASS`. Merged to main via squash.

## Posture verification (redacted metadata)

Read from `C:\CodeApp\HrP\.env` in-process, never logged:

- Writer: role=`app_user_writer`, host=`ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech`,
  db=`neondb`, sslmode=require, has password, non-synthetic
- Admin: role=`neondb_owner`, host=`ep-shy-tree-az32as2c.c-3.ap-southeast-1.aws.neon.tech`,
  db=`neondb`, sslmode=require, has password, non-synthetic
- Same Neon project `ep-shy-tree-az32as2c` for both URLs
- `JWT_SECRET` from `.env` carried over, 48 chars
- `app_user_writer.rolsuper = f`, `app_user_writer.rolbypassrls = f`
- `neondb_owner.rolsuper = f`, `neondb_owner.rolbypassrls = t`

## Image audit (no leaked secrets)

`docker run --entrypoint sh ghcr.io/nobita6986/hrpartner@sha256:f4c611c6478e5d2ef7f7f829803d7f1ded099d7b7751f53adf8ad5c070b91f3f -c 'ls /app/.env*'`
→ `No such file or directory`. Image labels expose only the build-arg `SOURCE_REVISION`. The
running container has no production secrets in env (env_file is mounted at runtime, not baked
in). GHCR package visibility: **public**; VPS already pulled the image without
`docker login ghcr.io`.

## Production secrets on VPS (mode 640/600, group `hrpdeploy`/`root`)

```
/etc/hrp/secrets/
├── production.env     640 root:hrpdeploy   (writer URL only; no DATABASE_URL_ADMIN)
├── rate-limit.env     640 root:hrpdeploy   (SRH_TOKEN, byte-identical to UPSTASH_REDIS_REST_TOKEN)
└── migration.env      600 root:root        (DATABASE_URL_ADMIN only)
```

`RATE_LIMIT_HASH_SECRET` (86 chars, ≥ 32 required), `SRH_TOKEN` / `UPSTASH_REDIS_REST_TOKEN`
(64 chars, byte-identical), `INTERNAL_API_KEY` (43 chars) were generated fresh from
`System.Security.Cryptography.RandomNumberGenerator` and never reused or written to the repo,
chat, terminal log, GitHub workflow logs, or evidence files.

## Production deployment (Phase 7+8)

1. Image `e25865ce...` already present in GHCR; VPS pulled the immutable digest
   `sha256:f4c611c6478e5d2ef7f7f829803d7f1ded099d7b7751f53adf8ad5c070b91f3f` without auth.
2. Tagged the digest as the release tag locally on VPS for `deploy-production.sh` consumption.
3. `deploy-production.sh e25865ce...`:
   - `docker compose config --quiet` PASS
   - `docker compose up -d --wait --remove-orphans`:
     - `hrp-redis` healthy
     - `hrp-rate-limit` Started (1 SRH entry from env)
     - `hrp-app` healthy
   - Smoke test (`curl https://vieclammienbac.com.vn/login`, `/viec-lam`) PASS
4. `.release.env` recorded the immutable digest; trap-based rollback available via
   `previous_image`.

### Redis data-dir fix (one-time, non-secret)

`/srv/hrp/redis` was owned by `root:root` and redis ran as `999:999` (host user `dnsmasq`).
A one-time `chown -R 999:999 /srv/hrp/redis` resolved
`Can't open or create append-only dir appendonlydir: Permission denied`. Containers now
start cleanly. No code change was required (compose was correct; only the host directory
needed an owner chown before first start).

## Nginx cutover

- `rm -f /etc/nginx/sites-enabled/hrp-preview`
- `ln -sf /etc/nginx/sites-available/hrp-production /etc/nginx/sites-enabled/hrp-production`
- `nginx -t` PASS
- `nginx -s reload` SUCCESS
- Backup of preview config: `/etc/hrp/secrets/hrp-preview.20261002T160743Z.conf`

## Post-cutover smoke (live)

| Path | Status | Time |
| --- | --- | --- |
| `https://vieclammienbac.com.vn/` | 200 | 0.41s |
| `https://vieclammienbac.com.vn/login` | 200 | 0.12s |
| `https://vieclammienbac.com.vn/viec-lam` | 200 | 0.91s (empty-state message) |
| `https://vieclammienbac.com.vn/this-should-404` | 404 | 0.15s |

Headers on `/login` (production nginx, no Basic Auth):

- `strict-transport-security: max-age=31536000; includeSubDomains`
- `x-content-type-options: nosniff`
- `referrer-policy: strict-origin-when-cross-origin`
- `permissions-policy: camera=(), microphone=(), geolocation=(self)`
- `server: nginx` (server_tokens off — no Next/Express version)
- All proxied cookies flagged `proxy_cookie_flags session secure httponly samesite=lax;`

## TLS certificate

- Subject: `CN = vieclammienbac.com.vn`
- Issuer: `Let's Encrypt YE2`
- notBefore: `Oct  2 12:12:11 2026 GMT`
- notAfter: `Dec 31 12:12:10 2026 GMT`
- SAN: `vieclammienbac.com.vn, www.vieclammienbac.com.vn`
- `certbot renew --dry-run` PASS

## Hardening

- UFW: active — OpenSSH + Nginx Full, IPv4 and IPv6
- fail2ban: 1 jail (`sshd`)
- App runs as non-root uid `10001` inside the image
- Network isolation: `hrp-production-backend` is `internal: true`; `hrp-production-egress`
  is the only path to internet for the app. Port `3001` bound to `127.0.0.1` only.
- All capabilities dropped; `no-new-privileges:true` set on all three services.
- `proxy_set_header X-Forwarded-For $remote_addr;` overwrites client-supplied value (no
  header smuggling via upstream).

## Production database (Neon, branch main, project `ep-shy-tree-az32as2c`)

- `_prisma_migrations` count: 63 (5 most recent: `p1a05_hr_staff_job_openings_update_rls`,
  `p1a04_correction_hr_staff_handling_claim_insert_rls`, `p1a04_correction_recruiter_candidate_claim`,
  `p1a04_scoped_recruiter_authority`, `p1a01_jobposting_stamps`)
- `hrp-check-migrations` against the live image: `Database schema is up to date!` (58 migrations found in `prisma/migrations`)
- `job_postings`: total = 1, status = `ARCHIVED` (no PUBLISHED → `/viec-lam` shows the
  empty-state card)
- `job_openings`: total = 123 (113 OPEN, 10 DRAFT) — non-public, not exposed by `/viec-lam`

## Pre-cutover backup (Phase 5)

```
/srv/hrp/backups/
├── hrp-pre-cutover-20261002T153458Z.dump   516452 bytes
├── hrp-pre-cutover-20261002T153546Z.dump   516452 bytes  sha256=d921c40fb09360ff39fe97b76fd4a99ec1324f90aeaea3202a47bf2e80f3183f
└── MANIFEST.log
```

Each dump verified with `pg_restore --list` (in postgres:18-alpine). Last MANIFEST entry:

```
20261002T153603Z backup-created-by=tier1 pre-cutover release_sha=e25865ce38d353d4214928f99d2aa737a5864060 file=hrp-pre-cutover-20261002T153546Z.dump size=516452 sha256=d921c40fb09360ff39fe97b76fd4a99ec1324f90aeaea3202a47bf2e80f3183f verify=PASS pg_restore_list_count=779
```

## Container health (live)

| Name | Image | Status |
| --- | --- | --- |
| `hrp-app` | `ghcr.io/nobita6986/hrpartner@sha256:f4c611c6478e5d2ef7f7f829803d7f1ded099d7b7751f53adf8ad5c070b91f3f` | Up, healthy |
| `hrp-redis` | `redis@sha256:858f009f9709ce576febc734aa78b8f6d624b82571f9ddb6bda4377c833b3499` | Up, healthy |
| `hrp-rate-limit` | `hiett/serverless-redis-http@sha256:65128347949bca511e448fd7238780d624573d74c22b79155a7563db19e9b678` | Up |

`hrp-preview` is stopped (not removed) so the digest is still available as a fallback
during the burn-in window.

## VPS resource snapshot

- Disk: 48G, 8.6G used, 37G free (19 %)
- RAM: 7.7 Gi total, 1.1 Gi used, 6.6 Gi available
- Swap: 1.9 Gi (unused)
- Load: 0.26 / 0.32 / 0.29
- Uptime: 4 days

## Open follow-ups (non-blocking)

- ~~The deploy-vps workflow still does `docker login ghcr.io` with `GITHUB_TOKEN` before
  pushing. A separate forward-only PR can drop that block now that the package is public.~~
  **Resolved by PR #79** (merged, SHA `75c52b97`): the VPS-side `docker login` /
  `docker logout` were removed. The push step on the runner still uses `GITHUB_TOKEN`
  to push the immutable image.
- The `hrp-preview` image can be removed once the burn-in window is over to reclaim ~1.5 GB.
- A forward-only doc PR can add a `POST /viec-lam` job creation flow gated on
  `app_user_writer` RLS so that publishing a job actually surfaces on the marketplace.

## Auto-deploy correction after the cutover

The initial cutover was performed manually on the VPS (Phase 7 + 8). After the
hotfix PR #77 was merged into `main`, the auto-deploy workflow
`Deploy HRP to VPS` (which is triggered by `workflow_run` on `CI success`) ran
twice and failed both times for two different reasons. Both were resolved by
forward-only PRs.

### First auto-deploy failure: `error saving credentials: mkdir /opt/hrp/.docker: permission denied`

- Run: https://github.com/nobita6986/HRpartner/actions/runs/37031310161 (conclusion:
  failure, 2026-10-02T16:03Z). Job: `release` / `Pull, migration-check, deploy and
  smoke-test`. Time of failure: 2026-10-02T16:05:52Z.
- Root cause: the deploy job still ran `docker login ghcr.io` over SSH on the VPS
  as the deploy user. The deploy user (`hrpdeploy`, uid 996) has `$HOME=/opt/hrp`
  (mode `drwx------`), so `docker login` could not create `/opt/hrp/.docker` and
  exited non-zero before `docker pull` could run. The GHCR package had been made
  public, so the login step was both unnecessary and the source of the failure.
- Resolution: PR #79
  (`ci(deploy-vps): drop VPS-side docker login/logout (GHCR package is public)`,
  merged as `75c52b97`). The VPS-side `docker login` and `docker logout` calls
  were deleted; the runner's push step still uses `GITHUB_TOKEN` to push the
  immutable image. No `HOME` override, no chmod of `/opt/hrp`, no extra sudo,
  no long-lived Docker credentials on the VPS.

### Second auto-deploy failure: `/opt/hrp/.deploy.lock: Permission denied`

- Run: https://github.com/nobita6986/HRpartner/actions/runs/37034519217 (conclusion:
  failure, 2026-10-02T16:31Z). Job: `release` / `Pull, migration-check, deploy and
  smoke-test`. Time of failure: 2026-10-02T16:34:30Z.
- Root cause: after the login block was removed, the workflow reached
  `/opt/hrp/deploy-production.sh` which writes a flock at
  `/opt/hrp/.deploy.lock` and the release marker at `/opt/hrp/.release.env`.
  Both files live in `/opt/hrp`, which is `root:root` mode `0755` — `hrpdeploy`
  has no write access. The earlier sudoers entry only granted
  `/usr/local/sbin/hrp-check-migrations` and
  `/usr/local/sbin/hrp-migrate-production`; the deploy script itself was the
  missing piece.
- Resolution: PR #80
  (`ci(deploy-vps): sudo-n invoke /opt/hrp/deploy-production.sh (forward only)`,
  merged as `1f863656`). A new sudoers fragment
  `deploy/vps-production/sudoers.d/hrpdeploy-deploy` was authored with the
  `install-deploy-sudoer.sh` helper (idempotent, `visudo -c` validated on both
  sides) and installed at `/etc/sudoers.d/hrpdeploy-deploy` (mode 0440,
  `root:root`). It grants the deploy user exactly one new NOPASSWD right:
  `/opt/hrp/deploy-production.sh`. The script is `root:root` mode 0755 and
  accepts a single argument matched against
  `^ghcr\.io/nobita6986/hrpartner:[0-9a-f]{40}$`, rejecting anything else
  (other registries, non-immutable tags, weird transports). The arg is used
  only in fixed `docker pull` / `docker compose` calls — never as a shell word,
  never `eval`-ed. The workflow now invokes the script via `sudo -n`.

### Successful auto-deploy

- Run: https://github.com/nobita6986/HRpartner/actions/runs/37036918560
  (conclusion: **success**, 2026-10-02T16:52Z → 16:55Z, duration 3m38s). All
  substeps PASS:
  - `Resolve release SHA` → `1f863656e417fbfbd65ef7081946b166c47c7940`
  - `Build immutable image` PASS (BuildKit multi-stage, `SOURCE_REVISION` build-arg)
  - `Push image to GHCR` PASS (digest `sha256:87dd482f4ad3efc0d387076dfd076c8d274e1d60ae73b11171e54f1f3b722b9a`)
  - `Configure pinned SSH host` PASS (`VPS_KNOWN_HOSTS` verified)
  - `Pull, migration-check, deploy and smoke-test` PASS:
    - `docker pull` over SSH without `docker login` (public image)
    - `sudo -n /usr/local/sbin/hrp-check-migrations` →
      `Database schema is up to date!` (58 migrations, project
      `ep-shy-tree-az32as2c`)
    - `sudo -n /opt/hrp/deploy-production.sh`:
      `Container hrp-redis Healthy`, `Container hrp-rate-limit Healthy`,
      `Container hrp-app Healthy`; `deployment smoke test passed`
      (`https://vieclammienbac.com.vn/login` and `/viec-lam` both 200).
- Post-run VPS state (live): `/opt/hrp/.release.env` pinned to
  `ghcr.io/nobita6986/hrpartner@sha256:87dd482f4ad3efc0d387076dfd076c8d274e1d60ae73b11171e54f1f3b722b9a`,
  which is the immutable digest of the new main SHA `1f863656`. The previous
  cutover image (`sha256:f4c611c6…`, SHA `e25865ce`) is no longer running.
- Sudo posture on VPS (post-install): `sudo -l -U hrpdeploy` shows exactly
  three NOPASSWD entries — `/usr/local/sbin/hrp-check-migrations`,
  `/usr/local/sbin/hrp-migrate-production`,
  `/opt/hrp/deploy-production.sh`. No general sudo. `visudo -c` PASS.

## Credentials & secret handling — final audit

- No DB URL was ever echoed to chat, repo, terminal output, GitHub workflow logs, or
  evidence files.
- All secrets were generated in-process and uploaded to `/etc/hrp/secrets/` with correct
  permissions.
- The hotfix branch and PR titles do not contain any secret value.
- The `.env` file is in `.gitignore`; only the redactable posture metadata is recorded
  here.

## Sign-off checklist

- [x] Production URL returns 200
- [x] TLS cert valid until 2026-12-31
- [x] HSTS, x-content-type-options, referrer-policy, permissions-policy headers present
- [x] UFW + fail2ban active
- [x] `hrp-app`, `hrp-redis`, `hrp-rate-limit` all healthy
- [x] Migrations up to date
- [x] Backup verified
- [x] Marketplace empty-state correct
- [x] No secrets in repo, chat, logs, or evidence
- [x] Hotfix PR #77 merged
- [x] GHCR package public; VPS pulled without auth
- [x] Auto-deploy correction PRs #79 and #80 merged
- [x] Auto-deploy workflow run #37036918560 PASS (image digest
      `sha256:87dd482f4ad3efc0d387076dfd076c8d274e1d60ae73b11171e54f1f3b722b9a`
      on the new main SHA `1f863656`)
- [x] VPS `/opt/hrp/.release.env` pinned to the new main SHA's immutable digest
- [x] `hrpdeploy` sudoers allowlist: exactly three NOPASSWD entries, no general
      sudo, fragment validated with `visudo -c`
