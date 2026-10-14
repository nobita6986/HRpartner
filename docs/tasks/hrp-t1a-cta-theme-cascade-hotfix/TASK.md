# TASK — `hrp-t1a-cta-theme-cascade-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1a-cta-theme-cascade-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | CSS theme-scope bug cho CTA Ứng tuyển (3 site dùng chung `.hrp-btn-apply`); fix nằm ở 1 class + 1 alias, không đổi contract data/auth, không đổi 5 brand token T1C đã chốt. T1A-owned scope; baseline đã ở `c0d32c8a` sau PR #136. |
| Spec version | `v1.0` |
| Status | `READY_FOR_REVIEW` |
| Planner | `Tier 1` |
| Baseline | `c0d32c8a29daf2b94325b3c0cef08bb79409f235` (origin/main, post-PR #136) |
| Baseline note | Sau khi PR #136 (`codex/theme-apply-cta-contrast-hotfix`) merge, alias `--color-apply-cta: var(--color-primary-dark)` ở `:root` đã được thêm nhưng CTA vẫn hiển thị màu HRP ở mọi theme. Root cause: CSS custom property substitution tại điểm khai báo — khi `--color-apply-cta: var(--color-primary-dark)` được khai báo ở `:root` với value là toàn bộ `var()`, giá trị `--color-primary-dark` được resolve ngay tại `:root` (= HRP dark) chứ không lazy theo `[data-theme=...]` scope. |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/globals.css` (chỉ khối `.hrp-btn-apply`, `--color-apply-cta*` decl, comment), `src/shared/theme/__tests__/theme-cta-foreground.test.ts`, `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` (nếu cần), `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` (cập nhật RQ-11 allowlist), `src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts` (nếu cần), `docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/**` |
| Forbidden paths | `src/shared/theme/theme-tokens.ts`, `src/shared/theme/theme-types.ts` (T1C-owned READ-ONLY), `prisma/**`, `app/admin/**`, `app/api/**`, `middleware.ts`, `vercel.json`, `Dockerfile`, các test khác của T1B/T1C ngoài allowlist |
| Required gates | `npx tsc --noEmit`; `npx vitest run --config vitest.unit.config.ts src/shared/theme src/domains/job-board/components/__tests__ src/domains/job-board/components/landing/featured-job-card.test.ts`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `powershell -NoProfile -ExecutionPolicy Bypass -File ".ai-pipeline/scripts/verify-task.ps1" -TaskPath "docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/TASK.md"`; `powershell -NoProfile -ExecutionPolicy Bypass -File ".ai-pipeline/scripts/verify-handoff.ps1" -HandoffPath "docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/HANDOFF.md" -TaskPath "docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/TASK.md"`; `git diff --check` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `READY_FOR_REVIEW` |

> Lane và audit là hai quyết định riêng. FAST mặc định NONE; STANDARD mặc định NONE; CRITICAL mặc định LIGHT. CRITICAL + NONE phải ghi lý do và người chấp nhận rủi ro.

> Chỉ chuyển `READY_FOR_EXECUTION` khi `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`, environment đã `READY/NOT_REQUIRED`, baseline và file ownership đã pin. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Nút **Ứng tuyển** ở 3 vị trí (FeaturedJobCard trên trang chủ, JobCard trên `/viec-lam`, DetailApplyCta trên `/viec-lam/{slug}`) hiển thị đúng màu theo theme đang chọn (HR Partner / Ocean Trust / Emerald Growth / Violet Future / Executive Gold). Cả 3 nút dùng chung class `.hrp-btn-apply` (single source of truth trong `app/globals.css`) — chỉ đổi CSS rule bên trong, không tạo class mới.
- Default + hover + focus-visible + disabled của `.hrp-btn-apply` giữ nguyên contract: `background-color: var(--color-primary-dark)` (default), `color-mix(in srgb, var(--color-primary-dark) 82%, #000)` (hover), `outline 2px var(--color-focus-ring)` (focus), `var(--color-surface-container)` (disabled).
- Mặc định + hover + focus-visible + disabled của `.hrp-btn-apply` đọc rõ ở 5/5 palette (default ≥ 4.5:1, hover ≥ 4.5:1, focus ring ≥ 3:1).
- Regression source-contract mới khóa rule `.hrp-btn-apply` dùng trực tiếp `var(--color-primary-dark)` và xác nhận 5 theme scope khai báo đúng; build CSS được kiểm tra để xác nhận dynamic reference còn nguyên. Không assert `getComputedStyle()` hoặc computed style runtime.

### 1.2 Non-goals

- KHÔNG thay đổi `src/shared/theme/theme-tokens.ts`, `src/shared/theme/theme-types.ts` (T1C-owned READ-ONLY, hex v1 đã đóng băng).
- KHÔNG thay đổi 5 brand token trong các `[data-theme=...]` block. T1C contract (5 token, hex cố định) giữ nguyên.
- KHÔNG tạo class CSS mới cho CTA ở từng site (FeaturedJobCard / JobCard / DetailApplyCta vẫn dùng `.hrp-btn-apply`).
- KHÔNG đổi layout/markup của 3 site.
- KHÔNG xóa `--color-apply-cta*` token (giữ alias ngược để không vỡ test/visuals ngoài scope).
- KHÔNG mở rộng sang status color, dark mode, admin shell, migration, API.

### 1.3 Traceability matrix (RQ → STEP → AC)

Mỗi requirement có row riêng. STEP ID tường minh (không dùng range).

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01, STEP-02, STEP-03, STEP-04, STEP-05, STEP-06, STEP-07, STEP-08, STEP-09 | AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 |
| RQ-11 | STEP-04 | AC-09 |

## 2. Evidence

| ID | Source | Status |
|---|---|---|
| `EV-01` | `app/globals.css:32-34` — `--color-apply-cta: var(--color-primary-dark)` được khai báo trong khối `@theme` (compile output `:root{...--color-apply-cta:var(--color-primary-dark);--color-apply-cta-dark:#883000}`). Theo CSS spec https://www.w3.org/TR/css-variables-1/#substitute-a-var, khi property value là toàn bộ `var()`, tham chiếu được resolve TẠI THỜI ĐIỂM KHAI BÁO (trong scope khai báo = `:root`), không lazy. `--color-apply-cta` bị "đóng băng" thành `#a63b00` (HRP dark) và KHÔNG nhận override từ `[data-theme=ocean-trust]` set `--color-primary-dark: #0d4a63`. | Confirmed (root cause) |
| `EV-02` | `app/globals.css:243-281` — 5 block `[data-theme='...']` chỉ override 5 brand token (primary, primary-dark, primary-soft, primary-container, on-primary-container) theo T1C contract v1.2. Mỗi block set `--color-primary-dark` đúng hex tương ứng (HRP `#a63b00`, Ocean `#0d4a63`, Emerald `#0d5a39`, Violet `#3f1f7a`, Gold `#5d4a08`). | Confirmed |
| `EV-03` | `.next/static/css/b8108ef683929a1c.css` (compiled output) — `:root{...--color-apply-cta:var(--color-primary-dark);--color-apply-cta-dark:#883000}` và `@supports (color:color-mix(in lab,red,red)){:host,:root{--color-apply-cta-dark:color-mix(in srgb,var(--color-primary-dark) 82%,#000)}}`. Browser hỗ trợ `color-mix()` sẽ dùng dynamic version ở dòng supports; nhưng `--color-apply-cta` không có fallback dynamic → luôn là `#a63b00` ở `:root`. | Confirmed |
| `EV-04` | `src/shared/theme/__tests__/theme-cta-foreground.test.ts:60-63` — `AC-01: token --color-apply-cta alias về var(--color-primary-dark) (cascade theme)` — test này tin rằng cascade sẽ tự hoạt động; nó chỉ kiểm tra khai báo tĩnh trong source, không kiểm tra behavior runtime. | Confirmed (test thiếu runtime check) |
| `EV-05` | `src/shared/theme/__tests__/globals-css-theme-scope.test.ts:138-145` — `AC-08: --color-primary-cta* và --color-apply-cta* không bị override trong [data-theme] block` — test cấm T1A thêm token vào `[data-theme]`. Test này cũng đang khóa sai giả định cascade. | Confirmed (test cần cập nhật) |
| `EV-06` | `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts:111-130` — `'.hrp-btn-apply dung var(--color-apply-cta)'`, `'.hrp-btn-apply:hover dung var(--color-apply-cta-dark)'`, focus-visible outline, disabled cursor. Test pin contract hiện tại. | Confirmed |
| `EV-07` | 3 file `.tsx` dùng `.hrp-btn-apply`: `src/domains/job-board/components/landing/featured-job-card.tsx:198-200`, `app/(jobs)/viec-lam/page.tsx:405`, `src/domains/job-board/components/detail-apply-cta.tsx:47`. Tất cả đều dùng chung class — không cần đổi. | Confirmed |
| `EV-08` | `app/globals.css:425-545` (`.hrp-btn-apply` block) — default `var(--color-apply-cta)` (alias), hover `var(--color-apply-cta-dark)` (mix), focus outline `var(--color-focus-ring)`, disabled `var(--color-surface-container)`. Đây là contract cần sửa. | Confirmed |
| `EV-09` | 5/5 palette hex của `--color-primary-dark`: HRP `#a63b00`, Ocean `#0d4a63`, Emerald `#0d5a39`, Violet `#3f1f7a`, Gold `#5d4a08`. White text trên PD: HRP 6.468, Ocean 9.647, Emerald 8.272, Violet 12.438, Gold 8.577 (đã đo trong HANDOFF PR #136). | Confirmed |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-T1A-09` | **Bỏ alias trung gian** `--color-apply-cta*`. `.hrp-btn-apply` dùng trực tiếp `var(--color-primary-dark)` (default) và `color-mix(in srgb, var(--color-primary-dark) 82%, #000)` (hover). Lý do: CSS spec — `var()` trong property value là lazy resolution, resolve tại scope áp dụng; `var()` định nghĩa custom property là early resolution tại scope khai báo. Tránh được pitfall freeze tại `:root`. | `CHOSEN` |
| `DEC-T1A-10` | Giữ token `--color-apply-cta*` trong `:root` cho backward compatibility nếu code/site ngoài `.hrp-btn-apply` đang tham chiếu. Alias root KHÔNG cascade theo `[data-theme]`; CTA không dùng alias này. Không override alias trong theme blocks. Comment trong source ghi rõ pitfall. | `CHOSEN` |
| `DEC-T1A-11` | Cập nhật test `theme-cta-foreground.test.ts`: thay match `var(--color-apply-cta)` literal bằng match `var(--color-primary-dark)` trong `.hrp-btn-apply`. Giữ nguyên probe 5/5 palette hex. | `CHOSEN` |
| `DEC-T1A-12` | Cập nhật test `globals-css-theme-scope.test.ts`: RQ-11 allowlist bổ sung `--color-apply-cta*` (vì DEC-T1A-10 quyết định giữ token này ở `:root`, không cần override theme). AC-08 thêm regression guard: `var(--color-primary-dark)` xuất hiện trong `.hrp-btn-apply` (tránh tái diễn pitfall). | `CHOSEN` |
| `DEC-T1A-13` | Thêm source-contract regression test `theme-cta-cascade-resolve.test.ts`: khóa rule `.hrp-btn-apply` dùng trực tiếp `var(--color-primary-dark)` và kiểm tra 5 theme scope khai báo đúng màu; kiểm tra build CSS riêng để xác nhận tham chiếu động còn nguyên. Không assert computed style runtime. | `CHOSEN` |
| `DEC-T1A-14` | `Audit mode: NONE` theo FAST lane matrix; Tier 1 self-review tối đa 3 rủi ro trọng yếu trong HANDOFF. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A` | `N/A — task chỉ thay đổi rule CSS trong `app/globals.css` và test static trong repo. Không thêm library, không thêm dependency.` | `N/A` | `N/A` | `N/A` | `N/A` | CSS rule + test. |

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
| Open questions | NONE — user đã đóng outcome, baseline, ownership tại message gốc (2026-10-14). |

## 5. Execution Plan

Thực hiện tuần tự gate (1→8). Gate sau chỉ chạy nếu gate trước PASS.

| # | Gate | Lệnh | Mục đích |
|---|---|---|---|
| 1 | Edit `app/globals.css` | Trong khối `.hrp-btn-apply`: default `background-color: var(--color-primary-dark)`; hover `background-color: color-mix(in srgb, var(--color-primary-dark) 82%, #000)`. Comment thay thế chú thích cũ giải thích pitfall. | Sửa CSS rule dùng trực tiếp `var()` lazy reference. |
| 2 | Update `theme-cta-foreground.test.ts` | Thay regex match `var(--color-apply-cta)` → `var(--color-primary-dark)`; thêm test mới: `.hrp-btn-apply` không được reference `--color-apply-cta` (alias cũ) tránh regress về pitfall. | Bảo vệ contract mới. |
| 3 | Update `globals-css-theme-scope.test.ts` | RQ-11 allowlist thêm `--color-apply-cta*`. AC-08 thêm regression: `.hrp-btn-apply` chứa `var(--color-primary-dark)`. | Bảo vệ contract khỏi regress. |
| 4 | Thêm `theme-cta-cascade-resolve.test.ts` | Test source contract: rule `.hrp-btn-apply` tham chiếu trực tiếp `var(--color-primary-dark)` và mỗi theme scope khai báo đúng hex. Kiểm tra CSS sau build riêng để xác nhận dynamic `var()` còn nguyên. | Regression guard cho source contract; không kiểm tra computed style runtime. |
| 5 | Targeted tests (sau) | Cùng lệnh gate trong `Required gates` | Tất cả pass. |
| 6 | Typecheck | `npx tsc --noEmit` | 0 errors. |
| 7 | Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | UTF-8 NO BOM. |
| 8 | Contract preflight | `verify-task.ps1`; cuối cùng `verify-handoff.ps1` + `git diff --check` | Tier 1 preflight PASS. |

**Rollback**: nếu gate 5 fail do test khác ngoài ownership vỡ, dừng và trả T0; KHÔNG revert commit (chưa commit).

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.hrp-btn-apply` default background = `var(--color-primary-dark)` (lazy, cascade theo theme) | Grep `app/globals.css`; test `theme-cta-foreground.test.ts` |
| `AC-02` | `.hrp-btn-apply` default color = `var(--color-on-primary)` (white) | Grep `app/globals.css`; test `theme-cta-foreground.test.ts` |
| `AC-03` | Probe white on `--color-primary-dark` ở 5/5 palette ≥ 4.5:1 | PowerShell probe hoặc test (HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577) |
| `AC-04` | `.hrp-btn-apply:hover:not(:disabled)` background = `color-mix(in srgb, var(--color-primary-dark) 82%, #000)`; computed value 5/5 palette ≥ 4.5:1 white-on-X | Grep + probe |
| `AC-05` | `.hrp-btn-apply:focus-visible` outline 2px `var(--color-focus-ring)` ≥ 3:1 ở 5/5 palette | Grep + probe |
| `AC-06` | `.hrp-btn-apply:disabled` text `var(--color-on-surface-variant)` trên `var(--color-surface-container)` ≥ 4.5:1 | Grep + probe (8.093:1) |
| `AC-07` | 3 site (FeaturedJobCard, /viec-lam JobCard, DetailApplyCta) đều dùng class `hrp-btn-apply` (không tạo class mới) | `Select-String` trên 3 file `.tsx`; static test đã có |
| `AC-08` | `.hrp-btn-apply` KHÔNG chứa `var(--color-apply-cta)` (tránh tái diễn pitfall); chứa `var(--color-primary-dark)` | Grep `app/globals.css`; test `theme-cta-foreground.test.ts` + `globals-css-theme-scope.test.ts` |
| `AC-09` | Token cũ `--color-apply-cta*` vẫn tồn tại ở `:root` (alias ngược), KHÔNG override trong `[data-theme]` | Grep `app/globals.css`; test `globals-css-theme-scope.test.ts` |
| `AC-10` | Source regression guard: rule `.hrp-btn-apply` dùng trực tiếp `var(--color-primary-dark)` (không qua alias root) và 5 theme scope khai báo giá trị đúng; CSS production sau build giữ dynamic reference | Vitest `theme-cta-cascade-resolve.test.ts` + kiểm tra artifact CSS của build (E-09). Không xác nhận computed style trong browser/runtime. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-01..STEP-04 | AC-01..AC-10 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Token `--color-primary-cta*` đang dùng ở nhiều chỗ ngoài `.hrp-btn-apply`; nếu vô tình xóa alias ngược sẽ vỡ test/visuals cũ. | T1-A KHÔNG xóa `--color-primary-cta*`; KHÔNG xóa `--color-apply-cta*` alias. Chỉ sửa rule `.hrp-btn-apply`. |
| `RISK-02` | Test trong phạm vi ownership (theme-cta-foreground, globals-css-theme-scope) đang lock contract cũ. Nếu update sai sót có thể miss guard. | Đọc comment + probe từng test trước khi sửa; chạy targeted suite sau từng patch. |
| `RISK-03` | Hover dùng `color-mix(in srgb, var(--color-primary-dark) 82%, #000)` trực tiếp trong rule; không có computed-style runtime probe. | Build CSS artifact E-09 xác nhận dynamic `var(--color-primary-dark)` còn nguyên; test source-contract pin rule hover. Việc resolve computed style trong browser chưa được xác minh tự động. |
| `RISK-04` | Test `globals-css-theme-scope.test.ts` là T1C-owned, đụng RQ-11 allowlist 5 brand token. Việc thêm `--color-apply-cta*` vào allowlist có thể bị Tier 3 reject. | Mitigation: comment trong test giải thích `--color-apply-cta*` được thêm vì token cũ được DEC-T1A-10 quyết định giữ (không vì cascade mới qua `[data-theme]`). Tài liệu rõ ràng trong HANDOFF. |
| `RISK-05` | Không có automated computed-style runtime assertion; test hiện tại kiểm tra source contract và theme declarations, không mô phỏng CSS cascade của browser. | Giới hạn được ghi rõ; build output xác nhận dynamic var còn nguyên. Không dùng jsdom làm bằng chứng runtime. Nếu cần runtime proof tự động, bổ sung browser-capable test ở vòng riêng khi được cho phép. |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau self-review. Audit NONE resolve trực tiếp từ HANDOFF.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-14 | Initial contract | Initial |
