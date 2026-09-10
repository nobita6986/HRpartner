# Plan Admin V6 — Homepage Settings + Job Posting Editor + CMS

Ngày: 10/09/2026. Tier 1 khảo sát và khóa contract sớm.

> Theo Tier 0 chỉ thị mới (`docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`): Plan Admin V6 tách riêng từ Plan UI. Exit gate: Admin/Sale nhập → lưu → preview → publish → public hiển thị đúng. KHÔNG phải blocker để bắt đầu hoặc nghiệm thu riêng phần UI.

> **Không cần chờ UI D.A** mới lập plan — Tier 1 khảo sát ngay và khóa data contract.

---

## 1. Sub-tasks (AV1..AV5)

| ID | Tên | Phạm vi | Dependency | Status |
|---|---|---|---|---|
| `AV1` | Homepage Settings + Query API | `HomepageSettings` singleton schema + API + Admin settings page + query integration vào Plan UI B (view-model INTEGRATION_PENDING) | None | `DRAFT` |
| `AV2` | Editor tin Admin/Sale (canonical fields + DTO) | `JobPosting` editorial fields schema + editor form + write API + permission + draft/preview/publish lifecycle | AV1 (settings) | `DRAFT` |
| `AV3` | Tag tùy biến | Schema + API + UI tag filter — **DEFER sau UI-05** | AV2 | `BACKLOG` |
| `AV4` | Media management | Upload + asset library + URL validation + alt text + order | AV2 | `DRAFT` |
| `AV5` | Cache invalidation + Integration test | `revalidateTag` on write + end-to-end integration test cho từng section | AV1, AV2, AV4 | `DRAFT` |

---

## 2. AV1 — Homepage Settings + Query Integration

### 2.1 Outcome
- Schema `HomepageSettings` singleton với invariant DB (id='default' CHECK constraint)
- Public read API: `GET /api/admin/homepage-settings` (public projection)
- Admin write API: `POST /api/admin/homepage-settings` (ADMIN only)
- Admin settings page: `app/admin/settings/page.tsx` (hiện placeholder)
- Integration vào Plan UI B: homepage đọc `{bestJobsPageSize, listingPageSize}` từ API, fallback default

> **Plan UI B v1.1 closeout (10/09/2026)**: Plan UI B (`hrp-v6-ui-04b-pagination-admin`) chỉ làm UI controls thuần (BestJobs tab + pagination + fixture URGENT preview). Toàn bộ backend dưới đây thuộc AV1 implementation task — Tier 1 lập `hrp-v6-admin-v6-av1-settings-editor` riêng sau khi Plan B `ACCEPTED`. Cụ thể:
> - Schema `HomepageSettings` + migration ADD-only + CHECK constraint `id = 'default'`
> - `src/shared/auth/permission-catalog.ts`: thêm `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM + seed ADMIN trong `prisma/seed.mjs`
> - `src/domains/job-board/public-types.ts` (NEW): export `HomepageSettingsDto`, `HomepageSettingsView`
> - `src/domains/job-board/public-settings.service.ts` (NEW): idempotent UPSERT bootstrap + `getHomepageSettings`
> - `GET /api/admin/homepage-settings` (public projection) + `unstable_cache` tag `homepage-settings` + TTL 60s
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

```ts
// GET /api/admin/homepage-settings
// Response (public projection):
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

## 4. AV3 — Tag tùy biến (BACKLOG — DEFER sau UI-05)

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

---

## 6. AV5 — Cache invalidation + Integration test

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

| Role | Read settings | Write settings | Read any posting | Edit own draft | Edit any draft | Publish | Read own media | Upload media |
|---|---|---|---|---|---|---|---|---|
| ANONYMOUS | ✅ (public projection) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| STAFFING (Sale) | ✅ | ❌ | ✅ (own scope) | ✅ (own scope) | ❌ | ❌ | ✅ (own posting) | ✅ (own posting) |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. Reference

- Field matrix: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md`
- Plan overview: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md`
- Task A: `docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md`
- Skeleton UI B/C/D: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md`
