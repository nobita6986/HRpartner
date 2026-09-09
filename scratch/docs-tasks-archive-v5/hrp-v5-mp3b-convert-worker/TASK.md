# TASK: hrp-v5-mp3b-convert-worker

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-mp3b-convert-worker` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | Primary agent under explicit Founder waiver |
| Executor | Primary agent under explicit Founder waiver |
| Auditor | Primary agent self-audit under explicit Founder waiver |
| Baseline | `58058b2` |
| Modules | `MP-3 / V5-PORTAL-03 / V5-M35-02 / V5-M35-04` |
| ADR references | `UNIFIED_PLAN_v5.md` §7.9.3–§7.9.7; `V5_3_TIER_EXECUTION_GUIDE.md` marketplace launch gate |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `MP-3C assignment preview/activate contract` |
| Updated | `2026-08-24 Asia/Bangkok` |

## 1. Outcome

HR can convert a `QUALIFIED` application into one canonical Worker, or explicitly link a reviewed dedup candidate, while creating exactly one accepted SourceClaim. The operation is authenticated, scoped, transactional, audited, idempotent and safe under concurrent conversion attempts.

### Non-goals

- Assignment preview/activation, quota and `1-ACTIVE` enforcement (MP-3C).
- Automatic merge based on a single phone/CCCD/referral hint.
- Applicant screening UI or assignment UI.
- Production deployment or deletion of the temporary test database.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `UNIFIED_PLAN_v5.md` §7.9.4–§7.9.5 | Convert is a separate command after `QUALIFIED`; `CONVERTED` requires `workerId` and an accepted claim. | Add canonical conversion link and POST action. |
| `EV-02` | Baseline Prisma schema | `mergedWorkerId` represents dedup merge and cannot represent successful conversion. | Add separate nullable `workerId` relation. |
| `EV-03` | Existing `one_accepted_source` index | DB already protects one accepted claim per Worker. | Add complementary accepted-claim uniqueness per submission. |
| `EV-04` | Marketplace launch gate | Conversion race and duplicate Worker protection require real-DB evidence. | Add guarded LIVE race test in the integration lane. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Convert roles are `ADMIN` and `HR_MANAGER`; queue/read permissions are unchanged. | MP-3A role boundary | Final for MP-3B |
| `DEC-02` | CHOSEN | Any exact phone, CCCD or dedup hint match requires explicit HR selection; no one-key auto-merge. | Referral/dedup guard | Final |
| `DEC-03` | CHOSEN | `workerId` is the canonical converted Worker link; `mergedWorkerId` remains a distinct MERGED branch. | Plan state invariant | Final |
| `DEC-04` | CHOSEN | Conversion acquires `(id,status,version)` lock before Worker/claim creation inside one `withDbContext` transaction. | Conversion race gate | Final |
| `DEC-05` | CHOSEN | Same converted submission with a valid Worker/claim replays as `changed=false`; broken invariant fails closed. | Critical POST idempotency | Final |
| `DEC-06` | CHOSEN | Tier independence is waived by the Founder for MP-3B only; later slices return to normal Tier separation. | User authorization | This task only |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Add a canonical nullable `CandidateSubmission.workerId` relation distinct from `mergedWorkerId`, with safe migration/backstops. | Must | EV-01/02/03 | Schema/migration gate fails. |
| `RQ-02` | Expose authenticated `POST /api/admin/applications/:id/actions/convert` for ADMIN/HR_MANAGER; require reason and `QUALIFIED`. | Must | EV-01 | Stable 400/403/404/409 response. |
| `RQ-03` | With no dedup candidate, transaction creates one normalized Worker and links it to the submission. | Must | Plan §7.9 | Entire transaction rolls back on failure. |
| `RQ-04` | Any dedup match stops for explicit review; selected Worker must be from the returned candidate set. | Must | EV-04 | `DEDUP_REVIEW_REQUIRED` or `DEDUP_SELECTION_INVALID`. |
| `RQ-05` | Conversion creates exactly one accepted SourceClaim with direct/vendor/CTV attribution and writes status history + audit. | Must | EV-01/03 | Conflict/invariant error and rollback. |
| `RQ-06` | Version lock, replay behavior and DB uniqueness prevent conversion races and orphan child rows. | Must | EV-04 | `STALE_VERSION`/conflict, no residue. |
| `RQ-07` | MP-2 apply/tracking/RLS security remains green after migration. | Must | Marketplace regression gate | Acceptance blocked. |
| `RQ-08` | Unit, typecheck, lint and production build pass. | Must | Quality gate | Acceptance blocked. |

### 4.2 Scope boundaries

**In scope:** Prisma relation/migration, conversion domain service, API action route, dedup review contract, SourceClaim attribution, unit/route/LIVE race tests and evidence.

**Out of scope:** assignment creation, quota mutation, assignment UI, automatic merge, production deploy and test-DB cleanup.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** `workerId` and `mergedWorkerId` must never be conflated; one accepted claim per Worker and per non-null submission is enforced by partial unique indexes.
- **State:** only `QUALIFIED → CONVERTED`; replay of an intact converted aggregate is a no-op.
- **Permission/data scope:** authenticate first; only ADMIN/HR_MANAGER; all application writes use `withDbContext` and the RLS writer principal.
- **Interface:** request accepts non-empty `reason`, optional non-negative `expectedVersion`, and optional `existingWorkerId` selected from dedup candidates.
- **Failure/concurrency:** stable error codes; losing race cannot leave Worker, SourceClaim, history or audit residue.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | Prisma schema/migration | Separate Worker link, FK/index and accepted-claim backstop. | MP-3A enum/version | validate + migrate deploy/status | Schema drift or unsafe migration. |
| `STEP-02` | `RQ-02` | convert route/service | Auth, role, input/state contract and stable errors. | withDbContext | unit + route tests | Unauthorized/invalid transition succeeds. |
| `STEP-03` | `RQ-03` | conversion aggregate | Create normalized Worker and link submission. | STEP-01/02 | service + LIVE test | Partial aggregate possible. |
| `STEP-04` | `RQ-04` | dedup candidate selection | Fail closed and require explicit valid selection. | existing Worker keys | unit tests | One-key match auto-merges. |
| `STEP-05` | `RQ-05` | SourceClaim/history/audit | Attribution and exactly-once evidence. | STEP-03/04 | unit + LIVE counts | Missing/duplicate evidence row. |
| `STEP-06` | `RQ-06` | OCC/race | Lock first, replay no-op, two-client LIVE race. | version column | LIVE race | Orphan/duplicate row. |
| `STEP-07` | `RQ-07` | MP-2 boundary | Re-run LIVE apply/tracking and security suites. | safe test DB | 23/23 PASS | Any regression. |
| `STEP-08` | `RQ-08` | repository quality | Full unit, typecheck, scoped lint, build. | all steps | exit 0 | Any error. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Schema validates and 22 migrations are up to date on the safe test DB. | Prisma validate/deploy/status | PASS | Yes |
| `AC-02` | `RQ-02` | Route authenticates, scopes, validates and maps errors; forbidden roles/state fail. | Unit/route tests | PASS | Yes |
| `AC-03` | `RQ-03` | New conversion creates and links exactly one Worker. | Service + LIVE test | PASS | Yes |
| `AC-04` | `RQ-04` | One-key match requires review; only returned candidate may be linked. | Service tests | PASS | Yes |
| `AC-05` | `RQ-05` | Exactly one accepted attributed SourceClaim, history and audit exist. | Unit + LIVE counts | PASS | Yes |
| `AC-06` | `RQ-06` | Concurrent commands yield one converted aggregate and no orphan/duplicate rows; replay is no-op. | Two-client LIVE race + unit | PASS | Yes |
| `AC-07` | `RQ-07` | MP-2 LIVE suite remains 23/23 green. | Integration lane | PASS | Yes |
| `AC-08` | `RQ-08` | Full unit, typecheck, scoped lint and production build succeed. | Quality commands | PASS | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-07` |
| `RQ-08` | `STEP-08` | `AC-08` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Conversion race creates orphan Worker. | Competing QUALIFIED commands. | Lock application first inside one transaction; DB unique indexes; LIVE race. | Revert scoped commit/migration before production deploy. |
| `RISK-02` | A phone-only match merges the wrong person. | Dedup candidate exists. | Stop for explicit selection; expose safe IDs/matched fields only. | Leave submission QUALIFIED for review. |
| `RISK-03` | Accepted source becomes ambiguous. | Existing accepted claim conflicts. | Fail closed plus per-worker/per-submission partial indexes. | Resolve source ownership outside conversion, then retry. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. | — | — | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | None | `ACCEPT` | Audit PASS; all AC green including real conversion race and MP-2 regression. | None | Tier 1 closed under MP-3B waiver. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-24` | Initial and resolved MP-3B conversion/dedup contract. | Founder waiver; audit round 1 PASS. |
