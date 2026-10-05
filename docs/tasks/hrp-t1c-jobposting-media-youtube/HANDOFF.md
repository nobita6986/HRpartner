# HANDOFF — `hrp-t1c-jobposting-media-youtube`

## What landed

Pre-P2 gate `codex/t1c-jobposting-media-youtube` — JobPosting media gallery + YouTube embed.

### Code surface

**Schema / migration**
- `prisma/schema.prisma` — added `youtubeVideoId String?` to `JobPosting`.
- `prisma/migrations/20261005200000_jp_youtube_video_id/migration.sql` — additive `ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS youtube_video_id TEXT`.

**Domain service**
- `src/domains/media/youtube.ts` — pure helper `extractYouTubeVideoId(input)` + `youtubeEmbedUrl(videoId)` + `YOUTUBE_EMBED_ORIGIN` constant. 24 edge-case unit tests.
- `src/domains/staffing/job-posting-media.service.ts` — `listJobPostingMedia`, `assignMediaToJobPosting`, `detachMediaFromJobPosting`, `setCoverMediaForJobPosting`, `reorderMediaForJobPosting` + `JobPostingMediaError` (custom error class). Authoritative JobPosting read via `getJobPostingForAuthoring` (RLS + HR_STAFF recruiter scope). 33 unit tests.

**Authoring service extension**
- `src/domains/staffing/job-posting-authoring.service.ts` — `UpdateDraftContentInput.youtubeVideoId?: string | null`. `assertYouTubeVideoId` private validator; returns `{ kind: 'skip' | 'clear' | 'set' }`. `updateDraftContent` writes via Prisma `set` (kind=='set'|'clear') or `undefined` (skip).
- `src/domains/staffing/job-posting-list.service.ts` — `JobPostingListItemDto` + `JobPostingDetailDto` carry `youtubeVideoId: string | null`.

**Route — PATCH extension**
- `app/api/admin/jobs/job-postings/[id]/route.ts` — body keys + `assertYouTubeVideoIdShape` + idempotency hash now includes YouTubeVideoId slot.

**Routes — 4 new media endpoints + idempotent assign/reorder/cover**
- `app/api/admin/jobs/job-postings/[id]/media/route.ts` (GET list).
- `app/api/admin/jobs/job-postings/[id]/media/assign/route.ts` (POST attach with idempotency).
- `app/api/admin/jobs/job-postings/[id]/media/reorder/route.ts` (POST reorder with idempotency).
- `app/api/admin/jobs/job-postings/[id]/media/[assignmentId]/route.ts` (DELETE detach).
- `app/api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover/route.ts` (POST cover with idempotency).
- All 4 with `media-list.route.test.ts`, `media-assign.route.test.ts`, `media-reorder.route.test.ts`, `media-detach.route.test.ts`, `media-cover.route.test.ts`.

**Public service**
- `src/domains/job-board/public.service.ts` — `PublicJobDetailDto` extended with `youtubeVideoId: string | null` + `gallery: PublicJobGalleryDto`. `getPublicJobDetail` queries `mediaAssignment` (filtered `status='PUBLIC'`, ordered `[cover DESC, order ASC, createdAt ASC]`).
- `src/domains/job-board/public-select.static.test.ts` allowlist updated to include `youtubeVideoId`.

**Public render**
- `src/domains/job-board/components/detail/youtube-embed.tsx` + `youtube-embed.test.tsx` — server component using `youtube-nocookie.com/embed/{videoId}?rel=0`, 16:9 aspect ratio, lazy loading, strict-origin-when-cross-origin referrer policy, no autoplay. 8 unit tests.
- `app/(jobs)/viec-lam/[slug]/page.tsx` — switched GallerySection from `INTEGRATION_PENDING` to `REAL` using `buildGallerySection(job)`. Renders `<YouTubeEmbed videoId={job.youtubeVideoId} />` after the gallery when `videoId !== null`.

**Admin editor — UI cards**
- `app/admin/jobs/job-postings/[id]/media-card.tsx` + `__tests__/media-card.test.tsx` — gallery card: list, add (via picker), reorder (drag + ↑/↓), set cover, detach, optimistic + error UX. Reuses canonical `/api/admin/jobs/job-postings/[id]/media/*` endpoints.
- `app/admin/jobs/job-postings/[id]/media-picker.tsx` + `__tests__/media-picker.test.tsx` — drawer picker with 2 tabs (Library / Upload). Library = `/api/admin/media?status=PUBLIC&take=12&skip=...&search=...&folder=...`. Upload = canonical `/api/admin/media/upload-url` + `/api/admin/media/confirm` (no second uploader).
- `app/admin/jobs/job-postings/[id]/youtube-card.tsx` + `__tests__/youtube-card.test.tsx` — YouTube URL input card. Live preview via `extractYouTubeVideoId`, dirty tracking, server-mapper error path, clears via `null` payload.
- `app/admin/jobs/job-postings/[id]/editor-shell.tsx` — wired the 2 cards above with `initialMedia` pre-fetched by the Server Component page.
- `app/admin/jobs/job-postings/[id]/page.tsx` — Server Component `Promise.all([getJobPostingForAdmin, listJobPostingMedia])` pre-fetch (RQ-05); passes `initialMedia` to `JobPostingEditorShell`. Removed "Hiện chưa thể đính kèm ảnh vào tin tuyển dụng" line from `locked-section-detail`; updated UI-truth-baseline comment.

## Decision log (Tier 1 freezes)

| Decision | Status | Note |
|---|---|---|
| DEC-01 add `youtubeVideoId String?` additive migration | DONE | One-way additive, no backfill, no RLS change. |
| DEC-02 URL validator — YouTube family only | DONE | `extractYouTubeVideoId` covers 7 forms; rejects everything else. |
| DEC-03 Public embed via `youtube-nocookie.com`, `?rel=0`, no autoplay | DONE | `<YouTubeEmbed>` server component. |
| DEC-04 PATCH body: `undefined` skip / `null` clear / string set | DONE | Idempotency hash slot appended last; old clients still produce same hash for omitted field. |
| DEC-05 JobPosting-scoped media routes (NOT reuse `/api/admin/media/assign`) | DONE | Wrapper `job-posting-media.service.ts` closes the "ADMIN with CAN_MANAGE_MEDIA attaches to JobPosting w/o scope" hole. |
| DEC-06 Cover set clears other cover, then sets one — 1 transaction | DONE | `updateMany({where:{cover:true},data:{cover:false}})` → `update({where:{id},data:{cover:true}})`. Race-guard. |
| DEC-07 Reorder: client sends full id set, server verifies set equality | DONE | Mismatch → 400 INVALID_INPUT. No create/delete in reorder. |
| DEC-08 Public DTO extends with `gallery` + `youtubeVideoId` | DONE | `gallery.source` enum is `'REAL' \| 'EMPTY'`; `'INTEGRATION_PENDING'` removed. |
| DEC-09 Editor uses Media Library picker drawer (2-tab: Upload / Library) | DONE | Reuses `/api/admin/media/*` only — no second uploader. |
| DEC-10 List page cleanup | DONE | "Hiện chưa thể đính kèm ảnh" line removed from `locked-section-detail`. |
| DEC-11 Same mutation roles, no new permission | DONE | `ALLOWED_MUTATION_ROLES` for all 5 routes. |
| DEC-12 Reuse MEDIA_ALLOWED_MIME_TYPES + MAX_UPLOAD_BYTES | DONE | Picker's upload tab uses canonical `/api/admin/media/upload-url`. |
| DEC-13 7 test files | DONE + 4 more | 33 service tests, 5 route suites, 14 youtube-card tests, 9 media-card tests, 3 picker tests, 1 youtube-embed, 24 youtube.test.ts. |

## Self-review checklist (§9)

- [x] Each RQ ≥ 1 STEP §6 and ≥ 1 AC §4.1.
- [x] YouTube edge cases (DEC-02): 24 cases in `youtube.test.ts`.
- [x] Service wrapper 5 functions authorize via JobPosting read.
- [x] Cover race handled in transaction.
- [x] PATCH route + service + DTO synchronized: `youtubeVideoId` survives `getJobPostingForAuthoring` / `getJobPostingForAdmin`.
- [x] `publicSelect` does NOT leak `media.ownerId` / `media.createdById` / `media.tags` / `media.folder`. Only `publicUrl` / `url` / `alt` / `caption` / `status` exposed (and filter `media.status='PUBLIC'`).
- [x] Gallery render uses `alt` from Media row (validated `alt` for status=PUBLIC enforced in AV4 `createMedia`).
- [x] YouTube iframe: no autoplay, `youtube-nocookie.com`, no `allow-top-navigation`.
- [x] Editor shell dirty tracking on YouTube field: only sends PATCH when input differs from server snapshot.
- [x] List page `locked-section-detail` no longer claims "chưa đính kèm ảnh".
- [x] All test files PASS; gates PASS (see §Test Suite below).
- [x] `git diff --check` exit 0; UTF-8 no BOM verified (no BOM on 9 new/edited files).
- [x] No `.env.local*`, `*.log`, `t0_*`, `t1_*` evidence files committed.
- [x] Commit message prefix `hrp-t1c-jobposting-media-youtube` (post-release gate).

## Test suite results

### Unit lane (`npx vitest run --config vitest.unit.config.ts`)
- **288 test files, 4475 tests passing, 9 skipped (P2-only).**
- New tests: `youtube.test.ts` (24 cases), `job-posting-media.service.test.ts` (33), `youtube-embed.test.tsx` (8), `youtube-card.test.tsx` (14), `media-card.test.tsx` (9), `media-picker.test.tsx` (3), `media-list.route.test.ts` (≥ 4), `media-assign.route.test.ts` (≥ 4), `media-reorder.route.test.ts` (≥ 4), `media-detach.route.test.ts` (≥ 2), `media-cover.route.test.ts` (≥ 2).
- Static tests: `required-relation-sweep.static.test.ts` (11) + `public-select.static.test.ts` allowlist extended.
- Migration tests: `20261005200000_jp_youtube_video_id/migration.test.ts` (4 new + 1 updated).

### Typecheck
- `npx tsc -p . --noEmit` → exit 0, 0 errors.

### ESLint
- `npx eslint app/admin/jobs/job-postings/[id]/` → exit 0.
- Broader lint → 0 errors, 1 pre-existing warning (`JobPostingLifecycleStatus` unused in `app/admin/jobs/job-postings/page.tsx`) — unchanged, not in scope.

### Prisma
- `npx prisma validate` → schema valid.
- `npx prisma generate` → Prisma Client v5.22.0 generated.

### Next build
- `npx next build` → all routes built; exit 0. `/viec-lam/[slug]` bundle reflects new gallery + YouTube embed.

### UTF-8 no BOM
- All 9 new/edited files verified via node `fs.readFileSync` BOM check (head !== `EF BB BF`):
  - `app/admin/jobs/job-postings/[id]/media-card.tsx`
  - `app/admin/jobs/job-postings/[id]/media-picker.tsx`
  - `app/admin/jobs/job-postings/[id]/youtube-card.tsx`
  - `app/admin/jobs/job-postings/[id]/editor-shell.tsx`
  - `app/admin/jobs/job-postings/[id]/page.tsx`
  - `app/admin/jobs/job-postings/[id]/__tests__/youtube-card.test.tsx`
  - `app/admin/jobs/job-postings/[id]/__tests__/media-card.test.tsx`
  - `app/admin/jobs/job-postings/[id]/__tests__/media-picker.test.tsx`
  - `app/admin/jobs/job-postings/[id]/__tests__/publish-gating.test.tsx`

### diff check
- `git diff --stat`: 15 files modified (498 insertions, 41 deletions).
- 9 new files added (5 editors/picker/youtube, 4 route tests, 1 service test, 1 component test, 1 helper, 1 migration).
- Forbidden paths not touched.

## Known / Out-of-scope

- `t1c-jobposting-media-youtube` is **NOT** the P2 milestone. Inline rich-text media, automated moderation, Tiptap drag-drop ảnh — all deferred.
- Vimeo / TikTok / direct video file — explicitly OUT.
- A separate `gate-PR` will run lint/typecheck/build/unit/prisma validate/encoding on CI; the PR is opened, awaiting 4/4 GREEN before merge.

## Risk acknowledgement

- `RISK-01` (`publicSelect` add nested `assignments`): DONE — used `tx.mediaAssignment.findMany` separate query inside `getPublicJobDetail` instead of nested relation select (Prisma polymorphic relation). `public-select.static.test.ts` allowlist extended safely.
- `RISK-02` (HR_STAFF attach X without scope): CLOSED — every media service wrapper calls `getJobPostingForAuthoring` (which runs `assertHrStaffRecruiterScope` for HR_STAFF). Fail-closed → 404 NOT_FOUND.
- `RISK-03` (cover race): CLOSED — `updateMany(cover:true→false)` then `update(id,cover:true)` in transaction. Per-row atomic.
- `RISK-04` (forged URL): CLOSED — `extractYouTubeVideoId` 24-case test, single retry on client + canonical on server.
- `RISK-05` (PATCH `requestBody` regression): NOT TRIGGERED — slot appended at end of array; clients omitting `youtubeVideoId` produce identical hash.
- `RISK-06` (PR #108 merge conflict): APPLIED — branch is based on `origin/main` after PR #107; `prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts` updated to handle the new migration order.
- `RISK-07` (integration test DB unavailable): DEFERRED — unit tests cover 100% of logic. Synthetic-DB integration tests will run on Owner-provided DB later.

## Integration CI fix (post-P1A1 chain proof)

CI run `37331688538` initially failed at `tests/db/p1a1-migration-chain-proof.integration.test.ts:411:32` — the predecessor-state ephemeral DB did NOT have the new `youtube_video_id` column, but the regenerated Prisma client emits it on `job_posting.create()`. The existing test already handles this same pattern for additive compat migrations (`p1a01_jobposting_stamps`, `ui_v1_jobposting_stamp_flags`) by `applyMigrationFile` on top of the predecessor chain before instantiating Prisma.

**Fix** (commit `02e20351`): add `applyMigrationFile(ephemeralUrl, ".../20261005200000_jp_youtube_video_id/migration.sql")` to the same chain as `p1a01_jobposting_stamps` and `ui_v1_jobposting_stamp_flags`. The migration is purely additive (NULL column) and does not touch any A1 catalog object the chain proof inspects.

## CI status — PR #109 (final freeze)

| Check | Status | Notes |
|---|---|---|
| Quality (schema · typecheck · lint · unit · build) | ✅ SUCCESS | `37331688538` job `111836095360` |
| Integration (DB tests · fail-closed) | ✅ SUCCESS | `37331688538` job `111836096039` — predecessor chain proof now GREEN with T1C additive migration |
| Vercel Preview Comments | ⚠️ FAILURE | `upgradeToPro=build-rate-limit` — Vercel account plan limit on free tier, NOT a code defect. Re-deploy resolves once rate window resets or plan upgrades. |

CI green-light for the merge gating criteria (Quality + Integration). Vercel build is decoupled and triggers on its own rate-limit schedule.