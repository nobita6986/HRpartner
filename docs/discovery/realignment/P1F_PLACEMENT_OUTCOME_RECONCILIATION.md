# P1-F — Placement Command API Reconciliation

**Pipeline V2 — Discovery / Realignment**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Correction budget (this doc) | `1` (đã đốt cho v1.0; chưa bước vào TASK round) |
| Baseline (origin/main @ planning pin) | `a88d87270f51fb63bba8f4f1144304dad4983007` (P1-B `ACCEPTED`, PR #52 merged) |
| Frozen HEAD | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Semantic implementation HEAD | `a88d87270f51fb63bba8f4f1144304dad4983007` (F0 chưa code; HEAD chính là baseline) |
| P1-A0 / P1-A1 / P1-B state | `ACCEPTED` trên main |
| P1-C / P1-D state | `ACCEPTED` trên main (N1 `placement_case` foundation + N1 intake writer; DEC-01..DEC-14 đã freeze) |
| P1-E state | E0/E1 `PROPOSED_ONLY`; đã freeze E0/E1 contract (planning pin `51d152d`); next gate `WAIT_P1_B_ACCEPTED` (P1-B đã ACCEPTED → E0 ready-to-code; E1 vẫn chờ E0 interface freeze). F0 **không** đụng E0/E1. |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1f0-placement-command-planning` |
| Branch | `codex/t1b-p1f0-placement-command-planning` |
| Owner of this doc | T1B (independent) |
| Next gate | `WAIT_T0_CONTRACT_CORRECTION` (T0 contract review); F0 = `DRAFT` only, không mở `READY_TO_CODE` ở round này |

## 0. Mục đích & phạm vi

Tài liệu này **reconcile** trạng thái thật của canonical Placement lifecycle
(`SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED`) và các khả năng
backend/UI/admin-route liên quan trên `origin/main@a88d8727`, rồi lập
**capability matrix** cho phần nhỏ nhất còn thiếu để recruiter có thể gọi
**named canonical placement commands** qua API (P1-F0).

Ngoài phạm vi round này (đã frozen hoặc đặt task riêng):

- **P1-A0** JobPosting authoring/publish — `ACCEPTED`.
- **P1-A1** Canonical public job detail + continuous cutover — `ACCEPTED`.
- **P1-B** Public apply with candidate intake & provenance — `ACCEPTED` trên main.
- **P1-C** LaborProfile create-or-match — `ACCEPTED` (N1/N2/N3 territory).
- **P1-D** PlacementCase (state lifecycle + handler/nextAction/age/overdue + HandlingAssignment liên quan) — `ACCEPTED`.
- **P1-E0** Simple Recruiter Workbench read-model — `PROPOSED_ONLY` (planning pin `51d152d`); E0 sẽ mở `READY_TO_CODE` sau P1-B ACCEPTED (đã thỏa).
- **P1-E1** Simple Recruiter Workbench UI — `PROPOSED_ONLY`; chờ E0 interface freeze.
- **P1-F0 (round này)** Placement Command API + backend adapter — chỉ **thin contract** cho named canonical commands; **không** mở UI workbench.
- **P1-F1 (theo sau)** Recruiter UI actions cho placement commands (post E0/E1 interface freeze) — task riêng.
- **N-series** Notification/n8n — `OUT_OF_SCOPE`; xem `docs/N8N_AUTOMATION_BOUNDARY.md`. n8n **không** nắm placement transition authority; chỉ nhận post-commit outbox event.

Tài liệu này **không** sửa `docs/PLANNER_HANDOVER.md` (T0-owned),
**không** sửa E0/E1 task docs, **không** sửa P1-B docs, **không** mở PR,
**không** gọi T3.

## 1. Canonical naming

| Canonical ID | Tên | Vai trò |
| --- | --- | --- |
| P1-F | Placement conversions & formal placement (lifecycle `SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED`) | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §29 — contract hóa trong doc này |
| **P1-F0** | **Placement Command API + backend adapter** | **Thin contract + reconciliation trong doc này; TASK tại `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md`** |
| P1-F1 | Recruiter UI actions cho placement commands | Task riêng; post E0/E1 interface freeze |
| P1-E0/E1 | Simple Recruiter Workbench (read-model + UI) | E0/E1 `PROPOSED_ONLY` (planning pin `51d152d`); F0 **không** đụng |

Các tên provisional/tạm cũ **bị cấm** trong F0:

- "placement panel MP-3C" → trỏ tới **legacy V6 assignment-placement** (`src/domains/applications/placement-ui.ts` + `assignment-placement.service.ts`) — **KHÔNG** dùng cho F0. F0 chỉ nói về N3 `Placement` lifecycle (DEC-03..DEC-12).
- "Worker/Episode/Assignment placement" → trỏ tới MP-3C territory; F0 giữ nguyên không can thiệp.
- "atomic workforce bridge" → thuộc **N4 territory**, **OUT_OF_SCOPE** cho F0. F0 chỉ lock DEC-07 "HRP-managed EFFECTIVE REJECT (N4 owns)".

## 2. Capability Matrix

Phân loại:

- `IMPLEMENTED` — code đã ở `origin/main`, không cần sửa để dùng.
- `PARTIAL` — code một phần ở main, cần bổ sung (ghi rõ phần thiếu).
- `MISSING` — chưa có trên main, cần task mới (ghi rõ task nào).
- `REFERENCE_ONLY` — tài liệu/decision log, không phải implementation.
- `OUT_OF_SCOPE` — thuộc task khác (F1, N-series, N4, v.v.).

### 2.1 Schema (`prisma/schema.prisma`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| Enum `PlacementCaseStatus` (`OPEN`/`IN_PROGRESS`/`READY_TO_PLACE`/`CLOSED`) | `IMPLEMENTED` | `prisma/schema.prisma:1516` | Stage enum (NEW/CONTACTING/...) deferred — đã ghi trong schema comment; **KHÔNG** mở round này. |
| Enum `PlacementStatus` (`SELECTED`/`CONFIRMED`/`EFFECTIVE`/`FAILED`/`CANCELLED`) | `IMPLEMENTED` | `prisma/schema.prisma:1541` | DEC-03 / DEC-05 freeze. |
| Enum `ServiceModel` (`STAFFING_SUPPLY`/`LABOR_LEASING`/`RECRUITMENT_SERVICE`/`REFERRAL_SERVICE`) | `IMPLEMENTED` | `prisma/schema.prisma:1532` | DEC-01; derive `managementMode` qua STAFFING_SUPPLY/LABOR_LEASING → HRP_MANAGED, RECRUITMENT_SERVICE/REFERRAL_SERVICE → CLIENT_MANAGED. |
| Model `PlacementCase` (`id`, `laborProfileId`, `status`, `openedAt`, `closedAt`, `closeReason`, `placements[]`, `submissions[]`) | `IMPLEMENTED` | `prisma/schema.prisma:1549` | Migration `20260912140411_n1_placement_case_foundation` (N1). |
| Partial unique index `placement_case_labor_profile_id_active_unique` (max 1 ACTIVE case / LaborProfile) | `IMPLEMENTED` | `prisma/schema.prisma:1568` (comment) + `prisma/migrations/20260912140411_n1_placement_case_foundation` | N1 invariant. |
| Model `Placement` (`id`, `placementCaseId`, `laborProfileId`, `jobOpeningId?`, `clientCompanyId?`, `projectId?`, `serviceModelSnapshot?`, `status`, `selectedAt`, `confirmedAt?`, `effectiveAt?`, `evidenceAcknowledgedAt?`, `evidenceAcknowledgedByUserId?`, `evidenceAcknowledgementRef?`, `failureReason?`, `sourceCandidateSubmissionId?`, `createdByUserId?`, `version`, `assignments[]`) | `IMPLEMENTED` | `prisma/schema.prisma:1587` | Migration `20260914212136_n3_service_model_placement` (N3). |
| Unique partial index `placements_active_unique` (placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED') — anti-race DEC-04a | `IMPLEMENTED` | `prisma/schema.prisma:1628` (comment) + migration `20260914212136_n3_service_model_placement` | `COALESCE(job_opening_id, '__NONE__')` để enforce cả NULL. |
| Optimistic locking `version` trên `Placement` | `IMPLEMENTED` | `prisma/schema.prisma:1608` | DEC-12. |
| FK chain: `Placement → PlacementCase → LaborProfile` + `→ JobOpening → StaffingOrder → Project → ClientCompany` | `IMPLEMENTED` | `prisma/schema.prisma:1613-1618` | DEC-06; chain broken → `PlacementValidationError`. |
| RLS `placements` (HR_MANAGER read/write) | `IMPLEMENTED` | Migration RLS của N3 (FORCE RLS — verify trong integration test `(vii)`) | F0 reuse; **không** mở RLS riêng. |
| **Mở schema mới cho F0** (column mới trên `Placement`/`PlacementCase`, bảng mới, hoặc enum mới) | `MISSING` (và **KHÔNG** được mở trong round này) | — | Evidence: schema hiện tại đủ để biểu diễn tất cả state trong DEC-03/05/07/08. F0 chỉ wrap service hiện hữu bằng admin API + permission; **không** cần column/bảng/enum mới. Nếu phát hiện cần thiết trong implementation round, mở Owner Decision. |

### 2.2 Backend service & lifecycle (`src/domains/talent/placement.*`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `createPlacement` (→ SELECTED) — race-safe nhờ `placements_active_unique` partial unique index; idempotent replay qua `(caseId, openingId)` | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:103` (`createPlacement`) | DEC-04a, DEC-06, DEC-09, DEC-10. |
| `confirmPlacement` (SELECTED → CONFIRMED) — conditional UPDATE với status guard | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:454` | DEC-05, DEC-12. |
| `markPlacementEffective` (CONFIRMED → EFFECTIVE) — **chỉ Client-managed** (DEC-07); yêu cầu evidence (`clientAcknowledgedAt`, `clientAcknowledgedByUserId`, `acknowledgementRef`) cho Client-managed (DEC-08, AC-07); persist evidence columns cho audit | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:458` | HRP-managed → REJECT với lý do `HRP_EFFECTIVE_FORBIDDEN` (N4 owns). |
| Client-managed EFFECTIVE atomic close PlacementCase (status='CLOSED' + `closedAt` + `closeReason='PLACEMENT_EFFECTIVE by <actorId> at <ISO>'`) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:420` (`closePlacementCaseSuccess`) | AC-07; nếu case đã CLOSED concurrent → rollback toàn transaction (PlacementIdempotencyConflictError). |
| `failPlacement` (SELECTED \| CONFIRMED → FAILED) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:468` | DEC-05; `failureReason` ghi `Marked FAILED by <actorId> at <ISO>`. |
| `cancelPlacement` (SELECTED \| CONFIRMED → CANCELLED) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:472` | DEC-05; `failureReason` ghi `Marked CANCELLED by <actorId> at <ISO>`. |
| Pure state machine `canTransition` / `computeManagementMode` / `allowedTransitions` / `isActivePlacement` / `isTerminalPlacement` | `IMPLEMENTED` | `src/domains/talent/placement.lifecycle.ts:51-113` | DEC-02, DEC-05; không phụ thuộc Prisma. |
| `assertClassifiedJobOpening` + `resolveClientCompanyIdForJobOpening` (chain JobOpening → StaffingOrder → Project → ClientCompany) | `IMPLEMENTED` | `src/domains/talent/placement.resolution.ts:26-124` | DEC-06, DEC-10. |
| `PlacementError` taxonomy (`PlacementValidationError`/`InvalidStateTransitionError`/`PlacementNotFoundError`/`PlacementIdempotencyConflictError`) với `code` cố định | `IMPLEMENTED` | `src/domains/talent/placement.errors.ts:14-60` | Mapping HTTP class rõ: validation 400-class, state transition 409-class, not-found 404-class, idempotency conflict 409-class. |
| Idempotency replay cho transition commands (same `placementId` + same target state → no-op, `replayed=true`; conflict → throw `PlacementIdempotencyConflictError`) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:312-407` (`runTransition`); round-4 fix F-09 (concurrent command đổi sang terminal khác → throw conflict) | DEC-09. |
| Optimistic locking `version` increment mỗi transition | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:365` | DEC-12. |
| `openPlacementCase` (intake writer — N1) | `IMPLEMENTED` | `src/domains/talent/placement-case.service.ts:111` | DEC-04 + V6P-003; P1-B đã consume; F0 chỉ tham chiếu nếu command cần mở case (F0 không mở — chỉ transition). |
| Unit test cho `placement.service` (create/confirm/effective/FAIL/cancel + race-loser + state-mismatch) | `IMPLEMENTED` | `src/domains/talent/placement.service.test.ts` (≥30 it-blocks) | Service-level coverage rất đầy đủ. |
| Unit test cho `placement.lifecycle` (state machine pure functions) | `IMPLEMENTED` | `src/domains/talent/placement.lifecycle.test.ts` | — |
| Unit test cho `placement.resolution` (FK chain) | `IMPLEMENTED` | `src/domains/talent/placement.resolution.test.ts` | — |
| Unit test cho `placement-case.service` (race-safe openPlacementCase) | `IMPLEMENTED` | `src/domains/talent/placement-case.service.test.ts` | — |
| DB integration test (synthetic PG) — placement lifecycle end-to-end | `IMPLEMENTED` | `tests/db/placement-lifecycle-integration.test.ts` (15 scenarios: i..xv + ENV_BLOCKED) | Cover SELECTED→CONFIRMED; client-managed CONFIRMED→EFFECTIVE (evidence persisted + case closed); HRP-managed EFFECTIVE reject; retry idempotent; FK chain broken; RLS HR_MANAGER vs PUBLIC; UNIQUE partial index race; case CLOSED reject; race-loser; atomic rollback. |
| **Canonical admin API route** cho named placement commands (POST `/api/admin/placements/...`) | `MISSING` | — | F0 là task mới; route shape định nghĩa trong TASK §4.1. |
| **Backend adapter** wrap `placement.service.ts` với AuthContext + permission check + RLS GUC + error→HTTP mapping | `MISSING` | — | F0 là task mới; thin layer, không sửa service hiện hữu. |
| **Idempotency-Key** ở route layer cho placement commands (transition commands) | `MISSING` (transition commands chưa có route wrapper) | — | F0 chọn wrap qua `withIdempotency` cho transition commands (nhất quán với `openPlacementCaseWithIdempotency` ở `placement-case.service.ts:156`); KHÔNG wrap cho `createPlacement` vì service đã race-safe qua unique partial index (DEC-04a, DEC-09) — idempotency-key chỉ là redundancy + replay convenience. |
| **Audit-trail hook** cho placement transition (AuditFinding/evidence log) | `OUT_OF_SCOPE` | — | Thuộc territory audit/observability task riêng. F0 chỉ log structured `placementId/transition/actorId/correlationId` qua `src/shared/observability/logger.ts`. |
| **ProjectAssignment / Worker creation** đi kèm EFFECTIVE | `OUT_OF_SCOPE` (N4) | — | DEC-07: HRP-managed EFFECTIVE thuộc N4 atomic workforce bridge. Client-managed EFFECTIVE KHÔNG ép Worker creation (Plan §29: "Do not force Worker creation for client-managed direct hire") — F0 giữ nguyên `closePlacementCaseSuccess` không tạo Worker. |

### 2.3 UI / panel / admin routes (`app/admin/**`, `app/api/admin/**`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| Canonical admin route `app/api/admin/applications/[id]/actions/{screen|qualify|reject|convert|handler}/route.ts` | `IMPLEMENTED` (MP-3C territory, KHÔNG thuộc F0) | `app/api/admin/applications/[id]/actions/{screen,qualify,reject,convert}/route.ts` + `handler.ts` | Đây là V6 application state machine, **KHÔNG** phải placement lifecycle. F0 không đụng. |
| `app/admin/applications/page.tsx` (MP-3C queue + drawer) | `IMPLEMENTED` (MP-3C territory, KHÔNG thuộc F0) | `app/admin/applications/page.tsx` | V6 assignment-placement (`Worker/Episode/Assignment` qua `assignment-placement.service.ts`), KHÔNG phải N3 `Placement`. F0 không đụng. |
| `src/domains/applications/placement-ui.ts` (MP-3C action matrix + screen/qualify/reject/convert/placement labels) | `IMPLEMENTED` (MP-3C territory, KHÔNG thuộc F0) | `src/domains/applications/placement-ui.ts` | Comment dòng 5–10 xác nhận đây là MP-3C STEP-07 RQ-09; mirror server gates cho V6 application state machine. F0 **không** dùng file này cho N3 Placement commands. |
| `src/domains/applications/placement-panel.tsx` (MP-3C preview/override/activate drawer pieces) | `IMPLEMENTED` (MP-3C territory, KHÔNG thuộc F0) | `src/domains/applications/placement-panel.tsx` | MP-3C only. F0 không đụng. |
| `app/admin/labor-profiles/page.tsx` + `[id]/page.tsx` + `handling-assignment-manager.tsx` | `IMPLEMENTED` (A0/AFF-05A territory) | `app/admin/labor-profiles/**` | E0 reuse `getLaborProfileDetail` để derive workbench list. F0 không đụng. |
| **Canonical placement command panel** (table/list placement + actions cho recruiter) | `MISSING` | — | Thuộc **P1-F1** (post E0/E1 interface freeze). F0 chỉ expose API; UI ở F1. |
| **Workbench row placement actions** (transition buttons trong recruiter workbench list) | `MISSING` (và `OUT_OF_SCOPE` cho F0) | — | Thuộc P1-F1 + P1-E1 follow-up. F0 không mở. |

### 2.4 Auth, permission, RLS

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `AuthContext` (`userId`, `role: SystemRole`, `vendorId?`, `workerId?`) + `getAuthContext(req)` + `buildAuthContextFromClaims` | `IMPLEMENTED` | `src/shared/auth/auth-context.ts:20-127` | F0 route dùng `getAuthContext(req)` rồi map 401 nếu thiếu/invalid. |
| `withDbContext(prisma, ctx, cb)` — transaction-local RLS GUC (`app.user_id`, `app.role`) | `IMPLEMENTED` | `src/shared/auth/with-db-context.ts:34-43` | F0 wrap mọi command transaction. |
| `applyRlsContext` + `rls-context.ts` (`set_config(..., true)`) | `IMPLEMENTED` | `src/shared/auth/rls-context.ts` | Tự động apply qua `withDbContext`. |
| `withAuthorizedDb` (verify `actorId` + permission trước khi transaction) | `IMPLEMENTED` | `src/shared/auth/with-authorized-db.ts` | F0 reuse để short-circuit trước khi mở transaction. |
| `permission-resolver.ts` (`resolveEffectivePermissions(userId)`) — đọc từ bảng `permissions` seeded từ `permission-catalog.ts` | `IMPLEMENTED` | `src/shared/auth/permission-resolver.ts` | F0 dùng `resolveEffectivePermissions(ctx.userId)` rồi check permission code cần thiết. |
| `permission-catalog.ts` — 14 codes, không có code thuộc Placement/Talent domain | `PARTIAL` | `src/shared/auth/permission-catalog.ts:37-109` | Catalog hiện có: `CAN_MANAGE_PERMISSIONS`, `CAN_CREATE_WORKER`, `CAN_VIEW_UNASSIGNED_POOL`, `CAN_VIEW_WORKER_SENSITIVE`, `CAN_APPROVE_PAYROLL`, `CAN_FORCE_LOCK_STATEMENT`, `CAN_VIEW_STATEMENT_MARGIN`, `CAN_OVERRIDE_REFERRAL_GUARD`, `CAN_APPROVE_TICKET_LEVEL2`, `CAN_PROCESS_TICKET`, `CAN_PUBLISH_JOB`, `CAN_EDIT_CONTRACT`, `CAN_EDIT_HOMEPAGE_SETTINGS`, `CAN_MANAGE_MEDIA`. **Không có** `CAN_*` cho placement commands. Đây là **gap bắt buộc** F0 phải close: mở nhóm mới + codes mới (xem §3 R-F1). |
| Permission catalog seed (`prisma/seed.mjs` §4.2) | `PARTIAL` | `prisma/seed.mjs` | F0 nếu mở codes mới cần update seed + ghi nhận additive migration nếu cần. F0 hiện lock **không** tự ý thêm code mới trong round này — phát hiện là gap; mở Owner Decision (xem §3 R-F1). |
| RLS placements (FORCE RLS) | `IMPLEMENTED` | Migration RLS của N3 + verify qua integration test `(vii)` | F0 không mở RLS riêng; chỉ apply GUC qua `withDbContext`. |

### 2.5 Notification / n8n boundary

| Capability | Tag | Ghi chú |
| --- | --- | --- |
| HRP-side outbox event `PlacementTransitionCommitted` (eventId, correlationId, payload `{placementId, fromStatus, toStatus, managementMode, placementCaseId, laborProfileId, clientCompanyId?, projectId?, evidenceAcknowledgedAt?}`) | `MISSING` (và `OUT_OF_SCOPE` cho F0) | Thuộc **N-series task** (notification/n8n). F0 **không** mở outbox schema hay producer; chỉ structured log `placementId/transition/actorId/correlationId` qua `src/shared/observability/logger.ts`. |
| n8n workflow consume outbox event → fan-out kênh | `OUT_OF_SCOPE` | Thuộc N-series; xem `docs/N8N_AUTOMATION_BOUNDARY.md` §4 (cấm: "Placement, CommissionLedger, payroll or other money calculations" + "Domain concurrency locks, mutation idempotency authority or canonical deduplication"). n8n **không** nắm placement transition authority. |
| In-app notification cho assignee khi placement EFFECTIVE | `OUT_OF_SCOPE` | Thuộc N-series. |

## 3. Residual thật sự trước F0

Dựa trên capability matrix §2.1–§2.5 và code đang ở `origin/main@a88d8727`,
**residual thật sự** trước F0 gồm:

1. **(R-F1) Permission catalog gap.** Không có `CAN_*` code thuộc Talent/Placement
   domain. Comment ở `placement.service.ts:51` nói rõ "Caller đã verify quyền
   `CAN_MANAGE_TALENT_CASE` hoặc ADMIN/HR_MANAGER" — code này **chưa tồn tại**
   trong catalog. F0 phải định nghĩa nhóm permission mới + codes (xem đề xuất
   §3 R-F1.A) hoặc chính sách "ADMIN/HR_MANAGER only — không cần catalog code".
   Quyết định thuộc Owner/T0 (xem §3 R-F1.B).

   - **R-F1.A (đề xuất Tier 1)** — Nhóm mới `TALENT` trong `PERMISSION_GROUPS`
     + codes:
     - `CAN_CREATE_PLACEMENT` (gọi `createPlacement`) — nhóm TALENT.
     - `CAN_TRANSITION_PLACEMENT` (gọi `confirmPlacement`/`failPlacement`/`cancelPlacement`) — nhóm TALENT.
     - `CAN_RECORD_PLACEMENT_EFFECTIVE` (gọi `markPlacementEffective` Client-managed) — nhóm TALENT.
     - Seed mặc định cho `ADMIN`, `HR_MANAGER`; `HR_STAFF` không tự động được.
     - **Owner Decision cần thiết** nếu Owner muốn khóa chỉ role-level (không catalog) hoặc muốn gom vào `CAN_MANAGE_TALENT_CASE` đơn lẻ.
   - **R-F1.B (Owner Decision cần)** — xác nhận mô hình phân quyền placement:
     - Option (i) catalog code rõ ràng (đề xuất ở trên).
     - Option (ii) chỉ role-level (`ADMIN`, `HR_MANAGER` được, role khác 403) — đơn giản nhưng không tận dụng được `resolveEffectivePermissions` đã có.
     - Option (iii) hybrid: một code duy nhất `CAN_MANAGE_PLACEMENT` (gồm create + transition + effective) cho cả 3 lệnh, ADMIN/HR_MANAGER mặc định.
     - **Recommendation (Tier 1)**: Option (i) — 3 codes tách biệt để có thể mở rộng granularity sau (vd HR_STAFF chỉ được FAIL/CANCEL, không được EFFECTIVE).

2. **(R-F2) Canonical admin API cho placement commands.** Hiện không có route
   `app/api/admin/placements/**`. F0 phải định nghĩa exact route shape, request
   body, response body, error mapping. Đề xuất route shape ở TASK §4.1.

3. **(R-F3) Idempotency-Key header cho transition commands.** `placement.service.ts`
   đã có conditional UPDATE + race-safe qua unique partial index (CREATE) và
   status guard (transition). Route layer có thể không cần idempotency-key cho
   `createPlacement` (service đã idempotent) nhưng transition commands nên
   wrap qua `withIdempotency` (`src/shared/integrity/idempotency/**`) để:
   (i) duplicate request từ recruiter (double-click) → replay;
   (ii) n8n notification callback tương lai có thể reuse (khi N-series mở).
   DEC-09 đã chốt idempotency semantics ở service layer; wrap ở route là
   additive convenience. **Tier 1 đề xuất**: wrap tất cả transition commands
   qua `withIdempotency`, không wrap `createPlacement`. Xem TASK §4.1.

4. **(R-F4) Error→HTTP mapping canonical.** Service layer throw error taxonomy
   (`PlacementError` + 4 subclasses) với `code` cố định. F0 route handler map
   sang HTTP status canonical:
   - `PLACEMENT_VALIDATION_ERROR` → 400 (hoặc 422 cho FK chain broken; xem §3 R-F4.A).
   - `INVALID_STATE_TRANSITION` → 409.
   - `PLACEMENT_NOT_FOUND` → 404.
   - `PLACEMENT_IDEMPOTENCY_CONFLICT` → 409.
   - `AuthSessionError` → 401.
   - Permission deny → 403.
   - **R-F4.A (Tier 1 quyết)**: `PLACEMENT_VALIDATION_ERROR` mặc định 400;
     riêng case "FK chain broken" hoặc "evidence thiếu field" vẫn 400 vì là
     payload-shape error. F0 chỉ một status (400) cho toàn bộ
     `PLACEMENT_VALIDATION_ERROR` — không phân nhánh thêm.
   - **R-F4.B**: response shape `{ error: <code>, message: <message>, details?: <details> }`
     — đồng nhất với `convert/route.ts:46-50`.

5. **(R-F5) CLIENT_MANAGED vs HRP_MANAGED boundary rõ ràng ở route layer.**
   - `createPlacement`: route chấp nhận cả hai managementMode; service tự derive
     qua `JobOpening.serviceModel` (DEC-06). Route chỉ verify quyền + look up
     `(placementCaseId, jobOpeningId)` + gọi service.
   - `confirmPlacement`/`failPlacement`/`cancelPlacement`: chấp nhận cả hai
     managementMode; service áp dụng transition rule tương ứng.
   - `markPlacementEffective`: **chỉ Client-managed** (DEC-07). Service sẽ
     REJECT HRP-managed với lý do `HRP_EFFECTIVE_FORBIDDEN` (N4 owns). F0 route
     layer map sang 422 `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (semantic khác
     `PLACEMENT_VALIDATION_ERROR` chung — xem §3 R-F5.A).
   - **R-F5.A**: thống nhất error code mới `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED`
     với HTTP 422 (Unprocessable Entity) — đây là semantic "operation hợp lệ về
     cú pháp nhưng không thể thực hiện vì managementMode boundary".
   - Client-managed `markPlacementEffective` **KHÔNG** ép Worker creation
     (Plan §29). Service hiện không tạo Worker (verify qua `closePlacementCaseSuccess`
     chỉ update PlacementCase status). F0 giữ nguyên.

6. **(R-F6) Object-scope.** Mỗi placement command phải scope theo
   `placementCaseId` (và `placementId` cho transition). RLS DB-level trên
   `placements` table đã có (verify qua integration test `(vii)`). F0 chỉ
   cần đảm bảo:
   - Route gọi `withDbContext` (apply GUC `app.user_id` + `app.role`).
   - Service chạy trong transaction, dùng `tx.placement.*` (RLS scope).
   - **KHÔNG** thêm application-layer filter bypass RLS (theo DEC-02).
   - Object-scope per command:
     - `createPlacement`: scope theo `(placementCaseId, jobOpeningId)`.
     - `confirmPlacement`/`failPlacement`/`cancelPlacement`: scope theo
       `placementId` (lookup `tx.placement.findUnique` → service đã làm).
     - `markPlacementEffective`: scope theo `placementId`; **chỉ caller
       có `CAN_RECORD_PLACEMENT_EFFECTIVE` mới được gọi** (catalog policy R-F1).

7. **(R-F7) UI workbench — OUT_OF_SCOPE F0, đặt F1.** Theo Plan §28:
   "Actions must call named canonical commands. Do not optimize for beauty
   before usability." F0 expose API; UI buttons trong recruiter workbench
   thuộc **P1-F1** + post E0/E1 interface freeze. F0 chỉ chốt:
   - Named command names exposed: `placement.create`,
     `placement.confirm`, `placement.effective`, `placement.fail`,
     `placement.cancel` (canonical string cho telemetry/integration).
   - F1 sẽ wire buttons vào `RecruiterWorkbenchRow` (DTO đã định nghĩa trong
     E0 §3) — xem `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md`.

8. **(R-F8) n8n boundary — F0 không mở outbox.** Theo
   `docs/N8N_AUTOMATION_BOUNDARY.md` §4: n8n KHÔNG nắm placement transition
   authority. F0 chỉ structured log. Post-commit outbox event thuộc N-series.
   F1 có thể reference event shape nhưng không phát hành.

## 4. P1-F0 — Capability target & scope guard

### 4.1 Outcome tối thiểu (F0)

Recruiter (ADMIN/HR_MANAGER — sau khi R-F1 chốt policy; HR_STAFF theo catalog
quyết định) có thể gọi **5 named canonical placement commands** qua API:

| Command | HTTP route | Body | Success response |
| --- | --- | --- | --- |
| `placement.create` | `POST /api/admin/placements` | `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` | 201 `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` |
| `placement.confirm` | `POST /api/admin/placements/[id]/confirm` | `{}` + `Idempotency-Key` header UUID | 200 `{ placementId, status: 'CONFIRMED', replayed }` |
| `placement.effective` | `POST /api/admin/placements/[id]/effective` | `{ evidence: { clientAcknowledgedAt: ISO, clientAcknowledgedByUserId, acknowledgementRef } }` + `Idempotency-Key` | 200 `{ placementId, status: 'EFFECTIVE', replayed, placementCaseClosed: true }` |
| `placement.fail` | `POST /api/admin/placements/[id]/fail` | `{ reason }` + `Idempotency-Key` | 200 `{ placementId, status: 'FAILED', replayed }` |
| `placement.cancel` | `POST /api/admin/placements/[id]/cancel` | `{ reason }` + `Idempotency-Key` | 200 `{ placementId, status: 'CANCELLED', replayed }` |

- Tất cả route wrap `withDbContext` (transaction-local RLS GUC).
- Tất cả route verify AuthContext (`getAuthContext`) + permission
  (`resolveEffectivePermissions` + check theo R-F1).
- Tất cả route gọi service thuần (`createPlacement`/`confirmPlacement`/
  `markPlacementEffective`/`failPlacement`/`cancelPlacement`) — không sửa
  service.
- Error mapping canonical theo §3 R-F4.
- **HRP-managed `placement.effective`**: REJECT với HTTP 422
  `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (semantic khác `PLACEMENT_VALIDATION_ERROR`).
- **Client-managed `placement.effective` thành công**: Placement EFFECTIVE +
  PlacementCase CLOSED atomic (giữ nguyên DEC-07 / AC-07). KHÔNG tạo Worker.

### 4.2 Khóa kỹ thuật (carry sang TASK F0)

- Backend adapter: `src/domains/talent/placement.commands.ts` (mới) — thin
  wrapper, không sửa `placement.service.ts`. Reuse `placement.errors.ts`
  taxonomy.
- Admin routes: `app/api/admin/placements/route.ts` (create),
  `app/api/admin/placements/[id]/{confirm,effective,fail,cancel}/route.ts`
  (transition). Reuse `withAuthorizedDb` + `withDbContext`.
- Permission: catalog mới hoặc role-level (theo R-F1 quyết).
- Idempotency-Key: wrap transition commands qua `withIdempotency`
  (`src/shared/integrity/idempotency/**`); KHÔNG wrap `createPlacement`
  (đã race-safe + idempotent qua unique partial index).
- Error mapping: route layer convert `PlacementError` → HTTP status theo R-F4.
- Structured log: chỉ `placementId/transition/actorId/correlationId` qua
  `src/shared/observability/logger.ts`; **KHÔNG** log raw `failureReason` text
  (có thể chứa PII).
- CORS: không (admin route internal Next.js — không cần CORS header).
- **Cấm**:
  - Sửa `placement.service.ts` / `placement.lifecycle.ts` / `placement.resolution.ts`
    / `placement.errors.ts` / `placement-case.service.ts`.
  - Sửa `prisma/schema.prisma` (F0 chỉ wrap service hiện hữu).
  - Sửa `permission-catalog.ts` nếu R-F1 chốt Option (ii) role-only; nếu
    Option (i)/(iii) thì additive edit + `prisma/seed.mjs` delta.
  - Sửa `app/admin/applications/**` (MP-3C territory).
  - Sửa `app/api/admin/applications/**` (V6 application state machine).
  - Sửa `src/domains/applications/placement-ui.ts` /
    `placement-panel.tsx` (MP-3C only).
  - Mở UI workbench (P1-F1).
  - Mở outbox/event producer (N-series).
  - Cài package mới (F0 chỉ wrap helper có sẵn).
  - Sửa E0/E1, P1-B, PLANNER_HANDOVER.
  - Sửa RLS placement (DB-level đã đủ).
  - Bypass `withDbContext` để chạy ngoài transaction (sẽ phá RLS GUC).

### 4.3 BUILD_VS_ADOPT

Đã khảo sát trên main:

- **Reuse (ưu tiên 1)**: `placement.service.ts` (5 commands), `placement.errors.ts`
  (error taxonomy), `placement.lifecycle.ts` (pure state machine),
  `placement.resolution.ts` (FK chain), `AuthContext` +
  `withDbContext` + `withAuthorizedDb` (auth/RLS), `resolveEffectivePermissions`
  + `permission-catalog.ts` (permission), `withIdempotency`
  (`src/shared/integrity/idempotency/**`).
- **Adopt (ưu tiên 2)**: không cần thư viện mới — toàn bộ capability đã có.
- **Đề xuất mới (ưu tiên 3)**: không có ở round documentation. Nếu F0
  implementation phát hiện cần thêm (vd HTTP client library), sẽ mở round
  riêng với `BUILD_VS_ADOPT = ADOPT` + evidence.

Kết luận: `BUILD_VS_ADOPT = ADOPT` cho `placement.service.ts`/tests hiện hữu;
`BUILD_VS_ADOPT = N/A` cho capability mới (F0 chỉ wrap; không thêm capability).

### 4.4 BUILD_VS_AUTOMATE

F0 là admin API route — không phải connector/scheduler/notification worker.
F0 không mở workflow lặp lại hay multi-system. Kết luận:
`BUILD_VS_AUTOMATE = N/A` cho canonical domain commands.

n8n boundary: xem §2.5 + §3 R-F8. F0 không mở outbox/producer; n8n có thể
sau này subscribe post-commit event (N-series), nhưng **không** nắm placement
transition authority (theo `docs/N8N_AUTOMATION_BOUNDARY.md` §4).

## 5. Kết luận & Open Decisions

### 5.1 Kết luận

- Placement domain service hiện **đầy đủ và production-ready** ở
  `origin/main@a88d8727` — chỉ thiếu thin admin API wrapper + permission
  catalog decision. F0 là **thin contract** round, **không** phải feature
  implementation mới.
- F0 không vi phạm bất kỳ invariant hiện hữu nào: DEC-01..DEC-12, DEC-14,
  AC-07 đều giữ nguyên.
- F0 boundary với các task khác rõ ràng: **không** đụng E0/E1, P1-B, P1-D,
  N-series, N4 territory.

### 5.2 Open Decisions (Owner/T0 quyết trước khi F0 → READY_TO_CODE)

1. **OD-P1F0-01 — Permission model.** Chọn Option (i) 3 codes tách biệt /
   Option (ii) role-level only / Option (iii) 1 code gộp `CAN_MANAGE_PLACEMENT`.
   Tier 1 recommendation: Option (i).
2. **OD-P1F0-02 — Idempotency-Key wrap transition commands.** Tier 1 đề xuất
   CÓ wrap. Nếu Owner/T0 chọn KHÔNG wrap, F0 vẫn race-safe qua service-layer
   conditional UPDATE + status guard.
3. **OD-P1F0-03 — Error code `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (HTTP 422).**
   Tier 1 đề xuất tách khỏi `PLACEMENT_VALIDATION_ERROR` để caller (F1 UI)
   phân biệt được "payload sai" vs "operation không khả thi ở mode này".
4. **OD-P1F0-04 — Catalog seed update.** Nếu Option (i)/(iii), cần cập nhật
   `prisma/seed.mjs` §4.2 + (nếu cần) additive migration seed.
5. **OD-P1F0-05 — F1 follow-up split.** F0 chốt API contract; F1 (post E0/E1
   freeze) chốt UI workbench actions. Owner xác nhận split này.
6. **OD-P1F0-06 — F0 route shape** (đề xuất ở §4.1). Owner xác nhận hoặc điều
   chỉnh route pattern trước khi F0 → READY_TO_CODE.

### 5.3 Out-of-scope F0 (ghi rõ để tránh hiểu lầm)

- UI workbench actions (P1-F1).
- Outbox event `PlacementTransitionCommitted` (N-series).
- HRP-managed EFFECTIVE atomic workforce bridge (N4 territory).
- Multi-organization isolation (Repo hiện KHÔNG có `organizationId/orgId` trên
  `AuthContext` — single-tenant; Org boundary là future additive contract).
- Attribution/referral cho placement (chưa có task).
- ProjectAssignment / Worker creation tự động (theo DEC-07 giữ nguyên).

---

**End of reconciliation v1.0.** Tài liệu này chỉ mô tả hiện trạng và đề xuất
thin contract; implementation phải đợi TASK.md → READY_TO_CODE sau khi Owner
chốt các Open Decision.
