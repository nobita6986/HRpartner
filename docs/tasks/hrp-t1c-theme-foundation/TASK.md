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
| Audit reason | Theme foundation định nghĩa token contract cho 5 palette; admin scope isolation; contrast invariants; registry tên/nhãn. CRITICAL + LIGHT là default theo lane matrix. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `44333245a5decc374aa9ac6ae97d3cb1e475adfa` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/shared/theme/`, `app/globals.css`, `app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx`, `app/components/GlobalNavbar.tsx` (chỉ 2 dòng nền nút Đăng ký) |
| Forbidden paths | `app/admin/layout.tsx`, `app/admin/admin-shell.tsx`, `app/layout.tsx` (không gắn data-theme ở thẻ html gốc), `src/shared/theme/theme-storage.ts` + `src/shared/theme/theme-picker.tsx` (T1B sở hữu), `prisma/schema.prisma`, `vercel.json`, `middleware.ts`, `Dockerfile`, `src/shared/ui/design-tokens.static.test.ts` (chỉ sửa nếu gắn data-theme ở thẻ html gốc — KHÔNG trong DEC-04) |
| Required gates | (chạy theo thứ tự) `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `npm run build`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-theme-foundation/TASK.md` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `LIGHT: /deliver → /audit → /resolve` |

> Lane và audit là hai quyết định riêng. FAST mặc định NONE; STANDARD mặc định NONE; CRITICAL mặc định LIGHT. CRITICAL + LIGHT đã chọn; lý do ghi ở `Audit reason`.

> Chỉ chuyển `READY_FOR_EXECUTION` khi `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`, environment đã `READY`, baseline và file ownership đã pin. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Portal public (`app/(portal)/*` + `app/(jobs)/*`) có **2 public shell** mà brand color tokens có thể swap runtime qua `data-theme`.
- 5 palette đã duyệt (`hrp`, `ocean-trust`, `emerald-growth`, `violet-future`, `executive-gold`) với hex v1 (xem §3).
- Mặc định `hrp`; key lạ / cũ fallback `hrp`; KHÔNG crash UI.
- Admin layout (`app/admin/*`) **không** thấy theme — luôn dùng HRP (alias `:root` mặc định vì admin không gắn `data-theme`).
- Persistence: `localStorage` + `useEffect` (T1B sở hữu mount picker; T1C chỉ đọc storage ở shell layout).
- Không inline script. CSP an toàn cả Vercel và VPS.

### 1.2 Non-goals

- KHÔNG thêm API, DB, migration, dependency mới.
- KHÔNG đổi status / badge / stamp colors (DEC-05).
- KHÔNG mở dark mode (gate `src/domains/job-board/public-ui-premium.static.test.ts:681-683` khóa `prefers-color-scheme` = 0 và `.dark` = 0).
- KHÔNG sync preference giữa tài khoản / thiết bị.
- KHÔNG mount picker UI (T1B sở hữu).
- KHÔNG sửa `design-tokens.static.test.ts` (chỉ sửa nếu gắn ở thẻ html gốc — không trong DEC-04).
- KHÔNG theme-hóa admin (DEC-04).
- KHÔNG override `--color-surface`, `--color-on-surface`, `--color-background` (chỉ override 5 brand token theo §3.1).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/globals.css:7-178` — token block (`@theme` directive), 97 token, gồm brand (`--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-primary-container`, `--color-on-primary-container`), surface, focus-ring (`--color-focus-ring: var(--color-primary-dark)`) | Token contract hiện hành; runtime override qua CSS variable, không thêm palette động vào `@theme` |
| `EV-02` | `app/globals.css:180-202` — 22 alias `:root` đúng `var(--color-...)` không chứa hex (line 181 `--primary: var(--color-primary);`, 182 `--primary-dark: var(--color-primary-dark);`, ...) | Mọi giá trị brand chỉ thay đổi nếu alias + token gốc cùng đổi — runtime override ở `[data-theme]` sẽ lan xuống alias cùng scope |
| `EV-03` | `app/globals.css:154` — `--color-focus-ring: var(--color-primary-dark)`; `app/globals.css:646-648` — `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }` | Focus ring dùng `var(--color-primary)`; khi T1C override `primary` ở scope public, focus ring sẽ đổi theo |
| `EV-04` | `app/globals.css:511-516` — `.pub-btn-primary { color: var(--color-on-primary); background: var(--color-primary); ... }`; `app/globals.css:619-625` — `.apply-btn` tương tự; `app/globals.css:578` — `.fcheck.on` | C2 decoration: P nền + text trắng — KHÔNG cần đổi vì 3:1 AA-large/UI đủ |
| `EV-05` | `app/components/GlobalNavbar.tsx:297` (desktop) + `:424` (mobile) — nút "Đăng ký" dùng `var(--color-primary)` nền + `var(--color-on-primary)` text | T0 Cách A: T1C refactor 2 dòng này sang `var(--color-primary-dark)` (PD) cho C1 pass 4.5:1 |
| `EV-06` | `app/(portal)/layout.tsx:11-17`, `app/(jobs)/viec-lam/layout.tsx:18-25` — 2 shell giống hệt: `GlobalNavbar` + `GlobalFooter` + `FloatingChatActions` | Hai shell nơi T1C gắn `data-theme` ở root `div` |
| `EV-07` | `app/admin/layout.tsx:23-31` (`dynamic = 'force-dynamic'`) + `app/admin/admin-shell.tsx:44-56` | Admin KHÔNG render `GlobalNavbar`. Cùng document root → scope theme phải giới hạn ở public shell |
| `EV-08` | `app/(portal)/ve-chung-toi/page.tsx:145` — nút "Xem việc làm" dùng `var(--color-primary)` nền + `var(--color-on-primary)` text 14px semibold | C2 decoration: giữ nguyên P, không đổi (xem DECISION_REQUEST §C2) |
| `EV-09` | `app/login/login-form.tsx:137` — nút "Đăng nhập" dùng `var(--color-primary)` nền + white text 14px semibold | C2 decoration: giữ nguyên P |
| `EV-10` | `src/shared/ui/design-tokens.static.test.ts:106-127` — khóa đúng MỘT khối `:root`, đúng 22 khai báo, mỗi khai báo `^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$` (cấm `#`) | Khi T1C thêm block `[data-theme="..."]` SAU `:root`, invariant `:root` không đổi (chỉ thêm block mới) |
| `EV-11` | `src/domains/job-board/public-ui-token-parity.static.test.ts:60-130+` — tập token được suy từ `@theme`, không phải danh sách chép tay | Thêm token mới mà không khai trong `@theme` → FAIL. T1C chỉ override brand tokens đã có, không thêm token mới |
| `EV-12` | `src/domains/job-board/public-ui-premium.static.test.ts:681-683` — khóa `prefers-color-scheme` = 0 và `.dark` = 0 trong `app/globals.css` | T1C KHÔNG mở dark mode |
| `EV-13` | `app/layout.tsx:23-42` — thẻ html có `lang="vi"` + thẻ head chỉ có thẻ link font; KHÔNG có thẻ script | DEC-06: T1C KHÔNG thêm inline script |
| `EV-14` | `middleware.ts:135-148` matcher + `122-220` logic — match `/`, `/vendor/*`, `/worker/*`, `/ctv/*`, `/api/*`; KHÔNG match `/admin/*` hay public shell | Middleware không can thiệp theme |
| `EV-15` | `vercel.json` (23 dòng) + `Dockerfile` (66 dòng) — KHÔNG có `headers` CSP | DEC-06: localStorage + useEffect an toàn |
| `EV-16` | `src/shared/ui/view-toggle/view-toggle.tsx:55-72` (URL > localStorage > default) + `src/domains/job-board/public-content-controls/sticky-announcement.tsx:99-123` (useEffect + try/catch) | Pattern tiền đề cho persistence |
| `EV-17` | `docs/tasks/hrp-t1c-theme-foundation/DECISION_REQUEST.md` §Tất cả 7 quyết định — T0 đã chốt DEC-01..07 | Decision state = CLOSED |
| `EV-18` | `docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` — probe chạy 5/5 palette pass 6/6 cặp | Verify DEC-07 ngay tại worktree |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | 5 palette với hex v1 (bảng §3.1) | `CHOSEN` |
| `DEC-02` | key ASCII kebab-case (`hrp`, `ocean-trust`, `emerald-growth`, `violet-future`, `executive-gold`); nhãn hiển thị EN (tên riêng); hướng dẫn / control / tooltip VI | `CHOSEN` |
| `DEC-03` | Mặc định `hrp`; key lạ / không hợp lệ / cũ → fallback `hrp`; KHÔNG crash UI | `CHOSEN` |
| `DEC-04` | Scope ở root `div` của `app/(portal)/layout.tsx` và `app/(jobs)/viec-lam/layout.tsx`. KHÔNG gắn trên thẻ html. Admin giữ mặc định HRP. | `CHOSEN` |
| `DEC-05` | GIỮ màu status / badge / stamp theo giá trị mặc định ở mọi theme (không theme-hóa trong MVP) | `CHOSEN` |
| `DEC-06` | `localStorage` + `useEffect` (pattern `sticky-announcement.tsx:99-123`); KHÔNG inline script. Chấp nhận flash 1 lần | `CHOSEN` |
| `DEC-07` | WCAG AA: text thường ≥ 4.5:1; chữ lớn (≥ 18.66px bold hoặc ≥ 24px regular) + UI/focus ≥ 3:1. Áp dụng cho 6 cặp màu thực sự dùng (xem §3.2) | `CHOSEN` |

Không có câu hỏi cần Owner quyết khi chuyển READY_FOR_EXECUTION.

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | — | `N/A` | — | — | — | Task không tạo capability kỹ thuật phổ thông (no editor/form/table/upload/date/chart/queue/email/a11y) và không thêm dependency. Theme override dùng CSS variable cascade (đã có sẵn pattern trong `app/globals.css:180-202`); không có library candidate phù hợp. |

- `ADOPT`: phải pin license, version/source, compatibility và wrapper/test boundary. → N/A.
- `CUSTOM`: phải có marker `CUSTOM_BUILD_JUSTIFICATION` và evidence cụ thể. → N/A.
- `N/A`: ghi lý do task không tạo capability phổ thông và không đổi dependency/shared framework. ✓

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | — | `N/A` | — | — | — | — | Task không tạo/thay connector, scheduler, notification worker, multi-system/operator workflow. Theme read/write chạy in-process qua `useEffect` + `localStorage`, không qua orchestration platform. |

- `ORCHESTRATE`: phải pin platform/source, credential/authority boundary, retry/idempotency, observability/recovery và failure fallback. → N/A.
- `CUSTOM`: phải có marker `CUSTOM_AUTOMATION_JUSTIFICATION` và evidence cụ thể. → N/A.
- `N/A`: ghi lý do task không tạo/thay connector, scheduler, notification worker hoặc multi-system/operator workflow. ✓

### 3.3 Bảng palette + hex v1 (T0 duyệt)

5 entry với shape `ThemeDefinition { key, label, description, tokens: { primary, primaryDark, primaryContainer, primarySoft, surface, onPrimary, onPrimarySoft, onPrimaryContainer } }`.

| key | label (EN) | primary (P) | primaryDark (PD) | primaryContainer (PC) | primarySoft (PS) | surface (S) | onPrimary (oP) | onPrimarySoft (oPS) | onPrimaryContainer (oPC) |
|---|---|---|---|---|---|---|---|---|---|
| `hrp` | HR Partner | `#f26522` | `#a63b00` | `#fde6d8` | `#fff0e5` | `#faf9f7` | `#ffffff` | `#1f2937` | `#1f2937` |
| `ocean-trust` | Ocean Trust | `#1e6f8f` | `#0d4a63` | `#d6ebf5` | `#e8f3f8` | `#f4f9fc` | `#ffffff` | `#0d1f2d` | `#0d1f2d` |
| `emerald-growth` | Emerald Growth | `#1f8a5a` | `#0d5a39` | `#d2ebde` | `#e3f3ea` | `#f3faf6` | `#ffffff` | `#0a2017` | `#0a2017` |
| `violet-future` | Violet Future | `#6a3fb5` | `#3f1f7a` | `#e1d5f4` | `#ede4f8` | `#f7f3fc` | `#ffffff` | `#1c0f3a` | `#1c0f3a` |
| `executive-gold` | Executive Gold | `#9a7a17` | `#5d4a08` | `#f0e6c0` | `#f7f0d9` | `#fbf9f0` | `#ffffff` | `#221e04` | `#221e04` |

**Ghi chú quan trọng về `surface`:** T0 chốt `surface` cho MỖI palette trong bảng — nhưng T1C implement sẽ KHÔNG override `--color-surface` ở `[data-theme]` block. Lý do:
1. `surface` hiện tại = `#ffffff` (line 17); đây là "material 3 surface" chung, không phải brand color.
2. DEC-04 chỉ yêu cầu override brand tokens; surface là neutral.
3. Nếu sau này cần surface khác mỗi palette, sẽ thêm vào scope riêng (T2+).

`primarySoft` trong bảng v1 dùng giá trị mới (`#fff0e5` HRP) — KHÁC với `--color-primary-soft: #fdf1ec` hiện tại ở line 12. T1C implement sẽ override 5 token (`--color-primary-soft` bao gồm) sang giá trị mới khi `[data-theme="hrp"]` được gắn.

### 3.4 Cặp màu đo contrast (probe)

| # | Cặp | Ý nghĩa | Min |
|---|---|---|---|
| C1 | `onPrimary` trên `primaryDark` | Nền nút "Đăng ký" (Cách A: dùng PD) | 4.5:1 |
| C2 | `onPrimary` trên `primary` | Accent decoration (P làm nền, không dùng làm nút) | 3:1 |
| C3 | `onPrimarySoft` trên `primarySoft` | Badge role / avatar pill | 4.5:1 |
| C4 | `onPrimaryContainer` trên `primaryContainer` | Stamp / active border | 4.5:1 |
| C5 | `primaryDark` trên `surface` | Heading, link active | 4.5:1 |
| C6 | `primaryDark` trên `surface` (viền) | Focus ring outline | 3:1 |

Probe `contrast-probe.mjs` đã verify 5/5 palette PASS 6/6 cặp. Re-run trước khi commit.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/shared/theme/theme-types.ts` export: `ThemeKey` (union 5 key), `ThemeTokens` (8 field), `ThemeDefinition` ({ key, label, description, tokens }), `THEMES` (readonly array 5 entry), `DEFAULT_THEME_KEY` (= `'hrp'`), `getTheme(key)` (trả `ThemeDefinition` hoặc fallback default), `isThemeKey(value)` (type guard). |
| `RQ-02` | `src/shared/theme/theme-tokens.ts` export 5 `ThemeDefinition` với đúng bảng hex ở §3.3. Mỗi entry có đủ 8 token (không undefined / null / empty). |
| `RQ-03` | `app/globals.css` thêm 5 selector `[data-theme="hrp"]`, `[data-theme="ocean-trust"]`, `[data-theme="emerald-growth"]`, `[data-theme="violet-future"]`, `[data-theme="executive-gold"]` đặt SAU block `:root` (line 180-202) và TRƯỚC `.material-symbols-outlined` (line 207-208). Mỗi selector override đúng 5 token: `--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-primary-container`, `--color-on-primary-container`. Selector `[data-theme="hrp"]` idempotent với `:root` (set cùng giá trị). |
| `RQ-04` | `app/(portal)/layout.tsx` chuyển sang Client Component (nếu chưa) bằng directive `'use client'`. Đọc `localStorage.getItem('hrp-theme')` trong `useEffect` (pattern `sticky-announcement.tsx:99-123`); gắn `data-theme={resolvedKey}` lên root `div`. `resolvedKey = isThemeKey(stored) ? stored : 'hrp'`. SSR / first-paint: `data-theme="hrp"`. |
| `RQ-05` | `app/(jobs)/viec-lam/layout.tsx` chuyển sang Client Component tương tự RQ-04. |
| `RQ-06` | `app/components/GlobalNavbar.tsx:297` (desktop) và `:424` (mobile) — đổi `backgroundColor: 'var(--color-primary)'` → `'var(--color-primary-dark)'` (Cách A: PD làm nền nút "Đăng ký"). Text giữ `var(--color-on-primary)` (white). |
| `RQ-07` | KHÔNG gắn `data-theme` ở `app/layout.tsx` (line 23-42); KHÔNG gắn ở `app/admin/layout.tsx` (line 23-31) hoặc `app/admin/admin-shell.tsx` (line 44-56). |
| `RQ-08` | KHÔNG thêm thẻ script inline ở `app/layout.tsx` hoặc 2 public shell. |
| `RQ-09` | `localStorage.getItem` chỉ chạy trong `useEffect` + try/catch; SSR an toàn (server không đọc storage). |
| `RQ-10` | KHÔNG override `--color-success`, `--color-error`, `--color-warning`, `--color-on-primary-soft` (KHÔNG tồn tại trong token system). DEC-05 giữ status colors. |
| `RQ-11` | KHÔNG mở dark mode: KHÔNG thêm `@media (prefers-color-scheme: dark)`; KHÔNG thêm class `.dark`. Gate `src/domains/job-board/public-ui-premium.static.test.ts:681-683` vẫn pass. |
| `RQ-12` | Pre-existing invariants KHÔNG bị phá: `:root` block (line 180-202) 22 alias đúng pattern `^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$`; `@theme` block (line 7-178) đủ 97 token ban đầu. |

### 4.2 Rà public white-on-primary usages (T0 yêu cầu)

Tất cả vị trí public dùng `var(--color-primary)` nền + white text (C2 decoration):

| Vị trí | File:line | Quyết định |
|---|---|---|
| Nút "Đăng ký" desktop | `GlobalNavbar.tsx:297` | **RQ-06**: đổi sang PD (C1) |
| Nút "Đăng ký" mobile | `GlobalNavbar.tsx:424` | **RQ-06**: đổi sang PD (C1) |
| Nút login form | `login-form.tsx:137` | **GIỮ** P (C2 decoration, 3:1 AA-large/UI) |
| Nút "Xem việc làm" ve-chung-toi | `ve-chung-toi/page.tsx:145` | **GIỮ** P (C2 decoration) |
| `.pub-btn-primary` CSS | `globals.css:511-516` | **GIỮ** P (C2 decoration) |
| `.apply-btn` CSS | `globals.css:619-625` | **GIỮ** P (C2 decoration) |

5 vị trí C2 giữ nguyên — đây là design có chủ đích. Probe C2 (P nền + white text) ≥ 3:1 ở mọi palette (HRP 3.153, Ocean 5.637, Emerald 4.338, Violet 7.021, Executive 4.062) → đạt AA-large/UI.

## 5. Execution Plan

### STEP-01 — `src/shared/theme/theme-types.ts` (mới)

Export: `ThemeKey`, `ThemeTokens`, `ThemeDefinition`, `THEMES`, `DEFAULT_THEME_KEY`, `getTheme`, `isThemeKey`. Theo shape trong RQ-01.

### STEP-02 — `src/shared/theme/theme-tokens.ts` (mới)

5 entry `ThemeDefinition` với bảng hex ở §3.3 (RQ-02). Thêm JSDoc cho mỗi entry với link DECISION_REQUEST.

### STEP-03 — `app/globals.css` [data-theme] block (sửa)

Thêm 5 selector `[data-theme="hrp"]` / `[data-theme="ocean-trust"]` / `[data-theme="emerald-growth"]` / `[data-theme="violet-future"]` / `[data-theme="executive-gold"]` SAU `:root` alias (line 202) TRƯỚC `.material-symbols-outlined` (line 207-208).

Mỗi selector override 5 token:
- `--color-primary`
- `--color-primary-dark`
- `--color-primary-soft`
- `--color-primary-container`
- `--color-on-primary-container`

`[data-theme="hrp"]` set giá trị idempotent với `:root` (để scope cô lập — dù cho default = 'hrp', selector này vẫn tồn tại).

`--color-focus-ring: var(--color-primary-dark)` ở `:root` (line 154) sẽ tự follow theo `primary-dark` mới ở scope.

### STEP-04 — `app/(portal)/layout.tsx` (sửa)

Thêm `'use client'`. Đọc theme key trong `useEffect` (RQ-04). Gắn `data-theme={resolvedKey}` lên root `div`. SSR / first-paint: `data-theme="hrp"` (server-render).

### STEP-05 — `app/(jobs)/viec-lam/layout.tsx` (sửa)

Tương STEP-04.

### STEP-06 — `app/components/GlobalNavbar.tsx` (sửa 2 dòng)

Đổi `backgroundColor: 'var(--color-primary)'` → `'var(--color-primary-dark)'` ở line 297 (desktop) và line 424 (mobile). Text giữ `var(--color-on-primary)` (white).

### STEP-07 — Test (5 file mới)

1. `src/shared/theme/__tests__/theme-types.test.ts`:
   - `isThemeKey('hrp') === true`; `isThemeKey('foo') === false`; `isThemeKey(null) === false`; `isThemeKey(undefined) === false`.
   - `getTheme('hrp').tokens.primary === '#f26522'`.
   - `getTheme('hrp').tokens.primaryDark === '#a63b00'`.
   - `getTheme('ocean-trust').tokens.primary === '#1e6f8f'`.
   - `getTheme('foo')` trả về `getTheme(DEFAULT_THEME_KEY)` (fallback).
   - `THEMES.length === 5`.
   - `THEMES.map(t => t.key).sort()` deep-equal `['executive-gold', 'emerald-growth', 'hrp', 'ocean-trust', 'violet-future']`.
   - Mỗi entry có đủ 8 token (không undefined / null / empty).
   - `DEFAULT_THEME_KEY === 'hrp'`.

2. `src/shared/theme/__tests__/contrast-probe.test.ts`:
   - 5/5 palette pass 6/6 cặp.
   - Reuse `contrast-probe.mjs` (import `node:child_process` execSync hoặc reimplement in-test).
   - Output ratios cho mỗi palette + assert ≥ min.

3. `src/shared/theme/__tests__/globals-css-theme-scope.test.ts`:
   - `app/globals.css` có đúng 5 selector `[data-theme="..."]`.
   - Mỗi selector set đủ 5 token brand (primary, primary-dark, primary-soft, primary-container, on-primary-container).
   - Selector đặt SAU block `:root` (line 180-202) và TRƯỚC `.material-symbols-outlined` (line 207-208).
   - Selector `[data-theme="hrp"]` set giá trị giống `:root` (idempotent).
   - `app/globals.css` KHÔNG chứa `prefers-color-scheme` hoặc `.dark` (gate `public-ui-premium`).

4. `src/shared/theme/__tests__/public-shell-theme-scope.test.ts`:
   - `app/(portal)/layout.tsx` có directive `'use client'`.
   - `app/(jobs)/viec-lam/layout.tsx` có directive `'use client'`.
   - Cả 2 shell render `data-theme={...}` ở root `div`.
   - Cả 2 shell có `useEffect` đọc `localStorage.getItem('hrp-theme')`.
   - Cả 2 shell có try/catch quanh `localStorage`.
   - `app/admin/layout.tsx` KHÔNG render `data-theme` (grep `'data-theme'` expect 0).
   - `app/admin/admin-shell.tsx` KHÔNG render `data-theme` (grep expect 0).
   - `app/layout.tsx` KHÔNG render `data-theme` ở thẻ html gốc (grep expect 0).
   - `app/layout.tsx` KHÔNG chứa thẻ script (grep expect 0).
   - SSR default = 'hrp' (server-render trước khi `useEffect` chạy).

5. `src/shared/theme/__tests__/public-button-contrast.test.ts`:
   - 6 vị trí public dùng nền P + white text (GlobalNavbar.tsx:297,424; login-form.tsx:137; ve-chung-toi/page.tsx:145; globals.css `.pub-btn-primary`; globals.css `.apply-btn`) — verify rằng SAU khi T1C refactor GlobalNavbar, các vị trí còn lại là **C2 decoration** (3:1 AA-large/UI) và đều pass.
   - Vị trí GlobalNavbar nút "Đăng ký" (2 dòng) — verify C1 (4.5:1 AA-text) với 5 palette (PD nền + white text).
   - Probe re-run trong test (execSync `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs`) hoặc reimplement in-test.

### STEP-08 — Gates

Chạy theo thứ tự:
1. `npm run typecheck` — 0 errors.
2. `npm run lint` — 0 errors (warnings OK).
3. `npm run test:unit` — 100% pass.
4. `npm run test:integration` — Tier 0 chạy; Tier 1 không tự chạy.
5. `npm run build` — PASS.
6. `node .ai-pipeline/scripts/verify-encoding.mjs` — PASS.
7. `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-theme-foundation/TASK.md` — PASS.

### STEP-09 — Commit + push

Pin Implementation SHA trong HANDOFF.md. Push branch `codex/t1c-theme-foundation`. DỪNG trước merge/deploy.

## 6. Acceptance

### 6.1 Acceptance rows

| ID | Expectation | How to verify |
|---|---|---|
| `AC-01` | `THEMES.length === 5` và 5 key đúng `['hrp', 'ocean-trust', 'emerald-growth', 'violet-future', 'executive-gold']` (sorted) | `npm run test:unit -- src/shared/theme/__tests__/theme-types.test.ts` |
| `AC-02` | Mỗi palette có đủ 8 token (primary, primaryDark, primaryContainer, primarySoft, surface, onPrimary, onPrimarySoft, onPrimaryContainer); không undefined / null / empty. | `npm run test:unit -- src/shared/theme/__tests__/theme-types.test.ts` |
| `AC-03` | `isThemeKey('hrp') === true`; `isThemeKey('foo') === false`; `isThemeKey(null) === false`; `isThemeKey(undefined) === false`. `getTheme('foo')` fallback về `getTheme('hrp')`. | `npm run test:unit -- src/shared/theme/__tests__/theme-types.test.ts` |
| `AC-04` | 5/5 palette pass 6/6 cặp contrast (text ≥ 4.5:1, large/UI ≥ 3:1). | `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` exit 0; `npm run test:unit -- src/shared/theme/__tests__/contrast-probe.test.ts` |
| `AC-05` | `app/globals.css` có đúng 5 selector `[data-theme="hrp"]` / `ocean-trust` / `emerald-growth` / `violet-future` / `executive-gold`, mỗi selector set đủ 5 token brand. | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts` |
| `AC-06` | Selector `[data-theme="..."]` đặt SAU block `:root` (line 180-202) và TRƯỚC `.material-symbols-outlined` (line 207-208). | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts` |
| `AC-07` | `app/globals.css` KHÔNG chứa `prefers-color-scheme` hoặc `.dark`. | `npm run test:unit -- src/shared/theme/__tests__/globals-css-theme-scope.test.ts`; pre-existing `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts` |
| `AC-08` | `app/(portal)/layout.tsx` + `app/(jobs)/viec-lam/layout.tsx` là Client Component, render `data-theme` ở root `div`, đọc `localStorage` trong `useEffect` + try/catch. | `npm run test:unit -- src/shared/theme/__tests__/public-shell-theme-scope.test.ts` |
| `AC-09` | `app/admin/layout.tsx` + `app/admin/admin-shell.tsx` KHÔNG render `data-theme`. | `npm run test:unit -- src/shared/theme/__tests__/public-shell-theme-scope.test.ts` |
| `AC-10` | `app/layout.tsx` KHÔNG render `data-theme` ở thẻ html gốc; KHÔNG có thẻ script. | `npm run test:unit -- src/shared/theme/__tests__/public-shell-theme-scope.test.ts` |
| `AC-11` | `app/components/GlobalNavbar.tsx:297` (desktop) + `:424` (mobile) đổi nền nút "Đăng ký" từ `var(--color-primary)` → `var(--color-primary-dark)`. Text giữ `var(--color-on-primary)` (white). | `npm run test:unit -- src/shared/theme/__tests__/public-button-contrast.test.ts`; `grep -n 'color-primary-dark' app/components/GlobalNavbar.tsx` expect ≥ 2 match |
| `AC-12` | 5 vị trí C2 decoration (login-form.tsx:137; ve-chung-toi/page.tsx:145; globals.css `.pub-btn-primary`; globals.css `.apply-btn`; GlobalNavbar nền hover) giữ P nền. C2 contrast ≥ 3:1 AA-large/UI ở mọi palette. | `npm run test:unit -- src/shared/theme/__tests__/public-button-contrast.test.ts` |
| `AC-13` | Pre-existing invariants không đổi: `:root` block 22 alias đúng pattern `^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$`; `@theme` block đủ 97 token ban đầu. | `npm run test:unit -- src/shared/ui/design-tokens.static.test.ts`; `npm run test:unit -- src/domains/job-board/public-ui-token-parity.static.test.ts` |
| `AC-14` | Canonical gates: typecheck, lint, unit, integration, build, encoding, task verify → 0 error. | `npm run typecheck && npm run lint && npm run test:unit && npm run build && node .ai-pipeline/scripts/verify-encoding.mjs && pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1c-theme-foundation/TASK.md` |
| `AC-15` | Baseline pin `44333245a5decc374aa9ac6ae97d3cb1e475adfa` không đổi trong suốt implementation; chỉ thêm file mới + sửa file trong in-scope roots. | `git diff --stat 44333245a5decc374aa9ac6ae97d3cb1e475adfa HEAD` (so với baseline commit, đã chứa cả untracked qua `git add -A && git diff --cached --stat` trước commit) |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-03` |
| `RQ-02` | `STEP-02` | `AC-01`, `AC-02` |
| `RQ-03` | `STEP-03` | `AC-05`, `AC-06`, `AC-07` |
| `RQ-04` | `STEP-04` | `AC-08` |
| `RQ-05` | `STEP-05` | `AC-08` |
| `RQ-06` | `STEP-06` | `AC-11` |
| `RQ-07` | `STEP-03`, `STEP-04`, `STEP-05` | `AC-09`, `AC-10` |
| `RQ-08` | `STEP-03`, `STEP-04`, `STEP-05` | `AC-10` |
| `RQ-09` | `STEP-04`, `STEP-05` | `AC-08` |
| `RQ-10` | `STEP-03` | `AC-13` |
| `RQ-11` | `STEP-03` | `AC-07` |
| `RQ-12` | `STEP-03`, `STEP-04`, `STEP-05` | `AC-13` |
| (C2 audit) | `STEP-06` | `AC-12` |
| (gates) | `STEP-08` | `AC-14` |
| (baseline) | `STEP-09` | `AC-15` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Baseline drift giữa implementation và `origin/main`. | Plan pin baseline `44333245`; Tier 1 đo line refs lại trước khi sửa. |
| `RISK-02` | Override scope sai → alias `:root` không đổi. | STEP-03 thêm block SAU `:root`; test `globals-css-theme-scope` verify selector thứ tự. |
| `RISK-03` | Admin layout ở cùng document root. | DEC-04 gắn ở root `div` 2 public shell; admin KHÔNG đụng; test `public-shell-theme-scope` verify admin không có `data-theme`. |
| `RISK-04` | FOUC 1 lần khi SSR default = 'hrp'. | DEC-06 chấp nhận; chỉ 1 flash ngắn ở first paint. |
| `RISK-05` | Inline script nếu dev tự thêm. | Test `public-shell-theme-scope` grep thẻ script trong 2 shell + `app/layout.tsx`. |
| `RISK-06` | C1 (nút "Đăng ký") nền P fail AA-text. | T0 Cách A: PD nền; test `public-button-contrast` verify C1 pass 4.5:1 cho 5 palette. |
| `RISK-07` | T1B chạm file T1C. | File ownership §4.1 rõ; T1B test picker độc lập (T1B scope). |
| `RISK-08` | Pre-existing test fail do T1C vô tình phá alias `:root` (22 alias) hoặc `@theme` (97 token). | Test `public-ui-token-parity` + `design-tokens.static.test` chạy trong AC-13; Tier 1 chạy full unit suite trước commit. |
| `RISK-09` | `surface` hex trong §3.3 KHÔNG được implement ở `[data-theme]` (chỉ là design note). | Ghi chú rõ §3.3; T1C KHÔNG override `--color-surface`; nếu T0 đổi ý → T2+. |
| `RISK-10` | `primarySoft` HRP mới (`#fff0e5`) khác legacy (`#fdf1ec`) → nơi nào đó dùng `--color-primary-soft` đang code nền sẽ đổi khi scope public. | Probe verify C3 (4.5:1) với giá trị mới. Nếu có hardcode `#fdf1ec` ở portal public → fix khi audit. |

## 8. Open Questions

- None.

Không được còn câu hỏi cần Owner quyết khi `Contract gate: READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|
| 0 | `READY_TO_CODE` | DEC-01..07 đã CLOSED (T0 duyệt); baseline + worktree + gates đã pin; test env READY. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-12 | Initial contract — T0 closed 7 decisions; baseline `44333245a5decc374aa9ac6ae97d3cb1e475adfa`; worktree `codex/t1c-theme-foundation`; READY_TO_CODE. | T0 duyệt DEC-01..07; Tier 1 viết TASK theo template T1D. |
