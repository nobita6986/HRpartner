/**
 * staffing-terminology.static.test.ts — T1B Wave 2 (EP §5.2 / L-044..L-046).
 *
 * Static guard for `/admin/staffing` (list client). Wave 2 scope:
 *   - H1: `Nhu cầu tuyển dụng` (glossary `staffing` / `staffing_order`).
 *   - Table column header `Slots` → `Vị trí cần tuyển` (glossary `staffing_order_slot`).
 *   - Status badge via `staffingOrderStatusLabel()` + shared `<StatusBadge>`.
 *   - Status filter button text Vietnamese.
 *   - Empty state copy Vietnamese.
 *   - Tổng count: `đơn tuyển dụng` instead of `orders`.
 *
 * Diacritic-missing detection (per EP §4.5, T0 §3.D) uses an explicit
 * per-route forbidden literal list with allowlist for canonical tokens
 * (no regex heuristic). This route is the most common leak surface per
 * audit §4 (3 of 12 diacritic-missing occurrences in Wave 4 carry-over),
 * so the list is the canonical baseline.
 *
 * Pure filesystem test — no DOM, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PATH = join(process.cwd(), 'app/admin/staffing/staffing-list-client.tsx');
const SOURCE = readFileSync(PATH, 'utf8');

describe('hrp-admin-localization-wave2 — /admin/staffing list client (L-044..L-046)', () => {
  it('H1 is "Nhu cầu tuyển dụng" (not "Staffing Orders")', () => {
    expect(SOURCE).toMatch(/<h1[^>]*>Nhu cầu tuyển dụng<\/h1>/);
  });

  it('legacy H1 "Staffing Orders" is REMOVED', () => {
    expect(SOURCE).not.toMatch(/>\s*Staffing Orders\s*</);
  });

  it('table column header "Vị trí cần tuyển" present (string literal in header array), legacy "Slots" header REMOVED', () => {
    // Headers are rendered through `.map(h => <th>{h}</th>)` so the
    // canonical literal appears as a JS string in the source array.
    expect(SOURCE).toMatch(/'Vị trí cần tuyển'/);
    expect(SOURCE).not.toMatch(/'Slots'/);
    expect(SOURCE).not.toMatch(/>\s*Slots\s*<\/th>/);
  });

  it('status badge routed through domain dictionary + shared <StatusBadge>', () => {
    expect(SOURCE).toMatch(/staffingOrderStatusLabel/);
    expect(SOURCE).toMatch(/<StatusBadge\b/);
  });

  it('inline STATUS_CONFIG + local StatusBadge component are REMOVED', () => {
    // The original inline `STATUS_CONFIG` constant was the source of raw
    // English fallback. It MUST be removed in Wave 2.
    expect(SOURCE).not.toMatch(/const STATUS_CONFIG/);
    // The local `function StatusBadge` component was the source of raw
    // enum text rendering. It MUST be removed in Wave 2.
    expect(SOURCE).not.toMatch(/function StatusBadge\(/);
  });

  it('empty state copy is Vietnamese ("đơn tuyển dụng")', () => {
    expect(SOURCE).toMatch(/Chưa có đơn tuyển dụng nào/);
    // Legacy copy "Chưa có Staffing Order nào" removed.
    expect(SOURCE).not.toMatch(/Chưa có Staffing Order nào/);
  });

  it('Tổng count uses "đơn tuyển dụng" not raw "orders"', () => {
    expect(SOURCE).toMatch(/Tổng: \{total\} đơn tuyển dụng/);
    // The bare "Tổng: {total} orders" pattern is gone (the dynamic part is the same).
    expect(SOURCE).not.toMatch(/Tổng: \{total\} orders/);
  });

  // Diacritic-missing forbidden literal list (per-route, EP §4.5 + T0 §3.D).
  // Allowlist covers canonical tokens (null, undefined, true, false, M4, M8,
  // OPEN, CLOSING_SOON, CLOSED, CANCELLED) and the `Tạo Order` button label
  // (which uses `Order` as a canonical business term, NOT diacritic-missing).
  it('forbids diacritic-missing literal "tao" in business UI strings (allowlist: comments / variable names / "Tạo Order" / "Tạo đơn")', () => {
    // The raw unaccented `tao` MUST NOT appear as standalone text — only
    // inside the canonical `Tạo`/`Tạo Order`/`Tạo đơn` business labels.
    // We assert by matching the exact forbidden standalone forms only.
    expect(SOURCE).not.toMatch(/'tao'/);
    expect(SOURCE).not.toMatch(/>\s*tao\s*</);
    expect(SOURCE).not.toMatch(/\btao\b(?![ -]*(?:Order|đơn|đơn tuyển|đơn tuyển dụng|Bảng|đối soát|Timesheet|Vendor|Client|Statement))/);
  });

  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// t1a-staffing-order-management — STEP-01 column format guard.
// T0 directive: cột `Vị trí` phải render TÊN VỊ TRÍ kèm filled/needed +
// "(còn thiếu N)" thay cho chip `0/1` đơn thuần. Thêm cột `Hạn tuyển`
// (deadlineDate) và cột `Thao tác` với link `Xem chi tiết` tới trang
// quản lý.
// ═══════════════════════════════════════════════════════════════════════════

describe('t1a-staffing-order-management — /admin/staffing list cột Vị trí + Thao tác', () => {
  it('SlotBreakdown component renders "Tên vị trí — filled/needed (còn thiếu N)"', () => {
    // Component mới thay chip `0/1` đơn thuần. Phải có render TÊN + "(còn thiếu N)" cho slot chưa đủ.
    expect(SOURCE).toMatch(/function SlotBreakdown/);
    expect(SOURCE).toMatch(/Còn thiếu/i);
    expect(SOURCE).toMatch(/\(đã đủ\)/);
  });

  it('legacy SlotChip component is REMOVED', () => {
    // SlotChip chỉ render `filled/needed` không có tên vị trí — không đủ ngữ cảnh.
    expect(SOURCE).not.toMatch(/function SlotChip/);
  });

  it('bảng có cột "Hạn tuyển" + "Thao tác" (header array literal)', () => {
    expect(SOURCE).toMatch(/'Hạn tuyển'/);
    expect(SOURCE).toMatch(/'Thao tác'/);
  });

  it('cột "Thao tác" render link "Xem chi tiết" trỏ tới /admin/staffing-orders/[id]', () => {
    expect(SOURCE).toMatch(/Xem chi tiết/);
    expect(SOURCE).toMatch(/staffing-order-action-\$\{o\.id\}/);
  });

  it('cột "Ngày tạo" đã được thay bằng "Hạn tuyển" trên header', () => {
    // Bảng cũ có cột "Ngày tạo" — đã được thay bằng "Hạn tuyển" (deadline).
    expect(SOURCE).not.toMatch(/'Ngày tạo'/);
  });
});
