import { HrMonogram } from './hr-monogram';
import type { PartnerStripContent } from '../../public-types';

/**
 * Section 3 — Đối tác/minh họa (DEMO).
 *
 * 5 logo strip — đều dùng monogram HRP local (KHÔNG logo doanh nghiệp khác).
 * Container `max-w-7xl` desktop, scroll-snap ngang mobile.
 *
 * HIDDEN nếu `enabled === false` hoặc `partners.length === 0`.
 */
export function PartnerStripSection({ content }: { content: PartnerStripContent }) {
  if (!content.enabled) return null;
  if (content.partners.length === 0) return null;

  return (
    <section
      data-section="partner-strip"
      data-source={content.source}
      aria-labelledby="hrp-partner-strip-heading"
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-4 flex flex-col gap-2">
          <h2
            id="hrp-partner-strip-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            {content.title}
          </h2>
        </div>
        <ul
          className="flex list-none snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:pb-0"
          role="list"
          aria-label="Danh sách đối tác"
        >
          {content.partners.slice(0, 5).map((partner) => (
            <li
              key={partner.monogram}
              className="flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-outline-variant bg-white p-4 shadow-sm md:min-w-0"
            >
              <HrMonogram
                size={64}
                label={partner.monogram}
                className="w-16 h-16 rounded-xl border border-outline-variant bg-surface-container-low"
              />
              {partner.label && (
                <span className="font-label text-label-sm font-bold text-on-surface text-center">
                  {partner.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
