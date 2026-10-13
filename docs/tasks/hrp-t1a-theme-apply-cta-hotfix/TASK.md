# TASK — `hrp-t1a-theme-apply-cta-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1a-theme-apply-cta-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | UI tone + theme CTA alignment (3 sites, đồng bộ 1 class), không đổi palette hex, không đổi contract data/auth, lane FAST theo matrix. T0 instruction không yêu cầu audit. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `5cfbca12e948c3a207f61db06fe7001c9cc248d2` |
| Baseline note | origin/main @ PR #135 — post-T1B theme picker (CTA contract đã cố định bằng `--color-primary-cta*` token ổn định) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/globals.css`, `app/(jobs)/viec-lam/layout.tsx` (đọc để xác nhận ThemeScope mount, không sửa), `src/shared/theme/__tests__/theme-cta-foreground.test.ts`, `src/shared/theme/__tests__/theme-shell-mount.test.ts`, `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts`, `src/domains/job-board/components/landing/featured-job-card.test.ts` (chỉ chạm khối AC về CTA "Ứng tuyển"), `src/shared/theme/__tests__/contrast-probe.test.ts`, `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/**` |
| Forbidden paths | `app/(portal)/page.tsx` (T0 giao riêng phần hero copy/layout), `app/domains/job-board/components/landing/referral-strip.tsx` (T0 giao riêng phần CTV), `src/shared/theme/theme-tokens.ts`, `src/shared/theme/theme-types.ts` (T1C-owned READ-ONLY), `prisma/**`, `app/admin/**`, `app/api/**`, `middleware.ts`, `vercel.json`, `Dockerfile` |
| Required gates | `npx tsc --noEmit`; `npx vitest run --config vitest.unit.config.ts src/shared/theme src/domains/job-board/components/__tests__ src/domains/job-board/components/landing/featured-job-card.test.ts`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1a-theme-apply-cta-hotfix/HANDOFF.md`; `git diff --check` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `READY_FOR_REVIEW` |

> Lane và audit là hai quyết định riêng. FAST mặc định NONE; STANDARD mặc định NONE; CRITICAL mặc định LIGHT. CRITICAL + NONE phải ghi lý do và người chấp nhận rủi ro.

> Chỉ chuyển `READY_FOR_EXECUTION` khi `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`, environment đã `READY/NOT_REQUIRED`, baseline và file ownership đã pin. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Nút **Ứng tuyển** ở cả 3 vị trí (FeaturedJobCard trên trang chủ, JobCard trên `/viec-lam`, DetailApplyCta trên `/viec-lam/{slug}`) đổi màu theo theme đang chọn (HR Partner / Ocean Trust / Emerald Growth / Violet Future / Executive Gold). Cả 3 nút dùng chung class `.hrp-btn-apply` đã có sẵn (single source of truth trong `app/globals.css`) — chỉ đổi token bên trong, không tạo class mới.
- Mặc định + hover + focus-visible + disabled của `.hrp-btn-apply` đọc rõ ở 5/5 palette (default ≥ 4.5:1, hover ≥ 4.5:1, focus ring ≥ 3:1).
- Hai heading eyebrow **không thuộc scope trực tiếp** của task này; user đã giao `app/(portal)/page.tsx` và `referral-strip.tsx` cho tác vụ khác. T1-A chỉ xác nhận vị trí và cung cấp token đã đo đạt WCAG AA để T0/tác vụ kia áp dụng (không sửa file trong scope T0).

### 1.2 Non-goals

- KHÔNG sửa `app/(portal)/page.tsx` (T0 giao cho người khác) — kể cả phần "Cùng tìm kiếm" eyebrow, layout hero, h1, body copy.
- KHÔNG sửa `src/domains/job-board/components/landing/referral-strip.tsx` (T0 giao cho người khác) — kể cả heading "Chương trình Cộng tác viên".
- KHÔNG thay đổi `src/shared/theme/theme-types.ts`, `src/shared/theme/theme-tokens.ts` (T1C-owned READ-ONLY, baseline v1.2 hex).
- KHÔNG override bất kỳ token mới nào trong khối `[data-theme='...']`; chỉ dùng lại 5 brand token đã có (primary / primaryDark / primaryContainer / primarySoft / onPrimary).
- KHÔNG thêm mới class CSS cho CTA, KHÔNG đổi layout/markup của 3 site; chỉ sửa bên trong `.hrp-btn-apply` block và (nếu cần) alias token để CTA cascade theo theme.
- KHÔNG đổi màu của `.apply-btn` / `.pub-btn-primary` (đã do T1B migrate sang `--color-primary-dark` ở PR #133, đã đạt 4.5:1 ở 5/5 palette theo `theme-sites-c7-pd.test.ts`).
- KHÔNG mở rộng sang status color, dark mode, admin shell, migration, API.

### 1.3 Traceability matrix (RQ → STEP → AC)

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01, STEP-02, STEP-03 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 |

## 2. Evidence

| ID | Source | Status |
|---|---|---|
| `EV-01` | `app/globals.css:13-22` — `--color-primary-cta: #f07f1a` và `--color-primary-cta-dark: #c2520a` hiện KHÔNG nằm trong bất kỳ `[data-theme='...']` block; do đó nút `.hrp-btn-apply` giữ nguyên tông cam HRP ở mọi theme. | Confirmed |
| `EV-02` | `app/globals.css:226-264` — 5 block `[data-theme='...']` chỉ override đúng 5 brand token (`--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-primary-container`, `--color-on-primary-container`) theo T1C contract v1.2. | Confirmed |
| `EV-03` | `app/globals.css:504-522` — `.hrp-btn-apply` block default dùng `--color-primary-cta` background + `--color-on-surface` text (probe 6.327:1), hover dùng `--color-primary-cta-dark` + `--color-on-primary` (probe 4.661:1), focus-visible outline 2px `var(--color-focus-ring)` (resolve PD, 6.147:1 trên surface HRP), disabled surface-container + on-surface-variant (8.093:1). | Confirmed |
| `EV-04` | `src/domains/job-board/components/landing/featured-job-card.tsx:198-200` — CTA class `hrp-btn-apply inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold`. | Confirmed |
| `EV-05` | `app/(jobs)/viec-lam/page.tsx:405` — CTA class `hrp-btn-apply hrp-focus inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg px-3 text-sm font-semibold`. | Confirmed |
| `EV-06` | `src/domains/job-board/components/detail-apply-cta.tsx:47` — CTA class `hrp-btn-apply font-semibold px-6 py-2 rounded-lg`. | Confirmed |
| `EV-07` | `src/shared/theme/__tests__/theme-cta-foreground.test.ts` + `src/shared/theme/__tests__/theme-shell-mount.test.ts` + `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` — đang khóa token `--color-primary-cta*` cố định; đây là các test trực tiếp khóa contract màu của `.hrp-btn-apply` và thuộc phạm vi ownership T1-A. | Confirmed (sẽ cập nhật) |
| `EV-08` | Probe WCAG (PowerShell helper, không cần Node): `--color-on-primary` (white) trên `--color-primary` đạt 5/5 palette ≥ 3.0:1 (HRP 3.153 / Ocean 5.637 / Emerald 4.338 / Violet 7.021 / Gold 4.062), 4/5 đạt ≥ 4.5:1 (HRP fail large/normal text). White trên `--color-primary-dark` đạt 5/5 ≥ 4.5:1 (HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577). | Confirmed |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-T1A-01` | Token mới cho CTA: thêm `--color-apply-cta` và `--color-apply-cta-dark` ở `@theme` block, alias về `var(--color-primary)` / `var(--color-primary-dark)` (cascade theo theme). `--color-primary-cta*` cũ được giữ làm alias ngược để tương thích với surface đã dùng (nếu có). | `CHOSEN` |
| `DEC-T1A-02` | `.hrp-btn-apply` default = `var(--color-on-primary)` (white) trên `var(--color-apply-cta)` (cascade PD/theme). 14px semibold = normal text, cần 4.5:1. HRP chỉ đạt 3.153:1 với P → KHÔNG pass; do đó dùng PD ở mọi palette (5/5 pass ≥ 4.5:1) thay vì P có điều kiện. Hover giữ `var(--color-on-primary)` (white) trên `var(--color-apply-cta-dark)` (resolve P-DARK token hoặc mix 82% PD + 18% black để ≥ 4.5:1). | `CHOSEN` |
| `DEC-T1A-03` | Focus-visible ring `var(--color-focus-ring)` (resolve PD) — UI ≥ 3:1 5/5 palette (HRP 6.147, Ocean 9.097, Emerald 7.806, Violet 11.360, Gold 8.132). Disabled `var(--color-on-surface-variant)` trên `var(--color-surface-container)` (8.093:1). | `CHOSEN` |
| `DEC-T1A-04` | Tạo token mới `--color-apply-cta` & `--color-apply-cta-dark` trong `@theme` block (alias PD); KHÔNG thêm block `[data-theme='...']` mới (T1C contract v1.2 đã đóng băng 5 token; CTA dùng chính primaryDark nên tự cascade). | `CHOSEN` |
| `DEC-T1A-05` | Test cập nhật trong phạm vi ownership: `theme-cta-foreground.test.ts`, `theme-shell-mount.test.ts`, `apply-cta-tone-soften.static.test.ts`, `featured-job-card.test.ts` (chỉ block AC về CTA "Ứng tuyển"), `contrast-probe.test.ts` (nếu có). T1C-owned `globals-css-theme-scope.test.ts` KHÔNG sửa (giữ nguyên contract v1.2 + comment "T1B sẽ migrate"). | `CHOSEN` |
| `DEC-T1A-06` | `Audit mode: NONE` theo FAST lane matrix; Tier 1 self-review tối đa 3 rủi ro trọng yếu trong HANDOFF. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A` | `N/A — task chỉ thay đổi giá trị token trong `app/globals.css` (đã có sẵn hạ tầng Tailwind v4 `@theme`); không thêm library, không thêm dependency.` | `N/A` | `N/A` | `N/A` | `N/A` | CSS token rewire. |

- `ADOPT`: phải pin license, version/source, compatibility và wrapper/test boundary.
- `CUSTOM`: phải có marker `CUSTOM_BUILD_JUSTIFICATION` và evidence cụ thể.
- `N/A`: ghi lý do task không tạo capability phổ thông và không đổi dependency/shared framework.

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A` | `N/A — task không tạo/thay connector, scheduler, notification worker hay multi-system workflow.` | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | UI token. |

## 4. Contract

| Field | Value |
|---|---|
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Open questions | NONE — user đã đóng outcome, branch, baseline và ownership tại message gốc (2026-10-13). |

## 5. Execution Plan

Thực hiện tuần tự gate (1→7). Gate sau chỉ chạy nếu gate trước PASS.

| # | Gate | Lệnh | Mục đích |
|---|---|---|---|
| 1 | Targeted tests (trước) | `npx vitest run --config vitest.unit.config.ts src/shared/theme src/domains/job-board/components/__tests__ src/domains/job-board/components/landing/featured-job-card.test.ts` | Snapshot failing test hiện tại (token cũ). |
| 2 | Edit `app/globals.css` | Thêm 2 token `--color-apply-cta` / `--color-apply-cta-dark` (alias `--color-primary-dark` / mix 82% PD + 18% black); sửa `.hrp-btn-apply` block dùng token mới. Giữ `--color-primary-cta*` cũ là alias ngược để không vỡ site cũ (nếu có). | Đổi nguồn màu CTA sang token cascade theo theme. |
| 3 | Cập nhật test | `theme-cta-foreground.test.ts`: cập nhật regex/contract từ `primary-cta` sang `apply-cta`; `apply-cta-tone-soften.static.test.ts`: cập nhật token name trong khối `@theme`; `theme-shell-mount.test.ts`: xác nhận class `.hrp-btn-apply` vẫn xuất hiện ở 3 site; `featured-job-card.test.ts` (khối AC về CTA): cập nhật regex. | Bảo vệ contract mới trong scope. |
| 4 | Targeted tests (sau) | Cùng lệnh gate 1 | Tất cả pass. |
| 5 | Typecheck | `npx tsc --noEmit` | 0 errors. |
| 6 | Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | UTF-8 NO BOM. |
| 7 | Contract preflight | `pwsh .ai-pipeline/scripts/verify-task.ps1`; cuối cùng `verify-handoff.ps1` + `git diff --check`. | Tier 1 preflight PASS. |

**Rollback**: nếu gate 4 fail do test khác ngoài ownership vỡ, dừng và trả T0; KHÔNG revert commit (chưa commit).

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.hrp-btn-apply` default background = `var(--color-apply-cta)` (alias PD, cascade theo theme) | Grep `app/globals.css`; test `theme-cta-foreground.test.ts` |
| `AC-02` | `.hrp-btn-apply` default text = `var(--color-on-primary)` (white) | Grep `app/globals.css`; test `theme-cta-foreground.test.ts` |
| `AC-03` | Probe `white on --color-primary-dark` ở 5/5 palette ≥ 4.5:1 | PowerShell probe (HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577) |
| `AC-04` | `.hrp-btn-apply:hover:not(:disabled)` background = `var(--color-apply-cta-dark)` (mix 82% PD + 18% black, ≥ 4.5:1 white-on-X ở 5/5 palette) | Grep + probe |
| `AC-05` | `.hrp-btn-apply:focus-visible` outline 2px `var(--color-focus-ring)` (resolve PD) ≥ 3:1 ở 5/5 palette | Grep + probe |
| `AC-06` | `.hrp-btn-apply:disabled` text `var(--color-on-surface-variant)` trên `var(--color-surface-container)` ≥ 4.5:1 | Grep + probe (8.093:1) |
| `AC-07` | 3 site (FeaturedJobCard, /viec-lam JobCard, DetailApplyCta) đều dùng class `hrp-btn-apply` (không tạo class mới) | `theme-shell-mount.test.ts` (`grep 'hrp-btn-apply'` trên 3 file .tsx); static test đã có sẵn |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-01..STEP-03 | AC-01..AC-07 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Token `--color-primary-cta*` hiện đang dùng ở nhiều chỗ ngoài `.hrp-btn-apply`. Nếu giữ alias ngược an toàn, nhưng nếu không — sẽ vỡ test/visuals. | T1-A KHÔNG xóa `--color-primary-cta*`; chỉ alias ngược. Grep toàn repo để xác nhận scope trước khi commit. |
| `RISK-02` | Test trong phạm vi ownership (theme-cta-foreground, apply-cta-tone-soften, theme-shell-mount, featured-job-card) đang lock token `--color-primary-cta*`. Nếu chỉ thay regex mà không đọc kỹ comment, có thể miss edge case. | Đọc comment + probe từng test trước khi sửa; chạy targeted suite sau từng patch. |
| `RISK-03` | T1C-owned `globals-css-theme-scope.test.ts` (các hàng AC về RQ cũ trong test cũ) đang assert `.hrp-btn-apply` block KHÔNG nằm trong `[data-theme]` — không sửa block này, chỉ thay đổi nội dung bên trong nó. | T1-A KHÔNG thêm block `[data-theme]` mới; chỉ sửa nội dung `.hrp-btn-apply`. Test vẫn pass. |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau self-review. Audit NONE resolve trực tiếp từ HANDOFF.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-13 | Initial contract | Initial |
