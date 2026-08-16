# Decision Log — HRP v4 BoD Mockup (D01–D16)

> Task: hrp-v4-bod-mockup · Trang 60 — BoD Decision Variants
> Trạng thái: **Chờ buổi BoD** — mọi recommendation hiện là *prototype assumption*, chưa phải quyết định final (PDD §10.2).
> **Freeze Mockup Baseline v1 chỉ thực hiện sau khi PM/BoD ký xác nhận — không freeze sớm.**
> Variant không được chọn sẽ vào Archive (trang 90) sau buổi họp.

## D01–D08 — Quyết định đưa lên buổi BoD

| ID | Quyết định | Recommendation (đang demo) | Variant | Áp dụng | Owner | Due | Mức chặn nếu đổi |
|----|------------|----------------------------|---------|---------|-------|-----|------------------|
| D01 | 4 KPI trên Control Tower (DEC-03) | **A — 4 KPI vận hành**: Workforce / Fill rate / Attendance / Statement; tài chính nằm ở project table | B — thêm KPI tài chính vào strip | S01 | Sếp (Giám đốc) | Buổi BoD | Vẽ lại KPI strip S01 low-fi |
| D02 | Mật độ bảng (DEC-04) | **A — Compact 44px** (default toàn mockup) | B — Comfortable 52px | Toàn bộ table | Sếp (Giám đốc) | Buổi BoD | Đổi 1 CSS token (đã chuẩn bị cả 2) |
| D03 | Talent Pool (DEC-05) | **A — Card grid 3 cột** | B — Dense list | S02 | Sếp (Giám đốc) | Buổi BoD | Dựng lại S02 high-fi theo list |
| D04 | 1-ACTIVE (DEC-06) | **A — Guided transfer drawer** (không error modal) | B — Error modal chặn | S02A | Sếp (Giám đốc) | Buổi BoD | Vẽ lại S02A low-fi theo block |
| D05 | Referral Guard override (DEC-07) | **A — HR_MANAGER + maker-checker**, nút theo permission | B — HR tự override | S02B | Sếp (Giám đốc) | Buổi BoD | Đổi nút + bỏ maker-checker ở S02B high-fi |
| D06 | Bước trước LOCK (DEC-08) | **A — Review → Approve → Lock** (maker-checker) | B — 2 bước Review → Lock | S03 | Sếp (Giám đốc) | Buổi BoD | Rút gọn flow S03/S03B low-fi |
| D07 | Blocker tuyệt đối (DEC-09) | **A — 3 blocker**: UNMATCHED_EMPLOYEE + SOURCE_CONFLICT + WRONG_PROJECT | B — 2 blocker (WRONG_PROJECT = warning) | S03 | Sếp (Giám đốc) | Buổi BoD | Đổi điều kiện sáng nút Lock + badge S03 low-fi |
| D08 | Vendor thấy gì (DEC-10) | **A — rate + quantity + amount** (tái tính được tại chỗ) | B — chỉ giờ + amount | S04B | Sếp (Giám đốc) | Buổi BoD | Bỏ cột rate ở S04B high-fi |

## D09–D12 — Deferred (không chặn demo)

| ID | Quyết định | Ghi chú | Owner | Due | Trạng thái |
|----|------------|---------|-------|-----|------------|
| D09 | SLA vendor confirm đối soát (DEC-11) | 3 ngày làm việc (quá hạn = tự xác nhận + dispute sau). Cần sếp xác nhận đúng thực tế vận hành. | Sếp (Giám đốc) | Sau buổi BoD | Deferred |
| D10 | Ai thấy số margin (DEC-12) | Director + Accountant mặc định; PM theo permission. Chốt danh sách role. | PM | Sau buổi BoD | Deferred |
| D11 | Từ vựng rủi ro (DEC-13) | "Cần xem xét" / "Bị chặn" — không dùng màu sắc làm tín hiệu duy nhất. | Planner (design) | Sau buổi BoD | Deferred |
| D12 | Brand khách hàng (DEC-14) | Đang áp dụng: brand ẩn danh (An Phát, Yên Phong, Sao Việt là tên minh họa) + watermark DỮ LIỆU MINH HỌA. Thay brand thật khi vào client thật. | Sếp (Giám đốc) | Khi vào client thật | Áp dụng từ đầu |

## D13–D16 — Kiến trúc & Roadmap (chốt 16/08/2026)

Founder duyệt toàn bộ kiến nghị Planner (đối chiếu `docs/MODULE_TACH_V2.md` + `docs/PHASE_KHOAHOC_V1.md`):

| ID | Quyết định | Nội dung chốt | Owner | Due | Trạng thái |
|----|------------|---------------|-------|-----|------------|
| D13 | Backbone chia phase + cách tách module | Backbone = chia phase theo **invariant** (PHASE_KHOAHOC_V1 §3: 0 Foundation → 1 Identity → 2 Scope → 3 Integrity → 4 Vertical Slices → 5 UAT, sau đó P1–P3); cách tách = **Phương án A vertical-slice monorepo**, 3 sub-package đầu (money, payroll-core, job-board). Không microservice (hard rule). | Sếp (Giám đốc) | Chốt 16/08/2026 | CHỐT |
| D14 | Trigger khởi động Phase 0 | **Freeze Mockup Baseline v1** (sau PM/BoD ký) = điểm kết thúc task mockup + trigger Phase 0 Foundation. | Sếp (Giám đốc) | Chốt 16/08/2026 | CHỐT |
| D15 | Rào /bcc | JWT tối giản cho /bcc vào **tuần đầu Phase 1** — vì appBCC đang bơm dữ liệu thật (PII) vào Neon trong khi /bcc công khai không auth. Ưu tiên an ninh, trước cả khi permission-resolver đầy đủ. | Planner + AI coding | Tuần đầu Phase 1 | CHỐT |
| D16 | Hạ tầng load test + outbox | Chốt dứt điểm **TRƯỚC Phase 4**: (a) nâng plan Vercel/Neon, hoặc (b) thu nhỏ tiêu chí load test theo Hobby + outbox in-process drain (cron daily làm lưới an toàn). Khuyến nghị Planner: **(b)**. | Sếp (Giám đốc) | Trước khi khởi động Phase 4 | CHỐT |
| DEC-30 | Paths-based monorepo (điều chỉnh cách hiện thực D13) | Monorepo hiện thực bằng **tsconfig paths** (`@hrp/*` → `packages/*/src/index.ts`), **không dùng npm workspaces** — bằng chứng: `npm run build` local exit 0 + `/job-board` 200 production 16/08. Bổ sung workspaces khi package đầu tiên cần cài dependency riêng (ra DEC mới lúc đó). Phát sinh từ AUDIT Round 1 Phase 0 (AUD-001). | Planner | Chốt 16/08/2026 | CHỐT |
| DEC-32 | Job-board bổ sung **cột filter trái** (nâng cấp S05) | Sếp review demo `/job-board` 16/08: bổ sung **bảng filter cột trái** theo mẫu job portal (thay filter chips ngang trong S05 v1). Panel 240px, surface, radius-lg, 4 nhóm filter ánh xạ 1:1 với data 3 card canonical: **Địa điểm** (Tất cả/Bắc Ninh/Bắc Giang), **Ca làm** (HC/D1/D2/N1/T1), **Loại hình** (Nhà máy/Kho vận), **Trạng thái tuyển** (Tuyển gấp/Đang tuyển/Đã nhận đủ) + nút "Xóa bộ lọc". Mockup S05 cập nhật v2 (frame tĩnh — filter vẫn minh họa). Phase 0 triển khai filter **client-side hoạt động thật** trên data hardcode (không DB — query DB thật thuộc Phase 4 như AUD-003). | Sếp (Giám đốc) | Chốt 16/08/2026 | CHỐT |
| DEC-33 | Bộ công cụ diễn thuyết tiếng Việt cho mockup BoD | Sếp review toàn bộ mockup 16/08: "nhiều từ chuyên môn tiếng Anh quá, rất khó để tôi diễn thuyết và sếp theo dõi". Planner khảo sát: status text đã tiếng Việt (F01_StatusLanguage), phần khó là **nhãn module/KPI EN** (Control Tower, Fill rate, Reconciliation, Margin, Referral Guard...). Sếp chọn qua AskUserQuestion: **Phương án A — Glossary + Việt hóa lời thoại** (KHÔNG Việt hóa UI 30 frame — thuật ngữ EN là chuẩn ngành với khách DN, giữ production-like). Scope: (1) frame mới `F01B_Glossary` (≥15 thuật ngữ EN→VI + nghĩa 1 dòng + ví dụ, nhóm theo module); (2) F00A_DemoNarrative: 16 lời thoại có bản diễn đạt tiếng Việt dễ nói (không đổi click-path); (3) `PRESENTER_GUIDE.md` (thuật ngữ + mẹo ≤15 phút; glossary mở tham khảo, không tính vào giờ dry-run). | Sếp (Giám đốc) | Chốt 16/08/2026 | CHỐT |

### Danh sách thuật ngữ canonical — DEC-33 (chốt 16/08, bổ sung theo AUD-019)

Từ điển EN→VI chính thức cho mockup BoD — F01B_Glossary + PRESENTER_GUIDE.md PHẢI khớp 100% danh sách này:

| # | EN | VI | Nghĩa (1 dòng) | Ví dụ ngắn |
|---|----|----|----------------|------------|
| 1 | Control Tower | Trung tâm điều hành | Màn hình tổng quan KPI vận hành nhân sự | "Mở Trung tâm điều hành xem Fill rate toàn hệ" |
| 2 | Fill rate | Tỷ lệ lấp đầy | % chỗ đã có người trên tổng cần | 47/50 = 94% |
| 3 | Workforce | Lực lượng lao động | Tổng nhân sự đang hoạt động | "Hôm nay 124 người đang làm" |
| 4 | Staffing | Bố trí nhân sự | Ghép người vào đúng dự án, đúng ca | "Chuyển Long sang ca D1 An Phát" |
| 5 | Talent Pool | Kho ứng viên | Danh sách lao động sẵn sàng đi làm | "Kéo thêm 5 người từ kho ứng viên" |
| 6 | Referral Guard | Chốt chặn giới thiệu | Quy tắc chống gian lận khi giới thiệu người | "Người này đang hoạt động ở dự án khác → bị chặn" |
| 7 | Override | Ghi đè chặn | Người có quyền cho phép vượt quy tắc (có ghi lý do) | "HR Manager duyệt ghi đè vì đã xác minh" |
| 8 | Maker-checker | Người tạo – Người kiểm | Thao tác quan trọng cần 2 người xác nhận | "Bảng kê phải qua người tạo + người duyệt" |
| 9 | Attendance | Chuyên cần | Chấm công, bảng công theo ca | "Duyệt bất thường chuyên cần tháng 7" |
| 10 | Lock | Khóa chốt | Đóng băng số liệu kỳ công, không sửa thêm | "Đã khóa → chỉ xem, không sửa được" |
| 11 | Blocker | Yếu tố chặn | Lỗi dữ liệu chặn không cho khóa (3 loại: #12/13/14) | "Còn 3 yếu tố chặn → chưa khóa được" |
| 12 | UNMATCHED_EMPLOYEE | Nhân viên không khớp | Công thuộc về ai không xác định được | "Mã thẻ 12345 không có trong danh sách" |
| 13 | SOURCE_CONFLICT | Xung đột nguồn | Hai nguồn dữ liệu công mâu thuẫn nhau | "File import nói 8h, máy chấm công nói 7h" |
| 14 | WRONG_PROJECT | Sai dự án | Công ghi nhầm sang dự án khác | "Công của An Phát ghi nhầm vào Yên Phong" |
| 15 | Reconciliation | Đối soát | Đối chiếu công-lương giữa đơn vị cung ứng và khách hàng | "Tháng 7: đối soát 44 dòng công" |
| 16 | Statement | Bảng kê | Bảng kê công-lương gửi khách hàng xác nhận | "Gửi bảng kê cho khách duyệt trước ngày 5" |
| 17 | Margin | Biên lợi nhuận | Chênh lệch tiền thu khách và tiền trả đơn vị cung ứng | "Margin 18% dự án An Phát" |
| 18 | Payroll | Tính lương | Xử lý bảng lương theo kỳ | "Chạy tính lương kỳ tháng 7" |
| 19 | SLA | Cam kết dịch vụ | Hạn chót đơn vị cung ứng xác nhận đối soát | "3 ngày kể từ khi gửi bảng kê" |
| 20 | Vendor | Đơn vị cung ứng | Bên cung cấp lao động | "Xem danh sách các đơn vị cung ứng" |
| 21 | Client | Khách hàng | Nhà máy/kho thuê nhân sự | "Điện tử An Phát duyệt bảng kê" |

**Điều chỉnh kỹ thuật kèm theo** (Planner đã nêu, founder duyệt 16/08/2026):

- `BYPASS_RLS` env flag chỉ cho dev local — guard cứng `NODE_ENV !== 'production'` + assert lúc startup.
- Tách workspaces `packages/*` phải cập nhật `vercel.json` buildCommand — đưa vào Phase 0 DoD (tránh vỡ build). → **Đã điều chỉnh 16/08 bằng DEC-30**: paths-based, không dùng workspaces, `vercel.json` giữ nguyên.
- `prisma/migrations/` đưa vào git trong Phase 0 (hiện đang untracked).
- Phase 0 đóng băng **contract bảng appBCC ↔ web** (cột, format period, trạng thái) — xử lý R-21.
- Re-scale burndown theo **AI throughput thực đo sau Phase 0** (không tin con số 5-dev).

## Cập nhật sau buổi BoD

- [ ] Ghi kết quả chọn cho từng D01–D08 (dòng bảng trên + trang 60)
- [ ] Variant không chọn → Archive (trang 90) kèm lý do 1 dòng
- [ ] D09–D12: chốt owner + due thật (hiện là đề xuất)
- [ ] PM/BoD ký xác nhận → freeze Mockup Baseline v1

## Revision Log

| Ver | Ngày | Thay đổi |
|-----|------|----------|
| 0.1 | 2026-08-15 | Khởi tạo — D01–D12 theo DEC-03…DEC-14, owner + due đề xuất |
| 0.2 | 2026-08-16 | Thêm **D13–D16 — Kiến trúc & Roadmap** (backbone invariant-phase + monorepo Phương án A; trigger Phase 0 = freeze Mockup Baseline; rào /bcc JWT tuần đầu Phase 1; chốt hạ tầng load test/outbox trước Phase 4) — founder duyệt toàn bộ 16/08/2026 |
| 0.3 | 2026-08-16 | Thêm **DEC-30 — Paths-based monorepo** (điều chỉnh cách hiện thực D13 sau AUDIT Round 1 Phase 0: tsconfig paths thay npm workspaces, build local + Vercel xanh) |
| 0.4 | 2026-08-16 | Thêm **DEC-32 — Job-board cột filter trái** (lệnh sếp sau review demo): mockup `S05` cập nhật v2 (bỏ filter chips ngang, thêm panel filter trái 240px + 4 nhóm + nút xóa bộ lọc); Phase 0 triển khai filter client-side hoạt động thật trên data hardcode |
| 0.5 | 2026-08-16 | Thêm **DEC-33 — Bộ công cụ diễn thuyết tiếng Việt** (lệnh sếp: mockup nhiều thuật ngữ EN quá): Phương án A — `F01B_Glossary` (từ điển EN→VI) + lời thoại Việt trong F00A + `PRESENTER_GUIDE.md`; UI 30 frame giữ nguyên thuật ngữ EN chuẩn ngành |
| 0.6 | 2026-08-16 | Bổ sung **bảng 21 thuật ngữ canonical DEC-33** (sau AUD-019 — audit round 4): danh sách đầy đủ EN→VI + nghĩa + ví dụ ngắn, là chuẩn đối chiếu cho F01B + PRESENTER_GUIDE |
