/**
 * /ve-chung-toi — Trang Giới thiệu công khai.
 *
 * hrp-t1a-introduce-hrp-and-menu-cleanup: re-creates the legacy public route
 * (deleted in a commit before this task's baseline). The page carries the
 * T0-supplied copy for "HRP Việt Nam" and "Sàn Việc Làm Miền Bắc".
 *
 * Server component (no client state). Uses the same public-portal chrome
 * (GlobalNavbar + GlobalFooter mounted by `app/(portal)/layout.tsx`).
 */
export const metadata = {
  title: 'Giới thiệu — HRP Việt Nam',
  description:
    'Công ty TNHH HRP Việt Nam — cung ứng, tuyển dụng, đào tạo và quản lý nhân sự. Sàn Việc Làm Miền Bắc — nền tảng kết nối tuyển dụng.',
};

export default function VeChungToiPage() {
  return (
    <main
      id="hrp-main"
      tabIndex={-1}
      className="flex w-full flex-col items-stretch gap-0"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      {/* Hero / tiêu đề trang */}
      <section
        className="w-full"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      >
        <div className="mx-auto w-full max-w-[1080px] px-4 py-12 md:px-6 md:py-16">
          <p
            className="font-label text-label-md font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-primary-dark)' }}
          >
            Giới thiệu
          </p>
          <h1
            className="mt-3 font-head text-headline-lg font-bold leading-tight md:text-headline-xl"
            style={{ color: 'var(--on-surface)' }}
          >
            HRP Việt Nam — Kết nối doanh nghiệp và người lao động
          </h1>
          <p
            className="mt-3 max-w-3xl font-body text-body-lg"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Cung ứng, tuyển dụng, đào tạo và quản lý nhân sự cho doanh nghiệp tại
            khu vực phía Bắc.
          </p>
        </div>
      </section>

      {/* Section 1: HRP Việt Nam */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-10 md:px-6 md:py-14">
          <h2
            className="font-head text-headline-sm font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            HRP Việt Nam – Kết nối doanh nghiệp và người lao động
          </h2>
          <div
            className="mt-4 space-y-4 font-body text-body-md md:text-body-lg"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            <p>
              Công ty TNHH HRP Việt Nam hoạt động trong lĩnh vực cung ứng, tuyển
              dụng, đào tạo và quản lý nhân sự. Với đội ngũ giàu kinh nghiệm
              cùng mạng lưới cộng tác viên tại nhiều tỉnh thành, HRP hướng tới
              việc đáp ứng nhanh chóng nhu cầu nhân lực, cung cấp đúng người,
              đúng việc và đồng hành lâu dài cùng doanh nghiệp cũng như người
              lao động.
            </p>
            <p>
              HRP cung cấp các giải pháp nhân sự từ lao động thời vụ, ngắn hạn
              và dài hạn đến tuyển dụng, đào tạo, thuê ngoài, quản lý và điều
              phối nhân lực tại nhà máy, công trường, kho bãi. Mỗi nhu cầu
              tuyển dụng được theo sát từ khâu tìm kiếm, sàng lọc đến hỗ trợ
              người lao động tiếp cận công việc phù hợp.
            </p>
            <p>
              Hoạt động của HRP được xây dựng trên các giá trị tận tâm, đạo
              đức, tôn trọng và tuân thủ. Công ty cam kết minh bạch, tuân thủ
              pháp luật lao động, chú trọng an toàn và bảo đảm quyền lợi chính
              đáng của người lao động.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Sàn Việc Làm Miền Bắc */}
      <section
        className="w-full"
        style={{ backgroundColor: 'var(--color-surface-container-low)' }}
      >
        <div className="mx-auto w-full max-w-[1080px] px-4 py-10 md:px-6 md:py-14">
          <h2
            className="font-head text-headline-sm font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            Sàn Việc Làm Miền Bắc
          </h2>
          <div
            className="mt-4 space-y-4 font-body text-body-md md:text-body-lg"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            <p>
              Sàn Việc Làm Miền Bắc là nền tảng kết nối tuyển dụng của HRP, giúp
              người lao động dễ dàng tìm kiếm các cơ hội việc làm rõ ràng, phù
              hợp tại khu vực phía Bắc. Thông tin tuyển dụng được trình bày
              trực quan, hỗ trợ người tìm việc xem chi tiết và gửi đơn ứng
              tuyển thuận tiện.
            </p>
            <p>
              Đối với doanh nghiệp, nền tảng giúp công bố nhu cầu tuyển dụng,
              tiếp cận ứng viên và phối hợp với HRP trong quá trình tuyển chọn
              nhân sự. Đây là cầu nối số giữa doanh nghiệp, HRP và người lao
              động, hướng tới một thị trường tuyển dụng minh bạch, nhanh chóng
              và bền vững.
            </p>
            <p>
              HRP Việt Nam không chỉ cung cấp nhân lực mà còn mong muốn trở
              thành người bạn đồng hành tin cậy, giúp doanh nghiệp ổn định sản
              xuất và giúp người lao động tìm được công việc phù hợp.
            </p>
          </div>

          {/* Quick links back to the rest of the portal */}
          <div
            className="mt-8 flex flex-wrap items-center gap-3 border-t pt-6"
            style={{ borderColor: 'var(--outline-variant)' }}
          >
            <a
              href="/viec-lam"
              className="hrp-btn-primary inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-label text-label-md font-semibold transition-colors"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              Xem việc làm
            </a>
            <a
              href="/ctv-portal"
              className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 font-label text-label-md font-medium transition-colors"
              style={{ borderColor: 'var(--outline)', color: 'var(--color-primary-dark)' }}
            >
              Trở thành Cộng tác viên
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
