/**
 * vitest.config.ts — DEFAULT lane (RF-06 / RQ-01..RQ-05).
 *
 * `npm test` and a bare `npx vitest run` land here. Before RF-06 this config read the repo
 * `.env` and fell back to the ambient DATABASE_URL, so a bare run could silently open a
 * connection to the DEV/PROD database (RF-05 audit round 1, AUD-001), and component tests died
 * with "React is not defined" because esbuild used the classic JSX runtime.
 *
 * The default lane is now the same fail-closed collection as the unit lane:
 *   - automatic JSX, matching the app runtime (RQ-01)
 *   - DATABASE_URL FORCED to an unreachable sentinel; ambient value ignored, `.env` never read (RQ-02)
 *   - every admin/test/LIVE opt-in var blanked (RQ-03)
 *   - DB-touching files excluded through the shared INTEGRATION_TEST_FILES inventory (RQ-04)
 *   - the same three include globs as the unit lane (RQ-05)
 *
 * DB tests keep their own lane: `npm run test:integration`, with TEST credentials passed in
 * explicitly. Drift between this file and vitest.unit.config.ts is caught by
 * src/shared/toolchain/vitest-default-lane.static.test.ts.
 */
import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';
import { INTEGRATION_TEST_FILES } from './vitest.integration-files';

// Unassignable port → immediate connection refusal. Never a real host.
const BLOCKED_DB_URL = 'postgresql://blocked:blocked@127.0.0.1:1/blocked?connect_timeout=1';

export default defineConfig({
  resolve: {
    alias: {
      // '@/*' -> './*' (root) - khop tsconfig paths
      '@': path.resolve(__dirname, '.'),
    },
  },
  // Match the app runtime (React 19 automatic JSX). Without this, esbuild uses the
  // classic runtime and component tests fail with "React is not defined".
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    // `prisma/**` holds only STATIC tests that read migration files from disk (go-live-11 RQ-07);
    // nothing in there opens a DB connection, so it belongs in this collection.
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts', 'prisma/**/*.test.ts'],
    exclude: [...configDefaults.exclude, ...INTEGRATION_TEST_FILES],
    env: {
      // FORCE unreachable — do NOT read the ambient DATABASE_URL, and never read `.env`.
      DATABASE_URL: BLOCKED_DB_URL,
      // Blank every real-DB / live-gate var so nothing in this lane can connect or go LIVE.
      DATABASE_URL_ADMIN: '',
      DATABASE_URL_WRITER: '',
      DATABASE_URL_TEST: '',
      DATABASE_URL_ADMIN_TEST: '',
      MP2_LIVE_SECURITY_CHECK: '',
      MP3B_LIVE_CONVERSION_CHECK: '',
      OPS06A_LIVE_CHECK: '',
      M1_06A_LIVE_AUTH_SCOPE: '',
      M1_06B_LIVE_AUTH_SCOPE: '',
      M1_07A_LIVE_TICKET_RLS: '',
      GOLIVE04_LIVE_PUBLIC_READ: '',
      GOLIVE05_LIVE_CARD_TRUTH: '',
    },
    poolOptions: {
      threads: { maxThreads: 1, minThreads: 1 },
      forks: { maxForks: 1, minForks: 1 },
    },
    fileParallelism: false,
  },
});
