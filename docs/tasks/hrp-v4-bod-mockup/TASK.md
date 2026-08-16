# TASK: hrp-v4-bod-mockup

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work type | `DESIGN` |
| Spec version | `v1.11` |
| Status | IN_PROGRESS — STEP-08: audit round 3 đã có (verdict CONDITIONAL, AC-13 PASS), Planner Resolution AUD-015…018 đã ghi §9; còn 2 dry-run ≤15 phút chờ founder làm presenter (AC-12) + freeze chỉ sau PM/BoD ký. STEP-09 (S05) đã dựng — chờ re-audit round 4 cùng dry-run evidence. Roadmap D13–D16 đã chốt 16/08 (xem §11): freeze Mockup Baseline = trigger Phase 0. |
| Planner | `Tier 1 — Planner / Product & Architecture Decision Owner` |
| Executor | `Tier 1 Planner + ui-ux-pro-max skill (founder ủy quyền 15/08/2026 — thay sếp làm phần Figma)` |
| Auditor | `Tier 3 — independent audit context` |
| Baseline | `git a4327ab` · kiểm tra nguồn thực tế ngày 15/08/2026 · `docs/UNIFIED_PLAN_v4.md` (v4.20), `stitch/warm_professionalism/DESIGN.md` (design system canonical G27), `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` (PDD), `docs/HRP_V4_HOLISTIC_REVIEW.md` (HR), `docs/data-scope-security.md`, `prisma/schema.prisma`, skill `ui-ux-pro-max` (user-level — design intelligence/QA UX, lệnh founder 15/08/2026) |
| Modules | `M3, M4, M5, M7, M8` + `A-04 công cộng (Q#23 — frame tĩnh S05)` |
| ADR references | `plan v4.14 §9.4 (G14 — 1-ACTIVE)` · `§9.3.1 (G11 — Referral Guard)` · `§15.1 (G22 — ROOT/13 role)` · `§9.7 (Visibility Matrix)` · `ADR-010 (BigInt VND nguyên)` · `plan v4.15 (Q#23 — job board công cộng)` · `plan v4.19 §13 (G27 — design system canonical "Warm Professionalism")` |
| Updated | `2026-08-15 (VN)` |

## 1. Outcome

### User-visible outcome

Sếp/Figma Owner nhận **một contract duy nhất** để dựng trọn bộ mockup 10 ngày (low-fi → audit → high-fi → prototype → BoD package) mà không phải tự đoán nghiệp vụ, dữ liệu, frame, click-path hay tiêu chí audit. Bộ mockup kể một scenario liên tục qua 4 màn: Control Tower → Staffing/Talent Pool → Attendance Workbench → Dual Reconciliation + Vendor Preview, đủ để BoD chốt D01–D12 trong một buổi 45 phút. Kèm theo **1 frame tĩnh `S05_JobBoard_Public`** thể hiện bộ mặt trang tìm việc công cộng của HRP (Q#23 — founder chốt 15/08/2026) để BoD thấy kênh tuyển SELF_REGISTER; frame này nằm ngoài flow demo, không wire hotspot.

### Non-goals

- Không mock toàn bộ M0–M10; chỉ 4 màn chính + states/drawers trong phạm vi §4.5 Contract.
- Không đưa Payroll, TNCN, BHXH, Worker Portal hoặc CRM pipeline vào flow demo chính.
- Không dựng flow apply/đăng ký công cộng (A-05) — S05 chỉ là 1 frame tĩnh, không wire hotspot.
- Không mock cấu hình hệ thống, quản trị permission chi tiết, eKYC, máy chấm công thật.
- Không viết code sản phẩm — mockup là HTML tĩnh trong `docs/tasks/hrp-v4-bod-mockup/mockup/`, ngoài repo app (DEC-27); không tạo HANDOFF.md/AUDIT.md trước STEP-04/STEP-07.
- Không đánh dấu bất kỳ quyết định D01–D12 nào là final của BoD — chúng là prototype assumption.

## 2. Evidence và Baseline

Chỉ ghi evidence cần để ra quyết định; dùng file/section thay vì chép tài liệu.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | PDD §1.2, §7.5, §7.6 | Scenario khóa: 50/47/thiếu 3; 1.222 raw rows, 1.215 matched, 7 exceptions; 728.460.000 / 914.820.000 / 186.360.000 (20,37%) | Là hằng số bắt buộc ở mọi frame; đưa vào §4.4 |
| `EV-02` | PDD §7.2 vs §6.2 | Vendor split "31/47 + 9/47" cộng = 40 ≠ 47 worker ở footer bảng statement | Mâu thuẫn CF-2 → DEC-05 |
| `EV-03` | PDD §4.4 vs §6.4, §5.2 | Nam ACTIVE tại Yên Phong từ 10/06 nhưng lại có 208h trong statement An Phát tháng 08 và dòng AP-QM-1021 ngày 14/08 | Mâu thuẫn CF-1 → DEC-06 |
| `EV-04` | PDD §4.5 vs §1.3 | Timeline Referral Guard ghi "16/08 vendor nộp lại" trong khi demo ngày 15/08 và presenter nói "vendor mới nộp hôm nay"; "tạo claim 4 ngày trước" trong khi claim 12/08 cách 15/08 đúng 3 ngày | Mâu thuẫn CF-3/CF-4 → DEC-07 |
| `EV-05` | PDD §5.2 vs §7.5 | Tabs "Chưa map 2" trong khi 7 exceptions phải xuất hiện đúng 1 lần mỗi taxonomy | Mâu thuẫn CF-5 → DEC-08 |
| `EV-06` | PDD §3.2 "phản hồi còn 18h" vs D09 SLA 3 ngày làm việc; 15/08/2026 là thứ Bảy | 18h không khớp bất kỳ deadline làm việc ngày nào | Mâu thuẫn CF-6 → DEC-09 |
| `EV-07` | `prisma/schema.prisma:206-262` (Worker), `:399` (Site), `:419` (Vendor) | Worker không có field `area`/skill/ca; chỉ có address, profileStatus/employmentStatus/riskStatus | Card "Khu vực/Ca/Kỹ năng" là display data của mockup; ASSUMPTION DEC-10 |
| `EV-08` | `prisma/schema.prisma:787-799` (VendorStatementLine) vs PDD §6.4 | Schema line có 1 rate/tổng giờ; lineage drawer tách Regular/OT hai rate | Mockup vẽ lineage khái niệm (TimesheetLine × rate card); schema snapshot chi tiết thuộc task CODE sau — DEC-11 |
| `EV-09` | HR §5 (dòng "ĐÃ CHỐT Q#22") vs plan §9.7 (dòng 1610) + Q#22 (dòng 3242) còn ghi "CẦN CHỐT" | Hai nguồn lệch trạng thái Q#22 (DIRECTOR/MKT data scope) | Không ảnh hưởng 4 màn demo; áp HR §5 làm quyết định cho mockup — DEC-12 |
| `EV-10` | `prisma/schema.prisma:533-577` (AttendanceImportBatch/Row), `:637-652` (TimesheetPeriod), `:767-799` (VendorStatement) | Batch status có `PREVIEWED` (khớp badge S03); Period: PENDING/REVIEWED/APPROVED/LOCKED; Statement: DRAFT/SENT/DISPUTED/CONFIRMED/LOCKED/PAID | Khóa từ vựng trạng thái hiển thị trong §4.3; không mâu thuẫn |
| `EV-11` | PDD §10.2 | D01–D12 kèm recommendation; chỉ D01–D08 cần chốt để vào wireframe vòng 2; D09–D12 defer được | Đưa toàn bộ vào Decisions làm prototype assumption + mức chặn |
| `EV-12` | PDD §8.1, §8.3, §12 | Cấu trúc 10 page, 11 hotspot, checklist acceptance trước BoD | Frame inventory §4.5, STEP-06/08, Acceptance |
| `EV-13` | HR §5.1.1 + §7 (32/32 test, build fail alias) | Trạng thái repo: code chưa là nguồn thật của mockup | Mockup là DESIGN độc lập baseline code; không dùng số liệu từ runtime |
| `EV-14` | plan §5.1 (A-04/A-05 Wave 3), §14.6 (ISR 300s) + `prisma/schema.prisma:341` (`Project.isPublic`) vs quyết định founder 15/08/2026 | V4 chưa coi trang web công cộng là bề mặt sản phẩm hạng nhất; founder chốt: HRP public = trang tìm việc, job board công cộng kéo về Wave 1 sau M3 (Q#23 — plan v4.15) | Demo BoD thêm 1 frame tĩnh S05 (không flow) — DEC-25, RQ-13, STEP-09, AC-15 |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Scenario xuyên suốt duy nhất: An Phát cần 50, ACTIVE 47, thiếu 3; Nam vi phạm 1-ACTIVE (guided transfer); Huy có Referral Guard; 7 exceptions trước lock; lock kỳ sinh payable 728.460.000 ₫ + receivable 914.820.000 ₫ + margin 186.360.000 ₫ (20,37%). Mọi frame dùng đúng các hằng số này | PDD §1.2 / Planner | Không hết hạn; BoD chỉ đổi qua Decision Log |
| `DEC-02` | `CHOSEN` | Các recommendation D01–D12 trong PDD §10.2 là **prototype assumption** để Figma Owner bắt đầu ngay; không tự đánh dấu final. D01–D08 bắt buộc đưa vào demo/feedback (variant trang 60); D09–D12 defer có owner+deadline sau buổi họp | PDD §10.2 / Planner | Hết hạn: sau buổi BoD |
| `DEC-03` | `CHOSEN` | D01 (4 KPI Control Tower): dùng variant A (workforce/fill/attendance/statement; tài chính nằm ở project table). **Chặn:** low-fi S01 nếu BoD chọn khác → vẽ lại KPI strip | PDD §10.2 | Sau buổi BoD |
| `DEC-04` | `CHOSEN` | D02 (density 44/52): vẽ cả 2 variant (D02A compact 44px / D02B comfortable 52px); default trình diễn 44px. **Chặn:** high-fi Foundations | PDD §10.2 | Sau buổi BoD |
| `DEC-05` | `CHOSEN` | D03 (Talent Pool): vẽ cả 2 variant (D03A card 3 cột / D03B dense list); default card. **Chặn:** high-fi S02 | PDD §10.2 | Sau buổi BoD |
| `DEC-06` | `CHOSEN` | D04 (1-ACTIVE): guided transfer drawer (PDD §4.4), không error modal; variant error-modal chỉ nằm trang 60. **Chặn:** low-fi S02A nếu BoD chọn block | PDD §10.2 | Sau buổi BoD |
| `DEC-07` | `CHOSEN` | D05 (Referral Guard override): HR_MANAGER duyệt, maker-checker (người yêu cầu ≠ người duyệt); button override chỉ hiện khi có permission. **Chặn:** high-fi S02B | PDD §10.2 | Sau buổi BoD |
| `DEC-08` | `CHOSEN` | D06 (bước trước LOCK): Review → Approve → Lock (maker-checker tối thiểu). **Chặn:** low-fi S03 flow nếu BoD chọn 2 bước | PDD §10.2 | Sau buổi BoD |
| `DEC-09` | `CHOSEN` | D07 (blocker tuyệt đối): UNMATCHED_EMPLOYEE + SOURCE_CONFLICT + WRONG_PROJECT. **Chặn:** low-fi S03 readiness logic | PDD §10.2 | Sau buổi BoD |
| `DEC-10` | `CHOSEN` | D08 (vendor thấy gì): rate + quantity + amount (đủ basis). **Chặn:** low-fi/high-fi S04B cột bảng | PDD §10.2 | Sau buổi BoD |
| `DEC-11` | `CHOSEN` | D09 (SLA vendor confirm): 3 ngày làm việc (default thử nghiệm). **Chặn:** high-fi S04B text deadline | PDD §10.2 | Deferred — owner sếp, due sau buổi BoD |
| `DEC-12` | `CHOSEN` | D10 (ai thấy margin): Director + Accountant mặc định; PM theo permission. **Chặn:** high-fi S04 margin visibility | PDD §10.2 | Deferred |
| `DEC-13` | `CHOSEN` | D11 (risk vocabulary): `Cần xem xét` / `Bị chặn`, không màu-only. **Chặn:** high-fi wording | PDD §10.2 | Deferred |
| `DEC-14` | `CHOSEN` | D12 (brand thật): anonymized cho vòng đầu (tên hư cấu, không logo khách thật). **Chặn:** không chặn gì — áp cho mọi frame ngay | PDD §10.2 | Deferred |
| `DEC-15` | `CHOSEN` | **CF-2 (vendor split):** Bắc Việt cung ứng toàn bộ 47 worker của An Phát trong demo (statement V1 = 728.460.000 ₫ duy nhất); Minh Tâm (VND-007) xuất hiện như nguồn Talent Pool (Đỗ Văn Cường) và vendor tại dự án khác. Lý do: 31+9=40≠47 (EV-02), margin formula yêu cầu toàn bộ chi phí công chảy qua vendor payable, và vendor preview phải thấy đúng tổng 728.460.000 ₫ trong story | EV-02 / Planner | Sau buổi BoD |
| `DEC-16` | `CHOSEN` | **CF-1 (Nam hai vai):** Nam (HRP-02418) chỉ là nhân vật chuyển dự án ở S02. Nhân vật của S03/S04 (dòng AP-QM-1021, lineage drawer) là **Bùi Đức Long (HRP-02483)** — ACTIVE tại An Phát. Toàn bộ số dòng giữ nguyên: 208h × 58.000 + 12h × 87.000 = 13.108.000 ₫; client 16.272.000 ₫; margin 3.164.000 ₫ | EV-03 / Planner | Sau buổi BoD |
| `DEC-17` | `CHOSEN` | **CF-3/CF-4 (timeline Referral Guard):** claim CTV 12/08 → HR xác nhận 12/08 → vendor Bắc Việt nộp lại **15/08** (hôm nay, không phải 16/08). Cửa sổ bảo vệ 7 ngày: 12–18/08; badge "còn 3 ngày" tại 15/08. Presenter nói "claim tạo ngày 12/08" (bỏ "4 ngày trước") | EV-04 / Planner | Sau buổi BoD |
| `DEC-18` | `CHOSEN` | **CF-5 (2 chưa map trong 7 exceptions):** 7 exception = 7 taxonomy × 1 lần; trong đó 2 row "chưa map" = UNMATCHED_EMPLOYEE (AP-QM-1048, blocker) + INACTIVE_ASSIGNMENT (AP-QM-1128). Blocker trước lock: UNMATCHED_EMPLOYEE + SOURCE_CONFLICT. Bảng 7 dòng cụ thể tại §4.4 | EV-05 / Planner | Sau buổi BoD |
| `DEC-19` | `CHOSEN` | **CF-6 (deadline vendor):** statement gửi 13/08 17:00 (thứ Năm); SLA 3 ngày làm việc (14, 17, 18/08) → deadline 18/08 18:00; queue S01 ghi "Bắc Việt · phản hồi còn 2 ngày" (không dùng "18h"). Chuỗi deadline là biến D09 — ghi chú ở variant trang 60 | EV-06 / Planner | Sau buổi BoD |
| `DEC-20` | `CHOSEN` | **Q#22 (DIRECTOR/MKT):** áp HR §5 + §9.1 làm quyết định cho mockup: DIRECTOR global row-read (projection ẩn CCCD/bank/selfie), MKT CRM-only không đọc Worker. Không ảnh hưởng 4 màn demo (không có màn MKT/DIRECTOR riêng); ghi nợ cần đồng bộ plan §9.7/Q#22 sau | EV-09 / Planner | Không chặn execution |
| `DEC-21` | `ASSUMPTION` | **Display data trên card Worker:** "Khu vực" (Miền Bắc + tỉnh từ currentAddress/Site), "Ca có thể làm", "Kỹ năng" (Lắp ráp SMT, QA...) là dữ liệu hiển thị của mockup; schema chưa có field riêng (EV-07), plan E-04 đã xếp filter này (plan dòng 984). Task CODE dựng màn thật phải bổ sung field trước | EV-07 / Planner | Đến khi task CODE S02 được mở |
| `DEC-22` | `ASSUMPTION` | **Lineage statement là khái niệm:** drawer vẽ cơ sở tính từ TimesheetLine (regular/OT hours) × rate card; schema VendorStatementLine hiện 1 rate/line (EV-08) — snapshot lineage đầy đủ do task CODE thực hiện theo HR §1.4. Mockup không bị chặn | EV-08 / Planner | Đến khi task CODE S04 được mở |
| `DEC-23` | `ASSUMPTION` | Worker display ID dùng `HRP-xxxxx` (PDD §7.3); schema `userId` ví dụ "USR-001" chỉ là định dạng ví dụ. Task CODE seed mock data sau này phải map về schema | PDD §7.3 / schema:207 / Planner | Đến khi task CODE seed |
| `DEC-24` | `CHOSEN` | Frame inventory + naming theo PDD §8.1, mở rộng states tại §4.5. Trang 60 là nơi chứa variant D01–D08 để BoD chọn; trang 90 archive | PDD §8.1 / Planner | Hết hạn: freeze Mockup Baseline |
| `DEC-25` | `CHOSEN` | **Q#23 (founder chốt 15/08/2026):** trang công cộng HRP là trang tìm việc 4 trang (Home tìm việc, Danh sách việc, Chi tiết việc, Công ty đang tuyển) đọc từ `Project.isPublic` + StaffingOrder, ISR 300s; job board công cộng (A-04) kéo về **Wave 1 sau M3**; apply self-service (A-05) + PWA vẫn Wave 3. Trong demo BoD chỉ dựng **1 frame tĩnh `S05_JobBoard_Public_1440`** (bộ mặt công cộng, không flow, không hotspot) | EV-14, plan v4.15 Q#23 / Founder | Hết hạn: sau buổi BoD; task CODE A-04 công cộng mở sau |
| `DEC-26` | `CHOSEN` | **Design system canonical (G27, plan v4.19 §13):** F01_Tokens dùng `stitch/warm_professionalism/DESIGN.md` "Warm Professionalism" thay palette tạm PDD §2.2 — đúng lệnh PDD dòng 132 "thay token chứ không thay semantics". Map: Primary `#E85D24` → **`#F26522`** (hover/dark `#A63B00`); Ink `#17202A` → on-surface `#1A1C1B`; Canvas `#F5F7F9` → background `#FAF9F7`; Border `#D8DEE6` → outline-variant `#E1BFB3`; Neutral `#5B6673` → on-surface-variant `#594138`; font **Be Vietnam Pro** (heading/body) + **Inter** (label). Semantic Info/Success/Warning/Danger **giữ nguyên PDD** (DESIGN.md chỉ định nghĩa error `#BA1A1A`). Layout/sidebar 232px/gutter 24px giữ nguyên PDD §2.1 | PDD §2.2 dòng 132 / plan v4.19 §13 (G27) / Planner | Không hết hạn — áp từ STEP-01; S05 dùng cùng token (khớp 3 page stitch) |
| `DEC-27` | `CHOSEN` | **Medium mockup = HTML/CSS prototype (không phải file Figma native):** môi trường executor không có Figma MCP (chỉ codegraph MCP); founder 15/08 chỉ định dùng skill `ui-ux-pro-max` + nguyên tắc stitch. Mỗi frame §4.5 = 1 file HTML tự chứa trong `docs/tasks/hrp-v4-bod-mockup/mockup/` (tên file = tên frame, vd `S01_ControlTower_Default_1440.html`); "10 page Figma" = 10 nhóm trong `mockup/index.html` (bản đồ frame); app shell/tokens/components = CSS dùng chung `mockup/_assets/hrp.css` theo DESIGN.md canonical G27 (DEC-26). Mapping Figma→HTML: Auto Layout→CSS grid/flex + spacing token; component variant→CSS class; "không detach"→chỉ dùng class chung, không inline override (RISK-05); hotspot→`<a>` giữa các file, ≥44×44 px, back-path là link quay về; export dự phòng→browser print (RISK-04). Import Figma qua plugin html.to.design là tùy chọn sau này của sếp — không phải bước bắt buộc của task | Founder 15/08/2026 ("dùng ui-ux pro max … nguyên tắc trong stitch") / Planner | Không hết hạn — áp toàn bộ STEP; nếu sếp bật Figma MCP thì medium quay lại Figma và re-map file |
| `DEC-28` | `CHOSEN` | **Radius scale canonical G27 (AUD-003):** dùng DESIGN.md — button/input/tag 8px, card/modal 16–24px (`--radius: 8px; --radius-md: 16px; --radius-lg: 24px`), thay scale tạm 6/10/14 trong hrp.css; F01_Tokens cập nhật "Radius 8/16/24" | DESIGN.md (G27); AUDIT.md round 1 AUD-003 / Planner | Không hết hạn — áp từ STEP-03; S05 dùng cùng token |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Một scenario liên tục S01→S04 với đúng hằng số: nhu cầu 50, ACTIVE 47, thiếu 3; 1-ACTIVE guided transfer; Referral Guard; 7 exceptions → lock; 728.460.000 / 914.820.000 / 186.360.000 ₫. Số không đổi giữa frame | Must | EV-01, DEC-01 | Audit finding BLOCKER; không được trình BoD khi số lệch |
| `RQ-02` | Đúng 4 màn chính + drawers quy định ở §4.5 (S05 là frame tĩnh bổ sung ngoài flow — DEC-25); Payroll/TNCN/BHXH/Worker Portal/CRM pipeline không xuất hiện trong flow demo | Must | PDD §0.2, DEC-25 | Audit finding; frame ngoài scope bị yêu cầu gỡ |
| `RQ-03` | S01 Control Tower: context header (vùng/kỳ/thời điểm), KPI strip 4 số phẳng, action queue 4 mục, 2 chart nhỏ, project table; click điều hướng giữ nguyên context | Must | PDD §3 | Frame thiếu thành phần → không đạt AC-01 |
| `RQ-04` | S02 Staffing: card grid 3 cột, filter giữ context, card không lộ PII (không CCCD đầy đủ/bank/lương), guided transfer drawer cho 1-ACTIVE, Referral Guard drawer (timeline + lý do + remaining window + override path) | Must | PDD §4 | Hành vi sai nghiệp vụ (toast lỗi thay guided) → rework |
| `RQ-05` | S03 Attendance: table với 7 exception đúng taxonomy ×1 lần, resolve drawer 3 band, readiness bar, lock dialog có hệ quả, locked read-only | Must | PDD §5, DEC-18 | Taxonomy thiếu/thừa → rework; không khóa được kỳ nếu readiness sai |
| `RQ-06` | S04 Reconciliation: 2 tab vendor/client, summary band 3 số, lineage drawer, vendor preview ẩn client rate/margin/salary, dispute form có cấu trúc | Must | PDD §6 | Vendor thấy field cấm (client rate/margin) → finding CRITICAL |
| `RQ-07` | Canonical mock data duy nhất (§4.4): ID ổn định, totals cộng đúng, tiền vi-VN nguyên đồng, giờ dấu phẩy, watermark `DỮ LIỆU MINH HỌA`, không PII/brand thật | Must | PDD §7, DEC-14/15/16/17/18/19 | Số lệch giữa frame → audit BLOCKER; PII thật → CRITICAL |
| `RQ-08` | Đủ states: loading skeleton, empty queue/no result, stale banner, locked read-only, failed import, dispute, revision V2 — theo PDD §3.5/§4.6/§5.7/§6.6 | Must | EV-12 | Thiếu state → audit warning yêu cầu bổ sung trước high-fi |
| `RQ-09` | App shell + tokens: sidebar 232px không đổi vị trí, top bar 56px, gutter 24px, radius 8/16/24 (G27 — DEC-28), tokens `DESIGN.md` canonical G27 (DEC-26 — thay token, không thay semantics), badge icon+text không màu-only, 1440×900 chính + kiểm tra 1366×768 không che CTA/totals | Must | PDD §2, DEC-26, DEC-28 | Che CTA ở 1366×768 → audit finding chặn baseline |
| `RQ-10` | Prototype hotspots đúng click-path PDD §8.3 + back-path hợp lệ; demo hoàn thành ≤ 15 phút | Must | EV-12 | Hotspot chết/không back-path → không đạt AC-12 |
| `RQ-11` | D01–D08 có mặt trong demo/feedback (variant trang 60); D09–D12 có ghi chú owner+due; Decision Log D01–D12 tạo trước buổi họp | Must | DEC-02, PDD §10.3 | Thiếu variant → BoD không chọn được → baseline bị hoãn |
| `RQ-12` | Hai audit round: HANDOFF.md round 1 (low-fi) + round 2 (high-fi) theo template `.ai-pipeline/templates/HANDOFF.template.md`; mọi AUD finding có Planner Resolution trong TASK trước khi sang bước tiếp | Must | .ai-pipeline/tier1.md, PDD §11.3 | Finding không được xử lý → không READY_FOR_AUDIT lần sau |
| `RQ-13` | Đúng 1 frame tĩnh hi-fi `S05_JobBoard_Public_1440` thể hiện trang tìm việc công cộng: header công cộng (logo HRP + nút Đăng nhập/Đăng ký), filter minh họa (địa điểm/ca), 3 job card từ dữ liệu §4.4 (An Phát 50/47, Yên Phong 80/80, Sao Việt 35/32 — tên hư cấu), nút `Ứng tuyển` hiển thị trên mỗi card; dùng tokens/app shell công cộng nhưng không có sidebar quản trị; không wire hotspot, không dựng flow apply/đăng ký | Must | plan v4.15 Q#23, DEC-25 | Thiếu frame hoặc có flow/hotspot → không đạt AC-15 |

### 4.2 Scope boundaries

**In scope:**

- Toàn bộ frame/states trong §4.5 (4 màn + drawers + states + 3 trang phụ trợ + 1 frame tĩnh S05).
- Canonical mock data §4.4 và presentation strings.
- App shell, foundations, components, prototype hotspots, PDF backup, Decision Log.

**Out of scope:**

- Payroll, TNCN, BHXH, Worker Portal, CRM pipeline, eKYC, máy chấm công, admin/permission config UI.
- Flow apply/đăng ký công cộng (A-05) — S05 chỉ là 1 frame tĩnh, không wire hotspot.
- Mobile/PWA (chỉ low-fidelity sau khi BoD chốt core flow).
- Bất kỳ thay đổi nào với `prisma/schema.prisma`, code, migration, test.
- HANDOFF.md/AUDIT.md ở thời điểm tạo TASK này (do Executor/Tier 3 tạo ở STEP-04/07).

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Tiền là BigInt nguyên đồng, hiển thị `vi-VN` kiểu `914.820.000 ₫`; không dùng `1.2B`/float. Giờ dấu phẩy (`490,5 giờ`). Ngày `dd/MM/yyyy`; thời điểm `dd/MM/yyyy · HH:mm`. Mã nghiệp vụ/file không dấu; label UI tiếng Việt có dấu.
- **State:** Từ vựng trạng thái hiển thị lấy từ PDD §2.4, khớp schema (EV-10): Profile `Chưa đủ hồ sơ/Chờ xác minh/Đã xác minh/Bị từ chối`; Assignment `Dự kiến/Đang làm/Tạm dừng/Đã kết thúc/Đã chuyển`; Risk `Bình thường/Cần xem xét/Bị chặn`; Attendance `Đã khớp/Chưa khớp/Bất thường/Đã duyệt/Đã khóa`; Statement `Nháp/Đã gửi/Bị phản đối/Đã xác nhận/Đã khóa/Đã thanh toán`. S03 batch header dùng `PREVIEWED` (khớp `AttendanceImportBatch.status`).
- **Permission/data scope:** S04B Vendor Preview chỉ hiện statement của chính vendor; ẩn client rate, client amount, margin, salary và nguồn khác (PDD §6.5). Override Referral Guard chỉ hiện nếu có permission (DEC-07). Margin chỉ cho Director/Accountant, PM theo permission (DEC-12 — biến D10).
- **Interface:** Frame naming theo PDD §8.1 (`S01_ControlTower_Default_1440`, ...); medium HTML theo DEC-27: Auto Layout→CSS grid/flex + spacing token; component variant→CSS class dùng chung trong `_assets/hrp.css` (không inline override — tương đương "không detach"); semantic naming giữ ở tên class. Right drawer rộng 440–520px; không modal cho navigation chính; hotspot ≥ 44×44 px. Mỗi màn đúng 1 primary action.
- **Failure/idempotency/concurrency:** Không áp dụng cho DESIGN task — không có runtime behavior. Lý do: mockup là artifact tĩnh + prototype click-path.

### 4.4 Canonical mock data dictionary

**Bối cảnh:** Kỳ `08/2026`, vùng `Miền Bắc`, snapshot `15/08/2026 · 08:42`, watermark `DỮ LIỆU MINH HỌA` trên top bar.

**Client / Project / Vendor / Period / Region:**

| ID | Tên hiển thị | Địa điểm / vai trò | Số liệu demo |
|---|---|---|---|
| CL-0018 | Công ty TNHH Điện tử An Phát | KCN Quang Minh, Hà Nội | Client chính |
| CL-0021 | Công ty CP Kho vận Đông Dương | KCN Yên Phong, Bắc Ninh | Dự án cũ của Nam |
| CL-0027 | Công ty TNHH Linh kiện Sao Việt | KCN Quang Châu, Bắc Giang | Dòng so sánh |
| DA-2026-018 | Nhà máy Điện tử An Phát | PM Nguyễn Thùy Linh | Nhu cầu 50 · ACTIVE 47 · thiếu 3 · kỳ 08/2026 |
| DA-2026-022 | Kho vận Yên Phong | PM Trần Quốc Bảo | Nhu cầu 80 · ACTIVE 80 · assignment cũ của Nam |
| PRJ-SV-014 | Nhà máy Sao Việt | PM Nguyễn Hữu Tâm | Nhu cầu 35 · ACTIVE 32 |
| VND-004 | Công ty CP Nhân lực Bắc Việt | Vendor duy nhất của An Phát trong demo | 47/47 worker (DEC-15) · statement V1 |
| VND-007 | Công ty TNHH Cung ứng Minh Tâm | Nguồn Talent Pool + vendor dự án khác | 0/47 tại An Phát trong demo (DEC-15) |

**Worker (12 nhân vật hiển thị; 3 nhân vật có vai trong story):**

| Worker ID | Họ tên | Khu vực | Ca/kỹ năng | Trạng thái hiển thị | Vai trong demo |
|---|---|---|---|---|---|
| HRP-02418 | Nguyễn Văn Nam | Bắc Ninh | D1/N1 · Lắp ráp SMT | Đang làm — DA-2026-022 | S02: guided transfer 1-ACTIVE |
| HRP-02483 | Bùi Đức Long | Bắc Ninh | D1/N1 · Kho | Đang làm — DA-2026-018 | S03 dòng AP-QM-1021 + S04 lineage (DEC-16) |
| HRP-02431 | Trần Thị Mai | Bắc Giang | D1 · QA ngoại quan | Đã xác minh · Vendor Bắc Việt | S03: map AP-QM-1048; ACTIVE An Phát từ 12/08 |
| HRP-02444 | Phạm Quốc Huy | Sóc Sơn | D1/D2 · Đóng gói | Sẵn sàng · Nguồn bảo vệ (còn 3 ngày) | S02B: Referral Guard |
| HRP-02522 | Phan Văn Khánh | Bắc Ninh | N1 · Xe nâng | Đang làm — DA-2026-018 | S03: row MISSING_CHECKOUT |
| HRP-02452 | Lê Thị Thu Trang | Mê Linh | D1 · Kiểm hàng | Sẵn sàng · HRP trực tiếp | Card pool |
| HRP-02465 | Đỗ Văn Cường | Đông Anh | N1 · Vận hành máy | Cần xem xét · Vendor Minh Tâm | Card pool + "2 hồ sơ nguồn cần review" |
| HRP-02479 | Hoàng Thị Ngọc Anh | Bắc Giang | D2 · QA | Sẵn sàng · Vendor Bắc Việt | Card pool |
| HRP-02497 | Vũ Thị Hương | Vĩnh Phúc | HC/D1 · Admin xưởng | Dự kiến 20/08 | Card pool |
| HRP-02504 | Nguyễn Minh Tuấn | Hà Nội | D2 · Lắp ráp | Bị chặn · hồ sơ cần review | Card pool — CTA disabled có lý do |
| HRP-02516 | Hà Thị Lan | Bắc Giang | D1 · Đóng gói | Sẵn sàng · CTV | Card pool |
| HRP-02537 | Đặng Thu Phương | Mê Linh | D1/D2 · QC | Sẵn sàng · Vendor Bắc Việt | Card pool |

Presenter chỉ tương tác sâu với Nam, Huy, Mai, Long. Pool hiển thị "128 kết quả" (12 card + phân trang).

**Shift codes:**

| Code | Khung giờ | Label UI | Ghi chú |
|---|---|---|---|
| HC | 08:00–17:00 | Hành chính | Nghỉ trưa theo site |
| D1 | 06:00–14:00 | Ca ngày 1 | Ca chính của demo |
| D2 | 14:00–22:00 | Ca ngày 2 | Bàn giao 14:00 |
| N1 | 22:00–06:00 | Ca đêm | Vắt ngày, tách theo lịch |
| T1 | 07:30–16:30 | Ca kho vận | Dùng ở Yên Phong |

**Attendance dataset (file AP_QM_T08_2026.xlsx, nhập 08:14 bởi Lê Thu Hà, batch status PREVIEWED):**

| Metric | Giá trị |
|---|---:|
| Raw rows | 1.222 |
| Matched | 1.215 |
| Exceptions | 7 (mỗi taxonomy đúng 1 lần — DEC-18) |
| Chưa map | 2 (UNMATCHED_EMPLOYEE + INACTIVE_ASSIGNMENT) |
| Workers | 47 |
| Regular hours | 9.624,0 |
| OT1.5 / OT2.0 / OT3.0 | 426,5 / 48,0 / 16,0 |
| Total OT | 490,5 |

**7 exception rows (bảng S03 — thứ tự hiển thị blocker trước):**

| Row | Mã NV | Worker | Ngày | Ca | Vào | Ra | Loại (code → label) | Xử lý | Blocker? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | AP-QM-1048 | — (chưa map) | 12/08 | D1 | 06:02 | 14:07 | UNMATCHED_EMPLOYEE → Chưa tìm thấy mã nhân viên | Gán vào Trần Thị Mai | Có |
| 2 | AP-QM-1140 | Nguyễn Thị Thảo | 09/08 | D1 | 06:05 | 14:10 | SOURCE_CONFLICT → Hai nguồn điểm danh mâu thuẫn | So evidence, chọn resolution có audit | Có |
| 3 | AP-QM-1115 | Trần Văn Hòa | 10/08 | T1 | 07:28 | 16:31 | WRONG_PROJECT → Người không thuộc dự án ngày này | Chọn đúng assignment | Có (theo DEC-09) |
| 4 | AP-QM-1021 | Bùi Đức Long | 14/08 | N1 | 21:58 | 06:04 | CROSS_DAY_SHIFT → Ca vắt ngày cần tách | Preview 2 dòng normalized (2+6) | Không |
| 5 | AP-QM-1097 | Phan Văn Khánh | 13/08 | D1 | 06:00 | — | MISSING_CHECKOUT → Thiếu giờ ra | Nhập correction kèm lý do | Không |
| 6 | AP-QM-1102 | Phạm Thị Nhung | 11/08 | D2 | 14:03 | 22:00 | DUPLICATE_EVENT → Có bản ghi trùng | So hash/source, giữ một raw event | Không |
| 7 | AP-QM-1128 | Lê Văn Đức | 05/08 | D1 | 06:01 | 14:05 | INACTIVE_ASSIGNMENT → Assignment chưa ACTIVE | Điều hướng kích hoạt assignment mới | Không |

Readiness: khởi đầu `5/7 resolved · Còn 2 blocker` (row 1 + 2) → sau resolve `7/7 · Sẵn sàng khóa`. Maker: Lê Thu Hà; Checker: Nguyễn Thanh Huyền.

**Financial dataset (BigInt nguyên đồng):**

| Metric | UI hiển thị | Giá trị dữ liệu |
|---|---:|---:|
| Vendor payable | `728.460.000 ₫` | `728460000n` |
| Client receivable | `914.820.000 ₫` | `914820000n` |
| Gross margin | `186.360.000 ₫ · 20,37%` | `186360000n` (derived) |
| Vendor regular rate | `58.000 ₫/giờ` | `58000n` |
| Vendor OT1.5 rate | `87.000 ₫/giờ` | `87000n` |
| Client regular rate | `72.000 ₫/giờ` | `72000n` |
| Client OT1.5 rate | `108.000 ₫/giờ` | `108000n` |
| Long — vendor line | `13.108.000 ₫` | `13108000n` |
| Long — client line | `16.272.000 ₫` | `16272000n` |
| Long — line margin | `3.164.000 ₫` | `3164000n` |
| Khánh — vendor line (196h reg + 8h OT1.5) | `12.064.000 ₫` | `12064000n` |
| Khánh — client line | `14.976.000 ₫` | `14976000n` |
| Mai — vendor line (96h reg, từ 12/08) | `5.568.000 ₫` | `5568000n` |
| Mai — client line | `6.912.000 ₫` | `6912000n` |

**Validation rules (bắt buộc — Tier 3 sẽ kiểm tra bằng cộng tay):**

- `914.820.000 − 728.460.000 = 186.360.000` và `186.360.000 / 914.820.000 ≈ 20,37%`.
- Long: `208 × 58.000 + 12 × 87.000 = 13.108.000`; `208 × 72.000 + 12 × 108.000 = 16.272.000`; `16.272.000 − 13.108.000 = 3.164.000`.
- Khánh: `196 × 58.000 + 8 × 87.000 = 12.064.000`; client `196 × 72.000 + 8 × 108.000 = 14.976.000`.
- Mai: `96 × 58.000 = 5.568.000`; client `96 × 72.000 = 6.912.000`.
- Bảng S04 hiển thị 3 dòng trên + tổng chân bảng `728.460.000 ₫` (44 dòng ẩn gộp phần còn lại: 47 workers − 3 hiển thị — không hiển thị dòng nào khác với số bịa thêm).
- `426,5 + 48,0 + 16,0 = 490,5`; `1.222 − 1.215 = 7`.
- Margin comparison (bảng tối đa 10 dòng, hiển thị 3): An Phát `914.820.000 / 728.460.000 / 0 / 186.360.000 / 20,37%`; Yên Phong `620.500.000 / 512.400.000 / 0 / 108.100.000 / 17,42%`; Sao Việt `305.200.000 / 268.900.000 / 0 / 36.300.000 / 11,89%`.

**Mapping field/frame (số nào xuất hiện ở đâu):**

| Con số | Xuất hiện ở frame |
|---|---|
| Thiếu 3 / 47/50 | S01 queue + project table; S02 header `47/50 ACTIVE · Thiếu 3`; S05 job card An Phát `Cần 50 · Đã nhận 47 · Còn 3` |
| Job card công cộng (An Phát/Yên Phong/Sao Việt) | S05 — 3 card: DA-2026-018 `50/47`, DA-2026-022 `80/80`, PRJ-SV-014 `35/32`; địa điểm + ca (HC/D1/D2/N1) từ §4.4 |
| 7 ngoại lệ | S01 queue; S02 breadcrumb badge `7 ngoại lệ công`; S03 stats + readiness |
| 1.222 / 1.215 / 9.624 / 490,5 | S03 header stats + S03B lock dialog + S04 footer |
| 728.460.000 / 914.820.000 / 186.360.000 | S01 project table (margin) + S04 summary band + S04B (chỉ 728.460.000) |
| 13.108.000 / 16.272.000 / 3.164.000 | S04 bảng + S04A lineage (nhân vật: Bùi Đức Long) |
| 2 hồ sơ nguồn cần review | S01 queue (Huy + Cường) |
| Bắc Việt phản hồi còn 2 ngày | S01 queue + S04B deadline 18/08 18:00 (DEC-19) |
| ACTIVE 1.842 / Thiếu 126 / 97,8% / 12/15 | Chỉ S01 KPI strip (org-wide, không lặp lại màn khác) |
| Chart 8 tuần | S01 line chart: `1.710, 1.738, 1.765, 1.792, 1.810, 1.798, 1.826, 1.842`; bar fill rate: An Phát 94%, Yên Phong 100%, Sao Việt 91,4% |

**Presentation strings (khóa):** timeline Referral Guard = `12/08 CTV Nguyễn Hoàng Duy tạo submission` / `12/08 HR xác nhận nhận hồ sơ` / `15/08 Vendor Bắc Việt nộp lại hồ sơ`; kết luận `Chặn nhận nguồn mới đến hết 18/08`; lý do `Claim CTV đang trong cửa sổ bảo vệ 7 ngày`; badge `Nguồn đang được bảo vệ · còn 3 ngày`. Transfer preview: `ACTIVE → TRANSFERRED, kết thúc 15/08/2026 06:00` / `PLANNED → ACTIVE, bắt đầu 15/08/2026 06:00` / quota cũ −1, mới +1 / lý do chuyển bắt buộc.

**Quy tắc PII:** SĐT mask `09•• ••• 482`, CCCD mask `001•••••418`; không CCCD đầy đủ, không số tài khoản ngân hàng, không lương trên card; tên công ty/người đều hư cấu (DEC-14).

### 4.5 Frame inventory và naming

Frame inventory (PDD §8.1) — medium HTML theo DEC-27: mỗi frame = 1 file `mockup/<tên frame>.html`; "page" = nhóm hiển thị trong `mockup/index.html` (bản đồ frame):

| Page | Frames | Nội dung |
|---|---|---|
| 00 — Cover & Demo Narrative | `F00_Cover`, `F00A_DemoNarrative` | Cover + timeline 13 phút, 4 aha moments, 3 khoảnh khắc bắt buộc (PDD §1.4) |
| 01 — Foundations | `F01_Tokens`, `F01_TypeSpacing`, `F01_StatusLanguage`, `F01_Density_Variant_44_52` | Tokens `DESIGN.md` canonical G27 (DEC-26), typography §2.3 + font Be Vietnam Pro/Inter, status §2.4, 2 variant density (D02) |
| 02 — Components | `F02_ComponentSet` | Bộ PDD §8.2 (AppShell, SidebarItem, Breadcrumb, Button, StatusBadge, FilterChip, SegmentedControl, SearchField, WorkerCard ×5, DataTable, SummaryBandMetric, RightDrawer, ConfirmationDialog, EmptyState, Skeleton, TimelineEvent, EvidenceAttachment, AuditMeta) |
| 10 — Control Tower | `S01_ControlTower_Default_1440`, `S01_ControlTower_Loading`, `S01_ControlTower_EmptyQueue`, `S01_ControlTower_StaleBanner` | Wireframe PDD §3.2; KPI strip 4 số phẳng; queue 4 mục (An Phát thiếu 3 → An Phát 7 ngoại lệ → Bắc Việt phản hồi còn 2 ngày → 2 hồ sơ nguồn cần review); line chart 8 tuần + bar fill rate; project table 3 dòng + 2 dòng ẩn "..." |
| 20 — Staffing & Talent Pool | `S02_Staffing_Default_1440`, `S02_Staffing_NoResult`, `S02A_AssignmentConflict_Drawer`, `S02A_TransferPreview`, `S02B_ReferralGuard_Drawer_Protected`, `S02B_ReferralGuard_Expired`, `S02B_ReferralGuard_OverrideRequested`, `S02_CardBlocked` | Header `47/50 ACTIVE · Thiếu 3` + badge 7 ngoại lệ; filter giữ context; 12 card; drawer Nam (Xem assignment / Chuyển dự án); drawer Huy (timeline + kết luận + Giữ nguồn hiện tại / Yêu cầu override); card Tuấn BLOCKED |
| 30 — Attendance Workbench | `S03_Attendance_Exceptions`, `S03_ResolveDrawer`, `S03_Attendance_Resolved`, `S03B_LockConfirmation`, `S03_Attendance_Locked_ReadOnly`, `S03_ImportProgress`, `S03_ImportFailed` | Bảng 7 exception (blocker trước), sticky header + 3 cột đầu, bulk bar, readiness; drawer 3 band (raw source / suggested match / result preview); lock dialog PDD §5.6; failed import có retry + error report |
| 40 — Reconciliation & Vendor Preview | `S04_Reconciliation_Internal`, `S04_MarginComparison`, `S04A_Lineage_Drawer`, `S04B_VendorPreview_Sent`, `S04B_VendorPreview_DisputeForm`, `S04_VendorDisputed`, `S04_ConfirmedLocked`, `S04_RevisionV2`, `S04_EmptyPayment` | Summary band 3 số; 2 tab vendor/client; bảng 3 dòng hiện + "44 dòng khác"; lineage Long; vendor preview ẩn client/margin/salary + CTA Xác nhận/Phản đối; không giả lập PAID |
| 50 — Prototype Flow & Bộ mặt công cộng | `F50_HotspotMap`, `S05_JobBoard_Public_1440` | 11 hotspot PDD §8.3 + bản đồ back-path; S05: 1 frame tĩnh hi-fi trang tìm việc công cộng (DEC-25/RQ-13) — không wire, không flow |
| 60 — BoD Decision Variants | `F60_D01` … `F60_D08`, `F60_D09_D12_Notes` | Variant D01–D08 để BoD chọn (DEC-03…DEC-10); D09–D12 ghi chú owner + due |
| 90 — Archive | `F90_Archive` | Các bản bỏ đi |

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-07`, `RQ-09` | `mockup/`: `index.html` bản đồ 10 nhóm + `_assets/hrp.css` (tokens + app shell master) + `F00_Cover` + `F01_*` foundations | Tạo cấu trúc file HTML (DEC-27), app shell (top bar 56px/sidebar 232px/gutter 24px/radius 6px), tokens `stitch/warm_professionalism/DESIGN.md` canonical G27 (DEC-26), frame naming convention | PDD §2, §8.1, DEC-26, DEC-27 | Mở `index.html`: đủ 10 nhóm, shell đúng grid, tokens đúng DESIGN.md canonical | Dừng khi đã có shell + tokens; chưa vẽ nội dung màn — không vẽ trước khi chốt xong bố cục |
| `STEP-02` | `RQ-01`, `RQ-02`, `RQ-03`, `RQ-04`, `RQ-07` | Low-fi `S01_*`, `S02_*`, `S02A_*`, `S02B_*` | Wireframe Control Tower (KPI/queue/charts/table) + Staffing (12 card, filter) + 2 rule drawers (guided transfer + Referral Guard) theo §4.4 | D01, D03, D04, D05 (dùng prototype assumption) | Đối chiếu wireframe PDD §3.2/§4.2/§4.4/§4.5; mọi con số khớp §4.4 | Dừng nếu BoD feedback làm đổi D04/D06 — dùng assumption hiện tại, không tự đổi; ghi Decision Log |
| `STEP-03` | `RQ-01`, `RQ-02`, `RQ-05`, `RQ-06`, `RQ-07` | Low-fi `S03_*`, `S04_*`, `S04A_*`, `S04B_*` | Wireframe Attendance (bảng 7 exception, resolve drawer, lock dialog) + Reconciliation (2 tab, summary band, lineage, vendor preview, dispute) theo §4.4 | D06, D07, D08, D09 | Đối chiếu PDD §5.2/§6.2/§6.4/§6.5; taxonomy 7/7 đúng 1 lần; totals cộng đúng | Dừng nếu thiếu thông tin nghiệp vụ làm đổi flow — không tự bịa flow ngoài PDD |
| `STEP-04` | `RQ-12` | `docs/tasks/hrp-v4-bod-mockup/HANDOFF.md` (round 1) + export low-fi | Executor ghi HANDOFF theo template, export frame đủ 4 màn low-fi (PDF/browser print), đánh dấu READY_FOR_AUDIT; Tier 3 append `AUDIT.md` round 1 (flow, hierarchy, nghiệp vụ, số liệu) | STEP-02, STEP-03 hoàn thành | HANDOFF đúng template; AUDIT.md tồn tại với các AUD-xxx | Dừng: không sửa frame trực tiếp theo finding — chờ Planner Resolution trong TASK (Tier 1 trả lời từng AUD-xxx) |
| `STEP-05` | `RQ-07`, `RQ-08`, `RQ-09` | Foundations + components + high-fi `S01_*`, `S02_*`, `S02A_*`, `S02B_*` | Dựng component set PDD §8.2 (CSS class dùng chung, variants, semantic naming, không inline override — DEC-27); high-fi Control Tower + Staffing + 2 drawers | STEP-04 audit findings đã được Planner resolve | Component có variants đủ trạng thái; frame high-fi khớp low-fi đã audit | Dừng nếu audit round 1 còn finding chặn high-fi chưa được resolve |
| `STEP-06` | `RQ-02`, `RQ-08`, `RQ-10` | High-fi `S03_*`, `S04_*` + toàn bộ states + prototype hotspots | High-fi Attendance/Reconciliation; vẽ đủ loading/empty/error/locked/dispute/revision states; wire 11 hotspot PDD §8.3 + back-path (drawer có đóng/Hủy, breadcrumb quay về) | STEP-05 hoàn thành | Chạy thử từng hotspot đúng đích; mọi state có frame; không state nào thiếu | Dừng nếu hotspot không thể wire vì thiếu frame — bổ sung frame, không bỏ hotspot |
| `STEP-07` | `RQ-12` | `HANDOFF.md` (round 2) + export high-fi/prototype v1 | Figma Owner cập nhật HANDOFF round 2; Tier 3 audit round 2 (viewport 1366×768, accessibility, totals, timing) | STEP-06 hoàn thành | HANDOFF round 2 đúng template; AUDIT.md round 2 có verdict từng AC | Dừng: không tự close finding; Planner Resolution trước khi sang BoD |
| `STEP-08` | `RQ-01`, `RQ-10`, `RQ-11` | Dry-run, BoD package, freeze Mockup Baseline | 2 lần dry-run với presenter (≤15 phút), PDF/frame export dự phòng đúng thứ tự demo, trang 60 variant D01–D08 hoàn chỉnh, Decision Log D01–D12 có owner+due; sau BoD: cập nhật frame theo quyết định, freeze Mockup Baseline v1 sau khi PM đánh dấu Approved | STEP-07 PASS | 2 dry-run đều ≤15 phút; Decision Log đủ 12 dòng; baseline freeze có sign-off PM | Dừng: không freeze baseline trước khi PM/BoD nghiệm thu; variant không chọn vào Archive |
| `STEP-09` | `RQ-13` | `S05_JobBoard_Public_1440` — 1 frame tĩnh hi-fi bộ mặt công cộng | Dựng frame tĩnh trang tìm việc công cộng: header công cộng (logo HRP + nút Đăng nhập/Đăng ký), filter minh họa (địa điểm/ca), 3 job card từ §4.4 (An Phát `Cần 50 · Đã nhận 47 · Còn 3`, Yên Phong `80/80`, Sao Việt `35/32` — tên hư cấu), nút `Ứng tuyển` trên mỗi card; dùng tokens F01, không có sidebar quản trị; **không wire hotspot, không dựng flow apply** | STEP-05 (tokens/components đã có); DEC-25 | Frame hiển thị đúng dữ liệu §4.4; watermark `DỮ LIỆU MINH HỌA`; không PII; nút `Ứng tuyển` không bị che ở 1366×768; không xuất hiện trong hotspot map | Dừng: chỉ đúng 1 frame — không dựng thêm trang công cộng, không flow apply/đăng ký (A-05 thuộc Wave 3) |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01`, `RQ-03` | 4 màn kể một scenario liên tục; 50/47/3, 7 exceptions, 3 tổng tài chính giống hệt nhau ở mọi frame xuất hiện; click từ KPI/queue mở đúng destination giữ context | Manual walkthrough theo click-path PDD §1.3 | Prototype chạy được + bảng đối chiếu frame↔số | Yes |
| `AC-02` | `RQ-01`, `RQ-06`, `RQ-07` | Mọi validation rule §4.4 đúng: `914.820.000 − 728.460.000 = 186.360.000` (20,37%); dòng Long 13.108.000/16.272.000/3.164.000; Khánh 12.064.000/14.976.000; Mai 5.568.000/6.912.000; `426,5+48,0+16,0=490,5`; `1.222−1.215=7` | Cộng tay + kiểm tra từng frame | Bảng số liệu export từ frame vs §4.4 | Yes |
| `AC-03` | `RQ-07` | Worker/project/vendor/period ID không đổi giữa frame; tiền `vi-VN` nguyên đồng; giờ dấu phẩy; watermark `DỮ LIỆU MINH HỌA` trên top bar; không PII thật (SĐT/CCCD mask, không bank/lương trên card) | Visual check toàn bộ frame export | Screenshot top bar + card mẫu + bảng tài chính | Yes |
| `AC-04` | `RQ-02` | Không có frame Payroll/TNCN/BHXH/Worker Portal/CRM pipeline trong flow chính; không feature nào ngoài §4.5 | Kiểm tra page tree + prototype flow | Danh sách frame so với §4.5 | Yes |
| `AC-05` | `RQ-04`, `RQ-05` | Talent Pool dùng card; attendance và reconciliation dùng table | Visual check | Screenshot S02/S03/S04 | Yes |
| `AC-06` | `RQ-04` | Vi phạm 1-ACTIVE hiện drawer guided (Xem assignment hiện tại / Chuyển dự án), không phải toast lỗi; transfer preview hiện đóng cũ + mở mới + quota ±1 + lý do bắt buộc | Manual click S02A | Screenshot drawer + preview state | Yes |
| `AC-07` | `RQ-04` | Referral Guard drawer có timeline 3 sự kiện đúng ngày (12/08, 12/08, 15/08), kết luận + lý do, remaining window "còn 3 ngày", override path chỉ hiện khi có permission + form lý do/bằng chứng | Manual click S02B | Screenshot drawer protected + override requested | Yes |
| `AC-08` | `RQ-05` | Exception → resolve → readiness 5/7→7/7 → Duyệt kỳ (maker Lê Thu Hà + checker Nguyễn Thanh Huyền hiển thị) → lock dialog (1.222 raw · 0 blocker · 7 đã xử lý · 9.624h · 490,5h OT) → locked read-only | Manual click-path 06:20–08:30 | Screenshot 3 state S03 + dialog | Yes |
| `AC-09` | `RQ-05` | 7 mã taxonomy hiện đúng 1 lần mỗi mã; blocker = UNMATCHED_EMPLOYEE + SOURCE_CONFLICT (+ WRONG_PROJECT); 2 row "chưa map" = AP-QM-1048 + AP-QM-1128 | Đối chiếu bảng S03 với §4.4 | Screenshot bảng exception | Yes |
| `AC-10` | `RQ-09` | 1366×768 không che primary CTA/totals/table action bar; 1440×900 là frame trình chiếu chính; badge có icon+text không màu-only; không nested card, không gradient trang trí, không emoji icon, không heading hero-scale | Kiểm tra từng frame ở 2 viewport | Screenshot 1366×768 cho 4 màn + drawer chính | Yes |
| `AC-11` | `RQ-06`, `RQ-08` | Đủ states §4.5: loading, empty queue, no result, stale banner, locked, failed import, dispute, revision V2, empty payment, no-result filter | Kiểm tra page tree | Frame inventory đủ danh sách §4.5 | Yes |
| `AC-12` | `RQ-10` | 11 hotspot PDD §8.3 chạy đúng đích và có back-path; 2 lần dry-run hoàn thành ≤15 phút | Dry-run thật với presenter | Video/log 2 dry-run + bản đồ hotspot | Yes |
| `AC-13` | `RQ-11` | Trang 60 có variant D01–D08; Decision Log D01–D12 có owner + due; D09–D12 có ghi chú deferred | Xem trang 60 + Decision Log | Screenshot trang 60 + file Decision Log | Yes |
| `AC-14` | `RQ-12` | HANDOFF.md round 1 và round 2 theo template; mọi AUD finding có Planner Resolution trong TASK §9 trước khi bước tiếp | Đọc HANDOFF + AUDIT + TASK §9 | Link 3 file + bảng resolution | Yes |
| `AC-15` | `RQ-13` | S05 tồn tại: đúng 1 frame tĩnh hi-fi `S05_JobBoard_Public_1440`; header công cộng có logo + nút Đăng nhập/Đăng ký; 3 job card đúng số liệu §4.4 (An Phát 50/47, Yên Phong 80/80, Sao Việt 35/32); nút `Ứng tuyển` hiển thị trên mỗi card và không bị che ở 1366×768; watermark `DỮ LIỆU MINH HỌA`; không PII; không có hotspot trỏ vào/ra S05 | Visual check + đối chiếu §4.4 | Screenshot S05 + page tree | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-01` | `STEP-03` | `AC-02` |
| `RQ-02` | `STEP-02` | `AC-04` |
| `RQ-02` | `STEP-03` | `AC-04` |
| `RQ-02` | `STEP-06` | `AC-04` |
| `RQ-03` | `STEP-02` | `AC-01` |
| `RQ-04` | `STEP-02` | `AC-05` |
| `RQ-04` | `STEP-02` | `AC-06` |
| `RQ-04` | `STEP-02` | `AC-07` |
| `RQ-05` | `STEP-03` | `AC-05` |
| `RQ-05` | `STEP-03` | `AC-08` |
| `RQ-05` | `STEP-03` | `AC-09` |
| `RQ-06` | `STEP-03` | `AC-02` |
| `RQ-06` | `STEP-03` | `AC-11` |
| `RQ-07` | `STEP-01` | `AC-03` |
| `RQ-07` | `STEP-03` | `AC-02` |
| `RQ-08` | `STEP-06` | `AC-11` |
| `RQ-09` | `STEP-01` | `AC-10` |
| `RQ-09` | `STEP-05` | `AC-10` |
| `RQ-10` | `STEP-06` | `AC-12` |
| `RQ-10` | `STEP-08` | `AC-12` |
| `RQ-11` | `STEP-08` | `AC-13` |
| `RQ-12` | `STEP-04` | `AC-14` |
| `RQ-12` | `STEP-07` | `AC-14` |
| `RQ-13` | `STEP-09` | `AC-15` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | BoD chọn ngược lại D01–D08 sau khi high-fi xong | Buổi BoD ra quyết định khác recommendation | Variant trang 60 dựng sẵn; chỉ D01–D08 bắt buộc chốt sớm; component giữ semantic để đổi variant nhanh | Vẽ lại frame bị ảnh hưởng theo Decision Log; tăng Spec version; re-audit phần đổi |
| `RISK-02` | Số liệu lệch giữa các frame | Designer tự chỉnh số cho "đẹp" | Data dictionary §4.4 là nguồn duy nhất; audit round kiểm tra totals bằng cộng tay; AC-02 blocking | Sửa theo §4.4, không theo frame khác; re-audit |
| `RISK-03` | Demo vượt 15 phút | Presenter kể lạc đề hoặc hotspot vòng vèo | Click-path PDD §1.3 + 2 dry-run; 3 khoảnh khắc bắt buộc §1.4 là tập cắt tối thiểu | Rút về 7-phút version: Guided Transfer + Exception→Lock + Dual Reconciliation; PDF backup đúng thứ tự |
| `RISK-04` | Figma prototype hoặc mạng lỗi giữa buổi họp | Lỗi kết nối/trình chiếu | PDF/frame export dự phòng theo đúng thứ tự demo; present từ frame tĩnh nếu prototype chết | Chuyển sang PDF; demo vẫn đủ 4 aha moments |
| `RISK-05` | Designer detach component làm frame lệch nhau | Tiến độ gấp, chỉnh từng frame | Quy tắc không detach trong §4.3; audit check component instance | Re-attach từ component set; không chấp nhận detach trong baseline |
| `RISK-06` | PII/brand thật lọt vào frame | Copy dữ liệu thật cho "thực tế hơn" | Quy tắc mask + tên hư cấu §4.4 (DEC-14); audit round kiểm tra PII | Thay bằng dữ liệu hư cấu ngay; re-export toàn bộ frame liên quan |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | None — không còn câu hỏi mở làm đổi contract. Mọi mâu thuẫn nguồn đã được Planner xử lý bằng DEC-15…DEC-20; D01–D12 là prototype assumption có variant trang 60 | — | — | Không |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | `AUD-001` | ACCEPT — sửa 3 chỗ (S04 kpi-sub + stmt-head client, S04A kpi-sub) thành `Điện tử An Phát · CL-0018` | Canonical §4.4: CL-0018 = client chính dự án An Phát; CL-0021 = Đông Dương thuộc Yên Phong (S04_MarginComparison đã đúng). Lỗi gán ID khi dựng S04 | Không đổi contract — frame sai, contract đúng | Tier 1 — đã xử lý 15/08 |
| 1 | `AUD-002` | ACCEPT — sửa F01_Density_Variant_44_52 (2 tfoot) + TASK §4.5 "43"→"44" | 47−3=44, đúng tinh thần v1.4 nhưng áp thiếu 2 chỗ | §4.5 sửa text; executor sửa frame | Tier 1 — đã xử lý 15/08 |
| 1 | `AUD-003` | ACCEPT — chốt radius scale canonical G27 **8/16/24** (bỏ 6/10/14 tạm); sửa RQ-09 "radius 6px"→"8/16/24"; sửa F01_Tokens chip + F01_TypeSpacing "gutter 20 (DESIGN.md)"→"gutter 24 (PDD §2.1)" | DESIGN.md G27 canonical (chuẩn 8px, container 16/24); DEC-26 đã chọn G27 làm nguồn tokens; hrp.css đang 6/10/14 lệch cả G27 lẫn PDD. Gutter thực tế 24 (DEC-26 giữ PDD §2.1) | DEC-28 + RQ-09; executor sửa hrp.css 3 dòng + 2 frame | Tier 1 — đã xử lý 15/08 |
| 1 | `AUD-004` | ACCEPT_RISK round 1 — không chặn low-fi; STEP-05 thêm pass cleanup: đưa `position:relative` vào `.icon-btn` trong hrp.css, thêm class `.tbl-sub-block`, chuyển hết inline có thể; inline data-width (readiness %, space-bar height, type-sample font) giữ là dữ liệu minh họa | P3 — inline hiện không phá token (không override màu/cỡ); sửa đồng loạt trước hi-fi rẻ hơn | STEP-05 bổ sung cleanup; re-audit round 2 xác nhận | Tier 1 — STEP-05 |
| 1 | `AUD-005` | ACCEPT — sắp lại 5 dòng không-blocker theo **ngày/mã NV** (PDD §5.3: blocker trước, sau đó ngày/mã NV): 05/08, 10/08, 11/08, 13/08, 14/08; áp cùng thứ tự cho S03_Attendance_Resolved và nền S03_ResolveDrawer (3 dòng đầu) | Foot text đúng contract nhưng thứ tự dòng thật đang theo taxonomy — lỗi executor khi dựng | Không đổi contract — frame sai | Tier 1 — đã xử lý 15/08 |
| 1 | `AUD-006` | ACCEPT — sửa note S04A mô tả đúng nền thật: 2 dòng đầu (Long, Khánh), các dòng sau bị cắt để gọn file | Pattern truncated đã chốt ở BLK-02 (HANDOFF §5); note phải mô tả đúng nội dung thật, không được hứa "như S04 default" trong khi chỉ có 2 dòng | Không đổi contract — sửa text frame | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-007` | ACCEPT — sửa hrp.css `.state-panel` z-index 45 → 60 (tier dialog, nổi trên scrim 50) | AUD đúng: scrim 50 đè state-card 45 — mâu thuẫn note "chỉ nền bên dưới bị mờ"; state-card phải nổi trên scrim | Không đổi contract — sửa CSS | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-008` | ACCEPT — thêm link quay lại vào note của 4 state in-place: S01_StaleBanner, S04_ConfirmedLocked, S04_RevisionV2, S04_EmptyPayment | Pattern AC-11: mọi state có back-path về frame gốc; 4 frame thiếu | Không đổi contract — sửa frame | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-009` | ACCEPT_RISK — giữ G27 canonical (text #FFF trên primary #F26522 = 3,17:1 < AA 4,5:1); ghi DEC-29 | #F26522 là màu thương hiệu founder chốt (DEC-26); đổi màu text hoặc nền primary làm lệch toàn bộ hệ token; mockup BoD nội bộ không phải production UI — khi build thật sẽ chọn variant đạt AA (primary-dark #A63B00 đã có sẵn trong tokens) | DEC-29 — ghi nhận deviation, không đổi tokens | Tier 1 — chấp nhận 15/08 |
| 2 | `AUD-010` | ACCEPT — sửa label: S04_RevisionV2 vendor "Statement V1 · DRAFT"→"V2 · DRAFT", client "Invoice dự kiến V1 · DRAFT"→"V2 · DRAFT"; S04_ConfirmedLocked vendor "V1 · DRAFT"→"V1 · CONFIRMED" | Label sai trạng thái — lỗi executor khi cp base sang state | Không đổi contract — sửa frame | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-011` | ACCEPT — nâng 11px→12px toàn bộ (7 chỗ hrp.css + .hm-step F50) | PDD §2.3 cấm font < 12px | Không đổi contract — sửa CSS | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-012` | ACCEPT_DEVIATION — sửa note S03 mô tả đúng: header sticky dọc; sticky 3 cột không áp dụng vì artboard scale-to-fit không tràn ngang | PDD §5.3 đòi header + 3 cột đầu sticky; medium HTML (DEC-27) scale toàn bộ artboard nên không bao giờ có scroll ngang trong bảng — sticky 3 cột vô nghĩa trong medium này; áp dụng khi build sản phẩm thật | Ghi deviation (medium limitation, không đổi PDD) | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-013` | ACCEPT — F50 "13 frame STATE"→"12" | Lỗi đếm executor; thực tế 12 state STEP-06 | Không đổi contract — sửa text | Tier 1 — đã xử lý 15/08 |
| 2 | `AUD-014` | ACCEPT_DEVIATION — S04_VendorDisputed scope đổi sang "Chọn dòng cụ thể" (1 dòng Long) theo kịch bản khóa §4.4; PDD §6.6 minh họa "2 line bị đánh dấu" | §4.4 canonical (đã audit round 1) chỉ có 1 claim (Long +2h OT 13/08); thêm dòng thứ 2 sẽ phá AC-02 (V2 chỉ điều chỉnh Long) hoặc bịa chi tiết ngoài contract | Ghi deviation: §4.4 thắng PDD §6.6 | Tier 1 — đã xử lý 15/08 |
| 3 | `AUD-015` | ACCEPT — sửa 2 chỗ 11px mới (`.meta span` F60_D09_D12_Notes; `.legend span` F80) → 12px | Tái phạm AUD-011 / PDD §2.3 ở frame mới STEP-08 — lỗi executor khi dựng | Không đổi contract — sửa frame | Tier 1 — đã xử lý 15/08 |
| 3 | `AUD-016` | ACCEPT — sửa F00A bước 04:10: "tạo claim 4 ngày trước" → "tạo claim ngày 12/08 — 3 ngày trước" | DEC-17: claim 12/08 = 3 ngày trước 15/08; F80 bước 6 đã đúng; lời dẫn cũ tự mâu thuẫn bước 04:50 cùng file | Không đổi contract — sửa text | Tier 1 — đã xử lý 15/08 |
| 3 | `AUD-017` | ACCEPT — gỡ inline `style="font-style:italic;"` thừa ở F80 bước 13:00 (class `.step-say` đã italic) | DEC-27/RISK-05 không inline override | Không đổi contract — sửa frame | Tier 1 — đã xử lý 15/08 |
| 3 | `AUD-018` | ACCEPT — thêm dòng "Prototype assumption — không phải quyết định final của BoD (PDD §10.2)" vào header F60_D09_D12_Notes | Đồng bộ cảnh báo giả định 8/8 frame F60_D01–D08 + D09–D12 | Không đổi contract — sửa frame | Tier 1 — đã xử lý 15/08 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-15` | Khởi tạo contract mockup BoD: scenario + D01–D12 prototype assumptions + canonical mock data + frame inventory + 8 STEP + 14 AC | `docs/design/TIER1_MOCKUP_DAY1_PROMPT.md`; PDD, HR, plan v4.14, data-scope-security.md, schema.prisma |
| `v1.1` | `2026-08-15` | Bổ sung bộ mặt công cộng theo **Q#23 (founder chốt):** job board công cộng kéo về Wave 1 sau M3; demo BoD thêm 1 frame tĩnh `S05_JobBoard_Public_1440` (không flow). Thêm EV-14, DEC-25, RQ-13, STEP-09, AC-15, traceability RQ-13→STEP-09→AC-15; cập nhật RQ-02, §1, §4.2, §4.4, §4.5 | plan v4.15 (Q#23); quyết định founder 15/08/2026 |
| `v1.2` | `2026-08-15` | **Khởi động task (Status → IN_PROGRESS)** theo lệnh founder "KHỞI ĐỘNG TASK MOCKUP". Áp design system canonical G27: thêm DEC-26 (tokens `DESIGN.md` "Warm Professionalism" thay palette tạm PDD §2.2 — primary `#F26522`, hover/dark `#A63B00`, Be Vietnam Pro + Inter); cập nhật RQ-09, STEP-01, §4.5 F01; baseline plan v4.14 → v4.20 | plan v4.19 §13 (G27), v4.20 (G28); lệnh founder 15/08/2026 |
| `v1.3` | `2026-08-15` | **Ủy quyền phần Figma cho Planner + ui-ux-pro-max (DEC-27):** founder chỉ định dùng skill `ui-ux-pro-max` thay sếp làm phần Figma; môi trường executor không có Figma MCP → medium chuyển sang HTML/CSS prototype (mỗi frame §4.5 = 1 file `mockup/<tên frame>.html`, `index.html` = bản đồ 10 nhóm, hotspot = link giữa file, export dự phòng = browser print). Executor cập nhật; §1 non-goal, §4.2, §4.3 Interface, §4.5, STEP-01/04/05 điều chỉnh theo DEC-27 | Lệnh founder 15/08/2026 ("dùng ui-ux pro max … nguyên tắc trong stitch"); SKILL.md ui-ux-pro-max |
| `v1.4` | `2026-08-15` | **Sửa lỗi số học §4.4:** dòng ẩn gộp bảng S04 là 44 (47 workers − 3 hiển thị), không phải 43 — AC-02 sẽ cộng tay, text cũ lệch số workers | AC-02; data dict §4.4 |
| `v1.5` | `2026-08-15` | **STEP-04:** Status → `READY_FOR_AUDIT`; HANDOFF.md round 1 ghi theo template `.ai-pipeline/templates/HANDOFF.template.md` (Execution Trace STEP-01/02/03, AC evidence low-fi, 6 BLK/Deviation); chờ Tier 3 append AUDIT.md | TASK §5 STEP-04; AC-14 |
| `v1.6` | `2026-08-15` | **Planner Resolution audit round 1 (verdict CONDITIONAL):** AUD-001 sửa client An Phát → `Điện tử An Phát · CL-0018` (S04×2 + S04A); AUD-002 sửa nốt "43"→"44" (F01_Density + §4.5); AUD-003 chốt radius G27 8/16/24 (DEC-28, RQ-09, hrp.css, F01_Tokens, F01_TypeSpacing); AUD-004 inline → pass cleanup STEP-05 (ACCEPT_RISK); AUD-005 sắp lại bảng S03 theo ngày/mã NV (PDD §5.3 — S03, S03_Resolved, nền S03_ResolveDrawer); AUD-006 sửa note S04A mô tả đúng nền truncated | AUDIT.md round 1 (Tier 3, 15/08/2026) |
| `v1.7` | `2026-08-15` | **STEP-05/06 hoàn tất:** hi-fi toàn bộ frame (gỡ `.wf`, radius G27 8/16/24); `F02_ComponentSet` (17 component PDD §8.2); `F50_HotspotMap` (11 hotspot + back-path, deviation Long/Nam ghi rõ); 12 state frame §4.5 (badge STATE + note STEP-06 + back-link); wire 11 hotspot + back-path (S04B thêm "Về HRP"; sidebar Dự án S03 → S02); index.html 14 dòng done; link-check 36 frame ALL OK. Status giữ `READY_FOR_AUDIT` (round 2) | TASK §5 STEP-05/06; AC-10/AC-11 |
| `v1.8` | `2026-08-15` | **Planner Resolution audit round 2 (verdict CONDITIONAL):** AUD-007 z-index state-panel 45→60; AUD-008 thêm back-link 4 state in-place; AUD-009 ACCEPT_RISK contrast AA (DEC-29 — giữ G27 #FFF/#F26522); AUD-010 sửa label V2/CONFIRMED; AUD-011 11px→12px toàn bộ; AUD-012 deviation sticky 3 cột (medium scale-to-fit); AUD-013 F50 "13"→"12"; AUD-014 deviation dispute 1 dòng theo §4.4 (PDD §6.6 minh họa 2 dòng) | AUDIT.md round 2 (Tier 3, 15/08/2026) |
| `v1.9` | `2026-08-15` | **STEP-08 (phần tự chủ — chuẩn bị demo BoD):** (1) Trang 60 đủ `F60_D01`…`F60_D08` + `F60_D09_D12_Notes` — mỗi D01–D08 có variant A/B + recommendation (assumption đang demo) + mức chặn nếu BoD chọn khác; D09–D12 deferred có owner+due. (2) `DECISION_LOG.md` D01–D12 (recommendation, variants, owner, due, mức chặn; checklist sau buổi họp: chốt chọn, Archive trang 90, freeze chỉ sau ký). (3) `F80_DemoExport.html` — 16 bước đúng thứ tự F00A lồng iframe + 3 khoảnh khắc bắt buộc tô cam + print CSS từng trang; `F80_DemoExport.pdf` (browser print — Chrome headless, DEC-27). (4) mockup/index.html: nhóm 60 done + nhóm 80 mới. Chưa xong: 2 dry-run ≤15 phút cần founder làm presenter (AC-12 evidence video/log); freeze chờ PM/BoD ký (không freeze sớm) | STEP-08; RQ-11; AC-12/AC-13; DEC-27; RISK-03 |
| `v1.10` | `2026-08-15` | **Planner Resolution audit round 3 (verdict CONDITIONAL):** AUD-015 sửa 11px→12px (F60_D09_D12_Notes `.meta span`, F80 `.legend span`); AUD-016 F00A 04:10 "claim 4 ngày trước"→"claim 12/08 — 3 ngày trước" (DEC-17); AUD-017 gỡ inline italic thừa F80 bước 13:00; AUD-018 thêm dòng prototype assumption vào header F60_D09_D12_Notes. Ngoài ra: **STEP-09 hoàn tất** — `S05_JobBoard_Public_1440` (1 frame tĩnh công cộng: header logo + Đăng nhập/Đăng ký, không sidebar quản trị; filter minh họa địa điểm/ca; 3 card DA-2026-018 `50/47`, DA-2026-022 `80/80`, PRJ-SV-014 `35/32` + nút Ứng tuyển; watermark; không PII; không hotspot — RQ-13/AC-15) | AUDIT.md round 3 (Tier 3, 15/08/2026); STEP-09 |
| `v1.11` | `2026-08-16` | **Roadmap Alignment — D13–D16 chốt (§11):** founder duyệt toàn bộ kiến nghị Planner về `docs/MODULE_TACH_V2.md` + `docs/PHASE_KHOAHOC_V1.md` — D13 backbone invariant-phase + monorepo Phương án A; D14 freeze Mockup Baseline = trigger Phase 0; D15 rào /bcc JWT tuần đầu Phase 1; D16 chốt hạ tầng load test/outbox trước Phase 4. Ghi vào DECISION_LOG.md 0.2 | Lệnh founder 16/08/2026 ("ok duyệt hết"); DECISION_LOG D13–D16 |

## 11. Roadmap Alignment — D13–D16 (chốt 16/08/2026)

Founder duyệt toàn bộ kiến nghị Planner về `docs/MODULE_TACH_V2.md` + `docs/PHASE_KHOAHOC_V1.md`. Chi tiết đầy đủ (owner, due, trạng thái) tại `DECISION_LOG.md`:

- **D13 — Backbone:** chia phase theo invariant (PHASE_KHOAHOC_V1 §3: 0 Foundation → 1 Identity → 2 Scope → 3 Integrity → 4 Vertical Slices → 5 UAT, sau đó P1–P3) + Phương án A vertical-slice monorepo (3 sub-package đầu: money, payroll-core, job-board). Không microservice.
- **D14 — Trigger Phase 0:** **freeze Mockup Baseline v1** (sau PM/BoD ký) = điểm kết thúc task này + khởi động Phase 0 Foundation.
- **D15 — An ninh:** rào /bcc bằng JWT tối giản vào tuần đầu Phase 1 (dữ liệu thật đang chạy public).
- **D16 — Hạ tầng:** chốt dứt điểm trước Phase 4 — nâng Vercel/Neon hoặc thu nhỏ tiêu chí load test + outbox theo Hobby (khuyến nghị Planner: in-process drain + cron daily lưới an toàn).

Điều chỉnh kỹ thuật kèm theo (đã duyệt): `BYPASS_RLS` chỉ dev local (guard `NODE_ENV`); workspaces `packages/*` phải cập nhật `vercel.json` buildCommand (Phase 0 DoD); `prisma/migrations/` đưa vào git ở Phase 0; đóng băng contract bảng appBCC ↔ web trong Phase 0 (R-21); re-scale burndown theo AI throughput thực đo sau Phase 0.
