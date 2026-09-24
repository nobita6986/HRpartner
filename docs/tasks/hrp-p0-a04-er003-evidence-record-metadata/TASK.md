# TASK — hrp-p0-a04-er003-evidence-record-metadata

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a04-er003-evidence-record-metadata` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Forward-only Neon migration establishes a sensitive-metadata and authorization boundary. |
| Spec version | `v1.3` |
| Status | `ACCEPTED` |
| Planner | `Tier 1A` |
| Execution owner | `Tier 1B` |
| Baseline | `1e1895d16500b273575599cf88853e0d48f08e23` (`origin/main`, post-AFF-04 production-verified #36) |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §5–§7 and §17 (P0-A04); contract blob `4ec7160732a4c106d991f596d570708c1b6717a8` @ `5852e14ae1b89f347ab8912a9b28a56445755fe7` |
| In-scope roots | Exact File Allowlist at §4.5 |
| Forbidden paths | All paths outside the allowlist; especially `docs/PLANNER_HANDOVER.md`, `app/**`, `src/domains/evidence/**`, existing migrations, AFF/CRM work, runtime wiring, routes, environment/config, and package files. |
| Required gates | T0 contract approval; Prisma validate/generate; typecheck; lint; unit; guarded DB integration; clean-chain migration; task/handoff verification; scope check; Tier 3 LIGHT. |
| Next gate | `NONE — MERGED_AND_PRODUCTION_VERIFIED` |

> This is a metadata-schema slice only. It does not accept, upload, read, serve, delete, or audit an evidence blob; it does not enable real-evidence/CCCD ingestion. Synthetic test bytes and synthetic identifiers remain sufficient for all coding and CI evidence.

## 1. Outcome

Create an additive Neon `evidence_records` metadata boundary for one canonical owner kind in this first slice: `LABOR_PROFILE`.

- The record stores metadata only; never file bytes, public URLs, absolute filesystem paths, provider roots, credentials, or request payloads.
- `storage_key` is a logical, non-public identifier and is globally unique. The later `storeEvidence` command must mint it through the existing `asStorageKey` boundary before persisting a record.
- `owner_id` has a real foreign key to `labor_profiles`, not a generic polymorphic reference that cannot be authorized or checked.
- The table ships fail-closed: RLS is enabled and forced; `PUBLIC`, `app_user`, and `app_user_writer` receive no privilege and no policy in this slice. A later, separately reviewed runtime slice must add any grant/policy together with canonical authorization.

## 2. Evidence

| ID | Source | Finding / limit |
|---|---|---|
| `EV-01` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §5–§7 | Canonical conceptual fields, logical storage-key shape, and rule that Neon stores metadata rather than file binaries. It also requires access/delete audit and backup policy before real rollout; those are not ER-003 runtime deliverables. |
| `EV-02` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 P0-A04–A06 | ER-003 is additive EvidenceRecord metadata; store/read commands and their cleanup/authorization are later slices. |
| `EV-03` | `src/domains/evidence/evidence-storage.port.ts` | `StorageKey` is an opaque logical identifier; `asStorageKey` rejects absolute paths and URL-shaped values. The port deliberately owns no EvidenceRecord, RBAC, audit, retention, or quarantine policy. |
| `EV-04` | `src/domains/evidence/local-vps-evidence-storage.adapter.ts` | ER-002 implements storage only and explicitly defers EvidenceRecord metadata to ER-003+. It is not imported or changed here. |
| `EV-05` | `prisma/schema.prisma:1398-1427`; `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql` | `LaborProfile` is the canonical first owner. Existing parent RLS is not blanket authority for new sensitive metadata, so generic ownership and inherited grants are not assumed. |
| `EV-06` | `prisma/schema.prisma:1677-1693` | Existing `MediaAssignment` documents why generic `ownerType` + `ownerId` has no Prisma relation. That precedent is unsuitable as authorization proof for ER-003 sensitive metadata. |
| `EV-07` | `vitest.integration-files.ts:1-62`; `scripts/ci/integration-preflight.mjs` | DB tests must register in the canonical guarded integration lane; an absent/refused test DB or all-target-skipped result is BLOCKED, never PASS. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `ER003-DEC-01` | Create one additive `evidence_records` table and Prisma `EvidenceRecord` model. No old migration or existing model changes. | `CHOSEN` |
| `ER003-DEC-02` | The only initial owner type is `LABOR_PROFILE`. Persist `owner_type = 'LABOR_PROFILE'` plus `owner_id` with an FK to `labor_profiles(id)` and `ON DELETE RESTRICT`. Add a DB check that prevents another owner type. A future owner kind requires a new approved migration/contract; no generic polymorphic ownership now. | `CHOSEN` |
| `ER003-DEC-03` | Persist exactly: UUID `id`; `ownerType`; `ownerId`; initial allowlisted `evidenceType`; unique logical `storageKey`; sensitive `originalFilename`; declared `mimeType`; non-negative `sizeBytes` as Prisma `BigInt` / SQL `BIGINT`; SHA-256 `checksum`; lifecycle `status`; `createdAt`; nullable FK `createdByUserId`; nullable `deletedAt`. `originalFilename` is basename metadata only (no `/` or `\\`) and must never be logged or exposed by ER-003. | `CHOSEN` |
| `ER003-DEC-04` | `checksum` is lowercase, 64-character SHA-256 hexadecimal. `sizeBytes` is a non-negative SQL `BIGINT`. The slice must use DB constraints for structural invariants, but must not claim Prisma validation or direct SQL alone makes a `StorageKey` safe. | `CHOSEN` |
| `ER003-DEC-05` | Initial evidence types are exactly the plan's six values: `CCCD_FRONT`, `CCCD_BACK`, `PORTRAIT`, `CONTRACT`, `CERTIFICATE`, `OTHER`. More types need a later migration; no speculative enum expansion. | `CHOSEN` |
| `ER003-DEC-06` | Lifecycle values are `PENDING`, `AVAILABLE`, `QUARANTINED`, `DELETED`. `deleted_at` is non-null exactly for `DELETED`; ER-003 adds no transition command, retention job, hard delete, or quarantine workflow. | `CHOSEN` |
| `ER003-DEC-07` | Enable and force RLS; explicitly revoke all table privileges from `PUBLIC`, `app_user`, and `app_user_writer`; create no application policy or grant. ER-003 therefore exposes no metadata access path. Later ER-005/ER-006 must introduce authorization, grants, and policies together after a dedicated contract review. | `CHOSEN` |
| `ER003-DEC-08` | `created_by_user_id` is nullable and FK-constrained when present. The future command must define the authenticated user/system-actor contract before inserting runtime records; ER-003 does not invent a system identity. | `CHOSEN` |
| `ER003-DEC-09` | Retention duration, access-audit sink/retention/recovery, backup/restore, real-evidence rollout, MIME/content inspection, size limits, and public/read API semantics are deferred. They neither authorize runtime nor block this no-runtime metadata migration. | `DEFERRED_NOT_A_BLOCKER` |

## 4. Contract

### 4.1 Data and database invariants

- `storage_key` is `NOT NULL`, globally unique, nonblank, and rejects URL-shaped or absolute filesystem-path forms. Relative logical keys such as `labor-profile/{profileId}/{evidenceId}` remain valid.
- The persistence boundary is not a substitute for the port: later writers must still call `asStorageKey` and the adapter remains responsible for traversal/symlink/root validation.
- `original_filename` is `NOT NULL`, a basename only, and treated as sensitive metadata. It may contain personal information; it is not an allowed log, audit, public response, or storage-path field.
- `checksum` must satisfy the exact SHA-256 form; `size_bytes >= 0`; `mime_type` is nonblank declared metadata only, not proof of content safety.
- FK references are `owner_id → labor_profiles(id)` (`RESTRICT`) and `created_by_user_id → users(id)` when present. No orphan owner record is allowed.
- Required indexes are a global unique `storage_key`, owner listing `(owner_type, owner_id, created_at)`, and `created_by_user_id` when present. No public URL column exists.

### 4.2 Security boundary

- Migration explicitly enables and forces RLS, revokes table privileges from `PUBLIC`, `app_user`, and `app_user_writer`, and creates no policy for application roles.
- No `SECURITY DEFINER`, role creation/attribute change, default-privilege alteration, blanket grant, or RLS change to existing tables is permitted.
- ER-003 neither inherits `LaborProfile` RLS nor claims application roles can access a record merely because they can access its owner. That authorization is a later runtime-slice responsibility.

### 4.3 Non-goals and deferred work

- No `EvidenceStorage` import, adapter construction, filesystem access, environment read, upload/read/delete route, public/static URL, signed URL, audit/event emission, quarantine command, retention job, backup, or real-evidence enablement.
- No blob write exists, so no metadata/blob transaction, partial-artifact cleanup, MIME inspection, file-size enforcement, or checksum calculation implementation belongs here. ER-005 owns that workflow.
- `CCCD_*` enum labels are only metadata vocabulary from the roadmap. They do not authorize collecting, uploading, or testing real CCCD.

### 4.4 Execution safety

- The executor rebases on then-current `origin/main` and chooses exactly one new timestamped migration directory ending `_er003_evidence_record_metadata`; it must not edit a migration already applied anywhere.
- Migration is forward-only. Before application, rollback is branch revert; after application a new compensating migration requires its own review. No destructive down migration or row cleanup is authorized.
- All DB fixtures use synthetic users and LaborProfiles. No production credential, production data, or real evidence is used.

### 4.5 Exact Implementation File Allowlist

1. `prisma/schema.prisma`
2. Exactly one new `prisma/migrations/*_er003_evidence_record_metadata/migration.sql`
3. `tests/db/er003-evidence-record-metadata.integration.test.ts` (new)
4. `vitest.integration-files.ts` (registration only, if canonical integration lane requires it)
5. `docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/**`

All other paths are forbidden. In particular, no file under `src/domains/evidence/**`, `app/**`, existing migration, `docs/PLANNER_HANDOVER.md`, AFF, CRM, package/config, or environment file may change.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|
| `STEP-01` | baseline + schema | Re-confirm current schema, RLS/default privilege posture, and integration registration after rebase. Define model/enums/relations with the narrow LaborProfile ownership constraint. | `AC-01`, `AC-06` | Stop if latest main makes the exact relation or migration path conflict. |
| `STEP-02` | new migration only | Add table, FKs, indexes, checks, forced RLS, explicit revokes, and no policy/grant. | `AC-02`, `AC-03`, `AC-05` | Stop if implementation needs a role/default-privilege/existing-RLS change or runtime code. |
| `STEP-03` | guarded DB test | Prove clean chain, valid synthetic insert, uniqueness/FK/check failures, lifecycle invariant, and deny posture for application roles. | `AC-03`–`AC-06` | Missing/refused DB or skipped target is `BLOCKED`; stop if seeding requires a production-like credential. |
| `STEP-04` | gates and handoff | Run canonical gates, record executed/skipped counts, freeze implementation SHA, and request Tier 3 LIGHT. | `AC-07` | No push/PR/merge/deploy before evidence and audit are complete. |

## 6. Acceptance

### 6.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Add a Prisma/Neon EvidenceRecord model with only the fields and lifecycle in DEC-01–DEC-06. |
| `RQ-02` | First owner is FK-bound `LABOR_PROFILE`; no generic polymorphic authority or orphan owner record. |
| `RQ-03` | `storage_key`, checksum, filename, size, lifecycle, and public-addressability invariants are structurally enforced and tested. |
| `RQ-04` | New metadata table is fail-closed: forced RLS, no application privilege/grant/policy, no existing RLS mutation. |
| `RQ-05` | Clean migration chain and guarded synthetic DB test prove behavior; no production DB/data/evidence. |
| `RQ-06` | Diff stays within the exact allowlist and all canonical quality gates are recorded. |

### 6.2 Acceptance criteria

| AC | Requirement | Pass condition | Verification method |
|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-02` | Prisma validates/generates; model maps to `evidence_records`; `owner_type` is constrained to `LABOR_PROFILE`; both declared relations resolve. | `npx prisma validate`; `npx prisma generate`; schema assertions in DB test. |
| `AC-02` | `RQ-01`, `RQ-05` | A clean synthetic DB applies the full migration chain including exactly one new ER-003 migration without drift or failed migration. | Run `CI_INTEGRATION_STRICT=1 npm run test:integration`; target test records migration apply and executes, not skips. |
| `AC-03` | `RQ-02`, `RQ-03` | Synthetic valid row persists; duplicate storage key, missing owner/user, invalid owner type, invalid checksum, negative size, non-basename filename, unsafe/blank key, and inconsistent deleted status/timestamp are rejected. | `CI_INTEGRATION_STRICT=1 npm run test:integration`; target file reports executed tests and zero target skips. |
| `AC-04` | `RQ-03` | Catalog/model contains neither blob/public-URL/path-root/token columns nor blob bytes; filename is treated as sensitive metadata in tests/log fixtures. | Run `CI_INTEGRATION_STRICT=1 npm run test:integration` with DB catalog assertions, then run `rg -n "publicUrl|public_url|rootPath|root_path|token|bytea" prisma/schema.prisma prisma/migrations/*_er003_evidence_record_metadata/migration.sql`. |
| `AC-05` | `RQ-04` | `relrowsecurity` and `relforcerowsecurity` are true; `PUBLIC`, `app_user`, and `app_user_writer` have no table privilege and no policy; no existing table policy changes. | Guarded catalog assertion in the ER-003 DB test plus diff scope review. |
| `AC-06` | `RQ-05` | Test database uses synthetic fixtures only; missing/refused DB or all target skips fails as `BLOCKED`, never PASS. | Integration preflight output and explicit target executed/skipped counts in HANDOFF. |
| `AC-07` | `RQ-06` | Prisma validate/generate, typecheck, lint, unit, build, guarded integration, task/handoff verification, baseline-pinned whitespace/scope checks, and Tier 3 LIGHT pass. | Run the canonical commands plus `git diff --check <baseline>..HEAD`, `git diff --name-only <baseline>..HEAD`, and `git status --porcelain`; AUDIT/HANDOFF records the exact baseline and results. |

### 6.3 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01`, `STEP-03` | `AC-01`, `AC-03` |
| `RQ-03` | `STEP-02`, `STEP-03` | `AC-03`, `AC-04` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-05` |
| `RQ-05` | `STEP-03` | `AC-02`, `AC-06` |
| `RQ-06` | `STEP-04` | `AC-07` |

### 6.4 Canonical verification commands

1. `npx prisma validate`
2. `npx prisma generate`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run test:unit`
6. `npm run build`
7. `CI_INTEGRATION_STRICT=1 npm run test:integration`
8. `pwsh .ai-pipeline/scripts/verify-task.ps1 "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/TASK.md"`
9. `pwsh .ai-pipeline/scripts/verify-handoff.ps1 "docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/HANDOFF.md"`
10. `git diff --check <baseline>..HEAD`, `git diff --name-only <baseline>..HEAD`, and `git status --porcelain` for an exact allowlist scope check against the rebased baseline.

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Generic owner reference creates records that cannot be authorized or FK-checked. | Single `LABOR_PROFILE` owner type + FK/check in this slice; future owner types need a new contract/migration. |
| `RISK-02` | New metadata table becomes readable through implicit/default grants or a copied parent policy. | Explicit revokes, forced RLS, and no policy/application grant; catalog assertions prove posture. |
| `RISK-03` | Storage key or filename becomes a path/public-addressability escape. | Structural checks reject obvious unsafe forms; later writers must call `asStorageKey`; no API/wiring here. |
| `RISK-04` | Metadata fields are mistaken for content safety or audit/retention completion. | Explicit deferred boundary; no real evidence or runtime action is enabled by ER-003. |
| `RISK-05` | Migration safety is inferred from Prisma syntax alone. | Clean-chain guarded DB test and Tier 3 LIGHT; production apply remains a separate T0 gate. |

## 8. Open Questions

| Item | State | Owner / reopen trigger |
|---|---|---|
| Retention duration, hard-delete process | `DEFERRED_NOT_A_BLOCKER` | Owner/operations before real-evidence rollout or any retention worker. |
| Access/delete audit sink, retention, recovery access | `DEFERRED_NOT_A_BLOCKER` | Owner/operations and ER-008 contract before a read/delete path. |
| Backup/restore and verification drill | `DEFERRED_NOT_A_BLOCKER` | P0-A10 before irreplaceable evidence at scale. |
| MIME inspection, size limits, checksum calculation, metadata/blob compensation | `DEFERRED_NOT_A_BLOCKER` | ER-005 storeEvidence contract. |
| Protected read authority and exposure shape | `DEFERRED_NOT_A_BLOCKER` | ER-006 contract. |
| Additional owner/evidence types | `DEFERRED_NOT_A_BLOCKER` | Separate contract/migration with canonical owner and authorization proof. |
| Real-evidence rollout | `DEFERRED_NOT_A_BLOCKER` | P0-A gate; no actual CCCD/PII upload is implied or needed for ER-003 coding. |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `PROPOSED_ONLY` | Initial ER-003 contract created from `origin/main@e4d2180`; no source, schema, migration, runtime, or planner cursor change. |
| 2 | `PROPOSED_ONLY` | T0 correction: constrain first owner to LaborProfile FK, establish deny-by-default RLS/grants, move key validation to its real boundary, make invariants/test evidence measurable, and defer real-evidence operations without making them a coding blocker. |
| 3 | `READY_FOR_EXECUTION` | T0 execution authorization (2026-09-24) chấp thuận ER003-DEC-01..08 và giữ ER003-DEC-09 = `DEFERRED_NOT_A_BLOCKER`. Execution baseline `1e1895d16500b273575599cf88853e0d48f08e23` (origin/main, post-AFF-04 production-verified). Tier 1B gộp Planner + Engineer; semantic contract §§1–§8 giữ nguyên. Slice metadata-only: KHÔNG runtime, KHÔNG upload, KHÔNG ghi CCCD thật. Production DB/migration/deploy vẫn thuộc T0. |

## 10. Revision Log

### Round 6 — T1A closeout (2026-09-24)

| Field | Before | After |
|---|---|---|
| Spec version | `v1.2.2` | `v1.3` |
| Status | `READY_FOR_AUDIT` | `ACCEPTED` |
| Next gate | `T0_MERGE_DECISION` | `NONE — MERGED_AND_PRODUCTION_VERIFIED` |

Changes: T0 verification PASS (PR #37 squash-merged at `2fb4dee919ccb045121a01fb8b87897b90e57f93`; final PR head `bae89fab1200de94b2358d9caa55f7ba04f9ea40`; CI run `35979076741` PASS). Production read-only verification confirmed migration `20260924120000_er003_evidence_record_metadata` finished and not rolled back; `evidence_records` has 13 columns, RLS + FORCE RLS, 0 policies, 0 forbidden grants to `PUBLIC` / `app_user` / `app_user_writer`, and 0 rows. No production mutation was performed by the closeout verification. Contract closed out as metadata-only slice.

### Round 5 — T0 post-audit freeze (2026-09-24)

| Field | Before | After |
|---|---|---|
| Spec version | `v1.2.2` | `v1.2.2` (unchanged; control/evidence sync only) |
| Status | `READY_FOR_EXECUTION` | `READY_FOR_AUDIT` (verifier-compatible terminal delivery status; Tier 3 already PASS) |
| Next gate | `TIER3_LIGHT_AUDIT` | `T0_MERGE_DECISION` |
| Tier 3 | Round 1 `BLOCKED` | LIGHT/DELTA round 2 `PASS`; `verify-audit.ps1` PASS |

Changes: record the Tier 3 round-2 verdict and move control metadata to the T0 merge gate. No semantic contract, migration, schema, test, runtime, registration, or environment change.

### Round 3 — T1B correction (2026-09-24)

| Field | Before | After |
|---|---|---|
| Spec version | `v1.2.1` | `v1.2.2` |
| Status | `READY_FOR_AUDIT` | `READY_FOR_AUDIT` |
| Integration test (AC-05) | writer "sees 0 rows even as ADMIN GUC" via $transaction | writer SELECT inside $transaction with set_config in same tx raises PostgreSQL SQLSTATE 42501; surfaced through PrismaClientUnknownRequestError; GUC does not bypass RLS; no reliance on P2025 |
| Migration CHECK | `position('\\' in ...)` unprefixed (non-conforming) | `position(E'\\' in "original_filename") = 0` escape literal, byte length exactly 1 (verified: `length(E'\\')=1`) |
| HANDOFF AC-05 | "sees 0 rows even as ADMIN GUC" | "SELECT rejected SQLSTATE 42501 regardless of ADMIN GUC" |

Changes: migration backslash CHECK fix (ER003-R3-F1); integration test RLS expectation fix (ER003-R3-F2); HANDOFF sync AC-05 + DEV-04 + §5. AUDIT.md Tier 3 artifact unchanged.

### Round 4 — T1B evidence-sync (2026-09-24)

| Field | Before | After |
|---|---|---|
| Spec version | `v1.2.2` | `v1.2.2` (unchanged; documentation-only evidence-sync) |
| Status | `READY_FOR_AUDIT` | `READY_FOR_AUDIT` (unchanged) |
| BLK-01 | ENV_BLOCKED in this sandbox; no DATABASE_URL_TEST / DATABASE_URL_ADMIN_TEST | RESOLVED_BY_T0_SYNTHETIC_DB_RUN after T0 provisioned local PostgreSQL 18 synthetic dedicated DB (NOT Neon staging, NOT production, no production credential) |
| AC-02 / AC-03 / AC-05 / AC-06 | CI-only authoritative execution in CI Integration lane | PASS per T0 authoritative run: clean chain 47/47 migrations applied; posture POSTURE_OK (app_user_writer rolsuper=false rolbypassrls=false; postgres admin rolsuper=true rolbypassrls=true); targeted ER-003 19/19 it() cases PASS; full canonical integration 26/26 test files PASS, 481 passed, 2 intentional skip, 0 failed; ER-003 within full run 19/19 PASS |
| E-11 | `CI_INTEGRATION_STRICT=1 npm run test:integration`; ENV_BLOCKED in sandbox | exact sequence: `container-test-db --phase=pre` → `prisma migrate deploy` (47/47) → `prisma migrate status` (up to date) → `container-test-db --phase=post` → posture check (POSTURE_OK) → targeted ER-003 (19/19) → recreate clean DB → full integration (26/26 files, 481 passed) |

Changes: HANDOFF sync §1 changed-surface row (no ENV_BLOCKED wording); §2 AC-02/03/05/06 promoted to PASS; AC-04 wording corrected (3-hit classification, not "0 hits"); §3 E-11 exact sequence; §4 BLK-01 -> RESOLVED_BY_T0_SYNTHETIC_DB_RUN; §5 final status + round 4 revision-log entry. AUDIT.md Tier 3 artifact unchanged. No code/test/migration/schema/registration/runtime/env change. No production migration/deploy/smoke PASS claimed. No Tier 3 PASS pre-judged.

### Round 2 — T1B correction (2026-09-24)

| Field | Before | After |
|---|---|---|
| Spec version | `v1.2` | `v1.2.1` |
| Status | `READY_FOR_AUDIT` | `READY_FOR_AUDIT` |
| T3 AUD findings addressed | — | AUD-001 (E-04 truthful 3-hit classification); AUD-002 (14-test -> 19-assertion / 19 it() cases); AUD-003 (15 $executeRawUnsafe surface acknowledged as intentional design) |
| Scope | Metadata-only; no code change | Unchanged |

Changes: documentation-only corrections to HANDOFF.md sections 1, 2, 3 (E-04), 4 (DEV-03), 5.
No migration, schema, test, source, or AUDIT.md (Tier 3 artifact) altered.


| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial documentation-only proposal | T1A prepared a thin-slice contract for P0-A04. |
| `v1.1` | `2026-09-22` | T0 substantive correction | Remove ambiguous polymorphic authorization and optional RLS; align metadata boundary, migration safety, and measurable DB evidence with the real plan/ER-001/ER-002 limits. |
| `v1.2` | `2026-09-24` | T0 execution authorization (follow-up commit, no amend) | Bump `Spec version` v1.1 → v1.2; `Status` `PROPOSED_ONLY` → `READY_FOR_EXECUTION`; `Execution owner` `UNASSIGNED` → `Tier 1B`; `Baseline` `e4d2180` → `1e1895d1` (origin/main post-AFF-04 #36); `Next gate` `T0_CONTRACT_REVIEW` → `TIER3_LIGHT_AUDIT`; record T0 decision set (ER003-DEC-01..08 APPROVED, ER003-DEC-09 `DEFERRED_NOT_A_BLOCKER`); execution contract authority = TASK v1.1 blob `4ec71607...` @ `5852e14...`. Semantic contract §§1–§8 giữ nguyên. |
| `v1.3` | `2026-09-24` | T1A closeout | Close task as ACCEPTED after T0 production verification. |
