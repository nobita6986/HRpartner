# TASK — `hrp-p1-f1-placement-action-ui`

> v1.1 — planning only, BLOCKED on P1-E1 ACCEPTED. No source code in this round.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f1-placement-action-ui` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `UI` (thin client island around 5 accepted F0 routes) |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | UI mở 5 mutation commands từ production-ready backend; rủi ro chính: stale status, leak raw error, idempotency key mistreatment khi retry, role bypass nếu UI gate lệch server gate, double-click tạo duplicate placement. LIGHT audit đảm bảo tất cả 5 commands có UI test cover create/idempotent retry/409 race/role hide/server-error render, plus placementOptions leakage guard và sessionStorage idempotency isolation. |
| Spec version | `v1.1` |
| Status | `READY_FOR_AUDIT` (implementation round done; LOCK-01..LOCK-15 shipped; canonical gates PASS; awaiting T3 LIGHT audit round 1) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Open Owner decisions | `0` |
| Blocker | `NONE` (P1-E1 `ACCEPTED` + merged trên main; E0 + E1 + F0 đều available) |
| Test environment | `REQUIRED` (DB integration test in scope; ENV_BLOCKED on local � Tier 0/Owner cung c?p `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` tru?c khi x�t merge) |
| Correction budget | `1` |
| Baseline | `fabeda29c97720612136909b8f7beccfdf217c25` |
| Predecessor doc | `docs/discovery/realignment/P1F1_PLACEMENT_ACTION_UI_RECONCILIATION.md` `v1.1` (cùng branch) |
| Predecessor SHA | `5f23c1cb7b468536f868e7d1f059cc7d04cb6b86` (v1.0 docs-only commit) |
| Planner | `Tier 1B` |
| Depends on | (1) P1-F0 `ACCEPTED` ✅; (2) P1-E0 `ACCEPTED` ✅ (sẽ nhận additive read-model field trong implementation round, không thuộc task riêng); (3) P1-E1 `PROPOSED_ONLY` — **blocker**; (4) P1-E1 phải `ACCEPTED` + merged main trước khi F1 mở implementation round; (5) sau khi mở, F1 sẽ additive-edit các E0 path được v1.1 §0 cho phép trong cùng slice. |
| Frozen delivery | `YES` (post V2_FAST_FREEZE - semantic code commit + docs/evidence commit) |
| Scope lần này | Planning only, docs-only correction batch v1.1. Implementation round (sau khi E1 ACCEPTED) sẽ: edit additive E0 path được cho phép ở §0; wrap 5 F0 HTTP routes qua fetch client-side mỏng; integrate vào E1 shell `app/admin/recruiter-workbench/**` qua một action-cell / client island hẹp; không fork helper; không cài package mới; không tự tính lifecycle. |
| In-scope roots | `app/admin/recruiter-workbench/**` (E1-owned shell + F1 action controls, sau khi E1 merged main); `src/domains/talent/recruiter-workbench.types.ts` (additive: thêm `placement?: { id, status, jobOpeningId \| null, managementMode } \| null` cho `RecruiterWorkbenchRow`; thêm `placementOptions?: Array&lt;{ jobOpeningId, sourceCandidateSubmissionId, title, projectName, companyName }&gt; \| null` cho placement-aware action); `src/domains/talent/recruiter-workbench.read-service.ts` (additive: project `placement` từ `c.placements[0]` đã có sẵn; derive `placementOptions` từ `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening` với dedupe + deterministic order); `src/domains/talent/recruiter-workbench.read-service.test.ts` (additive: cover zero/one/multiple/dedupe/cross-case isolation); `tests/db/recruiter-workbench.integration.test.ts` (additive DB integration coverage cho `placement` projection + `placementOptions` derivation, không tạo contradictory coverage); F1 có thể tạo `tests/db/p1f1-placement-action-ui.integration.test.ts` cho flow cụ thể nếu thiếu proof, miễn không duplicate; `src/domains/talent/recruiter-workbench.placement-actions.tsx` (controlled action-cell / client island); `src/domains/talent/recruiter-workbench.placement-actions.states.ts` (pure state helper: `availableActionsForRow`, `formatErrorMessage`); `src/domains/talent/recruiter-workbench.placement-actions.fetch.ts` (fetch helper wrap 5 F0 routes + sessionStorage idempotency-key scoping); `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` (unit tests, react-dom/server); `src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` (unit tests cho fetch helper + idempotency-key sessionStorage behavior); `tests/db/p1f1-placement-action-ui.integration.test.ts` (DB integration — registration-only add to `vitest.integration-files.ts`); `vitest.integration-files.ts` (registration-only: thêm đúng MỘT entry; KHÔNG đổi shape/config); `docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md` + `HANDOFF.md` + `AUDIT.md` + `evidence/**`. |
| Forbidden paths | `docs/PLANNER_HANDOVER.md` (T0-owned); `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**`; `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**`; `docs/tasks/hrp-p1-b-public-apply/**`; `docs/tasks/hrp-p1-c-*/**`; `docs/tasks/hrp-p1-d-*/**`; `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**` (task docs; F1 KHÔNG đụng metadata docs. Tuy nhiên source path E0 được additive-edit trong cùng slice đã liệt kê ở In-scope roots).; `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` (E1-PROPOSED_ONLY; F1 chờ E1 ACCEPTED); `docs/tasks/hrp-p1-f0-placement-command-api/**` (F0-accepted; F1 KHÔNG đụng); `src/domains/talent/placement.service.ts` (production-ready); `src/domains/talent/placement.commands.ts` (F0 adapter); `src/domains/talent/placement.route-helpers.ts` (F0 helper); `src/domains/talent/placement.lifecycle.ts` (pure state machine — server authority); `src/domains/talent/placement.resolution.ts`; `src/domains/talent/placement.errors.ts`; `src/domains/talent/placement-case.service.ts`; `app/api/admin/recruiter-workbench/route.ts` (giữ nguyên shape v1.x nếu E0 DTO extension tự serialize — KHÔNG sửa trong F1); `app/api/admin/placements/**` (F0 freeze); `src/shared/integrity/idempotency/**` (KHÔNG fork helper); `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `auth-context.ts`, `rls-context.ts` (KHÔNG sửa — F1 chỉ consume qua route); `src/shared/auth/permission-catalog.ts`; `prisma/seed.mjs`; `prisma/schema.prisma` (KHÔNG schema change trong F1 v1.1); `prisma/migrations/**` (KHÔNG migration mới); `package.json`, `package-lock.json` (KHÔNG cài package mới); `next.config.*`, `tsconfig.json`; `.github/workflows/ci.yml`; `app/admin/applications/**`, `app/api/admin/applications/**` (MP-3C territory); `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` (MP-3C territory); `app/admin/labor-profiles/**`, `src/domains/job-board/public.service.ts`, `app/(jobs)/viec-lam/**`; `vitest.unit.config.ts`, `vitest.integration.config.ts` (registry-only edit ở `vitest.integration-files.ts`); `tests/db/placement-lifecycle-integration.test.ts` (N3 integration); `tests/db/p1f0-placement-command-api.integration.test.ts` (F0 integration). |
| Required gates | `pwsh .ai-pipeline/scripts/verify-task.ps1`; `node .ai-pipeline/scripts/verify-encoding.mjs` (UTF-8 no-BOM trên changed surface); `git diff --check` (LF-only); `git status --porcelain`; `npm run typecheck`; `npm run lint`; `npm run test:unit` (cover F1 unit tests với mock fetch + sessionStorage stub); `npm run test:integration` (cover `tests/db/p1f1-placement-action-ui.integration.test.ts` — local thiếu `DATABASE_URL_TEST` phải `ENV_BLOCKED`, không fake PASS). |
| Current execution round | `3` (V2_FAST_FREEZE implementation round done; ready for T3 LIGHT audit round 1) |
| Current audit round | `1` |
| Next gate | `TIER3_LIGHT_AUDIT` (audit round 1; pre-freeze semantic code commit + docs/evidence commit landed) |

> Lane CRITICAL mặc định LIGHT. Risk acceptance (planning, v1.1): T0 chấp
> nhận LIGHT audit cho thin client island + additive E0 read-model extension
> + server-derived `placementOptions`, consuming production-ready F0 commands.
> F1 KHÔNG tự tính lifecycle, KHÔNG fork helper, KHÔNG cài package mới, KHÔNG
> tách route E0. Risk chính nằm ở `placementOptions` cross-case leakage,
> sessionStorage idempotency-key collision giữa 2 rows / 2 tabs / payload
> edit, và double-click tạo duplicate placement — tất cả đều cover bằng unit
> test (mock fetch + sessionStorage stub cover zero/one/multiple option,
> success/replay/409 race/400/403/500) + integration test (synthetic DB
> cover placementOptions zero/one/multiple/dedupe, HRP-managed EFFECTIVE
> REJECT, replay, race, cross-case isolation).

> Round này KHÔNG viết code. Chỉ chốt contract + lock 10 quyết
> định mà T0 đã phê duyệt trong correction batch v1.1. Sau khi
> P1-E1 `ACCEPTED` + merged trên main, T1B mở một docs-only materialization
> round để rebase/baseline theo updated main và lật `Status =
> READY_FOR_EXECUTION` / `Next gate = TIER1_IMPLEMENTATION_FREEZE` (không cần
> mở lại design review nếu dependency + source assumptions vẫn đúng).

> Control field notes (context removed from table cells to satisfy V2 strict-token gates — T-09, A-04):
>
> - `Decision state = CLOSED` because the 10 Open Decisions from v1.0 were locked by T0 in the v1.1 correction batch (C-01..C-07 absorbed into §3.3 LOCK-01..15). Decision state stays CLOSED through implementation round.
> - `Test environment = NOT_REQUIRED` because DB integration coverage rides on the CI synthetic-DB gate (`DATABASE_URL_TEST` injected by CI). Local dev without the gate must report `ENV_BLOCKED` honestly — never fake PASS.
> - `Blocker = NONE` because P1-E1 is `ACCEPTED` and merged on main at `fabeda29`, and E0 + E1 + F0 surfaces are all available for additive F1 work.
> - `Status = READY_FOR_EXECUTION` is the implementation round — v1.1 docs materialized from planning commit `0eb9b0e4`, controls flipped.

## 1. Outcome

### 1.1 User-visible outcome (post implementation — TIER 1B implementation round, KHÔNG PHẢI round này)

- Recruiter (`ADMIN` / `HR_MANAGER`) mở `/admin/recruiter-workbench`, thấy row với
  `nextAction = 'REVIEW_PLACEMENT'` và case chưa có placement → action-cell có
  control **Chọn ứng viên** → right-side drawer mở (server-derived `placementOptions`,
  unique theo `jobOpeningId`, deterministic order) → user chọn 1 option (preselect
  nếu chỉ một; phải explicit confirm trước khi submit) → submit →
  `POST /api/admin/placements` với `{ placementCaseId, jobOpeningId,
  sourceCandidateSubmissionId }` và `Idempotency-Key` UUID v4 mới (mint từ
  sessionStorage scoped theo `placementCaseId + 'placement.create' + canonical
  payload hash`) → 201 `{ placementId, status: 'SELECTED', serviceModelSnapshot,
  clientCompanyId, projectId, replayed }` → `router.refresh()` server component
  → row refreshed với `placement = { id, status: 'SELECTED', jobOpeningId,
  managementMode }` → CONFIRM / FAIL / CANCEL controls xuất hiện (EFFECTIVE chỉ
  khi `managementMode === 'CLIENT_MANAGED'`).
- Recruiter click **Xác nhận** → confirm dialog → `POST
  /api/admin/placements/[id]/actions/confirm` với cùng `Idempotency-Key` (nếu
  payload unchanged / network uncertainty / 5xx retry → reuse key qua
  sessionStorage lookup; nếu payload edit hoặc chọn JobOpening khác → mint key
  mới) → 200 `{ status: 'CONFIRMED', replayed }` → row refresh.
- Recruiter click **Đánh dấu hiệu lực** (chỉ cho Client-managed, drawer form
  yêu cầu `clientAcknowledgedAt` ISO-8601 + `clientAcknowledgedByUserId` +
  `acknowledgementRef`, giữ form state nếu cùng Idempotency-Key) → `POST
  /api/admin/placements/[id]/actions/effective` → 200 `{ status: 'EFFECTIVE',
  replayed }` → case auto-closes (`caseStatus = 'CLOSED'`) → row biến mất
  nếu filter đang ở non-CLOSED view.
- Recruiter click **Đánh dấu thất bại** hoặc **Hủy chọn** → confirm dialog →
  POST tương ứng → row refresh → terminal state.
- HRP_MANAGED + CONFIRMED: control **Đánh dấu hiệu lực** bị ẩn hoàn toàn (UX).
  Nếu client state stale và gọi thủ công qua stale render → server trả 400
  `PLACEMENT_VALIDATION_ERROR` → F1 render inline `&lt;p role="alert"&gt;` với server
  `message` (không leak metadata).
- Recruiter role khác (HR_STAFF, CTV, PUBLIC, ...) thấy action controls bị ẩn
  (UI gate) và nếu hack vào network tab → server trả 403 `FORBIDDEN` (server
  authority).
- Idempotency:
  - double-click cùng `placement.caseId + command + payload hash` → cùng UUID v4
    → server trả `replayed: true`.
  - payload edit (form state đổi) → mint UUID v4 mới.
  - chọn JobOpening khác → mint UUID v4 mới.
  - success terminal response (200/201) → clear stored key cho scope đó.
  - 4xx validation/auth → KHÔNG tự retry; `Idempotency-Key` vẫn còn trong
    sessionStorage để user deliberate submit lại.
  - 5xx unexpected → render inline alert với button "Thử lại" (mint fresh key
    thành deliberate attempt); KHÔNG auto retry.
- 409 race: nếu user A confirm, user B confirm cùng lúc → một bên được 200,
  bên kia 409 `INVALID_STATE_TRANSITION` → F1 refresh row + show "Trạng thái đã
  thay đổi — đã refresh danh sách."
- F1 KHÔNG cache placement mutation state ở client (single source of truth =
  server) — mọi success/error dẫn đến `router.refresh()` (server component
  đọc lại canonical DTO). F1 KHÔNG cài SWR, KHÔNG optimistic mutation cho
  placement status, KHÔNG thêm package.
- F1 KHÔNG hiển thị audit/timeline; canonical persisted state + evidence ở F0
  là authority.

### 1.2 Non-goals (round này + implementation round)

- KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`,
  `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`.
- KHÔNG sửa F0 code: `placement.commands.ts`, `placement.route-helpers.ts`,
  `placement.service.ts`, `placement.lifecycle.ts`, `placement.resolution.ts`,
  `placement.errors.ts`, 5 routes `app/api/admin/placements/**`.
- KHÔNG sửa E0 route handler (`app/api/admin/recruiter-workbench/route.ts`)
  nếu response tự serialize DTO mở rộng mà không cần sửa route. Nếu route cần
  thay đổi → vượt scope F1, mở E0 task riêng.
- KHÔNG sửa E0 task docs (`docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**`).
- KHÔNG sửa MP-3C legacy: `app/admin/applications/**`, `app/api/admin/applications/**`,
  `src/domains/applications/placement-ui.ts`, `placement-panel.tsx`. Chỉ ADOPT
  pattern (controlled props, inline message, disabled-while-saving) chứ
  KHÔNG reuse component.
- KHÔNG mở UI workbench shell ngoài E1 (F1 chờ E1 merged main).
- KHÔNG sửa sidebar/menu (NAV-01 task riêng).
- KHÔNG mở outbox/event producer (N-series task riêng).
- KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (F0 đã
  enforce; F1 chỉ verify ở integration test).
- KHÔNG fork `placement.service.ts` / `placement.lifecycle.ts` / integrity
  idempotency helper ở client.
- KHÔNG cài package mới (F1 ADOPT Tailwind + tokens + SlideOutDrawer + DataTable
  + EmptyState + lucide-react + zod + react-hook-form — tất cả đã có trong
  `package.json`).
- KHÔNG tự viết Prisma transaction ở client.
- KHÔNG gọi `placement.commands.ts` adapter từ client (chỉ qua HTTP route).
- KHÔNG tự tính lifecycle state machine ở client.
- KHÔNG tạo error code mới.
- KHÔNG dùng seed-only rows làm production permission provisioning.
- KHÔNG gọi n8n, không outbox, không PII export.
- KHÔNG tạo `placement.timeline` server-side hoặc client-side audit log.
- KHÔNG mở PR trong round này.
- KHÔNG gọi T3 trong round này.

## 2. Evidence

Chỉ liệt kê evidence Tier 1 cần để Tier 1 implement.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/talent/placement.service.ts:103/454/458/468/472` | 5 named commands đã ACCEPTED; F1 chỉ wrap qua HTTP. |
| `EV-02` | `src/domains/talent/placement.errors.ts:14-60` (`PlacementError` + 4 subclass) | Error taxonomy freeze; F1 dùng `code` để map message. |
| `EV-03` | `src/domains/talent/placement.lifecycle.ts:23-33` (`computeManagementMode`) + `:51-88` (`canTransition`) | Pure state machine; F1 KHÔNG fork (server authority). |
| `EV-04` | `src/domains/talent/placement.commands.ts:87-93` (`PLACEMENT_COMMAND_ROUTES`) + `app/api/admin/placements/**` (5 routes) | 5 HTTP routes đã ship; F1 fetch qua đây. |
| `EV-05` | `app/api/admin/placements/route.ts:34-90` (create body) + `[id]/actions/effective/route.ts:34-98` (effective evidence body) + `[id]/actions/{confirm,fail,cancel}/route.ts` (empty body) | Body shapes F1 phải gửi; create bắt buộc `placementCaseId` + `jobOpeningId` + `sourceCandidateSubmissionId?`. |
| `EV-06` | `src/domains/talent/placement.route-helpers.ts:60` (`ALLOWED_PLACEMENT_ROLES`) + `:130-367` (`runPlacementCommand`) + `:247-277` (UUID v4 strict) | Pipeline canonical; F1 chỉ disable khi role ≠ ADMIN && ≠ HR_MANAGER; F1 gửi raw UUID v4 (no prefix). |
| `EV-07` | `src/shared/integrity/idempotency/**` (`withIdempotency`) | F1 chỉ consumer-side (mints raw UUID v4 ở client); KHÔNG fork. |
| `EV-08` | `src/domains/talent/recruiter-workbench.types.ts:151-188` (`RecruiterWorkbenchRow`) + `:189-194` (`RecruiterWorkbenchListResponse`) | E0 DTO đã freeze (v1.x); F1 additive-edit trong cùng slice (C-03) để thêm `placement?: { id, status, jobOpeningId \| null, managementMode } \| null` + `placementOptions?: Array&lt;...&gt; \| null`. |
| `EV-09` | `src/domains/talent/recruiter-workbench.read-service.ts:673-691` (`placements` include) + `:725-813` (DTO assembly) | E0 include `placements[0]` rồi nhưng chưa chiếu `id` / `status` / `serviceModelSnapshot` lên DTO; F1 additive-edit projection theo C-03. |
| `EV-10` | `src/domains/talent/recruiter-workbench.read-service.ts:282-322` (`deriveNextAction` decision table) + `recruiter-workbench.types.ts:29-37` (7-value enum) | F1 dùng `nextAction` + (sau khi additive DTO merge) `placement?.status` + `placement?.managementMode` để gate UI controls. |
| `EV-11` | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` + `data-display/empty-state.tsx` + `sheet/slide-out-drawer.tsx` | UI primitives hiện hữu; F1 ADOPT. |
| `EV-12` | `package.json` (`lucide-react@^0.468.0`, `zod@^3.24.1`, `react-hook-form@^7.54.2`, `next@^15.1.3`, `react@^19.0.0`) | Deps đã có; F1 không cài mới. |
| `EV-13` | `app/admin/applications/page.tsx:289-401` (MP-3C fetch + Idempotency-Key wiring + panel error/success + refetch after action) | Canonical reference cho F1 fetch pattern (F1 wrap tương tự, KHÔNG reuse component). |
| `EV-14` | `src/domains/applications/placement-panel.tsx:78-112` (`ActionBar` controlled component) + `:364-365` (inline alert/status pattern) | Pattern reference cho F1 controls (F1 KHÔNG import MP-3C). |
| `EV-15` | `src/domains/applications/placement-ui.ts:182-186` (`newIdempotencyKey`) | UUID v4 helper pattern; F1 ADOPT pattern (raw UUID v4 ở client, server F0 strict UUID v4). |
| `EV-16` | `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` `ACCEPTED` §4.1.1 | F0 contract authoritative; F1 chỉ consume. |
| `EV-17` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` `ACCEPTED` §4 | E0 contract authoritative; F1 chỉ consume + additive-edit trong cùng slice (C-03). |
| `EV-18` | `docs/discovery/realignment/P1F1_PLACEMENT_ACTION_UI_RECONCILIATION.md` `v1.1` (cùng branch) | Capability matrix toàn diện + locked decisions + 0 Open Decisions. |
| `EV-19` | `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md` v1.1 | Capability matrix F0; F1 tham chiếu. |
| `EV-20` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §23-§30 | Roadmap authoritative; §29 = P1-F. |
| `EV-21` | `docs/N8N_AUTOMATION_BOUNDARY.md` §2, §4 | n8n KHÔNG nắm placement authority; F1 không gọi n8n. |
| `EV-22` | `origin/codex/t1a-p1e1-recruiter-workbench-ui` @ candidate HEAD | E1 candidate branch; F1 chờ `ACCEPTED` + merged main mới mở implementation round. |
| `EV-23` | `next/navigation` `useRouter().refresh()` (Next.js 15) | F1 dùng để refresh server component sau mỗi mutation thành công; KHÔNG dùng SWR; KHÔNG optimistic mutation. |
| `EV-24` | E0 `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening` | F1 derive `placementOptions` từ chain này trong cùng read-service slice (C-04). Dedupe theo `jobOpeningId`; deterministic order. |

## 3. Decisions

### 3.0 Decision state

- `Decision state = CLOSED` (10 Open Decisions từ v1.0 đã được T0 lock trong
  correction batch v1.1).
- `Open Owner decisions = 0` (xem §3.3 Locked decisions + §3.4 CHOSEN guardrails).
- T0 KHÔNG mở lại design review nếu dependency và source assumptions vẫn đúng
  (contract gate `ACCEPTED` + decision state `CLOSED`).

### 3.1 Build vs Adopt

`Build vs adopt = ADOPT` (toàn bộ stack hiện hữu).

| Reuse hiện hữu (ưu tiên 1) | Library/version/source | License | Wrapper boundary |
|---|---|---|---|
| 5 F0 routes | Repo internal | Repo | F1 chỉ `fetch(...)` qua HTTP (`recruiter-workbench.placement-actions.fetch.ts`). |
| E0 DTO (`RecruiterWorkbenchRow`) | Repo internal | Repo | F1 additive-edit trong cùng slice (C-03) để thêm `placement?: { id, status, jobOpeningId \| null, managementMode } \| null` + `placementOptions?: Array&lt;...&gt; \| null`. |
| `RecruiterWorkbenchListResponse` + `ServerDerivedNextAction` | Repo internal | Repo | F1 dùng để gate UI controls. |
| `placement.lifecycle.ts` (pure state machine) | Repo internal | Repo | F1 KHÔNG gọi trực tiếp (server authority). |
| `computeManagementMode` (pure helper) | Repo internal | Repo | F1 KHÔNG gọi; server derive (sau khi additive DTO merge). |
| `maskPhone` / `maskCccd` | `src/shared/privacy/mask.ts` | Repo internal | F1 KHÔNG gọi; DTO đã mask. |
| `DataTable` + URL state | `src/shared/ui/data-table/data-table.tsx` + `use-table-url-state.ts` | Repo internal | F1 ADOPT cho workbench table. |
| `SlideOutDrawer` | `src/shared/ui/sheet/slide-out-drawer.tsx` | Repo internal | F1 ADOPT cho Placement Action drawer. |
| `EmptyState` | `src/shared/ui/data-display/empty-state.tsx` | Repo internal | F1 ADOPT cho empty rows. |
| `lucide-react` icons | `lucide-react@^0.468.0` | MIT | F1 ADOPT cho action affordances. |
| `zod` cho preflight validation | `zod@^3.24.1` | MIT | F1 ADOPT. |
| `react-hook-form` cho evidence form | `react-hook-form@^7.54.2` | MIT | F1 ADOPT (optional; có thể dùng controlled state như MP-3C). |
| `crypto.randomUUID()` | Next.js 15 + browser native | MIT | F1 ADOPT cho Idempotency-Key (raw UUID v4, server F0 strict). |
| `next/navigation` `useRouter().refresh()` | Next.js 15 | MIT | F1 ADOPT để refresh server component sau success. KHÔNG dùng SWR; KHÔNG optimistic mutation. |
| Inline alert/status pattern | Pattern hiện hữu (`placement-panel.tsx:364-365`, `admin/applications/page.tsx:506-507`) | Repo internal | F1 ADOPT. |
| `sessionStorage` | Browser native | MIT | F1 ADOPT cho Idempotency-Key cache (per-tab, scoped theo placement/case id + command + canonical payload hash). |

| Adopt (ưu tiên 2) | Ghi chú |
|---|---|
| None. | Toàn bộ capability đã có trong repo. F1 không thêm dependency mới. |

| Đề xuất mới (ưu tiên 3) | Ghi chú |
|---|---|
| None trong F1. | Add E0 read-model extension (`placement?`, `placementOptions?`) đã được T0 chấp thuận trong cùng slice (C-03 + C-04). KHÔNG tạo E0 task riêng. |

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

### 3.3 Locked decisions (T0 verdict, v1.1)

Tất cả 10 Open Owner decisions từ v1.0 đã được T0 lock trong correction batch
v1.1. T0 KHÔNG mở lại batch này nếu dependency + source assumptions không đổi.

| ID | Decision | Status |
|---|---|---|
| `LOCK-01` | Read-model extension (DTO + projection) cho `placement?` + `placementOptions?` theo C-03 + C-04. E0 additive-edit trong cùng F1 implementation slice, KHÔNG mở E0 task riêng. | `LOCKED` |
| `LOCK-02` | `placement` shape (frozen): `placement: { id: string; status: PlacementStatus; jobOpeningId: string \| null; managementMode: 'HRP_MANAGED' \| 'CLIENT_MANAGED' } \| null` — chiếu từ `c.placements[0]` đã include sẵn, thêm `status: true, serviceModelSnapshot: true, jobOpeningId: true` vào `select`; `managementMode` derive qua `computeManagementMode` (server-side). | `LOCKED` |
| `LOCK-03` | `placementOptions` shape (frozen): `placementOptions: Array&lt;{ jobOpeningId: string; sourceCandidateSubmissionId: string; title: string; projectName: string \| null; companyName: string \| null }&gt;` — derive trong cùng read-service slice từ chain `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening`. Filter chỉ submission thực sự thuộc PlacementCase hiện tại; `jobOpening` non-null; dedupe theo `jobOpeningId` (khi nhiều submission cùng opening, chọn `createdAt DESC, id DESC`); deterministic order cho options. | `LOCKED` |
| `LOCK-04` | Server là lifecycle authority. UI chỉ ẩn/hiện action theo snapshot server trả về (`placement?.status`, `placement?.managementMode`); KHÔNG import hoặc copy `placement.lifecycle` state machine; KHÔNG fork `computeManagementMode`. | `LOCKED` |
| `LOCK-05` | HRP_MANAGED + CONFIRMED: KHÔNG render control **Đánh dấu hiệu lực** (UI gate). Nếu stale request do user manipulation → server trả 400 `PLACEMENT_VALIDATION_ERROR` → F1 render inline `&lt;p role="alert"&gt;` với server `message` (safe rendering, không leak metadata). | `LOCKED` |
| `LOCK-06` | CREATE / SELECTED interaction: right-side drawer / modal theo MP-3C pattern; single-row only; KHÔNG bulk. Modal step chọn `jobOpeningId` từ `placementOptions` (server-derived). Zero option → disable CREATE + hiển thị safe reason. One option → preselect + yêu cầu explicit confirm. Multiple options → user chọn 1 trong drawer. | `LOCKED` |
| `LOCK-07` | Pending state: per placement row/action. Disable toàn bộ mutation controls của cùng row trong lúc request đang `pending`. Mỗi control có spinner riêng; KHÔNG banner global. | `LOCKED` |
| `LOCK-08` | Refresh: dùng `Next` `useRouter().refresh()` (server component đọc lại canonical DTO) sau mọi successful mutation. KHÔNG cài SWR; KHÔNG thêm package; KHÔNG optimistic mutation cho placement status. | `LOCKED` |
| `LOCK-09` | Error / success presentation: inline `&lt;p role="alert"&gt;` / `&lt;p role="status"&gt;` pattern (xem MP-3C `placement-panel.tsx:364-365`). KHÔNG thêm Toast dependency. Canonical error codes map sang thông báo an toàn (§4.3). Generic 500 KHÔNG render raw `error.message` / `details` / `acknowledgementRef`. | `LOCKED` |
| `LOCK-10` | Evidence form UI: drawer form; RFC 3339 validation (`clientAcknowledgedAt`) + required `clientAcknowledgedByUserId` + required `acknowledgementRef`; giữ form state khi retry cùng payload (cùng Idempotency-Key). F0 route strict là authority. | `LOCKED` |
| `LOCK-11` | Audit display: KHÔNG tạo `placement.timeline` ở server và KHÔNG tạo client-side audit log. Canonical persisted state + evidence của F0 là authority. Audit-history UI ngoài phạm vi F1. | `LOCKED` |
| `LOCK-12` | Branch sequencing: F1 CHỜ P1-E1 ACCEPTED + merged trên main, sau đó T1B mở một docs-only materialization round (rebase/baseline theo updated main) để lật `Status = READY_FOR_EXECUTION` / `Next gate = TIER1_IMPLEMENTATION_FREEZE`. KHÔNG code trên shell E1 chưa ACCEPTED. | `LOCKED` |
| `LOCK-13` | Idempotency-Key semantics (frozen): per-tab `sessionStorage`; scope = `placement/case id + command + canonical payload hash`. Reuse cùng UUID v4 cho double-click + same unchanged payload + network uncertainty + 5xx retry. Mint UUID v4 mới khi payload edit hoặc chọn JobOpening khác. Clear key khi terminal success (200/201). KHÔNG auto retry khi validation/auth rejection. KHÔNG log key, evidence hay PII ở client. Server nhận raw UUID v4 (F0 strict); KHÔNG prefix `p1f1-`. | `LOCKED` |
| `LOCK-14` | UI integration boundary: F1 extend E1 `RecruiterWorkbenchTable` bằng một action-cell / client island hẹp. KHÔNG biến toàn bộ server page thành client-side data loader. Sau success gọi `router.refresh()` để server component đọc lại E0 canonical DTO. | `LOCKED` |
| `LOCK-15` | E0 route file: `app/api/admin/recruiter-workbench/route.ts` giữ nguyên shape v1.x nếu response tự serialize DTO mở rộng mà không cần sửa route. Nếu route thực sự cần sửa → vượt scope F1, mở E0 task riêng. | `LOCKED` |

### 3.4 CHOSEN guardrails (carry-over từ v1.0)

| ID | Decision | Status |
|---|---|---|
| `CHOSEN-01` | F1 chờ P1-E1 ACCEPTED trên main mới implement UI. Trong planning này, F1 document insertion points theo E0 DTO + E0 §4.4 + E0 `primaryActions` + UI primitives hiện hữu. F1 KHÔNG tự code UI shell. | `CHOSEN` |
| `CHOSEN-02` | F1 chỉ gọi 5 F0 HTTP routes (`/api/admin/placements/**`). KHÔNG gọi `placement.commands.ts` adapter trực tiếp. KHÔNG mở Prisma transaction ở client. | `CHOSEN` |
| `CHOSEN-03` | F1 chỉ wrap role gate qua UI (ẩn controls khi role ≠ ADMIN && ≠ HR_MANAGER). Server vẫn là authority. | `CHOSEN` |
| `CHOSEN-04` | F1 KHÔNG thêm dependency mới (no Radix, no MUI, no shadcn, no SWR). ADOPT Tailwind + design tokens + `SlideOutDrawer` + `DataTable` + `EmptyState` + `lucide-react` + `zod` + `react-hook-form` + `sessionStorage` + `crypto.randomUUID()` + Next `useRouter().refresh()`. | `CHOSEN` |
| `CHOSEN-05` | F1 KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`. | `CHOSEN` |
| `CHOSEN-06` | F1 KHÔNG đụng F0 service / lifecycle / errors / route helper / 5 routes. | `CHOSEN` |
| `CHOSEN-07` | F1 KHÔNG đụng E0 task docs (`docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**`). E0 source files additive-edit được trong cùng slice theo C-03. | `CHOSEN` |
| `CHOSEN-08` | F1 KHÔNG đụng MP-3C legacy (`placement-ui.ts`, `placement-panel.tsx`, `app/admin/applications/**`). Chỉ ADOPT pattern (controlled props, inline message, disabled-while-saving, sessionStorage scoping) chứ không reuse component. | `CHOSEN` |
| `CHOSEN-09` | F1 KHÔNG tự tính lifecycle state machine ở client. F1 chỉ hiển thị controls theo current status mà server đã trả (qua `placement` projection ở LOCK-02). | `CHOSEN` |
| `CHOSEN-10` | F1 KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07 + Plan §29). | `CHOSEN` |
| `CHOSEN-11` | F1 KHÔNG mở outbox/event producer, KHÔNG gọi n8n, KHÔNG PII export. | `CHOSEN` |
| `CHOSEN-12` | F1 KHÔNG sửa `docs/PLANNER_HANDOVER.md` (T0-owned). | `CHOSEN` |
| `CHOSEN-13` | F1 KHÔNG sửa NAV-01 sidebar/menu (task riêng). | `CHOSEN` |
| `CHOSEN-14` | Round này dừng ở `BLOCKED` / `ACCEPTED` / `CLOSED`; KHÔNG mở PR, KHÔNG gọi T3, KHÔNG code. Chờ P1-E1 ACCEPTED + merged main. | `CHOSEN` |
| `CHOSEN-15` | Khi P1-E1 ACCEPTED + merged main, T1B mở docs-only materialization round (rebase/baseline theo updated main) → lật `Status = READY_FOR_EXECUTION` / `Next gate = TIER1_IMPLEMENTATION_FREEZE`. Implementation round theo sau. | `CHOSEN` |

### 3.5 Build vs Adopt (v1.1 evidence summary)

`Lock-01..Lock-15` đều ưu tiên 1 (Adopt). F1 KHÔNG fork helper, KHÔNG fork
state machine, KHÔNG cài package mới. Add E0 read-model extension (LOCK-01..03)
thuộc cùng slice nhưng là projection change, KHÔNG phải build mới primitive.

## 4. Contract

### 4.1 Functional requirements (RQ → STEP → AC)

RQ → STEP → AC traceability matrix. STEP values are `STEP-01..STEP-12` (planned
implementation sequence in §5.1); AC values are `AC-01..AC-19` (§6).

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-02 | AC-02, AC-09 |
| `RQ-02` | STEP-05 | AC-02, AC-10 |
| `RQ-03` | STEP-02 | AC-02, AC-09 |
| `RQ-04` | STEP-02 | AC-04 |
| `RQ-05` | STEP-02 | AC-04 |
| `RQ-06` | STEP-04 | AC-12 |
| `RQ-07` | STEP-05 | AC-06 |
| `RQ-08` | STEP-05 | AC-06 |
| `RQ-09` | STEP-04 | AC-12 |
| `RQ-10` | STEP-04 | AC-13 |
| `RQ-11` | STEP-05 | AC-07, AC-09 |
| `RQ-12` | STEP-06 | AC-08 |
| `RQ-13` | STEP-05 | AC-06 |
| `RQ-14` | STEP-08 | AC-11 |
| `RQ-15` | STEP-08 | AC-15 |
| `RQ-16` | STEP-09 | AC-09 |
| `RQ-17` | STEP-09 | AC-09 |
| `RQ-18` | STEP-09 | AC-18 |
| `RQ-19` | STEP-08 | AC-15 |
| `RQ-20` | STEP-08 | AC-15 |
| `RQ-21` | STEP-02 | AC-19 |
| `RQ-22` | STEP-08 | AC-19 |
| `RQ-23` | STEP-04 | AC-09 |
| `RQ-24` | STEP-05 | AC-19 |
| `RQ-25` | STEP-04 | AC-19 |

#### 4.1.1 Detailed requirement table

| ID | Requirement | Verification method |
|---|---|---|
| `RQ-01` | F1 chỉ gọi 5 F0 HTTP routes: `POST /api/admin/placements` (create); `POST /api/admin/placements/[id]/actions/confirm`; `POST /api/admin/placements/[id]/actions/effective`; `POST /api/admin/placements/[id]/actions/fail`; `POST /api/admin/placements/[id]/actions/cancel`. F1 KHÔNG gọi `placement.commands.ts` adapter trực tiếp. F1 KHÔNG mở Prisma transaction. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` assert fetch helper gọi đúng URL + method + headers + body cho 5 actions. AST guard verify F1 KHÔNG import `@/src/domains/talent/placement.commands` (adapter) và KHÔNG import `@/src/shared/integrity/idempotency/**`. |
| `RQ-02` | F1 wrap role gate qua UI: chỉ `ADMIN` / `HR_MANAGER` thấy placement action controls. Role khác thấy controls bị ẩn. Server vẫn là authority (nếu hack qua network → 403 `FORBIDDEN`). | Unit test render component với role khác nhau; assert controls absent. Integration test cover 403 qua route handler. |
| `RQ-03` | F1 mints raw UUID v4 cho `Idempotency-Key` (Next.js 15 `crypto.randomUUID()`); wrap qua per-tab `sessionStorage` scope `placement/case id + command + canonical payload hash`. Reuse cùng key cho double-click/same unchanged payload/network uncertainty/5xx deliberate retry; mint key mới cho payload edit hoặc JobOpening đổi; clear key khi terminal success (200/201); KHÔNG auto retry ở 4xx validation/auth; raw UUID v4 không prefix. Server F0 strict UUID v4 thuần (`placement.route-helpers.ts:247-277`). | Unit test assert `Idempotency-Key` header present + valid UUID v4 + reused across same-payload double-click + refreshed on payload edit + cleared on terminal success + isolated giữa 2 rows / 2 commands + scoping theo canonical payload hash. AST guard verify KHÔNG có `p1f1-` prefix. |
| `RQ-04` | E0 additive-edit `RecruiterWorkbenchRow` projection trong cùng F1 slice (LOCK-02 + C-03) thêm `placement?: { id, status, jobOpeningId \| null, managementMode } \| null`; nguồn `c.placements[0]` đã include sẵn — thêm `status: true, serviceModelSnapshot: true, jobOpeningId: true` vào select; derive `managementMode` server-side qua `computeManagementMode`. | Unit test `src/domains/talent/recruiter-workbench.read-service.test.ts` cover additive projection. DB integration test in `tests/db/recruiter-workbench.integration.test.ts` cover end-to-end với synthetic DB. |
| `RQ-05` | E0 additive-edit `RecruiterWorkbenchRow` thêm `placementOptions?: Array&lt;{ jobOpeningId, sourceCandidateSubmissionId, title, projectName, companyName }&gt; \| null` (LOCK-03 + C-04). Source chain `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening`. Dedupe theo `jobOpeningId`; deterministic order; chỉ submission thuộc PlacementCase hiện tại; `jobOpening` non-null. Zero / one / multiple options đều cover. | Unit test cover zero / one / multiple / dedupe / cross-case isolation. DB integration test cover cross-case isolation với synthetic DB. |
| `RQ-06` | F1 render CREATE control chỉ khi `placement === null` && `placementOptions !== null` && `placementOptions.length > 0` && role ∈ {ADMIN, HR_MANAGER}. Zero option → disable CREATE + safe reason; one option → preselect + explicit confirm; multiple → user chọn trong drawer. | Unit test render với `placement`, `placementOptions` khác nhau; assert drawer behavior. |
| `RQ-07` | F1 render CONFIRM control chỉ khi `placement?.status === 'SELECTED'`. Confirm dialog yêu cầu explicit click. Double-click bị disable (R-F1-04 disabled-while-saving pattern). | Unit test render với các `placement.status` khác nhau + assert double-click không gửi 2 request. Integration test cover replay qua duplicate header. |
| `RQ-08` | F1 render EFFECTIVE control chỉ khi `placement?.status === 'CONFIRMED' && placement?.managementMode === 'CLIENT_MANAGED'`. HRP-Managed: control bị ẩn hoàn toàn. EFFECTIVE mở evidence form (datetime-local `clientAcknowledgedAt` + `clientAcknowledgedByUserId` + `acknowledgementRef`, RFC 3339 validation). Server vẫn là authority. | Unit test render với HRP-managed vs Client-managed + assert controls absent cho HRP-managed. Unit test evidence form validation (RFC 3339 cho timestamp). Integration test cover HRP-managed EFFECTIVE REJECT (400 `PLACEMENT_VALIDATION_ERROR`). |
| `RQ-09` | F1 render FAIL / CANCEL control chỉ khi `placement?.status ∈ {'SELECTED', 'CONFIRMED'}`. Confirm dialog yêu cầu explicit click. Server vẫn là authority. | Unit test render với các `placement.status` khác nhau. Integration test cover FAIL/CANCEL reject sau EFFECTIVE (409). |
| `RQ-10` | F1 render action controls dựa trên (a) E0 server-derived `nextAction` (7-value closed enum, `recruiter-workbench.types.ts:29-37`) + (b) `placement?.status` + (c) `placement?.managementMode`. F1 KHÔNG tự tính `canTransition` ở client. | Unit test assert controls absent khi thiếu data. |
| `RQ-11` | F1 refresh server component qua `useRouter().refresh()` (Next 15) sau mọi successful mutation. KHÔNG dùng SWR; KHÔNG optimistic mutation cho placement status. | Unit test assert `router.refresh()` được gọi sau success. Integration test end-to-end verify row refresh sau mỗi command. |
| `RQ-12` | F1 render 4xx / 5xx error từ F0 route verbatim (server `message` + `details?` cho 400 `PLACEMENT_VALIDATION_ERROR` không chứa PII fields). KHÔNG leak raw `error.message` / `details` / `acknowledgementRef` nếu server trả generic 500. KHÔNG log raw actorId, request body, evidence, `acknowledgementRef`, tokens, `Idempotency-Key`, PII ở client. | Unit test assert error rendering cho 400/401/403/404/409/500. Integration test cover từng error code. |
| `RQ-13` | F1 KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07; Plan §29). Service `markPlacementEffective` đã enforce zero side-effects; F1 chỉ gọi HTTP, KHÔNG gọi service trực tiếp. | Integration test cover Client-managed EFFECTIVE + verify Worker/Episode/Assignment table KHÔNG có row mới. |
| `RQ-14` | F1 KHÔNG mở outbox/event producer; KHÔNG gọi n8n; KHÔNG PII export. F1 chỉ inline alert/status pattern. | AST guard + grep verify F1 KHÔNG import `@/src/shared/integrity/outbox/**`. |
| `RQ-15` | F1 KHÔNG fork `src/shared/integrity/idempotency/**`; chỉ wrap consumer-side (mints raw UUID v4 ở client) + scope qua per-tab `sessionStorage`. | AST guard verify F1 KHÔNG import helper internals. |
| `RQ-16` | F1 KHÔNG đụng F0 / MP-3C / A0 / A1 / B / C / D / PLANNER_HANDOVER / F0 / E1 task docs. | `git status --porcelain` chỉ chứa in-scope roots §0; `git diff --cached --stat` = 0 hit cho forbidden paths. |
| `RQ-17` | F1 KHÔNG đụng schema/migration/package/lockfile/CI/Next config. | Same as RQ-16. |
| `RQ-18` | F1 KHÔNG sửa `permission-catalog.ts` hoặc `prisma/seed.mjs`. F1 KHÔNG thêm `CAN_*` placement code. | AST guard verify. |
| `RQ-19` | F1 KHÔNG fork `src/shared/auth/with-db-context.ts` / `with-authorized-db.ts` / `auth-context.ts` / `rls-context.ts`; F1 chỉ consume qua route. | AST guard verify. |
| `RQ-20` | F1 KHÔNG đổi response shape của `app/api/admin/recruiter-workbench/route.ts` nếu không thực sự cần. Nếu DTO additive tự serialize thì KHÔNG sửa route. Nếu cần thay đổi → vượt scope F1, mở E0 task riêng. | `git diff --check` + AST guard verify F1 KHÔNG sửa route handler. |
| `RQ-21` | F1 `placementOptions` không được expose options từ PlacementCase khác (cross-case isolation). Verify bằng DB integration test tạo 2 case với options overlap → assert option chỉ thuộc case hiện tại. | Integration test synthetic DB cover cross-case isolation. |
| `RQ-22` | F1 derive `placementOptions` qua cùng slice E0 `recruiter-workbench.read-service.ts`. Submission chain `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening`. Dedupe theo `jobOpeningId`; deterministic order. | Unit test cover dedupe + order + filter (only submissions của PlacementCase hiện tại). DB integration test cover cross-case isolation. |
| `RQ-23` | F1 gửi `jobOpeningId` + `sourceCandidateSubmissionId` từ option được user chọn (browser ↔ server pair integrity). F1 KHÔNG dùng selector global, KHÔNG để browser tự đề xuất arbitrary JobOpening. | Unit test cover payload assembly từ option state + assert pair integrity. |
| `RQ-24` | F1 không cài Toast / SWR / optimistic-update package. UI dependencies locked vào danh sách `Build vs Adopt` (§3.1). | `git diff --check` + `git diff --cached package.json package-lock.json` không thay đổi. |
| `RQ-25` | F1 không log raw `Idempotency-Key` (raw hay prefix đều cấm ở client log), raw actorId, raw request body, raw evidence, `acknowledgementRef`, tokens, PII. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` grep assert không có `console.log` với các field cấm. |

#### 4.1.2 Body shape (locked — F0 contract authoritative)

| Action | Endpoint | Body | Headers |
|---|---|---|---|
| CREATE | `POST /api/admin/placements` | `{ placementCaseId: string, jobOpeningId: string, sourceCandidateSubmissionId: string }` (strict — cả 3 field required) | `Idempotency-Key: &lt;raw UUID v4&gt;` required; cookie auth (Next.js session) |
| CONFIRM | `POST /api/admin/placements/[id]/actions/confirm` | `{}` (strict) | `Idempotency-Key: &lt;raw UUID v4&gt;` required |
| EFFECTIVE | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt: ISO-8601 RFC 3339, clientAcknowledgedByUserId: string, acknowledgementRef: string } }` (strict) | `Idempotency-Key: &lt;raw UUID v4&gt;` required |
| FAIL | `POST /api/admin/placements/[id]/actions/fail` | `{}` (strict) | `Idempotency-Key: &lt;raw UUID v4&gt;` required |
| CANCEL | `POST /api/admin/placements/[id]/actions/cancel` | `{}` (strict) | `Idempotency-Key: &lt;raw UUID v4&gt;` required |

#### 4.1.3 Response shape (locked — F0 contract authoritative)

| Action | 2xx | 4xx / 5xx |
|---|---|---|
| CREATE | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | `{ error: &lt;code&gt;, message: &lt;message&gt;, details?: &lt;details&gt; }` |
| CONFIRM | `200 { placementId, status: 'CONFIRMED', replayed }` | Same as create |
| EFFECTIVE | `200 { placementId, status: 'EFFECTIVE', replayed }` | Same as create (HRP-managed → 400 `PLACEMENT_VALIDATION_ERROR`) |
| FAIL | `200 { placementId, status: 'FAILED', replayed }` | Same as create |
| CANCEL | `200 { placementId, status: 'CANCELLED', replayed }` | Same as create |

### 4.2 Component insertion points (planned)

| Insertion point | Component (planned) | Source primitive | Depends on |
| --- | --- | --- | --- |
| Row actions column (action-cell / client island) | `&lt;PlacementActionCell row={row} role={role} options={row.placementOptions} onAction={...} /&gt;` | Custom (Tailwind); narrow client island | E0 DTO có `placement?` (`LOCK-02`) + `placementOptions?` (`LOCK-03`) |
| Detail / action drawer (right-side) | `&lt;PlacementActionDrawer open={open} placement={row.placement} options={row.placementOptions} onClose={...} onChanged={() =&gt; router.refresh()} />` | `SlideOutDrawer` (ADOPT) | `LOCK-02`, `LOCK-03` |
| Confirmation dialog (Confirm / Fail / Cancel) | `&lt;ConfirmPlacementActionDialog kind="confirm\|fail\|cancel" placementId={...} onConfirm={...} onCancel={...} pending={...} /&gt;` | Custom (Tailwind, no Radix) | None |
| EFFECTIVE evidence form | `&lt;EffectiveEvidenceForm value={...} onChange={...} pending={...} onSubmit={...} /&gt;` (drawer form; giữ state khi retry cùng Idempotency-Key) | Custom (Tailwind) + zod preflight (RFC 3339) | None |
| Evidence-state guard cho retry | SessionStorage scope `placementId + 'placement.effective' + canonical payload hash` reuse Idempotency-Key trong retry cùng payload | sessionStorage (ADOPT) | None |
| Inline error / success banner | `&lt;p role="alert"&gt;` / `&lt;p role="status"&gt;` (LOCK-09) | Inline pattern hiện hữu | None |

### 4.3 Error → UI mapping (locked)

| Status | `READY_FOR_AUDIT` (implementation round done; LOCK-01..LOCK-15 shipped; canonical gates PASS; awaiting T3 LIGHT audit round 1) |
|---|---|---|
| `201` / `200` | (success) | Inline `&lt;p role="status"&gt;`: "Đã {action}." + `router.refresh()` + clear sessionStorage key cho scope. |
| `400` | `VALIDATION` | Inline `&lt;p role="alert"&gt;`: server `message`. SessionStorage key giữ nguyên. |
| `400` | `IDEMPOTENCY_REQUIRED` | Inline `&lt;p role="alert"&gt;`: "Thiếu Idempotency-Key — không retry được." (lỗi client bug; surface cho dev). |
| `400` | `PLACEMENT_VALIDATION_ERROR` | Inline `&lt;p role="alert"&gt;`: server `message` (e.g. "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Strip `acknowledgementRef` / `clientAcknowledgedByUserId` nếu lẫn trong `details`. |
| `401` | `NO_TOKEN` / `INVALID_TOKEN` / `USER_INACTIVE` / `USER_NOT_FOUND` | Hard-redirect tới `/login` (Next.js convention). |
| `403` | `FORBIDDEN` | Inline `&lt;p role="alert"&gt;`: "Role {role} không có quyền placement command." |
| `404` | `PLACEMENT_NOT_FOUND` | Inline `&lt;p role="alert"&gt;`: "Placement không tồn tại — đã refresh danh sách." + `router.refresh()`. |
| `409` | `INVALID_STATE_TRANSITION` | Inline `&lt;p role="alert"&gt;`: "Trạng thái đã thay đổi — đã refresh danh sách." + `router.refresh()`. |
| `409` | `PLACEMENT_IDEMPOTENCY_CONFLICT` / `IDEMPOTENCY_CONFLICT` | Inline `&lt;p role="alert"&gt;`: "Idempotency-Key đã dùng với payload khác." |
| `500` | `INTERNAL` | Inline `&lt;p role="alert"&gt;`: "Đã có lỗi máy chủ — vui lòng thử lại." KHÔNG leak `message` / `details`. Button "Thử lại" mint fresh Idempotency-Key (deliberate, KHÔNG auto retry). |

### 4.4 Action ↔ F0 route ↔ body ↔ effect mapping

| Action (UI label) | UI gating (locked) | F0 route | Body | 200/201 response | Effect on UI |
| --- | --- | --- | --- | --- | --- |
| "Chọn ứng viên" (CREATE) | `nextAction === 'REVIEW_PLACEMENT'` && `placement === null` && `placementOptions.length > 0` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements` | `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId }` | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | `router.refresh()`; new `placement.id`, `placement.status = 'SELECTED'`, `placement.managementMode = computeManagementMode(serviceModelSnapshot)`, `placement.jobOpeningId`. |
| "Xác nhận" (CONFIRM) | `placement?.status === 'SELECTED'` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/confirm` | `{}` | `200 { placementId, status: 'CONFIRMED', replayed }` | `router.refresh()`; `placement.status = 'CONFIRMED'`. |
| "Đánh dấu hiệu lực" (EFFECTIVE) | `placement?.status === 'CONFIRMED' && placement?.managementMode === 'CLIENT_MANAGED'` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt, clientAcknowledgedByUserId, acknowledgementRef } }` | `200 { placementId, status: 'EFFECTIVE', replayed }` | `router.refresh()`; `placement.status = 'EFFECTIVE'`; case auto-closes (`caseStatus = 'CLOSED'`). |
| "Đánh dấu thất bại" (FAIL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/fail` | `{}` | `200 { placementId, status: 'FAILED', replayed }` | `router.refresh()`; `placement.status = 'FAILED'`. |
| "Hủy chọn" (CANCEL) | `placement?.status ∈ {'SELECTED', 'CONFIRMED'}` && role ∈ {ADMIN, HR_MANAGER} | `POST /api/admin/placements/[id]/actions/cancel` | `{}` | `200 { placementId, status: 'CANCELLED', replayed }` | `router.refresh()`; `placement.status = 'CANCELLED'`. |

**Server authoritative**: mọi role gate, status gate, managementMode gate phải được F0 server enforce. Client gate chỉ là UX (ẩn/disabled), KHÔNG phải security boundary. Nếu client gate sai, server trả 400/403/409 và F1 render message thân thiện.

### 4.5 `placementOptions` semantics (locked — C-04)

`placementOptions` là server-derived collection, derived trong E0 read-service
slice. Tính chất frozen:

- Nguồn duy nhất: `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening`.
- Filter: chỉ `CandidateSubmission` thực sự thuộc `PlacementCase` hiện tại
  (qua submission chain FK), `jobOpening` non-null.
- Dedupe: theo `jobOpeningId`. Nếu nhiều submission cùng opening, chọn
  `sourceCandidateSubmissionId` deterministic: `createdAt DESC, id DESC`.
- Output order: deterministic; sort theo `(projectName, companyName, title, jobOpeningId)`.
- Cross-case isolation: KHÔNG bao giờ expose JobOpening của PlacementCase khác.
- Empty case: `placementOptions = []` → CREATE disabled + safe reason render
  (`&lt;p role="status"&gt;` "Chưa có JobOpening phù hợp — kiểm tra submissions.").
- Single option: preselect nhưng KHÔNG auto-submit; user phải explicit confirm.
- Multiple: user chọn trong drawer / modal.

## 5. Execution Plan

### 5.1 Steps (sequence)

1. **Read-only reconciliation** ✅ (round v1.0 + v1.1): đã inspect F0 commands,
   F0 routes, F0 service, F0 errors, E0 DTO, E0 read-service, E0 types, E1
   candidate branch, MP-3C placement-panel pattern.
2. **Author 2 docs v1.0** ✅ (round v1.0): `RECON` + `TASK` v1.0 `DRAFT`.
3. **T0 review + correction batch v1.1** ✅ (round v1.1): `RECON` + `TASK`
   v1.1 `ACCEPTED` với 10 Locked decisions + Status `BLOCKED` /
   Decision state `CLOSED`.
4. **(future) Materialization round** (chưa mở — chờ P1-E1 ACCEPTED + merged):
   - T1B mở docs-only materialization round rebase/baseline theo updated main.
   - Lật `Status = READY_FOR_EXECUTION`, `Next gate = TIER1_IMPLEMENTATION_FREEZE`.
   - KHÔNG mở lại design review nếu dependency + source assumptions vẫn đúng.
5. **(future) Implementation round** (chưa mở — sau materialization):
   - **STEP-01**: chờ P1-E1 ACCEPTED + merged main. Khởi tạo
     `src/domains/talent/recruiter-workbench.placement-actions.*` skeleton.
   - **STEP-02**: additive-edit `src/domains/talent/recruiter-workbench.types.ts`
     + `recruiter-workbench.read-service.ts` + `.read-service.test.ts`:
     thêm `placement?` (`LOCK-02`) + `placementOptions?` (`LOCK-03`).
     Update integration test `tests/db/recruiter-workbench.integration.test.ts`
     không contradictory.
   - **STEP-03**: implement `recruiter-workbench.placement-actions.fetch.ts`
     (fetch helper wrap 5 F0 routes + `Idempotency-Key` scoping qua
     `sessionStorage` theo `placement/case id + command + canonical payload
     hash`; raw UUID v4; reuse / mint / clear theo `LOCK-13`).
   - **STEP-04**: implement `recruiter-workbench.placement-actions.states.ts`
     (pure state helper: `availableActionsForRow`, `formatErrorMessage`,
     `hashCanonicalPayload`, `formatEvidencFormState`).
   - **STEP-05**: implement `recruiter-workbench.placement-actions.tsx`
     (controlled components: `&lt;PlacementActionCell&gt;`,
     `&lt;PlacementActionDrawer&gt;`, `&lt;ConfirmPlacementActionDialog&gt;`,
     `&lt;EffectiveEvidenceForm&gt;`).
   - **STEP-06**: integrate action-cell / client island vào E1 shell tại
     `app/admin/recruiter-workbench/**` (phải là narrow island, KHÔNG biến
     cả page thành client loader — `LOCK-14`). Sau success gọi
     `router.refresh()`.
   - **STEP-07**: unit tests (`*.test.tsx` + `*.fetch.test.ts`) cover
     role/status/managementMode × 7 nextAction × 4 commands × 2 role gates,
     sessionStorage idempotency-key behavior (reuse / mint / clear /
     scope isolation), evidence form RFC 3339 + retry persistence,
     placementOptions zero/one/multiple/dedupe/render.
   - **STEP-08**: DB integration test (`tests/db/p1f1-placement-action-ui.integration.test.ts`):
     CREATE / CONFIRM / EFFECTIVE (Client-managed + HRP-managed REJECT) /
     FAIL / CANCEL + replay + 409 race + cross-case `placementOptions`
     isolation + cross-case option leakage guard.
   - **STEP-09**: chạy required gates (§0).
   - **STEP-10**: HANDOFF + AUDIT + freeze SHA.
   - **STEP-11** (planning): nếu N-series mở sau này, F1 sẽ tích hợp subscribe
     `PlacementTransitionCommitted` event nhưng KHÔNG mở trong F1 v1.1.
   - **STEP-12** (planning): regression guard cho placement lifecycle bên
     server — mỗi mutation F1 gọi vẫn check tính duy nhất của state machine.

### 5.2 Test plan (planned, cho implementation round)

#### 5.2.1 Unit tests (vitest + react-dom/server)

- `recruiter-workbench.placement-actions.test.tsx` — controlled components:
  - `&lt;PlacementActionCell&gt;` render với 7-value `nextAction` × 5-value
    `placement.status` × 2-value `placement.managementMode` × 3-value role ×
    3-value `placementOptions.length` (zero / one / multiple).
  - `&lt;ConfirmPlacementActionDialog&gt;` render với kind ∈ {confirm, fail, cancel}.
  - `&lt;EffectiveEvidenceForm&gt;` validation: RFC 3339 `clientAcknowledgedAt` +
    non-empty `clientAcknowledgedByUserId` + non-empty `acknowledgementRef`.
  - `formatErrorMessage()` map từng canonical error code sang safe message.
- `recruiter-workbench.placement-actions.fetch.test.ts` — fetch helper:
  - Mock `fetch`; assert URL + method + headers (raw UUID v4, no prefix) + body
    cho 5 actions.
  - Mock `sessionStorage`; assert scoped key (placement/case id + command +
    canonical payload hash).
  - Assert reuse cùng key cho double-click / same-payload / deliberate 5xx
    retry.
  - Assert mint key mới cho payload edit / different JobOpening.
  - Assert clear key on terminal success.
  - Assert isolation giữa 2 rows / 2 commands (sessionStorage keyed).
  - Assert refetch bằng `router.refresh()` (mock `useRouter()`) sau success.
  - Assert error rendering for 400/401/403/404/409/500.
- `recruiter-workbench.read-service.test.ts` (additive) — pure projection:
  - Cover `placement` projection (LOCK-02) với case chưa có placement vs case
    có placement SELECTED vs CONFIRMED vs EFFECTIVE.
  - Cover `placementOptions` derivation (LOCK-03) với zero / one / multiple
    options + dedupe + deterministic order + cross-case isolation guard.

#### 5.2.2 Integration tests (vitest + synthetic DB)

- `tests/db/p1f1-placement-action-ui.integration.test.ts`:
  - End-to-end CREATE → 201 → `router.refresh()` cycle (server-side) → row
    refreshed với `placement.status = 'SELECTED'` + `managementMode` derived.
  - End-to-end CONFIRM → 200 → refresh → `placement.status = 'CONFIRMED'`.
  - End-to-end EFFECTIVE (Client-managed) → 200 → refresh → EFFECTIVE +
    case auto-closes (`caseStatus = 'CLOSED'`) + verify Worker/Episode/
    Assignment table KHÔNG có row mới.
  - End-to-end EFFECTIVE (HRP-managed) → 400 `PLACEMENT_VALIDATION_ERROR` +
    verify zero mutation.
  - End-to-end FAIL → 200 → refresh → FAILED state.
  - End-to-end CANCEL → 200 → refresh → CANCELLED state.
  - End-to-end CANCEL sau EFFECTIVE → 409 `INVALID_STATE_TRANSITION`.
  - Replay: same `Idempotency-Key` + same payload (qua sessionStorage scoping)
    → `replayed: true`.
  - Conflict: same `Idempotency-Key` + different payload → 409
    `IDEMPOTENCY_CONFLICT`.
  - Role hide: HR_STAFF role → 403 qua route handler (server authority).
  - 404 `PLACEMENT_NOT_FOUND` (race) → refresh + safe message.
  - 500 unexpected → inline alert generic + button "Thử lại" mint fresh key,
    KHÔNG auto retry.
  - Cross-case isolation: tạo 2 PlacementCase, mỗi case có submissions riêng
    + cùng jobOpeningId; assert `placementOptions` của case A không bao giờ
    chứa submission của case B.
  - Dedupe: cùng jobOpeningId qua 2 submissions của cùng case → chỉ 1 option
    + `sourceCandidateSubmissionId` deterministic theo `createdAt DESC, id DESC`.
  - Zero-option disable: case không có submission nào → CREATE control absent
    + safe reason render.

#### 5.2.3 Static / AST guards

- F1 KHÔNG import `@/src/domains/talent/placement.commands` (adapter).
- F1 KHÔNG import `@/src/shared/integrity/idempotency/**` (helper).
- F1 KHÔNG import `@/src/domains/talent/placement.lifecycle` (state machine).
- F1 KHÔNG import `@/src/domains/talent/placement.service` (production service).
- F1 KHÔNG import `@/src/shared/auth/with-db-context` / `with-authorized-db`.
- F1 KHÔNG import `@/src/shared/integrity/outbox/**`.
- F1 KHÔNG dùng `swr` (cấm import) hoặc package tương đương.
- F1 KHÔNG có `console.*` log với raw actorId / request body / evidence /
  acknowledgementRef / tokens / Idempotency-Key / PII.
- F1 KHÔNG sửa `permission-catalog.ts`, `prisma/seed.mjs`, `schema.prisma`,
  `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`,
  `.github/workflows/ci.yml`, `vitest.unit.config.ts`,
  `vitest.integration.config.ts`.
- F1 KHÔNG prefix `Idempotency-Key` bằng `p1f1-` hoặc bất kỳ namespace nào.

## 6. Acceptance

| ID | Acceptance criterion | Verification |
|---|---|---|
| `AC-01` | E0 additive `placement?: { id, status, jobOpeningId \| null, managementMode } \| null` projection trên `RecruiterWorkbenchRow` (LOCK-02). | `npm run test:unit -- src/domains/talent/recruiter-workbench.read-service.test.ts` cover additive projection. DB integration test in `tests/db/recruiter-workbench.integration.test.ts` cover end-to-end. |
| `AC-02` | F1 render đúng 5 actions (CREATE / CONFIRM / EFFECTIVE / FAIL / CANCEL) cho role ADMIN/HR_MANAGER với state `nextAction` + `placement.status` + `placement.managementMode` + `placementOptions.length` tương ứng. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render 8+ states. |
| `AC-03` | F1 KHÔNG render bất kỳ action controls nào cho role ≠ ADMIN && ≠ HR_MANAGER. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render với HR_STAFF/CTV/PUBLIC; assert controls absent. |
| `AC-04` | F1 wrap 5 F0 routes qua fetch helper; KHÔNG gọi `placement.commands.ts` adapter trực tiếp; KHÔNG mở Prisma transaction ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` mock fetch + assert URL/method/headers/body. AST guard verify F1 KHÔNG import private F0 internals. |
| `AC-05` | F1 mints raw UUID v4 cho `Idempotency-Key`; scoped qua per-tab `sessionStorage` theo `placement/case id + command + canonical payload hash`. Reuse key cho double-click / same unchanged payload / network uncertainty / 5xx deliberate retry; mint key mới cho payload edit hoặc JobOpening đổi; clear key khi terminal success; KHÔNG auto retry ở 4xx validation/auth. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` assert header presence + valid UUID v4 + scoped reuse / mint / clear; isolation test giữa 2 rows. |
| `AC-06` | F1 render đúng theo `placement.status` (5-value) × `placement.managementMode` (2-value) theo §4.4. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` parameterized render. |
| `AC-07` | F1 refresh server component qua `useRouter().refresh()` (Next 15) sau mọi successful mutation. KHÔNG cài SWR; KHÔNG optimistic mutation cho placement status. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` assert `router.refresh()` được gọi sau success. Integration test end-to-end verify row refresh. |
| `AC-08` | F1 render 4xx / 5xx error từ F0 route theo §4.3 mapping; 500 render generic. KHÔNG leak raw `error.message` / `details` / `acknowledgementRef` ở 500. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` mock fetch với 400/401/403/404/409/500; assert rendered message + không có field cấm leak. |
| `AC-09` | F1 KHÔNG fork `src/shared/integrity/idempotency/**`, `placement.lifecycle.ts`, `placement.commands.ts`, `placement.route-helpers.ts`. F1 KHÔNG sửa F0 / E0 task docs / MP-3C / A0 / A1 / B / C / D / F0 / E1 / PLANNER_HANDOVER. F1 KHÔNG sửa E0 route handler trừ khi thực sự cần. | `git status --porcelain` chỉ chứa in-scope roots §0. AST guard verify. |
| `AC-10` | F1 KHÔNG đụng schema/migration/package/lockfile/CI/Next config. | `git status --porcelain` chỉ chứa in-scope roots §0 (no `prisma/`, `package*.json`, `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`). |
| `AC-11` | F1 KHÔNG tự tính `canTransition` / `computeManagementMode` ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.states.test.ts` AST guard. |
| `AC-12` | F1 KHÔNG log raw actorId / request body / evidence / `acknowledgementRef` / tokens / `Idempotency-Key` (raw hay `p1f1-` prefix đều cấm ở client log) / PII ở client. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` grep assert không có `console.log` với các field cấm. |
| `AC-13` | F1 KHÔNG mở outbox/event producer; KHÔNG gọi n8n; KHÔNG PII export. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` AST guard. |
| `AC-14` | F1 EFFECTIVE bị ẩn hoàn toàn khi `placement?.managementMode === 'HRP_MANAGED'`. Server response 400 `PLACEMENT_VALIDATION_ERROR` cho stale request render safe inline alert. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render với HRP-managed; assert EFFECTIVE control absent. Integration test cover HRP-managed EFFECTIVE REJECT. |
| `AC-15` | F1 render đúng E0 additive `placement` + `placementOptions` theo LOCK-02 + LOCK-03 + §4.5. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` parameterized render. |
| `AC-16` | F1 render đúng cho tất cả 7-value `nextAction` enum. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.test.tsx` render với 7 states; assert controls đúng cho từng state. |
| `AC-17` | F1 KHÔNG sửa `permission-catalog.ts` hoặc `prisma/seed.mjs`. | `npm run test:unit -- src/domains/talent/recruiter-workbench.placement-actions.fetch.test.ts` AST guard. |
| `AC-18` | F1 KHÔNG cài Toast / SWR / optimistic-update package. `package.json` + `package-lock.json` không thay đổi. | `git diff --cached --check` + `package.json` so sánh SHA-pinned pre/post. |
| `AC-19` | E0 additive `placementOptions` cover zero / one / multiple / dedupe / cross-case isolation. Browser gửi đúng pair `jobOpeningId + sourceCandidateSubmissionId` từ option user chọn. | `npm run test:unit -- src/domains/talent/recruiter-workbench.read-service.test.ts` cover zero / one / multiple / dedupe / cross-case isolation. Integration test trên `tests/db/recruiter-workbench.integration.test.ts` cover cross-case isolation với synthetic DB. |

## 7. Risk

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| `R-01` | Stale UI status hiển thị → user double-click CONFIRM → 2 request cùng `Idempotency-Key` (cùng sessionStorage scope) + same payload → 1 success + 1 replay (`replayed: true`). | Medium | Low (server idempotent) | Disable toàn bộ controls của row trong khi `pending=true`; render success chỉ 1 lần; `router.refresh()`. | T1 implementation |
| `R-02` | UI gate sai role/state → user gọi thủ công qua network tab → server trả 403 / 400 / 409 → F1 render message. | Low | Medium (UX confusion) | Server authority; F1 chỉ UX gate; mọi error render verbatim từ server. | T1 implementation |
| `R-03` | `placementOptions` cross-case leakage do lỗi projection trong E0 read-service slice. | Low | High (data integrity) | Filter chain `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening` chỉ trong case hiện tại; DB integration test cover cross-case isolation. | T1 implementation |
| `R-04` | P1-E1 chưa ACCEPTED → F1 không có UI shell để gắn action controls. | High | High (blocker) | F1 chờ E1 ACCEPTED + merged main; trong planning này document insertion points theo E0 DTO + UI primitives. | T0 + E1 owner |
| `R-05` | sessionStorage idempotency-key collision giữa 2 rows / 2 commands. | Low | Medium (idempotency violation) | Scope = `placement/case id + command + canonical payload hash`; unit test cover isolation giữa 2 rows / 2 commands. | T1 implementation |
| `R-06` | `nextAction` enum mở rộng trong tương lai → F1 phải adapt. | Low | Low | Server-derived closed enum; F1 switch theo giá trị; thêm value mới là task riêng. | E0 owner |
| `R-07` | 5xx unexpected → F1 tự retry với cùng payload → idempotency violation. | Medium | High | F1 KHÔNG auto retry; render button "Thử lại" mint fresh Idempotency-Key (deliberate). | T1 implementation |
| `R-08` | PII leak qua error message (e.g. server trả `acknowledgementRef` trong 400 details) → F1 render verbatim → leak. | Low | High (PII) | F1 KHÔNG log PII client-side; render `details?` chỉ khi KHÔNG chứa PII fields; strip `acknowledgementRef` / `clientAcknowledgedByUserId` trước khi render ở 400 `PLACEMENT_VALIDATION_ERROR`. | T1 implementation |
| `R-09` | Test infrastructure (`DATABASE_URL_TEST`) chưa ready → integration test `ENV_BLOCKED`. | Medium | Low (round delay) | Báo cáo honest `ENV_BLOCKED` (không fake PASS); chờ synthetic DB gate. | T0 |
| `R-10` | HRP-managed EFFECTIVE → F1 ẩn control, nhưng user gọi thủ công → 400 `PLACEMENT_VALIDATION_ERROR` với message "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4". | Low | Low (informational) | F1 render message verbatim theo §4.3; integration test cover. | T1 implementation |
| `R-11` | `placementOptions` zero-option → user không thấy CREATE control nhưng vẫn expect action → confusion. | Low | Low (UX) | Render inline `&lt;p role="status"&gt;` "Chưa có JobOpening phù hợp — kiểm tra submissions."; SAFE reason render. | T1 implementation |
| `R-12` | E1 shell sau khi merge main có thay đổi cấu trúc `RecruiterWorkbenchTable` → F1 không khớp insertion point. | Medium | Medium (round delay) | Docs-only materialization round sau E1 merge; rebase/baseline theo updated main; F1 adapt insertion points. | T1B (materialization) |

## 8. Open Questions

**NONE** for v1.1. 10 Open Owner decisions đã được T0 lock trong §3.3
Locked decisions. Mọi assumption còn lại (e.g. placementOptions edge case
ordering) đã được liệt kê frozen trong §4.5.

Sau khi P1-E1 ACCEPTED + merged main và materialization round mở, nếu phát
sinh question cụ thể (e.g. drawer z-index collision với E1 shell khác), sẽ
được chốt trong implementation round, KHÔNG mở lại v1.1.

## 9. Planner Resolution

v1.1 là correction batch theo T0 verdict `APPROVED_WITH_REQUIRED_DOC_CORRECTION`
cho v1.0 commit `5f23c1cb7b468536f868e7d1f059cc7d04cb6b86`. Planner (T1B) đã:

1. Đọc chi tiết C-01..C-07 từ T0 verdict.
2. Đối chiếu từng correction với v1.0 doc:
   - **C-01** (correct delivery identity): `git diff --check origin/main` và
     `git status --porcelain` xác nhận chỉ 2 file (`RECON.md` + `TASK.md`).
     `AUDIT.md` KHÔNG thuộc diff (chưa được authored trong v1.0). v1.1 giữ
     phạm vi docs-only đúng 2 file; không thêm AUDIT.md. Report không claim 3
     file.
   - **C-02** (close all Owner decisions): lock 10 quyết định (DTO shape,
     server authority, HRP-managed EFFECTIVE hide, single-row drawer, pending
     state per row, `router.refresh()`, inline alert/status, evidence form
     persistence, no timeline/audit log, branch sequencing) trong §3.3
     `LOCK-01..LOCK-12`. §3.4 giữ 15 CHOSEN guardrails từ v1.0 đã aligned.
     Open Owner decisions = 0.
   - **C-03** (absorb E0 additive): §0 In-scope roots liệt kê các E0 path
     được additive-edit (`recruiter-workbench.types.ts`,
     `recruiter-workbench.read-service.ts`, `.read-service.test.ts`,
     `tests/db/recruiter-workbench.integration.test.ts`, hoặc
     `tests/db/p1f1-placement-action-ui.integration.test.ts`). §0 Forbidden
     paths bỏ các E0 path trên khỏi forbidden list. Route handler
     `app/api/admin/recruiter-workbench/route.ts` giữ nguyên nếu serialize
     tự xử lý (LOCK-15).
   - **C-04** (lock CREATE JobOpening source): `placementOptions` shape frozen
     trong §3.3 LOCK-03 + §4.5. Source chain
     `PlacementCase.submissions → CandidateSubmission.slot → StaffingOrderSlot.jobOpening`.
     Dedupe / deterministic order / zero / one / multiple / cross-case
     isolation đều cover trong AC-19 + R-03.
   - **C-05** (correct idempotency semantics): per-tab `sessionStorage`,
     scope `placement/case id + command + canonical payload hash`,
     reuse / mint / clear theo §3.3 LOCK-13 + AC-05.
   - **C-06** (UI integration boundary): §3.3 LOCK-14 + RQ-14 + AC-04
     xác nhận F1 extend E1 `RecruiterWorkbenchTable` bằng action-cell /
     client island hẹp; `router.refresh()` sau success.
   - **C-07** (controls after correction): §0 Control đã set `Spec v1.1`,
     `Contract gate ACCEPTED`, `Decision state CLOSED`, `Open Owner
     decisions 0`, `Status BLOCKED`, `Blocker WAIT_P1_E1_ACCEPTED`,
     `Next gate WAIT_P1_E1_ACCEPTED`, `Correction budget 1, consumed
     (this correction batch)`. Materialization path documented ở §5.1
     STEP-04 + §5.2 §0 SPEC REVISION + CHOSEN-15.

3. Cập nhật `RECON.md` tương ứng (Spec v1.1, Status BLOCKED, drop Open
   Decisions, update capability matrix cho `placementOptions` + E0 additive
   in-scope).
4. Tái chạy verification: `verify-task.ps1`, `verify-encoding.mjs`,
   `git diff --check`, `git status --porcelain`.

Planner resolution:

- `Status = BLOCKED` ✅ (planning only; chờ E1 ACCEPTED + merged main).
- `Contract gate = ACCEPTED` ✅ (T0 verdict `APPROVED_WITH_REQUIRED_DOC_CORRECTION`
  đã chấp thuận v1.0 contract, v1.1 absorbs corrections).
- `Decision state = CLOSED` ✅ (10 Open Decisions → 0).
- `Open Owner decisions = 0` ✅.
- `Spec version = v1.1` ✅ (correction batch).
- `Baseline = 4970f47d481c185f655242e3e91480e4117241dd` ✅ (origin/main pin).
- `Correction budget = 1, consumed (this correction batch v1.1)`.
- `Next gate = WAIT_P1_E1_ACCEPTED` ✅.

## 10. Revision Log

| Round | Date | Author | Note |
| --- | --- | --- | --- |
| 1 | 2026-09-26 | T1B | Initial v1.0 V2 contract. Status `PROPOSED_ONLY` / `Contract gate = DRAFT` / `Decision state = DRAFT`. Correction budget `1` — zero consumed. 10 Open Owner Decisions (§10) chờ T0 chốt. Section renumbering từ `## 3. Contract → ## 3. Decisions` để khớp canonical 11-section template (verify-task.ps1 A-01). Predecessor SHA: none (new branch off `origin/main`). Commit: `5f23c1cb7b468536f868e7d1f059cc7d04cb6b86`. |
| 2 | 2026-09-27 | T1B | v1.1 docs-only correction batch per T0 verdict `APPROVED_WITH_REQUIRED_DOC_CORRECTION` (`5f23c1cb…`). Applied C-01..C-07: closed 10 Open Decisions into §3.3 LOCK-01..15 (Status `BLOCKED`, Contract gate `ACCEPTED`, Decision state `CLOSED`, Open Owner decisions `0`); absorbed E0 additive read-model (LOCK-01..03, C-03); locked `placementOptions` server-derived (LOCK-03, C-04); corrected idempotency semantics to per-tab `sessionStorage` scoped by `placement/case id + command + canonical payload hash` (LOCK-13, C-05); committed UI integration boundary as narrow action-cell / client island + `router.refresh()` (LOCK-08/14, C-06); pruned `## 10. Open Decisions` (now §10 Revision Log only). Correction budget `1`, fully consumed. Predecessor SHA preserved; no amend/reset/rebase/force-push. Next gate: `WAIT_P1_E1_ACCEPTED`. Materialization round (rebase/baseline theo updated main → `READY_FOR_EXECUTION` / `TIER1_IMPLEMENTATION_FREEZE`) mở sau khi E1 merged main. |
| 3 | 2026-09-27 | T1B | Materialization + control-flip docs-only commit sau khi P1-E1 ACCEPTED + merged trên main @ `fabeda29`. Tạo worktree/branch implementation `codex/t1b-p1f1-placement-actions-impl` từ `origin/main@fabeda29` (commit `a3383d64` runtime merge đã ship E1). Materialized v1.1 RECON + TASK từ planning commit `0eb9b0e4` (codex/t1b-p1f1-placement-actions-planning); byte-identical verified qua `git hash-object`. Control flips: `Status BLOCKED → READY_FOR_EXECUTION`; `Contract gate ACCEPTED → READY_TO_CODE`; `Blocker WAIT_P1_E1_ACCEPTED → NONE`; `Baseline 4970f47d → fabeda29`; `Next gate WAIT_P1_E1_ACCEPTED → TIER1_IMPLEMENTATION_FREEZE`; `Current execution round 1 → 2`; `Decision state CLOSED` giữ nguyên (10 Open Decisions đã lock từ v1.1). Frozen delivery vẫn `NO` pre-freeze. Không source/test change trong docs-only round. Predecessor SHA `6dbd971` (materialization commit trên branch mới). LOCK-01..15 không đổi. |
| 4 | 2026-09-27 | T1B | V2_FAST_FREEZE implementation round 1. Implemented LOCK-01..LOCK-15: E0 additive DTO (placement? + placementOptions?); pure helpers derivePlacementFromRows + derivePlacementOptionsFromSubmissions; F1 fetch helper (raw UUID v4 + FNV-1a 32-bit payload hash + sessionStorage scope); F1 states helper (5-action matrix x HRP-managed EFFECTIVE hide); UI components (PlacementActionCell + PlacementActionDrawer + PlacementCreateForm + EffectiveEvidenceForm + ConfirmPlacementActionDialog); E1 integration (RecruiterWorkbenchTable wiring PlacementActionCell); required-relation-sweep static test bump 22->25; DB integration test (tests/db/ests/db/p1f1-placement-action-ui.integration.test.ts). Status READY_FOR_EXECUTION -> READY_FOR_AUDIT. Next gate TIER1_IMPLEMENTATION_FREEZE -> TIER3_LIGHT_AUDIT. 13 in-scope files (6 modified + 7 new). Frozen delivery YES post semantic code commit + docs/evidence commit. Forbidden-path audit clean (24 paths, 0 hits). Canonical gates PASS (verify-task.ps1 + verify-encoding.mjs + typecheck + lint 0 errors + 195 test files / 3162 tests + 9 skipped). DB integration test ENV_BLOCKED local (no DATABASE_URL_TEST); Tier 0/Owner cung cap DB truoc khi xet merge. Correction batches used = 0 (V2 budget 1 preserved for post-audit). |
