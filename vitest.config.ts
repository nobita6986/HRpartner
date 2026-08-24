import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // '@/*' -> './*' (root) - khop tsconfig paths
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
    // Load .env so DATABASE_URL (app_user_writer) is used in tests — ensures
    // RLS policies are enforced. Without this, DATABASE_URL may be unset and
    // Prisma falls back to whatever is in the shell, often the admin user
    // (neondb_owner) which has BYPASSRLS — making L2 tests useless.
    env: {
      // Prefer a DATABASE_URL already present in the environment (e.g. a LIVE
      // runner pointing at a SAFE, provisioned test DB). Only fall back to repo
      // .env's DATABASE_URL (app_user_writer, RLS-enforcing) when nothing was
      // passed, so ordinary test runs behave exactly as before. This stops a
      // deliberately-passed test URL from being silently overridden with the
      // repo .env (prod) URL — which would otherwise point LIVE tests at prod.
      DATABASE_URL: process.env.DATABASE_URL ?? (() => {
        // Read .env DATABASE_URL at config-load time so RLS-enforcing user is used.
        try {
          const fs = require('node:fs');
          const env = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
          const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
          return m ? m[1] : undefined;
        } catch {
          return undefined;
        }
      })(),
    },
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
  },
});
