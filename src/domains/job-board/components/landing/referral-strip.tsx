const REFERRAL_HIGHLIGHTS = [
  'Đăng ký miễn phí, không cần kinh nghiệm tuyển dụng',
  'Hoa hồng minh bạch, thanh toán theo tháng',
  'Hỗ trợ HRP xử lý hồ sơ và phỏng vấn sơ tuyển',
  'Công cụ theo dõi ứng viên ngay trên điện thoại',
];

export function ReferralStrip() {
  return (
    <section
      id="register"
      data-section="ctv"
      aria-labelledby="hrp-ctv-heading"
      /* RQ-02 / STEP-03: Peach/cam nhạt background — dùng bg-primary-fixed (--color-primary-fixed = #ffdbce)
         với opacity để nhẹ hơn. Container giữ max-w-[1200px] trước VIS-06. */
      /* Y2: thu hẹp padding để liền mạch hơn */
      className="w-full bg-primary-fixed/20 px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-7xl (đồng bộ với Hero + SearchSection)
          hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-09):
          thêm `items-stretch` để 2 cột cao bằng nhau trên desktop, ảnh không
          vượt quá chiều cao cột chữ. */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-stretch gap-8 px-4 md:px-6 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-5">
          {/* Y10.8+: bỏ eyebrow "Cơ hội mới" — chỉ giữ heading + subheading. */}
          <h2
            id="hrp-ctv-heading"
            className="font-head text-headline-xl font-bold text-primary-container"
          >
            Chương trình Cộng tác viên
          </h2>
          <p className="font-head text-headline-md font-semibold text-secondary">
            Cùng HRP kết nối lao động với nhà máy
          </p>
          <ul className="flex flex-col gap-3 font-body text-body-md text-on-surface-variant">
            {REFERRAL_HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span
                  className="material-symbols-outlined mt-0.5 text-base text-primary"
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div>
            <a
              href="/#register"
              className="hrp-focus inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-label text-label-md font-bold text-on-primary shadow-card transition hover:bg-primary-dark"
            >
              Đăng ký cộng tác viên
            </a>
          </div>
        </div>
        {/* hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-09):
            Cột ảnh — desktop `h-full` để khớp chiều cao cột chữ; mobile/tablet
            tự nhiên (block). Ảnh `object-cover` để crop đẹp, không vượt khung.
            max-h-[420px] mobile ngăn ảnh quá khổ khi xếp dọc. */}
        <div className="relative min-h-0 overflow-hidden rounded-3xl shadow-card lg:h-full">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-tertiary-fixed opacity-50 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary-fixed-dim opacity-50 blur-3xl"
          />
          <img
            src="/images/homepage-huongb/referral-team.webp"
            alt="Đội ngũ cộng tác viên HRP"
            className="relative h-full max-h-[420px] w-full object-cover object-center lg:max-h-none"
            width={1024}
            height={768}
          />
        </div>
      </div>
    </section>
  );
}

export { ReferralInviteStrip } from '../referral-invite-strip';
