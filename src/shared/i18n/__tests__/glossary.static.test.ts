/**
 * glossary.static.test.ts — Wave 1 Foundation cross-module glossary.
 *
 * Pure static tests: assert every EP §3.1 entry exists with non-empty Vietnamese
 * label, no two entries share a code, and lookup helpers return the binding
 * labels. No DOM, no React, no DB.
 */

import { describe, expect, it } from 'vitest';

import { GLOSSARY, glossaryLabel, glossaryLabelWithHint } from '@/src/shared/i18n/glossary';

describe('shared/i18n/glossary (Wave 1 Foundation)', () => {
  it('contains all 17 cross-module entries from EP §3.1', () => {
    expect(Object.keys(GLOSSARY)).toHaveLength(17);
  });

  it('every entry has a non-empty Vietnamese label', () => {
    for (const [code, entry] of Object.entries(GLOSSARY)) {
      expect(entry.label.length, `label for ${code}`).toBeGreaterThan(0);
      expect(entry.label.trim(), `label.trim for ${code}`).toBe(entry.label);
    }
  });

  it('every entry has a non-empty ownerSource citation', () => {
    for (const [code, entry] of Object.entries(GLOSSARY)) {
      expect(entry.ownerSource.length, `ownerSource for ${code}`).toBeGreaterThan(0);
    }
  });

  it('no two entries share the same code', () => {
    const codes = Object.values(GLOSSARY).map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('glossaryLabel returns the binding Vietnamese label for known codes', () => {
    expect(glossaryLabel('project')).toBe('Dự án');
    expect(glossaryLabel('staffing')).toBe('Nhu cầu tuyển dụng');
    expect(glossaryLabel('job_opening')).toBe('Đợt tuyển dụng');
    expect(glossaryLabel('job_posting')).toBe('Tin tuyển dụng');
    expect(glossaryLabel('worker')).toBe('Người lao động');
    expect(glossaryLabel('worker_id')).toBe('Mã người lao động');
    expect(glossaryLabel('recruiter_workbench')).toBe('Bàn làm việc tuyển dụng');
  });

  it('glossaryLabelWithHint returns labelWithTechnicalHint when present', () => {
    expect(glossaryLabelWithHint('job_posting')).toBe('Tin tuyển dụng (JobPosting)');
    expect(glossaryLabelWithHint('worker')).toBe('Người lao động (Worker)');
    expect(glossaryLabelWithHint('labor_profile_long')).toBe(
      'Hồ sơ người lao động (LaborProfile)',
    );
  });

  it('glossaryLabelWithHint falls back to label when no hint is present', () => {
    expect(glossaryLabelWithHint('project')).toBe('Dự án');
    expect(glossaryLabelWithHint('worker_id')).toBe('Mã người lao động');
  });

  it('EP §3.1 binding spot checks (canonical never leaks to label)', () => {
    // These MUST render in Vietnamese; canonical English terms MUST NOT appear.
    for (const entry of Object.values(GLOSSARY)) {
      expect(entry.label).not.toMatch(/^Project$/);
      expect(entry.label).not.toMatch(/^Worker$/);
      expect(entry.label).not.toMatch(/^Placement$/);
      expect(entry.label).not.toMatch(/^JobPosting$/);
    }
  });
});