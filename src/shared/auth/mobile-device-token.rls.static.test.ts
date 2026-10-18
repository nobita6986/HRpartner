/**
 * mobile-device-token.rls.static.test.ts — T1A (AC-06).
 *
 * Static guard (filesystem đọc chính migration, không DB) canh các bất biến:
 *   - bảng mobile_device_tokens có ENABLE + FORCE ROW LEVEL SECURITY;
 *   - unique (user_id, fcm_token) + FK users ON DELETE CASCADE;
 *   - policy scope có nhánh USER self (user_id = hrp_session_user_id());
 *   - timesheet_lines policy cuối file có nhánh WORKER (hrp_worker_visible_for);
 *   - migration không tự chạy dữ liệu (không INSERT/GRANT WITH SET FALSE).
 * Tương tự lớp tĩnh migrations-permission-hygiene: mock Prisma không tái được
 * lỗi SQL, nên đọc file thật.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = join(
  process.cwd(),
  'prisma',
  'migrations',
  '20261018120000_mobile_device_token_with_rls',
  'migration.sql',
);

const sql = readFileSync(MIGRATION, 'utf8');

describe('migration 20261018120000_mobile_device_token_with_rls (AC-06)', () => {
  it('ENABLE + FORCE ROW LEVEL SECURITY cho mobile_device_tokens', () => {
    expect(sql).toMatch(/ALTER TABLE mobile_device_tokens ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE mobile_device_tokens FORCE ROW LEVEL SECURITY/);
  });

  it('unique (user_id, fcm_token) theo model MobileDeviceToken', () => {
    expect(sql).toContain('mobile_device_tokens_user_id_fcm_token_key');
    expect(sql).toMatch(/UNIQUE \(user_id, fcm_token\)/);
  });

  it('FK users ON DELETE CASCADE (ownership theo User)', () => {
    expect(sql).toMatch(/REFERENCES users\(id\) ON DELETE CASCADE/);
  });

  it('policy scope: user self + pattern hệ thống, WITH CHECK phủ cùng tập', () => {
    expect(sql).toContain('hrp_mobile_device_token_scope');
    expect(sql).toMatch(/user_id = hrp_session_user_id\(\)/);
    expect(sql).toMatch(/hrp_session_role\(\) IN \('ADMIN', 'HR_MANAGER', 'DIRECTOR'\)/);
    // WITH CHECK không mở rộng hơn USING (cùng 2 nhánh).
    const withCheckPart = sql.split('WITH CHECK (').slice(1)[0] ?? '';
    expect(withCheckPart).toMatch(/user_id = hrp_session_user_id\(\)/);
  });

  it('timesheet_lines policy có nhánh WORKER read-only (DEC-06)', () => {
    expect(sql).toMatch(/hrp_timesheet_line_scope ON timesheet_lines/);
    expect(sql).toMatch(
      /OR \(hrp_session_role\(\) = 'WORKER'[\s\S]*?hrp_worker_visible_for\(timesheet_lines\.worker_id\)/,
    );
  });

  it('không phải migration dữ liệu: không INSERT/UPDATE/DELETE/GRANT', () => {
    const bad = /(^|\n)\s*(INSERT|UPDATE|DELETE|GRANT|COPY)\b/i.test(sql);
    expect(bad).toBe(false);
  });

  it('idempotent: CREATE TABLE IF-guard (DO block) + DROP/re-assert pattern', () => {
    expect(sql).toContain('IF NOT EXISTS');
    expect(sql).toContain('DROP POLICY IF EXISTS hrp_mobile_device_token_scope');
    expect(sql).toContain('DROP POLICY IF EXISTS hrp_timesheet_line_scope');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION hrp_session_user_id');
  });
});
