# TASK — `hrp-t1b-pre-p2-worker-delete-rls-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-pre-p2-worker-delete-rls-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | T0 §0 đã chốt: lane `STANDARD` + audit `NONE` cho hotfix forward-only RLS policy forward-only. Tier 1 tự review 3 rủi ro trọng yếu (idempotent migration, idempotency-key replay policy) trước freeze. Tier 3 chỉ tham gia khi Tier 1/Owner nâng mức. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1B` |
| Baseline | `7f5704123cbe0ae52c897b38c8afdd3f14358c78` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `prisma/migrations/<timestamp>_t1b_pre_p2_worker_delete_rls/migration.sql` (NEW); `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts` (NEW); `vitest.integration-files.ts` (register integration file); `docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/{TASK.md,HANDOFF.md}`. Migration MUST be timestamp `> 20261005000000` (strictly greater than latest `pre-p2-*` hotfix migrations hiện có trên main: `20260930090000_p1a05_hr_staff_job_openings_update_rls` và PR #115 không thêm migration). |
| Forbidden paths | `app/api/workers/[id]/route.ts` (catch-all 500 message tiếng Việt đã OK xem PR #115 — KHÔNG chỉnh); `src/domains/workforce/worker.service.ts` (deleteWorker đã đúng spec T1B — KHÔNG chỉnh); `src/domains/workforce/worker.types.ts`; `prisma/schema.prisma` (không thêm field); `app/admin/workers/[id]/worker-delete-button.tsx`; `src/domains/workforce/worker-delete-error-labels.ts`; `app/api/workers/[id]/__tests__/route-delete-500.static.test.ts`; mọi dependency sweep 15 bảng (T1B freeze); advisory lock `hrp:worker:<id>`; `withDbContext` / `applyRlsContext` GUC; `WorkerServiceError.WORKER_NOT_DELETABLE` 409 path; ADMIN-only route guard; audit log `WORKER_PERMANENT_DELETE`; outbox event `WorkerPermanentlyDeleted`; mọi PR #115 static test fence; `tests/db/p1a07-f9b-r2-role-scope.integration.test.ts` (HR_STAFF scope table lo đã xong); `src/shared/auth/live-rls-posture.m1-07b.test.ts`; `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure`; `prisma/migrations/20260819104701_m13_backend_expansion`; `prisma/migrations/20260821103500_m13_restore_rls_matrix`; `prisma/migrations/20260816210000_s1_rls_worker`; production `.env*`; production DB / migration deploy scripts. |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration` (synthetic DB READY; nếu ENV_BLOCKED ghi BLOCKED); `npm run build`; `git diff --check`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`. Migration = `NOT_RUN`. |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE` (Tier 1 self-review; Tier 3 chỉ tham gia khi Owner nâng mức) |

> Lane = STANDARD, Audit = NONE (T0 §0). Correction budget = 1. Final gate = `NONE`. Production migration = `NOT_RUN`.

## 1. Outcome

### 1.1 User-visible outcome

1. **Root cause production 500 đã được sửa**: ADMIN xóa Worker orphan không còn nhận `PrismaClientKnownRequestError P2025` + `console.error [api/workers/[id] DELETE]` nữa. Hành vi đúng: row biến mất, audit log `WORKER_PERMANENT_DELETE` ghi trong transaction, outbox event `WorkerPermanentlyDeleted` cùng transaction, route trả 200 `{ ok: true, id, deletedAt }`.

2. **Semantics giữ nguyên spec T1B**: route vẫn ADMIN-only (line `ctx.role !== 'ADMIN'`), `withDbContext` set GUC transaction-local, advisory lock `hrp:worker:<id>`, snapshot → re-read → dependency sweep 15 bảng → `tx.worker.delete` → audit + outbox cùng transaction. Worker có dependency vẫn nhận `409 WORKER_NOT_DELETABLE` với `details.blockingFacts`.

3. **PR #115 không bị cứ vi phạm**: PR #115 chỉ Việt hóa modal + catch-all 500 message — KHÔNG sửa root cause. PR hotfix này mới sửa root cause RLS. Tài liệu HANDOFF phải ghi rõ sự phân biệt.

4. **Live RLS evidence bằng runtime writer role `app_user_writer`** (KHÔNG mock RLS): integration test chứng minh:
   - ADMIN xóa được Worker orphan.
   - HR_MANAGER / DIRECTOR / một non-admin khác KHÔNG xóa được.
   - ADMIN xóa Worker có dependency vẫn 409 WORKER_NOT_DELETABLE.
   - Policy introspection: không còn `hrp_workers_no_delete USING false`; có restrictive DELETE policy ADMIN-only; `workers` vẫn FORCE RLS.
   - Migration idempotent/convergent trên cả clean install và DB có legacy policy.

### 1.2 Non-goals

- KHÔNG thêm field/schema mới trên `workers`.
- KHÔNG mở DELETE cho HR_MANAGER / DIRECTOR / role khác ở RLS layer.
- KHÔNG dùng `BYPASSRLS`, `withSystemDb`, admin DB URL hoặc raw connection để né RLS.
- KHÔNG sửa dữ liệu production thủ công.
- KHÔNG cascade hoặc set-null thêm ở app layer.
- KHÔNG thay đổi dependency sweep 15 bảng, advisory lock, audit reason, audit log, outbox hoặc ADMIN-only route guard.
- KHÔNG đưa raw Prisma/server error ra UI (catch-all 500 tiếng Việt của PR #115 giữ nguyên).
- KHÔNG sửa service `deleteWorker`, route DELETE handler, worker types, error labels, modal UI.
- KHÔNG chạy production migration.
- KHÔNG merge/deploy.
- KHÔNG sửa các migration cũ.
- KHÔNG tạo P2025 typed mapping ở application layer để "che" RLS. Nếu cần typed 404 cho concurrent delete, đó là case riêng đã có (`swapper-worker@re-read`).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Production VPS log (T0 đã verify): `[api/workers/[id] DELETE] error: PrismaClientKnownRequestError; Invalid `prisma.worker.delete()` invocation: An operation failed because it depends on one or more records that were required but not found. code: P2025`. | Xác nhận root cause: `tx.worker.delete` bị RLS lọc thành zero-row, Prisma thấy "0 dòng affected" → throw P2025 → route trả 500. |
| `EV-02` | Production DB introspection (T0 đã verify): hai policy trên bảng `workers`: `hrp_worker_scope` (PERMISSIVE, FOR ALL, USING `hrp_worker_visible_for(id)`) và `hrp_workers_no_delete` (RESTRICTIVE, FOR DELETE, USING `false`). | Chứng minh root cause RLS: `hrp_workers_no_delete USING (false)` chặn tuyệt đối DELETE cho mọi role, kể cả ADMIN. Worker vẫn SELECT được qua `hrp_worker_scope` nhưng DELETE bị zero-row → P2025. |
| `EV-03` | `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql` Section 3 line ~218: tạo policy `hrp_workers_no_delete` trên `workers` qua vòng lặp `tables text[] := ARRAY['workers', 'dependents', ...]`. | Chứng minh policy tới từ migration này. Mỗi lần deploy chạy lại migration chain, policy `hrp_workers_no_delete` được re-assert (DROP + CREATE). |
| `EV-04` | Grep trên toàn bộ `prisma/migrations/` KHÔNG tìm thấy `hrp_worker_delete_admin` hay policy nào khác định nghĩa DELETE-only cho ADMIN trên `workers`. | Xác nhận production DB có policy `hrp_workers_no_delete USING false` (T0 đã verify trên production) KHÔNG được migrate đi qua migration file; do đó cần migration hội tụ an toàn cho cả clean install và DB đã có legacy policy. |
| `EV-05` | `app/api/workers/[id]/route.ts` line ~217: `if (ctx.role !== 'ADMIN') return 403 PERMISSION_DENIED`. Route đã gate ADMIN-only ở app layer. |
| `EV-06` | `app/api/workers/[id]/route.ts` line ~241, ~260: `await withDbContext(prisma, ctx, (tx) => serviceDeleteWorker(...))` — set GUC transaction-local trước khi `tx.worker.delete`. |
| `EV-07` | `src/domains/workforce/worker.service.ts` line ~661: `await acquireWorkerAdvisoryLock(tx, id)` — advisory lock `pg_advisory_xact_lock((hashtext('hrp:worker:'||id)::bigint) & MASK)`. |
| `EV-08` | `src/domains/workforce/worker.service.ts` lines 666-697: snapshot → re-read → `sweepWorkerDependencies` 15 bảng → throw 409 WORKER_NOT_DELETABLE nếu còn fact, hoặc `tx.worker.delete({ where: { id }, select: { id: true } })` nếu sạch. |
| `EV-09` | `src/domains/workforce/worker.service.ts` lines 700-730: audit log `WORKER_PERMANENT_DELETE` + outbox event `WorkerPermanentlyDeleted` cùng transaction. |
| `EV-10` | `prisma/migrations/20260816210000_s1_rls_worker/migration.sql` line ~78: policy `hrp_worker_scope` (PERMISSIVE FOR ALL TO app_user_writer, app_user USING `hrp_worker_visible_for(id)` WITH CHECK `hrp_worker_writable(id)`). |
| `EV-11` | `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql` line ~52: `ALTER TABLE workers ENABLE ROW LEVEL SECURITY; ALTER TABLE workers FORCE ROW LEVEL SECURITY;`. Migration mới phải giữ nguyên FORCE. |
| `EV-12` | `src/shared/auth/rls-context.ts` line ~58-78: 4 GUC `app.user_id / app.role / app.vendor_id / app.worker_id` set qua `set_config(..., true)` — transaction-local. `hrp_session_role()` đọc `current_setting('app.role', true)`. |
| `EV-13` | `vitest.integration-files.ts` lines 30-220: danh sách test files DB-touching. File mới phải được register. |
| `EV-14` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` line ~190-220: mẫu migration idempotency test (DROP POLICY IF EXISTS + CREATE conditional guard), CONVERGENT clean install vs DB có legacy policy. |
| `EV-15` | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` line ~330-365: mẫu `stagePredecessorRepo` + `applyPredecessorMigrations` + `createEphemeralDb` + `applyXxxMigrationFile` pattern. |
| `EV-16` | `src/domains/workforce/__tests__/worker.service.test.ts` line ~340-470: mẫu unit test fence cho deleteWorker (mock Prisma tx, assert PERMISSION_DENIED, NOT_FOUND, WORKER_NOT_DELETABLE, race re-read, sweep 14 dep cases). |
| `EV-17` | `app/api/workers/[id]/__tests__/route-delete-500.static.test.ts` line ~90-100: fence `[api/workers/[id] DELETE] error:` marker, message tiếng Việt cố định, KHÔNG leak `e.message`. PR hotfix này KHÔNG chỉnh route; chỉ xác nhận fence vẫn xanh. |
| `EV-18` | `prisma/migrations/20260819104701_m13_backend_expansion/migration.sql` line ~17: ADD COLUMN `workers.manager_id` — ví dụ cho pattern ADD-only. Migration hotfix này không ADD COLUMN; chỉ DROP+CREATE policy. |
| `EV-19` | `package.json` line 10: `npm run test:unit` chạy `vitest run --config vitest.unit.config.ts` (fail-closed DB URL sentinel). |
| `EV-20` | `package.json` line 11: `npm run test:integration` chạy `node scripts/ci/integration-preflight.mjs` (gate DATABASE_URL_TEST/ADMIN_TEST). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Migration forward-only: `prisma/migrations/<timestamp>_t1b_pre_p2_worker_delete_rls/migration.sql`. Timestamp `> 20261005000000` (strictly greater than tất cả migration hiện hữu trên main; an toàn trước các timestamp production T0 đã liệt kê). Tránh xung đột với hotfix song song. | CHOSEN |
| `DEC-02` | Migration semantic: `DROP POLICY IF EXISTS hrp_workers_no_delete ON workers;` + `DROP POLICY IF EXISTS hrp_workers_delete_admin ON workers;` + `CREATE POLICY hrp_workers_delete_admin ON workers AS RESTRICTIVE FOR DELETE TO app_user_writer, app_user USING (hrp_session_role() = 'ADMIN');`. Giữ `ALTER TABLE workers ENABLE/FORCE ROW LEVEL SECURITY` idempotent. KHÔNG thay policy `hrp_worker_scope` (PERMISSIVE). | CHOSEN |
| `DEC-03` | Idempotent/convergent: `DROP POLICY IF EXISTS` ở đầu + query `pg_policy` để guard chỉ CREATE khi thiếu, áp dụng cho cả clean install (chưa có policy cũ) và DB đã có policy cũ (`hrp_workers_no_delete`). Cả hai đường converge về cùng trạng thái: chỉ có `hrp_workers_delete_admin USING (hrp_session_role() = 'ADMIN')` RESTRICTIVE FOR DELETE. | CHOSEN |
| `DEC-04` | KHÔNG thêm DROP POLICY cho `hrp_worker_scope` (PERMISSIVE) — admin vẫn thấy row đó (và mọi role khác cũng vậy); chỉ thay policy RESTRICTIVE DELETE. Giữ nguyên SELECT/INSERT/UPDATE scope. | CHOSEN |
| `DEC-05` | KHÔNG thay đổi `app_user_writer`/`app_user` GRANT; chỉ RLS policy. | CHOSEN |
| `DEC-06` | Integration test dùng ephemeral DB + prune-migrations + apply byte-identical migration file (mirror `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` pattern). Hai flow: (a) clean install + new migration, (b) legacy DB (seed `hrp_workers_no_delete USING false` thủ công) + new migration → cùng trạng thái. | CHOSEN |
| `DEC-07` | Policy introspection trong integration test: query `pg_policy` + `pg_class` xác nhận (a) `hrp_workers_no_delete` KHÔNG còn; (b) `hrp_workers_delete_admin` tồn tại RESTRICTIVE FOR DELETE USING; (c) `workers` table có `relrowsecurity=true` và `relforcerowsecurity=true`. | CHOSEN |
| `DEC-08` | Role × delete matrix test: ADMIN → delete OK; HR_MANAGER/DIRECTOR/non-admin-khác → RLS deny (zero-row affected). Dùng `app_user_writer` connection (RLS-enforcing). KHÔNG dùng BYPASSRLS để lượt assertion runtime. | CHOSEN |
| `DEC-09` | Dependency sweep integration test: ADMIN xóa Worker có LaborProfile (hoặc bất kỳ dependency nào trong 15 bảng) vẫn trả 409 `WORKER_NOT_DELETABLE` typed; Worker + dependency KHÔNG bị thay đổi. Verify bằng đếm row trước/sau qua `app_user_writer`. | CHOSEN |
| `DEC-10` | KHÔNG tạo P2025 typed mapping ở application layer. PR #115 catch-all 500 giữ nguyên. Nếu concurrent delete thật xảy ra, `re-read` dưới lock trong `deleteWorker` đã phát hiện + throw `NOT_FOUND` 404 typed (line ~679 service). | CHOSEN |
| `DEC-11` | Build vs Adopt = `N/A`. Lý do: (a) không thêm package mới; (b) migration forward-only DROP + CREATE policy đã dùng cú pháp chuẩn PostgreSQL; (c) integration test mirror pattern đã có sẵn trong `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts`. | CHOSEN |
| `DEC-12` | Build vs Automate = `N/A`. Lý do: không tạo/thay connector, scheduler, notification worker hay multi-system workflow. | CHOSEN |
| `DEC-13` | Lane = STANDARD, Audit = NONE. Risk acceptance: T0 §0 đã chốt cho hotfix RLS forward-only. Tier 1 tự review 3 rủi ro trọng yếu: (R-01) migration idempotent/convergent; (R-02) policy đúng semantic (chỉ ADMIN, không HR_MANAGER); (R-03) dependency sweep vẫn ức chế qua RLS khác. | CHOSEN |
| `DEC-14` | KHÔNG sửa `prisma/schema.prisma` (không thêm field); không sửa `app/api/workers/[id]/route.ts` (catch-all 500 tiếng Việt PR #115 OK); không sửa `src/domains/workforce/worker.service.ts` (deleteWorker đúng spec T1B); không sửa các static test fence PR #115. | CHOSEN |
| `DEC-15` | Timestamp chọn `20261007000000_t1b_pre_p2_worker_delete_rls` (an toàn trước mọi migration trên main + không collide hotfix song song). Nếu CI báo conflict timestamp, Tier 1 được phép bump nhưng vẫn forward-only; không rebase/force-push. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| RLS policy (RESTRICTIVE DELETE) | `pg_policy` PostgreSQL standard | `N/A` (PostgreSQL built-in) | n/a | n/a | n/a | Standard SQL `CREATE POLICY ... AS RESTRICTIVE FOR DELETE USING (predicate)`. |
| `app_user_writer` role + `set_config(...)` GUC | `src/shared/auth/rls-context.ts` (DEC-02) | `N/A` (reused) | n/a | n/a | n/a | `hrp_session_role()` đã có sẵn ở `prisma/migrations/20260816210000_s1_rls_worker/migration.sql` line 33. |
| Integration test pattern (ephemeral DB + prune migrations + psql + apply byte-identical) | `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` | `N/A` (reused) | n/a | n/a | n/a | Pattern đã chứng minh ở AC-02..AC-06. Mirror cho AC-01..AC-08. |
| Worker delete unit (vanilla fixture) | `src/domains/workforce/__tests__/worker.service.test.ts` | `N/A` (reused) | n/a | n/a | n/a | `deleteWorker` đã có fence đầy đủ (PERMISSION_DENIED, NOT_FOUND, WORKER_NOT_DELETABLE 14 cases, race re-read). T1B hotfix này KHÔNG sửa. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Migration deploy | `prisma migrate deploy` + ops script hiện hữu | `N/A` (repo-owned) | n/a | T0-controlled | Migration forward-only + idempotent guard | `git log --merges` | Production migration = `NOT_RUN`. T0 §"Không tự merge/deploy/sửa production". |
| `deleteWorker` mutation | `withDbContext` + advisory lock + audit + outbox | `N/A` (reused) | n/a | Repo-owned | Có sẵn (withIdempotency + advisory lock) | Có sẵn (auditLog + outboxEvent) | T1B freeze T1B-business invariant; T1B hotfix này KHÔNG chỉnh. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Migration forward-only tên `prisma/migrations/<timestamp>_t1b_pre_p2_worker_delete_rls/migration.sql` (timestamp `20261007000000` hoặc lớn hơn, strictly greater than tất cả migration hiện hữu). Nội dung chính xác: `BEGIN;` ... `COMMIT;`. |
| `RQ-02` | Migration section 1 (idempotent guard): query `pg_policy` qua `pg_class`/`pg_namespace` để xác nhận policy `hrp_workers_no_delete` có/khên tá trên `public.workers`. Bind `relnamespace = 'public'::regnamespace` và `relname = 'workers'`, không match tên trùng ở schema khác. |
| `RQ-03` | Migration section 2 (convergent): `DROP POLICY IF EXISTS hrp_workers_no_delete ON workers;` (idempotent — DROP IF EXISTS xanh cả khi chưa tồn tại). |
| `RQ-04` | Migration section 3 (CREATE): `DROP POLICY IF EXISTS hrp_workers_delete_admin ON workers;` (idempotent — phòng legacy DB có policy cũ); `CREATE POLICY hrp_workers_delete_admin ON workers AS RESTRICTIVE FOR DELETE TO app_user_writer, app_user USING (hrp_session_role() = 'ADMIN');`. |
| `RQ-05` | Migration section 4 (idempotent FORCE guard): `DO $$ BEGIN IF NOT EXISTS (... relforcerowsecurity=true cho public.workers) THEN ALTER TABLE workers FORCE ROW LEVEL SECURITY; END IF; END $$;`. Tương tự cho `ENABLE`. |
| `RQ-06` | Migration section 5 (assertion): query `pg_policy` xác nhận (a) `hrp_workers_no_delete` KHÔNG còn trên `public.workers`; (b) `hrp_workers_delete_admin` tồn tại với `permissive = false` (RESTRICTIVE) + `cmd = 'd'` (DELETE) + `qual::text LIKE '%hrp_session_role()%ADMIN%'`; (c) `workers` đã FORCE RLS. Assertion fail thì `RAISE EXCEPTION` để rollback migration. |
| `RQ-07` | `npx prisma validate` xanh (không thay `schema.prisma` → command chỉ verify file nguyên trạng). |
| `RQ-08` | `npx prisma generate` xanh (Prisma client types không đổi). |
| `RQ-09` | Migration KHÔNG chứa `BYPASSRLS`, `ALTER ROLE ... BYPASSRLS`, hoặc bất kỳ `withSystemDb`/`admin DB URL` raw connection hack. |
| `RQ-10` | Migration KHÔNG thay đổi policy `hrp_worker_scope` (PERMISSIVE); chỉ RESTRICTIVE DELETE mới. |
| `RQ-11` | Migration KHÔNG DROP TABLE, KHÔNG RENAME TABLE/COLUMN, KHÔNG CREATE FUNCTION mới (chỉ dùng helper có sẵn: `hrp_session_role()`). |
| `RQ-12` | Integration test `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts`: file mới, register trong `vitest.integration-files.ts`. Self-skip khi `DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST` absent (ENV_BLOCKED per directive DEC-01). |
| `RQ-13` | Integration test case 1 (clean install + AC-01): ephemeral DB + prune migrations (không bao gồm migration mới) + `prisma migrate deploy` → predecessor state. Apply migration mới byte-identical. Verify `pg_policy`: (a) `hrp_workers_no_delete` KHÔNG tồn tại; (b) `hrp_workers_delete_admin` tồn tại RESTRICTIVE DELETE; (c) `workers` FORCE RLS. |
| `RQ-14` | Integration test case 2 (legacy DB + AC-01): ephemeral DB + prune migrations (KHÔNG bao gồm migration mới) + `prisma migrate deploy` → predecessor state. Seed policy `hrp_workers_no_delete USING false` thủ công (simulate production state). Apply migration mới. Verify `pg_policy` giống case 1. |
| `RQ-15` | Integration test case 3 (AC-02 ADMIN delete OK): tạo Worker orphan + LaborProfile, với `withDbContext` set `app.role = 'ADMIN'`. Gọi `tx.worker.delete` qua service. Verify row deleted, audit log ghi `WORKER_PERMANENT_DELETE`, outbox event ghi `WorkerPermanentlyDeleted`. |
| `RQ-16` | Integration test case 4 (AC-03 HR_MANAGER delete deny): set `app.role = 'HR_MANAGER'`. Gọi `tx.worker.delete`. Verify Prisma throw P2025 (RLS filter → zero-row affected). Worker vẫn còn nguyên. |
| `RQ-17` | Integration test case 5 (AC-04 DIRECTOR delete deny): set `app.role = 'DIRECTOR'`. Verify tương tự case 4. |
| `RQ-18` | Integration test case 6 (AC-05 non-admin khác delete deny): set `app.role = 'HR_STAFF'` (hoặc `SALE`/`PM`/`WORKER`/...). Verify tương tự case 4. |
| `RQ-19` | Integration test case 7 (AC-06 ADMIN delete Worker có LaborProfile): tạo Worker + LaborProfile liên kết. Set `app.role = 'ADMIN'`. Gọi `tx.worker.delete`. Verify Prisma throw P2025 (do dependency sweep ở service throw WORKER_NOT_DELETABLE trước, nhưng test này trực tiếp Prisma để chứng minh RLS không can thiệp ở sweep). Worker vẫn còn nguyên. |
| `RQ-20` | Integration test case 8 (AC-07 migration idempotent re-apply): apply migration lần 2 trên cùng ephemeral DB (case 1). Verify KHÔNG throw, idempotent guard hoạt động. |
| `RQ-21` | Unit tests của PR #115 vẫn xanh: `npm run test:unit` exit 0 cho `src/domains/workforce/__tests__/*.test.ts` + `app/api/workers/[id]/__tests__/*.test.ts` (route-delete-500.static, route-get-patch-delete, worker.service, worker-delete-error-labels, worker-delete-button.static). |
| `RQ-22` | Toàn bộ unit suite (`npm run test:unit`) exit 0. |
| `RQ-23` | Full typecheck (`npm run typecheck`) exit 0; lint (`npm run lint`) exit 0; build (`npm run build`) exit 0; `git diff --check` exit 0; `pwsh .ai-pipeline/scripts/verify-encoding.ps1` exit 0. |

### 4.2 Scope boundaries

- **In:** migration forward-only 1 file; integration test 1 file; register file trong `vitest.integration-files.ts`; `docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/{TASK.md,HANDOFF.md}`.
- **Out:** sửa `prisma/schema.prisma`; sửa `app/api/workers/[id]/route.ts` (catch-all 500 PR #115 OK); sửa `src/domains/workforce/worker.service.ts` (deleteWorker đúng spec T1B); sửa `src/domains/workforce/worker.types.ts`; sửa `app/admin/workers/[id]/worker-delete-button.tsx` (modal tiếng Việt PR #115 OK); sửa `src/domains/workforce/worker-delete-error-labels.ts`; sửa các static test fence PR #115; dependency sweep 15 bảng; advisory lock `hrp:worker:<id>`; `withDbContext` / `applyRlsContext` GUC; audit log `WORKER_PERMANENT_DELETE`; outbox event `WorkerPermanentlyDeleted`; ADMIN-only route guard; PR #115 catch-all 500; production migration (NOT_RUN); production deploy; merge; thay đổi các migration cũ; tạo P2025 typed mapping ở application layer; mở DELETE cho HR_MANAGER / DIRECTOR / role khác ở RLS layer; cascade / set-null thêm ở app layer; BYPASSRLS / admin DB URL hack; sửa các integration test hiện hữu không liên quan.
- **Allowed task artifacts:** `docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/**`.

### 4.3 Domain boundaries

- **Data/state:** `Worker` schema không đổi. RLS policy cho `workers` chỉ RESTRICTIVE DELETE thay đổi. SELECT/INSERT/UPDATE qua `hrp_worker_scope` (PERMISSIVE) giữ nguyên. Dependency sweep 15 bảng giữ nguyên. Audit log + outbox giữ nguyên.
- **Permission/security:** Route gate ADMIN-only giữ nguyên (`ctx.role !== 'ADMIN'`). RLS `hrp_workers_delete_admin USING (hrp_session_role() = 'ADMIN')` RESTRICTIVE là defense-in-depth — nếu route bị bypass, RLS vẫn chặn non-ADMIN. ADMIN vẫn thấy row qua `hrp_worker_scope` (PERMISSIVE). HR_MANAGER / DIRECTOR vẫn thấy row nhưng bị RESTRICTIVE chặn DELETE.
- **Interface/API:** KHÔNG thay đổi API contract. DELETE `/api/workers/[id]` vẫn 200/403/404/409/410/500 semantics như T1B + PR #115. Catch-all 500 message tiếng Việt giữ nguyên.
- **Migration/rollback:** Forward-only ADD-only RLS policy replacement (DROP IF EXISTS + CREATE). KHÔNG DROP TABLE/COLUMN. KHÔNG RENAME. KHÔNG CREATE FUNCTION. Migration timestamp `20261007000000` hoặc lớn hơn. Production migration = `NOT_RUN`.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Worktree setup | Worktree `codex/t1b-pre-p2-worker-delete-rls-hotfix` đã tồn tại tại `C:\CodeApp\HrP-t1b-pre-p2-worker-delete-rls-hotfix`, branch từ `origin/main@7f570412`. | `git rev-parse HEAD` | Nếu baseline không khớp 40-char SHA hex → dừng |
| `STEP-02` | `prisma/migrations/<timestamp>_t1b_pre_p2_worker_delete_rls/migration.sql` (NEW) | Viết migration SQL idempotent/convergent theo RQ-02..RQ-06. | `cat migration.sql` | SQL có DROP TABLE / RENAME / CREATE FUNCTION / BYPASSRLS |
| `STEP-03` | `npx prisma validate` + `npx prisma generate` | Schema nguyên trạng → validate + generate xanh. | `npx prisma validate`; `npx prisma generate` | Fail |
| `STEP-04` | `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts` (NEW) | Viết integration test 8 case theo RQ-13..RQ-20. Mirror pattern `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts`. | `cat test file` | Thiếu case AC-01..AC-07; không self-skip |
| `STEP-05` | `vitest.integration-files.ts` | Register test file mới + comment block. | `grep t1b-pre-p2-worker-delete vitest.integration-files.ts` | Không register |
| `STEP-06` | Canonical gates | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `git diff --check`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`. | tất cả exit 0 | Gate fail |
| `STEP-07` | Integration lane | `npm run test:integration` (DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST do T0 cung cấp; nếu thiếu → ENV_BLOCKED ghi BLOCKED trong HANDOFF). | `npm run test:integration` | ENV_BLOCKED không có evidence |
| `STEP-08` | Commit + HANDOFF | Commit semantic implementation (1 commit cho migration + integration test + registration; nếu cần có thể tách 2 commit: migration + tests). Pin exact `Implementation SHA` trong HANDOFF.md. | mở PR; rộng CI 4/4 GREEN | HANDOFF thiếu `Implementation SHA` |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Migration SQL đúng semantic: `DROP POLICY IF EXISTS hrp_workers_no_delete ON workers` + `DROP POLICY IF EXISTS hrp_workers_delete_admin ON workers` + `CREATE POLICY hrp_workers_delete_admin ON workers AS RESTRICTIVE FOR DELETE TO app_user_writer, app_user USING (hrp_session_role() = 'ADMIN')`. KHÔNG DROP TABLE, RENAME, CREATE FUNCTION, BYPASSRLS. | `cat migration.sql`; `grep -E "DROP TABLE\|RENAME\|CREATE FUNCTION\|BYPASSRLS" migration.sql` exit 1 (no match) |
| `AC-02` | Migration idempotent/convergent: clean install + legacy DB (seed `hrp_workers_no_delete USING false` thủ công trước apply) → cùng trạng thái sau apply: `hrp_workers_no_delete` KHÔNG còn, `hrp_workers_delete_admin` RESTRICTIVE DELETE tồn tại, `workers` FORCE RLS. | `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts` case 1 + case 2; `pg_policy` introspection |
| `AC-03` | ADMIN xóa được Worker orphan qua `app_user_writer` connection (RLS-enforcing). Row biến mất; audit log `WORKER_PERMANENT_DELETE` ghi trong transaction; outbox event `WorkerPermanentlyDeleted` cùng transaction. | `npx vitest run --config vitest.integration.config.ts -t "AC-03 admin delete orphan"` exit 0; `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts` case 3 |
| `AC-04` | HR_MANAGER không xóa được Worker orphan. Prisma throw P2025 (RLS filter zero-row). Worker vẫn còn nguyên. | `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts` case 4 |
| `AC-05` | DIRECTOR không xóa được Worker orphan. Prisma throw P2025. Worker vẫn còn nguyên. | case 5 |
| `AC-06` | Non-admin khác (HR_STAFF) không xóa được Worker orphan. Prisma throw P2025. Worker vẫn còn nguyên. | case 6 |
| `AC-07` | Migration idempotent re-apply: apply migration lần 2 trên cùng DB → KHÔNG không throw, idempotent guard hoạt động. | `npx vitest run --config vitest.integration.config.ts -t "AC-07 idempotent re-apply"` exit 0; case 8 |
| `AC-08` | Service-level WORKER_NOT_DELETABLE: ADMIN xóa Worker có LaborProfile → `deleteWorker` service throw `WorkerServiceError('WORKER_NOT_DELETABLE', ..., { blockingFacts: ['LABOR_PROFILE'] })`. Verify Worker + LaborProfile đều KHÔNG bị thay đổi. Có thể cover bằng unit test trong `src/domains/workforce/__tests__/worker.service.test.ts` (đã có 14 cases); hoặc bằng integration test qua `withDbContext` + real DB. | `npx vitest run src/domains/workforce/__tests__/worker.service.test.ts` exit 0; hoặc `npx vitest run --config vitest.integration.config.ts -t "AC-08 worker with labor profile"` exit 0 |
| `AC-09` | Policy introspection xác nhận: `pg_policy` cho `public.workers`: (a) `hrp_workers_no_delete` KHÔNG còn; (b) `hrp_workers_delete_admin` tồn tại với `permissive = false` + `cmd = 'd'` + `qual::text LIKE '%hrp_session_role()%ADMIN%'`; (c) `workers` table có `relrowsesecurity=true` + `relforcerowsecurity=true`. | `npx vitest run --config vitest.integration.config.ts -t "AC-09 policy introspection"` exit 0; `psql "$DATABASE_URL_TEST" -c "SELECT polname, polcmd, polpermissive FROM pg_policy WHERE polrelid = 'workers'::regclass;"` |
| `AC-10` | PR #115 unit/static tests vẫn xanh: `src/domains/workforce/__tests__/worker-delete-button.static.test.ts` + `app/api/workers/[id]/__tests__/route-delete-500.static.test.ts` + `src/domains/workforce/__tests__/worker-delete-error-labels.test.ts` + `src/domains/workforce/__tests__/worker.service.test.ts`. | `npm run test:unit` exit 0 |
| `AC-11` | Toàn bộ unit suite xanh. | `npm run test:unit` exit 0 |
| `AC-12` | Typecheck / lint / build / encoding / git-diff-check xanh. | `npm run typecheck`; `npm run lint`; `npm run build`; `git diff --cached --check`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1` |
| `AC-13` | Integration lane xanh (nếu env READY) hoặc ENV_BLOCKED có rõ ràng evidence thiếu env. | `npm run test:integration` |
| `AC-14` | `vitest.integration-files.ts` đã register file test integration mới. | `grep t1b-pre-p2-worker-delete vitest.integration-files.ts` |
| `AC-15` | HANDOFF.md pin exact `Implementation SHA`. Mô tả ngắn gọn (40-60 dòng): (a) PR #115 Việt hóa + safe error; PR hotfix này mới sửa root cause RLS; (b) migration name; (c) test/gate evidence; (d) blocker (nếu có). | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/HANDOFF.md` exit 0 |

### 6.2 Traceability

| Requirement | Step | Acceptance | |
|---|---|---|---|
| RQ-01 | STEP-02 | AC-01 | |
| RQ-02 | STEP-02 | AC-01 | |
| RQ-03 | STEP-02 | AC-01 | |
| RQ-04 | STEP-02 | AC-01 | |
| RQ-05 | STEP-02 | AC-01 | |
| RQ-06 | STEP-02 | AC-01 | |
| RQ-07 | STEP-03 | AC-01 | |
| RQ-08 | STEP-03 | AC-01 | |
| RQ-09 | STEP-02 | AC-01 | |
| RQ-10 | STEP-02 | AC-01 | |
| RQ-11 | STEP-02 | AC-01 | |
| RQ-12 | STEP-04 | AC-14 | |
| RQ-13 | STEP-04 | AC-02 | |
| RQ-14 | STEP-04 | AC-02 | |
| RQ-15 | STEP-04 | AC-03 | |
| RQ-16 | STEP-04 | AC-04 | |
| RQ-17 | STEP-04 | AC-05 | |
| RQ-18 | STEP-04 | AC-06 | |
| RQ-19 | STEP-04 | AC-07 | |
| RQ-20 | STEP-04 | AC-08 | |
| RQ-21 | STEP-06 | AC-10 | |
| RQ-22 | STEP-06 | AC-11 | |
| RQ-23 | STEP-06 | AC-12 | |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Migration timestamp collision: nếu Tier 1 dùng timestamp trùng hotfix song song. | Trước khi mkdir, `Get-ChildItem prisma/migrations -Directory \| Sort-Object Name` kiểm tra latest; dùng `20261007000000_t1b_pre_p2_worker_delete_rls` (strictly greater than tất cả migration hiện hữu trên main). Nếu CI báo conflict, Tier 1 bump timestamp; vẫn forward-only. |
| `RISK-02` | Policy semantic sai: nếu predicate dùng `hrp_session_role() IN ('ADMIN', 'HR_MANAGER')` thì mở DELETE cho HR_MANAGER → vi phạm spec. | Review kỹ trước commit: predicate phải là `hrp_session_role() = 'ADMIN'` đơn lẻ. AC-04/AC-05 integration test xác nhận HR_MANAGER/DIRECTOR DENY. |
| `RISK-03` | DROP POLICY khôn idempotent: `DROP POLICY IF EXISTS` đã idempotent ở PG ≥ 13. Repo dùng PG ≥ 16 (per env). Verify `select version();` trong preflight. |
| `RISK-04` | Migration làm vỡ FORCE RLS assertion fail ở production do Postgres version mismatch. | Idempotent guard `IF NOT EXISTS (...) ALTER TABLE ... FORCE ROW LEVEL SECURITY` đã cover. Assertion cuối chỉ `RAISE EXCEPTION` nếu thiếu FORCE; production luôn FORCE rồi (T0 evidence). |
| `RISK-05` | Integration test cleanup fail (private-by). | Mirror `tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts` `afterAll` cleanup registry; pseudo-root + ephemeral DB đều tracked. Cleanup error surface (không swallow). |
| `RISK-06` | Legacy DB có policy tên khác (`hrp_worker_delete_admin` cũ do DBA đặt tay) → DROP IF EXISTS vẫn work; nhưng nếu policy khác cùng tên ở schema khác → bind `relnamespace = 'public'::regnamespace` để scope chặt. | Migration scope query dùng `relnamespace` bind. |
| `RISK-07` | `hrp_session_role()` chưa được tạo trên clean install. | Helper `hrp_session_role()` đã có ở `prisma/migrations/20260816210000_s1_rls_worker/migration.sql` line 28 + được tạo lại idempotent ở `20260821103500_m13_restore_rls_matrix`. Mọi migration sau đó đều kế thừa. |
| `RISK-08` | Owner-driven admin policy thay đổi trong tương lai cùng tên `hrp_workers_delete_admin` (ví dụ mở cho HR_MANAGER). | Out-of-scope; T0/Tier 0 sẽ mở round mới. Migration idempotent DROP IF EXISTS + CREATE đảm bảo luôn converge về semantic mới nhất. |
| `RISK-09` | PR #115 catch-all 500 vẫn ở route handler; nếu RLS fixed xong, route sẽ không bao giờ trả 500 P2025 nữa. Catch-all vẫn còn nhưng không trigger. | Tier 1 không chỉnh route; static fence PR #115 giữ nguyên. AC-10 xác nhận fence vẫn xanh. |
| `RISK-10` | Production migration deploy sai cumulative chain (admin quên re-run migration mới). | Out-of-scope (T0-controlled). HANDOFF ghi rõ: production migration = `NOT_RUN`, T0 chạy riêng qua gate. |

## 8. Open Questions

- None. T0 §0 đã chốt toàn bộ Owner decisions: migration semantic (DROP `hrp_workers_no_delete` + CREATE `hrp_workers_delete_admin` RESTRICTIVE DELETE USING `hrp_session_role() = 'ADMIN'`), idempotent/convergent cho cả clean install và legacy DB, không BYPASSRLS, không cascade, không P2025 typed mapping, không sửa data production, giữ nguyên dependency sweep 15 bảng + advisory lock + audit + outbox + ADMIN-only route guard + PR #115 catch-all 500, lane `STANDARD` + audit `NONE` + correction budget 1 + production migration `NOT_RUN`.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | T0 directive §0 đã chốt đủ Owner decisions; contract `READY_TO_CODE`. Tier 1 tự review 3 rủi ro trọng yếu (idempotent migration, predicate đúng semantic, integration test coverage AC-01..AC-09) trước freeze. | T0 §0 đầy đủ. Tier 1 không cần hỏi thêm. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-07` | Initial TASK.md authored. Baseline `7f5704123cbe0ae52c897b38c8afdd3f14358c78` (origin/main post-#115). Status `READY_FOR_EXECUTION`. Contract gate `READY_TO_CODE`. Lane `STANDARD`, Audit `NONE`. Correction budget `1`. Migration forward-only DROP+CREATE RESTRICTIVE DELETE policy ADMIN-only; integration test 8 case mirror pattern `aff05a-r2-bounded-manager-assignment`; KHÔNG chỉnh route/service/types/UI/static fence PR #115. | T0 directive §0 chốt outcome/boundary/lane/audit. |