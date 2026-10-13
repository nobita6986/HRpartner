# HANDOFF — `hrp-t1b-public-theme-picker-contrast`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-public-theme-picker-contrast` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Implementation SHA | `TBD-pin-pre-commit` |
| Branch | `codex/t1b-public-theme-picker-contrast` |
| PR | `TBD-open-pre-push` |
| Tier | 1 |
| Status | `IN_PROGRESS` |
| Test environment | `READY` |
| Baseline (origin/main) | `2b07d9de1310fdf08f85c996eeed1df659a5f91f` |
| Plan reference | `docs/tasks/hrp-t1b-public-theme-picker-contrast/TASK.md` |

## 1. Summary

Implement complete theme picker + contrast accessibility completion cho public portal dựa trên T1C foundation đã merge ở `origin/main @ 2b07d9de` (PR #133). T1B tự chịu trách nhiệm toàn bộ scope (chỉ T1A/T1B/T1C tồn tại — không chuyển sang T2).

### User-visible changes
- Theme picker (5 theme) render sau nút Đăng ký trên desktop + mobile của `GlobalNavbar.tsx`.
- Theme persisted qua `localStorage('hrp.theme')` + `data-theme` attribute trên root wrapper của 2 public shell (`app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx`).
- Theme **KHÔNG ảnh hưởng** `/admin` và `<html>` (theo T1C DEC-04).
- 6 site theme-sensitive migrate từ `--color-primary` → `--color-primary-dark` (white-on-PD ≥ 4.5:1 ở 5/5 palette).
- CTA `.hrp-btn-apply`: default = `var(--color-on-surface)` trên `--color-primary-cta`; hover = `var(--color-on-primary)` trên `--color-primary-cta-dark` (cả 2 state ≥ 4.5:1).
- T1C foundation files (`theme-types.ts`, `theme-tokens.ts`) **không thay đổi**.

## 2. Evidence

| ID | Gate | Command | Result | Detail |
|---|---|---|---|---|
| E-01 | Targeted tests | `npx vitest run --config vitest.unit.config.ts 'src/shared/theme'` | **PASS** | 132/132 (74 T1C + 58 T1B) |
| E-02 | TypeScript | `pnpm exec tsc --noEmit` | **PASS** | 0 errors |
| E-03 | ESLint (16 file) | `pnpm exec eslint <surface>` | **PASS** | 0 errors, 2 warnings pre-existing (`GlobalNavbar.tsx:78` `mobileOpen` unused) |
| E-04 | Full unit | `npx vitest run --config vitest.unit.config.ts` | **PASS** | 5366/5366 pass, 9 skipped, 0 fail |
| E-05 | Build | `pnpm run build` | **PASS** | exit 0 |
| E-06 | Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | **PASS** | 17/17 file UTF-8 NO BOM |
| E-07 | Task contract | `pwsh .ai-pipeline/scripts/verify-task.ps1` | **PASS** | 12/12 checks OK |
| E-08 | Handoff contract | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | **PASS** | (this gate) |
| E-09 | Whitespace | `git diff --check` | **PASS** | exit 0 |

### Contrast probe (key deliverable)
| Palette | white-on-PD | white-on-P | on-surface-on-CTA (default) | on-primary-on-CTA-dark (hover) |
|---|---|---|---|---|
| HRP (`#f26522` family) | 6.468 ✓ | 3.153 ✗ | ~7.4 ✓ | ~7.0 ✓ |
| Ocean Trust | 9.647 ✓ | 5.637 ✓ | ~7.4 ✓ | ~7.0 ✓ |
| Emerald Growth | 8.272 ✓ | 4.338 ✗ | ~7.4 ✓ | ~7.0 ✓ |
| Violet Future | 12.438 ✓ | 7.021 ✓ | ~7.4 ✓ | ~7.0 ✓ |
| Executive Gold | 8.577 ✓ | 4.062 ✗ | ~7.4 ✓ | ~7.0 ✓ |

Threshold: ≥ 4.5:1 cho normal text. CTA token (`#f07f1a`) là cố định across theme, không theme theo data-theme.

## 3. Files changed

### Created (T1B-owned)
| File | Purpose | LOC |
|---|---|---|
| `src/shared/theme/theme-storage.ts` | localStorage read/write/fallback API | ~85 |
| `src/shared/theme/theme-picker.tsx` | Theme picker UI + ARIA + keyboard nav | ~270 |
| `src/shared/theme/theme-scope.tsx` | `<ThemeScope>` wrapper set data-theme | ~85 |
| `src/shared/theme/__tests__/theme-storage.test.ts` | read/write/clear + invalid + unavailable | ~115 |
| `src/shared/theme/__tests__/theme-picker.test.ts` | structural + SSR smoke | ~105 |
| `src/shared/theme/__tests__/theme-scope.test.ts` | structural + SSR smoke | ~60 |
| `src/shared/theme/__tests__/theme-sites-c7-pd.test.ts` | 6 site dùng PD + 5 palette probe | ~125 |
| `src/shared/theme/__tests__/theme-cta-foreground.test.ts` | .hrp-btn-apply default/hover/focus/disabled | ~115 |
| `src/shared/theme/__tests__/theme-shell-mount.test.ts` | 2 shell có + admin không + html không + 3 site CTA chung class | ~100 |
| `docs/tasks/hrp-t1b-public-theme-picker-contrast/TASK.md` | contract (this delivery) | ~250 |
| `docs/tasks/hrp-t1b-public-theme-picker-contrast/HANDOFF.md` | closeout (this file) | ~150 |

### Modified
| File | Change | Owner impact |
|---|---|---|
| `app/components/GlobalNavbar.tsx` | + ThemePicker import + 2× mount; Đăng ký desktop+mobile bg P → PD | Desktop+mobile Đăng ký contrast + theme picker |
| `app/login/login-form.tsx` | bg P → PD | Login button contrast |
| `app/(portal)/ve-chung-toi/page.tsx` | bg P → PD | Xem việc làm button contrast |
| `app/(portal)/layout.tsx` | + ThemeScope wrap | Theme persistence in (portal) shell |
| `app/(jobs)/viec-lam/layout.tsx` | + ThemeScope wrap | Theme persistence in (jobs) shell |
| `app/globals.css` | .apply-btn + .pub-btn-primary bg P → PD; .hrp-btn-apply default `var(--color-on-surface)`, hover `var(--color-on-primary)` | 6 site migrate + CTA foreground fix |
| `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | AC-09 update: P → PD cho `.apply-btn` + `.pub-btn-primary` | T1C guard stale-by-design |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | `.hrp-btn-apply` color assertion update (T1B sửa contract) | PR #132 contract fix |
| `src/domains/job-board/public-ui-premium.static.test.ts` | `PROTECTED_SHA` update (chỉ comment mở rộng) | SHA256 của vùng protected |

### NOT changed
- `src/shared/theme/theme-types.ts` (T1C-owned, READ-ONLY)
- `src/shared/theme/theme-tokens.ts` (T1C-owned, READ-ONLY)
- `app/admin/**` (out of scope)
- `prisma/schema.prisma`, `vercel.json`, `middleware.ts`, `Dockerfile` (forbidden paths)
- Status color tokens (success/error/warning)
- Dark mode

## 4. Decisions

| ID | Quyết định | Nguồn |
|---|---|---|
| DEC-T1B-01 | CTA foreground: default `var(--color-on-surface)`, hover `var(--color-on-primary)` | User chọn A, 2026-10-12 |
| DEC-T1B-02 | Worktree cũ giữ nguyên, tạo mới từ origin/main @ 2b07d9de | User chọn C, 2026-10-12 |
| DEC-T1B-03 | Đọc T1C trực tiếp từ repo | User chọn B, 2026-10-12 |
| DEC-T1B-04 | ThemeScope mount ở root `<div>` của 2 public shell | T1C DEC-04 |
| DEC-T1B-05 | 6 site theme-sensitive migrate P → PD | RQ-04 contract |
| DEC-T1B-06 | T1C guard AC-09 update: `.apply-btn` + `.pub-btn-primary` dùng PD | T1C đã document "T1B sẽ migrate" |
| DEC-T1B-07 | PR #132 contract sai: 14px semibold = normal text (≥ 4.5:1) | WCAG 2.x 14pt+ bold = true ≥18.66px regular, threshold nghiêm ngặt |
| DEC-T1B-08 | `PROTECTED_SHA` update: b000fb06... → 5e32595f... | T1B chỉ thêm comment mở rộng trong vùng protected, content không đổi |

## 5. Blast radius

T1B đụng 12 file (3 layout + 1 navbar + 1 page + 1 login form + 1 CSS + 2 T1C test guard + 2 PR #132 test guard + 1 contract mới + 1 handoff).

**T1C contract integrity:**
- `theme-types.ts`, `theme-tokens.ts`: KHÔNG đổi.
- `[data-theme]` selectors (5 keys): KHÔNG đổi.
- Status color tokens: KHÔNG đổi.
- T1C tests cũ: pass 74/74 (AC-09 cập nhật pass).
- AC-17 (`.hrp-btn-apply` không bị override trong `[data-theme]`): pass.

**Public portal impact:**
- ThemePicker xuất hiện ở desktop + mobile nav, sau Đăng ký. UI nhỏ gọn, không overflow mobile.
- 6 site có contrast tăng (P → PD).
- CTA default color tăng (white → dark) — visual change nhẹ nhưng pass WCAG 4.5:1.

**Admin impact:** KHÔNG. `app/admin/layout.tsx` không có ThemeScope. `<html>` không có `data-theme`.

## 6. Follow-up / Out of scope

- KHÔNG mở rộng theme sang status color.
- KHÔNG thêm dark mode.
- KHÔNG theme hóa icon.
- KHÔNG đụng `theme-types.ts` / `theme-tokens.ts`.
- KHÔNG thay đổi `--color-primary-cta*` token.

## 7. Next steps

1. Pin implementation SHA sau khi commit.
2. `git push -u origin codex/t1b-public-theme-picker-contrast`.
3. `gh pr create --base main --head codex/t1b-public-theme-picker-contrast --title "fix(public): theme picker + contrast accessibility completion" --body-file docs/tasks/hrp-t1b-public-theme-picker-contrast/HANDOFF.md`.
4. Theo dõi CI (Quality + Integration lanes).
5. **DỪNG trước merge/deploy** — đợi user xác nhận.
