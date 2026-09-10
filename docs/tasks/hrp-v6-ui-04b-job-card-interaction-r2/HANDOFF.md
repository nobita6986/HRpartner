# HANDOFF — `hrp-v6-ui-04b-job-card-interaction-r2`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-job-card-interaction-r2` |
| Spec version | `v1.4` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Current Execution round | `1` (round 1 — VIS-04/VIS-05 correction; Owner R1 FAIL) |
| Baseline | `334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7` (HEAD = v1.4 TASK commit) |
| Execution HEAD | `334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7` (working tree, not committed) |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

**Delivered:** Round 1 correction — VIS-04 (CTA capsule removal) + VIS-05 (hover label contrast). Preserve flip timing, salary front face, semantic Link/button sibling, ApplyModal callback, preview disabled, mobile fallback, reduced-motion, buildHref(job.slug).

**Changed (in-scope allowlist):**
- `src/domains/job-board/components/landing/featured-job-card.tsx` — STEP-13 (VIS-04): removed `bg-primary-container p-3` from `.action-area-back`; STEP-14 (VIS-05): removed `hover:text-primary-container` from CTA button. Only visual treatment changes; semantic HTML/prop chain preserved per DEC-17.
- `src/domains/job-board/components/landing/featured-job-card.test.ts` — NEW: AC-15 (capsule removal) + AC-16 (hover contrast) tests (7 new tests, 37 total).

**Lane escalation:** No

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` (round 0) | 1 Link + 1 button sibling, no nested, no div-onClick navigate | `None` |
| `AC-02` | `E-02` (round 0) | CTA calls onApply, no router.push/navigate | `None` |
| `AC-03` | `E-03` (round 0) | Link href={href}, BestJobsSection uses buildHref(job.slug) | `None` |
| `AC-04` | `E-04` (round 0) | rotateX + transform-style: preserve-3d + backface-visibility (6 match) | `None` |
| `AC-05` | `E-05` (round 0) | article:hover\|:focus-within (1 match) | `None` |
| `AC-06` | `E-06` (round 0) | @media (hover: none), (pointer: coarse) + @media (max-width: 767px) | `None` |
| `AC-07` | `E-07` (round 0) | prefers-reduced-motion (2 match) | `None` |
| `AC-08` | `E-08` (round 0) | Bản xem trước + disabled={preview} | `None` |
| `AC-09` | `E-09` (round 0) | Lương thương lượng (1 match) | `None` |
| `AC-10` | `E-10` (round 0) | CTA no aria-hidden="true", has aria-label, focus-visible style | `None` |
| `AC-11` | `E-11` (round 0) | 0 files outside allowlist (12 pre-existing dirty excluded) | `Pre-existing dirty; baseline 334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7; reproduce: git stash && git checkout 334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7 && git status --porcelain` |
| `AC-12` | `E-12a + E-12b + E-12c` | typecheck exit 0 + test:unit 1 pre-existing failure + build exit 0 | `Pre-existing; baseline 334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7; reproduce: git stash && git checkout 334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7 && npm run test:unit 2>&1 \| Select-String design-tokens` |
| `AC-13` | `E-13` (round 0) | buildHref(job.slug) in best-jobs-section (1 match) | `None` |
| `AC-14` | — | AWAITING_OWNER_LIVE_VISUAL_REVIEW_R2 — status marker only | `Owner R2 live visual review after Tier 3 audit` |
| `AC-15` | `E-15` | `.action-area-back` no longer has `bg-primary-container` or `p-3`; CTA is single filled surface | `None` |
| `AC-16` | `E-16` | CTA button no `hover:text-primary-container`; contrasting pair preserved (bg-primary/text-white rest, hover:bg-primary-container/text-white) | `None` |
| `AC-17` | `E-17` | Regression gate: 37 tests pass (30 round 0 + 7 new AC-15/16); git diff scope: only featured-job-card.tsx + test | `None` |

## 3. Evidence registry

| Evidence | Command / method | Measured result |
|---|---|---|
| `r1-exec-head-before.txt` | `git rev-parse HEAD` | `334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7` |
| `r1-working-tree-before.txt` | `git status --porcelain` | 12 pre-existing dirty/untracked files |
| `r1-expected-failure-set-before.txt` | `npm run test:unit` baseline | 1 pre-existing failure |
| `E-01` | `npx vitest run featured-job-card.test.ts` | 30 tests pass (round 0) |
| `E-02` | `npx vitest run featured-job-card.test.ts` | 30 tests pass (round 0) |
| `E-03` | `npx vitest run featured-job-card.test.ts` | 30 tests pass (round 0) |
| `E-04` | `Select-String featured-job-card.tsx -Pattern rotateX\|transform-style: preserve-3d\|backface-visibility` | 6 match |
| `E-05` | `Select-String featured-job-card.tsx -Pattern article:hover\|:focus-within` | 1 match |
| `E-06` | `Select-String featured-job-card.tsx -Pattern @media.*max-width\|touch\|md:flex` | >=1 match |
| `E-07` | `Select-String featured-job-card.tsx -Pattern prefers-reduced-motion` | 2 match |
| `E-08` | `Select-String featured-job-card.tsx -Pattern Bản xem trước\|disabled.*DEMO` | 1 match |
| `E-09` | `Select-String featured-job-card.tsx -Pattern Lương thương lượng` | 1 match |
| `E-10` | `npx vitest run featured-job-card.test.ts` | 30 tests pass (round 0) |
| `E-11` | `git diff --name-only 334bc2a` filter allowlist | 0 out-of-scope |
| `E-12a` | `npm run typecheck` | exit 0 |
| `E-12b` | `npm run test:unit` | 1 pre-existing failure (design-tokens.static.test.ts); 0 new failures |
| `E-12c` | `npm run build` | exit 0 |
| `E-13` | `Select-String best-jobs-section.tsx -Pattern buildHref\(job\.slug\)` | 1 match |
| `E-15` | `Select-String featured-job-card.tsx -Pattern "action-area-back absolute"` + file inspection | Line 136: `action-area-back absolute inset-0 flex items-center justify-center rounded-xl rotate-x-180 backface-hidden` — NO `bg-primary-container` or `p-3` |
| `E-16` | `Select-String featured-job-card.tsx -Pattern "hover:text-primary-container"` + CTA button inspection | 0 matches on CTA button; remaining `group-hover:text-primary-container` is on card title, not CTA |
| `E-17` | `npx vitest run featured-job-card.test.ts` | 37 tests pass (30 original + 7 new AC-15/16 tests) |
| `verify-task.ps1` | `powershell .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` | RESULT: PASS |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision |
|---|---|---|---|
| `BLK-01` | Pre-existing | `npm run test:unit`: 1 failure `design-tokens.static.test.ts` RQ-04/AC-03 (`app/admin/jobs/job-opening-status-card.tsx:67 var(--surface-container-high)`). Baseline `334bc2a226af3cdf9a45c70a18dabf62b7ec6aa7` same failure. **Not caused by Tier 2 changes.** | Known; tracked separately |
| `DEV-01` | Scope | Round 0 deviation preserved: `marketplace-inventory.static.test.ts` assertion updated (`salary: salaryLabel` → `salaryMinVnd`/`salaryMaxVnd`) per DEC-14 OBR-01 | Acceptable |

## 5. Final status

`READY_FOR_AUDIT` — All STEP-01, STEP-13, STEP-14 completed. Gates: typecheck ✅ test:unit ✅ (1 pre-existing) build ✅ verify-task ✅ verify-handoff ✅ (HANDOFF updated to v1.4 round 1). AWAITING_TIER3_FOCUSED_AUDIT → Owner R2 live visual review → ACCEPTED → composition/footer + section-render chuyển `READY_FOR_EXECUTION`.

> Handoff status: `READY_FOR_AUDIT`
