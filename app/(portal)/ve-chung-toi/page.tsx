export const metadata = {
  title: 'Về HRP — Hệ thống quản trị cung ứng nhân lực',
  description:
    'HRP là hệ thống quản trị cung ứng nhân lực toàn diện: từ khách hàng, nhu cầu tuyển, người lao động, chấm công, đối soát đến trả lương.',
};

const CARDS = [
  {
    icon: '🏢',
    title: 'Hệ quản trị HRP',
    desc: 'Toàn cảnh hệ thống: ba cổng (nội bộ, đối tác, người lao động), chuỗi nghiệp vụ từ bán hàng đến trả lương, nguyên tắc chống tranh chấp và lộ trình triển khai.',
    tag: 'Giới thiệu',
    tagStyle: 'ok',
    href: '/ve-hrp.html',
    more: 'Xem toàn cảnh →',
  },
  {
    icon: '💼',
    title: 'Việc làm đang tuyển',
    desc: 'Danh sách vị trí đang tuyển, nộp hồ sơ trực tuyến và tra cứu tình trạng hồ sơ bằng mã theo dõi.',
    tag: 'Đang tuyển',
    tagStyle: 'ok',
    href: '/jobs',
    more: 'Xem việc làm →',
  },
  {
    icon: '🧾',
    title: 'Tra cứu bảng công',
    desc: 'Tra cứu bảng công cá nhân và phiếu lương chi tiết theo mã thẻ — lịch chấm công từng ngày, tổng công, tăng ca, bảng lương A–E.',
    tag: 'Đã triển khai',
    tagStyle: 'ok',
    href: 'https://www.hrpvietnam.vn/',
    more: 'Tra cứu ngay →',
  },
];

export default function VeChungToiPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>

      {/* Hero */}
      <section className="py-16 md:py-20 px-6 md:px-[5%]" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="max-w-5xl mx-auto">
          {/* Kicker */}
          <div
            className="inline-block text-sm font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full"
            style={{
              color: 'var(--color-primary-dark)',
              backgroundColor: 'var(--color-primary-soft)',
              border: '1px solid var(--color-outline-variant)',
            }}
          >
            HRP — Hệ thống quản trị cung ứng nhân lực
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-5xl font-extrabold leading-tight mb-6"
            style={{ letterSpacing: '-0.02em', color: 'var(--color-on-surface)', maxWidth: '760px' }}
          >
            Một hệ thống cho toàn bộ nghiệp vụ{' '}
            <em className="not-italic" style={{ color: 'var(--color-primary)' }}>
              cung ứng nhân sự
            </em>
            .
          </h1>

          {/* Lede */}
          <p
            className="text-lg md:text-xl mb-8"
            style={{ color: 'var(--color-on-surface-variant)', maxWidth: '640px', lineHeight: 1.7 }}
          >
            Từ khách hàng, nhu cầu tuyển, người lao động, chấm công, đối soát — đến trả lương và hoa hồng.
            Mọi con số đã chốt là không sửa.
          </p>

          {/* CTA Row */}
          <div className="flex flex-wrap gap-3">
            <a
              href="/ve-hrp.html"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Tìm hiểu về HRP
            </a>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-6 md:px-[5%] pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CARDS.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="flex flex-col gap-3 rounded-2xl p-6 border border-outline-variant transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: 'var(--color-primary-soft)' }}
                >
                  {card.icon}
                </div>

                {/* Title */}
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-on-surface)' }}>
                  {card.title}
                </h2>

                {/* Description */}
                <p className="text-sm flex-1 leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {card.desc}
                </p>

                {/* Tag */}
                <div>
                  <span
                    className="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
                    style={
                      card.tagStyle === 'ok'
                        ? { backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)' }
                        : { backgroundColor: 'var(--color-warning-soft)', color: 'var(--color-warning)' }
                    }
                  >
                    {card.tag}
                  </span>
                </div>

                {/* More link */}
                <span className="text-sm font-semibold" style={{ color: 'var(--color-primary-dark)' }}>
                  {card.more}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-[5%] py-8 mt-auto" style={{ borderTop: '1px solid var(--color-line)' }}>
        <div
          className="max-w-5xl mx-auto flex flex-wrap justify-between gap-4 text-sm"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          <span>HRP — Hệ thống quản trị cung ứng nhân lực</span>
          <span>
            <a
              href="mailto:contact@hrpartner.vn"
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-primary-dark)' }}
            >
              Liên hệ
            </a>
          </span>
        </div>
      </footer>

    </div>
  );
}
