# TASK — `hrp-p1-f0-placement-command-api`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f0-placement-command-api` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | ADOPT |
| Build vs automate | N/A |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | CRITICAL lane default LIGHT. F0 chạm AuthContext + RLS GUC + permission catalog + idempotency wrap + error-to-HTTP mapping trên production-ready placement.service. LIGHT audit đảm bảo changed surface (route mới + adapter file mới + catalog seed delta nếu OD-P1F0-01 chốt Option i/iii) đối chiếu với freeze SHA. Owner/T0 chấp nhận rủi ro. |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Contract gate | `DRAFT` |
| Decision state | `OPEN` (chờ T0 chốt 6 Open Decision ở §8) |
| Test environment | `READY` (canonical synthetic PG đã chạy được cho N3 integration test `(i)..(xv)`; F0 mở rộng bằng test mới chứ không fork) |
| Correction budget | `1` |
| Baseline | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Planner | `Tier 1B` |
| Predecessor | `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md` v1.0 (branch `codex/t1b-p1f0-placement-command-planning` planning pin) |
| Depends on | P1-A0/A1/B/C/D/E0/E1 status hiện tại đều cho phép F0 contract. F0 implementation mở `READY_TO_CODE` chỉ sau khi Owner chốt OD-P1F0-01..06 (xem §8). |
| Scope lần này | Implementation: thin backend adapter + 5 admin API route + permission catalog seed delta (nếu OD-P1F0-01 chốt Option i/iii) + targeted unit tests + DB integration test mở rộng. KHÔNG UI workbench (F1). KHÔNG outbox event (N-series). |
| In-scope roots | `src/domains/talent/placement.commands.ts` (mới — thin adapter, KHÔNG sửa `placement.service.ts`); `app/api/admin/placements/route.ts` (mới — `POST` create); `app/api/admin/placements/[id]/confirm/route.ts` (mới); `app/api/admin/placements/[id]/effective/route.ts` (mới); `app/api/admin/placements/[id]/fail/route.ts` (mới); `app/api/admin/placements/[id]/cancel/route.ts` (mới); `src/domains/talent/placement.commands.test.ts` (mới — unit test cho adapter mapping + error→HTTP); `src/domains/talent/placement.commands.routes.test.ts` (mới — AST/static guard cho route layer); `tests/db/p1f0-placement-command-api.integration.test.ts` (mới — synthetic DB, runtime-role lane KHÔNG set `app.role` GUC; mở rộng `(i)..(xv)` scenarios bằng cách gọi route handler thay vì gọi service thuần); `src/shared/auth/permission-catalog.ts` (ADDITIVE EDIT — Option i/iii chỉ: thêm nhóm `TALENT` + codes `CAN_CREATE_PLACEMENT` / `CAN_TRANSITION_PLACEMENT` / `CAN_RECORD_PLACEMENT_EFFECTIVE`; không sửa code/group hiện hữu); `prisma/seed.mjs` (ADDITIVE EDIT — seed 3 codes mới cho `ADMIN`, `HR_MANAGER` nếu OD-P1F0-01 chốt Option i/iii) |
| Forbidden paths | `docs/PLANNER_HANDOVER.md` (T0-owned); `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**` (A0-frozen); `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**` (A1-frozen); `docs/tasks/hrp-p1-b-public-apply/**` (B-accepted); `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/**` (E0-PROPOSED_ONLY); `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/**` (E1-PROPOSED_ONLY); `src/domains/talent/placement.service.ts` (production-ready — KHÔNG sửa, F0 chỉ wrap); `src/domains/talent/placement.lifecycle.ts` (pure state machine — KHÔNG sửa); `src/domains/talent/placement.resolution.ts` (FK chain resolver — KHÔNG sửa); `src/domains/talent/placement.errors.ts` (error taxonomy freeze — KHÔNG mở rộng; F0 dùng nguyên `PlacementError` + 4 subclass); `src/domains/talent/placement-case.service.ts` (N1 intake writer — KHÔNG sửa); `prisma/schema.prisma` (KHÔNG schema/migration trong F0 — evidence: schema hiện đủ cho DEC-03..DEC-12); `package.json`; `package-lock.json`; `app/admin/applications/**` (MP-3C territory — KHÔNG đụng); `app/api/admin/applications/**` (V6 application state machine — KHÔNG đụng); `src/domains/applications/placement-ui.ts` (MP-3C RQ-09 — KHÔNG dùng cho N3 placement); `src/domains/applications/placement-panel.tsx` (MP-3C only — KHÔNG dùng); `app/admin/labor-profiles/**` (A0/AFF-05A territory); `src/domains/job-board/public.service.ts` (A1-owned); `app/(jobs)/viec-lam/**` (A1-owned); `src/shared/integrity/idempotency/**` (KHÔNG sửa helper; F0 chỉ wrap consumer-side); `src/shared/auth/with-db-context.ts`, `src/shared/auth/with-authorized-db.ts`, `src/shared/auth/auth-context.ts` (KHÔNG sửa — F0 chỉ consume); `vitest*.config.ts` (registry-only edit cho integration test — pattern đã chốt ở E0 v1.2 round-3); `tests/db/placement-lifecycle-integration.test.ts` (KHÔNG sửa file hiện có; F0 mở file mới `p1f0-placement-command-api.integration.test.ts`); `prisma/migrations/**` (KHÔNG migration mới trong F0 — schema đã đủ); `next.config.*`; `tsconfig.json`; `.github/workflows/ci.yml` |
| Required gates | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit` (cover `placement.commands.test.ts` + `placement.commands.routes.test.ts`); `npm run test:integration` (cover `tests/db/p1f0-placement-command-api.integration.test.ts` — local thiếu `DATABASE_URL_TEST` phải `ENV_BLOCKED`, không fake PASS); `pwsh .ai-pipeline/scripts/verify-encoding.ps1` (UTF-8 no-BOM trên changed surface); `pwsh .ai-pipeline/scripts/verify-task.ps1`; `git diff --check` (LF-only) |
| Current execution round | `0` (planning only) |
| Current audit round | `0` |
| Next gate | `WAIT_T0_CONTRACT_CORRECTION` (T0 chốt OD-P1F0-01..06); sau đó Tier 1B đốt correction budget để update TASK v1.1 → `READY_TO_CODE`; KHÔNG mở implementation ở round này |

> Lane CRITICAL mặc định LIGHT. Risk acceptance: T0 chấp nhận LIGHT audit cho thin adapter wrapping production-ready placement.service; F0 không thêm schema/permission catalog code mới nếu OD-P1F0-01 chốt Option (ii) role-only.

> F0 = thin contract + planning. Round này CHƯA implementation; chỉ ghi nhận capability matrix + đề xuất route shape + đốt correction budget cho v1.1 sau khi T0 chốt Open Decision.

> T0 chấp nhận CRITICAL/LIGHT và lock baseline `a88d8727`. F0 đảm bảo KHÔNG chạm P1-B/E0/E1/runtime khi implementation bắt đầu.

## 1. Outcome

### 1.1 User-visible outcome (post implementation — TIER 1B implementation round, không phải round này)

- Recruiter (ADMIN/HR_MANAGER; HR_STAFF theo OD-P1F0-01 chốt) gọi **5 named canonical placement commands** qua HTTP admin API:
  - `placement.create` — `POST /api/admin/placements` với `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` → 201 `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }`. Race-safe qua `placements_active_unique` partial unique index (DEC-04a). Idempotent replay khi cùng `(placementCaseId, jobOpeningId)`.
  - `placement.confirm` — `POST /api/admin/placements/[id]/confirm` với body `{}` + `Idempotency-Key` header UUID → 200 `{ placementId, status: 'CONFIRMED', replayed }`. Conditional UPDATE với status guard (DEC-12).
  - `placement.effective` — `POST /api/admin/placements/[id]/effective` với `{ evidence: { clientAcknowledgedAt: ISO, clientAcknowledgedByUserId, acknowledgementRef } }` + `Idempotency-Key` → 200 `{ placementId, status: 'EFFECTIVE', replayed, placementCaseClosed: true }`. **Chỉ Client-managed** (DEC-07). HRP-managed → 422 `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (semantic khác validation error chung — xem R-F5.A). Client-managed thành công → Placement EFFECTIVE + PlacementCase CLOSED atomic (AC-07), KHÔNG tạo Worker.
  - `placement.fail` — `POST /api/admin/placements/[id]/fail` với `{ reason }` + `Idempotency-Key` → 200 `{ placementId, status: 'FAILED', replayed }`. SELECTED | CONFIRMED → FAILED (DEC-05).
  - `placement.cancel` — `POST /api/admin/placements/[id]/cancel` với `{ reason }` + `Idempotency-Key` → 200 `{ placementId, status: 'CANCELLED', replayed }`. SELECTED | CONFIRMED → CANCELLED (DEC-05).
- Tất cả route wrap `withDbContext` (transaction-local RLS GUC `app.user_id` + `app.role`) và `withAuthorizedDb` (verify AuthContext + permission trước khi mở transaction).
- Tất cả route gọi service thuần (`createPlacement`/`confirmPlacement`/`markPlacementEffective`/`failPlacement`/`cancelPlacement`) — KHÔNG sửa `placement.service.ts`.
- Tất cả route convert `PlacementError` → HTTP status canonical theo §3 R-F4.
- F1 UI follow-up (post E0/E1 interface freeze) sẽ consume 5 commands này qua `RecruiterWorkbenchRow` DTO. F0 chỉ chốt API contract.

### 1.2 Non-goals (round này + implementation round)

- KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`.
- KHÔNG sửa `placement.service.ts`/`placement.lifecycle.ts`/`placement.resolution.ts`/`placement.errors.ts`/`placement-case.service.ts`. F0 chỉ wrap service.
- KHÔNG mở migration mới (evidence: schema hiện đủ cho 5 commands).
- KHÔNG mở UI workbench (thuộc P1-F1, post E0/E1 freeze).
- KHÔNG mở outbox/event producer (thuộc N-series; F0 chỉ structured log).
- KHÔNG tạo Worker/Episode/Assignment cho Client-managed EFFECTIVE (DEC-07; Plan §29 "Do not force Worker creation for client-managed direct hire").
- KHÔNG mở HRP-managed EFFECTIVE atomic workforce bridge (N4 territory — DEC-07).
- KHÔNG mở multi-Org isolation (Repo single-tenant; Org boundary là future additive).
- KHÔNG sửa E0/E1, P1-B, P1-A0/A1, PLANNER_HANDOVER.
- KHÔNG sửa `app/admin/applications/**` / `app/api/admin/applications/**` / `src/domains/applications/placement-ui.ts` / `placement-panel.tsx` (MP-3C territory).
- KHÔNG sửa `app/admin/labor-profiles/**` / `src/domains/job-board/public.service.ts` / `app/(jobs)/viec-lam/**`.
- KHÔNG fork `src/shared/integrity/idempotency/**`; F0 chỉ wrap consumer-side.
- KHÔNG fork `src/shared/auth/with-db-context.ts`/`with-authorized-db.ts`/`auth-context.ts`; F0 chỉ consume.
- KHÔNG cài package mới (F0 chỉ wrap helper có sẵn).
- KHÔNG bypass `withDbContext` để chạy ngoài transaction (sẽ phá RLS GUC).
- KHÔNG tự ý thêm permission code nếu OD-P1F0-01 chốt Option (ii) role-only.

## 2. Evidence

Chỉ liệt kê evidence Tier 1 cần để implement. Mọi assertion đều có file:line cụ thể; không suy luận ngoài mã nguồn.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/talent/placement.service.ts:103` (`createPlacement`) + `:454` (`confirmPlacement`) + `:458` (`markPlacementEffective`) + `:468` (`failPlacement`) + `:472` (`cancelPlacement`) | 5 named canonical commands đã production-ready, unit-tested, DB integration-tested (15 scenarios). F0 chỉ wrap. |
| `EV-02` | `src/domains/talent/placement.errors.ts:14-60` (`PlacementError` + 4 subclass với `code` cố định) | Error taxonomy freeze; F0 dùng nguyên và map sang HTTP status canonical. |
| `EV-03` | `src/domains/talent/placement.lifecycle.ts:51-88` (`canTransition`) + `:23-33` (`computeManagementMode`) + `:107-113` (`allowedTransitions`) | Pure state machine; DEC-02, DEC-05 đã freeze. Service đã enforce; F0 không cần gọi trực tiếp. |
| `EV-04` | `src/domains/talent/placement.resolution.ts:26-124` (`assertClassifiedJobOpening` + `resolveClientCompanyIdForJobOpening`) | FK chain resolver; DEC-06, DEC-10. Service đã dùng; F0 không gọi trực tiếp. |
| `EV-05` | `src/shared/auth/auth-context.ts:51-97` (`getAuthContext`) + `src/shared/auth/with-db-context.ts:34-43` (`withDbContext`) + `src/shared/auth/with-authorized-db.ts` (`withAuthorizedDb`) | Auth + RLS GUC primitives; F0 route dùng nguyên. |
| `EV-06` | `src/shared/auth/permission-catalog.ts:37-109` (14 codes; KHÔNG có placement/talent code) + `src/shared/auth/permission-resolver.ts` (`resolveEffectivePermissions`) | Catalog gap: không có `CAN_*` cho placement; OD-P1F0-01 quyết policy. |
| `EV-07` | `src/shared/integrity/idempotency/**` (`withIdempotency` wrap qua bảng `idempotency_keys`) | F0 wrap transition commands consumer-side; KHÔNG fork helper. |
| `EV-08` | `tests/db/placement-lifecycle-integration.test.ts` (15 scenarios `i..xv` + ENV_BLOCKED honest report) | DB integration test surface hiện hữu; F0 mở file mới `tests/db/p1f0-placement-command-api.integration.test.ts` chứ KHÔNG fork file này. |
| `EV-09` | `src/domains/talent/placement.service.test.ts` (≥30 it-blocks: create/confirm/effective/fail/cancel + race-loser + state-mismatch F-08/F-09) | Service-level coverage rất đầy đủ; F0 không viết lại unit test cho service. |
| `EV-10` | `app/api/admin/applications/[id]/actions/convert/route.ts:1-54` (route pattern reference) — `getAuthContext` + 401 map + body parse + `withDbContext(getPrisma(), ctx, ...)` + error map `ConversionError` → HTTP status với `error.httpStatus`. | Reference pattern cho F0 route shape: thin layer wrap service + AuthContext + RLS GUC + error mapping. |
| `EV-11` | `prisma/schema.prisma:1516-1637` (`PlacementCaseStatus`, `PlacementStatus`, `ServiceModel`, `PlacementCase`, `Placement`) | Schema đủ cho 5 commands; KHÔNG schema change trong F0. |
| `EV-12` | `prisma/migrations/20260914212136_n3_service_model_placement` (placements table + unique partial index `placements_active_unique` + RLS policies FORCE RLS) | DB-level invariant đã enforce; F0 không mở migration. |
| `EV-13` | `prisma/migrations/20260912140411_n1_placement_case_foundation` (`placement_case` table + partial unique index `placement_case_labor_profile_id_active_unique` + RLS) | DB-level invariant đã enforce; F0 chỉ wrap service. |
| `EV-14` | `app/admin/applications/page.tsx` (MP-3C) + `src/domains/applications/placement-ui.ts` + `placement-panel.tsx` — comment xác nhận MP-3C territory | F0 KHÔNG dùng những file này cho N3 placement; route mới ở `app/api/admin/placements/**` riêng biệt. |
| `EV-15` | `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md` v1.0 (planning pin tại branch này) | Capability matrix toàn diện + residual R-F1..R-F8 + §4 outcome + §5 Open Decision. |
| `EV-16` | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §23–§30 (P1 thin slice + P1-A..F definitions); §29 = P1-F Placement lifecycle. | Roadmap authoritative cho placement domain; F0 định nghĩa thin contract đúng §29. |
| `EV-17` | `docs/N8N_AUTOMATION_BOUNDARY.md` §2, §4 (HRP-owned state/auth/transition/idempotency; n8n không nắm placement authority) | F0 không mở outbox/event producer; n8n chỉ post-commit notification (N-series). |
| `EV-18` | `docs/discovery/realignment/P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION.md` (planning pin `51d152d`) — E0 §3 `RecruiterWorkbenchRow` DTO + E1 UI follow-up | F1 sẽ wire 5 named commands vào workbench row actions; F0 chỉ chốt API contract + named command strings. |
| `EV-19` | `app/api/admin/applications/[id]/route.ts` (existing GET handler pattern — `getAuthContext` + `withDbContext` + 401/403/404 mapping) | Reference pattern cho route handler `app/api/admin/placements/[id]/{confirm,effective,fail,cancel}/route.ts`. |
| `EV-20` | `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` v1.2 (planning pin `51d152d`) — E0 §3 contract | E0 chưa ACCEPTED nhưng E0 §3 đã freeze contract cho `RecruiterWorkbenchRow` DTO; F0 named command names (`placement.create`/`.confirm`/...) phải đồng bộ với E0 §3 nếu E0 đã đặt tên canonical action. Cross-check trong implementation round. |

## 3. Decisions

### 3.1 Build vs Adopt

`Build vs adopt = ADOPT`.

| Reuse hiện hữu (ưu tiên 1) | Library/version/source | License | Framework/runtime compatibility | Wrapper boundary |
|---|---|---|---|---|
| `placement.service.ts` (5 commands) | Repo internal, N3 production-ready | Repo (Apache-2.0 inferred) | Next.js 14.x + Prisma 5.x + TypeScript 5.x | `src/domains/talent/placement.commands.ts` (thin adapter — chỉ map input + wrap `withDbContext` + emit metric/log; không sửa service) |
| `placement.errors.ts` (error taxonomy) | Repo internal | Repo | Same | Adapter throw `PlacementError` nguyên; route layer map sang HTTP status |
| `placement.lifecycle.ts` (pure state machine) | Repo internal | Repo | Same | Adapter không gọi trực tiếp; service đã enforce |
| `placement.resolution.ts` (FK chain resolver) | Repo internal | Repo | Same | Adapter không gọi trực tiếp; service đã enforce |
| `AuthContext` + `withDbContext` + `withAuthorizedDb` | Repo internal (`src/shared/auth/**`) | Repo | Same | Route handler wrap nguyên; KHÔNG sửa helper |
| `resolveEffectivePermissions` + `permission-catalog.ts` | Repo internal (`src/shared/auth/**`) | Repo | Same | Adapter/route gọi `resolveEffectivePermissions(ctx.userId)` rồi check code; nếu OD-P1F0-01 chốt Option i/iii → additive edit catalog (KHÔNG sửa code/group hiện hữu) |
| `withIdempotency` (`src/shared/integrity/idempotency/**`) | Repo internal | Repo | Same | Transition commands wrap qua helper consumer-side; create command KHÔNG wrap (đã race-safe qua unique partial index) |
| `placement.service.test.ts` + `placement.lifecycle.test.ts` + `placement.resolution.test.ts` + `placement-case.service.test.ts` | Repo internal | Repo | Same | F0 không viết lại; chỉ thêm `placement.commands.test.ts` cho adapter + `placement.commands.routes.test.ts` cho AST/static guard |
| `tests/db/placement-lifecycle-integration.test.ts` | Repo internal | Repo | Same | F0 mở file mới `tests/db/p1f0-placement-command-api.integration.test.ts`; KHÔNG fork file hiện hữu |

| Adopt (ưu tiên 2) | Ghi chú |
|---|---|
| Không có thư viện mới cần adopt trong F0. Toàn bộ capability đã có sẵn trong repo. | Nếu implementation phát hiện cần HTTP client library (vd `zod` cho body validation), sẽ mở round riêng với `BUILD_VS_ADOPT = ADOPT` + evidence. Tier 1 hiện chưa phát hiện gap; body shape gate có thể dùng hand-crafted guards (P1-B pattern). |

| Đề xuất mới (ưu tiên 3) | Ghi chú |
|---|---|
| Không có ở round documentation. | Nếu cần, sẽ mở round riêng với evidence. |

**Kết luận**: `ADOPT` cho toàn bộ stack hiện hữu. F0 không thêm dependency mới, không fork helper, không viết lại unit test cho service đã có.

### 3.2 Build vs Automate

`Build vs automate = N/A`.

Lý do:
- F0 là **admin API route** (mutation authority nội bộ HRP), KHÔNG phải connector/scheduler/notification worker.
- F0 KHÔNG tạo workflow lặp lại (recurring) hay multi-system automation.
- F0 KHÔNG mở outbox/event producer (thuộc N-series; F0 chỉ structured log).
- n8n boundary: theo `docs/N8N_AUTOMATION_BOUNDARY.md` §4 — n8n KHÔNG nắm placement transition authority; chỉ post-commit notification. F0 giữ nguyên.

Nếu N-series mở sau này và cần subscribe `PlacementTransitionCommitted` event, sẽ mở task riêng với `BUILD_VS_AUTOMATE = ORCHESTRATE` + boundary contract.

## 4. Contract

### 4.1 Functional requirements

| ID | Requirement | Verification method |
|---|---|---|
| `RQ-01` | 5 named canonical commands expose qua HTTP admin API: `placement.create`, `placement.confirm`, `placement.effective`, `placement.fail`, `placement.cancel`. Exact route shape theo §4.1.1. | Static AST guard + integration test gọi route handler. |
| `RQ-02` | `placement.create` — `POST /api/admin/placements` với `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId? }` → 201 `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }`. Wrap `withDbContext`. Verify AuthContext + permission (theo OD-P1F0-01). Gọi `createPlacement` nguyên từ service. Race-safe nhờ `placements_active_unique` partial unique index (DEC-04a). Idempotent replay khi cùng `(placementCaseId, jobOpeningId)` qua `findActivePlacement` check (DEC-09). | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts`; `npm run test:unit -- src/domains/talent/placement.commands.test.ts`. |
| `RQ-03` | `placement.confirm` — `POST /api/admin/placements/[id]/confirm` với body `{}` + `Idempotency-Key` header UUID (canonical, KHÔNG ghi "header hoặc body"). Wrap `withIdempotency` (R-F3). Gọi `confirmPlacement` nguyên. 200 `{ placementId, status: 'CONFIRMED', replayed }`. Conditional UPDATE với status guard (DEC-12). | Same as RQ-02 + verify replay qua duplicate header. |
| `RQ-04` | `placement.effective` — `POST /api/admin/placements/[id]/effective` với `{ evidence: { clientAcknowledgedAt: ISO, clientAcknowledgedByUserId, acknowledgementRef } }` + `Idempotency-Key`. Gọi `markPlacementEffective`. 200 `{ placementId, status: 'EFFECTIVE', replayed, placementCaseClosed: true }` cho Client-managed thành công. **HRP-managed** → REJECT với HTTP 422 `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (R-F5.A). Evidence thiếu field → 400 `PLACEMENT_VALIDATION_ERROR`. Client-managed thành công → Placement EFFECTIVE + PlacementCase CLOSED atomic (AC-07). KHÔNG tạo Worker. | Integration test cover Client-managed EFFECTIVE + HRP-managed REJECT + evidence thiếu field. |
| `RQ-05` | `placement.fail` — `POST /api/admin/placements/[id]/fail` với `{ reason }` + `Idempotency-Key`. Gọi `failPlacement`. 200 `{ placementId, status: 'FAILED', replayed }`. SELECTED \| CONFIRMED → FAILED (DEC-05). | Same as RQ-02. |
| `RQ-06` | `placement.cancel` — `POST /api/admin/placements/[id]/cancel` với `{ reason }` + `Idempotency-Key`. Gọi `cancelPlacement`. 200 `{ placementId, status: 'CANCELLED', replayed }`. SELECTED \| CONFIRMED → CANCELLED (DEC-05). | Same as RQ-02. |
| `RQ-07` | Error mapping canonical: `PLACEMENT_VALIDATION_ERROR` → 400; `INVALID_STATE_TRANSITION` → 409; `PLACEMENT_NOT_FOUND` → 404; `PLACEMENT_IDEMPOTENCY_CONFLICT` → 409; `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` → 422; `AuthSessionError` → 401; permission deny → 403; invalid body shape → 400 `VALIDATION`; missing `Idempotency-Key` → 400 `IDEMPOTENCY_REQUIRED`. Response shape `{ error: <code>, message: <message>, details?: <details> }` đồng nhất với `convert/route.ts:46-50`. | `npm run test:unit -- src/domains/talent/placement.commands.test.ts` cover toàn bộ error mapping. |
| `RQ-08` | Permission + object-scope: Mỗi command yêu cầu permission code theo OD-P1F0-01 chốt. Tạm thời (chờ OD chốt) Tier 1 đề xuất: `placement.create` → `CAN_CREATE_PLACEMENT`; `placement.confirm`/`fail`/`cancel` → `CAN_TRANSITION_PLACEMENT`; `placement.effective` → `CAN_RECORD_PLACEMENT_EFFECTIVE`. Nếu OD-P1F0-01 chốt Option (ii) role-only → chỉ ADMIN/HR_MANAGER được; role khác → 403. `resolveEffectivePermissions(ctx.userId)` + check Set lookup O(1) (catalog hiện hữu). | Unit test cover deny path. |
| `RQ-09` | RLS GUC apply qua `withDbContext`: `app.user_id` + `app.role` set transaction-local qua `set_config(..., true)` (`src/shared/auth/rls-context.ts`). Service chạy trong transaction qua `tx.placement.*` — DB-level RLS `placements` + `placement_case` đã enforce qua FORCE RLS (verify qua integration test `(vii)` của N3 hiện hữu). KHÔNG application-layer filter bypass RLS. | Integration test `(vii)`-style (HR_MANAGER vs PUBLIC); verify route handler gọi `withDbContext`. |
| `RQ-10` | Idempotency-Key wrap: transition commands (`confirm`/`effective`/`fail`/`cancel`) wrap qua `withIdempotency` (`src/shared/integrity/idempotency/**`) consumer-side. `create` KHÔNG wrap (đã race-safe qua unique partial index DEC-04a + idempotent qua `findActivePlacement` DEC-09). Key format = UUID v4 (canonical, theo A0/A1 pattern). Header `Idempotency-Key` UUID required (KHÔNG ghi "header hoặc body"). Duplicate request (same key + same payload) → replay 200 với `replayed=true`. Different payload same key → 409 `IDEMPOTENCY_CONFLICT`. | Integration test cover replay + conflict. |
| `RQ-11` | Structured log chỉ `placementId/transition/actorId/correlationId/managementMode/fromStatus/toStatus/replayed/errorCode` qua `src/shared/observability/logger.ts`. KHÔNG log raw `failureReason` text (có thể chứa PII). KHÔNG log evidence fields. KHÔNG log full body. | `npm run test:unit -- src/domains/talent/placement.commands.test.ts` assert log shape qua mock logger. |
| `RQ-12` | Boundary với các task khác rõ ràng: KHÔNG đụng `app/admin/applications/**`, `app/api/admin/applications/**`, `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` (MP-3C territory); KHÔNG đụng `app/admin/labor-profiles/**`, `src/domains/job-board/public.service.ts`, `app/(jobs)/viec-lam/**`; KHÔNG sửa E0/E1 task docs; KHÔNG sửa `docs/PLANNER_HANDOVER.md`. F1 (UI workbench) là task riêng post E0/E1 freeze; F0 chỉ chốt API contract + named command strings. | `git status --porcelain` chỉ chứa in-scope roots §0; `git diff --cached --stat` = 0 hit cho forbidden paths. |
| `RQ-13` | KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`. KHÔNG migration mới. Schema hiện đủ cho DEC-03..DEC-12 (EV-11). | Same as RQ-12. |
| `RQ-14` | KHÔNG fork `src/domains/talent/placement.service.ts`/`placement.lifecycle.ts`/`placement.resolution.ts`/`placement.errors.ts`/`placement-case.service.ts`. F0 chỉ wrap service qua adapter mới. | `git diff --cached --stat` = 0 hit cho các file service; AST guard verify route imports đúng từ `placement.commands.ts`. |
| `RQ-15` | n8n boundary: F0 KHÔNG mở outbox/event producer; chỉ structured log. Post-commit `PlacementTransitionCommitted` event (eventId, correlationId, payload `{placementId, fromStatus, toStatus, managementMode, placementCaseId, laborProfileId, clientCompanyId?, projectId?, evidenceAcknowledgedAt?}`) thuộc N-series. n8n KHÔNG nắm placement transition authority (`docs/N8N_AUTOMATION_BOUNDARY.md` §4). | `npm run test:unit -- src/domains/talent/placement.commands.routes.test.ts` AST guard verify route không import `@/src/shared/integrity/outbox/**` hoặc tương đương. |
| `RQ-16` | Client-managed EFFECTIVE KHÔNG ép Worker creation (Plan §29; DEC-07). `closePlacementCaseSuccess` chỉ update PlacementCase status='CLOSED' + closedAt + closeReason; không tạo Worker/Episode/Assignment. HRP-managed EFFECTIVE REJECT với `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` (N4 territory). | Integration test cover Client-managed EFFECTIVE + verify Worker table không có row mới; HRP-managed EFFECTIVE → 422 reject. |

#### 4.1.1 Exact route shape (proposed — chờ OD-P1F0-06 chốt)

| Method | Path | Body | Headers | Success response | Errors |
|---|---|---|---|---|---|
| `POST` | `/api/admin/placements` | `{ placementCaseId: string, jobOpeningId: string, sourceCandidateSubmissionId?: string }` | (cookie auth — Next.js session) | `201 { placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed }` | `400 VALIDATION` (body shape); `401 NO_TOKEN`/`INVALID_TOKEN`/`USER_INACTIVE`; `403 FORBIDDEN` (permission); `404 PLACEMENT_CASE_NOT_FOUND` (subclass của `PLACEMENT_VALIDATION_ERROR` — dùng code `PLACEMENT_VALIDATION_ERROR` chung + message rõ); `409 INVALID_STATE_TRANSITION` (case CLOSED); `400 PLACEMENT_VALIDATION_ERROR` (FK chain broken, ServiceModel NULL); `409 PLACEMENT_IDEMPOTENCY_CONFLICT` |
| `POST` | `/api/admin/placements/[id]/confirm` | `{}` | `Idempotency-Key: <UUID v4>` required | `200 { placementId, status: 'CONFIRMED', replayed }` | `400 IDEMPOTENCY_REQUIRED` (thiếu header); `409 IDEMPOTENCY_CONFLICT` (same key different payload); `404 PLACEMENT_NOT_FOUND`; `409 INVALID_STATE_TRANSITION`; `400 PLACEMENT_VALIDATION_ERROR` |
| `POST` | `/api/admin/placements/[id]/effective` | `{ evidence: { clientAcknowledgedAt: ISO-8601, clientAcknowledgedByUserId: string, acknowledgementRef: string } }` | `Idempotency-Key: <UUID v4>` required | `200 { placementId, status: 'EFFECTIVE', replayed, placementCaseClosed: true }` (Client-managed) | Same as confirm + `422 HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED`; `400 PLACEMENT_VALIDATION_ERROR` (evidence thiếu field) |
| `POST` | `/api/admin/placements/[id]/fail` | `{ reason: string }` | `Idempotency-Key: <UUID v4>` required | `200 { placementId, status: 'FAILED', replayed }` | Same as confirm |
| `POST` | `/api/admin/placements/[id]/cancel` | `{ reason: string }` | `Idempotency-Key: <UUID v4>` required | `200 { placementId, status: 'CANCELLED', replayed }` | Same as confirm |

### 4.2 Scope boundaries

- **In**: thin backend adapter `src/domains/talent/placement.commands.ts` (mới); 5 admin route files mới; targeted unit tests + AST/static guard + DB integration test mới; additive permission catalog seed (nếu OD-P1F0-01 chốt Option i/iii).
- **Out**: `placement.service.ts`/`placement.lifecycle.ts`/`placement.resolution.ts`/`placement.errors.ts`/`placement-case.service.ts` (production-ready, F0 chỉ wrap); `prisma/schema.prisma`/`package.json`/`package-lock.json` (F0 không schema change); `app/admin/applications/**` + `app/api/admin/applications/**` + `src/domains/applications/placement-ui.ts` + `placement-panel.tsx` (MP-3C territory); `app/admin/labor-profiles/**` + `src/domains/job-board/public.service.ts` + `app/(jobs)/viec-lam/**`; E0/E1 task docs + P1-B + P1-A0/A1 + PLANNER_HANDOVER; `src/shared/integrity/idempotency/**` (F0 chỉ wrap consumer-side); `src/shared/auth/**` (F0 chỉ consume); `vitest*.config.ts` (registry-only edit nếu cần — pattern đã chốt ở E0 v1.2 round-3); `tests/db/placement-lifecycle-integration.test.ts` (KHÔNG fork, F0 mở file mới).
- **Allowed task artifacts**: `docs/tasks/hrp-p1-f0-placement-command-api/**` (TASK.md + HANDOFF.md + AUDIT.md + evidence/) + discovery doc `docs/discovery/realignment/P1F_PLACEMENT_OUTCOME_RECONCILIATION.md`.

### 4.3 Domain boundaries

- **Data/state**: `Placement` + `PlacementCase` + `JobOpening` + `StaffingOrder` + `Project` + `ClientCompany` + `LaborProfile`. F0 chỉ wrap service hiện hữu (`createPlacement`/`confirmPlacement`/`markPlacementEffective`/`failPlacement`/`cancelPlacement`) — không INSERT/UPDATE trực tiếp từ route/adapter. `PlacementCase` chỉ đóng atomic qua `closePlacementCaseSuccess` (chỉ Client-managed EFFECTIVE).
- **Permission/security**: AuthContext từ cookie/JWT (`getAuthContext`) → `withDbContext` apply RLS GUC transaction-local. Permission check qua `resolveEffectivePermissions` + catalog (per OD-P1F0-01). Body shape gate hand-crafted (P1-B pattern). Idempotency-Key header UUID required cho transition commands. Rate-limit: KHÔNG thuộc F0 (admin route internal Next.js — không cần rate-limit giống public route; Owner Decision riêng nếu cần).
- **Interface/API**: §4.1.1. Tất cả response là JSON. Status code canonical theo RQ-07.
- **Migration/rollback**: KHÔNG migration mới. F0 chỉ additive edit (nếu OD-P1F0-01 chốt catalog Option i/iii) — additive edit không cần migration vì `permissions` table đã có schema (catalog là data, không phải schema). Nếu cần seed delta, sửa `prisma/seed.mjs` §4.2.

### 4.4 RQ → STEP → AC Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-01, STEP-02 | `AC-01` |
| `RQ-02` | STEP-01, STEP-02 | `AC-01` |
| `RQ-03` | STEP-02 | `AC-02`, `AC-06` |
| `RQ-04` | STEP-02 | `AC-03`, `AC-04`, `AC-16` |
| `RQ-05` | STEP-02 | `AC-02`, `AC-06` |
| `RQ-06` | STEP-02 | `AC-02`, `AC-06` |
| `RQ-07` | STEP-02 | `AC-05` |
| `RQ-08` | STEP-03 | `AC-07` |
| `RQ-09` | STEP-01, STEP-02 | `AC-08` |
| `RQ-10` | STEP-02 | `AC-06` |
| `RQ-11` | STEP-01, STEP-02 | `AC-11` |
| `RQ-12` | STEP-02 | `AC-12`, `AC-13`, `AC-14` |
| `RQ-13` | STEP-02 | `AC-12`, `AC-13`, `AC-14` |
| `RQ-14` | STEP-01 | `AC-12` |
| `RQ-15` | STEP-02, STEP-05 | `AC-15` |
| `RQ-16` | STEP-02 | `AC-03`, `AC-04`, `AC-16` |

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/placement.commands.ts` (mới) | Thin adapter: map input từ route → service input; wrap `withDbContext` + `withAuthorizedDb`; emit structured log; throw `PlacementError` nguyên. KHÔNG sửa service. KHÔNG viết logic business mới. | `AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-11` | Fork service / thêm state mới / wrap logic business / duplicate resolution logic |
| `STEP-02` | `app/api/admin/placements/route.ts` (mới — create) + 4 transition route files mới (`[id]/{confirm,effective,fail,cancel}/route.ts`) | Route handler pattern theo `app/api/admin/applications/[id]/actions/convert/route.ts:1-54`: `getAuthContext` + 401 map + body parse + permission check (theo OD-P1F0-01) + `withIdempotency` wrap (transition only) + gọi `placement.commands.ts` + error map → HTTP status canonical. Header `Idempotency-Key` UUID required cho transition. Body shape gate hand-crafted. KHÔNG log raw PII. KHÔNG mở CV upload. KHÔNG wrap `createPlacement` qua `withIdempotency`. | `AC-01`..`AC-12`, `AC-15` | Route mở Idempotency-Key optional / wrap create qua withIdempotency / log PII / bypass AuthContext / fork service / mở CV upload |
| `STEP-03` | `src/shared/auth/permission-catalog.ts` (ADDITIVE EDIT — chỉ nếu OD-P1F0-01 chốt Option i/iii) + `prisma/seed.mjs` §4.2 (ADDITIVE EDIT) | Thêm `PERMISSION_GROUPS.TALENT = 'TALENT'` (nếu chưa); thêm 3 codes (Option i) hoặc 1 code `CAN_MANAGE_PLACEMENT` (Option iii). Seed cho `ADMIN`, `HR_MANAGER`. KHÔNG sửa code/group hiện hữu. | `AC-08` | Sửa code hiện hữu / reorder group / sửa seed cũ |
| `STEP-04` | `src/domains/talent/placement.commands.test.ts` (mới) | Unit test cho adapter: map input, wrap context, error taxonomy nguyên vẹn. Mock `withDbContext` qua spy. | `AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AC-11` | Test bypass adapter / fork service / cover service logic (đã có test riêng) |
| `STEP-05` | `src/domains/talent/placement.commands.routes.test.ts` (mới — AST/static guard) | (a) KHÔNG fork service (`placement.service.ts`); (b) KHÔNG mở CV upload; (c) KHÔNG đụng MP-3C territory; (d) KHÔNG mở outbox/event producer; (e) KHÔNG log raw PII; (f) KHÔNG bypass `withDbContext`; (g) route chỉ import từ `placement.commands.ts`; (h) `Idempotency-Key` UUID required cho transition. | `AC-12`, `AC-13`, `AC-14`, `AC-15` | Static test giả tạo / duplicate surface |
| `STEP-06` | `tests/db/p1f0-placement-command-api.integration.test.ts` (mới; synthetic DB; ENV_BLOCKED fail-closed) | Cover happy path 5 commands qua route handler (không gọi service thuần); Client-managed EFFECTIVE + atomic PlacementCase close + verify Worker table không có row mới; HRP-managed EFFECTIVE → 422 reject; idempotency replay (transition) + conflict (different payload same key); race-loser (concurrent confirm + cancel) qua route handler; permission deny; AuthContext missing → 401; body shape invalid → 400; RLS verify HR_MANAGER vs PUBLIC qua route. Runtime role không set `app.role` GUC. | `AC-01`..`AC-12`, `AC-15`, `AC-16` | Test fail / leak / race regression / fake PASS / fork file cũ |
| `STEP-07` | Gate evidence | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`; `pwsh .ai-pipeline/scripts/verify-task.ps1`; `git diff --check`. | tất cả AC | Gate fail |
| `STEP-08` | HANDOFF.md pin exact frozen Implementation SHA | Sau khi implementation freeze SHA, ghi `Implementation SHA` + freeze source. Chỉ thêm docs/evidence sau freeze; source/test/migration đổi tiếp phải tạo SHA mới. | HANDOFF.md verification | Quên pin SHA / tiếp tục sửa source sau freeze |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `POST /api/admin/placements` happy path: ADMIN gọi với `{ placementCaseId, jobOpeningId }` hợp lệ (PUBLISHED JobPosting/OPEN JobOpening chain) → 201 với `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed: false }`. Verify DB qua admin client. | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts`. |
| `AC-02` | 4 transition routes (`confirm`/`fail`/`cancel`): happy path từ SELECTED → CONFIRMED → FAILED; replay khi duplicate request (same key + same payload) → 200 với `replayed: true`. | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts` + verify replay via duplicate Idempotency-Key header. |
| `AC-03` | `placement.effective` Client-managed: CONFIRMED → EFFECTIVE + PlacementCase CLOSED atomic. Evidence persist vào DB columns. Verify Worker/Episode/Assignment table KHÔNG có row mới. | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts` + verify via DB inspection (Prisma). |
| `AC-04` | `placement.effective` HRP-managed → 422 `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED`. DB state KHÔNG đổi. Worker/Episode/Assignment KHÔNG tạo. Placement vẫn ở CONFIRMED. | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts`. |
| `AC-05` | Error mapping: `PLACEMENT_VALIDATION_ERROR` → 400; `INVALID_STATE_TRANSITION` → 409; `PLACEMENT_NOT_FOUND` → 404; `PLACEMENT_IDEMPOTENCY_CONFLICT` → 409; `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` → 422; `AuthSessionError` → 401; permission deny → 403; missing `Idempotency-Key` (transition) → 400 `IDEMPOTENCY_REQUIRED`; invalid body shape → 400 `VALIDATION`. Response shape `{ error, message, details? }` đồng nhất. | `npm run test:unit -- src/domains/talent/placement.commands.test.ts`. |
| `AC-06` | Idempotency-Key wrap: transition commands replay đúng (same key + same payload → 200 với `replayed: true`); conflict (same key + different payload) → 409 `IDEMPOTENCY_CONFLICT` (không 500). | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts` cover replay + conflict. |
| `AC-07` | Permission check: HR_STAFF gọi `placement.create` → 403 (theo OD-P1F0-01 chốt); ADMIN/HR_MANAGER pass. | `npm run test:unit -- src/domains/talent/placement.commands.test.ts` + `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts`. |
| `AC-08` | RLS GUC: route handler gọi `withDbContext` apply GUC. HR_MANAGER gọi route happy path; PUBLIC bypass → 401. | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts` via route handler. |
| `AC-09` | Body shape gate: invalid body → 400 `VALIDATION`. Evidence thiếu field → 400 `PLACEMENT_VALIDATION_ERROR`. | `npm run test:unit -- src/domains/talent/placement.commands.test.ts` + `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts`. |
| `AC-10` | Race-loser qua route handler: concurrent `confirm` + `cancel` → 1 thành công + 1 throw `PlacementIdempotencyConflictError` → 409. KHÔNG 500. | `npm run test:integration tests/db/p1f0-placement-command-api.integration.test.ts` concurrent fixture. |
| `AC-11` | Structured log: route gọi `src/shared/observability/logger.ts` với fields `placementId/transition/actorId/correlationId/managementMode/fromStatus/toStatus/replayed/errorCode`. KHÔNG log raw `failureReason`. KHÔNG log evidence fields. | `npm run test:unit -- src/domains/talent/placement.commands.test.ts` mock logger + assert shape. |
| `AC-12` | KHÔNG fork service: `git diff --cached --stat src/domains/talent/placement.service.ts` = 0 hit; `placement.lifecycle.ts`/`placement.resolution.ts`/`placement.errors.ts`/`placement-case.service.ts` cũng 0 hit. | `git diff --cached --stat` + `npm run test:unit -- src/domains/talent/placement.commands.routes.test.ts` AST guard. |
| `AC-13` | KHÔNG đụng MP-3C territory: `git diff --cached --stat` = 0 hit cho `app/admin/applications/**`, `app/api/admin/applications/**`, `src/domains/applications/placement-ui.ts`, `placement-panel.tsx`. | `git diff --cached --stat`. |
| `AC-14` | KHÔNG đụng E0/E1/P1-B/P1-A0/A1 docs: `git diff --cached --stat` = 0 hit cho `docs/tasks/hrp-p1-{a0,a1,b,e0,e1}-*/**`, `docs/PLANNER_HANDOVER.md`. | `git diff --cached --stat`. |
| `AC-15` | KHÔNG mở outbox/event producer: AST guard verify route KHÔNG import `@/src/shared/integrity/outbox/**` hoặc tương đương. F0 chỉ structured log. | `npm run test:unit -- src/domains/talent/placement.commands.routes.test.ts` AST guard. |
| `AC-16` | KHÔNG migration mới: `git diff --cached --stat prisma/migrations/` = 0 hit (trừ additive edit `prisma/seed.mjs` nếu OD-P1F0-01 chốt Option i/iii — KHÔNG tính migration mới). KHÔNG schema change. | `git diff --cached --stat prisma/`. |

## 7. Risk

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| `R-01` | Permission catalog gap (R-F1) chưa được Owner chốt → F0 không thể mở `READY_TO_CODE`. | Medium | High | OD-P1F0-01 là câu hỏi business rõ ràng; Tier 1 recommendation Option (i). Nếu Owner không phản hồi trong vòng round planning, Tier 1 chốt tạm Option (ii) role-only và ghi nhận trong §8 Open Decisions. |
| `R-02` | Route shape (§4.1.1) bị Owner từ chối → F0 contract phải re-round. | Low | Medium | Pattern tham khảo `app/api/admin/applications/[id]/actions/{...}` đã freeze; Tier 1 đề xuất đồng nhất. Owner có thể yêu cầu RESTful khác (vd `PATCH /api/admin/placements/[id]` với body `{ to: 'CONFIRMED' }`) — Tier 1 sẵn sàng re-contract v1.1 trong correction budget. |
| `R-03` | Idempotency wrap transition commands có thể introduce double-write risk nếu helper thay đổi. | Low | High | F0 không sửa helper; chỉ wrap consumer-side. Test cover replay + conflict. Helper đã có integration test riêng (`withIdempotency` round). |
| `R-04` | Race-loser giữa concurrent command có thể throw 500 nếu error handling không chuẩn. | Low | Medium | Round-4 fix F-08/F-09 đã freeze; F0 chỉ wrap, không fork. Integration test `(xiv)` + `(xv)` đã cover. F0 mở rộng test qua route handler. |
| `R-05` | `placement.effective` HRP-managed → 422 có thể bị Owner muốn 400 thay vì 422. | Low | Low | Tier 1 đề xuất 422 vì semantic khác validation. OD-P1F0-03 là câu hỏi rõ. |
| `R-06` | Catalog seed delta có thể cần additive migration nếu `permissions` table structure đã đóng băng. | Low | Low | Schema `permissions` đã có từ N1; F0 chỉ thêm rows qua seed. Nếu cần migration seed, sẽ mở Owner Decision riêng. |
| `R-07` | Tier 1 không có quyền tự chốt catalog policy → F0 chỉ `PROPOSED_ONLY` cho đến khi Owner chốt OD-P1F0-01. | High | High | Tài liệu này là planning; T0 round mới chốt contract. Implementation round chỉ mở sau khi contract → `READY_TO_CODE`. |
| `R-08` | E0 chưa ACCEPTED nhưng F0 reference `RecruiterWorkbenchRow` named command strings → có thể lệch tên khi E0 freeze. | Medium | Low | F0 đặt canonical name (`placement.create`/`.confirm`/`.effective`/`.fail`/`.cancel`); E0 §3 contract cross-check EV-20. Nếu E0 đặt khác, F0 sẽ align trong implementation round. Cross-check là STEP-00 prerequisite. |
| `R-09` | F1 UI workbench có thể cần thêm action ngoài 5 commands (vd `placement.replay` cho admin) — out-of-scope F0. | Low | Low | F1 là task riêng; nếu cần command mới, mở task additive với catalog update. |

## 8. Open Questions

Tất cả Open Decision phải được Owner/T0 chốt trước khi F0 → `READY_TO_CODE`.

| ID | Question | Recommendation (Tier 1) | Owner Decision |
|---|---|---|---|
| `OD-P1F0-01` | Permission model: Option (i) 3 codes tách biệt (`CAN_CREATE_PLACEMENT` / `CAN_TRANSITION_PLACEMENT` / `CAN_RECORD_PLACEMENT_EFFECTIVE`) / Option (ii) role-level only (ADMIN/HR_MANAGER) / Option (iii) 1 code gộp `CAN_MANAGE_PLACEMENT`? | Option (i) — granularity cao, mở rộng được. | ☐ |
| `OD-P1F0-02` | Idempotency-Key wrap transition commands (RQ-10)? | CÓ wrap. Tier 1 đề xuất consistency với `openPlacementCaseWithIdempotency` hiện hữu + convenience cho F1 UI + future N-series callback. | ☐ |
| `OD-P1F0-03` | `HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED` HTTP 422 (R-F5.A)? | Tách khỏi `PLACEMENT_VALIDATION_ERROR` (HTTP 400) để caller phân biệt "payload sai" vs "operation không khả thi ở mode này". | ☐ |
| `OD-P1F0-04` | Nếu OD-P1F0-01 chốt Option (i)/(iii), cập nhật `prisma/seed.mjs` §4.2 + additive migration seed (nếu cần)? | Tier 1 sẽ update seed; nếu cần migration sẽ mở Owner Decision riêng. | ☐ |
| `OD-P1F0-05` | F1 follow-up split (F0 API + F1 UI post E0/E1 freeze)? | Owner xác nhận split. F1 không thuộc round này. | ☐ |
| `OD-P1F0-06` | Route shape (§4.1.1) — pattern `POST /api/admin/placements/[id]/{action}` đồng nhất với `app/api/admin/applications/[id]/actions/{action}`? | Tier 1 đề xuất giữ nguyên pattern `[id]/{action}/route.ts` (đồng nhất). Nếu Owner muốn RESTful khác (vd `PATCH /api/admin/placements/[id]` với body `{ to: 'CONFIRMED' }`), Tier 1 sẽ re-contract v1.1. | ☐ |

## 9. Planner Resolution

| Round | Tier | Date | Resolution |
|---|---|---|---|
| v1.0 | T1B | 2026-09-26 | Initial planning. Status `PROPOSED_ONLY`. Contract gate `DRAFT`. Decision state `OPEN` (chờ T0 chốt OD-P1F0-01..06). Round này chỉ documentation; KHÔNG code, KHÔNG schema, KHÔNG migration, KHÔNG install. |

## 10. Revision Log

| Spec version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 2026-09-26 | T1B | Initial planning — capability matrix §2 + residual R-F1..R-F8 + 5 named commands contract + 6 Open Decision. Status `PROPOSED_ONLY`, Contract gate `DRAFT`, Decision state `OPEN`. |
