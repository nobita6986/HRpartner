# Owner review — TASK v1.1

- Owner: HRPartner Project Owner
- Date: 2026-09-09
- Verdict: REVISION_REQUIRED
- Reviewed commit: `656624f`

## Blocking corrections

### P0-01 — `Dự án đang tuyển` đang dùng sai khóa dữ liệu

Không khử trùng hoặc nhóm theo `recruiter`. Adapter hiện tại gán mọi job cùng giá trị
`Tuyển dụng qua HRPartner`, nên cách này chỉ tạo được một card. Section phải lấy tối đa bốn
job/project thật, khử trùng theo `job.id` hoặc khóa project công khai sẵn có, hiển thị
`job.title` và `job.availableSlots`. Không tự gọi `recruiter` là tên project.

### P0-02 — Không được phát minh flow đăng ký

`?register=1` và modal đăng ký không tồn tại, đồng thời nằm ngoài scope UI-only. CTA `Đăng ký`
phải là control disabled có thông báo `Đang phát triển`, hoặc trỏ tới một route thật đã tồn tại
và đúng ngữ nghĩa. Không dùng anchor `href="#"` cho control disabled vì nó vẫn điều hướng lên
đầu trang; dùng phần tử không điều hướng với `aria-disabled="true"` và hành vi bàn phím đúng.

### P0-03 — Baseline không được làm bằng `git checkout` trên main đang thi công

Không chạy `git checkout eda2602 && npm run test:unit` trong execution round. Tier 2 phải đo
baseline trước khi sửa code trong cùng session, hoặc dùng một worktree tạm chỉ để đo. Execution
baseline là commit cuối cùng đặt task thành `READY_FOR_EXECUTION`, không còn là `eda2602` sau
khi contract v1.1 đã được commit. Không hardcode `17 file lạ`; main tại review đang sạch.

### P0-04 — Visual/accessibility tooling phải tồn tại thật

Contract đang gọi Playwright, Lighthouse và pa11y nhưng chúng không được khai báo trực tiếp trong
package hiện tại. Không được để executor tự tải bằng `npx`. Dùng Edge CDP đã chứng minh hoạt động
ở UI-02, hoặc mở scope cho một script/dependency xác định. Regex tìm `focus:` không thay thế được
kiểm tra accessibility và cũng bỏ sót utility `hrp-focus` đang có.

## Required consistency fixes

1. Sửa `STEP-04` còn ghi `PublicJobDto.newest/topPaid` thành
   `PublicJobOverview.newest/topPaid`.
2. Sửa các dòng cũ còn gọi section 5 là `Top công ty` trong DEC-02 và domain boundaries.
3. HANDOFF đang vừa ghi execution round `1` vừa ghi chưa execution và round `0`; phải thống nhất
   là `0` cho tới khi Tier 2 bắt đầu code.
4. Chuẩn hóa evidence visual: STEP-10 đang ghi `ac11-section-bbox.txt` trong khi task chỉ có mười
   AC và placeholder hiện là `ac02-section-bbox.txt`.
5. Visual comparison phải dùng fixture xác định cho phép đo hình học; bổ sung một ảnh chạy dữ liệu
   thật để kiểm tra truth/overflow. Không lấy chiều cao section có text động so trực tiếp với HTML
   tĩnh rồi yêu cầu ±4 px.
6. AC-01 không query toàn bộ `section, footer, nav` vì Navbar/Footer có thể chứa nav lồng nhau.
   Gắn định danh cho bảy khối cấp cao và chỉ đo các khối đó.

Sau khi sửa, Tier 1 bump v1.2, chạy lại `verify-task.ps1`, cập nhật HANDOFF và trình Owner lần cuối.
