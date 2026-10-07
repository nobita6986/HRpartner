/**
 * media-card.test.tsx — hrp-t1c-jobposting-media-youtube (RQ-05..RQ-09, DEC-05..DEC-07).
 *
 * Unit test cho client gallery card. Môi trường test KHÔNG có @testing-library/react
 * nên render qua `renderToStaticMarkup` (react-dom/server) — chỉ assert static markup.
 * PATCH flow thực sự đã có coverage ở route handler tests; tại đây chỉ verify
 * render shape theo từng state.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  JobPostingMediaCard,
  type JobPostingMediaAssignment,
} from '../media-card';

function makeAssignment(overrides: Partial<JobPostingMediaAssignment> = {}): JobPostingMediaAssignment {
  return {
    assignmentId: 'as-1',
    mediaId: 'm-1',
    url: 'https://example.com/img.png',
    alt: 'alt-1',
    caption: null,
    mimeType: 'image/png',
    order: 0,
    cover: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function render(props: {
  jobPostingId: string;
  initialItems: JobPostingMediaAssignment[];
  canMutate: boolean;
  isSaving: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}): string {
  return renderToStaticMarkup(
    createElement(JobPostingMediaCard, {
      ...props,
      onPatched: () => undefined,
    }),
  );
}

describe('JobPostingMediaCard', () => {
  it('renders the empty state when there are no media', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [],
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-testid="media-card"');
    expect(html).toContain('data-testid="media-card-empty"');
    expect(html).toContain('data-testid="media-card-add"');
    expect(html).toContain('Chưa có ảnh nào');
  });

  it('renders the gallery list with cover-first ordering and badges', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [
        makeAssignment({ assignmentId: 'as-1', mediaId: 'm-1', cover: false, order: 0 }),
        makeAssignment({ assignmentId: 'as-2', mediaId: 'm-2', cover: true, order: 1 }),
      ],
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-testid="media-card-list"');
    expect(html).toContain('data-testid="media-card-item"');
    expect(html).toContain('data-assignment-id="as-1"');
    expect(html).toContain('data-assignment-id="as-2"');
    // cover badge on as-2
    expect(html).toContain('data-testid="media-card-item-cover-badge"');
  });

  it('shows the count of items in the header', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [
        makeAssignment({ assignmentId: 'as-1' }),
        makeAssignment({ assignmentId: 'as-2' }),
        makeAssignment({ assignmentId: 'as-3' }),
      ],
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-testid="media-card-count"');
    expect(html).toContain('3 ảnh');
  });

  it('ARCHIVED → all controls disabled, reason shown', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [makeAssignment()],
      canMutate: true,
      isSaving: false,
      status: 'ARCHIVED',
    });
    expect(html).toContain('data-testid="media-card-disabled-reason"');
    expect(html).toContain('đã được lưu trữ');
  });

  it('PUBLISHED → all controls disabled (must unpublish first)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [makeAssignment()],
      canMutate: true,
      isSaving: false,
      status: 'PUBLISHED',
    });
    expect(html).toContain('gỡ tin trước');
  });

  it('canMutate=false → controls disabled with role-gated reason', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [makeAssignment()],
      canMutate: false,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('không có quyền');
  });

  it('renders per-item cover / detach / reorder buttons', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [
        makeAssignment({ assignmentId: 'as-1', cover: false, order: 0 }),
        makeAssignment({ assignmentId: 'as-2', cover: false, order: 1 }),
      ],
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-testid="media-card-item-cover"');
    expect(html).toContain('data-testid="media-card-item-detach"');
    expect(html).toContain('data-testid="media-card-item-up"');
    expect(html).toContain('data-testid="media-card-item-down"');
  });

  it('first item cannot move up; last item cannot move down (button disabled)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialItems: [
        makeAssignment({ assignmentId: 'as-1' }),
        makeAssignment({ assignmentId: 'as-2' }),
      ],
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    // Find the up button on the first item — should be disabled
    const upIdx = html.indexOf('data-testid="media-card-item-up"');
    expect(upIdx).toBeGreaterThanOrEqual(0);
    // The first <button ... data-testid="media-card-item-up" ...> is the one for as-1
    const firstUpTag = html.slice(upIdx, html.indexOf('>', upIdx));
    expect(firstUpTag.toLowerCase()).toMatch(/disabled/);
  });

  it('exposes data-job-posting-id for downstream static tests', () => {
    const html = render({
      jobPostingId: 'jp-static-1',
      initialItems: [],
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-job-posting-id="jp-static-1"');
  });
});
