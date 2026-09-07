# STEP-06 evidence template (Owner fills during window)

> **Audience:** Owner/OP only. Tier 2 does NOT have permission to ALTER/reset Neon password.
> Fill this template during window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/sec-s06-revoke.txt` after execution.
> **MUST NOT contain password value, connection string, or secret.**
> **Only run AFTER STEP-05 SMOKE_GREEN.**

## 0. Pre-check (STEP-05 must be GREEN)

```
step05_status:                  GREEN | AMBER | RED
old_pw_fp:                      <8-char fingerprint of npg_E0eqUu7aHtpI>
```

If step05_status != GREEN → STOP, KHÔNG chạy STEP-06.

## 1. Revoke sequence (chronological UTC)

```
1. Reset password old (npg_E0eqUu7aHtpI) trong Neon dashboard  →  ts_utc: __________
2. Verify role vẫn còn LOGIN nhưng password cũ không còn match →  ts_utc: __________
```

## 2. Masked negative probe (old credential fail)

```
role:                  neondb_owner
probe_with_old_DSN:    fail  (expect: "password authentication failed for user neondb_owner")
timestamp_utc:         __________
```

Expected: `fail`. If `pass` → STOP, investigate ngay.

## 3. Masked positive probe (new credential still works)

```
role:                  neondb_owner
probe_with_new_DSN:    pass  (expect: SELECT 1 returns 1)
timestamp_utc:         __________
```

Expected: `pass`. If `fail` → STOP, investigate ngay.

## 4. `node check_rls.cjs` matrix

```
test                                                              pass/fail   timestamp_utc
node check_rls.cjs (DATABASE_URL mới)                             pass        __________
node check_rls.cjs (DATABASE_URL cũ - chứa npg_E0eqUu7aHtpI)     fail        __________
```

## 5. Stop conditions

- Negative probe shows old credential still works → STOP, restore access, investigate
- Positive probe shows new credential fails → STOP, redeploy old credential, investigate
- `node check_rls.cjs` fail với credential mới → STOP, restore, investigate

## 6. Rollback path

```
-- Re-grant old credential nếu cần (Neon dashboard)
-- Restore secret store về old DSN (nếu còn active)
-- vercel rollback đến deployment cũ (nếu đã redeploy ở STEP-05)
```

If rollback to old credential: phải `node check_rls.cjs` với old DSN exit non-zero với message "auth failed" (confirm old đã revoke).

## 7. Evidence format

Save revoke timestamps + probe pass/fail matrix + `node check_rls.cjs` matrix + timestamps UTC vào `evidence/sec-s06-revoke.txt`. Tier 3 sẽ verify trong re-audit round 1.

## 8. References

- TASK: `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` v1.1 §5 STEP-06
- Runbook: `docs/runbooks/credential-rotation-incident.md` §3
- Sanitized `check_rls.cjs` (worktree, untracked at HEAD `4a56122`)
- AC-06: credential mới đúng identity, credential cũ fail khi connect
