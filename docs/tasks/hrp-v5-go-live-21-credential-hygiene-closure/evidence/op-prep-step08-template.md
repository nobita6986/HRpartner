# OP prep — STEP-08 evidence template (Owner fills during window)

> **Audience:** Owner/OP only. Tier 2 does NOT have permission to redeploy Vercel.
> Fill this template during window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/go21-s08-deploy.txt` after execution.
> **MUST NOT contain env value, token, deployment URL with query, or secret.**

## 0. Vercel env snapshot (before)

```
project:        hrp-prod      (RESOLVED via Q-01)
environment:    Production    (RESOLVED via Q-01)
domain:         hrpartner.vn  (RESOLVED via Q-01)

env name check (presence only, NO values):
  DATABASE_URL          present=yes | no
  DATABASE_URL_ADMIN    present=yes | no
  DB_DIAG_TOKEN         present=yes | no
```

## 1. Update order

```
1. DATABASE_URL          →  new_app_user_writer   (masked)
2. DATABASE_URL_ADMIN    →  new_cloud_admin       (masked)
3. DB_DIAG_TOKEN         →  DELETE                (present_before=yes, deleted=yes)
4. vercel --prod redeploy
```

## 2. Deployment ID + redeploy

```
deployment_id:           ___________________________ (8-32 chars, alphanumeric)
previous_deployment_id:  ___________________________ (for rollback reference)
redeploy_start_utc:      2026-09-08T__:__:__Z
redeploy_complete_utc:   2026-09-08T__:__:__Z
redeploy_status:         READY | ERROR
```

## 3. Smoke matrix (6 routes)

For each route, run before revoke (Tier 2 cannot run smoke; Owner uses curl/API/browser):

```
route                                method  expected   actual   timestamp_utc
/                                    GET     200        ______   __________
/api/jobs                            GET     200 JSON   ______   __________
/login (masked credentials)          POST    200|302    ______   __________
/api/admin/jobs (admin only)         GET     200 JSON   ______   __________
/api/worker/apply (worker)           POST    200|4xx    ______   __________
/track (tracking)                    GET     200        ______   __________
```

**P0 routes**: `/`, `/login`, `/track`. Any P0 red → STOP, rollback deployment, KHÔNG revoke credential cũ.

## 4. Stop conditions

- Smoke bất kỳ P0 route nào đỏ
- `DB_DIAG_TOKEN` vẫn present sau redeploy
- Deployment status ERROR
- DATABASE_URL / DATABASE_URL_ADMIN swapped role (writer thành admin hoặc ngược lại)

## 5. Rollback path

```
vercel rollback <previous_deployment_id>
```

Sau rollback, smoke matrix phải xanh lại trên deployment cũ. KHÔNG touch credential.

## 6. Evidence format

Save deployment ID + smoke matrix + timestamps UTC vào `evidence/go21-s08-deploy.txt`. Tier 3 sẽ verify.
