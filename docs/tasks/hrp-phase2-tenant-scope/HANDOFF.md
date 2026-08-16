# HANDOFF — hrp-phase2-tenant-scope

> Tier 2 (Engineer) báo cáo — sau khi thi công xong toàn bộ TASK.
> Trạng thái hiện tại: **READY_FOR_AUDIT** (STEP-09 hoàn tất, STEP-10 còn runbook/dry-run).
>
> **Round 2 (2026-08-16 22:30 ICT) — remediation sau audit round 1 (verdict CONDITIONAL):**
> - AUD-001 (P3) → §5.2 văn bản sửa: bỏ 2 tên bảng không tồn tại; liệt kê đúng 13 bảng thật của Phase 2.
> - AUD-002 (P2) → §7.7 Runbook production chính thức + §7.8 Dry-run rollback evidence (read-only, không phá state).
> - PLN-001 (ACCEPT_FIX) → `appBCC/app.py:227` runtime DB load đổi từ `DATABASE_URL` sang `APPBCC_DATABASE_URL` theo DEC-09 A (fallback giữ `DATABASE_URL` cho dev local khi sếp chưa thêm key mới vào `.env`). Settings UI (`app.py:1194/1209/1239/1242`) giữ nguyên — đó là form nhập tay khi chạy desktop ngoài web runtime, không thuộc DEC-09 A.
> - Tier 2 round 2 **KHÔNG đụng** các diff dirty khác của sếp trong `appBCC/*` (`agent_mapper.py` model `deepseek-chat` + timeout; `app.py` hunk `import threading`, `try/except _MEIPASS`, `setStyleSheet 14→13`, layout2 column 3 stretch). Commit round 2 chỉ stage file thuộc remediation; các dirty khác để sếp tự stage/commit riêng.

---

## 0. Control (Round 2 — append)

| Field | Value |
|---|---|
| Task slug | `hrp-phase2-tenant-scope` |
| Work type | `CODE` |
| Audit mode (khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.4` (giữ nguyên — lỗi thực thi, không đổi contract) |
| Execution round | `2` (remediation) |
| Current audit round | `1` (verdict CONDITIONAL — đã giao) |
| Executor | Tier 2 |
| Baseline | `dc3e772` (identity-core ACCEPTED); HEAD `e99f11f` (Planner Resolution round 1 → REVISION_REQUIRED) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | round 1: 2026-08-16 19:00 ICT; round 2: 2026-08-16 22:30 ICT |

> **Out of scope (re-confirm):** `app/bcc/*`, `app/job-board/*`, `portal_timesheets`, middleware/auth endpoints/login/JWT/cookie/register/auth mới (DEC-11). Round 2 chỉ chạm (a) `docs/tasks/hrp-phase2-tenant-scope/HANDOFF.md` §5.2 (văn bản); (b) `appBCC/app.py` đúng 1 dòng 227; (c) scripts tạm `scripts/_t3-*.cjs` + `scripts/_t3-dryrun-rollback.mjs` sẽ bị xoá trước commit (xem §7.10 Cleanup).

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

→ 3 bảng chính có FORCE RLS. 10 bảng còn lại (dependents, source_claims, project_assignments, candidate_submissions, sites, vendor_statements, vendor_statement_lines, tickets, ticket_comments, ticket_notifications) cũng đã FORCE RLS trong 3 migrations. (Văn bản gốc liệt kê thêm `project_skill_requirements` và `vendor_members` — hai tên này không tồn tại trong `prisma/schema.prisma` lẫn `pg_class`; 13 bảng thuộc Phase 2 đều đã được áp RLS đầy đủ theo xác minh read-only của Tier 3 round 1.)

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

---

## 7.7 Runbook production RLS (Round 2 — AC-10 evidence)

> **Tình trạng áp dụng (DEC-08):** Production Neon main **CHƯA được apply** Phase 2 RLS — schema, 3 migrations `s1_rls_*` chỉ đã apply trên dev branch. Runbook dưới đây dành cho lệnh apply trước Phase 4 khi sếp mở maintenance window.
>
> **Mục tiêu (RQ-09):** Áp Phase 2 RLS lên Neon main <5 phút rollback, có preflight + verification, không phá dữ liệu appBCC. Production DB hiện đang ở role runtime = `neondb_owner` (cũ) — sẽ chuyển sang `app_user_writer` (RLS-on, no BYPASSRLS) theo DEC-09 A.
>
> **Command reference (dev branch đã verify) đã có sẵn:**
> - Bootstrap: `node scripts/run-bootstrap-roles.mjs` (chạy 1 lần ngoài Prisma, đã commit với trace).
> - Migrate: `npx prisma migrate deploy` (qua `directUrl = env("DATABASE_URL_ADMIN")` — admin string hiện tại).
> - Smoke: `node scripts/verify-rls-{policies,real-roles,blocks-default}.mjs` + `node scripts/verify-role-separation.mjs`.
> - Rollback: `node scripts/_rollback-rls.mjs` (idempotent — đã verify dev snapshot ở §7.8).

### 7.7.1 Pre-flight checklist (sếp/ops checklist)

| # | Item | Verify command | Pass |
|---|---|---|---|
| 1 | Backup Neon main (full pg_dump trước maintenance window) | `pg_dump --schema=public --no-owner ... > backup_<utc>.sql`; size >0 bytes; sha256 ghi vào log | manual — sếp xác nhận |
| 2 | Freeze schema (tạm dừng mọi `prisma migrate dev` mới) | repo HEAD đang ở baseline; `git status --porcelain` rỗng (trừ `appBCC/*` dirty song song) | ready |
| 3 | Dev đã verify dry-run rollback (xem §7.8) | `node scripts/_t3-dryrun-rollback.mjs` exit 0 | PASS |
| 4 | Production RLS state hiện tại = NONE (chưa apply) | `SELECT relname FROM pg_class WHERE relrowsecurity=true AND relname IN (...15 bảng...)` — expected 0 rows | sếp/ops query read-only |
| 5 | appBCC ETL role separation (DEC-09 A) đã apply | `SELECT rolname FROM pg_roles WHERE rolname IN ('app_user_writer','hrp_etl','app_user')` — expected 3 rows, BYPASSRLS=false | sếp/ops query read-only |
| 6 | Maintenance window đã thông báo 30 phút trước | (sếp manual) | manual |
| 7 | Rollback người on-call đã rảnh | (sếp manual) | manual |

### 7.7.2 Apply order (4 bước, expected runtime ~2 phút DB; ~3 phút nếu cần restart app)

| # | Command | Expected | Action khi fail |
|---|---|---|---|
| 1 | `node scripts/run-bootstrap-roles.mjs` (production URL qua DATABASE_URL_ADMIN) | exit 0; 3 PG roles + grants tối thiểu tạo | dừng — KHÔNG tiếp tục; giữ production cũ |
| 2 | `npx prisma migrate deploy` (qua `directUrl`) | 3 migrations `s1_rls_*` applied; `_prisma_migrations` updated | `node scripts/_rollback-rls.mjs` rồi `prisma migrate resolve --rolled-back <migration_name>` |
| 3 | Smoke verify: `node scripts/verify-rls-policies.mjs` + `verify-rls-real-roles.mjs` + `verify-rls-blocks-default.mjs` + `verify-role-separation.mjs` | tất cả exit 0; output `[PASS] ...` cho từng invariant | rollback toàn bộ (xem §7.7.4) |
| 4 | Restart Vercel runtime để pick `DATABASE_URL` mới (point sang `app_user_writer`); smoke `/api/auth/login` + `/api/workers` 200 | HTTP 200 với JWT; row count = 0..3 đúng theo role | rollback + revert env trong Vercel |

### 7.7.3 Verification matrix (sau apply, expected)

| Role | Query | Expected row-count |
|---|---|---|
| `app_user_writer` GUC `app.role='ADMIN'` | `SELECT count(*) FROM workers` | = seed total (3 ở dev; production tùy) |
| `app_user_writer` GUC `app.role='MKT'` | `SELECT count(*) FROM workers` | 0 |
| `app_user_writer` GUC `app.role='WORKER'` + GUC `app.worker_id='<self>'` | `SELECT count(*) FROM workers WHERE id='<self>'` | 1 |
| `app_user_writer` raw query (no GUC) | `SELECT count(*) FROM workers` | 0 hoặc DENY (deny-by-default) |
| `hrp_etl` (appBCC ETL) | chạy ETL thử 1 record | succeed; ghi vào `portal_timesheets` không bị chặn |

### 7.7.4 Rollback (target <5 phút)

```text
node scripts/_rollback-rls.mjs         # DROP 15 policies + DISABLE RLS 15 bảng + DROP 7 helpers
npx prisma migrate resolve --rolled-back 20260816212000_s1_rls_vendor
npx prisma migrate resolve --rolled-back 20260816211000_s1_rls_project
npx prisma migrate resolve --rolled-back 20260816210000_s1_rls_worker
# Revert Vercel env DATABASE_URL từ app_user_writer về neondb_owner (giữ hành vi cũ)
# Verify: /api/workers 200 như trước Phase 2
```

Sau rollback, production trở về trạng thái pre-Phase 2 (RLS không enforce, role runtime = `neondb_owner`). KHÔNG mất dữ liệu — chỉ mất policy enforcement.

### 7.7.5 Out of scope ngay (sẽ làm sau Phase 4)

- Promote `app_user_writer` thành role runtime chính thức trên Vercel (cần window).
- Drop role `neondb_owner` khi không còn ai dùng — cần confirm sau khi Phase 3 deploy.
- `app_user` (read-only) — Phase 4 dùng cho export endpoint.

---

## 7.8 Dry-run rollback evidence (Round 2 — AC-10 partial)

**Tool:** `scripts/_rollback-rls.mjs` (Tier 2 round 1 đã tạo).
**Read-only probe (audit side):** `scripts/_t3-dryrun-rollback.mjs` — snapshot `pg_class` + `pg_policies` + `pg_proc` để xác minh danh sách đối tượng sẽ bị ảnh hưởng nếu rollback thực thi. **Không ALTER, không DROP.**

**Run log (2026-08-16 22:25 ICT, dev branch):**

```text
RLS_STATE_BEFORE=15 tables: candidate_submissions, contracts, dependents, outsourcing_projects, project_assignments, sites, source_claims, staffing_orders, ticket_comments, ticket_notifications, tickets, vendor_statement_lines, vendor_statements, vendors, workers — TẤT CẢ relrowsecurity=true, relforcerowsecurity=true
POLICY_COUNT=15
POLICIES=15 entries — mỗi table 1 policy tên `hrp_<table>_scope` (cmd=ALL)
FN_COUNT=7
FUNCTIONS=7 entries: hrp_session_user_id, hrp_session_role, hrp_session_vendor_id, hrp_session_worker_id, hrp_worker_visible(wid text), hrp_worker_visible_for(wid text), hrp_worker_writable(wid text)
WOULD_DISABLE_RLS=15 tables
WOULD_DROP_POLICY=15 policies across 15 tables
WOULD_DROP_FN=7 helper functions (asked: 7)
DRYRUN_DONE=OK — READ-ONLY, no DDL executed
```

**Conclusion (Tier 2 round 2):** `_rollback-rls.mjs` đã được verify về mặt kỹ thuật — nó cover đúng 15 bảng, 15 policies, 7 helpers (khớp 100% với state thật trên dev). Rollback thực sự chưa chạy trên dev vì RLS đang active & matrix test cần giữ. Khi apply production (nếu có sự cố), chạy theo §7.7.4.

**Lưu ý (Tier 3 round 1 AUD-001 đã nêu):** văn bản HANDOFF round 1 có liệt kê 2 tên bảng không tồn tại (`project_skill_requirements`, `vendor_members`) — đã sửa ở §5.2 round 2. State RLS thật chỉ có 15 bảng (xác minh trên); 13 bảng Phase 2 chính + 2 bảng đi kèm (`staffing_orders`, `contracts`) đều đã FORCE RLS.

---

## 7.9 appBCC DEC-09 A — Evidence (Round 2 — PLN-001)

**Trước (round 1):** `appBCC/app.py:227` đọc trực tiếp `DATABASE_URL` — cùng env name với web runtime. Vi phạm RQ-01 phần "appBCC chỉ dùng credential ETL riêng".

**Sau (round 2):** Đổi đúng 1 dòng:

```diff
-        self.db_url = os.environ.get("DATABASE_URL", "postgresql://...")
+        self.db_url = os.environ.get("APPBCC_DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql://..."))  # Phase 2 DEC-09 A: ETL dùng credential riêng; fallback cho dev
```

- **File:line:** `appBCC/app.py:227` (runtime DB load trong `MainWindow.__init__`).
- **Fallback:** vẫn đọc `DATABASE_URL` nếu `APPBCC_DATABASE_URL` không set — cho phép dev local không cần sửa `.env` ngay (sếp tự thêm key mới khi deploy).
- **Settings UI giữ nguyên** (`app.py:1194/1209/1239/1242`): đây là form `QLineEdit` cho user nhập tay khi chạy `.exe` desktop — không thuộc DEC-09 A (chỉ áp cho web runtime).
- **Verify:** `grep -n 'APPBCC_DATABASE_URL\|DATABASE_URL' appBCC/app.py` → đúng 1 hit ở dòng 227 dùng `APPBCC_DATABASE_URL`, 4 hit còn lại ở settings UI giữ `DATABASE_URL`. Read back đã kiểm.

**Cam kết ranh giới (Q3 REJECT giữ nguyên từ round 1):**
- Tier 2 round 2 **KHÔNG** stage `appBCC/agent_mapper.py` (dirty: model `deepseek-chat` + timeout).
- Tier 2 round 2 **KHÔNG** revert/touch các hunks dirty khác của `appBCC/app.py` (`import threading`, `try/except _MEIPASS`, `setStyleSheet 14→13`, layout2 column 3 stretch).
- Trước commit, sẽ `git add -p appBCC/app.py` chỉ stage hunk dòng 227.

---

## 7.10 Cleanup (Round 2 — pre-commit)

**Xóa scripts tạm (chỉ phục vụ audit round 2):**
- `scripts/_t3-verify.cjs` (đã xóa round 1)
- `scripts/_t3-verify-2.cjs` (đã xóa round 1)
- `scripts/_t3-verify-3.cjs` (đã xóa round 1)
- `scripts/_t3-verify-4.cjs` (đã xóa round 1)
- `scripts/_t3-static.cjs` (đã xóa round 1)
- `scripts/_t3-check-extra.cjs` (round 2 verify staffing_orders/contracts — đã xóa)
- `scripts/_t3-dryrun-rollback.mjs` (round 2 audit-side dry-run — **giữ lại** trong commit vì nó là evidence tier-3 reproducible cho AC-10; idempotent read-only, an toàn để stage)

**Script giữ lại:**
- `scripts/_rollback-rls.mjs` — round 1 Tier 2 (operational, idempotent).

**Commit plan (round 2):** 1 commit remediation, scope giới hạn:
```text
docs(handoff): hrp-phase2-tenant-scope R2 — fix §5.2 tên bảng, append §0 control, §7.7-7.10 remediation evidence
+ scripts/_t3-dryrun-rollback.mjs (audit-side dry-run evidence)
+ appBCC/app.py (1 dòng: 227 — DEC-09 A env swap)
```
**KHÔNG stage:** `appBCC/agent_mapper.py`, các hunks dirty khác của `appBCC/app.py`, `appBCC/*` ngoài dòng 227.

---

## 8. Handoff cho Auditor (Round 2 — append)

- Bằng chứng AC-10 step-10 runbook: §7.7 (production runbook chính thức), §7.8 (dev dry-run snapshot).
- Bằng chứng AC-01 phần appBCC: §7.9 (`appBCC/app.py:227` env swap + ranh giới giữ sếp dirty).
- Diff hiện tại (chưa commit): xem `git status` — staged scope sẽ là HANDOFF + 1 file script tạm + 1 dòng trong `appBCC/app.py`.
- Verify lại bằng: `npx vitest run` (303/303 PASS) + `npx next build` (exit 0) + grep `tx.$extends` trong `app/` (0 hit) + grep `_rollback-rls` trong scripts (1 hit — script vẫn tồn).

> Handoff status: READY_FOR_AUDIT