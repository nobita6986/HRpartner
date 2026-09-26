# TASK — `hrp-p1-e1-recruiter-workbench-ui`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-e1-recruiter-workbench-ui` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Audit reason | UI tiêu thụ read service PII/RLS; audit nhẹ để verify no business authority ở client, no-leak trên form/filter state, accessibility/empty/error states và dependency ngược đúng vào E0 frozen. CRITICAL đã được áp cho E0; E1 là consumer nên STANDARD + LIGHT đủ. |
| Spec version | `v1.3` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `224a4d9f4db4275d35eda10e0dd5a2957d8fe33c` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `NOT_REQUIRED` |
| Correction budget | `1` |
| In-scope roots | `app/admin/recruiter-workbench/page.tsx`, `app/admin/recruiter-workbench/loading.tsx`, `app/admin/recruiter-workbench/error.tsx`, `app/admin/recruiter-workbench/_components/**`, colocated tests under `app/admin/recruiter-workbench/**` |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`, `package-lock.json`, `vitest.config.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.integration-files.ts` (E1 does NOT add DB tests; only consumes existing tests/registry), `docs/PLANNER_HANDOVER.md`, `src/domains/talent/recruiter-workbench.read-service.ts`, `src/domains/talent/recruiter-workbench.types.ts`, `app/api/admin/recruiter-workbench/route.ts`, `src/domains/applications/conversion.service.ts`, `src/domains/applications/screening.service.ts`, `src/domains/talent/placement-case.service.ts`, `src/domains/talent/labor-profile.service.ts`, `src/domains/talent/labor-profile.read-service.ts`, `src/shared/auth/*`, `src/shared/privacy/*`, `src/shared/ui/data-table/data-table.tsx`, `src/shared/ui/data-table/use-table-url-state.ts`, `src/shared/ui/data-display/empty-state.tsx` (shared wrappers — only import, no modify), `docs/discovery/realignment/P1B_PUBLIC_APPLY_RECONCILIATION.md`, `docs/tasks/hrp-p1-b-public-apply/**`, `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**`, `app/admin/**/_components` outside this folder, sidebar/navigation/menu files, `docs/N8N_AUTOMATION_BOUNDARY.md` (read-only reference; n8n is N/A for E1) |
| Required gates | `.ai-pipeline/scripts/verify-task.ps1`, `.ai-pipeline/scripts/verify-handoff.ps1`, `.ai-pipeline/scripts/verify-encoding.ps1`, `git diff --check`, `git status --porcelain`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit` (fail-closed DB lane; E1 tests are pure unit/component with mocked E0 service) |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `TIER1_IMPLEMENTATION_FREEZE` |

> Lane và audit là hai quyết định riêng. STANDARD + LIGHT vì E1 là consumer read-only của E0 (đã CRITICAL); UI không tự ý tạo business authority.

> **v1.3 — materialize from `51d152d` + E0 ACCEPTED → E1 READY_FOR_EXECUTION**: Gỡ gate `WAIT_P1_E0_INTERFACE_FREEZE`. E0 đã freeze + ACCEPTED + production-merged tại main `c647fc6a` (PR #54); P1-E1 có thể tiêu thụ DTO + helpers từ `src/domains/talent/recruiter-workbench.types.ts` và `recruiter-workbench.read-service.ts` (pure helpers: `deriveNextAction`, `deriveHandler`, `deriveLastInteraction`, `computeAge`). Baseline → `224a4d9f` (post-E0 production closeout). Status `PROPOSED_ONLY` → `READY_FOR_EXECUTION`; Contract gate `DRAFT` → `READY_TO_CODE`; Decision state `OPEN` → `CLOSED`. n8n = `N/A` (E1 là UI read-only thuần HRP runtime — không phụ thuộc n8n availability; xem `docs/N8N_AUTOMATION_BOUNDARY.md`). E1 không tạo DB integration test; verify-unit lane đã có fail-closed DB safety. Open questions = None. Implementation worktree: `codex/t1a-p1e1-recruiter-workbench-ui` (mới, từ `224a4d9f`). Forbidden paths bổ sung: `vitest*.config.ts`, `vitest.integration-files.ts`, shared `DataTable`/`useTableUrlState`/`EmptyState` (chỉ import), `app/admin/**` ngoài folder E1, sidebar/navigation/menu. Required gates bổ sung `verify-handoff.ps1`, `verify-encoding.ps1`, `npm run build`, `npm run test:unit`. Status `READY_FOR_EXECUTION` không đổi; Next gate `TIER1_IMPLEMENTATION_FREEZE`.

## 1. Outcome

### 1.1 User-visible outcome

- Trang `/admin/recruiter-workbench` hiển thị một bảng/list recruiter workbench với filter/sort/page URL-sync, tiêu thụ `GET /api/admin/recruiter-workbench` từ E0.
- Mỗi row có: candidate (fullName + phone/cccdNumber mask theo `CAN_VIEW_WORKER_SENSITIVE`), case status badge, job title, last interaction timestamp, nextAction label (server-derived 7 enum đóng — KHÔNG có `CONTACT_CANDIDATE`; E1 chỉ render), handler chip, age/overdue chip, nút mở detail (canonical route `/admin/labor-profiles/&#x3C;laborProfileId&#x3E;` — KHÔNG kèm `?case=&#x3C;caseId&#x3E;` vì `app/admin/labor-profiles/[id]/page.tsx` hiện chỉ nhận `params`, không đọc `searchParams`), nút mở submission list `/admin/applications` nếu case có submission (cũng KHÔNG kèm query).
- Trạng thái UI đầy đủ: loading, empty, error, unauthorized (403), validation-error (khi URL query explicit invalid), forbidden field mask.
- Responsive (mobile/tablet/desktop), keyboard navigation cơ bản, `aria-*` cho badge/chip.
- **Không** full V8.1 Kanban. **Không** animation/beauty trước usability.
- UI chạy trong single-tenant HRP — không có Org context, không có Org-boundary claim.

### 1.2 Non-goals

- Không Kanban / drag-drop.
- Không mutation: không POST/PATCH/DELETE từ UI; tất cả action là link canonical.
- Không suy diễn `nextAction` ở client; render đúng label/icon từ server enum.
- Không gửi hidden/internal field lên server (form state chỉ chứa field user đã thấy trong UI).
- Không thêm dependency mới (TanStack Table, shadcn/Radix, `useTableUrlState`, `EmptyState` đã có).
- Không đụng E0 read service / route handler — chỉ consume qua HTTP contract đã freeze.
- Không đụng P1-B, AFF migrations, P1-A0/A1 frozen files, `docs/PLANNER_HANDOVER.md`.
- Không `contentEditable` / rich-text editor.
- Không thông báo n8n; nếu cần reminder sẽ là task riêng.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/shared/ui/data-table/data-table.tsx` | TanStack Table wrapper đã có URL-sync, search, faceted filters, pagination, empty state. |
| `EV-02` | `src/shared/ui/data-table/use-table-url-state.ts:58` (`useTableUrlState`) | URL state helper để đồng bộ filter/sort/page. |
| `EV-03` | `src/shared/ui/data-display/empty-state.tsx` | Empty state chuẩn hóa. |
| `EV-04` | `app/admin/labor-profiles/page.tsx` | Pattern page admin hiện hữu (RBAC check, search params, fetch). |
| `EV-05` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` | Endpoint contract mà E1 sẽ consume (DTO + query string). |
| `EV-06` | `src/shared/auth/auth-context.ts` (`AuthContext` = `userId`, `role`, `vendorId?`, `workerId?`) | Cách lấy role/userId ở server component. Single-tenant — KHÔNG có `organizationId/orgId`. |
| `EV-07` | `docs/N8N_AUTOMATION_BOUNDARY.md` | Tách biên n8n — UI chỉ gọi HRP runtime. |
| `EV-08` | `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` §4 | Outcome tối thiểu và khóa kỹ thuật đã chốt. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Trang là **server component** fetch thẳng `GET /api/admin/recruiter-workbench` (hoặc gọi internal service khi cùng `tx`/RLS context). Ưu tiên internal service để tránh HTTP round-trip + tái sử dụng RLS context. | `CHOSEN` |
| `DEC-02` | Client component con chỉ dùng cho: filter chip tương tác, sort dropdown, pagination controls (sử dụng `useTableUrlState`). | `CHOSEN` |
| `DEC-03` | `nextAction` render label/icon từ một map enum→UI, **không** tính lại từ row fields. Map này là pure UI helper, đặt trong `_components/NextActionBadge.tsx`. | `CHOSEN` |
| `DEC-04` | `primaryActions` chỉ render `&#x3C;Link&#x3E;` tới canonical route; **không** gọi mutation API. | `CHOSEN` |
| `DEC-05` | Filter mặc định (khi URL params omitted): `view=ALL` cho ADMIN/HR_MANAGER; `view=MINE` cho HR_STAFF. `sort=ageDesc`. `pageSize=20`. Khi user đổi URL thì tuân theo role × view matrix trong E0 DEC-06 — URL không vượt authority (HR_STAFF đổi sang `view=ALL` → server trả 403, page render validation/error state). **KHÔNG** có Org-boundary claim ở E1. | `CHOSEN` |
| `DEC-06` | PII masking hoàn toàn từ server; client **không** mask lại. Nếu server trả raw (user có `CAN_VIEW_WORKER_SENSITIVE`), UI render raw. | `CHOSEN` |
| `DEC-07` | Không cache client-side (React Query/SWR) — Tier 1 không thêm dependency. URL state đủ để refetch khi user đổi filter. | `CHOSEN` |
| `DEC-08` | E1 đọc DTO từ `recruiter-workbench.types.ts` (E0 expose), không tự định nghĩa shape trùng lặp. | `CHOSEN` |
| `DEC-09` | UI phải accessible: `aria-label` cho icon-only button, focus ring rõ, table header có `scope="col"`, badge có text + màu (không chỉ màu). | `CHOSEN` |
| `DEC-10` | E1 không gọi bất kỳ mutation nào của P1-F; nếu user click "Review Placement" thì chỉ mở detail page, không mở transition. | `CHOSEN` |

Không để token quyết-định-đang-chờ bất kỳ khi chuyển `READY_FOR_EXECUTION` (v1.3 đã CLOSED toàn bộ Owner decision ở §3, RECON §3).

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Table component | `DataTable` tại `src/shared/ui/data-table/data-table.tsx` | `ADOPT` | `N/A` (internal) | `src/shared/ui/data-table/data-table.tsx` | wrapper boundary = `DataTable` component import | TanStack Table đã wire sẵn, URL-sync, faceted filter, pagination. |
| URL state hook | `useTableUrlState` tại `src/shared/ui/data-table/use-table-url-state.ts:58` | `ADOPT` | `N/A` (internal) | `src/shared/ui/data-table/use-table-url-state.ts` | wrapper boundary = hook call trong client component | Đồng bộ filter/sort/page với URL. |
| Empty state | `EmptyState` tại `src/shared/ui/data-display/empty-state.tsx` | `ADOPT` | `N/A` (internal) | `src/shared/ui/data-display/empty-state.tsx` | wrapper boundary = component import | Pattern chuẩn hóa. |
| Badge / chip | shadcn/Radix primitives đã cài (`Badge`) | `ADOPT` | `MIT` | xem `package.json` | wrapper boundary = `_components/*.tsx` | Đã có sẵn. |
| Date formatting | `Intl.DateTimeFormat` chuẩn (browser/Node) | `ADOPT` | `N/A` | ECMAScript chuẩn | wrapper boundary = `_components/AgeCell.tsx` (formatting helper) | Không cần thêm thư viện date. |
| Icon set | đã cài (xem các page admin hiện hữu) | `ADOPT` | xem `package.json` | đã pin | wrapper boundary = `_components/*.tsx` | Tái sử dụng icon hiện có. |
| Drag-drop / Kanban | — | `N/A` | — | — | — | E1 không Kanban. |
| Form framework | — | `N/A` | — | — | — | E1 không có form mutation. |
| Client query cache (React Query/SWR) | — | `N/A` | — | — | — | URL state đủ; không thêm dependency. |

- `ADOPT`: đã pin source path; shadcn/Radix/TanStack đã pin trong `package.json` (Tier 1 không thêm dependency).
- `CUSTOM`: không có (xem `CUSTOM_BUILD_JUSTIFICATION` — không cần).
- `N/A`: chỉ áp dụng cho capability không liên quan (Kanban/form/cache).

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Page render | Next.js server component | `N/A` | — | — | — | — | Không workflow. |
| Filter/sort/page | URL state (`useTableUrlState`) | `N/A` | — | — | — | — | Không workflow. |
| Notification/reminder cho case quá hạn | n8n (outbox → workflow) | `N/A` (E1) | — | — | — | — | **Nằm ngoài E1**. Task riêng, không dùng tên P1-D. |
| Background revalidation | — | `N/A` | — | — | — | — | E1 không cache; refetch qua URL state. |

- `ORCHESTRATE`: không có.
- `CUSTOM`: không có (xem `CUSTOM_AUTOMATION_JUSTIFICATION`).
- `N/A`: ghi lý do task không tạo/thay connector, scheduler, notification worker hoặc multi-system/operator workflow.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Trang `/admin/recruiter-workbench` là server component, fetch DTO qua `getRecruiterWorkbenchList` (E0) trong cùng `tx`/RLS context. URL search params parse bằng zod schema của E0. |
| `RQ-02` | Bảng hiển thị các cột: candidate (fullName + masked phone/cccdNumber — render raw hoặc mask tùy server trả), case status badge, job title, last interaction (relative time), nextAction badge (render từ server enum 7 giá trị), handler chip, age/overdue chip, primary actions (detail link + submission link nếu có). |
| `RQ-03` | Filter chips: `caseStatus` (multi-select), `view` (`MINE \| ALL \| UNASSIGNED`), `overdue` (toggle), `search` (fullName — KHÔNG search phone/CCCD ở UI vì E0 đã gate theo permission; nếu user thiếu `CAN_VIEW_WORKER_SENSITIVE` thì search phone/CCCD sẽ bị server từ chối). Mỗi chip wrap trong `&#x3C;Link&#x3E;` thay đổi URL state. |
| `RQ-04` | Sort dropdown: `ageDesc \| ageAsc \| openedDesc \| openedAsc`. Default `ageDesc`. |
| `RQ-05` | Pagination controls: page number + page size options `[20, 50, 100]`. Default `pageSize=20`. |
| `RQ-06` | Empty state: khi `items.length === 0`, hiển thị `&#x3C;EmptyState&#x3E;` với message phù hợp filter hiện tại. |
| `RQ-07` | Loading state: dùng skeleton row (`&#x3C;tr&#x3E;` placeholder) khi `searchParams` thay đổi mà fetch chưa xong (Next.js sẽ tự show loading.tsx nếu có; E1 có thể thêm `_loading.tsx`). |
| `RQ-08` | Error state: bắt error từ fetch, hiển thị error banner với nút Retry (revalidate qua `router.refresh()`). |
| `RQ-09` | Unauthorized state: nếu service throw `PERMISSION_DENIED`, page render `&#x3C;EmptyState variant="forbidden"&#x3E;` (không phải 500). |
| `RQ-10` | `NextActionBadge` render label/icon từ map enum→UI (chính xác 7 giá trị: `OPEN_INTAKE \| REQUEST_DOCS \| SCREEN_SUBMISSION \| SCHEDULE_SCREEN \| AWAITING_RESULT \| REVIEW_PLACEMENT \| NONE`); **không** tính lại từ row fields. Map nằm trong `_components/NextActionBadge.tsx`. |
| `RQ-11` | `AgeCell` hiển thị `ageHours` (server trả) là "Xh" hoặc "Xd" nếu ≥ 24h; chip đỏ nếu `isOverdue` (server trả, KHÔNG tính lại ở client). |
| `RQ-12` | `HandlerChip` hiển thị `assigneeName` nếu có, ngược lại "Chưa phân công" với style muted. |
| `RQ-13` | `primaryActions.detailHref` render thành `&#x3C;Link&#x3E;` với `aria-label="Mở chi tiết hồ sơ &#x3C;fullName&#x3E;"`, href = `/admin/labor-profiles/&#x3C;laborProfileId&#x3E;` — **KHÔNG** kèm `?case=&#x3C;caseId&#x3E;`. Lý do: trang `app/admin/labor-profiles/[id]/page.tsx` hiện chỉ nhận `params: Promise‹{ id: string }›`, KHÔNG đọc `searchParams`, KHÔNG xử lý query `?case=&#x3C;id&#x3E;`. Đặt query vào URL sẽ tạo ảo giác deep-link nhưng trang hoàn toàn bỏ qua nó — vi phạm nguyên tắc "URL phải phản ánh đường dẫn mà repo xử lý". `caseId` vẫn nằm trong DTO và E1 dùng cho `RowKey` / lookup; chỉ KHÔNG đưa vào URL ở v1. `submissionHref` render thành nút phụ, href = `/admin/applications` (cũng KHÔNG kèm `?case=&#x3C;caseId&#x3E;`); nếu `null` thì ẩn. **Deep-link trực tiếp tới PlacementCase** (cả detail page lẫn submission detail) sẽ là task riêng (out-of-round). |
| `RQ-14` | PII masking hoàn toàn server-side; client chỉ render đúng giá trị server trả (chấp nhận cả raw lẫn mask). Không mask lại ở client. |
| `RQ-15` | UI không gửi hidden/internal field nào lên server (form state chỉ chứa field user thấy). |
| `RQ-16` | Keyboard navigation: Tab đi qua hàng → vào action link; Enter mở link. Focus ring rõ. |
| `RQ-17` | Responsive: mobile (≥ 360px) hiển thị bảng cuộn ngang; tablet/desktop hiển thị đầy đủ cột. |
| `RQ-18` | E1 **không** mutate; không POST/PATCH/DELETE từ page này. |
| `RQ-19` | E1 đọc DTO từ `src/domains/talent/recruiter-workbench.types.ts` (file do E0 tạo). Nếu E0 chưa freeze, E1 không code. |
| `RQ-20` | E1 không thêm package mới; không cài dependency. |
| `RQ-21` | **Query validation behavior** (C-08). URL search params parse bằng zod schema của E0:<br>• **Omitted param** → dùng safe defaults (`view=ALL` cho ADMIN/HR_MANAGER, `view=MINE` cho HR_STAFF; `sort=ageDesc`; `pageSize=20`); gọi service với defaults.<br>• **Invalid explicit** (zod fail) → render validation/error state với thông điệp từ zod issues; KHÔNG gọi `getRecruiterWorkbenchList`, KHÔNG chạm DB, KHÔNG giả thành empty result. |

### 4.2 Scope boundaries

- **In:**
  - `app/admin/recruiter-workbench/page.tsx` (server component).
  - `app/admin/recruiter-workbench/_components/**` (client components: filter, sort, pagination, badges).
  - `app/admin/recruiter-workbench/loading.tsx` (optional).
  - `app/admin/recruiter-workbench/error.tsx` (optional).
  - Colocated unit/component tests (root `src/**/*.test.tsx` hoặc `app/**/*.test.ts`):
    - `app/admin/recruiter-workbench/_components/NextActionBadge.test.tsx` (colocated)
    - `app/admin/recruiter-workbench/_components/AgeCell.test.tsx` (colocated)
    - `app/admin/recruiter-workbench/_components/HandlerChip.test.tsx` (colocated)
    - `app/admin/recruiter-workbench/page.test.tsx` (colocated, mocked E0 service — KHÔNG gọi DB).
  - UI tests là unit/component tests với mocked E0 service; KHÔNG phải DB integration.
- **Out:**
  - `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`, `package-lock.json`, `vitest*.config.ts`, `vitest.integration-files.ts` (chỉ import, không sửa).
  - Toàn bộ file E0 (xem Forbidden paths).
  - Toàn bộ file canonical: `src/domains/applications/conversion.service.ts`, `src/domains/applications/screening.service.ts`, `src/domains/talent/placement-case.service.ts`, `src/domains/talent/labor-profile.service.ts`, `src/domains/talent/labor-profile.read-service.ts`.
  - Shared: `src/shared/auth/*`, `src/shared/privacy/*`, `src/shared/ui/data-table/data-table.tsx`, `src/shared/ui/data-table/use-table-url-state.ts`, `src/shared/ui/data-display/empty-state.tsx` — chỉ import, không sửa.
  - P1-B worktree, AFF migrations, P1-A0/A1 frozen files, `docs/PLANNER_HANDOVER.md`, `docs/tasks/hrp-p1-b-public-apply/**`, `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**`.
  - Notification/n8n workflow — task riêng.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` (HANDOFF.md, AUDIT.md, evidence/).

### 4.3 Domain boundaries

- **Data/state:**
  - E1 chỉ đọc DTO từ E0; không tự query DB trực tiếp từ UI page (trừ khi gọi internal service cùng RLS context — đó là consumption, không phải query mới).
  - Không thêm DB column mới.
- **Permission/security:**
  - Permission check ở server (E0 đã làm); UI chỉ render theo data server trả.
  - UI không lộ PII hơn mức server cho phép; client KHÔNG mask lại.
  - Single-tenant HRP — không có Org context ở UI.
- **Interface/API:**
  - Tiêu thụ `GET /api/admin/recruiter-workbench` (đã định nghĩa trong E0).
  - URL search params là source of truth cho filter/sort/page; **parse bằng E0 zod schema** — omitted → safe defaults, invalid explicit → render validation/error state KHÔNG query DB (RQ-21).
  - Không tạo endpoint mới.
- **Migration/rollback:**
  - Không migration. Rollback = revert commit / xóa folder `app/admin/recruiter-workbench/**`.

### 4.4 UI map `nextAction` → label/icon

Server enum (chính xác 7 giá trị — C-04; KHÔNG có `CONTACT_CANDIDATE`):

| Server enum | Label (vi) | Icon hint |
|---|---|---|
| `OPEN_INTAKE` | Mở hồ sơ intake | inbox |
| `REQUEST_DOCS` | Yêu cầu giấy tờ | document |
| `SCREEN_SUBMISSION` | Sàng lọc hồ sơ | filter |
| `SCHEDULE_SCREEN` | Sắp lịch sàng lọc | calendar |
| `AWAITING_RESULT` | Chờ kết quả | clock |
| `REVIEW_PLACEMENT` | Xem placement | check |
| `NONE` | — | (ẩn) |

> Map này là pure UI helper; client **không** thêm giá trị enum mới. Nếu E0 mở rộng enum trong round sau → E1 update map, **không tự ý thêm ở client**.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/admin/recruiter-workbench/page.tsx` | Server component: parse URL search params (zod, safe defaults cho omitted, validation error state cho invalid — KHÔNG gọi DB khi invalid), gọi E0 service trong `withDbContext`, render `&#x3C;DataTable&#x3E;` với columns/cells từ `_components`. | `npm run typecheck`; `AC-01..AC-04`. | Nếu E0 chưa freeze → dừng, chờ `WAIT_P1_E0_INTERFACE_FREEZE`. |
| `STEP-02` | `app/admin/recruiter-workbench/_components/NextActionBadge.tsx` (+ colocated `NextActionBadge.test.tsx`) | Pure UI helper: enum → label/icon. | `npx vitest run app/admin/recruiter-workbench/_components/NextActionBadge.test.tsx`; `AC-10`. | Nếu helper tự suy diễn từ row fields → revert. |
| `STEP-03` | `app/admin/recruiter-workbench/_components/AgeCell.tsx` (+ colocated `AgeCell.test.tsx`) | Format ageHours; chip đỏ nếu isOverdue. | `npx vitest run app/admin/recruiter-workbench/_components/AgeCell.test.tsx`; `AC-11`. | Nếu helper tính lại `isOverdue` ở client → revert. |
| `STEP-04` | `app/admin/recruiter-workbench/_components/HandlerChip.tsx` (+ colocated `HandlerChip.test.tsx`) | Render assigneeName hoặc muted "Chưa phân công". | `npx vitest run app/admin/recruiter-workbench/_components/HandlerChip.test.tsx`; `AC-12`. | Nếu helper tự query DB để lấy tên → revert. |
| `STEP-05` | `app/admin/recruiter-workbench/_components/FilterChips.tsx`, `SortDropdown.tsx`, `PaginationControls.tsx` | Client components wrap `&#x3C;Link&#x3E;` thay đổi URL state. | `AC-03..AC-05`. | Nếu component gọi mutation API → dừng. |
| `STEP-06` | `app/admin/recruiter-workbench/_components/PrimaryActions.tsx` | Render `&#x3C;Link&#x3E;` tới canonical route — `detailHref = /admin/labor-profiles/&#x3C;laborProfileId&#x3E;` (KHÔNG `?case=&#x3C;caseId&#x3E;` vì detail page không xử lý); `submissionHref = /admin/applications` (cũng KHÔNG `?case=`). | `AC-13`, `AC-18`. | Nếu component gọi mutation API → dừng. |
| `STEP-07` | `app/admin/recruiter-workbench/loading.tsx`, `error.tsx` | Loading skeleton + error banner. | `AC-07`, `AC-08`. | — |
| `STEP-08` | `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/HANDOFF.md` | Báo cáo triển khai + diff + verify output. | `AC-19`. | Nếu HANDOFF thiếu evidence → trả Planner. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Page parse URL search params đúng schema E0; **invalid explicit** URL params render validation/error state và KHÔNG gọi DB; **omitted** params dùng safe defaults (`view` per role, `sort=ageDesc`, `pageSize=20`). | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-02` | Page gọi `getRecruiterWorkbenchList` trong cùng `tx`/RLS context; không tự query DB ngoài E0. | document review trên `page.tsx`. |
| `AC-03` | Filter chips thay đổi URL state; reload trang giữ filter. | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-04` | Sort dropdown thay đổi URL state. | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-05` | Pagination controls thay đổi URL state; page size options = [20, 50, 100]; default `pageSize=20`. | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-06` | Empty state hiển thị khi `items.length === 0`. | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-07` | Loading state hiển thị skeleton khi đang fetch. | visual check / document review. |
| `AC-08` | Error state hiển thị banner + nút Retry (gọi `router.refresh()`). | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-09` | Forbidden state hiển thị khi service throw `PERMISSION_DENIED` (không phải 500). | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-10` | `NextActionBadge` render label/icon từ map (chính xác 7 enum: `OPEN_INTAKE \| REQUEST_DOCS \| SCREEN_SUBMISSION \| SCHEDULE_SCREEN \| AWAITING_RESULT \| REVIEW_PLACEMENT \| NONE`); **không** tính lại từ row fields. | `npx vitest run app/admin/recruiter-workbench/_components/NextActionBadge.test.tsx`. |
| `AC-11` | `AgeCell` render đúng format; chip đỏ nếu `isOverdue=true`. | `npx vitest run app/admin/recruiter-workbench/_components/AgeCell.test.tsx`. |
| `AC-12` | `HandlerChip` render assigneeName hoặc muted "Chưa phân công". | `npx vitest run app/admin/recruiter-workbench/_components/HandlerChip.test.tsx`. |
| `AC-13` | Primary action `&#x3C;Link&#x3E;` có `aria-label`; href = `/admin/labor-profiles/&#x3C;laborProfileId&#x3E;` (KHÔNG có query string — detail page chỉ nhận `params`, không đọc `searchParams`); submit-link ẩn khi `submissionHref=null`; submit-link href = `/admin/applications` (KHÔNG kèm `?case=`). | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-14` | UI render raw phone khi server trả raw (user có permission); render mask khi server trả mask; client KHÔNG mask lại. | `npx vitest run app/admin/recruiter-workbench/page.test.tsx`. |
| `AC-15` | UI không gửi hidden/internal field lên server; form state chỉ chứa field user thấy. | document review trên `_components/**`. |
| `AC-16` | Keyboard navigation: Tab đi qua hàng → action link; Enter mở link. | visual check + document review. |
| `AC-17` | Responsive: mobile (≥ 360px) cuộn ngang; tablet/desktop hiển thị đầy đủ cột. | visual check. |
| `AC-18` | Page không gọi POST/PATCH/DELETE; chỉ GET (qua E0 service). | grep `fetch(`, `axios` trong `page.tsx` và `_components/**`. |
| `AC-19` | HANDOFF.md có bảng changed file (`git status --porcelain`) và verify output; chỉ liệt kê file trong §4.2 In. | `git status --porcelain`; document review. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-05` | `AC-03` |
| `RQ-04` | `STEP-05` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-01` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-07` |
| `RQ-08` | `STEP-07` | `AC-08` |
| `RQ-09` | `STEP-01` | `AC-09` |
| `RQ-10` | `STEP-02` | `AC-10` |
| `RQ-11` | `STEP-03` | `AC-11` |
| `RQ-12` | `STEP-04` | `AC-12` |
| `RQ-13` | `STEP-06` | `AC-13` |
| `RQ-14` | `STEP-01` | `AC-14` |
| `RQ-15` | `STEP-01`, `STEP-05` | `AC-15` |
| `RQ-16` | `STEP-01`, `STEP-06` | `AC-16` |
| `RQ-17` | `STEP-01` | `AC-17` |
| `RQ-18` | `STEP-01`, `STEP-06` | `AC-18` |
| `RQ-19` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06`, `STEP-07`, `STEP-08` | `AC-01`, `AC-02` |
| `RQ-20` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06`, `STEP-07`, `STEP-08` | `AC-19` |
| `RQ-21` | `STEP-01` | `AC-01` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | E0 chưa freeze → E1 code sai shape. | `Next gate: WAIT_P1_E0_INTERFACE_FREEZE` chặn triển khai; nếu Tier 1 vi phạm gate → revert. |
| `RISK-02` | Client tự suy diễn `nextAction` / `isOverdue` do copy code hoặc helper mới. | Test AC-10, AC-11 bắt buộc; nếu fail → revert helper. |
| `RISK-03` | UI gửi field thừa lên server do dev mistake. | AC-15 + grep; nếu fail → revert. |
| `RISK-04` | Tier 1 thêm dependency mới (React Query, drag-drop lib). | Forbidden paths chặn; nếu vi phạm → revert. |
| `RISK-05` | Tier 1 mở mutation từ page (POST `/api/...`). | Forbidden paths chặn; AC-18 grep `fetch(`; nếu fail → revert. |
| `RISK-06` | Conflict với worktree P1-B hoặc E0. | File ownership tách rời (§4.2 Forbidden); nếu conflict thực sự xảy ra → escalate. |

## 8. Open Questions

- None.

Không được còn câu hỏi cần Owner quyết khi `Contract gate: READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|
| `v1.3` | `READY_FOR_EXECUTION` / `READY_TO_CODE` / `CLOSED`; baseline `224a4d9f4db4275d35eda10e0dd5a2957d8fe33c` (post-E0 production closeout); E0 dependency `ACCEPTED` (PR #54 squash-merged as `c647fc6a`); gate `WAIT_P1_E0_INTERFACE_FREEZE` removed. Status → `READY_FOR_EXECUTION`; Contract gate → `READY_TO_CODE`; Decision state → `CLOSED`; Current execution round → `1`; Next gate → `TIER1_IMPLEMENTATION_FREEZE`. Implementation worktree: `codex/t1a-p1e1-recruiter-workbench-ui` (mới, từ `224a4d9f`). Open questions = None. n8n = N/A cho E1. | E0 ACCEPTED + production-merged; E1 materialize + ready to code |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-25` | Initial contract (PROPOSED_ONLY, DRAFT) | Initial planning round cho P1-E1 |
| `v1.1` | `2026-09-25` | Applied 10-point correction batch C-01..C-10 from T0 v1.1: paths `app/...`; remove Org authority & add role × view matrix (single-tenant HRP); nested DTO `candidate.phone`/`candidate.cccdNumber`; freeze 7-value `nextAction` enum (remove `CONTACT_CANDIDATE`); remove `?case=` from `/admin/applications`; canonical test locations (colocated `app/admin/recruiter-workbench/_components/*.test.tsx` + `app/admin/recruiter-workbench/page.test.tsx`, không dùng `tests/integration`); query validation behavior (omitted → safe defaults; invalid explicit → render validation/error state KHÔNG query DB); tighten search semantics (chỉ `fullName` ở UI); PII server-only masking. Status vẫn `PROPOSED_ONLY`; Next gate vẫn `WAIT_P1_E0_INTERFACE_FREEZE`. | T0 v1.1 correction batch (consolidated, 1 correction budget) |
| `v1.2` | `2026-09-25` | **T0 acceptance cleanup** — truthful detail-link behavior; no new business decision. (1) §1.1 outcome: chi tiết detail `&#x3C;Link&#x3E;` là `/admin/labor-profiles/&#x3C;laborProfileId&#x3E;` (KHÔNG `?case=&#x3C;caseId&#x3E;`); submission `&#x3C;Link&#x3E;` cũng KHÔNG `?case=`. (2) `RQ-13`: `detailHref = /admin/labor-profiles/&#x3C;laborProfileId&#x3E;` — KHÔNG kèm query; lý do: `app/admin/labor-profiles/[id]/page.tsx` hiện chỉ nhận `params: Promise‹{ id: string }›`, KHÔNG đọc `searchParams`. Đặt query vào URL sẽ tạo ảo giác deep-link nhưng trang bỏ qua hoàn toàn — vi phạm nguyên tắc "URL phải phản ánh đường dẫn mà repo xử lý". `caseId` vẫn trong DTO và E1 dùng cho `RowKey`/lookup; chỉ KHÔNG đưa vào URL ở v1. (3) `AC-13`: tightened — nêu rõ href = `/admin/labor-profiles/&#x3C;laborProfileId&#x3E;` không có query. (4) `STEP-06` intent: ghi rõ KHÔNG `?case=&#x3C;caseId&#x3E;` ở cả detail lẫn submission href. Deep-link trực tiếp tới PlacementCase (cả detail lẫn submission detail) là task riêng (out-of-round). Status vẫn `PROPOSED_ONLY`; Next gate vẫn `WAIT_P1_E0_INTERFACE_FREEZE`. | T0 acceptance cleanup (no new correction budget) |
| `v1.3` | `2026-09-26` | **Materialize + E0 ACCEPTED → E1 READY_FOR_EXECUTION**: Materialized P1-E1 TASK.md từ source commit `51d152d` (file only via `git restore --source=51d152d -- &#x3C;path&#x3E;`; KHÔNG cherry-pick). Gỡ gate `WAIT_P1_E0_INTERFACE_FREEZE`. Baseline `8c8e0446` → `224a4d9f` (post-E0 production closeout). Status `PROPOSED_ONLY` → `READY_FOR_EXECUTION`; Contract gate `DRAFT` → `READY_TO_CODE`; Decision state `OPEN` → `CLOSED`; Current execution round `0` → `1`; Next gate `WAIT_P1_E0_INTERFACE_FREEZE` → `TIER1_IMPLEMENTATION_FREEZE`. **KHÔNG** reset/che giấu correction history v1.0/v1.1/v1.2 (v1.0 chỉ là initial contract; v1.1 là T0 10-point correction batch C-01..C-10; v1.2 là T0 acceptance cleanup). In-scope roots bổ sung `loading.tsx`, `error.tsx`, colocated tests. Forbidden bổ sung `vitest*.config.ts`, `vitest.integration-files.ts`, shared `DataTable`/`useTableUrlState`/`EmptyState`, `app/admin/**` ngoài folder E1, sidebar/navigation/menu. Required gates bổ sung `verify-handoff.ps1`, `verify-encoding.ps1`, `npm run build`, `npm run test:unit`. n8n = N/A cho E1 (UI read-only thuần HRP runtime; không phụ thuộc n8n availability). Open questions = None. | E0 ACCEPTED + production-merged; E1 materialize + ready to code |
