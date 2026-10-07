# HANDOFF — `hrp-t1c-t2-public-site-hero-slides-ctv-layout`

## Scope shipped

- **Item A — Hero slide content management.** Tab "Giao diện" trong Admin → Cài đật có block mới "Ảnh & nội dung slide Hero" cho phép admin chỉnh 5 slide (carousel bên phải trang chủ) — chọn ảnh từ Media Library + tiêu đề + mô tả. Số slot cứng = 5; thứ tự cứng; auto-rotate 3500ms cứng (không add/remove/reorder). Bấm "Khôi phục mặc định" → clear payload → public render hardcoded array v1.
- **Item B — CTV image layout refinement.** `referral-strip.tsx`: desktop `items-stretch` + `min-h-0` + `lg:h-full` cân bằng 2 cột; mobile `max-h-[420px]` chặn ảnh quá khổ; giữ nguyên ảnh `referral-team.webp`, không thay mới.

## Schema fork đã chốt 1

- **A1 — JSON `homepage_settings.hero_slides JSONB NULL`** (T0 đã duyệt).
- `prisma/migrations/20261007110000_t2_public_homepage_hero_slides/migration.sql`: thêm `JSONB` nullable rồi OK; không đổi cột hiện có, không FK cứng, không RLS, không PII.

## Implementation surface

- `src/domains/job-board/public-types.ts` — Zod schema `HeroSlidesSchema` (length = 5, title ≤ 120, desc ≤ 280, mediaId nullable), constants `HERO_SLIDES_COUNT`, `HERO_SLIDE_TITLE_MAX`, `HERO_SLIDE_DESC_MAX`, DTO field `heroSlides: HeroSlidePublic[]`.
- `src/domains/job-board/public-settings.service.ts` — `buildHeroSlidesPublic(rawJson, prisma)` parse + join media (1 `media.findMany` duy nhất, deduplicate mediaIds); `getHomepageSettings`/`updateHomepageSettings` nhận/truyền cột JSONB; trả `[]` khi column null hoặc parse fail.
- `app/api/admin/homepage-settings/route.ts` — validate `heroSlides` qua `HeroSlidesSchema`, reject mảng ≠ 5 hoặc title desc quá bound; null hợp lệ để clear.
- `app/admin/settings/homepage-settings-patch.ts` — `HomepageSettingsDraft.heroSlides` + `heroSlidesReset`. Patch emit mảng 5 slot khi đổi nội dung; `heroSlidesReset: true` → patch `null`.
- `app/admin/settings/_components/hero-slides-editor.tsx` — picker Media + title/desc cho từng slot, validate client-side.
- `app/admin/settings/admin-settings-form.tsx` — block "ui2-hero-slides-block" với reset button + error chain trong `hasFieldError`/`hasChanges`.
- `src/domains/job-board/components/landing/recruitment-highlight.tsx` — accept `slides?: HeroSlidePublic[]`; `length === 0` → `FALLBACK_SLIDES` hardcoded; auto-rotate 3500ms giữ nguyên.
- `app/(portal)/page.tsx` — fetch `heroSlides` qua `/api/public/homepage-settings`, truyền xuống `RecruitmentHighlight`.
- `app/admin/settings/page.tsx` — fallback DTO thêm `heroSlides: []`.

## Tests + fences

- `src/domains/job-board/hero-slides-service.test.ts` (13 cases) — schema fence + service parse/join/dedup/edge cases.
- `src/domains/job-board/public-settings.test.ts` (41) — existing + fixtures updated.
- `app/admin/settings/homepage-settings-patch.test.ts` (14) — patch emit/skip/null khi heroSlides đổi.
- `app/api/admin/homepage-settings/route.test.ts` (5) — existing, không vỡ.
- `app/api/public/homepage-settings/route.test.ts` (1) — existing.
- `app/admin/settings/__tests__/settings-terminology.static.test.ts` (3) — fence editor block có mặt, 5 slot cứng, constants HERO_SLIDE_TITLE/DESC_MAX.
- `src/domains/job-board/components/landing/hero-slides-public-render.static.test.ts` (4) — accept prop, FALLBACK_SLIDES, 3500ms.
- `src/domains/job-board/components/landing/referral-strip-layout.static.test.ts` (5) — items-stretch, max-h-[420px], object-cover, giữ referral-team.webp.
- **Total: 253 targeted tests pass / 4973 full suite pass / 0 lint errors / typecheck clean / build OK / encoding no-BOM PASS (19 files).**

## Limits

- **Inline upload cho slide image** chưa hỗ trợ (giữ đồng nhất với `HeroImagePicker` của PR #121). Admin upload ở `/admin/media` rồi quay lại Settings → Giao diện → chọn ảnh.
- **`hero_slides` JSONB không FK-enforce** media.id. Khi media row xoá giữa đường, service trả về `url: null` → fallback `<img>` rỗng; carousel không vỡ.
- **Slide rotation 3500ms cứng** — không đổi trong vòng này (giữ v1).

## INSPECTION

- Implementation SHA: `f1821055`.
- Baseline: `2495239535d4326a36a617ce8d7694c6867f7164`.
- Worktree: `HrP-t2-public-site-hotfix` (branch `codex/t2-public-site-hotfix`).
- PR: https://github.com/nobita6986/HRpartner/pull/122
- Đang chờ T0 merge/deploy (không tự merge theo policy task).