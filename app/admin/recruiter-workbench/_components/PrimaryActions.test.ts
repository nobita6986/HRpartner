/**
 * PrimaryActions.test.ts — Unit tests for the E1 primary action links.
 *
 * Frozen contracts (TASK.md AC-13, RQ-13, RQ-18):
 *   - detailHref = /admin/labor-profiles/<laborProfileId> — NO `?case=<caseId>`.
 *   - submissionHref = /admin/applications (when provided) — NO `?case=`.
 *   - caseId is exposed via data attribute but MUST NOT be appended to a URL.
 *   - Component does NOT call mutation APIs (POST/PATCH/DELETE).
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// We use React.createElement directly because the unit-lane config does NOT
// match .test.tsx under app/**.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

import { PrimaryActions } from './PrimaryActions';

describe('PrimaryActions', () => {
  it('renders detail link with /admin/labor-profiles/<id> and NO query string', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-123',
        fullName: 'Nguyen Van A',
        caseId: 'case-1',
        submissionHref: null,
      }),
    );
    expect(html).toContain('href="/admin/labor-profiles/lp-123"');
    expect(html).not.toContain('?case=');
    expect(html).not.toContain('?case=case-1');
  });

  it('encodes laborProfileId in the detail href', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp with space',
        fullName: 'Test',
        caseId: 'case-1',
        submissionHref: null,
      }),
    );
    expect(html).toContain('href="/admin/labor-profiles/lp%20with%20space"');
  });

  it('renders submission link to /admin/applications with NO query string', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-1',
        fullName: 'Test',
        caseId: 'case-1',
        submissionHref: '/admin/applications',
      }),
    );
    expect(html).toContain('href="/admin/applications"');
    expect(html).not.toContain('?case=');
  });

  it('omits submission link when submissionHref is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-1',
        fullName: 'Test',
        caseId: 'case-1',
        submissionHref: null,
      }),
    );
    expect(html).not.toContain('submission-link');
    expect(html).not.toContain('/admin/applications');
  });

  it('exposes caseId as data attribute but NEVER in any href', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-9',
        fullName: 'Test',
        caseId: 'case-XYZ',
        submissionHref: '/admin/applications',
      }),
    );
    expect(html).toContain('data-case-id="case-XYZ"');
    expect(html).not.toMatch(/href="[^"]*case-XYZ/);
    expect(html).not.toContain('case=case-XYZ');
  });

  it('does NOT include POST/PATCH/DELETE forms or fetch calls', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-1',
        fullName: 'Test',
        caseId: 'case-1',
        submissionHref: '/admin/applications',
      }),
    );
    expect(html).not.toMatch(/<form[^>]*method="POST"/);
    expect(html).not.toMatch(/method="PATCH"/);
    expect(html).not.toMatch(/method="DELETE"/);
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('axios');
  });

  it('renders an aria-label that names the candidate', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-1',
        fullName: 'Nguyễn Văn B',
        caseId: 'case-1',
        submissionHref: null,
      }),
    );
    expect(html).toContain('aria-label="Mở chi tiết hồ sơ Nguyễn Văn B"');
  });

  it('falls back to "hồ sơ" when fullName is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActions, {
        laborProfileId: 'lp-1',
        fullName: null,
        caseId: 'case-1',
        submissionHref: null,
      }),
    );
    expect(html).toContain('aria-label="Mở chi tiết hồ sơ hồ sơ"');
  });
});
