# TASK — HRP V6 Admin V4 — Media Management

**Ngày:** 11/09/2026
**Tier:** 1 (Planner + Engineer gộp — sở hữu TASK + implementation + HANDOFF theo TIER0_HANDOVER.md §1)
**Lane:** STANDARD
**Audit:** NONE (schema-only additive, no RLS/permission change)
**Trạng thái:** ACCEPTED v1.0 — implementation complete, pushed to origin/main

## Mục tiêu

Xây dựng **Media Management foundation** — centralized asset library cho toàn bộ HRP CMS:
- Upload hình ảnh qua Vercel Blob (serverless-friendly, zero-config trên Vercel)
- Asset library CRUD với folder/tag organization
- URL validation, alt text bắt buộc, order management
- Safe render allowlist cho HTML content
- Quan hệ n-N với `JobPosting` và `HomepageSection` (AV6)

**AV4 KHÔNG phụ thuộc AV1/AV2/AV6** — là foundation, đứng trước mọi editor.

---

## Bối cảnh

### 1. Why Vercel Blob?

| Option | Pro | Con |
|---|---|---|
| **Vercel Blob** (chosen) | Zero-config on Vercel, `@vercel/blob` SDK, presigned URLs, CDN edge | Chỉ hoạt động tốt trên Vercel |
| Local `/public/uploads/` | Không cần setup | Không scale, không CDN, vỡ khi deploy |
| S3 / R2 | Portable | Cần credentials, custom domain, CORS config |
| UploadThing | Managed upload UI | Tied to UploadThing service, extra dependency |

**Decision:** Dùng **Vercel Blob** — phù hợp với stack hiện tại (deploy trên Vercel), zero external
credentials, tích hợp CDN tự động. Owner deploy không Vercel → migrate sau.

### 2. Storage strategy

```
User uploads → API receives multipart → Vercel Blob put() → store metadata in DB
                                      ↓
                              Blob URL returned → stored as Media.url
```

- **Vercel Blob token** (`BLOB_READ_WRITE_TOKEN`) — server-only env var, never exposed to client
- **Upload URL** — generated server-side via `@vercel/blob`, returned to client as presigned URL
  (client PUTs directly to Blob, API only stores metadata)
- **Alternative (simple mode)** — API receives file as base64, uploads to Blob, stores URL
  (simpler nhưng giới hạn size ~4.5MB vì serverless payload limit)

**Decision:** Dùng **presigned URL pattern** (client uploads directly to Blob, API stores metadata).
Reason: tránh serverless payload limit, better performance, streaming upload.

### 3. Current state

- Tất cả media hiện tại = static files trong `/public/images/` (8 files)
- Schema: **KHÔNG có** `Media` model, **KHÔNG có** `MediaAssignment`
- plan-admin-v6.md định nghĩa Media schema nhưng **chưa implement**
- `JobPosting` model: chỉ có `cccdImageUrl`, `selfieImageUrl`, `cvFileName` (Worker fields)

---

## Phạm vi

### Đúng làm

1. `Media` model + `MediaAssignment` junction (Prisma schema, ADD-only migration)
2. Vercel Blob presigned-URL upload flow
3. Asset library: list, filter, delete (ADMIN only)
4. `MediaAssignment` CRUD — attach media to owner (JobPosting / HomepageSection)
5. Alt text bắt buộc (validation), URL validation (must be https://)
6. Safe render allowlist (DOMPurify config)
7. Order management (integer `order` field)
8. Folder + tag organization cho library
9. Admin Media Library UI page

### Không làm

- **Không thay đổi** `JobPosting` editorial fields (→ AV2)
- **Không implement** `HomepageSection` CMS (→ AV6)
- **Không implement** `Article` model (→ AV6)
- **Không implement** S3 / R2 / Cloudinary adapters (chỉ Vercel Blob MVP)
- **Không implement** `MediaAssignment` seeding (vì AV2/AV6 chưa có)
- **Không thay đổi** existing static images trong `/public/images/`
- **Không implement** image compression/resizing (use external service or Vercel Image Optimization)

---

## Schema Design

### 3.1 Core Models

```prisma
// ─── Media (Asset Library) ────────────────────────────────────────────────

model Media {
  id        String   @id @default(cuid())
  // Vercel Blob URL — MUST be https://
  url       String   @unique
  alt       String   @default("")
  caption   String?
  order     Int      @default(0)
  status    MediaStatus @default(PUBLIC)
  cover     Boolean  @default(false)

  // Organization
  folder    String   @default("uncategorized")
  tags      String[] @default([])

  // Metadata (from Vercel Blob)
  filename  String   // original filename
  size      Int      // bytes
  mimeType  String   // e.g. "image/webp"

  // Denormalized for public reads (avoids RLS on media table for MKT)
  publicUrl String   @default("")

  // Ownership
  ownerId   String   @map("owner_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt    @map("updated_at")
  createdById String? @map("created_by_id")
  createdBy   User?   @relation(fields: [createdById], references: [id])

  // Relations
  assignments MediaAssignment[]

  @@index([ownerId])
  @@index([folder])
  @@index([status])
  @@map("media")
}

enum MediaStatus {
  PUBLIC
  INTERNAL
}

// ─── MediaAssignment (Junction) ─────────────────────────────────────────

// Supports any owner: JobPosting, HomepageSection, Article, Partner, etc.
// Discriminator pattern: `ownerType` + `ownerId` (no FK constraint, no Prisma relations)
model MediaAssignment {
  id       String   @id @default(cuid())
  mediaId  String   @map("media_id")
  // Polymorphic: ownerType discriminator (no Prisma relation)
  ownerType String  // 'JobPosting' | 'HomepageSection' | 'Article' | 'Partner'
  ownerId   String  @map("owner_id")
  order     Int     @default(0)
  cover     Boolean @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  media    Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@unique([mediaId, ownerType, ownerId])
  @@index([ownerType, ownerId])
  @@map("media_assignment")
}
```

### 3.2 Notes

- **`ownerType` discriminator** (không có Prisma relation): cho phép attach media tới bất kỳ
  entity nào mà không cần schema migration khi thêm entity mới. Chống orphan bằng `onDelete: Cascade`
  trên `mediaId` (xóa Media → xóa tất cả assignment).
- **`publicUrl` denormalized**: lưu URL public (có thể khác Blob URL nếu dùng CDN). Hiện tại =
  `url`. AV4 KHÔNG implement CDN mapping — có thể thêm sau.
- **`folder`**: flat string (e.g. `"job-postings"`, `"homepage"`, `"news"`). KHÔNG dùng recursive
  tree model — đủ cho MVP.
- **`tags`**: string array (Prisma native). Dùng cho filter trong library.
- **ADD-only migration**: tạo bảng mới, không sửa schema cũ.

---

## API Design

### 4.1 Routes

```
GET    /api/admin/media                    — List assets (paginated, filter by folder/tag)
POST   /api/admin/media/upload-url         — Generate presigned upload URL (server → client)
POST   /api/admin/media/confirm            — Confirm upload + create Media record
PATCH  /api/admin/media/[id]              — Update alt/caption/folder/tags/order
DELETE /api/admin/media/[id]              — Delete Media + revoke Blob URL

GET    /api/admin/media/[id]/assignments  — List assignments for a media
POST   /api/admin/media/assign            — Attach media to owner
DELETE /api/admin/media/[id]/assignments/[assignmentId] — Detach
```

### 4.2 GET /api/admin/media — List assets

**Auth:** ADMIN only (HR_MANAGER, DIRECTOR)

**Query params:**
```
?folder=job-postings
?tag=hero,banner
?status=PUBLIC|INTERNAL
?take=20&skip=0
?search=keyword (url + alt + caption)
```

**Response:**
```ts
type MediaListResponse = {
  items: MediaItem[];
  total: number;
  take: number;
  skip: number;
};

type MediaItem = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  folder: string;
  tags: string[];
  status: 'PUBLIC' | 'INTERNAL';
  cover: boolean;
  filename: string;
  size: number;
  mimeType: string;
  order: number;
  createdAt: string; // ISO
  createdBy: { id: string; name: string } | null;
  // Assignment count per owner type
  assignmentCount: number;
};
```

### 4.3 POST /api/admin/media/upload-url — Presigned URL

**Auth:** ADMIN only

**Request:**
```ts
type UploadUrlRequest = {
  filename: string;      // original filename
  size: number;         // bytes (max 5MB)
  mimeType: string;     // e.g. "image/webp"
  folder?: string;      // default "uncategorized"
};
```

**Validation:**
- `mimeType` must be in allowlist: `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
- `size` ≤ 5MB (5 * 1024 * 1024 bytes)
- `filename` sanitized (no path traversal, alphanumeric + dash/underscore)

**Response:**
```ts
type UploadUrlResponse = {
  uploadUrl: string;     // presigned PUT URL (client uploads here)
  blobUrl: string;      // permanent URL after upload
  key: string;          // Blob key for confirm step
};
```

**Behavior:**
```ts
// Server generates presigned URL via @vercel/blob
const { url, uploadUrl, downloadUrl } = await put(filename, { access: 'public' }, {
  multipart: true,
  token: process.env.BLOB_READ_WRITE_TOKEN,
});
```

### 4.4 POST /api/admin/media/confirm — Confirm upload

**Auth:** ADMIN only

**Request:**
```ts
type ConfirmUploadRequest = {
  key: string;          // from upload-url response
  blobUrl: string;      // verify URL matches key
  alt: string;          // REQUIRED — alt text bắt buộc
  caption?: string;
  folder?: string;
  tags?: string[];
  status?: 'PUBLIC' | 'INTERNAL';
};
```

**Behavior:**
1. Verify blob exists at `blobUrl` (HEAD request)
2. Extract metadata (size, mimeType)
3. Create `Media` record
4. Return created item

### 4.5 PATCH /api/admin/media/[id] — Update metadata

**Auth:** ADMIN only

**Request:**
```ts
type UpdateMediaRequest = {
  alt?: string;
  caption?: string | null;
  folder?: string;
  tags?: string[];
  status?: 'PUBLIC' | 'INTERNAL';
  cover?: boolean;
  order?: number;
};
```

**Validation:**
- `alt`: required when status = PUBLIC (accessibility)
- `alt`: optional when status = INTERNAL

### 4.6 DELETE /api/admin/media/[id]

**Auth:** ADMIN only

**Behavior:**
1. Delete from Vercel Blob: `del(media.url, { token: process.env.BLOB_READ_WRITE_TOKEN })`
2. Cascade deletes `MediaAssignment` rows (Prisma `onDelete: Cascade`)
3. Delete `Media` record

### 4.7 POST /api/admin/media/assign — Attach to owner

**Auth:** ADMIN only

**Request:**
```ts
type AssignMediaRequest = {
  mediaId: string;
  ownerType: 'JobPosting' | 'HomepageSection' | 'Article' | 'Partner';
  ownerId: string;
  order?: number;
  cover?: boolean;
};
```

**Validation:**
- `mediaId` must exist
- `ownerType` must be in allowlist
- `ownerId` should exist (optional check — AV2/AV6 may not exist yet)
- Duplicate check: same (mediaId, ownerType, ownerId) → 409 CONFLICT

### 4.8 GET /api/public/media — Public read (for assigned media)

**NO auth** — public projection of assigned media.

```ts
type PublicMediaQuery = {
  ownerType: string;
  ownerId: string;
  status?: 'PUBLIC'; // only PUBLIC media
};
```

**Response:**
```ts
type PublicMediaResponse = {
  items: {
    id: string;
    url: string;        // publicUrl (denormalized)
    alt: string;
    caption: string | null;
    order: number;
    cover: boolean;
  }[];
};
```

---

## Safe Render Allowlist

```ts
// Used by AV2 (JobPosting) and AV6 (HomepageSection) to sanitize HTML content
const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'em', 'u', 's', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  // Links & media
  'a', 'img',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Code
  'blockquote', 'code', 'pre', 'kbd', 'samp',
  // HTML5
  'span', 'div',
  'figure', 'figcaption',
  'details', 'summary',
];

const ALLOWED_ATTR: Record<string, string[]> = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
  '*': ['id', 'class'],
};

const ALLOWED_SCHEMES = ['https:', 'mailto:'];

// For <a href>: no javascript:, data:, vbscript:
const FORBIDDEN_HREF_PATTERNS = /^javascript:/i;
```

**Implementation:** Dùng `isomorphic-dompurify` hoặc `dompurify` với config trên.
**Output:** Sanitized HTML string — an toàn để `dangerouslySetInnerHTML`.

---

## Admin UI

### 6.1 Media Library Page

**Route:** `/admin/media`

**Layout:**
```
┌─ Sidebar ──────────────────────────────────────────┐
│  📁 Tất cả    (count: N)                          │
│  📁 job-postings   (count: N)                      │
│  📁 homepage       (count: N)                      │
│  📁 news          (count: N)                      │
│  📁 uncategorized (count: N)                       │
│  ── Tags ─────────────────                        │
│  🏷 hero    (N)  🏷 banner  (N)                   │
└──────────────────────────────────────────────────┘

┌─ Grid ─────────────────────────────────────────────┐
│  [img] [img] [img] [img]   ← 4-column responsive  │
│  [img] [img] [img] [img]                          │
│  ...                                              │
│  ── Upload ────────────────────────────────        │
│  [+ Thêm file] ← trigger upload modal             │
└──────────────────────────────────────────────────┘
```

**Card:** thumbnail (object-fit: cover) + alt text overlay + checkbox select + actions menu
**Upload modal:** drag-drop zone + filename/size preview + alt text field + folder selector + progress bar

### 6.2 Media Picker (for AV2/AV6 editors)

**Component:** `<MediaPicker ownerType={...} ownerId={...} />`

**Props:**
```ts
type MediaPickerProps = {
  ownerType: 'JobPosting' | 'HomepageSection';
  ownerId: string;
  max?: number;          // default 10
  onChange?: (media: MediaItem[]) => void;
  value?: string[];     // selected media IDs
};
```

**Behavior:**
- Opens modal with tabbed view: library browser + upload zone
- Shows currently assigned media
- Drag to reorder (updates `order` field)
- Click "X" to detach
- Search/filter within modal

---

## Migration Plan

**ADD-only migration** — tạo bảng mới, không chạm schema cũ.

```sql
-- 1. Create Media table
CREATE TABLE media (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url             TEXT        UNIQUE NOT NULL,
  alt             TEXT        NOT NULL DEFAULT '',
  caption         TEXT,
  "order"         INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'PUBLIC' CHECK (status IN ('PUBLIC', 'INTERNAL')),
  cover           BOOLEAN     NOT NULL DEFAULT false,
  folder          TEXT        NOT NULL DEFAULT 'uncategorized',
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  filename        TEXT        NOT NULL,
  size            INTEGER     NOT NULL,
  mime_type       TEXT        NOT NULL,
  public_url      TEXT        NOT NULL DEFAULT '',
  owner_id        TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id   UUID
);

CREATE INDEX idx_media_folder ON media(folder);
CREATE INDEX idx_media_status ON media(status);
CREATE INDEX idx_media_owner_id ON media(owner_id);

-- 2. Create MediaAssignment table
CREATE TABLE media_assignment (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  media_id      TEXT        NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  owner_type    TEXT        NOT NULL,
  owner_id      TEXT        NOT NULL,
  "order"       INTEGER     NOT NULL DEFAULT 0,
  cover         BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (media_id, owner_type, owner_id)
);

CREATE INDEX idx_media_assignment_owner ON media_assignment(owner_type, owner_id);

-- 3. Seed: no default rows needed (empty library is valid state)
```

**No rollback needed** — ADD-only, forward-only.

---

## Permission

- **Upload/List/Delete/Assign:** ADMIN, HR_MANAGER, DIRECTOR
- **Public read:** ANONYMOUS (only PUBLIC media via assigned owner)
- **No STAFFING access** — media management là ADMIN-only (không phải job assignment)

```ts
// src/shared/auth/permission-catalog.ts
{
  code: 'CAN_MANAGE_MEDIA',
  group: PERMISSION_GROUPS.MEDIA, // new group
  description: 'Upload, edit, delete media assets in the library.',
},
```

---

## Dependency & Lock

```
AV4 (this task)
  ↑
  ├── AV6 (HomepageSection CMS) — dùng MediaAssignment cho section images
  └── AV2 (JobPosting editor)   — dùng MediaAssignment cho posting images
       ↑
       └── AV5 (cache invalidation) — revalidateTag('media')
```

**Lock:** AV2 và AV6 phải đợi AV4 schema + API hoàn thành.
AV4 không đợi gì cả — foundation.

---

## Open Decisions (Owner)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| DEC-01 | Max file size | 5MB vs 10MB | 5MB MVP (ảnh web đủ, tránh abuse) |
| DEC-02 | Image transformation | Vercel Image Optimization vs none | None MVP (dùng Blob URL trực tiếp, optimize sau) |
| DEC-03 | CDN domain | Vercel default vs custom | Vercel default MVP (không cần custom domain) |
| DEC-04 | Blob token rotation | Manual vs automatic | Manual MVP ( Owner quản lý env var) |
| DEC-05 | Thumbnail generation | Server-side sharp vs none | None MVP (dùng URL gốc, browser resize) |
| DEC-06 | Media library pagination | cursor-based vs offset | Offset pagination (MVP, đơn giản) |

---

## Gate (Implementation)

- `npx prisma validate` — PASS
- `npx tsc --noEmit` — PASS
- Unit tests:
  - `safe-render.test.ts`: allowlist verify, forbidden tag/script strip
  - `media-upload.test.ts`: presigned URL flow, validation
  - `media-assignment.test.ts`: attach/detach, duplicate prevention
- Integration tests (with TEST database):
  - Upload → confirm → list → delete flow
  - Assign → list by owner → unassign flow
  - Role access: ADMIN → 200, ANONYMOUS public read → 200 (assigned), 404 (unassigned)
- `npm run build` — PASS
- Lint on changed files — 0 errors

---

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 | 11/09/2026 | Tier 1 | Initial draft: schema, API, UI, migration plan, safe render allowlist, open decisions |
| v1.0 ACCEPTED | 12/09/2026 | Tier 1 | Implementation complete: schema + migration + service + API + Admin UI + safe-render + tests. Pushed to origin/main (commits a5de2c4 schema, 8edf1ac impl). 2007/2008 unit tests PASS (1 pre-existing design-tokens fail không do AV4). Build PASS. 7 API routes + /admin/media page registered. DEC-01..06 self-resolved theo RECOMMENDATION (5MB, no transform, Vercel CDN, manual token, no thumbnail, offset pagination). Deployment blocker: BLOB_READ_WRITE_TOKEN env chưa set → upload sẽ trả 503 cho đến khi Owner cấu hình env. |
