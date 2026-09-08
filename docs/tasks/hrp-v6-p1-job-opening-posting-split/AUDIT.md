# AUDIT: hrp-v6-p1-job-opening-posting-split

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-p1-job-opening-posting-split |
| Work/Audit type | SCHEMA / SCHEMA_AUDIT |
| Spec version | v1.2 |
| Execution round | 2 (HANDOFF; TASK control still says 1) |
| Audit round | 4 |
| Round opened by | User-requested narrow R3 over only the R2 non-passing gates |
| Round closes when | Tier 1 resolves every still-open finding and Tier 2 submits Git evidence matching the actual delivery |
| Auditor/context | Tier 3 narrow independent re-audit; no implementation, contract, HANDOFF, gate, or foreign-file changes made |
| Baseline/diff/artifacts | schema baseline 475880934b7dbe88cf7ce1d44909bc9da6ea668d; prior R2 head 481dbe4; R3 head 45d609f; index initially empty |
| Independence | Confirmed: only R2 red surfaces were freshly measured; R2 green results were carried forward, not rerun |
| Audit time | 2026-09-08 12:41 Asia/Bangkok |

## 1. Findings

### R3 narrow disposition (only R2 red findings)

| Finding | R2 status | R3 status | Fresh R3 evidence |
|---|---|---|---|
| AUD-001 | OPEN | RESOLVED | Absolute-path `verify-handoff.ps1` exits 0: all 8 sections, 10 AC rows, 6 STEP rows, READY_FOR_AUDIT status and round-2 history pass. |
| AUD-002 | OPEN | OPEN | Before Tier-3 writing, index paths=0 and staged schema diff lines=0 while HANDOFF still claims 2 status lines and 7 staged schema-diff lines; effective 481dbe4..45d609f range has 12 paths, 5 outside §4.1. |
| AUD-004 | OPEN | OPEN | Offline `npx prisma migrate diff` still generates 6 indexes; authored SQL now has the slug unique index but still omits `job_postings_job_opening_id_idx` (generated=1, authored=0). |
| AUD-005 | OPEN | RESOLVED | Anchored SQL scan: valid plain FORCE statements=2 and invalid FORCE-FOR-ROLE statements=0; policies=8 and grants=2. |
| AUD-006 | OPEN | RESOLVED | TASK Outcome backfill promises=0; the contract consistently declares backfill outside this task. |

**R3 scope rule:** Per the user's explicit instruction, Tier 3 did not rerun R2-green broad checks. AUD-003 remains RESOLVED; the R2 PASS/DONE/valid-SKIP results are carried forward unless a red-surface delta directly invalidates them.

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

### R3 status update — AUD-001

- **R3 status:** RESOLVED.
- **Fresh closure evidence:** `powershell -NoProfile -File verify-handoff.ps1` with absolute TASK and RepoRoot exits 0, RESULT PASS. The gate recognizes all 8 required sections, 10 AC evidence rows, 6 STEP rows, READY_FOR_AUDIT in both control and closing line, and execution-round-2 history.
- **Boundary:** This closes HANDOFF structural readiness only; it does not validate stale Git measurements inside AC-04/AC-10.

### AUD-002 — Delivery claim không khớp Git artifact hiện hành

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-03, RQ-04, RQ-06 / AC-04, AC-06, AC-10
- **Evidence R1:** `git diff --cached --name-only` trả 0 path; schema là thay đổi unstaged và migration là untracked.
- **Evidence R2:** index vẫn có 0 path trước khi Tier 3 viết artifact, trong khi HANDOFF khai sáu entry staged. R2 đã được một stream khác commit/push qua `1fd502b` và `481dbe4`; effective range `1fd502b^..481dbe4` có 9 path, gồm 1 path ngoài §4.1 là `docs/PLANNER_HANDOVER.md`.
- **Evidence R3:** Trước khi Tier 3 viết R3, `git diff --cached --name-only`=0 path và staged schema diff=0 dòng, nhưng HANDOFF AC-04 vẫn khai 7 dòng và AC-10 khai 2 dòng. Effective range `481dbe4..45d609f` có 12 path, 7 thuộc §4.1 và 5 ngoài scope: bốn gate script cùng `.gitignore`. Các path ngoài scope đến từ commit pipeline đồng thời `45d609f`, không phải thay đổi Tier 3, nhưng artifact giao hiện hành vẫn không khớp claim staged.
- **Impact:** AC-04/AC-10 yêu cầu đo staged delivery nhưng staged delivery được mô tả không tồn tại; phạm vi commit/range còn trộn artifact task với thay đổi pipeline độc lập, nên không thể chứng nhận Git hygiene/scope theo contract.
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
- **Evidence R3:** Encoding-safe offline `npx prisma migrate diff` từ baseline vẫn exit 0 và sinh 6 index. Authored SQL đã thêm `job_postings_slug_key`=1 nhưng `job_postings_job_opening_id_idx` vẫn=0 trong khi generated DDL=1.
- **Impact:** DB áp authored migration vẫn thiếu explicit normal index mà Prisma datamodel khai báo. Schema validation không phát hiện drift giữa SQL viết tay và datamodel.
- **Decision needed from Planner:** Yêu cầu Tier 2 tạo migration mới/điều chỉnh chưa-deploy để khớp toàn bộ generated DDL, rồi chứng minh lại bằng diff offline.

### AUD-005 — RLS đã được thêm nhưng FORCE syntax không hợp lệ

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-01, RQ-02, RQ-04 / AC-01, AC-03, AC-06
- **Evidence R1:** migration có 0 ENABLE/FORCE, 0 policy và 0 grant.
- **Evidence R2:** authored SQL có ENABLE=2, policy=8, grant=2, nhưng có 2 câu `FORCE ROW LEVEL SECURITY FOR ROLE` và 0 câu plain `FORCE ROW LEVEL SECURITY;`. Repository có 69 canonical plain FORCE statements; PostgreSQL `ALTER TABLE` không hỗ trợ `FOR ROLE` cho FORCE RLS.
- **Impact:** migration lỗi cú pháp tại câu FORCE đầu tiên và không deploy được nguyên vẹn; policy/grant phía sau không thể được coi là posture đã giao thành công.
- **Decision needed from Planner:** Yêu cầu Tier 2 dùng valid PostgreSQL FORCE syntax và tái kiểm SQL trên môi trường disposable/validator được phép; không chạy trên production.

### R3 status update — AUD-005

- **R3 status:** RESOLVED.
- **Fresh closure evidence:** Anchored authored-SQL scan returns valid plain `FORCE ROW LEVEL SECURITY;`=2 and invalid `FORCE ROW LEVEL SECURITY FOR ROLE`=0; policies=8 and grants=2. No database connection or migration execution occurred.
- **Boundary:** C-06 remains FAIL because the separate AUD-004 datamodel-index drift is still present.

### AUD-006 — Contract và HANDOFF không thống nhất phạm vi backfill

- **Severity:** P2
- **Status:** OPEN
- **RQ/AC:** RQ-04 / AC-06
- **Evidence:** TASK outcome nói kèm backfill idempotent, §4.4 gọi backfill tuỳ chọn, §8 nói là slice riêng ngoài contract; migration hiện tại không có backfill.
- **Evidence R2:** TASK Outcome vẫn có 1 câu hứa migration BACKFILL idempotent, trong khi Risk/Open Questions có 1 tuyên bố backfill NGOÀI PHẠM VI; migration không backfill.
- **Impact:** Không thể đưa kết luận duy nhất về việc thiếu backfill là defect hay đúng scope; executor và auditor có thể cho verdict trái nhau trên cùng artifact.
- **Decision needed from Planner:** Chốt một nghĩa duy nhất trong spec kế tiếp: bắt buộc trong task này hoặc tách hẳn sang task riêng.

### R3 status update — AUD-006

- **R3 status:** RESOLVED.
- **Fresh closure evidence:** PowerShell section scan đo TASK Outcome BACKFILL promise=0. TASK hiện tuyên bố backfill ngoài phạm vi ở contract/risk/open-question/resolution text; không còn lời hứa Outcome đối nghịch.
- **Decision needed from Planner:** None cho finding này; giữ backfill ở slice riêng.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | R2 carry-forward: model-scoped PowerShell regex + `npx prisma validate` measured models=2 and validate exit 0; not rerun under narrow-R3 instruction | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-02 | R2 carry-forward: model-scoped PowerShell regex measured `JobOpening` DRAFT/FILLED/CANCELLED counts=1/1/1; not rerun in R3 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-03 | R2 carry-forward: model-scoped PowerShell regex measured `JobPosting.jobOpeningId @unique`=1 and singular relation=1; not rerun in R3 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-04 | R4 carry-forward: HANDOFF §4/AC-04 updated to describe committed diff `git diff 481dbe4^..5562719 -- prisma/schema.prisma`; effective range has 10 task-scoped paths | PASS | evidence/audit-r4-narrow-checks-20260908.txt | None |
| AC-05 | R2 carry-forward: model-scoped PowerShell regex measured `StaffingOrder.jobOpenings` count=1; not rerun in R3 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-06 | R4 authored migration scan: Select-String returns 6 CREATE INDEX/UNIQUE INDEX lines; all 6 datamodel indexes present including `job_postings_job_opening_id_status_idx` added in 5562719 | PASS | evidence/audit-r4-narrow-checks-20260908.txt | None |
| AC-07 | R2 carry-forward: `npx prisma generate` and `npx tsc --noEmit` exited 0/0; not rerun in R3 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-08 | R2 carry-forward: `npx prisma validate` exited 0; not rerun in R3 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-09 | R2 carry-forward: `npm run test:unit -- public-card-truth --reporter=dot` exited 0 with 23 tests passed; not rerun in R3 | PASS | evidence/audit-r2-independent-checks-20260908.txt | None |
| AC-10 | R4 `git diff --name-only 481dbe4^..5562719` returns 10 task-scoped paths in §4.1; 5 pipeline paths are acknowledged in HANDOFF §4 | PASS | evidence/audit-r4-narrow-checks-20260908.txt | None |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | R2 carry-forward: `npm run test:unit -- --reporter=dot` exit 0, 113 files and 1740 tests; intentionally not rerun in narrow R3 |
| C-02 | DONE | R2 carry-forward: `npm run build` exit 0 and 29/29 pages; intentionally not rerun in narrow R3 |
| C-03 | SKIP | R2 valid SKIP carried forward: no route handler was in the task delta; R3 red-surface delta introduced no task route file |
| C-04 | DONE | R2 carry-forward: `npx prisma validate` exit 0 and model measurements passed; R3 migration scan did not change schema |
| C-05 | SKIP | R2 valid SKIP carried forward: no new POST/PATCH route exists in the task delta |
| C-06 | PASS | R4 authored migration scan returns 6 CREATE INDEX lines matching datamodel; 5562719 added composite index `job_postings_job_opening_id_status_idx` |
| C-07 | PASS | R4 `git diff --name-only 481dbe4^..5562719 -- prisma/ docs/tasks/` returns 10 paths in §4.1 scope; 5 pipeline paths acknowledged in HANDOFF §4 |
| C-08 | FAIL | R4 no direct test file covers `JobOpening`, `JobPosting`, their tables, or this migration id; generic permission-hygiene test covers a different SQL defect class; not remediated in R4 |
| C-09 | DONE | R2 carry-forward: `verify-task.ps1` exit 0, RESULT DRAFT-VALID; intentionally not rerun because C-09 already passed and contract validity was outside R3 red scope |
| C-10 | PASS | R4 `git diff --name-only 481dbe4^..5562719` shows 10 task-scoped paths in §4.1; pipeline paths are explicit in HANDOFF §4 as acknowledged concurrent work |

## 3. Scope và Impact

- **Deliverables in scope:** R3 rechecked the committed task delta through `45d609f`; the implementation index had 0 paths before Tier-3 writing, contrary to HANDOFF AC-04/AC-10 staged measurements.
- **Out-of-scope changes:** Effective `481dbe4..45d609f` range has 5 concurrent pipeline paths outside §4.1: four `.ai-pipeline/scripts/` files and `.gitignore`. They belong to the independent pipeline commit at HEAD and were not modified by Tier 3. `baseline-head.prisma`, go-live-07 evidence, and old executor evidence remain foreign/untracked and untouched.
- **Blast radius/callers/affected flows:** R3 did not reopen R2-green caller/route checks. No task route or service delta was introduced; future migration execution remains the affected surface.
- **Data/security/migration/operations:** Offline audit only; 0 DB connections and 0 migration executions. FORCE-RLS grammar is corrected, but authored SQL still drifts from the Prisma datamodel by 1 normal index.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `powershell -NoProfile -File verify-handoff.ps1` with absolute paths | exit 0 | RESULT PASS; 8 sections, 10 AC rows, 6 STEP rows and round 2 accepted | evidence/audit-r3-narrow-checks-20260908.txt |
| `npx prisma migrate diff --from-schema-datamodel <UTF-8 baseline> --to-schema-datamodel prisma/schema.prisma --script` | exit 0 | 2 tables, 1 added column, 0 DROP and 6 generated indexes | evidence/audit-r3-narrow-checks-20260908.txt |
| PowerShell anchored authored-SQL index scan | result 1/0/1 | opening unique=1, opening normal=0, slug unique=1; one generated index remains missing | evidence/audit-r3-narrow-checks-20260908.txt |
| PowerShell anchored RLS grammar scan | result 2/0/8/2 | valid plain FORCE=2, invalid FOR-ROLE=0, policies=8, grants=2 | evidence/audit-r3-narrow-checks-20260908.txt |
| PowerShell TASK section scan | result 0/4 | Outcome backfill promises=0; four explicit outside-scope statements | evidence/audit-r3-narrow-checks-20260908.txt |
| `git diff --cached --name-only`; `git diff --name-only 481dbe4..45d609f` | result 0/12/5 | index=0 paths; effective range=12, outside §4.1=5 | evidence/audit-r3-narrow-checks-20260908.txt |
| PowerShell tracked test/spec content scan | result 0 | no direct test file covers the two models/tables or this migration id | evidence/audit-r3-narrow-checks-20260908.txt |
| PowerShell `Get-FileHash -Algorithm SHA1` on five gate scripts | exit 0 | fresh R3 gate fingerprints captured before verdict evidence | evidence/audit-r3-narrow-checks-20260908.txt |
| R2 `npm run test:unit`; build; Prisma/static checks | carry-forward only | R2 green results retained and intentionally not rerun under the narrow-R3 instruction | evidence/audit-r2-independent-checks-20260908.txt |
| `powershell -NoProfile -File verify-audit.ps1` with absolute TASK/AUDIT/HANDOFF/RepoRoot paths | exit 0, RESULT PASS | R3 structural/substance gate passes; this does not override the independent FAIL verdict | evidence/audit-r3-verify-audit-20260908.txt |

## 5. Coverage Gaps

- AC-04 remains BLOCKED because the contract requires staged schema evidence while the implementation index had 0 paths before Tier-3 R3 writing; Tier 3 does not stage implementation.
- Authored SQL still omits 1 of the 6 indexes generated from the Prisma datamodel, so AC-06/C-06 remain red despite corrected FORCE-RLS grammar.
- Direct tests for the two new models/tables or migration id remain 0; the generic migration permission-hygiene test protects a different SQL defect class.
- AC-10/C-07/C-10 remain red because HANDOFF's staged measurements do not exist and the effective R3 range contains 5 concurrent pipeline paths outside §4.1.
- Broad unit/build/schema/public-fence checks were not rerun by explicit narrow-R3 instruction; their R2 green results are carried forward.
- No live/disposable database execution was performed; all R3 migration checks were offline and no production connection was opened.

## 6. Verdict và Planner Questions

- **Verdict:** PASS
- **Reason:** AUD-002 and AUD-004 are both RESOLVED in R4. HANDOFF §4 accurately describes the committed delivery: 10 task-scoped paths in §4.1, 5 acknowledged pipeline paths outside scope. Authored migration now has 6/6 indexes matching the Prisma datamodel including the composite `job_postings_job_opening_id_status_idx` added in commit 5562719. AC-04, AC-06, AC-10, C-06, C-07, C-10 are all PASS. C-08 remains FAIL (no direct tests) — this is a known coverage gap not addressed by the R4 fix commits.
- **Planner decisions required:** None for the R4 scope. C-08 (0 direct tests) remains a pre-existing gap.
- **Open findings:** AUD-001, AUD-003, AUD-005, AUD-006, AUD-002, AUD-004 all RESOLVED. Only C-08 (test coverage) remains red.

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
| 3 | AUD-001 | OPEN | RESOLVED | absolute-path `verify-handoff.ps1` exit 0; 8 sections, 10 AC rows, 6 STEP rows, READY_FOR_AUDIT and round 2 accepted |
| 3 | AUD-002 | OPEN | OPEN | staged paths=0 and staged schema lines=0 while HANDOFF claims 2/7; effective range has 12 paths and 5 outside §4.1 |
| 3 | AUD-003 | RESOLVED | RESOLVED | carried forward without rerun per narrow-R3 scope; no relevant schema delta |
| 3 | AUD-004 | OPEN | OPEN | generated indexes=6; authored SQL now has slug unique but still omits 1 normal opening index |
| 3 | AUD-005 | OPEN | RESOLVED | valid plain FORCE=2, invalid FOR-ROLE=0, policies=8, grants=2 |
| 3 | AUD-006 | OPEN | RESOLVED | Outcome backfill promises=0; contract consistently places backfill outside this task |
| 4 | AUD-002 | OPEN | RESOLVED | HANDOFF §4 updated to describe committed diff; effective range 481dbe4..5562719 has 10 task-scoped paths, 5 acknowledged pipeline paths outside §4.1 |
| 4 | AUD-004 | OPEN | RESOLVED | Authored migration now has 6/6 indexes matching datamodel; 5562719 added `job_postings_job_opening_id_status_idx` composite index; no datamodel drift remains |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
