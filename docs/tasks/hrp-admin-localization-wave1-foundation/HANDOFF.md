# HANDOFF — `hrp-admin-localization-wave1-foundation`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-admin-localization-wave1-foundation` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit mode (phải khớp TASK) | `NONE` |
| Current Execution round | `1` |
| Baseline | `796e13c69996756d1298bc1a7ec9b50bab935c9f` |
| Implementation SHA | `060078c0a758fdabbda4c650c98a15a2d6d139df` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome Summary

- **Delivered (Wave 1 Foundation).**
  - 5 cross-module typed dictionaries + 1 re-export (`glossary.ts`, `role-labels.ts`, `form-dictionary.ts`, `action-dictionary.ts`, `error-dictionary.ts`) — each with typed label maps, lookup helpers, and unit tests.
  - `StatusBadge` presentation primitive (`src/shared/ui/status-badge/index.tsx`) accepting `module`, `status`, `tone`, `children`, `testId`, `className`; carries `data-status-badge-module` + `data-status-badge-status` for static verification; NO global aggregator.
  - Domain-owned identity verification dictionary (`src/domains/talent/identity-verification-ui.ts`) with `identityVerificationLabel()`, `identityVerificationTone()`, KEEP_CANONICAL_IDENTIFIER fallback strategy.
  - Shell-vicinity localizations: L-001 `Staffing` → `Nhu cầu tuyển dụng`; L-003 role chip via `roleLabel()`; L-004 default `User` → `Người dùng`; L-006 `(no name)` → `(chưa có tên)`; L-007 identity verification chip via `identityVerificationLabel()`; L-047 `CCCD` → `Số CCCD`.
  - F11 §9 binding: `editor-shell.tsx` ActionButton text now `Đăng tin / Gỡ tin / Lưu trữ`; canonical lifecycle operation names retained in `aria-label="Publish" / "Unpublish" / "Archive"` and `runStateMutation('publish' | 'unpublish' | 'archive')` argument.
  - `admin-jobs-terminology.static.test.ts` updated to assert F11 §9 binding (display MUST be Vietnamese; canonical names only in `aria-label`/`value`).
  - `recruiter-assignment.manager.component.test.tsx` updated for `(chưa có tên)` literal.
- **Not delivered (deferred per EP §5.2-§5.4).**
  - Wave 2/3/4: `/admin/jobs/**` columns, JobOpening editor, Staffing, Worker Portal, Vendor Portal, Applications logic, Users, Workers, Clients, Vendors, Media, Settings, Attendance, Reconciliation, Payroll, Commission, Tickets.
  - UI2 Phase B (`src/domains/job-board/public-content-controls/**`, `docs/tasks/hrp-ui2-public-content-controls-sticky/**`, HomepageSettings, sticky announcement renderer/settings, NewsSection toggle) — T1C-owned.
  - F6 / P2.1 / Mốc 3/4/5 — out of scope.

## 2. Execution Trace

| STEP | Action | Output | Deviation |
|---|---|---|---|
| STEP-01 | Tạo `src/shared/i18n/glossary.ts` + `__tests__/glossary.static.test.ts` | 2 file mới | None |
| STEP-02 | Tạo `src/shared/i18n/role-labels.ts` + `__tests__/role-labels.static.test.ts` | 2 file mới | None |
| STEP-03 | Tạo `src/shared/i18n/form-dictionary.ts` + `__tests__/form-dictionary.static.test.ts` | 2 file mới | None |
| STEP-04 | Tạo `src/shared/i18n/action-dictionary.ts` + `__tests__/action-dictionary.static.test.ts` | 2 file mới | None |
| STEP-05 | Tạo `src/shared/i18n/error-dictionary.ts` (re-export + `errorLabel()` helper) | 1 file mới + fix local-binding cho `JOB_POSTING_ERROR_LABELS`/`CONFLICT_LABELS` sau typecheck | None |
| STEP-06 | Tạo `src/shared/ui/status-badge/index.tsx` + `status-badge.test.tsx` | 2 file mới | None |
| STEP-07 | Sửa `src/shared/ui/role-guard/role-guard-layout.tsx` (L-001/L-003/L-004) | 1 file sửa | None |
| STEP-08 | Không sửa `app/admin/admin-shell.tsx` — không có string mapping thuộc Wave 1; import guard qua role-guard-layout | None | None |
| STEP-09 | Tạo `src/domains/talent/identity-verification-ui.ts` + `__tests__/identity-verification-ui.test.ts` | 2 file mới | None |
| STEP-10 | Sửa `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (L-006) | 1 file sửa | None |
| STEP-11 | Sửa `app/admin/labor-profiles/[id]/page.tsx` (L-007) | 1 file sửa | None |
| STEP-12 | Sửa `app/admin/applications/page.tsx` (L-047) | 1 file sửa | None |
| STEP-13 | Sửa `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (F11 §9 binding) | 1 file sửa | None |
| STEP-14 | Verify gates (`typecheck` / `lint` / `test:unit` / `build` / `git diff --check` / BOM check / `verify-task.ps1` / `verify-handoff.ps1`) | All PASS | None |
| STEP-15 | Commit + push + mở PR non-draft, watch CI 4/4, handback T0 | PR | None |
| STEP-16 | Sửa `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (F11 §9 binding — display `Đăng tin / Gỡ tin / Lưu trữ`; canonical `Publish / Unpublish / Archive` chỉ trong `aria-label`/`value`; `runStateMutation` argument KHÔNG đổi) | 1 file sửa | None |

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave1-foundation/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` exit 0 | None |
| AC-01 | E-01 | glossary.static.test PASS (17 entries, unique codes, non-empty labels) | None |
| AC-02 | E-02 | role-labels.static.test PASS (13 SystemRoles + Vendor alias) | None |
| AC-03 | E-03 | form-dictionary.static.test PASS (≥11 entries) | None |
| AC-04 | E-04 | action-dictionary.static.test PASS (≥17 entries; F11 #1/#2 excluded) | None |
| AC-05 | E-05 | `npm run typecheck` PASS; error-dictionary.ts local-binding fix applied; re-exports preserved | None |
| AC-06 | E-06 | status-badge.test.tsx PASS (module+status+tone; data-attributes correct) | None |
| AC-07 | E-07 | `rg "'/admin/staffing'" src/shared/ui/role-guard/role-guard-layout.tsx` → `'Nhu cầu tuyển dụng'` mapped | None |
| AC-08 | E-08 | `rg "Người dùng" src/shared/ui/role-guard/role-guard-layout.tsx` → match via `formLabel('default_user')` | None |
| AC-09 | E-09 | `rg "roleLabel" src/shared/ui/role-guard/role-guard-layout.tsx` → role chip uses helper | None |
| AC-10 | E-10 | `rg "chưa có tên" app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` → present; `'(no name)'` absent | None |
| AC-11 | E-11 | `rg "identityVerificationLabel" app/admin/labor-profiles/[id]/page.tsx` → present | None |
| AC-12 | E-12 | `rg "Số CCCD" app/admin/applications/page.tsx` → present; raw `CCCD` in `<dt>` replaced | None |
| AC-13 | E-13 | `admin-jobs-terminology.static.test.ts` PASS; assertions updated for F11 §9 binding | None |
| AC-14 | E-14 | No new raw HTML/CSS classes outside `slate-*`/`bg-*` token classes | None |
| AC-15 | E-15 | `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` delta = 0 in commit scope | None |
| AC-16 | E-16 | `git diff --check` PASS; UTF-8 no-BOM strict scan PASS across 26 changed text files | None |
| AC-17 | E-17 | This HANDOFF | None |
| AC-18 | E-18 | `identity-verification-ui.ts` lives in `src/domains/talent/`, NOT in `src/shared/i18n/glossary.ts` | None |
| AC-19 | E-19 | `editor-shell.tsx` 3 ActionButton calls: `label="Đăng tin"/"Gỡ tin"/"Lưu trữ"`, `ariaLabel="Publish"/"Unpublish"/"Archive"`; canonical lifecycle name ONLY in `aria-label`; `runStateMutation('publish'|'unpublish'|'archive')` argument unchanged | None |
| AC-20 | E-20 | `npm run typecheck` PASS (0 errors after local-binding fix) | None |
| AC-21 | E-21 | `npm run lint` PASS — 0 errors introduced; lint warnings present in `tests/db/**` integration tests exist in `HEAD` commit `796e13c69996756d1298bc1a7ec9b50bab935c9f` (Wave 1 commit did not modify `tests/db/**`) | None |
| AC-22 | E-22 | `editor-shell.tsx` F11 §9 binding present; `admin-jobs-terminology.static.test.ts` PASS | None |

## 4. Changed Deliverables

### New (13 files)

- `src/shared/i18n/glossary.ts` (STEP-01)
- `src/shared/i18n/role-labels.ts` (STEP-02)
- `src/shared/i18n/form-dictionary.ts` (STEP-03)
- `src/shared/i18n/action-dictionary.ts` (STEP-04)
- `src/shared/i18n/error-dictionary.ts` (STEP-05)
- `src/shared/i18n/__tests__/glossary.static.test.ts` (STEP-01)
- `src/shared/i18n/__tests__/role-labels.static.test.ts` (STEP-02)
- `src/shared/i18n/__tests__/form-dictionary.static.test.ts` (STEP-03)
- `src/shared/i18n/__tests__/action-dictionary.static.test.ts` (STEP-04)
- `src/shared/ui/status-badge/index.tsx` (STEP-06)
- `src/shared/ui/status-badge/status-badge.test.tsx` (STEP-06)
- `src/domains/talent/identity-verification-ui.ts` (STEP-09)
- `src/domains/talent/__tests__/identity-verification-ui.test.ts` (STEP-09)
- `docs/tasks/hrp-admin-localization-wave1-foundation/HANDOFF.md` (this file)

### Modified (7 files)

- `src/shared/ui/role-guard/role-guard-layout.tsx` (STEP-07)
- `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (STEP-10)
- `app/admin/labor-profiles/[id]/page.tsx` (STEP-11)
- `app/admin/applications/page.tsx` (STEP-12)
- `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (STEP-13)
- `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (STEP-16)
- `src/domains/talent/recruiter-assignment.manager.component.test.tsx` (L-006 test fixture)

### Untouched (out of scope)

- `app/admin/admin-shell.tsx` — no Wave 1 surface change (only indirect effect via role-guard-layout).
- All UI2 Phase B files (T1C-owned).
- All Wave 2/3/4 surfaces (forbidden paths in TASK §4.2).
- `prisma/schema.prisma`, `middleware.ts`, `.github/**`, `packages/**`.

## 5. Deviations

| ID | Type | Description | Resolution |
|---|---|---|---|
| — | — | None | — |

Note: During verification, `src/shared/i18n/error-dictionary.ts` initially used `export { X } from '...'` re-exports without local bindings, making `errorLabel()` unable to reference the constants at runtime. Fixed by importing the constants locally in addition to re-exporting. Re-export contract unchanged. Not a deviation — pre-merge self-review caught and fixed.

## 6. Evidence Index

| Evidence | Command / method | Exit / measured | Artifact |
|---|---|---|---|
| E-01 | `npm run test:unit -- src/shared/i18n/__tests__/glossary.static.test.ts` | exit 0; PASS | inline |
| E-02 | `npm run test:unit -- src/shared/i18n/__tests__/role-labels.static.test.ts` | exit 0; PASS | inline |
| E-03 | `npm run test:unit -- src/shared/i18n/__tests__/form-dictionary.static.test.ts` | exit 0; PASS | inline |
| E-04 | `npm run test:unit -- src/shared/i18n/__tests__/action-dictionary.static.test.ts` | exit 0; PASS | inline |
| E-05 | `npm run typecheck` (full repo) | exit 0; 0 errors | inline |
| E-06 | `npm run test:unit -- src/shared/ui/status-badge/status-badge.test.tsx` | exit 0; PASS | inline |
| E-07 | `rg "'/admin/staffing'" src/shared/ui/role-guard/role-guard-layout.tsx` → assert label `'Nhu cầu tuyển dụng'` adjacent | match | inline |
| E-08 | `rg "Người dùng" src/shared/ui/role-guard/role-guard-layout.tsx` | match | inline |
| E-09 | `rg "roleLabel" src/shared/ui/role-guard/role-guard-layout.tsx` | match in chip render | inline |
| E-10 | `rg "chưa có tên" app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` + `rg "'(no name)'" ...` (negative) | positive; negative | inline |
| E-11 | `rg "identityVerificationLabel" app/admin/labor-profiles/[id]/page.tsx` | match | inline |
| E-12 | `rg "Số CCCD" app/admin/applications/page.tsx` + raw `<dt>CCCD` check (negative) | match; negative | inline |
| E-13 | `npm run test:unit -- app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | exit 0; PASS | inline |
| E-14 | `rg "className=\"" app/admin/labor-profiles/[id]/page.tsx src/shared/ui/status-badge/index.tsx` | only token classes (`slate-*`, `bg-*`, `rounded-full px-2 py-0.5 text-xs font-semibold`) | inline |
| E-15 | `git diff --stat -- package.json pnpm-lock.yaml pnpm-workspace.yaml` against source commit | 0 changes in commit | inline |
| E-16 | `git diff --check` + Node.js UTF-8 no-BOM strict scan over 26 changed text files | exit 0; PASS | inline |
| E-17 | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave1-foundation/TASK.md` | exit 0; PASS | inline |
| E-18 | `rg "identityVerification" src/shared/i18n/glossary.ts` (negative) + verify file lives in `src/domains/talent/` | negative; positive location | inline |
| E-19 | `rg "Đăng tin.*aria-label=.Publish|Gỡ tin.*aria-label=.Unpublish|Lưu trữ.*aria-label=.Archive" app/admin/jobs/job-postings/[id]/editor-shell.tsx` | 3 matches | inline |
| E-20 | `npm run typecheck` (full repo) | exit 0; 0 errors | inline |
| E-21 | `npm run lint` (full repo) | exit 0; 0 errors, 919 pre-existing warnings | inline |
| E-22 | `npm run test:unit -- app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | exit 0; PASS | inline |
| E-23 | `npm run build` (full repo) | exit 0; Next.js 15 production build PASS | inline |
| E-24 | `npm run test:unit` (full repo) | exit 0; Test Files 231 passed (231) / Tests 3759 passed | 9 skipped (3768) | inline |
| E-25 | `pwsh -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-admin-localization-wave1-foundation/TASK.md` | exit 0; `RESULT: PASS. TASK contract is ready for execution.` | inline |

## 7. Execution Round History

| Round | Spec | Status | Outcome |
|---|---|---|---|
| 1 | v1.0 | READY_FOR_REVIEW | Wave 1 foundation complete; all 22 ACs PASS; no deviations; no correction batch used. |

> Handoff status: `READY_FOR_REVIEW`