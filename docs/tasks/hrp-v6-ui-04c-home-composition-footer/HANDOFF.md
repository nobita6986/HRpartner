# HANDOFF — `hrp-v6-ui-04c-home-composition-footer`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04c-home-composition-footer` |
| Spec version | `v1.4` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Current Execution round | `1` |
| Baseline | `55b27d28b47e59d8bca72e4cb7c4c3714ea267ec` |
| Execution HEAD | `69f786ceabe65bd71d171e3a730d5b77d876df8b` (working tree, not committed) |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

**Delivered:** RQ-01 (BestJobs refactor → bootstrapBestJobs, inline list removed, Hero navigates via router.push), RQ-02 (ReferralStrip peach bg), RQ-03/RQ-04/RQ-06 (Footer 3-column rebuild with Owner content), RQ-05 (ContactForm component), RQ-08/RQ-10/RQ-11 (VIS-06: 1080px container for all homepage sections).

**Changed (in-scope allowlist):**
- `app/(portal)/page.tsx` — STEP-02: bootstrapBestJobs, inline list removed, Hero navigate
- `app/components/GlobalNavbar.tsx` — VIS-06: container 1080px
- `app/components/GlobalFooter.tsx` — STEP-04: 3-column rebuild
- `app/components/ContactForm.tsx` — NEW: STEP-05: ContactForm component
- `src/domains/job-board/components/landing/hero.tsx` — VIS-06: container 1080px
- `src/domains/job-board/components/landing/best-jobs-section.tsx` — VIS-06: container 1080px
- `src/domains/job-board/components/landing/areas-section.tsx` — VIS-06: container 1080px
- `src/domains/job-board/components/landing/recruiting-projects-section.tsx` — VIS-06: container 1080px
- `src/domains/job-board/components/landing/referral-strip.tsx` — STEP-03: peach bg + VIS-06: container 1080px
- `src/domains/job-board/public-ui-premium.static.test.ts` — VIS-06: test assertions updated
- `src/domains/applications/marketplace-inventory.static.test.ts` — RQ-01: test assertions updated
- `src/domains/job-board/public-listing.static.test.ts` — RQ-01: test assertions updated
- `src/domains/job-board/public-detail.static.test.ts` — RQ-01: test assertions updated
- `src/domains/job-board/public-ui-token-parity.static.test.ts` — RQ-01: test assertions updated

**Lane escalation:** No

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `runQuery`, `sentinelRef`, `generationRef`, `abortRef` removed | `None` |
| `AC-02` | `E-02` | `router.push(buildListingHref(...))` with `offset: 0` in handleSearch + applyArea | `None` |
| `AC-03` | `E-03` | Salary select disabled, label "Mức lương — sắp có" | `None` |
| `AC-04` | `E-04` | `bg-primary-fixed/30` on ReferralStrip | `None` |
| `AC-05` | `E-05` | 3-column footer: Công ty + Dịch vụ + Liên hệ | `None` |
| `AC-06` | `E-06` | tel: links, mailto:, website external | `None` |
| `AC-07` | `E-07` | ContactForm disabled + helper text | `None` |
| `AC-08` | `E-08` | Copyright runtime year, "Phiên bản 6.0" removed | `None` |
| `AC-09` | `E-09` | VIS-06: 1080px container applied | `None` |
| `AC-10` | `E-10` | `max-w-[1080px]` in all 8 homepage sections | `None` |
| `AC-11` | `E-11` | Gutter `px-4 md:px-6`, touch targets preserved | `None` |
| `AC-12` | `E-12` | `featured-job-card.tsx` not modified | `None` |
| `AC-13` | `E-13` | typecheck ✅ test:unit ✅ build ✅ verify-task ✅ | `Pre-existing design-tokens failure; baseline 55b27d28b47e59d8bca72e4cb7c4c3714ea267ec; reproduce: npm run test:unit 2>&1 | Select-String design-tokens` |

## 3. Evidence registry

| Evidence | Command / method | Measured result |
|---|---|---|
| `exec-head-before.txt` | `git rev-parse HEAD` | `55b27d28b47e59d8bca72e4cb7c4c3714ea267ec` |
| `working-tree-before.txt` | `git status --porcelain` | 12 pre-existing untracked files |
| `expected-failure-set-before.txt` | `npm run test:unit` baseline | 1 pre-existing failure |
| `E-01` | `Select-String page.tsx -Pattern "runQuery|sentinelRef|generationRef|abortRef"` | 0 match |
| `E-02` | `Select-String page.tsx -Pattern "router\.push.*buildListingHref"` | >= 2 match |
| `E-03` | `Select-String page.tsx -Pattern "Mức lương — sắp có"` | >= 1 match |
| `E-04` | `Select-String referral-strip.tsx -Pattern "bg-primary-fixed"` | >= 1 match |
| `E-05` | `Select-String GlobalFooter.tsx -Pattern "CÔNG TY TNHH HRP VIỆT NAM|Dịch vụ bốc xếp"` | >= 5 match |
| `E-06` | `Select-String GlobalFooter.tsx -Pattern "tel:02112216999|mailto:nhaluchrp@gmail.com"` | >= 2 match |
| `E-07` | `Select-String ContactForm.tsx -Pattern "Tính năng đang được hoàn thiện"` | >= 1 match |
| `E-08` | `Select-String GlobalFooter.tsx -Pattern "new Date.*getFullYear|Phiên bản 6\.0"` | runtime year match, "Phiên bản 6.0" 0 match |
| `E-09` | `rg max-w-\[1080px\] in-scope files` | >= 7 match |
| `E-10` | `Select-String in-scope files -Pattern "max-w-\[1080px\]"` | 8 homepage sections |
| `E-11` | `Select-String in-scope files -Pattern "px-4 md:px-6"` | All sections |
| `E-12` | `git diff --name-only baseline..HEAD -- featured-job-card.tsx` | 0 changes |
| `E-13a` | `npm run typecheck` | exit 0 |
| `E-13b` | `npm run test:unit` | 1 pre-existing failure (design-tokens), 0 new failures |
| `E-13c` | `npm run build` | exit 0 |
| `verify-task.ps1` | `powershell .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` | RESULT: PASS |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision |
|---|---|---|---|
| `BLK-01` | Pre-existing | `npm run test:unit`: 1 failure `design-tokens.static.test.ts` RQ-04/AC-03. Baseline `55b27d28b47e59d8bca72e4cb7c4c3714ea267ec` same failure. **Not caused by Tier 2 changes.** | Known; tracked separately |

## 5. Final status

`ACCEPTED` (2026-09-10, round 1.4.1) — Tier 2 thi công (composition + VIS-06) → Tier 3 FOCUSED audit PASS (1 OBS flagged Footer 1200px → Owner decision: patch now) → Footer patch → all gates PASS. Visual parity Owner duyệt post-deploy (DEC-11 — không chặn flip, đã có Owner sign-off qua patch decision).

> Handoff status: `ACCEPTED`

## 6. VIS-06 Footer follow-up patch

**Date:** 2026-09-10
**Trigger:** Tier 3 audit flagged GlobalFooter.tsx still had `max-w-[1200px]` → classified as OBS-01. Owner decision: patch now rather than defer.

### What was changed

Three edits in `app/components/GlobalFooter.tsx` (working tree only, not committed):

| # | Change | Location |
|---|---|---|
| 1 | Comment cleanup: `/* RQ-02 / RQ-03 / STEP-04: Container max-w-[1200px] — VIS-06 sẽ đổi thành 1080px ở STEP-08 */` → `/* VIS-06: inner container 1080px */` | Line ~51 |
| 2 | `max-w-[1200px]` → `max-w-[1080px]` (main footer content wrapper) | Line ~52 |
| 3 | `max-w-[1200px]` → `max-w-[1080px]` (copyright bar) | Line ~131 |

### Gate results

| Gate | Command | Expected | Actual |
|---|---|---|---|
| `typecheck` | `npm run typecheck` | exit 0 | **exit 0** ✅ |
| `test:unit` | `npm run test:unit` | 1 pre-existing failure only | **1 pre-existing failure** (`design-tokens.static.test.ts`, same as baseline) ✅ |
| `build` | `npm run build` | exit 0 | **exit 0** ✅ |
| `verify-task` | `.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c-home-composition-footer/TASK.md` | PASS | **PASS (1 warning)** ✅ |

Evidence files written:
- `docs/tasks/hrp-v6-ui-04c-home-composition-footer/evidence/typecheck-after-footer-patch.txt`
- `docs/tasks/hrp-v6-ui-04c-home-composition-footer/evidence/test-unit-after-footer-patch.txt`
- `docs/tasks/hrp-v6-ui-04c-home-composition-footer/evidence/build-after-footer-patch.txt`
- `docs/tasks/hrp-v6-ui-04c-home-composition-footer/evidence/verify-task-after-footer-patch.txt`

### Verification

- `Select-String GlobalFooter.tsx -Pattern "max-w-\[1200px\]"` → **0 matches** ✅
- `Select-String GlobalFooter.tsx -Pattern "max-w-\[1080px\]"` → **2 matches** (lines 52 & 131) ✅

### Status

`READY_FOR_AUDIT` (round 1.4.1) — OBS-01 resolved. No new failures introduced. Working tree only; NOT committed, NOT pushed.
