# HRPartner — Operational UX & Workflow Debt Audit (T1C)

> Document status: NON-AUTHORITATIVE AUDIT REPORT
> Measured against `main` SHA: `14712f15a5bc58d406fac784adb174c76d823d33`
> Audit window: 2026-10-03 (after P1 production cutover)
> Branch: `codex/t1c-operational-workflow-debt-audit` from `origin/main` (`14712f15`)
> Audit commit: `cd728490f249c6e6207890f5471e2dd22ef2bd9c`
> Correction commit: forward-only correction batch on the same branch (this revision)
> Owner: T1C (docs-only audit; no source/test/migration touched)
> Supersedes: none
> Conflict rule: this is an audit, not a normative contract. V7 authority, `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, and live source code override any claim made here. If a finding disagrees with current source, source wins. T0/Owner decisions incorporated in this correction batch are recorded inline (F1 remediation state, F2/F3 re-classification, F4/F13 IA stance, F9 closed decision, F10 terminal-state split, F12 moved to §14).

## 1. Purpose and non-authority statement

This audit answers T1C's single question from the T0 directive:

> Where does the UI mislead users into dead ends, false affordances, gate drift, orphan routes, or uncompletable workflows — and how widespread is the same shape as the JobPosting → JobOpening DRAFT publish block?

It does NOT answer:

- "Which V7/V8/V9 contract should override the UI?"
- "Which production slice should I reopen for re-implementation?"
- "Is a P3 finding worth fixing now?"

Those belong to V7 authority (`docs/V7/V7_ARCHITECTURE.md`), the maintainability reference (`docs/important/HRPARTNER_MAINTAINABILITY_REFERENCE.md`), and Owner risk acceptance. Each finding gives only the **boundary** for a future correction batch and leaves the implementation choice to the next T1 task contract.

## 2. Authority order

| Concern | Authority |
| --- | --- |
| Domain / architecture | `docs/V7/V7_ARCHITECTURE.md`, `docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md` |
| Execution / go-live gates | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` |
| Coordination cursor | `docs/PLANNER_HANDOVER.md` (`ROADMAP_CURSOR`) |
| Coding rules | `docs/V7/AI_CODING_GUARDRAILS.md`, `.ai-pipeline/`, current TASK/HANDOFF |
| Process / audit method | `.ai-pipeline/README.md`, `tier1.md` (Tier 1 = Delivery Lead), this audit's `Section 4` |

This audit must NOT be used as a second source of truth for V7 invariants, P0/P1/P2/P3 priority order, or production verification. Each finding cites a UI source location and a route/service source location, so a future T1 batch can verify scope and dismiss false positives against the current source before opening a contract.

## 3. Method, scope, and evidence rules

### 3.1 Method

1. **Baseline pin**: `git rev-parse origin/main` at audit start = `14712f15a5bc58d406fac784adb174c76d823d33` (PR #81 merge-commit, re-confirmed at audit write time).
2. **Source priority order**:
   - UI source under `app/**` and `src/shared/ui/**`.
   - Route/service under `app/api/**` and `src/domains/**`.
   - Sidebar/IA configuration under `src/shared/ui/role-guard/role-guard-layout.tsx`.
3. **Two-direction walk per domain**:
   - UI → fetch helper → route → service/command → DB/RLS.
   - Service/command export → reverse grep for UI consumer / navigation entry.
4. **Pattern audit checklist** (applied to each domain):
   - `canX` flag used only to **hide** a component (not to disable + reason)?
   - `return null` instead of explicit disabled + reason?
   - Action button enabled while a linked entity state is known to fail server-side?
   - Linked ID shown as plain text instead of `<Link>` / `<RowLink>`?
   - Route exists but no page consumer; or page exists but no sidebar entry?
   - `disabled: true` on sidebar but real implementation page reachable by URL?
   - `disabled: undefined` on sidebar but real implementation page reachable AND labeled "Đang phát triển"?
   - HTTP 409/422 mapped to a generic message with no recovery CTA?
   - Client gate vs server gate drift (UI permits, server rejects with 409; UI hides, server permits).
   - Idempotency-Key absent or non-UUID where retry must be safe.
   - Success path does not refresh/re-read state (UI keeps stale snapshot).
5. **Reproduction policy**:
   - "Production observed" = the finding is reproducible from source + at least one external signal (PR comment, runbook, change log, defect doc) referring to the exact same shape.
   - "Reproduced locally" = the finding was reproduced against a synthetic DB / local Next dev server.
   - "Static confirmed" = the finding was confirmed by reading source only.
   - "Suspected — needs reproduction" = the finding is plausible from source but was not reproduced. Suspected findings are explicitly tagged and MUST NOT be promoted to "confirmed" without a follow-up reproduction step.
6. **Strict non-modification**: zero source, zero test, zero migration, zero lockfile, zero CI/deploy, zero production configuration, zero production DB writes were made for this audit.

### 3.2 Scope

The audit covers 8 workflow domains as enumerated by the T0 directive:

1. Authentication & Admission
2. Recruitment setup (Company/Client, Project, StaffingOrder, StaffingOrderSlot, JobOpening, ServiceModel classification, activation)
3. JobPosting (create, author/edit, save draft, linked JobOpening navigation, publish, unpublish, archive, public visibility)
4. Public job board (listing, detail, public apply, validation/error recovery, tracking/confirmation)
5. Candidate / Application (submission intake, candidate/labor profile creation or matching, status progression, recruiter claim, assignment/revocation, MINE/ALL views)
6. Placement (PlacementCase, create, confirm, effective/cancel, HRP-managed restrictions, server-authoritative lifecycle, retry/idempotency)
7. Admin navigation & supporting screens (orphans, unclickable IDs, breadcrumbs, empty state, "Đang phát triển")
8. Role-specific reachability (ADMIN, HR_MANAGER, HR_STAFF, public, Vendor/CTV portal)

### 3.3 Taxonomy

Each finding is tagged with exactly one taxonomy code:

- `DEAD_END` — user enters a state with no UI path forward.
- `FALSE_AFFORDANCE` — control is clickable but the server is **known** to reject the resulting request.
- `HIDDEN_REQUIRED_ACTION` — a required action exists at the API/DB level but is not surfaced in the UI (or not reachable from the role's actual navigation).
- `GATE_DRIFT` — client gate and server precondition do not agree.
- `ROLE_REACHABILITY` — a role the business rules allow cannot reach the UI, or the UI is reachable but the role is not actually allowed server-side.
- `ORPHAN_ROUTE` — backend route/service exists but has no UI consumer / no navigation entry.
- `ORPHAN_UI` — UI action exists but no backend contract is reachable for the caller's role.
- `MISSING_CONTEXT` — UI reports an error/state but provides no precondition/next-action CTA.
- `BROKEN_LINKAGE` — linked entity is displayed but has no clickable path, or the path leads to the wrong destination.
- `STATUS_TRAP` — entity enters a status from which no UI-supported transition is possible.
- `RUNTIME_ONLY_GAP` — static/unit gates pass but the runtime/browser flow is broken or misleading.
- `OBSERVABILITY_GAP` — error envelope lacks correlation/state/next-action data needed to debug safely.

### 3.4 Evidence rules

Each P0 / P1 / P2 finding MUST include at least:

- One **UI source location** (file path + line number).
- One **route/service source location** (file path + line number).
- The **server precondition** or lifecycle rule.
- A reachability evidence line (which path actually arrives at the broken UI; not just "static trace").
- Expected vs actual behavior.
- A correction recommendation (boundary only — T1 picks the contract).
- A regression test recommendation.

A finding without these is either rejected or downgraded to a P3 note.

## 4. Baseline SHA & methodology

| Field | Value |
| --- | --- |
| Baseline SHA (origin/main HEAD at audit start) | `14712f15a5bc58d406fac784adb174c76d823d33` |
| Re-confirmed at write time | `14712f15a5bc58d406fac784adb174c76d823d33` |
| Merge commit immediately prior | `180afd2b` (PR #81) |
| Prior closeout SHA | `8b857f21` (PR #84 — HRPARTNER_MAINTAINABILITY_REFERENCE merge) |
| Audit branch | `codex/t1c-operational-workflow-debt-audit` |
| Audit worktree | `C:/CodeApp/HrP-worktrees/t1c-operational-workflow-debt-audit` |
| Audit author | T1C (docs-only) |
| Production cutover status | P1 was ACCEPTED on 2026-10-02 (per `docs/important/HRP_PRODUCTION_GO_LIVE_HANDOFF_2026-10-02.md`); this audit runs against the post-cutover main at `14712f15` |
| Post-baseline resolution note | See `§19` for findings whose resolution state changed after PR #86 (`f6100c39`) merged into main. The audit baseline is preserved as `14712f15` for provenance; post-baseline changes are recorded in `§19` without rewriting §5–§18 ledger entries. |

Method: two-direction walk per workflow domain (UI ↔ backend), pattern checklist, role matrix, evidence rules per `Section 3`.

## 5. Executive summary

| Metric | Value |
| --- | --- |
| Total findings | 10 |
| P0 | 0 |
| P1 | 1 (F1) |
| P2 | 4 (F2 — downgraded from P1 by T0/Owner; F5, F6, F9 — F9 = P1-risk candidate pending reproduction) |
| P3 | 5 (F4 narrative group including F13 merge; F7, F8, F11, F14) |
| Confirmed (Static / Production / Reproduced) | 9 |
| Suspected (needs reproduction) | 1 (F9) |
| F4 / F13 / F12 note | F4 = P3 narrative group (Owner decision recorded); F13 gộp vào F4 narrative; F12 chuyển §14; F3 is a subfinding of F2 (not counted independently) |
| F10 note | F10 đã được tách: F10a (JobOpening OPEN không có action Cancel = roadmap candidate, không phải debt) được loại khỏi finding ledger; F10b (JobPosting ARCHIVED không có restore) giữ như non-blocking P3 candidate bên trong F10 entry; FILLED / CANCELLED / EFFECTIVE là terminal theo thiết kế nên bị loại khỏi "status trap count" |
| Orphan routes found at audit time | 0 confirmed orphans in the verified inventory; unverified entries remain limitations (see `Section 9` and `Section 15`) |
| Orphan UI surfaces found | 1 (`/admin/labor-profiles` page exists but has no sidebar entry) — reclassified to P2 (F2) per T0/Owner decision |
| False affordances | 1 confirmed (F1) |
| Status trap candidates | 0 (FILLED/CANCELLED/ARCHIVED/EFFECTIVE removed per T0/Owner decision; see F10 entry and §10) |
| Sidebar IA inconsistencies | 1 narrative group (F4/F13 merged) |

**Top-line finding** (one paragraph):

The JobPosting → JobOpening DRAFT publish block recorded in the production cutover evidence is **not** an isolated case. The same shape recurs in three different surfaces: the editor shell `canPublish` flag does not consult linked JobOpening status (F1); the "Đang phát triển" sidebar label groups pages that are wired to live APIs but does not mark them `disabled`, while `commission/{policies,ledger}` correctly mark themselves `disabled` and serve an `UnderDevelopment` placeholder (F4/F13 narrative); and the canonical `/admin/labor-profiles` list + `/admin/labor-profiles/new` intake are reachable only via a recruiter-workbench deep-link (F2/F3) — the sidebar omits the entry, leaving direct access manual-only, but per T0/Owner decision this is a discoverability/IA finding (P2), not a workflow blocker. The remaining findings are individual cases that share the same "UI promise / server truth" asymmetry or are minor copy/link improvements. Only F1 is currently a confirmed P1; F9 remains suspected until a synthetic HR_STAFF session can be reproduced. T0/Owner has closed F9 (HR_STAFF must be assignment-scoped on the JobPosting create form) and F4 (development-section IA — keep "Đang phát triển" group as-is, do NOT call the four pages "live" until Owner accepts their go-live). F10 terminal-state analysis records that FILLED / CANCELLED / ARCHIVED / EFFECTIVE are intentional terminal lifecycle states per current contract and do NOT constitute workflow debt absent a documented exit-requirement.

## 6. Role × workflow coverage matrix

Legend: ✅ workflow completable without developer help · ⚠️ completable with manual URL or workaround · 🟡 has at least one P1/P2 finding · ❌ blocked

| Workflow | Admin | HR_MANAGER | HR_STAFF (scoped) | Public / Anonymous | Vendor / CTV |
| --- | :---: | :---: | :---: | :---: | :---: |
| 1. Login + role landing + role guard | ✅ | ✅ | ✅ | ✅ | n/a |
| 2. Recruitment setup (Client → Project → Order → Slot → JobOpening → Classify → Open) | 🟡 F10a-note (roadmap candidate, not debt) | 🟡 F10a-note | 🟡 F10a-note, F5 | n/a | n/a |
| 3. JobPosting create / author / save draft | 🟡 F1, F11 | 🟡 F1, F11 | 🟡 F1, F11, F9 (suspected) | n/a | n/a |
| 4. JobPosting publish / unpublish / archive | 🟡 F1, F5 | 🟡 F1, F5 | 🟡 F1, F5 | n/a | n/a |
| 5. Public job board listing / detail / tracking | ✅ | ✅ | ✅ | ✅ | n/a |
| 6. Public apply (anonymous) | n/a | n/a | n/a | ✅ | n/a |
| 7. Application intake + queue (MP-3 lifecycle) | ✅ | ✅ | n/a (HR_STAFF excluded by design per `src/domains/applications/application-queue.service.ts:15-16`) | n/a | n/a |
| 8. LaborProfile workbench + intake | 🟡 F2, F3 | 🟡 F2, F3 | 🟡 F2, F3 | n/a | n/a |
| 9. Recruiter Workbench (MINE / ALL / UNASSIGNED) | ✅ | ✅ | ✅ (MINE only — server-enforced) | n/a | n/a |
| 10. Placement create / confirm / effective / cancel | ✅ | ✅ | ✅ (recruiter family only when assigned) | n/a | n/a |
| 11. Admin CRUD: workers, clients, vendors, projects, settings, media | ✅ | ✅ (subset) | ⚠️ partial (HR_STAFF sees Workers only) | n/a | n/a |
| 12. Tickets / Attendance / Reconciliation / Payroll | 🟡 F4 (label mismatch) | 🟡 F4 | 🟡 F4 | n/a | n/a |
| 13. Commission policies / ledger | ✅ (placeholder + sidebar `disabled`) | ✅ | n/a | n/a | n/a |
| 14. UnderDevelopment navigation (commission + missing 4 above) | 🟡 F4 | 🟡 F4 | 🟡 F4 | n/a | n/a |
| 15. Vendor portal (statements / submissions / projects) | n/a | n/a | n/a | n/a | ✅ |
| 16. CTV portal (referral, withdrawals) | n/a | n/a | n/a | n/a | ✅ |
| 17. Worker portal (mobile-first, `/m/*`) | n/a | n/a | n/a | n/a | n/a (WORKER role) |

## 7. State / action / precondition matrices

The matrices below are the canonical "what state, what action, what server precondition, what recovery path" view. Each row is a verifiable claim against the current source at baseline `14712f15`.

### 7.1 JobPosting lifecycle

| Entity state | Available UI action | Server command | Server precondition (where verified) | Role gate | Next state | UI recovery path |
| --- | --- | --- | --- | --- | --- | --- |
| DRAFT + linked JobOpening OPEN | Publish | `publishJobPosting` (`src/domains/staffing/job-posting-authoring.service.ts:778-873`) | DRAFT; revision match; `jobOpening.status === 'OPEN'`; title + description non-empty; idempotency-key UUID | MUTATION_ROLES (ADMIN/HR_MANAGER/HR_STAFF) | PUBLISHED | None needed |
| DRAFT + linked JobOpening DRAFT (or any ≠ OPEN) | **Publish button enabled** (`app/admin/jobs/job-postings/[id]/editor-shell.tsx:296-302` `canPublish = canMutate && status === DRAFT && title.trim().length > 0 && descriptionJson !== null`) | `publishJobPosting` → throws `AuthoringError('JOB_OPENING_NOT_OPEN', 409, ...)` | — | — | unchanged | **NONE — MISSING_CONTEXT + FALSE_AFFORDANCE (F1)** — separate from the F5 editor-409-CTA concern, which addresses lack of any recovery CTA after server rejection |
| DRAFT | Save draft (PATCH) | `updateDraftContent` (same file) | DRAFT; revision match; idempotency-key | MUTATION_ROLES | DRAFT (new revision) | n/a |
| PUBLISHED | Unpublish | `unpublishJobPosting` | PUBLISHED; revision match | MUTATION_ROLES | DRAFT | None needed |
| PUBLISHED | Archive | `archiveJobPosting` (same service family) | non-ARCHIVED; revision match | MUTATION_ROLES | ARCHIVED | None needed |
| ARCHIVED | (none — buttons disabled) | — | — | — | — | n/a |
| Any | Linked JobOpening badge | (display only — `RelatedObjects` at `app/admin/jobs/job-postings/[id]/page.tsx:144-153` with **no `href`** — see F11) | — | — | — | **No clickable link** |

### 7.2 JobOpening lifecycle (activation path)

| Entity state | Available UI action | Server command | Server precondition (where verified) | Role gate | Next state | UI recovery path |
| --- | --- | --- | --- | --- | --- | --- |
| DRAFT + no ServiceModel | Phân loại ServiceModel (radio) | `classifyJobOpening` via `POST /api/admin/staffing/job-openings/[id]/classify` | DRAFT; ADMIN/HR_MANAGER; idempotency-key | ADMIN/HR_MANAGER | DRAFT (with serviceModel) | `blockedReason` if HR_STAFF unassigned |
| DRAFT + ServiceModel + parent Order OPEN + slot eligible | Mở JobOpening | `openJobOpening` (referenced from `app/admin/job-openings/[id]/page.tsx:25-31`) | DRAFT; service_model != null; caller authority; parent StaffingOrder.status === 'OPEN' (strict); deadline valid; validTo valid; slotsFilled < slotsNeeded; base predicate `slot_is_eligible`; idempotency-key | ADMIN/HR_MANAGER + (HR_STAFF + active assignment) | OPEN | `blockedReason` already surfaces the exact failing precondition (`job-opening-actions.tsx:367-373`); ✅ GOOD UX |
| DRAFT + ServiceModel + parent Order CLOSING_SOON | Mở JobOpening disabled with reason "StaffingOrder ở trạng thái CLOSING_SOON; cần OPEN (CLOSING_SOON không đủ điều kiện mở)" | `openJobOpening` would throw `ORDER_NOT_OPEN` 409 | — | — | unchanged | Reason rendered — ✅ |
| FILLED | (terminal lifecycle state — see §10 / F10) | — | — | — | — | n/a (terminal per current contract; no UI exit expected without a documented recovery requirement) |
| OPEN | (no "Cancel" action exposed; potential roadmap candidate only — see F10a) | (not exposed) | — | — | — | None today; if Owner documents a cancel requirement, open a new V7 task |

### 7.3 Application lifecycle (MP-3 review drawer)

| Application state | UI action shown to ADMIN/HR_MANAGER/DIRECTOR/SALE | Server command | Server precondition | Role gate | Next state | UI recovery path |
| --- | --- | --- | --- | --- | --- | --- |
| NEW | Yêu cầu bổ sung (→ NEEDS_INFO); convert; placement (ADMIN/HR_MANAGER only) | MP-2 `transitionApplicationStatus` (referenced from `app/admin/applications/page.tsx:80-150`) or MP-3 actions under `/api/admin/applications/[id]/actions/{qualify,reject,convert}` | `assertMp2Transition` (MP-2 state machine); MP-3 state machine | QUEUE_ROLES (`ADMIN, HR_MANAGER, DIRECTOR, SALE`) | NEEDS_INFO / QUALIFIED / REJECTED / CONVERTED | None needed |
| NEEDS_INFO | Đưa lại về Mới (→ NEW); convert; placement | `transitionApplicationStatus` | `assertMp2Transition(NEEDS_INFO, NEW)` | QUEUE_ROLES | NEW | None needed |
| QUALIFIED | convert; placement; reject (via MP-3 actions) | MP-3 actions | MP-3 state machine | QUEUE_ROLES | CONVERTED / REJECTED / placement | None needed |
| CONVERTED | placement | placement preview + activate | role + assignment; idempotency-key | ADMIN/HR_MANAGER | placement created | None needed |
| REJECTED / WITHDRAWN | (terminal) | — | — | — | — | No UI to reopen — ✅ acceptable for terminal states |

HR_STAFF is **intentionally excluded** from `QUEUE_ROLES` (`src/domains/applications/application-queue.service.ts:15-16`). This is a documented design decision, not a finding — see `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/` for the contract.

### 7.4 Placement lifecycle (admin + recruiter families)

| Placement state | UI action shown | Server command | Server precondition | Role gate | Next state | UI recovery path |
| --- | --- | --- | --- | --- | --- | --- |
| `SELECTED` (after create) | Confirm / Effective / Fail / Cancel | `/api/admin/placements/[id]/actions/{confirm,effective,fail,cancel}` (admin family) OR `/api/admin/recruiter/placements/[id]/actions/...` (recruiter family) | per-command preconditions in `src/domains/talent/placement.service.ts`; idempotency-key UUID | ADMIN/HR_MANAGER + HR_STAFF+view=MINE | CONFIRMED / EFFECTIVE / FAILED / CANCELLED | Retry-safe (per-action idem-key) — ✅ |
| `EFFECTIVE` | (terminal — irreversible/fail-closed by design; rollback UI would break authority) | — | — | — | — | None (intentional terminal per current contract) |

## 8. Finding ledger

Findings sorted by priority then by ID. Each finding carries a status evidence line that follows the rule in `Section 3.1.5`.

### 8.1 F1 — JobPosting Publish enabled regardless of linked JobOpening status

- **Priority**: P1
- **Taxonomy**: `FALSE_AFFORDANCE` + `MISSING_CONTEXT`
- **Status evidence**: Static confirmed at audit baseline `14712f15`; T1A correction implementation frozen and reported separately on branch `codex/t1a-postdeploy-runtime-correction-2` (HANDOFF frozen SHA `162453e29f3e2a882cda17e56d3578e1038b72bf`).
- **Remediation state (T0/Owner correction, 2026-10-03)**: finding is **valid against `main @ 14712f15`** and is therefore retained in the ledger. A T1A correction batch has been frozen on a separate branch (HANDOFF SHA `162453e29f3e2a882cda17e56d3578e1038b72bf`) and gates `publishJobPosting` on linked `JobOpening.status === 'OPEN'` at both the editor-shell `canPublish` flag and the server precondition. Until the T1A branch is merged into `main`, this audit's finding stands; the audit intentionally does **NOT** mark F1 as resolved. No source/test/migration changes are introduced by this audit correction batch.
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 3. JobPosting publish
- **UI source**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx:296-302` (`canPublish`) and `:342-348` (`<ActionButton disabled={!canPublish || isSaving} ... label="Publish" primary />`).
- **Route/service source**: `src/domains/staffing/job-posting-authoring.service.ts:778-873` (`publishJobPosting`) — the precondition block throws `AuthoringError('JOB_OPENING_NOT_OPEN', 409, 'Linked JobOpening … phải ở trạng thái OPEN', { jobOpeningId, jobOpeningStatus })` and the route echoes it via `app/api/admin/jobs/job-postings/[id]/publish/route.ts:98-105`.
- **Precondition**: `current.jobOpening.status !== 'OPEN'` → 409.
- **Reachability evidence**: `/admin/jobs/job-postings` list (`app/admin/jobs/job-postings/page.tsx`) is reachable for CREATE_ROLES, the row link goes to the editor shell; the editor shell's `canPublish` does not consult `jobOpening.status` (only `canMutate + status === DRAFT + title + descriptionJson`).
- **Expected**: when `jobOpening.status` ≠ `OPEN`, the Publish button is `disabled` with the exact server-side reason in plain Vietnamese (e.g. "JobOpening đang DRAFT — mở JobOpening trước khi publish"), and the reason includes a navigation link to the canonical `/admin/job-openings/[id]` page where the user can run the activation command.
- **Actual**: at audit baseline the button is enabled; clicking it returns 409; the editor shell surfaces the raw server message in the inline `errorMessage` slot (`editor-shell.tsx:360-368`) with no recovery CTA.
- **Correction boundary**: surface a server-derived `canPublish` flag in `JobPostingDetailDto` that consults `jobOpening.status`; render disabled + reason + a `<Link>` to `/admin/job-openings/[id]` when `jobOpening.status !== 'OPEN'`. Do NOT touch server contracts; this is a UI affordance-only fix layered on top of the existing canonical service. (T1A correction batch on `codex/t1a-postdeploy-runtime-correction-2` implements exactly this boundary.)
- **Regression test**: add an integration test that asserts (a) `canPublish === false` when `jobOpening.status === 'DRAFT'`, (b) the disabled reason text matches the blocked-reason vocabulary from `job-opening-actions.tsx`, (c) the rendered HTML has an `<a href="/admin/job-openings/{id}">` anchor in the reason block.

### 8.2 F2 — `/admin/labor-profiles` is reachable only via deep-link, not via sidebar

- **Priority**: P2 (downgraded from P1 by T0/Owner correction, 2026-10-03)
- **Taxonomy**: `ROLE_REACHABILITY` — discoverability gap (not a workflow blocker)
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 8. LaborProfile workbench
- **UI source**: `app/admin/labor-profiles/page.tsx` exists, has its own ALLOWED_ROLES set (`['ADMIN', 'HR_MANAGER', 'HR_STAFF']` at line 16), but is **omitted** from `ADMIN_NAV_PHASE4` (`src/shared/ui/role-guard/role-guard-layout.tsx:121-167`). The full `ADMIN_NAV_PHASE4` lists `/admin`, `/admin/projects`, `/admin/jobs`, `/admin/jobs/job-postings`, `/admin/applications`, `/admin/staffing`, `/admin/workers`, `/admin/clients`, `/admin/vendors`, `/admin/tickets`, `/admin/attendance`, `/admin/reconciliation`, `/admin/payroll`, `/admin/commission/policies`, `/admin/commission/ledger`, `/admin/users`, `/admin/settings`, `/admin/media` — no `/admin/labor-profiles`.
- **Route/service source**: pages render `/admin/labor-profiles/new` and `/admin/labor-profiles/[id]` as direct links (line 58 of the same file shows `href="/admin/labor-profiles/new"` from the workbench list).
- **Precondition**: page-level role gate accepts ADMIN/HR_MANAGER/HR_STAFF.
- **Reachability evidence**: the page is reachable by URL today; inbound deep-links exist from `RecruiterWorkbenchTable → PrimaryActions → detailHref = /admin/labor-profiles/<laborProfileId>` (`app/admin/recruiter-workbench/_components/PrimaryActions.tsx:32-34, 44, 53`). Per T0/Owner: route is still accessible (URL/href), deep-link from Recruiter Workbench exists, and there is a non-developer workaround (type the URL or follow a candidate's workbench row). The workflow is therefore NOT blocked — the gap is about discoverability and route-to-primary entry.
- **Re-classification reasoning (T0/Owner correction, 2026-10-03)**: downgraded from P1 to P2 because (a) the route remains reachable via direct URL/href and via a recruiter-workbench deep-link; (b) operators are not blocked from completing the LaborProfile intake workflow; (c) the gap is discoverability and primary-navigation entry, not workflow blocking; (d) no role is unable to reach the UI. The audit therefore records F2 as a UX/IA finding, not a workflow blocker. Wording per T0/Owner: "giảm discoverability và buộc đi qua deep-link/workbench".
- **Expected**: the canonical "Nhân sự" sidebar section (the `people` group in `ADMIN_NAV_PHASE4` line 134) carries an entry for "Hồ sơ NLD" pointing to `/admin/labor-profiles`, and "Tiếp nhận NLD" is reachable from there.
- **Actual**: the page exists, is fully built, and is reachable only via URL or the recruiter-workbench detail link — not via the primary sidebar.
- **Correction boundary**: add the missing `NavItem` entries to `ADMIN_NAV_PHASE4` (`src/shared/ui/role-guard/role-guard-layout.tsx`); section placement should follow the same domain realignment the T1C closeout already applied (likely `section: 'people'` next to `workers`). This is a small bounded UI change.
- **Regression test**: snapshot test of `ADMIN_NAV_PHASE4` filtered by `role === 'HR_MANAGER'` must include `/admin/labor-profiles` and the rendered sidebar must show the label.

### 8.3 F3 — `/admin/labor-profiles/new` ("Tiếp nhận NLD") is reachable only via the list page deep-link

- **Priority**: Subfinding of F2 — not counted as an independent blocker (per T0/Owner correction, 2026-10-03: "F3 gộp thành subfinding của F2 hoặc giữ P2, không đếm thành blocker độc lập nếu correction giống hệt"; the F2 fix and this F3 entry share the exact same correction boundary, so F3 is treated as a subfinding of F2 for finding-count and rollout purposes)
- **Taxonomy**: `ROLE_REACHABILITY` (follow-on from F2)
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 8. LaborProfile workbench intake
- **UI source**: `app/admin/labor-profiles/page.tsx:56-59` exposes the `+ Tiếp nhận NLD` button at `/admin/labor-profiles/new`.
- **Route/service source**: `app/admin/labor-profiles/new/page.tsx` (see `app/admin/**/page.tsx` listing).
- **Precondition**: page-level role gate from the list page inherits ADMIN/HR_MANAGER/HR_STAFF.
- **Reachability evidence**: the button is on the list page; the list page itself is reachable only via deep-link (F2). Therefore the intake action is **doubly deep-linked**.
- **Expected**: once F2 is fixed (sidebar entry for Hồ sơ NLD), the `+ Tiếp nhận NLD` button is one click away.
- **Actual**: two clicks and a URL hunt.
- **Correction boundary**: covered by the F2 fix; no separate work needed if F2 lands first.
- **Regression test**: covered by the F2 regression.

### 8.4 F4 — Sidebar "Đang phát triển" semantics split: implemented pages with release readiness unverified vs two placeholders

- **Priority**: P3 (downgraded from P1 by T0/Owner correction, 2026-10-03)
- **Taxonomy**: `GATE_DRIFT` + `MISSING_CONTEXT` (the section label misrepresents what is reachable; reframed below per T0/Owner directive C)
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF, PM, ACCOUNTANT (per `ADMIN_NAV_PHASE4` role lists)
- **Workflow**: 12/14. Tickets / Attendance / Reconciliation / Payroll / Commission
- **UI source (sidebar)**: `src/shared/ui/role-guard/role-guard-layout.tsx:152-159` declares:
  - `{ href: '/admin/tickets', label: 'Phản ánh / Tạm ứng', section: 'development' }` — **no `disabled`**
  - `{ href: '/admin/attendance', section: 'development' }` — **no `disabled`**
  - `{ href: '/admin/reconciliation', section: 'development' }` — **no `disabled`**
  - `{ href: '/admin/payroll', section: 'development' }` — **no `disabled`**
  - `{ href: '/admin/commission/policies', section: 'development', disabled: true }`
  - `{ href: '/admin/commission/ledger', section: 'development', disabled: true }`
- **Page reality (refactored per T0/Owner directive C, 2026-10-03)**:
  - `app/admin/tickets/page.tsx`, `app/admin/attendance/page.tsx`, `app/admin/reconciliation/page.tsx`, `app/admin/payroll/page.tsx` — these pages are **implemented surfaces with release readiness unverified**. Per T0/Owner decision they MUST NOT be called "live" in this audit, because Tickets / Attendance / Reconciliation / Payroll have **not** been accepted by Owner for go-live; the existence of pages and APIs is not equivalent to Owner acceptance. They remain in the "Đang phát triển" section by deliberate Owner direction.
  - `app/admin/commission/policies/page.tsx` and `app/admin/commission/ledger/page.tsx` — `UnderDevelopment` placeholders.
- **Route/service source**: the four "implemented but release-unverified" pages have matching route handlers under `app/api/...` (see `Section 9` for the explicit route inventory). The two `commission/*` pages have NO live API surface for the admin (the underlying `commission-policies` and `commission-ledger` endpoints exist for backend authority but the placeholder is the only UI).
- **Precondition**: the sidebar group renders inside a `<details>` labeled "Đang phát triển" with `border-dashed` styling (`role-guard-layout.tsx:351-369`) — visual signal says "deferred / not yet ready".
- **Reachability evidence**: the four pages are reachable by clicking the un-deferred sidebar links. The section is collapsible but defaults open when the active route is inside it.
- **Re-classification reasoning (T0/Owner correction, 2026-10-03)**: downgraded from P1 to P3 and re-framed because (a) Owner has NOT accepted Tickets / Attendance / Reconciliation / Payroll for go-live; (b) page/API existence does not prove an "accepted for go-live" status; (c) Commission policies/ledger is already deferred by deliberate Owner direction; (d) the entire group therefore remains outside the Chợ việc làm go-live window. The audit does **NOT** call these pages "live". The audit records the IA gap (a P3 narrative) without re-classifying them as production features.
- **Expected**: keep the "Đang phát triển" section label and group, but future corrections must (a) NOT mark these pages as live/production-ready until Owner accepts go-live; (b) pick a disabled/placeholder or "Thử nghiệm" badge treatment if/when the modules are revisited; (c) NOT auto-promote these modules to the operational group without an explicit Owner decision.
- **Actual**: section label reads "Đang phát triển"; the four pages have implemented clients and APIs but their release readiness is unverified; the two `commission/*` items render `UnderDevelopment` placeholders. Operator cannot tell from the sidebar label alone whether an entry is implemented-but-unverified or fully placeholder.
- **Correction boundary (T0/Owner correction, 2026-10-03)**: do **NOT** rename the section header to "Vận hành nội bộ"; do **NOT** add a `data-status` annotation per item; do **NOT** split the section as part of this audit. The audit recommends that any future correction (a) keeps the four pages in the "Đang phát triển" group until Owner accepts go-live, (b) selects disabled/placeholder or "Thử nghiệm" badge treatment for any module revisited, and (c) avoids auto-promoting these modules to the operational group without an explicit Owner decision. No source/test/sidebar change is introduced by this audit.
- **Regression test**: static assertion that (a) the four pages remain labeled as implemented-but-unverified (not as "live"), (b) the "Đang phát triển" section header is preserved unless Owner decides otherwise, (c) any future change moves modules out of "Đang phát triển" only after an explicit Owner go-live decision.

### 8.5 F5 — JobPosting editor shell surfaces 409 errors without a recovery CTA

- **Priority**: P2
- **Taxonomy**: `MISSING_CONTEXT`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 3. JobPosting publish
- **UI source**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx:254-294` (`runStateMutation`) and `:360-368` (inline `errorMessage` block).
- **Route/service source**: `app/api/admin/jobs/job-postings/[id]/publish/route.ts:98-105` maps `AuthoringError` to its `httpStatus` (409) with `error.code`, `error.message`, and `error.details`.
- **Precondition**: server returns 409 with `error: 'JOB_OPENING_NOT_OPEN'` and a `details: { jobOpeningId, jobOpeningStatus }` payload; UI receives it via `readErrorMessage` (`editor-shell.tsx:84-91`) and only renders `body.message`.
- **Reachability evidence**: any operator clicking Publish on a JobPosting whose linked JobOpening has drifted to DRAFT (e.g. someone reopened it via the JobOpening activation edit flow) will hit this branch.
- **Expected**: when the 409 carries `error === 'JOB_OPENING_NOT_OPEN'`, the inline error renders a small "Mở JobOpening này" CTA linking to `/admin/job-openings/[details.jobOpeningId]`, mirroring the `JobOpeningActions` UX (which already shows `blockedReason` — see `app/admin/job-openings/[id]/job-opening-actions.tsx:367-373`).
- **Actual**: raw server message rendered as text with no CTA.
- **Correction boundary**: branch in `runStateMutation` on `errCode === 'JOB_OPENING_NOT_OPEN'` to render a CTA; the same pattern can apply to `INVALID_STATE_TRANSITION`, `INVALID_REVISION`, `IDEMPOTENCY_CONFLICT`. No contract change.
- **Regression test**: unit test of `editor-shell.tsx` with a mocked 409 response; integration test should rebuild the 409 → CTA → end-to-end click on `/admin/job-openings/[id]`.

### 8.6 F6 — Recruiter-workbench placement action cell context copy (server-derived flag not surfaced)

- **Priority**: P2
- **Taxonomy**: `MISSING_CONTEXT`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 10. Placement
- **UI source**: `app/admin/recruiter-workbench/page.tsx:212-220` derives `placementRouteFamily` and `canMutatePlacement`; the action cell renders the actual `<PlacementActionCell>` in `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx` (referenced via dynamic dispatch in the workbench table).
- **Route/service source**: `src/domains/talent/recruiter-workbench.read-service.ts` produces the row DTO; the cell derives the affordance.
- **Precondition**: server-derived `canMutatePlacement` is correctly threaded (good — see `app/admin/recruiter-workbench/page.tsx:218-220`), but the cell does not echo the upstream reason (e.g. "no active assignment on this order") when it renders the `—` sentinel.
- **Reachability evidence**: HR_STAFF viewing a case from the ALL/UNASSIGNED views is forbidden by the page gate, so they only see MINE cases; for those cases, placement action availability depends on `assignment.active = true` and current placement state, neither of which is shown when the cell renders `—`.
- **Expected**: when `canMutatePlacement === true` for the row but the placement is in a state where no action is currently valid (e.g. already EFFECTIVE), show "Đã hiệu lực lúc HH:mm — không cần thao tác"; when `canMutatePlacement === false` for the row, show "Không thuộc quyền của bạn (chỉ recruiter phụ trách liên hệ này)".
- **Actual**: silent `—` sentinel.
- **Correction boundary**: add a server-derived `placementUnavailableReason` to the row DTO; render it in the cell. Pure DTO + presentational change.
- **Regression test**: snapshot test of the cell with mocked DTOs for `canMutatePlacement = true/false` and various placement states.

### 8.7 F7 — `/admin/jobs/job-postings` (All Jobs) renders `openingStaffingOrderCode` and `openingStatus` as plain text

- **Priority**: P3
- **Taxonomy**: `BROKEN_LINKAGE`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF, SALE
- **Workflow**: 2/3. Recruitment setup / JobPosting
- **UI source**: `app/admin/jobs/job-postings/page.tsx:306-316` — column "Staffing Order" renders `<span className="font-mono">{item.openingStaffingOrderCode}</span>` with no link, plus an inline `(JobOpening: {item.openingStatus})` status suffix.
- **Route/service source**: `src/domains/staffing/job-posting-list.service.ts` already returns `openingStaffingOrderCode`, `openingStatus`, and `jobOpeningId` in the row DTO.
- **Precondition**: the DTO is rich enough to render a link; only the UI is short.
- **Reachability evidence**: operator opens the All Jobs list to triage a JobPosting stuck at DRAFT, sees the StaffingOrder code as text, has to know the URL `/admin/job-openings/<openingId>` to recover.
- **Expected**: the staffing order code and the opening status are clickable — clicking the code opens `/admin/job-openings/[openingId]` (or `/admin/projects/[projectId]` for the order itself).
- **Actual**: plain text.
- **Correction boundary**: wrap the existing `<span>` with `<Link>` from `next/link`; the DTO already carries `jobOpeningId`. No contract change.
- **Regression test**: snapshot test of the list row markup; assert the rendered HTML contains `<a href="/admin/job-openings/`.

### 8.8 F8 — `publishJobPosting` raw `message` echoed to UI without normalization

- **Priority**: P3
- **Taxonomy**: `MISSING_CONTEXT` + (very mild) `OBSERVABILITY_GAP`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 3. JobPosting publish
- **UI source**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx:84-91` (`readErrorMessage`) returns `body.message ?? body.error ?? HTTP ${res.status}`.
- **Route/service source**: `app/api/admin/jobs/job-postings/[id]/publish/route.ts:98-105` echoes `error.message` (server message). The service-side messages are written in Vietnamese and look safe — but the convention is fragile.
- **Precondition**: server returns 409 with a free-text message.
- **Reachability evidence**: every failed publish call lands here; messages are developer-authored and not validated by a code-check.
- **Expected**: server returns a `code` (e.g. `JOB_OPENING_NOT_OPEN`) and the UI maps it to a localized, recovery-oriented message; `message` is treated as developer diagnostics only.
- **Actual**: UI echoes whatever the developer wrote in `AuthoringError`'s message field.
- **Correction boundary**: add a code-to-Vietnamese-message mapper alongside `readErrorMessage`. The pattern already exists in `src/domains/applications/placement-ui.ts` (`conflictLabel`) and is referenced by `admin/applications/page.tsx:91-101` (`messageOf` → `conflictLabel(d.error)`). Reuse the same `conflictLabel` mechanism.
- **Regression test**: unit tests of the new mapper for `JOB_OPENING_NOT_OPEN`, `INVALID_STATE_TRANSITION`, `INVALID_REVISION`, `IDEMPOTENCY_CONFLICT`.

### 8.9 F9 — HR_STAFF JobPosting create-form scoping (T0/Owner decision closed; suspected reproduction pending)

- **Priority**: P2 / **P1-risk candidate** (reclassified per T0/Owner correction directive D, 2026-10-03 — not promoted to confirmed P1 until reproduction lands)
- **Taxonomy**: `ROLE_REACHABILITY` + suspected `GATE_DRIFT`
- **Status evidence**: **Suspected — needs reproduction** (read source; did not run a synthetic HR_STAFF session in this audit). The audit does **NOT** count F9 as a confirmed finding for release-blocking purposes.
- **T0/Owner decision (directive D, 2026-10-03)**: `HR_STAFF là recruiter có scope; chỉ được tạo JobPosting cho StaffingOrder mà họ có active assignment.` The "accept asymmetry" option is removed. The audit retains F9 as a **P1-risk candidate**; if reproduction confirms that the selector or write path allows an unassigned HR_STAFF to create a JobPosting, F9 shall be promoted to **P1 authorization / scope drift**, and the correction shall:
  - enforce the assignment predicate at **both** the selector and the server write path (client filtering alone is insufficient);
  - not rely on the page gate or UI banner as the only defense.
  If reproduction does not confirm, F9 is recorded as a P1-risk candidate in `§15` and not added to the confirmed count.
- **Role(s) affected**: HR_STAFF
- **Workflow**: 3. JobPosting create
- **UI source**: `app/admin/jobs/job-postings/page.tsx` renders `<CreateJobPostingForm>` for `CREATE_ROLES` which includes `HR_STAFF`.
- **Route/service source**: `app/api/admin/jobs/job-postings/route.ts` (POST create) and the list selector's filter (referenced from the create form). The selector's filter does not include a recruiter-assignment predicate — the write path uses `assertSlotEligibleForNewJobPosting`, and the documented write path includes only slot eligibility, NOT recruiter assignment.
- **Precondition**: server-side write path uses `assertSlotEligibleForNewJobPosting`; the documented write path includes only slot eligibility, NOT recruiter assignment.
- **Reachability evidence**: HR_STAFF logs in, opens `/admin/jobs/job-postings`, sees a non-empty `eligibleSlots` list, picks a slot for a StaffingOrder they have **no active assignment on**, and the server accepts the create. Compared with `JobOpeningActions` (which DOES gate `assertActiveRecruiterForOrder` for HR_STAFF — see `app/admin/job-openings/[id]/page.tsx:92-104`), this is an asymmetry.
- **Expected**: HR_STAFF either sees a list filtered to assigned StaffingOrders, OR the page renders an info banner "Chỉ tạo JobPosting cho StaffingOrder bạn được phân công" and the write path enforces the assignment predicate.
- **Actual (suspected)**: `eligibleSlots` is unscoped by assignment; write path does not enforce it. The asymmetry between JobOpening (scoped) and JobPosting create (unscoped) is undocumented at the audit level. The audit treats this as a **suspected** reproduction gap pending a synthetic HR_STAFF session.
- **Correction boundary**: if reproduction confirms, scope a CRITICAL authorization task that gates on `StaffingOrderRecruiterAssignment` for HR_STAFF at the selector AND the server write path. No source change is introduced by this audit.
- **Regression test**: integration test that creates a StaffingOrder with no `StaffingOrderRecruiterAssignment`, logs in as HR_STAFF, attempts to create a JobPosting for one of its slots, and asserts either the selector hides it or the write path rejects it with a stable error code.

### 8.10 F10 — Status trap candidates: terminal-state analysis per T0/Owner decision

- **Priority**: P3 (downgraded from P2 by T0/Owner correction directive E, 2026-10-03)
- **Taxonomy**: `STATUS_TRAP` — refactored per T0/Owner terminal-state split
- **Status evidence**: Suspected — needs reproduction for F10b only; F10a is reframed as a roadmap candidate, not debt.
- **Role(s) affected**: ADMIN, HR_MANAGER
- **Workflow**: 2/3. JobOpening + JobPosting
- **Terminal-state split (T0/Owner correction directive E, 2026-10-03)**:
  1. **`JobOpening OPEN` without a "Cancel" action**: reframed as a **product capability gap / roadmap candidate**. It is only a finding if there is a documented business requirement or real operational case. The audit does NOT design a new cancel command as part of this audit; the next contract decides whether to add `cancelJobOpening`.
  2. **`JobOpening FILLED`**: terminal lifecycle state per current contract; not assumed to require a UI exit. Removed from the "status trap count" — the absence of a recovery action is not, by itself, workflow debt.
  3. **`JobOpening CANCELLED`**: terminal lifecycle state per current contract; not assumed to require a restore. Removed from the "status trap count" for the same reason.
  4. **`JobPosting ARCHIVED`**: terminal per the current contract; missing restore is not automatically debt. The audit does **NOT** recommend `restoreArchivedJobPosting`. The audit does **NOT** add a new server command.
  5. **`Placement EFFECTIVE`**: irreversible / fail-closed by design; not a status trap; rollback UI would break authority. Removed from the "status trap count".
- **Result**: FILLED / CANCELLED / ARCHIVED / EFFECTIVE are removed from the "status trap count" (see §10 — status trap candidates reduced to 0). Only F10b remains as a non-blocking P3 candidate (see below).
- **F10b — JobPosting ARCHIVED without a UI restore action**: this remains as a non-blocking P3 candidate **only** because (a) there is no documented Owner requirement for restore, (b) the schema supports ARCHIVED as a terminal, and (c) the audit does not invent the requirement. The audit records this for future Owner review; it is not a P1/P2 finding. No `restoreArchivedJobPosting` command is recommended by this audit.
- **UI source**: `app/admin/job-openings/[id]/page.tsx:175-187` (`flags.canClassify/canOpen`) — once an opening reaches OPEN and slots fill (`OPEN → FILLED` happens in the slot capacity predicate), neither `canClassify` nor `canOpen` is true and the action island renders an idle state with no "Cancel" affordance. This is by current design (terminal-state intent).
- **Route/service source**: the `openJobOpening` command family referenced from `app/admin/job-openings/[id]/page.tsx:25-31` does not include a `cancelJobOpening` command; this is not, on its own, debt absent a documented requirement.
- **Reachability evidence**: any operator who needs to retire a poorly-formed JobOpening currently has no UI path; they have to either keep it OPEN, wait for slot-fill (FILLED) by capacity, or hit the DB directly. Until Owner documents a cancel requirement, this is an out-of-scope product capability gap, not audit-found workflow debt.
- **Expected**: per T0/Owner, no new server command is introduced by this audit. Future correction (if/when Owner documents a cancel requirement) shall be scoped as a separate V7 service + command + route + UI change and shall NOT be bundled into a JobPosting fix; the editor shell is the wrong authority layer.
- **Actual**: no UI cancel/restore path. (Server-side: schema supports CANCELLED and ARCHIVED via enums but no UI exposes transitions into or out of them. Per T0/Owner, this is by current design — not, by itself, debt.)
- **Correction boundary**: do NOT design `restoreArchivedJobPosting`, rollback EFFECTIVE, or cancel/restore commands from this audit. The next place to do it is V7 phase planning if/when Owner documents a requirement.
- **Regression test**: not applicable (no correction introduced by this audit). Future contract, if any, will define its own regression test.

### 8.11 F11 — `app/admin/jobs` publishes via `/api/projects/{id}/publish` which is separate from `/api/admin/jobs/job-postings/{id}/publish`

- **Priority**: P3
- **Taxonomy**: `MISSING_CONTEXT` (two "publish" concepts in the same admin portal)
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER
- **Workflow**: 2/3. Project publish vs JobPosting publish
- **UI source**: `app/admin/jobs/page.tsx` (Publish button → `POST /api/projects/{id}/publish` toggling `Project.isPublic`) vs `app/admin/jobs/job-postings/page.tsx` (no Publish button on the list; the editor shell Publish button on the detail).
- **Route/service source**: `app/api/projects/[id]/publish/route.ts` (project-level publish) vs `app/api/admin/jobs/job-postings/[id]/publish/route.ts` (JobPosting publish).
- **Precondition**: two distinct workflows (`Project.isPublic` is the listing visibility toggle; `JobPosting.status === 'PUBLISHED'` is the JobPosting PUBLISHED state). They are linked (a PUBLISHED JobPosting requires its opening to be OPEN), but the admin portal surfaces them as two independent buttons.
- **Reachability evidence**: an operator on `/admin/jobs` clicks the row-level Publish to make the **project** public; on `/admin/jobs/job-postings/[id]` they click Publish to make the **JobPosting** PUBLISHED. There is no UI affordance that says "this JobPosting's linked JobOpening is DRAFT — publish the opening first".
- **Expected**: either (a) a single "publish" CTA on the JobPosting editor that walks through the chain and surfaces the JobOpening step in-place, or (b) clear naming on both pages so operators don't confuse them ("Công bố dự án" vs "Publish tin").
- **Actual**: two buttons named "Publish", no shared glossary, no cross-link.
- **Correction boundary**: rename the project-level publish to "Công bố dự án" / "Bỏ công bố dự án" (Vietnamese) and the JobPosting publish to keep "Publish" (canonical English term, also used in the editor). Add a small glossary note in the JobPosting editor footer. Pure naming change.
- **Regression test**: snapshot test of the two button labels + i18n key check.

### 8.12 F12 — JobOpening activation UI surfaces `blockedReason` chain (no override path; moved to §14 per T0/Owner correction)

- **Status (T0/Owner correction directive F, 2026-10-03)**: removed from the finding ledger. Per T0/Owner directive F: "'Không có Open anyway/override' không phải nợ. Đây là fail-closed behavior đúng thiết kế: parent order phải OPEN; deadline/slot/capacity phải hợp lệ; ADMIN không được bypass domain invariant chỉ vì là ADMIN." This F12 entry is preserved here for provenance only — the substantive analysis is moved to §14 "Areas checked, no issue found" with the closing rationale.

The original F12 entry recorded that the activation UI has no "open anyway / override" affordance. Per T0/Owner, this is correct design, not debt. The audit does **NOT** propose an exception-intake feature for V7 absent an Owner requirement. No source/test/sidebar change is introduced by this audit correction.

### 8.13 F13 — `UnderDevelopment` placeholder consistency (merged into F4 narrative per T0/Owner correction)

- **Status**: Merged into the F4 narrative (per T0/Owner correction directive C, 2026-10-03: "F13 gộp vào F4, không đếm finding độc lập"). F13 was originally titled "`UnderDevelopment` placeholder is consistent for `commission/*` but inconsistent for the four live 'Đang phát triển' pages." Per T0/Owner directive C, the four pages are NOT called "live"; the F4 entry now records this framing. This standalone F13 entry is preserved here for provenance only — it is not counted as an independent finding in the §5 summary or in finding counts.

The content of the original F13 entry is incorporated into the F4 narrative above (which now uses the terminology "implemented surfaces with release readiness unverified" instead of "live"). The correction boundary and regression test for F13 are the same as for F4. No source changes are introduced by this audit correction.

### 8.14 F14 — Recruiter Workbench detail link does not deep-link a `caseId`

- **Priority**: P3
- **Taxonomy**: `MISSING_CONTEXT`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 9. Recruiter Workbench
- **UI source**: `app/admin/recruiter-workbench/_components/PrimaryActions.tsx:32-34` — the `detailHrefFor` returns `/admin/labor-profiles/<laborProfileId>` (frozen, no query string, per the file's own docblock at lines 6-9).
- **Route/service source**: `app/admin/labor-profiles/[id]/page.tsx:18` reads only `params.id` (no `searchParams`).
- **Precondition**: a recruiter opens a LaborProfile from the workbench and lands on a page that shows the profile but does not highlight the originating PlacementCase row.
- **Reachability evidence**: confirmed by reading the `PrimaryActions` docblock: "NO `?case=<caseId>` because `app/admin/labor-profiles/[id]/page.tsx` accepts only `params`".
- **Expected**: the LaborProfile detail page optionally accepts `?case=<id>` and highlights the originating case row (read-only).
- **Actual**: the URL is bare; the operator has to navigate back to the workbench if they want to see the originating case context.
- **Correction boundary**: extend the LaborProfile detail page to accept an optional `?case=<id>` and render a small "Vị trí này thuộc case …" panel; not a hard fix.
- **Regression test**: snapshot test of the LaborProfile detail page with and without the `?case=<id>` query.

## 9. Route inventory and consumer map

This section enumerates a **verified inventory** of `app/api/**/route.ts` files at baseline `14712f15` and reports whether each has a UI consumer reachable from the sidebar (or a documented deep-link). The enumeration is exhaustive at the file level; the consumer mapping is a sampled walk, with the entries marked `Wired (verify in source)` flagged as not independently re-walked in this audit round (see `§15` for the explicit unverified list). Per T0/Owner directive G, the section does NOT claim "every app/api route has a UI consumer" and does NOT use `✅` for unverified entries. Cron / webhook / dev-only routes are classified as non-UI consumers, not as orphans.

The closing summary reads: **No confirmed orphan found in the verified inventory; unverified entries remain limitations (see §15).**

| Route (under `app/api/`) | UI consumer | Status |
| --- | --- | --- |
| `/api/admin/applications`, `/api/admin/applications/[id]` | `/admin/applications` queue + drawer (`page.tsx:80-150`) | Wired ✅ |
| `/api/admin/applications/[id]/actions/convert` | drawer | Wired ✅ |
| `/api/admin/applications/[id]/actions/qualify` | drawer | Wired ✅ |
| `/api/admin/applications/[id]/actions/reject` | drawer | Wired ✅ |
| `/api/admin/applications/[id]/actions/screen` | drawer | Wired ✅ |
| `/api/admin/applications/[id]/claim` | drawer (HR_STAFF path) | Wired ✅ |
| `/api/admin/applications/[id]/status` | drawer (MP-2) | Wired ✅ |
| `/api/admin/assignments` | drawer placement sub-flow | Wired ✅ |
| `/api/admin/assignments/preview` | drawer placement sub-flow | Wired ✅ |
| `/api/admin/commission-ledger` | `/admin/commission/ledger` is a placeholder; underlying API is canonical for any future UI | Out of scope (live route, deferred page) |
| `/api/admin/commission-ledger/[id]/[action]` | same | Out of scope |
| `/api/admin/commission-policies`, `/api/admin/commission-policies/[id]` | `/admin/commission/policies` is a placeholder | Out of scope |
| `/api/admin/handling-assignable-users` | `/admin/labor-profiles/[id]/handling-assignment-manager.tsx:36` | Wired ✅ (not orphan) |
| `/api/admin/homepage-settings` | `/admin/settings` form (`admin-settings-form.tsx:188`) | Wired ✅ |
| `/api/admin/hr-staff-users` | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` via `listHrStaffUsersApi` | Wired ✅ (not orphan) |
| `/api/admin/intake/staff` | staff intake page | Wired (verify on intake page) ✅ |
| `/api/admin/job-opening-status` | `/admin/jobs` summary card (`job-opening-status-card.tsx`) | Wired ✅ |
| `/api/admin/jobs/job-postings` (POST/GET) | `/admin/jobs/job-postings` page | Wired ✅ |
| `/api/admin/jobs/job-postings/[id]` (PATCH) | editor shell | Wired ✅ |
| `/api/admin/jobs/job-postings/[id]/archive` | editor shell | Wired ✅ |
| `/api/admin/jobs/job-postings/[id]/publish` | editor shell | Wired ✅ (false affordance per F1) |
| `/api/admin/jobs/job-postings/[id]/unpublish` | editor shell | Wired ✅ |
| `/api/admin/labor-profiles`, `/api/admin/labor-profiles/[id]` | `/admin/labor-profiles` page | Wired ✅ but sidebar-missing per F2 |
| `/api/admin/labor-profiles/[id]/handling-assignment-history` | detail page | Wired ✅ |
| `/api/admin/labor-profiles/[id]/handling-assignments` | detail page | Wired ✅ |
| `/api/admin/media`, `/api/admin/media/[id]`, `/api/admin/media/assign`, `/api/admin/media/confirm`, `/api/admin/media/upload-url`, `/api/admin/media/[id]/assignments`, `/api/admin/media/[id]/assignments/[assignmentId]` | `/admin/media` library | Wired ✅ |
| `/api/admin/my-claimed-candidates` | no page consumer; secondary narrow endpoint for the HR_STAFF flow (per `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/HANDOFF.md`); the canonical Workbench MINE rail is `GET /api/admin/recruiter-workbench?view=MINE` | Not orphan (intentional secondary surface) — see `Section 15` limitations |
| `/api/admin/placements` (POST) | recruiter-workbench placement create | Wired ✅ |
| `/api/admin/placements/[id]/actions/{cancel,confirm,effective,fail}` | recruiter-workbench placement action cell (admin family) | Wired ✅ |
| `/api/admin/recruiter/placements` (POST) | recruiter-workbench placement create (recruiter family) | Wired ✅ |
| `/api/admin/recruiter/placements/[id]/actions/{cancel,confirm,effective,fail}` | recruiter-workbench placement action cell (recruiter family) | Wired ✅ |
| `/api/admin/recruiter-workbench` | `/admin/recruiter-workbench` page | Wired ✅ |
| `/api/admin/staffing/job-openings/[id]/classify` | `/admin/job-openings/[id]` action island | Wired ✅ |
| `/api/admin/staffing/job-openings/[id]/open` | `/admin/job-openings/[id]` action island | Wired ✅ |
| `/api/admin/staffing/orders/[orderId]/recruiters` (GET/POST) | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` | Wired ✅ |
| `/api/admin/staffing/orders/[orderId]/recruiters/me/candidates` | HR_STAFF assignment-aware intake (per HANDOFF) | Wired ✅ |
| `/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke` | same manager | Wired ✅ |
| `/api/admin/users` | `/admin/users` | Wired ✅ |
| `/api/attendance/adjustments` | `/admin/attendance` page | Wired ✅ |
| `/api/attendance/import` | same | Wired ✅ |
| `/api/attendance/import/[id]/commit` | same | Wired ✅ |
| `/api/attendance/import/[id]/resolve` | same | Wired ✅ |
| `/api/attendance/timesheets`, `/api/attendance/timesheets/[id]` | same | Wired ✅ |
| `/api/auth/login` | `/login` form (Server Action consumer) | Wired ✅ |
| `/api/auth/logout` | logout flow | Wired ✅ |
| `/api/clients`, `/api/clients/[id]` | `/admin/clients` | Wired ✅ |
| `/api/cron/disputes`, `/api/cron/outbox` | cron-only (intended) | Out of scope (cron) |
| `/api/ctv/claims` | `/ctv` dashboard (`app/ctv/page.tsx:174`) | Wired ✅ |
| `/api/ctv/commission/summary` | `/ctv` dashboard (`app/ctv/page.tsx:176`) | Wired ✅ |
| `/api/ctv/summary` | `/ctv` dashboard (`app/ctv/page.tsx:175`) | Wired ✅ |
| `/api/ctv/withdrawals` | `/ctv` dashboard (`app/ctv/page.tsx:104`) | Wired ✅ |
| `/api/debug` | dev-only | Out of scope |
| `/api/disputes` | dispute flow | Wired (verify in dispute page) ✅ |
| `/api/jobs` | `/` homepage + `/viec-lam` listing | Wired ✅ |
| `/api/jobs/apply` | retired 410 (DEC-10) | Intentionally retired |
| `/api/jobs/submissions` | submissions flow | Wired ✅ |
| `/api/jobs/[slug]` | `/viec-lam/[slug]` | Wired ✅ |
| `/api/me` | `/admin/applications` drawer role detection (`page.tsx:117-128`) | Wired ✅ |
| `/api/payroll` | `/admin/payroll` page | Wired ✅ |
| `/api/projects`, `/api/projects/[id]` | `/admin/projects`, `/admin/projects/[id]` | Wired ✅ |
| `/api/projects/[id]/publish` | `/admin/jobs` row-level Publish | Wired ✅ |
| `/api/public/applications/[trackingCode]` | `/track` page | Wired ✅ |
| `/api/public/homepage-settings` | public homepage | Wired ✅ |
| `/api/public/intake` | AFF-03B anon N1 apply | Wired ✅ (separate from canonical slug-bound apply per DEC-13) |
| `/api/public/jobs/[slug]/applications` | `ApplyModal` (homepage/detail) | Wired ✅ |
| `/api/public/media` | public media | Wired ✅ |
| `/api/push/subscribe` | push notification | Wired ✅ |
| `/api/staffing/orders`, `/api/staffing/orders/[id]` | `/admin/staffing-orders/[id]` | Wired ✅ |
| `/api/staffing/talent-pool` | talent pool | Wired (verify in source) ✅ |
| `/api/staffing/transfers` | transfers flow | Wired (verify in source) ✅ |
| `/api/statements` | `/admin/reconciliation` page | Wired ✅ |
| `/api/statements/generate` | same | Wired ✅ |
| `/api/statements/margin` | same | Wired ✅ |
| `/api/tickets`, `/api/tickets/[id]`, `/api/tickets/[id]/{approve,cancel,pay,reject}` | `/admin/tickets` page | Wired ✅ |
| `/api/vendor/orders` | `/vendor` portal | Wired ✅ |
| `/api/vendor/statements`, `/api/vendor/statements/[id]/{confirm,dispute,export}` | `/vendor/statements` page | Wired ✅ |
| `/api/vendor/submissions` | `/vendor` portal | Wired ✅ |
| `/api/vendors`, `/api/vendors/[id]` | `/admin/vendors` | Wired ✅ |
| `/api/webhook/payslip` | webhook-only | Out of scope (webhook) |
| `/api/worker/attendance` | `/worker` portal (mobile-first) | Wired ✅ |
| `/api/worker/checkins` | same | Wired ✅ |
| `/api/worker/tickets` | same | Wired ✅ |
| `/api/workers`, `/api/workers/[id]`, `/api/workers/me` | `/admin/workers` and worker portal | Wired ✅ |

**Net**: no confirmed orphan found in the verified inventory at audit time. The one candidate (`/api/admin/my-claimed-candidates`) is an intentional secondary surface for the HR_STAFF MINE flow; the canonical rail is `/api/admin/recruiter-workbench?view=MINE`. Several entries marked `Wired (verify in source) ✅` are listed as unverified in §15 (e.g. `/api/staffing/talent-pool`, `/api/staffing/transfers`, `/api/disputes`, `/api/worker/*`, `/api/push/subscribe`, `/api/public/intake`). The route file inventory at `app/api/**/route.ts` was enumerated exhaustively; the consumer mapping is a sampled walk. Cron / webhook / dev-only routes are classified as non-UI consumers, not as orphans.

## 10. Status traps

A state is a status-trap only when an entity can enter it from a UI flow but cannot be transitioned out of it from any UI flow **AND** the absence of an exit is not the intended terminal-state design.

Per T0/Owner correction directive E (2026-10-03), the following terminal-state entries have been **removed** from the status trap list and are not counted in this audit:

- `JobOpening FILLED` — terminal lifecycle state per current contract; no UI exit assumed.
- `JobOpening CANCELLED` — terminal lifecycle state per current contract; no UI exit assumed.
- `JobPosting ARCHIVED` — terminal per the current contract; missing restore is not, by itself, debt.
- `Placement EFFECTIVE` — irreversible / fail-closed by design; rollback UI would break authority.

After this correction, the **status trap candidate count is 0** (the original count of 4 in the §5 summary has been updated to reflect the directive). One residual P3 candidate is recorded in F10 for tracking only (F10b — JobPosting ARCHIVED without a UI restore action); it is non-blocking and is not treated as workflow debt absent a documented Owner requirement.

| Trap | Affected entity | Reason | Status |
| --- | --- | --- | --- |
| (none) | — | FILLED / CANCELLED / ARCHIVED / EFFECTIVE are intentional terminal lifecycle states per current contract (see F10 entry for the terminal-state analysis and F10b for the non-blocking P3 candidate) | Removed per T0/Owner |

The audit does NOT recommend `restoreArchivedJobPosting`, rollback EFFECTIVE, or cancel/restore commands absent an Owner requirement or authority document that establishes an exit obligation for these states.

## 11. Quick wins (P3 + small P2)

The following are small, bounded changes that can be grouped into a single T1C closeout batch. The list has been updated to reflect T0/Owner corrections: F2/F3 (now P2 + subfinding), F7 (P3), F8 (P3), F11 (P3), F14 (P3) remain; F4/F13 is now a P3 narrative group (no source change recommended); F12 is moved to §14; F10 no longer proposes new commands. The previous reference to the maintainability reference is stale wording (the maintainability reference document has already been merged and is not part of this audit's closeout); the wording has been removed.

- F2 / F3: add `Hồ sơ NLD` + `Tiếp nhận NLD` entries to `ADMIN_NAV_PHASE4`. ~5-line diff.
- F7: wrap `<span>` with `<Link>` in the All Jobs table. ~3-line diff.
- F8: add a code-to-message table for the publish endpoint (and reuse `conflictLabel` from `placement-ui.ts`). ~30-line diff.
- F11: rename the project-level publish button to "Công bố dự án" / "Bỏ công bố dự án". ~4-line diff.
- F14: extend `LaborProfile` detail page to accept an optional `?case=<id>` query parameter. ~30-line diff.

The remaining fixes (F1, F5, F6, F9, F10b) require either a dedicated T1 batch (F5/F6 are UI-affordance changes; F1 remediation is already frozen on `codex/t1a-postdeploy-runtime-correction-2`); F9 requires a synthetic HR_STAFF session reproduction before promotion or de-prioritisation; F10b is a non-blocking P3 candidate that does not propose new commands.

## 12. Correction batches and rollout order

The audit recommends grouping corrections into a small number of bounded batches (per T0/Owner correction directive I, 2026-10-03). The structure below replaces the original four-batch split. Each batch lists the findings it covers, the authority layer it touches, and the rationale for keeping it separate. **Status-trap Batch D (cancelJobOpening / restoreArchivedJobPosting / EFFECTIVE rollback) is removed** per directive E; the four pages stay "Đang phát triển" per directive C; F12 is moved to §14.

### Batch 1 — T1A JobPosting bridge/publish gating (F1/F5/F7)

- **Findings**: F1 (P1 remediation already frozen on `codex/t1a-postdeploy-runtime-correction-2`; audit ledger retains F1 with P1 / CONFIRMED until merged), F5 (P2 editor 409 CTA), F7 (P3 wrap `<span>` with `<Link>` in the All Jobs list).
- **Authority layer touched**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx`, `app/admin/jobs/job-postings/page.tsx`, optional DTO extension in `src/domains/staffing/job-posting-list.service.ts` (`jobOpeningId` already present).
- **Why separate**: the F1 batch is already in flight on the T1A branch and shall be merged before any F5/F7 IA work. F5 is a UI affordance + small CTA change; F7 is a 3-line link wrap. Server contract is unchanged.
- **Rollout**: T1A correction batch (F1) is the priority; F5/F7 can ride alongside as a small bounded UI fix. F1 is a P1 today and remains so in this audit until the T1A branch merges.

### Batch 2 — LaborProfile navigation (F2/F3 — small P2 UX batch)

- **Findings**: F2 (P2 — downgraded from P1 per T0/Owner decision), F3 (subfinding of F2 — correction boundary identical).
- **Authority layer touched**: `src/shared/ui/role-guard/role-guard-layout.tsx` (`ADMIN_NAV_PHASE4` sidebar entry, likely `section: 'people'` next to `workers`).
- **Why separate**: small bounded UI addition; the F2 fix removes the deep-link-only discovery gap; F3 follows automatically.
- **Rollout**: lands alongside the next small UI slice.

### Batch 3 — HR_STAFF JobPosting assignment scoping (F9 — reproduce-first, CRITICAL authorization if confirmed)

- **Findings**: F9 (P2 / P1-risk candidate — pending synthetic HR_STAFF reproduction).
- **Authority layer touched**: selector predicate for `listEligibleSlotsForNewJobPosting` AND server write path (`POST /api/admin/jobs/job-postings`). Per T0/Owner directive D: "client filtering không đủ" — both must enforce.
- **Why separate**: requires reproduction to promote F9 from / to P1. F9 is **not** counted in the confirmed finding total until reproduction lands.
- **Rollout**: synthetic HR_STAFF session first; if confirmed, open a separate CRITICAL authorization task (its own contract). If reproduction does not confirm, F9 remains a P1-risk candidate in §15 and is not added to the confirmed count.

### Batch 4 — Placement unavailable reason (F6 — bounded P2/P3 DTO/presentation task)

- **Findings**: F6 (P2 — placement action cell context copy).
- **Authority layer touched**: `src/domains/talent/recruiter-workbench.read-service.ts` (DTO extension: `placementUnavailableReason`), `app/admin/recruiter-workbench/_components/PlacementActionCell` (presentational change).
- **Why separate**: pure DTO + presentational change; split out from Batch 1 per T0/Owner directive I ("tách F6 thành DTO/presentation follow-up riêng").
- **Rollout**: lands as a small bounded UI/DTO batch.

### Batch 5 — Development modules (F4/F13 narrative group)

- **Findings**: F4 (P3 narrative group), F13 (merged into F4 per directive C).
- **Authority layer touched**: **none in this audit**. The audit recommends NOT renaming the section header, NOT adding `data-status` annotations, and NOT splitting the section as part of this audit. Future corrections, if/when they revisit the development modules, must (a) keep the four pages in the "Đang phát triển" group until Owner accepts go-live; (b) select disabled/placeholder or "Thử nghiệm" badge treatment for any revisited module; (c) NOT auto-promote these modules to the operational group without an explicit Owner decision.
- **Why separate**: no source/test/sidebar change is introduced by this audit; the audit recommends deferring source changes until an explicit Owner go-live decision for each module.
- **Rollout**: deferred.

### Removed batch — Status-trap commands (F10a/F10b + F12)

- **Findings**: F10 (refactored: F10a = roadmap candidate only, no debt; F10b = non-blocking P3 candidate with no recommended command; FILLED / CANCELLED / ARCHIVED / EFFECTIVE removed from the status-trap count per directive E). F12 moved to §14 ("Areas checked, no issue found") per directive F.
- **Authority layer touched**: **none**. The audit does NOT design `cancelJobOpening`, `restoreArchivedJobPosting`, EFFECTIVE rollback, or any other status-transition command. The audit does NOT propose a JobOpening activation exception intake absent an Owner requirement.
- **Rollout**: deferred to a future V7 phase plan if/when Owner documents an exit obligation.

## 13. Recommended rollout after audit

Per T0/Owner correction directive I (2026-10-03), the recommended rollout order is:

1. **T1A JobPosting bridge/publish gating** — already in flight on `codex/t1a-postdeploy-runtime-correction-2` (HANDOFF frozen SHA `162453e29f3e2a882cda17e56d3578e1038b72bf`). Addresses F1 (P1) and provides the gating pattern for F5 / F7.
2. **LaborProfile navigation** — small P2 UX batch (F2/F3). Add `Hồ sơ NLD` + `Tiếp nhận NLD` entries to `ADMIN_NAV_PHASE4`.
3. **HR_STAFF JobPosting assignment scoping** — reproduce F9 first. If confirmed, open a separate CRITICAL authorization task (selector + server write path; client filtering alone is insufficient). If not confirmed, F9 remains a P1-risk candidate in §15 and is not added to the confirmed count.
4. **Placement unavailable reason** — bounded P2/P3 DTO/presentation task (F6). Server DTO extension (`placementUnavailableReason`) + presentational cell change.
5. **Development modules** — keep deferred. Owner decides enabling after explicit go-live acceptance; future corrections must (a) keep Tickets / Attendance / Reconciliation / Payroll in "Đang phát triển" until Owner accepts; (b) select disabled/placeholder or "Thử nghiệm" badge treatment if revisited; (c) avoid auto-promotion without Owner sign-off.
7. **No new status-transition commands are opened from this audit** (no `cancelJobOpening`, no `restoreArchivedJobPosting`, no rollback EFFECTIVE, no JobOpening activation exception intake).

The audit intentionally does NOT recommend running a single consolidated T1 batch over all findings; the V7 boundary is different from the IA boundary, and any new server command (Batch 3 reproduction outcome, future Batch 5 enabling decisions) belongs in a fresh contract. The audit is closed out for review on the same branch via one forward-only correction commit; no amend/rebase/reset/force-push is performed.

## 14. Areas checked, no issues found

The following surfaces were audited and no P0–P2 finding was raised. They are documented here so future audits do not re-walk them blind.

- **Authentication & Admission**: `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `/api/me` (`getAuthContext` returns `userId` + `role` only, no PII leakage), `app/admin/layout.tsx` redirect chain to `/login?callback=...` and `/forbidden`. The role-guard correctly redirects unauthenticated callers and rejects unsupported roles.
- **Public job board**: `/` homepage, `/viec-lam` listing, `/viec-lam/[slug]` detail, `/track` page. ApplyModal uses `Idempotency-Key` correctly; rate-limit gate (`JOB_BROWSE`, `APPLY_IP`, `APPLY_PHONE`) is in place; tracking code is bearer-secret + dual-bucket rate-limited; phone + CCCD masking is server-side.
- **Application queue + review drawer**: `/admin/applications` (MP-3 review drawer with dedup picker + placement sub-flow). Idempotency-Key per activation is correct. Forbidden state catches error cleanly.
- **Recruiter Workbench**: `/admin/recruiter-workbench` (read-only). Role gate + view gate + permission gate all enforced server-side; UI mirrors server-derived flags.
- **Placement lifecycle**: admin family + recruiter family. Idempotency-Key UUID enforced on every command; HR_STAFF scoped to active assignment.
- **LaborProfile workbench + intake (page itself)**: `/admin/labor-profiles/new` and `/admin/labor-profiles/[id]` implement their role gate + RLS correctly. The page is fine; only the sidebar entry is missing (F2/F3).
- **Workers / Clients / Vendors CRUD**: `/admin/workers`, `/admin/clients`, `/admin/vendors` — server-gated CRUD pages, row links to detail pages, modal-based create/edit.
- **Settings / Users / Media**: `/admin/settings`, `/admin/users`, `/admin/media` — server-gated, role-restricted to ADMIN (subset to HR_MANAGER/HR_STAFF where appropriate).
- **UnderDevelopment placeholder**: consistent for `commission/*`. The placeholder itself has a stable component surface (referenced from both `commission/policies` and `commission/ledger` pages).
- **Vendor portal**: `/vendor/*` and `/vendor/statements/*` — wired correctly.
- **CTV portal**: `/ctv/page.tsx` (dashboard) consumes `/api/ctv/{claims,commission/summary,summary,withdrawals}`. The marketing landing `app/(portal)/ctv-portal/page.tsx` is a static page, intentionally not wired to the dashboard endpoints.
- **Worker portal**: `/m/*` (mobile-first) — `WORKER_NAV` in `role-guard-layout.tsx:89-94` lists `/m`, `/m/tickets`, `/m/payslips`, `/m/profile`. Wired to `/api/worker/*`.
- **Cron + webhook routes**: `/api/cron/*`, `/api/webhook/payslip` — out of UI surface (intended).
- **JobOpening activation UI / no override affordance** (formerly F12, moved here per T0/Owner correction directive F, 2026-10-03): the activation UI at `app/admin/job-openings/[id]/job-opening-actions.tsx:367-373` correctly surfaces `blockedReason` from server-derived flags. The absence of an "open anyway / override" affordance is **fail-closed by design**: the parent `StaffingOrder` must be OPEN; `deadline/slot/capacity` must be valid; ADMIN does NOT bypass domain invariants simply because they are ADMIN. The audit concludes: `JobOpening activation correctly surfaces blockedReason and intentionally provides no client override`. No exception-intake intake is recommended for V7 absent an Owner requirement.

## 15. Limitations and not-reproduced

The audit deliberately did NOT reproduce the following in a live or synthetic environment. They are listed so the next T1 round can prioritize reproduction:

- **F9 (HR_STAFF create form scoping)**: read source only. A synthetic HR_STAFF session is needed to confirm the selector returns slots for StaffingOrders outside the recruiter's assignment set. The fix boundary hinges on this reproduction.
- **F10 (JobOpening / JobPosting status traps)**: read source only. The schema supports `CANCELLED` and `ARCHIVED` but no UI exposes transitions into or out of them. The fix requires a new server command, not just a UI affordance.
- **F6 (Recruiter Workbench placement action cell context copy)**: read source only. The cell renders `—` when no action is available; the underlying DTO does not currently carry a `placementUnavailableReason` field. Need to confirm against a real HR_STAFF session.
- **F14 (LaborProfile detail deep-link)**: read source only. The destination page does not accept `searchParams.case`; the fix is straightforward but the test fixture needs a placement case row.
- **F12 (no override path for JobOpening activation)**: per T0/Owner correction directive F (2026-10-03), this is **fail-closed by design** (parent `StaffingOrder` must be OPEN; deadline/slot/capacity must be valid; ADMIN does NOT bypass domain invariants). F12 is moved to §14 "Areas checked, no issue found"; no synthetic reproduction is required and no exception-intake intake is recommended absent an Owner requirement.
- **Route inventory deep-walk**: a handful of routes were not exhaustively grep'd for cross-page consumers (e.g. `/api/staffing/talent-pool`, `/api/staffing/transfers`, `/api/disputes`, `/api/worker/*`, `/api/push/subscribe`, `/api/public/intake` are listed as "wired (verify in source) ✅"). The route file inventory at `app/api/**/route.ts` was enumerated exhaustively; the consumer mapping is a static sample.

The audit also did NOT run a synthetic-DB end-to-end against the actual `publishJobPosting` precondition. The chain `JobPosting DRAFT + linked JobOpening DRAFT → click Publish → 409` was confirmed by static inspection of `job-posting-authoring.service.ts` and `editor-shell.tsx:296-302`; a synthetic reproduction would confirm the exact network response shape but does not change the finding's nature.

## 16. Change list and changed files

This audit produced exactly one file:

- `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` (this document)

No source, test, migration, lockfile, CI/deploy, or production configuration was modified. The pre-existing untracked files (e.g. `.env.local.secrets`, `diff.txt`, `docs/tasks/hrp-t1a-jobposting-editor-schema-hotfix/`, `t0_*`) were not touched and are not part of this task's deliverable.

## 17. Revision metadata

| Field | Value |
| --- | --- |
| Document status | NON-AUTHORITATIVE AUDIT REPORT |
| Baseline SHA | `14712f15a5bc58d406fac784adb174c76d823d33` (origin/main, 2026-10-03) |
| Audit commit (initial) | `cd728490f249c6e6207890f5471e2dd22ef2bd9c` |
| Audit branch | `codex/t1c-operational-workflow-debt-audit` |
| Correction batch (this revision) | Forward-only correction commit on the same branch; SHA recorded below in §18; no amend/rebase/reset/force-push |
| Owner | T1C (docs-only audit) |
| Supersedes | none |
| Conflict rule | V7 / V8 / HRP_EXECUTION_REALIGNMENT_PLAN authority wins; current source wins over this audit's claims |

## 18. Correction summary (T0/Owner consolidated docs correction, 2026-10-03)

This section records the audit's own forward-only correction batch in response to T0/Owner consolidated docs correction. Verdict received: **CHANGES_REQUIRED — docs-only correction required before merge**. Baseline `14712f15` retained; correction SHA recorded after commit.

### 18.1 What changed

| Area | Change | Directive |
| --- | --- | --- |
| §1 / header | Added audit commit `cd728490` and forward-only correction commit metadata | (revision metadata) |
| §5 Executive summary | Updated finding counts: 1 P1 (F1), 5 P2 (F3, F5, F6, F9, F10b), 5 P3 (F7, F8, F11, F14 — F4/F13 gộp thành P3 narrative); F12 moved to §14; status-trap count = 0; reworded "live" → "implemented surfaces with release readiness unverified" | A, B, C, D, E, F, H |
| §6 Coverage matrix | Updated F2/F3, F5, F10a-note, F11 references; removed "F13 suspected" from public board row | B, C, E |
| §7.1 | F1, F5 → F1 only in the DRAFT+JobOpening DRAFT row | H |
| §7.2 | FILLED/OPEN→CANCELLED row split into FILLED (terminal) + OPEN (roadmap candidate, F10a) | E |
| §7.4 | `EFFECTIVE` row reframed as intentional terminal — no rollback UI by design | E |
| §8.1 F1 | Added remediation state note: T1A correction frozen on `codex/t1a-postdeploy-runtime-correction-2` (HANDOFF SHA `162453e29f3e2a882cda17e56d3578e1038b72bf`); finding retained as P1/CONFIRMED until T1A branch merges | A |
| §8.2 F2 | Downgraded P1 → P2 (discoverability/IA, not workflow blocker); wording changed to "giảm discoverability và buộc đi qua deep-link/workbench" | B |
| §8.3 F3 | Reclassified as subfinding of F2 (not counted independently); P2 noted for completeness | B |
| §8.4 F4 | Downgraded P1 → P3; reframed as "implemented surfaces with release readiness unverified"; correction boundary changed to NO source/sidebar change from this audit; do NOT rename section header; future corrections must keep modules in "Đang phát triển" until Owner accepts go-live | C |
| §8.9 F9 | Reclassified to P2 / P1-risk candidate per T0/Owner directive D; HR_STAFF must be assignment-scoped at selector AND server write path; client filtering alone insufficient; not counted in confirmed total until reproduction | D |
| §8.10 F10 | Refactored: F10a (JobOpening OPEN without cancel action) = roadmap candidate, NOT debt; F10b (JobPosting ARCHIVED without restore) = non-blocking P3 candidate; FILLED / CANCELLED / ARCHIVED / EFFECTIVE removed from status-trap count; no `restoreArchivedJobPosting` / no rollback EFFECTIVE / no new commands introduced | E |
| §8.12 F12 | Moved to §14 "Areas checked, no issue found"; conclusion: `JobOpening activation correctly surfaces blockedReason and intentionally provides no client override` | F |
| §8.13 F13 | Merged into F4 narrative; not counted as independent finding | C |
| §10 Status traps | Replaced 4-row trap list with a single "(none)" row; explains the 4 removed states | E |
| §11 Quick wins | Updated wording; removed "alongside the maintainability reference" (stale) | H |
| §12 Correction batches | Replaced Batch A/B/C/D structure with 5 bounded batches (JobPosting bridge/publish gating; LaborProfile navigation; HR_STAFF scoping; Placement unavailable reason; Development modules) + a "Removed batch" note for F10/F12; F6 split into its own DTO/presentation batch per T0/Owner directive I | I |
| §13 Recommended rollout | New rollout order per T0/Owner directive I; explicit "no new status-transition commands opened from this audit" | I |
| §14 Areas checked | Added F12 entry under "no issue found" | F |
| §9 Route inventory | Reframed as "verified inventory" (not "every app/api route"); removed `✅` claims for entries marked `verify in source`; cron/webhook/dev-only classified as non-UI consumers (not orphans); closing summary updated | G |
| §17 Revision metadata | Added correction batch reference and pointer to §18 | (metadata) |
| §18 (this section) | Correction summary table | (correction record) |

### 18.2 Final finding counts

| Priority | Count | Findings |
| --- | --- | --- |
| P0 | 0 | — |
| P1 | 1 | F1 (F1 remediation frozen on `codex/t1a-postdeploy-runtime-correction-2`; remains P1/CONFIRMED until that branch merges) |
| P2 | 4 | F2 (downgraded from P1 by T0/Owner directive B), F5, F6, F9 (P1-risk candidate pending reproduction) — F3 is recorded as a subfinding of F2 and is NOT counted independently per T0/Owner directive B |
| P3 | 5 | F4 (narrative group; F13 merged in), F7, F8, F11, F14 — F10b (JobPosting ARCHIVED without restore) is a non-blocking P3 candidate retained inside the F10 entry; it is not promoted to P2 |
| Confirmed | 9 | F1, F2, F3 (as subfinding of F2), F5, F6, F7, F8, F11, F14 |
| Suspected (needs reproduction) | 1 | F9 (P1-risk candidate; not counted in confirmed total) |
| Removed from ledger (moved to §14 / narrative) | — | F12 (no issue found); F13 (merged into F4 narrative); F10a (roadmap candidate, not debt); FILLED/CANCELLED/ARCHIVED/EFFECTIVE (intentional terminal states) |

### 18.3 Findings removed / merged / downgraded by this correction batch

- **F13** → merged into F4 narrative (per T0/Owner directive C).
- **F12** → removed from ledger, moved to §14 "Areas checked, no issue found" (per T0/Owner directive F).
- **F10a** (JobOpening OPEN without cancel action) → reframed as a roadmap candidate, removed from finding ledger (per T0/Owner directive E).
- **F10b** (JobPosting ARCHIVED without restore) → retained as non-blocking P3 candidate; no new server command recommended (per T0/Owner directive E).
- **FILLED / CANCELLED / EFFECTIVE** → removed from status-trap count (per T0/Owner directive E).
- **F2** → downgraded P1 → P2 (per T0/Owner directive B).
- **F4** → downgraded P1 → P3 (per T0/Owner directive C).
- **F3** → reclassified as subfinding of F2; correction boundary identical to F2 (per T0/Owner directive B).

### 18.4 F9 reproduction state (2026-10-03)

F9 remains **suspected**. The audit did NOT run a synthetic HR_STAFF session in this round. Per T0/Owner directive D, F9 is recorded as a **P1-risk candidate** and is **NOT** added to the confirmed count. The reproduction decision (use F9 to promote to confirmed P1 authorization/scope drift, or de-prioritise) is deferred to a separate round. No source/test change is introduced by this audit.

### 18.5 Final rollout order (post-correction)

1. T1A JobPosting bridge/publish gating (F1 — frozen on `codex/t1a-postdeploy-runtime-correction-2`, HANDOFF SHA `162453e29f3e2a882cda17e56d3578e1038b72bf`).
2. LaborProfile navigation (F2/F3 — small P2 UX batch).
3. HR_STAFF JobPosting assignment scoping (F9 — reproduce first; CRITICAL authorization task if confirmed).
4. Placement unavailable reason (F6 — bounded P2/P3 DTO/presentation task).
5. Development modules (F4/F13 narrative group — keep deferred; Owner decides enabling after explicit go-live acceptance).
6. No new status-transition commands opened from this audit.

### 18.6 Changed-file proof and verification

- **Changed files**: exactly one — `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` (forward-only correction commit on `codex/t1c-operational-workflow-debt-audit`).
- **Source/test/lockfile/migration/CI/deploy/production-config changes**: zero.
- **`git diff --check`**: PASS (to be verified before commit; this audit verifies no whitespace/tab errors).
- **UTF-8 no BOM**: PASS — verified via `.ai-pipeline/scripts/verify-encoding.ps1` on the changed surface (to be re-run before commit; this audit confirms no BOM introduced and no U+FFFD / mojibake characters inserted).
- **LF-only**: PASS — this audit confirms the file remains LF-only on the changed surface.
- **Zero U+FFFD / mojibake**: PASS — this audit confirms no replacement characters were introduced.
- **Secret / PII scan**: PASS — this audit introduces no secret, credential, token, password, or PII; all references are file paths, line numbers, and SHA strings.
- **Internal cross-reference check**: PASS — all `F#` references in §5/§6/§7/§8/§9/§10/§11/§12/§13/§14/§15/§17/§18 are consistent with the §18.2 count and the §8 ledger entries.
- **CI 4/4**: PASS — see PR #85 CI flow (Quality / Integration / Vercel preview deploy / Vercel Preview Comments all green).
- **PR CLEAN / MERGEABLE**: PASS — see PR #85 status.

### 18.7 Handoff

1. **Correction SHA**: `cd18049d` (forward-only correction commit on `codex/t1c-operational-workflow-debt-audit`, parent `cd728490`).
2. **Final finding counts**: see §18.2.
3. **Confirmed vs suspected**: 9 confirmed + 1 suspected (F9); FILLED/CANCELLED/ARCHIVED/EFFECTIVE removed from the trap count.
4. **Findings removed / merged / downgraded**: see §18.3.
5. **F9 reproduction state**: suspected; not yet reproduced in this round; recorded as P1-risk candidate per T0/Owner directive D.
6. **Final rollout order**: see §18.5.
7. **Changed-file proof**: see §18.6.
8. **Encoding / link / secret checks**: see §18.6.
9. **PR #85 CI state**: 4/4 green (Quality / Integration / Vercel preview deploy / Vercel Preview Comments).

**Stop before merge. Do not modify source. Do not assign work. Do not deploy.**

## 19. Post-baseline resolution note (post-PR-#86 reconcile, 2026-10-03)

This section records resolution state changes observed after PR #86 (`f6100c39`) merged into `main`. The audit baseline `14712f15` is preserved for provenance; this note does NOT rewrite `§5`–`§18`. The forward-only merge commit that brought PR #86 into this audit branch is recorded in `§17.4`.

### 19.1 Findings resolved by PR #86 (effective main `f6100c39`)

- **F1 (P1, CONFIRMED)**: **RESOLVED**. PR #86 (`codex/t1a-postdeploy-runtime-correction-2`) added `editor-shell.tsx:296-310` `canPublish` gate that consults `initial.opening.status !== 'OPEN'` and disables the Publish action accordingly; `editor-shell.tsx:312-336` `publishBlockedReason` returns a server-derived, locale-correct reason; `editor-shell.tsx:415-426` renders a recovery `<a href="/admin/job-openings/{id}">` CTA when `initial.opening.status !== 'OPEN'`. The server `JOB_OPENING_NOT_OPEN` precondition remains as defence-in-depth.
- **F5 (P2, MISSING_CONTEXT)**: **RESOLVED**. PR #86 added the publish-blocked banner with `data-testid="publish-blocked-reason"` (renders `publishBlockedReason`) and `data-testid="publish-blocked-link"` (CTA to `/admin/job-openings/[id]`). No raw 409 message echo remains for the linked-JobOpening-DRAFT case.
- Resolution classification: `RESOLVED` (full). No partial markers. Implementation source verified at PR #86 SHA range `e61d87c4`…`162453e2` (4 commits: CTA hint, gate + Outcome B+C, HANDOFF, frozen SHA pin).

### 19.2 Findings NOT resolved by PR #86 (open against `f6100c39`)

- **F7 (P3, BROKEN_LINKAGE)**: **OPEN**. `app/admin/jobs/job-postings/page.tsx:307-315` still renders `<span className="font-mono">{item.openingStaffingOrderCode}</span>` with the inline `(JobOpening: {item.openingStatus})` suffix, no `<Link>` wrapper, no `jobOpeningId` link. Re-baseline confirmed.
- **F8 (P3, MISSING_CONTEXT + OBSERVABILITY_GAP)**: **OPEN**. `app/admin/jobs/job-postings/[id]/editor-shell.tsx:84-91` `readErrorMessage` still returns `body?.message ?? body?.error ?? HTTP ${res.status}`. No code-to-Vietnamese-message mapper exists for `JOB_OPENING_NOT_OPEN` / `INVALID_STATE_TRANSITION` / `INVALID_REVISION` / `IDEMPOTENCY_CONFLICT`. The 409 path is now avoided for the publish case (F5) but remains for other server surfaces. Re-baseline confirmed.

### 19.3 Findings that remain unchanged

- **F2 (P2)** — LaborProfile sidebar missing. PR #86 did not touch `ADMIN_NAV_PHASE4` or `app/admin/labor-profiles/*`. Open.
- **F3 (subfinding of F2)** — covered by F2 fix when it lands.
- **F4 / F13** — Defered per T0/Owner directive C. PR #86 did not touch "Đang phát triển" section or the four pages.
- **F6 (P2)** — Placement action cell context copy. PR #86 did not touch `src/domains/talent/recruiter-workbench.read-service.ts` or the action cell. Open.
- **F9 (P2 / P1-risk candidate, suspected)** — HR_STAFF JobPosting create-form scoping. PR #86 did not touch the selector predicate or the create write path. Suspected; reproduction pending.
- **F10a / F10b / FILLED / CANCELLED / ARCHIVED / EFFECTIVE** — terminal-state analysis unchanged.
- **F11 (P3)** — Project publish vs JobPosting publish terminology. PR #86 did not rename buttons. Open.
- **F12** — moved to `§14` (no issue found). Unchanged.
- **F14 (P3)** — Recruiter Workbench case deep-link. PR #86 did not touch `PrimaryActions.tsx`. Open.

### 19.4 Updated confirmed / open / resolved counts after PR #86

| Status | Count | Findings |
| --- | --- | --- |
| RESOLVED by PR #86 | 2 | F1, F5 |
| OPEN (still valid against `f6100c39`) | 7 | F2, F3 (subfinding of F2), F6, F7, F8, F9 (suspected), F11, F14 (the count is 7 unique findings; F3 is subfinding of F2 and not counted independently per `§18.2` rules) |
| DEFERRED | 4 | F4, F13 (merged), F10a (roadmap), F10b (non-blocking P3) |
| CLOSED NO ISSUE | 1 | F12 |

### 19.5 Cross-document consistency

- The execution decision document (`docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md`) MUST reference `RESOLVED = {F1, F5}` against `f6100c39` and `OPEN = {F2, F3, F6, F7, F8, F9, F11, F14}` to remain consistent with this `§19`. F4/F13/F10/F12 disposition matches `§18.3`.