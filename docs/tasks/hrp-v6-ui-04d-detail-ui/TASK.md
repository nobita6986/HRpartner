# TASK — `hrp-v6-ui-04d-detail-ui`

> Plan D.A — Upgrade job detail page `/viec-lam/[slug]` với richer sections.
>
> **Scope:** UI layer only — renderer + typed view-models + demo fixtures. Không schema, không API write, không persistence. Sections phụ thuộc editorial fields (AV2) dùng fixture placeholder.

**Status**: DRAFT v0.1 — Tier 1 plan only, awaiting Tier 0/Tier 1 execution review.

---

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04d-detail-ui` |
| Work type | `CODE` (UI renderer + typed view-model + demo fixture) |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` (UI thuần: renderer + typed fixture + view-model. Directive Tier 0 11/09/2026: bỏ FOCUSED audit, không gọi Tier 3) |
| Spec version | `v0.1` |
| Status | `DRAFT` |
| Planner | `Tier 1` |
| Implementer | `Tier 1` (Tier 1 owns task contract + implementation + evidence) |
| Baseline | HEAD `33e991c` (Y10.4 projection fix + AV1 settings + AV4 plan) — `git rev-parse HEAD` → `evidence/exec-head-before.txt` |
| Source reference | `app/(jobs)/viec-lam/[slug]/page.tsx` (current page: summary + positions + apply CTA) |
| Predecessor | UI04d-section-render `ACCEPTED` (`hrp-v6-ui-04d-section-render` v1.9) |
| Successor | `hrp-v6-ui-04d-detail-editor` (D.B — Editor Admin/Sale sau UI04d ACCEPTED) |
| Forbidden paths | `src/domains/job-board/public.service.ts` (DTO không đổi), `app/api/jobs/**` (API không đổi), `prisma/**` (schema không đổi), `app/api/admin/**` (Admin API không đổi), `src/shared/auth/permission-catalog.ts`, `app/admin/**`, `src/shared/auth/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` exit 0; `npm run build` exit 0 |
| Visual gate | Owner live review post-deploy |

## 1. Outcome

### 1.1 Reference layout

Thứ tự sections trên `/viec-lam/[slug]`:
```
1. Search / breadcrumb (existing: giữ route thật)
2. Tóm tắt tin tuyển dụng         ← UPGRADE: thêm urgency chip, salary detail
3. Thư viện ảnh (gallery)          ← SKELETON: chờ AV4 Media
4. Giới thiệu công việc             ← SKELETON: chờ AV2 editorial fields
5. Lương, thưởng, phúc lợi        ← SKELETON: chờ AV2 editorial fields
6. Hỗ trợ từ HRP                  ← DEMO fixture
7. Thông tin dành cho CTV           ← DEMO fixture (AFF-gated: ẩn nếu không đủ quyền)
8. Yêu cầu và lưu ý               ← SKELETON: chờ AV2 editorial fields
9. Sidebar đơn vị tuyển dụng       ← UPGRADE: thêm logo/địa chỉ/map link
10. Hướng dẫn ứng tuyển            ← DEMO fixture
11. CTA (trên / dưới)              ← EXISTING: giữ DetailApplyCta
12. Việc làm liên quan             ← NEW: public eligible jobs, sort/pagination
13. Footer banner (tái dùng ReferralStrip hoặc Banner cuối)
```

### 1.2 Container contract

- **Width:** `max-w-5xl mx-auto px-4 sm:px-6` (hẹp hơn listing page `max-w-7xl` để focus vào nội dung)
- **Section spacing:** `py-6` between sections
- **Grid:** `grid grid-cols-1 lg:grid-cols-3` cho layout có sidebar

### 1.3 Section source policy

| Section | source | Data | Policy |
|---|---|---|---|
| Tóm tắt tin | `REAL` | `PublicJobDetailDto` (existing) | → upgrade với urgency chip + salary detail |
| Gallery | `INTEGRATION_PENDING` | — | → skeleton với 1 placeholder image. Props: `media: MediaItem[]`, `enabled: true`, `source: 'REAL'/'INTEGRATION_PENDING'` |
| Giới thiệu | `INTEGRATION_PENDING` | — | → skeleton text block. Props: `content: StructuredContent[]`, `source: 'REAL'/'INTEGRATION_PENDING'` |
| Lương/thưởng | `INTEGRATION_PENDING` | — | → skeleton benefit list. Props: `benefits: BenefitItem[]`, `source: 'REAL'/'INTEGRATION_PENDING'` |
| Hỗ trợ HRP | `DEMO` | fixture | → render demo với typed view-model |
| CTV info | `DEMO` | fixture | → AFF-gated: ẩn nếu user không đủ quyền |
| Yêu cầu | `INTEGRATION_PENDING` | — | → skeleton requirements list |
| Sidebar | `REAL` | `PublicJobDetailDto` (existing) | → upgrade với logo/địa chỉ |
| Hướng dẫn ứng tuyển | `DEMO` | fixture | → render demo với typed view-model |
| CTA | `REAL` | existing DetailApplyCta | → giữ nguyên |
| Việc liên quan | `REAL` | `/api/jobs?related=true&slug=X` | → NEW: fetch + render FeaturedJobCard |
| Footer banner | `DEMO` | fixture hoặc ReferralStrip reuse | → DEMO hoặc reuse ReferralStrip |

## 2. Structured content types (typed, no HTML string)

```ts
// Dùng cho giới thiệu, mô tả, yêu cầu, hướng dẫn
type StructuredContent =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; variant: 'info' | 'warning' | 'success'; text: string };

// Dùng cho Lương/thưởng
type BenefitItem = {
  icon: string;  // lucide icon name
  title: string;
  description: string | null;
  value: string | null; // e.g. "12.500 đ/giờ" | null
};
```

**Rendering:** Map over array → React elements. KHÔNG HTML string, KHÔNG `dangerouslySetInnerHTML`.

## 3. View-models

### 3.1 Detail page view-model

```ts
interface JobDetailViewModel {
  // Real data (always present)
  job: PublicJobDetailDto;           // existing service DTO
  relatedJobs: PublicJobDto[];      // fetched from /api/jobs (same area/shift)

  // Section view-models
  gallery: GallerySection;           // source: 'REAL' | 'INTEGRATION_PENDING'
  introduction: ContentSection;      // source: 'REAL' | 'INTEGRATION_PENDING'
  salary: SalarySection;             // source: 'REAL' | 'INTEGRATION_PENDING'
  support: SupportSection;           // source: 'DEMO' | 'INTEGRATION_PENDING'
  ctvInfo: CTVInfoSection;         // source: 'DEMO' | 'INTEGRATION_PENDING'
  requirements: ContentSection;      // source: 'REAL' | 'INTEGRATION_PENDING'
  applyInstructions: ContentSection;  // source: 'DEMO'
  employerSidebar: EmployerSidebar;    // source: 'REAL'
  footerBanner: FooterBannerSection;  // source: 'DEMO'
}
```

### 3.2 Section interfaces

```ts
// Base section (every section has these fields)
interface BaseSection {
  id: string;
  enabled: boolean;
  order: number;
  source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING';
}

interface GallerySection extends BaseSection {
  media: MediaItem[];
}

interface MediaItem {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  cover: boolean;
  order: number;
}

interface ContentSection extends BaseSection {
  title: string;
  blocks: StructuredContent[];
}

interface SalarySection extends BaseSection {
  salaryType: 'BASIC' | 'EXPECTED' | 'NEGOTIABLE';
  salaryDetail: StructuredContent[];  // basic salary + allowances breakdown
  bonusItems: BenefitItem[];
  benefitItems: BenefitItem[];
}

interface SupportSection extends BaseSection {
  items: {
    icon: string;
    label: string;
    description: string;
    available: boolean;
  }[];
}

interface CTVInfoSection extends BaseSection {
  content: StructuredContent[];
  visible: boolean; // AFF-gated: true only if user has CTV visibility permission
}

interface EmployerSidebar extends BaseSection {
  companyName: string;
  logoUrl: string | null;
  address: string;
  mapUrl: string | null; // Google Maps link
}

interface FooterBannerSection extends BaseSection {
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
}
```

## 4. Component inventory

```
app/(jobs)/viec-lam/[slug]/
  page.tsx                         ← refactor: nhận view-model, render section renderer
  components/
    sections/
      summary-section.tsx           ← UPGRADE: urgency chip + salary detail
      gallery-section.tsx           ← NEW: skeleton / real gallery (AV4 Media)
      content-section.tsx           ← NEW: generic structured content renderer
      salary-section.tsx            ← NEW: benefits list
      support-section.tsx           ← NEW: HRP support items
      ctv-info-section.tsx         ← NEW: AFF-gated CTV content
      requirements-section.tsx       ← NEW: requirements list
      employer-sidebar.tsx          ← UPGRADE: logo + address + map
      apply-instructions-section.tsx ← NEW: typed instructions
      related-jobs-section.tsx     ← NEW: job cards
      footer-banner-section.tsx      ← NEW or reuse ReferralStrip
    shared/
      section-renderer.tsx          ← generic: BaseSection[] → renders enabled sections
  fixtures/
    detail-sections.fixture.ts      ← DEMO fixtures for D.A
```

## 5. Demo fixtures

### 5.1 Support section

```ts
const DEMO_SUPPORT_ITEMS: SupportItem[] = [
  { icon: 'user-check', label: 'Tư vấn hồ sơ', description: 'Đội ngũ HR đồng hành xuyên suốt', available: true },
  { icon: 'plane', label: 'Hỗ trợ đi lại', description: 'Hỗ trợ chi phí di chuyển theo chính sách', available: false },
  { icon: 'home', label: 'Nhà ở', description: 'Giới thiệu nhà trọ gần nhà máy', available: true },
  { icon: 'bus', label: 'Xe đưa đón', description: 'Tuyến xe cố định theo ca', available: false },
  { icon: 'utensils', label: 'Bữa ăn', description: 'Công ty hỗ trợ bữa trưa', available: true },
];
```

### 5.2 Apply instructions

```ts
const DEMO_APPLY_INSTRUCTIONS: StructuredContent[] = [
  { type: 'heading', level: 2, text: 'Hướng dẫn ứng tuyển' },
  { type: 'paragraph', text: 'Ứng viên gửi hồ sơ trực tiếp qua trang hoặc liên hệ hotline để được hướng dẫn chi tiết.' },
  { type: 'list', ordered: true, items: [
    'Nhấn nút "Ứng tuyển" bên dưới',
    'Điền thông tin cá nhân và kinh nghiệm làm việc',
    'Nhận xác nhận qua SMS/Zalo trong 24 giờ',
  ]},
  { type: 'callout', variant: 'info', text: 'Hồ sơ được bảo mật. HRP không chia sẻ thông tin cá nhân với bên thứ ba.' },
];
```

### 5.3 Footer banner

```ts
const DEMO_FOOTER_BANNER: FooterBannerSection = {
  id: 'footer-banner',
  enabled: true,
  order: 100,
  source: 'DEMO',
  ctaLabel: 'Xem thêm việc làm khác',
  ctaHref: '/viec-lam',
  imageUrl: '/images/hero/dong-goi-ha-noi.jpg',
};
```

## 6. AFF-gating cho CTV info

```ts
// Lấy từ session/role
const showCtvInfo = session?.role === 'CTV' || session?.role === 'CTV_ADMIN';

<CTVInfoSection
  section={vm.ctvInfo}
  visible={showCtvInfo}
/>
```

Nếu `visible === false` → section không render (không skeleton, không placeholder text).

## 7. Related jobs

```ts
// Lấy từ /api/jobs — filter jobs cùng area hoặc shift
// Sort: urgency desc → postedAt desc
// Take: 4 items
// Dùng FeaturedJobCard component đã có
```

## 8. Non-goals

- **Không schema / migration** (→ AV2 cho editorial fields)
- **Không Media upload** (→ AV4 cho Media)
- **Không Admin editor form**
- **Không write API**
- **Không thay đổi** `PublicJobDetailDto` / `public.service.ts`
- **Không thay đổi** `DetailApplyCta` component

## 9. File Changes Summary

| File | Change |
|---|---|
| `app/(jobs)/viec-lam/[slug]/page.tsx` | Refactor: nhận view-model, render sections |
| `app/(jobs)/viec-lam/[slug]/components/sections/*.tsx` | NEW: section components |
| `app/(jobs)/viec-lam/[slug]/components/shared/section-renderer.tsx` | NEW: generic section renderer |
| `app/(jobs)/viec-lam/[slug]/fixtures/detail-sections.fixture.ts` | NEW: demo fixtures |
| `src/domains/job-board/public-types.ts` | Thêm DetailViewModel + section types |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Giữ nguyên (reused) |

## 10. Gate

- `npm run typecheck` — PASS
- `npm run test:unit` — PASS (new test: sections-policy.test.ts)
- `npm run build` — PASS
- Owner live visual review post-deploy

---

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 | 11/09/2026 | Tier 1 | Initial draft: section layout, structured content types, view-models, component inventory, demo fixtures, non-goals |
