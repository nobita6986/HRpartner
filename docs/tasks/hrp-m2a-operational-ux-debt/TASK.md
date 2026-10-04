# TASK — `hrp-m2a-operational-ux-debt`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-m2a-operational-ux-debt` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Bounded UI/navigation/terminology fix on admin portal only; no auth/RLS/schema/migration/server-contract change. Per `tier1.md` STANDARD lane may use `NONE` when no public-contract or shared-foundation expansion is detected (all touched files are presentation + a single small `src/domains/staffing/job-posting-error-map.ts` adapter that the editor shell will consume in a later T1B round; no server contract change). T1 self-reviews the 3 risks in §7 below. |
| Status | `READY_TO_CODE` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` (Vitest unit lane — green on baseline `6ea2e267`; no DB required for this scope; no integration test added) |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` (origin/main HEAD at task start; merge commit of PR #89 — T1A F9-B R2 production closeout) |
| Correction budget | `1` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| In-scope roots | `src/shared/ui/role-guard/role-guard-layout.tsx`; `src/domains/staffing/job-posting-list.service.ts`; `src/domains/staffing/job-posting-error-map.ts` (NEW); `src/domains/staffing/job-posting-error-map.test.ts` (NEW, colocated); `app/admin/jobs/job-postings/page.tsx`; `app/admin/jobs/page.tsx`; `src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` (NEW); `app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` (NEW); `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (NEW); `docs/tasks/hrp-m2a-operational-ux-debt/{TASK.md,HANDOFF.md}` |
| Forbidden paths | `prisma/**`; `migrations/**`; `src/domains/staffing/job-posting-authoring.service.ts`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (T1B-owned); `app/api/admin/jobs/job-postings/**`; `app/(jobs)/**`; `app/api/public/jobs/**`; `app/api/projects/**`; `src/shared/ui/role-guard/role-guard-layout.test.tsx` (none exists; no test for `ADMIN_NAV_PHASE4` is in scope here; the new `__tests__/admin-nav-phase4-people-section.static.test.ts` covers the F2 contract); `docs/PLANNER_HANDOVER.md`; `package.json`; `package-lock.json`; root `/public/**`; root layout files (`app/layout.tsx`, `app/(portal)/layout.tsx`); public homepage settings |
| Required gates | `npm run typecheck`; `npx eslint <changed>`; `npx vitest run <changed static test>`; `npm run test:unit`; `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` (Node variant — matches `DEC-06` from `hrp-p1-a0-2-jobposting-ux-truth/TASK.md`; the `.ps1` variant is absent in this worktree); `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267b72120de5f67d5954d1074101efccff1 HEAD` (range-aware scanner for the committed range); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` |
| Correction batches used | `0` |
| Next gate | `T0_PR_CI_MERGE` (T0 reviews, re-runs CI on corrected HEAD, then merges — T1 must not merge) |

## 1. Outcome

### 1.1 User-visible outcome

- **F2 / F3 — LaborProfile navigation & intake discoverability**: Admin sidebar section `Nhân sự` now carries two new entries: `Hồ sơ NLD` (`/admin/labor-profiles`) and `Tiếp nhận NLD` (`/admin/labor-profiles/new`). Both are reachable from the sidebar for roles `ADMIN`, `HR_MANAGER`, `HR_STAFF` (the same role set already accepted by `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES`). No new permission, no PII surface change, no role matrix widening.
- **F7 — All Jobs list linkage**: On `/admin/jobs/job-postings`, the `Staffing Order` column now renders the staffing-order code and the `JobOpening: <status>` suffix as a `<Link>` to `/admin/job-openings/{jobOpeningId}` whenever a canonical `JobOpening` ID is available. When the JobOpening is missing (orphan row) the existing `IFNOT_FOUND` sentinel remains as plain text — no fabricated link. The `jobOpeningId` is already present in the row DTO at `src/domains/staffing/job-posting-list.service.ts:154` and never needs a server-side change.
- **F8 — Safe Vietnamese error mapping (shared mapper, no editor-shell edit)**: A new repo-owned module `src/domains/staffing/job-posting-error-map.ts` exports:
  - `JOB_POSTING_ERROR_LABELS: Readonly<Record<string, string>>` — maps every `AuthoringError` code that can surface on `/admin/jobs/job-postings/**` (`JOB_OPENING_NOT_OPEN`, `INVALID_STATE_TRANSITION`, `INVALID_REVISION`, `IDEMPOTENCY_CONFLICT`, `NOT_FOUND`, `INVALID_INPUT`, `SLUG_COLLISION`) plus the route-level codes `IDEMPOTENCY_REQUIRED`, `INTERNAL`, `FORBIDDEN`, `UNAUTHORIZED` to a localized, recovery-oriented message.
  - `jobPostingErrorLabel(code, fallback?)` — pure function. Returns the label for known codes; returns a generic safe Vietnamese message for unknown / null / empty codes. **Never** echoes raw developer text, UUID, SQL, or stack trace.
  - `JOB_POSTING_RECOVERY_HINTS: Readonly<Record<string, string>>` — maps `JOB_OPENING_NOT_OPEN` to `/admin/job-openings/<id>` navigation hint (recovery surface that already exists via `app/admin/job-openings/[id]/page.tsx`). Other codes have no hint (the operator must read the message and retry).
  - A second helper `summarizeJobPostingApiError({ status, error, message }): { label: string; recoveryHref: string | null }` — composes label + recovery href from a route JSON envelope without ever leaking the raw `message` to the caller when the status is `>= 400` and `error` is missing/UNKNOWN (returns generic safe text).
  - The mapper is deliberately NOT wired into `app/admin/jobs/job-postings/[id]/editor-shell.tsx` in this round — the editor shell is T1B-owned per audit decision §J.0 / §G.A.1. The HANDOFF ships the integration contract that the T1B editor-shell wiring must follow (verbatim `summarizeJobPostingApiError` import path + a unit test that the editor-shell `readErrorMessage` is the only allowed call site for the new mapper on its surface).
- **F11 — Terminology disambiguation**: Project-level publish button on `/admin/jobs` is renamed from `Publish` / `Unpublish` (English) to `Công bố dự án` / `Bỏ công bố dự án` (Vietnamese). The JobPosting editor keeps `Publish` / `Unpublish` / `Archive` English labels — the canonical English domain terms for that surface. A small footnote under the Jobs-page header explains: "Công bố dự án" bật/tắt hiển thị `Project` trên landing; `Publish` trong JobPosting editor chuyển trạng thái JobPosting sang `PUBLISHED` (canonical theo P1-A0). Glossary wording is purely additive copy; no domain transition, no API change, no role matrix change.

### 1.2 Non-goals

- No schema/migration/backfill change. No Prisma field added. No DB connection in any of the unit tests.
- No auth/RLS/role-matrix widening. `ADMIN_NAV_PHASE4` adds exactly two `NavItem` entries under `section: 'people'` with `roles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF']` — same set as `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES`.
- No JobPosting domain transition change. `src/domains/staffing/job-posting-authoring.service.ts` is untouched. `src/domains/staffing/job-posting-list.service.ts` is touched only to add the `jobOpeningId` to the `JobPostingListItemDto` if not already there (it IS already there — see `src/domains/staffing/job-posting-list.service.ts:71` and `:158`). The DTO is unchanged.
- No JobPosting editor-shell edit. `app/admin/jobs/job-postings/[id]/editor-shell.tsx` is T1B-owned per audit decision §G.A.1; the HANDOFF ships the integration contract for T1B to consume.
- No F9 reproduction (Priority 1, separate round per execution decision §D). No F6 (Priority 3, separate round per execution decision §D).
- No new `package.json` dependency. No `pnpm-lock.yaml` change. No `pnpm-workspace.yaml` change.
- No `docs/PLANNER_HANDOVER.md` change.
- No new `docs/important/**` audit/decision document. This batch operates entirely inside the authority already recorded in `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` §D (Priority 2) — the audit documents are upstream and not re-opened here.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` §D (Priority 2) authorizes F2/F3/F7/F8/F11 in a bounded UI batch; `STANDARD` lane; audit default `NONE`. | This task is the binding execution of Priority 2. |
| `EV-02` | Audit doc §8.2 F2, §8.3 F3, §8.7 F7, §8.8 F8, §8.11 F11 — five P2/P3 findings the current batch closes, with file:line evidence the changes resolve each finding. | Source-of-truth ledger for the affected findings. |
| `EV-03` | Audit doc §19.1 confirms F1/F5 RESOLVED by PR #86; §19.2 confirms F8 surface is still open against `f6100c39`; §19.3 confirms F2/F7/F11 still open. | Pre-PR-#89 (now `6ea2e267`) re-baseline shows the five findings in this batch are still open and belong to the next bounded UI batch. |
| `EV-04` | `src/shared/ui/role-guard/role-guard-layout.tsx:121-167` — `ADMIN_NAV_PHASE4` current shape; `section: 'people'` already groups `{ href: '/admin/workers', label: 'Nhân sự', … }`. The two new entries (`/admin/labor-profiles`, `/admin/labor-profiles/new`) join this section. | Sidebar source location for F2. |
| `EV-05` | `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])` and `:56-59` `+ Tiếp nhận NLD` button points to `/admin/labor-profiles/new`. | Page-side role gate and intake CTA. Sidebar entry must mirror the role gate. |
| `EV-06` | `src/domains/staffing/job-posting-list.service.ts:154` — list DTO already carries `jobOpeningId`; `:71` (type) and `:158` (mapper) confirm. | F7 does NOT need a service change; pure UI swap. |
| `EV-07` | `app/admin/jobs/job-postings/page.tsx:307-318` — current render: `<span className="font-mono">{item.openingStaffingOrderCode}</span>` + inline `(JobOpening: {item.openingStatus})` text, NO link wrapper. | UI source location for F7. |
| `EV-08` | `src/domains/staffing/job-posting-authoring.service.ts:778-873` — `publishJobPosting` throws `AuthoringError('JOB_OPENING_NOT_OPEN', 409, …, { jobOpeningId, jobOpeningStatus })`, `'INVALID_STATE_TRANSITION'`, `'INVALID_REVISION'`, `'SLUG_COLLISION'`. `app/api/admin/jobs/job-postings/[id]/publish/route.ts:98-105` echoes `error.code` + `error.message` + `error.details`. | Stable code surface that the new mapper must cover. |
| `EV-09` | `src/domains/applications/placement-ui.ts:78-103` — existing precedent: `CONFLICT_LABELS` table + `conflictLabel(code)` mapper for placement-UI. The new mapper mirrors this pattern (table + pure function + unknown-code fallback). | Library-first: re-uses an established pattern; no need to ADOPT an external library. |
| `EV-10` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx:83-90` — current `readErrorMessage` echoes `body.message ?? body.error ?? HTTP ${res.status}`. Per audit §G.A.1 and TASK scope, the editor shell is NOT touched in this batch; T1B owns its wiring. | Integration contract for T1B is anchored on `summarizeJobPostingApiError`. |
| `EV-11` | `app/admin/jobs/page.tsx:198-211` — existing `publishErrorText(job, code, message?)` maps `INVALID_STATE`, `STALE_VERSION`, `NOT_FOUND`, `FORBIDDEN`; button label is `Publish` / `Unpublish` at `:341`. | F11 boundary — only the button label + the header glossary note changes. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Add two `NavItem` entries to `ADMIN_NAV_PHASE4` under `section: 'people'`: `/admin/labor-profiles` (label `Hồ sơ NLD`, icon `UserRoundCheck`) and `/admin/labor-profiles/new` (label `Tiếp nhận NLD`, icon `UserRoundCheck`). Role list byte-exact mirror of `app/admin/labor-profiles/page.tsx:16`. | `CHOSEN` |
| `DEC-02` | Place the two new entries AFTER the existing `Nhân sự` (workers) entry — workforce roster first, then candidate-side profiles. Avoids re-ordering existing items. | `CHOSEN` |
| `DEC-03` | Wrap the `<span className="font-mono">{item.openingStaffingOrderCode}</span>` and the inline `(JobOpening: {item.openingStatus})` in `app/admin/jobs/job-postings/page.tsx:307-318` as a single `<Link href={`/admin/job-openings/${item.jobOpeningId}`}>` block. The orphan (`openingStaffingOrderCode === null`) branch keeps the existing `IFNOT_FOUND` plain text. | `CHOSEN` |
| `DEC-04` | Add the new error mapper module at `src/domains/staffing/job-posting-error-map.ts` (repo-owned; not in `app/`). Mirror `placement-ui.ts:78-103` `CONFLICT_LABELS` pattern (readonly table + pure function + unknown-code fallback). | `CHOSEN` |
| `DEC-05` | Unknown / null / empty / unrecognized code → return a generic safe Vietnamese message: `"Không thể cập nhật JobPosting — vui lòng thử lại hoặc liên hệ quản trị viên."`. Never echo `body.message`, UUID, SQL, stack, or PII. | `CHOSEN` |
| `DEC-06` | `JOB_POSTING_RECOVERY_HINTS` only carries `JOB_OPENING_NOT_OPEN → '/admin/job-openings/${jobOpeningId}'`. Other codes have no hint; the label alone is the recovery guidance. | `CHOSEN` |
| `DEC-07` | The editor shell is NOT edited in this round. HANDOFF ships the T1B integration contract: the only allowed call site on the editor shell is `readErrorMessage` being REPLACED by a thin call into `summarizeJobPostingApiError(res.json())`. Any other wiring must be a separate T1B change. | `CHOSEN` |
| `DEC-08` | Rename the `/admin/jobs` project-level button to `Công bố dự án` / `Bỏ công bố dự án`. Add a one-sentence header glossary note: "Công bố dự án bật/tắt hiển thị Project trên landing; Publish trong JobPosting editor chuyển trạng thái JobPosting sang PUBLISHED." | `CHOSEN` |
| `DEC-09` | Role matrix in `app/admin/jobs/job-postings/page.tsx` (`VIEWER_ROLES` / `CREATE_ROLES`) is preserved byte-exact. No new permission. | `CHOSEN` |
| `DEC-10` | Verify-encoding: use the Node `verify-encoding.mjs` (matches `DEV-04` from `hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md` + `DEC-06` from `hrp-p1-a0-2-jobposting-ux-truth/TASK.md`). Range-aware `verify-encoding-range.mjs` is ALSO run on the committed range to assert no CRLF / no U+FFFD / no mojibake streaks (the Node variant catches BOM + UTF-8 validity but does NOT catch CRLF; the range scanner closes that gap). | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `ADMIN_NAV_PHASE4` (in `src/shared/ui/role-guard/role-guard-layout.tsx`) carries two new `NavItem` entries under `section: 'people'`: one for `/admin/labor-profiles` (label `Hồ sơ NLD`) and one for `/admin/labor-profiles/new` (label `Tiếp nhận NLD`). Both use `icon: UserRoundCheck` and `roles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF']` (mirror of `app/admin/labor-profiles/page.tsx:16`). |
| `RQ-02` | `app/admin/jobs/job-postings/page.tsx:307-318` renders the staffing-order code and the `JobOpening: <status>` suffix as a single `<Link>` to `/admin/job-openings/{item.jobOpeningId}` when `item.openingStaffingOrderCode !== null` AND `item.jobOpeningId !== null`. The orphan branch (any of these null) renders plain text without a fabricated link. |
| `RQ-03` | `src/domains/staffing/job-posting-error-map.ts` (NEW) exports: `JOB_POSTING_ERROR_LABELS`, `jobPostingErrorLabel(code, fallback?)`, `JOB_POSTING_RECOVERY_HINTS`, `summarizeJobPostingApiError(envelope)`. The mapper is pure (no I/O, no DOM). Unknown / unrecognized / null / empty code returns a single generic safe Vietnamese fallback string. |
| `RQ-04` | `JOB_POSTING_ERROR_LABELS` covers at minimum: `JOB_OPENING_NOT_OPEN`, `INVALID_STATE_TRANSITION`, `INVALID_REVISION`, `IDEMPOTENCY_CONFLICT`, `NOT_FOUND`, `INVALID_INPUT`, `SLUG_COLLISION`, plus the route-level `IDEMPOTENCY_REQUIRED`, `INTERNAL`, `FORBIDDEN`, `UNAUTHORIZED`. The `JOB_OPENING_NOT_OPEN` label is recovery-oriented and includes the literal phrase `Mở JobOpening này`. |
| `RQ-05` | The mapper NEVER returns the raw `body.message` string when the code is unrecognized. Each evidence list in HANDOFF §3 quotes only the mapper's literal return value for the unknown-code case. |
| `RQ-06` | `app/admin/jobs/page.tsx` button text changes from `Publish` / `Unpublish` to `Công bố dự án` / `Bỏ công bố dự án`. A small `<p data-testid="jobs-terminology-note">` element under the page header carries the two-glossary sentence from `DEC-08`. No other text on `/admin/jobs` is renamed. |
| `RQ-07` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` is NOT touched. The HANDOFF ships the verbatim T1B integration contract as `§6` of HANDOFF. |
| `RQ-08` | New static guard test `app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` asserts: (a) the F7 markup contains `<a href="/admin/job-openings/<uuid>"` for canonical rows, (b) the orphan row renders the `IFNOT_FOUND` plain-text sentinel, (c) no fabricated link when `jobOpeningId` is missing. |
| `RQ-09` | New static guard test `src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` asserts: (a) the two new entries exist under `section: 'people'` with exact href / label / roles / icon, (b) `HR_STAFF` is in the roles array of both entries (mirror of `ALLOWED_ROLES` at `app/admin/labor-profiles/page.tsx:16`), (c) no forbidden role drift. |
| `RQ-10` | New static guard test `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` asserts: (a) the button label `Công bố dự án` and `Bỏ công bố dự án` are present in `app/admin/jobs/page.tsx`, (b) the legacy English `Publish` button text is REMOVED from `app/admin/jobs/page.tsx`, (c) the JobPosting editor shell still uses `Publish` (canonical English term per F11). |
| `RQ-11` | New unit test `src/domains/staffing/__tests__/job-posting-error-map.test.ts` covers every documented code in `JOB_POSTING_ERROR_LABELS`, the unknown / null / empty code path returns the generic safe fallback, and `summarizeJobPostingApiError({ status: 409, error: 'JOB_OPENING_NOT_OPEN' })` returns `{ label: <known label>, recoveryHref: '/admin/job-openings/<id>' }` with `envelope.details.jobOpeningId`. |
| `RQ-12` | No forbidden path appears in `git diff --stat origin/main..HEAD` after the implementation commit (gate `E-12` of the HANDOFF). |
| `RQ-13` | `npm run typecheck`, `npx eslint <changed files>`, `npm run test:unit`, `npm run build`, `git diff --check` all PASS. |
| `RQ-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` PASS on the working-tree changed surface; `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267b72120de5f67d5954d1074101efccff1 HEAD` PASS on the committed range (no CRLF, no U+FFFD, no mojibake streaks). |

### 4.2 Scope boundaries

- **In:** 9 paths in §0 (`role-guard-layout.tsx`, `job-posting-list.service.ts` [DTO line comment + unit-test note only — no DTO change because `jobOpeningId` is already present], `app/admin/jobs/job-postings/page.tsx`, `app/admin/jobs/page.tsx`, `src/domains/staffing/job-posting-error-map.ts` NEW, `src/domains/staffing/__tests__/job-posting-error-map.test.ts` NEW, `src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` NEW, `app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` NEW, `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` NEW) + the 2 docs files.
- **Out:** schema/migration/backfill; `src/domains/staffing/job-posting-authoring.service.ts`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx`; `app/api/admin/jobs/job-postings/**`; `app/(jobs)/**`; `app/api/public/jobs/**`; `app/api/projects/**`; `docs/PLANNER_HANDOVER.md`; `package.json` / `package-lock.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`; root layout files (`app/layout.tsx`, `app/(portal)/layout.tsx`); public homepage settings.

### 4.3 Domain boundaries

- **Data/state:** ZERO DB writes; ZERO Prisma imports new in scope; no model field added/changed.
- **Permission/security:** Role matrices preserved byte-exact; no new grants. Sidebar role list mirrors existing page gate exactly (no widening).
- **Interface/API:** No route file change. No DTO change. No service contract change. Mapper is presentation-only (one new file with pure functions).
- **Migration/rollback:** N/A. Rollback = revert branch commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/staffing/job-posting-error-map.ts` (NEW) | Pure mapper: `JOB_POSTING_ERROR_LABELS`, `JOB_POSTING_RECOVERY_HINTS`, `jobPostingErrorLabel`, `summarizeJobPostingApiError`; mirrors `placement-ui.ts:78-103` pattern | vitest run `job-posting-error-map.test.ts` PASS | Static analyzer flags an unsafe code path (echoes `body.message`, leaks UUID, etc.) → stop, report T0 |
| `STEP-02` | `src/domains/staffing/job-posting-error-map.test.ts` (NEW) | Pure unit tests for every documented code; unknown / null / empty code; `summarizeJobPostingApiError` with `details.jobOpeningId`; assert no raw `body.message` ever returns | vitest run PASS | Test fails unexpectedly → stop, report T0 |
| `STEP-03` | `src/shared/ui/role-guard/role-guard-layout.tsx` — add two `NavItem` to `ADMIN_NAV_PHASE4` under `section: 'people'` | F2/F3 navigation surface | vitest run `admin-nav-phase4-people-section.static.test.ts` PASS | Sidebar role list diverges from `app/admin/labor-profiles/page.tsx:16` → stop |
| `STEP-04` | `src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` (NEW) | Static guard: F2/F3 entries + role mirror + no forbidden role drift | vitest run PASS | Test fails → stop |
| `STEP-05` | `app/admin/jobs/job-postings/page.tsx:307-318` — wrap staffing-order + JobOpening text in `<Link>` to `/admin/job-openings/${item.jobOpeningId}`; preserve orphan plain-text branch | F7 linkage | vitest run `job-postings-list-linkage.static.test.ts` PASS | DTO field not present / fabricated link on orphan → stop |
| `STEP-06` | `app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` (NEW) | Static guard: F7 markup contains `<a href="/admin/job-openings/<uuid>"` for canonical rows + orphan branch unchanged | vitest run PASS | Test fails → stop |
| `STEP-07` | `app/admin/jobs/page.tsx` — rename button text + add header glossary `<p data-testid="jobs-terminology-note">` | F11 terminology | vitest run `admin-jobs-terminology.static.test.ts` PASS | Button text regresses to English / glossary missing → stop |
| `STEP-08` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (NEW) | Static guard: F11 button labels + glossary present + editor shell keeps `Publish` | vitest run PASS | Test fails → stop |
| `STEP-09` | `src/domains/staffing/job-posting-list.service.ts` — no edit (deferred to HANDOFF §3 `EV-09`); line numbers in this file are pinned by `src/shared/security/required-relation-sweep.static.test.ts:124-127` (`EXPECTED_HITS`), so any top-of-file comment would shift 4 entries | Preserve baseline `EXPECTED_HITS` line-number pin (avoid scope creep into out-of-scope test file) | `git diff --stat origin/main..HEAD -- src/domains/staffing/job-posting-list.service.ts` reports 0 lines | Drift detected → stop |
| `STEP-10` | `docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` + `HANDOFF.md` | Track execution per V2_FAST_FREEZE | `verify-task.ps1` PASS; `verify-handoff.ps1` PASS | n/a |
| `STEP-11` | Run all gates from §0 Required gates | Canonical gates per `tier1.md` | All PASS | Any FAIL → diagnose, fix within-budget, re-run |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `ADMIN_NAV_PHASE4` carries the two new `NavItem` entries under `section: 'people'` with exact href / label / roles / icon from `DEC-01` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` (3 cases) |
| `AC-02` | `app/admin/jobs/job-postings/page.tsx:307-318` renders `<a href="/admin/job-openings/<uuid>">` for canonical rows; orphan branch renders plain-text sentinel without fabricated link | `npx vitest run --config vitest.unit.config.ts app/admin/jobs/job-postings/__tests__/job-postings-list-linkage.static.test.ts` (3 cases) |
| `AC-03` | `app/admin/jobs/page.tsx` button labels read `Công bố dự án` / `Bỏ công bố dự án`; legacy English `Publish` button label absent; `<p data-testid="jobs-terminology-note">` present | `npx vitest run --config vitest.unit.config.ts app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (3 cases) |
| `AC-04` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` keeps the canonical English `Publish` label (not renamed); manual review via `cat` of editor shell confirms the `Publish` string is present and unchanged | `cat app/admin/jobs/job-postings/[id]/editor-shell.tsx` confirms `>Publish<` literal unchanged; same `admin-jobs-terminology.static.test.ts` AC-03 case 3 (manual run) |
| `AC-05` | `src/domains/staffing/job-posting-error-map.ts` exists; exports `JOB_POSTING_ERROR_LABELS` (≥ 11 codes), `JOB_POSTING_RECOVERY_HINTS` (≥ 1 entry — `JOB_OPENING_NOT_OPEN`), `jobPostingErrorLabel`, `summarizeJobPostingApiError` | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-error-map.test.ts` (≥ 14 cases) |
| `AC-06` | `jobPostingErrorLabel` for unknown / null / empty / unrecognized code returns the single generic safe Vietnamese message — never raw `body.message`, UUID, SQL, stack, or PII | Same `job-posting-error-map.test.ts` (≥ 5 cases) |
| `AC-07` | `summarizeJobPostingApiError({ status: 409, error: 'JOB_OPENING_NOT_OPEN', details: { jobOpeningId } })` returns `{ label: <known label>, recoveryHref: '/admin/job-openings/<jobOpeningId>' }`; manual review via `node -e` confirms the literal label string and the recovery href | `node -e "const m = require('./src/domains/staffing/job-posting-error-map.ts')" || same `job-posting-error-map.test.ts` case (2 cases) |
| `AC-08` | `npm run typecheck` exit 0 | manual run |
| `AC-09` | `npx eslint <changed files>` exit 0 | manual run |
| `AC-10` | `npm run test:unit` PASS on baseline + 4 new test files | manual run |
| `AC-11` | `npm run build` exit 0 (next build) | manual run |
| `AC-12` | `git diff --check origin/main..HEAD` exit 0 (no whitespace errors) | manual run |
| `AC-13` | `git diff --stat origin/main..HEAD -- prisma migrations src/... app/api/... app/(jobs) editor-shell.tsx` 0 lines on every forbidden path | `git diff --stat origin/main..HEAD -- <forbidden paths>` review |
| `AC-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 on working-tree changed surface (no BOM, no invalid UTF-8) | manual run |
| `AC-15` | `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267b72120de5f67d5954d1074101efccff1 HEAD` exit 0 on committed range (no CRLF, no U+FFFD, no mojibake streaks) | manual run |
| `AC-16` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` exit 0 (PASS or DRAFT-VALID with documented warnings only) | manual run |
| `AC-17` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2a-operational-ux-debt/TASK.md` exit 0 | manual run |
| `AC-18` | Diff scope: only 9 in-scope paths + 2 docs files; forbidden paths all 0-line | `git status --porcelain` review after freeze + manual `git diff --stat origin/main..HEAD -- .` enumeration |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-01` |
| `RQ-02` | `STEP-03` | `AC-01` |
| `RQ-03` | `STEP-01` | `AC-05` |
| `RQ-04` | `STEP-01` | `AC-05` |
| `RQ-05` | `STEP-01` | `AC-06` |
| `RQ-06` | `STEP-05` | `AC-02` |
| `RQ-07` | `STEP-08` | `AC-04` |
| `RQ-08` | `STEP-06` | `AC-02` |
| `RQ-09` | `STEP-04` | `AC-01` |
| `RQ-10` | `STEP-08` | `AC-03` |
| `RQ-11` | `STEP-02` | `AC-05, AC-06, AC-07` |
| `RQ-12` | `STEP-11` | `AC-13, AC-18` |
| `RQ-13` | `STEP-11` | `AC-08, AC-09, AC-10, AC-11, AC-12, AC-16, AC-17` |
| `RQ-14` | `STEP-11` | `AC-14, AC-15` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A future PR removes one of the new sidebar entries and LaborProfile becomes deep-link-only again | Static guard test in `src/shared/ui/role-guard/__tests__/admin-nav-phase4-people-section.static.test.ts` enforces exact href / label / roles / icon; rollback = revert commit |
| `RISK-02` | The mapper is wired into `editor-shell.tsx` prematurely (out of scope) and bypasses the T1B integration contract | `AC-04` re-confirms editor shell keeps canonical `Publish` label and the `readErrorMessage` source is not replaced in this round; the mapper module is exported but the only allowed T1B call site is `readErrorMessage` → `summarizeJobPostingApiError` (HANDOFF §6); rollback = revert commit + remove export |
| `RISK-03` | An unknown code path returns `body.message` from the route envelope and the operator sees raw developer text | `AC-06` asserts unknown code returns the single generic safe fallback; never returns `body.message`; rollback = revert commit |
| `RISK-04` | The new sidebar entry duplicates an existing role guard on `/admin/labor-profiles` and accidentally widens the role set | `DEC-01` byte-mirrors `app/admin/labor-profiles/page.tsx:16` `ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])`; static test enforces exact match; rollback = revert commit |
| `RISK-05` | The Jobs-page terminology rename confuses operators who learned the surface before this round | Header glossary note explains the two distinct surfaces; static test enforces the glossary presence; rollback = revert commit |
| `RISK-06` | The new test file paths `__tests__/…` collide with existing paths or escape the lint include path | All new tests follow the convention `app/.../__tests__/<name>.static.test.ts` and `src/.../__tests__/<name>.test.ts`; vitest unit config glob `app/**/*.test.tsx` + `src/**/*.test.ts` covers them; rollback = rename + revert |
| `RISK-07` | CRLF line endings sneak in via PowerShell 5.1 `Set-Content` or similar | `verify-encoding-range.mjs` (range-aware, includes CRLF detection) is mandatory gate in §0; rollback = re-save the file via Node `fs.writeFileSync(..., 'utf8')` |

## 8. Open Questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| n/a | All decisions are closed in §3. `Build vs adopt: N/A` and `Build vs automate: N/A` are explicit. | n/a | NONE |

## 9. Planner Resolution

| ID | Source | Decision | Status |
|---|---|---|---|
| `PR-01` | T0 directive (user task) | Scope = F2/F3/F7/F8/F11 only; F9 / F6 out of scope; F8 boundary = shared mapper + tests + integration contract for T1B; editor shell NOT touched. | `ACCEPTED` — `DEC-01..DEC-10` implement exactly this scope. |
| `PR-02` | Audit decision §D Priority 2 | Bounded UI batch with `STANDARD` lane, audit default `NONE`, correction budget 1. | `ACCEPTED` — §0 Control / §4 Contract / §6 AC mirror this. |
| `PR-03` | Audit §G.A.1 (editor-shell ownership) | Editor shell is T1B-owned; HANDOFF ships the T1B integration contract verbatim. | `ACCEPTED` — `DEC-07` + HANDOFF §6. |
| `PR-04` | Audit §19.1/19.2 | F1/F5 already RESOLVED by PR #86; F8 surface remains open. | `ACCEPTED` — task is bounded to F2/F3/F7/F8/F11 only; F1/F5 not re-opened. |

## 10. Revision Log

| Rev | SHA | Date | Note |
|---|---|---|---|
| `v1.0` | `262c5c9a3365f119609fa0491bf2c8e21df57166` | 2026-10-04 | Initial TASK. Lane `STANDARD`, Audit `NONE`, baseline `6ea2e267`. Implementation SHA pinned at commit. |