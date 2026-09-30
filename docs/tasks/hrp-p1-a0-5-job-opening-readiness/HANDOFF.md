# HANDOFF — `hrp-p1-a0-5-job-opening-readiness`

**Pipeline V2 — Handoff Snapshot (PRE-AUDIT BLOCKED — pre-freeze corrective, NOT a Tier 3 freeze)**

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-5-job-opening-readiness` |
| Display name | `P1-A0.5 JobOpening Readiness + Final No-Developer E2E` |
| Handoff kind | **PRE-AUDIT CORRECTIVE** (T0 → T1C batch 1/1; NOT a freeze) |
| Accepted planning SHA | `dff23394471e4d654967246a81bb67ae06fb70af` |
| Materialization SHA | `c6ae6cf4` |
| Original implementation SHA | `00f076dc2b226d1fc0cfb745b368d434dd755890` |
| Pre-audit correction commit SHA | `4d99319f29b0185df7d67b2301cedd9c39c27692` (forward-only on top of `00f076dc...`) |
| Baseline | `a64c81e954325091a78ec9fb7f441a094df5dcfc` (P1-A0.4 ACCEPTED closeout main) |
| Status | `BLOCKED` |
| Frozen delivery | `NO` |
| Canonical gates | `FAIL / PENDING` (unit + typecheck + lint + encoding all PASS; §M Real Gates that depend on synthetic DB credentials are NOT_RUN locally) |
| Audit eligibility | `NOT_ELIGIBLE` |
| Next gate | `T0_SYNTHETIC_DB_REPRODUCE` |
| Implementation correction batches used | `1` (T0 → T1C batch 1/1 — pre-audit CHANGES_REQUIRED corrective only) |
| Production DB/migration | `NOT_RUN` |
| Blocker state | `IMPLEMENTED_PENDING_AUDIT` (semantic surface shaped; Tier 3 not requested; pre-merge AUDIT cannot pin `AUDITED_PENDING_MAIN_MERGE` until §M gates pass) |

> This HANDOFF is a **PRE-AUDIT CORRECTIVE** snapshot, NOT a Tier 3 freeze.
> It captures the corrective semantic changes for sections A–I of the T0
> directive plus the local-unit-gate evidence that could be collected without
> synthetic DB credentials. §J/K/L/M Real Gates (§3.3) are blocked because
> the synthetic Neon writer/admin pair (`ep-empty-forest-azlhfyo9-*`)
> credentials are not present in the worktree's local secure credential
> source; production DB / migration remain NOT_RUN per LOCK-11.

## 0. Status truthfulness

This round was an **honest BLOCKED** corrective commit. The Tier 1
self-review surfaced the exact failures listed in the T0 pre-audit
CHANGES_REQUIRED batch 1/1 directive and corrected them in source. Gates
that could run locally without the synthetic DB pair (typecheck, lint,
unit tests, encoding verification, prisma validate/generate with CI
dummy URLs, `git diff --check`, `verify-task.ps1`) all PASS. The
remaining §J/K/L/M gates that require a real synthetic DB writer
connection, full 12-step recruitment lifecycle proof, zero-residue
assertions ×3, and regression suites ×3 are NOT_RUN locally — they
will only be possible in an environment where the synthetic Neon
writer/admin pair is provisioned. **This is therefore not a valid
READY_FOR_AUDIT freeze**; it is a corrective commit that consumes
implementation correction batch `1` (the only batch reserved for
pre-audit corrections) and leaves the task in `BLOCKED /
NOT_ELIGIBLE` until §M gates are run against the real synthetic DB.

`Status: BLOCKED` — do NOT promote to `READY_FOR_AUDIT` until §M Real Gates
genuinely pass and a Tier 3 LIGHT audit request can be made.

## 1. Implementation SHAs

### 1.1 Pre-audit correction commit (this commit)

- HEAD after the corrective commit: **`4d99319f29b0185df7d67b2301cedd9c39c27692`**
  (forward-only on top of the v1.3 docs-only materialization at `c6ae6cf4` and
  the original implementation at `00f076dc...`).

### 1.2 Pin mechanism

After commit:

```bash
git rev-parse HEAD   # → 4d99319f29b0185df7d67b2301cedd9c39c27692
git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc..HEAD
# → 8 paths, all inside the implementation allowlist
```

Each file listed by the second command must be inside the implementation
allowlist. AC-15 is verified by enumerating the allowlist and the diff
output.

## 2. Corrective changes (T0 → T1C batch 1/1, sections A–I)

### 2.1 §A — Control truthfulness (DONE in TASK.md §0)

TASK.md §0 fields updated:

- `Status` → `BLOCKED`
- `Frozen delivery` → `NO`
- `Canonical gates` → `FAIL / PENDING`
- `Audit eligibility` → `NOT_ELIGIBLE`
- `Next gate` → `T0_SYNTHETIC_DB_REPRODUCE`
- `Implementation correction batches used` → `1`
- Revision log row `v1.4` added documenting the pre-audit batch.

### 2.2 §B — Workspace / package hygiene (DONE)

- `pnpm-lock.yaml` and `pnpm-workspace.yaml` (untracked, agent-introduced
  artifacts) are removed. `git status` is clean of pnpm tooling.
- Repository now uses `npm` + `package-lock.json`. `npm ci --prefer-offline`
  succeeded. `node_modules/.pnpm` is gone.
- `npm run typecheck` exits 0 (was failing in the original implementation
  due to the tiptap typing errors and the bad `as never` casts).
- `package.json` / `package-lock.json` were NOT modified by this corrective
  commit.

### 2.3 §C — Opening predicate bug (FIXED in service)

`src/domains/staffing/job-opening-activation.service.ts::loadOpeningPreconditionRow`
now imports and calls `openableJobOpeningPredicateSql(now)` instead of
`eligibleSlotPredicateSql(now)`. The opening predicate is the BASE
capacity/time/order predicate (no `NOT EXISTS job_postings`); the
authoring selector keeps `eligibleSlotPredicateSql` which retains
`NOT EXISTS job_postings`. The DRAFT JobPosting scenario no longer
contradicts `/open`.

### 2.4 §D — Parent order status (NARROWED in service and page)

`openJobOpening` and `app/admin/job-openings/[id]/page.tsx` `canOpen`
predicate both narrow parent `StaffingOrder.status` to exactly `OPEN`.
`CLOSING_SOON` is rejected:

- service: `409 ORDER_NOT_OPEN` with safe envelope (no PII leak);
- page: `blockedReason` text updated to "cần OPEN (CLOSING_SOON không
  đủ điều kiện mở)".

The authoring selector legitimately still accepts `OPEN | CLOSING_SOON`
(no change). The OPENING-specific predicate is narrower.

### 2.5 §E — Classify atomicity (LOCK-FIRST in service)

`classifyJobOpening` now acquires `SELECT ... FOR UPDATE` on the
JobOpening row BEFORE re-reading `status`, `serviceModel`, and
`_count.placements` under the lock:

1. role gate + input validation;
2. pre-flight existence check (cheap, avoids deadlock on missing row);
3. `tx.$queryRaw SELECT ... FOR UPDATE` row lock;
4. re-read state UNDER the lock;
5. reject non-DRAFT or `placementCount > 0` (INVALID_STATE_TRANSITION);
6. idempotent same-value replay → safe 200 no-op;
7. `updateMany` filtered by `status = 'DRAFT'` so a concurrent winner
   yields `count === 0` → 409 INVALID_STATE_TRANSITION (race-loser
   semantics).

Two-connection real races + DRAFT-JobPosting no-fail integration
coverage is part of §J and remains blocked without synthetic DB
credentials.

### 2.6 §F — HR_STAFF error mapping (FIXED at service boundary)

`openJobOpening` now wraps `assertActiveRecruiterForOrder` in a
`try/catch` that maps `RecruiterAssignmentError` to
`JobOpeningActivationError`:

- `NO_ACTIVE_ORDER_ASSIGNMENT` → 403 (safe canned message)
- `ROLE_NOT_PERMITTED` → 403 PERMISSION_DENIED
- unknown `RecruiterAssignmentError` code → 403 generic, no
  `actorId` / `orderId` forwarded, no console.log of the error
  containing PII.

The route layer therefore no longer sees a raw `RecruiterAssignmentError`
that would fall through to a generic 500 with actorId-bearing messages.

### 2.7 §G — Page authority / UI flags (REORDERED + TIGHTENED)

`app/admin/job-openings/[id]/page.tsx`:

- Unsupported-role admission happens BEFORE querying opening data.
- HR_STAFF scoped admission REUSES `assertActiveRecruiterForOrder` —
  the page no longer duplicates the assignment predicate with a
  local `findFirst`. Failure is caught and mapped to `notFound()` so
  the page does not leak unassigned/revoked state.
- `canOpen` requires: slot exists, status DRAFT, serviceModel non-null,
  order strictly OPEN, deadline valid, validTo valid, capacity
  remaining, valid caller authority.
- DIRECTOR/PM remain read-only (no `canClassify`, no `canOpen`).
- `canClassify` remains ADMIN/HR_MANAGER + DRAFT + placementCount 0.
- HR_STAFF without active assignment never receives a control.
- Page-level authorization test (`page.test.tsx`, 15 cases) and
  component test (`job-opening-actions.test.tsx`, 13 cases) PASS.

### 2.8 §H — Strict request contracts (FIXED in routes)

`/classify`:

- Zod schema is now `.strict()` — extra properties in the request body
  are rejected with 400 INVALID_INPUT.
- The `as never` cast on `parsed.data.serviceModel` is replaced with
  `as (typeof SERVICE_MODEL_ENUMS)[number]`.

`/open`:

- Body is strictly empty. Any non-empty payload (`{}`, `null`, arrays,
  text, JSON objects) is rejected with 400 INVALID_INPUT. The only
  accepted payload is the absence of a body (Content-Length absent or 0).
- The previous temporary acceptance of `{}` / `null` was removed.
- Auth-first and role-before-body execution order preserved.

### 2.9 §I — Client idempotency persistence (FIXED in component)

`app/admin/job-openings/[id]/job-opening-actions.tsx`:

- Per-tab retry key store (module-scope `Map`) keyed by
  `${openingId}:${command}:${payloadHash}`.
- Mints a fresh UUID-v4 key on first submit (browser-native
  `crypto.randomUUID()`; `crypto.getRandomValues` fallback for SSR
  pre-hydration; `Math.random` fallback REMOVED in production behavior).
- Reuses the stored key on retry (network error, 4xx, 5xx).
- Clears the key on terminal success (HTTP 2xx).
- Mint a new key when the payload hash changes (e.g. user changes
  ServiceModel selection).
- Classify and open keys never collide (different `command` in the
  scope).
- Component test (`job-opening-actions.test.tsx`) covers visibility and
  button states; full retry-replay / retry-conflict / payload-change
  unit tests live in §J and remain blocked without synthetic DB
  credentials.

## 3. Gate evidence (LOCAL — without synthetic DB credentials)

### 3.1 Local gates that PASS

| Gate | Command | Result |
| --- | --- | --- |
| `npm run typecheck` | `tsc --noEmit` | **PASS** (0 errors) |
| `npm run lint` | `eslint .` | **PASS** (0 errors, 892 pre-existing warnings) |
| `npx prisma validate` | (with CI dummy `DATABASE_URL` / `DATABASE_URL_ADMIN`) | **PASS** |
| `npx prisma generate` | — | **PASS** |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | — | **PASS** (7 changed text files; strict UTF-8 without BOM) |
| `git diff --check` | — | **PASS** (no whitespace/bom issues) |
| `pwsh .ai-pipeline/scripts/verify-task.ps1` | — | **PASS** (`DRAFT-VALID`, 2 non-blocking warnings) |
| `npx vitest run` (unit lane) | — | **PASS** (3513 tests passed, 9 skipped, 0 failed) |
| Targeted service unit tests | `npx vitest run src/domains/staffing/job-opening-activation.service.test.ts` | **PASS** (24/24) |
| Targeted route unit tests | `npx vitest run app/api/admin/staffing/job-openings` | **PASS** (36/36) |
| Targeted page + component tests | `npx vitest run app/admin/job-openings` | **PASS** (28/28) |
| Targeted DTO unit tests | `npx vitest run src/domains/staffing/job-opening-read.service.test.ts` | **PASS** (9/9) |

### 3.2 Local gates that are NOT_RUN (require synthetic DB credentials)

| Gate | Why NOT_RUN |
| --- | --- |
| `npx prisma migrate diff` against real schema | Requires a live writer/admin DB pair |
| `tests/db/p1a05-job-opening-readiness.integration.test.ts` ×3 | Requires `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` (synthetic Neon writer/admin pair) — credentials not present in the worktree's local secure credential source |
| `tests/db/p1a04-canonical-flow.integration.test.ts` ×3 | Same |
| `tests/db/p1a04-r3-substantive.integration.test.ts` ×3 | Same |
| `tests/db/recruiter-workbench.integration.test.ts` ×3 | Same |
| `tests/db/placement-lifecycle-integration.test.ts` ×3 | Same |
| `CI_INTEGRATION_STRICT=1 npm run test:integration` (full canonical) | Same |
| Two-connection real races for classify + open (AC-E2E-25b / AC-E2E-25l) | Same |
| Real idempotency storage replay + conflict tests | Same |
| Real HR_STAFF active / revoked / unassigned RLS tests | Same |
| Full 12-step canonical recruitment lifecycle E2E proof | Same |
| Inline exact-ID zero-residue assertions ×3 (AC-11) | Same |
| `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e9543... HEAD` | Locally runnable but only meaningful against a diff range — to be run at the post-§M freeze commit |

### 3.3 §J / §K / §L (Synthetic DB test repair + 12-step E2E + zero-residue)

These items are explicitly DEFERRED in this correction batch and remain
blocking for any future `READY_FOR_AUDIT` promotion:

- §J — Synthetic DB test repair: existing integration file
  (`tests/db/p1a05-job-opening-readiness.integration.test.ts`) was not
  rewritten in this correction commit. It still uses admin-connection
  mutations and shared slots across scenarios. A real rewrite
  (writer connection via `withDbContext`, distinct slot/opening per
  scenario, two-connection real races, real idempotency storage,
  `CLOSING_SOON` rejection, real HR_STAFF RLS cases) requires a
  synthetic Neon writer/admin pair that is not available in the
  worktree's local secure credential source.
- §K — Full 12-step domain flow integration test: deferred (same reason).
- §L — Zero-residue assertions: deferred (same reason).

### 3.4 §M Real Gates verdict

`BLOCKED / NOT_ELIGIBLE` — the §M gates that depend on a real
synthetic Neon writer/admin pair are not executable in this worktree.
The verifier-level gates (typecheck, lint, encoding, prisma validate,
unit suite, verify-task) all PASS.

## 4. Blocker state (LOCK-10 + v1.2 §I-02)

Both P1 release blockers (`P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`
and `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`) are at
`IMPLEMENTED_PENDING_AUDIT` only (per AC-14). They MUST NOT advance to
`AUDITED_PENDING_MAIN_MERGE` until Tier 3 LIGHT audit PASSES against
real synthetic-DB evidence (currently blocked per §3.2). Final
`RESOLVED_BY_P1_A0_5` is recorded only in the post-merge HANDOFF
closeout after runtime UI/HTTP E2E PASS on a main-compatible
deployment (LOCK-10).

## 5. Exact changed surface (AC-15)

`git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc..HEAD`
returns exactly the following allowlist paths (verified after the
commit at `4d99319f...`):

```
app/admin/job-openings/[id]/job-opening-actions.tsx
app/admin/job-openings/[id]/page.tsx
app/api/admin/staffing/job-openings/[id]/classify/route.ts
app/api/admin/staffing/job-openings/[id]/open/route.ts
docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md
docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md
src/domains/staffing/job-opening-activation.service.test.ts
src/domains/staffing/job-opening-activation.service.ts
```

No path outside the implementation allowlist has been modified. No
new untracked artifacts are present after `pnpm-lock.yaml` and
`pnpm-workspace.yaml` removal. `git status` lists only the 8 files
above (after the SHA-pin docs commit lands).

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

## 7. Stop point — DO NOT PROCEED

This is a **PRE-AUDIT CORRECTIVE** commit, not a Tier 3 freeze.

- DO NOT call Tier 3 (`docs/tasks/hrp-p1-a0-5-job-opening-readiness/AUDIT.md`).
- DO NOT open a PR.
- DO NOT merge into `main`.
- DO NOT deploy.
- DO NOT touch production DB / migration.
- DO NOT claim `READY_FOR_AUDIT` / `ELIGIBLE` / `FROZEN`.
- DO NOT claim P1 complete.
- DO push the corrective commit only if the user explicitly requests.

The `verify-handoff.ps1` script was NOT run for this HANDOFF because
the §N Real Freeze conditions (`M gates genuinely pass` + `HANDOFF
truthful freeze`) are not met. A future HANDOFF written after §M gates
pass must run `verify-handoff.ps1` and pin Implementation SHA,
docs-freeze SHA, baseline, real DB counts, zero-residue evidence, and
the production DB/migration NOT_RUN marker.

---

*Predecessor chain: P1-A0.4 code/audit at `12460cf55...` (PR #67);
P1-A0.4 ACCEPTED closeout at `a64c81e954325091a78ec9fb7f441a094df5dcfc`
(PR #68). v1.2 planning at `dff23394471e4d654967246a81bb67ae06fb70af`
(T0 ACCEPTED). v1.3 docs-only materialization at `c6ae6cf4`.
Implementation surface at `00f076dc2b226d1fc0cfb745b368d434dd755890`
(BLOCKED — pre-audit correction). Pre-audit corrective commit at the
HEAD of this branch (forward-only on top of `00f076dc...`).*
