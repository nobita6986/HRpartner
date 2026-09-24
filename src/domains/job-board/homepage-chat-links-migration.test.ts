import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'prisma/migrations/20260924150000_homepage_chat_links/migration.sql',
);

describe('homepage chat links migration', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('adds only nullable chat destination columns to HomepageSettings', () => {
    expect(sql).toContain('ADD COLUMN "zalo_chat_url" TEXT');
    expect(sql).toContain('ADD COLUMN "messenger_chat_url" TEXT');
    expect(sql).not.toMatch(/NOT NULL|DEFAULT/i);
    expect(sql).not.toMatch(/GRANT|REVOKE|CREATE POLICY|ALTER ROLE/i);
  });

  it('pins HTTPS platform hosts and maximum length at the database boundary', () => {
    expect(sql).toContain('length("zalo_chat_url") <= 2048');
    expect(sql).toContain('length("messenger_chat_url") <= 2048');
    expect(sql).toContain('oa\\.zalo\\.me');
    expect(sql).toContain('www\\.messenger\\.com');
  });
});
