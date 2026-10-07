/**
 * labor-profile-list-columns.static.test.ts — T1C admin-ux-hotfix 2 — DEC-05/06.
 *
 * Lock:
 *   - /admin/labor-profiles giữ invariant 5 cột, với Job gần nhất kèm số đơn,
 *     Người phụ trách, Trạng thái (xác minh/hoàn thiện/nguồn), Ngày tiếp nhận.
 *   - KHÔNG thêm CCCD vào bảng.
 *   - KHÔNG render nhiều hàng cho một hồ sơ (không map render lặp).
 *   - Bảo toàn mask PII (sensitive fields not rendered).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(process.cwd(), 'app/admin/labor-profiles/page.tsx'),
  'utf8',
);

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(SOURCE);

describe('/admin/labor-profiles — merged 5-column operational layout', () => {
  it('keeps job and application count together with handler, status and intake date', () => {
    expect(CODE).toContain('Job gần nhất');
    expect(CODE).toContain('applicationCount');
    expect(CODE).toContain('Người phụ trách');
    expect(CODE).toContain('Trạng thái');
    expect(CODE).toContain('Ngày tiếp nhận');
    expect(CODE).toContain('Nguồn tiếp nhận');
  });

  it('binds the canonical merged read-model fields', () => {
    expect(CODE).toContain('profile.latestJob');
    expect(CODE).toContain('profile.applicationCount');
    expect(CODE).toContain('profile.handler');
    expect(CODE).toContain('profile.intakeSource');
    expect(CODE).toContain('profile.intakeDate');
  });
});

describe('/admin/labor-profiles — T1C admin-ux-hotfix 2 — invariants', () => {
  it('does NOT render CCCD (idNumber) as a column', () => {
    // Throws only inside <th>...</th>; guard by not seeing idNumber in a column header.
    expect(CODE).not.toMatch(/<th[^>]*>[\s\S]*?(CCCD|idNumber|Số CCCD)[\s\S]*?<\/th>/i);
    // Ensure no idNumber render in row cells either.
    expect(CODE).not.toMatch(/profile\.idNumber/);
  });

  it('does not double-render rows for the same profile', () => {
    // .map renders exactly one <tr key={profile.id}> per profile.
    const trCount = (src: string): number =>
      (src.match(/<tr\s+key=\{profile\.id\}/g) ?? []).length;
    expect(trCount(CODE)).toBe(1);
  });
});

describe('/admin/labor-profiles — T1C admin-ux-hotfix 2 — copy sweep', () => {
  it('does not contain legacy "Phân hệ" or M7 module code in operator copy', () => {
    expect(CODE).not.toMatch(/Phân hệ\s*M\d/);
    expect(CODE).not.toContain('Phân hệ M7');
    expect(CODE).not.toMatch(/Phân hệ[^.]*M[0-9]/);
  });
});

describe('/admin/labor-profiles — T1C admin-ux-hotfix 2 — encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
