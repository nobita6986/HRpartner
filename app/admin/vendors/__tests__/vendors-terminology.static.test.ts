import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/vendors/page.tsx'), 'utf8');

describe('/admin/vendors Wave 3 terminology', () => {
  it('uses Vietnamese supplier labels and translated status values', () => {
    expect(SOURCE).toContain('vendorStatusLabel(v.status)');
    expect(SOURCE).toContain('<StatusBadge module="vendor"');
    expect(SOURCE).toContain('Nhà cung cấp');
    expect(SOURCE).toContain('Tổng: {total} nhà cung cấp');
    expect(SOURCE).not.toMatch(/>\s*\{v\.status\}\s*</);
    expect(SOURCE).not.toMatch(/>\s*Vendors\s*</);
    expect(SOURCE).not.toContain('vendor nào');
  });
});
