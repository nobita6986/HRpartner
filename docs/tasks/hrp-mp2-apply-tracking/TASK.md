# TASK: hrp-mp2-apply-tracking

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp2-apply-tracking` |
| Work type | `CODE` |
| Audit mode (Tier 3 doc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `5d75011` (docs-only delta từ `ead9869` MP-1 ACCEPTED — 45880b0/76fcaef/5d75011 chỉ đổi docs; code baseline không đổi. Đóng DEV-01 round 1) |
| Modules | `Marketplace MP-2`, `M3 CRM/Staffing` |
| ADR references | `UNIFIED_PLAN_v5.md 7.9.3-7.9.7`; `V5_3_TIER_EXECUTION_GUIDE.md 3.1, 7.3` |
| Current execution round | `2` |
| Current audit round | `0` |
| Next gate | `/code hrp-mp2-apply-tracking` (round 2 — sau khi sếp chạy OP-01 tạo role trên dev) |
| Updated | `2026-08-22 09:20 +07:00` |

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
| `EV-07` | `prisma/migrations/20260816212000_s1_rls_vendor/migration.sql`, `20260821103500_m13_restore_rls_matrix/migration.sql` | `candidate_submissions` has `ENABLE`+`FORCE ROW LEVEL SECURITY`; the policy `WITH CHECK` permits INSERT only for `ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT/SALE`, `VENDOR_*` (own vendor), `CTV` (own). Policies read tx-local GUC via `hrp_session_role()`. Anonymous/`WORKER` is denied INSERT and M13 does not redefine this table. | No RLS-compliant principal exists for anonymous public apply. A controlled definer boundary is required; RLS must not be widened. |
| `EV-08` | `app/api/jobs/apply/route.ts`, `src/domains/staffing/submission.service.ts` | Legacy route builds `ctx = { userId: 'PUBLIC', role: 'WORKER' }` and calls `applyForJob` WITHOUT `applyRlsContext`; the service then also creates a `SourceClaim`. `app.role` GUC is unset → `hrp_session_role()` NULL → the write is not RLS-legitimate under FORCE RLS. | Legacy path is a latent security/scope defect. MP-2 must REPLACE it via the canonical definer boundary, never extend it; strip the anonymous `SourceClaim`/`Worker` side effect. |
| `EV-09` | `prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql` | M13 already defines `SECURITY DEFINER` helper functions (`hrp_project_visible_for`, `hrp_worker_visible_for`, `hrp_project_writable`). | `SECURITY DEFINER` is an established, Tier-3-familiar pattern; the public boundary reuses it rather than inventing a new mechanism. |
| `EV-10` | Tier 2 HANDOFF round 1 `LIM-01` (`npx tsc --noEmit`) | Full-repo `tsc --noEmit` exits non-zero with PRE-EXISTING errors in attendance/reconciliation/security/staffing and `mp1.contract.test.ts`, none in MP-2 files. | MP-2 verification uses targeted `vitest` + `prisma validate` + scoped build. Full-repo clean `tsc` is NOT a gate; Tier 2 must show no NEW type errors in MP-2 files (diff vs baseline). |

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
| `DEC-08` | `CHOSEN` | **Public write/read boundary = SECURITY DEFINER RPC.** Anonymous public apply and public tracking read execute EXCLUSIVELY through narrowly-scoped `SECURITY DEFINER` SQL functions (e.g. `hrp_public_apply_submission(...)`, `hrp_public_tracking_projection(tracking_code)`) owned by a dedicated **NOLOGIN BYPASSRLS** role `hrp_public_rpc`, invoked by the app's normal `app_user_writer` connection via `$queryRaw`. RLS stays `ENABLE`+`FORCE` and UNCHANGED for every real role; NO public DB login; NO broad table grant; the public path MUST NOT set `app.role` to an authenticated role (e.g. `ADMIN`) to bypass RLS. The function surface IS the whole public boundary: minimal body, `REVOKE EXECUTE FROM PUBLIC`, `GRANT EXECUTE` only to `app_user_writer`/`app_user`, pinned `SET search_path`, all inputs validated and parameterized. Resolves round-1 `BLK-01`. | Tier 1 / sếp-approved Option A / M13 SECURITY DEFINER precedent (EV-09) | Valid |
| `DEC-09` | `CHOSEN` | **Role provisioning is an OP, not a migration.** Creating/altering `hrp_public_rpc` (`NOLOGIN BYPASSRLS`) is an OPERATION owned by sếp per environment (dev now, prod at cutover), reusing the OP-03 idempotent `scripts/create-db-roles.*` pattern; on Neon this may require `neon_superuser` to grant `BYPASSRLS`. Prisma migrations MUST NOT run `CREATE ROLE ... BYPASSRLS` (privileged, would fail mid-apply, and prod migration is SQL-direct per DEC-NEW-04/05). Migration only: `CREATE FUNCTION ... SECURITY DEFINER`, `ALTER FUNCTION ... OWNER TO hrp_public_rpc`, `GRANT/REVOKE EXECUTE`, and additive schema — all assuming the role pre-exists (OP-01). | Tier 1 / OP-03 precedent / DEC-NEW-04/05 | Valid |

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
| `RQ-09` | Perform the anonymous public apply write, its idempotency/duplicate reads, and the public tracking projection ONLY through the `hrp_public_rpc`-owned `SECURITY DEFINER` functions (DEC-08). Do NOT widen RLS, create a public DB login, or set `app.role` to an authenticated role on the public path. `app_user_writer`/`app_user` stay RLS-enforced; a direct anonymous INSERT into `candidate_submissions` from the app path stays denied. Ship an idempotent role-provisioning script for OP-01; the migration assumes the role pre-exists. | Must | EV-07/EV-08/EV-09/DEC-08/DEC-09 | Fail if any anonymous write occurs outside the definer function, RLS is widened, `app.role` is impersonated, or the migration itself creates the BYPASSRLS role |

### 4.2 Scope boundaries

**In scope:**

- `prisma/schema.prisma` and one additive migration.
- `SECURITY DEFINER` functions for public apply + tracking, owned by `hrp_public_rpc`, with `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE` to `app_user_writer`/`app_user`, created inside the additive migration (role assumed pre-provisioned by OP-01).
- A committed, idempotent role-provisioning script deliverable (extend `scripts/create-db-roles.*` or add `scripts/create-public-rpc-role.*`) that sếp runs as OP-01. Authoring the script is Tier-2 scope; EXECUTION on dev/prod is OP (owner sếp).
- `src/domains/staffing/submission.service.ts` or a canonical `src/domains/applications/*` service; do not duplicate business logic.
- `app/api/public/jobs/[slug]/applications/route.ts`.
- `app/api/public/applications/[trackingCode]/route.ts`.
- Authenticated queue/detail routes under `app/api/admin/applications/*` or existing route convention.
- Public apply/tracking UI and HR application queue UI.
- Unit, integration, security, idempotency and contract tests.

**Out of scope:**

- Worker conversion, dedup/referral decisions, SourceClaim acceptance, assignment, notifications beyond a stub adapter.
- RLS policy expansion for HR_STAFF, public DB credentials, raw file storage, external upload provider.
- `CREATE ROLE`/`BYPASSRLS` grant inside a Prisma migration; running the provisioning script against prod (that is OP-01, owner sếp). Granting `BYPASSRLS` to any application/login role.

### 4.3 Data, state, permission and interface rules

- Store phone in normalized form for duplicate comparison; preserve display form only if the existing schema contract permits it.
- `publicTrackingCode` must be high-entropy, non-sequential and non-PII. Never use submission UUID alone as the public code.
- `CandidateSubmission` is not a Worker. Anonymous apply must never create `Worker` or `SourceClaim`.
- Status history is append-only. Current status is changed in the same transaction as its history row.
- Public DTO must be an explicit allow-list. `phone`, `cccdNumber`, `cccdImageUrl`, `cvStorageKey`, `reviewNote`, `vendorId`, `ctvId`, `mergedWorkerId`, `dedupWorkerId`, `blockCode`, and actor IDs are forbidden.
- Queue detail may show contact PII only to a role with existing CandidateSubmission row scope and must use the existing auth/RLS context.
- Idempotency key must be required for public POST; reject missing key with `400 IDEMPOTENCY_KEY_REQUIRED`.
- All BigInt/Date values use the repository's established JSON serialization conventions.
- The public apply/tracking functions are `SECURITY DEFINER`, owned by `hrp_public_rpc` (NOLOGIN BYPASSRLS), with `REVOKE EXECUTE FROM PUBLIC`, `GRANT EXECUTE` to `app_user_writer`/`app_user` only, and a pinned `SET search_path = public, pg_temp`.
- `hrp_public_rpc` MUST NOT be granted to any application/login role and MUST own only these public functions. `app_user_writer`/`app_user` MUST NOT be granted `BYPASSRLS`.
- The apply function performs, in one transaction: validate the job is public + open + non-expired with an available slot; compute/compare the idempotency hash and the duplicate guard (job/slot + normalized phone); INSERT exactly one `candidate_submissions` (status `NEW`, `vendor_id`/`ctv_id` NULL) plus its initial `ApplicationStatusHistory`; NEVER create `Worker`/`SourceClaim`; RETURN only `{ trackingCode, status }`; `RAISE` a defined SQLSTATE for duplicate / idempotency-payload-mismatch that the route maps to `409`.
- The tracking function returns only the DEC-02 allow-listed columns; unknown/disabled code yields the generic not-found path with no row-existence signal.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `OP-01` | RQ-09 | DB role provisioning (**OWNER: sếp**, not Tier 2) | Run the committed idempotent script to create `hrp_public_rpc` (`NOLOGIN BYPASSRLS`) on dev now (prod at cutover). Tier 2 cannot execute this; it only ships the script. | DEC-09; OP-03 pattern; may need `neon_superuser` on Neon | `SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname='hrp_public_rpc'` (masked evidence) | Role missing/misconfigured blocks round-2 dev execution |
| `STEP-01` | RQ-01/09 | Prisma schema/migration + definer functions | Add slot/tracking/idempotency/upload metadata/history table; inspect existing rows and indexes; generate additive migration; in the SAME migration create the `hrp_public_rpc`-owned `SECURITY DEFINER` apply+tracking functions with `REVOKE EXECUTE FROM PUBLIC`/`GRANT EXECUTE` to app roles; ship the OP-01 provisioning script. Role assumed pre-provisioned. | MP-1 schema; DB baseline; EV-07/09 | `prisma validate`, migration status, schema smoke, function owner/`prosecdef` introspection | Any destructive migration, duplicate business key, `CREATE ROLE` in migration, or function not owned by `hrp_public_rpc` |
| `STEP-02` | RQ-02/03/09 | Submission domain service | Implement canonical apply by INVOKING `hrp_public_apply_submission` via `$queryRaw` from the app path; map SQLSTATE→409; enforce public/slot guard, normalization, consent, idempotency and duplicate response inside the function/transaction. Remove the anonymous `SourceClaim`/`Worker` side effect from `submission.service.ts`/legacy route. | Existing MP-1 public projection, integrity helpers | Focused service tests + transaction/idempotency tests | Any path creates Worker/SourceClaim, bypasses the transaction, or sets `app.role` to an authenticated role on the public path |
| `STEP-03` | RQ-04/06/09 | Tracking/status service/routes | Implement safe tracking DTO via `hrp_public_tracking_projection`, generic 404, initial history and constrained status action if included. | Status machine helper | Projection/IDOR/rate-limit-hook tests | PII/internal notes leak or arbitrary status transition |
| `STEP-04` | RQ-05 | Admin queue/detail routes | Add scoped queue/detail with filters, bounded pagination and explicit projection; roles limited by DEC-06. Uses authenticated `withDbContext` + existing scope; NO definer bypass on this path. | `withDbContext`, CandidateSubmission scope | Role matrix + IDOR tests | Query uses unscoped Prisma client or raw bypass |
| `STEP-05` | RQ-07 | Public and HR UI | Build apply form, consent, upload metadata validation, success tracking, tracking page and HR queue states. | Existing MP-1 UI patterns | Build + browser smoke/manual checks where available | UI exposes PII/token or reports success before server response |
| `STEP-07` | RQ-09 | Security-boundary verification | Assert role attributes (`NOLOGIN`/`BYPASSRLS`), function owner + `prosecdef`, EXECUTE grants (PUBLIC revoked, app roles granted), and a NEGATIVE test proving the app path CANNOT INSERT `candidate_submissions` with anonymous/`WORKER` context (RLS denies) — i.e. the definer function is the only write path; grep the public route for absence of `app.role` impersonation. | EV-07/08/09; DEC-08/09 | pg_roles/pg_proc introspection + grant listing + negative RLS test + route grep | `app_user_writer` can insert directly, or the public path impersonates a role |
| `STEP-06` | RQ-08 | Regression/handoff | Verify MP-1 public list/detail, legacy apply compatibility and all AC evidence; write HANDOFF only after implementation is complete. | Tier 2 template | `verify-task.ps1`, full targeted suite | Missing evidence, scope creep or environment-blocked test reported as PASS |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Additive migration creates required fields/history/indexes; existing CandidateSubmission rows remain readable; Prisma schema valid. | Migration/schema test | Migration SQL, status output, row compatibility check | Yes |
| `AC-02` | RQ-02 | Valid public apply creates exactly one CandidateSubmission + initial history via the `hrp_public_rpc` definer function, links the selected slot, and creates no Worker/SourceClaim; a direct anonymous INSERT stays RLS-denied. Closed/expired/private/full jobs are rejected. | Service/API integration tests | DB row assertions and response fixtures | Yes |
| `AC-03` | RQ-03 | Same idempotency key/payload replays the same tracking result; changed payload returns `409`; duplicate active phone+slot is rejected/replayed; concurrent requests do not create duplicates. | Concurrency/idempotency tests | Exit code + row-count assertions | Yes |
| `AC-04` | RQ-04 | Tracking endpoint returns only the safe status projection (via `hrp_public_tracking_projection`), has generic 404, does not expose PII/internal fields, and includes next-step label. | Contract/IDOR tests | JSON snapshots + forbidden-field assertions | Yes |
| `AC-05` | RQ-05 | Queue/detail is available only to `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE` within existing scope; pagination/filter works; unauthorized roles get 401/403. | 8-role/security matrix tests | Role-by-endpoint evidence + scoped row assertions | Yes |
| `AC-06` | RQ-06 | Initial status history is append-only and status transitions cannot skip/perform MP-3 transitions; invalid transitions/reasons fail with stable codes. | State-machine tests | Transition matrix output | Yes |
| `AC-07` | RQ-07 | Public apply, success/tracking and HR queue UIs have loading, empty, validation, upload-error and server-error states; no mock disclaimer remains. | Build + browser/manual smoke | Screenshot/video if available, otherwise explicit limitation | Yes |
| `AC-08` | RQ-08 | MP-1 public list/detail and publish behavior remain green; legacy apply route does not create Worker/SourceClaim and has no PII leak. | Regression/full suite | Test output and route contract evidence | Yes |
| `AC-09` | RQ-09 | The public write/read path uses ONLY the definer functions; `hrp_public_rpc` is `NOLOGIN`+`BYPASSRLS` and owns the functions; `EXECUTE` is revoked from `PUBLIC` and granted to app roles only; `app_user_writer`/`app_user` stay RLS-enforced (negative direct-INSERT is denied); the public path never sets `app.role` to an authenticated role; the migration does not create the role. | Security-boundary tests (`STEP-07`) | `pg_roles`/`pg_proc` introspection, grant listing, negative RLS test output, public-route grep | Yes |

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
| `RQ-09` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-07` (OP-01 role prereq) | `AC-09` |

## 7. Risk and Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Anonymous apply creates Worker/SourceClaim or leaks PII | DB row or public DTO contains forbidden relation/field | Explicit transaction and allow-list tests | Disable public apply route; retain submissions for review |
| `RISK-02` | Duplicate applications under retries/concurrency | Same key/phone+slot produces two rows | Unique idempotency hash, transaction, duplicate guard and race test | Disable apply; reconcile only through an audited admin command |
| `RISK-03` | Tracking code enumeration/IDOR | Sequential code or cross-applicant response | High entropy code, rate-limit hook, generic 404, no PII | Rotate/disable affected codes and invalidate public status route |
| `RISK-04` | Upload metadata becomes unsafe file storage | Executable/oversized/magic-byte mismatch | MIME/size allow-list; no binary storage in MP-2 | Ignore/delete metadata and disable upload UI |
| `RISK-05` | Queue role/RLS mismatch | HR_STAFF sees unexpected rows or SALE gets 403 unexpectedly | Preserve canonical scope; test roles before changing policy | Stop queue rollout; open separate Planner task for scope change |
| `RISK-06` | Definer function over-privileged / SQL injection / `search_path` hijack | Function accepts unsanitized input, dynamic SQL, or unpinned `search_path` | Minimal body, parameterized inputs, pinned `SET search_path`, `REVOKE EXECUTE FROM PUBLIC`, owner NOLOGIN, function code reviewed in audit | `CREATE OR REPLACE`/drop the function; disable the public route |
| `RISK-07` | `BYPASSRLS` role misused or leaked to a login role | `hrp_public_rpc` granted to an app/login role, or an app role granted `BYPASSRLS` | Owner NOLOGIN, owns only these functions, never granted to app/login roles; app roles never `BYPASSRLS`; introspection asserted in `AC-09`/`STEP-07` | `REVOKE` misuse; rotate/rebuild the role; re-run STEP-07 introspection |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | CV binary storage provider is explicitly deferred by DEC-07. | - | - | No |
| `Q-02` | RESOLVED (v1.1): public anonymous write principal under FORCE RLS — resolved by DEC-08 (SECURITY DEFINER RPC owned by `hrp_public_rpc`) + DEC-09 (OP-01 role provisioning). | Tier 1 / sếp | Closed | No |

## 9. Planner Resolution

| Round/Source | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| Exec round 1 HANDOFF | `BLK-01` | Adopt Option A: public apply/tracking via `hrp_public_rpc`-owned `SECURITY DEFINER` RPC (DEC-08) + OP-01 role provisioning (DEC-09). RLS unchanged; no bypass by app roles; no `ADMIN` impersonation on the public path. | EV-07/08/09: FORCE RLS leaves no anonymous-write principal; a NOLOGIN BYPASSRLS-owned definer function is the minimal audited boundary and matches the M13 SECURITY DEFINER precedent. Sếp approved Option A. | Added DEC-08/09, EV-07..10, RQ-09; amended STEP-01/02/03; added OP-01/STEP-07; amended AC-02/04; added AC-09; added RISK-06/07. Spec → v1.1. | Tier 1 closes; sếp owns OP-01 provisioning; Tier 2 executes round 2 after dev role exists. |
| Exec round 1 HANDOFF | `DEV-01` | Accept baseline realignment. | 45880b0/76fcaef/5d75011 are docs-only vs `ead9869`; code baseline unchanged. | §0 Baseline → `5d75011` (docs-only delta note). | Closed. |
| Exec round 1 HANDOFF | `LIM-01` | Full-repo `tsc --noEmit` is NOT an MP-2 gate; use targeted `vitest` + `prisma validate` + scoped build. | Pre-existing errors in attendance/reconciliation/security/staffing/`mp1.contract.test.ts`, none in MP-2 files. | Added EV-10; STEP-06 verify wording. | Accepted baseline diagnostic; Tier 2 shows no NEW MP-2 type errors. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-21` | Mở MP-2 theo Marketplace-first roadmap sau MP-1 ACCEPTED. | Apply funnel, tracking, queue; giữ boundary MP-3. |
| `v1.1` | `2026-08-22` | Resolve round-1 `BLK-01`: chọn ranh giới public-write = `SECURITY DEFINER` RPC do role `hrp_public_rpc` (NOLOGIN BYPASSRLS) sở hữu; thêm DEC-08/09, EV-07..10, RQ-09, OP-01/STEP-07, AC-09, RISK-06/07; RLS giữ nguyên, không bypass bởi app role, không impersonate `ADMIN`. Đóng DEV-01/LIM-01. | Tier 2 HANDOFF round 1 BLOCKED (BLK-01/DEV-01/LIM-01); sếp duyệt Option A. |
