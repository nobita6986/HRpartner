/**
 * workers-list-cta.test.tsx — T1B list CTA fence.
 *
 * T1B invariant: CTA trên /admin/workers KHÔNG được POST trực tiếp Worker rời
 * rạc. Worker chỉ tồn tại qua conversion flow (LaborProfile.workerId). CTA
 * phải là <Link> sang /admin/labor-profiles/new với wording rõ ràng.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = readFileSync(join(process.cwd(), 'app/admin/workers/page.tsx'), 'utf8');

function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = stripComments(PAGE);

describe('/admin/workers — T1B list CTA + row navigation', () => {
  it('CTA wording is "Tiếp nhận người lao động" (not "Thêm người lao động mới")', () => {
    // T1B: wording phải rõ ràng là "tiếp nhận" (intake) thay vì "thêm"
    // để operator hiểu đây là luồng intake → conversion, không phải tạo
    // Worker rời rạc.
    expect(CODE).toContain('Tiếp nhận người lao động');
    expect(CODE).not.toContain('Thêm người lao động mới');
  });

  it('CTA is a <Link> to /admin/labor-profiles/new, not a button opening modal', () => {
    expect(CODE).toMatch(/<Link[\s\S]*?href="\/admin\/labor-profiles\/new"[\s\S]*?>/);
    // Không còn modal tạo Worker inline.
    expect(CODE).not.toMatch(/setShowCreate/);
    expect(CODE).not.toMatch(/<Modal/);
  });

  it('does not POST /api/workers from the list surface (anywhere)', () => {
    // T1B: UI list KHÔNG bao giờ POST Worker. Page chỉ GET /api/workers
    // để load danh sách.
    expect(CODE).not.toMatch(/fetch\(\s*['"`]\/api\/workers['"`]/);
    expect(CODE).not.toMatch(/method:\s*['"]POST['"]/);
    // Method chỉ xuất hiện trong PATCH/DELETE ở detail page (file khác), không phải list page.
  });

  it('row click navigates to /admin/workers/[id] (detail surface)', () => {
    expect(CODE).toMatch(/window\.location\.href\s*=\s*`\/admin\/workers\/\$\{w\.id\}`/);
  });

  it('table has scoped column headers: Mã, Họ tên, Điện thoại, Trạng thái, Ngày tạo, Thao tác', () => {
    const headers = ['Mã', 'Họ tên', 'Điện thoại', 'Trạng thái', 'Ngày tạo', 'Thao tác'];
    for (const h of headers) {
      expect(CODE).toContain(`'${h}'`);
    }
  });

  it('table has 6 columns (không nhồi dữ liệu nhạy cảm vào list)', () => {
    // T1B: list gọn; CCCD, ngân hàng, BHXH KHÔNG xuất hiện ở list.
    expect(CODE).not.toMatch(/cccdNumber/);
    expect(CODE).not.toMatch(/bankAccount/);
    expect(CODE).not.toMatch(/insuranceCode/);
  });

  it('uses shared StatusBadge primitive + Vietnamese status labels', () => {
    expect(CODE).toContain('<StatusBadge');
    expect(CODE).toContain('workerStatusLabel(');
  });

  it('empty state explains LaborProfile vs Worker separation', () => {
    // Empty state phải chỉ dẫn operator tới /admin/labor-profiles khi list trống.
    expect(CODE).toMatch(/Hồ sơ tiếp nhận/);
    expect(CODE).toMatch(/href="\/admin\/labor-profiles"/);
  });
});
