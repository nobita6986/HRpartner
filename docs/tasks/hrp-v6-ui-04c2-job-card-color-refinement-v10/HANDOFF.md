# HANDOFF — `hrp-v6-ui-04c2-job-card-color-refinement-v10`

> Tier 2 → Tier 1. FAST lane. Owner live visual review pending.

---

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c2-job-card-color-refinement-v10` |
| Planner | Tier 1 |
| Engineer | Tier 2 (this execution) |
| Baseline HEAD | `9f593fa89c840d3ca48d6fbf016f996a1b9bc005` |
| Execution round | `1` |
| Spec version | `v1.0` (16 Owner decisions chốt 10/09/2026 tại `evidence/owner-job-card-color-refinement-decisions.md`) |
| Status | `READY_FOR_REVIEW` |

---

## 1. Outcome Summary

### Delivered

All 16 Owner decisions + 5 interaction invariants implemented per RQ-01..RQ-21:

- **RQ-01**: CTA "Xem chi tiết" outline/ghost (`border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`)
- **RQ-02**: CTA "Ứng tuyển" brand cam (`bg-primary text-white hover:bg-primary-dark`)
- **RQ-03**: Salary pill `border border-emerald-100`
- **RQ-04**: Title `text-base font-semibold leading-snug line-clamp-2` + `title={job.title}`
- **RQ-05**: Button font `text-sm font-medium` (unchanged)
- **RQ-06**: Footer padding `px-4 py-3`
- **RQ-07**: Footer gap `gap-2 sm:gap-3`
- **RQ-08**: Footer layout `justify-between flex-wrap`
- **RQ-09**: Separator `border-t border-slate-200`
- **RQ-10..12**: Radius, border, shadow giữ nguyên
- **RQ-13**: ARIA accessible name
- **RQ-14**: Mobile label visible (no `hidden sm:inline`)
- **RQ-15**: Test file 14 new test cases
- **RQ-16**: Surface `bg-white border border-slate-200 rounded-xl shadow-sm`
- **RQ-17/18/21**: Invariants kept
- **RQ-19**: Bubble prevention (`stopPropagation` + `preventDefault`)
- **RQ-20**: Hover/focus contrast

### Not delivered

`<None>`

### Changed deliverables

- `src/domains/job-board/components/landing/featured-job-card.tsx`
- `src/domains/job-board/components/landing/featured-job-card.test.ts`

### Lane escalation

`<No>`

---

## 2. Execution Trace

| Step | Action | Result |
|---|---|---|
| STEP-01 | Baseline capture | PASS |
| STEP-02 | Skeleton invariant guard read | PASS |
| STEP-03 | CTA "Xem chi tiết" outline | PASS |
| STEP-04 | CTA "Ứng tuyển" primary brand + bubble prevention | PASS |
| STEP-05 | Salary pill border-emerald-100 | PASS |
| STEP-06 | Title text-base + line-clamp-2 | PASS |
| STEP-07 | Footer padding + separator | PASS |
| STEP-08 | Footer layout justify-between + gap responsive | PASS |
| STEP-09 | Ribbon no pr-[72px] | PASS |
| STEP-10 | ARIA + mobile label | PASS |
| STEP-11 | Test file updates | PASS |
| STEP-12 | Invariant smoke check | PASS |
| STEP-99 | Mandatory gates | PASS |

---

## 3. Acceptance Evidence

| AC | Evidence | Command | Result | Limitation |
|---|---|---|---|---|
| verify-task.ps1 | `evidence/typecheck.txt` | powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md | RESULT: PASS | None |
| AC-00 | `evidence/ac00-invariants.txt` | rg "bg-white border-slate-200 rounded-xl" | PASS | None |
| AC-01 | `evidence/ac01-xem-chi-tiet-ghost.txt` | rg "border border-slate-300 bg-white text-slate-700" | PASS | None |
| AC-02 | `evidence/ac02-ung-tuyen-cam.txt` | rg "bg-primary.*text-white" | PASS | None |
| AC-03 | `evidence/ac03-salary-pill.txt` | rg "bg-emerald-50.*border-emerald-100" | PASS | None |
| AC-04 | `evidence/ac04-title.txt` | rg "text-base font-semibold leading-snug line-clamp-2" | PASS | None |
| AC-05 | `evidence/ac05-button-font.txt` | rg "text-sm font-medium" | PASS | None |
| AC-06 | `evidence/ac06-footer-padding-separator.txt` | rg "px-4 py-3 border-t border-slate-200" | PASS | None |
| AC-07 | `evidence/ac07-footer-layout.txt` | rg "justify-between flex-wrap" | PASS | None |
| AC-08 | `evidence/ac08-aria.txt` | rg "aria-label.*Ứng tuyển nhanh" | PASS | None |
| AC-09 | `evidence/ac09-mobile-label.txt` | rg "hidden sm:inline" | PASS | None |
| AC-10 | `evidence/ac10-test.txt` | npm run test:unit -- --reporter=basic | PASS | None |
| AC-11 | `evidence/ac11-surface.txt` | rg "bg-white border border-slate-200 rounded-xl shadow-sm" | PASS | None |
| AC-12 | `evidence/ac12-regression.txt` | git diff --name-only | PASS | None |
| AC-13 | `evidence/ac-gates.txt` | verify-task.ps1 + verify-handoff.ps1 | RESULT: PASS | None |
| AC-14 | `evidence/ac-gates.txt` | Owner live review post-deploy | PENDING | Manual review by Owner after deploy |

---

## 4. Changed Deliverables

| File | Change |
|---|---|
| `src/domains/job-board/components/landing/featured-job-card.tsx` | 16 Owner decisions applied |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | 14 new test cases |

---

## 5. Deviations

### Pre-existing baseline failures

Baseline: **13 test failures** (pre-existing)
After execution: **13 test failures** (same, 0 new)

### Blockers

`<None>`

---

## 6. Evidence Index

| ID | Artifact | Purpose |
|---|---|---|
| E-01 | `evidence/exec-head-before.txt` | Baseline HEAD |
| E-02 | `evidence/working-tree-before.txt` | Working tree status |
| E-03 | `evidence/expected-failure-set-before.txt` | Unit test baseline |
| E-04 | `evidence/typecheck.txt` | TypeScript check |
| E-05 | `evidence/test-unit.txt` | Unit test output |
| E-06 | `evidence/build.txt` | Build output |
| E-07 | `evidence/ac00-invariants.txt` | AC-00 |
| E-08 | `evidence/ac01-xem-chi-tiet-ghost.txt` | AC-01 |
| E-09 | `evidence/ac02-ung-tuyen-cam.txt` | AC-02 |
| E-10 | `evidence/ac03-salary-pill.txt` | AC-03 |
| E-11 | `evidence/ac04-title.txt` | AC-04 |
| E-12 | `evidence/ac05-button-font.txt` | AC-05 |
| E-13 | `evidence/ac06-footer-padding-separator.txt` | AC-06 |
| E-14 | `evidence/ac07-footer-layout.txt` | AC-07 |
| E-15 | `evidence/ac08-aria.txt` | AC-08 |
| E-16 | `evidence/ac09-mobile-label.txt` | AC-09 |
| E-17 | `evidence/ac10-test.txt` | AC-10 |
| E-18 | `evidence/ac11-surface.txt` | AC-11 |
| E-19 | `evidence/ac12-regression.txt` | AC-12 |
| E-20 | `evidence/ac-gates.txt` | AC-13 |

---

## 7. Execution Round History

| Round | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-09-10 | READY_FOR_REVIEW | 16 Owner decisions + 5 interaction invariants delivered |

---

> **Handoff status: READY_FOR_REVIEW** (FAST)
