# TASK — HRP V6 Admin V6 AV1 — Homepage Settings + Query Integration

**Ngày:** 11/09/2026
**Tier:** 1
**Lane:** STANDARD
**Audit:** NONE
**Trạng thái:** IMPLEMENTATION COMPLETE · Owner visual review pending

## Mục tiêu

Backend + Admin form cho `HomepageSettings` singleton, đồng thời tích hợp vào Plan UI B:
- Schema + migration ADD-only + CHECK constraint `id = 'default'`
- Public read API + Admin write API
- `urgency=URGENT` query mở trên `/api/jobs`
- Flip `featuredJobs` từ fixture preview sang `/api/jobs?urgency=URGENT`
- Inject `listingPageSize` từ settings vào `/viec-lam`

## Phạm vi

### Schema (additive)

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

Migration ADD-only với:
- `CREATE TABLE homepage_settings ...`
- `ALTER TABLE homepage_settings ADD CONSTRAINT homepage_settings_singleton CHECK (id = 'default')`
- Insert default row `('default', 9, 12)`

### Permission

- Thêm `CAN_EDIT_HOMEPAGE_SETTINGS` vào `permission-catalog.ts` (group SYSTEM)
- Seed ADMIN trong `prisma/seed.mjs` (ADMIN short-circuit nên resolver trả ALL — nhưng explicit seed cho audit)

### Service layer

- `src/domains/job-board/public-types.ts` — export `HomepageSettingsDto`, `HomepageSettingsView`
- `src/domains/job-board/public-settings.service.ts` — `getHomepageSettings()` idempotent UPSERT bootstrap

### API

- `GET /api/public/homepage-settings` — public projection, NO auth, `unstable_cache` tag `homepage-settings` + TTL 60s
- `POST /api/admin/homepage-settings` — ADMIN write, `revalidateTag('homepage-settings')`

### UI

- `app/admin/settings/page.tsx` — Admin form (form BestJobsPageSize + ListingPageSize)
- `app/(portal)/page.tsx` — flip featuredJobs sang `/api/jobs?urgency=URGENT` + inject `bestJobsPageSize` từ view-model
- `app/(jobs)/viec-lam/page.tsx` — inject `listingPageSize` từ view-model (fallback 12, range [6..50] clamp)

### Query

- `/api/jobs` đã hỗ trợ `urgency=URGENT` query (DEC-01, AC-03). Tie-breaker `postedAt desc + id desc`.
- Validate `limit` clamp [1,50] đã có.

## Không làm

- Không flip `BestJobsSection` props refactor sang view-model (UI B sẽ làm)
- Không xóa file `fixtures/best-jobs-urgent-preview.ts` (file không tồn tại — đã được tích hợp)
- Không biến `HomepageSettings` thành authority cho V7

## File Changes Summary

| File | Change |
|---|---|
| `prisma/schema.prisma` | Thêm `HomepageSettings` model |
| `prisma/migrations/20260911002_av1_homepage_settings/migration.sql` | CREATE TABLE + CHECK + INSERT default |
| `src/shared/auth/permission-catalog.ts` | Thêm `CAN_EDIT_HOMEPAGE_SETTINGS` |
| `prisma/seed.mjs` | Seed permission ADMIN |
| `src/domains/job-board/public-types.ts` (NEW) | Export `HomepageSettingsDto`, `HomepageSettingsView` |
| `src/domains/job-board/public-settings.service.ts` (NEW) | Idempotent UPSERT bootstrap + getHomepageSettings |
| `app/api/public/homepage-settings/route.ts` (NEW) | GET public projection, NO auth, unstable_cache |
| `app/api/admin/homepage-settings/route.ts` (NEW) | POST ADMIN write, revalidateTag |
| `app/admin/settings/page.tsx` | Admin form (server-side fetch + client form) |
| `app/(portal)/page.tsx` | Flip featuredJobs sang /api/jobs?urgency=URGENT + inject pageSize |
| `app/(jobs)/viec-lam/page.tsx` | Inject listingPageSize từ settings |
| `src/domains/job-board/public-settings.test.ts` (NEW) | Unit tests cho service + DTO |

## Gate

- `npx prisma validate` — PASS
- `npx tsc --noEmit` — PASS (pre-existing AV1 `SettingsClient` typing in test, not in scope)
- Unit tests — PASS (1925/1925)
- `npm run build` — PASS
- Lint on changed files — 0 errors

## Owner Visual Review checklist

> Owner mở `/admin/settings` (role ADMIN/HR_MANAGER/DIRECTOR) để self-serve review.
> Mỗi mục đánh dấu ✅/❌ + screenshot khi cần.

### 1. Render đúng
- [ ] Form "Homepage Settings" hiển thị badge "AV1 · ACTIVE"
- [ ] 2 trường: select "Số việc tốt nhất / trang" + number input "Số việc / trang"
- [ ] Giá trị khớp với DB (sau migrate + apply seed)
- [ ] 4 placeholder cards (Bảo mật / Thông báo / Tích hợp / Nhật ký) hiển thị "Chưa khả dụng"

### 2. Validation
- [ ] Gõ `listingPageSize = 5` → border field đổi sang `var(--error)`, error message hiển thị
- [ ] Gõ `listingPageSize = 51` → tương tự
- [ ] Khi field invalid → button "Lưu thay đổi" disabled
- [ ] Submit form với giá trị hợp lệ → success banner hiển thị, "Cập nhật lần cuối" refresh

### 3. Reset
- [ ] Sửa 1 field, chưa save → button "Đặt lại" enabled
- [ ] Click "Đặt lại" → field revert về saved snapshot
- [ ] Click "Đặt lại" khi không có thay đổi → button disabled

### 4. Side effects
- [ ] Save `bestJobsPageSize = 12` → mở `/` (homepage) → BestJobs grid reload với 12 items
- [ ] Save `listingPageSize = 6` → mở `/viec-lam` → phân trang hiển thị 6 items / page

### 5. Cache
- [ ] Save xong → đợi ≤ 60s → fetch `/api/public/homepage-settings` thấy giá trị mới (không cần restart server)

### 6. Accessibility
- [ ] Tab qua `Số việc tốt nhất / trang` → focus ring rõ
- [ ] Khi có lỗi → screen reader đọc được error message (`aria-invalid` + `aria-describedby`)
- [ ] Success banner có `aria-live="polite"`

### 7. Edge cases
- [ ] Role không phải ADMIN (e.g. WORKER) → redirect `/forbidden` (handled bởi `/admin/layout.tsx`)
- [ ] Body request có field không hợp lệ (e.g. `bestJobsPageSize: 7`) → API trả 400 với message tiếng Việt

---

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 11/09/2026 | Tier 1 | Initial task |
| v1.1 | 11/09/2026 | Tier 1 | UX polish + Owner visual review checklist. Live field validation, aria-invalid/describedby, Reset button, post-save timestamp, friendly option labels, testid hooks cho review scripts. |
