# TASK — `hrp-v6-admin-users-permissions`

> **Trạng thái:** `READY_FOR_EXECUTION` — `Contract gate: READY_TO_CODE`, `Decision state: CLOSED`. T0 đã chốt DEC-01..04 (xem `T0-DECISIONS.md`). Tier 1 bắt đầu `STEP-02` (service layer) ngay.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-admin-users-permissions` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Auth/identity/PII/permission-touching service — G22 + RLS + audit trail là critical, cần LIGHT audit độc lập. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | 8f93178a81c9f35c6f9be1e016bc4377928db185 |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/admin/**`, `app/api/admin/users/**`, `app/admin/users/**`, `src/shared/integrity/audit.ts` (read-only, mở rộng hợp đồng nếu cần) |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**` (chỉ đọc); `src/shared/auth/password.ts` (chỉ dùng `hashPassword`); `src/shared/auth/jwt.ts` (vùng cấm Iron Rule) |
| Required gates | `npm run typecheck`, `npm run test:unit`, `npm run build`, `pwsh .ai-pipeline/scripts/verify-encoding.ps1` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: T0 answer → /deliver → /resolve` |

> `CRITICAL` + `LIGHT` audit là mặc định đúng: surface chạm `User.passwordHash` (PII), `SystemRole` (auth), `UserPermissionGrant` (G22), `AuditLog` (forensic evidence) — đều là critical/control-plane.

## 1. Outcome

### 1.1 User-visible outcome

- Admin ở `/admin/users` có thể:
  - Tạo tài khoản mới (chọn role, điền phone + name).
  - Sửa thông tin tài khoản (name, phone, role, vendorId).
  - Gán / thu hồi quyền per-user (UserPermissionGrant) cho non-ADMIN role (G22 đã chặn ADMIN).
  - Vô hiệu hóa tài khoản (`isActive=false`).
- Mọi thao tác mutation đều qua API mới, không bỏ qua backend (UI không phải nguồn duy nhất của permission).
- Mọi mutation ghi `AuditLog` với diff `{before, after}` + reason + actor.

### 1.2 Non-goals

- Không tạo luồng "admin đặt mật khẩu tạm cho user" hay lưu mật khẩu plaintext. (Xem DEC-02 ở §11.)
- Không tạo schema migration mới: dùng `User.passwordHash` hiện hữu.
- Không thay đổi JWT/cookie/login flow (`src/shared/auth/jwt.ts`, `app/api/auth/login/route.ts` vùng cấm Iron Rule).
- Không thêm dependency mới (không nhận password-reset vendor).
- Không thêm N2 (Notification), N3 (Worker), hay các domain khác.
- Không tự ý mở rộng UI ngoài `/admin/users`.
- Không phát minh multi-role schema (giữ single `SystemRole` cho tới khi T0 quyết ở DEC-01).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/schema.prisma:137-180` (model User) | Đã có `passwordHash`, `isActive`, `role`, `vendorId` — không cần migration. |
| `EV-02` | `prisma/schema.prisma:106-120` (enum SystemRole) | Single role, 12 giá trị. Multi-role cần DEC-01. |
| `EV-03` | `src/shared/auth/password.ts` | `hashPassword`/`verifyPassword` bcryptjs 10 rounds — dùng cho seed/luồng mật khẩu tạm (nếu DEC-02 chọn admin-set). |
| `EV-04` | `src/shared/auth/permission-resolver.ts:55-87` | ADMIN short-circuit ALL; non-ADMIN = `RolePermission ∪ UserPermissionGrant.GRANT − REVOKE`. |
| `EV-05` | `src/shared/auth/permission-resolver.ts:110-190` (`writeGrant`/`writeRevoke`) | Đã chặn target role=ADMIN (G22). Đã ghi AuditLog via PR — chỉ thiếu UI + endpoint admin-side. |
| `EV-06` | `src/shared/integrity/audit.ts:55-74` (`writeAuditLog`) | Đã chuẩn hoá 5 thành phần (actor, reason, ip/ua, diff, metadata). |
| `EV-07` | `app/api/admin/users/route.ts:18-71` | GET hiện tại — ADMIN-only, dùng `withAuthorizedDb` boundary. |
| `EV-08` | `app/admin/users/page.tsx` | Read-only UI. Chưa có create/edit/deactivate/grant. |
| `EV-09` | `src/shared/auth/auth-context.ts:51-97` | `isActive=false` → `AuthSessionError('USER_INACTIVE')` 401. Xác nhận "vô hiệu hoá" có hiệu lực ngay lập tức ở request kế tiếp. |
| `EV-10` | `app/api/auth/login/route.ts:55-90` | Login flow: `findUserForLogin` → `verifyPassword` → JWT. `passwordHash=null` → fail-closed. |
| `EV-11` | `docs/data-scope-security.md` (chưa đọc file nhưng cited ở resolver) | G22 + RLS GUC context. |
| `EV-12` | T0 message 2026-10-07: "Không tự tạo luồng mật khẩu tạm hoặc lưu mật khẩu không an toàn." | Ràng buộc cứng về password onboarding. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Multi-role (nhiều `SystemRole` trên 1 User) → **GIỮ single-role (`User.role SystemRole`)** | `CHOSEN` (A1) |
| `DEC-02` | Onboarding password flow → **Admin tạo, hệ thống sinh random pass 16 char (base64url), hiển thị 1 lần trong response, không lưu plaintext** | `CHOSEN` (B1) |
| `DEC-03` | UI quản lý `UserPermissionGrant` → **KHÔNG expose grant UI trong task này; service layer vẫn viết `grantPermission`/`revokePermission` dùng `writeGrant`/`writeRevoke` từ resolver nhưng không mount UI** | `CHOSEN` (C1) |
| `DEC-04` | Last-admin guard → **Full guard (D1)**: chống tự deactivate (`SELF_DEACTIVATION_BLOCKED` 409), tự đổi role (`SELF_DEMOTION_BLOCKED` 409), tự sửa critical field (`SELF_MODIFICATION_BLOCKED` 409), và last-admin protection (`LAST_ADMIN_PROTECTED` 409). Transaction Serializable + `SELECT ... FOR UPDATE` trên admin rows. | `CHOSEN` (D1) |
| `DEC-05` | Service layer đặt tại `src/domains/admin/user-management.service.ts` (mới) | `CHOSEN` |
| `DEC-06` | API mutation theo pattern `withAuthorizedDb` (L1+L2 RLS GUC) + `writeAuditLog` (5 thành phần chuẩn) + `withIdempotency` cho route POST/PATCH/DELETE | `CHOSEN` |
| `DEC-07` | UI giữ `app/admin/users/page.tsx` (client) + tách module thành `user-management.client.tsx` để dễ test/review | `CHOSEN` |
| `DEC-08` | Khi tạo user mới: response trả `{ user, temporaryPassword, auditId }` — `temporaryPassword` chỉ trong response này, không lưu DB, không log. UI hiển thị 1 lần + nút "Sao chép" + cảnh báo. AuditLog ghi `action: 'CREATE'` với `metadata: { temporaryPasswordIssued: true }` (không log password). | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Service layer (CRUD + safety guards) | Repo-internal pattern (đã có ở `project-management.service.ts`, `ticket.service.ts`) | `N/A` | `N/A` | `N/A` | `N/A` | Tự xây theo convention repo — không thêm capability mới. |
| Password hashing | `src/shared/auth/password.ts::hashPassword` | `N/A` | `N/A` | `N/A` | Tái dụng wrapper hiện hữu | Không thêm dep; dùng bcryptjs sẵn có. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A` | — | `N/A` | — | — | — | — | Task không tạo connector, scheduler, worker hay workflow lặp. Mọi mutation là admin-driven qua UI. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Endpoint `POST /api/admin/users` tạo user mới (ADMIN-only, body validate, idempotent theo `phone`, ghi `AuditLog`). |
| `RQ-02` | Endpoint `PATCH /api/admin/users/[id]` cập nhật `name`, `phone`, `role`, `vendorId`, `isActive` với last-admin/self-modification guard. |
| `RQ-03` | Endpoint `POST /api/admin/users/[id]/deactivate` đánh dấu `isActive=false` (idempotent). |
| `RQ-04` | Endpoint `POST /api/admin/users/[id]/permissions` ghi `UserPermissionGrant` (GRANT/REVOKE) — chặn target role=ADMIN (G22). |
| `RQ-05` | Endpoint `GET /api/admin/users/[id]` trả về user + danh sách grants hiện tại (kèm `effectivePermissions` cho non-ADMIN). |
| `RQ-06` | Service layer tại `src/domains/admin/user-management.service.ts` là single authority cho: last-admin count, self-modification, grant/role diff. |
| `RQ-07` | Tất cả mutation ghi `AuditLog` với `entityType='User'`, `action ∈ {CREATE, UPDATE, DEACTIVATE, ROLE_CHANGE, GRANT, REVOKE}`, `diff={before, after}`, `reason` required. |
| `RQ-08` | UI `/admin/users` cho phép: list (đã có), Create modal, Edit modal, Deactivate button, Grant/Revoke drawer. Read-only cho non-ADMIN. |
| `RQ-09` | Author tests: service (last-admin, self-mod, idempotency), route (zod 400, role-guard 403, last-admin 409, audit on 5xx clean), static terminology (`SystemRole` enum, `AuditLog.action` enum). |
| `RQ-10` | Permission: chỉ ADMIN truy cập `/admin/users` và `/api/admin/users/**`. Non-ADMIN → 403 từ route (UI hide button không thay thế). |

### 4.2 Scope boundaries

- **In:**
  - `src/domains/admin/user-management.service.ts` (mới) + `.test.ts`
  - `app/api/admin/users/route.ts` (mở rộng: thêm `POST`)
  - `app/api/admin/users/[id]/route.ts` (mới: `GET`, `PATCH`)
  - `app/api/admin/users/[id]/deactivate/route.ts` (mới: `POST`)
  - `app/api/admin/users/[id]/permissions/route.ts` (mới: `POST` nếu DEC-03 = YES)
  - `app/admin/users/page.tsx` (mở rộng: thêm action bar + modal/forms)
  - `app/admin/users/user-management.client.tsx` (mới, tách để review)
  - `app/admin/users/user-management.test.tsx` (mới — DOM smoke + role hide)
  - `docs/tasks/hrp-v6-admin-users-permissions/TASK.md` (file này)
  - `docs/tasks/hrp-v6-admin-users-permissions/T0-DECISIONS.md` (mới)
  - `docs/tasks/hrp-v6-admin-users-permissions/HANDOFF.md` (mới)
  - `docs/tasks/hrp-v6-admin-users-permissions/AUDIT.md` (mới, vì Audit mode = LIGHT)
  - `docs/tasks/hrp-v6-admin-users-permissions/evidence/*`
- **Out:**
  - `prisma/schema.prisma` và `prisma/migrations/**` (chỉ đọc).
  - `src/shared/auth/jwt.ts`, `app/api/auth/login/route.ts` (vùng cấm Iron Rule).
  - `src/shared/auth/password.ts` (chỉ dùng `hashPassword`).
  - Tự ý thêm dependency mới.
  - Multi-role schema (DEC-01 cần T0 chốt trước).
  - Bất kỳ thay đổi ngoài `/admin/users` UI.

### 4.3 Domain boundaries

- **Data/state:** Mọi mutation chạy trong `withAuthorizedDb` (L1 passthrough cho ADMIN + L2 GUC `app.role=ADMIN`). AuditLog ghi trong cùng transaction.
- **Permission/security:**
  - Route handlers: chỉ ADMIN (hoặc ROOT_ROLES per DEC-04 nếu T0 mở rộng). 403 cho non-ADMIN.
  - Service: chặn target role=ADMIN ở grant/revoke (G22, đã có ở `permission-resolver.ts`).
  - Service: last-admin guard — chặn (a) deactivate admin cuối cùng, (b) đổi role admin cuối cùng sang non-ADMIN, (c) tự deactivate, (d) tự đổi role của chính mình.
  - UI: hide buttons khi không phải ADMIN, nhưng route vẫn enforce.
- **Interface/API:** Zod allowlist cho body. Mỗi mutation trả `{ user, auditId }` hoặc error code chuẩn (`VALIDATION`, `FORBIDDEN`, `LAST_ADMIN_PROTECTED`, `SELF_MODIFICATION_BLOCKED`, `NOT_FOUND`, `INTERNAL`).
- **Migration/rollback:** N/A — không migration. Rollback = revert commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `T0-DECISIONS.md` | Gửi T0 4 câu hỏi nghiệp vụ ở §11 và chờ phản hồi. | `T0 approval` | T0 từ chối hoặc yêu cầu tách scope → chuyển T0. |
| `STEP-02` | `src/domains/admin/user-management.service.ts` | Implement `createUser`, `updateUser`, `deactivateUser`, `getUserWithGrants` + last-admin/self-mod guards + `tx.auditLog.create`. | `npm run test:unit` (`user-management.service.test.ts`) | Nếu DEC-01 = YES → cần schema migration → escalate. |
| `STEP-03` | `app/api/admin/users/route.ts` + `app/api/admin/users/[id]/route.ts` | Thêm `POST` và `GET`/`PATCH` với `withAuthorizedDb` + `withIdempotency` + Zod. | `npm run test:unit` (`route.test.ts`) | Nếu zod schema không khớp DEC-02. |
| `STEP-04` | `app/api/admin/users/[id]/deactivate/route.ts` (và `permissions/route.ts` nếu DEC-03 = YES) | Endpoint mutation. | `npm run test:unit` | Nếu guard chưa match DEC-04. |
| `STEP-05` | `app/admin/users/user-management.client.tsx` | Tách module, giữ `page.tsx` thin. | `npm run build` | Nếu component > 300 dòng → split. |
| `STEP-06` | `app/admin/users/page.tsx` | Mount + integrate action bar, modals. | `npm run build` | — |
| `STEP-07` | Tests toàn diện | Service + route + UI + static terminology + idempotency. | `npm run test:unit` (full) | Nếu fail → fix; không bypass. |
| `STEP-08` | `HANDOFF.md` + `evidence/*` + `AUDIT.md` | Compact-V2 40-60 dòng, evidence inline, AUDIT độc lập. | `verify-task.ps1` + `verify-handoff.ps1` | Nếu gate fail → fix. |
| `STEP-09` | Single forward-only commit + push + open PR | Conventional message, CI xanh. | `gh pr checks --watch` | Nếu CI fail → fix; CI xanh → dừng trước merge. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `verify-task.ps1` PASS sau khi T0 trả lời và DEC-01..04 chốt. | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-admin-users-permissions/TASK.md` |
| `AC-02` | Service tests pass — last-admin count, self-deactivate chặn, self-demote chặn, idempotency. | `npm run test:unit -- src/domains/admin/user-management.service.test.ts` |
| `AC-03` | Route tests pass — zod 400, role-guard 403, last-admin 409, self-mod 409, audit ghi. | `npm run test:unit -- app/api/admin/users` |
| `AC-04` | UI tests pass — non-ADMIN hide action buttons, modal close trên cancel. | `npm run test:unit -- app/admin/users` |
| `AC-05` | `npm run typecheck` 0 errors. | `npm run typecheck` |
| `AC-06` | `npm run build` 0 errors. | `npm run build` |
| `AC-07` | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` PASS cho changed surface. | inline |
| `AC-08` | Strict 3-file allowlist: chỉ `TASK.md`, `HANDOFF.md`, `AUDIT.md`, `evidence/*`, code/test artifacts trong diff (xem T-04 trong verify-task). | `git status --porcelain` |
| `AC-09` | CI 4/4 GREEN (typecheck, unit, build, audit-mirror) trên PR. | `gh pr checks --watch`; nếu GitHub Actions fail, đọc log run + fix; nếu `passing` × 4 thì xanh. |
| `AC-10` | `HANDOFF.md` ≤ 60 dòng, `Implementation SHA` pin 40 char. | `wc -l` + manual |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02`, `STEP-03` | `AC-02`, `AC-03` |
| `RQ-02` | `STEP-02`, `STEP-03` | `AC-02`, `AC-03` |
| `RQ-03` | `STEP-02`, `STEP-04` | `AC-02`, `AC-03` |
| `RQ-04` | `STEP-02`, `STEP-04` (nếu DEC-03=YES) | `AC-02`, `AC-03` |
| `RQ-05` | `STEP-03` | `AC-03` |
| `RQ-06` | `STEP-02` | `AC-02` |
| `RQ-07` | `STEP-02`, `STEP-03`, `STEP-04` | `AC-03` |
| `RQ-08` | `STEP-05`, `STEP-06` | `AC-04`, `AC-06` |
| `RQ-09` | `STEP-07` | `AC-02`, `AC-03`, `AC-04` |
| `RQ-10` | `STEP-03`, `STEP-04`, `STEP-05` | `AC-03`, `AC-04` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | DEC-01 (multi-role) nếu T0 = YES → cần schema migration, phá vỡ tất cả route đang đọc `user.role` đơn lẻ. | **Dừng ở §11 và chờ T0.** Nếu T0 = YES → tách task migration riêng, đây vẫn giữ single-role. |
| `RISK-02` | DEC-02 (password flow) nếu T0 chọn "admin đặt pass tạm" → cần rotation force-first-login (chạm login route) — vùng cấm Iron Rule. | Nếu T0 chọn option này → cần task riêng để mở rộng login; task này chỉ ghi hash qua `hashPassword` mà không tự ý sửa login. |
| `RISK-03` | Last-admin guard nếu đếm sai (e.g., race condition giữa `count` và `update`). | Transaction `Serializable` hoặc `SELECT ... FOR UPDATE` trên User. Tier 1 sẽ chốt isolation khi DEC-04 rõ. |
| `RISK-04` | Reveal `passwordHash` qua API. | Select chỉ `id, name, phone, role, vendorId, isActive, createdAt` — không bao giờ select `passwordHash`. |
| `RISK-05` | AuditLog leak: ghi `passwordHash` vào `diff.after`. | Diff chỉ chứa các trường cho phép thay đổi (`name, phone, role, vendorId, isActive`). `passwordHash` set qua flow riêng không qua diff. |
| `RISK-06` | UI cho phép thao tác khi mất quyền ADMIN. | Route 403 là source of truth; UI chỉ hide button. Test: bypass UI bằng `curl` phải trả 403. |

## 8. Open Questions

- None. T0 đã chốt DEC-01..04 (xem T0-DECISIONS.md). Contract đã `READY_TO_CODE`.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | `DRAFT` | Khảo sát + viết contract, đang chờ T0 quyết 4 câu hỏi nghiệp vụ. |
| `2` | `READY_FOR_EXECUTION` | T0 chốt DEC-01=A1, DEC-02=B1, DEC-03=C1, DEC-04=D1. Contract gate READY_TO_CODE, Decision state CLOSED. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | `2026-10-07` | Initial contract (DRAFT, OPEN) | Khảo sát xong, đẩy 4 câu hỏi cho T0. |
| `v1.0` | `2026-10-07` | T0 chốt DEC-01..04; Status READY_FOR_EXECUTION; Contract gate READY_TO_CODE | T0 chọn 4/4 theo recommendation Tier 1 (A1/B1/C1/D1). Baseline = origin/main @ `8f93178a`. |

---

## 11. T0 Decisions — danh sách câu hỏi đang chờ

> Xem chi tiết từng câu + phân tích trade-off ở file `T0-DECISIONS.md` cùng thư mục.

### §A — Multi-role (DEC-01)

Hiện tại schema `User.role SystemRole` đơn lẻ. Nếu multi-role, cần đổi sang `UserRole[]` (relation mới) → schema migration, RLS rewrite, permission resolver rewrite, JWT/session cần đổi `role[]` thay vì `role`.

- **A1: GIỮ single-role** (đề xuất Tier 1). Multi-role có thể thêm ở task riêng sau nếu T0 cần.
- **A2: Multi-role ngay** — cần migration + rewrite lớn → task này vượt scope; tách sang task mới.

### §B — Onboarding password (DEC-02)

T0 message cứng: "Không tự tạo luồng mật khẩu tạm hoặc lưu mật khẩu không an toàn."

- **B1: Admin tạo user, hệ thống sinh password ngẫu nhiên, hiển thị MỘT LẦN cho admin (không lưu plaintext)** (đề xuất Tier 1). Admin copy → gửi user qua kênh riêng (Zalo/SMS). User vào lần đầu → bị buộc đổi pass (cần mở rộng login route — Iron Rule sensitive, đề xuất làm task phụ).
- **B2: Invite link (signed token, expires 24h)** — user click → đặt password lần đầu. Cần thêm `UserInviteToken` table.
- **B3: Phone OTP** — user nhập SĐT → OTP → đặt pass. Cần thêm OTP service (vendor hoặc in-house).
- **B4: Không cho phép tạo user từ admin UI** — chỉ cho phép user tự đăng ký qua form public (out of scope hiện tại vì chưa có public signup).

### §C — UI quản lý `UserPermissionGrant` (DEC-03)

`permission-resolver.ts` đã có `writeGrant`/`writeRevoke` với G22 guard. Câu hỏi là có expose trong `/admin/users` không.

- **C1: KHÔNG expose grant UI trong task này** (đề xuất Tier 1). Lý do: tăng blast radius UI, dễ confuse role vs grant, `RolePermission` đã đủ cho đa số use case. Có thể expose ở task `/admin/permissions` riêng sau.
- **C2: CÓ expose grant/revoke drawer per-user** — cho phép admin cấp GRANT/REVOKE ngay trong user detail.

### §D — Last-admin guard semantics (DEC-04)

- **D1 (đề xuất Tier 1):**
  - Đếm `User where role=ADMIN AND isActive=true` ≥ 1.
  - Nếu chỉ còn 1 và admin đó muốn tự deactivate → `409 SELF_DEACTIVATION_BLOCKED` (admin tự hạ chính mình) HOẶC `409 LAST_ADMIN_PROTECTED` (sẽ thành 0 admin).
  - Nếu chỉ còn 1 và admin đó muốn đổi role của chính mình → `409 SELF_DEMOTION_BLOCKED`.
  - Nếu chỉ còn 1 và admin khác (vẫn là ADMIN) muốn deactivate → `409 LAST_ADMIN_PROTECTED`.
  - Vô hiệu hoá/tuỳ chỉnh admin khác khi còn ≥ 2 admin → OK.
- **D2:** Cho phép tất cả, không guard (cực kỳ rủi ro).
- **D3:** Chỉ guard tự hạ, không guard admin khác.
