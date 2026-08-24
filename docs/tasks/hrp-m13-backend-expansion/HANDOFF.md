# HANDOFF: hrp-m13-backend-expansion

## 1. Execution Summary

- **Spec Version:** v1.0
- **Executor:** Tier 2
- **Execution Round:** 2
- **Status:** READY_FOR_AUDIT
- **Outcome:** Đã đóng AUD-TEST-001 bằng cách khôi phục RLS bị mất trên dev DB và thêm regression guard để phát hiện schema/policy drift trước khi security matrix chạy.

## 2. Planner Resolution Executed

- **Finding:** `AUD-TEST-001` — C-01 failed vì 47 RLS/security-matrix failures, trong đó `EMPLOYEE.staffing_orders` trả 2 rows.
- **Root cause evidence:** Probe bằng `DATABASE_URL` xác nhận `current_user=app_user_writer`, `rolbypassrls=false`, nhưng trước repair `pg_policies` rỗng và các bảng matrix có `relrowsecurity=false`, `relforcerowsecurity=false`. Các migration RLS cũ đã ở migration history nhưng policy không tồn tại trên DB hiện tại.
- **Resolution:** Tạo và apply migration `20260821103500_m13_restore_rls_matrix/migration.sql`. Migration idempotently khôi phục helper functions, `ENABLE/FORCE ROW LEVEL SECURITY`, và deny-by-default policies cho các bảng matrix: `workers`, `outsourcing_projects`, `staffing_orders`, `vendors`, `vendor_statements`, `attendance_events`, `timesheet_periods`, `client_statements`. PM project/worker scope cũng nhận diện `sub_pm_user_id_1/2` theo M13.

## 3. Requirement Verification

| RQ | Objective | Pass/Fail | Evidence |
|---|---|---|---|
| `RQ-01` | Project có 2 sub-PM relations | **PASS** | Đã có trong commit `a8d712c`; repair policy hỗ trợ sub-PM scope. |
| `RQ-02` | Worker có manager relation | **PASS** | Đã có trong commit `a8d712c`; migration M13 giữ nguyên. |
| `RQ-03` | DB migration đồng bộ | **PASS** | `npx prisma migrate deploy` exit 0; migration repair applied successfully. |

## 4. Regression Verification

| Check | Result | Evidence |
|---|---|---|
| Live policy probe | **PASS** | `app_user_writer`, `BYPASSRLS=false`; all probed tables report `rls_enabled=true`, `rls_forced=true`; deny roles return 0. |
| Focused RLS tests | **PASS** | `npx vitest run src/domains/security/security-matrix.integration.test.ts src/shared/auth/matrix-scope.test.ts` exit 0; **170/170** tests passed. |
| Structural RLS guard | **PASS** | Security matrix now has 112 tests; `npx vitest run src/domains/security/security-matrix.integration.test.ts` exit 0; **112/112** passed. |
| Full Vitest | **PASS** | `npx vitest run` exit 0; **35 files, 606 tests passed**. |
| Production build | **PASS** | `npm run build` exit 0; Next.js compiled and generated 28 static pages. |
| Lint diagnostics | **PASS** | Edited test file has no linter errors. |

## 5. Changed Files

- `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql`
- `src/domains/security/security-matrix.integration.test.ts`
- `docs/tasks/hrp-m13-backend-expansion/HANDOFF.md`

## 6. Scope and Risk

- Không sửa frontend hoặc commission/transfer logic.
- Migration chỉ thay đổi helper/policy/RLS metadata; không xoá hoặc rewrite dữ liệu.
- Migration có `DROP POLICY IF EXISTS` rồi recreate policy canonical, nên re-run an toàn.
- Audit limitation round 1 vẫn còn: chưa có ephemeral clean-DB migration run. `AUD-MIG-001` đã được Planner chấp nhận risk ở TASK.md.

## 7. Next Step for Tier 3

- Chạy `verify-task.ps1` và `verify-audit.ps1` theo pipeline.
- Đọc migration repair cùng evidence ở trên.
- Re-run security matrix/full suite độc lập và cập nhật `AUDIT.md`.
