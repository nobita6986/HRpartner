# Plan Admin V6 — Homepage Settings + Job Posting Editor + CMS homepage

Ngày: 10/09/2026. Tier 1 khảo sát và khóa contract sớm.

> Theo Tier 0 chỉ thị mới (`docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`): Plan Admin V6 tách riêng từ Plan UI. Exit gate: Admin/Sale nhập → lưu → preview → publish → public hiển thị đúng. KHÔNG phải blocker để bắt đầu hoặc nghiệm thu riêng phần UI.

> **Không cần chờ UI D.A** mới lập plan — Tier 1 khảo sát ngay và khóa data contract.

> **V7-native dependency overlay — 2026-09-11:** AV1, AV4 và AV6 không đổi.
> AV2 chỉ được publish/write hoàn chỉnh sau khi V6 Native Foundation N3 khóa
> `JobOpening.serviceModel` và publish validation. D.B được hấp thụ vào AV2.
> AV2 không được tạo direct Assignment/Worker hoặc lifecycle shortcut.

> **Tier 0 review v2 + v3 chốt**: AV6 = CMS homepage content (đã đổi từ label tạm `AV-CMS` sang tên chính thức `AV6`). AV5 vẫn là Cache invalidation + Integration test. Dependency: AV1 + AV4 có thể chuẩn bị độc lập → AV2/AV6 (cả hai phụ thuộc AV4 cho media) → AV5. **Tier 0 review v3 §Quyết định còn thiếu chốt**: AV6 KHÔNG phụ thuộc AV1; chỉ phụ thuộc UI Task D section-render `ACCEPTED` + AV4 Media Foundation. HomepageSettings của AV1 không phải predecessor của AV6.

---

## 1. Sub-tasks (AV1, AV2, AV3, AV4, AV5, AV6)

> **Cập nhật 10/09/2026 theo Tier 0 UI04C mandate §4 + review v2 + review v3**: AV2 cũ từng mang 2 việc (JobPosting editor + CMS homepage content) — mâu thuẫn ownership. Tách thành 2 work item riêng:
> - **AV2** = JobPosting editor (canonical mapping hiện hành, KHÔNG đổi)
> - **AV6** = CMS homepage content (Tier 0 chốt tên `AV6` tại review v2; lịch sử label planning tạm là `AV-CMS`)
>
> Tier 1 KHÔNG tự đổi số AV3..AV5 vì có thể vỡ references khác trong repo. Tier 0 review v3 §Quyết định còn thiếu: AV3 giữ trong Admin V6, trạng thái `BACKLOG`/`DEFER` sau UI-05 và AV2; AV6 KHÔNG phụ thuộc AV1.

| ID | Tên | Phạm vi | Dependency | Status |
|---|---|---|---|---|
| `AV1` | Homepage Settings + Query API | `HomepageSettings` singleton schema + API + Admin settings page + query integration vào Plan UI B (view-model INTEGRATION_PENDING) | None | `DRAFT` |
| `AV2` | Editor tin Admin/Sale (JobPosting) | `JobPosting` editorial fields schema + editor form + write API + permission + draft/preview/publish lifecycle | AV1 (settings), AV4 (media), V6 Native N3 ServiceModel contract | `DRAFT` |
| `AV6` | CMS homepage content (4 editorial sections: Giới thiệu HRP, Đối tác/minh họa, Tin tức/cẩm nang, Banner di động) | Editor cho 4 section Plan C (Việc làm mới nhất REAL từ overview.newest, không thuộc AV6). Schema + form + API + media + publish + preview cùng renderer public. UI task section-render ship trước với fixture; AV6 thay fixture bằng published data | UI D section-render (ACCEPTED), AV4 — KHÔNG phụ thuộc AV1 (Tier 0 review v3) | `DRAFT` |
| `AV3` | Tag tùy biến | Schema + API + UI tag filter — **BACKLOG/DEFER sau UI-05 và AV2** (Tier 0 review v3 chốt) | AV2 | `BACKLOG` |
| `AV4` | Media management | Upload + asset library + URL validation + alt text + order | (none — AV4 là foundation, đứng trước các editor) | `DRAFT` |
| `AV5` | Cache invalidation + Integration test | `revalidateTag` on write + end-to-end integration test cho từng section | AV1, AV2, AV4, AV6 | `DRAFT` |

## 2. AV1 — Homepage Settings + Query Integration

### 2.1 Outcome
- Schema `HomepageSettings` singleton với invariant DB (id='default' CHECK constraint)
- Public read API: `GET /api/public/homepage-settings` (public projection, NO auth)
- Admin write API: `POST /api/admin/homepage-settings` (ADMIN only)
- Admin settings page: `app/admin/settings/page.tsx` (hiện placeholder)
- Integration vào Plan UI B: homepage đọc `{bestJobsPageSize, listingPageSize}` từ API, fallback default

> **Plan UI B v1.1 closeout (10/09/2026)**: Plan UI B (`hrp-v6-ui-04b-pagination-admin`) chỉ làm UI controls thuần (BestJobs tab + pagination + fixture URGENT preview). Toàn bộ backend dưới đây thuộc AV1 implementation task — Tier 1 lập `hrp-v6-admin-v6-av1-settings-editor` riêng sau khi Plan B `ACCEPTED`. Cụ thể:
> - Schema `HomepageSettings` + migration ADD-only + CHECK constraint `id = 'default'`
> - `src/shared/auth/permission-catalog.ts`: thêm `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM + seed ADMIN trong `prisma/seed.mjs`
> - `src/domains/job-board/public-types.ts` (NEW): export `HomepageSettingsDto`, `HomepageSettingsView`
> - `src/domains/job-board/public-settings.service.ts` (NEW): idempotent UPSERT bootstrap + `getHomepageSettings`
> - `GET /api/public/homepage-settings` (public projection, NO auth) + `unstable_cache` tag `homepage-settings` + TTL 60s
> - `POST /api/admin/homepage-settings` (ADMIN write) + `revalidateTag('homepage-settings')`
> - `app/admin/settings/page.tsx` (Admin form)
> - `/api/jobs` mở `urgency=URGENT` query (filter memory layer sau `q/area/shift/shiftTypes/jobTypes`, trước pagination) + tie-breaker `postedAt desc + id desc` + validate `limit` clamp
> - `app/(portal)/page.tsx`: flip `featuredJobs` từ fixture preview sang `/api/jobs?urgency=URGENT&limit=N&offset=M` + replace prop `pageSize: number = 9` bằng view-model `HomepageSettingsView.settings?.bestJobsPageSize ?? 9`
> - `app/(jobs)/viec-lam/page.tsx`: inject `listingPageSize` từ view-model (fallback 12, range `[6..50]` clamp)
> - Xóa file `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` (URGENT chuyển từ fixture preview sang data thật) — sau khi flip sang `source: 'REAL'`
> 
> Khi AV1 xong: UI B flip `source` từ `INTEGRATION_PENDING` sang `REAL`; `BestJobsSection` props refactor sang view-model; `featuredJobs` dùng fetch riêng có `urgency=URGENT`; sentinel load-more homepage search dùng `listingPageSize` từ settings.

### 2.2 Schema

```prisma
model HomepageSettings {
  id                  String   @id @default("default")
  bestJobsPageSize    Int      @default(9)    // 3 | 6 | 9 | 12
  listingPageSize     Int      @default(12)  // 6..50
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  updatedById         String?
  updatedBy           User?    @relation(fields: [updatedById], references: [id])

  @@index([updatedAt])
}
```

**Invariant**: `CHECK (id = 'default')` — DB-level ngăn insert row khác id.

### 2.3 API

> **Lưu ý quan trọng**: `/api/admin/...` LUÔN là bề mặt quản trị có auth. Public projection cho settings dùng route public riêng.

```ts
// GET /api/public/homepage-settings
// Response (public projection — không có secret fields):
type HomepageSettingsDto = {
  id: 'default';
  bestJobsPageSize: 3 | 6 | 9 | 12;
  listingPageSize: number; // 6..50
  updatedAt: string;
};

// POST /api/admin/homepage-settings
// Body: { bestJobsPageSize?: number; listingPageSize?: number }
// Response: HomepageSettingsDto
// Auth: ADMIN only
```

### 2.4 Integration với Plan UI

Plan UI B nhận view-model:
```ts
type HomepageSettingsView = {
  source: 'REAL' | 'INTEGRATION_PENDING';  // REAL khi AV1 xong
  settings: HomepageSettingsDto | null;
  defaultBestJobsPageSize: 9;
  defaultListingPageSize: 12;
};
```

---

## 3. AV2 — Editor tin Admin/Sale

### 3.1 Outcome
- Editor form đầy đủ trường editorial theo `field-matrix.md` §5
- Draft/preview/publish lifecycle
- Scope Sale: chỉ dự án/tin thuộc scope được giao
- ADMIN publish
- Revision/concurrency
- Audit actor/action/time

### 3.2 Schema — editorial fields (additive to JobPosting)

```prisma
enum PostingStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  UNPUBLISHED
  ARCHIVED
}

model JobPosting {
  id                  String        @id @default(cuid())
  jobOpeningId        String        @unique
  jobOpening          JobOpening    @relation(fields: [jobOpeningId], references: [id])

  // --- Editorial fields (NEW) ---
  publicTitle         String?       // Tiêu đề public (khác internal)
  introHtml           String?       // Giới thiệu nơi làm việc
  jobDescriptionHtml  String?       // Mô tả nhiệm vụ
  salaryDescHtml      String?       // Lương chi tiết
  salaryType          SalaryType?   @default(BASIC)
  bonusDescHtml       String?       // Thưởng/điều kiện
  hrpSupportHtml      String?       // Hỗ trợ HRP (optional)
  ctvInfoHtml         String?       // Thông tin CTV (AFF-gated)
  ctvVisible          Boolean       @default(false)
  requirementsHtml     String?       // Yêu cầu
  documentsHtml       String?       // Giấy tờ
  applyInstructionsHtml String?     // Hướng dẫn ứng tuyển

  // --- Media ---
  media               Media[]       @relation("JobPostingMedia")

  // --- Lifecycle ---
  status              PostingStatus  @default(DRAFT)
  publishedAt         DateTime?
  revision            Int           @default(1)

  // --- Audit ---
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  createdById         String?
  updatedById         String?
}

enum SalaryType {
  BASIC
  EXPECTED
  NEGOTIABLE
}

model Media {
  id          String    @id @default(cuid())
  url         String
  alt         String    @default("")
  caption     String?
  order       Int       @default(0)
  status      MediaStatus @default(PUBLIC)
  cover       Boolean   @default(false)
  ownerType   String    // 'JobPosting' | 'Article' | 'Partner'
  ownerId     String
  createdAt   DateTime  @default(now())
}

enum MediaStatus {
  PUBLIC
  INTERNAL
}
```

### 3.3 API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/job-postings/[id]` | STAFFING (own scope) / ADMIN | Get draft/published posting |
| PATCH | `/api/admin/job-postings/[id]` | STAFFING (own scope, draft only) | Update draft |
| POST | `/api/admin/job-postings/[id]/publish` | ADMIN only | Publish posting |
| POST | `/api/admin/job-postings/[id]/unpublish` | ADMIN only | Unpublish |
| GET | `/api/admin/job-postings/[id]/preview` | STAFFING (own scope) / ADMIN | Preview (no index) |
| POST | `/api/admin/job-postings/[id]/media` | STAFFING (own scope) | Upload media |
| DELETE | `/api/admin/job-postings/[id]/media/[mediaId]` | STAFFING (own scope) | Delete media |
| PATCH | `/api/admin/job-postings/[id]/media/reorder` | STAFFING (own scope) | Reorder media |

### 3.4 Sale scope enforcement

Scope = `ProjectAssignment` table. Tier 2 verify chính xác field names trong `prisma/schema.prisma`:
- Check `staffingOrder.projectId` có trong user's assignment set
- ADMIN bypass scope check

---

## 4. AV6 — CMS homepage content

> Tier 0 review v2 chốt tên `AV6`. Trước đó mang nhãn planning `AV-CMS`. ID không biểu thị thứ tự chạy; phụ thuộc UI D section-render (ACCEPTED) và AV4 (media foundation).

### 4.1 Outcome

CMS riêng cho 4 section Plan C (trừ Việc làm mới nhất đã REAL từ `overview.newest`):
1. **Giới thiệu HRP** — split image/text + 4 ô giá trị (DEMO hiện tại)
2. **Dải đối tác/minh họa** — logo strip (DEMO, dùng HRP monogram)
3. **Tin tức & cẩm nang** — 1 bài lớn + 2 bài nhỏ (DEMO)
4. **Banner trải nghiệm HRP trên di động** — CTA route thật (DEMO)

### 4.2 Phạm vi

- Editor form cho từng section: title/body/excerpt/CTA label+href/ảnh
- `Section.enabled`, thứ tự hiển thị, draft/published, revision, audit actor/time
- Public read projection chỉ trả `section.status === 'PUBLISHED'` và field được phép công khai
- Migration/backfill/fallback để UI Plan C đang dùng fixture không vỡ khi CMS bật (UI flip `source: 'DEMO' | 'INTEGRATION_PENDING'` → `'REAL'` chỉ đổi adapter, không viết lại section)
- Media: dùng chung AV4 (asset library + alt + order + cover)
- Cache invalidation: tag-based revalidation (AV5)
- Preview dùng cùng renderer/component với public UI

### 4.3 Schema (additive)

```prisma
model HomepageSection {
  id          String         @id @default(cuid())
  type        SectionType    // GIỚI_THIỆU_HRP | ĐỐI_TÁC | TIN_TỨC | BANNER_MOBILE
  enabled     Boolean        @default(true)
  order       Int            @default(0)
  content     Json           // structured content per type (xem field-matrix.md §10)
  status      PostingStatus  @default(DRAFT)
  publishedAt DateTime?
  revision    Int            @default(1)
  createdById String?
  updatedById String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  media       Media[]        @relation("HomepageSectionMedia")
}

enum SectionType {
  GIỚI_THIỆU_HRP
  ĐỐI_TÁC
  TIN_TỨC
  BANNER_MOBILE
}
```

### 4.4 API endpoints

> **Lưu ý**: `/api/admin/...` LUÔN là bề mặt quản trị có auth. Public read projection dùng route public riêng.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/homepage-sections` | ADMIN | List all sections (draft + published) |
| PATCH | `/api/admin/homepage-sections/[id]` | ADMIN | Update section draft |
| POST | `/api/admin/homepage-sections/[id]/publish` | ADMIN only | Publish section |
| GET | `/api/public/homepage-sections` | Public | Read published sections (filtered by type, enabled, public fields only) |

### 4.5 Permission

| Role | Read public | Read draft | Edit | Publish |
|---|---|---|---|---|
| ANONYMOUS | ✅ (published only) | ❌ | ❌ | ❌ |
| ADMIN | ✅ (all) | ✅ | ✅ | ✅ |

(Sale KHÔNG edit homepage sections — chỉ JobPosting editorial. Tách rõ ownership.)

### 4.6 Out-of-scope

- Editor form JobPosting (→ AV2)
- Tag tùy biến (→ AV3)
- Media upload (→ AV4)
- Cache invalidation + integration test (→ AV5)

---

## 5. AV3 — Tag tùy biến (BACKLOG — DEFER sau UI-05)

- Schema tag + assignment
- API CRUD tags
- UI tag filter
- **DEFER**: chưa có requirement đầy đủ, chờ UI-05 roadmap alignment

---

## 5. AV4 — Media management

### 5.1 Outcome
- Upload images (type/size validation)
- Asset library centralized
- URL validation
- Alt text required
- Order management
- Safe render allowlist

### 5.2 Safe render allowlist

```ts
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'code', 'pre',
  'span', 'div',
];
```

NO: `script`, `style`, `iframe`, `object`, `embed`, `form`, `input`, `button`, `svg`, `math`.

### 5.3 AV6 media assignment

`HomepageSection.media` quan hệ n-N với `Media` qua `MediaAssignment` (cùng cấu trúc với JobPosting → Media). AV6 reuse AV4 infrastructure cho upload + URL validation + alt text.

---

## 6. AV5 — Cache invalidation + Integration test

### 6.0 Dependency

AV5 phụ thuộc AV1 + AV2 + AV4 + AV6. Thứ tự chạy: AV1 + AV4 (foundation, có thể chuẩn bị độc lập) → AV2, AV6 (song song, cả hai dùng AV4) → AV5.

> **Ghi chú AV4 (Tier 0 review v2)**: AV4 là media foundation chung. AV4 KHÔNG phụ thuộc AV2 hay AV6 (tránh dependency vòng). AV4 đứng trước AV2 và AV6 (cả hai cần media infrastructure trước khi upload). AV4 có thể chuẩn bị song song với AV1.

### 6.1 Cache strategy

- `GET /api/jobs` — tagged `jobs-list`
- Homepage settings — tagged `homepage-settings`
- Job detail — tagged `job-detail-{slug}`

### 6.2 Invalidation

```ts
// On publish:
revalidateTag('jobs-list');
revalidateTag('homepage-settings');
revalidateTag(`job-detail-${slug}`);

// On settings update:
revalidateTag('homepage-settings');
revalidateTag('jobs-list');
```

### 6.3 Integration test cases

| Test | Flow | Expected |
|---|---|---|
| IT-01 | Admin update settings → GET settings | new value reflected |
| IT-02 | Sale create draft → preview → publish → GET detail | editorial content appears |
| IT-03 | Sale edit draft → save → reopen | content preserved |
| IT-04 | ADMIN unpublish → GET detail | 404 or unpublished state |
| IT-05 | Sale try to edit other's posting → API | 403 |
| IT-06 | Sale try to publish → API | 403 |
| IT-07 | Anonymous GET draft slug | 404 |
| IT-08 | Upload media → GET detail | media appears in order |

---

## 7. Data contract (AV ↔ Plan UI)

Tier 1 khóa sớm interface dùng chung:

```ts
// --- Settings ---
interface HomepageSettings {
  id: 'default';
  bestJobsPageSize: 3 | 6 | 9 | 12;
  listingPageSize: number; // 6..50
}

// --- Editorial content ---
interface EditorialContent {
  introHtml: string | null;
  jobDescriptionHtml: string | null;
  salaryDescHtml: string | null;
  salaryType: 'BASIC' | 'EXPECTED' | 'NEGOTIABLE';
  bonusDescHtml: string | null;
  hrpSupportHtml: string | null;
  ctvInfoHtml: string | null;
  ctvVisible: boolean;
  requirementsHtml: string | null;
  documentsHtml: string | null;
  applyInstructionsHtml: string | null;
}

// --- Media ---
interface Media {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  order: number;
  status: 'PUBLIC' | 'INTERNAL';
  cover: boolean;
}

// --- Public Job Detail extended ---
interface PublicJobDetailExtended extends PublicJobDetailDto {
  editorial: EditorialContent | null;
  media: Media[];
}
```

---

## 8. Permission matrix (AV)

> **Lưu ý**: `/api/admin/...` LUÔN là bề mặt quản trị có auth. Public routes (như `/api/public/homepage-settings`, `/api/public/homepage-sections`) không cần auth và chỉ trả public projection.

| Role | Read settings (public) | Write settings | Read any posting | Edit own draft | Edit any draft | Publish | Read own media | Upload media |
|---|---|---|---|---|---|---|---|---|
| ANONYMOUS | ✅ (public projection) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| STAFFING (Sale) | ✅ (public projection) | ❌ | ✅ (own scope) | ✅ (own scope) | ❌ | ❌ | ✅ (own posting) | ✅ (own posting) |
| ADMIN | ✅ (all) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. Reference

- Field matrix: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md`
- Plan overview: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md`
- Task A: `docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md`
- Task B: `docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md`
- Task C composition/footer: `docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md`
- Task D section-render: `docs/tasks/hrp-v6-ui-04d-section-render/TASK.md`
- Skeleton UI B/C/D: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md`
- Tier 0 UI04C mandate: `docs/prompts/TIER1_UI04C_HOME_SECTIONS_FOOTER_AND_ADMIN_CMS.md`
