/**
 * workers-terminology.static.test.ts — T1B-OPS terminology fence.
 *
 * T1B-OPS (DEC-T1B-OPS-04): bảng Người lao động có 6 cột vận hành mới;
 * bỏ 'Mã' / 'Điện thoại' / 'Ngày tạo' / 'Thao tác' cũ. Copy tiếng Việt thuần.
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

describe('/admin/workers Wave 3 terminology', () => {
  it('uses the typed Worker dictionary and shared status presentation primitive', () => {
    expect(SOURCE).toContain("from '@/src/domains/workforce/worker-ui'");
    expect(SOURCE).toContain('workerStatusLabel(');
    expect(SOURCE).toContain('<StatusBadge');
    expect(SOURCE).not.toMatch(/const STATUS_CONFIG\s*:/);
    expect(SOURCE).not.toMatch(/\{cfg\.label\}/);
  });

  it('does not expose English table labels or raw status values', () => {
    // T1B-OPS DEC-T1B-OPS-04: header 'Mã' (legacy short userId) bỏ; fullName
    // đã là nhãn rõ ràng trong cột 'Họ tên'.
    expect(CODE).toContain("'Họ tên'");
    expect(CODE).toContain("'Trạng thái'");
    expect(CODE).not.toMatch(/>\s*User ID\s*</);
    expect(CODE).not.toMatch(/>\s*\{w\.employmentStatus\}\s*</);
  });
});

describe('/admin/workers — T0 T1B HOTFIX UI NGƯỜI LAO ĐỘNG terminology', () => {
  it('page <h1> is "Danh sách người lao động"', () => {
    expect(CODE).toMatch(/<h1[^>]*>\s*Danh sách người lao động\s*<\/h1>/);
  });

  it('does not contain legacy "Nhân viên" surface strings', () => {
    expect(CODE).not.toContain("'Nhân viên'");
    expect(CODE).not.toContain('"Nhân viên"');
    expect(CODE).not.toContain("'Thêm nhân viên'");
    expect(CODE).not.toContain('"Thêm nhân viên"');
    expect(CODE).not.toContain("'Sửa nhân viên'");
    expect(CODE).not.toContain('"Sửa nhân viên"');
    expect(CODE).not.toContain("'Chưa có nhân viên nào'");
    expect(CODE).not.toContain('"Chưa có nhân viên nào"');
    expect(CODE).not.toContain('Tổng: {total} nhân viên');
  });

  it('does not contain "Nhân sự" on the workers surface', () => {
    expect(CODE).not.toContain("'Nhân sự'");
    expect(CODE).not.toContain('"Nhân sự"');
  });

  it('does not contain "NLD" on the workers surface', () => {
    expect(CODE).not.toContain("'NLD'");
    expect(CODE).not.toContain('"NLD"');
  });

  it('uses canonical "Người lao động" throughout the workforce surface', () => {
    expect(CODE).toContain('người lao động');
    expect(CODE).toContain('Tiếp nhận người lao động');
    expect(CODE).toMatch(/Tổng:\s*\{total\}\s*người lao động/);
    expect(CODE).toContain('Danh sách người lao động');
  });

  it('does NOT POST /api/workers from the list surface (T1B invariant)', () => {
    expect(CODE).toContain("href=\"/admin/labor-profiles/new\"");
    expect(CODE).not.toMatch(/fetch\(\s*['"`]\/api\/workers['"`]/);
    expect(CODE).not.toMatch(/method:\s*['"]POST['"]/);
  });

  it('bỏ mã phân hệ nội bộ (T1B-OPS DEC-T1B-OPS-04)', () => {
    // "Phân hệ M5" đã bị loại bỏ khỏi UI.
    expect(CODE).not.toContain('Phân hệ M5');
    expect(CODE).not.toMatch(/M5\s*—/);
    // Mô tả ngắn gọn: "Quản lý thông tin và trạng thái người lao động."
    expect(CODE).toContain('Quản lý thông tin và trạng thái người lao động.');
  });
});

describe('/admin/workers — T0 T1B encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});