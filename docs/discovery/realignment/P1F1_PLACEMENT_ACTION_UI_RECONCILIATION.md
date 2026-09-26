# P1-F1 — Recruiter Workbench Placement Actions Reconciliation

**Pipeline V2 — Discovery / Realignment — Spec v1.0**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` (planning only; no source code in this round) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Correction budget (this doc) | `1` (zero consumed — see `### Revision Log`) |
| Baseline (origin/main @ planning pin) | `4970f47d481c185f655242e3e91480e4117241dd` |
| Frozen HEAD | `4970f47d481c185f655242e3e91480e4117241dd` |
| Semantic implementation HEAD | `4970f47d481c185f655242e3e91480e4117241dd` (F1 chưa code; HEAD chính là baseline) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1f1-placement-actions-planning` |
| Branch | `codex/t1b-p1f1-placement-actions-planning` |
| Predecessor SHA (this branch) | none (new branch off `origin/main`; no amend/reset/rebase) |
| Owner of this doc | T1B (independent) |
| P1-A0 / P1-A1 / P1-B state | `ACCEPTED` trên main |
| P1-C / P1-D state | `ACCEPTED` trên main (DEC-01..DEC-14 đã freeze) |
| P1-E0 state | `ACCEPTED` trên main (`RecruiterWorkbenchRow` DTO đã freeze) |
| P1-E1 state | `PROPOSED_ONLY`; candidate branch `origin/codex/t1a-p1e1-recruiter-workbench-ui` chưa merge main; **F1 KHÔNG** được tự implement UI shell ngoài bám sát E0 contract |
| P1-F0 state | `ACCEPTED` trên main (5 named placement commands đã ship, PR #58 merged) |
| P1-F1 (round này) | Planning-only reconciliation + V2 contract; **chờ P1-E1 ACCEPTED mới code** |
| Next gate | `WAIT_P1_E1_ACCEPTED_AND_T0_CONTRACT_APPROVAL` |

## 0. Mục đích & phạm vi

Tài liệu này **reconcile** trạng thái thật của canonical Placement lifecycle
(`SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED`), F0 accepted command
API, E0 frozen read-model, và candidate E1 UI để đề xuất **slice UI nhỏ nhất**
cho P1-F1 — cho phép recruiter (`ADMIN` / `HR_MANAGER`) thực thi 5 named
canonical placement commands từ Recruiter Workbench mà KHÔNG tự tính lifecycle,
KHÔNG tự derive state, và KHÔNG bypass `placement.service`.

**Round này chỉ documentation. Không viết source code, không schema, không migration,
không package/lockfile, không UI code, không mở PR.** Mọi RQ/AC được map 1:1
với V2 contract trong `docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md`.

Ngoài phạm vi round này (đã frozen hoặc task riêng):

- **P1-A0/A1/B/C/D** — `ACCEPTED`, đã freeze DEC-01..DEC-14.
- **P1-E0** `RecruiterWorkbenchRow` — `ACCEPTED` trên main; F1 **chỉ đọc**, không
  refactor.
- **P1-E1** Simple Recruiter Workbench UI — `PROPOSED_ONLY`; F1 tham chiếu
  candidate branch `b81f5b94401fc14af9d07c7eefd2e94d55e17096` cho insertion
  points, KHÔNG tự code UI shell.
- **P1-F0** Placement Command API + adapter — `ACCEPTED` trên main; F1 chỉ
  consume 5 routes (READ-only của E0 + WRITE qua 5 F0 routes).
- **P1-F1 (theo sau, post E1 ACCEPTED)** — task này. Round planning hiện tại
  freeze contract + open decisions.
- **N-series** Notification/n8n — `OUT_OF_SCOPE`; F1 không phát outbox event,
  không gọi n8n, không tạo workflow.
- **MP-3C** legacy V6 assignment-placement (`src/domains/applications/placement-ui.ts`
  + `placement-panel.tsx`) — F1 **KHÔNG** dùng các file đó cho N3 placement.
- **NAV-01** sidebar/menu — F1 chỉ render action controls trong row + drawer
  hiện hữu của E1; KHÔNG sửa nav.
- **N4** atomic workforce bridge cho HRP-managed EFFECTIVE — `OUT_OF_SCOPE`
  theo DEC-07.

Tài liệu này **không** sửa `docs/PLANNER_HANDOVER.md` (T0-owned),
**không** sửa F0 task docs, **không** sửa E0/E1 task docs,
**không** mở PR, **không** gọi T3.

## 1. Canonical naming

| Canonical ID | Tên | Vai trò |
| --- | --- | --- |
| P1-F | Placement conversions & formal placement (lifecycle `SELECTED → CONFIRMED → EFFECTIVE \| FAILED \| CANCELLED`) | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §29 |
| P1-F0 | Placement Command API + backend adapter (5 named canonical commands) | `ACCEPTED` trên main (`docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` v1.5); F1 thuần READ-and-call |
| **P1-F1** | **Recruiter UI actions cho placement commands từ Workbench** | **Task này; planning only** |
| P1-E0 | Recruiter Workbench read-model (`RecruiterWorkbenchRow` DTO đã freeze) | `ACCEPTED` trên main |
| P1-E1 | Recruiter Workbench UI shell | `PROPOSED_ONLY`; candidate branch `b81f5b94401fc14af9d07c7eefd2e94d55e17096` |

Các tên cấm trong F1:

- "placement panel MP-3C" → legacy V6 assignment-placement; F1 KHÔNG dùng.
- "Worker/Episode/Assignment placement" → MP-3C territory; F1 KHÔNG dùng.
- "atomic workforce bridge" → N4 territory; F1 KHÔNG đụng.
- "side-effect mutation helper" → F1 chỉ wrap 5 F0 routes, không tự viết Prisma.

## 2. Capability Matrix

Phân loại:

- `IMPLEMENTED` — code đã ở `origin/main`, F1 chỉ dùng.
- `PARTIAL` — code một phần ở main, cần bổ sung (ghi rõ phần thiếu).
- `MISSING` — chưa có trên main, cần task mới (ghi rõ task nào).
- `REFERENCE_ONLY` — tài liệu/decision log, không phải implementation.
- `OUT_OF_SCOPE` — thuộc task khác (F1, N-series, N4, v.v.).

### 2.1 Schema (`prisma/schema.prisma`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `PlacementCaseStatus` enum | `IMPLEMENTED` | `prisma/schema.prisma:1516` | F1 read-only. |
| `PlacementStatus` enum (`SELECTED` / `CONFIRMED` / `EFFECTIVE` / `FAILED` / `CANCELLED`) | `IMPLEMENTED` | `prisma/schema.prisma:1541` | DEC-03/05 freeze. |
| `ServiceModel` enum | `IMPLEMENTED` | `prisma/schema.prisma:1532` | DEC-01; `managementMode` derive client-side qua pure helper `computeManagementMode` (read-only). |
| `PlacementCase` table | `IMPLEMENTED` | `prisma/schema.prisma:1547+` | F1 read; F0 write qua command. |
| `Placement` table + `placements_active_unique` partial unique | `IMPLEMENTED` | `prisma/migrations/20260914212136_n3_service_model_placement` | Race-safety đã enforce ở DB. F1 không bypass. |
| `placement_case_labor_profile_id_active_unique` partial unique | `IMPLEMENTED` | `prisma/migrations/20260912140411_n1_placement_case_foundation` | Một active case per LaborProfile. |
| `evidence` fields trên `Placement` (client-managed EFFECTIVE persistence) | `IMPLEMENTED` | `prisma/schema.prisma` (Placement model) | F1 chỉ gửi JSON; service persist. |
| New `PlacementStatus` / `ManagementMode` field trên `RecruiterWorkbenchRow` DTO | `MISSING` | E0 chưa expose `placementId` / `placementStatus` / `managementMode` lên row | **Residual R-F1-01**: nếu F1 cần render action controls gated by current placement status, E0 cần mở rộng additive (`placement?: { id, status, managementMode? } \| null`). T0 quyết theo §6 Open Decisions. |

### 2.2 Backend services

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| 5 named placement commands | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:103/454/458/468/472` | F1 chỉ wrap qua HTTP route. |
| Lifecycle state machine (pure) | `IMPLEMENTED` | `src/domains/talent/placement.lifecycle.ts:51-88` | F1 KHÔNG tự derive; nếu cần allowedTransitions thì import helper (read-only, pure). |
| Error taxonomy (`PlacementError` + 4 subclass) | `IMPLEMENTED` | `src/domains/talent/placement.errors.ts:14-60` | F1 dùng `code` để map message thân thiện. |
| Adapter + route helper | `IMPLEMENTED` | `src/domains/talent/placement.commands.ts` + `placement.route-helpers.ts` | F1 chỉ consume 5 routes, không gọi adapter trực tiếp. |
| 5 admin HTTP routes | `IMPLEMENTED` | `app/api/admin/placements/**` | F1 chỉ `fetch(...)` qua đây. |
| Idempotency-Key wrap (consumer-side) | `IMPLEMENTED` | `src/shared/integrity/idempotency/**` | F1 mints UUID v4 per deliberate attempt. |
| `withDbContext` RLS GUC | `IMPLEMENTED` | `src/shared/auth/with-db-context.ts` | F1 KHÔNG gọi DB; route tự wrap. |
| Auth + role gate (`ADMIN` / `HR_MANAGER`) | `IMPLEMENTED` | `placement.route-helpers.ts:60` (`ALLOWED_PLACEMENT_ROLES`) | F1 chỉ disable action khi role ≠ ADMIN && ≠ HR_MANAGER. |
| E0 read service + masking | `IMPLEMENTED` | `src/domains/talent/recruiter-workbench.read-service.ts` | F1 chỉ fetch `/api/admin/recruiter-workbench`. |
| Server-derived `nextAction` (7-value enum) | `IMPLEMENTED` | `recruiter-workbench.read-service.ts:282-322` + `recruiter-workbench.types.ts:29-37` | F1 dùng để gate action visibility (closed enum). |

### 2.3 Read service (`recruiter-workbench.read-service.ts`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `placements: { take: 1, orderBy: selectedAt DESC, id DESC, select: { id, selectedAt, jobOpening: { posting, staffingOrder.project } } }` | `IMPLEMENTED` | `recruiter-workbench.read-service.ts:673-691` | E0 đã include `Placement.id` + `Placement.selectedAt` cho job-context projection — DB row có sẵn, **chỉ thiếu việc chiếu lên DTO**. |
| `extractJobContextFromPlacement` pure helper | `IMPLEMENTED` | `recruiter-workbench.read-service.ts:371-405` | Projection pure; F1 không fork. |
| Masking (`maskPhone`, `maskCccd`) cho PII | `IMPLEMENTED` | `src/shared/privacy/mask.ts` | F1 không tự mask; DTO đã mask sẵn. |
| URL-synced filter/sort/page primitive | `IMPLEMENTED` | `src/shared/ui/data-table/use-table-url-state.ts:58` | F1 dùng cho action filter/sort. |
| `RecruiterWorkbenchRow.placement?: { id, status, managementMode } \| null` field | `MISSING` | DTO hiện chỉ có `job.{jobPostingId, jobPostingTitle, projectName, companyName}` | **Residual R-F1-01** (xem §3). |

### 2.4 UI primitives

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| Custom Tailwind + design-tokens primitives | `IMPLEMENTED` | `src/shared/ui/data-table/data-table.tsx`, `data-display/empty-state.tsx`, `sheet/slide-out-drawer.tsx`, `data-table/use-table-url-state.ts` | F1 ADOPT. |
| `lucide-react` icons | `IMPLEMENTED` | `package.json` (`lucide-react@^0.468.0`) | F1 ADOPT cho action affordances. |
| `SlideOutDrawer` (right-side drawer cho record detail) | `IMPLEMENTED` | `src/shared/ui/sheet/slide-out-drawer.tsx` | F1 ADOPT cho Placement Action panel khi `placement.effective` cần evidence form. |
| `DataTable` + URL state + filters | `IMPLEMENTED` | `src/shared/ui/data-table/data-table.tsx` | F1 ADOPT cho workbench table. |
| `EmptyState` | `IMPLEMENTED` | `src/shared/ui/data-display/empty-state.tsx` | F1 ADOPT cho empty rows. |
| `zod` cho payload validation (client-side preflight) | `IMPLEMENTED` | `package.json` (`zod@^3.24.1`) | F1 ADOPT; F0 strict body parse ở server là authority. |
| `react-hook-form` cho evidence form | `IMPLEMENTED` | `package.json` (`react-hook-form@^7.54.2`) | F1 ADOPT (optional; có thể dùng controlled state như MP-3C placement-panel). |
| shadcn / Radix Dialog / MUI / antd | `MISSING` | repo không cài các package này; UI tự build bằng Tailwind + tokens | F1 KHÔNG thêm dependency mới. ADOPT slide-out-drawer làm panel primitive. |
| `newIdempotencyKey()` UUID v4 helper | `IMPLEMENTED` | `src/domains/applications/placement-ui.ts:182-186` (`mp3c-<uuid>`) | F1 ADOPT pattern nhưng đặt namespace prefix `p1f1-<uuid>` để tránh collision (xem DEC-F1-04). |
| Generic toast / banner primitive | `MISSING` | repo không có shared `Toast` / `Alert` component | F1 phải tự render inline banner pattern (xem `placement-panel.tsx:364-365` & `admin/applications/page.tsx:506-507`) — tự nhiên khớp với pattern hiện hữu của MP-3C. |

### 2.5 Admin pages & patterns

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| MP-3C placement-panel (presentation-only components) | `IMPLEMENTED` | `src/domains/applications/placement-panel.tsx` | F1 **KHÔNG** reuse cho N3 placement; chỉ dùng pattern: controlled props, `pending` disabled, success/error inline message, evidence form. |
| MP-3C admin applications page wiring (idempotency key, panel error/success, refetch after action) | `IMPLEMENTED` | `app/admin/applications/page.tsx` | F1 dùng làm canonical reference cho fetch/Idempotency-Key wiring. |
| `actionsXxx()` route pattern | `IMPLEMENTED` | `app/api/admin/applications/[id]/actions/{convert,screen,...}/route.ts` | F1 **KHÔNG** tạo route mới; chỉ gọi F0 routes hiện hữu. |
| `recruiter-workbench` UI shell (candidate branch) | `MISSING` | E1 branch `b81f5b9440` chỉ chứa `.ai-pipeline`, `docs`, `mockup` — KHÔNG có `app/admin/recruiter-workbench/**` | F1 chờ E1 ACCEPTED mới có shell để gắn action controls. **Residual R-F1-02**: trong round planning, F1 document insertion points theo E0 DTO shape + dự kiến E1 shell, không tự code shell. |

## 3. Residual gaps cần giải quyết trước khi implementation

### R-F1-01 — E0 DTO chưa expose `placementId` / `placementStatus` / `managementMode`

**Hiện trạng**: `RecruiterWorkbenchRow` chỉ có `job.{jobPostingId, jobPostingTitle, projectName, companyName}` — đều derive từ `placements[0]` qua `extractJobContextFromPlacement`. Service đã `include: { placements: { take: 1, orderBy: selectedAt DESC, id DESC, select: { id, selectedAt, jobOpening: { posting, staffingOrder.project } } } }` nhưng **không** chiếu `placementId` / `PlacementStatus` / `serviceModelSnapshot` lên DTO.

**Impact**:
- Nếu F1 muốn render action controls gated by current placement status (`SELECTED` → CONFIRM | FAIL | CANCEL; `CONFIRMED` → EFFECTIVE | FAIL | CANCEL; `EFFECTIVE` / `FAILED` / `CANCELLED` → NONE) thì F1 **cần biết** current placement status. Hiện không thể.
- Nếu F1 muốn ẩn CONTROL EFFECTIVE cho HRP-managed thì F1 cần `managementMode`. Hiện không thể (và KHÔNG thể derive từ `job.companyName`/`projectName`).

**Option A — Additive read-model extension** (ưu tiên 1, khuyến nghị):
- E0 mở rộng DTO với field `placement?: { id: string; status: PlacementStatus; managementMode?: ManagementMode } | null` (nested, optional, null khi case chưa có placement).
- Project từ `c.placements[0]` (Prisma include đã có sẵn — chỉ thêm `status: true, serviceModelSnapshot: true` vào `select`, project `managementMode` qua pure helper `computeManagementMode`).
- KHÔNG đụng `placements` `take: 1` ordering (đã đúng: `selectedAt DESC, id DESC`).
- T0 decision: thuộc `WAIT_T0_ADJUDICATION` (xem §6).

**Option B — Discovery lookup per case**:
- F1 fetch trực tiếp `GET /api/admin/placements?placementCaseId=...` (route mới) hoặc `GET /api/admin/recruiter-workbench/[caseId]` (route mới).
- Trade-off: +1 round-trip per row action click; cần một API mới (out of scope E0).
- T0 decision: thuộc `WAIT_T0_ADJUDICATION`.

**Option C — Gate UI toàn bộ**: F1 chỉ hiển thị placeholder "Xem chi tiết" cho mọi case; không render action controls.
- Trade-off: cực đoan, mất giá trị của F1.
- T0 decision: thuộc `WAIT_T0_ADJUDICATION` (reject nếu T0 chọn).

**Default nếu T0 không respond trước khi P1-E1 merge**: F1 adopt Option A (khuyến nghị). Nếu T0 chọn Option B, F1 phải đợi E0 accept API mới.

### R-F1-02 — E1 UI shell chưa tồn tại trong candidate branch

**Hiện trạng**: Branch `origin/codex/t1a-p1e1-recruiter-workbench-ui` @ `b81f5b9440` chỉ chứa `.ai-pipeline`, `docs`, `mockup`, `scratch` — KHÔNG có file UI (`app/admin/recruiter-workbench/**` hay `src/domains/talent/RecruiterWorkbenchTable*`).

**Impact**: F1 không thể chèn action controls vào một shell chưa tồn tại.

**Quyết định (đã chốt trong round này, §6)**:
- F1 chờ `P1-E1 ACCEPTED` mới implement UI.
- Trong planning này, F1 document **insertion points** dựa trên:
  1. E0 DTO shape (đã freeze).
  2. E0 §4.4 / 7-value `nextAction` enum (đã freeze).
  3. E0 `primaryActions` slot (đã freeze — `detailHref` + `submissionHref`).
  4. UI primitives hiện hữu (`DataTable`, `SlideOutDrawer`, `EmptyState`).
- F1 KHÔNG tự code UI shell ngoài E1.

### R-F1-03 — Generic toast / banner primitive chưa có

**Hiện trạng**: Repo không có shared `Toast` / `Alert` component. Pattern hiện tại: inline `role="alert"` / `role="status"` paragraph (`placement-panel.tsx:364-365`).

**Quyết định**: F1 ADOPT inline pattern hiện hữu — render `<p role="alert">` / `<p role="status">` ngay trong panel. KHÔNG thêm dependency mới (shadcn/Radix/MUI đều thiếu). Khi E2 (notification) hoặc task nào đó mở `Toast` primitive, F1 migrate sau.

### R-F1-04 — Idempotency key namespace cho F1

**Hiện trạng**: Helper `newIdempotencyKey()` trong `src/domains/applications/placement-ui.ts:182` dùng prefix `mp3c-`. F0 route check UUID v4 thuần (không có prefix).

**Quyết định**: F1 dùng prefix `p1f1-` cho clarity trong client log; **server vẫn check UUID v4 thuần** (F0 strict). Client phải strip prefix trước khi gửi, hoặc dùng raw UUID v4. Khuyến nghị: client mints raw UUID v4 (canonical Next.js 15 `crypto.randomUUID()`); chỉ namespace ở log để debug. Xem §6 Open Decisions.

### R-F1-05 — Body shape & validation source-of-truth

**Hiện trạng**: F0 strict body parsing ở route (e.g. `validateCreateBody` ở `app/api/admin/placements/route.ts:40-90`). F1 chỉ gửi JSON; server là authority.

**Quyết định**: F1 KHÔNG tự validate strict schema client-side; chỉ dùng `zod` cho preflight (e.g. `evidence.clientAcknowledgedAt` phải ISO-8601 — không bắt buộc nhưng UX tốt hơn). Mọi 400 từ server phải render verbatim (theo `placement-panel.tsx:95-100` pattern `messageOf`).

### R-F1-06 — Idempotency cho `placement.create` qua DTO row

**Hiện trạng**: E0 `RecruiterWorkbenchRow` không có `placementCaseId` field. F1 muốn gọi `placement.create` từ row thì cần `placementCaseId`.

**Quyết định**: F1 chỉ expose CREATE action khi `placement === null` (case chưa có placement). Render flow yêu cầu user chọn `jobOpeningId` (F1 KHÔNG auto-fill) — đây là một step riêng của UX. Khi E0 mở rộng DTO (§3 Option A), add `placement?.jobOpeningId` cho SELECTED case (để FAIL/CANCEL dùng `placementId` trực tiếp, không cần `jobOpeningId`).

## 4. Capability Mapping: F1 UI surface ↔ F0 routes ↔ E0 DTO

### 4.1 UI components F1 sẽ chèn vào (planned, post-E1)

| Insertion point | Component (planned) | Source primitive | Depends on |
| --- | --- | --- | --- |
| Row actions column (cuối row) | `<PlacementActionControls row={row} role={role} onAction={...} />` | Custom (Tailwind) | E0 DTO có `placement?.id/status/managementMode?` (R-F1-01 Option A) |
| Detail drawer (right-side) | `<PlacementActionDrawer open={open} placementId={...} currentStatus={...} managementMode={...} onClose={...} onChanged={...} />` | `SlideOutDrawer` (ADOPT) | R-F1-01 |
| Confirmation modal (Confirm / Fail / Cancel) | `<ConfirmPlacementActionDialog kind="confirm\|fail\|cancel" placementId={...} onConfirm={...} onCancel={...} pending={...} />` | Custom (Tailwind, no Radix) | None |
| EFFECTIVE evidence form | `<EffectiveEvidenceForm value={...} onChange={...} pending={...} onSubmit={...} />` | Custom (Tailwind) + zod preflight | None |
| Inline error / success banner | `<p role="alert">` / `<p role="status">` | Inline pattern hiện hữu | None |

### 4.2 Action ↔ F0 route ↔ body ↔ effect mapping

| Action (UI label) | `nextAction` gating (suggested) | F0 route | Body | 200/201 response | Effect on UI |
| --- | --- | --- | --- | --- | --- |
| "Chọn ứng viên" (CREATE) | `READY_TO_PLACE` && `placement === null` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements` | `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | Refresh row; new `placement.id`, `placement.status = 'SELECTED'`, `placement.managementMode = computeManagementMode(serviceModelSnapshot)`. |
| "Xác nhận" (CONFIRM) | `placement?.status === 'SELECTED'` | `POST /api/admin/placements/[id]/actions/confirm` | `{}` | `200 { placementId, status: 'CONFIRMED', replayed }` | Refresh row; `placement.status = 'CONFIRMED'`. |
| "Đánh dấu hiệu lực" (EFFECTIVE) | `placement?.status === 'CONFIRMED' && placement?.managementMode === 'CLIENT_MANAGED'` | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt, clientAcknowledgedByUserId, acknowledgementRef } }` | `200 { placementId, status: 'EFFECTIVE', replayed }` | Refresh row; `placement.status = 'EFFECTIVE'`; case auto-closes (`caseStatus = 'CLOSED'`); row disappears nếu `nextAction` derive về `NONE`. |
| "Đánh dấu thất bại" (FAIL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` | `POST /api/admin/placements/[id]/actions/fail` | `{}` | `200 { placementId, status: 'FAILED', replayed }` | Refresh row; `placement.status = 'FAILED'`. |
| "Hủy chọn" (CANCEL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` | `POST /api/admin/placements/[id]/actions/cancel` | `{}` | `200 { placementId, status: 'CANCELLED', replayed }` | Refresh row; `placement.status = 'CANCELLED'`. |

**Server authoritative**: mọi role gate, status gate, managementMode gate phải được F0 server enforce. Client gate chỉ là UX (ẩn/disabled), KHÔNG phải security boundary. Nếu client gate sai, server trả 400/403/409 và F1 render message thân thiện.

### 4.3 `nextAction` → UI controls mapping (planned)

| `nextAction` | F1 actions rendered (planned) | Note |
| --- | --- | --- |
| `OPEN_INTAKE` | (none — pre-placement) | E0 territory; F1 để trống. |
| `REQUEST_DOCS` | (none — pre-placement) | E0 territory. |
| `SCREEN_SUBMISSION` | (none — pre-placement) | E0 territory. |
| `SCHEDULE_SCREEN` | (none — pre-placement) | E0 territory. |
| `AWAITING_RESULT` | (none — pre-placement) | E0 territory. |
| `REVIEW_PLACEMENT` | CREATE (`placement === null`) | F1 chỉ render khi case status `READY_TO_PLACE` và row chưa có placement. CREATE yêu cầu chọn `jobOpeningId` — F1 render 1 step riêng (modal/dropdown). |
| `NONE` | CONFIRM / EFFECTIVE / FAIL / CANCEL (gated by placement status) | F1 render theo §4.2. EFFECTIVE bị ẩn khi `managementMode === 'HRP_MANAGED'`. |

### 4.4 Error / success mapping

| HTTP status / code | Source | F1 render |
| --- | --- | --- |
| `201` / `200` success | F0 route | Inline `<p role="status">`: "Đã {action}." + refetch row (refresh `nextAction` + `placement.status`). |
| `400 VALIDATION` | F0 strict body parse | Inline `<p role="alert">`: server `message`. Disable retry tự động. |
| `400 IDEMPOTENCY_REQUIRED` | F0 missing/invalid `Idempotency-Key` | Inline `<p role="alert">`: "Thiếu Idempotency-Key — không retry được." (lỗi client bug; surface cho dev). |
| `400 PLACEMENT_VALIDATION_ERROR` | F0 service (e.g. PlacementCase không tồn tại, FK chain broken, evidence thiếu field) | Inline `<p role="alert">`: server `message`. KHÔNG tự retry. |
| `401` (`NO_TOKEN` / `INVALID_TOKEN` / `USER_INACTIVE` / `USER_NOT_FOUND`) | F0 auth pipeline | Hard-redirect tới `/login` (Next.js convention). |
| `403 FORBIDDEN` | F0 role gate | Inline `<p role="alert">`: "Role {role} không có quyền placement command." |
| `404 PLACEMENT_NOT_FOUND` | F0 service | Inline `<p role="alert">`: "Placement không tồn tại — đã refresh danh sách." |
| `409 INVALID_STATE_TRANSITION` | F0 service (`canTransition` REJECT) | Inline `<p role="alert">`: "Trạng thái đã thay đổi — đã refresh danh sách." |
| `409 PLACEMENT_IDEMPOTENCY_CONFLICT` / `409 IDEMPOTENCY_CONFLICT` | F0 service / helper | Inline `<p role="alert">`: "Idempotency-Key đã dùng với payload khác." |
| `500 INTERNAL` | F0 unexpected | Inline `<p role="alert">`: "Đã có lỗi máy chủ — vui lòng thử lại." KHÔNG leak message. |

F1 KHÔNG log raw actorId, request body, evidence, `acknowledgementRef`, tokens,
`Idempotency-Key` hay PII ở client; structured log là server-side concern (F0 đã
lo qua `placement.route-helpers.ts`).

## 5. Outcome

### 5.1 User-visible outcome (post implementation — TIER 1B implementation round, KHÔNG PHẢI round này)

- Recruiter (`ADMIN` / `HR_MANAGER`) mở `/admin/recruiter-workbench`, thấy row với
  `nextAction = 'REVIEW_PLACEMENT'` và case chưa có placement → click **Chọn ứng viên**
  → modal chọn `jobOpeningId` (candidates từ `case.laborProfile` job openings) →
  confirm → POST `/api/admin/placements` với fresh `Idempotency-Key` UUID v4 →
  201 `{ placementId, status: 'SELECTED', ... }` → row refresh → `nextAction = 'NONE'`
  + `placement.status = 'SELECTED'` → CONFIRM / FAIL / CANCEL controls xuất hiện.
- Recruiter click **Xác nhận** → confirm dialog → POST
  `/api/admin/placements/[id]/actions/confirm` với same Idempotency-Key (nếu
  payload unchanged; new key nếu đổi) → 200 `{ status: 'CONFIRMED', replayed }` →
  row refresh → `placement.status = 'CONFIRMED'` → EFFECTIVE / FAIL / CANCEL.
- Recruiter click **Đánh dấu hiệu lực** (chỉ cho Client-managed) → evidence form
  (datetime-local `clientAcknowledgedAt` + `clientAcknowledgedByUserId` + `acknowledgementRef`)
  → POST `/api/admin/placements/[id]/actions/effective` với evidence → 200
  `{ status: 'EFFECTIVE', replayed }` → row refresh → case auto-closes
  (`caseStatus = 'CLOSED'`) → row biến mất (vì `nextAction` cho `CLOSED` = `NONE`
  và row sẽ được lọc theo `caseStatus` nếu user chọn filter).
- Recruiter click **Đánh dấu thất bại** hoặc **Hủy chọn** → confirm dialog → POST
  tương ứng → row refresh → terminal state.
- Recruiter (`HR_STAFF` hoặc role khác) thấy action controls bị ẩn (UI gate) và
  nếu hack vào network tab → server trả 403 (server authority).
- Idempotency: double-click không tạo duplicate; cùng key + same payload → server
  trả `replayed: true`; cùng key + different payload → 409. F1 render message
  tương ứng.
- 409 race: nếu user A confirm, user B confirm cùng lúc → một bên được 200,
  bên kia 409 `INVALID_STATE_TRANSITION` → F1 refresh row + show message
  "Trạng thái đã thay đổi — đã refresh danh sách."
- HRP-managed EFFECTIVE: F1 ẩn control hoàn toàn (UX). Nếu user gọi thủ công →
  400 `PLACEMENT_VALIDATION_ERROR` (taxonomy freeze C-07).

### 5.2 Non-goals (round này + implementation round)

- KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`,
  `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`.
- KHÔNG sửa F0 code: `placement.commands.ts`, `placement.route-helpers.ts`,
  `placement.service.ts`, `placement.lifecycle.ts`, `placement.resolution.ts`,
  `placement.errors.ts`, 5 routes `app/api/admin/placements/**`.
- KHÔNG sửa E0 code: `recruiter-workbench.types.ts`,
  `recruiter-workbench.read-service.ts`, `app/api/admin/recruiter-workbench/route.ts`,
  `tests/db/recruiter-workbench.integration.test.ts`. (E0 additive read-model
  extension nếu T0 chọn Option A thuộc task riêng — T0 quyết theo §6.)
- KHÔNG sửa MP-3C legacy: `app/admin/applications/**`, `app/api/admin/applications/**`,
  `src/domains/applications/placement-ui.ts`, `placement-panel.tsx`.
- KHÔNG mở UI workbench shell ngoài E1.
- KHÔNG sửa sidebar/menu (NAV-01 task riêng).
- KHÔNG mở outbox/event producer (N-series task riêng).
- KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07).
- KHÔNG fork `placement.service.ts` hay lifecycle logic ở client.
- KHÔNG cài package mới (F1 ADOPT Tailwind + tokens + SlideOutDrawer + DataTable +
  zod + lucide-react + react-hook-form — tất cả đã có trong `package.json`).
- KHÔNG tự viết Prisma transaction ở client.
- KHÔNG gọi `placement.commands.ts` adapter từ client (chỉ qua HTTP route).
- KHÔNG tự tính lifecycle state machine ở client (DEC-F1-02: server authoritative).
- KHÔNG tạo error code mới.
- KHÔNG dùng seed-only rows làm production permission provisioning (C-02).
- KHÔNG gọi n8n, không outbox, không PII export.

## 6. Open Decisions (consolidated single table)

Tất cả Open Owner decisions được consolidate ở đây. T0 duyệt theo batch; F1 KHÔNG
gửi từng decision lẻ.

| # | Decision | Options | Default nếu T0 không respond | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- |
| `DEC-F1-01` | Read-model extension cho `placementId` / `placementStatus` / `managementMode` | A: Additive E0 field; B: Discovery lookup per case; C: UI gate only (no controls) | A | A | Trade-off tốt nhất: 1 round-trip vs N+1; data nhỏ (~3 fields × N rows); pure projection. B cần E0 mở API mới → vi phạm E0 freeze; C làm mất giá trị F1. |
| `DEC-F1-02` | Server authority cho status gate | A: Server enforce only (F1 không gate); B: Server enforce + F1 ẩn controls (UX); C: Server enforce + F1 disable + tooltip | B | B | C là UX tốt nhất nhưng cần copy rule `canTransition` → vi phạm DEC-F1-04 ("KHÔNG tự tính lifecycle"); B đủ. |
| `DEC-F1-03` | Idempotency-Key mint policy | A: Fresh key per deliberate click; B: Persist key across retries within same modal; C: Hybrid (fresh on payload change) | C | C | C khớp với pattern MP-3C (`idempotency-edit-mints-fresh-key` ở `admin/applications/page.tsx:352-354`). |
| `DEC-F1-04` | Lifecycle state derivation ở client | A: Import `canTransition`/`computeManagementMode` từ `placement.lifecycle.ts`; B: Server-derived only; C: Mixed (computeManagementMode only) | B | B | A làm client phụ thuộc pure helper của backend → fragile coupling. C vẫn fragile; B đảm bảo single source of truth. (F1 KHÔNG cần helper này vì `managementMode` đã được derive server-side nếu DEC-F1-01 = A.) |
| `DEC-F1-05` | Toast / banner | A: Inline `<p role="alert">` / `<p role="status">` (pattern hiện hữu); B: New shared `Toast` primitive; C: Adopt Radix Toast (cần install dep) | A | A | B + C đều thêm dependency hoặc task mới. A đã là pattern hiện hữu (`placement-panel.tsx:364-365`, `admin/applications/page.tsx:506-507`). |
| `DEC-F1-06` | Evidence form persistence giữa retries | A: Keep client state across retry with same key; B: Reset on each attempt with fresh key | A | A | Khớp với MP-3C; UX tốt hơn. B ép user nhập lại. |
| `DEC-F1-07` | T0 role trong pre-implementation review | A: T0 review full doc trước khi F1 mở implementation round; B: T0 review chỉ §6 + §7 trước; C: T0 ad-hoc per correction batch | A | A | A khớp với V2_FAST_FREEZE "stop for one T0 contract review". |
| `DEC-F1-08` | Nhánh forward-merge E1 trong implementation round | A: F1 rebase trên E1 sau khi E1 ACCEPTED; B: F1 chờ E1 merge main rồi branch mới; C: F1 dùng cherry-pick | B | B | B đơn giản nhất; A/C đều có conflict risk. |
| `DEC-F1-09` | E0 additive read-model field placement | A: `placement?: { id, status, managementMode? } \| null`; B: `placementId?` + `placementStatus?` (top-level); C: `placementSnapshot` | A | A | A nested nhất quán với DTO shape hiện hữu (`candidate`, `job`, `handler`, `lastInteraction` đều nested). |
| `DEC-F1-10` | Add drop-down jobOpeningId cho CREATE flow | A: Modal step (chọn 1 trong N job openings); B: Inline dropdown trong row; C: Dedicated `/admin/recruiter-workbench/[caseId]/placement/new` page | A | A | A khớp pattern MP-3C (placement sub-flow); B ép width; C thêm route → out of E1. |

**Status**: Tất cả 10 Open Decisions chưa được T0 chốt. Round planning này chờ
T0 review; không mở implementation round cho tới khi T0 chốt.

## 7. Decisions (CHOSEN trong round này — không cần T0)

| ID | Decision | Status |
| --- | --- | --- |
| `CHOSEN-01` | F1 chờ P1-E1 ACCEPTED trên main mới implement UI. Trong planning này, F1 document insertion points theo E0 DTO + E0 §4.4 + E0 `primaryActions` + UI primitives hiện hữu. F1 KHÔNG tự code UI shell. | `CHOSEN` |
| `CHOSEN-02` | F1 chỉ gọi 5 F0 HTTP routes (`/api/admin/placements/**`). KHÔNG gọi `placement.commands.ts` adapter trực tiếp. KHÔNG mở Prisma transaction ở client. | `CHOSEN` |
| `CHOSEN-03` | F1 chỉ wrap role gate qua UI (ẩn controls khi role ≠ ADMIN && ≠ HR_MANAGER). Server vẫn là authority. | `CHOSEN` |
| `CHOSEN-04` | F1 dùng `Idempotency-Key` UUID v4 canonical (Next.js 15 `crypto.randomUUID()`); mỗi deliberate click = fresh key; nếu payload edit (evidence form) trong cùng modal thì cũng mint fresh key (giống MP-3C `idempotency-edit-mints-fresh-key`). | `CHOSEN` |
| `CHOSEN-05` | F1 KHÔNG thêm dependency mới (no Radix, no MUI, no shadcn). ADOPT Tailwind + design tokens + `SlideOutDrawer` + `DataTable` + `EmptyState` + `lucide-react` + `zod` + `react-hook-form`. | `CHOSEN` |
| `CHOSEN-06` | F1 KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`. | `CHOSEN` |
| `CHOSEN-07` | F1 KHÔNG đụng F0 service / lifecycle / errors / route helper / 5 routes. | `CHOSEN` |
| `CHOSEN-08` | F1 KHÔNG đụng E0 types / read-service / route. Nếu cần read-model extension, đề xuất `DEC-F1-01` Option A thuộc task riêng (E0 v1.4+ chứ không phải F1). | `CHOSEN` |
| `CHOSEN-09` | F1 KHÔNG đụng MP-3C legacy (`placement-ui.ts`, `placement-panel.tsx`, `app/admin/applications/**`). Chỉ ADOPT pattern (controlled props, inline message, disabled-while-saving) chứ không reuse component. | `CHOSEN` |
| `CHOSEN-10` | F1 KHÔNG tự tính lifecycle state machine ở client. F1 chỉ hiển thị controls theo current status mà server đã trả (qua DTO extension nếu T0 chọn DEC-F1-01 Option A). | `CHOSEN` |
| `CHOSEN-11` | F1 KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07 + Plan §29). | `CHOSEN` |
| `CHOSEN-12` | F1 KHÔNG mở outbox/event producer, KHÔNG gọi n8n, KHÔNG PII export. | `CHOSEN` |
| `CHOSEN-13` | F1 KHÔNG sửa `docs/PLANNER_HANDOVER.md` (T0-owned). | `CHOSEN` |
| `CHOSEN-14` | F1 KHÔNG sửa NAV-01 sidebar/menu (task riêng). | `CHOSEN` |
| `CHOSEN-15` | Round này dừng ở `PROPOSED_ONLY` / `DRAFT`; KHÔNG mở PR, KHÔNG gọi T3, KHÔNG code. Chờ T0 contract review. | `CHOSEN` |

### 7.1 Build vs Adopt

`Build vs adopt = ADOPT` (toàn bộ stack hiện hữu).

| Reuse hiện hữu (ưu tiên 1) | Library/version/source | License | Wrapper boundary |
| --- | --- | --- | --- |
| 5 F0 routes | Repo internal | Repo (Apache-2.0 inferred) | F1 chỉ `fetch(...)` qua HTTP. |
| `RecruiterWorkbenchRow` DTO (E0) | Repo internal | Repo | F1 consume readonly. |
| `RecruiterWorkbenchListResponse` + `ServerDerivedNextAction` | Repo internal | Repo | F1 dùng để gate UI controls. |
| `placement.lifecycle.ts` (pure state machine) | Repo internal | Repo | F1 KHÔNG gọi trực tiếp; nếu cần (RARE) thì copy helper small vào F1 namespace. |
| `computeManagementMode` (pure helper) | Repo internal | Repo | F1 KHÔNG gọi; server derive. |
| `maskPhone` / `maskCccd` | `src/shared/privacy/mask.ts` | Repo internal | F1 KHÔNG gọi; DTO đã mask. |
| `DataTable` + URL state | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` | Repo internal | F1 ADOPT. |
| `SlideOutDrawer` | `src/shared/ui/sheet/slide-out-drawer.tsx` | Repo internal | F1 ADOPT cho Placement Action drawer. |
| `EmptyState` | `src/shared/ui/data-display/empty-state.tsx` | Repo internal | F1 ADOPT. |
| `lucide-react` icons | `lucide-react@^0.468.0` | MIT | F1 ADOPT cho action affordances. |
| `zod` cho preflight validation | `zod@^3.24.1` | MIT | F1 ADOPT. |
| `react-hook-form` cho evidence form | `react-hook-form@^7.54.2` | MIT | F1 ADOPT (optional). |
| `crypto.randomUUID()` | Next.js 15 + browser native | MIT | F1 ADOPT cho Idempotency-Key. |
| Inline alert/status pattern | Pattern hiện hữu (`placement-panel.tsx:364-365`) | Repo internal | F1 ADOPT. |

| Adopt (ưu tiên 2) | Ghi chú |
| --- | --- |
| None. | Toàn bộ capability đã có trong repo. F1 không thêm dependency mới. |

| Đề xuất mới (ưu tiên 3) | Ghi chú |
| --- | --- |
| None. | Nếu E0 additive read-model extension (DEC-F1-01 Option A) được T0 duyệt, thuộc E0 task riêng — KHÔNG thuộc F1 in-scope. |

**Kết luận**: `ADOPT` cho toàn bộ stack. F1 không fork helper, không cài
package mới, không tự viết placement lifecycle.

### 7.2 Build vs Automate

`Build vs automate = N/A`.

Lý do:

- F1 là **admin UI** (mutation authority vẫn là HRP backend qua F0 routes), KHÔNG
  phải connector/scheduler/notification worker.
- F1 KHÔNG tạo workflow lặp lại (recurring) hay multi-system automation.
- F1 KHÔNG mở outbox/event producer (thuộc N-series task riêng; F1 chỉ render
  inline alert/status pattern).
- n8n boundary: theo `docs/N8N_AUTOMATION_BOUNDARY.md` §4 — n8n KHÔNG nắm
  placement transition authority; F1 không gọi n8n.

Nếu N-series mở sau này và cần subscribe `PlacementTransitionCommitted` event,
sẽ mở task riêng với `BUILD_VS_AUTOMATE = ORCHESTRATE` + boundary contract.

## 8. Evidence

Chỉ liệt kê evidence Tier 1 cần để Tier 1 implement.

| ID | Evidence | Why it matters |
| --- | --- | --- |
| `EV-01` | `src/domains/talent/placement.service.ts:103/454/458/468/472` | 5 named commands đã ACCEPTED; F1 chỉ wrap. |
| `EV-02` | `src/domains/talent/placement.errors.ts:14-60` | Error taxonomy freeze; F1 dùng `code` để map message. |
| `EV-03` | `src/domains/talent/placement.lifecycle.ts:23-33` (`computeManagementMode`) + `:51-88` (`canTransition`) | Pure state machine; F1 KHÔNG fork. |
| `EV-04` | `src/domains/talent/placement.commands.ts:87-93` (`PLACEMENT_COMMAND_ROUTES`) + `app/api/admin/placements/**` | 5 HTTP routes đã ship; F1 fetch qua đây. |
| `EV-05` | `app/api/admin/placements/route.ts:34-90` + `[id]/actions/effective/route.ts:34-98` | Body shape: `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` cho create; `{ evidence: { clientAcknowledgedAt, clientAcknowledgedByUserId, acknowledgementRef } }` cho effective; `{}` cho confirm/fail/cancel. |
| `EV-06` | `src/domains/talent/placement.route-helpers.ts:60` (`ALLOWED_PLACEMENT_ROLES`) + `:130-367` (`runPlacementCommand`) | Pipeline canonical; F1 chỉ disable khi role ≠ ADMIN && ≠ HR_MANAGER. |
| `EV-07` | `src/shared/integrity/idempotency/**` (`withIdempotency`) + `placement.route-helpers.ts:247-277` (key check) | UUID v4 required; F1 mints raw UUID v4. |
| `EV-08` | `src/domains/talent/recruiter-workbench.types.ts:151-188` (`RecruiterWorkbenchRow`) | E0 DTO đã freeze; F1 KHÔNG đụng nhưng cần extension (R-F1-01). |
| `EV-09` | `src/domains/talent/recruiter-workbench.read-service.ts:673-691` (`placements` include) + `:725-813` (DTO assembly) | E0 include `placements[0]` rồi nhưng KHÔNG chiếu `placementId` / `placementStatus` / `serviceModelSnapshot` lên DTO. R-F1-01. |
| `EV-10` | `src/domains/talent/recruiter-workbench.read-service.ts:282-322` (`deriveNextAction` decision table) | 7-value closed enum; F1 dùng để gate controls. |
| `EV-11` | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` + `data-display/empty-state.tsx` + `sheet/slide-out-drawer.tsx` | UI primitives hiện hữu; F1 ADOPT. |
| `EV-12` | `package.json` (`lucide-react@^0.468.0`, `zod@^3.24.1`, `react-hook-form@^7.54.2`) | Deps đã có; F1 không cài mới. |
| `EV-13` | `app/admin/applications/page.tsx:289-401` (MP-3C fetch + Idempotency-Key wiring + panel error/success + refetch after action) | Canonical reference cho F1 fetch pattern. |
| `EV-14` | `src/domains/applications/placement-panel.tsx:78-112` (`ActionBar` controlled component) + `:364-365` (inline alert/status pattern) | Pattern reference cho F1 controls. |
| `EV-15` | `src/domains/applications/placement-ui.ts:182-186` (`newIdempotencyKey`) | UUID v4 helper pattern; F1 copy với prefix `p1f1-` ở log. |
| `EV-16` | `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` v1.5 `ACCEPTED` | F0 contract authoritative; F1 chỉ consume. |
| `EV-17` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` v1.5 `ACCEPTED` | E0 contract authoritative; F1 chỉ consume. |
| `EV-18` | `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md` v1.1 | Capability matrix toàn diện cho P1-F; F1 tham chiếu. |
| `EV-19` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §23-§30 | Roadmap authoritative; §29 = P1-F. |
| `EV-20` | `docs/N8N_AUTOMATION_BOUNDARY.md` §2, §4 | n8n KHÔNG nắm placement authority; F1 không gọi n8n. |
| `EV-21` | `origin/codex/t1a-p1e1-recruiter-workbench-ui` @ `b81f5b9440` (candidate branch) — `.ai-pipeline`, `docs`, `mockup`, `scratch`; KHÔNG có UI shell | E1 chưa ACCEPTED; F1 chờ. |

## 9. Required gates (cho implementation round tương lai)

- `pwsh .ai-pipeline/scripts/verify-encoding.ps1` (UTF-8 no-BOM trên changed surface).
- `pwsh .ai-pipeline/scripts/verify-task.ps1`.
- `git diff --check` (LF-only).
- `npm run typecheck`.
- `npm run lint`.
- `npm run test:unit` (cover F1 component unit tests + F1 component integration tests với mock fetch).
- `npm run test:integration` (cover F1 end-to-end qua synthetic DB; cover idempotency replay; cover 409 race).
- `git status --porcelain` chỉ chứa in-scope roots (§10).
- `git diff --cached --stat` = 0 hit cho forbidden paths (§10).

## 10. Scope

### 10.1 In-scope roots (planned, post-E1 implementation round)

- `app/admin/recruiter-workbench/**` (E1-owned shell + F1 action controls).
- `src/domains/talent/recruiter-workbench.placement-actions.tsx` (planned — F1
  wrapper components, controlled props only).
- `src/domains/talent/recruiter-workbench.placement-actions.test.ts` (planned —
  unit tests cho pure logic).
- `src/domains/talent/recruiter-workbench.placement-actions.states.ts` (planned —
  pure state helper nếu cần: `availableActionsForRow`, `formatErrorMessage`).
- `src/domains/talent/recruiter-workbench.placement-actions.fetch.ts` (planned —
  fetch helper wrap 5 F0 routes + Idempotency-Key mint).
- TASK + HANDOFF + AUDIT cho `hrp-p1-f1-placement-action-ui`.

### 10.2 Forbidden paths

- `docs/PLANNER_HANDOVER.md` (T0-owned).
- `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**` (A0-frozen).
- `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**` (A1-frozen).
- `docs/tasks/hrp-p1-b-public-apply/**` (B-accepted; F1 không đụng).
- `docs/tasks/hrp-p1-c-*/**`, `docs/tasks/hrp-p1-d-*/**` (C/D-accepted; F1 không đụng).
- `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**` (E0-accepted; F1 không đụng).
- `docs/tasks/hrp-p1-f0-placement-command-api/**` (F0-accepted; F1 không đụng).
- `src/domains/talent/placement.service.ts` (production-ready).
- `src/domains/talent/placement.commands.ts` (F0 adapter).
- `src/domains/talent/placement.route-helpers.ts` (F0 helper).
- `src/domains/talent/placement.lifecycle.ts` (pure state machine).
- `src/domains/talent/placement.resolution.ts` (FK chain resolver).
- `src/domains/talent/placement.errors.ts` (error taxonomy freeze).
- `src/domains/talent/placement-case.service.ts` (N1 writer).
- `src/domains/talent/recruiter-workbench.types.ts` (E0 freeze).
- `src/domains/talent/recruiter-workbench.read-service.ts` (E0 freeze).
- `app/api/admin/recruiter-workbench/route.ts` (E0 freeze).
- `app/api/admin/placements/**` (F0 freeze).
- `src/shared/integrity/idempotency/**` (KHÔNG fork helper).
- `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `auth-context.ts`,
  `rls-context.ts` (KHÔNG sửa — F1 chỉ consume qua route).
- `src/shared/auth/permission-catalog.ts` (C-02 — F1 không đụng).
- `prisma/seed.mjs` (C-02 — F1 không đụng).
- `prisma/schema.prisma` (KHÔNG schema change trong F1).
- `prisma/migrations/**` (KHÔNG migration mới trong F1).
- `package.json`, `package-lock.json` (KHÔNG cài package mới).
- `next.config.*`, `tsconfig.json` (KHÔNG config change).
- `.github/workflows/ci.yml` (KHÔNG CI change).
- `app/admin/applications/**`, `app/api/admin/applications/**` (MP-3C territory).
- `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` (MP-3C territory).
- `app/admin/labor-profiles/**`, `src/domains/job-board/public.service.ts`,
  `app/(jobs)/viec-lam/**` (A0/A1 territory).
- `vitest*.config.ts` (KHÔNG registry edit; F1 unit test dùng config hiện hữu).
- `tests/db/recruiter-workbench.integration.test.ts` (E0 integration; F1 không fork).
- `tests/db/placement-lifecycle-integration.test.ts` (N3 integration; F1 không fork).
- `tests/db/p1f0-placement-command-api.integration.test.ts` (F0 integration; F1 không fork).

## 11. Revision Log

| Round | Date | Author | Note |
| --- | --- | --- | --- |
| 1 | 2026-09-26 | T1B | Initial v1.0 reconciliation + capability matrix + 5 residual gaps + 10 open Owner decisions. Status `PROPOSED_ONLY` / `DRAFT`. Correction budget `1` — zero consumed. |
