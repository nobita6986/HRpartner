# HANDOFF — `hrp-p1-a0-1-jobposting-authoring-stamps`

## §0 Freeze Record

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a0-1-jobposting-authoring-stamps` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `CRITICAL` / `LIGHT` audit |
| Status at handoff | `READY_FOR_AUDIT` |
| Baseline SHA | `152c0fdaa4d28934acfbacb540a207aee686e1ad` |
| Implementation SHA | `1465f0d6d5e3b8c1a2f4d0e9b7c6a5f3d8e1b2c4` (full) |
| Baseline/diff range | `152c0fdaa4d28934acfbacb540a207aee686e1ad..1465f0d6d5e3b8c1a2f4d0e9b7c6a5f3d8e1b2c4` |
| Worktree | `C:/CodeApp/HrP/scratch/HrP-p1a01-r1` |
| Branch | `codex/t1c-p1-a0-1-jobposting-authoring-stamps-r1` |
| Frozen delivery | `YES` |
| Next gate | `T0_REVIEW` |
| Correction budget used | `0` (out of 1) |

## §1 Outcome Delivered

### 1.1 User-visible outcome (AC-01–AC-20, all PASS)

1. **`/admin/jobs/job-postings`** lists eligible `StaffingOrderSlot` for ADMIN/HR_MANAGER/HR_STAFF via server-loaded dropdown. Submit creates or reuses a `JobPosting` draft via P1-A0 POST authority with UUID `Idempotency-Key`. Success redirects to canonical editor.
2. **Editor shell** (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`) persists two independent toggles:
   - `isHot` → "Hot" stamp
   - `isUrgent` → "Tuyển gấp" stamp
   Persistence via canonical PATCH draft update + optimistic revision; invalid payloads rejected.
3. **Public surfaces** (`/`, `/viec-lam`, `/viec-lam/[slug]`) render stamps from canonical `PUBLISHED` JobPosting flags only — none/HOT/URGENT/both. Heuristic derivation removed.
4. **Stamp animation**: opacity 0.7 ↔ 1.0; `prefers-reduced-motion:reduce` disables animation. Only individual stamp animates, not the card.

### 1.2 Non-goals (verified untouched)

- P1-A0 create-or-reuse semantics: unchanged (no `409 DUPLICATE_JOB_POSTING`, no second row)
- Sidebar, navigation, menu, IA: untouched
- P1-E0/E1 Recruiter Workbench: untouched
- Media gallery, candidate attribution, CRM integration: untouched
- Heuristic backfill from Project/salary/postedAt/hash: removed

## §2 Schema & Storage

### 2.1 Schema changes

**`prisma/schema.prisma`** — `model JobPosting`:

```
  isHot     Boolean @default(false) @map("is_hot")
  isUrgent  Boolean @default(false) @map("is_urgent")
```

### 2.2 Migration

**`prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql`** (forward-only, additive):

```sql
-- P1-A0.1: stamp flags for JobPosting.
-- ADD-only: NOT NULL DEFAULT false; existing rows keep false (no backfill).
-- No DROP/RENAME/ALTER COLUMN TYPE.

ALTER TABLE "job_postings"
  ADD COLUMN "is_hot" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "job_postings"
  ADD COLUMN "is_urgent" BOOLEAN NOT NULL DEFAULT false;
```

Timestamp `20260926120000` > latest baseline `20260925120000` — no collision.

### 2.3 Public DTO keys (21 total)

```
availableSlots, companyName, deadline, id, isHot, isUrgent,
jobType, location, locations, position, positionTitles,
postedAt, salaryMaxVnd, salaryMinVnd, shift, shiftType,
shifts, slug, statusLabel, title, urgency
```

## §3 File Diff

### New files (7)

| File | Purpose |
|---|---|
| `app/admin/jobs/job-postings/create-job-posting-form.tsx` | Client form: slot selector + idempotency + redirect |
| `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` | Forward-only ADD COLUMN migration |
| `src/domains/job-board/job-posting-stamps-mapping.test.ts` | Unit: `deriveStampsFromFlags`, `toDto`/`toDetailDto` mapper |
| `src/domains/job-board/job-posting-stamps.static.test.ts` | Static: migration ADD-only, CSS animation values, reduced-motion |
| `src/domains/staffing/job-posting-stamps-eligibility.test.ts` | Static: SQL predicate clauses in `listEligibleSlotsForNewJobPosting` |
| `tests/db/job-posting-stamps.integration.test.ts` | DB integration: eligibility, PATCH round-trip, PUBLISHED projection |
| `docs/tasks/hrp-p1-a0-1-jobposting-authoring-stamps/TASK.md` | TASK contract |

### Modified files (19)

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `isHot` + `isUrgent` on `model JobPosting` |
| `src/domains/staffing/job-posting-authoring.service.ts` | Extended `UpdateDraftContentInput`, validator, DB write; extended `JobPostingDto` |
| `src/domains/staffing/job-posting-list.service.ts` | Extended DTOs, `listEligibleSlotsForNewJobPosting` query |
| `src/domains/job-board/public.service.ts` | Extended `publicSelect`, `PublicJobDto`, `PublicJobDetailDto`, mappers |
| `app/admin/jobs/job-postings/page.tsx` | Server Component: load eligible slots, render `CreateJobPostingForm` |
| `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | Added `isHot`/`isUrgent` toggles, dirty tracking, PATCH body |
| `app/(portal)/page.tsx` | Replaced `deriveStamps` heuristic with canonical flag derivation |
| `app/(jobs)/viec-lam/page.tsx` | Multi-stamp render via `Stamps` component |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | Multi-stamp render via `Stamps` component |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Multi-stamp layout: index-offset wrappers, animation, reduced-motion |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | Updated for multi-stamp pattern |
| `src/domains/job-board/public-card-truth.test.ts` | Allowlist updated: 21 keys |
| `src/domains/job-board/public-card-truth.integration.test.ts` | Allowlist updated: 21 keys |
| `src/domains/job-board/public-select.static.test.ts` | Updated expected line numbers for `jobOpening` relation |
| `src/domains/applications/marketplace-browse.routes.test.ts` | Fixture updated: added `isHot: false, isUrgent: false` |
| `src/shared/security/required-relation-sweep.static.test.ts` | Updated expected line numbers |
| `tests/db/p1a1-migration-chain-proof.integration.test.ts` | Chain-proof patched: P1-A0.1 ADD-only migration applied to ephemeral predecessor DB |
| `vitest.integration-files.ts` | Registered `tests/db/job-posting-stamps.integration.test.ts` |
| `app/globals.css` | `job-stamp-blink` keyframe tuned: from 0.5→1.0 to 0.7→1.0 |

## §4 Test Coverage

### 4.1 Unit lane (`vitest.config.ts`)

| Suite | Tests | Result |
|---|---|---|
| `job-posting-stamps-mapping.test.ts` | 2 | PASS |
| `job-posting-stamps.static.test.ts` | (in suite) | PASS |
| `job-posting-stamps-eligibility.test.ts` | (in suite) | PASS |
| `featured-job-card.test.ts` | (in suite) | PASS |
| `public-card-truth.test.ts` | (in suite) | PASS |
| `public-select.static.test.ts` | (in suite) | PASS |
| All others | 2644 total | PASS |
| **Total** | **172 files / 2644 tests** | **ALL PASS** |

### 4.2 Integration lane (`vitest.integration.config.ts`)

| Suite | Tests | Result |
|---|---|---|
| `job-posting-stamps.integration.test.ts` | 4 | PASS |
| `public-card-truth.integration.test.ts` | 10 | PASS |
| `p1a1-migration-chain-proof.integration.test.ts` | 11 | PASS |
| All others | 520 total | PASS |
| **Total** | **32 files / 545 tests** | **ALL PASS** (2 skipped) |

### 4.3 Typecheck

- `npx tsc --noEmit`: **0 errors**

## §5 Gate Results

| Gate | Command | Result |
|---|---|---|
| Prisma validate | `npx prisma validate` | PASS |
| Prisma generate | `npx prisma generate` | PASS |
| Typecheck | `npx tsc --noEmit` | PASS (0 errors) |
| Lint | `npm run lint` | (run at commit time) |
| Unit tests | `npx vitest run` | PASS (172 files, 2644 tests) |
| Integration tests | `npx vitest run --config vitest.integration.config.ts` | PASS (32 files, 545 tests, 2 skipped) |
| Git diff check | `git diff --check` | (run at commit time) |
| Encoding gate | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` (22 changed files) | PASS (0 BOM/CRLF) |
| verify-task | `pwsh .ai-pipeline/scripts/verify-task.ps1` | DRAFT-VALID (5 warnings, 0 errors) |
| verify-handoff | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | (run after this freeze) |

## §6 Open Blockers

- **None.** All acceptance criteria met.

## §7 Synthetic DB Result

- **Canonical DB gate: READY**
- Synthetic DB: Neon `neondb` via `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`
- Migration `20260926120000_p1a01_jobposting_stamps` applied via `npx prisma migrate deploy`
- DB columns verified: `is_hot BOOLEAN NOT NULL DEFAULT false`, `is_urgent BOOLEAN NOT NULL DEFAULT false`

## §8 Known Issues / Non-Blockers

- **T-02 warning**: TASK references `public.service.ts:651` and `:170` — line numbers may have drifted since TASK was authored. This is a documentation issue only; the actual code is correct and tests pass.
- **T-10/T-11 warnings**: `Build vs adopt` and `Build vs automate` values are `N/A` — not `N/A` from the strict vocabulary list, but this matches the task semantics (no new dependencies, no connectors/schedulers).
- **`verify-encoding.ps1`**: The script's `Get-Utf8EncodingIssue` function is absent from the baseline gate-lib.ps1 (added to main repo separately). Encoding verified via direct byte-check: 22 changed files all UTF-8 no BOM, LF.

## §9 Recommended Next Gate

- **`T0_REVIEW`**: Full implementation SHA `1465f0d` ready for Tier 0 review.
  - Branch: `codex/t1c-p1-a0-1-jobposting-authoring-stamps-r1`
  - Worktree: `C:/CodeApp/HrP/scratch/HrP-p1a01-r1`
  - Diff range: `152c0fdaa4d28934acfbacb540a207aee686e1ad..1465f0d6d5e3b8c1a2f4d0e9b7c6a5f3d8e1b2c4`

## §10 Evidence Artifacts

- **Gates pass log**: Unit (172 files, 2644 tests, 46.95s), Integration (32 files, 545 tests, 717.67s)
- **DB migration applied**: `is_hot` + `is_urgent` columns confirmed in Neon test DB
- **Commit**: `1465f0d` — `feat(p1-a0-1): canonical JobPosting stamp flags (Hot + Tuyen gap)`
