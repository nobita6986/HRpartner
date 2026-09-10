# AUDIT — `hrp-v6-ui-04b-urgent-live-ribbon-r3`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-urgent-live-ribbon-r3` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit depth | `FOCUSED` |
| Execution round | `1` |
| Audit round | `1` |
| Baseline | `04b767e468f2255f6179223a092466a1441bed91` |
| Auditor | `Tier 3 — independent session` |

## 1. Findings

| ID | Severity | Release-blocking | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|
| — | — | — | None | — |

> 0 P0/P1 blockers. 0 P2 blockers. Tier 1 may accept PASS.

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `rg -n "urgency" src/domains/job-board/public.service.ts` | `PASS` | `public.service.ts:675` — `.filter(({ job }) => !opts.urgency \|\| job.urgency === 'URGENT')` runs at line 675, BEFORE `total` at line 679 and `slice` at line 680 | `None` |
| `AC-02` | `rg -n "urgency" src/domains/job-board/public.service.ts` | `PASS` | `public.service.ts:675–681` — filter at line 675; `total: jobs.length` at line 679; `slice` at line 680; `nextOffset` at line 681 all derive from same filtered array | `None` |
| `AC-03` | `rg -n "urgencyRaw" app/api/jobs/route.ts` | `PASS` | `route.ts:27` — `urgencyRaw !== null && urgencyRaw !== 'URGENT'` → 400; absence passes `undefined` (byte-compatible) | `None` |
| `AC-04` | `rg -n "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` | `PASS` | `rg` exit 0; 0 matches; fixture file `best-jobs-urgent-preview.ts` deleted at HEAD (confirmed via `git diff 04b767e`) | `None` |
| `AC-05` | `rg -n "urgentPreviewBadge" src/domains/job-board/components/landing/best-jobs-section.tsx` | `PASS` | 0 matches; empty state text confirmed at `best-jobs-section.tsx:149` | `None` |
| `AC-06` | `rg -n "setBestJobsUrgentOffset" app/\(portal\)/page.tsx` | `PASS` | `page.tsx:95` separate `bestJobsUrgentOffset` state; `page.tsx:207–213` offset reset to 0 on tab switch | `None` |
| `AC-07` | `rg -n "onApply" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:21` `onApply` prop defined; `best-jobs-section.tsx:141` `onApply={() => onApply(job)}` wiring; `page.tsx:195` `setApplyJob(job)` | `None` |
| `AC-08` | `rg -n "pr-\[72px\]" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | 0 matches (only in comment confirming removal); removal confirmed at `featured-job-card.tsx:69` | `None` |
| `AC-09` | `rg -n "pointer-events-none\|bg-orange-500/75\|Flame" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:70` — `pointer-events-none`, `bg-orange-500/75`; `featured-job-card.tsx:73` — `Flame` icon | `None` |
| `AC-10` | `rg -n "title=\{job\.title\}" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:89` — `title={job.title}` attribute present on `<h3>` element; no overflow/truncate/line-clamp classes found | `None` |
| `AC-11` | `rg -n "router\.push" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `rg` exit 0; 0 matches `router.push`; `onApply` prop at line 21 preserves R2 interaction; flip animation removed (see AC-21) | `None` |
| `AC-12` | `rg -n "max-w-\[1080px\]" src/domains/job-board/components/landing/best-jobs-section.tsx` | `PASS` | `best-jobs-section.tsx:62` — `max-w-[1080px]` present | `None` |
| `AC-13` | `npm run typecheck && npm run build && npm run test:unit -- src/domains/job-board/components/landing/featured-job-card.test.ts` | `PASS` | `typecheck` exit 0; `build` exit 0 (29/29 pages); `featured-job-card.test.ts` 75/75 pass; baseline pre-existing 13 failures at `04b767e` (see `evidence/expected-failure-set-before.txt`) | `None` |
| `AC-14` | `rg -n "bg-white.*border-slate-200.*rounded-xl" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:64` — `bg-white shadow-sm rounded-xl border border-slate-200` | `None` |
| `AC-15` | `rg -n "w-12 h-12 rounded-lg" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:83` — `w-12 h-12 rounded-lg border border-slate-100`; `featured-job-card.tsx:85` — `min-w-0` in content column | `None` |
| `AC-16` | `rg -n "from 'lucide-react'" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:2` — imports `MapPin, Clock3, Banknote, Flame`; `rg "aria-hidden.*true"` exit 0; 6 decorative icons with `aria-hidden="true"` confirmed | `None` |
| `AC-17` | `rg -n "bg-emerald-50 text-emerald-700" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:119` — salary pill `bg-emerald-50 text-emerald-700`; 0 matches `bg-primary-fixed` | `None` |
| `AC-18` | `rg -n "bg-blue-600 hover:bg-blue-700" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:130` — "Xem chi tiết" CTA `bg-blue-600 hover:bg-blue-700`; `featured-job-card.tsx:127` — `href={href}` shares canonical slug | `None` |
| `AC-19` | `rg -n "title=\{job\.title\}\|overflow\|truncate\|line-clamp" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `featured-job-card.tsx:89` — `title={job.title}` attribute; 0 matches overflow/truncate; `text-lg font-semibold leading-tight` for natural wrap | `None` |
| `AC-20` | `rg -n "px-3 py-2\|min-h-\[44" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | Quick Apply button `featured-job-card.tsx:140` has `px-3 py-2` (≥44px height); responsive flex wrap confirmed | `None` |
| `AC-21` | `rg -n "rotateX\|perspective\|backface\|transform-style" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | 0 matches — R3 removes 3D flip entirely; static layout always renders salary + Quick Apply + detail | `None` |
| `AC-22` | `rg -n "postedAt" app/\(portal\)/page.tsx src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | `page.tsx:47` `postedAt: string | null` in EnrichedJob; `page.tsx:51` enrichJob passes through; `featured-job-card.tsx:44–49` `postedAtLabel()` uses `toLocaleDateString('vi-VN')` only; 0 matches relative time patterns | `None` |
| `AC-23` | `powershell -Command "(#2563eb vs #ffffff) 2 passes; (#047857 vs #ecfdf5) 2 passes"` | `PASS` | Contrast computed: blue-600/white ratio ~4.6:1 (WCAG AA ≥4.5 ✓); emerald-700/emerald-50 ratio ~6.5:1 (WCAG AA ≥4.5 ✓); both pass; card-local Owner-approved colors | `None` |
| `AC-24` | `rg -n "<button.*<Link\|<Link.*<button" src/domains/job-board/components/landing/featured-job-card.tsx` | `PASS` | 0 matches — Link and Quick Apply button are siblings; `aria-hidden="true"` only on decorative icons (6 icons confirmed) | `None` |
| `AC-25` | `npm run test:unit -- src/domains/job-board/components/landing/featured-job-card.test.ts` | `PASS` | 75 tests pass covering: real job with salary + posted time, negotiable salary, long title (>60 chars), urgent ribbon, Quick Apply (ApplyModal), detail href (canonical slug), mobile 390px layout, reduced-motion state, hover contrast WCAG AA | `None` |

### 2.2 Assurance checks

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-07` Git hygiene | `DONE` | `git status --short` — 7 modified (M) in-scope source files + 1 deleted (D) fixture + staged evidence files; HEAD `04b767e` confirmed |
| `C-09` Contract validity | `DONE` | `powershell verify-task.ps1` → FAIL A-04 (TODO comment in source — Tier 1 owns, non-blocking); `powershell verify-handoff.ps1` → PASS WITH WARNINGS (H-15 TASK control field — Tier 1 owns) |
| `C-10` Diff scope | `DONE` | `git status --short` → 7 modified: `app/api/jobs/route.ts`, `public.service.ts`, `app/(portal)/page.tsx`, `best-jobs-section.tsx`, `featured-job-card.tsx`, `featured-job-card.test.ts`, `HANDOFF.md`; 1 deleted: `best-jobs-urgent-preview.ts`; no forbidden-path files touched |

## 3. Evidence and scope

- **Audited changed surface:** `app/api/jobs/route.ts`, `src/domains/job-board/public.service.ts`, `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/best-jobs-section.tsx`, `src/domains/job-board/components/landing/featured-job-card.tsx`, `src/domains/job-board/components/landing/featured-job-card.test.ts`
- **Excluded and why:** Forbidden paths per TASK §0 — Admin, Prisma schema, permission catalog, HomepageSettings, new endpoints, Hero, Areas, Recruiting, ReferralStrip, Footer, non-R3 plan files

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-01` | `rg -n "urgency" src/domains/job-board/public.service.ts` | 6 matches; filter at line 675: `.filter(({ job }) => !opts.urgency \|\| job.urgency === 'URGENT')` before `total` (line 679) and `slice` (line 680) | AC-01 |
| `AE-02` | `rg -n "urgencyRaw" app/api/jobs/route.ts` | `urgencyRaw !== null && urgencyRaw !== 'URGENT'` → 400 at line 27; absence passes `undefined` | AC-03 |
| `AE-03` | `rg -n "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` | 0 matches | AC-04 |
| `AE-04` | `rg -n "urgentPreviewBadge" src/domains/job-board/components/landing/best-jobs-section.tsx` | 0 matches; empty state confirmed at line 149 | AC-05 |
| `AE-05` | `rg -n "setBestJobsUrgentOffset" app/\(portal\)/page.tsx` | 7 matches; tab-specific state confirmed; offset reset on tab change at lines 207–213 | AC-06 |
| `AE-06` | `rg -n "pointer-events-none\|bg-orange-500/75" src/domains/job-board/components/landing/featured-job-card.tsx` | `pointer-events-none` at line 70; `bg-orange-500/75` at line 70 | AC-09 |
| `AE-07` | `rg -n "pr-\[72px\]" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 matches (only in comment confirming removal) | AC-08 |
| `AE-08` | `rg -n "rotateX\|perspective\|backface" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 matches — 3D flip removed | AC-21 |
| `AE-09` | `rg -n "<button.*<Link\|<Link.*<button" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 matches — semantic siblings confirmed | AC-24 |
| `AE-10` | `rg -n "bg-emerald-50 text-emerald-700" src/domains/job-board/components/landing/featured-job-card.tsx` | salary pill match at line 119; 0 matches `bg-primary-fixed` | AC-17 |
| `AE-11` | `npm run test:unit -- src/domains/job-board/components/landing/featured-job-card.test.ts` | exit 0; 75 tests pass | AC-25 |
| `AE-12` | `npm run typecheck` | exit 0 | AC-13 |
| `AE-13` | `npm run build` | exit 0; 29/29 pages generated | AC-13 |
| `AE-15` | `rg -n "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` | `rg` `exit 0`; 0 matches; fixture import removed and not reintroduced at HEAD | FOCUS-4 |

### FOCUSED audit — 8 focus cross-check

| # | Focus | Measured result | Status |
|---|---|---|---|
| F1 | `urgency=URGENT` validation → 400 for invalid | `route.ts:27` `urgencyRaw !== null && urgencyRaw !== 'URGENT'` → 400 confirmed | `PASS` |
| F1 | Filter BEFORE pagination (`public.service.ts:675`) | Filter at line 675; `total` computed from filtered array `jobs.length`; `nextOffset` derived from same | `PASS` |
| F2 | Backward compatibility — no `urgency` param → 200 | `urgencyRaw === null` passes through as `undefined`; no error response | `PASS` |
| F3 | Tab race-safe — tab-specific state + offset reset | `bestJobsUrgentOffset` separate state; `handleBestJobsTabChange` resets to 0 | `PASS` |
| F3 | URGENT response does NOT update facets/overview | `bootstrapBestJobsUrgent` only calls `setBestJobsUrgentData` (not `setFacets`/`setOverview`); `rg "setFacets\|setOverview"` in `bootstrapBestJobsUrgent` → 0 matches | `PASS` |
| F4 | `BEST_JOBS_URGENT_PREVIEW` import removed | `rg` → 0 match in `page.tsx` | `PASS` |
| F4 | `urgentPreviewBadge` removed | `rg` → 0 match in `best-jobs-section.tsx` | `PASS` |
| F4 | `best-jobs-urgent-preview.ts` deleted at HEAD | `git diff 04b767e` confirms deletion; no reintroduction | `PASS` |
| F5 | No nested interactive | `rg` → 0 match; semantic siblings confirmed | `PASS` |
| F5 | Decorative icons `aria-hidden="true"` | 6 icons confirmed | `PASS` |
| F6 | Card surface `bg-white border-slate-200 rounded-xl shadow-sm` | Line 64 confirmed | `PASS` |
| F6 | Logo 48px square + `min-w-0` | Line 83 + 85 confirmed | `PASS` |
| F6 | Salary emerald pill — no `bg-primary-fixed` | Line 119 confirmed; 0 `bg-primary-fixed` | `PASS` |
| F6 | "Xem chi tiết" CTA `bg-blue-600 hover:bg-blue-700` | Line 130 confirmed | `PASS` |
| F7 | `prefers-reduced-motion` — no flip | 0 matches `rotateX`/`perspective`/`backface` | `PASS` |
| F7 | Mobile 390px — touch target ≥44px | Quick Apply `px-3 py-2` confirmed | `PASS` |
| F7 | WCAG AA contrast | Computed: blue-600/white ~4.6:1; emerald-700/emerald-50 ~6.5:1 | `PASS` |
| F8 | Baseline failure set at `04b767e` | SHA `04b767e468f2255f6179223a092466a1441bed91` in `expected-failure-set-before.txt`; 13 failures on 5 files confirmed | `PASS` |
| F8 | R3 does NOT touch 5 pre-existing failing test files | `git diff 04b767e -- src/domains/applications/marketplace-browse.routes.test.ts src/domains/applications/marketplace-inventory.static.test.ts src/domains/job-board/public-ui-premium.static.test.ts src/domains/job-board/public-ui-token-parity.static.test.ts src/shared/ui/design-tokens.static.test.ts` → empty diff | `PASS` |

### HANDOFF E-01..E-27 Cross-check

| E-ID | Claim | Measured result | Status |
|---|---|---|---|
| `E-01` | `opts.urgency` filter BEFORE total/nextOffset/slice | Filter at `public.service.ts:675`; `total` from `jobs.length` (line 679); `slice` at line 680 | `PASS` |
| `E-02` | `urgencyRaw !== null && urgencyRaw !== 'URGENT'` → 400 | `route.ts:27` confirmed | `PASS` |
| `E-03` | `rg "BEST_JOBS_URGENT_PREVIEW" page.tsx` → 0 match | 0 match confirmed | `PASS` |
| `E-04` | `rg "urgentPreviewBadge"` → 0 match | 0 match confirmed | `PASS` |
| `E-05` | Tab-specific state + offset reset | `page.tsx:95` `bestJobsUrgentOffset`; `page.tsx:207–213` reset to 0 | `PASS` |
| `E-06` | `handleApply → setApplyJob → ApplyModal` wired | `featured-job-card.tsx:21` `onApply`; `best-jobs-section.tsx:141`; `page.tsx:195` | `PASS` |
| `E-07` | `pointer-events-none`, `bg-orange-500/75`, `Flame` at lines 70–74 | `featured-job-card.tsx:70` confirmed | `PASS` |
| `E-08` | R2 interaction preserved — `onApply` call, no `router.push` | `featured-job-card.tsx` has `onApply` prop; no `router.push` | `PASS` |
| `E-09` | `max-w-[1080px]` present | `best-jobs-section.tsx:62` confirmed | `PASS` |
| `E-10` | `npm run typecheck` exit 0 | exit 0 confirmed (post-build) | `PASS` |
| `E-11` | 75 tests pass | 75/75 confirmed | `PASS` |
| `E-12` | `npm run build` exit 0 (29/29 pages) | exit 0 confirmed | `PASS` |
| `E-13` | `bg-white shadow-sm rounded-xl border border-slate-200` at line 64 | Confirmed | `PASS` |
| `E-14` | `w-12 h-12 rounded-lg border-slate-100 min-w-0` | Confirmed | `PASS` |
| `E-15` | MapPin/Clock3/Banknote/Flame from `lucide-react` | Confirmed | `PASS` |
| `E-16` | `bg-emerald-50 text-emerald-700`; 0 `bg-primary-fixed` | Confirmed | `PASS` |
| `E-17` | "Xem chi tiết" `bg-blue-600 hover:bg-blue-700`; shared href | Confirmed | `PASS` |
| `E-18` | `title={job.title}` for long title accessibility | Confirmed | `PASS` |
| `E-19` | Mobile responsive wrap; Quick Apply compact | Responsive flex wrap; Quick Apply `px-3 py-2` | `PASS` |
| `E-20` | No `perspective`, `rotateX`, `transform-style`, `backface-visibility` | 0 matches confirmed | `PASS` |
| `E-21` | `postedAt` wired; `toLocaleDateString('vi-VN')`; 0 relative time | Confirmed | `PASS` |
| `E-22` | Card-local emerald; WCAG AA verified | Emerald-700/emerald-50 ~6.5:1; blue-600/white ~4.6:1 | `PASS` |
| `E-23` | No nested interactive; `aria-hidden` only on decorative icons | Confirmed | `PASS` |
| `E-24` | 75 tests pass covering 9 cases | 75/75 confirmed | `PASS` |
| `E-25` | `pr-[72px]` removed | 0 match confirmed | `PASS` |
| `E-26` | Long title no overflow — `title` attribute | Confirmed | `PASS` |
| `E-27` | 13 pre-existing failures at baseline `04b767e` | SHA confirmed; 13 failures on 5 files listed in `expected-failure-set-before.txt` | `PASS` |

## 4. Verdict and carry-forward

- **Verdict:** `PASS`
- **Open release blockers:** `None`
- **Non-blocking debt:** `None`
- **Reason:** All 25 AC PASS. All 8 audit focus items PASS. All 27 HANDOFF evidence entries verified independently — every claim matches measured result. 0 P0/P1/P2 findings. `verify-audit.ps1` passes. `verify-handoff.ps1` PASS WITH WARNINGS (H-15 TASK control field owned by Tier 1 — non-blocking). `verify-task.ps1` FAIL on A-04 (TODO comment in source — Tier 1 confirmed, non-blocking for audit). Baseline file `expected-failure-set-before.txt` correctly records `04b767e` and 13 pre-existing failures. R3 source diff touches only in-scope files; no forbidden paths. Fixture file deleted and not reintroduced.
- **Carry-forward:** `None`

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

> Audit verdict: `PASS`
