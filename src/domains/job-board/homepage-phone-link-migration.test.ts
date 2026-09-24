import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'prisma/migrations/20260924160000_homepage_phone_link/migration.sql',
);

describe('homepage phone link migration', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('adds one nullable phone destination without changing privileges', () => {
    expect(sql).toContain('ADD COLUMN "phone_call_number" TEXT');
    expect(sql).not.toMatch(/NOT NULL|DEFAULT/i);
    expect(sql).not.toMatch(/GRANT|REVOKE|CREATE POLICY|ALTER ROLE/i);
  });

  it('enforces the canonical tel-link number format at the database boundary', () => {
    expect(sql).toContain('homepage_settings_phone_call_number_check');
    expect(sql).toContain("'^\\+?[0-9]{7,15}$'");
  });
});
