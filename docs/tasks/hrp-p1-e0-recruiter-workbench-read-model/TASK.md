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
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1` |
| Baseline | `8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b` |
| Contract gate | `DRAFT` |
| Decision state | `OPEN` |
| Test environment | `NOT_REQUIRED` |
| Correction budget | `1` |
| In-scope roots | `src/domains/talent/recruiter-workbench.read-service.ts`, `src/domains/talent/recruiter-workbench.types.ts`, `src/app/api/admin/recruiter-workbench/route.ts` |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`, `package-lock.json`, `docs/PLANNER_HANDOVER.md`, `src/domains/applications/conversion.service.ts`, `src/domains/applications/screening.service.ts`, `src/domains/talent/placement-case.service.ts` (trừ chỗ gọi canonical helper), `src/domains/talent/labor-profile.service.ts` (trừ chỗ gọi canonical helper), `docs/discovery/realignment/P1B_PUBLIC_APPLY_RECONCILIATION.md`, `docs/tasks/hrp-p1-b-public-apply/**`, `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` |
| Required gates | `.ai-pipeline/scripts/verify-task.ps1`, `git diff --check`, `git status --porcelain`, `npm run typecheck`, `npm run lint` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `WAIT_P1_B_ACCEPTED` |

> Lane và audit là hai quyết định riêng. CRITICAL + LIGHT là bắt buộc vì read service đụng PII/RLS; rủi ro đã được ghi rõ trong `Audit reason`.

> Chỉ chuyển `READY_FOR_EXECUTION` sau khi `WAIT_P1_B_ACCEPTED` đã mở. Trong round planning này, trạng thái giữ `PROPOSED_ONLY` / `Contract gate = DRAFT`. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Recruiter (admin/reviewer thuộc một Organization) gọi được một endpoint read-only `GET /api/admin/recruiter-workbench` trả về danh sách xử lý ứng viên gồm: candidate (mask theo permission), current case stage/status, job/context, last interaction, server-derived nextAction, handler, age/overdue, primary action links (canonical routes).
- Mọi giá trị hiển thị được tính **server-side** với rule deterministic, có test cover. Client **chỉ render**.
- PII (phone, cccdNumber) được mask theo permission `CAN_VIEW_WORKER_SENSITIVE` — tái sử dụng `maskPhone`/`maskCccd`.
- Filter/sort/page đồng bộ với URL state.

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
| `EV-06` | `src/shared/auth/permission-resolver.ts` (`resolveEffectivePermissions`) | Pattern resolve permission cho masking; copy, không wrap. |
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
| `DEC-04` | `RecruiterWorkbenchRow.handler` derive theo thứ tự: (1) `LaborProfileHandlingAssignment` ACTIVE gần nhất, (2) fallback `UNASSIGNED` nếu không có. | `CHOSEN` |
| `DEC-05` | PII masking cho `candidatePhone`, `candidateCccdNumber` dùng `maskPhone` / `maskCccd`; chỉ mask qua permission `CAN_VIEW_WORKER_SENSITIVE`. | `CHOSEN` |
| `DEC-06` | Filter `view` mặc định là `MINE` cho reviewer, `ALL` cho admin; user có thể đổi qua URL state. | `CHOSEN` |
| `DEC-07` | E0 **không** thêm DB column mới; nếu cần `lastInteraction` thì chỉ join các bảng đã có (`candidate_submissions`, `application_status_history`, `placement_case`). | `CHOSEN` |
| `DEC-08` | E0 **không** phụ thuộc n8n availability; read path là HRP runtime thuần. | `CHOSEN` |
| `DEC-09` | RLS context: dùng `tx` Prisma với RLS (mẫu `labor-profile.read-service.ts`). Org boundary: filter `ctx.orgId` nếu role yêu cầu. | `CHOSEN` |
| `DEC-10` | Permission required: `CAN_VIEW_RECRUITER_WORKBENCH` (giả định đã có hoặc sẽ thuộc một permission-set hiện hữu; nếu chưa có thì mở round permission riêng). E0 không tự grant permission mới trong DB. | `CHOSEN` |

Không để `NEED_USER_DECISION` khi chuyển `READY_FOR_EXECUTION`.

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Read service (Prisma + RLS) | Internal pattern tại `src/domains/talent/labor-profile.read-service.ts` | `ADOPT` | `N/A` (internal) | `src/domains/talent/labor-profile.read-service.ts:32` | `src/domains/talent/recruiter-workbench.read-service.ts` (1 file mới) | Tận dụng pattern đã RLS-tested, không viết lại. |
| Permission resolver | Internal `src/shared/auth/permission-resolver.ts` (`resolveEffectivePermissions`) | `ADOPT` | `N/A` (internal) | `src/shared/auth/permission-resolver.ts` | wrapper boundary = helper call trong `recruiter-workbench.read-service.ts` | Pattern đã chuẩn hóa. |
| PII masking | Internal `src/shared/privacy/mask.ts` (`maskPhone`, `maskCccd`) | `ADOPT` | `N/A` (internal) | `src/shared/privacy/mask.ts` | wrapper boundary = helper call | Mask primitives đã có, đồng nhất với LaborProfile read. |
| Date/age formatting | Internal helpers trong codebase | `ADOPT` | `N/A` (internal) | dùng `Intl.DateTimeFormat` chuẩn (xem các trang admin hiện hữu) | wrapper boundary = helper nhỏ trong `recruiter-workbench.read-service.ts` hoặc shared util nếu có sẵn | Không cần thêm thư viện date. |
| API route handler | Next.js App Router chuẩn tại `app/api/admin/**` | `ADOPT` | `MIT` (Next.js) | `next@15` đã cài (xem `package.json`) | wrapper boundary = `route.ts` trong `src/app/api/admin/recruiter-workbench/` | Pattern đã có từ P1-A0/P1-A1. |
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
| `RQ-02` | Mỗi `RecruiterWorkbenchRow` chứa đủ các field cho outcome: `caseId`, `caseStatus` (`OPEN \| IN_PROGRESS \| READY_TO_PLACE \| CLOSED`), `openedAt`, `closedAt \| null`, `candidate: { laborProfileId, fullName, phone (mask), cccdNumber (mask), identityVerification, completeness }`, `job: { jobPostingId \| null, jobPostingTitle \| null, projectName \| null, companyName \| null }`, `lastInteraction: { at \| null, kind: SUBMISSION \| STATUS_CHANGE \| NOTE \| null }`, `nextAction: ServerDerivedNextAction`, `handler: { assigneeUserId \| null, assigneeName \| null, source \| null }`, `ageHours: number`, `isOverdue: boolean`, `overdueReason: HANDLER_EXPIRED \| CASE_AGE_THRESHOLD \| null`, `primaryActions: { detailHref, submissionHref \| null }`. |
| `RQ-03` | Query string (`zod`-validated) chấp nhận: `search`, `caseStatus`, `handlerUserId`, `view` (`MINE \| ALL \| UNASSIGNED`), `overdue` (`true \| false \| undefined`), `sort` (`ageDesc \| ageAsc \| openedDesc \| openedAsc`), `page` (≥1), `pageSize` (1–100, default 20). |
| `RQ-04` | RLS: query chạy trong `tx` với RLS context theo role hiện tại (`ctx.role`, `ctx.orgId`). Reviewer chỉ thấy row thuộc Org + (mặc định `view=MINE` chỉ case mình handle). |
| `RQ-05` | PII masking: `candidatePhone` và `candidateCccdNumber` chỉ trả raw khi user có `CAN_VIEW_WORKER_SENSITIVE`; ngược lại trả chuỗi mask qua `maskPhone`/`maskCccd`. |
| `RQ-06` | Permission: bắt buộc `CAN_VIEW_RECRUITER_WORKBENCH` (hoặc permission hiện hữu tương đương nếu Tier 1 chọn); nếu user thiếu permission, trả HTTP `403 FORBIDDEN` với body `{ error: 'PERMISSION_DENIED' }` (đồng nhất với pattern `labor-profile.read-service.ts:55`). |
| `RQ-07` | `nextAction` derive server-side bằng hàm `deriveNextAction(row)` deterministic, enum đóng `OPEN_INTAKE \| CONTACT_CANDIDATE \| REQUEST_DOCS \| SCHEDULE_SCREEN \| AWAITING_RESULT \| REVIEW_PLACEMENT \| NONE`. Mapping rule được document trong §4.4. |
| `RQ-08` | `ageHours` = `(now − openedAt) / 1h`, làm tròn 1 chữ số thập phân; `isOverdue = ageHours ≥ 72` HOẶC `handler.expiresAt < now`. Threshold 72h có thể chỉnh trong round sau, nhưng trong E0 cố định. |
| `RQ-09` | `handler` derive: nếu `LaborProfileHandlingAssignment` có record `status=ACTIVE` và `now < expiresAt (nếu expiresAt != null)`, lấy assigneeUserId; nếu không, `assigneeUserId = null`, `source = null`, `assigneeName = null`. |
| `RQ-10` | `lastInteraction.kind` derive: ưu tiên `STATUS_CHANGE` mới nhất, fallback `SUBMISSION` mới nhất; nếu không có, `kind = null`. Không join bảng mới. |
| `RQ-11` | Query consistency: `count` + `findMany` chạy trong cùng `tx`; sort ổn định (deterministic tie-break bằng `placementCase.id`). |
| `RQ-12` | `primaryActions.detailHref` = `/admin/labor-profiles/<laborProfileId>?case=<caseId>`; `submissionHref` = `/admin/applications?case=<caseId>` nếu có submission ACTIVE liên kết, ngược lại `null`. |
| `RQ-13` | E0 **không** nhận body POST/PATCH/DELETE; route handler chỉ export `GET`. Mọi mutation thuộc task khác (P1-F, conversion, screening). |
| `RQ-14` | E0 không cache server-side; mỗi request là query thẳng DB. Không thêm dependency cache mới. |
| `RQ-15` | E0 không đụng `prisma/schema.prisma` và **không** tạo migration mới. |

### 4.2 Scope boundaries

- **In:**
  - File mới: `src/domains/talent/recruiter-workbench.read-service.ts`, `src/domains/talent/recruiter-workbench.types.ts`, `src/app/api/admin/recruiter-workbench/route.ts`.
  - Unit test: `tests/unit/recruiter-workbench.read-service.test.ts`, `tests/unit/recruiter-workbench.derive.test.ts`.
  - Integration test (RLS + masking): `tests/integration/recruiter-workbench.rls.test.ts` (theo pattern `tests/integration/labor-profiles.read.test.ts` nếu có).
- **Out:**
  - `prisma/schema.prisma`, `prisma/migrations/**`, `package.json`, `package-lock.json`.
  - `src/domains/applications/conversion.service.ts`, `src/domains/applications/screening.service.ts`, `src/domains/talent/placement-case.service.ts`, `src/domains/talent/labor-profile.service.ts` — **chỉ được đọc như canonical helper; KHÔNG sửa logic**.
  - `src/domains/talent/labor-profile.read-service.ts` — **không sửa** (copy pattern, không refactor).
  - `src/shared/auth/*`, `src/shared/privacy/*`, `src/shared/ui/data-table/*` — chỉ dùng, không sửa.
  - P1-B worktree, P1-A0/A1 frozen files, `docs/PLANNER_HANDOVER.md`, AFF migrations, `docs/tasks/hrp-p1-b-public-apply/**`, `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**`.
  - UI page — thuộc P1-E1.
  - Notification/n8n workflow — thuộc task riêng.
- **Allowed task artifacts:** `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**` (HANDOFF.md, AUDIT.md, evidence/).

### 4.3 Domain boundaries

- **Data/state:**
  - Source: `placement_case`, `labor_profile`, `labor_profile_handling_assignment`, `candidate_submissions`, `application_status_history`, `job_posting`, `job_opening`.
  - Read-only. Không insert/update/delete trong E0.
  - Không thêm DB column mới.
- **Permission/security:**
  - RLS qua `tx` Prisma + `resolveEffectivePermissions`.
  - Permission gate: `CAN_VIEW_RECRUITER_WORKBENCH` (hoặc tương đương — Tier 1 chốt khi freeze).
  - PII masking qua `maskPhone` / `maskCccd`.
- **Interface/API:**
  - REST `GET /api/admin/recruiter-workbench` (Next.js App Router).
  - JSON contract deterministic; field optional có `null` thay vì `undefined`.
  - Zod validation cho query string.
- **Migration/rollback:**
  - Không migration. Rollback = revert commit / xóa 3 file mới + tests.

### 4.4 `nextAction` mapping rule (deterministic, server-only)

Áp dụng theo thứ tự ưu tiên (early return):

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

> Lưu ý: enum trong RQ-07 liệt kê `OPEN_INTAKE | CONTACT_CANDIDATE | REQUEST_DOCS | SCHEDULE_SCREEN | AWAITING_RESULT | REVIEW_PLACEMENT | NONE`. Bảng trên dùng `SCREEN_SUBMISSION` chỉ để minh họa rule; Tier 1 sửa lại enum cuối khi freeze để khớp `SCREEN_SUBMISSION` hoặc alias `SCHEDULE_SCREEN`. Trong mọi trường hợp, enum là server-owned và đóng; client không được thêm giá trị mới.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/recruiter-workbench.types.ts` | Định nghĩa `RecruiterWorkbenchRow`, `RecruiterWorkbenchListResponse`, `RecruiterWorkbenchQuery` (zod schema + TS type). | `npm run typecheck` xanh; `AC-01`. | Nếu type không khớp với bất kỳ field nào trong RQ-02 → dừng, trả Planner. |
| `STEP-02` | `src/domains/talent/recruiter-workbench.read-service.ts` (helper `deriveNextAction`, `deriveHandler`, `deriveLastInteraction`, `computeAge`) | Pure functions, deterministic, có unit test riêng. | `tests/unit/recruiter-workbench.derive.test.ts` xanh; `AC-02..AC-04`. | Helper phụ thuộc DB → tách ra; nếu helper đụng Prisma client, dừng. |
| `STEP-03` | `src/domains/talent/recruiter-workbench.read-service.ts` (hàm `getRecruiterWorkbenchList(tx, ctx, query)`) | Implement read service với RLS, masking, sort/page. | `tests/unit/recruiter-workbench.read-service.test.ts` xanh; `AC-05..AC-08`. | Nếu Prisma query vượt quá join bảng cho phép (xem §4.3) → dừng. |
| `STEP-04` | `src/app/api/admin/recruiter-workbench/route.ts` | Export `GET` handler: validate query (zod), gọi service, trả JSON. | `AC-09`, `AC-10`. | Nếu validation thiếu field hoặc thiếu permission check → dừng. |
| `STEP-05` | Tests integration (RLS + masking + no-leak) | Chứng minh reviewer không thấy case Org khác; thiếu `CAN_VIEW_WORKER_SENSITIVE` thì phone mask. | `tests/integration/recruiter-workbench.rls.test.ts` xanh; `AC-11..AC-13`. | Nếu leak PII → dừng, escalate. |
| `STEP-06` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/HANDOFF.md` | Báo cáo triển khai + diff + verify output. | `AC-14`. | Nếu HANDOFF thiếu evidence → trả Planner. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `RecruiterWorkbenchRow` có đủ 13 field theo RQ-02; `RecruiterWorkbenchListResponse` có `items`, `total`, `page`, `pageSize`. | `npm run typecheck`; document review trên `recruiter-workbench.types.ts`. |
| `AC-02` | `deriveNextAction` trả về đúng enum theo bảng §4.4 với 12 test case bao phủ mỗi nhánh. | `npx vitest run tests/unit/recruiter-workbench.derive.test.ts`. |
| `AC-03` | `deriveHandler` trả `null` khi không có assignment ACTIVE; trả `assigneeUserId` khi có; rule ưu tiên theo RQ-09. | `npx vitest run tests/unit/recruiter-workbench.derive.test.ts`. |
| `AC-04` | `computeAge` trả `ageHours` đúng công thức `(now - openedAt)/1h`; `isOverdue` đúng rule RQ-08. | `npx vitest run tests/unit/recruiter-workbench.derive.test.ts`. |
| `AC-05` | Service chạy được với RLS context; count + findMany trong cùng `tx`. | `npx vitest run tests/unit/recruiter-workbench.read-service.test.ts`. |
| `AC-06` | Service áp dụng đúng filter (`caseStatus`, `view`, `overdue`, `handlerUserId`, `search`) theo RQ-03. | `npx vitest run tests/unit/recruiter-workbench.read-service.test.ts`. |
| `AC-07` | Service sort deterministic, tie-break bằng `placementCase.id`. | `npx vitest run tests/unit/recruiter-workbench.read-service.test.ts`. |
| `AC-08` | Service paging đúng (page ≥ 1, pageSize 1–100). | `npx vitest run tests/unit/recruiter-workbench.read-service.test.ts`. |
| `AC-09` | `GET /api/admin/recruiter-workbench` validate query bằng zod; trả 400 nếu sai. | `npx vitest run tests/integration/recruiter-workbench.rls.test.ts`. |
| `AC-10` | Endpoint trả 401 nếu thiếu auth; 403 nếu thiếu permission. | `npx vitest run tests/integration/recruiter-workbench.rls.test.ts`. |
| `AC-11` | Reviewer Org A không thấy case Org B. | `npx vitest run tests/integration/recruiter-workbench.rls.test.ts`. |
| `AC-12` | User không có `CAN_VIEW_WORKER_SENSITIVE` thấy `candidatePhone` và `candidateCccdNumber` được mask; có permission thì thấy raw. | `npx vitest run tests/integration/recruiter-workbench.rls.test.ts`. |
| `AC-13` | Endpoint không trả field nào ngoài `RecruiterWorkbenchRow` schema (no-leak). | `npx vitest run tests/integration/recruiter-workbench.rls.test.ts`. |
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

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Lộ PII (phone/CCCD) do masking sai hoặc thiếu permission check. | Test AC-12 bắt buộc; nếu fail → revert commit, fix trước khi merge. |
| `RISK-02` | Reviewer Org A thấy case Org B do RLS context chưa pin đúng. | Test AC-11 với 2 Org fixture; nếu fail → rollback. |
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
| (chưa có) | | |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-25` | Initial contract (PROPOSED_ONLY, DRAFT) | Initial planning round cho P1-E0 |
