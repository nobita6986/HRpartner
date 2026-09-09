# HANDOFF: hrp-phase4-vertical-slices Round 3

**Task slug**: `hrp-phase4-vertical-slices`
**Execution round**: 3 (STEP-07 E2E + AC-10 idempotency/outbox + HANDOFF 2b/2c)
**Opened by**: Tier 2 — Tier 1 đã mở round 3 (TASK v1.4 §9 Planner Resolution audit round 2)
**Closed**: 2026-08-17 13:47 ICT
**Baseline**: `abab8f6` (round 2c: routes + UI staffing list, TASK v1.3)
**Pre-flight**: `8a48b97` (TASK v1.4 Planner Resolution, vitest 351/351 PASS)

---

## 0. Control Fields

| Field | Value |
|---|---|
| Task | `hrp-phase4-vertical-slices` |
| Spec version | `v1.4` |
| Baseline | `abab8f6` |
| Executor | Tier 2 (Cursor agent) |
| Modules | M3 (Staffing), M7 (Chấm công), M4 (Đối soát), M2 (Job Board) |
| ADR references | ADR-010 (BigInt VND), ADR-011 (5 state machine), ADR-014 (Ticket SM) |
| Status | `READY_FOR_AUDIT` |

---

## 1. Deliverables (Round 3)

### AC-10: Idempotency + Outbox wrap (RQ-01, RQ-02)

**Files modified**:

- `src/domains/staffing/order.service.ts` — Thêm `enqueueOutbox` calls:
  - `createStaffingOrder` → event `StaffingOrderCreated` sau khi tạo order
  - `updateStaffingOrderStatus` → event `StaffingOrderStatusChanged` sau khi update status
- `src/domains/staffing/transfer.service.ts` — Thêm `enqueueOutbox` call:
  - `transferWorker` → event `WorkerTransferred` sau khi tạo assignment mới

**Files modified** (routes):

- `app/api/staffing/orders/route.ts` — `POST` bọc `withIdempotency`:
  - Header `x-idempotency-key`; route `'POST:/api/staffing/orders'`
  - TTL 24h (default); `IdempotencyConflictError` → 409
  - Non-idempotent fallback khi không có key
- `app/api/staffing/orders/[id]/route.ts` — `PATCH` bọc `withIdempotency`:
  - Route `'PATCH:/api/staffing/orders/{id}'`; same pattern
- `app/api/staffing/transfers/route.ts` — `POST` bọc `withIdempotency`:
  - Single transfer: `'POST:/api/staffing/transfers'`
  - Bulk transfer: skip idempotency (per-item savepoint)

**Evidence**:

```
npx next build 2>&1 | Select-String "staffing"
→ 5 routes compile: /api/staffing/orders, /api/staffing/orders/[id],
   /api/staffing/transfers, /api/staffing/talent-pool, /admin/staffing
   exit 0
```

### STEP-07: Integration tests — 4-role + E2E narrative (RQ-18, DEC-13)

**Files created**:

- `src/domains/staffing/4role-staffing.integration.test.ts` — **11 tests**:
  - 4-role scoping StaffingOrder: ADMIN create/list ✓, HR_STAFF list ✓, VENDOR blocked ✓, WORKER blocked ✓
  - 4-role scoping Guided Transfer: ADMIN OK ✓, HR_STAFF OK ✓, PM blocked ✓, VENDOR blocked ✓
  - 4-role scoping Talent Pool: ADMIN OK ✓, WORKER blocked (CAN_VIEW_UNASSIGNED_POOL) ✓
  - 4-role scoping Referral Guard: ADMIN blockCode=0 ✓

- `src/domains/staffing/e2e-staffing-narrative.integration.test.ts` — **5 tests** (F00A bước 1-5):
  - Bước 1: List StaffingOrders → thấy order "Thiếu 3 người An Phát" ✓
  - Bước 2: Talent Pool → thấy Nam (chưa assign An Phát) ✓
  - Bước 3: Guided Transfer detect Nam ACTIVE tại Yên Phong (1-ACTIVE invariant) ✓
  - Bước 4: Transfer Nam Yên Phong → An Phát; đóng cũ mở mới + outbox event ✓
  - Bước 5: Bất biến 1-ACTIVE → 2 ACTIVE → MULTIPLE_ACTIVE rollback ✓

**NOTE**: Integration tests dùng Prisma in-memory mock (không cần DB thật). Mock `$queryRawUnsafe`, `outboxEvent.create`, tất cả Prisma operations. Outbox events được gọi thật trong service → mock phải return mock object.

---

## 2. Integration Results

```
npx vitest run
→ Test Files  25 passed (25)
   Tests  367 passed (367) [baseline: 351]
   +16 new (4role 11 + e2e 5)

npx next build
→ exit 0 (no TypeScript errors)
```

---

## 3. Verification

### RQ traceability

| RQ | STEP | Implementation | Evidence |
|---|---|---|---|
| `RQ-01` | AC-10 | `order.service.ts` + outbox `StaffingOrderCreated/StatusChanged` | 11 unit tests PASS (order.service 10) |
| `RQ-02` | AC-10 | `transfer.service.ts` + outbox `WorkerTransferred` | 7 unit tests PASS (transfer.service 7) |
| `RQ-18` | STEP-07 | 4-role scoping: ADMIN/HR_STAFF/VENDOR/WORKER | 11 integration tests PASS |
| `RQ-19` | STEP-07 | E2E narrative F00A bước 1-5 | 5 integration tests PASS |

### AC traceability

| AC | Status | Note |
|---|---|---|
| `AC-01` | PARTIAL | Admin CRUD orders — code đủ, cần Tier 3 audit |
| `AC-02` | PARTIAL | Referral Guard R1/R2/R3 — code đủ, cần Tier 3 audit |
| `AC-08` | PARTIAL | Guided Transfer advisory lock — code đủ, cần Tier 3 audit |
| `AC-09` | PARTIAL | Bulk transfer savepoint — code đủ, cần Tier 3 audit |
| `AC-10` | **DONE** | `withIdempotency` + `enqueueOutbox` cho POST/PATCH routes mới |
| `AC-14` | PARTIAL | Order CRUD — code đủ, cần Tier 3 audit |
| `AC-15` | PARTIAL | Quota check in transfer — code đủ, cần Tier 3 audit |
| `AC-17` | PASS | Round 1: 7/7 RLS matrix PASS |

### Forbidden zone (Iron Rule)

```
git diff --name-only | Select-String "jwt\.ts|password\.ts|user\.ts|auth-context\.ts|require-permission\.ts"
→ EMPTY (vùng cấm không đụng)
```

---

## 4. Decision Log (Round 3)

| DEC | Decision | Reason |
|---|---|---|
| `DEC-NEW-11` | Idempotency key extraction: local `getIdempotencyKey()` trong mỗi route | Tránh đụng Phase 1 `session.ts` (vùng cấm) |
| `DEC-NEW-12` | Bulk transfer không bọc idempotency | Per-item savepoint đã đảm bảo fail-safe; idempotency key per-item phức tạp |
| `DEC-NEW-13` | Outbox events: `StaffingOrderCreated`, `StaffingOrderStatusChanged`, `WorkerTransferred` | Phase 3 helpers sẵn có (`enqueueOutbox`); drain xử lý ở Phase 5+ |
| `DEC-NEW-14` | Integration tests: Prisma mock in-memory với `$queryRawUnsafe` stub | Pattern DEC-16: không cần DB thật; phải mock tất cả Prisma operations |
| `DEC-NEW-15` | E2E narrative: dùng ADMIN ctx cho steps 1-3 | `buildStaffingOrderScope`→`buildProjectScope`: HR_STAFF có empty scope (deny all); ADMIN có full access |

---

## 5. Scope bảo toàn

- **Vùng cấm**: SẠCH — không sửa `jwt.ts`, `password.ts`, `user.ts`, `auth-context.ts`, `require-permission.ts`.
- **Phase 0-3**: Không đụng tới — chỉ `import` từ helpers Phase 3 (`idempotency.ts`, `outbox.ts`).
- **appBCC**: Không đụng.
- **Migration**: Không tạo migration mới trong round 3.
- **outbox drain**: Chưa implement (Phase 5+); outbox events được ghi nhưng chưa dispatch. Safe vì `availableAt` default = now, drain chạy khi ready.

---

## 6. Remaining work (Slices 4B/4C/4D)

- **Slice 4B**: Attendance — `import.service.ts`, `import-commit.service.ts`, `timesheet.service.ts`, routes + UI
- **Slice 4C**: Reconciliation — `statement.service.ts`, `margin.service.ts`, `dispute.service.ts`, routes + UI
- **Slice 4D**: Job Board — `submission.service.ts`, public apply route, UI

---

## 7. Risk & Notes

- **`enqueueOutbox` trong service**: Event được gửi trong cùng transaction với state change → rollback-safe. Nếu transaction rollback, event row cũng rollback (đúng behavior).
- **Idempotency race**: UNIQUE constraint (`uq_idempotency_keys_scope`) đảm bảo chỉ 1 row được tạo; bên thua P2002 → replay response cũ.
- **4-role test**: Mock `$queryRawUnsafe` phải match EXACT SQL string (bao gồm whitespace). SQL trong service dùng `\n` + indentation — mock phải dùng cùng pattern.
- **Talent Pool**: `queryTalentPool` nhận `PrismaClient` (không phải `TransactionClient`) — mock phải cung cấp đầy đủ Prisma operations.
- **HR_STAFF scope**: `buildStaffingOrderScope`→`buildProjectScope`: HR_STAFF → empty where (deny all projects). E2E narrative dùng ADMIN để test full flow; 4-role test có test HR_STAFF với seeding mock data.

---

## 8. Evidence Summary

```
Baseline R2c:   abab8f6  (vitest 351/351 PASS)
After Round 3:   [pending commit]  (vitest 367/367 PASS)  [+16]
Build:           exit 0
Forbidden:       clean
New files:       2 integration test files (+~850 lines)
Modified:        order.service.ts (+outbox), transfer.service.ts (+outbox),
                 orders/route.ts (+idempotency), orders/[id]/route.ts (+idempotency),
                 transfers/route.ts (+idempotency),
                 order.service.test.ts (+outbox mock), transfer.service.test.ts (+outbox mock)
```
