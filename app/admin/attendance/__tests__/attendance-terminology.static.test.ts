import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/attendance/page.tsx'), 'utf8');

describe('/admin/attendance Vietnamese terminology', () => {
  it('removes the reported missing-diacritic literals', () => {
    for (const literal of ['Huy', 'Dang', 'tao', '>Approve<', '>Resolve<', 'Employee code', 'Delta hours (positive']) {
      expect(SOURCE).not.toContain(literal);
    }
  });

  it('renders canonical statuses, sources, and owners through Vietnamese label helpers', () => {
    expect(SOURCE).toContain('attendanceBatchStatusLabel(b.status)');
    expect(SOURCE).toContain('attendancePeriodStatusLabel(p.status)');
    expect(SOURCE).toContain('attendanceSourceLabel(b.source)');
    expect(SOURCE).toContain('attendanceOwnerLabel(owner)');
    expect(SOURCE).not.toMatch(/>\s*\{[bp]\.status\}\s*</);
  });
});
