/**
 * status-badge.test.tsx — Wave 1 Foundation shared presentation primitive.
 *
 * Render tests that lock the contract: primitive owns NO dictionary data,
 * tone classes are stable, `data-testid`/`data-status-badge-*` attributes are
 * stable for static tests.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StatusBadge } from '@/src/shared/ui/status-badge';

describe('shared/ui/status-badge (Wave 1 Foundation)', () => {
  it('renders the children passed in by the consumer (NO built-in dictionary)', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBadge, {
        module: 'recruiter-assignment',
        status: 'ACTIVE',
        children: 'Đang phụ trách',
      }),
    );
    expect(html).toContain('Đang phụ trách');
    // The canonical enum must remain in the data attribute (audit trail)
    // but MUST NOT be the rendered text — the consumer is responsible for
    // mapping enum → Vietnamese label.
    expect(html).toContain('data-status-badge-status="ACTIVE"');
    expect(html).not.toMatch(/>\s*ACTIVE\s*</);
  });

  it('default tone is NEUTRAL when not provided', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBadge, {
        module: 'job-posting',
        status: 'PUBLISHED',
        children: 'Đã đăng',
      }),
    );
    expect(html).toContain('bg-slate-100 text-slate-700');
  });

  it('explicit tone classes are stable', () => {
    for (const tone of ['NEUTRAL', 'SUCCESS', 'WARN', 'DANGER'] as const) {
      const html = renderToStaticMarkup(
        createElement(StatusBadge, {
          module: 'job-opening',
          status: 'CLOSED',
          tone,
          children: 'Đã đóng',
        }),
      );
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it('testId defaults to module-status and can be overridden', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBadge, {
        module: 'application',
        status: 'SCREENING',
        children: 'Đang xét',
        testId: 'custom-id',
      }),
    );
    expect(html).toContain('data-testid="custom-id"');
  });

  it('canonical enum / NEVER rendered as primary text (T0 §2 #2)', () => {
    // Re-test for the JobPosting canonical operation names.
    for (const status of ['PUBLISHED', 'ARCHIVED', 'DRAFT']) {
      const html = renderToStaticMarkup(
        createElement(StatusBadge, {
          module: 'job-posting',
          status,
          children: 'Đã đăng',
        }),
      );
      // The badge MUST render the consumer-supplied Vietnamese label,
      // not the raw enum.
      expect(html).toContain('Đã đăng');
      expect(html).not.toMatch(new RegExp(`>\\s*${status}\\s*<`));
    }
  });
});