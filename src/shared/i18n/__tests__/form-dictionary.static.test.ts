/**
 * form-dictionary.static.test.ts — Wave 1 Foundation shared form labels.
 *
 * Pure static tests: assert every common form/table label exists with a
 * non-empty Vietnamese string.
 */

import { describe, expect, it } from 'vitest';

import { FORM_LABELS, formLabel } from '@/src/shared/i18n/form-dictionary';

describe('shared/i18n/form-dictionary (Wave 1 Foundation)', () => {
  it('every label has a non-empty Vietnamese value', () => {
    for (const [code, label] of Object.entries(FORM_LABELS)) {
      expect(label.length, `label for ${code}`).toBeGreaterThan(0);
      expect(label.trim(), `label.trim for ${code}`).toBe(label);
    }
  });

  it('EP §3.5 binding spot checks', () => {
    expect(formLabel('status')).toBe('Trạng thái');
    expect(formLabel('action')).toBe('Thao tác');
    expect(formLabel('created')).toBe('Ngày tạo');
    expect(formLabel('updated')).toBe('Ngày cập nhật');
    expect(formLabel('code')).toBe('Mã');
    expect(formLabel('save')).toBe('Lưu');
    expect(formLabel('cancel')).toBe('Hủy');
    expect(formLabel('reason_required')).toBe('Lý do (bắt buộc)');
    expect(formLabel('date')).toBe('Ngày');
    expect(formLabel('time')).toBe('Giờ');
  });

  it('Wave 1 specific bindings (L-004 default user, L-047 CCCD)', () => {
    expect(formLabel('default_user')).toBe('Người dùng');
    expect(formLabel('cccd_label')).toBe('Số CCCD');
  });
});