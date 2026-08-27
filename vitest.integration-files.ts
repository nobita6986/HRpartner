/**
 * vitest.integration-files.ts — SINGLE SOURCE OF TRUTH for the DB-touching lane (G0-04 / RQ-05).
 *
 * These are the ONLY test files that open a real database connection. The list was derived
 * EMPIRICALLY, not by filename suffix: the full suite was run once with an unreachable sentinel
 * DATABASE_URL (`postgresql://blocked:blocked@127.0.0.1:1/blocked`) and the files that errored
 * with "Can't reach database server" were recorded. The `.integration` suffix is NOT a reliable
 * signal here — several `*.integration.test.ts` files are fully mocked and make no connection,
 * while `4role-staffing.integration.test.ts` connects transitively via
 * requireTalentPoolAccess → resolveEffectivePermissions → getPrisma().
 *
 *   - 4 files connect via getPrisma() → process.env.DATABASE_URL (RLS-enforcing writer).
 *   - 2 `*.mp2.test.ts` files are LIVE harnesses gated by describe.skipIf(!MP2_LIVE_SECURITY_CHECK);
 *     they self-skip unless that flag is set, so they are safe in this lane and skip otherwise.
 *
 * Consumers:
 *   - vitest.unit.config.ts       → EXCLUDES these (unit lane must touch NO DB; fail-closed sentinel).
 *   - vitest.integration.config.ts → INCLUDES only these (DATABASE_URL from DATABASE_URL_TEST only).
 *
 * Re-derive after adding DB tests: run the sentinel classification again (see HANDOFF ops notes).
 */
export const INTEGRATION_TEST_FILES: string[] = [
  'src/shared/auth/rls-context.test.ts',
  'src/shared/auth/matrix-scope.test.ts',
  'src/domains/security/security-matrix.integration.test.ts',
  'src/domains/staffing/4role-staffing.integration.test.ts',
  'src/domains/applications/live-integration.mp2.test.ts',
  'src/domains/applications/security-boundary.mp2.test.ts',
  'src/domains/applications/live-integration.mp3b.test.ts',
  'src/domains/applications/live-integration.mp3c.test.ts',
  'src/shared/auth/live-auth-scope.m1-06a.test.ts',
  'src/shared/auth/live-vendor-worker-scope.m1-06b.test.ts',
  'src/shared/auth/live-ticket-rls-scope.m1-07a.test.ts',
  'src/shared/auth/live-rls-posture.m1-07b.test.ts',
  'src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts',
];
