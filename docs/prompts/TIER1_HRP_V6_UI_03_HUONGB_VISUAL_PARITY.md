# Owner mandate — HRP V6 UI-03 HuongB visual parity

## Vai trò và mục tiêu

Bạn là Tier 1. Hãy khảo sát và lập `TASK.md` cho task mới:

`hrp-v6-ui-03-homepage-huongb-visual-parity`

Đây là task kế tiếp sau commit `0ff27fc` của UI-02. Không mở lại hoặc đổi verdict UI-02: UI-02 đã hoàn thành tái cấu trúc, nhưng contract của nó chỉ yêu cầu một bản rút gọn và không phải bản sao thị giác của HuongB.

Mục tiêu UI-03 là đưa homepage `/` đạt visual parity với nguồn chuẩn:

`scratch/new-ui-HuongB-ref-2026-09-07/code.html`

## Quyết định Owner không được diễn giải lại

1. `code.html` là source of truth về bố cục, thứ tự section, tỷ lệ, màu, typography, khoảng trắng, card, ribbon, shadow và phong cách responsive. Giao diện hiện tại chỉ là source of truth cho logic và dữ liệu.
2. Desktop phải bám sát reference ở mức có thể so sánh side-by-side/overlay. Mobile là bản reflow đúng của cùng thiết kế; không sao chép lỗi overflow/cắt chữ trong `mobile-reference.png` cũ.
3. Được phép thay toàn bộ JSX/class/style của homepage, Navbar, Footer và các landing component liên quan. Không bị trói bởi hình thức rút gọn của UI-02.
4. Giữ nguyên hành vi thật: fetch `/api/jobs`, facets, tìm kiếm, phân trang/load-more, mở chi tiết, ứng tuyển, trạng thái loading/error/empty và dữ liệu lương/slot/deadline. Không thay schema/database và không bịa dữ liệu để giống mockup.
5. Xóa khỏi bề mặt cuối các dấu vết của composition hiện tại nếu demo không có: Hero dạng card inset bo tròn, Featured card trắng hiện tại, job grid hai cột trong khối xám lớn, Areas header vàng + chip text-only, referral strip một hàng và footer một hàng.
6. Phải khôi phục đầy đủ ngôn ngữ thị giác của demo: header; Hero full-width màu cam; search card hai tầng; recruitment highlight dạng glass; `Việc làm tốt nhất` với card ba cột; khu vực bằng image card; khu vực công ty/đối tác nếu có dữ liệu công khai hợp lệ; referral hai cột có ảnh; footer nhiều cột.
7. Không sao chép URL Google tạm trong HTML demo. Dùng asset nội bộ tại `public/images/homepage-huongb/`.
8. Không AI-generate hoặc hardcode logo/tên đối tác. Logo doanh nghiệp chỉ được hiển thị khi có asset và quyền công khai được Owner xác nhận; nếu chưa có, dùng logo HRP hoặc monogram trung tính nhưng giữ đúng khung/tỷ lệ card.
9. Không hardcode các con số mẫu như `17.800 việc làm`, mức thu nhập referral hoặc phúc lợi không có nguồn. Hình thức có thể giống demo, nội dung phải lấy từ API hoặc copy đã được công bố.
10. Nếu `Top công ty hàng đầu` chưa có public data contract an toàn, Tier 1 phải ghi rõ blocker/decision riêng: dùng danh sách đối tác được Owner duyệt hoặc đổi thành một section cùng hình thức nhưng dựa trên dữ liệu public thật. Không được tự ý lộ bảng khách hàng nội bộ.

## Asset pack Owner đã duyệt

- `public/images/homepage-huongb/industrial-location-01.webp`
- `public/images/homepage-huongb/industrial-location-02.webp`
- `public/images/homepage-huongb/industrial-location-03.webp`
- `public/images/homepage-huongb/industrial-location-04.webp`
- `public/images/homepage-huongb/referral-team.webp`

Các ảnh này là ảnh gốc không logo, không chữ, không watermark. Tier 2 có thể chọn/mapping theo thứ tự facet hoặc khu vực, nhưng không được mô tả ảnh như bằng chứng địa lý chính xác.

## Yêu cầu Tier 1 trước khi giao Tier 2

1. Đọc toàn bộ `code.html`, homepage hiện tại và các landing component; lập gap matrix theo từng section.
2. Mở scope đúng cho Navbar, Footer, homepage, landing components, style/token cần thiết, asset pack và các fence test bị ảnh hưởng. Không để test cũ khóa composition UI-02 rồi buộc Tier 2 chữa test ngoài hợp đồng.
3. Chia task theo section nhưng giữ một owner duy nhất cho cấu trúc homepage; không tạo hai danh sách job hay hai form search.
4. Tạo fixture/seed xác định để visual capture luôn có job, lương, khu vực và card; fixture chỉ dùng kiểm thử, không thay dữ liệu production.
5. Acceptance bắt buộc gồm full-page reference + actual ở desktop 1440px và mobile 390px, kiểm tra overlay/visual diff, không horizontal overflow, keyboard/focus và text contrast. Không được kết luận PASS chỉ từ typecheck/unit test.
6. Chỉ dùng focused audit cho UI-03 sau Owner visual sign-off; không kéo lại audit toàn repo nếu không liên quan.

## Definition of Done

- Người xem đặt reference và actual cạnh nhau nhận ra cùng một thiết kế, không chỉ cùng màu cam.
- Thứ tự section, cấu trúc card, mật độ, khoảng trắng, typography và responsive hierarchy khớp demo.
- Không còn block thừa của UI-02.
- Toàn bộ nội dung biến thiên là dữ liệu thật; không có claim, logo hoặc con số bịa.
- Owner xem ảnh desktop/mobile và ký PASS trước khi task được ACCEPTED.

Tier 1 chỉ lập contract có thể thi hành và trình Owner duyệt. Không tự code UI trong lượt khảo sát.
