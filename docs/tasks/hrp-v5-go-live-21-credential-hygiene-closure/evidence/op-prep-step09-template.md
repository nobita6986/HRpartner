# OP prep — STEP-09 evidence template (Owner fills during window)

> **Audience:** Owner/OP only. Tier 2 does NOT have permission to ALTER ROLE.
> Fill this template during window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/go21-s09-revoke.txt` after execution.
> **MUST NOT contain password, role name with credential, or secret.**
> **Only run AFTER STEP-08 smoke GREEN.**

## 0. Pre-check (STEP-08 must be GREEN)

```
step08_status:                  GREEN | AMBER | RED
deployment_id_in_use:           ___________________________
DB_DIAG_TOKEN_present_after:    no
```

If step08_status != GREEN → STOP, KHÔNG chạy STEP-09.

## 1. Revoke sequence (chronological UTC)

```
1. ALTER ROLE old_app_user_writer NOLOGIN     →  ts_utc: __________
2. ALTER ROLE old_cloud_admin     NOLOGIN     →  ts_utc: __________
3. ALTER ROLE old_neondb_owner    NOLOGIN     →  ts_utc: __________
   (chỉ khi app không còn grant nào tới role này — verify trước)
```

## 2. Masked negative probe (old credentials fail)

For each old credential, attempt login; record ONLY pass/fail:

```
role:                  old_app_user_writer   | old_cloud_admin   | old_neondb_owner
probe_result:          fail                  | fail              | fail
timestamp_utc:         __________            | __________        | __________
```

Expected: tất cả `fail`. If any `pass` → STOP, investigate ngay.

## 3. Masked positive probe (new credentials still work)

For each new credential, attempt login; record ONLY pass/fail:

```
role:                  new_app_user_writer   | new_cloud_admin   | new_neondb_writer
probe_result:          pass                  | pass              | pass
timestamp_utc:         __________            | __________        | __________
```

Expected: tất cả `pass`. If any `fail` → STOP, investigate ngay.

## 4. Stop conditions

- Negative probe shows any old credential still works → STOP, restore access (re-grant LOGIN), investigate
- Positive probe shows any new credential fails → STOP, redeploy old credential to Vercel, investigate
- Role `old_neondb_owner` còn grant nào tới runtime → giữ lại role này (KHÔNG revoke)

## 5. Rollback path

```
-- Re-grant LOGIN (only if rollback needed)
ALTER ROLE old_app_user_writer LOGIN;
ALTER ROLE old_cloud_admin     LOGIN;
ALTER ROLE old_neondb_owner    LOGIN;
-- Or re-grant ownership
GRANT app_user_role TO app_user_writer;
```

If rollback to old credential: `vercel rollback` to `previous_deployment_id` (from STEP-08).

## 6. Evidence format

Save revoke timestamps + probe pass/fail matrix vào `evidence/go21-s09-revoke.txt`. Tier 3 sẽ verify trong re-audit round 3.
