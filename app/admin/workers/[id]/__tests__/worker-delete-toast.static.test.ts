/**
 * worker-delete-toast.static.test.ts — merged T1B-OPS delete confirmation.
 *
 * Lock:
 *   - DELETE success redirects with worker id/name; list page shows success
 *     status, audit-log deep link, and separate delete-history entry point.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(
    process.cwd(),
    'app/admin/workers/[id]/worker-delete-button.tsx',
  ),
  'utf8',
);
const LIST_SOURCE = readFileSync(join(process.cwd(), 'app/admin/workers/page.tsx'), 'utf8');

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('WorkerDeleteButton — merged T1B-OPS success confirmation', () => {
  it('redirects with deleted worker id and URL-encoded name after API success', () => {
    expect(CODE).toContain('new URLSearchParams({ deleted: workerId })');
    expect(CODE).toContain("params.set('name', workerName)");
    expect(CODE).toContain('window.location.href = `/admin/workers?${params.toString()}`');
  });

  it('list page confirms deletion and links directly to the audit record', () => {
    expect(LIST_SOURCE).toContain('role="status"');
    expect(LIST_SOURCE).toContain('Đã xóa người lao động');
    expect(LIST_SOURCE).toContain('/admin/audit-logs?entityType=Worker&entityId=');
    expect(LIST_SOURCE).toContain('WORKER_PERMANENT_DELETE');
  });

  it('keeps the dedicated delete-history page reachable from the workers list', () => {
    expect(LIST_SOURCE).toContain('href="/admin/workers/delete-history"');
    expect(LIST_SOURCE).toContain('Lịch sử xóa');
  });
});

describe('WorkerDeleteButton — T1C admin-ux-hotfix 2 — encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
