/**
 * job-opening-status-card.test.ts — V6 Phase 1 STEP-04
 *
 * 2 component tests for JobOpeningStatusCard:
 * 1. Render 4 badge với số đếm đúng.
 * 2. Loading state: 4 shimmer.
 *
 * Uses react-dom/server renderToStaticMarkup (same pattern as placement-panel.test.ts).
 * Props `data` and `testLoading` bypass useEffect so SSR renders deterministically.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JobOpeningStatusCard, {
  type JobOpeningStatusCardProps,
} from '../../../app/admin/jobs/job-opening-status-card';

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('JobOpeningStatusCard', () => {
  it('render 4 badge với số đếm đúng', () => {
    const data: JobOpeningStatusCardProps['data'] = {
      byStatus: { DRAFT: 3, OPEN: 12, FILLED: 5, CANCELLED: 1 },
      total: 21,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = render(createElement(JobOpeningStatusCard, { data } as any));

    // All 4 labels present
    expect(html).toContain('Nháp');
    expect(html).toContain('Mở tuyển');
    expect(html).toContain('Đã tuyển');
    expect(html).toContain('Đã hủy');

    // Counts correct
    expect(html).toContain('>3<');
    expect(html).toContain('>12<');
    expect(html).toContain('>5<');
    expect(html).toContain('>1<');
  });

  it('loading state: 4 shimmer badge', () => {
    // testLoading=true → renders shimmer without triggering useEffect fetch
    const props: JobOpeningStatusCardProps = { testLoading: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = render(createElement(JobOpeningStatusCard, props as any));

    // 4 animate-pulse placeholders should be present
    const matches = html.match(/animate-pulse/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });
});
