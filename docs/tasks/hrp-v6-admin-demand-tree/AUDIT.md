# AUDIT: hrp-v6-admin-demand-tree

## Meta
- **Audit target:** `f27833384b063f3d8de891d7f8670a56e63722fb`
- **Base:** `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`
- **Review mode:** LIGHT final re-audit
- **Date:** 2026-09-17

## Verdict
**PASS**

## Findings

1. **F-01 / F-02 Corrections [RESOLVED]**
   - **Severity:** P1 (Documentation / Trust)
   - **Description:** Previous HANDOFF.md contained hallucinated/incorrect evidence.
   - **Resolution:** The `docs/tasks/hrp-v6-admin-demand-tree/HANDOFF.md` now correctly logs the historic `FAIL` for Job `104852646140` and describes the root cause as `UNCONFIRMED` pending a repository-serialized isolated run.

2. **W3 Implementation (RLS Matrix) [VERIFIED]**
   - Verified that the scope logic correctly grants visibility for ADMIN, DIRECTOR, `pmUserId`, `subPmUserId1`, and `subPmUserId2`. 
   - Verified that `client-read.service.ts` correctly guards PM access via visible projects (Client service-level PM guard).
   - Verified missing IDs return null, and missing GUC fails closed.

3. **Service & UI Contracts [VERIFIED]**
   - `app/admin/projects/[id]/page.tsx` properly traverses and deduplicates job openings from slots using `openingsMap`.
   - `app/admin/clients/page.tsx` correctly implements `<RowLink>` on `<tr>` and utilizes `relative z-10` for interactive buttons, ensuring proper z-index layering.

4. **Integration Test Suite [VERIFIED]**
   - `src/domains/admin-demand-tree.integration.test.ts` successfully implements all 17 target assertions for the W3 Acceptance Matrix.

5. **CI Stabilization [VERIFIED]**
   - Verified in `.github/workflows/ci.yml`: concurrency group `hrpartner-dedicated-integration-db`, `cancel-in-progress: false`, job timeout `30`.
   - Verified `CI_INTEGRATION_STRICT: '1'`.
   - Verified `fileParallelism: false` in `vitest.integration.config.ts`.
   - W3 integration test suite timeout bound to `30000`. Legacy RLS tests (`live-ticket-rls-scope.m1-07a.test.ts` & `live-rls-posture.m1-07b.test.ts`) bound individual tests to `30_000` budgets. No tests were skipped/deleted.
   - Production transaction timeouts remain unmodified.

## Evidence

- **Terminal CI Run:** [35177311675](https://github.com/nobita6986/HRpartner/actions/runs/35177311675)
- **Quality Job ID:** `105061742013` (SUCCESS)
- **Integration Job ID:** `105061742277` (SUCCESS)
- **Integration Isolation:** The DB step ran `2026-09-17T03:13:15Z → 2026-09-17T03:28:32Z`. Verified the run was repository-isolated with no overlapping workflow executions.
- **Browser Smoke:** NOT_RUN / ENV_BLOCKED
