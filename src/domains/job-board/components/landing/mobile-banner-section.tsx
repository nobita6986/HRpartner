import { ArrowRight } from 'lucide-react';
import type { MobileBannerContentExtended } from '../../public-types';

/**
 * Section 5 — Banner trải nghiệm HRP trên di động (DEMO).
 *
 * Image left + copy right desktop; stack mobile. CTA `href='/viec-lam'`
 * (route thật). KHÔNG App Store/Google Play URL giả.
 *
 * HIDDEN nếu `enabled === false`.
 */
export function MobileBannerSection({ content }: { content: MobileBannerContentExtended }) {
  if (!content.enabled) return null;

  return (
    <section
      data-section="mobile-banner"
      data-source={content.source}
      aria-labelledby="hrp-mobile-banner-heading"
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-primary-fixed/40 via-primary-fixed/20 to-tertiary-fixed/30 shadow-card">
          <div className="grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-2 md:p-10">
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={content.imageUrl}
                alt={content.imageAlt}
                className="aspect-[4/3] w-full object-cover"
                width={800}
                height={600}
                loading="lazy"
              />
            </div>
            <div className="flex flex-col gap-4">
              <h2
                id="hrp-mobile-banner-heading"
                className="font-head text-headline-xl font-bold text-on-surface"
              >
                {content.title}
              </h2>
              <p className="font-body text-body-md text-on-surface-variant">
                {content.body}
              </p>
              <div>
                <a
                  href={content.ctaHref}
                  className="hrp-btn-primary hrp-focus nav-item-lift inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-3 font-label text-label-md font-semibold"
                >
                  {content.ctaText}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
