# TASK — `hrp-t1c-jobposting-media-youtube`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-jobposting-media-youtube` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` (Media Library + JobPosting editor shell + Tiptap render pipeline; không xây uploader/storage thứ hai, không build editor khác) |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Pre-P2 gate cô lập. Blast radius: 1 server module, 4 route con, 1 admin client card, 1 public DTO extension, 1 additive migration. Có test surface (service + route + UI + public + validation). Tier 1 self-review. |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` |
| Baseline | `4a9ade6aea4a7b14efc4bba1c80768c3156c783c` (origin/main @ PR #107) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` (unit) + `READY` (synthetic-DB optional; chạy khi Owner cấp) |
| Correction budget | `1` |
| In-scope roots | `prisma/schema.prisma`; `prisma/migrations/<ts>_jp_youtube_video_id/migration.sql`; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/staffing/job-posting-list.service.ts`; `src/domains/job-board/public.service.ts`; `src/domains/job-board/public-types.ts`; `src/domains/media/youtube.ts` (new); `src/domains/media/youtube.test.ts` (new); `src/domains/staffing/job-posting-media.service.ts` (new); `src/domains/staffing/job-posting-media.service.test.ts` (new); `app/api/admin/jobs/job-postings/[id]/route.ts`; `app/api/admin/jobs/job-postings/[id]/route.test.ts`; `app/api/admin/jobs/job-postings/[id]/media/route.ts` (new); `app/api/admin/jobs/job-postings/[id]/media/[assignmentId]/route.ts` (new); `app/(jobs)/viec-lam/[slug]/page.tsx`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx`; `app/admin/jobs/job-postings/[id]/_components/job-posting-media-card.tsx` (new); `app/admin/jobs/job-postings/page.tsx`; `docs/tasks/hrp-t1c-jobposting-media-youtube/**` |
| Forbidden paths | `prisma/migrations/**` (chỉ file additive mới), `src/domains/media/media.service.ts` (logic core giữ nguyên; chỉ expose helper nếu cần), `app/admin/media/media-library-client.tsx` (re-used as-is qua `/api/admin/media/*`), mọi `/api/admin/jobs/job-postings/[id]/route.ts` body ngoài phần `youtubeVideoId` + PATCH `requestBody` array, mọi thay đổi đụng `publicSelect` allowlist khỏi cấu kiện được khai trong TASK này, mọi `JobPosting` lifecycle/status, mọi RLS policy đụng `media_assignment`/`job_postings` |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npm run typecheck`; `npm run lint`; `npx vitest run --config vitest.unit.config.ts src/domains/media/youtube.test.ts src/domains/staffing/job-posting-media.service.test.ts src/domains/staffing/job-posting-list.service.test.ts src/domains/job-board/job-posting-stamps-mapping.test.ts src/domains/job-board/public-detail.service.test.ts`; `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/[id]/route.test.ts`; `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver` → resolve |

> Lane `STANDARD` + Audit `NONE`: Tier 1 tự review toàn bộ theo checklist trong §6. Nếu gặp mù mờ business, dependency-graph Review, hoặc cần đụng `prisma/migrations/**` ngoài file additive mới → DỪNG, không tự ý chuyển sang LIGHT.

## 1. Outcome

### 1.1 User-visible outcome

- Trong trang `/admin/jobs/job-postings/[id]` (editor shell):
  - Một card mới **"Thư viện ảnh"** cho phép người soạn (ADMIN/HR_MANAGER/HR_STAFF) upload ảnh mới hoặc chọn ảnh từ Media Library hiện hữu, gán vào JobPosting bằng `MediaAssignment(ownerType='JobPosting', ownerId=jobPostingId)`, đổi ảnh cover, sắp xếp lại thứ tự gallery, gỡ ảnh.
  - Một field input **"Video YouTube"** (URL tuỳ chọn). UI chỉ chấp nhận URL `youtube.com` / `youtu.be`; server chuẩn hoá về 11-char video ID, lưu vào `JobPosting.youtubeVideoId`. Clear bằng cách để rỗng.
  - Save (PATCH `/api/admin/jobs/job-postings/[id]`) ghi cả content + stamp flags + `youtubeVideoId` trong một transaction qua `withIdempotency`, optimistic-revision giữ nguyên.
  - Gallery state hiển thị cover ảnh đầu tiên của gallery đã gán theo thứ tự `MediaAssignment.order ASC`.
- Trang chi tiết công khai `/viec-lam/[slug]`:
  - **Bỏ** skeleton `INTEGRATION_PENDING` của GallerySection; render gallery THẬT từ `MediaAssignment` (cover + 3 ảnh tiếp theo theo `order ASC`, hoặc tất cả nếu ≤ 4). Mỗi ảnh có `alt` text + caption.
  - Nếu `youtubeVideoId` set: render một khối responsive embed `<iframe src="https://www.youtube-nocookie.com/embed/{videoId}">` ngay sau gallery, KHÔNG autoplay (`?rel=0` để hạn chế đề xuất ngoài kênh), KHÔNG iframe brand từ input HTML người dùng. Không media trong gallery → vẫn render embed nếu có YouTube.
  - Không redesign các section khác (chip, fact grid, position list, related jobs, sticky announcement, footer banner).
- Trang danh sách admin `/admin/jobs/job-postings` xoá dòng "Hiện chưa thể đính kèm ảnh vào tin tuyển dụng" trong `locked-section-list` và thay bằng đúng câu cập nhật "Có thể đính kèm ảnh qua Media Library + thêm video YouTube nhúng từ URL".

### 1.2 Non-goals

- KHÔNG build một storage / uploader thứ hai: media bytes vẫn chỉ qua `/api/admin/media/upload-url` + `/api/admin/media/confirm`. JobPosting editor chỉ reuse những endpoint này qua modal/picker.
- KHÔNG build rich-text inline media (kéo-thả ảnh vào Tiptap) — đó là P2, không thuộc pre-P2.
- KHÔNG đụng RLS posture: `job_postings` RLS vẫn do `hrp_project_visible_for` quyết định; mọi attach/detach/reorder đều authorize qua JobPosting read (`getJobPostingForAuthoring` hoặc `assertHrStaffRecruiterScope` cho HR_STAFF).
- KHÔNG thêm route `/api/public/media?ownerType=JobPosting&ownerId=...` mới — endpoint đã có từ AV4 và đã ở posture public, được PROJECT tham chiếu trong test stable.
- KHÔNG thay đổi JobPosting lifecycle (DRAFT/PUBLISHED/ARCHIVED), stamp flags, slug rules, optimistic revision flow.
- KHÔNG chấp nhận iframe/HTML đầu vào cho YouTube: chỉ 1 URL string, server extract ID.
- KHÔNG làm việc với Vimeo / TikTok / direct video file — chỉ YouTube.
- KHÔNG thêm nhãn "INTEGRATION_PENDING" mới ở public detail.
- KHÔNG redesign card list / job card stamp UI ngoài phạm vi.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/schema.prisma:1758-1813` | `Media` + `MediaAssignment` đã có sẵn từ AV4, ownerType allowlist đã chứa `'JobPosting'` từ migration 0 — integration chỉ là wire-up, không phải build mới. |
| `EV-02` | `src/domains/media/media.types.ts:25-32` | `MEDIA_ASSIGNMENT_OWNER_TYPES = ['JobPosting', 'HomepageSection', 'Article', 'Partner']` — `JobPosting` đã có trong allowlist; không cần sửa. |
| `EV-03` | `app/api/admin/media/assign/route.ts:1-90` | Endpoint assign generic đã có, gate theo `CAN_MANAGE_MEDIA`. Tuy nhiên route generic này KHÔNG enforce "ownerId thuộc JobPosting user có quyền đọc". Đó là lý do task này bọc lại trong route riêng cho JobPosting. |
| `EV-04` | `src/domains/staffing/job-posting-list.service.ts:199-300` + `job-posting-authoring.service.ts:1379-1405` | `JobPostingDetailDto` + `getJobPostingForAuthoring` đã là single source of truth cho editor. Mọi media write phải đi qua read trước để RLS check. |
| `EV-05` | `app/(jobs)/viec-lam/[slug]/page.tsx:269-279` | `buildGallerySection()` trả `INTEGRATION_PENDING` + `media: []` — chính là chỗ theo yêu cầu cần bỏ. |
| `EV-06` | `src/domains/job-board/components/detail/gallery-section.tsx:1-90` | `GallerySection` đã hỗ trợ `data-source="REAL"` + `media: MediaItem[]` — chỉ cần truyền đúng shape từ service. |
| `EV-07` | `prisma/schema.prisma:559-593` | `JobPosting` model — nơi thêm `youtubeVideoId String?` bằng additive migration. |
| `EV-08` | `src/domains/job-board/public.service.ts:723-790` | `publicSelect` allowlist đóng — thêm `youtubeVideoId: true` cố ý và khai báo với `public-select.static.test.ts` allowlist. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Add `youtubeVideoId String?` vào `JobPosting` qua file additive migration. KHÔNG RLS change, KHÔNG backfill, KHÔNG đổi các cột khác. | `CHOSEN` |
| `DEC-02` | URL validator server-side: chấp nhận host ∈ {`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`}; path ∈ {`/watch`, `/embed/`, `/shorts/`} hoặc host `youtu.be` (path = `/<id>`); trích `videoId` khớp `^[A-Za-z0-9_-]{11}$`. Mọi URL khác hoặc videoId không đúng shape → `INVALID_INPUT` 400. Lưu raw videoId (11-char), không lưu URL gốc. | `CHOSEN` |
| `DEC-03` | Public embed dùng `https://www.youtube-nocookie.com/embed/{videoId}` với `?rel=0`, không autoplay. `loading="lazy"` để giữ consistent với gallery `<img>`. Không nhận input HTML/iframe. | `CHOSEN` |
| `DEC-04` | PATCH body cho JobPosting mở rộng thêm `youtubeVideoId?: string \| null`: `undefined` = bỏ qua (giữ nguyên DB); `null` hoặc chuỗi rỗng sau trim = clear; string khác = qua validator DEC-02, lưu videoId. Không thay đổi `requestBody` key-order ngoài việc append 1 slot. | `CHOSEN` |
| `DEC-05` | Media attach/detach/reorder/cover qua 4 route con mới thuộc `/api/admin/jobs/job-postings/[id]/media/*`, mỗi route: (1) `ALLOWED_MUTATION_ROLES` 403 cho role ngoài ADMIN/HR_MANAGER/HR_STAFF; (2) JobPosting read trước qua `getJobPostingForAuthoring` để RLS enforce (HR_STAFF có thể trả `null` cho assignment không thuộc recruiter scope → 404 NOT_FOUND, không existence oracle). KHÔNG dùng lại `/api/admin/media/assign` cho JobPosting — vì route generic thiếu ownership JobPosting check, dùng lại sẽ mở kẽ hổng "ADMIN có CAN_MANAGE_MEDIA nhưng không có quyền với JobPosting X vẫn attach được media vào JobPosting X". | `CHOSEN` |
| `DEC-06` | Cover selection: tại route `POST .../media/[assignmentId]/cover`, set `assignment.cover = true` cho assignment đó + clear `cover = false` cho mọi assignment khác của cùng owner trong 1 lần `$transaction`. Khi một JobPosting có nhiều assignment cover (vì nhánh trước disabled vì race), clear hết về 0 cover rồi set đúng 1. | `CHOSEN` |
| `DEC-07` | Reorder: route `POST .../media/reorder` với body `{ orderedAssignmentIds: string[] }`. Server đọc tất cả `MediaAssignment` của JobPosting, đảm bảo `orderedAssignmentIds` chứa ĐÚNG tập id của JobPosting (không thiếu, không thừa) → set `order` theo index. Nếu mismatch → `INVALID_INPUT` 400. KHÔNG thêm/sửa assignment mới trong reorder. | `CHOSEN` |
| `DEC-08` | Public JobPosting detail DTO extension: thêm 2 field `gallery: PublicJobGalleryDto` và `youtubeVideoId: string \| null`. `gallery` mang `{ source: 'REAL' \| 'EMPTY', items: PublicJobGalleryItemDto[] }` — `EMPTY` khi 0 media (cố ý khác `'INTEGRATION_PENDING'` để caller React không render skeleton nữa, hoặc renderer trả `null`). Mapper ở `toDetailDto` đọc qua `tx.mediaAssignment.findMany` thêm một lần ngoài transaction `getPublicJobDetail` để giữ hiện năng + tránh N+1; tách riêng transaction như `relatedJobs` ở `loadJobAndRelated`. | `CHOSEN` |
| `DEC-09` | Editor shell dùng Media Library picker modal: mở `/api/admin/media?status=PUBLIC&take=24` (đã có sẵn route), chọn hoặc upload mới. Khi user click "Gán" → POST `POST /api/admin/jobs/job-postings/[id]/media/assign` với `mediaId`. Sau khi assign thành công, refresh local state bằng cách re-fetch `GET /api/admin/jobs/job-postings/[id]/media`. Không modal upload song song — dùng single modal hai tab: "Upload mới" + "Chọn từ thư viện". | `CHOSEN` |
| `DEC-10` | List page `/admin/jobs/job-postings`: xoá dòng `Hiện chưa thể đính kèm ảnh vào tin tuyển dụng.` trong `locked-section-list`. Không thêm dòng mới về "đã xong" — để section rỗng hoặc ẩn khi không còn đầu mối locked. Decision giữ repo compliance với UI-trust ban: mỗi dòng trong locked list phải là một capability thật sự còn hạn chế. | `CHOSEN` |
| `DEC-11` | Authorization gắn với JobPosting hiện hữu, không tách permission mới. Editor roles = `ALLOWED_MUTATION_ROLES` (`ADMIN`/`HR_MANAGER`/`HR_STAFF`) đã có sẵn cho `PATCH /api/admin/jobs/job-postings/[id]`. Media routes mới dùng CÙNG tập role; KHÔNG mở rộng role. KHÔNG thêm permission code mới. | `CHOSEN` |
| `DEC-12` | MIME / size limit: tái sử dụng `MEDIA_ALLOWED_MIME_TYPES` + `MAX_UPLOAD_BYTES` đã có ở `src/domains/media/media.types.ts`. JobPosting editor không validate riêng — chỉ gọi `/api/admin/media/upload-url` đã validate. | `CHOSEN` |
| `DEC-13` | Test surface (7 file): `youtube.test.ts` (URL parsing edge cases), `job-posting-media.service.test.ts` (assign/detach/reorder/cover transactions), `route.test.ts` cho JobPosting PATCH (cộng thêm `youtubeVideoId` cases), `job-posting-list.service.test.ts` cập nhật cho gallery DTO, `public-detail.service.test.ts` cho `youtubeVideoId` propagation, `job-posting-stamps-mapping.test.ts` (đảm bảo không regress stamp flags), integration test mới cho `withDbContext` + media assignment qua JobPosting. UI test cho editor shell cover input + reorder/cover state transitions. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Media upload + library | `app/api/admin/media/upload-url` + `/api/admin/media/confirm` + `/api/admin/media` (AV4, AC) | `ADOPT` | Internal HRP | Adopt via `/api/admin/media/*` (giữ nguyên) | JobPosting editor gọi qua fetch; KHÔNG copy logic upload vào editor. | Yêu cầu "không xây uploader/storage thứ hai". |
| Media attach/detach/reorder/cover | `src/domains/media/media.service.ts` + `/api/admin/media/assign` (generic) | `ADOPT partial` | Internal HRP | Adopt `assignMedia`/`unassignMedia`/`listAssignmentsForMedia` làm building block; BỌC thêm ownership JobPosting check ở route riêng. | Wrapper ở `src/domains/staffing/job-posting-media.service.ts` mới — ownership check + JobPosting-scoped query. | Route generic thiếu ownership JobPosting; `DEC-05`. |
| YouTube URL parsing | None internal | `BUILD` | Internal HRP | New file `src/domains/media/youtube.ts` — pure function `extractYouTubeVideoId(input: string): string \| null` | Editor + service + test only. | Capability chưa có. |
| Gallery renderer | `src/domains/job-board/components/detail/gallery-section.tsx` (`data-source="REAL"` branch sẵn) | `ADOPT` | Internal HRP | Adopt as-is | Page chỉ feed `media: MediaItem[]` thật. | Yêu cầu "bỏ `INTEGRATION_PENDING`". |
| Editor shell | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (T1B) | `ADOPT partial` | Internal HRP | Mở rộng: thêm media card + YouTube input field; giữ nguyên dirty-tracking pattern. | Card mới là child component; YouTube input dùng cùng pattern với `salaryDisplay`. | Tận dụng idempotency + optimistic revision đã có. |
| Public detail page | `app/(jobs)/viec-lam/[slug]/page.tsx` (P1-A1) | `ADOPT partial` | Internal HRP | Mở rộng: gallery section dùng data thật; thêm YouTube embed block. KHÔNG đổi `select`, KHÔNG đổi DTO public ngoài 2 field mới. | Mapper ở `public.service.ts` thêm nhánh gallery. | Repo rule "không redesign job-card/list ngoài phạm vi" + `DEC-08`. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Reason |
|---|---|---|---|---|---|
| Reorder/cover transactional updates | Prisma `$transaction` trong service wrapper | `N/A` | Khác n/a | Service layer | Embedded trong service. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `JobPosting` có thêm cột `youtubeVideoId String?` (additive migration). Schema.prisma phản ánh tương ứng; `prisma generate` chạy xanh. |
| `RQ-02` | PATCH `/api/admin/jobs/job-postings/[id]` chấp nhận `youtubeVideoId?: string \| null`. Server service `updateDraftContent` validate URL qua helper `extractYouTubeVideoId`; lưu raw videoId (11-char `[A-Za-z0-9_-]{11}`); `null`/`""` clear; `undefined` không đổi. |
| `RQ-03` | Helper `extractYouTubeVideoId(input: string): string \| null` cover đủ 7 dạng URL của YouTube family (xem DEC-02). Trả `null` cho input không hợp lệ. Pure function, không Prisma, không DB. |
| `RQ-04` | Public detail page embed YouTube qua `<iframe src="https://www.youtube-nocookie.com/embed/{videoId}?rel=0" loading="lazy" allow="..." referrerpolicy="strict-origin-when-cross-origin" title="Video YouTube">`. KHÔNG dùng `youtube.com/embed`, KHÔNG autoplay, KHÔNG `allowfullscreen` thuộc tính deprecated, dùng `allowFullScreen`. Sandbox `allow-scripts allow-same-origin allow-presentation` (không `allow-top-navigation`). |
| `RQ-05` | Route `GET /api/admin/jobs/job-postings/[id]/media` — trả `{ items: JobPostingMediaAssignmentDto[] }` cho JobPosting hiện hữu (theo RLS). DTO mang `{ assignmentId, mediaId, alt, url, caption, mimeType, order, cover }`. Item sort `[cover DESC, order ASC, createdAt ASC]`. |
| `RQ-06` | Route `POST /api/admin/jobs/job-postings/[id]/media/assign` — body `{ mediaId, order?, cover? }`. Authorize qua JobPosting read (RLS + HR_STAFF scope). Sau assign: trả `JobPostingMediaAssignmentDto` cho assignment mới. Khi `cover=true`: đồng thời clear cover của các assignment khác cùng JobPosting (trong 1 transaction). Conflict (đã có assignment cùng media) → 409 `MEDIA_ASSIGNMENT_CONFLICT`. |
| `RQ-07` | Route `DELETE /api/admin/jobs/job-postings/[id]/media/[assignmentId]` — detach. Trước khi xoá, đọc `ownerType='JobPosting'` + `ownerId=jobPostingId` từ row; nếu mismatch → 404 NOT_FOUND (no existence oracle). |
| `RQ-08` | Route `POST /api/admin/jobs/job-postings/[id]/media/reorder` — body `{ orderedAssignmentIds: string[] }`. Server đọc current assignment set của JobPosting, đối chiếu với `orderedAssignmentIds`. Mismatch về tập id (thiếu hoặc thừa) → 400 `INVALID_INPUT`. Set `order = index` cho mỗi assignment trong transaction. |
| `RQ-09` | Route `POST /api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover` — set cover. Clear tất cả cover khác của cùng JobPosting + set `cover=true` cho assignment này. Nếu assignment thuộc JobPosting khác → 404. |
| `RQ-10` | Mọi route `media/*` của JobPosting: 401 nếu thiếu session; 403 nếu role ngoài `ALLOWED_MUTATION_ROLES`; 404 nếu JobPosting không đọc được (RLS fail-closed). KHÔNG existence oracle cho assignment/JobPosting không thuộc scope (giống pattern hiện hữu ở `getJobPostingForAuthoring`). |
| `RQ-11` | Public detail DTO `PublicJobDetailDto` thêm 2 field: `gallery: PublicJobGalleryDto` và `youtubeVideoId: string \| null`. `gallery` mang `{ source: 'REAL' \| 'EMPTY', items: PublicJobGalleryItemDto[] }`. Không thêm field nào khác. `publicSelect` allowlist thêm `youtubeVideoId: true` và một nhánh `assignments` mới (chỉ select `media.publicUrl`/`media.alt`/`media.caption`/`media.status`, không kéo bảng bị RLS che). |
| `RQ-12` | Gallery public render: cover ảnh + tối đa 3 ảnh còn lại theo `order ASC`. Tất cả `<img>` giữ `loading="lazy"` + `alt`. Nếu `gallery.items.length === 0` → section `null` (không render skeleton nữa). |
| `RQ-13` | List page admin `/admin/jobs/job-postings`: dòng "Hiện chưa thể đính kèm ảnh vào tin tuyển dụng" bị xoá khỏi `locked-section-list`. |
| `RQ-14` | Editor shell có card mới `JobPostingMediaCard` chứa: (1) list ảnh đã gán với thumbnail + alt + nút "Đặt làm cover" / "Bỏ cover" / "Gỡ"; (2) nút "Thêm ảnh" mở modal 2-tab (Upload mới / Chọn từ thư viện); (3) field input "Video YouTube (tuỳ chọn)" với placeholder + nút "Lưu video" trigger PATCH. Drag-drop reorder qua `<button>` "↑/↓" (không dùng HTML5 DnD để giữ accessibility cho keyboard/screen reader). |
| `RQ-15` | YouTube input: chuỗi rỗng → không đổi DB (giữ nguyên `undefined` semantic) hoặc clear nếu user click "Xoá video" explicit. URL không hợp lệ → hiển thị safe error UI (repo-owned mapper `summarizeJobPostingApiError` đã có); KHÔNG echo raw validator message. |
| `RQ-16` | `updateDraftContent` truyền `youtubeVideoId` qua service input; trong repo có `assertYouTubeVideoId` private (cùng pattern với `assertBoolean`). Validator reject non-string/non-null/non-undefined; `null` và `""` được fold thành `null`; string qua `extractYouTubeVideoId` (nếu trả `null` → reject 400); nếu helper trả 11-char ID thì lưu ID đó. |
| `RQ-17` | `publicSelect` `assignments` nhánh không select `media.ownerId`/`media.createdById` (giữ thuộc tính chỉ admin); không select `media.tags`/`media.folder` (không public surface). Filter `media.status = 'PUBLIC'`. |
| `RQ-18` | Integration test (synthetic-DB optional): 1 test cho happy path assign → reorder → cover → detach; 1 test cho race condition (2 request cover đồng thời → đúng 1 thắng); 1 test cho authorization fail-closed (HR_STAFF chưa có recruiter assignment). |

### 4.2 Scope boundaries

- **In:**
  - Add `youtubeVideoId String?` additive migration; không đổi schema khác.
  - Helper `extractYouTubeVideoId` + test.
  - Service wrapper `job-posting-media.service.ts` (assign/detach/reorder/cover) + test.
  - Routes mới: 1 GET, 1 POST assign, 1 DELETE detach, 1 POST reorder, 1 POST cover.
  - PATCH route mở rộng body + service mở rộng input/output.
  - Editor shell mở rộng: media card + YouTube input.
  - Public detail page: gallery REAL + YouTube embed block.
  - List page: dọn `locked-section-list`.
  - Public service select / mapper: thêm `youtubeVideoId` + `gallery`.
  - Tests: 7 file (xem DEC-13).
- **Out:**
  - Inline rich-text media trong Tiptap (P2).
  - Storage adapter khác / uploader mới.
  - RLS change cho `media_assignment` hoặc `job_postings`.
  - Quyết định ownerType ngoài JobPosting (HomepageSection/Article/Partner giữ nguyên).
  - Designer rework job-card, sticky announcement, footer banner, related jobs UI.
  - Vimeo/TikTok/direct video.
  - Stamp flag / slug / optimistic-revision flow.
  - Tự động moderation ảnh (không có infra).
  - `dynamic` strategy của public detail (`dynamic = 'force-dynamic'` giữ nguyên — gallery + YouTube embed render luôn trong request).

## 5. Plan & Design

### 5.1 Schema diff

```prisma
model JobPosting {
  // ... existing fields unchanged ...
  /// hrp-t1c-jobposting-media-youtube (RQ-01, DEC-01): raw 11-char YouTube video ID
  /// extracted server-side from a youtube.com/youtu.be URL. Null = no video.
  youtubeVideoId String? @map("youtube_video_id")
  // ...
  @@map("job_postings")
}
```

Migration file `prisma/migrations/<ts>_jp_youtube_video_id/migration.sql`:

```sql
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
```

### 5.2 YouTube helper signature

```ts
// src/domains/media/youtube.ts
export const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeInput =
  | { kind: 'url'; raw: string }
  | { kind: 'id'; id: string };

/** Parse a YouTube URL or raw ID. Returns the 11-char ID or null. Pure function. */
export function extractYouTubeVideoId(input: string): string | null;
```

Covered URL forms (exhaustive list, no others accepted):

| Form | Example | Extracted |
|---|---|---|
| `https://www.youtube.com/watch?v=ID` | `…v=dQw4w9WgXcQ` | `dQw4w9WgXcQ` |
| `https://youtube.com/watch?v=ID` | (subdomain variant) | same |
| `https://m.youtube.com/watch?v=ID` | (mobile) | same |
| `https://www.youtube.com/watch?v=ID&list=…&t=…` | with extra params | `dQw4w9WgXcQ` |
| `https://www.youtube.com/embed/ID` | `…/embed/dQw4w9WgXcQ` | `dQw4w9WgXcQ` |
| `https://www.youtube.com/shorts/ID` | `…/shorts/dQw4w9WgXcQ` | `dQw4w9WgXcQ` |
| `https://youtu.be/ID` | `https://youtu.be/dQw4w9WgXcQ` | `dQw4w9WgXcQ` |
| `https://youtu.be/ID?t=42s` | with timestamp param | `dQw4w9WgXcQ` |

Reject: any other host, any non-`youtube.com`/`youtu.be` domain, any path that doesn't yield an 11-char ID, any ID not matching `[A-Za-z0-9_-]{11}`.

### 5.3 Public embed URL surface (server-side constant)

```ts
// src/domains/media/youtube.ts
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
export function youtubeEmbedUrl(videoId: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}?rel=0`;
}
```

### 5.4 Service wrapper API

```ts
// src/domains/staffing/job-posting-media.service.ts

export interface JobPostingMediaAssignmentDto {
  assignmentId: string;
  mediaId: string;
  url: string;
  alt: string;
  caption: string | null;
  mimeType: string;
  order: number;
  cover: boolean;
  createdAt: string;
}

export async function listJobPostingMedia(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  jobPostingId: string,
): Promise<JobPostingMediaAssignmentDto[]>;

export async function assignMediaToJobPosting(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  jobPostingId: string,
  input: { mediaId: string; order?: number; cover?: boolean },
): Promise<JobPostingMediaAssignmentDto>;

export async function detachMediaFromJobPosting(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  jobPostingId: string,
  assignmentId: string,
): Promise<{ id: string }>;

export async function setCoverMediaForJobPosting(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  jobPostingId: string,
  assignmentId: string,
): Promise<JobPostingMediaAssignmentDto>;

export async function reorderMediaForJobPosting(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  jobPostingId: string,
  orderedAssignmentIds: string[],
): Promise<JobPostingMediaAssignmentDto[]>;
```

Authorization: mỗi hàm mở transaction `prisma.$transaction`, trong transaction:
1. Đọc JobPosting qua `getJobPostingForAuthoring(tx, ctx, jobPostingId)` — RLS + HR_STAFF guard.
2. Nếu null → throw `JobPostingMediaError('NOT_FOUND', 404)`.
3. Tiếp tục logic.

### 5.5 Public DTO extension

```ts
// src/domains/job-board/public-types.ts
export interface PublicJobGalleryItemDto {
  id: string;            // = MediaAssignment.mediaId
  url: string;
  alt: string;
  caption: string | null;
  cover: boolean;
  order: number;
}

export interface PublicJobGalleryDto {
  source: 'REAL' | 'EMPTY';
  items: PublicJobGalleryItemDto[];
}

// src/domains/job-board/public.service.ts
export interface PublicJobDetailDto extends PublicJobDto {
  // ... existing fields ...
  gallery: PublicJobGalleryDto;       // NEW
  youtubeVideoId: string | null;      // NEW
}
```

`publicSelect` allowlist extension:

```ts
youtubeVideoId: true,
assignments: {
  where: { media: { status: 'PUBLIC' } },
  orderBy: [{ cover: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  select: {
    mediaId: true,
    order: true,
    cover: true,
    media: { select: { publicUrl: true, url: true, alt: true, caption: true, status: true } },
  },
},
```

Cập nhật `public-select.static.test.ts` allowlist nếu detector enforce scalar-only — kiểm tra tại implementation: nếu allowlist đang reject nested `assignments`, bổ sung `assignments` vào allowlist có chủ ý.

### 5.6 API route surface

| Method | Path | Purpose | Body |
|---|---|---|---|
| GET | `/api/admin/jobs/job-postings/[id]/media` | List assignments | — |
| POST | `/api/admin/jobs/job-postings/[id]/media/assign` | Attach | `{ mediaId, order?, cover? }` |
| DELETE | `/api/admin/jobs/job-postings/[id]/media/[assignmentId]` | Detach | — |
| POST | `/api/admin/jobs/job-postings/[id]/media/reorder` | Reorder | `{ orderedAssignmentIds: string[] }` |
| POST | `/api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover` | Set cover | — |

Tất cả: `Idempotency-Key` cho POST (theo convention `withIdempotency` của route hiện hữu); không yêu cầu cho GET/DELETE. Roles: `ALLOWED_MUTATION_ROLES`. RLS: enforce qua `getJobPostingForAuthoring`.

### 5.7 Editor shell change

- Thêm card `<JobPostingMediaCard jobPostingId={initial.id} initialAssignments={...} canMutate={canMutate} />` giữa Stamp toggles section và rich-text fields.
- Thêm field input "Video YouTube" cùng pattern với `salaryDisplay`: state local `youtubeVideoUrlInput: string` (giữ string user input — không parse ở client để tránh echo), state `savedYoutubeVideoId: string \| null` (từ server PATCH response). Save gửi `youtubeVideoId` qua PATCH body với rule: nếu input.trim() === "" → clear (`null`); nếu input.trim() !== "" → gửi raw string qua server validator. `summarizeJobPostingApiError` mapper đã cover safe error rendering.

### 5.8 Public detail page change

- `loadJobAndRelated` thêm 1 transaction riêng đọc gallery cho JobPosting. Mapper `toDetailDto` mở rộng map `assignments` từ `posting` thành `gallery: PublicJobGalleryDto`.
- New component `<JobPostingYoutubeEmbed videoId={job.youtubeVideoId} />` (server component) render `<iframe>` với attributes ở RQ-04, hoặc `null` nếu `videoId === null`.

### 5.9 List page cleanup

- `app/admin/jobs/job-postings/page.tsx` `<ul>` trong `locked-section-list` xoá `<li>Hiện chưa thể đính kèm ảnh vào tin tuyển dụng.</li>`. Nếu `<ul>` rỗng → ẩn cả section.

## 6. Implementation order

1. **Schema + migration + Prisma generate.** Verify `npx prisma validate` + `npx prisma generate`.
2. **YouTube helper** + `youtube.test.ts`. Pure unit test, không DB.
3. **JobPosting PATCH extension**: thêm `youtubeVideoId` vào `UpdateDraftContentInput`, `JobPostingDto`, `JobPostingModelRow`, `toJobPostingDto`, `getJobPostingForAdmin`, `getJobPostingForAuthoring`, `toJobPostingListItemDto`. Cập nhật route handler `PATCH` (body keys + idempotency hash slot). Cập nhật test `route.test.ts`.
4. **Service wrapper** `job-posting-media.service.ts` + test.
5. **Routes mới** 5 endpoint. Mỗi route test đảm bảo 401/403/404 path.
6. **Public service select / mapper** mở rộng. Cập nhật `publicSelect` allowlist. Cập nhật `public-select.static.test.ts` allowlist nếu cần.
7. **Public detail page**: loadJobAndRelated thêm 1 transaction cho gallery; `GallerySection` nhận `gallery` từ DTO; thêm `<JobPostingYoutubeEmbed>` component.
8. **Editor shell**: media card component + YouTube input field. Save flow ghest PATCH idempotent.
10. **List page**: dọn `locked-section-list`.
11. **Tests integration** + static tests + encoding.
12. **Gates** + commit + PR.

## 7. Risks

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | `publicSelect` đóng + thêm nested `assignments` có thể trigger RLS che. | Chỉ select `media.publicUrl`/`url`/`alt`/`caption`/`status` (PRINCIPAL công khai `MKT` đã đọc được `media` qua RLS đang có). Không select cột ngoài. Static test `public-select.static.test.ts` sẽ chặn nếu detector có allowlist; update allowlist có ý thức. |
| `RISK-02` | HR_STAFF không có recruiter scope trên JobPosting X có thể attach media vào X. | Mọi route media wrap `getJobPostingForAuthoring` đã enforce `assertHrStaffRecruiterScope` — null → 404, không existence oracle. |
| `RISK-03` | Race trên `cover`: 2 request POST cover cho 2 assignment khác nhau của cùng JobPosting. | `setCoverMediaForJobPosting` chạy trong `$transaction`; `updateMany({ where: { ownerType:'JobPosting', ownerId }, data: { cover:false } })` rồi `update({ where: { id:assignmentId }, data: { cover:true } })`. Sequence đảm bảo 1 row thắng; row còn lại cover bị clear. |
| `RISK-04` | YouTube URL với scheme giả mạo hoặc ID không phải 11-char. | Helper `extractYouTubeVideoId` validate `[A-Za-z0-9_-]{11}`; mọi nhánh khác trả `null` → server reject 400. |
| `RISK-05` | PATCH `requestBody` array mở rộng làm idempotency hash regress cho client hiện tại. | Append slot mới cuối array (key-order-stable); mọi client mới phải gửi slot; client cũ không gửi → vẫn cùng hash nếu `undefined`. Cập nhật integration note trong HANDOFF. |
| `RISK-06` | Migration additive có thể conflict với PR #108 đang mở. | Pre-flight: nếu PR #108 merge trước freeze → forward-merge `origin/main` qua `git merge --no-ff` (KHÔNG rebase). Kiểm tra SHA mới trước khi commit. |
| `RISK-07` | Integration test DB chưa sẵn sàng. | Test synthetic-DB optional; unit test cover toàn bộ logic; nếu Owner không cấp DB → defer integration test, ghi risk acceptance. |

## 8. Ready test

Đã đóng:

- ✅ Owner decision state CLOSED (Tier 0 directive đã rõ, không còn business rule mơ hồ).
- ✅ Baseline pinned: `4a9ade6aea4a7b14efc4bba1c80768c3156c783c` (origin/main @ PR #107).
- ✅ Test environment: unit `READY`; integration synthetic-DB optional `READY` khi Owner cấp.
- ✅ Required gates đã liệt kê, mỗi gate map tới command thực sự tồn tại trong repo.
- ✅ Consolidated self-review checklist trong §9.
- ✅ Authorization story rõ: editor roles đã đóng, không cần permission mới; ownership JobPosting check qua `getJobPostingForAuthoring`.
- ✅ One correction budget.

`Contract gate: READY_TO_CODE` ✅

## 9. Self-review checklist (Tier 1 trước khi freeze)

- [ ] Mỗi RQ map tới ≥ 1 STEP trong §6 và ≥ 1 AC trong §4.1.
- [ ] Mọi edge case của YouTube URL đã cover ở DEC-02.
- [ ] Service wrapper 5 hàm (list, assign, detach, cover, reorder) đều authorize qua JobPosting.
- [ ] Race trên cover được handle trong transaction.
- [ ] PATCH route + service + DTO đồng bộ: `youtubeVideoId` không bị mất qua `getJobPostingForAuthoring` hoặc `getJobPostingForAdmin`.
- [ ] `publicSelect` không kéo cột ngoài nhánh `media` được RLS cho phép cho principal `MKT`.
- [ ] Gallery render với `alt` non-empty (AV4 đã validate `alt` bắt buộc cho status=PUBLIC — re-check).
- [ ] YouTube iframe không autoplay, `youtube-nocookie.com`, không kéo top-navigation.
- [ ] Editor shell: dirty tracking cộng `youtubeVideoUrlInput` (nếu truyền string khác trim của saved value). Save chỉ gửi `youtubeVideoId` qua PATCH khi field bị dirty.
- [ ] List page `locked-section-list` không còn capability đã thực hiện.
- [ ] Mọi test file chạy xanh; mọi gate command PASS.
- [ ] `git diff --check` exit 0; UTF-8 no BOM verified.
- [ ] Không commit `.env.local*`, `*.log`, `t0_*`, `t1_*` evidence files.
- [ ] Commit message có `hrp-t1c-jobposting-media-youtube` task slug ở đầu.
- [ ] PR body pin: baseline SHA, scope summary, gates passed, CI run link.