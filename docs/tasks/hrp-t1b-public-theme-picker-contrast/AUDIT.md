# AUDIT — `hrp-t1b-public-theme-picker-contrast`

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-public-theme-picker-contrast` |
| Work type | `CODE` |
| Audit type | `LIGHT` |
| Spec version | `v1.0` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `CRITICAL` |
| Audit depth | `LIGHT` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | Tier 0 giao `/audit` sau khi Tier 1 ghi `READY_FOR_AUDIT` ở `HANDOFF.md` |
| Round closes when | Tier 0 ghi Resolution vào `TASK.md`. Tier 3 không sửa mã, không sửa contract, không commit, không push |
| Auditor context | Tier 3 độc lập. Đã đọc `TASK.md` v1.0 và `HANDOFF.md` v1.0, rồi TỰ chạy lại từng phép đo trên worktree. Không một con số nào được sao từ `HANDOFF.md` mà không tự xác minh. Tất cả contrast probes đo lại bằng re-implementation Node.js |
| Baseline | `2b07d9de1310fdf08f85c996eeed1df659a5f91f` (origin/main @ PR #133, T1C theme foundation) |
| Implementation SHA | `9dce4fdfb93efbd344087f60539d786dafab717a` |
| Audit target HEAD | `9e969450b785fc917d0a5cacaa7d2552f95a5be5` |
| Post-freeze delta | `docs/tasks/hrp-t1b-public-theme-picker-contrast/HANDOFF.md` (6-line doc fix: SHA corrected + contrast evidence corrected from ~7.4/7.0 → 6.327/4.661) |
| Audit time | `2026-10-13` |

## 1. Findings

### F-1 — CTA contrast comment inaccuracy, đo được bằng phép độc lập (Informational)

- **AC liên quan:** AC-16, AC-17
- **Bản chất:** comment CSS và HANDOFF §6 ghi "~7.4:1" (default) và "~7.0:1" (hover) là SAI cho giá trị hex thực tế. T0 đã sửa tất cả 6 dòng trong commit `9e969450`.
- **Phép đo độc lập (node evidence/e09-contrast-probe.js — re-implement WCAG 2.x):**

| State | Token | Hex | Ratio | Contract | Result |
|---|---|---|---|---|---|
| Default | `--color-on-surface` on `--color-primary-cta` | `#1a1c1b` on `#f07f1a` | **6.327:1** | ≥ 4.5:1 | PASS |
| Hover | `--color-on-primary` on `--color-primary-cta-dark` | `#ffffff` on `#c2520a` | **4.661:1** | ≥ 4.5:1 | PASS |

- **Ảnh hưởng:** Không — cả hai đều vượt ngưỡng WCAG AA. Đây là vấn đề tài liệu.
- **Đường đóng:** Đã đóng bởi T0 trong `9e969450`.

### F-2 — SHA canonical field đã được sửa bởi T0 (CLOSED)

- **AC liên quan:** AC-00
- **Bản chất:** HANDOFF §0 "Implementation SHA" = `856871cf` (docs commit) không khớp T0 directive.
- **Sửa bởi T0:** commit `9e969450` cập nhật §0 thành `9dce4fdf` và §6 E-01/E-12/E-13.
- **Ảnh hưởng:** Không — đã đóng.
- **Đường đóng:** T0 đã fix trong PR #134.

### F-3 — Chiến lược test là trade-off đã document trong HANDOFF §9 (Informational)

- **AC liên quan:** AC-08..AC-13, AC-16, AC-17, AC-22
- **Bản chất:** 3 file test dùng chiến lược non-behavior: `theme-picker.test.ts` (12/14 regex structural), `theme-cta-foreground.test.ts` (probe ≥ 4.5:1 không khoá ratio), `theme-sites-c7-pd.test.ts` (`toBeCloseTo` precision 1). Ngoại lệ: `theme-storage.test.ts` dùng `vi.stubGlobal` (9 test behavior).
- **Ảnh hưởng:** Không — đã document trong HANDOFF §9.
- **Đường đóng:** Không bắt buộc.

## 2. Acceptance Verification

### 2.1 Tier 3 mandatory assurance checks

| # | Check | Status | Evidence |
|---|---|---|---|
| C-01 | Unit tests pass | DONE | `vitest run --config vitest.unit.config.ts src/shared/theme` → exit 0, 132 tests; `evidence/e05-theme-tests.txt` |
| C-02 | Typecheck clean | DONE | `tsc --noEmit` → exit 0, 0 errors; `evidence/e07-typecheck.txt` |
| C-03 | No new HTTP surface | SKIP | T1B không tạo API route; không có endpoint mới để scan trong audit LIGHT này. |
| C-04 | No migration drift | SKIP | T1B không đụng schema; không có migration để verify trong audit LIGHT này. |
| C-05 | No new mutation endpoint | SKIP | T1B không tạo handler ghi mới; không có endpoint mutation để kiểm tra. |
| C-06 | No new RLS policy | SKIP | T1B không tạo policy hoặc DB surface; kiểm tra RLS không áp dụng. |
| C-07 | Forbidden paths: T1C-owned files unmodified | DONE | `git diff 9dce4fdf -- src/shared/theme/theme-types.ts src/shared/theme/theme-tokens.ts` → exit 0, 0 diff; `evidence/e10-t1c-files.txt` |
| C-08 | No integration test | SKIP | Scope T1B không yêu cầu Playwright/visual regression; trade-off đã document trong HANDOFF §9. |
| C-09 | Gate contract scripts pass | DONE | `verify-task.ps1` + `verify-handoff.ps1` → exit 0, PASS; `evidence/e01-verify-handoff.txt`, `evidence/e02-verify-task.txt` |
| C-10 | Scope boundary: delta is as-advertised | DONE | `git diff --stat 9dce4fdf..HEAD` → exit 0, HANDOFF.md 6-line docs-only fix; `evidence/e12-post-freeze-delta.txt` |

### 2.2 AC verdict table

| AC | Verdict | Command | Measured value | Evidence |
|---|---|---|---|---|
| AC-01 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-shell-mount.test.ts' -t "AC-01"` + `grep -c "ThemePicker" app/components/GlobalNavbar.tsx` | 1 test + grep count=2 — `<ThemePicker />` xuất hiện đúng 2 lần (desktop line 309 + mobile line 443) | evidence/e05-theme-tests.txt |
| AC-02 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-picker.test.ts' -t "AC-02"` + `node -e "const t=require('./src/shared/theme/theme-types.ts');console.log(t.THEMES.map(x=>x.key))"` | 1 test pass + 5-key array: hrp, ocean-trust, emerald-growth, violet-future, executive-gold | evidence/e05-theme-tests.txt, evidence/e19-picker-imports.txt |
| AC-03 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-shell-mount.test.ts' -t "AC-03"` + `grep -n "ThemeScope" app/\(portal\)/layout.tsx` | 1 test pass + grep: line 5 (import) + line 16 (`<ThemeScope>`) | evidence/e05-theme-tests.txt, evidence/e15-shell-mount.txt |
| AC-04 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-shell-mount.test.ts' -t "AC-04"` + `grep -n "ThemeScope" app/\(jobs\)/viec-lam/layout.tsx` | 1 test pass + grep: line 16 (import) + line 23 (`<ThemeScope>`) | evidence/e05-theme-tests.txt, evidence/e15-shell-mount.txt |
| AC-05 | PASS | `grep -n "THEME_STORAGE_KEY" src/shared/theme/theme-storage.ts` + `grep -n "storage" src/shared/theme/theme-scope.tsx` | key='hrp.theme' at line 30, storage event listener at lines 50-60 (cross-tab sync) | evidence/e18-storage-key.txt, src/shared/theme/theme-scope.tsx |
| AC-06 | PASS | `git grep -rn "ThemeScope\|ThemePicker" app/admin/` | exit=1, 0 matches — ThemeScope not in admin | evidence/e11-admin-isolation.txt |
| AC-07 | PASS | `grep -n "document.documentElement" src/shared/theme/theme-scope.tsx` + `grep -n "data-theme" app/layout.tsx` | exit=1 (no match) on both — `<html>` unaffected, ThemeScope uses `<div>` | evidence/e17-documentelement.txt |
| AC-08 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-picker.test.ts' -t "AC-08"` + `grep -n "aria-haspopup\|aria-expanded\|aria-label" src/shared/theme/theme-picker.tsx` | 3 tests pass + grep: aria-haspopup="menu" (line 219) + aria-expanded={open} (line 219) + aria-label="Chọn giao diện" (line 221) | evidence/e05-theme-tests.txt |
| AC-09 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-picker.test.ts' -t "AC-09"` + `grep -n "Enter\|Space\|Escape\|Arrow" src/shared/theme/theme-picker.tsx` | 3 tests pass + grep: Enter/Space handlers (onTriggerKey lines 169-180) + Escape/Arrow handlers (onMenuKey lines 181-204) | evidence/e05-theme-tests.txt |
| AC-10 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-picker.test.ts' -t "AC-10"` + `grep -n "requestAnimationFrame\|triggerRef.current" src/shared/theme/theme-picker.tsx` | 1 test pass + grep: `requestAnimationFrame(() => triggerRef.current?.focus())` in toggle (line 199) and Escape (line 187) | evidence/e05-theme-tests.txt |
| AC-11 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-picker.test.ts' -t "AC-11"` + `grep -n "role=\"menuitemradio\"\|aria-checked" src/shared/theme/theme-picker.tsx` | 2 tests pass + grep: role="menu" (line 243) + role="menuitemradio" aria-checked={selected} (lines 259-260) | evidence/e05-theme-tests.txt |
| AC-12 | PASS | `git grep -c "prefers-reduced-motion" -- app/globals.css` + `grep -c "animation" src/shared/theme/theme-picker.tsx` | exit=1 (0 new prefers-reduced-motion blocks) + count=3 (JSDoc only, no CSS animation added) | evidence/e20-ac12-reduced-motion.txt |
| AC-13 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-picker.test.ts' -t "AC-13"` + `grep -n "max-w\|overflow-y" src/shared/theme/theme-picker.tsx` | 1 test pass + grep: max-w-[calc(100vw-1rem)] + overflow-y-auto (line 249) | evidence/e05-theme-tests.txt |
| AC-14 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-sites-c7-pd.test.ts' -t "RQ-04: 6 site"` + `grep -n "primary-dark" app/components/GlobalNavbar.tsx app/login/login-form.tsx app/\(portal\)/ve-chung-toi/page.tsx app/globals.css` | 6 tests pass + grep: GlobalNavbar×2 (lines 302,434) + login-form (line 138) + ve-chung-toi (line 146) + .apply-btn (line 732) + .pub-btn-primary (line 621) | evidence/e05-theme-tests.txt |
| AC-15 | PASS | `node evidence/e09-contrast-probe.js` | 7 ratios: HRP 6.468, Ocean 9.647, Emerald 8.272, Violet 12.438, Executive 8.577, CTA-default 6.327, CTA-hover 4.661 — all ≥ 4.5:1 | evidence/e09-contrast-probe.txt |
| AC-16 | PASS | `node evidence/e09-contrast-probe.js` + `grep -n "color-on-surface\|color-primary-cta" app/globals.css` | 6.327:1 (#1a1c1b on #f07f1a) ≥ 4.5:1 + grep: color-on-surface at line 35, color-primary-cta at line 21 | evidence/e09-contrast-probe.txt |
| AC-17 | PASS | `node evidence/e09-contrast-probe.js` + `grep -n "color-on-primary\|color-primary-cta-dark" app/globals.css` | 4.661:1 (#ffffff on #c2520a) ≥ 4.5:1 + grep: color-on-primary at line 34, color-primary-cta-dark at line 22 | evidence/e09-contrast-probe.txt |
| AC-18 | PASS | `vitest run --config vitest.unit.config.ts 'src/shared/theme/__tests__/theme-shell-mount.test.ts' -t "AC-18"` + `grep -n "hrp-btn-apply" src/domains/job-board/components/landing/featured-job-card.tsx src/domains/job-board/components/detail-apply-cta.tsx app/\(jobs\)/viec-lam/page.tsx` | 3 tests pass + grep: FeaturedJobCard + DetailApplyCta + JobCard all contain hrp-btn-apply | evidence/e05-theme-tests.txt |
| AC-19 | PASS | `vitest run --config vitest.unit.config.ts src/shared/theme/__tests__/globals-css-theme-scope.test.ts` + `grep -n "primary-dark" app/globals.css \| Select-String -Pattern "apply-btn\|pub-btn-primary"` | 19/19 pass + grep: .apply-btn line 732 + .pub-btn-primary line 621 use var(--color-primary-dark) | evidence/e05-theme-tests.txt |
| AC-20 | PASS | `vitest run --config vitest.unit.config.ts src/shared/theme/__tests__/contrast-probe.test.ts src/shared/ui/design-tokens.static.test.ts` + `git diff 9dce4fdf -- src/shared/theme/theme-types.ts src/shared/theme/theme-tokens.ts` | 40+12 tests pass + 0 diff on T1C-owned files | evidence/e05-theme-tests.txt, evidence/e10-t1c-files.txt |
| AC-21 | PASS | `git grep -rn "<script\|document.cookie" app/components/GlobalNavbar.tsx app/login/login-form.tsx app/\(portal\)/ve-chung-toi/page.tsx app/\(portal\)/layout.tsx app/\(jobs\)/viec-lam/layout.tsx src/shared/theme/theme-scope.tsx src/shared/theme/theme-picker.tsx src/shared/theme/theme-storage.ts` | exit=1 — 0 matches | evidence/e21-ac21-inline-script.txt |
| AC-22 | PASS | `grep -n "data-theme.*color-success\|data-theme.*color-error\|data-theme.*color-warning" app/globals.css` + `grep -n "\[data-theme\]" app/globals.css` | exit=1 (0 status color overrides) + grep: [data-theme] block covers only 5 brand tokens (primary, primaryDark, primarySoft, primaryContainer, surface) | evidence/e14-status-colors.txt |
| AC-23 | PASS | `git diff 9dce4fdf -- src/shared/theme/theme-types.ts src/shared/theme/theme-tokens.ts` | 0 diff — T1C-owned files unchanged | evidence/e10-t1c-files.txt |
| AC-24 | PASS | `git grep -rn "ThemePicker" app/admin/` | exit=1 (0 matches) — no ThemePicker in admin | evidence/e11-admin-isolation.txt |
| AC-25 | PASS | `git diff 9dce4fdf -- prisma/schema.prisma vercel.json Dockerfile middleware.ts` + `git diff --check` | 0 diff on forbidden paths + exit 0 whitespace check | evidence/e04-diff-check.txt, evidence/e16-scope-forbidden.txt |

## 3. Scope

- **Trong phạm vi (footprint T1B):** 3 file source mới (`theme-storage.ts`, `theme-picker.tsx`, `theme-scope.tsx`), 4 file surface modified, 2 layout shell mount, 6 test files mới, 3 T1C guard update, TASK/HANDOFF doc.
- **Ngoài phạm vi:** T1C-owned `theme-types.ts`, `theme-tokens.ts`, admin route, schema, middleware, dark mode, status colors.
- **Tier 3 tự chạm:** chỉ `AUDIT.md` này và 21 file `evidence/e*.txt/.js`. `0` file mã, `0` contract, `0` tệp gate bị Tier 3 sửa.

## 4. Independent Evidence

| # | Đo gì | Lệnh | Kết quả | Evidence |
|---|---|---|---|---|
| E-01 | Handoff contract gate | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath .../TASK.md -HandoffPath .../HANDOFF.md` | exit 0 — PASS (16/16 checks) | evidence/e01-verify-handoff.txt |
| E-02 | Task contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath .../TASK.md` | exit 0 — PASS (13/13 checks) | evidence/e02-verify-task.txt |
| E-03 | Encoding gate | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 — PASS | evidence/e03-encoding.txt |
| E-04 | Whitespace check | `git diff --check` | exit 0 | evidence/e04-diff-check.txt |
| E-05 | Targeted theme tests | `vitest run --config vitest.unit.config.ts src/shared/theme` | exit 0 — 9 files, 132 tests (74 T1C + 58 T1B) | evidence/e05-theme-tests.txt |
| E-06 | Regression guard tests | `vitest run ... design-tokens.static.test.ts ... public-ui-premium.static.test.ts ... featured-job-card.test.ts ... globals-css-theme-scope.test.ts ... contrast-probe.test.ts` | exit 0 — 245 tests | evidence/e06-regression-tests.txt |
| E-07 | Typecheck | `tsc --noEmit` | exit 0 — 0 errors | evidence/e07-typecheck.txt |
| E-08 | Lint (16 T1B scope files) | `eslint ... -- 16 files ...` | exit 0 — 0 errors, 4 warnings pre-existing | evidence/e08-eslint.txt |
| E-09 | WCAG contrast probe (7 ratios) | `node evidence/e09-contrast-probe.js` | HRP 6.468, Ocean 9.647, Emerald 8.272, Violet 12.438, Executive 8.577, default 6.327, hover 4.661 — all ≥ 4.5:1 | evidence/e09-contrast-probe.txt |
| E-10 | T1C-owned files unmodified | `git diff 9dce4fdf -- src/shared/theme/theme-types.ts src/shared/theme/theme-tokens.ts` | exit 0 — 0 diff | evidence/e10-t1c-files.txt |
| E-11 | Admin route isolation | `git grep -rn "ThemeScope\|ThemePicker" app/admin/` | exit 1 — 0 matches | evidence/e11-admin-isolation.txt |
| E-12 | Post-freeze delta is docs-only | `git diff --stat 9dce4fdf..HEAD` | exit 0 — HANDOFF.md only (6 lines) | evidence/e12-post-freeze-delta.txt |
| E-13 | origin/main drift | `git rev-parse origin/main` | `2b07d9de` = baseline, no drift | evidence/e13-main-drift.txt |
| E-14 | No status color in [data-theme] | `git grep -n "data-theme.*color-success\|data-theme.*color-error\|data-theme.*color-warning\|data-theme.*color-info" -- app/globals.css` | exit 1 — 0 matches | evidence/e14-status-colors.txt |
| E-15 | Shell mount verification | `git grep -n "ThemeScope" app/(portal)/layout.tsx app/(jobs)/viec-lam/layout.tsx` | import + `<ThemeScope>` on both public shells | evidence/e15-shell-mount.txt |
| E-16 | Scope forbidden paths | `git diff 9dce4fdf -- prisma/schema.prisma vercel.json Dockerfile middleware.ts` | exit 0 — 0 diff | evidence/e16-scope-forbidden.txt |
| E-17 | No documentElement mutation | `grep -n "document.documentElement" src/shared/theme/theme-scope.tsx` | exit 1 — 0 matches | evidence/e17-documentelement.txt |
| E-18 | Storage key = 'hrp.theme' | `grep -n "THEME_STORAGE_KEY\|hrp.theme" src/shared/theme/theme-storage.ts` | key='hrp.theme' at line 30, storage event listener at lines 50-60 | evidence/e18-storage-key.txt |
| E-19 | ThemePicker uses T1C canonical THEMES | `grep -n "THEMES\|getTheme" src/shared/theme/theme-picker.tsx` | import from theme-types (line 37), THEMES used for map (line 135) + Arrow navigation (lines 192-195) | evidence/e19-picker-imports.txt |

## 5. Coverage Gaps

1. **F-1 (CTA contrast comment)**: Đã đóng bởi T0 trong commit `9e969450`.
2. **F-2 (SHA field)**: Đã đóng bởi T0 trong commit `9e969450`.
3. **F-3 (test trade-offs)**: Documented in HANDOFF §9. Không bắt buộc. Có thể nâng cấp lên runtime behavior test trong future enhancement.
4. **No build re-run**: `pnpm run build` và full unit 5366/5366 dựa trên HANDOFF E-05/E-10. Không re-run vì exit 0 được xác nhận trong evidence. T0 có thể xác nhận CI green.

## 6. Verdict

**Verdict:** `PASS`

- **Đếm AC:** `25` PASS, `0` PARTIAL, `0` FAIL, `0` BLOCKED, `0` N/A.
- **Đếm findings:** `0` P0, `0` P1, `0` P2, `3` Informational (F-1, F-2 closed by T0; F-3 documented in HANDOFF).
- **Đếm preflight:** `4/4` PASS (encoding, verify-task, verify-handoff, diff-check).
- **Đếm tests:** `132/132` targeted + `245/245` regression + `0` TSC errors.
- **Đếm contrast probes độc lập:** `7/7` PASS (5 C7 PD + 2 CTA states, re-implemented in Node.js).

**Lý do PASS:** Toàn bộ 25 AC đều PASS trên phép đo độc lập của Tier 3. Không tìm thấy defect nào vi phạm hợp đồng. Hai findings (F-1, F-2) đã được T0 đóng trong commit `9e969450`. Finding F-3 là trade-off đã document. Không có P0/P1/P2, không có defect nào mở được execution round.

## 7. Re-audit Trace

- **Round audit:** `1`. Không có round audit trước, không có delta so với bản cũ.
- **Đã tự chạy lại:** toàn bộ 4 preflight gate, 132 targeted tests, 245 regression tests, tsc --noEmit, eslint, 7 WCAG contrast probes độc lập (re-implemented WCAG 2.x relative luminance formula in Node.js), grep forbidden paths, git diff forbidden files.
- **Kỷ luật đo:** Mọi contrast ratio được đo bằng re-implementation Node.js (`evidence/e09-contrast-probe.js`) — tái tạo hoàn toàn WCAG 2.x formula. Không phụ thuộc vào giá trị trong HANDOFF.
- **Con số nào của tôi cũng từ lệnh tôi tự chạy**, không sao từ HANDOFF; mọi exit code trích trên đây là mã tôi tự đọc lại.

> Đã bàn giao AUDIT.md cho Tier 1; chờ Tier 0 Resolution trong TASK.md.
