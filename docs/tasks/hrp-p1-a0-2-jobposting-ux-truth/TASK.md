# TASK — `hrp-p1-a0-2-jobposting-ux-truth`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a0-2-jobposting-ux-truth` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | Narrow UI truth/hygiene only — no auth, RLS, schema, migration, or contract change. Discovery did not reveal any authority/security expansion (role matrix preserved exactly). Per `tier1.md` FAST lane → `NONE` is default and a Tier 3 audit round would be unable to find anything beyond what the static guard already proves. |
| Status | `COMPLETE` |
| Planner | `Tier 1` (T1C, lệnh T0: "T0 → T1C — P1-A0.2 JobPosting Authoring UX Truth Cleanup") |
| Baseline | `4970f47d` (origin/main HEAD before this worktree branched) |
| In-scope roots | `app/admin/jobs/job-postings/page.tsx`; `app/admin/jobs/job-postings/[id]/page.tsx`; `app/admin/jobs/job-postings/create-job-posting-form.tsx`; `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts`; `docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/**` |
| Forbidden paths | `prisma/**`; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/staffing/job-posting-list.service.ts`; `app/(jobs)/**`; `app/api/public/jobs/**`; `app/api/admin/jobs/job-postings/**`; `docs/PLANNER_HANDOVER.md`; `package.json`; `package-lock.json`; sidebar / navigation / menu files |
| Required gates | `npm run typecheck`; `npx eslint <changed>`; `npx vitest run <static test file>`; `npm run test:unit`; `npm run build`; `git diff --check`; `pwsh .ai-pipeline/scripts/verify-encoding.mjs` (Node variant — see §3); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` |
| Correction budget | `1` |
| Next gate | T0 review + merge |
| Current execution round | `1` |

## 1. Outcome

### 1.1 User-visible outcome

- The "Phần bị khóa" section on `/admin/jobs/job-postings` and `/admin/jobs/job-postings/[id]` no longer carries the three stale claims that contradict accepted main behavior:
  - ~~"Tạo mới draft từ slot → form chọn StaffingOrderSlot chưa dựng"~~ — false since P1-A0.1 (`CreateJobPostingForm` is wired to the POST endpoint and selector is server-driven via canonical `listEligibleSlotsForNewJobPosting`).
  - ~~"Mở JobPosting ở trang public (`/viec-lam/[slug]`) → trang public hiện vẫn tra Project, chưa gắn với JobPosting. Sẽ được khôi phục khi P1-A1 hoàn tất"~~ — false since P1-A1 (canonical cutover to JobPosting PUBLISHED via `getPublicJobDetail`).
  - ~~"Anonymous apply RPC gắn JobPosting → chờ P1-A1 (CandidateSubmission.jobPostingId)"~~ — false since P1-B (SECURITY DEFINER RPC `hrp_public_apply_submission` bound to JobPosting PUBLISHED + OPEN + linked slot via canonical chain).
- The deferred-section wording is renamed from "Phần bị khóa (chờ bước sau)" to "Phần còn hạn chế (đang chờ tích hợp)" so users understand these are genuine integration deferrals, not blocking work waiting on a roadmap milestone.
- Only the genuinely-deferred capability remains visible: **Gallery/media** (waiting on AV4 Media Library) plus the schema-level slug-immutability constraint (P1-A0 acceptance criterion #11: published slug is canonical and immutable; pre-publish rename route has not been exposed).
- Empty-state and load-error text inside `CreateJobPostingForm` is improved to credit both the canonical selector (`eligibleSlotPredicateSql(now)`) and the write-path authority (`assertSlotEligibleForNewJobPosting`), so users understand why no slot appears and that the server is still the source of truth on POST.
- The role matrix in both pages is preserved exactly as P1-A0.1 / P1-A0 baseline — `VIEWER_ROLES = {ADMIN, HR_MANAGER, PM, SALE, DIRECTOR, HR_STAFF}` (list) and `MUTATION_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` / `VIEWER_ROLES = {PM, SALE, DIRECTOR}` (detail). No new permissions are granted.

### 1.2 Non-goals

- No schema/migration/backfill change. No DB connection. No RLS/policy change. No auth/permission matrix change. No `package.json` / lockfile change.
- No change to `JobPosting` domain transitions, publish authority, idempotency, draft-edit lifecycle, slug mutation semantics, or canonical eligible-slot predicate (`eligibleSlotPredicateSql(now)` is not touched in this task).
- No sidebar / navigation / menu change (NAV-01 follow-up is a separate task after E1).
- No `PLANNER_HANDOVER.md` touch.
- No n8n wiring.
- No introduce/delete of new shared components, libraries, or dependencies.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/admin/jobs/job-postings/page.tsx` "Phần bị khóa" section (pre-change) contained 4 bullets, 3 of which contradicted accepted main (form not built, public detail still Project, anonymous apply still waiting P1-A1). | The defect |
| `EV-02` | `app/admin/jobs/job-postings/[id]/page.tsx` "Phần bị khóa" section (pre-change) contained 4 bullets — 2 of which contradicted accepted main (public detail via Project, anonymous apply via Project/Slot cũ). | The defect |
| `EV-03` | `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/HANDOFF.md §5` (status ACCEPTED; merge squash PR #45 → `e3831ef8`; production migration verified; HTTP smoke 200 on `/viec-lam`, `/`, `/admin/jobs/job-postings`). | P1-A0.1 / P1-A0 capability is shipped |
| `EV-04` | `docs/tasks/hrp-p1-a1-canonical-public-job-detail/HANDOFF.md §5` (status ACCEPTED; CI pass; PR #49 squash `a9c5c395`; Vercel prod success; `/viec-lam` 200; unknown slug 404). | P1-A1 cutover is shipped |
| `EV-05` | `docs/tasks/hrp-p1-b-public-apply/HANDOFF.md §1` and §6 (status ACCEPTED; PR #51 squash `b59cd1d6`; canonical strict integration 31/31 files PASS, 541 tests PASS, 0 fail). | P1-B anonymous apply is shipped |
| `EV-06` | `src/domains/staffing/job-posting-list.service.ts:329-341` — `eligibleSlotPredicateSql(now)` is the single canonical SQL fragment used by both selector and write-path (per P1-A0.1 C-02). | Predicate is repo-owned; UI must consume, not duplicate |
| `EV-07` | `src/domains/staffing/job-posting-authoring.service.ts:write` (P1-A0) — server write-path calls `assertSlotEligibleForNewJobPosting` with the same predicate inside transaction. | Selector client is hint only |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Rewrite — don't delete — the deferred section: rename to "Phần còn hạn chế (đang chờ tích hợp)" and reduce to the truly-deferred items only (Gallery media + slug-immutability). | `CHOSEN` |
| `DEC-02` | Update page-header narrative to reflect accepted state (form, canonical public detail, anonymous apply). | `CHOSEN` |
| `DEC-03` | Improve empty/error text on `CreateJobPostingForm` so a user with no eligible slot understands the four canonical predicate clauses and that POST is still gated by the server. | `CHOSEN` |
| `DEC-04` | Role matrices (`CREATE_ROLES`, `VIEWER_ROLES`, `MUTATION_ROLES`) preserved byte-exact from P1-A0.1. | `CHOSEN` |
| `DEC-05` | New static guard test `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` enforces access control + stale-claim guard via filesystem reads (matches `stamp-badge.test.ts` convention; no `@testing-library/react` is used in this repo). | `CHOSEN` |
| `DEC-06` | Verify-encoding script variant: worktree branches BEFORE upstream added `verify-encoding.ps1` (`Get-Utf8EncodingIssue` was added at upstream commit `c0f4dc69`). The Node-equivalent `.ai-pipeline/scripts/verify-encoding.mjs` (added in P1-A0.1 R1 correction) is used here; the ps1 variant remains absent in the worktree pending tooling-cleanup PR. This matches `DEV-04` from `hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md`. | `CHOSEN` (carries accepted debt) |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `app/admin/jobs/job-postings/page.tsx` "Phần bị khóa" section no longer contains any of: form-chưa-dựng, public-detail-vẫn-tra-Project, anonymous-apply-chờ-P1-A1, CandidateSubmission.jobPostingId, chờ P1-A1. |
| `RQ-02` | `app/admin/jobs/job-postings/[id]/page.tsx` "Phần bị khóa" section no longer contains any of: public-detail-vẫn-tra-Project, anonymous-apply-vẫn-qua-Project, CandidateSubmission.jobPostingId, chờ P1-A1. |
| `RQ-03` | Both pages still surface the genuinely-deferred items: Gallery/media (AV4) and slug-immutability (P1-A0 acceptance criterion #11). The deferred section carries truthful wording. |
| `RQ-04` | `CreateJobPostingForm` is reachable for `CREATE_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` only; the form is conditionally rendered with that exact guard. The list page's other roles (PM/SALE/DIRECTOR/HR_STAFF-as-viewer) still see the list but not the create form (HR_STAFF may create; others only view). |
| `RQ-05` | Detail page `MUTATION_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` and `VIEWER_ROLES = {PM, SALE, DIRECTOR}` preserved byte-exact. |
| `RQ-06` | The canonical `eligibleSlotPredicateSql(now)` (in `src/domains/staffing/job-posting-list.service.ts`) is not touched; the form continues to consume the DTO mapped by `listEligibleSlotsForNewJobPosting` and never duplicates the predicate on the client. |
| `RQ-07` | Empty-state and load-error text on the form is improved to credit the canonical predicate + write-path authority; the form does not introduce a client-side eligibility check. |
| `RQ-08` | New static guard test proves all of: authorized roles CAN reach create form, unauthorized roles CANNOT, stale "form chưa dựng / P1-A1 chưa hoàn tất / CandidateSubmission.jobPostingId / trang public hiện vẫn tra Project" claims cannot return, and remaining deferred text is truthful. |

### 4.2 Scope boundaries

- **In:** 4 paths in §0 (`page.tsx`, `[id]/page.tsx`, `create-job-posting-form.tsx`, `__tests__/job-postings-ui-truth.static.test.ts`) + `docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/{TASK.md,HANDOFF.md}`.
- **Out:** schema/migration/backfill; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/staffing/job-posting-list.service.ts`; `app/(jobs)/viec-lam/**`; `app/api/public/jobs/**`; `app/api/admin/jobs/job-postings/**`; sidebar/nav/menu files; `docs/PLANNER_HANDOVER.md`; `package.json` / `package-lock.json`; n8n wiring.

### 4.3 Domain boundaries

- **Data/state:** ZERO DB writes; zero Prisma imports new in scope; no model field added/changed.
- **Permission/security:** Role matrices preserved byte-exact; no new grants; `CREATE_ROLES`/`MUTATION_ROLES`/`VIEWER_ROLES` unchanged; no query-side widening.
- **Interface/API:** No route change, no DTO change, no UI component contract change beyond wording inside the deferred-section block + page-header narrative + form empty/error text. No new prop on `CreateJobPostingForm` (`eligibleSlots`/`actionUrl`/`loadError` shapes unchanged).
- **Migration/rollback:** N/A. Rollback = revert branch commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/admin/jobs/job-postings/page.tsx` — "Phần bị khóa" section + header narrative + role-matrix comment | Rewrite to truthful state; rename to "Phần còn hạn chế" | static test gate G3/G7 PASS | Phát hiện stale claim khác ngoài EV-01/02 → dừng, báo T0 |
| `STEP-02` | `app/admin/jobs/job-postings/[id]/page.tsx` — same as STEP-01 + top header comment | Same as STEP-01 on detail page | static test gate G4/G7 PASS | Same |
| `STEP-03` | `app/admin/jobs/job-postings/create-job-posting-form.tsx` empty/error text | Improve wording; credit `eligibleSlotPredicateSql(now)` + `assertSlotEligibleForNewJobPosting` | static test gate G7 PASS | Same |
| `STEP-04` | `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` — new file | 21 tests covering G1..G8 (role matrix, stale claims, deferred truthful, predicate preservation) | unit lane run PASS | Test fails unexpectedly → báo T0 |
| `STEP-05` | `docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` + `HANDOFF.md` | Track execution per V2_FAST_FREEZE | `verify-task.ps1` PASS; `verify-handoff.ps1` PASS | n/a |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | List page does not contain any stale "form chưa dựng / P1-A1 chưa hoàn tất / CandidateSubmission.jobPostingId / trang public hiện vẫn tra Project" claim in user-facing text | `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` "G3..G6" block — 4 explicit assertions |
| `AC-02` | Detail page does not contain any stale claim from AC-01 in user-facing text | Same test file — 4 explicit assertions |
| `AC-03` | Both pages retain Gallery/media as the only integration-deferred item; detail page also retains slug-immutability as a schema-level invariant | Same test file — "G7" block |
| `AC-04` | Create form is rendered inside the `CREATE_ROLES.has(session.role)` conditional; bare `<CreateJobPostingForm` does not exist outside the gated block | Same test file — "G1+G2" block (4 assertions) |
| `AC-05` | Detail page `MUTATION_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` and `VIEWER_ROLES = {PM, SALE, DIRECTOR}` are preserved byte-exact | Same test file — "G1+G2" block + "G8" block |
| `AC-06` | Canonical imports `listEligibleSlotsForNewJobPosting` / `getJobPostingForAdmin` are preserved | Same test file — "G8" block (2 assertions) |
| `AC-07` | `CreateJobPostingForm` still consumes the server-mapped DTO and does NOT introduce client-side eligibility recomputation | Same test file — "Create form" block (5 assertions) |
| `AC-08` | No regression: full unit lane `npm run test:unit` PASS, build PASS, typecheck PASS, lint on changed files PASS | `npm run test:unit` exit 0; `npm run build` exit 0; `npm run typecheck` exit 0; `npx eslint <changed>` exit 0 |
| `AC-09` | UTF-8 no-BOM on all 4 changed/new files | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 |
| `AC-10` | Diff scope: only 4 paths in §0 + the 2 docs files; no forbidden path touched | `git diff --stat origin/main..HEAD` review |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-01, STEP-04 | AC-01, AC-04, AC-10 |
| `RQ-02` | STEP-02, STEP-04 | AC-02, AC-10 |
| `RQ-03` | STEP-01, STEP-02, STEP-04 | AC-03 |
| `RQ-04` | STEP-04 | AC-04 |
| `RQ-05` | STEP-04 | AC-05 |
| `RQ-06` | STEP-04 | AC-06, AC-07 |
| `RQ-07` | STEP-03, STEP-04 | AC-07 |
| `RQ-08` | STEP-04 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-09, AC-10 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A future PR reintroduces one of the stale claims and the static guard catches it but the user-facing UX has already shipped briefly | Static guard is in the unit lane (required to pass before any merge); no other path exposes the wording; rollback = revert commit |
| `RISK-02` | Slug-immutability item could be misread by a user as a temporary lock | Wording reframed to "schema-level invariant" with P1-A0 acceptance criterion #11 citation (truthful); rollback = revert commit |
| `RISK-03` | Static guard string matches could be evaded by adding `<!--` comments around stale wording | The test strips block comments + line comments before scanning; rollback = revert commit |
| `RISK-04` | Empty/error text improvement could be misinterpreted by users as "wait for server cron" | Improved text explicitly names the four canonical predicate clauses and the write-path authority; rollback = revert commit |

## 8. Open Questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| `OQ-01` | None. T0's task contract pre-resolved all decisions: don't grant new permissions, keep canonical predicate, keep slug-immutability, only Gallery/media is a real deferral, improve empty/error text only where useful. | - | `CLOSED` |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Adopt the chosen decisions DEC-01..06 verbatim; static guard test added; verify-encoding uses Node variant per DEV-04 carry-forward from `hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md`. | Narrow UI truth cleanup; no scope expansion detected |

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-26 | Tier 1 (T1C) | Initial v1.0; baseline `4970f47d`; FAST + NONE | T0 directive "T0 → T1C — P1-A0.2 JobPosting Authoring UX Truth Cleanup" |
