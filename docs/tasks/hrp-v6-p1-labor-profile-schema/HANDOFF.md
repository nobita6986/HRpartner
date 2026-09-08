# HANDOFF: hrp-v6-p1-labor-profile-schema

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1-labor-profile-schema` |
| Work type | `SCHEMA` |
| Audit mode (phải khớp TASK) | `SCHEMA_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `2` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| TASK baseline | `main @ 97be0b2` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-08 Asia/Bangkok` |

## 1. Outcome Summary

R2 implemented the additive Phase 1A data foundation on the current Phase 1B-aware schema: `LaborProfile`, `LaborProfileIntake`, and `EmploymentEpisode`; nullable links from `CandidateSubmission`; and Worker back-relations. Two new migration identities contain the generated additive DDL and a separate forward-only RLS policy migration.

The RLS policy follows the resolved contract: root roles retain full access; HR_STAFF may create and read pre-Worker LaborProfiles with `worker_id IS NULL`, may create and read intakes for those profiles, and reads linked profiles through `workers.assigned_to_id`; SALE reads through `workers.owner_id`; WORKER reads through `workers.account_user_id`. No public/anonymous policy or helper replacement was added.

All work and validation stayed offline. No `.env`, database, secret, credential, PII, migrate/seed command, commit, push, merge, or deployment was used.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02`, `RQ-03`, `RQ-07` | `prisma/schema.prisma`: three new models and Worker back-relations | `PASS` — schema validation and static shape checks pass | None |
| `STEP-02` | `RQ-01`, `RQ-02`, `RQ-04` | `CandidateSubmission.laborProfileId`, relation, index | `PASS` — nullable additive hook; no existing CandidateSubmission source line removed | None |
| `STEP-03` | `RQ-05` | `20260908150000_v6_phase1a_labor_profile_schema/migration.sql` | `PASS` — offline Prisma datamodel diff exit 0; no DROP, ALTER COLUMN, or DROP CONSTRAINT | None |
| `STEP-04` | `RQ-06` | `20260908150001_v6_phase1a_labor_profile_rls/migration.sql` | `PASS` — three ENABLE/FORCE pairs and three internal policies; resolved role rules encoded | None |
| `STEP-05` | `RQ-08` | validation, evidence, and staged scope | `PASS` — validate/generate/tsc exit 0; exact-path stage closure completed | None |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -NoProfile -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath C:\CodeApp\HrP\docs\tasks\hrp-v6-p1-labor-profile-schema\TASK.md -RepoRoot C:\CodeApp\HrP` | exit `0`; `RESULT: PASS` | Mechanical TASK contract gate passed before implementation | None |
| `AC-01` | `npx --prefix C:/CodeApp/HrP --no-install prisma validate --schema C:/CodeApp/HrP/prisma/schema.prisma`; model grep | exit `0`; three model declarations found | `evidence/ac01-models.txt` | Offline placeholder URLs were process-local and non-routable; no DB contacted |
| `AC-02` | isolate `model LaborProfile`; list `@unique`; test three identity fields | exit `0`; identity-field unique count `0`, sole model unique is `workerId` | `evidence/ac02-soft-dedup.txt` | Static schema measurement |
| `AC-03` | anchored checks for `LaborProfile.workerId` and `Worker.laborProfile` | exit `0`; counts `1` and `1` | `evidence/ac03-worker-link.txt` | Static schema measurement |
| `AC-04` | anchored checks for required `startedAt`, nullable `endedAt`, ACTIVE status default | exit `0`; each count `1` | `evidence/ac04-episode.txt` | Static schema measurement |
| `AC-05` | `git diff --cached --unified=3 -- prisma/schema.prisma`; isolate CandidateSubmission hunk | exit `0`; removed source lines `0` | `evidence/ac05-submission-hook.txt` | Measures schema source, not live rows; no backfill was in scope |
| `AC-06` | offline `prisma migrate diff` from `HEAD:prisma/schema.prisma` to worktree schema | exit `0`; DROP `0`, ALTER COLUMN `0`, DROP CONSTRAINT `0` | `evidence/ac06-additive.txt` | No migration was applied to a database |
| `AC-07` | exact-token and policy declaration scan of the new RLS migration | exit `0`; ENABLE `3`, FORCE `3`, policies `3`, public/anon `0`, helper replacement `0` | `evidence/ac07-rls.txt` | Static SQL audit only; live application is an Owner/OP action |
| `AC-08` | exact brace-delimited model/enum token scan | exit `0`; exact `Application` model `0`, enum `0`, CandidateSubmission `1` | `evidence/ac08-vocab.txt` | TASK's literal prefix grep also matches existing `ApplicationStatusHistory`; exact token check avoids that false positive |
| `AC-09` | `npx prisma generate`; `npx tsc --noEmit` | exits `0`, `0` | `evidence/ac09-typecheck.txt` | Offline generation/typecheck only |
| `AC-10` | `git status --porcelain=v1`; `git diff --cached --name-only`; allowed-prefix validation | exit `0`; forbidden staged path count `0` | `evidence/ac10-scope.txt` | Shared worktree contains unrelated unstaged paths preserved untouched |

## 4. Changed Deliverables

- `prisma/schema.prisma` — added the three Phase 1A models, Worker back-relations, and nullable CandidateSubmission hook.
- `prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql` — additive schema migration under the R2 identity.
- `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql` — separate forward-only internal RLS migration.
- `docs/tasks/hrp-v6-p1-labor-profile-schema/HANDOFF.md` — R2 execution handoff, retaining R1 history.
- `docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/ac01-models.txt` through `ac10-scope.txt` — real offline acceptance evidence.
- `docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/preflight-blockers.txt` — retained R1 preflight record.
- `TASK.md`, `AUDIT.md`, application source, tests, dependencies, gate scripts, config, and unrelated streams — untouched by Tier 2 R2.

## 5. Deviations

| ID | Type | Evidence | Impact | Closure |
|---|---|---|---|---|
| `LIM-01` | Contract command precision | TASK AC-08 prefix pattern `^model Application` also matches the existing permitted `ApplicationStatusHistory` model | Literal grep exits `0` despite no exact forbidden model; using it alone would produce a false failure | `evidence/ac08-vocab.txt` records an exact brace-delimited token scan: forbidden model/enum count `0`; no contract or source deviation |
| `LIM-02` | Shared worktree | Unrelated unstaged `.ai-pipeline/**`, go-live, and Phase 1B evidence paths appeared during R2 | They are excluded from this task's stage and were not restored, overwritten, staged, or cleaned | `evidence/ac10-scope.txt` records the full status plus forbidden staged path count `0` |
| `LIM-03` | Validation boundary | Database migration and live RLS behavior were deliberately not executed | Static schema, generated SQL, policy structure, client generation, and typecheck are validated; live rollout remains unclaimed | Owner/OP applies and verifies against the authorized target after Tier 3 acceptance |

## 6. Evidence Index

- `evidence/preflight-blockers.txt` — R1 semantic preflight and blockers later resolved by Tier 1.
- `evidence/ac01-models.txt` — Prisma validate plus model declarations.
- `evidence/ac02-soft-dedup.txt` — LaborProfile uniqueness analysis.
- `evidence/ac03-worker-link.txt` — optional one-to-one Worker link.
- `evidence/ac04-episode.txt` — half-open EmploymentEpisode fields.
- `evidence/ac05-submission-hook.txt` — staged CandidateSubmission additive hunk.
- `evidence/ac06-additive.txt` — generated offline SQL and forbidden-DDL counts.
- `evidence/ac07-rls.txt` — RLS declarations and resolved role-rule counts.
- `evidence/ac08-vocab.txt` — exact Application vocabulary fence.
- `evidence/ac09-typecheck.txt` — Prisma client generation and TypeScript check.
- `evidence/ac10-scope.txt` — final worktree/index scope and gate fingerprints.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Semantic preflight stopped before Prisma mutation: divergent implementation history, undefined pre-Worker RLS behavior, additive-DDL wording, and baseline authority required Tier 1 resolution. |
| `2` | `v1.0` | `READY_FOR_AUDIT` | Integrated Phase 1A additively into current Phase 1B schema, authored two newly identified migrations, passed offline validation, and closed exact staged scope. |

Handoff status: READY_FOR_AUDIT
