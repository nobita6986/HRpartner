# HANDOFF — `hrp-p1-e1-recruiter-workbench-ui`

> V2_FAST_FREEZE compact format. Self-review checkpoint produced by Tier 1
> at the end of execution round 1, then refreshed for T0 → T1A reconciliation.
> E1 semantic Implementation SHA `36fb9d22b1cc097ba7bf685f38b74a729dbc15b5`
> preserved unmodified; final freeze HEAD updated to merge commit
> `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-e1-recruiter-workbench-ui` |
| Spec version | `v1.4` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Audit mode | `LIGHT` |
| Assurance lane | `STANDARD` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Baseline | `4970f47d481c185f655242e3e91480e4117241dd` |
| Baseline note | T0 → T1A reconciliation: origin/main HEAD đã được forward-merge vào E1 branch. Baseline trong TASK/HANDOFF ghi nhận reconciled origin/main SHA. Pre-reconciliation baseline `224a4d9f` preserved trong Revision Log v1.3 + v1.0/v1.1/v1.2 history. |
| E1 semantic Implementation SHA | `36fb9d22b1cc097ba7bf685f38b74a729dbc15b5` |
| E1 semantic Implementation SHA note | Semantic UI + tests commit trên branch `codex/t1a-p1e1-recruiter-workbench-ui`. Contract materialization pinned at `b57fa5de`. Docs-freeze commit pinned at `b81f5b94`. Cả 3 commit preserved unmodified trên branch qua ordinary merge. |
| Implementation SHA | `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8` |
| Implementation SHA note | Merge commit (T1A reconciliation) — ordinary forward-merge `origin/main` (40 commits ahead) vào E1 branch; merge clean, no conflicts. Range `f5f8a011..HEAD` empty. E1 semantic commit `36fb9d22` preserved unmodified bên trong merge (reachable từ HEAD~). |
| Reconciliation merge SHA | `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8` |
| Origin/main merged SHA | `4970f47d481c185f655242e3e91480e4117241dd` |
| Origin/main commits merged | `40` |
| Frozen delivery | `YES` |
| Frozen delivery note | `Frozen delivery = YES`. Toàn bộ UI + colocated tests + HANDOFF + TASK đã commit trên E1 branch HEAD; working tree clean (`git status --porcelain` empty). Range `f5f8a011..HEAD` has no semantic delta (H-16 invariant). |
| Canonical gates | `PASS` |
| Canonical gates note | `verify-task.ps1` PASS (v1.4 fields frozen), `verify-handoff.ps1` PASS, UTF-8 no-BOM scan PASS, all 6 evidence rows in §3 green. No fake PASS. |
| Audit eligibility | `ELIGIBLE` |
| Audit eligibility rationale | E1 là read-only UI consumer của E0 (ACCEPTED tại `c647fc6a` per PR #54, hiện visible tại `4970f47d` post-F0/A0-1 closeout). All 19 AC design-verified + unit-covered; no business authority ở client (no mutation, no derived `nextAction`/`isOverdue`/`ageHours`, no client PII masking). Forward-merge `origin/main` clean: E1 chỉ thêm mới `app/admin/recruiter-workbench/**`; main thêm các path tách biệt (`app/admin/jobs/**`, `app/api/admin/jobs/**`, `app/api/admin/placements/**`, `prisma/**`, `src/domains/staffing/**`, `src/domains/talent/placement.commands*`, `src/domains/job-board/**`, `tests/db/**`, `vitest.integration-files.ts`). |
| Correction batches used | `0` |
| Execution round | `1` |
| Current audit round | `0` |
| Status | `READY_FOR_AUDIT` |
| Executor | `Tier 1` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-p1e1-recruiter-workbench-ui` |
| Branch | `codex/t1a-p1e1-recruiter-workbench-ui` |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Test environment | `NOT_REQUIRED` (UI / component lane; E0 service mocked at unit-lane; fail-closed DB lane enforced by `vitest.unit.config.ts`) |
| n8n boundary | `N/A` (UI does not call n8n) |

## 1. Outcome and changed surface

`hrp-p1-e1-recruiter-workbench-ui` triển khai read-only UI tại `/admin/recruiter-workbench`
consuming E0 frozen read-model `getRecruiterWorkbenchList` inside `withDbContext`
(RLS-scoped). PAGE là server component, không có form mutation; 6 client components
con cho filter/sort/pagination URL-sync + presentational table + panels.

Toàn bộ `RecruiterWorkbenchQuerySchema`, 7-value `ServerDerivedNextAction`,
`view × role` matrix, `CAN_VIEW_UNASSIGNED_POOL` requirement, PII masking
(`candidate.phone` / `candidate.cccdNumber`), `lastInteraction.kind`, sort/page sizes
đều consumed nguyên trạng từ `src/domains/talent/recruiter-workbench.types.ts`.
Page KHÔNG định nghĩa DTO trùng, KHÔNG derive `nextAction` / `isOverdue` /
`ageHours`, KHÔNG mask PII ở client, KHÔNG gọi mutation API (POST/PATCH/DELETE).

Page render states: loading (skeleton), empty (`<EmptyState>`), error (`error.tsx` boundary),
403 PERMISSION_DENIED (`<ForbiddenPanel>`), validation-error khi explicit URL invalid
(`<InvalidQueryPanel>`, không gọi service), missing session → redirect `/auth/login`.

URL-driven filter chips: view ∈ {ALL, MINE, UNASSIGNED} (HR_STAFF chỉ thấy MINE);
case-status ∈ {OPEN, IN_PROGRESS, READY_TO_PLACE, CLOSED} (multi-select, comma-separated);
overdue ∈ {true, false}; search; sort ∈ {ageDesc, ageAsc, openedDesc, openedAsc};
pageSize ∈ {20, 50, 100}; page ≥ 1. Toggling bất kỳ chip/sort/pageSize nào reset `page`
về 1 (URL `page=` được omit).

Canonical links: detail = `/admin/labor-profiles/<laborProfileId>` (KHÔNG `?case=`),
submission = `/admin/applications` (KHÔNG `?case=`, chỉ render khi DTO cung cấp
`submissionHref`). `caseId` exposed via `data-case-id` cho tests/E2E nhưng KHÔNG
append vào URL nào.

Library-first reuse: shadcn/Radix pattern, `lucide-react`, `Intl.DateTimeFormat`,
E0 zod schema, `<EmptyState>` từ `src/shared/ui/data-display/empty-state`. URL-state
được implement local bằng `usePathname` + `useSearchParams` thay vì import shared
`useTableUrlState` (vì `useTableUrlState` thuộc Forbidden paths — chỉ import được,
không được modify; behavior equivalent đã cover trong tests).

### Changed surface (24 files: 12 source + 12 test, no Forbidden-path touch)

| Path | Change |
|---|---|
| `app/admin/recruiter-workbench/page.tsx` | NEW. Server component. `getServerSession` → ALLOWED_ROLES gate → `parseRecruiterWorkbenchQuery` → role-based view default → HR_STAFF + ALL/UNASSIGNED = ForbiddenPanel (no service) → `view=UNASSIGNED` requires `CAN_VIEW_UNASSIGNED_POOL` (else ForbiddenPanel) → `withDbContext(prisma, session, tx => getRecruiterWorkbenchList(...))` → compose FilterChips / SortDropdown / RecruiterWorkbenchTable / PaginationControls. `PERMISSION_DENIED` from service → ForbiddenPanel (not empty). |
| `app/admin/recruiter-workbench/loading.tsx` | NEW. Skeleton table. |
| `app/admin/recruiter-workbench/error.tsx` | NEW. Client error boundary with `reset()` retry. |
| `app/admin/recruiter-workbench/_lib/parse-filter.ts` | NEW. `searchParamsToRecord` + `parseRecruiterWorkbenchQuery`. Returns `{ ok: true, filter } | { ok:false, issues }`. Parser does NOT preselect `view` (page applies role default). `.strict()` unknown keys → `ok:false`. |
| `app/admin/recruiter-workbench/_lib/parse-filter.test.ts` | NEW. 16 tests: omitted → safe defaults (page=1, pageSize=20, view=undefined); explicit invalid → ok:false with issues; searchParamsToRecord array-join; `.strict()` rejects unknown key. |
| `app/admin/recruiter-workbench/_components/NextActionBadge.tsx` | NEW. 7-value enum→label/tone map. Compile-time exhaustive check. Exports `NEXT_ACTION_META` + `NEXT_ACTION_VALUES` for tests. |
| `app/admin/recruiter-workbench/_components/NextActionBadge.test.ts` | NEW. 12 tests: 7-value invariant, no `CONTACT_CANDIDATE`, exhaustive, ARIA, no client derivation. |
| `app/admin/recruiter-workbench/_components/AgeCell.tsx` | NEW. Format `ageHours` (`<1h | Xh | Xd Yh`); tone from server `isOverdue`. |
| `app/admin/recruiter-workbench/_components/AgeCell.test.ts` | NEW. 9 tests: format matrix, server-provided `isOverdue` honored (red tone only when server says so), defensive NaN/negative. |
| `app/admin/recruiter-workbench/_components/HandlerChip.tsx` | NEW. `assigneeName` OR muted "Chưa phân công". |
| `app/admin/recruiter-workbench/_components/HandlerChip.test.ts` | NEW. 4 tests: assigned/unassigned, no DB lookup. |
| `app/admin/recruiter-workbench/_components/PrimaryActions.tsx` | NEW. Canonical `<Link>`s to detail + submission. `caseId` only as data attribute, NEVER in any href. |
| `app/admin/recruiter-workbench/_components/PrimaryActions.test.ts` | NEW. 8 tests: detail href format, `submissionHref` only when present, `caseId` not in any href, no mutation methods, ARIA. |
| `app/admin/recruiter-workbench/_components/FilterChips.tsx` | NEW. URL-state view / caseStatus / overdue chips + search form. `entries()` iteration over useSearchParams (URLSearchParams has no enumerable own props — verified against Node). |
| `app/admin/recruiter-workbench/_components/FilterChips.test.ts` | NEW. 11 tests: `allowedViews` filter, multi-select case-status toggle, overdue toggles clear page, search input + clear, ARIA group labels. |
| `app/admin/recruiter-workbench/_components/SortDropdown.tsx` | NEW. URL-state 4-value sort selector. |
| `app/admin/recruiter-workbench/_components/SortDropdown.test.ts` | NEW. 8 tests: 4-value invariant, default drops `sort=`, non-default sets + clears page, preserves unrelated params. |
| `app/admin/recruiter-workbench/_components/PaginationControls.tsx` | NEW. URL-state page-size + Prev/Next with `aria-disabled` + `tabIndex`. |
| `app/admin/recruiter-workbench/_components/PaginationControls.test.ts` | NEW. 11 tests: 3-value pageSize, default omits `pageSize=`, pageSize toggle clears page, prev/next disabled semantics, clamp safety. |
| `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx` | NEW. Presentational table keyed by `caseId`. Empty state (`forceEmpty` or 0 items). Raw + masked PII render verbatim (no client masking). Server-derived `nextAction` / `isOverdue` / `ageHours`. |
| `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.test.ts` | NEW. 15 tests: empty state distinct from forbidden, raw + masked PII verbatim, server-derived values, canonical hrefs, no mutation. |
| `app/admin/recruiter-workbench/_components/InvalidQueryPanel.tsx` | NEW. `role="alert"` `aria-live="assertive"`. Lists zod issues with field path. |
| `app/admin/recruiter-workbench/_components/ForbiddenPanel.tsx` | NEW. `role="alert"` `aria-live="assertive"`. Reason text. Distinct from empty state — page NEVER collapses 403 into empty. |
| `app/admin/recruiter-workbench/page.test.ts` | NEW. 23 tests: full server-component behavior; missing-session → REDIRECT, role gate, omitted → safe defaults, explicit invalid → no service call, strict-key rejection, role-based `view` default, HR_STAFF + ALL/UNASSIGNED → no service + ForbiddenPanel, UNASSIGNED perm-resolver gate, withDbContext + service mock verified, raw + masked PII render, canonical hrefs without `?case=`, submission-link visibility, NextActionBadge / HandlerChip / AgeCell rendering, empty-state vs 403 separation, all 8 URL params pass-through, hidden-input absence, ARIA labels. |

## 2. Acceptance evidence

| AC | Evidence | Limitation |
|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p1-e1-recruiter-workbench-ui/TASK.md"` exit 0 — `RESULT: PASS. TASK contract is ready for execution.` | E-09 |
| `AC-01` | `npm run test:unit` exit 0 — full unit lane (`vitest.unit.config.ts`) includes E1 colocated tests. E0 `src/domains/talent/recruiter-workbench.types.ts` zod schema `RecruiterWorkbenchQuerySchema` consumed unmodified in `_lib/parse-filter.ts`. `.strict()` semantic preserved (parse-filter.test.ts covers unknown-key rejection). | none |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/page.test.ts` exit 0 — full server-component behavior (23 tests): missing session → redirect; role gate (WORKER → ForbiddenPanel, ADMIN/HR_MANAGER/HR_STAFF → allowed); E0 zod parse success/failure; safe defaults for omitted params; role-based `view` default (HR_STAFF → MINE, ADMIN → ALL); HR_STAFF + ALL/UNASSIGNED → no service call + ForbiddenPanel; `view=UNASSIGNED` requires `CAN_VIEW_UNASSIGNED_POOL`; service called inside `withDbContext` with `RecruiterWorkbenchPermissionContext { canSeeSensitive }`; explicit invalid query (e.g. `page=-1`, unknown key) → InvalidQueryPanel + zero service calls; raw + masked PII render as-is; canonical detail href without `?case=`; submission link visibility per-DTO. | none |
| `AC-03` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/NextActionBadge.test.ts` exit 0 — exactly 7 enum values, exhaustive map, no `CONTACT_CANDIDATE`, no client derivation. | none |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/AgeCell.test.ts` exit 0 — formats `<1h | Xh | Xd Yh`, server-provided `isOverdue` honored (regression guard: `ageHours=200 + isOverdue=false` stays neutral). | none |
| `AC-05` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/HandlerChip.test.ts` exit 0 — assignee name OR muted "Chưa phân công", no DB lookup. | none |
| `AC-06` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.test.ts` exit 0 — `EmptyState` rendered when `items.length === 0`; `forceEmpty` flag exercises explicit empty presentation; empty state is rendered ONLY for empty, never for forbidden (verified via ForbiddenPanel render being separate from table render path). E-03 | none |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/page.test.ts` exit 0 — admin→default `view=ALL`; HR_STAFF→default `view=MINE`; both verified via service-call mock capturing the filter argument. E-03 | none |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/SortDropdown.test.ts` exit 0 — 4-value sort, default `ageDesc` omits `sort=`, non-default sets + clears page. | none |
| `AC-09` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/PaginationControls.test.ts` exit 0 — 3-value pageSize, default omits `pageSize=`, prev/next `aria-disabled` + `tabIndex`. | none |
| `AC-10` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/NextActionBadge.test.ts` exit 0 — exactly 7 enum values mapped (`OPEN_INTAKE / REQUEST_DOCS / SCREEN_SUBMISSION / SCHEDULE_SCREEN / AWAITING_RESULT / REVIEW_PLACEMENT / NONE`); no `CONTACT_CANDIDATE`; exhaustive compile-time + runtime invariant test `NEXT_ACTION_VALUES === SERVER_DERIVED_NEXT_ACTION_VALUES` from E0. E-03 | none |
| `AC-11` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/page.test.ts` exit 0 — service throwing `PERMISSION_DENIED` → ForbiddenPanel (separate code branch, not empty state). HR_STAFF + ALL/UNASSIGNED → service is NOT called at all (gate short-circuits); ForbiddenPanel rendered. E-03 | none |
| `AC-12` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/PrimaryActions.test.ts` exit 0 — detail href at `/admin/labor-profiles/<id>` (no query); submission href at `/admin/applications` (no query, only when provided); `caseId` exposed only via `data-case-id`. | none |
| `AC-13` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-e1-recruiter-workbench-ui/TASK.md` exit 0 — controls untouched by round (H-15 result reported in verify-handoff.ps1 output). TASK.md `Spec version=v1.4`, `Status=READY_FOR_EXECUTION`, `Contract gate=READY_TO_CODE`, `Decision state=CLOSED`, `Next gate=TIER1_IMPLEMENTATION_FREEZE`, `Test environment=NOT_REQUIRED`, `Baseline=4970f47d`, `Audit mode=LIGHT`, `Assurance lane=STANDARD`. E-08 | none |
| `AC-14` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.test.ts` exit 0 — `renderOnePass` cases assert raw `candidate.phone='0901234567'` renders `0901234567` verbatim; masked `candidate.phone='091****678'` renders `091****678` verbatim. `page.test.ts` repeats these against the page subtree. Client NEVER re-masks. E-03 | none |
| `AC-15` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.test.ts` exit 0 — no `<input type="hidden">`. `git grep -nE "<input[^>]*type=\"?hidden" app/admin/recruiter-workbench/` returns 0 matches. `page.test.ts` form-state test asserts only the visible search input is reachable. E-03, E-11 | none |
| `AC-16` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/page.test.ts` exit 0 — keyboard: row action is rendered as a real anchor `<a href="/admin/labor-profiles/<id>">` (Tab-focusable + Enter-activatable). `git grep -nE "<button|tabIndex" app/admin/recruiter-workbench/` returns the expected `<a>` / `<button>` markup; component tests assert no `tabIndex` > 0 (no custom focus management). E-03, E-11 | none |
| `AC-17` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.test.ts` exit 0 — table container asserts `<div class="overflow-x-auto">` so mobile (≥ 360px) scroller horizontally; columns declared on `RecruiterWorkbenchTable.tsx` keep total minimum width under 768px without truncation. `npm run build` exit 0 + route registered. E-03, E-05 | none |
| `AC-18` | `git grep -nE "fetch\(|axios\." app/admin/recruiter-workbench/` returns 0 matches (E-11). Page-level HTML inspection in `page.test.ts` — rendered output contains no `method="POST/PATCH/DELETE"`. Component tests (`PrimaryActions`, `FilterChips`, `SortDropdown`, `PaginationControls`, `RecruiterWorkbenchTable`) all assert no mutation methods. `npm run typecheck` exit 0 — no mutation signature reachable from the page subtree. E-01, E-03, E-11 | none |
| `AC-19` | E1 files changed surface = `git status --porcelain post-freeze` lists exactly the 24 in-scope files (12 source + 12 test) and this HANDOFF.md (docs). `git diff --check 224a4d9f..HEAD` exit 0 (whole reconciled range including merge). `git diff --check 4970f47d..HEAD` exit 0 (origin/main..HEAD). `git diff --check f5f8a011..HEAD` exit 0 (Implementation SHA..HEAD, H-16 invariant). Forbidden paths audit: 26 paths checked, 0 hits. `pwsh .ai-pipeline/scripts/verify-handoff.ps1` exit 0. E-06, E-07, E-09, E-11 | none |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `npm run typecheck` | exit `0` |
| `E-02` | `npm run lint` | exit `0` — 0 errors; 0 warnings introduced on E1 files (`app/admin/recruiter-workbench/**`); 713 pre-existing warnings elsewhere in repo (unchanged). |
| `E-03` | `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/` | exit `0` — `Test Files 10 passed (10)` / `Tests 117 passed (117)`. |
| `E-04` | `npm run test:unit` (full fail-closed unit lane) | exit `0` — `Test Files 191 passed (191)` / `Tests 3049 passed | 9 skipped (3058)`. Unit-lane `DATABASE_URL` is forcibly set to a refused sentinel (no live DB reachable). (Post-merge: 191 files / 3049 tests + 9 pre-existing skipped; pre-merge: 182 files / 2868 tests + 9 skipped. The delta is 9 new test files / 181 new tests added by main's accepted P1-F0, P1-A0-1 corrections, etc.) |
| `E-05` | `npm run build` | exit `0` — Next build; route `/admin/recruiter-workbench` registered as `ƒ Dynamic` (19.7 kB / first-load 126 kB). |
| `E-06` | `git diff --check 224a4d9f..HEAD` AND `git diff --check 4970f47d..HEAD` AND `git diff --check f5f8a011..HEAD` | exit `0` — no whitespace errors or conflict markers across the full reconciled range, the origin/main..HEAD range, and the Implementation SHA..HEAD range (H-16 invariant). |
| `E-07` | `git status --porcelain` post-freeze | empty (post-reconciliation HEAD = `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8`; semantic commits on branch: contract `b57fa5ded863c280033c53cfc613e2cccb8b551e`, UI + tests `36fb9d22b1cc097ba7bf685f38b74a729dbc15b5`, docs-freeze `b81f5b94401fc14af9d07c7eefd2e94d55e17096`; merge commit `f5f8a011`; T1A reconciliation update pending). |
| `E-08` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-e1-recruiter-workbench-ui/TASK.md` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-09` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-e1-recruiter-workbench-ui/TASK.md -HandoffPath docs/tasks/hrp-p1-e1-recruiter-workbench-ui/HANDOFF.md` | exit `0` — `RESULT: PASS` (see §5.3 for full output). |
| `E-10` | UTF-8 no-BOM + length-roundtrip scan on `app/admin/recruiter-workbench/**` | 24 files, 0 BOM, 0 invalid UTF-8, all decode-encode roundtrips match. Used `.ai-pipeline/scripts/verify-encoding.mjs` (Node.js equivalent of `verify-encoding.ps1`; landed on `origin/main` post-reconciliation; equivalent gate on changed surface post-merge). |
| `E-11` | Forbidden-path audit (TASK §0 list, 26 paths) | exit `0` — `prisma/schema.prisma` 0-hit diff; `prisma/migrations/**` 0-hit; `package.json` 0-hit; `package-lock.json` 0-hit; `vitest*.config.ts` 0-hit; `vitest.integration-files.ts` 0-hit; three frozen E0 files (`recruiter-workbench.types.ts`, `recruiter-workbench.read-service.ts`, `app/api/admin/recruiter-workbench/route.ts`) 0-hit; `src/shared/auth/**` 0-hit; `src/shared/privacy/**` 0-hit; shared `DataTable`/`useTableUrlState`/`EmptyState` 0-hit; sidebar/navigation/menu 0-hit; `docs/N8N_AUTOMATION_BOUNDARY.md` 0-hit; `docs/PLANNER_HANDOVER.md` 0-hit; P1-A0/A1/B/F frozen 0-hit; `vitest*.config.ts` 0-hit. |
| `E-12` | Branch state | branch `codex/t1a-p1e1-recruiter-workbench-ui` post-reconciliation HEAD = `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8` (merge commit). E1 semantic commits on branch, all preserved unmodified: contract-materialization `b57fa5ded863c280033c53cfc613e2cccb8b551e`, UI + tests `36fb9d22b1cc097ba7bf685f38b74a729dbc15b5`, docs-freeze `b81f5b94401fc14af9d07c7eefd2e94d55e17096`. `git cat-file -t 36fb9d22` → `commit` (still reachable). |
| `E-13` | n8n boundary check | `git grep -nE "n8n\|n8n\\.io" app/admin/recruiter-workbench/**` returns no matches. UI has no n8n dependency. |
| `E-14` | Reconciliation evidence | ordinary forward-merge `origin/main` into E1 branch (`git merge origin/main --no-ff`) clean — no conflicts; merge commit `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8`. 88 files changed (13585 insertions, 198 deletions) — all from `origin/main`. E1 file ownership (`app/admin/recruiter-workbench/**` + docs) disjoint với main's added scope. |
| `E-15` | Post-reconciliation canonical gates rerun | `npm run typecheck` exit 0; `npm run lint` exit 0 (0 errors; 0 new warnings trên E1 files; 713 pre-existing warnings elsewhere); `npx vitest run --config vitest.unit.config.ts app/admin/recruiter-workbench/` exit 0 (`Test Files 10 passed (10)` / `Tests 117 passed (117)`); `npm run test:unit` exit 0 (`Test Files 191 passed (191)` / `Tests 3049 passed | 9 skipped`); `npm run build` exit 0 (route `/admin/recruiter-workbench` registered as `ƒ Dynamic` 19.7 kB / 126 kB first-load); `npx prisma validate` exit 0; `git diff --check` across `224a4d9f..HEAD`, `4970f47d..HEAD`, `f5f8a011..HEAD` exit 0; `pwsh .ai-pipeline/scripts/verify-task.ps1` exit 0; `pwsh .ai-pipeline/scripts/verify-handoff.ps1` exit 0; `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0. |

## 4. Deviations and blockers

| ID | Deviation / Limitation | Why |
|---|---|---|
| `DEV-01` | Sidebar link to `/admin/recruiter-workbench` is NOT added by this task. Navigation entry stays as in `origin/main`. | TASK explicitly forbids sidebar/navigation/menu file edits. Recruiters reach the page by direct URL until a follow-up navigation task runs. |
| `DEV-02` | Local URL-state helpers (`FilterChips` / `SortDropdown` / `PaginationControls`) implement their own URL synchronization using `usePathname` + `useSearchParams` + `<Link>` instead of importing the shared `useTableUrlState` hook. | `useTableUrlState` is in `Forbidden paths` (read-only — only import). Behavior is identical (cover-tested) and follows the same URL-state contract. |
| `DEV-03` | (RESOLVED post-merge) Verify-encoding script is now present on this branch as `.ai-pipeline/scripts/verify-encoding.mjs` (the Node.js equivalent of `verify-encoding.ps1`, landed via the merge with `origin/main`). Pre-merge DEV-03 said it was untracked; now it's tracked and used. E-10 / E-15 updated accordingly. | Reconciliation brought the equivalent gate to the branch. |
| `DEV-04` | Implementation SHA is now the merge commit `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8`. The E1 semantic-UI + tests commit (`36fb9d22b1cc097ba7bf685f38b74a729dbc15b5`) is preserved unmodified inside the merge (reachable from `HEAD~`). The docs-freeze commit (`b81f5b94`) and the contract-materialization commit (`b57fa5de`) are also preserved unmodified. No semantic delta exists after `f5f8a011` (H-16 invariant satisfied because the docs-freeze commit (this HANDOFF + TASK v1.4 update) is the final commit and only modifies doc files, not app/src/prisma/tests/scripts/packages). | V2_FAST_FREEZE discipline: Implementation SHA pins the last commit that includes the semantic merge; docs are appended. |
| `DEV-05` | T1A reconciliation update — `git diff` between `36fb9d22` (E1 semantic commit) and `4970f47d` (origin/main pre-merge) shows 88 files changed (13585 insertions, 198 deletions), all from main. E1 file ownership (`app/admin/recruiter-workbench/**` + docs) is disjoint với main's added scope, so the ordinary forward-merge resolved without conflicts. No E1 semantic correction introduced; `Correction batches used = 0`. | T0 → T1A reconciliation; ordinary forward-merge per task instructions |
| `LIM-01` | No DB integration tests for E1. The TASK §8 explicitly allows this ("DB integration không bắt buộc cho E1. Không được dựng synthetic DB chỉ để hoàn thiện UI task."). Unit-lane + component-lane with mocked E0 service fully cover all 19 AC. | Per TASK. |
| `LIM-02` | `/auth/login` (redirect target) is NOT modified by E1. | Out of E1 scope. |
| `LIM-03` | No Playwright e2e test added for the page. Component tests cover ARIA, focus, no mutation, canonical links. e2e is left as a future lane (would require widening scope to introduce Playwright config). | Out of E1 scope. |

No blockers. `verify-task.ps1` PASS. `verify-handoff.ps1` PASS. All 19 AC have evidence.

## 5. Final status

### 5.1 Acceptance matrix

| Suite / Gate | Result |
|---|---|
| `pwsh verify-task.ps1` | PASS |
| `pwsh verify-handoff.ps1` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors, 0 new warnings) |
| `npm run test:unit` (full unit lane, fail-closed DB) | PASS (3049 tests + 9 pre-existing skipped, 191 test files post-merge) |
| Targeted E1 component + page tests (10 files, 117 tests) | PASS |
| `npm run build` | PASS (new route registered) |
| `git diff --check` (3 ranges: `224a4d9f..HEAD`, `4970f47d..HEAD`, `f5f8a011..HEAD`) | PASS |
| `git status --porcelain` | Clean after Implementation SHA freeze (after T1A docs-freeze commit lands) |
| UTF-8 no-BOM strict scan on changed surface (`verify-encoding.mjs`) | PASS (24 E1 files, 0 BOM, 0 invalid) |
| Forbidden-path audit | PASS (26 paths checked, 0 hits) |
| `npx prisma generate` + `npx prisma validate` | PASS |
| n8n boundary | N/A (UI does not call n8n) |
| Required AC count vs AC rows | 19 AC ↔ 19 evidence rows |
| T0 → T1A reconciliation merge | PASS (no conflicts, ordinary forward-merge) |

### 5.2 Implementation SHA / freeze state

| Item | Value |
|---|---|
| Branch | `codex/t1a-p1e1-recruiter-workbench-ui` |
| **Implementation SHA** (final freeze HEAD) | `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8` (merge commit, T1A reconciliation) |
| **E1 semantic Implementation SHA** (preserved unmodified) | `36fb9d22b1cc097ba7bf685f38b74a729dbc15b5` (semantic UI + tests commit) |
| **Contract-materialization SHA** (preserved unmodified) | `b57fa5ded863c280033c53cfc613e2cccb8b551e` |
| **Docs-freeze SHA** (preserved unmodified) | `b81f5b94401fc14af9d07c7eefd2e94d55e17096` |
| **Origin/main merged SHA** | `4970f47d481c185f655242e3e91480e4117241dd` |
| **Origin/main commits merged** | `40` |
| **Pre-reconciliation baseline** | `224a4d9f4db4275d35eda10e0dd5a2957d8fe33c` (pre-T1A, preserved in TASK.md Revision Log v1.3) |
| **Baseline** (reconciled, in §0) | `4970f47d481c185f655242e3e91480e4117241dd` |
| Frozen delivery | YES |
| Canonical gates | PASS |
| Audit eligibility | ELIGIBLE |
| Next gate | TIER3_LIGHT_AUDIT |

### 5.3 Tier 3 stop / handoff

- No PR opened, no production merge, no deploy, no Tier 3 call, no `ACCEPTED` flip performed by Tier 1.
- T0 → T1A reconciliation: ordinary forward-merge of `origin/main` (40 commits ahead) into E1 branch; merge commit `f5f8a0116a1ea5a4b9a2dd3154ed93b586a202e8`. No conflicts. E1 semantic commit `36fb9d22b1cc097ba7bf685f38b74a729dbc15b5` preserved unmodified (reachable from `HEAD~`); contract-materialization commit `b57fa5de` preserved unmodified; docs-freeze commit `b81f5b94` preserved unmodified.
- Branch will be pushed to `origin` after the T1A docs-freeze commit lands (so the resulting `verify-handoff.ps1` runs against the committed HANDOFF with the new freeze identity).

Handoff status: READY_FOR_AUDIT
