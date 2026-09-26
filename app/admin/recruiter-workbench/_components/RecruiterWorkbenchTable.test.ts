/**
 * RecruiterWorkbenchTable.test.ts — Unit tests for the presentational
 * table renderer (read-only, server-derived rows).
 *
 * Frozen contracts (TASK.md RQ-09, RQ-14, RQ-15, RQ-17, RQ-18):
 *   - One row per `RecruiterWorkbenchRow`, keyed by `caseId`.
 *   - Columns: candidate, case status, job, last interaction,
 *     NextActionBadge, HandlerChip, AgeCell, PrimaryActions.
 *   - When items=[] or forceEmpty, render EmptyState (NOT 403).
 *   - Empty state and Forbidden state are distinct (table never collapses
 *     a 403 into empty).
 *   - Raw and masked PII both render verbatim (no client masking).
 *   - No mutation API is touched.
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// We use React.createElement directly because the unit-lane config does NOT
// match .test.tsx under app/**.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

import { RecruiterWorkbenchTable } from './RecruiterWorkbenchTable';
import type { RecruiterWorkbenchRow } from '@/src/domains/talent/recruiter-workbench.types';

function buildRow(
  partial: Partial<RecruiterWorkbenchRow> & {
    candidate?: RecruiterWorkbenchRow['candidate'];
    handler?: RecruiterWorkbenchRow['handler'];
  } = {},
): RecruiterWorkbenchRow {
  const candidate = {
    laborProfileId: 'lp-1',
    fullName: 'Nguyen Van A',
    phone: '0901234567',
    cccdNumber: '012345678901',
    identityVerification: 'VERIFIED',
    completeness: 'FULL',
    ...(partial.candidate ?? {}),
  };
  const handler = {
    assigneeUserId: 'u-1',
    assigneeName: 'Trần Văn B',
    source: 'assignment-1',
    ...(partial.handler ?? {}),
  };
  return {
    caseId: 'case-1',
    caseStatus: 'IN_PROGRESS',
    openedAt: '2026-09-20T00:00:00.000Z',
    closedAt: null,
    candidate,
    job: {
      jobPostingId: 'jp-1',
      jobPostingTitle: 'Thợ hàn',
      projectName: 'Dự án X',
      companyName: 'Công ty Y',
    },
    lastInteraction: { at: '2026-09-24T00:00:00.000Z', kind: 'SUBMISSION' },
    nextAction: 'SCREEN_SUBMISSION',
    handler,
    ageHours: 24,
    isOverdue: false,
    overdueReason: null,
    primaryActions: {
      detailHref: '/admin/labor-profiles/lp-1',
      submissionHref: '/admin/applications',
    },
    ...partial,
  } as unknown as RecruiterWorkbenchRow;
}

describe('RecruiterWorkbenchTable', () => {
  it('renders the empty state when items is an empty array', () => {
    const html = renderToStaticMarkup(React.createElement(RecruiterWorkbenchTable, { items: [] }));
    expect(html).toContain('data-testid="table-empty"');
    expect(html).not.toContain('data-testid="recruiter-workbench-table"');
  });

  it('renders the empty state when forceEmpty is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, { items: [buildRow()], forceEmpty: true }),
    );
    expect(html).toContain('data-testid="table-empty"');
  });

  it('renders the table with <table> structure when rows are present', () => {
    const html = renderToStaticMarkup(React.createElement(RecruiterWorkbenchTable, { items: [buildRow()] }));
    expect(html).toContain('data-testid="recruiter-workbench-table"');
    expect(html).toMatch(/<table/);
    expect(html).toMatch(/<thead/);
    expect(html).toMatch(/<tbody/);
  });

  it('renders one row per item, keyed by caseId', () => {
    const rows: RecruiterWorkbenchRow[] = [
      buildRow({ caseId: 'case-A' }),
      buildRow({
        caseId: 'case-B',
        primaryActions: { detailHref: '/admin/labor-profiles/lp-2', submissionHref: null },
      }),
      buildRow({ caseId: 'case-C' }),
    ];
    const html = renderToStaticMarkup(React.createElement(RecruiterWorkbenchTable, { items: rows }));
    const trMatches = html.match(/data-testid="workbench-row"/g) ?? [];
    expect(trMatches.length).toBe(3);
    expect(html).toContain('data-row-key="case-A"');
    expect(html).toContain('data-row-key="case-B"');
    expect(html).toContain('data-row-key="case-C"');
    expect(html).toContain('data-case-id="case-A"');
    expect(html).toContain('data-case-id="case-B"');
    expect(html).toContain('data-case-id="case-C"');
  });

  it('renders raw PII verbatim (no client masking)', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({
            candidate: {
              laborProfileId: 'lp-1',
              fullName: 'Test Raw',
              phone: '0987654321',
              cccdNumber: '112233445566',
              identityVerification: 'VERIFIED',
              completeness: 'FULL',
            },
          }),
          buildRow({
            candidate: {
              laborProfileId: 'lp-2',
              fullName: 'Test Masked',
              phone: '098*******',
              cccdNumber: '112*******566',
              identityVerification: 'PENDING',
              completeness: 'BASIC',
            },
          }),
        ],
      }),
    );
    expect(html).toContain('0987654321');
    expect(html).toContain('112233445566');
    expect(html).toContain('098*******');
    expect(html).toContain('112*******566');
    expect(html).not.toContain('XXX');
  });

  it('renders NextActionBadge with the server-derived nextAction value', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({ caseId: 'c-1', nextAction: 'AWAITING_RESULT' }),
          buildRow({
            caseId: 'c-2',
            nextAction: 'NONE',
            primaryActions: { detailHref: '/admin/labor-profiles/lp-2', submissionHref: null },
          }),
        ],
      }),
    );
    expect(html).toContain('data-next-action="AWAITING_RESULT"');
    expect(html).toContain('data-next-action="NONE"');
  });

  it('renders HandlerChip with assignee name OR muted "Chưa phân công"', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({ caseId: 'c-1' }),
          buildRow({
            caseId: 'c-2',
            handler: {
              assigneeUserId: null,
              assigneeName: null,
              source: null,
            },
          }),
        ],
      }),
    );
    expect(html).toContain('Trần Văn B');
    expect(html).toContain('Chưa phân công');
  });

  it('renders AgeCell honoring the server-provided isOverdue flag', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({ caseId: 'c-1', ageHours: 24, isOverdue: false }),
          buildRow({
            caseId: 'c-2',
            ageHours: 99,
            isOverdue: true,
            overdueReason: 'CASE_AGE_THRESHOLD',
            primaryActions: { detailHref: '/admin/labor-profiles/lp-2', submissionHref: null },
          }),
        ],
      }),
    );
    expect(html).toContain('data-is-overdue="false"');
    expect(html).toContain('data-is-overdue="true"');
  });

  it('renders canonical detail href WITHOUT ?case= and submission link when present', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({
            caseId: 'c-1',
            candidate: {
              laborProfileId: 'lp-AB1',
              fullName: 'Test',
              phone: '0901234567',
              cccdNumber: '012345678901',
              identityVerification: 'VERIFIED',
              completeness: 'FULL',
            },
          }),
        ],
      }),
    );
    expect(html).toContain('href="/admin/labor-profiles/lp-AB1"');
    expect(html).toContain('href="/admin/applications"');
    expect(html).not.toMatch(/href="[^"]*\?case=/);
  });

  it('renders lastInteraction as "—" when both kind and at are null', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({
            lastInteraction: { at: null, kind: null },
          }),
        ],
      }),
    );
    expect(html).toContain('—');
  });

  it('renders STATUS_CHANGE last-interaction as "Đổi trạng thái"', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({
            lastInteraction: { at: '2026-09-24T00:00:00.000Z', kind: 'STATUS_CHANGE' },
          }),
        ],
      }),
    );
    expect(html).toContain('Đổi trạng thái');
  });

  it('does NOT include any mutation form/fetch', () => {
    const html = renderToStaticMarkup(React.createElement(RecruiterWorkbenchTable, { items: [buildRow()] }));
    expect(html).not.toMatch(/method="POST"/);
    expect(html).not.toMatch(/method="PATCH"/);
    expect(html).not.toMatch(/method="DELETE"/);
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('axios');
  });

  it('provides a sr-only caption for accessibility', () => {
    const html = renderToStaticMarkup(React.createElement(RecruiterWorkbenchTable, { items: [buildRow()] }));
    expect(html).toContain('sr-only');
    expect(html).toContain('Danh sách recruiter workbench');
  });

  it('distinguishes empty state from forbidden state', () => {
    const html = renderToStaticMarkup(React.createElement(RecruiterWorkbenchTable, { items: [] }));
    expect(html).toContain('data-testid="table-empty"');
    expect(html).not.toContain('data-testid="forbidden-panel"');
  });

  it('falls back to "Chưa cập nhật tên" when fullName is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(RecruiterWorkbenchTable, {
        items: [
          buildRow({
            candidate: {
              laborProfileId: 'lp-1',
              fullName: null,
              phone: '0901234567',
              cccdNumber: '012345678901',
              identityVerification: 'VERIFIED',
              completeness: 'FULL',
            },
          }),
        ],
      }),
    );
    expect(html).toContain('Chưa cập nhật tên');
  });
});
