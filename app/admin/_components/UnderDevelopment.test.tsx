/**
 * UnderDevelopment.test.tsx — direct-fix tests for the placeholder used by
 * disabled commission routes.
 *
 * Scope: smoke render of the three required pieces (title, body, back link)
 * and the optional `feature` subtitle. Pure JSX, no router, no DOM harness
 * beyond @testing-library equivalents already used elsewhere in the repo.
 *
 * We render to a string via `react-dom/server.renderToStaticMarkup` instead
 * of pulling in a full DOM testing lib, to keep this as light as possible.
 */
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnderDevelopment } from './UnderDevelopment';

describe('UnderDevelopment placeholder', () => {
  it('renders the canonical title, body and back link by default', () => {
    const html = renderToStaticMarkup(<UnderDevelopment />);

    expect(html).toContain('Tính năng đang phát triển');
    expect(html).toContain(
      'Chức năng này chưa được mở trong giai đoạn vận hành Chợ việc làm hiện tại.',
    );
    // Default back link points at /admin (Tổng quan).
    expect(html).toContain('href="/admin"');
    expect(html).toContain('Quay lại Tổng quan');
    // No feature subtitle is rendered when omitted.
    expect(html).not.toContain('data-testid="under-development-feature"');
  });

  it('renders the optional feature subtitle when provided', () => {
    const html = renderToStaticMarkup(
      <UnderDevelopment feature="Chính sách hoa hồng" />,
    );
    expect(html).toContain('Chính sách hoa hồng');
    expect(html).toContain('data-testid="under-development-feature"');
  });

  it('honours a custom backHref', () => {
    const html = renderToStaticMarkup(
      <UnderDevelopment backHref="/admin/dashboard" />,
    );
    expect(html).toContain('href="/admin/dashboard"');
  });
});
