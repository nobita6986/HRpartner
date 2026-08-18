# HANDOFF: hrp-defectfix-code-review — Round 1

## Control

| Field | Value |
|---|---|
| Task | `hrp-defectfix-code-review` |
| Executor | Tier 2 (Cursor) |
| Baseline | `8f24d47` (feat(phase4): round 6) |
| Completion | 2026-08-18 ICT |
| Spec | v1.0 |

## Evidence (Iron Rule 4: real command + output)

### STEP-01: RQ-01 — Worker ticket identity (DEC-01)

**Root cause:** `toSessionUser` dropped `ctx.workerId`; route + service used `User.id` instead of `Worker.id`.

**Files changed:**

| File | Change |
|---|---|
| `src/shared/auth/session-adapter.ts` | `toSessionUser` thread `ctx.workerId` → `workerId` field |
| `src/domains/attendance/ticket.service.ts` | `SessionUser` interface +3 methods use `actor.workerId ?? actor.id` |
| `app/api/tickets/route.ts` | WORKER create → `sessionUser.workerId` |
| `src/domains/attendance/ticket.service.test.ts` | All WORKER mock `SessionUser` include `workerId` |

**Evidence:**

```powershell
npx vitest run src/domains/attendance/ticket.service.test.ts
# ✓ 16 tests passed
npx next build
# ✓ Compiled successfully
```

---

### STEP-02: RQ-02 — applyOverride referral guard (DEC-03)

**Root cause:** `if (!guardResult.allowed)` threw when worker WAS blocked. Inverted.

**Files changed:**

| File | Change |
|---|---|
| `src/domains/staffing/referral-guard.service.ts` | `if (guardResult.allowed)` → `NOT_BLOCKED`; code union + `'NOT_BLOCKED'` added |

**Evidence:**

```powershell
npx vitest run src/domains/staffing/referral-guard.service.test.ts
# ✓ 4 tests passed
npx vitest run src/domains/staffing
# Test Files 6 passed (6) | Tests 42 passed (42)
```

---

### STEP-03: RQ-03 — race generateOrderCode (DEC-02)

**Root cause:** `SELECT MAX+1` no lock between SELECT and INSERT → P2002 on concurrent requests.

**Files changed:**

| File | Change |
|---|---|
| `src/domains/staffing/order.service.ts` | `pg_advisory_xact_lock(hashtext('staffing_order_code'))` before MAX+1 |
| `src/domains/staffing/order.service.test.ts` | Mock `$executeRawUnsafe` + both create-order tests |

**Evidence:**

```powershell
npx vitest run src/domains/staffing
# Test Files 6 passed (6) | Tests 42 passed (42)
npx next build
# ✓ Compiled successfully
```

---

### STEP-04: RQ-04 — anomalyBreakdown in getBatchPreview

**Root cause:** Hardcoded `Object.fromEntries(ANOMALY_TYPES.map(t => [t, 0]))` — always zero.

**Files changed:**

| File | Change |
|---|---|
| `src/domains/attendance/import.service.ts` | Count anomalies from `batch.rawRows` into `anomalyBreakdown` |

**Evidence:**

```powershell
npx vitest run src/domains/attendance
# Test Files 4 passed (4) | Tests 47 passed (47)
```

---

### STEP-05: RQ-05 — TODO(capturedAt) marker

**Files changed:**

| File | Change |
|---|---|
| `src/domains/attendance/import-commit.service.ts` | Marker `TODO(capturedAt)` explaining source of `capturedAt` (device timestamp from CSV Phase 2) |

---

### STEP-06: RQ-06 — Delete stub + relocate getIdempotencyKey (DEC-04)

**Files changed:**

| File | Change |
|---|---|
| `src/shared/auth/ticket-route-helpers.ts` | Added `getIdempotencyKey()` function |
| `app/api/tickets/route.ts` | Import from new path |
| `app/api/tickets/[id]/approve/route.ts` | Import from new path |
| `app/api/tickets/[id]/pay/route.ts` | Import from new path |
| `app/api/tickets/[id]/cancel/route.ts` | Import from new path |
| `app/api/tickets/[id]/reject/route.ts` | Import from new path |
| `src/domains/attendance/session.ts` | **DELETED** |

**Evidence:**

```powershell
# Old import: 0 results
Get-ChildItem -Recurse app/api/tickets | Select-String "domains/attendance/session"
# (no output)

# grep equivalent
git grep "domains/attendance/session" -- app/api/tickets/
# (exit 0, no matches)

npx next build
# ✓ Compiled successfully
```

---

### STEP-07: RQ-07 — bulkTransferWorker comment fix

**Files changed:**

| File | Change |
|---|---|
| `src/domains/staffing/transfer.service.ts` | Comment corrected: "1 transaction độc lập mỗi worker" not "savepoint per worker" |

---

### STEP-08: RQ-08 — Verify appBCC build artifacts

**Evidence (DEC-05):**

```powershell
git ls-files appBCC/build appBCC/dist appBCC/venv
# (exit 0, empty output — no build artifacts tracked)
```

**Result:** Repo already clean — no `git rm --cached` needed.

---

## Regression (RQ-09)

```powershell
npx vitest run
# Test Files  29 passed (29)
#      Tests  412 passed (412)

npx next build
# ✓ Compiled successfully
```

## Staged Files

```powershell
git diff --name-only --cached
```

Expected:

```
src/domains/attendance/import-commit.service.ts
src/domains/attendance/import.service.ts
src/domains/attendance/ticket.service.test.ts
src/domains/attendance/ticket.service.ts
src/domains/staffing/order.service.test.ts
src/domains/staffing/order.service.ts
src/domains/staffing/referral-guard.service.ts
src/domains/staffing/transfer.service.ts
src/shared/auth/session-adapter.ts
src/shared/auth/ticket-route-helpers.ts
app/api/tickets/[id]/approve/route.ts
app/api/tickets/[id]/cancel/route.ts
app/api/tickets/[id]/pay/route.ts
app/api/tickets/[id]/reject/route.ts
app/api/tickets/route.ts
```

Deleted:

```
src/domains/attendance/session.ts
```

## Next

→ Tier 3 audit → TASK acceptance.
