# TASK — hrp-v5-go-live-06-live-rls-matrix-restore

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-06-live-rls-matrix-restore` |
| Lane | V5 go-live surface hardening |
| Work type | DB posture restore — một migration forward mới cộng probe evidence. KHÔNG sửa app code |
| Spec version | v1.1 |
| Status | READY_FOR_EXECUTION — Execution Round 2: tiếp nhận Planner preflight, hoàn thiện HANDOFF để audit lane test; chưa ghi `hrp-live` |
| Current execution round | 2 |
| Current audit round | 0 |
| Next gate | `/code hrp-v5-go-live-06-live-rls-matrix-restore` Round 2 → Tier 3 audit lane test; chỉ sau audit PASS mới mở STEP-07..09 |
| Priority | P0 — 15 bảng DENY-ALL và 3 bảng ticket KHÔNG được bảo vệ trên DB đứng sau www.hrpartner.vn |
| Baseline | `776a3c1` |
| Depends on | `hrp-v5-go-live-03-admin-surface-truth` đóng, `hrp-v5-go-live-04-public-read-rls-closure` đóng |
| Blocks | Bước OP "nộp 1 đơn thật rồi xem queue HR"; 5 trang admin có write; worker check-in; placement MP-3C |
| Owner authorization | 2026-08-30: đúng 18 đối tượng RLS của `m14`. 2026-08-31: Owner trả lời `ok`, cho phép `prisma migrate deploy` áp đúng allowlist hai migration pending ở `DEC-15`; không cho phép migration thứ ba |
| Updated | 2026-08-31 Asia/Bangkok |

## 1. Outcome

Sau task này, trên branch `hrp-live`: mọi bảng đã `ENABLE ROW LEVEL SECURITY` đều có đúng policy permissive mà migration trong repo định nghĩa, và 3 bảng `tickets` / `ticket_comments` / `ticket_notifications` được `ENABLE` để policy của chúng thôi trơ.

Đo bằng một câu: `neon branches schema-diff hrp_mp2_test hrp-live` **không còn dòng policy nào** cho 15 bảng trong `EV-02` và **không còn dòng `ENABLE ROW LEVEL SECURITY`** cho 3 bảng ticket, trong khi định nghĩa của `hrp_project_visible_for` và `hrp_worker_visible_for` **không đổi một ký tự**.

Không mở rộng quyền cho ai. Đây là phục hồi posture đã được thiết kế và audit từ trước, không phải thiết kế lại phân quyền.

## 2. Evidence

Hai file bằng chứng control-plane đã có trong worktree, đo 2026-08-30, không nối DB, không secret: `scratch/neon-schemadiff-live-vs-mp2test.txt`, `scratch/neon-schemadiff-snapshot-vs-live.txt`.

| ID | Evidence |
|---|---|
| `EV-01` | Posture hiện tại của `hrp-live`: 31 bảng `ENABLE RLS` nhưng chỉ **19** bảng có policy permissive (30 policy). Chứng minh danh sách đầy đủ: branch `snapshot-rls-off-dont-use` có **0** policy nên diff snapshot sang live liệt kê trọn bộ policy của live (59 dòng `CREATE POLICY`, 0 dòng context) |
| `EV-02` | **15 bảng DENY-ALL**: `ENABLE` + `FORCE` nhưng policy duy nhất là RESTRICTIVE `hrp_*_no_delete USING (false)` — `attendance_import_batches`, `attendance_import_rows`, `candidate_submissions`, `client_statement_lines`, `commission_debts`, `commission_ledger`, `commission_policies`, `contracts`, `dependents`, `project_assignments`, `sites`, `source_claims`, `timesheet_adjustments`, `timesheet_lines`, `vendor_statement_lines`. Với `app_user` / `app_user_writer`: SELECT trả 0 dòng, INSERT/UPDATE lỗi `42501` |
| `EV-03` | Tier 2 của task 03 probe DB thật bằng `scratch/golive03-rls-gaps.mjs` ra **đúng cùng 15 bảng**, table for table (`FUP-03` của `HANDOFF.md` task 03). Hai phương pháp độc lập, cùng kết quả |
| `EV-04` | 15 policy thiếu thuộc **6** migration, không phải 2: `20260816210000_s1_rls_worker` (`project_assignments`, `source_claims`, `dependents`), `20260816211000_s1_rls_project` (`sites`, `contracts`), `20260816212000_s1_rls_vendor` (`candidate_submissions`, `vendor_statement_lines`), `20260817160000_s1_rls_attendance_timesheet` (`timesheet_lines`, `timesheet_adjustments`, `attendance_import_batches`, `attendance_import_rows`), `20260818100000_s1_rls_client_statements` (`client_statement_lines`), `20260819104700_p2_commission_rls` (`commission_debts`, `commission_ledger`, `commission_policies`) |
| `EV-05` | `ALTER TABLE tickets / ticket_comments / ticket_notifications ENABLE ROW LEVEL SECURITY` nằm trong `20260816210000_s1_rls_worker`, còn policy của 3 bảng đó nằm trong `20260826120000_m1_07a_ticket_rls_backstop`. Live có policy (m1_07a đã chạy) nhưng không có `ENABLE` (s1_rls_worker không chạy) ⇒ policy trơ, mọi app role đọc/ghi tất cả ticket |
| `EV-06` | **Nguyên nhân trực tiếp của DENY-ALL**: `20260827160000_m1_07b_rls_runtime_posture_closure` chạy `ENABLE` + `FORCE` cho **29** bảng, và nó ĐÃ chạy trên live. Trước nó, 15 bảng kia không bật RLS nên vẫn đọc được; sau nó, RLS bật mà không có policy permissive ⇒ DENY-ALL. Vậy 15 bảng vỡ từ **27/08/2026**, không phải từ tháng 8 sớm hơn. Ticket family bị `m1_07b` cố ý loại khỏi danh sách 29 (comment dòng 23) vì tưởng `m1_07a` đã lo, nên lỗ `ENABLE` không được vá |
| `EV-07` | **BẪY CHÍ TỬ — hai hàm sẽ bị hạ cấp nếu chạy lại migration cũ nguyên văn.** `hrp_project_visible_for` và `hrp_worker_visible_for` được `CREATE OR REPLACE` ở **cả** thời s1 (16/08) **và** `20260821103500_m13_restore_rls_matrix` (21/08). Bản m13 thêm `sub_pm_user_id_1` / `sub_pm_user_id_2` vào nhánh `PM`; bản s1 chỉ có `pm_user_id`. Live đang giữ bản m13. Chạy lại `s1_rls_project` / `s1_rls_worker` sẽ replace về bản cũ ⇒ **sub-PM mất quyền thấy dự án và worker của mình**, im lặng, không lỗi |
| `EV-08` | Ngược lại, `hrp_project_writable` (2 lần) và 4 hàm `hrp_session_role` / `hrp_session_user_id` / `hrp_session_vendor_id` / `hrp_session_worker_id` (3 lần) có thân **giống nhau về ngữ nghĩa** ở mọi bản ⇒ không phải nguồn regression. Nhưng `DEC-02` vẫn cấm tuyệt đối mọi câu lệnh hàm, để không phải phân loại từng cái |
| `EV-09` | Parity đã đo: 3 bảng trong tầm task 04 (`outsourcing_projects`, `staffing_orders`, `staffing_order_slots`) và `hrp_project_visible_for` / `hrp_session_role` **giống hệt** trên `hrp-live` và `hrp_mp2_test` (diff 0 dòng) ⇒ `hrp_mp2_test` là posture đích hợp lệ để so |
| `EV-10` | Expiry của `hrp_mp2_test` đã bị bỏ 30/08 (`Expires At = never`, id `br-misty-cell-az3nx5l3` không đổi) ⇒ branch so sánh và lane integration ổn định, không còn cớ `ENV_BLOCKED` vì hết hạn |
| `EV-11` | `pre-grant-2026-08-29` (`br-snowy-bonus-azrl8awl`, hết hạn 2026-09-05) là snapshot **trước** lần fix `GRANT USAGE ON SCHEMA public TO hrp_public_rpc` ngày 29/08 ⇒ lùi về nó sẽ mang lại lỗi RPC 500 đã sửa. **KHÔNG** phải điểm rollback của task này |
| `EV-12` | **Dependency của 15 policy đã kiểm, không có `42883`.** 15 policy thiếu chỉ tham chiếu 6 hàm: `hrp_project_visible_for`, `hrp_project_writable`, `hrp_session_role`, `hrp_session_user_id`, `hrp_session_vendor_id`, `hrp_worker_visible_for` — **cả 6 đều đã có trên live**. Vậy `CREATE POLICY` sẽ không chết vì thiếu hàm. Đo bằng cách trích mọi `public.hrp_*(` trong 15 dòng `CREATE POLICY` của diff rồi đối chiếu với danh sách hàm thiếu |
| `EV-13` | **`hrp_mp2_test` KHÔNG phải đích parity ở tầng hàm, chỉ ở tầng policy.** Live thiếu 3 hàm so với test: `hrp_worker_visible`, `hrp_worker_writable` (của `s1_rls_worker`, khớp `EV-04`) và `hrp_ticket_notification_visible(text, text)` — hàm 2 tham số này **không tồn tại trong bất kỳ migration nào của repo**; m1_07a chỉ `DROP FUNCTION IF EXISTS ... (text, text, text)` nên bản 2 tham số cũ sót lại trên test. **Không hàm nào trong 3 hàm đó được policy nào trên live tham chiếu** (policy ticket của live dùng `hrp_ticket_visible` / `hrp_ticket_updatable` / `hrp_ticket_insertable` / `hrp_ticket_deletable`, đều có trên live) ⇒ bật RLS cho ticket family không sinh `42883`, và diff hàm còn dòng là bình thường, không phải FAIL |
| `EV-14` | **Planner preflight production 2026-08-31, không ghi DB:** `scratch/golive06-migrstate.mjs` và `prisma migrate status` độc lập cùng xác nhận đúng 2 migration pending trên `hrp-live`: `20260829093000_mp2_public_rpc_schema_usage` và `20260830214139_m14_rls_matrix_repair`. Migration thứ nhất ở commit `1d45b59`, chỉ có một `DO` guard rồi `GRANT USAGE ON SCHEMA public TO hrp_public_rpc` nếu role tồn tại; đã chạy thành công cùng `m14` trên `hrp_mp2_test` |
| `EV-15` | **Planner RED probe production 2026-08-31, mọi INSERT nằm trong `BEGIN` + `ROLLBACK`:** sáu hàm `EV-12` đủ 6/6; hai hash m13 lần lượt `1ac767ba…e6a9b7` và `ce6d738d…a382110`; `TABLES_RLS_ENABLED=31`, permissive trên bảng bật RLS = `22`, permissive toàn schema = `30`, `EV02_PERMISSIVE_TOTAL=0`, ba bảng ticket đều `enabled=false forced=false`. Bằng chính role `app_user_writer`: 15/15 SELECT trả 0 dòng và 15/15 INSERT trả `42501 RLS_DENY`; exit 0, không có dữ liệu tồn lưu |
| `EV-16` | **Owner mở rộng uỷ quyền 2026-08-31:** sau khi Tier 1 báo chính xác hai migration pending và nội dung migration phụ, Owner trả lời `ok`. Quyền mới chỉ bao phủ đúng allowlist `EV-14`, vẫn chịu `DEC-08` audit-before-live và không bao phủ migration thứ ba |

## 3. Decisions

| ID | Decision |
|---|---|
| `DEC-01` | **Forward-only.** Sửa bằng **một** migration mới duy nhất `prisma/migrations/20260830HHMMSS_m14_rls_matrix_repair/migration.sql`. CẤM chạy lại 6 migration cũ, CẤM `prisma migrate resolve`, CẤM sửa một ký tự trong bất kỳ thư mục migration đã tồn tại, CẤM `UPDATE`/`DELETE` bảng `_prisma_migrations` |
| `DEC-02` | **Zero function.** Migration mới KHÔNG được chứa `CREATE FUNCTION`, `CREATE OR REPLACE FUNCTION`, `DROP FUNCTION`, `ALTER FUNCTION` — không một câu nào. Đây là hàng rào duy nhất chặn regression `EV-07`, và nó đo được bằng grep nên không phụ thuộc thiện chí ai |
| `DEC-03` | **Nội dung đúng bằng 18 đối tượng**: 15 `CREATE POLICY` permissive (mỗi bảng ở `EV-02` một policy) cộng 3 bảng ticket `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`. Không policy thứ 16, không bảng thứ 19, không `GRANT`, không `ALTER ROLE`, không `CREATE INDEX` |
| `DEC-04` | **Sao y bản chính, không cải tiến.** Thân mỗi policy `USING` / `WITH CHECK` copy nguyên văn từ migration sở hữu nó ở `EV-04`. Nếu Tier 2 thấy một policy cũ có vẻ chưa nhất quán với m13 (ví dụ nhánh PM thiếu sub-PM), **ghi vào HANDOFF làm follow-up, không tự sửa trong task này**. Task này phục hồi posture đã audit, không thiết kế lại phân quyền |
| `DEC-05` | **Idempotent bắt buộc.** Mỗi policy đi kèm `DROP POLICY IF EXISTS` cùng tên ngay trước `CREATE POLICY`; `ENABLE` / `FORCE` tự idempotent. Lý do cứng: `hrp_mp2_test` ĐÃ có đủ 18 đối tượng, nên migration phải chạy sạch trên cả branch đã có và branch đang thiếu |
| `DEC-06` | **Tên policy phải trùng tên trong migration gốc.** Nếu đặt tên khác, live sẽ có 2 policy permissive cùng chức năng khi 6 migration cũ vì lý do nào đó chạy được về sau — mà permissive policy `OR` với nhau ⇒ nới quyền. Trùng tên cộng `DROP IF EXISTS` biến trường hợp đó thành no-op |
| `DEC-07` | **Đường áp dụng là `prisma migrate deploy`**, không phải SQL dán tay vào console. Lý do: mọi môi trường hội tụ cùng một lịch sử, và lần remediate ad-hoc 28/08 chính là thứ sinh ra bug này (`EV-04` cho thấy nó bỏ sót 6 migration) |
| `DEC-08` | **Thứ tự áp dụng: `hrp_mp2_test` trước, `hrp-live` sau audit PASS.** 15 bảng đã DENY-ALL từ 27/08 nên chậm thêm một vòng audit không làm tình hình xấu đi, còn áp một thay đổi RLS chưa audit vào DB đứng sau tên miền công khai thì có thể làm chết 5 trang admin đang chạy được |
| `DEC-09` | **Snapshot ngay trước khi áp lên live**: `neon branches create --parent hrp-live --name pre-rls-repair-2026-08-31`, không đặt expiry. `pre-grant-2026-08-29` KHÔNG dùng làm điểm lùi (`EV-11`) |
| `DEC-10` | **Ticket family nằm trong scope.** Cùng một nguyên nhân gốc (`s1_rls_worker` không chạy), và bỏ lại nghĩa là 3 bảng ticket tiếp tục không có RLS. Sửa một nửa rồi đóng task là để lại lỗ mà không ai còn nhớ |
| `DEC-11` | **Xác nhận nguyên nhân gốc là bắt buộc nhưng không phải điều kiện của fix.** `STEP-01` đọc `_prisma_migrations` cho 6 slug ở `EV-04` trên cả `hrp-live` và `hrp_mp2_test`. Kết quả nào cũng không đổi nội dung migration, nhưng nó phân biệt "migration bị `resolve --applied` mà không chạy SQL" với "row không tồn tại" — quyết định có phải mở task điều tra lịch sử deploy hay không |
| `DEC-12` | **Doctrine bằng chứng RED trước GREEN.** Mọi AC hành vi phải có cặp số đo trước và sau trên cùng một câu lệnh, cùng một role. Chỉ in trạng thái (số dòng, SQLSTATE), không in dữ liệu, không in connection string |
| `DEC-13` | **Parity chỉ tính ở tầng policy và cờ RLS, không tính ở tầng hàm** (`EV-13`). Live thiếu 3 hàm không ai tham chiếu, trong đó một hàm không có trong repo. Task này **KHÔNG** tạo 3 hàm đó — tạo thêm object không có migration nào định nghĩa là làm drift nặng thêm theo chiều ngược lại. Tier 3 không được coi dòng diff hàm là FAIL |
| `DEC-14` | **Kiểm dependency trước khi ghi.** `STEP-02` phải xác nhận lại trên live rằng 6 hàm ở `EV-12` đều tồn tại. Nếu thiếu bất kỳ hàm nào, DỪNG và ghi `BLOCKED` — vì lúc đó `CREATE POLICY` sẽ lỗi `42883` và thứ tự sửa phải khác |
| `DEC-15` | **Allowlist migration production, Owner duyệt 2026-08-31.** `prisma migrate deploy` được phép áp đúng hai slug, theo thứ tự Prisma: `20260829093000_mp2_public_rpc_schema_usage`, rồi `20260830214139_m14_rls_matrix_repair`. Trước deploy phải chạy lại `prisma migrate status`; nếu tập pending khác đúng hai tên này hoặc xuất hiện migration thứ ba thì DỪNG, không tự quyết. Cấm sửa migration phụ, cấm `migrate resolve`, cấm SQL tay |
| `DEC-16` | **Probe hành vi chỉ dùng DB role có table GRANT.** `app_user` có `SELECT=false` trên cả 15 bảng nên mọi phép đo của nó dừng ở table privilege `42501`, không đo được RLS. Cặp RED/GREEN blocking dùng `app_user_writer` (`SELECT=true`, `INSERT=true` 15/15); ma trận GRANT vẫn phải in cả hai role để chứng minh lý do loại `app_user`. Không thêm `GRANT` trong task này |
| `DEC-17` | **Hai cơ sở đếm policy phải tách rõ.** Trước repair: permissive trên bảng đang bật RLS = `22`, permissive toàn schema public = `30` vì 8 policy ticket nằm trên ba bảng chưa bật RLS. Sau repair cả hai cùng bằng `45`. `AC-11` đánh giá `30 → 45` theo toàn schema và `22 → 45` theo bảng đang bật RLS; không gọi chênh 8 là defect |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Migration mới tạo đúng **15** policy permissive, mỗi bảng ở `EV-02` một policy, **tên trùng** tên trong migration sở hữu (`EV-04`), thân `USING` / `WITH CHECK` **sao y** bản gốc (`DEC-04`, `DEC-06`) |
| `RQ-02` | Migration mới chạy `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` và `FORCE ROW LEVEL SECURITY` cho `tickets`, `ticket_comments`, `ticket_notifications` (`DEC-10`) |
| `RQ-03` | Migration mới chứa **0** câu lệnh function và repo có **0** thay đổi trong các thư mục migration đã tồn tại (`DEC-01`, `DEC-02`) |
| `RQ-04` | Migration idempotent: chạy `prisma migrate deploy` hai lần liên tiếp đều exit 0, và chạy sạch trên `hrp_mp2_test` là branch đã có đủ 18 đối tượng (`DEC-05`) |
| `RQ-05` | Xác nhận nguyên nhân gốc: đọc `_prisma_migrations` cho 6 slug ở `EV-04` trên `hrp-live` và `hrp_mp2_test`, ghi bảng kết quả `slug` cộng `applied_yes_no` cộng `finished_at_is_null` vào HANDOFF (`DEC-11`) |
| `RQ-06` | Chụp snapshot branch `pre-rls-repair-2026-08-31` từ `hrp-live` **trước** câu lệnh ghi đầu tiên lên live, ghi branch id vào HANDOFF (`DEC-09`) |
| `RQ-07` | Bằng chứng RED trước GREEN trên 15 bảng bằng role `app_user_writer`: trước khi áp, SELECT đếm 0 dòng ở cả 15 bảng và INSERT thử trả `42501`; sau khi áp, cùng câu SELECT không còn bị predicate deny-all chặn và INSERT thử theo scope hợp lệ không còn `42501`. In kèm table-GRANT matrix cho `app_user`/`app_user_writer`; không coi `app_user` thiếu GRANT là lỗi RLS (`DEC-12`, `DEC-16`) |
| `RQ-08` | Parity posture: sau khi áp lên live, `neon branches schema-diff hrp_mp2_test hrp-live --project-id proud-lake-83253847` không còn dòng `CREATE POLICY` nào cho 15 bảng `EV-02` và không còn dòng `ENABLE ROW LEVEL SECURITY` nào cho 3 bảng ticket |
| `RQ-09` | No-regression hàm: `pg_get_functiondef` của `hrp_project_visible_for` và `hrp_worker_visible_for` trên live **trước và sau giống hệt**, và bản đó là bản m13 có `sub_pm_user_id_1` cộng `sub_pm_user_id_2` (`EV-07`) |
| `RQ-10` | Không nới quyền: sau khi áp, không bảng nào có nhiều hơn một policy permissive cho cùng một command trừ các bảng đã như vậy trước đó ở `EV-01`. Ghi bảng đếm policy permissive theo bảng, trước và sau |
| `RQ-11` | Queue HR đọc được: sau khi áp, `candidate_submissions` trả dòng cho principal `ADMIN` / `HR_MANAGER` / `DIRECTOR` / `SALE` theo đúng policy gốc, và vẫn trả 0 dòng cho `HR_STAFF` (posture MP-2 không đổi) |
| `RQ-12` | Scope file: thay đổi repo đúng bằng một thư mục migration mới cộng tối đa hai script probe trong `scratch/`. Không sửa `app/**`, `src/**`, `prisma/schema.prisma`, không sửa file trong `docs/tasks/` của task khác |
| `RQ-13` | Pre-flight dependency: xác nhận trên `hrp-live` rằng 6 hàm ở `EV-12` đều tồn tại (`pg_proc` theo tên, in tên cộng số tham số) **trước** câu lệnh ghi đầu tiên. Thiếu một hàm là `BLOCKED`, không tự sửa (`DEC-14`) |

### 4.2 Scope file

| Path | Được làm gì |
|---|---|
| `prisma/migrations/20260830HHMMSS_m14_rls_matrix_repair/migration.sql` | Tạo mới. Đúng 18 đối tượng ở `DEC-03`, 0 câu lệnh function |
| `scratch/golive06-rls-probe.mjs` | Tạo mới. Probe RED trước GREEN cho `RQ-07`, `RQ-10`, `RQ-11`. In trạng thái, không in dữ liệu |
| `scratch/golive06-migrstate.mjs` | Tạo mới. Đọc `_prisma_migrations` cho `RQ-05` |
| `docs/tasks/hrp-v5-go-live-06-live-rls-matrix-restore/HANDOFF.md` | Tier 2 viết |

Ngoài 4 path trên, mọi file khác trong worktree là của luồng khác: **không reset, không stage, không commit, không restore.**

### 4.3 Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-03 | AC-01, AC-05 |
| RQ-02 | STEP-04 | AC-02, AC-05 |
| RQ-03 | STEP-03, STEP-04 | AC-03 |
| RQ-04 | STEP-05, STEP-06 | AC-04 |
| RQ-05 | STEP-01 | AC-06 |
| RQ-06 | STEP-07 | AC-07 |
| RQ-07 | STEP-02, STEP-08 | AC-08 |
| RQ-08 | STEP-09 | AC-09 |
| RQ-09 | STEP-02, STEP-09 | AC-10 |
| RQ-10 | STEP-02, STEP-09 | AC-11 |
| RQ-11 | STEP-08 | AC-12 |
| RQ-12 | STEP-10 | AC-13, AC-14 |
| RQ-13 | STEP-02 | AC-15 |

## 5. Execution Plan

Tier 2 chạy STEP-01 tới STEP-06 và STEP-10 trên `hrp_mp2_test`. STEP-07 tới STEP-09 áp lên `hrp-live` và **chỉ chạy sau khi audit của task này PASS** (`DEC-08`); Tier 2 viết sẵn câu lệnh chính xác vào HANDOFF để lần áp live là thao tác đã được đọc trước, không phải improvise.

| ID | Step |
|---|---|
| `STEP-01` | Đọc `_prisma_migrations` trên `hrp-live` và `hrp_mp2_test` cho 6 slug ở `EV-04`. In `migration_name`, `finished_at IS NULL`, `rolled_back_at IS NULL`. Không in checksum. Ghi bảng so sánh hai branch vào HANDOFF (`RQ-05`). **Round 2:** tiếp nhận output Planner ở `EV-14`; cập nhật runbook pending theo allowlist `DEC-15` |
| `STEP-02` | Đo RED. **Không** dựng lại lỗ hổng trên `hrp_mp2_test` để có số RED — cấm phá một branch đang đúng. Số RED lấy trực tiếp từ `hrp-live` bằng cùng script, với owner để đo catalog/hàm và `app_user_writer` để đo hành vi. Mọi INSERT probe phải nằm trong `BEGIN` + `ROLLBACK`, không có `COMMIT`. **Round 2:** tiếp nhận số Planner ở `EV-15`, đưa đầy đủ vào HANDOFF; không cần chạy lại nếu không sửa hai script probe |
| `STEP-03` | Viết 15 `CREATE POLICY` vào migration mới, mỗi câu đi kèm `DROP POLICY IF EXISTS` cùng tên ngay trước. Với mỗi policy, HANDOFF phải ghi một dòng: `tên policy`, `bảng`, `migration gốc`, `số dòng trong file gốc` — để Tier 3 mở đúng chỗ mà so từng ký tự (`RQ-01`) |
| `STEP-04` | Thêm 3 cặp `ENABLE` cộng `FORCE ROW LEVEL SECURITY` cho ticket family (`RQ-02`). Sau đó grep chính file vừa viết: `grep -ciE 'create .*function|drop function|alter function'` phải ra 0 (`RQ-03`) |
| `STEP-05` | `npx prisma migrate deploy` lên `hrp_mp2_test`, exit 0. Vì branch này đã có đủ 18 đối tượng, đây chính là phép thử idempotent thật (`RQ-04`) |
| `STEP-06` | Chạy `npx prisma migrate deploy` lần thứ hai lên `hrp_mp2_test`, exit 0, output báo không có migration mới để áp. Cộng `npm run typecheck` và `npm run test:unit` exit 0 để chứng minh migration mới không làm vỡ lane tĩnh (`RQ-04`) |
| `STEP-07` | **Áp live, sau audit PASS.** `neon branches create --parent hrp-live --name pre-rls-repair-2026-08-31 --project-id proud-lake-83253847`, ghi branch id. Không đặt expiry (`RQ-06`) |
| `STEP-08` | Chạy lại `prisma migrate status`; tập pending phải đúng allowlist hai slug `DEC-15`. Sau đó `npx prisma migrate deploy` lên `hrp-live`, exit 0 và log phải cho thấy áp đúng hai slug theo thứ tự. Chạy lại probe owner + writer để có GREEN cho 15 bảng cộng `candidate_submissions` theo 5 role (`RQ-07`, `RQ-11`) |
| `STEP-09` | `neon branches schema-diff hrp_mp2_test hrp-live --project-id proud-lake-83253847` rồi grep: 0 dòng `CREATE POLICY` cho 15 bảng `EV-02`, 0 dòng `ENABLE ROW LEVEL SECURITY` cho 3 bảng ticket, 0 dòng nào chứa `hrp_project_visible_for` hoặc `hrp_worker_visible_for`. Cộng `pg_get_functiondef` của 2 hàm, so byte với số đo `STEP-02` (`RQ-08`, `RQ-09`, `RQ-10`) |
| `STEP-10` | `git status --short` chỉ có 4 path ở §4.2 ngoài phần dirt của luồng khác đã liệt kê trong HANDOFF; `git diff -- prisma/migrations/` không hiện thư mục migration nào ngoài cái mới; index rỗng (`RQ-12`) |

## 6. Acceptance

| ID | Acceptance criterion |
|---|---|
| `AC-01` | Migration mới có đúng 15 `CREATE POLICY`, tên và bảng khớp 1-1 với `EV-02` cộng `EV-04`. Tier 3 mở migration gốc theo bảng chiếu của `STEP-03` và so thân policy từng ký tự; lệch một điều kiện `OR` là FAIL |
| `AC-02` | Migration mới có đúng 3 `ENABLE ROW LEVEL SECURITY` và 3 `FORCE ROW LEVEL SECURITY`, đúng 3 bảng ticket ở `RQ-02`, không bảng thứ tư |
| `AC-03` | `grep -cE 'CREATE OR REPLACE FUNCTION|CREATE FUNCTION|DROP FUNCTION|ALTER FUNCTION'` trên migration mới trả 0. `git status --short -- prisma/migrations/` không hiện `M` cho bất kỳ thư mục migration cũ nào |
| `AC-04` | Hai lần `prisma migrate deploy` liên tiếp lên `hrp_mp2_test` đều exit 0; `npm run typecheck` và `npm run test:unit` exit 0 |
| `AC-05` | Migration mới có đúng 18 đối tượng, không hơn: 0 `GRANT`, 0 `REVOKE`, 0 `ALTER ROLE`, 0 `CREATE INDEX`, 0 `CREATE TABLE`, 0 `INSERT`, 0 `UPDATE`, 0 `DELETE` |
| `AC-06` | HANDOFF có bảng `_prisma_migrations` cho 6 slug trên cả hai branch, và một câu kết luận rõ ràng: 6 migration đó trên live là "không có row", "có row nhưng `finished_at` NULL", hay "có row đã finish". Nếu là trường hợp thứ ba thì HANDOFF phải nêu follow-up điều tra vì nó nghĩa là SQL bị đánh dấu đã chạy mà chưa chạy |
| `AC-07` | Branch `pre-rls-repair-2026-08-31` tồn tại, parent là `hrp-live`, tạo trước timestamp của `STEP-08`, không có expiry. Chứng minh bằng `neon branches list` |
| `AC-08` | Cặp số RED-GREEN bằng `app_user_writer` cho cả 15 bảng: RED có 15/15 SELECT = 0 dòng và 15/15 INSERT = `42501`; GREEN cùng role/câu lệnh không còn deny-all. Ma trận GRANT chứng minh `app_user.SELECT=0/15`, `writer.SELECT=15/15`, `writer.INSERT=15/15`; không yêu cầu hành vi RLS từ role thiếu table GRANT (`DEC-16`) |
| `AC-09` | `schema-diff hrp_mp2_test hrp-live` sau khi áp: 0 dòng policy cho 15 bảng, 0 dòng `ENABLE ROW LEVEL SECURITY` cho ticket family |
| `AC-10` | `pg_get_functiondef` của `hrp_project_visible_for` và `hrp_worker_visible_for` trên live: trước và sau **giống hệt**, và cả hai đều chứa `sub_pm_user_id_1`. Đây là AC quan trọng nhất của task — nó là phép đo trực tiếp của bẫy `EV-07` |
| `AC-11` | Bảng đếm policy permissive theo bảng trước/sau, tách hai cơ sở `DEC-17`: toàn schema `30 → 45`; chỉ các bảng đang bật RLS `22 → 45`. Mười lăm bảng EV-02 tăng từ 0 lên 1; tám policy ticket giữ nguyên nhưng ba bảng ticket đổi `enabled/forced=false → true`. Bất kỳ policy nào tăng ngoài 15 EV-02 là FAIL |
| `AC-12` | `candidate_submissions` trả dòng cho `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE`; trả 0 dòng cho `HR_STAFF`. In số dòng, không in nội dung đơn |
| `AC-13` | `git status --short` không có file ngoài 4 path §4.2 cộng danh sách dirt luồng khác mà HANDOFF liệt kê trước; index rỗng |
| `AC-14` | Không có secret, connection string, password, token hay PII trong migration, script probe, HANDOFF và output evidence. Evidence chỉ có tên đối tượng, số đếm, SQLSTATE, exit code |
| `AC-15` | HANDOFF in đủ 6 hàm ở `EV-12` tồn tại trên `hrp-live` (tên cộng số tham số), đo trước `STEP-08`. Nếu thiếu, HANDOFF kết `BLOCKED` và không có câu lệnh ghi nào đã chạy lên live |

## 7. Risk

| ID | Risk và cách chặn |
|---|---|
| `RISK-01` | **Hạ cấp hàm, mất quyền sub-PM.** Nguy hiểm nhất và im lặng nhất: không lỗi, không log, chỉ là một PM phụ mở dự án của mình và thấy trống. Chặn ba lớp: `DEC-02` cấm mọi câu lệnh function, `AC-03` grep ra 0, `AC-10` so `pg_get_functiondef` trước sau |
| `RISK-02` | **Nới quyền do policy trùng chức năng khác tên.** Permissive policy `OR` với nhau nên một policy đặt tên mới cạnh policy gốc là nới quyền, không phải trùng lặp vô hại. Chặn bằng `DEC-06` trùng tên cộng `DROP IF EXISTS`, và `AC-11` đếm policy theo bảng trước sau |
| `RISK-03` | **Sửa nhầm chiều: policy mới rộng hơn bản gốc.** Chặn bằng `DEC-04` sao y, bảng chiếu tới số dòng file gốc ở `STEP-03`, và `AC-01` bắt Tier 3 so từng ký tự thay vì đọc mô tả |
| `RISK-04` | **Áp lên live rồi trang admin đang chạy được thì chết.** Bật RLS cho ticket family nghĩa là policy m1_07a bắt đầu có hiệu lực; nếu policy đó sai thì trang ticket vỡ. Chặn bằng `DEC-08` áp `hrp_mp2_test` trước (branch này đã có `ENABLE` từ lâu và lane integration vẫn xanh, tức posture đó đã được chạy thật), cộng snapshot `DEC-09` |
| `RISK-05` | **Rollback không có điểm lùi hợp lệ.** `pre-grant-2026-08-29` sẽ mang trả lỗi RPC 500 (`EV-11`). Chặn bằng `STEP-07` chụp snapshot riêng ngay trước khi ghi |
| `RISK-06` | **`prisma migrate deploy` áp luôn cả migration khác đang chờ.** Preflight đã phát hiện đúng hai slug và Owner đã duyệt allowlist ở `DEC-15`. Ngay trước live deploy phải kiểm lại: chỉ khi tập pending bằng chính xác hai tên đó mới đi tiếp. Một tên khác, thiếu một tên, hoặc có migration thứ ba đều phải DỪNG. Đây là ngoại lệ hẹp thay cho luật v1.0 “pending > 1 thì dừng”, không phải quyền áp mọi migration đang chờ |
| `RISK-07` | **Probe ghi dữ liệu rác vào live.** INSERT thử của `RQ-07` phải nằm trong `BEGIN` cộng `ROLLBACK`, không `COMMIT`. Evidence là SQLSTATE, không phải hàng đã ghi |
| `RISK-08` | **Đây là bảng ranh giới bảo mật, không phải tính năng.** Task không được đổi phân quyền của ai. Mọi phát hiện kiểu "policy này lẽ ra phải rộng hơn" là follow-up ghi HANDOFF, không sửa tại đây (`DEC-04`) |
| `RISK-09` | **Ma trận có thể vẫn lệch ở đối tượng ngoài 18 cái.** Task này đóng đúng phần đã đo. Nếu `STEP-09` lộ ra dòng diff khác (index, default, cột), ghi vào HANDOFF làm task riêng, không mở rộng scope giữa lượt |
| `RISK-10` | **Tier 3 fail oan vì diff hàm không rỗng.** Sau khi sửa đúng, `schema-diff` vẫn còn dòng cho 3 hàm ở `EV-13` — đó là kết quả **đúng**, không phải thiếu sót: một trong ba hàm không có trong repo nên tạo nó mới là sai (`DEC-13`). `AC-09` vì vậy chỉ đo dòng policy và dòng `ENABLE ROW LEVEL SECURITY`, không đo diff rỗng toàn cục |
| `RISK-11` | **Sửa nửa vời rồi bỏ dở giữa hai branch.** Nếu áp được `hrp_mp2_test` mà live fail, hai branch lệch theo chiều mới và lần chẩn đoán sau sẽ đọc sai. Chặn bằng: Prisma bọc mỗi migration trong transaction nên fail là rollback nguyên khối, cộng `RQ-06` snapshot, cộng bắt buộc HANDOFF ghi trạng thái cuối của **cả hai** branch dù kết cục là PASS hay BLOCKED |

## 8. Open Questions

| ID | Question | Trạng thái |
|---|---|---|
| `Q-01` | Vì sao trọn bộ migration thời s1 và p2 (16 tới 19/08) không có hiệu lực trên `hrp-live` trong khi từ m13 (21/08) trở đi đều có? | `STEP-01` trả lời bằng `_prisma_migrations`. Không chặn fix (`DEC-11`) |
| `Q-02` | Có cần rà lại toàn bộ 31 bảng `ENABLE RLS` để tìm bảng thứ 32 chưa ai đo? | Trả lời sau khi `STEP-09` cho diff sạch. Nếu diff còn dòng lạ thì mở task rà toàn bộ (`RISK-09`) |
| `Q-03` | Sau khi live đúng posture, có nên đặt một check định kỳ so `hrp-live` với migration trong repo để drift không im lặng ba ngày nữa? | Đề xuất Tier 1: có, làm thành task OPS riêng. Không nhập vào task này |

## 9. Planner Resolution

### Execution Round 1 — `BLOCKED` → mở Round 2

- Chấp nhận `BLK-01` của HANDOFF là blocker công cụ của phiên Tier 2 cũ, không phải defect migration. Tier 1 đã chạy độc lập hai preflight production qua Neon CLI ngày 2026-08-31; không in secret, không `COMMIT`, không có dữ liệu tồn lưu. Evidence chuẩn hóa ở `EV-14` và `EV-15`.
- `RISK-06` đã kích hoạt đúng: production có hai migration pending. Sau khi Tier 1 nêu chính xác cả hai slug và nội dung migration phụ, Owner trả lời `ok`, mở rộng uỷ quyền đúng allowlist `DEC-15`. Không cho phép migration thứ ba.
- Chấp nhận `LIM-01`/`LIM-02`: `app_user` thiếu table GRANT nên không thể là RLS behavioral probe; sửa `RQ-07`/`AC-08` sang `app_user_writer`, vẫn bắt buộc in GRANT matrix. Không thêm GRANT.
- Chấp nhận `FUP-01`: sửa cơ sở đếm `AC-11` theo `DEC-17`, tránh FAIL oan vì 8 policy ticket tồn tại trên bảng chưa bật RLS.
- `FUP-03` và `FUP-04` được ghi backlog, không sửa trong task này. Không thay đổi nội dung `m14`.
- Round 2 chỉ yêu cầu Tier 2 cập nhật HANDOFF/runbook theo v1.1, chạy lại verifier/gates cần thiết nếu có chỉnh probe, rồi bàn giao Tier 3 audit lane test. `DEC-08` vẫn chặn mọi ghi live trước audit PASS.

## 10. Revision Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-30 | Contract khởi tạo. Root cause đã xác định trọn: 6 migration thời s1 và p2 không có hiệu lực trên `hrp-live` (`EV-04`), và `m1_07b` ngày 27/08 bật `ENABLE` cộng `FORCE` cho 29 bảng chính là thứ biến chỗ thiếu policy thành DENY-ALL (`EV-06`), nên 15 bảng vỡ từ 27/08 chứ không phải từ giữa tháng 8. Ghi rõ bẫy `EV-07`: cách sửa hiển nhiên là chạy lại 6 migration cũ, và nó sẽ `CREATE OR REPLACE` hai hàm về bản không có sub-PM, cắt quyền sub-PM trên live mà không phát ra lỗi nào. Vì vậy `DEC-01` chốt một migration forward mới duy nhất và `DEC-02` cấm tuyệt đối mọi câu lệnh function, đo được bằng `AC-03` cộng `AC-10`. `DEC-08` chốt thứ tự `hrp_mp2_test` trước, live sau audit PASS. `RISK-06` chặn tình huống `migrate deploy` cuốn theo chính 6 migration cũ. Bổ sung trước khi dispatch: `EV-12` kiểm dependency cho thấy 15 policy chỉ dùng 6 hàm và cả 6 đã có trên live nên không có `42883`; `EV-13` phát hiện `hrp_mp2_test` giữ một hàm `hrp_ticket_notification_visible(text, text)` không thuộc migration nào trong repo, dẫn tới `DEC-13` giới hạn parity ở tầng policy và `RISK-10` chặn Tier 3 fail oan vì diff hàm |
| v1.1 | 2026-08-31 | Planner chạy preflight production, ghi `EV-14`/`EV-15`: đúng hai migration pending, posture RED `31/22`, EV02 0/15 policy, ticket RLS off, writer 15/15 SELECT zero và INSERT `42501`, sáu dependency đủ và hash m13 khóa. Owner duyệt allowlist hai migration (`EV-16`, `DEC-15`). Sửa phép đo role theo table GRANT (`DEC-16`, `RQ-07`, `AC-08`), sửa hai cơ sở đếm policy (`DEC-17`, `AC-11`), đổi snapshot sang ngày 31/08, mở Execution Round 2 để cập nhật HANDOFF và audit lane test; vẫn cấm ghi live trước audit PASS |
