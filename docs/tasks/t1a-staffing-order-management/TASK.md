# TASK — `t1a-staffing-order-management`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `t1a-staffing-order-management` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | T0 directive explicitly: "Không Tier 3/AUDIT mode" — manual Tier 1 self-review suffices; no public contract addition (state machine unchanged) and no auth/RLS expansion. CRITICAL-class surface (state machine + delete) is bounded by existing transitions and existing RLS — no new authority. Risk-accept: Tier 0. |
| Spec version | `v1.0` |
| Status | `CORRECTING` |
| Planner | `Tier 1` |
| Baseline | `598feacc456becd450dcdb3942d2046691af3a3b` (`origin/main`) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/admin/staffing/`, `app/admin/staffing-orders/`, `app/api/staffing/orders/`, `src/domains/staffing/` |
| Forbidden paths | `prisma/`, `prisma/schema.prisma`, `prisma/migrations/`, `src/shared/auth/scopes/`, `app/api/auth/**`, `app/api/me/**`, `middleware.ts` |
| Required gates | `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `prisma validate`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs` |
| Current execution round | `2` |
| Current audit round | `0` |
| Next gate | `/deliver → /resolve` (PR opened, CI monitoring) |

> Lane và audit là hai quyết định riêng. T0 đã chốt `STANDARD + NONE`.

## 1. Outcome

### 1.1 User-visible outcome

- **`/admin/staffing`** (list): Vietnamese-first table, each row shows order code/title/project/deadline; vị trí column renders `Tên vị trí — đã tuyển/cần tuyển (còn thiếu N)` instead of uncontextualised `0/1` chips. Status filter + pagination preserved. Clear "Xem chi tiết" action column pointing to `/admin/staffing-orders/[id]`.
- **`/admin/staffing-orders/[id]`** (detail): full management page showing order code/title/project/description/deadline/status; bảng vị trí với mã, tên, số lượng, đã tuyển, còn thiếu, ca, lương/giờ, địa điểm, thời hạn; bảng JobOpenings/JobPostings liên kết; section "Chuyên viên tuyển dụng" (existing `RecruiterAssignmentManager`) chỉ hiển thị controls cho `ADMIN/HR_MANAGER`; action toolbar với `Sửa nhu cầu`, `Đánh dấu sắp đóng`, `Mở lại`, `Đóng nhu cầu`, `Hủy nhu cầu`, `Xóa vĩnh viễn` (chỉ `ADMIN`) gated bằng state machine; role có API read access mở được trang ở chế độ read-only.
- **Edit order**: PUT `/api/staffing/orders/[id]` chấp nhận `title`, `description`, `deadlineDate`, `slots[]` (add/update/remove). Backend enforce: projectId immutable; `slotsNeeded >= slotsFilled`; không xóa slot có `JobOpening`/`JobPosting`/`CandidateSubmission`/`ProjectAssignment` (placement). 200 success + OrderNotEditable (409) + SlotHasDependencies (409) với guidance.
- **Delete order**: DELETE `/api/staffing/orders/[id]` chỉ `ADMIN`, chỉ khi KHÔNG có `JobOpening`, `JobPosting`, `CandidateSubmission`, `ProjectAssignment`, `StaffingOrderRecruiterAssignment` thuộc order. Nếu có → 409 `Hủy nhu cầu`. Không cascade destroy.
- **Public job board**: fail-closed invariant giữ nguyên (`VISIBLE_ORDER_STATUSES = ['OPEN','CLOSING_SOON']` in `src/domains/job-board/public.service.ts:209`); chỉ verify bằng test chống regression rằng close/cancel ngay lập tức khiến order biến mất khỏi public listing và apply endpoint.
- **No new enums, no schema change, no auth/RLS expansion.**

### 1.2 Non-goals

- KHÔNG thêm status mới; KHÔNG đổi state machine; KHÔNG sửa Prisma schema/migration.
- KHÔNG mở rộng role authority (view giữ nguyên; create/edit/status giữ `ADMIN/HR_MANAGER/SALE`; phân công chuyên viên giữ `ADMIN/HR_MANAGER`; delete chỉ `ADMIN`).
- KHÔNG tự cascade xóa JobOpening/JobPosting/Submission/Assignment/RecruiterAssignment khi xóa order.
- KHÔNG viết lại public job board — chỉ verify invariant.
- KHÔNG viết test E2E browser — chỉ unit + integration hiện có + 1-2 targeted new tests.
- KHÔNG thêm dependency mới.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/admin/staffing-orders/[id]/page.tsx:39-48` hiện 403 cho mọi role ngoài `ADMIN/HR_MANAGER` | Trang chi tiết chỉ phân công chuyên viên; chưa phải full management; cần mở read-only. |
| `EV-02` | `app/admin/staffing/staffing-list-client.tsx:60-69` `SlotChip` chỉ render `filled/needed` (e.g. `0/1`) không có tên vị trí | Theo T0: phải hiển thị `Tên — filled/needed (còn thiếu)`. |
| `EV-03` | `src/domains/staffing/order.service.ts:204-225` `VALID_TRANSITIONS` đã có state machine; chỉ thiếu `updateStaffingOrder()` (slot CRUD) và `deleteStaffingOrder()` | Cần bổ sung 2 service functions + route. |
| `EV-04` | `src/domains/job-board/public.service.ts:209` `VISIBLE_ORDER_STATUSES = ['OPEN','CLOSING_SOON']`; `publish.service.ts:23` `PUBLISHABLE_ORDER_STATUSES = new Set(['OPEN','CLOSING_SOON'])` | Fail-closed invariant đã có sẵn; chỉ cần regression test xác nhận close/cancel → không list, không apply. |
| `EV-05` | `prisma/schema.prisma:417-435` `StaffingOrder` quan hệ: `slots`, `jobOpenings` (OpeningOnOrder), `assignments` (ProjectAssignment), `recruiterAssignments` (StaffingOrderRecruiterAssignment) | Đây là các bảng phụ thuộc cần check khi xóa / sửa slot. |
| `EV-06` | `prisma/schema.prisma:491-520` `StaffingOrderSlot` quan hệ: `jobOpening`, `submissions` (CandidateSubmission), `assignments` (ProjectAssignment), `neoJobOpenings` (OpeningSlotNeo) | Khi xóa slot phải check 4 bảng phụ thuộc này. |
| `EV-07` | `app/api/staffing/orders/[id]/route.ts:79-156` PATCH chỉ update status; không có PUT để sửa title/description/deadline/slots | Cần route PUT mới. |
| `EV-08` | `app/api/staffing/orders/route.ts:25-31` `LIST_ROLES = ADMIN/HR_MANAGER/HR_STAFF/PM/SALE/DIRECTOR/ACCOUNTANT`; `CREATE_ROLES = ADMIN/HR_MANAGER/SALE` | T0 nói "view giữ nguyên authority hiện tại" — không mở rộng. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Không thêm status mới, không đổi state machine — chỉ thêm chức năng quản lý quanh state machine hiện hữu | `CHOSEN` |
| `DEC-02` | `PUT /api/staffing/orders/[id]` chấp nhận `{ title, description, deadlineDate, slots: [{ id?, ... }] }`; `id` tồn tại = update, `id` thiếu = append, `id` truyền vào nhưng không tồn tại trong order = 400; slot muốn xóa truyền `id` + `_delete: true` (tách khỏi `[]` để dễ diff) | `CHOSEN` |
| `DEC-03` | Không cascade delete order hay slot; lỗi typed `409` kèm guidance | `CHOSEN` |
| `DEC-04` | Read-only detail page: HR_STAFF, PM, DIRECTOR, ACCOUNTANT thấy toàn trang ở chế độ đọc; KHÔNG hiển thị toolbar mutate, KHÔNG ẩn cả trang | `CHOSEN` |
| `DEC-05` | Edit/Delete UI: dùng dialog modal theo pattern `CreateModal` của list page; loading/error/success feedback per `RecruiterAssignmentManager` | `CHOSEN` |
| `DEC-06` | List page: thay cột `Vị trí cần tuyển` thành bullet list `<Tên vị trí> — <filled>/<needed> (còn thiếu N)`; thêm cột `Thao tác` với link `Xem chi tiết` | `CHOSEN` |
| `DEC-07` | Test chống regression: thêm 1 test domain-level cho `deleteStaffingOrder` guards và 1 test cho `updateStaffingOrderSlots` guards; 1 test static guard cho terminology của list page; 1 test static guard cho detail page role visibility | `CHOSEN` |
| `DEC-08` | Lane STANDARD + Audit NONE — T0 đã chốt | `CHOSEN` |
| `DEC-09` | Forbidden paths: KHÔNG đụng `prisma/`, không sửa `src/shared/auth/scopes/`, không mở rộng auth core | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A` | N/A — task không tạo capability kổ thống, không thêm dependency, không dùng thư viện mới | `N/A` | N/A | N/A | N/A | Domain logic + UI dùng pattern hiện hữu (`CreateModal`, `RecruiterAssignmentManager`); tests dùng vitest mock tx đã có |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A` | N/A — task không tạo connector, scheduler, notification worker, multi-system workflow | `N/A` | N/A | N/A | N/A | N/A | Chỉ thêm 2 route HTTP + 2 service function, không thêm background job |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `/admin/staffing` list: thay chip `0/1` bằng hiển thị `Tên vị trí — filled/needed (còn thiếu N)`; thêm cột thao tác `Xem chi tiết` |
| `RQ-02` | `/admin/staffing-orders/[id]`: hiển thị code, title, project, description, deadline, status; bảng vị trí (mã, tên, số lượng, đã tuyển, còn thiếu, ca, lương, địa điểm, thời hạn); bảng JobOpenings/JobPostings liên kết |
| `RQ-03` | `/admin/staffing-orders/[id]`: section `Chuyên viên tuyển dụng` (existing `RecruiterAssignmentManager`) chỉ `ADMIN/HR_MANAGER` thao tác; role khác thấy read-only |
| `RQ-04` | `/admin/staffing-orders/[id]`: mở read-only cho role có API read access (HR_STAFF/PM/DIRECTOR/ACCOUNTANT) |
| `RQ-05` | Toolbar: `Sửa nhu cầu`, `Đánh dấu sắp đóng`, `Mở lại`, `Đóng nhu cầu`, `Hủy nhu cầu`; state machine không đổi; có confirmation cho close/cancel |
| `RQ-06` | Edit order: PUT `/api/staffing/orders/[id]` — `{ title, description, deadlineDate, slots: [{id?, positionCode, positionTitle, slotsNeeded, hourlyRateVnd?, shiftStart?, shiftEnd?, validFrom, validTo?, workLocation?, _delete?}] }`; immutable project; `slotsNeeded >= slotsFilled`; không xóa slot có JobOpening/Posting/Submission/Assignment; backend enforce (không chỉ UI) |
| `RQ-07` | Delete order: DELETE `/api/staffing/orders/[id]` chỉ ADMIN; nếu có JobOpening/Posting/Submission/Assignment/RecruiterAssignment thuộc order → 409 + guidance `Hủy nhu cầu`; không cascade |
| `RQ-08` | Public listing/apply fail-closed khi order `CLOSED/CANCELLED` (regression test) |
| `RQ-09` | View authority giữ nguyên; create/edit/status giữ `ADMIN/HR_MANAGER/SALE`; phân công chuyên viên giữ `ADMIN/HR_MANAGER`; delete chỉ `ADMIN` |
| `RQ-10` | Bổ sung test: UI list terminology, UI detail role visibility, transition state machine (đã có), edit guards, delete guards, fail-closed public |

### 4.2 Scope boundaries

- **In:**
  - `app/admin/staffing/staffing-list-client.tsx` — list cột `Vị trí` thay chip bằng text, thêm cột `Thao tác`
  - `app/admin/staffing-orders/[id]/page.tsx` — viết lại thành full management page, gom read-only + role-gated section
  - `app/admin/staffing-orders/[id]/order-management-client.tsx` (NEW) — client component cho toolbar + edit modal + delete confirm
  - `app/api/staffing/orders/[id]/route.ts` — thêm PUT handler, thêm DELETE handler
  - `src/domains/staffing/order.service.ts` — thêm `updateStaffingOrder()` (slots CRUD), `deleteStaffingOrder()` (guards)
  - `src/domains/staffing/order.service.test.ts` — thêm test guards
  - `app/admin/staffing/__tests__/staffing-terminology.static.test.ts` — bổ sung asserts cho cột mới
  - `app/admin/staffing-orders/__tests__/order-detail-role-visibility.static.test.ts` (NEW) — static guard cho role visibility
  - `docs/tasks/t1a-staffing-order-management/TASK.md` (this file)
  - `docs/tasks/t1a-staffing-order-management/HANDOFF.md`

- **Out:**
  - `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.mjs` (T0 cấm)
  - `src/shared/auth/scopes/**` (không mở rộng RLS)
  - `app/api/auth/**`, `app/api/me/**`, `middleware.ts` (auth core cấm)
  - `src/domains/job-board/public.service.ts`, `publish.service.ts` (chỉ verify, không sửa)
  - WIP các task khác

- **Allowed task artifacts:** `docs/tasks/t1a-staffing-order-management/**`

### 4.3 Domain boundaries

- **Data/state:** Không đổi schema. State machine `OPEN → CLOSING_SOON|CLOSED|CANCELLED`, `CLOSING_SOON → OPEN|CLOSED|CANCELLED`, terminal `CLOSED`/`CANCELLED` giữ nguyên. Thêm 2 service functions nhưng KHÔNG thêm field mới.
- **Permission/security:** View = LIST_ROLES hiện tại; edit/status = UPDATE_ROLES hiện tại; phân công chuyên viên = MANAGE_ROLES hiện tại; delete = ADMIN-only (mới — không mở rộng API authority trên các bảng khác, chỉ là DELETE mới trên `staffing_orders` đã qua guard).
- **Interface/API:**
  - `PUT /api/staffing/orders/[id]` body: `{ title?: string, description?: string|null, deadlineDate?: string|null, slots?: Array<{ id?: string, positionCode: string, positionTitle: string, slotsNeeded: number, hourlyRateVnd?: number|null, shiftStart?: string|null, shiftEnd?: string|null, validFrom: string, validTo?: string|null, workLocation?: string|null, _delete?: boolean }> }`
  - `DELETE /api/staffing/orders/[id]` body: empty; response 200 `{ ok: true }` hoặc 409 `{ error: 'ORDER_NOT_DELETABLE', message: '...Dùng Hủy nhu cầu thay thế...' }`
  - 400 `VALIDATION_ERROR`, 401, 403 `PERMISSION_DENIED`, 404 `NOT_FOUND`, 409 `ORDER_NOT_EDITABLE | ORDER_NOT_DELETABLE | SLOT_HAS_DEPENDENCIES`
- **Migration/rollback:** N/A — không thay schema.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/admin/staffing/staffing-list-client.tsx` | Thay cột `Vị trí` chip thành text dạng `<Tên vị trí> — filled/needed (còn thiếu N)`; thêm cột `Thao tác` với link `Xem chi tiết`; thêm cột `Hạn tuyển` nếu có | E-01 static test pass; visual inspect | Bất kỳ lỗi typecheck/test cũ |
| `STEP-02` | `app/admin/staffing-orders/[id]/page.tsx` + new `order-management-client.tsx` | Viết lại page: read-only cho HR_STAFF/PM/DIRECTOR/ACCOUNTANT; ADMIN/HR_MANAGER/SALE thấy toolbar; render header (code/title/project/description/deadline/status) + bảng vị trí + bảng JobOpenings/Postings + section chuyên viên (gated) | E-02 static guard pass; E-03 typecheck pass | Bất kỳ lỗi typecheck/test cũ |
| `STEP-03` | `app/admin/staffing-orders/[id]/order-edit-modal.tsx` (NEW) + `order-action-modals.tsx` (NEW) | Modal sửa order; modal confirmation cho close/cancel; loading/success/error feedback; idempotency key cho transition | E-04 typecheck pass; visual inspect | Bất kỳ lỗi typecheck/test cũ |
| `STEP-04` | `src/domains/staffing/order.service.ts` | Thêm `updateStaffingOrder(tx, ctx, id, input)` enforce: projectId không đổi (immutable — nếu input đưa projectId thì ignore hoặc 400); `slotsNeeded >= slotsFilled`; xóa slot bị block nếu có JobOpening/Submission/Assignment/NeoJobOpening. Thêm `deleteStaffingOrder(tx, ctx, id)` enforce: ADMIN + không có JobOpening/Posting/Submission/Assignment/RecruiterAssignment | E-05 unit test pass | Bất kỳ lỗi test cũ |
| `STEP-05` | `app/api/staffing/orders/[id]/route.ts` | Thêm `PUT` (dùng `updateStaffingOrder`) + `DELETE` (chỉ ADMIN, dùng `deleteStaffingOrder`); xử lý `ORDER_NOT_DELETABLE` 409 với guidance | E-06 typecheck pass; E-07 targeted route test pass | Bất kỳ lỗi test cũ |
| `STEP-06` | `src/domains/staffing/order.service.test.ts` | Bổ sung tests: `updateStaffingOrder` happy path, projectId ignored/400, `slotsNeeded < slotsFilled` reject, slot delete bị block khi có JobOpening; `deleteStaffingOrder` guard với từng loại phụ thuộc; role non-ADMIN reject | E-08 vitest pass | Test fail |
| `STEP-07` | `app/admin/staffing-orders/__tests__/order-detail-role-visibility.static.test.ts` (NEW) | Static guard: page.tsx KHÔNG redirect 403 cho role ngoài MANAGE_ROLES; render read-only thay vì banner; section chuyên viên có `canManage` gating | E-09 static test pass | Test fail |
| `STEP-08` | Public fail-closed regression test | Thêm 1 test domain-level gọi `VISIBLE_ORDER_STATUSES`/`OPEN_ORDER_STATUSES` + mock Prisma; xác nhận filter áp dụng cho status `CLOSED`/`CANCELLED` | E-10 vitest pass | Test fail |
| `STEP-09` | Full verification: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `prisma validate`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `git diff --check` | Tất cả pass | E-11 to E-15 | Bất kỳ lệnh fail |
| `STEP-10` | Commit + push branch; mở non-draft PR; chờ CI 4/4 GREEN; dừng trước merge | PR URL reported | E-16 gh run list | CI fail hoặc conflict |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | List page: cột `Vị trí` render text theo format mới (không còn chip `0/1` đơn thuần) | `E-01` static test |
| `AC-02` | Detail page: render header (code/title/project/description/deadline/status), bảng vị trí, bảng JobOpenings/Postings, section chuyên viên gated | `E-02` static guard + `E-03` typecheck + manual review |
| `AC-03` | Detail page: HR_STAFF/PM/DIRECTOR/ACCOUNTANT mở được read-only; không còn banner 403 cứng | `E-09` static guard |
| `AC-04` | State machine transition: `OPEN → CLOSING_SOON|CLOSED|CANCELLED`; `CLOSING_SOON → OPEN|CLOSED|CANCELLED`; `CLOSED/CANCELLED` terminal; existing test vẫn pass | `E-08` vitest (transition) + E-14 build |
| `AC-05` | Edit order: projectId immutable, `slotsNeeded >= slotsFilled`, xóa slot có JobOpening/Submission/Assignment bị reject với typed error | `E-05` + `E-08` unit |
| `AC-06` | Delete order: ADMIN only; 409 khi có phụ thuộc; không cascade | `E-05` + `E-08` unit + `E-07` route |
| `AC-07` | Public fail-closed: order `CLOSED`/`CANCELLED` không list, không apply | `E-10` regression test |
| `AC-08` | Full verification: typecheck/lint/test:unit/build/prisma validate/encoding/diff check pass | `E-11`..`E-15` |
| `AC-09` | PR CI 4/4 GREEN; dừng trước merge | `E-16` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-02` |
| `RQ-04` | `STEP-02`, `STEP-07` | `AC-03` |
| `RQ-05` | `STEP-03` | `AC-02` |
| `RQ-06` | `STEP-04`, `STEP-05`, `STEP-06` | `AC-05` |
| `RQ-07` | `STEP-04`, `STEP-05`, `STEP-06` | `AC-06` |
| `RQ-08` | `STEP-08` | `AC-07` |
| `RQ-09` | `STEP-04`, `STEP-05` | `AC-05`, `AC-06` |
| `RQ-10` | `STEP-01`..`STEP-08` | `AC-01`..`AC-07` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `PUT` body phức tạp → dễ phá vỡ slot invariants | Unit test cover 4 guards (projectId, slotsNeeded>=slotsFilled, delete guard, append); rollback: revert commit nếu CI fail |
| `RISK-02` | `DELETE` cascade ngầm qua Prisma `onDelete: Cascade` của `slots`/`assignments`/`jobOpenings` (xem `prisma/schema.prisma:432-433,487,506,509`) | Service check trước khi gọi `tx.staffingOrder.delete`; nếu có phụ thuộc thì trả 409, không gọi delete |
| `RISK-03` | Read-only HR_STAFF thấy internal data nhạy cảm (salary, location) | Hiện đã có cùng data trong list page; không mở rộng so với LIST_ROLES — rollback nếu Tier 0 muốn siết |
| `RISK-04` | Edit/Delete UI chưa idempotent → double-click gây duplicate action | Dùng pattern idempotency key + disable button khi pending (giống `RecruiterAssignmentManager`) |

## 8. Open Questions

- None. T0 đã chốt mọi quyết sách.

## 9. Planner Resolution

Tier 1 append sau khi chạy self-review; audit NONE resolve trực tiếp từ HANDOFF.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-05 | Initial contract | Initial |
| `v1.0` | 2026-10-05 | Status READY_FOR_EXECUTION → ACCEPTED; Current execution round 0 → 1; Next gate = `/deliver → /resolve` (PR opened, CI monitoring) | Tier 1 self-review passed; all gates GREEN; implementation complete (28 test files + 4349 unit tests passing) |
| `v1.0` | 2026-10-05 | CORRECTION 1/1 in-flight: Status ACCEPTED → CORRECTING; Execution round 1 → 2 | T0 correction 1/1 PR #108: (1) full Vietnamese UI copy (Order → nhu cầu tuyển dụng, Slot → vị trí tuyển, JobOpening → vị trí tuyển nội bộ, JobPosting → tin tuyển dụng, role → vai trò, terminal → trạng thái kết thúc; no internal field in user-facing copy); (2) concurrent-safe delete/update-slot (advisory locks + re-read under lock); (3) DELETE dùng `withIdempotency` (route key `DELETE:/api/staffing/orders/:id`, requires `x-idempotency-key`); (4) PUT strict validation (hourlyRateVnd safe int ≥ 0 / null, ISO dates, validTo≥validFrom, HH:mm times); (5) ADMIN delete visible on CLOSED/CANCELLED (backend guard is authority) |
| `v1.0` | 2026-10-05 | CORRECTION 1/1 implementation: Implementation SHA `d94b9a66` | Branch `codex/t1a-staffing-order-management`; push OK; pre-push gates all GREEN (4386 unit tests, typecheck, lint, build, encoding, diff-check); static guard `required-relation-sweep` updated for new post-lock select (39→40 hits in `src/`); 21 new route tests in `app/api/staffing/orders/[id]/route.test.ts`; awaiting CI 4/4 GREEN |
