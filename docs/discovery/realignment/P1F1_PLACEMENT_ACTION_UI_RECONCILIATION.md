# P1-F1 — Recruiter Workbench Placement Actions Reconciliation

**Pipeline V2 — Discovery / Realignment — Spec v1.1**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Spec version | `v1.1` |
| Status | `BLOCKED` (planning only; chờ P1-E1 `ACCEPTED` + merged main để mở implementation round) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Contract gate | `ACCEPTED` (T0 verdict `APPROVED_WITH_REQUIRED_DOC_CORRECTION`) |
| Decision state | `CLOSED` (10 Open Decisions từ v1.0 đã được T0 lock trong correction batch v1.1) |
| Open Owner decisions | `0` |
| Correction budget (this doc) | `1`, consumed (this correction batch v1.1 — see §12 Revision Log) |
| Baseline (origin/main @ planning pin) | `4970f47d481c185f655242e3e91480e4117241dd` |
| Frozen HEAD | `4970f47d481c185f655242e3e91480e4117241dd` |
| Semantic implementation HEAD | `4970f47d481c185f655242e3e91480e4117241dd` (F1 chưa code; HEAD chính là baseline) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1f1-placement-actions-planning` |
| Branch | `codex/t1b-p1f1-placement-actions-planning` |
| Predecessor SHA (this branch) | `5f23c1cb7b468536f868e7d1f059cc7d04cb6b86` (v1.0 docs-only commit, preserved) |
| Owner of this doc | T1B (independent) |
| P1-A0 / P1-A1 / P1-B state | `ACCEPTED` trên main |
| P1-C / P1-D state | `ACCEPTED` trên main (DEC-01..DEC-14 đã freeze) |
| P1-E0 state | `ACCEPTED` trên main (`RecruiterWorkbenchRow` DTO đã freeze; F1 additive-edit trong cùng slice theo C-03) |
| P1-E1 state | `PROPOSED_ONLY`; candidate branch `origin/codex/t1a-p1e1-recruiter-workbench-ui` chưa merge main; **F1 KHÔNG** được tự implement UI shell ngoài bám sát E0 contract |
| P1-F0 state | `ACCEPTED` trên main (5 named placement commands đã ship, PR #58 merged) |
| P1-F1 (round này) | Planning-only v1.1 docs-only correction batch; **chờ P1-E1 ACCEPTED + merged main mới mở materialization → implementation round** |
| Next gate | `WAIT_P1_E1_ACCEPTED` |

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
- **P1-E0** `RecruiterWorkbenchRow` — `ACCEPTED` trên main; F1 additive-edit
  trong cùng slice (C-03) để thêm `placement?: { id, status, jobOpeningId,
  managementMode } | null` + `placementOptions?: Array<{ jobOpeningId,
  sourceCandidateSubmissionId, title, projectName, companyName }> | null`.
- **P1-E1** Simple Recruiter Workbench UI — `PROPOSED_ONLY`; F1 tham chiếu
  candidate branch cho insertion points, KHÔNG tự code UI shell.
- **P1-F0** Placement Command API + adapter — `ACCEPTED` trên main; F1 chỉ
  consume 5 routes.
- **P1-F1 (theo sau, post E1 ACCEPTED)** — task này. Round v1.1 lock contract
  + 0 Open Decisions.
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
| **P1-F1** | **Recruiter UI actions cho placement commands từ Workbench** | **Task này; planning only v1.1** |
| P1-E0 | Recruiter Workbench read-model (`RecruiterWorkbenchRow` DTO đã freeze) | `ACCEPTED` trên main; F1 additive-edit trong cùng slice (C-03) |
| P1-E1 | Recruiter Workbench UI shell | `PROPOSED_ONLY`; candidate branch HEAD |

Các tên cấm trong F1:

- "placement panel MP-3C" → legacy V6 assignment-placement; F1 KHÔNG dùng.
- "Worker/Episode/Assignment placement" → MP-3C territory; F1 KHÔNG dùng.
- "atomic workforce bridge" → N4 territory; F1 KHÔNG đụng.
- "side-effect mutation helper" → F1 chỉ wrap 5 F0 routes, không tự viết Prisma.
- "SWR / optimistic mutation" → cấm trong F1 (LOCK-08 + CHOSEN-04).
- "placement.timeline / audit-history UI" → cấm trong F1 (LOCK-11).

## 2. Capability Matrix

Phân loại:

- `IMPLEMENTED` — code đã ở `origin/main`, F1 chỉ dùng.
- `PARTIAL` — code một phần ở main, cần bổ sung (ghi rõ phần thiếu).
- `MISSING` — chưa có trên main, cần task mới (ghi rõ task nào) — trong F1 v1.1
  các `MISSING` E0 projection mở rộng sẽ được additive-edit trong cùng F1
  slice (C-03), KHÔNG thuộc task riêng.
- `REFERENCE_ONLY` — tài liệu/decision log, không phải implementation.
- `OUT_OF_SCOPE` — thuộc task khác (F1, N-series, N4, v.v.).

### 2.1 Schema (`prisma/schema.prisma`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `PlacementCaseStatus` enum | `IMPLEMENTED` | `prisma/schema.prisma:1516` | F1 read-only. |
| `PlacementStatus` enum (`SELECTED` / `CONFIRMED` / `EFFECTIVE` / `FAILED` / `CANCELLED`) | `IMPLEMENTED` | `prisma/schema.prisma:1541` | DEC-03/05 freeze. |
| `ServiceModel` enum | `IMPLEMENTED` | `prisma/schema.prisma:1532` | DEC-01; `managementMode` derive server-side qua pure helper `computeManagementMode` (read-only). |
| `PlacementCase` table | `IMPLEMENTED` | `prisma/schema.prisma:1547+` | F1 read; F0 write qua command. |
| `Placement` table + `placements_active_unique` partial unique | `IMPLEMENTED` | `prisma/migrations/20260914212136_n3_service_model_placement` | Race-safety đã enforce ở DB. F1 không bypass. |
| `placement_case_labor_profile_id_active_unique` partial unique | `IMPLEMENTED` | `prisma/migrations/20260912140411_n1_placement_case_foundation` | Một active case per LaborProfile. |
| `evidence` fields trên `Placement` (client-managed EFFECTIVE persistence) | `IMPLEMENTED` | `prisma/schema.prisma` (Placement model) | F1 chỉ gửi JSON; service persist. |
| `PlacementCase.submissions` chain → `CandidateSubmission.slot` → `StaffingOrderSlot.jobOpening` | `IMPLEMENTED` | `prisma/schema.prisma` relations | F1 derive `placementOptions` từ chain này trong cùng read-service slice (LOCK-03, C-04). |
| Additive `placement?: { id, status, jobOpeningId \| null, managementMode } \| null` trên `RecruiterWorkbenchRow` DTO | `MISSING` | E0 chưa chiếu `placementId` / `placementStatus` / `managementMode` lên row | **Residual R-F1-01**: F1 additive-edit trong cùng slice theo C-03; KHÔNG mở E0 task riêng. |
| Additive `placementOptions?: Array<{ jobOpeningId, sourceCandidateSubmissionId, title, projectName, companyName }> \| null` trên `RecruiterWorkbenchRow` DTO | `MISSING` | E0 chưa derive từ chain submission | **F1 additive-edit trong cùng slice theo C-04**; deterministic, dedupe, cross-case isolated. |

### 2.2 Backend services

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| 5 named placement commands | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:103/454/458/468/472` | F1 chỉ wrap qua HTTP route. |
| Lifecycle state machine (pure) | `IMPLEMENTED` | `src/domains/talent/placement.lifecycle.ts:51-88` | Server authority; F1 KHÔNG import hoặc copy (LOCK-04). |
| Error taxonomy (`PlacementError` + 4 subclass) | `IMPLEMENTED` | `src/domains/talent/placement.errors.ts:14-60` | F1 dùng `code` để map message thân thiện (§4.3 trong TASK). |
| Adapter + route helper | `IMPLEMENTED` | `src/domains/talent/placement.commands.ts` + `placement.route-helpers.ts` | F1 chỉ consume 5 routes, không gọi adapter trực tiếp. |
| 5 admin HTTP routes | `IMPLEMENTED` | `app/api/admin/placements/**` | F1 chỉ `fetch(...)` qua đây. |
| Idempotency-Key wrap (consumer-side) | `IMPLEMENTED` | `src/shared/integrity/idempotency/**` (`withIdempotency`) | F1 client-side mints raw UUID v4 + scoped qua per-tab `sessionStorage` (LOCK-13, KHÔNG fork helper). |
| `withDbContext` RLS GUC | `IMPLEMENTED` | `src/shared/auth/with-db-context.ts` | F1 KHÔNG gọi DB; route tự wrap. |
| Auth + role gate (`ADMIN` / `HR_MANAGER`) | `IMPLEMENTED` | `placement.route-helpers.ts:60` (`ALLOWED_PLACEMENT_ROLES`) | F1 chỉ disable action khi role ≠ ADMIN && ≠ HR_MANAGER. |
| E0 read service + masking | `IMPLEMENTED` | `src/domains/talent/recruiter-workbench.read-service.ts` | F1 additive-edit trong cùng slice (C-03): project `placement?` + derive `placementOptions?`. |
| Server-derived `nextAction` (7-value enum) | `IMPLEMENTED` | `recruiter-workbench.read-service.ts:282-322` + `recruiter-workbench.types.ts:29-37` | F1 dùng để gate action visibility (closed enum). |

### 2.3 Read service (`recruiter-workbench.read-service.ts`) — additive F1 edit

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `placements: { take: 1, orderBy: selectedAt DESC, id DESC, select: { id, selectedAt, jobOpening: { posting, staffingOrder.project } } }` | `IMPLEMENTED` | `recruiter-workbench.read-service.ts:673-691` | E0 đã include `Placement.id` + `Placement.selectedAt` cho job-context projection — DB row có sẵn. |
| `extractJobContextFromPlacement` pure helper | `IMPLEMENTED` | `recruiter-workbench.read-service.ts:371-405` | Projection pure; F1 không fork. |
| Masking (`maskPhone`, `maskCccd`) cho PII | `IMPLEMENTED` | `src/shared/privacy/mask.ts` | F1 không tự mask; DTO đã mask sẵn. |
| URL-synced filter/sort/page primitive | `IMPLEMENTED` | `src/shared/ui/data-table/use-table-url-state.ts:58` | F1 dùng cho action filter/sort. |
| `RecruiterWorkbenchRow.placement?: { id, status, jobOpeningId \| null, managementMode } \| null` projection | `MISSING → TO_ADD` | F1 additive-edit (LOCK-02) | Project từ `c.placements[0]`, thêm `status: true, serviceModelSnapshot: true, jobOpeningId: true`; derive `managementMode` qua `computeManagementMode`. Cover test in `.read-service.test.ts`. |
| `RecruiterWorkbenchRow.placementOptions?: Array<...> \| null` derivation | `MISSING → TO_ADD` | F1 additive-edit (LOCK-03) | Derive chain `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening`. Dedupe + deterministic order + filter only submissions of current `PlacementCase`. Cover zero / one / multiple / dedupe / cross-case isolation in `.read-service.test.ts` + integration test. |
| E0 route handler `app/api/admin/recruiter-workbench/route.ts` | `IMPLEMENTED` | Repo internal | **Giữ nguyên** nếu response tự serialize DTO mở rộng. Chỉ sửa nếu thực sự cần (LOCK-15); khi đó vượt F1 scope. |

### 2.4 UI primitives

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| Custom Tailwind + design-tokens primitives | `IMPLEMENTED` | `src/shared/ui/data-table/data-table.tsx`, `data-display/empty-state.tsx`, `sheet/slide-out-drawer.tsx`, `data-table/use-table-url-state.ts` | F1 ADOPT. |
| `lucide-react` icons | `IMPLEMENTED` | `package.json` (`lucide-react@^0.468.0`) | F1 ADOPT cho action affordances. |
| `SlideOutDrawer` (right-side drawer cho record detail) | `IMPLEMENTED` | `src/shared/ui/sheet/slide-out-drawer.tsx` | F1 ADOPT cho Placement Action drawer. |
| `DataTable` + URL state + filters | `IMPLEMENTED` | `src/shared/ui/data-table/data-table.tsx` | F1 ADOPT cho workbench table. |
| `EmptyState` | `IMPLEMENTED` | `src/shared/ui/data-display/empty-state.tsx` | F1 ADOPT cho empty rows. |
| `zod` cho payload validation (client-side preflight) | `IMPLEMENTED` | `package.json` (`zod@^3.24.1`) | F1 ADOPT; F0 strict body parse ở server là authority. |
| `react-hook-form` cho evidence form | `IMPLEMENTED` | `package.json` (`react-hook-form@^7.54.2`) | F1 ADOPT (optional; có thể dùng controlled state như MP-3C placement-panel). |
| `next/navigation` `useRouter().refresh()` | `IMPLEMENTED` | Next.js 15 native | F1 ADOPT cho refresh server component sau success (LOCK-08). |
| `sessionStorage` (per-tab, scoped key) | `IMPLEMENTED` | Browser native | F1 ADOPT cho `Idempotency-Key` scope theo `placement/case id + command + canonical payload hash` (LOCK-13). |
| shadcn / Radix Dialog / MUI / antd | `MISSING` | repo không cài các package này; UI tự build bằng Tailwind + tokens | F1 KHÔNG thêm dependency mới. ADOPT slide-out-drawer làm panel primitive. |
| `newIdempotencyKey()` UUID v4 helper | `IMPLEMENTED` | `src/domains/applications/placement-ui.ts:182-186` (`mp3c-<uuid>`) | F1 ADOPT pattern (raw UUID v4 qua `crypto.randomUUID()`, KHÔNG prefix `p1f1-`); scope qua per-tab `sessionStorage`. |
| Generic toast / banner primitive | `MISSING` | repo không có shared `Toast` / `Alert` component | F1 dùng inline `<p role="alert">` / `<p role="status">` (LOCK-09), pattern hiện hữu (`placement-panel.tsx:364-365`, `admin/applications/page.tsx:506-507`). |
| SWR / optimistic mutation package | `MISSING` | repo không cài | **Cấm** trong F1 (LOCK-08, CHOSEN-04). F1 dùng `useRouter().refresh()` cho server component đọc lại canonical DTO. |

### 2.5 Admin pages & patterns

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| MP-3C placement-panel (presentation-only components) | `IMPLEMENTED` | `src/domains/applications/placement-panel.tsx` | F1 **KHÔNG** reuse cho N3 placement; chỉ dùng pattern: controlled props, `pending` disabled, success/error inline message, evidence form. |
| MP-3C admin applications page wiring (idempotency key, panel error/success, refetch after action) | `IMPLEMENTED` | `app/admin/applications/page.tsx` | F1 dùng làm canonical reference cho fetch/Idempotency-Key wiring (F1 thay bằng `sessionStorage` scoping). |
| `actionsXxx()` route pattern | `IMPLEMENTED` | `app/api/admin/applications/[id]/actions/{convert,screen,...}/route.ts` | F1 **KHÔNG** tạo route mới; chỉ gọi F0 routes hiện hữu. |
| `recruiter-workbench` UI shell (E1 branch) | `MISSING` | E1 branch chỉ chứa `.ai-pipeline`, `docs`, `mockup` — KHÔNG có `app/admin/recruiter-workbench/**` | F1 chờ E1 ACCEPTED + merged main mới có shell để gắn action controls. **Residual R-F1-02**. |
| E1 `RecruiterWorkbenchTable` integration point (planned, post-E1) | `MISSING → E1_OWNED` | E1 owned; F1 chờ E1 merge | F1 extend bằng một action-cell / client island hẹp (LOCK-14, C-06). |

## 3. Locked decisions v1.1 (T0 verdict closed all 10 open decisions)

Tất cả 10 Open Owner decisions từ v1.0 đã được T0 lock trong correction batch
v1.1. KHÔNG có Open Owner decisions còn lại (`Open Owner decisions = 0`).
T0 KHÔNG mở lại batch này nếu dependency + source assumptions vẫn đúng.

Tóm tắt frozen (chi tiết xem `docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md`
§3.3 `LOCK-01..LOCK-15` + §3.4 `CHOSEN-01..CHOSEN-15`):

### 3.1 Locked read-model shape (LOCK-02)

`RecruiterWorkbenchRow` projection thêm (F1 additive-edit trong cùng slice,
C-03):

```ts
placement: {
  id: string;
  status: PlacementStatus;
  jobOpeningId: string | null;
  managementMode: 'HRP_MANAGED' | 'CLIENT_MANAGED';
} | null;
```

- Project từ `c.placements[0]` (đã include sẵn, chỉ thêm `status: true,
  serviceModelSnapshot: true, jobOpeningId: true` vào `select`).
- `managementMode` derive server-side qua pure helper `computeManagementMode`.
- `null` khi `c.placements[0]` là `undefined` hoặc `status` chưa hợp lệ.

### 3.2 Locked `placementOptions` shape (LOCK-03 + C-04)

`RecruiterWorkbenchRow` projection thêm (F1 additive-edit trong cùng slice):

```ts
placementOptions: Array<{
  jobOpeningId: string;
  sourceCandidateSubmissionId: string;
  title: string;
  projectName: string | null;
  companyName: string | null;
}> | null;
```

- Source chain: `PlacementCase.submissions → CandidateSubmission.slot →
  StaffingOrderSlot.jobOpening`.
- Filter: chỉ `CandidateSubmission` thực sự thuộc `PlacementCase` hiện tại.
- `jobOpening` non-null.
- Dedupe theo `jobOpeningId`; nếu nhiều submission cùng opening → chọn
  `sourceCandidateSubmissionId` deterministic: `createdAt DESC, id DESC`.
- Deterministic order: sort `(projectName, companyName, title, jobOpeningId)`.
- Cross-case isolation: KHÔNG bao giờ expose JobOpening của PlacementCase khác.
- Zero option → disable CREATE + safe reason.
- One option → preselect + require explicit confirm.
- Multiple → user chọn trong drawer.

### 3.3 Locked idempotency semantics (LOCK-13 + C-05)

- Per-tab `sessionStorage`.
- Scope: `placement/case id + command + canonical payload hash`.
- Reuse cùng UUID v4: double-click, same unchanged payload, network uncertainty,
  5xx deliberate retry (sau explicit user click).
- Mint UUID v4 mới: payload edit, chọn JobOpening khác.
- Clear key: terminal success (200/201).
- KHÔNG auto retry: 4xx validation/auth rejection.
- KHÔNG log: key, evidence, PII.
- Server nhận raw UUID v4 (F0 strict); KHÔNG prefix `p1f1-` ở header.

### 3.4 Locked control gating (LOCK-04..12 + C-02)

- Server là lifecycle authority; UI chỉ ẩn/hiện theo snapshot server trả về.
- HRP_MANAGED + CONFIRMED: KHÔNG render **Đánh dấu hiệu lực**; stale request
  → server 400 `PLACEMENT_VALIDATION_ERROR` → F1 render safe inline alert.
- CREATE / SELECTED: right-side drawer (SlideOutDrawer), single-row only.
- Pending state: per placement row/action; disable toàn bộ mutation controls
  của cùng row trong khi `pending=true`.
- Refresh: Next `useRouter().refresh()` (KHÔNG SWR, KHÔNG optimistic).
- Error / success: inline `<p role="alert">` / `<p role="status">` (KHÔNG Toast).
- Evidence UI: drawer form, RFC 3339 validation, giữ form state khi retry cùng
  payload.
- Audit display: KHÔNG tạo `placement.timeline` ở server và KHÔNG tạo
  client-side audit log. Canonical persisted state + evidence ở F0 là
  authority.
- Branch sequencing: F1 chờ P1-E1 ACCEPTED + merged main, sau đó T1B mở
  docs-only materialization round (rebase/baseline theo updated main) →
  `Status = READY_FOR_EXECUTION` / `Next gate = TIER1_IMPLEMENTATION_FREEZE`.
- UI integration boundary: F1 extend E1 `RecruiterWorkbenchTable` bằng một
  action-cell / client island hẹp; KHÔNG biến cả server page thành client
  loader.

### 3.5 Locked E0 additive scope (LOCK-01 + C-03)

F1 additive-edit các E0 source path trong cùng slice (KHÔNG mở E0 task riêng):

- `src/domains/talent/recruiter-workbench.types.ts`
- `src/domains/talent/recruiter-workbench.read-service.ts`
- `src/domains/talent/recruiter-workbench.read-service.test.ts`
- `tests/db/recruiter-workbench.integration.test.ts` HOẶC F1 integration test
  (`tests/db/p1f1-placement-action-ui.integration.test.ts`), miễn không tạo
  duplicate contradictory coverage.
- `app/admin/recruiter-workbench/**` sau khi E1 merged main.

E0 route handler `app/api/admin/recruiter-workbench/route.ts` giữ nguyên nếu
response tự serialize DTO mở rộng; LOCK-15 nêu rõ chỉ sửa khi serialize
không tự xử lý được.

## 4. Residual gaps cần giải quyết trước khi implementation

### R-F1-01 — E0 DTO chưa expose `placementId` / `placementStatus` / `managementMode`

**v1.1 resolution**: F1 additive-edit trong cùng slice (LOCK-02 + C-03).
Shape frozen tại §3.1.

DB include `Placement` đã có sẵn ở `recruiter-workbench.read-service.ts:673-691`
(take 1, orderBy selectedAt DESC + id DESC); chỉ thiếu projection.
F1 mở rộng `select` thêm `status`, `serviceModelSnapshot`, `jobOpeningId` và
project lên DTO. `managementMode` derive qua pure helper `computeManagementMode`.

### R-F1-02 — E1 UI shell chưa tồn tại

**Resolution (frozen)**: F1 chờ P1-E1 ACCEPTED + merged main mới implement UI.
Trong planning, F1 document **insertion points** dựa trên:

1. E0 DTO shape (đã freeze + additive projection từ §3.1).
2. E0 `placementOptions` (đã freeze ở §3.2).
3. E0 7-value `nextAction` enum (đã freeze).
4. UI primitives hiện hữu (`DataTable`, `SlideOutDrawer`, `EmptyState`).

Sau khi E1 merge, F1 extend `RecruiterWorkbenchTable` bằng một action-cell /
client island hẹp (LOCK-14, C-06).

### R-F1-03 — Generic toast / banner primitive chưa có

**v1.1 resolution (LOCK-09)**: F1 dùng inline `<p role="alert">` /
`<p role="status">` pattern hiện hữu (`placement-panel.tsx:364-365`,
`admin/applications/page.tsx:506-507`). KHÔNG thêm dependency mới
(shadcn/Radix/MUI đều thiếu). KHÔNG thêm Toast primitive.

### R-F1-04 — Idempotency key namespace + scoping (frozen)

F1 client-side mints raw UUID v4 qua `crypto.randomUUID()`; scope qua per-tab
`sessionStorage` theo `placement/case id + command + canonical payload hash`.
Server F0 strict UUID v4 thuần (`placement.route-helpers.ts:247-277`).
**KHÔNG prefix `p1f1-` ở header**, **KHÔNG log key ở client**. Reuse / mint /
clear theo LOCK-13.

### R-F1-05 — Body shape & validation source-of-truth (frozen)

F0 strict body parsing ở route là authority (`app/api/admin/placements/route.ts:40-90`).
F1 chỉ dùng `zod` cho preflight (RFC 3339 cho timestamp, ISO-8601 helpers).
Mọi 400 từ server phải render verbatim theo §4.3 mapping trong TASK; 500 render
generic + KHÔNG leak `message` / `details`.

### R-F1-06 — Idempotency cho `placement.create` + `placementOptions` (frozen)

F1 expose CREATE action khi `placement === null` && `placementOptions.length > 0`.
Draw flow yêu cầu user chọn `jobOpeningId` từ `placementOptions` (đã serve-derived);
F1 KHÔNG selector global, KHÔNG để browser tự đề xuất arbitrary JobOpening.
Browser gửi đúng pair `jobOpeningId + sourceCandidateSubmissionId` từ option
user chọn.

## 5. Capability Mapping: F1 UI surface ↔ F0 routes ↔ E0 DTO

### 5.1 UI components F1 sẽ chèn vào (planned, post-E1)

| Insertion point | Component (planned) | Source primitive | Depends on |
| --- | --- | --- | --- |
| Row actions column (action-cell / client island) | `<PlacementActionCell row={row} role={role} options={row.placementOptions} onAction={...} />` | Custom (Tailwind); narrow client island (LOCK-14) | E0 DTO có `placement?` + `placementOptions?` (LOCK-02/03) |
| Detail / action drawer (right-side) | `<PlacementActionDrawer open={open} placement={row.placement} options={row.placementOptions} onClose={...} onChanged={() => router.refresh()} />` | `SlideOutDrawer` (ADOPT) | LOCK-02/03 |
| Confirmation modal (Confirm / Fail / Cancel) | `<ConfirmPlacementActionDialog kind="confirm\|fail\|cancel" placementId={...} onConfirm={...} onCancel={...} pending={...} />` | Custom (Tailwind, no Radix) | None |
| EFFECTIVE evidence form | `<EffectiveEvidenceForm value={...} onChange={...} pending={...} onSubmit={...} />` (drawer form; giữ form state khi retry cùng Idempotency-Key) | Custom (Tailwind) + zod preflight (RFC 3339) | LOCK-10 |
| Evidence-state guard cho retry | SessionStorage scope `placementId + 'placement.effective' + canonical payload hash` reuse key | sessionStorage (ADOPT) | LOCK-13 |
| Inline error / success banner | `<p role="alert">` / `<p role="status">` (LOCK-09) | Inline pattern hiện hữu | None |

### 5.2 Action ↔ F0 route ↔ body ↔ effect mapping (frozen)

| Action (UI label) | UI gating (locked) | F0 route | Body | 200/201 response | Effect on UI |
| --- | --- | --- | --- | --- | --- |
| "Chọn ứng viên" (CREATE) | `nextAction === 'REVIEW_PLACEMENT'` && `placement === null` && `placementOptions.length > 0` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements` | `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId }` | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | `router.refresh()`; new `placement.id`, `placement.status = 'SELECTED'`, `placement.managementMode`, `placement.jobOpeningId`. |
| "Xác nhận" (CONFIRM) | `placement?.status === 'SELECTED'` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/confirm` | `{}` | `200 { placementId, status: 'CONFIRMED', replayed }` | `router.refresh()`; `placement.status = 'CONFIRMED'`. |
| "Đánh dấu hiệu lực" (EFFECTIVE) | `placement?.status === 'CONFIRMED' && placement?.managementMode === 'CLIENT_MANAGED'` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt, clientAcknowledgedByUserId, acknowledgementRef } }` | `200 { placementId, status: 'EFFECTIVE', replayed }` | `router.refresh()`; `placement.status = 'EFFECTIVE'`; case auto-closes. |
| "Đánh dấu thất bại" (FAIL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/fail` | `{}` | `200 { placementId, status: 'FAILED', replayed }` | `router.refresh()`; `placement.status = 'FAILED'`. |
| "Hủy chọn" (CANCEL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/cancel` | `{}` | `200 { placementId, status: 'CANCELLED', replayed }` | `router.refresh()`; `placement.status = 'CANCELLED'`. |

**Server authoritative**: mọi role gate, status gate, managementMode gate phải
được F0 server enforce. Client gate chỉ là UX (ẩn/disabled), KHÔNG phải security
boundary. Nếu client gate sai, server trả 400/403/409 và F1 render message
thân thiện.

### 5.3 `nextAction` → UI controls mapping (planned)

| `nextAction` | F1 actions rendered (planned) | Note |
| --- | --- | --- |
| `OPEN_INTAKE` | (none — pre-placement) | E0 territory; F1 để trống. |
| `REQUEST_DOCS` | (none — pre-placement) | E0 territory. |
| `SCREEN_SUBMISSION` | (none — pre-placement) | E0 territory. |
| `SCHEDULE_SCREEN` | (none — pre-placement) | E0 territory. |
| `AWAITING_RESULT` | (none — pre-placement) | E0 territory. |
| `REVIEW_PLACEMENT` | CREATE (`placement === null` && `placementOptions.length > 0`) | F1 render drawer step chọn `jobOpeningId`. |
| `NONE` | CONFIRM / EFFECTIVE / FAIL / CANCEL (gated by placement status) | F1 render theo §5.2. EFFECTIVE bị ẩn khi `managementMode === 'HRP_MANAGED'`. |

### 5.4 Error / success mapping (frozen — xem TASK §4.3 cho bảng mapping đầy đủ)

| HTTP status / code | Source | F1 render |
| --- | --- | --- |
| `201` / `200` success | F0 route | Inline `<p role="status">`: "Đã {action}." + `router.refresh()` + clear sessionStorage key. |
| `400 VALIDATION` | F0 strict body parse | Inline `<p role="alert">`: server `message`. KHÔNG tự retry. |
| `400 IDEMPOTENCY_REQUIRED` | F0 missing/invalid `Idempotency-Key` | Inline `<p role="alert">`: "Thiếu Idempotency-Key — không retry được." |
| `400 PLACEMENT_VALIDATION_ERROR` | F0 service | Inline `<p role="alert">`: server `message`; strip `acknowledgementRef` / `clientAcknowledgedByUserId` nếu lẫn trong `details`. |
| `401` (`NO_TOKEN` / `INVALID_TOKEN` / `USER_INACTIVE` / `USER_NOT_FOUND`) | F0 auth pipeline | Hard-redirect tới `/login` (Next.js convention). |
| `403 FORBIDDEN` | F0 role gate | Inline `<p role="alert">`: "Role {role} không có quyền placement command." |
| `404 PLACEMENT_NOT_FOUND` | F0 service | Inline `<p role="alert">`: "Placement không tồn tại — đã refresh danh sách." + `router.refresh()`. |
| `409 INVALID_STATE_TRANSITION` | F0 service (`canTransition` REJECT) | Inline `<p role="alert">`: "Trạng thái đã thay đổi — đã refresh danh sách." + `router.refresh()`. |
| `409 PLACEMENT_IDEMPOTENCY_CONFLICT` / `409 IDEMPOTENCY_CONFLICT` | F0 service / helper | Inline `<p role="alert">`: "Idempotency-Key đã dùng với payload khác." |
| `500 INTERNAL` | F0 unexpected | Inline `<p role="alert">`: "Đã có lỗi máy chủ — vui lòng thử lại." KHÔNG leak `message` / `details`. Button "Thử lại" mint fresh `Idempotency-Key` (deliberate). |

F1 KHÔNG log raw actorId, request body, evidence, `acknowledgementRef`, tokens,
`Idempotency-Key` (raw hay `p1f1-` prefix đều cấm) hay PII ở client; structured
log là server-side concern (F0 đã lo qua `placement.route-helpers.ts`).

## 6. Outcome

### 6.1 User-visible outcome (post implementation — TIER 1B implementation round, KHÔNG PHẢI round này)

- Recruiter (`ADMIN` / `HR_MANAGER`) mở `/admin/recruiter-workbench`, thấy row với
  `nextAction = 'REVIEW_PLACEMENT'` và case chưa có placement → action-cell có
  control **Chọn ứng viên** → right-side drawer mở (server-derived
  `placementOptions`, unique theo `jobOpeningId`, deterministic order) → user
  chọn 1 option (preselect nếu chỉ một; phải explicit confirm trước khi
  submit) → submit → `POST /api/admin/placements` với
  `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId }` và
  `Idempotency-Key` UUID v4 mới (từ `sessionStorage` scope `placementCaseId +
  'placement.create' + canonical payload hash`) → 201
  `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId,
  projectId, replayed }` → `router.refresh()` server component → row refresh
  với `placement = { id, status: 'SELECTED', jobOpeningId, managementMode }` →
  CONFIRM / FAIL / CANCEL controls xuất hiện (EFFECTIVE chỉ khi
  `managementMode === 'CLIENT_MANAGED'`).
- Recruiter click **Xác nhận** → confirm dialog → `POST
  /api/admin/placements/[id]/actions/confirm` với cùng `Idempotency-Key` (nếu
  payload unchanged / network uncertainty / 5xx deliberate retry → reuse key;
  nếu payload edit → mint key mới) → 200 `{ status: 'CONFIRMED', replayed }`
  → `router.refresh()`.
- Recruiter click **Đánh dấu hiệu lực** (chỉ cho Client-managed, drawer form
  yêu cầu `clientAcknowledgedAt` RFC 3339 + `clientAcknowledgedByUserId` +
  `acknowledgementRef`, giữ form state nếu cùng `Idempotency-Key`) → `POST
  /api/admin/placements/[id]/actions/effective` → 200
  `{ status: 'EFFECTIVE', replayed }` → case auto-closes (`caseStatus =
  'CLOSED'`) → row biến mất (vì filter).
- Recruiter click **Đánh dấu thất bại** hoặc **Hủy chọn** → confirm dialog →
  POST tương ứng → `router.refresh()` → terminal state.
- HRP_MANAGED + CONFIRMED: control **Đánh dấu hiệu lực** bị ẩn hoàn toàn.
  Stale request → 400 `PLACEMENT_VALIDATION_ERROR` → inline `<p role="alert">`.
- Recruiter (`HR_STAFF` hoặc role khác) thấy action controls bị ẩn (UI gate) và
  nếu hack vào network tab → server trả 403 (server authority).
- Idempotency per LOCK-13: double-click cùng scope → reuse UUID v4 → `replayed:
  true`; payload edit → mint UUID v4 mới; success terminal → clear stored key.
- 409 race: nếu user A confirm, user B confirm cùng lúc → một bên 200,
  bên kia 409 `INVALID_STATE_TRANSITION` → `router.refresh()` + message.
- F1 KHÔNG cài SWR / Toast / optimistic-update package. Mọi mutation thành công
  → `router.refresh()` để server component đọc lại canonical DTO.

### 6.2 Non-goals (round này + implementation round)

- KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`,
  `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`.
- KHÔNG sửa F0 code: `placement.commands.ts`, `placement.route-helpers.ts`,
  `placement.service.ts`, `placement.lifecycle.ts`, `placement.resolution.ts`,
  `placement.errors.ts`, 5 routes `app/api/admin/placements/**`.
- KHÔNG sửa E0 task docs (`docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**`).
- KHÔNG sửa E0 route handler `app/api/admin/recruiter-workbench/route.ts`
  trừ khi response không serialize tự động (LOCK-15).
- KHÔNG sửa MP-3C legacy: `app/admin/applications/**`, `app/api/admin/applications/**`,
  `src/domains/applications/placement-ui.ts`, `placement-panel.tsx`.
- KHÔNG mở UI workbench shell ngoài E1.
- KHÔNG sửa sidebar/menu (NAV-01 task riêng).
- KHÔNG mở outbox/event producer (N-series task riêng).
- KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE.
- KHÔNG fork `placement.service.ts` / `placement.lifecycle.ts` / integrity
  idempotency helper ở client.
- KHÔNG cài package mới (không SWR / Toast / optimistic).
- KHÔNG tự viết Prisma transaction ở client.
- KHÔNG gọi `placement.commands.ts` adapter từ client (chỉ qua HTTP route).
- KHÔNG tự tính lifecycle state machine ở client.
- KHÔNG tạo error code mới.
- KHÔNG dùng seed-only rows làm production permission provisioning.
- KHÔNG gọi n8n, không outbox, không PII export.
- KHÔNG tạo `placement.timeline` server-side hoặc client-side audit log.
- KHÔNG mở PR, KHÔNG gọi T3 trong round này.

## 7. Build vs Adopt (frozen) & Build vs Automate (N/A)

### 7.1 Build vs Adopt

`Build vs adopt = ADOPT` (toàn bộ stack hiện hữu).

| Reuse hiện hữu (ưu tiên 1) | Library/version/source | License | Wrapper boundary |
| --- | --- | --- | --- |
| 5 F0 routes | Repo internal | Repo | F1 chỉ `fetch(...)` qua HTTP. |
| E0 DTO (`RecruiterWorkbenchRow`) | Repo internal | Repo | F1 additive-edit trong cùng slice (C-03) để thêm `placement?` + `placementOptions?`. |
| `RecruiterWorkbenchListResponse` + `ServerDerivedNextAction` | Repo internal | Repo | F1 dùng để gate UI controls. |
| `placement.lifecycle.ts` (pure state machine) | Repo internal | Repo | F1 KHÔNG gọi; server authority. |
| `computeManagementMode` (pure helper) | Repo internal | Repo | F1 KHÔNG gọi; server derive. |
| `maskPhone` / `maskCccd` | `src/shared/privacy/mask.ts` | Repo internal | F1 KHÔNG gọi; DTO đã mask. |
| `DataTable` + URL state | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` | Repo internal | F1 ADOPT. |
| `SlideOutDrawer` | `src/shared/ui/sheet/slide-out-drawer.tsx` | Repo internal | F1 ADOPT cho Placement Action drawer. |
| `EmptyState` | `src/shared/ui/data-display/empty-state.tsx` | Repo internal | F1 ADOPT. |
| `lucide-react` icons | `lucide-react@^0.468.0` | MIT | F1 ADOPT cho action affordances. |
| `zod` cho preflight validation | `zod@^3.24.1` | MIT | F1 ADOPT. |
| `react-hook-form` cho evidence form | `react-hook-form@^7.54.2` | MIT | F1 ADOPT (optional). |
| `crypto.randomUUID()` | Next.js 15 + browser native | MIT | F1 ADOPT cho Idempotency-Key (raw UUID v4, server F0 strict). |
| `next/navigation` `useRouter().refresh()` | Next.js 15 | MIT | F1 ADOPT cho refresh server component sau success. KHÔNG dùng SWR; KHÔNG optimistic. |
| Inline alert/status pattern | Pattern hiện hữu (`placement-panel.tsx:364-365`, `admin/applications/page.tsx:506-507`) | Repo internal | F1 ADOPT. |
| `sessionStorage` | Browser native | MIT | F1 ADOPT cho Idempotency-Key cache (per-tab, scoped theo placement/case id + command + canonical payload hash). |

| Adopt (ưu tiên 2) | Ghi chú |
| --- | --- |
| None. | Toàn bộ capability đã có trong repo. F1 không thêm dependency mới. |

| Đề xuất mới (ưu tiên 3) | Ghi chú |
| --- | --- |
| None trong F1. | Add E0 read-model extension (`placement?`, `placementOptions?`) đã được T0 chấp thuận trong cùng slice (C-03 + C-04). KHÔNG tạo E0 task riêng. |

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
|---|---|---|
| `EV-01` | `src/domains/talent/placement.service.ts:103/454/458/468/472` | 5 named commands đã ACCEPTED; F1 chỉ wrap. |
| `EV-02` | `src/domains/talent/placement.errors.ts:14-60` | Error taxonomy freeze; F1 dùng `code` để map message. |
| `EV-03` | `src/domains/talent/placement.lifecycle.ts:23-33` (`computeManagementMode`) + `:51-88` (`canTransition`) | Pure state machine; F1 KHÔNG fork (server authority). |
| `EV-04` | `src/domains/talent/placement.commands.ts:87-93` (`PLACEMENT_COMMAND_ROUTES`) + `app/api/admin/placements/**` | 5 HTTP routes đã ship; F1 fetch qua đây. |
| `EV-05` | `app/api/admin/placements/route.ts:34-90` + `[id]/actions/effective/route.ts:34-98` | Body shape: `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId }` cho create; `{ evidence: { clientAcknowledgedAt, clientAcknowledgedByUserId, acknowledgementRef } }` cho effective; `{}` cho confirm/fail/cancel. |
| `EV-06` | `src/domains/talent/placement.route-helpers.ts:60` (`ALLOWED_PLACEMENT_ROLES`) + `:130-367` (`runPlacementCommand`) + `:247-277` (UUID v4 strict) | Pipeline canonical; F1 chỉ disable khi role ≠ ADMIN && ≠ HR_MANAGER; F1 gửi raw UUID v4. |
| `EV-07` | `src/shared/integrity/idempotency/**` (`withIdempotency`) | F1 chỉ consumer-side (mints raw UUID v4 ở client); KHÔNG fork. |
| `EV-08` | `src/domains/talent/recruiter-workbench.types.ts:151-188` (`RecruiterWorkbenchRow`) | E0 DTO đã freeze (v1.x); F1 additive-edit trong cùng slice (C-03) để thêm `placement?` + `placementOptions?`. |
| `EV-09` | `src/domains/talent/recruiter-workbench.read-service.ts:673-691` (`placements` include) + `:725-813` (DTO assembly) | E0 include `placements[0]` rồi nhưng chưa chiếu `id` / `status` / `serviceModelSnapshot` / `jobOpeningId` lên DTO. F1 additive-edit projection theo C-03. |
| `EV-10` | `src/domains/talent/recruiter-workbench.read-service.ts:282-322` (`deriveNextAction` decision table) | 7-value closed enum; F1 dùng để gate controls. |
| `EV-11` | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` + `data-display/empty-state.tsx` + `sheet/slide-out-drawer.tsx` | UI primitives hiện hữu; F1 ADOPT. |
| `EV-12` | `package.json` (`lucide-react@^0.468.0`, `zod@^3.24.1`, `react-hook-form@^7.54.2`) | Deps đã có; F1 không cài mới. |
| `EV-13` | `app/admin/applications/page.tsx:289-401` (MP-3C fetch + Idempotency-Key wiring + panel error/success + refetch after action) | Canonical reference cho F1 fetch pattern (F1 thay bằng `sessionStorage` scoping). |
| `EV-14` | `src/domains/applications/placement-panel.tsx:78-112` (`ActionBar` controlled component) + `:364-365` (inline alert/status pattern) | Pattern reference cho F1 controls. |
| `EV-15` | `src/domains/applications/placement-ui.ts:182-186` (`newIdempotencyKey`) | UUID v4 helper pattern; F1 ADOPT pattern (raw UUID v4 qua `crypto.randomUUID()`, scoped `sessionStorage`). |
| `EV-16` | `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` `ACCEPTED` §4.1.1 | F0 contract authoritative; F1 chỉ consume. |
| `EV-17` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` `ACCEPTED` §4 | E0 contract authoritative; F1 chỉ consume + additive-edit trong cùng slice (C-03). |
| `EV-18` | `docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` `v1.1` (cùng branch) | V2 contract authoritative; LOCK-01..15 + CHOSEN-01..15; RQ → STEP → AC matrix. |
| `EV-19` | `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md` v1.1 | Capability matrix F0; F1 tham chiếu. |
| `EV-20` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §23-§30 | Roadmap authoritative; §29 = P1-F. |
| `EV-21` | `docs/N8N_AUTOMATION_BOUNDARY.md` §2, §4 | n8n KHÔNG nắm placement authority; F1 không gọi n8n. |
| `EV-22` | `origin/codex/t1a-p1e1-recruiter-workbench-ui` @ candidate HEAD | E1 candidate branch; F1 chờ `ACCEPTED` + merged main. |
| `EV-23` | `next/navigation` `useRouter().refresh()` (Next.js 15) | F1 dùng để refresh server component sau mỗi mutation thành công. |
| `EV-24` | E0 `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening` | F1 derive `placementOptions` từ chain này trong cùng read-service slice (LOCK-03 + C-04). |

## 9. Required gates (cho implementation round tương lai)

- `pwsh .ai-pipeline/scripts/verify-task.ps1`
- `node .ai-pipeline/scripts/verify-encoding.mjs` (UTF-8 no-BOM trên changed surface)
- `git diff --check` (LF-only)
- `git status --porcelain` chỉ chứa in-scope roots (§10).
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit` (cover F1 component unit tests + F1 component integration tests với mock fetch + sessionStorage stub).
- `npm run test:integration` (cover F1 end-to-end qua synthetic DB; cover idempotency replay + scope isolation; cover 409 race; cover placementOptions zero/one/multiple/dedupe/cross-case isolation).

## 10. Scope

### 10.1 In-scope roots (planned, post-E1 implementation round)

- `app/admin/recruiter-workbench/**` (E1-owned shell + F1 action-cell / client island, sau khi E1 merged main).
- `src/domains/talent/recruiter-workbench.types.ts` (additive: `placement?` + `placementOptions?` cho `RecruiterWorkbenchRow`).
- `src/domains/talent/recruiter-workbench.read-service.ts` (additive: project `placement` từ `c.placements[0]`; derive `placementOptions` từ submission chain).
- `src/domains/talent/recruiter-workbench.read-service.test.ts` (additive: cover `placement` projection + `placementOptions` zero/one/multiple/dedupe/deterministic/cross-case isolation).
- `tests/db/recruiter-workbench.integration.test.ts` (additive DB integration coverage cho `placement` projection + `placementOptions` derivation; không tạo contradictory coverage).
- Hoặc `tests/db/p1f1-placement-action-ui.integration.test.ts` riêng cho F1 end-to-end flow, miễn không duplicate với test trên.
- `src/domains/talent/recruiter-workbench.placement-actions.tsx` (controlled action-cell / client island).
- `src/domains/talent/recruiter-workbench.placement-actions.states.ts` (pure state helper: `availableActionsForRow`, `formatErrorMessage`, `hashCanonicalPayload`).
- `src/domains/talent/recruiter-workbench.placement-actions.fetch.ts` (fetch helper wrap 5 F0 routes + `sessionStorage`-scoped `Idempotency-Key`).
- `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` (unit tests, react-dom/server).
- `src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` (unit tests cho fetch helper + `sessionStorage` scoping + `crypto.randomUUID()` stub).
- `tests/db/p1f1-placement-action-ui.integration.test.ts` (DB integration — registration-only add to `vitest.integration-files.ts`).
- `vitest.integration-files.ts` (registration-only: thêm đúng MỘT entry; KHÔNG đổi shape/config).
- TASK + HANDOFF + AUDIT cho `hrp-p1-f1-placement-action-ui`.

### 10.2 Forbidden paths

- `docs/PLANNER_HANDOVER.md` (T0-owned).
- `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**` (A0-frozen).
- `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**` (A1-frozen).
- `docs/tasks/hrp-p1-b-public-apply/**` (B-accepted; F1 không đụng).
- `docs/tasks/hrp-p1-c-*/**`, `docs/tasks/hrp-p1-d-*/**` (C/D-accepted; F1 không đụng).
- `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**` (E0 task docs; F1 không đụng. E0 source files additive-edit được trong cùng slice theo §10.1).
- `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` (E1-PROPOSED_ONLY; F1 chờ E1 ACCEPTED + merged main).
- `docs/tasks/hrp-p1-f0-placement-command-api/**` (F0-accepted; F1 không đụng).
- `src/domains/talent/placement.service.ts` (production-ready).
- `src/domains/talent/placement.commands.ts` (F0 adapter).
- `src/domains/talent/placement.route-helpers.ts` (F0 helper).
- `src/domains/talent/placement.lifecycle.ts` (pure state machine; server authority).
- `src/domains/talent/placement.resolution.ts` (FK chain resolver).
- `src/domains/talent/placement.errors.ts` (error taxonomy freeze).
- `src/domains/talent/placement-case.service.ts` (N1 writer).
- `app/api/admin/recruiter-workbench/route.ts` (giữ nguyên shape v1.x nếu DTO extension tự serialize, theo LOCK-15; chỉ sửa khi cần thiết).
- `app/api/admin/placements/**` (F0 freeze).
- `src/shared/integrity/idempotency/**` (KHÔNG fork helper).
- `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `auth-context.ts`,
  `rls-context.ts` (KHÔNG sửa — F1 chỉ consume qua route).
- `src/shared/auth/permission-catalog.ts` (F1 không đụng).
- `prisma/seed.mjs` (F1 không đụng).
- `prisma/schema.prisma` (KHÔNG schema change trong F1 v1.1).
- `prisma/migrations/**` (KHÔNG migration mới).
- `package.json`, `package-lock.json` (KHÔNG cài package mới; **đặc biệt không SWR / Toast / optimistic-update**).
- `next.config.*`, `tsconfig.json` (KHÔNG config change).
- `.github/workflows/ci.yml` (KHÔNG CI change).
- `app/admin/applications/**`, `app/api/admin/applications/**` (MP-3C territory).
- `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` (MP-3C territory).
- `app/admin/labor-profiles/**`, `src/domains/job-board/public.service.ts`,
  `app/(jobs)/viec-lam/**` (A0/A1 territory).
- `vitest*.config.ts` (KHÔNG registry edit; F1 unit test dùng config hiện hữu; integration test registry edit ở `vitest.integration-files.ts`).
- `tests/db/placement-lifecycle-integration.test.ts` (N3 integration; F1 không fork).
- `tests/db/p1f0-placement-command-api.integration.test.ts` (F0 integration; F1 không fork).

## 11. Decision state (frozen)

- `Decision state = CLOSED` (`0` open decisions).
- T0 KHÔNG mở lại nếu dependency + source assumptions vẫn đúng.
- Tóm tắt frozen decisions xem §3 (`LOCK-01..LOCK-15` + `CHOSEN-01..CHOSEN-15`
  ở `TASK.md` §3.3 + §3.4).

## 12. Revision Log

| Round | Date | Author | Note |
| --- | --- | --- | --- |
| 1 | 2026-09-26 | T1B | Initial v1.0 reconciliation + capability matrix + 5 residual gaps + 10 open Owner decisions. Status `PROPOSED_ONLY` / `DRAFT`. Correction budget `1` — zero consumed. Commit: `5f23c1cb7b468536f868e7d1f059cc7d04cb6b86`. |
| 2 | 2026-09-27 | T1B | v1.1 docs-only correction batch per T0 verdict `APPROVED_WITH_REQUIRED_DOC_CORRECTION` (`5f23c1cb…`). Spec v1.1, Status `BLOCKED`, Contract gate `ACCEPTED`, Decision state `CLOSED`, Open Owner decisions `0`. C-01..C-07 absorbed: closed 10 Open Decisions vào §3 (`LOCK-01..LOCK-15`); absorbed E0 additive projection (`placement?` + `placementOptions?`) trong cùng slice (C-03); locked `placementOptions` server-derived từ `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening` với dedupe + deterministic order + cross-case isolation (C-04); corrected idempotency semantics to per-tab `sessionStorage` scoped theo `placement/case id + command + canonical payload hash`, KHÔNG prefix `p1f1-` (C-05); committed UI integration boundary as narrow action-cell / client island + `useRouter().refresh()` (C-06); locked controls theo C-07 (spec v1.1, ACCEPTED, CLOSED, 0 open, BLOCKED, WAIT_P1_E1_ACCEPTED, materialization round qua rebase/baseline theo updated main). Correction budget `1`, fully consumed. Predecessor SHA `5f23c1c` preserved; no amend/reset/rebase/force-push. Next gate: `WAIT_P1_E1_ACCEPTED`. |
