# HANDOFF — `hrp-t1a-android-backend-mobile-contract`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1a-android-backend-mobile-contract` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `51195c3bb3410b49f49531f6cc841a2a2832ada1` |
| Implementation SHA | `2067f4be1841f41c0ba7d6c7f605c847547ad7dd` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Correction batches used | `0` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:** backend mobile contract cho HRP Android theo TASK v1.1 — (1) `MobileDeviceToken` + migration forward-only idempotent (unique `(user_id, fcm_token)`, FK users CASCADE, FORCE RLS: owner self + {ADMIN, HR_MANAGER, DIRECTOR}); (2) Bearer-first fail-closed token resolver (middleware + API cùng nguồn); (3) login JSON mở rộng token/role/user/worker(+assignment, `department: null`) giữ nguyên web cookie; (4) `POST /api/push/register-device` WORKER-only, userId server-derived, không log/echo token; (5) `GET /api/workers/me` + `assignment` (employeeCode/position/location từ Assignment→Project/Site/Slot); (6) `GET /api/worker/attendance` `month`/`year` + regularHours/OT lấy từ `TimesheetLine` (L1 builder self + RLS policy thêm nhánh WORKER READ-ONLY, WITH CHECK giữ admin); (7) `POST /api/worker/tickets` TÁI SỬ DỤNG nguyên workflow `POST /api/tickets` (validation/audit/history/notification/idempotency) qua shared handler với self force; (8) `GET /api/jobs` alias `search`→`q`, `zone`→`area`; (9) `GET /api/worker/payroll/latest?period=YYYY-MM` đọc payslip cache (projection allowlist dùng chung với webhook); (10) `scripts/ops/seed-sites-android-contract.sql` — artifact idempotent 4 site, preflight fail-closed theo 4 project ID.
- **Not delivered:** gửi FCM; mobile apply/CTV referral flow (BLK-01/02); canonical `department` (BLK-03); áp dụng migration/SQL lên DB (T0/operator áp riêng); chỉnh sửa Android (`D:\CodeApp\hr-partner` chỉ đọc: xác nhận contract `DeviceRegistrationRequest {token, deviceType, model}`, `LoginResponse {token, role, user}`).
- **Changed:** `prisma/schema.prisma` + `prisma/migrations/20261018120000_mobile_device_token_with_rls/` (STEP-01); `src/shared/auth/user.ts` + `app/api/auth/login/route.ts` + `src/shared/auth/preauth-db.ts` (STEP-02/03); `app/api/push/register-device/route.ts` + `src/shared/auth/worker-assignment-summary.ts` + `app/api/workers/me/route.ts` (STEP-03); `app/api/worker/attendance/route.ts` + `app/api/worker/tickets/route.ts` + `app/api/tickets/route.ts` + `app/api/jobs/route.ts` + `app/api/worker/payroll/latest/route.ts` + `src/shared/auth/ticket-create-handler.ts` + `src/domains/payroll/payslip-projection.ts` + `src/shared/auth/scopes/*` (STEP-04); `scripts/ops/seed-sites-android-contract.sql` (STEP-05); tests theo từng STEP.
- **Lane escalation:** No.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --stat` chỉ đụng In-scope roots của TASK v1.1; kết quả nằm trong STEP-01..05 + tests; không đụng forbidden paths (`app/api/jobs/apply/route.ts` không đổi — vẫn POST 410, test `jobs-alias.route.test.ts` bảo vệ). |
| API/route boundary | `PASS` | Routes mới đều qua `getAuthContext`; ownership/self từ `ctx.userId`/`ctx.workerId`; ticket route tái dùng `handleTicketCreateFromRequest` + `ticketsErrorResponse` (cùng taxonomy); không route nào nhận identity từ client. |
| Auth/permission/data exposure | `PASS` | Bearer-first fail-closed test AC-02 (Bearer sai scheme + cookie hợp lệ ⇒ null ⇒ 401); register-device/payroll WORKER-only; FCM token không echo/log (test assert JSON + console.error không chứa token); timesheet_lines chỉ mở READ-ONLY self (WITH CHECK giữ admin-only); payslip cache-extra bị strip bởi projection allowlist (test). |
| Migration/backfill/rollback | `PASS` | Migration forward-only, idempotent (IF NOT EXISTS/DROP IF EXISTS), final assertion introspection (table/unique/FK-CASCADE/FORCE-RLS/policy/WORKER-branch) ⇒ rollback tự nhiên nếu thiếu; SHIP-ONLY — CHƯA áp lên DB nào (xem BLK-05). |
| Concurrency/idempotency | `PASS` | Register-device upsert unique `(userId, fcmToken)` ⇒ re-register idempotent; ticket idempotency `withIdempotency` giữ nguyên qua shared handler; checkins không đổi. |
| Test isolation and cleanup | `PASS` | Mọi route test mock prisma/ctx/cache — không DB; unit lane 5481 tests xanh (evidence E-11); `git status --porcelain` sau freeze chỉ còn docs/evidence. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-android-backend-mobile-contract/TASK.md` | `RESULT: PASS` (TASK v1.1) | None |
| `AC-01` | `E-01` | verify-task.ps1 PASS, 0 error 0 warning | None |
| `AC-02` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/user.test.ts` (E-02) | 6 tests passed: bearer-first ưu tiên, sai-scheme fail-closed (null kể cả cookie hợp lệ), cookie-only khi không header | None |
| `AC-03` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/login-projection.route.test.ts src/domains/security/single-domain-consolidation.test.ts` (E-03) | 21 tests passed: WORKER nhận token/role/user/worker{assignment, department: null}, cả 2 Set-Cookie vẫn phát; PM/ADMIN không có key worker; summary lỗi ⇒ worker null login không chặn; password sai 401 | None |
| `AC-04` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/push-register-device.route.test.ts` (E-04) | 7 tests passed: 401/403/400; upsert scoped (ctx.userId, token); không echo/log token; body userId lạ bị bỏ | None |
| `AC-05` | `node node_modules/prisma/build/index.js validate` + `generate` (E-05) | exit 0; "Schema valid"; client generated | Chạy offline (DATABASE_URL dummy validate-only; validate/generate không ghi DB) |
| `AC-06` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/mobile-device-token.rls.static.test.ts` (E-06) | 7 tests passed (FORCE RLS, unique, FK cascade, policy self, WORKER branch timesheet_lines, không INSERT/GRANT, idempotent) | Không chạy SQL trên DB (ship-only) |
| `AC-07` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/worker-attendance.route.test.ts` (E-07) | 6 tests passed: range UTC gte/lt đúng; totals từ aggregate TimesheetLine (regular 12.5, ot 3.5 — không suy diễn từ check-in/out); thiếu 1 param ⇒ 400 | None |
| `AC-08` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/worker-tickets-create.route.test.ts` (E-08) | 5 tests passed: 403 non-worker; 404 profile; body workerId khác self 403; thiếu ⇒ force self rồi `service.createTicket` qua `withDbContext` (cùng handler dùng chung) | None |
| `AC-09` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/jobs-alias.route.test.ts` (E-09) | 5 tests passed: alias map đúng; param gốc ưu tiên; không alias byte-compat; urgency 400; POST vẫn 410 | None |
| `AC-10` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/worker-payroll-latest.route.test.ts` (E-10) | 5 tests passed: 401/403/400; cache miss 404 key `payslip:w1:2026:09`; hit trả projection allowlist không leak cache-extra | Cache process-local — BLK-04/BLK-05 |
| `AC-11` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts` (E-11) | Test Files 348 passed; Tests 5481 passed | 9 skipped là skip operator đã tồn tại từ baseline `51195c3b` (không phải fail); reproducer chạy lại đúng command này trên baseline đã cho cùng kết quả (evidence/ac11-test-unit.txt) |
| `AC-12` | `node node_modules/typescript/bin/tsc --noEmit` + `git diff --cached --check` (E-12) | exit 0 / exit 0 | None |
| `AC-13` | Đọc `scripts/ops/seed-sites-android-contract.sql`: 4 DO-block preflight raise khi thiếu project; `git diff` xác nhận không nằm trong prisma/migrations (E-13) | 4 block pass review; không trong migration chain; không tự chạy | Pega/VinFast tọa độ phải operator điền (BLK-06) |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `powershell -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-android-backend-mobile-contract/TASK.md` | exit 0; `RESULT: PASS` (TASK v1.1, 15 OK) | evidence/ac01-verify-task.txt |
| `E-02` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/shared/auth/user.test.ts` | pass (6 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-03` | `... src/shared/auth/login-projection.route.test.ts` + `src/domains/security/single-domain-consolidation.test.ts` | pass (4 + 17 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-04` | `... src/shared/auth/push-register-device.route.test.ts` | pass (7 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-05` | `node node_modules/prisma/build/index.js validate && ... generate` (DATABASE_URL dummy validate-only — KHÔNG đụng DB) | exit 0; "Schema valid"; client generated | evidence/ac05-prisma-validate-generate.txt |
| `E-06` | `... src/shared/auth/mobile-device-token.rls.static.test.ts` | pass (7 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-07` | `... src/shared/auth/worker-attendance.route.test.ts` | pass (6 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-08` | `... src/shared/auth/worker-tickets-create.route.test.ts` | pass (5 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-09` | `... src/shared/auth/jobs-alias.route.test.ts` | pass (5 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-10` | `... src/shared/auth/worker-payroll-latest.route.test.ts` | pass (5 tests) | evidence/ac02-04-06-10-targeted-tests.txt |
| `E-11` | `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts` | Test Files 348 passed; Tests 5481 passed / 9 skipped | evidence/ac11-test-unit.txt |
| `E-12` | `node node_modules/typescript/bin/tsc --noEmit` + `git diff --cached --check` | exit 0 / exit 0 | evidence/ac12-typecheck.txt |
| `E-13` | Đọc `scripts/ops/seed-sites-android-contract.sql` (4 DO-block, preflight raise khi thiếu project/coord NULL) | 4 block pass review; không trong migration chain | scripts/ops/seed-sites-android-contract.sql file:1-164 |

## 4. Deviations and blockers

Không có deviation ngoài spec (v1.0→v1.1 chỉ nêu lại shape trả về chính xác hơn — `sites[]`, `device_type` NOT NULL, đã log Revision Log TASK).

Blocker hợp đồng (KHÔNG chặn trạng thái handoff này — chỉ blocking piece riêng của T contract Android app; T0/Owner quyết):

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | Contract gap | Android gửi `{jobId, candidateName, phone, ctvId}` áp kiểu alias cho `/api/jobs/apply` — route đã retired 410 theo DEC-10 (canonical `POST /api/public/jobs/{slug}/applications` với consent + rate-limit + idempotency + server-derived job slot). `jobId` client cần map sang slug; không thêm alias write. T0/Owner quyết đường CTV referral có xác thực (hiện route canonical KHÔNG nhận CTV identity tự khai). | Yes — T0/Owner |
| `BLK-02` | Contract gap | `ctvId` client-declared không được backend nhận ở bất cứ route nào (data-isolation G22) — Android cần đổi sang identity từ Bearer token. | Yes — T0/Owner |
| `BLK-03` | Contract gap | Schema không có `department` canonical ⇒ login/workers/me trả `department: null`; không tự gán `workLocation`/`projectName` thành department. Nếu Android cần, Owner thêm field canonical (schema + migration riêng). | Yes — T0/Owner |
| `BLK-04` | Contract drift | Android client dùng path khác directive T1A (`worker/profile`, `attendance/checkin`, `payroll/summary`, `PUT tickets/{id}/status`…) và field shape `WorkerProfileResponse`/`PayslipSummaryResponse` khác shape backend trả; radius Android 800m đã được SQL seed đặt 800 nhưng là quyết định cần T0 chốt per-site; phần rename/adapter có thể thuộc Android side. | Yes — T0 (Android side) |
| `BLK-05` | Ops action cần | Migration 20261018120000 + SQL seed đều SHIP-ONLY — chưa áp lên DB. Thứ tự áp: (1) preflight 4 project ID; (2) prisma migrate (directUrl admin); (3) psql seed-sites; (4) bật runtime. Trước khi áp, route register-device sẽ trả 500 nếu thiếu bảng/policy (fail-closed, không ghi âm thầm). | Yes — T0/operator |
| `BLK-06` | Ops input cần | Tọa độ site Pega/VinFast KHÔNG có trong bàn giao — operator phải điền trong `scripts/ops/seed-sites-android-contract.sql` block (3)/(4) trước khi áp; SQL tự RAISE EXCEPTION khi NULL (fail-closed). | Yes — T0/operator |

Chi tiết process-local caveat (đã ghi rõ ĐẦY ĐỦ trong code + spec): `/api/worker/payroll/latest` đọc cache `src/lib/cache.ts` (Map module-level) — TTL 10 phút, restart/instance khác ⇒ 404 best-effort. KHÔNG quảng bá durable. Nâng store riêng (Redis/upstash/DB) là task riêng nếu T0 yêu cầu.

## 5. Final status

- Đã thực hiện đầy đủ scope TASK v1.1 (13/13 AC có evidence trực tiếp hoặc qua E-registry), canonical gates PASS trên frozen implementation; source/test/migration KHÔNG còn semantic delta sau `2067f4be1841f41c0ba7d6c7f605c847547ad7dd` — `git status --porcelain` chỉ còn docs/evidence và `git log` hiển thị đúng 1 implementation commit trên baseline `51195c3bb`.
- Blocker BLK-01..06 là quyết định/action bên ngoài scope T1A backend (T0/Operator); không còn câu hỏi mở nào chặn audit.

> Handoff status: `READY_FOR_AUDIT`
