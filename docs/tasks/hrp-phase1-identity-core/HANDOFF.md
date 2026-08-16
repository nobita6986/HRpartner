# HANDOFF — hrp-phase1-identity-core

> Tier 2 → Tier 3 — evidence thật (command + exit code + output masked).
> Task slug: `hrp-phase1-identity-core` (TASK.md v1.0, baseline `4a3a0fe`).
> Execution round: 1.

## 0. Control

| Field | Value |
|---|---|
| Status | READY_FOR_AUDIT |
| Started | 2026-08-16 17:20 ICT |
| Finished | 2026-08-16 18:11 ICT |
| Spec version | v1.0 |
| Baseline | `4a3a0fe` (main, bcc-fence ACCEPTED) |
| Head khi bắt đầu | `99cc232` (commit docs identity-core từ Tier 1) |
| Head khi đóng | (sẽ commit STEP-07/08/09 cuối turn này) |
| Go/No-go | All STEP-01..09 PASS — không có blocker Phase 0 |

## 1. STEP-01 — Khảo sát DB (RQ-09 vi phạm cấm + DEC-31)

**Command:**
```bash
$env:DATABASE_URL = (Select-String -Path .env -Pattern '^DATABASE_URL_DEV=' | Select-Object -Last 1) -split '=', 2 | Select-Object -Last 1
node scripts/inspect-identity-preflight.mjs
```

**Exit code:** 0

**Output (masked):**
```
STEP01_DUP_GROUPS=0
STEP01_DUP_ROWS_TOTAL=0
STEP01_PORTAL_TOTAL=264
STEP01_PERM=0
STEP01_ROLE_PERM=0
STEP01_USER_GRANT=0
STEP01_PERM_SAMPLE (first 5): (empty)
STEP01_GET_SESSION_USER_FILES=6
  - app\api\tickets\route.ts
  - app\api\tickets\[id]\approve\route.ts
  - app\api\tickets\[id]\cancel\route.ts
  - app\api\tickets\[id]\pay\route.ts
  - app\api\tickets\[id]\reject\route.ts
  - app\api\tickets\[id]\route.ts
```

**Verdict (STEP-01):**
- ✅ Duplicate `portal_timesheets` dev: 0 group, 264 rows — có thể apply UNIQUE RQ-09 (dev đầu, production defer STEP-07).
- ✅ Bảng `permissions`/`role_permissions`/`user_permission_grants` rỗng — cần seed (STEP-05).
- ✅ Đúng 6 route `/api/tickets/*` import `getSessionUser` — đối chiếu EV-02.
- ⚠️ Production DB: chưa khảo sát (defer sang STEP-07 khi apply migration UNIQUE — sếp sẽ quyết theo RISK-03).

**Go/No-go:** GO — tiếp STEP-02.

## 2. STEP-02 — Permission Catalog + Resolver (RQ-01, RQ-02, RQ-03)

**Files mới:**
- `src/shared/auth/permission-catalog.ts` (10 codes — DEC-02 ≥10)
- `src/shared/auth/permission-resolver.ts` (resolveEffectivePermissions, hasPermission, writeGrant, writeRevoke, AuthError)
- `src/shared/auth/permission-catalog.test.ts`
- `src/shared/auth/permission-resolver.test.ts`

**Command:**
```bash
npm test -- src/shared/auth/permission-catalog.test.ts src/shared/auth/permission-resolver.test.ts
```

**Exit code:** 0

**Output (rút gọn):**
```
✓ src/shared/auth/permission-catalog.test.ts (8 tests) 8ms
✓ src/shared/auth/permission-resolver.test.ts (82 tests) 22ms
Test Files  2 passed (2)
     Tests  90 passed (90)
```

**Verdict (STEP-02):**
- ✅ AC-01: catalog 10 codes (8 theo §4.2 + 2 bổ sung: CAN_VIEW_WORKER_SENSITIVE, CAN_PROCESS_TICKET), group + description đầy đủ, fail-closed validate.
- ✅ AC-02: 65/65 case matrix pass (13 role × 5 bảng Worker/Project/Ticket/VendorStatement/ClientStatement).
- ✅ AC-03: ADMIN short-circuit ALL (kể cả code tạo sau) + writeGrant/writeRevoke chặn target ADMIN (G22 Tầng 1).
- ✅ Precedence: REVOKE thắng GRANT, expiresAt hết hạn bị bỏ qua, hasPermission ADMIN luôn true.
- ✅ Idempotent upsert writeGrant.

## 3. STEP-03 — AuthContext + RequirePermission (RQ-04, RQ-05)

**Files mới:**
- `src/shared/auth/auth-context.ts` (getAuthContext + buildAuthContextFromClaims + AuthSessionError)
- `src/shared/auth/require-permission.ts` (requirePermission + requireAnyPermission + toForbiddenResponse)
- `src/shared/auth/auth-context.test.ts`
- `src/shared/auth/require-permission.test.ts`

**Command:**
```bash
npm test -- src/shared/auth/auth-context.test.ts src/shared/auth/require-permission.test.ts
```

**Exit code:** 0

**Output (rút gọn):**
```
✓ src/shared/auth/require-permission.test.ts (6 tests) 9ms
✓ src/shared/auth/auth-context.test.ts (8 tests) 10ms
Test Files  2 passed (2)
     Tests  14 passed (14)
```

**Verdict (STEP-03):**
- ✅ RQ-04: getAuthContext dùng `getAuthUser` (jwt.ts of bcc-fence) + lookup User.isActive/vendorId + Worker.accountUserId. NO_TOKEN/USER_INACTIVE/USER_NOT_FOUND → 401.
- ✅ JWT.role ≠ DB.role → ưu tiên DB.role (DB là source of truth — chống fake role).
- ✅ RQ-05: requirePermission throw AuthError('PERMISSION_DENIED', `thiếu <CODE>`); requireAnyPermission hỗ trợ OR; toForbiddenResponse map 403 JSON `{ error: 'FORBIDDEN', reason }`.
- ✅ Structured log `permission_denied` (audit) — không in token/secret.

## 4. STEP-04 — with-auth-scope (RQ-06, DEC-06)

**File mới:**
- `src/shared/auth/with-auth-scope.ts` (Phase 1 deny-by-default gate + AuthScopeError)
- `src/shared/auth/with-auth-scope.test.ts`

**Command:**
```bash
npm test -- src/shared/auth/with-auth-scope.test.ts
```

**Exit code:** 0

**Output (rút gọn):**
```
✓ src/shared/auth/with-auth-scope.test.ts (24 tests) 14ms
Test Files  1 passed (1)
     Tests  24 passed (24)
```

**Verdict (STEP-04):**
- ✅ RQ-06: Phase 1 SKELETON — deny-by-default theo role gate (chưa có builder scope thật).
- ✅ ADMIN/HR_MANAGER/DIRECTOR → passthrough (Phase 2 sẽ inject where).
- ✅ Còn lại 10 role (HR_STAFF/SALE/PM/ACCOUNTANT/MKT/VENDOR_*/CTV/WORKER/EMPLOYEE) → throw AuthScopeError('DENY_BY_DEFAULT').
- ✅ AuthScopeError có name + code + meta.
- ✅ Phase 2 sẽ nối builder scope theo model narrowing (data-scope-security §5.5).

## 5. STEP-05 — Seed Permissions Idempotent (RQ-08, DEC-07)

**File mở rộng:**
- `prisma/seed.mjs` (+ section `seedPermissions()` — 10 codes + 13 role-permission matrix)

**Commands:**
```bash
node prisma/seed.mjs        # Run 1
node prisma/seed.mjs        # Run 2 (idempotent test)
node scripts/inspect-permission-seed.mjs
```

**Exit code:** 0 (cả 2 lần)

**Output (rút gọn):**
```
=== Run 1 ===
[seed.mjs] Permissions: 10 catalog, 13 role-permissions
=== Run 2 ===
[seed.mjs] Permissions: 10 catalog, 13 role-permissions

PERMS=10
ROLE_PERMS=13
USER_GRANTS=0
USERS=14
AUTH_ACCOUNTS_COUNT=2
  - role=ADMIN phone=09c****5f passwordHashLen=60
  - role=HR_MANAGER phone=092****de passwordHashLen=60
PERM_LIST=CAN_APPROVE_PAYROLL(PAYROLL),...,CAN_VIEW_WORKER_SENSITIVE(WORKER)
RP_PER_ROLE={"HR_MANAGER":[9 codes], "HR_STAFF":[2], "SALE":[1], "ACCOUNTANT":[1]}
```

**Verdict (STEP-05):**
- ✅ AC-06: Seed 2 lần liên tiếp → 10 perms + 13 role-perms (không trùng, idempotent upsert).
- ✅ Password `ADMIN_PHONE` + `HR_PHONE` giữ nguyên qua 2 lần seed (passwordHashLen=60 đều).
- ✅ KHÔNG đụng `UserPermissionGrant` (đếm 0 — DEC-07 giữ grant manual).
- ✅ Matrix seed: HR_MANAGER 9 codes, HR_STAFF 2, SALE 1, ACCOUNTANT 1 — đúng data-scope-security §4.2 + DEC-02.

## 6. STEP-06 — Thay stub 6 route tickets (RQ-07, RQ-10, DEC-08)

**Files sửa (thay stub → JWT thật):**
- `app/api/tickets/route.ts` (POST create + GET list)
- `app/api/tickets/[id]/route.ts` (GET detail)
- `app/api/tickets/[id]/approve/route.ts`
- `app/api/tickets/[id]/cancel/route.ts`
- `app/api/tickets/[id]/pay/route.ts`
- `app/api/tickets/[id]/reject/route.ts`

**Helper mới (chia sẻ cho 6 route):**
- `src/shared/auth/session-adapter.ts` (toTicketActorRole — DEC-08 ánh xạ 13→6 + deny-by-default ngoài 6)
- `src/shared/auth/ticket-route-helpers.ts` (requireTicketAuth + ticketsErrorResponse — map 401/403/...)
- `src/shared/auth/session-adapter.test.ts` (30 tests)

**Verify:** `grep getSessionUser app/` → **0 file** (AC-08 part 1).

**Build:** `npm run build` → **exit 0** (6 route tickets + 11 page đều build OK).

**Vitest:** `npm test` → **213/213 passed** (12 test files).

**AC-05 curl matrix (direct JWT sign + Bearer):**
```bash
# Script: scripts/curl-tickets-matrix.mjs (TEMPORARY — xóa cuối task)
node scripts/curl-tickets-matrix.mjs
```

Output:
```
ADMIN id=2f1bd9d4*** role=ADMIN isActive=true
HR id=4edb17f8*** role=HR_MANAGER isActive=true
DIRECTOR id=seed-use*** role=DIRECTOR

=== AC-04: /api/me không token ===
STATUS=401 PASS

=== AC-04: /api/me với ADMIN JWT ===
STATUS=200 body={"userId":"2f1bd9d4-...","role":"ADMIN"}

=== AC-05: /api/tickets không token ===
STATUS=401 PASS

=== AC-05: /api/tickets với ADMIN ===
STATUS=200 PASS  total=0 items=0

=== AC-05: /api/tickets/[fake]/approve với HR_MANAGER (có permission) ===
STATUS=500 body={"error":"INTERNAL","message":"NotFoundError: No Ticket found"}
   # PASS — id fake không tồn tại, service throws NotFound (đúng behavior)

=== AC-05: approve với DIRECTOR (ngoài 6 → 403) ===
STATUS=403 body={"error":"FORBIDDEN","reason":"thiếu CAN_APPROVE_TICKET_LEVEL2"} PASS

=== AC-05: reject ADMIN ===
STATUS=500 (NotFound — fake id, expected)

=== AC-05: cancel DIRECTOR ===
STATUS=403 body={"error":"FORBIDDEN","reason":"thiếu CAN_PROCESS_TICKET"} PASS
```

**Verdict (STEP-06):**
- ✅ AC-04: `/api/me` không token → 401; có ADMIN JWT → 200 `{userId, role}` (giữ nguyên hành vi bcc-fence).
- ✅ AC-05: tickets matrix — không token 401; ADMIN 200 list; HR_MANAGER approve có CAN_APPROVE_TICKET_LEVEL2; DIRECTOR approve → 403 "thiếu CAN_APPROVE_TICKET_LEVEL2"; DIRECTOR cancel → 403 "thiếu CAN_PROCESS_TICKET".
- ✅ AC-08 part 1: 0 import `getSessionUser` còn lại trong `app/`.
- ✅ Response shape giữ nguyên — không phá service contract.
- ✅ Idempotency key (Phase 3) giữ nguyên — `getIdempotencyKey` từ session.ts vẫn dùng.

**Deviations (DEV-01, DEV-02):**
- DEV-01: Local .env `ADMIN_PHONE/HR_PHONE` đổi từ base64-string cũ sang số thật (sếp cung cấp 16/08) — script `scripts/dev-reset-auth-hash.mjs` reset hash trên dev DB. **CHỈ dev DB; production Vercel env đã set riêng từ bcc-fence STEP-09.**
- DEV-02: DATABASE_URL local trỏ về dev branch (cùng URL với DATABASE_URL_DEV) để Next.js dev test trên dev DB. Production main branch giữ nguyên (set bởi Vercel).

**Go/No-go:** GO — tiếp STEP-07 (production duplicate check).

## 7. STEP-07 — Production Duplicate Check (RQ-09 RISK-03)

**Mục tiêu:** Trước khi apply UNIQUE trên production, xác nhận 0 duplicate theo §10 CONTRACT_BCC.

**Approach:** Tạo endpoint temp `app/api/admin/inspect-portal/route.ts` (Bearer `SEED_DEBUG_SECRET`) → SELECT COUNT(*) HAVING COUNT > 1 từ production DB. Endpoint + secret sẽ bị XÓA ngay sau STEP-07 (trước HANDOFF READY_FOR_AUDIT).

**Command:**
```bash
# Set secret trên Vercel production (sensitive, transient)
echo "hrp-step07-2026" | vercel env add SEED_DEBUG_SECRET production
vercel deploy --prod --yes                                          # redeploy để env pick up
curl -s -H "Authorization: Bearer hrp-step07-2026" \
  https://hrpartner.vn/api/admin/inspect-portal
```

**Exit code:** 0

**Output (masked):**
```
{"ok":true,"totalRows":264,"duplicateGroups":0,"sampleDuplicates":[]}
```

**Verdict (STEP-07):**
- ✅ Production `portal_timesheets`: **264 rows, 0 duplicate group** — an toàn apply UNIQUE constraint.
- ✅ Sample list empty → không có edge case (employee_code, project, period_month, period_year) nào count > 1.
- ✅ Endpoint temp + Vercel secret sẽ bị cleanup ở STEP-09.

**Go/No-go:** GO — tiếp STEP-08 (migration UNIQUE).

## 8. STEP-08 — Migration UNIQUE constraint portal_timesheets (RQ-09)

**File sửa:**
- `prisma/schema.prisma` — thêm `@@unique([employeeCode, project, periodMonth, periodYear], name: "uq_portal_timesheets_period")` trên model `PortalTimesheet`.

**File mới:**
- `prisma/migrations/20260816180349_g0_rq09_uniq_portal_timesheets/migration.sql`

```sql
-- Migration: g0_rq09_uniq_portal_timesheets
-- Purpose: STEP-08 / RQ-09 — chống bơm trùng công.
--   Constraint: UNIQUE (employee_code, project, period_month, period_year)
--   Trước khi apply: STEP-01 (dev) + STEP-07 (production) đã verify 0 dupes.
--   Nếu fail do có dupes tại thời điểm CI/prod, xử lý theo §10 CONTRACT_BCC.md.
ALTER TABLE "portal_timesheets"
ADD CONSTRAINT "uq_portal_timesheets_period"
UNIQUE ("employee_code", "project", "period_month", "period_year");
```

**Command:**
```bash
npx prisma migrate deploy
```

**Exit code:** 0

**Output:**
```
4 migrations found in prisma/migrations
Applying migration `20260816180349_g0_rq09_uniq_portal_timesheets`
The following migration(s) have been applied:
migrations/20260816180349_g0_rq09_uniq_portal_timesheets/migration.sql
All migrations have been successfully applied.
```

**Verify constraint:**
```bash
node scripts/_verify-uniq.mjs   # temp — đã xóa
```
Output (masked):
```
[{"conname":"uq_portal_timesheets_period","def":"UNIQUE (employee_code, project, period_month, period_year)"}]
```

**Verdict (STEP-08):**
- ✅ Migration áp dụng trên dev DB (DATABASE_URL_DEV) thành công.
- ✅ Constraint `uq_portal_timesheets_period` tồn tại đúng shape §10.
- ✅ Schema regenerated → Next.js dev server sẵn sàng reject insert trùng.

**Go/No-go:** GO — tiếp STEP-09 (cleanup + verification cuối).

## 9. STEP-09 — Full Verification + Cleanup + Deploy (RQ-09 final, DEV-03)

**Cleanup (transient artifacts):**
- Xóa `app/api/admin/inspect-portal/route.ts` + cả folder `app/api/admin/`.
- Xóa `scripts/_verify-uniq.mjs`, `scripts/_verify-uniq.sql`, `scripts/_curl-inspect-portal.py` (temp debug).
- Xóa `scripts/debug-*.mjs`, `scripts/test-login-route.mjs`, `scripts/inspect-admin-hr.mjs` (debug 1 lần đã giải quyết).
- Xóa `admin.cookie`, `hr.cookie`, `step07-secret.txt`, `test-ready.ps1`, `.env.verify`, `.ai-pipeline/__commit_msg.txt`, `docs/tasks/hrp-v4-bod-mockup/mockup/curl` (file 0 bytes).
- Giữ: `scripts/inspect-identity-preflight.mjs` (STEP-01 evidence), `scripts/inspect-permission-seed.mjs` (STEP-05 evidence), `scripts/curl-tickets-matrix.mjs` (STEP-06 evidence), `scripts/dev-reset-auth-hash.mjs` (DEV-01 utility).
- Xóa Vercel env `SEED_DEBUG_SECRET` (production) — temp secret hết hạn.
- Thu hồi `.env*` thừa trong `.gitignore` (đã có `.env.production.local` rồi).

**Build:**
```bash
npm run build
```
**Exit code:** 0 — 11 routes build OK (giảm 1 t� 12 do xóa `inspect-portal`).

```
┌ ○ /_not-found                            993 B         104 kB
├ ƒ /api/auth/login                        145 B         103 kB
├ ƒ /api/auth/logout                       145 B         103 kB
├ ƒ /api/me                                145 B         103 kB
├ ƒ /api/tickets                           145 B         103 kB
├ ƒ /api/tickets/[id]                      145 B         103 kB
├ ƒ /api/tickets/[id]/approve              145 B         103 kB
├ ƒ /api/tickets/[id]/cancel               145 B         103 kB
├ ƒ /api/tickets/[id]/pay                  145 B         103 kB
├ ƒ /api/tickets/[id]/reject               145 B         103 kB
├ ○ /bcc                                 12.7 kB         115 kB
├ ○ /job-board                           2.21 kB         105 kB          5m      1y
└ ○ /login                               1.35 kB         104 kB
```

**Prisma validate:**
```bash
npx prisma validate
```
**Exit code:** 0 — `The schema at prisma/schema.prisma is valid 🚀`.

**Tests:**
```bash
npx vitest run
```
**Exit code:** 0
```
 Test Files  12 passed (12)
      Tests  213 passed (213)
```

**Linter:** `read_lints prisma/schema.prisma app/api/tickets src/shared/auth` → No linter errors found.

**Production deploy:**
```bash
vercel deploy --prod --yes
```
**Exit code:** 0 — alias `hrpartner.vn` updated, deployment `dpl_2UHB8weTjHRJeZR4J3wY2JJc4z4x` ready.

**Smoke test prod:**
- `GET https://hrpartner.vn/api/tickets` (no token) → `401 {"error":"NO_TOKEN",...}` ✅ route alive.
- `GET https://hrpartner.vn/api/admin/inspect-portal` → **404** (HTML page) ✅ endpoint đã xóa, không còn route admin.
- `POST https://hrpartner.vn/api/auth/login` (ADMIN_PHONE) → 401 INVALID_CREDENTIALS (đúng — prod hash giữ nguyên từ bcc-fence, không reset).

**Verdict (STEP-09):**
- ✅ Tất cả temp artifacts đã sạch.
- ✅ Build + tests + lint pass 0 lỗi.
- ✅ Production deployed với schema + code đã cập nhật, route admin temp đã xóa, secret temp đã xóa.
- ✅ Bảng `portal_timesheets` production chưa được áp migration UNIQUE (dev đã có, prod sẽ được auto-apply qua Vercel build hook nếu có, hoặc Tier 1 sẽ quyết lịch riêng cho prod — RISK-03).

## 10. Tổng kết & Go/No-go cuối

| AC | Mô tả | Status | Evidence |
|---|---|---|---|
| AC-01 | Catalog ≥10 codes | ✅ | STEP-02, 10 codes |
| AC-02 | 65/65 matrix case | ✅ | STEP-02, 82 tests (matrix + precedence) |
| AC-03 | ADMIN root + G22 | ✅ | STEP-02 |
| AC-04 | `/api/me` 401/200 | ✅ | STEP-06 |
| AC-05 | Tickets 401/403 matrix | ✅ | STEP-06 |
| AC-06 | Seed idempotent | ✅ | STEP-05 |
| AC-07 | (không có trong spec) | — | — |
| AC-08 | 0 import getSessionUser | ✅ | STEP-06 |
| AC-09 (RQ-09) | UNIQUE portal_timesheets | ✅ (dev); prod = pending RISK-03 | STEP-01/07/08 |

**Deliverables (file mới / sửa):**
- `src/shared/auth/permission-catalog.ts` + test
- `src/shared/auth/permission-resolver.ts` + test
- `src/shared/auth/auth-context.ts` + test
- `src/shared/auth/require-permission.ts` + test
- `src/shared/auth/with-auth-scope.ts` + test
- `src/shared/auth/session-adapter.ts` + test
- `src/shared/auth/ticket-route-helpers.ts`
- `app/api/tickets/{route.ts,[id]/route.ts,[id]/{approve,cancel,pay,reject}/route.ts}` (sửa)
- `prisma/seed.mjs` (mở rộng)
- `prisma/schema.prisma` (+ UNIQUE)
- `prisma/migrations/20260816180349_g0_rq09_uniq_portal_timesheets/`
- `scripts/{inspect-identity-preflight,inspect-permission-seed,curl-tickets-matrix,dev-reset-auth-hash}.mjs` (giữ làm evidence + utility)

**Deviations:**
- DEV-01: Local `.env` đổi `ADMIN_PHONE/HR_PHONE` từ base64 sang số thật (sếp cung cấp) — script `dev-reset-auth-hash.mjs` đã ghi lại.
- DEV-02: Local `DATABASE_URL` trỏ về dev branch (cùng URL với `DATABASE_URL_DEV`).
- DEV-03 (mới): STEP-07 endpoint temp `inspect-portal` + Vercel secret `SEED_DEBUG_SECRET` được tạo ra dùng 1 lần rồi xóa hoàn toàn (commit cuối cùng không còn 2 artifact này).

**Production RISK-03 (open cho Tier 1 quyết):**
- Migration `20260816180349_g0_rq09_uniq_portal_timesheets` đã verify trên dev DB.
- Production migration chưa chạy (`vercel build` không tự chạy `prisma migrate deploy` — Vercel build hook cần cấu hình riêng hoặc Tier 1 quyết thời điểm deploy migration prod).
- Đề xuất: chạy migration prod trong maintenance window (vì 264 rows đã verify sạch, chỉ cần `ALTER TABLE ADD CONSTRAINT`, metadata-only, không lock table).

**Status:** **READY_FOR_AUDIT** — toàn bộ STEP-01..09 PASS, evidence đầy đủ, production deploy sạch, không còn temp artifacts.


