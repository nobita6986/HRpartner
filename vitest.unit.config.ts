/**
 * vitest.unit.config.ts — UNIT lane (G0-04 / RQ-05). Runs in CI on every PR/push.
 *
 * Fail-closed DB safety: the unit lane must touch NO database. DATABASE_URL is FORCED to an
 * unreachable sentinel here (hardcoded, ignoring the ambient environment), so that if any test
 * in this lane ever tries to open a connection it fails LOUDLY at 127.0.0.1:1 instead of silently
 * reaching a real dev/prod database. The DB-touching files are additionally excluded by path via
 * the shared INTEGRATION_TEST_FILES list (belt and suspenders).
 */
import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';
import { INTEGRATION_TEST_FILES } from './vitest.integration-files';

// Unassignable port → immediate connection refusal. Never a real host.
const BLOCKED_DB_URL = 'postgresql://blocked:blocked@127.0.0.1:1/blocked?connect_timeout=1';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  // Match the app runtime (React 19 automatic JSX). Without this, esbuild uses the
  // classic runtime and component tests fail with "React is not defined".
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: [...configDefaults.exclude, ...INTEGRATION_TEST_FILES],
    env: {
      // FORCE unreachable — do NOT read the ambient DATABASE_URL (fail-closed, RQ-05/RQ-06).
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
    },
    poolOptions: {
      threads: { maxThreads: 1, minThreads: 1 },
      forks: { maxForks: 1, minForks: 1 },
    },
    fileParallelism: false,
  },
});
