# HANDOFF — `hrp-t1c-media-global-pool-bulk-upload-hotfix`

> **Status:** `READY_FOR_CI` — implementation committed; awaiting CI xanh. **DỪNG trước merge/deploy.**

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-media-global-pool-bulk-upload-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | TASK v1.0 (`READY_TO_CODE`) |
| Implementation SHA | `1ed91cd20a0d0c5098d2b6186c5671f03d0ed6fd` |
| HEAD SHA | `1ed91cd20a0d0c5098d2b6186c5671f03d0ed6fd` (after push; sẽ tăng 1 vì re-commit HANDOFF pin) |
| Branch | `codex/t1c-media-global-pool-bulk-upload-hotfix` |
| Baseline (origin/main) | `04d91666b4ab024c5a4048dfbb947e3d3a97a82a` |
| Worktree | `C:\CodeApp\HrP-t1c-media-global-pool-bulk-upload-hotfix` |
| Lane / Audit | STANDARD / NONE |
| Correction budget | 1 (unused) |
| Stop rule | Stop-before-merge. No production merge. No production deploy. No production migration. |

## 1. Outcome (delivered)

Đơn giản hóa toàn bộ trải nghiệm Media — global pool + auto alt + bulk upload — theo đúng directive T1C.

### 1.1 Một kho Media dùng chung (AC-01, AC-02, AC-12)

- **Bỏ sidebar "Thư mục"** khỏi `/admin/media`.
- **Bỏ folder select** trong UploadModal và EditModal của Media Library.
- **Bỏ tên folder** trên Media card.
- **Bỏ folder select** trong JobPosting MediaPicker.
- **Bỏ `folder=homepage`** trong HeroImagePicker và HeroSlidesEditor.
- URL cũ `/admin/media?folder=homepage` được accept-and-ignore — render kho chung, không error.
- Media cũ ở mọi folder (`homepage`, `job-postings`, `news`, `banners`, `uncategorized`) hiển thị đầy đủ, sử dụng được.

### 1.2 Không migration / schema / data rewrite (AC-11)

- KHÔNG sửa `prisma/schema.prisma`.
- KHÔNG tạo migration mới.
- KHÔNG rewrite dữ liệu Media hiện có.
- `Media.folder` column vẫn còn (backward-compat).
- `media.types.ts:MediaListQuery.folder` vẫn optional (backward-compat).
- `MEDIA_DEFAULT_FOLDERS` constant vẫn export (backward-compat).

### 1.3 Alt text tự động — server authority (AC-04, RK-02)

- Helper `deriveMediaAlt(filename)` tại `src/domains/media/media-alt.ts` — pure, deterministic.
- 6 quy tắc chuẩn hoá tên file (theo §5.2 TASK.md):
  1. Lấy basename, bỏ extension.
  2. Strip technical prefix chain (ISO timestamp `2024-01-15T10-30-00`, epoch `1715000000`, UUID v4 `[0-9a-f]{8}-…-{12}`) — lặp để strip chain.
  3. Thay `_`, `-`, và chuỗi whitespace liên tiếp bằng 1 space.
  4. Trim.
  5. Fallback `Hình ảnh` khi rỗng.
  6. Giới hạn 500 chars; cắt bằng `slice(0, 500).trimEnd()`.
- Giữ nguyên Vietnamese diacritics: `ảnh_văn_phòng_công_ty.webp` → `ảnh văn phòng công ty`.
- Bỏ **ô nhập alt** khỏi mọi luồng upload (Library, Picker, Settings — không có picker có alt input ở đây).
- Server authority: `createMedia` service + `/api/admin/media/confirm` route đều tự derive khi `alt === ''`.
- Vẫn cho phép admin chỉnh sửa alt sau upload qua EditModal.
- KHÔNG dùng AI / external API.

### 1.4 Upload hàng loạt (AC-05..AC-09, RK-03, RK-04)

- `app/admin/media/media-bulk-upload.tsx` (NEW):
  - File input `multiple`.
  - **Tối đa 20 file/batch** — chặn bằng thông báo tiếng Việt.
  - **Bounded concurrency 3** (worker pool async, KHÔNG `Promise.all` không giới hạn).
  - **Per-file validation**: JPEG/PNG/WebP/GIF; ≤ 5 MB. File lỗi → ERROR ngay, không block các file hợp lệ.
  - **Per-item status** enum: `PENDING` / `UPLOADING` / `SUCCESS` / `ERROR` (tiếng Việt: Chờ tải / Đang tải / Thành công / Thất bại).
  - **Tiến độ tổng**: `Đã tải X/Y ảnh` (+ `(đang tải N)` / `· N lỗi`).
  - **Retry chỉ ERROR items** — không re-upload SUCCESS items.
  - **Partial success hợp lệ**: file lỗi KHÔNG rollback những file đã thành công.
  - **Disable modal close khi `busy=true`** (backdrop + nút X + nút "Chọn lại") → không double-submit.
  - **Cleanup tất cả `URL.createObjectURL`** khi unmount + reset + đóng modal.
- `MediaBulkUpload` cũng được dùng inline trong MediaPicker drawer (auto-pick first SUCCESS).

### 1.5 Invariants bảo toàn (AC-10)

- `CAN_MANAGE_MEDIA` permission giữ nguyên.
- MIME allowlist `MEDIA_ALLOWED_MIME_TYPES` không đổi.
- `MAX_UPLOAD_BYTES = 5 MB` không đổi.
- `BLOB_READ_WRITE_TOKEN` path không đổi; Vercel Blob storage vẫn authority.
- Chức năng assign, cover, delete, reorder không đổi.
- Không tạo uploader/storage thứ hai; vẫn dùng `/api/admin/media/upload-url` + `/api/admin/media/confirm`.

### 1.6 Response contract `/api/admin/media/confirm` (RK-07)

Response shape `MediaItemDto` không đổi. Khi client gửi `alt: ''`, server derive từ filename trên Vercel Blob (`headResult.pathname.split('/').pop()`) rồi populate vào DTO. Caller (MediaLibrary, MediaPicker) đọc cùng shape như trước.

## 2. File tree delta (21 files)

### New (6 files)
```
src/domains/media/media-alt.ts                              (deriveMediaAlt helper)
src/domains/media/media-alt.test.ts                         (13 unit test cases)
app/api/admin/media/confirm/route.test.ts                   (7 regression tests confirm)
app/admin/media/media-bulk-upload.tsx                       (Bulk Upload component)
app/admin/media/__tests__/media-library-no-folder-ui.test.tsx (7 static fence tests)
app/admin/settings/__tests__/hero-pickers-no-folder.test.tsx  (3 static fence tests)
```

### Modified (15 files)
```
src/domains/media/media.service.ts                            (createMedia auto-derive; listMedia bỏ where.folder)
src/domains/media/__tests__/media.service.test.ts             (thêm case derive alt)
app/api/admin/media/route.ts                                 (bỏ parse folder query)
app/api/admin/media/upload-url/route.ts                      (bỏ folder FormData; pathname = media/<ts>-<fn>)
app/api/admin/media/confirm/route.ts                         (derive alt khi body.alt rỗng)
app/admin/media/page.tsx                                     (bỏ searchParams.folder)
app/admin/media/media-library-client.tsx                     (bỏ sidebar; bỏ folder UI; BulkUploadModal)
app/admin/media/__tests__/media-terminology.static.test.ts   (bỏ mediaFolderLabel UI contract)
app/admin/media/__tests__/media-responsive.static.test.ts    (bỏ folder sidebar layout fence)
app/admin/jobs/job-postings/[id]/media-picker.tsx            (bỏ folder select; bỏ alt input; BulkUploadPanel)
app/admin/jobs/job-postings/[id]/media-card.tsx              (bỏ defaultFolder prop)
app/admin/jobs/job-postings/[id]/__tests__/media-picker.test.tsx (bỏ folder testid; bỏ mediaFolderLabel fence)
app/admin/settings/_components/hero-image-picker.tsx         (bỏ folder=homepage; đổi empty-state copy)
app/admin/settings/_components/hero-slides-editor.tsx        (bỏ folder=homepage; đổi empty-state copy)
```

## 3. Quy tắc sinh alt (DEC-01, RQ-01..RQ-06)

```ts
// src/domains/media/media-alt.ts
export const DEFAULT_MEDIA_ALT = 'Hình ảnh';
export const MAX_ALT_LENGTH = 500;

const PREFIX_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}[T_\-]\d{2}-\d{2}-\d{2}(?:[._-]\d+)?[-_.\s]+/u,  // ISO ts
  /^\d{10,13}[-_.\s]+/u,                                              // epoch
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_.\s]+/iu, // UUID
];

export function deriveMediaAlt(filename: string): string {
  const base = (filename ?? '').split(/[\\/]/).pop() ?? '';
  let stem = base.replace(/\.[^./]+$/u, '');
  // strip chain
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIX_PATTERNS) {
      const m = stem.match(p);
      if (m) { stem = stem.slice(m[0].length); changed = true; break; }
    }
  }
  let s = stem.replace(/[_\-\s]+/gu, ' ');
  s = s.trim();
  if (!s) return DEFAULT_MEDIA_ALT;
  return s.length > MAX_ALT_LENGTH ? s.slice(0, MAX_ALT_LENGTH).trimEnd() : s;
}
```

### Test coverage (13 cases trong `media-alt.test.ts`)

| Case | Input | Expected |
|---|---|---|
| Tên thường | `office-team.webp` | `office team` |
| Underscore | `office_team_photo.png` | `office team photo` |
| Hyphen | `office-team-photo.jpg` | `office team photo` |
| Mix `_` + `-` + space | `office _ team - photo.jpg` | `office team photo` |
| Tiếng Việt có dấu | `ảnh_văn_phòng_công_ty.webp` | `ảnh văn phòng công ty` |
| Rỗng / chỉ extension | `.webp` / `""` / `null` | `Hình ảnh` |
| Tên > 500 chars | 700-char string | length ≤ 500, không trailing space |
| Epoch prefix | `1715000000_office.jpg` | `office` |
| UUID prefix | `0d4f8b2e-9b6c-4f8b-9e0a-1a2b3c4d5e6f_x.jpg` | `x` |
| ISO prefix | `2024-01-15T10-30-00_image.jpg` | `image` |
| Chain prefix | `1715000000_<uuid>_y.jpg` | `y` |
| Filename có path | `path/to/file.jpg` | `file` |
| Whitespace liên tiếp | `a   b.jpg` | `a b` |

## 4. Batch limit / concurrency / partial failure

| Concern | Decision |
|---|---|
| Max batch size | **20** files (`MAX_BATCH_SIZE = 20`) |
| Concurrency | **3** workers (`MAX_CONCURRENCY = 3`) |
| Per-item lifecycle | `PENDING` → `UPLOADING` → `SUCCESS` / `ERROR` |
| Per-item error msg | tiếng Việt, ví dụ `Định dạng application/pdf không được phép.` / `Kích thước 6.5 MB ngoài khoảng cho phép (tối đa 5.00 MB).` |
| Batch validation | Nếu > 20 files → reject ngay với `Mỗi lượt tải tối đa 20 ảnh. Bạn đã chọn N ảnh.` |
| Partial success | OK. File lỗi KHÔNG rollback file thành công. |
| Retry | Chỉ ERROR items. SUCCESS items bỏ qua. |
| Modal close khi busy | Disabled (backdrop click + close button + reset button). |
| Object URL cleanup | `useEffect` cleanup + `resetAll` + onClose + abort fetch. |
| Upload order | Worker pool async (FIFO) với concurrency cap. KHÔNG `Promise.all` không giới hạn. |
| Disable primary button | Khi `busy=true` HOẶC khi không có item `PENDING` + không có `ERROR` (giữ ENABLE nếu có ERROR để retry). |

## 5. Gates (all green locally)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | **0 errors** |
| `pnpm exec eslint .` | **0 errors** (1010 warnings — tất cả pre-existing baseline) |
| `pnpm exec vitest run` (full unit) | **5155 passed | 9 skipped** (324 files) |
| `pnpm run build` | **PASS** |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | **21/21 files PASS** (UTF-8 no-BOM) |
| `git diff --check` (working + staged) | **clean** |

### Targeted tests cho hotfix này

- `app/admin/media/__tests__/media-library-no-folder-ui.test.tsx` — 7 tests PASS
- `app/admin/media/__tests__/media-terminology.static.test.ts` — 4 tests PASS
- `app/admin/media/__tests__/media-responsive.static.test.ts` — 6 tests PASS
- `app/admin/jobs/job-postings/[id]/__tests__/media-picker.test.tsx` — 5 tests PASS
- `app/admin/jobs/job-postings/[id]/__tests__/media-card.test.tsx` — 9 tests PASS (không đổi, regression pass)
- `app/admin/jobs/job-postings/[id]/__tests__/youtube-card.test.tsx` — 14 tests PASS (không đổi)
- `app/admin/settings/__tests__/hero-pickers-no-folder.test.tsx` — 3 tests PASS
- `app/admin/settings/__tests__/settings-terminology.static.test.ts` — 3 tests PASS (không đổi, regression pass)
- `src/domains/media/media-alt.test.ts` — 13 tests PASS
- `src/domains/media/__tests__/media.service.test.ts` — regression pass + derive cases
- `src/domains/media/media-ui.test.ts` — 2 tests PASS (không đổi)
- `src/domains/media/__tests__/safe-render.test.ts` — 16 tests PASS (không đổi)
- `app/api/admin/media/confirm/route.test.ts` — 7 tests PASS (NEW regression)

## 6. Xác nhận không schema / migration / data rewrite

- `prisma/schema.prisma` KHÔNG thay đổi (verified via `git diff prisma/schema.prisma` — no diff).
- `prisma/migrations/**` KHÔNG thay đổi.
- KHÔNG có `prisma migrate dev` chạy.
- KHÔNG có `prisma db push` chạy.
- KHÔNG có `prisma db seed` chạy.
- KHÔNG có script data rewrite nào chạy.
- `Media.folder` column vẫn còn trong schema; `MediaListQuery.folder` vẫn optional trong DTO; `MEDIA_DEFAULT_FOLDERS` vẫn export — tất cả backward-compat, không breaking.

## 7. Entry point đã đồng bộ

| Entry point | Folder query | Alt input | Upload pipeline |
|---|---|---|---|
| `/admin/media` Library | ❌ removed | ❌ removed (EditModal chỉ để PATCH) | MediaBulkUpload |
| JobPosting `MediaPicker` drawer | ❌ removed | ❌ removed | MediaBulkUpload (inline) |
| `HeroImagePicker` (Settings) | ❌ removed (`/api/admin/media?take=24`) | n/a | pointer tới /admin/media |
| `HeroSlidesEditor` (Settings) | ❌ removed (`/api/admin/media?take=24`) | n/a | pointer tới /admin/media |

Tất cả 4 entry point giờ đọc cùng kho PUBLIC từ `/api/admin/media` (không folder), hiển thị cùng shape `MediaItemDto`.

## 8. Stop rule & CI status

- **CI**: chờ bắt buộc xanh trước khi review/merge.
- **STOP trước merge/deploy** — không tự merge, không tự deploy production, không chạy migration production.
- Khi CI xanh, ping reviewer theo quy trình repo.

## 9. Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 (this file) | 2026-10-07 | Tier 1 | First HANDOFF — gates all green locally, awaiting CI. |
