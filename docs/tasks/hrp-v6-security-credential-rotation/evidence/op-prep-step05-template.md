# STEP-05 evidence template (Owner fills during window)

> **Audience:** Owner/OP only. Tier 2 does NOT have permission to mutate secret store / Vercel env.
> Fill this template during window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/sec-s05-dsn-update.txt` after execution.
> **MUST NOT contain new DSN value, env var value, or secret.**

## 0. Pre-check (STEP-04 must be GREEN)

```
step04_status:                  GREEN | AMBER | RED
new_pw_fp:                      <8-char fingerprint>
old_pw_fp:                      <8-char fingerprint of npg_E0eqUu7aHtpI>
```

If step04_status != GREEN → STOP, KHÔNG chạy STEP-05.

## 1. Secret store / Vercel env updates (key-only)

For each location, fill:

```
location:                       <where new DSN is stored>
  e.g.                          Vercel env | .env.local (untracked) | password manager
action:                         present=yes | no
var_name:                       DATABASE_URL
value_presence:                 SET (value NOT logged)
host_fp (8 chars):              ____________8_   (sha256("host:port")[0:8])
timestamp_utc:                  __________
```

Mỗi location dùng 1 row trong bảng. Nếu chỉ dùng `.env.local` → 1 row. Nếu dùng cả Vercel env → 2 rows.

## 2. Deployment impact

```
deployment_id:                  ___________________________ (nếu Vercel redeploy)
deployment_status:              READY | ERROR | NO_DEPLOY (only .env.local)
smoke_matrix_run:               yes | no
```

## 3. Stop conditions

- `DATABASE_URL` not set sau deploy
- Smoke fail bất kỳ route nào (`/`, `/login`, `/track`, `/api/jobs`)
- Vercel env name mismatch (`DATABASE_URL` vs `DATABASE_URL_ADMIN`)
- Host fingerprint khác với STEP-04

## 4. Rollback path

If STOP: restore secret store về credential cũ (nếu còn active); `vercel rollback` đến deployment cũ (nếu đã redeploy); KHÔNG revoke credential cũ (giữ cho STEP-06 fail-mode).

## 5. Evidence format

Save deployment ID + secret store locations + smoke matrix + timestamps UTC vào `evidence/sec-s05-dsn-update.txt`. Tier 3 sẽ verify trong re-audit round 1.

## 6. References

- TASK: `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` v1.1 §5 STEP-05
- Runbook: `docs/runbooks/credential-rotation-incident.md` §2
- Sanitized `check_rls.cjs` (worktree, untracked at HEAD `4a56122`)
- Task 21 Vercel project: `hrp-prod` Production env (RESOLVED via task 21 Q-01)
