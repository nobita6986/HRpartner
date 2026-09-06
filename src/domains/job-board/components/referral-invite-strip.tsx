/**
 * Dải mời cộng tác viên trên trang chủ công khai — ui-01 / RQ-10 / DEC-05.
 *
 * Vì sao là MỘT dải TRỎ đi, không phải bản sao của `ReferralSection` bên
 * `new-ui/`: bản mẫu ấy in hai con số tiền (`+…VNĐ` trên hai badge) mà không có
 * một cột nào trong `PublicJobDto` hay `PublicJobOverview` sinh ra chúng. `R-03`
 * cấm in số không nguồn lên bề mặt công khai, nên hai badge bị XOÁ chứ không
 * được đổi màu hay hạ cỡ chữ. Điều kiện và mức hoa hồng đã có văn công bố ở
 * `/ctv-portal`; dải này chỉ dẫn người đọc tới đó. Tệp này không chứa một con
 * số TIỀN nào — những chữ số còn lại đều là hình học của khối `<svg>` và hai
 * class `w-11 h-11`, không phải một khẳng định về thu nhập.
 *
 * Vì sao MỌI câu trong dải đều là câu đã có ở trang `/ctv-portal`: `RISK-08` chỉ
 * cho phép trỏ về văn đã công bố, nên bốn dòng chữ ở đây được lấy đúng từ năm
 * bước công bố tại `app/(portal)/ctv-portal/page.tsx` — "Đăng ký tham gia" (bước
 * 1, cộng nút "miễn phí" của trang ấy), "Theo dõi trạng thái ứng viên trên hệ
 * thống" (bước 4), "Nhận hoa hồng cho mỗi ứng viên đi làm đủ thời gian theo quy
 * định" (bước 5). Ba tính năng mà bản nháp đầu của tệp này tự nhận — liên kết
 * riêng cho từng đơn tuyển, trạng thái theo từng người được giới thiệu, đối
 * chiếu hoa hồng theo kỳ — KHÔNG có trong văn công bố ấy và cũng chưa có mã, nên
 * đã bị bỏ. Nhãn nút là "Tìm hiểu", không phải "Trở thành", vì cú nhấn mở một
 * trang giới thiệu chứ không tạo tài khoản.
 *
 * Vì sao đứng RIÊNG một tệp chứ không viết thẳng vào `app/(portal)/page.tsx`:
 * ba hàng rào canh trang chủ ghim đếm CHÍNH XÁC trên tệp ấy — `hrp-focus` đúng
 * `12` lượt, `min-h-11` đúng `10` lượt, thẻ `material-symbols-outlined` đúng `9`
 * lượt, `relative z-10` đúng `4` lượt. Một dải mới có vòng focus và đích chạm
 * `44px` sẽ làm lệch cả ba con số ấy nếu nằm cùng tệp. Tách ra là cách giữ
 * ĐỒNG THỜI `AC-06` (mốc `111` test) và `R-07` (đích chạm không nhỏ hơn 44×44).
 *
 * Vì sao không có `'use client'`: dải không giữ trạng thái, không hook, không
 * bắt sự kiện. Trang cha đã là client component nên tệp này vẫn vào bundle ấy;
 * thêm chỉ thị chỉ để cho giống ba tệp bên cạnh là thêm một biên vô nghĩa.
 *
 * Vì sao hình trang trí là SVG viết tay: `DEC-09` khoá `0` URL ngoài mới, và
 * `DEC-12` cấm `next/image`. Khối `<svg>` dùng `currentColor` nên nó không gọi
 * một custom property nào — `design-tokens.static.test.ts` quét mọi lượt gọi
 * hàm `var` trong cây `app` và `src`, và một biến chết ở đây sẽ làm hàng rào ấy
 * đỏ. Bản đầu của chính dòng này viết thẳng một ví dụ gọi hàm ấy ra mặt chữ và
 * bị hàng rào bắt tại dòng `37`: nó đọc VĂN BẢN tệp chứ không phân biệt bình
 * luận với mã, nên một ví dụ trong bình luận cũng là một lượt gọi dưới mắt nó.
 */
import Link from 'next/link';

export function ReferralInviteStrip() {
  return (
    <section
      aria-labelledby="hrp-ctv-invite-heading"
      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8"
    >
      <div className="flex items-start gap-4">
        {/* Trang trí thuần: thẻ mang aria-hidden nên trình đọc màn hình bỏ qua,
            và không có văn bản nào chỉ tồn tại trong hình. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-11 h-11 shrink-0 text-primary"
        >
          <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20" />
          <path d="M16.5 10.5h5" />
          <path d="M19 8v5" />
        </svg>

        <div className="flex flex-col gap-2">
          <h2
            id="hrp-ctv-invite-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            Giới thiệu ứng viên, nhận hoa hồng
          </h2>

          <p className="font-body text-body-lg text-on-surface">
            Giới thiệu ứng viên phù hợp với đơn tuyển đang mở, theo dõi trạng thái ứng viên trên hệ
            thống và nhận hoa hồng theo quy định đã công bố.
          </p>

          <ul className="flex flex-col gap-1 md:flex-row md:flex-wrap md:gap-x-6">
            <li className="font-label text-label-md text-on-surface">
              Đăng ký tham gia miễn phí
            </li>
            <li className="font-label text-label-md text-on-surface">
              Theo dõi trạng thái ứng viên trên hệ thống
            </li>
            <li className="font-label text-label-md text-on-surface">
              Nhận hoa hồng cho mỗi ứng viên đi làm đủ thời gian
            </li>
          </ul>

          {/* Không hứa thu nhập bằng con số ở đây: `RISK-08` chỉ cho phép trỏ về
              văn đã công bố. */}
          <p className="font-label text-label-sm text-on-surface-variant">
            Năm bước tham gia và điều kiện nhận hoa hồng công bố tại cổng cộng tác viên.
          </p>
        </div>
      </div>

      <Link
        href="/ctv-portal"
        className="hrp-btn-primary nav-item-lift hrp-focus font-label text-label-md font-semibold inline-flex items-center justify-center px-6 min-h-11 rounded-lg whitespace-nowrap shrink-0"
      >
        Tìm hiểu chương trình cộng tác viên
      </Link>
    </section>
  );
}
