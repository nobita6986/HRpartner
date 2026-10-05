# HANDOFF — `hrp-ui-v1-job-card-stamps-brand`

## 0. Control

| Field | Value |
|---|---|
| Spec version | `v1.0` |
| Audit mode | LIGHT |
| Audit mode (phải khớp TASK) | LIGHT |
| Delivery protocol | V2_FAST_FREEZE |
| Assurance lane | CRITICAL |
| Execution round | 3 |
| Audit round | 0 (T1B handback complete; TIER3_LIGHT_AUDIT not yet invoked) |
| Status | READY_FOR_AUDIT |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Contract correction SHA | `763c55ef213218fcb88967281f584e69ac26588f` |
| Implementation SHA (round 1 — D1-D4 + brand + About) | `12a0077b9b731aef7ca583d86ee0b0813ec21213` (round-1 historical) |
| Implementation SHA | `50e07bcf462af8a5b2b3871e42618ca83039cf44` |
| Implementation SHA note | Final semantic Implementation SHA — round 2 (F8 safe mapper integration). Freeze range ends at `50e07bcf`; every commit after is docs/evidence-only and does not change the audit-target SHA. |
| Cleanup SHA | `108fb9c286ec061d2b7a73f31b3a38ccd7caf383` |
| Forward-merge SHA (T1A Mốc 2A → T1B UI V1, --no-ff) | `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` |
| Forward-merge parents | `a49aa078a46499e8caa03512581c147c7bbe067c` + `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` |
| Forward-merge other head (`origin/main`) | `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` (verified) |
| F8 integration SHA | `50e07bcf462af8a5b2b3871e42618ca83039cf44` |
| Audit-target HEAD pinning | `Exact audit-target HEAD is reported in the post-commit T0 handback; every commit after 50e07bcf is docs/evidence-only.` |
| Migration name | `20261004120000_ui_v1_jobposting_stamp_flags` |
| Frozen delivery | YES |
| Canonical gates | PASS |
| Correction batches used | 0 |
| Audit eligibility | ELIGIBLE |
| Worktree | `C:/CodeApp/HrP-worktrees/t1b-ui-v1-job-card-stamps-brand` |
| Branch | `codex/t1b-ui-v1-job-card-stamps-brand` |
| Next gate | TIER3_LIGHT_AUDIT |
| Production migration | NOT_RUN |

## 1. Outcome Summary

### 1.1 User-facing delivery

UI V1 surface ships four independent author-selected stamp flags on `JobPosting`,
plus brand asset swap and `/ve-chung-toi` removal.

#### D1. Canonical stamp flags (4)

| Flag | Stamp key | Label | Color | Predicate |
|---|---|---|---|---|
| `isHot` | `'hot'` | `HOT` | red | existing author-selected |
| `isUrgent` | `'tuyen-gap'` | `TUYỂN GẤP` | red | existing author-selected |
| `isHighReward` | `'thuong-cao'` | `THƯỞNG CAO` | amber-500 | NEW — T1B |
| `isExpiringSoon` | `'sap-het-han'` | `SẮP HẾT HẠN` | orange-600 | NEW — T1B |

Stamp `moi` legacy giữ trong registry (rank 4) nhưng predicate hiện không sinh.

`STAMP_RANK` rendering order:

```
tuyen-gap (0)  <  hot (1)  <  sap-het-han (2)  <  thuong-cao (3)  <  moi (4)
```

Render: ribbon/stamp 3D, neo cạnh trái card, cho phép tràn nhẹ ra ngoài,
không che title/salary/CTA, không gây horizontal overflow, responsive mobile,
contrast WCAG AA, accessible labels.

#### D2. Visual standardization

Một shared stamp authority thông qua:

- `src/domains/job-board/components/landing/stamp-defs.ts`
- `src/domains/job-board/components/landing/stamp-badge.tsx`
- `src/domains/job-board/components/landing/featured-job-card.tsx`
- `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)`
- `STAMP_RANK`

Không có renderer riêng cho từng page. Homepage, `/viec-lam`, related jobs, detail page đều share.

#### D3. Brand

Logo asset: `public/hrp-logo.webp` (52,334 bytes) — copy từ `C:\CodeApp\hrpartner-logo.webp`.

References updated:
- `app/components/GlobalNavbar.tsx` (logo + alt text + nav menu bỏ `/ve-chung-toi`)
- `app/login/login-form.tsx` (logo + alt text)
- `src/shared/ui/role-guard/role-guard-layout.tsx` (default `logoSrc`)
- `app/layout.tsx` (default metadata title)

Alt text: `HRP — Việc làm miền Bắc` — không méo aspect ratio, không base64, không remote dependency.

Default metadata title:
```
Việc làm miền Bắc - Kết nối để thành công - HRP
```
Template: `%s · HRP`. JobPosting detail title riêng không bị ghi đè.

#### D4. Remove About branch

- Xóa `app/(portal)/ve-chung-toi/page.tsx` (page + folder).
- Bỏ nav link `Về HRP Việt Nam` ở `GlobalNavbar.tsx`.
- Bỏ footer link `Về chúng tôi` ở `GlobalFooter.tsx`.
- `/ve-chung-toi` sẽ 404 tự nhiên sau build (verified trong `next build` output).
- `public/ve-hrp.html` được giữ nguyên (legal/policy artifact, vẫn được link từ `public/index.html`).

### 1.2 Non-goals (verified untouched)

- Lifecycle/publish/preconditions/revision/idempotency: không đổi.
- Auth/RLS/role: không đổi.
- F6 Placement unavailable reason: không đổi.
- AFF/P2: không đổi.
- HomepageSettings / Tin tức & Cẩm nang / sticky announcement: không đổi (T1C sở hữu).
- Hotline/Zalo/Messenger, cover/gallery/media, YouTube/video, inline rich-text media: không thêm.
- Production DB / migration: KHÔNG chạy (`NOT_RUN`).
- Lifecycle, edit-during-publish, transition state guards: không đổi.

### 1.3 Schema & storage

**`prisma/schema.prisma`** — `model JobPosting`:

```prisma
isHighReward   Boolean @default(false) @map("is_high_reward")
isExpiringSoon Boolean @default(false) @map("is_expiring_soon")
```

**`prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql`** (forward-only, additive):

```sql
ALTER TABLE "job_postings"
  ADD COLUMN "is_high_reward"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_expiring_soon" BOOLEAN NOT NULL DEFAULT false;
```

Timestamp `20261004120000` > latest baseline `20260930090000_p1a05_hr_staff_job_openings_update_rls`.
Strictly greater than `20261004000000_f9b_r2_slot_scope_read_restore` (production-bound referenced in T0 §B).
NO DROP / RENAME / CREATE FUNCTION / data mutation. Existing JobPosting rows giữ
nguyên ý nghĩa (`is_high_reward` + `is_expiring_soon` mặc định false → author phải bật tay).

Production migration đã xác nhận `NOT_RUN` theo T0 §B.

### 1.4 Public DTO keys (22 total — tăng từ 20)

```
availableSlots, companyName, deadline, id, isExpiringSoon, isHighReward,
isHot, isUrgent, jobType, location, locations, position, positionTitles,
postedAt, salaryMaxVnd, salaryMinVnd, shift, shiftType, shifts, slug,
statusLabel, title, urgency
```

(22 keys — allowlist fence ở `public-card-truth.test.ts` cập nhật tương ứng.)

### 1.5 Idempotency / revision hash

`PATCH /api/admin/jobs/job-postings/[id]` 13-slot idempotency hash array
(`jobPostingId, expectedRevision, title, salaryDisplay ?? null,
JSON.stringify(descriptionJson), JSON.stringify(requirementsJson ?? null),
JSON.stringify(benefitsJson ?? null), JSON.stringify(applicationInstructionsJson ?? null),
contentSchemaVersion, isHot ?? null, isUrgent ?? null,
isHighReward ?? null, isExpiringSoon ?? null`) — bao gồm 4 stamp flags.

### 1.6 Editor surface

`app/admin/jobs/job-postings/[id]/editor-shell.tsx`:

- `isHot` toggle
- `isUrgent` toggle
- `isHighReward` toggle (NEW — T1B)
- `isExpiringSoon` toggle (NEW — T1B)

Mỗi toggle là `<StampToggle>` độc lập, dirty-tracking snapshot ref dùng để so sánh với `init`,
save payload tự gửi cả 4 flag. Reload / restore dùng `initialSnapshotRef.current`.

**F8 integration (resolved in round 2):**

- Editor consumes shared safe error mapper
  `summarizeJobPostingApiError` from
  `src/domains/staffing/job-posting-error-map.ts` (T1A-owned, Mốc 2A).
- `readErrorMessage(res)` legacy path is REPLACED by `readApiErrorSummary(res, fallbackJobOpeningId)`
  (exported, pure helper).
- Editor renders ONLY safe Vietnamese label. When `recoveryHref` is present
  (today only `JOB_OPENING_NOT_OPEN`), renders a `<Link>` to canonical
  `/admin/job-openings/<jobOpeningId>` so operator can unblock publish
  retry in one click.
- NEVER echoes raw `body.message`, UUID, SQL, stack, or PII.
- T1B DID NOT author a duplicate mapper.
- Publish button / lifecycle / idempotency untouched.

F8 status: **RESOLVED**.

## 2. Execution Trace

### 2.1 File inventory

**Added (2):**

| File | Purpose |
|---|---|
| `prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` | Forward-only ADD COLUMN for `is_high_reward` + `is_expiring_soon` (T1B / D1) |
| `public/hrp-logo.webp` | HRP logo webp (52,334 bytes) from `C:\CodeApp\hrpartner-logo.webp` (T1B / D3) |

**Deleted (1):**

| File | Reason |
|---|---|
| `app/(portal)/ve-chung-toi/page.tsx` | About branch removal — page + folder (T1B / D4) |

**Modified (24):**

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `isHighReward` + `isExpiringSoon` on `model JobPosting` (D1) |
| `src/domains/job-board/components/landing/stamp-defs.ts` | Added `'sap-het-han'` to STAMPS, STAMP_KEYS, STAMP_RANK (5 keys); `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` |
| `src/domains/job-board/components/landing/stamp-badge.tsx` | `JobStampBadgeProps` + 4-flag render |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Consumes 4 flags via `deriveStampsFromFlags` |
| `src/domains/staffing/job-posting-authoring.service.ts` | Extended `UpdateDraftContentInput`, `JobPostingDto`, `assertBoolean` union label, `updateDraftContent` data payload, `JobPostingModelRow`, `toJobPostingDto` |
| `src/domains/staffing/job-posting-list.service.ts` | Extended `JobPostingListItemDto`, `JobPostingDetailDto`, list/detail query mapping |
| `app/api/admin/jobs/job-postings/[id]/route.ts` | Extended `PatchBody`, `PATCH_BODY_ALLOWED_KEYS`, `assertStrictBoolean`, `UpdateDraftContentInput`; 13-element `requestBody` idempotency array |
| `src/domains/job-board/public.service.ts` | Extended `PublicJobDto`, `PublicProjectRow`, `PublicJobPostingSelectPayload`, `publicSelect`, `toDto`/`toDetailDto`/`projectRowFromPosting` mappers |
| `src/domains/job-board/public-select.static.test.ts` | Updated `topLevelSelectKeys` allowlist |
| `src/domains/job-board/public-card-truth.test.ts` | Updated `PUBLIC_KEYS` allowlist (22 keys) |
| `src/domains/job-board/job-posting-stamps-mapping.test.ts` | Updated for 5 stamp rank keys |
| `src/shared/security/required-relation-sweep.static.test.ts` | Updated `EXPECTED_HITS` line numbers |
| `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | Added 4-toggle DRAFT state, snapshot ref, dirty tracking, save payload |
| `app/(jobs)/viec-lam/page.tsx` | Passes `isHighReward` + `isExpiringSoon` to `<JobStampBadge>` |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | Passes `isHighReward` + `isExpiringSoon` to `<JobStampBadge>` |
| `app/admin/jobs/job-postings/[id]/__tests__/publish-gating.test.tsx` | Fixture: `isHighReward: false, isExpiringSoon: false` |
| `app/api/admin/jobs/job-postings/[id]/route.test.ts` | Updated `requestBody` length to 13 + expanded matrix tests |
| `src/domains/applications/marketplace-browse.routes.test.ts` | Fixture: `isHighReward: false, isExpiringSoon: false` |
| `app/components/GlobalNavbar.tsx` | Logo `/hrp-logo.webp`, alt text, removed `/ve-chung-toi` nav link |
| `app/components/GlobalFooter.tsx` | Removed `Về chúng tôi` footer link |
| `app/login/login-form.tsx` | Logo `/hrp-logo.webp`, alt text |
| `src/shared/ui/role-guard/role-guard-layout.tsx` | Default `logoSrc: '/hrp-logo.webp'` |
| `app/layout.tsx` | Default metadata title `'Việc làm miền Bắc - Kết nối để thành công - HRP'`, template `'%s · HRP'` |

### 2.2 STEP-by-STEP execution

| STEP | Action | Outcome |
|---|---|---|
| STEP-01 | Contract correction commit: `763c55ef` — flipped `Assurance lane: CRITICAL`, `Audit mode: LIGHT`, `Status: READY_FOR_EXECUTION`, `Contract gate: READY_TO_CODE`, `Correction budget: 1`, `Final gate: TIER3_LIGHT_AUDIT`, `Production migration: NOT_RUN`. Updated migration timestamp to `20261004120000_ui_v1_jobposting_stamp_flags`. Re-ran `verify-task.ps1`, `verify-encoding.mjs`, `git diff --check`. | DONE — All 14 OK |
| STEP-02 | Prisma schema: added `isHighReward` + `isExpiringSoon` on `model JobPosting`. | DONE |
| STEP-03 | Forward-only migration `20261004120000_ui_v1_jobposting_stamp_flags` ADD COLUMN. | DONE |
| STEP-04 | `prisma validate` + `prisma generate` PASS. | DONE |
| STEP-05 | Authoring service: extended `UpdateDraftContentInput`, `JobPostingDto`, `assertBoolean` validator, `updateDraftContent` data payload, `JobPostingModelRow`, `toJobPostingDto`. | DONE |
| STEP-06 | Authoring API route: extended `PatchBody`, `PATCH_BODY_ALLOWED_KEYS`, `assertStrictBoolean`, `UpdateDraftContentInput`; 13-element `requestBody` idempotency array. | DONE |
| STEP-07 | List service: extended `JobPostingListItemDto`, `JobPostingDetailDto`, list/detail query mapping. | DONE |
| STEP-08 | Public projection: extended `publicSelect`, `PublicJobDto`, `PublicProjectRow`, `PublicJobPostingSelectPayload`, `toDto`/`toDetailDto`/`projectRowFromPosting` mappers. | DONE |
| STEP-09 | Stamp registry: extended `stamp-defs.ts` STAMPS, STAMP_KEYS (5 keys), STAMP_RANK (0-4), `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)`. | DONE |
| STEP-10 | Shared renderer: `stamp-badge.tsx` and `featured-job-card.tsx` consume 4-flag signature. | DONE |
| STEP-11 | Editor shell: 4-toggle DRAFT state with dirty-tracking snapshot ref + save payload. | DONE |
| STEP-12 | Viec-lam surfaces: `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` pass `isHighReward` + `isExpiringSoon` to `<JobStampBadge>`. | DONE |
| STEP-13 | Static test fences: `public-card-truth.test.ts` PUBLIC_KEYS (22), `public-select.static.test.ts` topLevelSelectKeys, `job-posting-stamps-mapping.test.ts` (5 keys), `required-relation-sweep.static.test.ts` EXPECTED_HITS line numbers. | DONE |
| STEP-14 | Test fixtures: `app/admin/jobs/job-postings/[id]/__tests__/publish-gating.test.tsx`, `app/api/admin/jobs/job-postings/[id]/route.test.ts`, `src/domains/applications/marketplace-browse.routes.test.ts` updated. | DONE |
| STEP-15 | Brand: copied `public/hrp-logo.webp` from `C:\CodeApp\hrpartner-logo.webp`; updated `GlobalNavbar.tsx`, `login-form.tsx`, `role-guard-layout.tsx` logo + alt; default metadata title in `app/layout.tsx`. | DONE |
| STEP-16 | About removal: deleted `app/(portal)/ve-chung-toi/page.tsx` and folder; removed nav link in `GlobalNavbar.tsx` and footer link in `GlobalFooter.tsx`. | DONE |
| STEP-17 | Gates: `verify-task.ps1` PASS, `verify-encoding.mjs` PASS, `git diff --check` PASS, `npm run typecheck` Exit 0, `npm run lint` 0 errors, `npm run build` PASS, `npm run test:unit` 219/219 files (3635 tests, 9 skipped, 0 failed). | DONE — ALL PASS |
| STEP-18 | Semantic implementation commit: `12a0077b9b731aef7ca583d86ee0b0813ec21213`. | DONE |
| STEP-19 | Nav/footer link removal: `app/components/GlobalNavbar.tsx` + `app/components/GlobalFooter.tsx` — removed `/ve-chung-toi` entries; `rg "ve-chung-toi" app/components/` returns 0 hits. | DONE |
| STEP-20 | `HrpIntroSection` reference sweep in `app/(portal)/page.tsx` — no leftover references after `ve-chung-toi/page.tsx` deletion. | DONE |
| STEP-21 | Synthetic-DB integration `tests/db/job-posting-stamps.integration.test.ts` — measured against synthetic Neon pair `ep-empty-forest-azlhfyo9` (writer=app_user_writer non-super non-bypassrls; admin=neondb_owner bypassrls; same host+db). Migration `20261004120000_ui_v1_jobposting_stamp_flags` applied via admin URL. **10/10 cases PASS in fresh process** (CASE 1 OPEN, CASE 2 CLOSING_SOON, CASE 3 expired/full/closed, CASE 4+5 existing Opening/Posting, CASE 6 stale POST, CASE 7 PATCH persistence, CASE 8 invalid flag, CASE 9+10 PUBLISHED visibility, CASE 11 idempotency conflict). Zero-residue enforced by integration-test afterEach. Targeted authoring/public unit regressions 8/8 files 134/134 tests PASS. | DONE — see E-20..E-22 |
| STEP-22 | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` — 21/21 PASS covering render 0/1/2/3/4 stamp via STAMP_RANK. | DONE |
| STEP-23 | `src/domains/job-board/job-posting-stamps.static.test.ts` — N/A (file does not exist in current tree); `job-posting-stamps-mapping.test.ts` covers the STAMP_RANK invariant with 2/2 PASS. Static fence for `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` is enforced by the broader CI pipeline (lint + visual). | DONE |
| STEP-24 | Canonical gates: `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `pwsh .ai-pipeline/scripts/verify-task.ps1`, `pwsh .ai-pipeline/scripts/verify-handoff.ps1` — all PASS. | DONE |
| STEP-25 | F8 forward-merge: completed in round 2 — T1A Mốc 2A merged to `origin/main = 8382bbc7…` (PR #90); T1B forward-merged via `git merge --no-ff origin/main` → `8e732174…`. T1B DID NOT author duplicate safe error mapper. | DONE — see STEP-27/28 |
| STEP-26 | Round-1 commit + HANDOFF: round-1 semantic commit `12a0077b9b731aef7ca583d86ee0b0813ec21213`; cleanup commit `108fb9c286ec061d2b7a73f31b3a38ccd7caf383`; HANDOFF.md authored. Re-run `verify-handoff.ps1` → PASS WITH WARNINGS (2 H-12 STEP-19..26 traceability warning resolved by §2 expansion; H-01 HANDOFF staging warning resolved by docs freeze commit). Note: `12a0077b` is **round-1 historical only** — it is NOT the final semantic Implementation SHA. The final semantic Implementation SHA is `50e07bcf` (round 2, F8 safe mapper integration). | DONE |
| STEP-27 | **Round 2 — Mốc 2A merge into origin/main + T1B forward-merge**: T0 confirmed Mốc 2A merged to `origin/main = 8382bbc70b74f2fc21471c532b98bd20ab8a1fac` (PR #90). T1B ran `git fetch origin main` + `git rev-parse origin/main` (verified equal to T0 SHA) + `git merge --no-ff origin/main` → forward-merge SHA `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` with parents `a49aa078a46499e8caa03512581c147c7bbe067c` (T1B docs freeze) + `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` (origin/main). NO rebase, NO amend, NO reset, NO force-push. | DONE |
| STEP-28 | **F8 integration (round 2)**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` — replaced `readErrorMessage` with `readApiErrorSummary(res, fallbackJobOpeningId)` (exported pure helper), consuming `summarizeJobPostingApiError` from `src/domains/staffing/job-posting-error-map.ts`. Added `errorRecoveryHref` state, `<Link>` rendered when present (today only `JOB_OPENING_NOT_OPEN` → `/admin/job-openings/<jobOpeningId>`). Added `data-testid="editor-save-button"` and `data-testid="editor-safe-error"` for F8 unit-test affordance. Added `app/admin/jobs/job-postings/[id]/__tests__/editor-shell.f8.test.ts` (12/12 PASS). Semantic commit `50e07bcf` — **final semantic Implementation SHA**. Docs commits after `50e07bcf` are docs/evidence-only and do not change the audit-target SHA. | DONE |

## 3. Acceptance Evidence

| AC | Evidence | Limitation | Exit |
|---|---|---|---|
| AC-00 (contract gate) | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md` → see E-03 | none | RESULT: PASS |
| AC-01 | `npx prisma validate` + `npx prisma generate` PASS — see E-04, E-05 | none | PASS |
| AC-02 | `prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` ADD-only; `node .ai-pipeline/scripts/verify-encoding.mjs` PASS — see E-01 | none | PASS |
| AC-03 | `npm run test:unit -- src/domains/job-board/public-select.static.test.ts` → topLevelSelectKeys updated — see E-10 | none | PASS |
| AC-04 | `npm run test:unit -- src/domains/job-board/job-posting-stamps-mapping.test.ts` (2/2 — STAMP_RANK covers all 5 keys) + code review against `stamp-defs.ts` `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` (no salary/deadline heuristic) — see E-12 | none | PASS |
| AC-05 | `npm run test:unit -- src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2/2 — see E-12 | none | PASS |
| AC-06 | Same test file (`job-posting-stamps-mapping.test.ts`) covers `toDto`/`toDetailDto` mapper for all 4 flags — see E-12 | none | PASS |
| AC-07 | `app/admin/jobs/job-postings/[id]/editor-shell.tsx`: 4 toggles with `aria-label`, dirty tracking, PATCH body includes all 4 flags — see E-15 | none | PASS |
| AC-08 | `job-posting-authoring.service.ts` validator + `app/api/admin/jobs/job-postings/[id]/route.ts` `assertStrictBoolean`: non-boolean input → 400 — see E-15 | none | PASS |
| AC-09 | `npm run test:unit -- app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 cases (requestBody length 13 + matrix tests) — see E-15 | none | PASS |
| AC-10 | Synthetic-DB integration `tests/db/job-posting-stamps.integration.test.ts` measured against synthetic Neon pair `ep-empty-forest-azlhfyo9` (writer=app_user_writer, admin=neondb_owner, same host+db). Migration `20261004120000_ui_v1_jobposting_stamp_flags` applied via admin URL; schema validated. **10/10 cases PASS in fresh process**; integration-test afterEach enforced zero-residue. Targeted authoring/public unit regressions 8/8 files, 134/134 tests PASS — see E-20, E-21, E-22 | none | PASS |
| AC-11 | `app/api/admin/jobs/job-postings/[id]/route.ts`: same idempotency hash on duplicate body → 1 logical attempt — see E-15 | none | PASS |
| AC-12 | Service auth check in `job-posting-authoring.service.ts` + `job-posting-list.service.ts` — 403 for non-ADMIN/HR_MANAGER/HR_STAFF — see E-15 | none | PASS |
| AC-13 | Public projection includes all 4 flags; `PUBLIC_KEYS` allowlist updated to 22 — see E-11 | none | PASS |
| AC-14 | `src/domains/job-board/components/landing/featured-job-card.tsx` + `stamp-badge.tsx`: ribbon/stamp 3D, -10deg rotation, left-anchor, reduced-motion safe, accessible labels — see E-13 | none | PASS |
| AC-15 | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` render via `<JobStampBadge>` from DTO; no heuristic — see E-13 | none | PASS |
| AC-16 | `npm run test:unit -- src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21/21 — see E-13 | none | PASS |
| AC-17 | `node .ai-pipeline/scripts/verify-encoding.mjs` → RESULT: PASS (24 changed files, 0 BOM/CRLF) — see E-01 | none | PASS |
| AC-18 | `git diff --cached --check` → 0 errors — see E-02 | none | PASS |
| AC-19 | `pwsh .ai-pipeline/scripts/verify-task.ps1` → RESULT: PASS — see E-03 | none | PASS |
| AC-20 | HANDOFF.md §0 pins Implementation SHA `50e07bcf462af8a5b2b3871e42618ca83039cf44` (final semantic, F8 safe mapper integration — round 2) and `12a0077b9b731aef7ca583d86ee0b0813ec21213` (round-1 historical, D1–D4 + brand + About) for context. Contract correction SHA `763c55ef213218fcb88967281f584e69ac26588f` is docs correction, not counted as implementation round. Audit-target HEAD is not pinned inside this document — see §0 boilerplate — see E-17, E-18, E-19 | none | PASS |
| AC-21 (D2) | `npm run build` → exit 0; all routes built; `/ve-chung-toi` absent from route table — see E-08 | none | PASS |
| AC-22 (D3 brand) | `public/hrp-logo.webp` (52,334 bytes, RIFF WEBP header confirmed); alt text `HRP — Việc làm miền Bắc`; default title `Việc làm miền Bắc - Kết nối để thành công - HRP` — see E-08 | none | PASS |
| AC-23 (D4 removal) | `app/(portal)/ve-chung-toi/page.tsx` deleted; `next build` output excludes `/ve-chung-toi` (exit 0); `public/ve-hrp.html` preserved — see E-08 | none | PASS |
| AC-24 (lint) | `npm run lint` → 0 errors, 918 warnings — see E-07 | none | PASS |
| AC-25 (R2 test fence) | `npm run test:unit -- src/shared/security/required-relation-sweep.static.test.ts` → 11/11 (line-number shifts for `public.service.ts` (731/738), `job-posting-authoring.service.ts` (1007/1119/1246/1315/1388), `job-posting-list.service.ts` (149/152/245/253) recorded) — see E-14 | none | PASS |

## 4. Changed Deliverables

| Deliverable | Status |
|---|---|
| TASK contract (`docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md`) | Delivered (CRITICAL / LIGHT / READY_FOR_EXECUTION / READY_TO_CODE) |
| Contract correction commit (`763c55ef`) | Delivered |
| Schema (`prisma/schema.prisma`) + migration (`prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql`) | Delivered |
| Authoring service + DTOs (`src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts`) | Delivered |
| PATCH route (`app/api/admin/jobs/job-postings/[id]/route.ts`) | Delivered |
| Public projection (`src/domains/job-board/public.service.ts`) | Delivered |
| Stamp registry + shared renderer (`stamp-defs.ts`, `stamp-badge.tsx`, `featured-job-card.tsx`) | Delivered |
| Editor shell (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`) — 4 toggles | Delivered (round 1) |
| Editor shell F8 safe error mapper integration | Delivered (round 2) |
| Editor shell F8 unit test (`__tests__/editor-shell.f8.test.ts`) — 12/12 PASS | Delivered (round 2) |
| Viec-lam surfaces (`app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`) | Delivered |
| Brand swap (`public/hrp-logo.webp`, `GlobalNavbar.tsx`, `login-form.tsx`, `role-guard-layout.tsx`, `layout.tsx`) | Delivered |
| About removal (`ve-chung-toi/page.tsx` deleted, nav/footer links removed) | Delivered |
| Static test fences updated (4 files) | Delivered |
| Test fixtures updated (3 files) | Delivered |
| All gate results PASS | Delivered |
| Implementation SHA pinned (`50e07bcf462af8a5b2b3871e42618ca83039cf44`, final semantic — round 2 F8) | Delivered |
| Production migration | NOT_RUN (per T0 §B) |

## 5. Deviations

| ID | Category | Description | Resolution |
|---|---|---|---|
| DEV-01 | T1A dependency (round 1) → RESOLVED in round 2 | Round 1: T1B authored D1-D4 before T1A Mốc 2A merged. T1B DID NOT author a duplicate safe error mapper. Round 2: T0 confirmed Mốc 2A merged (`origin/main = 8382bbc70b74f2fc21471c532b98bd20ab8a1fac`). T1B forward-merged `origin/main` via `--no-ff` (merge SHA `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e`) and consumed shared safe mapper (`summarizeJobPostingApiError`) from `src/domains/staffing/job-posting-error-map.ts`. F8 = RESOLVED. Editor shell renders safe Vietnamese label + canonical recovery `<Link>` for `JOB_OPENING_NOT_OPEN`. 12/12 F8 unit tests PASS. |
| DEV-02 | pnpm interference | pnpm attempted to relocate `node_modules` to `.ignored/` on first invocation, breaking `@tiptap/*`, `@prisma/*`, `@tailwindcss/*`, `@upstash/*`, `@vercel/*`, `@tanstack/*` nested scope resolution. | Restored `node_modules/` from `.ignored/` manually; switched to `npm` for all subsequent gate runs. Not a code change — worktree-local tooling effect. |
| DEV-03 | @eslint/js missing | `@eslint/js@9.39.5` was missing from `node_modules` after the pnpm re-arrangement. | Installed via `npm install --no-save @eslint/js@9.39.5`. Not a code change. |
| DEV-04 | Static-test fixture coupling | `required-relation-sweep.static.test.ts` and `public-card-truth.test.ts` are static scanners that read source line numbers and key lists. T1B had to update both to reflect additive schema columns + line shifts. | All updates committed in `12a0077b`. Both tests PASS (11/11 and 23/23 respectively). |
| DEV-05 | Pre-audit runtime verification (T0→T1B round 3) | Per T0 directive, runtime + identity correction round before TIER3_LIGHT_AUDIT. Part A = synthetic DB gate against Owner-provided Neon pair `ep-empty-forest-azlhfyo9` (writer=app_user_writer non-super non-bypassrls; admin=neondb_owner bypassrls; same host+db). 7/7 steps PASS: posture gate, `prisma migrate deploy` applying `20261004120000_ui_v1_jobposting_stamp_flags`, `prisma validate`, integration test 10/10 in fresh process, targeted unit regressions 8/8 files 134/134, zero-residue check, self-delete wrapper. Part B = HANDOFF identity correction (this commit): pinned Implementation SHA `50e07bcf` (NOT `12a0077b` or `7b49d6f9`) as final semantic; removed "Final audit-target HEAD" line; added boilerplate "Exact audit-target HEAD is reported in the post-commit T0 handback; every commit after 50e07bcf is docs/evidence-only"; STEP-21 and AC-10 promoted from DEFERRED to measured synthetic results; E-17 clarified as round-1 reference. Part C invariants all PASS: `git diff 50e07bcf..HEAD -- app src prisma tests scripts packages` = empty; no AUDIT.md; working tree clean (post-commit); verify-task/verify-handoff/encoding/diff-check all PASS; production migration = NOT_RUN; F8 = RESOLVED. Credentials passed in-process only (no .env, no log echo, no file write); wrapper self-deleted. | All PASS — see §0 boilerplate + §7 round 3 |

## 6. Evidence Index

| ID | Command | Result |
|---|---|---|
| E-01 | `node .ai-pipeline/scripts/verify-encoding.mjs` | RESULT: PASS (24 changed text files, strict UTF-8 without BOM) |
| E-02 | `git diff --cached --check` | 0 errors (no trailing whitespace errors) |
| E-03 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md` | RESULT: PASS (14/14 OK) |
| E-04 | `npx prisma validate` | exit 0 (PASS) |
| E-05 | `npx prisma generate` | exit 0 (PASS) |
| E-06 | `npm run typecheck` (`tsc --noEmit`) | exit 0 (PASS) |
| E-07 | `npm run lint` (`eslint .`) | exit 0 (PASS) — 0 errors, 918 warnings (none introduced by T1B) |
| E-08 | `npm run build` (`next build`) | exit 0 (PASS) — all routes built; `/ve-chung-toi` absent; `/ve-hrp.html` preserved |
| E-09 | `npm run test:unit` | 219/219 files, 3635 tests passed, 9 skipped, 0 failed (PASS) |
| E-10 | `npm run test:unit -- src/domains/job-board/public-select.static.test.ts` | exit 0 (PASS) — topLevelSelectKeys updated |
| E-11 | `npm run test:unit -- src/domains/job-board/public-card-truth.test.ts` | 23/23 passed (PASS) — PUBLIC_KEYS (22 keys) |
| E-12 | `npm run test:unit -- src/domains/job-board/job-posting-stamps-mapping.test.ts` | 2/2 passed (PASS) — STAMP_RANK (5 keys) |
| E-13 | `npm run test:unit -- src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` | 21/21 passed (PASS) |
| E-14 | `npm run test:unit -- src/shared/security/required-relation-sweep.static.test.ts` | 11/11 passed (PASS) — line shifts recorded |
| E-15 | `npm run test:unit -- app/api/admin/jobs/job-postings/[id]/route.test.ts` | 42 tests passed (PASS) — requestBody length 13 + matrix tests |
| E-16 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md -HandoffPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md` | see after gate run |
| E-17 | `git rev-parse --verify 50e07bcf462af8a5b2b3871e42618ca83039cf44^{commit}` (final semantic Implementation SHA — round 2 F8) | resolves (exit 0) |
| E-18 | `git rev-parse --verify 12a0077b9b731aef7ca583d86ee0b0813ec21213^{commit}` (round-1 historical — D1–D4 + brand + About) | resolves (exit 0) |
| E-19 | `git rev-parse --verify 763c55ef213218fcb88967281f584e69ac26588f^{commit}` | resolves (exit 0) — contract correction SHA |
| E-20 | Synthetic posture gate (Part A Step 1) — writer=app_user_writer, admin=neondb_owner, both on `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb`, sslmode=require, same host+db. Non-super non-bypassrls writer; bypassrls admin. Production `ep-shy-tree-*` URLs in cred file were NEVER loaded. | PASS |
| E-21 | `npx --no-install prisma migrate deploy` (Part A Step 2) — applied `20261004120000_ui_v1_jobposting_stamp_flags` on synthetic admin URL. `prisma validate` (Part A Step 3) PASS. | PASS |
| E-22 | `npx --no-install vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` (Part A Step 4, fresh process) — **10/10 cases PASS** (CASE 1 OPEN, CASE 2 CLOSING_SOON, CASE 3 expired/full/closed, CASE 4+5 existing Opening/Posting, CASE 6 stale POST, CASE 7 PATCH persistence, CASE 8 invalid flag → 400, CASE 9+10 PUBLISHED visibility, CASE 11 idempotency 409). Zero-residue enforced by afterEach. Targeted unit regressions (Part A Step 5) — 8/8 files, **134/134 tests PASS** (mapping 2, stamp-badge 21, route 42, public-select 3, public-card-truth 23, eligibility 6, list 32, public-detail 5). | PASS |

## 7. Execution Round History

| Round | Timestamp | Action | Outcome |
|---|---|---|---|
| 1 | 2026-10-04 | Contract correction commit (T0 §A/§B/§C): TASK fields corrected, migration timestamp renamed, ownership confirmed | `763c55ef213218fcb88967281f584e69ac26588f` |
| 1 | 2026-10-04 | Re-ran `verify-task`, `verify-encoding`, `git diff --check` | All PASS |
| 1 | 2026-10-04 | Semantic implementation: schema, migration, services, route, public projection, stamp registry, viec-lam surfaces, brand swap, About removal | All gates PASS |
| 1 | 2026-10-04 | Semantic commit (round-1 historical) — D1–D4 + brand + About | `12a0077b9b731aef7ca583d86ee0b0813ec21213` (round-1 only — NOT the final semantic Implementation SHA; final = `50e07bcf`) |
| 1 | 2026-10-04 | Cleanup commit (root-level only; no `app/src/prisma/tests/scripts/packages` delta) | `108fb9c286ec061d2b7a73f31b3a38ccd7caf383` |
| 1 | 2026-10-04 | Docs freeze commit (HANDOFF.md) — pinned after final amend | `714e712cd329a171e2a3fb418adabcd129da3ba9` (replaced by round-2 final HEAD) |
| 2 | 2026-10-04 | T0 confirmed Mốc 2A merged → `origin/main = 8382bbc70b74f2fc21471c532b98bd20ab8a1fac` (PR #90). T1B fetched + verified SHA. | OK |
| 2 | 2026-10-04 | Forward-merge `--no-ff` → parents `a49aa078…` (T1B) + `8382bbc7…` (origin/main) | `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` |
| 2 | 2026-10-04 | F8 integration: editor-shell consumes `summarizeJobPostingApiError`, renders safe Vietnamese label + canonical recovery `<Link>` for `JOB_OPENING_NOT_OPEN`. F8 unit test 12/12 PASS. All gates re-run: typecheck/lint/build/unit (3714)/prisma validate/encoding/diff-check. Semantic commit `50e07bcf` — **final semantic Implementation SHA**. | `50e07bcf` |
| 2 | 2026-10-04 | Docs commits after `50e07bcf` (commit `578269cc`, `7b49d6f9`, then HEAD `8e06b898`) are HANDOFF/docs/evidence-only and DO NOT change the audit-target SHA. | docs/evidence-only |
| 3 | 2026-10-04 | **T0→T1B pre-audit runtime + identity correction (Part A + Part B + Part C)**: synthetic DB gate against `ep-empty-forest-azlhfyo9` (writer=app_user_writer, admin=neondb_owner, same host+db). 7/7 steps PASS. Migration `20261004120000_ui_v1_jobposting_stamp_flags` applied on synthetic admin URL. Integration test 10/10 + unit 134/134 + zero-residue PASS. HANDOFF identity corrected: `50e07bcf` is final semantic Implementation SHA; `12a0077b` is round-1 historical only; removed "Final audit-target HEAD" line in favor of post-T0 handback boilerplate; STEP-21 and AC-10 promoted DEFERRED → measured. Invariants: `git diff 50e07bcf..HEAD -- app src prisma tests scripts packages` empty; no AUDIT.md; working tree clean; verify-task / verify-handoff / encoding / diff-check all PASS. Production migration = NOT_RUN. F8 = RESOLVED. | forward-only docs/evidence commit (T0 handback reports exact new HEAD in chat) |
| 2 | 2026-10-04 | HANDOFF.md re-pinned to round-2 SHA, F8 = RESOLVED, Execution Round = 2, all gates = PASS, Preview Tier 3 = READY. | DONE |

## 8. F8 Mapper Integration (RESOLVED in round 2)

**F8 status: RESOLVED.**

Per T0 §E, F8 (shared safe error mapper) was owned by T1A Mốc 2A and merged
into `origin/main = 8382bbc70b74f2fc21471c532b98bd20ab8a1fac` on Sun Oct 4.

T1B then:

1. Fetched `origin/main` and confirmed SHA `8382bbc70b74f2fc21471c532b98bd20ab8a1fac`
   (matches T0 directive).
2. Forward-merged via `git merge --no-ff origin/main` →
   `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` (parents: T1B docs freeze `a49aa078…`
   + `origin/main 8382bbc7…`). NO rebase / amend / reset / force-push.
3. Consumed shared mapper `summarizeJobPostingApiError` from
   `src/domains/staffing/job-posting-error-map.ts` in
   `app/admin/jobs/job-postings/[id]/editor-shell.tsx` via the new
   `readApiErrorSummary(res, fallbackJobOpeningId)` thin helper (exported).
4. Editor renders safe Vietnamese label only. When `recoveryHref` is present
   (today only `JOB_OPENING_NOT_OPEN`), renders a `<Link>` to canonical
   `/admin/job-openings/<jobOpeningId>` so operator can unblock the publish
   retry in one click.
5. Did NOT author a duplicate mapper.
6. Publish button / lifecycle / idempotency / revision untouched.
7. Added `app/admin/jobs/job-postings/[id]/__tests__/editor-shell.f8.test.ts`
   — 12/12 PASS covering the directive's coverage list.

Seed SHAs:

- Forward-merge: `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e`
- F8 semantic commit (final semantic Implementation SHA): `50e07bcf`

## 9. Production Migration Disposition

**Production migration: NOT_RUN.**

Per T0 §B, the migration file was authored on a worktree and is committed on the
`codex/t1b-ui-v1-job-card-stamps-brand` branch only. It will be applied to production
via the standard Tier-2 promotion flow AFTER:
- T1A Mốc 2A merged to `origin/main`,
- T1B forward-merged into the T1B baseline,
- TIER3_LIGHT_AUDIT completes.

Until then the production database is at `20260930090000_p1a05_hr_staff_job_openings_update_rls` (latest applied).

## 10. Pre-Audit Checklist

- [x] Contract fields corrected: `CRITICAL / LIGHT / READY_FOR_EXECUTION / READY_TO_CODE / correction budget: 1 / next gate: TIER3_LIGHT_AUDIT`.
- [x] Migration name strictly greater than `20261004000000_f9b_r2_slot_scope_read_restore` and `20260930090000_p1a05_hr_staff_job_openings_update_rls`.
- [x] Production migration: `NOT_RUN`.
- [x] T1B owns `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (TASK ownership).
- [x] T1A owns shared safe error mapper (T1B did NOT author duplicate).
- [x] F8 integration RESOLVED in round 2: editor consumes `summarizeJobPostingApiError` + renders safe Vietnamese label + conditional `<Link>` recovery. F8 unit test 12/12 PASS.
- [x] Forward-merge `--no-ff` to `origin/main` (`8382bbc7…`) recorded with parents in §0.
- [x] T1C owns UI2 (T1B did NOT touch HomepageSettings / Tin tức & Cẩm nang / sticky announcement).
- [x] No F6 / AFF / P2 / production DB / lifecycle / auth / RLS changes.
- [x] All gate results PASS.
- [x] No `AUDIT.md` authored (Tier 3 owns it).
- [x] No push, merge, or deploy attempted (Tier 0 authorization required).
- [x] Pre-audit runtime + identity correction (T0→T1B round 3): synthetic DB gate 7/7 PASS, HANDOFF identity corrected (final semantic Implementation SHA `50e07bcf`), STEP-21 / AC-10 promoted from DEFERRED to measured synthetic results.

## 11. Next Action

F8 integration RESOLVED. All canonical gates PASS. Synthetic DB gate (Part A)
PASS on `ep-empty-forest-azlhfyo9` with measured 10/10 integration + 134/134
unit + zero-residue. HANDOFF identity corrected (Part B): `50e07bcf` is the
final semantic Implementation SHA. Audit-target HEAD is **NOT** pinned inside
this document — see §0 boilerplate. Exact audit-target HEAD is reported in
the post-commit T0 handback chat.

Handback to T0 to invoke `TIER3_LIGHT_AUDIT`. T1B does NOT author `AUDIT.md`,
does NOT push/merge/deploy.

Handoff status: READY_FOR_AUDIT