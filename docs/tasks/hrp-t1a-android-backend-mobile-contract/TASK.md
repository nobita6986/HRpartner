# TASK — `hrp-t1a-android-backend-mobile-contract`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1a-android-backend-mobile-contract` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Lane CRITICAL (auth/RLS/schema/migration) → mặc định LIGHT; T3 audit trên exact frozen SHA sau khi T1 tự review. |
| Spec version | `v1.3` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `51195c3bb3410b49f49531f6cc841a2a2832ada1` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `prisma/schema.prisma`; `prisma/migrations/20261018120000_mobile_device_token_with_rls`; `src/shared/auth/user.ts`; `src/shared/auth/user.test.ts`; `src/shared/auth/ticket-create-handler.ts` (mới, tái sử dụng code hiện hữu từ `app/api/tickets/route.ts`); `app/api/auth/login/route.ts` + tests; `app/api/workers/me/route.ts` + tests; `app/api/push/register-device/route.ts` (mới) + tests; `app/api/worker/attendance/route.ts` + tests; `app/api/worker/tickets/route.ts` + tests; `app/api/tickets/route.ts` (refactor gọi handler chung, hành vi giữ nguyên) + tests; `app/api/jobs/route.ts` + tests; `app/api/worker/payroll/latest/route.ts` (mới) + tests; module projection payslip mới `src/domains/payroll/payslip-projection.ts`; `app/api/webhook/payslip/route.ts` (refactor import projection chung); `scripts/ops/seed-sites-android-contract.sql` (mới — artifact không chạy); `docs/tasks/hrp-t1a-android-backend-mobile-contract/**` |
| Forbidden paths | `app/api/jobs/apply/route.ts` (đã retire 410 theo DEC-10 — KHÔNG đụng, KHÔNG khôi phục); `D:\CodeApp\hr-partner` (chỉ đọc, không sửa); `C:\importal\**` và mọi `.env*` (không đọc/đưa credential); không chạy `prisma migrate`/`seed`/`reset` hay bất kỳ lệnh ghi dữ liệu nào lên DB (migration/SQL chỉ là artifact để review); |
| Required gates | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-android-backend-mobile-contract/TASK.md` → `npx prisma validate` → `npx prisma generate` → `npm run typecheck` → `npm run test:unit` → `git diff --cached --check` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver` → `/audit` (LIGHT) → `/resolve` |

> Lưu ý điều phối: chỉ thị T0 "Ponytail full" = một T1 xử lý toàn bộ scope này trong một round duy nhất (1 contract planning + 1 implementation), không chia sub-agent sửa cùng vùng file. Test environment READY dựa trên lane unit (vitest.unit.config.ts pin DB variable, không chạm DB) và `prisma validate/generate` (chỉ đọc schema).

> Blocker hợp đồng (không chặn code, chuyển T0 quyết trong HANDOFF §4 "Deviations and blockers"): xem `BLK-01..BLK-04` tại HANDOFF — bản chất là contract movement của Android app phía T0, không thuộc phạm vi backend T1 này (BLK-01 CTV apply redirect, BLK-02 ctvId client-declared, BLK-03 department canonical, BLK-04 Android path/threshold divergence).

## 1. Outcome

### 1.1 User-visible outcome

- Back end sẵn sàng làm "mobile contract" cho app HRP Android:
  1. `POST /api/push/register-device` — WORKER đăng ký FCM token (schema + migration + RLS mới), không nhận userId từ client, không log token.
  2. Auth mobile: `Authorization: Bearer` ưu tiên tuyệt đối và fail-closed (Bearer sai → 401, KHÔNG fallback cookie); `/api/auth/login` trả thêm `token` + `user` summary + `worker` summary (kèm assignment hiện hành nếu có) trong JSON song song với cookie web hiện hữu.
  3. `GET /api/workers/me` trả thêm assignment hiện hành (employee code/position/location truy nguyên từ Assignment/Project/Site/Slot).
  4. `GET /api/worker/attendance` hỗ trợ `month`/`year` và trả giờ chuẩn + OT lấy từ `TimesheetLine` (không suy diễn từ giờ vào/ra); RLS bổ sung cho WORKER đọc line của chính mình.
  5. `POST /api/worker/tickets` tái sử dụng nguyên workflow của `POST /api/tickets` (validation, audit, history, idempotency), worker chỉ tạo cho mình.
  6. `GET /api/jobs` hỗ trợ alias `search`→`q`, `zone`→`area`.
  7. `GET /api/worker/payroll/latest?period=YYYY-MM` đọc payslip từ cache webhook hiện có (ghi rõ nguồn cache process-local).
  8. SQL idempotent seed 4 site (geofencing) có preflight fail-closed theo project ID — artifact chỉ bàn giao, T0/operator áp riêng.

### 1.2 Non-goals

- KHÔNG triển khai gửi FCM (chỉ lưu token).
- KHÔNG khôi phục `POST /api/jobs/apply` (retired 410 — DEC-10); KHÔNG mở anonymous write; KHÔNG thêm `ctvId` client-declared vào route nào.
- KHÔNG áp migration/SQL lên DB (T0/operator tự áp sau preflight).
- KHÔNG tạo payroll schema mới; KHÔNG quảng bá cache process-local thành store bền vững.
- KHÔNG sửa Android app; KHÔNG tạo sub-agent riêng; KHÔNG push/merge/deploy.
- KHÔNG tự gán `workLocation`/`projectName` thành `department` (schema không có department canonical → trả null + blocker).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | `prisma/schema.prisma:1498-1509` (`PushSubscription`), `:137-191` (`User`), `:377-415` (`Project` @map `outsourcing_projects`), `:606-620` (`Site`), `:762-808` (`ProjectAssignment`: employeeCode/workSetting/validFrom/validTo/status, FK `staffingOrderSlotId`), `:895-921` (`AttendanceEvent`), `:940-963` (`TimesheetLine`: regularHours/ot15/ot20/ot30, không có relation tới Worker) | Shape dữ liệu thật cho schema + aggregate giờ chuẩn/OT. |
| EV-02 | `src/shared/auth/user.ts:11-35`, `src/shared/auth/user.test.ts` | Token resolver hiện cookie-ưu-tiên — đây là điểm đổi Bearer-first fail-closed (middleware dùng chung file này). |
| EV-03 | `app/api/auth/login/route.ts:38-124` | Login hiện chỉ trả `ok/redirectTo` + cookie; thêm projection JSON tại đây. |
| EV-04 | `app/api/workers/me/route.ts:28-98`; `src/shared/auth/worker-projection.ts:98-145` | WORKER self-profile đã qua allowlist DTO + RLS self; mở rộng assignment projection riêng. |
| EV-05 | `prisma/migrations/20260816211000_s1_rls_project/migration.sql:11-41,61-69` | `hrp_project_visible_for` có nhánh WORKER (dự án qua ACTIVE assignment) → WORKER tự đọc được Assignment/Project/Site của mình dưới GUC self; sites policy dùng chung helper. |
| EV-06 | `prisma/migrations/20260817160000_s1_rls_attendance_timesheet/migration.sql:133-165` | `timesheet_lines` RLS hiện KHÔNG có nhánh WORKER → cần migration forward-only bổ sung read-only self. |
| EV-07 | `prisma/migrations/20260816210000_s1_rls_worker/migration.sql:18-36,61-63` | Helper GUC `hrp_session_user_id()/hrp_session_role()/hrp_session_worker_id()` + pattern policy `enable/force + drop/create` hiện hành. |
| EV-08 | `prisma/migrations/20261008000000_t1b_pre_p2_worker_delete_rls/migration.sql` (toàn file) | Pattern migration RLS hiện hành: forward-only, idempotent, DO-block guard, final assertion, comment semantic; chỉ file ship, không apply production. |
| EV-09 | `app/api/worker/checkins/route.ts:76-154` | Check-in hiện hành: ownership từ `ctx.workerId`, geofence theo assignment ACTIVE, INSERT qua `withSystemDb` (SYSTEM_CHECKIN) vì RLS attendance WITH CHECK loại WORKER — giữ nguyên. |
| EV-10 | `app/api/tickets/route.ts:18-80`, `src/shared/auth/ticket-route-helpers.ts`, `src/domains/attendance/ticket.service.ts:330-434` | Workflow tạo ticket (idempotency/audit/history/notification) — tái sử dụng cho worker route. |
| EV-11 | `app/api/jobs/route.ts:16-46` | `listPublicJobProjection` nhận `q`/`area` — alias đọc query param cạnh param gốc. |
| EV-12 | `app/api/webhook/payslip/cache`: `src/lib/cache.ts:19` (Map module-level) + `app/api/webhook/payslip/route.ts:44-84,140-194` | Cache payslip là module Map → process-local; allowlist projection có sẵn để extract dùng chung. |
| EV-13 | `src/shared/auth/push-subscribe.route.test.ts` + `src/shared/auth/user.test.ts` | Convention test route unit (mock prisma/ctx, mock logger khi cần) mà lane unit chạy ổn. |
| EV-14 | `D:\CodeApp\hr-partner` (chỉ đọc): `data/api/HrpApiService.kt`, `data/api/model/ApiModels.kt:348-353` (`DeviceRegistrationRequest {token, deviceType, model}`), `:36-42` (`LoginResponse {token, role, user}`), `utils/LocationHelper.kt:31-38` (Samsung SEVT 21.4925/105.8239; Foxconn QC 21.2468/106.1432 — KHÔNG có tọa độ Pega/VinFast) | Xác nhận client contract: body register-device field là `token` (→ `fcm_token`), login hợp lệ có token/role/user; 2/4 site CHƯA có tọa độ → SQL phải fail-closed cho phần thiếu. |
| EV-15 | `grep prj-sams-01` toàn repo backend = 0 match | Project ID 4 site KHÔNG có sẵn trong backend → preflight SQL phải tra cứu theo ID T0 khai báo và fail-closed khi thiếu. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Bearer-first fail-closed trong `getTokenFromRequest` (`src/shared/auth/user.ts`): header `Authorization` có mặt ⇒ chỉ dùng Bearer; token Bearer thiếu/rỗng/sai scheme ⇒ trả null (401 phía route/middleware), KHÔNG fallback cookie. Không header ⇒ cookie như cũ. Cả middleware + routes cùng nguồn. | `CHOSEN` |
| DEC-02 | `/api/auth/login` giữ nguyên hành vi web (`ok`, `redirectTo`, cả 2 Set-Cookie hiện hành) và thêm JSON: `token`, `role`, `user {id, name, phone, role}`, `worker` (chỉ WORKER: `{id, fullName, assignment, department: null}` với assignment `{id, projectId, projectName, projectCode, employeeCode, employmentType, workSetting, position, validFrom, validTo, sites[] {id, name, latitude, longitude, radiusMeters}}`, `null` khi không có assignment ACTIVE; `department: null` luôn). EmployeeCode từ `ProjectAssignment`, position từ `StaffingOrderSlot.positionTitle`, location từ `Project` + danh sách `Site` của project (đọc dưới GUC WORKER self — EV-05). KHÔNG đổi jwt/verify-password flow (DEC-11 cũ giữ nguyên). | `CHOSEN` |
| DEC-03 | `/api/workers/me`: giữ `worker` DTO hiện hành (projectWorker, DEC-05 cũ) và thêm key `assignment` cùng shape DEC-02 (v1.1: `sites[]`). Tách helper dựng assignment summary dùng chung login + workers/me (`src/shared/auth/worker-assignment-summary.ts`). | `CHOSEN` |
| DEC-04 | Prisma model `MobileDeviceToken` → bảng `mobile_device_tokens`: `id`, `user_id` FK→`users.id` ON DELETE CASCADE, `fcm_token`, `device_type` NOT NULL default 'ANDROID' (v1.1: không nullable — validate ở route, DB giữ invariant), `model` nullable, timestamps; `@@unique([userId, fcmToken])` + index `[userId]`. Migration forward-only idempotent: CREATE TABLE + FK cascade + unique + FORCE RLS + policy `hrp_mobile_device_token_scope` (`USING/WITH CHECK` = `hrp_session_user_id() = user_id` OR role ∈ {ADMIN, HR_MANAGER, DIRECTOR}) + final assertion introspection (EV-08). | `CHOSEN` |
| DEC-05 | `POST /api/push/register-device`: gate role WORKER only ⇒ 403 nếu khác; zod `{ token: string(min1,max≤16384), deviceType ∈ {ANDROID, IOS} optional, model optional max 255 }`; upsert theo `(ctx.userId, token)` qua `withDbContext` self; KHÔNG nhận userId từ body; response không echo token; không log token (commit không chứa chuỗi token vào logger call). | `CHOSEN` |
| DEC-06 | `/api/worker/attendance`: `month` (1-12) + `year` (>=2000) là optional; khi đủ cặp ⇒ lọc `workDate` trong [firstDayUtc, nextMonthFirstDayUtc) UTC. Giữ item history hiện hành + shift/status (AttendanceEvent.shiftCode, geofenceResult), AGGREGATE `regularHours` + `ot15+ot20+ot30` từ `TimesheetLine` theo workerId+workDate range (không suy diễn từ check-in/out). Migration RLS forward-only bổ sung nhánh READ-ONLY của WORKER vào policy `hrp_timesheet_line_scope` (branch WORKER dùng `hrp_worker_visible_for(worker_id)`, WITH CHECK giữ nguyên admin-only ⇒ WORKER KHÔNG ghi được). | `CHOSEN` |
| DEC-07 | `POST /api/worker/tickets`: refactor `POST /api/tickets` tách xử lý body thành `src/shared/auth/ticket-create-handler.ts` (`handleTicketCreateFromRequest(req, ctx, sessionUser, {selfScope})` giữ body→BigInt/dates conversion, idempotency, service.createTicket, ticketsErrorResponse). Worker route: chỉ role WORKER, `workerId` ép force = `ctx.workerId` (body workerId khác self → 403), rồi gọi cùng handler. | `CHOSEN` |
| DEC-08 | `/api/jobs`: alias `search`→`q`, `zone`→`area`; param gốc (nếu có cả hai) ưu tiên param gốc; không đổi rate-limit/urgency DEC-01 cũ. | `CHOSEN` |
| DEC-09 | `/api/worker/payroll/latest?period=YYYY-MM`: WORKER self; parse `period`; key cache như webhook (`payslip:{workerId}:{year}:{MM}`); trả projection allowlist; 404 khi cache không có. Extract `projectPayslipForResponse` vào `src/domains/payroll/payslip-projection.ts` dùng chung với webhook route (hành vi giữ nguyên). HANDOFF phải ghi rõ nguồn cache process-local, KHÔNG quảng bá durable. | `CHOSEN` |
| DEC-10 | Ranh giới bảo mật: không đụng `app/api/jobs/apply/route.ts` (giữ 410 retired, DEC-10 gốc). Android `{jobId, candidateName, phone, ctvId}` xung đột canonical `POST /api/public/jobs/{slug}/applications` ⇒ KHÔNG map, KHÔNG mở anonymous write, KHÔNG thêm ctvId self-declared — ghi 2 blocker cho T0/Owner xem xét flow CTV referral có xác thực. | `CHOSEN` |
| DEC-11 | SQL seed 4 site đặt `scripts/ops/seed-sites-android-contract.sql`: mỗi site một DO-block riêng với preflight bắt buộc tồn tại đúng project ID (`prj-sams-01`, `prj-fox-01`, `prj-pega-01`, `prj-vin-01` ⇒ RAISE EXCEPTION khi thiếu, tuyệt đối fail-closed); insert idempotent theo (project, name); tọa độ từng site là SQL-argument hằng số nằm trong file, giá trị Pega/VinFast để placeholder NULL (block RAISE EXCEPTION nếu NULL) ⇒ mỗi site phải có tọa độ non-null mới ghi được; KHÔNG gắn vào migration auto-run; KHÔNG chạy; HANDOFF ghi cách T0/operator xác nhận target DB rồi áp qua psql có audit. Radius mặc định 200 (schema), Android đang dùng 800 → ghi chú gap trong HANDOFF. | `CHOSEN` |
| DEC-12 | Không đụng env/credential: không đọc `C:\importal\cre_hrp2.txt`, `.env*`; không đưa giá trị từ env vào SQL/test. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | Task không tạo capability phổ thông mới này — chỉ reuse zod, jose, prisma client hiện hữu cho handler mới; không thêm dependency/shared framework. | `N/A` | N/A | N/A | N/A | Không package install; manifest/lockfile không đổi. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | Task KHÔNG tạo/thay connector, scheduler, notification worker hay multi-system workflow. Gửi FCM được loại khỏi scope T0; lưu token là CRUD scoped 1 bảng, không tự động hoá workflow. | `N/A` | N/A | N/A | N/A | N/A | Không có workflow loop nào được tự động hoá trong task này. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | Prisma + migration forward-only idempotent cho `MobileDeviceToken` (unique `(userId, fcmToken)`, FK cascade lên User, FORCE RLS policy chủ sở hữu + pattern hệ thống; migration ship-only không apply). |
| RQ-02 | `POST /api/push/register-device`: WORKER-only, xác thực qua AuthContext, validate token/deviceType/model, upsert theo user server-side, không log FCM token. |
| RQ-03 | Bearer-first fail-closed trong token resolver dùng chung (routes + middleware); Bearer sai ⇒ 401 kể cả khi cookie hợp lệ; không đổi flow login/jwt. |
| RQ-04 | `/api/auth/login` trả token + user summary + worker summary (+assignment hiện hành và `department: null`) trong JSON, giữ nguyên cookie web + redirectTo. |
| RQ-05 | `/api/workers/me` trả thêm assignment hiện hành (employeeCode/position/location truy nguyên Assignment→Project/Site/Slot; không bịa department). |
| RQ-06 | `/api/worker/attendance` hỗ trợ `month`/`year`; trả shift/status + giờ chuẩn & OT từ `TimesheetLine`; RLS WORKER-read-only cho `timesheet_lines` được bổ sung trong cùng migration forward-only. |
| RQ-07 | `/api/worker/tickets` POST reuse nguyên workflow `POST /api/tickets` (validation, audit, history, idempotency); worker chỉ tạo cho mình; GET giữ nguyên hành vi self chỉ dành cho WORKER. |
| RQ-08 | `/api/jobs` hỗ trợ alias `search`→`q`, `zone`→`area` không phá không-alias; giữ nguyên rate limit / urgency contract. |
| RQ-09 | `/api/worker/payroll/latest?period=YYYY-MM` — WORKER self, đọc cache payslip hiện có qua projection allowlist chung; 404 khi thiếu; không tạo schema payroll mới. |
| RQ-10 | `scripts/ops/seed-sites-android-contract.sql`: idempotent, 4 site + geofence, preflight fail-closed trên 4 project ID, không chạy lên DB, không gắn migration tự chạy, ghi hướng dẫn áp dụng cho T0/operator. |
| RQ-11 | Không thêm `POST /api/jobs/apply` hay anonymous write hay `ctvId` client-declared; giữ 410 retired endpoint. |
| RQ-12 | Không đọc/in credential từ `C:\importal\cre_hrp2.txt` hoặc `.env*`; không log secret/token. |
| RQ-13 | Tests: Bearer-vs-cookie fail-closed, login projection, worker-self scope, register-device không leak token, month/year agg giờ chuẩn/OT từ TimesheetLine, tickets reuse self-enforce, jobs alias, payroll self. Prisma validate/generate + typecheck + full `test:unit` + `git diff --check` phải pass; gate nào không chạy được do môi trường phải được báo cáo chính xác kèm lý do. |

### 4.2 Scope boundaries

- **In:** paths liệt kê ở Control (In-scope roots); hành vi mới chỉ trên các endpoint đó.
- **Out:** Android app (`D:\CodeApp\hr-partner`), push sending/FCM, `POST /api/jobs/apply`, `POST /api/public/jobs/{slug}/applications`, deployment/runtime DB, sub-agent spawning.
- **Allowed task artifacts:** `docs/tasks/hrp-t1a-android-backend-mobile-contract/**`

### 4.3 Domain boundaries

- **Data/state:** Bảng mới `mobile_device_tokens` additive-only; không đổi bảng hiện có; không backfill; FK cascade User hoàn toàn theo yêu cầu T0 (khác rule "không cascade thêm" của task t1b cũ — áp dụngfer scoping một bảng mới duy nhất này).
- **Permission/security:** mọi route mới đi qua `getAuthContext`; ownership decided server-side (ctx.userId / ctx.workerId); WORKER scope qua GUC self (`withDbContext`); chỉ migration RLS mở thêm READ cho WORKER trên `timesheet_lines` (WITH CHECK không đổi). Không seed production data động.
- **Interface/API:** JSON contracts như DEC-02/05/06/08/09; status codes: 401 sau fail-closed auth, 400 validation, 403 role/self-scope, 404 không tìm thấy, 409 idempotency conflict — map chuẩn (Error taxonomy hiện hành cho ticket route).
- **Migration/rollback:** forward-only; migration idempotent (re-runnable, DO-block guards + final assertions); KHÔNG chỉnh migration cũ; rollback = DROP mobile_device_tokens/policy sau khi T0 quyết, không tự chạy.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | `prisma/schema.prisma` + `prisma/migrations/20261018120000_mobile_device_token_with_rls` | Model `MobileDeviceToken`, migration CREATE TABLE + FORCE RLS policy + assertions (không apply). | `npx prisma validate` && `npx prisma generate`; self-review migration (đọc lại SQL + assertions), không đụng migration cũ | Diff mở rộng ra bảng/relationship ngoài DEC-04 ⇒ STOP trả Planner. |
| STEP-02 | `src/shared/auth/user.ts` (+test), `app/api/auth/login/route.ts` (+test) | Bearer-first fail-closed + login JSON projection. | Vitest theo EV-13; `npm run typecheck` | Từ chối đổi flow jwt/verify ⇒ STOP. |
| STEP-03 | `app/api/push/register-device/route.ts`, `src/shared/auth/worker-assignment-summary.ts`, `app/api/workers/me/route.ts` | Device register WORKER-only + `/workers/me` assignment (+helper dùng chung login). | Vitest unit; static check không log token | Ngoài DEC-03/05 ⇒ STOP. |
| STEP-04 | `app/api/worker/attendance/route.ts`, `app/api/worker/tickets/route.ts`, `app/api/tickets/route.ts` (tách handler), `app/api/jobs/route.ts`, `app/api/worker/payroll/latest/route.ts` + module projection payslip | Attendance month/year + OT rating từ TimesheetLine; tickets reuse workflow self-enforce; jobs alias; payroll latest cache-read. | Vitest unit; typecheck; diff check | Đổi hành vi route web hiện hữu ngoài alias/reuse ⇒ STOP. |
| STEP-05 | `scripts/ops/seed-sites-android-contract.sql` | Artifact SQL idempotent + preflight fail-closed, KHÔNG chạy. | Đọc lại SQL tự review (không chạy), ghi hướng dẫn vào SQL comments | Được dính vào migration tự chạy hoặc thực thi DB ⇒ STOP. |
| STEP-06 | Gates: verify-task.ps1 → prisma validate/generate → typecheck → test:unit → git diff --check | Canonical gates pass; sai sửa trước freeze. | Exit code từng gate | Gate lỗi môi trường ⇒ báo chính xác trong HANDOFF, không tự ý bỏ. |
| STEP-07 | Commit implementation → pin Implementation SHA → HANDOFF.md + verify-handoff.ps1 | Freeze + docs; không push/merge/deploy. | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | Sau freeze đổi source/test/migration tiếp ⇒ tạo SHA mới. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | verify-task.ps1 exit 0 trên TASK v1.0 | `pwsh .ai-pipeline/scripts/verify-task.ps1 ...` |
| AC-02 | Bearer-first fail-closed: token Bearer sai + cookie hợp lệ ⇒ getTokenFromRequest = null; Bearer đúng ưu tiên; empty-Bearer null; cookie-only vẫn path hiện hành. | `npm run test:unit` (vitest `src/shared/auth/user.test.ts`) |
| AC-03 | Login JSON: token/role/user/worker(+assignment) đúng shape khi role WORKER (assignment từ helper dùng chung), đồng thời cả 2 Set-Cookie hiện hành được phát; role khác không có `worker`. | `npm run test:unit` (vitest route test login) |
| AC-04 | `/api/push/register-device`: unauth 401; non-WORKER 403; body thiếu/sai 400; hợp lệ upsert theo (ctx.userId, token) qua withDbContext; không echo token; không có logger call chứa token. | `npm run test:unit` (vitest route test) |
| AC-05 | `npx prisma validate` && `npx prisma generate` exit 0 với schema mới. | command + output exit code |
| AC-06 | RLS `timesheet_lines` có nhánh WORKER read self (migration chứa policy branch WORKER + WITH CHECK giữ admin-only), migration forward-only không đổi file cũ. | đọc file migration mới + static test chứa assertion nếu phù hợp; migration không dirty existing files |
| AC-07 | `/api/worker/attendance?month=&year=`: filter đúng range; item có regularHours/otHours aggregate lấy từ `TimesheetLine` (mock test: giá trị từ TimesheetLine, không tính từ check-in/out); thiếu period giữ hành vi hiện hành. | `npm run test:unit` |
| AC-08 | `POST /api/worker/tickets`: reuse exact same service path (service.createTicket with withDbContext/withIdempotency); WORKER có ctx.workerId — self force; body workerId khác self → 403; non-WORKER → 403. | `npm run test:unit` |
| AC-09 | `/api/jobs?search=...&zone=...` Equivalent to `q`/`area` mapping (priority rule DEC-08); không-alias hợp lệ giữ nguyên. | `npm run test:unit` |
| AC-10 | `/api/worker/payroll/latest?period=YYYY-MM`: WORKER self; 404 cache miss; projection allowlist; không schema mới. | `npm run test:unit` |
| AC-11 | `npm run test:unit` exit 0 (full unit lane). | command + output exit code |
| AC-12 | `npm run typecheck` exit 0; `git diff --cached --check` exit 0 sau khi stage; `git status --porcelain` sạch whitespace-error. | command + output exit code |
| AC-13 | `scripts/ops/seed-sites-android-contract.sql`: mỗi block preflight project ID fail-closed; idempotent; khối có ghi chú "KHÔNG" chạy tự động; không nằm trong migration auto-run. | kiểm tra đọc + `diff` không đặt vào prisma/migrations |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-05, AC-06 |
| RQ-02 | STEP-03 | AC-04 |
| RQ-03 | STEP-02 | AC-02 |
| RQ-04 | STEP-02 | AC-03 |
| RQ-05 | STEP-03 | AC-03 |
| RQ-06 | STEP-01, STEP-04 | AC-06, AC-07 |
| RQ-07 | STEP-04 | AC-08 |
| RQ-08 | STEP-04 | AC-09 |
| RQ-09 | STEP-04 | AC-10 |
| RQ-10 | STEP-05 | AC-13 |
| RQ-11 | STEP-06 | AC-11, AC-12 |
| RQ-12 | STEP-04 | AC-04, AC-12 |
| RQ-13 | STEP-06 | AC-01, AC-11, AC-12 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | Migration RLS chỉ ship, DB thật chưa có policy ⇒ app truy cập `mobile_device_tokens` lỗi nếu ops áp code trước migration. | Thứ tự deploy được ghi trong HANDOFF: T0 áp migration + seed SQL trước khi bật route runtime; route mới fail-closed trả 500 khi bảng chưa có (không áp auto). |
| RISK-02 | Mở read WORKER trên `timesheet_lines` có thể lộ line dữ liệu của người khác nếu branch viết sai worker_id. | policy branch WORKER gắn chặt `hrp_worker_visible_for(worker_id)` (chỉ chính mình); WITH CHECK giữ admin-only; self-review policy + audit T3 soi policy. |
| RISK-03 | Bearer-first đổi hành vi auth web có cookie (nhất là middleware redirect). | Chỉ đổi nhánh khi header Authorization có mặt; không có Authorization header thì web cookie flow giữ nguyên; token resolver test 5 case AC-02 + middleware chỉ dùng resolver chung nên không đổi riêng. |
| RISK-04 | Cache payslip process-local → mobile fetch chênh lệch instance trả 404 sporadic. | Không thành dữ liệu bền vững; HANDOFF ghi caveat và hạn định "best-effort cache"; T0 quyết nâng cấp store riêng ngoài scope. |
| RISK-05 | CTV apply contract gap (jobId↔slug, ctvId) dễ dẫn tới hiểu nhầm là backend đã hỗ trợ mobile apply. | KHÔNG implement gì trong round này; HANDOFF BLK-01/02 chỉ rõ đường hợp đồng cần T0/Owner quyết (CTV referral authenticated flow). |

## 8. Open Questions

- None. (Blocker BLK-01..04 là quyết định contract cho T0, KHÔNG chặn bất kỳ STEP nào trong TASK này; không đổi Contract gate.)

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | Tier 1 tự review toàn changed surface trước freeze: route/API boundary, migration/RLS safety, auth/permission, concurrency/idempotency, test isolation, diff scope. | Correction budget 1; LIGHT audit sau freeze. |
| 1 | Audit correction batch 1/1: (1) MUST-FIX timesheet_lines RLS — tách nhánh WORKER khỏi policy FOR ALL sang `FOR SELECT` riêng; (2) SHOULD-FIX resolveTicketCreateAuth — map SessionUser tại chỗ, bỏ xác thực kép. Đóng cả hai finding bằng một batch, không mở lại unchanged surface. | Verdict audit "fix 1 trước khi ship"; T1 xác minh finding 1 đúng (USING áp cho DELETE, WITH CHECK không áp), thực hiện cả hai trong cùng batch; re-run đầy đủ gates. |
| 2 | Audit DELTA recheck: assertion (c) của migration mở từ `polcmd='d'` sang `polcmd IN ('d','*')` (pg_policy lưu FOR ALL với '*'), static test thêm regression guard. | Auditor delta finding: chỉ quét 'd' sẽ sót policy FOR ALL chứa nhánh WORKER; đóng bằng fix assertion + regression test, policy behavior không đổi. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-18 | Initial contract | Initial |
| `v1.1` | 2026-10-18 | DEC-02/03: assignment location trả `sites[]` (nhiều site per project thay vì một site); DEC-04: `device_type` NOT NULL default 'ANDROID' (không nullable); cleanup wording DEC-06/07. | Điều chỉnh khi triển khai trước khi đóng round — đúng quyền Tier 1 (§Quyền tự quyết tier1.md), không đổi outcome/boundary. |
| `v1.2` | 2026-10-18 | Audit correction batch 1/1: DEC-06 — RLS `timesheet_lines` tách nhánh WORKER sang policy `FOR SELECT` riêng (`hrp_timesheet_line_worker_read`); policy FOR ALL giữ nguyên m14 (nhánh WORKER trong FOR ALL mở DELETE vì USING áp cho DELETE còn WITH CHECK không áp). DEC-07 — `resolveTicketCreateAuth` map SessionUser bằng `toSessionUser` trên ctx đã verify (bỏ xác thực kép mỗi POST). | Audit finding MUST-FIX (DELETE exposure) + SHOULD-FIX (double auth query); kết hợp PERMISSIVE: SELECT = m14 OR worker self, ghi/xoá vẫn thuộc m14. |
| `v1.3` | 2026-10-18 | Audit DELTA recheck: final assertion của migration (c) quét `p.polcmd IN ('d','*')` thay vì chỉ 'd' — pg_policy lưu FOR ALL với polcmd='*', policy FOR ALL khác tên (legacy/manual) chứa nhánh WORKER sẽ bị sót nếu chỉ quét 'd'. Static test bổ sung assertion hồi quy cho assert-block này. | Auditor finding "còn một điểm cần sửa trước khi áp migration"; không đổi behavior policy, chỉ mở assertion + regression guard. |
