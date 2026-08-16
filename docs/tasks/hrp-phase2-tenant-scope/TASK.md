# TASK: hrp-phase2-tenant-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase2-tenant-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Status | `DRAFT` — chờ `hrp-phase1-identity-core` ACCEPTED và quyết định tách credential runtime/ETL tại DEC-09 trước khi chuyển `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — bên ngoài, do sếp giao (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3) |
| Auditor | Tier 3 — bên ngoài, do sếp giao (độc lập với Tier 2) |
| Baseline | `dc3e772` (main 16/08/2026 — `hrp-phase1-identity-core` ACCEPTED; bcc-fence `4a3a0fe` nằm trong tổ tiên) |
| Modules | Phase 2 Tenant Scope — migration RLS dev; DB roles; `src/shared/auth/{with-db-context,rls-context,scopes/*.scope,worker-projection,with-auth-scope}.ts`; `app/api/workers/*`; tests; runbook production |
| ADR references | `docs/PHASE_KHOAHOC_V1.md` §4 Phase 2; `docs/data-scope-security.md` §1.2, §5-§6; G22 root bất khả tước; DEC-08 (RLS production hoãn tới trước Phase 4) |
| Current execution round | 1 |
| Current audit round | 0 (chưa audit) |
| Next gate | identity-core ACCEPTED + DEC-09 chốt → cập nhật Baseline → `/code hrp-phase2-tenant-scope` → `/audit` → `/resolve` → ACCEPTED |
| Updated | 2026-08-16 19:55 ICT |

## 1. Outcome

### User-visible outcome

- ADMIN vẫn thấy toàn bộ Worker và trường nhạy cảm theo feature permission.
- HR_STAFF, SALE, PM, VENDOR, CTV, WORKER chỉ nhận được rows thuộc scope đúng theo visibility matrix.
- Worker chỉ thấy hồ sơ của mình; người thiếu `CAN_VIEW_WORKER_SENSITIVE` nhận `***` ở 7 trường nhạy cảm, không nhận plaintext.
- Mọi query HTTP đi qua cả **L1 Prisma scope** và **L2 PostgreSQL RLS**; query/raw SQL ngoài scope không được dùng để đọc vượt quyền.
- appBCC tiếp tục có quyền ETL tối thiểu qua **credential ETL riêng**, không làm web runtime mất RLS.

### Non-goals

- KHÔNG tạo permission-catalog, resolver, AuthContext, login/JWT/cookie, hay thay stub tickets — thuộc `hrp-phase1-identity-core`.
- KHÔNG tạo UI vertical slice mới; `/api/workers*` chỉ là route demo/exit criteria Phase 2.
- KHÔNG RLS/migration/UNIQUE trên `portal_timesheets`; bảng này và UNIQUE thuộc identity-core / contract appBCC.
- KHÔNG outbox, audit log, idempotency table, state machine — Phase 3.
- KHÔNG áp RLS lên Neon production trong task này; production áp trước Phase 4 theo runbook được tạo ở STEP-10.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/schema.prisma:105-262, 326-353, 469-527` | Có 13 `SystemRole`, `Worker.accountUserId`, FK owner/assignee/account/PM và indexes cần relation scope | Không đổi Prisma model; Phase 2 chỉ thêm DDL RLS/roles và code scope |
| `EV-02` | `docs/data-scope-security.md` §1.2, §5.2-§5.7, §6 | Canonical là 2 lớp: L1 `withAuthScope`, L2 RLS; GUC bắt buộc transaction-local; masking ở application | Khóa interface L1/L2, ma trận role và checklist chống leak |
| `EV-03` | `appBCC/app.py:227`; `appBCC/core_pipeline.py:305-519` | appBCC hiện lấy `DATABASE_URL` và thao tác DB qua SQLAlchemy | Không được cấp exemption `hrp_etl` cho cùng DB role web runtime; phải tách credential trước khi L2 có ý nghĩa bảo mật |
| `EV-04` | `docs/PHASE_KHOAHOC_V1.md:112-134` | DoD Phase 2 = 13 role × 4 bảng = 52 case; `SET LOCAL`, không `SET ROLE`; production RLS phải có runbook/rollback | RQ-03..09 và AC-03..09 phải đo được các invariant này |
| `EV-05` | `docs/tasks/hrp-phase1-identity-core/TASK.md:60-68, 83-87` | identity-core sở hữu AuthContext, permission, deny-by-default extension, ticket stub removal và UNIQUE portal_timesheets | Loại toàn bộ scope trùng khỏi Task này; task chỉ nối builders vào extension đã ACCEPTED |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | L1/L2 phân ranh: identity-core tạo `with-auth-scope.ts` dạng deny-by-default + AuthContext; task này chỉ thêm builders tường minh và nối vào extension, sau đó dựng L2 RLS | Planner; EV-02/05 | CHỐT |
| `DEC-02` | CHOSEN | RLS dùng `set_config(..., true)` trong transaction cho `app.user_id`, `app.role`, `app.vendor_id`, `app.worker_id`; **cấm `SET ROLE`** và cấm GUC session-global | PHASE_KHOAHOC §4; EV-02/04 | CHỐT |
| `DEC-03` | CHOSEN | L2 dev tạo runtime roles `app_user` (read) và `app_user_writer` (write), không `BYPASSRLS`, không table-owner. Các policy `FORCE ROW LEVEL SECURITY` áp dụng cho runtime role này | Planner; EV-02 | CHỐT |
| `DEC-04` | CHOSEN | 3 migration dev: `s1_rls_worker` (workers + bảng con theo worker), `s1_rls_project` (outsourcing_projects + tables theo project), `s1_rls_vendor` (vendors, candidate_submissions, vendor_statements + lines) | Planner; EV-01/02 | CHỐT |
| `DEC-05` | CHOSEN | `worker-projection.ts` che `cccdNumber`, `cccdImageUrl`, `selfieImageUrl`, `cccdChipData`, `bankAccount`, `bankName`, `bankBranch` thành `***` nếu effective permission thiếu `CAN_VIEW_WORKER_SENSITIVE` | Planner; data-scope-security §2 | CHỐT |
| `DEC-06` | CHOSEN | Matrix bắt buộc: 13 role × 4 bảng `Worker`, `Project`, `Ticket`, `VendorStatement` = 52 case. Mỗi case assert row-set và field projection; thêm integration L2 với hai transaction role khác nhau | PHASE_KHOAHOC §4; EV-04 | CHỐT |
| `DEC-07` | CHOSEN | Route demo: `GET /api/workers` (list scoped) và `GET /api/workers/me` (chỉ role WORKER; role khác 403). Mọi query chạy qua `withDbContext` + extended Prisma client | Planner; PHASE_KHOAHOC exit criteria | CHỐT |
| `DEC-08` | CHOSEN | **RLS production hoãn tới trước Phase 4**. Task này chỉ áp/verify trên `DATABASE_URL_DEV` và bàn giao runbook production + rollback đã dry-run trên dev; tuyệt đối không đụng Neon main | Sếp chốt 16/08 | CHỐT |
| `DEC-09` | NEED_USER_DECISION | Cách cấp credential riêng cho appBCC ETL: (A) tạo `APPBCC_DATABASE_URL` role `hrp_etl` riêng, còn web chuyển sang `APP_DATABASE_URL` role `app_user_writer`; hoặc (B) hoãn toàn bộ L2 RLS, chỉ làm L1 builders/masking cho đến khi tách được. **Cấm** cho role web runtime làm member `hrp_etl` | Planner; EV-03 | CHỜ — ảnh hưởng RQ-01, STEP-01..04, AC-01..03 |
| `DEC-10` | ASSUMPTION | identity-core seed `CAN_VIEW_WORKER_SENSITIVE`, `CAN_VIEW_UNASSIGNED_POOL` và interface `withAuthScope` theo đúng TASK identity-core | Planner | Hết hiệu lực khi identity-core ACCEPTED |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Tách credential/DB role web runtime và appBCC ETL theo DEC-09; runtime roles không owner, không BYPASSRLS, không là member `hrp_etl` | Must | DEC-03/09 | Không tách được → dừng L2 RLS, báo BLOCKED; không dùng exemption chung |
| `RQ-02` | 3 migration RLS dev theo DEC-04, `FORCE ROW LEVEL SECURITY`, policy đúng 13-role matrix; không chạm `portal_timesheets` | Must | DEC-02/04 | Apply/policy fail → rollback dev, không chuyển bước |
| `RQ-03` | `with-db-context.ts` + `rls-context.ts` set đầy đủ 4 GUC bằng `set_config(..., true)` trong transaction; kiểm thử không leak giữa transactions | Must | DEC-02 | Leak/SET ROLE = fail |
| `RQ-04` | `scopes/{worker,project,vendor,ctv}.scope.ts` có builders tường minh theo matrix; nối vào with-auth-scope; model thiếu builder vẫn deny-by-default | Must | DEC-01/06 | Row ngoài scope hoặc silent empty sai quy ước = fail |
| `RQ-05` | `worker-projection.ts` áp masking 7 trường theo DEC-05 | Must | DEC-05 | Plaintext khi thiếu quyền = fail |
| `RQ-06` | `GET /api/workers` và `/api/workers/me` dùng AuthContext, withDbContext, L1 extension, projection; không JWT 401; `/me` role không phải WORKER 403 | Must | DEC-07 | Sai 401/403/row-set = fail |
| `RQ-07` | 52/52 matrix + L2 two-transaction integration + checklist chống leak §5.7 PASS | Must | DEC-06; data-scope-security §5.7 | Bất kỳ case fail = chặn bàn giao |
| `RQ-08` | `npm run build` và toàn bộ `vitest run` PASS; không `.only`/skip sót | Must | global rules §4 | Fail = chặn bàn giao |
| `RQ-09` | Soạn runbook production RLS trước Phase 4: preflight, apply order, verification appBCC, rollback <5 phút; dry-run rollback trên dev; production không thay đổi | Must | DEC-08 | Runbook thiếu/dry-run fail = chặn bàn giao |
| `RQ-10` | Không sửa/commit `app/bcc/*`, `appBCC/*`, `app/job-board/*`; không credential, token, PII thật trong source/evidence; chỉ stage file task | Must | global rules §3, §5 | Audit block |

### 4.2 Scope boundaries

**In scope:**

- Migration RLS dev và DB roles theo DEC-09.
- `src/shared/auth/with-db-context.ts`, `rls-context.ts`, `scopes/{worker,project,vendor,ctv}.scope.ts`, `worker-projection.ts`, sửa tối thiểu `with-auth-scope.ts` để đăng ký builders.
- `app/api/workers/route.ts`, `app/api/workers/me/route.ts`.
- Unit/integration tests và runbook production trong chính task directory.

**Out of scope:**

- Login/JWT/cookie/auth endpoints/middleware/JWT helper và ticket stub replacement — identity-core.
- `app/bcc/*`, `appBCC/*`, `app/job-board/*`, `portal_timesheets`.
- Prisma model/schema fields; outbox/audit/idempotency/state machine; Phase 4 UI.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** RLS/roles là DDL dev; không đổi Prisma schema/model, không xóa/chỉnh dữ liệu thật. `portal_timesheets` không thuộc task này.
- **State:** không đổi bất kỳ business state machine nào.
- **Permission/data scope:** feature permission từ identity-core và data scope task này phải cùng pass. Policy/extension ngoài scope không được trả row; model chưa có builder phải throw theo deny-by-default.
- **Interface:** `/api/workers` trả list đã scope và projection; `/api/workers/me` chỉ WORKER. Không để API client truyền userId/role để tự chọn scope.
- **Failure/idempotency/concurrency:** transaction ngắn; `set_config(..., true)` only; RLS không thay idempotency Phase 3.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | DB dev + appBCC config (read-only survey) | Khảo sát role/web URL/ETL URL hiện hữu, quyền cần của appBCC; thực hiện phương án DEC-09 đã chốt hoặc báo BLOCKED nếu chưa thể tách | identity-core ACCEPTED; DEC-09 | Catalog query read-only, evidence mask | Không có role/credential separation hợp lệ → dừng trước migration L2 |
| `STEP-02` | RQ-02 | `prisma/migrations/*_s1_rls_worker` | Worker policies, child tables theo worker, FORCE RLS, runtime grants tối thiểu | STEP-01 | migrate dev + policy smoke 2 role | Apply/policy fail |
| `STEP-03` | RQ-02 | `prisma/migrations/*_s1_rls_project` | Project/staffing/site policies theo matrix | STEP-02 | migrate dev + PM/public smoke | Apply/policy fail |
| `STEP-04` | RQ-02 | `prisma/migrations/*_s1_rls_vendor` | Vendor/submission/statement/line policies theo matrix | STEP-03 | migrate dev + vendor scope smoke | Apply/policy fail |
| `STEP-05` | RQ-03 | `with-db-context.ts`, `rls-context.ts` | Transaction helper + 4 GUC SET LOCAL, test no-leak | STEP-04 | vitest transaction tests | Test fail/grep có SET ROLE |
| `STEP-06` | RQ-04 | `scopes/*.scope.ts`, `with-auth-scope.ts` | Builders tường minh + register extension, retain deny-by-default | STEP-05 | unit tests per role/model | Row outside scope / missing-builder no throw |
| `STEP-07` | RQ-05 | `worker-projection.ts` | Projection/masking 7 fields theo effective permission | STEP-06 | vitest plaintext vs `***` | Mask leak |
| `STEP-08` | RQ-06 | `app/api/workers/*` | Hai route demo qua AuthContext + L1 + withDbContext + projection | STEP-05..07 | curl matrix masked | Incorrect 401/403/row-set |
| `STEP-09` | RQ-07..08 | Tests + build | 52 matrix, L2 integration, §5.7, full test/build | STEP-06..08 | all PASS | Any fail |
| `STEP-10` | RQ-09..10 | `docs/tasks/hrp-phase2-tenant-scope/` | Runbook production + rollback dry-run dev; update HANDOFF with real masked evidence; no production migration | DEC-08 | runbook review + dry-run log | Missing/dangerous runbook or production changed |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Web runtime DB role không owner/BYPASSRLS/member `hrp_etl`; appBCC chỉ dùng credential ETL riêng và có grants tối thiểu | Read-only role/grant checks | Commands + masked role names/outputs | Yes |
| `AC-02` | RQ-02 | 3 migration chỉ áp trên dev, sạch, `FORCE RLS` đúng bảng phạm vi, không chạm `portal_timesheets` | Prisma migrate + catalog query | Command, exit code, migration status | Yes |
| `AC-03` | RQ-03 | Bốn GUC tồn tại trong transaction và không leak qua transaction khác; grep không có `SET ROLE` | vitest + grep | Test output | Yes |
| `AC-04` | RQ-04 | Builders tạo đúng row scope theo role; model thiếu builder throw deny-by-default | vitest | Unit output | Yes |
| `AC-05` | RQ-05 | Role thiếu permission nhận `***` ở đủ 7 trường; role có permission nhận value fixture không phải PII thật | vitest | Test output | Yes |
| `AC-06` | RQ-06 | `/api/workers`: 401 không JWT; `/api/workers/me`: WORKER đúng một row, role khác 403; API không tin role/userId từ client | curl dev | Command + masked output | Yes |
| `AC-07` | RQ-07 | 52/52 role × table PASS và L2 two-transaction test cho row-set khác nhau | vitest | Output `52 passed` + integration output | Yes |
| `AC-08` | RQ-07 | Checklist §5.7 PASS: findUnique/count/aggregate/updateMany/deleteMany scope, raw SQL rule, nested write, export, vendorId missing throw | Test + grep | Evidence mapping từng mục | Yes |
| `AC-09` | RQ-08 | `npm run build` exit 0 và toàn bộ `vitest run` PASS, không skip/only | Command | Log + exit code | Yes |
| `AC-10` | RQ-09..10 | Runbook production + rollback dev dry-run PASS; `migrate status` Neon main không đổi; diff vùng cấm rỗng; không PII/credential thật | Review + commands + git diff/grep | Runbook, dry-run log, status, diff/grep | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02, STEP-03, STEP-04` | `AC-02` |
| `RQ-03` | `STEP-05` | `AC-03` |
| `RQ-04` | `STEP-06` | `AC-04, AC-08` |
| `RQ-05` | `STEP-07` | `AC-05` |
| `RQ-06` | `STEP-08` | `AC-06` |
| `RQ-07` | `STEP-09` | `AC-07, AC-08` |
| `RQ-08` | `STEP-09` | `AC-09` |
| `RQ-09` | `STEP-10` | `AC-10` |
| `RQ-10` | `STEP-01..10` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Web runtime shares ETL exemption, making L2 RLS ineffective | DEC-09 survey shows same role/member | Hard block RQ-01; split credential or defer L2 | Do not apply RLS; retain current Phase 1 fence |
| `RISK-02` | Incorrect policy hides/leaks rows | Matrix/integration fails | 52 cases + L1/L2 independent tests | Dev rollback: drop policies then disable RLS only on Phase 2 tables |
| `RISK-03` | GUC/session role leak through pool | SET ROLE/global setting or cross-tx test failure | SET LOCAL only + AC-03 | Revert helper, re-run tests |
| `RISK-04` | appBCC ETL fails after role separation | ETL smoke fails dev | Minimum grants + dev ETL smoke before HANDOFF | Restore ETL grants; do not relax web runtime role |
| `RISK-05` | Production changed despite DEC-08 | Neon main migration status differs | Explicit AC-10 block and read-only production verification | Stop; use runbook rollback and report immediately |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | DEC-09: sếp chọn (A) tách `APP_DATABASE_URL` / `APPBCC_DATABASE_URL` với role riêng, hay (B) defer L2 RLS và chỉ triển khai L1 builders/masking? | Sếp | Trước khi `READY_FOR_EXECUTION` | Yes |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Initial Phase 2 contract | Sếp yêu cầu viết Phase 2 |
| `v1.1` | 2026-08-16 | DEC-08: production RLS hoãn tới trước Phase 4 | Sếp chốt phương án B |
| `v1.2` | 2026-08-16 | Planner revision sau rà soát: bỏ traceability/RQ sai, bỏ scope ticket/UNIQUE trùng identity-core, khôi phục DEC-08 B, thêm hard gate tách role credential web/ETL (DEC-09), sửa RQ→STEP→AC đầy đủ | Rà soát theo yêu cầu sếp |
| `v1.2b` | 2026-08-16 | Cập nhật Baseline `dc3e772` sau khi `hrp-phase1-identity-core` ACCEPTED (audit round 2 PASS). Không đổi contract sản phẩm | Gate identity-core closed |
