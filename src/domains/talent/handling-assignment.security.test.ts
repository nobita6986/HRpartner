import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260922100000_w5_handling_assignment_safety/migration.sql',
  ),
  'utf8',
);

describe('HandlingAssignment RLS migration', () => {
  it('enables and forces RLS without granting PUBLIC access', () => {
    expect(migration).toContain(
      'ALTER TABLE labor_profile_handling_assignments ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'ALTER TABLE labor_profile_handling_assignments FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'REVOKE ALL ON labor_profile_handling_assignments FROM PUBLIC',
    );
    expect(migration).toContain(
      'REVOKE DELETE ON labor_profile_handling_assignments FROM app_user_writer',
    );
    expect(migration).not.toMatch(/GRANT\s+.+\s+TO\s+PUBLIC/i);
  });

  it('scopes reads to managers or the current assignee', () => {
    expect(migration).toContain('hrp_handling_assignment_select');
    expect(migration).toContain("hrp_session_role() IN ('ADMIN', 'HR_MANAGER')");
    expect(migration).toContain("hrp_session_role() IN ('HR_STAFF', 'CTV')");
    expect(migration).toContain('assignee_user_id = hrp_session_user_id()');
  });

  it('limits writes to managers and defines no delete policy', () => {
    expect(migration).toMatch(
      /CREATE POLICY hrp_handling_assignment_insert[\s\S]+FOR INSERT[\s\S]+TO app_user_writer[\s\S]+WITH CHECK \(\s*hrp_session_role\(\) IN \('ADMIN', 'HR_MANAGER'\)/,
    );
    expect(migration).toMatch(
      /CREATE POLICY hrp_handling_assignment_update[\s\S]+FOR UPDATE[\s\S]+TO app_user_writer[\s\S]+USING \(\s*hrp_session_role\(\) IN \('ADMIN', 'HR_MANAGER'\)/,
    );
    expect(migration).not.toMatch(/CREATE POLICY\s+\S+[^;]+FOR DELETE/i);
  });
});
