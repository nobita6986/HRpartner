import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/payroll/page.tsx'), 'utf8');

describe('/admin/payroll Vietnamese terminology', () => {
  it('keeps payroll labels Vietnamese and prevents raw type fallbacks', () => {
    for (const label of ['Số', 'Phần trăm', 'Hệ số', 'Tiền tệ', 'Có/Không', 'Chuỗi']) {
      expect(SOURCE).toContain(`'${label}'`);
    }
    expect(SOURCE).toContain("{TYPE_LABELS[type] ?? 'Loại khác'}");
    expect(SOURCE).not.toMatch(/TYPE_LABELS\[type\]\s*\?\?\s*type/);
    expect(SOURCE).not.toContain('`${value}x`');
    expect(SOURCE).toContain('`${value} lần`');
  });

  it('preserves the existing payroll value type codes', () => {
    for (const code of ['NUMBER', 'PERCENT', 'MULTIPLIER', 'MONEY', 'BOOLEAN', 'STRING']) {
      expect(SOURCE).toContain(`${code}:`);
    }
  });
});
