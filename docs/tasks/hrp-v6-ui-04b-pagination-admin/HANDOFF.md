# HANDOFF — `hrp-v6-ui-04b-pagination-admin`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-pagination-admin` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1` |
| Baseline | `d3add63` |
| Execution HEAD | `ef5fb91d786ed07486ff916a1ce7138c4139f19e` (working tree, not committed) |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:** BestJobs tab `Tất cả` / `Tuyển gấp` with ARIA tablist/tab semantics; BestJobs pagination prev/next + range "Trang X / Y" (tab `all` only); URGENT tab renders from `BEST_JOBS_URGENT_PREVIEW` fixture with `source: 'INTEGRATION_PENDING'` marker and preview badge; separate BestJobs fetch `/api/jobs?limit=9&offset=...` for tab `all`; `pageSize = 9` hardcode literal passed via prop; URGENT tab does NOT send `urgency=URGENT` to server (B4 → AV1).
- **Not delivered:** None within contract.
- **Changed:**
  - `app/(portal)/page.tsx` — STEP-04: `bestJobsTab`, `bestJobsOffset`, `bestJobsData`, `bestJobsLoading` state; `buildBestJobsQuery` fetch; tab `all` uses `bestJobsData.jobs`, tab `urgent` uses `BEST_JOBS_URGENT_PREVIEW`; `BEST_JOBS_PAGE_SIZE = 9` constant; `EnrichedJob` exported for shared type.
  - `src/domains/job-board/components/landing/best-jobs-section.tsx` — STEP-03: refactored with props `jobs, total, pageSize, offset, nextOffset, tab, onTabChange, onPrev, onNext, buildHref, urgentPreviewBadge`; 2 tab pills with ARIA `role="tablist"/role="tab"/aria-selected`; pagination `role="group" aria-label="Phân trang"` (prev/next + "Trang X / Y") when `tab === 'all' && total > pageSize`; `jobs.slice(0, pageSize)` — no hardcoded `.slice(0, 3)`.
  - `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` — STEP-02: NEW file, `BEST_JOBS_URGENT_PREVIEW` (4 items), `id` prefix `preview-urgent-...`, `badgeType: 'urgent'`, `source: 'INTEGRATION_PENDING'`.
  - `src/domains/job-board/public-ui-premium.static.test.ts` — STEP-05: DEC-01/DEC-06 header; 8 new tests for tab/pagination + fixture.
  - `src/domains/job-board/public-ui-token-parity.static.test.ts` — STEP-05: DEC-01 header comment.
  - `src/domains/applications/marketplace-inventory.static.test.ts` — STEP-05: DEC-01 header; 4 new tests for BestJobs tab/pagination; `location:` assertion updated.
  - `src/domains/job-board/public-card-truth.test.ts` — STEP-05: DEC-06 header comment.
- **Lane escalation:** No.

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | Fixture file exists, `preview-urgent-*` prefix, `source: 'INTEGRATION_PENDING'` 4× | `None` |
| `AC-02` | `E-02` | `bestJobsTab` 6×, `BEST_JOBS_URGENT_PREVIEW` 3×, `/api/jobs?limit=9` 1× | `None` |
| `AC-03` | `E-03` | 0 match urgency=URGENT in page.tsx; 0 match in route.ts | `None` |
| `AC-04` | `E-04` | 0 match `overview.newest.slice(0, 3)` as BestJobs source | `None` |
| `AC-05` | `E-05` | `BEST_JOBS_PAGE_SIZE = 9` + `pageSize: number` prop | `None` |
| `AC-06` | `E-06` | `onPrev`/`onNext`/`handleBestJobsPrev`/`handleBestJobsNext` + "Trang X / Y" | `None` |
| `AC-07` | `E-07` | `role="tablist"` 1×, `role="tab"` 2×, `aria-selected` 2× | `None` |
| `AC-08` | `E-08` | `role="group"` + `aria-label="Phân trang"` + `offset === 0` + `nextOffset === null` + `offset + pageSize >= total` | `None` |
| `AC-09` | `E-09` | "Preview" + "Backend chưa hỗ trợ" banner | `None` |
| `AC-10` | `E-10` | 0 match fake data strings | `None` |
| `AC-11` | `E-11` | DEC-01/DEC-06 comments in all 4 fence test files | `None` |
| `AC-12` | `npm run test:unit` (exit 1) | 1 pre-existing baseline failure `src/shared/ui/design-tokens.static.test.ts RQ-04/AC-03`; baseline commit `ef5fb91`; command to reproduce: `npm run test:unit -- src/shared/ui/design-tokens.static.test.ts`; new failures: 0 | `Pre-existing; reproducible at baseline` |
| `AC-13` | `E-13` | GlobalNavbar 6× in 6 portal routes | `None` |
| `AC-14` | — | AWAITING_OWNER_LIVE_VISUAL_REVIEW — status marker only | `Owner post-deploy visual review` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `Test-Path src/.../best-jobs-urgent-preview.ts` + `Select-String -Pattern "preview-urgent-|INTEGRATION_PENDING"` | True + 8 matches | `evidence/ac01-urgent-fixture.txt` |
| `E-02` | `Select-String page.tsx + best-jobs-section.tsx -Pattern "bestJobsTab|BEST_JOBS_URGENT_PREVIEW|/api/jobs\?limit=9"` | 10 matches | `evidence/ac02-bestjobs-tab.txt` |
| `E-03` | `Select-String page.tsx + route.ts -Pattern "urgency.*=.*URGENT"` | 0 + 0 | `evidence/ac03-no-urgency-query.txt` |
| `E-04` | `Select-String page.tsx -Pattern "overview\.newest\.slice\(0, 3\)"` | 0 | `evidence/ac04-bestjobs-fetch-separate.txt` |
| `E-05` | `Select-String -Pattern "pageSize.*=.*9\|pageSize: number"` | 2 matches | `evidence/ac05-pagesize-9.txt` |
| `E-06` | `Select-String -Pattern "Trang.*/.*Y\|Phân trang\|onPrev\|onNext"` | 7 matches | `evidence/ac06-bestjobs-pagination.txt` |
| `E-07` | `Select-String best-jobs-section.tsx -Pattern "role=\"tablist\"\|role=\"tab\"\|aria-selected"` | 5 matches | `evidence/ac07-tab-aria.txt` |
| `E-08` | `Select-String best-jobs-section.tsx -Pattern "role=\"group\"\|aria-label=\"Phân trang\"\|offset === 0\|nextOffset === null"` | 4 matches | `evidence/ac08-pagination-aria.txt` |
| `E-09` | `Select-String -Pattern "Preview\|Backend chưa hỗ trợ"` | 3 matches | `evidence/ac09-urgent-preview-badge.txt` |
| `E-10` | `Select-String -Pattern "Top công ty\|Đối tác chính thức\|17\.800\|13\.000\.000"` | 0 | `evidence/ac10-truth-fence.txt` |
| `E-11` | `Select-String -Pattern "DEC-01\|DEC-06"` in 4 fence test files | 12 matches | `evidence/ac11-fence-tests.txt` |
| `E-12` | `npm run test:unit` | exit 1 (1 pre-existing: design-tokens RQ-04/AC-03); `npm run test:unit -- src/shared/ui/design-tokens.static.test.ts` reproduces same failure at `ef5fb91` | `evidence/ac12-gates.txt` |
| `E-13` | `Select-String 6 portal routes -Pattern "import.*GlobalNavbar"` | 6 matches | `evidence/ac13-regression-check.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

All 6 steps executed. All gates pass: typecheck exit 0, test:unit -- public-card-truth exit 0, test:unit 1 pre-existing baseline failure (design-tokens RQ-04/AC-03, reproducible at `ef5fb91`, new failures: 0), build exit 0, verify-task.ps1 RESULT: PASS. All 14 AC have measurable evidence. No forbidden paths modified. Scope limited to OBR-02 allowlist. `READY_FOR_AUDIT`.

> Handoff status: `READY_FOR_AUDIT`
