# Field / Interface Matrix — UI public ↔ Admin V6

Ngày: 10/09/2026. Khóa sớm kiểu dữ liệu tiền/đơn vị, ngày, gallery, publish status, settings, pagination.

Mục đích: UI Plan và Admin Plan cùng dùng 1 hợp đồng này để nối lại sau. KHÔNG xây hai nguồn canonical.

Ký hiệu trạng thái:
- **REAL**: đã có data thật, UI đọc từ API/DB
- **DEMO**: có cấu trúc fixture/view-model hợp lệ, nhãn "Demo" / "Minh họa" hiển thị
- **INTEGRATION_PENDING**: chưa có data thật, UI render skeleton với cấu trúc props, sẵn sàng gắn CMS

---

## 1. Tiền tệ & đơn vị lương

| Trường public | Kiểu | Đơn vị hiển thị | Ghi chú |
|---|---|---|---|
| `salaryMinVnd` | `number \| null` | `đ/giờ` | API: `null` khi không slot nào còn nhận người |
| `salaryMaxVnd` | `number \| null` | `đ/giờ` | API: `null` khi không slot nào còn nhận người |
| `salaryLabel` (derived) | `string` | `Lương thương lượng` \| `12.500 đ/giờ` \| `12.500 – 18.000 đ/giờ` | Service tier 0 (`public.service.ts`) đã chuẩn hoá |
| `salaryDescription` (editorial, NEW) | `string \| null` | markdown/render-safe | Lương chi tiết (phụ cấp, thưởng, bảo hiểm) — D.B Admin nhập |
| `salaryType` | `'BASIC' \| 'EXPECTED' \| 'NEGOTIABLE'` | Label mapping | D.B Admin định nghĩa |
| `bonusStructure` | `string \| null` | markdown/render-safe | Thưởng có điều kiện/mốc/thời gian |

**Nguyên tắc**: KHÔNG quy đổi giờ ↔ tháng để giống demo (Owner mandate §A8).

---

## 2. Ngày / Deadline

| Trường public | Kiểu | Hiển thị |
|---|---|---|
| `postedAt` | ISO string \| null | Tương đối ("3 ngày trước") hoặc absolute (VN locale) |
| `deadline` | ISO string \| null | `formatDeadlineDate(deadline)` — `31/12/2026` |
| `deadlineDate` (same as `deadline`) | — | — |
| `publishedAt` (editorial, NEW) | ISO string \| null | Public thấy ngày xuất bản |
| `createdAt`, `updatedAt` | ISO string | Internal (không expose ngoài DTO) |

---

## 3. Gallery / Media

| Trường public | Kiểu | Hiển thị | Ghi chú |
|---|---|---|---|
| `media` (NEW) | `Media[]` | thumbnail + lightbox | Thư viện ảnh trang chi tiết |

```ts
interface Media {
  id: string;                          // canonical id, deterministic
  url: string;                         // public URL, validated
  alt: string;                         // alt text (required, safe)
  caption?: string;                    // optional
  order: number;                       // sort stable
  status: 'public' | 'internal';       // filter trước khi render
  cover: boolean;                      // 1 ảnh đầu tiên của mỗi tin
}
```

**Tier 2 trong TASK D.A**: chỉ render skeleton với cấu trúc props. Tier 2 trong TASK D.B: upload + validation (URL, alt, order, status).

---

## 4. Publish status & Lifecycle

| Trường | Kiểu | Áp dụng | Ghi chú |
|---|---|---|---|
| `JobOpening.status` | `DRAFT \| OPEN \| FILLED \| CANCELLED` | Vận hành (đã có) | Không thay đổi |
| `JobPosting.status` (NEW) | `DRAFT \| PENDING_REVIEW \| PUBLISHED \| UNPUBLISHED \| ARCHIVED` | Nội dung xuất bản | Tier 2 TASK D.B thêm enum |
| `JobPosting.publishedAt` | ISO \| null | Lifecycle | Required khi status = PUBLISHED |
| `JobPosting.revision` | `Int` (default 1) | Concurrency | Tăng khi save; optimistic lock |

**Public read**: chỉ trả `JobPosting.status === 'PUBLISHED'`. Draft/preview/pending không index, không public.

---

## 5. Editorial fields (NEW — cho D.B)

```ts
interface EditorialContent {
  // Giới thiệu + mô tả
  introHtml: string | null;             // Safe-rendered allowlist (p, ul, h3, etc.)
  jobDescriptionHtml: string | null;
  
  // Lương, thưởng, phúc lợi
  salaryDescriptionHtml: string | null;
  salaryType: 'BASIC' | 'EXPECTED' | 'NEGOTIABLE';
  bonusStructureHtml: string | null;
  
  // Hỗ trợ HRP
  hrpSupportHtml: string | null;        // Optional — section ẩn khi null
  
  // CTV (Affiliate)
  ctvInfoHtml: string | null;           // Optional — AFF-gated (chỉ render khi AFF mở)
  ctvVisible: boolean;                  // Default false — cần manual opt-in
  
  // Hồ sơ, yêu cầu
  requirementsHtml: string | null;
  documentsHtml: string | null;
  requiredExperienceYears: number | null;
  requiredEducation: string | null;
  requiredSkills: string[];             // Free-text, slug tự sinh nếu dùng tag
  
  // Đơn vị tuyển dụng (sidebar)
  companyName: string | null;           // Hiển thị công khai
  companyLogoUrl: string | null;        // DTO contract: chỉ logo đã được public allowlist
  companyIntro: string | null;
  companyAddress: string | null;
  companyMapUrl: string | null;
  
  // Tuổi
  ageMin: number | null;
  ageMax: number | null;
  
  // Hướng dẫn ứng tuyển
  applyInstructionsHtml: string | null;
  
  // SEO meta
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
}
```

**Tier 2 trong TASK D.A**: thêm field optional trong `PublicJobDetailDto` mapping → nếu null thì section ẩn. Tier 2 trong TASK D.B: schema `JobPosting` (or new table) + editor form + write API + permission.

**Public DTO mở rộng**:
```ts
interface PublicJobDetailDto {
  // ... existing fields (id, slug, title, salaryMinVnd, ..., positions)
  editorial: EditorialContent | null;  // null khi JobPosting chưa publish
  media: Media[];
}
```

---

## 6. Homepage Settings (singleton)

| Trường | Kiểu | Validation | Default | Ghi chú |
|---|---|---|---|---|
| `id` | `String` | `id = 'default'` invariant DB (CHECK constraint) | `'default'` | Singleton — Tier 1 khóa bằng CHECK constraint, KHÔNG chỉ `@unique` |
| `bestJobsPageSize` | `Int` | in `{3, 6, 9, 12}` | `9` | B5 (đã điều chỉnh) |
| `listingPageSize` | `Int` | in `[6..50]` | `12` | B7 |
| `updatedAt` | DateTime | — | auto | |
| `updatedById` | String | FK to User | — | Audit actor |

**Cache invalidation**:
- Tag `homepage-settings` trong Next.js cache
- Admin POST → `revalidateTag('homepage-settings')`
- Concurrent update: optimistic concurrency token (etag) + 409 nếu conflict

**Missing row**: server init bootstrap — nếu row chưa có, tạo với default values. KHÔNG rely on `@default("default") @unique` để đảm bảo 1 row.

---

## 7. Tab filter (BestJobs)

| Trường query | Kiểu | Ghi chú |
|---|---|---|
| `tab` | `'all' \| 'urgent'` | UI state |
| `urgency` (API) | `'URGENT'` \| `'NONE'` \| `'CLOSING'` \| `'CLOSING_SOON'` | Theo DEC-04 |

**Logic**: Tab `Tất cả` không filter; Tab `Tuyển gấp` lọc `urgency === 'URGENT'` (B2 điều chỉnh — **CHỈ URGENT, KHÔNG CLOSING**).

**API mở rộng B4**:
- Endpoint `GET /api/jobs?urgency=URGENT&limit=N&offset=M`
- Filter URGENT trước pagination
- Tie-breaker: `postedAt desc + id desc`

---

## 8. Pagination

| Trường | Kiểu | Validation | Ghi chú |
|---|---|---|---|
| `offset` | `Int` | `>= 0` | offset-based |
| `limit` | `Int` | `1..50` (API), default theo `pageSize` config | — |
| `total` | `Int` | computed | Tổng sau filter, trước pagination |
| `nextOffset` | `Int \| null` | computed | null khi hết |

**Listing SSR**: pagination URL `/viec-lam?page=N` (searchParams).
**BestJobs client**: prev/next in-memory, gọi `/api/jobs` riêng.
**Homepage search**: append/load-more giữ (B9), sentinel intersection observer.

---

## 9. Permission matrix

| Role | Read public jobs | Read draft | Edit own JobOpening | Edit draft JobPosting | Publish | Edit HomepageSettings |
|---|---|---|---|---|---|---|
| `MKT` (anonymous public) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `WORKER` (applicant) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `STAFFING` (HR / Sale) | ✅ | ✅ (own scope) | ✅ (own scope) | ✅ (own scope, draft → PENDING_REVIEW) | ❌ | ❌ |
| `ADMIN` | ✅ | ✅ (all) | ✅ | ✅ | ✅ | ✅ |

**Sale scope**: scope = `ProjectAssignment` table (`pm_user_id` / `assigned_user_id`). Tier 1 chưa verify schema chính xác của Sale assignment — Tier 2 TASK D.B phải verify với `prisma/schema.prisma` rồi enforce.

**No `SUPER_ADMIN`** (B11).

---

## 10. Sections demo content (Plan C — sources)

| Section | Nguồn hiện có | View-model mục tiêu | Status mặc định |
|---|---|---|---|
| Hero/search | `Hero.tsx` + `page.tsx` | `{ eyebrow, title, totalJobs, totalAreas, searchConfig }` | REAL |
| BestJobs | `BestJobsSection` + `overview.newest` | `{ tab, jobs[], page, total, pageSize }` | REAL (B) |
| Recruiting | `RecruitingProjectsSection` + `overview.newest` | `{ jobs[]: RecruitingProject }` | REAL |
| **Việc làm mới nhất** | (NEW) `overview.newest` | `{ jobs[]: Card[] }` max 6 | REAL |
| Khu vực | `AreasSection` + `facets.areas` + `overview.areaCounts` | `{ areas[]: AreaCard }` | REAL |
| **Giới thiệu HRP** | (NEW) | `{ title, image, imageAlt, introHtml, values[] }` | DEMO |
| **Dải đối tác** | (NEW) | `{ partners[]: { name, logoUrl, type: 'illustrative' \| 'real' } }` | DEMO (HRP monogram + "Minh họa") |
| **Tin tức & cẩm nang** | (NEW) | `{ featured: Article, others: Article[] }` | DEMO (Nội dung mẫu) |
| **Banner di động** | (NEW) | `{ title, body, imageUrl, imageAlt, ctaText, ctaHref, storeLinks? }` | DEMO (CTA dùng route thật) |
| CTV | `ReferralStrip` | giữ | REAL |
| Footer | `GlobalFooter` | giữ | REAL |

---

## 11. Demo content nhãn rõ

Mọi section DEMO phải render 1 badge/pill:
- `<span aria-label="Nội dung mẫu">Demo</span>` hoặc
- `<span aria-label="Minh họa">Minh họa</span>`

**Không hiển thị trong production sau khi Admin publish nội dung thật** (Plan Admin V6).

---

## 12. Tier 1 chốt canonical types

Tier 2 trong TASK C/D.A dùng types sau (lưu trong `src/domains/job-board/public-types.ts` hoặc module riêng):

```ts
export type SalaryType = 'BASIC' | 'EXPECTED' | 'NEGOTIABLE';
export type PublishStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
export type MediaStatus = 'public' | 'internal';

export interface Media {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  order: number;
  status: MediaStatus;
  cover: boolean;
}

export interface EditorialContent {
  introHtml: string | null;
  jobDescriptionHtml: string | null;
  salaryDescriptionHtml: string | null;
  salaryType: SalaryType;
  bonusStructureHtml: string | null;
  hrpSupportHtml: string | null;
  ctvInfoHtml: string | null;
  ctvVisible: boolean;
  requirementsHtml: string | null;
  documentsHtml: string | null;
  requiredExperienceYears: number | null;
  requiredEducation: string | null;
  requiredSkills: string[];
  companyName: string | null;
  companyLogoUrl: string | null;
  companyIntro: string | null;
  companyAddress: string | null;
  companyMapUrl: string | null;
  ageMin: number | null;
  ageMax: number | null;
  applyInstructionsHtml: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
}

export interface HomepageSettings {
  id: 'default';
  bestJobsPageSize: 3 | 6 | 9 | 12;
  listingPageSize: number;        // 6..50
}

export interface ArticleCard {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  href: string;
  publishedAt: string;
  source: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING';
}

export interface HomePartner {
  name: string;
  logoUrl: string;
  type: 'illustrative' | 'real';
}

export interface MobileBannerContent {
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  ctaText: string;
  ctaHref: string;
  storeLinks?: { appStore?: string; googlePlay?: string };
}
```

---

## 13. Liên kết với task

- **TASK A**: dùng section này cho types BestJobsCard, RecruitingProject (REAL)
- **TASK B**: dùng section 6, 7, 8, 9 cho settings, tab filter, pagination, permission
- **TASK C**: dùng section 10, 11, 12 cho demo content + props
- **TASK D.A**: dùng section 3, 5, 12 cho detail page props
- **TASK D.B**: dùng section 4, 5, 6, 9 cho schema/permission/editor (Plan Admin V6 #1)
- **Plan Admin V6 #2**: dùng section 10 cho CMS sections
- **Plan Admin V6 #4**: dùng section 3 cho media management
