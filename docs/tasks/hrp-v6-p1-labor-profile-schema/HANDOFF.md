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
| Status | `READY_FOR_EXECUTION` |
| Started/updated | `2026-09-08 15:00 Asia/Bangkok` |
| R1 Status | `BLOCKED` |

## 1. Outcome Summary

Semantic preflight stopped this round before `STEP-01` and before any Prisma mutation. The mechanical TASK gate passes, but execution authority is not determinate: the requested Phase 1A implementation and acceptance artifacts already exist on divergent refs (`3a33212`, `a4ab9f0`) that are not ancestors of current `main`; meanwhile current `main` already carries a different accepted Phase 1B schema history.

The contract also leaves one implementation-changing RLS decision unresolved. A `LaborProfile` may exist with `workerId = NULL` and staff must be able to create profiles, but the requested worker-like policy does not define who owns or may create/read that pre-Worker row. The historical policy demonstrates one possible answer, but it denies `HR_STAFF` creation and cannot derive staff visibility while `worker_id` is null. Tier 2 did not invent an ownership column or silently narrow the stated staff workflow.

No schema, migration, generated client, source, TASK, or AUDIT file was changed. No database command ran; no `.env`, credential, connection string, secret, or PII was read or persisted.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02`, `RQ-03`, `RQ-07` | `prisma/schema.prisma` | `NOT STARTED` — semantic preflight blocked before mutation | `BLK-01`, `BLK-02` |
| `STEP-02` | `RQ-01`, `RQ-02`, `RQ-04` | `CandidateSubmission`, `Worker` relations | `NOT STARTED` — canonical integration authority unresolved | `BLK-01` |
| `STEP-03` | `RQ-05` | additive schema migration | `NOT STARTED` — migration identity/history and literal DDL allowance require Tier 1 resolution | `BLK-01`, `BLK-03` |
| `STEP-04` | `RQ-06` | forward-only RLS migration | `NOT STARTED` — null-Worker ownership and staff creation policy unspecified | `BLK-02` |
| `STEP-05` | `RQ-08` | offline validation, evidence, scope | `PARTIAL` — contract gate and read-only preflight ran; implementation validation cannot run truthfully | `BLK-01..03` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -NoProfile -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath C:\CodeApp\HrP\docs\tasks\hrp-v6-p1-labor-profile-schema\TASK.md -RepoRoot C:\CodeApp\HrP` | exit `0`; `RESULT: PASS` | Mechanical contract gate; `evidence/preflight-blockers.txt` | Semantic blockers remain outside this shape gate |
| `AC-01` | `git grep -n -E '^model (LaborProfile|LaborProfileIntake|EmploymentEpisode)' -- prisma/schema.prisma` | exit `1`; `0` matches | Current main has none of the three models; `evidence/preflight-blockers.txt` | BLOCKED before implementation; AC not claimed PASS |
| `AC-02` | `git grep -n 'laborProfile' -- prisma/schema.prisma` | exit `1`; `0` matches | No current LaborProfile block exists to inspect for soft dedup; `evidence/preflight-blockers.txt` | BLOCKED before implementation; AC not claimed PASS |
| `AC-03` | `git grep -n 'laborProfile' -- prisma/schema.prisma` | exit `1`; `0` matches | No current Worker link exists; `evidence/preflight-blockers.txt` | BLOCKED before implementation; AC not claimed PASS |
| `AC-04` | `git grep -n -E '^model EmploymentEpisode' -- prisma/schema.prisma` | exit `1`; `0` matches | EmploymentEpisode is absent on current main; `evidence/preflight-blockers.txt` | BLOCKED before implementation; AC not claimed PASS |
| `AC-05` | `git diff --cached -- prisma/schema.prisma` | exit `0`; output empty | No schema mutation was staged; `evidence/preflight-blockers.txt` | Cannot prove requested hook because execution stopped |
| `AC-06` | `git show --format= --name-only 3a33212 -- prisma/migrations` | exit `0`; historical schema and RLS migration paths found | Confirms an existing divergent migration lineage; `evidence/preflight-blockers.txt` | Fresh migration would duplicate history; no new SQL generated |
| `AC-07` | `git show 3a33212:prisma/migrations/20260907151901_v6_phase1a_labor_profile_rls/migration.sql` | exit `0`; policy inspected | Historical policy cannot scope `worker_id IS NULL` to HR_STAFF and permits writes only to root roles; `evidence/preflight-blockers.txt` | Tier 1 must define pre-Worker ownership/write semantics |
| `AC-08` | `git grep -n -E '^model Application|^enum Application' -- prisma/schema.prisma` | exit `1`; `0` matches | Current main has no forbidden model/enum; `evidence/preflight-blockers.txt` | This baseline fact does not satisfy the unexecuted deliverable |
| `AC-09` | `git grep -n -E '^model (LaborProfile|LaborProfileIntake|EmploymentEpisode)' -- prisma/schema.prisma` | exit `1`; `0` matches | Prisma generation/typecheck deliberately not run against an unimplemented schema; `evidence/preflight-blockers.txt` | BLOCKED before implementation; AC not claimed PASS |
| `AC-10` | `git status --porcelain=v1` | exit `0`; before this delivery, output listed only paths outside `docs/tasks/hrp-v6-p1-labor-profile-schema/**` | Shared worktree state measured and preserved; `evidence/preflight-blockers.txt` | Final staged scope is measured after writing this HANDOFF |

## 4. Changed Deliverables

- `docs/tasks/hrp-v6-p1-labor-profile-schema/HANDOFF.md` — round 1 truthful BLOCKED handoff.
- `docs/tasks/hrp-v6-p1-labor-profile-schema/evidence/preflight-blockers.txt` — read-only Git, schema, history, RLS, and gate measurements.
- `prisma/schema.prisma` — unchanged.
- `prisma/migrations/**` — unchanged; no second Phase 1A migration lineage created.
- `TASK.md`, `AUDIT.md`, `src/**`, `app/**`, `tests/**`, config, dependencies, and unrelated task artifacts — untouched.

## 5. Deviations

| ID | Type | Evidence | Impact | Decision/closure required from Tier 1 |
|---|---|---|---|---|
| `BLK-01` | Canonical history/baseline | `3a33212` and `a4ab9f0` exist but are not ancestors of current `main`; current main is 56 commits beyond TASK baseline and already contains Phase 1B; divergent history lacks current Phase 1B migration | Reimplementing creates competing migration/evidence histories; merging the branch wholesale can remove/replace accepted Phase 1B work | Designate the canonical atomic integration commits/path and migration identity, then update baseline/status/round authority against current main |
| `BLK-02` | RLS semantics | TASK permits direct staff creation and `LaborProfile.workerId = NULL`; historical policy derives scope only through Worker and restricts `WITH CHECK` to root roles | SQL policy materially changes who may create/read pre-Worker profiles; no contract-safe choice exists | Define ownership and read/write rules for pre-Worker profiles, especially `HR_STAFF`, without asking Tier 2 to invent schema |
| `BLK-03` | Additive DDL wording | TASK requires indexes, uniqueness, and FKs but says migration SQL may contain only `CREATE TABLE` / `ADD COLUMN` | Valid Prisma SQL requires `CREATE INDEX` and `ALTER TABLE ... ADD CONSTRAINT`; literal compliance conflicts with model compliance | Clarify that required indexes/FKs are allowed additive DDL and state the authoritative no-destructive rule |
| `LIM-01` | Validation boundary | No schema implementation was authorized after blockers were confirmed | `prisma generate`, `tsc`, and migration diff would not validate the requested deliverable and could create misleading evidence | Re-run all AC lanes after Tier 1 resolves and issues an executable contract |

## 6. Evidence Index

- `evidence/preflight-blockers.txt` — exact commands, exit codes, current/main ancestry, absent schema probes, divergent implementation inventory, Phase 1B collision measurement, historical RLS semantics, additive-DDL contradiction, and TASK gate output.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Stopped at semantic preflight before Prisma mutation: divergent canonical implementation history, undefined null-Worker RLS ownership/staff-create behavior, and conflicting additive-DDL wording require Tier 1 resolution. |
| `2` | `v1.0` | `READY_FOR_EXECUTION` | Tier 1 RESOLVED 4 blockers 08/09 15:00. See §8. |

## 8. Tier 1 Resolution — R1 BLOCKED (2026-09-08 15:00 Asia/Bangkok)

Tier 1 đọc preflight-blockers.txt, so sánh `3a33212` với `HEAD:prisma/schema.prisma`, xác nhận không conflict với Phase 1B. Bốn semantic blockers đều thuộc quyền Tier 1:

### BLK-01 — Integration path

- **Đo:** `candidate_submissions.labor_profile_id` chưa có trên main (migration `20260831160000` về auth, không phải schema). Schema 1A hoàn toàn additive. Không conflict với 1B.
- **Quyết:** cherry-pick **chỉ 2 file migration** từ `3a33212`, không phải toàn commit. Schema Tier 2 viết mới từ §4.3 TASK trên main.
- **Migration identity mới:** `20260908150000_v6_phase1a_labor_profile_schema` + `20260908150001_v6_phase1a_labor_profile_rls`.
- **Giữ nguyên logic** từ 2 migration ở `3a33212`; chỉ đổi identity.

### BLK-02 — RLS ownership pre-Worker

- **Đo:** V6-DEC-022: nhân sự được tạo LaborProfile trực tiếp. V6-DEC-013: 1 LaborProfile ↔ 0..1 Worker.
- **Quyết:** sửa `hrp_labor_profile_scope` policy `WITH CHECK`:
  - `HR_STAFF INSERT` khi `worker_id IS NULL` (pre-Worker row do chính HR_STAFF tạo).
  - `HR_STAFF READ` khi `worker_id IS NOT NULL` VÀ `workers.assigned_to_id = session_user_id`.
  - Giữ nguyên: ADMIN/HR_MANAGER/DIRECTOR ALL; WORKER/SALE READ qua Worker.
- **Cho phép** HR_STAFF tạo intake cho pre-Worker profile mà họ sở hữu.

### BLK-03 — Additive DDL

- **Đo:** Prisma migrate diff tự sinh CREATE INDEX + ADD CONSTRAINT khi thêm model/relation. §4.4 cũ nói "chỉ CREATE TABLE + ADD COLUMN".
- **Quyết:** §4.4 override: "additive DDL không phá hủy" = cho phép `CREATE INDEX` và `ADD CONSTRAINT ... FOREIGN KEY`. **Cấm** `DROP`, `ALTER COLUMN`, `DROP CONSTRAINT`.

### BLK-04 — Baseline

- **Quyết:** baseline mới = `main @ 97be0b2`. Bump execution round → R2.

> **Giao Tier 2 R2:**
> `/code hrp-v6-p1-labor-profile-schema`
> Schema viết từ §4.3 (dùng `3a33212:prisma/schema.prisma` làm template cho 3 model).
> Migration: identity `20260908150000`/`20260908150001`, giữ nguyên logic `3a33212`.
> RLS: áp dụng BLK-02 resolution (HR_STAFF INSERT khi `worker_id IS NULL`).
> §4.4: additive DDL bao gồm CREATE INDEX + ADD FK.
> Validate: `npx prisma validate` + `prisma generate` + `tsc --noEmit`.
> KHÔNG commit/push.

## 1. Outcome Summary
