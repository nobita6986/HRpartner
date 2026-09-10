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
      /* STEP-07/RQ-01: Container max-w-[1200px] mx-auto px-4 md:px-6 */
      className="w-full px-4 md:px-6 py-12 md:py-16"
    >
      <div className="mx-auto w-full max-w-[1200px] grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="font-label text-label-sm font-bold uppercase tracking-widest text-secondary">
            Cơ hội mới
          </p>
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
        <div className="relative overflow-hidden rounded-3xl shadow-card">
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
            className="relative aspect-[4/3] w-full object-cover"
            width={1024}
            height={768}
          />
        </div>
      </div>
    </section>
  );
}

export { ReferralInviteStrip } from '../referral-invite-strip';
