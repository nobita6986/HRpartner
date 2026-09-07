# AUDIT: hrp-v5-rf-05-tsc-program-boundary

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-05-tsc-program-boundary |
| Work/Audit type | CODE_AUDIT |
| Spec version | v1.2 |
| Execution round | 1 |
| Audit round | 1 |
| Round opened by | HANDOFF round 1 |
| Round closes when | verdict PASS + Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 — Independent Auditor |
| Baseline/diff/artifacts | e58a6c0, docs/tasks/hrp-v5-rf-05-tsc-program-boundary/HANDOFF.md |
| Independence | Confirmed. All verification steps run independently. |
| Audit time | 2026-09-04 15:00 Asia/Bangkok |

## 1. Findings

- **AUD-001 (C-01 / AC-10):** Lệnh 
px vitest run (Regression) thất bại với 24 tests ĐỎ trong src/domains/applications/placement-panel.test.ts do lỗi React is not defined. Phép đo C-01 cho kết quả FAIL. Do đây là mandatory check, Verdict chung phải bị đánh FAIL.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | git diff --cached -- tsconfig.json | PASS | 13 include items, 0 recursive start | None |
| AC-02 | npx tsc -p tsconfig.json --listFilesOnly | PASS | Tp RoI 24 (new-ui 11, scratch 11, docs 2). Tp VA?O 1 (tsc-program-boundary.static.test.ts) | None |
| AC-03 | grep count tsc output | PASS | 0 matches for app/, src/, packages/, prisma/, tests/ vA tp gc repo | None |
| AC-04 | sort tsc output | PASS | src bng mc STEP-02 cTng Ang 1 (221). app(115), packages(2), prisma(1), tests(2), gc(7) bng Ang STEP-02. new-ui, scratch, docs bng 0. | None |
| AC-05 | npm run typecheck | PASS | exit 0, 0 error TS | None |
| AC-06 | pwsh -Command "Select-String -Path src/shared/toolchain/tsc-program-boundary.static.test.ts -Pattern 'readFileSync','readdirSync','totalScanned','PROGRAM_ROOTS','OUTSIDE_PROGRAM','FAKE_PATTERNS','execSync'" | PASS | 21 matches | None |
| AC-07 | npm run test:unit src/shared/toolchain/tsc-program-boundary.static.test.ts | PASS | exit 0, 12 tests passed | None |
| AC-08 | npm run test:unit src/shared/toolchain/tsc-program-boundary.static.test.ts | PASS | RED exit 1 trAn mu phm quy -> restore -> GREEN exit 0, hash 53cc484886ddf4164f0741739af42e75ad913528 tr v? origin. | None |
| AC-09 | npm run test:unit src/shared/toolchain/tsc-program-boundary.static.test.ts | PASS | RED exit 1 do \zz-rf05-probe\ cha phAn loi -> rm -r -> GREEN exit 0 | None |
| AC-10 | npm run test:unit | PASS | exit 0, 108 files 1654 tests | None |
| AC-11 | git status --porcelain | PASS | 107 staged paths, 76 thuc RF-05 | None |
| AC-12 | Select-String LIM-01 HANDOFF.md | PASS | LIM-01 found | None |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 Regression (npx vitest run) | FAIL | npx vitest run exit 1. 24 failed tests trong \src/domains/applications/placement-panel.test.ts\ (\React is not defined\). |
| C-02 Build (npm run build) | SKIP | Forbidden by TASK.md §4.3 (builds rewrite tsconfig.json). |
| C-03 Route handlers đọc từng dòng | SKIP | No route handlers modified in this scope |
| C-04 Prisma query vs schema | SKIP | No database queries changed in this scope |
| C-05 POST/PATCH mới | SKIP | No API routes changed in this scope |
| C-06 Migration/RLS verify | SKIP | No database migration in this scope |
| C-07 Git hygiene | DONE | git status exit 0: snapshot cA3 107 staged paths (76 thuc RF-05, 31 ngoAi nhng c quy chAnh xAc). |
| C-08 Test coverage file mới/sửa + route | DONE | npm run test:unit exit 0, 12 static tests for boundary |
| C-09 verify-task.ps1 trên TASK | DONE | pwsh .ai-pipeline/scripts/verify-task.ps1 exit 0, 8 checks OK |
| C-10 Diff scope baseline..HEAD | DONE | git diff --cached exit 0. Task cm commit nAn baseline..HEAD khA'ng cha implementation (staged-only delivery). ?o bng staged attribution: 107 staged paths, 76 RF-05. |

## 3. Scope và Impact

- Deliverables in scope: tsconfig.json (include array updated), src/shared/toolchain/tsc-program-boundary.static.test.ts.
- Out-of-scope changes: 31 staged paths lA out-of-scope-but-attributed (nhng thay  i thuc nhng lu"ng khAc nh test-01-browser-lane cA1ng lA').
- Blast radius/callers/affected flows: Typecheck static scope firmly isolated. new-ui and scratch drafts no longer break builds.
- Data/security/migration/operations: None.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| npx vitest run | 1 | 24 tests failed (\React is not defined\) | scratch/vitest-raw.txt |
| git diff --cached --name-only | 0 | 107 paths staged (76 RF-05, 31 out) | evidence/a1-ac11-status.txt |
| npm run typecheck | 0 | 0 error TS | evidence/a1-ac05-typecheck.txt |
| pwsh .ai-pipeline/scripts/verify-task.ps1 | 0 | 8 checks OK | scratch/vt_out.txt |
| npx tsc -p tsconfig.json | 0 | Tp RoI: 24, Tp VA?O: 1 | evidence/a1-ac02-count.txt |

## 5. Coverage Gaps

- **AUD-001**: Regression test (\
px vitest run\) trả về LỖI đối với component \placement-panel\.

## 6. Verdict và Planner Questions

- **Verdict:** FAIL
- **Reason:** Mandatory check C-01 (Regression) l-i v>i 24 bài test thất bại do lỗi \React is not defined\ khi chạy \
px vitest run\. Mặc dù các AC khác (đặc biệt AC-01..12 về TSC) thoả mãn, vi phạm R-01 (Regression) chặn đứng bản giao.
- **Planner decisions required:** Chờ Planner điều phối (rollback hoặc sửa React setup trong \placement-panel.test.ts\).

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | AUD-001 | OPEN | OPEN | L-i npx vitest run |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
