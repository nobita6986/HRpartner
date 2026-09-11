import { Package, Users, Briefcase, Truck, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { HrpIntroContent, HrpValueItem } from '../../public-types';

/** Map iconName → Lucide component. Đặt ở scope module để không re-create. */
const ICON_MAP: Record<HrpValueItem['iconName'], LucideIcon> = {
  'package': Package,
  'users': Users,
  'briefcase': Briefcase,
  'truck': Truck,
  'shield-check': ShieldCheck,
};

/**
 * Section 2 — Giới thiệu HRP (DEMO).
 *
 * Split image/text 2 cột desktop, stack mobile. paragraphs: string[] render
 * trực tiếp bằng map → React elements. KHÔNG HTML string, KHÔNG raw HTML render.
 *
 * HIDDEN nếu `enabled === false`. Nội dung lấy từ 5 dịnh vụ HRP
 * (carousel hero) — chọn 4/5; KHÔNG chữ "demo" / "CMS pending" trên UI.
 *
 * v1.10 (11/09/2026): 4 value cards (2×2 từ `sm`). Ảnh full-height bằng
 * column content bên phải — bỏ `aspect-[4/3]`, thêm `h-full object-cover`
 * (grid items stretch mặc định).
 */
export function HrpIntroSection({ content }: { content: HrpIntroContent }) {
  if (!content.enabled) return null;

  return (
    <section
      data-section="hrp-intro"
      data-source={content.source}
      aria-labelledby="hrp-intro-heading"
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        {/* v1.10: items-stretch (mặc định) — image bên trái fill h-full khớp chiều cao content bên phải */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Image left — full height = right column */}
          <div className="relative overflow-hidden rounded-2xl shadow-card">
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-tertiary-fixed opacity-50 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary-fixed-dim opacity-50 blur-3xl"
            />
            <img
              src={content.imageUrl}
              alt={content.imageAlt}
              /* v1.10: bỏ aspect-[4/3] — h-full + object-cover để ảnh fill column,
                 khớp chiều cao với content + 4 cards bên phải */
              className="relative h-full min-h-72 w-full object-cover"
              width={1024}
              height={768}
              loading="lazy"
            />
          </div>

          {/* Text + values right */}
          <div className="flex flex-col gap-5">
            <h2
              id="hrp-intro-heading"
              className="font-head text-headline-xl font-bold text-on-surface"
            >
              {content.title}
            </h2>
            <div className="flex flex-col gap-3 font-body text-body-md text-on-surface-variant">
              {content.paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {content.values.map((value) => {
                const Icon = ICON_MAP[value.iconName];
                return (
                  <li
                    key={value.title}
                    className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/40 text-primary-dark">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-label text-label-md font-bold text-on-surface">
                        {value.title}
                      </span>
                      <span className="font-body text-label-sm text-on-surface-variant">
                        {value.body}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
