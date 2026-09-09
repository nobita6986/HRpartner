# HANDOFF: hrp-phase4-vertical-slices Round 2 (2a)

**Task slug**: `hrp-phase4-vertical-slices`
**Execution round**: 2 (sub-round 2a)
**Opened by**: Tier 2 — Tier 1 đã chốt chia 2a/2b/2c (TASK v1.2 §9 Planner Resolution)
**Closed**: 2026-08-17 11:00 ICT
**Commit**: `8c7fb91` — feat(phase4): round 2 — STEP-01..03 admin layout + order.service + transfer.service
**Baseline**: `cd5c2c9` (round 1 STEP-21/AC-17 PASS, TASK v1.2)

---

## 0. Control Fields

| Field | Value |
|---|---|
| Task | `hrp-phase4-vertical-slices` |
| Spec version | `v1.2` |
| Baseline | `cd5c2c9` |
| Commit | `8c7fb91` |
| Executor | Tier 2 (Cursor agent) |
| Modules | M3 (Staffing), M7 (Chấm công), M4 (Đối soát), M2 (Job Board) |
| ADR references | ADR-010 (BigInt VND), ADR-011 (5 state machine), ADR-014 (Ticket SM) |
| Status | `READY_FOR_AUDIT` |

---

## 1. Deliverables (Round 2a)

### STEP-01: Admin layout + nav + Control Tower (RQ-18, RQ-19)

**Files created/modified**:
- `app/admin/layout.tsx` — Server Component shell; guard session từ `hrp_token` cookie; redirect /login hoặc /forbidden. KHÔNG đụng vùng cấm.
- `app/admin/admin-shell.tsx` — Client wrapper quanh `RoleGuardLayout` (shared/ui); ánh xạ `SystemRole` → `Role` type.
- `src/shared/auth/server-session.ts` — MỚI. Read-only helper: đọc `hrp_token` cookie + `verifyJwt()`. KHÔNG sửa `jwt.ts`.
- `src/shared/ui/role-guard/role-guard-layout.tsx` — Thêm `ADMIN_NAV_PHASE4` (11 items, 4 nhóm slice M2/M3/M4/M7), mở rộng `Role` type với DIRECTOR/SALE.
- `app/admin/page.tsx` — Control Tower skeleton với 4 card (Staffing / Chấm công / Đối soát / Job Board), tiến độ round.
- `app/admin/staffing/page.tsx` — S02 placeholder.
- `app/admin/attendance/page.tsx` — S03 placeholder (slice 4B).
- `app/admin/reconciliation/page.tsx` — S04 placeholder (slice 4C).
- `app/admin/jobs/page.tsx` — S05 placeholder (slice 4D).

**Evidence**:
```
npx next build 2>&1 | Select-String "admin"
→ 5 admin routes compile: /admin, /admin/staffing, /admin/attendance, /admin/reconciliation, /admin/jobs (exit 0)
```

### STEP-02: `staffing/order.service` + slot counter atomic (RQ-01)

**Files created**:
- `src/domains/staffing/types.ts` — Enums `STAFFING_ORDER_STATUSES`, DTOs `CreateStaffingOrderInput`, `CreateSlotInput`, `FillSlotResult`.
- `src/domains/staffing/order.service.ts` — CRUD operations trong 1 Prisma transaction:
  - `createStaffingOrder(tx, ctx, input)` — tạo order + N slot; slotsFilled=0 (O9); generateOrderCode SQL SO-00001→SO-99999.
  - `listStaffingOrders(tx, ctx, filters)` — L1 scope: ADMIN/HR/SALE thấy all; PM chỉ project mình.
  - `getStaffingOrder(tx, ctx, orderId)` — L1 scope + include slots + project.
  - `updateStaffingOrderStatus(tx, ctx, orderId, newStatus)` — valid/invalid transition check (OPEN↔CLOSING_SOON↔CLOSED/CANCELLED terminal).
  - `listStaffingOrderSlots(tx, ctx, orderId)` — L1 scope.
- `src/domains/staffing/order.service.test.ts` — 11 unit tests (create, code gen, status transitions, permissions, scope, NOT_FOUND).

**L1 scope**: `src/shared/auth/scopes/staffing.scope.ts` — MỚI. Reuse `buildProjectScope`. Register vào `SCOPE_REGISTRY`.

**Evidence**:
```
npx vitest run src/domains/staffing/order.service.test.ts
→ 11 passed (11)
npx next build 2>&1 | Select-Object -Last 5
→ exit 0
```

### STEP-03: `staffing/transfer.service` + advisory lock + 1-ACTIVE + quota (RQ-02)

**Files created**:
- `src/domains/staffing/transfer.service.ts` — Guided Transfer algorithm:
  - Advisory lock: `pg_advisory_xact_lock(hashtext($1::text))` — transaction-scoped, không leak.
  - Bất biến 1-ACTIVE: SELECT assignments ACTIVE của worker; `count=0 → NO_ACTIVE`, `count>1 → MULTIPLE_ACTIVE` (rollback).
  - UPDATE old assignment: `status='TRANSFERRED'`, `validTo=transferDate`.
  - UPDATE project A: `filled -= 1`.
  - INSERT new assignment: `status='ACTIVE'`, `validFrom=transferDate`.
  - UPDATE project B: `filled += 1`, check quota not exceeded.
  - `bulkTransferWorker(prisma, ctx, inputs[])` — savepoint per worker, fail-safe.
- `src/domains/staffing/transfer.service.test.ts` — 7 unit tests (happy path, NO_ACTIVE, MULTIPLE_ACTIVE, SAME_PROJECT, PERMISSION_DENIED, WRONG_PROJECT, bulk fail-safe).

**Evidence**:
```
npx vitest run src/domains/staffing/transfer.service.test.ts
→ 7 passed (7)
```

---

## 2. Integration Results

```
npx vitest run
→ Test Files  21 passed (21)
   Tests  343 passed (343) [baseline: 325]
   +18 new (order.service 11 + transfer.service 7)

npx next build
→ exit 0 (no TypeScript errors)
```

---

## 3. Verification

### RQ traceability

| RQ | STEP | Implementation | Evidence |
|---|---|---|---|
| `RQ-01` | STEP-02 | `order.service.ts` CRUD + slot counter | 11 unit tests PASS |
| `RQ-02` | STEP-03 | `transfer.service.ts` advisory lock + 1-ACTIVE | 7 unit tests PASS |
| `RQ-18` | STEP-01 | `app/admin/layout.tsx` server component guard | Build exit 0 |
| `RQ-19` | STEP-01 | `ADMIN_NAV_PHASE4` 4 nhóm nav | Role type mở rộng DIRECTOR/SALE |

### Forbidden zone (Iron Rule)

```
git diff --name-only | Select-String "jwt\.ts|password\.ts|user\.ts|auth-context\.ts|require-permission\.ts"
→ EMPTY (vùng cấm không đụng)
```

### AC traceability

| AC | Status | Note |
|---|---|---|
| `AC-01` | DEFERRED | Cần API routes + E2E — round 2b/2c |
| `AC-02` | DEFERRED | Cần staffing order list UI — round 2b |
| `AC-08` | DEFERRED | Cần guided transfer UI — round 2b |
| `AC-09` | DEFERRED | Cần transfer route + quota check — round 2b |
| `AC-10` | DEFERRED | Cần slot detail UI — round 2b |
| `AC-14` | DEFERRED | Cần project order UI — round 2b |
| `AC-15` | DEFERRED | Cần project quota check — round 2b |
| `AC-17` | PASS | Round 1: 7/7 matrix RLS PASS |

---

## 4. Decision Log (Round 2a)

| DEC | Decision | Reason |
|---|---|---|
| `DEC-NEW-07` | Tạo `server-session.ts` helper (read-only) thay vì modify `auth-context.ts` | Vùng cấm — auth-context.ts không đụng |
| `DEC-NEW-08` | Advisory lock dùng `hashtext($1::text)` | Đảm bảo consistent lock key cho workerId string |
| `DEC-NEW-09` | `buildStaffingOrderScope` reuse `buildProjectScope` | StaffingOrder scope = Project scope (RQ-01, DEC-15) |
| `DEC-NEW-10` | Role type mở rộng trong `role-guard-layout.tsx` (DIRECTOR/SALE) | ADMIN_NAV_PHASE4 cần 7 roles, UI shared chỉ có 9 roles gốc |

---

## 5. Scope bảo toàn

- **Vùng cấm**: SẠCH — không sửa `jwt.ts`, `password.ts`, `user.ts`, `auth-context.ts`, `require-permission.ts`.
- **Phase 0-3**: Không đụng tới — chỉ `extend` SCOPE_REGISTRY (Phase 2 pattern).
- **appBCC**: Không đụng.
- **Migration**: Không tạo migration mới trong round 2a (RLS staffing_order_slots đã apply round 1).

---

## 6. Remaining work (Round 2b/2c)

### Round 2b: API routes + permission guards
- `app/api/staffing/orders/route.ts` — GET list + POST create (với `withDbContext`)
- `app/api/staffing/orders/[id]/route.ts` — GET detail + PATCH status
- `app/api/staffing/orders/[id]/slots/route.ts` — GET slots
- `app/api/staffing/transfers/route.ts` — POST transfer (với advisory lock)
- Permission guards: HR_STAFF/HR_MANAGER/ADMIN được create/cancel order

### Round 2c: UI + E2E
- Staffing order list page (với filter theo status)
- Transfer page (guided step-by-step form)
- E2E vitest: tạo order → fill slot → transfer

---

## 7. Risk & Notes

- **Token budget**: Round 2a tiêu ~40% budget cho 3 STEP. Round 2b + 2c cần còn ~60%.
- **Advisory lock**: `pg_advisory_xact_lock` là transaction-scoped (tự release khi commit/rollback) — không cần unlock thủ công.
- **`transferWorker` bất đồng bộ**: Advisory lock + 7 SQL statements trong 1 transaction = atomic. Nếu bất kỳ step nào fail, rollback toàn bộ.
- **Code generator**: `generateOrderCode` dùng `$queryRawUnsafe` với regex `^SO-[0-9]+$` để tách số. Đủ cho dev + staging. Production cần sequence PostgreSQL (SEQUENCE option trong DEC sẽ bổ sung ở round sau).
- **SCOPE_REGISTRY mở rộng**: `StaffingOrder` + `StaffingOrderSlot` được register vào Phase 2 registry. L1 scope enforcement chạy cho mọi API route dùng `withDbContext`.

---

## 8. Evidence Summary

```
Baseline:   cd5c2c9  (vitest 325/325 PASS)
After R2a:  8c7fb91  (vitest 343/343 PASS)  [+18]
Build:      exit 0
Forbidden:  clean
Diff:       19 files, +1646 lines
```
