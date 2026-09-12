/**
 * detail-sections-policy.test.ts — UI04d D.A
 *
 * Kiểm tra:
 * - Section types đã export trong public-types.ts
 * - Demo fixtures có enabled/source/order đúng
 * - Section components render policy: enabled=false → null
 * - Structured content: KHÔNG HTML string, KHÔNG dangerouslySetInnerHTML
 * - Composition page.tsx: render đủ section components
 *
 * Static source analysis (đọc file thô, không strip comment).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();

const TYPES = readFileSync(join(ROOT, 'src/domains/job-board/public-types.ts'), 'utf8').replace(/\r\n/g, '\n');
const FIXTURE = readFileSync(join(ROOT, 'src/domains/job-board/fixtures/detail-sections.fixture.ts'), 'utf8').replace(/\r\n/g, '\n');

const SECTION_FILES = {
  gallery: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/gallery-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  content: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/content-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  benefits: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/benefits-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  support: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/support-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  employerSidebar: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/employer-sidebar.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  relatedJobs: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/related-jobs-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  footerBanner: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/footer-banner-section.tsx'), 'utf8').replace(/\r\n/g, '\n'),
  structured: readFileSync(join(ROOT, 'src/domains/job-board/components/detail/structured-content.tsx'), 'utf8').replace(/\r\n/g, '\n'),
} as const;

const PAGE = readFileSync(join(ROOT, 'app/(jobs)/viec-lam/[slug]/page.tsx'), 'utf8').replace(/\r\n/g, '\n');

/* ─── Typed view-model ─────────────────────────────────────────────── */

describe('detail page section types', () => {
  it('exports StructuredContent union', () => {
    expect(TYPES).toMatch(/export\s+type\s+StructuredContent\b/);
  });

  it('StructuredContent has heading | paragraph | list | callout variants', () => {
    expect(TYPES).toMatch(/type:\s*'heading'/);
    expect(TYPES).toMatch(/type:\s*'paragraph'/);
    expect(TYPES).toMatch(/type:\s*'list'/);
    expect(TYPES).toMatch(/type:\s*'callout'/);
  });

  it('exports BenefitItem, MediaItem, SalarySectionContent, SupportSectionContent', () => {
    expect(TYPES).toMatch(/export\s+interface\s+BenefitItem\b/);
    expect(TYPES).toMatch(/export\s+interface\s+MediaItem\b/);
    expect(TYPES).toMatch(/export\s+interface\s+SalarySectionContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+SupportSectionContent\b/);
  });

  it('exports GallerySectionContent, EmployerSidebarContent, FooterBannerContent', () => {
    expect(TYPES).toMatch(/export\s+interface\s+GallerySectionContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+EmployerSidebarContent\b/);
    expect(TYPES).toMatch(/export\s+interface\s+FooterBannerContent\b/);
  });

  it('exports CtvInfoSectionContent', () => {
    expect(TYPES).toMatch(/export\s+interface\s+CtvInfoSectionContent\b/);
  });
});

/* ─── Demo fixture ─────────────────────────────────────────────────── */

describe('detail-sections.fixture', () => {
  it('exports 6 demo fixtures: introductionContent, requirementsContent, compensationContent, supportContent, applyInstructionsContent, footerBannerContent', () => {
    expect(FIXTURE).toMatch(/export\s+const\s+demoIntroductionContent\b/);
    expect(FIXTURE).toMatch(/export\s+const\s+demoRequirementsContent\b/);
    expect(FIXTURE).toMatch(/export\s+const\s+demoCompensationContent\b/);
    expect(FIXTURE).toMatch(/export\s+const\s+demoSupportContent\b/);
    expect(FIXTURE).toMatch(/export\s+const\s+demoApplyInstructionsContent\b/);
    expect(FIXTURE).toMatch(/export\s+const\s+demoFooterBannerContent\b/);
  });

  it('demoIntroductionContent uses structured blocks (heading + paragraph + list + callout)', () => {
    expect(FIXTURE).toMatch(/type:\s*'paragraph'/);
    expect(FIXTURE).toMatch(/type:\s*'heading'/);
    expect(FIXTURE).toMatch(/type:\s*'list'/);
    expect(FIXTURE).toMatch(/type:\s*'callout'/);
  });

  it('KHÔNG có HTML string trong demo blocks', () => {
    expect(FIXTURE).not.toMatch(/text:\s*'<[a-z]/);
    expect(FIXTURE).not.toMatch(/dangerouslySetInnerHTML/);
  });

  it('demoSalaryContent có bonusItems và benefitItems cùng kiểu BenefitItem', () => {
    expect(FIXTURE).toMatch(/bonusItems:\s*\[/);
    expect(FIXTURE).toMatch(/benefitItems:\s*\[/);
    expect(FIXTURE).toMatch(/icon:\s*'military_tech'/);
  });

  it('demoSupportContent items có available: true|false', () => {
    const trueCount = (FIXTURE.match(/available:\s*true/g) ?? []).length;
    const falseCount = (FIXTURE.match(/available:\s*false/g) ?? []).length;
    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);
  });

  it('demoFooterBannerContent ctaHref dùng route thật (/viec-lam)', () => {
    expect(FIXTURE).toMatch(/ctaHref:\s*'\/viec-lam'/);
  });
});

/* ─── Section components policy ────────────────────────────────────── */

describe('section components: enabled === false → return null', () => {
  it.each([
    ['gallery', /if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/],
    ['content', /if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/],
    ['benefits', /if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/],
    ['support', /if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/],
    ['employerSidebar', /if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/],
    ['footerBanner', /if\s*\(\s*!content\.enabled\s*\)\s*return\s+null/],
  ] as const)('%s has null guard', (_name, regex) => {
    const file = SECTION_FILES[(_name as keyof typeof SECTION_FILES)];
    expect(file).toMatch(regex);
  });

  it('related-jobs: return null khi empty', () => {
    expect(SECTION_FILES.relatedJobs).toMatch(/relatedJobs\.length\s*===\s*0\s*\)\s*return\s+null/);
  });

  it('ctv-info: return null khi !visible', () => {
    expect(SECTION_FILES.content).toMatch(/if\s*\(\s*!content\.enabled\s*\|\|\s*!visible\s*\)\s*return\s+null/);
  });
});

describe('structured-content renderer', () => {
  it('render mỗi block bằng React element (KHÔNG HTML string)', () => {
    expect(SECTION_FILES.structured).toMatch(/StructuredBlock/);
    expect(SECTION_FILES.structured).not.toMatch(/dangerouslySetInnerHTML/);
    expect(SECTION_FILES.structured).not.toMatch(/SafeHtml/);
  });

  it('handle 4 type: heading | paragraph | list | callout', () => {
    expect(SECTION_FILES.structured).toMatch(/block\.type\s*===\s*'heading'/);
    expect(SECTION_FILES.structured).toMatch(/block\.type\s*===\s*'paragraph'/);
    expect(SECTION_FILES.structured).toMatch(/block\.type\s*===\s*'list'/);
    expect(SECTION_FILES.structured).toMatch(/block\.type\s*===\s*'callout'/);
  });

  it('KHÔNG regex HTML tags', () => {
    expect(SECTION_FILES.structured).not.toMatch(/innerHTML/);
    expect(SECTION_FILES.structured).not.toMatch(/parseHtml/);
  });
});

describe('gallery-section: skeleton cho INTEGRATION_PENDING', () => {
  it('render skeleton khi source === INTEGRATION_PENDING hoặc media rỗng', () => {
    expect(SECTION_FILES.gallery).toMatch(/source\s*===\s*'INTEGRATION_PENDING'/);
    expect(SECTION_FILES.gallery).toMatch(/media\.length\s*===\s*0/);
    expect(SECTION_FILES.gallery).toMatch(/GallerySkeleton/);
  });

  it('real gallery phân biệt cover vs others', () => {
    expect(SECTION_FILES.gallery).toMatch(/media\.find\(\s*\(\s*m\s*\)\s*=>\s*m\.cover\s*\)/);
  });
});

describe('benefits-section: render benefit list', () => {
  it('render bonusItems và benefitItems qua map', () => {
    expect(SECTION_FILES.benefits).toMatch(/content\.benefitItems\.map/);
    expect(SECTION_FILES.benefits).toMatch(/content\.bonusItems\.map/);
  });

  it('salaryType có 3 giá trị: BASIC | EXPECTED | NEGOTIABLE', () => {
    expect(SECTION_FILES.benefits).toMatch(/'BASIC'/);
    expect(SECTION_FILES.benefits).toMatch(/'EXPECTED'/);
    expect(SECTION_FILES.benefits).toMatch(/'NEGOTIABLE'/);
  });
});

/* ─── Composition: page.tsx ──────────────────────────────────────────── */

describe('composition: detail page sections', () => {
  it('page.tsx render GallerySection', () => {
    expect(PAGE).toMatch(/<GallerySection\b/);
    expect(PAGE).toMatch(/import\s*\{[^}]*GallerySection[^}]*\}/s);
  });

  it('page.tsx render ContentSection (cho introduction + requirements + apply)', () => {
    expect(PAGE).toMatch(/<ContentSection\b/);
    expect(PAGE).toMatch(/import\s*\{[^}]*ContentSection[^}]*\}/s);
  });

  it('page.tsx render BenefitsSection + SupportSection', () => {
    expect(PAGE).toMatch(/<BenefitsSection\b/);
    expect(PAGE).toMatch(/<SupportSection\b/);
  });

  it('page.tsx render CtvInfoSection với visible flag', () => {
    expect(PAGE).toMatch(/<CtvInfoSection\b/);
    expect(PAGE).toMatch(/showCtvInfo\s*=\s*false/);
  });

  it('page.tsx render EmployerSidebar + RelatedJobsSection + FooterBannerSection', () => {
    expect(PAGE).toMatch(/<EmployerSidebar\b/);
    expect(PAGE).toMatch(/<RelatedJobsSection\b/);
    expect(PAGE).toMatch(/<FooterBannerSection\b/);
  });

  it('page.tsx dùng demo fixtures đúng tên', () => {
    expect(PAGE).toMatch(/demoIntroductionContent/);
    expect(PAGE).toMatch(/demoRequirementsContent/);
    expect(PAGE).toMatch(/demoCompensationContent/);
    expect(PAGE).toMatch(/demoSupportContent/);
    expect(PAGE).toMatch(/demoApplyInstructionsContent/);
    expect(PAGE).toMatch(/demoFooterBannerContent/);
  });

  it('thứ tự: Summary → Gallery → (Intro+Benefits+Support+Ctv+Requirements) → ApplyInstructions → RelatedJobs → FooterBanner', () => {
    /* Match JSX render (sau comment block trong page.tsx). */
    const re = (s: string) => {
      /* Tìm comment { ... } trong JSX, lấy chuỗi đầu xuất hiện sau comment. */
      const idx = PAGE.indexOf(s);
      return idx;
    };
    const summary = PAGE.indexOf('SUMMARY — section 1');
    const gallery = re('<GallerySection');
    const introduction = re('<ContentSection content={demoIntroductionContent}');
    const benefits = re('<BenefitsSection');
    const apply = re('<ContentSection content={demoApplyInstructionsContent}');
    const related = re('<RelatedJobsSection');
    const footer = re('<FooterBannerSection');
    expect(summary).toBeGreaterThan(0);
    expect(gallery).toBeGreaterThan(summary);
    expect(introduction).toBeGreaterThan(gallery);
    expect(benefits).toBeGreaterThan(introduction);
    expect(apply).toBeGreaterThan(benefits);
    expect(related).toBeGreaterThan(apply);
    expect(footer).toBeGreaterThan(related);
  });

  it('related jobs lấy từ result.relatedJobs (cùng transaction với detail)', () => {
    expect(PAGE).toMatch(/relatedJobs:/);
    expect(PAGE).toMatch(/listPublicJobProjection/);
  });
});
