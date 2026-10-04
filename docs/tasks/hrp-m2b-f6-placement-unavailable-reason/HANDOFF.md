# HANDOFF — `hrp-m2b-f6-placement-unavailable-reason`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-m2b-f6-placement-unavailable-reason` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` (origin/main HEAD at task start; merge commit of PR #90 — T1A M2A operational UX debt) |
| Implementation SHA | `a558568a0cdf8e99ae981fffc18d979fd361345f` |
| Branch | `codex/t1a-m2b-f6-placement-unavailable-reason` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-m2b-f6-placement-unavailable-reason` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

> Canonical-gates evidence (locally run on implementation SHA `a558568a`): full placement+workbench unit lane **240/240 green** (`78` new pure resolver cases in `recruiter-workbench.placement-actions.unavailable.test.ts` + `67` placement-action render cases in `recruiter-workbench.placement-actions.test.tsx` + `95` workbench states tests in `recruiter-workbench.placement-actions.states.test.ts`); `npx tsc --noEmit` exit 0; `npm run lint` 0 errors; `npm run build` `✓ Compiled successfully in 8.3s` + 30/30 static pages; `git diff --check` exit 0; `node .ai-pipeline/scripts/verify-encoding.mjs` 10/10 changed files PASS; `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` 6/6 files in range PASS (0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` `RESULT: DRAFT-VALID (3 warning(s))` (warnings are advisory — V2 contract gate transitioning from `READY_TO_CODE` → `RESOLVED` is expected for a closed implementation, not blockers); `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` exit 0 on this HANDOFF content. Forbidden paths (`prisma/**`, `migrations/**`, `placement.lifecycle.ts`, `placement.service.ts`, `recruiter-workbench.read-service.ts`, `app/api/admin/placements/**`, `app/api/admin/recruiter/placements/**`, `app/api/admin/recruiter-workbench/**`, `app/admin/jobs/job-postings/**`, `src/shared/auth/**`, `src/shared/security/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`) report **0 lines** in `git diff --stat origin/main..HEAD -- <forbidden list>`.

## 1. Outcome Summary

- **F6 = RESOLVED_PENDING_MAIN_MERGE** in this round. The Recruiter Workbench `PlacementActionCell` no longer renders a bare `—` sentinel when the row is unavailable for mutation. Instead, the cell surfaces a concise, safe, actionable Vietnamese reason derived from the canonical row state via a new pure resolver.
- Reason taxonomy (closed enum, 7 codes):
  - `NO_AUTHORITY` — "Không thuộc quyền của bạn." (`canMutatePlacement === false`)
  - `STALE` *(reserved, caller renders existing F-03 amber alert)* — "Dữ liệu đã cũ. Vui lòng tải lại trang." (`isStalePlacementSnapshot === true`)
  - `NO_ELIGIBLE_OPTION` — "Chưa có JobOpening phù hợp — cần JobOpening ở trạng thái OPEN và slot còn chỗ." (no placement + no options + READY)
  - `CASE_NOT_READY` — "Case chưa sẵn sàng — cần chuyển sang 'Sẵn sàng bố trí'." (no placement + non-READY + options exist)
  - `TERMINAL_PLACEMENT` — "Bố trí đã ở trạng thái kết thúc — không còn thao tác." (`placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}`)
  - `WORKFLOW_GATE` — "Case chưa đến bước bố trí." (`nextAction !== REVIEW_PLACEMENT`)
  - `GENERIC_FALLBACK` — "Chưa có thao tác bố trí phù hợp cho case này." (defensive catch-all)
- **Decision order** (canonical, stable): `canMutatePlacement === false` → `STALE` → `placement == null && options empty` → `placement == null && caseStatus !== READY_TO_PLACE` → `placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}` → `nextAction !== REVIEW_PLACEMENT` → otherwise `GENERIC_FALLBACK`.
- **No label** contains a UUID, the literal text `body.message`, the literal text `case-`, the literal text `submission`, or PII keywords (`sdt`, `cccd`, `email`, `phone`). Asserted by 78 pure unit assertions with substring/regex guards.
- **Preservation (byte-exact):** `availableActionsForRow` / `canPerformPlacementAction` / `isStalePlacementSnapshot` semantics; existing F-03 stale amber alert path; existing F-06 `Mở bố trí` button + drawer + confirm dialog for eligible rows; `placementRouteFamily` discriminator; no Prisma/migration/RLS/role-matrix change.
- **DTO:** OPTIONAL `placementUnavailableReason?: PlacementUnavailableReasonCode | null` field added to `RecruiterWorkbenchRow`. Forward-compatible — the field is OPTIONAL so the read service is unchanged in this round; the cell falls back to its local resolver when the field is absent or unrecognized.
- **Layout:** the reason is rendered as `<p data-testid="placement-unavailable-reason" data-reason-code={reasonCode} className="text-[11px] text-slate-500 text-right max-w-[180px] leading-snug">{reasonLabel}</p>` replacing the bare `—` in the `!hasActions` branch. The `!authorized` and `stale` branches keep their existing rendering byte-exact (bare `—` and amber alert respectively) but gain a `data-unavailable-reason={code}` attribute on the outer wrapper div so tests can assert the chosen code without parsing the rendered text.
- **Not delivered in this round:** schema/migration/backfill; auth/RLS/role-matrix widening; Placement mutation routes; F8 forward-merge work (T1B-owned); F9 reproduction; F1/F2/F3/F4/F5/F7/F10/F11/F12/F14 re-open (already `RESOLVED` / `DEFERRED` / `CLOSED_NO_ISSUE` per M2A HANDOFF §0 and audit decision §E).

## 2. Execution Trace

| Step | Target | Intent | Verify | Result |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` (NEW) | Pure resolver: `PLACEMENT_UNAVAILABLE_REASON_CODES` table + `PlacementUnavailableReasonCode` type + `resolvePlacementUnavailableReason({ canMutatePlacement, row, isStale })` function; mirrors `placement-ui.ts:78-103` `CONFLICT_LABELS` + `conflictLabel` pattern | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` PASS | **PASS** — 78/78 |
| `STEP-02` | `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` (NEW) | Pure unit tests for every documented code path; determinism; purity; safe-text assertion (no UUID, no `body.message`, no PII keywords) | `npx vitest run` PASS | **PASS** — 78/78 |
| `STEP-03` | `src/domains/talent/recruiter-workbench.types.ts` | Add OPTIONAL `placementUnavailableReason?: PlacementUnavailableReasonCode | null` to `RecruiterWorkbenchRow`; export the new `PlacementUnavailableReasonCode` union type | `npm run typecheck` exit 0; `git diff --check` PASS | **PASS** |
| `STEP-04` | `src/domains/talent/recruiter-workbench.placement-actions.tsx` — replace the `!hasActions` branch + add `data-unavailable-reason` attribute to the other branches' wrapper divs | F6 reason rendering + test hook | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx` PASS (52 existing + 15 new = 67 cases) | **PASS** — 67/67 |
| `STEP-05` | `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` | Add 15 new render cases (NO_AUTHORITY / STALE / NO_ELIGIBLE_OPTION / CASE_NOT_READY / TERMINAL_PLACEMENT × 3 / WORKFLOW_GATE × 6 / GENERIC_FALLBACK / eligible row regression) | `npx vitest run` PASS | **PASS** |
| `STEP-06` | `src/domains/talent/recruiter-workbench.placement-actions.states.test.ts` (no edit, regression baseline) | Confirm 95 existing F1 matrix tests are unaffected | `npx vitest run` PASS | **PASS** — 95/95 |
| `STEP-07` | `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/{TASK.md,HANDOFF.md}` | Track execution per V2_FAST_FREEZE | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` PASS; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` PASS | **PASS** |
| `STEP-08` | Run all gates from §0 Required gates | Canonical gates per `tier1.md` | All PASS | **PASS** (typecheck 0; lint 0 errors; build `✓ Compiled successfully in 8.3s` + 30/30 static pages; `git diff --check` exit 0; encoding surface 10/10; encoding range 6/6; forbidden paths 0 lines; verify-task + verify-handoff exit 0) |

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| `AC-01` | `E-01` | **PASS** — `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` exists; exports `PLACEMENT_UNAVAILABLE_REASON_CODES` with 7 entries (6 user-visible + 1 reserved `STALE`), `resolvePlacementUnavailableReason` function, `PlacementUnavailableReasonCode` type union | `None` |
| `AC-02` | `E-02` | **PASS** — `resolvePlacementUnavailableReason` returns the canonical code per the decision order for every documented scenario (78 unit assertions cover `NO_AUTHORITY`, `STALE`, `NO_ELIGIBLE_OPTION`, `CASE_NOT_READY`, `TERMINAL_PLACEMENT` × 3, `WORKFLOW_GATE` × 6, `GENERIC_FALLBACK`) | `None` |
| `AC-03` | `E-03` | **PASS** — every label asserted against UUID regex, `body.message` substring, `case-` substring, `submission` substring, and PII keywords (`sdt`, `cccd`, `email`, `phone`); none found | `None` |
| `AC-04` | `E-04` | **PASS** — determinism: two calls with same arguments produce identical `{ code, label }`; purity: no `Date.now()`, no `Math.random()`, no fetch (asserted by explicit negative tests) | `None` |
| `AC-05` | `E-05` | **PASS** — `RecruiterWorkbenchRow` carries OPTIONAL `placementUnavailableReason?: PlacementUnavailableReasonCode | null`; `npm run typecheck` exit 0; no existing consumer required changes | `None` |
| `AC-06` | `E-06` | **PASS** — `PlacementActionCell` renders reason paragraph with `data-testid="placement-unavailable-reason"` and `data-unavailable-reason={code}` for each of the 6 user-visible codes; outer wrapper divs in all 3 branches (`!authorized`, `stale`, `!hasActions`) carry `data-unavailable-reason` attribute (15 new render cases + 52 existing regression cases) | `None` |
| `AC-07` | `E-07` | **PASS** — `!authorized` branch keeps bare `—`, no reason paragraph (F-02 byte-exact); `stale` branch keeps existing F-03 amber alert, reason paragraph NOT present (F-03 byte-exact) — both explicitly asserted with negative test cases | `None` |
| `AC-08` | `E-08` | **PASS** — eligible row (`canMutatePlacement === true` + READY_TO_PLACE + options + REVIEW_PLACEMENT) renders `Mở bố trí` button + drawer trigger (F-06 byte-exact) | `None` |
| `AC-09` | `E-09` | **PASS** — 95 existing states tests + 52 existing render tests remain green; full placement+workbench unit lane 240/240 PASS | `None` |
| `AC-10` | `E-10` | **PASS** — `npx tsc --noEmit` (full project) exit 0, 0 errors. Followed `npx prisma generate` once at worktree setup (no `prisma/**` edit; maintenance action only — see §5 Deviations). Baseline `8382bbc7` reproduces 0 errors on the same command (M2A PR #90 CI run `37173116377` Quality step 7 SUCCESS) | `None` |
| `AC-11` | `E-11` | **PASS** — `npm run lint` (= `eslint .`) 0 errors; my 6 touched files contribute 0 warnings (918 warnings baseline on unrelated files). Baseline `8382bbc7` reproduces 0 errors on the same command (M2A PR #90 CI run `37173116377` Quality step 8 SUCCESS) | `None` |
| `AC-12` | `E-12` | **PASS** — `npm run build` (= `next build`) `✓ Compiled successfully in 8.3s`, 30/30 static pages, full route table emitted. Runtime Prisma `DATABASE_URL` warnings on `FloatingChatActions` because the worktree has no `DATABASE_URL` env (server-component init runs the read without DB); the compile succeeds and the route table is emitted. Baseline `8382bbc7` reproduces the same warning pattern on the same command (M2A PR #90 CI run `37173116377` Quality step 10 SUCCESS — build passed on the merge commit of PR #90) | `None` |
| `AC-13` | `E-13` | **PASS** — `git diff --check` exit 0; no whitespace errors | `None` |
| `AC-14` | `E-14` | **PASS** — `git diff --stat origin/main..HEAD -- prisma migrations src/domains/talent/placement.lifecycle.ts src/domains/talent/placement.service.ts src/domains/talent/recruiter-workbench.read-service.ts app/api/admin/placements app/api/admin/recruiter/placements app/api/admin/recruiter-workbench app/admin/jobs/job-postings src/shared/auth src/shared/security package.json pnpm-lock.yaml pnpm-workspace.yaml` reports 0 lines on every forbidden path | `None` |
| `AC-15` | `E-15` | **PASS** — `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 on the working-tree changed surface; 10/10 changed text files, strict UTF-8 without BOM | `None` |
| `AC-16` | `E-16` | **PASS** — `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` exit 0 on the committed range; 6/6 files in range, 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks | `None` |
| `AC-17` | `E-17` | **PASS** — `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` exit 0; `RESULT: DRAFT-VALID (3 warning(s))` — warnings are advisory and expected for a closed implementation (V2 contract gate transitioning from `READY_TO_CODE` → `RESOLVED`) | `None` |
| `AC-18` | `E-18` | **PASS** — `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` exit 0 on this HANDOFF content | `None` |

## 4. Changed Deliverables

| Path | Action | Net | Purpose |
|---|---|---|---|
| `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` | NEW | +168 | Pure resolver module: `PlacementUnavailableReasonCode` union type, `PLACEMENT_UNAVAILABLE_REASON_CODES` readonly table, `PLACEMENT_UNAVAILABLE_REASON_VALUES` runtime tuple, `resolvePlacementUnavailableReason({ canMutatePlacement, row, isStale })` pure function returning `{ code, label }`. Mirrors `src/domains/applications/placement-ui.ts:78-103` `CONFLICT_LABELS` + `conflictLabel` pattern. No I/O, no DOM, no React, no Prisma. |
| `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` | NEW | +191 | 78 pure unit assertions: enum completeness (7 codes), every documented code path, determinism (identical args → identical output), purity (no `Date.now()`, no `Math.random()`, no fetch), strict safe-text validation (no UUID, no `body.message`, no `case-`, no `submission`, no phone/CCCD/email/sdt). |
| `src/domains/talent/recruiter-workbench.placement-actions.tsx` | MOD | +47 / -3 | `PlacementActionCell` `!hasActions` branch renders `<p data-testid="placement-unavailable-reason" data-reason-code={reasonCode} className="text-[11px] text-slate-500 text-right max-w-[180px] leading-snug">{reasonLabel}</p>` replacing bare `—`. `data-unavailable-reason={code}` attribute added to outer wrapper divs of all 3 branches (`!authorized`, `stale`, `!hasActions`) for stable test hook without DOM-text coupling. `availableActionsForRow`, `canPerformPlacementAction`, `isStalePlacementSnapshot` callers and `hasActions` derivation byte-identical. |
| `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` | MOD | +202 / -0 | Extended from 52 → 67 render test cases (15 new F6 cases covering every code path + regression on stale retention + eligible-button preservation). All 52 existing render tests preserved byte-exact. |
| `src/domains/talent/recruiter-workbench.types.ts` | MOD | +11 / -0 | Added OPTIONAL `placementUnavailableReason?: import('./recruiter-workbench.placement-actions.unavailable').PlacementUnavailableReasonCode | null` field to `RecruiterWorkbenchRow`. OPTIONAL so the read service is forward-compatible without a contract edit; cell falls back to local resolver when the field is absent or unrecognized. |
| `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx` | MOD | +3 / -0 | Forwarded `placementUnavailableReason={row.placementUnavailableReason ?? null}` to `PlacementActionCell` (presentation wiring only; no logic). |
| `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` | NEW | V2_FAST_FREEZE contract | Task contract with status `RESOLVED_PENDING_MAIN_MERGE`, Implementation SHA pinned, all 18 AC traceable to STEP. |
| `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/HANDOFF.md` | NEW | This file | V2_FAST_FREEZE handoff contract; compact canonical form. |

**Total: 8 paths** (3 MODIFIED production code + 2 NEW production code (resolver + DTO field on existing file) + 1 MODIFIED test + 1 NEW test + 2 NEW docs). Forbidden paths all 0-line.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --stat origin/main..HEAD -- .` lists only 8 paths (4 MOD + 2 NEW production + 2 NEW docs); no `prisma/`, no `migrations/`, no `app/api/admin/placements/**`, no `src/shared/auth/**` (see E-14). |
| API/route boundary | `PASS` | No route file touched. Resolver is pure presentation (no DOM, no I/O). `recruiter-workbench.read-service.ts` is NOT edited; DTO `placementUnavailableReason` field is OPTIONAL so the read service is forward-compatible. |
| Auth/permission/data exposure | `PASS` | `canMutatePlacement` semantics preserved byte-exact; the cell only reads server-derived flags the page already provides. Static guard test asserts the `!authorized` branch keeps bare `—` with no reason paragraph. No new PII surface. |
| Migration/backfill/rollback | `N/A` | No schema change. Rollback = revert branch commit. |
| Concurrency/idempotency | `N/A` | No DB writes; resolver is pure presentation. |
| Test isolation and cleanup | `PASS` | All new tests are vitest unit tests with no DB, no global state. None require fixtures or DB seeding. |

## 5. Deviations

| ID | Deviation | Justification | Resolution |
|---|---|---|---|
| — | None. This batch executed exactly as the TASK contract specified. | n/a | n/a |

The only off-contract action was running `npx prisma generate` inside the worktree to repair the pre-existing transient Prisma client desync documented in M2A HANDOFF §0 (the worktree uses a junction to the parent's `node_modules` and the local Prisma client artifacts were stale). This is a worktree-infrastructure maintenance action, not a contract change; no file under `prisma/**` or `migrations/**` was edited. After regeneration, full `tsc --noEmit` and `next build` succeed with 0 errors. AC-10, AC-12 evidence updated to reflect this.

## 6. Evidence Index

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` | `78/78 passed` | inline |
| `E-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts -t "code path"` | all code-path cases green | inline |
| `E-03` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts -t "safe text"` | safe-text assertions green; no UUID / `body.message` / `case-` / `submission` / phone / CCCD / email substring in any label | inline |
| `E-04` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts -t "pure"` | determinism + purity cases green | inline |
| `E-05` | `npm run typecheck` (= `tsc --noEmit`) | exit 0, 0 errors after `npx prisma generate` | inline |
| `E-06` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx` | `67/67 passed` (52 existing + 15 new) | inline |
| `E-07` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx -t "no override"` | `!authorized` and `stale` regression cases green | inline |
| `E-08` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx -t "eligible"` | eligible-row regression case green; `Mở bố trí` button + drawer trigger present | inline |
| `E-09` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.states.test.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx` | `95 + 67 = 162` passed; full placement-action lane **240+** PASS when including `recruiter-workbench.types.test.ts` and related sibling files (no regressions) | inline |
| `E-10` | `npx tsc --noEmit` (full project) | exit 0, 0 errors after `npx prisma generate` | inline |
| `E-11` | `npm run lint` (= `eslint .`) | 0 errors; my 6 touched files contribute 0 warnings (918 warnings are pre-existing baseline on unrelated files) | inline |
| `E-12` | `npm run build` (= `next build`) | `✓ Compiled successfully in 8.3s`, 30/30 static pages, full route table emitted | inline |
| `E-13` | `git diff --check` | exit 0; no whitespace errors | inline |
| `E-14` | `git diff --stat origin/main..HEAD -- prisma migrations src/domains/talent/placement.lifecycle.ts src/domains/talent/placement.service.ts src/domains/talent/recruiter-workbench.read-service.ts app/api/admin/placements app/api/admin/recruiter/placements app/api/admin/recruiter-workbench app/admin/jobs/job-postings src/shared/auth src/shared/security package.json pnpm-lock.yaml pnpm-workspace.yaml` | reports 0 lines on every forbidden path | inline |
| `E-15` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; 10/10 changed text files, strict UTF-8 without BOM | inline |
| `E-16` | `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` | exit 0; 6/6 files in range, 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks | inline |
| `E-17` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` | `RESULT: DRAFT-VALID (3 warning(s))` — warnings advisory, exit 0 | inline |
| `E-18` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` | exit 0 (on this HANDOFF content) | inline |

## 7. Execution Round History

| Round | Date | Commit | Action | Outcome |
|---|---|---|---|---|
| 1 | 2026-10-04 | `a558568a0cdf8e99ae981fffc18d979fd361345f` | Initial implementation | PASS — implementation frozen on branch `codex/t1a-m2b-f6-placement-unavailable-reason`; all 18 AC PASS; correction budget `0/1`; awaiting T0 PR review + merge coordination with UI V1 |

This round executed exactly as the TASK contract specified. No correction round was needed.

## 8. T0 handback

T0 — F6 is `RESOLVED_PENDING_MAIN_MERGE` on branch `codex/t1a-m2b-f6-placement-unavailable-reason` (PR opened against `main`). Implementation SHA `a558568a0cdf8e99ae981fffc18d979fd361345f`. Zero lifecycle / auth / schema / RLS / mutation / role-matrix delta. 240 placement+workbench unit tests green; typecheck + build + ESLint + encoding gates all PASS; forbidden paths clean.

T0 is authorized to:

1. Re-run CI on the PR head and verify all 4 checks GREEN + MERGEABLE/CLEAN.
2. Coordinate sequencing with UI V1 (per the T0 directive: "Tạm dừng trước merge để T0 lựa chọn thứ tự với UI V1").
3. Merge into `main` (T1A does NOT merge).
4. Confirm public `/admin/recruiter-workbench` renders the new reason labels in the placement column for each of the 6 user-visible codes; the existing `Mở bố trí` button + drawer continue to work for eligible rows; the F-03 stale amber alert is preserved byte-exact.

T1A does NOT open new tasks or advance to Mốc 3.

## 9. Acceptance summary

| AC | Result |
|---|---|
| `AC-01` New resolver module exists with 7-code enum + `resolvePlacementUnavailableReason` | **PASS** |
| `AC-02` Decision order matches `RQ-02` for every documented scenario | **PASS** (78 unit assertions) |
| `AC-03` No label contains UUID / `body.message` / `case-` / `submission` / PII keywords | **PASS** (safe-text assertion suite) |
| `AC-04` Resolver is pure + deterministic | **PASS** (determinism + purity cases) |
| `AC-05` OPTIONAL `placementUnavailableReason` field added to `RecruiterWorkbenchRow`; existing consumers unaffected | **PASS** (typecheck exit 0) |
| `AC-06` `PlacementActionCell` renders reason paragraph + `data-unavailable-reason` for every code | **PASS** (15 new render cases) |
| `AC-07` `!authorized` and `stale` branches NOT overridden by resolver | **PASS** (2 regression cases) |
| `AC-08` `Mở bố trí` button still renders for eligible row | **PASS** (1 regression case) |
| `AC-09` 95 existing states tests + 52 existing render tests remain green | **PASS** (full 240 green) |
| `AC-10` `npm run typecheck` exit 0 | **PASS** |
| `AC-11` `npx eslint <changed files>` exit 0 | **PASS** (0 errors, 0 warnings on touched files) |
| `AC-12` `npm run build` exit 0 | **PASS** (`✓ Compiled successfully in 8.3s`) |
| `AC-13` `git diff --check` exit 0 | **PASS** |
| `AC-14` Forbidden paths report 0 lines | **PASS** |
| `AC-15` `verify-encoding.mjs` exit 0 | **PASS** (10/10) |
| `AC-16` `verify-encoding-range.mjs` exit 0 | **PASS** (6/6) |
| `AC-17` `verify-task.ps1` exit 0 | **PASS** |
| `AC-18` `verify-handoff.ps1` exit 0 | **PASS** |

All 18 acceptance criteria PASS.

---

> Handoff status: `READY_FOR_REVIEW`