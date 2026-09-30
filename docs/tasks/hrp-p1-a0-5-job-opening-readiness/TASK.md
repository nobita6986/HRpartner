# TASK — `hrp-p1-a0-5-job-opening-readiness`

**Pipeline V2 — Task Contract (planning round, DRAFT phase)**

> T0 directive 2026-09-30 — P1-A0.5 JobOpening Readiness + Final No-Developer E2E. Planning round only. NO implementation in this commit. T0 will review this contract before any READY_TO_CODE transition.

> This contract closes two P1 release blockers transferred from P1-A0.4 ACCEPTED closeout: `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` and `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`. Both remain OPEN until A0.5 audit PASS/accepted + PR merged into `main` + final no-developer E2E PASS.

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-5-job-opening-readiness` |
| Display name | `P1-A0.5 JobOpening Readiness + Final No-Developer E2E` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `IMPLEMENTATION` |
| Doc type | `task/contract` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` (planning round; T0 review pending) |
| Planner | `Tier 1` (T1C) |
| Baseline | `12460cf55d77f193225e54cf4b8e1c1dfc8eaf59` (latest `origin/main` full SHA; PR #67 already in `main`; P1-A0.4 ACCEPTED at this SHA) |
| Contract gate | `DRAFT` |
| Contract accepted by T0 | `NO` (awaiting T0_CONTRACT_REVIEW on this round) |
| Decision state | `CLOSED` (T0 LOCK-01..LOCK-11 close every Owner decision; no new Owner decision introduced in this planning round) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Auth/RLS/authority slice: two new canonical commands (`/classify`, `/open`) on existing JobOpening + a narrow action-panel UI surface for HR_MANAGER/ADMIN and HR_STAFF-scoped authority. Closure of both P1 release blockers requires Tier 3 verification on synthetic DB evidence (not unit/static) — auth/RLS state transitions, idempotency, race-safety, role/scope gates. Risk acceptance: T0 directive 2026-09-30 §LOCK-03..LOCK-§5 locked semantics in advance so Tier 1 self-review + Tier 3 LIGHT audit can verify on committed SHA. |
| Planning correction budget | `1` |
| T0 planning integrity exceptions used | `0` |
| Correction budget | `1` |
| Implementation correction budget | `1` (one consolidated batch after Tier 3 LIGHT audit; pre-audit budget) |
| Implementation correction batches used | `0` (planning round) |
| Test environment | `REQUIRED` (synthetic-DB preflight; readiness determined by preflight outcome; same pattern as P1-A0.4) |
| Current execution round | `0` (planning round only; no implementation yet) |
| Current audit round | `0` (Tier 3 not called) |
| Next gate | `T0_CONTRACT_REVIEW` (T0 reviews this DRAFT contract before implementation is authorized; transition Contract gate → `READY_TO_CODE`) |
| Open Owner decisions | `0` (T0 LOCK-01..LOCK-11 captured in §3; planning round introduces no new decision) |
| Build vs adopt | `ADOPT` |
| Build vs adopt — detail | canonical auth + Idempotency-Key UUID v4 + withDbContext + assertClassifiedJobOpening + computeManagementMode + assertRecruiterAndOrderAssignmentActive are all already in tree (P1-A0 / P1-A0.4 carryover). A0.5 only adds 2 thin route handlers + 1 thin service file + narrow UI panel. NO new dependency. (Reason recorded separately so T-10 control field stays exact-token.) |
| Build vs automate | `N/A` |
| Build vs automate — detail | no connector, no scheduler, no multi-system workflow; A0.5 is a thin-slice mutation authority slice. (Reason recorded separately so T-11 control field stays exact-token.) |
| In-scope roots (planning round) | discovery doc = `docs/discovery/realignment/P1A05_JOB_OPENING_READINESS_RECONCILIATION.md`; task/contract = `docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` (this file). NO HANDOFF.md, NO AUDIT.md in planning round. NO source/test/schema/migration/package/tooling mutation in planning round. Implementation round (post-T0 review) will add: `app/api/admin/staffing/job-openings/[id]/classify/route.ts` + `route.test.ts`; `app/api/admin/staffing/job-openings/[id]/open/route.ts` + `route.test.ts`; `src/domains/staffing/job-opening-activation.service.ts` (new thin service for `classifyJobOpening` + `openJobOpening` + `assertCanOpenJobOpening` predicates; reads `JobOpening`, `StaffingOrderSlot`, `StaffingOrderRecruiterAssignment` via existing repositories); narrow action panel addition on `app/admin/job-openings/[id]/page.tsx` (Server Component renders the existing detail page + a new `<JobOpeningActions>` island with two buttons: `Phân loại ServiceModel` and `Mở JobOpening`; uses existing canonical fetch helper pattern; calls `router.refresh()` on success); `tests/db/p1a05-job-opening-readiness.integration.test.ts` (new); `vitest.integration-files.ts` (APPEND-only — register the new test file). Implementation round reads-only surface (NO mutation): `prisma/schema.prisma` + `prisma/migrations/**` (LOCK-08 escape only); `src/domains/staffing/job-opening-status.ts` + `job-opening-read.service.ts` + `job-posting-authoring.service.ts` + `recruiter-assignment.service.ts`; `src/domains/talent/placement.{service,commands,lifecycle,resolution}.ts`; `src/domains/job-board/public.service.ts`; `src/domains/applications/aff03-public-intake.service.ts`; `src/shared/auth/{auth-context,with-db-context,server-session}.ts`; `src/shared/integrity/idempotency.ts`; `src/shared/security/**`; `app/(jobs)/**`; `app/api/public/**`; `tests/db/p1a04-*` + `recruiter-workbench.integration.test.ts` + `placement-lifecycle-integration.test.ts` (predecessor regressions, read-only). |
| Forbidden paths | `src/domains/crm/**`; `src/domains/media/**`; `src/domains/referrals/**` (read-only); `app/api/admin/erp/**` (does not exist; do not create); `app/api/admin/payroll/**` (does not exist; do not create); `docs/PLANNER_HANDOVER.md` (T0 directive Phase B explicit); production `.env*` files; production DB/migration/deploy scripts; **sidebar, navigation, menu, IA routes** (`src/shared/ui/role-guard/role-guard-layout.tsx` admin shell, `app/admin/layout.tsx`, `src/shared/ui/navigation/**`) — T0 §LOCK-07 + §LOCK-11 forbidden; **n8n integration**; **toast framework/dependency mới**; **client-side business authority** (no new authorization gate on client). P1-A0.4 frozen command contract files (`docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{TASK.md, HANDOFF.md, AUDIT.md}` — read-only); P1-A0.1 + P1-A0 + P1-B + P1-E0/E1 + P1-F0/F1 frozen artifacts (read-only); any path outside the in-scope roots above. |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npm run typecheck`; `npm run lint`; targeted route/component/service tests; `npm run test:unit`; deterministic targeted DB integration (synthetic Neon writer/admin pair `ep-empty-forest-azlhfyo9-*`); full canonical integration with strict synthetic DB; p1a04/p1a05 regression suites ×3; zero-residue probe ×3; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-task.ps1`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1`; `node .ai-pipeline/scripts/verify-encoding-range.mjs <baseline> HEAD`. Audit self-test only — KHÔNG audit tĩnh. |
| Production DB/migration | `NOT_RUN` (planning round; deferred to VPS release cutover after A0.5 audit PASS + PR merge) |
| Production merge SHA | (to be pinned at implementation-round HANDOFF freeze) |
| Frozen delivery | `NO` (planning round; semantic surface not yet written) |
| Audit eligibility | `NOT_ELIGIBLE` (planning round; implementation round must achieve READY_FOR_AUDIT + audit-eligibility per V2_FAST_FREEZE) |
| Audit verdict | (no audit yet) |
| P1 release blockers in scope | `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` (closed by `/classify` + DEC-10 NULL fail-closed chain), `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` (closed by `/open` precondition chain + atomic transition). Both remain OPEN until A0.5 audit PASS + PR merge + final no-developer E2E PASS on main-compatible build (LOCK-10). |

> Lane CRITICAL mặc định LIGHT. T0 directive 2026-09-30 §LOCK-01..§LOCK-11 đã chốt toàn bộ locked decision trước code. Tier 1 implementation round self-review trước freeze; chỉ một consolidated correction batch sau Tier 3 LIGHT audit.

> Planning round only. NO implementation. NO source/test/schema/migration/package/tooling mutation in this commit. T0 will review this contract before any READY_TO_CODE transition.

## 1. Outcome

### 1.1 User-visible outcome (post-implementation, target)

1. **HR_MANAGER classifies ServiceModel**: trên trang `/admin/job-openings/[id]`, panel "ServiceModel" hiển thị 4 enum (`STAFFING_SUPPLY`/`LABOR_LEASING`/`RECRUITMENT_SERVICE`/`REFERRAL_SERVICE`) chỉ khi JobOpening còn `DRAFT`. HR_MANAGER hoặc ADMIN chọn một giá trị → POST `/api/admin/staffing/job-openings/[id]/classify` → 200 + `router.refresh()` → chip ServiceModel hiện trên page. HR_STAFF **không** thấy controls (server-rendered role gate). JobOpening đã `OPEN` hoặc đã có Placement thì controls bị disable hoàn toàn (server-rendered) + API từ chối 409 `INVALID_STATE_TRANSITION`.
2. **HR_MANAGER hoặc scoped HR_STAFF opens JobOpening**: sau khi ServiceModel đã được set, nút "Mở JobOpening" xuất hiện khi còn `DRAFT` + ServiceModel ≠ NULL + parent StaffingOrder = `OPEN` + slot còn hiệu lực. HR_MANAGER / ADMIN: cứ bấm open. HR_STAFF: bấm được IFF có ACTIVE `StaffingOrderRecruiterAssignment` trên parent StaffingOrder (P1-A0.4 predicate). Submit → 200 + status chuyển `DRAFT → OPEN` + `opened_at` stamp → `router.refresh()`. Fail-closed: parent order not OPEN → 409 `ORDER_NOT_OPEN`; slot ineligible → 409 `SLOT_NOT_ELIGIBLE`; serviceModel NULL → 422 `SERVICE_MODEL_REQUIRED`; HR_STAFF không có active assignment → 403 `NO_ACTIVE_ORDER_ASSIGNMENT`.
3. **HR_STAFF tạo/chỉnh JobPosting và publish** (existing P1-A0/A0.1 carryover; KHÔNG đổi): `createOrReuseJobPosting` → editor shell → `publishJobPosting` vẫn từ chối JobOpening `DRAFT/FILLED/CANCELLED` (invariant bảo toàn).
4. **Tin xuất hiện trên public listing và public detail** (existing carryover): `/viec-lam` list + `/viec-lam/[slug]` detail render JobPosting `PUBLISHED` thuộc JobOpening `OPEN`.
5. **Ứng viên anonymous apply** (existing P1-B): `POST /api/public/jobs/[slug]/applications` vẫn hoạt động.
6. **LaborProfile + PlacementCase created/matched** (existing N1): `createCandidateSubmissionFromIntake` tạo LaborProfile + mở PlacementCase.
7. **Scoped recruiter thấy hồ sơ trong Workbench và claim** (existing P1-A0.4): HR_STAFF với active assignment lên `MINE` rail → claim thấy đầy đủ submission.
8. **Recruiter thực hiện Placement actions** (existing P1-F0/F1 + recruiter-placement.adapter): `placementCreate` → `confirmPlacement` → `effectivePlacement` / `failPlacement` / `cancelPlacement`.
9. **`RECRUITMENT_SERVICE` Placement → `CLIENT_MANAGED` EFFECTIVE** (existing DEC-07 + C-07): chỉ path có thể đi tới EFFECTIVE; PlacementCase atomically closes.
10. **`STAFFING_SUPPLY` Placement → `HRP_MANAGED` EFFECTIVE fail-closed** (existing DEC-08 + C-07): `markPlacementEffective` throws `PlacementValidationError` → 400. Outcome hợp lệ hiện tại là `CONFIRMED`.
11. **Không có bước nào yêu cầu developer sửa DB thủ công** (LOCK-09): toàn bộ flow đi qua production routes/UI.
12. **Zero residue sau synthetic run** (LOCK-09): targeted DB suite ×3, predecessor regressions ×3, full canonical integration, full unit gate, typecheck, lint, build, prisma validate — không có tracked-table residue.

### 1.2 Non-goals

- KHÔNG thay đổi existing taxonomy `ServiceModel` enum (LOCK-02). KHÔNG thêm enum mới. KHÔNG đổi mapping `STAFFING_SUPPLY|LABOR_LEASING → HRP_MANAGED` / `RECRUITMENT_SERVICE|REFERRAL_SERVICE → CLIENT_MANAGED`.
- KHÔNG đổi `publishJobPosting` invariant (LOCK-06): vẫn từ chối JobOpening `DRAFT/FILLED/CANCELLED`.
- KHÔNG đổi `placement.commands.ts` / `placement.lifecycle.ts` / `placement.resolution.ts` / `placement.service.ts` (read-only carryover từ P1-F0/F1/N3).
- KHÔNG đổi `job-posting-authoring.service.ts` `createOrReuseJobOpeningForSlot` / `publishJobPosting` / `eligibleSlotPredicateSql` / `assertSlotEligibleForNewJobPosting` (read-only carryover P1-A0).
- KHÔNG đổi `recruiter-assignment.service.ts` predicate (read-only P1-A0.4 authority source).
- KHÔNG thêm ERP / payroll / CRM / media / referrals integration.
- KHÔNG gọi n8n hoặc scheduler ngoài repo.
- KHÔNG thêm sidebar / navigation / menu / IA route mới (LOCK-07 + LOCK-11).
- KHÔNG tạo client-side business authority (LOCK-07); UI chỉ phản ánh server authority.
- KHÔNG thêm toast framework/dependency mới (LOCK-07); nếu cần feedback dùng existing inline UI.
- KHÔNG thêm `StaffingOrderRecruiterAssignment` API mới; reuse P1-A0.4 carryover.
- KHÔNG migration/schema change (LOCK-08). Nếu implementation round phát hiện blocker, Tier 1 MUST dừng ở planning và báo T0; không tự thêm migration.
- KHÔNG mở P2/P3/P4/P5 (LOCK-11). KHÔNG deploy VPS. KHÔNG chạm production DB. KHÔNG sửa CRM. KHÔNG xử lý P3 debt ngoài những gì bắt buộc để A0.5 chạy đúng.
- KHÔNG tự ý tuyên bố P1 hoàn thành (LOCK-10): chỉ A0.5 audit PASS/accepted + PR merge vào main + canonical CI xanh + final E2E PASS trên main-compatible build + cả hai blocker RESOLVED + không còn P0/P1/P2 release-blocking finding + TASK/HANDOFF final closeout ACCEPTED mới đồng nghĩa P1 hoàn thành.

## 2. Evidence

Chỉ liệt kê evidence cần cho Tier 1 implementation round.

| ID | Evidence | Why it matters |
| --- | --- | --- |
| `EV-01` | `prisma/schema.prisma:524-547` (`model JobOpening` — `status` DRAFT/OPEN/FILLED/CANCELLED; `serviceModel?` nullable; `staffingOrderId`; `staffingOrderSlotId`; `openedAt`; `closedAt`). | Schema đã có sẵn cả 2 field cần thiết (LOCK-08 ADOPT). KHÔNG migration. |
| `EV-02` | `prisma/schema.prisma:1600-1605` (`enum ServiceModel` — `STAFFING_SUPPLY | LABOR_LEASING | RECRUITMENT_SERVICE | REFERRAL_SERVICE`). | Taxonomy đã chốt (LOCK-02). |
| `EV-03` | `src/domains/staffing/job-posting-authoring.service.ts:493-580` (`createOrReuseJobOpeningForSlot` — tạo JobOpening `status: 'DRAFT'`; atomic + race-safe; `assertSlotEligibleForNewJobPosting` re-validate canonical predicate). | Carryover P1-A0: gap chính mà A0.5 đóng — JobOpening bị kẹt ở DRAFT. |
| `EV-04` | `src/domains/staffing/job-posting-authoring.service.ts:778-826` (`publishJobPosting` — reject `JobOpening.status !== 'OPEN'` với `JOB_OPENING_NOT_OPEN`). | Invariant cần bảo toàn (LOCK-06): A0.5 không được mở đường tắt bypass. |
| `EV-05` | `src/domains/staffing/job-opening-read.service.ts` (`getJobOpeningDetail` — DTO read surface). | Carryover: action panel dùng DTO này để render controls. |
| `EV-06` | `src/domains/staffing/job-opening-status.ts` (`summarizeAllJobOpenings` — groupBy + zero-fill 4 statuses). | Carryover: card stats vẫn đếm đủ. |
| `EV-07` | `src/domains/talent/placement.resolution.ts:26-42` (`assertClassifiedJobOpening` — DEC-10 NULL fail-closed) + `:43-124` (`resolveClientCompanyIdForJobOpening` — `managementMode` derive). | Reuse cho `/open` precondition + downstream invariant. |
| `EV-08` | `src/domains/talent/placement.lifecycle.ts:23-33` (`computeManagementMode` — DEC-02 mapping). | Reuse: taxonomy không đổi. |
| `EV-09` | `src/domains/talent/placement.commands.ts:241-275` (`placementEffective` wrapper — HRP_MANAGED → EFFECTIVE throws PlacementValidationError / DEC-08 / C-07). | Carryover: confirm LOCK-10 outcome rules. |
| `EV-10` | `src/domains/staffing/recruiter-assignment.service.ts` (`StaffingOrderRecruiterAssignment` lifecycle + `assertRecruiterAndOrderAssignmentActive` predicate). | P1-A0.4 carryover: HR_STAFF `/open` authority delegate. |
| `EV-11` | `app/admin/job-openings/[id]/page.tsx` (existing read-only detail page; ADMIN/HR_MANAGER/DIRECTOR/PM roles only; no HR_STAFF). | UI surface cần mở rộng narrow action panel cho ADMIN/HR_MANAGER + scoped HR_STAFF (LOCK-04 + LOCK-07). |
| `EV-12` | `app/api/admin/staffing/orders/[orderId]/recruiters/{route.ts, [assignmentId]/revoke/route.ts}` (existing canonical route shape: `getAuthContext` → `withDbContext` → `withIdempotency` → handler → safe envelope). | Pattern A0.5 phải replicate cho `/classify` và `/open`. |
| `EV-13` | `app/api/admin/jobs/job-postings/[id]/publish/route.ts` (canonical publish route — Idempotency-Key UUID v4, withDbContext, AuthoringError envelope). | Same pattern. |
| `EV-14` | `src/shared/auth/auth-context.ts` (`getAuthContext`) + `src/shared/auth/with-db-context.ts` (`withDbContext`) + `src/shared/integrity/idempotency.ts` (`withIdempotency`). | Carryover middleware chain. |
| `EV-15` | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` (public listing + detail — render PUBLISHED JobPosting). | Carryover E2E visibility surface. |
| `EV-16` | `app/api/public/jobs/[slug]/applications/route.ts` (anonymous apply — P1-B). | Carryover E2E apply surface. |
| `EV-17` | `src/domains/applications/aff03-public-intake.service.ts` (`createCandidateSubmissionFromIntake` — LaborProfile + PlacementCase OPEN). | Carryover N1. |
| `EV-18` | `tests/db/p1a04-canonical-flow.integration.test.ts` + `p1a04-r3-substantive.integration.test.ts` + `recruiter-workbench.integration.test.ts` + `placement-lifecycle-integration.test.ts` (predecessor integration tests). | Predecessor regression gate. |
| `EV-19` | `vitest.integration-files.ts` (integration test registry — currently registers p1a04 + predecessors; A0.5 implementation round appends `tests/db/p1a05-job-opening-readiness.integration.test.ts`). | Registry update target. |
| `EV-20` | `docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/{HANDOFF.md §4.5, §4.6}` (P1-A0.4 audit-eligibility + the two P1 release blockers). | Carryover narrative context for AC-E2E and BLOCKER-OPEN assertion. |

## 3. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| `LOCK-01` (T0) | A0.5 đóng chung 2 blocker `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` + `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`; KHÔNG tách thành hai implementation task độc lập. | CHOSEN (T0 directive 2026-09-30 §LOCK-01) |
| `LOCK-02` (T0) | Giữ nguyên `enum ServiceModel { STAFFING_SUPPLY, LABOR_LEASING, RECRUITMENT_SERVICE, REFERRAL_SERVICE }`. Mapping `STAFFING_SUPPLY | LABOR_LEASING → HRP_MANAGED`; `RECRUITMENT_SERVICE | REFERRAL_SERVICE → CLIENT_MANAGED` reuse từ `placement.lifecycle.ts::computeManagementMode`. KHÔNG thêm enum mới; KHÔNG đổi mapping. | CHOSEN (T0 directive 2026-09-30 §LOCK-02) |
| `LOCK-03` (T0) | Classification authority: `ADMIN` + `HR_MANAGER` được classify JobOpening. `HR_STAFF` KHÔNG tự quyết ServiceModel (đây là phân loại hợp đồng/mô hình kinh doanh). Classification chỉ thay đổi khi JobOpening còn `DRAFT`. Khi JobOpening đã `OPEN` hoặc đã có `Placement`, ServiceModel bất biến. `NULL` fail-closed trước open/publish/placement (DEC-10 carryover). | CHOSEN (T0 directive 2026-09-30 §LOCK-03) |
| `LOCK-04` (T0) | DRAFT → OPEN authority: `ADMIN` + `HR_MANAGER` được mở JobOpening. `HR_STAFF` chỉ được mở JobOpening IFF có ACTIVE `StaffingOrderRecruiterAssignment` trên parent `StaffingOrder` theo authority đã được P1-A0.4 chấp nhận. KHÔNG dùng broad role-only bypass cho HR_STAFF. | CHOSEN (T0 directive 2026-09-30 §LOCK-04) |
| `LOCK-05` (T0) | Canonical commands: `POST /api/admin/staffing/job-openings/[id]/classify` + `POST /api/admin/staffing/job-openings/[id]/open`. Tên cuối có thể điều chỉnh theo convention hiện hữu (`/classify` + `/open` là đề xuất khớp với `recruiters/[assignmentId]/revoke` pattern); semantics phải tách biệt. Mỗi route: auth-first → role/scope gate TRƯỚC body processing → Zod validation → Idempotency-Key UUID v4 → withDbContext → safe canonical error envelope → KHÔNG leak actorId / assignment data / PII / DB internals. | CHOSEN (T0 directive 2026-09-30 §LOCK-05) |
| `LOCK-06` (T0) | Opening preconditions: DRAFT → OPEN chỉ thành công khi (1) JobOpening tồn tại và đang DRAFT; (2) `serviceModel != NULL`; (3) parent `StaffingOrder.status === 'OPEN'`; (4) slot/opening còn hiệu lực + còn chỗ (canonical `assertSlotEligibleForNewJobPosting`); (5) caller có authority hợp lệ (LOCK-04); (6) KHÔNG bypass canonical eligible-slot predicate; (7) transition atomic + race-safe (`SELECT ... FOR UPDATE` + UPDATE filtered by `status = 'DRAFT'`). `publishJobPosting` vẫn phải từ chối JobOpening DRAFT/FILLED/CANCELLED. | CHOSEN (T0 directive 2026-09-30 §LOCK-06) |
| `LOCK-07` (T0) | UI boundary: narrow action panel trên surface `JobPosting`/`JobOpening` hiện có (LOCK-07 cụ thể: `app/admin/job-openings/[id]/page.tsx`). KHÔNG tạo sidebar/menu mới; KHÔNG mở rộng sang ERP/payroll; KHÔNG tạo client-side business authority; KHÔNG thêm toast framework/dependency mới; KHÔNG gọi n8n. UI chỉ phản ánh server authority và dùng `router.refresh()` sau thành công. | CHOSEN (T0 directive 2026-09-30 §LOCK-07) |
| `LOCK-08` (T0) | Schema posture: ưu tiên ADOPT schema hiện có (`JobOpening.status` + `JobOpening.serviceModel`). KHÔNG migration/schema change trừ khi discovery chứng minh blocker không thể giải quyết bằng shape hiện hữu. Discovery (§6 reconciliation doc) cho thấy KHÔNG có blocker dạng đó. Nếu implementation round phát hiện cần migration, dừng ở planning và báo T0; KHÔNG tự thêm migration. | CHOSEN (T0 directive 2026-09-30 §LOCK-08) |
| `LOCK-09` (T0) | Final no-developer E2E AC chain (12 steps, defined in §6.2 AC-E2E-01..AC-E2E-12) — toàn bộ qua production routes/UI, KHÔNG dùng developer direct DB mutation. Bằng chứng cuối: targeted DB suite ×3, predecessor regressions ×3, full canonical integration, full unit/typecheck/lint/build/prisma validate, strict UTF-8 scan, UI/browser evidence cho action thực sự có thể thao tác, public job visibility + anonymous apply proof, exact route/auth/RLS proof, zero-residue proof. | CHOSEN (T0 directive 2026-09-30 §LOCK-09) |
| `LOCK-10` (T0) | P1 completion rule: KHÔNG tuyên bố P1 hoàn thành chỉ vì implementation A0.5 PASS. P1 chỉ hoàn thành khi (1) A0.5 audit PASS/accepted; (2) PR merge vào `main`; (3) canonical CI xanh trên `main`; (4) final no-developer E2E PASS trên main-compatible build; (5) cả hai P1 release blockers RESOLVED; (6) không còn P0/P1/P2 release-blocking finding; (7) TASK/HANDOFF final closeout được T0 chuyển `ACCEPTED`. | CHOSEN (T0 directive 2026-09-30 §LOCK-10) |
| `LOCK-11` (T0) | Scope boundary: KHÔNG mở P2/P3/P4/P5; KHÔNG deploy VPS; KHÔNG chạm production DB; KHÔNG sửa CRM; KHÔNG thêm n8n dependency; KHÔNG đổi sidebar/menu; KHÔNG xử lý P3 debt ngoài những gì bắt buộc để A0.5 chạy đúng. | CHOSEN (T0 directive 2026-09-30 §LOCK-11) |
| `DEC-12` | Implementation SHA pin: implementation round sẽ pin `Implementation SHA = <commit-SHA-of-round-N-semantic-commit>` trong TASK.md §0 và HANDOFF.md §0 ngay khi semantic surface đóng băng. Round-1 (= planning round hiện tại) KHÔNG có Implementation SHA. Implementation round sẽ append Round-N mới. | CHOSEN |
| `DEC-13` | Open questions: 0. T0 LOCK-01..LOCK-11 close every Owner decision; planning round introduces no new decision. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing Options | Decision | License | Version/source | Wrapper boundary | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| Auth context | `src/shared/auth/auth-context.ts` (`getAuthContext`) | `N/A` (reused as-is) | repo-owned | n/a | n/a | Carryover canonical middleware. |
| Idempotency | `src/shared/integrity/idempotency.ts` (`withIdempotency`) | `N/A` (reused) | repo-owned | n/a | n/a | UUID v4 + replay + 409 conflict. |
| DB context | `src/shared/auth/with-db-context.ts` (`withDbContext`) | `N/A` (reused) | repo-owned | n/a | n/a | Per-actor RLS ctx. |
| ServiceModel mapping | `src/domains/talent/placement.lifecycle.ts::computeManagementMode` (DEC-02) | `N/A` (reused) | repo-owned | n/a | n/a | A0.5 KHÔNG tính mode; chỉ ghi raw enum xuống `JobOpening.serviceModel`. Mode do downstream derive. |
| Classification fail-closed | `src/domains/talent/placement.resolution.ts::assertClassifiedJobOpening` (DEC-10) | `N/A` (reused) | repo-owned | n/a | n/a | Reuse cho `/open` precondition. |
| Slot eligibility predicate | `src/domains/staffing/job-posting-list.service.ts::eligibleSlotPredicateSql` + `job-posting-authoring.service.ts::assertSlotEligibleForNewJobPosting` | `N/A` (reused) | repo-owned | n/a | n/a | Canonical selector parity (P1-A0 audit-closed). `/open` MUST re-evaluate trong transaction. |
| Recruiter assignment predicate | `src/domains/staffing/recruiter-assignment.service.ts::assertRecruiterAndOrderAssignmentActive` (P1-A0.4 ACCEPTED) | `N/A` (reused) | repo-owned | n/a | n/a | HR_STAFF authority delegate cho `/open` (LOCK-04). |
| Canonical publish invariant | `src/domains/staffing/job-posting-authoring.service.ts::publishJobPosting` (`JOB_OPENING_NOT_OPEN` reject) | `N/A` (reused; not modified) | repo-owned | n/a | n/a | Bảo toàn invariant (LOCK-06). |
| Public listing + detail | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` | `N/A` (reused) | repo-owned | n/a | n/a | Carryover E2E visibility surface (LOCK-09 step 4). |
| Public apply | `app/api/public/jobs/[slug]/applications/route.ts` + `src/domains/applications/aff03-public-intake.service.ts` | `N/A` (reused) | repo-owned | n/a | n/a | Carryover E2E apply surface (LOCK-09 step 5). |
| Recruiter workbench | P1-A0.4 + P1-E0/E1 carryover | `N/A` (reused) | repo-owned | n/a | n/a | Carryover claim + placement flow (LOCK-09 steps 7-8). |
| Placement commands | P1-F0/F1 + N3 carryover | `N/A` (reused) | repo-owned | n/a | n/a | Carryover EFFECTIVE fail-closed (LOCK-09 step 10). |
| UI shell (admin) | `app/admin/job-openings/[id]/page.tsx` (existing detail page) | `ADOPT` (add narrow Server Component island; do not mutate existing layout) | repo-owned | n/a | New `<JobOpeningActions>` client island lives next to existing detail content; reuse canonical fetch helper pattern; server-rendered role gate. | LOCK-07 narrow action panel. |

### 3.2 Build vs Automate

N/A — A0.5 does NOT add any connector, scheduler, notification worker, or multi-system workflow. All mutations are single-actor single-action with Idempotency-Key + revision check + atomic DB transaction. No `CUSTOM_AUTOMATION_JUSTIFICATION` marker required.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
| --- | --- |
| `RQ-01` | Schema ADOPT only: `prisma/schema.prisma:524-547` (`model JobOpening`) đã có `status` (DRAFT/OPEN/FILLED/CANCELLED) và `serviceModel` (`ServiceModel?`). KHÔNG migration. Nếu implementation round phát hiện blocker, Tier 1 dừng ở planning và báo T0 (LOCK-08 escape). |
| `RQ-02` | `npx prisma validate` + `npx prisma generate` xanh trên schema không đổi. |
| `RQ-03` | `/classify` route tại `app/api/admin/staffing/job-openings/[id]/classify/route.ts`: role gate `ADMIN | HR_MANAGER`; Idempotency-Key UUID v4 bắt buộc; Zod body `{ serviceModel: 'STAFFING_SUPPLY' | 'LABOR_LEASING' | 'RECRUITMENT_SERVICE' | 'REFERRAL_SERVICE' }`; withDbContext; `classifyJobOpening` service. Trả về 200 + updated JobOpening DTO. |
| `RQ-04` | `classifyJobOpening(tx, ctx, { openingId, serviceModel })`: `assertRole(ctx) ∈ {ADMIN, HR_MANAGER}`; assert JobOpening tồn tại; assert `status === 'DRAFT'` (atomic predicate); assert `serviceModel ∈ {STAFFING_SUPPLY, LABOR_LEASING, RECRUITMENT_SERVICE, REFERRAL_SERVICE}`; assert `placementCount === 0` (defense in depth; placement đã fail-closed trên NULL qua DEC-10); UPDATE `job_openings SET service_model = $sm WHERE id = $openingId AND status = 'DRAFT'`. Nếu `serviceModel` đã set: idempotent — không đổi nhưng vẫn 200. Nếu đã `OPEN` hoặc `FILLED` hoặc `CANCELLED`: 409 `INVALID_STATE_TRANSITION`. |
| `RQ-05` | `/open` route tại `app/api/admin/staffing/job-openings/[id]/open/route.ts`: role gate `ADMIN | HR_MANAGER` ∪ (`HR_STAFF` với active `StaffingOrderRecruiterAssignment` trên parent `StaffingOrder`); Idempotency-Key UUID v4; body rỗng (hoặc optional `{ expectedOpeningVersion?: number }` cho optimistic revision nếu schema mở rộng tương lai; round này KHÔNG thêm column nên KHÔNG cần expectedVersion); withDbContext; `openJobOpening` service. |
| `RQ-06` | `openJobOpening(tx, ctx, { openingId })`: derive `ctx.role` server-side; nếu `HR_STAFF` → `assertRecruiterAndOrderAssignmentActive(tx, ctx.userId, opening.staffingOrderId)` (P1-A0.4 predicate); SELECT ... FOR UPDATE `job_openings WHERE id = $openingId`; assert `status === 'DRAFT'`; assert `serviceModel IS NOT NULL` (re-use `assertClassifiedJobOpening`); assert `parent StaffingOrder.status === 'OPEN'`; assert `slot.is_eligible === true` (re-use `assertSlotEligibleForNewJobPosting`); UPDATE `job_openings SET status = 'OPEN', opened_at = now() WHERE id = $openingId AND status = 'DRAFT'`; return JobOpening DTO. |
| `RQ-07` | Atomic + race-safe: cả `/classify` và `/open` đều chạy trong transaction với `SELECT ... FOR UPDATE` trên JobOpening row; UPDATE filtered by `status = 'DRAFT'`; concurrent race giải quyết thành đúng một mutation thành công, người còn lại nhận 409 `INVALID_STATE_TRANSITION` hoặc 200 idempotent (tùy theo kết quả re-read). |
| `RQ-08` | UI narrow action panel: mở rộng `app/admin/job-openings/[id]/page.tsx` bằng một Server Component island `<JobOpeningActions>` với 2 control groups: (a) ServiceModel selector (4 enum radio/select) — chỉ enable khi `role ∈ {ADMIN, HR_MANAGER}` AND `status === 'DRAFT'` AND `placementCount === 0`; (b) "Mở JobOpening" button — chỉ enable khi preconditions (LOCK-06) thoả mãn AND caller có authority (LOCK-04). HR_STAFF không có active assignment: button bị disable hoàn toàn (server-rendered) + reason text "Bạn cần được phân công vào StaffingOrder để mở JobOpening này". Sau thành công: gọi `router.refresh()`. KHÔNG toast framework mới; dùng inline status text. KHÔNG sidebar/menu mới. KHÔNG client-side business authority — server re-evaluate mọi precondition. |
| `RQ-09` | Canonical error envelope: tất cả error responses dùng `{ error: <CODE>, message: <safe-text>, ...optional details }`. KHÔNG leak `actorId`; KHÔNG leak `assignmentId` / `StaffingOrderRecruiterAssignment` rows; KHÔNG leak `staffingOrder.code` nếu chưa public; KHÔNG leak PII; KHÔNG leak DB internals (no Prisma error codes, no stack traces). |
| `RQ-10` | Test plan (LOCK-09 + AC chain in §6): (a) route unit tests cho `/classify` + `/open` (auth, role gate, idempotency, Zod validation, error envelope); (b) service unit tests cho `classifyJobOpening` + `openJobOpening` (atomic state transitions, race-safety, NULL fail-closed); (c) static tests cho canonical predicate reuse (`assertClassifiedJobOpening` + `assertSlotEligibleForNewJobPosting` + `assertRecruiterAndOrderAssignmentActive`); (d) `tests/db/p1a05-job-opening-readiness.integration.test.ts` (registered in `vitest.integration-files.ts`) — full 12-step no-developer E2E on synthetic Neon writer/admin pair; (e) predecessor regressions — `tests/db/p1a04-canonical-flow.integration.test.ts` ×3, `tests/db/p1a04-r3-substantive.integration.test.ts` ×3, `tests/db/recruiter-workbench.integration.test.ts` ×3, `tests/db/placement-lifecycle-integration.test.ts` ×3; (f) full canonical strict lane; (g) full unit lane; (h) typecheck, lint, build, prisma validate, strict UTF-8 scan, zero-residue probe ×3. |
| `RQ-11` | Integration test registry: append `'tests/db/p1a05-job-opening-readiness.integration.test.ts'` vào `vitest.integration-files.ts` (APPEND-only — không reorder existing entries). |
| `RQ-12` | Production DB/migration: NOT_RUN. Tier 1 implementation round chạy trên synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair (carryover từ P1-A0.4 / P1-A0.1 / P1-A0). KHÔNG chạm production DATABASE_URL. Production migration/deploy deferred to VPS release cutover (per LOCK-11). |

### 4.2 STEP

| ID | Step |
| --- | --- |
| `STEP-01` | Tạo `src/domains/staffing/job-opening-activation.service.ts`: pure functions `classifyJobOpening(tx, ctx, { openingId, serviceModel })` + `openJobOpening(tx, ctx, { openingId })` + predicate helpers. Import reuse: `assertSlotEligibleForNewJobPosting`, `assertClassifiedJobOpening`, `assertRecruiterAndOrderAssignmentActive`, `getAuthContext`. ZERO new dependencies. |
| `STEP-02` | Tạo `app/api/admin/staffing/job-openings/[id]/classify/route.ts`: clone pattern từ `app/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route.ts`. Auth → role gate ADMIN/HR_MANAGER → Zod `{ serviceModel }` → Idempotency-Key UUID v4 → withDbContext → withIdempotency → handler gọi `classifyJobOpening` → safe envelope. |
| `STEP-03` | Tạo `app/api/admin/staffing/job-openings/[id]/classify/route.test.ts`: route unit test (auth, role gate, idempotency, Zod validation, error envelope snapshot). |
| `STEP-04` | Tạo `app/api/admin/staffing/job-openings/[id]/open/route.ts`: cùng pattern, role gate `ADMIN | HR_MANAGER` ∪ scoped HR_STAFF (server-derived từ `ctx.role` + predicate check bên trong service). Body rỗng (hoặc optional `expectedOpeningVersion` ignored). |
| `STEP-05` | Tạo `app/api/admin/staffing/job-openings/[id]/open/route.test.ts`: route unit test. |
| `STEP-06` | Mở rộng `app/admin/job-openings/[id]/page.tsx`: thêm Server Component island `<JobOpeningActions opening={opening} ctx={ctx}>` với 2 control groups. Page component vẫn giữ existing role gate `ADMIN | HR_MANAGER | DIRECTOR | PM` cho read-only; action island add server-side check `HR_STAFF + active assignment` cho OPEN button. KHÔNG sửa layout/sidebar. |
| `STEP-07` | Tạo `app/admin/job-openings/[id]/job-opening-actions.tsx` (Server Component): render 2 control groups với canonical fetch helper + form action. Submit POST tới `/classify` hoặc `/open`; onSuccess: `router.refresh()`. KHÔNG toast framework mới; dùng inline status. |
| `STEP-08` | Tạo `src/domains/staffing/job-opening-activation.service.test.ts`: service unit tests (atomic state transitions, race-safety, NULL fail-closed, role gate, scoped HR_STAFF authority). |
| `STEP-09` | Tạo `tests/db/p1a05-job-opening-readiness.integration.test.ts`: full 12-step no-developer E2E + predecessor regression suite + zero-residue probe. |
| `STEP-10` | Append `'tests/db/p1a05-job-opening-readiness.integration.test.ts'` vào `vitest.integration-files.ts` (APPEND-only). |
| `STEP-11` | Run gates: `prisma validate`, `prisma generate`, `typecheck`, `lint`, `test:unit`, `test:integration` (full canonical + p1a05 + predecessor regressions), `verify-encoding.mjs`, `verify-encoding-range.mjs <baseline> HEAD`, `git diff --check`, `verify-task.ps1`, zero-residue probe ×3. |
| `STEP-12` | Commit semantic implementation (1 commit). Pin `Implementation SHA`. Write HANDOFF.md. Re-run `verify-handoff.ps1`. Freeze docs commit. |

### 4.3 AC — Acceptance Criteria

| ID | AC |
| --- | --- |
| `AC-01` | Schema posture: `npx prisma validate` PASS; `npx prisma generate` PASS; `prisma/migrations/` không có migration mới (LOCK-08 ADOPT). |
| `AC-02` | `/classify` route unit test: (a) role gate ADMIN/HR_MANAGER pass, HR_STAFF 403 `PERMISSION_DENIED`; (b) missing Idempotency-Key → 400 `IDEMPOTENCY_REQUIRED`; (c) invalid `serviceModel` enum → 400 `INVALID_INPUT` (Zod); (d) unknown `openingId` → 404 `NOT_FOUND`; (e) DRAFT opening + valid serviceModel → 200; (f) OPEN/FILLED/CANCELLED opening → 409 `INVALID_STATE_TRANSITION`; (g) idempotent replay (same key) → 200 + `replayed: true`; (h) idempotency conflict (different body, same key) → 409 `IDEMPOTENCY_CONFLICT`; (i) error envelope không leak actorId / assignment / PII. |
| `AC-03` | `classifyJobOpening` service unit test: (a) DRAFT → set; (b) OPEN reject; (c) NULL serviceModel incoming vẫn ghi được (đây là classify, không phải open); (d) placement exists → 409 (defense in depth); (e) atomic + race-safe (concurrent race → one wins, other 409). |
| `AC-04` | `/open` route unit test: (a) role gate: ADMIN/HR_MANAGER pass; HR_STAFF without active assignment → 403 `NO_ACTIVE_ORDER_ASSIGNMENT`; HR_STAFF with active assignment → pass; (b) Idempotency-Key required; (c) unknown `openingId` → 404; (d) preconditions evaluated server-side; (e) idempotent replay; (f) idempotency conflict; (g) error envelope không leak. |
| `AC-05` | `openJobOpening` service unit test: (a) DRAFT + serviceModel set + parent OPEN + slot eligible + authority → status → OPEN, `opened_at` set; (b) NULL serviceModel → 422 `SERVICE_MODEL_REQUIRED`; (c) parent order not OPEN → 409 `ORDER_NOT_OPEN`; (d) slot ineligible → 409 `SLOT_NOT_ELIGIBLE`; (e) HR_STAFF without active assignment → 403; (f) concurrent race (2 callers) → exactly one OPEN, other 409; (g) OPEN/FILLED/CANCELLED opening → 409 `INVALID_STATE_TRANSITION`. |
| `AC-06` | UI narrow action panel: (a) ServiceModel selector render chỉ khi `role ∈ {ADMIN, HR_MANAGER}` AND `status === 'DRAFT'` AND `placementCount === 0`; (b) HR_STAFF KHÔNG thấy ServiceModel selector; (c) OPEN button render chỉ khi preconditions (LOCK-06) + authority (LOCK-04); (d) HR_STAFF without active assignment: button disabled + reason text; (e) `router.refresh()` on success; (f) inline status text (no new toast framework); (g) admin shell layout/sidebar KHÔNG đổi. |
| `AC-07` | DB integration test (synthetic Neon writer/admin pair): full 12-step no-developer E2E chain (AC-E2E-01..AC-E2E-12, defined in §6.2); zero residue after run. |
| `AC-08` | Predecessor regression: `tests/db/p1a04-canonical-flow.integration.test.ts` ×3 PASS; `tests/db/p1a04-r3-substantive.integration.test.ts` ×3 PASS; `tests/db/recruiter-workbench.integration.test.ts` ×3 PASS; `tests/db/placement-lifecycle-integration.test.ts` ×3 PASS. |
| `AC-09` | Canonical gates: `prisma validate` PASS; `prisma generate` PASS; `npm run typecheck` PASS (0 errors); `npm run lint` PASS (0 errors); `npm run build` PASS; full canonical strict lane PASS; full unit lane PASS; strict UTF-8 scan PASS; `git diff --check` PASS. |
| `AC-10` | `verify-task.ps1` RESULT: PASS at READY_FOR_AUDIT (after implementation round). `verify-handoff.ps1` RESULT: PASS after HANDOFF freeze. |
| `AC-11` | Zero residue: `pwsh scripts/zero-residue-probe.ps1` ×3 reports `TOTAL_RESIDUE = 0` for tracked tables. |
| `AC-12` | `verify-encoding-range.mjs 12460cf55 HEAD` PASS (0 violations). |
| `AC-13` | Implementation SHA pin: HANDOFF.md §0 records exact `Implementation SHA = <commit-SHA>`. |
| `AC-14` | P1 release blockers in audit log: AUDIT.md §Final states `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY = RESOLVED_BY_P1_A0_5` AND `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION = RESOLVED_BY_P1_A0_5`. (LOCK-10) |
| `AC-15` | Exact changed surface: implementation round commits ONLY added files (no source/test/schema/migration/package/tooling mutation outside in-scope roots). `git diff --name-only <baseline>..HEAD` lists exact files; static check confirms no out-of-scope change. |

### 4.3.1 AC-E2E — Final No-Developer E2E (LOCK-09)

| ID | AC |
| --- | --- |
| `AC-E2E-01` | HR_MANAGER đăng nhập → truy cập `/admin/job-openings/[id]` → JobOpening ở trạng thái DRAFT (đã tạo từ slot qua `createOrReuseJobOpeningForSlot`). |
| `AC-E2E-02` | HR_MANAGER mở ServiceModel selector → chọn `RECRUITMENT_SERVICE` (hoặc `STAFFING_SUPPLY`) → submit → 200 → chip ServiceModel hiển thị trên page. |
| `AC-E2E-03` | HR_MANAGER (hoặc scoped HR_STAFF) mở JobOpening: preconditions thoả → status → OPEN + `opened_at` stamp → page reflect trạng thái mới sau `router.refresh()`. |
| `AC-E2E-04` | HR_STAFF tạo JobPosting draft (existing P1-A0 carryover) → sửa content (existing P1-A0.1 stamps) → submit publish (existing P1-A0 publish route). `publishJobPosting` accept vì JobOpening đã OPEN (LOCK-06 invariant bảo toàn). |
| `AC-E2E-05` | Tin xuất hiện trên `/viec-lam` (public listing) + `/viec-lam/[slug]` (public detail) — 200 HTTP + render đúng JobPosting. |
| `AC-E2E-06` | Ứng viên anonymous submit application tại `/viec-lam/[slug]` → `POST /api/public/jobs/[slug]/applications` → 201 + tracking code. |
| `AC-E2E-07` | `createCandidateSubmissionFromIntake` (existing N1) tạo LaborProfile + mở PlacementCase (status OPEN). |
| `AC-E2E-08` | Scoped recruiter (HR_STAFF với active assignment trên parent StaffingOrder) truy cập `/admin/my-claimed-candidates` (existing P1-A0.4 MINE rail) → thấy candidate → submit claim → 200 → LaborProfileHandlingAssignment được tạo với `source = 'ORDER_RECRUITER_CLAIM'`. |
| `AC-E2E-09` | Recruiter thực hiện placement actions qua recruiter-placement adapter: `placementCreate` → `placementConfirm` → `placementEffective` / `placementFail` / `placementCancel` (existing P1-F0/F1 carryover). |
| `AC-E2E-10` | Với `RECRUITMENT_SERVICE`: Placement đi tới `CLIENT_MANAGED` EFFECTIVE → PlacementCase atomically closes → 200. |
| `AC-E2E-11` | Với `STAFFING_SUPPLY`: `markPlacementEffective` throws `PlacementValidationError` → 400 (DEC-08 / C-07 carryover); outcome hợp lệ hiện tại là `CONFIRMED`. |
| `AC-E2E-12` | Không có bước nào yêu cầu developer sửa DB thủ công. Toàn bộ flow qua production routes/UI. Zero residue sau synthetic run. |

## 5. Execution Plan

### 5.1 RQ → STEP → AC Traceability

| RQ-ID | STEP-ID | AC-ID | Note |
| --- | --- | --- | --- |
| RQ-01 | all | AC-01 | LOCK-08 ADOPT — no migration (no-op, planning-only entry; gating schema posture) |
| RQ-02 | all | AC-01 | prisma validate + generate (no-op, planning-only entry; gating schema posture) |
| RQ-03 | STEP-02 | AC-02 | /classify route |
| RQ-04 | STEP-01 | AC-03 | classifyJobOpening service |
| RQ-05 | STEP-04 | AC-04 | /open route |
| RQ-06 | STEP-01 | AC-05 | openJobOpening service |
| RQ-07 | STEP-01 | AC-05 | atomic + race-safe |
| RQ-08 | STEP-06, STEP-07 | AC-06 | narrow UI action panel |
| RQ-09 | STEP-02, STEP-04 | AC-02, AC-04 | safe envelope |
| RQ-10 | all | AC-02, AC-04, AC-07 | test plan — service unit + route unit + DB E2E + predecessor regressions |
| RQ-11 | STEP-10 | AC-15 | registry update |
| RQ-12 | all | AC-08, AC-09, AC-10 | synthetic DB pair + full canonical gates + strict UTF-8 |

### 5.2 Step Detail

| ID | Action | Files |
| --- | --- | --- |
| STEP-01 | Pure service file: `classifyJobOpening` + `openJobOpening` + predicates | `src/domains/staffing/job-opening-activation.service.ts`, `src/domains/staffing/job-opening-activation.service.test.ts` |
| STEP-02 | `/classify` route handler | `app/api/admin/staffing/job-openings/[id]/classify/route.ts` |
| STEP-03 | `/classify` route unit test | `app/api/admin/staffing/job-openings/[id]/classify/route.test.ts` |
| STEP-04 | `/open` route handler | `app/api/admin/staffing/job-openings/[id]/open/route.ts` |
| STEP-05 | `/open` route unit test | `app/api/admin/staffing/job-openings/[id]/open/route.test.ts` |
| STEP-06 | Extend existing admin page with action island import + render | `app/admin/job-openings/[id]/page.tsx` |
| STEP-07 | New Server Component action island | `app/admin/job-openings/[id]/job-opening-actions.tsx` |
| STEP-08 | Service unit tests | `src/domains/staffing/job-opening-activation.service.test.ts` |
| STEP-09 | Full no-developer E2E DB integration + predecessor regression | `tests/db/p1a05-job-opening-readiness.integration.test.ts` |
| STEP-10 | Append integration test file to registry | `vitest.integration-files.ts` |
| STEP-11 | Run all gates | — |
| STEP-12 | Commit + pin Implementation SHA + HANDOFF freeze | `docs/tasks/hrp-p1-a0-5-job-opening-readiness/HANDOFF.md` |

## 6. Acceptance

### 6.1 Acceptance Criteria (Implementation round — target)

| ID | Criterion | Evidence |
| --- | --- | --- |
| AC-01 | Schema posture LOCK-08 ADOPT; `prisma validate` + `prisma generate` PASS; no new migration | `npx prisma validate`; `npx prisma generate`; `git diff prisma/migrations/` empty |
| AC-02 | `/classify` route unit test PASS (9 cases per RQ-03) | `app/api/admin/staffing/job-openings/[id]/classify/route.test.ts` |
| AC-03 | `classifyJobOpening` service unit test PASS (5 cases per RQ-04) | `src/domains/staffing/job-opening-activation.service.test.ts` |
| AC-04 | `/open` route unit test PASS (7 cases per RQ-05) | `app/api/admin/staffing/job-openings/[id]/open/route.test.ts` |
| AC-05 | `openJobOpening` service unit test PASS (7 cases per RQ-06) | `src/domains/staffing/job-opening-activation.service.test.ts` |
| AC-06 | UI narrow action panel PASS (7 cases per RQ-08) | code review + targeted tests |
| AC-07 | DB integration test PASS (full 12-step E2E on synthetic Neon) | `tests/db/p1a05-job-opening-readiness.integration.test.ts` |
| AC-08 | Predecessor regression ×3 PASS ×4 suites | `tests/db/p1a04-*` + `recruiter-workbench` + `placement-lifecycle` |
| AC-09 | Canonical gates PASS | `npm run typecheck`, `npm run lint`, `npm run build`, full canonical strict + unit lanes |
| AC-10 | `verify-task.ps1` PASS at READY_FOR_AUDIT; `verify-handoff.ps1` PASS after HANDOFF freeze | `.ai-pipeline/scripts/verify-*.ps1` |
| AC-11 | Zero residue ×3 | `scripts/zero-residue-probe.ps1` |
| AC-12 | Strict UTF-8 scan PASS | `node .ai-pipeline/scripts/verify-encoding-range.mjs 12460cf55 HEAD` |
| AC-13 | Implementation SHA pinned | HANDOFF.md §0 |
| AC-14 | Both P1 release blockers RESOLVED_BY_P1_A0_5 | AUDIT.md §Final |
| AC-15 | Exact changed surface (within in-scope roots only) | `git diff --name-only <baseline>..HEAD` + static sweep |

### 6.2 AC-E2E — Final No-Developer E2E (LOCK-09)

See `### 4.3.1 AC-E2E` for the 12-step chain. Each step MUST have a measurable evidence row in `tests/db/p1a05-job-opening-readiness.integration.test.ts`.

### 6.3 Gate Results (to be recorded at HANDOFF)

| Gate | Target Result |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | PASS (0 errors) |
| `npm run build` | PASS |
| `vitest run` (unit lane) | PASS |
| `vitest run --config vitest.integration.config.ts` (full canonical) | PASS |
| `vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts --repeat 3` | PASS ×3 on synthetic DB |
| `git diff --check` | PASS |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS |
| `node .ai-pipeline/scripts/verify-encoding-range.mjs 12460cf55 HEAD` | PASS |
| `pwsh .ai-pipeline/scripts/verify-task.ps1` | PASS at READY_FOR_AUDIT |
| `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | PASS after HANDOFF freeze |
| `pwsh scripts/zero-residue-probe.ps1 -RunId p1a05-rN-*` ×3 | TOTAL_RESIDUE = 0 |
| Production DB/migration | NOT_RUN (deferred to VPS release cutover) |

## 7. Risk

| Risk | Mitigation |
| --- | --- |
| HR_STAFF without assignment accidentally gains `/open` authority | Server-side predicate check inside `openJobOpening` (P1-A0.4 carryover); route unit + service unit + DB integration tests |
| Concurrent classify + open race | Both routes SELECT … FOR UPDATE JobOpening + UPDATE filtered by `status = 'DRAFT'`; Prisma serializable isolation (existing default) |
| Schema migration creep | LOCK-08 escape only — Tier 1 dừng ở planning và báo T0 nếu phát hiện blocker |
| Cross-tenant info leak via error envelope | Safe canonical envelope; static test snapshot for envelope shape; KHÔNG leak actorId / assignment / PII |
| Blast radius leak to ERP/payroll/CRM | LOCK-07 + LOCK-11 + planner discipline + forbidden-paths sweep |
| Toast framework or new dependency creep | LOCK-07 — no new toast framework; reuse inline UI |
| UI sidebar/menu creep | LOCK-07 + LOCK-11 — admin shell/layout/sidebar KHÔNG đổi |
| Recruiter workbench regression | P1-A0.4 + P1-E0/E1 unchanged; predecessor regression suite ×3 |
| Placement invariant regression | placement.commands / lifecycle / resolution / service đều read-only carryover; predecessor regression suite ×3 |
| P1 announcement premature | LOCK-10 — chỉ A0.5 audit PASS + PR merge + E2E PASS + cả hai blocker RESOLVED + TASK/HANDOFF ACCEPTED mới đồng nghĩa P1 hoàn thành |
| Synthetic DB unavailable | Tier 1 status = ENV_BLOCKED nếu synthetic Neon writer/admin pair không có (carryover pattern từ P1-A0.4) |
| Idempotency key collision across routes | UUID v4 entropy + per-(route, actorId, key, requestBody) hash; route unit tests cover replay + conflict |
| Token / PII leak in logs | KHÔNG log token / password / CCCD / phone / dob; safe envelope KHÔNG leak PII |
| Forbidden path modification | Pre-commit grep sweep + LOCK-11 + planner discipline; forbidden-paths in §0 |

## 8. Open Questions

None. T0 LOCK-01..LOCK-11 close every Owner decision. Planning round introduces no new decision. `Open Owner decisions = 0`.

## 9. Planner Resolution

- T0 directive 2026-09-30 §LOCK-01..§LOCK-11 closed every Owner decision before this planning round.
- Capability matrix (§2 of reconciliation doc): 13 ADOPT (carryover reuse) + 3 MISSING (built in implementation round) + 3 FORBIDDEN (boundary constraints). Zero BUILD in this round.
- Schema posture LOCK-08: ADOPT only — both blockers are pure mutation authority gaps, not schema gaps. `JobOpening.status` + `JobOpening.serviceModel` đã đủ. Nếu implementation round phát hiện blocker khác, Tier 1 dừng ở planning và báo T0.
- Authority model LOCK-04: HR_STAFF `/open` authority đến từ P1-A0.4 `StaffingOrderRecruiterAssignment` predicate (carryover, KHÔNG mutate). NO broad role-only bypass.
- UI boundary LOCK-07: narrow action panel trên `app/admin/job-openings/[id]/page.tsx` (existing detail page). KHÔNG sidebar/menu/layout mới.
- Test plan: full 12-step no-developer E2E (AC-E2E-01..AC-E2E-12) + predecessor regression ×3 + zero residue ×3 + canonical gates + strict UTF-8 scan.
- Integration test registry: append `'tests/db/p1a05-job-opening-readiness.integration.test.ts'` to `vitest.integration-files.ts` (APPEND-only).
- Production DB/migration: NOT_RUN. Tier 1 implementation round chạy trên synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair (carryover P1-A0.4 pattern).
- P1 completion rule LOCK-10: KHÔNG tự tuyên bố P1 hoàn thành. Chỉ A0.5 audit PASS + PR merge + canonical CI xanh + final E2E PASS + cả hai P1 release blocker RESOLVED + TASK/HANDOFF final closeout ACCEPTED mới đồng nghĩa P1 hoàn thành.
- T0 production closeout của P1-A0.4: PR #68 đã mở (Phase A closeout) và MERGED. P1-A0.4 ACCEPTED at production merge SHA `12460cf55d77f193225e54cf4b8e1c1dfc8eaf59`.
- **Planning round this commit only**. Implementation round (post-T0 review) sẽ tạo `Implementation SHA` mới và append Revision Log row mới.
- **T0 sẽ review contract P1-A0.5 trước khi cho phép implementation** (per T0 directive Phase B "T0 sẽ review contract P1-A0.5 trước khi cho phép implementation.").

## 10. Revision Log

| Round | Date | Author | Change | Reason |
| --- | --- | --- | --- | --- |
| `v1.0` (planning round) | 2026-09-30 | Tier 1 (T1C) | Initial planning contract. Status `PROPOSED_ONLY`. Contract gate `DRAFT`. Decision state `CLOSED`. Open Owner decisions `0`. T0 LOCK-01..LOCK-11 closed every Owner decision. Capability matrix 13 ADOPT + 3 MISSING + 3 FORBIDDEN (no BUILD). Authority model reuses P1-A0.4 `StaffingOrderRecruiterAssignment` predicate for HR_STAFF `/open`. UI boundary is narrow action panel on `app/admin/job-openings/[id]/page.tsx` (existing detail page); NO sidebar/menu/layout change. Schema posture LOCK-08 ADOPT only — no migration. `Test environment REQUIRED` (synthetic DB; readiness by preflight). `Next gate T0_CONTRACT_REVIEW`. RQ-01..RQ-12 + STEP-01..STEP-12 + AC-01..AC-15 + AC-E2E-01..AC-E2E-12 = 53 measurable AC. Predecessor chain reference: P1-A0/A0.1/A0.4/B/E0/E1/F0/F1 carryover unchanged; A0.5 consumes, does NOT mutate. Production DB/migration NOT_RUN; deferred to VPS release cutover after A0.5 audit PASS + PR merge. | T0 → T1C — P1-A0.5 final thin-slice planning (T0 directive 2026-09-30 Phase B) |

---

*Planning round contract v1.0 (DRAFT). Next gate: T0_CONTRACT_REVIEW. NO implementation in this commit. T0 will review contract before any READY_TO_CODE transition. Implementation round will append a new Revision Log row + pin Implementation SHA.*

*Predecessor chain context: P1-A0.4 ACCEPTED closeout (PR #68 merged into main at 12460cf55d77f193225e54cf4b8e1c1dfc8eaf59); two P1 release blockers `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` and `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` transferred to P1-A0.5 (LOCK-01) — they remain OPEN until A0.5 audit PASS + PR merge + final no-developer E2E PASS + TASK/HANDOFF final closeout ACCEPTED (LOCK-10).*