# Owner DEC-04 Sign-off — "Top công ty hàng đầu"

Owner vui lòng chọn một trong ba options và ký bên dưới.

---

## Options

| Option | Mô tả |
|---|---|
| **(a) Cung cấp danh sách** | Owner cung cấp danh sách đối tác công khai (tên công ty + logo có quyền sử dụng + xác nhận công khai). Tier 2 hiển thị logo thật. |
| **(b) Hoãn section** | Owner chính thức hoãn. Tier 2 render placeholder HRP/monogram. Khi nào Owner chốt danh sách, bump spec version. |
| **(c) Xóa section** | Owner yêu cầu xóa hoàn toàn section "Top công ty hàng đầu" khỏi homepage. |

---

## Owner sign-off

**Chọn: (b), với ràng buộc Owner bên dưới.**

Không được render một section mang tên `Top công ty hàng đầu`, pill `Đối tác chính thức`,
tên công ty hoặc logo công ty khi chưa có public data contract và quyền công khai. Trong task
này, Tier 2 giữ đúng hình thức bốn card của demo nhưng đổi ngữ nghĩa thành
`Dự án đang tuyển`; dữ liệu lấy từ `PublicJobOverview.newest`/`topPaid`, khử trùng lặp,
dùng logo HRP hoặc monogram trung tính. Nếu không có dữ liệu thật thì ẩn cả section.

Việc đưa `Top công ty hàng đầu` thật lên public homepage được hoãn sang task riêng sau khi
Owner duyệt danh sách đối tác, logo và quyền công khai.

- **Owner:** HRPartner Project Owner
- **Ngày:** 2026-09-09
- **Verdict DEC-04:** PASS WITH CONSTRAINTS
- **Verdict TASK.md v1.0:** REVISION_REQUIRED
