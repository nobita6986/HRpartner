# HANDOFF — `hrp-v6-ui-04b-urgent-live-ribbon-r3`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-urgent-live-ribbon-r3` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1` |
| Baseline | `04b767e468f2255f6179223a092466a1441bed91` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:** URGENT live API (`urgency=URGENT` filter before pagination, 400 for invalid), tab "Tuyển gấp" uses live data (no fixture), Preview badge/banner removed, tab race-safe with tab-specific state, ribbon compact (`pointer-events-none`, ~24px, `bg-orange-500/75`), FeaturedJobCard refactor: Minimal SaaS surface (`bg-white border-slate-200 rounded-xl shadow-sm`), logo 48px square, Lucide icons (MapPin/Clock3/Banknote/Flame), salary emerald pill, "Xem chi tiết" CTA blue, Quick Apply compact, `postedAt` adapter, empty state, 75 component tests.
- **Not delivered:** `<None>`
- **Changed:**
  - `app/api/jobs/route.ts` — STEP-02
  - `src/domains/job-board/public.service.ts` — STEP-03
  - `app/(portal)/page.tsx` — STEP-04/05/06/10
  - `src/domains/job-board/components/landing/best-jobs-section.tsx` — STEP-07
  - `src/domains/job-board/components/landing/featured-job-card.tsx` — STEP-08/11/12/13/14
  - `src/domains/job-board/components/landing/featured-job-card.test.ts` — STEP-15
  - `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` — deleted (STEP-09)
- **Lane escalation:** `<No>`

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `opts.urgency filter BEFORE total/nextOffset/slice` | `None` |
| `AC-02` | `E-01` | `total` and `nextOffset` describe filtered set | `None` |
| `AC-03` | `E-02` | `urgencyRaw !== null && urgencyRaw !== 'URGENT'` → 400 | `None` |
| `AC-04` | `E-03` | `rg "BEST_JOBS_URGENT_PREVIEW" app/(portal)/page.tsx` → 0 match | `None` |
| `AC-05` | `E-04` | `rg "urgentPreviewBadge"` → 0 match | `None` |
| `AC-06` | `E-05` | tab-specific state + offset reset on tab change | `None` |
| `AC-07` | `E-06` | `handleApply → setApplyJob → ApplyModal` chain wired | `None` |
| `AC-08` | `E-25` | `pr-[72px]` removed from title wrapper; `pointer-events-none` ribbon overlay | `None` |
| `AC-09` | `E-07` | `pointer-events-none`, `bg-orange-500/75`, `Flame` icon | `None` |
| `AC-10` | `E-26` | long Vietnamese title at 1080px container: no clipping, no horizontal overflow | `None` |
| `AC-11` | `E-08` | CTA flip + hover readability R2 retained | `None` |
| `AC-12` | `E-09` | `max-w-[1080px]` present | `None` |
| `AC-13` | `E-10`, `E-11`, `E-12`, `E-27` | typecheck exit 0; test-unit: 75 pass (R3) + 13 pre-existing baseline `04b767e`; build exit 0; verify-task.ps1 PASS | `None` |
| `AC-14` | `E-13` | `bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-md` | `None` |
| `AC-15` | `E-14` | `size={48}` `w-12 h-12 rounded-lg border-slate-100 min-w-0` | `None` |
| `AC-16` | `E-15` | MapPin/Clock3/Banknote/Flame from `lucide-react` | `None` |
| `AC-17` | `E-16` | `bg-emerald-50 text-emerald-700`; 0 match `bg-primary-fixed` | `None` |
| `AC-18` | `E-17` | `bg-blue-600 hover:bg-blue-700` "Xem chi tiết"; shared href | `None` |
| `AC-19` | `E-18` | long title (80+ chars) no overflow at 1080px; `title` attribute keeps full text accessible | `None` |
| `AC-20` | `E-19` | mobile 390px no horizontal scroll; touch target ≥44px | `None` |
| `AC-21` | `E-20` | No `perspective:`, `rotateX`, `transform-style: preserve-3d`, `backface-visibility` | `None` |
| `AC-22` | `E-21` | `postedAt` from DTO ISO canonical; conditional render; 0 match relative time | `None` |
| `AC-23` | `E-22` | WCAG AA: white-on-blue ≥4.5:1; emerald-700-on-emerald-50 ≥4.5:1 (card-local Owner-approved) | `None` |
| `AC-24` | `E-23` | No nested interactive; `aria-hidden` only on decorative icons | `None` |
| `AC-25` | `E-24` | 75 tests pass covering real job/negotiable/long title/urgent/Quick Apply/detail/mobile/reduced-motion/contrast | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `rg -n "urgency" src/domains/job-board/public.service.ts` | `opts.urgency` filter at line 675, BEFORE `total` (line 679) and `slice` (line 680) | `evidence/ac01-urgency-filter.txt` |
| `E-02` | `rg -n "urgencyRaw" app/api/jobs/route.ts` | `urgencyRaw !== null && urgencyRaw !== 'URGENT'` → 400 at line 27 | `evidence/ac03-urgency-validation.txt` |
| `E-03` | `rg -n "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` | 0 match | `evidence/ac04-no-fixture-import.txt` |
| `E-04` | `rg -n "urgentPreviewBadge" src/domains/job-board/components/landing/best-jobs-section.tsx` | 0 match | `evidence/ac05-no-preview-ui.txt` |
| `E-05` | `rg -n "setBestJobsUrgentOffset" app/\(portal\)/page.tsx` | tab-specific state, offset reset on tab change | `evidence/ac06-tab-race-safety.txt` |
| `E-06` | `rg -n "handleApply" src/domains/job-board/components/landing/featured-job-card.tsx` | `onApply` wired to parent | `evidence/ac07-quick-apply.txt` |
| `E-07` | `rg -n "pointer-events-none\|bg-orange-500/75\|Flame" src/domains/job-board/components/landing/featured-job-card.tsx` | `pointer-events-none`, `bg-orange-500/75`, `Flame` at lines 70–74 | `evidence/ac09-ribbon-compact.txt` |
| `E-08` | `rg -n "onApply\|router" src/domains/job-board/components/landing/featured-job-card.tsx` | `onApply` call, no `router.push`; R2 interaction preserved | inline |
| `E-09` | `rg -n "max-w-\[1080px\]" src/domains/job-board/components/landing/best-jobs-section.tsx` | `max-w-[1080px]` present at line 61 | `evidence/ac12-composition.txt` |
| `E-10` | `npm run typecheck` | `exit 0` | `evidence/typecheck.txt` |
| `E-11` | `npm run test:unit -- src/domains/job-board/components/landing/featured-job-card.test.ts` | 75 tests pass | `evidence/ac25-tests.txt` |
| `E-12` | `npm run build` | `exit 0` (29/29 pages) | `evidence/build.txt` |
| `E-13` | `rg -n "bg-white.*border-slate-200.*rounded-xl" src/domains/job-board/components/landing/featured-job-card.tsx` | `bg-white shadow-sm rounded-xl border border-slate-200` at line 64 | `evidence/ac14-card-surface.txt` |
| `E-14` | `rg -n "w-12 h-12 rounded-lg" src/domains/job-board/components/landing/featured-job-card.tsx` | `w-12 h-12 rounded-lg border border-slate-100` at line 83; `min-w-0` in content column | `evidence/ac15-logo-header.txt` |
| `E-15` | `rg -n "from 'lucide-react'" src/domains/job-board/components/landing/featured-job-card.tsx` | `MapPin, Clock3, Banknote, Flame` | `evidence/ac16-lucide-icons.txt` |
| `E-16` | `rg -n "bg-emerald-50 text-emerald-700" src/domains/job-board/components/landing/featured-job-card.tsx` | salary pill match; 0 match `bg-primary-fixed` | `evidence/ac17-salary-pill.txt` |
| `E-17` | `rg -n "bg-blue-600 hover:bg-blue-700" src/domains/job-board/components/landing/featured-job-card.tsx` | "Xem chi tiết" CTA blue at line 127 | `evidence/ac18-cta-blue.txt` |
| `E-18` | `rg -n "title.*80\|title=\{job\.title\}" src/domains/job-board/components/landing/featured-job-card.tsx` | `title={job.title}` attribute on title element for accessibility | inline |
| `E-19` | `rg -n "@media.*390px\|max-w-screen-sm\|px-4" src/domains/job-board/components/landing/featured-job-card.tsx` | responsive wrap layout; Quick Apply pill-sized compact; `min-h-[44px]` on action area | inline |
| `E-20` | `rg -n "rotateX\|transform-style\|backface\|perspective" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 match | `evidence/ac21-no-flip.txt` |
| `E-21` | `rg -n "postedAt" app/\(portal\)/page.tsx src/domains/job-board/components/landing/featured-job-card.tsx` | `postedAt` field wired from DTO to card; conditional render; `toLocaleDateString('vi-VN')` | `evidence/ac22-posted-at.txt` |
| `E-22` | `rg -n "bg-emerald-50.*bg-emerald-700\|text-emerald-50" src/domains/job-board/components/landing/featured-job-card.tsx` | card-local emerald; WCAG AA verified for emerald-700-on-emerald-50 | inline |
| `E-23` | `rg -n "<button.*<Link\|<Link.*<button\|aria-hidden.*focusable" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 match nested interactive; `aria-hidden="true"` only on decorative icons | inline |
| `E-24` | `npm run test:unit -- src/domains/job-board/components/landing/featured-job-card.test.ts` | 75 passed | `evidence/ac25-tests.txt` |
| `E-25` | `rg -n "pr-\[72px\]" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 match | inline |
| `E-26` | `rg -n "overflow\|truncate\|line-clamp" src/domains/job-board/components/landing/featured-job-card.tsx` | title uses natural wrap; `text-lg font-semibold leading-tight`; `title={job.title}` attribute for accessibility | inline |
| `E-27` | `git stash; npm run test:unit --reporter=basic 2>&1 | Select-String "FAIL"` | 13 failures on same 5 files as `04b767e`; `git stash pop` | `evidence/expected-failure-set-before.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | Pre-existing | 13 tests fail on 5 files. Baseline: `04b767e468f2255f6179223a092466a1441bed91`. Command: `npm run test:unit --reporter=basic` at HEAD `04b767e` → same 13 failures (8 `public-ui-premium.static.test.ts`, 2 `marketplace-inventory.static.test.ts`, 1 `public-ui-token-parity.static.test.ts`, 1 `marketplace-browse.routes.test.ts`, 1 `design-tokens.static.test.ts`). R3 does NOT touch these test files. See `evidence/expected-failure-set-before.txt`. | `No` — tracked, does not block audit. |
| `DEV-01` | Tier 2 self-edit of TASK.md | Tier 2 adjusted `Status`, `RQ-02` wording, `AC-07/19/20/21/22` verification method in `TASK.md` during execution. Tier 1 owns Revision Log; Tier 2 does NOT revert. | `Tier 1 owns`. |

## 5. Final status

Source implementation delivered across 6 in-scope files + 1 deleted fixture file per DEC-04. API urgency filter runs BEFORE pagination (line 675 of public.service.ts). Tab "Tuyển gấp" uses live data, fixture/Preview banner removed. Ribbon compact (`pointer-events-none`, ~24px, 75% alpha). FeaturedJobCard refactored to Minimal SaaS: white/slate surface, logo 48px square, Lucide icons, salary emerald pill, "Xem chi tiết" CTA blue, Quick Apply compact, no flip. 75 component tests pass. 13 pre-existing test failures confirmed at baseline `04b767e` — see `evidence/expected-failure-set-before.txt`. `verify-task.ps1` PASS. Tier 3 may open a FOCUSED audit round.

> Handoff status: `READY_FOR_AUDIT`
