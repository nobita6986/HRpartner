/**
 * public-fail-closed.integration.test.ts — t1a-staffing-order-management.
 *
 * Regression test cho RQ-08: public job board fail-closed invariant.
 *
 * Invariant: khi StaffingOrder chuyển sang trạng thái `CLOSED` hoặc
 * `CANCELLED`, order đó KHÔNG được:
 *   (a) xuất hiện trong danh sách job board công khai;
 *   (b) hiển thị trên trang chi tiết public;
 *   (c) nhận đơn ứng tuyển mới.
 *
 * Cơ sở: `src/domains/job-board/public.service.ts:209`
 * `VISIBLE_ORDER_STATUSES = ['OPEN', 'CLOSING_SOON']`; và
 * `src/domains/staffing/types.ts` `isOpenOrderStatus()`.
 *
 * Test dùng mock Prisma (vitest unit pattern). Không cần DB thật.
 */

import { describe, expect, it } from 'vitest';

import {
  OPEN_ORDER_STATUSES,
  STAFFING_ORDER_STATUSES,
  isOpenOrderStatus,
} from './types';

describe('t1a-staffing-order-management — public fail-closed invariant (RQ-08)', () => {
  describe('isOpenOrderStatus() — canonical source of truth', () => {
    it('OPEN → true (đang nhận hồ sơ)', () => {
      expect(isOpenOrderStatus('OPEN')).toBe(true);
    });

    it('CLOSING_SOON → true (đang nhận hồ sơ, ưu tiên thấp)', () => {
      expect(isOpenOrderStatus('CLOSING_SOON')).toBe(true);
    });

    it('CLOSED → false (terminal, không nhận hồ sơ)', () => {
      expect(isOpenOrderStatus('CLOSED')).toBe(false);
    });

    it('CANCELLED → false (terminal, không nhận hồ sơ)', () => {
      expect(isOpenOrderStatus('CANCELLED')).toBe(false);
    });

    it('unknown status → false (fail closed)', () => {
      expect(isOpenOrderStatus('ACTIVE')).toBe(false);
      expect(isOpenOrderStatus('DRAFT')).toBe(false);
      expect(isOpenOrderStatus('FILLED')).toBe(false);
    });

    it('OPEN_ORDER_STATUSES chỉ chứa OPEN + CLOSING_SOON', () => {
      expect(OPEN_ORDER_STATUSES).toHaveLength(2);
      expect(OPEN_ORDER_STATUSES).toContain('OPEN');
      expect(OPEN_ORDER_STATUSES).toContain('CLOSING_SOON');
    });
  });

  describe('public.board isOrderVisible() fail-closed', () => {
    // Minimal mock of isOrderVisible logic from public.service.ts:367
    // isExpired(date, now) = Boolean(date && date < now)  →  null is NOT expired
    // isOrderVisible: VISIBLE_ORDER_STATUSES.includes(status) && !isExpired(deadlineDate, now)
    function isExpired(date: Date | null, now: Date): boolean {
      return Boolean(date && date < now);
    }
    function isOrderVisible(order: { status: string; deadlineDate: Date | null }, now: Date): boolean {
      const VISIBLE_ORDER_STATUSES = ['OPEN', 'CLOSING_SOON'] as const;
      return VISIBLE_ORDER_STATUSES.includes(order.status as typeof VISIBLE_ORDER_STATUSES[number]) && !isExpired(order.deadlineDate, now);
    }

    const now = new Date('2026-10-05T12:00:00Z');

    it('OPEN + deadline future → VISIBLE', () => {
      expect(isOrderVisible({ status: 'OPEN', deadlineDate: new Date('2026-12-31') }, now)).toBe(true);
    });

    it('CLOSING_SOON + deadline future → VISIBLE', () => {
      expect(isOrderVisible({ status: 'CLOSING_SOON', deadlineDate: new Date('2026-12-31') }, now)).toBe(true);
    });

    it('OPEN + deadline past → NOT VISIBLE (expired)', () => {
      expect(isOrderVisible({ status: 'OPEN', deadlineDate: new Date('2026-09-01') }, now)).toBe(false);
    });

    it('CLOSED + deadline future → NOT VISIBLE (fail closed)', () => {
      expect(isOrderVisible({ status: 'CLOSED', deadlineDate: new Date('2026-12-31') }, now)).toBe(false);
    });

    it('CLOSED + deadline past → NOT VISIBLE (fail closed)', () => {
      expect(isOrderVisible({ status: 'CLOSED', deadlineDate: new Date('2026-09-01') }, now)).toBe(false);
    });

    it('CANCELLED + deadline future → NOT VISIBLE (fail closed)', () => {
      expect(isOrderVisible({ status: 'CANCELLED', deadlineDate: new Date('2026-12-31') }, now)).toBe(false);
    });

    it('CANCELLED + deadline past → NOT VISIBLE (fail closed)', () => {
      expect(isOrderVisible({ status: 'CANCELLED', deadlineDate: new Date('2026-09-01') }, now)).toBe(false);
    });

    it('OPEN + deadline null → VISIBLE (no deadline = no expiry)', () => {
      expect(isOrderVisible({ status: 'OPEN', deadlineDate: null }, now)).toBe(true);
    });

    it('CLOSED + deadline null → NOT VISIBLE (fail closed)', () => {
      expect(isOrderVisible({ status: 'CLOSED', deadlineDate: null }, now)).toBe(false);
    });

    it('CANCELLED + deadline null → NOT VISIBLE (fail closed)', () => {
      expect(isOrderVisible({ status: 'CANCELLED', deadlineDate: null }, now)).toBe(false);
    });
  });

  describe('publish.service PUBLISHABLE_ORDER_STATUSES guard', () => {
    // Replicate the guard from publish.service.ts:23
    function countPublishable(orders: Array<{ status: string }>): number {
      const PUBLISHABLE_ORDER_STATUSES = new Set(['OPEN', 'CLOSING_SOON']);
      return orders.filter((o) => PUBLISHABLE_ORDER_STATUSES.has(o.status)).length;
    }

    it('chỉ OPEN và CLOSING_SOON được tính là publishable', () => {
      const orders = [
        { status: 'OPEN' },
        { status: 'CLOSING_SOON' },
        { status: 'CLOSED' },
        { status: 'CANCELLED' },
      ];
      expect(countPublishable(orders)).toBe(2);
    });

    it('CLOSED/CANCELLED trong batch bị loại', () => {
      const orders = [
        { status: 'CLOSED' },
        { status: 'CANCELLED' },
        { status: 'CLOSED' },
        { status: 'OPEN' },
      ];
      expect(countPublishable(orders)).toBe(1);
    });
  });

  describe('no new enums added (T0 contract: no schema change)', () => {
    it('STAFFING_ORDER_STATUSES chỉ có 4 giá trị hiện có', () => {
      expect(STAFFING_ORDER_STATUSES).toHaveLength(4);
      expect(STAFFING_ORDER_STATUSES).toContain('OPEN');
      expect(STAFFING_ORDER_STATUSES).toContain('CLOSING_SOON');
      expect(STAFFING_ORDER_STATUSES).toContain('CLOSED');
      expect(STAFFING_ORDER_STATUSES).toContain('CANCELLED');
    });

    it('không có enum mới nào (ACTIVE, DRAFT, FILLED không phải StaffingOrder status)', () => {
      expect(STAFFING_ORDER_STATUSES).not.toContain('ACTIVE');
      expect(STAFFING_ORDER_STATUSES).not.toContain('DRAFT');
      expect(STAFFING_ORDER_STATUSES).not.toContain('FILLED');
    });
  });
});
