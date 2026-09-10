# Kế hoạch Hợp nhất Kiến trúc V4 (Consolidation Plan)

*Tài liệu này đóng vai trò như một bản đặc tả (Specification) dành cho Agent hoặc Lập trình viên phụ trách giai đoạn hợp nhất (Consolidation) sau này.*

## Bối cảnh hiện tại
Python ETL App (xử lý bóc tách file Excel) đang sử dụng một bảng cơ sở dữ liệu tạm thời là `PortalTimesheet`. 
Đặc điểm của bảng này là thiết kế **Nguyên khối (Denormalized)**: lưu trữ `employee_code` dạng Text thay vì quan hệ với bảng `Worker`, và toàn bộ dữ liệu chấm công ngày, bảng lương được serialize thành JSON (cột `daily_data`, `payroll_data`). 

Cách tiếp cận này phục vụ tốt cho giai đoạn Rapid Prototyping (MVP) nhưng đi ngược lại với thiết kế cốt lõi của Kiến trúc V4.

## Mục tiêu của Kiến trúc V4
Trong V4 (dựa trên `schema.prisma`), **mỗi Người lao động là một Thực thể hoàn chỉnh** (Entity):
- Bảng `Worker`: Lưu trữ master data, CCCD, trạng thái hồ sơ của người lao động.
- Bảng `User`: Lưu trữ tài khoản đăng nhập portal. `Worker` liên kết với `User` qua `accountUserId`.
- Quản lý công (Timesheet): Phân rã thành `TimesheetPeriod` (kỳ lương dự án), `TimesheetLine` (dòng chấm công hàng ngày), `TimesheetAdjustment` (điều chỉnh thủ công), và `WorkerDeduction` (khấu trừ phạt).

## Lộ trình Chuyển đổi Đề xuất (Roadmap)

Để hệ thống hoàn toàn đồng bộ, quy trình ETL từ Desktop App cần được thiết kế lại như sau:

### 1. Xây dựng Web API (Next.js)
Thay vì Desktop App chọc thẳng vào CSDL (Prisma/PostgreSQL) thông qua SQLAlchemy, Desktop App sẽ chỉ đóng vai trò phân tích Excel và gửi Payload JSON. 
Web API sẽ tiếp nhận JSON này và thực hiện các thao tác:

- **Identity Mapping (Worker Lookup)**: Dựa vào Mã NV hoặc CCCD từ Payload, tìm kiếm `Worker.id` tương ứng trong DB. Nếu chưa có, tạo `Worker` mới ở trạng thái `INCOMPLETE`.
- **Period Management**: Kiểm tra xem `TimesheetPeriod` cho Dự án & Tháng/Năm đó đã tồn tại và đang ở trạng thái `PENDING` hay chưa. Nếu đã `LOCKED`, từ chối cập nhật.
- **Daily Line Insertion**: Phân rã `daily_data` thành từng record `TimesheetLine` (lưu `regular_hours`, `ot15_hours`...) gán với `Worker.id` và `workDate`.

### 2. Xử lý Phụ cấp & Điều chỉnh (Adjustments)
- Bất kỳ phụ cấp cố định nào (như Chuyên cần, Soi kính, Đời sống) sẽ được nhúng vào cột `allowance` dạng JSON của `TimesheetLine` tương ứng.
- Bất kỳ khoản phạt hay trừ ứng nào mang tính chất vi phạm kỷ luật hoặc thanh lý, có thể chuyển thành `WorkerDeduction`.

### 3. Hợp nhất Giao diện Người lao động
- Khi dữ liệu được lưu đúng chuẩn V4, một Công nhân (User) có thể đăng nhập vào Web Portal.
- API lấy dữ liệu cá nhân cho App/Web sẽ truy vấn trực tiếp từ `TimesheetLine` `WHERE workerId = ...` thay vì phải parse JSON từ bảng `PortalTimesheet` cũ.

### 4. Giai đoạn Xoá bỏ
- Sau khi toàn bộ luồng Web API và Web Portal hoạt động ổn định, bảng `PortalTimesheet` sẽ chính thức bị DROP (xoá bỏ) khỏi schema.
