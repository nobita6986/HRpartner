# PROMPT_TIER2 — hrp-phase2-tenant-scope

Sếp copy nguyên khối dưới đây sang Cursor/Tier 2:

```text
/code hrp-phase2-tenant-scope

Bạn là Tier 2 — Implementation Engineer trong pipeline 3 tầng HRP. Nhiệm vụ: thực thi đúng TASK `docs/tasks/hrp-phase2-tenant-scope/TASK.md` spec v1.3, status READY_FOR_EXECUTION, baseline `dc3e772`.

BẮT BUỘC đọc trước khi code:
1. `.ai-pipeline/tier2.md`
2. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md` (nếu có)
3. `docs/tasks/hrp-phase2-tenant-scope/TASK.md`
4. `docs/tasks/hrp-phase1-identity-core/TASK.md`, `HANDOFF.md`, `AUDIT.md` để hiểu AuthContext/permission/with-auth-scope đã ACCEPTED
5. `docs/PHASE_KHOAHOC_V1.md` §4 Phase 2 DoD
6. `docs/data-scope-security.md` §1.2, §2, §5-§6

CẢNH BÁO QUAN TRỌNG — VI PHẠM LÀ AUDIT BLOCK:
- KHÔNG tạo lại login/JWT/cookie/register/endpoint auth mới — tái sử dụng bộ identity-core đã ACCEPTED.
- KHÔNG đụng `app/bcc/*`, `app/job-board/*`, `middleware.ts`, `app/api/auth/*`, `app/api/me/*`, `src/shared/auth/{jwt,password,user,permission-catalog,permission-resolver,auth-context,require-permission}.ts` (chỉ đọc/gọi).
- KHÔNG chạm `portal_timesheets` (UNIQUE thuộc identity-core/contract appBCC).
- Production Neon main TỐI ĐA KHÔNG đổi (DEC-08): RLS chỉ áp/verify trên dev; bàn giao runbook production + rollback dry-run dev.
- `appBCC/*` là vùng cấm, NGOẠI TRỪ DUY NHẤT 1 dòng env trong `appBCC/app.py`: `DATABASE_URL` → `APPBCC_DATABASE_URL` (DEC-09 A). Không sửa logic appBCC.
- `prisma/schema.prisma`: CHỈ thêm dòng `directUrl` trong datasource block. Không đổi model/field.

Phạm vi theo TASK:
1. DEC-09 A — tách credential web/ETL (dev only):
   - Tạo role dev `app_user_writer` (read/write app tables): KHÔNG superuser, KHÔNG table owner, KHÔNG `BYPASSRLS`, KHÔNG là member `hrp_etl`.
   - Tạo role `hrp_etl` cho appBCC với grants tối thiểu theo khảo sát quyền thực tế appBCC cần (STEP-01 read-only).
   - Local `.env`: `DATABASE_URL` repoint về connection `app_user_writer`; thêm `DATABASE_URL_ADMIN` = admin string hiện tại.
   - datasource Prisma: `url = env("DATABASE_URL")`, `directUrl = env("DATABASE_URL_ADMIN")` — migrate giữ quyền DDL qua directUrl, runtime đi qua role restricted.
   - `appBCC/app.py`: đổi 1 dòng `DATABASE_URL` → `APPBCC_DATABASE_URL`; `.env` thêm `APPBCC_DATABASE_URL` (role `hrp_etl`).
   - Verify: `prisma migrate status` qua directUrl exit 0; query đếm row bằng role runtime thấy RLS áp dụng (sau khi policy có).
2. 3 migration RLS dev: `s1_rls_worker`, `s1_rls_project`, `s1_rls_vendor` theo DEC-04; `FORCE ROW LEVEL SECURITY`; không chạm `portal_timesheets`.
3. `with-db-context.ts` + `rls-context.ts`: set 4 GUC `app.user_id`, `app.role`, `app.vendor_id`, `app.worker_id` bằng `set_config(..., true)` trong transaction. CẤM `SET ROLE`; CẤM GUC session-global. Test không leak giữa 2 transaction.
4. `scopes/{worker,project,vendor,ctv}.scope.ts`: builders tường minh theo 13-role matrix; nối vào `with-auth-scope.ts` (register builders) — giữ deny-by-default cho model thiếu builder.
5. `worker-projection.ts`: che 7 trường (`cccdNumber`, `cccdImageUrl`, `selfieImageUrl`, `cccdChipData`, `bankAccount`, `bankName`, `bankBranch`) thành `***` khi thiếu `CAN_VIEW_WORKER_SENSITIVE`.
6. `GET /api/workers` (list scoped) + `GET /api/workers/me` (chỉ WORKER, role khác 403) qua AuthContext + withDbContext + L1 + projection. API không nhận userId/role từ client.
7. 52/52 matrix (13 role × 4 bảng Worker/Project/Ticket/VendorStatement) + L2 integration two-transaction + checklist §5.7 data-scope-security PASS.
8. STEP-10: runbook production RLS (preflight, apply order, verification appBCC, rollback <5 phút) + dry-run rollback trên dev. Production không thay đổi.

Quy tắc bảo mật/git:
- KHÔNG commit `.env`, token, password, connection string, DATABASE_URL.
- KHÔNG in secret/URL/password trong HANDOFF; mask phone/token/role.
- CẤM `git add -A` / `git add .`; chỉ add đúng file đã đổi.
- appBCC và app/bcc là khu vực sếp phát triển song song: không stage, không stash, không touch (trừ 1 dòng env DEC-09 A).
- Production DATABASE_URL có dữ liệu thật: không chạy destructive (`reset`, `drop`, `truncate`, xóa row).

Verification bắt buộc trước HANDOFF:
- `npm run build` exit 0.
- `npm run test` pass toàn bộ, không `.only`/skip sót.
- 52/52 matrix PASS + L2 two-transaction no-leak PASS.
- grep không có `SET ROLE`; không có `set_config` ngoài transaction helper.
- `prisma migrate status` dev exit 0 qua directUrl; 3 migration RLS ở trạng thái applied trên dev.
- curl dev: `/api/workers` 401 không JWT; WORKER thấy đúng row-set; role khác gọi `/api/workers/me` → 403.
- Role runtime bị RLS áp dụng (query row-count khác với role hrp_etl/exempt trên cùng bảng).
- `git diff -- app/bcc appBCC app/job-board middleware.ts app/api/auth app/api/me` — appBCC chỉ có 1 dòng env; các vùng khác rỗng.
- Neon main: `migrate status` không đổi (không migration mới trên production).

Kết quả cuối cùng:
- Cập nhật `docs/tasks/hrp-phase2-tenant-scope/HANDOFF.md` với evidence thật (command + exit code + output đã mask).
- Runbook production nằm trong `docs/tasks/hrp-phase2-tenant-scope/RUNBOOK.md` (hoặc section trong HANDOFF theo TASK).
- HANDOFF kết thúc đúng 1 dòng:
  `Handoff status: READY_FOR_AUDIT`
  hoặc nếu bị blocker (vd không tách được credential):
  `Handoff status: BLOCKED — <lý do cụ thể>`
```
