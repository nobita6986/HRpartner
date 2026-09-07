# STEP-04 evidence template (Owner fills during window)

> **Audience:** Owner/OP only. Tier 2 does NOT have permission to rotate Neon.
> Fill this template during window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/sec-s04-rotate.txt` after execution.
> **MUST NOT contain password value, connection string, host:port value, or secret.**

## 0. Preflight snapshot

```
time_start:            2026-09-08T__ :__:__Z
neon_project:          hrp-neon
neon_role:             neondb_owner
neon_host:             ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech
old_pw_fp:             <8-char fingerprint of npg_E0eqUu7aHtpI>
restore_point_within:  7 days  (RESOLVED via Q-03)
window_start_utc:      2026-09-08T02:00:00Z   (= 09:00 Asia/Bangkok)
window_end_utc:        2026-09-08T02:30:00Z   (= 09:30 Asia/Bangkok)
```

If `old_pw_fp` empty → credential đã được rotate bởi task 21 OP; record as "already-rotated, task security verify-only".

## 1. Role posture probe (masked)

```
role:                 neondb_owner
host_fp (8 chars):    ____________8_
timestamp_utc:        _____________
bypassrls:            no
nosuperuser:          yes
login:                yes
new_pw_fp (8 chars):  ____________8_   (sha256(new_pw)[0:8]; DO NOT print new_pw)
```

`host_fp` = first 8 chars of `sha256("host:port")` — do NOT print `host:port`.

## 2. State machine transitions (Owner confirms each)

```
NEW_CREATED   →  new credential tạo trong Neon (timestamp UTC): _____________
NEW_VERIFIED  →  probe ở §1; tất cả posture = no/yes/yes (BYPASSRLS/SUPERUSER/LOGIN)
DEPLOYED      →  secret store updated + Vercel env (nếu cần) + .env.local
SMOKE_GREEN   →  node check_rls.cjs với DATABASE_URL mới → exit 0, output policies
OLD_REVOKED   →  STEP-06 ALTER/reset password cũ xong
```

## 3. Stop conditions (Owner STOP ngay nếu trigger)

- BYPASSRLS=yes trên role mới
- SUPERUSER=yes trên role mới
- Host fingerprint thay đổi giữa `NEW_CREATED` và `DEPLOYED`
- Có lệnh rotate trước 09:00 hoặc sau 09:30
- `node check_rls.cjs` thiếu `DATABASE_URL` mà KHÔNG throw fail-closed (file bị modify sai)

## 4. Rollback path

If STOP: vô hiệu credential mới trong Neon dashboard; restore secret store về credential cũ (nếu còn active); KHÔNG touch credential cũ khác.

## 5. Smoke matrix

```
test                                                              pass/fail   timestamp_utc
node check_rls.cjs (DATABASE_URL mới)                             ______      __________
node check_rls.cjs (no DATABASE_URL, expect fail-closed throw)   ______      __________
node check_rls.cjs (DATABASE_URL cũ, expect "auth failed")       ______      __________
```

## 6. Evidence format

Save full probe matrix + state transitions + smoke matrix + timestamps UTC vào `evidence/sec-s04-rotate.txt`. Tier 3 sẽ verify trong re-audit round 1.

## 7. References

- TASK: `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` v1.1 §5 STEP-05
- Runbook: `docs/runbooks/credential-rotation-incident.md` §2
- Sanitized `check_rls.cjs` (worktree, untracked at HEAD `4a56122`)
- Q-01 RESOLVED (ACTIVE), Q-02 RESOLVED (KEEP sanitize), Q-03 RESOLVED (window 09:00-09:30)
