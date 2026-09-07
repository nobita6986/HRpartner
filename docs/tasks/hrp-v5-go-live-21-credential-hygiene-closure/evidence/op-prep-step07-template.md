# OP prep — STEP-07 evidence template (Owner fills during window)

> **Audience:** Owner/OP only. Tier 2 does NOT have permission to rotate Neon roles.
> Fill this template during window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/go21-s07-rotation.txt` after execution.
> **MUST NOT contain password, connection string, host:port, or secret.**

## 0. Preflight snapshot

```
time_start:      2026-09-08T__ :__:__Z
project_vercel:  hrp-prod   (RESOLVED via Q-01)
neon_branch_listing: [ paste branch list, name only, no IDs ]
```

## 1. Role posture probe (masked)

For each of 3 roles, fill in:

```
role:             neondb_owner   | cloud_admin   | app_user_writer
host_fp:          ____________8_ | ____________8_ | ____________8_
timestamp_utc:    _____________ | _____________ | _____________
bypassrls:        no            | no            | no
nosuperuser:      yes           | yes           | yes
login:            yes           | yes           | yes
notes:            ____________  | ____________  | ____________
```

`host_fp` = first 8 chars of `sha256("host:port")` — do NOT print host:port.

## 2. State machine transitions (Owner confirms each)

```
NEW_CREATED   →  3 credentials tạo trong password manager (timestamps UTC)
NEW_VERIFIED  →  3 probes ở §1; tất cả posture = no/yes/yes (BYPASSRLS/SUPERUSER/LOGIN)
DEPLOYED      →  STEP-08 deployment ready
SMOKE_GREEN   →  STEP-08 smoke matrix xanh (6 routes)
OLD_REVOKED   →  STEP-09 ALTER ROLE NOLOGIN xong
```

## 3. Stop conditions (Owner STOP ngay nếu trigger)

- BYPASSRLS=yes trên bất kỳ role nào
- SUPERUSER=yes trên bất kỳ role nào
- Host fingerprint thay đổi giữa `NEW_CREATED` và `DEPLOYED`
- Có lệnh ALTER trước 09:00 hoặc sau 09:30

## 4. Rollback path

If STOP: `ALTER ROLE new_<role> NOLOGIN` (vô hiệu credential mới); restore Vercel deployment cũ từ `vercel rollback`; KHÔNG touch credential cũ (giữ để rollback).

## 5. Post-check (Owner chạy sau STEP-09)

```
psql -h <host> -U new_app_user_writer -c "SELECT 1"   →  pass
psql -h <host> -U old_app_user_writer -c "SELECT 1"   →  fail (expected)
```

Masked: chỉ ghi `pass`/`fail` + timestamp UTC; KHÔNG in user/host value.

## 6. Evidence format

Save full probe matrix + timestamps UTC vào `evidence/go21-s07-rotation.txt`. Tier 3 sẽ verify trong re-audit round 3.
