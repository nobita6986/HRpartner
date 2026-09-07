# Runbook: Credential Rotation Incident — `npg_E0eqUu7aHtpI` leak via `check_rls.cjs:2`

> **Audience:** Owner/OP executing STEP-05/06 of `hrp-v6-security-credential-rotation`.
> Tier 2 KHÔNG có quyền mutate Neon; Owner chạy runbook này tại maintenance window **2026-09-08 09:00-09:30 Asia/Bangkok** (cùng slot với task 21 STEP-07..11).
>
> **State machine cho `neondb_owner` credential:** `NEW_CREATED → NEW_VERIFIED → DEPLOYED → SMOKE_GREEN → OLD_REVOKED`. Cấm nhảy thẳng từ `created` sang `revoked`. Cấm chạy hai OP step đồng thời.

## 0. Phạm vi và tên

- **Role:** `neondb_owner` (chỉ role này; `cloud_admin` và `app_user_writer` thuộc task 21 STEP-07).
- **Host:** `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech` (chỉ host này).
- **Database:** `neondb`.
- **Old credential fingerprint:** `npg_E0eqUu7aHtpI` (the literal value KHÔNG được in ra evidence; chỉ fingerprint trong SHA-256 form).
- **New credential:** Owner-generated; KHÔNG ghi value vào bất kỳ evidence/commit nào.
- **Project Vercel đang serve `hrpartner.vn`:** `hrp-prod` (RESOLVED via task 21 Q-01; vẫn giữ cho task security này).
- **Maintenance window:** 2026-09-08 09:00-09:30 Asia/Bangkok (RESOLVED via Q-03).
- **Restore point/PITR:** Neon PITR 7 days; restore point verified 2026-09-07 13:42 (RESOLVED via Q-03).

## 1. Pre-flight (Owner)

| Check | Command (key/path-only) | Expected |
|---|---|---|
| Credential fingerprint is still ACTIVE in Neon | Neon dashboard → role `neondb_owner` → password starts with `npg_E0eqUu7aHtpI` | `present=yes | no` (RESOLVED via Q-01: ACTIVE 2026-09-07 13:42) |
| PITR/restore point | `SELECT now() - interval '7 days'`; verify restore point within window | restore_point_within_7_days=yes |
| `check_rls.cjs` untracked in repo | `git ls-files check_rls.cjs` (rỗng — confirmed Tier 2 r2 OP-prep) | rỗng |
| `.gitignore` has `check_rls.cjs` | `git check-ignore -v check_rls.cjs` | `.gitignore:82:check_rls.cjs check_rls.cjs` |
| Bốn file canary `BLOCKED_DB_URL` chưa sửa | `rg 'BLOCKED_DB_URL' vitest.unit.config.ts vitest.integration-files.ts vitest.config.ts playwright.config.ts` | ≥ 1 hit mỗi file |
| Vercel project ready for redeploy | `vercel ls` (hoặc dashboard) | `hrp-prod` Production env ready |
| Tier 3 fingerprint scan độc lập | Tier 3 sẽ chạy sau STEP-06 | chưa cần pre-check |

**Nếu một check FAIL:** DỪNG, ghi finding, không vào bước 2.

## 2. STEP-05 — Rotate `neondb_owner` (masked)

Tạo credential mới cho `neondb_owner`. Đi qua state machine:

1. **NEW_CREATED**: tạo credential mới trong Neon dashboard. Lưu vào password manager. KHÔNG in ra log/evidence. Fingerprint mới = `sha256("new_password")` (8-char prefix only).
2. **NEW_VERIFIED**: probe identity/posture KHÔNG in value. Kết quả ghi:
   - role name = `neondb_owner`
   - host fingerprint (sha-256 của `host:port`, không in `host:port`)
   - timestamp UTC
   - posture: `BYPASSRLS=no`, `NOSUPERUSER=yes`, `LOGIN=yes`

Bảng mẫu:

```
role              host_fp (8 chars)  timestamp (UTC)           BYPASSRLS  NOSUPERUSER  LOGIN  new_pw_fp
neondb_owner      <host_8>          2026-09-08T03:00:00Z      no         yes          yes    <new_pw_8>
```

Lệnh probe (masked; chạy trong `psql` với new credential):
```sql
SELECT current_user, session_user, current_setting('is_superuser') AS issuper,
       current_setting('session_authorization') AS sessauth;
```

**Posture phải là:** role `neondb_owner` (đúng role), KHÔNG đổi role khác. **Nếu posture lệch:** STOP, rollback credential mới, không deploy.

3. **DEPLOYED**: cập nhật secret store / Vercel env / `.env.local` (Owner tự quyết định nơi lưu). Mỗi nơi dùng `process.env.DATABASE_URL` (per TASK DEC-07 + file `check_rls.cjs` sanitized).
4. **SMOKE_GREEN**: chạy `node check_rls.cjs` với credential mới (set `DATABASE_URL` qua env), verify:
   - exit 0
   - output là danh sách policies từ `pg_policies WHERE schemaname = 'public'`
   - không có stack trace lỗi

## 3. STEP-06 — Revoke old credential

Chỉ chạy khi STEP-05 SMOKE_GREEN:

1. Revoke `npg_E0eqUu7aHtpI` trong Neon dashboard: reset password (ghi nhận fingerprint mới sẽ là random).
2. Masked negative probe: thử connect với `DATABASE_URL` cũ (chứa `npg_E0eqUu7aHtpI`), phải fail với `connection refused` hoặc `password authentication failed`.
3. Masked positive probe: thử connect với `DATABASE_URL` mới, phải pass.
4. Ghi timestamp UTC của lệnh revoke.

## 4. Smoke matrix

| Test | Method | Pass condition |
|---|---|---|
| `node check_rls.cjs` với `DATABASE_URL` mới | Owner shell | exit 0, output policies[] |
| `node check_rls.cjs` không có `DATABASE_URL` env | Owner shell | exit non-zero, error message "DATABASE_URL is not set" (fail-closed per TASK DEC-07) |
| `node check_rls.cjs` với `DATABASE_URL` cũ (`npg_E0eqUu7aHtpI`) | Owner shell | exit non-zero, error "password authentication failed" (revoke verified) |
| Neon role posture | masked identity probe | role=`neondb_owner`, BYPASSRLS=no, NOSUPERUSER=yes, LOGIN=yes |

**Nếu một test FAIL:** STOP, KHÔNG commit final evidence; xử lý theo rollback matrix §5.

## 5. Rollback / Recovery

| Lỗi phát hiện | Hành động rollback |
|---|---|
| Smoke fail sau rotate | Vô hiệu credential mới; restore `.env.local`/secret store về credential cũ (nếu còn) |
| Posture lệch (BYPASSRLS=yes hoặc SUPERUSER=yes) | DROP credential mới; reissue grant đúng role |
| Old credential vẫn dùng được sau revoke | Investigate (có thể còn connection pool cached); force disconnect; revoke lại |
| `node check_rls.cjs` thiếu `DATABASE_URL` mà KHÔNG throw fail-closed | STOP; file bị modify sai; restore từ HEAD~1 (`4a56122`) |
| Production mất DB connection giữa rotation | Restore credential cũ (Neon restore từ history); rebuild `check_rls.cjs` từ HEAD~1 |

## 6. Evidence Owner cần xuất (Owner/OP)

Mỗi OP step xuất evidence key/path-only vào:

- `evidence/sec-s04-rotate.txt` — role × host_fp × timestamp × posture × new_pw_fp matrix
- `evidence/sec-s05-dsn-update.txt` — secret store update + smoke matrix
- `evidence/sec-s06-revoke.txt` — masked negative/positive probe results + revoke timestamp

Mọi evidence này KHÔNG chứa new password, old password, connection string đầy đủ, hoặc secret dưới mọi hình thức. Chỉ:
- fingerprint = `sha256(value)[0:8]`
- host fingerprint = `sha256("host:port")[0:8]`
- timestamp UTC
- pass/fail

## 7. References

- TASK: `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` v1.1
- AUDIT (task 21 round 1): `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/AUDIT.md` §1 AUD-001
- Sanitized `check_rls.cjs` (worktree, untracked at HEAD `4a56122`)
- Decoy whitelist (4 files): `vitest.unit.config.ts:15`, `vitest.integration-files.ts:6`, `vitest.config.ts:25`, `playwright.config.ts:30`
- PLANNER_HANDOVER §13 (security task referenced as `hrp-v6-security-credential-rotation`; ESCALATE_NEW_TASK từ AUD-001)
- Task 21 (rotate `cloud_admin` + `app_user_writer`): `docs/runbooks/credential-hygiene-cutover.md` (cùng window 09:00-09:30 ngày 08/09)
