# Kiến trúc Đồng bộ: Python ETL ↔ Neon Postgres

Mục tiêu: Đảm bảo việc Python app làm sạch, tính toán lương và đẩy dữ liệu lên HrP (để phục vụ `app/bcc`) diễn ra trơn tru, không làm mất tính toàn vẹn dữ liệu người dùng trên Web.

Dựa trên thực tế **Python App đang tính lương rất tốt và đóng vai trò làm sạch dữ liệu**, tôi đề xuất mô hình **"Hybrid Source of Truth (SOT) + Per-Period Replace"**. 

## User Review Required

> [!IMPORTANT]
> **Hybrid Source of Truth (Nguồn chân lý lai)**
> Đây là thay đổi cốt lõi nhất. Chúng ta sẽ phân chia quyền "Làm chủ dữ liệu" (SOT) rõ ràng cho từng bảng để tránh giẫm chân lên nhau. Sếp vui lòng xem kỹ bảng phân quyền dưới đây.

## Bảng phân quyền Source Of Truth (SOT)

| Nhóm dữ liệu | Source of Truth | Web Admin / NLD có quyền? | Cơ chế Sync (`v4_sync.py`) |
|---|---|---|---|
| **Chấm công & Lương** (`timesheet_lines`, `timesheet_periods`, `manual_allowances`, `project_assignments`) | **ETL Python** | CHỈ ĐỌC (Read-Only). Nếu sai, kế toán phải sửa từ file gốc rồi chạy lại Python. | **Force Overwrite** (Ghi đè 100%). |
| **Hồ sơ nhân sự** (`workers`, `vendors`) | **Web App (Neon)** | ĐỌC & GHI (Đổi SĐT, STK, CCCD...). | **Timestamp Merge** hoặc **Insert-Only**. ETL chỉ đẩy lên nếu trên Web chưa có, hoặc nếu record trên ETL có `updated_at` mới hơn Web. |

## Giải pháp cho 5 rủi ro đứt gãy

### 1. Delete Strategy (Giải quyết Orphan Rows)
Thay vì đau đầu track xem dòng chấm công nào bị xóa ở local để xóa trên Neon, ta dùng chiến thuật **Replace Per Period (Xóa trắng và đổ lại theo kỳ)**:
- Khi Python app tính xong lương tháng 7/2026, lúc sync nó sẽ chạy lệnh: `DELETE FROM timesheet_lines WHERE period_id = 'thang-7-2026'` trực tiếp trên Neon.
- Sau đó nó `INSERT` lại toàn bộ data sạch của tháng 7 từ Python app.
- Cách này đảm bảo Neon luôn phản chiếu chính xác 100% dữ liệu cuối cùng của Python app cho kỳ đó, không bao giờ có rác hay orphan rows.

### 2. Ghi đè hồ sơ nhân sự (Giải quyết Conflict)
Cho bảng `workers`:
- Lệnh UPSERT sẽ có điều kiện: `ON CONFLICT(id) DO UPDATE SET phone = EXCLUDED.phone WHERE EXCLUDED.updated_at > workers.updated_at`.
- Nghĩa là: Nếu công nhân đổi SĐT trên app HrP, thời gian `updated_at` trên Neon sẽ rất mới. Khi ETL chạy, nó thấy data của nó cũ hơn nên sẽ KHÔNG ghi đè SĐT. (Bảo toàn thao tác của người dùng).

### 3. Mã định danh `user_id` (Giải quyết Counter Drift)
Trong file `formulas/worker_identity.py`, chúng ta đã có hàm `hash_cccd()` chạy rất chuẩn. 
Ta sẽ tận dụng hàm này sinh ra một mã string chuẩn format `USR-` để không bao giờ bị lệch khi sync nhiều lần.
```python
def generate_user_id(cccd: str) -> str:
    # Băm CCCD ra một số nguyên cố định, lấy 6 số cuối
    hash_int = int(hashlib.sha256(cccd.encode()).hexdigest()[:8], 16)
    return f"USR-{hash_int % 1000000:06d}"
```
Hàm này đảm bảo cứ nhập đúng CCCD đó là ra đúng `USR-123456`, không cần đếm xem DB đang có bao nhiêu người.

### 4. Kiểu dữ liệu JSON và Tiền tệ (VND)
- **JSON**: Trong script sync Python, trước khi đẩy lên sẽ gọi hàm `json.dumps(allowance)` và map vào Prisma/SQL dưới dạng ép kiểu rành mạch `?::jsonb`.
- **Tiền tệ (VND)**: Ép toàn bộ kiểu `REAL` (Float) trong SQLite thành `int` (số nguyên BigInt) ngay tại tầng Python trước khi `INSERT` lên Postgres, cắt đứt hoàn toàn sai số thập phân.

## Verification Plan

### Bằng mã code (Automated)
- Tạo một kịch bản test trên môi trường Dev:
  1. Cho ETL đẩy 1 Worker (A) lên Neon.
  2. Dùng Web sửa SĐT của (A) trên Neon.
  3. Cho ETL đẩy lại Worker (A) từ SQLite lên. Xác nhận SĐT trên Neon không bị đè mất.

### Kiểm tra bằng tay (Manual Verification)
- Sếp chạy lại script sync `python -m migrations.v4_sync sync` và mở cổng `app/bcc` để tra cứu lương xem tiền có bị lệch dấu phẩy (drift) hay không.
