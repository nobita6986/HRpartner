# CÂU HỎI CHO HR — Về công thức tính Lương Tăng Ca

---

## Bối cảnh

Chúng tôi đang xây dựng hệ thống ETL tự động tính lương từ bảng chấm công (BCCActroT7.xlsx).
File LCNT7.xlsx đã có sẵn trong hệ thống — đây là file HR chuẩn để đối chiếu.

---

## Yêu cầu từ hệ thống ETL

Để tính chính xác khung giờ OT, hệ thống cần xác định ngày nào là **Chủ Nhật** hoặc **Ngày Lễ**.

### Vấn đề: Ngày cố định không phải lúc nào cũng cùng thứ

| Ngày | 2025 | 2026 | 2027 |
|---|---|---|---|
| 25/7 | Thứ Sáu | **Thứ Bảy** | Chủ Nhật |
| 1/5 | Thứ Năm | Thứ Sáu | Thứ Bảy |

→ Cùng một ngày trong lịch, nhưng thứ khác nhau mỗi năm.

### Giải pháp trong ETL

Người dùng cần **chọn chu kỳ tính lương** (tháng/năm) trước khi upload file BCC.
Hệ thống sẽ:
1. Xác định thứ của từng ngày trong tháng đó
2. Map vào bảng hệ số OT (row 8 trong BCCActroT7.xlsx)
3. Tính lương chính xác

**Câu hỏi cho HR:**

### 1. Ngày lễ — 2 phương án tùy thời điểm

Ngày lễ có **2 cách xử lý** tùy quy định:
- **Nghỉ** → Không tính công, không ảnh hưởng chuyên cần
- **Tính công ngày lễ** → Tính 300% (như CN), ảnh hưởng chuyên cần

**Đề xuất giải pháp:**

| Phương án | Cách xử lý | Ưu điển | Nhược điểm |
|---|---|---|---|
| **A. Config theo dự án** | Mỗi plugin có config riêng cho ngày lễ | Linh hoạt, đúng 80 dự án | Cần setup ban đầu |
| **B. Override từng kỳ** | Admin chọn ngày lễ nào nghỉ/đi làm mỗi kỳ | Chuẩn xác theo tình huống | Thêm bước chọn mỗi tháng |
| **C. Hybrid (đề xuất)** | Config mặc định theo dự án + override được mỗi kỳ | Linh hoạt + tiện lợi | Phức tạp hơn |

**Đề xuất: Phương án B (Override từng kỳ)**
- Mặc định: Lịch lễ chính thức VN
- Mỗi kỳ tính lương, admin chọn ngày lễ nào **nghỉ** / **đi làm**
- Ảnh hưởng chuyên cần: nếu đi làm ngày lễ → tính OT lễ; nếu nghỉ → không ảnh hưởng

**Câu hỏi:** Với Actro, có ngày lễ công ty nào ngoài lịch chính thức không?

### 2. Kỳ tính lương

- **Actro**: chốt ngày 25 hàng tháng ✅
- **80 dự án khác**: mỗi dự án có config riêng (ngày 20, 25, cuối tháng…)

→ Cần field `pay_period_day` trong config mỗi plugin.

---

---

## Công thức đã xác định ✓

| Thành phần | Công thức | Trạng thái |
|---|---|---|
| Lương cơ bản | 6,000,000 VND | ✓ Khớp |
| OT ngày thường | giờ × 28,846 × 1.5 | ✓ Khớp |
| OT đêm | giờ × 28,846 × 2.0 | ✓ Khớp |
| Phụ cấp đời sống | ngày công × 11,538 | ✓ Khớp |
| Thưởng chuyên cần | 0 nghỉ → 400k / 1 nghỉ → 200k | ✓ Khớp |
| KPI | 0 nghỉ → 1M / 1 nghỉ → 400k | ✓ Khớp |
| Suất ăn | ngày công × 25,000 | ✓ Khớp |
| Thâm niên | ngày làm / 30 × 230,769, tối đa 400k | ✓ Khớp |

---

## Vấn đề: Lương OT Chủ Nhật

**Cấu trúc dữ liệu trong BCCActroT7.xlsx:**
- Mỗi ngày = 10 cột liên tiếp: Ngày → **In** → **Out** → giờ → Rate columns
- Row 8 chứa hệ số OT: KD=150%, KE=200%, KF=270%

**Công thức tính:**
```
LƯƠNG = 6,000,000
       + OT_ngày × 28,846 × 1.5      (cột Col291)
       + OT_đêm × 28,846 × 2.0       (cột Col293)
       + OT_CN × 28,846 × [2.0 hoặc 2.7]  (cột Col295, Col296)
```

**Phát hiện:** Hệ số nhân cho OT Chủ Nhật **có 2 mức**:
- **2.0× (KF)** — giờ CN trong khung ngày thường
- **2.7× (KF)** — giờ CN kèm ca đêm

Để xác định mức nào, cần parse giờ **In/Out** của từng ca để xem:
- Ca bắt đầu và kết thúc vào khung nào
- Ca đó rơi vào ngày thường, CN, hay lễ

| Mã NV | OT CN (giờ) | LƯƠNG (LCNT7) | Ghi chú |
|---|---|---|---|
| A601010731 | 11h | 10,950,000 | Cần kiểm tra In/Out để xác định KF 2.0 hay 2.7 |
| A511010137 | 11h | 11,662,500 | Cần kiểm tra In/Out để xác định KF 2.0 hay 2.7 |

---

## Phương án hiện tại

**Đã có:** File `LCNT7.xlsx` chứa cột `LƯƠNG` (col 304) cho 97 nhân viên.

**Hướng xử lý Actro:** ETL đọc song song `BCCActroT7.xlsx` và `LCNT7.xlsx`, match theo **Mã thẻ**, lấy trực tiếp `LƯƠNG` từ LCNT7 — không cần giải mã công thức, đảm bảo 100% khớp.

**Hướng xử lý cho 80 dự án khác:** Mỗi plugin có config riêng:
- `pay_period_day`: ngày chốt lương (20, 25, cuối tháng…)
- `holiday_policy`: override ngày lễ theo từng kỳ

---

## Giải pháp đối chiếu tự động

Chúng tôi sẽ cấu hình ETL đọc song song hai file:

| File | Vai trò |
|---|---|
| BCCActroT7.xlsx | Nguồn giờ công, OT, In/Out theo ngày |
| LCNT7.xlsx | Nguồn LƯƠNG chuẩn (đối chiếu theo Mã thẻ) |

**Logic phân loại khung giờ OT:**
- Dựa vào giờ **In/Out** trong BCC + thứ của ngày (từ chu kỳ tính lương)
- Xác định: ngày thường, CN, hay lễ
- Map vào hệ số tương ứng: KD (150%), KE (200%), KF (270%)

**File đã có:** `docs/Actro/LCNT7.xlsx`
