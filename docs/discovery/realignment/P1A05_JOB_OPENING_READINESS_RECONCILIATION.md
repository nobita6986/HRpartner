# P1-A0.5 — JobOpening Readiness + Final P1 E2E — Reconciliation

> T0 directive 2026-09-30 v1.2 — Phase B planning round only. Discovery reconciliation artifact that supports `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` (v1.2). Planning outcome follows the contract in TASK.md, NOT this file. This file is the survey snapshot captured before implementation planning. v1.2 is the final pre-implementation integrity correction (T0-authorized planning integrity exception #1, NOT counted against implementation correction budget). v1.1 SHA preserved: `dae4bdbb93af807b51da6c54dc64b8d8f56b608b`. v1.2 SHA will be added at commit time. NO amend / reset / rebase / force-push.

> **Baseline for this survey (v1.2 corrected)**: `origin/main` at `a64c81e954325091a78ec9fb7f441a094df5dcfc` (P1-A0.4 ACCEPTED closeout PR #68 merged; planning SHA `19790cd5ead47...` preserved; PR #67 code/audit merged at `12460cf55...`; NO amend / reset / rebase / force-push). P1-A0.4 Scoped Recruiter Authority is `ACCEPTED` (Phase A closeout completed in T0 directive). Two P1 release blockers are transferred to P1-A0.5 and remain OPEN; v1.2 §I-02 lifecycle governs when each state is recorded.

## 1. Scope (from T0 directive §LOCK-01)

P1-A0.5 đóng chung hai blocker:

- `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`
- `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`

Không tách thành hai implementation task độc lập. P1-A0.5 được phép thực hiện mọi gì cần thiết để close cả hai bằng production routes/UI mà không cần developer direct DB mutation cho các bước nghiệp vụ đang được chứng minh (v1.1 §H — admin DB chỉ dùng để dựng/teardown fixture, fixture-only).

## 2. Capability matrix — BUILD / ADOPT / MISSING (v1.1 corrected)

| Capability | Posture | Existing surface (P1-A0/A0.1/A0.4 carryover) | New work in A0.5 |
| --- | --- | --- | --- |
| JobOpening persistence + slot binding | **ADOPT** | `model JobOpening` (`prisma/schema.prisma:524`) — `id`, `staffingOrderId`, `staffingOrderSlotId`, `status` (DRAFT/OPEN/FILLED/CANCELLED), `openedAt`, `closedAt`, `serviceModel?`. No schema change. | None (no migration unless discovery finds blocker) |
| Slot eligibility predicate (canonical) | **CUSTOM** (v1.1 §D — minimal shared-predicate refactor) | `eligibleSlotPredicateSql` (`src/domains/staffing/job-posting-list.service.ts`) shared by selector + write-path; used by `assertSlotEligibleForNewJobPosting`. | v1.1 §D refactor: extract base capacity/time/order predicate; authoring predicate = base + `NOT EXISTS job_postings` (keeps existing call semantic in `createOrReuseJobOpeningForSlot`); opening-eligibility predicate = base + open-specific rules, **NO `NOT EXISTS job_postings`** so presence of JobPosting DRAFT does NOT block `/open`. Existing call sites retain identical external behavior for authoring. |
| JobOpening CRUD read DTO | **CUSTOM** (v1.1 §G + v1.2 §I-06) | `getJobOpeningDetail` (`src/domains/staffing/job-opening-read.service.ts:3-35`) returns `status`, `staffingOrder`, `jobPosting`, `metrics`, `associatedSlots`. **v1.0 wrongly listed as already-complete for v1.1 needs; v1.1 reclassifies as ADDITIVE READ-MODEL GAP.** | v1.2 §I-06: add `serviceModel`, `placementCount` (or `hasPlacement: boolean`), parent `StaffingOrder.status`, **`StaffingOrder.deadlineDate`** (exact source field — not "opening deadline"), **`StaffingOrderSlot.validTo`** (exact source field), `slotsFilled`/`slotsNeeded`. NO leak of `assigneeId`, `actorId`, assignment audit metadata, PII. |
| JobOpening status summary | **ADOPT** | `summarizeAllJobOpenings` (`src/domains/staffing/job-opening-status.ts`) — groupBy status, zero-fill 4 canonical statuses. | Reuse unchanged. |
| ServiceModel taxonomy (STAFFING_SUPPLY/LABOR_LEASING/RECRUITMENT_SERVICE/REFERRAL_SERVICE) | **ADOPT** | `enum ServiceModel` (`prisma/schema.prisma:1600`). Mapping `STAFFING_SUPPLY|LABOR_LEASING → HRP_MANAGED`; `RECRUITMENT_SERVICE|REFERRAL_SERVICE → CLIENT_MANAGED` lives in `placement.lifecycle.ts::computeManagementMode`. | Reuse unchanged. **No new enum.** |
| ManagementMode resolution + NULL fail-closed | **ADOPT** | `assertClassifiedJobOpening` + `resolveClientCompanyIdForJobOpening` (`src/domains/talent/placement.resolution.ts`) enforce DEC-10: NULL throws `PlacementValidationError`. | Reuse unchanged. ServiceModel NULL must remain fail-closed at every downstream gate. |
| Placement lifecycle (SELECTED → CONFIRMED → EFFECTIVE/FAILED/CANCELLED) | **ADOPT** | `createPlacement`/`confirmPlacement`/`markPlacementEffective`/`failPlacement`/`cancelPlacement` (`src/domains/talent/placement.service.ts`). HRP_MANAGED → EFFECTIVE throws (DEC-08 / C-07). | Reuse unchanged. A0.5 must NOT mutate `placement.commands.ts` or `placement.lifecycle.ts`. |
| JobOpening create-or-reuse on slot | **ADOPT** | `createOrReuseJobOpeningForSlot` (`src/domains/staffing/job-posting-authoring.service.ts:493`) creates `JobOpening` with `status: 'DRAFT'`. Atomic + race-safe via `SELECT … FOR UPDATE` on slot. | Reuse unchanged. |
| JobPosting publish invariant | **ADOPT** | `publishJobPosting` rejects `JobOpening.status !== 'OPEN'` with `JOB_OPENING_NOT_OPEN` (`src/domains/staffing/job-posting-authoring.service.ts:819`). DRAFT/FILLED/CANCELLED all reject. | Reuse unchanged. **MUST NOT regress.** |
| Auth context (session/Idempotency-Key/withDbContext) | **ADOPT** | `getAuthContext` (`src/shared/auth/auth-context.ts`), `withIdempotency` (`src/shared/integrity/idempotency.ts`), `withDbContext` (`src/shared/auth/with-db-context.ts`). | Reuse unchanged on new `/classify` and `/open` routes. |
| Scoped recruiter authority (HR_STAFF on parent order) | **ADOPT** | P1-A0.4 Scoped Recruiter Authority — `StaffingOrderRecruiterAssignment` lifecycle (`src/domains/staffing/recruiter-assignment.service.ts` etc.), predicate `assertRecruiterAndOrderAssignmentActive`. | Reuse unchanged. `/open` MUST enforce scoped assignment check on the parent `StaffingOrder` for HR_STAFF actors. v1.1 §E: outer page role admission broadened to include HR_STAFF gated by this predicate; unassigned HR_STAFF → notFound/fail-closed. |
| Recruiter workbench claim/place flow | **ADOPT** | P1-A0/E0/E1 — MINE rail at `/admin/recruiter-workbench?view=MINE` (canonical), recruiter-placement adapter, dual authority predicate. **v1.1 §H correction**: `/admin/my-claimed-candidates` does NOT exist; canonical path is `/admin/recruiter-workbench?view=MINE`. | Reuse unchanged for the post-`/open` candidate flow. |
| Public apply + LandProfile/PlacementCase | **ADOPT** | `app/api/public/jobs/[slug]/applications/route.ts` (P1-B), `createCandidateSubmissionFromIntake` (`src/domains/applications/aff03-public-intake.service.ts`). | Reuse unchanged. |
| Anonymous apply visibility on `/viec-lam` and `/viec-lam/[slug]` | **ADOPT** | `app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`. `PUBLISHED` JobPostings only. | Reuse unchanged. |
| Canonical HTTP taxonomy + typed error pattern | **ADOPT** | `AdminApplicationError` (`src/domains/applications/application-queue.service.ts:18-21`), `ApplicationServiceError` (`CONSENT_REQUIRED` 422 precedent), `RecruiterAssignmentError` (`ORDER_NOT_OPEN` 409, `NO_ACTIVE_ORDER_ASSIGNMENT` 403, `INVALID_STATE_TRANSITION` 409), `aff03-public-intake.route.test.ts` (422 carryover). | v1.1 §C/§D: new typed `JobOpeningActivationError extends Error { code, httpStatus, message }` analog carryover. KHÔNG reuse `PlacementValidationError` cho JobOpening activation. |
| ServiceModel classification API | **MISSING** | No `POST /api/admin/staffing/job-openings/[id]/classify` exists. Schema already supports `serviceModel`; authority gate does not. | **A0.5 adds** route + service + tests. v1.1 §C: body MUST be one of 4 enum; `null`/missing/unknown → 400 `INVALID_INPUT` (Zod); idempotency semantics; typed `JobOpeningActivationError`. |
| DRAFT → OPEN transition API | **MISSING** | `createOrReuseJobOpeningForSlot` only creates DRAFT. No path opens a JobOpening. `publishJobPosting` requires `OPEN`, so a JobOpening can never reach the public market today. | **A0.5 adds** `POST /api/admin/staffing/job-openings/[id]/open` route + service + tests. v1.1 §D: body rỗng; full 7-precondition set; presence of JobPosting DRAFT MUST NOT fail `/open`. |
| Narrow Server/Client action panel on existing JobPosting/JobOpening page | **MISSING** | `app/admin/job-openings/[id]/page.tsx` (existing detail page; outer admission: `ADMIN | HR_MANAGER | DIRECTOR | PM`; no HR_STAFF). Read-only summary. No UI for `classify` or `open`. | **A0.5 adds** (v1.1 §F): `page.tsx` Server Component outer role admission broadened to include HR_STAFF gated by A0.4 RLS; server-derives `canClassify` / `canOpen` / `blockedReason` / opening-state snapshot; NEW `job-opening-actions.tsx` Client Component (`'use client'`) POSTs to new routes, calls `router.refresh()`; Client NEVER re-derives authority. NEW `job-opening-actions.test.tsx` (component test) covers HR_STAFF / ADMIN / HR_MANAGER / DIRECTOR / PM visibility matrix. |
| Atomic state transition guard (DRAFT → OPEN + race-safe) | **MISSING** | No `assertCanOpenJobOpening` predicate exists. | **A0.5 adds** `assertCanOpenJobOpening(tx, openingId, actorId, actorRole)` in new service file (no schema change). |
| Reusable CanonicalError envelope + idempotency replay | **ADOPT** | `withIdempotency` returns `{body, replayed, statusCode}`. Routes reuse canonical envelope. | Reuse unchanged on new routes. |
| Test lanes (unit / component / route / integration / DB / residue) | **ADOPT** | `vitest`, `vitest.integration.config.ts`, `tests/db/*` pattern, `vitest.integration-files.ts` registry, `verify-encoding.mjs`, `verify-encoding-range.mjs`, `verify-task.ps1`. | v1.1 §I: zero-residue is **inline exact-ID assertions** in `tests/db/p1a05-job-opening-readiness.integration.test.ts` ×3 — **NO external `scripts/zero-residue-probe.ps1`** (does not exist). Register new test file in `vitest.integration-files.ts` (APPEND-only). |
| ERP / payroll integration | **FORBIDDEN** | n/a | A0.5 MUST NOT add ERP / payroll integration. |
| n8n automation / external scheduler | **FORBIDDEN** | n/a | A0.5 MUST NOT call n8n or external schedulers. |
| Sidebar / menu / IA changes | **FORBIDDEN** | `src/shared/ui/role-guard/role-guard-layout.tsx` (admin shell). | A0.5 MUST NOT modify admin layout/sidebar/menu/IA. |
| `scripts/zero-residue-probe.ps1` reference | **FORBIDDEN** | (does not exist in repo) | v1.1 §I: zero-residue lives INLINE in integration suite. A0.5 MUST NOT reference this non-existent script. |
| Client-side business authority | **FORBIDDEN** | n/a | v1.1 §F: Client Component only sends commands; Server re-evaluates every precondition. |
| `PlacementValidationError` reuse for JobOpening activation | **FORBIDDEN** | `PlacementValidationError` is for Placement lifecycle | v1.1 §C/§D/§H: A0.5 MUST use new typed `JobOpeningActivationError`; MUST NOT reuse `PlacementValidationError` cho JobOpening activation. |

**Capability matrix summary (v1.1)**: 13 ADOPT carryover + 2 CUSTOM (slot-eligibility-predicate refactor v1.1 §D + JobOpeningDetailDto additive update v1.1 §G) + 4 MISSING (built in implementation round) + 5 FORBIDDEN (boundary constraints incl. non-existent script + typed-error reuse + client-side authority).

##  3. Current call path — slot → JobOpening DRAFT → JobPosting DRAFT → publish invariant (v1.1 corrected)

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
[NEW P1-A0.5] POST /api/admin/staffing/job-openings/[id]/classify   (v1.1 §C — body MUST be one of 4 enum)
        body = { serviceModel: STAFFING_SUPPLY | LABOR_LEASING | RECRUITMENT_SERVICE | REFERRAL_SERVICE }
        Idempotency-Key: <UUID v4>
        ↓
classifyJobOpening(tx, ctx, { openingId, serviceModel })
   ├─ assertRole(ctx) ∈ {ADMIN, HR_MANAGER}
   ├─ SELECT … FOR UPDATE job_openings WHERE id = $openingId
   ├─ assert status === 'DRAFT'
   ├─ assert serviceModel ∈ {STAFFING_SUPPLY, LABOR_LEASING, RECRUITMENT_SERVICE, REFERRAL_SERVICE}  // v1.1 §C: null/missing/unknown → 400 INVALID_INPUT via Zod, NOT allowed as "valid enum null"
   ├─ assert placementCount === 0
   └─ UPDATE job_openings SET service_model = $sm WHERE id = $openingId AND status = 'DRAFT'
        // idempotency: same key + same payload → replay 200; same key + different payload → 409 IDEMPOTENCY_CONFLICT
        // distinct keys racing DRAFT → serialize via row lock, last-committed-command-wins (KHÔNG claim "one wins/one 409")
        // typed JobOpeningActivationError (KHÔNG PlacementValidationError)
        ↓
[NEW P1-A0.5] POST /api/admin/staffing/job-openings/[id]/open   (v1.1 §D — body rỗng, NO expectedOpeningVersion)
        body = {}    // EMPTY — KHÔNG ignored payload
        Idempotency-Key: <UUID v4>
        ↓
openJobOpening(tx, ctx, { openingId })
   ├─ assertRole(ctx) ∈ {ADMIN, HR_MANAGER}
   │   ∪ (HR_STAFF with active StaffingOrderRecruiterAssignment on parent StaffingOrder via assertRecruiterAndOrderAssignmentActive)
   ├─ SELECT … FOR UPDATE job_openings WHERE id = $openingId
   ├─ assert ALL preconditions (v1.1 §D full set):
   │    (a) status === 'DRAFT'
   │    (b) serviceModel IS NOT NULL   (re-use assertClassifiedJobOpening → 422 SERVICE_MODEL_REQUIRED)
   │    (c) parent StaffingOrder.status === 'OPEN'  (→ 409 ORDER_NOT_OPEN)
   │    (d) `StaffingOrder.deadlineDate` chưa hết  (v1.2 §I-06 — exact source field) (→ 409 SLOT_NOT_ELIGIBLE)
   │    (e) `StaffingOrderSlot.validTo` chưa hết hạn  (v1.2 §I-06 — exact source field) (→ 409 SLOT_NOT_ELIGIBLE)
   │    (f) slotsFilled < slotsNeeded  (→ 409 SLOT_NOT_ELIGIBLE)
   │    (g) caller authority            (HR_STAFF without assignment → 403 NO_ACTIVE_ORDER_ASSIGNMENT;
   │                                      caller ngoài admission → 403 PERMISSION_DENIED)
   ├─ assert presence of JobPosting DRAFT MUST NOT cause /open to fail
   │   (v1.1 §D minimal shared-predicate refactor: opening-eligibility = base + open-specific rules,
   │    NO `NOT EXISTS job_postings`)
   ├─ UPDATE job_openings SET status = 'OPEN', opened_at = now()
   │  WHERE id = $openingId AND status = 'DRAFT'
   └─ return JobOpeningDto
        // race semantics (v1.1 §D): same key replay 200;
        //                              distinct keys racing DRAFT→OPEN exactly one 200, one 409 INVALID_STATE_TRANSITION;
        //                              new key against already-OPEN 409 INVALID_STATE_TRANSITION
        // KHÔNG claim Prisma/withDbContext default = SERIALIZABLE — verified by integration suite
        ↓
[existing publish flow resumes, invariant holds]
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
[v1.1 §H correction] [existing P1-A0.4 / P1-E0/E1] Recruiter Workbench MINE rail at canonical
        /admin/recruiter-workbench?view=MINE   (KHÔNG /admin/my-claimed-candidates — does not exist)
        → claim → placement adapter → placement commands
        ↓
[existing N3] SELECTED → CONFIRMED → EFFECTIVE (CLIENT_MANAGED only; HRP_MANAGED fail-closed on EFFECTIVE per C-07 / DEC-08)
```

**The gap**: between `createOrReuseJobOpeningForSlot` (returns DRAFT) and `publishJobPosting` (requires OPEN), there is no production command. Without A0.5, every JobOpening is stuck DRAFT and the marketplace cannot ship a PUBLISHED posting.

**A0.5 inserts two commands at the gap**, with v1.1 §C/§D semantics (typed error, body contracts, preconditions, race semantics, predicate refactor).

##  4. Authority / RLS path from P1-A0.4

P1-A0.4 Scoped Recruiter Authority is the authority contract for any HR_STAFF actor who is not a global `ADMIN` / `HR_MANAGER`. Reuse its predicates unchanged:

| Predicate | Location | Used by A0.5 |
| --- | --- | --- |
| `assertRecruiterAndOrderAssignmentActive` (per-P1-A0.4) | `src/domains/staffing/recruiter-assignment.service.ts` | **Yes** — `openJobOpening` must check active assignment on the parent `StaffingOrder.id` for HR_STAFF callers. v1.1 §E: also used as outer-page RLS gate so HR_STAFF can be admitted to `/admin/job-openings/[id]` ONLY when assignment is active. |
| `assertMutationRole(ctx)` (P1-A0 mutation role set: ADMIN/HR_MANAGER/HR_STAFF) | `src/domains/staffing/job-posting-authoring.service.ts` | **Partial** — `/classify` is ADMIN/HR_MANAGER only (LOCK-03). `/open` is ADMIN/HR_MANAGER OR HR_STAFF with active assignment (LOCK-04 + v1.1 §E). |
| `getAuthContext(req)` + `withDbContext(prisma, ctx, handler)` | `src/shared/auth/auth-context.ts`, `src/shared/auth/with-db-context.ts` | **Yes** — every new route MUST use these unchanged. |
| `withIdempotency({ prisma, route, actorId, key, requestBody, handler })` | `src/shared/integrity/idempotency.ts` | **Yes** — every new route MUST require Idempotency-Key (UUID v4) and pass through this helper. v1.1 §D: for `/open`, body is empty so the hash key uses `(route, actorId, key)` only — payload divergence logic must not be expected. |
| `assertEligibleSlotForNewJobPosting(tx, slotId)` (canonical selector parity) | `src/domains/staffing/job-posting-authoring.service.ts` | **Yes** — `/open` MUST re-evaluate `slot.is_eligible` server-side; selector dropdown is never authorization. v1.1 §D: presence of JobPosting DRAFT MUST NOT cause `/open` to fail (minimal shared-predicate refactor: opening-eligibility = base + open-specific rules, NO `NOT EXISTS job_postings`). |
| `assertClassifiedJobOpening` (DEC-10 NULL fail-closed) | `src/domains/talent/placement.resolution.ts` | **Yes** — `/open` MUST refuse transition when `serviceModel IS NULL`. Same predicate already used downstream by placement; A0.5 just adds the symmetric gate at the activation point. NULL serviceModel → 422 `SERVICE_MODEL_REQUIRED` (carryover pattern `CONSENT_REQUIRED` 422 from `application.service`). |
| `computeManagementMode` (DEC-02 mapping) | `src/domains/talent/placement.lifecycle.ts` | **Indirect** — A0.5 does not call it directly, but `serviceModel` value written by `/classify` will be classified downstream by the existing mapper. No new mapping added. |

**No new authority predicates** are introduced in A0.5. `/classify` and `/open` reuse the existing canonical pattern.

##  5. Threat model (v1.1 corrected)

Each threat below maps to a precondition enforced by `/classify` or `/open` (or by existing downstream invariants). Every threat must have at least one automated test (route unit + service unit + DB integration).

| Threat | Vector | Mitigation in A0.5 | Test name prefix |
| --- | --- | --- | --- |
| **Stale state** — `/open` on already-OPEN/FILLED/CANCELLED opening | Aware client retries with stale id | Atomic predicate `assert status === 'DRAFT'` inside `openJobOpening`; UPDATE filtered by `status = 'DRAFT'`; race semantic: new key against already-OPEN → 409 `INVALID_STATE_TRANSITION` (v1.1 §D) | `OPN-01..OPN-04` |
| **Stale state** — `/classify` on OPEN opening | HR_MANAGER classifies after another actor opened | Atomic `assert status === 'DRAFT'` inside `classifyJobOpening`; UPDATE filtered by `status = 'DRAFT'`; serviceModel immutable once OPEN (LOCK-03) | `CLS-01..CLS-04` |
| **Double open** — two HR_STAFF scoped recruiters race on same opening | Concurrent click + retry | `SELECT … FOR UPDATE` on `job_openings` row inside transaction; UPDATE filtered by `status = 'DRAFT'`; race resolves to one OPEN + one 409 `INVALID_STATE_TRANSITION` (v1.1 §D) | `OPN-05..OPN-08` |
| **Concurrent classify + open** | HR_STAFF opens while HR_MANAGER classifies | Both routes `SELECT … FOR UPDATE` the same row inside their own transactions; UPDATE filtered by `status = 'DRAFT'`. **KHÔNG assume Prisma/withDbContext default = SERIALIZABLE** — verified by integration suite. | `OPN-09..OPN-12` |
| **Revoked assignment at activation time** | HR_STAFF assignment revoked between candidate render and `/open` POST | `openJobOpening` re-checks assignment ACTIVENESS under the same transaction lock; revoked → 403 `NO_ACTIVE_ORDER_ASSIGNMENT` (carryover canonical) | `OPN-13..OPN-15` |
| **serviceModel mutation after OPEN** | HR_MANAGER classifies again after OPEN | `/classify` rejects with `409 INVALID_STATE_TRANSITION`; UPDATE filtered by `status = 'DRAFT'`; serviceModel is immutable once `OPEN` (LOCK-03) | `CLS-05..CLS-07` |
| **serviceModel mutation after placement exists** | HR_MANAGER classifies after Placement row exists | Same as above + additional check: `placementCount === 0` (defense in depth; placement already fail-closed on NULL via `assertClassifiedJobOpening`) | `CLS-08..CLS-09` |
| **`null`/missing/unknown serviceModel incoming** (v1.1 §C) | Client sends body `{ serviceModel: null }` or omits body or sends unknown enum | Zod rejects at route level → 400 `INVALID_INPUT` (typed `JobOpeningActivationError`). **Service MUST NOT write NULL serviceModel as a "valid classified" state.** | `CLS-10..CLS-12` |
| **Idempotency collision** | Two distinct POST bodies share same key | `withIdempotency` hashes `(route, actorId, key, requestBody)` and returns 409 `IDEMPOTENCY_CONFLICT` on mismatch | Route unit |
| **Idempotency replay** | Same actor retries same request | `withIdempotency` returns cached `{body, replayed: true, statusCode: 200}` | Route unit |
| **Missing Idempotency-Key** | Client omits header | Route returns 400 `IDEMPOTENCY_REQUIRED` | Route unit |
| **Role-only bypass for HR_STAFF** | Client sends `actorRole: 'HR_MANAGER'` | `actorRole` is server-derived from `ctx.userId`; never trust client claim. `openJobOpening` reads `ctx.role` server-side. v1.1 §F: Client Component NEVER re-derives authority. | `OPN-16..OPN-18` |
| **Client-side authority bypass** (v1.1 §F) | Client Component decides HR_STAFF can /classify | Server-derived `canClassify` / `canOpen` / `blockedReason` flags gate the Client Component; Client only sends command + displays status; Server re-evaluates every precondition. | Component test `JOBACT-VW-*` |
| **Unassigned HR_STAFF accesses page** (v1.1 §E) | HR_STAFF visits `/admin/job-openings/[id]` without active assignment | Outer page role admission gated by `assertRecruiterAndOrderAssignmentActive`; unassigned → notFound/fail-closed | `OPN-19..OPN-20` |
| **HR_STAFF sees classify selector** (v1.1 §C/§E) | UI bug | Server-derived `canClassify === true` only when `role ∈ {ADMIN, HR_MANAGER}` AND status DRAFT AND placementCount 0; Client Component renders selector only when flag set | Component test |
| **Slot eligibility bypass** | Client claims `slot.is_eligible` from stale dropdown | `assertSlotEligibleForNewJobPosting` re-runs canonical selector inside `/open` transaction. v1.1 §D: presence of JobPosting DRAFT MUST NOT fail `/open` (opening predicate ≠ authoring predicate). | `OPN-21..OPN-22` |
| **Null serviceModel escape** | `/open` succeeds when serviceModel is NULL | `assertClassifiedJobOpening` runs before UPDATE; NULL → 422 `SERVICE_MODEL_REQUIRED` (carryover, analog `CONSENT_REQUIRED` 422) | `OPN-23..OPN-24` |
| **Parent order not OPEN** | Client opens on a CANCELLED or FILLED StaffingOrder | `assertParentOrderOPEN` inside `openJobOpening`; not OPEN → 409 `ORDER_NOT_OPEN` | `OPN-25..OPN-26` |
| **Info leak via error envelope** | Error body reveals actorId, assignment data, PII, DB internals | New routes MUST use canonical safe envelope (`{error, message, ...}`) via typed `JobOpeningActivationError` (analog `AdminApplicationError`). No stack traces; no `assignmentId`; no `staffingOrder.code` unless already public; no Prisma error codes. | Route unit (snapshot envelope) |
| **DTO additive-update leak** (v1.1 §G) | DTO includes `assigneeId`, `actorId`, audit metadata, PII | DTO unit test asserts exact field allowlist; no leak | DTO unit test |
| **CSRF / cross-origin** | Browser submission from non-admin origin | Existing admin middleware enforces same-origin; new routes inherit | Route unit (header presence) |
| **Excessive blast radius** | A0.5 spills into ERP/payroll/CRM/sidebar/n8n | LOCK-07/11 + planner discipline; forbidden paths declared in TASK.md §10 | Forbidden-paths sweep |
| **Schema drift** | A0.5 adds new columns | LOCK-08 — ADOPT only; no migration unless discovery finds blocker (none in §6) | Prisma validate PASS |
| **`PlacementValidationError` reuse for JobOpening activation** (v1.1 §C/§D) | Service reuses PlacementValidationError | New `JobOpeningActivationError` typed class; route unit + service unit verify typed code is NOT `PlacementValidationError` | Route/service unit |

##  6. Discovery note — schema posture

After surveying `prisma/schema.prisma`, `JobOpening` already carries `status` and `serviceModel` columns. No migration is required to close either blocker. The classification and activation are pure mutation authority gaps, not schema gaps. If implementation round discovers any blocker that requires a column or index change, Tier 1 MUST stop and notify T0 (LOCK-08).

**v1.1 §G ADDITIVE READ-MODEL GAP (carried forward to v1.2 §I-06 with exact source field names)**: `JobOpeningDetailDto` is currently INCOMPLETE for server-derived `canClassify` / `canOpen` derivation. A0.5 will additively extend it with `serviceModel`, `placementCount`/`hasPlacement`, and fields needed for server-derived open eligibility (parent `StaffingOrder.status`, **`StaffingOrder.deadlineDate`**, **`StaffingOrderSlot.validTo`**, slot capacity `slotsFilled`/`slotsNeeded`). This is a CUSTOM capability — NOT pre-existing reuse. v1.2 §I-06 mandates the exact source field names; the v1.1 prose "opening deadline" / "slot expiry" are NOT acceptable to substitute for placeholder identifiers — use `StaffingOrder.deadlineDate` and `StaffingOrderSlot.validTo` directly in code.

##  7. Existing integration test registry (to be updated)

`vitest.integration-files.ts` currently includes P1-A0/A0.1/A0.4 and predecessor lanes. A0.5 implementation round MUST register a new `tests/db/p1a05-job-opening-readiness.integration.test.ts` file with the following test families:

- `CLS-AC-01..AC-NN` — `/classify` happy path, `INVALID_INPUT` for `null`/missing/unknown (v1.1 §C), OPEN reject, FILLED reject, role gate, idempotency replay + conflict.
- `OPN-AC-01..AC-NN` — `/open` happy path (ADMIN/HR_MANAGER), HR_STAFF with active assignment, HR_STAFF without assignment, NULL serviceModel reject (422 `SERVICE_MODEL_REQUIRED`), FILLED opening reject, parent order NOT_OPEN reject (409 `ORDER_NOT_OPEN`), slot ineligible reject (409 `SLOT_NOT_ELIGIBLE`), JobPosting DRAFT does NOT fail `/open` (v1.1 §D), concurrent race (v1.1 §D: same-key replay, distinct-key one-200-one-409, new-key-already-OPEN 409), body rỗng.
- `E2E-AC-01..AC-NN` — full no-developer 12-step flow (LOCK-09) split into two layers (v1.1 §H): DB-integration exercises service/route layer on synthetic Neon; Runtime UI/HTTP layer on main-compatible build observes HTTP + browser interaction.
- `JOBACT-VW-01..AC-NN` — component tests for `job-opening-actions.tsx`: HR_STAFF visibility (only OPEN when assigned + preconditions; never classify), ADMIN/HR_MANAGER (both), DIRECTOR/PM (read-only), Client does NOT re-derive authority.
- Predecessor regressions: `p1a04-canonical-flow.integration.test.ts`, `p1a04-r3-substantive.integration.test.ts`, `recruiter-workbench.integration.test.ts`, `placement-lifecycle-integration.test.ts` — all must still PASS unchanged.
- **Inline exact-ID zero-residue assertions ×3** (v1.1 §I) inside the SAME `tests/db/p1a05-job-opening-readiness.integration.test.ts`. NO external `scripts/zero-residue-probe.ps1`.

##  8. Predecessor chain reference (P1 carryover)

- P1-A0 `hrp-p1-a0-jobposting-authoring-publish` — `createOrReuseJobOpeningForSlot` (DRAFT) + `publishJobPosting` (OPEN invariant)
- P1-A0.1 `hrp-p1-a0-1-jobposting-authoring-stamps` — `isHot`/`isUrgent` content fields
- P1-A0.4 `hrp-p1-a0-4-scoped-recruiter-authority` — `StaffingOrderRecruiterAssignment` predicate (the authority source for HR_STAFF `/open`)
- P1-B `hrp-p1-b-public-apply` — anonymous apply path
- P1-E0/E1 `hrp-p1-e0-recruiter-workbench-read-model` / `hrp-p1-e1-recruiter-workbench-ui` — `/admin/recruiter-workbench?view=MINE` rail + claim flow (canonical; v1.1 §H)
- P1-F0/F1 `hrp-p1-f0-placement-command-api` / `hrp-p1-f1-placement-action-ui` — placement commands

A0.5 consumes all of the above unchanged. A0.5 does NOT mutate any of the above artifacts except via addition (new files only).

##  9. RQ → STEP → AC traceability (summary, full chain in TASK.md v1.2)

| RQ | Topic | STEP | AC chain |
| --- | --- | --- | --- |
| RQ-01..RQ-02 | Schema posture — adopt existing columns | (no-op, planning-only) | AC-01 |
| RQ-03 | ServiceModel classification command | STEP-02..STEP-03 | AC-02 |
| RQ-04 | classifyJobOpening service | STEP-01 | AC-03 (v1.1 §C: NULL incoming no longer permitted) |
| RQ-05 | /open route (body rỗng) | STEP-04..STEP-05 | AC-04 |
| RQ-06 | openJobOpening service | STEP-01 | AC-05 (v1.1 §D: full 7-precondition set) |
| RQ-07 | atomic + race-safe | STEP-01 | AC-02, AC-05 |
| RQ-08 | narrow UI Server + Client panel + page-level authorization test (v1.2 §I-04) | STEP-06, STEP-07, STEP-08, STEP-09 | AC-06 |
| RQ-09 | typed `JobOpeningActivationError` envelope | STEP-01, STEP-02, STEP-04 | AC-02, AC-04 |
| RQ-10 | test plan (incl. page-level auth test per v1.2 §I-04) | all | AC-02, AC-04, AC-06, AC-07 |
| RQ-11 | registry update | STEP-14 | AC-15 |
| RQ-12 | production DB NOT_RUN | all | AC-08, AC-09, AC-10, AC-12 |
| RQ-13 (v1.1) | two-layer E2E (DB-integration + Runtime UI on main-compatible deployment; v1.2 §I-03 evidence pinning at `evidence/runtime-ui-e2e-main.md` mandatory + `evidence/runtime-ui-e2e-preview.md` for pre-merge) | STEP-13 | AC-07, AC-E2E-01..AC-E2E-12 |
| RQ-14 (v1.1) | additive DTO update (v1.2 §I-06 exact source field names: `StaffingOrder.deadlineDate`, `StaffingOrderSlot.validTo`) | STEP-10 | AC-06, AC-15 |

| Total (v1.2 §I-01 — sequential STEP-01..STEP-15): **14 RQ + 15 STEP + 27 AC** (15 impl + 12 E2E) = **56 traceability nodes** (arithmetic addition, no subtraction; RQ/STEP entries are NOT counted as AC). See `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` v1.2 §6 for the full chain. v1.1's "51 nodes after subtracting double-counted STEP entries" was invalid arithmetic and is replaced. |

##  10. Open Owner decisions

**0** — All T0 locked decisions are captured in TASK.md v1.1 LOCK-01..LOCK-11 + v1.1 §CHANGES_REQUIRED corrections. No new Owner decision is required for planning round.

##  11. In-scope allowlist (planning-level surface, v1.1 corrected)

```text
prisma/schema.prisma                                                              (READ ONLY — no mutation unless LOCK-08 escape)
prisma/migrations/                                                                (READ ONLY)
src/domains/staffing/job-opening-read.service.ts                                 (ADDITIVE UPDATE — serviceModel, placementCount/hasPlacement, eligibility fields; DTO unit test; NO leak)
src/domains/staffing/job-opening-read.service.test.ts                            (NEW — DTO unit test)
src/domains/staffing/job-posting-authoring.service.ts                            (READ for reuse + minimal shared-predicate refactor in STEP-08c: base + NOT EXISTS job_postings for authoring; opening-eligibility = base + open-specific rules, NO NOT EXISTS job_postings)
src/domains/staffing/job-posting-list.service.ts                                 (READ for reuse + predicate refactor touch if needed)
src/domains/staffing/job-opening-activation.service.ts                          (NEW — classifyJobOpening + openJobOpening + assertCanOpenJobOpening predicates + JobOpeningActivationError typed class)
src/domains/staffing/job-opening-activation.service.test.ts                     (NEW — service unit tests)
src/domains/staffing/job-opening-status.ts                                       (READ ONLY)
src/domains/staffing/recruiter-assignment.service.ts                             (READ ONLY — predicate source for HR_STAFF /open)
src/domains/talent/                                                               (READ ONLY — placement.commands / lifecycle / resolution / service frozen)
src/domains/job-board/                                                            (READ ONLY)
src/domains/applications/                                                         (READ ONLY)
src/shared/auth/                                                                  (READ ONLY)
src/shared/integrity/                                                             (READ ONLY)
src/shared/security/                                                              (READ ONLY)
app/api/admin/staffing/job-openings/                                              (NEW — adds /classify and /open route handlers + route tests)
app/admin/job-openings/[id]/page.tsx                                              (Server Component — outer role admission broadened to include HR_STAFF gated by A0.4 RLS; server-derives canClassify/canOpen/blockedReason; renders <JobOpeningActions>)
app/admin/job-openings/[id]/job-opening-actions.tsx                               (NEW Client Component with 'use client' — narrow action panel; sends commands; calls router.refresh() after success; inline status; NEVER re-derives authority)
app/admin/job-openings/[id]/job-opening-actions.test.tsx                          (NEW — component test for HR_STAFF / ADMIN / HR_MANAGER / DIRECTOR / PM visibility matrix)
app/admin/job-openings/[id]/page.test.tsx                                          (NEW v1.2 §I-04 — page-level authorization test, 8 minimum cases: no session → redirect; ADMIN; HR_MANAGER; DIRECTOR/PM read-only; assigned HR_STAFF; unassigned/revoked HR_STAFF; unsupported role; NO actor/assignment metadata forwarded to Client Component)
app/admin/recruiter-workbench/                                                    (READ ONLY — canonical Workbench used by AC-E2E-08 with ?view=MINE)
app/admin/jobs/job-postings/                                                      (READ ONLY — P1-A0/A0.1 carryover; UI should NOT regress)
app/(jobs)/viec-lam/                                                              (READ ONLY — public visibility)
app/api/public/jobs/                                                              (READ ONLY — anonymous apply)
tests/db/p1a05-job-opening-readiness.integration.test.ts                         (NEW — DB-integration E2E + predecessor regressions + inline exact-ID zero-residue ×3)
vitest.integration-files.ts                                                       (APPEND-only — register the new test file)
.ai-pipeline/scripts/verify-encoding.mjs                                          (READ + RUN)
.ai-pipeline/scripts/verify-encoding-range.mjs                                    (READ + RUN against a64c81e9543... HEAD)
.ai-pipeline/scripts/verify-task.ps1                                              (READ + RUN)
.ai-pipeline/scripts/verify-handoff.ps1                                           (READ + RUN)
```

##  12. Forbidden paths (v1.1 corrected)

```text
app/api/admin/erp/**                                          — NOT in scope
app/api/admin/payroll/**                                      — NOT in scope
src/domains/crm/**                                            — NOT in scope (P1-B carryover read-only)
src/domains/media/**                                          — NOT in scope
src/domains/referrals/**                                      — NOT in scope (read-only carryover)
n8n/**                                                        — MUST NOT call or integrate
sidebar/navigation/menu/IA routes                             — MUST NOT modify admin layout
prisma/migrations/**                                          — MUST NOT add unless LOCK-08 escape
src/domains/talent/placement.{commands,service,lifecycle,resolution}.ts  — MUST NOT mutate
src/domains/staffing/job-posting-authoring.service.ts         — publishJobPosting invariant MUST NOT regress; minimal predicate refactor in STEP-08c only
docs/PLANNER_HANDOVER.md                                      — MUST NOT modify (T0 directive Phase B)
scripts/zero-residue-probe.ps1                                — DOES NOT EXIST — MUST NOT reference
app/admin/my-claimed-candidates                               — DOES NOT EXIST — MUST NOT reference (canonical = /admin/recruiter-workbench?view=MINE)
src/domains/staffing/job-opening-read.service.ts              — additive update only (no schema leak, no actorId/assigneeId/PII)
new toast framework / dependency                              — LOCK-07 — MUST NOT add
client-side business authority                                — v1.1 §F — MUST NOT add (Client Component only sends commands)
reuse PlacementValidationError cho JobOpening activation      — v1.1 §C/§D/§H — MUST use new typed JobOpeningActivationError
```

---

*Survey snapshot v1.2 captured from `origin/main` @ `a64c81e954325091a78ec9fb7f441a094df5dcfc` (P1-A0.4 ACCEPTED closeout PR #68 merged; planning SHA `19790cd5ead47bdf76343d36bfd5b39f4f80b2e1` preserved; v1.1 SHA `dae4bdbb93af807b51da6c54dc64b8d8f56b608b` preserved; NO amend / reset / rebase / force-push). This file is documentation only — planning contract lives in `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` v1.2.*

*v1.2 changes summary (T0-authorized planning integrity exception #1; NOT counted against implementation correction budget):*
- *§I-01 — STEPS renumbered to sequential STEP-01..STEP-15; totals corrected to 14 RQ + 15 STEP + 27 AC = 56 traceability nodes (addition, no subtraction).*
- *§I-02 — Blocker lifecycle clarified: pre-merge AUDIT pins `AUDITED_PENDING_MAIN_MERGE`; final `RESOLVED_BY_P1_A0_5` recorded only after runtime UI/HTTP E2E PASS on main-compatible deployment.*
- *§I-03 — Pre-merge delivery gate separated from post-merge P1 release gate; evidence pinned at `evidence/runtime-ui-e2e-preview.md` (optional) and `evidence/runtime-ui-e2e-main.md` (mandatory).*
- *§I-04 — Page-level authorization test (`page.test.tsx`) added to in-scope roots with 8 minimum cases.*
- *§I-05 — AC-15 wording corrected: added AND modified files within allowlist; NO path outside allowlist may change.*
- *§I-06 — Field/wording integrity: opening deadline = `StaffingOrder.deadlineDate`; slot expiry = `StaffingOrderSlot.validTo`; typo `HR_STAAF` → `HR_STAFF`; `SERVICE_MODEL_REQUIRED = 422` carries explicit typed-activation-error rationale.*
- *§I-07 — Controls bumped to v1.2 (T0_REVIEW, DRAFT, contract NOT accepted by T0, CLOSED, 0 open, planning correction 1 consumed, T0 planning integrity exceptions 1, implementation correction batches 0, next gate T0_CONTRACT_REVIEW).*