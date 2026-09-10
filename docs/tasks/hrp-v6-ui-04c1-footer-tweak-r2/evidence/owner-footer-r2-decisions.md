# Owner decisions — Footer tweak r2

Ngày: 10/09/2026  
Áp dụng cho: `hrp-v6-ui-04c1-footer-tweak-r2`

## Kết quả 16 lựa chọn

1. **Tone màu peach — ĐỔI.** Giữ họ cam/peach của HuongB nhưng tăng độ hiện diện thêm một bậc so với `bg-primary-fixed/20`. Ưu tiên semantic token/class hiện có như `bg-primary-fixed/35` hoặc mức tương đương; không hardcode hex. Footer vẫn là nền sáng, không chuyển toàn footer sang nâu đậm.
2. **Thứ tự cột desktop — GIỮ:** Công ty → Dịch vụ → Liên hệ. Cho phép chỉnh tỷ lệ cột để cột Công ty và form không bị chật; không bắt buộc ba cột bằng nhau.
3. **Mobile stack — GIỮ:** Công ty → Dịch vụ → Liên hệ.
4. **Danh sách 5 dịch vụ — GIỮ nguyên nội dung.** Chỉnh typography, icon và spacing để dễ đọc.
5. **Hotline — GIỮ:** `0211 2216999` và `0964 984 866`, giữ hai `tel:` link thật.
6. **Email — GIỮ:** `nhaluchrp@gmail.com`, giữ `mailto:`.
7. **Website — GIỮ:** `https://hrpvietnam.com/`, mở tab mới với `noopener noreferrer`.
8. **Địa chỉ Phú Thọ — GIỮ nguyên nội dung hiện có.**
9. **ContactForm — GIỮ disabled.** Backend gửi liên hệ thuộc task riêng; footer r2 không mở API hoặc persistence.
10. **Helper text — ĐỔI copy:** `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` Bỏ câu mang tính kỹ thuật `Tính năng đang được hoàn thiện` khỏi bề mặt chính.
11. **CTA — GIỮ nhãn `GỬI NGAY`.** CTA vẫn disabled và phải có trạng thái disabled dễ hiểu, không giả vờ submit thành công.
12. **Copyright — ĐỔI thành:** `© {năm hiện hành} HRP Việt Nam. Connecting for Success.` Năm lấy runtime; không phục hồi `Phiên bản 6.0 — thiết kế bởi HRP Studio`.
13. **Route thật — GIỮ:** `/ve-chung-toi` và `/ctv-portal`.
14. **Điều khoản / Chính sách bảo mật / Liên hệ chưa có route — ĐỔI semantic:** không render thành `<button>` giả. Dùng text/span có `aria-disabled="true"` và nhãn trạng thái ngắn khi cần; không tạo link `href="#"` và không mở route mới trong task này.
15. **Touch target/mobile spacing — CHỈNH:** các link/action thật đạt tối thiểu 44px trên touch; mobile padding/gap gọn nhưng không dính chữ, không horizontal scroll tại 390px.
16. **Container — GIỮ:** `max-w-[1080px] mx-auto`, gutter `px-4 md:px-6`.

## Visual direction bổ sung

- Kết hợp hai reference Owner đã cung cấp: nền footer peach sáng, thanh thoát theo HuongB; thông tin Công ty/Dịch vụ/Form lấy từ footer mẫu HRP.
- Heading cột dùng copy rõ ràng:
  - `CÔNG TY TNHH HRP VIỆT NAM`
  - `DANH MỤC DỊCH VỤ`
  - `THÔNG TIN LIÊN HỆ`
- Cột liên hệ tạo thành một panel nổi nhẹ, bo góc, dùng sắc cam ấm đậm hơn nền footer. Không dùng viền dày hoặc shadow nặng.
- Input giữ nền trắng hoặc gần trắng để đọc rõ. Có thể dùng label `sr-only` và placeholder nhìn thấy để form gọn hơn, nhưng accessible name phải còn đầy đủ.
- Dùng Lucide icons đã có trong dự án cho thông tin công ty/dịch vụ nếu cần; không thêm package icon mới.
- Bottom bar gọn, copyright là trọng tâm. Không lặp lại dày đặc cùng một nhóm link ở nhiều cột.

## Boundary và gate

- Chỉ style, copy và semantic markup trong footer/ContactForm; không mở backend.
- Lane giữ `FAST` nếu Tier 1 khóa đúng phạm vi trên.
- Owner live visual review là visual gate sau triển khai.
- Sau khi nhận file này, Tier 1 phải thay toàn bộ placeholder trong TASK, bump `v1.0`, chạy `verify-task.ps1`; PASS thì được chuyển `READY_FOR_EXECUTION` mà không hỏi lại 16 lựa chọn.
