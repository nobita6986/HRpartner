/**
 * sections-policy.test.ts — UI04d Task D v1.9 policy tests
 *
 * v1.9 (11/09/2026): Bỏ 3 section (NewestJobs, PartnerStrip, MobileBanner).
 * Test chỉ còn 2 section: HrpIntro (Về HRP) + News (Tin tức & Cẩm nang).
 *
 * Test trọng yếu:
 * - enabled === false → component return null
 * - DEMO source policy
 * - structured fixture hợp lệ
 * - NewsPreviewModal render từ structured content array
 * - composition: HrpIntro → RecruitingProjects → ReferralStrip → News
 *
 * Static source analysis + import-time typecheck + runtime behavior test.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();

const TYPES = readFileSync(join(ROOT, 'src/domains/job-board/public-types.ts'), 'utf8').replace(/\r\n/g, '\n');
const DEMO = readFileSync(join(ROOT, 'src/domains/job-board/fixtures/demo-content.ts'), 'utf8').replace(/\r\n/g, '\n');
const ARTICLES = readFileSync(join(ROOT, 'src/domains/job-board/components/landing/article-preview-data.ts'), 'utf8').replace(/\r\n/g, '\n');

const SECTION_FILES = {
  hrpIntro: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/hrp-intro-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  news: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/news-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  newsModal: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/news-preview-modal.tsx'), 'utf8').replace(/\r\n/g, '\n'),
} as const;

const PAGE = readFileSync(join(ROOT, 'app/(portal)/page.tsx'), 'utf8').replace(/\r\n/g, '\n');

/* ─── Typed view-model ─────────────────────────────────────────────── */

describe('typed view-model contract', () => {
  it('SectionSource enum exports REAL/DEMO/INTEGRATION_PENDING', () => {
    expect(TYPES).toContain("'REAL'");
    expect(TYPES).toContain("'DEMO'");
    expect(TYPES).toContain("'INTEGRATION_PENDING'");
  });

  it('v1.9 exports 2 view-models: HrpIntroContent, NewsSectionContent', () => {
    expect(TYPES).toMatch(/export\s+interface\s+HrpIntroContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+NewsSectionContent\b/);
  });

  it('v1.9 KHÔNG còn NewestJobsContent / PartnerStripContent / MobileBannerContentExtended', () => {
    expect(TYPES).not.toMatch(/export\s+interface\s+NewestJobsContent\b/);
    expect(TYPES).not.toMatch(/export\s+interface\s+PartnerStripContent\b/);
    expect(TYPES).not.toMatch(/export\s+interface\s+MobileBannerContentExtended\b/);
  });

  it('ArticleStructuredBlock có 3 type: paragraph | heading | list', () => {
    expect(TYPES).toMatch(/type:\s*'paragraph'/);
    expect(TYPES).toMatch(/type:\s*'heading'/);
    expect(TYPES).toMatch(/type:\s*'list'/);
  });
});

/* ─── Demo content fixture ─────────────────────────────────────────── */

describe('demo-content fixture', () => {
  it('v1.9 exports 2 view-model DEMO (hrpIntro, demoNewsSection)', () => {
    expect(DEMO).toMatch(/export\s+const\s+demoHrpIntro/);
    expect(DEMO).toMatch(/export\s+const\s+demoNewsSection/);
  });

  it('v1.9 KHÔNG còn demoPartnerStrip / demoMobileBanner', () => {
    expect(DEMO).not.toMatch(/export\s+const\s+demoPartnerStrip/);
    expect(DEMO).not.toMatch(/export\s+const\s+demoMobileBanner/);
  });

  it('mỗi view-model có enabled: true, order: <number>, source: DEMO', () => {
    const codeOnly = DEMO
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    const enabledCount = (codeOnly.match(/enabled:\s*true/g) ?? []).length;
    const sourceCount = (codeOnly.match(/source:\s*'DEMO'/g) ?? []).length;
    expect(enabledCount).toBe(2);
    expect(sourceCount).toBe(2);
  });

  it('v1.9: HrpIntroContent có đúng 3 value items (gọn lại từ 4)', () => {
    /* Đếm số iconName trong demoHrpIntro (chỉ 3, không phải 4). */
    const start = DEMO.indexOf('demoHrpIntro');
    /* Block demoHrpIntro kết thúc khi gặp export const tiếp theo hoặc EOF. */
    const endMatch = DEMO.slice(start).match(/export\s+const\s+demoNewsSection/);
    const end = endMatch ? start + endMatch.index! : DEMO.length;
    const block = DEMO.slice(start, end);
    const iconCount = (block.match(/iconName:/g) ?? []).length;
    expect(iconCount).toBe(3);
  });

  it('v1.9: imageUrl của HrpIntro là industrial-location-04.webp (không trùng ReferralStrip)', () => {
    expect(DEMO).toMatch(/imageUrl:\s*'\/images\/homepage-huongb\/industrial-location-04\.webp'/);
    /* Đảm bảo KHÔNG còn referral-team.webp trong demo-content (vì trùng ReferralStrip) */
    expect(DEMO).not.toMatch(/imageUrl:\s*'\/images\/homepage-huongb\/referral-team\.webp'/);
  });
});

/* ─── Article preview data ─────────────────────────────────────────── */

describe('article-preview-data fixture', () => {
  it('exports 3 articles', () => {
    const count = (ARTICLES.match(/id:\s*'/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('mỗi article body là structured content array (paragraph | heading | list)', () => {
    const types = ARTICLES.match(/type:\s*'(paragraph|heading|list)'/g) ?? [];
    expect(types.length).toBeGreaterThan(0);
    expect(types.some((t) => t.includes('paragraph'))).toBe(true);
    expect(types.some((t) => t.includes('heading'))).toBe(true);
    expect(types.some((t) => t.includes('list'))).toBe(true);
  });

  it('KHÔNG có HTML string trong body', () => {
    expect(ARTICLES).not.toMatch(/content:\s*'<[a-z]/);
  });
});

/* ─── Section components policy ────────────────────────────────────── */

describe('hrp-intro-section: DEMO policy + structured paragraphs render', () => {
  it('check enabled === false return null', () => {
    expect(SECTION_FILES.hrpIntro).toMatch(/if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/);
  });

  it('paragraphs render bằng map (KHÔNG HTML string)', () => {
    expect(SECTION_FILES.hrpIntro).toMatch(/content\.paragraphs\.map/);
    expect(SECTION_FILES.hrpIntro).not.toMatch(/dangerouslySetInnerHTML/);
    expect(SECTION_FILES.hrpIntro).not.toMatch(/SafeHtml/);
  });

  it('values items render (icon + title + body)', () => {
    expect(SECTION_FILES.hrpIntro).toMatch(/content\.values\.map/);
  });
});

describe('news-section + news-preview-modal: modal mở từ click, body structured', () => {
  it('news-section dùng useState cho selected article', () => {
    expect(SECTION_FILES.news).toMatch(/useState<ArticleCardExtended\s*\|\s*null>/);
    expect(SECTION_FILES.news).toMatch(/setSelected\(/);
  });

  it('news-section gọi setSelected khi click', () => {
    expect(SECTION_FILES.news).toMatch(/onClick=\{\(\)\s*=>\s*setSelected/);
  });

  it('news-preview-modal render body bằng switch trên type (paragraph/heading/list)', () => {
    expect(SECTION_FILES.newsModal).toMatch(/function\s+renderBlock\b/);
    expect(SECTION_FILES.newsModal).toMatch(/case\s+'paragraph'/);
    expect(SECTION_FILES.newsModal).toMatch(/case\s+'heading'/);
    expect(SECTION_FILES.newsModal).toMatch(/case\s+'list'/);
  });

  it('news-preview-modal KHÔNG dùng dangerouslySetInnerHTML / SafeHtml', () => {
    expect(SECTION_FILES.newsModal).not.toMatch(/dangerouslySetInnerHTML/);
    expect(SECTION_FILES.newsModal).not.toMatch(/SafeHtml/);
  });

  it('news-preview-modal đóng khi click overlay hoặc Esc', () => {
    expect(SECTION_FILES.newsModal).toMatch(/onClick=\{onClose\}/);
    expect(SECTION_FILES.newsModal).toMatch(/e\.key\s*===\s*'Escape'/);
  });
});

/* ─── Composition: page.tsx ──────────────────────────────────────────── */

describe('composition: HrpIntro → RecruitingProjects → ReferralStrip → News', () => {
  it('chèn đúng 2 section component vào page.tsx', () => {
    expect(PAGE).toMatch(/<HrpIntroSection/);
    expect(PAGE).toMatch(/<NewsSection/);
  });

  it('v1.9 KHÔNG còn NewestJobsSection / PartnerStripSection / MobileBannerSection', () => {
    expect(PAGE).not.toMatch(/<NewestJobsSection\b/);
    expect(PAGE).not.toMatch(/<PartnerStripSection\b/);
    expect(PAGE).not.toMatch(/<MobileBannerSection\b/);
    /* Và không import chúng */
    expect(PAGE).not.toMatch(/import\s*\{\s*NewestJobsSection/);
    expect(PAGE).not.toMatch(/import\s*\{\s*PartnerStripSection/);
    expect(PAGE).not.toMatch(/import\s*\{\s*MobileBannerSection/);
  });

  it('v1.9: Section 2..3 dùng fixture demo-content (chỉ demoHrpIntro + demoNewsSection)', () => {
    expect(PAGE).toMatch(/demoHrpIntro/);
    expect(PAGE).toMatch(/demoNewsSection/);
    expect(PAGE).not.toMatch(/demoPartnerStrip/);
    expect(PAGE).not.toMatch(/demoMobileBanner/);
  });

  it('thứ tự section theo v1.9: Areas → HrpIntro → RecruitingProjects → ReferralStrip → News', () => {
    const areas = PAGE.indexOf('<AreasSection');
    const hrpIntro = PAGE.indexOf('<HrpIntroSection');
    const recruiting = PAGE.indexOf('<RecruitingProjectsSection');
    const referral = PAGE.indexOf('<ReferralStrip');
    const news = PAGE.indexOf('<NewsSection');
    expect(areas).toBeGreaterThan(0);
    expect(hrpIntro).toBeGreaterThan(areas);
    expect(recruiting).toBeGreaterThan(hrpIntro);
    expect(referral).toBeGreaterThan(recruiting);
    expect(news).toBeGreaterThan(referral);
  });
});
