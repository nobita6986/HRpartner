# TIER1_SELF_REVIEW — `hrp-p1-final-release-safety-closeout`

> Tier 1 self-review (T1C). V2_FAST_FREEZE. Independent measurement +
> production-boundary verification. This document is **NOT** an audit verdict.
> `AUDIT.md` is owned by Tier 3 and will be authored by Tier 3 only after the
> delivery is actually eligible per T0 §F stop boundary.
>
> T0 owns the canonical Tier 3 audit invocation per stop boundary.
> T0 owns production-side remediation; T1C runs only against synthetic Neon per
> T0 §B-01 contract.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` (rewritten 2026-10-01 after T0 §F rejections) |
| Audit mode | `LIGHT` (Tier 3 — pending) |
| Tier 1 review round | `2` (post T0 §F rewrite) |
| Tier 3 audit round | `0` (not invoked; T0-owned) |
| Assurance lane | `CRITICAL` |
| Worktree | `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout` |
| Branch | `codex/t1c-p1-final-release-safety-closeout` |
| Baseline | `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` |
| Status (this revision) | `BLOCKED` |
| Frozen delivery | `NO` |
| Canonical gates | `FAIL` (P1 release blocker — see §B) |
| Audit eligibility | `NOT_ELIGIBLE` |
| Next gate | `T0_RUNTIME_REPRODUCE` |

## 1. What T0 rejected (2026-10-01)

T0 rejected the previous `READY_FOR_AUDIT` handoff because of three blocking
classes of defects:

### A. Control truthfulness

The previous handoff claimed `60/60 business PASS` and `Status=READY_FOR_AUDIT`
while the E2E evidence showed 6 HTTP 500 in steps 7 + 17 (pre-existing SSR
defect on `/viec-lam/<slug>`) and Step 13 using an ADMIN SQL/API fallback
after the recruiter route returned `NO_ACTIVE_ASSIGNMENT`. Both are P1 release
blockers, not merely P3 findings.

This revision explicitly flips the control to `BLOCKED / Frozen=NO /
Canonical=FAIL / Audit=NOT_ELIGIBLE / Next=T0_RUNTIME_REPRODUCE`.

### B. Public Job release blocker

The previous handoff tolerated `GET /viec-lam/<published-slug>` returning HTTP
500 with `Event handlers cannot be passed to Client Component props` as
`AUD-001 / Out of scope`. T0 explicitly stated: **out-of-scope is not a
defensible**. The defect must be resolved and Steps 7 + 17 must return HTTP 200
and render the published job posting.

Root cause: `src/domains/job-board/components/landing/featured-job-card.tsx`
was a Server Component returning `<button onClick={...}>`. Next.js RSC
boundary forbids serializing event handlers to a Client Component.

Fix: added `'use client'` directive at the top of `featured-job-card.tsx`.

### C. Recruiter-only canonical flow

The previous handoff used `POST /api/admin/applications/<id>/claim` (an
`/api/admin/...` route) and fell back to direct `INSERT INTO
labor_profile_handling_assignments` ADMIN SQL when the recruiter route
returned `404 NO_ACTIVE_ASSIGNMENT`. After HR_STAFF login, no ADMIN API/SQL may
be used to complete any recruiter action. The fixture also did not have an
`ACTIVE StaffingOrderRecruiterAssignment` for the HR_STAFF user, which is
required for dual authority (`assertActiveRecruiterForOrder`).

Fix:

1. Fixture now inserts `staffing_order_recruiter_assignments` row for the
   HR_STAFF user + the relevant `StaffingOrder` with status=`ACTIVE` and
   role=`HR_MANAGER_ASSIGN`.
2. Claim via canonical `POST /api/admin/applications/<submissionId>/claim`
   with HR_STAFF session cookie + UUID-v4 `Idempotency-Key`. No ADMIN SQL
   `INSERT`.
3. Placement via canonical `POST /api/admin/recruiter/placements` with HR
   session. No fallback to `/api/admin/placements`.
4. Confirm/effective/cancel via
   `/api/admin/recruiter/placements/<id>/actions/{confirm,effective,cancel}`
   with HR session.
5. HRP-managed `effective` may fail-closed per contract; failure must come
   from the recruiter route. Terminal action (`cancel`) must still succeed.

### D. Runtime safety and cleanup

The previous runner wrote into `docs/tasks/.tmp/p1-e2e-evidence/`. This is
a hard contract violation: the E2E runner must use OS temp or a run-scoped
sub-directory and clean up in `finally` so `git status --short` is 100%
empty after completion (PASS or FAIL).

Fix:

- `scripts/runtime/synthetic-fixture.mjs` writes fixture JSON under `os.tmpdir()`
  by default (e.g. `os.tmpdir()/hrp-p1-fixture-<runId>.json`); the fixture
  includes a one-shot `process.on('exit')` cleanup hook for the run-scoped
  evidence dir so PASS and FAIL both end with zero residue.
- `scripts/runtime/run-p1-e2e-pipeline.mjs` defaults `evidenceDir` to OS
  temp; orchestrator-level `process.on('exit')` removes the orchestrator's
  evidence dir if it owned it (i.e. operator did not pass an explicit
  `evidenceDir`).
- All `docs/tasks/.tmp/` residue has been cleaned (T0 §D.1). Verified empty.

## 2. Self-review vs audit

This file is the **Tier 1 self-review** of the implementation. It does
**not** authorize release. Tier 3 owns `AUDIT.md` and the final verdict.

| Concern | Owner |
|---|---|
| Code correctness | T1C (this file) |
| Runtime reproduction | T1C (this file) |
| Audit verdict | T3 (separate `AUDIT.md`) |
| Production migration / Vercel deploy | T0 |
| Final READY_FOR_AUDIT → ELIGIBLE | T0 after T3 verdict |

## 3. Reproduction plan

Per T0 §E, the final E2E must run ×3 on synthetic writer/admin pair with
zero `INFRASTRUCTURE_DEFECT` and zero unexpected `EXPECTED_FAIL`.

Per-run required assertions:

| # | Required assertion |
|---|---|
| 1 | Production-host guard `assertSyntheticRuntime()` PASS |
| 2 | `db-posture-preflight.mjs` → `POSTURE_OK` (writer non-super/bypassrls, admin non-super/bypassrls, same db) |
| 3 | `synthetic-fixture.mjs` writes under `os.tmpdir()` with exact IDs + redacted phone aliases |
| 4 | Step 7 `GET /viec-lam/<slug>` returns HTTP 200 and HTML contains the title marker |
| 5 | Anonymous `POST /api/public/jobs/<slug>/applications` returns 2xx and tracking code |
| 6 | Resolve submission returns submissionId and slotId |
| 7 | HR_STAFF login |
| 8 | Workbench MINE pre-claim shows items=0 |
| 9 | HR_STAFF `POST /api/admin/applications/<submissionId>/claim` with HR cookie + UUID-v4 Idempotency-Key PASS (no ADMIN SQL) |
| 10 | Workbench MINE post-claim shows items=1 (handling assignment created) |
| 11 | HR_STAFF `POST /api/admin/recruiter/placements` PASS (no fallback to `/api/admin/placements`) |
| 12 | HR_STAFF confirm via `/api/admin/recruiter/placements/<id>/actions/confirm` PASS |
| 13 | HR_STAFF effective via `/api/admin/recruiter/placements/<id>/actions/effective` either PASS or fail-closed per contract |
| 14 | HR_STAFF terminal action via `/api/admin/recruiter/placements/<id>/actions/cancel` PASS |
| 15 | Workbench MINE post-actions reflects final state |
| 16 | Step 17 `GET /viec-lam/<slug>` returns HTTP 200 and HTML contains the title marker |
| 17 | Exact-ID zero-residue teardown PASS (users=0, orders=0, slots=0, projects=0, companies=0) |
| 18 | No `INFRASTRUCTURE_DEFECT` and no unexpected `EXPECTED_FAIL` |
| 19 | `git status --short` is 100% empty after the run (PASS or FAIL) |

After ×3 PASS, the run will record:

- `RUN OK` ×3 from `run-p1-e2e-pipeline.mjs`
- Zero `INFRASTRUCTURE_DEFECT` ×3
- Zero `EXPECTED_FAIL` (other than documented recruiter effective
  fail-closed) ×3

## 4. Required baseline gates (post-pass)

After ×3 PASS:

| Gate | Source |
|---|---|
| `npm run typecheck` | baseline |
| `npm run lint` | baseline |
| `npm run build` | baseline |
| `npm run test:unit` | `vitest run` |
| `npx prisma validate` | Prisma CLI |
| `git diff --check` | baseline |
| `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` | UTF-8/no-BOM strict |

All must PASS with no warnings introduced in the changed surface.

## 5. Anti-pattern inventory

The previous handoff exhibited three concrete anti-patterns. This revision
eliminates them by construction:

| Anti-pattern | Concrete defect | Fix |
|---|---|---|
| Claiming `READY_FOR_AUDIT` while the canonical gate is FAIL | Status flip to `BLOCKED` per T0 §A | This file §0 + TASK.md + HANDOFF.md |
| Tolerating P1 release blocker as `OUT_OF_SCOPE` | SSR 500 on `/viec-lam/<slug>` | `'use client'` in `featured-job-card.tsx` |
| Using ADMIN API/SQL after HR_STAFF login | ADMIN SQL INSERT of handling assignment + `/api/admin/placements` fallback | Canonical recruiter routes + fixture dual-authority row |
| Writing run-scoped files into `docs/tasks/.tmp/` | 67 residue files | `os.tmpdir()` + `process.on('exit')` cleanup |

## 6. Revision log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial ASSUMPTION-TIER-1-self-review; CI/LT1 verdict PASS; pre-release branch ran on `2f77399309c94732e..§TBD` semantically frozen; production boundary NOT_RUN | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B |
| `v1.1` | `2026-10-01` | Rewritten after T0 §F rejections. Status `BLOCKED / Frozen=NO / Canonical=FAIL / Audit=NOT_ELIGIBLE / Next=T0_RUNTIME_REPRODUCE`. Public SSR blocker FIXED via `'use client'`. Recruiter-only canonical flow ENFORCED. `docs/tasks/.tmp/` cleaned; runner uses OS temp + run-scoped cleanup. | T0 §A..§F closures |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-<token>-<role>`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at `app/api/admin/recruiter/placements/[id]/actions/effective/route.ts:43` requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure captured in attempt-1 logs |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence per T0 §B. They are attempt artefacts, not final runs. Fresh RUN-1/2/3 will be captured as `EV-RUN-{1,2,3}-*`. Self-review updated accordingly. | T0 §B (×3 final runs must be PASS runs, not attempt runs) |