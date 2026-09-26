# TASK — `hrp-p1-f1-placement-action-ui`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f1-placement-action-ui` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `UI` (thin client wrapper around accepted F0 routes) |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | UI mở 5 mutation commands từ production-ready backend; rủi ro chính: stale status hiển thị gây double-action, leak raw error, idempotency key bị ghi đè khi retry, role bypass nếu UI gate không khớp server gate, và double-click tạo duplicate placement. LIGHT audit đảm bảo tất cả 5 commands đều có UI test cover create/idempotent retry/409 race/role hide/server-error render. |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` (planning only — chờ T0 contract review) |
| Contract gate | `DRAFT` |
| Decision state | `DRAFT` |
| Open Owner decisions | `10` (xem §10 Open Decisions + §3 Decisions) |
| Test environment | `NOT_READY` (chờ P1-E1 ACCEPTED + T0 chốt §10 + chờ synthetic DB gate) |
| Correction budget | `1` |
| Baseline | `4970f47d481c185f655242e3e91480e4117241dd` |
| Predecessor docs | `docs/discovery/realignment/P1F1_PLACEMENT_ACTION_UI_RECONCILIATION.md` `v1.0` (cùng branch) |
| Predecessor SHA | none (new branch off `origin/main`) |
| Planner | `Tier 1B` |
| Depends on | (1) P1-F0 `ACCEPTED` ✅; (2) P1-E0 `ACCEPTED` ✅; (3) P1-E1 `PROPOSED_ONLY` — **blocker**, F1 chờ E1 ACCEPTED mới code; (4) T0 chốt 10 Open Decisions trong §10; (5) nếu `DEC-F1-01` = Option A, chờ E0 additive read-model extension merged. |
| Frozen delivery | `NO` (planning only) |
| Scope lần này | Implementation: thin UI wrapper components (`recruiter-workbench.placement-actions.tsx` + states + fetch helpers) gắn vào E1 shell; controlled props; only consume 5 F0 HTTP routes; unit tests + integration tests với synthetic DB; KHÔNG sửa F0/E0/MP-3C/N3 code; KHÔNG schema/migration/package change. |
| In-scope roots | `app/admin/recruiter-workbench/**` (E1-owned shell + F1 action controls); `src/domains/talent/recruiter-workbench.placement-actions.tsx` (controlled components); `src/domains/talent/recruiter-workbench.placement-actions.states.ts` (pure state helper); `src/domains/talent/recruiter-workbench.placement-actions.fetch.ts` (fetch helper wrap 5 F0 routes + Idempotency-Key mint); `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` (unit tests, react-dom/server); `src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` (unit tests cho fetch helper với mock fetch); `tests/db/p1f1-placement-action-ui.integration.test.ts` (DB integration — registration-only add to `vitest.integration-files.ts`); `vitest.integration-files.ts` (registration-only: thêm đúng MỘT entry; KHÔNG đổi shape/config); `docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` + `HANDOFF.md` + `AUDIT.md` + `evidence/**`. |
| Forbidden paths | `docs/PLANNER_HANDOVER.md` (T0-owned); `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**`; `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**`; `docs/tasks/hrp-p1-b-public-apply/**`; `docs/tasks/hrp-p1-c-*/**`; `docs/tasks/hrp-p1-d-*/**`; `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**`; `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` (E1-PROPOSED_ONLY; F1 chờ E1 ACCEPTED); `docs/tasks/hrp-p1-f0-placement-command-api/**` (F0-accepted; F1 KHÔNG đụng); `src/domains/talent/placement.service.ts` (production-ready); `src/domains/talent/placement.commands.ts` (F0 adapter); `src/domains/talent/placement.route-helpers.ts` (F0 helper); `src/domains/talent/placement.lifecycle.ts` (pure state machine); `src/domains/talent/placement.resolution.ts`; `src/domains/talent/placement.errors.ts`; `src/domains/talent/placement-case.service.ts`; `src/domains/talent/recruiter-workbench.types.ts` (E0 freeze); `src/domains/talent/recruiter-workbench.read-service.ts` (E0 freeze); `app/api/admin/recruiter-workbench/route.ts` (E0 freeze); `app/api/admin/placements/**` (F0 freeze); `src/shared/integrity/idempotency/**` (KHÔNG fork helper); `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `auth-context.ts`, `rls-context.ts` (KHÔNG sửa — F1 chỉ consume qua route); `src/shared/auth/permission-catalog.ts` (C-02); `prisma/seed.mjs` (C-02); `prisma/schema.prisma` (KHÔNG schema change trong F1); `prisma/migrations/**` (KHÔNG migration mới); `package.json`, `package-lock.json` (KHÔNG cài package mới); `next.config.*`, `tsconfig.json`; `.github/workflows/ci.yml`; `app/admin/applications/**`, `app/api/admin/applications/**` (MP-3C territory); `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` (MP-3C territory); `app/admin/labor-profiles/**`, `src/domains/job-board/public.service.ts`, `app/(jobs)/viec-lam/**`; `vitest.unit.config.ts`, `vitest.integration.config.ts` (registry-only edit ở `vitest.integration-files.ts`); `tests/db/recruiter-workbench.integration.test.ts` (E0 integration); `tests/db/placement-lifecycle-integration.test.ts` (N3 integration); `tests/db/p1f0-placement-command-api.integration.test.ts` (F0 integration). |
| Required gates | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` (UTF-8 no-BOM trên changed surface); `pwsh .ai-pipeline/scripts/verify-task.ps1`; `git diff --check` (LF-only); `git status --porcelain`; `npm run typecheck`; `npm run lint`; `npm run test:unit` (cover F1 unit tests với mock fetch); `npm run test:integration` (cover `tests/db/p1f1-placement-action-ui.integration.test.ts` — local thiếu `DATABASE_URL_TEST` phải `ENV_BLOCKED`, không fake PASS). |
| Current execution round | `1` (planning only; chờ T0 contract review) |
| Current audit round | `0` |
| Next gate | `WAIT_P1_E1_ACCEPTED_AND_T0_CONTRACT_APPROVAL` |

> Lane CRITICAL mặc định LIGHT. Risk acceptance (planning): T0 chấp nhận LIGHT
> audit cho thin UI wrapper consuming production-ready F0 commands; F1 KHÔNG
> tự tính lifecycle (DEC-F1-04), KHÔNG fork helper, KHÔNG cài package mới.
> Risk chính nằm ở stale UI status → double-action, leak raw error từ server,
> role bypass nếu UI gate không khớp server gate — tất cả đều cover bằng unit
> test (mock fetch cover success/400/403/409/500) + integration test (synthetic
> DB cover create replay/409 race/HRP-managed EFFECTIVE REJECT).

> Round này KHÔNG viết code. Chỉ chốt contract + open decisions. Sau khi T0
> chốt §10, mở implementation round mới với `Status = READY_FOR_EXECUTION` /
> `Contract gate = READY_TO_CODE` / `Decision state = CLOSED`.

## 1. Outcome

### 1.1 User-visible outcome (post implementation — TIER 1B implementation round, KHÔNG PHẢI round này)

- Recruiter (`ADMIN` / `HR_MANAGER`) mở `/admin/recruiter-workbench`, thấy row với
  `nextAction = 'REVIEW_PLACEMENT'` và case chưa có placement → click **Chọn ứng viên**
  → modal chọn `jobOpeningId` (candidates từ case's job openings) → confirm →
  POST `/api/admin/placements` với fresh `Idempotency-Key` UUID v4 → 201
  `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId,
  projectId, replayed }` → row refresh → `nextAction = 'NONE'` +
  `placement.status = 'SELECTED'` + `placement.managementMode =
  computeManagementMode(serviceModelSnapshot)` → CONFIRM / FAIL / CANCEL controls
  xuất hiện.
- Recruiter click **Xác nhận** → confirm dialog → POST
  `/api/admin/placements/[id]/actions/confirm` với same Idempotency-Key (nếu
  payload unchanged; new key nếu đổi) → 200 `{ status: 'CONFIRMED', replayed }`
  → row refresh → `placement.status = 'CONFIRMED'` → EFFECTIVE / FAIL / CANCEL
  controls xuất hiện (EFFECTIVE chỉ cho Client-managed).
- Recruiter click **Đánh dấu hiệu lực** (chỉ cho Client-managed) → evidence
  form (datetime-local `clientAcknowledgedAt` + `clientAcknowledgedByUserId` +
  `acknowledgementRef`) → POST
  `/api/admin/placements/[id]/actions/effective` với evidence → 200
  `{ status: 'EFFECTIVE', replayed }` → row refresh → case auto-closes
  (`caseStatus = 'CLOSED'`) → row biến mất nếu filter đang ở non-CLOSED view.
- Recruiter click **Đánh dấu thất bại** hoặc **Hủy chọn** → confirm dialog →
  POST tương ứng → row refresh → terminal state.
- Recruiter role khác (HR_STAFF, CTV, PUBLIC, ...) thấy action controls bị ẩn
  (UI gate) và nếu hack vào network tab → server trả 403 `FORBIDDEN` (server
  authority).
- Idempotency: double-click không tạo duplicate; cùng key + same payload →
  server trả `replayed: true`; cùng key + different payload → 409
  `IDEMPOTENCY_CONFLICT`. F1 render message tương ứng.
- 409 race: nếu user A confirm, user B confirm cùng lúc → một bên được 200,
  bên kia 409 `INVALID_STATE_TRANSITION` → F1 refresh row + show "Trạng thái đã
  thay đổi — đã refresh danh sách."
- HRP-managed EFFECTIVE: F1 ẩn control hoàn toàn (UX). Nếu user gọi thủ công
  → 400 `PLACEMENT_VALIDATION_ERROR` (taxonomy freeze C-07).
- 5xx / network blip: F1 KHÔNG tự retry với cùng payload (idempotency safety);
  F1 render inline alert "Đã có lỗi máy chủ — vui lòng thử lại." với button
  "Thử lại" mint fresh Idempotency-Key (deliberate retry, không auto).
- F1 KHÔNG cache placement mutation state ở client (single source of truth =
  server) — mọi success/error dẫn đến refetch row.

### 1.2 Non-goals (round này + implementation round)

- KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`,
  `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`.
- KHÔNG sửa F0 code: `placement.commands.ts`, `placement.route-helpers.ts`,
  `placement.service.ts`, `placement.lifecycle.ts`, `placement.resolution.ts`,
  `placement.errors.ts`, 5 routes `app/api/admin/placements/**`.
- KHÔNG sửa E0 code: `recruiter-workbench.types.ts`,
  `recruiter-workbench.read-service.ts`, `app/api/admin/recruiter-workbench/route.ts`,
  `tests/db/recruiter-workbench.integration.test.ts`. (E0 additive read-model
  extension nếu T0 chọt `DEC-F1-01` Option A thuộc task riêng.)
- KHÔNG sửa MP-3C legacy: `app/admin/applications/**`, `app/api/admin/applications/**`,
  `src/domains/applications/placement-ui.ts`, `placement-panel.tsx`. Chỉ ADOPT
  pattern (controlled props, inline message, disabled-while-saving) chứ
  KHÔNG reuse component.
- KHÔNG mở UI workbench shell ngoài E1.
- KHÔNG sửa sidebar/menu (NAV-01 task riêng).
- KHÔNG mở outbox/event producer (N-series task riêng).
- KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07).
- KHÔNG fork `placement.service.ts` hay lifecycle logic ở client.
- KHÔNG cài package mới (F1 ADOPT Tailwind + tokens + SlideOutDrawer + DataTable
  + EmptyState + lucide-react + zod + react-hook-form — tất cả đã có trong
  `package.json`).
- KHÔNG tự viết Prisma transaction ở client.
- KHÔNG gọi `placement.commands.ts` adapter từ client (chỉ qua HTTP route).
- KHÔNG tự tính lifecycle state machine ở client.
- KHÔNG tạo error code mới.
- KHÔNG dùng seed-only rows làm production permission provisioning (C-02).
- KHÔNG gọi n8n, không outbox, không PII export.
- KHÔNG mở PR trong round này.
- KHÔNG gọi T3 trong round này.

## 2. Evidence

Chỉ liệt kê evidence Tier 1 cần để Tier 1 implement.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/talent/placement.service.ts:103/454/458/468/472` | 5 named commands đã ACCEPTED; F1 chỉ wrap qua HTTP. |
| `EV-02` | `src/domains/talent/placement.errors.ts:14-60` (`PlacementError` + 4 subclass) | Error taxonomy freeze; F1 dùng `code` để map message. |
| `EV-03` | `src/domains/talent/placement.lifecycle.ts:23-33` (`computeManagementMode`) + `:51-88` (`canTransition`) | Pure state machine; F1 KHÔNG fork. |
| `EV-04` | `src/domains/talent/placement.commands.ts:87-93` (`PLACEMENT_COMMAND_ROUTES`) + `app/api/admin/placements/**` (5 routes) | 5 HTTP routes đã ship; F1 fetch qua đây. |
| `EV-05` | `app/api/admin/placements/route.ts:34-90` (create body) + `[id]/actions/effective/route.ts:34-98` (effective evidence body) + `[id]/actions/{confirm,fail,cancel}/route.ts` (empty body) | Body shapes F1 phải gửi. |
| `EV-06` | `src/domains/talent/placement.route-helpers.ts:60` (`ALLOWED_PLACEMENT_ROLES`) + `:130-367` (`runPlacementCommand`) | Pipeline canonical; F1 chỉ disable khi role ≠ ADMIN && ≠ HR_MANAGER. |
| `EV-07` | `src/shared/integrity/idempotency/**` (`withIdempotency`) + `placement.route-helpers.ts:247-277` (UUID v4 check) | UUID v4 required; F1 mints raw UUID v4. |
| `EV-08` | `src/domains/talent/recruiter-workbench.types.ts:151-188` (`RecruiterWorkbenchRow`) + `:189-194` (`RecruiterWorkbenchListResponse`) | E0 DTO đã freeze; F1 consume readonly. |
| `EV-09` | `src/domains/talent/recruiter-workbench.read-service.ts:673-691` (`placements` include) + `:725-813` (DTO assembly) | E0 include `placements[0]` rồi nhưng KHÔNG chiếu `placementId` / `placementStatus` / `serviceModelSnapshot` lên DTO. Quyết định `DEC-F1-01`. |
| `EV-10` | `src/domains/talent/recruiter-workbench.read-service.ts:282-322` (`deriveNextAction` decision table) + `recruiter-workbench.types.ts:29-37` (7-value enum) | F1 dùng `nextAction` + `placement?.status` (nếu `DEC-F1-01` = A) để gate UI controls. |
| `EV-11` | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` + `data-display/empty-state.tsx` + `sheet/slide-out-drawer.tsx` | UI primitives hiện hữu; F1 ADOPT. |
| `EV-12` | `package.json` (`lucide-react@^0.468.0`, `zod@^3.24.1`, `react-hook-form@^7.54.2`, `next@^15.1.3`, `react@^19.0.0`) | Deps đã có; F1 không cài mới. |
| `EV-13` | `app/admin/applications/page.tsx:289-401` (MP-3C fetch + Idempotency-Key wiring + panel error/success + refetch after action) | Canonical reference cho F1 fetch pattern. |
| `EV-14` | `src/domains/applications/placement-panel.tsx:78-112` (`ActionBar` controlled component) + `:364-365` (inline alert/status pattern) | Pattern reference cho F1 controls. |
| `EV-15` | `src/domains/applications/placement-ui.ts:182-186` (`newIdempotencyKey`) | UUID v4 helper pattern; F1 copy với prefix `p1f1-` ở log. |
| `EV-16` | `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` v1.5 `ACCEPTED` §4.1.1 | F0 contract authoritative; F1 chỉ consume. |
| `EV-17` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` v1.5 `ACCEPTED` §4 | E0 contract authoritative; F1 chỉ consume. |
| `EV-18` | `docs/discovery/realignment/P1F1_PLACEMENT_ACTION_UI_RECONCILIATION.md` `v1.0` (cùng branch) | Capability matrix toàn diện + residual R-F1-01..06 + 10 Open Decisions. |
| `EV-19` | `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md` v1.1 | Capability matrix F0; F1 tham chiếu. |
| `EV-20` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §23-§30 | Roadmap authoritative; §29 = P1-F. |
| `EV-21` | `docs/N8N_AUTOMATION_BOUNDARY.md` §2, §4 | n8n KHÔNG nắm placement authority; F1 không gọi n8n. |
| `EV-22` | `origin/codex/t1a-p1e1-recruiter-workbench-ui` @ `b81f5b9440` | E1 candidate branch; F1 chờ ACCEPTED. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `CHOSEN-01` | F1 chờ P1-E1 ACCEPTED trên main mới implement UI. Trong planning này, F1 document insertion points theo E0 DTO + E0 §4.4 + E0 `primaryActions` + UI primitives hiện hữu. F1 KHÔNG tự code UI shell. | `CHOSEN` |
| `CHOSEN-02` | F1 chỉ gọi 5 F0 HTTP routes (`/api/admin/placements/**`). KHÔNG gọi `placement.commands.ts` adapter trực tiếp. KHÔNG mở Prisma transaction ở client. | `CHOSEN` |
| `CHOSEN-03` | F1 chỉ wrap role gate qua UI (ẩn controls khi role ≠ ADMIN && ≠ HR_MANAGER). Server vẫn là authority. | `CHOSEN` |
| `CHOSEN-04` | F1 dùng `Idempotency-Key` UUID v4 canonical (Next.js 15 `crypto.randomUUID()`); mỗi deliberate click = fresh key; nếu payload edit (evidence form) trong cùng modal thì cũng mint fresh key (giống MP-3C `idempotency-edit-mints-fresh-key` ở `admin/applications/page.tsx:352-354`). | `CHOSEN` |
| `CHOSEN-05` | F1 KHÔNG thêm dependency mới (no Radix, no MUI, no shadcn). ADOPT Tailwind + design tokens + `SlideOutDrawer` + `DataTable` + `EmptyState` + `lucide-react` + `zod` + `react-hook-form`. | `CHOSEN` |
| `CHOSEN-06` | F1 KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`. | `CHOSEN` |
| `CHOSEN-07` | F1 KHÔNG đụng F0 service / lifecycle / errors / route helper / 5 routes. | `CHOSEN` |
| `CHOSEN-08` | F1 KHÔNG đụng E0 types / read-service / route. Nếu cần read-model extension, đề xuất `DEC-F1-01` Option A thuộc task riêng (E0 v1.4+ chứ không phải F1). | `CHOSEN` |
| `CHOSEN-09` | F1 KHÔNG đụng MP-3C legacy (`placement-ui.ts`, `placement-panel.tsx`, `app/admin/applications/**`). Chỉ ADOPT pattern (controlled props, inline message, disabled-while-saving) chứ không reuse component. | `CHOSEN` |
| `CHOSEN-10` | F1 KHÔNG tự tính lifecycle state machine ở client. F1 chỉ hiển thị controls theo current status mà server đã trả (qua DTO extension nếu T0 chọn `DEC-F1-01` Option A). | `CHOSEN` |
| `CHOSEN-11` | F1 KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07 + Plan §29). | `CHOSEN` |
| `CHOSEN-12` | F1 KHÔNG mở outbox/event producer, KHÔNG gọi n8n, KHÔNG PII export. | `CHOSEN` |
| `CHOSEN-13` | F1 KHÔNG sửa `docs/PLANNER_HANDOVER.md` (T0-owned). | `CHOSEN` |
| `CHOSEN-14` | F1 KHÔNG sửa NAV-01 sidebar/menu (task riêng). | `CHOSEN` |
| `CHOSEN-15` | Round này dừng ở `PROPOSED_ONLY` / `DRAFT`; KHÔNG mở PR, KHÔNG gọi T3, KHÔNG code. Chờ T0 contract review. | `CHOSEN` |
| `DEC-F1-01` | Read-model extension cho `placementId` / `placementStatus` / `managementMode` | `OPEN` — chờ T0 |
| `DEC-F1-02` | Server authority cho status gate | `OPEN` — chờ T0 |
| `DEC-F1-03` | Idempotency-Key mint policy | `OPEN` — chờ T0 |
| `DEC-F1-04` | Lifecycle state derivation ở client | `OPEN` — chờ T0 |
| `DEC-F1-05` | Toast / banner | `OPEN` — chờ T0 |
| `DEC-F1-06` | Evidence form persistence giữa retries | `OPEN` — chờ T0 |
| `DEC-F1-07` | T0 role trong pre-implementation review | `OPEN` — chờ T0 |
| `DEC-F1-08` | Nhánh forward-merge E1 trong implementation round | `OPEN` — chờ T0 |
| `DEC-F1-09` | E0 additive read-model field placement | `OPEN` — chờ T0 |
| `DEC-F1-10` | Add drop-down jobOpeningId cho CREATE flow | `OPEN` — chờ T0 |

### 3.1 Build vs Adopt

`Build vs adopt = ADOPT` (toàn bộ stack hiện hữu).

| Reuse hiện hữu (ưu tiên 1) | Library/version/source | License | Wrapper boundary |
|---|---|---|---|
| 5 F0 routes | Repo internal | Repo (Apache-2.0 inferred) | F1 chỉ `fetch(...)` qua HTTP (`recruiter-workbench.placement-actions.fetch.ts`). |
| `RecruiterWorkbenchRow` DTO (E0) | Repo internal | Repo | F1 consume readonly. |
| `RecruiterWorkbenchListResponse` + `ServerDerivedNextAction` | Repo internal | Repo | F1 dùng để gate UI controls. |
| `placement.lifecycle.ts` (pure state machine) | Repo internal | Repo | F1 KHÔNG gọi trực tiếp (DEC-F1-04). |
| `computeManagementMode` (pure helper) | Repo internal | Repo | F1 KHÔNG gọi; server derive (nếu `DEC-F1-01` = A). |
| `maskPhone` / `maskCccd` | `src/shared/privacy/mask.ts` | Repo internal | F1 KHÔNG gọi; DTO đã mask. |
| `DataTable` + URL state | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` | Repo internal | F1 ADOPT cho workbench table. |
| `SlideOutDrawer` | `src/shared/ui/sheet/slide-out-drawer.tsx` | Repo internal | F1 ADOPT cho Placement Action drawer. |
| `EmptyState` | `src/shared/ui/data-display/empty-state.tsx` | Repo internal | F1 ADOPT cho empty rows. |
| `lucide-react` icons | `lucide-react@^0.468.0` | MIT | F1 ADOPT cho action affordances. |
| `zod` cho preflight validation | `zod@^3.24.1` | MIT | F1 ADOPT. |
| `react-hook-form` cho evidence form | `react-hook-form@^7.54.2` | MIT | F1 ADOPT (optional; có thể dùng controlled state như MP-3C). |
| `crypto.randomUUID()` | Next.js 15 + browser native | MIT | F1 ADOPT cho Idempotency-Key. |
| Inline alert/status pattern | Pattern hiện hữu (`placement-panel.tsx:364-365`, `admin/applications/page.tsx:506-507`) | Repo internal | F1 ADOPT. |

| Adopt (ưu tiên 2) | Ghi chú |
|---|---|
| None. | Toàn bộ capability đã có trong repo. F1 không thêm dependency mới. |

| Đề xuất mới (ưu tiên 3) | Ghi chú |
|---|---|
| None trong F1. | Nếu E0 additive read-model extension (`DEC-F1-01` Option A) được T0 duyệt, thuộc E0 task riêng — KHÔNG thuộc F1 in-scope. |

**Kết luận**: `ADOPT` cho toàn bộ stack. F1 không fork helper, không cài
package mới, không tự viết placement lifecycle.

### 3.2 Build vs Automate

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

## 4. Contract

### 4.1 Functional requirements (RQ → STEP → AC)

RQ → STEP → AC traceability matrix. STEP values are `STEP-01..STEP-10` (planned
implementation sequence in §5.1); AC values are `AC-01..AC-17` (§6).

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-03 | AC-03 |
| `RQ-02` | STEP-05 | AC-02, AC-09 |
| `RQ-03` | STEP-03 | AC-04 |
| `RQ-04` | STEP-05 | AC-01 |
| `RQ-05` | STEP-05 | AC-01 |
| `RQ-06` | STEP-05 | AC-14 |
| `RQ-07` | STEP-05 | AC-01 |
| `RQ-08` | STEP-04 | AC-11, AC-16 |
| `RQ-09` | STEP-05 | AC-05 |
| `RQ-10` | STEP-04 | AC-06 |
| `RQ-11` | STEP-03 | AC-04 |
| `RQ-12` | STEP-05 | AC-07 |
| `RQ-13` | STEP-05 | AC-13 |
| `RQ-14` | STEP-03 | AC-08 |
| `RQ-15` | STEP-04 | AC-11 |
| `RQ-16` | STEP-06 | AC-09, AC-10 |
| `RQ-17` | STEP-06 | AC-10 |
| `RQ-18` | STEP-06 | AC-17 |
| `RQ-19` | STEP-03 | AC-08 |
| `RQ-20` | STEP-06 | AC-15 |
| `RQ-21` | STEP-04 | AC-06 |

#### 4.1.1 Detailed requirement table

| ID | Requirement | Verification method |
|---|---|---|
| `RQ-01` | F1 chỉ gọi 5 F0 HTTP routes: `POST /api/admin/placements` (create); `POST /api/admin/placements/[id]/actions/confirm`; `POST /api/admin/placements/[id]/actions/effective`; `POST /api/admin/placements/[id]/actions/fail`; `POST /api/admin/placements/[id]/actions/cancel`. F1 KHÔNG gọi `placement.commands.ts` adapter trực tiếp. F1 KHÔNG mở Prisma transaction. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` assert fetch helper gọi đúng URL + method + headers + body cho 5 actions. |
| `RQ-02` | F1 wrap role gate qua UI: chỉ `ADMIN` / `HR_MANAGER` thấy placement action controls. Role khác thấy controls bị ẩn. Server vẫn là authority (nếu hack qua network → 403 `FORBIDDEN`). | Unit test render component với role khác nhau; assert controls absent. Integration test cover 403 qua route handler. |
| `RQ-03` | F1 mints raw UUID v4 cho `Idempotency-Key` (Next.js 15 `crypto.randomUUID()`); mỗi deliberate click = fresh key; nếu payload edit (evidence form) trong cùng modal thì cũng mint fresh key (DEC-F1-03 hybrid). Server check UUID v4 thuần (`placement.route-helpers.ts:263-277`). | Unit test assert `Idempotency-Key` header present + valid UUID v4 + fresh across deliberate clicks + reset on payload edit. |
| `RQ-04` | F1 render CREATE control chỉ khi `nextAction = 'REVIEW_PLACEMENT'` && `placement === null` && role ∈ {ADMIN, HR_MANAGER}. CREATE flow mở modal chọn `jobOpeningId` (candidates từ case's job openings — server cung cấp qua endpoint riêng hoặc qua modal pre-fill; chốt trong implementation round). | Unit test render với các state `nextAction` + `placement` khác nhau. Integration test end-to-end qua synthetic DB. |
| `RQ-05` | F1 render CONFIRM control chỉ khi `placement?.status === 'SELECTED'`. Confirm dialog yêu cầu explicit click. Double-click bị disable (R-F1-04 disabled-while-saving pattern). | Unit test render với các `placement.status` khác nhau + assert double-click không gửi 2 request. Integration test cover replay qua duplicate header. |
| `RQ-06` | F1 render EFFECTIVE control chỉ khi `placement?.status === 'CONFIRMED' && placement?.managementMode === 'CLIENT_MANAGED'`. EFFECTIVE mở evidence form (datetime-local `clientAcknowledgedAt` + `clientAcknowledgedByUserId` + `acknowledgementRef`). Submit validate client-side bằng zod preflight (ISO-8601 cho timestamp). Server vẫn là authority. | Unit test render với HRP-managed vs Client-managed + assert controls absent cho HRP-managed. Unit test evidence form validation. Integration test cover HRP-managed EFFECTIVE REJECT (400). |
| `RQ-07` | F1 render FAIL / CANCEL control chỉ khi `placement?.status ∈ {'SELECTED', 'CONFIRMED'}`. Confirm dialog yêu cầu explicit click. Server vẫn là authority. | Unit test render với các `placement.status` khác nhau. Integration test cover FAIL/CANCEL reject sau EFFECTIVE (409). |
| `RQ-08` | F1 render action controls dựa trên (a) E0 server-derived `nextAction` (7-value closed enum, `recruiter-workbench.types.ts:29-37`) + (b) `placement?.status` (nếu `DEC-F1-01` = A) + (c) `placement?.managementMode` (nếu `DEC-F1-01` = A). F1 KHÔNG tự tính `canTransition` ở client (DEC-F1-04). | Unit test assert controls absent khi thiếu data. |
| `RQ-09` | F1 refetch row sau mỗi success (refresh `nextAction` + `placement.status` + `placement.managementMode`). F1 KHÔNG cache mutation state ở client (single source of truth = server). | Unit test assert fetch `/api/admin/recruiter-workbench` được gọi sau success. Integration test end-to-end verify row refresh sau mỗi command. |
| `RQ-10` | F1 render 4xx / 5xx error từ F0 route verbatim (server `message` + `details?` cho 400 `PLACEMENT_VALIDATION_ERROR`). KHÔNG leak raw error.message nếu server trả generic 500 (chỉ render "Đã có lỗi máy chủ — vui lòng thử lại."). KHÔNG log raw actorId, request body, evidence, `acknowledgementRef`, tokens, `Idempotency-Key`, PII ở client (structured log là server-side concern). | Unit test assert error rendering cho 400/401/403/404/409/500. Integration test cover từng error code. |
| `RQ-11` | F1 wrap `Idempotency-Key` với namespace `p1f1-` chỉ ở client log (debug); server nhận raw UUID v4 (F0 strict). | Unit test assert header value là raw UUID v4, không có prefix. |
| `RQ-12` | F1 KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07; Plan §29). Service `markPlacementEffective` đã enforce zero side-effects; F1 chỉ gọi HTTP, KHÔNG gọi service trực tiếp. | Integration test cover Client-managed EFFECTIVE + verify Worker/Episode/Assignment table KHÔNG có row mới. |
| `RQ-13` | F1 KHÔNG mở outbox/event producer; KHÔNG gọi n8n; KHÔNG PII export. F1 chỉ inline alert/status pattern. | AST guard + grep verify F1 KHÔNG import `@/src/shared/integrity/outbox/**` hoặc tương đương. |
| `RQ-14` | F1 KHÔNG fork `src/shared/integrity/idempotency/**`; chỉ wrap consumer-side (mints raw UUID v4 ở client). | AST guard verify F1 KHÔNG import helper. |
| `RQ-15` | F1 KHÔNG fork `src/domains/talent/placement.lifecycle.ts`; KHÔNG tự tính `canTransition` / `computeManagementMode` ở client (DEC-F1-04). | AST guard + grep verify F1 KHÔNG import lifecycle. |
| `RQ-16` | F1 KHÔNG đụng F0 / E0 / MP-3C code (xem §0 forbidden paths). | `git status --porcelain` chỉ chứa in-scope roots §0; `git diff --cached --stat` = 0 hit cho forbidden paths. |
| `RQ-17` | F1 KHÔNG đụng schema/migration/package/lockfile/CI/Next config. | Same as RQ-16. |
| `RQ-18` | F1 KHÔNG sửa `permission-catalog.ts` hoặc `prisma/seed.mjs` (C-02). F1 KHÔNG thêm `CAN_*` placement code. | AST guard verify. |
| `RQ-19` | F1 KHÔNG fork `src/shared/auth/with-db-context.ts` / `with-authorized-db.ts` / `auth-context.ts` / `rls-context.ts`; F1 chỉ consume qua route. | AST guard verify. |
| `RQ-20` | F1 mở rộng `RecruiterWorkbenchRow` chỉ khi `DEC-F1-01` = Option A. Nếu T0 chọn Option A, additive read-model extension thuộc E0 task riêng (`recruiter-workbench.read-service.ts` mở thêm field `placement?: { id, status, managementMode? } \| null`). F1 KHÔNG tự sửa E0 types/read-service trong F1 task. | AST guard + grep verify F1 KHÔNG import private E0 internals. |
| `RQ-21` | F1 hiển thị error message thân thiện cho từng error code canonical (§4.3 mapping). Mọi 400 từ server render verbatim (theo `placement-panel.tsx:95-100` pattern `messageOf`). 500 từ server render generic. | Unit test assert error rendering cho từng code. |

#### 4.1.2 Body shape (locked — F0 contract authoritative)

| Action | Endpoint | Body | Headers |
|---|---|---|---|
| CREATE | `POST /api/admin/placements` | `{ placementCaseId: string, jobOpeningId: string, sourceCandidateSubmissionId?: string }` (strict) | `Idempotency-Key: <UUID v4>` required; cookie auth (Next.js session) |
| CONFIRM | `POST /api/admin/placements/[id]/actions/confirm` | `{}` (strict) | `Idempotency-Key: <UUID v4>` required |
| EFFECTIVE | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt: ISO-8601, clientAcknowledgedByUserId: string, acknowledgementRef: string } }` (strict) | `Idempotency-Key: <UUID v4>` required |
| FAIL | `POST /api/admin/placements/[id]/actions/fail` | `{}` (strict) | `Idempotency-Key: <UUID v4>` required |
| CANCEL | `POST /api/admin/placements/[id]/actions/cancel` | `{}` (strict) | `Idempotency-Key: <UUID v4>` required |

#### 4.1.3 Response shape (locked — F0 contract authoritative)

| Action | 2xx | 4xx / 5xx |
|---|---|---|
| CREATE | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | `{ error: <code>, message: <message>, details?: <details> }` |
| CONFIRM | `200 { placementId, status: 'CONFIRMED', replayed }` | Same as create |
| EFFECTIVE | `200 { placementId, status: 'EFFECTIVE', replayed }` | Same as create (HRP-managed → 400 `PLACEMENT_VALIDATION_ERROR`) |
| FAIL | `200 { placementId, status: 'FAILED', replayed }` | Same as create |
| CANCEL | `200 { placementId, status: 'CANCELLED', replayed }` | Same as create |

### 4.2 Component insertion points (planned)

| Insertion point | Component (planned) | Source primitive | Depends on |
| --- | --- | --- | --- |
| Row actions column (cuối row) | `<PlacementActionControls row={row} role={role} onAction={...} />` | Custom (Tailwind) | E0 DTO có `placement?.id/status/managementMode?` (`DEC-F1-01` Option A) |
| Detail drawer (right-side) | `<PlacementActionDrawer open={open} placementId={...} currentStatus={...} managementMode={...} onClose={...} onChanged={...} />` | `SlideOutDrawer` (ADOPT) | `DEC-F1-01` |
| Confirmation modal (Confirm / Fail / Cancel) | `<ConfirmPlacementActionDialog kind="confirm\|fail\|cancel" placementId={...} onConfirm={...} onCancel={...} pending={...} />` | Custom (Tailwind, no Radix) | None |
| EFFECTIVE evidence form | `<EffectiveEvidenceForm value={...} onChange={...} pending={...} onSubmit={...} />` | Custom (Tailwind) + zod preflight | None |
| Inline error / success banner | `<p role="alert">` / `<p role="status">` | Inline pattern hiện hữu | None |

### 4.3 Error → UI mapping (locked)

| Status | Error code | F1 render |
|---|---|---|
| `201` / `200` | (success) | Inline `<p role="status">`: "Đã {action}." + refetch row. |
| `400` | `VALIDATION` | Inline `<p role="alert">`: server `message`. |
| `400` | `IDEMPOTENCY_REQUIRED` | Inline `<p role="alert">`: "Thiếu Idempotency-Key — không retry được." (lỗi client bug; surface cho dev). |
| `400` | `PLACEMENT_VALIDATION_ERROR` | Inline `<p role="alert">`: server `message` (e.g. "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). |
| `401` | `NO_TOKEN` / `INVALID_TOKEN` / `USER_INACTIVE` / `USER_NOT_FOUND` | Hard-redirect tới `/login` (Next.js convention). |
| `403` | `FORBIDDEN` | Inline `<p role="alert">`: "Role {role} không có quyền placement command." |
| `404` | `PLACEMENT_NOT_FOUND` | Inline `<p role="alert">`: "Placement không tồn tại — đã refresh danh sách." + refetch row. |
| `409` | `INVALID_STATE_TRANSITION` | Inline `<p role="alert">`: "Trạng thái đã thay đổi — đã refresh danh sách." + refetch row. |
| `409` | `PLACEMENT_IDEMPOTENCY_CONFLICT` / `IDEMPOTENCY_CONFLICT` | Inline `<p role="alert">`: "Idempotency-Key đã dùng với payload khác." |
| `500` | `INTERNAL` | Inline `<p role="alert">`: "Đã có lỗi máy chủ — vui lòng thử lại." KHÔNG leak message. |

### 4.4 Action ↔ F0 route ↔ body ↔ effect mapping

| Action (UI label) | `nextAction` gating (suggested) | F0 route | Body | 200/201 response | Effect on UI |
| --- | --- | --- | --- | --- | --- |
| "Chọn ứng viên" (CREATE) | `READY_TO_PLACE` && `placement === null` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements` | `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | Refresh row; new `placement.id`, `placement.status = 'SELECTED'`, `placement.managementMode = computeManagementMode(serviceModelSnapshot)`. |
| "Xác nhận" (CONFIRM) | `placement?.status === 'SELECTED'` | `POST /api/admin/placements/[id]/actions/confirm` | `{}` | `200 { placementId, status: 'CONFIRMED', replayed }` | Refresh row; `placement.status = 'CONFIRMED'`. |
| "Đánh dấu hiệu lực" (EFFECTIVE) | `placement?.status === 'CONFIRMED' && placement?.managementMode === 'CLIENT_MANAGED'` | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt, clientAcknowledgedByUserId, acknowledgementRef } }` | `200 { placementId, status: 'EFFECTIVE', replayed }` | Refresh row; `placement.status = 'EFFECTIVE'`; case auto-closes (`caseStatus = 'CLOSED'`); row disappears nếu `nextAction` derive về `NONE`. |
| "Đánh dấu thất bại" (FAIL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` | `POST /api/admin/placements/[id]/actions/fail` | `{}` | `200 { placementId, status: 'FAILED', replayed }` | Refresh row; `placement.status = 'FAILED'`. |
| "Hủy chọn" (CANCEL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` | `POST /api/admin/placements/[id]/actions/cancel` | `{}` | `200 { placementId, status: 'CANCELLED', replayed }` | Refresh row; `placement.status = 'CANCELLED'`. |

**Server authoritative**: mọi role gate, status gate, managementMode gate phải được F0 server enforce. Client gate chỉ là UX (ẩn/disabled), KHÔNG phải security boundary. Nếu client gate sai, server trả 400/403/409 và F1 render message thân thiện.

## 5. Execution Plan

### 5.1 Steps (sequence)

1. **Read-only reconciliation** ✅ (round này): T1B đã inspect F0 commands, F0
   routes, F0 service, F0 errors, E0 DTO, E0 read-service, E0 types, E1 candidate
   branch, MP-3C placement-panel pattern, admin applications page, UI primitives.
2. **Author 2 docs** ✅ (round này): `RECON` + `TASK` v1.0 `DRAFT`.
3. **Run verification**: `verify-encoding.ps1`, `verify-task.ps1`, `git diff --check`.
4. **Commit + push docs**: 1 commit với 2 docs files only.
5. **Stop for T0 contract review**: chờ T0 chốt 10 Open Decisions (§10).
6. **(future) Implementation round** (chưa mở):
   - **STEP-01**: chờ P1-E1 ACCEPTED.
   - **STEP-02**: nếu `DEC-F1-01` = A, chờ E0 additive read-model merged.
   - **STEP-03**: implement `recruiter-workbench.placement-actions.fetch.ts`
     (fetch helper wrap 5 F0 routes + Idempotency-Key mint).
   - **STEP-04**: implement `recruiter-workbench.placement-actions.states.ts`
     (pure state helper: `availableActionsForRow`, `formatErrorMessage`).
   - **STEP-05**: implement `recruiter-workbench.placement-actions.tsx`
     (controlled components: `<PlacementActionControls>`,
     `<PlacementActionDrawer>`, `<ConfirmPlacementActionDialog>`,
     `<EffectiveEvidenceForm>`).
   - **STEP-06**: integrate vào E1 shell tại `app/admin/recruiter-workbench/**`.
   - **STEP-07**: unit tests (`*.test.tsx` + `*.fetch.test.ts`).
   - **STEP-08**: integration test (`tests/db/p1f1-placement-action-ui.integration.test.ts`).
   - **STEP-09**: chạy required gates (§0).
   - **STEP-10**: HANDOFF + AUDIT + freeze SHA.

### 5.2 Test plan (planned, cho implementation round)

#### 5.2.1 Unit tests (vitest + react-dom/server)

- `recruiter-workbench.placement-actions.test.tsx` — controlled components:
  - `<PlacementActionControls>` render với 7-value `nextAction` × 5-value
    `placement.status` × 2-value `placement.managementMode` × 3-value role
    = 7×5×2×3 = 210 states, parametrized.
  - `<ConfirmPlacementActionDialog>` render với kind ∈ {confirm, fail, cancel}.
  - `<EffectiveEvidenceForm>` validation: ISO-8601 `clientAcknowledgedAt` +
    non-empty `clientAcknowledgedByUserId` + non-empty `acknowledgementRef`.
- `recruiter-workbench.placement-actions.fetch.test.ts` — fetch helper:
  - Mock `fetch`; assert URL + method + headers + body cho 5 actions.
  - Assert `Idempotency-Key` header present + valid UUID v4.
  - Assert reset of `Idempotency-Key` on payload edit.
  - Assert refetch `/api/admin/recruiter-workbench` after success.
  - Assert error rendering for 400/401/403/404/409/500.

#### 5.2.2 Integration tests (vitest + synthetic DB)

- `tests/db/p1f1-placement-action-ui.integration.test.ts`:
  - End-to-end CREATE → 201 → row refresh → SELECTED state visible.
  - End-to-end CONFIRM → 200 → row refresh → CONFIRMED state visible.
  - End-to-end EFFECTIVE (Client-managed) → 200 → row refresh → EFFECTIVE
    state + case auto-closes (caseStatus = 'CLOSED') + verify Worker/Episode/
    Assignment table KHÔNG có row mới.
  - End-to-end EFFECTIVE (HRP-managed) → 400 `PLACEMENT_VALIDATION_ERROR` +
    verify zero mutation.
  - End-to-end FAIL → 200 → row refresh → FAILED state.
  - End-to-end CANCEL → 200 → row refresh → CANCELLED state.
  - End-to-end CANCEL sau EFFECTIVE → 409 `INVALID_STATE_TRANSITION`.
  - Replay: same `Idempotency-Key` + same payload → `replayed: true`.
  - Conflict: same `Idempotency-Key` + different payload → 409
    `IDEMPOTENCY_CONFLICT`.
  - Role hide: HR_STAFF role → 403 qua route handler (server authority).
  - 404 `PLACEMENT_NOT_FOUND` (race) → row refresh.
  - 500 unexpected → inline alert generic, no leak.

#### 5.2.3 Static / AST guards

- F1 KHÔNG import `@/src/domains/talent/placement.commands` (adapter).
- F1 KHÔNG import `@/src/shared/integrity/idempotency/**` (helper).
- F1 KHÔNG import `@/src/domains/talent/placement.lifecycle` (state machine).
- F1 KHÔNG import `@/src/domains/talent/placement.service` (production service).
- F1 KHÔNG import `@/src/shared/auth/with-db-context` / `with-authorized-db`.
- F1 KHÔNG import `@/src/shared/integrity/outbox/**`.
- F1 KHÔNG có `console.*` log với raw actorId / request body / evidence /
  acknowledgementRef / tokens / Idempotency-Key / PII.
- F1 KHÔNG sửa `permission-catalog.ts`, `prisma/seed.mjs`, `schema.prisma`,
  `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`,
  `.github/workflows/ci.yml`, `vitest.unit.config.ts`,
  `vitest.integration.config.ts`.

## 6. Acceptance

| ID | Acceptance criterion | Verification |
|---|---|---|
| `AC-01` | F1 render đúng 5 actions (CREATE / CONFIRM / EFFECTIVE / FAIL / CANCEL) cho role ADMIN/HR_MANAGER với state `nextAction` + `placement.status` + `placement.managementMode` tương ứng. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render 8+ states. |
| `AC-02` | F1 KHÔNG render bất kỳ action controls nào cho role ≠ ADMIN && ≠ HR_MANAGER. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render với HR_STAFF/CTV/PUBLIC; assert controls absent. |
| `AC-03` | F1 wrap 5 F0 routes qua fetch helper; KHÔNG gọi `placement.commands.ts` adapter trực tiếp; KHÔNG mở Prisma transaction ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` mock fetch + assert URL/method/headers/body. AST guard verify F1 KHÔNG import private F0 internals. |
| `AC-04` | F1 mints raw UUID v4 cho `Idempotency-Key`; mỗi deliberate click = fresh key; payload edit trong cùng modal = fresh key. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` assert `Idempotency-Key` header present + valid UUID v4 + reset across clicks + reset on payload edit. |
| `AC-05` | F1 refetch row sau mỗi success; KHÔNG cache mutation state ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` assert fetch `/api/admin/recruiter-workbench` được gọi sau success. Integration test end-to-end verify row refresh. |
| `AC-06` | F1 render 4xx / 5xx error từ F0 route verbatim; 500 render generic. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` mock fetch với 400/401/403/404/409/500; assert rendered message. |
| `AC-07` | F1 EFFECTIVE không tạo Worker/Episode/Assignment cho Client-managed. | `npm run test:integration -- tests/db/p1f1-placement-action-ui.integration.test.ts` cover Client-managed EFFECTIVE + verify Worker/Episode/Assignment table KHÔNG có row mới. |
| `AC-08` | F1 KHÔNG fork `src/shared/integrity/idempotency/**`, `placement.lifecycle.ts`, `placement.commands.ts`, `placement.route-helpers.ts`. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` AST guard. |
| `AC-09` | F1 KHÔNG sửa F0 / E0 / MP-3C / F0 / E0 / A0 / A1 / B / C / D / PLANNER_HANDOVER code. | `git status --porcelain` chỉ chứa in-scope roots §0. |
| `AC-10` | F1 KHÔNG đụng schema/migration/package/lockfile/CI/Next config. | `git status --porcelain` chỉ chứa in-scope roots §0 (no `prisma/`, `package*.json`, `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`). |
| `AC-11` | F1 KHÔNG tự tính `canTransition` / `computeManagementMode` ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.states.test.ts` AST guard. |
| `AC-12` | F1 KHÔNG log raw actorId / request body / evidence / `acknowledgementRef` / tokens / `Idempotency-Key` / PII ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` grep assert không có `console.log` với các field cấm. |
| `AC-13` | F1 KHÔNG mở outbox/event producer; KHÔNG gọi n8n; KHÔNG PII export. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` AST guard. |
| `AC-14` | F1 EFFECTIVE bị ẩn hoàn toàn khi `placement?.managementMode === 'HRP_MANAGED'`. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render với HRP-managed; assert EFFECTIVE control absent. Integration test cover HRP-managed EFFECTIVE REJECT (400 `PLACEMENT_VALIDATION_ERROR`). |
| `AC-15` | F1 render đúng khi `DEC-F1-01` = A (additive E0 field `placement?: { id, status, managementMode? } \| null`). Nếu T0 chọn Option B/C, F1 contract phải adapt (chốt trong implementation round). | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` parametrized render theo 3 option; AST guard verify F1 chỉ import field khi option A. Document review of DEC-F1-01 verdict in §9. |
| `AC-16` | F1 render đúng cho tất cả 7-value `nextAction` enum. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render với 7 states; assert controls đúng cho từng state. |
| `AC-17` | F1 KHÔNG sửa `permission-catalog.ts` hoặc `prisma/seed.mjs` (C-02). | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` AST guard. |

## 7. Risk

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| `R-01` | Stale UI status hiển thị → user double-click CONFIRM → 2 request cùng `Idempotency-Key` + same payload → 1 success + 1 replay (`replayed: true`). | Medium | Low (server idempotent) | Disable button while `pending=true`; render success chỉ 1 lần; refetch row. | T1 implementation |
| `R-02` | UI gate sai role/state → user gọi thủ công qua network tab → server trả 403 / 400 / 409 → F1 render message. | Low | Medium (UX confusion) | Server authority; F1 chỉ UX gate; mọi error render verbatim từ server. | T1 implementation |
| `R-03` | `DEC-F1-01` = A (additive E0 field) mà T0 chọn Option B/C → F1 contract phải adapt. | Medium | Medium (round delay) | T0 chốt trước implementation round; F1 implementation round chỉ mở sau T0 verdict. | T0 |
| `R-04` | P1-E1 chưa ACCEPTED → F1 không có UI shell để gắn action controls. | High | High (blocker) | F1 chờ E1 ACCEPTED; trong planning này document insertion points theo E0 DTO + UI primitives. | T0 + E1 owner |
| `R-05` | `DEC-F1-02` = C (UI gate compute `canTransition` ở client) → fragile coupling với backend state machine. | Low | Medium | `CHOSEN-10`: F1 KHÔNG tự tính lifecycle; chỉ dùng server-derived status từ DTO. | T0 |
| `R-06` | `nextAction` enum mở rộng trong tương lai → F1 phải adapt. | Low | Low | Server-derived closed enum; F1 switch theo giá trị; thêm value mới là task riêng. | E0 owner |
| `R-07` | 5xx unexpected → F1 tự retry với cùng payload → idempotency violation. | Medium | High | F1 KHÔNG auto retry; render button "Thử lại" mint fresh Idempotency-Key (deliberate). | T1 implementation |
| `R-08` | PII leak qua error message (e.g. server trả `acknowledgementRef` trong 400 details) → F1 render verbatim → leak. | Low | High (PII) | F1 KHÔNG log PII client-side; render `details?` chỉ khi KHÔNG chứa PII fields; strip `acknowledgementRef` / `clientAcknowledgedByUserId` trước khi render. | T1 implementation |
| `R-09` | Test infrastructure (`DATABASE_URL_TEST`) chưa ready → integration test `ENV_BLOCKED`. | Medium | Low (round delay) | Báo cáo honest `ENV_BLOCKED` (không fake PASS); chờ synthetic DB gate. | T0 |
| `R-10` | HRP-managed EFFECTIVE → F1 ẩn control, nhưng user gọi thủ công → 400 `PLACEMENT_VALIDATION_ERROR` với message "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4". | Low | Low (informational) | F1 render message verbatim; integration test cover. | T1 implementation |

## 8. Open Questions

**NONE** for round planning này (round planning chỉ chốt contract + open decisions;
mọi question cần T0 review được consolidate ở §10 Open Decisions).

Sau khi T0 chốt §10, mở implementation round mới. Implementation round có thể
phát sinh question cụ thể (e.g. CREATE flow modal pre-fill jobOpeningId từ
endpoint nào) — sẽ được chốt trong implementation round, KHÔNG ở round này.

## 9. Planner Resolution

Round này (`v1.0`) là round planning đầu tiên của `hrp-p1-f1-placement-action-ui`.
Planner (T1B) đã:

1. Đọc `.ai-pipeline/README.md`, `.ai-pipeline/rules/00-global-rules.md`,
   `.ai-pipeline/tier1.md`, `AGENTS.md`, `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`
   §23-§30, `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` + `HANDOFF.md`,
   `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` + `HANDOFF.md`.
2. Inspect F0 implementation files: `placement.lifecycle.ts`,
   `placement.errors.ts`, `placement.commands.ts`, `placement.route-helpers.ts`,
   5 routes `app/api/admin/placements/**`.
3. Inspect E0 frozen DTO: `recruiter-workbench.types.ts`,
   `recruiter-workbench.read-service.ts`, `RecruiterWorkbenchRow` shape.
4. Inspect E1 candidate branch (`origin/codex/t1a-p1e1-recruiter-workbench-ui`
   @ `b81f5b9440`): KHÔNG có UI shell (chỉ `.ai-pipeline`, `docs`, `mockup`).
5. Inspect UI primitives: `DataTable`, `SlideOutDrawer`, `EmptyState`,
   `use-table-url-state`. Inspect `app/admin/applications/page.tsx` + MP-3C
   `placement-panel.tsx` cho fetch + Idempotency-Key wiring + inline alert
   pattern.
6. Author 2 docs: `RECON` v1.0 (capability matrix + 6 residuals + 10 Open
   Decisions) + `TASK` v1.0 `DRAFT` (V2 contract với 21 RQ → 10 STEP → 17 AC
   traceability).
7. Run verification: `verify-encoding.mjs` PASS, `git diff --check` clean,
   `verify-task.ps1` will be run before commit.

Planner resolution:

- `Status = PROPOSED_ONLY` ✅ (planning only).
- `Contract gate = DRAFT` ✅ (chưa implementation; chờ T0 review).
- `Decision state = DRAFT` ✅ (10 Open Decisions chờ T0).
- `Open Owner decisions = 10` (xem §10) — T0 chốt batch trước implementation.
- `Spec version = v1.0` ✅ (round planning đầu tiên).
- `Baseline = 4970f47d481c185f655242e3e91480e4117241dd` ✅ (origin/main).
- `Correction budget = 1` (zero consumed in this round).
- `Next gate = WAIT_P1_E1_ACCEPTED_AND_T0_CONTRACT_APPROVAL` ✅.

## 10. Open Decisions (consolidated single table)

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
| `DEC-F1-07` | T0 role trong pre-implementation review | A: T0 review full doc trước khi F1 mở implementation round; B: T0 review chỉ §10 + §7 trước; C: T0 ad-hoc per correction batch | A | A | A khớp với V2_FAST_FREEZE "stop for one T0 contract review". |
| `DEC-F1-08` | Nhánh forward-merge E1 trong implementation round | A: F1 rebase trên E1 sau khi E1 ACCEPTED; B: F1 chờ E1 merge main rồi branch mới; C: F1 dùng cherry-pick | B | B | B đơn giản nhất; A/C đều có conflict risk. |
| `DEC-F1-09` | E0 additive read-model field placement | A: `placement?: { id, status, managementMode? } \| null`; B: `placementId?` + `placementStatus?` (top-level); C: `placementSnapshot` | A | A | A nested nhất quán với DTO shape hiện hữu (`candidate`, `job`, `handler`, `lastInteraction` đều nested). |
| `DEC-F1-10` | Add drop-down jobOpeningId cho CREATE flow | A: Modal step (chọn 1 trong N job openings); B: Inline dropdown trong row; C: Dedicated `/admin/recruiter-workbench/[caseId]/placement/new` page | A | A | A khớp pattern MP-3C (placement sub-flow); B ép width; C thêm route → out of E1. |

**Status**: Tất cả 10 Open Decisions chưa được T0 chốt. Round planning này chờ
T0 review; không mở implementation round cho tới khi T0 chốt.

## 10. Revision Log

| Round | Date | Author | Note |
| --- | --- | --- | --- |
| 1 | 2026-09-26 | T1B | Initial v1.0 V2 contract. Status `PROPOSED_ONLY` / `Contract gate = DRAFT` / `Decision state = DRAFT`. Correction budget `1` — zero consumed. 10 Open Owner Decisions (§10) chờ T0 chốt. Section renumbering từ `## 3. Contract → ## 3. Decisions` để khớp canonical 11-section template (verify-task.ps1 A-01). |
