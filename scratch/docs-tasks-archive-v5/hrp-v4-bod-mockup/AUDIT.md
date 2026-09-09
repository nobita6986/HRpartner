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

---

# AUDIT ROUND 3 — DESIGN_AUDIT (STEP-08 phần tự chủ)

## 0. Audit Control — Round 3

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work/Audit type | `DESIGN / DESIGN_AUDIT` |
| Spec version | `v1.9` (TASK.md Status READY_FOR_AUDIT; khớp HANDOFF round 3) |
| Execution round | `3` (STEP-08 phần tự chủ: trang 60, DECISION_LOG.md, F80 export; HANDOFF Status READY_FOR_AUDIT) |
| Audit round | `3` |
| Auditor/context | `Tier 3 — Auditor (context độc lập; tự đọc 10 file mới + grep + link-check + cộng tay; không dùng bảng AC của HANDOFF làm đúng)` |
| Baseline/diff/artifacts | `mockup/F60_D01.html`…`F60_D08.html`, `mockup/F60_D09_D12_Notes.html`, `DECISION_LOG.md`, `mockup/F80_DemoExport.html` + `F80_DemoExport.pdf`, `mockup/index.html` (nhóm 60/80); đối chiếu `TASK.md` v1.9, `HANDOFF.md` round 3, `F00A_DemoNarrative.html`, PDD §10.2, DEC-03…DEC-14/17/27 |
| Independence | `Confirmed` — mọi kết luận round 3 từ đọc trực tiếp từng file + grep + kiểm tra file thật; HANDOFF chỉ là tuyên bố cần kiểm chứng |
| Audit time | `2026-08-15 (VN)` |

## 1. Findings — Round 3

Không có finding P0/P1/P2 trong round 3. Tổng 4 finding mới (AUD-015 → AUD-018), tất cả P3; finding round 1/2 đã đóng, không tái phạm nghiêm trọng (xem §7).

### AUD-015 — Font 11px xuất hiện lại ở 2 frame mới: `.meta span` F60_D09_D12_Notes và `.legend span` F80_DemoExport — tái phạm AUD-011 (PDD §2.3 "không nhỏ hơn 12px")

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-09 / AC-10` (PDD §2.3), re-audit `AUD-011`
- **Evidence:**
  - `mockup/F60_D09_D12_Notes.html:27` — `.meta span { font: 600 11px/1 var(--font-label); ... }` (chip Owner/Due/Deferred)
  - `mockup/F80_DemoExport.html:19` — `.legend span { font: 600 11px/1 var(--font-label); ... }` (chú giải 3 khoảnh khắc)
  - PDD §2.3 (`docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md:156`): "Label/caption 12/16, 500 — Không nhỏ hơn 12 px"
  - Round 2 `AUD-011` đã yêu cầu nâng 11px→12px toàn bộ (7 chỗ hrp.css + .hm-step F50) và đã đóng — frame mới round 3 tái phạm ở CSS cục bộ frame
  - Các frame F60_D01–D08 khác dùng ≥12px (`f60-chip` 12px, `.sub` 12px, `.rec-card` 13px) — chỉ 2 chỗ này vi phạm
- **Impact:** Nhỏ — 2 chip label 11px trên trang phục vụ BoD; khi scale-to-fit (frame.js ~85% tại 1366×768) càng khó đọc; trái chuẩn đã chốt PDD §2.3.
- **Decision needed from Planner:** Nâng 2 rule lên 12px (sửa CSS cục bộ 2 file), hoặc ACCEPT_RISK kèm ghi chú.

### AUD-016 — F00A_DemoNarrative bước 04:10 còn lời dẫn "tạo claim 4 ngày trước" — lệch DEC-17 (claim 12/08 = 3 ngày trước 15/08), tự mâu thuẫn với bước 04:50 cùng file

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-01, AC-12` (presentation strings §4.4; DEC-17)
- **Evidence:**
  - `mockup/F00A_DemoNarrative.html:110` — `"Timeline cho thấy CTV Nguyễn Hoàng Duy tạo claim 4 ngày trước; vendor mới nộp hôm nay."` (step-say bước 04:10)
  - `TASK.md` DEC-17 (v1.9, §3): "claim CTV **12/08** → HR xác nhận 12/08 → vendor Bắc Việt nộp lại **15/08**… Presenter nói 'claim tạo ngày **12/08**' (bỏ '4 ngày trước')"; 15/08 − 12/08 = **3 ngày**, không phải 4
  - Mâu thuẫn nội bộ chính frame: cùng file bước 04:50 (`F00A_DemoNarrative.html:115`) ghi đúng "claim tạo 12/08"
  - `F80_DemoExport.html:119` (bước 6, 04:10) đã bỏ cụm này — "Huy là người giới thiệu — Referral Guard khoá…" (không nhắc "4 ngày trước")
- **Impact:** Người dẫn demo đọc nguyên văn F00A bước 04:10 sẽ nói sai ngày/nhầm số ngày so với DEC-17 đã chốt; BoD hỏi lại ngày claim sẽ lệch với drawer S02B (12/08).
- **Decision needed from Planner:** Sửa 1 dòng text F00A:110 thành "claim tạo ngày 12/08" (bỏ "4 ngày trước") — khớp DEC-17 và bước 04:50; hoặc ACCEPT_RISK kèm ghi chú presenter.

### AUD-017 — F80_DemoExport:239 inline `style="font-style:italic;"` thừa — tái phạm nhẹ DEC-27/RISK-05 (không inline override)

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-07 / AC-10` (DEC-27 "không inline override", RISK-05), re-audit `AUD-004`
- **Evidence:**
  - `mockup/F80_DemoExport.html:239` — `<span class="step-say" style="font-style:italic;">` trong khi class `.step-say` đã khai italic (`F80_DemoExport.html:28` — `.step-say { font: 400 italic 12px/16px ... }`) — inline duplicate, không thêm hiệu lực
  - `TASK.md:85` DEC-27: `"không detach"→chỉ dùng class chung, không inline override (RISK-05)`; AUD-004 round 1 đóng với ACCEPT_RISK cho inline width/height dữ liệu minh họa — style thừa này không thuộc ngoại lệ đó
- **Impact:** Rất nhỏ — 1 thuộc tính lặp; không phá token nhưng là dạng inline đã bị cấm; 16 bước F80 là tài liệu presenter nên sạch nhất có thể.
- **Decision needed from Planner:** Bỏ thuộc tính inline dòng 239 (class đã có italic), hoặc ACCEPT_RISK.

### AUD-018 — F60_D09_D12_Notes header thiếu dòng "Prototype assumption — không phải quyết định final của BoD (PDD §10.2)" mà 8 frame F60_D01–D08 đều có

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-11 / AC-13` (DEC-02 — mọi recommendation là prototype assumption)
- **Evidence:**
  - `mockup/F60_D09_D12_Notes.html:38` — header note chỉ ghi "Không chặn demo — chốt sau buổi BoD, ghi owner + due theo RQ-11" — không có cụm assumption
  - 8/8 frame khác đều có: `F60_D01.html:40`, `F60_D02.html:40`, `F60_D03.html:40`, `F60_D04.html:40`, `F60_D05.html:40`, `F60_D06.html:40`, `F60_D07.html:40`, `F60_D08.html:40` — "Prototype assumption — không phải quyết định final của BoD (PDD §10.2)"
  - Giảm nhẹ: `DECISION_LOG.md:4` ghi rõ "mọi recommendation hiện là *prototype assumption*, chưa phải quyết định final (PDD §10.2)" và F60_D09_D12_Notes link sang DECISION_LOG.md (dòng 85)
- **Impact:** BoD mở thẳng trang D09–D12 không thấy cảnh báo assumption như 8 trang kia — nhất quán nội dung trang 60 bị đứt 1 mắt xích; không chặn quyết định.
- **Decision needed from Planner:** Thêm cụm cảnh báo vào header F60_D09_D12_Notes cho khớp 8 frame còn lại, hoặc ACCEPT_RISK (DECISION_LOG đã ghi).

## 2. Acceptance Verification — Round 3

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Đối chiếu F80 16 bước vs F00A + link-check | PASS | 16/16 bước khớp timestamp + frame (00:00→13:00); mọi href F60/F80 trỏ file tồn tại (25 đích nội bộ + `../DECISION_LOG.md` OK); 0 link chết | AUD-016 (lời dẫn ngày, không phải link) |
| `AC-02` | Cộng tay số liệu frame mới | PASS | F80 bước 16 kết: `728.460.000 / 914.820.000 / 186.360.000 (20,37%)` — khớp §4.4; F60/F80 không đưa số mới nào khác canonical | None |
| `AC-03` | Grep PII/ID + watermark | PASS | Watermark `DỮ LIỆU MINH HỌA` 10/10 file mới; không SĐT/CCCD/bank/brand thật trong F60/F80/DECISION_LOG (đọc trực tiếp) | None |
| `AC-04` | index.html vs §4.5 | PASS | Nhóm 60 → 4 dòng done (D01–D04, D05–D08, D09–D12 Notes, DECISION_LOG) link đúng; nhóm 80 mới F80 done; F90 Archive giữ todo; S05 vẫn todo (STEP-09); 36 frame cũ không frame nào bị xóa | None |
| `AC-10` | Kiến trúc + tokens + font | PASS (kiến trúc) | F60 dùng class token G27 từ hrp.css (badge-primary/badge-neutral/warning-soft/primary-soft/push-right/small/muted đều tồn tại); frame.js scale-to-fit dùng ở F60; F80 là trang document (như index.html) không cần scale; không scrim/state-panel (không tái phạm AUD-007) | AUD-015 (11px), AUD-017 (inline) |
| `AC-12` | Dry-run 2 lần ≤15 phút | PARTIAL | Tài liệu sẵn sàng: F00A 16 bước + F80 HTML/PDF đúng thứ tự (RISK-03 fallback 7 phút); PDF tồn tại 4.952.284 bytes (4,8MB, khớp HANDOFF khai); **chưa chạy dry-run thật — cần sếp làm presenter** (đúng kế hoạch, không phải fail) | AUD-016 (lời dẫn presenter) |
| `AC-13` | Trang 60 + Decision Log | PASS | F60_D01…D08: mỗi D có bối cảnh + recommendation (variant A — đang demo) + variant A/B + mức chặn nếu BoD chọn khác; recommendation khớp DEC-03…DEC-10 (D01 4 KPI vận hành · D02 44px · D03 card 3 cột · D04 guided transfer · D05 HR_MANAGER maker-checker · D06 Review→Approve→Lock · D07 3 blocker UNMATCHED+SOURCE_CONFLICT+WRONG_PROJECT · D08 rate+quantity+amount); D09–D12 Notes owner+due khớp DEC-11…DEC-14; DECISION_LOG.md D01–D12 đủ recommendation/variants/owner/due/mức chặn + checklist sau họp + "freeze chỉ sau PM/BoD ký" (dòng 5, 35) | AUD-018 (thiếu assumption header) |
| `AC-14` | 3 file + Resolution | PARTIAL | TASK v1.9 Status READY_FOR_AUDIT + Revision Log v1.9 khớp HANDOFF round 3; HANDOFF AC-12 PARTIAL ghi trung thực "chưa chạy dry-run — cần sếp làm presenter"; BLK-10 (Chrome headless thay Edge) ghi rõ là deviation cùng bản chất "browser print" (DEC-27); **chờ round 3 Resolution (AUD-015…018 + BLK-10)** | None |
| `AC-15` | S05 job board | N/A | STEP-09 — ngoài round 3 (index.html nhóm 50 S05 vẫn todo) | — |

## 3. Scope và Impact — Round 3

- **Deliverables in scope:** 10 file mới round 3 (F60_D01…D08, F60_D09_D12_Notes, F80_DemoExport.html) + `DECISION_LOG.md` + `F80_DemoExport.pdf` + `mockup/index.html` (nhóm 60/80) — tôi đã đọc trực tiếp 100% file HTML mới (10/10) + DECISION_LOG.md + index.html, kiểm tra file PDF tồn tại + dung lượng; đối chiếu TASK v1.9, HANDOFF round 3, F00A (16 bước), DEC-03…DEC-14/17/27, PDD §10.2.
- **Out-of-scope changes:** Không sửa bất kỳ file nào; mọi finding là mô tả + evidence chờ Planner Resolution. 2 dry-run (AC-12) và freeze baseline thuộc sếp/BoD, không phải phần tự chủ executor.
- **Blast radius:** AUD-015/017 ảnh hưởng 2 file trình BoD (font chip nhỏ + 1 inline thừa — cosmetic); AUD-016 ảnh hưởng lời dẫn presenter 1 bước trong F00A (nói sai ngày claim nếu đọc nguyên văn — đêm demo); AUD-018 ảnh hưởng nhất quán trang 60 (1 trong 9 trang thiếu cảnh báo assumption). Không finding nào phá số liệu/flow/hierarchy.
- **Data/security/migration/operations:** Không schema/env thay đổi; mock data hư cấu (DEC-14); watermark đủ 10/10 file mới; không PII thật; PDF là export tĩnh không mang dữ liệu nhạy ngoài watermark.

## 4. Independent Evidence — Round 3

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| Đọc trực tiếp 10 file F60/F80 | PASS | Cấu trúc đồng nhất: header assumption (8/9) + chip nav D01–D09_D12 + back-link "← Bản đồ frame" → index.html; rec-card recommendation; variant-grid A/B (A được tô primary); block-note mức chặn; bod-note chờ họp | `F60_D01…D08.html`, `F60_D09_D12_Notes.html` |
| Recommendation vs DEC-03…DEC-10 | PASS | D01 4 KPI vận hành ✓ (DEC-03); D02 44px ✓ (DEC-04); D03 card 3 cột ✓ (DEC-05); D04 guided transfer, error-modal chỉ ở trang 60 ✓ (DEC-06); D05 HR_MANAGER + maker-checker + nút theo permission ✓ (DEC-07); D06 Review→Approve→Lock ✓ (DEC-08); D07 3 blocker ✓ (DEC-09); D08 rate+quantity+amount ✓ (DEC-10); mức chặn mỗi D khớp "Chặn:" của từng DEC | từng frame + TASK §3 |
| D09–D12 vs DEC-11…DEC-14 | PASS | D09 SLA 3 ngày làm việc (owner sếp, due sau BoD) ✓; D10 margin Director+Accountant, PM theo permission (owner PM) ✓; D11 "Cần xem xét"/"Bị chặn" không màu-only (owner Planner) ✓; D12 brand ẩn danh "Áp dụng từ đầu" ✓ | `F60_D09_D12_Notes.html:57-79`, `DECISION_LOG.md` |
| Freeze note | PASS | DECISION_LOG.md:5 "Freeze Mockup Baseline v1 chỉ thực hiện sau khi PM/BoD ký xác nhận — không freeze sớm" + checklist dòng 35 "PM/BoD ký xác nhận → freeze" | `DECISION_LOG.md` |
| Link-check F60/F80 | PASS | 25 đích nội bộ + `../DECISION_LOG.md` + F01_Density đều tồn tại — 0 link chết | grep href + kiểm tra file |
| F80 vs F00A (16 bước) | PASS | 16/16 khớp thứ tự + timestamp + frame: 00:00 S01 · 00:40 S02 · 01:20 S02 · 02:10 S02A · 03:10 S02A_Transfer · 04:10/04:50 S02B · 05:40 S03 · 06:20 Resolve · 07:30 Resolved · 08:30 S03B · 09:30 S04 · 10:30 S04A · 11:30 S04B · 12:10 Dispute · 13:00 Margin | `F80_DemoExport.html:52-242` vs `F00A_DemoNarrative.html:69-188` |
| 3 khoảnh khắc bắt buộc tô cam | PASS | Guided Transfer 02:10–03:10 (bước 4–5, class mom) · Exception→Lock 06:20–08:30 (bước 9–11 mom) · Dual Reconciliation 09:30–13:00 (bước 12–16 mom) — khớp F00A §1.4 (3 mk) | `F80_DemoExport.html` class `mom` |
| Print CSS | PASS | `@media print` `.step { page-break-after: always }` + `.step-frame { height: 1180px }` — mỗi bước 1 trang | `F80_DemoExport.html:31-36` |
| PDF | PASS (tồn tại + dung lượng) | `F80_DemoExport.pdf` = 4.952.284 bytes (4,8MB) — khớp HANDOFF E-18; không mở nội dung (phạm vi cho phép) | `ls -la` |
| `grep "43 dòng"` frame mới | 0 match | Không tái phạm AUD-002 | F60/F80/DECISION_LOG |
| `grep scrim/state-panel` F60/F80 | 0 match | Không tái phạm AUD-007 (z-index) | toàn bộ frame mới |
| `grep 11px` F60/F80 | 2 match | `F60_D09_D12_Notes.html:27`, `F80_DemoExport.html:19` | → AUD-015 |
| `grep "4 ngày trước"` F00A | 1 match | `F00A_DemoNarrative.html:110` lệch DEC-17 | → AUD-016 |
| `grep style="` F60/F80 | 1 match | `F80_DemoExport.html:239` font-style thừa (class đã italic) | → AUD-017 |
| class tokens G27 | PASS | badge-primary/badge-neutral/warning-soft/primary-soft/push-right/small/muted đều có trong `_assets/hrp.css` (17 match) | hrp.css |
| index.html nhóm 60/80/90 | PASS | Nhóm 60: 4 dòng done đúng link; nhóm 80: F80 done; F90 todo đúng (chờ BoD); không frame cũ nào bị xóa (36 frame giữ nguyên) | `mockup/index.html:120-136` |
| HANDOFF trung thực | PASS | AC-12 PARTIAL ghi rõ "chưa chạy dry-run thật — cần sếp làm presenter, evidence video/log sau khi chạy"; BLK-10 ghi deviation Chrome headless thay Edge kèm lý do + câu hỏi cho Planner | `HANDOFF.md` §3, §5 |

## 5. Coverage Gaps — Round 3

- Không mở nội dung PDF (phạm vi chỉ kiểm tra tồn tại + dung lượng — đã làm); không in thật để đo số trang/scale iframe trong PDF.
- Không chạy trình duyệt: không click chip nav F60, không mở F80 dạng sống, không đo pixel font sau scale-to-fit — kết luận từ đọc DOM/CSS, mức tin cậy cao.
- 2 dry-run AC-12 chưa chạy — thuộc sếp làm presenter (BLK-01); timing 16 bước (00:00–13:00) là thiết kế từ F00A, chưa đo thực tế.
- AUD-016 nằm ở frame cũ F00A (round 1/2) nhưng chỉ lộ ra khi đối chiếu F80 round 3 — đưa vào round 3 vì ảnh hưởng trực tiếp bài demo BoD.
- Ảnh hưởng tới verdict: thấp — 4 finding đều P3 cosmetic/text; không gap nào chặn kết luận round 3.

## 6. Verdict và Planner Questions — Round 3

- **Verdict:** `CONDITIONAL`.
- **Reason:** Không có P0/P1/P2. AC-13 PASS đầy đủ: trang 60 có đủ D01–D08 (bối cảnh + recommendation variant A + variant A/B + mức chặn, khớp DEC-03…DEC-10), D09–D12 owner+due khớp DEC-11…DEC-14, DECISION_LOG.md D01–D12 đầy đủ + freeze chỉ sau PM/BoD ký; F80 export đúng thứ tự 16 bước F00A (16/16), 3 khoảnh khắc bắt buộc tô cam đúng phạm vi, print CSS 1 bước/trang, PDF tồn tại 4,8MB; index.html nhóm 60 done + nhóm 80 mới đúng, F90 todo, không frame nào bị xóa; link-check 0 chết. AC-12 chỉ PARTIAL vì 2 dry-run cần sếp làm presenter — HANDOFF ghi trung thực, đúng kế hoạch, không phải fail. Còn 4 finding P3 (AUD-015 11px, AUD-016 lời dẫn ngày claim, AUD-017 inline thừa, AUD-018 thiếu assumption header) — đều là sửa text/CSS cục bộ trước đêm demo; cần Planner quyết định → CONDITIONAL, không PASS tuyệt đối, cũng không FAIL/BLOCKED.
- **Planner decisions required:** `AUD-015`, `AUD-016`, `AUD-017`, `AUD-018` (P3 — nên resolve trước buổi BoD vì AUD-016 là lời dẫn presenter có thể đọc sai ngày; AUD-015/017/018 là cosmetic nhưng xuất hiện trên tài liệu trình BoD). Ngoài ra cần Planner ghi nhận `BLK-10` (Chrome headless thay Edge — deviation hợp lệ cùng bản chất browser print DEC-27, không đổi contract) để đóng AC-14 round 3.

## 7. Re-audit Trace — Round 3

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | `AUD-001` | CLOSED | `CLOSED` | Không tái phạm: F60/F80/DECISION_LOG không nhắc client ID lệch; S04/S04A đã dùng CL-0018 |
| 1 | `AUD-002` | CLOSED | `CLOSED` | Grep "43 dòng" frame mới = 0 match |
| 1 | `AUD-003` | CLOSED | `CLOSED` | F60 dùng `--radius-md` 16px (G27 8/16/24) qua class chung; không scale radius mới |
| 1 | `AUD-004` | CLOSED (ACCEPT_RISK) | `CLOSED` (tái phạm nhẹ → AUD-017) | F60 sạch inline (0 match); F80 còn 1 inline `font-style` thừa dòng 239 → finding mới AUD-017 |
| 1 | `AUD-005` | CLOSED | `CLOSED` | Không liên quan frame mới (S03 sort giữ nguyên đã sửa) |
| 1 | `AUD-006` | CLOSED | `CLOSED` | Không liên quan frame mới (S04A note đã đúng) |
| 2 | `AUD-007` | CLOSED | `CLOSED` | Grep scrim/state-panel F60/F80 = 0 match |
| 2 | `AUD-008` | CLOSED | `CLOSED` | F60 có back-link "← Bản đồ frame" → index.html (9/9 file); F80 là trang document (tương đương index.html) không cần back-link — ghi chú |
| 2 | `AUD-009` | CLOSED (ACCEPT_RISK DEC-29) | `CLOSED` | Chip nav `.f60-chip.on` dùng primary+trắng = cùng token G27 đã được DEC-29 chấp nhận toàn hệ — nhất quán, không finding mới |
| 2 | `AUD-010` | CLOSED | `CLOSED` | Frame mới không chứa label "V1 · DRAFT" |
| 2 | `AUD-011` | CLOSED | `CLOSED` (tái phạm → AUD-015) | 2 rule 11px mới ở F60_D09_D12_Notes:27 + F80:19 → finding mới AUD-015 |
| 2 | `AUD-012` | CLOSED (deviation) | `CLOSED` | Không liên quan frame mới |
| 2 | `AUD-013` | CLOSED | `CLOSED` | F80 header ghi "16 bước" đúng; không ghi số frame STATE |
| 2 | `AUD-014` | CLOSED (deviation) | `CLOSED` | Không liên quan frame mới |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

# AUDIT ROUND 4 — DESIGN_AUDIT (STEP-10 — Verify AC-16, DEC-33)

## 0. Audit Control — Round 4

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work/Audit type | `DESIGN / DESIGN_AUDIT` |
| Spec version | `v1.12` (khớp TASK.md + HANDOFF.md round 4) |
| Execution round | `4` |
| Audit round | `4` |
| Auditor/context | `Tier 3 — Auditor (context độc lập; không kế thừa bảng AC của HANDOFF — tự chạy git diff/grep/đọc từng file)` |
| Baseline/diff/artifacts | `git eefba52` (cha `d8b677e`); đối tượng kiểm: `mockup/F01B_Glossary.html` (mới), `mockup/F00A_DemoNarrative.html`, `mockup/index.html`, `PRESENTER_GUIDE.md` (mới), `HANDOFF.md`; nguồn đối chiếu: `TASK.md` (v1.12 — RQ-14/STEP-10/AC-16), `DECISION_LOG.md` (DEC-33), `mockup/_assets/hrp.css` (G27) |
| Independence | `Confirmed` — chạy lại `git show eefba52 --stat/--name-status`, `git diff d8b677e..eefba52` cho F00A + toàn cục, đọc trực tiếp 3 file + index.html, grep hrp.css từng token/class, kiểm tra tồn tại từng frame đích, đếm tay 21 thuật ngữ / 16 lời thoại |
| Audit time | `2026-08-16 (VN)` |

## 1. Findings — Round 4

Sắp xếp P0 → P3. Không có finding P0/P1/P2. Mọi finding dưới đây đều P3 (không chặn AC-16 — AC-16 ghi `Blocking? No`).

### AUD-019 — Danh sách canonical 21 thuật ngữ của DEC-33 không được ghi trong repo — không kiểm chứng độc lập được claim "dùng nguyên, không thêm bớt nghĩa"

- **Severity:** `P3` (traceability)
- **Status:** `OPEN`
- **RQ/AC:** `RQ-14 / AC-16`
- **Location:** `DECISION_LOG.md:42` (DEC-33 chỉ ghi scope "≥15 thuật ngữ EN→VI + nghĩa 1 dòng + ví dụ" — không liệt kê 21 thuật ngữ, không kèm nghĩa/ví dụ); `HANDOFF.md:97` (BLK-11 claim "F01B dùng nguyên 21 thuật ngữ + nghĩa theo danh sách DEC-33")
- **Observed fact:** Grep toàn repo (`Control Tower`, `Chốt chặn giới thiệu`, `Kho ứng viên`...) cho thấy danh sách 21 thuật ngữ kèm nghĩa **chỉ tồn tại trong chính 2 deliverable** (`F01B_Glossary.html:44-76`, `PRESENTER_GUIDE.md:11-33`) — không có bản chuẩn nào ngoài deliverable để đối chiếu. `git show d8b677e:DECISION_LOG.md` xác nhận DEC-33 từ khi khởi tạo (commit d8b677e, cùng ngày) cũng chỉ ghi "≥15".
- **Impact:** Không thể xác minh độc lập khẳng định "đúng theo danh sách DEC-33 / không thêm bớt nghĩa" (BLK-11). Auditor chỉ kiểm chứng được tính nhất quán nội bộ (F01B ↔ PRESENTER_GUIDE khớp 21/21 nghĩa; nghĩa spot-check khớp nghiệp vụ §4.4 — xem §2). Khi freeze Mockup Baseline (D14), nếu danh sách thuật ngữ không được chốt văn bản, re-audit sau này không có chuẩn.
- **Recommendation:** Planner ghi danh sách 21 thuật ngữ chốt (EN → VI + nghĩa) vào `DECISION_LOG.md` DEC-33 (hoặc mục kèm) trước buổi BoD để trở thành chuẩn so sánh chính thức.

### AUD-020 — AC-16 yêu cầu "mỗi dòng có nghĩa tiếng Việt 1 dòng + ví dụ ngắn" nhưng F01B chỉ có ví dụ ở 3/21 dòng

- **Severity:** `P3` (theo chữ nghĩa pass-condition)
- **Status:** `OPEN`
- **RQ/AC:** `RQ-14 / AC-16` (pass condition, `TASK.md:305`); scope DEC-33 (`DECISION_LOG.md:42`) cũng ghi "nghĩa 1 dòng + ví dụ"
- **Location:** `mockup/F01B_Glossary.html` — ví dụ tường minh chỉ có 3 dòng: `:45` (Fill rate — "47/50 = 94%"), `:62` (Blocker — "3 loại dưới"), `:74` (SLA — "ví dụ 3 ngày"); 18/21 dòng còn lại (vd `:44` Control Tower, `:46` Workforce, `:51-55`, `:60-61`, `:63-65`, `:70-73`, `:75-76`) chỉ có nghĩa 1 dòng, không kèm ví dụ ngắn
- **Observed fact:** Đếm tay từng `.gl-line` trong 4 nhóm: 21 dòng × `gl-en → gl-vi + gl-def` đều đủ nghĩa 1 dòng; nhưng tiêu chí "ví dụ ngắn" của AC-16 chỉ đạt 3/21 dòng. HANDOFF BLK-11 giải thích chủ đích "mục không kèm ví dụ trong danh sách thì không thêm" — nhưng vì danh sách canonical không có trong repo (AUD-019), lý do này không đối chiếu được.
- **Impact:** Thấp — glossary vẫn dùng được cho presenter; nhưng pass-condition AC-16 (viết trong contract v1.12) chưa đạt trọn vẹn, cần Planner chọn 1 trong 2 hướng.
- **Recommendation:** (a) bổ sung ví dụ ngắn cho 18 dòng còn lại trong F01B + PRESENTER_GUIDE, hoặc (b) nếu chuẩn DEC-33 chỉ đòi "nghĩa 1 dòng, ví dụ khi có sẵn" thì sửa lại wording AC-16 (`TASK.md:305`) + DEC-33 cho khớp ý định.

### AUD-021 — F00A `.st-fstate` vẫn 11px — tàn dư của chuẩn AUD-011 (PDD §2.3 ≥12px), tồn tại từ trước eefba52

- **Severity:** `P3`
- **Status:** `OPEN` (pre-existing — KHÔNG phải regression của STEP-10; nêu vì cùng file được chạm tay)
- **RQ/AC:** `RQ-09 / AC-10` (chuẩn 12px từ AUD-011, PDD §2.3)
- **Location:** `mockup/F00A_DemoNarrative.html:28` — `.st-file .st-fstate { font: 400 11px/14px ... }`
- **Observed fact:** Diff `d8b677e..eefba52` xác nhận dòng này nằm trong context **không đổi** của commit — 11px có từ trước (round 1/2), bị sót khỏi sweep AUD-011 (round 2 — chỉ sửa 7 chỗ hrp.css + `.hm-step` F50). Toàn bộ rule MỚI của round 4 đều ≥12px (`.vi-tag` 12px `:33`, `.say-orig/.say-vi` thừa hưởng 13px từ `.step-row` `:22`; F01B toàn bộ 12px).
- **Impact:** Rất thấp — text phụ dưới tên file, chỉ có trên tài liệu presenter (không phải UI 30 frame); nhưng vi phạm chuẩn font đã chốt.
- **Recommendation:** Nâng 11px→12px ở `F00A_DemoNarrative.html:28` khi Planner đóng round 4 (1 dòng).

## 2. Acceptance Verification — Round 4

Bảng kết quả độc lập từng mục (AC-16 / RQ-14 / DEC-33 — không kế thừa HANDOFF):

| # | Hạng mục | Kết quả | Bằng chứng độc lập |
|---|---|---|---|
| 1 | Commit `eefba52` = đúng 5 file, không file lạ, không đụng appBCC | `PASS` | `git show eefba52 --name-status`: 2 A (`PRESENTER_GUIDE.md`, `mockup/F01B_Glossary.html`) + 3 M (`HANDOFF.md`, `mockup/F00A_DemoNarrative.html`, `mockup/index.html`); cha = `d8b677e`; `git diff d8b677e..eefba52 --stat` trùng khớp 5 file — không file nào ngoài danh sách |
| 2 | F01B tồn tại + đủ 21/21 thuật ngữ EN→VI (≥15 theo DEC-33) | `PASS` | Đếm tay `mockup/F01B_Glossary.html:44-76`: 21 `.gl-line` đủ `gl-en → gl-vi + gl-def`; khớp 21/21 với bảng `PRESENTER_GUIDE.md:11-33` |
| 3 | Mỗi dòng có nghĩa tiếng Việt 1 dòng | `PASS` | 21/21 `.gl-def` đều 1 câu ngắn; spot-check nghĩa khớp nghiệp vụ: Fill rate 47/50=94% ✓ §4.4 (`F01B:45`), Blocker 3 loại ✓ DEC-09 (`:62`), Override có quyền + lý do ✓ DEC-07 (`:54`), Maker-checker 2 người ✓ DEC-08 (`:55`), SLA 3 ngày ✓ DEC-19 (`:74`) |
| 4 | Ví dụ ngắn mỗi dòng (theo chữ nghĩa AC-16) | `CONDITIONAL` | Chỉ 3/21 dòng có ví dụ tường minh (`F01B:45,62,74`) — 18 dòng thiếu → **AUD-020** |
| 5 | Nhóm theo module: 4 nhóm đúng 3/5/6/7 | `PASS` | `F01B:42-47` Bảng điều hành (S01) = 3 · `:49-56` Bố trí nhân sự (S02) = 5 · `:58-66` Chuyên cần (S03) = 6 · `:68-77` Đối soát (S04) = 7 · tổng 21 ✓ |
| 6 | Watermark `DỮ LIỆU MINH HỌA` có dấu | `PASS` | `F01B:37` (class `watermark-badge push-right`) · `F00A:47` |
| 7 | Không PII, không brand thật | `PASS` | F01B chỉ chứa thuật ngữ (0 SĐT/CCCD/bank/lương, 0 tên công ty/người thật); F00A các bản Việt chỉ dùng nhân vật/ID/số canonical §4.4 (An Phát, Nam, Mai, Long, Duy, AP-QM-1048, 1.222, 490,5...) |
| 8 | Render hợp lệ: class/token tồn tại trong hrp.css | `PASS` | Grep `_assets/hrp.css`: `body.backdrop` (`:84`), `.frame-wrap` (`:115`), `.frame-canvas` (`:116`), `.watermark-badge` (`:290`), `.push-right` (`:835`), tokens `--primary/--primary-dark/--primary-soft/--surface/--on-surface/--on-surface-variant/--line/--radius-md` (`:12-41`) + `--font-head/--font-body/--font-label` (`:46-48`) — đủ 100%; font ≥12px toàn bộ F01B |
| 9 | F00A: 16/16 lời thoại có bản diễn đạt Việt | `PASS` | Đếm `span.say-vi` = 16 (dòng 77, 84, 91, 98, 106, 114, 121, 128, 135, 143, 151, 159, 167, 175, 183, 190), mỗi bản có thẻ `VI` + kèm EN trong ngoặc lần đầu; lời thoại gốc giữ nguyên trong `.say-orig` |
| 10 | F00A: mốc thời gian (00:00–13:00) + 16 link frame KHÔNG đổi | `PASS` | `git diff d8b677e..eefba52 -- mockup/F00A_DemoNarrative.html`: 0 thay đổi trên bất kỳ `st-time`/`href` nào của 16 bước (chỉ thêm `.say-orig/.say-vi` wrapper + header note `:46` + legend `:63`); 16 mốc 00:00→13:00 giữ nguyên |
| 11 | index.html: nhóm 01 có dòng F01B (done) | `PASS` | `mockup/index.html:62` — `F01B_Glossary.html` · `Từ điển thuật ngữ EN→VI — DEC-33` · `STEP-10 ✓`, nằm trong group-head 01 Foundations (`:58`), đúng vị trí giữa F01_StatusLanguage và F01_Density |
| 12 | PRESENTER_GUIDE.md tồn tại + đủ 3 phần | `PASS` | §1 bảng 21 thuật ngữ (`PRESENTER_GUIDE.md:11-33`); §2 ba mẹo 15 phút (`:35-44`) — Mẹo 1 ghi rõ "**Glossary là tài liệu tham khảo — không tính vào 15 phút dry-run**" (`:38`); §3 nhắc **11 hotspot** đúng trình tự F00A (`:48`) + tổng demo ≤15 phút (`:49`) + không submit thật 03:10/12:10 (`:50`) + fallback PDF (`:51`) + con số cốt lõi (`:52`) |
| 13 | UI 30 frame không bị Việt hóa | `PASS` | `git diff d8b677e..eefba52 --stat` = đúng 5 file nêu ở mục 1 — 0 file S0x/F0x/F5x/F6x/F8x nào khác bị sửa; F00A là trang presenter (ngoài 30 frame màn hình) |
| 14 | Link-check | `PASS` | index → `F01B_Glossary.html` OK (cùng thư mục, file tồn tại); F01B → `F00A_DemoNarrative.html` + `../PRESENTER_GUIDE.md` OK (`F01B:81`); F00A → `F01B_Glossary.html` OK (`F00A:46`); 16 link bước trỏ 14 file đích — kiểm tra từng file tồn tại trên đĩa: 14/14 OK (S02_Staffing 2 bước, S04_Reconciliation_Internal 2 bước) |

**Verdict AC-16:** `CONDITIONAL` — xem §6.

## 3. Scope và Impact — Round 4

- **Trong phạm vi:** 3 artifact STEP-10 (`F01B_Glossary.html`, lời thoại Việt trong `F00A_DemoNarrative.html`, `PRESENTER_GUIDE.md`) + `index.html` (dòng F01B) + tính nguyên vẹn của 30 frame UI + link-check. Không re-audit toàn bộ nội dung nghiệp vụ 30 frame (đã làm round 1–3).
- **Ngoài phạm vi:** 2 dry-run AC-12 (thuộc sếp, vẫn chờ); S05 (STEP-09 — thuộc re-audit round khác); nội dung thuật ngữ EN trên UI (cố ý giữ nguyên theo DEC-33).
- **Impact tổng thể:** Thấp — không có gap chặn BoD demo; 3 finding đều P3. AUD-020 là gap theo chữ nghĩa pass-condition AC-16 duy nhất; AUD-019/021 là traceability/cosmetic.

## 4. Independent Evidence — Round 4

- `git show eefba52 --stat` / `--name-status` — 5 file, không file lạ, cha `d8b677e`; appBCC không đụng.
- `git diff d8b677e..eefba52 --stat` — trùng khớp 5 file (bằng chứng mục 1, 13).
- `git diff d8b677e..eefba52 -- mockup/F00A_DemoNarrative.html` — toàn bộ diff là thêm wrapper `.say-orig/.say-vi`, header note, legend; 0 thay đổi time/link.
- Đếm tay: 21 `.gl-line` F01B (nhóm 3/5/6/7) · 16 `st-time` + 16 `say-vi` F00A · 21 hàng bảng PRESENTER_GUIDE §1.
- Grep `_assets/hrp.css` — mọi class/token F01B + F00A mới (mục 8).
- Kiểm tra tồn tại 14 file frame đích của 16 link F00A (mục 14).
- Grep toàn repo danh sách canonical DEC-33 (AUD-019) — chỉ xuất hiện trong chính deliverable.
- `git show d8b677e:DECISION_LOG.md` — DEC-33 ngay khi khởi tạo cũng không liệt kê 21 thuật ngữ.

## 5. Coverage Gaps — Round 4

- Không chạy trình duyệt: không render F01B thật, không đo pixel sau scale-to-fit — kết luận từ đọc DOM/CSS, mức tin cậy cao (cấu trúc đơn giản: 4 box grid 2 cột).
- "Đúng nghĩa theo DEC-33" chỉ kiểm chứng được ở mức nhất quán nội bộ + spot-check nghiệp vụ §4.4 (21/21 F01B = 21/21 PRESENTER_GUIDE); chuẩn canonical vắng mặt trong repo → AUD-019.
- "Ví dụ ngắn": chỉ đếm ví dụ tường minh có từ "(ví dụ …)" hoặc "(…)" trong `.gl-def`; không suy đoán ví dụ ngầm → AUD-020 giữ nguyên trạng.

## 6. Verdict và Planner Questions — Round 4

- **Verdict AC-16:** `CONDITIONAL`.
- **Reason:** Không có P0/P1/P2. Đạt trọn vẹn các mục chính của AC-16/RQ-14/DEC-33: commit đúng 5 file (không đụng 30 frame UI — mục 13); F01B tồn tại, **21/21 thuật ngữ** EN→VI nhóm 4 module đúng 3/5/6/7, nghĩa 1 dòng đủ + spot-check khớp nghiệp vụ, watermark có dấu, không PII/brand thật, token/class đều có trong hrp.css; index.html nhóm 01 có dòng F01B done; F00A **16/16** lời thoại có bản diễn đạt Việt dễ nói (thẻ VI, EN kèm lần đầu) trong khi **mốc thời gian 00:00–13:00 và 16 link frame không đổi** (diff chỉ thêm); PRESENTER_GUIDE đủ 3 phần, có quy ước "glossary không tính vào 15 phút dry-run" đúng DEC-33; link-check 0 chết. Còn 3 finding P3 cần Planner quyết định trước freeze: **AUD-020** (gap theo chữ nghĩa AC-16: "ví dụ ngắn" chỉ 3/21 dòng — bổ sung ví dụ hoặc sửa wording chuẩn), **AUD-019** (chốt danh sách canonical 21 thuật ngữ vào DECISION_LOG để có chuẩn so sánh khi freeze D14), **AUD-021** (11px pre-existing ở F00A:28). → CONDITIONAL, không PASS tuyệt đối (gap chuẩn văn bản còn mở), cũng không FAIL/BLOCKED (nội dung core 100% đạt, AC-16 `Blocking? No`).
- **Planner decisions required:** `AUD-019`, `AUD-020`, `AUD-021` (cả 3 P3 — nên resolve trong round này vì bộ công cụ diễn thuyết sẽ được sếp dùng trực tiếp trong buổi BoD; AUD-019/020 đặc biệt liên quan freeze baseline D14).

## 7. Re-audit Trace — Round 4

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | `AUD-001`…`AUD-010` | CLOSED | `CLOSED` | Không liên quan file STEP-10 (F01B mới, F00A chỉ thêm bản Việt) — không tái phạm |
| 2 | `AUD-011` | CLOSED | `CLOSED` (tàn dư → AUD-021) | Rule mới F01B/F00A đều ≥12px; sót `.st-fstate` 11px pre-existing tại `F00A:28` → finding mới AUD-021 |
| 2 | `AUD-012` | CLOSED (deviation) | `CLOSED` | Không liên quan |
| 2 | `AUD-013` | CLOSED | `CLOSED` | Không liên quan |
| 2 | `AUD-014` | CLOSED (deviation) | `CLOSED` | Không liên quan |
| 3 | `AUD-015` | CLOSED | `CLOSED` | Rule mới F01B/F00A không có 11px nào mới |
| 3 | `AUD-016` | CLOSED | `CLOSED` | Lời dẫn 04:10 giữ đúng bản đã sửa — "claim ngày 12/08 — 3 ngày trước" (`F00A:114`); bản Việt cùng bước dùng đúng "3 ngày trước" |
| 3 | `AUD-017` | CLOSED | `CLOSED` | Không inline style attribute mới trong F01B/F00A (dùng `<style>` block + class) |
| 3 | `AUD-018` | CLOSED | `CLOSED` | Không liên quan (F60) |

> Đã bàn giao AUDIT.md round 4 cho Tier 1; chờ Planner Resolution cho AUD-019/020/021 trong TASK.md §9.

# AUDIT ROUND 5 — RE-VERIFY AUD-019/020/021 (commit `bddb748`, cha `84ba2fc`)

## 0. Audit Control — Round 5

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work/Audit type | `DESIGN / DESIGN_AUDIT (re-verify)` |
| Spec version | `v1.13` (Planner Resolution round 4 — TASK.md) |
| Execution round | `5` |
| Audit round | `5` |
| Auditor/context | `Tier 3 — Auditor (context độc lập; tự chạy git show/diff/grep — không kế thừa claim Tier 2)` |
| Baseline/diff/artifacts | `git bddb748` (cha `84ba2fc`); kiểm: `mockup/F01B_Glossary.html`, `mockup/F00A_DemoNarrative.html`, `PRESENTER_GUIDE.md`, `HANDOFF.md` (4 file commit) + `DECISION_LOG.md` (canonical — commit 84ba2fc); chuẩn đối chiếu: bảng canonical `DECISION_LOG.md:48-70` |
| Independence | `Confirmed` — đọc trực tiếp 3 nguồn (canonical / F01B / PRESENTER_GUIDE) và so sánh từng dòng 21/21; grep `11px`, `ví dụ`, `gl-line`, `st-time`, `say-vi`; diff `84ba2fc..bddb748` cho F00A + toàn cục |
| Audit time | `2026-08-16 (VN)` |

## 1. Findings — Round 5

### AUD-022 — Nghĩa dòng 17 (Margin) lệch từ so với bảng canonical: "tiền thu khách" vs "giữa tiền thu khách hàng" — vi phạm mandate "PHẢI khớp 100%" của canonical

- **Severity:** `P3` (wording — 1/21 dòng, 2 file mỗi file 1 chỗ)
- **Status:** `OPEN` (phát hiện mới trong re-verify — không nằm trong 3 finding round 4)
- **RQ/AC:** `RQ-14 / AC-16` (gián tiếp — AC-16 không đòi khớp nguyên văn, nhưng `DECISION_LOG.md:46` tự mandate "F01B_Glossary + PRESENTER_GUIDE.md PHẢI khớp 100% danh sách này")
- **Location:** `DECISION_LOG.md:66` (canonical: "Chênh lệch **tiền thu khách** và tiền trả đơn vị cung ứng") vs `mockup/F01B_Glossary.html:72` ("chênh lệch **giữa tiền thu khách hàng** và tiền trả đơn vị cung ứng") + `PRESENTER_GUIDE.md:29` (giống F01B — F01B ↔ PG khớp nhau 100%)
- **Observed fact:** So sánh tay từng dòng 3 nguồn: ví dụ 21/21 khớp nguyên văn; nghĩa 20/21 khớp (sai khác chỉ là hoa/thường đầu câu — canonical viết hoa, F01B/PG viết thường, chấp nhận được vì F01B dùng lowercase nhất quán); duy nhất dòng 17 Margin: canonical thiếu "giữa" + viết "khách" trong khi F01B/PG viết "khách hàng". Nghĩa ngữ nghĩa tương đương, nhưng claim Tier 2 "dùng nguyên văn bảng canonical / khớp 100%" không đúng tuyệt đối ở dòng này.
- **Impact:** Rất thấp — không ảnh hưởng người dùng (nghĩa tương đương, rõ nghĩa hơn); chỉ lệch chữ nghĩa giữa chuẩn và deliverable đúng vào mandate khớp 100% vừa lập (AUD-019).
- **Recommendation:** Planner chọn 1 chiều: (a) sửa `DECISION_LOG.md:66` thành "Chênh lệch giữa tiền thu khách hàng và tiền trả đơn vị cung ứng" (đồng bộ với F01B/PG — biến thể rõ nghĩa hơn), hoặc (b) sửa 2 chỗ F01B/PG về nguyên văn canonical. 1 dòng × 2 file.

## 2. Re-verify các finding round 4

| Finding round 4 | Yêu cầu Planner Resolution (TASK v1.13) | Kiểm độc lập (tự chạy) | Verdict |
|---|---|---|---|
| `AUD-019` (canonical list không có trong repo) | Ghi bảng 21 thuật ngữ canonical vào DECISION_LOG (v0.6) | `DECISION_LOG.md:44-70` — mục "Danh sách thuật ngữ canonical — DEC-33" tồn tại, **21/21 dòng** (`sed 48,70` đếm = 21 data rows), mỗi dòng đủ 4 cột EN / VI / Nghĩa (1 dòng) / Ví dụ ngắn; Revision Log v0.6 tại `:96` ghi "bổ sung theo AUD-019"; bảng đã commit ở `84ba2fc` (stat: DECISION_LOG.md +29) — không phải thay đổi chưa commit (git status sạch cho file này) | **`RESOLVED`** |
| `AUD-020` (ví dụ ngắn chỉ 3/21 dòng F01B) | F01B 21/21 dòng có ví dụ + PRESENTER_GUIDE có cột Ví dụ ngắn | `mockup/F01B_Glossary.html:44-76` — 21/21 `.gl-line` đều có "(ví dụ: …)" (grep `ví dụ` = 22 = 21 dòng + 1 foot note; `gl-line` = 21); ví dụ **21/21 khớp nguyên văn** bảng canonical (so tay từng dòng: 47/50=94%, "Hôm nay 124 người đang làm", "Mã thẻ 12345…", "Margin 18%…"…); `PRESENTER_GUIDE.md:11-33` — có cột **Ví dụ ngắn**, 21/21 khớp canonical (grep ví dụ = 22 = 21 dòng + 1 header); nghĩa khớp 20/21 — dòng 17 Margin lệch từ → **AUD-022** (mới) | **`RESOLVED`** (kèm AUD-022) |
| `AUD-021` (F00A `.st-fstate` 11px) | Nâng 11px→12px | `mockup/F00A_DemoNarrative.html:28` — `font: 400 12px/14px` ✓; grep `11px` toàn file = **0**; diff `84ba2fc..bddb748 -- F00A` = **đúng 1 dòng** (CSS 11px→12px, không gì khác) → 16 mốc thời gian (00:00–13:00) + 16 link frame giữ nguyên (st-time = 16, say-vi = 16 + 1 CSS rule) | **`RESOLVED`** |

## 3. Acceptance Verification — Round 5

Re-check nhanh toàn bộ chuỗi AC-16 sau sửa (mục 2 round 4 + đối chiếu mới):

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Commit `bddb748` = đúng 4 file (F01B, PRESENTER_GUIDE, F00A, HANDOFF) | `PASS` — `git show --stat` = 4 file, cha `84ba2fc` (Planner Resolution: DECISION_LOG + TASK); không file lạ, không đụng appBCC/frame UI |
| 2 | F01B: 21/21 thuật ngữ, mỗi dòng nghĩa 1 dòng + ví dụ ngắn, nhóm 4 module 3/5/6/7 | `PASS` — giữ nguyên cấu trúc round 4 (21 dòng, nhóm 3/5/6/7) + ví dụ 21/21 |
| 3 | F01B khớp canonical DEC-33 | `PASS` (ví dụ 21/21 + nghĩa 20/21 nguyên văn; dòng 17 lệch từ → AUD-022 P3) |
| 4 | PRESENTER_GUIDE: cột Ví dụ ngắn khớp 100% | `PASS` (21/21 ví dụ khớp; cùng lệch từ dòng 17 như F01B — 2 file nhất quán với nhau) |
| 5 | F00A: `.st-fstate` 12px, grep 11px = 0 | `PASS` |
| 6 | F00A: 16 mốc thời gian + 16 link frame không đổi | `PASS` — diff 1 dòng CSS duy nhất |
| 7 | Các mục round 4 còn lại (watermark, PII, token hrp.css, index dòng F01B, 3 phần PRESENTER_GUIDE, UI 30 frame, link-check) | `PASS` — không file nào khác bị đụng trong bddb748; mọi thứ giữ nguyên kết quả round 4 |

## 4. Scope và Impact — Round 5

- **Trong phạm vi:** đóng 3 finding round 4 (AUD-019/020/021) theo Planner Resolution v1.13 + re-verify toàn chuỗi AC-16 bị ảnh hưởng.
- **Ngoài phạm vi:** nội dung nghiệp vụ 30 frame (round 1–3), dry-run AC-12, S05 (STEP-09).
- **Impact:** Không có gap chặn demo. Còn đúng 1 nit P3 (AUD-022 — 1 dòng wording, 2 file) cần Planner quyết định chiều sửa trước freeze.

## 5. Coverage Gaps — Round 5

- So sánh 3 nguồn bằng đọc tay + grep đếm; không dùng script diff tự động chuẩn hóa — nhưng dòng 17 là lệch duy nhất phát hiện được vì 20/21 dòng còn lại khớp chữ — mức tin cậy cao.
- Không chạy trình duyệt (không thay đổi render-path — F01B chỉ mở rộng nội dung `.gl-def`, F00A chỉ đổi 1 font-size).
- Git status: AUDIT.md đang modified (round 4 + 5, không commit — đúng lệnh read-only); appBCC modified từ trước (ngoài task).

## 6. Verdict và Planner Questions — Round 5

- **Verdict AC-16 (tổng):** `CONDITIONAL` — đường biên sát PASS.
- **Reason:** Cả 3 finding round 4 đều **RESOLVED** bằng bằng chứng độc lập: AUD-019 (bảng canonical 21/21 dòng, 4 cột, commit 84ba2fc — `DECISION_LOG.md:44-70`), AUD-020 (F01B 21/21 dòng có ví dụ, ví dụ 21/21 khớp nguyên văn canonical; PRESENTER_GUIDE cột Ví dụ ngắn 21/21), AUD-021 (F00A:28 12px, grep 11px = 0, diff F00A = 1 dòng CSS — 16 mốc + 16 link không đổi). Mọi pass-condition AC-16 (TASK.md:305) đều đạt: glossary tồn tại, 21 ≥ 15 thuật ngữ, mỗi dòng nghĩa + ví dụ, nhóm module, index dòng F01B, 16/16 lời thoại Việt không đổi click-path, PRESENTER_GUIDE đủ 3 phần, UI 30 frame nguyên vẹn, link-check OK. Còn **1 finding P3 mới (AUD-022)**: nghĩa dòng 17 Margin lệch từ giữa canonical và F01B/PG (2 file nhất quán nhau) — vi phạm đúng mandate "PHẢI khớp 100%" vừa được lập ra để đóng AUD-019, nên không thể PASS tuyệt đối; sửa 1 dòng (chọn chiều) là đủ → CONDITIONAL.
- **Planner decisions required:** `AUD-022` (P3 — chọn chiều sửa: đồng bộ canonical về F01B/PG hoặc ngược lại; 1 dòng × 2 file). Sau khi sửa, không cần re-audit toàn bộ — chỉ xác nhận dòng 17.

## 7. Re-audit Trace — Round 5

| Finding | Round 4 status | Round 5 status | Closure evidence |
|---|---|---|---|
| `AUD-019` | OPEN | **`RESOLVED`** | Bảng canonical tồn tại + commit (`DECISION_LOG.md:44-70`, revision 0.6 `:96`; `84ba2fc` stat +29) |
| `AUD-020` | OPEN | **`RESOLVED`** (kèm AUD-022) | F01B 21/21 dòng có ví dụ khớp canonical; PG cột Ví dụ ngắn 21/21; nghĩa 20/21 nguyên văn — dòng 17 lệch → AUD-022 |
| `AUD-021` | OPEN | **`RESOLVED`** | F00A:28 12px; grep 11px = 0; diff 84ba2fc..bddb748 = 1 dòng CSS, 16 mốc + 16 link không đổi |
| `AUD-022` (mới) | — | `OPEN` (P3) | `DECISION_LOG.md:66` vs `F01B:72`/`PG:29` — chờ Planner chọn chiều sửa |

> Đã bàn giao AUDIT.md round 5 cho Tier 1; chờ Planner Resolution cho AUD-022 trong TASK.md §9 (AUD-019/020/021 đã đóng).
