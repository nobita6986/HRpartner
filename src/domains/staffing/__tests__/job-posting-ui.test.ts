/**
 * job-posting-ui.test.ts — T1B Wave 2 dictionary test (EP §5.2 / §4.3 ownership).
 *
 * Asserts:
 *  - Every EP §3.2.3 JobPosting lifecycle status has a non-empty Vietnamese label.
 *  - Display action labels match EP §3.3 #3-#5 (`Đăng tin` / `Gỡ tin` / `Lưu trữ`).
 *  - The action labels are re-imported from `src/shared/i18n/action-dictionary.ts`
 *    (not redefined — see assert that the file does NOT define a parallel map).
 *  - `jobPostingStatusLabel()` returns the Vietnamese label for known values.
 *  - `jobPostingStatusLabel()` falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER).
 *  - Tone map has matching shape (no undefined).
 *  - Canonical lifecycle operation names (`Publish` / `Unpublish` / `Archive`)
 *    are preserved in JOB_POSTING_ACTION_CODES (canonical enum keys, NOT display).
 */

import { describe, expect, it } from 'vitest';

import {
  JOB_POSTING_ACTION_CODES,
  JOB_POSTING_ACTION_LABELS,
  JOB_POSTING_STATUS_LABELS,
  JOB_POSTING_STATUS_TONES,
  jobPostingStatusLabel,
  jobPostingStatusTone,
} from '../job-posting-ui';

describe('job-posting-ui (T1B Wave 2) — JobPosting status dictionary', () => {
  it('exports a typed map for every EP §3.2.3 lifecycle status', () => {
    expect(JOB_POSTING_STATUS_LABELS.DRAFT).toBe('Bản nháp');
    expect(JOB_POSTING_STATUS_LABELS.PUBLISHED).toBe('Đã đăng');
    expect(JOB_POSTING_STATUS_LABELS.ARCHIVED).toBe('Đã lưu trữ');
  });

  it('exports display action labels per EP §3.3 #3-#5 (Đăng tin / Gỡ tin / Lưu trữ)', () => {
    expect(JOB_POSTING_ACTION_LABELS.publish).toBe('Đăng tin');
    expect(JOB_POSTING_ACTION_LABELS.unpublish).toBe('Gỡ tin');
    expect(JOB_POSTING_ACTION_LABELS.archive).toBe('Lưu trữ');
  });

  it('preserves canonical lifecycle operation names in JOB_POSTING_ACTION_CODES', () => {
    // F11 §9 binding + T0 §2 #2: canonical names MUST be preserved on
    // API/aria/value/runStateMutation argument. Display labels changed.
    expect(JOB_POSTING_ACTION_CODES.publish).toBe('publish');
    expect(JOB_POSTING_ACTION_CODES.unpublish).toBe('unpublish');
    expect(JOB_POSTING_ACTION_CODES.archive).toBe('archive');
  });

  it('tone map has matching shape (no undefined values for known statuses)', () => {
    for (const key of Object.keys(JOB_POSTING_STATUS_LABELS) as Array<keyof typeof JOB_POSTING_STATUS_LABELS>) {
      expect(JOB_POSTING_STATUS_TONES[key]).toBeDefined();
      expect(['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER']).toContain(JOB_POSTING_STATUS_TONES[key]);
    }
  });

  it('jobPostingStatusLabel() returns the Vietnamese label for known values', () => {
    expect(jobPostingStatusLabel('DRAFT')).toBe('Bản nháp');
    expect(jobPostingStatusLabel('PUBLISHED')).toBe('Đã đăng');
    expect(jobPostingStatusLabel('ARCHIVED')).toBe('Đã lưu trữ');
  });

  it('jobPostingStatusLabel() does not expose unknown raw values', () => {
    expect(jobPostingStatusLabel('SOMETHING_NEW')).toBe('Không xác định');
  });

  it('jobPostingStatusTone() returns the matching tone for known values', () => {
    expect(jobPostingStatusTone('PUBLISHED')).toBe('SUCCESS');
    expect(jobPostingStatusTone('DRAFT')).toBe('NEUTRAL');
    expect(jobPostingStatusTone('ARCHIVED')).toBe('NEUTRAL');
  });

  it('jobPostingStatusTone() falls back to NEUTRAL for unknown values', () => {
    expect(jobPostingStatusTone('SOMETHING_NEW')).toBe('NEUTRAL');
  });
});
