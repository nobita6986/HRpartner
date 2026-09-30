# HANDOFF — `hrp-p1-a0-5-job-opening-readiness`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a0-5-job-opening-readiness` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.3` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `a64c81e954325091a78ec9fb7f441a094df5dcfc` |
| Implementation SHA | `c3b7ec2536ada413e22ccbe3fa5d52e434065754` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Correction batches used | `1` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:**
  - `classifyJobOpening` route (`POST /api/admin/staffing/job-openings/[id]/classify`) — ADMIN/HR_MANAGER sets ServiceModel on a DRAFT JobOpening; idempotency-keyed; typed-error NULL fail-closed; row-locked atomic transition; two-connection race covered (last-committed-wins under lock).
  - `openJobOpening` route (`POST /api/admin/staffing/job-openings/[id]/open`) — ADMIN/HR_MANAGER + scoped HR_STAFF (active assignment) opens a classified DRAFT JobOpening; strict OPEN parent order requirement; deadline + validTo + capacity gates; typed-error envelope; HR_STAFF RLS UPDATE policy `hrp_a05_job_openings_staff_update` added (forward-only migration); privacy-safe fail-closed for revoked/unassigned HR_STAFF.
  - 12-step canonical recruitment lifecycle E2E (LOCK-09 / AC-E2E) proven via production services/routes only (no admin-DB business simulation).
  - Inline exact-ID zero-residue assertions ×3 in the integration suite (Checkpoint #1, #2, #3); FK-safe reverse cleanup in `afterAll`.
- **Not delivered:** None for the §A–§N scope. Production DB/migration deployment deferred to VPS release cutover (LOCK-10/11) — synthetic DB only.
- **Changed:**
  - `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (new forward-only RLS UPDATE policy for HR_STAFF on `job_openings`)
  - `tests/db/p1a05-job-opening-readiness.integration.test.ts` (full §J rewrite)
  - `app/admin/job-openings/[id]/page.tsx` (header comment narrowed to STRICTLY OPEN parent)
  - `app/api/admin/staffing/job-openings/[id]/open/route.ts` (header comment narrowed to STRICTLY OPEN parent)
  - `docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md` (canonical V2 format)
  - `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` (control field clarification)
- **Lane escalation:** None. CRITICAL lane + LIGHT audit unchanged from planning.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `git diff --name-only a64c81e9543... HEAD` returns 23 paths, all inside the implementation allowlist |
| API/route boundary | `PASS` | `/classify` + `/open` routes exercise auth-first → role-gate → idempotency → typed-error envelope; route unit tests (36/36); integration tests (28/28 ×3) |
| Auth/permission/data exposure | `PASS` | HR_STAFF scoped admission matrix (ACTIVE 200 / REVOKED → 404 NOT_FOUND privacy-safe / UNASSIGNED → 404 NOT_FOUND privacy-safe / DIRECTOR+PM → 403 PERMISSION_DENIED); no PII in error messages; `verify-encoding-range.mjs` clean |
| Migration/backfill/rollback | `PASS` | Forward-only migration `20260930090000_p1a05_hr_staff_job_openings_update_rls` is idempotent (`DROP POLICY IF EXISTS`); synthetic DB deploy PASS; production deploy deferred to VPS release cutover (LOCK-11) |
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
| `E-15` | `git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc..HEAD` | 23 paths, all inside the implementation allowlist; no path outside | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None — no `BLK-`, `LIM-`, or `DEV-` rows in this T1C continuation round. The consumed pre-audit batch 1/1 closed §A–§I (per the previous HANDOFF at commit `408e835c`) and the T1C continuation commits (`deb506cd` + `c3b7ec25`) closed §J/§K/§L/§M/§N with all gates PASS. | No |

## 5. Final status

- All §M Real Gates PASS against the synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair (see §2 above). The T1C continuation commit `deb506cd` landed the §J integration rewrite + the new forward-only RLS UPDATE migration; the docs-only fixup commit `c3b7ec25` corrected the cumulative surface count to 23 paths in the HANDOFF. Cumulative baseline..HEAD surface is 23 paths, all inside the implementation allowlist.
- `git status --short` is empty (working tree clean); `git diff --check` is clean; encoding range scan is clean (23/23); `verify-task.ps1` is `DRAFT-VALID`. `Implementation SHA: c3b7ec2536ada413e22ccbe3fa5d52e434065754` pins the freeze. Source/test/migration tree is clean after this SHA; no semantic commits exist after it.
- `Frozen delivery: YES`; `Canonical gates: PASS`; `Audit eligibility: ELIGIBLE`; `Status: READY_FOR_AUDIT`; `Next gate: TIER3_LIGHT_AUDIT`. Tier 3 LIGHT audit can now be requested at `docs/tasks/hrp-p1-a0-5-job-opening-readiness/AUDIT.md` against this frozen Implementation SHA.

> Handoff status: READY_FOR_AUDIT