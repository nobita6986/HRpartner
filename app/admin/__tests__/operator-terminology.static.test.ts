import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  applicationHistoryReasonLabel,
  conflictLabel,
} from '@/src/domains/applications/placement-ui';
import { JOB_POSTING_ERROR_LABELS } from '@/src/domains/staffing/job-posting-error-map';

const UI_FILES = [
  'app/admin/applications/page.tsx',
  'app/admin/job-openings/[id]/job-opening-actions.tsx',
  'app/admin/job-openings/[id]/page.tsx',
  'app/admin/jobs/job-postings/[id]/editor-shell.tsx',
  'app/admin/jobs/job-postings/[id]/page.tsx',
  'app/admin/jobs/job-postings/create-job-posting-form.tsx',
  'app/admin/jobs/job-postings/page.tsx',
  'app/admin/jobs/page.tsx',
  'app/admin/recruiter-workbench/_components/ForbiddenPanel.tsx',
  'app/admin/recruiter-workbench/_components/InvalidQueryPanel.tsx',
  'app/admin/settings/admin-settings-form.tsx',
  'app/admin/staffing/staffing-list-client.tsx',
  'src/domains/applications/placement-panel.tsx',
] as const;

const TECHNICAL_COPY = /\b(?:JobPosting|JobOpening|StaffingOrderSlot|Applicant|Worker|PUBLIC_APPLY|CREATE_ROLES|TipTap|Tiptap|RPC|schema|serviceModel)\b/i;

function readVisibleCopy(path: string): string[] {
  const source = readFileSync(join(process.cwd(), path), 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visibleCopy: string[] = [];
  const visibleAttributes = new Set(['aria-label', 'placeholder', 'title', 'label', 'description', 'emptyState', 'helperText']);

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node) && node.text.trim()) visibleCopy.push(node.text.trim());
    if (
      ts.isJsxAttribute(node) &&
      visibleAttributes.has(node.name.getText(file)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      visibleCopy.push(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return visibleCopy;
}

describe('Admin operator terminology', () => {
  it.each(UI_FILES)('keeps technical identifiers out of visible copy in %s', (path) => {
    expect(readVisibleCopy(path).join(' ')).not.toMatch(TECHNICAL_COPY);
  });

  it('localizes public-application history and hides unknown reason codes', () => {
    expect(applicationHistoryReasonLabel('PUBLIC_APPLY')).toBe('Ứng tuyển qua trang công khai');
    expect(applicationHistoryReasonLabel('NEW_INTERNAL_REASON')).toBe('Cập nhật trạng thái');
    expect(applicationHistoryReasonLabel('Ghi chú từ quản trị viên')).toBe('Ghi chú từ quản trị viên');
  });

  it('keeps mapped operator-facing errors free of raw implementation terms', () => {
    const labels = [
      ...Object.values(JOB_POSTING_ERROR_LABELS),
      conflictLabel('REFERRAL_GUARD_BLOCKED'),
    ];
    for (const label of labels) expect(label).not.toMatch(TECHNICAL_COPY);
  });
});
