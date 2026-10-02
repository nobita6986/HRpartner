# HRP private VPS preview

This packaging is for an owner-only preview of the accepted P1 build. It is not
the production cutover described in `docs/important/HRP_CRM_INFRASTRUCTURE_AND_DATA_ARCHITECTURE.md`.

## Safety boundary

- The application port is published only as `127.0.0.1:3001` on the VPS.
- Access is through an SSH tunnel; ports 80 and 443 remain closed.
- The preview uses the synthetic Neon writer role. The application container
  must not receive an admin or `BYPASSRLS` database URL.
- Production migrations, production DNS, real CCCD data, and production object
  storage are out of scope.
- The preview may use the in-memory rate limiter only while it remains private.
  A public release must run with `NODE_ENV=production` and a working Upstash
  configuration so the production fail-closed policy remains effective.

## VPS layout

| Path | Purpose |
| --- | --- |
| `/opt/hrp/compose.yaml` | Preview Compose definition |
| `/etc/hrp/secrets/preview.env` | Root-readable runtime environment |
| `/srv/hrp/evidence` | Private evidence mount (no real identity images in preview) |

The runtime environment contains these key names only:

```text
NODE_ENV
VERCEL_ENV
TZ
DATABASE_URL
JWT_SECRET
RATE_LIMIT_HASH_SECRET
HRP_EVIDENCE_ROOT
INTERNAL_API_KEY
DEPLOYMENT_TARGET
SOURCE_REVISION
APP_BASE_URL
```

## Owner access

From the owner workstation, keep this command running and replace the host
placeholder with the VPS address kept outside the repository:

```powershell
ssh -L 13001:127.0.0.1:3001 root@<VPS_IP>
```

Then open `http://127.0.0.1:13001/login`.

## Operations

```bash
docker compose -f /opt/hrp/compose.yaml ps
docker compose -f /opt/hrp/compose.yaml logs --tail 100 app
curl -fsS http://127.0.0.1:3001/login >/dev/null
```

Stop without deleting the image or evidence directory:

```bash
docker compose -f /opt/hrp/compose.yaml down
```
