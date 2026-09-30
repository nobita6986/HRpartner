# P1-A0.5 — JobOpening Readiness + Final P1 E2E — Reconciliation

> T0 directive 2026-09-30 — Phase B planning round only. Discovery reconciliation artifact that supports `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md`. Planning outcome follows the contract in TASK.md, NOT this file. This file is the survey snapshot captured before implementation planning.

> Baseline for this survey: `origin/main` at `12460cf55d77f193225e54cf4b8e1c1dfc8eaf59` (PR #67 already merged into `main`). P1-A0.4 Scoped Recruiter Authority is `ACCEPTED` (Phase A closeout completed in this directive). Two P1 release blockers are transferred to P1-A0.5 and remain OPEN.

## 1. Scope (from T0 directive §LOCK-01)

P1-A0.5 đóng chung hai blocker:

- `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`
- `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`

Không tách thành hai implementation task độc lập. P1-A0.5 được phép thực hiện mọi gì cần thiết để close cả hai bằng production routes/UI mà không cần developer direct DB mutation.

## 2. Capability matrix — BUILD / ADOPT / MISSING

| Capability | Posture | Existing surface (P1-A0/A0.1/A0.4 carryover) | New work in A0.5 |
| --- | --- | --- | --- |
| JobOpening persistence + slot binding | **ADOPT** | `model JobOpening` (`prisma/schema.prisma:524`) — `id`, `staffingOrderId`, `staffingOrderSlotId`, `status` (DRAFT/OPEN/FILLED/CANCELLED), `openedAt`, `closedAt`, `serviceModel?`. No schema change. | None (no migration unless discovery finds blocker) |
| Slot eligibility predicate (canonical) | **ADOPT** | `eligibleSlotPredicateSql` (`src/domains/staffing/job-posting-list.service.ts`) shared by selector + write-path. Used by `assertSlotEligibleForNewJobPosting`. | Reuse unchanged in `/open` precondition. |
| JobOpening CRUD read DTO | **ADOPT** | `getJobOpeningDetail` (`src/domains/staffing/job-opening-read.service.ts`) returns `status`, `staffingOrder`, `jobPosting`, `metrics`, `associatedSlots`. | Reuse unchanged for action-panel data fetch. |
| JobOpening status summary | **ADOPT** | `summarizeAllJobOpenings` (`src/domains/staffing/job-opening-status.ts`) — groupBy status, zero-fill 4 canonical statuses. | Reuse unchanged. |
| ServiceModel taxonomy (STAFFING_SUPPLY/LABOR_LEASING/RECRUITMENT_SERVICE/REFERRAL_SERVICE) | **ADOPT** | `enum ServiceModel` (`prisma/schema.prisma:1600`). Mapping `STAFFING_SUPPLY|LABOR_LEASING → HRP_MANAGED`; `RECRUITMENT_SERVICE|REFERRAL_SERVICE → CLIENT_MANAGED` lives in `placement.lifecycle.ts::computeManagementMode`. | Reuse unchanged. **No new enum.** |
| ManagementMode resolution + NULL fail-closed | **ADOPT** | `assertClassifiedJobOpening` + `resolveClientCompanyIdForJobOpening` (`src/domains/talent/placement.resolution.ts`) enforce DEC-10: NULL throws `PlacementValidationError`. | Reuse unchanged. ServiceModel NULL must remain fail-closed at every downstream gate. |
| Placement lifecycle (SELECTED → CONFIRMED → EFFECTIVE/FAILED/CANCELLED) | **ADOPT** | `createPlacement`/`confirmPlacement`/`markPlacementEffective`/`failPlacement`/`cancelPlacement` (`src/domains/talent/placement.service.ts`). HRP_MANAGED → EFFECTIVE throws (DEC-08 / C-07). | Reuse unchanged. A0.5 must NOT mutate `placement.commands.ts` or `placement.lifecycle.ts`. |
| JobOpening create-or-reuse on slot | **ADOPT** | `createOrReuseJobOpeningForSlot` (`src/domains/staffing/job-posting-authoring.service.ts:493`) creates `JobOpening` with `status: 'DRAFT'`. Atomic + race-safe via `SELECT … FOR UPDATE` on slot. | Reuse unchanged. |
| JobPosting publish invariant | **ADOPT** | `publishJobPosting` rejects `JobOpening.status !== 'OPEN'` with `JOB_OPENING_NOT_OPEN` (`src/domains/staffing/job-posting-authoring.service.ts:819`). DRAFT/FILLED/CANCELLED all reject. | Reuse unchanged. **MUST NOT regress.** |
| Auth context (session/Idempotency-Key/withDbContext) | **ADOPT** | `getAuthContext` (`src/shared/auth/auth-context.ts`), `withIdempotency` (`src/shared/integrity/idempotency.ts`), `withDbContext` (`src/shared/auth/with-db-context.ts`). | Reuse unchanged on new `/classify` and `/open` routes. |
| Scoped recruiter authority (HR_STAFF on parent order) | **ADOPT** | P1-A0.4 Scoped Recruiter Authority — `StaffingOrderRecruiterAssignment` lifecycle (`src/domains/staffing/recruiter-assignment.service.ts` etc.), predicate `assertRecruiterAndHandlingDualAuthorityForPlacement`. | Reuse unchanged. `/open` must enforce scoped assignment check on the parent `StaffingOrder` for HR_STAFF actors. |
| Recruiter workbench claim/place flow | **ADOPT** | P1-A0/E0/E1 — `MINE` rail, recruiter-placement adapter, dual authority predicate. | Reuse unchanged for the post-`/open` candidate flow. |
| Public apply + LaborProfile/PlacementCase | **ADOPT** | `app/api/public/jobs/[slug]/applications/route.ts` (P1-B), `createCandidateSubmissionFromIntake` (`src/domains/applications/aff03-public-intake.service.ts`). | Reuse unchanged. |
| Anonymous apply visibility on `/viec-lam` and `/viec-lam/[slug]` | **ADOPT** | `app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`. `PUBLISHED` JobPostings only. | Reuse unchanged. |
| ServiceModel classification API | **MISSING** | No `POST /api/admin/staffing/job-openings/[id]/classify` exists. Schema already supports `serviceModel`; authority gate does not. | **A0.5 adds** route + service + tests. |
| DRAFT → OPEN transition API | **MISSING** | `createOrReuseJobOpeningForSlot` only creates DRAFT. No path opens a JobOpening. `publishJobPosting` requires `OPEN`, so a JobOpening can never reach the public market today. | **A0.5 adds** `POST /api/admin/staffing/job-openings/[id]/open` route + service + tests. |
| Narrow action panel on existing JobPosting/JobOpening page | **MISSING** | `app/admin/job-openings/[id]/page.tsx` is read-only summary. No UI for `classify` or `open`. | **A0.5 adds** narrow Server Action / client island that POSTs to the new routes and calls `router.refresh()`. |
| Atomic state transition guard (DRAFT → OPEN + race-safe) | **MISSING** | No `assertCanOpenJobOpening` predicate exists. | **A0.5 adds** `assertCanOpenJobOpening(tx, openingId, actorId, actorRole)` in a new service file (no schema change). |
| Reusable CanonicalError envelope + idempotency replay | **ADOPT** | `withIdempotency` returns `{body, replayed, statusCode}`. Routes reuse canonical envelope. | Reuse unchanged on new routes. |
| Test lanes (unit / component / route / integration / DB / residue) | **ADOPT** | `vitest`, `vitest.integration.config.ts`, `tests/db/*` pattern, `vitest.integration-files.ts` registry, `verify-encoding.mjs`, `verify-encoding-range.mjs`, `verify-task.ps1`. | Register `tests/db/p1a05-job-opening-readiness.integration.test.ts` in `vitest.integration-files.ts`. |
| ERP / payroll integration | **FORBIDDEN** | n/a | A0.5 MUST NOT add ERP / payroll integration. |
| n8n automation / external scheduler | **FORBIDDEN** | n/a | A0.5 MUST NOT call n8n or external schedulers. |
| Sidebar / menu / IA changes | **FORBIDDEN** | `src/shared/ui/role-guard/role-guard-layout.tsx` (admin shell). | A0.5 MUST NOT modify admin layout/sidebar/menu/IA. |

**Capability matrix summary**: 13 ADOPT (existing surface reused unchanged) + 3 MISSING (must be built in A0.5) + 3 FORBIDDEN (boundary constraints). No BUILD in this round — every capability is either reusable or forbidden.

## 3. Current call path — slot → JobOpening DRAFT → JobPosting DRAFT → publish invariant

```
Caller (HR_STAFF with active StaffingOrderRecruiterAssignment
        | HR_MANAGER | ADMIN)
        |
        v
[existing P1-A0] POST /api/admin/jobs/job-postings
        body = { slotId }
        ↓
createOrReuseJobOpeningForSlot(tx, ctx, { slotId })
   ├─ assertSlotEligibleForNewJobPosting(tx, slotId)   // canonical selector parity (ADOPT)
   ├─ SELECT … FOR UPDATE staffing_order_slots WHERE id = $slotId
   ├─ if slot.job_opening_id: reuse bound JobOpening (read DTO)
   └─ else: tx.jobOpening.create({ staffingOrderId, staffingOrderSlotId, status: 'DRAFT' })
            UPDATE staffing_order_slots SET job_opening_id = $new WHERE id = $slot AND job_opening_id IS NULL
            (atomic + race-safe)
        ↓
[DRAFT JobOpening returned]
        ↓
[existing P1-A0] POST /api/admin/jobs/job-postings/[id]
        body = { title, salaryDisplay, descriptionJson, requirementsJson, benefitsJson, applicationInstructionsJson, … }
        ↓
createOrReuseJobPosting(tx, ctx, { jobOpeningId, … })   // creates DRAFT JobPosting
        ↓
[CRITICAL GAP — P1-A0.5 closes this]
[No route to flip JobOpening.status DRAFT → OPEN]
   ↓
[existing P1-A0] POST /api/admin/jobs/job-postings/[id]/publish
        body = { expectedRevision }
        ↓
publishJobPosting(tx, ctx, { jobPostingId, expectedRevision })
   ├─ assertMutationRole(ctx)
   ├─ load current with isOpen
   ├─ if current.jobOpening.status !== 'OPEN' → AuthoringError('JOB_OPENING_NOT_OPEN', 409)
   ├─ title + descriptionJson required
   ├─ expectedRevision match
   └─ atomic status DRAFT → PUBLISHED + stamp isHot/isUrgent + publishedAt
        ↓
[PUBLISHED JobPosting visible on /viec-lam (public listing) + /viec-lam/[slug] (public detail)]
        ↓
[existing P1-B] POST /api/public/jobs/[slug]/applications (anonymous apply)
        ↓
[existing N1] createCandidateSubmissionFromIntake → LaborProfile + PlacementCase OPEN
        ↓
[existing P1-A0.4 / P1-E0/E1] Recruiter Workbench MINE rail → claim → placement adapter → placement commands
        ↓
[existing N3] SELECTED → CONFIRMED → EFFECTIVE (CLIENT_MANAGED only; HRP_MANAGED fail-closed on EFFECTIVE per C-07 / DEC-08)
```

**The gap**: between `createOrReuseJobOpeningForSlot` (returns DRAFT) and `publishJobPosting` (requires OPEN), there is no production command. Without A0.5, every JobOpening is stuck DRAFT and the marketplace cannot ship a PUBLISHED posting.

**A0.5 inserts two commands at the gap**:

```
[…DRAFT JobOpening returned…]
        ↓
[NEW P1-A0.5] POST /api/admin/staffing/job-openings/[id]/classify
        body = { serviceModel: STAFFING_SUPPLY | LABOR_LEASING | RECRUITMENT_SERVICE | REFERRAL_SERVICE }
        ↓
classifyJobOpening(tx, ctx, { openingId, serviceModel })
   ├─ assertRole(ctx) ∈ {ADMIN, HR_MANAGER}
   ├─ assertOpeningDRAFT(tx, openingId)              // status === 'DRAFT'
   ├─ assertServiceModelAllowed(serviceModel)        // enum membership
   └─ UPDATE job_openings SET service_model = $sm WHERE id = $openingId AND status = 'DRAFT'
        ↓
[NEW P1-A0.5] POST /api/admin/staffing/job-openings/[id]/open
        body = { expectedOpeningVersion?: number }
        ↓
openJobOpening(tx, ctx, { openingId })
   ├─ assertRole(ctx) ∈ {ADMIN, HR_MANAGER} ∪
   │  (HR_STAFF with active StaffingOrderRecruiterAssignment on parent StaffingOrder)
   ├─ SELECT … FOR UPDATE job_openings WHERE id = $openingId
   ├─ assert status === 'DRAFT'
   ├─ assert serviceModel !== NULL
   ├─ assert parent StaffingOrder.status === 'OPEN'
   ├─ assert slot.is_eligible === true (canonical selector)
   ├─ UPDATE job_openings SET status = 'OPEN', opened_at = now()
   │  WHERE id = $openingId AND status = 'DRAFT'
   └─ return JobOpeningDto
        ↓
[existing publish flow resumes, invariant holds]
```

## 4. Authority / RLS path from P1-A0.4

P1-A0.4 Scoped Recruiter Authority is the authority contract for any HR_STAFF actor who is not a global `ADMIN` / `HR_MANAGER`. Reuse its predicates unchanged:

| Predicate | Location | Used by A0.5 |
| --- | --- | --- |
| `assertRecruiterAndOrderAssignmentActive` (per-P1-A0.4) | `src/domains/staffing/recruiter-assignment.service.ts` | **Yes** — `openJobOpening` must check active assignment on the parent `StaffingOrder.id` for HR_STAFF callers. |
| `assertMutationRole(ctx)` (P1-A0 mutation role set: ADMIN/HR_MANAGER/HR_STAFF) | `src/domains/staffing/job-posting-authoring.service.ts` | **Partial** — `/classify` is ADMIN/HR_MANAGER only (LOCK-03). `/open` is ADMIN/HR_MANAGER OR HR_STAFF with active assignment (LOCK-04). |
| `getAuthContext(req)` + `withDbContext(prisma, ctx, handler)` | `src/shared/auth/auth-context.ts`, `src/shared/auth/with-db-context.ts` | **Yes** — every new route MUST use these unchanged. |
| `withIdempotency({ prisma, route, actorId, key, requestBody, handler })` | `src/shared/integrity/idempotency.ts` | **Yes** — every new route MUST require Idempotency-Key (UUID v4) and pass through this helper. |
| `assertEligibleSlotForNewJobPosting(tx, slotId)` (canonical selector parity) | `src/domains/staffing/job-posting-authoring.service.ts` | **Yes** — `/open` MUST re-evaluate `slot.is_eligible` server-side; selector dropdown is never authorization. |
| `assertClassifiedJobOpening` (DEC-10 NULL fail-closed) | `src/domains/talent/placement.resolution.ts` | **Yes** — `/open` MUST refuse transition when `serviceModel IS NULL`. Same predicate already used downstream by placement; A0.5 just adds the symmetric gate at the activation point. |
| `computeManagementMode` (DEC-02 mapping) | `src/domains/talent/placement.lifecycle.ts` | **Indirect** — A0.5 does not call it directly, but `serviceModel` value written by `/classify` will be classified downstream by the existing mapper. No new mapping added. |

**No new authority predicates** are introduced in A0.5. `/classify` and `/open` reuse the existing canonical pattern.

## 5. Threat model

Each threat below maps to a precondition enforced by `/classify` or `/open` (or by existing downstream invariants). Every threat must have at least one automated test (route unit + DB integration).

| Threat | Vector | Mitigation in A0.5 | Test name prefix |
| --- | --- | --- | --- |
| **Stale state** — `/open` on already-OPEN/FILLED/CANCELLED opening | Aware client retries with stale id | Atomic predicate `assert status === 'DRAFT'` inside `openJobOpening`; UPDATE filtered by `status = 'DRAFT'` | `OPN-01..OPN-04` |
| **Stale state** — `/classify` on OPEN opening | HR_MANAGER classifies after another actor opened | Atomic `assert status === 'DRAFT'` inside `classifyJobOpening`; UPDATE filtered by `status = 'DRAFT'` | `CLS-01..CLS-04` |
| **Double open** — two HR_STAFF scoped recruiters race on same opening | Concurrent click + retry | `SELECT … FOR UPDATE` on `job_openings` row inside transaction; UPDATE filtered by `status = 'DRAFT'`; race resolves to one OPEN, second receives `409 INVALID_STATE_TRANSITION` | `OPN-05..OPN-08` |
| **Concurrent classify + open** | HR_STAFF opens while HR_MANAGER classifies | Both routes `SELECT … FOR UPDATE` the same row inside their own transactions; Prisma serializable isolation (existing default) + UPDATE filtered by `status = 'DRAFT'` guarantee exactly one mutation succeeds | `OPN-09..OPN-12` |
| **Revoked assignment at activation time** | HR_STAFF assignment revoked between candidate render and `/open` POST | `openJobOpening` re-checks assignment ACTIVENESS under the same transaction lock; revoked → `403 NO_ACTIVE_ORDER_ASSIGNMENT` | `OPN-13..OPN-15` |
| **serviceModel mutation after OPEN** | HR_MANAGER classifies again after OPEN | `/classify` rejects with `409 INVALID_STATE_TRANSITION`; UPDATE filtered by `status = 'DRAFT'`; serviceModel is immutable once `OPEN` (LOCK-03) | `CLS-05..CLS-07` |
| **serviceModel mutation after placement exists** | HR_MANAGER classifies after Placement row exists | Same as above + additional check: `placementCount === 0` (defense in depth; placement already fail-closed on NULL via `assertClassifiedJobOpening`) | `CLS-08..CLS-09` |
| **Role-only bypass for HR_STAFF** | Client sends `actorRole: 'HR_MANAGER'` | `actorRole` is server-derived from `ctx.userId`; never trust client claim. `openJobOpening` reads `ctx.role` server-side | `OPN-16..OPN-18` |
| **Idempotency collision** | Two distinct POST bodies share same key | `withIdempotency` hashes `(route, actorId, key, requestBody)` and returns 409 `IDEMPOTENCY_CONFLICT` on mismatch | Route unit |
| **Idempotency replay** | Same actor retries same request | `withIdempotency` returns cached `{body, replayed: true, statusCode: 200}` | Route unit |
| **Missing Idempotency-Key** | Client omits header | Route returns 400 `IDEMPOTENCY_REQUIRED` | Route unit |
| **Slot eligibility bypass** | Client claims `slot.is_eligible` from stale dropdown | `assertSlotEligibleForNewJobPosting` re-runs canonical selector inside `/open` transaction | `OPN-19..OPN-20` |
| **Null serviceModel escape** | `/open` succeeds when serviceModel is NULL | `assertClassifiedJobOpening` runs before UPDATE; NULL → 422 `SERVICE_MODEL_REQUIRED` (or 409 — see AC chain) | `OPN-21..OPN-22` |
| **Parent order not OPEN** | Client opens on a CANCELLED or FILLED StaffingOrder | `assertParentOrderOPEN` inside `openJobOpening`; not OPEN → 409 `ORDER_NOT_OPEN` | `OPN-23..OPN-24` |
| **Info leak via error envelope** | Error body reveals actorId, assignment data, PII, DB internals | New routes MUST use canonical safe envelope (`{error, message, ...}`). No stack traces; no `assignmentId`; no `staffingOrder.code` unless already public | Route unit (snapshot envelope) |
| **CSRF / cross-origin** | Browser submission from non-admin origin | Existing admin middleware enforces same-origin; new routes inherit | Route unit (header presence) |
| **Excessive blast radius** | A0.5 spills into ERP/payroll/CRM/sidebar/n8n | LOCK-07/11 + planner discipline; forbidden paths declared in TASK.md §10 | Forbidden-paths sweep |
| **Schema drift** | A0.5 adds new columns | LOCK-08 — ADOPT only; no migration unless discovery finds blocker (none in §6) | Prisma validate PASS |

## 6. Discovery note — schema posture

After surveying `prisma/schema.prisma`, `JobOpening` already carries `status` and `serviceModel` columns. No migration is required to close either blocker. The classification and activation are pure mutation authority gaps, not schema gaps. If implementation round discovers any blocker that requires a column or index change, Tier 1 MUST stop and notify T0 (LOCK-08).

## 7. Existing integration test registry (to be updated)

`vitest.integration-files.ts` currently includes P1-A0/A0.1/A0.4 and predecessor lanes. A0.5 implementation round MUST register a new `tests/db/p1a05-job-opening-readiness.integration.test.ts` file with the following test families:
- `CLS-AC-01..AC-NN` — `/classify` happy path, NULL fail-closed, OPEN reject, FILLED reject, role gate, idempotency.
- `OPN-AC-01..AC-NN` — `/open` happy path (ADMIN/HR_MANAGER), HR_STAFF with active assignment, HR_STAFF without assignment, NULL serviceModel reject, FILLED opening reject, concurrent race, idempotency replay, parent order NOT_OPEN reject, slot inactive reject.
- `E2E-AC-01..AC-NN` — full no-developer 12-step flow (LOCK-09).
- Predecessor regressions: `p1a04-canonical-flow.integration.test.ts`, `p1a04-r3-substantive.integration.test.ts`, `recruiter-workbench.integration.test.ts`, `placement-lifecycle-integration.test.ts` — all must still PASS unchanged.
- Zero-residue suite ×3.

## 8. Predecessor chain reference (P1 carryover)

- P1-A0 `hrp-p1-a0-jobposting-authoring-publish` — `createOrReuseJobOpeningForSlot` (DRAFT) + `publishJobPosting` (OPEN invariant)
- P1-A0.1 `hrp-p1-a0-1-jobposting-authoring-stamps` — `isHot`/`isUrgent` content fields
- P1-A0.4 `hrp-p1-a0-4-scoped-recruiter-authority` — `StaffingOrderRecruiterAssignment` predicate (the authority source for HR_STAFF `/open`)
- P1-B `hrp-p1-b-public-apply` — anonymous apply path
- P1-E0/E1 `hrp-p1-e0-recruiter-workbench-read-model` / `hrp-p1-e1-recruiter-workbench-ui` — MINE rail + claim flow
- P1-F0/F1 `hrp-p1-f0-placement-command-api` / `hrp-p1-f1-placement-action-ui` — placement commands

A0.5 consumes all of the above unchanged. A0.5 does NOT mutate any of the above artifacts except via addition (new files only).

## 9. RQ → STEP → AC traceability (summary, full chain in TASK.md)

| RQ | Topic | STEP | AC chain |
| --- | --- | --- | --- |
| RQ-01 | Schema posture — adopt existing columns | STEP-01 | AC-01..AC-04 |
| RQ-02 | ServiceModel classification command | STEP-02..STEP-04 | AC-05..AC-13 |
| RQ-03 | DRAFT → OPEN transition command | STEP-05..STEP-08 | AC-14..AC-26 |
| RQ-04 | Authority delegation (HR_STAFF scoped) | STEP-09..STEP-10 | AC-27..AC-32 |
| RQ-05 | UI narrow action panel | STEP-11..STEP-12 | AC-33..AC-38 |
| RQ-06 | Integration test registry update | STEP-13 | AC-39..AC-41 |
| RQ-07 | Final no-developer E2E AC chain (LOCK-09) | STEP-14 | AC-E2E-01..AC-E2E-12 |

Total: 41 AC rows + 12 E2E rows = 53 measurable AC. See `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` §6 for the full chain.

## 10. Open Owner decisions

**0** — All T0 locked decisions are captured in TASK.md LOCK-01..LOCK-11. No new Owner decision is required for planning round.

## 11. In-scope allowlist (planning-level surface)

```text
prisma/schema.prisma                    (READ ONLY — no mutation unless LOCK-08 escape)
prisma/migrations/                      (READ ONLY)
src/domains/staffing/                   (READ for reuse; new file allowed under job-opening-activation.service.ts)
src/domains/talent/                     (READ for reuse only; placement.commands / lifecycle / resolution frozen)
src/domains/job-board/                  (READ for reuse)
src/domains/applications/               (READ for reuse)
src/shared/auth/                        (READ only)
src/shared/integrity/                   (READ only)
src/shared/security/                    (READ only)
app/api/admin/staffing/job-openings/    (NEW — adds /classify and /open route handlers + tests)
app/admin/job-openings/[id]/            (existing page; narrow action panel addition allowed)
app/admin/jobs/job-postings/            (READ only — P1-A0/A0.1 carryover; UI should NOT regress)
tests/db/p1a05-job-opening-readiness.integration.test.ts   (NEW)
vitest.integration-files.ts             (APPEND-only — register the new test file)
```

## 12. Forbidden paths

```text
app/api/admin/erp/**                    — NOT in scope
app/api/admin/payroll/**                — NOT in scope
src/domains/crm/**                      — NOT in scope (P1-B carryover read-only)
src/domains/media/**                    — NOT in scope
src/domains/referrals/**                — NOT in scope (read-only carryover)
n8n/**                                  — MUST NOT call or integrate
sidebar/navigation/menu/IA routes       — MUST NOT modify admin layout
prisma/migrations/**                    — MUST NOT add unless LOCK-08 escape
src/domains/talent/placement.{commands,service,lifecycle,resolution}.ts  — MUST NOT mutate
src/domains/staffing/job-posting-authoring.service.ts   — MUST NOT mutate (publishJobPosting invariant)
docs/PLANNER_HANDOVER.md                — MUST NOT modify (T0 directive Phase B)
```

---

*Survey snapshot captured from `origin/main` @ `12460cf55d77f193225e54cf4b8e1c1dfc8eaf59`. This file is documentation only — planning contract lives in `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md`.*