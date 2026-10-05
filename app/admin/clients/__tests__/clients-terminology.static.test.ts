import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LIST = readFileSync(join(process.cwd(), 'app/admin/clients/page.tsx'), 'utf8');
const DETAIL = readFileSync(join(process.cwd(), 'app/admin/clients/[id]/page.tsx'), 'utf8');

describe('/admin/clients Wave 3 terminology', () => {
  it('uses translated Client status and company-size labels', () => {
    expect(LIST).toContain('clientStatusLabel(c.status)');
    expect(LIST).toContain('companySizeLabel(c.companySize)');
    expect(DETAIL).toContain('clientStatusLabel(client.status)');
    expect(LIST).not.toMatch(/>\s*\{c\.status\}\s*</);
    expect(DETAIL).not.toMatch(/>\s*\{client\.status\}\s*</);
  });

  it('uses Vietnamese Client detail metrics and Project status labels', () => {
    expect(DETAIL).toContain('projectStatusLabel(p.status)');
    expect(DETAIL).toContain('Đơn tuyển dụng');
    expect(DETAIL).toContain('Vị trí cần tuyển');
    expect(DETAIL).toContain('Đợt tuyển dụng');
    expect(DETAIL).not.toContain('Staffing Orders');
    expect(DETAIL).not.toContain('Job Openings');
  });
});
