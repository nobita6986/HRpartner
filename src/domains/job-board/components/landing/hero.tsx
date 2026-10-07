interface HeroProps {
  children?: React.ReactNode;
  className?: string;
  /**
   * hrp-t2-public-site-hotfix (T2 / STEP-06): URL ảnh nền Admin chọn ở
   * HomepageSettings. Khi `null` (mặc định) Hero chỉ gradient như v1. Khi
   * set, render `<img>` layer absolute + giữ gradient overlay để chữ vẫn
   * đọc rõ. Alt text lấy từ caller (Admin đã nhập ở Media library) để
   * screen reader không đọc vào image trống.
   */
  backgroundImage?: { url: string; alt: string } | null;
}

export function Hero({ children, className = '', backgroundImage = null }: HeroProps) {
  return (
    <section
      data-section="hero"
      aria-label="Giới thiệu và tìm việc nhanh"
      className={`relative w-full overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-fixed text-on-primary ${className}`}
    >
      {/* hrp-t2-public-site-hotfix (T2 / STEP-06): ảnh nền Admin chọn.
          Render absolute layer dưới overlay gradient; <img> (không phải
          background-image CSS) để SEO/lighthouse đọc được alt. */}
      {backgroundImage ? (
        <img
          src={backgroundImage.url}
          alt={backgroundImage.alt}
          aria-hidden={backgroundImage.alt === '' ? 'true' : 'false'}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          /* Render PHÍA SAU các blob overlay để chữ vẫn đọc rõ. */
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-fixed-dim opacity-30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-tertiary-fixed opacity-30 blur-3xl"
      />
      {/* hrp-t2-public-site-hotfix (T2 / STEP-06): overlay tối hơn khi có
         ảnh nền để giữ WCAG AA contrast cho text-on-primary. Khi không
         có ảnh, overlay rỗng (v1). */}
      {backgroundImage ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-primary-dark/55"
        />
      ) : null}
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-7xl (đồng bộ với SearchSection + body)
          Y10.7/UI04k r2: giảm padding đồng bộ với các section khác (pb-8 pt-4 md:pb-10 md:pt-6) */}
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6">
        <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center">
          {children}
        </div>
      </div>
    </section>
  );
}
