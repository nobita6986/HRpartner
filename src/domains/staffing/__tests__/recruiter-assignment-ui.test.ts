/**
 * recruiter-assignment-ui.test.ts — T1B Wave 2 dictionary test (EP §5.2 / §4.3 ownership).
 *
 * Asserts:
 *  - Every EP §3.2.7 Recruiter Assignment lifecycle status has a non-empty Vietnamese label.
 *  - `recruiterAssignmentStatusLabel()` returns the Vietnamese label for known values.
 *  - `recruiterAssignmentStatusLabel()` falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER).
 *  - Tone map has matching shape (no undefined).
 *
 * Wave 2 scope (DEC-10): dictionary + test only. No consumer rewrite in
 * `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx` (file
 * already renders Vietnamese labels from Wave 1 closeout).
 */

import { describe, expect, it } from 'vitest';

import {
  RECRUITER_ASSIGNMENT_STATUS_LABELS,
  RECRUITER_ASSIGNMENT_STATUS_TONES,
  recruiterAssignmentStatusLabel,
  recruiterAssignmentStatusTone,
} from '../recruiter-assignment-ui';

describe('recruiter-assignment-ui (T1B Wave 2) — Recruiter Assignment status dictionary', () => {
  it('exports a typed map for every EP §3.2.7 lifecycle status', () => {
    expect(RECRUITER_ASSIGNMENT_STATUS_LABELS.ACTIVE).toBe('Đang phụ trách');
    expect(RECRUITER_ASSIGNMENT_STATUS_LABELS.REVOKED).toBe('Đã thu hồi');
    expect(RECRUITER_ASSIGNMENT_STATUS_LABELS.SUPERSEDED).toBe('Đã thay thế');
  });

  it('tone map has matching shape (no undefined values for known statuses)', () => {
    for (const key of Object.keys(RECRUITER_ASSIGNMENT_STATUS_LABELS) as Array<keyof typeof RECRUITER_ASSIGNMENT_STATUS_LABELS>) {
      expect(RECRUITER_ASSIGNMENT_STATUS_TONES[key]).toBeDefined();
      expect(['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER']).toContain(RECRUITER_ASSIGNMENT_STATUS_TONES[key]);
    }
  });

  it('recruiterAssignmentStatusLabel() returns the Vietnamese label for known values', () => {
    expect(recruiterAssignmentStatusLabel('ACTIVE')).toBe('Đang phụ trách');
    expect(recruiterAssignmentStatusLabel('REVOKED')).toBe('Đã thu hồi');
    expect(recruiterAssignmentStatusLabel('SUPERSEDED')).toBe('Đã thay thế');
  });

  it('recruiterAssignmentStatusLabel() falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER) for unknown values', () => {
    expect(recruiterAssignmentStatusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('recruiterAssignmentStatusTone() returns the matching tone for known values', () => {
    expect(recruiterAssignmentStatusTone('ACTIVE')).toBe('SUCCESS');
  });

  it('recruiterAssignmentStatusTone() falls back to NEUTRAL for unknown values', () => {
    expect(recruiterAssignmentStatusTone('SOMETHING_NEW')).toBe('NEUTRAL');
  });
});
