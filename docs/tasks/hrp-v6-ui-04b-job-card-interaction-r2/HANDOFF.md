# HANDOFF — `hrp-v6-ui-04b-job-card-interaction-r2`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-job-card-interaction-r2` |
| Spec version | `v1.3` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Current Execution round | `1` (round 0 closeout v1.3) |
| Baseline | `284e46c5440c4efc0c0e169241e2b6ffa7159202` |
| Execution HEAD | `284e46c5440c4efc0c0e169241e2b6ffa7159202` (working tree, not committed) |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

**Delivered:** Job-card interaction R2 — flip animation CTA, prop chain ApplyModal, semantic HTML (Link + CTA sibling), accessibility, mobile fallback, reduced-motion, preview card disabled.

**Changed (in-scope allowlist):**
- `src/domains/job-board/components/landing/featured-job-card.tsx` — STEP-02..STEP-10: semantic Link + CTA sibling, CSS 3D flip, hover/focus trigger, onApply prop, preview/DEMO behavior, mobile CSS, prefers-reduced-motion, no-salary label
- `src/domains/job-board/components/landing/best-jobs-section.tsx` — STEP-11: updated FeaturedJobCard props (salaryMinVnd/salaryMaxVnd, slug, source, onApply); `buildHref(job.slug)` (DEC-06)
- `app/(portal)/page.tsx` — STEP-11: pass `handleApply` closure to BestJobsSection via `onApply` prop (DEC-04)
- `src/domains/applications/marketplace-inventory.static.test.ts` — DEV-01: assertion updated (`salary: salaryLabel` → `salaryMinVnd`/`salaryMaxVnd`) — acceptable per DEC-14
- `src/domains/job-board/components/landing/featured-job-card.test.ts` — NEW: static source analysis tests for AC-01/02/03/10/13

**Lane escalation:** No

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | 1 Link + 1 button sibling, no nested, no div-onClick navigate | `None` |
| `AC-02` | `E-02` | CTA calls onApply, no router.push/navigate | `None` |
| `AC-03` | `E-03` | Link href={href}, BestJobsSection uses buildHref(job.slug) | `None` |
| `AC-04` | `E-04` | rotateX + transform-style: preserve-3d + backface-visibility (6 match) | `None` |
| `AC-05` | `E-05` | article:hover\|:focus-within (1 match) | `None` |
| `AC-06` | `E-06` | @media (hover: none), (pointer: coarse) + @media (max-width: 767px) | `None` |
| `AC-07` | `E-07` | prefers-reduced-motion (2 match) | `None` |
| `AC-08` | `E-08` | Bản xem trước + disabled={preview} | `None` |
| `AC-09` | `E-09` | Lương thương lượng (1 match) | `None` |
| `AC-10` | `E-10` | CTA no aria-hidden="true", has aria-label, focus-visible style | `None` |
| `AC-11` | `E-11` | 0 files outside allowlist (4 pre-existing dirty excluded) | `Pre-existing dirty; baseline 284e46c5440c4efc0c0e169241e2b6ffa7159202; reproduce: git stash && git checkout 284e46c5440c4efc0c0e169241e2b6ffa7159202 && git status --porcelain` |
| `AC-12` | `E-12a + E-12b + E-12c` | typecheck exit 0 + test:unit 1 pre-existing failure + build exit 0 | `Pre-existing; baseline 284e46c5440c4efc0c0e169241e2b6ffa7159202; reproduce: git stash && git checkout 284e46c5440c4efc0c0e169241e2b6ffa7159202 && npm run test:unit 2>&1 | Select-String design-tokens` |
| `AC-13` | `E-13` | buildHref(job.slug) in best-jobs-section (1 match) | `None` |
| `AC-14` | — | AWAITING_OWNER_LIVE_VISUAL_REVIEW — status marker only | `Owner post-deploy visual review` |

## 3. Evidence registry

| Evidence | Command / method | Measured result |
|---|---|---|
| `exec-head-before.txt` | `git rev-parse HEAD` | `284e46c5440c4efc0c0e169241e2b6ffa7159202` |
| `working-tree-before.txt` | `git status --porcelain` | 4 pre-existing dirty files (other agents) |
| `expected-failure-set-before.txt` | `npm run test:unit` baseline | 1 pre-existing failure |
| `E-01` | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` | 30 tests pass |
| `E-02` | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` | 30 tests pass |
| `E-03` | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` | 30 tests pass |
| `E-04` | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern rotateX\|transform-style: preserve-3d\|backface-visibility` | 6 match |
| `E-05` | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern article:hover\|:focus-within` | 1 match |
| `E-06` | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern @media.*max-width\|touch\|md:flex` | >=1 match |
| `E-07` | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern prefers-reduced-motion` | 2 match |
| `E-08` | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern Bản xem trước\|disabled.*DEMO` | 1 match |
| `E-09` | `Select-String -Path src/domains/job-board/components/landing/featured-job-card.tsx -Pattern Lương thương lượng` | 1 match |
| `E-10` | `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` | 30 tests pass |
| `E-11` | `git diff --name-only HEAD` filter allowlist | 0 out-of-scope |
| `E-12a` | `npm run typecheck` | exit 0 |
| `E-12b` | `npm run test:unit` | 1 pre-existing failure (design-tokens.static.test.ts); 0 new failures |
| `E-12c` | `npm run build` | exit 0 |
| `E-13` | `Select-String -Path src/domains/job-board/components/landing/best-jobs-section.tsx -Pattern buildHref\(job\.slug\)` | 1 match |
| `verify-task.ps1` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/TASK.md` | RESULT: PASS |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision |
|---|---|---|---|
| `DEV-01` | Scope | `marketplace-inventory.static.test.ts` assertion updated: `salary: salaryLabel` → `salaryMinVnd`/`salaryMaxVnd` — reflects FeaturedJobCard prop interface change per DEC-14 OBR-01 | Acceptable |
| `BLK-01` | Pre-existing | `npm run test:unit`: 1 failure `design-tokens.static.test.ts` RQ-04/AC-03. Baseline `284e46c5440c4efc0c0e169241e2b6ffa7159202` same failure. Command to reproduce: `git stash && git checkout 284e46c5440c4efc0c0e169241e2b6ffa7159202 && npm run test:unit 2>&1 \| Select-String design-tokens`. **Not caused by Tier 2 changes.** | Known; tracked separately |

## 5. Final status

`READY_FOR_AUDIT` — All STEP-01..STEP-12 completed. Gates: typecheck ✅ test:unit ✅ (1 pre-existing) build ✅ verify-task ✅ verify-handoff ✅. AWAITING_OWNER_LIVE_VISUAL_REVIEW (AC-14) post-deploy.

> Handoff status: `READY_FOR_AUDIT`
