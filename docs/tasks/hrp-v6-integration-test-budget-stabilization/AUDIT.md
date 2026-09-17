# AUDIT: hrp-v6-integration-test-budget-stabilization

## Meta
- **Audit target HEAD:** `1cc2d223728d1b562f963757dc4fbd56f52c6c45`
- **Base:** `2484a10785593c2e175c4420eb6c4c4795f98bb7`
- **PR:** #8
- **Review mode:** LIGHT delta audit
- **Date:** 2026-09-17

## Scope
Exactly three files modified:
1. `vitest.integration.config.ts`
2. `tests/db/placement-lifecycle-integration.test.ts`
3. `src/domains/admin-demand-tree.integration.test.ts`

## Verdict
**PASS**

## Findings

1. **Vitest Integration Config [VERIFIED]**
   - **Severity:** N/A (Baseline verification)
   - **File:** `vitest.integration.config.ts`
   - **Details:** Verified that the delta exclusively adds `testTimeout: 30_000` to the dedicated integration test config. No other changes were made.

2. **Placement-Lifecycle Integration Budgets [VERIFIED]**
   - **Severity:** N/A (Baseline verification)
   - **File:** `tests/db/placement-lifecycle-integration.test.ts`
   - **Details:** 13 explicit outer test block budgets correctly changed from `15000` to `30_000`. The local Prisma `TEST_TRANSACTION_OPTIONS` correctly remains strictly bounded at `timeout: 15_000`. No assertions, fixture logic, cleanup logic, test order, RLS contexts, or production behavior were modified.

3. **W3 Admin-Demand-Tree Integration Budgets [VERIFIED]**
   - **Severity:** N/A (Baseline verification)
   - **File:** `src/domains/admin-demand-tree.integration.test.ts`
   - **Details:** Added `TEST_TRANSACTION_OPTIONS = { timeout: 15_000 }` exclusively to the `writer` PrismaClient (Line 26, 38). The `admin` PrismaClient remains unmodified. All 17 W3 test cases and assertions remain intact, and the outer suite budget remains `30000`. No production Prisma defaults or helper functions were changed.

4. **Cumulative PR Behavior & Root Cause [VERIFIED]**
   - **Severity:** N/A (Behavior verification)
   - **Details:** The applied changes directly address the observed Vitest outer timeouts (previously defaulting to 5000/15000) and the Prisma P2028 writer error (previously defaulting to 5000ms). There are no skips, retries, deletions, or weakened assertions. Workflow concurrency, timeout rules, and source/service logic remain completely unmodified. The integration suite remains serial and strictly fail-closed. 
   - **Production behavior:** unchanged

## Evidence

- **Terminal CI Run:** [35186184415](https://github.com/nobita6986/HRpartner/actions/runs/35186184415)
- **Quality Job ID:** `105088635056` (SUCCESS)
- **Integration Job ID:** `105088635213` (SUCCESS)
- **Integration Isolation:** The DB step ran `2026-09-17T05:33:31Z → 2026-09-17T05:51:16Z`. Verified the run was repository-isolated with no overlapping workflow executions.
- **Browser smoke:** NOT_APPLICABLE — test-infrastructure-only delta
