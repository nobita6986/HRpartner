# Owner review — TASK v1.2

- Owner: HRPartner Project Owner
- Date: 2026-09-09
- Verdict: REVISION_REQUIRED
- Reviewed commit: `f6d0eba`
- Execution authorization: **NOT GRANTED**

## Owner conclusion

V1.2 đã sửa đúng phần lớn finding của v1.1, đặc biệt là khóa dữ liệu của section
`Dự án đang tuyển`, baseline capture và việc chuyển phần lớn visual tooling sang Edge CDP.
Tuy nhiên contract vẫn có nhiều nguồn sự thật đối nghịch và gate visual chưa đủ mạnh để bảo đảm
mục tiêu Owner đã chốt: homepage phải bám sát `code.html`, không chỉ có cùng số section.

## Blocking corrections

### P0-01 — Xóa toàn bộ chỉ dẫn cũ còn mâu thuẫn với DEC-04

`TASK.md` phần Outcome vẫn yêu cầu section 5 khử trùng theo `recruiter`, đặt tên project bằng
`recruiter` và dùng `positionCount`, trong khi DEC-04/RQ-05/STEP-06/AC-07 đã chuyển sang
`job.id` / `job.title` / `job.availableSlots`. Tier 2 không được nhận hai mệnh lệnh trái nhau.

Sửa Outcome theo đúng DEC-04/RQ-05. Đồng thời xóa `RISK-01` nói DEC-04 chưa chốt vì Owner đã ký
DEC-04; xóa tên path cũ `top-companies-section.tsx` khỏi OBR-02, chỉ giữ
`recruiting-projects-section.tsx`.

### P0-02 — Không được vô hiệu hóa route thật đang hoạt động

Repository hiện có `/login`, `/ve-chung-toi` và `/ctv-portal`. Contract v1.2 lại biến cả
`Đăng nhập` và `Về HRP Việt Nam` thành button disabled, làm thoái lui chức năng đang chạy.

- `Đăng nhập` phải tiếp tục trỏ `/login`.
- `Về HRP Việt Nam` phải trỏ `/ve-chung-toi`.
- Tier 1 phải chốt rõ `Cộng tác viên` trỏ `/ctv-portal` hay scroll tới section CTV; không được
  mô tả cả hai ngữ nghĩa ở các phần khác nhau.
- Chỉ `Đăng ký` và những mục thật sự chưa có route mới được thể hiện `Đang phát triển`.
- Footer áp dụng cùng nguyên tắc: route thật là link; mục chưa có route không dùng anchor chết.

### P0-03 — Toolchain vẫn tự mâu thuẫn

RQ-12 tuyên bố không dùng Playwright, nhưng RQ-11 vẫn yêu cầu Playwright/Chromium và AC-07 cùng
HANDOFF vẫn gọi `section-recruiting-check.mjs` là Playwright DOM check. `@playwright/test` chỉ đang
extraneous trong `node_modules`, không phải dependency được khai báo, nên không được xem là nền
tảng tái lập.

Chuyển toàn bộ RQ-11, AC-07 và HANDOFF sang Edge CDP `Runtime.evaluate`, hoặc mở một task riêng
để khai báo dependency. Với task UI-03 này, Owner chọn Edge CDP để giữ scope gọn.

### P0-04 — Gate hiện tại chưa chứng minh visual parity

Bounding box cấp section chỉ chứng minh kích thước ngoài; hai giao diện khác màu, font, radius,
shadow, khoảng cách nội bộ và hierarchy vẫn có thể PASS. Đây chính là lỗ hổng có thể lặp lại kết
quả UI-02: gate xanh nhưng giao diện không giống demo.

AC visual phải coi bbox là bằng chứng phụ và bổ sung:

1. cặp actual/reference cùng viewport cho từng section;
2. ảnh overlay hoặc side-by-side dễ đối chiếu cho desktop;
3. phép đo CDP cho các mốc nội bộ chính: x/y/width/height, padding/gap và computed style của
   background, typography, radius, border/shadow;
4. Owner visual sign-off là gate bắt buộc sau khi xem ảnh thật, không được suy ra PASS từ số file
   PNG hoặc bbox.

Mobile tiếp tục dùng responsive reflow không overflow; không sao chép lỗi overflow của demo.

### P0-05 — Không hardcode full unit test phải exit 1

Control, STEP-09, STEP-11, AC-09 và HANDOFF vẫn buộc `npm run test:unit` exit 1. Baseline phải được
đo đầu execution round; nếu baseline tại commit READY xanh thì kết quả cuối cũng phải xanh.
Điều kiện đúng là: **cùng expected failure set với baseline và new failure count = 0**, không khóa
exit code trước khi đo.

### P0-06 — Execution round phải phản ánh execution, không phản ánh correction

TASK ghi current execution round `0`; HANDOFF control ghi `2`, phần Outcome lại ghi chưa bắt đầu
và execution round `0`. Correction round không phải execution round. Đặt HANDOFF execution round
`0` cho tới khi Tier 2 bắt đầu. Nếu `verify-handoff.ps1` không chấp nhận handoff tiền thực thi,
không được khai sai dữ liệu để làm parser xanh; chỉ chạy gate đó ở đúng lifecycle stage hoặc sửa
quy trình bằng task governance riêng.

## Required precision fixes

1. `PublicJobDto` không có logo công ty. RQ-03 phải chốt logo trung tính/HRP monogram cho job card,
   không để Tier 2 tự bịa logo hoặc dùng URL ngoài.
2. AC-03 hiện chỉ gọi API và grep chữ `shift`, chưa chứng minh load-more, mở chi tiết và ApplyModal.
   Bổ sung CDP interaction smoke cho các hành vi được tuyên bố giữ nguyên.
3. Chuẩn hóa toàn bộ tên evidence visual; không còn path cũ `ac07-*` ở Scope trong khi AC-07 nay
   là recruiting truth và AC-08 mới là screenshots.

## Conditions for v1.3 approval

Tier 1 sửa đúng các điểm trên, bump `v1.3`, chạy `verify-task.ps1`, cập nhật HANDOFF với execution
round `0`, rồi trình Owner semantic diff v1.2 → v1.3. Không giao `/code` trước Owner PASS.
