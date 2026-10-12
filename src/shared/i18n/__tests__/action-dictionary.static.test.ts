/**
 * action-dictionary.static.test.ts — Wave 1 Foundation shared action labels.
 *
 * Pure static tests: assert every action code has a Vietnamese label and the
 * JobPosting binding (`Đăng tin / Gỡ tin / Lưu trữ`) is correct.
 */

import { describe, expect, it } from 'vitest';

import { ACTION_LABELS, actionLabel } from '@/src/shared/i18n/action-dictionary';

describe('shared/i18n/action-dictionary (Wave 1 Foundation)', () => {
  it('contains all 17 entries from EP §3.3 rows #3-#19', () => {
    expect(Object.keys(ACTION_LABELS)).toHaveLength(17);
  });

  it('every action has a non-empty Vietnamese label', () => {
    for (const [code, label] of Object.entries(ACTION_LABELS)) {
      expect(label.length, `label for ${code}`).toBeGreaterThan(0);
      expect(label.trim(), `label.trim for ${code}`).toBe(label);
    }
  });

  it('T0 §2 #2 binding: JobPosting display labels are Đăng tin / Gỡ tin / Lưu trữ', () => {
    expect(actionLabel('publish')).toBe('Đăng tin');
    expect(actionLabel('unpublish')).toBe('Gỡ tin');
    expect(actionLabel('archive')).toBe('Lưu trữ');
  });

  it('EP §3.3 binding spot checks', () => {
    expect(actionLabel('open_opening')).toBe('Mở đợt tuyển');
    expect(actionLabel('close_opening')).toBe('Đóng đợt tuyển');
    expect(actionLabel('cancel')).toBe('Hủy');
    expect(actionLabel('save')).toBe('Lưu');
    expect(actionLabel('create')).toBe('Tạo');
    expect(actionLabel('update')).toBe('Cập nhật');
    expect(actionLabel('claim')).toBe('Nhận phụ trách');
    expect(actionLabel('assign')).toBe('Phân công');
    expect(actionLabel('resolve')).toBe('Xử lý');
    expect(actionLabel('approve')).toBe('Duyệt');
    expect(actionLabel('adjustment')).toBe('Điều chỉnh');
    expect(actionLabel('add_adjustment')).toBe('+ Tạo điều chỉnh');
    expect(actionLabel('dispute')).toBe('Tranh chấp');
    expect(actionLabel('submit_dispute')).toBe('Gửi tranh chấp');
  });
});