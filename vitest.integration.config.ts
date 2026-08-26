/**
 * vitest.integration.config.ts — INTEGRATION lane (G0-04 / RQ-05, RQ-06). DB-touching tests ONLY.
 *
 * The connection string comes EXCLUSIVELY from the test-DB env vars — never the repo .env, never
 * DATABASE_URL / _DEV / _ADMIN (dev/prod), never a silent fallback. scripts/ci/integration-preflight.mjs
 * validates and guards these vars BEFORE this config is ever loaded (fail-closed; emits ENV_BLOCKED
 * when the test DB is absent). This config only maps the already-validated *_TEST vars into the names
 * the production code / tests read:
 *   - getPrisma() reads DATABASE_URL              ← DATABASE_URL_TEST (RLS-enforcing writer)
 *   - LIVE mp2 harness reads DATABASE_URL_ADMIN   ← DATABASE_URL_ADMIN_TEST (same test DB, admin role)
 *   - LIVE mp2 harness reads DATABASE_URL_WRITER  ← DATABASE_URL_TEST
 * The mp2 files additionally gate on MP2_LIVE_SECURITY_CHECK, so they skip unless that flag is set.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';
import { INTEGRATION_TEST_FILES } from './vitest.integration-files';

const TEST_DB = process.env.DATABASE_URL_TEST ?? '';
const TEST_DB_ADMIN = process.env.DATABASE_URL_ADMIN_TEST ?? '';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    include: INTEGRATION_TEST_FILES,
    env: {
      DATABASE_URL: TEST_DB,
      DATABASE_URL_WRITER: TEST_DB,
      DATABASE_URL_ADMIN: TEST_DB_ADMIN,
      // Forwarded so any test reading the raw *_TEST names sees the validated values.
      DATABASE_URL_TEST: TEST_DB,
      DATABASE_URL_ADMIN_TEST: TEST_DB_ADMIN,
      // A validated admin URL means the dedicated test DB can run the privileged
      // MP-2 boundary introspection. Without it, those tests remain ENV_BLOCKED.
      MP2_LIVE_SECURITY_CHECK: TEST_DB_ADMIN ? '1' : '',
      MP3B_LIVE_CONVERSION_CHECK: TEST_DB_ADMIN ? '1' : '',
      MP3C_LIVE_PLACEMENT_CHECK: TEST_DB_ADMIN ? '1' : '',
      M1_06A_LIVE_AUTH_SCOPE: TEST_DB_ADMIN ? '1' : '',
      M1_06B_LIVE_AUTH_SCOPE: TEST_DB_ADMIN ? '1' : '',
    },
    poolOptions: {
      threads: { maxThreads: 1, minThreads: 1 },
      forks: { maxForks: 1, minForks: 1 },
    },
    fileParallelism: false,
  },
});
