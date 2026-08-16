# TASK: hrp-phase1-identity-core

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase1-identity-core` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1-close` |
| Status | `ACCEPTED` — Tier 3 PASS round 2 + Planner nghiệm thu 16/08: 10/10 AC đạt, UNIQUE đã áp Neon main production, PII redacted, GAP-001 RESOLVED |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — bên ngoài, do sếp giao (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3; quy ước 16/08) |
| Auditor | Tier 3 — bên ngoài, do sếp giao (độc lập với Tier 2) |
| Baseline | `4a3a0fe` (main 16/08/2026 — `hrp-phase1-bcc-fence` ACCEPTED, production `/bcc` rào JWT PASS 10/10 AC) |
| Modules | Phase 1 Identity (tuần 2) — chạm: `src/shared/auth/{permission-catalog,permission-resolver,auth-context,require-permission,with-auth-scope}.ts` (mới) + tests; `app/api/tickets/*` (6 route — thay stub); `prisma/seed.mjs` (mở rộng permissions); `prisma/migrations/*` (UNIQUE portal_timesheets). **KHÔNG tạo bộ đăng nhập/JWT mới — tái sử dụng bộ của bcc-fence** |
| ADR references | **PHASE_KHOAHOC_V1.md §4 Phase 1 DoD** (6 mục còn lại); **`docs/data-scope-security.md` §4** (Permission Pool + thuật toán resolve + G22 root), **§5.1** (AuthContext), **§5.4** (pool chưa phân công); **CONTRACT_BCC §10** (UNIQUE portal_timesheets); D15 (rào /bcc tuần 1); G22 (root bất khả tước) |
| Current execution round | 2 — closed (production migration + redaction remediation hoàn tất) |
| Current audit round | 2 — PASS (GAP-001 RESOLVED, 10/10 AC) |
| Next gate | Phase 2 — `hrp-phase2-tenant-scope` (chờ sếp chốt DEC-09 credential separation trước READY_FOR_EXECUTION) |
| Updated | 2026-08-16 19:50 ICT |

## 1. Outcome

### User-visible outcome

- Mọi API của HRP nhận diện người dùng từ **JWT thật** (cookie/Bearer của bcc-fence) — không còn chỗ nào tự khai role qua header.
- Người dùng đăng nhập **y nguyên như hiện tại** (`/login` → `/bcc` không đổi, token 8h không đổi, `/api/me` không đổi).
- API trả **403 kèm lý do** khi thiếu quyền (vd `FORBIDDEN: thiếu CAN_APPROVE_TICKET_LEVEL2`) thay vì lỗi mơ hồ.
- Role **ADMIN = root bất khả tước**: luôn có mọi quyền (kể cả quyền thêm sau này), không ai thu hồi được quyền root.
- 6 route `/api/tickets/*` hết chế độ "demo tự xưng ADMIN": không JWT → 401, đúng quyền → hoạt động như cũ, thiếu quyền → 403.
- Bảng công `portal_timesheets` được DB chặn ghi **trùng row** (appBCC bơm nhầm 2 lần sẽ không tạo bản sao).

### Non-goals

- 🚫 **KHÔNG tạo lại bộ đăng nhập/JWT/register mới** — sếp lưu ý 16/08: Tier 2 PHẢI tái sử dụng `src/shared/auth/{jwt,password,user}.ts`, `app/api/auth/{login,logout}`, `app/api/me`, `middleware.ts` của bcc-fence. Mọi endpoint/cookie/format JWT mới đều bị audit loại.
- KHÔNG scope builders (`scopes/*.scope.ts`) và KHÔNG RLS — thuộc `hrp-phase2-tenant-scope` (đã draft).
- KHÔNG idempotency-key lưu bảng / outbox / state-machine — Phase 3 (header `x-idempotency-key` hiện tại giữ nguyên hành vi).
- KHÔNG UI mới, KHÔNG đổi flow `/bcc`/`/login`/`/job-board`.
- KHÔNG đổi model/schema Prisma (chỉ thêm migration UNIQUE trên `portal_timesheets`).
- KHÔNG cache Redis/Upstash cho permission (in-DB resolve mỗi request — chấp nhận giai đoạn này, scale sau).
- KHÔNG đụng `app/bcc/*`, `appBCC/*`, `app/job-board/*` (khu vực sếp phát triển song song).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `src/domains/attendance/session.ts:5-9, 31-56` | Stub auth: Bearer `userId:role:name` do **client tự khai**; code tự ghi "KHÔNG được deploy production"; chỉ nhận 6 role `TicketActorRole` | Phải thay bằng getSession thật từ JWT; giữ `getIdempotencyKey` (Phase 3 xử lý) |
| `EV-02` | `app/api/tickets/*/route.ts` (6 route) + `ticket.service.ts` | 6 route đều import `getSessionUser` (stub) và dùng `TicketActorRole` (6 giá trị: WORKER/HR_STAFF/HR_MANAGER/ACCOUNTANT/PM/ADMIN) | Thay stub không được vỡ interface `SessionUser {id, role...}` mà service đang dùng — ánh xạ SystemRole (13) → TicketActorRole (6) theo DEC-08 |
| `EV-03` | `prisma/schema.prisma:158-197` | `Permission`, `RolePermission`, `UserPermissionGrant` đã có đủ cấu trúc (G22 comment ngay trong schema) — chưa có seed | Không cần migration model; chỉ seed + code |
| `EV-04` | `src/shared/auth/{jwt,password,user}.ts` + `app/api/auth/*` + `app/api/me` (commit `5851b5b`) | Bộ xác thực bcc-fence đã có: jose JWT 8h claims `sub/role/exp`, bcrypt, `/api/me` trả `{userId, role}` | identity-core tái sử dụng — KHÔNG viết lại (lưu ý sếp) |
| `EV-05` | `docs/CONTRACT_BCC.md` §10 (dòng 101-104, 167) | Chốt khóa định danh `(employee_code, project, period_month, period_year)` + UNIQUE constraint thêm ở Phase 1 Sprint 1; index `portal_timesheets_employee_code_idx` đã có | RQ-09 đúng chủ trương đã chốt; migration phải khảo sát duplicate trước (bảng drift DEC-31) |
| `EV-06` | `docs/PHASE_KHOAHOC_V1.md` §4 Phase 1 DoD | 6/8 mục DoD chưa làm: catalog 7+, resolver 65 case, auth-context jose, require-permission, with-auth-scope, seed idempotent (2 mục `/api/me` đã PASS ở bcc-fence) | Task này đóng nốt toàn bộ DoD Phase 1 |
| `EV-07` | `docs/data-scope-security.md` §4.0-4.2 | Thuật toán resolve chốt: ADMIN → ALL short-circuit; RolePermission ∪ GRANT − REVOKE (REVOKE thắng), bỏ `expiresAt` hết hạn; G22 2 tầng chặn ghi nhắm ADMIN; seed mẫu 8 permission | DEC-02/03 khóa đúng canonical |
| `EV-08` | `prisma/schema.prisma:105-119` + `session.ts:22-29` | SystemRole có 13 giá trị ≠ 6 TicketActorRole của ticket service | Cần quy tắc ánh xạ rõ ràng (DEC-08) — không tự suy diễn |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | 🚫 **KHÔNG tạo bộ đăng nhập/JWT mới** (lưu ý sếp 16/08). Tái sử dụng toàn bộ bcc-fence: `jwt.ts` (jose HS256, claims sub/role/exp, 8h), `password.ts` (bcrypt), `user.ts`, `POST /api/auth/login|logout`, `GET /api/me`, cookie `hrp_token`, middleware. Tier 2 chỉ được ĐỌC và gọi các module này | Sếp lưu ý 16/08 | CHỐT — vi phạm = audit BLOCK |
| `DEC-02` | CHOSEN | `permission-catalog.ts` với **≥10 codes** (8 theo seed mẫu §4.2 + 2 bổ sung Planner): `CAN_MANAGE_PERMISSIONS`, `CAN_CREATE_WORKER`, `CAN_VIEW_UNASSIGNED_POOL`, `CAN_APPROVE_PAYROLL`, `CAN_FORCE_LOCK_STATEMENT`, `CAN_OVERRIDE_REFERRAL_GUARD`, `CAN_APPROVE_TICKET_LEVEL2`, `CAN_EDIT_CONTRACT`, `CAN_VIEW_WORKER_SENSITIVE` (Phase 2 masking dùng), `CAN_PROCESS_TICKET` (cancel/pay/reject — Planner bổ sung nhóm TICKET). Nhóm theo schema `Permission.group` | Planner | CHỐT |
| `DEC-03` | CHOSEN | Resolver đúng §4.2 + G22: ADMIN → ALL short-circuit (kể cả permission tạo sau); role ≠ ADMIN → `RolePermission ∪ GRANT − REVOKE` (REVOKE thắng GRANT, bỏ expiresAt hết hạn); **2 tầng chặn** ghi `UserPermissionGrant` nhắm user role ADMIN (service chặn + short-circuit) | Planner | CHỐT |
| `DEC-04` | CHOSEN | `auth-context.ts`: decode JWT bằng `jwt.ts` (jose) → `AuthContext { userId, role: SystemRole, vendorId?, workerId? }`; `vendorId` lấy từ `User.vendorId`, `workerId` lookup `Worker.accountUserId` khi role = WORKER; token thiếu/sai/hết hạn hoặc `isActive=false` → 401 | Planner | CHỐT |
| `DEC-05` | CHOSEN | `require-permission.ts`: thiếu quyền → `PermissionDeniedError` → 403 `{ error: 'FORBIDDEN', reason: 'thiếu <CODE>' }`; có log structured. KHÔNG trả 404/500 cho trường hợp này | Planner | CHỐT |
| `DEC-06` | CHOSEN | `with-auth-scope.ts` (Prisma Extension) dạng **deny-by-default** đúng §1.3: model chưa có builder → chỉ ADMIN/HR_MANAGER/DIRECTOR được qua, role khác throw `AuthScopeError` ngay. **KHÔNG viết builders** — Phase 2 nối vào (đã chốt ở TASK phase2 DEC-01) | Planner | CHỐT |
| `DEC-07` | CHOSEN | `prisma/seed.mjs` mở rộng thêm seed permissions (upsert `Permission` + `RolePermission` theo ma trận seed) — giữ nguyên phần seed users hiện có, không reset grant manual (`UserPermissionGrant` có sẵn không bị đụng), không reset password | Planner | CHỐT |
| `DEC-08` | CHOSEN | Thay stub 6 route tickets: getSession thật trả `SystemRole`; **ánh xạ**: SystemRole nằm trong 6 TicketActorRole (ADMIN/HR_MANAGER/HR_STAFF/ACCOUNTANT/PM/WORKER) → hành vi service giữ nguyên; **ngoài 6** (DIRECTOR/SALE/MKT/VENDOR_ADMIN/VENDOR_STAFF/CTV/EMPLOYEE) → 403 FORBIDDEN (deny-by-default, không tự suy diễn quyền). Permission: `approve` → `CAN_APPROVE_TICKET_LEVEL2`; `cancel`/`pay`/`reject` → `CAN_PROCESS_TICKET`; `GET` list/detail → chỉ cần auth (200 role yếu — đúng exit criteria PHASE_KHOAHOC "200 kể cả role yếu"). Giữ `getIdempotencyKey` nguyên hành vi (Phase 3) | Planner | CHỐT |
| `DEC-09` | CHOSEN | Migration UNIQUE `portal_timesheets` đúng CONTRACT_BCC §10: khảo sát duplicate trước; **có duplicate → DỪNG, báo Planner/sếp — KHÔNG tự xóa dữ liệu**; sạch → apply dev rồi production (bảng drift → quy trình DEC-31). Constraint là bảo vệ dữ liệu, không chặn đọc/ghi hợp lệ — khác mức rủi ro RLS (Phase 2) | Planner | CHỐT |
| `DEC-10` | ASSUMPTION | bcc-fence ACCEPTED trước khi task này chạy (STEP-01..08 đã merge `5851b5b`; STEP-09 production độc lập với task này) | Planner | Hết hiệu lực khi bcc-fence ACCEPTED |
| `DEC-11` | ASSUMPTION | Không cache permission (mỗi request resolve từ DB) — bảng nhỏ, chấp nhận; mở cache khi có chỉ số chậm (ghi TODO trong code) | Planner | — |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `permission-catalog.ts` ≥10 codes (DEC-02), mỗi code có group + description, khớp cột `permissions.code` trong DB | Must | DEC-02 | Thiếu code → test fail |
| `RQ-02` | `permission-resolver.ts` đúng thuật toán DEC-03: short-circuit ADMIN, REVOKE thắng GRANT, bỏ hết hạn; hàm ghi grant/revoke chặn target ADMIN (2 tầng) | Must | DEC-03 + G22 | Resolve sai = lỗ hổng phân quyền |
| `RQ-03` | Test **65 case = 13 role × 5 bảng** (Worker, Project, Ticket, VendorStatement, ClientStatement) — mỗi case assert đúng tập permission theo ma trận seed; kèm case precedence (REVOKE/expiresAt/DENY) | Must | PHASE_KHOAHOC DoD + DEC-02 | Case fail = chặn release |
| `RQ-04` | `auth-context.ts` theo DEC-04; dùng lại `jwt.ts` (không viết verify mới); thiếu/sai token hoặc `isActive=false` → 401 `{ error }` | Must | DEC-01/04 | 401 đúng, không 500 |
| `RQ-05` | `require-permission.ts` theo DEC-05: throw 403 có reason, log; không nhận role tự khai | Must | DEC-05 | 403 có reason |
| `RQ-06` | `with-auth-scope.ts` deny-by-default theo DEC-06; unit test: role lạ trên model chưa khai báo → throw; ADMIN/HR_MANAGER/DIRECTOR → pass; KHÔNG có builder nào | Must | DEC-06 + §1.3 | Nới lỏng = lỗ hổng |
| `RQ-07` | 6 route `/api/tickets/*` bỏ import `getSessionUser` stub; dùng getSession thật + `requirePermission` theo DEC-08; không JWT → 401; đủ quyền → hành vi y nguyên; thiếu → 403; role ngoài 6 TicketActorRole → 403 | Must | DEC-08 + EV-01/02 | 401/200/403 đúng theo case |
| `RQ-08` | Seed permissions idempotent (chạy 2 lần → không trùng, không reset grant manual, không reset password); chạy trên DATABASE_URL_DEV | Must | DEC-07 | Re-run mất grant = fail |
| `RQ-09` | Migration UNIQUE `(employee_code, project, period_month, period_year)` trên `portal_timesheets` theo DEC-09: duplicate-check production sạch → áp trên **dev và production** trong maintenance window; không destructive; duplicate → dừng báo | Must | CONTRACT_BCC §10 + DEC-09 | Dừng đúng quy trình nếu duplicate; production chưa apply = chưa đạt AC-07 |
| `RQ-10` | 🚫 KHÔNG tạo endpoint/register/login/JWT/cookie mới; `/api/me`, `/api/auth/*`, `/bcc`, `/login` giữ nguyên hành vi; diff 3 vùng cấm (`app/bcc`, `appBCC`, `app/job-board`) rỗng | Must | DEC-01 + lưu ý sếp | Vi phạm = audit BLOCK |
| `RQ-11` | `npm run build` exit 0; toàn bộ `vitest run` PASS (không skip/only sót); evidence masked, không PII/secret | Must | 00-global-rules | Build/test fail = chặn release |

### 4.2 Scope boundaries

**In scope:**

- `src/shared/auth/permission-catalog.ts`, `permission-resolver.ts`, `auth-context.ts`, `require-permission.ts`, `with-auth-scope.ts` + tests
- `app/api/tickets/*` (6 route) — chỉ thay lớp auth, không đổi nghiệp vụ service
- `prisma/seed.mjs` (mở rộng) + migration UNIQUE `portal_timesheets`

**Out of scope:**

- `app/bcc/`, `appBCC/`, `app/job-board/`, `app/login/`, `middleware.ts`, `app/api/auth/*`, `app/api/me` — không đụng (DEC-01)
- `src/shared/auth/{jwt,password,user}.ts` — chỉ đọc/gọi
- `scopes/*.scope.ts`, RLS — Phase 2
- Outbox/audit/idempotency bảng/state-machine — Phase 3
- `prisma/schema.prisma` model — không đổi

### 4.3 Data, State, Permission và Interface Rules

- **Data:** chỉ thêm UNIQUE constraint `portal_timesheets` (CONTRACT_BCC §10); không đổi cột/kiểu; seed upsert `permissions` + `role_permissions` theo ma trận.
- **State:** không đổi state machine ticket; không đổi transition nào.
- **Permission/data scope:** 2 trục độc lập (§1.1) — feature permission (task này) + data scope (Phase 2); task này CHƯA cắt row/ẩn field.
- **Interface:** `getSession()` mới (auth-context) trả `AuthContext`; route tickets giữ JSON response hiện tại; 403 thêm `reason`.
- **Failure/idempotency/concurrency:** header `x-idempotency-key` giữ nguyên hành vi cũ (chưa lưu bảng — Phase 3); resolver không ghi DB khi resolve (read-only).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-09 | DB dev + production (read-only) | Khảo sát: duplicate check `portal_timesheets` theo khóa §10 (cả dev lẫn production); trạng thái dữ liệu bảng `permissions`/`role_permissions`; liệt kê chính xác nơi import `getSessionUser` | bcc-fence HANDOFF + DEC-31 | Query read-only + ghi evidence (không in connection string) | Có duplicate → dừng, báo Planner/sếp |
| `STEP-02` | RQ-01..03 | `src/shared/auth/permission-catalog.ts` + `permission-resolver.ts` | Catalog ≥10 codes + resolver DEC-03 + unit test (65 case + precedence) | — | `vitest run` phần này PASS | Case fail |
| `STEP-03` | RQ-04..05 | `src/shared/auth/auth-context.ts` + `require-permission.ts` | getSession từ JWT (dùng jwt.ts) + AuthContext + 403 helper + tests | STEP-02 | vitest PASS | — |
| `STEP-04` | RQ-06 | `src/shared/auth/with-auth-scope.ts` | Extension deny-by-default (không builder) + tests | STEP-03 | vitest PASS | — |
| `STEP-05` | RQ-08 | `prisma/seed.mjs` | Mở rộng seed permissions idempotent (giữ phần users); chạy trên DATABASE_URL_DEV | STEP-02 | Seed 2 lần → không trùng, grant manual giữ | Re-run mất dữ liệu |
| `STEP-06` | RQ-07 | `app/api/tickets/*` (6 route) | Thay stub → getSession thật + requirePermission (DEC-08); giữ service/response | STEP-03..05 | `next dev` + curl matrix (401/200/403) | Hành vi service cũ đổi |
| `STEP-07` | RQ-09 | `prisma/migrations/*_unique_portal_timesheets` + Neon main | **Round 2 remediation:** sau duplicate-check production sạch, đặt maintenance window; chạy `npx prisma migrate deploy` với production URL đã xác minh; verify constraint catalog + insert duplicate test an toàn; nếu drift/error → dừng, không destructive | STEP-01 + sếp/Tier 2 xác nhận maintenance window | migration production exit 0 + constraint tồn tại | Duplicate/drift/error/appBCC issue → dừng, ghi HANDOFF BLOCKED; không xóa dữ liệu |
| `STEP-08` | RQ-10..11 | Toàn bộ | Full `vitest run` + `npm run build` + curl DoD matrix + cập nhật HANDOFF (`Handoff status: READY_FOR_AUDIT`) | STEP-06..07 | Tất cả PASS, build exit 0 | Bất kỳ fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Catalog có ≥10 codes đúng DEC-02, group + description đầy đủ, khớp cột DB | Đọc code + đối chiếu seed | File + seed output | Yes |
| `AC-02` | RQ-03 | **65/65 case PASS** (13 role × 5 bảng) + case precedence (REVOKE thắng GRANT, expiresAt hết hạn, DENY) | vitest | Test output `65 passed` | Yes |
| `AC-03` | RQ-02 | G22: resolve ADMIN → ALL (kể cả code giả tạo thêm); ghi grant/revoke nhắm ADMIN bị chặn (service + short-circuit) | vitest | Test output | Yes |
| `AC-04` | RQ-04 | `curl /api/me`: không token → 401; token hợp lệ → 200 `{userId, role}` — **giữ nguyên** hành vi bcc-fence | curl dev | Command + output masked | Yes |
| `AC-05` | RQ-07 | curl tickets matrix: không JWT → 401; GET với role yếu (vd WORKER) → 200; approve thiếu `CAN_APPROVE_TICKET_LEVEL2` → 403 có reason; role ngoài 6 TicketActorRole (vd DIRECTOR) → 403 | curl dev | Command + output masked | Yes |
| `AC-06` | RQ-08 | Seed chạy 2 lần liên tiếp: không trùng permission; `UserPermissionGrant` thủ công tạo trước khi seed lần 2 vẫn còn; password user không đổi | Chạy seed 2 lần + query | Log + query output | Yes |
| `AC-07` | RQ-09 | UNIQUE áp thành công trên **dev và Neon main production** sau maintenance window; insert trùng khóa → lỗi unique; không destructive | Migration + catalog query + test insert | Command/exit code production đã mask + constraint definition + test output | Yes |
| `AC-08` | RQ-10 | 🚫 grep toàn repo: không còn `getSessionUser` được import trong `app/`; không có endpoint/JWT/cookie/register mới; diff `app/bcc/`, `appBCC/`, `app/job-board/` rỗng | grep + git diff | Grep + diff output | Yes |
| `AC-09` | RQ-11 | `npm run build` exit 0 + toàn bộ `vitest run` PASS (không skip/only sót) | Command | Log + exit code | Yes |
| `AC-10` | RQ-11 | KHÔNG credential/PII thật trong repo/chat — evidence masked (phone `0931****66`, không in token/secret) | grep + đọc HANDOFF | Grep output | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-02` | `AC-02` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-03` | `AC-05` |
| `RQ-06` | `STEP-04` | `AC-02` (case deny) |
| `RQ-07` | `STEP-06` | `AC-05` |
| `RQ-08` | `STEP-05` | `AC-06` |
| `RQ-09` | `STEP-01, STEP-07` | `AC-07` |
| `RQ-10` | all | `AC-08` |
| `RQ-11` | `STEP-08` | `AC-09, AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Tier 2 tự tạo lại bộ đăng nhập/JWT mới (đã xảy ra với tài liệu khác — sếp lưu ý) | Diff thấy endpoint/auth file mới | DEC-01 + RQ-10 + AC-08 khóa cứng; PROMPT_TIER2 sẽ cảnh báo đầu dòng | Audit BLOCK → yêu cầu xóa phần thừa, chỉ giữ phần tái sử dụng |
| `RISK-02` | Resolver sai thuật toán → lộ quyền (vd REVOKE không thắng GRANT) | AC-02/AC-03 fail | 65 case + case precedence là chốt chặn | Fix resolver — không cần rollback DB |
| `RISK-03` | `portal_timesheets` có duplicate production → migration UNIQUE không apply được | STEP-01 phát hiện | Dừng, báo sếp quyết (KHÔNG tự xóa); có thể chuyển sang xử lý duplicate riêng | Không apply — dữ liệu nguyên vẹn |
| `RISK-04` | Bảng drift ngoài migration history làm prisma migrate lệch | Prisma báo drift | Quy trình DEC-31 (tiền lệ đã có) | `migrate resolve` đúng quy trình |
| `RISK-05` | Thay stub làm vỡ hành vi ticket service (test cũ fail) | vitest domain fail | Giữ interface `SessionUser`/actor mà service đang dùng; test service hiện có phải tiếp tục PASS | Revert thay đổi route — service không đổi |
| `RISK-06` | Ánh xạ role 13→6 sai (vd DIRECTOR bị cho vào nhầm quyền) | Review DEC-08 | Quy tắc cứng: ngoài 6 → 403; test case đại diện mỗi nhóm | Sửa map — không ảnh hưởng DB |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | Không có câu hỏi mở | — | — | — |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | GAP-001 (auditor coverage gap, not formal finding) | ACCEPT_FIX | AUDIT verdict PASS nhưng AUDIT §5 và HANDOFF RISK-03 đều xác nhận migration `uq_portal_timesheets_period` mới áp dev; AC-07/DEC-09 yêu cầu production khi duplicate-check sạch. Production duplicate-check đã sạch (264 rows, 0 groups), nên thiếu duy nhất maintenance execution + re-audit evidence. HANDOFF cũng phải redact mọi phone/account value thật trước khi re-audit theo global rules §3. | v1.1: status `REVISION_REQUIRED`; STEP-07/AC-07 khóa production maintenance evidence; thêm revision log. | Tier 2: redact HANDOFF + apply migration production trong maintenance window; Tier 3: re-audit AC-07/AC-10; Planner closes only after PASS. |
| 2 | GAP-001 | **CLOSED — nghiệm thu** | Tier 2 round 2: STEP-R2.A redact HANDOFF (phone `09****`, id `****`, bỏ secret literal — grep 0 matches); STEP-R2.B apply UNIQUE production — `apply-uniq-portal` trả `applied: NEWLY_APPLIED`, constraint `uq_portal_timesheets_period` đúng §10, 264 rows / 0 duplicates; insert-test bị chặn (PG `23505` → Prisma `P2010`, transaction rollback, không tạo row); 3 endpoint admin + `MIGRATION_SECRET` + secret file cleanup sạch (curl 404, smoke test `/api/tickets` 401, `/api/me` 401, `/bcc` 307, `/login` 200). Tier 3 round 2 PASS: 10/10 AC, §5 Coverage Gaps None, §7 GAP-001 RESOLVED. DEV-R2-01: Tier 2 không tự commit round 2 → Planner chốt merge working tree (HANDOFF redacted + AUDIT round 2) vào commit nghiệm thu. | v1.1-close: status `ACCEPTED`; audit round 2 PASS. | Tier 1 Planner — nghiệm thu 16/08. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Initial contract — identity-core: permission catalog ≥10 + resolver 65 case + auth-context/require-permission + with-auth-scope deny-by-default + seed idempotent + thay stub 6 route tickets + UNIQUE portal_timesheets (CONTRACT_BCC §10). 🚫 KHÔNG tạo bộ đăng nhập/JWT mới (lưu ý sếp) | Sếp yêu cầu "viết TASK identity-core ngay bây giờ"; căn cứ PHASE_KHOAHOC §4 DoD + data-scope-security §4-§5.1 |
| `v1.0-ready` | 2026-08-16 | Chuyển `READY_FOR_EXECUTION`; Baseline cập nhật `4a3a0fe` sau khi `hrp-phase1-bcc-fence` ACCEPTED (audit round 2 PASS production 10/10 AC). Không đổi contract sản phẩm | Gate bcc-fence closed |
| `v1.1` | 2026-08-16 | Post-audit remediation: phục hồi contract bị ghi đè nhầm; status `REVISION_REQUIRED`; ACCEPT_FIX GAP-001. Khóa AC-07/STEP-07: UNIQUE phải áp trên Neon main trong maintenance window và re-audit; yêu cầu Tier 2 redact PII/account thật trong HANDOFF trước re-audit. | AUDIT round 1 §5-§6 + HANDOFF RISK-03; Planner review |
| `v1.1-close` | 2026-08-16 | Nghiệm thu: status `ACCEPTED`. Tier 3 round 2 PASS — AC-07 (UNIQUE applied production, insert-test 23505) + AC-10 (redaction) đóng GAP-001; 10/10 AC. Planner Resolution round 2 CLOSED. Phase 1 tuần 2 hoàn tất → gate Phase 2 `hrp-phase2-tenant-scope`. | AUDIT round 2 verdict PASS + HANDOFF round 2 STEP-R2.A..D |
