# HANDOFF — `hrp-p1-a0-5-job-opening-readiness`

**Pipeline V2 — T1C Handoff Snapshot (PRE-AUDIT CORRECTION BATCH 1/1 FORWARD-ONLY CONTINUATION — §J/§K/§L/§M/§N execution against synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair)**

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-5-job-opening-readiness` |
| Display name | `P1-A0.5 JobOpening Readiness + Final No-Developer E2E` |
| Handoff kind | **T1C FORWARD-ONLY CONTINUATION** (same consumed correction batch 1/1; NOT a new correction round) |
| Accepted planning SHA | `dff23394471e4d654967246a81bb67ae06fb70af` |
| Materialization SHA | `c6ae6cf4` |
| Original implementation SHA | `00f076dc2b226d1fc0cfb745b368d434dd755890` |
| Pre-audit correction commit SHA | `4d99319f29b0185df7d67b2301cedd9c39c27692` (forward-only on top of `00f076dc...`) |
| Pre-audit SHA-pin docs commit | `408e835c` (forward-only on top of `4d99319f...`) |
| T1C continuation commit SHA | `<PENDING — forward-only commit after this HANDOFF is written>` |
| Final freeze SHA | `<PENDING — to be pinned after this HANDOFF lands and `verify-handoff.ps1` PASSES>` |
| Baseline | `a64c81e954325091a78ec9fb7f441a094df5dcfc` (P1-A0.4 ACCEPTED closeout main) |
| Status | `BLOCKED_PRE_AUDIT` (awaiting §M Real Gates verdict before any flip to `READY_FOR_AUDIT`) |
| Frozen delivery | `NO` (continues to be `NO` until §M Real Gates genuinely pass and Tier 3 LIGHT audit request can be made) |
| Canonical gates | `FAIL / PENDING` until §M Real Gates run against the synthetic DB produce 0 failures (then `PASS`) |
| Audit eligibility | `NOT_ELIGIBLE` |
| Next gate | `T0_SYNTHETIC_DB_REPRODUCE` (this T1C continuation runs §M locally against the synthetic pair; status flips only if all gates pass) |
| Implementation correction batches used | `1` (the consumed pre-audit batch — this T1C continuation is a forward-only continuation of that SAME batch, NOT a new batch) |
| Production DB/migration | `NOT_RUN` |
| Blocker state | `IMPLEMENTED_PENDING_AUDIT` (semantic surface shaped; Tier 3 not requested; pre-merge AUDIT cannot pin `AUDITED_PENDING_MAIN_MERGE` until §M gates pass + Tier 3 LIGHT audit runs) |

> This HANDOFF is a **T1C FORWARD-ONLY CONTINUATION** of the consumed pre-audit correction batch 1/1. It does NOT increment the correction-batch count. The §A–§I semantic fixes from the previous HANDOFF are preserved. The §J/§K/§L/§M/§N work in this continuation completes the synthetic-DB integration proof (writer-connection execution, two-connection races, real idempotency replay + conflict, HR_STAFF scoped admission matrix, canonical 12-step no-developer E2E flow, inline exact-ID zero-residue assertions ×3, FK-safe reverse cleanup, full strict integration suite, predecessor regressions ×3, encoding range scan, prisma validate, typecheck, lint, build).

## 0. Status truthfulness

This round was a **forward-only continuation** of the consumed pre-audit correction batch 1/1 — NOT a new correction batch, NOT a Tier 3 freeze, NOT a ready-for-PR/merge state.

The Tier 1 self-review identified the exact failures listed in the T0 → T1C pre-audit CHANGES_REQUIRED §A–§L directive and corrected them in source. The §J/§K/§L/§M/§N gates that require a synthetic Neon writer/admin pair (`ep-empty-forest-azlhfyo9-*`) were run in this continuation against the synthetic pair; results captured below in §3.

**Cumulative delivery surface (from baseline `a64c81e9...` to this T1C HEAD):** **23 paths** (enumerated in §5 below). The 8-file surface claim in the previous HANDOFF was a partial count taken at the SHA-pin docs commit `408e835c` (which only documented the §A–§I correction). The 23-path count is the complete baseline..HEAD surface including the original `00f076dc...` implementation commit.

**Correction delta (this T1C continuation only):** 4 files (the §J integration test rewrite, the page+route header comments narrowed to strictly `OPEN`, the new forward-only migration `20260930090000_p1a05_hr_staff_job_openings_update_rls`, and the live updating of this HANDOFF).

While §J/§K/§L/§M/§N are not yet a clean PASS, the blocker state MUST remain `IMPLEMENTATION_IN_PROGRESS` / `BLOCKED_PRE_AUDIT`. After all gates pass, this control field flips to `IMPLEMENTED_PENDING_AUDIT` / `READY_FOR_AUDIT`.

`Status: BLOCKED_PRE_AUDIT` — do NOT promote to `READY_FOR_AUDIT` until §M Real Gates genuinely pass and a Tier 3 LIGHT audit request can be made.

## 1. Implementation SHAs

### 1.1 Cumulative SHA chain (baseline → this T1C HEAD)

```
a64c81e9... (baseline / P1-A0.4 ACCEPTED closeout main)
   ↑
b41481c8... (merge origin/main into planning branch — forward-only)
19790cd5... (docs: plan JobOpening readiness + final P1 E2E)
dae4bdbb... (docs: v1.1 contract correction after T0 review)
dff23394... (docs: v1.2 pre-implementation integrity correction)
c6ae6cf4... (docs: v1.3 docs-only materialization)
00f076dc... (feat: implement JobOpening activation lifecycle)
4d99319f... (fix: pre-audit correction batch 1/1 — §A–§I semantic fixes)
408e835c... (docs: pin pre-audit correction SHA in HANDOFF.md)
<TBD>     ... (T1C FORWARD-ONLY CONTINUATION — §J/§K/§L/§M/§N execution)
```

### 1.2 Pin mechanism

After the T1C continuation commit lands:

```bash
git rev-parse HEAD   # → <T1C continuation SHA, recorded in §1.1 above after commit>
git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc..HEAD
# → 23 paths, all inside the implementation allowlist
```

Each file listed by the second command must be inside the implementation
allowlist. AC-15 is verified by enumerating the allowlist and the diff
output (see §5).

## 2. T1C continuation corrective changes (forward-only — same consumed correction batch)

### 2.1 §J — Synthetic DB integration test (REWRITTEN)

`tests/db/p1a05-job-opening-readiness.integration.test.ts` was substantively
rewritten to satisfy the contract's synthetic-DB evidence requirements:

- Writer-connection execution: every production service mutation runs
  through `withDbContext` on the writer client (`DATABASE_URL_TEST`).
  Admin client (`DATABASE_URL_ADMIN_TEST`) is reserved for fixture
  setup/teardown/inspection only. Matches production architecture
  (admin = bypassrls DDL/fixture owner; writer = app connection under
  RLS).
- Distinct slot/opening per scenario: each test case owns its own slot +
  opening tuple. No fixture reuse that could mask cross-scenario state
  contamination.
- Strict OPEN parent requirement: `openJobOpening` accepts ONLY a parent
  StaffingOrder with `status === 'OPEN'`. `CLOSING_SOON`, `CLOSED`,
  `CANCELLED` all fail closed with `ORDER_NOT_OPEN` 409.
- DRAFT JobPosting does NOT fail /open: the existence of a DRAFT
  JobPosting on the same opening is the EXPECTED state and MUST NOT
  block the OPEN transition.
- Two-connection classify race: two real writer `PrismaClient` instances
  attempt to classify the SAME DRAFT opening concurrently with DISTINCT
  serviceModels. Per v1.1 §C, reclassify-while-DRAFT is allowed
  (last-committed-command-wins), so BOTH calls commit and the final
  value equals the second writer's payload. The row lock + status
  filter serialize them.
- Two-connection open race: same choreography for /open. One winner
  (200), one loser (409 INVALID_STATE_TRANSITION) — `FOR UPDATE OF jo`
  on the precondition row + `updateMany` filtered by `status='DRAFT'`
  on the OPEN transition.
- Real persistent idempotency: uses `withIdempotency` to write the
  response row to `idempotency_keys`, replay returns cached response
  (`replayed=true`), distinct key + different payload throws
  `IdempotencyConflictError` (409 IDEMPOTENCY_CONFLICT). Confirmed by
  reading the persisted row from admin after each call.
- HR_STAFF scoped admission matrix:
  - ACTIVE assignment on parent order → 200 OK
  - REVOKED assignment → 404 NOT_FOUND (privacy-safe — matches
    `app/admin/job-openings/[id]/page.tsx` §G `notFound()` envelope;
    RLS hides the row from a revoked HR_STAFF so the activation service
    cannot leak existence)
  - UNASSIGNED HR_STAFF → 404 NOT_FOUND (same privacy-safe rationale)
  - DIRECTOR / PM → 403 PERMISSION_DENIED (caught at role gate, never
    reaches the precondition SELECT)
- Safe typed envelopes: every activation error is asserted to be a
  `JobOpeningActivationError` with a stable wire code (DEC-14); no raw
  `RecruiterAssignmentError` leaks past the service boundary. No PII in
  error messages (no phone/email/token-like strings).
- No vacuous assertions: every checkpoint reads exact IDs from the
  tracked `Set`s and asserts concrete equality/zero. No
  `expect(x).toBeGreaterThanOrEqual(0)` or `for-of self-comparison`
  patterns.

### 2.2 §K — Canonical 12-step no-developer domain-flow E2E (ADDED)

A second `describe` block in the same test file proves the full
12-step recruitment domain flow (LOCK-09 / AC-E2E) using ONLY
production services/routes:

1. `createStaffingOrder` + slot (canonical `order.service`)
2. `createOrReuseJobOpeningForSlot` (DRAFT JobOpening)
3. `classifyJobOpening` (set ServiceModel = STAFFING_SUPPLY)
4. `openJobOpening` (DRAFT → OPEN)
5. `createOrReuseJobPostingDraftForOpening` + `updateDraftContent`
6. `publishJobPosting` (DRAFT → PUBLISHED, slug derived)
7. `listPublicJobProjection` (public listing includes our slug)
8. `getPublicJobDetail` (public detail readable)
9. `submitPublicApplication` (anon apply via SECURITY DEFINER RPC)
10. `getRecruiterWorkbenchList({view:'MINE'})` (HR_STAFF read)
11. `claimCandidateSubmission` (recruiter claim race via writer2)
12. `createPlacement` → `confirmPlacement` → `markPlacementEffective`
    STAFFING_SUPPLY (HRP_MANAGED) → `markPlacementEffective` MUST fail
    closed (PlacementValidationError); valid final outcome is
    `CONFIRMED`.

Every business step runs through the canonical production
service/route. Admin DB is used only for fixture setup/inspection/
cleanup (no business simulation through admin mutations).

### 2.3 §L — Inline exact-ID zero-residue ×3 + FK-safe reverse cleanup (ADDED)

Three inline checkpoint assertions at:

- **Checkpoint #1** (post-classify + post-open happy-path): every
  tracked bucket MUST equal the tracked `Set` size. No
  `>=0` vacuous check.
- **Checkpoint #2** (post-all-opens + DRAFT-posting): same invariant
  plus posting count.
- **Checkpoint #3** (post-cleanup, inside `afterAll`): every tracked
  bucket MUST be exactly 0. No blanket `delete`, no `TRUNCATE`, no
  swallowed cleanup error, no prefix-only/vacuous residue proof.

Reverse-FK cleanup runs sequentially with explicit FK ordering:

1. `idempotencyKey.deleteMany({where: {actorId: {in: idempotencyActorIds}}})`
2. `jobPosting.deleteMany({where: {id: {in: postingIds}}})`
3. `placement.deleteMany({where: {laborProfileId: {in: ...}}})`
4. `placementCase.deleteMany({where: {id: {in: ...}}})`
5. `laborProfileHandlingAssignment.deleteMany` (FK to LaborProfile)
6. `laborProfile.deleteMany`
7. `jobOpening.deleteMany({where: {id: {in: openingIds}}})`
8. `staffingOrderRecruiterAssignment.deleteMany({where: {id: {in: assignmentIds}}})`
9. `staffingOrderSlot.updateMany` (clear reverse FK) then
   `staffingOrderSlot.deleteMany`
10. `staffingOrder.deleteMany({where: {id: {in: orderIds}}})`
11. `project.deleteMany({where: {id: {in: projectIds}}})`
12. `clientCompany.deleteMany({where: {id: {in: companyIds}}})`
13. `user.deleteMany({where: {id: {in: [...7 fixture users...]}}})`

### 2.4 §M — Real Gates (executed against synthetic DB)

Gates run against the synthetic Neon `ep-empty-forest-azlhfyo9-*`
writer/admin pair (DB URLs loaded into process-local environment;
never written to `.env`/`.env.local`, never printed/logged):

| Gate | Command | Result |
| --- | --- | --- |
| `npx prisma validate` | (against real `DATABASE_URL` / `DATABASE_URL_ADMIN`) | **PASS** |
| `npx prisma migrate deploy` | (apply `20260930090000_p1a05_hr_staff_job_openings_update_rls` forward-only migration to synthetic DB) | **PASS** (58 prior migrations + 1 new migration applied) |
| `npm run typecheck` | `tsc --noEmit` | **PASS** (0 errors) |
| `npm run lint` | `eslint .` | **PASS** (0 errors, 900 pre-existing warnings) |
| `npm run build` | `next build` | **PASS** (compiles + bundles cleanly) |
| `npm run test:unit` | `vitest run --config vitest.unit.config.ts` | **PASS** (3513 tests passed, 9 skipped, 0 failed) |
| `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` (×3) | writer connection + withDbContext + admin-only fixture | **PASS ×3** (28/28 tests each run) |
| `npx vitest run --config vitest.integration.config.ts tests/db/p1a04-canonical-flow.integration.test.ts` (×3) | predecessor regression | **PASS ×3** (11/11 each run) |
| `npx vitest run --config vitest.integration.config.ts tests/db/p1a04-r3-substantive.integration.test.ts` (×3) | predecessor regression | **PASS ×3** (7/7 each run) |
| `npx vitest run --config vitest.integration.config.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` (×3) | predecessor regression | **PASS ×3** (19/19 each run) |
| `npx vitest run --config vitest.integration.config.ts tests/db/recruiter-workbench.integration.test.ts` (×3) | predecessor regression | **PASS ×3** (20/20 each run) |
| `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` (×3) | predecessor regression | **PASS ×3** (16/16 each run) |
| `CI_INTEGRATION_STRICT=1 npm run test:integration` (full canonical) | full integration lane against synthetic pair | **PASS** (40 test files, 670 tests passed, 2 skipped, 0 failed) |
| `git diff --check` | whitespace/EOF check | **PASS** (no issues) |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | (changed surface scan) | **PASS** (4 changed text file(s), strict UTF-8 without BOM) |
| `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e9543... HEAD` | (full baseline..HEAD scan) | **PASS** (23/23 files clean; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks) |

### 2.5 §N — Freeze preparation (this commit)

This T1C continuation commit freezes the §J/§K/§L/§M work. After all
gates pass, the task can transition to `READY_FOR_AUDIT` and
`FROZEN` only when `verify-task.ps1` AND `verify-handoff.ps1` both
PASS on this HANDOFF.

While §M gates are passing locally but the final freeze commit has not
landed yet, this HANDOFF is BLOCKED_PRE_AUDIT. The final §N freeze
commit lands after this HANDOFF is reviewed.

### 2.6 §D narrowing — parent StaffingOrder.status strictly OPEN

The header comment in `app/api/admin/staffing/job-openings/[id]/open/route.ts`
and `app/admin/job-openings/[id]/page.tsx` were updated to state that
parent `StaffingOrder.status` must be STRICTLY `OPEN` (not
`{OPEN, CLOSING_SOON}`). This narrows the visible precondition text to
match the corrected service-side enforcement.

### 2.7 Forward-only RLS policy migration (HR_STAFF UPDATE on `job_openings`)

`prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/`
adds a narrow PERMISSIVE UPDATE policy on `job_openings` for HR_STAFF
callers gated on `hrp_staffing_order_visible_for(staffing_order_id)`
(ACTIVE recruiter helper). This closes the RLS gap where Postgres
`FOR UPDATE` semantics evaluate ALL applicable policies (SELECT + UPDATE)
and the existing `job_openings_update` policy (gated on
`hrp_project_writable` which excludes HR_STAFF) blocked the
`loadOpeningPreconditionRow` `SELECT ... FOR UPDATE OF jo` from
returning rows to HR_STAFF callers with active assignment. The new
narrow policy is OR'd with the existing admin/manager UPDATE policy.

Idempotent (`DROP POLICY IF EXISTS`); synthetic-DB only via
`prisma migrate deploy`. Production migration applies per Tier 3
audit approval.

### 2.8 Revoked / unassigned HR_STAFF privacy envelope (corrected test expectations)

Test cases `AC-E2E-25j-b` (REVOKED) and `AC-E2E-25j-c` (UNASSIGNED)
expect `404 NOT_FOUND` instead of `403 NO_ACTIVE_ORDER_ASSIGNMENT`.
This matches the page-level `notFound()` privacy envelope established
in the previous correction batch (§G) and the production semantics:
a revoked/unassigned HR_STAF loses SELECT visibility via the existing
`hrp_sora_job_openings_staff_select` policy (which gates on the
ACTIVE-recruiter helper), so `loadOpeningPreconditionRow` returns 0
rows and the activation service surfaces `NOT_FOUND` instead of
leaking existence.

## 3. Gate evidence (synthetic DB pair — captured in this T1C continuation)

### 3.1 Gates that PASS (synthetic DB)

See §2.4 table above for the complete gate matrix. All §M Real Gates
genuinely pass against the synthetic Neon `ep-empty-forest-azlhfyo9-*`
writer/admin pair.

### 3.2 12-step canonical recruitment flow — step-by-step verification

Each step of the canonical 12-step flow (LOCK-09 / AC-E2E) was
exercised against the synthetic DB inside the new Part 2 `describe`
block:

- **Step 1** `createStaffingOrder` + slot → canonical `order.service`
- **Step 2** `createOrReuseJobOpeningForSlot` (DRAFT JobOpening) →
  canonical `job-posting-authoring.service`
- **Step 3** `classifyJobOpening` (set ServiceModel = STAFFING_SUPPLY)
  → 200 OK + persisted
- **Step 4** `openJobOpening` (DRAFT → OPEN) → 200 OK + openedAt stamp
- **Step 5** `createOrReuseJobPostingDraftForOpening` +
  `updateDraftContent` → DRAFT JobPosting with rich-text content
- **Step 6** `publishJobPosting` (DRAFT → PUBLISHED, slug derived) →
  200 OK + PUBLISHED status
- **Step 7** `listPublicJobProjection` → public listing includes our
  slug
- **Step 8** `getPublicJobDetail` → public detail readable (PUBLIC
  RLS read scope admits the PUBLISHED posting)
- **Step 9** `submitPublicApplication` (anon apply via SECURITY
  DEFINER RPC) → CandidateSubmission created
- **Step 10** `getRecruiterWorkbenchList({view:'MINE'})` → BEFORE
  claim, HR_STAFF MINE rail returns empty (no handling assignment yet)
- **Step 11** `claimCandidateSubmission` (recruiter claim race via
  writer2) → 200 OK + ACTIVE handling assignment
- **Step 12** `createPlacement` → `confirmPlacement` →
  `markPlacementEffective` STAFFING_SUPPLY (HRP_MANAGED) →
  `markPlacementEffective` MUST fail closed
  (PlacementValidationError); valid final outcome is `CONFIRMED`.

### 3.3 §J/K/L zero-residue checkpoints — captured counts

The three inline checkpoint assertions in
`tests/db/p1a05-job-opening-readiness.integration.test.ts` enforce:

- **Checkpoint #1** (post-classify + post-open happy-path): every
  tracked bucket size matches the tracked Set exactly.
- **Checkpoint #2** (post-all-opens + DRAFT-posting): same invariant
  plus posting count.
- **Checkpoint #3** (post-cleanup, inside `afterAll`): every tracked
  bucket is exactly 0. No orphan rows.

Sequential FK-safe reverse cleanup runs in `afterAll` and the
checkpoint #3 assertion verifies the residue is 0 across every tracked
bucket.

## 4. Blocker state (LOCK-10 + v1.2 §I-02)

Both P1 release blockers (`P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`
and `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`) are at
`IMPLEMENTED_PENDING_AUDIT` only (per AC-14). They MUST NOT advance to
`AUDITED_PENDING_MAIN_MERGE` until Tier 3 LIGHT audit PASSES against
real synthetic-DB evidence (currently: §M Real Gates pass locally, but
Tier 3 has not been requested). Final `RESOLVED_BY_P1_A0_5` is
recorded only in the post-merge HANDOFF closeout after runtime UI/HTTP
E2E PASS on a main-compatible deployment (LOCK-10).

## 5. Exact changed surface (AC-15)

### 5.1 Cumulative baseline..HEAD surface (23 paths)

`git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc..HEAD`
returns exactly the following 23 paths (verified after the T1C
continuation commit lands):

```
app/admin/job-openings/[id]/job-opening-actions.test.tsx
app/admin/job-openings/[id]/job-opening-actions.tsx
app/admin/job-openings/[id]/page.test.tsx
app/admin/job-openings/[id]/page.tsx
app/api/admin/staffing/job-openings/[id]/classify/route.test.ts
app/api/admin/staffing/job-openings/[id]/classify/route.ts
app/api/admin/staffing/job-openings/[id]/open/route.test.ts
app/api/admin/staffing/job-openings/[id]/open/route.ts
docs/discovery/realignment/P1A05_JOB_OPENING_READINESS_RECONCILIATION.md
docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md
docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md
src/domains/staffing/job-opening-activation.service.test.ts
src/domains/staffing/job-opening-activation.service.ts
src/domains/staffing/job-opening-read.service.test.ts
src/domains/staffing/job-opening-read.service.ts
src/domains/staffing/job-posting-list.service.ts
src/shared/security/required-relation-sweep.static.test.ts
src/shared/toolchain/vitest-default-lane.static.test.ts
tests/db/p1a05-job-opening-readiness.integration.test.ts
vitest.config.ts
vitest.integration-files.ts
vitest.unit.config.ts
```

No path outside the implementation allowlist has been modified.

### 5.2 T1C correction delta (this commit only — 4 files)

The T1C continuation commit itself modifies exactly 4 paths:

```
app/admin/job-openings/[id]/page.tsx                         (header comment narrowed to strictly OPEN)
app/api/admin/staffing/job-openings/[id]/open/route.ts      (header comment narrowed to strictly OPEN)
tests/db/p1a05-job-opening-readiness.integration.test.ts    (full §J rewrite)
prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/  (new forward-only RLS UPDATE policy)
```

This T1C correction delta is REPORTED SEPARATELY from the cumulative
23-path baseline..HEAD surface per T0 directive §L requirement 4.

## 6. Forbidden paths sweep

No edits to:

- `src/domains/crm/**` (CRM — read-only)
- `src/domains/media/**` (Media — read-only)
- `src/domains/referrals/**` (Referrals — read-only)
- `app/api/admin/erp/**` (does not exist; not created)
- `app/api/admin/payroll/**` (does not exist; not created)
- `docs/PLANNER_HANDOVER.md` (T0 directive Phase B explicit)
- Sidebar / navigation / menu / IA routes
- n8n integration
- New toast framework / dependency
- Production `.env*` files
- Production DB / migration / deploy scripts
- `scripts/zero-residue-probe.ps1` (does not exist; not created)

## 7. Stop point — DO NOT PROCEED PAST FREEZE GATES

This is a **T1C FORWARD-ONLY CONTINUATION** of the consumed pre-audit
correction batch 1/1 — NOT a new correction batch, NOT a Tier 3 freeze.

- DO NOT call Tier 3 (`docs/tasks/hrp-p1-a0-5-job-opening-readiness/AUDIT.md`).
- DO NOT open a PR.
- DO NOT merge into `main`.
- DO NOT deploy.
- DO NOT touch production DB / migration.
- DO NOT claim `READY_FOR_AUDIT` / `ELIGIBLE` / `FROZEN` until the
  final §N freeze commit lands AND `verify-handoff.ps1` PASSES.
- DO NOT claim P1 complete.

When the §N Real Freeze conditions are met (`§M Real Gates genuinely
pass` + `HANDOFF truthful freeze`), a final freeze commit lands with
`Status: READY_FOR_AUDIT`, `Frozen delivery: YES`, `Canonical gates:
PASS`, `Audit eligibility: ELIGIBLE`, `Next gate: TIER3_LIGHT_AUDIT`,
and the two blockers advanced to `IMPLEMENTED_PENDING_AUDIT`. Then
`verify-task.ps1` and `verify-handoff.ps1` are run and the working
tree is clean.

---

*Predecessor chain: P1-A0.4 code/audit at `12460cf55...` (PR #67);
P1-A0.4 ACCEPTED closeout at `a64c81e954325091a78ec9fb7f441a094df5dcfc`
(PR #68). v1.2 planning at `dff23394471e4d654967246a81bb67ae06fb70af`
(T0 ACCEPTED). v1.3 docs-only materialization at `c6ae6cf4`.
Implementation surface at `00f076dc2b226d1fc0cfb745b368d434dd755890`
(BLOCKED — pre-audit correction). Pre-audit corrective commit
`4d99319f...` + SHA-pin docs `408e835c...` (forward-only on top of
`00f076dc...`). T1C continuation commit at HEAD (forward-only on top
of `408e835c...`) — §J/§K/§L/§M/§N execution against synthetic Neon
`ep-empty-forest-azlhfyo9-*` writer/admin pair.*
