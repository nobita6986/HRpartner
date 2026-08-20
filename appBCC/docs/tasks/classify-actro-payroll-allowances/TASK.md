# TASK: classify-actro-payroll-allowances

## 0. Control

| Field | Value |
|---|---|
| Task slug | `classify-actro-payroll-allowances` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 (current session) |
| Executor | Tier 2 (Engineer) |
| Auditor | Tier 3 (independent) |
| Baseline | `appBCC` workspace snapshot 2026-08-20; workbook `docs/Actro/LCNT7.xlsx` |
| Modules | M3 — Input/Parser; shared plugin governance; Actro payroll calculation boundary |
| ADR references | None |
| Current execution round | `2` |
| Current audit round | `0` (chưa audit) |
| Next gate | `verify-task → /code → /audit → /resolve → ACCEPTED` |
| Updated | `2026-08-20 12:03 +07` |

## 1. Outcome

### User-visible outcome

Có một mô hình nghiệp vụ và implementation boundary được kiểm chứng cho các khoản payroll của Actro, đồng thời có governance AI-in-the-loop/Human-in-the-loop dùng chung cho toàn bộ plugin của appBCC.

**Shared plugin governance (áp dụng cho mọi plugin hiện tại và tương lai):**

- AI chỉ được đề xuất mapping header, phát hiện bất thường hoặc hỗ trợ giải thích; không được tự quyết tiền lương, quyền lợi, override công hay commit dữ liệu.
- Mọi AI proposal phải có human review trước khi được dùng; nếu không có proposal mới thì phải hiển thị nguồn mapping đã cache và trạng thái review.
- Mọi input thủ công, override, exception và hành động ghi/xóa/xuất dữ liệu phải có human gate, trace theo project/kỳ/nhân viên và không được vượt scope plugin.
- Không cho commit khi còn lỗi blocking, thiếu review hoặc dữ liệu không xác định nguồn.
- Governance contract này áp dụng cho tất cả plugin; không áp đặt công thức payroll của Actro cho plugin khác.

**Actro-only payroll scope:**

- `Lương` (giữ nguyên kết quả hiện tại; trong app gọi là `Lương giờ`).
- `Chuyên cần HR`, `Phụ cấp soi kính`, `Phụ cấp đời sống`, `Phụ cấp nhà ở`, `Thâm niên`, `Thanh toán`, `Trừ ứng`, `Thực nhận`.

Mỗi khoản Actro phải được đánh dấu là `RULE_BASED`, `INPUT_BASED` hoặc `HYBRID`, có nguồn dữ liệu, công thức/quy tắc, độ chính xác và cách xử lý ngoại lệ rõ ràng. Kết quả `Lương giờ` hiện có phải được giữ nguyên làm baseline đối chiếu.

### Non-goals

- Không thay đổi công thức payroll của plugin khác ngoài việc áp dụng shared governance gate.
- Không tự động đọc lại workbook HR để làm nguồn runtime lâu dài.
- Không tự suy luận ngày lễ, bậc thâm niên, điều kiện nhà ở hoặc lý do ứng từ tên/giá trị Excel.
- Tự kết luận chính sách cho các dự án ngoài Actro.
- Không đưa rule allowance/payroll Actro vào plugin khác.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/Actro/LCNT7.xlsx`, `officecli view ... outline`, exit 0 | Workbook chỉ có sheet `LCN`, kích thước 118 dòng x 470 cột, có 5.027 công thức. | Đây là workbook có cấu trúc tính toán, cần phân tích formula/value và không chỉ đọc kết quả cuối. |
| `EV-02` | `docs/Actro/LCNT7.xlsx`, row 10 columns `KS:LB`, Python/openpyxl read, exit 0 | `KS:LƯƠNG`, `KT:Chuyên cần HR`, `KU:Phụ cấp soi kính`, `KV:Phụ cấp đời sống`, `KW:Phụ cấp nhà ở`, `KX:Thâm niên`, `KY:Thanh toán`, `KZ:Trừ ứng`, `LA:Thực nhận`, `LB:Xác nhận`. | Khóa mapping cột chuẩn cho phase tiếp theo. |
| `EV-03` | `docs/Actro/LCNT7.xlsx`, column profile rows 12:111, Python/openpyxl read, exit 0 | `KS` có 97/97 formula; `KT` 97/97; `KU` 15/15; `KV` 97/97; `KW` 0 formula và 2 values; `KX` 36 formula; `KY` 97/97; `KZ` 11 formula và 21 values; `LA` 99/99. | Phân loại không thể dựa riêng vào việc cột có dữ liệu; phải nhận diện formula, input và điều kiện áp dụng. |
| `EV-04` | `docs/Actro/LCNT7.xlsx`, row 15 formula/value sample, Python/openpyxl read, exit 0 | `KS15 = KR15*SUMPRODUCT(KD15:KK15,$KD$13:$KK$13)`; `KY15 = SUM(KS15:KX15)`; `LA15 = ROUNDDOWN(KY15-KZ15,-3)`. | `Lương giờ`, `Thanh toán`, `Thực nhận` là chuỗi công thức phụ thuộc; không được thay đổi khi thêm phụ cấp. |
| `EV-05` | `docs/Actro/LCNT7.xlsx`, rows 15:111, Python/openpyxl read, exit 0 | `KT = IF(KL>25,400000,IF(KL>24,200000,0))`; `KV = $KV$9/26*KL`, với `KV9=300000`; `KU` chỉ phát sinh người có loại `Soi kính`, theo `$KU$9/26*KL`, với `KU9=450000`. | Đây là nhóm `RULE_BASED`, nhưng cần chốt ý nghĩa của `KL` (công HC/ngày công chuẩn) và giới hạn kỳ. |
| `EV-06` | `docs/Actro/LCNT7.xlsx`, rows 15:111, Python/openpyxl read, exit 0 | `KX` dùng các mức gốc 200.000, 400.000 và 600.000 chia 26 nhân `KL`; mức gốc thay đổi theo từng nhân viên. | `Thâm niên` là `HYBRID`: phép tính có quy tắc nhưng mức/eligibility là master data hoặc quyết định HR. |
| `EV-07` | `docs/Actro/LCNT7.xlsx`, rows 15:111, Python/openpyxl read, exit 0 | `KW` không có formula; chỉ 2 nhân viên có giá trị 400.000. | `Phụ cấp nhà ở` hiện là `INPUT_BASED`/ngoại lệ, chưa đủ bằng chứng để tự động hóa. |
| `EV-08` | `docs/Actro/LCNT7.xlsx`, rows 15:111, Python/openpyxl read, exit 0 | `KZ` có cả số nhập tay và formula cộng nhiều khoản, ví dụ `2500000+500000+200000`, `1000000+1000000`; chỉ một số nhân viên có giá trị. | `Trừ ứng` là `INPUT_BASED`; biểu thức cộng trong Excel là cách ghi dữ liệu, không phải quy tắc tính đủ để suy ra khoản ứng. |
| `EV-09` | `appBCC/core_pipeline.py:53-159`, source read | Pipeline hiện parse giờ/OT, map summary OT và có hardcode cột Actro; chưa có lớp tính độc lập cho `KT:LA`. | Phase implementation phải tách allowance calculation khỏi logic OT, đồng thời giữ compatibility. |
| `EV-10` | `appBCC/core_pipeline.py:166-257`, source read | Pipeline hiện lấy `KL`/công và các cột OT từ input BCC để tính/chuẩn hóa dữ liệu. | Cần định nghĩa rõ contract giữa input BCC, master HR và các khoản điều chỉnh trước khi code. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | `KS`/Lương giờ là baseline bất biến của phase phụ cấp; mọi lần chạy mới phải đối chiếu theo mã thẻ và không tự ý thay đổi kết quả đang có. | sếp | Chốt v1.0 |
| `DEC-02` | `CHOSEN` | Chia khoản thành `RULE_BASED`, `INPUT_BASED`, `HYBRID`; không ép mọi cột thành công thức tự động. | Planner từ yêu cầu sếp + EV-03 | Chốt v1.0 |
| `DEC-03` | `CHOSEN` | `KY/Thanh toán` là tổng trước khấu trừ: `SUM(KS:KX)`, không phải khoản phụ cấp độc lập. | Workbook EV-04 | Chốt v1.0 |
| `DEC-04` | `CHOSEN` | `LA/Thực nhận` là kết quả cuối: `ROUNDDOWN(KY-KZ,-3)` theo workbook hiện tại; quy tắc làm tròn phải giữ nguyên trong phase đầu. | Workbook EV-04 | Chốt v1.0 |
| `DEC-05` | `CHOSEN` | Nguồn runtime duy nhất là file BCC người dùng upload. `LCNT7.xlsx` chỉ là golden reference để đối chiếu trong quá trình triển khai; hệ thống không phụ thuộc dữ liệu HR đã tính sẵn. `Ngày vào` lấy từ BCC. | sếp | Chốt v1.1 |
| `DEC-06` | `CHOSEN` | Kế toán nhập các ngày lễ của từng kỳ trên UI hiện có. Với Actro, số công chuẩn của kỳ là `26 - số ngày lễ đã cấu hình` (ví dụ 2 ngày lễ: `24`). Chuyên cần: đủ số công chuẩn nhận 400.000; thiếu đúng 1 công nhận 200.000; thiếu từ 2 công trở lên nhận 0. Các ngày lễ cấu hình không làm giảm chuyên cần. Kế toán có thể nhập riêng số `attendance_credit_days` cho từng nhân viên/kỳ khi công ty chủ động cho nghỉ (kiểm kê, mất điện, tạm hết việc); số này chỉ dùng để tính `attendance_eligible_workdays = actual_workdays + attendance_credit_days`, không thay đổi công thực tế BCC hay các khoản prorate khác. | sếp | Chốt v1.2 |
| `DEC-07` | `CHOSEN` | Phụ cấp soi kính và đời sống lấy eligibility/công thực tế từ BCC; không dùng dữ liệu HR đã tính. Mức chuẩn giữ theo policy Actro hiện tại cho đến khi có yêu cầu thay đổi. | sếp | Chốt v1.1 |
| `DEC-08` | `CHOSEN` | Nhà ở là input thủ công: kế toán chọn nhân viên cụ thể, nhập mức cho kỳ và review trước khi tính. Sau khi kế toán xác nhận, app lưu trạng thái/mức làm đề xuất cho kỳ sau; kỳ sau không tự áp dụng, người dùng phải review và xác nhận hoặc bỏ. Không mặc định prorate nếu chưa được chọn/nhập. | sếp | Chốt v1.1 |
| `DEC-09` | `CHOSEN` | Thâm niên suy ra trực tiếp từ `Ngày vào` trong BCC tại ngày chốt kỳ: đủ 3 tháng = 200.000, đủ 6 tháng = 400.000, đủ 12 tháng = 600.000; sau đó prorate theo công thực tế như mẫu workbook. | sếp | Chốt v1.1 |
| `DEC-10` | `CHOSEN` | Trừ ứng là input theo từng kỳ: kế toán nhập tay từng nhân viên hoặc import XLSX. Khoản trừ ứng không carry-forward sang kỳ sau; import/manual entry phải có validation và trace nguồn. | sếp | Chốt v1.1 |
| `DEC-11` | `CHOSEN` | Các policy trên áp dụng cho toàn bộ dự án Actro trong phase này. | sếp | Chốt v1.1 |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-00` | Áp dụng shared AI-in-the-loop/Human-in-the-loop governance cho mọi plugin: AI chỉ đề xuất mapping/phát hiện bất thường/giải thích; human phải review proposal và mọi input thủ công, override, exception, push, update, clear hoặc export. Commit phải bị chặn khi còn lỗi blocking hoặc record không có nguồn/review state. Rule payroll Actro không được áp dụng cho plugin khác. | Must | Sếp | Chặn side effect khi thiếu human gate hoặc blocking error. |
| `RQ-01` | Lưu mapping chuẩn `KS:LB` và định nghĩa vai trò của từng khoản trong domain contract Actro. | Must | EV-02, DEC-01 | Reject mapping mơ hồ hoặc trùng khoản. |
| `RQ-02` | Giữ `Lương giờ`/KS làm baseline; phase phụ cấp không được thay đổi giá trị KS hiện tại. | Must | EV-04, DEC-01 | Dừng khi đối chiếu KS trước/sau không khớp. |
| `RQ-03` | Quy tắc hóa `Chuyên cần HR` cho toàn Actro: `standard_workdays = 26 - holiday_count`; `attendance_eligible_workdays = actual_workdays + attendance_credit_days`. Nếu công xét chuyên cần đạt số công chuẩn thì 400.000, nếu thiếu đúng 1 công thì 200.000, thiếu từ 2 công thì 0. Ngày lễ do kế toán nhập trên UI và ngày nghỉ do công ty chủ động đã được kế toán nhập credit không được coi là vắng. | Must | DEC-06 | Không tự tính khi holiday policy kỳ chưa có, công thực tế/credit không hợp lệ, credit âm, hoặc công xét chuyên cần vượt công chuẩn. |
| `RQ-03A` | Cho kế toán nhập tay `attendance_credit_days` theo nhân viên/kỳ với lý do bắt buộc thuộc nhóm nghỉ do công ty (kiểm kê, mất điện, tạm hết việc hoặc lý do có mô tả). Chỉ áp dụng sau review; ghi người nhập, thời điểm và lý do vào calculation trace. | Must | DEC-06 | Credit không được sửa công BCC, không dùng cho soi kính/đời sống/thâm niên, và không carry-forward sang kỳ sau. |
| `RQ-04` | Quy tắc hóa `Phụ cấp soi kính` theo eligibility lấy từ BCC và mức chuẩn Actro, prorate theo công thực tế trong BCC. | Must | EV-05, DEC-07 | Không nhận eligibility từ workbook HR; thiếu field BCC cần thiết tạo exception. |
| `RQ-05` | Quy tắc hóa `Phụ cấp đời sống` với mức chuẩn Actro và công thực tế lấy từ BCC. | Must | EV-05, DEC-07 | Thiếu mức chuẩn hoặc công thực tế hợp lệ → exception, không silent zero. |
| `RQ-06` | Cho kế toán chọn nhân viên và nhập tay `Phụ cấp nhà ở` theo kỳ; lưu proposal/mức đã xác nhận để prefill cho kỳ sau nhưng bắt buộc review/xác nhận lại trước tính lương và cho phép bỏ. | Must | EV-07, DEC-08 | Không tự gán cho toàn bộ nhân viên hoặc tự carry-forward mà chưa review. |
| `RQ-07` | Tính `Thâm niên` trực tiếp từ `Ngày vào` BCC tại ngày chốt kỳ: đủ 3/6/12 tháng tương ứng 200k/400k/600k, sau đó prorate theo công thực tế. | Must | EV-06, DEC-09 | Thiếu/ngày vào không hợp lệ → exception, không suy đoán. |
| `RQ-08` | Tính `Thanh toán` là tổng có kiểm soát của `Lương giờ` và các khoản phụ cấp đã được xác định, không cho nhập đè kết quả. | Must | EV-04, DEC-03 | Nếu thành phần thiếu/invalid → không phát hành thanh toán. |
| `RQ-09` | Cho kế toán nhập tay hoặc import XLSX `Trừ ứng` theo từng nhân viên/kỳ; hỗ trợ nhiều khoản và trace nguồn import/manual. Không carry-forward khoản trừ ứng sang kỳ sau. | Must | EV-08, DEC-10 | Import lỗi/duplicate/thiếu mã nhân viên phải reject và nêu từng dòng lỗi. |
| `RQ-10` | Tính `Thực nhận` sau `Thanh toán - Trừ ứng`, giữ quy tắc `ROUNDDOWN(...,-3)` trong round đầu và hiển thị cả giá trị trước/sau làm tròn. | Must | EV-04, DEC-04 | Dừng nếu sai dấu, sai thứ tự hoặc sai bậc làm tròn. |
| `RQ-11` | Mỗi nhân viên/kỳ phải có calculation trace: BCC upload, holiday policy, input nhà ở, input/import trừ ứng, formula version, exception và kết quả từng thành phần. | Must | EV-03, DEC-05, DEC-10 | Không cho kết quả “đúng số” nhưng không giải thích được nguồn. |

### 4.2 Scope boundaries

**In scope:**

- Shared AI/Human governance layer cho tất cả plugin, gồm mapping review, preview/error review và confirmation trước side effect.
- Domain/data contract và implementation Actro cho `KS:LA` và phân loại khoản.
- Quy tắc bảo toàn baseline Lương giờ và traceability cho phase implementation Actro.
- Input boundary Actro cho master HR, BCC chốt công, allowance override và advance/deduction.

**Out of scope:**

- Sửa mã nguồn hoặc schema trong task DATA này.
- Tự động đọc lại workbook HR để làm nguồn runtime lâu dài.
- Tự suy luận ngày lễ, bậc thâm niên, điều kiện nhà ở hoặc lý do ứng từ tên/giá trị Excel.
- Tự kết luận chính sách cho các dự án ngoài Actro.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Khóa theo `(project, payroll_period, employee_code)`; tiền dùng đơn vị VND và phải thống nhất quy tắc precision/rounding; `Lương giờ` là output baseline bất biến.
- **State:** Kỳ lương đi qua `DRAFT → CALCULATED → REVIEWED → LOCKED`; sau `LOCKED` mọi điều chỉnh phải tạo revision/audit event, không sửa âm thầm.
- **Permission/data scope:** HR/payroll được quản lý master và input điều chỉnh; người xem chỉ thấy kết quả trong tenant/project được cấp quyền; không log PII không cần thiết.
- **Interface:** Calculation result phải tách `hourly_salary`, từng allowance, `payment_total`, `advance_deduction`, `net_pay`, `rounding_delta`, `source_refs`, `exceptions`.
- **Failure/idempotency/concurrency:** Cùng input + cùng version phải cho cùng output; thiếu input bắt buộc tạo exception và chặn lock; không overwrite kết quả đã lock.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-00` | `RQ-00` | Shared workflow governance | Tạo policy/trace model dùng chung; yêu cầu human review cho AI mapping, manual override và destructive/publish side effect; chặn commit khi còn blocking error. Không đưa rule payroll Actro vào plugin khác. | `code`, `testing-protocol` | Unit test policy; UI flow test mapping/error/commit gates. | Gate làm thay đổi công thức plugin hoặc cho phép commit khi blocking. |
| `STEP-01` | `RQ-01,RQ-02` | Actro payroll domain contract | Chuyển mapping `KS:LA` thành field contract và thêm golden baseline từ `LCNT7.xlsx`. | `task-authoring`, workbook evidence | Đối chiếu theo mã thẻ: KS trước/sau bằng nhau. | Có bất kỳ KS nào thay đổi hoặc duplicate employee key. |
| `STEP-02` | `RQ-03,RQ-03A,RQ-04,RQ-05` | Holiday policy and allowance rule layer | Dùng ngày lễ kế toán nhập trên UI để tính `standard_workdays = 26 - holiday_count`; cho nhập/review credit công chuyên cần theo nhân viên do công ty chủ động cho nghỉ; tính chuyên cần từ `actual_workdays + attendance_credit_days`; tính soi kính/đời sống chỉ từ dữ liệu BCC. | `code`, `testing-protocol` | Golden cases 0/1/2 ngày lễ; 24/25/26 công; credit 0/1/2; eligibility soi kính; BCC-only input. | Không có holiday config, credit làm thay đổi công BCC/prorate, hoặc kết quả dựa vào LCNT7/HR precomputed data. |
| `STEP-03` | `RQ-06,RQ-07` | Housing state and seniority rule layer | Cho kế toán nhập nhà ở theo người/kỳ, lưu proposal đã xác nhận để kỳ sau review; tính thâm niên từ ngày vào BCC theo mốc đủ 3/6/12 tháng. | `code`, `databases`, `testing-protocol` | Test proposal accept/remove/change; seniority boundary dates and prorate. | Nhà ở tự áp dụng không qua review hoặc ngày vào không hợp lệ. |
| `STEP-04` | `RQ-08,RQ-09,RQ-10` | Payment/import adjustment layer | Tính tổng; cho nhập tay/import XLSX trừ ứng theo kỳ, validate mã nhân viên/số tiền/duplicate và không carry-forward; làm tròn thực nhận. | `code`, `testing-protocol` | Recompute golden rows; manual/import/multiple deductions; next-period isolation; rounding. | Import lỗi vẫn được tính, trừ ứng carry-forward hoặc sai quy tắc round. |
| `STEP-05` | `RQ-11` | Calculation trace and reconciliation | Ghi trace từng thành phần và báo cáo chênh lệch so với LCNT7; không phát hành nếu exception blocking. | `code`, `audit` | Report 97 nhân viên, exception list, formula version. | Không giải thích được chênh lệch hoặc mismatch key. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-00` | `RQ-00` | Với mọi plugin, AI mapping phải được human xác nhận trước khi persist; preview có record blocking error không thể được push/export; manual override phải có actor/time/reason trace; Push/Clear/Update phải giữ human confirmation. | Unit test governance + UI-flow inspection. | command + exit code + test output | Yes |
| `AC-01` | `RQ-01,RQ-02` | Mapping `KS:LA` đúng và KS không thay đổi trên toàn bộ 97 nhân viên có dữ liệu. | Reconciliation command theo mã thẻ với workbook snapshot. | command + exit code + mismatch count 0 | Yes |
| `AC-02` | `RQ-03,RQ-03A` | Với `holiday_count = 2`, hệ thống dùng `standard_workdays = 24`; `actual_workdays = 22` và `attendance_credit_days = 2` → 400.000; credit 1 → 200.000; credit 0 → 0. Credit phải có lý do/người nhập, không được làm thay đổi công BCC hoặc kết quả soi kính, đời sống, thâm niên. | Unit/golden test với holiday config UI, BCC-only fixture và attendance-credit manual entry. | test output + holiday policy fixture + credit audit trace | Yes |
| `AC-03` | `RQ-04,RQ-05` | Soi kính chỉ áp dụng cho eligibility hợp lệ trong BCC; đời sống prorate đúng mức và công BCC. | Golden test eligible/non-eligible rows không đọc giá trị allowance từ LCNT7. | formula trace + mismatch report | Yes |
| `AC-04` | `RQ-06` | Kế toán chọn người/nhập nhà ở; kỳ sau hiển thị proposal cũ để review, nhưng bỏ/chỉnh được và proposal chưa review không đi vào tính lương. | Workflow test qua hai kỳ. | UI/state evidence + stored proposal event | Yes |
| `AC-05` | `RQ-07` | Ngày vào BCC đủ 3/6/12 tháng lần lượt ra 200k/400k/600k; boundary trước mốc không được nâng bậc; phép tính prorate đúng. | Date-boundary test + source trace từ BCC. | test output + source refs | Yes |
| `AC-06` | `RQ-08` | Thanh toán bằng tổng KS:KX, không nhận giá trị KY nhập đè. | Recompute all eligible rows. | mismatch count 0 | Yes |
| `AC-07` | `RQ-09` | Trừ ứng nhập tay/import XLSX theo kỳ, hỗ trợ nhiều khoản, validate lỗi/duplicate, không xuất hiện ở kỳ sau nếu không nhập lại. | Import/manual test + two-period isolation test. | validation output + import trace | Yes |
| `AC-08` | `RQ-10` | Thực nhận bằng `ROUNDDOWN(payment_total - deduction_total, -3)` và có rounding delta. | Boundary values around thousand-unit thresholds. | test output | Yes |
| `AC-09` | `RQ-11` | Mỗi kết quả có trace nguồn và exception; mismatch với LCNT7 được phân loại, không bị nuốt. | Reconciliation report for 97 rows. | report + exit code 0 only when approved | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-00` | `STEP-00` | `AC-00` |
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01` |
| `RQ-03` | `STEP-02` | `AC-02` |
| `RQ-03A` | `STEP-02` | `AC-02` |
| `RQ-04` | `STEP-02` | `AC-03` |
| `RQ-05` | `STEP-02` | `AC-03` |
| `RQ-06` | `STEP-03` | `AC-04` |
| `RQ-07` | `STEP-03` | `AC-05` |
| `RQ-08` | `STEP-04` | `AC-06` |
| `RQ-09` | `STEP-04` | `AC-07` |
| `RQ-10` | `STEP-04` | `AC-08` |
| `RQ-11` | `STEP-05` | `AC-09` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Thay đổi allowance làm lệch Lương giờ hiện tại. | AC-01 mismatch. | Baseline KS trước/sau, test regression bắt buộc. | Tắt allowance layer và trả về pipeline Lương giờ cũ. |
| `RISK-02` | Nhà ở tự áp dụng hoặc bị mất trạng thái giữa các kỳ. | Kỳ mới tính nhà ở mà chưa được kế toán review/xác nhận. | Lưu proposal từ kỳ trước, luôn yêu cầu review; cho phép sửa/bỏ trước calculate. | Bỏ proposal của kỳ đó, recalculate kỳ ở trạng thái DRAFT. |
| `RISK-03` | Dùng sai ngày lễ, số công chuẩn hoặc credit công chuyên cần. | Kết quả chuyên cần lệch theo ngày lễ/credit đã nhập hoặc credit làm thay đổi khoản prorate. | Cố định công thức `26 - holiday_count`; giới hạn `0 ≤ attendance_credit_days ≤ standard_workdays - actual_workdays`; hiển thị/trace công thực tế, credit và công xét chuyên cần; chỉ credit chuyên cần, không sửa BCC. | Sửa holiday/credit ở DRAFT, recalculate; nếu đã LOCKED tạo revision/audit event. |
| `RISK-04` | Tính thâm niên sai ở ngày biên 3/6/12 tháng. | Ngày chốt kỳ sát mốc thâm niên. | So sánh ngày chốt kỳ với ngày vào từ BCC; test boundary cho từng mốc và prorate. | Recalculate từ BCC snapshot với rule version đúng. |
| `RISK-05` | Import trừ ứng tạo sai nhân viên, trùng dòng hoặc carry-forward sang kỳ sau. | Validation import có lỗi hoặc kỳ mới chứa khoản chưa được nhập. | Validate trước khi apply; preview lỗi từng dòng; scope cứng theo kỳ, không copy sang kỳ sau. | Không apply batch lỗi; xóa batch DRAFT và import lại. |
| `RISK-06` | Excel reference làm che khuất lỗi runtime. | Runtime đọc/đòi dữ liệu từ LCNT7. | Chỉ dùng LCNT7 làm golden reconciliation; mọi input runtime phải là BCC/UI/import của app. | Tắt reconciliation không blocking; giữ pipeline BCC-only. |

## 8. Open Questions

Không còn câu hỏi mở làm thay đổi implementation. Các policy đã chốt trong `DEC-05` đến `DEC-11` áp dụng cho toàn Actro; mọi thay đổi sau này phải mở revision mới của contract.

## 9. Planner Resolution

Chưa có audit round; không có resolution.

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-20 10:55 +07 | Initial DATA contract: phân tích `LCNT7.xlsx`, phân loại khoản, khóa baseline Lương giờ và các blocker cần HR/Finance chốt. | Yêu cầu sếp về mở rộng từ Lương giờ sang phụ cấp/trừ ứng. |
| `v1.1` | 2026-08-20 11:46 +07 | Chốt BCC là nguồn runtime duy nhất; policy ngày lễ/chuyên cần; nhà ở review/carry proposal; thâm niên 3/6/12 tháng; trừ ứng manual/XLSX không carry-forward; phạm vi toàn Actro. Status chuyển `READY_FOR_EXECUTION`. | Quyết định nghiệp vụ của sếp. |
| `v1.2` | 2026-08-20 11:54 +07 | Bổ sung `attendance_credit_days` nhập tay theo nhân viên/kỳ cho ngày nghỉ do công ty chủ động. Credit có lý do/audit, chỉ tăng công dùng xét chuyên cần và không ảnh hưởng công BCC hay phụ cấp prorate. | Quyết định nghiệp vụ của sếp. |
| `v1.3` | 2026-08-20 12:03 +07 | Chuyển sang CODE execution contract. Governance AI/Human dùng chung cho mọi plugin: review mapping, trace manual override, chặn record lỗi trước export/push và confirmation cho side effect. Rule payroll/phụ cấp vẫn chỉ áp dụng Actro. | Quyết định nghiệp vụ của sếp. |
