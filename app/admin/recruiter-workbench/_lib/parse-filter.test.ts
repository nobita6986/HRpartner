/**
 * parse-filter.test.ts — Unit tests for the URL → RecruiterWorkbenchFilter parser.
 *
 * Frozen contracts (TASK.md RQ-21, AC-01):
 *   - Omitted param → safe defaults; `view` defaults at page level (NOT here).
 *   - Invalid explicit (zod fail) → returns `ok: false` with issues; caller
 *     MUST NOT call E0 service in this branch.
 *   - `.strict()` schema rejects unknown keys.
 */

import { describe, expect, it } from 'vitest';

import {
  parseRecruiterWorkbenchQuery,
  searchParamsToRecord,
} from './parse-filter';

describe('parseRecruiterWorkbenchQuery', () => {
  it('returns ok with defaults when all params are omitted', () => {
    const result = parseRecruiterWorkbenchQuery({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      // E0 zod defaults page=1 and pageSize=20. `view` is left undefined at
      // the parser layer — the page applies role-based defaulting.
      expect(result.filter.page).toBe(1);
      expect(result.filter.pageSize).toBe(20);
      expect(result.filter.view).toBeUndefined();
    }
  });

  it('parses valid explicit params', () => {
    const result = parseRecruiterWorkbenchQuery({
      view: 'UNASSIGNED',
      caseStatus: 'OPEN',
      overdue: 'true',
      sort: 'ageAsc',
      page: '2',
      pageSize: '50',
      search: 'Nguyen',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.view).toBe('UNASSIGNED');
      expect(result.filter.caseStatus).toBe('OPEN');
      expect(result.filter.overdue).toBe(true);
      expect(result.filter.sort).toBe('ageAsc');
      expect(result.filter.page).toBe(2);
      expect(result.filter.pageSize).toBe(50);
      expect(result.filter.search).toBe('Nguyen');
    }
  });

  it('coerces overdue=false to boolean', () => {
    const result = parseRecruiterWorkbenchQuery({ overdue: 'false' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.overdue).toBe(false);
    }
  });

  it('omits overdue when URL has no overdue param (safe default)', () => {
    const result = parseRecruiterWorkbenchQuery({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.overdue).toBeUndefined();
    }
  });

  it('returns ok:false when explicit page=-1 is invalid', () => {
    const result = parseRecruiterWorkbenchQuery({ page: '-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].path).toContain('page');
    }
  });

  it('returns ok:false when explicit pageSize=13 is invalid', () => {
    const result = parseRecruiterWorkbenchQuery({ pageSize: '13' });
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when overdue=yes is invalid', () => {
    const result = parseRecruiterWorkbenchQuery({ overdue: 'yes' });
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when unknown key is present (E0 strict)', () => {
    const result = parseRecruiterWorkbenchQuery({ typoKey: 'value' });
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when view=INVALID is not in the enum', () => {
    const result = parseRecruiterWorkbenchQuery({ view: 'INVALID' });
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when caseStatus=UNKNOWN is not in the enum', () => {
    const result = parseRecruiterWorkbenchQuery({ caseStatus: 'UNKNOWN' });
    expect(result.ok).toBe(false);
  });

  it('omitted page defaults to 1 (safe default)', () => {
    const result = parseRecruiterWorkbenchQuery({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.page).toBe(1);
    }
  });

  it('omitted pageSize defaults to 20 (safe default)', () => {
    const result = parseRecruiterWorkbenchQuery({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.pageSize).toBe(20);
    }
  });

  it('omitted sort leaves filter.sort undefined (page applies default)', () => {
    const result = parseRecruiterWorkbenchQuery({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.sort).toBeUndefined();
    }
  });
});

describe('searchParamsToRecord', () => {
  it('joins array values with comma', () => {
    const out = searchParamsToRecord({
      foo: ['a', 'b'],
      bar: 'c',
      baz: undefined,
    });
    expect(out).toEqual({ foo: 'a,b', bar: 'c' });
  });

  it('skips undefined values', () => {
    const out = searchParamsToRecord({
      foo: undefined,
      bar: 'x',
    });
    expect(out).toEqual({ bar: 'x' });
  });

  it('handles empty array', () => {
    const out = searchParamsToRecord({
      foo: [],
      bar: 'x',
    });
    expect(out).toEqual({ foo: '', bar: 'x' });
  });
});
