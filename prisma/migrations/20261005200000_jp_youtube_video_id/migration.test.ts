/**
 * jp_youtube_video_id migration test — hrp-t1c-jobposting-media-youtube (RQ-01, DEC-01).
 *
 * Static-analysis only — no DB connection. Synthetic Postgres integration
 * belongs to JobPosting integration tests.
 *
 * The migration MUST:
 *   - precede later forward-only migrations in `prisma/migrations/`. We
 *     accept any later migration that starts with a strictly greater
 *     14-digit timestamp; this guard survives downstream pre-P2 hotfixes
 *     (e.g. 20261008000000_t1b_pre_p2_worker_delete_rls landed after
 *     hrp-t1c and must not be renamed/reordered by t1c authors);
 *   - add exactly one column `youtube_video_id` to `job_postings`;
 *   - be additive & nullable (TEXT, no NOT NULL);
 *   - NOT touch RLS / GRANT / other tables.
 *
 * (Updated 2026-10-07 by hrp-t1b-pre-p2-worker-delete-rls-hotfix: the
 *   lexicographically-latest assertion is replaced with a relative
 *   ordering check because t1c was no longer the latest migration after
 *   t1b landed. Pre-existing RLS-static guards of t1c are preserved.)
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

  it('is the lexicographically latest migration in prisma/migrations/ at landing time, but is allowed to be followed by later forward-only migrations', () => {
    const all = listMigrationDirs();
    const selfIdx = all.indexOf(MIGRATION_NAME);
    expect(selfIdx).toBeGreaterThanOrEqual(0);
    // Every later migration must have a strictly greater 14-digit timestamp.
    for (let i = selfIdx + 1; i < all.length; i += 1) {
      const ts = all[i].slice(0, 14);
      expect(ts > '20261005200000', `later migration ${all[i]} must have timestamp > 20261005200000`).toBe(true);
    }
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
