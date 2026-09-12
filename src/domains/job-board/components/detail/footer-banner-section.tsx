/**
 * footer-banner-section.tsx — UI04d D.A
 *
 * Banner cuối trang chi tiết: image + CTA. source: DEMO.
 */
import Link from 'next/link';
import type { FooterBannerContent } from '../../public-types';

export function FooterBannerSection({ content }: { content: FooterBannerContent }) {
  if (!content.enabled) return null;

  return (
    <section
      data-section="footer-banner"
      data-source={content.source}
      aria-label="Khám phá thêm"
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="aspect-[16/9] lg:aspect-auto overflow-hidden">
          <img
            src={content.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-5 flex flex-col justify-center gap-3">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-on-surface)' }}>
            Tìm thêm cơ hội việc làm
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
            Khám phá hàng trăm vị trí tuyển dụng phù hợp với bạn.
          </p>
          <Link
            href={content.ctaHref}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold self-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: 'var(--color-primary-dark)',
              color: 'var(--color-on-primary)',
            }}
          >
            {content.ctaLabel}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
