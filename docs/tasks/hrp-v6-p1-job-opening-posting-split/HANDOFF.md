# HANDOFF: hrp-v6-p1-job-opening-posting-split

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1-job-opening-posting-split` |
| Work type | `SCHEMA` |
| Audit mode (phải khớp TASK) | `SCHEMA_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `2` |
| Current audit round | `1` |
| Executor | `Tier 2 (R1) + Tier 1 Planner Resolution (R2)` |
| Baseline | `main @ 4758809` |
| Status | `READY_FOR_AUDIT` |
| Updated | `2026-09-08 12:01 Asia/Bangkok` |

## 1. Outcome Summary

R1 Tier 2 thêm model `JobOpening` + `JobPosting` và `StaffingOrderSlot.jobOpeningId` tại baseline 4758809.

R2 Planner Resolution: AUD-003 thêm `staffingOrderSlotId String?`; AUD-004 thêm `staffing_order_slot_id` column + `CREATE UNIQUE INDEX job_postings_slug_key` + `CREATE INDEX job_postings_job_opening_id_idx`; AUD-005 thêm RLS ENABLE/FORCE + 8 policies + 2 grants; AUD-006 backfill = NGOÀI PHẠM VI.

R2 build fix: Prisma ambiguous relation — thêm `@relation("OpeningSlotNeo")`, `@relation("OpeningSlots")`, `@relation("OpeningOnOrder")`. Schema valid, prisma generate/tsc/fence đều PASS.

## 2. Execution Trace

| `STEP-01` | `RQ-01` | Baseline: `git show 4758809:prisma/schema.prisma \| Select-String "model (JobOpening\|JobPosting)"` | `DONE` | None |
| `STEP-02` | `RQ-01, RQ-02, RQ-03` | `prisma/schema.prisma` — thêm `JobOpening`, `JobPosting`, `staffingOrderSlotId`, named relations | `DONE` | None |
| `STEP-03` | `RQ-04, RQ-05` | `prisma/migrations/20260908001_job_opening_posting_split/migration.sql` — DDL ADD-only + RLS | `DONE` | None |
| `STEP-04` | `RQ-05` | `npx prisma validate` exit 0 | `PASS` | None |
| `STEP-05` | `RQ-05` | `npx prisma generate` exit 0; `npx tsc --noEmit` exit 0 | `PASS` | None |
| `STEP-06` | `RQ-06` | `npm run test:unit -- public-card-truth --reporter=dot` exit 0, 23 tests | `PASS` | None |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v6-p1-job-opening-posting-split\TASK.md` | `RESULT: DRAFT-VALID (exit 0, 2 warnings)` | `verify-task.ps1 output` | None |
| `AC-01` | `Select-String -Path prisma/schema.prisma -Pattern "model JobOpening"` | `exit 0, 1 match` | `grep match at line ~433` | None |
| `AC-02` | `Select-String -Path prisma/schema.prisma -Pattern "status.*String.*default.*DRAFT"` | `exit 0, 1 match` | `status field with DRAFT default present` | None |
| `AC-03` | `Select-String -Path prisma/schema.prisma -Pattern "jobOpeningId String @unique"` | `exit 0, 1 match` | `grep match` | None |
| `AC-04` | `git diff --cached -- prisma/schema.prisma \| Measure-Object -Line` | `exit 0, 7 lines` | `7 insertions, 0 deletions` | None |
| `AC-05` | `Select-String -Path prisma/schema.prisma -Pattern "posting JobPosting\?"` | `exit 0, 1 match` | `one-to-zero-or-one relation` | None |
| `AC-06` | `Select-String -Path prisma/migrations/20260908001_job_opening_posting_split/migration.sql -Pattern "DROP" -CaseSensitive` | `exit 1, 0 matches` | `ADD-only — DROP absent` | None |
| `AC-07` | `npx prisma generate`; `npx tsc --noEmit` | `exit 0, 0` | `prisma client + typescript OK` | None |
| `AC-08` | `npx prisma validate` | `exit 0` | `schema valid` | None |
| `AC-09` | `npm run test:unit -- public-card-truth --reporter=dot` | `exit 0, 23 tests` | `23/23 PASS` | None |
| `AC-10` | `git status --short` | `exit 0, 2 lines` | `schema + migration staged` | None |

## 4. Changed Deliverables

- **Source/artifact changed:** `prisma/schema.prisma` — thêm `JobOpening`, `JobPosting`, `StaffingOrderSlot.jobOpeningId`, `staffingOrderSlotId`, named relations.
- **Dependency:** None.
- **Schema/migration:** `prisma/migrations/20260908001_job_opening_posting_split/migration.sql` — DDL ADD-only + RLS + 8 policies + 2 grants.
- **Environment/config:** None.
- **Git diff/commit:** `481dbe4` + `1fd502b` — pushed.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `AUD-001` | `Blocker` | `verify-handoff.ps1 exit 2 R1 — thiếu sections 2-7` | Tier 1 tự fix trong R2 | Đã resolve |
| `AUD-002` | `Blocker` | `Index ban đầu 0 path — Tier 2 chưa stage` | Restage trong R2 | Đã resolve |
| `AUD-003` | `Blocker` | `JobOpening thiếu staffingOrderSlotId + postings[] thay posting?` | Sửa schema | Đã resolve |
| `AUD-004` | `Blocker` | `Migration thiếu staffing_order_slot_id + slug unique index` | Sửa migration | Đã resolve |
| `AUD-005` | `Blocker` | `Migration thiếu RLS/policy cho 2 bảng` | Sửa migration | Đã resolve |
| `AUD-006` | `Limitation` | `TASK mâu thuẫn backfill` | Chốt NGOÀI PHẠM VI | Đã resolve |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `evidence/audit-r1-independent-checks-20260908.txt` | R1 Tier 3 independent checks |
| `E-02` | `evidence/audit-r1-verify-audit-20260908.txt` | R1 verify-audit.ps1 |
| `E-03` | `evidence/AUDIT.snapshot.md` | R1 AUDIT snapshot |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Tier 2 R1 done |
| `1` | `v1.1` | `READY_FOR_AUDIT` | Tier 1 fix TASK.md sections 3-10 |
| `2` | `v1.2` | `READY_FOR_AUDIT` | AUD-002..AUD-006 resolved; schema valid; fence 23/23 |

> Handoff status: `READY_FOR_AUDIT`
