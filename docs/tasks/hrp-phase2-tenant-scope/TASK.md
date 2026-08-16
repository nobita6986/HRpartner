# TASK: hrp-phase2-tenant-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase2-tenant-scope` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `DRAFT` — chờ dependency identity-core ACCEPTED (Baseline cập nhật xong là chuyển READY_FOR_EXECUTION) |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — bên ngoài, do sếp giao (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3; quy ước 16/08) |
| Auditor | Tier 3 — bên ngoài, do sếp giao (độc lập với Tier 2) |
| Baseline | `f382c8d` (main 16/08/2026) — **sẽ cập nhật thành commit ACCEPTED của `hrp-phase1-identity-core` trước khi READY_FOR_EXECUTION** |
| Modules | Phase 2 Tenant Scope — chạm: `prisma/migrations/*` (3 migration RLS mới), `src/shared/auth/{with-db-context,rls-context}.ts` (mới), `src/shared/auth/scopes/*.scope.ts` (mới), `src/shared/auth/worker-projection.ts` (mới), `src/shared/auth/with-auth-scope.ts` (nối builders — đã có từ identity-core), `app/api/workers/*` (mới), tests |
| ADR references | **PHASE_KHOAHOC_V1.md §4 Phase 2** (invariant + DoD); **`docs/data-scope-security.md` §5.2-5.3** (ma trận scope), **§5.7** (checklist chống rò rỉ), **§6** (RLS + GUC); **D13** (backbone invariant), **DEC-30/31** (monorepo paths / drift recovery); G22 (root bất khả tước) |
| Current execution round | 1 |
| Current audit round | 0 (chưa audit) |
| Next gate | identity-core ACCEPTED → cập nhật Baseline → `/code` → `/audit` → `/resolve` → ACCEPTED |
| Updated | 2026-08-16 15:10 ICT |

## 1. Outcome

### User-visible outcome

- **Sếp (ADMIN)**: nhìn thấy mọi thứ y nguyên — toàn bộ worker, CCCD/STK hiện đầy đủ.
- **HR_STAFF / SALE / PM**: danh sách worker tự động chỉ còn người thuộc phạm vi mình (được giao / mình tạo / dự án mình quản lý) — **không cần sửa gì ở code nghiệp vụ**, việc cắt xảy ra tự động.
- **WORKER**: chỉ thấy chính mình; mọi CCCD/Số TK/ảnh selfie của người khác hiện thành `***`.
- **VENDOR/CTV**: chỉ thấy worker mà claim `accepted` của mình đã duyệt.
- Role không có quyền xem → trả về "không có quyền" (403), không phải danh sách rỗng.
- Kể cả ai đó cầm thẳng DB (query tool, script) cũng không đọc được row ngoài scope — vì **bức tường thứ 2 nằm ngay trong Postgres (RLS)**.
- appBCC (công cụ bơm dữ liệu của sếp) tiếp tục hoạt động **nguyên trạng** — đây là điều kiện bắt buộc.

### Non-goals

- KHÔNG viết permission-catalog / permission-resolver / auth-context / require-permission — thuộc `hrp-phase1-identity-core` (đã chốt).
- KHÔNG audit / idempotency / outbox / state-machine — Phase 3.
- KHÔNG tạo màn hình UI mới (S01→S05) — Phase 4.
- KHÔNG RLS trên `portal_timesheets` (bảng appBCC) — rào app-level đã có từ task bcc-fence; contract bảng này thuộc quyền sếp.
- KHÔNG đổi code `app/bcc/*`, `appBCC/*`, `app/job-board/*` (khu vực sếp đang phát triển song song).
- KHÔNG đổi model/schema Prisma (đã đủ — EV-01).
- KHÔNG field masking column-level ở DB — chỉ application-level (select/DTO), đúng PHASE_KHOAHOC §4.
- KHÔNG xử lý bảng PayRun/SalaryVariable (chưa tồn tại — Phase 4).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/schema.prisma:105-262, 326-353, 469-527, 767-799, 884-934` | Schema đã đủ hết Delta của data-scope-security §3: `SystemRole` 13 giá trị (105-119), `Worker.accountUserId` + FK owner/assignedTo/account (243, 255-257), `Project.pmUser` FK (349), index G22 `[pmUserId, status]`, `[projectId, status]`, `[vendorId, accepted]`, `[ctvId, accepted]` | Phase 2 KHÔNG cần đổi model — chỉ thêm DDL RLS + DB roles + code tầng application |
| `EV-02` | `docs/data-scope-security.md` §1.2, §5.5, §6 | Kiến trúc 2 lớp đã chốt: **L1** = Prisma extension `withAuthScope` (tiêm where theo ma trận), **L2** = Postgres RLS (backstop chặn cả `$queryRaw`/tool DB). Phase 1 (identity-core) tạo extension dạng **deny-by-default**; Phase 2 điền scope builders thật + dựng L2 | Phân ranh giới 2 task: identity-core KHÔNG viết builders; Phase 2 KHÔNG tạo lại extension |
| `EV-03` | `appBCC/app.py:227, 1194-1243` + `core_pipeline.py:6, 305-519` | appBCC kết nối Neon bằng **chính `DATABASE_URL`** (SQLAlchemy + psycopg2) — tức role owner của DB; có luồng UPDATE worker (recon) và nút `run_clear_db` | `FORCE RLS` sẽ chặn cả owner → **bắt buộc** clause miễn trừ ETL qua DB role (DEC-03), nếu không appBCC chết ngay khi áp migration |
| `EV-04` | `prisma/schema.prisma:1028-1046` + memory drift DEC-31 | `portal_timesheets` tồn tại ngoài migration history (appBCC tạo trực tiếp) | STEP-01 phải khảo sát read-only production trước khi đụng migration; lặp quy trình DEC-31 nếu cần |
| `EV-05` | Glob `src/shared/auth/` | Hiện chỉ có `jwt.ts`, `password.ts`, `user.ts` + test (từ bcc-fence) — chưa có extension/scope/resolver nào | Khớp kế hoạch: L1/L2 hoàn toàn mới, không đụng file cũ |
| `EV-06` | Glob `app/api/` | 6 route `/api/tickets/*` còn dùng stub `session.ts` (tự khai role) | identity-core sẽ thay stub trước; Phase 2 route demo `/api/workers*` là route đầu tiên sinh ra từ AuthContext thật + scope |
| `EV-07` | `docs/PHASE_KHOAHOC_V1.md` §4 Phase 2 + §6 | DoD Phase 2: 52 case matrix 13 role × 4 bảng; exit criteria `GET /api/workers/me`; **cấm** `SET ROLE` trên connection — phải `SET LOCAL` trong transaction (rò role qua pool nếu làm sai) | RQ-05/AC-05 khóa đúng 2 điểm này; route demo khớp exit criteria |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | **Phân ranh giới L1/L2 giữa 2 task**: identity-core (Phase 1 tuần 2) tạo `with-auth-scope.ts` dạng **deny-by-default** (chưa có builder nào → role khác ADMIN/HR_MANAGER/DIRECTOR throw ngay, đúng §1.3). Phase 2 (task này) viết builders `scopes/{worker,project,vendor,ctv}.scope.ts` theo ma trận §5.2-5.3 và NỐI vào extension + dựng L2 RLS. Nếu identity-core chưa ACCEPTED hoặc đổi interface → task này revision | Planner | CHỐT |
| `DEC-02` | CHOSEN | RLS theo đúng §6.1: policy gọi hàm SQL `STABLE SECURITY DEFINER` (`hrp_worker_visible` tương tự §6.1, điều chỉnh khớp 13 role thật); session truyền qua **4 GUC** `app.user_id`, `app.role`, `app.vendor_id`, `app.worker_id` bằng `set_config(..., true)` = `SET LOCAL` **trong transaction**; DB roles ứng dụng (`app_user` read-only, `app_user_writer` ghi) **KHÔNG có attribute `BYPASSRLS`**, runtime role ≠ table owner (invariant PHASE_KHOAHOC §4) | Planner | CHỐT |
| `DEC-03` | CHOSEN | **Miễn trừ ETL cho appBCC** (EV-03): tạo DB role `hrp_etl`, cấp cho role mà `DATABASE_URL` hiện dùng; mọi policy RLS có clause `OR pg_has_role(current_user, 'hrp_etl', 'MEMBER')` để appBCC đọc/ghi nguyên trạng. **Tuyệt đối không hạ FORCE** để chiều appBCC. TODO ghi rõ trong migration: bỏ miễn trừ khi appBCC nghỉ hưu (Phase 4 slice Attendance — công bố công khai rủi ro này: role cầm DATABASE_URL production vẫn đọc được toàn bộ; chấp nhận giai đoạn này vì credential chỉ nằm ở Vercel + máy sếp) | Planner | CHỐT — sếp có quyền phủ quyết |
| `DEC-04` | CHOSEN | **3 migration** theo DoD PHASE_KHOAHOC: `s1_rls_worker` (bảng `workers` FORCE + policy chính + bảng con lặp qua `worker_id IN (SELECT id FROM workers)`: `source_claims`, `project_assignments`, `tickets`, `dependents`, `timesheet_lines`, `timesheet_adjustments`, `worker_deductions` — STEP-01 xác minh danh sách cuối), `s1_rls_project` (`outsourcing_projects` + `staffing_orders`, `sites` qua `project_id`), `s1_rls_vendor` (`vendor_statements` FORCE + `vendor_statement_lines`, `vendors`, `candidate_submissions`). Không migration nào đụng `portal_timesheets` | Planner | CHỐT |
| `DEC-05` | CHOSEN | **Field masking** theo §2: `worker-projection.ts` ẩn `cccdNumber`, `cccdImageUrl`, `selfieImageUrl`, `cccdChipData`, `bankAccount`, `bankName`, `bankBranch` → `***` khi role thiếu permission `CAN_VIEW_WORKER_SENSITIVE` (permission này do identity-core seed). ADMIN/HR_MANAGER/DIRECTOR thấy nguyên văn | Planner | CHỐT |
| `DEC-06` | CHOSEN | **52 case = 13 role × 4 bảng**: `workers`, `projects`, `tickets`, `vendor_statements` — mỗi case assert (a) đúng tập row theo ma trận §5.2-5.3, (b) đúng field bị che. Thêm integration test L2: 2 transaction song song khác role → row-set khác nhau | Planner | CHỐT |
| `DEC-07` | CHOSEN | Route demo: `GET /api/workers` (list theo scope — dùng cho matrix) + `GET /api/workers/me` (WORKER thấy chính mình; role khác trả 403) — đúng exit criteria PHASE_KHOAHOC §4. Mọi query qua `withDbContext` + `db = prisma.$extends(withAuthScope(ctx))` | Planner | CHỐT |
| `DEC-08` | CHOSEN | **Timing áp RLS lên production (Neon main) = phương án B (sếp chốt 16/08)**: Phase 2 chỉ áp trên `DATABASE_URL_DEV`; production **hoãn tới trước Phase 4** (trigger: trước khi khởi động Phase 4, planner mở task/step áp production). Phase 2 giao đủ **runbook apply + rollback** (đã kiểm tra trên dev) để ngày đó chỉ cần chạy + sếp ký. Lưu ý chấp nhận: tới trước Phase 4, production chỉ có rào app-level từ Phase 1, chưa có backstop DB | Sếp chốt 16/08 qua AskUserQuestion | CHỐT |
| `DEC-09` | ASSUMPTION | identity-core seed đủ: `CAN_VIEW_WORKER_SENSITIVE` (dùng cho masking), `CAN_VIEW_UNASSIGNED_POOL` (pool worker chưa phân công — §5.4, test matrix có case HR_STAFF không thấy pool) | Planner | Hết hiệu lực khi identity-core ACCEPTED |
| `DEC-10` | ASSUMPTION | Ma trận §5.2-5.3 là canonical cho builders; chỗ nào 2 tài liệu lệch (số role 13 vs 11) → **13 role thật** (schema hiện tại) thắng | Planner | — |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Migration `s1_rls_worker`: hàm `hrp_worker_visible` (SECURITY DEFINER, đúng ma trận §5.2 cho 13 role) + `FORCE RLS` trên `workers` + policy + policies bảng con qua `worker_id`; chỉ chạy qua quy trình an toàn (không destructive, không đụng bảng ngoài danh sách) | Must | DEC-02/04 | Policy sai → appBCC/query lỗi; phải rollback được |
| `RQ-02` | Migration `s1_rls_project`: policies cho `outsourcing_projects` (PM thấy dự án mình quản lý + `isPublic`; WORKER thấy `isPublic` ∪ có assignment ACTIVE; VENDOR thấy `isPublic` ∪ có submission; MKT thấy `isPublic` ∪ CRM owned; còn lại ADMIN/HR_*/DIRECTOR/SALE toàn bộ — §5.3) + `staffing_orders`, `sites` theo `project_id` | Must | DEC-04 + §5.3 | — |
| `RQ-03` | Migration `s1_rls_vendor`: `FORCE RLS` trên `vendor_statements` (VENDOR_* thấy statement của vendor mình qua `app.vendor_id`; ADMIN/HR_MANAGER/DIRECTOR/ACCOUNTANT toàn bộ; role khác deny) + `vendor_statement_lines` theo statement + `vendors`, `candidate_submissions` theo ma trận | Must | DEC-04 + §5.3 | — |
| `RQ-04` | DB roles: tạo `app_user` (read-only) + `app_user_writer` (ghi) với GRANT tối thiểu theo bảng, KHÔNG `BYPASSRLS`; tạo `hrp_etl` + cấp cho role hiện tại của `DATABASE_URL`; **appBCC hoạt động nguyên trạng sau khi áp migration** (verify push + recon thật) | Must | DEC-02/03 + EV-03 | appBCC lỗi = chặn release |
| `RQ-05` | `with-db-context.ts` + `rls-context.ts`: mở transaction ngắn, set 4 GUC qua `set_config(..., true)` (SET LOCAL); **CẤM** `SET ROLE` trên connection — unit test chứng minh GUC chết khi transaction kết thúc, không leak sang request khác | Must | EV-07 + PHASE_KHOAHOC invariant | Leak role = lỗi nghiêm trọng |
| `RQ-06` | Scope builders `scopes/{worker,project,vendor,ctv}.scope.ts` đúng ma trận §5.2-5.3, deny-by-default cho role chưa khai báo; nối vào `with-auth-scope.ts` (identity-core) — L1 hoạt động; `findUnique` ngoài scope trả `null`/P2025 y hệt "không tồn tại" (chống rò rỉ sự tồn tại) | Must | DEC-01/06 | Ngoài scope trả row = lỗ hổng |
| `RQ-07` | `worker-projection.ts`: che 7 field nhạy cảm (DEC-05) khi role thiếu `CAN_VIEW_WORKER_SENSITIVE` — áp ở application (select/DTO) | Must | DEC-05 | Lộ CCCD/STK = block |
| `RQ-08` | `GET /api/workers` + `GET /api/workers/me` dùng `withDbContext` + extension; không JWT → 401; thiếu permission → 403 có reason; curl matrix 13 role cho kết quả đúng | Must | DEC-07 + PHASE_KHOAHOC exit criteria | 401/403/200 đúng theo case |
| `RQ-09` | Test: 52/52 case matrix PASS (vitest) + integration L2 2 session khác role + checklist §5.7 (8 mục) PASS + `npm run build` exit 0 + toàn bộ `vitest run` PASS | Must | DEC-06 + §5.7 | Test fail = chặn release |
| `RQ-10` | KHÔNG đổi logic `app/bcc/*`, `appBCC/*`, `app/job-board/*`; KHÔNG commit credential/PII; evidence masked; chỉ `git add` đúng file | Must | 00-global-rules + quy ước sếp | Audit fail |

### 4.2 Scope boundaries

**In scope:**

- `prisma/migrations/*` — 3 migration RLS mới (DEC-04)
- `src/shared/auth/with-db-context.ts`, `rls-context.ts`, `scopes/*.scope.ts`, `worker-projection.ts`, `with-auth-scope.ts` (chỉ nối builders)
- `app/api/workers/route.ts`, `app/api/workers/me/route.ts`
- Test files tương ứng

**Out of scope:**

- `app/bcc/`, `appBCC/`, `app/job-board/`, `app/login/` — không đụng
- `prisma/schema.prisma` — không đổi model (EV-01)
- `portal_timesheets` — không RLS, không sửa
- `src/domains/attendance/session.ts` — identity-core xử lý
- PayRun/SalaryVariable/PayrollConfig/TaxBracket — Phase 4/P3

### 4.3 Data, State, Permission và Interface Rules

- **Data:** không thêm/cột/bảng; chỉ DDL policy + DB roles. Migration phải `prisma validate` sạch, chạy trên `DATABASE_URL_DEV` trước, production theo DEC-08. Tiền BigInt VND giữ nguyên (ADR-010).
- **State:** không đổi state machine nào; RLS chỉ thêm điều kiện đọc/ghi, không đổi giá trị.
- **Permission/data scope:** ma trận §5.2-5.3 là canonical (13 role thật); hai trục độc lập — feature permission (identity-core) + data scope (task này) phải cùng PASS một hành động.
- **Interface:** `GET /api/workers` trả mảng worker đã scope + projection; `GET /api/workers/me` trả worker của chính ctx (role WORKER) — role khác 403 `{ error }`; không JWT 401 `{ error }`.
- **Failure/idempotency/concurrency:** RLS không liên quan idempotency (Phase 3); concurrency của GUC = transaction-local (SET LOCAL) — không idempotency-key ở task này.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01..04 | Production Neon main (read-only) | Khảo sát: role hiện tại của `DATABASE_URL`, danh sách bảng thật tồn tại (đối chiếu drift DEC-31), luồng ghi của appBCC (bảng nào UPDATE/INSERT/DELETE), index thực tế | Kết quả bcc-fence + DEC-31 | Query catalog read-only + ghi evidence vào HANDOFF (masked, không in connection string) | Phát hiện drift chưa xử lý → dừng, báo Planner |
| `STEP-02` | RQ-01 | `prisma/migrations/*_s1_rls_worker` | Migration worker FORCE + hàm + policies bảng con; miễn trừ `hrp_etl` (DEC-03) | STEP-01 | `prisma migrate dev` trên DATABASE_URL_DEV exit 0 + smoke SELECT 2 GUC khác nhau (có/không session) | Lỗi apply hoặc appBCC smoke fail trên dev |
| `STEP-03` | RQ-02 | `prisma/migrations/*_s1_rls_project` | Policies project + staffing_orders + sites | STEP-02 | migrate dev + smoke PM/isPublic | — |
| `STEP-04` | RQ-03, RQ-04 | `prisma/migrations/*_s1_rls_vendor` | FORCE vendor_statements + policies vendor/candidate_submissions + tạo 3 DB role (`app_user`, `app_user_writer`, `hrp_etl`) + GRANT tối thiểu | STEP-03 | migrate dev + smoke vendor scope; appBCC push/recon thử trên dev | appBCC không chạy được → dừng, báo Planner |
| `STEP-05` | RQ-05 | `src/shared/auth/with-db-context.ts` + `rls-context.ts` | 2 helper: transaction + set_config 4 GUC (SET LOCAL); cấm SET ROLE | STEP-04 | vitest: GUC tồn tại trong tx, biến mất sau tx; 2 tx song song khác role không ảnh hưởng nhau | Test fail |
| `STEP-06` | RQ-06 | `src/shared/auth/scopes/*.scope.ts` + nối `with-auth-scope.ts` | 4 builders theo ma trận §5.2-5.3; deny-by-default giữ nguyên cho model chưa khai báo | identity-core ACCEPTED (DEC-01) | vitest unit per-builder theo matrix | identity-core chưa ACCEPTED → dừng |
| `STEP-07` | RQ-07 | `src/shared/auth/worker-projection.ts` | Masking 7 field theo DEC-05, gắn `CAN_VIEW_WORKER_SENSITIVE` | STEP-06 | vitest: role có/không permission → plaintext/`***` | — |
| `STEP-08` | RQ-08 | `app/api/workers/route.ts` + `app/api/workers/me/route.ts` | 2 route demo qua withDbContext + extension; 401/403/200 | STEP-05..07 | `next dev` + curl 13 role → đúng matrix (evidence masked) | — |
| `STEP-09` | RQ-09 | Tests | 52/52 case + integration L2 + checklist §5.7 + full `vitest run` + `npm run build` | STEP-06..08 | Tất cả PASS, build exit 0 | Bất kỳ case fail |
| `STEP-10` | RQ-01..04 | Runbook production (DEC-08 = B) | Viết runbook `docs/tasks/hrp-phase2-tenant-scope/RUNBOOK_PRODUCTION.md`: thứ tự áp 3 migration lên Neon main, bước verify appBCC sau apply, script rollback (DROP POLICY + DISABLE RLS) <5 phút, cửa sổ ngoài giờ làm. **KHÔNG chạy lên production trong task này** | DEC-08 | Runbook đầy đủ + dry-run lệnh rollback trên dev (không phá dữ liệu) | — |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01..03 | 3 migration áp sạch trên `DATABASE_URL_DEV`: `prisma validate` + migrate exit 0, không destructive, không đụng `portal_timesheets`, không bảng nào ngoài danh sách DEC-04 | Command | Log command + exit code + `migrate status` | Yes |
| `AC-02` | RQ-04 | appBCC push timesheet + recon update worker hoạt động nguyên trạng sau migration (trên dev — DEC-08 = B) | Thực chạy appBCC | Evidence masked (số row, không PII) | Yes |
| `AC-03` | RQ-05 | GUC 4 biến chỉ sống trong transaction; 2 session song song khác role không rò role cho nhau; không dùng `SET ROLE` (grep sạch) | vitest + grep | Test output + grep result | Yes |
| `AC-04` | RQ-08 | curl matrix (dev — DEC-08 = B): WORKER `GET /api/workers/me` → đúng 1 row của mình + `cccdNumber = ***`; ADMIN → toàn bộ + plaintext; không JWT → 401; HR_STAFF → đúng tập assigned + không thấy pool (trừ khi có `CAN_VIEW_UNASSIGNED_POOL`); MKT → 403 | curl dev | Command + output masked | Yes |
| `AC-05` | RQ-09 | 52/52 case matrix PASS (13 role × 4 bảng), mỗi case assert row-set + masked field | vitest | Test output `52 passed` | Yes |
| `AC-06` | RQ-06, RQ-09 | Checklist §5.7 đủ 8 mục PASS: findUnique ngoài scope = null; count/aggregate bị scope; updateMany/deleteMany ngoài scope = 0 row; create ép owner từ session; `$queryRaw` không dùng trong code có ctx; nested write có test; export đi qua cùng layer; `getSession` thiếu vendorId → throw | vitest + grep | Test output + code refs | Yes |
| `AC-07` | RQ-09 | `npm run build` exit 0 + toàn bộ `vitest run` PASS (không test skip/only sót) | Command | Log + exit code | Yes |
| `AC-08` | RQ-10 | `git diff` cho `app/bcc/`, `appBCC/`, `app/job-board/` rỗng; grep không có credential/PII thật | git diff + grep | Diff + grep output | Yes |
| `AC-09` | RQ-01..04 | Runbook production đầy đủ: thứ tự apply, verify appBCC, script rollback đã dry-run trên dev; **production chưa đụng** (verify `migrate status` production không đổi) | Đọc runbook + kiểm tra dry-run evidence + `migrate status` production | Runbook + dry-run log + status | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01, STEP-02` | `AC-01, AC-09` |
| `RQ-02` | `STEP-03` | `AC-01, AC-09` |
| `RQ-03` | `STEP-04` | `AC-01, AC-09` |
| `RQ-04` | `STEP-01, STEP-04` | `AC-02` |
| `RQ-05` | `STEP-05` | `AC-03` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-04, AC-05` |
| `RQ-08` | `STEP-08` | `AC-04` |
| `RQ-09` | `STEP-09` | `AC-05, AC-06, AC-07` |
| `RQ-10` | all | `AC-08` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | FORCE RLS chặn appBCC (ETL) giữa chừng production — luồng bơm dữ liệu thật chết | push/recon lỗi sau apply | STEP-01 khảo sát trước; clause miễn trừ `hrp_etl` (DEC-03); verify appBCC trên dev trước; apply ngoài giờ làm | Script rollback sẵn: `DROP POLICY` + `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` cho từng bảng — chạy được trong <5 phút |
| `RISK-02` | Policy SQL sai → hoặc lộ dữ liệu ngoài scope, hoặc dữ liệu "biến mất" khỏi mọi UI | AC-05 fail hoặc sếp báo lạ | 52-case + integration 2 session là chốt chặn; apply dev trước production | Rollback như RISK-01; không mất dữ liệu (RLS không xóa row) |
| `RISK-03` | `SET ROLE` trên connection → rò role qua connection pool (Neon pooler tái dùng connection) | Code review thấy `SET ROLE` / `set role` | Contract cấm (RQ-05); unit test + grep AC-03 | Fix code — không cần rollback DB |
| `RISK-04` | Drift migration (`portal_timesheets` ngoài history) làm migrate dev/prod fail | Prisma báo drift lúc apply | STEP-01 khảo sát; lặp quy trình DEC-31 (migrate resolve đã có tiền lệ) | Theo DEC-31 — resolve xong mới apply |
| `RISK-05` | identity-core chưa ACCEPTED mà task này chạy → interface extension lệch | STEP-06 | Dependency ghi trong Control + DEC-01; STEP-06 stop condition | Revision TASK này theo interface identity-core |
| `RISK-06` | RLS làm query chậm (seq-scan) | Query chậm sau apply | Index G22 đã có sẵn (EV-01); STEP-01 đo baseline; policy dùng subquery tận dụng index | `EXPLAIN ANALYZE` → thêm index qua migration riêng nếu cần |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | Không còn câu hỏi mở — DEC-08 đã sếp chốt (B) 16/08 | — | — | — |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Initial contract — Phase 2 Tenant Scope: L2 RLS (3 migration FORCE + miễn trừ ETL) + with-db-context/rls-context + 4 scope builders + worker-projection + route demo `/api/workers*` + 52-case matrix | Sếp yêu cầu "viết task p2 dần đi"; căn cứ PHASE_KHOAHOC_V1 §4 + data-scope-security §5-§7 |
| `v1.1` | 2026-08-16 | DEC-08 CHỐT = phương án B (sếp qua AskUserQuestion): production hoãn tới trước Phase 4; STEP-10 đổi thành viết runbook (không chạy production); AC-02/AC-04/AC-09 đổi theo B; đóng Q-01 | DEC-08 |
