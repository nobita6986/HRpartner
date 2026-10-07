/**
 * worker-list-columns.static.test.ts — merged T1B-OPS + T1C admin UX.
 *
 * Lock:
 *   - Bảng /admin/workers có đủ 6 cột vận hành theo T1B-OPS: dự án, ngày làm
 *     đầu tiên, quản lý, người phụ trách, người giới thiệu, người hưởng hoa hồng.
 *   - KHÔNG còn cột "Thao tác" và cell "Xem". Click hàng vẫn vào detail.
 *   - Subhead copy = "Quản lý thông tin và trạng thái người lao động.".
 *   - KHÔNG còn "Phân hệ M5" / "Phân hệ M*" trong operator-visible copy.
 *   - Nút "Lịch sử xóa" dẫn đến /admin/workers/delete-history.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/workers/page.tsx'), 'utf8');

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('/admin/workers — merged operational columns', () => {
  it('renders the six operational columns in the header row', () => {
    expect(CODE).toContain("'Dự án đang làm'");
    expect(CODE).toContain("'Ngày làm đầu tiên'");
    expect(CODE).toContain("'Quản lý dự án'");
    expect(CODE).toContain("'Người phụ trách'");
    expect(CODE).toContain("'Người giới thiệu'");
    expect(CODE).toContain("'Người hưởng hoa hồng'");
  });

  it('renders enrichment fields with placeholder when null', () => {
    expect(CODE).toMatch(/w\.currentProject/);
    expect(CODE).toMatch(/w\.firstWorkDate/);
    expect(CODE).toMatch(/w\.currentProjectManager/);
    expect(CODE).toMatch(/w\.handler/);
    expect(CODE).toMatch(/w\.referrer/);
    expect(CODE).toMatch(/w\.commissionBeneficiary/);
  });

  it('does NOT use Worker.createdAt as fallback for first job date', () => {
    // DEC-09: KHÔNG suy diễn "ngày làm đầu tiên" từ Worker.createdAt.
    expect(CODE).not.toMatch(/\.createdAt.*firstWorkDate|firstWorkDate.*createdAt/);
    expect(CODE).not.toMatch(/firstWorkDate.*new Date\(w\.createdAt/);
  });
});

describe('/admin/workers — T1C admin-ux-hotfix 2 — drop "Xem" cell', () => {
  it('does NOT contain the legacy "Xem" action cell or column header', () => {
    expect(CODE).not.toContain("'Thao tác'");
    expect(CODE).not.toMatch(/>\s*Xem\s*</);
    // Old <th>Thao tác</th> is gone.
    expect(CODE).not.toMatch(/<th[^>]*>\s*Thao tác\s*<\/th>/);
  });

  it('row click navigates to /admin/workers/[id]', () => {
    expect(CODE).toMatch(/window\.location\.href\s*=\s*`\/admin\/workers\/\$\{w\.id\}`/);
  });
});

describe('/admin/workers — T1C admin-ux-hotfix 2 — copy sweep', () => {
  it('uses the canonical subhead copy', () => {
    expect(CODE).toContain(
      'Quản lý thông tin và trạng thái người lao động.',
    );
  });

  it('does not contain legacy "Phân hệ" or M5 module code in operator copy', () => {
    expect(CODE).not.toMatch(/Phân hệ\s*M\d/);
    expect(CODE).not.toContain('Phân hệ M5');
    expect(CODE).not.toMatch(/Phân hệ[^.]*M[0-9]/);
  });
});

describe('/admin/workers — T1C admin-ux-hotfix 2 — delete history entry point', () => {
  it('links to /admin/workers/delete-history', () => {
    expect(CODE).toContain('href="/admin/workers/delete-history"');
    expect(CODE).toContain('Lịch sử xóa');
  });
});

describe('/admin/workers — T1C admin-ux-hotfix 2 — encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
