# HANDOFF — hrp-v6-p1-job-opening-status-card

## 0. Control

| Field | Value |
|---|---|
| Task | hrp-v6-p1-job-opening-status-card |
| Spec version | v1.0 |
| Assurance lane | STANDARD |
| Audit mode | STANDARD_AUDIT |
| Execution round | 1 |
| Baseline | main @ 0ba285a |
| Status | READY_FOR_AUDIT |

## 1. Outcome Summary

- **Delivered:** Mở `/admin/jobs` sẽ thấy 4 badge đếm JobOpening (DRAFT/OPEN/FILLED/CANCELLED) phía trên bảng All Jobs. Loading: 4 shimmer. Empty: 4 badge "0". Error: dải cảnh báo (role=alert) không che bảng.
- **Not delivered:** None
- **Lane escalation needed:** No

## 2. Execution Trace

| STEP | Action | Output | Deviation |
|---|---|---|---|
| STEP-01 | Tạo src/domains/staffing/job-opening-status.ts với summarizeAllJobOpenings | file mới | None |
| STEP-02 | Tạo src/domains/staffing/job-opening-status.test.ts (5 test) | file mới | None |
| STEP-03 | Tạo app/api/admin/job-opening-status/route.ts (auth pattern giống /api/projects) | file mới | None |
| STEP-04 | Tạo app/admin/jobs/job-opening-status-card.tsx + test | 2 file mới | None |
| STEP-05 | Sửa app/admin/jobs/page.tsx: import + render component | 1 file sửa | None |
| STEP-06 | Chạy prisma generate + tsc --noEmit + test:unit + verify-task | evidence ac01..ac06 | None |

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | verify-task.ps1 -TaskPath docs/tasks/hrp-v6-p1-job-opening-status-card/TASK.md | RESULT: PASS | None |
| AC-01 | E-01 | npx prisma generate exit 0; grep model JobOpening line 438 | None |
| AC-02 | E-02 | 7 tests PASS (5+2) | None |
| AC-03 | E-03 | npx tsc --noEmit exit 0 | None |
| AC-04 | E-04 | 6 staged paths, all in §4.1 | None |
| AC-05 | E-05 | tracked changes = staged only; untracked = evidence | None |
| AC-06 | E-06 | verify-task.ps1 exit 0 PASS | None |

## 4. Changed Deliverables

- src/domains/staffing/job-opening-status.ts (mới, STEP-01)
- src/domains/staffing/job-opening-status.test.ts (mới, STEP-02)
- app/api/admin/job-opening-status/route.ts (mới, STEP-03)
- app/admin/jobs/job-opening-status-card.tsx (mới, STEP-04)
- src/domains/staffing/job-opening-status-card.test.ts (mới, STEP-04)
- app/admin/jobs/page.tsx (sửa nhỏ — import + render, STEP-05)
- docs/tasks/hrp-v6-p1-job-opening-status-card/HANDOFF.md (rewrite format, R2 fix)

## 5. Deviations

| ID | Type | Description | Owner |
|---|---|---|---|
| — | — | None | — |

## 6. Evidence Index

| Evidence | Command | Exit/measured | Artifact |
|---|---|---|---|
| E-01 | npx prisma generate | exit 0 | docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/ac01.txt |
| E-02 | npm run test:unit -- "job-opening" | 7/7 PASS | docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/ac02.txt |
| E-03 | node node_modules/typescript/bin/tsc --noEmit | exit 0 | docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/ac03.txt |
| E-04 | git diff --cached --name-only | 6 paths | docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/ac04.txt |
| E-05 | git status --porcelain | staged=scope; untracked=evidence | docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/ac05.txt |
| E-06 | powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-p1-job-opening-status-card/TASK.md | exit 0 PASS | docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/ac06.txt |

## 7. Execution Round History

| Round | Spec | Status | Outcome |
|---|---|---|---|
| 1 | v1.0 | READY_FOR_AUDIT | Functional 6/6 PASS; HANDOFF format FAIL (AUD-001) → re-open round 2 để sửa format |

> Handoff status: `READY_FOR_AUDIT`
