# TASK — `hrp-admin-localization-wave2-recruitment`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-localization-wave2-recruitment` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | T0 ủy quyền `Audit mode: NONE` cho Wave 2 theo EP §5.2 (binding). Wave 2 chỉ thay Vietnamese display label trong các domain pages thuộc allowlist; không đổi schema, API, lifecycle, auth/RLS, role matrix, Prisma. T1B self-review. |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` |
| Baseline | `16df26ee10faf47c5e5ed483e6b2b780658e007c` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/domains/projects/**` (NEW); `src/domains/staffing/job-opening-ui.ts` (NEW); `src/domains/staffing/job-posting-ui.ts` (NEW); `src/domains/staffing/staffing-order-ui.ts` (NEW); `src/domains/staffing/recruiter-assignment-ui.ts` (NEW); `app/admin/jobs/page.tsx`; `app/admin/jobs/job-postings/page.tsx`; `app/admin/jobs/job-postings/[id]/page.tsx`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx`; `app/admin/job-openings/[id]/page.tsx`; `app/admin/staffing/staffing-list-client.tsx`; `app/admin/staffing/page.tsx`; new static tests in `app/admin/jobs/__tests__/jobs-terminology.static.test.ts`, `app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts`, `app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts`, `app/admin/staffing/__tests__/staffing-terminology.static.test.ts`. F11 fence existing at `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` is preserved (no rewrite). |
| Forbidden paths | `app/admin/users/**`, `app/admin/workers/**`, `app/admin/labor-profiles/**`, `app/admin/clients/**`, `app/admin/vendors/**`, `app/admin/media/**`, `app/admin/settings/**`, `app/admin/attendance/**`, `app/admin/reconciliation/**`, `app/admin/payroll/**`, `app/admin/commission/**`, `app/admin/tickets/**`, `app/m/**` (Worker Portal), `app/(public)/**`, `src/domains/job-board/public-content-controls/**`, `src/domains/applications/placement-ui.ts` (touch-up only if needed; not Wave 2 scope), `prisma/**`, `middleware.ts`, `.github/**`, `packages/**`, `app/admin/applications/**` (Applications UI — out of scope; touch up dictionary only if necessary) |
| Required gates | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `.ai-pipeline/scripts/verify-encoding.ps1`, `.ai-pipeline/scripts/verify-task.ps1`, `.ai-pipeline/scripts/verify-handoff.ps1` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

> Lane `STANDARD` + Audit `NONE` được T0 ủy quyền rõ trong directive Phần B §4 (Wave 2 ownership) và EP §5.2. Wave 2 không thuộc phạm vi audit vì:
> - Không đổi canonical enum / API / Prisma schema / migration / RLS / auth / role matrix.
> - Không đổi lifecycle / state machine / business rule / idempotency / write semantics.
> - Phạm vi thuần: typed dictionary + per-route label rewrite + per-route static test.
> - Không touch file ngoài allowlist.

> `READY_TO_CODE` đạt được vì: baseline pin (Wave 1 head `16df26ee`, post-merge PR #96 theo directive), decision state `CLOSED` (T0 §2 đã bind glossary + wave ownership; 27 binding entries đã chốt qua EP §3), test environment `READY` (vitest.unit.config.ts không cần DB, chạy được trong CI), correction budget = 1 theo V2.

## 1. Outcome

### 1.1 User-visible outcome

Wave 2 của Admin Portal Vietnamese Localization theo binding execution plan (EP §5.2). Sau khi merge Wave 2:

- 5 module-owned typed dictionaries tồn tại với lookup helpers: `project-ui.ts`, `job-opening-ui.ts`, `job-posting-ui.ts`, `staffing-order-ui.ts`, `recruiter-assignment-ui.ts`. Mỗi dictionary re-export không xâm phạm `placement-ui.ts` (Application status đã có sẵn).
- Mọi status hiển thị trên 4 surfaces (Project, JobPosting, JobOpening, Staffing) phải đi qua domain dictionary + `<StatusBadge>` primitive; KHÔNG còn raw enum leakage.
- F11 business-button literals `Công bố dự án` / `Bỏ công bố dự án` (Project-level toggle) được giữ nguyên.
- JobPosting editor `Đăng tin` / `Gỡ tin` / `Lưu trữ` (Vietnamese primary display) + canonical `Publish` / `Unpublish` / `Archive` chỉ xuất hiện trong `value` / `aria-label` / `runStateMutation` argument.
- P1/P2 thuộc L-010..L-046 (EP §5.2 file ownership) được đóng theo binding glossary.
- 4 static test mới (mỗi route) bảo vệ label + F11 fence còn nguyên.

### 1.2 Non-goals

- KHÔNG việt hóa Applications UI logic (đụng `placement-ui.ts` chỉ khi test cần import ngầm; không sửa dictionary Application nếu nó đã đúng).
- KHÔNG đổi canonical enum / API field / Prisma / migration / RLS / role matrix.
- KHÔNG touch Worker Portal `app/m/**`, public surface `app/(public)/**`, UI2, F6.
- KHÔNG tạo global status dictionary; chỉ module-owned + cross-module glossary.
- KHÔNG mở Mốc 3 / 4 / 5 hay P2.1.
- KHÔNG tạo dependency mới / lockfile delta.
- KHÔNG push / open PR cuối trước khi PR #96 merge và latest-main reconciliation hoàn tất (theo directive Phần B §"Dependency"). Trong round này, code + commit trên `codex/t1b-admin-localization-wave2-recruitment`; PR mở sau khi `git merge --no-ff origin/main` đã chạy.
- KHÔNG tự merge / deploy.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md` §5.2 (Wave 2 file ownership + acceptance) | Binding scope Wave 2 |
| `EV-02` | EP §3.2 (status enum labels), §3.3 (action terms), §3.5 (form/table labels), §4.2 (architecture), §4.4 (forbidden-English allowlist) | Binding glossary + architecture |
| `EV-03` | `src/shared/i18n/glossary.ts` (Wave 1) — cross-module terms `project`, `job_posting`, `job_opening`, `staffing_order`, `staffing_order_slot`, `recruiter_workbench`, `worker_id`, `slug`, `revision` | Dictionary seed cho Wave 2 |
| `EV-04` | `src/shared/i18n/action-dictionary.ts` (Wave 1) — `publish: 'Đăng tin'`, `unpublish: 'Gỡ tin'`, `archive: 'Lưu trữ'`, `open_opening`, `close_opening`, `cancel` | Action labels đã có sẵn |
| `EV-05` | `src/shared/i18n/form-dictionary.ts` (Wave 1) — `status`, `action`, `created`, `updated`, `code`, `name`, `description`, `cancel`, `search` | Form labels đã có sẵn |
| `EV-06` | `src/shared/ui/status-badge/index.tsx` (Wave 1) — primitive props `module`, `status`, `tone`, `children`, `testId` | `<StatusBadge>` đã có sẵn cho consumers |
| `EV-07` | `src/domains/applications/placement-ui.ts` — pattern dictionary với `STATUS_LABELS` + helper | Pattern cho Wave 2 dictionaries |
| `EV-08` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (Wave 1) — F11 fence + glossary note | F11 fence tồn tại; Wave 2 phải giữ assertions này |
| `EV-09` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (Wave 1) — F11 §9 binding đã apply (`Đăng tin` / `Gỡ tin` / `Lưu trữ` + canonical aria-label) | Editor shell đã đúng; Wave 2 không touch |
| `EV-10` | `app/admin/jobs/page.tsx` hiện có inline `STATUS_COLORS` (raw enum `Published`/`Unpublished`/`Closed`) + `STATUS_CONFIG` mapping — raw status rendered via local `StatusBadge` | L-014/L-015/L-018 scope: route sử dụng raw literal `Published` / `Unpublished` / `Closed` ở L351 |
| `EV-11` | `app/admin/jobs/job-postings/page.tsx` hiện có inline `colorMap` cho `DRAFT/PUBLISHED/ARCHIVED` + status filter `<option value={s}>{s}</option>` (raw enum) | L-019..L-025 scope: status filter dropdown hiển thị raw enum |
| `EV-12` | `app/admin/staffing/staffing-list-client.tsx` hiện có inline `STATUS_CONFIG` (OPEN/CLOSING_SOON/CLOSED/CANCELLED) + H1 raw `Staffing Orders` | L-044..L-046 scope |
| `EV-13` | `app/admin/job-openings/[id]/page.tsx` (binding verify only; chưa đọc nội dung trong round này) | L-036..L-043 scope |
| `EV-14` | `vitest.unit.config.ts` (Wave 1 already READY; 231 files / 3759 tests pass) | Test env READY |
| `EV-15` | `package.json` scripts (typecheck, lint, test:unit, build) | Required gates |
| `EV-16` | `src/shared/i18n/role-labels.ts` (Wave 1) — không used by Wave 2 directly (admin-shell only) | Confirm không touch |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Wave 2 ownership: T1B sole owner. Không spawn sub-agent để mutate (file allowlist + dictionary signature changes cần single coordinator). | `CHOSEN` |
| `DEC-02` | 5 NEW module-owned dictionaries (`project-ui.ts`, `job-opening-ui.ts`, `job-posting-ui.ts`, `staffing-order-ui.ts`, `recruiter-assignment-ui.ts`) theo EP §4.2 / §4.3. Mỗi dictionary: typed map + helper `moduleStatusLabel(module, status)` cho shared `<StatusBadge>` lookup, hoặc local `projectStatusLabel()` / `jobOpeningStatusLabel()` / v.v. — tùy thuộc consumer signature. | `CHOSEN` |
| `DEC-03` | Dictionary imports cross-module terms từ `src/shared/i18n/glossary.ts` (Wave 1). KHÔNG re-define trong dictionary. KHÔNG re-export. | `CHOSEN` (EP §4.2 boundary rule) |
| `DEC-04` | `<StatusBadge module="..." status="..." />` tiếp tục dùng Wave 1 primitive. Consumer lookup Vietnamese label qua dictionary helper, rồi pass vào `children`. | `CHOSEN` (EP §4.2, §4.5) |
| `DEC-05` | F11 business-button literals `Công bố dự án` / `Bỏ công bố dự án` giữ nguyên trên Project-level button (chỉ thay inline `STATUS_COLORS` / `StatusBadge` raw enum). Fence test trong `admin-jobs-terminology.static.test.ts` đã assert; Wave 2 chỉ đảm bảo không xoá. | `CHOSEN` (T0 §2 binding, EP §3.3 #1/#2) |
| `DEC-06` | JobPosting editor (đã F11-compliant từ Wave 1) KHÔNG được touch trong Wave 2. Editor shell đã đúng: `Đăng tin` / `Gỡ tin` / `Lưu trữ` + canonical `Publish` / `Unpublish` / `Archive` trong `aria-label` + `runStateMutation` argument. | `CHOSEN` (EP §3.3 #3-#5, T0 §2 #2) |
| `DEC-07` | `<option value>` luôn giữ canonical enum (DRAFT, PUBLISHED, ARCHIVED, OPEN, CLOSING_SOON, CLOSED, CANCELLED). CHỈ text hiển thị trong `<option>` là Vietnamese. | `CHOSEN` (EP §3.6 KEEP_CANONICAL_IDENTIFIER, directive Requirement 6) |
| `DEC-08` | API payload + lifecycle operation name KHÔNG đổi. Canonical `Publish` / `Unpublish` / `Archive` vẫn là key trong URL path / body / `runStateMutation` argument / Prisma enum. | `CHOSEN` (EP §3.6, §4.4, T0 §2 #2) |
| `DEC-09` | Không đổi `<StatusBadge>` signature (giữ nguyên Wave 1 shape). Consumer lookup qua dictionary helper trước, rồi truyền Vietnamese label làm `children`. Tone lấy từ cùng dictionary. | `CHOSEN` |
| `DEC-10` | L-009 (recruiter-assignment status) dictionary tạo trong Wave 2 vì file cho phép, nhưng file thực tế (recruiter-assignment-manager.tsx) KHÔNG sửa — nó đã Vietnamese từ Wave 1 closeout. Wave 2 chỉ tạo dictionary file + test cho completeness (forward-only, no consumer WIP). | `CHOSEN` (EP §5.2) |
| `DEC-11` | Mọi 4 static test mới (jobs, job-postings, job-openings, staffing) mirror pattern `admin-jobs-terminology.static.test.ts`: đọc file, assert Vietnamese label present, assert raw English absent (per-route forbidden list), assert F11 business-button literals (where applicable), assert LF-only + no BOM. | `CHOSEN` (EP §6.1, Wave 1 test pattern) |
| `DEC-12` | Diacritic-missing detection giữ explicit per-route forbidden list (e.g. `['Huy', 'Dang', 'tao']` for `staffing`), NO regex heuristic. Allowlist cho canonical tokens (`null`, `undefined`, `true`, `false`, `M4`, `M8`, `id`). | `CHOSEN` (EP §4.5, T0 §3.D) |
| `DEC-13` | Forbidden-English scan: assert `<option value={status}>` raw label MUST be Vietnamese (không match `/^>[A-Z_]+$/` for option text). Per-route. | `CHOSEN` (EP §4.5) |
| `DEC-14` | `app/admin/staffing/page.tsx` (server component, 41 lines) chỉ verify H1 inherited. Nếu H1 nằm trong client (staffing-list-client.tsx), thì client H1 cần fix; page.tsx không cần thay. | `CHOSEN` (EP §5.2 allowlist) |
| `DEC-15` | Build vs Adopt = N/A — task không add dependency, không add shared framework. Toàn bộ sử dụng Next.js 15 / React 19 / Vitest hiện hữu. | `CHOSEN` |
| `DEC-16` | Build vs Automate = N/A — task không tạo / thay connector, scheduler, notification worker, multi-system workflow. | `CHOSEN` |
| `DEC-17` | `git diff --check` clean; UTF-8 no BOM; LF-only. Forward-only commit. Không push / open PR cuối cho tới khi PR #96 merge và latest-main reconciliation SHA được pin. | `CHOSEN` (directive §"Delivery", §"Dependency", EP §4) |
| `DEC-18` | Không touch `prisma/**`, `middleware.ts`, `.github/**`, `packages/**`, `pnpm-lock.yaml`, `package.json`. Forward-only. | `CHOSEN` (directive §"Forbidden", EP §4) |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A — Wave 2 thuần typed dictionary + per-route label rewrite + per-route static test; không add dependency, không add shared framework. Toàn bộ sử dụng Next.js 15 / React 19 / Vitest hiện hữu. Mọi code mới viết vào repo, không import vendor mới.` | n/a | `N/A` | n/a | n/a | n/a | n/a |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A — task không tạo/thay connector, scheduler, notification worker, multi-system workflow.` | n/a | `N/A` | n/a | n/a | n/a | n/a | n/a |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/domains/projects/project-ui.ts` (NEW) exports `ProjectStatusLabel` map cho 5 status `DRAFT` / `ACTIVE` / `PAUSED` / `COMPLETED` / `CANCELLED` (theo EP §3.2.1) + 3 column-derived `Đã công bố` / `Chưa công bố` / `Đã đóng`. Helper `projectStatusLabel(status: string): string` (fallback KEEP_CANONICAL_IDENTIFIER). F11 business-button literals `Công bố dự án` / `Bỏ công bố dự án` NOT in this dictionary (lives on button JSX). |
| `RQ-02` | `src/domains/staffing/job-opening-ui.ts` (NEW) exports `JOB_OPENING_STATUS_LABELS` map cho 6 status `DRAFT` / `OPEN` / `CLOSING_SOON` / `CLOSED` / `FILLED` / `CANCELLED` (theo EP §3.2.2) + `serviceModel` labels `Tại nơi làm việc` / `Từ xa` (EP §3.2.11). Helper `jobOpeningStatusLabel()` + `jobOpeningServiceModelLabel()`. |
| `RQ-03` | `src/domains/staffing/job-posting-ui.ts` (NEW) exports `JOB_POSTING_STATUS_LABELS` map cho 3 status `DRAFT` / `PUBLISHED` / `ARCHIVED` (theo EP §3.2.3). Helper `jobPostingStatusLabel()`. Re-imports action labels từ `src/shared/i18n/action-dictionary.ts` (Wave 1) cho `Đăng tin` / `Gỡ tin` / `Lưu trữ` (EP §3.3 #3-#5). KHÔNG redefine action labels. |
| `RQ-04` | `src/domains/staffing/staffing-order-ui.ts` (NEW) exports `STAFFING_ORDER_STATUS_LABELS` map cho 4 status `OPEN` / `CLOSING_SOON` / `CLOSED` / `CANCELLED` (mirror the inline `STATUS_CONFIG` in `staffing-list-client.tsx` currently). Helper `staffingOrderStatusLabel()`. Imports `staffing_order` label từ `glossary.ts`. |
| `RQ-05` | `src/domains/staffing/recruiter-assignment-ui.ts` (NEW) exports `RECRUITER_ASSIGNMENT_STATUS_LABELS` map cho 3 status `ACTIVE` / `REVOKED` / `SUPERSEDED` (theo EP §3.2.7) — mirror existing inline map in `recruiter-assignment-manager.tsx:326-330`. Helper `recruiterAssignmentStatusLabel()`. |
| `RQ-06` | `app/admin/jobs/page.tsx` (MODIFY): thay inline `STATUS_COLORS` + local `StatusBadge` raw enum render (L351 area) bằng `<StatusBadge module="project" status="..." tone="..." />` từ `src/shared/ui/status-badge/`. Vietnamese label từ `projectStatusLabel()` từ `project-ui.ts`. Canonical status enum giữ nguyên trong state. F11 business-button literal `Công bố dự án` / `Bỏ công bố dự án` giữ nguyên trên button JSX. |
| `RQ-07` | `app/admin/jobs/job-postings/page.tsx` (MODIFY): thay inline `colorMap` (DRAFT/PUBLISHED/ARCHIVED) + `StatusBadge` (raw enum) bằng `<StatusBadge module="job_posting" status="..." />` + `jobPostingStatusLabel()`. Filter `<option value={s}>` hiển thị Vietnamese label (`Bản nháp` / `Đã đăng` / `Đã lưu trữ`), `value` attribute giữ canonical enum. Header breadcrumb `JobPosting authoring &amp; publish` → `Tin tuyển dụng — soạn & đăng` (theo EP §3.5 #47) + `<h1>` same. H1 line: `Tin tuyển dụng — soạn & đăng`. Back link text: `← Quay lại Danh sách nhu cầu` (theo EP §3.5 #48). |
| `RQ-08` | `app/admin/jobs/job-postings/[id]/page.tsx` (MODIFY): thay mọi raw `DRAFT` / `PUBLISHED` / `ARCHIVED` render bằng `<StatusBadge module="job_posting" status="..." />` + `jobPostingStatusLabel()`. KHÔNG touch editor shell. Breadcrumb nếu có phải tiếng Việt theo EP §3.5 #46. |
| `RQ-09` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (NO-TOUCH): đã F11 §9 compliant từ Wave 1. Wave 2 KHÔNG sửa. Nếu phát hiện drift → STOP & handback. |
| `RQ-10` | `app/admin/job-openings/[id]/page.tsx` (MODIFY): mọi status enum render phải đi qua `<StatusBadge module="job_opening" status="..." />` + `jobOpeningStatusLabel()`. `serviceModel` enum phải đi qua `jobOpeningServiceModelLabel()`. H1 / breadcrumb / fields tiếng Việt theo EP §3.1 #5 + #11. |
| `RQ-11` | `app/admin/staffing/staffing-list-client.tsx` (MODIFY): thay inline `STATUS_CONFIG` (OPEN/CLOSING_SOON/CLOSED/CANCELLED) + local `StatusBadge` raw enum bằng `<StatusBadge module="staffing_order" status="..." />` + `staffingOrderStatusLabel()`. H1 `Staffing Orders` → `Nhu cầu tuyển dụng` (theo EP §3.1 #2/#3 + §3.5 binding). Filter button text `Tất cả` OK (đã VN). Empty state copy: kiểm tra. |
| `RQ-12` | `app/admin/staffing/page.tsx` (VERIFY ONLY): file server component ngắn (41 lines). Nếu H1 không có trong page.tsx, không cần sửa. Nếu có, áp dụng `Nhu cầu tuyển dụng`. |
| `RQ-13` | 4 NEW static test files (mỗi test file mirror pattern `admin-jobs-terminology.static.test.ts`):<br>(a) `app/admin/jobs/__tests__/jobs-terminology.static.test.ts` — assert L-010..L-018 (Project list)<br>(b) `app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts` — assert L-019..L-025 + L-026..L-035 (JobPosting list + detail; F11 fence còn nguyên)<br>(c) `app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts` — assert L-036..L-043 (JobOpening detail)<br>(d) `app/admin/staffing/__tests__/staffing-terminology.static.test.ts` — assert L-044..L-046 (Staffing list) + diacritic-missing forbidden literals `['Huy', 'Dang', 'tao']` (allowlist cho canonical) |
| `RQ-14` | Fence test `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (Wave 1) KHÔNG được sửa trong Wave 2 (F11 binding đã đúng từ Wave 1; chỉnh sửa là deviation). |
| `RQ-15` | 5 NEW dictionary test files:<br>(a) `src/domains/projects/__tests__/project-ui.test.ts`<br>(b) `src/domains/staffing/__tests__/job-opening-ui.test.ts`<br>(c) `src/domains/staffing/__tests__/job-posting-ui.test.ts`<br>(d) `src/domains/staffing/__tests__/staffing-order-ui.test.ts`<br>(e) `src/domains/staffing/__tests__/recruiter-assignment-ui.test.ts`<br>Mỗi test: assert ≥ 1 case PASS, dictionary exports typed map + helper, fallback KEEP_CANONICAL_IDENTIFIER. |
| `RQ-16` | KHÔNG raw enum render trên 4 surfaces: grep `<span>{...status}` (raw status literal) trong 4 route files. Nếu có → MUST route through dictionary + `<StatusBadge>`. |
| `RQ-17` | KHÔNG package.json / pnpm-lock.yaml delta. `git status --porcelain package.json pnpm-lock.yaml pnpm-workspace.yaml` = empty in commit scope. |
| `RQ-18` | `git diff --check` clean; UTF-8 no BOM; LF-only; no U+FFFD trên toàn changed surface. Run `.ai-pipeline/scripts/verify-encoding.ps1`. |
| `RQ-19` | Handback `READY_FOR_REVIEW` (Wave 2) với baseline `16df26ee`, implementation SHA, final HEAD, exact changed files, danh sách L-010..L-046 đã đóng, raw-English scan results, test counts, PR URL (if/when opened), CI state. |
| `RQ-20` | Application dictionary (`src/domains/applications/placement-ui.ts`) KHÔNG được touch trong Wave 2 (đã đúng từ trước; ref này để chắc chắn). Nếu phát hiện Application UI cần sửa → finding only, handback T0. |
| `RQ-21` | F11 fence + `Đăng tin` / `Gỡ tin` / `Lưu trữ` editor display + canonical `Publish` / `Unpublish` / `Archive` aria-label KHÔNG được phá vỡ. Mọi thay đổi phải giữ F11 binding. |
| `RQ-22` | Forward-only commit: 1 commit semantic trên `codex/t1b-admin-localization-wave2-recruitment` với message `docs(t1b-wave2): ...`. Cộng dồn 1 commit docs/evidence nếu cần (separate). KHÔNG push, KHÔNG open PR cho tới khi PR #96 merge + `git merge --no-ff origin/main` chạy xong. |

### 4.2 Scope boundaries

- **In:**
  - NEW: `src/domains/projects/project-ui.ts` + `__tests__/project-ui.test.ts`.
  - NEW: `src/domains/staffing/job-opening-ui.ts` + `__tests__/job-opening-ui.test.ts`.
  - NEW: `src/domains/staffing/job-posting-ui.ts` + `__tests__/job-posting-ui.test.ts`.
  - NEW: `src/domains/staffing/staffing-order-ui.ts` + `__tests__/staffing-order-ui.test.ts`.
  - NEW: `src/domains/staffing/recruiter-assignment-ui.ts` + `__tests__/recruiter-assignment-ui.test.ts`.
  - MODIFY: `app/admin/jobs/page.tsx` (L-010..L-018 — Project list; F11 fence unchanged).
  - MODIFY: `app/admin/jobs/job-postings/page.tsx` (L-019..L-025 + breadcrumb + H1).
  - MODIFY: `app/admin/jobs/job-postings/[id]/page.tsx` (L-026..L-035).
  - NO-TOUCH: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (F11 §9 binding đã đúng từ Wave 1).
  - MODIFY: `app/admin/job-openings/[id]/page.tsx` (L-036..L-043).
  - MODIFY: `app/admin/staffing/staffing-list-client.tsx` (L-044..L-046).
  - VERIFY-ONLY: `app/admin/staffing/page.tsx` (server component, 41 lines; chỉ fix nếu H1 có trong file).
  - NEW TEST: 4 per-route static tests (RQ-13).
  - NEW TEST: 5 dictionary tests (RQ-15).
  - NEW: `docs/tasks/hrp-admin-localization-wave2-recruitment/{TASK.md, HANDOFF.md, evidence/**}`.
- **Out:**
  - Applications UI (L-047 đã close từ Wave 1, `placement-ui.ts` KHÔNG touch).
  - Worker Portal `app/m/**`, public surface `app/(public)/**`, UI2 (`src/domains/job-board/public-content-controls/**`), F6.
  - `prisma/**`, `middleware.ts`, `.github/**`, `packages/**`.
  - Users / Workers / LaborProfiles / Clients / Vendors / Media / Settings (Wave 3).
  - Attendance / Reconciliation / Tickets / Payroll / Commission (Wave 4, T1C-owned).
  - F11 business-button literals trên Project-level (giữ nguyên).
  - Editor shell `editor-shell.tsx` (F11 §9 đã đúng từ Wave 1).
  - `<StatusBadge>` primitive signature (giữ nguyên Wave 1 shape).
  - Cross-module glossary (`src/shared/i18n/glossary.ts`) — Wave 1 đã đầy đủ.
  - Dependency mới / lockfile delta.
  - Canonical enum / API / lifecycle / RLS / role matrix / schema / migration / idempotency.
  - Fence test `admin-jobs-terminology.static.test.ts` (giữ nguyên Wave 1 version).
  - `recruiter-assignment-manager.tsx` (đã VN từ Wave 1 closeout; dictionary tạo forward-only nhưng file route KHÔNG sửa).
- **Allowed task artifacts:** `docs/tasks/hrp-admin-localization-wave2-recruitment/**`.

### 4.3 Domain boundaries

- **Data/state:** `N/A` — Wave 2 chỉ typed dictionary + UI label rewrite; không touch data layer / Prisma / schema / RLS / role matrix.
- **Permission/security:** `N/A` — không đổi role check / page guard / mutation authority. Dictionary lookup là pure function.
- **Interface/API:** `N/A` — không đổi API route, không đổi component public signature ngoài consumer. `<StatusBadge>` signature giữ nguyên.
- **Migration/rollback:** `N/A` — không có migration. Rollback = revert PR (forward-only commit + git revert).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | 5 NEW dictionaries + 5 NEW dictionary tests | RQ-01..RQ-05, RQ-15 | `npm run typecheck`, `npm run test:unit src/domains/projects/__tests__/project-ui.test.ts src/domains/staffing/__tests__/job-opening-ui.test.ts src/domains/staffing/__tests__/job-posting-ui.test.ts src/domains/staffing/__tests__/staffing-order-ui.test.ts src/domains/staffing/__tests__/recruiter-assignment-ui.test.ts` | Nếu dictionary bleed sang domain khác — STOP & handback |
| `STEP-02` | `app/admin/jobs/page.tsx` (MODIFY) | RQ-06 — replace inline `STATUS_COLORS` + local `StatusBadge` raw enum with `<StatusBadge module="project" />` + `projectStatusLabel()`. F11 business-button literal giữ nguyên. | `npm run typecheck`, `npm run lint`, `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (must remain PASS) | Nếu F11 fence break → STOP & fix; nếu `Published`/`Unpublished`/`Closed` raw còn → chưa xong |
| `STEP-03` | `app/admin/jobs/job-postings/page.tsx` (MODIFY) | RQ-07 — replace inline `colorMap` + `StatusBadge` raw enum; H1 + breadcrumb + back link tiếng Việt. | `npm run typecheck`, `npm run lint`, `npm run test:unit` | Nếu F11 fence break → STOP; nếu `<option value>` không phải canonical enum → chưa xong |
| `STEP-04` | `app/admin/jobs/job-postings/[id]/page.tsx` (MODIFY) | RQ-08 — replace raw enum status rendering với `<StatusBadge module="job_posting" />` + `jobPostingStatusLabel()`. | `npm run typecheck`, `npm run lint`, `npm run test:unit` | Nếu raw `DRAFT` / `PUBLISHED` / `ARCHIVED` còn xuất hiện như text → STOP |
| `STEP-05` | NO-TOUCH verify `editor-shell.tsx` | RQ-09, RQ-21 — verify F11 §9 binding còn nguyên từ Wave 1. KHÔNG sửa. | `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (PASS) | Nếu drift → STOP & handback (chỉnh sửa là deviation) |
| `STEP-06` | `app/admin/job-openings/[id]/page.tsx` (MODIFY) | RQ-10 — replace raw status + serviceModel enum với `<StatusBadge module="job_opening" />` + `jobOpeningStatusLabel()` + `jobOpeningServiceModelLabel()`. | `npm run typecheck`, `npm run lint`, `npm run test:unit` | Nếu `serviceModel` còn raw `onsite` / `remote` → chưa xong |
| `STEP-07` | `app/admin/staffing/staffing-list-client.tsx` (MODIFY) | RQ-11 — replace inline `STATUS_CONFIG` (OPEN/CLOSING_SOON/CLOSED/CANCELLED) + H1 raw `Staffing Orders`. | `npm run typecheck`, `npm run lint`, `npm run test:unit` | Nếu raw `Staffing Orders` text còn → chưa xong |
| `STEP-08` | `app/admin/staffing/page.tsx` (VERIFY ONLY) | RQ-12 — verify H1 inheritance. Nếu H1 có trong file, fix sang `Nhu cầu tuyển dụng`. | `npm run test:unit` | Nếu page.tsx cần thay → STEP-08 chỉ thay H1; nếu phức tạp hơn → handback |
| `STEP-09` | 4 NEW static tests | RQ-13 — per-route forbidden-English scan + Vietnamese label present + F11 fence còn nguyên + LF-only + no BOM. | `npm run test:unit app/admin/jobs/__tests__/jobs-terminology.static.test.ts app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts app/admin/staffing/__tests__/staffing-terminology.static.test.ts` | Nếu raw English còn tồn tại trong route → quay lại STEP tương ứng, KHÔNG qua bước này |
| `STEP-10` | Verify gates (whole repo) | RQ-17, RQ-18 — `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `.ai-pipeline/scripts/verify-encoding.ps1`. | All PASS | Nếu fail → STOP & debug trong STEP tương ứng |
| `STEP-11` | Commit implementation | RQ-22 — forward-only commit trên `codex/t1b-admin-localization-wave2-recruitment`. Message `docs(t1b-wave2): <semantic summary>`. KHÔNG push. | `git status` clean (except untracked); `git log -1` = implementation SHA | Nếu có file ngoài allowlist → STOP & unstage |
| `STEP-12` | HANDOFF + verify scripts | RQ-19 — `docs/tasks/hrp-admin-localization-wave2-recruitment/HANDOFF.md`; chạy `verify-task.ps1` + `verify-handoff.ps1`. | Both PASS | Nếu fail → fix HANDOFF, không sửa source ngoài allowed surface |
| `STEP-13` | STOP — chờ PR #96 merge + latest-main reconciliation | The user directive explicitly forbids pushing/merging/deploying before PR #96 merges. Wave 2 dừng tại đây với HANDOFF `READY_FOR_REVIEW`. | n/a | n/a |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `src/domains/projects/project-ui.ts` exists, exports typed `PROJECT_STATUS_LABELS` map (5+3 entries theo EP §3.2.1) + `projectStatusLabel()` helper + `projectStatusTone()` helper (nếu có). | `npm run test:unit src/domains/projects/__tests__/project-ui.test.ts` |
| `AC-02` | `src/domains/staffing/job-opening-ui.ts` exists, exports typed `JOB_OPENING_STATUS_LABELS` map (6 entries theo EP §3.2.2) + `JOB_OPENING_SERVICE_MODEL_LABELS` map (2 entries theo EP §3.2.11) + helpers. | `npm run test:unit src/domains/staffing/__tests__/job-opening-ui.test.ts` |
| `AC-03` | `src/domains/staffing/job-posting-ui.ts` exists, exports typed `JOB_POSTING_STATUS_LABELS` map (3 entries theo EP §3.2.3) + `jobPostingStatusLabel()` helper. Re-imports `actionLabel()` từ `src/shared/i18n/action-dictionary.ts` cho `Đăng tin` / `Gỡ tin` / `Lưu trữ`. KHÔNG redefine. | `npm run test:unit src/domains/staffing/__tests__/job-posting-ui.test.ts` |
| `AC-04` | `src/domains/staffing/staffing-order-ui.ts` exists, exports typed `STAFFING_ORDER_STATUS_LABELS` map (4 entries) + `staffingOrderStatusLabel()` helper. | `npm run test:unit src/domains/staffing/__tests__/staffing-order-ui.test.ts` |
| `AC-05` | `src/domains/staffing/recruiter-assignment-ui.ts` exists, exports typed `RECRUITER_ASSIGNMENT_STATUS_LABELS` map (3 entries theo EP §3.2.7) + helper. | `npm run test:unit src/domains/staffing/__tests__/recruiter-assignment-ui.test.ts` |
| `AC-06` | `app/admin/jobs/page.tsx` không còn inline `STATUS_COLORS` (raw enum `Published`/`Unpublished`/`Closed`); KHÔNG còn `<span>{status}` (raw literal) trong body ngoài `<StatusBadge>`. F11 business-button literal `Công bố dự án` / `Bỏ công bố dự án` CÒN NGUYÊN. | `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` + new `jobs-terminology.static.test.ts` PASS |
| `AC-07` | `app/admin/jobs/job-postings/page.tsx` không còn inline `colorMap` (DRAFT/PUBLISHED/ARCHIVED) raw; KHÔNG còn `<option>{s}</option>` raw enum. H1 = `Tin tuyển dụng — soạn & đăng`. Breadcrumb = `Tin tuyển dụng — soạn & đăng`. Back link = `← Quay lại Danh sách nhu cầu`. | `npm run test:unit app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts` |
| `AC-08` | `app/admin/jobs/job-postings/[id]/page.tsx` không còn raw `DRAFT` / `PUBLISHED` / `ARCHIVED` text rendered as text node; status qua `<StatusBadge module="job_posting" />`. | `npm run test:unit` (full unit lane) |
| `AC-09` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` F11 §9 binding còn nguyên: 3 ActionButton `label="Đăng tin"/"Gỡ tin"/"Lưu trữ"` + `ariaLabel="Publish"/"Unpublish"/"Archive"`. KHÔNG bị touch trong Wave 2. | `npm run test:unit app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (PASS) |
| `AC-10` | `app/admin/job-openings/[id]/page.tsx` không còn raw `DRAFT` / `OPEN` / `CLOSING_SOON` / `CLOSED` / `FILLED` / `CANCELLED` text rendered; status qua `<StatusBadge module="job_opening" />`. `serviceModel` raw `onsite` / `remote` KHÔNG còn text rendered; qua `jobOpeningServiceModelLabel()`. | `npm run test:unit app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts` |
| `AC-11` | `app/admin/staffing/staffing-list-client.tsx` không còn inline `STATUS_CONFIG` (OPEN/CLOSING_SOON/CLOSED/CANCELLED) raw; H1 = `Nhu cầu tuyển dụng` (KHÔNG còn `Staffing Orders`). | `npm run test:unit app/admin/staffing/__tests__/staffing-terminology.static.test.ts` |
| `AC-12` | `app/admin/staffing/page.tsx` không có raw `Staffing` H1 nếu có. (Server component ngắn — verify; chỉ fix khi thấy.) | manual verify + test |
| `AC-13` | 4 NEW per-route static tests PASS. | `npm run test:unit -- app/admin/jobs/__tests__/jobs-terminology.static.test.ts app/admin/jobs/job-postings/__tests__/job-postings-terminology.static.test.ts app/admin/job-openings/__tests__/job-openings-terminology.static.test.ts app/admin/staffing/__tests__/staffing-terminology.static.test.ts` |
| `AC-14` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` KHÔNG bị sửa. F11 fence assertions còn nguyên. | `git diff --stat HEAD~1..HEAD -- app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (must equal 0 lines); `git log -1 --name-only` không liệt kê file đó; manual verify test PASS |
| `AC-15` | 5 NEW dictionary tests PASS. | `npm run test:unit -- src/domains/projects/__tests__/project-ui.test.ts src/domains/staffing/__tests__/job-opening-ui.test.ts src/domains/staffing/__tests__/job-posting-ui.test.ts src/domains/staffing/__tests__/staffing-order-ui.test.ts src/domains/staffing/__tests__/recruiter-assignment-ui.test.ts` (exit 0) |
| `AC-16` | `npm run typecheck` PASS. | `npm run typecheck` (full repo) |
| `AC-17` | `npm run lint` PASS. | `npm run lint` (full repo) |
| `AC-18` | `npm run test:unit` PASS trên full unit lane. | `npm run test:unit` |
| `AC-19` | `npm run build` PASS. | `npm run build` |
| `AC-20` | `git diff --check HEAD` exit zero (post-commit). | `git diff --check HEAD` |
| `AC-21` | UTF-8 no BOM trên toàn changed surface. | `.ai-pipeline/scripts/verify-encoding.ps1` PASS |
| `AC-22` | KHÔNG có package.json / pnpm-lock.yaml / pnpm-workspace.yaml delta. | `git status --porcelain package.json pnpm-lock.yaml pnpm-workspace.yaml` = empty |
| `AC-23` | KHÔNG có file ngoài allowlist touched. | `git status --porcelain` toàn bộ file ngoài `In-scope roots` §0 = untracked / không stage. Đặc biệt: `prisma/**`, `middleware.ts`, `.github/**`, `packages/**` KHÔNG có diff. |
| `AC-24` | Handback `READY_FOR_REVIEW` với baseline `16df26ee`, implementation SHA, final HEAD, exact changed files, L-010..L-046 closed list, raw-English scan, test counts, PR URL (when opened), CI state. | `verify-handoff.ps1` + manual HANDOFF.md |
| `AC-25` | Cross-module glossary import check: 5 dictionaries import từ `src/shared/i18n/glossary.ts` (nếu cần) + `src/shared/i18n/action-dictionary.ts` (cho job-posting-ui). KHÔNG re-define cross-module terms. | `rg "label:" src/domains/projects/project-ui.ts src/domains/staffing/job-opening-ui.ts src/domains/staffing/job-posting-ui.ts src/domains/staffing/staffing-order-ui.ts src/domains/staffing/recruiter-assignment-ui.ts` không trùng `Dự án`, `Nhu cầu tuyển dụng`, `Tin tuyển dụng`, `Đợt tuyển dụng`, `Vị trí cần tuyển`, `Đăng tin`, `Gỡ tin`, `Lưu trữ` |
| `AC-26` | Raw English scan: `<option>{statusEnum}</option>` raw form KHÔNG còn trên 4 route files. `<span>{status}</span>` raw (without `<StatusBadge>`) KHÔNG còn trên 4 route files. | `rg "<span>\{(\w*[Ss]tatus\w*)\}</span>" app/admin/jobs/page.tsx app/admin/jobs/job-postings/page.tsx "app/admin/jobs/job-postings/[id]/page.tsx" "app/admin/job-openings/[id]/page.tsx" app/admin/staffing/staffing-list-client.tsx` (negative) |
| `AC-27` | L-010..L-046 closed list documented in HANDOFF. | HANDOFF.md §"L-010..L-046 closed list" |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` (a) | `AC-01` |
| `RQ-02` | `STEP-01` (b) | `AC-02` |
| `RQ-03` | `STEP-01` (c) | `AC-03` |
| `RQ-04` | `STEP-01` (d) | `AC-04` |
| `RQ-05` | `STEP-01` (e) | `AC-05` |
| `RQ-06` | `STEP-02` | `AC-06` |
| `RQ-07` | `STEP-03` | `AC-07` |
| `RQ-08` | `STEP-04` | `AC-08` |
| `RQ-09` | `STEP-05` (no-touch verify) | `AC-09` |
| `RQ-10` | `STEP-06` | `AC-10` |
| `RQ-11` | `STEP-07` | `AC-11` |
| `RQ-12` | `STEP-08` | `AC-12` |
| `RQ-13` | `STEP-09` | `AC-13` |
| `RQ-14` | `STEP-09` (verify fence unchanged) | `AC-14` |
| `RQ-20` | `STEP-09`, `STEP-10` | `AC-23` |
| `RQ-15` | `STEP-01` (a-e) | `AC-15` (= AC-01..AC-05) |
| `RQ-16` | `STEP-02`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06`, `STEP-07`, `STEP-10` | `AC-26` |
| `RQ-17` | `STEP-10` | `AC-22` |
| `RQ-18` | `STEP-10` | `AC-20`, `AC-21` |
| `RQ-19` | `STEP-12` | `AC-24` |
| `RQ-20` | `STEP-09`, `STEP-10` | `AC-23` |
| `RQ-21` | `STEP-05` | `AC-09` |
| `RQ-22` | `STEP-11` | `AC-23`, `AC-24` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `app/admin/jobs/page.tsx` L-351 hiện có raw `job.isPublic ? 'Published' : job.status === 'CLOSED' ? 'Closed' : 'Unpublished'` — đây là column-derived 3-status, không nằm trong Project status enum. Nếu rewrite ngây thơ, có thể bỏ sót edge case. | Dictionary mở rộng 3 column-derived label: `Đã công bố` / `Chưa công bố` / `Đã đóng` (theo EP §3.2.1 + "column-derived" note). Thay raw ternary bằng `projectPublishLabel(isPublic, status)`. Verify với các edge case `isPublic=true / status=CLOSED`. |
| `RISK-02` | `app/admin/jobs/job-postings/[id]/page.tsx` có thể reference raw `DRAFT` / `PUBLISHED` / `ARCHIVED` trong nhiều nơi (status banner, status sidebar, history list, action result). | Đọc toàn bộ file trước, list mọi site render raw status. Từng site một chuyển sang `<StatusBadge>`. Nếu site nào render ngữ cảnh đặc biệt (vd "Status banner: DRAFT — revision v3") → cân nhắc giữ phần context, chỉ wrap status word trong `<StatusBadge>`. |
| `RISK-03` | `app/admin/job-openings/[id]/page.tsx` là file lớn (theo EV-13 chưa đọc round này). Có thể có nhiều state derived + business logic. | Touch chỉ phần label render. KHÔNG đổi logic. Nếu phát hiện cần đổi logic → STOP & handback. |
| `RISK-04` | `app/admin/staffing/staffing-list-client.tsx` H1 `Staffing Orders` + table header `Mã` / `Tiêu đề` / `Dự án` / `Slots` / `Trạng thái` / `Ngày tạo` — table headers hiện dùng raw literal. | Wave 2 chỉ thay H1 + status badge. Table headers `Mã` / `Tiêu đề` / `Dự án` / `Slots` / `Trạng thái` / `Ngày tạo` hiện đã Vietnamese (verify lại trong file). Nếu `Slots` raw → thay `Vị trí cần tuyển` (theo EP §3.1 #4) — nhưng EP §3.5 không có row "Slots" → dùng `Vị trí cần tuyển` (Slot) glossary. |
| `RISK-05` | `app/admin/staffing/page.tsx` (server component 41 lines) — verify H1 inheritance. Nếu H1 có trong file, fix. Nếu H1 thuộc client → STEP-07 đã cover. | Verify bằng `rg "Staffing\|<h1>" app/admin/staffing/page.tsx`. |
| `RISK-06` | `recruiter-assignment-manager.tsx` (file đã VN từ Wave 1 closeout) có inline `STATUS_CONFIG` (ACTIVE/REVOKED/SUPERSEDED) ở L326-330. Wave 2 dictionary tạo forward-only nhưng file KHÔNG sửa → dictionary sẽ không có consumer trong Wave 2. | Document trong HANDOFF §"Why recruiter-assignment-ui dictionary has no Wave 2 consumer". Wave 3 (theo EP §5.3) sẽ adopt khi cần. Forward-only dictionary = useful future asset, không phải dead code (lifecycle: dictionary trước, consumer sau). |
| `RISK-07` | `recruiter-assignment-ui.ts` dictionary file mới — có thể dính `recruiter-assignment-manager.tsx` import lại → risk file ngoài allowlist. | KHÔNG thay đổi `recruiter-assignment-manager.tsx`. Dictionary tạo forward-only. Test file `recruiter-assignment-ui.test.ts` import trực tiếp dictionary. KHÔNG touch file ngoài allowlist. |
| `RISK-08` | Fence test `admin-jobs-terminology.static.test.ts` (Wave 1) có assertion rằng JobPosting editor shell `<option>` rendering `DRAFT/PUBLISHED/ARCHIVED` raw. Wave 2 KHÔNG sửa fence này; nếu JobPosting list page (`job-postings/page.tsx`) hiện có `<option>{s}</option>` raw (EV-11), fence KHÔNG cover nó (fence chỉ cover editor shell). | Tạo fence riêng cho `job-postings/page.tsx` (NEW `job-postings-terminology.static.test.ts`) — assert `<option>` text Vietnamese. Fence cũ (Wave 1) giữ nguyên. |
| `RISK-09` | `editor-shell.tsx` đã F11 §9 compliant từ Wave 1. Wave 2 KHÔNG touch. Nếu phát hiện drift, STOP. | STEP-05 verify-only. Nếu drift phát hiện → handback T0. |
| `RISK-10` | `prisma/**` / `middleware.ts` / `.github/**` / `packages/**` KHÔNG được touch. Nếu vô tình (vd edit `app/admin/staffing/page.tsx` import path từ `prisma/...`) → STOP. | `git status --porcelain` verify trước commit. Nếu có → unstage. |
| `RISK-11` | Một số route có thể share `STATUS_CONFIG` giữa nhiều file (vd `recruiter-assignment-manager.tsx` + `staffing-list-client.tsx`). Nếu dictionary mới trùng key với inline config → sửa inline config thành dictionary reference. | Mỗi route file sửa một, verify sau mỗi route. KHÔNG sửa nhiều route cùng lúc. |
| `RISK-12` | Forbidden-English scan có thể miss raw English chèn trong template literal (vd `<span>{`Status: ${status}`}</span>`) — không phải `<span>{status}</span>` nhưng vẫn raw. | Manual review từng file sau STEP-02..STEP-07. AC-26 chỉ catch dạng đơn giản. |
| `RISK-13` | 5 NEW dictionary files có thể tạo naming conflict với existing files trong `src/domains/`. | Verify `cmd /c dir /B src/domains/staffing` trước khi tạo. 4 file name đã được list rõ trong RQ-02..RQ-05 — nếu trùng → STOP. |

## 8. Open Questions

- None. All 27 binding decisions in EP §3.1 / §3.2 / §3.3 / §3.4 / §3.5 are `CLOSED` (T0 §2 applied). Wave 2 inherits all bindings from EP §5.2.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-04` | Initial contract | Initial (baseline `16df26ee` post-Wave 1 freeze; directive Phần B §4 binds Wave 2 ownership + scope) |
