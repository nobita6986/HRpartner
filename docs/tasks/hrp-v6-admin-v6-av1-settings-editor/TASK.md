# TASK — HRP V6 Admin V6 AV1 — Homepage Settings + Query Integration

**Ngày:** 11/09/2026
**Tier:** 1
**Lane:** STANDARD
**Audit:** NONE
**Trạng thái:** IN PROGRESS

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
- `npx tsc --noEmit` — PASS
- Unit tests — PASS
- `npm run build` — PASS

## Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 11/09/2026 | Tier 1 | Initial task |
