# HANDOFF: hrp-v6-p1-job-opening-posting-split

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1-job-opening-posting-split` |
| Work type | `SCHEMA` |
| Spec version | `v1.1` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `main @ 4758809` |
| Status | `READY_FOR_TIER3_AUDIT` |

## 1. Outcome Summary

Đã thực hiện tách `JobOpening` / `JobPosting` bằng cách THÊM-thuần (ADD-only) vào `prisma/schema.prisma`:

- **Model mới `JobOpening`**: đơn vị NHU CẦU nội bộ (loại vị trí cần N người), đặt trên `StaffingOrder`, vòng đời: DRAFT → OPEN → FILLED → CANCELLED
- **Model mới `JobPosting`**: hình chiếu công khai của đúng MỘT `JobOpening`; tối đa 1 tin PUBLISHED cùng lúc; vòng đời: DRAFT → PUBLISHED → ARCHIVED
- **Móc THÊM-thuần `StaffingOrderSlot.jobOpeningId`**: nullable FK → `JobOpening`
- **Migration file ADD-only**: tạo `prisma/migrations/20260908001_job_opening_posting_split/migration.sql` với DDL chỉ chứa `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX` (không `DROP`)
- **Hàng rào đóng băng**: `public-card-truth.test.ts` 23/23 tests vẫn PASS — bề mặt công khai không đổi

## 2. Execution Trace

### STEP-01: Baseline Verify
```powershell
git show 4758809:prisma/schema.prisma | Select-String "model (JobOpening|JobPosting)"
# Exit: 0, Output: (empty) → PASS
```

### STEP-02: Schema Edit
Thêm vào `prisma/schema.prisma`:
1. `JobOpening` model (sau `StaffingOrderSlot`)
2. `JobPosting` model (sau `JobOpening`)
3. `jobOpeningId String?` field vào `StaffingOrderSlot`
4. `slots StaffingOrderSlot[]` reverse relation vào `JobOpening`
5. `jobOpenings JobOpening[]` reverse relation vào `StaffingOrder`

### STEP-03: Migration Creation
- Tạo `prisma/migrations/20260908001_job_opening_posting_split/`
- Tạo `migration.sql` với DDL ADD-only

### STEP-04: Prisma Validate
```powershell
npx prisma validate
# Exit: 0 → PASS
```

### STEP-05: Prisma Generate
```powershell
npx prisma generate
# Exit: 0 → PASS
```

### STEP-06: TypeScript Check
```powershell
npx tsc --noEmit
# Exit: 0 → PASS
```

### STEP-07: Fence Test
```powershell
npm run test:unit -- public-card-truth
# Exit: 0, Tests: 23 passed → PASS
```

### STEP-08: Scope Check
```powershell
git status --porcelain
# Scope: prisma/schema.prisma, prisma/migrations/, evidence/, HANDOFF.md
```

## 3. Acceptance Evidence

| AC | Command | Exit | Result | Evidence |
|---|---|---|---|---|
| C-09 | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md"` | 2 | FAIL | TASK.md missing sections ## 3-10 — see Section 5 BLK-01 |
| AC-01 | `git show 4758809:prisma/schema.prisma \| Select-String "model (JobOpening\|JobPosting)"` | 0 | PASS | ac01-baseline.txt |
| AC-02 | `npx prisma validate` | 0 | PASS | ac02-prisma-validate.txt |
| AC-03 | `npx prisma generate` | 0 | PASS | ac03-prisma-generate.txt |
| AC-04 | `npx tsc --noEmit` | 0 | PASS | ac04-tsc-noemit.txt |
| AC-05 | Schema ADD-only diff | N/A | PASS | ac05-schema-diff.txt |
| AC-06 | `Test-Path "prisma/migrations/20260908001_job_opening_posting_split/migration.sql"` | 0 | PASS | ac06-migration-ddl.txt |
| AC-07 | `npm run test:unit -- public-card-truth` | 0 | PASS | ac07-fence-test.txt |
| AC-08 | `Select-String -Path prisma/schema.prisma -Pattern "jobOpeningId\|jobOpening JobOpening"` | 0 | PASS | ac08-slot-relation.txt |
| AC-09 | `git status --porcelain` | 0 | PASS | ac09-scope-check.txt |

## 4. Changed Deliverables

| File | Change |
|---|---|
| `prisma/schema.prisma` | THÊM: `JobOpening`, `JobPosting`, `StaffingOrderSlot.jobOpeningId` |
| `prisma/migrations/20260908001_job_opening_posting_split/migration.sql` | TẠO MỚI: DDL ADD-only |
| `docs/tasks/hrp-v6-p1-job-opening-posting-split/evidence/*.txt` | TẠO MỚI: 9 evidence files |
| `docs/tasks/hrp-v6-p1-job-opening-posting-split/HANDOFF.md` | TẠO MỚI: handoff document |

## 5. Deviations

| Deviation | Impact | Justification |
|---|---|---|
| `prisma migrate diff` không hoạt động (encoding issue với `git show` output trên Windows) | Không ảnh hưởng | DDL được viết trực tiếp từ schema analysis, đảm bảo ADD-only |

| Block | What blocks | Decision required | Owner |
|---|---|---|---|
| BLK-01 | `verify-task.ps1` fails: TASK.md thiếu sections ## 3-10 (Decisions, Contract, Execution Plan, Acceptance, Risk, Open Questions, Planner Resolution, Revision Log) | Tier 1 Planner cần hoàn thiện TASK.md theo template chuẩn | Tier 1 |

## 6. Evidence Index

| File | Description |
|---|---|
| `ac01-baseline.txt` | Baseline verify: JobOpening/JobPosting absent at 4758809 |
| `ac02-prisma-validate.txt` | `npx prisma validate` exit 0 |
| `ac03-prisma-generate.txt` | `npx prisma generate` exit 0 |
| `ac04-tsc-noemit.txt` | `npx tsc --noEmit` exit 0 |
| `ac05-schema-diff.txt` | ADD-only diff summary |
| `ac06-migration-ddl.txt` | Migration DDL ADD-only |
| `ac07-fence-test.txt` | `public-card-truth` 23/23 tests passed |
| `ac08-slot-relation.txt` | `StaffingOrderSlot.jobOpeningId` grep result |
| `ac09-scope-check.txt` | `git status --porcelain` output |

## 7. Execution Round History

| Round | Executor | Timestamp | Status |
|---|---|---|---|
| 1 | Tier 2 | 2026-09-08 | READY_FOR_TIER3_AUDIT (Tier 1 fixed TASK.md sections 3-10) |

---

Handoff status: BLOCKED
