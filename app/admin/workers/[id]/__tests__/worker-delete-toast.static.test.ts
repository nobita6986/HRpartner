/**
 * worker-delete-toast.static.test.ts — T1C admin-ux-hotfix 2 — DEC-01.
 *
 * Lock:
 *   - Sau khi DELETE /api/workers/[id] thành công, hiển thị banner xác nhận
 *     với role="status" và testid worker-delete-success-toast.
 *   - Sau ~2.5s, redirect về /admin/workers (router.push).
 *   - Banner phải show userId (không suy diễn).
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

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('WorkerDeleteButton — T1C admin-ux-hotfix 2 — success confirmation', () => {
  it('declares a success state holding userId + fullName', () => {
    expect(CODE).toMatch(/const \[success, setSuccess\] = useState/);
    expect(CODE).toMatch(/setSuccess\([\s\S]*userId:\s*workerId/);
  });

  it('renders the success toast banner with role="status" and testid', () => {
    expect(CODE).toContain('data-testid="worker-delete-success-toast"');
    expect(CODE).toContain('role="status"');
  });

  it('schedules a 2500ms redirect to /admin/workers when success appears', () => {
    expect(CODE).toMatch(/2500/);
    expect(CODE).toMatch(/router\.push\(['"]\/admin\/workers['"]\)/);
  });
});

describe('WorkerDeleteButton — T1C admin-ux-hotfix 2 — encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});