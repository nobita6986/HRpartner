# HANDOFF — `hrp-p1-final-release-safety-closeout`

> **TIER-1 CONTROL (rev. 3 — T0 §E closure 2026-10-01)**: this delivery is
> `READY_FOR_AUDIT` per T0 §E.5. Three P1 release-blockers (BLK-02 SSR 500,
> BLK-03 ADMIN fallback, BLK-04 `docs/tasks/.tmp/` residue) are closed in
> code (Implementation SHA `708e0ce71d258c3a70383330dfb8d5d370dbd974`) and
> verified by `EV-RUN-{1,2,3}-*` (3 fresh final runs, posture/fixture/e2e/
> teardown all `exit=0`, 20/20 steps PASS, residue `0/0/0/0/0`). All baseline
> gates PASS (`npx prisma validate`, `npm run typecheck`, `npm run lint`,
> `npm run build`, `npm run test:unit` 211/211 files 3517 tests, `git diff
> --check`, `node .ai-pipeline/scripts/verify-encoding.mjs` 12/12 UTF-8 no
> BOM). Tier 3 light audit (LIGHT mode) is next per `Next gate`. `AUDIT.md`
> remains **not** owned by T1; Tier 3 owns the canonical audit verdict.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` (×3 fresh runs + baseline gates captured 2026-10-01) |
| Status | **`READY_FOR_AUDIT`** |
| Current audit round | `0` (Tier 3 not invoked; T0-owned) |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Baseline | `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` |
| Implementation SHA | `708e0ce71d258c3a70383330dfb8d5d370dbd974` |
| Freeze commit SHA | `ae56072525a60f5e75e196c28b3d4f486b64b3a0` |
| Final HEAD (this handoff freeze) | `bc41b3f5e2cd86a8802f1040184286be7980d9a7` |
| Frozen delivery | **`YES`** |
| Canonical gates | **`PASS`** |
| Audit eligibility | `ELIGIBLE` |
| Correction budget | `1` |
| Correction batches used | `1` |
| Execution round | `3` |
| Production migration | `NOT_RUN` (T0 owns production-side remediation per stop boundary) |
| Production verification | `NOT_IN_SCOPE` (T1C closeout runs only against synthetic Neon per T0 §B-01 contract) |
| Branch | `codex/t1c-p1-final-release-safety-closeout` |
| Worktree | `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout` |
| Planner | `Tier 1` (T1C) |
| Plan artifact | `docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` |

## 1. Outcome and changed surface

### 1.1 What round 3 closes (T0 §F)

Per T0 directive 2026-10-01 §F, the previous handoff was rejected because:

1. **Control truthfulness** (T0 §A): `Status=READY_FOR_AUDIT` was a lie when
   canonical gates were FAIL. Round 3 flips to `Status=BLOCKED / Frozen=NO /
   Canonical=FAIL / Audit=NOT_ELIGIBLE / Next=T0_RUNTIME_REPRODUCE`.
2. **Public Job release blocker** (T0 §B BLK-02): `GET /viec-lam/<slug>`
   returned HTTP 500. Round 3 fixes the root cause by adding `'use client'`
   to `src/domains/job-board/components/landing/featured-job-card.tsx`.
3. **Recruiter-only canonical flow** (T0 §C BLK-03): HR_STAFF used ADMIN
   SQL/API fallback after login. Round 3 enforces canonical
   `POST /api/admin/applications/<id>/claim` + UUID-v4 Idempotency-Key
   (no ADMIN SQL INSERT), canonical `POST /api/admin/recruiter/placements`
   (no fallback to `/api/admin/placements`), and canonical
   `/api/admin/recruiter/placements/<id>/actions/*` for confirm/effective/cancel.
4. **Runtime safety and cleanup** (T0 §D BLK-04): runner dirtied
   `docs/tasks/.tmp/`. Round 3 cleans the residue and writes into
   `os.tmpdir()` by default with `process.on('exit')` cleanup.

### 1.2 What is now verified (×3 final runs + baseline gates)

Three fresh runtime E2E suites (`EV-RUN-1`, `EV-RUN-2`, `EV-RUN-3`)
captured on **2026-10-01** against the synthetic Neon
`ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` /
`neondb` confirmed:

- **Posture PASS** — writer `app_user_writer` (`rolsuper=false`,
  `rolbypassrls=false`), admin `neondb_owner` (`rolsuper=false`,
  `rolbypassrls=true`), same `current_database` (`db-alias=693fe5919fc2`).
- **Fixture bootstrap PASS** — every run's `synthetic-fixture.mjs` writes
  under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE
  `StaffingOrderRecruiterAssignment` (DEC-12).
- **E2E 20/20 steps PASS** — steps 1–20 per run; step 7 `GET
  /viec-lam/<slug>` HTTP 200 with run-scoped title/slug marker; step 12
  HR_STAFF canonical claim via `POST
  /api/admin/applications/<submissionId>/claim` with UUID-v4
  Idempotency-Key (no ADMIN SQL); step 13 HR_STAFF placement create via
  recruiter route (no `/api/admin/placements` fallback); step 14
  `confirm` → `status=CONFIRMED`; step 15 `effective` returns fail-closed
  contract `400 PLACEMENT_VALID_ERROR` per DEC-07 ("HRP-managed
  Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce
  bridge thuộc N4"); step 16 `cancel` → `status=CANCELLED`; step 17
  `GET /viec-lam/<slug>` HTTP 200; step 18 workbench MINE reflects
  final handling assignments; step 19 residue counts `users=3,
  orders=1, slots=1, openings=1, postings=1, submissions=1, placements=1,
  handlingassignments=1` (pre-teardown); step 20 public tracking code
  + placementId linked.
- **Exact-ID teardown PASS** — residue
  `{"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`
  per run. OS temp dir removed. No `docs/tasks/.tmp/`.
- **Zero `INFRASTRUCTURE_DEFECT`**, **zero unexpected `EXPECTED_FAIL`**.
- `git status --short` clean after each run (only matching evidence under
  `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/`).

All baseline gates PASS:

| Gate | Result |
|---|---|
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid` |
| `npm run typecheck` (`tsc --noEmit`) | exit 0 |
| `npm run lint` (`eslint .`) | exit 0 (0 errors, 912 pre-existing warnings unrelated to task surface) |
| `npm run build` (`next build`) | exit 0, Next.js 15.5.23 build OK |
| `npm run test:unit` (`vitest run --config vitest.unit.config.ts`) | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed |
| `git diff --check` | exit 0 (no whitespace errors) |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 — 12/12 changed files OK (strict UTF-8 without BOM) |

Evidence map (per run):

```
evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}     ← POSTURE_OK
evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}     ← exact IDs + ACTIVE assignment
evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}         ← 20-step run + FAIL-closed evidence
evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}    ← residue=0/0/0/0/0
evidence/EV-RUN-{1,2,3}-summary.json                ← { posture, fixture, e2e, teardown } all 0
```

`EV-ATTEMPT-1-*` is renamed-from-stale and excluded from the final ×3
set per T0 §B (the previous attempt's step 15 failed at the `clientAcknowledgedByUserId`
UUID-v4 gate; payload fixed to `randomUUID()`).

### 1.3 What is still blocking

None. The control list below (`Status=READY_FOR_AUDIT`,
`Frozen=YES`, `Canonical=PASS`, `Audit=ELIGIBLE`) means this delivery is
eligible for Tier 3 LIGHT audit. Tier 3 owns the audit verdict and the
production-side remediation decision (T0 §Stop boundary).

### 1.4 Files touched (round 3 closeout)

```
docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md                            (revised v1.1)
docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md                        (revised v1.1)
docs/tasks/hrp-p1-final-release-safety-closeout/evidence/TIER1_SELF_REVIEW.md     (new — Tier 1 self-review)
docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md                          (REMOVED — Tier 3-owned)
docs/tasks/.tmp/                                                                   (REMOVED — T0 §D.1)
scripts/runtime/synthetic-fixture.mjs                                              (revised — DEC-12 dual authority + DEC-13 OS temp)
scripts/runtime/p1-final-runtime-e2e.mjs                                           (revised — DEC-14 SSR fix + DEC-12/13 recruiter flow + Step 18 workbench MINE)
scripts/runtime/run-p1-e2e-pipeline.mjs                                            (revised — DEC-13 OS temp + cleanup hook)
src/domains/job-board/components/landing/featured-job-card.tsx                     (modified — added 'use client')
```

### 1.4 Forbidden paths confirmed clean (round 3)

`git diff <baseline>..HEAD --` for the following paths returned empty:

- `prisma/schema.prisma`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `.env*`, `.editorconfig`, `verify-encoding.ps1`
- `docs/important/`, `tier1.md`, `tier0.md`, `tier3.md`
- `docs/tasks/.tmp/` (round 3: removed)
- `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (round 3: removed — T3-owned)
- production `ep-shy-tree-az32as2c` URLs (lines 5/7 of `C:\cre_hrp.txt` — never read into env)
- PR #71 / PR #72 source code (read-only for anti-pattern recognition; never reused)

## 2. Reproduction plan (T0 §E)

| # | Required assertion |
|---|---|
| 1 | Production-host guard `assertSyntheticRuntime()` PASS |
| 2 | `db-posture-preflight.mjs` → `POSTURE_OK` (writer non-super/bypassrls, admin non-super/bypassrls, same db) |
| 3 | `synthetic-fixture.mjs` writes under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE `StaffingOrderRecruiterAssignment` |
| 4 | Step 7 `GET /viec-lam/<slug>` returns HTTP 200 and HTML contains the title marker |
| 5 | Anonymous `POST /api/public/jobs/<slug>/applications` returns 2xx and tracking code |
| 6 | Resolve submission returns submissionId and slotId |
| 7 | HR_STAFF login |
| 8 | Workbench MINE pre-claim shows items=0 |
| 9 | HR_STAFF `POST /api/admin/applications/<submissionId>/claim` with HR cookie + UUID-v4 Idempotency-Key PASS (no ADMIN SQL) |
| 10 | Workbench MINE post-claim shows items=1 |
| 11 | HR_STAFF `POST /api/admin/recruiter/placements` PASS (no fallback) |
| 12 | HR_STAFF confirm via `/api/admin/recruiter/placements/<id>/actions/confirm` PASS |
| 13 | HR_STAFF effective via `/api/admin/recruiter/placements/<id>/actions/effective` either PASS or fail-closed per contract |
| 14 | HR_STAFF terminal action via `/api/admin/recruiter/placements/<id>/actions/cancel` PASS |
| 15 | Workbench MINE post-actions reflects final state |
| 16 | Step 17 `GET /viec-lam/<slug>` returns HTTP 200 and HTML contains the title marker |
| 17 | Exact-ID zero-residue teardown PASS |
| 18 | No `INFRASTRUCTURE_DEFECT` and no unexpected `EXPECTED_FAIL` |
| 19 | `git status --short` is 100% empty after the run (PASS or FAIL) |

After ×3 PASS, all baseline gates must PASS:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npx prisma validate`
- `git diff --check`
- `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime`

## 3. Decisions (round 3 closeout)

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Production-host hard guard refuses by construction. | CHOSEN (T0 §B-01) |
| `DEC-02` | Two-tier proof: guard unit tests + posture preflight. | CHOSEN (T0 §B-05) |
| `DEC-03` | Controlled synthetic fixture bootstrap. | CHOSEN (T0 §B-06) |
| `DEC-04` | Exact-ID reverse-FK teardown. | CHOSEN (T0 §B-06) |
| `DEC-05` | Canonical 20-step P1 runtime UI/HTTP E2E — **revised for T0 §C**: claim/placement/actions all use canonical recruiter routes; no ADMIN fallback. | CHOSEN (T0 §C) |
| `DEC-06` | Cold-connect warmup before step 1. | CHOSEN (round-2 debugging) |
| `DEC-07` | Live child server: `NODE_ENV='test'`. | CHOSEN (T0 §B-09) |
| `DEC-08` | JWT_SECRET = `crypto.randomBytes(48).toString('hex')` per-run. | CHOSEN (T0 §JWT) |
| `DEC-09` | **REMOVED** — public SSR 500 is no longer tolerated as out-of-scope. Fixed via DEC-14. | **SUPERSEDED — closed by §C BLK-02** |
| `DEC-10` | Canonical strict integration gate NOT RUN. | CHOSEN (T0 §B-01) |
| `DEC-11` | E2E launcher is `run-p1-e2e-pipeline.mjs` (Node) primary; `run-p1-e2e.ps1` alternative. | CHOSEN |
| `DEC-12` | Fixture seeds ACTIVE `StaffingOrderRecruiterAssignment` for HR_STAFF + the relevant `StaffingOrder` (role=`HR_MANAGER_ASSIGN`, status=`ACTIVE`). | CHOSEN (T0 §C.2) |
| `DEC-13` | Runner writes to OS temp dir by default + `process.on('exit')` cleanup. | CHOSEN (T0 §D.2..§D.3) |
| `DEC-14` | `featured-job-card.tsx` adds `'use client'` directive. | CHOSEN (T0 §B BLK-02) |
| `DEC-15` | TIER1_SELF_REVIEW.md replaces AUDIT.md; T3 owns `AUDIT.md` after the delivery is genuinely eligible. | CHOSEN (T0 §A.3) |

## 4. Deviations and blockers

### 4.1 DEC-10 — Canonical strict integration gate NOT_REQUIRED

T0 §B-01 lists `DATABASE_URL_TEST` as a forbidden env name. The canonical
strict integration gate requires `DATABASE_URL_TEST`. The P1 final closeout
uses runtime UI/HTTP proof against synthetic Neon as the canonical
validation lane. This is a documented contract decision, not a gate failure.

### 4.2 DEC-09 — REMOVED (round 3)

The pre-existing `/viec-lam/[slug]` SSR 500 is no longer tolerated as
out-of-scope. The root cause is fixed via DEC-14. Steps 7 + 17 must return
HTTP 200 and render the published job posting.

### 4.3 DEC-06 — Cold-connect warmup fix (round 2)

The first run of three consecutive runs occasionally returned step-1
`INVALID_CREDENTIALS` 401 from `/api/auth/login`. Root cause: child server's
Prisma client takes 10–30s to cold-connect to synthetic Neon; the
cold-connect 500 was masked by `/api/auth/login` catch block as 401. Fix:
`waitForBoot()` requires Prisma 200/404 (not just `<500`). After fix, all
rounds ×3 PASS with zero residue.

### 4.4 Production boundary

- No `ep-shy-tree-az32as2c` connection.
- No production migration/write/read.
- No Vercel env mutation (T0 owns production deployment).
- No PITR forensic branch access (T0 owns production containment/recovery).
- No production evidence cleanup (T0 owns production recovery).
- No `--force-production` switch exists in the guard.
- Credentials loaded only into the in-process env from `C:\cre_hrp.txt`;
  never copied to disk, evidence, `.env`, shell history, or docs.

### 4.5 JWT / identities boundary

- Per-run signing key = `crypto.randomBytes(48).toString('hex')` set only in
  child process env.
- Signing key is never written to disk, evidence, or shell history.
- ADMIN/HR_MANAGER/HR_STAFF synthetic users created per-run with random
  passwords held only in process memory.
- Synthetic Vietnamese phones derived from RUN_ID + user role slot; always
  pass Vietnamese phone schema validator.
- No production-like phones, no shared seeded user accounts, no credentials
  from `.env`.

## 5. Stop boundary (T0 directive §Stop boundary)

- No PR opened.
- No T3 call.
- No merge/deploy.
- No self-declared P1 completion. Hand back T0 with exact SHAs + counts.
- Hand-back is at the control flip to `READY_FOR_AUDIT` after ×3 PASS.

## 6. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial HANDOFF.md authored (claimed `READY_FOR_AUDIT`) | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B |
| `v1.1` | `2026-10-01` | Status flipped to `BLOCKED`; `AUDIT.md` removed (T3-owned); `evidence/TIER1_SELF_REVIEW.md` added; `docs/tasks/.tmp/` cleaned; SSR fix + recruiter canonical flow + OS-temp cleanup recorded as DEC-12/13/14/15; DEC-09 SUPERSEDED | T0 §F rejections: 54 PASS + 6 HTTP 500 ≠ 60/60 business PASS; ADMIN fallback after HR_STAFF login forbidden; `docs/tasks/.tmp/` residue forbidden |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-<token>-<role>`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at `app/api/admin/recruiter/placements/[id]/actions/effective/route.ts:43` requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure (see `EV-ATTEMPT-1-e2e.stderr`). |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence. | T0 §B (×3 final runs must be PASS runs, not attempt runs). |
| `v1.4` | `2026-10-01` | Fresh `EV-RUN-1/2/3-*` ×3 PASS captured (20/20 steps, posture/fixture/e2e/teardown all `0`, residue `users=0/orders=0/slots=0/projects=0/companies=0` per run). Step 15 fail-closed contract confirmed (400 `PLACEMENT_VALIDATION_ERROR` "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Step 17 HTTP 200 + run-scoped marker. Baseline gates PASS: `npx prisma validate`, `tsc --noEmit`, `eslint .`, `next build`, `vitest run --config vitest.unit.config.ts` (211/211 files, 3517 tests), `git diff --check`, `node verify-encoding.mjs` (12/12 files UTF-8 no BOM). Status flipped to `READY_FOR_AUDIT` after ×3 PASS. Implementation SHA pinned. | T0 §E + §F closure: 3 final runs PASS, all blockers + audit calls. |

---

**Handoff status: READY_FOR_AUDIT** (per T0 §E.5 control truthfulness)

Frozen: YES; Canonical: PASS; Audit eligibility: ELIGIBLE; Next gate: TIER3_LIGHT_AUDIT.

This handoff pins `Implementation SHA = 708e0ce71d258c3a70383330dfb8d5d370dbd974` (semantic/test/migration commit) and the docs/evidence freeze HEAD that follows this line. Tier 3 owns `AUDIT.md` and the audit verdict; Tier 1 stops here per T0 §Stop boundary.