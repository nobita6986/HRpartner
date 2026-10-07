/**
 * app/admin/jobs/job-postings/[id]/__tests__/publish-gating.test.tsx
 *
 * hrp-t1a-postdeploy-runtime-correction-2 (round 2):
 *   Regression test cho Phase B — Publish button precondition gating.
 *
 *   - Test #1: JobPosting + linked JobOpening DRAFT → Publish disabled,
 *     lý do hiển thị, link đúng `/admin/job-openings/<id>`.
 *   - Test #2: JobPosting + linked JobOpening OPEN → Publish enabled.
 *   - Server contract `JOB_OPENING_NOT_OPEN` (409 fail-closed) vẫn giữ
 *     nguyên — test này chỉ verify client-side gate, không touch service.
 *
 *   Strategy:
 *     - Mock `next/navigation` (router.refresh) — không cần router cho assertion.
 *     - Render `JobPostingEditorShell` với `initial` shape giả lập.
 *     - Dùng `renderToStaticMarkup` (no DOM env). Đây là unit lane —
 *       KHÔNG test click handler runtime (đã có integration ở
 *       `tests/db/job-posting-authoring.integration.test.ts`).
 *
 *   Out of scope:
 *     - Test #3 (server 409) — viết ở
 *       `src/domains/staffing/job-posting-authoring.service.test.ts`.
 *     - Test #4-7 (JobOpening visibility) — extend
 *       `app/admin/job-openings/[id]/job-opening-actions.test.tsx`.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JSONContent } from '@tiptap/core';

// Stub next/navigation — only `useRouter` is used by the editor shell.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: () => undefined,
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    forward: () => undefined,
  }),
}));

// Stub the rich-text editor — these tests assert the publish-gating UX,
// not the Tiptap internals. The Tiptap editor is covered by
// `src/shared/ui/editor/JobPostingRichTextEditor.test.tsx` + the mount test.
vi.mock('@/src/shared/ui/editor/JobPostingRichTextEditor', () => ({
  JobPostingRichTextEditor: () => null,
}));

// Stub fetch — publish button is disabled in the cases under test, so no
// network call is expected. Any unexpected call would surface as a test
// failure.
globalThis.fetch = vi.fn() as unknown as typeof fetch;

import { JobPostingEditorShell } from '../editor-shell';
import type { JobPostingDetailDto } from '@/src/domains/staffing/job-posting-list.service';
import type { JobPostingLifecycleStatus } from '@/src/domains/staffing/job-posting-authoring.service';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

function makeInitial(
  status: JobPostingLifecycleStatus,
  opening: JobPostingDetailDto['opening'],
  overrides: Partial<JobPostingDetailDto> = {},
): JobPostingDetailDto {
  return {
    id: 'jp-1',
    jobOpeningId: opening?.id ?? 'jo-1',
    slug: 'test-posting',
    revision: 1,
    status,
    publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: 'Test title',
    salaryDisplay: null,
    descriptionJson: EMPTY_DOC,
    requirementsJson: EMPTY_DOC,
    benefitsJson: EMPTY_DOC,
    applicationInstructionsJson: EMPTY_DOC,
    contentSchemaVersion: 1,
    isHot: false,
    isUrgent: false,
    // hrp-ui-v1-job-card-stamps-brand (T1B): 2 flag mới default false.
    isHighReward: false,
    isExpiringSoon: false,
    // hrp-t1c-jobposting-media-youtube (RQ-02): add thêm 1 field mới — null OK cho DRAFT rows chưa set.
    youtubeVideoId: null,
    opening,
    ...overrides,
  };
}

describe('JobPostingEditorShell — Publish gating (hrp-t1a-postdeploy-runtime-correction-2)', () => {
  it('Test #1: JobPosting + linked JobOpening DRAFT → Publish disabled + reason + bridge link', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell
        initial={makeInitial('DRAFT', {
          id: '655909be-65ea-4a6d-bef4-7a63297e2bc6',
          status: 'DRAFT',
          openedAt: null,
          closedAt: null,
          staffingOrderId: 'so-1',
          staffingOrderCode: 'SO-1',
          staffingOrderSlotId: 'slot-1',
        })}
        initialMedia={[]}
        canMutate
      />,
    );

    // Publish button exists but disabled.
    expect(html).toContain('data-testid="publish-button"');
    expect(html).toMatch(/data-testid="publish-button"[\s\S]*?disabled/);

    // Blocked banner + reason + link to JobOpening detail page.
    expect(html).toContain('data-testid="publish-blocked-banner"');
    expect(html).toContain('data-testid="publish-blocked-reason"');
    // href rendered before data-testid in the <a> tag (JSX prop order).
    expect(html).toMatch(
      /href="\/admin\/job-openings\/655909be-65ea-4a6d-bef4-7a63297e2bc6"[\s\S]*?data-testid="publish-blocked-link"/,
    );
    // The link retains the canonical id while the displayed status is localized.
    expect(html).toContain('655909be');
    expect(html).toContain('Bản nháp');
  });

  it('Test #1b: JobPosting with NO linked JobOpening (orphan) → Publish disabled + reason', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell initial={makeInitial('DRAFT', null)} initialMedia={[]} canMutate />,
    );

    expect(html).toContain('data-testid="publish-button"');
    expect(html).toMatch(/data-testid="publish-button"[\s\S]*?disabled/);
    expect(html).toContain('data-testid="publish-blocked-reason"');
    expect(html).toContain('Tin tuyển dụng chưa được gắn với đợt tuyển dụng nào.');
    // No bridge link when there's no opening to bridge to.
    expect(html).not.toContain('data-testid="publish-blocked-link"');
  });

  it('Test #2: JobPosting + linked JobOpening OPEN → Publish enabled, no blocked banner', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell
        initial={makeInitial('DRAFT', {
          id: '655909be-65ea-4a6d-bef4-7a63297e2bc6',
          status: 'OPEN',
          openedAt: new Date().toISOString(),
          closedAt: null,
          staffingOrderId: 'so-1',
          staffingOrderCode: 'SO-1',
          staffingOrderSlotId: 'slot-1',
        })}
        initialMedia={[]}
        canMutate
      />,
    );

    // Publish button is present and NOT disabled.
    const publishMatch = html.match(/<button[^>]*data-testid="publish-button"[^>]*>/);
    expect(publishMatch).not.toBeNull();
    // Find the opening tag for the publish button (it spans until the next '>'),
    // then assert the `disabled` attribute is NOT present in that tag.
    const buttonTagStart = html.indexOf('data-testid="publish-button"');
    expect(buttonTagStart).toBeGreaterThanOrEqual(0);
    const tagEnd = html.indexOf('>', buttonTagStart);
    expect(tagEnd).toBeGreaterThan(buttonTagStart);
    const buttonTag = html.slice(buttonTagStart, tagEnd);
    expect(buttonTag).not.toMatch(/disabled/);

    // No publish-blocked banner when canPublish === true.
    expect(html).not.toContain('data-testid="publish-blocked-banner"');
    expect(html).not.toContain('data-testid="publish-blocked-link"');
  });

  it('Test #2b: JobPosting + linked JobOpening FILLED → Publish disabled (terminal)', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell
        initial={makeInitial('DRAFT', {
          id: 'jo-2',
          status: 'FILLED',
          openedAt: null,
          closedAt: null,
          staffingOrderId: 'so-2',
          staffingOrderCode: 'SO-2',
          staffingOrderSlotId: 'slot-2',
        })}
        initialMedia={[]}
        canMutate
      />,
    );

    expect(html).toMatch(/data-testid="publish-button"[\s\S]*?disabled/);
    expect(html).toContain('Đã đủ chỉ tiêu');
  });

  it('Test #2c: JobPosting + linked JobOpening CANCELLED → Publish disabled (terminal)', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell
        initial={makeInitial('DRAFT', {
          id: 'jo-3',
          status: 'CANCELLED',
          openedAt: null,
          closedAt: null,
          staffingOrderId: 'so-3',
          staffingOrderCode: 'SO-3',
          staffingOrderSlotId: 'slot-3',
        })}
        initialMedia={[]}
        canMutate
      />,
    );

    expect(html).toMatch(/data-testid="publish-button"[\s\S]*?disabled/);
    expect(html).toContain('Đã hủy');
  });

  it('Test #1d: empty title → blocks publish, bridge link still rendered when opening exists', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell
        initial={makeInitial(
          'DRAFT',
          {
            id: 'jo-4',
            status: 'DRAFT',
            openedAt: null,
            closedAt: null,
            staffingOrderId: 'so-4',
            staffingOrderCode: 'SO-4',
            staffingOrderSlotId: 'slot-4',
          },
          { title: '' },
        )}
        initialMedia={[]}
        canMutate
      />,
    );

    expect(html).toContain('data-testid="publish-blocked-reason"');
    expect(html).toContain('Tiêu đề tin tuyển dụng');
    // Bridge link shown (opening exists) so admin still has a clear path.
    expect(html).toContain('data-testid="publish-blocked-link"');
  });

  it('Test #1e: canMutate=false → Publish disabled with role-gated reason', () => {
    const html = renderToStaticMarkup(
      <JobPostingEditorShell
        initial={makeInitial('DRAFT', {
          id: 'jo-5',
          status: 'OPEN',
          openedAt: null,
          closedAt: null,
          staffingOrderId: 'so-5',
          staffingOrderCode: 'SO-5',
          staffingOrderSlotId: 'slot-5',
        })}
        initialMedia={[]}
        canMutate={false}
      />,
    );

    expect(html).toMatch(/data-testid="publish-button"[\s\S]*?disabled/);
    expect(html).toContain('data-testid="publish-blocked-reason"');
    expect(html).toContain('không có quyền');
  });
});