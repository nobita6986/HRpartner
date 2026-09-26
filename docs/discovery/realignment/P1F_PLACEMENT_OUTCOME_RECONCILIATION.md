# P1-F — Placement Command API Reconciliation

**Pipeline V2 — Discovery / Realignment — Spec v1.1**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Spec version | `v1.1` |
| Status | `PROPOSED_ONLY` (reconciled; F0 contract ACCEPTED in TASK §0) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Correction budget (this doc) | `1` (consumed — see `### Revision Log`) |
| Baseline (origin/main @ planning pin) | `a88d87270f51fb63bba8f4f1144304dad4983007` (P1-B `ACCEPTED`, PR #52 merged) |
| Frozen HEAD | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Semantic implementation HEAD | `a88d87270f51fb63bba8f4f1144304dad4983007` (F0 chưa code; HEAD chính là baseline) |
| P1-A0 / P1-A1 / P1-B state | `ACCEPTED` trên main |
| P1-C / P1-D state | `ACCEPTED` trên main (N1 `placement_case` foundation + N1 intake writer; DEC-01..DEC-14 đã freeze) |
| P1-E state | E0/E1 `PROPOSED_ONLY`; đã freeze E0/E1 contract (planning pin `51d152d`); next gate `WAIT_P1_B_ACCEPTED` (P1-B đã ACCEPTED → E0 ready-to-code; E1 vẫn chờ E0 interface freeze). F0 **không** đụng E0/E1. |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1f0-placement-command-planning` |
| Branch | `codex/t1b-p1f0-placement-command-planning` |
| Owner of this doc | T1B (independent) |
| Predecessor SHA (this branch) | `1b1d8ac747a424c5d47d6cc777f44bba254fcd51` — preserved (no amend/reset/rebase) |
| Next gate | `TIER1_IMPLEMENTATION` (per TASK §0 v1.1) |

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
- **P1-F0 (round này)** Placement Command API + backend adapter — thin contract + reconciliation trong doc này; TASK tại `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` `v1.1` `READY_TO_CODE` `ACCEPTED` `CLOSED` (zero open Owner decisions).
- **P1-F1 (theo sau)** Recruiter UI actions cho placement commands (post E0/E1 interface freeze) — task riêng.
- **N-series** Notification/n8n — `OUT_OF_SCOPE`; xem `docs/N8N_AUTOMATION_BOUNDARY.md`. n8n **không** nắm placement transition authority; chỉ nhận post-commit outbox event (task riêng, không dependency của F0 command).

Tài liệu này **không** sửa `docs/PLANNER_HANDOVER.md` (T0-owned),
**không** sửa E0/E1 task docs, **không** sửa P1-B docs, **không** mở PR,
**không** gọi T3.

## 1. Canonical naming

| Canonical ID | Tên | Vai trò |
| --- | --- | --- |
| P1-F | Placement conversions & formal placement (lifecycle `SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED`) | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §29 — contract hóa trong doc này |
| **P1-F0** | **Placement Command API + backend adapter** | **Thin contract + reconciliation trong doc này; TASK tại `docs/tasks/hrp-p1-f0-placement-command-api/TASK.md` `v1.1` `READY_TO_CODE` `ACCEPTED` `CLOSED`** |
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
| **Mở schema mới cho F0** (column mới trên `Placement`/`PlacementCase`, bảng mới, hoặc enum mới) | `MISSING` (và **KHÔNG** được mở trong round này) | — | Evidence: schema hiện tại đủ để biểu diễn tất cả state trong DEC-03/05/07/08. F0 chỉ wrap service hiện hữu bằng admin API; **không** cần column/bảng/enum mới. Nếu phát hiện cần thiết trong implementation round, mở Owner Decision. |

### 2.2 Backend service & lifecycle (`src/domains/talent/placement.*`)

| Capability | Tag | Bằng chứng / Vị trí | Ghi chú |
| --- | --- | --- | --- |
| `createPlacement` (→ SELECTED) — race-safe nhờ `placements_active_unique` partial unique index; idempotent replay qua `(caseId, openingId)` | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:103` (`createPlacement`) | DEC-04a, DEC-06, DEC-09, DEC-10. |
| `confirmPlacement` (SELECTED → CONFIRMED) — conditional UPDATE với status guard; chỉ ghi `confirmedAt` | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:454` | DEC-05, DEC-12. Service KHÔNG touch `effectiveDate` (C-01). |
| `markPlacementEffective` (CONFIRMED → EFFECTIVE) — **chỉ Client-managed** (DEC-07); yêu cầu evidence (`clientAcknowledgedAt`, `clientAcknowledgedByUserId`, `acknowledgementRef`) cho Client-managed (DEC-08, AC-07); persist evidence columns cho audit | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:458` | HRP-managed → throw `PlacementValidationError` với message `"HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"` (DEC-07). KHÔNG có code phụ `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (C-07 — error taxonomy freeze). |
| Client-managed EFFECTIVE atomic close PlacementCase (status='CLOSED' + `closedAt` + `closeReason='PLACEMENT_EFFECTIVE by <actorId> at <ISO>'`) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:420` (`closePlacementCaseSuccess`) | AC-07; nếu case đã CLOSED concurrent → rollback toàn transaction (PlacementIdempotencyConflictError). KHÔNG có bước READY_TO_PLACE trung gian (C-01). |
| `failPlacement` (SELECTED \| CONFIRMED → FAILED) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:468` | DEC-05; `failureReason` ghi `Marked FAILED by <actorId> at <ISO>`. Service KHÔNG nhận `reason` từ caller (TransitionPlacementInput không có field) — `failureReason` tự sinh server-side. |
| `cancelPlacement` (SELECTED \| CONFIRMED → CANCELLED) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:472` | DEC-05; `failureReason` ghi `Marked CANCELLED by <actorId> at <ISO>`. EFFECTIVE là terminal; `canTransition` REJECT cancel sau EFFECTIVE (C-01). |
| Pure state machine `canTransition` / `computeManagementMode` / `allowedTransitions` / `isActivePlacement` / `isTerminalPlacement` | `IMPLEMENTED` | `src/domains/talent/placement.lifecycle.ts:51-113` | DEC-02, DEC-05; không phụ thuộc Prisma. |
| `assertClassifiedJobOpening` + `resolveClientCompanyIdForJobOpening` (chain JobOpening → StaffingOrder → Project → ClientCompany) | `IMPLEMENTED` | `src/domains/talent/placement.resolution.ts:26-124` | DEC-06, DEC-10. |
| `PlacementError` taxonomy (`PlacementError` + 4 subclass: `PlacementValidationError`, `InvalidStateTransitionError`, `PlacementNotFoundError`, `PlacementIdempotencyConflictError`) với `code` cố định | `IMPLEMENTED` | `src/domains/talent/placement.errors.ts:14-60` | Mapping HTTP class rõ: validation 400-class, state transition 409-class, not-found 404-class, idempotency conflict 409-class. Taxonomy **đóng băng** — F0 KHÔNG mở rộng (C-07). |
| Idempotency replay cho transition commands (same `placementId` + same target state → no-op, `replayed=true`; conflict → throw `PlacementIdempotencyConflictError`) | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:312-407` (`runTransition`); round-4 fix F-09 (concurrent command đổi sang terminal khác → throw conflict) | DEC-09. |
| Optimistic locking `version` increment mỗi transition | `IMPLEMENTED` | `src/domains/talent/placement.service.ts:365` | DEC-12. |
| `openPlacementCase` (intake writer — N1) | `IMPLEMENTED` | `src/domains/talent/placement-case.service.ts:111` | DEC-04 + V6P-003; P1-B đã consume; F0 chỉ tham chiếu nếu command cần mở case (F0 không mở — chỉ transition). |
| Unit test cho `placement.service` (create/confirm/effective/FAIL/cancel + race-loser + state-mismatch) | `IMPLEMENTED` | `src/domains/talent/placement.service.test.ts` (≥30 it-blocks) | Service-level coverage rất đầy đủ. |
| Unit test cho `placement.lifecycle` (state machine pure functions) | `IMPLEMENTED` | `src/domains/talent/placement.lifecycle.test.ts` | — |
| Unit test cho `placement.resolution` (FK chain) | `IMPLEMENTED` | `src/domains/talent/placement.resolution.test.ts` | — |
| Unit test cho `placement-case.service` (race-safe openPlacementCase) | `IMPLEMENTED` | `src/domains/talent/placement-case.service.test.ts` | — |
| DB integration test (synthetic PG) — placement lifecycle end-to-end | `IMPLEMENTED` | `tests/db/placement-lifecycle-integration.test.ts` (15 scenarios: i..xv + ENV_BLOCKED) | Cover SELECTED→CONFIRMED; client-managed CONFIRMED→EFFECTIVE (evidence persisted + case closed); HRP-managed EFFECTIVE reject; retry idempotent; FK chain broken; RLS HR_MANAGER vs PUBLIC; UNIQUE partial index race; case CLOSED reject; race-loser; atomic rollback. |
| **Canonical admin API route** cho named placement commands (`POST /api/admin/placements`, `POST /api/admin/placements/[id]/actions/{confirm,effective,fail,cancel}`) | `MISSING` | — | F0 là task mới; route shape định nghĩa trong TASK §4.1. |
| **Backend adapter** wrap `placement.service.ts` với AuthContext + role-level gate (ADMIN/HR_MANAGER only) + RLS GUC (`withDbContext`) + error→HTTP mapping | `MISSING` | — | F0 là task mới; thin layer, không sửa service hiện hữu. |
| **Idempotency-Key** ở route layer cho **tất cả 5 commands** (create + 4 transition) | `MISSING` | — | F0 wrap qua `withIdempotency` cho **tất cả 5 commands** (C-04). DB unique bảo vệ race cho create nhưng không bảo vệ HTTP retry sau khi placement đã terminal — vì vậy create cũng cần key. Scope key: `(actorId, canonical route name, key)`. Helper `withIdempotency` không fork. |
| **Audit-trail hook** cho placement transition (AuditFinding/evidence log) | `OUT_OF_SCOPE` | — | Thuộc territory audit/observability task riêng. F0 chỉ log structured `placementId/transition/actorId/correlationId/managementMode/fromStatus/toStatus/replayed/errorCode` qua `src/shared/observability/logger.ts`. |
| **ProjectAssignment / Worker creation** đi kèm EFFECTIVE | `OUT_OF_SCOPE` (N4) | — | DEC-07: HRP-managed EFFECTIVE thuộc N4 atomic workforce bridge. Client-managed EFFECTIVE KHÔNG ép Worker creation (Plan §29: "Do not force Worker creation for client-managed direct hire"; C-01). F0 giữ nguyên `closePlacementCaseSuccess` không tạo Worker. |

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
| `withDbContext(prisma, ctx, cb)` — transaction-local RLS GUC (`app.user_id`, `app.role`) | `IMPLEMENTED` | `src/shared/auth/with-db-context.ts:34-43` | F0 wrap mọi command transaction. Đây là boundary ĐÚNG cho create/write (xem `with-authorized-db.ts:24-31` — DEC-03 ghi rõ `withAuthorizedDb` KHÔNG an toàn cho `create` vì L1 inject `where` không tương thích với Prisma `create`). |
| `withAuthorizedDb` (verify `actorId` + L1 scope extension + L2 RLS GUC) | `IMPLEMENTED` | `src/shared/auth/with-authorized-db.ts:51-66` | F0 **KHÔNG** dùng cho create/write (xem DEC-03 ở file đó: "WRITE mà L1 không scope an toàn (đặc biệt `create`) → dùng `withDbContext` (L2-only)"). C-03 chốt. |
| `applyRlsContext` + `rls-context.ts` (`set_config(..., true)`) | `IMPLEMENTED` | `src/shared/auth/rls-context.ts` | Tự động apply qua `withDbContext`. |
| `permission-resolver.ts` (`resolveEffectivePermissions(userId)`) | `IMPLEMENTED` | `src/shared/auth/permission-resolver.ts` | F0 **KHÔNG** dùng trong round này (xem C-02). |
| `permission-catalog.ts` — 14 codes, không có code thuộc Placement/Talent domain | `OUT_OF_SCOPE` (F0) | `src/shared/auth/permission-catalog.ts:37-109` | F0 **KHÔNG** mở rộng catalog trong round này (C-02). Nếu cần granularity sau sẽ mở task riêng (F1 hoặc task permission riêng). Catalog hiện KHÔNG được in-scope và `prisma/seed.mjs` KHÔNG được dùng làm production permission provisioning. |
| RLS placements (FORCE RLS) | `IMPLEMENTED` | Migration RLS của N3 + verify qua integration test `(vii)` | F0 không mở RLS riêng; chỉ apply GUC qua `withDbContext`. |

### 2.5 Notification / n8n boundary

| Capability | Tag | Ghi chú |
| --- | --- | --- |
| HRP-side outbox event `PlacementTransitionCommitted` (eventId, correlationId, payload `{placementId, fromStatus, toStatus, managementMode, placementCaseId, laborProfileId, clientCompanyId?, projectId?, evidenceAcknowledgedAt?}`) | `MISSING` (và `OUT_OF_SCOPE` cho F0) | Thuộc **N-series task** (notification/n8n). F0 **không** mở outbox schema hay producer; chỉ structured log `placementId/transition/actorId/correlationId/...` qua `src/shared/observability/logger.ts`. Outbox event thuộc task riêng; KHÔNG là dependency của F0 command. |
| n8n workflow consume outbox event → fan-out kênh | `OUT_OF_SCOPE` | Thuộc N-series; xem `docs/N8N_AUTOMATION_BOUNDARY.md` §4 (cấm: "Placement, CommissionLedger, payroll or other money calculations" + "Domain concurrency locks, mutation idempotency authority or canonical deduplication"). n8n **không** nắm placement transition authority. |
| In-app notification cho assignee khi placement EFFECTIVE | `OUT_OF_SCOPE` | Thuộc N-series. |

## 3. Residual trước F0 (sau v1.1 reconcile)

Dựa trên capability matrix §2.1–§2.5 và code đang ở `origin/main@a88d8727`,
**residual thật sự** trước F0 gồm:

1. **(R-F1) Canonical admin API cho placement commands (RESOLVED → F0 TASK).**
   Hiện không có route `app/api/admin/placements/**`. F0 đã chốt exact route
   shape `POST /api/admin/placements` + `POST /api/admin/placements/[id]/actions/{confirm,effective,fail,cancel}` (C-05), body shape (C-06), role-level gate (C-02), và error taxonomy (C-07). Đóng tại TASK §4.1.

2. **(R-F2) Idempotency-Key header cho tất cả 5 commands (RESOLVED → F0 TASK).**
   `placement.service.ts` đã có conditional UPDATE + race-safe qua unique partial
   index (CREATE) và status guard (transition). Route layer F0 wrap
   `withIdempotency` cho **cả 5 commands** (không chỉ transition) — DB unique
   bảo vệ race hiện tại nhưng không bảo vệ HTTP retry cũ sau khi placement đã
   chuyển terminal (C-04). Helper `withIdempotency` không fork. Scope key:
   `(actorId, canonical route name, key)`. Same key + same payload → replay
   stored status/body; response cuối `replayed=true`. Same key + different
   payload → 409 `IDEMPOTENCY_CONFLICT`. Đóng tại TASK §4.1 RQ-08.

3. **(R-F3) Error→HTTP mapping canonical (RESOLVED → F0 TASK).** Service layer
   throw error taxonomy (`PlacementError` + 4 subclass) với `code` cố định.
   F0 route handler map sang HTTP status canonical (C-07):
   - `PLACEMENT_VALIDATION_ERROR` → 400 (cả PlacementCase không tồn tại,
     FK chain broken, evidence thiếu field — không tách subclass 404).
   - `INVALID_STATE_TRANSITION` → 409.
   - `PLACEMENT_NOT_FOUND` → 404.
   - `PLACEMENT_IDEMPOTENCY_CONFLICT` → 409.
   - `IDEMPOTENCY_CONFLICT` → 409.
   - missing/invalid `Idempotency-Key` → 400 `IDEMPOTENCY_REQUIRED`.
   - invalid/unknown body fields → 400 `VALIDATION`.
   - unauthenticated → 401.
   - role denied → 403.
   - unexpected → generic 500, không leak nội bộ.
   - Response shape `{ error: <code>, message: <message>, details?: <details> }`
     — đồng nhất với `convert/route.ts:46-50`.
   - **KHÔNG** tạo `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (error taxonomy freeze;
     service thực tế throw `PlacementValidationError` cho HRP-managed EFFECTIVE).
   Đóng tại TASK §4.1 RQ-07.

4. **(R-F4) Authorization model (RESOLVED → role-level gate trong F0).**
   Chốt role-level gate (C-02): `ADMIN` và `HR_MANAGER` được; `HR_STAFF` và
   role khác → 403. F0 **KHÔNG** thêm `CAN_*` placement permission. Catalog
   (`permission-catalog.ts`) và seed (`prisma/seed.mjs`) **KHÔNG** thuộc
   in-scope roots; cả hai nằm trong forbidden paths. F1 hoặc task permission
   riêng có thể mở fine-grained permissions sau. Đóng tại TASK §0 in-scope +
   §4.1 RQ-05.

5. **(R-F5) Transaction boundary (RESOLVED → F0 TASK).** F0 mutation dùng đúng
   một transaction boundary (C-03):
   ```
   getAuthContext(req)            // 401 nếu thiếu/invalid
   → role gate (ADMIN/HR_MANAGER) // 403 nếu role khác
   → strict request parsing       // 400 VALIDATION nếu body shape sai
   → withIdempotency(...)         // 400 IDEMPOTENCY_REQUIRED / 409 IDEMPOTENCY_CONFLICT
   → withDbContext(getPrisma(), ctx, tx => existing placement service)
   ```
   KHÔNG dùng `withAuthorizedDb` cho create/write (DEC-03 ở
   `with-authorized-db.ts:24-31` chỉ rõ L1 inject `where` không tương thích
   với Prisma `create`). KHÔNG mở transaction lồng nhau giữa route và
   adapter. Đóng tại TASK §4.1 RQ-04 + §5 STEP-02.

6. **(R-F6) CLIENT_MANAGED vs HRP_MANAGED boundary rõ ràng ở service layer (RESOLVED → keep-as-is).**
   - `createPlacement`: route chấp nhận cả hai managementMode; service tự derive
     qua `JobOpening.serviceModel` (DEC-06). Route chỉ verify role + look up
     `(placementCaseId, jobOpeningId)` + gọi service.
   - `confirmPlacement`/`failPlacement`/`cancelPlacement`: chấp nhận cả hai
     managementMode; service áp dụng transition rule tương ứng qua
     `canTransition`.
   - `markPlacementEffective`: **chỉ Client-managed** (DEC-07). Service sẽ
     REJECT HRP-managed với `PlacementValidationError` (`code='PLACEMENT_VALIDATION_ERROR'`,
     message "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic
     workforce bridge thuộc N4"). F0 route layer map sang HTTP 400 theo C-07
     (KHÔNG 422 và KHÔNG tách code mới — taxonomy freeze).
   - Client-managed `markPlacementEffective` **KHÔNG** ép Worker creation
     (Plan §29; C-01). Service hiện không tạo Worker (verify qua
     `closePlacementCaseSuccess` chỉ update PlacementCase status). F0 giữ
     nguyên.
   - EFFECTIVE là terminal; cancel sau EFFECTIVE bị REJECT bởi `canTransition`.
     F0 không bỏ guard.

7. **(R-F7) Object-scope.** Mỗi placement command phải scope theo
   `placementCaseId` (và `placementId` cho transition). RLS DB-level trên
   `placements` table đã có (verify qua integration test `(vii)`). F0 chỉ
   cần đảm bảo:
   - Route gọi `withDbContext` (apply GUC `app.user_id` + `app.role`).
   - Service chạy trong transaction, dùng `tx.placement.*` (RLS scope).
   - **KHÔNG** thêm application-layer filter bypass RLS (theo DEC-02).
   - Object-scope per command (giữ nguyên service):
     - `createPlacement`: scope theo `(placementCaseId, jobOpeningId)`.
     - `confirmPlacement`/`failPlacement`/`cancelPlacement`/`markPlacementEffective`:
       scope theo `placementId` (lookup `findPlacementForTransition` trong
       `runTransition` đã làm).

8. **(R-F8) UI workbench — OUT_OF_SCOPE F0, đặt F1.** Theo Plan §28:
   "Actions must call named canonical commands. Do not optimize for beauty
   before usability." F0 expose API; UI buttons trong recruiter workbench
   thuộc **P1-F1** + post E0/E1 interface freeze. F0 chỉ chốt:
   - Named command names exposed: `placement.create`,
     `placement.confirm`, `placement.effective`, `placement.fail`,
     `placement.cancel` (canonical string cho telemetry/integration).
   - F1 sẽ wire buttons vào `RecruiterWorkbenchRow` (DTO đã định nghĩa trong
     E0 §3) — xem `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md`.

9. **(R-F9) n8n boundary — F0 không mở outbox.** Theo
   `docs/N8N_AUTOMATION_BOUNDARY.md` §4: n8n KHÔNG nắm placement transition
   authority. F0 chỉ structured log. Post-commit outbox event thuộc N-series
   task riêng; KHÔNG là dependency của F0 command. F1 có thể reference event
   shape nhưng không phát hành.

## 4. P1-F0 — Capability target & scope guard

### 4.1 Outcome tối thiểu (F0)

Recruiter (`ADMIN` hoặc `HR_MANAGER`) có thể gọi **5 named canonical placement
commands** qua API:

| Command | HTTP route | Body | Headers | Success response |
| --- | --- | --- | --- | --- |
| `placement.create` | `POST /api/admin/placements` | `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` | `Idempotency-Key: <UUID v4>` required | 201 `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` |
| `placement.confirm` | `POST /api/admin/placements/[id]/actions/confirm` | `{}` | `Idempotency-Key: <UUID v4>` required | 200 `{ placementId, status: 'CONFIRMED', replayed }` |
| `placement.effective` | `POST /api/admin/placements/[id]/actions/effective` | `{ evidence: { clientAcknowledgedAt: ISO-8601, clientAcknowledgedByUserId, acknowledgementRef } }` | `Idempotency-Key: <UUID v4>` required | 200 `{ placementId, status: 'EFFECTIVE', replayed }` (Client-managed; atomic PlacementCase CLOSED bên trong service) |
| `placement.fail` | `POST /api/admin/placements/[id]/actions/fail` | `{}` | `Idempotency-Key: <UUID v4>` required | 200 `{ placementId, status: 'FAILED', replayed }` |
| `placement.cancel` | `POST /api/admin/placements/[id]/actions/cancel` | `{}` | `Idempotency-Key: <UUID v4>` required | 200 `{ placementId, status: 'CANCELLED', replayed }` |

- Tất cả route wrap `withDbContext` (transaction-local RLS GUC) — KHÔNG dùng
  `withAuthorizedDb` cho create/write (DEC-03).
- Tất cả route verify AuthContext (`getAuthContext`) → role gate (C-02:
  ADMIN/HR_MANAGER pass; khác → 403).
- Tất cả route gọi service thuần (`createPlacement`/`confirmPlacement`/
  `markPlacementEffective`/`failPlacement`/`cancelPlacement`) — không sửa
  service.
- `placement.effective` (HRP-managed) → 400 `PLACEMENT_VALIDATION_ERROR`
  (KHÔNG 422; KHÔNG code `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED`).
- `placement.effective` (Client-managed) thành công: Placement EFFECTIVE +
  PlacementCase CLOSED atomic (giữ nguyên DEC-07 / AC-07). KHÔNG tạo Worker.
- `placement.cancel` sau EFFECTIVE → 409 `INVALID_STATE_TRANSITION` (service
  guard; F0 không bypass).
- Body shape: `create` cho phép `sourceCandidateSubmissionId?`; nếu có mặt,
  service re-read trong cùng transaction (xem `placement.service.ts` create
  path — đã làm) và fail closed nếu submission không thuộc đúng
  PlacementCase. **KHÔNG** trust client provenance trực tiếp. `confirm`/
  `fail`/`cancel` body `{}` (TransitionPlacementInput không có `reason` —
  service tự tạo `failureReason`). `effective` body strictly validate
  evidence shape; reject unknown fields → 400 `VALIDATION`.

### 4.2 Khóa kỹ thuật (carry sang TASK F0)

- Backend adapter: `src/domains/talent/placement.commands.ts` (mới) — thin
  wrapper, không sửa `placement.service.ts`/`placement.lifecycle.ts`/
  `placement.resolution.ts`/`placement.errors.ts`/`placement-case.service.ts`.
  Reuse `placement.errors.ts` taxonomy nguyên.
- Admin routes:
  - `app/api/admin/placements/route.ts` (create)
  - `app/api/admin/placements/[id]/actions/confirm/route.ts`
  - `app/api/admin/placements/[id]/actions/effective/route.ts`
  - `app/api/admin/placements/[id]/actions/fail/route.ts`
  - `app/api/admin/placements/[id]/actions/cancel/route.ts`
- Authorization: role-level gate (C-02). **KHÔNG** đụng `permission-catalog.ts`
  hoặc `prisma/seed.mjs` — cả hai nằm trong forbidden paths.
- Idempotency: tất cả 5 commands wrap `withIdempotency` (C-04). Helper không fork.
- Error mapping: route layer convert `PlacementError` → HTTP status theo C-07.
- Structured log: chỉ `placementId/transition/actorId/correlationId/managementMode/fromStatus/toStatus/replayed/errorCode` qua
  `src/shared/observability/logger.ts`; **KHÔNG** log raw evidence / reason /
  PII / request body.
- CORS: không (admin route internal Next.js — không cần CORS header).
- **Cấm**:
  - Sửa `placement.service.ts` / `placement.lifecycle.ts` /
    `placement.resolution.ts` / `placement.errors.ts` /
    `placement-case.service.ts`.
  - Sửa `prisma/schema.prisma` (F0 chỉ wrap service hiện hữu).
  - Sửa `permission-catalog.ts` / `prisma/seed.mjs` (C-02 — catalog và seed
    nằm trong forbidden paths).
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
  - Dùng `withAuthorizedDb` cho create/write (DEC-03 — L1 không safe).
  - Mở transaction lồng nhau giữa route và adapter.
  - Thêm code error mới `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (taxonomy freeze).
  - Wrap `withDbContext` hai lần (route + adapter cùng transaction).
  - Log raw evidence / reason / PII / request body.
  - Dùng seed-only rows làm production permission provisioning.

### 4.3 BUILD_VS_ADOPT

Đã khảo sát trên main:

- **Reuse (ưu tiên 1)**: `placement.service.ts` (5 commands), `placement.errors.ts`
  (error taxonomy), `placement.lifecycle.ts` (pure state machine),
  `placement.resolution.ts` (FK chain), `AuthContext` +
  `withDbContext` (auth/RLS), `withIdempotency`
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

n8n boundary: xem §2.5 + §3 R-F9. F0 không mở outbox/producer; n8n có thể
sau này subscribe post-commit event (N-series task riêng — KHÔNG dependency
của F0 command), nhưng **không** nắm placement transition authority (theo
`docs/N8N_AUTOMATION_BOUNDARY.md` §4).

## 5. Kết luận & Open Decisions

### 5.1 Kết luận

- Placement domain service hiện **đầy đủ và production-ready** ở
  `origin/main@a88d8727` — chỉ thiếu thin admin API wrapper. F0 là **thin
  contract + reconciliation** round; implementation đã mở `READY_TO_CODE`
  (xem TASK v1.1 §0).
- F0 không vi phạm bất kỳ invariant hiện hữu nào: DEC-01..DEC-12, DEC-14,
  AC-07 đều giữ nguyên.
- F0 boundary với các task khác rõ ràng: **không** đụng E0/E1, P1-B, P1-D,
  N-series, N4 territory.

### 5.2 Open Decisions

**Không có Owner decision còn mở trong round này.** Sáu câu hỏi lifecycle đã
nêu trong v1.0 báo cáo bàn giao được RESOLVED tại v1.1 theo C-01..C-10:

| v1.0 ID | Resolved state (v1.1) |
| --- | --- |
| OD-P1F0-01 (effectiveDate semantics) | **RESOLVED** — service không có field `effectiveDate`; chỉ `confirmedAt`/`effectiveAt` (timestamps). C-01. |
| OD-P1F0-02 (READY_TO_PLACE step) | **RESOLVED** — không có bước trung gian; Client-managed EFFECTIVE → Placement EFFECTIVE + PlacementCase CLOSED atomic. C-01. |
| OD-P1F0-03 (Worker auto-creation) | **RESOLVED** — không tạo Worker/Episode/Assignment ở F0; thuộc N4 territory. C-01, DEC-07. |
| OD-P1F0-04 (cancel after EFFECTIVE) | **RESOLVED** — EFFECTIVE là terminal; `canTransition` REJECT cancel sau EFFECTIVE. C-01. |
| OD-P1F0-05 (max concurrent CONFIRMED) | **RESOLVED** — không thêm cap mới; giữ nguyên partial unique invariant `placements_active_unique` trên `(placement_case_id, job_opening_id)`. C-01. |
| OD-P1F0-06 (permission model) | **RESOLVED** — role-level gate ADMIN/HR_MANAGER trong F0 (C-02); không mở catalog code mới. |

### 5.3 Out-of-scope F0 (ghi rõ để tránh hiểu lầm)

- UI workbench actions (P1-F1).
- Outbox event `PlacementTransitionCommitted` (N-series task riêng; KHÔNG
  dependency của F0 command).
- HRP-managed EFFECTIVE atomic workforce bridge (N4 territory).
- Fine-grained permission codes cho placement (F1 hoặc task permission
  riêng — C-02 đã chốt role-level gate cho F0).
- Multi-organization isolation (Repo hiện KHÔNG có `organizationId/orgId` trên
  `AuthContext` — single-tenant; Org boundary là future additive contract).
- Attribution/referral cho placement (chưa có task).
- ProjectAssignment / Worker creation tự động (theo DEC-07 giữ nguyên).

---

### Revision Log

| Spec version | Date | Author | Change |
| --- | --- | --- | --- |
| v1.0 | 2026-09-26 | T1B | Initial planning — capability matrix §2 + residual R-F1..R-F8 + 5 named commands contract + 6 Open Decision. Status `PROPOSED_ONLY`, Contract gate `DRAFT`, Decision state `OPEN`. Predecessor SHA `1b1d8ac` (preserved). |
| v1.1 | 2026-09-26 | T1B | T0 contract correction. Applied C-01..C-10: frozen service semantics (no `effectiveDate`, no READY_TO_PLACE step, no Worker, EFFECTIVE terminal, no concurrent CONFIRMED cap); role-level gate (ADMIN/HR_MANAGER) — `permission-catalog.ts` + `prisma/seed.mjs` move to forbidden paths; transaction boundary (route uses `withDbContext`, NOT `withAuthorizedDb`, for create/write); idempotency-key required for all 5 commands (incl. create); canonical route shape `POST /api/admin/placements/[id]/actions/{...}`; exact request/result shapes (create returns `CreatePlacementResult` exactly; transition returns `TransitionPlacementResult` `{placementId,status,replayed}` exactly — no extra `placementCaseClosed`); error taxonomy (no `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED`, all taxonomy frozen); adapter scope (no copy of lifecycle/FK/errors, helper `withIdempotency` not forked, structured log excludes raw evidence/reason/PII/body); test contract expanded; contract state → `READY_TO_CODE` `ACCEPTED` `CLOSED` `Decision state: CLOSED`, `Open Owner decisions: NONE`. Predecessor SHA `1b1d8ac` preserved. |

**End of reconciliation v1.1.**
