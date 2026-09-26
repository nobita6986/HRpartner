/**
 * NextActionBadge.test.ts — Unit tests for the E1 next-action badge.
 *
 * Frozen contracts (TASK.md AC-10, RQ-10):
 *   - Exactly 7 enum values map to 7 distinct labels.
 *   - The component is pure: it does NOT derive `nextAction` from row fields.
 *   - The component does NOT touch the database.
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// We use React.createElement directly because the unit-lane config does NOT
// match .test.tsx under app/**.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

import {
  NextActionBadge,
  NEXT_ACTION_META,
  NEXT_ACTION_VALUES,
} from './NextActionBadge';
import {
  SERVER_DERIVED_NEXT_ACTION_VALUES,
  type ServerDerivedNextAction,
} from '@/src/domains/talent/recruiter-workbench.types';

describe('NextActionBadge', () => {
  it('exposes exactly 7 enum values from E0 (frozen, no CONTACT_CANDIDATE)', () => {
    expect(NEXT_ACTION_VALUES).toEqual(SERVER_DERIVED_NEXT_ACTION_VALUES);
    expect(NEXT_ACTION_VALUES).toHaveLength(7);
    expect(NEXT_ACTION_VALUES).not.toContain('CONTACT_CANDIDATE');
  });

  it('covers every enum value in the static meta map', () => {
    for (const v of NEXT_ACTION_VALUES) {
      expect(NEXT_ACTION_META[v]).toBeDefined();
      expect(typeof NEXT_ACTION_META[v].label).toBe('string');
      expect(NEXT_ACTION_META[v].label.length).toBeGreaterThan(0);
    }
  });

  it('renders the OPEN_INTAKE label and data attribute', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'OPEN_INTAKE' }));
    expect(html).toContain('Mở hồ sơ intake');
    expect(html).toContain('data-next-action="OPEN_INTAKE"');
  });

  it('renders the REQUEST_DOCS label', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'REQUEST_DOCS' }));
    expect(html).toContain('Yêu cầu giấy tờ');
    expect(html).toContain('data-next-action="REQUEST_DOCS"');
  });

  it('renders the SCREEN_SUBMISSION label', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'SCREEN_SUBMISSION' }));
    expect(html).toContain('Sàng lọc hồ sơ');
    expect(html).toContain('data-next-action="SCREEN_SUBMISSION"');
  });

  it('renders the SCHEDULE_SCREEN label', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'SCHEDULE_SCREEN' }));
    expect(html).toContain('Sắp lịch sàng lọc');
    expect(html).toContain('data-next-action="SCHEDULE_SCREEN"');
  });

  it('renders the AWAITING_RESULT label', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'AWAITING_RESULT' }));
    expect(html).toContain('Chờ kết quả');
    expect(html).toContain('data-next-action="AWAITING_RESULT"');
  });

  it('renders the REVIEW_PLACEMENT label', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'REVIEW_PLACEMENT' }));
    expect(html).toContain('Xem placement');
    expect(html).toContain('data-next-action="REVIEW_PLACEMENT"');
  });

  it('renders the NONE label as an em-dash (not a colored chip)', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'NONE' }));
    expect(html).toContain('—');
    expect(html).toContain('data-next-action="NONE"');
  });

  it('does NOT derive nextAction — uses only the value passed in', () => {
    const html1 = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'REQUEST_DOCS' }));
    const html2 = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'REVIEW_PLACEMENT' }));
    expect(html1).not.toEqual(html2);
    expect(html1).toContain('REQUEST_DOCS');
    expect(html2).toContain('REVIEW_PLACEMENT');
  });

  it('renders an aria-label for screen readers', () => {
    const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: 'AWAITING_RESULT' }));
    expect(html).toMatch(/aria-label="Hành động tiếp theo: Chờ kết quả"/);
  });

  it('exhaustiveness: every value in the type renders without crash', () => {
    const values: ServerDerivedNextAction[] = [
      'OPEN_INTAKE',
      'REQUEST_DOCS',
      'SCREEN_SUBMISSION',
      'SCHEDULE_SCREEN',
      'AWAITING_RESULT',
      'REVIEW_PLACEMENT',
      'NONE',
    ];
    for (const v of values) {
      const html = renderToStaticMarkup(React.createElement(NextActionBadge, { action: v }));
      expect(html).toContain(`data-next-action="${v}"`);
    }
  });
});
