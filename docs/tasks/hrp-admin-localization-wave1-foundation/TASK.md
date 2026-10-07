# TASK — `hrp-admin-localization-wave1-foundation`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-localization-wave1-foundation` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | T0 ủy quyền `Audit mode: NONE` cho Wave 1 (giảm friction cho lớp foundation non-public-contract, non-critical-domain). T1B tự review; T0/Tier 3 không audit. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `796e13c69996756d1298bc1a7ec9b50bab935c9f` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/shared/i18n/**` (NEW); `src/shared/ui/status-badge/**` (NEW); `src/shared/ui/role-guard/role-guard-layout.tsx`; `app/admin/admin-shell.tsx`; `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx`; `app/admin/labor-profiles/[id]/page.tsx`; `app/admin/applications/page.tsx`; `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (F11 §9 binding — see RISK-09) |
| Forbidden paths | `app/admin/jobs/**` (except the explicit static test), `app/admin/job-openings/**`, `app/admin/staffing/**`, `app/admin/users/**`, `app/admin/workers/**`, `app/admin/clients/**`, `app/admin/vendors/**`, `app/admin/media/**`, `app/admin/settings/**`, `app/admin/attendance/**`, `app/admin/reconciliation/**`, `app/admin/payroll/**`, `app/admin/commission/**`, `app/admin/tickets/**`, `src/domains/job-board/public-content-controls/**`, `docs/tasks/hrp-ui2-public-content-controls-sticky/**`, `prisma/**`, `src/shared/auth/**`, `middleware.ts`, `app/(public)/**`, `app/m/**`, `packages/**`, `.github/**` |
| Required gates | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `.ai-pipeline/scripts/verify-encoding.ps1`, `.ai-pipeline/scripts/verify-task.ps1`, `.ai-pipeline/scripts/verify-handoff.ps1` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

> Lane `STANDARD` + Audit `NONE` được T0 ủy quyền rõ trong directive Phần B §4. Wave 1 không thuộc phạm vi audit vì nó là lớp foundation non-public-contract, không đổi schema, không đổi auth, không đổi lifecycle, không build infrastructure.

> Status `READY_FOR_EXECUTION` đạt được vì: Baseline pin (PR #94 merge xong, current main = 796e13c6), Decision state `CLOSED` (T0 §2 đã bind glossary qua execution plan §3; 12 owner decisions chốt bằng việc merge PR #94), Test environment `READY` (vitest.unit.config.ts chạy được trong CI), Correction budget = 1 theo V2.

## 1. Outcome

### 1.1 User-visible outcome

Wave 1 của Admin Portal Vietnamese Localization theo binding execution plan đã merge (PR #94). Sau khi merge Wave 1:

- Có một single source of truth cho cross-module Vietnamese terms: `src/shared/i18n/glossary.ts`.
- Có shared presentation primitive `StatusBadge` (props `module`, `status`) ở `src/shared/ui/status-badge/`. Primitive đọc từ dictionary mà consumer truyền vào; KHÔNG đọc global aggregator.
- Shared role labels (T0 §2 #3), form/table labels, action labels, error dictionary re-export — tất cả đều typed và unit-tested.
- Các leak nhỏ trên admin-shell và shell-vicinity được vá: `Staffing` sidebar (L-001) → `Nhu cầu tuyển dụng`; role chip (L-003); default `User` (L-004); `(no name)` (L-006); identity verification render (L-007); `CCCD` (L-047) → `Số CCCD`.
- `admin-jobs-terminology.static.test.ts` đã được cập nhật để phản ánh F11 scope clarification (binding hiện tại: JobPosting editor display `Đăng tin / Gỡ tin / Lưu trữ` thay cho `Publish / Unpublish / Archive` raw).

### 1.2 Non-goals

- KHÔNG việt hóa các domain pages (Jobs detail/editor, JobOpenings, Staffing, Applications logic, Users, Workers, Clients, Vendors, Media, Settings, Attendance, Reconciliation, Payroll, Commission, Tickets) — defer sang Wave 2/3/4 theo execution plan.
- KHÔNG tạo i18n framework (`next-intl`, `react-intl`, custom plugin) — chỉ typed dictionary pattern theo T0 §3.C.
- KHÔNG tạo global status dictionary — domain-owned dictionaries vẫn thuộc domain (chỉ nhập cross-module term từ glossary).
- KHÔNG đổi canonical enum/API/role matrix/auth/RLS/lifecycle/schema/migration.
- KHÔNG touch UI2 surface (`src/domains/job-board/public-content-controls/**`, `docs/tasks/hrp-ui2-public-content-controls-sticky/**`, HomepageSettings, sticky announcement, NewsSection toggle).
- KHÔNG mở Mốc 3/4/5, F6, P2.1.
- KHÔNG chạy `npm install` / lockfile delta (no new dependency).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md` §5.1 (Wave 1 file ownership) trên origin/main | Binding file ownership + acceptance criteria cho Wave 1 |
| `EV-02` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md` §3 (binding glossary), §4 (architecture), §6 (test strategy) | Cross-module glossary là binding từ T0 §2 |
| `EV-03` | `src/domains/applications/placement-ui.ts` (`STATUS_LABELS`, `SOURCE_LABELS`, `ACTION_LABELS`, `CONFLICT_LABELS`) | Pattern dictionary đã có — Wave 1 theo cùng pattern |
| `EV-04` | `app/admin/admin-shell.tsx` (current) + `src/shared/ui/role-guard/role-guard-layout.tsx` L-001 `Staffing` literal | L-001 scope của Wave 1 |
| `EV-05` | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` L-319 `(no name)` literal | L-006 scope của Wave 1 |
| `EV-06` | `app/admin/labor-profiles/[id]/page.tsx` L-81–L-86 raw `identityVerification` enum | L-007 scope của Wave 1 |
| `EV-07` | `app/admin/applications/page.tsx` L-413 raw `CCCD` label | L-047 scope của Wave 1 |
| `EV-08` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` L-74 (assertion "editor shell keeps canonical English Publish") | Test hiện tại phản ánh trạng thái PRE-binding; Wave 1 phải update theo binding F11 clarified §9 |
| `EV-09` | `vitest.unit.config.ts` (unit lane; fail-closed DB) | Test env READY; chạy được vitest offline |
| `EV-10` | `package.json` scripts (typecheck, lint, test:unit, build) | Required gates |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Wave 1 ownership: T1B sole owner. Không chia sub-agent (no parallel mutation). | `CHOSEN` |
| `DEC-02` | Architecture: typed dictionary pattern, NO i18n library, NO ESLint plugin, NO global status dictionary. Domain-owned dictionaries + cross-module glossary. | `CHOSEN` (T0 §3.C binding, EP §4) |
| `DEC-03` | StatusBadge là presentation primitive không nắm data. Consumer truyền `module` + dictionary lookup result (hoặc lookup function). | `CHOSEN` (EP §4.2 boundary rule) |
| `DEC-04` | Canonical lifecycle operation names `Publish` / `Unpublish` / `Archive` (JobPosting) KHÔNG đổi — chỉ Vietnamese display `Đă tin` / `Gỡ tin` / `Lưu trữ` thay đổi. Canonical chỉ xuất hiện trong `value`/`aria-label` (not primary visible text). | `CHOSEN` (T0 §2 #2 binding) |
| `DEC-05` | Project-level buttons giữ `Công bố dự án` / `Bỏ công bố dự án` (F11 frozen). | `CHOSEN` (EP §3.3 row #1/#2, audit §3.4) |
| `DEC-06` | `Publish` column header → `Công bố` (T0 §2 #1). Áp dụng bởi Wave 2 — Wave 1 KHÔNG sửa `/admin/jobs` columns; chỉ update static test để expect binding mới. | `CHOSEN` |
| `DEC-07` | `admin-jobs-terminology.static.test.ts` được update để reflect F11 scope clarification §9 (editor shell display `Đăng tin` / `Gỡ tin` / `Lưu trữ`). Đây là phạm vi Wave 1 theo EP §5.1 file ownership. | `CHOSEN` |
| `DEC-08` | F6 deferred (no logic change), KHÔNG chạm `editor-shell.tsx` source. Editor shell's display label change là within Wave 2 ownership (EP §5.2), không thuộc Wave 1. Wave 1 chỉ cập nhật static test expectation để document binding. | `CHOSEN` |
| `DEC-09` | Mọi role chip (L-003) và default `User` label (L-004) tiếng Việt. Canonical role enum giữ nguyên (T0 §2 #3 binding). | `CHOSEN` |
| `DEC-10` | Identity verification chip (L-007) render bằng `identityVerificationLabel()` typed helper; fallback `KEEP_CANONICAL_IDENTIFIER` cho value lạ (theo EP §3.2.10). | `CHOSEN` |
| `DEC-11` | Worker Portal `User` không thuộc scope Wave 1. Wave 1 chỉ thay default tên placeholder trong admin-shell. Worker Portal UI giữ nguyên. | `CHOSEN` |
| `DEC-12` | Test environment READY = vitest.unit.config.ts không yêu cầu DB, không yêu cầu env secret; `npm run typecheck` / `lint` / `test:unit` / `build` chạy được trong CI lane. | `CHOSEN` |
| `DEC-13` | Build vs Adopt = N/A — task không add dependency, không add shared framework. Wave 1 thuần typed helper + presentation primitive. | `CHOSEN` |
| `DEC-14` | Build vs Automate = N/A — task không tạo connector / scheduler / notification / workflow. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A — Wave 1 thuần typed helper + presentation primitive; không add dependency, không add shared framework. Toàn bộ sử dụng Next.js 15 / React 19 / Vitest hiện hữu. Mọi code mới viết vào repo, không import vendor mới.` | n/a | `N/A` | n/a | n/a | n/a | n/a |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A — task không tạo/thay connector, scheduler, notification worker, multi-system workflow.` | n/a | `N/A` | n/a | n/a | n/a | n/a | n/a |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/shared/i18n/glossary.ts` tồn tại, exports typed map gồm **mọi entry từ EP §3.1 (#1–#17) với label tiếng Việt không rỗng** và technical-hint tooltip khi có. Không trùng `code` giữa hai entries. |
| `RQ-02` | `src/shared/i18n/role-labels.ts` exports `roleLabel(role: SystemRole): string` cho đủ 13 role trong EP §3.4 binding. Canonical enum giữ nguyên, dùng cho `aria-label`/technical hint. |
| `RQ-03` | `src/shared/i18n/form-dictionary.ts` exports typed map các common form/table labels: `Status`, `Action`/`Thao tác`, `Created`/`Ngày tạo`, `Updated`/`Ngày cập nhật`, `Code`/`Mã`, `Name`/`Tên`, `Description`/`Mô tả`, `Reason (required)`/`Lý do (bắt buộc)`, `Save`/`Lưu`, `Cancel`/`Hủy`, `Search`/`Tìm kiếm`. |
| `RQ-04` | `src/shared/i18n/action-dictionary.ts` exports `actionLabel(action): string` cho 19 canonical action trong EP §3.3 (rows #1–#19). Trừ row #1/#2 (F11 buttons frozen — không qua action dictionary). |
| `RQ-05` | `src/shared/i18n/error-dictionary.ts` re-exports `JOB_POSTING_ERROR_LABELS` + `CONFLICT_LABELS` + cung cấp `errorLabel({ module, code, fallback })`. KHÔNG đổi signature các module khác. |
| `RQ-06` | `src/shared/ui/status-badge/` chứa `StatusBadge` React component. Props: `{ module: string; status: string; tone?: 'neutral' \| 'success' \| 'warn' \| 'danger'; children?: React.ReactNode; }`. Component reads dictionary lookup qua helper prop hoặc render chính `children` (nếu consumer truyền sẵn label). KHÔNG import global aggregator. |
| `RQ-07` | `src/shared/ui/role-guard/role-guard-layout.tsx` cập nhật: `ADMIN_NAV_PHASE4` row `/admin/staffing` đổi label `Staffing` → `Nhu cầu tuyển dụng` (L-001). `UserFooter` đổi default `'User'` → `'Người dùng'` (L-004). Role chip render qua `roleLabel()` helper (L-003). |
| `RQ-08` | `app/admin/admin-shell.tsx` không thay đổi string ngoài phạm vi `brandTitle` (giữ `'HRP Admin'`) và pass-through props. Role mapping `SYSTEM_TO_UI_ROLE` giữ nguyên; không tạo fallback tiếng Việt trong mapping (role chip render là trách nhiệm của `RoleGuardLayout` qua `roleLabel()`). |
| `RQ-09` | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` L-319: literal `(no name)` → `(chưa có tên)`. KHÔNG đổi logic. |
| `RQ-10` | `app/admin/labor-profiles/[id]/page.tsx` L-81–L-86: chip `identityVerification` render qua `identityVerificationLabel()` helper (file mới trong `src/shared/i18n/` hoặc module-owned dictionary trong `src/domains/talent/`); fallback `KEEP_CANONICAL_IDENTIFIER` cho value lạ. KHÔNG đổi logic row khác. |
| `RQ-11` | `app/admin/applications/page.tsx` L-413: label `CCCD` → `Số CCCD`. KHÔNG đổi logic. |
| `RQ-12` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` update để reflect F11 scope clarification §9 + binding JobPosting display `Đăng tin / Gỡ tin / Lưu trữ`. Các assertion hiện tại nói "editor shell keeps canonical English Publish" → sửa thành assertion nói "editor shell MUST adopt `Đăng tin` / `Gỡ tin` / `Lưu trữ` as primary operator-facing display; canonical `Publish` / `Unpublish` / `Archive` appears only in `label=` attribute used as `value` / `aria-label`". |
| `RQ-13` | 5 static tests mới tồn tại và pass: `glossary.static.test`, `form-dictionary.static.test`, `action-dictionary.static.test`, `role-labels.static.test`, `status-badge.test.tsx`. Mỗi test tối thiểu 1 case PASS. |
| `RQ-14` | KHÔNG có raw HTML/CSS mới do Wave 1 thêm. Tất cả styles đều dùng class tokens hiện hữu (`slate-*`, `bg-*`, v.v.). StatusBadge styling dùng token classes (`rounded-full px-2 py-0.5 text-xs font-semibold`). |
| `RQ-15` | KHÔNG có package.json / lockfile delta (no new dependency, no new script). |
| `RQ-16` | `git diff --check` clean; UTF-8 no BOM; LF-only; no U+FFFD trên changed surface. |
| `RQ-17` | Handback `READY_FOR_REVIEW` với baseline, implementation SHA, final HEAD, exact Wave 1 items hoàn thành/deferred, English-literal scan, test counts, changed files, PR URL, CI state. |
| `RQ-18` | Identity verification: domain-owned dictionary lives trong `src/domains/talent/` (theo EP §4.3); shared `glossary.ts` không own domain enum labels ngoài cross-module terms. |
| `RQ-19` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` 3 lifecycle ActionButton calls: button text MUST be `Đăng tin / Gỡ tin / Lưu trữ` (Vietnamese primary operator-facing); canonical `Publish / Unpublish / Archive` MUST appear ONLY as `aria-label` attribute. `runStateMutation` argument (canonical operation key) KHÔNG thay đổi. |

### 4.2 Scope boundaries

- **In:**
  - NEW: `src/shared/i18n/{glossary.ts, form-dictionary.ts, action-dictionary.ts, role-labels.ts, error-dictionary.ts}`.
  - NEW: `src/shared/i18n/__tests__/{glossary, form-dictionary, action-dictionary, role-labels}.static.test.ts`.
  - NEW: `src/shared/ui/status-badge/{index.tsx, status-badge.test.tsx}`.
  - MODIFY: `src/shared/ui/role-guard/role-guard-layout.tsx` (L-001 / L-003 / L-004 only; KHÔNG đổi nav export).
  - MODIFY: `app/admin/admin-shell.tsx` (chỉ comment + import guard; KHÔNG đổi string mapping).
  - MODIFY: `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (chỉ `(no name)` → `(chưa có tên)`).
  - MODIFY: `app/admin/labor-profiles/[id]/page.tsx` (chỉ chip `identityVerification` qua helper).
  - NEW: `src/domains/talent/identity-verification-ui.ts` (domain-owned identity verification dictionary + `identityVerificationLabel()` helper).
  - NEW: `src/domains/talent/__tests__/identity-verification-ui.test.ts`.
  - MODIFY: `app/admin/applications/page.tsx` (chỉ `CCCD` → `Số CCCD` label).
  - MODIFY: `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (F11 scope update).
  - MODIFY: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (F11 §9 binding — display `Đăng tin / Gỡ tin / Lưu trữ`; canonical lifecycle operation names preserved in `aria-label` only). Ngoài EP §5.1 allowlist — motivated by T0 §2 #2 + directive Phần B §3 + §4.
  - NEW: `docs/tasks/hrp-admin-localization-wave1-foundation/{TASK.md, HANDOFF.md}`.
- **Out:**
  - JobPosting editor shell, JobOpening, Staffing, Applications logic, Users, Workers, Clients, Vendors, Media, Settings, Attendance, Reconciliation, Payroll, Commission, Tickets — defer to Wave 2/3/4 per EP §5.2-§5.4.
  - UI2 surface (`src/domains/job-board/public-content-controls/**`, `docs/tasks/hrp-ui2-public-content-controls-sticky/**`, HomepageSettings fields/migration, sticky announcement renderer/settings, NewsSection toggle).
  - Schema / migration / Prisma / auth / RLS / role matrix / lifecycle / API contract / `middleware.ts` / `.github/**`.
  - Worker Portal (`app/m/**`) UI copy — outside Wave 1 scope (only admin-shell + admin-* changes).
  - i18n library adoption (`next-intl`, `react-intl`, custom plugin).
- **Allowed task artifacts:** `docs/tasks/hrp-admin-localization-wave1-foundation/**`.

### 4.3 Domain boundaries

- **Data/state:** `N/A` — Wave 1 chỉ typed dictionary + UI primitive; không touch data layer.
- **Permission/security:** `N/A` — không đổi auth/role/permission matrix. Role chip render tiếng Việt; canonical enum value giữ nguyên.
- **Interface/API:** `N/A` — không đổi API route, không đổi component public signature ngoài `StatusBadge` mới.
- **Migration/rollback:** `N/A` — không có migration. Rollback thuần revert PR.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/shared/i18n/glossary.ts` (NEW) + `__tests__/glossary.static.test.ts` | Cross-module glossary typed map (RQ-01). | `npm run typecheck`, `npm run test:unit src/shared/i18n/__tests__/glossary.static.test.ts` | nếu glossary phải nhập domain enum thuộc Wave 2 ownership — STOP & báo T0 |
| `STEP-02` | `src/shared/i18n/role-labels.ts` (NEW) + `__tests__/role-labels.static.test.ts` | `roleLabel()` cho 13 SystemRole (RQ-02). | `npm run typecheck`, `npm run test:unit` | nếu SystemRole import thay đổi shape — STOP |
| `STEP-03` | `src/shared/i18n/form-dictionary.ts` (NEW) + `__tests__/form-dictionary.static.test.ts` | Common form/table labels (RQ-03). | `npm run typecheck`, `npm run test:unit` | nếu một label nào trùng domain enum — defer sang Wave 2/3 |
| `STEP-04` | `src/shared/i18n/action-dictionary.ts` (NEW) + `__tests__/action-dictionary.static.test.ts` | 19 canonical action → Vietnamese label (RQ-04). | `npm run typecheck`, `npm run test:unit` | nếu một action trùng F11 buttons — split dictionary (F11 buttons nằm riêng, không qua `actionLabel()`) |
| `STEP-05` | `src/shared/i18n/error-dictionary.ts` (NEW) | Re-export existing error mappers + `errorLabel({ module, code, fallback })` (RQ-05). | `npm run typecheck` | nếu conflict signature — defer |
| `STEP-06` | `src/shared/ui/status-badge/index.tsx` (NEW) + `status-badge.test.tsx` | `StatusBadge` presentation primitive (props `module`, `status`) (RQ-06). | `npm run typecheck`, `npm run test:unit src/shared/ui/status-badge/status-badge.test.tsx` | nếu primitive leak global aggregator — STOP & redesign |
| `STEP-07` | `src/shared/ui/role-guard/role-guard-layout.tsx` (MODIFY) | L-001 sidebar `Staffing` → `Nhu cầu tuyển dụng`; L-003 role chip via `roleLabel()`; L-004 default `User` → `Người dùng` (RQ-07). | `npm run typecheck`, `npm run lint`, `npm run test:unit` | nếu nav export shape đổi → STOP |
| `STEP-08` | `app/admin/admin-shell.tsx` (MODIFY) | Comment + import guard cho RoleGuardLayout; không đổi string mapping (RQ-08). | `npm run typecheck` | nếu prop drilling bắt buộc → defer |
| `STEP-09` | `src/domains/talent/identity-verification-ui.ts` (NEW) + `__tests__/identity-verification-ui.test.ts` | Domain-owned dictionary cho identity verification + `identityVerificationLabel()` (RQ-10, RQ-18). | `npm run typecheck`, `npm run test:unit` | nếu dictionary bleed sang domain khác — STOP |
| `STEP-10` | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (MODIFY) | L-319 `(no name)` → `(chưa có tên)` (RQ-09). | `npm run typecheck`, `npm run lint`, `npm run test:unit` | nếu file owner khác có pending edit → defer |
| `STEP-11` | `app/admin/labor-profiles/[id]/page.tsx` (MODIFY) | Render chip `identityVerification` qua `identityVerificationLabel()` (RQ-10). | `npm run typecheck`, `npm run lint`, `npm run test:unit` | nếu file owner khác có pending edit → defer |
| `STEP-12` | `app/admin/applications/page.tsx` (MODIFY) | L-413 `CCCD` → `Số CCCD` (RQ-11). | `npm run typecheck`, `npm run lint`, `npm run test:unit` | nếu file owner khác có pending edit → defer |
| `STEP-13` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (MODIFY) | Update assertion để phản ánh F11 scope clarification §9 (RQ-12). | `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | nếu editor-shell.tsx đã được sửa bởi stream khác (T1A/T1C) → STOP & reconcile |
| `STEP-16` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (MODIFY) | Apply F11 §9 binding: button text `Đăng tin / Gỡ tin / Lưu trữ`; canonical `Publish / Unpublish / Archive` only in `aria-label`. Canonical `runStateMutation` argument KHÔNG đổi (RQ-19). | `npm run typecheck`, `npm run lint`, `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | nếu đụng T1A F9 closeout lane → STOP & reconcile |
| `STEP-14` | Verify gates (whole repo) | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `verify-encoding.ps1`. | All pass. | Nếu fail → STOP & debug |
| `STEP-15` | Commit + push + open PR non-draft. Watch CI 4/4. Handback. | Deliver. | `gh pr checks NUM --watch` (NUM = PR number). | CI fail → STOP & open correction batch (budget 1). |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `src/shared/i18n/glossary.ts` exists, exports typed map có ≥ 17 entries (EP §3.1 #1–#17) với `label` (tiếng Việt, không rỗng) + `code` (canonical, unique). | `npm run test:unit src/shared/i18n/__tests__/glossary.static.test.ts` |
| `AC-02` | `src/shared/i18n/role-labels.ts` exports `roleLabel(SystemRole): string` cho đủ 13 role trong EP §3.4 binding. | `npm run test:unit src/shared/i18n/__tests__/role-labels.static.test.ts` |
| `AC-03` | `src/shared/i18n/form-dictionary.ts` exports typed map ≥ 11 entries (EP §3.5 subset Wave 1). | `npm run test:unit src/shared/i18n/__tests__/form-dictionary.static.test.ts` |
| `AC-04` | `src/shared/i18n/action-dictionary.ts` exports `actionLabel(action): string` cho ≥ 17 entries (EP §3.3 rows #3-#19; row #1/#2 F11 excluded). | `npm run test:unit src/shared/i18n/__tests__/action-dictionary.static.test.ts` |
| `AC-05` | `src/shared/i18n/error-dictionary.ts` re-exports `JOB_POSTING_ERROR_LABELS` + `CONFLICT_LABELS` + `errorLabel({ module, code, fallback })`. | `node import smoke (resolve + loadModule)` + `npm run typecheck` |
| `AC-06` | `src/shared/ui/status-badge/index.tsx` exports `StatusBadge` component với prop shape gồm `module: string`, `status: string`, optional `tone: NEUTRAL_OR_SUCCESS_OR_WARN_OR_DANGER`, optional `children: ReactNode`. KHÔNG reference `STATUS_LABELS` global. | `npm run test:unit src/shared/ui/status-badge/status-badge.test.tsx` |
| `AC-07` | `role-guard-layout.tsx` chứa `'/admin/staffing'` mapping `label: 'Nhu cầu tuyển dụng'`. | `rg "'/admin/staffing'" src/shared/ui/role-guard/role-guard-layout.tsx` (line-by-line assert) |
| `AC-08` | `role-guard-layout.tsx` L-004 fallback từ `'User'` → `'Người dùng'`. | `rg "Người dùng" src/shared/ui/role-guard/role-guard-layout.tsx` |
| `AC-09` | `role-guard-layout.tsx` role chip render qua `roleLabel()` (import `roleLabel` từ `src/shared/i18n/role-labels`). | `rg "roleLabel" src/shared/ui/role-guard/role-guard-layout.tsx` + import assert |
| `AC-10` | `recruiter-assignment-manager.tsx` chứa `'(chưa có tên)'` literal; KHÔNG chứa `'(no name)'`. | `rg "chưa có tên" app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` + `rg "'(no name)'" app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (negative) |
| `AC-11` | `labor-profiles/[id]/page.tsx` chip `identityVerification` render qua `identityVerificationLabel()` (import từ `src/domains/talent/identity-verification-ui`). | `rg "identityVerificationLabel" app/admin/labor-profiles/[id]/page.tsx` |
| `AC-12` | `applications/page.tsx` L-413 chứa `Số CCCD` literal; KHÔNG chứa raw label `CCCD` ở `dt` element nữa. | `rg "Số CCCD" app/admin/applications/page.tsx` + `rg "CCCD" app/admin/applications/page.tsx \| grep -v "Số CCCD"` (negative) |
| `AC-13` | `admin-jobs-terminology.static.test.ts` đã update: có reference đến `'Đăng tin'`/`'Gỡ tin'`/`'Lưu trữ'` cho editor shell display; có assertion rằng `Publish`/`Unpublish`/`Archive` KHÔNG xuất hiện raw trong editor shell đó không phải `label=` / `aria-label` / `value=`. | `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` |
| `AC-22` | `editor-shell.tsx` 3 ActionButton (publish / unpublish / archive) render Vietnamese label; canonical name trong `aria-label`. | `rg "Đăng tin.*aria-label=.Publish" app/admin/jobs/job-postings/[id]/editor-shell.tsx` + tương tự cho 2 button còn lại + `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` |
| `AC-14` | `npm run typecheck` PASS. | `npm run typecheck` |
| `AC-15` | `npm run lint` PASS. | `npm run lint` |
| `AC-16` | `npm run test:unit` PASS trên full unit lane. | `npm run test:unit` |
| `AC-17` | `npm run build` PASS. | `npm run build` |
| `AC-18` | `git diff --check HEAD` exit zero. | `git diff --check HEAD` (post-commit, in worktree, against baseline HEAD) |
| `AC-19` | UTF-8 no BOM trên toàn changed surface. | `.ai-pipeline/scripts/verify-encoding.ps1` |
| `AC-20` | KHÔNG có package.json / pnpm-lock.yaml delta. | `git status --porcelain package.json pnpm-lock.yaml` (= empty) |
| `AC-21` | Handback `READY_FOR_REVIEW` với exact implementation SHA, final HEAD, PR URL, CI state. | `verify-handoff.ps1` + manual HANDOFF.md |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-07`, `AC-08`, `AC-09` |
| `RQ-08` | `STEP-08` | `AC-14` |
| `RQ-09` | `STEP-10` | `AC-10` |
| `RQ-10` | `STEP-09`, `STEP-11` | `AC-11` |
| `RQ-11` | `STEP-12` | `AC-12` |
| `RQ-12` | `STEP-13` | `AC-13` |
| `RQ-13` | `STEP-01..06` | `AC-01..06` |
| `RQ-14` | `STEP-06` | `AC-06` |
| `RQ-15` | `STEP-14` | `AC-20` |
| `RQ-16` | `STEP-14` | `AC-18`, `AC-19` |
| `RQ-17` | `STEP-15` | `AC-21` |
| `RQ-18` | `STEP-09`, `STEP-11` | `AC-11` |
| `RQ-19` | `STEP-16` | `AC-22` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `admin-jobs-terminology.static.test.ts` hiện đang guard cho "editor shell keeps canonical English `Publish` label". Nếu sửa assertion không đúng cách có thể break F11 binding. | Assertion mới chỉ nói editor shell display `Đăng tin` / `Gỡ tin` / `Lưu trữ` PHẢI xuất hiện raw; canonical `Publish` / `Unpublish` / `Archive` chỉ xuất hiện trong `label=` attribute. Giữ F11 business-button literals `Công bố dự án` / `Bỏ công bố dự án` test còn nguyên. |
| `RISK-02` | Touch `recruiter-assignment-manager.tsx` có thể va với F9 hoặc F9b critical lane của T1A. | File đã được close (F9 closed via T1A `t1a-f9b-r2-production-closeout`); chỉ thay 1 string literal, không đổi logic. Nếu CI phát hiện conflict → STOP & reconcile với T1A. |
| `RISK-03` | `labor-profiles/[id]/page.tsx` thuộc `t1a-p1e-recruiter-workbench` lane đã close. | Touch nhỏ (1 chip render); nếu conflict → defer. |
| `RISK-04` | `applications/page.tsx` thuộc placement lane — có thể có WIP pending. | Touch 1 string literal; nếu conflict → defer. |
| `RISK-05` | Glossary dict overlap với existing `placement-ui.ts` STATUS_LABELS / SOURCE_LABELS / ACTION_LABELS. | Wave 1 glossary KHÔNG bao gồm Application status/source/action — chúng thuộc domain-owned `placement-ui.ts`. Không re-export, không copy. |
| `RISK-06` | `StatusBadge` initial adoption rỗng (chưa có consumer trong Wave 1) — risk "considered dead code". | StatusBadge đi kèm test render đầy đủ; consumers Wave 2/3/4 adopt từ dictionary consumer-supplied. Document trong HANDOFF. |
| `RISK-07` | `role-guard-layout.tsx` dùng chung cho 3 cổng (admin / worker / vendor); thay role chip có thể ảnh hưởng worker/vendor portal. | Worker portal đã tiếng Việt (BR locale); role chip hiện hiển thị `role` enum raw (`WORKER`, `VENDOR`, v.v.). Wrap bằng `roleLabel()` sẽ dịch sang tiếng Việt; vendor portal cũng OK vì role enum là `ADMIN`, `HR_*`, `ACCOUNTANT` (đã có mapping). Worker portal role là `WORKER` → `Người lao động` — đúng glossary. Verify lại Worker Portal trong target pages sau khi land Wave 1. Nếu worker portal hiển thị role tiếng Việt là unexpected behavior (chỉ admin muốn) → rollback role chip change chỉ trong admin view. |
| `RISK-08` | English-literal scan có thể miss raw enum hiển thị (status enum render thẳng vào UI). | Wave 1 chưa chạm các domain pages nên scan chỉ giới hạn changed surface; deferred sang Wave 2/3/4. |
| `RISK-09` | `editor-shell.tsx` thuộc F9 closeout lane của T1A (`t1a-f9b-r2-production-closeout`). F9 đã closed, nhưng touch có thể ảnh hưởng nếu T1A có WIP pending. Touch 3 lifecycle ActionButton chỉ thay `label` + thêm `ariaLabel` prop — không đổi `runStateMutation` argument, không đổi guard, không đổi API. Wave 1 chỉ sửa F11 binding display, không đổi logic. |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-04` | Initial contract | Initial (post-merge PR #94; baseline `796e13c6`) |
| `v1.1` | `2026-10-04` | Add RQ-19 + STEP-13a + AC-22 + RISK-09; add `editor-shell.tsx` to in-scope | Apply F11 §9 binding requires updating the editor shell ActionButton text (Vietnamese) + aria-label (canonical). Directive Phần B §3 + §4 mandates `Publish → Đăng tin` etc. as operator-facing; cannot be deferred to Wave 2 because Wave 1 owns the static-test update that asserts it. Touch is non-logic (label + new `ariaLabel` prop; canonical `runStateMutation` argument unchanged). |