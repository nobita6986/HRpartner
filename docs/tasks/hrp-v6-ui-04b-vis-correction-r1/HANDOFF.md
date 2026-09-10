# HANDOFF — `hrp-v6-ui-04b-vis-correction-r1`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-vis-correction-r1` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `1` |
| Baseline | `465f811a2b311c0144db5078e5efaf43a20b37e8` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:** VIS-01 (ribbon label + title collision), VIS-02 (salary pill bg-primary-fixed), VIS-03 (eyebrow text-primary-dark)
- **Changed:**
  - `src/domains/job-board/components/landing/featured-job-card.tsx` — VIS-01 ribbon label + title padding, VIS-02 salary pill
  - `src/domains/job-board/components/landing/areas-section.tsx` — VIS-03 eyebrow token
  - `src/domains/job-board/public-ui-premium.static.test.ts` — VIS-02 fence test assertion
- **Lane escalation:** `No`

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath ...` | `RESULT: PASS` | None |
| `AC-01` | `E-01` | Ribbon label "Tuyển gấp" verified | `None` |
| `AC-02` | `E-02` | Title padding `pr-[64px]` conditional verified | `None` |
| `AC-03` | `E-03` | Collision invariant: HrMonogram w-16 h-16 + ribbon absolute top-0 right-0 + pr-[64px] | `None` |
| `AC-04` | `E-04` | Salary pill `bg-primary-fixed` verified | `None` |
| `AC-05` | `E-05` | Eyebrow `text-primary-dark` verified | `None` |
| `AC-06` | `E-06` | Fence test VIS-02 comment + assertion updated | `None` |
| `AC-07` | `E-07` | No fake data strings found | `None` |
| `AC-08` | `E-08` | Scope discipline verified (3 source files only) | `None` |
| `AC-09` | `E-09` | Gates 1,2,4,5 PASS; Gate 3 pre-existing failure (baseline `465f811a`, `npm run test:unit` on baseline confirms same 1 failure) | None |
| `AC-10` | Status | AWAITING_OWNER_LIVE_VISUAL_REVIEW | Owner will confirm post-deploy |
| `AC-14` | `BLOCKED` | Owner visual review pending post-deploy | DEC-08: no screenshot gate |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `Select-String -Path featured-job-card.tsx -Pattern "TUYỂN GẤP\|uppercase tracking-wider"` | 0 matches | `evidence/ac01-ribbon-label.txt` |
| `E-02` | `Select-String -Path featured-job-card.tsx -Pattern "pr-\[64px\]"` | >=1 match | `evidence/ac02-title-padding.txt` |
| `E-03` | `Select-String -Path featured-job-card.tsx -Pattern "w-16 h-16"` + `Select-String -Path featured-job-card.tsx -Pattern "absolute top-0 right-0"` | both >=1 match | `evidence/ac03-collision-invariant.txt` |
| `E-04` | `Select-String -Path featured-job-card.tsx -Pattern "bg-primary-fixed"` | >=1 match | `evidence/ac04-salary-token.txt` |
| `E-05` | `Select-String -Path areas-section.tsx -Pattern "text-primary-dark"` | >=1 match | `evidence/ac05-eyebrow-token.txt` |
| `E-06` | `Select-String -Path public-ui-premium.static.test.ts -Pattern "VIS-02.*bg-primary-fixed"` | >=1 match | `evidence/ac06-fence-update.txt` |
| `E-07` | `Select-String -Path featured-job-card.tsx,areas-section.tsx -Pattern fake strings` | 0 matches | `evidence/ac07-truth-fence.txt` |
| `E-08` | `git diff --name-only` vs baseline | 3 source files only | `evidence/ac08-scope-discipline.txt` |
| `E-09` | `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` exit 1 (1 pre-existing failure at baseline `465f811a`); `npm run build` exit 0; `verify-task.ps1` exit 0 RESULT: PASS; see `evidence/ac09-gates.txt` | Gates 1,2,4,5 PASS; Gate 3 has 1 pre-existing failure (baseline `465f811a2b311c0144db5078e5efaf43a20b37e8`; repro: `git stash && git checkout 465f811a && npm run test:unit 2>&1 | Select-String design-tokens`) | `evidence/ac09-gates.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision |
|---|---|---|---|
| BLK-01 | Pre-existing failure | Gate 3 (`npm run test:unit`): 1 failure in `design-tokens.static.test.ts` — RQ-04/AC-03, CSS variable resolution. Baseline `465f811a2b311c0144db5078e5efaf43a20b37e8` confirmed same failure with zero working-tree changes. Repro command: `git stash && git checkout 465f811a && npm run test:unit 2>&1 | Select-String design-tokens`. **Not caused by Tier 2 changes.** | Known pre-existing; tracked separately |

## 5. Final status

`READY_FOR_REVIEW` — All VIS-01/02/03 changes implemented and gated. verify-task.ps1 PASS (Tier 1 commit 4763769 resolved the prior A-04 blocker). Gate 3 has 1 pre-existing failure at baseline `465f811a` unrelated to this round. Owner live visual review (AC-10/AC-14) pending post-deploy.

> Handoff status: `READY_FOR_REVIEW`
