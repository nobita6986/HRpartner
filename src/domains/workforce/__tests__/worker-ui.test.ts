import { describe, expect, it } from 'vitest';
import { WORKER_STATUS_LABELS, workerStatusLabel, workerStatusTone } from '../worker-ui';

describe('workforce worker UI labels', () => {
  it('covers every canonical employment status with Vietnamese labels', () => {
    expect(WORKER_STATUS_LABELS).toEqual({
      NONE: 'Chưa rõ',
      ACTIVE: 'Đang làm',
      SUSPENDED: 'Tạm ngưng',
      TERMINATED: 'Đã nghỉ',
    });
  });

  it('keeps unknown statuses from leaking raw enum values', () => {
    expect(workerStatusLabel('FUTURE_STATUS')).toBe('Trạng thái khác');
    expect(workerStatusLabel(null)).toBe('Chưa có dữ liệu');
    expect(workerStatusTone('FUTURE_STATUS')).toBe('NEUTRAL');
  });
});
