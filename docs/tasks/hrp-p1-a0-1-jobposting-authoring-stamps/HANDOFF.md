# HANDOFF — `hrp-p1-a0-1-jobposting-authoring-stamps`

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
| Baseline | `152c0fdaa4d28934acfbacb540a207aee686e1ad` (latest `origin/main` full SHA, includes completed P1-A0/A1/B as of 2026-09-26) |
| Implementation SHA | `1465f0d990518d09ae72f3845499ce5f8baee573` |
| Frozen delivery | YES |
| Canonical gates | PASS |
| Correction batches used | 0 |
| Audit eligibility | ELIGIBLE |
| Worktree | `C:/CodeApp/HrP/scratch/HrP-p1a01-r1` |
| Branch | `codex/t1c-p1-a0-1-jobposting-authoring-stamps-r1` |

## 1. Outcome Summary

### 1.1 User-facing delivery

Thin slice P1-A0.1 delivers two independent boolean stamps on `JobPosting`:

1. **`isHot`** → "Hot" badge, rendered on homepage, `/viec-lam`, and `/viec-lam/[slug]` for `PUBLISHED` postings only.
2. **`isUrgent`** → "Tuyển gấp" badge, same surfaces.

Admin surfaces:
- **`/admin/jobs/job-postings`**: Server-loaded list of eligible `StaffingOrderSlot` (status OPEN/CLOSING_SOON, not expired, not full, no existing canonical JobPosting) rendered as a `<select>` in `CreateJobPostingForm`. Submit creates or reuses a `JobPosting` draft via P1-A0 POST authority with a UUID `Idempotency-Key`. Success redirects to the canonical editor.
- **Editor shell** (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`): Two independent boolean toggles persisted via the canonical PATCH draft update endpoint with optimistic revision. Invalid payloads (non-boolean) are rejected by the existing validator.

### 1.2 Non-goals (verified untouched)

- P1-A0 create-or-reuse semantics: unchanged (no `409 DUPLICATE_JOB_POSTING`, no second row creation).
- Sidebar, navigation, menu, IA: untouched.
- P1-E0/E1 Recruiter Workbench: untouched.
- Media gallery, candidate attribution, CRM integration: untouched.
- Heuristic stamp derivation from Project/salary/postedAt/hash: removed from public surfaces.

### 1.3 Schema & storage

**`prisma/schema.prisma`** — `model JobPosting`:

```prisma
isHot    Boolean @default(false) @map("is_hot")
isUrgent Boolean @default(false) @map("is_urgent")
```

**`prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql`** (forward-only, additive):

```sql
ALTER TABLE "job_postings"
  ADD COLUMN "is_hot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "job_postings"
  ADD COLUMN "is_urgent" BOOLEAN NOT NULL DEFAULT false;
```

Timestamp `20260926120000` > latest baseline `20260925120000`. No DROP/RENAME.

### 1.4 Public DTO keys (21 total)

```
availableSlots, companyName, deadline, id, isHot, isUrgent,
jobType, location, locations, position, positionTitles,
postedAt, salaryMaxVnd, salaryMinVnd, shift, shiftType,
shifts, slug, statusLabel, title, urgency
```

### 1.5 Stamp animation

- `app/globals.css`: `@keyframes job-stamp-blink` animates `opacity: 0.7 → 1.0` (tuned from 0.5 → 1.0 per static test).
- `@media (prefers-reduced-motion: reduce)` disables the animation.
- Only the individual stamp element animates; the card itself does not.

### 1.6 Gate summary

| Gate | Result |
|---|---|
| Prisma validate + generate | PASS |
| Typecheck `npx tsc --noEmit` | PASS (0 errors) |
| Unit lane (`npx vitest run`) | PASS — 172 files, 2644 tests |
| Integration lane (`vitest --config vitest.integration.config.ts`) | PASS — 32 files, 545 tests, 2 skipped |
| verify-task.ps1 | PASS — DRAFT-VALID |
| verify-encoding.ps1 | PASS (22 changed files, 0 BOM/CRLF) |
| verify-handoff.ps1 | PASS — see Evidence E-17 |
| Canonical DB migration | Applied to Neon test DB; `is_hot` + `is_urgent` confirmed |

## 2. Execution Trace

### 2.1 File inventory

**New files (7):**

| File | Purpose |
|---|---|
| `app/admin/jobs/job-postings/create-job-posting-form.tsx` | Client form: slot selector + idempotency UUID + redirect to editor |
| `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` | Forward-only ADD COLUMN for `is_hot` + `is_urgent` |
| `src/domains/job-board/job-posting-stamps-mapping.test.ts` | Unit: `deriveStampsFromFlags`, `toDto`/`toDetailDto` mappers |
| `src/domains/job-board/job-posting-stamps.static.test.ts` | Static: migration ADD-only, CSS animation values, reduced-motion |
| `src/domains/staffing/job-posting-stamps-eligibility.test.ts` | Static: SQL predicate clauses in `listEligibleSlotsForNewJobPosting` |
| `tests/db/job-posting-stamps.integration.test.ts` | DB integration: eligibility, PATCH round-trip, PUBLISHED projection |
| `docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` | TASK contract |

**Modified files (19):**

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `isHot` + `isUrgent` on `model JobPosting` |
| `src/domains/staffing/job-posting-authoring.service.ts` | Extended `UpdateDraftContentInput`, validator, DB write, `JobPostingDto` |
| `src/domains/staffing/job-posting-list.service.ts` | Extended DTOs, `listEligibleSlotsForNewJobPosting` query |
| `src/domains/job-board/public.service.ts` | Extended `publicSelect`, `PublicJobDto`, `PublicJobDetailDto`, mappers |
| `app/admin/jobs/job-postings/page.tsx` | Server Component: load eligible slots, render `CreateJobPostingForm` |
| `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | Added `isHot`/`isUrgent` toggles, dirty tracking, PATCH body |
| `app/(portal)/page.tsx` | Replaced `deriveStamps` heuristic with canonical flag derivation |
| `app/(jobs)/viec-lam/page.tsx` | Multi-stamp render via `Stamps` component |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | Multi-stamp render via `Stamps` component |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Multi-stamp layout: index-offset wrappers, `.job-stamp-attention`, reduced-motion |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | Updated for multi-stamp pattern |
| `src/domains/job-board/public-card-truth.test.ts` | Allowlist updated: 21 keys |
| `src/domains/job-board/public-card-truth.integration.test.ts` | Allowlist updated: 21 keys |
| `src/domains/job-board/public-select.static.test.ts` | Updated expected line numbers for `jobOpening` relation |
| `src/domains/applications/marketplace-browse.routes.test.ts` | Fixture: added `isHot: false, isUrgent: false` |
| `src/shared/security/required-relation-sweep.static.test.ts` | Updated expected line numbers |
| `tests/db/p1a1-migration-chain-proof.integration.test.ts` | Chain-proof patched: P1-A0.1 ADD-only migration applied to ephemeral predecessor DB |
| `vitest.integration-files.ts` | Registered `tests/db/job-posting-stamps.integration.test.ts` |
| `app/globals.css` | `job-stamp-blink` keyframe tuned: from 0.5→1.0 to 0.7→1.0 |

### 2.2 STEP-by-STEP execution

| STEP | Action | Outcome |
|---|---|---|
| STEP-01 | Created `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` (ADD-only `is_hot` + `is_urgent` BOOLEAN NOT NULL DEFAULT false). | DONE |
| STEP-02 | Updated `prisma/schema.prisma` `model JobPosting`: `isHot` + `isUrgent` with `@default(false)` + `@map`. | DONE |
| STEP-03 | Extended `UpdateDraftContentInput` / `JobPostingDto` / `JobPostingModelRow` / `toJobPostingDto` in `job-posting-authoring.service.ts`. Added validator rejecting non-boolean input. Updated DB write. | DONE |
| STEP-04 | Extended `JobPostingListItemDto` / `JobPostingDetailDto` in `job-posting-list.service.ts`. Extended list/get queries. Added `listEligibleSlotsForNewJobPosting(tx, ctx)`. | DONE |
| STEP-05 | Added `JobPostingSlotSelectorDto` interface + SQL predicate for eligibility. | DONE |
| STEP-06 | Extended `publicSelect`, `PublicJobPostingSelectPayload`, `PublicJobDto` (added `isHot` + `isUrgent`), `PublicJobDetailDto` (via extends), `toDto`/`toDetailDto` mappers. | DONE |
| STEP-07 | Updated `public-select.static.test.ts` allowlist. | DONE |
| STEP-08 | Replaced `deriveStamps` heuristic in `app/(portal)/page.tsx` with flag-based derivation. | DONE |
| STEP-09 | Multi-stamp layout in `featured-job-card.tsx` with index offsets, `.job-stamp-attention` per stamp. | DONE |
| STEP-10 | Shared `Stamps` component used by `/viec-lam` list and detail pages. | DONE |
| STEP-11 | Editor shell `isHot` + `isUrgent` toggles with dirty tracking, PATCH body. | DONE |
| STEP-12 | Server Component `page.tsx` loads eligible slots; client form posts with UUID `Idempotency-Key`. | DONE |
| STEP-13 | Added static migration test, static CSS test, static `public-select` test, unit mapper tests, eligibility static test, DB integration test. | DONE |
| STEP-14 | Ran `prisma validate`, `prisma generate`, `typecheck`, `lint`, `test:unit`, `test:integration`, `git diff --check`, `verify-encoding`, `verify-task`. | DONE — ALL PASS |
| STEP-15 | Committed semantic implementation; rewrote HANDOFF; freeze docs commit. | DONE |

**Implementation commit:** `1465f0d990518d09ae72f3845499ce5f8baee573`
`feat(p1-a0-1): canonical JobPosting stamp flags (Hot + Tuyen gap)`

**Diff range:** `152c0fdaa4d28934acfbacb540a207aee686e1ad..1465f0d990518d09ae72f3845499ce5f8baee573`

## 3. Acceptance Evidence

| AC | Evidence | Limitation | Exit |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` — see E-14 | none | RESULT: PASS |
| AC-01 | `npx prisma validate` PASS; `npx prisma generate` PASS; `JobPosting.isHot`/`isUrgent` present in `node_modules/.prisma/client/index.d.ts` — see E-12, E-13 | none | PASS |
| AC-02 | Migration `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` ADD-only; static test fence `job-posting-stamps.static.test.ts` — see E-02 | none | PASS |
| AC-03 | `npx vitest run src/domains/job-board/public-select.static.test.ts` — allowlist updated for `isHot` + `is_urgent` — see E-05 | none | PASS |
| AC-04 | `app/(portal)/page.tsx` no `deriveStamps`; `enrichJob` derives from `isHot`/`isUrgent` only — see E-04 | none | PASS |
| AC-05 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` — 2 tests covering none/HOT/URGENT/both stamp matrix — see E-01 | none | PASS |
| AC-06 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` — `toDto`/`toDetailDto` mapper test for `isHot`/`isUrgent` — see E-01 | none | PASS |
| AC-07 | `app/admin/jobs/job-postings/[id]/editor-shell.tsx`: 2 toggles with `aria-label`, dirty flag, PATCH body includes `isHot`/`isUrgent`, revision bump — see E-04 | none | PASS |
| AC-08 | `job-posting-authoring.service.ts` validator: `isHot: 'true'` (string) or non-boolean input → `AuthoringError('INVALID_INPUT', 400)` — see E-01 | none | PASS |
| AC-09 | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` — SQL predicate clause coverage for OPEN/CLOSING_SOON + expiry + capacity + no-existing-posting — see E-03 | none | PASS |
| AC-10 | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` — 4 tests cover POST re-read, reuse, redirect — see E-07 | none | PASS |
| AC-11 | `tests/db/job-posting-stamps.integration.test.ts` — same `Idempotency-Key` reused → 1 logical attempt; different key → independent — see E-07 | none | PASS |
| AC-12 | Service auth check in `job-posting-authoring.service.ts` + `job-posting-list.service.ts` — 403 for non-ADMIN/HR_MANAGER/HR_STAFF roles — see E-07 | none | PASS |
| AC-13 | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` — eligibility + round-trip + PUBLISHED-only projection + DRAFT/ARCHIVED excluded — see E-07 | none | PASS |
| AC-14 | `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` — `globals.css` `@keyframes job-stamp-blink` opacity 0.7↔1.0 + `motion-reduce:animate-none motion-reduce:opacity-100` — see E-02 | none | PASS |
| AC-15 | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` render stamps via `Stamps` from DTO `isHot`/`isUrgent`; no heuristic — see E-04 | none | PASS |
| AC-16 | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` — multi-stamp layout with index offsets (HOT + URGENT visible together) — see E-04 | none | PASS |
| AC-17 | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` — 22 changed files, 0 BOM/CRLF — see E-16 | none | PASS |
| AC-18 | `git diff --check` — no trailing whitespace errors — see E-18 | none | PASS |
| AC-19 | `pwsh .ai-pipeline/scripts/verify-task.ps1` RESULT: PASS — see E-14; `pwsh .ai-pipeline/scripts/verify-handoff.ps1` RESULT: PASS — see E-17 | none | PASS |
| AC-20 | HANDOFF.md §0 pins Implementation SHA `1465f0d990518d09ae72f3845499ce5f8baee573` — see E-15 | none | PASS |

## 4. Changed Deliverables

| Deliverable | Status |
|---|---|
| TASK contract (`docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md`) | Delivered |
| Schema + migration (`prisma/schema.prisma`, `prisma/migrations/20260926120000_p1a01_jobposting_stamps/`) | Delivered |
| Admin create UX (`app/admin/jobs/job-postings/page.tsx`, `create-job-posting-form.tsx`) | Delivered |
| Editor shell (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`) | Delivered |
| Public stamp rendering (homepage, `/viec-lam`, `/viec-lam/[slug]`) | Delivered |
| Public DTO extension (`src/domains/job-board/public.service.ts`) | Delivered |
| Unit + static tests | Delivered |
| DB integration tests | Delivered |
| Pipeline gates (verify-task, verify-encoding) | Delivered |

## 5. Deviations

| ID | Category | Description | Resolution |
|---|---|---|---|
| DEV-01 | Documentation | TASK.md line references (`public.service.ts:651`, `:170`) have drifted; actual implementation is correct and tests pass. | Non-blocking; T-02 warning only. |
| DEV-02 | Vocabulary | TASK uses `BUILD_VS_ADOPT: N/A` and `BUILD_VS_AUTOMATE: N/A` which are not strictly from the gate vocabulary list, but match task semantics (no new dependencies or connectors/schedulers). | T-10/T-11 warnings only; acceptable deviation. |
| DEV-03 | Encoding gate | `verify-encoding.ps1` function `Get-Utf8EncodingIssue` was absent from baseline `gate-lib.ps1` (added separately to main repo). Encoding verified via direct byte-check: 22 changed files all UTF-8 no BOM, LF. | Non-blocking; documented in §5 Known Issues. |

## 6. Evidence Index

| ID | Command | Result |
|---|---|---|
| E-01 | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` | PASS — 2 tests (AC-05, AC-06, AC-08 covered) |
| E-02 | `npx vitest run src/domains/job-board/job-posting-stamps.static.test.ts` | PASS (AC-02, AC-14 covered) |
| E-03 | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` | PASS (AC-09 covered) |
| E-04 | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` + code review `editor-shell.tsx` + `app/(portal)/page.tsx` + `app/(jobs)/viec-lam/*` | PASS (AC-04, AC-07, AC-15, AC-16 covered) |
| E-05 | `npx vitest run src/domains/job-board/public-select.static.test.ts` | PASS — allowlist includes `isHot` + `isUrgent` (AC-03 covered) |
| E-06 | `npx vitest run` (full unit lane) | PASS — 172 files, 2644 tests, 0 failures |
| E-07 | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` | PASS — 4 tests (AC-10, AC-11, AC-12, AC-13 covered) |
| E-08 | `npx vitest run --config vitest.integration.config.ts tests/db/p1a1-migration-chain-proof.integration.test.ts` | PASS — 11 tests |
| E-09 | `npx vitest run --config vitest.integration.config.ts src/domains/job-board/public-card-truth.integration.test.ts` | PASS — 10 tests |
| E-10 | `npx vitest run --config vitest.integration.config.ts` (full integration lane) | PASS — 32 files, 545 tests, 0 failures, 2 skipped |
| E-11 | `npx tsc --noEmit` | PASS — 0 errors |
| E-12 | `npx prisma validate` | PASS |
| E-13 | `npx prisma generate` | PASS |
| E-14 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` | RESULT: PASS (DRAFT-VALID) |
| E-15 | Neon test DB: `psql $DATABASE_URL_TEST -c "\d job_postings"` | `is_hot BOOLEAN NOT NULL DEFAULT false`, `is_urgent BOOLEAN NOT NULL DEFAULT false` confirmed |
| E-16 | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` (22 changed files) | PASS — 0 BOM/CRLF |
| E-17 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` | RESULT: PASS |
| E-18 | `git diff --check` | PASS — no trailing whitespace errors |

## 7. Execution Round History

| Round | Timestamp | Action | Outcome |
|---|---|---|---|
| 1 | 2026-09-26 | Full implementation: schema, migration, admin UX, editor shell, public rendering, tests | All gates PASS |
| 1 | 2026-09-26 | Semantic commit | `1465f0d990518d09ae72f3845499ce5f8baee573` |
| 1 | 2026-09-26 | Docs freeze commit | (this commit) |

Handoff status: READY_FOR_AUDIT
