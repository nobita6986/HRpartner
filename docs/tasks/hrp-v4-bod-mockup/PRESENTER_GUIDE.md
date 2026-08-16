# PRESENTER_GUIDE — Hướng dẫn diễn thuyết demo mockup BoD

> Task: `hrp-v4-bod-mockup` · Bộ công cụ diễn thuyết tiếng Việt theo **DEC-33** (lệnh founder 16/08/2026)
> Dùng kèm: `mockup/F00A_DemoNarrative.html` (click-path 16 bước + lời thoại Việt) · `mockup/F01B_Glossary.html` (từ điển thuật ngữ) · `mockup/F80_DemoExport.html` (bản dự phòng, 3 khoảnh khắc tô cam)
> UI 30 frame giữ nguyên thuật ngữ tiếng Anh chuẩn ngành — chỉ công cụ diễn thuyết được Việt hóa.

---

## 1. Bảng 21 thuật ngữ EN → VI (nguồn DEC-33, dùng nguyên, không thêm bớt nghĩa)

| Nhóm module | Thuật ngữ EN | Tiếng Việt | Nghĩa 1 dòng |
|---|---|---|---|
| Bảng điều hành (S01) | Control Tower | Trung tâm điều hành | màn hình tổng quan KPI vận hành nhân sự |
| Bảng điều hành (S01) | Fill rate | Tỷ lệ lấp đầy | % chỗ đã có người trên tổng cần (ví dụ 47/50 = 94%) |
| Bảng điều hành (S01) | Workforce | Lực lượng lao động | tổng nhân sự đang hoạt động |
| Bố trí nhân sự (S02) | Staffing | Bố trí nhân sự | ghép người vào đúng dự án, đúng ca |
| Bố trí nhân sự (S02) | Talent Pool | Kho ứng viên | danh sách lao động sẵn sàng đi làm |
| Bố trí nhân sự (S02) | Referral Guard | Chốt chặn giới thiệu | quy tắc chống gian lận khi giới thiệu người |
| Bố trí nhân sự (S02) | Override | Ghi đè chặn | người có quyền cho phép vượt quy tắc (có ghi lý do) |
| Bố trí nhân sự (S02) | Maker-checker | Người tạo – Người kiểm | thao tác quan trọng cần 2 người xác nhận |
| Chuyên cần (S03) | Attendance | Chuyên cần | chấm công, bảng công theo ca |
| Chuyên cần (S03) | Lock | Khóa chốt | đóng băng số liệu kỳ công, không sửa thêm |
| Chuyên cần (S03) | Blocker | Yếu tố chặn | lỗi dữ liệu chặn không cho khóa (3 loại dưới) |
| Chuyên cần (S03) | UNMATCHED_EMPLOYEE | Nhân viên không khớp | công thuộc về ai không xác định được |
| Chuyên cần (S03) | SOURCE_CONFLICT | Xung đột nguồn | hai nguồn dữ liệu công mâu thuẫn nhau |
| Chuyên cần (S03) | WRONG_PROJECT | Sai dự án | công ghi nhầm sang dự án khác |
| Đối soát (S04) | Reconciliation | Đối soát | đối chiếu công-lương giữa đơn vị cung ứng và khách hàng |
| Đối soát (S04) | Statement | Bảng kê | bảng kê công-lương gửi khách hàng xác nhận |
| Đối soát (S04) | Margin | Biên lợi nhuận | chênh lệch giữa tiền thu khách hàng và tiền trả đơn vị cung ứng |
| Đối soát (S04) | Payroll | Tính lương | xử lý bảng lương theo kỳ |
| Đối soát (S04) | SLA | Cam kết dịch vụ | hạn chót đơn vị cung ứng xác nhận đối soát (ví dụ 3 ngày) |
| Đối soát (S04) | Vendor | Đơn vị cung ứng | bên cung cấp lao động |
| Đối soát (S04) | Client | Khách hàng | nhà máy/kho thuê nhân sự |

## 2. Ba mẹo diễn thuyết 15 phút

**Mẹo 1 — Mở sẵn F01B trong một tab riêng để tham khảo khi bị hỏi.**
Trước buổi họp, mở `mockup/F01B_Glossary.html` ở một tab riêng cạnh tab demo. Khi sếp hỏi một thuật ngữ tiếng Anh trên màn hình, nhìn nhanh sang tab glossary để trả lời đúng nghĩa, không phải đoán. **Glossary là tài liệu tham khảo — không tính vào 15 phút dry-run** (thời gian demo chỉ tính phần click-path trong F00A).

**Mẹo 2 — Gặp thuật ngữ EN trên màn hình thì tự nói "tức là…" + nghĩa tiếng Việt.**
Không cần dịch hết mọi chữ; chỉ cần câu ngắn: "Statement — tức là bảng kê công-lương gửi khách hàng xác nhận", "Margin — tức là biên lợi nhuận: thu khách hàng bao nhiêu, trả đơn vị cung ứng bao nhiêu, chênh lệch là lời". Lần đầu xuất hiện thì nói đủ "thuật ngữ EN + nghĩa Việt", lần sau chỉ cần dùng nghĩa Việt. Lời thoại mẫu đã soạn sẵn trong F00A (dòng có thẻ **VI**) — chỉ việc đọc theo, không cần ứng biến.

**Mẹo 3 — Dừng lại ở 3 khoảnh khắc tô cam trong F80 để sếp hỏi.**
Trong `mockup/F80_DemoExport.html`, 3 khoảnh khắc bắt buộc được tô viền cam (PDD §1.4): (1) Guided Transfer — chuyển dự án của Nam lúc 02:10–03:10; (2) Exception → Lock — khóa kỳ công lúc 06:20–08:30; (3) Dual Reconciliation — đối soát hai đầu lúc 09:30–13:00. Đây là 3 điểm sếp quan tâm nhất: dừng lại, hỏi "Sếp có câu hỏi gì về phần này không?", chờ phản hồi rồi mới đi tiếp. Kể cả khi rút về bản 7 phút, 3 khoảnh khắc này vẫn không được cắt.

## 3. Nhắc nhở trước buổi demo

- **11 hotspot** chạy đúng trình tự 16 bước trong `F00A_DemoNarrative.html` (00:00 → 13:00) — đừng bấm lung tung; mỗi bước có link tên file để mở đúng frame.
- **Tổng demo ≤ 15 phút** — nhịp gợi ý: khoảng 45 giây/bước, 3 khoảnh khắc cam mỗi chỗ dành thêm 30–60 giây. Nếu bị hỏi lạc đề, ghi lại câu hỏi và hẹn trả lời sau buổi họp thay vì kể thêm.
- **Không submit thật** ở bước 03:10 (chuyển dự án) và 12:10 (phản đối) — chỉ trình bày, không bấm xác nhận.
- Nếu prototype/mạng lỗi giữa chừng: chuyển ngay sang `F80_DemoExport.pdf` — thứ tự bước giống hệt F00A (RISK-04).
- Con số cốt lõi nhớ trước: thiếu 3 (47/50) · 7 ngoại lệ công · 728.460.000 trả vendor / 914.820.000 thu client / 186.360.000 (20,37%) biên lợi nhuận.

> Handoff status: `READY_FOR_AUDIT` (tài liệu hỗ trợ — không làm thay 2 dry-run ≤15 phút của sếp; AC-12 evidence vẫn chờ sếp chạy)
