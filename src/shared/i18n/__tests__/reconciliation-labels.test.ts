import { describe, expect, it } from 'vitest';

import {
  RECONCILIATION_STATEMENT_KIND_LABELS,
  RECONCILIATION_STATEMENT_STATUS_LABELS,
  reconciliationStatementKindLabel,
  reconciliationStatementStatusLabel,
} from '@/src/shared/i18n/reconciliation-labels';

describe('reconciliation labels', () => {
  it('covers every canonical statement status and kind', () => {
    expect(Object.keys(RECONCILIATION_STATEMENT_STATUS_LABELS)).toEqual([
      'DRAFT',
      'SENT',
      'DISPUTED',
      'CONFIRMED',
      'LOCKED',
      'PAID',
    ]);
    expect(Object.keys(RECONCILIATION_STATEMENT_KIND_LABELS)).toEqual(['VENDOR', 'CLIENT']);

    for (const labels of [RECONCILIATION_STATEMENT_STATUS_LABELS, RECONCILIATION_STATEMENT_KIND_LABELS]) {
      for (const label of Object.values(labels)) {
        expect(label.trim()).toBe(label);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('translates known values and uses Vietnamese fallbacks', () => {
    expect(reconciliationStatementStatusLabel('DISPUTED')).toBe('Đang tranh chấp');
    expect(reconciliationStatementKindLabel('VENDOR')).toBe('Nhà cung cấp');
    expect(reconciliationStatementStatusLabel('UNKNOWN')).toBe('Trạng thái khác');
    expect(reconciliationStatementKindLabel('UNKNOWN')).toBe('Loại đối tác khác');
  });
});
