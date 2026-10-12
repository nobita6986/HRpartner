/**
 * youtube-card.test.tsx — hrp-t1c-jobposting-media-youtube (RQ-02, RQ-03, RQ-04, DEC-04).
 *
 * Unit test cho client card YouTube. Môi trường test KHÔNG có @testing-library/react
 * nên render qua `renderToStaticMarkup` (react-dom/server) — chỉ assert static markup.
 * PATCH flow thực sự đã có coverage ở `__tests__/route.test.ts` (route handler) + integration
 * tests; tại đây chỉ verify render shape theo từng state + guard của card.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { JobPostingYouTubeCard } from '../youtube-card';
import { extractYouTubeVideoId } from '@/src/domains/media/youtube';

function render(props: {
  jobPostingId: string;
  initialVideoId: string | null;
  initialRevision: number;
  canMutate: boolean;
  isSaving: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}): string {
  return renderToStaticMarkup(
    createElement(JobPostingYouTubeCard, {
      ...props,
      onPatched: () => undefined,
    }),
  );
}

describe('JobPostingYouTubeCard', () => {
  it('renders the input + "Chưa có video" status when initial videoId is null', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: null,
      initialRevision: 1,
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-testid="youtube-card"');
    expect(html).toContain('data-testid="youtube-card-input"');
    expect(html).toContain('data-testid="youtube-card-status"');
    expect(html).toContain('Chưa có video');
    // Empty input → preview-status points to clear semantics
    expect(html).toContain('Bỏ trống');
  });

  it('shows "Đã gắn video" when initial videoId is a valid 11-char id; save button enabled (dirty — input differs from server snapshot)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: 'dQw4w9WgXcQ',
      initialRevision: 1,
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('Đã gắn video');
    // Save button is enabled (input is "" which differs from server snapshot
    // 'dQw4w9WgXcQ' — user could save to clear the video). The visible `disabled`
    // attribute (if any) must NOT be present on the save button tag.
    const saveIdx = html.indexOf('data-testid="youtube-card-save"');
    expect(saveIdx).toBeGreaterThanOrEqual(0);
    const tagEnd = html.indexOf('>', saveIdx);
    const tag = html.slice(saveIdx, tagEnd);
    // `disabled=""` is the form React renders for boolean disabled; absence = enabled.
    expect(tag.toLowerCase()).not.toMatch(/disabled/);
  });

  it('rejects ARCHIVED status (disabled, reason shown)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: null,
      initialRevision: 1,
      canMutate: true,
      isSaving: false,
      status: 'ARCHIVED',
    });
    expect(html).toContain('data-testid="youtube-card-disabled-reason"');
    expect(html).toContain('đã được lưu trữ');
  });

  it('rejects PUBLISHED status (must unpublish first)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: 'dQw4w9WgXcQ',
      initialRevision: 1,
      canMutate: true,
      isSaving: false,
      status: 'PUBLISHED',
    });
    expect(html).toContain('gỡ tin trước');
  });

  it('rejects canMutate=false (role-gated)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: null,
      initialRevision: 1,
      canMutate: false,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('không có quyền');
  });

  it('shows "Đang lưu…" label on save button when isSaving=true', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: null,
      initialRevision: 1,
      canMutate: true,
      isSaving: true,
      status: 'DRAFT',
    });
    expect(html).toContain('Đang lưu');
  });

  it('input has type=url + maxLength=2048 (no iframe/HTML injection surface)', () => {
    const html = render({
      jobPostingId: 'jp-1',
      initialVideoId: null,
      initialRevision: 1,
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toMatch(/type="url"/);
    // React lowercases `maxLength` → `maxlength`.
    expect(html.toLowerCase()).toMatch(/maxlength="2048"/);
  });

  it('exposes data-job-posting-id for downstream static tests', () => {
    const html = render({
      jobPostingId: 'jp-static-1',
      initialVideoId: null,
      initialRevision: 1,
      canMutate: true,
      isSaving: false,
      status: 'DRAFT',
    });
    expect(html).toContain('data-job-posting-id="jp-static-1"');
  });
});

/**
 * Pure validation tests — không render React, chỉ verify helper `extractYouTubeVideoId`
 * trả giá trị card sẽ dùng để quyết định "preview hợp lệ / không".
 * Phòng trường hợp UI bị re-shape, contract vẫn đứng vững ở helper.
 */
describe('YouTube preview validation (via extractYouTubeVideoId)', () => {
  it('accepts standard youtube.com watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });
  it('accepts short youtu.be URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('accepts raw 11-char ID', () => {
    expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects empty / whitespace', () => {
    expect(extractYouTubeVideoId('   ')).toBeNull();
    expect(extractYouTubeVideoId('')).toBeNull();
  });
  it('rejects non-YouTube host', () => {
    expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
  it('rejects javascript: scheme', () => {
    expect(extractYouTubeVideoId('javascript:alert(1)')).toBeNull();
  });
});
