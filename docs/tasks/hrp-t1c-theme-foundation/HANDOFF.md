# HANDOFF — `hrp-t1c-theme-foundation` v1.2

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-theme-foundation` |
| Spec version | v1.2 |
| Delivery protocol | V2_FAST_FREEZE |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Baseline | `aa86902fcf3c49274a3ccc0cf7decf84aaec4e19` |
| Implementation SHA | `8fc52d7d3e33f62b62b0d54876295be9d9f8e40f` |
| Frozen delivery | YES |
| Canonical gates | PASS |
| Correction batches used | 0 |
| Execution round | 1 |
| Branch | `codex/t1c-theme-foundation` |
| Worktree | `C:\CodeApp\HrP-worktrees\hrp-t1c-theme-foundation` |
| Status | READY_FOR_AUDIT |
| Audit eligibility | ELIGIBLE |

## 1. Outcome Summary

T1C đã chốt và triển khai theme foundation v1.2 theo contract đã được T0 duyệt lần 2.

**Kết quả chính:**
- 5 theme definitions (HRP, Ocean Trust, Emerald Growth, Violet Future, Executive Gold) với hex v1 (DEC-01 chốt)
- Token contract: `src/shared/theme/theme-types.ts` (types + guards) + `theme-tokens.ts` (5 entries)
- CSS overrides: 5 `[data-theme='<key>']` selectors trong `app/globals.css` (sau `:root`, trước Material Symbols)
- 74 tests mới (15 types + 40 contrast + 19 globals-css), all pass
- Full unit suite: 5308/5308 pass (9 skipped, 0 fail)
- All canonical gates pass (typecheck, lint, encoding, task contract, handoff)

**T1C scope guards (verified):**
- 0 edits to GlobalNavbar.tsx, login-form.tsx, ve-chung-toi/page.tsx
- 0 edits to .hrp-btn-apply, .apply-btn, .pub-btn-primary, .fcheck.on
- 0 edits to --color-primary-cta* (CTA token out of scope, default 2.708:1 noted as separate issue)
- 0 inline script, 0 dark mode, 0 status color override

**Handoff cho T1B (tiếp theo):**
- 6 theme-sensitive sites (GlobalNavbar 297/424, login-form 137, ve-chung-toi 145, .apply-btn 660, .pub-btn-primary 552) — T1B sẽ migrate nền từ P sang PD
- Sau khi T1B đổi, white-on-PD contrast 5/5 pass ≥ 4.5:1 (HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Executive 8.577)

## 2. Execution Trace

| Step | Plan | Result | Evidence |
|---|---|---|---|
| STEP-01 — theme-types.ts (new) | Export `ThemeKey` (union 5), `ThemeTokens` (8 fields), `ThemeDefinition`, `THEMES` (readonly 5), `DEFAULT_THEME_KEY='hrp'`, `isThemeKey`, `getTheme` (RQ-01) | DONE. 98 lines. | `src/shared/theme/theme-types.ts:1-98` |
| STEP-02 — theme-tokens.ts (new) | 5 `ThemeDefinition` entries với hex v1 (RQ-02) | DONE. 118 lines. | `src/shared/theme/theme-tokens.ts:1-118` |
| STEP-03 — app/globals.css [data-theme] blocks | 5 selectors after `:root` (line 213) and before `.material-symbols-outlined` (line 268). Each overrides 5 brand tokens (RQ-03) | DONE. +52 lines. | `app/globals.css:222-264` |
| STEP-04 — 3 test files | theme-types (15), contrast-probe (40), globals-css-theme-scope (19) | DONE. 501 lines, 74 tests. | `src/shared/theme/__tests__/` |
| STEP-05 — Gates | typecheck, lint, vitest, encoding, task-verify | PASS. Full unit 5308/5308. | Below evidence registry |
| STEP-06 — Commit | 1 feature commit (8fc52d7d) | DONE. | `git log -1 --oneline` |

## 3. Acceptance Evidence

| ID | Expectation | Method | Result |
|---|---|---|---|
| AC-01 | 5 keys, sorted = ['emerald-growth', 'executive-gold', 'hrp', 'ocean-trust', 'violet-future'] | `vitest run theme-types.test.ts` | **PASS** (15 tests, 0 fail) |
| AC-02 | Each palette has 8 tokens, no undefined/null/empty | `vitest run theme-types.test.ts` | **PASS** (2 tests, 0 fail) |
| AC-03 | isThemeKey guards + getTheme fallback | `vitest run theme-types.test.ts` | **PASS** (12 tests, 0 fail) |
| AC-04 | 5/5 palette-blocker PASS, T1B-owned C7 fail list documented | `vitest run contrast-probe.test.ts` | **PASS** (40 tests, 0 fail) |
| AC-05 | 5 `[data-theme="..."]` selectors, each sets 5 brand tokens, [data-theme="hrp"] idempotent with :root | `vitest run globals-css-theme-scope.test.ts` | **PASS** (5 tests, 0 fail) |
| AC-06 | [data-theme] AFTER :root, BEFORE .material-symbols-outlined | `vitest run globals-css-theme-scope.test.ts` | **PASS** (3 tests, 0 fail) |
| AC-07 | No `prefers-color-scheme`, no `.dark` | `vitest run globals-css-theme-scope.test.ts` | **PASS** (2 tests, 0 fail) |
| AC-08 | .hrp-btn-apply vẫn dùng --color-primary-cta, [data-theme] không override CTA | `vitest run globals-css-theme-scope.test.ts` | **PASS** (2 tests, 0 fail) |
| AC-09 | .apply-btn và .pub-btn-primary vẫn dùng P bg, không bị override trong [data-theme] | `vitest run globals-css-theme-scope.test.ts` | **PASS** (2 tests, 0 fail) |
| AC-10 | :root alias block có 22 khai báo đúng pattern | `vitest run globals-css-theme-scope.test.ts` | **PASS** (regression guard) |
| AC-11 | Tamper test: 1-byte flip → 1 fail trong theme-types hoặc globals-css test | E-09 (run via: sed-replace `#f26522`→`#f26523` in theme-tokens.ts, run E-02), E-10 (same in globals.css) | **PASS** (HRP `#f26522`→`#f26523` triggers 1 fail per file) |
| AC-12 | Canonical gates: typecheck, lint, unit, encoding, task verify (RESULT: PASS) | E-04, E-05, E-02, E-06, E-07 | **PASS — verify-task.ps1 RESULT: PASS** (5/5 gates) |
| AC-13 | Baseline `aa86902f` unchanged | `git log --oneline origin/main..HEAD` | **PASS** (4 commits ahead, 0 baseline-rewrite) |
| AC-14 | T1C không attach data-theme cho 5 forbidden layouts | `grep -rE "data-theme" -- 5 layouts` | **PASS** (0 match) |
| AC-15 | T1C không sửa GlobalNavbar.tsx | `git status --porcelain -- app/components/GlobalNavbar.tsx` | **PASS** (unmodified) |
| AC-16 | T1C không thêm inline script | `grep -rE 'script' --include='*.tsx' --include='*.ts' src/ app/` | **PASS** (0 new matches) |
| AC-17 | T1C không sửa 6 T1B-owned sites | `git diff aa86902f..HEAD -- <6 files>` | **PASS** (0 diff trên 6 sites) |
| AC-18 | T1C không override CTA token, không sửa .hrp-btn-apply | `git diff aa86902f..HEAD -- app/globals.css` | **PASS** (CTA token line 21-22 unchanged) |

## 4. Changed Deliverables

### Source / Test files (6 new, 1 modified)

| File | Status | Lines | Purpose |
|---|---|---|---|
| `src/shared/theme/theme-types.ts` | new | 98 | Types + runtime guards |
| `src/shared/theme/theme-tokens.ts` | new | 118 | 5 palette definitions |
| `src/shared/theme/__tests__/theme-types.test.ts` | new | 126 | 15 tests (AC-01, AC-02, AC-03) |
| `src/shared/theme/__tests__/contrast-probe.test.ts` | new | 157 | 40 tests (AC-04) |
| `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | new | 218 | 19 tests (AC-05..AC-09, AC-17) |
| `app/globals.css` | modified | +52 | 5 `[data-theme]` selectors |

### Documentation (3 modified, in commit `2555a69e`)

| File | Status | Purpose |
|---|---|---|
| `docs/tasks/hrp-t1c-theme-foundation/TASK.md` | modified | Spec v1.2 (T0 directive lần 2) |
| `docs/tasks/hrp-t1c-theme-foundation/DECISION_REQUEST.md` | modified | C7 + 6 T1B-owned sites + CTA note |
| `docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` | modified | C7 pair + verdict split |

## 5. Deviations

**Không có deviation nào so với contract v1.2.**

Mọi RQ (RQ-01..12) và AC (AC-01..18) đều đạt đúng spec. Build gate (`npm run build`) không chạy được trong worktree vì thiếu `.env` (pre-existing CI env issue, không phải T1C change); CI sẽ chạy build gate trên branch.

## 6. Evidence Index

| ID | Evidence | Path / Command | Result |
|---|---|---|---|
| E-01 | Implementation SHA | `git rev-parse HEAD` | `8fc52d7d3e33f62b62b0d54876295be9d9f8e40f` |
| E-02 | Full unit suite | `node_modules/.bin/vitest run --config vitest.unit.config.ts` | 5308/5308 pass (9 skipped) |
| E-03 | Targeted T1C unit | `node_modules/.bin/vitest run src/shared/theme/__tests__/` | 74/74 pass |
| E-04 | Typecheck | `node_modules/.bin/tsc --noEmit` | 0 errors |
| E-05 | Lint (T1C scope) | `node_modules/.bin/eslint src/shared/theme app/globals.css` | 0 errors |
| E-06 | Encoding gate | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS (6 files UTF-8 no BOM) |
| E-07 | Task contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath .../TASK.md` | PASS (A-01..A-05, T-01..T-10) |
| E-08 | Handoff contract gate | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath .../TASK.md -HandoffPath .../HANDOFF.md` | PASS (this run) |
| E-09 | Tamper test (theme-tokens.ts) | manual 1-byte flip `#f26522`→`#f26523` in `src/shared/theme/theme-tokens.ts` | 1 fail in `theme-types.test.ts` (regression detected, file restored) |
| E-10 | Tamper test (globals.css) | manual 1-byte flip `#f26522`→`#f26523` in `app/globals.css` | 1 fail in `globals-css-theme-scope.test.ts` (regression detected, file restored) |
| E-11 | T1B-owned C7 fail list | `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` | 3 fail rows (HRP 3.153 / Emerald 4.338 / Executive 4.062) — T1B-owned |

## 7. Execution Round History

| Round | Status | Note |
|---|---|---|
| 1 | READY_FOR_AUDIT | v1.1 → v1.2: T0 directive lần 2 — 6 theme-sensitive sites T1B-owned, probe C7 added, CTA out-of-scope, 5/5 palette pass palette-blocker. Implementation: 6 source/test files (+769 lines) + HANDOFF. Prior v1.0 → v1.1 planning round (baseline `aa86902f` forward-merge, separate T1C vs T1B ownership) is recorded in TASK.md Revision Log. |

## 8. Next steps for T0 / T1B

1. **T0 review** T1C implementation (`8fc52d7d`) và HANDOFF (this file).
2. **T1B picks up** 6 theme-sensitive sites (Section 2.1 in TASK) trong worktree mới branched từ origin/main HEAD.
3. **T1B re-runs** `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` — expected output: 0 T1B-owned C7 fail rows.
4. **T1B runs** integration tests + visual regression + Lighthouse AA check trên 5 themes.
5. **T1B commits** migration 6 sites + update TASK v1.3 (T1B scope).
6. **T0 approves** final merge + release theme feature.

## 9. Known limitations / out of scope

- **Build gate** (`npm run build`) not run in worktree (no `.env`). CI handles.
- **PWA / favicon hotfix** (separate branch `codex/t1c-favicon-asset-hotfix`, already merged in PR #132 baseline).
- **CTA token hotfix** (`--color-primary-cta` default 2.708:1) — separate T2 hotfix (T0 acknowledged).
- **Theme picker UI**, **localStorage hook**, **`data-theme` mounting** — T1B round, not T1C.

Handoff status: READY_FOR_AUDIT
