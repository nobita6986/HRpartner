# TASK — `t1a-pre-p2-project-management-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `t1a-pre-p2-project-management-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | T0 directive: Tier 1 self-review; no schema/auth/RLS expansion (mirror pattern của `t1a-staffing-order-management`); terminal state guard đã có sẵn trong `Project` (DRAFT/ACTIVE/PAUSED ↔ terminal COMPLETED/CANCELLED); delete-only-no-deps là pattern canonical đã chốt. Risk-accept: Tier 0. |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` → `ACCEPTED` |
| Planner | `Tier 1` |
| Baseline | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` (`origin/main`) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/admin/projects/[id]/`, `app/api/projects/[id]/`, `src/domains/crm/project-*.service.ts`, `src/domains/projects/**` (chỉ khi thật sự cần) |
| Forbidden paths | `prisma/`, `prisma/schema.prisma`, `prisma/migrations/`, `src/shared/auth/scopes/`, `app/api/auth/**`, `app/api/me/**`, `middleware.ts`, `workers/`, `app/admin/projects/page.tsx` (list — đã OK), `app/admin/projects/projects-table-client.tsx` (list — đã OK), sidebar/role-guard |
| Required gates | `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `prisma validate`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver → /resolve` (PR opened, CI monitoring, stop before merge) |

> Lane và audit là hai quyết định riêng. T0 đã chốt `STANDARD + NONE`.

## 1. Outcome

### 1.1 User-visible outcome

- **`/admin/projects/[id]`** (detail): Vietnamese-first full management surface — header (code, name, status, client, start/end, site, quota/filled), 3 metric cards (Đơn ứng tuyển / Phân công người lao động / Địa điểm công trường), danh sách Nhu cầu tuyển dụng (mỗi row link tới `/admin/staffing-orders/[id]`), danh sách Vị trí cần tuyển (link tới `/admin/job-openings/[id]` chỉ khi route detail tồn tại). Toolbar quản trị 5 thao tác: Sửa dự án, Kích hoạt/Tạm dừng, Hoàn thành dự án, Huỷ dự án, Xoá vĩnh viễn (ADMIN only).
- **Action server-derived capability**: `canView` mirror GET authority; `canEdit`/`canChangeStatus` mirror `ADMIN/HR_MANAGER/PM`; `canDelete` chỉ `ADMIN`. View-only roles (HR_STAFF, PM readonly, DIRECTOR, ACCOUNTANT) thấy read-only banner, KHÔNG có mutation control.
- **PUT `/api/projects/[id]`** chuẩn hoá allowlist validation (date YYYY-MM-DD round-trip, quota safe integer, status enum, reject unknown fields).
- **PATCH `/api/projects/[id]`** state machine transition (`DRAFT/ACTIVE/PAUSED ↔ COMPLETED/CANCELLED`), terminal guard (COMPLETED/CANCELLED không transition ra ngoài), idempotency key, typed `400 INVALID_TRANSITION`.
- **DELETE `/api/projects/[id]`** ADMIN-only; quét đầy đủ relation blocking (StaffingOrder, CandidateSubmission, ProjectAssignment, Site); có bất kỳ relation > 0 ⇒ typed `409 PROJECT_NOT_DELETABLE` với Vietnamese guidance "Hoàn thành/Huỷ dự án". Idempotency key bắt buộc.
- **No new enums, no schema change, no auth/RLS expansion.**

### 1.2 Non-goals

- KHÔNG thêm status mới; KHÔNG đổi state machine; KHÔNG sửa Prisma schema/migration.
- KHÔNG mở rộng role authority (PUT/PATCH = ADMIN/HR_MANAGER/PM; DELETE = ADMIN; view = mirror GET list).
- KHÔNG tự cascade xoá StaffingOrder/CandidateSubmission/ProjectAssignment/Site/Placement.
- KHÔNG sửa list page `/admin/projects` (đã OK); KHÔNG sửa sidebar/role-guard.
- KHÔNG viết test E2E browser — chỉ unit + targeted tests.
- KHÔNG thêm dependency mới.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Trang `/admin/projects/[id]` hiện read-only (PR #107 đã có list + create + edit) | Cần full management toolbar (status, delete) |
| `EV-02` | `app/admin/projects/[id]/page.tsx` còn raw enum `project.status` render trong table | Việt hoá copy; map enum qua `projectStatusLabel()` |
| `EV-03` | `app/api/projects/[id]/route.ts` PUT chỉ validate `body.name`, không có strict allowlist; không có PATCH status; không có DELETE | Cần strict validation + state machine + safe delete |
| `EV-04` | `src/domains/crm/project-read.service.ts:getProjectDetail` đã có 4 metric count | Mở rộng `getProjectForManagement` cho management UI (filled, quota, version, isPublic, sitesCount) |
| `EV-05` | `prisma/schema.prisma:377-440` Project relations: `staffingOrders`, `submissions`, `assignments`, `sites`, `placements` (SetNull) | Đây là các bảng phụ thuộc cần check khi xoá Project |
| `EV-06` | `prisma/schema.prisma:388` `Project.status: String @default("DRAFT")` (DRAFT \| ACTIVE \| PAUSED \| COMPLETED \| CANCELLED) | State machine hiện có 5 trạng thái, COMPLETED/CANCELLED terminal |
| `EV-07` | `src/domains/staffing/order.service.ts:148-170` (HRP-T1A) đã có canonical advisory lock `p1a04:order:` + `withDbContext` + `withIdempotency` pattern | Mirror cho project-management.service |
| `EV-08` | `src/shared/i18n/role-labels.ts` đã có `roleLabel()` Vietnamese | T0 §A: "Admin → Quản trị"; render dùng `roleLabel(role)` |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Không thêm status mới; không đổi state machine; COMPLETED/CANCELLED giữ terminal | `CHOSEN` |
| `DEC-02` | `getProjectForManagement(tx, id)` mirror `getProjectDetail` + thêm `isPublic`, `quota`, `filled`, `version`, `sitesCount`; serve read-only cho trang quản trị | `CHOSEN` |
| `DEC-03` | Strict allowlist validation ở route PUT qua `validateProjectUpdateInput` (allowlist keys + ISO date round-trip + quota safe int + status enum); reject unknown fields | `CHOSEN` |
| `DEC-04` | `deleteProject(tx, ctx, projectId)` — ADMIN only; advisory lock `p1a04:project:`; scan 4 relation blocking (StaffingOrder, CandidateSubmission, ProjectAssignment, Site) + audit `placements`; `placements` SetNull KHÔNG block | `CHOSEN` |
| `DEC-05` | `withIdempotency` cho DELETE (key bắt buộc) — mirror pattern `deleteStaffingOrder` | `CHOSEN` |
| `DEC-06` | `withIdempotency` cho PATCH (key optional) — mirror `updateStaffingOrderStatus` | `CHOSEN` |
| `DEC-07` | UI: Server Component derive `ProjectCapability` từ `getServerSession()`; client nhận prop; toolbar ẩn nếu `!capability.canEdit && !canChangeStatus && !canDelete` | `CHOSEN` |
| `DEC-08` | UI: Link `/admin/staffing-orders/[id]` cho mỗi Nhu cầu tuyển dụng; link `/admin/job-openings/[id]` chỉ khi `jobOpeningDetailRouteExists` (T0 §B.2 không tạo link chết) | `CHOSEN` |
| `DEC-09` | `placements` SetNull trong schema — KHÔNG block delete nhưng vẫn scan để log/cảnh báo; service scan trả cả `placementsCount` để audit | `CHOSEN` |
| `DEC-10` | Lane STANDARD + Audit NONE — T0 đã chốt | `CHOSEN` |
| `DEC-11` | Forbidden paths: KHÔNG đụng `prisma/`, không sửa `src/shared/auth/scopes/`, không mở rộng auth core, không sửa workers, không sửa sidebar/role-guard | `CHOSEN` |

### 3.1 Build vs Adopt

N/A — không thêm library mới. Reuse `withDbContext`, `withIdempotency`, advisory lock pattern từ `order.service.ts` (HRP-T1A canonical).

## 4. Contract

- **Data/state:** Không đổi schema. State machine `DRAFT/ACTIVE/PAUSED ↔ COMPLETED/CANCELLED`; terminal `COMPLETED`/`CANCELLED` không transition ra ngoài. Không thêm field mới.
- **Permission/security:** View mirror `LIST_ROLES` (ADMIN/HR_MANAGER/HR_STAFF/PM/ACCOUNTANT/DIRECTOR); PUT = `PROJECT_UPDATE_ROLES = ADMIN/HR_MANAGER/PM`; PATCH = same; DELETE = `PROJECT_DELETE_ROLES = ADMIN` only. Không mở rộng.
- **Interface/API:**
  - `PUT /api/projects/[id]` body: `{ name?, clientCompanyId?, pmUserId?|null, siteAddress?|null, startDate? (YYYY-MM-DD), endDate?|null, status?, quota?|null }`. Validation chặt qua `validateProjectUpdateInput` (allowlist + ISO date round-trip + quota safe int + status enum); reject unknown fields.
  - `PATCH /api/projects/[id]` body: `{ status: 'DRAFT'|'ACTIVE'|'PAUSED'|'COMPLETED'|'CANCELLED' }`. Header `x-idempotency-key` optional.
  - `DELETE /api/projects/[id]` body: empty; header `x-idempotency-key` REQUIRED. Response 200 `{ project: { id, deleted: true } }` hoặc 409 `{ error: 'PROJECT_NOT_DELETABLE', message: 'Dự án đã phát sinh nghiệp vụ (...). Hãy dùng "Hoàn thành dự án" hoặc "Huỷ dự án" thay thế để giữ lại lịch sử.' }`.
  - 400 `VALIDATION | INVALID_TRANSITION | INVALID_BODY`; 401; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `IDEMPOTENCY_CONFLICT | PROJECT_NOT_DELETABLE`.
- **UI:** `/admin/projects/[id]/page.tsx` (Server Component) derive `ProjectCapability`; `project-detail-client.tsx` (Client) render 5 thao tác theo capability; modals xác nhận cho status transitions + delete.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/crm/project-read.service.ts` | Thêm `getProjectForManagement(tx, id)` mirror `getProjectDetail` + thêm `isPublic`, `quota`, `filled`, `version`, `sitesCount`; export `ProjectManagementDto` | typecheck pass | Bất kỳ lỗi typecheck/test cũ |
| `STEP-02` | `src/domains/crm/project-management.service.ts` (NEW) | `updateProjectStatus` (advisory lock + state machine + terminal guard) + `deleteProject` (ADMIN + scan 4 blocking relations + re-read under lock) + `scanProjectDependencies` + `describeBlockingDependencies` + `validateProjectUpdateInput` (allowlist + ISO date round-trip + quota safe int) + `ProjectManagementServiceError` | typecheck pass | Bất kỳ lỗi typecheck/test cũ |
| `STEP-03` | `app/api/projects/[id]/route.ts` | Thêm `PATCH` state transition (idempotency optional) + `DELETE` (idempotency REQUIRED) + harden `PUT` validation; map `ProjectManagementServiceError` → 400/403/404/409 | typecheck pass | Bất kỳ lỗi typecheck/test cũ |
| `STEP-04` | `app/admin/projects/[id]/project-detail-client.tsx` (NEW) | Render 5 action buttons theo `ProjectCapability`; modals: Edit (PUT), Status confirm (PATCH), Delete confirm (DELETE); 4 thao tác status theo `VALID_TRANSITIONS[project.status]`; link staffing orders + job openings (job openings chỉ link nếu route detail tồn tại); table semantics + ARIA | typecheck + static terminology test pass | Bất kỳ lỗi |
| `STEP-05` | `app/admin/projects/[id]/page.tsx` | Server Component: getServerSession, derive `ProjectCapability`, kiểm tra `VIEW_ROLES`, gọi `getProjectForManagement`, render `ProjectDetailClient`; 404 fail-closed cho role ngoài authority | typecheck pass | Bất kỳ lỗi |
| `STEP-06` | `src/domains/crm/__tests__/project-management.service.test.ts` (NEW) | Unit test: state machine + terminal guard, scanProjectDependencies, describeBlockingDependencies vi-VN labels, updateProjectStatus (lock order, no-op same status, INVALID_TRANSITION, NOT_FOUND, PERMISSION_DENIED), deleteProject (PERMISSION_DENIED, orphan PASS, mỗi relation > 0 ⇒ 409, RACE, NOT_FOUND), validateProjectUpdateInput (allowlist, date round-trip, endDate < startDate, quota safe int) | `pnpm test:unit` pass | Test fail |
| `STEP-07` | `app/api/projects/[id]/__tests__/route.test.ts` (NEW) | Route test: 401 AuthSessionError; PUT role gate (HR_STAFF/SALE/WORKER... → 403), validation allowlist, INVALID_BODY, P2025 → 404, success; PATCH role gate, status enum gate, INVALID_TRANSITION → 400, idempotency conflict → 409, replay; DELETE role gate, thiếu idem-key → 400, PROJECT_NOT_DELETABLE → 409 + guidance, NOT_FOUND → 404, success | `pnpm test:unit` pass | Test fail |
| `STEP-08` | `app/admin/projects/[id]/__tests__/project-terminology.test.ts` (NEW) | Static terminology guard: page.tsx + project-detail-client.tsx — KHÔNG chứa EN labels (Candidate Submissions, Project Assignments, Edit Project, etc.); có VI labels bắt buộc; render status qua `projectStatusLabel()` chứ không raw enum; toolbar capability gating | `pnpm test:unit` pass | Test fail |
| `STEP-09` | `src/shared/security/required-relation-sweep.static.test.ts` | Bổ sung 1 entry mới cho `project-read.service.ts` (line 152) — `getProjectForManagement` thêm `clientCompany: { select: { id, name } }` | test pass | Test fail |
| `STEP-10` | Full verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `prisma validate`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `git diff --check` | Tất cả pass | E-01..E-07 | Bất kỳ lệnh fail |
| `STEP-11` | Commit + push branch; mở non-draft PR; chờ CI 4/4 GREEN; dừng trước merge | PR URL reported | gh run list | CI fail hoặc conflict |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | Trang `/admin/projects/[id]` render full management: header, 3 metric cards (Đơn ứng tuyển/Phân công/Địa điểm), bảng Nhu cầu tuyển dụng, bảng Vị trí cần tuyển, toolbar 5 thao tác gated theo capability | `E-02` static guard + `E-03` typecheck + manual review |
| `AC-02` | Toàn bộ copy operator-facing tiếng Việt; raw enum ACTIVE/OPEN được map qua `projectStatusLabel()` | `E-08` static terminology test |
| `AC-03` | Capability server-derived: ADMIN/HR_MANAGER/PM thấy Sửa + Status; chỉ ADMIN thấy Xoá vĩnh viễn; HR_STAFF/DIRECTOR/ACCOUNTANT thấy read-only banner | `E-02` static guard |
| `AC-04` | State machine: COMPLETED/CANCELLED terminal ⇒ KHÔNG có action chuyển trạng thái; non-terminal ↔ non-terminal mọi transition hợp lệ | `E-04` unit (state machine) |
| `AC-05` | PUT validation chặt: allowlist, ISO date round-trip, quota safe int, reject unknown field; clientCompanyId lookup, P2025 → 404 | `E-04` unit + `E-05` route test |
| `AC-06` | PATCH state transition: role gate, status enum, terminal guard → 400 INVALID_TRANSITION, idempotency replay/conflict | `E-05` route test |
| `AC-07` | DELETE: chỉ ADMIN; thiếu idem-key → 400; có phụ thuộc → 409 PROJECT_NOT_DELETABLE + "Hoàn thành/Huỷ dự án"; race fail-closed; orphan PASS | `E-04` unit (race) + `E-05` route test |
| `AC-08` | Link `/admin/staffing-orders/[id]` cho mỗi Nhu cầu tuyển dụng; link `/admin/job-openings/[id]` chỉ khi route detail tồn tại (không tạo link chết) | `E-02` static guard |
| `AC-09` | Full verification: typecheck/lint/test:unit/build/prisma validate/encoding/diff check pass | `E-01`..`E-07` |
| `AC-10` | PR CI 4/4 GREEN; dừng trước merge | gh run list |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` (A. Việt hoá) | `STEP-04`, `STEP-05`, `STEP-08` | `AC-01`, `AC-02` |
| `RQ-02` (B. Điều hướng) | `STEP-04` | `AC-08` |
| `RQ-03` (C. Quản trị) | `STEP-04`, `STEP-05`, `STEP-07` | `AC-01`, `AC-03` |
| `RQ-04` (D. Xoá an toàn) | `STEP-02`, `STEP-03`, `STEP-06`, `STEP-07` | `AC-07` |
| `RQ-05` (E. API integrity) | `STEP-02`, `STEP-03`, `STEP-07` | `AC-05` |
| `RQ-06` (F. Regression tests) | `STEP-06`, `STEP-07`, `STEP-08` | `AC-04`..`AC-08` |
| `RQ-07` (F. Race condition) | `STEP-06` | `AC-07` |
| `RQ-08` (F. UTF-8 no-BOM) | `STEP-10` | `AC-09` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `deleteProject` race condition với concurrent inserter (StaffingOrder/CandidateSubmission mới được COMMIT giữa lock và re-read) | Re-read deps dưới lock (lần 2); NẾU concurrent inserter commit TRƯỚC lock acquire, re-read sẽ thấy ⇒ 409 typed. NẾU inserter commit SAU lock, nó sẽ đợi lock của ta xong. |
| `RISK-02` | Cascade ngầm qua Prisma `onDelete: Cascade` của `Placement.projectId` (nếu có) | Schema kiểm tra: `Placement.projectId` SetNull — KHÔNG block delete, KHÔNG cascade; project xoá ⇒ `placement.projectId = null` tự động |
| `RISK-03` | `required-relation-sweep.static.test.ts` là TẬP ĐÓNG (hard-coded count 40) — thêm 1 select quan hệ bắt buộc mới sẽ fail test | STEP-09 cập nhật EXPECTED_HITS + count assertion 40 → 41 đồng thời với code |
| `RISK-04` | Edit/Delete UI chưa idempotent → double-click gây duplicate action | Dùng pattern `crypto.randomUUID()` per dialog open + disable button khi pending; route handler enforce idempotency key |
| `RISK-05` | Link `/admin/job-openings/[id]` có thể không tồn tại trong một số branch | `jobOpeningDetailRouteExists` check file `app/admin/job-openings/[id]/page.tsx`; fail-closed render `—` thay vì link chết |

## 8. Open Questions

- None. T0 đã chốt mọi quyết sách.

## 9. Planner Resolution

Tier 1 append sau khi chạy self-review; audit NONE resolve trực tiếp từ HANDOFF.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-06 | Initial contract | T0 directive 2026-10-06 PRE-P2 HOTFIX: VIỆT HÓA + QUẢN TRỊ DỰ ÁN |
