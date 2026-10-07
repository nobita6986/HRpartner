/**
 * workers-list-cta.test.tsx — T1B-OPS list CTA fence.
 *
 * T1B invariant: CTA trên /admin/workers KHÔNG được POST trực tiếp Worker rời
 * rạc. Worker chỉ tồn tại qua conversion flow (LaborProfile.workerId). CTA
 * phải là <Link> sang /admin/labor-profiles/new với wording rõ ràng.
 *
 * T1B-OPS (DEC-T1B-OPS-04 / 09): bảng có 6 cột vận hành mới
 * (currentProject, firstWorkDate, currentProjectManager, handler, referrer,
 * commissionBeneficiary). KHÔNG có 'Mã' / 'Điện thoại' / 'Ngày tạo' / 'Thao tác'
 * ở bảng này — chuyển sang detail page.
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
    expect(CODE).toContain('Tiếp nhận người lao động');
    expect(CODE).not.toContain('Thêm người lao động mới');
  });

  it('CTA is a <Link> to /admin/labor-profiles/new, not a button opening modal', () => {
    expect(CODE).toMatch(/<Link[\s\S]*?href="\/admin\/labor-profiles\/new"[\s\S]*?>/);
    expect(CODE).not.toMatch(/setShowCreate/);
    expect(CODE).not.toMatch(/<Modal/);
  });

  it('does not POST /api/workers from the list surface (anywhere)', () => {
    expect(CODE).not.toMatch(/fetch\(\s*['"`]\/api\/workers['"`]/);
    expect(CODE).not.toMatch(/method:\s*['"]POST['"]/);
  });

  it('row click navigates to /admin/workers/[id] (detail surface)', () => {
    expect(CODE).toMatch(/window\.location\.href\s*=\s*`\/admin\/workers\/\$\{w\.id\}`/);
  });

  it('table has 6 operational column headers (T1B-OPS DEC-T1B-OPS-04)', () => {
    // DEC-T1B-OPS-04: 6 cột vận hành dùng canonical relational data.
    const headers = [
      'Họ tên',
      'Trạng thái',
      'Dự án đang làm',
      'Ngày làm đầu tiên',
      'Quản lý dự án',
      'Người phụ trách',
      'Người giới thiệu',
      'Người hưởng hoa hồng',
    ];
    for (const h of headers) {
      expect(CODE).toContain(`'${h}'`);
    }
  });

  it('table has NO PII column (CCCD/Phone/BankAccount) on the list', () => {
    // T1B-OPS: PII chỉ ở detail page.
    expect(CODE).not.toMatch(/cccdNumber/);
    expect(CODE).not.toMatch(/bankAccount/);
    expect(CODE).not.toMatch(/insuranceCode/);
  });

  it('does not have "Xem" / "Thao tác" / "Mã" / "Ngày tạo" legacy columns (T1B-OPS)', () => {
    // DEC-T1B-OPS-04: row click mở detail; bỏ cột Thao tác / Xem riêng.
    expect(CODE).not.toMatch(/'Thao tác'/);
    expect(CODE).not.toMatch(/'Mã'/);
    expect(CODE).not.toMatch(/'Ngày tạo'/);
    expect(CODE).not.toMatch(/>Xem</);
  });

  it('uses shared StatusBadge primitive + Vietnamese status labels', () => {
    expect(CODE).toContain('<StatusBadge');
    expect(CODE).toContain('workerStatusLabel(');
  });

  it('empty state explains LaborProfile vs Worker separation', () => {
    expect(CODE).toMatch(/Hồ sơ tiếp nhận/);
    expect(CODE).toMatch(/href="\/admin\/labor-profiles"/);
  });
});