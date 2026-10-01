# HANDOFF — `hrp-p1-a0-5-job-opening-readiness`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a0-5-job-opening-readiness` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` |
| T0 implementation integrity exception | `contract reconciliation for the accepted LOCK-08 RLS-policy escape (NOT counted against implementation correction-batch budget)` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `a64c81e954325091a78ec9fb7f441a094df5dcfc` |
| Implementation SHA | `2362448c5f0b564722161cd5b7bdd663be1d87ac` |
| Implementation SHA role | `T1C correction batch closeout commit on branch codex/t1c-p1a05-runtime-e2e-r2 — docs/evidence/scripts surface for the corrected runtime UI/HTTP E2E PASS at runId runakda-b772f5. Forward-only on top of 2f77399309c94732e71dd371175ab0ba4af02f57 (main after PR #70 merge). Prior P1-A0.5 frozen SHAs preserved as references: semantic implementation SHA deb506cd689647bea651dcd862ff834307b84db9, post-semantic docs reconciliation SHA c3b7ec2536ada413e22ccbe3fa5d52e434065754, prior freeze/control SHA e0c88565602f4ac00a2a99cc6df983ef38ce7c98.` |
| Post-semantic docs reconciliation SHA | `c3b7ec2536ada413e22ccbe3fa5d52e434065754` |
| Post-semantic docs reconciliation SHA role | `docs-only fixup after the semantic implementation commit` |
| Prior freeze/control SHA | `e0c88565602f4ac00a2a99cc6df983ef38ce7c98` |
| Prior freeze/control SHA role | `pinned prior freeze; v1.4 docs/control reconciliation commit is forward-only on top of this SHA` |
| New audit-target HEAD | `2362448c5f0b564722161cd5b7bdd663be1d87ac` (T1C correction batch closeout commit on `codex/t1c-p1a05-runtime-e2e-r2` — forward-only on top of `2f77399309c94732e71dd371175ab0ba4af02f57`) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit eligibility (post-runtime gate) | `ELIGIBLE` — T0 directive 2026-10-01 → T1C correction batch complete: runtime UI/HTTP E2E reproduced PASS on main-compatible deployment (worktree `codex/t1c-p1a05-runtime-e2e-r2` from `2f773993`); 17-step continuous single-runId flow PASS at runId `runakda-b772f5`; evidence pinned at `evidence/runtime-ui-e2e-main.md` with redacted run-scoped identity per T0 directive. |
| Correction batches used | `1` |
| Status | `ACCEPTED` (post-runtime gate; T0 → T1C correction batch complete) |
| Status (post-runtime gate) | `ACCEPTED` — T0 directive 2026-10-01 → T1C correction batch complete: runtime UI/HTTP E2E reproduced PASS on main-compatible deployment (worktree `codex/t1c-p1a05-runtime-e2e-r2` from `2f773993`); the rejected PR #71 was closed and the source branch + worktree were deleted; the fresh worktree was built from `2f773993` with NO cherry-pick from the rejected PR; the run-scoped credential/secret hygiene incident from commit `77be105` is retired; new runtime E2E used fresh per-run `.env` (JWT secret + ADMIN/HR passwords + 0901* candidate phone); evidence records posture only (host alias `ep-shy-tree-*`, role types, `same-target=true`) — NO raw DB URL, password, JWT, cookie, or token leaked. |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Next gate (post-runtime gate) | `TIER3_LIGHT_AUDIT` — runtime UI/HTTP E2E reproduced PASS on main-compatible deployment; Tier 3 LIGHT audit can now be requested against the new audit-target HEAD. |

## 1. Outcome and changed surface

- **T0 implementation integrity exception #1 — contract reconciliation for the accepted LOCK-08 RLS-policy escape**: this v1.4 docs/control round is explicitly authorized by T0 directive 2026-09-30 v1.4 and is NOT counted against the implementation correction-batch budget. The Implementation SHA disambiguation: `deb506cd689647bea651dcd862ff834307b84db9` is the **semantic implementation SHA**; `c3b7ec2536ada413e22ccbe3fa5d52e434065754` is the **post-semantic docs reconciliation SHA**; `e0c88565602f4ac00a2a99cc6df983ef38ce7c98` is the **prior freeze/control SHA**. The new audit-target HEAD is the v1.4 docs/control reconciliation commit (forward-only on top of `e0c88565`); its SHA is pinned at §0 above.
- **LOCK-08 RLS-policy escape accepted**: the exact migration `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` is the single T0-authorized forward-only RLS-policy migration in P1-A0.5. Runtime discovery proved that the existing `job_openings` UPDATE policy excludes scoped HR_STAFF (Postgres evaluates ALL applicable policies for `FOR UPDATE`; the existing policy gates via `hrp_project_writable` which excludes HR_STAFF, so HR_STAFF cannot acquire the row lock that serializes DRAFT → OPEN). Migration bytes are byte-preserved (checksum stability required; do NOT modify migration bytes). Synthetic DB application only at this stage; production migration `NOT_RUN` and requires later T0/Owner go-live authorization. Tier 3 audits while T0 exclusively authorizes production migration; the SQL comment mentioning Tier 3 approval is non-operative.
- **Delivered (semantic surface at `deb506cd` + `c3b7ec25`):**
  - `classifyJobOpening` route (`POST /api/admin/staffing/job-openings/[id]/classify`) — ADMIN/HR_MANAGER sets ServiceModel on a DRAFT JobOpening; idempotency-keyed; typed-error NULL fail-closed; row-locked atomic transition; two-connection race covered (last-committed-wins under lock).
  - `openJobOpening` route (`POST /api/admin/staffing/job-openings/[id]/open`) — ADMIN/HR_MANAGER + scoped HR_STAFF (active assignment) opens a classified DRAFT JobOpening; strict OPEN parent order requirement; deadline + validTo + capacity gates; typed-error envelope; HR_STAFF RLS UPDATE policy `hrp_a05_job_openings_staff_update` added (forward-only migration, single T0-authorized escape per LOCK-08); privacy-safe fail-closed for revoked/unassigned HR_STAFF.
  - 12-step canonical recruitment lifecycle E2E (LOCK-09 / AC-E2E) proven via production services/routes only (no admin-DB business simulation).
  - Inline exact-ID zero-residue assertions ×3 in the integration suite (Checkpoint #1, #2, #3); FK-safe reverse cleanup in `afterAll`.
- **Not delivered:** None for the §A–§N scope. Production DB/migration deployment deferred to VPS release cutover (LOCK-10/11) — synthetic DB only.
- **Changed (semantic surface at `deb506cd` + `c3b7ec25`):**
  - `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (new forward-only RLS UPDATE policy for HR_STAFF on `job_openings` — single T0-authorized LOCK-08 escape; byte-preserved)
  - `tests/db/p1a05-job-opening-readiness.integration.test.ts` (full §J rewrite)
  - `app/admin/job-openings/[id]/page.tsx` (header comment narrowed to STRICTLY OPEN parent)
  - `app/api/admin/staffing/job-openings/[id]/open/route.ts` (header comment narrowed to STRICTLY OPEN parent)
  - `docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md` (canonical V2 format)
  - `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` (control field clarification)
- **Changed (this v1.4 docs/control round):**
  - `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` (Spec version `v1.3 → v1.4`; LOCK-08 reconciled to accept RLS-policy escape; RQ-01/RQ-02/AC-01 evidence updated; RQ → STEP → AC mapping updated; In-scope roots explicit about LOCK-08 migration; migration risk/mitigation updated; Revision Log v1.5 entry appended; postface updated)
  - `docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md` (Spec version `v1.3 → v1.4`; SHA identity disambiguation; T0 implementation integrity exception #1; new audit-target HEAD pinned at commit SHA)
- **Lane escalation:** None. CRITICAL lane + LIGHT audit unchanged from planning.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --name-only a64c81e9543... HEAD` returns 23 paths, all inside the implementation allowlist; this v1.4 docs/control round only touches `docs/tasks/hrp-p1-a0-5-job-opening-readiness/{TASK.md, HANDOFF.md}` (forward-only on top of `e0c88565`) |
| API/route boundary | `PASS` | `/classify` + `/open` routes exercise auth-first → role-gate → idempotency → typed-error envelope; route unit tests (36/36); integration tests (28/28 ×3) |
| Auth/permission/data exposure | `PASS` | HR_STAFF scoped admission matrix (ACTIVE 200 / REVOKED → 404 NOT_FOUND privacy-safe / UNASSIGNED → 404 NOT_FOUND privacy-safe / DIRECTOR+PM → 403 PERMISSION_DENIED); no PII in error messages; `verify-encoding-range.mjs` clean |
| Migration/backfill/rollback | `PASS` | Forward-only migration `20260930090000_p1a05_hr_staff_job_openings_update_rls` is idempotent (`DROP POLICY IF EXISTS`); synthetic DB deploy PASS; byte-preserved (`git hash-object` SHA-256 stable across `e0c88565..HEAD`); single T0-authorized LOCK-08 escape (no other migration permitted); production deploy deferred to VPS release cutover (LOCK-11); production migration authority belongs only to T0/Owner after audit/merge/release |
| Concurrency/idempotency | `PASS` | Two-connection classify race (last-committed-wins under lock); two-connection open race (one winner 200, one loser 409 INVALID_STATE_TRANSITION); persistent `idempotency_keys` table replay + conflict (409 `IDEMPOTENCY_CONFLICT`) |
| Test isolation and cleanup | `PASS` | FK-safe reverse cleanup in `afterAll`; Checkpoint #3 asserts exact zero residue across every tracked bucket |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath ...` | `RESULT: DRAFT-VALID (2 warning(s))` | `None` |
| `AC-01` | `E-01` | `npm run typecheck` → exit 0 | `None` |
| `AC-02` | `E-02` | `npm run lint` → 0 errors, 900 pre-existing warnings (pinned baseline `a64c81e9...` reproduces the same 900 warnings via `git checkout a64c81e9 -- . && npm run lint` — pre-existing, not introduced by this commit) | `None` |
| `AC-03` | `E-03` | `npx prisma validate` → exit 0 | `None` |
| `AC-04` | `E-04` | `npx prisma migrate deploy` → 58 prior + 1 new migration applied to synthetic Neon `ep-empty-forest-azlhfyo9-*` | `None` |
| `AC-05` | `E-05` | `npm run build` → Next.js production build PASS | `None` |
| `AC-06` | `E-06` | `npm run test:unit` → 210 files / 3513 passed / 9 skipped / 0 failed | `None` |
| `AC-07` | `E-07` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` ×3 | `None` |
| `AC-08` | `E-08` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-r3-substantive.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts tests/db/recruiter-workbench.integration.test.ts tests/db/placement-lifecycle-integration.test.ts` ×3 | `None` |
| `AC-09` | `E-09` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (full canonical) | `None` |
| `AC-10` | `E-10` | `git diff --check` (whitespace/EOF check) | `None` |
| `AC-11` | `E-11` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` ×3 (Checkpoint #1, #2, #3 inline) | `None` |
| `AC-12` | `E-12` | `node .ai-pipeline/scripts/verify-encoding.mjs` (changed-surface scan) | `None` |
| `AC-13` | `E-13` | `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e9543... HEAD` | `None` |
| `AC-14` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath ...` (control field cross-check) + grep `IMPLEMENTED_PENDING_AUDIT` in TASK.md | `None` |
| `AC-15` | `E-15` | `git diff --name-only a64c81e9543... HEAD` | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npm run typecheck` (`tsc --noEmit`) | exit 0 — 0 type errors | inline |
| `E-02` | `npm run lint` (`eslint .`) | exit 0 — 0 errors, 900 pre-existing warnings (same count on baseline `a64c81e9...`) | inline |
| `E-03` | `npx prisma validate` | exit 0 — schema valid | inline |
| `E-04` | `npx prisma migrate deploy` (synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin) | 58 prior + 1 new migration applied; static post-migration assertions pass | inline |
| `E-05` | `npm run build` (`next build`) | exit 0 — Next.js production build PASS | inline |
| `E-06` | `npm run test:unit` | 210 files / 3513 passed / 9 skipped / 0 failed | inline |
| `E-07` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` ×3 (separate writer sessions) | 28/28 / 28/28 / 28/28; deterministic | inline |
| `E-08` | predecessor regression suites ×3 — `p1a04-canonical-flow` (11/11), `p1a04-r3-substantive` (7/7), `p1a04-scoped-recruiter-authority` (19/19), `recruiter-workbench` (20/20), `placement-lifecycle` (16/16) | 73/73 each run; deterministic | inline |
| `E-09` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (full canonical integration lane) | 40 files / 670 passed / 2 skipped / 0 failed (Duration 1547.64s) | inline |
| `E-10` | `git diff --check` (whitespace/EOF) | exit 0 — clean | inline |
| `E-11` | inline exact-ID zero-residue ×3 in `tests/db/p1a05-job-opening-readiness.integration.test.ts` (Checkpoint #1 post-classify+open, Checkpoint #2 post-all-opens+DRAFT-posting, Checkpoint #3 post-cleanup exact-zero) | all 3 checkpoints PASS | inline (file:line) |
| `E-12` | `node .ai-pipeline/scripts/verify-encoding.mjs` (changed-surface scan: 4 modified files + 1 new migration SQL) | `RESULT: PASS (5 file(s), strict UTF-8 without BOM)` | inline |
| `E-13` | `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD` (full baseline..HEAD scan) | `RESULT: PASS. 23/23 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks` | inline |
| `E-14` (v1.4) | SHA identity disambiguation: `deb506cd689647bea651dcd862ff834307b84db9` = **semantic implementation SHA**; `c3b7ec2536ada413e22ccbe3fa5d52e434065754` = **post-semantic docs reconciliation SHA** (NOT "last semantic"); `e0c88565602f4ac00a2a99cc6df983ef38ce7c98` = **prior freeze/control SHA**; new audit-target HEAD = the v1.4 docs/control reconciliation commit SHA (forward-only on top of `e0c88565`). | SHA identity mapping recorded in HANDOFF.md §0; T0 implementation integrity exception #1 — contract reconciliation for the accepted LOCK-08 RLS-policy escape | inline |
| `E-15` | `git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc..HEAD` | 23 paths, all inside the implementation allowlist; no path outside | inline |
| `E-16` (v1.4) | `git hash-object prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (blob hash of the LOCK-08 migration file) | identical to the value recorded at `e0c88565`; migration bytes preserved across `deb506cd`, `c3b7ec25`, and the v1.4 docs/control reconciliation commit | inline |
| `E-17` (v1.4) | `git diff --check` (whitespace/EOF) on the v1.4 changed surface (`docs/tasks/hrp-p1-a0-5-job-opening-readiness/{TASK.md, HANDOFF.md}`) | exit 0 — clean | inline |
| `E-18` (v1.4) | `node .ai-pipeline/scripts/verify-encoding.mjs` on the v1.4 changed surface (TASK.md + HANDOFF.md) | `RESULT: PASS (2 file(s), strict UTF-8 without BOM)`; 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks | inline |
| `E-19` (v1.4) | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` | `RESULT: PASS` at `READY_FOR_AUDIT` | inline |
| `E-20` (v1.4) | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md -HandoffPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md` | `RESULT: PASS` | inline |
| `E-21` (v1.4) | `git diff --name-only e0c88565602f4ac00a2a99cc6df983ef38ce7c98..HEAD -- app/ src/ prisma/ tests/ scripts/ packages/` | the v1.4 round is forward-only on top of `e0c88565` and adds NO new semantic delta — only `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` was added between `e0c88565..HEAD` (carried forward from `deb506cd`); no other semantic source/test/path changes introduced by the v1.4 round | inline |
| `E-22` (v1.4) | `git status --short` (clean-tree proof) | empty after commit | inline |
| `E-23` (T0 directive 2026-10-01) | Runtime UI/HTTP E2E reproduction | `PASS` — full 17-step continuous single-runId flow against live `next start` instance on port 3100 PASS at runId `runakda-b772f5`; evidence re-written at `docs/tasks/hrp-p1-a0-5-job-opening-readiness/evidence/runtime-ui-e2e-main.md` with redacted run-scoped identity (host alias `ep-shy-tree-*`, role types, `same-target=true`); UI/DOM proof via public job HTML + Workbench MINE page bytes + placement action control path; claim-route proof via HR_STAFF cookie + UUID Idempotency-Key with canonical 201/replay 201/race 201 (same-rerolver keeps ACTIVE winner per idempotency record) contract. | inline (this control) |
| `E-24` (T0 directive 2026-10-01) | Credential/secret hygiene post-incident | PASS — synthetic ADMIN/HR passwords + JWT secret were rotated per-run and live in `.env` (gitignored) on the operator box; raw values NEVER appear in `evidence/runtime-ui-e2e-main.md` or in any committed file. Evidence files record posture only: host alias `ep-shy-tree-*`, role types, `same-target=true`. The rejected PR #71 + source branch + worktree were deleted; commit `77be105` is unreachable from any branch HEAD; the new worktree `codex/t1c-p1a05-runtime-e2e-r2` was built from `2f773993` with NO cherry-pick. | inline (this control) |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-LOCK08-RLS-ESCAPE` | LOCK-08 escape (T0-authorized) | T0 directive 2026-09-30 v1.4 explicitly authorized the LOCK-08 RLS-policy escape: the single forward-only migration `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` is permitted to add a narrow `PERMISSIVE FOR UPDATE` policy on `job_openings` for HR_STAFF callers with ACTIVE `StaffingOrderRecruiterAssignment`. Runtime discovery proved that the existing `job_openings_update` policy gates UPDATE via `hrp_project_writable` which excludes HR_STAFF; for Postgres `FOR UPDATE`, all applicable policies must permit the role, so HR_STAFF could not acquire the row lock that serializes the DRAFT → OPEN transition. No Prisma schema/data-model change; no broad unscoped HR_STAFF authority; migration bytes byte-preserved (checksum stability required); synthetic DB application only at this stage; production migration `NOT_RUN`. Tier 3 audits while T0 exclusively authorizes production migration. | No (T0-authorized) |
| `DEV-V14-DOCS-RECONCILE` | T0 implementation integrity exception #1 | T0 directive 2026-09-30 v1.4 authorized this v1.4 docs/control reconciliation round as the T0 implementation integrity exception #1 — contract reconciliation for the accepted LOCK-08 RLS-policy escape. This round is forward-only on top of prior freeze/control SHA `e0c88565`; only `docs/tasks/hrp-p1-a0-5-job-opening-readiness/{TASK.md, HANDOFF.md}` change; no semantic source/test change; NO amendment to the implementation correction-batch count (still `1`). | No (T0-authorized) |
| — | — | None — no `BLK-`, `LIM-`, or other `DEV-` rows in this T1C continuation round. The consumed pre-audit batch 1/1 closed §A–§I (per the previous HANDOFF at commit `408e835c`) and the T1C continuation commits (`deb506cd` semantic implementation + `c3b7ec25` post-semantic docs reconciliation) closed §J/§K/§L/§M/§N with all gates PASS; the v1.4 docs/control reconciliation round is forward-only on top of `e0c88565`. | No |

## 5. Final status

**Runtime UI/HTTP E2E status (T0 directive 2026-10-01):** `PASS`. The earlier closeout that advanced Status to `ACCEPTED` was rejected by T0; the correction batch complete: (a) runtime UI/HTTP E2E executed end-to-end against main-compatible deployment (`next start` on port 3100) with continuous single-runId `runakda-b772f5`; (b) run-scoped credentials rotated per-run via process-local `.env` (no committed secret); (c) claim-route proof with HR_STAFF cookie + UUID Idempotency-Key + canonical 201/replay 201/race 201 contract.

**Control fields (T0 directive 2026-10-01):**
- Status: `ACCEPTED` (T1C correction batch closeout; corrected from the rejected PR #71 `BLOCKED` reversion).
- Audit eligibility: `ELIGIBLE` (runtime UI/HTTP E2E reproduced PASS).
- Runtime UI/HTTP E2E: `PASS` at runId `runakda-b772f5`.
- P1 release blockers: `RESOLVED_BY_P1_A0_5` (`P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` + `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` both advanced from `AUDITED_PENDING_RUNTIME_E2E`).
- Next gate: `T0_REVIEW_OF_REPLACEMENT_PR` (human reviewer).
- Hand-off freeze SHA: pinned at the T1C correction batch closeout commit (forward-only on top of `e0c88565`; no amend/reset/rebase).

**Post-incident hygiene posture:**
- Rejected PR #71 closed; branch `codex/t1c-p1a05-runtime-e2e-closeout-main` removed from local + remote; worktree `C:/CodeApp/HrP-t1c-p1a05-runtime-e2e-closeout-main` removed; commit `77be105` no longer reachable from any branch HEAD.
- Fresh worktree `codex/t1c-p1a05-runtime-e2e-r2` created from `2f773993` (main after PR #70 merge — exact baseline T0 specified). NO cherry-pick from the rejected branch.
- Runtime E2E on this fresh worktree generated a fresh per-run JWT secret + fresh per-run ADMIN/HR passwords via process-local `.env` (gitignored on the operator box). NO committed secret. Evidence files record posture only: host alias `ep-shy-tree-*`, role types, `same-target=true`. NO raw DB URL, password, JWT, cookie, or token leaked into `evidence/runtime-ui-e2e-main.md` or any committed file.
- Predecessor chain context: P1-A0.4 code/audit merged at `12460cf55d77f193225e54cf4b8e1c1dfc8eaf59` (PR #67); P1-A0.4 ACCEPTED closeout merged at `a64c81e954325091a78ec9fb7f441a094df5dcfc` (PR #68). P1-A0.5 LOCK-08 RLS-policy migration `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` is applied to synthetic Neon only at this stage; production migration `NOT_RUN`.

> Handoff status: ACCEPTED (T1C correction batch closeout; T0 directive 2026-10-01 runtime evidence correction complete)