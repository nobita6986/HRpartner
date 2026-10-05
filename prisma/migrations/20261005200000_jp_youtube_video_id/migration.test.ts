/**
 * jp_youtube_video_id migration test — hrp-t1c-jobposting-media-youtube (RQ-01, DEC-01).
 *
 * Static-analysis only — no DB connection. Synthetic Postgres integration
 * belongs to JobPosting integration tests.
 *
 * The migration MUST:
 *   - be the lexicographically latest in `prisma/migrations/` (this task is
 *     the current pre-P2 gate; once another task lands, update here);
 *   - add exactly one column `youtube_video_id` to `job_postings`;
 *   - be additive & nullable (TEXT, no NOT NULL);
 *   - NOT touch RLS / GRANT / other tables.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');
const MIGRATION_NAME = '20261005200000_jp_youtube_video_id';
const MIGRATION_PATH = join(MIGRATIONS_DIR, MIGRATION_NAME, 'migration.sql');

function listMigrationDirs(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((entry) => statSync(join(MIGRATIONS_DIR, entry)).isDirectory())
    .filter((entry) => /^\d{14}_/.test(entry))
    .sort();
}

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/^\s*--.*$/, ''))
    .join('\n');
}

describe('jp_youtube_video_id migration', () => {
  const sql = stripSqlComments(readFileSync(MIGRATION_PATH, 'utf8'));

  it('is the lexicographically latest migration in prisma/migrations/', () => {
    const all = listMigrationDirs();
    expect(all[all.length - 1]).toBe(MIGRATION_NAME);
  });

  it('adds only the one additive column to job_postings', () => {
    expect(sql.toLowerCase()).toContain('alter table job_postings');
    expect(sql.toLowerCase()).toContain('add column if not exists youtube_video_id text');
  });

  it('keeps the column nullable (no NOT NULL)', () => {
    // Match the specific column declaration; forbid a NOT NULL on the same line.
    expect(sql.toLowerCase()).not.toMatch(/add column if not exists youtube_video_id\s+text\s+not null/i);
  });

  it('does not touch other tables or destructive operations', () => {
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|POLICY|INDEX)/i);
    expect(sql).not.toMatch(/ALTER\s+DROP/i);
    expect(sql).not.toMatch(/CREATE\s+POLICY|ALTER\s+POLICY|DROP\s+POLICY/i);
    expect(sql).not.toMatch(/GRANT|REVOKE|ALTER\s+ROLE/i);
  });
});
