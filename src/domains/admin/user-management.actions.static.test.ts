/**
 * Static terminology / contract test cho service user-management.
 *
 * Đảm bảo USER_AUDIT_ACTIONS giữ nguyên canonical set (CREATE / UPDATE /
 * DEACTIVATE / REACTIVATE) — nếu thay đổi phải review chỗ nào đang filter
 * theo action này (audit log, dashboard, …).
 */

import { describe, expect, it } from 'vitest';
import { USER_AUDIT_ACTIONS } from './user-management.service';

describe('user-management.service — audit action allowlist', () => {
  it('USER_AUDIT_ACTIONS có đúng 4 action canonical', () => {
    expect(Object.values(USER_AUDIT_ACTIONS).sort()).toEqual([
      'CREATE',
      'DEACTIVATE',
      'REACTIVATE',
      'UPDATE',
    ]);
  });

  it('mỗi action viết HOA, dạng string đơn giản (dùng làm audit_log.action)', () => {
    for (const v of Object.values(USER_AUDIT_ACTIONS)) {
      expect(v).toMatch(/^[A-Z_]+$/);
    }
  });
});
