# TASK — `hrp-ui-v1-public-card-truth-correction`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-ui-v1-public-card-truth-correction` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Bounded public UI/data projection correction. No schema, no migration, no auth/RLS/lifecycle, no Admin localization, no UI2 wiring. Targeted regression tests + CI + production smoke by T0. Per `tier1.md` STANDARD lane may use `NONE` when no public-contract or shared-foundation expansion is detected. |
| Status | `READY_TO_CODE` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Baseline | `796e13c69996756d1298bc1a7ec9b50bab935c9f` (`origin/main` HEAD at task start) |
| Implementation SHA | `TBD` (set in HANDOFF after freeze) |
| Branch HEAD | `TBD` (reported in post-commit T0 handback) |
| Branch | `codex/t1a-ui-v1-public-card-truth-correction` |
| PR | `TBD` (opened after implementation, non-draft) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-ui-v1-public-card-truth-correction` |
| Test environment | `READY` (Vitest unit lane; integration requires synthetic DB → CI integration; local ENV_BLOCKED if no DB) |
| Correction budget | `1` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| In-scope roots | `src/domains/job-board/public.service.ts`; `src/domains/job-board/components/landing/stamp-defs.ts`; `src/domains/job-board/components/landing/stamp-badge.tsx`; `src/domains/job-board/components/landing/featured-job-card.tsx`; `src/domains/job-board/public-types.ts`; `src/domains/job-board/public-listing.labels.ts`; `app/(portal)/page.tsx`; `app/(jobs)/viec-lam/page.tsx`; `app/(jobs)/viec-lam/[slug]/page.tsx`; targeted unit/static/regression tests of public cards (no F6, no F8 mapper, no M2A artifacts); `docs/tasks/hrp-ui-v1-public-card-truth-correction/{TASK.md,HANDOFF.md}` |
| Forbidden paths | `prisma/**`; `migrations/**`; `app/admin/jobs/job-postings/**` (T1B-owned, F8 mapper); `app/api/admin/**`; `src/shared/auth/**`; `src/shared/security/**`; `app/(portal)/home/**` (T1C UI2 Phase B-owned, M2A HANDOFF §6); `package.json`; `package-lock.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `src/domains/staffing/job-posting-error-map.ts` (T1A M2A F8 mapper — consumed read-only); `src/domains/talent/recruiter-workbench.*` (F6, RESOLVED_PENDING_MAIN_MERGE); `docs/tasks/hrp-ui-v1-job-card-stamps-brand/**`; `app/components/GlobalNavbar.tsx`; `app/components/GlobalFooter.tsx`; `app/(portal)/ve-chung-toi/**` (already deleted by T1B); `docs/PLANNER_HANDOVER.md`; `docs/important/**`; **F6 (placement unavailable reason), F8 forward-merge, F9/F9B/F11, P2/AFF, Mốc 2A HANDOFF, Mốc 3, Admin localization Wave 1, M2B-related audit decisions**. Production DB / live migrations. `vercel.json`; `next.config.*`; `tsconfig.json`; `tests/db/**` (synthetic DB is out of scope; CI integration covers the gate). |
| Required gates | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts`; `npm run typecheck`; `npx eslint <changed files>`; `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` (canonical gate on F6-owned changed text surface — exit 0); `node .ai-pipeline/scripts/verify-encoding-range.mjs 796e13c6 HEAD` (**SUPERSEDED_TOOL_LIMITATION / NON_CANONICAL**: range scanner exits 2 on binary `public/hrp-logo.webp` from prior PR — same scanner gap as F6; canonical gate is `verify-encoding.mjs` on this task's F6-owned surface); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` |
| Correction batches used | `0` |
| Next gate | `T0_PR_REVIEW_MERGE` (T0 coordinates with UI V1, reviews PR, merges after CI 4/4 — T1A does NOT merge; sequencing: F6 → PR #94 → PR #95 → UI2 Phase B production PASS → T0 final latest-main reconciliation → merge F6; this hotfix is independent and ships first because RC-01..RC-03 affect public truth) |

> Lane = STANDARD, Audit = NONE. Reason: public UI/data projection correction, no schema, no migration, no auth/RLS/lifecycle. Targeted regression + CI + production smoke (T0).

## 1. Outcome

### 1.1 User-visible outcome

Three production defects on public `JobPosting` cards are corrected in a single forward-only hotfix:

1. **Stamp visual standardization (RC-01)**: Homepage, `/viec-lam`, and public detail page render stamps through ONE shared component (`JobStampOverlay`) with the homepage canonical visual: 3D, tilted, ink-effect, overflow-style. No flat pill renderer remains on any public card. Card container is `relative` and does not clip stamps. Mobile 375px does not cause horizontal overflow. `prefers-reduced-motion` preserved. ARIA labels preserved.

2. **All four author-selected flags render correctly (RC-02)**: `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon` derived from canonical booleans only. The partial `stamps` override path that swallowed the four boolean inputs on `/viec-lam` is removed. `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` is the SINGLE derivation; every public call site passes all four booleans.

3. **Salary display precedence (RC-03)**: `JobPosting.salaryDisplay` (author-entered text) takes precedence over the hourly-rate fallback. The public DTO carries `salaryDisplay: string | null`; a single shared resolver applies the precedence 1→2→3 across homepage, listing, detail, and related jobs:
   - 1. If `salaryDisplay.trim()` is non-empty, render the author's safe text as-is (NO `đ/giờ` appended).
   - 2. Else if `salaryMinVnd` is non-null, use the hourly/range fallback (existing behavior).
   - 3. Else `"Lương thương lượng"`.

   No DB backfill. No production data change. Editor input semantics untouched. Hourly fallback for postings without `salaryDisplay` is preserved. Public detail page renders `salaryDisplay` in the appropriate summary/fact/chip area (not just in the DTO).

### 1.2 Non-goals

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

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public.service.ts:580-588` (`toDto`) and `:670-684` (`toDetailDto`) — current mappers copy `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon` to DTO; the existing `PublicJobDto` already exposes all four flags. | All four booleans are already on the public DTO; only the **call sites** drop `isHighReward` / `isExpiringSoon` and the **renderers** use a partial `stamps` override. |
| `EV-02` | `app/(portal)/page.tsx:85-103` — `enrichJob` destructures only `{ salaryMinVnd, salaryMaxVnd, urgency, postedAt, companyName, isHot, isUrgent }`; line 99 `stamps: deriveStampsFromFlags(isHot, isUrgent)` — drops `isHighReward`/`isExpiringSoon`. | Homepage `EnrichedJob` strips the two new flags before reaching `<FeaturedJobCard>`. |
| `EV-03` | `app/(jobs)/viec-lam/page.tsx:295-326` — listing `JobCard` derives `const stamps = deriveStampsFromFlags(job.isHot, job.isUrgent);` (line 295) then passes BOTH the partial `stamps` array and the four flags into `<JobStampBadge>`. Inside `JobStampBadge` (line 67-72 of `stamp-badge.tsx`), the partial `stamps` array wins: `keys = stamps ?? deriveStampsFromFlags(...)`. | Pre-computed `stamps` (which only contains `tuyen-gap`/`hot`) overrides the four-flag derivation. Result: `isHighReward` and `isExpiringSoon` never render on `/viec-lam`. |
| `EV-04` | `app/(jobs)/viec-lam/[slug]/page.tsx:362-376` — detail passes both the four flags AND `stamps={deriveStampsFromFlags(...)}` (line 365-373) into `<JobStampBadge>`. | Same RC-02 root cause on detail. Detail page does pass all 4 flags to the badge, but the partial `stamps` array wins → result is wrong. |
| `EV-05` | `src/domains/job-board/components/landing/featured-job-card.tsx:31-35` — `FeaturedJobCardProps['job']` already carries `isHighReward?` and `isExpiringSoon?` (T1B RQ-07); line 195-204 derives via `deriveStampsFromFlags(4 flag)` correctly. But `salaryLabel(job.salaryMinVnd, job.salaryMaxVnd)` (line 38-43) only uses hourly rate, no `salaryDisplay`. | Homepage `FeaturedJobCard` derives stamps correctly (4 flag); but the homepage `EnrichedJob` (`page.tsx:85-103`) drops the flags. Salary side never reads `salaryDisplay`. |
| `EV-06` | `src/domains/job-board/public.service.ts:33-65` — `PublicJobDto` has `salaryMinVnd`/`salaryMaxVnd`; lines 575-577 mapper writes `...headline` (which contains `salaryMinVnd`/`salaryMaxVnd`/`urgency`/`postedAt`). `salaryDisplay` exists on `PublicJobPostingSelectPayload` (line 333) and `toDetailDto` (line 671 copies to `PublicJobDetailDto.salaryDisplay`). | `salaryDisplay` is on the SELECT and on `PublicJobDetailDto`, but NOT on `PublicJobDto` (the list DTO) — list / homepage / `JobCard` cannot see it. |
| `EV-07` | `src/domains/job-board/public-listing.labels.ts:42-48` — `salaryLabel(min, max)` only takes hourly; returns `"Lương thương lượng"` when `min === null`. | Single salary formatter used by listing & detail; no `salaryDisplay` precedence. |
| `EV-08` | `src/domains/job-board/components/landing/stamp-defs.ts:105-134` — `deriveStampsFromFlags(isHot, isUrgent, isHighReward=false, isExpiringSoon=false)` is the canonical 4-flag derivation. `STAMP_RANK` orders 0..4 (tuyen-gap < hot < sap-het-han < thuong-cao < moi). | Canonical helper already accepts 4 flags; call sites just need to call it with all 4. |
| `EV-09` | `src/domains/job-board/components/landing/stamp-badge.tsx:39-58` — `JobStampBadgeProps` already has `isHighReward: boolean` + `isExpiringSoon: boolean`; line 67-72 `keys = stamps ?? deriveStampsFromFlags(...)`. | Component supports 4 flags; the `stamps` override must be removed to fix RC-02. |
| `EV-10` | `app/(jobs)/viec-lam/[slug]/page.tsx:355-410` — detail SUMMARY section renders `Chip`s for location/shift/jobType, but never `salaryDisplay`. Rich text sections (summary, benefits, requirements, application steps) are rendered by `RichTextSection` (lines 500-535). | Detail page does not surface `salaryDisplay`; even after adding it to `PublicJobDto`, the page must render it in a fact/chip area. |
| `EV-11` | `app/(jobs)/viec-lam/page.tsx:347-358` — listing `JobCard` renders `<p className="..."><span aria-hidden="true">₫</span><span>{salaryLabel(job.salaryMinVnd, job.salaryMaxVnd)}</span></p>`. | Listing already has the salary pill; replace `salaryLabel` with the new precedence-aware resolver. |
| `EV-12` | `src/domains/job-board/public.service.ts:18-19` and `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` (referenced indirectly via T1B TASK §0 audit) — `salaryDisplay` already exists on `JobPosting` and on `PublicJobDetailDto`; it is a "rich text" string entered by the author via the editor. | Source-of-truth: `JobPosting.salaryDisplay` is already in the DB. RC-03 is purely a projection/display bug, not a schema gap. |
| `EV-13` | `src/domains/job-board/components/landing/featured-job-card.tsx:71-152` — `RubberStamp` (3D, tilted, ink, overflow) is the homepage canonical visual. | Canonical stamp visual per RC-01. |
| `EV-14` | `src/domains/job-board/components/landing/stamp-badge.tsx:75-105` — current `JobStampBadge` is flat pill (line 75: `inline-flex items-center gap-1 rounded-full`); visual drift. | Per RC-01, this flat pill renderer must be retired in favor of a single shared visual. |
| `EV-15` | `app/globals.css:668-680` — `.job-stamp-attention` + `@keyframes job-stamp-blink` 0.7↔1.0 + reduced-motion support preserved since T1B. | Existing CSS handles 3D animation + reduced-motion. No CSS change needed if we use the homepage `RubberStamp` style for all three surfaces. |
| `EV-16` | `src/domains/job-board/components/landing/featured-job-card.tsx:11-31` — `FeaturedJobCardProps['job']` accepts `salaryMinVnd`/`salaryMaxVnd`; homepage does NOT pass `salaryDisplay` because `EnrichedJob` does not expose it. | Homepage must extend `EnrichedJob` to include `salaryDisplay` (already on `PublicJobDto` from this fix). |
| `EV-17` | `app/(jobs)/viec-lam/page.tsx:285-300` (JobCard props) and `app/(jobs)/viec-lam/[slug]/page.tsx:345-380` — both pages already pass 4 flags into `<JobStampBadge>`; only the partial `stamps` override and homepage `EnrichedJob` are broken. | Two of three surfaces (listing + detail) have the data ready; only RC-02 (override) and homepage RC-03 (no `salaryDisplay`) block correct rendering. |
| `EV-18` | T0 directive §4 — production evidence for the two failing postings. | Production data already in the DB; this fix only changes projection/display. No data backfill needed. |
| `EV-19` | T0 directive §5 — three confirmed root causes: RC-01 visual drift, RC-02 flag dropping, RC-03 salaryDisplay ignored. | RC-01..RC-03 are the binding diagnosis; this task implements the fix. |
| `EV-20` | T0 directive §1, §6 — T1A owns `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-types.ts`, `src/domains/job-board/public-listing.labels.ts`, `src/domains/job-board/components/landing/**` (stamp/card). | Ownership list. T1C owns UI2; T1B owns F8 mapper; T1A does not modify T1C/T1B scope. |
| `EV-21` | T0 directive §8 — T1C owns UI2 Phase B in separate worktree; T1A does NOT wait for T1C; if T1C has touched `app/(portal)/page.tsx`, that's resolved after; T1A does not cherry-pick. | Coordination: hotfix ships independently of T1C. |
| `EV-22` | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` — static source-analysis fence that locks C-05 (single source of truth). | Fence covers listing/detail/featured cards; tests must be extended for the new shared overlay. |
| `EV-23` | `src/domains/job-board/public-card-truth.test.ts:540-555` — `PUBLIC_KEYS` allowlist is the static fence for list DTO; today 23 keys including `isExpiringSoon`/`isHighReward`. | Adding `salaryDisplay` to list DTO requires updating this allowlist (RV-1 of AC-12 below). |
| `EV-24` | `src/domains/job-board/public-select.static.test.ts:67-83` — `topLevelSelectKeys` allowlist (14 keys including `isExpiringSoon`/`isHighReward`); adding `salaryDisplay` to SELECT requires updating the fence. | Adding `salaryDisplay` to `publicSelect` requires updating this allowlist. |
| `EV-25` | `vitest.unit.config.ts` — unit lane forces unreachable `DATABASE_URL=postgresql://blocked:...@127.0.0.1:1/blocked`; integration tests under `tests/db/**` are excluded. | Local integration test is `ENV_BLOCKED`; CI runs integration. Local gates are unit + static + integration-fence-aware tests. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Single shared stamp component `JobStampOverlay` extracted from `featured-job-card.tsx::RubberStamp` (the canonical 3D/tilted/ink/overflow visual) into a new file `src/domains/job-board/components/landing/stamp-overlay.tsx`. Homepage, `/viec-lam`, and `/viec-lam/[slug]` all consume this overlay. `JobStampBadge` (flat pill) is retired. `RubberStamp` (homepage-local) is replaced by the shared overlay's per-stamp rendering. | `CHOSEN` |
| `DEC-02` | `JobStampOverlay` receives `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon` and derives via `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)`. NO `stamps?` override prop. Per-stamp wrapper is `relative` so the overlay container (`<article>` / `<header>`) does not clip; overlay uses `position: absolute` with negative offset to bleed past the card edge. `motion-reduce:animate-none motion-reduce:opacity-100` preserved on the per-stamp wrapper. | `CHOSEN` |
| `DEC-03` | Card container `<article>` / `<header>` for the three public surfaces is `relative`; outer wrappers of the public cards remove `overflow-hidden` if present (the `featured-job-card` already removed it per T1B §3.1). Mobile 375px does not horizontal-overflow because stamp position uses `-top-2 -left-2` (8px) + index offset, all within the existing canvas. | `CHOSEN` |
| `DEC-04` | ARIA label per stamp preserved (from `STAMPS[stampKey].ariaLabel`); `data-testid="job-stamp"`, `data-stamp-key`, `data-stamp-index` preserved; `prefers-reduced-motion` preserved via `motion-reduce:animate-none motion-reduce:opacity-100`. | `CHOSEN` |
| `DEC-05` | The OLD `JobStampBadge` (flat pill) is RETIRED. After the migration, no public call site imports `JobStampBadge`. The old `JobStampBadge` file is removed; tests referencing it are updated to `JobStampOverlay` source-analysis (or retired if their invariant is now enforced by the new fence). | `CHOSEN` |
| `DEC-06` | All three public surfaces pass ALL FOUR flags into `JobStampOverlay`. The `stamps?` override prop is REMOVED from the public stamp component (no service-layer override path on public card surfaces). | `CHOSEN` |
| `DEC-07` | Homepage `EnrichedJob` extends to include `isHighReward: boolean`, `isExpiringSoon: boolean`, `salaryDisplay: string | null`. `enrichJob` destructures all 4 flags + `salaryDisplay` from `PublicJobDto`. The `stamps` field on `EnrichedJob` is RETIRED (it was the partial 2-flag derivation that broke RC-02). | `CHOSEN` |
| `DEC-08` | `PublicJobDto` (list DTO) gains `salaryDisplay: string | null`. `toDto` mapper copies it from `posting.salaryDisplay` (already in `PublicJobPostingSelectPayload`). `publicSelect` adds `salaryDisplay: true`. `PUBLIC_KEYS` allowlist in `public-card-truth.test.ts` and `topLevelSelectKeys` allowlist in `public-select.static.test.ts` are updated. | `CHOSEN` |
| `DEC-09` | Single shared salary resolver `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd })` exported from `src/domains/job-board/public-listing.labels.ts`. Returns a plain string. Replaces `salaryLabel` for public surfaces. Used by: `JobCard` (listing), `FeaturedJobCard` (homepage), detail page fact/chip, related-jobs (if any). | `CHOSEN` |
| `DEC-10` | Resolver precedence (1→2→3): (1) `salaryDisplay.trim()` non-empty → render trimmed value as-is; (2) else `salaryMinVnd !== null` → existing hourly/range `"30.000 đ/giờ"` / `"30.000 – 50.000 đ/giờ"`; (3) else `"Lương thương lượng"`. The "as-is" rule for `salaryDisplay` is byte-exact trim + plain text — NO `đ/giờ` appended, NO HTML injection (React render plain text). | `CHOSEN` |
| `DEC-11` | Public detail page renders `salaryDisplay` in the SUMMARY section as a new `<Fact label="Mức lương" value={formatPublicSalary(...)} />` (or equivalent chip). If the value is `"Lương thương lượng"`, the fact still renders — not hidden — because the operator can communicate that. | `CHOSEN` |
| `DEC-12` | No `StaffingOrderSlot.hourlyRateVnd` value change. No DB backfill. No production data correction. Editor input semantics untouched (`salaryDisplay` continues to be a free-text field on `JobPosting`). | `CHOSEN` |
| `DEC-13` | `JobStampOverlay` does NOT depend on `lib/utils` or any new package. Implementation reuses existing `lucide-react` icons, `app/globals.css` keyframes, and `STAMPS` registry from `stamp-defs.ts`. No new dependency. | `CHOSEN` |
| `DEC-14` | Targeted unit tests: extend `job-posting-stamps-mapping.test.ts` (5-key STAMP_RANK invariant is unchanged), `public-card-truth.test.ts` (PUBLIC_KEYS gains `salaryDisplay`; 2 new "reproduces production case" cases: "Nhân viên kho" + "Thợ điện"; 2 precedence cases: salaryDisplay-empty + hourly-only, salaryDisplay-empty + hourly-null), `public-select.static.test.ts` (topLevelSelectKeys gains `salaryDisplay`), `stamp-badge.test.ts` becomes `stamp-overlay.test.ts` (same fence targets, file paths updated). `featured-job-card.test.ts` is extended to assert 4-flag derivation is honored when job has `isHighReward`/`isExpiringSoon`. | `CHOSEN` |
| `DEC-15` | `Build vs Adopt = N/A`. No new package, no new shared framework. `Build vs Automate = N/A`. No connector / scheduler / multi-system workflow. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Shared stamp visual (3D / tilted / overflow) | `src/domains/job-board/components/landing/featured-job-card.tsx::RubberStamp` (T1B, 3D art direction) | `N/A` (reuse + extract) | n/a | n/a | `src/domains/job-board/components/landing/stamp-overlay.tsx` (NEW shared module) | T1B §3.1 already established that the homepage art direction is canonical. The fix extracts it into a shared module rather than authoring a new package. |
| Stamp registry / rank / derivation | `src/domains/job-board/components/landing/stamp-defs.ts` (T1B) | `N/A` (reuse) | n/a | n/a | n/a | `STAMPS`, `STAMP_KEYS`, `STAMP_RANK`, `deriveStampsFromFlags` already canonical 4-flag. |
| CSS keyframe (3D ink animation) | `app/globals.css:668-680` `.job-stamp-attention` + `@keyframes job-stamp-blink` (T1B freeze) | `N/A` (reuse) | n/a | n/a | n/a | Already correct 0.7↔1.0 + `motion-reduce:animate-none`. |
| Salary formatter | `src/domains/job-board/public-listing.labels.ts::salaryLabel` (existing) | `N/A` (extend) | n/a | n/a | `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd })` | Existing formatter is hourly-only; new resolver adds `salaryDisplay` precedence. No new file. |
| Public DTO shape | `src/domains/job-board/public.service.ts::PublicJobDto` (T1B freeze) | `N/A` (additive) | n/a | n/a | n/a | `salaryDisplay` is OPTIONAL/nullable + additive; allowlist fence `PUBLIC_KEYS` updated. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Public projection | `src/domains/job-board/public.service.ts` `publicSelect` + mappers | `N/A` (extended in-place) | n/a | Repo-owned (T1B freeze) | n/a | n/a | Additive 1 scalar + 1 DTO field. No new platform/orchestration. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | New file `src/domains/job-board/components/landing/stamp-overlay.tsx` exporting `JobStampOverlay({ isHot, isUrgent, isHighReward, isExpiringSoon, size?, className? }): ReactElement | null`. The 4-flag signature is mandatory; NO `stamps?` override prop on the public surface. |
| `RQ-02` | `JobStampOverlay` derives via `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` (no heuristic). If empty → returns `null`. Each stamp is rendered with: `data-testid="job-stamp"`, `data-stamp-key={stampKey}`, `data-stamp-index={idx}`, `aria-label={STAMPS[stampKey].ariaLabel}`, `className` includes `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100` + `STAMPS[stampKey].bgClass` + `STAMPS[stampKey].fgClass`. Visual style matches the homepage `RubberStamp` (3D, tilted, ink-effect, overflow) using `style.transform: rotate(${STAMPS[stampKey].rotateDeg}deg)` and the existing `radial-gradient` ink layer + boxShadow. |
| `RQ-03` | `JobStampOverlay` is `position: absolute` with offset `top: -8 + idx*8 px`, `left: -8 + idx*18 px` (matching T1B `RubberStamp`). Wrapper is `pointer-events-none` to not block card CTA. Outer card containers (`<article>` in `FeaturedJobCard` and `JobCard`; `<header>` block in detail page) MUST be `position: relative` and MUST NOT clip (`overflow-visible` if previously `overflow-hidden`). |
| `RQ-04` | Mobile 375px: total horizontal extent of stamps ≤ card width. Stamp `width = scale(0.7) × ~64px ≈ 45px`; leftmost stamp starts at `-8px`; rightmost stamp at `-8 + 2*18 = 28px`; total ≈ 53px. Card width on mobile ≈ ≥ 280px. No horizontal overflow. |
| `RQ-05` | The old `JobStampBadge` (flat pill) is RETIRED. The file `src/domains/job-board/components/landing/stamp-badge.tsx` is REMOVED. `JobStampOverlay` replaces it. Static fence in `stamp-badge.test.ts` is renamed to `stamp-overlay.test.ts` and updates all path constants to `stamp-overlay.tsx`. |
| `RQ-06` | `FeaturedJobCard` no longer defines a local `RubberStamp`; it uses `JobStampOverlay`. `FeaturedJobCardProps['job']` adds `salaryDisplay: string | null`. The `stamps?` field on the props is RETIRED (replaced by direct 4-flag derivation through the overlay). |
| `RQ-07` | `app/(portal)/page.tsx::enrichJob` destructures `isHot, isUrgent, isHighReward, isExpiringSoon, salaryDisplay` from `PublicJobDto`. `EnrichedJob` interface gains `isHighReward: boolean`, `isExpiringSoon: boolean`, `salaryDisplay: string | null`. The `stamps: StampKey[]` field on `EnrichedJob` is REMOVED (the partial derivation is the bug). `FeaturedJobCard` consumers use the 4 flags + `salaryDisplay` directly. |
| `RQ-08` | `app/(jobs)/viec-lam/page.tsx::JobCard` (listing) calls `<JobStampOverlay isHot={job.isHot} isUrgent={job.isUrgent} isHighReward={job.isHighReward} isExpiringSoon={job.isExpiringSoon} size="sm" />`. The local precomputed `stamps` variable is REMOVED. No more partial override. |
| `RQ-09` | `app/(jobs)/viec-lam/[slug]/page.tsx` (detail) calls `<JobStampOverlay isHot={job.isHot} isUrgent={job.isUrgent} isHighReward={job.isHighReward} isExpiringSoon={job.isExpiringSoon} size="md" />`. The local `stamps={deriveStampsFromFlags(...)}` precomputation is REMOVED. Detail SUMMARY section renders a new `<Fact label="Mức lương" value={formatPublicSalary({ salaryDisplay: job.salaryDisplay, salaryMinVnd: job.salaryMinVnd, salaryMaxVnd: job.salaryMaxVnd })} />` (or equivalent chip) — `salaryDisplay` is rendered when present, hourly fallback otherwise, "Lương thương lượng" when both absent. |
| `RQ-10` | `PublicJobDto` (list DTO) gains `salaryDisplay: string | null`. `PublicJobPostingSelectPayload` already carries `salaryDisplay` (T1B freeze). `toDto` mapper copies `salaryDisplay: posting.salaryDisplay`. `publicSelect` adds `salaryDisplay: true`. |
| `RQ-11` | `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd }): string` in `src/domains/job-board/public-listing.labels.ts`. Precedence: (1) `salaryDisplay?.trim()` non-empty → return trimmed value as plain text (NO `đ/giờ` appended); (2) else if `salaryMinVnd !== null` → return existing hourly/range format `${from} đ/giờ` or `${from} – ${to} đ/giờ`; (3) else `"Lương thương lượng"`. The function is pure (no I/O). |
| `RQ-12` | Static allowlist updates: `src/domains/job-board/public-card-truth.test.ts::PUBLIC_KEYS` includes `'salaryDisplay'` (sorted). `src/domains/job-board/public-select.static.test.ts::topLevelSelectKeys` includes `'salaryDisplay'`. Both tests pass with the new key. |
| `RQ-13` | Listing `JobCard` salary pill calls `formatPublicSalary({ salaryDisplay: job.salaryDisplay, salaryMinVnd: job.salaryMinVnd, salaryMaxVnd: job.salaryMaxVnd })`. `FeaturedJobCard` salary pill (homepage) calls the same. Both pills use `<p className="inline-flex w-fit items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold" style={{ backgroundColor: 'var(--color-primary-soft)', ... }}>` with `<span aria-hidden="true">₫</span>` prefix REMOVED when `salaryDisplay` is non-empty (since the value is the author's own label, not a VND amount). When fallback to hourly is used, the `₫` prefix remains. |
| `RQ-14` | Production-reproduction tests in `public-card-truth.test.ts`: (a) "Nhân viên kho" fixture — `salaryMinVnd: 26000, salaryMaxVnd: 26000, salaryDisplay: '20 triệu', isHighReward: true, isExpiringSoon: true, isHot: false, isUrgent: false` → DTO has 4 flags + salaryDisplay; mapper output `salaryDisplay: '20 triệu'`; resolver output `"20 triệu"`; expected stamps `['sap-het-han', 'thuong-cao']` (canonical rank order). (b) "Thợ điện" fixture — `salaryMinVnd: null, salaryMaxVnd: null, salaryDisplay: '20 triệu', isUrgent: true, others: false` → DTO carries `salaryDisplay: '20 triệu'`; resolver output `"20 triệu"`; expected stamps `['tuyen-gap']`. (c) salaryDisplay empty + hourly `26000` → resolver output `"26.000 đ/giờ"`. (d) salaryDisplay empty + hourly `null` → resolver output `"Lương thương lượng"`. |
| `RQ-15` | Stamp matrix test (covered by extending `job-posting-stamps-mapping.test.ts` + the existing `deriveStampsFromFlags` helper): `(false, false, false, false)` → `[]`; `(true, false, false, false)` → `['hot']`; `(false, true, false, false)` → `['tuyen-gap']`; `(false, false, true, false)` → `['thuong-cao']`; `(false, false, false, true)` → `['sap-het-han']`; `(true, true, true, true)` → `['tuyen-gap', 'hot', 'sap-het-han', 'thuong-cao']` (rank order). All cases covered by `deriveStampsFromFlags` + the canonical `STAMP_RANK`. |
| `RQ-16` | Static fence `stamp-overlay.test.ts` (renamed from `stamp-badge.test.ts`) — same invariant targets updated: (a) `stamp-overlay.tsx` exports `JobStampOverlay`; (b) it imports `deriveStampsFromFlags` from `./stamp-defs`; (c) per-stamp `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100`; (d) `data-testid="job-stamp"`, `data-stamp-key`, `data-stamp-index`; (e) returns null when keys empty; (f) no external package imports (only `react` + `./stamp-defs` + `lucide-react` icons); (g) listing `/viec-lam/page.tsx` imports `JobStampOverlay` from `@/src/domains/job-board/components/landing/stamp-overlay`; (h) detail page imports same; (i) NO call site contains `data-testid="job-stamp"` inline (no drift back to local IIFE); (j) NO file imports `JobStampBadge` anywhere; (k) detail page contains `formatPublicSalary` reference (the new fact/chip) — no inline formatter. |
| `RQ-17` | `FeaturedJobCard.test.ts` is extended to assert: (a) job with all 4 flags `true` renders 4 stamps in the overlay; (b) job with `salaryDisplay: '20 triệu', salaryMinVnd: 26000, salaryMaxVnd: 26000` renders `"20 triệu"` in the salary pill, NOT `"26.000 đ/giờ"`; (c) job with no flags renders no stamps. |
| `RQ-18` | `git diff --check` exits 0. `git diff --stat 796e13c6..HEAD -- prisma migrations src/shared/auth src/shared/security package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml app/admin app/api src/domains/staffing/job-posting-error-map.ts src/domains/talent/recruiter-workbench.*` reports 0 lines on every forbidden path. |
| `RQ-19` | No `prisma/**`, no `migrations/**`, no `app/admin/**` (T1B-owned), no `app/api/admin/**`, no `src/shared/auth/**`, no `src/shared/security/**`, no `src/domains/talent/recruiter-workbench.*` (F6), no `src/domains/staffing/job-posting-error-map.ts` (T1A M2A F8 mapper — read-only), no `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` change. |

### 4.2 Scope boundaries

- **In:** `src/domains/job-board/components/landing/stamp-overlay.tsx` (NEW shared); `src/domains/job-board/components/landing/stamp-badge.tsx` (DELETE); `src/domains/job-board/components/landing/featured-job-card.tsx` (use overlay + add `salaryDisplay`); `src/domains/job-board/public.service.ts` (add `salaryDisplay` to `PublicJobDto` + `toDto` mapper + `publicSelect`); `src/domains/job-board/public-listing.labels.ts` (add `formatPublicSalary`); `src/domains/job-board/public-types.ts` (no type change; uses `PublicJobDto`); `app/(portal)/page.tsx` (extend `EnrichedJob` + `enrichJob` destructure); `app/(jobs)/viec-lam/page.tsx` (use overlay, no `stamps?` override, new salary pill); `app/(jobs)/viec-lam/[slug]/page.tsx` (use overlay, no `stamps?` override, new Mức lương fact); `src/domains/job-board/public-card-truth.test.ts` (allowlist + 4 production-repro + 2 precedence cases); `src/domains/job-board/public-select.static.test.ts` (allowlist + `salaryDisplay`); `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → `stamp-overlay.test.ts` (rename + path updates); `src/domains/job-board/job-posting-stamps-mapping.test.ts` (matrix 0/1/2/3/4 flag cases); `src/domains/job-board/components/landing/featured-job-card.test.ts` (4-flag render + salary precedence); `docs/tasks/hrp-ui-v1-public-card-truth-correction/{TASK.md,HANDOFF.md}` (NEW).
- **Out:** All forbidden paths (see §0). Production DB / live migration. F6 branch (`codex/t1a-m2b-f6-placement-unavailable-reason` — `RESOLVED_PENDING_MAIN_MERGE`). F8 forward-merge of `summarizeJobPostingApiError` (T1B-owned; already consumed). UI2 wiring (T1C-owned). Admin localization Wave 1 (T1B-owned). Mốc 3 source work (read-only khảo sát only). P2/AFF. M2A HANDOFF artifacts. Production data correction.
- **Allowed task artifacts:** `docs/tasks/hrp-ui-v1-public-card-truth-correction/**`.

### 4.3 Domain boundaries

- **Data/state:** Zero DB writes. Zero Prisma imports new in scope. No model field added/changed. `JobPosting.salaryDisplay` is read-only.
- **Permission/security:** No auth/RLS/role matrix change. `MKT` principal / `withPublicDb` unchanged. Public surface principal preserved.
- **Interface/API:** No route file touched. No DTO removal/rename. `salaryDisplay` is OPTIONAL/nullable + additive on `PublicJobDto`. `publicSelect` allowlist (1 new scalar key) and `PUBLIC_KEYS` (1 new DTO key) are updated in lockstep.
- **Migration/rollback:** N/A. Rollback = revert branch commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/job-board/components/landing/stamp-overlay.tsx` (NEW) | Extract homepage `RubberStamp` (3D/tilted/ink/overflow) into a shared overlay. Export `JobStampOverlay` with 4-flag signature (no `stamps?` override). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` (will fail on path rename — proceed) | Visual drift (still 2 renderers) or null pointer |
| `STEP-02` | `src/domains/job-board/components/landing/stamp-badge.tsx` (DELETE) | Remove the old flat-pill component. Update all importers. | `rg "JobStampBadge" app/ src/` → 0 hits | Stray import left |
| `STEP-03` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Replace local `RubberStamp` with `JobStampOverlay`. Add `salaryDisplay: string | null` to `FeaturedJobCardProps['job']`. Remove local `stamps?` prop. Salary pill uses `formatPublicSalary`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` | Any existing test fails |
| `STEP-04` | `app/(jobs)/viec-lam/page.tsx` | `JobCard` uses `<JobStampOverlay ... size="sm" />`. Remove precomputed `stamps` array. Salary pill uses `formatPublicSalary` with the new resolver. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` (or job-posting-stamps test) | Render output wrong |
| `STEP-05` | `app/(jobs)/viec-lam/[slug]/page.tsx` | Detail SUMMARY uses `<JobStampOverlay ... size="md" />`. Add `<Fact label="Mức lương" value={formatPublicSalary(...)} />` after `<Fact label="Chỉ tiêu đã tuyển" ...>` block. Remove precomputed `stamps` array. | `npm run typecheck`; `npm run build` | Build fails or stamp drift |
| `STEP-06` | `app/(portal)/page.tsx` | Extend `EnrichedJob` with `isHighReward`, `isExpiringSoon`, `salaryDisplay`. Update `enrichJob` destructure. Remove `stamps` field from `EnrichedJob` (homepage now passes 4 flags directly to overlay). | `npm run typecheck`; code review | Type error on `EnrichedJob` consumer |
| `STEP-07` | `src/domains/job-board/public.service.ts` | Add `salaryDisplay: string | null` to `PublicJobDto`. `toDto` mapper copies it. `publicSelect` adds `salaryDisplay: true`. `PublicProjectRow` carries `salaryDisplay: string | null`. `projectRowFromPosting` copies it. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` | Allowlist drift |
| `STEP-08` | `src/domains/job-board/public-listing.labels.ts` | Add `formatPublicSalary({ salaryDisplay, salaryMinVnd, salaryMaxVnd }): string` with the 1→2→3 precedence. | `npm run typecheck`; unit tests of precedence cases | Precedence wrong / heuristic |
| `STEP-09` | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → `src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` (RENAME + path update) | All path constants point to `stamp-overlay.tsx`. Drop the `JobStampBadge export` assertion; add `JobStampOverlay export` assertion. Update listing-page assertions: NO partial `stamps` override; salaryDisplay path covered. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` | Fence fails |
| `STEP-10` | `src/domains/job-board/public-card-truth.test.ts` | Add `salaryDisplay` to `PUBLIC_KEYS`. Add 4 production-repro cases (Nhân viên kho / Thợ điện / empty + hourly / empty + null). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` | Tests fail |
| `STEP-11` | `src/domains/job-board/public-select.static.test.ts` | Add `salaryDisplay` to `topLevelSelectKeys` (sorted). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` | Test fails |
| `STEP-12` | `src/domains/job-board/job-posting-stamps-mapping.test.ts` | Extend with stamp matrix: 0 flag → `[]`; 4 single-flag → each correct key; 2-flag combinations; all 4 flags → rank order. (Some cases already implicit in helper; make them explicit.) | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | Test fails |
| `STEP-13` | `src/domains/job-board/components/landing/featured-job-card.test.ts` | Add: (a) 4-flag render assertion (Nhân viên kho); (b) salary precedence assertion (20 triệu wins over hourly); (c) 0-flag render (no stamps). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` | Test fails |
| `STEP-14` | All gates: typecheck, lint, build, `git diff --check`, encoding surface, verify-task, verify-handoff. | Per `tier1.md` standard lane. | `npm run typecheck`; `npx eslint <changed files>`; `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-task.ps1`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | Any gate fail |
| `STEP-15` | Commit semantic implementation forward-only; freeze Implementation SHA. Write HANDOFF.md. Re-run `verify-handoff.ps1`. | Per V2_FAST_FREEZE. | HANDOFF §0 pins exact 40-char Implementation SHA (latest semantic commit). | HANDOFF not self-consistent |
| `STEP-16` | Push branch; open PR (non-draft); await CI 4/4 GREEN. | T1A does NOT merge. T1A does NOT deploy. | `gh pr create`; `gh pr view <n> --json statusCheckRollup` | n/a |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `src/domains/job-board/components/landing/stamp-overlay.tsx` exists; exports `JobStampOverlay({ isHot, isUrgent, isHighReward, isExpiringSoon, size?, className? })`. NO `stamps?` override prop on the public surface. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` (renamed from `stamp-badge.test.ts`); `Select-String -Path src/domains/job-board/components/landing/stamp-overlay.tsx -Pattern "JobStampOverlay"` |
| `AC-02` | `JobStampOverlay` derives via `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` — NO heuristic from salary / postedAt / hash / deadline / urgency. | `Select-String -Path src/domains/job-board/components/landing/stamp-overlay.tsx -Pattern "salary\|postedAt\|hash\|deadline\|urgency"` (no match in body) |
| `AC-03` | Per-stamp wrapper has `data-testid="job-stamp"`, `data-stamp-key`, `data-stamp-index`, `aria-label={STAMPS[stampKey].ariaLabel}`, `className` includes `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100` + `STAMPS[stampKey].bgClass` + `STAMPS[stampKey].fgClass`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` |
| `AC-04` | `JobStampOverlay` returns `null` when `keys.length === 0`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` |
| `AC-05` | `JobStampOverlay` has no external package import other than `react` (type) and `./stamp-defs` + `lucide-react` (icons) — no new dependency. | `rg "^import" src/domains/job-board/components/landing/stamp-overlay.tsx` |
| `AC-06` | Old `stamp-badge.tsx` is DELETED. `rg "JobStampBadge" app/ src/` reports 0 hits. | `rg "JobStampBadge" app/ src/` (no match) |
| `AC-07` | `app/(jobs)/viec-lam/page.tsx::JobCard` calls `<JobStampOverlay isHot={job.isHot} isUrgent={job.isUrgent} isHighReward={job.isHighReward} isExpiringSoon={job.isExpiringSoon} size="sm" />` with NO precomputed `stamps` array. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` (fence asserts no `data-testid="job-stamp"` inline; imports `JobStampOverlay`) |
| `AC-08` | `app/(jobs)/viec-lam/[slug]/page.tsx` detail SUMMARY uses `<JobStampOverlay ... size="md" />` (4 flags, no override). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` (fence asserts no `data-testid="job-stamp"` inline on detail page) |
| `AC-09` | `app/(portal)/page.tsx::enrichJob` destructures `isHot, isUrgent, isHighReward, isExpiringSoon, salaryDisplay`; `EnrichedJob` interface has all 5 fields including the 2 new flags + `salaryDisplay: string | null`. The `stamps` field on `EnrichedJob` is REMOVED. | `npm run typecheck` (must exit 0); `rg "stamps:" app/(portal)/page.tsx` (no match in EnrichedJob) |
| `AC-10` | `PublicJobDto` carries `salaryDisplay: string | null`; `toDto` copies it; `publicSelect` allowlist has `salaryDisplay: true`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` |
| `AC-11` | `PUBLIC_KEYS` (sorted) in `public-card-truth.test.ts` includes `'salaryDisplay'` (24 keys total). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` |
| `AC-12` | `topLevelSelectKeys` (sorted) in `public-select.static.test.ts` includes `'salaryDisplay'` (15 keys total). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` |
| `AC-13` | `formatPublicSalary({ salaryDisplay: '20 triệu', salaryMinVnd: 26000, salaryMaxVnd: 26000 })` returns `"20 triệu"` (precedence 1). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` (production-repro case) |
| `AC-14` | `formatPublicSalary({ salaryDisplay: '20 triệu', salaryMinVnd: null, salaryMaxVnd: null })` returns `"20 triệu"` (Thợ điện case). | Same as AC-13. |
| `AC-15` | `formatPublicSalary({ salaryDisplay: '', salaryMinVnd: 26000, salaryMaxVnd: 26000 })` returns `"26.000 đ/giờ"` (precedence 2). | Same. |
| `AC-16` | `formatPublicSalary({ salaryDisplay: null, salaryMinVnd: null, salaryMaxVnd: null })` returns `"Lương thương lượng"` (precedence 3). | Same. |
| `AC-17` | `formatPublicSalary` is pure: no I/O, no `Date.now()`, no `Math.random()`. Two calls with same args produce same output. | Precedence tests cover determinism. |
| `AC-18` | "Nhân viên kho" production-repro: DTO has `salaryDisplay: '20 triệu', isHighReward: true, isExpiringSoon: true`; mapper output asserts `salaryDisplay: '20 triệu'`; expected stamps = `['sap-het-han', 'thuong-cao']` in canonical rank order. NO `26.000 đ/giờ` in the rendered text path. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-card-truth.test.ts` (case "Nhân viên kho"); `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` (case "salary precedence 20 triệu") |
| `AC-19` | "Thợ điện" production-repro: DTO has `salaryDisplay: '20 triệu', isUrgent: true`; expected stamps = `['tuyen-gap']`; resolver output `"20 triệu"`. NO `"Lương thương lượng"` in the rendered text path. | Same as AC-18. |
| `AC-20` | Stamp matrix (0/1/2/3/4 flag combinations) cover all 16 combinations; rank order preserved by `STAMP_RANK`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` (extended matrix) |
| `AC-21` | `FeaturedJobCard` with all 4 flags `true` renders 4 stamps via the shared overlay (no local `RubberStamp`); with 0 flags renders no stamps. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` |
| `AC-22` | `FeaturedJobCard` with `salaryDisplay: '20 triệu', salaryMinVnd: 26000, salaryMaxVnd: 26000` renders `"20 triệu"` in the salary pill, NOT `"26.000 đ/giờ"`. | Same as AC-21. |
| `AC-23` | Static fence `stamp-overlay.test.ts` (renamed from `stamp-badge.test.ts`) passes: (a) `JobStampOverlay` export; (b) `deriveStampsFromFlags` import from `./stamp-defs`; (c) per-stamp `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100`; (d) `data-testid="job-stamp"` + `data-stamp-key` + `data-stamp-index`; (e) null on empty; (f) no external packages beyond `react` (type) + `./stamp-defs` + `lucide-react`; (g) listing page imports `JobStampOverlay` from `@/src/domains/job-board/components/landing/stamp-overlay`; (h) detail page imports same; (i) NO call site contains inline `data-testid="job-stamp"`; (j) NO file imports `JobStampBadge`; (k) detail page references `formatPublicSalary` (the new fact). | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts` |
| `AC-24` | `git diff --check` exit 0. | `git diff --check` |
| `AC-25` | `git diff --stat 796e13c6..HEAD -- <forbidden list>` reports 0 lines on every forbidden path. | `git diff --stat 796e13c6..HEAD -- prisma migrations app/admin app/api/admin src/shared/auth src/shared/security package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml src/domains/staffing/job-posting-error-map.ts src/domains/talent/recruiter-workbench.* tests/db` (must be empty) |
| `AC-26` | `npm run typecheck` exit 0. | `npm run typecheck` |
| `AC-27` | `npx eslint <changed files>` exit 0 (0 errors on the changed surface; baseline 918 warnings on unrelated files are pre-existing and out of scope). | `npx eslint src/domains/job-board/components/landing/stamp-overlay.tsx src/domains/job-board/components/landing/featured-job-card.tsx src/domains/job-board/public.service.ts src/domains/job-board/public-listing.labels.ts app/(portal)/page.tsx app/(jobs)/viec-lam/page.tsx app/(jobs)/viec-lam/[slug]/page.tsx` |
| `AC-28` | `npm run build` exit 0. | `npm run build` |
| `AC-29` | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 on the working-tree changed surface (canonical F6-owned text surface). | `node .ai-pipeline/scripts/verify-encoding.mjs` |
| `AC-30` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` exit 0 (PASS or DRAFT-VALID). | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` |
| `AC-31` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` exit 0. HANDOFF pins exact 40-char Implementation SHA. | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-05` |
| `RQ-02` | `STEP-01` | `AC-02`, `AC-03` |
| `RQ-03` | `STEP-01`, `STEP-03` | `AC-04` (fence) |
| `RQ-04` | `STEP-03`, `STEP-04`, `STEP-05` | `AC-21`, `AC-22` (mobile horizontal overflow guard covered by DEC-03; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/featured-job-card.test.ts` covers render within card frame, no horizontal overflow) |
| `RQ-05` | `STEP-02`, `STEP-09` | `AC-06`, `AC-23 (j)` |
| `RQ-06` | `STEP-01`, `STEP-03` | `AC-01`, `AC-21` |
| `RQ-07` | `STEP-06` | `AC-09` |
| `RQ-08` | `STEP-04`, `STEP-05` | `AC-07`, `AC-08` |
| `RQ-09` | `STEP-05` | `AC-08` (rendering Mức lương fact) |
| `RQ-10` | `STEP-07` | `AC-10` |
| `RQ-11` | `STEP-08` | `AC-13`, `AC-14`, `AC-15`, `AC-16`, `AC-17` |
| `RQ-12` | `STEP-10`, `STEP-11` | `AC-11`, `AC-12` |
| `RQ-13` | `STEP-03`, `STEP-04` | `AC-22` |
| `RQ-14` | `STEP-10`, `STEP-13` | `AC-18`, `AC-19` |
| `RQ-15` | `STEP-12` | `AC-20` |
| `RQ-16` | `STEP-09` | `AC-23` |
| `RQ-17` | `STEP-13` | `AC-21`, `AC-22` |
| `RQ-18` | `STEP-14` | `AC-24`, `AC-25` |
| `RQ-19` | `STEP-14` | `AC-25` |
| (canonical gates) | `STEP-14` | `AC-26`..`AC-30` |
| (commit + HANDOFF) | `STEP-15` | `AC-31` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Visual regression on the homepage `FeaturedJobCard` if the extracted overlay deviates from the original `RubberStamp` art direction. | T1B's `RubberStamp` (lines 71-152) is the source of truth. The overlay is a near-verbatim extraction: same `radial-gradient` ink layer, same `boxShadow`, same `rotateDeg` per stamp, same `top`/`left` offset index, same `scale(0.7)`. Visual diff is `git diff` only. Rollback = revert branch commit. |
| `RISK-02` | Removing the `stamps?` override prop could break a non-public caller. Search confirms `JobStampBadge` is only consumed by `app/(jobs)/viec-lam/page.tsx` and `app/(jobs)/viec-lam/[slug]/page.tsx` (per `rg "JobStampBadge" app/ src/`). Both are in-scope. The file is deleted in the same commit. Rollback = revert branch commit. |
| `RISK-03` | Adding `salaryDisplay` to `PublicJobDto` (the LIST DTO) is OPTIONAL/nullable. Existing consumers that do not check `salaryDisplay` are unaffected. The list DTO is a Server Component boundary; client-side code does not consume `PublicJobDto` directly. `npm run typecheck` confirms. Rollback = revert branch commit. |
| `RISK-04` | `formatPublicSalary` precedence bug (e.g. whitespace-only `salaryDisplay` slips through to the formatter). | The `salaryDisplay?.trim()` check explicitly handles whitespace-only → fall through to precedence 2. Precedence tests cover: `''`, `'   '`, `null`, `undefined`, non-empty. Rollback = revert branch commit. |
| `RISK-05` | Static fence (`stamp-overlay.test.ts`) drift if a call site re-introduces inline stamp IIFE. | Fence asserts: (a) listing & detail import `JobStampOverlay`; (b) NO inline `data-testid="job-stamp"`; (c) NO inline `bg-red-500`; (d) NO `JobStampBadge` import anywhere. The fence will fail on first drift. |
| `RISK-06` | CI integration test (`tests/db/job-posting-stamps.integration.test.ts` is the existing one, ENV_BLOCKED locally per `vitest.unit.config.ts` `BLOCKED_DB_URL`). | T1A does NOT modify the integration test (out of scope). Local gate is unit + static. CI runs the integration; if CI fails, T0 reports. The fix does not change DB schema, so integration coverage is "DB round-trip of the 4 flags + salaryDisplay" which the existing test covers once `salaryDisplay` is added to its fixtures (T1A may extend the integration test if CI regression requires — strictly outside this hotfix unless T0 asks). |
| `RISK-07` | T1C UI2 Phase B touches `app/(portal)/page.tsx` (T1C scope) — forward-merge conflict possible. | Per T0 §8: T1C forward-merges from main AFTER this hotfix production PASS. T1A does NOT cherry-pick unfinished UI2. If T1C has a parallel commit on `app/(portal)/page.tsx`, the conflict is resolved in T1C's worktree during their forward-merge. T1A's hotfix is the source of truth for `EnrichedJob` + `enrichJob` extension. |
| `RISK-08` | `app/globals.css` keyframe + reduced-motion utility is preserved. If someone later edits the CSS, the overlay still works because it only consumes the class names. | Static fence: `app/globals.css` already has `.job-stamp-attention` + `@keyframes job-stamp-blink` + `motion-reduce:*` (T1B freeze). The overlay uses these class names. No CSS change in this hotfix. |
| `RISK-09` | The `salaryDisplay` from `JobPosting` is a free-text string entered by the author. React renders it as plain text (no HTML injection). The formatter is `.trim()` only, no further transformation. | `formatPublicSalary` is pure and only returns the trimmed string. `<p>{...}</p>` React render does not interpret HTML. Verified by the `FeaturedJobCard.test.ts` extension + the `public-card-truth.test.ts` precedence cases. |
| `RISK-10` | Mobile horizontal overflow if the card container does not become `relative` and the stamp absolute positioning bleeds. | All three card containers (homepage `article`, listing `article`, detail `header`) gain `relative` class. Stamp position `top: -8 + idx*8 px`, `left: -8 + idx*18 px`, max idx 3 → max `left = -8 + 54 = 46px`, stamp width ~ 45px after `scale(0.7)`. Total ≈ 91px from left edge. Card width mobile (375px viewport, 16px gutter) ≈ ≥ 280px. No horizontal overflow. |

## 8. Open Questions

- None. T0 directive §1-§9 đã chốt toàn bộ Owner decisions: 3 root causes (RC-01..RC-03), exact files, file ownership, scope boundaries, gates, sequencing (hotfix independent, ships before UI2 production PASS).

## 9. Planner Resolution

| ID | Source | Decision | Status |
|---|---|---|---|
| `PR-01` | T0 directive §1, §6, §8 | Scope = 3 production defects on public cards. T1A owns: `app/(portal)/page.tsx`, `app/(jobs)/viec-lam/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/public-types.ts`, `src/domains/job-board/public-listing.labels.ts`, `src/domains/job-board/components/landing/**` (stamp/card). T1C owns UI2 Phase B in separate worktree. T1B owns F8 mapper + Admin localization Wave 1. | `ACCEPTED` — `DEC-01..DEC-15` + `§4` implement exactly this. |
| `PR-02` | T0 directive §5 RC-01..RC-03 | Three root causes. RC-01: visual drift. RC-02: `isHighReward`/`isExpiringSoon` dropped on public cards. RC-03: `JobPosting.salaryDisplay` ignored by card. | `ACCEPTED` — `RQ-01..RQ-13` address each. |
| `PR-03` | T0 directive §6 (Required implementation) | (A) single shared stamp visual with homepage canonical; (B) derive 4 flag; (C) salary precedence 1→2→3. | `ACCEPTED` — `DEC-01..DEC-12` + `RQ-01..RQ-13`. |
| `PR-04` | T0 directive §7 (Required regression tests) | Stamp matrix 0/1/2/3/4; production-repro for 2 postings; precedence cases; static fence; allowlist updates. | `ACCEPTED` — `RQ-14..RQ-17` + `AC-11..AC-23`. |
| `PR-05` | T0 directive §8 (File ownership) | T1A does NOT cherry-pick UI2; T1A does NOT modify Admin localization; T1A does NOT wait for T1C. | `ACCEPTED` — forbidden paths cover all. |

## 10. Revision Log

| Rev | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-04 | Initial TASK.md authored. Baseline `796e13c6` (origin/main HEAD at task start, post PR #94 merge). Status `READY_TO_CODE`. Contract gate `READY_TO_CODE`. Lane `STANDARD`. Audit `NONE`. Correction budget `1`. 3 production defects (RC-01..RC-03) addressed: shared `JobStampOverlay` (extracted from homepage `RubberStamp`); 4-flag canonical derivation via `deriveStampsFromFlags`; salary precedence `salaryDisplay` → hourly → `"Lương thương lương"`. 1 new file (`stamp-overlay.tsx`); 1 delete (`stamp-badge.tsx`); 1 new DTO scalar (`PublicJobDto.salaryDisplay`); 1 new resolver (`formatPublicSalary`); 3 page files updated; 4 test files updated/extended. Forbidden paths: prisma, migrations, app/admin, app/api/admin, F6, F8 mapper, M2A HANDOFF, UI2, Admin localization, pnpm. | T0 directive 2026-10-04 §1-§9 chốt outcome/boundary/lane/audit. |
| `v1.1` | 2026-10-04 | T0 docs/hygiene correction 1/1 contract sync: changed-surface accounting reconciled — actual diff is 4 NEW (`stamp-overlay.tsx`, `stamp-overlay.test.ts`, `TASK.md`, `HANDOFF.md`) + 2 DELETED (`stamp-badge.tsx`, `stamp-badge.test.ts`) + 17 MODIFIED = 23 files; `TASK.md` and `HANDOFF.md` are counted separately under NEW, not MODIFIED. Also note the T0-approved mechanical exception for `src/shared/security/required-relation-sweep.static.test.ts` line-anchor shift (no auth/RLS/security behavior change). No semantic delta in this contract revision — it is a paperwork alignment with the implemented surface. | T0 directive 2026-10-04 docs/hygiene correction 1/1: HANDOFF §1.3 + §4.1 must reflect exact 4+2+17 = 23 file split. |
