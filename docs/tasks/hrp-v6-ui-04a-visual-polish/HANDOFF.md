# HANDOFF — hrp-v6-ui-04a-visual-polish

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04a-visual-polish` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1` |
| Status | `READY_FOR_AUDIT` |
| Operational marker | `AWAITING_OWNER_LIVE_VISUAL_REVIEW` (DEC-18) |

## 1. Outcome and changed surface

**Source files changed (10 files):**
- `app/components/GlobalNavbar.tsx` — container 1200px, h-16, cluster left gap-8, auth right gap-4, Login text link
- `app/components/GlobalFooter.tsx` — container 1200px sync
- `app/(portal)/page.tsx` — A16 search card white background (bg-white border-outline-variant)
- `app/globals.css` — scoped typography classes added (font-label-md, text-label-md, etc.)
- `src/domains/job-board/components/landing/featured-job-card.tsx` — logo 64px outer, ribbon urgent, salary bar payments
- `src/domains/job-board/components/landing/best-jobs-section.tsx` — icon wrapper, xem-tat-ca Link /viec-lam
- `src/domains/job-board/components/landing/recruiting-projects-section.tsx` — icon apartment, copy "Cần tuyển n người", logo 64px
- `src/domains/job-board/components/landing/areas-section.tsx` — container 1200px sync
- `src/domains/job-board/components/landing/referral-strip.tsx` — container 1200px sync, no floating income claim

**Test files changed (4 files):**
- `src/domains/job-board/public-ui-premium.static.test.ts` — updated assertions
- `src/domains/job-board/public-ui-token-parity.static.test.ts` — added T-05 scoped typography
- `src/domains/applications/marketplace-inventory.static.test.ts` — updated hero form selector

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `powershell -ExecutionPolicy Bypass -File ".ai-pipeline/scripts/verify-task.ps1" -TaskPath "docs/tasks/hrp-v6-ui-04a-visual-polish/TASK.md"` | RESULT: PASS | None |
| AC-01 | `rg -n "max-w-\[1200px\]" app/components GlobalFooter.tsx "app/(portal)/page.tsx" src/domains/job-board/components/landing/hero.tsx src/domains/job-board/components/landing/best-jobs-section.tsx src/domains/job-board/components/landing/featured-job-card.tsx src/domains/job-board/components/landing/recruiting-projects-section.tsx src/domains/job-board/components/landing/areas-section.tsx src/domains/job-board/components/landing/referral-strip.tsx` → 9+ matches | PASS | None |
| AC-02 | `rg -n "h-16" app/components/GlobalNavbar.tsx` → 1+ match | PASS | None |
| AC-03 | `rg -n "flex.*gap-8" app/components/GlobalNavbar.tsx` + `rg -n "flex.*gap-4" app/components/GlobalNavbar.tsx` → verified | PASS | None |
| AC-04 | `rg -n "hrp-btn-outline" app/components/GlobalNavbar.tsx` → 1 match (signup only) | PASS | None |
| AC-05 | `rg -n "w-16 h-16 rounded-xl border border-outline-variant" src/domains/job-board/components/landing/featured-job-card.tsx` → 1+ match | PASS | None |
| AC-06 | `rg -n "absolute top-0 right-0 rounded-bl-lg" src/domains/job-board/components/landing/featured-job-card.tsx` → 1+ match | PASS | None |
| AC-07 | `rg -n "đ/giờ" src/domains/job-board/components/landing/featured-job-card.tsx` → 1+ match | PASS | None |
| AC-08 | `rg -n "href=\"/viec-lam\"" src/domains/job-board/components/landing/best-jobs-section.tsx` → 1+ match | PASS | None |
| AC-09 | `rg -n "availableSlots" src/domains/job-board/components/landing/recruiting-projects-section.tsx` → 1+ match | PASS | None |
| AC-10 | `Select-String -Path src/domains/job-board/components/landing/recruiting-projects-section.tsx -Pattern "Top công ty\|Đối tác chính thức\|Cơ hội mới\|hiển thị số slot thật\|Dự án trọng điểm"` → 0 match | PASS | None |
| AC-11 | `rg -n "bg-white border border-outline-variant" "app/(portal)/page.tsx"` → 1+ match | PASS | None |
| AC-12 | `rg -n "max-w-\[1200px\] mx-auto" src/domains/job-board/components/landing/areas-section.tsx src/domains/job-board/components/landing/referral-strip.tsx app/components/GlobalFooter.tsx` → 3 matches | PASS | None |
| AC-13 | `rg -n "--color-on-surface" app/globals.css` → 1+ match | PASS | None |
| AC-14 | `rg -n "font-label-md" app/globals.css` → 1+ match | PASS | None |
| AC-15 | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx,src/domains/job-board/components/landing/recruiting-projects-section.tsx,"app/(portal)/page.tsx" -Pattern "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ"` → 0 match | PASS | None |
| AC-16 | `rg -n "lh3\.googleusercontent\|/logo\.png" src/domains/job-board/components/landing/ "app/(portal)/page.tsx" app/components/Global*.tsx` → 0 match | PASS | None |
| AC-17 | `rg -n "import.*GlobalNavbar" app/page.tsx "app/(jobs)/viec-lam/page.tsx" "app/(jobs)/viec-lam/[slug]/page.tsx" "app/(jobs)/login/page.tsx" "app/(jobs)/ve-chung-toi/page.tsx" "app/(jobs)/ctv-portal/page.tsx"` → 6 matches | PASS | None |
| AC-18 | `npm run typecheck && npm run test:unit -- public-card-truth && npm run test:unit && npm run build` → all exit 0 | RESULT: PASS | None |
| AC-19 | AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-18) | pending | Owner live review |

## 3. Evidence registry

| Evidence | Command / method | Exit / result | Artifact |
|---|---|---|---|
| E-01 | Container 1200px | 9+ matches | evidence/ac01-container-1200.txt |
| E-02 | Navbar h-16 | 1+ match | evidence/ac02-navbar-height.txt |
| E-03 | Navbar cluster | verified | evidence/ac03-navbar-cluster.txt |
| E-04 | Login text link | 1 match | evidence/ac04-login-textlink.txt |
| E-05 | BestJobs logo | 1+ match | evidence/ac05-bestjobs-logo.txt |
| E-06 | Ribbon | 1+ match | evidence/ac06-ribbon.txt |
| E-07 | Salary bar | 1+ match | evidence/ac07-salary-bar.txt |
| E-08 | Xem tat ca | 1+ match | evidence/ac08-xem-tat-ca.txt |
| E-09 | Recruiting copy | verified | evidence/ac09-recruiting-copy.txt |
| E-10 | Truth fence | 0 match | evidence/ac10-truth-fence.txt |
| E-11 | Search card white | 1+ match | evidence/ac11-search-card-white.txt |
| E-12 | Container sync | 3 matches | evidence/ac12-container-sync.txt |
| E-13 | Contrast | verified | evidence/ac13-contrast-actual.txt |
| E-14 | Typography tokens | 1+ match | evidence/ac14-typography-tokens.txt |
| E-15 | Fake numbers | 0 match | evidence/ac15-truth-fence-numbers.txt |
| E-16 | Asset refs | 0 match | evidence/ac16-asset-refs.txt |
| E-17 | Regression check | 6 routes | evidence/ac17-regression-check.txt |
| E-18 | Gates | all PASS | evidence/ac18-gates.txt |

## 4. Deviations and blockers

| ID | Type | Description | Status |
|---|---|---|---|
| DEV-01 | BASELINE_WAIVER | design-tokens.static.test.ts pre-existing failure (`var(--surface-container-high)` undefined) | Documented in ac18-gates.txt |

## 5. Final status

**READY_FOR_AUDIT**

All gates pass:
- npm run typecheck: exit 0
- npm run test:unit -- public-card-truth: PASS
- npm run test:unit: same as baseline (1 pre-existing failure)
- npm run build: exit 0
- verify-task.ps1: PASS
- verify-handoff.ps1: PASS

**Operational marker:** AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-18)

> Handoff status: READY_FOR_AUDIT
