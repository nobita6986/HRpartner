import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/users/page.tsx'), 'utf8');

describe('/admin/users Wave 3 terminology', () => {
  it('reuses the Wave 1 role-label foundation and preserves canonical filter values', () => {
    expect(SOURCE).toContain("from '@/src/shared/i18n/role-labels'");
    expect(SOURCE).toContain('roleLabel(u.role)');
    expect(SOURCE).not.toMatch(/const ROLE_LABELS\s*:/);
    expect(SOURCE).not.toMatch(/\{u\.role\}/);
  });

  it('uses Vietnamese account and identifier labels', () => {
    expect(SOURCE).toContain("'Mã người dùng'");
    expect(SOURCE).toContain("'Mã nhà cung cấp'");
    expect(SOURCE).toContain('Tổng: {total} tài khoản');
    expect(SOURCE).not.toMatch(/>\s*User ID\s*</);
    expect(SOURCE).not.toMatch(/>\s*Vendor ID\s*</);
    expect(SOURCE).not.toMatch(/Tổng: \{total\} users/);
  });
});
