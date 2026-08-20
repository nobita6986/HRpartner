# TASK: add-sheet-selector

## 0. Control

| Field | Value |
|---|---|
| Task slug | `add-sheet-selector` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 (current session) |
| Executor | Tier 2 (Engineer) |
| Auditor | Tier 3 (independent) |
| Baseline | `appBCC@HEAD` (commit pending), workspace `c:\CodeApp\HrP\appBCC` |
| Modules | M3 — Input/Parser (core_pipeline + app.py UI) |
| ADR references | None |
| Current execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Next gate | `verify-task → /code → /audit → /resolve → ACCEPTED` |
| Updated | `2026-08-20 09:22 +07` |

## 1. Outcome

### User-visible outcome

Khi mở file Excel BCC có nhiều sheet trong appBCC:
- **Trường hợp 1 sheet**: parse luôn sheet đầu tiên như hiện tại (không đổi behavior).
- **Trường hợp nhiều sheet**: hiện popup/combobox cho phép user chọn sheet nào để parse. Parse **đúng 1 sheet user chọn** (không gộp/ghi đè). Nếu file có sheet ẩn (hidden/veryHidden) thì KHÔNG liệt kê các sheet ẩn đó trong danh sách chọn; chỉ liệt kê sheet visible.

### Non-goals

- Không thay đổi logic parse bên trong `preview_file()` (header detection, AI mapping, OT extraction).
- Không thêm tính năng parse đồng thời nhiều sheet cùng lúc.
- Không tự động merge nhân viên giữa các sheet.
- Không đổi schema DB, không đổi output Excel format.
- Không validate nội dung sheet (chỉ chọn sheet, logic parse giữ nguyên).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `appBCC/core_pipeline.py:38` | `df = pd.read_excel(file_path, header=None)` đọc mặc định **sheet đầu tiên** của file Excel. | Cần đổi sang đọc theo tên sheet được truyền vào, hoặc tự detect nếu 1 sheet. |
| `EV-02` | `appBCC/core_pipeline.py:30` `def preview_file(file_path, project_name, period_month, period_year, log_callback=print, review_callback=None, holiday_config=None)` | Hiện không có parameter chọn sheet. | Cần thêm parameter `sheet_name: Optional[str] = None`. |
| `EV-03` | `appBCC/app.py:58` `data = preview_file(self.file_path, self.project_name, ...)` | UI gọi `preview_file` không truyền sheet. | UI phải detect số sheet trước khi gọi, popup chọn nếu > 1. |
| `EV-04` | Test ad-hoc `python -c "import openpyxl; wb=openpyxl.load_workbook(r'C:\\CodeApp\\HrP\\appBCC\\docs\\Actro\\round2\\BCCActroT7_OK.xlsx'); print(wb.sheetnames, [wb[s].sheet_state for s in wb.sheetnames])"` | File input mẫu có 2 sheet: `OUT` (hidden) và `Overtime (2)` (visible). Khi user mở Excel chỉ thấy 1 sheet → appBCC hiện đang đọc nhầm `OUT` (45 NV) thay vì `Overtime (2)` (98 NV). | Đây chính là lý do cần task này: user không có cơ chế chọn sheet khi file có nhiều sheet ẩn. |
| `EV-05` | `appBCC/app.py:159-200` (pattern `QDialog` / `QComboBox` / `QDialogButtonBox`) | UI hiện dùng Qt với pattern `QDialog` cho popup (vd `HolidayConfigDialog`). | Tái sử dụng pattern này cho `SheetSelectorDialog`. |
| `EV-06` | `pandas.read_excel` doc | Hỗ trợ `sheet_name=str` để đọc đúng 1 sheet; `pd.ExcelFile` cung cấp `sheet_names` và `book[s].sheet_state` (cần `openpyxl`). | Dùng `pd.ExcelFile` + `openpyxl` để list visible sheets, rồi truyền `sheet_name` vào `read_excel`. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Liệt kê CHỈ sheet `visible` cho user chọn (bỏ qua `hidden` và `veryHidden`). Lý do: user chỉ thấy sheet visible khi mở Excel, sheet ẩn thường là sheet phụ/nháp. | sếp | v1.0 |
| `DEC-02` | `CHOSEN` | Khi file có đúng 1 sheet visible, app tự đọc luôn không hỏi (giảm friction cho case phổ biến). Nếu file có 0 sheet visible → raise error rõ ràng. | sếp | v1.0 |
| `DEC-03` | `CHOSEN` | Tên hiển thị trong popup: chỉ tên sheet (`wb.sheetnames[i]`); có tooltip hoặc label phụ hiển thị `(ẩn: N sheet khác)` nếu có sheet ẩn, để user biết file không chuẩn. | sếp | v1.0 |
| `DEC-04` | `CHOSEN` | Không thay đổi signature `preview_file()` ở dạng breaking change. Thêm parameter `sheet_name: Optional[str] = None` ở cuối (backward-compatible: nếu None thì giữ behavior cũ — đọc sheet đầu tiên kể cả ẩn, để code cũ / test cũ không vỡ). | Planner | v1.0 |
| `DEC-05` | `ASSUMPTION` | `openpyxl` đã được cài (xác nhận qua `import openpyxl` thành công ở EV-04). | Planner | v1.0 |
| `DEC-06` | `CHOSEN` (lưu ý: ban đầu Planner để open question, sếp ngầm chốt) | Mỗi lần mở file đều hiện dialog (không persist). Nếu sau này cần lưu lựa chọn thì mở task round 2. | Planner (chọn mặc định thay vì block) | v1.0 |
| `DEC-07` | `CHOSEN` | Khi user cancel popup → trả về None cho caller, UI không parse, không đẩy DB, giữ nguyên state trước đó. | Planner | v1.0 |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Khi file Excel có **đúng 1 sheet visible**, appBCC parse luôn sheet đó (không hiện popup) và trả về kết quả như hiện tại. | Must | `DEC-02`, `EV-04` | N/A (success path) |
| `RQ-02` | Khi file Excel có **≥ 2 sheet visible**, appBCC hiển thị dialog cho user chọn **đúng 1 sheet** trước khi parse. | Must | `DEC-01`, `DEC-06` | N/A |
| `RQ-03` | Dialog KHÔNG liệt kê sheet có `sheet_state` ∈ {`hidden`, `veryHidden`}. | Must | `DEC-01`, `EV-04` | Nếu detect sai → user chọn nhầm sheet ẩn |
| `RQ-04` | Sau khi user chọn sheet X, `preview_file` được gọi với `sheet_name=X` và chỉ parse dữ liệu từ sheet X (không gộp sheet khác). | Must | `DEC-04`, `EV-01` | Sai số NV → HR đối chiếu sai |
| `RQ-05` | Nếu user cancel dialog (không chọn), app KHÔNG parse, KHÔNG ghi DB, giữ state cũ và hiển thị thông báo nhẹ (log/info). | Must | `DEC-07` | Ghi DB ngoài ý muốn |
| `RQ-06` | Nếu file có **0 sheet visible** → app raise/log lỗi rõ ràng ("File không có sheet nào hiển thị được. Có thể tất cả sheet đang bị ẩn. Liên hệ quản lý nhà máy."). | Must | `DEC-02` | Silent fail → user tưởng parse thành công |
| `RQ-07` | Nếu file có ≥ 1 sheet ẩn, hiển thị ghi chú phụ trong dialog: `"Lưu ý: file có N sheet ẩn không hiển thị trong danh sách này."` để user biết file không chuẩn cấu trúc. | Should | `DEC-03` | User không biết file lỗi |
| `RQ-08` | API `preview_file` backward-compatible: caller cũ (không truyền `sheet_name`) vẫn chạy được với behavior cũ (đọc sheet đầu tiên trong `xl.sheet_names`, không phân biệt visible). | Must | `DEC-04` | Break code cũ |

### 4.2 Scope boundaries

**In scope:**

- File `appBCC/core_pipeline.py`: hàm `preview_file` thêm parameter `sheet_name` và đổi `pd.read_excel` để truyền `sheet_name`.
- File `appBCC/app.py`: thêm class `SheetSelectorDialog(QDialog)`, sửa flow gọi `preview_file` để detect số sheet visible và hiện dialog khi cần.
- Không đụng các hàm khác trong `core_pipeline.py` ngoài `preview_file`.

**Out of scope:**

- Đổi logic parse header, AI mapping, OT extraction.
- Đổi output Excel format (`export_project_payroll`, etc.).
- Đổi schema DB, migration.
- Lưu lựa chọn sheet vào config (DEC-06).
- Auto-detect sheet "chính" bằng heuristic (tên dài nhất, nhiều NV nhất, etc.).
- Hỗ trợ đọc đồng thời nhiều sheet.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** không đổi schema. Tham số mới `sheet_name: Optional[str] = None`. Khi None → behavior cũ (sheet đầu tiên); khi set → chỉ parse sheet đó.
- **State:** dialog là modal. Sau khi dialog đóng (Ok/Cancel), flow quay về caller. Không có state persist.
- **Permission/data scope:** không thay đổi permission; user chọn sheet chỉ trong UI local, không ghi vào DB.
- **Interface (public contract):**
  - `core_pipeline.preview_file(file_path, project_name, period_month, period_year, log_callback=print, review_callback=None, holiday_config=None, sheet_name=None)` — thêm 1 kwarg cuối.
  - `app.SheetSelectorDialog(visible_sheets: list[str], hidden_count: int, parent=None) -> Optional[str]` — trả về tên sheet hoặc None nếu cancel.
- **Failure/idempotency/concurrency:** idempotent (gọi 2 lần với cùng input ra cùng output). Không có concurrency issue (UI đơn luồng).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-08` | `appBCC/core_pipeline.py:30-38` | Sửa `def preview_file(...)` thêm kwarg `sheet_name=None`; đổi `pd.read_excel(file_path, header=None)` thành `pd.read_excel(file_path, sheet_name=sheet_name, header=None)` (khi `sheet_name` truthy) hoặc giữ nguyên (khi None). | pandas docs | grep `def preview_file` thấy kwarg mới; đọc lại dòng 38 | Nếu `pd.read_excel` raise `ValueError: sheet_name not found` → fail ngay, dừng không retry mò. |
| `STEP-02` | `RQ-01, RQ-02, RQ-03, RQ-05, RQ-06, RQ-07` | `appBCC/app.py` (vùng trước khi gọi `preview_file` ở dòng ~58) | Thêm helper `_list_visible_sheets(file_path) -> tuple[list[str], int]` (trả `(visible_names, hidden_count)`) dùng `openpyxl`. Thêm class `SheetSelectorDialog(QDialog)` theo style `HolidayConfigDialog`. Sửa flow gọi: detect sheets → nếu 1 visible thì gọi `preview_file(sheet_name=that_sheet)`; nếu ≥ 2 visible thì show dialog → nếu Ok gọi `preview_file(sheet_name=chosen)`; nếu cancel thì return. Nếu 0 visible thì `QMessageBox.warning` + return. | PyQt5 + openpyxl | grep `SheetSelectorDialog` thấy class; grep `_list_visible_sheets` thấy helper | Nếu import openpyxl fail → dừng, ghi blocker (Step thiếu dependency). |
| `STEP-03` | `RQ-01..RQ-07` | Test ad-hoc trên file mẫu | Tạo script `appBCC/tests/test_sheet_selector.py` (hoặc dùng `check_sheet_state.py` đã có) chạy: (a) file 1 sheet → parse ra N NV; (b) file 2 sheet (BCCActroT7_OK.xlsx) → chọn `Overtime (2)` → parse ra 98 NV; (c) cancel dialog → không parse. | pytest hoặc ad-hoc | `print(len(results))` đúng kỳ vọng | Nếu số NV không khớp → dừng, debug. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-08` | `preview_file` không có tham số `sheet_name` (call site cũ) vẫn chạy được, trả về data như trước. | `python -c "from core_pipeline import preview_file; r = preview_file(r'C:\\CodeApp\\HrP\\appBCC\\docs\\Actro\\round2\\BCCActroT7_OK.xlsx','Actro',7,2026); print(len(r))"` → in ra 45 (giống behavior cũ với file này). | command + output text | `yes` |
| `AC-02` | `RQ-04` | `preview_file(sheet_name='Overtime (2)')` parse đúng 98 NV từ file `BCCActroT7_OK.xlsx`. | `python -c "from core_pipeline import preview_file; r = preview_file(r'...','Actro',7,2026,sheet_name='Overtime (2)'); print(len(r))"` → 98. | command + output text | `yes` |
| `AC-03` | `RQ-03` | `_list_visible_sheets()` trên `BCCActroT7_OK.xlsx` trả về `(['Overtime (2)'], 1)` (chỉ liệt kê visible, đếm 1 hidden). | `python -c "from app import _list_visible_sheets; print(_list_visible_sheets(r'...'))"` | command + output text | `yes` |
| `AC-04` | `RQ-01` | Mở file 1 sheet trong app GUI → không hiện dialog, parse thẳng. | Manual test (chụp screenshot nếu cần) hoặc test headless bằng cách check flow code. | grep flow code → confirm `if len(visible)==1: call directly` | `yes` |
| `AC-05` | `RQ-02, RQ-05, RQ-07` | Mở file 2 sheet → hiện dialog liệt kê đúng 1 sheet visible (`Overtime (2)`) + label "Lưu ý: 1 sheet ẩn". User chọn Ok → parse 98 NV. User chọn Cancel → không parse. | Manual test với file `BCCActroT7_OK.xlsx`. | screenshot hoặc code path coverage | `yes` |
| `AC-06` | `RQ-06` | Mở file 0 sheet visible → app show `QMessageBox.warning` + không parse. | Tạo file test ad-hoc với cả 2 sheet bị hide, manual test. | code path + log | `no` (edge case hiếm) |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-04` |
| `RQ-02` | `STEP-02` | `AC-05` |
| `RQ-03` | `STEP-02` | `AC-03`, `AC-05` |
| `RQ-04` | `STEP-01`, `STEP-02` | `AC-02` |
| `RQ-05` | `STEP-02` | `AC-05` |
| `RQ-06` | `STEP-02` | `AC-06` |
| `RQ-07` | `STEP-02` | `AC-05` |
| `RQ-08` | `STEP-01` | `AC-01` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Caller cũ (`app.py` phiên bản trước) gọi `preview_file` không truyền `sheet_name` → behavior cũ bị break. | Test AC-01 fail. | `DEC-04` quy định None = behavior cũ (đọc sheet đầu tiên, kể cả ẩn). | Revert commit STEP-01. |
| `RISK-02` | `openpyxl` chưa cài → import fail. | Step STEP-02 import error. | DEC-05 đã verify openpyxl có sẵn (EV-04). | Cài `openpyxl` hoặc dùng `xlrd` (nếu xlsx thì cần openpyxl). |
| `RISK-03` | User chọn nhầm sheet ẩn → sai data. | DEC-01 đã chặn: chỉ liệt kê visible. | — | N/A (đã mitigate ở RQ-03). |
| `RISK-04` | UI thread block khi load file Excel lớn (mở openpyxl + pd.read_excel). | EV-04 chỉ ~256KB, không đáng lo. Nếu file > 50MB cần xử lý. | Có thể chạy trong `QThread` (ngoài scope nếu chưa có). | Round 2 nếu cần. |
| `RISK-05` | DEC-06 (lưu config) chưa implement → mỗi lần đều hỏi, user khó chịu. | User feedback. | DEC-06 đã ghi rõ sếp sẽ quyết round 2. | Round 2 mở task riêng. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | (Đã chốt bởi DEC-06) Có cần lưu lựa chọn sheet vào `config.json` để auto-chọn lần sau? — Tôi chọn **KHÔNG** (xem DEC-06). Round 2 nếu cần. | sếp | — | No |

## 9. Planner Resolution

(Trống. Tier 1 sẽ append sau khi nhận AUDIT.md từ Tier 3.)

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-20 09:22 +07 | Initial contract. | sếp yêu cầu thêm lớp bảo vệ: 1 sheet → auto, nhiều sheet → popup chọn (Round 2 sau khi phát hiện bug ở `BCCActroT7_OK.xlsx`). |