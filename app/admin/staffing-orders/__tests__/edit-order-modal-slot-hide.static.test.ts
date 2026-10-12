/**
 * edit-order-modal-slot-hide.static.test.ts — t1b-pre-p2-staffing-order-slot-hide-fields.
 *
 * Static guard cho form sửa Nhu cầu tuyển dụng (`EditOrderModal`) sau khi ẩn
 * 3 trường nhập liệu: Lương/giờ, Giờ vào, Giờ ra.
 *
 * T0 directive 2026-10-07:
 *   - Lương/giờ (hourlyRateVnd), Giờ vào (shiftStart), Giờ ra (shiftEnd) PHẢI
 *     ẩn khỏi UI nhập liệu.
 *   - Giá trị hiện tại của các field này vẫn được giữ nguyên trong `DraftSlot`
 *     state và gửi qua PUT payload — không bị ghi đè null/0/default khi sửa
 *     bản ghi cũ.
 *   - `pickSlotWriteData` ở service (order.service.ts) tiếp tục chấp nhận các
 *     field này; route PUT tiếp tục validate hourlyRateVnd/shiftStart/shiftEnd
 *     (bảo toàn rule nghiệp vụ).
 *   - Mã vị trí (positionCode) KHÔNG nằm trong task này; bàn giao bước sau khi
 *     có shared generator T0 duyệt.
 *
 * Pure filesystem test — không DOM, React, DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const EDIT_MODAL_PATH = join(
  process.cwd(),
  'app/admin/staffing-orders/[id]/edit-order-modal.tsx',
);
const SERVICE_PATH = join(
  process.cwd(),
  'src/domains/staffing/order.service.ts',
);
const API_ROUTE_PATH = join(
  process.cwd(),
  'app/api/staffing/orders/[id]/route.ts',
);

const EDIT_MODAL_SOURCE = readFileSync(EDIT_MODAL_PATH, 'utf8');
const SERVICE_SOURCE = readFileSync(SERVICE_PATH, 'utf8');
const API_ROUTE_SOURCE = readFileSync(API_ROUTE_PATH, 'utf8');

describe('t1b-pre-p2-staffing-order-slot-hide-fields — ẩn Lương/giờ + Giờ vào/ra', () => {
  it('EditOrderModal KHÔNG render input Lương/giờ (hourlyRateVnd)', () => {
    expect(EDIT_MODAL_SOURCE).not.toMatch(/Lương\/giờ \(VND\)/);
    expect(EDIT_MODAL_SOURCE).not.toMatch(/data-testid="edit-slot-rate-/);
    // hourlyRateVnd vẫn còn trong state (DraftSlot interface) — KHÔNG được xoá
    // khỏi state vì cần gửi qua PUT payload.
    expect(EDIT_MODAL_SOURCE).toMatch(/hourlyRateVnd/);
  });

  it('EditOrderModal KHÔNG render input Giờ vào (shiftStart)', () => {
    expect(EDIT_MODAL_SOURCE).not.toMatch(/>Giờ vào</);
    expect(EDIT_MODAL_SOURCE).not.toMatch(/data-testid="edit-slot-start-/);
    // shiftStart vẫn còn trong state — KHÔNG được xoá khỏi DraftSlot.
    expect(EDIT_MODAL_SOURCE).toMatch(/shiftStart/);
  });

  it('EditOrderModal KHÔNG render input Giờ ra (shiftEnd)', () => {
    expect(EDIT_MODAL_SOURCE).not.toMatch(/>Giờ ra</);
    expect(EDIT_MODAL_SOURCE).not.toMatch(/data-testid="edit-slot-end-/);
    // shiftEnd vẫn còn trong state.
    expect(EDIT_MODAL_SOURCE).toMatch(/shiftEnd/);
  });

  it('EditOrderModal giữ nguyên required validation cho positionCode (Mã *)', () => {
    // positionCode vẫn required — server generator chưa sẵn, bàn giao bước sau.
    expect(EDIT_MODAL_SOURCE).toMatch(/Mã \*/);
    // Template literal form: `edit-slot-code-${idx}`
    expect(EDIT_MODAL_SOURCE).toMatch(/edit-slot-code-/);
    expect(EDIT_MODAL_SOURCE).toMatch(/required\s+data-testid=\{`edit-slot-code-/);
  });

  it('EditOrderModal KHÔNG gửi null/0/default cho 3 field ẩn khi payload sinh ra', () => {
    // Client-side guard: validation phải BỎ QUA hourlyRateVnd/shiftStart/shiftEnd
    // (đã ẩn) nhưng vẫn gửi giá trị cũ qua payload.
    // Tìm khối `const payload = { ... slots: drafts.filter(...).map(d => ({ ... }))`}.
    const payloadMatch = EDIT_MODAL_SOURCE.match(/const payload = \{([\s\S]*?)\};/);
    if (!payloadMatch) throw new Error('payload object không tìm thấy');
    const payloadBody = payloadMatch[1];
    // payload phải vẫn chứa hourlyRateVnd/shiftStart/shiftEnd (preserve dữ liệu cũ).
    expect(payloadBody).toMatch(/hourlyRateVnd/);
    expect(payloadBody).toMatch(/shiftStart/);
    expect(payloadBody).toMatch(/shiftEnd/);
  });

  it('order.service pickSlotWriteData vẫn pick hourlyRateVnd/shiftStart/shiftEnd (bảo toàn contract cũ)', () => {
    // Service không được bỏ các field này khỏi write data khi slot update.
    expect(SERVICE_SOURCE).toMatch(/pickSlotWriteData[\s\S]{0,500}hourlyRateVnd/);
    expect(SERVICE_SOURCE).toMatch(/pickSlotWriteData[\s\S]{0,800}shiftStart/);
    expect(SERVICE_SOURCE).toMatch(/pickSlotWriteData[\s\S]{0,800}shiftEnd/);
  });

  it('API PUT vẫn validate hourlyRateVnd (safe integer, >=0, null OK) — bảo toàn rule nghiệp vụ', () => {
    expect(API_ROUTE_SOURCE).toMatch(/lương\/giờ phải là số nguyên không âm hoặc null/);
    expect(API_ROUTE_SOURCE).toMatch(/lương\/giờ vượt quá giá trị an toàn/);
  });

  it('API PUT vẫn validate shiftStart/shiftEnd (HH:mm hoặc null)', () => {
    expect(API_ROUTE_SOURCE).toMatch(/giờ vào phải là HH:mm hoặc null/);
    expect(API_ROUTE_SOURCE).toMatch(/giờ ra phải là HH:mm hoặc null/);
  });

  // Encoding & LF-only
  it('tất cả file trong surface là LF-only, no UTF-8 BOM', () => {
    for (const src of [EDIT_MODAL_SOURCE, SERVICE_SOURCE, API_ROUTE_SOURCE]) {
      expect(src).not.toMatch(/\r\n/);
      expect(src.charCodeAt(0)).not.toBe(0xfeff);
    }
  });
});
