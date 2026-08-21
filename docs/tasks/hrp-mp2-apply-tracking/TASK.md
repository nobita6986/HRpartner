# TASK: hrp-mp2-apply-tracking

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp2-apply-tracking` |
| Work type | `CODE` |
| Audit mode (Tier 3 doc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `ead9869` (MP-1 ACCEPTED, 2026-08-21) |
| Modules | `Marketplace MP-2`, `M3 CRM/Staffing` |
| ADR references | `UNIFIED_PLAN_v5.md 7.9.3-7.9.7`; `V5_3_TIER_EXECUTION_GUIDE.md 3.1, 7.3` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/code hrp-mp2-apply-tracking` |
| Updated | `2026-08-21 18:10 +07:00` |

## 1. Outcome

### User-visible outcome

An applicant can open an MP-1 public job, submit an application once, receive a tracking code, and later view a safe status projection without logging in. HR/Sale can see a scoped application queue and the applicant detail needed for the next screening phase.

### Non-goals

- No screening decision actions beyond queue/status-history read and a safe status transition stub owned by MP-3.
- No Worker creation, dedup review, Referral Guard resolution, QUALIFIED/CONVERTED workflow, SourceClaim acceptance, or Assignment activation; these are MP-3.
- No payroll, tax/BHXH, attendance, vendor settlement, commission, OCR/eKYC, or native app.
- No raw file storage implementation or third-party storage dependency. MP-2 persists validated upload metadata and an optional storage key interface only; a storage adapter is a later task.
- Do not bypass RLS or create a public DB user with broad table access.

## 2. Evidence and Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md 7.9.3-7.9.5` | Marketplace requires `CandidateSubmission`, tracking code, status history, idempotency, safe public projection, and no automatic Worker creation. | Add explicit submission/application contracts before MP-3. |
| `EV-02` | `prisma/schema.prisma CandidateSubmission` | Existing model has contact, project, status, review fields and vendor/CTV/source relations, but no slot, tracking code, idempotency hash, upload metadata, or status-history table. | Use additive nullable/schema-safe migration and preserve existing seed rows. |
| `EV-03` | `src/domains/staffing/submission.service.ts` | Existing public apply creates a submission and a `SourceClaim` using `PUBLIC` as worker identity; it has no idempotency or tracking projection. | MP-2 must replace this behavior; never create Worker/SourceClaim for an anonymous applicant. |
| `EV-04` | `app/api/jobs/route.ts`, `app/api/jobs/apply/route.ts` | MP-1 public job read exists; legacy apply routes accept `projectId` and expose an internal-shaped response. | Add canonical slug-based public apply/status endpoints and keep legacy route as compatibility wrapper or explicitly deprecate it. |
| `EV-05` | `src/shared/auth/scopes/ctv.scope.ts`, vendor RLS | CandidateSubmission read scope is currently ADMIN/HR_MANAGER/DIRECTOR/SALE, PM-own-project, vendor-own, CTV-own; HR_STAFF is deny-by-default. | Do not widen RLS in MP-2. Queue roles are `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE`; any HR_STAFF change requires a separate Planner decision. |
| `EV-06` | `docs/tasks/hrp-mp1-admin-publish/TASK.md` | MP-1 public projection and publish command are ACCEPTED; MP-2 may consume their DTO/slug contract. | Do not duplicate public visibility predicate or alter MP-1 publish behavior. |

## 3. Decisions and Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Canonical apply URL is `POST /api/public/jobs/:slug/applications`; legacy `/api/jobs/apply` must not create a Worker/SourceClaim and may delegate to the canonical service. | Tier 1 / V5 7.9.4 | Valid |
| `DEC-02` | `CHOSEN` | Public tracking URL is `GET /api/public/applications/:trackingCode`; response allow-list is status label, submitted time, job title/code, next-step message and safe timestamps only. Never return phone, CCCD, CV key, internal note, vendor/CTV identity, or actor IDs. | Tier 1 / V5 7.9.4 | Valid |
| `DEC-03` | `CHOSEN` | Idempotency uses a server-stored hash of the client key plus canonical payload hash. Same key + same payload replays the original result; same key + different payload returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH`. | Tier 1 / integrity ADR | Valid |
| `DEC-04` | `CHOSEN` | Duplicate guard for an applicant is scoped to the same job slot and normalized phone during an active guard window. It returns the existing tracking result or `409 DUPLICATE_APPLICATION`; it never creates a second submission. Exact cross-job dedup belongs to MP-3. | Tier 1 / V5 7.9.5 | Valid |
| `DEC-05` | `CHOSEN` | Initial status is `NEW`; MP-2 may append `NEW` history and support a controlled `NEEDS_INFO` transition only if the API contract is implemented. `SCREENING`, `QUALIFIED`, `REJECTED`, `WITHDRAWN`, `CONVERTED` transitions beyond initial apply are MP-3-owned. | Tier 1 / state machine boundary | Valid |
| `DEC-06` | `CHOSEN` | Queue readers are `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE` using existing CandidateSubmission scope. HR_STAFF is denied by canonical RLS and is not silently added in this task. | Tier 1 / canonical Visibility Matrix | Valid |
| `DEC-07` | `ASSUMPTION` | CV upload is optional metadata only in MP-2. Accepted MIME allow-list is PDF/JPEG/PNG, max 5 MiB; no executable or HTML files. Actual storage adapter and signed upload URL are deferred. | Tier 1 | Must be revisited before public file upload |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Add additive schema support for `CandidateSubmission.slotId`, unique `publicTrackingCode`, `idempotencyKeyHash`, `idempotencyPayloadHash`, consent timestamp, optional CV metadata, and `ApplicationStatusHistory(submissionId, fromStatus, toStatus, actorUserId, reason, createdAt)`. Existing rows remain readable with backfill-safe defaults. | Must | EV-01/EV-02/DEC-03/DEC-07 | Migration rollback-safe; no destructive rewrite |
| `RQ-02` | Implement canonical public apply with slug + slot validation. Accept minimum consent, full name, normalized phone, slot, optional DOB/gender/experience and validated CV metadata. Only published/open/non-expired jobs with available slot can receive applications. | Must | EV-01/EV-04/DEC-01 | `400/404/409/422`; no partial submission/history rows |
| `RQ-03` | Enforce idempotency and duplicate guard transactionally. Replay returns the original `trackingCode` and status; payload mismatch returns `409`; duplicate active application cannot create another row. | Must | EV-01/DEC-03/DEC-04 | `409` with stable error code; no duplicate audit/state |
| `RQ-04` | Implement public tracking projection by tracking code with rate limiting hook and generic not-found behavior. Do not expose PII or internal review fields. | Must | EV-01/DEC-02 | `404` for unknown/disabled code; no PII leak |
| `RQ-05` | Implement authenticated HR/Sale queue endpoint and detail projection with bounded pagination and filters `status`, `slotId`, `projectId`, `source`, `q`. Apply existing `withDbContext`/scope; no RLS bypass. | Must | EV-01/EV-05/DEC-06 | `401/403`; scoped empty result, not cross-role data |
| `RQ-06` | Provide status-history read and append-only initial event. Any status update must validate the state machine, actor scope and reason; do not implement MP-3 conversion actions. | Must | EV-01/DEC-05 | `409 INVALID_TRANSITION` or `400 REASON_REQUIRED`; no direct status mutation |
| `RQ-07` | Replace public apply UI placeholder with form validation, consent, optional CV metadata state, idempotency submission, success tracking code, and error states. Add applicant tracking page. Add HR queue view using table density consistent with operations UI. | Must | V5 7.10 / EV-04 | UI shows domain error; no silent success or PII in URL |
| `RQ-08` | Preserve MP-1 public job list/detail and legacy apply compatibility without changing publish/RLS semantics. | Must | EV-06 | Regression tests fail the task if MP-1 public read regresses |

### 4.2 Scope boundaries

**In scope:**

- `prisma/schema.prisma` and one additive migration.
- `src/domains/staffing/submission.service.ts` or a canonical `src/domains/applications/*` service; do not duplicate business logic.
- `app/api/public/jobs/[slug]/applications/route.ts`.
- `app/api/public/applications/[trackingCode]/route.ts`.
- Authenticated queue/detail routes under `app/api/admin/applications/*` or existing route convention.
- Public apply/tracking UI and HR application queue UI.
- Unit, integration, security, idempotency and contract tests.

**Out of scope:**

- Worker conversion, dedup/referral decisions, SourceClaim acceptance, assignment, notifications beyond a stub adapter.
- RLS policy expansion for HR_STAFF, public DB credentials, raw file storage, external upload provider.

### 4.3 Data, state, permission and interface rules

- Store phone in normalized form for duplicate comparison; preserve display form only if the existing schema contract permits it.
- `publicTrackingCode` must be high-entropy, non-sequential and non-PII. Never use submission UUID alone as the public code.
- `CandidateSubmission` is not a Worker. Anonymous apply must never create `Worker` or `SourceClaim`.
- Status history is append-only. Current status is changed in the same transaction as its history row.
- Public DTO must be an explicit allow-list. `phone`, `cccdNumber`, `cccdImageUrl`, `cvStorageKey`, `reviewNote`, `vendorId`, `ctvId`, `mergedWorkerId`, `dedupWorkerId`, `blockCode`, and actor IDs are forbidden.
- Queue detail may show contact PII only to a role with existing CandidateSubmission row scope and must use the existing auth/RLS context.
- Idempotency key must be required for public POST; reject missing key with `400 IDEMPOTENCY_KEY_REQUIRED`.
- All BigInt/Date values use the repository's established JSON serialization conventions.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | Prisma schema/migration | Add slot/tracking/idempotency/upload metadata/history table; inspect existing rows and indexes; generate additive migration. | MP-1 schema; DB baseline | `prisma validate`, migration status, schema smoke | Any destructive migration or duplicate existing business key |
| `STEP-02` | RQ-02/03 | Submission domain service | Implement canonical apply transaction, public visibility/slot guard, normalization, consent, idempotency and duplicate response. Remove anonymous SourceClaim/Worker side effect. | Existing MP-1 public projection, integrity helpers | Focused service tests + transaction/idempotency tests | Any path creates Worker/SourceClaim or bypasses transaction |
| `STEP-03` | RQ-04/06 | Tracking/status service/routes | Implement safe tracking DTO, generic 404, initial history and constrained status action if included. | Status machine helper | Projection/IDOR/rate-limit-hook tests | PII/internal notes leak or arbitrary status transition |
| `STEP-04` | RQ-05 | Admin queue/detail routes | Add scoped queue/detail with filters, bounded pagination and explicit projection; roles limited by DEC-06. | `withDbContext`, CandidateSubmission scope | Role matrix + IDOR tests | Query uses unscoped Prisma client or raw bypass |
| `STEP-05` | RQ-07 | Public and HR UI | Build apply form, consent, upload metadata validation, success tracking, tracking page and HR queue states. | Existing MP-1 UI patterns | Build + browser smoke/manual checks where available | UI exposes PII/token or reports success before server response |
| `STEP-06` | RQ-08 | Regression/handoff | Verify MP-1 public list/detail, legacy apply compatibility and all AC evidence; write HANDOFF only after implementation is complete. | Tier 2 template | `verify-task.ps1`, full targeted suite | Missing evidence, scope creep or environment-blocked test reported as PASS |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Additive migration creates required fields/history/indexes; existing CandidateSubmission rows remain readable; Prisma schema valid. | Migration/schema test | Migration SQL, status output, row compatibility check | Yes |
| `AC-02` | RQ-02 | Valid public apply creates exactly one CandidateSubmission + initial history, links the selected slot, and creates no Worker/SourceClaim. Closed/expired/private/full jobs are rejected. | Service/API integration tests | DB row assertions and response fixtures | Yes |
| `AC-03` | RQ-03 | Same idempotency key/payload replays the same tracking result; changed payload returns `409`; duplicate active phone+slot is rejected/replayed; concurrent requests do not create duplicates. | Concurrency/idempotency tests | Exit code + row-count assertions | Yes |
| `AC-04` | RQ-04 | Tracking endpoint returns only safe status projection, has generic 404, does not expose PII/internal fields, and includes next-step label. | Contract/IDOR tests | JSON snapshots + forbidden-field assertions | Yes |
| `AC-05` | RQ-05 | Queue/detail is available only to `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE` within existing scope; pagination/filter works; unauthorized roles get 401/403. | 8-role/security matrix tests | Role-by-endpoint evidence + scoped row assertions | Yes |
| `AC-06` | RQ-06 | Initial status history is append-only and status transitions cannot skip/perform MP-3 transitions; invalid transitions/reasons fail with stable codes. | State-machine tests | Transition matrix output | Yes |
| `AC-07` | RQ-07 | Public apply, success/tracking and HR queue UIs have loading, empty, validation, upload-error and server-error states; no mock disclaimer remains. | Build + browser/manual smoke | Screenshot/video if available, otherwise explicit limitation | Yes |
| `AC-08` | RQ-08 | MP-1 public list/detail and publish behavior remain green; legacy apply route does not create Worker/SourceClaim and has no PII leak. | Regression/full suite | Test output and route contract evidence | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-04` | `AC-05` |
| `RQ-06` | `STEP-03` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-06` | `AC-08` |

## 7. Risk and Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Anonymous apply creates Worker/SourceClaim or leaks PII | DB row or public DTO contains forbidden relation/field | Explicit transaction and allow-list tests | Disable public apply route; retain submissions for review |
| `RISK-02` | Duplicate applications under retries/concurrency | Same key/phone+slot produces two rows | Unique idempotency hash, transaction, duplicate guard and race test | Disable apply; reconcile only through an audited admin command |
| `RISK-03` | Tracking code enumeration/IDOR | Sequential code or cross-applicant response | High entropy code, rate-limit hook, generic 404, no PII | Rotate/disable affected codes and invalidate public status route |
| `RISK-04` | Upload metadata becomes unsafe file storage | Executable/oversized/magic-byte mismatch | MIME/size allow-list; no binary storage in MP-2 | Ignore/delete metadata and disable upload UI |
| `RISK-05` | Queue role/RLS mismatch | HR_STAFF sees unexpected rows or SALE gets 403 unexpectedly | Preserve canonical scope; test roles before changing policy | Stop queue rollout; open separate Planner task for scope change |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None for MP-2 v1.0. CV binary storage provider is explicitly deferred by DEC-07. | - | - | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-21` | Mở MP-2 theo Marketplace-first roadmap sau MP-1 ACCEPTED. | Apply funnel, tracking, queue; giữ boundary MP-3. |
