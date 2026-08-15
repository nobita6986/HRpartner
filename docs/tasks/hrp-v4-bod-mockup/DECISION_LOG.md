# Decision Log — HRP v4 BoD Mockup (D01–D12)

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

## Cập nhật sau buổi BoD

- [ ] Ghi kết quả chọn cho từng D01–D08 (dòng bảng trên + trang 60)
- [ ] Variant không chọn → Archive (trang 90) kèm lý do 1 dòng
- [ ] D09–D12: chốt owner + due thật (hiện là đề xuất)
- [ ] PM/BoD ký xác nhận → freeze Mockup Baseline v1

## Revision Log

| Ver | Ngày | Thay đổi |
|-----|------|----------|
| 0.1 | 2026-08-15 | Khởi tạo — D01–D12 theo DEC-03…DEC-14, owner + due đề xuất |
