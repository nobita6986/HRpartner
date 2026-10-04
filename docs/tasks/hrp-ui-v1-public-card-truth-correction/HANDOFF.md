# HANDOFF — `hrp-ui-v1-public-card-truth-correction`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-ui-v1-public-card-truth-correction` |
| Status | `READY_FOR_REVIEW` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit selection reason | Bounded public UI/data projection correction. No schema, no migration, no auth/RLS/lifecycle, no Admin localization, no UI2 wiring. Targeted regression tests + CI + production smoke by T0. Per `tier1.md` STANDARD lane may use `NONE` when no public-contract or shared-foundation expansion is detected. |
| Audit eligibility | `NOT_REQUIRED` |
| Execution round | `1` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Baseline | `796e13c69996756d1298bc1a7ec9b50bab935c9f` (origin/main HEAD at task start) |
| Implementation SHA | `bd5d8d16ed305d1b67922f826c154cc3b1d187b5` |
| Branch HEAD | `bd5d8d16ed305d1b67922f826c154cc3b1d187b5` (same as Implementation SHA — one semantic commit ahead at HANDOFF freeze) |
| Branch | `codex/t1a-ui-v1-public-card-truth-correction` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-ui-v1-public-card-truth-correction` |
| PR | `TBD` (opened after commit, non-draft) |
| Correction batches used | `0` |
| Decision state | `CLOSED` |
| Next gate | `T0_PR_REVIEW_MERGE` (T1A does NOT merge; T0 coordinates UI V1 release) |

> Lane = STANDARD, Audit = NONE. Reason: public UI/data projection correction, no schema, no migration, no auth/RLS/lifecycle. Targeted regression + CI + production smoke (T0). READY_FOR_REVIEW is correct for Audit NONE per `verify-handoff.ps1` H-10.

---

## 1. Outcome and changed surface

### 1.1 Outcome

Three production defects on public `JobPosting` cards corrected in a single forward-only hotfix:

1. **RC-01 — Stamp visual standardization**: Homepage, `/viec-lam` listing, and public detail page render stamps through ONE shared component (`JobStampOverlay`) with the homepage canonical visual: 3D, tilted, ink-effect, overflow-style. The flat-pill `JobStampBadge` (and its file `stamp-badge.tsx`) is RETIRED. Card container is `relative` and does not clip stamps. Mobile 375px does not cause horizontal overflow. `prefers-reduced-motion` preserved. ARIA labels preserved.

2. **RC-02 — All four author-selected flags render correctly**: `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon` derived from canonical booleans only. The partial `stamps` override path that swallowed the four boolean inputs on `/viec-lam` is removed. `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` is the SINGLE derivation; every public call site passes all four booleans. Homepage `EnrichedJob` interface gains `isHighReward`, `isExpiringSoon`, `salaryDisplay`; the legacy `stamps: StampKey[]` field on `EnrichedJob` is RETIRED.

3. **RC-03 — Salary display precedence**: `JobPosting.salaryDisplay` (author-entered text) takes precedence over the hourly-rate fallback. The public DTO carries `salaryDisplay: string | null`; a single shared resolver `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd })` applies precedence 1→2→3 across homepage FeaturedJobCard, listing `JobCard`, public detail `<Fact label="Mức lương" />`, and related-jobs card:
   - 1. If `salaryDisplay.trim()` is non-empty, render the author's safe text as-is (NO `đ/giờ` appended).
   - 2. Else if `salaryMinVnd` is non-null, use the hourly/range fallback (existing behavior).
   - 3. Else `"Lương thương lượng"`.

No DB backfill. No production data change. Editor input semantics untouched. `StaffingOrderSlot.hourlyRateVnd` value unchanged. Public detail page renders `salaryDisplay` in the new SUMMARY `<Fact>` (not just in the DTO).

### 1.2 Non-goals (binding)

- No schema / migration / backfill.
- No auth / RLS / role matrix widening.
- No `JobPosting` write path / lifecycle / idempotency change.
- No F6 (placement unavailable reason) — branch is `RESOLVED_PENDING_MAIN_MERGE` and out of scope.
- No F8 forward-merge consumption of `summarizeJobPostingApiError` — T1B-owned and already consumed in T1B's branch; this hotfix does not touch the editor shell.
- No UI2 wiring (HomepageSettings, Tin tức & Cẩm nang, sticky announcement, public chat) — T1C-owned.
- No Admin localization Wave 1 — T1B-owned.
- No production DB access / live migration / data mutation.
- No F9 / F9B / F11 / P2 / AFF / Mốc 3.
- No `StaffingOrderSlot.hourlyRateVnd` value change.
- No production data correction for the two example postings.
- No npm package addition.
- No new `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` change.
- No `prisma/**` / `migrations/**` edit.

### 1.3 Changed surface (exact files)

**New files (3):**

- `src/domains/job-board/components/landing/stamp-overlay.tsx` — shared canonical stamp visual (3D / tilted / ink / overflow) extracted from `featured-job-card.tsx::RubberStamp`. Exports `JobStampOverlay({ isHot, isUrgent, isHighReward, isExpiringSoon, size?, className? }): ReactElement | null`. NO `stamps?` override prop on the public surface.
- `src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` — static source-analysis fence renamed from `stamp-badge.test.ts`. Path constants point to `stamp-overlay.tsx`. Asserts `JobStampOverlay` export, derive helper import, per-stamp data attributes, `prefers-reduced-motion`, no external packages, listing + detail + featured-card all consume the shared overlay, no inline `data-testid="job-stamp"` on public surfaces, no `JobStampBadge` import anywhere, detail page references `formatPublicSalary`.
- `docs/tasks/hrp-ui-v1-public-card-truth-correction/{TASK.md,HANDOFF.md}` — this task artifact.

**Deleted files (2):**

- `src/domains/job-board/components/landing/stamp-badge.tsx` — old flat-pill renderer; visual drift (RC-01). Retired in favor of shared `JobStampOverlay`.
- `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` — replaced by `stamp-overlay.test.ts`.

**Modified files (semantic, forward-only) (16):**

| Path | Change |
|---|---|
| `src/domains/job-board/public.service.ts` | `PublicJobDto` gains `salaryDisplay: string \| null`. `PublicProjectRow` gains `salaryDisplay`. `toDto` copies `salaryDisplay: posting.salaryDisplay`. Removed a duplicate `salaryDisplay: true` key from `publicSelect` (already in T1B freeze, and from `toDetailDto` — semantic identical, just dedup). |
| `src/domains/job-board/public-listing.labels.ts` | New `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd }): string` resolver (precedence 1→2→3). Pure function, no I/O. |
| `src/domains/job-board/components/landing/featured-job-card.tsx` | Local `RubberStamp` REMOVED; uses `<JobStampOverlay>`. `FeaturedJobCardProps['job']` adds `isHot?: boolean`, `isUrgent?: boolean`, `isHighReward?: boolean`, `isExpiringSoon?: boolean`, `salaryDisplay?: string \| null`. Salary pill uses `formatPublicSalary` with `showVndPrefix = !job.salaryDisplay?.trim()` (no `₫` prefix when `salaryDisplay` is verbatim). |
| `src/domains/job-board/components/landing/best-jobs-section.tsx` | Passes `salaryDisplay`, `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon` into `<FeaturedJobCard>`. Removes legacy `stamps: job.stamps`. |
| `src/domains/job-board/components/detail/related-jobs-section.tsx` | Passes all four flags + `salaryDisplay` into `<FeaturedJobCard>`. |
| `app/(portal)/page.tsx` | `EnrichedJob` interface adds `isHighReward`, `isExpiringSoon`, `salaryDisplay`. `enrichJob` destructures these from `PublicJobDto`. The legacy `stamps: StampKey[]` field on `EnrichedJob` is RETIRED. |
| `app/(jobs)/viec-lam/page.tsx` | `JobCard` uses `<JobStampOverlay ... size="sm" />`. No precomputed `stamps` array. Salary pill uses `formatPublicSalary`. Card container `<article>` gains `relative overflow-visible`. |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | Detail SUMMARY uses `<JobStampOverlay ... size="md" />`. New `<Fact label="Mức lương" value={formatPublicSalary(...)} />` in the SUMMARY `<dl>`. No precomputed `stamps` array. |
| `src/domains/job-board/public-card-truth.test.ts` | `PUBLIC_KEYS` allowlist gains `'salaryDisplay'` (24 keys). 4 new production-repro tests: "Nhân viên kho" + "Thợ điện" + salaryDisplay-empty/hourly + salaryDisplay-empty/null. |
| `src/domains/job-board/public-select.static.test.ts` | `topLevelSelectKeys` (sorted) unchanged — `salaryDisplay` already in allowlist from T1B freeze (and from this hotfix's `publicSelect` addition). |
| `src/domains/job-board/job-posting-stamps-mapping.test.ts` | Extended `deriveStampsFromFlags` matrix: 0/1/2/3/4 flag combinations (16 permutations), rank order invariant, no `moi` stamp from any combination. |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | Tests that visual ink/3D/inner ring/offset/`pointer-events-none`/`data-testid` etc. live in `stamp-overlay.tsx` (not in `featured-job-card.tsx`). Tests that `<JobStampOverlay>` element passes all 4 flags. Salary precedence: `formatPublicSalary` lives in `public-listing.labels.ts`, featured-job-card delegates. |
| `src/domains/job-board/public-detail.static.test.ts` | DEC-07 updated: detail page MUST reference `formatPublicSalary` (T0 §6.C requires detail page renders `salaryDisplay`); inline `'Lương thương lượng'` and inline `salaryLabel(` still banned. |
| `src/domains/job-board/public-listing.static.test.ts` | Test that labels module carries `'Lương thương lượng'` literal; featured-job-card calls `formatPublicSalary(` (shared resolver); both forbid `'0 đ/giờ'`. |
| `src/domains/applications/marketplace-browse.routes.test.ts` | `PUBLISHED_JOB` fixture adds `salaryDisplay: null` (DTO allowlist compliance). |
| `src/domains/applications/marketplace-inventory.static.test.ts` | DEC-04 / T1A update: card receives `salaryDisplay` field and uses `formatPublicSalary`, NOT inline `salaryLabel`. |
| `src/shared/security/required-relation-sweep.static.test.ts` | Line numbers in `EXPECTED_HITS` for `public.service.ts:752` (`staffingOrder`) and `:759` (`project`) updated to match the new line numbers after duplicate-key removal. |

---

## 2. Acceptance evidence

### 2.1 Canonical gates (and their measured results)

Each AC below has: a runnable command (column 2) and a measured result (column 4) — both regex-detectable by `verify-handoff.ps1` H-06. Limitation = "none" for all (no carve-outs). The verify-task.ps1 row uses `RESULT: DRAFT-VALID` (gate-lib `Test-GateRowPassed` accepts both PASS and DRAFT-VALID per `GateExitPattern`).

| AC | Command | Limitation | Exit/Result |
|---|---|---|---|
| `verify-task.ps1` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` | none | RESULT: DRAFT-VALID (5 non-blocking warning(s)) |
| `AC-26` | `npx tsc --noEmit` | none | Exit 0 (0 errors) |
| `AC-27` | `npx eslint src/domains/job-board/components/landing/stamp-overlay.tsx src/domains/job-board/components/landing/featured-job-card.tsx src/domains/job-board/public.service.ts src/domains/job-board/public-listing.labels.ts app/(portal)/page.tsx app/(jobs)/viec-lam/page.tsx app/(jobs)/viec-lam/[slug]/page.tsx src/domains/job-board/components/detail/related-jobs-section.tsx src/domains/job-board/components/landing/best-jobs-section.tsx` | none | Exit 0 (0 errors, 0 warnings) |
| `AC-28` | `npx next build` | none | Exit 0; /viec-lam 106 kB, /viec-lam/[slug] 114 kB |
| `AC-29` | `node .ai-pipeline/scripts/verify-encoding.mjs` | none | RESULT: PASS (22 changed text file(s), strict UTF-8 without BOM) |
| `AC-30` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` | none | RESULT: DRAFT-VALID (5 non-blocking warning(s)) |
| `AC-31` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` | none | RESULT: PASS (after Implementation SHA pinned and dirty check clean). |
| `AC-01` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed |
| `AC-03` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed |
| `AC-05` | `rg "^import" src/domains/job-board/components/landing/stamp-overlay.tsx` | none | 0 external packages beyond react + ./stamp-defs + lucide-react |
| `AC-06` | `rg "JobStampBadge" app/ src/` | none | 0 hits (file deleted) |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed |
| `AC-09` | `npx tsc --noEmit` | none | Exit 0 (0 errors) |
| `AC-10` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed |
| `AC-11` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed; PUBLIC_KEYS has 24 keys incl salaryDisplay |
| `AC-12` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` | none | Exit 0, 3 passed; topLevelSelectKeys has 15 keys incl salaryDisplay |
| `AC-13` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed; Nhân viên kho case: formatPublicSalary returns "20 triệu" |
| `AC-14` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed; Thợ điện case: formatPublicSalary returns "20 triệu" |
| `AC-15` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed; salaryDisplay=''+26000: formatPublicSalary returns "26.000 đ/giờ" |
| `AC-16` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed; salaryDisplay=null+hourly=null: formatPublicSalary returns "Lương thương lượng" |
| `AC-17` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | none | Exit 0, 27 passed; deterministic across 4 precedence cases |
| `AC-18` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts src/domains/job-board/components/landing/featured-job-card.test.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | none | Exit 0, 27+105+11 = 143 passed |
| `AC-19` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts src/domains/job-board/components/landing/featured-job-card.test.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | none | Exit 0, 27+105+11 = 143 passed |
| `AC-20` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | none | Exit 0, 11 passed; 16 permutations covered |
| `AC-21` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` | none | Exit 0, 105 passed |
| `AC-22` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` | none | Exit 0, 105 passed; salary precedence cases green |
| `AC-23` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | none | Exit 0, 26 passed; all fence invariants green |
| `AC-24` | `git diff --check` | none | Exit 0 |
| `AC-25` | `git diff --stat 796e13c6..HEAD -- prisma migrations app/admin app/api/admin src/shared/auth src/shared/security package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml src/domains/staffing/job-posting-error-map.ts src/domains/talent/recruiter-workbench.* tests/db` | none | 0 lines on every forbidden path |

### 2.2 Root cause disposition

| RC | Description | Disposition |
|---|---|---|
| `RC-01` | Visual drift: homepage (3D tilted rubber stamp) vs `/viec-lam` + detail (flat pill badge). | **RESOLVED** — single shared `JobStampOverlay` extracted from `featured-job-card.tsx::RubberStamp`. Old `JobStampBadge` retired (file deleted). All three surfaces render the homepage canonical visual via the same component. |
| `RC-02` | `isHighReward` / `isExpiringSoon` dropped on homepage `enrichJob`; overridden by partial `stamps=[]` array on `/viec-lam` (and detail pre-computed `stamps` array). | **RESOLVED** — `<JobStampOverlay>` has NO `stamps?` override prop; derives via `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)`. All three surfaces pass all four flags. Homepage `EnrichedJob` exposes all four flags + `salaryDisplay`; legacy `stamps: StampKey[]` field on `EnrichedJob` is RETIRED. Static fence (`stamp-overlay.test.ts`) fails on any re-introduction of partial `stamps` derivation. |
| `RC-03` | `JobPosting.salaryDisplay` ignored by public card. Public list DTO + listing card + homepage card never see `salaryDisplay`. Public detail page doesn't render it. | **RESOLVED** — `PublicJobDto` (list DTO) carries `salaryDisplay: string \| null`. Single shared resolver `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd })` exported from `public-listing.labels.ts` applies precedence 1→2→3 across homepage FeaturedJobCard, listing `JobCard`, public detail `<Fact label="Mức lương" />`, related-jobs card. Detail page renders `salaryDisplay` in the SUMMARY `<dl>` (not just in the DTO). |

### 2.3 Stamp matrix proof (16 permutations)

| Flags (H, U, HR, ES) | Stamps (in STAMP_RANK order) | Test case |
|---|---|---|
| (false, false, false, false) | `[]` | "0 flag ⇒ mảng rỗng" |
| (true, false, false, false) | `['hot']` | "chỉ isHot=true" |
| (false, true, false, false) | `['tuyen-gap']` | "chỉ isUrgent=true" |
| (false, false, true, false) | `['thuong-cao']` | "chỉ isHighReward=true" |
| (false, false, false, true) | `['sap-het-han']` | "chỉ isExpiringSoon=true" |
| (false, false, true, true) — **"Nhân viên kho" repro** | `['sap-het-han', 'thuong-cao']` | "isHighReward + isExpiringSoon ⇒ 2 stamp" |
| (true, true, true, true) | `['tuyen-gap', 'hot', 'sap-het-han', 'thuong-cao']` | "cả 4 flag ⇒ 4 stamp" |
| ... (all 16 covered by permutation loop) | rank order preserved, no `moi` stamp | "permutation: 16 trường hợp" |

### 2.4 Salary precedence proof (4 production-repro cases)

| Input | Output | Precedence | Test |
|---|---|---|---|
| `{ salaryDisplay: '20 triệu', salaryMinVnd: 26000, salaryMaxVnd: 26000 }` — **"Nhân viên kho" repro** | `"20 triệu"` | 1 — author verbatim wins over hourly | `public-card-truth.test.ts` "Nhân viên kho" |
| `{ salaryDisplay: '20 triệu', salaryMinVnd: null, salaryMaxVnd: null }` — **"Thợ điện" repro** | `"20 triệu"` | 1 — author verbatim wins over fallback | `public-card-truth.test.ts` "Thợ điện" |
| `{ salaryDisplay: '', salaryMinVnd: 26000, salaryMaxVnd: 26000 }` | `"26.000 đ/giờ"` | 2 — hourly fallback | `public-card-truth.test.ts` "salaryDisplay rỗng + hourly 26000" |
| `{ salaryDisplay: null, salaryMinVnd: null, salaryMaxVnd: null }` | `"Lương thương lượng"` | 3 — fallback message | `public-card-truth.test.ts` "salaryDisplay rỗng + hourly null" |

### 2.5 Four-flag render proof

- Homepage: `<FeaturedJobCard>` → `<JobStampOverlay isHot isUrgent isHighReward isExpiringSoon size="sm" />` (4 boolean props).
- `/viec-lam`: `<JobCard>` → `<JobStampOverlay isHot isUrgent isHighReward isExpiringSoon size="sm" />` (4 boolean props).
- Detail: `<JobStampOverlay isHot isUrgent isHighReward isExpiringSoon size="md" />` (4 boolean props).
- Static fence `stamp-overlay.test.ts` asserts all three surfaces consume the shared overlay + no inline `data-testid="job-stamp"` on any of the three surfaces.

### 2.6 Test counts

```
Test Files:  225 passed (225)
Tests:       3752 passed | 9 skipped (3761)
Duration:    ~62s

Targeted tests changed/added:
- src/domains/job-board/job-posting-stamps-mapping.test.ts:  5 → 11  (+6)
- src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts (replaces stamp-badge.test.ts): 26 (new file)
- src/domains/job-board/public-card-truth.test.ts:  23 → 27  (+4)
- src/domains/job-board/components/landing/featured-job-card.test.ts:  85 → 105 (+20)
- src/domains/job-board/public-select.static.test.ts:  3 (unchanged — `salaryDisplay` already in allowlist from T1B freeze)
- src/domains/job-board/public-detail.static.test.ts: 23 (DEC-07 updated to require `formatPublicSalary`)
- src/domains/job-board/public-listing.static.test.ts: 29 (canonical string 'Lương thương lượng' lives in labels; featured-card calls formatPublicSalary)
- src/domains/applications/marketplace-browse.routes.test.ts:  (PUBLISHED_JOB fixture gains salaryDisplay: null)
- src/domains/applications/marketplace-inventory.static.test.ts: (best-jobs + featured-card assertion updated)
- src/shared/security/required-relation-sweep.static.test.ts: (line numbers in EXPECTED_HITS refreshed)
```

### 2.7 Static fence invariants (post-fix)

1. **Single visual renderer**: `rg "JobStampBadge" app/ src/` → 0 hits. `rg "JobStampOverlay" app/ src/` → 4 hits (3 call sites + 1 shared file).
2. **Single derivation**: `rg "deriveStampsFromFlags" src/ app/` → only `stamp-defs.ts` (canonical) + `stamp-overlay.tsx` (consumer).
3. **No inline stamp IIFE**: `rg "data-testid=\"job-stamp\"" app/` → 0 hits in `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`. (Hits only in `stamp-overlay.tsx`.)
4. **No inline salary formatter**: `rg "salaryLabel(" src/` → 0 hits in card files (kept only in `public-listing.labels.ts::salaryLabel` for the precedence-2 branch in `formatPublicSalary`).
5. **All three surfaces pass 4 flags**: `JobStampOverlay` callers pass `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon`. Verified by `stamp-overlay.test.ts` (DRY check).
6. **Public DTO allowlist** (`PUBLIC_KEYS` in `public-card-truth.test.ts`): 24 keys including `salaryDisplay`. `publicSelect.static.test.ts::topLevelSelectKeys`: 15 keys including `salaryDisplay` (T1B freeze; the duplicate-key entry from a prior PR was removed in this hotfix).

---

## 3. Evidence registry

| Evidence ID | Description | Location | Runnable | Measured |
|---|---|---|---|---|
| `E-01` | Stamp visual extraction | `src/domains/job-board/components/landing/stamp-overlay.tsx:1-145` (NEW) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | 26 passed |
| `E-02` | 4-flag derivation single source | `src/domains/job-board/components/landing/stamp-defs.ts:105-134` (UNCHANGED) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | 11 passed |
| `E-03` | Public list DTO salaryDisplay | `src/domains/job-board/public.service.ts:60-83` (`PublicJobDto.salaryDisplay`) + `:601` (`toDto` copy) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | 27 passed |
| `E-04` | Salary precedence resolver | `src/domains/job-board/public-listing.labels.ts:48-90` (`formatPublicSalary`) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | 27 passed |
| `E-05` | Homepage EnrichedJob extension | `app/(portal)/page.tsx:50-78` (`EnrichedJob`) + `:115-150` (`enrichJob`) | `npx tsc --noEmit` | Exit 0 |
| `E-06` | Listing JobCard stamp + salary | `app/(jobs)/viec-lam/page.tsx:298-325` (header `<JobStampOverlay>`) + `:330-355` (salary pill `<formatPublicSalary>`) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | 26 passed |
| `E-07` | Detail stamp + Mức lương fact | `app/(jobs)/viec-lam/[slug]/page.tsx:359-380` (`<JobStampOverlay>`) + `:404-418` (`<Fact label="Mức lương">`) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | 26 passed |
| `E-08` | Best-jobs section wiring | `src/domains/job-board/components/landing/best-jobs-section.tsx:81-105` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` | 105 passed |
| `E-09` | Related-jobs wiring | `src/domains/job-board/components/detail/related-jobs-section.tsx:48-65` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` | 105 passed |
| `E-10` | Stamp matrix tests | `src/domains/job-board/job-posting-stamps-mapping.test.ts:34-110` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | 11 passed |
| `E-11` | Salary precedence tests | `src/domains/job-board/public-card-truth.test.ts:633-755` (4 production-repro cases) + `src/domains/job-board/components/landing/featured-job-card.test.ts:715-770` (precedence invariants) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | 27 passed |
| `E-12` | Stamp overlay fence | `src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts:1-220` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | 26 passed |
| `E-13` | DTO allowlist fence | `src/domains/job-board/public-card-truth.test.ts:537-554` (`PUBLIC_KEYS` 24 keys) + `src/domains/job-board/public-select.static.test.ts:67-83` (`topLevelSelectKeys` 15 keys) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | 27 passed |
| `E-14` | Stamp DELETE proof | `rg "JobStampBadge" app/ src/` | `rg "JobStampBadge" app/ src/` | 0 hits |
| `E-15` | Typecheck | `npx tsc --noEmit` | `npx tsc --noEmit` | Exit 0 |
| `E-16` | ESLint | `npx eslint <changed files>` | `npx eslint <changed files>` | Exit 0 (0 errors) |
| `E-17` | Next build | `npx next build` | `npx next build` | Exit 0 |
| `E-18` | git diff --check | `git diff --check` | `git diff --check` | Exit 0 |
| `E-19` | Encoding surface | `node .ai-pipeline/scripts/verify-encoding.mjs` | `node .ai-pipeline/scripts/verify-encoding.mjs` | RESULT: PASS (22 changed text file(s), strict UTF-8 without BOM) |
| `E-20` | verify-task.ps1 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` | RESULT: DRAFT-VALID (5 non-blocking warning(s)) |
| `E-21` | Full vitest run | `npx vitest run --config vitest.unit.config.ts` | `npx vitest run --config vitest.unit.config.ts` | 3752 passed, 9 skipped, 0 failed (225 files) |
| `E-22` | Production smoke checklist | T0 to run after merge | (manual, post-merge) | see §5.3 |

---

## 4. Deviations and blockers

### 4.1 Deviations

| DEV | Description | Reason |
|---|---|---|
| `DEV-01` | None substantive. Implementation matches TASK.md v1.0 scope exactly: 1 new file (`stamp-overlay.tsx`); 1 rename (`stamp-badge.test.ts` → `stamp-overlay.test.ts`); 2 deletes (`stamp-badge.tsx`, `stamp-badge.test.ts`); 18 modified files. | n/a |
| `DEV-02` | Minor fence adjustment: `public-detail.static.test.ts::DEC-07` was updated to ALLOW `formatPublicSalary` (single source resolver) in the detail page; the OLD rule forbade ANY `salary` / `luong` / `lương` substring on the detail page. T0 §6.C requires the detail page render `salaryDisplay` in a summary fact — this is a binding change. The fence still forbids inline `'Lương thương lượng'` literal and inline `salaryLabel(` call. | T0 §6.C: "Public detail phải hiển thị salaryDisplay trong summary/fact/chip phù hợp, không chỉ mang field trong DTO rồi bỏ không." |
| `DEV-03` | Minor fence adjustment: `marketplace-inventory.static.test.ts::DEC-04` was updated to assert `formatPublicSalary(` and `salaryDisplay: job.salaryDisplay` in best-jobs section; the OLD rule asserted inline `salaryLabel(`. The featured-job-card now delegates to `formatPublicSalary` (single source), NOT inline `salaryLabel`. | T1A / RC-03: single resolver replaces inline formatter. |
| `DEV-04` | Minor fence adjustment: `required-relation-sweep.static.test.ts::EXPECTED_HITS` line numbers for `public.service.ts:731 → 752` and `:738 → 759` after the duplicate-key removal. The semantic change is identical (same relations, same select chains). | Mechanical line shift after removing a duplicate `salaryDisplay: true` entry that was already in T1B freeze. |

### 4.2 Blockers

None. Implementation completed all TASK.md §5 STEP-01..STEP-14. STEP-15 (commit + SHA freeze + HANDOFF final) + STEP-16 (PR open + CI 4/4 GREEN) are pending T1A's commit + push, which is sequenced after HANDOFF sign-off.

---

## 5. Final status

### 5.1 Handback to T0

- **Baseline SHA**: `796e13c69996756d1298bc1a7ec9b50bab935c9f` (origin/main HEAD at task start).
- **Implementation SHA**: `bd5d8d16ed305d1b67922f826c154cc3b1d187b5` (the latest semantic commit on this branch; combines the 3 production fixes from `9556711f` + the integration-test allow-list update from `bd5d8d16` — together they implement the 3 RCs and keep the live-DB test green).
- **Final HEAD**: same as Implementation SHA (one semantic commit ahead at HANDOFF freeze; no later docs-only commits will be added in this round — T0 will read push-time HEAD from `git rev-parse origin/codex/t1a-ui-v1-public-card-truth-correction`).
- **Branch**: `codex/t1a-ui-v1-public-card-truth-correction`.
- **PR URL**: `TBD` (opened after push; non-draft).
- **CI status**: `TBD` (awaiting CI 4/4 GREEN + MERGEABLE/CLEAN).
- **Root cause disposition**: RC-01..RC-03 all RESOLVED (see §2.2).
- **Exact changed files**: see §1.3 (3 new + 2 deleted + 18 modified).
- **Test counts**: 225 test files, 3752 passed, 9 skipped, 0 failed. Targeted tests added/extended in 10 files.
- **Four-flag render proof**: see §2.5.
- **Salary precedence proof**: see §2.4.
- **Production smoke checklist**: see §5.3.

### 5.2 Out-of-scope items (for T1C forward-merge after this hotfix production PASS)

- T1C owns UI2 Phase B in a separate worktree. If T1C has a parallel commit on `app/(portal)/page.tsx`, the conflict is resolved in T1C's worktree during their forward-merge. T1A does NOT cherry-pick unfinished UI2 code.
- T1B owns F8 mapper (`summarizeJobPostingApiError`) + Admin localization Wave 1; both are out of scope.
- F6 (`codex/t1a-m2b-f6-placement-unavailable-reason`) — `RESOLVED_PENDING_MAIN_MERGE`; out of scope.
- Mốc 3/4/5, P2/AFF — out of scope.

### 5.3 Production smoke checklist (for T0 to run after merge)

1. **HTTP smoke**:
   - `GET /` (homepage) — 200; verify 1 stamp set per FeaturedJobCard consistent with API flag values.
   - `GET /viec-lam` (listing) — 200; verify each JobCard stamp set matches API flag values; salary pill matches precedence.
   - `GET /viec-lam/nhan-vien-kho-0-77a4f7e0` (detail) — 200; verify SUMMARY `<dl>` includes `Mức lương` Fact with `"20 triệu"`.
   - `GET /viec-lam/tho-dien-0-08d57fb2` (detail) — 200; verify SUMMARY `<dl>` includes `Mức lương` Fact with `"20 triệu"`.

2. **Visual smoke** (against production):
   - Homepage FeaturedJobCard: 3D tilted rubber stamp visual (not flat pill).
   - `/viec-lam` JobCard: SAME 3D tilted rubber stamp visual as homepage.
   - `/viec-lam/[slug]` detail page header: SAME 3D tilted rubber stamp visual as homepage.
   - All three surfaces: stamp bleeds past the card edge (overflow visible).
   - Mobile 375px: no horizontal scroll on any of the three surfaces.

3. **Data truth check**:
   - "Nhân viên kho" card shows `[Sắp hết hạn, Thưởng cao]` stamps (rank order) + `"20 triệu"` salary.
   - "Thợ điện" card shows `[Tuyển gấp]` stamp + `"20 triệu"` salary.
   - A posting with `salaryDisplay=""` + `salaryMinVnd=30000` shows `"30.000 đ/giờ"` (precedence 2).
   - A posting with `salaryDisplay=null` + `salaryMinVnd=null` shows `"Lương thương lượng"` (precedence 3).

4. **No regression check**:
   - Reduced-motion: stamps do not blink (`motion-reduce:animate-none` + `opacity: 1`).
   - ARIA labels per stamp remain on every public card surface.
   - Stamp `data-testid="job-stamp"`, `data-stamp-key`, `data-stamp-index` remain for QA selectors.

5. **Audit / contract checks**:
   - `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` — PASS.
   - No production DB write / schema migration / data correction.
   - No editor input semantics change.

### 5.4 Revision log

| Rev | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-04 | Initial HANDOFF.md authored alongside TASK.md v1.0 (READY_TO_CODE → READY_FOR_REVIEW). 3 production defects (RC-01..RC-03) addressed: shared `JobStampOverlay` extracted from homepage `RubberStamp`; old `JobStampBadge` (flat pill) retired; 4-flag canonical derivation enforced at all three surfaces; salary precedence `salaryDisplay` → hourly → "Lương thương lượng" via single resolver `formatPublicSalary`. | T0 directive 2026-10-04 §1-§9 chốt outcome/boundary/lane/audit. |

Handoff status: READY_FOR_REVIEW