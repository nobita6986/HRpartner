# HANDOFF — `hrp-t2-public-site-hotfix`

## 0. Status

| Field | Value |
|---|---|
| Task slug | `hrp-t2-public-site-hotfix` |
| Protocol | `V2_FAST_FREEZE` STANDARD + Audit NONE |
| Baseline | `8f93178a81c9f35c6f9be1e016bc4377928db185` (`origin/main`) |
| Branch | `codex/t2-public-site-hotfix` (worktree `C:/CodeApp/HrP-t2-public-site-hotfix`) |
| Scope | 4 mảng public-site: salary filter, Admin Hero upload, Settings tabs, recruiting card companyName |

## 1. Outcome

1. **Salary filter (`/viec-lam` + Hero)**: 6 bucket whitelist (`<5`, `5-10`, `10-15`, `15-20`, `20-30`, `>30`); parser + service áp dụng. Hero "Mức lương — sắp có" → `<select>` thật. Job `salaryMinVnd === null` chỉ loại khi bucket cụ thể được chọn.
2. **Admin Hero image**: cột `homepage_settings.hero_image_media_id TEXT NULL` + FK `Media(id) ON DELETE SET NULL` (add-only). `HeroImagePicker` chọn từ `/api/admin/media?folder=homepage`; fallback gradient khi null. Public landing render `<img>` overlay khi `heroImage != null`.
3. **Settings tabs (4 nhóm)**: `interface` (pageSizes + news + Hero + sticky), `contact` (phone/Zalo/Messenger), `system` (placeholder "Sắp có"), `account` (`<Link>` sang `/admin/users`). State local `useState`; route KHÔNG đổi URL.
4. **Recruiting card**: tiêu đề = `companyName` (canonical), subtitle = `positionTitle`, headcount `availableSlots` dòng riêng — fix bug "Thợ điện" hiển thị làm tên dự án. Data truy nguyên, không đổi nhãn để che.

## 2. Gates — all GREEN

| Gate | Result |
|---|---|
| `pnpm tsc --noEmit` | PASS (0 errors) |
| `pnpm lint` | PASS (chỉ warnings pre-existing) |
| `pnpm vitest run` | PASS — 305 files / 4947 tests / 9 skipped |
| `pnpm build` | PASS |
| `verify-encoding.mjs` | PASS (23 files UTF-8 no-BOM) |

## 3. Files changed

`prisma/schema.prisma`+`prisma/migrations/20261007100000_t2_public_homepage_hero_image/migration.sql`; `src/domains/job-board/{public-types,public-settings.service,public.service,public-listing.params,public-listing.labels,components/landing/hero,components/landing/recruiting-projects-section}.ts(x)`; `app/(jobs)/viec-lam/page.tsx`; `app/(portal)/page.tsx`; `app/api/admin/homepage-settings/route.ts`; `app/admin/settings/{admin-settings-form.tsx,homepage-settings-patch.ts,_components/hero-image-picker.tsx,_components/settings-tabs.tsx,homepage-settings-patch.test.ts}`; `src/domains/job-board/{public-settings.test,public-listing.params.test,public-listing.static.test}.ts`; `src/shared/security/required-relation-sweep.static.test.ts`; `docs/tasks/hrp-t2-public-site-hotfix/{TASK,HANDOFF}.md`.

## 4. Migration safety

`hero_image_media_id` ADD-ONLY, FK `ON DELETE SET NULL`. Singleton `homepage_settings` row không bị động; DTO trả `heroImage: null` cho row cũ — backward compatible. Rollback: `DROP COLUMN` + `DROP FK`.

## 5. Required-relation sweep

`EXPECTED_HITS` line-shift 805/812 → 806/813 (thêm `homepageSettings: { select: { heroImageMediaId: true } }`). HomepageSettings không RLS, sweep KHÔNG đếm hit mới.

## 6. Non-goals

Không đổi schema ngoài 1 cột add-only. Không CRUD cho "Tài khoản & Quyền". Không upload inline trong picker. Không đổi RLS/auth/state-machine/enums. Không thêm dependency. Audit NONE (T0 pre-authorized).

## 7. Closing

Implementation complete. PR sẽ push tới `origin/codex/t2-public-site-hotfix`. Dừng trước merge/deploy cho tới khi CI 4/4 GREEN.
