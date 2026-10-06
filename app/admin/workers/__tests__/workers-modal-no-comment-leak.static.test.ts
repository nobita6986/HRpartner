/**
 * workers-modal-no-comment-leak.static.test.ts — T1B Pre-P2 hotfix (DEC-P2-13).
 *
 * Anti-regression fence cho bug mà modal `<h2>` ở `/admin/workers/page.tsx`
 * từng render raw text của comment `// T0 T1B …` (vì các dòng comment
 * nằm GIỮA `<h2>` open tag và `{isEdit ? …}` text node). Comment được
 * hiểu như text content bên trong `<h2>` → leak ra DOM.
 *
 * Sau fix: comment được di chuyển ra TRƯỚC `<h2>` (dưới dạng JSX comment
 * block `{/* ... *\/}` ở ngoài `<h2>`). DOM `<h2>` chỉ chứa text tiêu đề.
 *
 * Fence này kiểm tra rằng raw `// T0 T1B` KHÔNG nằm giữa cặp `<h2` đầu
 * tiên và `</h2>` tương ứng trong file.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WORKERS_PATH = join(process.cwd(), 'app/admin/workers/page.tsx');
const SOURCE = readFileSync(WORKERS_PATH, 'utf8');

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('/admin/workers/page.tsx — T1B Pre-P2 modal no-comment-leak (DEC-P2-13)', () => {
  it('does NOT contain `// T0 T1B` raw text inside the first JSX <h2>...</h2> pair', () => {
    // Strip comments first so the JSX comment block I added (which contains
    // the literal text "<h2>...</h2>" as documentation) does not get matched
    // as the real <h2> element. After stripping, the first <h2>...</h2>
    // match is the actual JSX element.
    const m = CODE.match(/<h2[\s\S]*?<\/h2>/);
    expect(m, 'modal <h2> block not found').toBeTruthy();
    if (m) {
      const block = m[0];
      expect(block).not.toMatch(/\/\/\s*T0\s*T1B/);
      expect(block).not.toMatch(/T0\s*T1B\s*—/);
    }
  });

  it('first JSX <h2> contains only the canonical modal title text', () => {
    const m = CODE.match(/<h2[\s\S]*?<\/h2>/);
    expect(m, 'modal <h2> block not found').toBeTruthy();
    if (m) {
      const block = m[0];
      // Must contain either the add or edit title. Nothing else.
      const hasAddTitle = /Thêm người lao động mới/.test(block);
      const hasEditTitle = /Sửa người lao động/.test(block);
      expect(hasAddTitle || hasEditTitle).toBe(true);
      // Must NOT contain the legacy "Nhân viên" wording.
      expect(block).not.toMatch(/Nhân viên/);
    }
  });

  it('does not include the raw T0 T1B comment anywhere INSIDE the first <h2> JSX body', () => {
    // Use CODE (post-comment-strip) to skip the explanatory comment block
    // that legitimately contains the literal text "<h2>...</h2>".
    const h2Open = CODE.indexOf('<h2');
    expect(h2Open, '<h2 not found').toBeGreaterThanOrEqual(0);
    const h2Close = CODE.indexOf('</h2>', h2Open);
    expect(h2Close, '</h2> not found after <h2>').toBeGreaterThan(h2Open);
    const inner = CODE.slice(h2Open, h2Close);
    expect(inner).not.toMatch(/\/\/\s*T0\s*T1B/);
    expect(inner).not.toMatch(/T0\s*T1B\s*—\s*HOTFIX/);
  });

  it('still uses the canonical modal title "Thêm người lao động mới" / "Sửa người lao động"', () => {
    expect(CODE).toContain('Thêm người lao động mới');
    expect(CODE).toContain('Sửa người lao động');
  });
});

describe('/admin/workers/page.tsx — T1B Pre-P2 encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
