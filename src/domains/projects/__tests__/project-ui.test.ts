/**
 * project-ui.test.ts — T1B Wave 2 dictionary test (EP §5.2 / §4.3 ownership).
 *
 * Asserts:
 *  - Every EP §3.2.1 Project lifecycle status has a non-empty Vietnamese label.
 *  - Every column-derived publish label is present (EP §3.2.1 second half).
 *  - `projectStatusLabel()` returns the Vietnamese label for known values.
 *  - `projectStatusLabel()` falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER) for unknown values.
 *  - `projectPublishColumnLabel()` distinguishes (isPublic, status) combinations.
 *  - Tone map has matching shape (no undefined).
 *  - No redefinition of cross-module term "Dự án" in this file (must import
 *    from glossary.ts if needed).
 */

import { describe, expect, it } from 'vitest';

import {
  PROJECT_PUBLISH_COLUMN_LABELS,
  PROJECT_PUBLISH_COLUMN_TONES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  projectPublishColumnLabel,
  projectPublishColumnTone,
  projectStatusLabel,
  projectStatusTone,
} from '../project-ui';

describe('project-ui (T1B Wave 2) — Project status dictionary', () => {
  it('exports a typed map for every EP §3.2.1 lifecycle status', () => {
    expect(PROJECT_STATUS_LABELS.DRAFT).toBe('Nháp');
    expect(PROJECT_STATUS_LABELS.ACTIVE).toBe('Hoạt động');
    expect(PROJECT_STATUS_LABELS.PAUSED).toBe('Tạm dừng');
    expect(PROJECT_STATUS_LABELS.COMPLETED).toBe('Hoàn thành');
    expect(PROJECT_STATUS_LABELS.CANCELLED).toBe('Đã hủy');
  });

  it('exports column-derived publish labels per EP §3.2.1', () => {
    expect(PROJECT_PUBLISH_COLUMN_LABELS.published).toBe('Đã công bố');
    expect(PROJECT_PUBLISH_COLUMN_LABELS.unpublished).toBe('Chưa công bố');
    expect(PROJECT_PUBLISH_COLUMN_LABELS.closed).toBe('Đã đóng');
  });

  it('tone map has matching shape (no undefined values for known statuses)', () => {
    for (const key of Object.keys(PROJECT_STATUS_LABELS) as Array<keyof typeof PROJECT_STATUS_LABELS>) {
      expect(PROJECT_STATUS_TONES[key]).toBeDefined();
      expect(['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER']).toContain(PROJECT_STATUS_TONES[key]);
    }
    for (const key of Object.keys(PROJECT_PUBLISH_COLUMN_LABELS) as Array<keyof typeof PROJECT_PUBLISH_COLUMN_LABELS>) {
      expect(PROJECT_PUBLISH_COLUMN_TONES[key]).toBeDefined();
      expect(['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER']).toContain(PROJECT_PUBLISH_COLUMN_TONES[key]);
    }
  });

  it('projectStatusLabel() returns the Vietnamese label for known values', () => {
    expect(projectStatusLabel('DRAFT')).toBe('Nháp');
    expect(projectStatusLabel('ACTIVE')).toBe('Hoạt động');
    expect(projectStatusLabel('PAUSED')).toBe('Tạm dừng');
    expect(projectStatusLabel('COMPLETED')).toBe('Hoàn thành');
    expect(projectStatusLabel('CANCELLED')).toBe('Đã hủy');
  });

  it('projectStatusLabel() falls back to canonical enum (KEEP_CANONICAL_IDENTIFIER) for unknown values', () => {
    expect(projectStatusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('projectStatusTone() returns the matching tone for known values', () => {
    expect(projectStatusTone('ACTIVE')).toBe('SUCCESS');
    expect(projectStatusTone('CANCELLED')).toBe('DANGER');
  });

  it('projectStatusTone() falls back to NEUTRAL for unknown values', () => {
    expect(projectStatusTone('SOMETHING_NEW')).toBe('NEUTRAL');
  });

  it('projectPublishColumnLabel() distinguishes (isPublic, status) — CLOSED wins over isPublic', () => {
    // isPublic=true + status='CLOSED' → "Đã đóng" (CLOSED wins)
    expect(projectPublishColumnLabel(true, 'CLOSED')).toBe('Đã đóng');
    // isPublic=false + status='CLOSED' → "Đã đóng"
    expect(projectPublishColumnLabel(false, 'CLOSED')).toBe('Đã đóng');
    // isPublic=true + status='ACTIVE' → "Đã công bố"
    expect(projectPublishColumnLabel(true, 'ACTIVE')).toBe('Đã công bố');
    // isPublic=false + status='ACTIVE' → "Chưa công bố"
    expect(projectPublishColumnLabel(false, 'ACTIVE')).toBe('Chưa công bố');
  });

  it('projectPublishColumnTone() mirrors the label selection', () => {
    expect(projectPublishColumnTone(true, 'CLOSED')).toBe('DANGER');
    expect(projectPublishColumnTone(true, 'ACTIVE')).toBe('SUCCESS');
    expect(projectPublishColumnTone(false, 'ACTIVE')).toBe('NEUTRAL');
  });
});
