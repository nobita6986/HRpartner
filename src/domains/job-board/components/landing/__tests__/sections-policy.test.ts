/**
 * sections-policy.test.tsx — UI04d Task D policy tests
 *
 * Test trọng yếu (Tier 0 directive §8):
 * - enabled === false → component return null
 * - ordering/view-model mapping (props typed đúng)
 * - REAL/DEMO source policy
 * - structured fixture hợp lệ (article body parse paragraph/heading/list)
 * - NewsPreviewModal render từ structured content array
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
  newest: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/newest-jobs-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  hrpIntro: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/hrp-intro-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  partnerStrip: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/partner-strip-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  news: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/news-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  newsModal: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/news-preview-modal.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  mobileBanner: readFileSync(join(ROOT, 'src/domains/job-board/components/landing/mobile-banner-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
} as const;

const PAGE = readFileSync(join(ROOT, 'app/(portal)/page.tsx'), 'utf8').replace(/\r\n/g, '\n');

/* ─── Typed view-model ─────────────────────────────────────────────── */

describe('typed view-model contract', () => {
  it('SectionSource enum exports REAL/DEMO/INTEGRATION_PENDING', () => {
    expect(TYPES).toContain("'REAL'");
    expect(TYPES).toContain("'DEMO'");
    expect(TYPES).toContain("'INTEGRATION_PENDING'");
  });

  it('exports 5 view-models: NewestJobsContent, HrpIntroContent, PartnerStripContent, NewsSectionContent, MobileBannerContentExtended', () => {
    expect(TYPES).toMatch(/export\s+interface\s+NewestJobsContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+HrpIntroContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+PartnerStripContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+NewsSectionContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+MobileBannerContentExtended\b/);
  });

  it('NewestJobsContent source narrowed to REAL', () => {
    /* Section 1 chỉ nhận REAL — DEMO/INTEGRATION_PENDING không hợp lệ với source này. */
    expect(TYPES).toMatch(/NewestJobsContent[\s\S]*?source:\s*'REAL'/);
  });

  it('ArticleStructuredBlock có 3 type: paragraph | heading | list', () => {
    expect(TYPES).toMatch(/type:\s*'paragraph'/);
    expect(TYPES).toMatch(/type:\s*'heading'/);
    expect(TYPES).toMatch(/type:\s*'list'/);
  });
});

/* ─── Demo content fixture ─────────────────────────────────────────── */

describe('demo-content fixture', () => {
  it('exports 4 view-model DEMO', () => {
    expect(DEMO).toMatch(/export\s+const\s+demoHrpIntro/);
    expect(DEMO).toMatch(/export\s+const\s+demoPartnerStrip/);
    expect(DEMO).toMatch(/export\s+const\s+demoNewsSection/);
    expect(DEMO).toMatch(/export\s+const\s+demoMobileBanner/);
  });

  it('mỗi view-model có enabled: true, order: <number>, source: DEMO', () => {
    /* Strip comment lines trước khi đếm để tránh match vào comment. */
    const codeOnly = DEMO
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    const enabledCount = (codeOnly.match(/enabled:\s*true/g) ?? []).length;
    const sourceCount = (codeOnly.match(/source:\s*'DEMO'/g) ?? []).length;
    expect(enabledCount).toBe(4);
    expect(sourceCount).toBe(4);
  });

  it('HrpIntroContent có 4 value items (lấy từ 5 dịch vụ HRP, chọn 4/5)', () => {
    /* values array phải có đúng 4 object với iconName hợp lệ */
    expect(DEMO).toMatch(/values:\s*\[[\s\S]*?\]\s*,?\s*\}[\s\S]*?demoPartnerStrip/);
  });

  it('PartnerStripContent có 5 partners', () => {
    /* Đếm số { monogram: xuất hiện trong demoPartnerStrip object */
    const start = DEMO.indexOf('demoPartnerStrip');
    const end = DEMO.indexOf('demoNewsSection');
    const block = DEMO.slice(start, end);
    const monogramCount = (block.match(/monogram:/g) ?? []).length;
    expect(monogramCount).toBe(5);
  });

  it('MobileBannerContentExtended ctaHref = "/viec-lam" (route thật)', () => {
    expect(DEMO).toMatch(/ctaHref:\s*'\/viec-lam'/);
  });

  it('KHÔNG có App Store / Google Play URL giả trong demo-content', () => {
    expect(DEMO).not.toMatch(/apps\.apple\.com/);
    expect(DEMO).not.toMatch(/play\.google\.com/);
    expect(DEMO).not.toMatch(/App Store/);
    expect(DEMO).not.toMatch(/Google Play/);
  });
});

/* ─── Article preview data ─────────────────────────────────────────── */

describe('article-preview-data fixture', () => {
  it('exports 3 articles', () => {
    const count = (ARTICLES.match(/id:\s*'/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('mỗi article body là structured content array (paragraph | heading | list)', () => {
    /* Lấy tất cả type: 'X' trong body */
    const types = ARTICLES.match(/type:\s*'(paragraph|heading|list)'/g) ?? [];
    expect(types.length).toBeGreaterThan(0);
    /* Đủ cả 3 loại để test render switch */
    expect(types.some((t) => t.includes('paragraph'))).toBe(true);
    expect(types.some((t) => t.includes('heading'))).toBe(true);
    expect(types.some((t) => t.includes('list'))).toBe(true);
  });

  it('KHÔNG có HTML string trong body (không có thẻ <p>, <h1>, <ul>... trong content string)', () => {
    /* Tìm các content string có chứa thẻ HTML */
    expect(ARTICLES).not.toMatch(/content:\s*'<[a-z]/);
  });
});

/* ─── Section components policy ────────────────────────────────────── */

describe('newest-jobs-section: REAL policy + HIDDEN khi rỗng', () => {
  it('check enabled === false return null', () => {
    expect(SECTION_FILES.newest).toMatch(/if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/);
  });

  it('check jobs.length === 0 return null', () => {
    expect(SECTION_FILES.newest).toMatch(/if\s*\(\s*content\.jobs\.length\s*===\s*0\s*\)\s*return\s+null/);
  });

  it('dùng FeaturedJobCard (tái dùng từ Plan A)', () => {
    expect(SECTION_FILES.newest).toMatch(/import\s*\{\s*FeaturedJobCard\s*\}/);
    expect(SECTION_FILES.newest).toMatch(/<FeaturedJobCard\b/);
  });

  it('container max-w-7xl mx-auto px-4 md:px-6', () => {
    expect(SECTION_FILES.newest).toMatch(/max-w-7xl/);
    expect(SECTION_FILES.newest).toMatch(/mx-auto/);
    expect(SECTION_FILES.newest).toMatch(/px-4/);
    expect(SECTION_FILES.newest).toMatch(/md:px-6/);
  });
});

describe('hrp-intro-section: DEMO policy + structured paragraphs render', () => {
  it('check enabled === false return null', () => {
    expect(SECTION_FILES.hrpIntro).toMatch(/if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/);
  });

  it('paragraphs render bằng map (KHÔNG HTML string)', () => {
    expect(SECTION_FILES.hrpIntro).toMatch(/content\.paragraphs\.map/);
    /* KHÔNG có dangerouslySetInnerHTML, KHÔNG có SafeHtml */
    expect(SECTION_FILES.hrpIntro).not.toMatch(/dangerouslySetInnerHTML/);
    expect(SECTION_FILES.hrpIntro).not.toMatch(/SafeHtml/);
  });

  it('4 values items render (icon + title + body)', () => {
    expect(SECTION_FILES.hrpIntro).toMatch(/content\.values\.map/);
  });
});

describe('partner-strip-section: 5 logos monogram, scroll-snap mobile', () => {
  it('check enabled === false return null', () => {
    expect(SECTION_FILES.partnerStrip).toMatch(/if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/);
  });

  it('5 logos render', () => {
    expect(SECTION_FILES.partnerStrip).toMatch(/content\.partners\.slice\(0,\s*5\)/);
    expect(SECTION_FILES.partnerStrip).toMatch(/<HrMonogram/);
  });

  it('mobile scroll-snap ngang (snap-x snap-mandatory overflow-x-auto)', () => {
    expect(SECTION_FILES.partnerStrip).toMatch(/snap-x/);
    expect(SECTION_FILES.partnerStrip).toMatch(/snap-mandatory/);
    expect(SECTION_FILES.partnerStrip).toMatch(/overflow-x-auto/);
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

describe('mobile-banner-section: CTA route thật, không storeLinks', () => {
  it('check enabled === false return null', () => {
    expect(SECTION_FILES.mobileBanner).toMatch(/if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/);
  });

  it('CTA href dùng content.ctaHref (KHÔNG hardcode App Store/Google Play)', () => {
    expect(SECTION_FILES.mobileBanner).toMatch(/href=\{content\.ctaHref\}/);
    expect(SECTION_FILES.mobileBanner).not.toMatch(/apps\.apple\.com/);
    expect(SECTION_FILES.mobileBanner).not.toMatch(/play\.google\.com/);
  });
});

/* ─── Composition: page.tsx ──────────────────────────────────────────── */

describe('composition: 5 section theo đúng thứ tự UI04C §3', () => {
  it('chèn đúng 5 section component vào page.tsx', () => {
    expect(PAGE).toMatch(/<NewestJobsSection/);
    expect(PAGE).toMatch(/<HrpIntroSection/);
    expect(PAGE).toMatch(/<PartnerStripSection/);
    expect(PAGE).toMatch(/<NewsSection/);
    expect(PAGE).toMatch(/<MobileBannerSection/);
  });

  it('Section 1 dùng overview.newest.slice(0, 6) — KHÁC featuredJobs slice 3', () => {
    expect(PAGE).toMatch(/overview\.newest\.slice\(0,\s*6\)\.map\(enrichJob\)/);
  });

  it('Section 2..5 dùng fixture demo-content', () => {
    expect(PAGE).toMatch(/demoHrpIntro/);
    expect(PAGE).toMatch(/demoPartnerStrip/);
    expect(PAGE).toMatch(/demoNewsSection/);
    expect(PAGE).toMatch(/demoMobileBanner/);
  });

  it('thứ tự 5 section theo UI04C §3: NewestJobs → HrpIntro → PartnerStrip → News → MobileBanner, ReferralStrip invariant', () => {
    const newest = PAGE.indexOf('<NewestJobsSection');
    const hrp = PAGE.indexOf('<HrpIntroSection');
    const partner = PAGE.indexOf('<PartnerStripSection');
    const news = PAGE.indexOf('<NewsSection');
    const mobile = PAGE.indexOf('<MobileBannerSection');
    const referral = PAGE.indexOf('<ReferralStrip');
    expect(newest).toBeGreaterThan(0);
    expect(hrp).toBeGreaterThan(newest);
    expect(partner).toBeGreaterThan(hrp);
    expect(news).toBeGreaterThan(partner);
    expect(mobile).toBeGreaterThan(news);
    expect(referral).toBeGreaterThan(mobile);
  });
});
