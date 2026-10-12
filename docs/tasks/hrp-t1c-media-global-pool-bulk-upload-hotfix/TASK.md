# TASK — `hrp-t1c-media-global-pool-bulk-upload-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-media-global-pool-bulk-upload-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Pre-P2 gate cô lập. Blast radius: 1 helper mới, 1 service update, 1 route update, 2 admin client surfaces (Library + Picker) + 2 settings surfaces (Hero picker + Slides picker), 1 job-posting card caller. Không schema/migration/data rewrite. Tier 1 self-review. |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` |
| Baseline | `04d91666b4ab024c5a4048dfbb947e3d3a97a82a` (origin/main @ PR #119) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` (unit) |
| Correction budget | `1` |
| In-scope roots | `src/domains/media/media-alt.ts` (new); `src/domains/media/media-alt.test.ts` (new); `src/domains/media/media.service.ts`; `src/domains/media/__tests__/media.service.test.ts`; `app/api/admin/media/route.ts`; `app/api/admin/media/confirm/route.ts`; `app/api/admin/media/confirm/route.test.ts` (new); `app/api/admin/media/upload-url/route.ts`; `app/admin/media/page.tsx`; `app/admin/media/media-library-client.tsx`; `app/admin/media/media-bulk-upload.tsx` (new); `app/admin/media/media-bulk-upload.test.tsx` (new); `app/admin/media/__tests__/media-library-no-folder-ui.test.tsx` (new); `app/admin/jobs/job-postings/[id]/media-picker.tsx`; `app/admin/jobs/job-postings/[id]/media-card.tsx`; `app/admin/jobs/job-postings/[id]/__tests__/media-picker-no-folder.test.tsx` (new); `app/admin/settings/_components/hero-image-picker.tsx`; `app/admin/settings/_components/hero-slides-editor.tsx`; `app/admin/settings/__tests__/hero-pickers-no-folder.test.tsx` (new); `docs/tasks/hrp-t1c-media-global-pool-bulk-upload-hotfix/**` |
| Forbidden paths | `prisma/schema.prisma`; `prisma/migrations/**`; `src/domains/media/media.types.ts` (DTO không đổi; giữ `folder` cho backward-compat); mọi thay đổi đụng `MEDIA_DEFAULT_FOLDERS` (giữ constant export vì caller cũ có thể import); mọi thay đổi đụng `CAN_MANAGE_MEDIA` permission code/role/group; mọi thay đổi đụng `MEDIA_ALLOWED_MIME_TYPES` / `MAX_UPLOAD_BYTES`; mọi thay đổi đụng Vercel Blob token path (`BLOB_READ_WRITE_TOKEN`); mọi thay đổi đụng `MediaAssignment` lifecycle/ownerType allowlist; mọi thay đổi đụng `publicSelect` allowlist của public DTO |
| Required gates | `npm run typecheck`; `npm run lint`; `npx vitest run --config vitest.unit.config.ts src/domains/media/__tests__/media.service.test.ts src/domains/media/media-alt.test.ts`; `npx vitest run --config vitest.unit.config.ts app/api/admin/media/confirm/route.test.ts app/admin/media/media-bulk-upload.test.tsx app/admin/media/__tests__/media-library-no-folder-ui.test.tsx app/admin/jobs/job-postings/[id]/__tests__/media-picker-no-folder.test.tsx app/admin/settings/__tests__/hero-pickers-no-folder.test.tsx`; `npm test` (full unit, regression); `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1` (optional, range) |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver` → resolve |

> Lane `STANDARD` + Audit `NONE`: Tier 1 tự review toàn bộ theo checklist trong §6. Nếu gặp conflict với `prisma/schema.prisma` hoặc `prisma/migrations/**`, hoặc phát hiện contract drift không thể resolve trong budget → DỪNG, không tự ý nâng lane/audit.

## 1. Outcome

### 1.1 User-visible outcome

**Media Library** (`/admin/media`):

- Header vẫn giữ nguyên: tiêu đề + button "Tải lên tệp mới".
- **Bỏ sidebar "Thư mục"** (aside cột trái): không còn block "Tất cả / Tin tuyển dụng / Trang chủ / Tin tức / Biểu ngữ / Chưa phân loại"; không còn URL `?folder=...`.
- **Bỏ folder select** trong UploadModal: chỉ giữ status select (PUBLIC/INTERNAL) + alt/caption (caption optional; alt tự sinh server-side).
- **Bỏ folder select** trong EditModal: chỉ giữ alt/caption/status/cover PATCH.
- **Bỏ tên folder** trên MediaCard: chỉ hiển thị filename + alt + assignmentCount.
- **UploadModal → BulkUploadModal**: file input `multiple`, giới hạn 20 file/batch, danh sách file với 4 trạng thái (`Chờ tải` / `Đang tải` / `Thành công` / `Thất bại kèm thông báo tiếng Việt`), tiến độ tổng `Đã tải X/Y ảnh`, nút "Thử lại" cho mỗi file thất bại, nút "Tải lên" tổng (chỉ chạy các file `Chờ tải` hoặc `Thất bại`).

**JobPosting picker** (`MediaPicker` drawer từ `media-card.tsx`):

- **Bỏ folder select** — chỉ search + status.
- **Bỏ alt input** — server authority.
- **Bỏ tên folder trên card** — chỉ hiển thị alt + filename.
- Upload tab dùng cùng Bulk Upload queue (multiple + queue + bounded concurrency).

**Admin Settings Hero picker** (`HeroImagePicker`):

- Fetch `/api/admin/media` (không folder) → hiển thị toàn bộ PUBLIC media.
- Empty-state + error message generic ("Chưa có ảnh nào trong Thư viện Media. Upload tại `/admin/media` rồi quay lại."), bỏ tham chiếu folder `homepage`.

**Admin Settings Hero Slides picker** (`HeroSlidesEditor`):

- Cùng thay đổi với `HeroImagePicker`.

**Server-side** (authority cho alt):

- Helper `deriveMediaAlt(filename)` (NEW) — pure, deterministic, áp dụng 6 quy tắc chuẩn hóa tên file → alt text. Max 500 chars. Fallback `Hình ảnh`.
- `POST /api/admin/media/confirm` — khi body.alt rỗng/whitespace, tự derive từ filename (`headResult.pathname.split('/').pop()`). Server vẫn authority; UI không bắt buộc nhập.
- `createMedia` trong service — khi input.alt rỗng/whitespace, tự derive từ input.filename (defense-in-depth).
- `POST /api/admin/media/upload-url` — bỏ field `folder` trong FormData (accept-and-ignore); pathname dùng technical prefix `media/` (thay vì `<folder>/<timestamp>-<filename>`).
- `GET /api/admin/media` — bỏ parse `folder` query param khỏi `parseQuery` (accept-and-ignore cho URL cũ, không filter).

### 1.2 Non-goals

- KHÔNG AI/external API để sinh alt.
- KHÔNG Prisma schema change / migration / data rewrite.
- KHÔNG tạo uploader/storage thứ hai; vẫn dùng `@vercel/blob` qua `/api/admin/media/upload-url` + `/api/admin/media/confirm`.
- KHÔNG thêm/cập nhật permission code ngoài `CAN_MANAGE_MEDIA`.
- KHÔNG thay đổi MIME allowlist hoặc 5 MB limit.
- KHÔNG multi-pick (Job Posting picker vẫn pick 1; bulk upload chỉ upload nhiều).
- KHÔNG drag-reorder trong Media Library.
- KHÔNG image transformation / thumbnail.
- KHÔNG inline-upload trong Settings Hero picker (giữ pattern "upload ở /admin/media rồi quay lại Settings").
- KHÔNG xóa cột `Media.folder` khỏi schema; KHÔNG rewrite dữ liệu legacy.
- KHÔNG sửa `MEDIA_DEFAULT_FOLDERS` constant (vẫn export vì caller cũ có thể import — chỉ đảm bảo UI không còn dùng).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/schema.prisma:1775-1813` | `Media` model có field `folder String @default("uncategorized")`. Hotfix mới giữ nguyên column; chỉ loại bỏ DTO-side filter from UI/services. |
| `EV-02` | `src/domains/media/media.service.ts:276-315` | `listMedia` đang filter `where.folder = query.folder`. Cần bỏ filter này (giữ signature để backward-compat). |
| `EV-03` | `src/domains/media/media.service.ts:72-92` | `validateCreateInput` đang bắt buộc alt non-empty khi PUBLIC. Cần cho phép alt rỗng → derive từ filename. |
| `EV-04` | `app/api/admin/media/route.ts:19-31` | `parseQuery` đang parse `folder` từ searchParams. Cần bỏ parse. |
| `EV-05` | `app/api/admin/media/confirm/route.ts:60-100` | Confirm đọc `body.alt` required; cần derive khi alt rỗng. |
| `EV-06` | `app/api/admin/media/upload-url/route.ts:78-110` | Upload-url nhận FormData field `folder`; pathname build `${folder}/<ts>-<filename>`. Cần bỏ folder input + đổi prefix `media/`. |
| `EV-07` | `app/admin/media/media-library-client.tsx:57-170` | Library có sidebar `FOLDERS` constant, UploadModal có folder select, EditModal có folder select, MediaCard hiển thị folder label. Cần bỏ tất cả. |
| `EV-08` | `app/admin/jobs/job-postings/[id]/media-picker.tsx:339-356` | MediaPicker JobPosting có folder select + alt input. Cần bỏ cả 2 + bỏ folder label trên card. |
| `EV-09` | `app/admin/jobs/job-postings/[id]/media-card.tsx:587-594` | MediaCard gọi `<MediaPicker defaultFolder="job-postings" />`. Cần bỏ defaultFolder prop. |
| `EV-10` | `app/admin/settings/_components/hero-image-picker.tsx:32-55` | HeroImagePicker fetch `/api/admin/media?folder=homepage`. Cần bỏ folder param. |
| `EV-11` | `app/admin/settings/_components/hero-slides-editor.tsx:54-77` | HeroSlidesEditor fetch `/api/admin/media?folder=homepage`. Cần bỏ folder param. |
| `EV-12` | `src/domains/media/__tests__/media.service.test.ts:335-345` | Test `listMedia` hiện chỉ verify paginate + count; chưa có test folder filter. Bổ sung test "createMedia derives alt". |
| `EV-13` | `app/admin/jobs/job-postings/[id]/__tests__/media-picker.test.tsx` | Test MediaPicker hiện assert `data-testid="media-picker-folder"`. Cần cập nhật: folder testid bị xóa khỏi render. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Helper `deriveMediaAlt(filename: string): string` đặt tại `src/domains/media/media-alt.ts` (NEW). Pure function, deterministic, 6 quy tắc theo directive (xem §5.2). Max 500 chars. Fallback `'Hình ảnh'` khi rỗng. | `CHOSEN` |
| `DEC-02` | `createMedia` trong service tự gọi `deriveMediaAlt(input.filename)` khi `input.alt.trim() === ''` hoặc undefined. Validate length 500 sau derive. Server vẫn authority; UI không bắt buộc nhập. | `CHOSENNA` |
| `DEC-03` | `POST /api/admin/media/confirm` derive alt từ `headResult.pathname.split('/').pop()` khi `body.alt.trim() === ''`. Truyền alt đã derive xuống `createMedia`. UI không cần gửi alt field. | `CHOSENNA` |
| `DEC-04` | `POST /api/admin/media/upload-url` bỏ đọc `FormData` field `folder`; accept-and-ignore. Pathname = `media/<Date.now()>-<sanitized-filename>`. Vẫn validate filename + mime + size theo allowlist cũ. | `CHOSENNA` |
| `DEC-05` | `GET /api/admin/media` route bỏ parse `folder` từ searchParams (giữ accept-and-ignore). Service `listMedia` bỏ `where.folder = query.folder` (giữ `query.folder?: string` trên DTO cho backward-compat). Media cũ ở mọi folder vẫn list. | `CHOSENNA` |
| `DEC-06` | `app/admin/media/page.tsx` bỏ đọc `searchParams.folder`; luôn render MediaLibraryClient với `folderFilter=''`. URL `/admin/media?folder=homepage` không error, render kho chung. | `CHOSENNA` |
| `DEC-07` | `media-library-client.tsx` xóa sidebar `aside`, xóa `FOLDERS` constant, xóa folder select trong UploadModal và EditModal, xóa `mediaFolderLabel(item.folder)` trên MediaCard. Thay UploadModal thành BulkUploadModal (xem DEC-09). | `CHOSENNA` |
| `DEC-08` | `MediaPicker` JobPosting bỏ folder select, bỏ alt input, bỏ folder label trên card. Upload tab dùng BulkUploadPanel. `MediaPickerProps.defaultFolder` vẫn accepted-and-ignored để giữ type stable cho caller tương lai. | `CHOSENNA` |
| `DEC-09` | Bulk upload component `app/admin/media/media-bulk-upload.tsx` (NEW): MAX_BATCH_SIZE = 20, MAX_CONCURRENCY = 3, per-item status `PENDING | UPLOADING | SUCCESS | ERROR`, helper `deriveMediaAlt(file.name)` chạy 1 lần khi set batch → UI preview alt (read-only). Bounded concurrency bằng worker pool async, mỗi worker gọi `POST /api/admin/media/upload-url` (FormData) → `POST /api/admin/media/confirm` (JSON). Retry chỉ ERROR items. Cleanup `URL.createObjectURL` trong `useEffect` cleanup + reset. | `CHOSENNA` |
| `DEC-10` | Hero picker (`HeroImagePicker`, `HeroSlidesEditor`) fetch `/api/admin/media?take=24` không folder. Empty-state generic: "Chưa có ảnh nào trong Thư viện Media. Upload tại `/admin/media` rồi quay lại." | `CHOSENNA` |
| `DEC-11` | Test surface (5 file mới + 1 cập nhật): (1) `media-alt.test.ts` — 8 cases helper; (2) `media.service.test.ts` — thêm case derive alt; (3) `confirm/route.test.ts` — regression confirm với `alt:''`; (4) `media-bulk-upload.test.tsx` — queue tests; (5) `media-library-no-folder-ui.test.tsx` — static fence; (6) `media-picker-no-folder.test.tsx` — cập nhật MediaPicker test; (7) `hero-pickers-no-folder.test.tsx` — static fence. | `CHOSENNA` |
| `DEC-12` | Không touch `MEDIA_DEFAULT_FOLDERS` constant export. Có thể còn caller cũ ngoài scope; constant chỉ là label catalog, không phải navigation rule. MediaUI `mediaFolderLabel` helper vẫn export nếu có caller khác. Không đảm bảo 100% không còn import. | `CHOSENNA` |
| `DEC-13` | Acceptance: full unit test pass; build pass; typecheck pass; lint pass; verify-encoding pass; git diff --check clean. 1 correction budget post-audit. | `CHOSENNA` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `deriveMediaAlt` helper | None internal | `BUILD` | Internal HRP | New file `src/domains/media/media-alt.ts` — pure function, ≤ 60 LOC | Server-side only; called từ service `createMedia` và route `confirm`. | Capability rất niche (filename → alt text chuẩn hóa với Vietnamese-friendly + UUID strip). Không có library trưởng thành phù hợp. Wrapper lib sẽ rò rỉ lib vào domain layer. |
| Bulk Upload UI | None internal | `BUILD` (CUSTOM_BUILD_JUSTIFICATION) | Internal HRP | New file `app/admin/media/media-bulk-upload.tsx` — bounded concurrency queue | Re-use existing routes `/api/admin/media/upload-url` + `/api/admin/media/confirm` qua fetch. | Capability rất scope-specific (≤ 20 file, ≤ 5 MB/file, Vietnamese UX, partial success). Không có candidate trưởng thành cho "bounded-concurrency multipart upload queue + Vercel Blob presigned" với cùng ownership scope. Wrapper lib upload sẽ vướng rò rỉ uploader/storage thứ hai — vi phạm invariants. |
| `MEDIA_ALLOWED_MIME_TYPES` + `MAX_UDS_BYTES` | `src/domains/media/media.types.ts:14-25` | `ADOPT` | Internal HRP | Adopt as-is | Bulk upload import cùng constant. | Invariants không đổi MIME/size. |
| `MEDIA_DEFAULT_FOLDERS` | `src/domains/media/media.types.ts:37-43` | `ADOPT` (giữ export) | Internal HRP | Adopt as-is (vẫn export; UI không dùng nữa) | Không wrapper mới. | Constant chỉ là label catalog; không vi phạm "no folder navigation". |
| Media Library UI shell | `app/admin/media/media-library-client.tsx` | `ADOPT partial` | Internal HRP | Edit mỗi phần trong file; KHÔNG copy/paste sang file mới. | Giữ nguyên pattern hook/router, chỉ bỏ folder UI + đổi UploadModal → BulkUploadModal. | Repo rule "không rewrite Media Library ngoài phạm vi". |
| JobPosting MediaPicker | `app/admin/jobs/job-postings/[id]/media-picker.tsx` | `ADOPT partial` | Internal HRP | Edit tại chỗ; KHÔNG split file. | Giữ nguyên SlideOutDrawer; chỉ bỏ folder select + alt input + BulkUploadPanel. | Repo rule + DEC-08. |
| Settings Hero pickers | `hero-image-picker.tsx`, `hero-slides-editor.tsx` | `ADOPT partial` | Internal HRP | Edit tại chỗ; KHÔNG rewrite UX. | Chỉ đổi fetch URL + empty-state message. | Repo rule "không inline-upload trong picker". |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Reason |
|---|---|---|---|---|---|
| N/A | n/a | `N/A` | n/a | n/a | Task không tạo connector/scheduler/notification worker. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/domains/media/media-alt.ts` (NEW) export `deriveMediaAlt(filename: string): string`, `DEFAULT_MEDIA_ALT = 'Hình ảnh'`, `MAX_ALT_LENGTH = 500`. Pure function, deterministic. Áp dụng 6 quy tắc theo directive (xem §5.2). |
| `RQ-02` | `deriveMediaAlt` strip timestamp prefix dạng `^\d{10,13}` (Unix epoch seconds/ms) ở đầu filename. |
| `RQ-03` | `deriveMediaAlt` strip UUID v4/v1 form `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` ở đầu filename. Lặp lại để strip chain (`1715000000_<uuid>_x.jpg` → `x`). |
| `RQ-04` | `deriveMediaAlt` strip ISO timestamp `^\d{4}-\d{2}-\d{2}[T_\-]\d{2}-\d{2}-\d{2}(?:[._-]\d+)?` ở đầu filename. |
| `RQ-05` | `deriveMediaAlt` giữ nguyên Vietnamese diacritics (`ảnh_văn_phòng_công_ty.webp` → `ảnh văn phòng công ty`). |
| `RQ-06` | `deriveMediaAlt` giới hạn 500 chars; cắt bằng `slice(0, MAX_ALT_LENGTH).trimEnd()`. |
| `RQ-07` | `createMedia` trong `media.service.ts`: khi `input.alt === undefined` hoặc `input.alt.trim() === ''`, gọi `deriveMediaAlt(input.filename)` và dùng kết quả làm `input.alt`. Sau derive vẫn validate length. |
| `RT-08` | `POST /api/admin/media/confirm`: khi `body.alt.trim() === ''`, derive từ `headResult.pathname.split('/').pop()` (phần cuối pathname = filename trên Blob). Truyền alt đã derive xuống `createMedia`. Validation `MEDIA_ALLOWED_MIME_TYPES`/`MAX_UPLOAD_BYTES` không đổi. |
| `RQ-09` | `POST /api/admin/media/upload-url`: bỏ đọc field `folder` trong FormData (accept-and-ignore nếu client vẫn gửi). Pathname = `media/<Date.now()>-<safeFilename>` (technical, không phải business folder). Vẫn validate `validateFilename`/`mimeType`/`size`. |
| `RQ-10` | `GET /api/admin/media`: bỏ parse `folder` từ searchParams (accept-and-ignore nếu client vẫn gửi). `MediaListQuery.folder` vẫn optional trên DTO (backward-compat). `listMedia` service KHÔNG dùng `query.folder` để filter `where`. |
| `RQ-11` | `app/admin/media/page.tsx`: bỏ đọc `searchParams.folder`. Luôn pass `folderFilter=''` xuống MediaLibraryClient. |
| `RQ-12` | `media-library-client.tsx`: xóa sidebar `<aside>` chứa `FOLDERS`, xóa `FOLDERS` constant, xóa folder select trong `UploadModal` và `EditModal`, xóa `mediaFolderLabel(item.folder)` trên `MediaCard`. Thay `UploadModal` thành `BulkUploadModal` (xem RQ-15). |
| `RQ-13` | `media-picker.tsx` JobPosting: bỏ folder select (`<select data-testid="media-picker-folder">`), bỏ alt input, bỏ folder label trên card (`mediaFolderLabel(item.folder)`). Upload tab dùng `BulkUploadPanel`. |
| `RQ-14` | `media-card.tsx` JobPosting: bỏ prop `defaultFolder="job-postings"` trên `<MediaPicker />`. |
| `RQ-15` | `app/admin/media/media-bulk-upload.tsx` (NEW): `MAX_BATCH_SIZE = 20`, `MAX_CONCURRENCY = 3`. Worker pool async; mỗi item gọi `POST /api/admin/media/upload-url` (FormData `file`) → `POST /api/admin/media/confirm` (JSON với `alt` từ `deriveMediaAlt(file.name)`). Per-item status enum. Progress `Đã tải X/Y ảnh`. Retry chỉ ERROR. Disable "Tải lên" khi busy. Cleanup object URL khi unmount/reset/close. Modal backdrop không close khi `busy=true`. |
| `RQ-16` | `hero-image-picker.tsx`: fetch `/api/admin/media?take=24` (không folder). Empty-state: "Chưa có ảnh nào trong Thư viện Media. Upload tại /admin/media rồi quay lại.". Error message generic (bỏ đề cập folder `homepage`). |
| `RQ-17` | `hero-slides-editor.tsx`: cùng thay đổi với `hero-image-picker.tsx` (xem RQ-16). |
| `RQ-18` | Acceptance criteria: AC-01..AC-13 (xem §6). Full unit test pass, typecheck pass, lint pass, build pass, verify-encoding pass, git diff --check clean. 1 correction budget post-audit. |

### 4.2 Scope boundaries

- **In:**
  - Helper `deriveMediaAlt` + 8 unit test cases.
  - Service `createMedia` auto-derive alt (defense-in-depth).
  - Routes `/api/admin/media`, `/api/admin/media/upload-url`, `/api/admin/media/confirm` updates.
  - MediaLibraryClient UI: drop sidebar, drop folder select, drop folder label on card, swap UploadModal → BulkUploadModal.
  - MediaPicker (JobPosting): drop folder select, drop alt input, drop folder label on card, BulkUploadPanel.
  - MediaCard (JobPosting): drop `defaultFolder` prop.
  - HeroImagePicker + HeroSlidesEditor: drop folder query.
  - 5 test files (4 new + 1 update) + cập nhật media-picker.test.tsx.
- **Out of scope:**
  - Schema/migration/data rewrite.
  - Inline-upload trong Settings Hero picker.
  - AI alt generation.
  - Multi-pick JobPosting picker (vẫn pick 1).
  - Drag-reorder trong Library.
  - Image transformation / thumbnail.
  - Permission code mới.
  - MIME allowlist / 5 MB limit.
  - Vercel Blob token path.

## 5. Execution Plan

### 5.1 File tree delta

```
src/domains/media/
  media-alt.ts (NEW)
  media-alt.test.ts (NEW, đặt cạnh media-alt.ts theo convention vitest)
  media.service.ts (EDIT: createMedia auto-derive; listMedia bỏ where.folder)
  __tests__/
    media.service.test.ts (EDIT: thêm case derive alt)

app/api/admin/media/
  route.ts (EDIT: bỏ parse folder)
  upload-url/route.ts (EDIT: bỏ folder field; pathname = media/<ts>-<filename>)
  confirm/route.ts (EDIT: derive alt khi body.alt rỗng)
  confirm/route.test.ts (NEW)

app/admin/media/
  page.tsx (EDIT: bỏ searchParams.folder)
  media-library-client.tsx (EDIT: bỏ sidebar; bỏ folder UI; BulkUploadModal)
  media-bulk-upload.tsx (NEW)
  media-bulk-upload.test.tsx (NEW)
  __tests__/
    media-library-no-folder-ui.test.tsx (NEW)

app/admin/jobs/job-postings/[id]/
  media-picker.tsx (EDIT: bỏ folder select; bỏ alt input; bỏ folder label; BulkUploadPanel)
  media-card.tsx (EDIT: bỏ defaultFolder prop)
  __tests__/
    media-picker-no-folder.test.tsx (NEW hoặc UPDATE media-picker.test.tsx)

app/admin/settings/
  _components/
    hero-image-picker.tsx (EDIT: fetch không folder, đổi message)
    hero-slides-editor.tsx (EDIT: fetch không folder, đổi message)
  __tests__/
    hero-pickers-no-folder.test.tsx (NEW)

docs/tasks/hrp-t1c-media-global-pool-bulk-upload-hotfix/
  TASK.md (this file)
  HANDOFF.md (later)
```

### 5.2 `deriveMediaAlt` algorithm

```ts
// src/domains/media/media-alt.ts
export const DEFAULT_MEDIA_ALT = 'Hình ảnh';
export const MAX_ALT_LENGTH = 500;

// Patterns strip đầu filename (lặp để strip chain)
const PREFIX_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}[T_\-]\d{2}-\d{2}-\d{2}(?:[._-]\d+)?[-_.\s]+/u,
  /^\d{10,13}[-_.\s]+/u,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_.\s]+/iu,
];

export function deriveMediaAlt(filename: string): string {
  // 1. Lấy basename, bỏ extension
  const base = (filename ?? '').split(/[\\/]/).pop() ?? '';
  let stem = base.replace(/\.[^./]+$/u, '');

  // 2. Strip chuỗi prefix kỹ thuật (lặp để xử lý chain)
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIX_PATTERNS) {
      const m = stem.match(p);
      if (m) {
        stem = stem.slice(m[0].length);
        changed = true;
        break;
      }
    }
  }

  // 3. Thay _, -, và chuỗi whitespace liên tiếp bằng 1 space
  let s = stem.replace(/[_\-\s]+/gu, ' ');

  // 4. Trim
  s = s.trim();

  // 5. Fallback
  if (!s) return DEFAULT_MEDIA_ALT;

  // 6. Giới hạn 500 chars (cắt + trimEnd)
  return s.length > MAX_ALT_LENGTH ? s.slice(0, MAX_ALT_LENGTH).trimEnd() : s;
}
```

### 5.3 Bulk upload queue

```ts
// app/admin/media/media-bulk-upload.tsx (sketch)
const MAX_BATCH_SIZE = 20;
const MAX_CONCURRENCY = 3;

interface BatchItem {
  id: string;            // crypto.randomUUID()
  file: File;
  previewUrl: string;
  alt: string;           // deriveMediaAlt(file.name) — preview only
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  error?: string;        // Vietnamese
  mediaItem?: MediaItemDto;
}

async function runQueue(items: BatchItem[], setItems, signal: AbortSignal) {
  const queue = items.slice();
  let active = 0;
  await new Promise<void>((resolve) => {
    const launch = () => {
      while (active < MAX_CONCURRENCY && queue.length > 0) {
        if (signal.aborted) break;
        const idx = queue.shift()!;
        active++;
        void runOne(idx, signal).finally(() => {
          active--;
          if (queue.length === 0 && active === 0) resolve();
          else launch();
        });
      }
    };
    launch();
  });
}
```

### 5.4 Execution order

| Step | Surface | Description | Gates local |
|---|---|---|---|
| `STEP-01` | `src/domains/media/media-alt.ts` (NEW) + `media-alt.test.ts` (NEW) | Tạo helper `deriveMediaAlt` + 8 cases unit test (theo §1.1 RQ-01..RQ-06). | `npx vitest run --config vitest.unit.config.ts src/domains/media/media-alt.test.ts` |
| `STEP-02` | `src/domains/media/media.service.ts` + `__tests__/media.service.test.ts` | `createMedia` auto-derive alt khi input rỗng (RQ-07); `listMedia` bỏ `where.folder = query.folder`. Cập nhật test cũ. | `npx vitest run --config vitest.unit.config.ts src/domains/media/__tests__/media.service.test.ts` |
| `STEP-03` | `app/api/admin/media/confirm/route.ts` + `confirm/route.test.ts` (NEW) | Derive alt từ `headResult.pathname.split('/').pop()` khi body.alt rỗng (RQ-08). Regression test confirm với `alt:''` không gửi alt. | `npx vitest run --config vitest.unit.config.ts app/api/admin/media/confirm/route.test.ts` |
| `STEP-04` | `app/api/admin/media/upload-url/route.ts` | Bỏ đọc `folder` FormData field; pathname = `media/<Date.now()>-<safeFilename>` (RQ-09). | local — không file test mới (logic đơn giản). |
| `STEP-05` | `app/api/admin/media/route.ts` | Bỏ parse `folder` từ searchParams (RQ-10). Service `listMedia` đã cập nhật ở STEP-02. | local — không file test mới. |
| `STEP-06` | `app/admin/media/page.tsx` | Bỏ đọc `searchParams.folder`; pass `folderFilter=''` xuống client (RQ-11). | local. |
| `STEP-07` | `app/admin/media/media-bulk-upload.tsx` (NEW) + `media-bulk-upload.test.tsx` (NEW) | Tạo Bulk Upload component: bounded concurrency ≤ 3, max batch ≤ 20, per-item status, progress, retry-failed-only, cleanup (RQ-15). Test cover 5 case: many-success, mixed-success-failure, batch-20-cap, retry-failed-only, no-double-submit, object-URL-cleanup. | `npx vitest run --config vitest.unit.config.ts app/admin/media/media-bulk-upload.test.tsx` |
| `STEP-08` | `app/admin/media/media-library-client.tsx` + `__tests__/media-library-no-folder-ui.test.tsx` (NEW) | Bỏ sidebar `aside` + `FOLDERS` constant + folder select trong Upload/EditModal + folder label trên MediaCard (RQ-12). Swap UploadModal → BulkUploadModal (import từ media-bulk-upload). Static fence test confirm không còn testid `media-library-folder-sidebar` / không còn `<select>` liên quan đến folder. | `npx vitest run --config vitest.unit.config.ts app/admin/media/__tests__/media-library-no-folder-ui.test.tsx` |
| `STEP-09` | `app/admin/jobs/job-postings/[id]/media-picker.tsx` + `__tests__/media-picker-no-folder.test.tsx` (NEW hoặc UPDATE) | Bỏ folder select + alt input + folder label trên card (RQ-13). Upload tab dùng BulkUploadPanel. Cập nhật `media-picker.test.tsx` xóa testid `media-picker-folder`. | `npx vitest run --config vitest.unit.config.ts app/admin/jobs/job-postings/[id]/__tests__/media-picker-no-folder.test.tsx` |
| `STEP-10` | `app/admin/jobs/job-postings/[id]/media-card.tsx` | Bỏ `defaultFolder="job-postings"` prop trên `<MediaPicker />` (RQ-14). | local — không file test mới. |
| `STEP-11` | `app/admin/settings/_components/hero-image-picker.tsx` + `hero-slides-editor.tsx` + `__tests__/hero-pickers-no-folder.test.tsx` (NEW) | Fetch `/api/admin/media` không folder; empty-state generic (RQ-16, RQ-17). Static fence test. | `npx vitest run --config vitest.unit.config.ts app/admin/settings/__tests__/hero-pickers-no-folder.test.tsx` |
| `STEP-12` | All | Self-review (prisma schema không sửa; grep `?folder=`, `defaultFolder` còn sót không); canonical gates: full unit, typecheck, lint, build, verify-encoding, git diff --check (RQ-18). | All gates listed in §0. |
| `STEP-13` | `docs/tasks/hrp-t1c-media-global-pool-bulk-upload-hotfix/HANDOFF.md` | Viết HANDOFF compact với Implementation SHA + CI URLs + Stop-before-merge. Commit + push + mở PR. | none. |

### 5.5 RQ → STEP → AC traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01 | AC-04 |
| RQ-02 | STEP-01 | AC-04 |
| RQ-03 | STEP-01 | AC-04 |
| RQ-04 | STEP-01 | AC-04 |
| RQ-05 | STEP-01 | AC-04 |
| RQ-06 | STEP-01 | AC-04 |
| RQ-07 | STEP-02 | AC-04 |
| RQ-08 | STEP-03 | AC-04 |
| RQ-09 | STEP-04 | AC-12 |
| RQ-10 | STEP-05 | AC-01 |
| RQ-11 | STEP-06 | AC-01 |
| RQ-12 | STEP-08 | AC-01 |
| RQ-13 | STEP-09 | AC-03 |
| RQ-14 | STEP-10 | AC-12 |
| RQ-15 | STEP-07 | AC-05 |
| RQ-16 | STEP-11 | AC-03 |
| RQ-17 | STEP-11 | AC-03 |
| RQ-18 | STEP-12 | AC-13 |

## 6. Acceptance

| ID | Criterion |
|---|---|
| `AC-01` | `/admin/media` không còn sidebar/select/filter "Thư mục". |
| `AC-02` | Media cũ ở mọi folder (`homepage`, `job-postings`, `news`, `banners`, `uncategorized`) hiển thị chung. |
| `AC-03` | JobPosting picker + Hero picker + Hero Slides picker đều gọi `/api/admin/media` không folder; thấy cùng kho PUBLIC. |
| `AC-04` | Upload 1 file không yêu cầu alt; tạo Media PUBLIC với alt tự sinh không rỗng. |
| `AC-05` | Chọn 3 file hợp lệ tạo đúng 3 Media records PUBLIC. |
| `AC-06` | Batch có file hợp lệ + file sai định dạng: file hợp lệ vẫn upload; file sai báo lỗi tiếng Việt riêng. |
| `AC-07` | Batch > 20 file: chặn bằng thông báo tiếng Việt "Mỗi lượt tải tối đa 20 ảnh."; không file nào upload. |
| `AC-08` | 1 file upload/confirm lỗi không ảnh hưởng items đã thành công. |
| `AC-09` | Retry file thất bại không upload lại file đã thành công. |
| `AC-10` | `CAN_MANAGE_MEDIA` permission giữ nguyên; MIME allowlist + 5 MB/file không đổi. |
| `AC-11` | Không Prisma schema/migration/data rewrite. |
| `AC-12` | Không còn in-app request nào truyền `folder` vào Media list API (4 entry point: Library, Picker, Hero, Slides). |
| `AC-13` | `git diff --check` clean; verify-encoding.mjs PASS; full unit + typecheck + lint + build PASS. |

## 7. Risk & self-review

| ID | Risk | Mitigation |
|---|---|---|
| `RK-01` | URL cũ `/admin/media?folder=homepage` bị shim sai, gây filter giả. | Route accept-and-ignore `folder`; service bỏ where.folder. URL cũ render kho chung đúng. |
| `RK-02` | Server authority fail nếu `deriveMediaAlt` không cover đủ edge case. | 8 unit test cases theo 6 quy tắc directive. Server + service đều derive (defense-in-depth). |
| `RK-03` | Bulk upload double-submit. | Disable "Tải lên" khi `busy=true`. Disable modal close khi `busy=true`. |
| `RK-04` | Object URL leak. | `useEffect` cleanup revoke khi unmount; `resetUpload` revoke tất cả `previewUrl`. |
| `RK-05` | `MEDIA_DEFAULT_FOLDERS` vẫn export → caller cũ có thể import vô tình. | Tier 1 grep toàn repo xác nhận không còn caller in-app ngoài upload modal. Nếu có, đánh dấu follow-up; constant export không vi phạm invariants. |
| `RK-06` | Service `listMedia` thay đổi `where.folder` filter có thể ảnh hưởng test cũ. | Test `media.service.test.ts:335-345` chỉ assert paginate + count (không assert folder filter). Cập nhật test để explicit "no folder filter" coverage. |
| `RK-07` | Response contract `/api/admin/media/confirm` đổi shape (giờ server derive alt trả về). | Response vẫn trả `MediaItemDto` đầy đủ với `alt` populated. Caller (MediaLibrary, MediaPicker) đọc cùng shape. Regression test `confirm/route.test.ts`. |
| `RK-08` | Picker caller khác (ngoài 3 entry point liệt kê) vẫn gửi `folder`. | Grep `?folder=` + `defaultFolder` toàn repo; chỉ 4 entry point in-scope. |

## 8. Open Questions

- None. Toàn bộ outcome/boundary đã Tier 0 chốt trong directive; 13 AC đầy đủ.

## 9. Planner Resolution

- `Decision state`: CLOSED. Tất cả DEC-* đã CHOSENNA.
- `Tier 0` đã phê outcome/boundary trong directive T1C → không cần hỏi lại.
- Tier 1 implement ngay sau khi `Contract gate: READY_TO_CODE` (v1.0).

## 10. Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 READY_TO_CODE | 2026-10-07 | Tier 1 | Initial contract (gate schema v2): 13 RQ, 13 DEC, 8 unit-test cases cho `deriveMediaAlt`, bulk upload queue (≤20, concurrency 3), invariants giữ nguyên. Baseline `04d91666b4ab024c5a4048dfbb947e3d3a97a82a`. |