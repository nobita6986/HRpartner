# TASK — `hrp-p1-e0-recruiter-workbench-read-model`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-e0-recruiter-workbench-read-model` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Đọc danh sách ứng viên/case thuộc canonical P1-C/P1-D có PII (phone/CCCD) và RLS boundary; sai shape hoặc rò PII sẽ leak dữ liệu người lao động. LIGHT audit là bắt buộc để verify PII masking, RLS boundary, deterministic NextAction/age derivation và no-leak behavior. |
| Spec version | `v1.3` |
| Status | `BLOCKED` |
| Planner | `Tier 1` |
| Baseline | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `NOT_READY` (ENV_BLOCKED — synthetic DB chưa được cung cấp cho P1-E0) |
| Correction budget | `1` |
| Correction batches used | `1` (E0-F01..E0-F09) |
| Audit eligibility | `NOT_ELIGIBLE` |
| Audit eligibility rationale | AC-09..AC-13 pending synthetic DB (AC-09..AC-13 chỉ pass khi integration suite thực sự chạy trên synthetic PostgreSQL) |
| In-scope roots | `src/domains/talent/recruiter-workbench.read-service.ts`, `src/domains/talent/recruiter-workbench.types.ts`, `app/api/admin/recruiter-workbench/route.ts`, `src/domains/talent/recruiter-workbench.read-service.test.ts`, `src/domains/talent/recruiter-workbench.derive.test.ts`, `tests/db/recruiter-workbench.integration.test.ts` (DB; tệp đăng ký vào `vitest.integration-files.ts`), `vitest.integration-files.ts` (registration-only: thêm đúng MỘT entry cho test ở trên; KHÔNG thay đổi shape/config, KHÔNG thêm xóa các entry khác) |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`, `package-lock.json`, `vitest.config.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`, `docs/PLANNER_HANDOVER.md`, `src/domains/applications/conversion.service.ts`, `src/domains/applications/screening.service.ts`, `src/domains/talent/placement-case.service.ts` (trừ chỗ gọi canonical helper), `src/domains/talent/labor-profile.service.ts` (trừ chỗ gọi canonical helper), `docs/discovery/realignment/P1B_PUBLIC_APPLY_RECONCILIATION.md`, `docs/tasks/hrp-p1-b-public-apply/**`, `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` |
| Required gates | `.ai-pipeline/scripts/verify-task.ps1`, `git diff --check`, `git status --porcelain`, `npm run typecheck`, `npm run lint` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `T0_CI_SYNTHETIC_DB_GATE` |

> Lane và audit là hai quyết định riêng. CRITICAL + LIGHT là bắt buộc vì read service đụng PII/RLS; rủi ro đã được ghi rõ trong `Audit reason`.

> **Correction batch 1/1 freeze (E0-F09)**: Status chuyển sang `BLOCKED` do AC-09..AC-13 (route authority, real route coverage, DB integration evidence) đòi hỏi synthetic PostgreSQL DB mà Tier 0/Owner chưa cung cấp cho P1-E0. Canonical gates = `ENV_BLOCKED`. Audit eligibility = `NOT_ELIGIBLE` cho đến khi `T0_CI_SYNTHETIC_DB_GATE` pass. Correction batches used = 1. Sau khi T0 CI ephemeral integration PASS, một docs-only evidence freeze riêng sẽ chuyển Status → `READY_FOR_AUDIT`, Canonical gates → `PASS`, Audit eligibility → `ELIGIBLE`, Next gate → `TIER3_LIGHT_AUDIT`.

> Chỉ chuyển `READY_FOR_EXECUTION` sau khi `WAIT_P1_B_ACCEPTED` đã mở. Trong round planning v1.2, trạng thái giữ `PROPOSED_ONLY` / `Contract gate = DRAFT`. Tại v1.3, `P1-B` đã `ACCEPTED` tại main `a88d872`, nên E0 được bump `READY_FOR_EXECUTION` / `READY_TO_CODE` / `CLOSED`. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Recruiter (ADMIN / HR_MANAGER / HR_STAFF theo role × view matrix — xem C-02 §5.1) gọi được một endpoint read-only `GET /api/admin/recruiter-workbench` trả về danh sách xử lý ứng viên gồm: candidate (fullName + phone/cccdNumber mask theo permission), current case stage/status, job/context, last interaction, server-derived nextAction, handler, age/overdue, primary action links (canonical routes).
- Mọi giá trị hiển thị được tính **server-side** với rule deterministic, có test cover. Client **chỉ render**.
- PII (phone, cccdNumber) được mask theo permission `CAN_VIEW_WORKER_SENSITIVE` — tái sử dụng `maskPhone`/`maskCccd`.
- Filter/sort/page đồng bộ với URL state. Repo là **single-tenant HRP** — `AuthContext` chỉ có `userId`, `role`, `vendorId?`, `workerId?` (xem `src/shared/auth/auth-context.ts`). KHÔNG có `organizationId/orgId`. Multi-Org isolation là future additive contract.

### 1.2 Non-goals

- Không mở mutation: không chuyển `PlacementCase.status`, không tạo/cập nhật `LaborProfileHandlingAssignment`, không convert submission, không đẩy `Placement` transition (`SELECTED`→`CONFIRMED`→...).
- Không thêm DB column mới trong round này.
- Không tạo Kanban-specific status hoặc sửa canonical `PlacementCaseStatus` enum.
- Không cài package mới.
- Không triển khai workflow n8n / notification; task notification là task riêng (xem `docs/N8N_AUTOMATION_BOUNDARY.md`) và không được phép dùng tên `P1-D`.
- Không build data-grid / form / query cache framework.
- Không đụng P1-B worktree, AFF migrations, hoặc file frozen của P1-A0/A1.

## 2. Evidence

Chỉ liệt kê bằng chứng cần để Tier 1 triển khai.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/talent/labor-profile.read-service.ts:32` (`getLaborProfilesList`) | Pattern chuẩn cho read service + RLS + masking — copy pattern, không tái cấu trúc. |
| `EV-02` | `src/domains/talent/labor-profile.read-service.ts:178` (`getLaborProfileDetail`) | Pattern include các quan hệ (intakes/submissions/episodes/placementCases/handlingAssignments) cho projection. |
| `EV-03` | `prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql:40` (`placement_case_labor_profile_id_active_unique` partial unique) | Quy tắc max 1 active case / LaborProfile đã ở DB — read service không cần reimplement. |
| `EV-04` | `src/domains/talent/placement-case.service.ts` (`openPlacementCase`) | Canonical helper mở case; E0 chỉ đọc, không gọi mutation từ read path. |
| `EV-05` | `prisma/migrations/20260922100000_w5_handling_assignment_safety/migration.sql` | Status/source/expiresAt của `LaborProfileHandlingAssignment` đã có — dùng cho handler derivation. |
| `EV-06` | `src/shared/auth/permission-resolver.ts` (`resolveEffectivePermissions`) + `src/shared/auth/auth-context.ts` (shape: `userId`, `role`, `vendorId?`, `workerId?`) | Pattern resolve permission cho masking; copy, không wrap. Single-tenant HRP — KHÔNG có `organizationId`/`orgId` ở v1. |
| `EV-07` | `src/shared/privacy/mask.ts` (`maskPhone`, `maskCccd`) | PII masking primitives đã chuẩn hóa. |
| `EV-08` | `src/shared/ui/data-table/use-table-url-state.ts:58` (`useTableUrlState`) | URL-sync filter/sort primitive — E1 sẽ consume cùng shape. |
| `EV-09` | `docs/tasks/hrp-p1-b-public-apply/TASK.md` tại `f640c0829fb5b01a67cb29487bce117c120f85a8` (§5–§6: `hrp_score_labor_profile` shape) | Design input cho shape cuối của identity resolution; E0 đọc, không freeze helper. |
| `EV-10` | `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` §2–§4 | Capability matrix + residual đã chốt; E0 implement trên nền này. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | E0 cung cấp **một endpoint read-only** (`GET /api/admin/recruiter-workbench`) trả về `RecruiterWorkbenchListResponse`; không có POST/PATCH/DELETE trong E0. | `CHOSEN` |
| `DEC-02` | `RecruiterWorkbenchRow.nextAction` là **server-derived, deterministic**, enum đóng (xem §4.1 RQ-08). Client không được tính lại. | `CHOSEN` |
| `DEC-03` | `RecruiterWorkbenchRow.ageHours` / `isOverdue` là **server-derived** từ `PlacementCase.openedAt` và `LaborProfileHandlingAssignment.expiresAt` (khi có). | `CHOSEN` |
| `DEC-04` | `RecruiterWorkbenchRow.handler` derive theo rule C-03: chọn `LaborProfileHandlingAssignment` có `status='ACTIVE'`, `startsAt ‹= now`, và `expiresAt IS NULL OR expiresAt › now`; nếu nhiều record, **deterministic order** `orderBy: { startsAt: 'desc', createdAt: 'desc', id: 'desc' }` rồi lấy 1. Nếu không có → `assigneeUserId=null`, `source=null`, `assigneeName=null`. **KHÔNG** fallback "current reviewer on case" vì `PlacementCase` không có field đó. | `CHOSEN` |
| `DEC-05` | PII masking chỉ trả raw qua nested DTO `candidate.phone` / `candidate.cccdNumber` khi user có `CAN_VIEW_WORKER_SENSITIVE`; ngược lại dùng `maskPhone` / `maskCccd`. KHÔNG có alias top-level (`candidatePhone`, `candidateCccdNumber`). | `CHOSEN` |
| `DEC-06` | Role × view authority matrix (single-tenant HRP, xem `src/shared/auth/auth-context.ts`):&#x3C;br&#x3E;• `ADMIN \| HR_MANAGER` được `view=ALL` và các view khác.&#x3C;br&#x3E;• `HR_STAFF` mặc định và TỐI ĐA là `view=MINE`; KHÔNG được đổi sang `ALL` (→ 403).&#x3C;br&#x3E;• `view=UNASSIGNED` chỉ khi user có `CAN_VIEW_UNASSIGNED_POOL`; thiếu permission → 403.&#x3C;br&#x3E;• Default `view`: `ADMIN/HR_MANAGER=ALL`, `HR_STAFF=MINE`. URL state có thể đổi trong phạm vi allowed của role. | `CHOSEN` |
| `DEC-07` | E0 **không** thêm DB column mới; nếu cần `lastInteraction` thì chỉ join các bảng đã có (`candidate_submissions`, `application_status_history`, `placement_case`). `lastInteraction.kind ∈ {SUBMISSION, STATUS_CHANGE, null}`; chọn mới nhất bằng `createdAt DESC, id DESC`. KHÔNG có `NOTE`. | `CHOSEN` |
| `DEC-08` | E0 **không** phụ thuộc n8n availability; read path là HRP runtime thuần. | `CHOSEN` |
| `DEC-09` | RLS context: chạy trong `withDbContext(prisma, ctx, ...)` (helper `src/shared/auth/with-db-context.ts`) — apply GUC `app.user_id` / `app.role` transaction-local qua `set_config(..., true)` (`src/shared/auth/rls-context.ts`). Pattern copy từ `labor-profile.read-service.ts`. Repo single-tenant: KHÔNG filter `ctx.orgId` (vì không tồn tại). Application filter (role × view) **thu hẹp thêm trên RLS**, không thay thế RLS. | `CHOSEN` |
| `DEC-10` | Permission gate bắt buộc: role ∈ `{ADMIN, HR_MANAGER, HR_STAFF}` (`src/shared/auth/route-guard` pattern hoặc inline role check). Nếu role ngoài allowlist → `403 FORBIDDEN` body `{ error: 'PERMISSION_DENIED' }`. **KHÔNG** viện dẫn permission generic chưa tồn tại trong catalog (`src/shared/auth/permission-catalog.ts`). 403 cũng trả khi requested view vượt authority (HR_STAFF gọi `view=ALL`; user thiếu `CAN_VIEW_UNASSIGNED_POOL` gọi `view=UNASSIGNED`). | `CHOSEN` |

Không chứa token quyết-định-đang-chờ bất kỳ khi chuyển `READY_FOR_EXECUTION` (v1.3 đã CLOSED toàn bộ Owner decision ở §3; RECON §3 đóng `R-B0`).

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Read service (Prisma + RLS) | Internal pattern tại `src/domains/talent/labor-profile.read-service.ts` | `ADOPT` | `N/A` (internal) | `src/domains/talent/labor-profile.read-service.ts:32` | `src/domains/talent/recruiter-workbench.read-service.ts` (1 file mới) | Tận dụng pattern đã RLS-tested, không viết lại. |
| Permission resolver | Internal `src/shared/auth/permission-resolver.ts` (`resolveEffectivePermissions`) | `ADOPT` | `N/A` (internal) | `src/shared/auth/permission-resolver.ts` | wrapper boundary = helper call trong `recruiter-workbench.read-service.ts` | Pattern đã chuẩn hóa. |
| PII masking | Internal `src/shared/privacy/mask.ts` (`maskPhone`, `maskCccd`) | `ADOPT` | `N/A` (internal) | `src/shared/privacy/mask.ts` | wrapper boundary = helper call | Mask primitives đã có, đồng nhất với LaborProfile read. |
| Date/age formatting | Internal helpers trong codebase | `ADOPT` | `N/A` (internal) | dùng `Intl.DateTimeFormat` chuẩn (xem các trang admin hiện hữu) | wrapper boundary = helper nhỏ trong `recruiter-workbench.read-service.ts` hoặc shared util nếu có sẵn | Không cần thêm thư viện date. |
| API route handler | Next.js App Router chuẩn tại `app/api/admin/**` | `ADOPT` | `MIT` (Next.js) | `next@15` đã cài (xem `package.json`) | wrapper boundary = `route.ts` trong `app/api/admin/recruiter-workbench/` | Pattern đã có từ P1-A0/P1-A1. Repo chỉ có MỘT cây `app/` ở root; KHÔNG có `src/app/` (Next.js App Router chỉ nhận một cây). |
| Zod cho query validation | `zod` đã cài (xem `package.json`) | `ADOPT` | `MIT` | `zod` đã pin trong `package.json` | wrapper boundary = `recruiter-workbench.types.ts` | Validation query string an toàn, tránh injection. |
| DataGrid / table framework | TanStack Table qua `DataTable` (`src/shared/ui/data-table/data-table.tsx`) | `ADOPT` | `MIT` | TanStack Table v8 (xem `package.json`) | wrapper boundary = `DataTable` component | E0 không render UI; E1 sẽ consume. |
| Kanban / drag-drop | — | `N/A` | — | — | — | E0 là read-model, không Kanban. |

- `ADOPT`: phải pin license, version/source, compatibility và wrapper/test boundary. Tất cả internal helper đều đã pin source path; Next.js/Zod/TanStack đã pin trong `package.json` (Tier 1 không thêm dependency).
- `CUSTOM`: không có (xem `CUSTOM_BUILD_JUSTIFICATION` — không cần trong round này).
- `N/A`: chỉ áp dụng cho capability không liên quan (ví dụ Kanban).

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Read endpoint `GET /api/admin/recruiter-workbench` | HRP runtime (Next.js route + Prisma) | `N/A` | — | — | — | — | Endpoint đồng bộ, không có workflow; idempotency theo URL state. |
| Notification/reminder trên case quá hạn | n8n (outbox → workflow) | `N/A` (E0) | — | — | — | — | **Nằm ngoài E0**. Sẽ là task riêng (không phải P1-D); sẽ dùng versioned event/outbox. |
| Page-cache hoặc background revalidation | — | `N/A` | — | — | — | — | E0 là read thuần; caching để round sau nếu cần. |

- `ORCHESTRATE`: không có — E0 không có workflow.
- `CUSTOM`: không có — không có connector mới (xem `CUSTOM_AUTOMATION_JUSTIFICATION`).
- `N/A`: ghi lý do task không tạo/thay connector, scheduler, notification worker hoặc multi-system/operator workflow.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Endpoint `GET /api/admin/recruiter-workbench` trả về JSON `RecruiterWorkbenchListResponse` gồm `items: RecruiterWorkbenchRow[]`, `total: number`, `page: number`, `pageSize: number`. |
| `RQ-02` | Mỗi `RecruiterWorkbenchRow` chứa **nested shape** cho outcome: `caseId`, `caseStatus` (`OPEN \| IN_PROGRESS \| READY_TO_PLACE \| CLOSED`), `openedAt`, `closedAt \| null`, `candidate: { laborProfileId, fullName, phone (mask), cccdNumber (mask), identityVerification, completeness }`, `job: { jobPostingId \| null, jobPostingTitle \| null, projectName \| null, companyName \| null }`, `lastInteraction: { at \| null, kind: SUBMISSION \| STATUS_CHANGE \| null }`, `nextAction: ServerDerivedNextAction`, `handler: { assigneeUserId \| null, assigneeName \| null, source \| null }`, `ageHours: number`, `isOverdue: boolean`, `overdueReason: HANDLER_EXPIRED \| CASE_AGE_THRESHOLD \| null`, `primaryActions: { detailHref, submissionHref \| null }`. **KHÔNG** có alias top-level `candidatePhone`/`candidateCccdNumber` — DTO chỉ nested. |
| `RQ-03` | Query string (`zod`-validated) chấp nhận: `search`, `caseStatus`, `handlerUserId`, `view` (`MINE \| ALL \| UNASSIGNED`), `overdue` (`true \| false \| undefined`), `sort` (`ageDesc \| ageAsc \| openedDesc \| openedAsc`), `page` (≥1), `pageSize` (∈ {20, 50, 100}, default 20). **Default omitted** (E1 server page): `view=ALL` cho ADMIN/HR_MANAGER; `view=MINE` cho HR_STAFF; `sort=ageDesc`; `pageSize=20`. |
| `RQ-04` | RLS: query chạy trong `withDbContext(prisma, ctx, cb)` để apply 4 GUC transaction-local (`app.user_id`, `app.role`, `app.vendor_id`, `app.worker_id`) qua `set_config(..., true)`. Repo **single-tenant**: KHÔNG filter `ctx.orgId` (AuthContext không có field đó). Application filter (role × view) **thu hẹp thêm trên RLS**, không thay thế RLS. |
| `RQ-05` | PII masking (chỉ trong nested DTO `candidate.phone` / `candidate.cccdNumber`): raw chỉ khi user có `CAN_VIEW_WORKER_SENSITIVE`; ngược lại `maskPhone` / `maskCccd`. **Search không có sensitive permission chỉ tìm `fullName`**; phone/CCCD search hoặc exact lookup khi thiếu permission PHẢI bị schema từ chối (400) hoặc 403. Tuyệt đối KHÔNG dùng raw phone/CCCD làm inference oracle. |
| `RQ-06` | Role gate bắt buộc ở route handler: `ctx.role ∈ { ADMIN, HR_MANAGER, HR_STAFF }`. Role ngoài allowlist → HTTP `403 FORBIDDEN` body `{ error: 'PERMISSION_DENIED' }` (đồng nhất `labor-profile.read-service.ts`). View cũng gate: `HR_STAFF` gọi `view=ALL` → 403; user thiếu `CAN_VIEW_UNASSIGNED_POOL` gọi `view=UNASSIGNED` → 403. **KHÔNG** viện dẫn permission generic chưa tồn tại trong `permission-catalog.ts`. |
| `RQ-07` | `nextAction` derive server-side bằng `deriveNextAction(row)` deterministic, enum đóng **chính xác 7 giá trị**: `OPEN_INTAKE \| REQUEST_DOCS \| SCREEN_SUBMISSION \| SCHEDULE_SCREEN \| AWAITING_RESULT \| REVIEW_PLACEMENT \| NONE`. **KHÔNG** có `CONTACT_CANDIDATE`. Mapping rule precedence từ trên xuống (§4.4); E1 chỉ render enum, không suy diễn lại. |
| `RQ-08` | `ageHours` = `(now − openedAt) / 1h`, làm tròn 1 chữ số thập phân; `isOverdue = ageHours ≥ 72` HOẶC `handler.expiresAt ‹ now`. Threshold 72h có thể chỉnh trong round sau, nhưng trong E0 cố định. |
| `RQ-09` | `handler` derive (rule C-03): chọn `LaborProfileHandlingAssignment` thỏa **đồng thời** `status='ACTIVE'`, `startsAt lte now`, `expiresAt IS NULL OR expiresAt › now`. Khi nhiều record, **deterministic order** `orderBy: { startsAt: 'desc', createdAt: 'desc', id: 'desc' }` rồi lấy 1. Kết quả: `assigneeUserId`, `assigneeName`, `source` (theo record). Nếu không có → `assigneeUserId=null`, `source=null`, `assigneeName=null`. **KHÔNG** fallback "current reviewer on case" vì `PlacementCase` không có field đó. `view=MINE` ⇔ có record ACTIVE với `assigneeUserId = ctx.userId`. |
| `RQ-10` | `lastInteraction.kind` ∈ `{SUBMISSION, STATUS_CHANGE, null}` — **KHÔNG** có `NOTE`. Chọn mới nhất bằng `createdAt DESC, id DESC` trên toàn bộ submissions + history thuộc `PlacementCase`. Ưu tiên `STATUS_CHANGE` mới nhất, fallback `SUBMISSION` mới nhất; nếu không có → `kind=null, at=null`. Không join bảng mới. |
| `RQ-11` | Query consistency: `count` + `findMany` chạy trong cùng `tx`; sort ổn định (deterministic tie-break `placementCase.id`). |
| `RQ-12` | `primaryActions.detailHref = /admin/labor-profiles/{laborProfileId}` — KHÔNG kèm query string. Lý do: trang `app/admin/labor-profiles/[id]/page.tsx` hiện chỉ nhận `params: Promise‹{ id: string }›`, KHÔNG đọc `searchParams`, KHÔNG xử lý `?case={id}`. Đưa query vào URL sẽ tạo ảo giác deep-link nhưng trang bỏ qua hoàn toàn. E0 v1 vì vậy chỉ phát URL đến detail page với `laborProfileId`. `caseId` vẫn tồn tại trong DTO `RecruiterWorkbenchRow.caseId` (cho E1 lookup / RowKey) nhưng KHÔNG đưa vào URL ở v1. `primaryActions.submissionHref = /admin/applications` khi case có submission; `null` khi không có. **KHÔNG** dùng `?case={caseId}` trên `/admin/applications` vì page hiện không xử lý query đó. **Deep-link trực tiếp tới PlacementCase** (cả detail page lẫn submission list) sẽ là task riêng (out-of-round); round này chỉ cam kết URL v1 phản ánh đúng đường dẫn mà repo hiện xử lý. |
| `RQ-13` | E0 **không** nhận body POST/PATCH/DELETE; route handler chỉ export `GET`. Mọi mutation thuộc task khác (P1-F, conversion, screening). |
| `RQ-14` | E0 không cache server-side; mỗi request là query thẳng DB. Không thêm dependency cache mới. |
| `RQ-15` | E0 không đụng `prisma/schema.prisma` và **không** tạo migration mới. |
| `RQ-16` | API route: `GET /api/admin/recruiter-workbench` — khi query string **invalid explicit**, trả `400 BAD_REQUEST` body `{ error: 'BAD_QUERY', issues: zodIssues }` và **không** chạm DB. Omitted params dùng safe defaults (§RQ-03). E1 server page tương ứng: render validation/error state khi invalid explicit và **không** query DB; khi omitted → defaults. |

### 4.2 Scope boundaries

- **In:**
  - File mới:
    - `src/domains/talent/recruiter-workbench.read-service.ts`
    - `src/domains/talent/recruiter-workbench.types.ts`
    - `app/api/admin/recruiter-workbench/route.ts`
  - Colocated unit tests (root `src/**/*.test.ts`):
    - `src/domains/talent/recruiter-workbench.read-service.test.ts`
    - `src/domains/talent/recruiter-workbench.derive.test.ts`
  - DB integration test (gốc `tests/db/**`, file này được đăng ký trong `vitest.integration-files.ts` để lane integration nhận diện):
    - `tests/db/recruiter-workbench.integration.test.ts`
  - **Registration-only edit** trên `vitest.integration-files.ts`: thêm đúng MỘT entry mới trong mảng `INTEGRATION_TEST_FILES` cho `tests/db/recruiter-workbench.integration.test.ts`. KHÔNG thay đổi shape, alias, hay các entry đã có; KHÔNG đụng `vitest*.config.ts`. Đây là đăng ký registry — không phải sửa config vitest.
- **Out:**
  - `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`, `package-lock.json`.
  - **`vitest.config.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`: KHÔNG sửa.** Đây là config; round này chỉ đăng ký 1 entry DB test qua `vitest.integration-files.ts`, KHÔNG thay đổi cấu hình vitest nào.
  - `src/domains/applications/conversion.service.ts`, `src/domains/applications/screening.service.ts`, `src/domains/talent/placement-case.service.ts`, `src/domains/talent/labor-profile.service.ts` — **chỉ được đọc như canonical helper; KHÔNG sửa logic**.
  - `src/domains/talent/labor-profile.read-service.ts` — **không sửa** (copy pattern, không refactor).
  - `src/shared/auth/*`, `src/shared/privacy/*`, `src/shared/ui/data-table/*` — chỉ dùng, không sửa.
  - P1-B worktree, P1-A0/A1 frozen files, `docs/PLANNER_HANDOVER.md`, AFF migrations, `docs/tasks/hrp-p1-b-public-apply/**`, `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**`.
  - UI page — thuộc P1-E1.
  - Notification/n8n workflow — thuộc task riêng.
  - `vitest.integration-files.ts` ngoài phạm vi registration-only: KHÔNG xóa entry, KHÔNG reorder, KHÔNG sửa các entry khác, KHÔNG thêm helper/export mới trong file đó.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**` (HANDOFF.md, AUDIT.md, evidence/).

### 4.3 Domain boundaries

- **Data/state:**
  - Source: `placement_case`, `labor_profile`, `labor_profile_handling_assignment`, `candidate_submissions`, `application_status_history`, `job_posting`, `job_opening`.
  - Read-only. Không insert/update/delete trong E0.
  - Không thêm DB column mới.
- **Permission/security:**
  - RLS qua `withDbContext` + `resolveEffectivePermissions`.
  - Role gate (route handler): `ctx.role ∈ { ADMIN, HR_MANAGER, HR_STAFF }`; thiếu → 403.
  - View gate (route handler): `view=ALL` cần ADMIN/HR_MANAGER; `view=UNASSIGNED` cần `CAN_VIEW_UNASSIGNED_POOL`.
  - PII masking qua `maskPhone` / `maskCccd` trong nested DTO.
  - Single-tenant HRP — KHÔNG có Org boundary ở v1; multi-Org là future additive contract.
- **Interface/API:**
  - REST `GET /api/admin/recruiter-workbench` (Next.js App Router, file path `app/api/admin/recruiter-workbench/route.ts`).
  - JSON contract deterministic; field optional có `null` thay vì `undefined`.
  - Zod validation cho query string.
- **Migration/rollback:**
  - Không migration. Rollback = revert commit / xóa file mới + tests đã liệt kê trong §4.2 In.

### 4.4 `nextAction` mapping rule (deterministic, server-only)

Enum đóng — **chính xác 7 giá trị** (C-04):

```
OPEN_INTAKE
REQUEST_DOCS
SCREEN_SUBMISSION
SCHEDULE_SCREEN
AWAITING_RESULT
REVIEW_PLACEMENT
NONE
```

Áp dụng theo thứ tự ưu tiên **từ trên xuống** (early return). KHÔNG có `CONTACT_CANDIDATE` (đã loại bỏ vì không có mapping thật). E1 chỉ render enum; KHÔNG suy diễn lại.

| Điều kiện | `nextAction` |
|---|---|
| `caseStatus = CLOSED` | `NONE` |
| `caseStatus = OPEN` và `lastInteraction = null` | `OPEN_INTAKE` |
| `caseStatus = OPEN` hoặc `IN_PROGRESS` và `candidate.identityVerification = UNVERIFIED` | `REQUEST_DOCS` |
| `caseStatus = OPEN` hoặc `IN_PROGRESS` và `candidate.completeness = MINIMAL` | `REQUEST_DOCS` |
| `caseStatus = OPEN` và `lastInteraction.kind = SUBMISSION` | `SCREEN_SUBMISSION` |
| `caseStatus = IN_PROGRESS` và `lastInteraction.kind = SUBMISSION` | `SCHEDULE_SCREEN` |
| `caseStatus = IN_PROGRESS` và `lastInteraction.kind = STATUS_CHANGE` | `AWAITING_RESULT` |
| `caseStatus = READY_TO_PLACE` | `REVIEW_PLACEMENT` |
| default | `NONE` |

> Enum là server-owned và đóng. Client **không** được thêm giá trị mới. Nếu E0 mở rộng enum trong round sau → E1 update map ở `_components/NextActionBadge.tsx`, không tự ý thêm ở client.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/recruiter-workbench.types.ts` | Định nghĩa `RecruiterWorkbenchRow`, `RecruiterWorkbenchListResponse`, `RecruiterWorkbenchQuery` (zod schema + TS type). | `npm run typecheck` xanh; `AC-01`. | Nếu type không khớp với bất kỳ field nào trong RQ-02 → dừng, trả Planner. |
| `STEP-02` | `src/domains/talent/recruiter-workbench.read-service.ts` (helper `deriveNextAction`, `deriveHandler`, `deriveLastInteraction`, `computeAge`) | Pure functions, deterministic, có unit test riêng (`src/domains/talent/recruiter-workbench.derive.test.ts`). | `npx vitest run src/domains/talent/recruiter-workbench.derive.test.ts` xanh; `AC-02..AC-04`. | Helper phụ thuộc DB → tách ra; nếu helper đụng Prisma client, dừng. |
| `STEP-03` | `src/domains/talent/recruiter-workbench.read-service.ts` (hàm `getRecruiterWorkbenchList(prisma, ctx, query)`) | Implement read service với RLS, masking, sort/page trong `withDbContext`. | `npx vitest run src/domains/talent/recruiter-workbench.read-service.test.ts` xanh; `AC-05..AC-08`. | Nếu Prisma query vượt quá join bảng cho phép (xem §4.3) → dừng. |
| `STEP-04` | `app/api/admin/recruiter-workbench/route.ts` | Export `GET` handler: validate query (zod), gọi service, trả JSON. | `AC-09`, `AC-10`. | Nếu validation thiếu field hoặc thiếu role gate → dừng. |
| `STEP-05` | (a) `tests/db/recruiter-workbench.integration.test.ts` (NEW, RLS + masking + no-leak + role matrix) + (b) `vitest.integration-files.ts` (**registration-only edit**, đăng ký đúng MỘT entry `'tests/db/recruiter-workbench.integration.test.ts'` vào mảng `INTEGRATION_TEST_FILES`) | DB integration test chứng minh ADMIN/HR_MANAGER `view=ALL`; HR_STAFF `view=MINE only`; HR_STAFF `view=ALL` → 403; thiếu `CAN_VIEW_UNASSIGNED_POOL` mà gọi `view=UNASSIGNED` → 403; masking theo `CAN_VIEW_WORKER_SENSITIVE`; search không có sensitive permission chỉ tìm `fullName`; DTO nested shape không có top-level alias; `app_user_writer` + transaction-local GUC. **Registration-only** nghĩa là KHÔNG thay đổi shape/alias/entry khác của `vitest.integration-files.ts`; KHÔNG đụng `vitest*.config.ts`. | `git diff vitest.integration-files.ts` chỉ thêm 1 dòng; `npx vitest run tests/db/recruiter-workbench.integration.test.ts` xanh (sau khi đăng ký); `npx vitest run` không nhận file trong lane unit (exclude). `AC-11..AC-13`. | (a) Nếu leak PII → dừng, escalate. (b) `git diff` thêm >1 dòng hoặc sửa entry khác → revert, dừng. |
| `STEP-06` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/HANDOFF.md` | Báo cáo triển khai + diff + verify output. | `AC-14`. | Nếu HANDOFF thiếu evidence → trả Planner. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `RecruiterWorkbenchRow` có đủ 13 field theo RQ-02; `RecruiterWorkbenchListResponse` có `items`, `total`, `page`, `pageSize`. | `npm run typecheck`; document review trên `recruiter-workbench.types.ts`. |
| `AC-02` | `deriveNextAction` trả về đúng enum theo bảng §4.4 (chính xác 7 giá trị: `OPEN_INTAKE \| REQUEST_DOCS \| SCREEN_SUBMISSION \| SCHEDULE_SCREEN \| AWAITING_RESULT \| REVIEW_PLACEMENT \| NONE`) với test case bao phủ mỗi nhánh. | `npx vitest run src/domains/talent/recruiter-workbench.derive.test.ts`. |
| `AC-03` | `deriveHandler` trả `null` khi không có assignment ACTIVE trong cửa sổ `startsAt ‹= now < expiresAt` (hoặc `expiresAt IS NULL`); trả `assigneeUserId` khi có; rule ưu tiên theo RQ-09. | `npx vitest run src/domains/talent/recruiter-workbench.derive.test.ts`. |
| `AC-04` | `computeAge` trả `ageHours` đúng công thức `(now - openedAt)/1h`; `isOverdue` đúng rule RQ-08. | `npx vitest run src/domains/talent/recruiter-workbench.derive.test.ts`. |
| `AC-05` | Service chạy được với RLS context qua `withDbContext` (apply GUC `app.user_id` / `app.role` transaction-local); count + findMany trong cùng `tx`. | `npx vitest run src/domains/talent/recruiter-workbench.read-service.test.ts`. |
| `AC-06` | Service áp dụng đúng filter (`caseStatus`, `view`, `overdue`, `handlerUserId`, `search`) theo RQ-03; `view=MINE` chỉ trả case có `LaborProfileHandlingAssignment` ACTIVE với `assigneeUserId = ctx.userId`. | `npx vitest run src/domains/talent/recruiter-workbench.read-service.test.ts`. |
| `AC-07` | Service sort deterministic, tie-break bằng `placementCase.id`. | `npx vitest run src/domains/talent/recruiter-workbench.read-service.test.ts`. |
| `AC-08` | Service paging đúng (page ≥ 1, pageSize ∈ {20, 50, 100}; default 20). | `npx vitest run src/domains/talent/recruiter-workbench.read-service.test.ts`. |
| `AC-09` | `GET /api/admin/recruiter-workbench` validate query bằng zod; trả 400 nếu explicit invalid; **không** gọi DB khi invalid. | `npx vitest run tests/db/recruiter-workbench.integration.test.ts` (**ENV_BLOCKED** — pending `T0_CI_SYNTHETIC_DB_GATE`); unit-level route gate đã cover bởi `app/api/admin/recruiter-workbench/route.test.ts`. |
| `AC-10` | Endpoint trả 401 nếu thiếu auth; 403 nếu role ngoài allowlist (`ADMIN \| HR_MANAGER \| HR_STAFF`) hoặc requested view vượt authority. | `npx vitest run tests/db/recruiter-workbench.integration.test.ts` (**ENV_BLOCKED**); unit-level route gate đã cover bởi `app/api/admin/recruiter-workbench/route.test.ts`. |
| `AC-11` | DB integration: `withDbContext` với `app_user_writer` + transaction-local GUC chứng minh (a) ADMIN/HR_MANAGER `view=ALL` thấy đủ case ACTIVE; (b) HR_STAFF `view=MINE` chỉ thấy case mình handle; (c) HR_STAFF `view=ALL` bị 403; (d) thiếu `CAN_VIEW_UNASSIGNED_POOL` mà gọi `view=UNASSIGNED` bị 403. | `npx vitest run tests/db/recruiter-workbench.integration.test.ts` (**ENV_BLOCKED** — pending `T0_CI_SYNTHETIC_DB_GATE`). |
| `AC-12` | User không có `CAN_VIEW_WORKER_SENSITIVE` thấy `candidate.phone` và `candidate.cccdNumber` được mask; có permission thì thấy raw. Search không có sensitive permission chỉ tìm `fullName`; phone/CCCD search hoặc exact lookup với thiếu permission bị schema từ chối (400) hoặc 403 — không bao giờ raw. | `npx vitest run tests/db/recruiter-workbench.integration.test.ts` (**ENV_BLOCKED** — pending `T0_CI_SYNTHETIC_DB_GATE`); masking logic unit-test trong `src/domains/talent/recruiter-workbench.read-service.test.ts`. |
| `AC-13` | Endpoint không trả field nào ngoài `RecruiterWorkbenchRow` schema (no-leak); DTO nested shape `candidate.phone` / `candidate.cccdNumber`; KHÔNG có top-level alias. | `npx vitest run tests/db/recruiter-workbench.integration.test.ts` (**ENV_BLOCKED** — pending `T0_CI_SYNTHETIC_DB_GATE`); DTO shape unit-test trong `src/domains/talent/recruiter-workbench.read-service.test.ts`. |
| `AC-14` | HANDOFF.md có bảng changed file (`git status --porcelain`) và verify output; chỉ liệt kê file trong §4.2 In. | `git status --porcelain`; document review. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-04` | `AC-01`, `AC-09` |
| `RQ-02` | `STEP-01` | `AC-01` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-06`, `AC-09` |
| `RQ-04` | `STEP-03`, `STEP-05` | `AC-05`, `AC-11` |
| `RQ-05` | `STEP-03`, `STEP-05` | `AC-12` |
| `RQ-06` | `STEP-03`, `STEP-04`, `STEP-05` | `AC-10` |
| `RQ-07` | `STEP-02` | `AC-02` |
| `RQ-08` | `STEP-02` | `AC-04` |
| `RQ-09` | `STEP-02`, `STEP-03` | `AC-03` |
| `RQ-10` | `STEP-02`, `STEP-03` | `AC-06` |
| `RQ-11` | `STEP-03` | `AC-05`, `AC-07` |
| `RQ-12` | `STEP-01`, `STEP-03` | `AC-01` |
| `RQ-13` | `STEP-04` | `AC-09` |
| `RQ-14` | `STEP-03`, `STEP-04` | `AC-05` |
| `RQ-15` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06` | `AC-14` |
| `RQ-16` | `STEP-04` | `AC-09` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Lộ PII (phone/CCCD) do masking sai hoặc thiếu permission check. | Test AC-12 bắt buộc; nếu fail → revert commit, fix trước khi merge. |
| `RISK-02` | RLS context chưa pin đúng → HR_STAFF có thể thấy case ngoài `view=MINE`. | Test AC-11 chứng minh HR_STAFF `view=MINE only`; HR_STAFF `view=ALL` → 403; `view=UNASSIGNED` thiếu permission → 403; nếu fail → rollback. (Repo single-tenant, KHÔNG test “Org A vs Org B”.) |
| `RISK-03` | Client suy diễn `nextAction` ở UI dù server đã trả. | Document rule trong §4.4; P1-E1 TASK sẽ ghi ràng buộc "client chỉ render label/icon". |
| `RISK-04` | Tier 1 thêm DB column mới mà E0 chưa đề cập. | `Forbidden paths` chặn; nếu Tier 1 cần thêm column → mở round permission mới. |
| `RISK-05` | Conflict với worktree P1-B đang chạy song song. | File ownership tách rời (§4.2 Forbidden); nếu conflict thực sự xảy ra → tạm dừng E0 tới khi P1-B ACCEPTED. |
| `RISK-06` | Notification/reminder bị nhầm vào E0 vì case quá hạn. | §3.2 Build vs Automate ghi `N/A`; §1.2 non-goals cấm; P1-D canonical đã pin cho PlacementCase. |

## 8. Open Questions

- None.

Không được còn câu hỏi cần Owner quyết khi `Contract gate: READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|
| `v1.3` | `READY_FOR_EXECUTION` / `READY_TO_CODE` / `CLOSED` decision state; baseline `a88d87270f51fb63bba8f4f1144304dad4983007` (P1-B production-verified HEAD). P1-B dependency `ACCEPTED` (gate R-B0 đóng tại v1.3). E1 vẫn `PROPOSED_ONLY` với next gate `WAIT_P1_E0_INTERFACE_FREEZE` — không mở E1 worktree / viết E1 code ở round này. | T0 v1.3 materialize: P1-B đã merge tại main `a88d872` (production-verified); freeze dependency và mở gate implementation cho E0. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-25` | Initial contract (PROPOSED_ONLY, DRAFT) | Initial planning round cho P1-E0 |
| `v1.1` | `2026-09-25` | Applied 10-point correction batch C-01..C-10 from T0 v1.1: paths `app/...`; remove Org authority & add role × view matrix (AuthContext single-tenant); active-handler rule `status=ACTIVE AND startsAt lte now AND (expiresAt IS NULL OR expiresAt › now)` with deterministic `orderBy`; freeze 7-value `nextAction` enum (remove `CONTACT_CANDIDATE`); nested DTO `candidate.phone`/`candidate.cccdNumber` only with search no-oracle; `lastInteraction.kind ∈ {SUBMISSION, STATUS_CHANGE, null}`; remove `?case=` from `/admin/applications`; canonical test locations (`src/...test.ts` colocated, `tests/db/...integration.test.ts` in `vitest.integration-files.ts`, E1 colocated `app/**/*.test.tsx`); query validation behavior (400 API / safe defaults server / invalid URL = no DB hit); reconcile P1-B status (`2ed7e08` / `08e16508` / `BLOCKED_CORRECTION` / 53/53 migrations); remove "current reviewer on case" fallback. Status vẫn `PROPOSED_ONLY`; Next gate vẫn `WAIT_P1_B_ACCEPTED`. | T0 v1.1 correction batch (consolidated, 1 correction budget) |
| `v1.2` | `2026-09-25` | **T0 acceptance cleanup** — residual path/test-registry allowlist and truthful detail-link behavior; no new business decision. (1) §3.1 BUILD_VS_ADOPT: `src/app/api/admin/recruiter-workbench/` → `app/api/admin/recruiter-workbench/` (đồng bộ với cây `app/` root duy nhất; KHÔNG có `src/app/`). (2) In-scope roots: thêm 3 file test (`recruiter-workbench.read-service.test.ts`, `recruiter-workbench.derive.test.ts`, `tests/db/recruiter-workbench.integration.test.ts`); thêm `vitest.integration-files.ts` dưới dạng **registration-only edit** (đúng MỘT entry mới cho DB test, KHÔNG sửa shape/entry khác, KHÔNG đụng `vitest*.config.ts`). Forbidden tách rõ: `vitest*.config.ts` cấm; bỏ câu "chỉ register, không sửa config" ở `vitest.integration-files.ts` (giờ đã in-scope). `STEP-05` tách thành `STEP-05a` (DB test file) và `STEP-05b` (registration-only). (3) `RQ-12`: `detailHref = /admin/labor-profiles/{laborProfileId}` (KHÔNG `?case={caseId}`); lý do: `app/admin/labor-profiles/[id]/page.tsx` chỉ nhận `params: Promise‹{ id: string }›`, KHÔNG đọc `searchParams`. `caseId` vẫn trong DTO, chỉ không đưa vào URL. Deep-link trực tiếp tới PlacementCase là task riêng. `submissionHref = /admin/applications` cũng KHÔNG `?case=`. Status vẫn `PROPOSED_ONLY`; Next gate vẫn `WAIT_P1_B_ACCEPTED`. | T0 acceptance cleanup (no new correction budget) |
| `v1.3` | `2026-09-26` | **P1-B ACCEPTED → E0 READY_FOR_EXECUTION**: bump spec v1.2 → v1.3, baseline `8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b` → `a88d87270f51fb63bba8f4f1144304dad4983007` (P1-B production-verified baseline), status `PROPOSED_ONLY` → `READY_FOR_EXECUTION`, contract gate `DRAFT` → `READY_TO_CODE`, decision state `OPEN` → `CLOSED`, test environment `NOT_REQUIRED` → `READY`, current execution round `0` → `1`, next gate `WAIT_P1_B_ACCEPTED` → `TIER1_IMPLEMENTATION_FREEZE`. Semantic unchanged: đọc thêm `P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` §3 (R-B0) để ghi nhận P1-B đã merge tại main `a88d872`. E0 implementation worktree: `codex/t1a-p1e-recruiter-workbench` từ `a88d872` (cùng mốc với `codex/t1a-p1e-recruiter-workbench-planning` đã chốt ở `51d152d`). E1 (`hrp-p1-e1-recruiter-workbench-ui`) vẫn `PROPOSED_ONLY` với next gate `WAIT_P1_E0_INTERFACE_FREEZE` — KHÔNG có code E1 trong round này. | P1-B ACCEPTED gate opened; E0 materialize |
