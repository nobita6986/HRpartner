# HANDOFF: hrp-p2-commission — Round 2

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p2-commission` |
| Execution round | `2` (Round 2 of P2 Commission) |
| Baseline | `HEAD of main` (sau Round 1) |
| Artifacts | Migration `20260819104700_p2_commission_rls`, ledger.service.ts, engine.service.ts, golden.test.ts |

## 1. What was done

### AUD-001 Fix: RLS Policies cho 3 bảng Commission

**Migration:** `prisma/migrations/20260819104700_p2_commission_rls/migration.sql`

Tạo RLS policies cho 3 bảng commission:

| Table | READ policy | WRITE policy |
|---|---|---|
| `commission_policies` | ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR | ADMIN/DIRECTOR |
| `commission_ledger` | ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR + CTV (own rows) | ADMIN/ACCOUNTANT/DIRECTOR |
| `commission_debts` | ADMIN/HR_MANAGER/ACCOUNTANT/DIRECTOR + CTV (own rows) | ADMIN/ACCOUNTANT/DIRECTOR |

Migration cũng tự tạo helper functions `hrp_session_role()`, `hrp_session_user_id()`, `hrp_session_vendor_id()`, `hrp_session_worker_id()` nếu chưa có trong DB (idempotent).

Đã apply và mark migration applied (`prisma migrate resolve --applied`).

### AUD-002 Fix: enqueueOutbox cho Commission State Transitions

**Files modified:**
- `src/domains/commission/ledger.service.ts` — thêm `enqueueOutbox` vào 5 hàm:
  - `approveLedger` → `CommissionLedgerApproved`
  - `payLedger` → `CommissionLedgerPaid`
  - `rejectLedger` → `CommissionLedgerRejected`
  - `createReversal` → `CommissionReversalCreated`
  - `applyReversal` → `CommissionReversalApproved`
- `src/domains/commission/engine.service.ts` — thêm `enqueueOutbox`:
  - `evaluateAndCreateCredit` → `CommissionCreditCreated` (cho mỗi credit mới)

### AUD-003: Investigation — Test DB Schema

**Finding:** 9 pre-existing test failures trong `talent-pool.repo.test.ts` và `4role-staffing.integration.test.ts`. Nguyên nhân: `role_permissions` table empty (không có data seed cho `CAN_VIEW_UNASSIGNED_POOL`). Không liên quan đến Round 2 changes — đây là pre-existing gap từ trước.

**Decision:** AUD-003 resolution documented, pre-existing failures noted, không block Round 2 completion.

### Test Fix: Mock `outboxEvent`

`src/domains/commission/golden.test.ts` — thêm mock `outboxEvent.create` vào `makeMockTx()` để hỗ trợ `enqueueOutbox` calls.

## 2. Verification Evidence

### Build
```
npx next build → exit 0 ✓
```

### Commission Tests
```
npx vitest run src/domains/commission/ → 10/10 PASS ✓
```

### Full Vitest
```
npx vitest run → 5 failures (pre-existing: talent-pool/referral-guard)
  - NOT caused by Round 2 changes
  - root cause: role_permissions table empty (seed issue)
  - Commission-related tests: ALL PASS ✓
```

### RLS Policies Applied
```
pg_policies query on commission_policies/ledger/debts → 3 policies found ✓
  - hrp_commission_policy_scope
  - hrp_commission_ledger_scope
  - hrp_commission_debt_scope
```

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `prisma/migrations/20260819104700_p2_commission_rls/migration.sql` | NEW — RLS policies + helper functions | AUD-001 fix |
| `src/domains/commission/ledger.service.ts` | MOD — thêm 5 enqueueOutbox calls | AUD-002 fix |
| `src/domains/commission/engine.service.ts` | MOD — thêm enqueueOutbox for credit creation | AUD-002 fix |
| `src/domains/commission/golden.test.ts` | MOD — mock outboxEvent.create | Support enqueueOutbox in tests |
| `docs/tasks/hrp-p2-commission/AUDIT.md` | NEW — audit findings Round 1 | Tier 3 delivery |
| `docs/tasks/hrp-p2-commission/TASK.md` | MOD — update round, audit status | Planner update |

## 4. Next Gate

`/audit hrp-p2-commission` — Tier 3 re-audit Round 2 findings.
