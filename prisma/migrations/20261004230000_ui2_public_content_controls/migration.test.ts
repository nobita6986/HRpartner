/**
 * ui2_public_content_controls migration test.
 *
 * Pattern mirrors `homepage-chat-links-migration.test.ts` and
 * `homepage-phone-link-migration.test.ts`. Static-analysis only — no DB
 * connection. The synthetic Postgres integration is gated by
 * `public-settings.integration.test.ts` (skipped when no DB is available).
 *
 * The migration MUST:
 *   - be the lexicographically latest in `prisma/migrations/`
 *   - add exactly two columns to `homepage_settings`
 *   - mark `news_section_enabled` as NOT NULL DEFAULT TRUE
 *   - leave `sticky_announcement` nullable JSONB
 *   - enforce a CHECK constraint that the JSON column, when non-null, is
 *     a top-level object and is bounded in size (≤ 4 KB)
 *   - NOT touch RLS / GRANT / other tables
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');
const MIGRATION_NAME = '20261004230000_ui2_public_content_controls';
const MIGRATION_PATH = join(MIGRATIONS_DIR, MIGRATION_NAME, 'migration.sql');

function listMigrationDirs(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((entry) => statSync(join(MIGRATIONS_DIR, entry)).isDirectory())
    .filter((entry) => /^\d{14}_/.test(entry))
    .sort();
}

/**
 * Strip SQL line comments so non-goal disclaimers that mention forbidden
 * tokens (e.g. "NO RLS, GRANT") don't false-positive on the assertion
 * fence. Block comments are not used by any repo migration.
 */
function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/^\s*--.*$/, ''))
    .join('\n');
}

describe('UI2 public content controls migration', () => {
  const sql = stripSqlComments(readFileSync(MIGRATION_PATH, 'utf8'));

  it('is the lexicographically latest migration in prisma/migrations/', () => {
    const all = listMigrationDirs();
    expect(all[all.length - 1]).toBe(MIGRATION_NAME);
  });

  it('adds only the two additive columns to homepage_settings', () => {
    expect(sql).toContain('ALTER TABLE "homepage_settings"');
    expect(sql).toContain('ADD COLUMN "news_section_enabled" BOOLEAN NOT NULL DEFAULT TRUE');
    expect(sql).toContain('ADD COLUMN "sticky_announcement" JSONB');
    // No NOT NULL on sticky_announcement: it must be nullable.
    expect(sql).not.toMatch(/ADD COLUMN "sticky_announcement"\s+JSONB\s+NOT NULL/i);
  });

  it('does not touch other tables or destructive operations', () => {
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|POLICY|INDEX)/i);
    expect(sql).not.toMatch(/ALTER\s+DROP/i);
    expect(sql).not.toMatch(/CREATE\s+POLICY|ALTER\s+POLICY|DROP\s+POLICY/i);
    expect(sql).not.toMatch(/GRANT|REVOKE|ALTER\s+ROLE/i);
  });

  it('enforces a CHECK constraint that sticky_announcement is a top-level JSON object when non-null', () => {
    expect(sql).toContain('ADD CONSTRAINT "homepage_settings_sticky_announcement_check"');
    expect(sql).toContain("jsonb_typeof(\"sticky_announcement\") = 'object'");
  });

  it('bounds the sticky_announcement JSON payload size at 4 KB', () => {
    expect(sql).toContain('octet_length("sticky_announcement"::text) <= 4096');
  });
});
