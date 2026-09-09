# HANDOFF: hrp-p2-commission — Round 4

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p2-commission` |
| Execution round | `4` (Round 4 — re-execution after Tier 3 FAIL on Round 3 due to Neon transaction timeouts) |
| Baseline | `HEAD of main` (after Round 3 commit `6230d33`) |
| Artifacts | `vitest.config.ts` updated |

## 1. What was done

### Root Cause

**Tier 3 Round 4 finding:** Prisma transaction timeout — Neon connection pool (Free tier: ~6 connections) không chịu nổi Vitest chạy parallel nhiều integration test cùng lúc. Mỗi test tạo transaction, pool bị tràn → timeout.

**Evidence:** Vitest exit 1 với "Unable to start a transaction in the given time" ở `matrix-scope.test.ts` và `security-matrix.integration.test.ts` (111 tests × parallel = quá tải).

### Fix — Limit Vitest Concurrency

**File:** `vitest.config.ts`

```typescript
poolOptions: {
  threads: {
    maxThreads: 1,
    minThreads: 1,
  },
  forks: {
    maxForks: 1,
    minForks: 1,
  },
},
fileParallelism: false,
```

Chạy serial từng file, mỗi file dùng 1 thread duy nhất → Neon pooler không bị tràn.

**Trade-off:** Test chạy chậm hơn (~79s thay vì ~62s) nhưng ổn định và không timeout.

## 2. Verification Evidence

```
npx vitest run → 35 test files, 605 tests, exit 0

Breakdown:
  src/domains/commission/golden.test.ts          → 10 PASS
  src/domains/security/security-matrix.integration.test.ts → 111 PASS (40.5s)
  src/shared/auth/matrix-scope.test.ts           → 59 PASS (20.4s)
  src/shared/auth/rls-context.test.ts            → 9 PASS (3.4s)
  All others → PASS
```

**Before fix:** 6-8 failures due to transaction timeout (exit 1)
**After fix:** 605/605 pass (exit 0)

## 3. Changes Summary

| File | Change | Reason |
|---|---|---|
| `vitest.config.ts` | MOD — add poolOptions (1 thread, 1 fork, no file parallelism) | Fix Neon connection pool exhaustion |

## 4. Outstanding Items

None for this round. All mandatory checks now pass.

## 5. Next Gate

`/audit hrp-p2-commission` — Tier 3 re-audit Round 4. Expect VERDICT: PASS, AUD-003 CLOSED.
