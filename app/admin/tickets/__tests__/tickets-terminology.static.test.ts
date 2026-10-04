import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/tickets/page.tsx'), 'utf8');

describe('/admin/tickets Vietnamese terminology', () => {
  it('uses Vietnamese copy and does not render raw fallback values', () => {
    expect(SOURCE).toContain('Quản lý phiếu phản ánh từ người dùng');
    expect(SOURCE).toContain('Tổng: {total} phiếu');
    expect(SOURCE).not.toContain('Tổng: {total} tickets');
    expect(SOURCE).not.toMatch(/label:\s*status/);
    expect(SOURCE).not.toMatch(/TYPE_LABELS\[type\]\s*\?\?\s*type/);
    expect(SOURCE).not.toMatch(/label:\s*priority/);
    for (const literal of ['Huy', 'Dang', 'tao']) {
      expect(SOURCE).not.toContain(literal);
    }
  });

  it('preserves canonical ticket filter and display keys', () => {
    for (const code of ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CANCELLED']) {
      expect(SOURCE).toContain(`'${code}'`);
    }
    for (const code of ['TIMESHEET_DISPUTE', 'LEAVE_REQUEST', 'ADVANCE_REQUEST', 'OTHER']) {
      expect(SOURCE).toContain(`${code}:`);
    }
  });
});
