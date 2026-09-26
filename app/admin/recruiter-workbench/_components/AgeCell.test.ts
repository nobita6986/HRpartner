/**
 * AgeCell.test.ts — Unit tests for the E1 age cell.
 *
 * Frozen contracts (TASK.md AC-11, RQ-11):
 *   - `ageHours` and `isOverdue` are server-provided; the cell MUST NOT
 *     recompute them.
 *   - The output is purely format + tone: <1h, Xh, Xd, Xd Yh.
 *   - When `isOverdue` is true, the tone uses red; otherwise neutral.
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// We use React.createElement directly because the unit-lane config does NOT
// match .test.tsx under app/**.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

import { AgeCell } from './AgeCell';

describe('AgeCell', () => {
  it('formats ageHours < 1 as "<1h"', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 0.4, isOverdue: false }));
    expect(html).toMatch(/(&lt;1h|<1h)/);
    expect(html).toContain('data-age-hours="0.4"');
    expect(html).toContain('data-is-overdue="false"');
  });

  it('formats ageHours < 24 as Xh (rounded)', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 5.25, isOverdue: false }));
    expect(html).toContain('5.3h');
  });

  it('formats ageHours >= 24 as Xd Yh', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 49, isOverdue: false }));
    expect(html).toContain('2d 1h');
  });

  it('formats exact day multiples as Xd only', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 48, isOverdue: false }));
    expect(html).toContain('2d');
    expect(html).not.toContain('0h');
  });

  it('formats ageHours = 0 as "<1h"', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 0, isOverdue: false }));
    expect(html).toMatch(/(&lt;1h|<1h)/);
  });

  it('renders red tone when isOverdue=true', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 73, isOverdue: true }));
    expect(html).toContain('data-is-overdue="true"');
    expect(html).toContain('bg-red-100');
    expect(html).toContain('aria-label="Quá hạn:');
  });

  it('renders neutral tone when isOverdue=false (regardless of ageHours)', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 80, isOverdue: false }));
    expect(html).toContain('data-is-overdue="false"');
    expect(html).not.toContain('bg-red-100');
    expect(html).toContain('aria-label="Thời gian mở:');
  });

  it('does NOT recompute isOverdue from ageHours (server flag is authoritative)', () => {
    const html = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: 200, isOverdue: false }));
    expect(html).toContain('data-is-overdue="false"');
    expect(html).not.toContain('bg-red-100');
  });

  it('handles negative or NaN ageHours defensively', () => {
    const htmlNeg = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: -3, isOverdue: false }));
    expect(htmlNeg).toContain('—');
    const htmlNaN = renderToStaticMarkup(React.createElement(AgeCell, { ageHours: Number.NaN, isOverdue: false }));
    expect(htmlNaN).toContain('—');
  });
});
