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

**Điều chỉnh kỹ thuật kèm theo** (Planner đã nêu, founder duyệt 16/08/2026):

- `BYPASS_RLS` env flag chỉ cho dev local — guard cứng `NODE_ENV !== 'production'` + assert lúc startup.
- Tách workspaces `packages/*` phải cập nhật `vercel.json` buildCommand — đưa vào Phase 0 DoD (tránh vỡ build).
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
