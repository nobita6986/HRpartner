# AUDIT: hrp-v6-p1-job-opening-posting-split

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-p1-job-opening-posting-split |
| Work/Audit type | SCHEMA / SCHEMA_AUDIT |
| Spec version | v1.1 |
| Execution round | 1 |
| Audit round | 1 |
| Round opened by | HANDOFF round 1 |
| Round closes when | Tier 1 resolves all open findings and a new audit round verifies the corrected delivery |
| Auditor/context | Tier 3 independent audit; no Tier 2 implementation changes made |
| Baseline/diff/artifacts | main at 475880934b7dbe88cf7ce1d44909bc9da6ea668d; worktree schema and migration; empty initial index |
| Independence | Confirmed: commands rerun independently; HANDOFF measurements were not reused as verdict evidence |
| Audit time | 2026-09-08 10:30 Asia/Bangkok |

## 1. Findings

### AUD-001 — HANDOFF không đạt readiness gate

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** Toàn bộ RQ / AC-01..AC-10
- **Evidence:** powershell -NoProfile -File verify-handoff.ps1 trả exit 2, 4 lỗi và 1 cảnh báo. Trường Status ghi READY_FOR_TIER3_AUDIT nhưng dòng đóng ghi BLOCKED; gate còn báo thiếu hàng AC-10 và thiếu hàng verify-task.ps1 hiện hành.
- **Impact:** Tier 3 không có artifact bàn giao hợp lệ, nhất quán để nghiệm thu theo readiness gate. Kết quả độc lập bên dưới chỉ mô tả worktree hiện tại, không biến nó thành delivery đủ điều kiện.
- **Decision needed from Planner:** Chuẩn hoá trạng thái HANDOFF về từ vựng hợp lệ, đồng bộ dòng đóng, và yêu cầu Tier 2 bàn giao lại đầy đủ theo contract hiện hành.

### AUD-002 — Delivery index rỗng, không có implementation để audit như bản bàn giao

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-03, RQ-04, RQ-06 / AC-04, AC-06, AC-10
- **Evidence:** git diff --cached --name-only trả 0 path; schema là thay đổi unstaged và migration là untracked. TASK yêu cầu AC-04 và AC-10 đo tập staged.
- **Impact:** Schema và migration có thể mất hoặc bị thay đổi ngoài artifact bàn giao; AC-04 và AC-10 không thể PASS. Tier 3 không được stage implementation thay Tier 2.
- **Decision needed from Planner:** Mở execution handoff mới để Tier 2 stage đúng path cho phép, không dùng git add -A hoặc git add .

### AUD-003 — JobOpening thiếu contract cấp slot và quan hệ posting sai cardinality

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-01, RQ-02 / AC-01, AC-03
- **Evidence:** prisma/schema.prisma có 0 token staffingOrderSlotId và có postings JobPosting[] thay vì posting JobPosting?. Encoding-safe npx prisma migrate diff cũng sinh 0 cột staffing_order_slot_id.
- **Impact:** Model không hiện thực đầy đủ contract §4.3; opening không neo được slot theo trường bắt buộc và cardinality schema cho phép nhiều posting lịch sử dù contract yêu cầu one-to-zero-or-one.
- **Decision needed from Planner:** Yêu cầu Tier 2 hiện thực đúng model contract hoặc Tier 1 sửa contract ở spec mới nếu chủ đích nghiệp vụ đã đổi.

### AUD-004 — Migration không bảo toàn uniqueness của JobPosting.jobOpeningId

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-02, RQ-04 / AC-03, AC-06
- **Evidence:** npx prisma migrate diff sinh 1 CREATE UNIQUE INDEX job_postings_job_opening_id_key; migration được viết tay có 0 unique index cho job_opening_id và chỉ tạo index thường.
- **Impact:** DB áp migration có thể chứa nhiều JobPosting cho một JobOpening trong khi Prisma Client tin rằng trường là unique; dữ liệu và hành vi runtime sẽ lệch schema.
- **Decision needed from Planner:** Yêu cầu migration mới khớp chính xác datamodel và chứng minh bằng migrate diff offline.

### AUD-005 — Hai bảng mới thiếu RLS/policy trong họ dữ liệu staffing

- **Severity:** P1
- **Status:** OPEN
- **RQ/AC:** RQ-01, RQ-02, RQ-04 / AC-01, AC-03, AC-06
- **Evidence:** migration mới có 0 token ENABLE/FORCE ROW LEVEL SECURITY, 0 CREATE POLICY và 0 GRANT. Migration hiện hữu bật ENABLE+FORCE cho staffing_orders/staffing_order_slots và policy slot scope qua staffing_orders.project_id; default privileges hiện hữu cấp DML bảng mới cho app_user_writer.
- **Impact:** Khi áp migration, dữ liệu nhu cầu tuyển nội bộ và projection có thể fail-open cho runtime writer thay vì đi qua scope theo project; đây là regression bảo mật dữ liệu.
- **Decision needed from Planner:** Xác định và contract hoá RLS/policy/grant cho hai bảng trước khi cho phép áp migration; không triển khai migration hiện tại.

### AUD-006 — Contract và HANDOFF không thống nhất phạm vi backfill

- **Severity:** P2
- **Status:** OPEN
- **RQ/AC:** RQ-04 / AC-06
- **Evidence:** TASK outcome nói kèm backfill idempotent, §4.4 gọi backfill tuỳ chọn, §8 nói là slice riêng ngoài contract; migration hiện tại không có backfill.
- **Impact:** Không thể đưa kết luận duy nhất về việc thiếu backfill là defect hay đúng scope; executor và auditor có thể cho verdict trái nhau trên cùng artifact.
- **Decision needed from Planner:** Chốt một nghĩa duy nhất trong spec kế tiếp: bắt buộc trong task này hoặc tách hẳn sang task riêng.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | npx prisma validate exit 0; Select-String schema model/field counts: JobOpening=1, staffingOrderSlotId=0, singular posting=0 | FAIL | evidence/audit-r1-independent-checks-20260908.txt | AUD-003 |
| AC-02 | Select-String trên JobOpening status comment/default: DRAFT=1, FILLED=1, CANCELLED=1 | PASS | prisma/schema.prisma:432-446 | None |
| AC-03 | npx prisma validate exit 0; Select-String jobOpeningId unique count=1 nhưng posting relation singular count=0 | FAIL | evidence/audit-r1-independent-checks-20260908.txt | AUD-003, AUD-004 |
| AC-04 | git diff --cached -- prisma/schema.prisma trả 0 dòng; git diff --numstat worktree trả 50 thêm và 3 xoá | BLOCKED | evidence/audit-r1-independent-checks-20260908.txt | AUD-002 |
| AC-05 | Select-String jobOpenings JobOpening[] trên schema trả 1 match ở dòng 393 | PASS | prisma/schema.prisma:391-397 | None |
| AC-06 | npx prisma migrate diff exit 0, DROP=0; authored SQL thiếu 1 unique index mà generated SQL yêu cầu | FAIL | evidence/audit-r1-independent-checks-20260908.txt | AUD-004, AUD-005, AUD-006 |
| AC-07 | npx prisma generate exit 0 và npx tsc --noEmit exit 0 | PASS | evidence/audit-r1-independent-checks-20260908.txt | None |
| AC-08 | npx prisma validate exit 0 | PASS | evidence/audit-r1-independent-checks-20260908.txt | None |
| AC-09 | npm run test:unit -- public-card-truth --reporter=dot exit 0; 1 file và 23 tests PASS | PASS | evidence/audit-r1-independent-checks-20260908.txt | None |
| AC-10 | git diff --cached --name-only trả 0 path; implementation chỉ tồn tại unstaged/untracked nên không có tập delivery để xác nhận | BLOCKED | evidence/audit-r1-independent-checks-20260908.txt | AUD-002 |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | npm run test:unit -- --reporter=dot exit 0; 113 files và 1740 tests PASS |
| C-02 | DONE | npm run build exit 0; Next.js compiled, generated 29 static pages và hoàn tất optimization |
| C-03 | SKIP | git diff --name-only 4758809 -- app src trả 0 route/source path; task cấm sửa route |
| C-04 | FAIL | npx prisma validate exit 0 nhưng Select-String/schema review đo staffingOrderSlotId=0 và singular posting relation=0 |
| C-05 | SKIP | git diff --name-only 4758809 -- app src trả 0 POST/PATCH path; không có route mới/sửa trong task schema này |
| C-06 | FAIL | npx prisma migrate diff exit 0 sinh 1 unique job_opening_id index; authored migration có 0, đồng thời RLS token=0 |
| C-07 | FAIL | git status --short cho schema unstaged và migration untracked; git diff --cached --name-only có 0 path |
| C-08 | FAIL | npm run test:unit exit 0 với 1740 tests nhưng rg JobOpening hoặc JobPosting trong test/source trả 0 match; không có coverage trực tiếp cho schema/migration mới |
| C-09 | DONE | powershell -NoProfile -File verify-task.ps1 exit 0; RESULT DRAFT-VALID với 2 warnings |
| C-10 | FAIL | git diff --name-only 4758809 HEAD -- prisma/schema.prisma trả 0 path trong commit; delivery tồn tại ngoài HEAD/index nên baseline..HEAD không chứa task |

## 3. Scope và Impact

- **Deliverables in scope:** Worktree có prisma/schema.prisma sửa đổi, migration mới và evidence task-local; index lúc mở audit có 0 path.
- **Out-of-scope changes:** baseline-head.prisma và evidence của task go-live-07 là foreign/pre-existing và không được stage hoặc sửa. Public service/test có 0 diff từ baseline.
- **Blast radius/callers/affected flows:** Không có query/route mới dùng model; tác động hiện tại nằm ở generated Prisma Client và migration tương lai. Khi áp SQL, uniqueness/RLS mismatch tác động trực tiếp integrity và authorization.
- **Data/security/migration/operations:** Chỉ audit offline; không kết nối DB, không migrate/seed/deploy. Migration hiện tại không an toàn để triển khai vì AUD-004 và AUD-005.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| npm run test:unit -- --reporter=dot | exit 0 | 113 files, 1740 tests PASS | evidence/audit-r1-independent-checks-20260908.txt |
| npm run build | exit 0 | compile và static generation PASS | evidence/audit-r1-independent-checks-20260908.txt |
| npx prisma validate; npx prisma generate; npx tsc --noEmit | exits 0,0,0 | schema/client/typecheck đều chạy được | evidence/audit-r1-independent-checks-20260908.txt |
| npm run test:unit -- public-card-truth --reporter=dot | exit 0 | 1 file, 23 tests PASS | evidence/audit-r1-independent-checks-20260908.txt |
| npx prisma migrate diff --from-schema-datamodel temp --to-schema-datamodel prisma/schema.prisma --script | exit 0 | DROP=0; generated unique job_opening_id index=1 | evidence/audit-r1-independent-checks-20260908.txt |
| git diff --cached --name-only; git status --short | exit 0 | staged=0; schema unstaged, migration untracked | evidence/audit-r1-independent-checks-20260908.txt |
| powershell -NoProfile -File verify-task.ps1 | exit 0 | RESULT DRAFT-VALID, 2 warnings | evidence/audit-r1-independent-checks-20260908.txt |
| powershell -NoProfile -File verify-handoff.ps1 | exit 2 | RESULT FAIL, 4 errors, 1 warning | evidence/audit-r1-independent-checks-20260908.txt |
| powershell -NoProfile -File verify-pipeline.ps1 | exit 0 | RESULT PASS | evidence/audit-r1-independent-checks-20260908.txt |
| powershell -NoProfile -File verify-audit.ps1 | exit 0 | RESULT PASS sau khi 10 evidence rows và mọi referenced artifact tồn tại | evidence/audit-r1-verify-audit-20260908.txt |

## 5. Coverage Gaps

- AC-04 và AC-10 BLOCKED vì index không chứa implementation; Tier 3 không được stage thay Tier 2.
- Không chạy migration hoặc live RLS probe vì task cấm kết nối/mutate DB; security finding dựa trên SQL và posture migrations hiện hữu.
- Backfill không thể verdict dứt khoát do contract tự mâu thuẫn; ghi AUD-006 thay vì suy diễn.
- HANDOFF không qua readiness gate, nên verdict toàn round là BLOCKED dù nhiều lệnh offline đã chạy thành công.

## 6. Verdict và Planner Questions

- **Verdict:** BLOCKED
- **Reason:** HANDOFF không hợp lệ và tự mâu thuẫn; index không có delivery. Worktree còn các lỗi P1 độc lập về schema contract, migration uniqueness và RLS nên cũng chưa đủ điều kiện phát hành.
- **Planner decisions required:** AUD-001, AUD-002, AUD-003, AUD-004, AUD-005, AUD-006.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | AUD-001..AUD-006 | N/A | OPEN | Round đầu; chờ Planner Resolution và HANDOFF mới |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
