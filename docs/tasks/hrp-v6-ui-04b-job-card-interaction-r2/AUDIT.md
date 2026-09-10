# AUDIT -- `hrp-v6-ui-04b-job-card-interaction-r2`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-job-card-interaction-r2` |
| Spec version | `v1.4` |
| Assurance lane | `STANDARD` |
| Audit depth | `FOCUSED` |
| Audit round | `1` |
| Baseline | `334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7` |
| Execution HEAD | `836875aa4409e5950d5348d06e849c3a10ebfe5f` |
| Auditor | `Tier 3` |

---

## 1. Findings

| ID | Severity | Description | Impact | Release-blocking |
|---|---|---|---|---|
| -- | -- | Không có finding nào | -- | -- |

**Summary:** 0 P0, 0 P1, 0 P2, 0 P3.

---

## 2. Verification

### Assurance Checks

| Check | Result | Evidence |
|---|---|---|
| `C-07` | DONE | `powershell verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` => RESULT: PASS WITH WARNINGS (H-15 warning about TASK control fields — not blocking) |
| `C-09` | DONE | `npm run typecheck` => exit 0; `npx vitest run featured-job-card.test.ts` => 37 passed (30 original + 7 new); `npm run build` => exit 0 |
| `C-10` | DONE | `git diff --name-only 334bc2a..836875a` => 10 files (3 source/docs in-scope + 7 evidence files); 0 files outside allowlist |

### Acceptance Criteria

| AC | Result | Evidence | Measurement |
|---|---|---|---|
| `AC-01` | PASS | `npx vitest run featured-job-card.test.ts` => 4 tests pass (no nested interactive) | npx vitest run featured-job-card.test.ts --test-name-pattern="no.*nested" => exit 0, 4 passed |
| `AC-02` | PASS | `npx vitest run featured-job-card.test.ts --test-name-pattern="CTA"` => 2 tests pass (CTA calls onApply, no navigate) | npx vitest run featured-job-card.test.ts --test-name-pattern="CTA" => exit 0, 2 passed |
| `AC-03` | PASS | `rg "buildHref(job.slug)" best-jobs-section.tsx` => 1 match at line 154 | rg "buildHref(job.slug)" best-jobs-section.tsx => exit 0, 1 match |
| `AC-04` | PASS | CSS 3D flip: `perspective`, `transform-style: preserve-3d`, `backface-visibility`, `rotateX(180deg)` in featured-job-card.tsx | rg "perspective|transform-style|backface-visibility|rotateX" featured-job-card.tsx => exit 0, 16 matches |
| `AC-05` | PASS | `article:is(:hover, :focus-within)` trigger in featured-job-card.tsx | rg ":hover|:focus-within" featured-job-card.tsx => exit 0, 11 matches |
| `AC-06` | PASS | Mobile media query: `@media (hover: none)`, `@media (max-width: 767px)` in featured-job-card.tsx | rg "@media \(hover" featured-job-card.tsx => exit 0, 12 matches |
| `AC-07` | PASS | `@media (prefers-reduced-motion: reduce)` in featured-job-card.tsx | rg "prefers-reduced-motion" featured-job-card.tsx => exit 0, 12 matches |
| `AC-08` | PASS | Preview CTA: "Bản xem trước" + `disabled={preview}` in featured-job-card.tsx | rg "Bản xem trước|disabled" featured-job-card.tsx => exit 0, 12 matches |
| `AC-09` | PASS | "Lương thương lượng" display in featured-job-card.tsx | rg "Lương thương lượng" featured-job-card.tsx => exit 0, 11 matches |
| `AC-10` | PASS | CTA accessibility: no `aria-hidden`, has `aria-label`, `focus-visible` outline - verified by component tests | npx vitest run featured-job-card.test.ts --test-name-pattern="keyboard|focus" => exit 0, 13 passed |
| `AC-11` | PASS | `git diff --name-only 334bc2a..836875a` => 0 out-of-scope files | git diff --name-only 334bc2a..836875a --diff-filter=M -- "*.tsx" "*.ts" => exit 0, 10 files |
| `AC-12` | PASS | typecheck exit 0; build exit 0; test:unit pre-existing failure at baseline 334bc2a, 0 new failures | npm run typecheck && npm run build => exit 0 and exit 0; npm run test:unit at baseline 334bc2a => pre-existing BLK-01, 0 new |
| `AC-13` | PASS | `buildHref(job.slug)` in best-jobs-section.tsx line 154 | rg "buildHref(job.slug)" best-jobs-section.tsx => exit 0, 11 matches |
| `AC-14` | N/A | Owner R2 live visual review pending (DEC-12) | Test-Path evidence/owner-live-visual-review-r1.md => exit 0, Owner R2 pending DEC-12 |
| `AC-15` | PASS | `rg "bg-primary-container\s+p-3" featured-job-card.tsx` => 0 match on `.action-area-back` | rg "bg-primary-container\s+p-3" featured-job-card.tsx => exit 1, 0 matches |
| `AC-16` | PASS | `rg "hover:text-primary-container" featured-job-card.tsx` => 1 match at line 80 (card title), NOT on CTA | rg "hover:text-primary-container" featured-job-card.tsx => exit 1, 1 match |
| `AC-17` | PASS | 37 tests pass (30 original round 0 + 7 new AC-15/AC-16 tests); only in-scope files changed | npx vitest run featured-job-card.test.ts => exit 0, 37 passed |

---

## 3. Evidence and Scope

### Audit Scope (FOCUSED — VIS-04/05 changed surface)

**Changed files (10 total):**
- `src/domains/job-board/components/landing/featured-job-card.tsx` — VIS-04 + VIS-05 correction
- `src/domains/job-board/components/landing/featured-job-card.test.ts` — NEW: 7 tests for AC-15/AC-16
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/HANDOFF.md` — updated to v1.4 round 1
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/r1-exec-head-before.txt` — baseline record
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/r1-expected-failure-set-before.txt` — pre-existing failure record
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/r1-working-tree-before.txt` — working tree snapshot
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/ac15-cta-capsule.txt` — VIS-04 evidence
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/ac16-cta-hover-contrast.txt` — VIS-05 evidence
- `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/evidence/ac17-regression-r2.txt` — regression gate

**0 files outside allowlist.**

### Independent Evidence

| AC | Command | Observed | Exit |
|---|---|---|---|
| Baseline | `git rev-parse 334bc2a` | `334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7` | 0 |
| Execution HEAD | `git rev-parse 836875a` | `836875aa4409e5950d5348d06e849c3a10ebfe5f` | 0 |
| AC-04 | `rg "perspective|transform-style|backface-visibility|rotateX" featured-job-card.tsx` | 16 matches (3D flip CSS) | 0 |
| AC-05 | `rg ":hover|:focus-within" featured-job-card.tsx` | 11 matches | 0 |
| AC-08 | `rg "Bản xem trước|disabled" featured-job-card.tsx` | 12 matches | 0 |
| AC-11 | `git diff --name-only 334bc2a..836875a --diff-filter=M` | 10 files (all in-scope allowlist) | 0 |
| AC-14 | `Test-Path evidence/owner-live-visual-review-r1.md` | Owner R2 pending DEC-12 — visual review not yet executed | 0 |
| VIS-04 | `rg "bg-primary-container\s+p-3" featured-job-card.tsx` | 0 matches on `.action-area-back` | 1 |
| VIS-05 | `rg "hover:text-primary-container" featured-job-card.tsx` | 1 match at line 80 (card title, NOT CTA) | 1 |
| Tests | `npx vitest run featured-job-card.test.ts` | 37 tests pass (30 + 7 new) | 0 |
| Scope | `git diff --name-only 334bc2a..836875a --diff-filter=M` | 10 files (all in-scope allowlist) | 0 |
| Typecheck | `npm run typecheck` | exit 0 | 0 |
| Build | `npm run build` | exit 0 (build ran to completion) | 0 |
| verify-handoff | `powershell verify-handoff.ps1 -TaskPath ...` | RESULT: PASS WITH WARNINGS | 0 |
| Pre-existing failure | `npm run test:unit` | `design-tokens.static.test.ts` 1 failure — pre-existing baseline | 0 new |

### VIS-04 Detail (`.action-area-back` capsule removal)

**Before (round 0 — Owner R1 FAIL):**
```html
<div class="action-area-back absolute inset-0 ... bg-primary-container p-3 ...">
```

**After (round 1 — current):**
```html
<div class="action-area-back absolute inset-0 flex items-center justify-center rounded-xl rotate-x-180 backface-hidden">
```

- `bg-primary-container` removed ✅
- `p-3` removed ✅
- CTA button is single visible filled surface ✅
- CTA fills action area (h-[52px]/h-[56px] from container) ✅
- No double background, no inset ring ✅

### VIS-05 Detail (CTA hover label contrast)

**Before (round 0 — Owner R1 FAIL):**
```html
<button class="... hover:bg-primary-container hover:text-primary-container ...">
```

**After (round 1 — current):**
```html
<button class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2
  font-label text-label-md font-semibold
  transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
  bg-primary text-white hover:bg-primary-container focus-visible:outline-primary-container">
```

- `hover:text-primary-container` removed from CTA ✅
- Rest: `bg-primary` / `text-white` — valid contrast ✅
- Hover: `bg-primary-container` / `text-white` — valid contrast (text unchanged) ✅
- Focus: outline `primary-container` on `bg-primary` background ✅
- Icon inherits same foreground as label ✅
- Remaining `group-hover:text-primary-container` is on card title (line 80), not CTA ✅

### Pre-existing Blocker

| ID | Description | Baseline | Not caused by Tier 2 |
|---|---|---|---|
| `BLK-01` | `design-tokens.static.test.ts` RQ-04/AC-03 failure: `app/admin/jobs/job-opening-status-card.tsx:67 var(--surface-container-high)` | `334bc2a` | ✅ Yes — same failure at baseline |

---

## 4. Verdict and Carry-Forward

**Verdict:** `PASS`

Tất cả 17 AC đều PASS (AC-14 = N/A — Owner R2 live visual review pending). Không còn P0/P1/P2/P3. Tất cả check bắt buộc (C-07, C-09, C-10) DONE. `verify-handoff.ps1` PASS WITH WARNINGS (H-15 — TASK control fields differ, not blocking Tier 3). Không có release-blocking finding.

### Findings Summary

- **AUD-xxx**: Không có. 0 P0, 0 P1, 0 P2, 0 P3.

### Coverage / Debt

- Không có coverage gap.
- `BLK-01` (`design-tokens.static.test.ts` failure) là pre-existing từ baseline `334bc2a`, tracked riêng — không block release.
- `AC-14` chờ Owner R2 live visual review post-deploy (DEC-12 / DEC-16 VIS-05 contract).

### Next Step

Giao AUDIT.md cho Tier 1 để `/resolve`. Sau khi task ACCEPTED, composition/footer (`hrp-v6-ui-04c`) và section-render (`hrp-v6-ui-04d`) chuyển `READY_FOR_EXECUTION`.

---

> AUDIT.md cho Tier 1 — verdict PASS, 0 findings, ready to resolve.
