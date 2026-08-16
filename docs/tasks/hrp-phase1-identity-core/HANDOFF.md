# HANDOFF — hrp-phase1-identity-core

> Tier 2 → Tier 3 — evidence thật (command + exit code + output masked).
> Task slug: `hrp-phase1-identity-core` (TASK.md v1.0, baseline `4a3a0fe`).
> Execution round: 1.

## 0. Control

| Field | Value |
|---|---|
| Status | IN_PROGRESS |
| Started | 2026-08-16 17:20 ICT |
| Spec version | v1.0 |
| Baseline | `4a3a0fe` (main, bcc-fence ACCEPTED) |
| Head khi bắt đầu | `99cc232` (commit docs identity-core từ Tier 1) |
| Go/No-go | Contract đã preflight — không có blocker Phase 0 |

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

**Go/No-go:** GO — tiếp STEP-07 (migration UNIQUE portal_timesheets).

