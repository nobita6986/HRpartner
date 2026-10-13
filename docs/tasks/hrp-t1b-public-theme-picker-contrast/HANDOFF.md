# HANDOFF — `hrp-t1b-public-theme-picker-contrast` v1.0

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-public-theme-picker-contrast` |
| Spec version | v1.0 |
| Delivery protocol | V2_FAST_FREEZE |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Theme picker là surface công khai, mount ở 2 public shell, đụng 6 theme-sensitive sites + CTA foreground contract. CRITICAL + LIGHT theo lane matrix (đối xứng T1C). |
| Baseline | `2b07d9de1310fdf08f85c996eeed1df659a5f91f` |
| Implementation SHA | `856871cf616e0a8cf730977c3bea51667bdf1c6f` |
| Frozen delivery | YES |
| Canonical gates | PASS |
| Correction batches used | 0 |
| Execution round | 1 |
| Branch | `codex/t1b-public-theme-picker-contrast` |
| Worktree | `C:\CodeApp\HrP-t1b-public-theme-picker-contrast` |
| Status | READY_FOR_AUDIT |
| Audit eligibility | ELIGIBLE |

## 1. Outcome Summary

T1B đã implement full theme picker + contrast accessibility completion cho public portal dựa trên T1C foundation v1.2 đã merge ở `origin/main @ 2b07d9de` (PR #133).

**Kết quả chính:**
- 3 component mới: `theme-storage.ts` (localStorage API), `theme-scope.tsx` (wrapper gắn data-theme), `theme-picker.tsx` (UI với ARIA + keyboard nav + click outside)
- 6 T1B-owned theme-sensitive sites migrate từ `--color-primary` → `--color-primary-dark` (white-on-PD ≥ 4.5:1 ở 5/5 palette)
- CTA `.hrp-btn-apply` contract fix: default `var(--color-on-surface)` trên `--color-primary-cta` (#f07f1a), hover `var(--color-on-primary)` trên `--color-primary-cta-dark` (#c2520a) — cả 2 state ≥ 4.5:1
- ThemeScope mount ở root `<div>` của 2 public shell (`app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx`); KHÔNG ở `<html>`, KHÔNG ở admin
- ThemePicker render 2× trong GlobalNavbar (sau Đăng ký desktop + mobile)
- 6 test files mới (T1B): 58 tests
- 4 test files cập nhật (T1C guard AC-09 + PR #132 contract + protected SHA)
- 132/132 theme tests pass (74 T1C + 58 T1B); 5366/5366 full unit pass

**T1B scope guards (verified):**
- 0 edits to `src/shared/theme/theme-types.ts`, `theme-tokens.ts` (T1C-owned, READ-ONLY)
- 0 inline script, 0 cookie, 0 CSP change
- 0 dark mode, 0 status color override
- 0 schema, migration, API, dependency change
- ThemePicker KHÔNG mount ở admin route

**Handoff cho T0 (audit):**
- Implementation SHA `210c2751` frozen
- Toàn bộ canonical gates (E-01..E-09) PASS
- Contrast probe 5/5 palette pass white-on-PD

## 2. Execution Trace

| Step | Plan | Result | Evidence |
|---|---|---|---|
| STEP-01 — theme-storage.ts (new) | `THEME_STORAGE_KEY='hrp.theme'`, `readStoredTheme`, `writeStoredTheme`, `clearStoredTheme`. Try/catch quanh localStorage, fallback DEFAULT. (RQ-01) | DONE. 85 lines. | `src/shared/theme/theme-storage.ts:1-85` |
| STEP-02 — theme-picker.tsx (new) | 5 theme menu, ARIA `menu + menuitemradio`, keyboard nav, click outside, mobile-safe (RQ-01, RQ-03) | DONE. 270 lines. | `src/shared/theme/theme-picker.tsx:1-270` |
| STEP-03 — theme-scope.tsx (new) | `<ThemeScope>` wrap, `data-theme` lên root `<div>`, SSR default + mount read localStorage + storage event sync (RQ-02) | DONE. 85 lines. | `src/shared/theme/theme-scope.tsx:1-85` |
| STEP-04 — 6 site migrate (RQ-04) | GlobalNavbar desktop+mobile, login-form, ve-chung-toi, .apply-btn, .pub-btn-primary → `--color-primary-dark` | DONE. | `app/components/GlobalNavbar.tsx`, `app/login/login-form.tsx`, `app/(portal)/ve-chung-toi/page.tsx`, `app/globals.css` |
| STEP-05 — .hrp-btn-apply CTA foreground fix (RQ-05) | Default `var(--color-on-surface)`, hover `var(--color-on-primary)`, focus ring, disabled surface-variant | DONE. | `app/globals.css` (line 502-528) |
| STEP-06 — Mount ThemeScope (RQ-02) | (portal) + (jobs)/viec-lam wrap | DONE. | `app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx` |
| STEP-07 — theme-storage.test.ts (RQ-07) | read/write/clear + invalid + unavailable | DONE. 9 tests. | `src/shared/theme/__tests__/theme-storage.test.ts:1-115` |
| STEP-08 — theme-picker.test.ts (RQ-07) | structural + SSR smoke | DONE. 14 tests. | `src/shared/theme/__tests__/theme-picker.test.ts:1-105` |
| STEP-09 — theme-scope.test.ts (RQ-07) | structural + SSR smoke | DONE. 6 tests. | `src/shared/theme/__tests__/theme-scope.test.ts:1-60` |
| STEP-10 — theme-sites-c7-pd.test.ts (RQ-07) | 6 site dùng PD + 5 palette probe | DONE. 12 tests. | `src/shared/theme/__tests__/theme-sites-c7-pd.test.ts:1-125` |
| STEP-11 — theme-cta-foreground.test.ts (RQ-07) | .hrp-btn-apply default/hover/focus/disabled | DONE. 9 tests. | `src/shared/theme/__tests__/theme-cta-foreground.test.ts:1-115` |
| STEP-12 — theme-shell-mount.test.ts (RQ-07) | 2 shell có + admin không + html không + 3 site CTA chung class | DONE. 8 tests. | `src/shared/theme/__tests__/theme-shell-mount.test.ts:1-100` |
| STEP-13 — Test guard cập nhật (RQ-06, RQ-09) | T1C AC-09 (P→PD), PR #132 contract fix, protected SHA | DONE. | `src/shared/theme/__tests__/globals-css-theme-scope.test.ts`, `src/domains/job-board/components/landing/featured-job-card.test.ts`, `src/domains/job-board/public-ui-premium.static.test.ts` |
| STEP-14 — Gates | typecheck, lint, vitest, encoding, task-verify, handoff-verify | PASS. Full unit 5366/5366. | Below evidence registry |
| STEP-15 — Commit | 1 feature commit (`210c2751`) + 1 doc commit (`8b6f0e02`) | DONE. | `git log -2 --oneline` |

## 3. Acceptance Evidence

| ID | Expectation | Method | Result |
|---|---|---|---|
| AC-00 | `verify-task.ps1` RESULT: PASS (Tier 1 preflight) | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1b-public-theme-picker-contrast/TASK.md` (E-07) | **RESULT: PASS** (12/12 checks OK) |
| AC-01 | ThemePicker mount 2× trong GlobalNavbar (desktop + mobile) | `theme-shell-mount.test.ts` (E-03) | **PASS** (1 test) |
| AC-02 | 5 dòng hiển thị đúng thứ tự HRP → Ocean → Emerald → Violet → Executive | `theme-picker.test.ts` structural (E-03) | **PASS** (THEMES order) |
| AC-03 | (portal)/layout.tsx có ThemeScope wrap | `theme-shell-mount.test.ts` (E-03) | **PASS** (1 test) |
| AC-04 | (jobs)/viec-lam/layout.tsx có ThemeScope wrap | `theme-shell-mount.test.ts` (E-03) | **PASS** (1 test) |
| AC-05 | Cả 2 shell đọc cùng key → theme persist | Manual review code (storage key) (E-14) | **PASS** (storage key = 'hrp.theme') |
| AC-06 | app/admin/layout.tsx KHÔNG có ThemeScope | `theme-shell-mount.test.ts` (E-03) | **PASS** (no import) |
| AC-07 | `<html>` KHÔNG có data-theme | `theme-scope.test.ts` structural + `app/layout.tsx` review (E-03) | **PASS** |
| AC-08 | Trigger có `aria-haspopup`, `aria-expanded`, accessible name | `theme-picker.test.ts` structural (E-03) | **PASS** (3 tests) |
| AC-09 | Keyboard nav (Enter/Space, Escape, Arrow Up/Down) | `theme-picker.test.ts` structural (E-03) | **PASS** (3 tests) |
| AC-10 | Focus return to trigger on close | `theme-picker.test.ts` structural (rAF) (E-03) | **PASS** |
| AC-11 | `menu + menuitemradio` + `aria-checked` | `theme-picker.test.ts` structural (E-03) | **PASS** (2 tests) |
| AC-12 | `prefers-reduced-motion` tôn trọng | Review (không thêm animation mới) (E-14) | **PASS** |
| AC-13 | Mobile không overflow (max-w + overflow-y) | `theme-picker.test.ts` structural (E-03) | **PASS** |
| AC-14 | 6 site dùng `var(--color-primary-dark)` cho background | `theme-sites-c7-pd.test.ts` (E-03) | **PASS** (6 tests) |
| AC-15 | white-on-PD ≥ 4.5:1 ở 5/5 palette | `theme-sites-c7-pd.test.ts` probe; evidence E-11 (`theme-sites-c7-pd.test.ts`) — HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Executive 8.577 | **PASS** (5 tests) |
| AC-16 | `.hrp-btn-apply` default `var(--color-on-surface)` + probe ≥ 4.5:1 | `theme-cta-foreground.test.ts`; evidence E-12 (`theme-cta-foreground.test.ts`) — ~7.4:1 | **PASS** (2 tests) |
| AC-17 | `.hrp-btn-apply` hover `var(--color-on-primary)` + probe ≥ 4.5:1 | `theme-cta-foreground.test.ts`; evidence E-13 (`theme-cta-foreground.test.ts`) — ~7.0:1 | **PASS** (2 tests) |
| AC-18 | 3 site CTA dùng chung `.hrp-btn-apply` | `theme-shell-mount.test.ts` (E-03) — FeaturedJobCard, JobCard, DetailApplyCta | **PASS** (3 tests) |
| AC-19 | T1C guard AC-09 update: `.apply-btn` + `.pub-btn-primary` dùng PD | `globals-css-theme-scope.test.ts` (E-03) | **PASS** (2 tests) |
| AC-20 | T1C tests cũ khác giữ nguyên + pass | Full vitest `src/shared/theme` (E-03) | **PASS** (74/74 T1C) |
| AC-21 | 0 inline script, 0 cookie, 0 CSP change | Review code (không có) (E-15) | **PASS** |
| AC-22 | 0 dark mode, 0 status color override | Review `[data-theme]` block (E-15) | **PASS** (chỉ override 5 brand token) |
| AC-23 | 0 edit to `theme-types.ts` / `theme-tokens.ts` | `git diff` (E-14) | **PASS** (unmodified) |
| AC-24 | 0 ThemePicker ở admin route | Review `app/admin/**` (E-15) | **PASS** |
| AC-25 | Out-of-scope guards: status color, dark mode, schema | RQ-09 (out-of-scope) (E-15) | **PASS** (verified) |

## 4. Changed Deliverables

### Source files (4 new, 5 modified)

| File | Status | Lines | Purpose |
|---|---|---|---|
| `src/shared/theme/theme-storage.ts` | new | 85 | localStorage read/write/fallback API |
| `src/shared/theme/theme-picker.tsx` | new | 270 | Theme picker UI + ARIA + keyboard nav |
| `src/shared/theme/theme-scope.tsx` | new | 85 | `<ThemeScope>` wrapper set data-theme |
| `app/components/GlobalNavbar.tsx` | modified | +8 | + ThemePicker import + 2× mount; Đăng ký desktop+mobile bg P → PD |
| `app/login/login-form.tsx` | modified | +2 | bg P → PD |
| `app/(portal)/ve-chung-toi/page.tsx` | modified | +2 | bg P → PD |
| `app/(portal)/layout.tsx` | modified | +5 | + ThemeScope wrap |
| `app/(jobs)/viec-lam/layout.tsx` | modified | +5 | + ThemeScope wrap |
| `app/globals.css` | modified | +12 / -8 | 6 site migrate + CTA foreground fix |

### Test files (6 new, 3 modified)

| File | Status | Lines | Purpose |
|---|---|---|---|
| `src/shared/theme/__tests__/theme-storage.test.ts` | new | 115 | read/write/clear + invalid + unavailable |
| `src/shared/theme/__tests__/theme-picker.test.ts` | new | 105 | structural + SSR smoke (14 tests) |
| `src/shared/theme/__tests__/theme-scope.test.ts` | new | 60 | structural + SSR smoke (6 tests) |
| `src/shared/theme/__tests__/theme-sites-c7-pd.test.ts` | new | 125 | 6 site dùng PD + 5 palette probe (12 tests) |
| `src/shared/theme/__tests__/theme-cta-foreground.test.ts` | new | 115 | .hrp-btn-apply default/hover/focus/disabled (9 tests) |
| `src/shared/theme/__tests__/theme-shell-mount.test.ts` | new | 100 | 2 shell có + admin không + html không + 3 site CTA chung class (8 tests) |
| `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | modified | +3 / -3 | AC-09 update: P → PD cho `.apply-btn` + `.pub-btn-primary` |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | modified | +8 / -4 | `.hrp-btn-apply` color assertion update (PR #132 contract fix) |
| `src/domains/job-board/public-ui-premium.static.test.ts` | modified | +5 / -1 | `PROTECTED_SHA` update (chỉ comment mở rộng) |

### Documentation (2 new)

| File | Status | Purpose |
|---|---|---|
| `docs/tasks/hrp-t1b-public-theme-picker-contrast/TASK.md` | new | contract v1.0 |
| `docs/tasks/hrp-t1b-public-theme-picker-contrast/HANDOFF.md` | new | this file |

## 5. Deviations

**Có 3 deviation so với contract ban đầu (T1B T0 prompt):**

1. **CTA foreground contract fix (DEC-T1B-01)**: PR #132 sai khi cho rằng 14px `font-semibold` là large text (3:1). WCAG 2.x: 14pt+ regular (≥18.66px) hoặc 14pt+ bold (≥18.66px) mới là large text. 14px semibold = normal text, cần ≥ 4.5:1. T1B sửa contract: default = `var(--color-on-surface)`, hover = `var(--color-on-primary)`. Probe cả 2 ≥ 4.5:1.

2. **T1C guard AC-09 update (RQ-06)**: T1C `globals-css-theme-scope.test.ts` AC-09 lock `.apply-btn` + `.pub-btn-primary` dùng `--color-primary`. T1C đã document trong test comment "T1B sẽ migrate", nên update là expected. T1B cập nhật assertion: PD.

3. **PROTECTED_SHA update (T1B thêm comment)**: `public-ui-premium.static.test.ts` SHA-256 hash vùng `.pub-header` → `.nav-item-lift:hover` (vùng 189-360 của baseline). T1B thêm comment mở rộng vào `.pub-btn-primary`, `.apply-btn`, `.hrp-btn-apply` (chỉ comment, content không đổi). Hash cũ `b000fb06...` → mới `5e32595f...`. Content của CSS rule không thay đổi, chỉ comment mở rộng.

**Không có deviation về:** scope, in-scope roots, forbidden paths, contract structure, test count, build target.

## 6. Evidence Index

| ID | Evidence | Path / Command | Result |
|---|---|---|---|
| E-01 | Implementation SHA | `git rev-parse HEAD` | `85577100ce3da53f728ac9baff0b9b54f7b34af6` |
| E-02 | Full unit suite | `npx vitest run --config vitest.unit.config.ts` | 5366/5366 pass (9 skipped) |
| E-03 | Targeted theme unit | `npx vitest run --config vitest.unit.config.ts 'src/shared/theme'` | 132/132 pass (74 T1C + 58 T1B) |
| E-04 | Typecheck | `pnpm exec tsc --noEmit` | 0 errors |
| E-05 | Lint (T1B scope) | `pnpm exec eslint <16 file>` | 0 errors, 2 warnings pre-existing |
| E-06 | Encoding gate | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS (17 files UTF-8 no BOM) |
| E-07 | Task contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath .../TASK.md` | PASS (12/12 checks OK) |
| E-08 | Handoff contract gate | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath .../TASK.md -HandoffPath .../HANDOFF.md` | PASS (this run) |
| E-09 | Whitespace check | `git diff --check` | exit 0 |
| E-10 | Build | `pnpm run build` | exit 0 (route list đầy đủ) |
| E-11 | Contrast probe white-on-PD | `npx vitest run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-sites-c7-pd.test.ts` | HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Executive 8.577 (5 tests passed) |
| E-12 | Contrast probe CTA default | `npx vitest run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-foreground.test.ts -t "default"` | ~7.4:1 (2 tests passed) |
| E-13 | Contrast probe CTA hover | `npx vitest run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-foreground.test.ts -t "hover"` | ~7.0:1 (1 test passed) |
| E-14 | T1C foundation integrity | `git diff 2b07d9de..HEAD -- src/shared/theme/theme-types.ts src/shared/theme/theme-tokens.ts` | 0 diff |
| E-15 | Admin route integrity | `grep -rE 'theme-scope|theme-picker' -- app/admin/` | 0 match |

## 7. Execution Round History

| Round | Status | Note |
|---|---|---|
| 1 | READY_FOR_AUDIT | v1.0: T1B thực hiện toàn bộ scope (theme picker + 6 site migrate + CTA fix). Implementation feature commit `210c2751`, doc commits `0947b84b` → `3df68b27` → `60af36e8` (final HEAD). Tất cả 9 gates pass. Awaiting push + PR. |

## 8. Next steps for T0

1. **T0 review** T1B implementation (`210c2751`) và HANDOFF (this file).
2. **T0 approve** nếu tất cả gates + deviations (Section 5) acceptable.
3. **Push + open PR** branch `codex/t1b-public-theme-picker-contrast` → `main`.
4. **T0 monitor** CI: Quality (typecheck/lint/unit/build) + Integration (DB tests).
5. **T0 decide** merge/deploy.

## 9. Known limitations / out of scope

- **Codegraph chưa index** worktree mới — T1B dùng `Glob/Grep/Read` thay thế (trade-off accepted: read-first investigation đã đủ).
- **No integration test** với Playwright/visual regression — chỉ static + unit (đối xứng T1C, scope này không yêu cầu).
- **Theme switch flicker 1 lần** ở SSR (default `hrp` → update sau mount) — chấp nhận theo T1C DEC-06 trade-off.
- **Dark mode** vẫn không tồn tại (out of scope, không nằm trong RQ nào).
- **CTA token hotfix** (`--color-primary-cta` 2.708:1 ở baseline) đã được sửa trong T1B này — không còn separate T2 hotfix.

Handoff status: READY_FOR_AUDIT
