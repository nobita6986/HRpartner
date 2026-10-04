import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/reconciliation/page.tsx'), 'utf8');

describe('/admin/reconciliation Vietnamese terminology', () => {
  it('removes the reported English and missing-diacritic display copy', () => {
    for (const literal of [
      '>Statements<',
      '>Generate<',
      'Vendor payable',
      'Client receivable',
      'Submit dispute',
      'Dispute count hien tai',
      'Ly do (required)',
      'Attachment URL (optional)',
      'Huy',
      'Dang',
      'tao',
    ]) {
      expect(SOURCE).not.toContain(literal);
    }
  });

  it('renders status and kind values through their Vietnamese dictionaries', () => {
    expect(SOURCE).toContain('reconciliationStatementKindLabel(s.kind)');
    expect(SOURCE).toContain('reconciliationStatementStatusLabel(s.status)');
    expect(SOURCE).not.toMatch(/>\s*\{s\.(?:kind|status)\}\s*</);
  });
});
