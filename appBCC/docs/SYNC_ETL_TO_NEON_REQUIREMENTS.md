# REQUIREMENTS: Pivot - Sync ETL Python → Neon Postgres qua bảng tạm (portal_timesheets)

**Ngày cập nhật:** 2026-08-18
**Người tạo:** AI Assistant
**Trạng thái:** Pivoted - Chuyển hướng
**Mục đích:** Hủy bỏ kế hoạch đồng bộ trực tiếp vào các bảng Canonical của V4 (workers, project_assignments, timesheet_lines...) do gặp quá nhiều rủi ro về cấu trúc dữ liệu, xung đột ID, logic khấu trừ và sự phức tạp của đồng bộ 2 chiều (Bidirectional Sync). Quay lại sử dụng bảng phụ `portal_timesheets` làm cầu nối hiển thị cho app/bcc.

---

## 1. LÝ DO PIVOT (QUAY LẠI BẢNG TẠM)

Quá trình phân tích kiến trúc V4 Canonical đụng phải các "lấn cấn" (roadblocks) quá lớn cho phân kỳ hiện tại:

1. **Rủi ro đứt gãy ID (user_id / id)**: `user_id` trong Prisma là bắt buộc (NOT NULL), nhưng ETL Python có thể không có CCCD. Nếu đẩy lên Neon sẽ vỡ constraint. Hơn nữa, Web App (SOT) tự sinh UUID, nếu ETL không Pull-down toàn bộ dữ liệu về trước khi chạy, nó sẽ tự sinh UUID mới cho cùng 1 SĐT -> gây lỗi Unique Constraint.
2. **Lỗi logic ở `actions.ts` đối với V4**:
   - `WorkerDeduction` hiện tại trong schema.prisma không có `periodMonth` / `periodYear`. Truy vấn trực tiếp V4 khiến tiền khấu trừ bị trừ cộng dồn qua tất cả các tháng vĩnh viễn.
   - Tính lương khối văn phòng (`MONTHLY`) đang bị hardcode chia từ lương ngày, khiến kết quả sai bét.
3. **Schema Mismatch**: Các bảng `manual_allowances` và `vendor_aliases` của ETL không có mặt trên Prisma Schema V4.

Vì phân kỳ này ưu tiên: **"chuẩn hoá dữ liệu nạp qua app ETL python và tạo ra dữ liệu để người lao động xem được chấm công và lương của họ trên nhánh app/bcc"**, việc cố gắng nhồi nhét dữ liệu vào Canonical Tables sẽ gây quá tải và rủi ro sập hệ thống. 

**Quyết định:** Sử dụng lại bảng `portal_timesheets` làm bảng trung gian. ETL Python tự tính toán lương, OT, allowances, net income, rồi đúc thành cục JSON/Row và ném thẳng lên Neon Postgres. App/bcc chỉ việc Get và Hiển thị.

---

## 2. KIẾN TRÚC MỚI (REVERTED PIVOT)

```text
[App Python ETL]
   │
   │ (1) Tính toán nội bộ tại máy local (SQLite / Memory)
   │ (2) Xoá dữ liệu cũ trên Neon (DELETE WHERE employeeCode + project + period)
   │ (3) Nạp dữ liệu mới vào bảng tạm
   ▼
[Neon Postgres]
   │
   │ Bảng `portal_timesheets` (Auxiliary Table)
   │ 
   ▼
[Web App Next.js - app/bcc]
   │
   │ (4) Fetch từ `portal_timesheets` dựa trên employeeCode, project, period
   │ (5) Hiển thị trực tiếp cho Người lao động
```

### Ưu điểm của giải pháp này:
- **An toàn tuyệt đối cho V4 Core:** Không đụng chạm vào `workers`, `project_assignments`, `timesheet_lines`. Không làm hỏng Master Data.
- **Python làm chủ hoàn toàn Logic:** Mọi lỗi cộng dồn khấu trừ, lỗi lương khối văn phòng... Python sẽ tự xử lý ở local trước khi đẩy số cuối cùng (Final Number) lên Neon.
- **Performance Web App cao:** Next.js không cần JOIN 4-5 bảng tính lương on-the-fly, chỉ `findFirst` từ `portal_timesheets` là xong.

---

## 3. CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### 3.1 Nhánh Web (`app/bcc/actions.ts`)
- **Đã Revert:** Đã sửa đổi code `actions.ts` quay trở lại truy vấn trực tiếp từ bảng `portal_timesheets` thay vì đập vào các bảng Canonical.
- Logic hiện tại: `prisma.portalTimesheet.findFirst({ where: { employeeCode, project, periodMonth, periodYear } })`
- Formats lại output để khớp với component hiển thị.

### 3.2 Nhánh ETL Python (`appBCC/migrations/v4_sync.py`)
- **Đã Cập nhật:** Đổi `SYNC_ORDER` chỉ còn đúng 1 bảng `portal_timesheets`.
- Bỏ qua việc sync các bảng `workers`, `vendors`, `timesheet_lines`...
- Sử dụng Conflict Key: `employee_code, project, period_month, period_year` để đảm bảo Upsert chính xác.

### 3.3 Nhánh ETL Python (`appBCC/core_pipeline.py`)
- Các hàm `push_to_db` và `clear_db_period` vốn tương tác trực tiếp với bảng `portal_timesheets` thông qua `SQLAlchemy Engine` vẫn đang hoạt động bình thường, không cần thay đổi.

---

## 4. NEXT STEPS (CÁC BƯỚC TIẾP THEO)

1. **Khởi chạy lại Pipeline ETL**: Kế toán có thể sử dụng `appBCC` để tính lương và đồng bộ (Push) dữ liệu thẳng lên Neon như cũ.
2. **Kiểm tra hiển thị**: Mở portal `app/bcc`, nhập Mã nhân viên và chọn dự án + kỳ lương để kiểm tra xem dữ liệu `dailyData` và `payrollData` đã lên đúng form mẫu chưa.
3. **Chuẩn hoá dữ liệu nội bộ ETL**: Python ETL nay có toàn quyền trong việc cấu trúc mảng JSON phụ cấp (`allowance`) và khấu trừ (`deduction`). Cứ chuẩn hoá ở Python, Web sẽ hiển thị y chang.
