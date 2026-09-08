# AUDIT: hrp-v6-p1-job-opening-posting-split

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-p1-job-opening-posting-split |
| Work/Audit type | SCHEMA / SCHEMA_AUDIT |
| Spec version | v1.2 |
| Execution round | 2 (the HANDOFF claim; TASK control still says 1) |
| Audit round | 2 |
| Round opened by | Planner Resolution AUD-001..AUD-006 and HANDOFF round 2 |
| Round closes when | Tier 1 resolves every open finding and a new READY_FOR_AUDIT handoff is independently verified |
| Auditor/context | Tier 3 independent re-audit; no implementation, contract, or HANDOFF changes made |
| Baseline/diff/artifacts | baseline 475880934b7dbe88cf7ce1d44909bc9da6ea668d; R2 commits 1fd502b..481dbe4; current index initially empty |
| Independence | Confirmed: R2 commands rerun independently; HANDOFF measurements were not reused as verdict evidence |
| Audit time | 2026-09-08 11:12 Asia/Bangkok |

## 1. Findings

### R2 disposition

| Finding | R1 status | R2 status | Fresh closure/reopen evidence |
|---|---|---|---|
| AUD-001 | OPEN | OPEN | `verify-handoff.ps1` exit 2: 11 errors, 1 warning; status is RESOLVING_R2 and five required sections are absent. |
| AUD-002 | OPEN | OPEN | `git diff --cached --name-only` returned 0 paths while HANDOFF claims six staged entries; R2 was instead pushed in two commits and its effective 9-path range includes one path outside §4.1. |
| AUD-003 | OPEN | RESOLVED | Model-scoped script measured `staffingOrderSlotId String?`=1, singular `posting JobPosting?`=1; `prisma validate`, generate, and typecheck all exit 0. |
| AUD-004 | OPEN | OPEN | Original opening unique index now exists=1, but generated diff requires six indexes while authored SQL omits `job_postings_slug_key` and `job_postings_job_opening_id_idx` (0 each). |
| AUD-005 | OPEN | OPEN | Eight policies and two grants were added, but both FORCE statements use invalid `FOR ROLE`; plain valid FORCE statements in the authored file=0. |
| AUD-006 | OPEN | OPEN | TASK still has one Outcome promise of idempotent backfill and one explicit out-of-scope declaration. |

### AUD-001 — HANDOFF không đạt readiness gate

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** Toàn bộ RQ / AC-01..AC-10
- **Evidence:** powershell -NoProfile -File verify-handoff.ps1 trả exit 2, 4 lỗi và 1 cảnh báo. Trường Status ghi READY_FOR_TIER3_AUDIT nhưng dòng đóng ghi BLOCKED; gate còn báo thiếu hàng AC-10 và thiếu hàng verify-task.ps1 hiện hành.
- **Evidence R2:** `powershell -NoProfile -File verify-handoff.ps1` với đường dẫn tuyệt đối trả exit 2, 11 lỗi và 1 cảnh báo. HANDOFF thiếu năm trong sáu section bắt buộc, không có Acceptance Evidence rows, dùng status RESOLVING_R2 và không có round-2 row đúng mẫu.
- **Impact:** Tier 3 không có artifact bàn giao hợp lệ, nhất quán để nghiệm thu theo readiness gate. Kết quả độc lập bên dưới chỉ mô tả repository hiện tại, không biến nó thành delivery đủ điều kiện.
- **Decision needed from Planner:** Chuẩn hoá trạng thái HANDOFF về từ vựng hợp lệ, đồng bộ dòng đóng, và yêu cầu Tier 2 bàn giao lại đầy đủ theo contract hiện hành.

### AUD-002 — Delivery claim không khớp Git artifact hiện hành

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-03, RQ-04, RQ-06 / AC-04, AC-06, AC-10
- **Evidence R1:** `git diff --cached --name-only` trả 0 path; schema là thay đổi unstaged và migration là untracked.
- **Evidence R2:** index vẫn có 0 path trước khi Tier 3 viết artifact, trong khi HANDOFF khai sáu entry staged. R2 đã được một stream khác commit/push qua `1fd502b` và `481dbe4`; effective range `1fd502b^..481dbe4` có 9 path, gồm 1 path ngoài §4.1 là `docs/PLANNER_HANDOVER.md`.
- **Impact:** AC-04/AC-10 yêu cầu đo staged delivery nhưng staged delivery được mô tả không tồn tại; commit còn trộn Tier-1, Tier-2 và artifact Tier-3 lịch sử, nên không thể chứng nhận Git hygiene/scope theo contract.
- **Decision needed from Planner:** Yêu cầu một HANDOFF mới mô tả đúng delivery artifact đã commit, giải quyết path ngoài scope và round/status; không yêu cầu Tier 3 sửa hoặc stage implementation.

### AUD-003 — JobOpening slot/cardinality contract đã được hiện thực ở R2

- **Severity:** P1
- **Status:** RESOLVED
- **RQ/AC:** RQ-01, RQ-02 / AC-01, AC-03
- **Evidence R1:** schema có 0 `staffingOrderSlotId` và dùng plural `postings JobPosting[]`.
- **Closure evidence R2:** model-scoped script đo `staffingOrderSlotId String?`=1 và singular `posting JobPosting?`=1; `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit` đều exit 0. Named relations trong commit `481dbe4` giải ambiguity mà không đổi cardinality.
- **Impact:** R1 schema/cardinality defect này đã đóng. Việc migration còn lệch datamodel được giữ riêng ở AUD-004.
- **Decision needed from Planner:** None cho finding này; giữ model hiện hành.

### AUD-004 — Authored migration vẫn lệch Prisma datamodel

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-02, RQ-04 / AC-03, AC-06
- **Evidence R1:** generated diff yêu cầu unique index cho `job_opening_id`, authored SQL có 0.
- **Evidence R2:** unique index gốc đã được thêm=1. Tuy nhiên encoding-safe `npx prisma migrate diff` exit 0 sinh 6 indexes, gồm `job_postings_job_opening_id_idx`=1 và `job_postings_slug_key`=1; authored SQL có 0 cho cả hai.
- **Impact:** DB áp authored migration không enforce slug uniqueness mà Prisma schema/Client khai báo, và không khớp explicit normal index. Schema validation không phát hiện drift giữa SQL viết tay và datamodel.
- **Decision needed from Planner:** Yêu cầu Tier 2 tạo migration mới/điều chỉnh chưa-deploy để khớp toàn bộ generated DDL, rồi chứng minh lại bằng diff offline.

### AUD-005 — RLS đã được thêm nhưng FORCE syntax không hợp lệ

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-01, RQ-02, RQ-04 / AC-01, AC-03, AC-06
- **Evidence R1:** migration có 0 ENABLE/FORCE, 0 policy và 0 grant.
- **Evidence R2:** authored SQL có ENABLE=2, policy=8, grant=2, nhưng có 2 câu `FORCE ROW LEVEL SECURITY FOR ROLE` và 0 câu plain `FORCE ROW LEVEL SECURITY;`. Repository có 69 canonical plain FORCE statements; PostgreSQL `ALTER TABLE` không hỗ trợ `FOR ROLE` cho FORCE RLS.
- **Impact:** migration lỗi cú pháp tại câu FORCE đầu tiên và không deploy được nguyên vẹn; policy/grant phía sau không thể được coi là posture đã giao thành công.
- **Decision needed from Planner:** Yêu cầu Tier 2 dùng valid PostgreSQL FORCE syntax và tái kiểm SQL trên môi trường disposable/validator được phép; không chạy trên production.

### AUD-006 — Contract và HANDOFF không thống nhất phạm vi backfill

- **Severity:** P2
- **Status:** OPEN
- **RQ/AC:** RQ-04 / AC-06
- **Evidence:** TASK outcome nói kèm backfill idempotent, §4.4 gọi backfill tuỳ chọn, §8 nói là slice riêng ngoài contract; migration hiện tại không có backfill.
- **Evidence R2:** TASK Outcome vẫn có 1 câu hứa migration BACKFILL idempotent, trong khi Risk/Open Questions có 1 tuyên bố backfill NGOÀI PHẠM VI; migration không backfill.
- **Impact:** Không thể đưa kết luận duy nhất về việc thiếu backfill là defect hay đúng scope; executor và auditor có thể cho verdict trái nhau trên cùng artifact.
- **Decision needed from Planner:** Chốt một nghĩa duy nhất trong spec kế tiếp: bắt buộc trong task này hoặc tách hẳn sang task riêng.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | PowerShell model-scoped regex + `npx prisma validate`: models=2, opening slot-id=1, singular posting=1; validate exit 0 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-02 | PowerShell extracts only `JobOpening`: default DRAFT=1, FILLED=1, CANCELLED=1 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-03 | PowerShell extracts `JobPosting`: `jobOpeningId @unique`=1 and singular relation=1; validate exit 0 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-04 | `git diff --cached -- prisma/schema.prisma` has 0 lines, so required staged proof is absent; semantic baseline comparison separately finds 0 removed and 4 added slot lines | BLOCKED | evidence/audit-r2-independent-checks-20260908.txt | AUD-002 |
| AC-05 | PowerShell extracts `StaffingOrder`: `jobOpenings JobOpening[]` count=1 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-06 | `npx prisma migrate diff` exit 0: generated indexes=6 and DROP=0; authored SQL omits 2 required indexes and has 2 invalid FORCE-FOR-ROLE statements | FAIL | evidence/audit-r2-independent-checks-20260908.txt | AUD-004, AUD-005, AUD-006 |
| AC-07 | `npx prisma generate` exit 0; `npx tsc --noEmit` exit 0 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-08 | `npx prisma validate` exit 0 with current named relations | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-09 | `npm run test:unit -- public-card-truth --reporter=dot` exit 0; 1 file and 23 tests pass | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-10 | `git diff --cached --name-only` returns 0 paths; effective R2 range has 9 paths with 1 outside §4.1 | FAIL | evidence/audit-r2-independent-checks-20260908.txt | AUD-002 |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit -- --reporter=dot` exit 0; 113 files and 1740 tests pass |
| C-02 | DONE | `npm run build` exit 0; compile succeeds and static generation reaches 29/29 |
| C-03 | SKIP | `git diff --name-only 1fd502b^..481dbe4 -- app src` returns 0 paths; this schema task changes no route handler |
| C-04 | DONE | `npx prisma validate` exit 0; model-scoped script measures both models=1 and required relation fields=1 each |
| C-05 | SKIP | `git diff --name-only 1fd502b^..481dbe4 -- app src` returns 0 POST/PATCH source paths; no new write route exists |
| C-06 | FAIL | `npx prisma migrate diff` exit 0 generates 6 indexes; authored SQL has only 4 and invalid FORCE-FOR-ROLE count=2 |
| C-07 | FAIL | `git diff --cached --name-only` returns 0; `git diff --name-only 1fd502b^..481dbe4` returns 9 paths with 1 outside scope |
| C-08 | FAIL | `git grep -l -E JobOpening... -- **/*.test.ts` returns 0 direct test files; green broad tests do not detect SQL drift/syntax defects |
| C-09 | DONE | `powershell -NoProfile -File verify-task.ps1` exit 0; RESULT DRAFT-VALID with 2 warnings |
| C-10 | FAIL | `git diff --name-only 1fd502b^..481dbe4` measures 9 effective R2 paths, including `docs/PLANNER_HANDOVER.md` outside §4.1 |

## 3. Scope và Impact

- **Deliverables in scope:** Current implementation is recoverable in commits `1fd502b` and `481dbe4`; current index had 0 paths before Tier-3 writing, contrary to HANDOFF's staged-delivery claim.
- **Out-of-scope changes:** Effective R2 range contains 1 out-of-contract path, `docs/PLANNER_HANDOVER.md`. `baseline-head.prisma`, go-live-07 evidence, and nine old executor evidence files are pre-existing/foreign and were not modified or staged by Tier 3.
- **Blast radius/callers/affected flows:** `git diff --name-only 1fd502b^..481dbe4 -- app src` returns 0; no query/route consumes the models yet. Generated Prisma Client and future migration execution are affected.
- **Data/security/migration/operations:** Offline audit only; 0 DB connections and 0 migration executions. Authored SQL is not deployable due to AUD-005 and would leave datamodel drift due to AUD-004.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run test:unit -- --reporter=dot` | exit 0 | 113 files, 1740 tests pass | evidence/audit-r2-independent-checks-20260908.txt |
| `npm run build` | exit 0 | compile succeeds; static generation 29/29 | evidence/audit-r2-independent-checks-20260908.txt |
| `npx prisma validate`; generate; `npx tsc --noEmit` | exits 0,0,0 | schema, generated client, and types are valid | evidence/audit-r2-independent-checks-20260908.txt |
| `npm run test:unit -- public-card-truth --reporter=dot` | exit 0 | 1 file, 23 tests pass | evidence/audit-r2-independent-checks-20260908.txt |
| `npx prisma migrate diff` from 4758809 | exit 0 | 2 tables, 1 added column, 0 DROP, 6 generated indexes | evidence/audit-r2-independent-checks-20260908.txt |
| PowerShell anchored authored-SQL scan | result 2/1/0 | 2 tables, 1 added column, 0 DROP; two datamodel indexes missing | evidence/audit-r2-independent-checks-20260908.txt |
| PowerShell RLS syntax scan | result 0/2/8/2 | plain FORCE=0, invalid FOR-ROLE=2, policies=8, grants=2 | evidence/audit-r2-independent-checks-20260908.txt |
| `git diff --cached --name-only`; effective-range scope script | result 0/9/1 | index=0 paths; R2 range=9, outside scope=1 | evidence/audit-r2-independent-checks-20260908.txt |
| `git grep -l -E JobOpening -- **/*.test.ts` | result 0 | no test/spec file directly covers new models/migration | evidence/audit-r2-independent-checks-20260908.txt |
| `powershell -NoProfile -File verify-task.ps1` | exit 0 | RESULT DRAFT-VALID, 2 warnings | evidence/audit-r2-independent-checks-20260908.txt |
| `powershell -NoProfile -File verify-handoff.ps1` | exit 2 | RESULT FAIL, 11 errors, 1 warning | evidence/audit-r2-independent-checks-20260908.txt |
| `powershell -NoProfile -File verify-pipeline.ps1` | exit 0 | RESULT PASS | evidence/audit-r2-independent-checks-20260908.txt |
| `powershell -NoProfile -File verify-audit.ps1` | exit 0 | RESULT PASS; 10 AC rows and 13 evidence rows accepted | evidence/audit-r2-verify-audit-20260908.txt |

## 5. Coverage Gaps

- AC-04 remains BLOCKED because the contract requires staged-diff evidence while the implementation index has 0 paths; Tier 3 does not stage implementation.
- No live/disposable database execution was performed because the task forbids DB migration operations; RLS deployability is established by PostgreSQL grammar and repository canonical syntax, not a runtime mutation.
- Direct tests for the two new models/migration number 0; broad unit/build success does not detect the two omitted indexes or invalid FORCE syntax.
- Backfill has no determinate verdict because the current TASK simultaneously includes and excludes it; AUD-006 remains open.
- HANDOFF readiness fails, so the round verdict is BLOCKED even independently of the remaining migration defects.

## 6. Verdict và Planner Questions

- **Verdict:** BLOCKED
- **Reason:** HANDOFF R2 is not READY_FOR_AUDIT and its gate reports 11 errors; Git delivery claims are stale. Independently, authored migration omits 2 datamodel indexes and contains 2 invalid PostgreSQL FORCE-RLS statements.
- **Planner decisions required:** AUD-001, AUD-002, AUD-004, AUD-005, AUD-006. AUD-003 is RESOLVED.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | AUD-001..AUD-006 | N/A | OPEN | Initial audit at spec v1.1; all six findings opened |
| 2 | AUD-001 | OPEN | OPEN | `verify-handoff.ps1` exit 2: 11 errors and 1 warning; invalid status and missing required sections |
| 2 | AUD-002 | OPEN | OPEN | index=0 while HANDOFF claims six staged entries; effective R2 range has one outside-scope path |
| 2 | AUD-003 | OPEN | RESOLVED | slot-id=1, singular posting=1; validate/generate/typecheck exits 0/0/0 |
| 2 | AUD-004 | OPEN | OPEN | generated indexes=6; authored SQL omits two required `job_postings` indexes |
| 2 | AUD-005 | OPEN | OPEN | policies=8 and grants=2, but valid plain FORCE=0 and invalid FOR-ROLE=2 |
| 2 | AUD-006 | OPEN | OPEN | one backfill promise and one explicit out-of-scope statement remain in TASK |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
