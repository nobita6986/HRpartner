# TASK: hrp-phase2-tenant-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase2-tenant-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.4` |
| Status | `REVISION_REQUIRED` — Round 2 (AUD-001 fix tên bảng HANDOFF; AUD-002 STEP-10 runbook + dry-run; PLN-001 1 dòng env appBCC theo DEC-09 A; KHÔNG đụng file dirty `appBCC/*` của sếp) |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — bên ngoài, do sếp giao (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3) |
| Auditor | Tier 3 — bên ngoài, do sếp giao (độc lập với Tier 2) |
| Baseline | `dc3e772` (main 16/08/2026 — `hrp-phase1-identity-core` ACCEPTED; bcc-fence `4a3a0fe` nằm trong tổ tiên) |
| Modules | Phase 2 Tenant Scope — migration RLS dev; DB roles; `src/shared/auth/{with-db-context,rls-context,scopes/*.scope,worker-projection,with-auth-scope}.ts`; `app/api/workers/*`; `prisma/schema.prisma` (chỉ dòng `directUrl` datasource — không đổi model); `appBCC/app.py` (duy nhất 1 dòng env `DATABASE_URL` → `APPBCC_DATABASE_URL` theo DEC-09 A); tests; runbook production |
| ADR references | `docs/PHASE_KHOAHOC_V1.md` §4 Phase 2; `docs/data-scope-security.md` §1.2, §5-§6; G22 root bất khả tước; DEC-08 (RLS production hoãn tới trước Phase 4) |
| Current execution round | 2 (remediation — đang mở) |
| Current audit round | 1 (verdict CONDITIONAL — 9/10 AC PASS, AC-10 PARTIAL) |
| Next gate | `/code hrp-phase2-tenant-scope` (remediation) → `/audit` (round 2) → `/resolve` → ACCEPTED |
| Updated | 2026-08-16 22:10 ICT |

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
| `DEC-09` | CHOSEN | **Phương án A (sếp chốt 16/08):** tách credential web/ETL ở dev — web runtime dùng `DATABASE_URL` repoint về role `app_user_writer` (không superuser/owner/BYPASSRLS, không member `hrp_etl`); `prisma migrate` dùng `directUrl = env("DATABASE_URL_ADMIN")` (admin string hiện tại, giữ quyền DDL cho migration engine); appBCC ETL dùng `APPBCC_DATABASE_URL` (role `hrp_etl`, grants tối thiểu theo khảo sát STEP-01). Production Vercel/Neon main KHÔNG đổi trong task này (DEC-08) — việc chuyển Vercel sang role restricted nằm trong runbook trước Phase 4. **Cấm** cho role web runtime làm member `hrp_etl` | Sếp chốt 16/08; Planner; EV-03 | CHỐT |
| `DEC-10` | ASSUMPTION | identity-core seed `CAN_VIEW_WORKER_SENSITIVE`, `CAN_VIEW_UNASSIGNED_POOL` và interface `withAuthScope` theo đúng TASK identity-core | Planner | Hết hiệu lực khi identity-core ACCEPTED |
| `DEC-11` | CHOSEN | 🚫 **KHÔNG tạo lại bộ đăng nhập/JWT/cookie/register/endpoint auth mới** (lưu ý sếp 16/08). Tái sử dụng toàn bộ identity-core: `jwt.ts`, `auth-context.ts`, `require-permission.ts`, `with-auth-scope.ts`, `app/api/auth/*`, `app/api/me`, `middleware.ts`, cookie `hrp_token`. Tier 2 chỉ ĐỌC và gọi các module này | Sếp lưu ý 16/08 | CHỐT — vi phạm = audit BLOCK |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Tách credential/DB role web runtime và appBCC ETL theo DEC-09 A: dev `DATABASE_URL` → role `app_user_writer` (không owner/BYPASSRLS/member `hrp_etl`); datasource thêm `directUrl = env("DATABASE_URL_ADMIN")` để migrate giữ quyền DDL; appBCC đổi 1 dòng env sang `APPBCC_DATABASE_URL` (role `hrp_etl`, grants tối thiểu) | Must | DEC-03/09 | Không tách được → dừng L2 RLS, báo BLOCKED; không dùng exemption chung |
| `RQ-02` | 3 migration RLS dev theo DEC-04, `FORCE ROW LEVEL SECURITY`, policy đúng 13-role matrix; không chạm `portal_timesheets` | Must | DEC-02/04 | Apply/policy fail → rollback dev, không chuyển bước |
| `RQ-03` | `with-db-context.ts` + `rls-context.ts` set đầy đủ 4 GUC bằng `set_config(..., true)` trong transaction; kiểm thử không leak giữa transactions | Must | DEC-02 | Leak/SET ROLE = fail |
| `RQ-04` | `scopes/{worker,project,vendor,ctv}.scope.ts` có builders tường minh theo matrix; nối vào with-auth-scope; model thiếu builder vẫn deny-by-default | Must | DEC-01/06 | Row ngoài scope hoặc silent empty sai quy ước = fail |
| `RQ-05` | `worker-projection.ts` áp masking 7 trường theo DEC-05 | Must | DEC-05 | Plaintext khi thiếu quyền = fail |
| `RQ-06` | `GET /api/workers` và `/api/workers/me` dùng AuthContext, withDbContext, L1 extension, projection; không JWT 401; `/me` role không phải WORKER 403 | Must | DEC-07 | Sai 401/403/row-set = fail |
| `RQ-07` | 52/52 matrix + L2 two-transaction integration + checklist chống leak §5.7 PASS | Must | DEC-06; data-scope-security §5.7 | Bất kỳ case fail = chặn bàn giao |
| `RQ-08` | `npm run build` và toàn bộ `vitest run` PASS; không `.only`/skip sót | Must | global rules §4 | Fail = chặn bàn giao |
| `RQ-09` | Soạn runbook production RLS trước Phase 4: preflight, apply order, verification appBCC, rollback <5 phút; dry-run rollback trên dev; production không thay đổi | Must | DEC-08 | Runbook thiếu/dry-run fail = chặn bàn giao |
| `RQ-10` | Không sửa/commit `app/bcc/*`, `appBCC/*` (ngoại trừ 1 dòng env `DATABASE_URL` → `APPBCC_DATABASE_URL` trong `appBCC/app.py` theo DEC-09 A), `app/job-board/*`; không tạo endpoint/login/JWT/cookie/register/auth middleware mới (DEC-11); không credential, token, PII thật trong source/evidence; chỉ stage file task | Must | global rules §3, §5; DEC-11 | Audit block |

### 4.2 Scope boundaries

**In scope:**

- Migration RLS dev và DB roles theo DEC-09.
- `src/shared/auth/with-db-context.ts`, `rls-context.ts`, `scopes/{worker,project,vendor,ctv}.scope.ts`, `worker-projection.ts`, sửa tối thiểu `with-auth-scope.ts` để đăng ký builders.
- `app/api/workers/route.ts`, `app/api/workers/me/route.ts`.
- `prisma/schema.prisma` — CHỈ thêm dòng `directUrl` trong datasource block (DEC-09 A); không đổi model/field.
- `appBCC/app.py` — CHỈ đổi 1 dòng env `DATABASE_URL` → `APPBCC_DATABASE_URL` (DEC-09 A); không đổi logic.
- Unit/integration tests; runbook production là section trong `HANDOFF.md` (Tier 2 sở hữu — không tạo file phụ).

**Out of scope:**

- Login/JWT/cookie/auth endpoints/middleware/JWT helper và ticket stub replacement — identity-core.
- `app/bcc/*`, `app/job-board/*`, `portal_timesheets`.
- `appBCC/*` ngoại trừ 1 dòng env nêu trên — mọi logic appBCC khác là vùng cấm.
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
| `STEP-01` | RQ-01 | DB dev + appBCC config (read-only survey) | Khảo sát role/web URL/ETL URL hiện hữu, quyền cần của appBCC; thực hiện tách credential theo DEC-09 A hoặc báo BLOCKED nếu chưa thể tách | identity-core ACCEPTED; DEC-09 | Catalog query read-only, evidence mask; smoke `prisma migrate` qua `directUrl` vẫn chạy + runtime role bị RLS áp dụng | Không có role/credential separation hợp lệ → dừng trước migration L2 |
| `STEP-02` | RQ-02 | `prisma/migrations/*_s1_rls_worker` | Worker policies, child tables theo worker, FORCE RLS, runtime grants tối thiểu | STEP-01 | migrate dev + policy smoke 2 role | Apply/policy fail |
| `STEP-03` | RQ-02 | `prisma/migrations/*_s1_rls_project` | Project/staffing/site policies theo matrix | STEP-02 | migrate dev + PM/public smoke | Apply/policy fail |
| `STEP-04` | RQ-02 | `prisma/migrations/*_s1_rls_vendor` | Vendor/submission/statement/line policies theo matrix | STEP-03 | migrate dev + vendor scope smoke | Apply/policy fail |
| `STEP-05` | RQ-03 | `with-db-context.ts`, `rls-context.ts` | Transaction helper + 4 GUC SET LOCAL, test no-leak | STEP-04 | vitest transaction tests | Test fail/grep có SET ROLE |
| `STEP-06` | RQ-04 | `scopes/*.scope.ts`, `with-auth-scope.ts` | Builders tường minh + register extension, retain deny-by-default | STEP-05 | unit tests per role/model | Row outside scope / missing-builder no throw |
| `STEP-07` | RQ-05 | `worker-projection.ts` | Projection/masking 7 fields theo effective permission | STEP-06 | vitest plaintext vs `***` | Mask leak |
| `STEP-08` | RQ-06 | `app/api/workers/*` | Hai route demo qua AuthContext + L1 + withDbContext + projection | STEP-05..07 | curl matrix masked | Incorrect 401/403/row-set |
| `STEP-09` | RQ-07..08 | Tests + build | 52 matrix, L2 integration, §5.7, full test/build | STEP-06..08 | all PASS | Any fail |
| `STEP-10` | RQ-09..10 | `HANDOFF.md` (section runbook production) | Runbook production + rollback dry-run dev; update HANDOFF with real masked evidence; no production migration | DEC-08 | runbook review + dry-run log | Missing/dangerous runbook or production changed |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Web runtime DB role không owner/BYPASSRLS/member `hrp_etl`; appBCC chỉ dùng credential ETL riêng và có grants tối thiểu; `prisma migrate` qua `directUrl` (admin) vẫn exit 0 | Read-only role/grant checks + migrate smoke | Commands + masked role names/outputs | Yes |
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
| `RISK-01` | Web runtime shares ETL exemption, making L2 RLS ineffective | STEP-01 survey shows same role/member | Hard block RQ-01; tách credential theo DEC-09 A (đã chốt) — runtime không member `hrp_etl` | Do not apply RLS; retain current Phase 1 fence |
| `RISK-02` | Incorrect policy hides/leaks rows | Matrix/integration fails | 52 cases + L1/L2 independent tests | Dev rollback: drop policies then disable RLS only on Phase 2 tables |
| `RISK-03` | GUC/session role leak through pool | SET ROLE/global setting or cross-tx test failure | SET LOCAL only + AC-03 | Revert helper, re-run tests |
| `RISK-04` | appBCC ETL fails after role separation | ETL smoke fails dev | Minimum grants + dev ETL smoke before HANDOFF | Restore ETL grants; do not relax web runtime role |
| `RISK-05` | Production changed despite DEC-08 | Neon main migration status differs | Explicit AC-10 block and read-only production verification | Stop; use runbook rollback and report immediately |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | ~~DEC-09: sếp chọn (A) tách `APP_DATABASE_URL` / `APPBCC_DATABASE_URL` với role riêng, hay (B) defer L2 RLS và chỉ triển khai L1 builders/masking?~~ → **ĐÃ CHỐT: A** — tách credential web/ETL; wiring chi tiết trong DEC-09 v1.3 | Sếp — chốt 16/08 | Đã đóng | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | AUD-001 | ACCEPT_FIX | HANDOFF §5.2 (và §3 mô tả migration) sai tên bảng: `project_skill_requirements` + `vendor_members` không tồn tại — schema thật chỉ 13 bảng Phase 2 (Tier 3 đã kiểm `pg_class`). Tier 2 sửa văn bản đối chiếu đúng 13 bảng thật (3 chính + 10 còn lại). | None | Tier 2 (Round 2) |
| 1 | AUD-002 | ACCEPT_FIX | AC-10 must-gate: runbook production + dry-run rollback dev phải có evidence thật trong HANDOFF body (STEP-10 PENDING). Không chấp nhận đóng task khi thiếu. | None | Tier 2 (Round 2) |
| 1 | AUD-003 | CLOSED | `tx.$extends is not a function` đã fix tại route (`withDbContext` + SCOPE_REGISTRY); grep 0 hit runtime. Ghi nhận, không patch thêm. | None | Đã đóng |
| 1 | Q3 (appBCC dirty) | REJECT (giữ nguyên) | Diff working tree `appBCC/agent_mapper.py` (model deepseek-chat + timeout) + `appBCC/app.py` (icon path/threading) tồn tại TRƯỚC task — là việc song song của sếp; commit `7d2803b` KHÔNG chứa appBCC → Tier 2 không commit nhầm. Tier 2 KHÔNG stage/revert/đụng 2 file này; chỉ cam kết commit round 2 không chứa appBCC. **Sửa quyết định REJECT_CHANGE trước đó của lượt xử lý sơ bộ — revert sẽ phá việc sếp.** | None | Tier 2 (Round 2) |
| 1 | PLN-001 (Planner tự xác minh) | ACCEPT_FIX | **DEC-09 A phần appBCC CHƯA thực thi:** `appBCC/app.py:227` vẫn đọc `DATABASE_URL` (grep 5 hit), commit `7d2803b` không có appBCC, HANDOFF §3 không liệt kê file này. RQ-01/AC-01 chỉ mới đạt phần role DB; phần "appBCC chỉ dùng credential ETL riêng" chưa có. Tier 2 round 2 đổi ĐÚNG 1 dòng env load DB chính → `APPBCC_DATABASE_URL`, evidence grep trước/sau + ghi vào HANDOFF §3/§5. | None | Tier 2 (Round 2) |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Initial Phase 2 contract | Sếp yêu cầu viết Phase 2 |
| `v1.1` | 2026-08-16 | DEC-08: production RLS hoãn tới trước Phase 4 | Sếp chốt phương án B |
| `v1.2` | 2026-08-16 | Planner revision sau rà soát: bỏ traceability/RQ sai, bỏ scope ticket/UNIQUE trùng identity-core, khôi phục DEC-08 B, thêm hard gate tách role credential web/ETL (DEC-09), sửa RQ→STEP→AC đầy đủ | Rà soát theo yêu cầu sếp |
| `v1.2b` | 2026-08-16 | Cập nhật Baseline `dc3e772` sau khi `hrp-phase1-identity-core` ACCEPTED (audit round 2 PASS). Không đổi contract sản phẩm | Gate identity-core closed |
| `v1.3` | 2026-08-16 | DEC-09 **CHỐT A** (sếp quyết định 16/08): tách credential web/ETL — dev `DATABASE_URL` → `app_user_writer`, migrate qua `directUrl` (`DATABASE_URL_ADMIN`), appBCC 1 dòng env → `APPBCC_DATABASE_URL` (`hrp_etl`); production không đổi (DEC-08). Mở ngoại lệ duy nhất cho `appBCC/app.py` + dòng `directUrl` datasource. Q-01 đóng; Status `READY_FOR_EXECUTION` | Sếp chốt A; Planner khóa wiring migrate/runtime |
| `v1.4` | 2026-08-16 | Làm lại tài liệu theo tier1.md + 01-planner-rules: **bỏ `PROMPT_TIER2.md`** (mô hình artifact tối giản — Tier 1 chỉ tạo TASK.md, giao việc bằng lệnh `/code`); đưa cảnh báo chống tái tạo login/JWT vào contract (DEC-11 + RQ-10); runbook production chuyển thành section trong `HANDOFF.md` (không file phụ). Không đổi sản phẩm | Sếp yêu cầu làm lại tài liệu theo chuẩn pipeline |
| `v1.4` | 2026-08-16 | **Planner Resolution audit round 1** (verdict CONDITIONAL — 9/10 AC PASS, AC-10 PARTIAL): AUD-001/002 ACCEPT_FIX → Tier 2 round 2; AUD-003 CLOSED; Q3 REJECT giữ nguyên (file dirty `appBCC/*` là việc sếp — cấm revert, **sửa quyết định sơ bộ REJECT_CHANGE**); **PLN-001** — Planner tự grep phát hiện 1 dòng env `APPBCC_DATABASE_URL` của DEC-09 A chưa thực thi. Status → `REVISION_REQUIRED` round 2; giữ Spec v1.4 (lỗi thực thi, không đổi contract) | AUDIT.md round 1 (Tier 3, 16/08/2026 21:37) |
