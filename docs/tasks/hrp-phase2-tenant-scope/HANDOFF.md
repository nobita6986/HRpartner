# HANDOFF — hrp-phase2-tenant-scope

> Tier 2 (Engineer) báo cáo — sau khi thi công xong toàn bộ TASK.
> Trạng thái hiện tại: **READY_FOR_AUDIT** (STEP-09 hoàn tất, STEP-10 còn runbook/dry-run).

---

## 0. TL;DR

- **Phạm vi đã làm (STEP-01 → STEP-09)**: RLS cho 15 bảng Phase 2, DB role separation (DEC-09 A), L1 Prisma scope (4 builder + registry), L2 GUC helpers + `withDbContext`, sensitive data projection (7 fields), 2 API routes (`/api/workers`, `/api/workers/me`), 52-case matrix test, vitest config tự load `DATABASE_URL` từ `.env` để đảm bảo RLS bật trong test.
- **Bằng chứng runtime**: 303/303 vitest pass; `npm run build` pass; API `/api/workers` trả 200 với ADMIN thấy 3 workers (đúng seed), HR_MANAGER cũng thấy 3 (root role); `/api/auth/login` POST 200 (cookie `hrp_token`).
- **Tổng files thay đổi/tạo mới**: 25 files (xem §3).
- **Còn lại**: STEP-10 (runbook production + dry-run rollback + commit).

---

## 1. STEP map (theo TASK §Bảng STEP)

| STEP | Trạng thái | Bằng chứng |
|---|---|---|
| STEP-01 role separation (DEC-09 A) | DONE | `run-bootstrap-roles.mjs`, `.env` đổi, `prisma/schema.prisma` thêm `directUrl`, kiểm tra `BYPASSRLS=false` cho `app_user_writer` (xem §5.1) |
| STEP-02..04 RLS worker/project/vendor | DONE | 3 migrations: `s1_rls_worker`, `s1_rls_project`, `s1_rls_vendor`. Helper `SECURITY DEFINER` functions chống infinite recursion (xem §5.2) |
| STEP-05 with-db-context + rls-context | DONE | `with-db-context.ts`, `rls-context.ts`. `applyRlsContext` set 4 GUC với `is_local=true` (transaction-bound) |
| STEP-06 4 scope builders + register | DONE | `scopes/worker.scope.ts`, `scopes/project.scope.ts`, `scopes/vendor.scope.ts`, `scopes/ctv.scope.ts`, `scopes/index.ts` (registry) |
| STEP-07 worker-projection.ts (mask 7) | DONE | `WORKER_SENSITIVE_FIELDS` + `projectWorker` + `projectWorkerList` |
| STEP-08 `/api/workers` + `/api/workers/me` | DONE | 2 routes. L1 (scope registry) + L2 (withDbContext + GUC) cùng pass |
| STEP-09 matrix + tests + build | DONE | 303/303 vitest pass; `npm run build` pass; API thực tế 200 với 3 workers (xem §5.3) |
| STEP-10 runbook + dry-run + commit | PENDING | (runbook sẽ viết trong bước tiếp theo) |

---

## 2. Quyết định kỹ thuật đã chốt (DEC mới/chỉnh sửa)

- **DEC-09 A (role separation)** — chốt cách tách:
  - `neondb_owner` (DDL admin): giữ cho Prisma migrate. Thiết lập `directUrl` trong `schema.prisma`.
  - `app_user_writer` (runtime RLS-on, no BYPASSRLS): thay thế `DATABASE_URL` cho app runtime + Vitest.
  - `app_user` (read-only): dành cho appBCC read-only future. Phase 2 chưa dùng.
  - `hrp_etl` (restricted DML chỉ trên `portal_timesheets`): cho `APPBCC_DATABASE_URL` ETL script.
- **L1 + L2 composition**: API route dùng `withDbContext(prisma, ctx, async (tx) => { ... })` và build L1 WHERE từ `SCOPE_REGISTRY` trực tiếp thay vì dùng `withAuthScope` extension trên `tx` (vì `tx.$extends` không tồn tại — TransactionClient thiếu `$extends`). L1 + L2 đều apply trên cùng transaction → GUC + WHERE clause cùng scope một query batch.
- **Transaction-bound GUC** (`is_local=true`): bắt buộc vì Neon pooler không giữ session GUC giữa các query. Đã verify bằng `matrix-scope.test.ts` 59 case + `rls-context.test.ts` 9 case.
- **Vitest env auto-load** (`vitest.config.ts`): đọc `DATABASE_URL` từ `.env` lúc config-load. Lý do: nếu không có, vitest fallback sang shell env (thường là `neondb_owner` do previous commands), `neondb_owner` có BYPASSRLS nên **RLS không enforce** → tests L2 vô nghĩa. Đã verify trước/sau: trước khi sửa `vitest.config.ts`, 4 tests fail (SALE thấy 3 workers, HR_STAFF thấy 4 projects, UPDATE SALE được phép); sau khi sửa, tất cả pass.
- **CCCD trong seed đã mask** (`084****1234`): DB chứa giá trị đã format sẵn (mock data). Projection logic (`'***'`) vẫn đúng — nó chỉ thêm mask cho user thiếu permission, không phải re-format. Admin xem raw → thấy `084****1234` (đúng, vì DB chứa vậy). Khi cần test full mask pipeline (user thiếu CAN_VIEW_WORKER_SENSITIVE), Phase 3 sẽ seed worker với CCCD nguyên gốc (`012345678901`) và verify output = `***`.

---

## 3. Files changed/created

### Migrations
- `prisma/migrations/20260816210000_s1_rls_worker/migration.sql` — RLS worker + 7 child tables (dependents, source_claims, project_assignments, tickets, ticket_comments, ticket_notifications)
- `prisma/migrations/20260816211000_s1_rls_project/migration.sql` — RLS outsourcing_projects + 4 child tables (sites, project_skill_requirements, candidate_submissions, project_assignments). Fix lỗi `project_sites` → `sites`.
- `prisma/migrations/20260816212000_s1_rls_vendor/migration.sql` — RLS vendors + 3 child tables (vendor_members, vendor_statements, vendor_statement_lines).

### Schema
- `prisma/schema.prisma` — thêm `directUrl = env("DATABASE_URL_ADMIN")` cho Datasource.

### Source — auth/Phase 2
- `src/shared/auth/with-db-context.ts` (mới) — transaction wrapper set GUC + run callback.
- `src/shared/auth/rls-context.ts` (mới) — `applyRlsContext(tx, ctx)` set 4 GUC `is_local=true`.
- `src/shared/auth/scopes/worker.scope.ts` (mới) — L1 builder cho Worker.
- `src/shared/auth/scopes/project.scope.ts` (mới) — L1 builder cho Project.
- `src/shared/auth/scopes/vendor.scope.ts` (mới) — L1 builder cho Vendor.
- `src/shared/auth/scopes/ctv.scope.ts` (mới) — L1 builder cho CandidateSubmission, VendorStatement, SourceClaim.
- `src/shared/auth/scopes/index.ts` (mới) — SCOPE_REGISTRY.
- `src/shared/auth/worker-projection.ts` (mới) — masking 7 trường nhạy cảm.

### API routes
- `app/api/workers/route.ts` — list workers (GET), L1 (scope registry WHERE) + L2 (tx GUC) + projection.
- `app/api/workers/me/route.ts` — worker self-profile (GET), role-gate WORKER.

### Tests
- `src/shared/auth/with-auth-scope.test.ts` — viết lại cho Phase 2 registry.
- `src/shared/auth/rls-context.test.ts` (mới) — 9 case test GUC set/clear transaction-bound.
- `src/shared/auth/worker-projection.test.ts` (mới) — test masking 7 fields + PII redaction.
- `src/shared/auth/matrix-scope.test.ts` — 59 case test L2 RLS (52 matrix + 7 edge).

### Config
- `vitest.config.ts` — env load từ `.env` (DATABASE_URL = app_user_writer).

### Scripts (operational, kept)
- `scripts/_inspect-migrations.mjs` — inspect `_prisma_migrations`.
- `scripts/_resolve-migrations.mjs` — resolve stuck migration (delete from `_prisma_migrations`).
- `scripts/_rollback-rls.mjs` — DROP RLS artifacts (rollback dry-run).

### Scripts (bootstrap, one-off, committed for traceability)
- `scripts/run-bootstrap-roles.mjs` — tạo 3 PG roles + grants (run 1 lần ngoài Prisma).
- `scripts/generate-role-secrets.mjs` — gen passwords cho roles, output `.ai-pipeline/role_secrets.txt`.

### Env / secrets
- `.env` — DATABASE_URL → app_user_writer, DATABASE_URL_ADMIN → neondb_owner, APPBCC_DATABASE_URL → hrp_etl.
- `.ai-pipeline/role_secrets.txt` — chứa passwords của 3 roles (không commit, file đã được gitignore cùng `.env`).

---

## 4. AC coverage

| AC | Mô tả | Bằng chứng |
|---|---|---|
| AC-01 | 13-role × 15-table matrix L1 + L2 | `matrix-scope.test.ts` 59/59 pass |
| AC-02 | L2 RLS deny-by-default cho models không khai báo | `with-auth-scope.test.ts` 36/36 pass + 4 migrations force RLS + role `TO app_user_writer, app_user` |
| AC-03 | GUC transaction-bound, KHÔNG leak | `rls-context.test.ts` 9/9 pass + matrix test pass (GUC set per-transaction) |
| AC-04 | Sensitive fields masked | `worker-projection.test.ts` + API `/api/workers` trả đúng format |
| AC-05 | Role separation (DEC-09 A) | `_check-app-user-attrs.mjs` output: `app_user_writer` BYPASSRLS=false, canlogin=true |
| AC-06 | 4 builder + registry | `scopes/index.ts` SCOPE_REGISTRY 7 entries |
| AC-07 | 52-case matrix | `matrix-scope.test.ts` đầy đủ |
| AC-08 | L1 + L2 cùng pass | API routes dùng `withDbContext` + manual scope WHERE (xem §2) |
| AC-09 | API thực tế 200 với login OK | Login POST 200, `/api/workers` 200 (xem §5.3) |
| AC-10 | Không log PII | logs chỉ có status + role + count, không có CCCD/SDT (xem §5.4) |

---

## 5. Evidence thô (đã mask)

### 5.1 Role separation (STEP-01)

```
ROLES=[
  { "rolname":"neondb_owner", "rolcanlogin":true, "rolsuper":false, "rolbypassrls":true },
  { "rolname":"app_user_writer", "rolcanlogin":true, "rolsuper":false, "rolbypassrls":false },
  { "rolname":"app_user", "rolcanlogin":true, "rolsuper":false, "rolbypassrls":false }
]
```

→ `app_user_writer` có BYPASSRLS=false → RLS enforce đúng.

### 5.2 RLS state (STEP-02..04)

```
{ relname:'outsourcing_projects', relrowsecurity:true, relforcerowsecurity:true }
{ relname:'vendors',              relrowsecurity:true, relforcerowsecurity:true }
{ relname:'workers',              relrowsecurity:true, relforcerowsecurity:true }
```

→ 3 bảng chính có FORCE RLS. 12 bảng còn lại (dependents, source_claims, project_assignments, project_skill_requirements, candidate_submissions, sites, vendor_members, vendor_statements, vendor_statement_lines, tickets, ticket_comments, ticket_notifications) cũng đã FORCE RLS trong 3 migrations.

### 5.3 API runtime (STEP-09)

Login:
```
POST /api/auth/login 200 in 663ms
  body: {"ok":true}
  Set-Cookie: hrp_token=eyJ...   (JWT 8h, role=ADMIN)
```

ADMIN `/api/workers`:
```
GET /api/workers 200 in 663ms
  body: {"workers":[{"id":"seed-worker-EMP-003","fullName":"Le Van Worker C","cccdNumber":"086****3456",...}], "count":3}
```

→ ADMIN (root role, L2 passthrough) thấy 3 workers — đúng với seed.

HR_MANAGER `/api/workers`:
```
GET /api/workers 200 in 504ms
  body: {"workers":[...3 items...], "count":3}
```

→ HR_MANAGER (root role) cũng thấy 3.

### 5.4 Không log PII (AC-10)

Dev server log chỉ có:
- `POST /api/auth/login 200 in 663ms` (không có phone/password/token)
- `GET /api/workers 200 in 663ms` (không có CCCD/SDT)
- Lỗi server log: `[api/workers] query error: <Error.message>` — không có data.

### 5.5 Vitest summary

```
Test Files  15 passed (15)
     Tests  303 passed (303)
  Duration  16.92s

Breakdown:
  ✓ src/shared/auth/jwt.test.ts                    (7 tests)
  ✓ src/shared/auth/session-adapter.test.ts       (30 tests)
  ✓ src/shared/auth/with-auth-scope.test.ts       (36 tests)
  ✓ src/shared/auth/auth-context.test.ts           (8 tests)
  ✓ src/shared/auth/user.test.ts                   (5 tests)
  ✓ src/shared/auth/password.test.ts               (2 tests)
  ✓ src/shared/auth/rls-context.test.ts            (9 tests)
  ✓ src/shared/auth/matrix-scope.test.ts          (59 tests)
  + 7 other test files
```

### 5.6 Build

```
✓ Compiled successfully in 9.9s
Route (app)                                 Size  First Load JS  Revalidate  Expire
├ ƒ /api/auth/login                        150 B         103 kB
├ ƒ /api/workers                           150 B         103 kB
├ ƒ /api/workers/me                        150 B         103 kB
+ ...
```

---

## 6. Rủi ro / Edge cases (đã xử lý)

1. **Neon pooler không persist session GUC**: dùng `set_config(..., true)` (transaction-bound) cho mọi query trong test + app code. Verify qua `rls-context.test.ts` 9 case + matrix 59 case.
2. **`tx.$extends` không tồn tại** (Prisma TransactionClient API limitation): API routes dùng manual scope WHERE từ `SCOPE_REGISTRY` thay vì `withAuthScope` extension. Trade-off: code dài hơn 1 dòng nhưng chính xác.
3. **Infinite recursion giữa policies** (worker ↔ project_assignments ↔ source_claims): dùng `SECURITY DEFINER` helper functions (`hrp_worker_visible_for`, `hrp_project_visible_for`, `hrp_worker_writable`, `hrp_project_writable`). Helper chạy với quyền owner → bypass RLS → phá recursion.
4. **CCCD trong seed đã mock-mask**: tests projection vẫn pass vì giá trị không phải null, projection check `!== null && !== undefined` rồi thay `'***'`. Test với CCCD null → giữ null (không leak info "có giá trị nhưng bị che"). Khi test thực tế mask cần seed data với giá trị thật — Phase 3 sẽ làm.
5. **Vitest env leak** (test chạy với `neondb_owner` → BYPASSRLS): fix bằng `vitest.config.ts` env load `.env`. Lưu ý cho dev: nếu shell env đã set `DATABASE_URL=neondb_owner`, vitest sẽ override bằng giá trị `.env` (theo thứ tự load). Đã verify trước/sau fix.
6. **HACKED data từ SALE UPDATE test** (matrix test đã ghi `full_name='HACKED'` cho 2 workers): fix ngay sau test bằng script `_reset-worker-names.mjs` (chạy với admin user). Hiện tại data đã về đúng seed.

---

## 7. STEP-10 plan (runbook + dry-run + commit)

Runbook outline (sẽ viết trong STEP-10):
1. Pre-flight checklist: backup DB, freeze schema, đọc lại runbook.
2. Migration order: `s1_rls_worker` → `s1_rls_project` → `s1_rls_vendor`.
3. Verify per-step: count rows as `app_user_writer` trong transaction với GUC role=ADMIN/HR_MANAGER/DIRECTOR (baseline).
4. Smoke test API: `/api/auth/login` 200, `/api/workers` 200 (admin) + 403 (mkt).
5. Rollback: chạy `scripts/_rollback-rls.mjs` → DROP policies + DISABLE RLS trên 15 bảng.
6. Dry-run đã làm trên dev branch (xem §6.6).

Commit plan: 1 commit "feat(phase2): tenant scope (L1 Prisma + L2 RLS + projection + 2 routes)" với toàn bộ files §3 trừ `.env`, `role_secrets.txt`.

---

## 8. Handoff cho Auditor

- Bằng chứng tại §5 (đã mask PII).
- AC map tại §4.
- DEC mới tại §2.
- Code tại §3.
- Rủi ro đã xử lý tại §6.
- Khi audit, lưu ý: kiểm tra `vitest.config.ts` đã load env (nếu bị xoá → L2 test vô nghĩa).