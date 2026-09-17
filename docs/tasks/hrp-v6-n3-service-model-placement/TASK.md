# TASK — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n3-service-model-placement` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` (theo TIER0_HANDOVER.md §5: "Tier 3 LIGHT bắt buộc cho migration và lifecycle") |
| Spec version | `v0.3 ACCEPTED` |
| Status | ACCEPTED |
| Planner | Tier 1 |
| Baseline | `40cd9d4` (origin/main, post N1 round-5 push) |
| Worktree | `C:\CodeApp\HrP-worktrees\tier1-n3-service-model-placement` (branch `tier1/n3-service-model-placement`) |
| Slicing | N3 chia thành 3 slices (A/B/C). Tier 0 cho phép chạy thẳng A→B→C qua gate, KHÔNG cần xin GO giữa slice. Stop point thực sự là gate của từng slice + audit + Tier 0 review branch. |
| In-scope roots | `prisma/schema.prisma`; `prisma/migrations/<stage>/` (kèm RLS + GRANTs); `src/domains/talent/placement.service.ts` (mới); `src/domains/talent/placement.errors.ts` (mới); `src/domains/talent/placement.lifecycle.ts` (mới); `src/domains/talent/placement.resolution.ts` (mới); `tests/domains/talent/placement.lifecycle.test.ts` (mới); `tests/domains/talent/placement.service.test.ts` (mới); `tests/domains/talent/placement.resolution.test.ts` (mới); `tests/db/placement-lifecycle-integration.test.ts` (mới); `docs/tasks/hrp-v6-n3-service-model-placement/**` |
| Forbidden paths | `src/domains/staffing/assignment-placement.service.ts` (MP-3C giữ nguyên); `app/api/admin/assignments/**`; `src/domains/talent/intake-writer.service.ts` (KHÔNG sửa trong N3 — theo chốt Tier 0); `src/domains/talent/intake-writer.*`; `app/(jobs)/**`; `app/admin/**`; `Worker`, `EmploymentEpisode`, `ProjectAssignment` populate `placementId`; route mới dưới `app/api/`. |
| Required gates | `npx prisma validate`; `npx prisma migrate status`; `npx tsc --noEmit`; `npx vitest run --config vitest.unit.config.ts` (full unit suite, không regress); `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` trên `DATABASE_URL_TEST` (Tier 0: test DB thật bắt buộc cho ranh giới migration/RLS/lifecycle); design-tokens carry-forward. |
| Merge/deploy gate | DB integration test PASS trên nhánh thử nghiệm (`hrp_mp2_test` hoặc DB test tương đương) **VÀ** Tier 3 LIGHT audit chấp nhận đúng diff cuối. `ENV_BLOCKED` là báo cáo trung thực, KHÔNG phải điều kiện PASS. Tier 1 KHÔNG tự merge `tier1/n3-service-model-placement` → `main`; KHÔNG tự apply migration lên `hrp-live`. |
| Production verification (independent) | N1 production rebuild + admin intake smoke vẫn MỞ; N3 KHÔNG biến nó thành "PASS". |

> Lane CRITICAL vì chạm migration (ADD `Placement` model + `JobOpening.serviceModel`) + lifecycle state machine + ranh giới N4 (không tạo Worker khi chưa actual HRP-managed start) + RLS/policy của bảng mới.

> TIER0_HANDOVER.md §5: N3 ServiceModel và Placement — phân biệt loại dịch vụ và kết quả bố trí. Không tạo Worker khi chưa actual HRP-managed start. Đây là nền cho AV2 publish và các bước vận hành tiếp theo.

> Chốt Tier 0 (2026-09-14 21:00): (1) một PlacementCase thuộc một LaborProfile — nhiều Placement lịch sử retry của cùng người, KHÔNG có chuyện candidate khác trong cùng case; (2) chống race ở DB bằng unique partial index `(placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')`; retry cùng idempotency key trả kết quả cũ; sau FAILED/CANCELLED → request mới = Placement mới; (3) Slice A xác định cả RLS/policy + runtime role GRANT cho bảng mới, không để cuối; (4) ENV_BLOCKED ≠ PASS — DB integration PASS trên nhánh thử nghiệm + Tier 3 LIGHT audit chấp nhận diff cuối mới đủ điều kiện xét merge/deploy; (5) Tier 1 push branch để review, KHÔNG tự merge main hay apply prod.

## 1. Outcome

### 1.1 User-visible outcome

- **`JobOpening.serviceModel`**: enum `STAFFING_SUPPLY | LABOR_LEASING | RECRUITMENT_SERVICE | REFERRAL_SERVICE`. Phase này ADD COLUMN nullable. Legacy opening chưa phân loại → `NULL` (KHÔNG dùng sentinel ngoài enum).
- **`Placement` model mới**: bản ghi placement độc lập với `ProjectAssignment`. Mỗi `Placement` thuộc về một `PlacementCase`. Một `PlacementCase` thuộc về đúng một `LaborProfile` (N1 foundation invariant) và có thể có N `Placement` lịch sử — tất cả đều của cùng một người (retry khi CONFIRMED fail hoặc CANCELLED). KHÔNG có candidate khác trong cùng case; candidate khác mở case mới.
- **`ProjectAssignment.placementId`** (nullable, V6P-013): ADD COLUMN nullable FK. Phase này KHÔNG populate (thuộc N4 atomic bridge).
- **Lifecycle đầy đủ:**
  - `SELECTED` (case-aware) → `CONFIRMED` → `EFFECTIVE` | `FAILED` | `CANCELLED`
  - Side exit: `SELECTED | CONFIRMED → FAILED | CANCELLED`
  - `EFFECTIVE → FAILED`: KHÔNG hỗ trợ revert trong phase này. Correction/void là command riêng (out of scope N3, sẽ làm ở V6P-020A hardening).
- **HRP-managed** (`STAFFING_SUPPLY | LABOR_LEASING`): N3 chỉ cho phép transition `SELECTED → CONFIRMED`. **KHÔNG có lệnh N3 nào đẩy HRP-managed sang `EFFECTIVE`**. Atomic workforce bridge (Worker + EmploymentEpisode + ProjectAssignment + close PlacementCase) thuộc **N4**.
- **Client-managed** (`RECRUITMENT_SERVICE | REFERRAL_SERVICE`): N3 hỗ trợ `SELECTED → CONFIRMED → EFFECTIVE` khi có bằng chứng xác nhận (client-acknowledged evidence). `EFFECTIVE` chỉ đóng `PlacementCase` SUCCESS + record `Placement` — KHÔNG tạo Worker/Episode/Assignment.
- **No Application mới** — dùng `CandidateSubmission` (N1).
- **Backfill legacy Placement**: thuộc N6 — KHÔNG làm trong N3.

### 1.2 Non-goals (N3 explicitly DOES NOT)

- KHÔNG tạo `Worker`, `EmploymentEpisode`, hoặc atomic workforce bridge. Đây là ranh giới N4.
- KHÔNG populate `ProjectAssignment.placementId`. (Cột được thêm nhưng để `NULL`.)
- KHÔNG đẩy HRP-managed `Placement` sang `EFFECTIVE`. Command `markPlacementEffective` không được phép chạy với HRP-managed.
- KHÔNG thay thế `ProjectAssignment` bằng `Placement` (tách biệt, hai concern khác nhau).
- KHÔNG backfill `serviceModel` cho existing `JobOpening` (legacy mở để `NULL`, không tự suy).
- KHÔNG backfill `Placement` cho existing `CandidateSubmission`/`ProjectAssignment` (thuộc N6).
- KHÔNG tạo UI (Admin/Public).
- KHÔNG tạo route HTTP mới (placement commands là service layer, expose ở phase sau). Vì vậy KHÔNG smoke qua curl — Tier 0 chốt bỏ smoke bằng curl nếu chưa có route.
- KHÔNG sửa `intake-writer.service.ts` (Tier 0 chốt bỏ).
- KHÔNG tạo command correction/void Placement (V6P-020A hardening — phase khác).
- KHÔNG cho phép ứng viên khác trong cùng `PlacementCase` (mỗi case gắn với một LaborProfile theo N1 foundation).
- KHÔNG tự merge vào `main` và KHÔNG tự apply migration lên `hrp-live` (Tier 0/Owner quyết).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/TIER0_HANDOVER.md §5 N3` + §11 (Tier 0 cấm: không tạo Worker khi selected/confirmed) | N3 ServiceModel + Placement lifecycle contract + ranh giới no Worker before actual start |
| `EV-02` | `docs/V7/V6_PLUS_IMPLEMENTATION_BACKLOG.md` §9 V6P-010A/010B + §10 V6P-011/012/013 + §12 V6P-014A/014B + §14 V6P-015A + §15 V6P-026A | Implementation backlog: Placement model schema, lifecycle commands, client-managed EFFECTIVE không Worker, HRP-managed actual-start boundary, serviceModel snapshot, fulfillment selector, idempotency cho critical commands |
| `EV-03` | `prisma/schema.prisma` line 447-465 (JobOpening) + line 319-330 (ClientCompany) + line 356-380 (Project) + line 395-405 (StaffingOrder) + line 637-700 (ProjectAssignment) + line 1462-1489 (PlacementCase) | FK chain: `JobOpening → StaffingOrder → Project → ClientCompany` để resolve `clientCompanyId`; current schema chưa có `serviceModel`/`Placement`/`placementId` |
| `EV-04` | `src/domains/staffing/assignment-placement.service.ts` (MP-3C pattern) + `src/domains/talent/placement-case.service.ts` (N1 pattern, `SAVEPOINT/ROLLBACK TO SAVEPOINT`) | Pattern hiện có cho service layer + idempotency + RLS + concurrency-safe |
| `EV-05` | `src/shared/integrity/idempotency.ts` + `src/shared/auth/with-db-context.ts` | Pattern reuse: idempotency + RLS transaction context |
| `EV-06` | `docs/TIER0_HANDOVER.md §8 Open Questions #5` (WorkClassification độc lập) + chốt Tier 0 ngày 2026-09-14 (Q-01..03 resolved) + chốt 21:00 (retry/RLS/Gate) | Phase này chỉ làm ServiceModel; WorkClassification tách riêng; clientCompanyId resolve qua FK chain; retry qua unique partial index; RLS trong Slice A |
| `EV-07` | `docs/PLANNER_HANDOVER.md v2.36` + `docs/V6/V6_OUTSTANDING_WORK_PLAN.md` | Roadmap Tier 1 đang theo |
| `EV-08` | N1 foundation invariant `placement_cases.labor_profile_id` (line ~1462-1489) — một case thuộc về một LaborProfile | DEC-04 chốt: một case thuộc một người; nhiều Placement trong case đó = retry của cùng người |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | `ServiceModel` enum chỉ chứa 4 giá trị nghiệp vụ: `STAFFING_SUPPLY | LABOR_LEASING | RECRUITMENT_SERVICE | REFERRAL_SERVICE`. `JobOpening.serviceModel` nullable. Legacy opening chưa phân loại → `NULL` (KHÔNG dùng sentinel `UNKNOWN_LEGACY` ngoài enum). UI/validation enforce NOT NULL sau khi Owner classify. | `CHOSEN` |
| `DEC-02` | Derived `managementMode`: `STAFFING_SUPPLY | LABOR_LEASING → HRP_MANAGED`; `RECRUITMENT_SERVICE | REFERRAL_SERVICE → CLIENT_MANAGED`. Computed at read time qua `placement.resolution.ts`, NOT stored as column. | `CHOSEN` |
| `DEC-03` | `Placement` model: `id, placementCaseId, laborProfileId, jobOpeningId?, clientCompanyId?, projectId?, serviceModelSnapshot (ServiceModel enum — chỉ set khi serviceModel của JobOpening ≠ NULL), status (SELECTED|CONFIRMED|EFFECTIVE|FAILED|CANCELLED), selectedAt?, confirmedAt?, effectiveAt?, failureReason?, sourceCandidateSubmissionId? (FK nullable), createdByUserId?, version, createdAt, updatedAt`. FK: `placementCaseId → PlacementCase (ON DELETE RESTRICT)`, `laborProfileId → LaborProfile`, `jobOpeningId → JobOpening (nullable — legacy có thể thiếu)`, `clientCompanyId → ClientCompany (nullable — legacy, xem DEC-06)`, `projectId → Project (nullable)`. | `CHOSEN` |
| `DEC-04` | Quan hệ `PlacementCase → N Placement` (KHÔNG 1:1; KHÔNG enforce unique `(case, opening, person)`). Một `PlacementCase` thuộc đúng một `LaborProfile` (N1 invariant). Một case có thể có nhiều `Placement` lịch sử — tất cả của cùng một người, retry khi CONFIRMED fail hoặc CANCELLED. KHÔNG có ứng viên khác trong cùng case; người khác mở case mới. | `CHOSEN` (chốt Tier 0 21:00) |
| `DEC-04a` | **DB-level anti-race unique partial index**: `CREATE UNIQUE INDEX placements_active_unique ON placements (placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED');` — đảm bảo tại một thời điểm chỉ có tối đa một Placement đang `SELECTED` hoặc `CONFIRMED` cho cùng `(case, opening)`. Sau khi một Placement chuyển sang `FAILED | CANCELLED | EFFECTIVE`, partial index giải phóng slot; request `createPlacement` mới sẽ tạo Placement mới cho lần thử tiếp theo của cùng người. | `CHOSEN` (chốt Tier 0 21:00) |
| `DEC-05` | Placement lifecycle: `SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED`. Side exits: `SELECTED | CONFIRMED → FAILED | CANCELLED`. `EFFECTIVE` KHÔNG thể revert trong phase này (correction/void command out of scope). Mỗi transition ghi audit event. | `CHOSEN` |
| `DEC-06` | `clientCompanyId` resolve rule: với `Placement` mới (không phải legacy backfill), resolve bắt buộc qua chain `JobOpening → StaffingOrder → Project → ClientCompany`. Nếu `JobOpening` thiếu `staffingOrderId` HOẶC `StaffingOrder` thiếu `Project` HOẶC `Project` thiếu `ClientCompany` → command `createPlacement` REJECT với `PlacementValidationError`. Cột `clientCompanyId` vẫn nullable trên schema (cho legacy), nhưng command KHÔNG cho phép tạo Placement mới với `clientCompanyId = NULL`. Tier 0 chốt: "Cột có thể nullable cho legacy, nhưng bản ghi mới không được thiếu công ty." | `CHOSEN` |
| `DEC-07` | HRP-managed `Placement` lifecycle bị giới hạn trong N3: chỉ cho phép `SELECTED` (mặc định) và `SELECTED → CONFIRMED`. Command `markPlacementEffective` REJECT với `PlacementValidationError` nếu `managementMode = HRP_MANAGED`. Atomic workforce bridge (Worker + EmploymentEpisode + ProjectAssignment + PlacementCase close SUCCESS) thuộc N4. | `CHOSEN` (chốt Tier 0) |
| `DEC-08` | Client-managed `Placement` lifecycle đầy đủ: `SELECTED → CONFIRMED → EFFECTIVE` khi input `evidence` (object chứa `clientAcknowledgedAt`, `clientAcknowledgedByUserId`, `acknowledgementRef`) hợp lệ. Không có evidence → REJECT. `EFFECTIVE` chỉ đóng `PlacementCase` SUCCESS + record `Placement` — KHÔNG tạo Worker/Episode/Assignment. | `CHOSEN` (chốt Tier 0) |
| `DEC-09` | Idempotency (retry behavior): (a) `SELECTED` → idempotent theo `(laborProfileId, placementCaseId, jobOpeningId)`. Retry trong khi Placement còn `SELECTED` hoặc `CONFIRMED` → trả placement hiện tại (anti-race nhờ DEC-04a unique partial index, nếu cố INSERT lần hai sẽ dính P2002 → command layer bắt và trả placement đã tồn tại). Retry sau khi placement chuyển `FAILED | CANCELLED` → index giải phóng, request mới tạo Placement mới cho lần thử tiếp theo. (b) `CONFIRMED` / `EFFECTIVE` / `FAILED` / `CANCELLED` → idempotent theo `placementId` (conditional UPDATE `WHERE id = ? AND status = ?`). Pattern reuse `withIdempotency`. | `CHOSEN` (chốt Tier 0 21:00) |
| `DEC-10` | `serviceModelSnapshot` trên Placement: chỉ set khi `JobOpening.serviceModel` ≠ NULL. Nếu `JobOpening.serviceModel` = NULL (legacy), `createPlacement` REJECT với `PlacementValidationError` hướng dẫn classify JobOpening. Snapshot immutable sau khi tạo. | `CHOSEN` |
| `DEC-11` | `ProjectAssignment.placementId` nullable column (V6P-013): Phase này ADD COLUMN nullable FK. KHÔNG populate. N4 sẽ populate khi atomic bridge chạy. | `CHOSEN` |
| `DEC-12` | Anti-retry + anti-race: mỗi command chạy trong transaction với `withDbContext` (RLS GUCs). `createPlacement` chống race bằng DEC-04a unique partial index (P2002 → bắt → trả placement hiện tại). Transition command chống race bằng conditional UPDATE (`UPDATE placements SET status = ? WHERE id = ? AND status = ?`) — database-level invariant, KHÔNG dựa vào read-modify-write. Bắt `Prisma.PrismaClientKnownRequestError P2002` để chuyển conflict thành `PlacementIdempotencyConflictError`. | `CHOSEN` |
| `DEC-13` | Test DB requirement: Tier 0 yêu cầu test trên DB thử nghiệm cho ranh giới migration/RLS/lifecycle, không coi unit test là đủ. Phase này: tạo `tests/db/placement-lifecycle-integration.test.ts` chạy trên `DATABASE_URL_TEST`. **`ENV_BLOCKED` là báo cáo trung thực, KHÔNG phải điều kiện PASS để merge hoặc deploy N3** — Tier 1 báo cáo nếu `DATABASE_URL_TEST` không khả dụng, nhưng KHÔNG đủ điều kiện xét merge/deploy; Tier 0/Owner quyết định tiếp tục hay tạm dừng. Trước khi xét đưa migration lên `hrp-live`, DB integration test phải PASS trên nhánh thử nghiệm (`hrp_mp2_test` hoặc tương đương) VÀ Tier 3 LIGHT audit phải chấp nhận đúng diff cuối. | `CHOSEN` (chốt Tier 0 21:00) |
| `DEC-14` | RLS / runtime role GRANTs (Slice A, không để cuối): bảng `placements` được tạo kèm RLS policy theo pattern N1 (`placement_cases` — HR_MANAGER + HR_STAFF + ADMIN short-circuit). Roles thực thi trong codebase là `app_user_writer` (write) và `app_user` (read) — `app_user_writer` được GRANT CRUD, policy TO `app_user_writer, app_user`. Force-RLS (`ALTER TABLE placements FORCE ROW LEVEL SECURITY`). Policy cho phép `app_user_writer` đọc/ghi row nếu predicate thoả (`hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')` — pattern giống `placement_case`). Migration chứa đầy đủ `CREATE POLICY`, `ALTER TABLE … ENABLE/FORCE ROW LEVEL SECURITY`, `GRANT SELECT/INSERT/UPDATE/DELETE ON placements TO app_user_writer` — Tier 1 verify trên DB test bằng `SET LOCAL ROLE app_user_writer`. | `CHOSEN` (chốt Tier 0 21:00) |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `JobOpening.serviceModel` là enum `STAFFING_SUPPLY | LABOR_LEASING | RECRUITMENT_SERVICE | REFERRAL_SERVICE`. Migration ADD COLUMN nullable. Không có sentinel ngoài enum. |
| `RQ-02` | Derived `managementMode` = `STAFFING_SUPPLY|LABOR_LEASING → HRP_MANAGED`; `RECRUITMENT_SERVICE|REFERRAL_SERVICE → CLIENT_MANAGED`. Computed at read time, không lưu cột. |
| `RQ-03` | `Placement` model: schema theo DEC-03. FK chain: `placementCaseId`, `laborProfileId`, `jobOpeningId`, `clientCompanyId`, `projectId`. `serviceModelSnapshot` nullable (chỉ set khi JobOpening có serviceModel). |
| `RQ-04` | Quan hệ `PlacementCase → N Placement`. Mỗi case thuộc một `LaborProfile`; nhiều Placement trong cùng case = retry của cùng người (DEC-04). |
| `RQ-04a` | Unique partial index `placements_active_unique (placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')` (DEC-04a). |
| `RQ-05` | Placement lifecycle state machine (DEC-05): SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED. Side exits: SELECTED | CONFIRMED → FAILED | CANCELLED. EFFECTIVE KHÔNG revert được trong N3. |
| `RQ-06` | HRP-managed: command `markPlacementEffective` REJECT với `PlacementValidationError` (DEC-07). |
| `RQ-07` | Client-managed `EFFECTIVE` placement yêu cầu `evidence.clientAcknowledgedAt` + `clientAcknowledgedByUserId` + `acknowledgementRef`. Thiếu → REJECT. `EFFECTIVE` không tạo Worker/Episode/Assignment. |
| `RQ-08` | Idempotency (DEC-09 + DEC-04a): SELECTED idempotent theo `(laborProfileId, placementCaseId, jobOpeningId)`; retry khi còn SELECTED/CONFIRMED trả placement hiện tại; retry sau FAILED/CANCELLED tạo Placement mới. CONFIRMED/EFFECTIVE/FAILED/CANCELLED idempotent theo `placementId`. |
| `RQ-09` | `serviceModelSnapshot` immutable: copy giá trị từ `JobOpening.serviceModel` tại SELECTED. Nếu `JobOpening.serviceModel` = NULL → REJECT với hướng dẫn classify JobOpening. |
| `RQ-10` | `ProjectAssignment.placementId` nullable column tồn tại, KHÔNG populate trong N3. |
| `RQ-11` | `clientCompanyId` resolve rule (DEC-06): với Placement mới, resolve bắt buộc qua `JobOpening → StaffingOrder → Project → ClientCompany`. Nếu chain broken → REJECT. Cột nullable trên schema cho legacy rows. |
| `RQ-12` | Anti-race (DEC-04a + DEC-12): unique partial index chống hai SELECTED/CONFIRMED cùng `(case, opening)`; conditional UPDATE với status guard chống race giữa hai command cùng transition. Bắt P2002 cho idempotency. |
| `RQ-13` | Migration ADD-only: không DROP/RENAME/ALTER data. Tier 0 chốt bỏ smoke curl nếu không có route. |
| `RQ-14` | RLS (DEC-14): bảng `placements` có `ENABLE + FORCE ROW LEVEL SECURITY`; policy theo pattern N1 (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`); `app_user_writer` được GRANT CRUD (`GRANT SELECT/INSERT/UPDATE/DELETE ON placements TO app_user_writer`); policy `TO app_user_writer, app_user`. Verify trên DB test bằng role switching (`SET LOCAL ROLE app_user_writer` thấy row; SET role khác ngoài app_user_writer/app_user không thấy row ngoài policy). Migration chứa `CREATE POLICY` + `GRANT` + `FORCE ROW LEVEL SECURITY`. |
| `RQ-15` | Test DB thật cho ranh giới migration/RLS/lifecycle (DEC-13). `ENV_BLOCKED` không thay thế PASS — báo cáo trung thực nhưng KHÔNG đủ điều kiện merge/deploy. |

### 4.2 Scope boundaries

**In:**
- `prisma/schema.prisma` — thêm `ServiceModel` enum, `PlacementStatus` enum, `serviceModel` trên `JobOpening` (nullable), `Placement` model, `placementId` trên `ProjectAssignment` (nullable).
- `prisma/migrations/<stage>/` — migration cho schema + RLS + GRANTs + unique partial index (Slice A làm hết RLS/GRANTs; Slice B không migration; Slice C nếu cần index bổ sung thuộc cùng migration).
- `src/domains/talent/placement.service.ts` — authority commands: `createPlacement` (SELECTED), `confirmPlacement`, `markPlacementEffective`, `failPlacement`, `cancelPlacement`.
- `src/domains/talent/placement.errors.ts` — domain errors: `PlacementValidationError`, `InvalidStateTransitionError`, `PlacementNotFoundError`, `PlacementIdempotencyConflictError`.
- `src/domains/talent/placement.lifecycle.ts` — pure state transition matrix.
- `src/domains/talent/placement.resolution.ts` — `resolveClientCompanyIdForJobOpening(tx, jobOpeningId)` + `computeManagementMode(serviceModel)` + `assertClassifiedJobOpening(jobOpening)`.
- `tests/domains/talent/placement.lifecycle.test.ts` — pure state transition tests (≥10 cases).
- `tests/domains/talent/placement.service.test.ts` — service layer tests (mocked Prisma): idempotency, anti-race, HRP vs client-managed guard.
- `tests/domains/talent/placement.resolution.test.ts` — resolution tests (mocked Prisma): FK chain broken → reject.
- `tests/db/placement-lifecycle-integration.test.ts` — integration test trên `DATABASE_URL_TEST`. Verify: schema migration apply, RLS + GRANT + role switching, lifecycle transitions, unique partial index anti-race, FK chain resolve, idempotency replay, retry-after-FAILED tạo Placement mới.
- `docs/tasks/hrp-v6-n3-service-model-placement/{TASK.md, HANDOFF.md, AUDIT.md, evidence/**}`.

**Out:**
- `src/domains/staffing/` (MP-3C giữ nguyên).
- `app/api/admin/assignments/` (MP-3C giữ nguyên).
- `src/domains/talent/intake-writer.service.ts` (Tier 0 chốt bỏ — không sửa).
- `Worker`, `EmploymentEpisode`, atomic workforce bridge, `ProjectAssignment.placementId` populate (thuộc N4).
- UI Admin/Public (thuộc AV2).
- Correction/void Placement command (V6P-020A hardening — phase khác).
- Backfill legacy Placement (thuộc N6).
- Route HTTP mới + smoke test bằng curl (Tier 0 chốt bỏ).
- Migration apply lên `hrp-live` (Tier 0/Owner quyết định).
- Tự merge `tier1/n3-service-model-placement` → `main` (Tier 0/Owner quyết định).

### 4.3 Domain boundaries

- **Data/state:**
  - `Placement` — append-only về lifecycle. `EFFECTIVE` không revert trong N3. `FAILED | CANCELLED` không revert về `SELECTED`. Lần thử mới sau `FAILED | CANCELLED` = Placement mới (DEC-04a index giải phóng).
  - `JobOpening.serviceModel` — nullable. Legacy rows `NULL` cho đến khi Owner classify.
  - `ProjectAssignment.placementId` — nullable column, KHÔNG populate trong N3.
  - `PlacementCase` status — KHÔNG đóng case trong N3 (trừ khi client-managed EFFECTIVE thì case close SUCCESS). HRP-managed case chỉ close ở N4 atomic bridge.

- **Permission/security:**
  - Placement commands yêu cầu `CAN_MANAGE_TALENT_CASE` hoặc ADMIN/HR_MANAGER (hardcode trong N3, giống N1).
  - RLS: bảng `placements` có RLS policy theo pattern N1 (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`; `TO app_user_writer, app_user`). Runtime role `app_user_writer` được GRANT CRUD (`GRANT SELECT/INSERT/UPDATE/DELETE ON placements TO app_user_writer`). Migration chứa policy + GRANT + FORCE RLS.

- **Interface/API:**
  - Placement commands là pure service layer (KHÔNG có route trong N3). UI/admin layer (sau AV2) sẽ wrap.

## 5. Execution Plan (per slice)

### 5.0 Slicing rationale

Tier 0 chốt "tự chia N3 thành các lát triển khai nhỏ nếu task gồm schema, RLS, command và lifecycle quá lớn". Tier 0 cho phép chạy thẳng A→B→C qua gate từng slice, không cần xin GO giữa slice; stop point thực sự là gate (typecheck + unit + DB integration) + Tier 3 LIGHT audit + Tier 0 review branch.

- **Slice A (Stage 1)** = schema + migration (kèm RLS + GRANT + unique partial index) + pure lifecycle module (chưa chạm DB thật). Verify bằng `prisma validate` + `prisma generate` + pure unit test cho state machine.
- **Slice B (Stage 2)** = service layer commands (mocked Prisma) + idempotency + anti-race + HRP-vs-client guard + retry-after-FAILED. Verify bằng unit test mock Prisma.
- **Slice C (Stage 3)** = DB integration test trên `DATABASE_URL_TEST` + HANDOFF + AUDIT + push branch. Tier 3 LIGHT audit.

### 5.1 Slice A — Schema, Migration (kèm RLS + GRANTs), Pure Lifecycle

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `A-01` | `prisma/schema.prisma` — thêm `ServiceModel` enum + `PlacementStatus` enum | Enums cho `JobOpening.serviceModel` và `Placement.status` | `npx prisma validate` | Build fail → fix |
| `A-02` | `prisma/schema.prisma` — `JobOpening.serviceModel` nullable field | ADD COLUMN phase A | `npx prisma validate` + `npx prisma generate` | Build fail → fix |
| `A-03` | `prisma/schema.prisma` — `Placement` model | Model theo DEC-03 | `npx prisma validate` + `npx prisma generate` | Build fail → fix |
| `A-04` | `prisma/schema.prisma` — `ProjectAssignment.placementId` nullable FK | ADD COLUMN nullable (V6P-013) | `npx prisma validate` | Build fail → fix |
| `A-05` | `prisma/migrations/<timestamp>_n3_service_model_placement/migration.sql` — schema + RLS + GRANT + unique partial index | Tạo enums + ALTER TABLE ADD COLUMN serviceModel, ADD COLUMN placementId, CREATE TABLE placements + FK; **`CREATE UNIQUE INDEX placements_active_unique … WHERE status IN ('SELECTED','CONFIRMED')`** (DEC-04a); **`ALTER TABLE placements ENABLE + FORCE ROW LEVEL SECURITY`** + `CREATE POLICY` (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`, `TO app_user_writer, app_user`) (DEC-14); **`GRANT SELECT/INSERT/UPDATE/DELETE ON placements TO app_user_writer`** (DEC-14). | `npx prisma migrate diff` review + `npx prisma validate` + DB integration test (Slice C) | SQL sai → fix |
| `A-06` | `src/domains/talent/placement.lifecycle.ts` — pure state transition matrix | SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED, side exits, không revert EFFECTIVE | Unit test (A-07) | Build fail → fix |
| `A-07` | `tests/domains/talent/placement.lifecycle.test.ts` | ≥10 transition cases: từng edge hợp lệ + không hợp lệ + idempotent replay | 10+ it-blocks PASS | Test fail → fix |
| `A-08` | `npx tsc --noEmit` + full unit suite | typecheck + không regress | exit 0, suite ≥ baseline | Fail → fix |

**Gate Slice A:** `prisma validate` PASS, `prisma generate` PASS, pure unit test PASS, typecheck PASS, unit suite không regress. Sau gate, Tier 1 tiếp tục Slice B (không cần Tier 0 xin GO).

### 5.2 Slice B — Service Layer + Idempotency + Anti-race + HRP-vs-client Guard

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `B-01` | `src/domains/talent/placement.errors.ts` | `PlacementValidationError`, `InvalidStateTransitionError`, `PlacementNotFoundError`, `PlacementIdempotencyConflictError` | Unit test instantiation | Build fail → fix |
| `B-02` | `src/domains/talent/placement.resolution.ts` | `resolveClientCompanyIdForJobOpening(tx, jobOpeningId)`, `computeManagementMode(serviceModel)`, `assertClassifiedJobOpening(jobOpening)` | Unit test mock Prisma (B-03) | Build fail → fix |
| `B-03` | `tests/domains/talent/placement.resolution.test.ts` | FK chain resolve happy path + chain broken → reject | 5+ it-blocks PASS | Test fail → fix |
| `B-04` | `src/domains/talent/placement.service.ts` — `createPlacement(tx, input)` | Tạo Placement SELECTED. Resolve `clientCompanyId`. Snapshot `serviceModelSnapshot`. Idempotent theo `(laborProfileId, placementCaseId, jobOpeningId)`. Anti-race nhờ DEC-04a unique partial index: bắt P2002 → trả placement hiện tại nếu status còn SELECTED/CONFIRMED. Sau FAILED/CANCELLED → INSERT mới thành công nhờ index giải phóng. | Unit test (B-07) | Test fail → fix |
| `B-05` | `src/domains/talent/placement.service.ts` — `confirmPlacement(tx, placementId)` | Transition SELECTED→CONFIRMED. Conditional UPDATE `WHERE id = ? AND status = 'SELECTED'`. Idempotent theo `placementId`. | Unit test (B-07) | Test fail → fix |
| `B-06` | `src/domains/talent/placement.service.ts` — `markPlacementEffective`, `failPlacement`, `cancelPlacement` | `markPlacementEffective`: REJECT nếu HRP-managed; yêu cầu evidence nếu client-managed. Side exits: SELECTED | CONFIRMED → FAILED | CANCELLED. Conditional UPDATE + idempotent. | Unit test (B-07) | Test fail → fix |
| `B-07` | `tests/domains/talent/placement.service.test.ts` | Mock Prisma client. Verify: idempotency replay (retry trả kết quả cũ), retry-after-FAILED tạo Placement mới, HRP-managed EFFECTIVE reject, client-managed EFFECTIVE happy + reject (no evidence), FK chain broken reject, conditional UPDATE (status guard), snapshot copy. | 15+ it-blocks PASS | Test fail → fix |
| `B-08` | `npx tsc --noEmit` + full unit suite | typecheck + không regress | exit 0, suite ≥ baseline | Fail → fix |

**Gate Slice B:** typecheck PASS, full unit suite PASS (không regress), unit test cho service + resolution PASS. Sau gate, Tier 1 tiếp tục Slice C.

### 5.3 Slice C — DB Integration Test + HANDOFF + AUDIT + Push Branch

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `C-01` | `tests/db/placement-lifecycle-integration.test.ts` | Setup: tạo `JobOpening` (classified) + `StaffingOrder` + `Project` + `ClientCompany` + `LaborProfile` + `PlacementCase`. Cases: (i) SELECTED→CONFIRMED (HRP); (ii) client-managed SELECTED→CONFIRMED→EFFECTIVE close case SUCCESS; (iii) HRP-managed markPlacementEffective REJECT; (iv) retry khi còn SELECTED trả placement hiện tại (DEC-04a P2002 path); (v) retry sau FAILED tạo Placement mới; (vi) FK chain broken REJECT; (vii) RLS: chạy query với role `app_runtime` SET LOCAL ROLE, verify SELECT/INSERT/UPDATE/DELETE work; (viii) FORCE RLS: anonymous role không có row. `describe.skipIf(!HAS_TEST_DB)`. | Test PASS | Test fail → fix; nếu `!HAS_TEST_DB` → báo cáo `ENV_BLOCKED` (KHÔNG đủ điều kiện merge/deploy — DEC-13) |
| `C-02` | `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` (nếu có `DATABASE_URL_TEST`) | Chạy DB integration test thật | All cases PASS | `ENV_BLOCKED` nếu chưa có DB test |
| `C-03` | `npx tsc --noEmit` + full unit suite + DB integration suite (nếu có) | typecheck + không regress + DB integration | exit 0; suites ≥ baseline | Fail → fix |
| `C-04` | `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` | Viết HANDOFF theo template: slices delivered, test outcomes, deviations, N4 boundary rõ, điều kiện cho Tier 0 xét deploy (DB integration PASS + Tier 3 LIGHT audit PASS), rõ `ENV_BLOCKED` nếu DB test thiếu (KHÔNG tính PASS). | HANDOFF reviewed | Audit BLOCKED → fix |
| `C-05` | `docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` | Tier 3 LIGHT audit. Verdict PASS / CONDITIONAL / BLOCKED. Audit chấp nhận đúng diff cuối. | Verdict ghi trong AUDIT | Verdict BLOCKED → fix/escalate |
| `C-06` | `evidence/stage0-contract/` + `evidence/stage1-slice-a-schema.md` + `evidence/stage2-slice-b-service.md` + `evidence/stage3-slice-c-integration.md` | Evidence cho audit (schema diff, migration SQL, RLS/GRANT verify logs, DB integration test logs, audit verdict). | Files tồn tại | Missing → fix |
| `C-07` | Commit + push branch | Commit(s) trong worktree `tier1-n3-service-model-placement`, push lên `tier1/n3-service-model-placement` (KHÔNG merge main; KHÔNG apply migration lên `hrp-live`). Tier 0/Owner review branch + quyết định merge + apply. | `git log` + `git ls-remote` | Push fail → fix |

**Gate Slice C (cuối cùng):** DB integration test PASS trên `DATABASE_URL_TEST` (KHÔNG `ENV_BLOCKED` nếu muốn xét deploy) **VÀ** Tier 3 LIGHT audit PASS/CONDITIONAL chấp nhận đúng diff cuối. Sau gate, Tier 1 push branch để Tier 0/Owner review. Tier 1 KHÔNG tự merge main và KHÔNG tự apply migration lên `hrp-live`.

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `JobOpening.serviceModel` là enum 4 giá trị; nullable column; KHÔNG có sentinel `UNKNOWN_LEGACY` trong enum. | `prisma/schema.prisma` review + `npx prisma validate` |
| `AC-02` | Derived `managementMode` đúng (HRP/CLIENT) qua `placement.resolution.ts`. Computed at read time, không lưu cột. | Unit test `placement.resolution.test.ts` |
| `AC-03` | `Placement` model đúng schema (DEC-03): FK chain, snapshot nullable, audit timestamps. | `npx prisma validate` + schema review |
| `AC-04` | Quan hệ `PlacementCase → N Placement`. Mỗi case thuộc một LaborProfile; nhiều Placement trong cùng case = retry của cùng người (DEC-04). | `prisma/schema.prisma` review + DB integration test |
| `AC-04a` | Unique partial index `placements_active_unique (placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')` tồn tại trên DB; retry cùng idempotency key trong khi SELECTED/CONFIRMED trả placement hiện tại (P2002 path); retry sau FAILED/CANCELLED tạo Placement mới. | DB integration test + `pg_indexes` probe |
| `AC-05` | Lifecycle state machine: SELECTED → CONFIRMED → EFFECTIVE | FAILED | CANCELLED đúng; side exits từ mọi non-EFFECTIVE; EFFECTIVE không revert được. | Unit test `placement.lifecycle.test.ts` ≥10 cases |
| `AC-06` | HRP-managed: command `markPlacementEffective` REJECT. | Unit test `placement.service.test.ts` (HRP EFFECTIVE reject) + DB integration |
| `AC-07` | Client-managed EFFECTIVE yêu cầu evidence hợp lệ; thiếu → REJECT; happy path đóng PlacementCase SUCCESS, KHÔNG tạo Worker/Episode/Assignment. | Unit test + DB integration |
| `AC-08` | `serviceModelSnapshot` immutable sau khi tạo. | Unit test snapshot lock |
| `AC-09` | Idempotency + retry behavior đúng (DEC-04a + DEC-09): retry SELECTED trong khi SELECTED/CONFIRMED trả placement hiện tại; retry sau FAILED/CANCELLED tạo Placement mới; các command khác theo `placementId`. | Unit test idempotent replay + DB integration |
| `AC-10` | `clientCompanyId` resolve rule: Placement mới resolve qua FK chain; chain broken → REJECT. Cột nullable cho legacy. | Unit test `placement.resolution.test.ts` + DB integration |
| `AC-11` | Anti-race: conditional UPDATE với status guard. Hai command cùng transition → chỉ một thắng, cái còn lại no-op + idempotent. | Unit test conditional UPDATE + DB integration |
| `AC-12` | `ProjectAssignment.placementId` nullable column tồn tại; KHÔNG populate trong N3. | `prisma validate` + `git diff --stat` (no INSERT/UPDATE placementId) |
| `AC-13` | No forbidden path touched: `intake-writer.service.ts` không sửa, `src/domains/staffing/` không sửa, `Worker`/`EmploymentEpisode` không tạo, route HTTP mới không tạo. | `git diff --name-only` + `git diff --stat` |
| `AC-14` | Migration ADD-only: không DROP/RENAME/ALTER data. | `git diff HEAD -- prisma/migrations/ --stat` + SQL review |
| `AC-15` | typecheck PASS: `npx tsc --noEmit` exit 0. | Command exit code |
| `AC-16` | Full unit suite PASS: không regress. | `npx vitest run --config vitest.unit.config.ts` |
| `AC-17` | DB integration test PASS trên `DATABASE_URL_TEST` (KHÔNG `ENV_BLOCKED`). Tier 0/Owner xét merge/deploy chỉ khi AC-17 PASS (DEC-13). | `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` |
| `AC-17a` | RLS + GRANT (DEC-14): bảng `placements` có FORCE RLS + policy (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`) + `app_user_writer` GRANT CRUD. Verify trong DB integration bằng `SET LOCAL ROLE app_user_writer` rồi SELECT/INSERT/UPDATE/DELETE work; SET role khác ngoài app_user_writer/app_user không thấy row ngoài policy. | DB integration test (case vii + viii) |
| `AC-18` | Audit verdict (Tier 3 LIGHT): PASS hoặc CONDITIONAL, audit chấp nhận đúng diff cuối. | Read AUDIT.md verdict |
| `AC-19` | Tier 1 KHÔNG tự merge `tier1/n3-service-model-placement` → `main`; KHÔNG tự apply migration lên `hrp-live`. | `git log` + HANDOFF + AUDIT + không có migration apply command trong evidence |
| `AC-20` | N1 production rebuild + admin intake smoke vẫn MỞ (không bị N3 đánh PASS). | HANDOFF ghi rõ "N1 prod verification vẫn open" |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | State machine transition logic sai → placement ở state không hợp lệ → data corruption | Pure function unit test ≥10 cases (AC-05) + DB integration test |
| `RISK-02` | HRP-managed EFFECTIVE vô tình tạo Worker (N4 boundary bị phá) | Unit test HRP EFFECTIVE REJECT (AC-06); audit verify; `intake-writer.service.ts` không sửa |
| `RISK-03` | `DATABASE_URL_TEST` không khả dụng → AC-17 không đạt → KHÔNG đủ điều kiện xét merge/deploy | `ENV_BLOCKED` báo cáo trung thực; Tier 0/Owner quyết định tiếp tục hay tạm dừng; KHÔNG coi `ENV_BLOCKED` là PASS |
| `RISK-04` | `clientCompanyId` resolve rule sai → Placement mới không có ClientCompany hợp lệ | Unit test `placement.resolution.test.ts` + DB integration; DEC-06 enforce reject khi chain broken |
| `RISK-05` | ServiceModel enum conflict với WorkClassification (Owner decision chưa có) | Phase này chỉ làm ServiceModel; WorkClassification tách riêng; DEC-01 chốt KHÔNG dùng sentinel |
| `RISK-06` | Client-managed EFFECTIVE không đóng case SUCCESS | Unit test + DB integration verify case close |
| `RISK-07` | Correction/void Placement cần nhưng chưa implement | Out of scope N3 (V6P-020A hardening); HANDOFF ghi rõ "EFFECTIVE không revert được trong N3; correction/void thuộc phase khác" |
| `RISK-08` | Unique partial index thiếu → hai SELECTED/CONFIRMED trùng `(case, opening)` có thể cùng tồn tại | Migration DEC-04a + DB integration test case (iv); audit verify SQL |
| `RISK-09` | RLS policy chưa áp dụng trên bảng mới → leak dữ liệu giữa role | Slice A chứa `ENABLE + FORCE ROW LEVEL SECURITY` + policy + GRANT (DEC-14); DB integration test case (vii) + (viii) verify |
| `RISK-10` | N1 prod verification bị "đánh PASS" do N3 hoàn tất | HANDOFF phải ghi rõ N1 prod rebuild + admin intake smoke vẫn MỞ (AC-20) |

## 8. Open Questions

| # | Question | Impact | Owner | Status |
|---|---|---|---|---|
| Q-01 | WorkClassification có phải ServiceModel con không, hay tách hoàn toàn? | Taxonomy JobOpening. TIER0_HANDOVER.md §8 #5: "WorkClassification catalog; không trộm vào ServiceModel." | Tier 0/Owner | **RESOLVED 2026-09-14** — tách hoàn toàn, không trộm vào ServiceModel |
| Q-02 | `clientCompanyId` resolve từ đâu trong Placement? | FK design. | Tier 1 | **RESOLVED 2026-09-14** — resolve bắt buộc qua `JobOpening → StaffingOrder → Project → ClientCompany` cho Placement mới; cột nullable cho legacy; chain broken → REJECT |
| Q-03 | Placement SELECTED tự động khi nào? Từ intake writer (N1) hay admin action riêng? | Flow N1→N3. | Tier 1 | **RESOLVED 2026-09-14** — Intake N1 KHÔNG tự tạo Placement. SELECTED do command nghiệp vụ riêng (`createPlacement`) thực hiện. Intake N1 chỉ tạo PlacementCase + CandidateSubmission |
| Q-04 | Retry của một case đã FAILED/CANCELLED: cùng người hay khác người? | Idempotency design. | Tier 0 | **RESOLVED 2026-09-14 21:00** — một case thuộc một LaborProfile; nhiều Placement trong cùng case = retry của cùng người; ứng viên khác mở case mới. Anti-race nhờ unique partial index `(placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')` |

## 9. Planner Resolution

Tier 0 chốt 2026-09-14 21:00: GO Slice A; Tier 1 có thể chạy thẳng A→B→C qua gate từng slice. Tier 1 push branch để review; KHÔNG tự merge main; KHÔNG tự apply migration production. N1 production verification + admin intake smoke vẫn MỞ độc lập.

## 10. Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| `v0.1 ACCEPTED` | `2026-09-14 17:15` | `Tier 1` | Initial contract sau N1 intake-writer round-5 push. CRITICAL/LIGHT. 14 STEP; 13 AC. |
| `v0.2 ACCEPTED` | `2026-09-14 20:53` | `Tier 1` | Sửa theo chốt Tier 0 (2026-09-14): (a) NULL ServiceModel legacy; (b) PlacementCase→N Placement; (c) EFFECTIVE cuối, correction/void out of scope; (d) bỏ sửa intake-writer.service.ts; (e) bỏ smoke curl; (f) N3 KHÔNG đẩy HRP-managed sang EFFECTIVE; (g) clientCompanyId resolve qua FK chain; (h) 3 slices A/B/C; (i) test DB thật bắt buộc; (j) 14→18 AC; (k) Q-01..03 RESOLVED. |
| `v0.3 ACCEPTED` | `2026-09-14 21:00` | `Tier 1` | Sửa theo chốt Tier 0 (2026-09-14 21:00): (1) DEC-04 — một PlacementCase thuộc một LaborProfile; nhiều Placement lịch sử = retry của cùng người; KHÔNG có ứng viên khác trong cùng case. (2) DEC-04a + DEC-09 — DB-level anti-race qua unique partial index `placements_active_unique (placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')`; retry cùng idempotency key trong khi SELECTED/CONFIRMED trả placement hiện tại (P2002 path → trả placement đã tồn tại); retry sau FAILED/CANCELLED tạo Placement mới (index giải phóng slot). (3) DEC-14 — Slice A xác định cả RLS policy + GRANT cho `app_runtime` + FORCE ROW LEVEL SECURITY; RLS theo pattern N1 (predicate dựa trên `placement_cases.labor_profile_id` + actor user từ GUC); verify trên DB integration bằng `SET LOCAL ROLE app_runtime`. (4) DEC-13 — `ENV_BLOCKED` là báo cáo trung thực, KHÔNG phải điều kiện PASS; trước khi xét merge/deploy, DB integration phải PASS trên nhánh thử nghiệm + Tier 3 LIGHT audit chấp nhận đúng diff cuối. (5) Tier 1 push branch để review; KHÔNG tự merge main; KHÔNG tự apply migration production. (6) Tier 1 có thể chạy thẳng A→B→C qua gate từng slice, không cần xin GO giữa slice. Thêm AC-04a (unique partial index) + AC-17a (RLS/GRANT verify). Risk RISK-08 (unique index thiếu) + RISK-09 (RLS leak) + RISK-03 (ENV_BLOCKED ≠ PASS) cập nhật. |
