# TASK — hrp-v6-n1-placement-case-foundation

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-v6-n1-placement-case-foundation` |
| Work type | `SCHEMA` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | N1 là identity + invariant task (TIER0_HANDOVER.md §N1: "Audit Tier 3 LIGHT bắt buộc cho identity, migration và invariant"). Touch: bảng mới (identity), FK NOT NULL partial unique (invariant), migration ADD-only (cần Owner deploy gate). |
| Spec version | `v1.0` |
| Status | `DRAFT` |
| Planner | `Tier 1` |
| Baseline | `main @ f2f3296` — sau AV1 hotfix design-token regression (Tier 3 close N0 audit) |
| In-scope roots | `prisma/schema.prisma`; `prisma/migrations/<n1_timestamp>_n1_placement_case_foundation/**`; `docs/tasks/hrp-v6-n1-placement-case-foundation/**` |
| Forbidden paths | `prisma/migrations/<older>`, `app/**`, `src/**`, `tests/**` (ngoại trừ unit test cho invariant concurrency-safe — sẽ mở rộng allowlist sau khi Tier 0 chốt design) |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npx prisma migrate diff --from-schema-datamodel <baseline> --to-schema-datamodel <HEAD> --script > evidence/migration-preview.sql` (chỉ CREATE TABLE + ADD COLUMN, KHÔNG DROP); `npx vitest run --config vitest.unit.config.ts` (baseline gate — phải 2008/2008 PASS); `npm run typecheck` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver` (Tier 1 implement) → `/audit` (Tier 3 LIGHT theo contract) → `/resolve` (Tier 1 + Tier 0 deploy gate) |

> Lane CRITICAL + Audit LIGHT — không được hạ. CRITICAL vì chạm identity (DEC-013) + invariant ("max 1 active PlacementCase/LaborProfile" — concurrency-safe bằng partial unique index).

## 1. Outcome

### 1.1 User-visible outcome

- Có model `PlacementCase` đại diện cho **một đợt HRP giúp một LaborProfile tìm / đổi / tái bố trí việc** (`docs/V7/V7_ARCHITECTURE.md` §4.2).
- Mỗi `LaborProfile` có thể có NHIỀU case lịch sử nhưng **tối đa MỘT case ACTIVE** (status = OPEN | IN_PROGRESS | READY_TO_PLACE) — enforced bằng **partial unique index** trong migration.
- Mỗi `CandidateSubmission` (ở phase này) được gắn **nullable `placementCaseId`** — link cũ (`workerId`, `mergedWorkerId`, `submissionId` của `ProjectAssignment`) vẫn còn nguyên và là nguồn sự thật cho legacy.
- **KHÔNG tạo** model `Application` mới (đã cấm trong domain constitution — V6 Phase 1A).
- **KHÔNG backfill** dữ liệu sống trong task này — hàng legacy để `placementCaseId = NULL`, nhập qua intake writer thuộc task sau khi TIER 0 chốt policy.

### 1.2 Non-goals (chốt để chống trôi)

- KHÔNG model `Placement` — thuộc N3 (ServiceModel + Placement lifecycle); chỉ đặt foundation PlacementCase để N3 consume.
- KHÔNG model `HandlingAssignment` — thuộc N2.
- KHÔNG model `JobProposal` / `InteractionOutcome` / `NextAction` — V7.
- KHÔNG thay đổi `ProjectAssignment` authority MP-3C — vẫn đi qua `submissionId` + `staffingOrderSlotId` đến khi N4 actual-start bridge bật (TIER0_HANDOVER.md §N4).
- KHÔNG tạo `Worker` mới hay backfill worker/submission/assignment hiện có.
- KHÔNG viết API route / service / UI — task chỉ đặt SCHEMA + chính sách SQL + test invariant.
- KHÔNG chạy `prisma migrate dev` / `migrate deploy` lên DB sống — Owner-gated (apply policy RLS vào live là OP của sếp).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/schema.prisma` lines 1377–1440 (LaborProfile/Intake/Episode) | Schema hiện tại N1 sẽ consume — đã được Owner xác nhận applied live (f8bd761, 08/09/2026). N1 phải ADD-only. |
| `EV-02` | `prisma/schema.prisma` lines 633–670 (ProjectAssignment) + migration `mp3c_assignment_placement_links` | Authority placement hiện tại — N1 KHÔNG can thiệp, chỉ đặt link ngược `placementCaseId` nullable. |
| `EV-03` | `prisma/schema.prisma` lines 528–585 (CandidateSubmission) | Link mới `placementCaseId` thêm vào đây. |
| `EV-04` | `docs/TIER0_HANDOVER.md` §N1 (lines 167–181) | Chỉ thị Tier 0 cho N1 — outcome + audit obligation. |
| `EV-05` | `docs/tasks/hrp-v6-n0-contract-audit/TASK.md` §5.2 #1 | N0 chốt đây là next domain task + cảnh báo "cần Owner review schema trước khi viết migration". |
| `EV-06` | `docs/V7/V7_ARCHITECTURE.md` §4.2 (PlacementCase) — definition + rules + state model đề xuất | Reference thiết kế tương lai (CHỈ tham chiếu, KHÔNG implement V7). |
| `EV-07` | `docs/tasks/hrp-v6-p1-labor-profile-schema/TASK.md` (R2 PASS + LIVE) | Pattern schema ADD-only + RLS forward-only để N1 sao chép — bài học rlS-drift-15-tables. |
| `EV-08` | `docs/tasks/hrp-v6-n0-contract-audit/evidence-v1.1/av1-design-token-regression.md` | Bài học gate tĩnh carry-forward — Tier 1 nhớ apply cho tier 1 của N1 (verify `vitest design-tokens.static.test.ts` trước khi commit). |

## 3. Decisions cần Tier 0 chốt (CHƯA chốt — block execution)

| ID | Decision | Status | Note |
|---|---|---|---|
| `DEC-N1-01` | **State model của PlacementCase** dùng enum hay String? TIER0 §N1 không chốt shape; V7_ARCHITECTURE §4.2 chỉ "suggested". Tier 1 khuyến nghị: **enum** `PlacementCaseStatus { OPEN, IN_PROGRESS, READY_TO_PLACE, CLOSED }` + `PlacementCaseStage` (NEW/CONTACTING/NEEDS_INFO/QUALIFYING/MATCHING/PROPOSED/CANDIDATE_ACCEPTED/CLIENT_PROCESS/READY_TO_START) chỉ để tham chiếu (không implement stage ở N1). | `NEED_TIER0_DECISION` | Single enum đủ cho invariant; stage deferred N2/N3. |
| `DEC-N1-02` | **Partial unique index** trên `(laborProfileId) WHERE status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')` — coi ba status trên là "ACTIVE". Nếu Tier 0 chọn khác (ví dụ chỉ OPEN), index thu hẹp lại. | `NEED_TIER0_DECISION` | Concurrency-safe invariant. Tier 1 khuyến nghị 3 status. |
| `DEC-N1-03` | **`CandidateSubmission.placementCaseId` nullable + FK ON DELETE SET NULL** — hay FK với chính sách chặn delete khi có submission? | `NEED_TIER0_DECISION` | Tier 1 khuyến nghị SET NULL (legacy rows NULL; inta writer tạo case mới). |
| `DEC-N1-04` | **`LaborProfile` ↔ `PlacementCase`** quan hệ: 1 LaborProfile → N PlacementCase. Có back-relation `PlacementCase.laborProfile` không nullable (FK REQUIRED), không có unique. **OK chốt sẵn** theo V7 §4.2. | `CHOSEN` (theo V7_ARCHITECTURE.md + Tier0 §N1) | |
| `DEC-N1-05` | **Close reason catalog** (TEXT nullable) — cho phép đóng CLOSED mà chưa chốt catalog. | `NEED_TIER0_DECISION` (catalog) — schema (cột nullable + index trên `closedAt`) OK chốt sẵn | Tier 0 §8 vẫn list "Placement failure reason catalog" pending. |
| `DEC-N1-06` | **Migration áp lên live**: Tier 1 chỉ commit file migration; Owner deploy gate. Migration RLS forward-only trên `placement_case` (phạm vi nội bộ HR, không có policy public). | `CHOSEN` (cách làm) | Pattern đã có ở P1 LaborProfile schema. |
| `DEC-N1-07` | **Audit phase**: Tier 3 LIGHT bắt buộc theo TIER0_HANDOVER.md §N1 — outcome PASS tùy thuộc Tier 3 verify (a) partial unique index chính xác từ enum; (b) ADD-only SQL preview; (c) baseline gate không regress (2008/2008 + design-tokens 12/12); (d) không DB nào được touch. | `CHOSEN` | |

> Đạt tiêu chí READY_FOR_EXECUTION: 0 dòng `NEED_TIER0_DECISION` còn lại. Tier 1 chờ Tier 0 / Owner phản hồi DEC-N1-01..05 trước khi triển khai.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Có model `PlacementCase` với các cột: `id` (cuid), `laborProfileId` (FK NOT NULL), `status` (enum), `openedAt`, `closedAt?`, `closeReason?`, `createdAt`, `updatedAt`. |
| `RQ-02` | Enum `PlacementCaseStatus` theo `DEC-N1-01`. |
| `RQ-03` | Partial unique index `(laborProfileId) WHERE status IN (ACTIVE_STATUSES)` đảm bảo invariant "max 1 active case / LaborProfile" concurrency-safe. |
| `RQ-04` | `CandidateSubmission.placementCaseId` nullable FK với `ON DELETE SET NULL` (theo `DEC-N1-03`). Không sửa các cột khác của `CandidateSubmission`. |
| `RQ-05` | Migration ADD-only: chỉ `CREATE TABLE placement_case` + `CREATE INDEX ...` + `ALTER TABLE candidate_submissions ADD COLUMN placement_case_id ...` + constraint FK. KHÔNG DROP / RENAME / ALTER COLUMN TYPE. |
| `RQ-06` | Migration RLS forward-only: bật RLS + policy nội bộ HR (HR_MANAGER + HR_STAFF role), KHÔNG policy public / anon. |
| `RQ-07` | Back-relation `LaborProfile.placementCases` cho Prisma client. `PlacementCase.laborProfile` NOT NULL. |
| `RQ-08` | Verify INVARIANT ở application-level (test unit trong lane unit): concurrent INSERT 2 active case cùng LaborProfile → 1 commit, 1 fail bằng P2002 / unique constraint. Test này chạy với DB thật thuộc gate `prisma test`; ở unit lane, viết pure-Python / TS test mô phỏng DDL (insert SQL mẫu + assert). |
| `RQ-09` | Không touch `ProjectAssignment` authority MP-3C; không touch `Worker`, `LaborProfile`, `EmploymentEpisode` schema. |
| `RQ-10` | Không code application logic (không service / route / UI); chỉ schema + migration + invariant test. |

### 4.2 Scope boundaries

- **In:** `prisma/schema.prisma` (1 enum + 1 model thêm vào cuối khối V6 Phase 1A schema); `prisma/migrations/<n1_timestamp>_n1_placement_case_foundation/migration.sql`; `prisma/migrations/<n1_timestamp_rls>_n1_placement_case_rls/migration.sql` (RLS forward-only); 1 file test invariant; `docs/tasks/hrp-v6-n1-placement-case-foundation/**`.
- **Out:** Mọi API route / service / UI; `ProjectAssignment` / `Worker` / `EmploymentEpisode`; backfill legacy rows; migration ngoài 2 file trên; scripts reseed.
- **Allowed task artifacts:** `docs/tasks/hrp-v6-n1-placement-case-foundation/**` + 2 migration SQL + 1 test file.
- **Forbidden scope expansion:** KHÔNG triển khai `Placement`, `HandlingAssignment`; KHÔNG tạo `Application` model; KHÔNG thay đổi RLS matrix cho bảng cũ.

### 4.3 Domain boundaries

- **Data/state:** invariant `max 1 active PlacementCase / LaborProfile` enforced bằng partial unique index. Status ACTIVE là subset của enum (chốt tại DEC-N1-02). Close reason là TEXT nullable (không enum cứng). state machine transition CHƯA implement trong task này (chỉ có enum; transition handler thuộc task Phase sau khi có intake writer).
- **Permission/security:** RLS forward-only — policy HR_MANAGER + HR_STAFF (xem V6-P1 labor profile RLS để tham chiếu pattern). Phạm vi worker.x_internal nội bộ; KHÔNG policy public/anon.
- **Interface/API:** KHÔNG có API mới. Schema chỉ phục vụ downstream task (Placement N3, HandlingAssignment N2).
- **Migration/rollback:** ADD-only. Rollback = DROP TABLE placement_case + DROP COLUMN placement_case_id. Xem N0 §4.4.

## 5. Execution Plan

Plan chỉ cho phép Tier 1 thực thi khi đã có đủ DEC-N1-01..05 từ Tier 0.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `prisma/schema.prisma` (cuối schema, sau `EmploymentEpisode`) | Thêm enum `PlacementCaseStatus` + model `PlacementCase` + back-relations. Thêm nullable `placementCaseId` trên `CandidateSubmission`. | `npx prisma validate`; `npx prisma generate`; `git diff --stat prisma/schema.prisma` chỉ có additions. | validate FAIL → revert toàn bộ STEP. |
| `STEP-02` | Khai schema diff local (so với `main @ f2f3296`) | Sinh SQL preview `ADD-only`. | `npx prisma migrate diff --from-schema-datamodel <baseline> --to-schema-datamodel <HEAD> --script > evidence/migration-preview.sql`; `grep -E "DROP\|RENAME\|ALTER COLUMN" evidence/migration-preview.sql` trả rỗng. | Có DROP / RENAME / ALTER COLUMN → fail STEP, liên hệ Tier 0. |
| `STEP-03` | `prisma/migrations/<ts>_n1_placement_case_foundation/migration.sql` | Viết CREATE TABLE placement_case + CREATE INDEX (partial unique) + ALTER TABLE candidate_submissions ADD COLUMN placement_case_id + FK constraint (SET NULL). SQL đồng nhất với `evidence/migration-preview.sql`. | So từng dòng SQL với preview; `git status --porcelain` list đúng migration file. | Không khớp preview → fail STEP. |
| `STEP-04` | `prisma/migrations/<ts>_n1_placement_case_rls/migration.sql` | Bật RLS + 1 policy HR_MANAGER + 1 policy HR_STAFF + 1 policy ADMIN short-circuit. | SQL tham chiếu pattern từ P1 labor profile RLS (`20260908150001_*`); `grep -c "DROP POLICY" file` = 0. | Khớp pattern → fail STEP. |
| `STEP-05` | `tests/db/placement-case-invariant.test.ts` (unit lane) | Test pure-TS mô phỏng invariant: insert SQL thật với 2 ACTIVE case cùng LaborProfile → 1 OK, 1 fail. KHÔNG connect DB thật — dùng `pg-mem` hoặc pseudo-SQL với assert constraint name. Tier 3 LIGHT sẽ verify test chạy offline. | `npx vitest run tests/db/placement-case-invariant.test.ts --config vitest.unit.config.ts` PASS; evidence test log saved. | Test FAIL → STEP hold. |
| `STEP-06` | Full baseline gate | Chạy full unit suite + typecheck + prisma validate. | `npx vitest run --config vitest.unit.config.ts` = 2008/2008 PASS (không tăng không giảm); `npm run typecheck` = exit 0; `npx prisma validate` = OK; `grep -n "design-tokens" evidence/preview.log` + run isolated = 12/12 PASS (carry-forward AV1 hotfix f2f3296). | Bất kỳ gate nào regress → fail STEP, kiểm tra carry-forward. |
| `STEP-07` | Commit & push | Stage schema + 2 migration files + test + TASK.md sửa `Status: READY_FOR_EXECUTION` (chỉ sau khi DEC-N1-01..05 đã chốt). Push theo Tier 1 push authority. | `git log --oneline -1` show commit; `git log --stat` show 4 file changed; commit message convention `feat(n1): foundation ...`. | Push fail → revert tag. |

> Tier 1 KHÔNG tự chuyển trạng thái từ DRAFT → READY_FOR_EXECUTION; Tier 0/Owner phải phản hồi DEC-N1-01..05 hoặc Tier 1 đề xuất default.

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `npx prisma validate` exit 0 trên `prisma/schema.prisma`. | Log lưu `evidence/step01-validate.log`. |
| `AC-02` | `npx prisma generate` exit 0; generated client chứa `PlacementCase` và enum `PlacementCaseStatus` (grep `client.d.ts` từ output). | Log + grep result `evidence/step01-generate.log`. |
| `AC-03` | `evidence/migration-preview.sql` chỉ chứa CREATE TABLE / CREATE INDEX / CREATE POLICY / ALTER TABLE ADD COLUMN / ALTER TABLE ENABLE RLS; KHÔNG có DROP / RENAME / ALTER COLUMN TYPE. | `grep -E "DROP TABLE\|DROP COLUMN\|RENAME\|ALTER COLUMN" evidence/migration-preview.sql` trả rỗng. |
| `AC-04` | Partial unique index name khớp với convention `<table>_<column>_active_unique`; SQL chứa `WHERE status IN (...)` đúng ACTIVE_STATUSES của DEC-N1-02. | Grep migration file `evidence/step03-sql.txt`. |
| `AC-05` | Migration RLS forward-only: file thứ 2 có `ALTER TABLE placement_case ENABLE ROW LEVEL SECURITY` + tối thiểu 1 policy HR_MANAGER + 1 policy HR_STAFF + 1 policy ADMIN; `grep -c "DROP POLICY" file` = 0. | Grep evidence. |
| `AC-06` | Test invariant PASSES trong unit lane. `npx vitest run tests/db/placement-case-invariant.test.ts --config vitest.unit.config.ts` = 1/1 passed. | Log lưu `evidence/step05-invariant-test.log`. |
| `AC-07` | Full baseline suite: `npx vitest run --config vitest.unit.config.ts` = 2008/2008 PASS; thời gian trong khoảng 25-40s. | Log lưu `evidence/step06-full-suite.log`. |
| `AC-08` | Typecheck: `npm run typecheck` exit 0. | Log lưu `evidence/step06-typecheck.log`. |
| `AC-09` | `npx vitest run ... src/shared/ui/design-tokens.static.test.ts` = 12/12 PASS (carry-forward từ f2f3296 — Tier 3 chứng minh đây là gate tĩnh dễ bị regress ở task schema/UX). | Log lưu `evidence/step06-design-tokens.log`. |
| `AC-10` | Commit message theo convention `feat(n1): ...` hoặc `chore(n1): ...`; push lên origin/main thành công. | `git log --oneline -1`; Tier 1 push authority đã được Owner ack cho N1. |
| `AC-11` | KHÔNG có file ngoài allowlist (`git diff --name-only main..HEAD` chỉ list 4 file: schema.prisma, 2 migration files, 1 test file, TASK.md). | Grep output. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-01 | AC-01, AC-02 |
| `RQ-02` | STEP-01 | AC-02 |
| `RQ-03` | STEP-01, STEP-03 | AC-04 |
| `RQ-04` | STEP-01, STEP-03 | AC-03, AC-04 |
| `RQ-05` | STEP-02, STEP-03 | AC-03 |
| `RQ-06` | STEP-04 | AC-05 |
| `RQ-07` | STEP-01 | AC-02 |
| `RQ-08` | STEP-05 | AC-06 |
| `RQ-09` | STEP-01, STEP-07 | AC-11 |
| `RQ-10` | STEP-07 | AC-11 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Tier 0/Owner không phản hồi 5 DEC-N1-01..05 → block execution hơn 1 tuần. | Tier 1 đề xuất default ở §3; Tier 0 chỉ cần "OK" để unblock. Nếu không phản hồi > 3 ngày làm việc, Tier 1 escalate qua TIER0_HANDOVER.md §10 chỉ thị tiếp quản. |
| `RISK-02` | Migration RLS forward-only vô tình khóa public/anon path hiện tại đang đọc legacy rows. | Pattern P1 labor profile RLS đã chứng minh. Migration KHÔNG touch policy cũ. Verify bằng grep `DROP POLICY` = 0. |
| `RISK-03` | Partial unique index có syntax sai / không enforce được invariant trên PG production. | STEP-05 test invariant ở unit lane (offline) — Tier 3 verify. Tier 0 deploy gate sẽ chạy manual integration test trên hrp-live-readonly. |
| `RISK-04` | Carry-forward design-tokens gate bị regress do schema change trigger Prisma regen và đổi timestamp file. | AC-09 ép isolated re-run; Layer guard. |
| `RISK-05` | Tier 1 vô tình touch `ProjectAssignment` MP-3C schema. | AC-11 ép allowlist 4 file; `git diff main..HEAD --stat` check. |
| `RISK-06` | SQL preview khác file migration (do lúc viết diff có state khác). | STEP-03 yêu cầu so diff. Nếu lệch → fail STEP, regenerate preview. |

## 8. Open Questions (Tier 0/Owner)

1. **(DEC-N1-01)** `PlacementCaseStatus` gồm các giá trị nào? Tier 1 khuyến nghị `OPEN | IN_PROGRESS | READY_TO_PLACE | CLOSED`. Stage enum đề xuất ở V7 §4.2 — defer cho task Phase sau.
2. **(DEC-N1-02)** ACTIVE_STATUSES của partial unique index — Tier 1 khuyến nghị `OPEN, IN_PROGRESS, READY_TO_PLACE` (CLOSED = không active).
3. **(DEC-N1-03)** `CandidateSubmission.placementCaseId` FK: SET NULL hay restrict? Tier 1 khuyến nghị SET NULL (CHỈ legacy rows giữ NULL; new writes chuyển sang tạo case ngay).
4. **(DEC-N1-05)** Close reason catalog: có cần schema enum cứng hay TEXT nullable chấp nhận catalog tự do? Tier 1 khuyến nghị TEXT nullable ở N1 (schema thuần); catalog do Owner/PM chốt sau.
5. **Owner visual review** AV1 (sau hotfix f2f3296) — đã ghi trong PLANNER_HANDOVER.md cursor; không thuộc scope N1 nhưng block Owner visual acceptance cho toàn Phase.

## 9. Planner Resolution (để trống — Tier 1 append khi close)

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | `2026-09-12` | `Tier 1` | Initial contract (DRAFT) sau N0 v1.1 ACCEPTED + AV1 hotfix f2f3296. | N0 §5.2 #1 mở next domain task. Audit LIGHT bắt buộc theo TIER0_HANDOVER.md §N1. Carry-forward bài học gate tĩnh từ AV1 regression. |
