# TASK — `hrp-t1c-t2-public-site-hero-slides-ctv-layout`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-t2-public-site-hero-slides-ctv-layout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` (A: data + admin + public; B: pure UI) |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Hotfix public surface + admin settings: A1 là ADD-only nullable JSON (blast radius giới hạn singleton row, không đổi RLS/PII/auth, không migration authority — Tier 1 tự review). B (CTV layout) pure CSS. Nếu T0 chọn A2 (bảng riêng), Tier 1 nâng CRITICAL + LIGHT — reopen contract. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` (T0 đã duyệt A1) |
| Planner | `Tier 1` |
| Baseline | `2495239535d4326a36a617ce8d7694c6867f7164` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/admin/settings/`, `app/(portal)/page.tsx`, `src/domains/job-board/`, `app/api/public/homepage-settings/`, `app/api/admin/homepage-settings/`, `prisma/schema.prisma`, `prisma/migrations/` |
| Forbidden paths | `app/admin/workers/**`, `app/admin/users/**`, `src/domains/workforce/**`, `src/domains/staffing/**`, `app/admin/clients/**`, `app/admin/projects/**` (worktree song song đang chạm); `src/domains/referrals/**` (CTV portal không thuộc task này); `app/(portal)/ve-chung-toi/**` (giữ nguyên copy) |
| Required gates | `npx --no-install prisma validate`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `git diff --check HEAD` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `… T0 duyệt schema → Status → REVISION_REQUIRED hoặc ACCEPTED → /deliver → /resolve (PR push + CI 4/4 xanh)` |

### 0.fork — Schema decision (T0 đã duyệt A1)

Section A của task yêu cầu lưu nội dung 5 slide Hero (image + title + desc) bền vững và có-thể-sửa-bởi-admin. Cấu trúc hiện tại (`HomepageSettings` singleton) chỉ có 1 cột hero image (`heroImageMediaId`); KHÔNG có chỗ chứa 5 slide title/desc. Tier 1 đã đề xuất 3 phương án schema fork:

| Phương án | Cú pháp | Pro | Con | Quyết định T0 |
|---|---|---|---|---|
| **A1 — JSON cột** ✅ | `homepage_settings.hero_slides JSON NULL` (mảng 5 phần tử `{mediaId, title, desc}`, default null → fall back về hardcoded array hiện tại) | Migration add-only đơn giản, 1 cột; service đọc/gọn; rollback `DROP COLUMN`. | JSON nên dùng schema (Zod) khi parse; mediaPath2/folder không thể FK-enforce ngoài JSON. | **T0 chọn A1** (2026-10-07) — Tier 1 implement JSON cột + Zod schema + fallback hardcoded. |
| **A2 — Bảng riêng** | `homepage_hero_slides` (5 row cố định) với FK `mediaId` (nullable) → `media(id) ON DELETE SET NULL` | Quan hệ rõ ràng, FK enforce; dễ index nếu cần. | Blast radius lớn hơn, 1 model mới, route admin mới, RLS mới (hoặc policy note). | Từ chối |
| **A3 — Tận dụng Media.alt/caption** | Dùng `Media.alt` + `Media.caption` để chứa slide title/desc; Admin chỉ chọn 5 media và (nếu cần) sửa alt/caption của từng media qua `/admin/media/[id]`. | KHÔNG schema change; reuse 100% surface có sẵn. | Slide title phải = `Media.alt` (1 dòng, thường là mô tả accessibility) → semantic lệch: title dài 60–80 ký tự, alt nên ngắn 8–15 từ. Hai khái niệm KHÁC nhau; tái sử dụng gây mơ hồ UX + accessibility. | Từ chối |

**T0 chốt A1.** Tier 1 implement theo A1: JSON cột `homepage_settings.hero_slides JSON NULL`, migration add-only, Zod schema `HeroSlidesSchema` (mảng 5 phần tử `{mediaId, title, desc}`), service parse + join Media rows, fallback hardcoded khi column null. `mediaId` reference trong JSON không enforce FK (media rows đã được audit ở P0; xóa media → `slides[i].mediaId = null` → fallback URL mặc định).

Section B (CTV image layout) **không cần schema** — CSS/Tailwind chỉnh đối tượng cũ. Tier 1 sẽ gom A + B thành một delivery để tránh hai PR workstream đụng `app/(portal)/page.tsx` cùng lúc.

## 1. Outcome

### 1.1 User-visible outcome

**A. Thẻ trình chiếu Hero bên phải trang chủ (`RecruitmentHighlight`, 5 slide)**:

1. Trong `Admin → Cài đặt` (ưu tiên tab `Giao diện` đã có), cho phép sửa **ảnh + title + desc** của từng slide hiện có (5 slide, thứ tự KHÔNG đổi, số lượng KHÔNG đổi, cơ chế auto-rotate 3500ms KHÔNG đổi).
2. Ảnh được chọn từ Media Library (gọi `/api/admin/media?folder=homepage`); upload ảnh mới vẫn ở `/admin/media` rồi quay lại Settings → chọn.
3. Title + desc nhập trực tiếp trong form (textarea); `Media.alt` KHÔNG phải slide title (giữ nguyên nghĩa accessibility).
4. Lưu bền vững vào `HomepageSettings.hero_slides` (JSON cột — nếu T0 chọn A1); public surface render từ DTO `HomepageSettings.heroSlides`. Khi null → render mảng hardcoded hiện tại (giữ hành vi v1).
5. Phân biệt rõ với `hero_image_media_id` đã có (ảnh NỀN Hero — phía trái). Hai field tách biệt về UI và DTO.
6. Trạng thái tải/lưu/lỗi rõ ràng (loading / saved / error); validate input server-side (length, media existence) và kiểm tra quyền (ADMIN/HR_MANAGER/DIRECTOR — không đổi gate).
8. **KHÔNG thêm/xoá/sắp xếp slide** trong vòng này — chỉ cho phép sửa nội dung từng slot.

**B. Khu vực "Chương trình Cộng tác viên" (`ReferralStrip`)**:

1. Trên **desktop** (lg+), ảnh không cao vượt quá khối nội dung bên cạnh: container ảnh có `h-full` + `object-cover` + `object-position` để crop bằng khối text; max-height theo cột chữ khi cùng `items-stretch`.
2. Trên **mobile**, ảnh và chữ xếp tự nhiên theo `grid-cols-1 lg:grid-cols-2` hiện tại; ảnh có max-height để không tràn (`max-h-[420px] md:max-h-none`).
3. Ưu tiên chỉnh **layout/crop ảnh hiện có** (`/images/homepage-huongb/referral-team.webp`); chỉ thay ảnh nếu hiện tại không crop đẹp (ảnh mới KHÔNG chứa chữ/logo giả).

### 1.2 Non-goals

- KHÔNG thêm/xoá/sắp xếp slide (5 slot cứng, auto-rotate cứng 3500ms).
- KHÔNG cho phép edit `hero_image_media_id` (ảnh nền Hero phía trái) — đã có ở PR #121.
- KHÔNG đổi schema các bảng khác (Media, MediaAssignment, JobPosting, v.v.).
- KHÔNG đổi copy/URL/brand color/font public site khác.
- KHÔNG đổi RLS policy của bất kỳ bảng nào.
- KHÔNG build CRUD cho tab "Tài khoản & Quyền" (giữ nguyên link tới `/admin/users`).
- KHÔNG touch worktree khác đang chạm (`HrP-t1c-admin-ux-hotfix2`, `HrP-pre-p2-sidebar-active-nav-hotfix`, v.v.).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/components/landing/recruitment-highlight.tsx:14-49` — `SLIDES` mảng 5 phần tử hardcoded (`image`, `title`, `desc`) | Toàn bộ slide content hiện là hằng số trong code; cần persistent storage để admin sửa. |
| `EV-02` | `src/domains/job-board/components/landing/recruitment-highlight.tsx:50-130` — auto-rotate `setInterval(next, 3500)` + dots nav | Cơ chế hiện có KHÔNG đổi; chỉ thay nguồn dữ liệu từ hardcoded → DTO. |
| `EV-03` | `prisma/schema.prisma:1734-1754` (`HomepageSettings` singleton với 1 cột `heroImageMediaId` cho ảNH NỀN) + `src/domains/job-board/public-types.ts:128-160` (`HomepageHeroImageDto`) | `homepage_settings` KHÔNG có cột slide content. Cần schema fork (§0.fork). |
| `EV-04` | `app/admin/settings/admin-settings-form.tsx:213-235` — state Hero image hiện: `heroImageMediaId: string \| null` + `heroImageSelected: {id,url,alt,caption} \| null` | Pattern UI đã chuẩn — picker gọi `/api/admin/media?folder=homepage` (line ~30-180 `_components/hero-image-picker.tsx`). Mở rộng thêm slide picker chỉ là copy/paste + thêm block. |
| `EV-05` | `src/domains/job-board/public-settings.service.ts:60-110` (`HeroMediaRow` + `withHomepageSettingsHero`) — pattern join `media` đã có | Nếu chọn A1, service extend thêm `heroSlides` join 5 `media` rows theo `slides[i].mediaId`. |
| `EV-06` | `app/admin/settings/_components/hero-image-picker.tsx:1-185` — `HeroImagePicker` thin client, grid 3-4-6 col, FOLDER='homepage', TAKE=24 | Pattern UI đã có; có thể clone thành `HeroSlidesEditor` hoặc mở rộng inline block. |
| `EV-07` | `src/domains/job-board/components/landing/referral-strip.tsx:11-79` — `grid grid-cols-1 lg:grid-cols-2 items-center` với 2 cột `flex flex-col gap-5` + img element `object-cover` không cap height | Ảnh right column có thể cao vượt cột chữ khi 4 highlights + button CTA render; cần bound `items-stretch` + `h-full` + object-position. |
| `EV-08` | `src/domains/media/media.types.ts:42-66` — `MediaItemDto` gồm `alt: string`, `caption: string \| null` | Phương án A3 dùng `Media.alt` làm slide title sẽ nhập nhằng accessibility semantic (alt tối đa ~15 từ, title dài 60–80 ký tự). Trade-off đủ lớn để Tier 1 loại A3 trừ khi T0 yêu cầu khác. |
| `EV-09` | `docs/tasks/hrp-t2-public-site-hotfix/TASK.md §7 RISK-02` + `migration.sql:25-31` — FK `hero_image_media_id` đã dùng pattern `ON DELETE SET NULL` | Nếu A1 chọn, slide JSON cũng nên cùng semantic: `mediaId` trong JSON là reference không enforce FK; service tự detect null và fallback image cũ. |
| `EV-10` | `prisma/migrations/20261007100000_t2_public_homepage_hero_image/` — migration add-only vừa merge ở PR #121 | Migration mới (nếu A1) sẽ theo cùng convention `t2_public_homepage_hero_slides`, ADD-ONLY nullable JSON. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Schema fork (§0.fork): **A1 đã được T0 duyệt** — thêm cột `homepage_settings.hero_slides JSON NULL`. Migration add-only, service parse qua Zod schema. (Từ chối A2 và A3.) | `CHOSEN` |
| `DEC-02` | Slide count = 5 cứng, auto-rotate interval 3500ms cứng, dots nav giữ nguyên. KHÔNG cấu hình thêm/xoá/sắp xếp slide trong vòng này. | `CHOSEN` (theo yêu cầu user: "Giữ số lượng slide, thứ tự, cơ chế chuyển slide và các hành vi hiện tại") |
| `DEC-03` | Slide title + desc nhập trực tiếp trong form (textarea, không qua Media.alt/caption). Lý do: tách bạch semantic (xem EV-08). | `CHOSEN` |
| `DEC-04` | Slide image chọn qua Media Library hiện hữu — reuse `HeroImagePicker` pattern với FOLDER='homepage' và nhận thêm prop `multiple=false` cho mỗi slot. Admin upload ảnh mới qua `/admin/media` rồi quay lại Settings. | `CHOSEN` |
| `DEC-05` | Admin block "Ảnh & nội dung slide Hero" thuộc tab `Giao diện` (đã có từ PR #121), đặt SAU block "Ảnh nền trang chủ (Hero)" hiện tại. Mỗi slide là 1 card thu gọn (title + desc input + image picker + "Bỏ chọn" nếu đã có). | `CHOSEN` |
| `DEC-06` | Public DTO `HomepageSettingsDto.heroSlides: HeroSlidePublic[]` với mỗi phần tử `{ index: 1..5, mediaId: string \| null, url: string \| null, alt: string, title: string, desc: string }`. Khi `hero_slides` JSON null → DTO trả mảng fallback rỗng, component `RecruitmentHighlight` lấy hardcoded array khi DTO rỗng. | `CHOSEN` (tùy thuộc DEC-01) |
| `DEC-07` | Service `getHomepageSettings`/`updateHomepageSettings` extend: read parse JSON qua `HeroSlidesSchema` (Zod) + join 5 `media` rows (chỉ khi có `mediaId`); write accept `heroSlides?: HeroSlidesInput \| null` — null = xoá JSON (fallback hardcoded). | `CHOSEN` (tùy thuộc DEC-01) |
| `DEC-08` | Admin route `POST /api/admin/homepage-settings` extend body validation: nếu `heroSlides !== undefined && heroSlides !== null`, validate qua `HeroSlidesSchema`; nếu null thì cho phép xoá. Trả message lỗi 400 với first Zod issue. | `CHOSEN` (tùy thuộc DEC-01) |
| `DEC-09` | Cache: `unstable_cache` đã tag `homepage-settings` ở `app/api/public/homepage-settings/route.ts`. JSON cột cũng theo cùng tag, không cần thêm cache layer. | `CHOSEN` |
| `DEC-10` | B-CTV layout: đổi `items-center` → `items-stretch` ở `grid`; thêm `h-full w-full object-cover object-center` cho img element; đặt `min-h-0 overflow-hidden` lên container ảnh để cap height theo cột chữ (cột chữ có button CTA + 4 highlights). Mobile: thêm `max-h-[420px]` để không tràn quá khổ. | `CHOSEN` |
| `DEC-11` | B-CTV ảnh: ưu tiên chỉnh layout/crop hiện tại (`referral-team.webp`); không thay ảnh trong vòng này. Nếu sau fix crop vẫn xấu → mở task follow-up. | `CHOSEN` |
| `DEC-12` | Tier 1 commit message convention: `feat(t1c-t2-public-site): admin slide content + CTV image layout`. | `CHOSEN` |
| `DEC-13` | Rollback strategy: nếu migration A1 apply xong nhưng app gặp sự cố, đảo bằng `prisma migrate resolve --rolled-back` (với migration name thực tế khi apply) (Vercel Postgres). Rollback contract rõ trong HANDOFF. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Slide image picker | `HeroImagePicker` pattern (EV-06) + `/api/admin/media?folder=homepage` | `N/A` | n/a | n/a | n/a | Dùng nguyên pattern; clone thành `HeroSlideImagePicker` chấp nhận 1 media duy nhất per slot |
| JSON schema validation | Zod 3.x đã có sẵn (xem `app/api/admin/homepage-settings/route.ts` import `StickyAnnouncementSchema`) | `N/A` | n/a | n/a | `src/domains/job-board/public-types.ts` thêm `HeroSlidesSchema` | Cùng pattern với sticky announcement đang dùng |
| Slide carousel UI | `recruitment-highlight.tsx` đã có carousel 5-slide + dots + auto-rotate | `N/A` | n/a | n/a | n/a | Chỉ thay nguồn dữ liệu từ `SLIDES` hardcoded → `props.slides` |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Cache invalidation | `revalidateTag('homepage-settings')` trong admin route đã có (PR #121) | `N/A` | n/a | n/a | n/a | n/a | JSON cột cùng tag, không cần thêm workflow |

## 4. Contract

### 4.1 Requirements

**A. Slide content (phụ thuộc DEC-01 = A1):**

| ID | Requirement |
|---|---|
| `RQ-01` | Migration add-only: `ALTER TABLE homepage_settings ADD COLUMN hero_slides JSON NULL`. |
| `RQ-02` | Prisma schema: `hero_slides Json? @map("hero_slides")` trên model `HomepageSettings`. |
| `RQ-03` | Zod schema `HeroSlidesSchema`: mảng đúng 5 phần tử `{ mediaId: string \| null, title: string, desc: string }`; `mediaId` nullable string; `title` max 120 ký tự (đủ whitespace danh sách dịch vụ HRP); `desc` max 280 ký tự. |
| `RQ-04` | DTO `HeroSlidePublic`: `{ index: 1..5, mediaId: string \| null, url: string \| null, alt: string, title: string, desc: string }`. `HomepageSettingsDto.heroSlides: HeroSlidePublic[]` (luôn length 5 khi parse OK; fallback length 0 mày khi JSON null). |
| `RQ-05` | Service `getHomepageSettings`: parse `hero_slides` JSON qua Zod; với mỗi `mediaId`, thử fetch `media` row (chỉ khi non-null); fallback URL `/images/hero/{default}.jpg` cho slot nếu media missing. Cache result cùng tag. |
| `RQ-06` | Service `updateHomepageSettings`: accept `heroSlides?: HeroSlidesInput \| null`. Nếu `null` → set column JSON NULL; nếu object → parse qua schema → JSON.stringify lưu vào column. Validate media existence (FK runtime, P2003 → 400). |
| `RQ-07` | Admin route `POST /api/admin/homepage-settings`: extend body validation: nếu `heroSlides` non-null non-undefined → Zod parse; nếu null → cho phép; không thêm key → không touch column. |
| `RQ-08` | Admin form: tab `Giao diện` có thêm block "Ảnh & nội dung slide Hero" sau block ảnh nền. Block gồm 5 sub-card (slide 1..5) — mỗi sub-card có: input element title (text), textarea element desc, `HeroSlideImagePicker` (clone pattern). Khi admin chưa chọn ảnh → picker rỗng (giữ slot). |
| `RQ-09` | Admin form state: `heroSlideInputs: [{ mediaId: string \| null, title: string, desc: string }, ...5]`; reset button đồng bộ từ `savedSnapshot.heroSlides`. |
| `RQ-10` | Public render: `RecruitmentHighlight` component nhận prop `slides?: { title, desc, url \| null }[]` (length 0 = fallback hardcoded). Auto-rotate, dots, click nav KHÔNG đổi. Nếu slide nào có `url === null` → render fallback gradient (giữ design hiện có khi ảnh 404 cũng fallback). |
| `RQ-11` | Phân biệt UI: block slide KHÔNG nhầm với block "Ảnh nền trang chủ (Hero)". Hai block label rõ ràng — block nền dùng "ảnh nền", block slide dùng "ảnh trong slide". |
| `RQ-12` | State management: nếu JSON parse fail (DB corrupted) → service fallback về mảng rỗng; form vẫn lưu được (khi admin save sẽ overwrite). |

**B. CTV image layout (no schema):**

| ID | Requirement |
|---|---|
| `RQ-13` | `referral-strip.tsx`: `grid` đổi `items-center` → `items-stretch`. |
| `RQ-14` | Cột ảnh (right): container có `relative overflow-hidden rounded-3xl shadow-card` (giữ) + thêm `min-h-0 h-full`. img element giữ `object-cover` + thêm `object-center` (đã có) + đổi `h-full w-full` để fill container. |
| `RQ-15` | Mobile breakpoint (breakpoint lg (≥1024px)): wrap cột ảnh trong `max-h-[420px] sm:max-h-[480px]` để không tràn. |
| `RQ-16` | Tablet/desktop (`lg+`): container ảnh cap height = cột chữ (đã có `items-stretch` + `h-full`). |
| `RQ-17` | KHÔNG đổi ảnh (`/images/homepage-huongb/referral-team.webp`). Nếu crop không đẹp với frame mới → mở task follow-up (RISK-07). |

### 4.2 Scope boundaries

- **In:** Files trong §0 In-scope roots. Đặc biệt:
  - A: `prisma/schema.prisma`, `prisma/migrations/[ts]_t2_public_homepage_hero_slides/migration.sql`, `src/domains/job-board/public-types.ts`, `src/domains/job-board/public-settings.service.ts`, `app/api/admin/homepage-settings/route.ts`, `app/api/public/homepage-settings/route.ts`, `app/admin/settings/admin-settings-form.tsx`, `app/admin/settings/page.tsx`, `app/admin/settings/_components/hero-image-picker.tsx` (clone hoặc extend), `src/domains/job-board/components/landing/recruitment-highlight.tsx`, `app/(portal)/page.tsx`, tests in `__tests__/`.
  - B: `src/domains/job-board/components/landing/referral-strip.tsx`.
- **Out:** Worktree khác đang chạm (`HrP-t1c-admin-ux-hotfix2`, `HrP-pre-p2-sidebar-active-nav-hotfix`, `HrP-t1a-*`, `HrP-t1b-*`); các tab khác của Admin Settings (giữ nguyên); RLS policy của các bảng khác; public card detail page.
- **Allowed task artifacts:** `docs/tasks/hrp-t1c-t2-public-site-hero-slides-ctv-layout/**` (TASK.md, HANDOFF.md).

### 4.3 Domain boundaries

- **Data/state:** A — JSON cột `hero_slides` nullable, default null (giữ hardcoded khi null). Singleton row không bị động. B — pure CSS, không state mới.
- **Permission/security:** Admin route giữ role gate (ADMIN/HR_MANAGER/DIRECTOR). Media picker gọi admin route — đã gate. KHÔNG thay đổi gate.
- **Interface/API:** A — extend `HomepageSettingsDto.heroSlides`. B — không đổi API.
- **Migration/rollback:** A — nếu DEC-01=A1: 1 migration add-only nullable JSON. Rollback = `DROP COLUMN hero_slides`. KHÔNG đổi FK cũ. KHÔNG backfill (cột null). Nếu DEC-01=A2 (T0 chọn bảng riêng): rollback = DROP TABLE; Tier 1 reopen contract với CRITICAL lane.

## 5. Execution Plan

Mọi STEP dưới đây **phụ thuộc T0 duyệt DEC-01**. Nếu T0 chọn A2 → Tier 1 mở TASK revision mới với CRITICAL lane.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/schema.prisma` + `prisma/migrations/[ts]_t2_public_homepage_hero_slides/migration.sql` | Add `hero_slides Json? @map("hero_slides")` | `npx prisma validate` | Validate fail → revert & log |
| `STEP-02` | `src/domains/job-board/public-types.ts` | Add `HeroSlidesSchema` (Zod) + `HeroSlidePublic` + `HeroSlidesInput` + extend `HomepageSettingsDto.heroSlides` | `npm run typecheck` | typecheck fail → revert |
| `STEP-03` | `src/domains/job-board/public-settings.service.ts` | Read/write `hero_slides`: parse Zod + join media rows | `npm run test:unit src/domains/job-board/public-settings*.test.ts` | test fail → adjust |
| `STEP-04` | `app/api/admin/homepage-settings/route.ts` + `app/api/public/homepage-settings/route.ts` | Extend body validation (Zod), pass-through to service | `npm run typecheck` + `curl` | test fail → adjust |
| `STEP-05` | `app/admin/settings/_components/hero-image-picker.tsx` (hoặc tạo `hero-slide-image-picker.tsx`) | Thin picker clone cho từng slot; FOLDER='homepage', TAKE=24 | unit test | n/a |
| `STEP-06` | `app/admin/settings/admin-settings-form.tsx` + `app/admin/settings/page.tsx` | Thêm block "Ảnh & nội dung slide Hero" ở tab `Giao diện`; state `heroSlideInputs`; payload build | `npm run test:unit app/admin/settings/__tests__/*.test.ts` | fence fail → adjust |
| `STEP-07` | `src/domains/job-board/components/landing/recruitment-highlight.tsx` | Nhận prop `slides?: { title, desc, url \| null }[]`; fallback hardcoded khi length 0 | `npm run test:unit src/domains/job-board/components/landing/__tests__/*.test.ts` | fence fail → adjust |
| `STEP-08` | `app/(portal)/page.tsx` | Fetch `heroSlides` từ public DTO; truyền cho component | nhận cùng DTO | n/a |
| `STEP-09` | `src/domains/job-board/components/landing/referral-strip.tsx` | B: `items-stretch`, `h-full`, mobile `max-h-[420px]` | nhận cùng evidence từ `npm run test:unit` + manual visual check | mismatch → revert |
| `STEP-10` | Update static fences (recruitment-highlight, sections-policy, admin-settings-form.ui2, settings-terminology, required-relation-sweep) | Tests phản ánh contract mới | `npm run test:unit` | fence fail → adjust |
| `STEP-11` | `docs/tasks/hrp-t1c-t2-public-site-hero-slides-ctv-layout/HANDOFF.md` + commit + push + open PR | Deliverable | CI 4/4 green | CI red → adjust until green |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Migration apply thành công; cột `hero_slides JSON NULL` add-only, không ảnh hưởng row hiện có | `prisma migrate status` |
| `AC-02` | `HeroSlidesSchema` parse OK mảng 5 phần tử với shape chuẩn; reject mảng length ≠ 5 hoặc field invalid | `npx vitest run src/domains/job-board/public-types.test.ts` (unit test zod parse) |
| `AC-03` | Service `getHomepageSettings` trả `heroSlides: HeroSlidePublic[]` length 5 với `mediaId` + `url` + `alt` populate khi JSON set + Media row tồn tại; length 5 với `url=null` khi `mediaId` null; length 0 khi column null | `npx vitest run src/domains/job-board/public-settings.service.test.ts` (service test) |
| `AC-04` | Service `updateHomepageSettings` chấp nhận `heroSlides: object` (write) và `heroSlides: null` (clear); reject invalid shape (ZodError) | `npx vitest run src/domains/job-board/public-settings.service.test.ts` (service test) |
| `AC-05` | Admin route POST với `heroSlides: object` → 200 và revalidate tag; với shape invalid → 400 với first Zod issue; với `null` → 200 và clear column | route test (Vitest) |
| `AC-06` | Admin form tab `Giao diện` có block "Ảnh & nội dung slide Hero" với 5 sub-card; mỗi sub-card có input title + textarea desc + image picker + nút "Bỏ chọn" | `npx vitest run app/admin/settings/__tests__/admin-settings-form.hero-slides.static.test.ts` (static test source analysis) |
| `AC-07` | Form submit với cả 5 sub-card thay đổi → POST 200; DTO snapshot trả về khớp; `hasChanges` true | unit test hoặc manual |
| `AC-08` | Public render: `RecruitmentHighlight` nhận `slides.length === 5` từ DTO → render 5 slide với ảnh + title + desc từ server; `slides.length === 0` → fallback hardcoded; auto-rotate 3500ms vẫn chạy; dots vẫn hoạt động | manual + static test |
| `AC-09` | Phân biệt rõ: block ảnh nền (Hero background) ≠ block slide 5 (ảnh + title + desc). Cả hai block KHÔNG nằm cùng card. | `npx vitest run app/admin/settings/__tests__/admin-settings-form.hero-slides.static.test.ts` (static test) |
| `AC-10` | B-CTV desktop: cột ảnh cap height bằng cột chữ (qua `items-stretch` + `h-full`); không tràn grid | manual visual check + breakpoint test (Playwright hoặc tạm CSS computed) |
| `AC-11` | B-CTV mobile: ảnh `max-h-[420px]` không vượt quá khung; chữ + button vẫn đọc rõ | manual visual check |
| `AC-12` | UTF-8 no-BOM toàn changed surface | `node .ai-pipeline/scripts/verify-encoding.mjs` |
| `AC-13` | CI run 4/4 PASS (Quality, Integration, Vercel Build, Vercel Preview) | gh CLI |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-01 | AC-01 |
| `RQ-02` | STEP-01 | AC-01 |
| `RQ-03` | STEP-02 | AC-02 |
| `RQ-04` | STEP-02, STEP-03 | AC-03 |
| `RQ-05` | STEP-03 | AC-03 |
| `RQ-06` | STEP-03 | AC-04 |
| `RQ-07` | STEP-04 | AC-05 |
| `RQ-08` | STEP-06 | AC-06, AC-09 |
| `RQ-09` | STEP-06 | AC-07 |
| `RQ-10` | STEP-07, STEP-08 | AC-08 |
| `RQ-11` | STEP-06 | AC-09 |
| `RQ-12` | STEP-03 | AC-03 |
| `RQ-13` | STEP-09 | AC-10, AC-11 |
| `RQ-14` | STEP-09 | AC-10, AC-11 |
| `RQ-15` | STEP-09 | AC-10, AC-11 |
| `RQ-16` | STEP-09 | AC-10, AC-11 |
| `RQ-17` | STEP-09 | AC-10, AC-11 |
| All | STEP-10, STEP-11 | AC-12, AC-13 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | **T0 chọn DEC-01 = A2 (bảng riêng)** thay vì A1 → blast radius tăng, CRITICAL audit bật buộc. | Tier 1 mở TASK revision mới với CRITICAL lane + LIGHT audit; viết lại RQ-A* để dùng `homepage_hero_slides` table + FK. |
| `RISK-02` | **T0 từ chối schema fork hoàn toàn** (chọn "no-change, giữ hardcoded"). | Section A thu hẹp về "no-op + ghi nhận trong HANDOFF"; chỉ triển khai B (CTV layout). Tạo task follow-up riêng nếu cần slide content. |
| `RISK-03` | JSON column corruption → service parse fail. | Service fallback `[]` (DEC-12); admin save lại sẽ overwrite. |
| `RISK-04` | Media bị xoá trong khi slide vẫn reference → ảnh 404. | Service fallback URL mặc định khi `media` row missing; component render fallback gradient khi `url === null` (RQ-10). |
| `RISK-05` | Form state 5 sub-card làm form phình, dễ vượt max-width tab. | CSS Grid 1-col mobile, 2-col tablet, 5-col desktop optional (RQ-08); auto-scroll trong card. |
| `RISK-06` | Crop ảnh CTV với layout mới vẫn xấu (object-position cứng `object-center`). | Thử `object-top` nếu chủ thể ở phía trên; nếu vẫn không đẹp → task follow-up. |
| `RISK-07` | Mobile `max-h-[420px]` quá nhỏ với content cao hơn (ảnh + chữ cùng mobile). | Tăng `max-h-[480px]` hoặc dùng aspect-ratio cho ảnh. |
| `RISK-G1` | Worktree `codex/t2-public-site-hotfix` đã merge ở PR #121; nếu mở thêm commit trên cùng branch có thể đụng Owner-pushed commit mới. | Sau T0 duyệt, fetch `origin/codex/t2-public-site-hotfix` mới nhất; rebase hoặc merge trước khi push. |

## 8. Open Questions

- None. Schema fork (§0.fork) đã được T0 duyệt (A1 — JSON cột). Contract gate `READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 append sau khi T0 duyệt schema fork.

| Round | Decision | Reason |
|---|---|---|
| R0 | T0 chọn DEC-01=A1 (JSON cột `homepage_settings.hero_slides JSON NULL`); contract chốt `READY_TO_CODE`. | T0 chọn A1 trong câu hỏi `AskQuestion` schema-fork. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-07 | Initial contract; Status `DRAFT`; Decision state `OPEN` chờ T0 duyệt schema fork §0.fork | Tier 1 stop at contract per yêu cầu user |
| `v1.0` | 2026-10-07 | T0 duyệt DEC-01=A1; Status `READY_FOR_EXECUTION`; Contract gate `READY_TO_CODE`; Decision state `CLOSED`; Open Questions đóng | Owner endorsement qua `AskQuestion` schema-fork |