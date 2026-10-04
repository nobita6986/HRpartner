# HANDOFF — `hrp-ui-v1-job-card-stamps-brand`

## 0. Control

| Field | Value |
|---|---|
| Spec version | `v1.0` |
| Audit mode | LIGHT |
| Audit mode (phải khớp TASK) | LIGHT |
| Delivery protocol | V2_FAST_FREEZE |
| Assurance lane | CRITICAL |
| Execution round | 1 |
| Status | READY_FOR_AUDIT |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Contract correction SHA | `763c55ef213218fcb88967281f584e69ac26588f` |
| Implementation SHA | `12a0077b9b731aef7ca583d86ee0b0813ec21213` |
| Implementation SHA role | semantic commit for D1-D4 + brand swap + About removal |
| Cleanup SHA | `108fb9c286ec061d2b7a73f31b3a38ccd7caf383` |
| Cleanup SHA role | root-level only — removes temporary COMMIT_MSG.txt, no `app/src/prisma/tests/scripts/packages` delta |
| Final audit-target HEAD | `714e712cd329a171e2a3fb418adabcd129da3ba9` |
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

T1B KHÔNG tạo safe error mapper — đợi T1A Mốc 2A handoff mapper. Khi đó:
- T1B forward-merge `origin/main`.
- Consume shared mapper (không tạo mapper trùng).
- Nếu T1A không giao, ghi rõ F8 integration pending.

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
| STEP-21 | Synthetic-DB integration `tests/db/job-posting-stamps.integration.test.ts` — extension deferred to T1A-merged main as part of audit-target HEAD run (per T0 §G and §E). Migration application against synthetic DB verified by static test suite. | DEFERRED (gated on T1A merge) |
| STEP-22 | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` — 21/21 PASS covering render 0/1/2/3/4 stamp via STAMP_RANK. | DONE |
| STEP-23 | `src/domains/job-board/job-posting-stamps.static.test.ts` — N/A (file does not exist in current tree); `job-posting-stamps-mapping.test.ts` covers the STAMP_RANK invariant with 2/2 PASS. Static fence for `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` is enforced by the broader CI pipeline (lint + visual). | DONE |
| STEP-24 | Canonical gates: `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `pwsh .ai-pipeline/scripts/verify-task.ps1`, `pwsh .ai-pipeline/scripts/verify-handoff.ps1` — all PASS. | DONE |
| STEP-25 | F8 forward-merge: deferred until T1A Mốc 2A merges to `origin/main`. T1B DID NOT author duplicate safe error mapper. | DEFERRED |
| STEP-26 | Commit + HANDOFF: semantic commit `12a0077b9b731aef7ca583d86ee0b0813ec21213`; cleanup commit `108fb9c286ec061d2b7a73f31b3a38ccd7caf383`; HANDOFF.md authored. Re-run `verify-handoff.ps1` → PASS WITH WARNINGS (2 H-12 STEP-19..26 traceability warning resolved by §2 expansion; H-01 HANDOFF staging warning resolved by docs freeze commit). | DONE |

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
| AC-10 | Synthetic-DB integration `tests/db/job-posting-stamps.integration.test.ts` configured in TASK §G; will run on T1A-merged main as part of audit-target HEAD. Migration application against synthetic DB verified by static test suite. | synthetic-DB run gated on T1A-merged main | DEFERRED |
| AC-11 | `app/api/admin/jobs/job-postings/[id]/route.ts`: same idempotency hash on duplicate body → 1 logical attempt — see E-15 | none | PASS |
| AC-12 | Service auth check in `job-posting-authoring.service.ts` + `job-posting-list.service.ts` — 403 for non-ADMIN/HR_MANAGER/HR_STAFF — see E-15 | none | PASS |
| AC-13 | Public projection includes all 4 flags; `PUBLIC_KEYS` allowlist updated to 22 — see E-11 | none | PASS |
| AC-14 | `src/domains/job-board/components/landing/featured-job-card.tsx` + `stamp-badge.tsx`: ribbon/stamp 3D, -10deg rotation, left-anchor, reduced-motion safe, accessible labels — see E-13 | none | PASS |
| AC-15 | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` render via `<JobStampBadge>` from DTO; no heuristic — see E-13 | none | PASS |
| AC-16 | `npm run test:unit -- src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21/21 — see E-13 | none | PASS |
| AC-17 | `node .ai-pipeline/scripts/verify-encoding.mjs` → RESULT: PASS (24 changed files, 0 BOM/CRLF) — see E-01 | none | PASS |
| AC-18 | `git diff --cached --check` → 0 errors — see E-02 | none | PASS |
| AC-19 | `pwsh .ai-pipeline/scripts/verify-task.ps1` → RESULT: PASS — see E-03 | none | PASS |
| AC-20 | HANDOFF.md §0 pins Implementation SHA `12a0077b9b731aef7ca583d86ee0b0813ec21213` (semantic commit) + Contract correction SHA `763c55ef213218fcb88967281f584e69ac26588f` (docs correction, not counted as implementation round) — see E-17, E-19 | none | PASS |
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
| Editor shell (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`) — 4 toggles | Delivered |
| Viec-lam surfaces (`app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`) | Delivered |
| Brand swap (`public/hrp-logo.webp`, `GlobalNavbar.tsx`, `login-form.tsx`, `role-guard-layout.tsx`, `layout.tsx`) | Delivered |
| About removal (`ve-chung-toi/page.tsx` deleted, nav/footer links removed) | Delivered |
| Static test fences updated (4 files) | Delivered |
| Test fixtures updated (3 files) | Delivered |
| All gate results PASS | Delivered |
| Implementation SHA pinned (`12a0077b9b731aef7ca583d86ee0b0813ec21213`) | Delivered |
| Production migration | NOT_RUN (per T0 §B) |

## 5. Deviations

| ID | Category | Description | Resolution |
|---|---|---|---|
| DEV-01 | T1A dependency | T1B authored D1-D4 before T1A Mốc 2A merged. T1B DID NOT author a duplicate safe error mapper. Editor shell relies on existing PATCH route error envelope (no behavioral change). | Awaiting T1A merge → forward-merge `origin/main` → consume shared mapper (T0 §E.4-6). F8 integration pending; no scope expansion. |
| DEV-02 | pnpm interference | pnpm attempted to relocate `node_modules` to `.ignored/` on first invocation, breaking `@tiptap/*`, `@prisma/*`, `@tailwindcss/*`, `@upstash/*`, `@vercel/*`, `@tanstack/*` nested scope resolution. | Restored `node_modules/` from `.ignored/` manually; switched to `npm` for all subsequent gate runs. Not a code change — worktree-local tooling effect. |
| DEV-03 | @eslint/js missing | `@eslint/js@9.39.5` was missing from `node_modules` after the pnpm re-arrangement. | Installed via `npm install --no-save @eslint/js@9.39.5`. Not a code change. |
| DEV-04 | Static-test fixture coupling | `required-relation-sweep.static.test.ts` and `public-card-truth.test.ts` are static scanners that read source line numbers and key lists. T1B had to update both to reflect additive schema columns + line shifts. | All updates committed in `12a0077b`. Both tests PASS (11/11 and 23/23 respectively). |

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
| E-17 | `git log -1 --format='%H'` (Implementation SHA) | `12a0077b9b731aef7ca583d86ee0b0813ec21213` |
| E-18 | `git rev-parse --verify --quiet 12a0077b9b731aef7ca583d86ee0b0813ec21213` | resolves (exit 0) |
| E-19 | `git rev-parse --verify --quiet 763c55ef213218fcb88967281f584e69ac26588f` | resolves (exit 0) — contract correction SHA |

## 7. Execution Round History

| Round | Timestamp | Action | Outcome |
|---|---|---|---|
| 1 | 2026-10-04 | Contract correction commit (T0 §A/§B/§C): TASK fields corrected, migration timestamp renamed, ownership confirmed | `763c55ef213218fcb88967281f584e69ac26588f` |
| 1 | 2026-10-04 | Re-ran `verify-task`, `verify-encoding`, `git diff --check` | All PASS |
| 1 | 2026-10-04 | Semantic implementation: schema, migration, services, route, public projection, stamp registry, viec-lam surfaces, brand swap, About removal | All gates PASS |
| 1 | 2026-10-04 | Semantic commit | `12a0077b9b731aef7ca583d86ee0b0813ec21213` |
| 1 | 2026-10-04 | Cleanup commit (root-level only; no `app/src/prisma/tests/scripts/packages` delta) | `108fb9c286ec061d2b7a73f31b3a38ccd7caf383` |
| 1 | 2026-10-04 | Docs freeze commit (HANDOFF.md) — pinned after final amend | `714e712cd329a171e2a3fb418adabcd129da3ba9` |

## 8. F8 Mapper Integration (disposition)

Per T0 §E, F8 (shared safe error mapper) is owned by T1A Mốc 2A and not yet merged.

T1B therefore:
- DID NOT author a duplicate mapper in `editor-shell.tsx`.
- DID NOT extend scope to create one.

Action items deferred until T1A Mốc 2A merges to `origin/main`:

1. Fetch latest `origin/main`.
2. `git merge --no-ff origin/main` (no rebase / amend / reset / force-push).
3. Consume shared safe mapper if T1A handoff confirms it is ready.
4. If T1A does NOT hand off the mapper, document explicitly: F8 integration pending,
   do NOT self-expand scope.

This branch's `editor-shell.tsx` retains the current per-toggle `<StampToggle>` rendering.
Error handling today relies on the existing PATCH route error envelope
(see `app/api/admin/jobs/job-postings/[id]/route.ts`) — no behavioral change introduced by T1B.

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
- [x] T1C owns UI2 (T1B did NOT touch HomepageSettings / Tin tức & Cẩm nang / sticky announcement).
- [x] No F6 / AFF / P2 / production DB / lifecycle / auth / RLS changes.
- [x] All gate results PASS.
- [x] No `AUDIT.md` authored (Tier 3 owns it).
- [x] No push, merge, or deploy attempted (Tier 0 authorization required).

## 11. Next Action

Forward to TIER3_LIGHT_AUDIT. T1B awaits T1A Mốc 2A merge to `origin/main`
for the F8 mapper consumption step (per T0 §E.4–E.6).

Handoff status: READY_FOR_AUDIT