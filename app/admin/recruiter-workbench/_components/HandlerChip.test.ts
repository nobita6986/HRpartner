/**
 * HandlerChip.test.ts — Unit tests for the E1 handler chip.
 *
 * Frozen contracts (TASK.md AC-12, RQ-12):
 *   - Renders assigneeName when present.
 *   - Renders "Chưa phân công" (muted) when assigneeName is null.
 *   - MUST NOT query the DB to resolve a name.
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// We use React.createElement directly because the unit-lane config does NOT
// match .test.tsx under app/**.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

import { HandlerChip } from './HandlerChip';

describe('HandlerChip', () => {
  it('renders assigneeName when present (assigned)', () => {
    const html = renderToStaticMarkup(
      React.createElement(HandlerChip, { assigneeName: 'Nguyễn Văn A', source: 'assignment-1' }),
    );
    expect(html).toContain('Nguyễn Văn A');
    expect(html).toContain('data-assigned="true"');
    expect(html).toContain('data-source="assignment-1"');
    expect(html).toContain('aria-label="Phụ trách: Nguyễn Văn A"');
  });

  it('renders "Chưa phân công" muted when assigneeName is null', () => {
    const html = renderToStaticMarkup(React.createElement(HandlerChip, { assigneeName: null }));
    expect(html).toContain('Chưa phân công');
    expect(html).toContain('data-assigned="false"');
    expect(html).toContain('aria-label="Chưa phân công"');
  });

  it('renders "Chưa phân công" when assigneeName is empty string', () => {
    const html = renderToStaticMarkup(React.createElement(HandlerChip, { assigneeName: '' }));
    expect(html).toContain('Chưa phân công');
    expect(html).toContain('data-assigned="false"');
  });

  it('does NOT query the DB (no fetch / axios / prisma calls)', () => {
    const html = renderToStaticMarkup(
      React.createElement(HandlerChip, { assigneeName: 'Test', source: 'test-src' }),
    );
    expect(html).toContain('Test');
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('axios');
    expect(html).not.toContain('prisma');
  });
});
