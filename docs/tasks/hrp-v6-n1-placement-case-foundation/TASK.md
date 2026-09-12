# TASK — hrp-v6-n1-placement-case-foundation

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-v6-n1-placement-case-foundation` |
| Work type | `SCHEMA` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | N1 là identity + invariant task (TIER0_HANDOVER.md §N1: "Audit Tier 3 LIGHT bắt buộc cho identity, migration và invariant"). Touch: bảng mới (identity), FK NOT NULL partial unique (invariant), migration ADD-only (Tier 3 LIGHT cover schema + FK + partial index + RLS — KHÔNG áp lên hrp-live, deploy gate thuộc Owner). |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `HEAD lúc bắt đầu execution` (xác định bằng `git rev-parse HEAD` trước STEP-01; cập nhật evidence). KHÔNG fix cứng SHA. |
| In-scope roots | `prisma/schema.prisma`; `prisma/migrations/<n1_timestamp>_n1_placement_case_foundation/**`; `docs/tasks/hrp-v6-n1-placement-case-foundation/**` |
| Forbidden paths | `prisma/migrations/<older>`, `app/**`, `src/**`. Riêng `tests/db/placement-case-invariant.test.ts` được phép tạo mới (static SQL gate theo RQ-08). |
| Required gates | `npx prisma validate`; `npx prisma generate`; `prisma migrate diff` từ baseline ghi ở STEP-01 (`git show <baseline_sha>:prisma/schema.prisma`) sang HEAD (`prisma/schema.prisma`) → `evidence/migration-preview.sql` (chỉ CREATE TABLE + ADD COLUMN, KHÔNG DROP); static SQL gate `tests/db/placement-case-invariant.test.ts` (xem §4.1 RQ-08 limitation); `npx vitest run --config vitest.unit.config.ts` (baseline full unit suite — số test lúc chạy ghi trong evidence, KHÔNG fix cứng); `npm run typecheck`. |

> Lane CRITICAL + Audit LIGHT — không được hạ. CRITICAL vì chạm identity (DEC-013) + invariant ("max 1 active PlacementCase/LaborProfile" — concurrency-safe bằng partial unique index).

| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/deliver` (Tier 1 implement trên `tier1/n1-foundation` worktree) → `/audit` (Tier 3 LIGHT theo contract) → `/resolve` (Tier 1 + Tier 0 deploy gate — KHÔNG apply lên hrp-live trong task này) |

## 1. Outcome

### 1.1 User-visible outcome

**Lớp SCHEMA của N1 foundation (CHƯA hoàn thành toàn bộ mục tiêu N1):**

- Có model `PlacementCase` đại diện cho **một đợt HRP giúp một LaborProfile tìm / đổi / tái bố trí việc** (`docs/V7/V7_ARCHITECTURE.md` §4.2).
- Mỗi `LaborProfile` có thể có NHIỀU case lịch sử nhưng **tối đa MỘT case ACTIVE** (status ∈ `OPEN`, `IN_PROGRESS`, `READY_TO_PLACE`) — enforced bằng **partial unique index** trong migration.
- Mỗi `CandidateSubmission` được gắn **nullable `placementCaseId`** — FK **ON DELETE RESTRICT** (DEC-N1-03): chặn xóa case khi còn submission liên kết; legacy rows giữ NULL.
- **KHÔNG tạo** model `Application` mới (đã cấm trong domain constitution — V6 Phase 1A).
- **KHÔNG backfill** dữ liệu sống trong task này — hàng legacy để `placementCaseId = NULL`, nhập qua intake writer thuộc task kế tiếp.
- **KHÔNG triển khai `createOrMatchLaborProfile` / intake writer** — đó là mục tiêu đầy đủ của N1 (TIER0_HANDOVER.md §N1); task này đặt nền schema để task kế tiếp build writer dùng.

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

## 3. Decisions (Tier 0 đã chốt — 12/09/2026)

| ID | Decision | Status | Note |
|---|---|---|---|
| `DEC-N1-01` | **Enum `PlacementCaseStatus` = `OPEN` \| `IN_PROGRESS` \| `READY_TO_PLACE` \| `CLOSED`**. Stage enum **CHƯA tạo** ở N1 foundation (V7 §4.2 chỉ "suggested"; defer cho task Phase sau khi có intake writer). | `CHOSEN` (Tier 0 directive 12/09/2026) | |
| `DEC-N1-02` | **Partial unique index** trên `(laborProfileId) WHERE status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')`. ACTIVE_STATUSES = 3 status trên (CLOSED không active). Concurrency-safe invariant. | `CHOSEN` (Tier 0 directive 12/09/2026) | |
| `DEC-N1-03` | **`CandidateSubmission.placementCaseId` nullable FK `ON DELETE RESTRICT` (NO ACTION)** — KHÔNG dùng SET NULL. Lý do: case là lịch sử nghiệp vụ; đóng bằng trạng thái CLOSED, KHÔNG xóa case rồi làm mất liên kết submission. Legacy rows giữ NULL (backfill ở task kế tiếp). | `CHOSEN` (Tier 0 directive 12/09/2026) | |
| `DEC-N1-04` | **Quan hệ `LaborProfile` 1 → N `PlacementCase`**. Back-relation `PlacementCase.laborProfile` FK REQUIRED (NOT NULL). Không unique trên `laborProfileId` (nhiều case lịch sử OK; partial unique index lo ACTIVE). | `CHOSEN` (theo V7 §4.2 + Tier 0 §N1) | |
| `DEC-N1-05` | **`closeReason` cột `TEXT` nullable; catalog và validation nghiệp vụ để Phase sau.** Tier 0 vẫn list "Placement failure reason catalog" pending ở §8; N1 foundation chỉ đặt cột nullable. | `CHOSEN` (Tier 0 directive 12/09/2026) | |
| `DEC-N1-06` | **Migration áp lên live**: Tier 1 chỉ commit file migration; **KHÔNG apply lên hrp-live trong task này**. Migration RLS forward-only trên `placement_case` (phạm vi nội bộ HR, không có policy public). Owner/Tier 0 sẽ deploy gate sau khi Tier 3 LIGHT audit PASS. | `CHOSEN` (cách làm) | Pattern đã có ở P1 LaborProfile schema. |
| `DEC-N1-07` | **Audit phase**: Tier 3 LIGHT bắt buộc theo TIER0_HANDOVER.md §N1 — outcome PASS tùy thuộc Tier 3 verify (a) partial unique index SQL syntax đúng với enum + ACTIVE_STATUSES; (b) ADD-only SQL preview; (c) FK ON DELETE RESTRICT đúng; (d) baseline gate không regress (đếm test lúc chạy, không fix cứng); (e) static SQL gate cover được CREATE TABLE + partial unique index, **KHÔNG chứng minh được concurrency runtime** — limitation ghi rõ trong AC; (f) không DB nào được touch. | `CHOSEN` | |

> Sau khi Tier 0 chốt 4 DEC (01, 02, 03, 05; DEC-04/06/07 đã CHOSEN từ v1.0 DRAFT), `NEED_TIER0_DECISION` còn 0 dòng → đạt tiêu chí READY_FOR_EXECUTION. Tier 1 `/deliver` trên worktree `tier1/n1-foundation` (branch mới từ HEAD lúc bắt đầu).

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Có model `PlacementCase` với các cột: `id` (cuid), `laborProfileId` (FK NOT NULL), `status` (enum), `openedAt`, `closedAt?`, `closeReason?`, `createdAt`, `updatedAt`. |
| `RQ-02` | Enum `PlacementCaseStatus` theo `DEC-N1-01`. |
| `RQ-03` | Partial unique index `(laborProfileId) WHERE status IN (ACTIVE_STATUSES)` đảm bảo invariant "max 1 active case / LaborProfile" concurrency-safe. |
| `RQ-04` | `CandidateSubmission.placementCaseId` nullable FK với `ON DELETE RESTRICT` (theo `DEC-N1-03`). Không sửa các cột khác của `CandidateSubmission`. |
| `RQ-05` | Migration ADD-only: chỉ `CREATE TABLE placement_case` + `CREATE INDEX ...` + `ALTER TABLE candidate_submissions ADD COLUMN placement_case_id ...` + constraint FK `ON DELETE RESTRICT`. KHÔNG DROP / RENAME / ALTER COLUMN TYPE. |
| `RQ-06` | Migration RLS forward-only: bật RLS + policy nội bộ HR (HR_MANAGER + HR_STAFF role), KHÔNG policy public / anon. |
| `RQ-07` | Back-relation `LaborProfile.placementCases` cho Prisma client. `PlacementCase.laborProfile` NOT NULL. |
| `RQ-08` | **Static SQL gate** cho invariant partial unique index: test trong unit lane (`tests/db/placement-case-invariant.test.ts`) đọc file migration SQL và assert (i) chứa `CREATE UNIQUE INDEX ... WHERE status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')` đúng cả 3 status; (ii) index name match convention `<table>_<column>_active_unique`; (iii) CREATE TABLE có cột `status` enum + `labor_profile_id` FK NOT NULL + `id` PK + `opened_at`/`closed_at`/`close_reason` đúng type; (iv) FK constraint `ON DELETE RESTRICT` chính xác. **Limitation RQ-08**: đây là static parse — KHÔNG chứng minh được runtime concurrency thật của PostgreSQL (race giữa 2 transaction SELECT-then-INSERT). Tier 3 LIGHT ghi limitation; concurrency thật chỉ chứng minh được bằng integration test trên DB thử nghiệm (ngoài scope unit lane — Tier 0/Owner quyết có chạy hay không ở Phase sau). |
| `RQ-09` | Không touch `ProjectAssignment` authority MP-3C; không touch `Worker`, `LaborProfile`, `EmploymentEpisode` schema. |
| `RQ-10` | Không code application logic (không service / route / UI); chỉ schema + migration + static SQL gate. |

### 4.2 Scope boundaries

- **In:** `prisma/schema.prisma` (1 enum + 1 model thêm vào cuối khối V6 Phase 1A schema); `prisma/migrations/<n1_timestamp>_n1_placement_case_foundation/migration.sql`; `prisma/migrations/<n1_timestamp_rls>_n1_placement_case_rls/migration.sql` (RLS forward-only); 1 file test `tests/db/placement-case-invariant.test.ts` (static SQL gate theo RQ-08); `docs/tasks/hrp-v6-n1-placement-case-foundation/**`.
- **Out:** Mọi API route / service / UI; `ProjectAssignment` / `Worker` / `EmploymentEpisode`; backfill legacy rows; migration ngoài 2 file trên; scripts reseed.
- **Allowed task artifacts:** `docs/tasks/hrp-v6-n1-placement-case-foundation/**` + 2 migration SQL + 1 test file.
- **Forbidden scope expansion:** KHÔNG triển khai `Placement`, `HandlingAssignment`; KHÔNG tạo `Application` model; KHÔNG thay đổi RLS matrix cho bảng cũ.

### 4.3 Domain boundaries

- **Data/state:** invariant `max 1 active PlacementCase / LaborProfile` enforced bằng partial unique index. Status ACTIVE là subset của enum (chốt tại DEC-N1-02). Close reason là TEXT nullable (không enum cứng). state machine transition CHƯA implement trong task này (chỉ có enum; transition handler thuộc task Phase sau khi có intake writer).
- **Permission/security:** RLS forward-only — policy HR_MANAGER + HR_STAFF (xem V6-P1 labor profile RLS để tham chiếu pattern). Phạm vi worker.x_internal nội bộ; KHÔNG policy public/anon.
- **Interface/API:** KHÔNG có API mới. Schema chỉ phục vụ downstream task (Placement N3, HandlingAssignment N2).
- **Migration/rollback:** ADD-only. Rollback = DROP TABLE placement_case + DROP COLUMN placement_case_id. Xem N0 §4.4.

## 5. Execution Plan

Tier 1 thực thi trên worktree `tier1/n1-foundation` (branch mới từ HEAD lúc bắt đầu STEP-01). Tier 1 KHÔNG apply migration lên hrp-live; file migration được push để Tier 3 LIGHT audit + Tier 0 deploy gate.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | HEAD tại worktree `tier1/n1-foundation` | Ghi `git rev-parse HEAD` vào `evidence/baseline.txt`. Tạo branch + worktree. | `git rev-parse HEAD`; `git worktree list` show worktree mới. | git error → fail. |
| `STEP-02` | `prisma/schema.prisma` (cuối schema, sau `EmploymentEpisode`) | Thêm enum `PlacementCaseStatus` + model `PlacementCase` + back-relations. Thêm nullable `placementCaseId` trên `CandidateSubmission`. | `npx prisma validate`; `npx prisma generate`; `git diff --stat prisma/schema.prisma` chỉ có additions (no removals). | validate FAIL → revert toàn bộ STEP. |
| `STEP-03` | Schema diff local so với baseline ghi ở STEP-01 | Sinh SQL preview `ADD-only` với `prisma migrate diff`. | `npx prisma migrate diff --from-schema-datamodel <baseline> --to-schema-datamodel <HEAD> --script > evidence/migration-preview.sql`; `grep -E "DROP TABLE\|DROP COLUMN\|RENAME\|ALTER COLUMN" evidence/migration-preview.sql` trả rỗng. | Có DROP / RENAME / ALTER COLUMN → fail STEP, escalate Tier 0. |
| `STEP-04` | `prisma/migrations/<ts>_n1_placement_case_foundation/migration.sql` | Viết CREATE TABLE placement_case + CREATE UNIQUE INDEX (partial WHERE status IN 3 ACTIVE_STATUSES) + ALTER TABLE candidate_submissions ADD COLUMN placement_case_id + FK constraint `ON DELETE RESTRICT`. SQL đồng nhất với `evidence/migration-preview.sql` (so diff). | `diff evidence/migration-preview.sql prisma/migrations/<ts>/migration.sql` chỉ chứa whitespace khác biệt; `git status --porcelain` list đúng migration file. | Không khớp preview → fail STEP. |
| `STEP-05` | `prisma/migrations/<ts>_n1_placement_case_rls/migration.sql` | Bật RLS + 1 policy HR_MANAGER + 1 policy HR_STAFF + 1 policy ADMIN short-circuit (RLS forward-only, KHÔNG DROP POLICY). | SQL tham chiếu pattern từ P1 labor profile RLS (`20260908150001_*`); `grep -c "DROP POLICY" file` = 0. | DROP POLICY → fail STEP, vi phạm forward-only. |
| `STEP-06` | `tests/db/placement-case-invariant.test.ts` (unit lane) | **Static SQL gate** — đọc 2 file migration SQL (STEP-04 + STEP-05) và assert: (i) CREATE TABLE có đủ cột enum status + FK NOT NULL labor_profile_id + id PK + opened_at/closed_at/close_reason; (ii) CREATE UNIQUE INDEX đúng WHERE clause với 3 ACTIVE_STATUSES; (iii) FK constraint `ON DELETE RESTRICT` chính xác; (iv) file RLS có `ENABLE ROW LEVEL SECURITY` và đủ 3 policy HR_MANAGER/HR_STAFF/ADMIN. **KHÔNG** dùng pg-mem, **KHÔNG** mô phỏng runtime. | `npx vitest run tests/db/placement-case-invariant.test.ts --config vitest.unit.config.ts` = 1+ tests passed; log lưu `evidence/step06-static-gate.log`. | Test FAIL → fail STEP, sửa SQL. |
| `STEP-07` | Full baseline gate (carry-forward) | Chạy full unit suite + typecheck + prisma validate. | `npx vitest run --config vitest.unit.config.ts` PASS (đếm test files + tests lúc chạy, ghi evidence — KHÔNG fix cứng); `npm run typecheck` = exit 0; `npx prisma validate` = OK; carry-forward design-tokens `npx vitest run ... src/shared/ui/design-tokens.static.test.ts` (số test ghi evidence) PASS để tránh lặp AV1 regression. | Bất kỳ gate nào regress → fail STEP. |
| `STEP-08` | Commit & push | Stage schema + 2 migration files + test + (TASK.md đã READY_FOR_EXECUTION). Push lên origin/main. | `git log --oneline -1` show commit; `git log --stat` show ≤ 4 file changed (schema + 2 migration + 1 test); commit message convention `feat(n1): foundation ...`. | Push fail → revert tag. |

> Tier 1 `/deliver` đã mở khi Status chuyển READY_FOR_EXECUTION (sau Tier 0 chốt 4 DEC). Tier 1 KHÔNG tự áp migration lên hrp-live; Owner/Tier 0 deploy gate sau khi Tier 3 LIGHT audit PASS.

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Baseline ghi `evidence/baseline.txt` = `git rev-parse HEAD` lúc STEP-01. | `cat evidence/baseline.txt`. |
| `AC-02` | `npx prisma validate` exit 0 trên `prisma/schema.prisma`. | Log lưu `evidence/step02-validate.log`. |
| `AC-03` | `npx prisma generate` exit 0; generated client chứa `PlacementCase` và enum `PlacementCaseStatus` (grep `client/index.d.ts`). | Log + grep result `evidence/step03-generate.log`. |
| `AC-04` | `evidence/migration-preview.sql` chỉ chứa `CREATE TABLE` / `CREATE INDEX` / `CREATE UNIQUE INDEX` / `CREATE POLICY` / `ALTER TABLE ... ADD COLUMN` / `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`; KHÔNG có `DROP TABLE` / `DROP COLUMN` / `RENAME` / `ALTER COLUMN ... TYPE`. | `grep -E "DROP TABLE\|DROP COLUMN\|RENAME\|ALTER COLUMN .* TYPE" evidence/migration-preview.sql` trả rỗng. |
| `AC-05` | Migration chính (`prisma/migrations/<ts>_n1_placement_case_foundation/migration.sql`): (a) `CREATE TABLE placement_case` có cột `id` (cuid PK), `labor_profile_id` (NOT NULL), `status` (PlacementCaseStatus enum), `opened_at`, `closed_at` (nullable), `close_reason` (TEXT nullable), `created_at`, `updated_at`; (b) `CREATE UNIQUE INDEX placement_case_labor_profile_id_active_unique ON placement_case (labor_profile_id) WHERE status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')` (đủ 3 status); (c) `ALTER TABLE candidate_submissions ADD COLUMN placement_case_id` (nullable); (d) FK constraint `REFERENCES placement_case(id) ON DELETE RESTRICT`; (e) `diff evidence/migration-preview.sql prisma/migrations/<ts>/migration.sql` chỉ khác whitespace. | Grep + diff evidence `evidence/step04-sql.txt`. |
| `AC-06` | Migration RLS (`prisma/migrations/<ts>_n1_placement_case_rls/migration.sql`): (a) `ALTER TABLE placement_case ENABLE ROW LEVEL SECURITY`; (b) ≥ 1 policy HR_MANAGER + ≥ 1 policy HR_STAFF + ≥ 1 policy ADMIN short-circuit; (c) `grep -c "DROP POLICY" file` = 0. | Grep evidence `evidence/step05-rls.txt`. |
| `AC-07` | Static SQL gate PASS. `npx vitest run tests/db/placement-case-invariant.test.ts --config vitest.unit.config.ts` = tất cả tests trong file passed. **Limitation ghi rõ**: static SQL parse KHÔNG chứng minh được runtime concurrency của PostgreSQL (race giữa 2 transaction). Tier 3 LIGHT ghi limitation; integration test thật 2 transaction song song chỉ chạy khi có DB thử nghiệm riêng (Owner/Tier 0 quyết Phase sau). | Log lưu `evidence/step06-static-gate.log`. |
| `AC-08` | Full baseline suite: `npx vitest run --config vitest.unit.config.ts` PASS — ghi `evidence/step07-suite.log` với **dòng cuối cùng** chứa `<N> passed (<M>)` để chứng minh đếm tại thời điểm chạy (KHÔNG fix cứng số). Thời gian hợp lý (≤ 60s). | Log lưu `evidence/step07-suite.log`. |
| `AC-09` | Typecheck: `npm run typecheck` exit 0. | Log lưu `evidence/step07-typecheck.log`. |
| `AC-10` | Carry-forward `npx vitest run ... src/shared/ui/design-tokens.static.test.ts` PASS — đếm test ghi evidence (carry-forward từ AV1 hotfix f2f3296; Tier 3 chứng minh gate tĩnh dễ regress ở task schema/UX). | Log lưu `evidence/step07-design-tokens.log`. |
| `AC-11` | Commit message theo convention `feat(n1): foundation ...`; push lên origin/main thành công; branch `tier1/n1-foundation` tạo từ baseline. | `git log --oneline -1`; `git branch --show-current`. |
| `AC-12` | Allowlist: `git diff --name-only <baseline>..HEAD` chỉ list ≤ 4 file: `prisma/schema.prisma` + 2 file `prisma/migrations/<ts>_*/migration.sql` + `tests/db/placement-case-invariant.test.ts` (TASK.md nằm trong worktree commit trước đó). | Grep output. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-02 | AC-02, AC-03, AC-05 |
| `RQ-02` | STEP-02 | AC-03, AC-05 |
| `RQ-03` | STEP-02, STEP-04 | AC-05 |
| `RQ-04` | STEP-02, STEP-04 | AC-05 |
| `RQ-05` | STEP-03, STEP-04 | AC-04, AC-05 |
| `RQ-06` | STEP-05 | AC-06 |
| `RQ-07` | STEP-02 | AC-03 |
| `RQ-08` | STEP-06 | AC-07 |
| `RQ-09` | STEP-02, STEP-08 | AC-12 |
| `RQ-10` | STEP-08 | AC-12 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | ~~Tier 0/Owner không phản hồi 5 DEC-N1-01..05~~ **RESOLVED 12/09/2026**: Tier 0 đã chốt 4 DEC. Đã unblock execution. | Tier 1 `/deliver` đã mở. |
| `RISK-02` | Migration RLS forward-only vô tình khóa public/anon path hiện tại đang đọc legacy rows. | Pattern P1 labor profile RLS đã chứng minh. Migration KHÔNG touch policy cũ. Verify bằng grep `DROP POLICY` = 0. |
| `RISK-03` | Partial unique index có syntax sai / không enforce được invariant trên PG production. | **Static SQL gate (RQ-08) chỉ verify cú pháp và cấu trúc index — KHÔNG chứng minh runtime concurrency.** Tier 0/Owner quyết có chạy integration test 2 transaction thật trên DB thử nghiệm riêng hay không. Nếu không có integration test trước deploy, risk: race giữa SELECT-then-INSERT vẫn có thể xảy ra nếu Prisma/application không đọc lại trạng thái. Tier 3 LIGHT ghi limitation; Phase sau có intake writer sẽ đóng transaction chặt hơn. |
| `RISK-04` | Carry-forward design-tokens gate bị regress do schema change trigger Prisma regen và đổi timestamp file. | AC-09 ép isolated re-run; Layer guard. |
| `RISK-05` | Tier 1 vô tình touch `ProjectAssignment` MP-3C schema. | AC-11 ép allowlist 4 file; `git diff main..HEAD --stat` check. |
| `RISK-06` | SQL preview khác file migration (do lúc viết diff có state khác). | STEP-03 yêu cầu so diff. Nếu lệch → fail STEP, regenerate preview. |

## 8. Open Questions

**RESOLVED 12/09/2026** (Tier 0 directive):
- DEC-N1-01: enum `OPEN | IN_PROGRESS | READY_TO_PLACE | CLOSED`; chưa có stage enum ở N1 foundation.
- DEC-N1-02: ACTIVE = `OPEN`, `IN_PROGRESS`, `READY_TO_PLACE`.
- DEC-N1-03: nullable FK `ON DELETE RESTRICT` (NO ACTION), không SET NULL.
- DEC-N1-05: `closeReason` TEXT nullable; catalog validation để Phase sau.

**Còn mở** (ngoài scope N1 foundation):
- Có chạy integration test 2 transaction thật trên DB thử nghiệm trước khi deploy lên hrp-live? — Tier 0/Owner quyết (xem RISK-03).
- Task kế tiếp (N1 intake writer + createOrMatchLaborProfile) — outline ở §11 dưới đây.

## 11. Note về task kế tiếp (chưa thuộc scope N1 foundation)

`TIER0_HANDOVER.md §N1` đặt outcome đầy đủ của N1 là:

> mọi intent tuyển dụng mới đi qua LaborProfile canonical và active case.
> - createOrMatchLaborProfile trả EXACT_MATCH, POSSIBLE_MATCH, NEW;
> - possible match không auto-merge;
> - LaborProfile 1 → N PlacementCase, tối đa một active case bằng invariant concurrency-safe;
> - CandidateSubmission.placementCaseId nullable; không tạo model Application mới chỉ để đổi tên;
> - General Interest có thể là case chưa có Application;
> - new writes resolve/create active case, legacy rows được phép nullable.

N1 foundation (task này) **chỉ hoàn thành lớp schema** — tức 2 mục cuối của Tier 0 §N1: invariant `max 1 active case/LaborProfile` (qua partial unique index) + `CandidateSubmission.placementCaseId` nullable + LaborProfile 1 → N PlacementCase.

Phần còn lại (createOrMatchLaborProfile, intake writer, possible-match policy, state machine transition handler) thuộc **task kế tiếp**, chưa có slug chính thức. Tier 1 đề xuất slug `hrp-v6-n1-intake-writer` (DRAFT v0.1), dựng trên schema này. Tier 0/Owner xác nhận khi N1 foundation ACCEPTED.

## 9. Planner Resolution (để trống — Tier 1 append khi close)

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | `2026-09-12 13:42` | `Tier 1` | Initial contract (DRAFT) sau N0 v1.1 ACCEPTED + AV1 hotfix f2f3296. | N0 §5.2 #1 mở next domain task. Audit LIGHT bắt buộc theo TIER0_HANDOVER.md §N1. Carry-forward bài học gate tĩnh từ AV1 regression. |
| `v1.1` | `2026-09-12 13:50` | `Tier 1` | Status `DRAFT` → `READY_FOR_EXECUTION`. Tier 0 chốt 4 DEC (01, 02, 03, 05) — bỏ "5 DEC chờ" (thực tế chỉ 4 mục còn chờ vì DEC-04/06/07 đã CHOSEN từ v1.0). DEC-N1-03 đổi FK policy SET NULL → RESTRICT (case là lịch sử nghiệp vụ). RQ-08 + STEP-06: TS-mô-phỏng → static SQL parse; limitation ghi rõ KHÔNG chứng minh runtime concurrency (cần DB thử nghiệm riêng nếu Owner quyết). Baseline không fix cứng f2f3296 — lấy tại STEP-01. AC-07/AC-10 bỏ đếm cứng 2008/2008 + 12/12, dùng đếm tại thời điểm chạy. Thêm §11 note về task kế tiếp (`hrp-v6-n1-intake-writer` slug đề xuất) — N1 foundation chỉ hoàn thành lớp schema, KHÔNG hoàn thành mục tiêu N1 đầy đủ. KHÔNG mở AV6 song song (cùng luồng schema). | Tier 0 directive 12/09/2026 chốt 4 DEC; Tier 1 `/deliver` mở trên worktree `tier1/n1-foundation`. |
