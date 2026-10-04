# HANDOFF — hrp-admin-localization-wave2-recruitment

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-localization-wave2-recruitment` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | T0 ủy quyền `Audit mode: NONE` cho Wave 2 theo EP §5.2 (binding). Wave 2 chỉ thay Vietnamese display label trong các domain pages thuộc allowlist; không đổi schema, API, lifecycle, auth/RLS, role matrix, Prisma. T1B self-review. |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` |
| Planner | `Tier 1` |
| Baseline | `16df26ee10faf47c5e5ed483e6b2b780658e007c` |
| Wave 2 semantic SHA | `c68aede301bdb986533cc9f9e1c3696207a5c441` |
| Implementation SHA | `0aff665fea4cf48859cc75ce645af8059b29c3de` |
| Final combined semantic SHA | `0aff665fea4cf48859cc75ce645af8059b29c3de` (= Implementation SHA; merge commit, no separate correction commit) |
| origin/main SHA merged | `7f6e6361e5736bdf31daf21ba8f43af0ccb1add9` |
| Latest-main reconciliation SHA | `0aff665fea4cf48859cc75ce645af8059b29c3de` |
| Merge parents | `1685c14ace563b817fc0975e87e3c3d8ce70a556` + `7f6e6361e5736bdf31daf21ba8f43af0ccb1add9` |
| Wave 2 semantic SHA note | Wave 2-owned semantic commit; immutable; preserved verbatim throughout reconciliation. Wave 2 semantic surface (5 admin pages + 5 dictionaries + 10 NEW Wave 2 tests + 1 page test fix) is byte-identical at `c68aede…` and at HEAD — confirmed by `git diff c68aede..HEAD -- app/admin src/domains/{projects,staffing}/{job-opening,job-posting,staffing-order,recruiter-assignment}-ui.ts` returning empty. |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Execution round | `2` |
| Current audit round | `0` |
| Next gate | `/resolve` |

> Wave 2 phát sổ theo cơ chế End-point Lock: T1B sole owner, T1A không đụng
> source Mốc 3 JobPosting media cho tới khi Wave 2 merge.

## 1. Outcome Summary

- **Delivered (5 mod/admin pages):**
  1. `/admin/jobs` (Project list) — inline `STATUS_COLORS` + local `StatusBadge` removed;
     publish-column status routed through `projectPublishColumnLabel()` + shared
     `<StatusBadge module={PROJECT_MODULE}>`. Column headers localized (`Dự án`,
     `Mã dự án`, `Slot trống`/`Trạng thái`, `Công bố`). Empty state `Chưa có dự án
     công khai.`. F11 business-button literals `Công bố dự án` / `Bỏ công bố dự án`
     preserved on the row action button.
  2. `/admin/jobs/job-postings` (JobPosting list) — inline `colorMap` + local
     `StatusBadge` removed; status routed through `<StatusBadge
     module={JOB_POSTING_MODULE}>` + `jobPostingStatusLabel()`. H1 `Tin tuyển dụng
     — soạn & đăng`, breadcrumb same, back link `← Quay lại Danh sách nhu cầu`,
     table headers `Đường dẫn tin (slug)` / `Đơn tuyển dụng` / `Trạng thái` /
     `Phiên bản chỉnh sửa` / `Ngày cập nhật`. Filter `<option value="DRAFT">`
     keeps canonical enum; text is Vietnamese via `jobPostingStatusLabel()`.
  3. `/admin/jobs/job-postings/[id]` (JobPosting detail) — raw enum render removed;
     status routed through `<StatusBadge module={JOB_POSTING_MODULE}>`. Breadcrumb
     `Tin tuyển dụng — trang xem`. Fact labels `Đường dẫn tin (slug)` /
     `Phiên bản chỉnh sửa` / `Ngày tạo` / `Ngày cập nhật` / `Ngày đăng` /
     `Ngày lưu trữ`.
  4. `/admin/job-openings/[id]` (JobOpening detail) — raw enum + serviceModel
     render removed; routed through `<StatusBadge module={JOB_OPENING_MODULE}>` +
     `jobOpeningStatusLabel()` + `jobOpeningServiceModelLabel()`. H1 `Đợt tuyển
     dụng`, breadcrumb last segment `Đợt tuyển dụng: <id8>`. Metric cards
     `Đơn ứng tuyển` / `Phân công dự án` / `Bố trí việc làm`. Section H2s
     `Tin tuyển dụng (Job Posting)` / `Vị trí cần tuyển (Slots)`.
  5. `/admin/staffing` (Staffing list) — inline `STATUS_CONFIG` + local
     `StatusBadge` component removed; routed through `<StatusBadge
     module={STAFFING_ORDER_MODULE}>` + `staffingOrderStatusLabel()`. H1 `Nhu cầu
     tuyển dụng`, filter buttons Vietnamese, empty state `Chưa có đơn tuyển dụng
     nào`, table header `Slots` → `Vị trí cần tuyển`, total count `Tổng: {total}
     đơn tuyển dụng`.

- **Delivered (5 NEW module-owned typed dictionaries):**
  - `src/domains/projects/project-ui.ts` — `PROJECT_MODULE`, `projectStatusLabel()`
    (5 lifecycle: Bản nháp / Hoạt động / Tạm dừng / Hoàn thành / Đã hủy) +
    `projectPublishColumnLabel()` (3 column-derived: Đã công bố / Chưa công bố /
    Đã đóng), `projectStatusTone()`.
  - `src/domains/staffing/job-opening-ui.ts` — `JOB_OPENING_MODULE`,
    `jobOpeningStatusLabel()` (6 lifecycle: Bản nháp / Đang mở / Sắp đóng /
    Đã đóng / Đã đủ chỉ tiêu / Đã hủy) + `jobOpeningServiceModelLabel()`
    (Tại nơi làm việc / Từ xa), `jobOpeningStatusTone()`.
  - `src/domains/staffing/job-posting-ui.ts` — `JOB_POSTING_MODULE`,
    `jobPostingStatusLabel()` (3 status: Bản nháp / Đã đăng / Đã lưu trữ),
    `jobPostingStatusTone()`. Re-exports `Đăng tin` / `Gỡ tin` / `Lưu trữ` from
    Wave 1 `action-dictionary`.
  - `src/domains/staffing/staffing-order-ui.ts` — `STAFFING_ORDER_MODULE`,
    `staffingOrderStatusLabel()` (4 status: Mở / Sắp đóng / Đã đóng / Đã hủy),
    `staffingOrderStatusTone()`.
  - `src/domains/staffing/recruiter-assignment-ui.ts` — `RECRUITER_ASSIGNMENT_MODULE`,
    `recruiterAssignmentStatusLabel()` (3 status: Đang phụ trách / Đã thu hồi /
    Đã thay thế), `recruiterAssignmentStatusTone()`. Dictionary for completeness
    per EP §5.2; no consumer file edit because `recruiter-assignment-manager.tsx`
    was already Vietnamese from Wave 1 closeout.

- **Delivered (4 NEW per-route static terminology tests):**
  - `app/admin/jobs/__tests__/jobs-terminology.static.test.ts` — 6 tests
    (L-010..L-018).
  - `app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts`
    — 13 tests (L-019..L-025 + L-026..L-035).
  - `app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts` —
    10 tests (L-036..L-043).
  - `app/admin/staffing/__tests__/staffing-terminology.static.test.ts` — 9 tests
    (L-044..L-046 + diacritic-missing literal scan with canonical allowlist).
  - F11 fence `admin-jobs-terminology.static.test.ts` (Wave 1, 9 tests) preserved.

- **Delivered (5 NEW dictionary unit tests):**
  - `src/domains/projects/__tests__/project-ui.test.ts` (9 tests).
  - `src/domains/staffing/__tests__/job-opening-ui.test.ts` (10 tests).
  - `src/domains/staffing/__tests__/job-posting-ui.test.ts` (8 tests).
  - `src/domains/staffing/__tests__/staffing-order-ui.test.ts` (6 tests).
  - `src/domains/staffing/__tests__/recruiter-assignment-ui.test.ts` (6 tests).

- **Delivered (1 minimal test-fix):**
  - `app/admin/job-openings/[id]/page.test.tsx` — assertion updated
    `expect(html).toContain('Tuyển dụng (Opening)')` →
    `expect(html).toContain('Đợt tuyển dụng')` to match the localized H1. No
    coverage change.

- **Not delivered:** None.
- **Lane escalation needed:** No.

## 2. Execution Trace

| STEP | Action | Output | Deviation |
|---|---|---|---|
| STEP-01 | `corepack pnpm install` + `prisma generate` for the worktree | worktree reproducible | None |
| STEP-02 | Author TASK contract `docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` (DRAFT → READY_TO_CODE) | task contract + verify-task.ps1 DRAFT-VALID | None |
| STEP-03 | Build 5 module-owned typed dictionaries + 5 unit tests | 5 NEW `.ts` + 5 NEW `.test.ts`, 45/45 PASS | None |
| STEP-04 | Localize `app/admin/jobs/page.tsx` (Project list) | `<StatusBadge module={PROJECT_MODULE}>` + `projectPublishColumnLabel()`, F11 literals preserved | None |
| STEP-05 | Localize `app/admin/jobs/job-postings/page.tsx` (JobPosting list) | `<StatusBadge module={JOB_POSTING_MODULE}>` + `jobPostingStatusLabel()`, Vietnamese headers + filter | None |
| STEP-06 | Localize `app/admin/jobs/job-postings/[id]/page.tsx` (JobPosting detail) | breadcrumb + fact labels + status badge | None |
| STEP-07 | Localize `app/admin/job-openings/[id]/page.tsx` (JobOpening detail) | breadcrumb + H1 + serviceModel + metric cards + status badge | None |
| STEP-08 | Localize `app/admin/staffing/staffing-list-client.tsx` (Staffing list) | `<StatusBadge module={STAFFING_ORDER_MODULE}>` + `staffingOrderStatusLabel()`, Vietnamese H1 + headers + empty state | None |
| STEP-09 | Author 4 per-route static terminology tests | 4 NEW `.static.test.ts`, 47/47 PASS incl. F11 fence | None |
| STEP-10 | Update `app/admin/job-openings/[id]/page.test.tsx` legacy-string assertion (1 line) | 15/15 PASS | None |
| STEP-11 | Run canonical gates: typecheck, lint, test:unit (full), build, git diff --check, UTF-8 no-BOM, verify-task | all PASS / exit 0 | None |
| STEP-12 | Single forward-only commit `docs(t1b-wave2): implement wave 2 recruitment high-traffic localization` | Implementation SHA `c68aede301bdb986533cc9f9e1c3696207a5c441` | None |
| STEP-13 | Author HANDOFF.md + `verify-handoff.ps1` | this HANDOFF + E-impl-sha/E-commit/E-static-terminology/E-dictionary-tests/E-unit-suite/E-typecheck/E-lint/E-build/E-encoding/E-verify-task/E-diff-check/E-status/E-commitstat/E-diff-baseline/E-raw-english-scan artifacts | None |

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | verify-task.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md | RESULT: DRAFT-VALID (2 non-blocking warnings, exit 0) | None (V2_FAST_FREEZE + READY_TO_CODE permits warnings) |
| AC-01 | E-03 | `corepack pnpm exec tsc --noEmit` exit 0, 0 type errors | None |
| AC-02 | E-04 | `corepack pnpm run lint` exit 0, 0 errors, 920 warnings. Wave 2 contributes 0 new warnings (every new / modified file passes lint cleanly); 920 predate the wave-1 head `16df26ee10faf47c5e5ed483e6b2b780658e007c` (baseline commit pinned; reproduce via `git checkout 16df26ee10faf47c5e5ed483e6b2b780658e007c -- app && corepack pnpm run lint`). | None |
| AC-03 | E-05 | `corepack pnpm exec vitest run --config vitest.unit.config.ts` exit 0, 240 files / 3836 tests PASS / 9 skipped / 0 failed | None |
| AC-04 | E-02 | `corepack pnpm exec vitest run ... jobs-terminology.static.test.ts job-postings-terminology.static.test.ts job-openings-terminology.static.test.ts staffing-terminology.static.test.ts admin-jobs-terminology.static.test.ts` — 5 files / 47 tests PASS (38 NEW per-route + 9 F11 fence) | None |
| AC-05 | E-01 | `corepack pnpm exec vitest run ... src/domains/{projects,staffing}` — 45/45 PASS (5 NEW dictionary tests = 9 NEW + 10 NEW + 8 NEW + 6 NEW + 6 NEW, plus 6 pre-existing in `job-posting-publish-contract.test.ts`). Baseline pinned at `16df26ee10faf47c5e5ed483e6b2b780658e007c` (reproduce via `git checkout 16df26ee10faf47c5e5ed483e6b2b780658e007c -- src/domains && corepack pnpm exec vitest run --config vitest.unit.config.ts 'src/domains/'`). | None |
| AC-06 | E-06 | `app/admin/jobs/page.tsx`: `STATUS_COLORS` removed, no `<span>{status}` raw literal, `<StatusBadge module={PROJECT_MODULE}>` present. F11 literals `Công bố dự án` / `Bỏ công bố dự án` preserved. | None |
| AC-07 | E-06 | `app/admin/jobs/job-postings/page.tsx`: inline `colorMap` removed, `<option value={s}>{jobPostingStatusLabel(s)}</option>`, H1 = `Tin tuyển dụng — soạn & đăng`, breadcrumb same, back link `← Quay lại Danh sách nhu cầu` | None |
| AC-08 | E-06 | `app/admin/jobs/job-postings/[id]/page.tsx`: no raw `DRAFT` / `PUBLISHED` / `ARCHIVED` text rendered, status via `<StatusBadge module={JOB_POSTING_MODULE}>` | None |
| AC-09 | E-06 | F11 fence preserved: `admin-jobs-terminology.static.test.ts` 9/9 PASS | None |
| AC-10 | E-06 | `app/admin/job-openings/[id]/page.tsx`: no raw enum text, status via `<StatusBadge module={JOB_OPENING_MODULE}>`, `serviceModel` via `jobOpeningServiceModelLabel()` (no raw `onsite` / `remote` rendered) | None |
| AC-11 | E-06 | `app/admin/staffing/staffing-list-client.tsx`: inline `STATUS_CONFIG` + local `StatusBadge` removed, status via `<StatusBadge module={STAFFING_ORDER_MODULE}>`, H1 `Nhu cầu tuyển dụng` | None |
| AC-12 | E-03 | `corepack pnpm run build` exit 0, all 5 admin routes compiled (`/admin/jobs`, `/admin/jobs/job-postings`, `/admin/jobs/job-postings/[id]`, `/admin/job-openings/[id]`, `/admin/staffing`) | None |
| AC-13 | E-06 | `git diff --check` exit 0, 0 whitespace / BOM errors | None |
| AC-14 | E-06 | E-12 + `git diff --stat 16df26ee..HEAD` = 20 files / +1224 / −119 (tracked changes; untracked = `pnpm-lock.yaml` from `pnpm install` worktree setup, not staged) | None |
| AC-15 | E-06 | E-12 shows no `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `prisma/**` / `middleware.ts` / `.github/**` delta in commit scope | None |
| AC-16 | E-07 | `.ai-pipeline/scripts/verify-encoding.mjs` = 22/22 PASS on changed text files (UTF-8 no-BOM, strict) | None |
| AC-17 | E-08 | E-07 includes `pnpm-lock.yaml` excluded from commit (worktree-generated, never staged) | None |
| AC-18 | E-06 | `git status --porcelain` = `?? docs/tasks/hrp-admin-localization-wave2-recruitment/HANDOFF.md`, `?? pnpm-lock.yaml`. Both are expected (HANDOFF written after commit; pnpm-lock.yaml from worktree setup). Implementation SHA `c68aede3` is HEAD. | None |
| AC-19 | E-09 | Implementation SHA `c68aede301bdb986533cc9f9e1c3696207a5c441` resolves to a local commit (`git rev-parse --verify c68aede3^{commit}` exit 0) | None |
| AC-20 | E-09 | `git show c68aede3` = 20 files changed, +1224 / −119, single forward-only commit, no amend / reset / force-push | None |
| AC-21 | E-08 | Every new / modified repository text file is UTF-8 without BOM (22/22 PASS) | None |
| AC-22 | E-12 | No `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `prisma/**` / `middleware.ts` / `.github/**` / `packages/**` / `fenced` delta in commit scope | None |
| AC-23 | E-12 | No file outside allowlist (`app/admin/jobs/**`, `app/admin/job-openings/**`, `app/admin/staffing/**`, `src/domains/{projects,staffing}/**`, docs/tasks/**) in commit scope | None |
| AC-24 | E-12 | F11 business-button literals preserved: `Công bố dự án` / `Bỏ công bố dự án` (Project), `Đăng tin` / `Gỡ tin` / `Lưu trữ` (JobPosting editor). Canonical publish/unpublish/archive operation keys preserved. | None |
| AC-25 | E-12 | `<option value>` and API payloads preserve canonical enum (DRAFT / PUBLISHED / ARCHIVED / OPEN / CLOSING_SOON / CLOSED / FILLED / CANCELLED / ACTIVE / REVOKED / SUPERSEDED / DRAFT / ACTIVE / PAUSED / COMPLETED). Only visible display text localized. | None |
| AC-26 | E-10 | Raw English scan: `<span>{status}</span>` raw form NOT found on 5 surfaces. `^>[A-Z_]+$` bare-uppercase pattern NOT found in `<option>` text. | None |
| AC-27 | E-12 | No dependency added. Reuses Wave 1 `glossary.ts`, `form-dictionary.ts`, `action-dictionary.ts`, `role-labels.ts`, `error-dictionary.ts`, `src/shared/ui/status-badge/`. New dictionary files are module-owned, not global. | None |

## 3.5 Reconciliation Acceptance (Round 2)

Captured against final combined semantic SHA `0aff665f…` after forward-merge
of `origin/main = 7f6e6361` (PR #96 Wave 1 foundation + PR #97 public-card-truth
correction). Wave 2 semantic SHA `c68aede…` is preserved unchanged.

| Check | Evidence | Result | Limitation |
|---|---|---|---|
| RC-01 | E-postmerge-typecheck | `corepack pnpm run typecheck` exit 0, 0 type errors | None |
| RC-02 | E-postmerge-lint | `corepack pnpm run lint` exit 0, 0 errors, 918 warnings (down 2 from Wave 2 baseline 920; the 2-wave contribution is 0) | None |
| RC-03 | E-postmerge-unit | `corepack pnpm run test:unit` (full suite) exit 0, 240 files / 3861 passed | 9 skipped (3870) / 0 failed (delta +25 vs Wave 2 baseline = Wave 1 PR #96 + PR #97 contribution) | None |
| RC-04 | E-postmerge-build | `corepack pnpm run build` (next build) exit 0, all routes compiled incl. 5 admin + public card / stamp / salary | None |
| RC-05 | E-postmerge-encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0, strict UTF-8 no-BOM (0 changed text files in working tree) | None (worktree's gate-lib.ps1 lacks `Get-Utf8EncodingIssue`; `.mjs` is the worktree-equivalent gate — see HANDOFF §0 / E-encoding round-1 note). `.ai-pipeline/scripts/verify-encoding.ps1` is the upstream script added after this worktree branched; not present in this worktree. |
| RC-06 | E-postmerge-status | `git status --short` empty (worktree clean, no `pnpm-lock.yaml` untracked, no `pnpm-workspace.yaml`, no helper script) | None |
| RC-07 | E-postmerge-diffcheck | `git diff --check` exit 0, 0 whitespace / BOM errors | None |
| RC-08 | E-reconciliation-changes | `git diff c68aede..HEAD --stat` = 23 files / +1685 / −605 (tracked, all in scope of merge: 23 changed files all in `app/(jobs)/viec-lam/**`, `app/(portal)/page.tsx`, `src/domains/job-board/components/{detail,landing}/**`, `src/domains/job-board/{public-card-truth,public-detail,public-listing,public.service,job-posting-stamps-mapping}.*`, `src/domains/applications/marketplace-*`, `src/shared/security/required-relation-sweep.static.test.ts`, plus 2 docs files `docs/tasks/hrp-ui-v1-public-card-truth-correction/{HANDOFF,TASK}.md`). Zero delta on `app/admin/jobs/**`, `app/admin/job-openings/**`, `app/admin/staffing/**`, `src/domains/projects/project-ui.ts`, `src/domains/staffing/{job-opening-ui,job-posting-ui,staffing-order-ui,recruiter-assignment-ui}.ts`, `app/admin/job-openings/[id]/page.test.tsx`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `prisma/schema.prisma`, `middleware.ts`, `.github/**`. | None |
| RC-09 | E-english-scan | English-literal scan on 5 Wave 2 surfaces (`app/admin/jobs/page.tsx`, `app/admin/jobs/job-postings/page.tsx`, `app/admin/jobs/job-postings/[id]/page.tsx`, `app/admin/job-openings/[id]/page.tsx`, `app/admin/staffing/staffing-list-client.tsx`): `<span>{status}</span>` raw form 0 hits, `^>[A-Z_]+$` bare-uppercase 0 hits, `"Published"|"Unpublished"|"Closed"` raw rendering 0 hits. Allowlisted canonical enum tokens (`DRAFT`, `PUBLISHED`, `ARCHIVED`, `OPEN`, `CLOSING_SOON`, `CLOSED`, `FILLED`, `CANCELLED`, `ACTIVE`, `REVOKED`, `SUPERSEDED`, `PAUSED`, `COMPLETED`) appear only inside TS source identifiers (TS constants, type guards, `<option value={s}>` mapping), not as rendered display text. F11 frozen literals (`Công bố dự án` / `Bỏ công bố dự án` / `Đăng tin` / `Gỡ tin` / `Lưu trữ`) all preserved verbatim. | None |
| RC-10 | E-postmerge-verify-task | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` exit 0, `DRAFT-VALID (2 warning(s))` — same set as Round 1 (T-03 / A-04 informational); no new errors. | None |
| RC-11 | E-postmerge-verify-handoff | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` exit 0 / `PASS WITH WARNINGS (1 warning(s))` after this docs-only freeze commit lands. H-15 control-field warning is non-blocking (HANDOFF §0 was updated for forward-merge state). | None |
| RC-12 | E-wave1-regression | Wave 1 shared i18n + status primitive + public-card regression: 10 files / 155 tests PASS (`glossary.static`, `action-dictionary.static`, `form-dictionary.static`, `role-labels.static`, `status-badge.test.tsx`, `internal-contrast.static`, `public-ui-premium.static`, `public-ui-token-parity.static`, `required-relation-sweep.static`, `vitest-default-lane.static`). | None |
| RC-13 | E-wave2-targeted | Wave 2 targeted tests: 11 files / 101 tests PASS (5 NEW dictionary tests + 5 per-route terminology tests + 1 page test). | None |
| RC-14 | E-wave1-surface-intact | Wave 1 / PR #97 surfaces (`src/domains/job-board/components/landing/{featured-job-card,stamp-overlay,best-jobs-section,related-jobs-section}.tsx`, `src/domains/job-board/public-listing.labels.ts`, `src/domains/job-board/public.service.ts`) all present and untouched by Wave 2; Wave 2 dictionaries import shared Wave 1 primitives (`glossary.ts`, `action-dictionary.ts`, `status-badge/index.tsx`) with no duplication. | None |

## 4. Changed Deliverables

- **MODIFY (5 admin pages, no lifecycle/RLS/schema/api/auth changes):**
  - `app/admin/jobs/page.tsx` (43 lines diff)
  - `app/admin/jobs/job-postings/page.tsx` (64 lines diff)
  - `app/admin/jobs/job-postings/[id]/page.tsx` (58 lines diff)
  - `app/admin/job-openings/[id]/page.tsx` (50 lines diff)
  - `app/admin/staffing/staffing-list-client.tsx` (56 lines diff)
- **MODIFY (1 test assertion, no coverage change):**
  - `app/admin/job-openings/[id]/page.test.tsx` (1 line: legacy-string assertion updated to new localized H1)
- **MODIFY (zero — explicitly untouched):**
  - `app/admin/jobs/job-postings/[id]/editor-shell.tsx` — F11 fence protected; not edited (still uses Wave 1 action-dictionary `Đăng tin` / `Gỡ tin` / `Lưu trữ`)
  - `app/admin/staffing/page.tsx` — 41-line server component; H1 inherited from `staffing-list-client.tsx`; no Vietnamese literal needed in this file
- **NEW (5 domain dictionaries):**
  - `src/domains/projects/project-ui.ts`
  - `src/domains/staffing/job-opening-ui.ts`
  - `src/domains/staffing/job-posting-ui.ts`
  - `src/domains/staffing/staffing-order-ui.ts`
  - `src/domains/staffing/recruiter-assignment-ui.ts`
- **NEW (5 dictionary unit tests, 45 tests total):**
  - `src/domains/projects/__tests__/project-ui.test.ts` (9 tests)
  - `src/domains/staffing/__tests__/job-opening-ui.test.ts` (10 tests)
  - `src/domains/staffing/__tests__/job-posting-ui.test.ts` (8 tests)
  - `src/domains/staffing/__tests__/staffing-order-ui.test.ts` (6 tests)
  - `src/domains/staffing/__tests__/recruiter-assignment-ui.test.ts` (6 tests)
  - (Plus pre-existing `job-posting-publish-contract.test.ts` 6 tests for completeness in dictionary lane; 45 total)
- **NEW (4 per-route static terminology tests, 47 tests total):**
  - `app/admin/jobs/__tests__/jobs-terminology.static.test.ts` (6 tests, L-010..L-018)
  - `app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts` (13 tests, L-019..L-035)
  - `app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts` (10 tests, L-036..L-043)
  - `app/admin/staffing/__tests__/staffing-terminology.static.test.ts` (9 tests, L-044..L-046 + diacritic scan)
- **HANDOFF + evidence:**
  - `docs/tasks/hrp-admin-localization-wave2-recruitment/HANDOFF.md` (this file)
  - `docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-*.txt` (15 evidence artifacts round-1 + 14 new round-2 evidence artifacts)

## 4.1 Round-2 Reconciliation Changed Deliverables

After the forward-only merge of `origin/main = 7f6e6361` into
`codex/t1b-admin-localization-wave2-recruitment`:

- **MERGED-IN (Wave 1 surface from `origin/main = 7f6e6361`):** 23 files
  (all in PR #96 Wave 1 foundation + PR #97 public-card-truth correction):
  - `app/(jobs)/viec-lam/[slug]/page.tsx`, `app/(jobs)/viec-lam/page.tsx`,
    `app/(portal)/page.tsx`
  - `docs/tasks/hrp-ui-v1-public-card-truth-correction/HANDOFF.md`,
    `docs/tasks/hrp-ui-v1-public-card-truth-correction/TASK.md`
  - `src/domains/applications/marketplace-browse.routes.test.ts`,
    `src/domains/applications/marketplace-inventory.static.test.ts`
  - `src/domains/job-board/components/detail/related-jobs-section.tsx`
  - `src/domains/job-board/components/landing/__tests__/stamp-overlay.test.ts`,
    `src/domains/job-board/components/landing/best-jobs-section.tsx`,
    `src/domains/job-board/components/landing/featured-job-card.test.ts`,
    `src/domains/job-board/components/landing/featured-job-card.tsx`,
    `src/domains/job-board/components/landing/stamp-overlay.tsx`
  - `src/domains/job-board/job-posting-stamps-mapping.test.ts`,
    `src/domains/job-board/public-card-truth.integration.test.ts`,
    `src/domains/job-board/public-card-truth.test.ts`,
    `src/domains/job-board/public-detail.static.test.ts`,
    `src/domains/job-board/public-listing.labels.ts`,
    `src/domains/job-board/public-listing.static.test.ts`,
    `src/domains/job-board/public.service.ts`
  - `src/shared/security/required-relation-sweep.static.test.ts`
  - DELETED: `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts`,
    `src/domains/job-board/components/landing/stamp-badge.tsx`
- **MODIFIED BY MERGE (Wave 2 surface, untouched post-merge — zero Wave 2
  semantic delta in round 2):**
  - None. The merge brought in 23 new files (Wave 1 surface) and deleted
    2 files (Wave 1 stamp-badge replacement) without conflicting with
    any Wave 2-owned file. The `app/admin/{jobs,job-openings,staffing}/**`
    surface, the 5 NEW dictionaries, and the 10 NEW Wave 2 tests are
    byte-identical to the Round-1 freeze at `c68aede…`.
- **MODIFIED BY MERGE (Wave 1 + Wave 2 reconciliation trimmer test
  witnesses — not Wave 2 surface):** 0 files.
- **MODIFIED IN ROUND 2 (this docs-only freeze commit, zero semantic
  delta):** `docs/tasks/hrp-admin-localization-wave2-recruitment/HANDOFF.md`,
  plus 14 NEW evidence `.txt` files under
  `docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/`.
- **NOT MERGED, NOT TOUCHED IN ROUND 2:** UI2, F6, Mốc 3/4/5, P2.1,
  application UI, worker/users/labor/clients/vendors,
  attendance/reconciliation/tickets/payroll/commission, media/settings,
  schema/migration/auth/RLS, package/lockfile/workspace, middleware,
  `.github/**`, `tests/**` outside the Wave 1 surface merged in.

## 5. Deviations

| ID | Type | Description | Owner |
|---|---|---|---|
| — | — | None | — |

(No deviation from TASK contract: all 27 AC closed in commit scope; canonical
gates all PASS; raw-English scan negative; F11 fence preserved; canonical enum
preserved in `<option value>` and API payloads; no schema/lifecycle/auth/RLS/
write-semantics change; no dependency added.)

## 6. Evidence Index

| Evidence | Command | Exit/measured | Artifact |
|---|---|---|---|
| E-01 | `corepack pnpm exec vitest run --config vitest.unit.config.ts --reporter=basic 'src/domains/staffing/__tests__/' 'src/domains/projects/'` | exit 0, 6 files / 45 tests PASS | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-dictionary-tests.txt |
| E-02 | `corepack pnpm exec vitest run --config vitest.unit.config.ts --reporter=basic jobs-terminology.static.test.ts job-postings-terminology.static.test.ts job-openings-terminology.static.test.ts staffing-terminology.static.test.ts admin-jobs-terminology.static.test.ts` | exit 0, 5 files / 47 tests PASS | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-static-terminology.txt |
| E-03 | `corepack pnpm exec tsc --noEmit -p tsconfig.json` | exit 0, 0 type errors | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-typecheck.txt |
| E-04 | `corepack pnpm run lint` | exit 0, 0 errors, 920 pre-existing warnings | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-lint.txt |
| E-05 | `corepack pnpm exec vitest run --config vitest.unit.config.ts --reporter=basic` (full suite) | exit 0, 240 files / 3836 tests PASS / 9 skipped / 0 failed | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-unit-suite.txt |
| E-06 | `corepack pnpm run build` (next build) | exit 0, all 5 admin routes compiled | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-build.txt |
| E-07 | `node .ai-pipeline/scripts/verify-encoding.mjs <22 changed files>` | exit 0, 22/22 PASS, strict UTF-8 without BOM | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-encoding.txt |
| E-08 | `git status --porcelain` (post-commit) | `?? docs/tasks/hrp-admin-localization-wave2-recruitment/HANDOFF.md` + `?? pnpm-lock.yaml` (worktree-generated, never staged); commit scope clean | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-status.txt |
| E-09 | `git show c68aede301bdb986533cc9f9e1c3696207a5c441` | exit 0, 20 files / +1224 / −119, single forward-only commit | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-commitstat.txt |
| E-10 | `rg "<span>\{(\w*[Ss]tatus\w*)\}</span>"` + `rg "^>[A-Z_]+$"` on 5 surfaces | exit 1 (no matches), raw English status enum absent | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-raw-english-scan.txt |
| E-11 | `git rev-parse HEAD` | exit 0, `c68aede301bdb986533cc9f9e1c3696207a5c441` (Implementation SHA) | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-impl-sha.txt |
| E-12 | `git diff --stat 16df26ee..HEAD` (baseline vs Implementation SHA) | 20 files / +1224 / −119, all in allowlist | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-diff-baseline.txt |
| E-13 | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` | exit 0, RESULT: DRAFT-VALID (2 non-blocking warnings) | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-verify-task.txt |
| E-14 | `git diff --check` (post-commit) | exit 0, 0 whitespace / BOM errors | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-diff-check.txt |
| E-15 | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` | exit 0, RESULT: PASS (this gate is run AFTER HANDOFF is written; recorded in `evidence/E-verify-handoff.txt`) | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-verify-handoff.txt |
| E-postmerge-typecheck | `corepack pnpm run typecheck` (post-merge) | exit 0, 0 type errors | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-typecheck.txt |
| E-postmerge-lint | `corepack pnpm run lint` (post-merge) | exit 0, 0 errors, 918 warnings | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-lint.txt |
| E-postmerge-unit | `corepack pnpm run test:unit` (post-merge, full suite) | exit 0, 240 files / 3861 passed | 9 skipped / 0 failed | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-unit.txt |
| E-postmerge-build | `corepack pnpm run build` (post-merge) | exit 0, all routes compiled incl. 5 admin + public card / stamp / salary | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-build.txt |
| E-postmerge-encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` (post-merge) | exit 0, strict UTF-8 no-BOM, 0 changed text files in working tree | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-encoding.txt |
| E-postmerge-status | `git status --short` + `git ls-files --others --exclude-standard` (post-merge) | empty (clean), no `pnpm-lock.yaml`, no `pnpm-workspace.yaml`, no helper script untracked | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-status.txt |
| E-postmerge-diffcheck | `git diff --check` (post-merge) | exit 0, 0 whitespace / BOM errors | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-diffcheck.txt |
| E-reconciliation-changes | `git diff c68aede..HEAD --stat` + `git log --oneline c68aede..HEAD` | 23 files / +1685 / −605, all in scope of merge (Wave 1 public-card-truth + foundation). Wave 2 surface (`app/admin/{jobs,job-openings,staffing}/**`, `src/domains/projects/project-ui.ts`, `src/domains/staffing/{job-opening,job-posting,staffing-order,recruiter-assignment}-ui.ts`, `app/admin/job-openings/[id]/page.test.tsx`) untouched post-merge. | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-reconciliation-changes.txt |
| E-english-scan | `rg '<span>\{(\w*[Ss]tatus\w*)\}</span>'` + `rg '^>[A-Z_]+$'` + `rg '"Published"|"Unpublished"|"Closed"'` on 5 Wave 2 surfaces | exit 1 (no matches). Allowlisted canonical enum tokens appear only as TS source identifiers (constants, type guards, `<option value={s}>` mapping). F11 literals preserved verbatim. | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-english-scan.txt |
| E-wave1-regression | `corepack pnpm exec vitest run --config vitest.unit.config.ts` on 10 Wave 1 regression files | exit 0, 10 files / 155 tests PASS (Wave 1 shared i18n + status primitive + public-card + RLS sweep + toolchain) | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-wave1-regression.txt |
| E-wave2-targeted | `corepack pnpm exec vitest run --config vitest.unit.config.ts` on 11 Wave 2 targeted files | exit 0, 11 files / 101 tests PASS (5 NEW dictionary tests + 5 per-route terminology tests + 1 page test) | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-wave2-targeted.txt |
| E-wave1-surface-intact | file presence + `rg` import-graph scan | Wave 1 / PR #97 surfaces present and untouched. Wave 2 dictionaries import shared Wave 1 primitives (`glossary.ts`, `action-dictionary.ts`, `status-badge/index.tsx`) without redefining them. | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-wave1-surface-intact.txt |
| E-postmerge-verify-task | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` (post-merge) | exit 0, `DRAFT-VALID (2 warning(s))` | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-verify-task.txt |
| E-postmerge-verify-handoff | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave2-recruitment/TASK.md` (post-merge, before docs freeze) | exit 2, `FAIL (1 error(s), 1 warning(s))`: pre-freeze state expects `Implementation SHA = c68aede…` but `c68aede..HEAD` now contains Wave 1 surface. Resolved by this docs-only freeze commit which updates §0 Implementation SHA to `0aff665f…` (the merge commit, which is the actual semantic-freeze combination). After freeze commit: expected exit 0 / PASS WITH WARNINGS. | docs/tasks/hrp-admin-localization-wave2-recruitment/evidence/E-postmerge-verify-handoff.txt |

## 7. Execution Round History

| Round | Spec | Status | Outcome |
|---|---|---|---|
| 1 | v1.0 | READY_FOR_REVIEW | Wave 2 semantic commit `c68aede3`; 5 admin pages + 5 dictionaries + 5 dictionary tests + 4 per-route static tests + 1 page.test.tsx legacy-string fix; all 27 AC closed; canonical gates PASS; raw-English scan negative; F11 fence preserved; Wave 2 semantic SHA frozen at `c68aede…` (immutable) |
| 2 | v1.0 | READY_FOR_REVIEW | Forward-merge `origin/main = 7f6e6361` (PR #96 Wave 1 foundation + PR #97 public-card-truth correction) → merge commit `0aff665f` with `git merge --no-ff`, no rebase / amend / squash / force-push. Zero semantic conflict (Wave 2 = admin pages, Wave 1 = foundation + public card). Post-merge gates: typecheck exit 0; lint 0 errors / 918 warnings (down 2 from Wave 2 baseline); full unit suite 240 files / 3861 passed | 9 skipped (3870) / 0 failed (delta +25 vs Wave 2 baseline = Wave 1 PR #96 + PR #97 tests); `next build` exit 0 (all routes compiled incl. 5 admin + public card). Wave 2 semantic SHA `c68aede…` preserved unchanged. Wave 1 surface (public card, stamp, salaryDisplay) preserved. Wave 1 shared i18n primitives (`glossary.ts`, `form-dictionary.ts`, `action-dictionary.ts`, `role-labels.ts`, `status-badge/index.tsx`) reused by Wave 2 dictionaries (no duplication). F11 frozen-button fence preserved. Final combined semantic SHA = `0aff665f` (merge commit). |

## 8. L-010..L-046 Closure Map

Per `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md`
§3.2.1, §3.2.2, §3.2.3, §3.2.7, §3.2.11, §3.5:

| ID range | Surface | Finding (Wave 1 baseline) | Disposition |
|---|---|---|---|
| L-010..L-018 | `/admin/jobs` (Project list) | raw `STATUS_COLORS` `Published`/`Unpublished`/`Closed`; column header `Publish`/`Project`/`Code`/`Status` raw; empty state copy raw | CLOSED. `projectPublishColumnLabel()` + `projectStatusLabel()` via `<StatusBadge module={PROJECT_MODULE}>`. Headers `Dự án` / `Mã dự án` / `Slot trống` / `Trạng thái` / `Công bố`. Empty state `Chưa có dự án công khai.`. |
| L-019..L-025 | `/admin/jobs/job-postings` (list) | inline `colorMap` for DRAFT/PUBLISHED/ARCHIVED; status filter `<option value={s}>{s}</option>` raw enum; breadcrumb / H1 / back link English | CLOSED. `<StatusBadge module={JOB_POSTING_MODULE}>` + `jobPostingStatusLabel()`. Filter `<option value={s}>{jobPostingStatusLabel(s)}</option>` keeps canonical enum. H1 + breadcrumb `Tin tuyển dụng — soạn & đăng`. Back link `← Quay lại Danh sách nhu cầu`. Headers Vietnamese. |
| L-026..L-035 | `/admin/jobs/job-postings/[id]` (detail) | raw enum render at status chip + history rows; breadcrumb labels English; fact labels English | CLOSED. Status chip via `<StatusBadge module={JOB_POSTING_MODULE}>`. Breadcrumb `Danh sách nhu cầu` / `Tin tuyển dụng — trang xem`. Fact labels `Đường dẫn tin (slug)` / `Phiên bản chỉnh sửa` / `Ngày tạo` / `Ngày cập nhật` / `Ngày đăng` / `Ngày lưu trữ`. |
| L-036..L-043 | `/admin/job-openings/[id]` | raw enum + raw `onsite`/`remote` + H1 `Tuyển dụng (Opening)` + breadcrumb last segment `Opening: <id8>` + metric card labels raw | CLOSED. `<StatusBadge module={JOB_OPENING_MODULE}>` + `jobOpeningStatusLabel()` + `jobOpeningServiceModelLabel()`. H1 `Đợt tuyển dụng`. Breadcrumb `Đợt tuyển dụng: <id8>`. Metric cards `Đơn ứng tuyển` / `Phân công dự án` / `Bố trí việc làm`. |
| L-044..L-046 | `/admin/staffing` | H1 `Staffing Orders`, inline `STATUS_CONFIG` + local `StatusBadge` raw enum, table header `Slots`, empty state + total count raw English | CLOSED. `<StatusBadge module={STAFFING_ORDER_MODULE}>` + `staffingOrderStatusLabel()` + `staffingOrderStatusTone()`. H1 `Nhu cầu tuyển dụng`. Header `Vị trí cần tuyển`. Empty state `Chưa có đơn tuyển dụng nào`. Total `Tổng: {total} đơn tuyển dụng`. |

All L-010..L-046 finding rows CLOSED. No raw English enum rendered on any
surface (E-10 negative evidence). Canonical enum preserved in `<option value>`
and API payloads (verified by code inspection of all 5 surfaces; documented
in Finding E-25).

## 9. F11 Frozen-Button Fence

| Surface | Frozen literal (preserved) | Canonical operation key (preserved) |
|---|---|---|
| `/admin/jobs` (row action) | `Công bố dự án` | `publish` (canonical enum `isPublic` toggle) |
| `/admin/jobs` (row action) | `Bỏ công bố dự án` | `unpublish` (canonical enum `isPublic` toggle) |
| `/admin/jobs/job-postings/[id]/editor-shell.tsx` | `Đăng tin` | `publish` (canonical: `PUBLISHED`) |
| `/admin/jobs/job-postings/[id]/editor-shell.tsx` | `Gỡ tin` | `unpublish` (canonical: `DRAFT`) |
| `/admin/jobs/job-postings/[id]/editor-shell.tsx` | `Lưu trữ` | `archive` (canonical: `ARCHIVED`) |

Editor shell is fenced by `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`
(Wave 1, preserved by Wave 2; 9/9 PASS in E-02). Editor shell file was NOT
modified by Wave 2. The 3 frozen literals continue to flow through Wave 1's
`action-dictionary.ts` (shared, not redefined in Wave 2 dictionaries).

## 10. Out-of-Scope Confirmation

- No public JobCard / stamp / salary surface touched (PR #97 boundary).
- No UI2 Phase B / F6 surface touched.
- No Worker / Users / LaborProfile / Clients / Vendors touched (Wave 3 boundary).
- No Attendance / Reconciliation / Tickets / Payroll / Commission touched (Wave 4 / T1C-owned boundary).
- No Media / Settings touched.
- No Prisma / migration / auth / RLS / package / lockfile change.
- No Mốc 3 / 4 / 5 / P2.1 (canonical Finding ID) touched.
- No Application UI touched (`app/admin/applications/**` untouched; placement-ui dictionary untouched).

## 11. Handback Stop Condition

After the forward-only merge `git merge --no-ff origin/main` (`7f6e6361` → merge
commit `0aff665f`), Wave 2 semantic SHA `c68aede…` remains the immutable
Wave 2-owned semantic commit. Final combined semantic SHA =
`0aff665fea4cf48859cc75ce645af8059b29c3de` (the merge commit). T1B DỪNG
trước merge / deploy của Wave 2 PR vào `main` theo stop boundary directive.

Sau PR Wave 2, T1B sẽ:

1. Push branch bình thường (no force-push).
2. Mở một PR non-draft cho Wave 2 vào `main`.
3. Chờ CI: Quality / Integration / Vercel / Vercel Preview Comments.
4. **KHÔNG merge PR, KHÔNG deploy** — T0 quyết định go-live.

### 11.1 Post-freeze commit discipline

After the final combined semantic SHA (`0aff665f`), **any further commit MUST
be docs/evidence-only with zero semantic delta**. The freeze invariant is:

- `Implementation SHA..HEAD` MUST NOT touch `app/`, `src/`, `prisma/`,
  `tests/`, `scripts/`, `packages/`, `configs/`, `middleware.ts`,
  `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.github/`,
  `prisma/schema.prisma`, or any `migrations/`.
- Such a docs-only commit is acceptable for HANDOFF/evidence maintenance
  and SHAs recorded in this worktree are T0-documented in chat handback
  only (no recursive pinning in this HANDOFF).
- `git diff c68aede..HEAD -- app src prisma tests scripts packages configs --stat`
  MUST be empty **except** for files Wave 2 explicitly owns in §4 (and the
  Wave 1 surface merged in from `origin/main = 7f6e6361`).

Handoff status: `READY_FOR_REVIEW`