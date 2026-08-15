# AUDIT: hrp-v4-bod-mockup

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work/Audit type | `DESIGN / DESIGN_AUDIT` |
| Spec version | `v1.4` (khớp TASK.md + HANDOFF.md) |
| Execution round | `1` |
| Audit round | `1` |
| Auditor/context | `Tier 3 — Auditor (context độc lập; không dùng bảng AC của HANDOFF làm đúng — tự kiểm chứng bằng đọc trực tiếp 25 file HTML + cộng tay BigInt)` |
| Baseline/diff/artifacts | `git a4327ab`; `docs/tasks/hrp-v4-bod-mockup/mockup/` (22 frame + index.html + `_assets/hrp.css` + `_assets/frame.js`); nguồn đối chiếu: `TASK.md` (v1.4), `HANDOFF.md` (round 1), `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` (PDD), `stitch/warm_professionalism/DESIGN.md` (G27) |
| Independence | `Confirmed` — đọc từng frame, grep toàn bộ, cộng tay từng phép tính; bảng AC dưới đây là kết quả độc lập, không kế thừa HANDOFF |
| Audit time | `2026-08-15 16:33 (VN)` |

## 1. Findings

Sắp xếp P0 → P3. Không có finding P0. Không có finding P2.

### AUD-001 — Client receivable của statement An Phát gán sai client ID: `CL-0021 Đông Dương Logistics` thay vì `CL-0018 Điện tử An Phát`

- **Severity:** `P1`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-02, AC-03`
- **Evidence:**
  - `mockup/S04_Reconciliation_Internal.html:73` — kpi-sub Client receivable: `Đông Dương Logistics · CL-0021`
  - `mockup/S04_Reconciliation_Internal.html:141` — `Client: Đông Dương Logistics · CL-0021 · Invoice dự kiến V1 · DRAFT`
  - `mockup/S04A_Lineage_Drawer.html:64` — kpi-sub Client receivable: `Đông Dương Logistics · CL-0021`
  - Đối chiếu canonical: `TASK.md:139-140` — `CL-0018 = Công ty TNHH Điện tử An Phát … Client chính`; `CL-0021 = Công ty CP Kho vận Đông Dương … Dự án cũ của Nam` (Yên Phong); `PDD §7.2` (`docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md:545-546`) giống hệt
  - Mâu thuẫn nội bộ bộ mockup: `S04_MarginComparison.html:102` gắn `CL-0021 Đông Dương` đúng cho dự án `DA-2026-022 · Kho vận Yên Phong`; còn statement S04/S04A là `TS-2026-08-AP` của `DA-2026-018 · Nhà máy Điện tử An Phát` (chính frame `S04_Reconciliation_Internal.html:54, 130` và `F00_Cover.html:57` xác nhận bối cảnh An Phát) → khách nợ receivable 914.820.000 ₫ phải là CL-0018
- **Impact:** Sai dữ liệu canonical trên statement trình BoD — nếu BoD hỏi "ai là khách hàng của An Phát?" thì câu trả lời trên màn lệch data dictionary; phá tính "ID ổn định/canonical duy nhất" của RQ-07; tự mâu thuẫn giữa 2 frame trong cùng demo.
- **Decision needed from Planner:** Sửa 3 chỗ thành `CL-0018 · Công ty TNHH Điện tử An Phát` (hoặc dạng rút gọn thống nhất, vd "An Phát Electronics") — xác nhận không có chủ ý nào khác (vd agent trung gian) chưa được ghi trong §4.4.

### AUD-002 — "43 dòng khác ẩn gộp" còn sót ở 2 nơi: frame `F01_Density_Variant_44_52` và contract `TASK.md §4.5`

- **Severity:** `P1`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-02`
- **Evidence:**
  - `mockup/F01_Density_Variant_44_52.html:54` và `:73` — tfoot `Tổng (43 dòng khác ẩn gộp)` (47 workers − 3 hiển thị = **44**)
  - `TASK.md:264` — §4.5 row 40 (Reconciliation & Vendor Preview) vẫn mô tả `bảng 3 dòng hiện + "43 dòng khác"`
  - Đúng chuẩn: `TASK.md:229` — §4.4 `(44 dòng ẩn gộp phần còn lại: 47 workers − 3 hiển thị)`; `TASK.md:366` — Revision Log v1.4 `dòng ẩn gộp bảng S04 là 44 … không phải 43`; `mockup/S04_Reconciliation_Internal.html:130, 177` và `mockup/S04B_VendorPreview_Sent.html:89` đã hiển thị `44` đúng
  - Frame tự tuyên bố `Số liệu cộng đúng validation rules` (`F01_Density_Variant_44_52.html:31`) nhưng nội dung chưa đúng
- **Impact:** V1.4 fix (BLK-05) áp thiếu: page variant D02 (mục đích để BoD chọn mật độ tại trang 60) còn số sai, contract §4.5 tự mâu thuẫn với §4.4 của chính nó. Theo quy tắc audit "mọi số lệch = P1".
- **Decision needed from Planner:** Sửa `43 → 44` tại 2 chỗ của `F01_Density_Variant_44_52.html` và cập nhật `TASK.md:264`; (không patch — Tier 1 hoặc Planner sửa theo Resolution).

### AUD-003 — Scale radius token (6/10/14px) lệch cả hai nguồn: contract RQ-09/PDD §2.1 (6px) và G27 DESIGN.md (8px / 16 / 24)

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-10`
- **Evidence:**
  - `mockup/_assets/hrp.css:40-42` — `--radius: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`
  - `TASK.md:101` (RQ-09) — `radius 6px` (cho card/drawer/dialog); `mockup/F01_Tokens.html:87` — chip `Radius 6px` dẫn PDD §2.1
  - `stitch/warm_professionalism/DESIGN.md:162-163` — standard 0.5rem (8px); large containers `rounded-lg (16px)` / `rounded-xl (24px)`
  - Thực tế dùng: card `S04_Reconciliation_Internal.html:82`, dialog `S03B_LockConfirmation.html` dùng `--radius-md`/`--radius-lg` (10/14) — không phải 6
  - Liên quan: `mockup/F01_TypeSpacing.html:90` ghi `gutter 20 (DESIGN.md)` trong khi token thực tế `hrp.css:39 --gutter: 24px` (PDD §2.1, giữ theo `TASK.md:84` DEC-26) — text frame không khớp token
- **Impact:** Low-fi nên khó nhận; khi lên hi-fi (STEP-05) thiếu scale radius chốt sẽ phải re-do các thành phần; nguồn G27 vs PDD chưa thống nhất.
- **Decision needed from Planner:** Chốt scale radius dùng chung (đề xuất: giữ `--radius 6px` theo RQ-09 cho card/drawer/dialog và thêm `--radius-md/--radius-lg` là phần mở rộng hợp lệ, hoặc chuyển toàn bộ về G27 8/16/24 — cần 1 quyết định duy nhất); đồng thời sửa text `F01_TypeSpacing.html:90` cho khớp DEC-26 (gutter 24 PDD).

### AUD-004 — Inline style attribute tồn tại trong frame app-shell — vi phạm DEC-27/RISK-05 "không inline override"

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-10`
- **Evidence:**
  - `TASK.md:85` (DEC-27) — `"không detach"→chỉ dùng class chung, không inline override (RISK-05)`; `TASK.md:128` — `(không inline override — tương đương "không detach")`
  - `mockup/S02_Staffing_Default_1440.html:75` — `style="height:20px; padding:0 8px"` (chip); `:168` — `style="align-self:flex-start"` (badge Huy)
  - `mockup/S03_Attendance_Exceptions.html:189` — `style="width:71.4%"` (readiness fill)
  - `mockup/S04_Reconciliation_Internal.html:106, 114, 122, 153, 161, 170` — `style="display:block"` trên `tbl-sub` (lặp ở S04A/S04B/S03)
  - `style="position:relative"` trên `icon-btn` topbar: `S03_Attendance_Exceptions.html:43`, `S04_Reconciliation_Internal.html:43`, `S04A_Lineage_Drawer.html:43` (và ~10 frame khác)
  - Ghi nhận: `F00_Cover/F00A/F01_*` có khối `<style>` cục bộ — CSS phạm vi page của trang foundations/presenter, không override token hệ thống (chấp nhận được nhưng xin Planner xác nhận)
- **Impact:** Trái tinh thần DEC-27 "component variant→CSS class dùng chung": khi hi-fi hoặc sửa 1 thuộc tính phải sửa nhiều frame rời; duy trì nợ kỹ thuật mockup→CODE.
- **Decision needed from Planner:** Cho phép inline style ở mức "position/utility cục bộ" trong round 1 (mockup low-fi) hay yêu cầu chuyển thành utility class trong `hrp.css` trước STEP-05.

### AUD-005 — `S03_Attendance_Exceptions.html` ghi chú sort không khớp thứ tự dòng hiển thị

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-05 / AC-09`
- **Evidence:**
  - `mockup/S03_Attendance_Exceptions.html:181` — `Sort mặc định: blocker trước, rồi theo ngày/mã NV (PDD §5.3)`
  - Thứ tự thực tế (L122-177): blocker 1048 (12/08), 1140 (09/08) trước ✓; sau đó 1115 (10/08), 1021 (14/08), 1097 (13/08), 1102 (11/08), 1128 (05/08) — không theo ngày/mã NV mà theo thứ tự taxonomy §4.4 (UNMATCHED → SOURCE_CONFLICT → WRONG_PROJECT → CROSS_DAY_SHIFT → MISSING_CHECKOUT → DUPLICATE_EVENT → INACTIVE_ASSIGNMENT)
- **Impact:** Người xem (hoặc presenter bị hỏi) thấy text mô tả khác thứ tự thật; nhỏ nhưng là mâu thuẫn text-vs-data trên màn chính STEP-03.
- **Decision needed from Planner:** Giữ thứ tự taxonomy §4.4 và sửa lại text chú thích (khuyến nghị), hoặc đổi sort về đúng ngày/mã NV (thì đổi luôn thứ tự §4.4 canonical — không khuyến nghị).

### AUD-006 — Pattern drawer "trên nền truncated" (BLK-02): nền S04A không khớp chính xác S04 default

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-10 / AC-12 (liên quan khi wire/verify)`
- **Evidence:**
  - `mockup/S04A_Lineage_Drawer.html:75-91` — nền dưới drawer chỉ 2 dòng (Long, Khánh) trong khi S04 default hiển thị 3 dòng (có Mai) `S04_Reconciliation_Internal.html:104-127`; note `S04A_Lineage_Drawer.html:94` nói `Phần còn lại của bảng Vendor payable như S04 default — bị scrim làm mờ`
  - Pattern chung đã được ghi chú trung thực ở 7 frame: `S02A_AssignmentConflict_Drawer.html:154`, `S02A_TransferPreview.html:158`, `S02B_ReferralGuard_Drawer_Protected.html:138`, `S02B_ReferralGuard_OverrideRequested.html:148`, `S03B_LockConfirmation.html:82`, `S03_ResolveDrawer.html:104`, `S04A_Lineage_Drawer.html:94`
- **Impact:** Drawer không trên "đúng ngữ cảnh" đầy đủ của frame nguồn (PDD §4.4); S04A là chỗ duy nhất nền hiển thị khác S04 default — khi BoD bấm Lineage từ dòng Mai sẽ không thấy dòng Mai ở nền.
- **Decision needed from Planner:** Chấp nhận pattern truncated cho round 1 (có note trung thực) hay yêu cầu nền đủ; nếu chấp nhận, sửa nền S04A thành 3 dòng (Long/Khánh/Mai) cho khớp S04 default.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Đọc F00A + từng href + đối chiếu frame thật | PASS | `F00A_DemoNarrative.html:69-188` — đủ 16 bước 00:00–13:00, mỗi bước link đúng frame (S01→S02→S02A→S02A_Transfer→S02B→S02B→S03→S03_Resolve→S03_Resolved→S03B→S04→S04A→S04B→S04B_Dispute→S04_Margin); 3 khoảnh khắc bắt buộc §1.4 đủ (L49-53); S01 queue: An Phát thiếu 3→S02, 7 ngoại lệ→S03, Bắc Việt→S04B, 2 hồ sơ→S02 | None |
| `AC-02` | Cộng tay mọi phép tính (BigInt nguyên đồng) | PASS | 914.820.000−728.460.000=186.360.000 (20,37% ✓); Long 208×58.000+12×87.000=13.108.000 ✓ / 208×72.000+12×108.000=16.272.000 ✓ / margin 3.164.000 ✓ (S04A:129-140); Khánh 196/8→12.064.000/14.976.000 ✓; Mai 96/0→5.568.000/6.912.000 ✓; 426,5+48,0+16,0=490,5 ✓ (S03:88); 1.222−1.215=7 ✓; An Phát/Yên Phong/Sao Việt + tổng kỳ 1.509.760.000/1.840.520.000/330.760.000 = 17,97% ✓ (S04_MarginComparison); 47−3=44 ✓ | `AUD-001`, `AUD-002` |
| `AC-03` | Grep PII/ID + visual | PASS | Worker/project/vendor ID ổn định giữa frame; tiền vi-VN nguyên đồng `728.460.000 ₫`; giờ dấu phẩy `490,5`; watermark `DỮ LIỆU MINH HỌA` 22/22 frame + index.html; grep không thấy SĐT/CCCD/CMND/bank/stk/viec3mien/VietnamWorks/jobfinder/careerbuilder (chỉ từ "SĐT" trong placeholder tìm kiếm S02/S02A); không lương/bank trên card | `AUD-001` (client ID lệch canonical) |
| `AC-04` | Đối chiếu page tree index.html vs §4.5 | PASS | Không frame Payroll/TNCN/BHXH/Worker Portal/CRM trong flow; index.html: 10 nhóm, 22 frame DONE (STEP-01/02/03), states TODO (STEP-06), S05/F60/F90 TODO đúng kế hoạch | None |
| `AC-05` | Visual | PASS | S02: grid 12 card (`S02_Staffing_Default_1440.html`); S03/S04: table (`S03_Attendance_Exceptions.html:117`, `S04_Reconciliation_Internal.html:99`) | None |
| `AC-06` | Đọc S02A flow | PASS | Drawer guided (Xem assignment / Chuyển dự án — không toast lỗi) `S02A_AssignmentConflict_Drawer.html:175-187` → preview đóng ACTIVE→TRANSFERRED + mở PLANNED→ACTIVE cùng 15/08 06:00, quota 80→79 / 47→48, lý do bắt buộc, Hủy→S02A / Xác nhận→S02 (`S02A_TransferPreview.html`) | None |
| `AC-07` | Đọc S02B flow | PASS | Timeline 12/08·12/08·15/08 `S02B_ReferralGuard_Drawer_Protected.html:157-170`; kết luận "Chặn nhận nguồn mới đến hết 18/08" L174; lý do "Claim CTV đang trong cửa sổ bảo vệ 7 ngày" L175; badge "còn 3 ngày" L153; Giữ nguồn→S02 / Yêu cầu override→OverrideRequested L182-183; form lý do (*) + bằng chứng (*), maker-checker "checker Nguyễn Thanh Huyền duyệt" (`S02B_ReferralGuard_OverrideRequested.html:184`) | None |
| `AC-08` | Đọc flow 06:20–08:30 | PASS | S03 5/7·2 blocker → ResolveDrawer (3 band raw/suggested Mai 92%/result preview 6/7, hash `0x7f3a…c21e`, Gán→Resolved) → Resolved 7/7 "Sẵn sàng khóa", Maker Lê Thu Hà · Checker Nguyễn Thanh Huyền (`S03_Attendance_Resolved.html:158`), Duyệt kỳ→S03B → lock dialog ĐÚNG 7 mục PDD §5.6 (1.222 raw / 1.222 normalize / 47 workers / 0 blocker / 7 exception / 9.624h / 490,5h — `S03B_LockConfirmation.html:92-100`), nút "Khóa và tạo đối soát" btn-primary (không success) →S04 L108 → locked read-only bất biến + banner khóa 15/08 08:32 bởi Lê Thu Hà | None |
| `AC-09` | Đối chiếu bảng S03 vs §4.4 | PASS | 7 taxonomy đúng 1 lần mỗi loại: UNMATCHED_EMPLOYEE(1048), SOURCE_CONFLICT(1140), WRONG_PROJECT(1115 — đã xử lý theo DEC-18), CROSS_DAY_SHIFT(1021), MISSING_CHECKOUT(1097), DUPLICATE_EVENT(1102), INACTIVE_ASSIGNMENT(1128); blocker 2 dòng đầu (1048+1140) ✓; 2 row chưa map = 1048 (Chưa map) + 1128 (Chưa map assignment) ✓ | `AUD-005` |
| `AC-10` | Đọc hrp.css/frame.js + từng frame | PASS (kiến trúc) | `.wf` low-fi trên 16/16 frame STEP-02/03 (grep `frame-canvas`); badge đều icon+text; không gradient trong `hrp.css`; không emoji-icon (mọi icon là `material-symbols-outlined`); không nested-card/hero-scale; `frame.js` scale-to-fit 1440×900; tokens canonical G27 khớp (hrp.css:12-13, 37-43, 51-59) | `AUD-003` (radius scale), `AUD-004` |
| `AC-11` | — | N/A | States §4.5 thuộc STEP-06 (S01 Loading/EmptyQueue/StaleBanner, S02 NoResult/Expired/CardBlocked, S03 ImportProgress/ImportFailed, S04 VendorDisputed/ConfirmedLocked/RevisionV2/EmptyPayment) — đúng kế hoạch, ngoài round 1 | — |
| `AC-12` | — | N/A | Wire 11 hotspot + dry-run thuộc STEP-06/08; round 1 kiểm chứng được 11/11 hotspot §8.3 đã wire đúng đích (xem §4) — dry-run thật chưa chạy | `AUD-006` (pattern drawer khi wire) |
| `AC-13` | — | N/A | Trang 60 + Decision Log thuộc STEP-08 — ngoài round 1 | — |
| `AC-14` | Đọc 3 file | PASS | HANDOFF round 1 ✓; AUDIT.md (file này) ✓; TASK.md §9 trống — đúng: chờ Planner Resolution từ audit round 1 | None |
| `AC-15` | — | N/A | `S05_JobBoard_Public_1440` thuộc STEP-09 (DEC-25) — ngoài round 1 | — |

## 3. Scope và Impact

- **Deliverables in scope:** 22 frame HTML + `mockup/index.html` + `mockup/_assets/hrp.css` + `mockup/_assets/frame.js`; đối chiếu TASK.md v1.4, HANDOFF.md round 1, PDD, DESIGN.md G27. Tất cả 25 file HTML đã đọc trực tiếp.
- **Out-of-scope changes:** Không sửa bất kỳ file nào (TASK.md, HANDOFF.md, mockup/) — đúng ràng buộc round 1; tất cả finding là mô tả + evidence, chờ Planner Resolution. STEP-05/06/08/09 (hi-fi, states, dry-run, trang 60, S05) ngoài phạm vi audit round 1.
- **Blast radius/affected flows:** AUD-001 ảnh hưởng câu chuyện BoD (khách nợ của statement demo chính S04) — sửa 3 dòng text; AUD-002 ảnh hưởng page variant D02 (trang 60) + contract §4.5 — sửa text; AUD-003/004 ảnh hưởng STEP-05 hi-fi nếu không chốt trước; còn lại cosmetic, không chặn flow.
- **Data/security/migration/operations:** Không schema/migration/environment thay đổi; mock data hư cấu (DEC-14), không PII thật; watermark đủ mọi frame; không dấu vết đối thủ; không có dữ liệu nhạy trên card.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| Tokens hrp.css vs G27 canonical | PASS | `--primary #f26522`, `--primary-dark #a63b00`, sidebar 232 / topbar 56 / gutter 24 / radius 6 / drawer 480 / z 10-40-50-60 / motion 150-250ms khớp G27 + RQ-09 | `hrp.css:12-13,37-43,51-59`; `F01_Tokens.html:42-53` |
| Href integrity (25 file HTML) | PASS | Mọi href nội bộ trỏ file tồn tại — 0 link chết | grep toàn bộ `mockup/*.html` |
| 11 hotspot §8.3 | PASS | 1) S01 queue An Phát thiếu 3→S02 2) S02 Nam "Bố trí"→S02A 3) S02A "Chuyển dự án"→S02A_TransferPreview 4) S02 Huy badge "còn 3 ngày"→S02B_Protected 5) S02 header "Thiếu 3"/badge 7 ngoại lệ→S03 6) S02B "Yêu cầu override"→S02B_OverrideRequested 7) S03_Resolved "Duyệt kỳ"→S03B 8) S03B "Khóa và tạo đối soát"→S04 9) S04 "Lineage"→S04A 10) S04 "Xem như Vendor"/"Tạo bản gửi"→S04B 11) S04B "Phản đối"→S04B_DisputeForm — đủ 11, đúng đích | `S02_Staffing_Default_1440.html:73,116,168`; `S02A_AssignmentConflict_Drawer.html:187`; `S03_Attendance_Exceptions.html:128`; `S03_Attendance_Resolved.html:159`; `S03B_LockConfirmation.html:108`; `S04_Reconciliation_Internal.html:95-96,110,157`; `S04B_VendorPreview_Sent.html:97` |
| Back-path | PASS | Drawer: ✕/Hủy/Đóng/Quay lại → frame nguồn (S02A:✕→S02; TransferPreview Hủy→S02A; S03_Resolve Hủy→S03; S04A Đóng→S04; S03B Quay lại→S03_Resolved); breadcrumb→S01; labelbar→index.html | từng frame đã đọc |
| F00A 16 bước + 3 khoảnh khắc | PASS | 16/16 bước link đúng frame thật; timestamp 00:00–13:00; 3 khoảnh khắc bắt buộc §1.4 đầy đủ | `F00A_DemoNarrative.html:49-53,69-188` |
| Low-fi `.wf` | PASS | 16/16 frame STEP-02/03 có `class="frame-canvas wf"`; F00/F01/F00A không app-shell nên không cần | grep `frame-canvas` toàn bộ mockup |
| Watermark | PASS | `DỮ LIỆU MINH HỌA` có mặt ở 22/22 frame + index.html | grep `watermark-badge` (23/23 file) |
| PII / dấu vết đối thủ | PASS | Không SĐT/CCCD/CMND/bank/stk; không viec3mien/VietnamWorks/jobfinder/careerbuilder; chỉ "SĐT" trong placeholder search | grep toàn bộ mockup |
| Số liệu (cộng tay) | PASS | Tất cả phép tính §4.4 + PDD đều đúng (chi tiết AC-02) | S01/S03/S03B/S04/S04A/S04B/F01_Density |
| Taxonomy S03 | PASS | 7/7 ×1, blocker trước, 2 chưa map đúng 1048+1128 | `S03_Attendance_Exceptions.html:122-177` |
| Lock dialog §5.6 | PASS | Đúng 7 mục, nút primary "Khóa và tạo đối soát" (không success) | `S03B_LockConfirmation.html:92-108` |
| S04 tabs/anchors | PASS | `#vendor` + `#client` anchor tồn tại; tab Margin comparison→file riêng | `S04_Reconciliation_Internal.html:83-87,90,138` |
| S04A lineage | PASS | Chain 4 node (Raw AP-QM-1021 → TS LOCKED → ASG-004821 → Statement V1); phép tính Long đủ vendor/client/margin | `S04A_Lineage_Drawer.html:113-141` |
| S04B portal | PASS | Ẩn client rate/margin/salary (banner L48-51 + bảng chỉ có rate đối tác); deadline 18/08/2026 18:00 "còn 2 ngày"; CTA Xác nhận primary / Phản đối secondary; dispute form đủ phạm vi+lý do+mô tả+bằng chứng (max 10 MB) | `S04B_VendorPreview_Sent.html:43-51,97-98`; `S04B_VendorPreview_DisputeForm.html:55-92` |
| No-gradient / emoji / nested card / hero | PASS | 0 match gradient trong `hrp.css`; icon toàn bộ là material-symbols; không card lồng card | grep + đọc frame |
| Client ID statement An Phát | FAIL | CL-0021 (Đông Dương) trên statement An Phát — phải CL-0018 | `S04_Reconciliation_Internal.html:73,141`; `S04A_Lineage_Drawer.html:64` → `AUD-001` |
| "43" vs "44" dòng ẩn gộp | FAIL | Còn 2 chỗ "43": `F01_Density_Variant_44_52.html:54,73` + `TASK.md:264` | → `AUD-002` |

## 5. Coverage Gaps

- Không chạy trình duyệt thật: AC-10 đánh giá theo kiến trúc (`frame.js` scale-to-fit đọc code) + đọc DOM; chưa chụp screenshot 1366×768, chưa đo pixel hotspot ≥44×44 px, chưa kiểm tra "không che CTA/totals" bằng mắt thật — thuộc STEP-07/audit round 2.
- Tương tác JS (tabs, checkbox, radio, select) không chạy — mockup low-fi tĩnh; kiểm tra bằng đọc DOM, không phải bằng click thật.
- `F50_HotspotMap` (trang 50) và trang 60 variant chưa dựng — STEP-08, không phải round 1.
- Dry-run thật (AC-12, ≤15 phút) chưa chạy — STEP-08.
- Ghi chú đã giải toả (không phải finding): danger `#C2413B` giữ theo PDD §2.2 thay vì G27 error `#BA1A1A` — được DEC-26 quyết định (`TASK.md:84` "Semantic … giữ nguyên PDD") và ghi chú rõ tại `F01_Tokens.html:58`; gutter 24px giữ PDD theo cùng DEC-26 (`TASK.md:84`), G27 dùng 20px (`DESIGN.md:106,143`) — chỉ còn điểm vướng là text `F01_TypeSpacing.html:90` (đã gộp vào AUD-003).
- Ảnh hưởng tới verdict: thấp — không có gap nào chặn kết luận của round 1.

## 6. Verdict và Planner Questions

- **Verdict:** `CONDITIONAL`.
- **Reason:** Toàn bộ 4 chiều audit cơ bản đạt — flow đầy đủ (0 link chết, 11/11 hotspot, 16 bước F00A, back-path đủ), hierarchy chuẩn G27 (tokens, app shell, badge icon+text, không gradient/emoji/nested/hero, `.wf` đủ), nghiệp vụ đúng PDD (taxonomy 7/7, lock dialog 7 mục, maker-checker, portal ẩn đúng trường cấm, dispute form đủ), mọi số liệu cộng tay đều đúng. AC-01..AC-10 đạt, AC-11..15 N/A đúng kế hoạch. Không có P0/P2. Tuy nhiên có 2 finding P1 (AUD-001 client ID lệch canonical trên statement demo chính; AUD-002 "43" còn sót ở frame variant + contract §4.5 tự mâu thuẫn) — theo quy tắc "mọi số lệch = P1" và RQ-07 (failure = BLOCKER khi số lệch), không thể PASS tuyệt đối; 2 lỗi đều là sửa text cục bộ, không phá flow/hierarchy → CONDITIONAL (không phải FAIL/BLOCKED).
- **Planner decisions required:** `AUD-001`, `AUD-002` (bắt buộc resolve trước STEP-05 hi-fi); `AUD-003`, `AUD-004`, `AUD-005`, `AUD-006` (chốt trong round này để không kéo vào high-fi).

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| `1` | `AUD-002` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| `1` | `AUD-003` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| `1` | `AUD-004` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| `1` | `AUD-005` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| `1` | `AUD-006` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |

---

# AUDIT ROUND 2 — DESIGN_AUDIT (STEP-07)

## 0. Audit Control — Round 2

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work/Audit type | `DESIGN / DESIGN_AUDIT` |
| Spec version | `v1.7` (TASK.md; khớp HANDOFF round 2) |
| Execution round | `2` (STEP-01..06 xong — 36 frame + assets; HANDOFF round 2 Status READY_FOR_AUDIT) |
| Audit round | `2` |
| Auditor/context | `Tier 3 — Auditor (context độc lập; tự chạy grep + đọc từng frame + cộng tay BigInt; không dùng bảng AC của HANDOFF làm đúng)` |
| Baseline/diff/artifacts | `mockup/` 36 frame HTML + `index.html` + `_assets/hrp.css` + `_assets/frame.js`; nguồn đối chiếu: `TASK.md` (v1.7), `HANDOFF.md` (round 2), `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` (PDD), `stitch/warm_professionalism/DESIGN.md` (G27) |
| Independence | `Confirmed` — mọi kết luận round 2 đều từ đọc trực tiếp file + grep + tính tay; HANDOFF chỉ dùng làm tuyên bố cần kiểm chứng |
| Audit time | `2026-08-15 (VN)` |

## 1. Findings — Round 2

Sắp xếp P0 → P3. Không có finding P0/P1 trong round 2. Tổng 8 finding mới (AUD-007 → AUD-014); tất cả round-1 finding đã đóng (xem §7).

### AUD-007 — Scrim z-index 50 đè lên state-panel (45) và drawer (40): card/drawer bị làm mờ 45%, mâu thuẫn với note "chỉ nền bên dưới bị làm mờ"

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-10, AC-11`
- **Evidence:**
  - `mockup/_assets/hrp.css:51-54` — `--z-topbar:10; --z-drawer:40; --z-scrim:50; --z-dialog:60`
  - `mockup/_assets/hrp.css:846` — `.state-panel{position:absolute;inset:0;...;z-index:45}` (hardcode 45, không dùng var)
  - `mockup/_assets/hrp.css:520-524` — `.scrim{position:absolute;inset:0;background:rgba(26,28,27,.45);z-index:var(--z-scrim)}` → scrim (50) > state-panel (45) > drawer (40)
  - DOM: 3 state overlay frame đặt `<div class="scrim"></div>` TRƯỚC `<div class="state-panel">`: `S01_ControlTower_Loading.html:265-266`, `S03_ImportProgress.html:199-200`, `S03_ImportFailed.html:199-200` — với z-index, DOM order không cứu được: scrim 50 luôn vẽ lên trên
  - Note trong chính các frame tuyên bố chỉ nền bị mờ: `S01_ControlTower_Loading.html:275` "nền bên dưới là S01 default bị làm mờ", `S03_ImportProgress.html:207` tương tự — ngụ ý card KHÔNG bị mờ, nhưng thực tế state-card chịu overlay rgba(26,28,27,.45) → skeleton/text giảm tương phản
  - Tương tự 7 frame drawer: `S02A_AssignmentConflict_Drawer.html:159`, `S02A_TransferPreview.html:162`, `S02B_ReferralGuard_Drawer_Protected.html:142`, `S02B_ReferralGuard_OverrideRequested.html:152`, `S02B_ReferralGuard_Expired.html:144`, `S03_ResolveDrawer.html:109`, `S04A_Lineage_Drawer.html:99` — drawer z 40 < scrim 50 → drawer cũng bị mờ; note "Phần còn lại … bị scrim làm mờ" hứa chỉ phần nền bị mờ
  - Đúng chuẩn: chỉ dialog đúng thứ tự (`S03B_LockConfirmation.html:86-87` — dialog z 60 > scrim 50)
- **Impact:** Trên 10 frame overlay, lớp chứa nội dung chính (state card / drawer) bị phủ 45% đen → tương phản nội dung giảm, trái tuyên bố trong chính frame; trình BoD thấy drawer/card "xám mờ" thay vì nổi trên nền mờ. PDD §4.4 yêu cầu "drawer phải trên đúng ngữ cảnh" — ngữ cảnh phải bị mờ, drawer không.
- **Decision needed from Planner:** Sửa thang z: scrim nằm DƯỚI drawer/state-panel (vd `--z-drawer:45; --z-scrim:40`) hoặc thêm `--z-state:45` rồi chỉnh cho `scrim < state-panel < dialog`; hoặc ACCEPT_RISK cho round 2 (mockup tĩnh, chỉ ảnh hưởng visual) kèm note trung thực trong frame.

### AUD-008 — 4/12 state frame thiếu link "Quay lại frame gốc": S01_StaleBanner, S04_ConfirmedLocked, S04_RevisionV2, S04_EmptyPayment

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-12 / AC-11 (bằng chứng), AC-12 (back-path)`
- **Evidence:**
  - HANDOFF round 2 §1 khai: 12 state frame "mỗi cái có badge STATE + note (State minh họa STEP-06 · AC-11) + link Quay lại" — kiểm chứng chỉ 8/12 có back-link
  - Có back-link (8): `S01_ControlTower_Loading.html:275` → S01 default; `S01_ControlTower_EmptyQueue.html:114` → S01 default; `S02_Staffing_NoResult.html:103` → S02 default; `S02B_ReferralGuard_Expired.html:189` ("Về Staffing") → S02; `S02_CardBlocked.html:352` → S02 default; `S03_ImportProgress.html:207` → S03; `S03_ImportFailed.html:207` → S03; `S04_VendorDisputed.html:108` ("Về statement") → S04B
  - Thiếu (4): `S01_ControlTower_StaleBanner.html` — grep toàn bộ file: không có href nào về S01 default (sidebar "Tổng quan" href="#" active); `S04_ConfirmedLocked.html` — chỉ có link S01/S03_Locked/MarginComparison/S04B/S04A, sidebar "Đối soát" href="#" active; `S04_RevisionV2.html` — tương tự, không về S04_Reconciliation_Internal; `S04_EmptyPayment.html` — note trỏ "vào Chấm công xử lý ngoại lệ trước" → S03 nhưng không có link về S04
  - `F50_HotspotMap.html:123` khai "mở trực tiếp từ index.html hoặc qua link 'Quay lại' trong từng state" — không đúng cho 4 frame này
- **Impact:** Người mở trực tiếp 1 trong 4 frame này không có đường quay lại frame gốc trong prototype (phải dùng nút back trình duyệt) — trái tuyên bố HANDOFF §1/F50:123 và nguyên tắc back-path DEC-27; ảnh hưởng 4/12 frame trong AC-11 evidence.
- **Decision needed from Planner:** Thêm link "Quay lại" cho 4 frame (khuyến nghị) hoặc ACCEPT_RISK kèm sửa lại tuyên bố HANDOFF/F50 cho trung thực (ghi rõ "8/12 state có back-link, 4 frame mở từ index.html").

### AUD-009 — Tương phản nút primary/chip.active không đạt WCAG AA: trắng 14px/600 trên #F26522 ≈ 3,15:1 < 4,5:1

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-10` (PDD §0.3 — Accessibility: "Contrast AA")
- **Evidence:**
  - PDD §0.3 (`docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md:46`): "Accessibility | Contrast AA; focus rõ; trạng thái luôn có icon + text, không chỉ dùng màu"
  - `mockup/_assets/hrp.css:12-14` — `--primary:#f26522; --on-primary:#ffffff`; `hrp.css:345-349` — `.btn-primary{background:var(--primary);color:var(--on-primary);font:600 14px/1}`; `hrp.css:655` — `.chip.active{background:var(--primary);color:var(--on-primary)}`
  - Tính tay WCAG: L(#F26522) ≈ 0,283 → (1,0+0,05)/(0,283+0,05) ≈ **3,15:1** — dưới 4,5:1 cho text thường (14px/600 không thuộc large-text 18,66px+)
  - Hover đạt: `hrp.css:350` `.btn-primary:hover{background:var(--primary-dark)}` với #A63B00 ≈ 6,47:1 ✓; các badge/banner đều dùng primary-soft + primary-dark đạt (vd `.badge-primary` `hrp.css:395`)
  - Nút bị ảnh hưởng là toàn bộ CTA chính demo: "Duyệt kỳ" (S03B:78,108), "Bố trí" (S02:116), "Tạo bản gửi" (S04:96), "Xác nhận chuyển" (S02A_TransferPreview:218), chip active S03:96…
- **Impact:** PDD §0.3 bắt buộc Contrast AA; nút primary là điểm nhấn thao tác trong demo BoD — BoD nhìn thấy chữ trắng mờ trên nền cam. Đây là xung đột canonical G27 (primary #F26522 — DEC-26) vs PDD §0.3, cần Planner quyết định, không phải lỗi executor.
- **Decision needed from Planner:** Giữ G27 #F26522 → ACCEPT_RISK kèm note a11y (mockup), hoặc đổi nền button/chip.active sang #A63B00 (đạt 6,47:1, vẫn trong G27 dark), hoặc ghi deviation vào PDD §0.3 cho round mockup.

### AUD-010 — Frame state V2/CONFIRMED còn sót label cũ "V1 · DRAFT" ở stmt-head/invoice head

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-02`
- **Evidence:**
  - `mockup/S04_RevisionV2.html` — frame là V2 (badge `STATE · REVISION V2` L43, kpi-sub "Statement V2 · DRAFT" L74, "TS-2026-08-AP · V2" L55) nhưng: `:99` stmt-head `Vendor: Nhân lực Bắc Việt · Statement V1 · DRAFT`; `:147` `Client: Điện tử An Phát · CL-0018 · Invoice dự kiến V1 · DRAFT` — 2 label tự mâu thuẫn với chính frame V2
  - `mockup/S04_ConfirmedLocked.html` — frame CONFIRMED/LOCKED (badge L43, note "đối soát đã khóa, read-only" L66, kpi-sub "Statement V1 · CONFIRMED" L74) nhưng `:99` stmt-head vẫn `Statement V1 · DRAFT` → "DRAFT" cạnh "CONFIRMED" trong cùng màn
- **Impact:** Mâu thuẫn nội bộ màn khi trình BoD (state V2/CONFIRMED mà nhãn vẫn DRAFT); không ảnh hưởng số liệu (totals V2 đều đúng — xem §2 AC-02).
- **Decision needed from Planner:** Sửa label stmt-head/invoice head theo đúng state từng frame (V2 → "Statement V2 · DRAFT"; ConfirmedLocked → "Statement V1 · CONFIRMED" hoặc LOCKED).

### AUD-011 — Label 11px vi phạm PDD §2.3 "không nhỏ hơn 12px"

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-10` (PDD §2.3)
- **Evidence:**
  - PDD §2.3 (`docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md:156`): "Label/caption 12/16, 500 — Không nhỏ hơn 12 px"
  - Còn 11px trong `mockup/_assets/hrp.css`: `:153` `.nav-group-label` 600 11px/16px; `:276` `.user-chip .u-role` 400 11px/14px; `:295` `.watermark-badge` 700 11px/1; `:768` `.chart-axis` 400 11px/14px; `:975` `.chain-node .cn-d` 400 11px/14px; và `mockup/F50_HotspotMap.html:23` `.hm-step` 600 11px/12px
- **Impact:** 5 class hệ thống + 1 class frame dùng 11px — vi phạm tối thiểu 12px PDD §2.3; ảnh hưởng nhỏ tới đọc (watermark/axis/label nhóm), đặc biệt khi scale-to-fit 1366×768 xuống ~85%.
- **Decision needed from Planner:** Nâng các rule 11px lên 12px (giữ line-height tương ứng) — thay đổi CSS thuần, không đụng frame.

### AUD-012 — S03 ghi chú "header + 3 cột đầu sticky" nhưng CSS chỉ sticky dọc header

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-05 / AC-09` (PDD §5.3)
- **Evidence:**
  - `mockup/S03_Attendance_Exceptions.html:181` — "Sort mặc định: blocker trước, rồi theo ngày/mã NV (PDD §5.3) · **header + 3 cột đầu sticky khi cuộn** · số giờ căn phải…"
  - `mockup/_assets/hrp.css:482-484` — chỉ `.tbl th{position:sticky;top:0;z-index:1}` — sticky dọc theo cột, không có `left:` sticky cho 3 cột đầu
  - PDD §5.3 (`docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md:373`): "Header và ba cột đầu sticky."
- **Impact:** Ghi chú trong frame hứa tính năng chưa được CSS triển khai — text-vs-code lệch; khi bảng S03 cuộn ngang, 3 cột đầu (checkbox/Mã NV/Worker) không cố định.
- **Decision needed from Planner:** Thêm sticky ngang cho 3 cột đầu (`.tbl td:first-child, .tbl th:first-child { position:sticky; left:0 }` …) hoặc sửa ghi chú frame bỏ cụm "3 cột đầu".

### AUD-013 — F50 ghi "13 frame STATE" trong khi thực tế 12

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-12 / AC-11`
- **Evidence:**
  - `mockup/F50_HotspotMap.html:123` — "13 frame STATE (STEP-06) là các biến thể trạng thái…"
  - Đếm thực tế badge `STATE ·` trong mockup = **12** (S01 Loading/StaleBanner/EmptyQueue, S02 NoResult/Expired/CardBlocked, S03 ImportProgress/ImportFailed, S04 VendorDisputed/ConfirmedLocked/RevisionV2/EmptyPayment) — khớp TASK §4.5 12 state frame
- **Impact:** Tài liệu tự kiểm (F50) lệch số lượng state frame — người dẫn demo dựa F50 sẽ nói sai con số; nhỏ nhưng là tài liệu public của mockup.
- **Decision needed from Planner:** Sửa "13" → "12" tại F50:123.

### AUD-014 — S04_VendorDisputed hiển thị phạm vi "Toàn bộ statement" trong khi PDD §6.6 mô tả DISPUTED "với 2 line bị đánh dấu"

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-02` (PDD §6.6)
- **Evidence:**
  - `mockup/S04_VendorDisputed.html:55` — "Phạm vi: Toàn bộ statement · Lý do: Sai giờ" (và form `S04B_VendorPreview_DisputeForm.html:68` radio "Toàn bộ statement" checked)
  - PDD §6.6 (`docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md:522`): "Vendor DISPUTED với **2 line bị đánh dấu**."
  - Kịch bản demo thực tế chỉ 1 line bị điều chỉnh (Long +2,0h OT — `S04_RevisionV2.html:66`)
- **Impact:** Deviation chưa được ghi nhận giữa mockup (scope toàn statement) và PDD (2 line); trình BoD theo kịch bản "Sai giờ Long" mà màn nói "Toàn bộ statement" có thể bị hỏi.
- **Decision needed from Planner:** Giữ scope "Toàn bộ statement" → ghi deviation vào PDD §6.6/HANDOFF; hoặc đổi frame sang "2 line bị đánh dấu" (thêm UI đánh dấu dòng) cho khớp PDD.

## 2. Acceptance Verification — Round 2

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Đọc lại F00A + F50 + href từng frame | PASS | 16 bước 00:00–13:00 + 3 khoảnh khắc §1.4 còn nguyên (`F00A_DemoNarrative.html:49-53,69-188`); F50 map 11 hotspot khớp frame thật; 0 link chết trong 36 frame + index.html | None |
| `AC-02` | Cộng tay BigInt toàn bộ V1 + V2 | PASS | V1: 728.460.000/914.820.000/186.360.000 (20,37%) · Long 13.108.000/16.272.000/3.164.000 · Khánh 12.064.000/14.976.000 · Mai 5.568.000/6.912.000 · 490,5 OT (426,5+48,0+16,0) · 1.222−1.215=7 · 47/50 thiếu 3 · 44 dòng ẩn — tất cả đúng (S04:67-181, S04A:129-140, S03:64-89, S03B:93-99). V2 (`S04_RevisionV2`): 728.634.000/915.036.000/186.402.000 (20,37%) · +174.000 (2×87.000) / +216.000 (2×108.000) · Long 13.282.000/16.488.000 · OT 492,5 (490,5+2,0) · "44 dòng khác" L136,183 — đúng | None (AUD-010 chỉ label, không số) |
| `AC-03` | Grep PII + đối chiếu ID/watermark | PASS | 0 match `09\d{8}`/`0\d{9}`/CCCD 12 số/SĐT (grep toàn bộ mockup); watermark `DỮ LIỆU MINH HỌA` 37/37 file (36 frame + index.html); CL-0018 An Phát thống nhất S04/S04A/S04_RevisionV2 | None |
| `AC-04` | Page tree vs §4.5 | PASS | index.html đủ 36 frame DONE + S05/F60/F90 TODO đúng STEP-08/09; không frame Payroll/TNCN/BHXH/Worker Portal/CRM; không PII thật trên frame | None |
| `AC-05` | Visual layout | PASS | S02 grid 12 card · S03/S04 table · F01 foundations giữ cấu trúc round 1 | None |
| `AC-06` | S02A flow | PASS | Drawer guided → preview đóng/mở assignment, quota, lý do bắt buộc, Hủy/Xác nhận đúng đích | None |
| `AC-07` | S02B flow | PASS | Timeline 12/08·12/08·15/08, còn 3 ngày, Giữ nguồn→S02 / Override→form maker-checker | None |
| `AC-08` | Lock flow 06:20–08:30 | PASS | S03 → Resolve → Resolved 7/7 → S03B dialog đúng 7 mục §5.6 → S04; locked read-only + banner | None |
| `AC-09` | Bảng S03 vs §4.4 + sort | PASS | 7 taxonomy ×1 đúng thứ tự blocker trước rồi ngày/mã NV (1048·1140 blocker → 1128(05/08) → 1115(10/08) → 1102(11/08) → 1097(13/08) → 1021(14/08)) — AUD-005 đã đóng | AUD-012 (note sticky chưa đúng code) |
| `AC-10` | Kiến trúc + tokens + a11y | PASS (kiến trúc) | Tokens canonical G27: primary #F26522, primary-dark #A63B00, radius 8/16/24 (AUD-003 đóng), on-surface #1A1C1B, bg #FAF9F7, z 10/40/50/60+45, gutter 24 (PDD) · không gradient/emoji/nested card · `:focus-visible` outline 2px (`hrp.css:72`) · `lang="vi"` mọi frame · dialog `role="dialog" aria-modal` (S03B:87) | AUD-007 (z), AUD-009 (contrast), AUD-011 (11px) |
| `AC-11` | Đủ states §4.5 | PASS (12/12 tồn tại) | 12/12 state frame có `data-frame` + badge `STATE ·` + note "State minh họa STEP-06 · AC-11" + watermark (grep toàn bộ); đếm STATE badge = 12 khớp §4.5 | AUD-008 (4/12 thiếu back-link), AUD-013 (F50 ghi 13) |
| `AC-12` | Hotspot wire + back-path | NOT YET (dry-run) | Wire: 11/11 hotspot đúng đích theo F50 map (From→To→Back-path, đã đối chiếu từng frame); ước lượng 22 click (11 đi + 11 về) trong tầm 12–15 phút — nhưng dry-run thật (2 lượt ≤15 phút) thuộc STEP-08, chưa chạy | AUD-008 (back-path 4 state), AUD-014 (deviation chưa ghi) |
| `AC-13` | Trang 60 variant | N/A | F60_D01…D08/D09_D12 ghi chú owner+due — STEP-08, ngoài round 2 | — |
| `AC-14` | 3 file + Resolution | PASS | TASK §9 có đủ 6 Resolution round 1 (AUD-001..006 ACCEPT, Tier 1 đã xử lý 15/08); HANDOFF round 2 theo template; AUDIT.md file này | AUD-008 (HANDOFF khai back-link chưa đúng 4 frame) |
| `AC-15` | S05 job board | N/A | STEP-09 — ngoài round 2 (index.html:117 ghi TODO STEP-09) | — |

## 3. Scope và Impact — Round 2

- **Deliverables in scope:** 36 frame HTML + `mockup/index.html` + `_assets/hrp.css` + `_assets/frame.js`; đối chiếu TASK v1.7, HANDOFF round 2, PDD, DESIGN.md G27. Tôi đã đọc trực tiếp từng frame (36/36) + grep toàn bộ.
- **Out-of-scope changes:** Không sửa file nào (TASK.md, HANDOFF.md, mockup/); mọi finding là mô tả + evidence chờ Planner Resolution. STEP-08/09 (dry-run, trang 60, S05) ngoài round 2.
- **Blast radius:** AUD-007 ảnh hưởng 10 frame overlay (visual, đêm demo BoD); AUD-008 ảnh hưởng điều hướng 4 state frame + độ tin cậy HANDOFF/F50; AUD-009 ảnh hưởng toàn bộ CTA primary (a11y, PDD §0.3); AUD-010/011/012/013/014 là sửa text/CSS cục bộ, không chặn flow.
- **Data/security/migration:** Không schema/env thay đổi; mock data hư cấu (DEC-14), không PII thật (grep 0 match), watermark 37/37; không dấu vết đối thủ.

## 4. Independent Evidence — Round 2

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `grep -c watermark-badge` toàn bộ `mockup/*.html` | PASS | 37/37 file (36 frame + index.html) đủ `DỮ LIỆU MINH HỌA` | 37 occurrences |
| `grep -E "09\d{8}\|0\d{9}\|\d{12}" mockup/*.html` | 0 match | Không SĐT/CCCD/CMND | toàn bộ mockup |
| `grep "STATE ·"` | 12 badge | Đếm state frame = 12, khớp §4.5; F50 ghi 13 → AUD-013 | từng frame |
| `grep "State minh họa STEP-06"` | 12/12 | Mọi state frame có note chuẩn + `Quay lại` (8/12 — AUD-008) | S01/S02/S03/S04 state |
| `grep "Quay lại"` | 8/12 | Loading:275, EmptyQueue:114, NoResult:103, Expired:189, CardBlocked:352, ImportProgress:207, ImportFailed:207, VendorDisputed:108 | AUD-008 |
| Đọc `hrp.css:51-54,520-533,846` + DOM 3 state overlay | FAIL | scrim 50 > state-panel 45 > drawer 40 → overlay content bị mờ | AUD-007 |
| Tính tay WCAG contrast | FAIL | #F26522 + trắng 14px/600 = 3,15:1 < 4,5:1; #A63B00 hover = 6,47:1 ✓ | AUD-009 |
| Cộng tay V2 (BigInt) | PASS | 728.634.000/915.036.000/186.402.000 (20,37%); +174.000/+216.000; 492,5 OT; Long 13.282.000/16.488.000 | `S04_RevisionV2.html:66-187` |
| `grep -E "11px"` trong hrp.css + F50 | FAIL (PDD §2.3) | 5 rule hệ thống + .hm-step còn 11px | AUD-011 |
| `grep "sticky"` hrp.css + note S03:181 | FAIL (PDD §5.3) | Chỉ `th{position:sticky;top:0}`, thiếu left-sticky 3 cột đầu | AUD-012 |
| `grep "V1 · DRAFT"` S04_RevisionV2 + S04_ConfirmedLocked | FAIL | Label cũ còn ở stmt-head/invoice head | AUD-010 |
| `grep "13 frame"` F50:123 vs đếm thực tế | FAIL | 12 ≠ 13 | AUD-013 |
| PDD §6.6 vs S04_VendorDisputed:55 | LỆCH | Scope "Toàn bộ statement" vs "2 line bị đánh dấu" | AUD-014 |
| Đọc `frame.js` scale-to-fit | PASS (tính toán) | `scale=min(w/1440,h/900)` → tại 1366×768 scale ≈0,853 → toàn bộ artboard 1440×900 hiển thị đủ, không che CTA/totals; drawer 480px trong 1440 | frame.js |
| `grep -E "style=\"[^\"]*color|font-size"` (round 2) | PASS | Inline style còn lại chỉ là width/height dữ liệu minh họa (bar-fill 94%/100%, readiness 71,4%/100%, skeleton, space-bar, type-sample, F01 swatch, F50 width) — nhất quán ACCEPT_RISK AUD-004 | toàn bộ frame |

## 5. Coverage Gaps — Round 2

- Không chạy trình duyệt thật: contrast tính tay (không đo pixel), z-index suy từ CSS + DOM (không screenshot), viewport 1366×768 suy từ frame.js (không chụp thật) — kết luận dựa trên đọc code, mức tin cậy cao nhưng nên chụp screenshot khi wire STEP-08.
- Dry-run AC-12 (2 lượt ≤15 phút) chưa chạy — thuộc STEP-08; ước lượng timing 22 click tôi tính từ F50 map, không phải đo thực tế.
- Tương tác JS (tabs, checkbox, radio, select) không click thật — mockup tĩnh, kiểm tra bằng đọc DOM.
- Ảnh hưởng tới verdict: thấp — không gap nào chặn kết luận round 2; các điểm cần đo thật (pixel contrast, screenshot) đều đã có suy luận độc lập đồng thuận với code.

## 6. Verdict và Planner Questions — Round 2

- **Verdict:** `CONDITIONAL`.
- **Reason:** Không có P0/P1. Toàn bộ số liệu V1 + V2 (AC-02) đều đúng cộng tay; 12/12 state frame tồn tại (AC-11) với note chuẩn; 11/11 hotspot wire đúng đích (AC-12 wire); PII sạch (AC-03); page tree đúng §4.5 (AC-04); mọi AC bắt buộc không fail trên nội dung số/flow. Còn 3 finding P2 (AUD-007 z-index, AUD-008 back-link 4 state frame, AUD-009 contrast AA) là visual/a11y/điều hướng — không làm sai nghiệp vụ, nhưng cần Planner Resolution trước STEP-08/BoD vì: AUD-007/009 hiện rõ trên màn demo, AUD-008 trái tuyên bố HANDOFF/F50. 5 finding P3 là sửa text/CSS cục bộ. → CONDITIONAL, không FAIL/BLOCKED.
- **Planner decisions required (bắt buộc trước STEP-08):** `AUD-007` (thang z scrim/drawer/state-panel), `AUD-008` (thêm 4 back-link hoặc sửa tuyên bố), `AUD-009` (G27 #F26522 vs Contrast AA — quyết định deviation). Còn lại nên chốt trong round này: `AUD-010`, `AUD-011`, `AUD-012`, `AUD-013`, `AUD-014`.

## 7. Re-audit Trace — Round 2

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | `AUD-001` | OPEN | `CLOSED` | S04_Reconciliation_Internal:73,141 → `Điện tử An Phát · CL-0018` ✓; S04A:64 ✓ (TASK §9 Resolution 1 ACCEPT) |
| 1 | `AUD-002` | OPEN | `CLOSED` | F01_Density_Variant_44_52:54,73 → `44 dòng khác ẩn gộp` ✓; TASK §4.5:265 → `44 dòng khác` ✓ |
| 1 | `AUD-003` | OPEN | `CLOSED` | hrp.css:40-42 `--radius 8/16/24` ✓; F01_Tokens:87 chip "Radius 8/16/24" ✓; F01_TypeSpacing:90 `gutter 24 (PDD §2.1)` ✓ |
| 1 | `AUD-004` | OPEN | `CLOSED` (nhất quán ACCEPT_RISK) | Inline style còn lại chỉ width/height dữ liệu minh họa (bar-fill, readiness, skeleton, space-bar, type-sample, F01 swatch, F50 width) — không override token color/size |
| 1 | `AUD-005` | OPEN | `CLOSED` | S03_Attendance_Exceptions:122-177 — blocker trước, rồi ngày/mã NV (05/08→14/08) ✓; note L181 khớp |
| 1 | `AUD-006` | OPEN | `CLOSED` | S04A_Lineage_Drawer:94 — note mô tả đúng nền thật "2 dòng đầu (Long, Khánh), các dòng sau bị cắt" ✓ |
| 2 | `AUD-007` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-008` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-009` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-010` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-011` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-012` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-013` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |
| 2 | `AUD-014` | — | `OPEN` | Chờ Planner Resolution (TASK §9) |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
