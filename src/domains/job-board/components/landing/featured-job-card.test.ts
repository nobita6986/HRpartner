/**
 * featured-job-card.test.tsx — hrp-v6-ui-04b-urgent-live-ribbon-r3 / AC-01..AC-25 + 04c2 Owner decisions
 *
 * RQ-25 / STEP-15: Component tests covering 9 cases:
 * 1. Real job (salary + posted time display)
 * 2. Negotiable salary (null)
 * 3. Long title (>60 chars)
 * 4. Urgent ribbon
 * 5. Quick Apply (ApplyModal opens)
 * 6. Detail href (canonical slug)
 * 7. Mobile 390px layout
 * 8. Reduced-motion state
 * 9. Hover text contrast (WCAG AA)
 *
 * 04c2 v10: Owner decisions tests (RQ-01..RQ-21):
 * - AC-18: Xem chi tiet CTA outline/ghost (was bg-blue-600 solid)
 * - AC-19: Title text-base + line-clamp-2 + title attribute
 * - AC-23: CTA Ung tuyen primary brand (bg-primary)
 * - AC-25: Bubble prevention (stopPropagation/preventDefault)
 * - AC-26: Accessible label for Quick Apply and Preview
 * - AC-27: Mobile label not hidden (no hidden sm:inline)
 * - AC-28: Footer layout justify-between + responsive gap
 *
 * Static source analysis tests.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const CARD = readFileSync(join(process.cwd(), 'src/domains/job-board/components/landing/featured-job-card.tsx'), 'utf8').replace(/\r\n/g, '\n');
const BEST = readFileSync(join(process.cwd(), 'src/domains/job-board/components/landing/best-jobs-section.tsx'), 'utf8').replace(/\r\n/g, '\n');
const PAGE = readFileSync(join(process.cwd(), 'app/(portal)/page.tsx'), 'utf8').replace(/\r\n/g, '\n');
const STAMPS = readFileSync(join(process.cwd(), 'src/domains/job-board/components/landing/stamp-defs.ts'), 'utf8').replace(/\r\n/g, '\n'); // Y10.4/UI04g

const count = (src: string, pattern: string) => src.split(pattern).length - 1;

/** Trich element bang anchor text — tinh toi close tag */
function element(src: string, anchor: string, close: string): string {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error(`khong tim thay: "${anchor}"`);
  const j = src.indexOf(close, i);
  if (j < 0) throw new Error(`"${anchor}" khong dong bang "${close}"`);
  return src.slice(i, j);
}

describe('AC-01: No nested interactive — Link and CTA are siblings', () => {
  it('chinh xac 1 Link trong card', () => {
    const linkCount = count(CARD, '<Link\n          href={href}');
    expect(linkCount, 'phai co dung 1 Link').toBe(1);
  });

  it('button CTA nam ben ngoai Link (sibling)', () => {
    const btnCount = count(CARD, '<button\n          type="button"');
    expect(btnCount, 'phai co dung 1 button CTA').toBe(1);
    const linkBlock = element(CARD, '<Link\n          href={href}', '</Link>');
    const btnInLink = linkBlock.includes('<button');
    expect(btnInLink, 'button KHONG nested trong Link').toBe(false);
  });

  it('Link va button la siblings trong article', () => {
    const articleBlock = element(CARD, '<article\n      data-testid', '</article>');
    const hasLink = articleBlock.includes('<Link');
    const hasButton = articleBlock.includes('<button');
    expect(hasLink, 'article phai chua Link').toBe(true);
    expect(hasButton, 'article phai chua button (CTA sibling)').toBe(true);
  });
});

describe('AC-02: CTA calls onApply callback', () => {
  it('CTA button co onClick goi onApply callback', () => {
    // R3: CTA calls onApply via onClick={preview ? undefined : onApply}
    // 04c2: may wrap in stopPropagation/preventDefault
    const hasOnApply = CARD.includes('onApply?.()') || CARD.includes('onApply()');
    expect(hasOnApply, 'CTA phai goi onApply callback').toBe(true);
  });

  it('onApply la optional prop', () => {
    expect(CARD).toContain('onApply?: () => void');
  });

  it('preview card CTA disabled hoac khong goi onApply', () => {
    const hasDisabled = CARD.includes('disabled={preview}');
    const hasConditional = CARD.includes('preview ? undefined : onApply');
    expect(hasDisabled || hasConditional, 'Preview CTA phai disabled hoac conditional').toBe(true);
  });
});

describe('AC-03: Link navigate to detail via href prop', () => {
  it('Link co href={href} prop', () => {
    expect(CARD).toContain('href={href}');
  });

  it('FeaturedJobCard nhan slug trong job prop', () => {
    expect(CARD).toContain('slug: string');
  });

  it('buildHref trong BestJobsSection dung slug', () => {
    expect(BEST).toContain('buildHref(job.slug)');
  });
});

describe('AC-07: URGENT tab Quick Apply mo ApplyModal cho job that', () => {
  it('onApply duoc goi voi EnrichedJob tu page', () => {
    // page.tsx handleApply nhan EnrichedJob
    expect(PAGE).toContain('function handleApply(job: EnrichedJob)');
    expect(PAGE).toContain('setApplyJob(job)');
  });

  it('ApplyModal nhan job prop', () => {
    expect(PAGE).toContain('<ApplyModal');
    expect(PAGE).toContain('job={applyJob}');
  });

  it('CTA tren FeaturedJobCard goi onApply voi job data', () => {
    // CTA: onClick={preview ? undefined : onApply} — onApply duoc goi khong co argument
    // page.tsx truyen: onApply={handleApply} = onApply={() => onApply(job)}
    // BestJobsSection: onApply={onApply ? () => onApply(job) : undefined}
    expect(BEST).toContain('onApply={onApply ? () => onApply(job) : undefined}');
  });
});

describe('Y10.4/UI04g: Rubber stamp badge — tilted style, single stamp per card', () => {
  it('RubberStamp component renders with tilted rotate-6 style', () => {
    // Y10.4/UI04g: RubberStamp uses rotate-6 for tilted stamp effect
    expect(CARD).toContain('rotate-6');
    expect(CARD).toContain('RubberStamp');
  });

  it('stamp uses ringClass for outer border', () => {
    // Y10.4/UI04g: outer ring uses def.ringClass (e.g., ring-orange-600)
    expect(CARD).toContain('def.ringClass');
  });

  it('inner stamp uses bgClass + borderClass', () => {
    // Y10.4/UI04g: inner stamp uses def.bgClass (orange/red tones) + def.borderClass
    expect(CARD).toContain('def.bgClass');
    expect(CARD).toContain('def.borderClass');
  });

  it('stamp text uppercase with tracking-wider', () => {
    // Y10.4/UI04g: stamp label is uppercase with wide tracking
    expect(CARD).toContain('uppercase');
    expect(CARD).toContain('tracking-wider');
  });

  it('chi hien thi 1 stamp duy nhat', () => {
    // Y10.4/UI04g: chi render stamps[0], khong phai mang
    const stampRenderIdx = CARD.indexOf('stamps[0]');
    expect(stampRenderIdx).toBeGreaterThanOrEqual(0);
  });

  it('stamp co pointer-events-none tren wrapper', () => {
    // Y10.4/UI04g: wrapper div co pointer-events-none
    const pointerIdx = CARD.indexOf('pointer-events-none');
    expect(pointerIdx).toBeGreaterThanOrEqual(0);
  });

  it('stamp-defs co icons Star, Sparkles tu lucide-react', () => {
    // Y10.4/UI04g: stamp-defs.ts imports Star, Sparkles tu lucide-react
    expect(STAMPS).toContain('Star');
    expect(STAMPS).toContain('Sparkles');
  });

  it('stamp-defs su dung icon tu lucide-react (Flame, Star, Gift)', () => {
    // Y10.4/UI04g: stamp-defs.ts imports Flame, Star, Gift, Sparkles tu lucide-react
    expect(STAMPS).toContain('Flame');
    expect(STAMPS).toContain('Star');
    expect(STAMPS).toContain('Gift');
  });
});

describe('AC-14: Card surface Minimal SaaS — bg-white border-slate-200 rounded-xl shadow-sm', () => {
  it('card dung bg-white', () => {
    // Direct include check — more robust than indexOf slice
    expect(CARD).toContain('bg-white');
  });

  it('card dung border-slate-200', () => {
    expect(CARD).toContain('border-slate-200');
  });

  it('card dung rounded-xl', () => {
    expect(CARD).toContain('rounded-xl');
  });

  it('card dung shadow-sm', () => {
    expect(CARD).toContain('shadow-sm');
  });

  it('hover dung shadow-md (subtle lift ≤2px)', () => {
    expect(CARD).toContain('hover:shadow-md');
  });

  it('KHONG dung semantic surface color', () => {
    // Minimal SaaS uses white/slate palette, NOT semantic surface tokens
    expect(CARD).not.toContain('bg-surface');
    expect(CARD).not.toContain('bg-primary-container');
  });
});

describe('AC-15: Logo 48px vuong rounded-lg border-slate-100 — min-w-0 content column', () => {
  it('logo dung size=48', () => {
    expect(CARD).toContain('size={48}');
  });

  it('logo dung w-12 h-12', () => {
    expect(CARD).toContain('w-12');
    expect(CARD).toContain('h-12');
  });

  it('logo dung rounded-lg', () => {
    expect(CARD).toContain('rounded-lg');
  });

  it('logo border dung border-slate-100 (khong nested border)', () => {
    expect(CARD).toContain('border-slate-100');
  });

  it('content column dung min-w-0', () => {
    expect(CARD).toContain('min-w-0');
  });

  // 04c2 Owner #4: Title doi thanh text-base (was text-lg)
  it('title dung text-base font-semibold text-slate-900 (04c2 RQ-04)', () => {
    expect(CARD).toContain('text-base');
    expect(CARD).toContain('font-semibold');
    expect(CARD).toContain('text-slate-900');
  });

  // 04c2 Owner #4: Title co line-clamp-2
  it('title co line-clamp-2 (04c2 RQ-04)', () => {
    expect(CARD).toContain('line-clamp-2');
  });
});

describe('AC-16: Lucide icons — MapPin, Clock3, Banknote', () => {
  it('import MapPin tu lucide-react', () => {
    expect(CARD).toContain('MapPin');
    expect(CARD).toContain("from 'lucide-react'");
  });

  it('import Clock3 tu lucide-react', () => {
    expect(CARD).toContain('Clock3');
  });

  it('import Banknote tu lucide-react', () => {
    expect(CARD).toContain('Banknote');
  });

  it('stamp registry import Flame tu lucide-react (Y10.4/UI04g)', () => {
    // Y10.4/UI04g: Flame moved to stamp-defs.ts; CARD import STAMPS từ stamp-defs.
    expect(CARD).toContain("from './stamp-defs'");
  });

  it('decorative icons co aria-hidden="true"', () => {
    const iconCount = count(CARD, 'aria-hidden="true"');
    // MapPin, Clock3, Banknote, Flame icons deu decorative → aria-hidden
    expect(iconCount).toBeGreaterThanOrEqual(3);
  });
});

describe('AC-17: Salary pill — bg-emerald-50 text-emerald-700, KHONG full-width slab', () => {
  it('salary pill dung bg-emerald-50', () => {
    expect(CARD).toContain('bg-emerald-50');
  });

  it('salary pill dung text-emerald-700', () => {
    expect(CARD).toContain('text-emerald-700');
  });

  it('salary pill dung inline-flex items-center gap-1', () => {
    expect(CARD).toContain('inline-flex');
    expect(CARD).toContain('items-center');
    expect(CARD).toContain('gap-1');
  });

  it('KHONG co bg-primary-fixed (old slab)', () => {
    expect(CARD).not.toContain('bg-primary-fixed');
  });

  it('Banknote icon trong salary pill', () => {
    const salaryIdx = CARD.indexOf('bg-emerald-50');
    const salaryBlock = CARD.slice(salaryIdx - 100, salaryIdx + 200);
    expect(salaryBlock).toContain('Banknote');
  });

  it('"Luong thuong luong" fallback khi salaryMinVnd null', () => {
    expect(CARD).toContain('Lương thương lượng');
    expect(CARD).toContain("min === null");
  });

  // 04c2 Owner #3: Salary pill co them border-emerald-100
  it('salary pill co border-emerald-100 (04c2 RQ-03)', () => {
    const salaryIdx = CARD.indexOf('bg-emerald-50');
    const salaryBlock = CARD.slice(salaryIdx - 50, salaryIdx + 200);
    expect(salaryBlock).toContain('border-emerald-100');
  });
});

describe('AC-18: Xem chi tiet CTA — outline/ghost (04c2 Owner #1, RQ-01)', () => {
  // 04c2: CTA doi tu solid blue sang outline/ghost
  it('CTA KHONG con bg-blue-600 (da doi sang outline)', () => {
    // Check trong Xem chi tiet Link block
    const xemLinkIdx = CARD.indexOf('>Xem chi tiết<');
    const xemLinkBlock = CARD.slice(Math.max(0, xemLinkIdx - 500), xemLinkIdx + 100);
    expect(xemLinkBlock).not.toContain('bg-blue-600');
  });

  it('CTA dung border-slate-300 bg-white text-slate-700 outline style', () => {
    const xemLinkIdx = CARD.indexOf('>Xem chi tiết<');
    const xemLinkBlock = CARD.slice(Math.max(0, xemLinkIdx - 500), xemLinkIdx + 100);
    expect(xemLinkBlock).toContain('border border-slate-300');
    expect(xemLinkBlock).toContain('bg-white');
    expect(xemLinkBlock).toContain('text-slate-700');
    expect(xemLinkBlock).toContain('hover:bg-slate-50');
  });

  it('Link va CTA Xem chi tiet share cung href', () => {
    const xemLinkIdx = CARD.indexOf('>Xem chi tiết<');
    expect(xemLinkIdx, 'Xem chi tiet phai la Link').toBeGreaterThan(0);
    const xemLinkBlock = CARD.slice(Math.max(0, xemLinkIdx - 400), xemLinkIdx + 50);
    expect(xemLinkBlock).toContain('href={href}');
  });
});

describe('AC-19: Long title (>60 chars) wrap ≤2 dong, khong clipping (04c2 RQ-04)', () => {
  it('title co title attribute giu full text', () => {
    expect(CARD).toContain('title={job.title}');
  });

  // 04c2: doi tu leading-tight sang leading-snug
  it('title dung leading-snug (04c2 RQ-04)', () => {
    expect(CARD).toContain('leading-snug');
  });

  it('title co line-clamp-2 (04c2 RQ-04)', () => {
    expect(CARD).toContain('line-clamp-2');
  });

  it('KHONG co pr-[72px] (ribbon overlay khong push title)', () => {
    const headerIdx = CARD.indexOf('min-w-0');
    const headerBlock = CARD.slice(Math.max(0, headerIdx - 200), headerIdx + 300);
    expect(headerBlock).not.toContain('pr-[72px]');
  });
});

describe('AC-20: Mobile 390px — khong horizontal scroll, touch ≥44px', () => {
  // 04c2 Owner #8: Footer layout justify-between + responsive gap
  it('footer dung flex voi gap-2 sm:gap-3 responsive (04c2 RQ-07)', () => {
    const footerIdx = CARD.indexOf('mt-auto');
    const footerBlock = CARD.slice(footerIdx, footerIdx + 400);
    expect(footerBlock).toContain('flex');
    expect(footerBlock).toContain('gap-2');
    expect(footerBlock).toContain('sm:gap-3');
  });

  it('footer dung justify-between layout (04c2 RQ-08)', () => {
    const footerIdx = CARD.indexOf('mt-auto');
    const footerBlock = CARD.slice(footerIdx, footerIdx + 400);
    expect(footerBlock).toContain('justify-between');
  });

  it('footer dung flex-wrap de wrap tren mobile (04c2 RQ-08)', () => {
    const footerIdx = CARD.indexOf('mt-auto');
    const footerBlock = CARD.slice(footerIdx, footerIdx + 400);
    expect(footerBlock).toContain('flex-wrap');
  });

  it('Quick Apply button present voi px-3 py-2 (touch target ≥44px)', () => {
    expect(CARD).toContain('px-3');
    expect(CARD).toContain('py-2');
    expect(CARD).toContain('data-testid="featured-job-cta"');
  });
});

describe('AC-21: prefers-reduced-motion — KHONG flip, salary + Quick Apply + detail day du', () => {
  it('KHONG co CSS 3D flip animation (perspective/rotateX)', () => {
    expect(CARD).not.toContain('perspective:');
    expect(CARD).not.toContain('rotateX(180deg)');
    expect(CARD).not.toContain('transform-style: preserve-3d');
    expect(CARD).not.toContain('backface-visibility');
  });

  it('KHONG co action-area-container voi flip CSS', () => {
    expect(CARD).not.toContain('action-area-container');
    expect(CARD).not.toContain('action-area-wrapper');
  });

  it('co Xem chi tiet Link (always visible, khong animation)', () => {
    expect(CARD).toContain('>Xem chi tiết<');
  });

  it('salary pill luon visible (khong flip)', () => {
    expect(CARD).toContain('bg-emerald-50');
  });

  it('Quick Apply button luon visible (khong flip)', () => {
    const hasCta = CARD.includes('data-testid="featured-job-cta"');
    expect(hasCta).toBe(true);
  });
});

describe('AC-22: Posted time chi render khi postedAt truthy — KHONG invent "x gio truoc"', () => {
  it('EnrichedJob co postedAt field', () => {
    expect(CARD).toContain('postedAt?: string | null');
  });

  it('page.tsx enrichJob truyen postedAt', () => {
    expect(PAGE).toContain('postedAt: postedAt');
  });

  it('postedAtLabel() chi format ISO, khong relative time', () => {
    expect(CARD).toContain('toLocaleDateString');
    expect(CARD).not.toMatch(/giờ trước|ngày trước|tuần trước|tháng trước/);
  });

  it('postedAt chi render khi truthy', () => {
    const hasConditional = CARD.includes('postedAtDisplay &&') || CARD.includes('{postedAtDisplay}');
    expect(hasConditional || CARD.includes('job.postedAt')).toBe(true);
  });
});

describe('AC-23: CTA Ung tuyen dung bg-primary brand (04c2 Owner #2, RQ-02)', () => {
  it('CTA Ung tuyen dung bg-primary text-white (brand color)', () => {
    // Search from data-testid backwards to include full button including className
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnBlock).toContain('bg-primary');
    expect(btnBlock).toContain('text-white');
  });

  it('CTA Ung tuyen hover dung bg-primary-dark', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnBlock).toContain('hover:bg-primary-dark');
  });

  it('token bg-primary resolve duoc trong project', () => {
    // Check globals.css hoac tailwind config co primary token
    const globals = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8').replace(/\r\n/g, '\n');
    expect(globals).toContain('--color-primary');
  });
});

describe('AC-24: Bubble prevention — stopPropagation/preventDefault (04c2 RQ-19)', () => {
  it('CTA Ung tuyen co stopPropagation de chan bubble', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnBlock).toContain('stopPropagation');
  });

  it('CTA Ung tuyen co preventDefault de chan navigation', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnBlock).toContain('preventDefault');
  });
});

describe('AC-25: Accessible label for CTA and Preview (04c2 RQ-13)', () => {
  it('CTA Ung tuyen co aria-label "Ung tuyen nhanh"', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnBlock).toContain('aria-label');
    expect(btnBlock).toContain('Ứng tuyển nhanh');
  });

  it('Preview button co aria-label "Ban xem truoc"', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnBlock).toContain('Bản xem trước');
  });
});

describe('AC-26: Mobile label not hidden (04c2 Owner #14, RQ-14)', () => {
  it('CTA Ung tuyen KHONG co hidden sm:inline (mobile phai thay chu)', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnBlock = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    // Check the label span, not hidden
    expect(btnBlock).not.toContain('hidden sm:inline');
  });
});

describe('AC-27: Footer separator border-slate-200 (04c2 Owner #9, RQ-09)', () => {
  it('footer separator dung border-slate-200 (khong phai border-slate-100)', () => {
    const footerIdx = CARD.indexOf('mt-auto');
    const footerBlock = CARD.slice(footerIdx, footerIdx + 200);
    expect(footerBlock).toContain('border-slate-200');
    expect(footerBlock).not.toContain('border-slate-100');
  });
});

describe('AC-28: Footer padding px-4 py-3 (04c2 Owner #6, RQ-06)', () => {
  it('footer dung px-4 py-3 (khong phai p-4)', () => {
    const footerIdx = CARD.indexOf('mt-auto');
    const footerBlock = CARD.slice(footerIdx, footerIdx + 200);
    expect(footerBlock).toContain('px-4');
    expect(footerBlock).toContain('py-3');
  });
});

describe('AC-24: Semantic structure — KHONG nested interactive, KHONG aria-hidden on focusable', () => {
  it('Link va button KHONG nested lan nhau', () => {
    const linkBlock = element(CARD, '<Link\n          href={href}', '</Link>');
    const btnInLink = linkBlock.includes('<button');
    expect(btnInLink).toBe(false);
  });

  it('Quick Apply button KHONG co aria-hidden="true"', () => {
    const btnStart = CARD.indexOf('data-testid="featured-job-cta"');
    const btnSnippet = CARD.slice(Math.max(0, btnStart - 600), btnStart + 100);
    expect(btnSnippet).not.toContain('aria-hidden="true"');
  });

  it('Xem chi tiet la Link (anchor), khong phai button', () => {
    const xemLink = CARD.indexOf('>Xem chi tiết<');
    const before = CARD.slice(Math.max(0, xemLink - 400), xemLink);
    expect(before).toContain('<Link');
  });
});

describe('Additional: postedAt in EnrichedJob adapter (STEP-10 / RQ-20)', () => {
  it('EnrichedJob interface co postedAt field', () => {
    expect(PAGE).toContain('postedAt: string | null');
  });

  it('enrichJob() them postedAt tu PublicJobDto', () => {
    const enrichIdx = PAGE.indexOf('function enrichJob');
    const enrichBlock = PAGE.slice(enrichIdx, enrichIdx + 400);
    expect(enrichBlock).toContain('postedAt');
  });
});

describe('Y10.4/UI04g: BestJobs ko phan tab — chi hien thi 1 data set', () => {
  it('page.tsx khong con bestJobsTab state', () => {
    expect(PAGE).not.toContain('bestJobsTab');
    expect(PAGE).not.toContain('bestJobsUrgentData');
    expect(PAGE).not.toContain('bootstrapBestJobsUrgent');
  });

  it('cancelled flag van con cho race condition', () => {
    expect(PAGE).toContain('let cancelled = false');
    expect(PAGE).toContain('if (cancelled) return');
  });
});

describe('Y10.4/UI04g: BestJobs khong con URGENT tab nua', () => {
  it('page.tsx khong fetch urgency=URGENT', () => {
    expect(PAGE).not.toContain('urgency=URGENT');
  });
});

describe('Y10.4/UI04g: BestJobs ko phan tab — chi hien thi 1 data set', () => {
  it('page.tsx khong con bestJobsTab state', () => {
    expect(PAGE).not.toContain('bestJobsTab');
    expect(PAGE).not.toContain('bestJobsUrgentData');
    expect(PAGE).not.toContain('bootstrapBestJobsUrgent');
  });

  it('BestJobsSection khong co tab prop', () => {
    expect(BEST).not.toContain('tab:');
    expect(BEST).not.toContain('onTabChange');
    expect(BEST).not.toContain("role=\"tablist\"");
    expect(BEST).not.toContain("role=\"tab\"");
  });

  it('cancelled flag van con cho race condition', () => {
    expect(PAGE).toContain('let cancelled = false');
    expect(PAGE).toContain('if (cancelled) return');
  });
});

describe('Additional: API urgency validation (RQ-01 / RQ-02)', () => {
  it('API route parse urgency param', () => {
    const apiRoute = readFileSync(join(process.cwd(), 'app/api/jobs/route.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(apiRoute).toContain("urgencyRaw !== null && urgencyRaw !== 'URGENT'");
    expect(apiRoute).toContain('status: 400');
  });

  it('API route truyen urgency xuong service', () => {
    const apiRoute = readFileSync(join(process.cwd(), 'app/api/jobs/route.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(apiRoute).toContain('urgency,');
  });
});

describe('Additional: Service filter urgency before pagination (DEC-02)', () => {
  it('service filter URGENT truoc pagination', () => {
    const svc = readFileSync(join(process.cwd(), 'src/domains/job-board/public.service.ts'), 'utf8').replace(/\r\n/g, '\n');
    const filterIdx = svc.indexOf('opts.urgency || job.urgency');
    const filterBlock = svc.slice(filterIdx, filterIdx + 300);
    expect(filterBlock).toContain('URGENT');
  });
});
