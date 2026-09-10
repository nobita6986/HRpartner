/**
 * featured-job-card.test.tsx — hrp-v6-ui-04b-job-card-interaction-r2 / AC-01, AC-02, AC-03, AC-10, AC-13.
 *
 * Static source analysis tests — repo không có @testing-library/react.
 * Component tests = phân tích nguồn (grep/read file) theo convention hiện hữu.
 *
 * AC-01: KHÔNG nested interactive element, CTA là sibling của Link
 * AC-02: CTA gọi onApply callback, không navigate
 * AC-03: Link href = /viec-lam/{slug}
 * AC-10: Keyboard — focus CTA, KHÔNG aria-hidden trên CTA có thể focus
 * AC-13: buildHref(job.slug) trong best-jobs-section.tsx
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const CARD = readFileSync(join(process.cwd(), 'src/domains/job-board/components/landing/featured-job-card.tsx'), 'utf8').replace(/\r\n/g, '\n');
const BEST = readFileSync(join(process.cwd(), 'src/domains/job-board/components/landing/best-jobs-section.tsx'), 'utf8').replace(/\r\n/g, '\n');

const count = (src: string, pattern: string) => src.split(pattern).length - 1;

/** Trích element bằng anchor text — tính tới close tag */
function element(src: string, anchor: string, close: string): string {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error(`khong tim thay: "${anchor}"`);
  const j = src.indexOf(close, i);
  if (j < 0) throw new Error(`"${anchor}" khong dong bang "${close}"`);
  return src.slice(i, j);
}

describe('AC-01: no nested interactive element — Link and CTA are siblings', () => {
  it('chinh xac 1 Link (anchor) trong card content area', () => {
    // Link bọc content có href="/viec-lam/${slug}"
    const linkCount = count(CARD, '<Link\n        href={href}');
    expect(linkCount, 'phải có đúng 1 Link cho card content').toBe(1);
  });

  it('button CTA nằm ben ngoài Link (sibling)', () => {
    // CTA button có type="button" — kiểm tra không nested trong anchor
    const btnCount = count(CARD, '<button\n              type="button"');
    expect(btnCount, 'phải có đúng 1 button CTA').toBe(1);

    // Button không nằm trong Link
    const linkBlock = element(CARD, '<Link\n        href={href}', '</Link>');
    const btnInLink = linkBlock.includes('<button');
    expect(btnInLink, 'button KHÔNG nested trong Link').toBe(false);
  });

  it('Link và button là con truc tiep cua article (siblings, không nested)', () => {
    // Article chứa Link và button như siblings
    const articleBlock = element(CARD, '<article\n      data-testid', '</article>');
    const hasLink = articleBlock.includes('<Link');
    const hasButton = articleBlock.includes('<button');
    expect(hasLink, 'article phải chứa Link').toBe(true);
    expect(hasButton, 'article phải chứa button (CTA sibling)').toBe(true);

    // Link và button KHÔNG nested: button xuất hiện SAU khi Link đóng
    const linkStart = articleBlock.indexOf('<Link');
    const linkEnd = articleBlock.indexOf('</Link>', linkStart);
    const buttonPos = articleBlock.indexOf('<button', linkStart);

    // button phải ở SAU Link đóng, không phải ở GIỮA <Link và </Link>
    const buttonAfterLinkClose = linkEnd >= 0 && buttonPos > linkEnd;
    expect(buttonAfterLinkClose, 'button phải là sibling của Link, không nested trong Link').toBe(true);
  });

  it('không có div với onClick để navigate', () => {
    // KHÔNG dùng div với onClick navigate (DEC-01)
    expect(CARD).not.toMatch(/onClick=\{.*router\./);
    expect(CARD).not.toMatch(/onClick=\{.*navigate\(/);
  });
});

describe('AC-02: CTA calls onApply callback, no navigate', () => {
  it('CTA button có onClick gọi onApply callback', () => {
    // CTA gọi props.onApply?.() — không navigate
    // Format thực: onClick={preview ? undefined : onApply}
    const hasOnApply = CARD.includes('onApply?.()') ||
                       CARD.includes('onApply()') ||
                       CARD.includes('onApply') && CARD.includes('onClick={preview');
    expect(hasOnApply, 'CTA phải gọi onApply callback').toBe(true);
  });

  it('CTA không gọi router.push hoặc navigate', () => {
    // CTA KHÔNG navigate — chỉ gọi onApply
    const ctaBlock = element(CARD, '<button\n              type="button"', '</button>');
    expect(ctaBlock).not.toMatch(/router\.|navigate\(|window\.location/);
  });

  it('onApply là optional prop trong interface', () => {
    expect(CARD).toContain('onApply?: () => void');
  });

  it('preview card CTA disabled khi click không gọi onApply', () => {
    // Preview CTA disabled={preview} hoặc onClick={preview ? undefined : onApply}
    const hasDisabled = CARD.includes('disabled={preview}');
    const hasConditional = CARD.includes('preview ? undefined : onApply');
    expect(hasDisabled || hasConditional, 'Preview CTA phải disabled hoặc conditional').toBe(true);
  });
});

describe('AC-03: Link navigate to /viec-lam/{slug}', () => {
  it('Link có href={href} với href prop', () => {
    // Link nhận href prop — href được truyền từ BestJobsSection
    const hasHref = CARD.includes('href={href}');
    expect(hasHref, 'Link phải có href={href} prop').toBe(true);
  });

  it('href prop được build bằng buildHref(job.slug) trong BestJobsSection', () => {
    // BestJobsSection truyền buildHref(job.slug) cho FeaturedJobCard
    const usesSlug = BEST.includes('buildHref(job.slug)') || BEST.includes('buildHref(jobId)') && BEST.includes('publicJobDetailPath(jobId)');
    // Hiện tại dùng buildHref(job.slug)
    expect(BEST).toContain('href={buildHref(job.slug)}');
  });

  it('slug được truyền từ job.slug, không phải job.id', () => {
    // BestJobsSection nhận job.slug và truyền vào FeaturedJobCard
    // FeaturedJobCard Link dùng href prop (slug-based)
    expect(BEST).toContain('job.slug');
    // FeaturedJobCard nhận slug trong job object
    expect(CARD).toContain('slug: string');
  });
});

describe('AC-10: keyboard accessibility — focus CTA, no aria-hidden', () => {
  it('CTA button có accessible name (text content hoặc aria-label)', () => {
    // CTA có aria-label="Ứng tuyển nhanh" hoặc text content
    const hasLabel = CARD.includes('aria-label={ctaLabel}') ||
                     CARD.includes('Ứng tuyển nhanh') ||
                     CARD.includes('Bản xem trước');
    expect(hasLabel, 'CTA phải có accessible name').toBe(true);
  });

  it('CTA button KHÔNG có aria-hidden="true" khi không disabled', () => {
    // KHÔNG dùng aria-hidden="true" trên CTA có thể focus (DEC-13 / RQ-05)
    // Format thực: button có aria-label={ctaLabel} nhưng KHÔNG có aria-hidden="true"
    // action-area-front và action-area-back có aria-hidden="false" (decorative elements)
    // nhưng button CTA KHÔNG có aria-hidden="true"
    const btnAnchor = CARD.indexOf('<button');
    const btnSnippet = CARD.slice(btnAnchor, btnAnchor + 300);
    const hasHiddenTrue = btnSnippet.includes('aria-hidden="true"');
    expect(hasHiddenTrue, 'CTA button KHÔNG được có aria-hidden="true"').toBe(false);
  });

  it('focus-visible outline được định nghĩa trên button', () => {
    // CTA có focus-visible styling
    const hasFocusStyle = CARD.includes('focus-visible:outline') || CARD.includes('focus-visible:ring');
    expect(hasFocusStyle, 'CTA button phải có focus-visible outline/ring').toBe(true);
  });

  it('article có hrp-focus class cho focus-within trigger', () => {
    expect(CARD).toContain('hrp-focus');
  });
});

describe('AC-13: buildHref(job.slug) usage — slug, not id', () => {
  it('BestJobsSection dùng buildHref(job.slug) cho FeaturedJobCard href', () => {
    expect(BEST).toContain('buildHref(job.slug)');
  });

  it('FeaturedJobCard nhận slug trong job prop', () => {
    expect(CARD).toContain('slug: string');
  });

  it('Link dùng href prop (slug-based URL), không dùng job.id', () => {
    // Link chỉ dùng href prop, URL được build bên ngoài
    expect(CARD).toContain('href={href}');
    // Không hardcode job.id trong href của FeaturedJobCard
    expect(CARD).not.toMatch(/href=\{.*job\.id.*\}/);
  });

  it('buildHref trong BestJobsSection dùng slug parameter', () => {
    // buildHref: (jobSlug: string) => string
    expect(BEST).toContain('buildHref: (jobSlug: string) => string');
  });
});

describe('Flip animation CSS structure', () => {
  it('có CSS 3D transform với perspective', () => {
    expect(CARD).toContain('perspective:');
  });

  it('có transform-style: preserve-3d', () => {
    expect(CARD).toContain('transform-style: preserve-3d');
  });

  it('có backface-visibility: hidden', () => {
    expect(CARD).toContain('backface-visibility: hidden');
  });

  it('có rotateX(180deg) cho mặt sau', () => {
    expect(CARD).toContain('rotateX(180deg)');
  });

  it('hover trigger: article:hover hoặc article:focus-within', () => {
    const hasHover = CARD.includes('article:is(:hover, :focus-within)') ||
                     CARD.includes('article:hover') ||
                     CARD.includes('.card:hover');
    expect(hasHover, 'phải có hover/focus-within trigger cho flip').toBe(true);
  });

  it('prefers-reduced-motion media query có mặt', () => {
    expect(CARD).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('Preview / DEMO card behavior', () => {
  it('CTA label thay đổi thành "Bản xem trước" cho preview card', () => {
    expect(CARD).toContain('Bản xem trước');
  });

  it('isPreview() phân biệt qua source === DEMO/INTEGRATION_PENDING', () => {
    const hasSourceCheck = CARD.includes("source === 'DEMO'") ||
                           CARD.includes("source === 'INTEGRATION_PENDING'");
    expect(hasSourceCheck, 'phải kiểm tra source cho preview').toBe(true);
  });

  it('Preview CTA disabled hoặc không gọi onApply', () => {
    const ctaBlock = element(CARD, '<button\n              type="button"', '</button>');
    const isDisabled = ctaBlock.includes('disabled={preview}');
    expect(isDisabled, 'Preview CTA phải disabled').toBe(true);
  });
});

describe('No-salary card: Lương thương lượng', () => {
  it('hiển thị "Lương thương lượng" khi salaryMinVnd === null', () => {
    expect(CARD).toContain('Lương thương lượng');
  });

  it('salaryLabel() xử lý null min/max', () => {
    const hasNullCheck = CARD.includes("min === null") && CARD.includes("'Lương thương lượng'");
    expect(hasNullCheck, 'salaryLabel phải trả "Lương thương lượng" khi min là null').toBe(true);
  });
});
