# Admin Sidebar Navigation Reconciliation

## 1. Mục tiêu

Quy hoạch lại sidebar Admin theo hành trình công việc thực tế, không theo lịch sử
module. Thay đổi menu không được mở rộng quyền: item vẫn phải được lọc theo role,
và route/API tiếp tục là authority cuối cùng.

## 2. Hiện trạng quan sát được

| Bề mặt | Hiện trạng | Vấn đề |
|---|---|---|
| `/admin/jobs` | Danh sách Project và thao tác `Project.isPublic` legacy | P1-A1 đã chọn `PUBLISHED JobPosting` làm public authority; tên “Danh sách nhu cầu” và nút Publish cũ gây hiểu nhầm |
| `/admin/staffing` | StaffingOrder và slot tuyển dụng | Đang đặt trong nhóm “Con người” dù đây là đầu vào của quy trình tuyển dụng |
| `/admin/jobs/job-postings` | Authoring/publish JobPosting canonical | Đúng nhóm nhưng chưa phải điểm vào nổi bật nhất của luồng đăng tin |
| `/admin/applications` | Hàng chờ đơn ứng tuyển | Đúng nhóm tuyển dụng |
| `/admin/labor-profiles` | Kho hồ sơ ứng viên canonical | Có page nhưng không có item sidebar |
| `/admin/projects`, `/admin/clients`, `/admin/vendors` | Dữ liệu nền/đối tác | Đang trộn giữa nhóm “Nhu cầu & Tuyển” và “Con người” |
| Attendance/Tickets/Reconciliation/Payroll | Page nghiệp vụ đã tồn tại | Bị gom vào “Đang phát triển”, không phản ánh domain và làm menu khó tìm |
| Active state | Match theo prefix | `/admin/jobs` có thể cùng active với `/admin/jobs/job-postings` |
| Responsive | Sidebar `hidden` dưới breakpoint `md` | Admin mobile/tablet nhỏ không có navigation thay thế |

## 3. Kiến trúc thông tin đề xuất

### Tổng quan

- `Tổng quan` → `/admin`

### Tuyển dụng

1. `Nhu cầu tuyển dụng` → `/admin/staffing`
2. `Tin tuyển dụng` → `/admin/jobs/job-postings`
3. `Đơn ứng tuyển` → `/admin/applications`
4. `Hồ sơ ứng viên` → `/admin/labor-profiles`

`/admin/jobs` không còn là item chính. Sau khi xác nhận không còn consumer cần
publish `Project.isPublic`, route này phải redirect sang `/admin/jobs/job-postings`
hoặc trở thành dashboard read-only; không tiếp tục là mutation authority.

### Nhân sự & vận hành

1. `Nhân sự đang làm việc` → `/admin/workers`
2. `Chấm công` → `/admin/attendance`
3. `Phản ánh & tạm ứng` → `/admin/tickets`

### Đối tác & dữ liệu nền

1. `Dự án` → `/admin/projects`
2. `Khách hàng` → `/admin/clients`
3. `Nhà cung cấp` → `/admin/vendors`

### Tài chính

1. `Tính lương` → `/admin/payroll`
2. `Đối soát` → `/admin/reconciliation`
3. `Chính sách hoa hồng` → `/admin/commission/policies`
4. `Sổ cái hoa hồng` → `/admin/commission/ledger`

### Hệ thống

1. `Tài khoản` → `/admin/users`
2. `Thư viện Media` → `/admin/media`
3. `Cài đặt` → `/admin/settings`

## 4. Quy tắc triển khai

1. Giữ role matrix hiện hành trong vòng đầu; menu chỉ phản ánh quyền, không cấp quyền.
2. Mỗi route chỉ có đúng một item active. Ưu tiên exact match hoặc route dài nhất.
3. Nhóm có từ ba item trở lên được collapse; nhóm chứa route active tự mở.
4. Desktop sidebar sticky theo viewport; footer tài khoản không che item cuối.
5. Dưới `md`, cung cấp drawer/menu button có focus trap và keyboard navigation;
   không để navigation biến mất hoàn toàn.
6. Dùng icon khác nhau theo domain; không dùng cùng `Briefcase`, `Users` hoặc
   `Wallet` cho nhiều khái niệm nếu Lucide đã có icon chính xác hơn.
7. Nhãn dùng tiếng Việt nhất quán; bỏ `Staffing`, `JobPosting`, `Publish` khỏi
   nhãn người dùng, chỉ giữ trong thuật ngữ kỹ thuật nội bộ.

## 5. Chia lát triển khai

### NAV-01 — information architecture (`STANDARD`, audit `NONE`)

- Reorder/rename item, thêm LaborProfile, đưa module ra khỏi “Đang phát triển”.
- Sửa active-route specificity.
- Static/unit test cho role × item và chỉ một active item.

### NAV-02 — responsive navigation (`STANDARD`, audit `NONE`)

- Mobile drawer dùng primitive hiện có; chỉ thêm dependency nếu repo chưa có
  accessible dialog/drawer phù hợp và BUILD_VS_ADOPT chứng minh cần thiết.
- Test keyboard, focus return, escape và aria label.

### LEGACY-JOBS — retire `/admin/jobs` (`CRITICAL`, audit `LIGHT`)

- Khảo sát consumer của `Project.isPublic` và API publish cũ.
- Khi đủ evidence, bỏ mutation legacy hoặc redirect có kiểm soát.
- Không gộp với NAV-01 để tránh thay đổi authority ngầm trong một UI task.

## 6. Quyết định đề xuất cho T0

- Chấp thuận IA mục 3 làm target navigation.
- Ưu tiên NAV-01 sau hotfix API projects.
- Giữ LEGACY-JOBS thành task riêng sau khi `P1-A0.1` hoàn thiện create/publish UX.
- n8n không áp dụng: sidebar và synchronous navigation không phải workflow
  orchestration; không tạo thêm dependency vận hành.

