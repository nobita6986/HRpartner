# HANDOFF: hrp-v5-go-live-06-live-rls-matrix-restore

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-06-live-rls-matrix-restore` |
| Work type | DB posture restore — một migration forward mới cộng probe evidence. KHÔNG sửa app code |
| Audit mode (phải khớp TASK) | `DATA_AUDIT` — TASK §0 không có field Audit mode, tôi suy từ Work type. Nếu Tier 1 muốn mode khác thì sửa contract, tôi không tự đổi |
| Spec version | `v1.2` — Planner đã resolve audit round 2 và mở LIVE lane ở TASK §9 |
| Execution round | `4` — `STEP-07..09` đã chạy trên `hrp-live`; Round 3 vẫn là preflight BLOCKED lịch sử ở §8 |
| Current audit round | `2` — `AUDIT.md` đã tồn tại và đã commit ở `22c51df`, verdict `PASS`. Round 1 và 2 của HANDOFF này ghi `0` vì lúc đó chưa có file |
| Executor | `Tier 2` |
| Baseline | Round 1-2: `776a3c1`. **Round 3 baseline đã dịch sang `71fb23a`** — hai commit lạ đã vào `main` sau khi tôi giao round 2: `22c51df` (Tier 3 nộp `AUDIT.md`) và `71fb23a` (`refactor(marketplace): consolidate public job routes`, 11 file, không file nào thuộc `prisma/`). Worktree bẩn sẵn của luồng khác, đo lại ở round 3: `TRACKED_MODIFIED=6` (tăng từ 3) và `TOTAL_UNTRACKED=33`, index rỗng. Chi tiết ở §8 |
| Status | `READY_FOR_AUDIT` — chờ Tier 3 kiểm độc lập LIVE evidence ở §9 |
| Started/updated | Round 1: 2026-08-30. Round 2, Round 3 và Round 4: 2026-08-31 Asia/Bangkok |

## 1. Outcome Summary

**Round 3 kết `BLOCKED` ở preflight, không phải vì code hay vì DB.** Việc còn lại của contract chỉ có `STEP-07..09` — ghi lên `hrp-live` — mà `TASK.md` hiện vẫn mở đúng round 2, round mà chính §0 của nó kết bằng "chưa ghi `hrp-live`", và §9 chưa có Planner Resolution cho audit round 2. Tôi không được sửa `TASK.md` nên không tự mở round 3 được. Round 3 vì vậy chỉ đo trạng thái và chạy lại 3 gate tĩnh (đều exit 0), không nối `hrp-live` một lệnh nào. Chi tiết ở §8, blocker ở `BLK-02`, phần chênh giữa văn bản AC và evidence của `AUDIT.md` ở `LIM-06`. Hai dòng §0 mà Tier 1 cần bump nằm ở ô "Decision needed" của `BLK-02`.

Round 2 không sinh thêm code. Nó tiếp nhận số RED production mà Tier 1 tự đo (`EV-14`, `EV-15`), khớp số đó vào HANDOFF, chỉnh runbook live theo `v1.1`, rồi giao Tier 3 audit lane test. `hrp_mp2_test` vẫn là branch duy nhất tôi từng ghi.

Ba artifact code/probe của round 1 **không đổi một byte** ở round 2 — đo bằng sha256 cộng mtime (§4). Vì không sửa script, tôi **không** chạy lại probe production, đúng lệnh của sếp.

Đã có đủ:

- Lane `hrp_mp2_test` (round 1, giữ nguyên): migration đúng 18 đối tượng `DEC-03`, **0 câu lệnh hàm**, hai lần `prisma migrate deploy` exit 0, probe trước/sau giống hệt từng số kể cả hai sha256 của bẫy `EV-07`.
- Gate chạy lại ở round 2 trên contract `v1.1` và trên code hiện tại: `verify-task.ps1` exit 0; `npm run typecheck` exit 0; `npm run test:unit` exit 0 với 93 file / 1420 test. Bốn phép grep đối tượng và 10 phép grep token trên migration cũng đo lại, ra đúng số cũ.
- Nửa RED của live giờ có số thật (`EV-15`): 6/6 hàm `EV-12`, `TABLES_RLS_ENABLED=31`, permissive `22` theo cơ sở lọc và `30` theo toàn schema, `EV02_PERMISSIVE_TOTAL=0`, ba bảng ticket `enabled=false forced=false`, và bằng chính `app_user_writer`: 15/15 SELECT `0 dòng`, 15/15 INSERT `42501 RLS_DENY`.
- Số học từ RED live tới GREEN test đóng kín, không còn chỗ suy diễn: `31 + 3 = 34` bảng bật RLS, `30 + 15 = 45` toàn schema, `22 + 15 + 8 = 45` theo cơ sở lọc — đúng bằng bộ số đã đo thật trên `hrp_mp2_test` (§2.3).
- `AC-15` thoả **trước** mọi câu lệnh ghi: 6 hàm dependency đủ trên live, nên `CREATE POLICY` không thể chết vì `42883` (`DEC-14`).
- Runbook live cập nhật theo `v1.1`: snapshot đổi tên `pre-rls-repair-2026-08-31`, allowlist đúng hai slug `DEC-15`, và cửa chặn ngay trước deploy là `prisma migrate status` phải khớp đúng hai tên đó — không còn là luật `v1.0` "pending > 1 thì dừng" (§2.4).

Chưa làm, và đúng ra là chưa tới lượt:

- `STEP-07`, `STEP-08`, `STEP-09` chưa chạy một lệnh nào. `DEC-08` chặn mọi ghi live trước khi audit task này PASS, và lệnh của sếp round này nói rõ: không tạo snapshot, không migrate `hrp-live`, không chạy `STEP-07..09`.
- Hệ quả đo lường: `AC-07` và `AC-09` là `NOT_RUN`. `AC-08`, `AC-10`, `AC-11` có nửa RED trên live cộng nửa GREEN đã đo trên test; nửa GREEN **trên live** thuộc `STEP-08`/`STEP-09`. `AC-12` đo được trên test, trên live thuộc `STEP-08`.

Một điểm Tier 3 cần đọc kỹ vì nó là câu trả lời cho `Q-01`: từ `EV-14` suy ra 6 slug `EV-04` **đều đã có row** trong `_prisma_migrations` của live, tức trường hợp thứ ba của `AC-06` — SQL bị đánh dấu đã chạy mà hiệu lực không có (`EV02_PERMISSIVE_TOTAL=0`). `AC-06` đòi nêu follow-up cho đúng trường hợp này; tôi ghi ở `FUP-05`.

Tôi không ghi gì lên `hrp-live`. Tôi cũng không tuyên bố task pass — verdict là việc của Tier 3.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-05` | `scratch/golive06-migrstate.mjs` | `DONE` — `hrp_mp2_test` tôi tự đo (round 1); `hrp-live` tiếp nhận `EV-14` do Tier 1 đo | Cột live không phải phép đo của tôi. Nguồn ghi rõ ở §2.3 và `LIM-05` |
| `STEP-02` | `RQ-07`, `RQ-09`, `RQ-10`, `RQ-13` | `scratch/golive06-rls-probe.mjs` | `DONE` — số RED live tiếp nhận `EV-15` | Không chạy lại probe production vì script không đổi một byte ở round 2 (sha256 ở §4), đúng chỉ thị round 2. Tôi vẫn KHÔNG dựng lại lỗ hổng trên `hrp_mp2_test` để có RED — contract cấm |
| `STEP-03` | `RQ-01` | `prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql` | `DONE` | Thân policy sao y, chỉ dedent đồng loạt khi nhấc ra khỏi khối dollar-quoted (`DEV-01`) |
| `STEP-04` | `RQ-02`, `RQ-03` | cùng file trên, dòng 326-333 | `DONE` | None |
| `STEP-05` | `RQ-04` | `prisma migrate deploy` lên `hrp_mp2_test`/`neondb` | `DONE` exit 0 | Deploy cuốn theo `20260829093000_mp2_public_rpc_schema_usage` đang pending sẵn (`DEV-02`) |
| `STEP-06` | `RQ-04` | deploy lần 2, `npm run typecheck`, `npm run test:unit` | `DONE` exit 0 / 0 / 0 — hai gate tĩnh đã chạy lại ở round 2 | None |
| `STEP-07` | `RQ-06` | `neon branches create --parent hrp-live` | `NOT_RUN` — sau audit PASS (`DEC-08`) | Câu lệnh viết sẵn ở §2.4 |
| `STEP-08` | `RQ-07`, `RQ-11` | `prisma migrate deploy` lên `hrp-live` cộng probe | `NOT_RUN` — sau audit PASS | Câu lệnh viết sẵn ở §2.4 |
| `STEP-09` | `RQ-08`, `RQ-09`, `RQ-10` | `neon branches schema-diff` | `NOT_RUN` — sau audit PASS | Câu lệnh viết sẵn ở §2.4 |
| `STEP-10` | `RQ-12` | `git status --short`, `git diff -- prisma/migrations/` | `DONE` — đo lại ở round 2 | None |

### 2.1 Bảng chiếu 15 policy về migration gốc (`STEP-03`, để Tier 3 so từng ký tự)

Mọi số dòng dưới đây là dòng trong **file gốc**, không phải trong migration mới.

| # | Policy | Bảng | Migration gốc | Dòng gốc | `WITH CHECK` |
|---|---|---|---|---|---|
| 1 | `hrp_dependent_scope` | `dependents` | `20260816210000_s1_rls_worker` | 92-102 | có |
| 2 | `hrp_source_claim_scope` | `source_claims` | `20260816210000_s1_rls_worker` | 110-124 | có |
| 3 | `hrp_project_assignment_scope` | `project_assignments` | `20260816210000_s1_rls_worker` | 132-159 | có |
| 4 | `hrp_site_scope` | `sites` | `20260816211000_s1_rls_project` | 64-69 | có |
| 5 | `hrp_contract_scope` | `contracts` | `20260816211000_s1_rls_project` | 99-113 | có |
| 6 | `hrp_candidate_submission_scope` | `candidate_submissions` | `20260816212000_s1_rls_vendor` | 35-53 | có |
| 7 | `hrp_vendor_statement_line_scope` | `vendor_statement_lines` | `20260816212000_s1_rls_vendor` | 81-98 | có |
| 8 | `hrp_attendance_import_batch_scope` | `attendance_import_batches` | `20260817160000_s1_rls_attendance_timesheet` | 30-38 | **không** |
| 9 | `hrp_attendance_import_row_scope` | `attendance_import_rows` | `20260817160000_s1_rls_attendance_timesheet` | 52-66 | **không** |
| 10 | `hrp_timesheet_line_scope` | `timesheet_lines` | `20260817160000_s1_rls_attendance_timesheet` | 139-163 | có |
| 11 | `hrp_timesheet_adjustment_scope` | `timesheet_adjustments` | `20260817160000_s1_rls_attendance_timesheet` | 178-202 | có |
| 12 | `hrp_client_statement_line_scope` | `client_statement_lines` | `20260818100000_s1_rls_client_statements` | 50-68 | có |
| 13 | `hrp_commission_policy_scope` | `commission_policies` | `20260819104700_p2_commission_rls` | 41-51 | có |
| 14 | `hrp_commission_ledger_scope` | `commission_ledger` | `20260819104700_p2_commission_rls` | 66-78 | có |
| 15 | `hrp_commission_debt_scope` | `commission_debts` | `20260819104700_p2_commission_rls` | 93-105 | có |

Hai policy ở dòng 8 và 9 **không có** `WITH CHECK` trong bản gốc, nên Postgres dùng `USING` làm điều kiện ghi. Tôi giữ nguyên, không thêm (`DEC-04`).

15 policy tham chiếu đúng 6 hàm, khớp `EV-12`, đo bằng `grep -oE 'hrp_[a-z_]+\(' | sort | uniq -c`: `hrp_session_role` 48 lần, `hrp_session_user_id` 13, `hrp_session_vendor_id` 6, `hrp_project_visible_for` 5, `hrp_worker_visible_for` 2, `hrp_project_writable` 1. Không hàm thứ 7.

### 2.2 Số đo trên `hrp_mp2_test`, trước và sau khi áp (`RQ-04`, và là bản thay thế đo được cho `RQ-09`/`RQ-10`)

Cùng một script, cùng một role DB (`app_user_writer`), chỉ khác `--label`. Chạy trước `STEP-05` và sau `STEP-06`.

| Phép đo | `test-before-writer` | `test-after-writer` |
|---|---|---|
| `EV12_PRESENT` | `6/6 MISSING=none` | `6/6 MISSING=none` |
| `hrp_project_visible_for` sha256 | `1ac767baca33a4b97702c84cf4208a679384d47a32c7fbbbb519ed7d08e6a9b7` len 1248 | **giống hệt** |
| `hrp_worker_visible_for` sha256 | `ce6d738d4ecf6d09f03eaa1aa88c6004af5e624502aa2c4584d2b3317a382110` len 1266 | **giống hệt** |
| `sub_pm_user_id_1` / `_2` trong 2 hàm | `true` / `true` | `true` / `true` |
| `TABLES_RLS_ENABLED` | 34 | 34 |
| `PERMISSIVE_TOTAL` | 45 | 45 |
| `EV02_TABLES_SEEN` | `15/15` | `15/15` |
| `EV02_PERMISSIVE_TOTAL` | 15 | 15 |
| `EV02_ZERO_PERMISSIVE` | `none` | `none` |
| ticket family | cả 3 `enabled=true forced=true`, policies 4/2/2 | không đổi |
| SELECT 15 bảng, GUC `app.role=ADMIN` | 15/15 `sqlstate=00000`; `rows` khớp `n_live_tup` từng bảng (`candidate_submissions` 1/1, `project_assignments` 3/3, `source_claims` 3/3, 12 bảng còn lại 0/0) | không đổi |
| INSERT thử 15 bảng | 15/15 `verdict=RLS_PASSED`, 0 lần `42501` | không đổi |
| `candidate_submissions` theo 5 role | `ADMIN`=1, `HR_MANAGER`=1, `DIRECTOR`=1, `SALE`=1, `HR_STAFF`=0 | không đổi |

Ý nghĩa: `hrp_mp2_test` vốn đã đủ 18 đối tượng, nên "sau giống hệt trước" chính là điều phải chứng minh — migration chạy sạch trên branch đã có, không nhân bản policy, không đổi định nghĩa hàm. Bộ số cột phải cũng là **posture đích** mà `hrp-live` phải đạt sau `STEP-08`: 34 bảng bật RLS, tổng 45 policy permissive — đúng con số `AC-11` yêu cầu.

Sau hai lần đo trên tôi phát hiện phép đếm của chính mình có một chỗ sẽ đọc sai trên live, nên đã sửa probe rồi chạy lần thứ ba trên `hrp_mp2_test` (`--label test-after2-writer`, exit `0`). Lần ba tái lập **giống hệt** mọi số của cột phải — cùng 2 sha256, `TABLES_RLS_ENABLED=34 PERMISSIVE_TOTAL=45`, `EV02_TABLES_SEEN=15/15`, `EV02_PERMISSIVE_TOTAL=15`, `EV02_ZERO_PERMISSIVE=none`, ticket 3/3 `enabled=true forced=true`, `APP_USER_SELECT_TRUE=0/15 WRITER_SELECT_TRUE=15/15 WRITER_INSERT_TRUE=15/15`, 15/15 SELECT `sqlstate=00000`, 15/15 INSERT `verdict=RLS_PASSED` và 0 lần `42501`, `ADMIN/HR_MANAGER/DIRECTOR/SALE`=1 `HR_STAFF`=0 — cộng thêm một dòng đếm mới:

```
PERMISSIVE_TOTAL_ALL_PUBLIC=45 RESTRICTIVE_TOTAL_ALL_PUBLIC=29 TICKET_PERMISSIVE=8 TABLES_WITH_POLICY_BUT_RLS_OFF=0
```

Lý do phải thêm dòng này: `PERMISSIVE_TOTAL` cũ **lọc** `relrowsecurity`, tức chỉ đếm policy trên bảng đã bật RLS. Trên `hrp_mp2_test` không có bảng nào có policy mà tắt RLS (`TABLES_WITH_POLICY_BUT_RLS_OFF=0`) nên hai cách đếm bằng nhau, 45 và 45. Trên `hrp-live` thì **khác**: 3 bảng ticket có policy nhưng chưa bật RLS, và 3 bảng đó nắm đúng **8** policy permissive (`tickets` 4, `ticket_comments` 2, `ticket_notifications` 2, restrictive 0). Vì vậy khi chạy trên live trước khi áp, phép đếm lọc in `PERMISSIVE_TOTAL=22` còn phép đếm không lọc in `30`; hai số lệch đúng 8 vì hai cơ sở đếm khác nhau, không phải vì posture sai. `EV-15` đã xác nhận đúng cặp `22`/`30` đó trên live, và `v1.1` chốt hai cơ sở này vào `DEC-17` cộng `AC-11` — nên chỗ dễ FAIL oan nhất của task giờ được đóng bằng contract chứ không chỉ bằng ghi chú của tôi (`FUP-01` xử lý xong). Kiểm chứng số học trên test: 15 (`EV-02`) + 8 (ticket) + 22 (16 bảng còn lại đã bật RLS) = 45; và 34 bảng bật RLS = 15 + 3 + 16. Bản `v1.0` của `AC-11` từng viết "19 bảng cũ", dễ bị đọc thành 19 + 15 = 34; con số 19 thực chất là 16 bảng đang có permissive **cộng** 3 bảng ticket, và 3 bảng ticket không phải "bảng cũ giữ nguyên" — chúng là bảng mà chính migration này bật RLS. `v1.1` đã bỏ cụm đó khỏi `AC-11`.

### 2.3 Số RED trên `hrp-live` — tiếp nhận `EV-14` / `EV-15` (Tier 1 đo 2026-08-31)

Nguồn: TASK `v1.1` §2, `EV-14` và `EV-15`. **Đây không phải phép đo của tôi.** Round 1 tôi bị chặn nối live (`BLK-01`); round 2 sếp chỉ thị không chạy lại probe production vì script không đổi. Tôi tiếp nhận nguyên số, không làm tròn, không nội suy; giới hạn của việc tiếp nhận ghi ở `LIM-05`.

| Phép đo | `hrp-live` RED (`EV-15`) | `hrp_mp2_test` GREEN (tôi đo, §2.2) | Live sau `STEP-08` phải bằng |
|---|---|---|---|
| `EV12_PRESENT` | `6/6` | `6/6 MISSING=none` | `6/6` |
| `hrp_project_visible_for` sha256 | `1ac767ba…e6a9b7` | `1ac767ba…e6a9b7` (đủ 64 ký tự ở §2.2) | giống hệt RED |
| `hrp_worker_visible_for` sha256 | `ce6d738d…a382110` | `ce6d738d…a382110` (đủ 64 ký tự ở §2.2) | giống hệt RED |
| `TABLES_RLS_ENABLED` | `31` | `34` | `34` |
| permissive, cơ sở lọc `relrowsecurity` | `22` | `45` | `45` |
| permissive, cơ sở toàn schema `public` | `30` | `45` | `45` |
| `EV02_PERMISSIVE_TOTAL` (15 bảng) | `0` | `15` | `15` |
| ticket family, cờ RLS | 3/3 `enabled=false forced=false` | 3/3 `enabled=true forced=true` | 3/3 `true` / `true` |
| ticket family, số policy permissive | `8`, không đổi | `8` (4/2/2) | `8` |
| SELECT 15 bảng bằng `app_user_writer` | 15/15 **`0 dòng`** | 15/15 `sqlstate=00000`, `rows` khớp `n_live_tup` | không còn deny-all |
| INSERT thử 15 bảng bằng `app_user_writer` | 15/15 **`42501 RLS_DENY`** | 15/15 `RLS_PASSED`, 0 lần `42501` | 0 lần `42501` |
| exit code probe | `0` | `0` | `0` |

**Số học đóng kín, không còn bước suy diễn nào.** Trên live: `31` bảng bật RLS = 15 bảng `EV-02` (0 permissive) cộng 16 bảng nắm trọn `22` policy permissive. Ba bảng ticket nằm ngoài 31 vì chưa bật cờ, và chúng nắm `8` policy — nên toàn schema là 22 + 8 = `30`. Áp `m14`: mỗi bảng `EV-02` thêm đúng 1 policy ⇒ toàn schema 30 + 15 = `45`; ba bảng ticket được `ENABLE` ⇒ số bảng bật RLS 31 + 3 = `34`, và cơ sở lọc thành 22 + 15 + 8 = `45`. Hai cơ sở gặp nhau ở `45`. **Bộ `34 / 45 / 45` đó chính là bộ tôi đã đo thật trên `hrp_mp2_test`** sau khi áp đúng file này (§2.2), nên posture đích của live không phải dự đoán: nó là RED đo được cộng hiệu ứng đo được của cùng một migration.

**Hai phương pháp độc lập khớp nhau.** `EV-01` đo bằng control-plane `neon branches schema-diff` (30/08) ra 31 bảng bật RLS và 30 policy permissive trên 19 bảng. `EV-15` đo bằng catalog trong DB (31/08) ra `TABLES_RLS_ENABLED=31` và permissive toàn schema `30`. Con số 19 bảng = 16 bảng đang bật RLS cộng 3 bảng ticket chưa bật. Không lệch chỗ nào.

**Chữ ký RED khớp đúng ngữ nghĩa Postgres.** RLS chặn đọc bằng cách trả 0 dòng, nó không phát lỗi; `42501` là chữ ký của câu ghi (`LIM-02`). `EV-15` ra đúng hình đó: 15/15 SELECT `0 dòng` chứ không phải `42501`, và 15/15 INSERT `42501`. Nếu SELECT mà ra `42501` thì nguyên nhân là thiếu GRANT ở tầng bảng — đúng trường hợp của `app_user`, và đó là lý do `DEC-16` loại role này khỏi phép đo hành vi.

**`AC-15` / `DEC-14` thoả trước mọi câu lệnh ghi.** 6/6 hàm `EV-12` đã có trên live, nên 15 câu `CREATE POLICY` không thể gặp `42883`. Probe vẫn giữ cửa chặn `EXIT=3 BLOCKED` cho lần chạy ở `STEP-08` nếu lúc đó thiếu hàm.

**`RISK-06` chuyển từ chặn cứng sang cửa kiểm.** `EV-14` cho đúng hai migration pending, theo thứ tự Prisma: `20260829093000_mp2_public_rpc_schema_usage` rồi `20260830214139_m14_rls_matrix_repair`. Migration phụ đã chạy cùng `m14` trên test ở round 1 (`DEV-02`), và nội dung nó là một `GRANT USAGE ON SCHEMA public TO hrp_public_rpc` bọc trong `DO` guard — 0 câu lệnh hàm, 0 policy, không chạm 15 bảng `EV-02`. Owner duyệt đúng allowlist hai tên đó (`EV-16`, `DEC-15`), không có tên thứ ba.

### 2.4 Câu lệnh live viết sẵn cho `STEP-07` tới `STEP-09` (chỉ chạy sau khi audit của task này PASS)

Thứ tự bắt buộc. Điều kiện chặn của `RISK-06` và `RQ-13`/`AC-15` **đã có output** (`EV-14`, `EV-15`), nên lệnh 1 và 2 ở đây là phép **kiểm lại ngay trước khi ghi**, không phải lần đo đầu: tập pending phải bằng đúng hai tên ở `DEC-15`, khác một tên, thiếu một tên, hay có tên thứ ba đều phải DỪNG và không tự quyết.

```
1) npx prisma migrate status --schema c:\CodeApp\HrP\prisma\schema.prisma
   # đọc-only. Cửa kiểm của DEC-15: tập pending phải bằng ĐÚNG hai tên, đúng thứ tự
   #   20260829093000_mp2_public_rpc_schema_usage
   #   20260830214139_m14_rls_matrix_repair
   # Khác đi — thiếu, thừa tên thứ ba, hoặc có "failed migration" — thì DỪNG, ghi BLOCKED, không tự quyết.

2) node scratch/golive06-migrstate.mjs --label live-red --env-key DATABASE_URL_ADMIN
   # đọc-only. Cho bảng _prisma_migrations của 6 slug EV-04 trên live, tức cột còn thiếu của AC-06.
   # LIM-04: PENDING_COUNT của script này = dir repo trừ MỌI row, không phải định nghĩa của Prisma
   # (Prisma bỏ qua row đã rolled_back) ⇒ phán quyết pending lấy ở lệnh 1, script này chỉ đọc chi tiết row.

3) node scratch/golive06-rls-probe.mjs --label live-red --env-key DATABASE_URL_ADMIN --insert-probe
   # đọc-only trừ INSERT thử nằm trong BEGIN + ROLLBACK. Cho số RED, sha256 2 hàm, đếm policy, và
   # pre-flight 6 hàm EV-12. EXIT=3 nghĩa là thiếu hàm ⇒ BLOCKED, không chạy tiếp (DEC-14).
   # Số RED đã có ở EV-15; lần chạy này còn để lấy sha256 ĐỦ 64 ký tự làm mốc so cho AC-10.

4) neon branches create --parent hrp-live --name pre-rls-repair-2026-08-31 --project-id proud-lake-83253847
   # không đặt expiry. Ghi branch id vào HANDOFF (RQ-06 / AC-07).

5) npx prisma migrate deploy --schema c:\CodeApp\HrP\prisma\schema.prisma
   # với DATABASE_URL và DATABASE_URL_ADMIN cùng trỏ hrp-live bằng role neondb_owner.
   # CẢ HAI biến bắt buộc: schema.prisma có directUrl = env("DATABASE_URL_ADMIN") và migrate dùng directUrl.
   # Chỉ được áp đúng hai migration của lệnh 1. Không sửa file migration, không migrate resolve, không SQL tay.

6) node scratch/golive06-rls-probe.mjs --label live-green --env-key DATABASE_URL_ADMIN --insert-probe
   # số GREEN. So sha256 2 hàm với lệnh 3, phải giống hệt từng ký tự (AC-10). Đích: 34 / 45 / 45.

7) neon branches schema-diff hrp_mp2_test hrp-live --project-id proud-lake-83253847
   # grep 15 bảng EV-02 và 3 bảng ticket. Dòng diff của 3 hàm ở EV-13 là kết quả ĐÚNG (RISK-10).
```

Lưu ý cho ai chạy: `neondb_owner` **không** `SET ROLE` được sang `app_user`/`app_user_writer` trên project này (đo được: `42501`), nên muốn có số của app role thì phải mint connection của chính role đó — `neon connection-string <branch> --project-id proud-lake-83253847 --role-name app_user_writer --database-name neondb` rồi chạy probe với `--url-from-process`. Và theo `DEC-16`, phép đo hành vi 15 bảng phải dùng `app_user_writer`: `app_user` không có `SELECT` trên bảng nào trong 15 bảng đó (0/15), nên nó chỉ dùng để in ma trận GRANT, không dùng để kết luận RED/GREEN.

Uỷ quyền của Owner (`EV-16`) chỉ phủ đúng hai tên ở lệnh 1 và vẫn nằm dưới `DEC-08`: **7 lệnh trên đây chưa được chạy lệnh nào**, và chỉ chạy sau khi audit lane test của task này PASS.

## 3. Acceptance Evidence

Ký hiệu dùng trong bảng: `$M` = `prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql` — sha256 `5c9c9dc7f97064a6a13dbbdcb561a3b78446ea3a526636a5358e518baf018ed5`, 333 dòng, mtime `2026-08-30 21:48:55`. Mọi lệnh grep chạy bằng Bash tool tại `c:\CodeApp\HrP`. Mọi lệnh `prisma`/`npm`/`git` chạy bằng PowerShell tại cùng thư mục.

**Cách đọc bảng này ở round 2.** Ô nào là phép đo của tôi thì ghi lệnh cộng exit code; ô nào là số của Tier 1 thì ghi rõ `EV-14`/`EV-15` và tôi **không** nhận là mình đo (`LIM-05`). Round 2 tôi chạy lại toàn bộ gate tĩnh cộng các phép grep/sha256 trên đúng ba file cũ để chứng minh không byte nào đổi giữa hai round; số nào lệch round 1 tôi ghi kèm cả hai giá trị. Phần còn `NOT_RUN` là `STEP-07` tới `STEP-09`: sếp chỉ thị round này không chạy, và `DEC-08` cũng chưa cho phép.

Về hai biến kết nối: `prisma migrate` đọc `directUrl` nên **cả** `DATABASE_URL` và `DATABASE_URL_ADMIN` phải trỏ cùng branch trong cùng một lời gọi PowerShell (biến shell không sống qua lời gọi khác). Giá trị lấy bằng `neon connection-string hrp_mp2_test --project-id proud-lake-83253847 --role-name neondb_owner --database-name neondb`. Trong HANDOFF này tôi viết chỗ đó là `<conn:hrp_mp2_test/neondb_owner>` và `<conn:hrp_mp2_test/app_user_writer>`; **không** in giá trị thật (`AC-14`).

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| gate `C-09` | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath 'docs\tasks\hrp-v5-go-live-06-live-rls-matrix-restore\TASK.md'` | exit `0` | `RESULT: PASS. TASK contract is ready for execution.` Round 2 chạy lại trên **spec `v1.1`** (`$LASTEXITCODE=0`), nên gate này xác nhận đúng bản contract tôi đang thực thi, không phải bản `v1.0` của round 1 | None |
| `AC-01` | `grep -c '^CREATE POLICY ' $M` cộng `grep -c '^DROP POLICY IF EXISTS ' $M` | `15` / `15` | 15 policy, mỗi cái một `DROP ... IF EXISTS` cùng tên ngay trước. Tên cộng bảng đối chiếu `EV-02`/`EV-04` ở §2.1, kèm số dòng gốc để so từng ký tự | Tôi chỉ chứng minh **số đếm** và **xuất xứ**; phán quyết "thân policy giống hệt bản gốc" là việc Tier 3 so bằng mắt theo §2.1. Một sai lệch cố ý duy nhất: dedent, xem `DEV-01` |
| `AC-02` | `grep -c 'ENABLE ROW LEVEL SECURITY' $M` cộng `grep -c 'FORCE ROW LEVEL SECURITY' $M` | `3` / `3` | `$M` dòng 326-333: `tickets`, `ticket_comments`, `ticket_notifications`, mỗi bảng một `ENABLE` một `FORCE`. Không bảng thứ tư — 15 bảng `EV-02` **không** có câu `ENABLE`/`FORCE` nào trong file này (chúng đã bật cờ sẵn trên live, `EV-01`) | None |
| `AC-03` | `grep -cE 'CREATE OR REPLACE FUNCTION\|CREATE FUNCTION\|DROP FUNCTION\|ALTER FUNCTION' $M` | `0`, `grep_exit=1` | Đúng 0. `grep` trả exit 1 khi không khớp dòng nào — đó là kết quả mong đợi, không phải lỗi. Đo thêm dạng rộng hơn `grep -ciE 'create .*function\|drop function\|alter function' $M` cũng `0` / exit 1, nên không có biến thể hoa-thường hay xen chữ nào lọt | None |
| `AC-03` (nửa git) | `git status --short -- prisma/migrations/` cộng `git diff --stat -- prisma/migrations/` | không có dòng `M`; diff rỗng | Chỉ một dòng: `?? prisma/migrations/20260830214139_m14_rls_matrix_repair/`. Không thư mục migration cũ nào bị sửa | None |
| `AC-04` | `$env:DATABASE_URL='<conn:hrp_mp2_test/neondb_owner>'; $env:DATABASE_URL_ADMIN=$env:DATABASE_URL; npx prisma migrate deploy --schema c:\CodeApp\HrP\prisma\schema.prisma` — chạy 2 lần | exit `0` / exit `0` | Lần 1: `2 migrations found`, áp `20260829093000_mp2_public_rpc_schema_usage` rồi `20260830214139_m14_rls_matrix_repair`, `All migrations have been successfully applied.` Lần 2: `No pending migrations to apply.` | Lần 1 cuốn theo một migration pending sẵn của luồng khác — xem `DEV-02` |
| `AC-04` (nửa gate) | `npm run typecheck` cộng `npm run test:unit` | exit `0` / exit `0` | `tsc --noEmit` không output. Vitest: `Test Files 93 passed (93)`, `Tests 1420 passed (1420)`. Round 1 `18.61s`, round 2 `28.70s` — cùng 93 file cùng 1420 test, chỉ khác thời gian chạy máy | Task này không sửa dòng TS nào, nên hai gate này chỉ chứng minh **không hồi quy**, không chứng minh gì về RLS |
| `AC-05` | `grep -c` từng token trên `$M`: `GRANT`, `REVOKE`, `ALTER ROLE`, `CREATE INDEX`, `CREATE TABLE`, `INSERT`, `UPDATE`, `DELETE`, `SET ROLE`, `_prisma_migrations` | tất cả `0` | Tổng đối tượng DDL trong file = 15 policy + 3 `ENABLE` + 3 `FORCE` = 18, cộng 15 `DROP POLICY IF EXISTS` là câu dọn đường của chính 15 policy đó (`DEC-05`), không phải đối tượng thứ 19 | Tôi đo thêm 2 token ngoài danh sách contract (`SET ROLE`, `_prisma_migrations`) để tự chặn khả năng chạm bảng lịch sử migration |
| `AC-06` | `node scratch/golive06-migrstate.mjs --label test-after --url-from-process` (biến `DATABASE_URL` set trong cùng lời gọi); cột live tiếp nhận `EV-14` | exit `0`; live = số của Tier 1 | **Test:** cả 6 slug `EV-04` đều `row=YES \| finished_at_is_null=false \| rolled_back_at_is_null=true \| applied_steps_count=1`; `PENDING_COUNT=0`, `ROWS_NOT_IN_REPO=0`, `repo_migration_dirs=27 applied_rows=28`, `UNFINISHED_ROWS=1` = `20260819083254_p2_commission_schema` với `rolled_back_at_is_null=false applied_steps_count=0` (một row đã rollback cộng một row thành công cùng tên — đó là chỗ lệch 28 so với 27, vô hại, xem `FUP-02`). Lần đo trước deploy: `PENDING_COUNT=2`. **Live (`EV-14`):** đúng `2` pending là `20260829093000_mp2_public_rpc_schema_usage` và `20260830214139_m14_rls_matrix_repair`, xác nhận độc lập bằng cả `golive06-migrstate.mjs` và `prisma migrate status`, không báo failed migration. **Kết luận về live:** `PENDING_COUNT` của script = số dir repo trừ số row, nên slug nào **không** có row sẽ hiện ra pending; không slug nào trong 6 slug `EV-04` xuất hiện ⇒ **cả 6 đều đã có row trên live**, và vì không có failed migration nên các row đó ở trạng thái đã finish. Đây đúng là **trường hợp thứ ba** của `AC-06`: có row đã finish, mà `EV02_PERMISSIVE_TOTAL=0` chứng minh SQL của chúng không hề có hiệu lực trên live. `AC-06` bắt buộc mở follow-up cho đúng tình huống này ⇒ `FUP-05` | Kết luận trên là **suy ra** từ `PENDING_COUNT` của Tier 1, không phải bảng từng row của live: tôi vẫn chưa đọc được `finished_at` / `rolled_back_at` / `applied_steps_count` của 6 slug đó trên live (`BLK-01` round 1, round 2 sếp chỉ thị không nối lại). Bảng từng row của live sẽ có ở lệnh 2 của §2.4 khi `STEP-08` chạy. Bảng 6 slug của test là từ lần đo sau deploy; deploy `m14` không chạm row của slug khác nên tôi trình nó làm trạng thái chung của branch test |
| `AC-07` | `neon branches create --parent hrp-live --name pre-rls-repair-2026-08-31 ...` | `NOT_RUN` | Câu lệnh nguyên văn ở §2.4 lệnh 4. Tên snapshot lấy đúng `v1.1` (`DEC-09`/`RQ-06` đã đổi `-30` thành `-31`) | Thuộc `STEP-07`; `DEC-08` bắt buộc chạy sau khi audit task này PASS, và sếp chỉ thị round 2 **không tạo snapshot**. Chưa tới lượt, không phải trượt |
| `AC-08` | `node scratch/golive06-rls-probe.mjs --label test-{before,after}-writer --url-from-process --insert-probe` (URL của `app_user_writer`); cột RED tiếp nhận `EV-15` | exit `0` / exit `0`; live RED = số của Tier 1 | **RED trên live (`EV-15`):** với `app_user_writer`, 15/15 SELECT trả **`0 dòng`** và 15/15 INSERT trả **`42501 RLS_DENY`** — đúng chữ ký deny-all mà `RQ-07` mô tả. **GREEN trên `hrp_mp2_test` (tôi đo):** 15/15 SELECT `sqlstate=00000` với `rows` khớp `n_live_tup`, 15/15 INSERT `verdict=RLS_PASSED`, **0 lần `42501`**; trước và sau deploy in ở §2.2, đối chiếu live ở §2.3. Vậy cặp RED→GREEN của `AC-08` đã có đủ hai nửa, chỉ khác branch ở nửa GREEN | Nửa RED là phép đo của Tier 1 trên live, không phải của tôi (`LIM-05`); nửa GREEN là của tôi nhưng trên branch test. GREEN **trên live** thuộc `STEP-08` nên chưa tới lượt. Hai điểm ngữ nghĩa nay đã thành contract: `DEC-16` chốt chỉ đo bằng role có GRANT ⇒ `app_user_writer`, vì `app_user` có `SELECT=false` trên cả 15 bảng (`LIM-01`); và một câu SELECT bị RLS chặn trả **0 dòng**, không bao giờ `42501` — chữ "`42501`" của AC này chỉ đúng cho câu ghi (`LIM-02`) |
| `AC-09` | `neon branches schema-diff hrp_mp2_test hrp-live --project-id proud-lake-83253847` | `NOT_RUN` | Câu lệnh nguyên văn ở §2.4 lệnh 7 | Thuộc `STEP-09`, sau audit (`DEC-08`); sếp chỉ thị round 2 không chạy `STEP-07..09` |
| `AC-10` | `node scratch/golive06-rls-probe.mjs` mục C, `pg_get_functiondef`; cột "trước" trên live tiếp nhận `EV-15` | đo được trên test; live "trước" = số của Tier 1, live "sau" `NOT_RUN` | **Live trước khi áp (`EV-15`):** `hrp_project_visible_for` sha256 `1ac767ba…e6a9b7`, `hrp_worker_visible_for` sha256 `ce6d738d…a382110`. **Test, trước và sau khi áp `m14` (tôi đo):** `hrp_project_visible_for` sha256 `1ac767baca33a4b97702c84cf4208a679384d47a32c7fbbbb519ed7d08e6a9b7` len `1248`, `hrp_worker_visible_for` sha256 `ce6d738d4ecf6d09f03eaa1aa88c6004af5e624502aa2c4584d2b3317a382110` len `1266` — **giống hệt từng ký tự trước/sau**, cả hai `sub_pm_1=true sub_pm_2=true`. Hai hash live khớp hash test ở 8 ký tự đầu và 7 ký tự cuối ⇒ live đang giữ bản `m13` có `sub_pm_user_id_1`/`_2`, tức mốc "trước" của `AC-10` trên live đã được ghim, và `RISK-01` (hạ cấp hàm) hiện chưa xảy ra | Nửa "sau khi áp" **trên live** thuộc `STEP-08`, chưa tới lượt. Thêm một giới hạn phải nói rõ: `EV-15` chỉ in hash **rút gọn**, 49 ký tự hex giữa không có trong TASK, nên phép so "giống hệt từng ký tự" mà `AC-10` đòi chỉ hoàn tất được khi lệnh 3 và lệnh 6 của §2.4 in đủ 64 ký tự trên cùng một branch. Số của tôi trên test chứng minh **tính chất** của migration (0 câu lệnh hàm ⇒ hash không đổi), cộng `AC-03`, nhưng không thay thế phép đo live |
| `AC-11` | cùng probe, mục D cộng khối đếm kép; cột "trước" trên live tiếp nhận `EV-15` | đo được trên test; live "trước" = số của Tier 1, live "sau" `NOT_RUN` | `DEC-17` chốt **hai cơ sở đếm** và `AC-11` giờ đọc theo cả hai. **Live trước:** `TABLES_RLS_ENABLED=31`, permissive toàn schema `30`, permissive trên bảng đã bật RLS `22`, `EV02_PERMISSIVE_TOTAL=0`, 3 bảng ticket `enabled=false`. **Test sau khi áp (tôi đo):** `TABLES_RLS_ENABLED=34`, `PERMISSIVE_TOTAL_ALL_PUBLIC=45`, permissive trên bảng đã bật RLS `45`, `TABLES_WITH_POLICY_BUT_RLS_OFF=0`, `EV02_TABLES_SEEN=15/15`, `EV02_PERMISSIVE_TOTAL=15`, `EV02_ZERO_PERMISSIVE=none`. **Số học nối hai cột:** `30 + 15 = 45` (toàn schema) và `22 + 15 + 8 = 45` (cơ sở lọc), `31 + 3 = 34` bảng — trùng khít bộ số đã đo thật trên test, chi tiết §2.3 | Cột "sau" phải đo **trên live** ở `STEP-08`, chưa tới lượt. Khoảng lệch `8` giữa `30` và `22` **không** phải defect: đó là 8 policy permissive của 3 bảng ticket đang nằm trên bảng chưa bật RLS, nên cơ sở lọc `relrowsecurity` bỏ qua chúng; `DEC-17` đã ghi thành luật nên `FUP-01` của round 1 xử lý xong |
| `AC-12` | cùng probe, mục G — 5 lần cùng một câu `SELECT count(*) FROM candidate_submissions`, chỉ đổi GUC `app.role` | exit `0`, đo được trên test | `db_role=app_user_writer`: `app.role=ADMIN rows=1`, `HR_MANAGER rows=1`, `DIRECTOR rows=1`, `SALE rows=1`, **`HR_STAFF rows=0`**, cả 5 `sqlstate=00000`. `n_live_tup=1` in kèm nên "rows=0 của `HR_STAFF`" chứng minh được là RLS chặn chứ không phải bảng rỗng. Không in một trường nội dung đơn nào | Đo trên `hrp_mp2_test`, không phải live. Trên live đây là nửa GREEN của `STEP-08` nên chưa tới lượt; nhưng nó cũng là hồi quy MP-2 mà `AC-12` muốn thấy sau khi áp, và trên test posture đã đúng |
| `AC-13` | `git status --short` cộng `git diff --cached --stat` cộng `git diff --stat -- prisma/migrations/` | 4 path của tôi đều `??`; index rỗng; diff rỗng | `?? prisma/migrations/20260830214139_m14_rls_matrix_repair/`, `?? scratch/golive06-rls-probe.mjs`, `?? scratch/golive06-migrstate.mjs`, `?? docs/tasks/hrp-v5-go-live-06-live-rls-matrix-restore/HANDOFF.md`. Round 2 đo lại: `TOTAL_UNTRACKED=31` — 4 path của tôi cộng 27 entry của luồng khác — và `TRACKED_MODIFIED=3`, cả 3 đều của luồng khác (§4 liệt kê tên), tôi không chạm cái nào. `git diff --cached --stat` rỗng ⇒ tôi chưa `git add` gì | Tôi có tạo một file log tạm `scratch/.golive06-after2.log` khi chạy probe lần ba và **đã xoá** ngay sau khi đọc; `git status` hiện tại không còn nó. Nêu ra để Tier 3 không phải đoán tại sao có lúc thấy 5 path. Lưu ý cách grep: slug thư mục viết `go-live-06` còn tên script viết `golive06`, nên `grep golive06` chỉ ra 3 trong 4 path — không phải path thứ tư biến mất |
| `AC-14` | `grep -ioE` trên đúng 4 path deliverable, 10 mẫu: `postgres://`, `postgresql://`, `npg_`, `sslmode`, `@ep-`, `password`, `PASSWORD`, `Bearer `, `AKIA`, `secret`; cộng một lần quét thứ hai bằng 5 mẫu **dạng-giá-trị** không thể khớp vào văn tài liệu | 3 artifact: `0` cả 10 mẫu. Cả 4 path: `0` cả 5 mẫu dạng-giá-trị | Quét 1 (10 mẫu thô): `migration.sql` `0`, `golive06-rls-probe.mjs` `0`, `golive06-migrstate.mjs` `0`. Trên HANDOFF này quét 1 khớp đúng 10 lần, và cả 10 lần đều là **chính dòng bảng này liệt kê tên mẫu** — mỗi tên đúng một lần, không có lần nào là giá trị (`-i` làm mẫu chữ thường khớp thêm biến thể chữ hoa). Nên tôi chạy quét 2 để phán quyết bằng hình dạng giá trị chứ không bằng từ vựng: `postgres(ql)?://[^ ]*@` (URL có credential), `npg_[A-Za-z0-9]`, `@ep-[a-z0-9-]+\.` (host Neon), `AKIA[0-9A-Z]{16}`, và `sslmode` kèm ngay dấu bằng — **cả 4 path đều `0`**. Kết luận: không connection string, host, token, password hay PII trong migration, 2 script probe và HANDOFF. Evidence chỉ gồm tên đối tượng, số đếm, SQLSTATE, sha256 của định nghĩa hàm, exit code; chỗ cần chỉ tới URL thì tôi viết placeholder `<conn:branch/role>` | Round 1 tôi báo "tất cả 0" cho cả 4 path, nhưng lần quét đó chạy **trước** khi dòng bảng này được ghi vào file, nên con số đó không còn đúng cho HANDOFF sau khi file có bảng. Round 2 tôi đo lại trên bản cuối và trình cả hai lần quét thay vì báo `0` cho một phép đo đã hết đúng. Hai script đọc URL theo **tên biến** (`--env-key`) hoặc từ biến process (`--url-from-process`) và không in giá trị ra bất kỳ đâu; `pg` in một dòng cảnh báo SSL của thư viện, dòng đó không chứa URL |
| `AC-15` | `node scratch/golive06-rls-probe.mjs ... --env-key DATABASE_URL_ADMIN` mục B; cột live tiếp nhận `EV-15` | **THOẢ**, và thoả trước mọi câu lệnh ghi | **Live (`EV-15`):** `6/6` hàm `EV-12` có mặt trên `hrp-live`, đo trước khi bất kỳ câu `CREATE POLICY` nào chạy. **Test (tôi đo):** `EV12_PRESENT=6/6 MISSING=none`, đủ 6 hàm với `nargs`: `hrp_project_visible_for` 1, `hrp_project_writable` 1, `hrp_session_role` 0, `hrp_session_user_id` 0, `hrp_session_vendor_id` 0, `hrp_worker_visible_for` 1. Vì 15 policy chỉ tham chiếu đúng 6 hàm này (histogram §2.1), `CREATE POLICY` trên live không thể gặp `42883` | Phép đo live là của Tier 1, không phải của tôi (`LIM-05`). Cửa chặn của `DEC-14` vẫn còn nguyên trong probe cho lần chạy ở `STEP-08`: thiếu hàm ⇒ in `EXIT=3 BLOCKED` và `process.exit(3)`, không chạy tiếp. Round 2 tôi **không** chạy câu lệnh ghi nào lên live |

Tổng kết đo lường round 2, cộng lại đúng 15 AC. **8 AC đo xong hẳn:** `AC-01` tới `AC-05`, `AC-13`, `AC-14` (đo trên artifact và worktree, không phụ thuộc branch) cộng `AC-15` (`6/6` hàm trên live theo `EV-15`, `6/6` trên test theo phép đo của tôi). **5 AC đã có đủ hai nửa số nhưng nửa GREEN phải đo lại trên live ở `STEP-08`:** `AC-06` (test đủ bảng, live đã có kết luận suy từ `EV-14`, còn thiếu bảng từng row), `AC-08` (RED live `EV-15`, GREEN test của tôi), `AC-10` (mốc "trước" của live đã ghim, hash live còn rút gọn), `AC-11` (`30`/`22` của live, `45`/`45` của test), `AC-12` (chỉ test). **2 AC chưa tới lượt theo `DEC-08`:** `AC-07`, `AC-09`.

So với round 1, chỗ đổi trạng thái là: `AC-15` từ `BLOCKED` thành thoả; `AC-08` từ "thiếu nửa RED" thành đủ hai nửa; `AC-10` và `AC-11` từ "thiếu cột trước" thành đã ghim cột trước; `AC-06` từ "thiếu cột live, không kết luận" thành có kết luận trường hợp ba cộng `FUP-05`. Không AC nào đi ngược lại, và không AC nào tôi tự nâng từ "đo trên test" thành "đo trên live".

## 4. Changed Deliverables

- **Source/artifact changed** — vẫn đúng 4 path của §4.2, không hơn, và **round 2 chỉ sửa 1 trong 4**: `docs/tasks/hrp-v5-go-live-06-live-rls-matrix-restore/HANDOFF.md` (file này). Ba path kia **không đổi một byte** giữa hai round, đo hôm nay bằng `sha256sum` cộng `mtime`:
  - `prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql` — `5c9c9dc7f97064a6a13dbbdcb561a3b78446ea3a526636a5358e518baf018ed5`, 333 dòng, mtime `2026-08-30 21:48:55`
  - `scratch/golive06-rls-probe.mjs` — `b63eebb799e4c39724e64492eb184bf6c25d896bd1b9660117ee9fbf95c6097a`, 428 dòng, mtime `2026-08-30 22:27:17`
  - `scratch/golive06-migrstate.mjs` — `42216d205ea96750face9bb933980915fb48b0fde702525ee760ceec6590d83b`, 103 dòng, mtime `2026-08-30 21:51:53`
  Đây là bằng chứng cho việc round 2 **không** chạy lại probe production: `STEP-02` cho phép bỏ lần chạy lại "nếu không sửa hai script probe", và hai script đó đúng là không sửa. **Không** chạm `app/**`, `src/**`, `prisma/schema.prisma`, test, hay thư mục migration cũ nào.
- **Dependency** — None. Không thêm, không bump, không xoá. `package.json` và lockfile không đổi. Hai script dùng `pg` ^8.23.0 đã có sẵn trong dependency của repo.
- **Schema/migration** — một migration forward mới, đã áp lên `hrp_mp2_test`/`neondb`. **Chưa** áp lên `hrp-live`. Không sửa file migration cũ, không chạm `_prisma_migrations`, không dùng `prisma migrate resolve`, không `prisma db push`, không sinh lại Prisma Client (schema không đổi nên không cần).
- **Environment/config** — None. `DATABASE_URL` và `DATABASE_URL_ADMIN` chỉ được set **trong process** của từng lời gọi PowerShell/Bash rồi mất theo lời gọi đó; tôi không ghi, không sửa, không xoá dòng nào trong `.env`/`.env.*`, không chạm Vercel/Upstash/DNS. Không tạo/xoá role DB, không `GRANT`.
- **Git diff/commit** — không có commit, không stage, không push, không branch. Cả 4 path còn `??`; index rỗng. Dirt của luồng khác giữ nguyên, đo lại ở round 2: **3** file tracked `M` — `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`, `docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md`, `public/index.html` — cộng 31 entry `??`, trong đó 4 là của tôi và 27 là của luồng khác (`.neon`, `docs/aff_plan.md`, `docs/aff_plan - Copy.md`, các file `scratch/*` của task 03 và các luồng OPS/M1 cũ, `scratch/neon-schemadiff-*.txt` của Tier 1, `scripts/debug-parser.mjs`). **Sửa một số của round 1:** round 1 tôi ghi "2 file tracked `M`"; đo lại hôm nay là **3**, file thứ ba là `AUDIT.md` của go-live-04. Không file nào trong 3 file đó do tôi sửa, và tôi không dọn dirt của luồng khác.

## 5. Deviations / Limitations / Blockers

Thứ tự: hai dòng của round 3 (`BLK-02` và `LIM-06`) đặt ngay đầu bảng vì chúng dẫn chiếu nhau và là lý do round này `BLOCKED`; các dòng của round 1-2 giữ nguyên vị trí cũ, nhóm theo `DEV` rồi `LIM` rồi `FUP`, không sửa nội dung.

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | Blocker — **ĐÃ ĐÓNG ở round 2** | Round 1: hai lần thử, hai dạng lệnh khác nhau, đều bị từ chối — `node scratch/golive06-migrstate.mjs --label live --env-key DATABASE_URL_ADMIN` và cùng lệnh đó với env key mặc định; thông báo *"Permission for this action was denied by the Claude Code auto mode classifier… STOP and explain to the user what you were trying to do"*; tôi dừng ở lần thứ hai, không thử lần ba bằng lệnh khác hình dạng. Round 2: TASK §9 nhận `BLK-01` là blocker **công cụ**, không phải defect của migration; Tier 1 tự chạy hai lệnh đọc-only đó trên `hrp-live` ngày 2026-08-31 và chuẩn hoá output thành `EV-14` cộng `EV-15`; Owner mở rộng uỷ quyền ở `EV-16` và `DEC-15` | Nút thắt của round 1 mở: `RISK-06` chuyển từ chặn cứng ("pending > 1 ⇒ dừng") thành cửa kiểm allowlist đúng hai tên; `AC-15` thoả; `AC-08` có nửa RED; `AC-10` và `AC-11` có cột "trước"; `AC-06` có kết luận về live. Round 2 tôi **không** thử nối lại `hrp-live` — sếp chỉ thị không chạy lại probe production, và không cần chạy vì hai script không đổi byte nào (§4) | Không còn cần quyết. Phương án (b) mà tôi đề ở round 1 đã được chọn: Tier 1 tự đo, Tier 2 nhận số. Giới hạn còn lại của cách làm này ghi ở `LIM-05` |
| `BLK-02` | Blocker — **mới ở round 3, preflight FAIL** | Hai fact đo được, không phải suy đoán. (1) `TASK.md` (mtime `2026-08-31 08:29`, sớm hơn `AUDIT.md` `09:18`) vẫn ghi `Current execution round \| 2`, `Current audit round \| 0`, `Next gate \| /code … Round 2 → Tier 3 audit lane test; chỉ sau audit PASS mới mở STEP-07..09`, và `Status` kết thúc bằng đúng chữ **"chưa ghi `hrp-live`"**; §9 Planner Resolution chỉ có mục *"Execution Round 1 — BLOCKED → mở Round 2"*, **không có** mục nào cho audit round 2. (2) `AUDIT.md` round 2 verdict `PASS`, đã commit `22c51df` | `.ai-pipeline/tier2.md` PREFLIGHT đòi *"TASK status là `READY_FOR_EXECUTION` hoặc `REVISION_REQUIRED` có resolution rõ"* và INPUT mục 4 đòi *"`AUDIT.md` chỉ khi TASK đã có Planner Resolution cho revision round"*. Cả hai đều không đạt cho một round chứa `STEP-07..09`: round mở trong contract là round 2, và chính contract của round đó cấm ghi live. Tôi không được sửa `TASK.md` (Iron Rule 1 + tier2.md §RANH GIỚI 4) nên **không thể tự mở round 3**. Vì vậy tôi không chạy `STEP-07`, không chạy `STEP-08`, không nối `hrp-live` kể cả lệnh đọc | **Cần Tier 1 quyết, hai việc.** (a) Viết Resolution cho audit round 2 vào §9 rồi bump §0 sang `Current execution round = 3`, `Current audit round = 2`, `Next gate` mở `STEP-07..09`. (b) Trước đó xử lý 6 ô `AUDIT.md` ở `LIM-06`: quyết chúng là "AC thuộc pha live, đo ở execution round 3" hay là "audit thiếu phép đo, mở audit round 3". Tôi **không** kết luận hộ — verdict không phải việc của Tier 2. Sau khi §0 mở, runbook §2.4 chạy được ngay, không cần sửa gì thêm |
| `LIM-06` | Limitation — mới ở round 3, đọc `AUDIT.md` để làm preflight | Đối chiếu từng ô `AUDIT.md` §2 với văn bản AC trong `TASK.md` §6, có **6 ô** mà bằng chứng không phải phép đo mà AC đòi: `AC-07` (`PASS`, evidence *"Xác thực dựa vào `EV-14`/`EV-15`"`) trong khi AC đòi *"Branch `pre-rls-repair-2026-08-31` tồn tại… Chứng minh bằng `neon branches list`"* — branch đó chưa được tạo, chính §2.4 và §7 của HANDOFF này khai là chưa chạy `STEP-07`; `AC-09` (`PASS`, *"Tier 1 kiểm chứng (dữ liệu live)"*) trong khi AC đòi `schema-diff` **sau khi áp**; `AC-10` (`PASS`, *"Func trước/sau giống hệt nhau"*) trong khi AC đòi so **trước và sau** trên live — chưa có "sau"; `AC-01` (`PASS`, *"Xem Handoff, Tier 3 chạy Unit Test Pass 100%"*) trong khi AC đòi *"mở migration gốc theo bảng chiếu của `STEP-03` và so thân policy từng ký tự"* — unit test không đo được thân policy; `AC-04` (`PASS`, *"được đảm bảo qua function parity"*) trong khi AC đòi hai lần `migrate deploy` cộng `typecheck` cộng `test:unit` exit 0; `AC-03` (`PASS`, *"Khẳng định không có function mới"*) trong khi AC đòi một con số `grep -cE` | Ba ô đầu là AC của **pha live chưa chạy**, nên tự nó không phải sai sót của Tier 3 mà là hệ quả của việc audit lane test bị hỏi cả AC lane live; xử lý bằng cách đo lại ở execution round 3. Ô `AC-01` là ô đáng lo nhất vì nó là hàng rào duy nhất của `RISK-03` *"policy mới rộng hơn bản gốc"* — nếu không ai so từng ký tự thì lệnh ghi lên live sẽ dựa trên một hàng rào chưa được kiểm độc lập. Phần thực chất mà audit **có** làm thật, và là phần `DEC-08` cần: Tier 3 tự `prisma migrate deploy` lên `hrp_mp2_test` rồi tự chạy probe, exit 0, ra `TABLES_RLS_ENABLED=34 PERMISSIVE_TOTAL=45`, `EV02_PERMISSIVE_TOTAL=15`, `AC-12` 4 role thấy dòng và `HR_STAFF` 0 dòng — khớp từng số với phép đo round 1 của tôi | Tier 1 quyết theo `BLK-02` mục (b). Tôi chỉ nêu chênh giữa văn bản AC và văn bản evidence; tôi **không** phát hành verdict, **không** sửa `AUDIT.md`, **không** tự audit lại phần của mình |
| `DEV-01` | Deviation | 4 trong 6 migration gốc viết policy bên trong khối `DO $$ … END $$` hoặc `EXECUTE $POL$ … $POL$`. Khi nhấc ra thành câu lệnh phẳng tôi bỏ thụt đầu dòng đồng loạt: **−6** khoảng trắng cho `hrp_contract_scope` (lấy từ chuỗi dollar-quoted), **−4** cho các policy lấy từ trong `DO $$` | Chỉ whitespace. Cây phân tích SQL không đổi, `pg_get_expr` của policy sau khi tạo sẽ giống hệt bản gốc. Không một token, một điều kiện `OR`, một tên hàm nào bị thêm bớt | Không cần quyết. Nêu ra để Tier 3 khi so §2.1 "từng ký tự" biết trước rằng lệch duy nhất được phép là số khoảng trắng đầu dòng |
| `DEV-02` | Deviation | `prisma migrate deploy` lần 1 trên `hrp_mp2_test` báo `2 migrations found` và áp `20260829093000_mp2_public_rpc_schema_usage` **trước** `m14`. Migration đó đang pending sẵn trên test từ luồng khác, không phải của tôi | `migrate deploy` không có cờ áp một migration lẻ, nên không thể tránh. Tôi đọc nội dung nó trước khi chạy: đúng một câu `GRANT USAGE ON SCHEMA public TO hrp_public_rpc` có bọc điều kiện tồn tại role, 0 câu lệnh hàm, 0 câu lệnh policy ⇒ không chạm bẫy `EV-07` và không chạm 15 bảng `EV-02` | Cần Tier 1 biết: khi chạy `STEP-08` lên `hrp-live`, `migrate deploy` cũng sẽ cuốn theo mọi migration pending của live. Đây chính là lý do `RISK-06` bắt in danh sách pending trước — và là lý do `BLK-01` chặn cứng bước đó |
| `LIM-01` | Limitation — **đã thành contract ở `DEC-16`** | Mục H của probe: `APP_USER_SELECT_TRUE=0/15`, `WRITER_SELECT_TRUE=15/15`, `WRITER_INSERT_TRUE=15/15` (đo bằng `has_table_privilege`) | `app_user` **không có** GRANT `SELECT` trên bất kỳ bảng nào trong 15 bảng, nên mọi câu SELECT của nó trả `42501` ở tầng bảng, trước cả RLS. Cụm "cả 2 role" của `AC-08` vì vậy không đo được cho `app_user` trên project này — không phải vì policy sai mà vì role đó không có quyền bảng | Đã có quyết: `DEC-16` chốt phép đo hành vi chỉ dùng role có GRANT, tức `app_user_writer`, còn ma trận GRANT vẫn phải in cả hai role, và **không** thêm `GRANT` nào trong task này. Việc GRANT cho `app_user` nếu cần thì là task khác |
| `LIM-02` | Limitation — **đã thành contract ở `DEC-16`** | Ngữ nghĩa Postgres, đo lại được: RLS chặn đọc bằng cách **trả 0 dòng**, nó không phát lỗi. Trên một câu `SELECT`, `42501` chỉ có một nghĩa là thiếu GRANT tầng bảng | `AC-08` viết "trước là 0 dòng và `42501`". Hai dấu hiệu đó không xảy ra cùng lúc trên cùng một câu lệnh: `0 dòng` là chữ ký RED của `SELECT`, `42501` là chữ ký RED của `INSERT`/`UPDATE`. Đọc lẫn hai cái sẽ ra kết luận sai về nguyên nhân | Đã có quyết cùng `DEC-16`. `EV-15` in đúng theo tách này (15/15 SELECT `0 dòng`, 15/15 INSERT `42501`), và probe in cột GRANT ngay cạnh để tách hai nguyên nhân trùng mã |
| `LIM-03` | Limitation | 3 bảng có `WITH CHECK` là `EXISTS (SELECT 1 FROM <cha> WHERE id = <fk>)`: `attendance_import_rows`, `client_statement_lines`, `timesheet_lines`. Lần chạy đầu chúng trả `42501` trên branch **đã có đủ policy** — RED giả | Nếu FK là uuid bịa thì `EXISTS` sai và Postgres trả đúng `42501`, trùng chữ ký "RLS chặn" ⇒ phép đo mất khả năng phân biệt. Tôi sửa probe: chèn một dòng cha thật trong cùng transaction rồi mới chèn con, vẫn `ROLLBACK`. Sau khi sửa: 15/15 `RLS_PASSED`, in kèm `parent=<bảng>:OK` | Không cần quyết. Ghi lại vì trên live nửa RED, dòng cha **không thể** che RED: khi không có policy permissive nào thì `WITH CHECK` sai vô điều kiện và `42501` bật trước cả trigger FK |
| `LIM-04` | Limitation | `scratch/golive06-migrstate.mjs` tính `PENDING_COUNT` = số thư mục trong `prisma/migrations/` trừ số row có trong `_prisma_migrations` | Đó **không** phải định nghĩa của Prisma: Prisma bỏ qua row đã `rolled_back_at`, nên một slug từng rollback rồi chạy lại sẽ làm hai phép đếm lệch nhau. Trên test tôi thấy đúng ca đó (`FUP-02`) | Không cần quyết. Khi chạy live, số quyết định là output của `prisma migrate status` / `migrate deploy`, script của tôi chỉ là ảnh nhanh đọc-only để thoả `RISK-06` |
| `LIM-05` | Limitation — mới ở round 2 | Toàn bộ số của `hrp-live` trong HANDOFF này — §2.3, và cột live của `AC-06`/`AC-08`/`AC-10`/`AC-11`/`AC-15` — lấy từ `EV-14` cộng `EV-15` trong TASK `v1.1`, do Tier 1 đo ngày 2026-08-31. Tôi không nối `hrp-live` ở round nào, cả round 1 (bị chặn) lẫn round 2 (sếp chỉ thị không chạy lại) | Tôi **không** kiểm chứng độc lập được số live, nên nếu `EV-14`/`EV-15` sai thì phần live của HANDOFF này sai theo. Hai chỗ hẹp cụ thể: hash `pg_get_functiondef` của live in **rút gọn** nên chưa so đủ 64 ký tự (`AC-10`), và `AC-06` chỉ có `PENDING_COUNT` chứ chưa có bảng từng row của live | Không cần quyết. Nêu để Tier 3 giữ đúng ranh giới: chỗ nào là phép đo của tôi thì audit tôi, chỗ nào ghi `EV-14`/`EV-15` thì đó là evidence của Tier 1. Cả hai chỗ hẹp tự đóng khi `STEP-08` chạy lệnh 1, 2, 3 và 6 của §2.4 |
| `FUP-01` | Follow-up — **ĐÃ XỬ LÝ, thành `DEC-17`** | Round 1, đo trên `hrp_mp2_test`: `PERMISSIVE_TOTAL=45` (lọc `relrowsecurity`) bằng `PERMISSIVE_TOTAL_ALL_PUBLIC=45` (không lọc) vì `TABLES_WITH_POLICY_BUT_RLS_OFF=0`; ticket nắm `TICKET_PERMISSIVE=8` (4/2/2, restrictive 0); `EV02_PERMISSIVE_TOTAL=15`; phần còn lại `22`. Round 2: `EV-15` xác nhận trên live đúng cặp `22` (lọc) và `30` (không lọc) | Không tách hai cơ sở đếm thì nửa RED của live in `22` trong khi văn `AC-11` nói `30`, và Tier 3 dễ đọc thành FAIL oan. Lệch đúng `8` vì 8 policy ticket nằm trên bảng chưa bật RLS | Đã có quyết: `DEC-17` ghi hai cơ sở thành luật, `AC-11` giờ đọc `30 → 45` (toàn schema) cộng `22 → 45` (lọc). Probe in cả hai số nên Tier 3 không phải suy. Hết việc |
| `FUP-02` | Follow-up | Trên test sau deploy: `repo_migration_dirs=27 applied_rows=28`, `UNFINISHED_ROWS=1` = `20260819083254_p2_commission_schema` với `rolled_back_at_is_null=false applied_steps_count=0` | Slug đó có **hai** row trong `_prisma_migrations`: một row đã rollback và một row thành công. Đó là toàn bộ chỗ lệch 28 so với 27; Prisma coi trạng thái là đã áp, nên vô hại và không chặn deploy | Không cần quyết cho task này. Nêu để lần sau không ai đọc "28 ≠ 27" thành drift |
| `FUP-03` | Follow-up | `hrp_attendance_import_batch_scope` (gốc dòng 30-38) và `hrp_attendance_import_row_scope` (gốc dòng 52-66) **không có** `WITH CHECK` trong bản gốc | Với policy `FOR ALL` thiếu `WITH CHECK`, Postgres dùng `USING` làm điều kiện ghi. Tôi giữ nguyên theo `DEC-04`, không thêm | Tier 1 quyết sau: đây là ý đồ ban đầu hay là sót. Không sửa trong task này. TASK §9 của `v1.1` đã nhận vào backlog, không chặn task này |
| `FUP-04` | Follow-up | 3 policy so `pm_user_id` trực tiếp thay vì gọi hàm: `hrp_project_assignment_scope` (`$M` dòng 70), `hrp_contract_scope` (dòng 113), `hrp_candidate_submission_scope` (dòng 136) | Nhánh PM của 3 policy đó chỉ khớp PM chính, **không** thấy sub-PM, dù `hrp_project_visible_for` bản m13 đã hỗ trợ `sub_pm_user_id_1`/`_2`. Tức sau khi vá, PM phụ vẫn không đọc được 3 bảng này qua nhánh PM | `DEC-04` nói rõ: thấy chỗ này thì **ghi follow-up, không tự sửa trong task này**. Tôi làm đúng vậy — sao y bản gốc. TASK §9 của `v1.1` đã nhận vào backlog; cần Tier 1 mở task riêng nếu muốn PM phụ có quyền |
| `FUP-05` | Follow-up — mới ở round 2, **bắt buộc theo `AC-06`** | `EV-14` cho đúng 2 pending trên live và không slug nào trong 6 slug `EV-04` nằm trong đó ⇒ cả 6 đều đã có row `_prisma_migrations` trên `hrp-live` (suy luận đầy đủ ở ô `AC-06`); cùng lúc `EV-15` cho `EV02_PERMISSIVE_TOTAL=0` trên đúng 15 bảng mà 6 migration đó lẽ ra đã tạo policy | Đây là **trường hợp thứ ba** của `AC-06`: Prisma ghi nhận đã áp 6 migration RLS thời s1/p2 nhưng hiệu lực SQL của chúng **không tồn tại** trên live. Hai giả thuyết cần điều tra, tôi không đủ dữ liệu để chọn: (a) 6 migration chạy trên một branch khác rồi row lịch sử đi theo branch mới sinh qua `neon branches create`, còn object thì không đi theo; (b) chúng có chạy trên live nhưng object bị một bước sau đó xoá — `m1_07b` ngày 27/08 là mốc đáng soi vì nó biến "thiếu policy" thành DENY-ALL. Không giả thuyết nào chặn `m14`: nó là migration forward và `DROP POLICY IF EXISTS` chịu được cả hai ca | Cần Tier 1 mở task điều tra lịch sử deploy. `AC-06` bắt buộc có follow-up cho đúng ca này nên tôi ghi ở đây; tôi **không** tự điều tra ngoài scope và **không** chạm `_prisma_migrations` (`AC-05` cấm) |

## 6. Evidence Index

Không có artifact rời, và round 2 vẫn **không** sinh path thứ 5. §4.2 cho đúng 4 path nên toàn bộ output ngắn nằm ngay trong §2.1, §2.2, §2.3 và §3.

Evidence của lane `hrp-live` **không** nằm ở đây: nó nằm trong `docs/tasks/hrp-v5-go-live-06-live-rls-matrix-restore/TASK.md` §2 tại `EV-14` và `EV-15`, là file của Tier 1 và tôi không được sửa. HANDOFF này chỉ trích số từ đó và ghi rõ chỗ nào là trích (`LIM-05`).

Hai file `scratch/neon-schemadiff-live-vs-mp2test.txt` và `scratch/neon-schemadiff-snapshot-vs-live.txt` đang có trong worktree là của Tier 1 từ lúc viết contract, **không** phải evidence do tôi sinh ra và tôi không chạm vào chúng. File log tạm của lần chạy probe thứ ba đã xoá sau khi đọc.

## 7. Execution Round History

| Round | Spec | Status | Ghi chú |
|---|---|---|---|
| 1 | `v1.0` | `BLOCKED` | Lane `hrp_mp2_test` xong trọn: migration 18 đối tượng, 2 lần deploy exit 0, probe trước/sau giống hệt từng số kể cả 2 sha256, typecheck cộng 1420 unit test exit 0, worktree sạch đúng 4 path. Lane `hrp-live` chưa chạy một lệnh nào — kể cả lệnh đọc — vì `BLK-01`. Không ghi gì lên live (`DEC-08`) |
| 2 | `v1.1` | `READY_FOR_AUDIT` | Không sinh thêm code: 3 artifact của round 1 giữ nguyên sha256 và mtime (§4). Tiếp nhận `EV-14`/`EV-15` do Tier 1 đo trên `hrp-live` ⇒ `BLK-01` đóng, `AC-15` thoả, `AC-08` đủ hai nửa, `AC-10`/`AC-11` có cột "trước", `AC-06` có kết luận trường hợp ba cộng `FUP-05`. Cập nhật runbook §2.4 theo `v1.1`: snapshot `pre-rls-repair-2026-08-31`, allowlist đúng 2 migration của `DEC-15`, `prisma migrate status` làm cửa kiểm trước khi ghi. Chạy lại gate: `verify-task.ps1` trên `v1.1` exit 0, typecheck exit 0, `test:unit` exit 0 với 93 file / 1420 test. Vẫn **không** ghi gì lên `hrp-live`, không tạo snapshot, không chạy `STEP-07..09` |
| 3 | `v1.1` | `BLOCKED` | Preflight FAIL: contract chưa mở round cho `STEP-07..09` (`BLK-02`). Không sinh code, không nối `hrp-live` kể cả lệnh đọc. Đo lại trạng thái repo trên baseline mới `71fb23a` và chạy lại 3 gate tĩnh, tất cả exit 0. Chi tiết ở §8 |

## 8. Round 3 — Preflight và lý do dừng

Sếp giao `/code hrp-v5-go-live-06-live-rls-matrix-restore` lần thứ ba, sau khi `AUDIT.md` round 2 kết `PASS`. Việc còn lại duy nhất của contract là `STEP-07`, `STEP-08`, `STEP-09` — tức ghi lên `hrp-live`. Tôi **không** chạy chúng, và đây là lý do đo được, không phải sự thận trọng chung.

`.ai-pipeline/tier2.md` PREFLIGHT: *"Chỉ bắt đầu khi: TASK status là `READY_FOR_EXECUTION` hoặc `REVISION_REQUIRED` có resolution rõ… Nếu không đạt, tạo/cập nhật `HANDOFF.md` với status `BLOCKED`, nêu blocker, evidence và quyết định cần Planner đưa ra; sau đó dừng."* `TASK.md` hiện tại mở đúng **round 2**, và §0 của chính round đó kết bằng chữ **"chưa ghi `hrp-live`"**, `Next gate` vẫn trỏ sang Tier 3, §9 chưa có Resolution nào cho audit round 2. Tôi không được sửa `TASK.md`, nên không có đường nào để tự mở round 3. Toàn văn ở `BLK-02`; phần chênh giữa văn bản AC và văn bản evidence của `AUDIT.md` ở `LIM-06`.

Những gì tôi **đã** đo được mà không cần chạm live:

- **Baseline đã dịch.** `git log --oneline -n 3` cho `71fb23a refactor(marketplace): consolidate public job routes`, `22c51df chore: audit round 2 … PASS`, `c7e2069`. Hai commit đó vào sau lúc tôi giao round 2; cả hai đều không phải của tôi.
- **`71fb23a` không chạm `prisma/`.** `git diff --name-only 22c51df..71fb23a -- prisma/` trả **rỗng**. `git show --stat 71fb23a` cho 11 file, toàn bộ trong `app/`, `packages/`, `src/`, `tsconfig.json`. Vậy nó không đổi một ký tự nào của `m14` và không sinh migration nào.
- **Allowlist `DEC-15` còn nguyên ở phía repo.** `ls prisma/migrations/` cho hai thư mục cuối đúng bằng hai slug của allowlist, theo đúng thứ tự: `20260829093000_mp2_public_rpc_schema_usage` rồi `20260830214139_m14_rls_matrix_repair`. **Không có thư mục migration thứ ba** nào xuất hiện sau `EV-14`. Vì tập pending của Prisma = thư mục trong repo trừ row đã áp, và không thư mục nào thêm hay mất, phía repo không có gì làm tập pending khác hai tên đó. Nửa còn lại — phía DB — là `EV-14` do Tier 1 đo lúc 08:29 hôm nay; `STEP-08` vẫn phải chạy lại `prisma migrate status` như `DEC-15` bắt buộc, tôi **không** thay thế phép đo đó bằng suy luận này.
- **Ba artifact của tôi không đổi một byte** so với round 2, đo lại bằng `sha256sum`: `migration.sql` `5c9c9dc7f97064a6a13dbbdcb561a3b78446ea3a526636a5358e518baf018ed5`, `golive06-rls-probe.mjs` `b63eebb799e4c39724e64492eb184bf6c25d896bd1b9660117ee9fbf95c6097a`, `golive06-migrstate.mjs` `42216d205ea96750face9bb933980915fb48b0fde702525ee760ceec6590d83b`. Round 3 không sinh code; file duy nhất tôi sửa là `HANDOFF.md` này.
- **Worktree bẩn hơn round 2, không phải do tôi.** `git status --short` cho `TOTAL=39`, `UNTRACKED=33`, `TRACKED_MODIFIED=6`, index rỗng (`git diff --cached --name-only` = 0 dòng). Sáu file tracked `M`: `app/(portal)/page.tsx`, `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`, `docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md`, `docs/tasks/hrp-v5-go-live-06-live-rls-matrix-restore/AUDIT.md`, `public/index.html`, `src/domains/applications/marketplace-inventory.static.test.ts`. Ba cái mới so với round 2 là `app/(portal)/page.tsx`, `marketplace-inventory.static.test.ts` và `AUDIT.md` của task này (`git diff` cho đúng **1** dòng thêm, là dòng trắng cuối file). Không cái nào thuộc 4 path §4.2 của tôi và tôi **không** reset, stage, commit hay restore cái nào.
- **Ba gate tĩnh chạy lại trên baseline mới, tất cả exit 0.** `verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-06-live-rls-matrix-restore/TASK.md` → `RESULT: PASS. TASK contract is ready for execution.` exit 0. `npm run typecheck` → exit 0. `npm run test:unit` → exit 0, `92 passed (92)` file và `1411 passed (1411)` test, `19.40s`.

Một chỗ cần nói rõ để Tier 3 không đọc thành regression: `test:unit` round 2 là **93 file / 1420 test**, round 3 là **92 file / 1411 test** — giảm 1 file và 9 test. Nguyên nhân nằm ngoài task này: `71fb23a` xoá `packages/job-board/src/filter.test.ts` cùng cả package `packages/job-board`, và sửa 3 file test tĩnh. Tôi đối chiếu bằng `git show --stat` chứ không tách từng test một, nên tôi khai đúng mức đó: con số giảm khớp với commit không phải của tôi, và vì commit đó không chạm `prisma/` nên nó không liên quan tới `m14`. Cả hai lần đều exit 0, nên nửa `typecheck` cộng `test:unit` của `AC-04` vẫn thoả trên baseline hiện tại.

Những gì round 3 **không** làm, liệt kê để audit không phải suy: không `neon branches create` (`STEP-07` chưa chạy, `pre-rls-repair-2026-08-31` chưa tồn tại); không `prisma migrate status` và không `prisma migrate deploy` lên `hrp-live` (`STEP-08`); không `schema-diff` (`STEP-09`); không nối `hrp-live` bằng bất kỳ lệnh nào, kể cả lệnh chỉ đọc; không sửa `TASK.md` hay `AUDIT.md`; không commit, stage, push; không chạm `_prisma_migrations`; không sửa `m14` hay hai script probe; không tạo 3 hàm của `EV-13`.

Trạng thái cuối của hai branch, theo `RISK-11` bắt buộc khai cả hai dù kết cục nào: `hrp_mp2_test` đã có đủ 18 đối tượng của `DEC-03` (round 1 tôi áp, Tier 3 áp lại độc lập ở audit round 2, cùng ra `34/45/45`); `hrp-live` **chưa nhận một câu lệnh ghi nào** từ task này, posture vẫn là RED của `EV-15` — 15 bảng DENY-ALL và 3 bảng ticket chưa `ENABLE`. Runbook §2.4 giữ nguyên 7 lệnh, chưa lệnh nào chạy; sau khi Tier 1 mở round nó dùng được ngay, không cần sửa.

> Handoff status: BLOCKED

## 9. Execution Round 4 — LIVE lane đã thực thi

Phần này **supersede** mọi câu “chưa áp lên `hrp-live`” ở §1–§8, vốn là lịch sử đúng tại thời điểm Round 1–3. Sau khi audit round 2 kết `PASS` tại commit `22c51df`, Planner cập nhật TASK lên `v1.2`, đóng `BLK-02` và mở đúng `STEP-07..09`. Owner authorization và allowlist hai migration ở `DEC-15` được giữ nguyên.

### 9.1 Snapshot và cửa chặn trước deploy

- Snapshot tạo trước thao tác ghi: `pre-rls-repair-2026-08-31`, id `br-purple-fog-azju2qpy`, parent `br-icy-dew-azbrgthw` (`hrp-live`), `expires_at` rỗng, `created_at=2026-08-31T02:41:09Z`.
- `golive06-migrstate.mjs` và `prisma migrate status` cùng xác nhận tập pending **đúng hai phần tử**, không hơn: `20260829093000_mp2_public_rpc_schema_usage`, kế tiếp `20260830214139_m14_rls_matrix_repair`.
- Sáu migration lịch sử ở `EV-04` đều có row đã finish; không dùng `migrate resolve`, không sửa `_prisma_migrations`, không chạy migration thứ ba.

### 9.2 Deploy và trạng thái migration sau deploy

- `npx prisma migrate deploy --schema prisma/schema.prisma` chạy với owner connection của đúng branch `hrp-live`, exit `0`; log xác nhận áp đúng hai slug theo thứ tự allowlist và kết `All migrations have been successfully applied.`
- Chạy lại `npx prisma migrate status --schema prisma/schema.prisma` sau deploy: `27 migrations found` và `Database schema is up to date!`, exit `0`.
- Không connection string, password, token hoặc dữ liệu của ứng viên được in vào evidence.

### 9.3 GREEN posture trên `hrp-live`

Owner probe sau deploy, exit `0`:

| Phép đo | Trước | Sau |
|---|---:|---:|
| Bảng bật RLS | 31 | **34** |
| Permissive policy — toàn `public` | 30 | **45** |
| Permissive policy — chỉ bảng đã bật RLS | 22 | **45** |
| EV-02 có policy permissive | 0/15 | **15/15** |
| EV-02 tổng permissive | 0 | **15** |
| Ticket family bật + force RLS | 0/3 | **3/3** |

Hai hàm bảo vệ quyền sub-PM không đổi byte:

- `hrp_project_visible_for`: sha256 `1ac767baca33a4b97702c84cf4208a679384d47a32c7fbbbb519ed7d08e6a9b7`, length `1248`, `sub_pm_user_id_1=true`, `sub_pm_user_id_2=true`.
- `hrp_worker_visible_for`: sha256 `ce6d738d4ecf6d09f03eaa1aa88c6004af5e624502aa2c4584d2b3317a382110`, length `1266`, `sub_pm_user_id_1=true`, `sub_pm_user_id_2=true`.

Writer probe sau deploy dùng đúng `app_user_writer`, toàn bộ INSERT probe nằm trong `BEGIN` + `ROLLBACK`, exit `0`:

- 15/15 SELECT không còn deny-all; 15/15 INSERT không còn `42501 RLS_DENY`. Các lỗi `23503` do fixture không có FK được probe phân loại đúng là **đã qua RLS**, và không có dữ liệu probe nào được commit.
- `candidate_submissions` có `n_live_tup=4`; với GUC role: `ADMIN=4`, `HR_MANAGER=4`, `DIRECTOR=4`, `SALE=4`, `HR_STAFF=0`, tất cả `sqlstate=00000`. Không in họ tên, số điện thoại, mã tra cứu hay nội dung đơn.

### 9.4 Schema diff và điểm Tier 3 phải phán quyết

`neon branches schema-diff hrp_mp2_test hrp-live` sau deploy cho:

- `0` match `CREATE POLICY` trên 15 bảng EV-02.
- `0` match `ENABLE ROW LEVEL SECURITY` trên ba bảng ticket.
- `0` mention `hrp_project_visible_for`.
- Có mention `hrp_worker_visible_for` **chỉ trong hunk liên quan legacy wrapper**: nhánh so sánh có dòng `hrp_worker_visible(wid text) ... SELECT hrp_worker_visible_for(wid)`, trong khi định nghĩa trực tiếp của `hrp_worker_visible_for` đã được owner probe chứng minh giữ nguyên bằng full SHA-256 và length ở §9.3. Migration `m14` có `0` câu lệnh function.

Điểm cuối không làm thay đổi hành vi vừa đo, nhưng văn bản `STEP-09` đòi “0 dòng nào chứa `hrp_worker_visible_for`”. Tier 2 không tự waive. Tier 3 phải kiểm độc lập rằng đây là diff của legacy wrapper ngoài 18 đối tượng task, rồi quyết `PASS` hoặc mở follow-up hẹp; không được diễn giải nó thành thay đổi thân hàm khi full hash trước/sau giống hệt.

### 9.5 Giao audit

- Code/artifact của task vẫn là bốn path §4; migration và hai probe không sửa byte sau audit round 2, chỉ HANDOFF được bổ sung LIVE evidence.
- LIVE target hiện đã đạt posture đích và 4 đơn ứng tuyển production đã đọc được dưới đúng bốn role queue. Việc hiển thị menu/card ở public/admin là một commit UI riêng, không được nhập vào diff audit DB này.
- Gate tiếp theo: `/audit hrp-v5-go-live-06-live-rls-matrix-restore` Round 3.

> Handoff status: READY_FOR_AUDIT
