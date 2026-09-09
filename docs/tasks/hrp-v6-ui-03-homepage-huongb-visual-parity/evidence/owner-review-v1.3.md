# Owner review — TASK v1.3

- Owner: HRPartner Project Owner
- Date: 2026-09-09
- Verdict: REVISION_REQUIRED — MECHANICAL CLOSEOUT
- Reviewed commit: `f64ccb1`
- Execution authorization: **CONDITIONAL — granted automatically after the exact corrections below**
- Further Owner contract review required: **NO**

## Owner conclusion

V1.3 đã xử lý đúng phần kiến trúc của verdict v1.2: route thật được giữ, section tuyển dụng dùng
khóa thật, Playwright đã rời khỏi phần lớn contract, visual gate đã đo sâu hơn bbox, unit baseline
không còn bị ép exit code và Job Card dùng nhận diện trung tính.

Không mở correction round dài thêm. Tier 1 được quyền bump `v1.4`, áp dụng đúng các sửa cơ học
dưới đây, chạy `verify-task.ps1`, đặt `READY_FOR_EXECUTION` và giao Tier 2 ngay. Nếu Tier 1 thay đổi
thêm quyết định sản phẩm hoặc scope ngoài danh sách này thì phải trình Owner lại.

## Mandatory mechanical corrections before READY_FOR_EXECUTION

### MC-01 — Ghi đúng execution round

HANDOFF phải ghi `Execution round: 0` cho tới khi Tier 2 thật sự bắt đầu. Xóa mọi câu
`1 (planning)` hoặc `đặt 1 để satisfy parser`. Không chạy `verify-handoff.ps1` cho một HANDOFF
tiền thực thi nếu parser không hỗ trợ round 0; tuyệt đối không khai sai trạng thái để làm gate xanh.

### MC-02 — Không commit bằng chứng giả

Xóa file rỗng `evidence/screenshots/ac02-overlay-desktop.png`. PNG chỉ được tạo khi CDP đã chụp
ảnh thật trong execution round. Placeholder nếu cần phải là `.txt` ghi rõ `pending`, không được
mang magic extension của bằng chứng chưa tồn tại.

### MC-03 — Script CDP phải nằm trong scope thật

Contract gọi năm script chưa tồn tại dưới `scripts/`, trong khi OBR-02 không cho Tier 2 sửa root
`scripts/**`. Đặt toàn bộ script riêng của task dưới:

`docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/scripts/**`

và sửa tất cả command trong TASK/HANDOFF sang path này. Không mở thêm root `scripts/**` chỉ cho
một task visual.

### MC-04 — Sửa interaction smoke theo hành vi thật

API dùng `offset`/`nextOffset`, không dùng query `page`. Interaction smoke phải chứng minh:

1. load-more gọi offset kế tiếp và thêm card mới khi `nextOffset` khác null;
2. click tiêu đề/card mở `/viec-lam/{slug}`;
3. click CTA `Ứng tuyển` trên homepage mở `ApplyModal` hiện có ngay trên homepage.

Không chuyển ApplyModal sang “chỉ mở từ trang chi tiết”; đó là regression so với hành vi hiện tại
và trái với CTA trong demo.

### MC-05 — Xóa nốt các chỉ dẫn lỗi thời

- Outcome Footer không được nói anchor chết dùng `aria-disabled`; thống nhất route thật là link,
  mục chưa có route là control disabled không điều hướng.
- Xóa hẳn dòng `RISK-01 (dropped...)`; đã dropped thì không còn là risk row.
- Chuẩn hóa scope/evidence, không còn path visual cũ `ac07-*` hoặc `ac11-*`.

### MC-06 — Chốt đúng số evidence ảnh

Phép tính hiện tại là `4 main + 14 section + 1 overlay + 1 fixture = 20 PNG`, không phải 19.
AC-08 phải yêu cầu đúng **20 file PNG thật**, mỗi file có PNG magic bytes, kích thước hợp lệ và
non-zero. Số file chỉ là integrity gate; Owner visual sign-off vẫn là quyết định parity cuối cùng.

## Authorization

Sau khi Tier 1 áp dụng nguyên văn MC-01 đến MC-06:

1. bump TASK/HANDOFF lên `v1.4`;
2. cập nhật execution baseline thành commit cuối cùng chứa trạng thái `READY_FOR_EXECUTION`;
3. chạy `verify-task.ps1`;
4. giao Tier 2 `/code` mà không cần xin Owner duyệt contract lần nữa;
5. sau execution, trình Owner cặp actual/reference và overlay thật trước Tier 3 focused audit.

Owner không ký visual PASS trước khi xem ảnh thật, bất kể các phép đo tự động xanh.
