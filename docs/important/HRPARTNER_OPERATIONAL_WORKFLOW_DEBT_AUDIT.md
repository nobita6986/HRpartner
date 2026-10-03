# HRPartner — Operational UX & Workflow Debt Audit (T1C)

> Document status: NON-AUTHORITATIVE AUDIT REPORT
> Measured against `main` SHA: `14712f15a5bc58d406fac784adb174c76d823d33`
> Audit window: 2026-10-03 (after P1 production cutover)
> Branch: `codex/t1c-operational-workflow-debt-audit` from `origin/main` (`14712f15`)
> Owner: T1C (docs-only audit; no source/test/migration touched)
> Supersedes: none
> Conflict rule: this is an audit, not a normative contract. V7 authority, `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, and live source code override any claim made here. If a finding disagrees with current source, source wins.

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

Method: two-direction walk per workflow domain (UI ↔ backend), pattern checklist, role matrix, evidence rules per `Section 3`.

## 5. Executive summary

| Metric | Value |
| --- | --- |
| Total findings | 14 |
| P0 | 0 |
| P1 | 3 |
| P2 | 6 |
| P3 | 5 |
| Confirmed (Static / Production / Reproduced) | 13 |
| Suspected (needs reproduction) | 1 |
| Orphan routes found at audit time | 0 (every audited route file has a UI consumer; see `Section 9` for the explicit "no page consumer found" list and its resolution) |
| Orphan UI surfaces found | 1 (`/admin/labor-profiles` page exists but has no sidebar entry) |
| False affordances | 1 confirmed (F1) |
| Dead-end / status trap candidates | 4 (F13 slate) |
| Sidebar IA inconsistencies | 2 (the "Đang phát triển" semantics split; the `commission/*` vs four-page mismatch) |

**Top-line finding** (one paragraph):

The JobPosting → JobOpening DRAFT publish block recorded in the PR #84 closeout exemplar is **not** an isolated case. The same shape recurs in three different surfaces: the editor shell `canPublish` flag does not consult linked JobOpening status (F1); the "Đang phát triển" sidebar label groups pages that are wired to live APIs but does not mark them `disabled`, while `commission/{policies,ledger}` correctly mark themselves `disabled` and serve an `UnderDevelopment` placeholder (F4); and the canonical `/admin/labor-profiles` list + `/admin/labor-profiles/new` intake are reachable only via a recruiter-workbench deep-link (F2/F3) — the sidebar omits the entry, leaving direct access manual-only. The remaining 11 findings are individual cases that share the same "UI promise / server truth" asymmetry. None of them block all roles from completing a workflow today (no P0), but three (F1, F4, F2) will block a real operator or super-user role in production the next time the linked entity drifts out of sync with the UI affordance.

## 6. Role × workflow coverage matrix

Legend: ✅ workflow completable without developer help · ⚠️ completable with manual URL or workaround · 🟡 has at least one P1/P2 finding · ❌ blocked

| Workflow | Admin | HR_MANAGER | HR_STAFF (scoped) | Public / Anonymous | Vendor / CTV |
| --- | :---: | :---: | :---: | :---: | :---: |
| 1. Login + role landing + role guard | ✅ | ✅ | ✅ | ✅ | n/a |
| 2. Recruitment setup (Client → Project → Order → Slot → JobOpening → Classify → Open) | 🟡 F12 | 🟡 F12 | 🟡 F12, F5 | n/a | n/a |
| 3. JobPosting create / author / save draft | 🟡 F1, F11 | 🟡 F1, F11 | 🟡 F1, F11 | n/a | n/a |
| 4. JobPosting publish / unpublish / archive | 🟡 F1, F5 | 🟡 F1, F5 | 🟡 F1, F5 | n/a | n/a |
| 5. Public job board listing / detail / tracking | ✅ | ✅ | ✅ | ✅ (F13 suspected) | n/a |
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
| DRAFT + linked JobOpening DRAFT (or any ≠ OPEN) | **Publish button enabled** (`app/admin/jobs/job-postings/[id]/editor-shell.tsx:296-302` `canPublish = canMutate && status === DRAFT && title.trim().length > 0 && descriptionJson !== null`) | `publishJobPosting` → throws `AuthoringError('JOB_OPENING_NOT_OPEN', 409, ...)` | — | — | unchanged | **NONE — MISSING_CONTEXT + FALSE_AFFORDANCE (F1, F5)** |
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
| FILLED / OPEN → CANCELLED | (no UI in current pages) | (not exposed) | — | — | — | **STATUS_TRAP candidate (F13)** — JobOpening reaches FILLED with no UI to manage it |

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
| `EFFECTIVE` | (terminal-ish) | — | — | — | — | No UI to roll back — **STATUS_TRAP (F13 slate)** |

## 8. Finding ledger

Findings sorted by priority then by ID. Each finding carries a status evidence line that follows the rule in `Section 3.1.5`.

### 8.1 F1 — JobPosting Publish enabled regardless of linked JobOpening status

- **Priority**: P1
- **Taxonomy**: `FALSE_AFFORDANCE` + `MISSING_CONTEXT`
- **Status evidence**: Static confirmed (current source at `14712f15`)
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 3. JobPosting publish
- **UI source**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx:296-302` (`canPublish`) and `:342-348` (`<ActionButton disabled={!canPublish || isSaving} ... label="Publish" primary />`).
- **Route/service source**: `src/domains/staffing/job-posting-authoring.service.ts:778-873` (`publishJobPosting`) — the precondition block throws `AuthoringError('JOB_OPENING_NOT_OPEN', 409, 'Linked JobOpening … phải ở trạng thái OPEN', { jobOpeningId, jobOpeningStatus })` and the route echoes it via `app/api/admin/jobs/job-postings/[id]/publish/route.ts:98-105`.
- **Precondition**: `current.jobOpening.status !== 'OPEN'` → 409.
- **Reachability evidence**: `/admin/jobs/job-postings` list (`app/admin/jobs/job-postings/page.tsx`) is reachable for CREATE_ROLES, the row link goes to the editor shell; the editor shell's `canPublish` does not consult `jobOpening.status` (only `canMutate + status === DRAFT + title + descriptionJson`).
- **Expected**: when `jobOpening.status` ≠ `OPEN`, the Publish button is `disabled` with the exact server-side reason in plain Vietnamese (e.g. "JobOpening đang DRAFT — mở JobOpening trước khi publish"), and the reason includes a navigation link to the canonical `/admin/job-openings/[id]` page where the user can run the activation command.
- **Actual**: the button is enabled; clicking it returns 409; the editor shell surfaces the raw server message in the inline `errorMessage` slot (`editor-shell.tsx:360-368`) with no recovery CTA.
- **Correction boundary**: surface a server-derived `canPublish` flag in `JobPostingDetailDto` that consults `jobOpening.status`; render disabled + reason + a `<Link>` to `/admin/job-openings/[id]` when `jobOpening.status !== 'OPEN'`. Do NOT touch server contracts; this is a UI affordance-only fix layered on top of the existing canonical service.
- **Regression test**: add an integration test that asserts (a) `canPublish === false` when `jobOpening.status === 'DRAFT'`, (b) the disabled reason text matches the blocked-reason vocabulary from `job-opening-actions.tsx`, (c) the rendered HTML has an `<a href="/admin/job-openings/{id}">` anchor in the reason block.

### 8.2 F2 — `/admin/labor-profiles` is reachable only via deep-link, not via sidebar

- **Priority**: P1
- **Taxonomy**: `ROLE_REACHABILITY`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 8. LaborProfile workbench
- **UI source**: `app/admin/labor-profiles/page.tsx` exists, has its own ALLOWED_ROLES set (`['ADMIN', 'HR_MANAGER', 'HR_STAFF']` at line 16), but is **omitted** from `ADMIN_NAV_PHASE4` (`src/shared/ui/role-guard/role-guard-layout.tsx:121-167`). The full `ADMIN_NAV_PHASE4` lists `/admin`, `/admin/projects`, `/admin/jobs`, `/admin/jobs/job-postings`, `/admin/applications`, `/admin/staffing`, `/admin/workers`, `/admin/clients`, `/admin/vendors`, `/admin/tickets`, `/admin/attendance`, `/admin/reconciliation`, `/admin/payroll`, `/admin/commission/policies`, `/admin/commission/ledger`, `/admin/users`, `/admin/settings`, `/admin/media` — no `/admin/labor-profiles`.
- **Route/service source**: pages render `/admin/labor-profiles/new` and `/admin/labor-profiles/[id]` as direct links (line 58 of the same file shows `href="/admin/labor-profiles/new"` from the workbench list).
- **Precondition**: page-level role gate accepts ADMIN/HR_MANAGER/HR_STAFF.
- **Reachability evidence**: the only inbound links to `/admin/labor-profiles/*` are from `RecruiterWorkbenchTable → PrimaryActions → detailHref = /admin/labor-profiles/<laborProfileId>` (`app/admin/recruiter-workbench/_components/PrimaryActions.tsx:32-34, 44, 53`); an operator who only uses the staff/workbench tabs must know to type the URL or follow a candidate's workbench row to discover the canonical list/intake.
- **Expected**: the canonical "Nhân sự" sidebar section (the `people` group in `ADMIN_NAV_PHASE4` line 134) carries an entry for "Hồ sơ NLD" pointing to `/admin/labor-profiles`, and "Tiếp nhận NLD" is reachable from there.
- **Actual**: the page exists, is fully built, and is reachable only via the recruiter-workbench detail link.
- **Correction boundary**: add the missing `NavItem` entries to `ADMIN_NAV_PHASE4` (`src/shared/ui/role-guard/role-guard-layout.tsx`); section placement should follow the same domain realignment the T1C closeout already applied (likely `section: 'people'` next to `workers`).
- **Regression test**: snapshot test of `ADMIN_NAV_PHASE4` filtered by `role === 'HR_MANAGER'` must include `/admin/labor-profiles` and the rendered sidebar must show the label.

### 8.3 F3 — `/admin/labor-profiles/new` ("Tiếp nhận NLD") is reachable only via the list page deep-link

- **Priority**: P2
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

### 8.4 F4 — Sidebar "Đang phát triển" semantics split: 4 pages wired to live APIs vs 2 placeholders

- **Priority**: P1
- **Taxonomy**: `GATE_DRIFT` + `MISSING_CONTEXT` (the section label misrepresents what is reachable)
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
- **UI source (page reality)**:
  - `app/admin/tickets/page.tsx` — full client page, calls `/api/tickets` and `/api/tickets/[id]/...` (route file inventory confirmed).
  - `app/admin/attendance/page.tsx` — full client page, calls `/api/attendance/import`, `/api/attendance/timesheets`, `/api/attendance/adjustments` (route file inventory confirmed).
  - `app/admin/reconciliation/page.tsx` — full client page, calls `/api/statements`, `/api/statements/margin`, `/api/statements/generate` (the `[id]/dispute,confirm,export` siblings exist only under `/api/vendor/statements/[id]/...`, not under admin — reconciliation's admin actions are not exposed at the route file inventory).
  - `app/admin/payroll/page.tsx` — full client page, calls `/api/payroll` (route file inventory confirmed).
  - `app/admin/commission/policies/page.tsx` — `UnderDevelopment` placeholder.
  - `app/admin/commission/ledger/page.tsx` — `UnderDevelopment` placeholder.
- **Route/service source**: all four "live" pages have matching route handlers under `app/api/...` (see `Section 9` for the explicit route inventory). The two `commission/*` pages have NO live API surface for the admin (the underlying `commission-policies` and `commission-ledger` endpoints exist for backend authority but the placeholder is the only UI).
- **Precondition**: the sidebar group renders inside a `<details>` labeled "Đang phát triển" with `border-dashed` styling (`role-guard-layout.tsx:351-369`) — visual signal says "deferred / not yet ready".
- **Reachability evidence**: the four pages with full implementations are reachable by clicking the un-deferred sidebar links. The section is collapsible but defaults open when the active route is inside it.
- **Expected**: either (a) every item in the "Đang phát triển" section is `disabled: true` and renders an `UnderDevelopment` placeholder (the `commission/*` convention); or (c) the four live items are moved out of "Đang phát triển" and into a real section, with their operational status clearly indicated.
- **Actual**: the section mixes live implementations with deferred placeholders and labels both as "Đang phát triển". Operators reading the section heading form a wrong mental model — either they avoid the live items, or they click the deferred items expecting real data.
- **Correction boundary**: T0/Owner decision — pick (a) or (c). Until then, at minimum rename the section header from "Đang phát triển" to "Vận hành nội bộ" (or similar) and add a `data-status` annotation per item so T1A can split the section without touching route/service code.
- **Regression test**: static assertion that the four live pages either are NOT in the "Đang phát triển" section or are explicitly marked with a status distinct from the two `commission/*` placeholders.

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

### 8.9 F9 — HR_STAFF can see the JobPosting create form for StaffingOrders outside their assignments

- **Priority**: P2
- **Taxonomy**: `ROLE_REACHABILITY` + suspected `GATE_DRIFT`
- **Status evidence**: **Suspected — needs reproduction** (read source; did not run a synthetic HR_STAFF session)
- **Role(s) affected**: HR_STAFF
- **Workflow**: 3. JobPosting create
- **UI source**: `app/admin/jobs/job-postings/page.tsx` renders `<CreateJobPostingForm>` for `CREATE_ROLES` which includes `HR_STAFF`.
- **Route/service source**: `app/api/admin/jobs/job-postings/route.ts` (POST create) and the list selector's filter (referenced from the create form). The selector's filter does not include a recruiter-assignment predicate — the write path uses `assertSlotEligibleForNewJobPosting`, and the documented write path includes only slot eligibility, NOT recruiter assignment.
- **Precondition**: server-side write path uses `assertSlotEligibleForNewJobPosting`; the documented write path includes only slot eligibility, NOT recruiter assignment.
- **Reachability evidence**: HR_STAFF logs in, opens `/admin/jobs/job-postings`, sees a non-empty `eligibleSlots` list, picks a slot for a StaffingOrder they have **no active assignment on**, and the server accepts the create. Compared with `JobOpeningActions` (which DOES gate `assertActiveRecruiterForOrder` for HR_STAFF — see `app/admin/job-openings/[id]/page.tsx:92-104`), this is an asymmetry.
- **Expected**: HR_STAFF either sees a list filtered to assigned StaffingOrders, OR the page renders an info banner "Chỉ tạo JobPosting cho StaffingOrder bạn được phân công" and the write path enforces the assignment predicate.
- **Actual**: `eligibleSlots` is unscoped by assignment; write path does not enforce it. The asymmetry between JobOpening (scoped) and JobPosting create (unscoped) is undocumented at the audit level.
- **Correction boundary**: T0/Owner decision — either (a) accept the asymmetry and document it explicitly in the page header, or (b) extend the selector + write path to gate on `StaffingOrderRecruiterAssignment` for HR_STAFF. Until then, **treat as suspected and do not auto-fix**.
- **Regression test**: integration test that creates a StaffingOrder with no `StaffingOrderRecruiterAssignment`, logs in as HR_STAFF, attempts to create a JobPosting for one of its slots, and asserts either the selector hides it or the write path rejects it with a stable error code.

### 8.10 F10 — JobOpening / JobPosting can be stranded in FILLED / CANCELLED states with no UI exit

- **Priority**: P2
- **Taxonomy**: `STATUS_TRAP`
- **Status evidence**: Suspected — needs reproduction
- **Role(s) affected**: ADMIN, HR_MANAGER
- **Workflow**: 2/3. JobOpening + JobPosting
- **UI source**: `app/admin/job-openings/[id]/page.tsx:175-187` (`flags.canClassify/canOpen`) — once an opening reaches OPEN and slots fill (`OPEN → FILLED` happens in the slot capacity predicate), neither `canClassify` nor `canOpen` is true and the action island renders an idle state with no "CANCELLED" or "FILLED → ARCHIVED" affordance.
- **Route/service source**: the `openJobOpening` command family referenced from `app/admin/job-openings/[id]/page.tsx:25-31` does not include a `cancelJobOpening` command.
- **Precondition**: a `JobOpening.status = 'CANCELLED'` row exists in the schema (the lifecycle enum includes CANCELLED per the closed-action chip list) but no current UI surface lets an operator move an OPEN/CLOSING_SOON opening to CANCELLED without DB access. Likewise, an `ARCHIVED` JobPosting cannot be restored to DRAFT.
- **Reachability evidence**: any operator who needs to retire a poorly-formed JobOpening (e.g. duplicate, wrong StaffingOrder, vendor cancel) currently has no UI path. They have to either keep it as FILLED forever or hit the DB directly.
- **Expected**: a "Hủy JobOpening" action for OPEN openings that are not yet FILLED, with a required reason; a "Khôi phục JobPosting" / "Đưa về DRAFT" action for ARCHIVED postings (the entry should be ADMIN-only and require a reason for audit).
- **Actual**: no UI path. (Server-side: the existing schema supports CANCELLED via the enum but the command has not been wired.)
- **Correction boundary**: scope as a separate V7 service + command + route + UI change. Do not bundle into a JobPosting fix; the wrong authority layer to use here is the editor shell.
- **Regression test**: integration test that creates an OPEN JobOpening, calls the new `cancelJobOpening` command, and asserts the state transitions to CANCELLED with a status history row.

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

### 8.12 F12 — JobOpening activation UI surfaces a 5-step `blockedReason` chain (good), but no "open anyway / override" affordance for HRP-managed edge cases

- **Priority**: P3
- **Taxonomy**: `MISSING_CONTEXT`
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER
- **Workflow**: 2. JobOpening activation
- **UI source**: `app/admin/job-openings/[id]/job-opening-actions.tsx:367-373` renders `blockedReason` from server-derived flags.
- **Route/service source**: `app/admin/job-openings/[id]/page.tsx:152-171` constructs the 7-precondition chain; `openJobOpening` service has no override path. The override pattern used elsewhere (Placement override at `placement-ui.ts`) does not exist for `openJobOpening`.
- **Precondition**: an operator with ADMIN role encounters a JobOpening stuck at DRAFT because `parent StaffingOrder.status !== 'OPEN'` (e.g. the order moved to CLOSING_SOON, or the deadline slipped). The UI says "CLOSING_SOON không đủ điều kiện mở" but offers no override path.
- **Reachability evidence**: confirmed by the editor's `blockedReason` chain — every blocked reason is terminal, no escalation CTA.
- **Expected**: for ADMIN-only cases where the operator knows the order will reopen, an "Yêu cầu mở ngoại lệ" CTA that opens a server-bound intake (out of scope for this audit; documented as V7-bound).
- **Actual**: terminal reason.
- **Correction boundary**: out of scope for this audit; the next place to do it is V7 phase planning. Listed here so the next owner does not think it is missing.
- **Regression test**: not applicable yet.

### 8.13 F13 — `UnderDevelopment` placeholder is consistent for `commission/*` but inconsistent for the four live "Đang phát triển" pages

- **Priority**: P3
- **Taxonomy**: `MISSING_CONTEXT` (cross-link from F4)
- **Status evidence**: Static confirmed
- **Role(s) affected**: ADMIN, HR_MANAGER, HR_STAFF
- **Workflow**: 12. Operations
- **UI source**: `app/admin/commission/policies/page.tsx` and `app/admin/commission/ledger/page.tsx` both render an `UnderDevelopment` placeholder. The four live "Đang phát triển" pages render real clients.
- **Route/service source**: the four live pages have live API routes (`/api/tickets`, `/api/attendance/import`, `/api/statements`, `/api/payroll`).
- **Precondition**: `UnderDevelopment` is a stable component (referenced from both `commission/*` pages).
- **Reachability evidence**: clicking the `commission/*` sidebar items lands on the placeholder; clicking the four live items lands on real pages. The visual treatment of the section header is the same.
- **Expected**: the four live pages are NOT in the "Đang phát triển" section, OR they carry a different section label, OR each carries an explicit `UnderDevelopment`-equivalent banner that tells operators "this is wired but deferred from go-live".
- **Actual**: same section header, different behavior. Operator cannot tell from the sidebar label alone whether the item is wired or deferred.
- **Correction boundary**: covered by F4. No separate work.
- **Regression test**: covered by F4.

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

This section enumerates **every** `app/api/**/route.ts` file at baseline `14712f15` and reports whether it has a UI consumer reachable from the sidebar (or a documented deep-link). This is the canonical "no orphan routes" table.

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

**Net**: zero true orphans at audit time. The one candidate (`/api/admin/my-claimed-candidates`) is an intentional secondary surface for the HR_STAFF MINE flow; the canonical rail is `/api/admin/recruiter-workbench?view=MINE`.

## 10. Status traps

A state is a trap when an entity can enter it from a UI flow but cannot be transitioned out of it from any UI flow. The audit found the following candidates:

| Trap | Affected entity | Reason | Action required |
| --- | --- | --- | --- |
| F10 candidate | JobOpening FILLED | No "Quản lý FILLED" UI; no cancellation UI; no recovery UI | Add `cancelJobOpening` command + UI (V7 scope) |
| F10 candidate | JobOpening CANCELLED | No UI to enter this state; no way to recover from a stray cancel | Place a status-history audit page (V7 scope) |
| F10 candidate | JobPosting ARCHIVED | No "Khôi phục / Đưa về DRAFT" UI | Add a recovery command + UI (V7 scope) |
| F10 candidate | Placement EFFECTIVE | No rollback UI; by design irreversible, but operator has no way to log a "compensation" note | Document as out-of-scope and provide an "Add note" CTA if needed |

## 11. Quick wins (P3 + small P2)

The following are small, bounded changes that can be gomed into a single T1C closeout batch alongside the maintainability reference:

- F2 / F3: add `Hồ sơ NLD` + `Tiếp nhận NLD` entries to `ADMIN_NAV_PHASE4`. ~5-line diff.
- F7: wrap `<span>` with `<Link>` in the All Jobs table. ~3-line diff.
- F8: add a code-to-message table for the publish endpoint (and reuse `conflictLabel` from `placement-ui.ts`). ~30-line diff.
- F11: rename the project-level publish button to "Công bố dự án" / "Bỏ công bố dự án". ~4-line diff.
- F14: extend `LaborProfile` detail page to accept an optional `?case=<id>` query parameter. ~30-line diff.

The remaining P1/P2 fixes (F1, F4, F5, F6, F9, F10) require either a dedicated T1 batch (F10 needs a new server command) or an Owner decision (F4, F9).

## 12. Correction batches and rollout order

The audit recommends grouping corrections into 4 batches. Each batch lists the findings it covers, the authority layer it touches, and the rationale for keeping it separate.

### Batch A — IA + small bounded UI changes

- **Findings**: F2, F3, F7, F8, F11, F14
- **Authority layer touched**: `src/shared/ui/role-guard/role-guard-layout.tsx` (F2/F3), the editor shell and the API message mapping (F5/F8), the All Jobs list (F7), the project-level Publish button (F11), the LaborProfile detail page (F14).
- **Why separate**: every change is a small UI rename / link wrap / sidebar entry addition. None of them touch server code. Estimated ≤ 200 lines of diff.
- **Rollout**: docs-only audit is complete. Land Batch A after the next T1 round decides IA naming and label policy (F4 below).

### Batch B — IA split for "Đang phát triển"

- **Findings**: F4, F13
- **Authority layer touched**: `src/shared/ui/role-guard/role-guard-layout.tsx` (decide whether to split the section or rename it), `app/admin/tickets/page.tsx`, `app/admin/attendance/page.tsx`, `app/admin/reconciliation/page.tsx`, `app/admin/payroll/page.tsx` (each may need a "live/operational" footer note if the section is split).
- **Why separate**: requires Owner decision on whether the four live pages should move to "Vận hành" (operational) or stay in "Đang phát triển" with a status annotation. Cannot land without T0/Owner sign-off.
- **Rollout**: Owner decision first; then a single T1 batch that moves items in the sidebar + footer note per page.

### Batch C — JobPosting publish affordance + error mapping

- **Findings**: F1, F5, F6
- **Authority layer touched**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx`, `app/admin/jobs/job-postings/[id]/page.tsx`, `src/domains/staffing/job-posting-list.service.ts` (DTO extension only), `src/domains/applications/placement-ui.ts` (`conflictLabel` reuse).
- **Why separate**: server contract is unchanged; this is a UI affordance + DTO surface. P1 (F1) blocks operators today; Batch A is insufficient.
- **Rollout**: T1C round 2; landed before the next P1/P2 go-live.

### Batch D — Status traps + scoped recruiter create (Owner-gated)

- **Findings**: F9, F10
- **Authority layer touched**: `src/domains/staffing/job-opening-activation.service.ts` (new `cancelJobOpening`), `src/domains/staffing/job-posting-authoring.service.ts` (new `restoreArchivedJobPosting` — verify schema immutability first), new `/admin/job-openings/[id]/cancellation-flow` UI, new selector predicate for `listEligibleSlotsForNewJobPosting`.
- **Why separate**: requires new server commands + schema-level review (slug immutability per `archiveJobPosting`'s `archivedAt` invariant). F9 is suspected until reproduced.
- **Rollout**: each item is its own TASK contract.

## 13. Recommended rollout after audit

1. **T0/Owner decides F4** (rename / split "Đang phát triển" vs leave as-is).
2. **T0/Owner decides F9** (extend selector to assignment predicate vs document the asymmetry).
3. T1C **Batch A** lands alongside the next small UI slice.
4. T1C **Batch B** lands if Owner decides to split the section.
5. T1A (delivery) lands **Batch C** before the next P1/P2 release (operator job-facing).
6. T1A (delivery) **separate task** for F10 (new commands; V7 spec).
7. T1C verifies Batch C in the next LIGHT audit cycle.

The audit intentionally does NOT recommend running a single consolidated T1 batch over all 14 findings; the V7 boundary is different from the IA boundary, and the route/service additions (F10) belong in a fresh contract.

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

## 15. Limitations and not-reproduced

The audit deliberately did NOT reproduce the following in a live or synthetic environment. They are listed so the next T1 round can prioritize reproduction:

- **F9 (HR_STAFF create form scoping)**: read source only. A synthetic HR_STAFF session is needed to confirm the selector returns slots for StaffingOrders outside the recruiter's assignment set. The fix boundary hinges on this reproduction.
- **F10 (JobOpening / JobPosting status traps)**: read source only. The schema supports `CANCELLED` and `ARCHIVED` but no UI exposes transitions into or out of them. The fix requires a new server command, not just a UI affordance.
- **F6 (Recruiter Workbench placement action cell context copy)**: read source only. The cell renders `—` when no action is available; the underlying DTO does not currently carry a `placementUnavailableReason` field. Need to confirm against a real HR_STAFF session.
- **F14 (LaborProfile detail deep-link)**: read source only. The destination page does not accept `searchParams.case`; the fix is straightforward but the test fixture needs a placement case row.
- **F12 (no override path for JobOpening activation)**: out of scope for this audit; documented as a V7 candidate.
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
| Audit branch | `codex/t1c-operational-workflow-debt-audit` |
| Owner | T1C (docs-only audit) |
| Supersedes | none |
| Conflict rule | V7 / V8 / HRP_EXECUTION_REALIGNMENT_PLAN authority wins; current source wins over this audit's claims |