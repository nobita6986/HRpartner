# TASK — `hrp-t1c-theme-foundation`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-theme-foundation` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Theme foundation defines token contract for 5 palettes; admin scope isolation; contrast invariants; registry of names/labels. CRITICAL + LIGHT is default per lane matrix. |
| Spec version | `v1.2` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `aa86902fcf3c49274a3ccc0cf7decf84aaec4e19` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/shared/theme/`, `app/globals.css` |
| Forbidden paths | `app/(portal)/layout.tsx` (T1B mounts scope + picker), `app/(jobs)/viec-lam/layout.tsx` (T1B mounts scope + picker), `app/admin/layout.tsx`, `app/admin/admin-shell.tsx`, `app/layout.tsx`, `src/shared/theme/theme-storage.ts` (T1B), `src/shared/theme/theme-picker.tsx` (T1B), `app/components/GlobalNavbar.tsx` (T1B owns fully), `app/login/login-form.tsx` (T1B-owned theme-sensitive button), `app/(portal)/ve-chung-toi/page.tsx` (T1B-owned theme-sensitive button), `prisma/schema.prisma`, `vercel.json`, `middleware.ts`, `Dockerfile`, `src/shared/ui/design-tokens.static.test.ts`, `src/domains/job-board/public-ui-premium.static.test.ts` |
| Required gates | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm run build`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-theme-foundation/TASK.md` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `LIGHT: /deliver /audit /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- T1C defines token contract (`ThemeDefinition` + `THEMES` + `getTheme` + `isThemeKey`) for 5 palettes (`hrp`, `ocean-trust`, `emerald-growth`, `violet-future`, `executive-gold`) with hex v1 (see 3.3).
- T1C adds 5 `[data-theme="..."]` blocks to `app/globals.css` AFTER `:root` alias (line 189-211), BEFORE `.material-symbols-outlined` (line 217). Each block overrides 5 brand tokens: `--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-primary-container`, `--color-on-primary-container`.
- T1C does NOT attach `data-theme` to any layout (T1B owns mount scope + picker).
- T1C does NOT edit `GlobalNavbar.tsx` (T1B owns fully; T1C only provides token).

### 1.2 Non-goals

- No API, DB, migration, new dependency.
- No `data-theme` on any layout (T1B scope).
- No edits to `GlobalNavbar.tsx` (T1B scope).
- No dark mode (gate `src/domains/job-board/public-ui-premium.static.test.ts:681-683` locks `prefers-color-scheme`=0 and `.dark`=0).
- No override of `--color-primary-cta` / `--color-primary-cta-dark` (CTA token is separate from brand).
- No edits to `.hrp-btn-apply` (uses `--color-primary-cta`, separate from brand).
- No override of `--color-surface`, `--color-on-surface`, `--color-background`.
- No new inline scripts.
- No new `@media (prefers-color-scheme: dark)`.
- No edits to `src/shared/ui/design-tokens.static.test.ts` or `src/domains/job-board/public-ui-premium.static.test.ts`.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/globals.css:7-25` — `@theme` directive with brand tokens plus CTA tokens (PR #132). PR #132 added `--color-primary-cta: #f07f1a` and `--color-primary-cta-dark: #c2520a` (line 21-22), separated from brand. | CTA uses separate token; T1C does NOT override. |
| `EV-02` | `app/globals.css:163` — `--color-focus-ring: var(--color-primary-dark)` | T1C override of `primary-dark` cascades to focus ring. |
| `EV-03` | `app/globals.css:189-211` — 22 `:root` aliases correctly using `var(--color-...)` with no hex (line 190 `--primary: var(--color-primary);`, etc.). | Runtime `[data-theme]` override cascades to aliases. |
| `EV-04` | `app/globals.css:442-462` — `.hrp-btn-apply` uses `--color-primary-cta` and `--color-primary-cta-dark`, SEPARATE from brand. Comment line 436: "KHONG co transform va KHONG nam trong allowlist transform cua RQ-23". | T1C does NOT edit `.hrp-btn-apply`. |
| `EV-05` | `app/globals.css:552-558` — `.pub-btn-primary` uses `--color-primary` + `--color-on-primary`. | C2 decoration: T1C keeps as-is. |
| `EV-06` | `app/globals.css:660-668` — `.apply-btn` uses `--color-primary` + `--color-on-primary`. | C2 decoration: T1C keeps as-is. |
| `EV-07` | `app/globals.css:619` — `.fcheck.on` uses `--color-primary`. | C2 decoration: T1C keeps as-is. |
| `EV-08` | `app/(portal)/layout.tsx:11-22` — public shell uses `GlobalNavbar` + `GlobalFooter` + `FloatingChatActions`. T1C does NOT edit this file (T1B mounts scope + picker). | Layout shell is T1B scope. |
| `EV-09` | `app/(jobs)/viec-lam/layout.tsx:17-26` — same as EV-08. T1C does NOT edit this file (T1B mounts scope + picker). | T1B mounts scope. |
| `EV-10` | `app/components/GlobalNavbar.tsx:67,158,186,241,297,360,383,424` — "Dang ky" button line 297, 424 uses `--color-primary`. T1C does NOT edit this file (T1B owns fully). | GlobalNavbar is T1B scope; T1C only provides token. |
| `EV-11` | `app/admin/layout.tsx:27` (`dynamic = 'force-dynamic'`) + `app/admin/admin-shell.tsx:44-56`. | Admin keeps default HRP. |
| `EV-12` | `src/shared/ui/design-tokens.static.test.ts:106-127` — locks exactly ONE `:root` block, exactly 22 declarations, pattern `^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$` (no `#`). | T1C adds `[data-theme]` blocks AFTER `:root`; invariant preserved. |
| `EV-13` | `src/domains/job-board/public-ui-premium.static.test.ts:681-683` — locks `prefers-color-scheme`=0 and `.dark`=0. | T1C does NOT open dark mode. |
| `EV-14` | `src/domains/job-board/public-ui-token-parity.static.test.ts:1-379` — token set derived from `@theme`, not hand-copied list. | T1C only overrides existing brand tokens. |
| `EV-15` | `src/shared/ui/view-toggle/view-toggle.tsx:55-72` (URL > localStorage > default) + `src/domains/job-board/public-content-controls/sticky-announcement.tsx:99-123` (useEffect + try/catch). | Pattern template for persistence (T1B owns). |
| `EV-16` | `docs/tasks/hrp-t1c-theme-foundation/DECISION_REQUEST.md` — T0 closed DEC-01..07. | Decision state = CLOSED. |
| `EV-17` | `docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` — 5/5 palettes pass 6/6 pairs. | Verify DEC-07. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | 5 palettes with hex v1 (table 3.3) | `CHOSEN` |
| `DEC-02` | key ASCII kebab-case; EN labels for display; VI for guidance/controls | `CHOSEN` |
| `DEC-03` | default `hrp`; invalid/outdated key falls back to `hrp`; no UI crash | `CHOSEN` |
| `DEC-04` | Scope on root `div` of 2 public shells. NOT on `html` tag. Admin keeps default HRP. | `CHOSEN` |
| `DEC-05` | Keep status/badge/stamp colors at default values across all themes (not theme-hazed in MVP) | `CHOSEN` |
| `DEC-06` | `localStorage` + `useEffect` (pattern `sticky-announcement.tsx:99-123`); NO inline script. Accept 1-time flash | `CHOSEN` |
| `DEC-07` | WCAG AA: normal text at least 4.5:1; large text (from 18.66px bold or from 24px regular) plus UI/focus at least 3:1. Applied to 7 real color pairs (6 brand pairs C1-C6 + 1 T1B-owned C7 white-on-P for 14px semibold buttons) | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | Reason |
|---|---|---|---|
| N/A | none | `N/A` | No new capability created; no new dependency added; CSS variable cascade already exists at `app/globals.css:189-211`. |

### 3.2 Build vs Automate

| Capability | Existing platform | Decision | Reason |
|---|---|---|---|
| N/A | none | `N/A` | No connector/scheduler/notification worker; theme read/write runs in-process via `useEffect` + `localStorage`. |

### 3.3 Palette hex v1 table (T0 approved)

5 entries `ThemeDefinition { key, label, description, tokens: { primary, primaryDark, primaryContainer, primarySoft, surface, onPrimary, onPrimarySoft, onPrimaryContainer } }`.

| key | label | primary | primaryDark | primaryContainer | primarySoft | surface | onPrimary | onPrimarySoft | onPrimaryContainer |
|---|---|---|---|---|---|---|---|---|---|
| `hrp` | HR Partner | `#f26522` | `#a63b00` | `#fde6d8` | `#fff0e5` | `#faf9f7` | `#ffffff` | `#1f2937` | `#1f2937` |
| `ocean-trust` | Ocean Trust | `#1e6f8f` | `#0d4a63` | `#d6ebf5` | `#e8f3f8` | `#f4f9fc` | `#ffffff` | `#0d1f2d` | `#0d1f2d` |
| `emerald-growth` | Emerald Growth | `#1f8a5a` | `#0d5a39` | `#d2ebde` | `#e3f3ea` | `#f3faf6` | `#ffffff` | `#0a2017` | `#0a2017` |
| `violet-future` | Violet Future | `#6a3fb5` | `#3f1f7a` | `#e1d5f4` | `#ede4f8` | `#f7f3fc` | `#ffffff` | `#1c0f3a` | `#1c0f3a` |
| `executive-gold` | Executive Gold | `#9a7a17` | `#5d4a08` | `#f0e6c0` | `#f7f0d9` | `#fbf9f0` | `#ffffff` | `#221e04` | `#221e04` |

T1C scope: only overrides 5 brand tokens above in `[data-theme]` blocks. T1C does NOT override:
- `--color-primary-cta` / `--color-primary-cta-dark` (CTA token, separate from brand).
- `--color-surface`, `--color-on-surface`, `--color-background` (neutral surface, kept as-is).
- Status colors (`--color-success`, `--color-error`, `--color-warning`, etc.).

### 3.4 Contrast pairs (probe)

| # | Pair | Meaning | Min | Scope |
|---|---|---|---|---|
| C1 | `onPrimary` on `primaryDark` | Heading, link active, focus ring background | 4.5:1 | T1C (palette-blocker) |
| C2 | `onPrimary` on `primary` | Accent decoration 3:1 (UI/large text only — NOT 14px semibold) | 3:1 | T1C (palette-blocker) |
| C3 | `onPrimarySoft` on `primarySoft` | Badge role / avatar pill | 4.5:1 | T1C (palette-blocker) |
| C4 | `onPrimaryContainer` on `primaryContainer` | Stamp / active border | 4.5:1 | T1C (palette-blocker) |
| C5 | `primaryDark` on `surface` | Heading, link active | 4.5:1 | T1C (palette-blocker) |
| C6 | `primaryDark` on `surface` (border) | Focus ring outline | 3:1 | T1C (palette-blocker) |
| **C7** | **`onPrimary` on `primary` (14px/13px semibold = normal text)** | **6 vị trí theme-sensitive T1B-owned (GlobalNavbar, login-form, ve-chung-toi, `.apply-btn`, `.pub-btn-primary`)** | **4.5:1** | **T1B** |

Probe `contrast-probe.mjs` (7 pairs × 5 palettes) re-run before each commit. Probe prints **T1C palette-blocker verdict** (C1, C3, C4, C5) AND **T1B-owned C7 fail list** (not palette-blocker). Exit 0 iff T1C palette-blocker all PASS.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/shared/theme/theme-types.ts` export: `ThemeKey` (union 5 keys), `ThemeTokens` (8 fields), `ThemeDefinition` ({ key, label, description, tokens }), `THEMES` (readonly array 5 entries), `DEFAULT_THEME_KEY` (= `'hrp'`), `getTheme(key)` (returns `ThemeDefinition` or falls back to default), `isThemeKey(value)` (type guard). |
| `RQ-02` | `src/shared/theme/theme-tokens.ts` exports 5 `ThemeDefinition` with exact hex from 3.3. Each entry has all 8 tokens (no undefined / null / empty). |
| `RQ-03` | `app/globals.css` adds 5 selectors `[data-theme="hrp"]`, `[data-theme="ocean-trust"]`, `[data-theme="emerald-growth"]`, `[data-theme="violet-future"]`, `[data-theme="executive-gold"]` placed AFTER `:root` alias block (line 189-211) and BEFORE `.material-symbols-outlined` (line 217). Each selector overrides exactly 5 tokens: `--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-primary-container`, `--color-on-primary-container`. Selector `[data-theme="hrp"]` is idempotent with `:root` (sets same values, for scope isolation). |
| `RQ-04` | T1C does NOT attach `data-theme` to `app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx`, `app/layout.tsx`, `app/admin/layout.tsx`, `app/admin/admin-shell.tsx`. T1B owns mounting scope and picker. |
| `RQ-05` | T1C does NOT edit `app/components/GlobalNavbar.tsx`. T1B owns this file fully; T1C only provides `primaryDark` token. T1B will migrate the 2 "Đăng ký" buttons (line 297, 424) from `--color-primary` to `--color-primary-dark` to satisfy C7 (4.5:1). |
| `RQ-06` | T1C does NOT edit `.hrp-btn-apply` or override `--color-primary-cta` / `--color-primary-cta-dark`. CTA token is a **separate non-blocking finding** per T0 directive; not changed in this round. |
| `RQ-07` | T1C does NOT edit `.apply-btn` (line 660), `.pub-btn-primary` (line 552), `.fcheck.on` (line 619), `login-form.tsx`, `ve-chung-toi/page.tsx`. These 4 sites (2 CSS + 2 JSX) plus 2 GlobalNavbar "Đăng ký" buttons are 6 theme-sensitive sites T1B-owned — see AC-17. |
| `RQ-08` | T1C does NOT add `@media (prefers-color-scheme: dark)` or class `.dark`. Gate `src/domains/job-board/public-ui-premium.static.test.ts:681-683` stays green. |
| `RQ-09` | T1C does NOT add inline `<script>` tags. |
| `RQ-10` | T1C does NOT override `--color-success`, `--color-error`, `--color-warning`, `--color-warning-soft`, `--color-success-soft`. |
| `RQ-11` | T1C does NOT add new tokens not already in `@theme` block (line 7-178). Only overrides 5 existing brand tokens. |
| `RQ-12` | `:root` alias block (line 189-211) keeps exactly 22 declarations in pattern `^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$` (no `#`). |

### 4.2 Contrast audit of white-on-primary sites (T0 directive)

WCAG 2.x thresholds:
- Normal text (smaller than 18.66px bold or smaller than 24px regular): minimum 4.5:1
- Large text (from 18.66px bold OR from 24px regular): minimum 3:1
- UI component (touch target minimum 44x44px): minimum 3:1

#### 6 theme-sensitive sites (T1B-owned, 14px/13px semibold = normal text)

| # | Site | File:line | Font | Weight | Need | P HRP | PD HRP | Decision |
|---|---|---|---|---|---|---|---|---|
| 1 | "Dang ky" desktop | `GlobalNavbar.tsx:297` | 14px | semibold | 4.5:1 | 3.153:1 FAIL | 6.468:1 PASS | **T1B owns fully** — change to PD bg |
| 2 | "Dang ky" mobile | `GlobalNavbar.tsx:424` | 14px | semibold | 4.5:1 | 3.153:1 FAIL | 6.468:1 PASS | **T1B owns fully** — change to PD bg |
| 3 | "Dang nhap" form | `login-form.tsx:137` | 14px | semibold | 4.5:1 | 3.153:1 FAIL | 6.468:1 PASS | **T1B-owned theme-sensitive** — change to PD bg |
| 4 | "Xem viec lam" | `ve-chung-toi/page.tsx:145` | 14px | semibold | 4.5:1 | 3.153:1 FAIL | 6.468:1 PASS | **T1B-owned theme-sensitive** — change to PD bg |
| 5 | `.pub-btn-primary` | `globals.css:552` | 13px | semibold | 4.5:1 | 3.153:1 FAIL | 6.468:1 PASS | **T1B-owned theme-sensitive** — change to PD bg |
| 6 | `.apply-btn` | `globals.css:660` | 14px | semibold | 4.5:1 | 3.153:1 FAIL | 6.468:1 PASS | **T1B-owned theme-sensitive** — change to PD bg |

All 6 sites use **normal text** (14px/13px semibold — NOT large text per WCAG 2.x), so they need **4.5:1**, NOT 3:1. Probe C7 confirms 3/5 palette FAIL on `primary`:

| Palette | P hex | C7 (white on P) | Need | Verdict |
|---|---|---|---|---|
| HR Partner | `#f26522` | 3.153:1 | ≥ 4.5:1 | ❌ FAIL → T1B đổi sang PD |
| Ocean Trust | `#1e6f8f` | 5.637:1 | ≥ 4.5:1 | ✅ PASS |
| Emerald Growth | `#1f8a5a` | 4.338:1 | ≥ 4.5:1 | ❌ FAIL → T1B đổi sang PD |
| Violet Future | `#6a3fb5` | 7.021:1 | ≥ 4.5:1 | ✅ PASS |
| Executive Gold | `#9a7a17` | 4.062:1 | ≥ 4.5:1 | ❌ FAIL → T1B đổi sang PD |

Sau khi T1B đổi 6 vị trí sang nền `primaryDark`, contrast white-on-PD = 6.468 / 9.647 / 8.272 / 12.438 / 8.577 — **5/5 palette pass ≥ 4.5:1**.

**T1C scope (this contract):**
- Cung cấp token `primaryDark` ở `[data-theme]` block (5 selectors override `--color-primary-dark`).
- Probe C7 đo và báo FAIL cho HRP/Emerald/Executive — đây là **T1B-owned, không phải palette-blocker T1C**.
- **KHÔNG sửa** `GlobalNavbar.tsx`, `login-form.tsx`, `ve-chung-toi/page.tsx`, `globals.css:.apply-btn`, `globals.css:.pub-btn-primary`.

**T1B handoff:** Sau khi T1C merge, T1B sẽ (1) đổi nền 6 vị trí trên từ `--color-primary` sang `--color-primary-dark`; (2) re-run probe C7 confirm 5/5 PASS; (3) commit riêng trong nhánh T1B.

#### CTA token (`.hrp-btn-apply` + `--color-primary-cta*`) — NGOÀI scope T1C (T0 chỉ đạo)

| Site | File:line | Font | Weight | Need | CTA HRP default | CTA HRP hover | Decision |
|---|---|---|---|---|---|---|---|
| CTA "Ung tuyen" | `globals.css:442` | 14px | semibold | 4.5:1 | 2.708:1 FAIL | 4.661:1 PASS | NGOÀI scope T1C; T0 ghi nhận vấn đề riêng, không thay đổi trong vòng này |

Token `--color-primary-cta: #f07f1a` (PR #132) achieves 2.708:1 (default) and 4.661:1 (hover). Default state is also below 4.5:1. PR #132 comment "passes 3:1 large/bold text" is inaccurate with 14px semibold (NOT large text). T1C does NOT override CTA token and does NOT edit `.hrp-btn-apply`.

## 5. Execution Plan

### STEP-01 — `src/shared/theme/theme-types.ts` (new)

Export: `ThemeKey`, `ThemeTokens`, `ThemeDefinition`, `THEMES`, `DEFAULT_THEME_KEY`, `getTheme`, `isThemeKey`. Per RQ-01.

### STEP-02 — `src/shared/theme/theme-tokens.ts` (new)

5 `ThemeDefinition` entries with hex table from 3.3 (RQ-02). Add JSDoc for each entry with DECISION_REQUEST link.

### STEP-03 — `app/globals.css` [data-theme] blocks (edit)

Add 5 selectors `[data-theme="hrp"]` / `[data-theme="ocean-trust"]` / `[data-theme="emerald-growth"]` / `[data-theme="violet-future"]` / `[data-theme="executive-gold"]` AFTER `:root` alias (line 189-211) and BEFORE `.material-symbols-outlined` (line 217).

Each selector overrides exactly 5 tokens:
- `--color-primary`
- `--color-primary-dark`
- `--color-primary-soft`
- `--color-primary-container`
- `--color-on-primary-container`

`[data-theme="hrp"]` is idempotent with `:root` (sets same values for scope isolation).

Do NOT edit any other class (`.hrp-btn-apply`, `.apply-btn`, `.pub-btn-primary`, `.fcheck.on` stay as-is).

### STEP-04 — Tests (3 new files)

1. `src/shared/theme/__tests__/theme-types.test.ts`:
   - `isThemeKey('hrp') === true`; `isThemeKey('foo') === false`; `isThemeKey(null) === false`; `isThemeKey(undefined) === false`.
   - `getTheme('hrp').tokens.primary === '#f26522'`.
   - `getTheme('hrp').tokens.primaryDark === '#a63b00'`.
   - `getTheme('ocean-trust').tokens.primary === '#1e6f8f'`.
   - `getTheme('foo')` falls back to `getTheme('hrp')`.
   - `THEMES.length === 5`.
   - `THEMES.map(t => t.key).sort()` equals `['executive-gold', 'emerald-growth', 'hrp', 'ocean-trust', 'violet-future']`.
   - Each entry has all 8 tokens (no undefined / null / empty).
   - `DEFAULT_THEME_KEY === 'hrp'`.

2. `src/shared/theme/__tests__/contrast-probe.test.ts`:
   - 5/5 palettes pass 6/6 pairs (text at least 4.5:1, large/UI at least 3:1).
   - Reuse `contrast-probe.mjs` (execSync or reimplement in-test).
   - Output ratios per palette + assert at least min.

3. `src/shared/theme/__tests__/globals-css-theme-scope.test.ts`:
   - `app/globals.css` has exactly 5 `[data-theme="..."]` selectors.
   - Each selector sets all 5 brand tokens (primary, primary-dark, primary-soft, primary-container, on-primary-container).
   - Selectors placed AFTER `:root` alias block (line 189-211) and BEFORE `.material-symbols-outlined` (line 217).
   - `[data-theme="hrp"]` is idempotent with `:root`.
   - `app/globals.css` does NOT contain `prefers-color-scheme` or `.dark`.
   - `.hrp-btn-apply` still uses `--color-primary-cta` (separate from brand).
   - `:root` alias block still has exactly 22 declarations.

### STEP-05 — Gates

Run in order:
1. `npm run typecheck` — 0 errors.
2. `npm run lint` — 0 errors (warnings OK).
3. `npm run test:unit` — 100% pass.
4. `npm run test:integration` — Tier 0 runs; Tier 1 does not self-run.
5. `npm run build` — PASS.
6. `node .ai-pipeline/scripts/verify-encoding.mjs` — PASS.
7. `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-theme-foundation/TASK.md` — PASS.

### STEP-06 — Commit + push

Pin Implementation SHA in HANDOFF.md. Push branch `codex/t1c-theme-foundation`. STOP before merge/deploy.

## 6. Acceptance

### 6.1 Acceptance rows

| ID | Expectation | How to verify |
|---|---|---|
| `AC-01` | `THEMES.length === 5` and 5 keys equal `['hrp', 'ocean-trust', 'emerald-growth', 'violet-future', 'executive-gold']` (sorted). | `npm run test:unit -- src/shared/theme/__tests__/theme-types.test.ts` |
| `AC-02` | Each palette has all 8 tokens (primary, primaryDark, primaryContainer, primarySoft, surface, onPrimary, onPrimarySoft, onPrimaryContainer); no undefined / null / empty. | `npm run test:unit -- src/shared/theme/__tests__/theme-types.test.ts` |
| `AC-03` | `isThemeKey('hrp') === true`; `isThemeKey('foo') === false`; `isThemeKey(null) === false`; `isThemeKey(undefined) === false`. `getTheme('foo')` falls back to `getTheme('hrp')`. | `npm run test:unit -- src/shared/theme/__tests__/theme-types.test.ts` |
| `AC-04` | 5/5 palettes pass T1C palette-blocker pairs (C1, C3, C4, C5 ≥ 4.5:1; C2, C6 ≥ 3:1) — exit 0. Probe C7 (white on P, 4.5:1) for **T1B-owned** sites also runs and reports HRP/Emerald/Executive FAIL as **T1B-owned**, NOT palette-blocker. T1C does NOT block on C7. | `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` exit 0; `npm run test:unit -- src/shared/theme/__tests__/contrast-probe.test.ts` |
| `AC-05` | `app/globals.css` has exactly 5 `[data-theme="hrp"]` / `ocean-trust` / `emerald-growth` / `violet-future` / `executive-gold` selectors, each setting all 5 brand tokens. | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts` |
| `AC-06` | Selectors placed AFTER `:root` alias block (line 189-211) and BEFORE `.material-symbols-outlined` (line 217). | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts` |
| `AC-07` | `app/globals.css` does NOT contain `prefers-color-scheme` or `.dark`. | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts`; existing `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts` |
| `AC-08` | `.hrp-btn-apply` still uses `--color-primary-cta` (separate from brand; T1C does NOT override). | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts`; `npm run test:unit -- src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` |
| `AC-09` | `.apply-btn` and `.pub-btn-primary` still use `--color-primary` bg in this round (T1C keeps as-is). Probe C7 confirms HRP/Emerald/Executive FAIL → handed to T1B to migrate to `primaryDark` (achieving 6.468+). | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts`; `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` (must print T1B-owned C7 fail list) |
| `AC-10` | `:root` alias block (line 189-211) still has exactly 22 declarations in correct pattern. | `npm run test:unit -- src/shared/ui/design-tokens.static.test.ts` |
| `AC-11` | Pre-existing invariants unchanged: `@theme` block has all tokens; no dark mode added. | `npm run test:unit -- src/domains/job-board/public-ui-token-parity.static.test.ts`; `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts` |
| `AC-12` | Canonical gates: typecheck, lint, unit, integration, build, encoding, task verify — 0 error. | `npm run typecheck && npm run lint && npm run test:unit && npm run build && node .ai-pipeline/scripts/verify-encoding.mjs && pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-theme-foundation/TASK.md` |
| `AC-13` | Baseline pin `aa86902fcf3c49274a3ccc0cf7decf84aaec4e19` unchanged throughout implementation. | `git status --porcelain -- app/components/GlobalNavbar.tsx` expect empty (T1B scope); `git status --porcelain -- 'app/(portal)/' 'app/(jobs)/' 'app/admin/'` expect empty (T1B scope) |
| `AC-14` | T1C does NOT attach `data-theme` to any of 5 forbidden layouts: `app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx`, `app/layout.tsx`, `app/admin/layout.tsx`, `app/admin/admin-shell.tsx`. T1B owns mounting. | grep -nE "data-theme" against each of the 5 files; expect 0 match |
| `AC-15` | T1C does NOT edit `app/components/GlobalNavbar.tsx`. T1B owns the file fully. | `git status --porcelain -- app/components/GlobalNavbar.tsx` expect empty |
| `AC-16` | T1C does NOT add any inline script tag to any source file. | `grep -rnE 'script[^>]*' --include='*.tsx' --include='*.ts' --include='*.css' src/ app/` baseline count == post-impl count |
| `AC-17` | T1C does NOT edit any of the 6 theme-sensitive sites (T1B-owned): `app/components/GlobalNavbar.tsx:297/424`, `app/login/login-form.tsx:137`, `app/(portal)/ve-chung-toi/page.tsx:145`, `app/globals.css:.apply-btn` (line 660), `app/globals.css:.pub-btn-primary` (line 552). These stay with `--color-primary` bg in this round. T1B will migrate them in its own round. | `git status --porcelain -- app/components/GlobalNavbar.tsx app/login/login-form.tsx 'app/(portal)/ve-chung-toi/page.tsx' app/globals.css`; for `app/globals.css` only check that `.apply-btn` (line 660) and `.pub-btn-primary` (line 552) blocks remain unchanged (diff in `[data-theme]` blocks only) |
| `AC-18` | T1C does NOT override `--color-primary-cta` / `--color-primary-cta-dark` and does NOT edit `.hrp-btn-apply`. CTA token (default 2.708:1) recorded as a separate noted issue (not fixed in this round per T0 directive). | `git diff aa86902f..HEAD -- app/globals.css` shows changes only in `[data-theme]` blocks; `.hrp-btn-apply` block (line 442) unchanged; `--color-primary-cta*` (line 21-22) unchanged; `npm run test:unit -- src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` PASS |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-03` |
| `RQ-02` | `STEP-02` | `AC-01`, `AC-02` |
| `RQ-03` | `STEP-03` | `AC-05`, `AC-06`, `AC-07` |
| `RQ-04` | `STEP-03` | `AC-14` |
| `RQ-05` | `STEP-03` | `AC-15` |
| `RQ-06` | `STEP-03` | `AC-08` |
| `RQ-07` | `STEP-03` | `AC-09` |
| `RQ-08` | `STEP-03` | `AC-07` |
| `RQ-09` | `STEP-03` | `AC-16` |
| `RQ-10` | `STEP-03` | `AC-11` |
| `RQ-11` | `STEP-03` | `AC-05`, `AC-11` |
| `RQ-12` | `STEP-03` | `AC-10`, `AC-11` |
| `RQ-23` | `STEP-03` | `AC-08` |
| (gates) | `STEP-05` | `AC-12` |
| (baseline) | `STEP-06` | `AC-13` |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Baseline drift from `origin/main`. | Plan pins `aa86902f`; Tier 1 re-verifies line refs before editing. |
| `RISK-02` | Wrong override scope — aliases `:root` unchanged. | STEP-03 adds block AFTER `:root`; test verifies selector order. |
| `RISK-03` | Admin layout shares same document root. | T1C does NOT mount scope (T1B does); admin keeps default HRP. |
| `RISK-04` | T1B touches T1C files (or vice versa). | File ownership is clear: T1C owns `src/shared/theme/` + `app/globals.css`; T1B owns layout + GlobalNavbar + picker. No overlap. |
| `RISK-05` | T1C accidentally overrides CTA token. | RQ-06 locks it; test verifies `.hrp-btn-apply` still uses `--color-primary-cta`. |
| `RISK-06` | Pre-existing tests fail (token parity, design-tokens, premium). | Run full unit suite before commit; if fail, only fix T1C artifacts, not pre-existing tests. |
| `RISK-07` | All 7 white-on-primary sites fail 4.5:1 with primary HRP (3.153:1). | OUTSIDE T1C scope. T1B/T2 will change button backgrounds to `primaryDark` (6.468:1). T1C only provides token. |
| `RISK-08` | `--color-primary-cta: #f07f1a` default state = 2.708:1 (fails 4.5:1). | OUTSIDE T1C scope. T1B/T2 handles. T1C does NOT override CTA token. |

## 8. Open Questions

None.

No open questions remain for `Contract gate: READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 appends after review/audit. Audit NONE resolves directly from HANDOFF; LIGHT resolves from AUDIT.

| Round | Decision | Reason |
|---|---|---|
| 0 | `READY_TO_CODE` | DEC-01..07 CLOSED; baseline updated `aa86902f` (PR 132 forward-merge); T1C vs T1B ownership separated; contrast audit done by T0; spec v1.1. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-12 | Initial contract; T0 closed 7 decisions; baseline `44333245a5decc374aa9ac6ae97d3cb1e475adfa`; worktree `codex/t1c-theme-foundation`; READY_TO_CODE. | T0 approved DEC-01..07. |
| `v1.1` | 2026-10-12 | Baseline updated `aa86902f` (PR 132 forward-merge). Contrast audit: all 7 white-on-primary sites use 14px semibold (normal text) needing minimum 4.5:1 but primary HRP only reaches 3.153:1. Ownership separated: T1C only provides token contract and CSS overrides; GlobalNavbar + layout + picker belong to T1B. CTA token `--color-primary-cta` is separate from brand; T1C does NOT override. GlobalNavbar fully owned by T1B. STEP reduced to 3 (types+tokens; CSS; tests; gates; commit). | T0 directive: update baseline; audit contrast; separate ownership; audit CTA token PR 132. |
| `v1.2` | 2026-10-12 | Add C7 (white-on-P, 4.5:1) to probe (now 7 pairs). Probe verdict: only C1, C3, C4, C5 are palette-blockers; C2 (3:1) and C7 (4.5:1) are T1B-owned because they apply to theme-sensitive buttons, not brand tokens. Probe prints **T1C palette-blocker** and **T1B-owned C7 fail list** separately. RQ-05/06/07 extended to cover all 6 theme-sensitive sites (GlobalNavbar 297/424, login-form 137, ve-chung-toi 145, `.apply-btn` 660, `.pub-btn-primary` 552). AC-04 updated to T1C palette-blocker (C1/C3/C4/C5) — exit 0 iff T1C palette-blocker all PASS. AC-09: T1C keeps `.apply-btn` and `.pub-btn-primary` P-bg in this round; T1B will migrate to `primaryDark` afterwards. New AC-17: T1C does NOT edit any of the 6 theme-sensitive sites. New AC-18: T1C does NOT override CTA token. Forbidden paths extended with `app/login/login-form.tsx` and `app/(portal)/ve-chung-toi/page.tsx`. Baseline unchanged `aa86902f`. | T0 directive: probe must measure white text on P across all 5 palettes; HRP/Emerald/Executive fail 4.5:1; T1B owns 6 sites; CTA out-of-scope. |
