/**
 * pagination-integration.test.ts — hrp-t2-public-paging-tone-hotfix / RQ-08.
 *
 * Regression test cho bug #1: "Phân trang /viec-lam không chuyển trang 2".
 *
 * Root cause (EV-02): `cleanOffset` trong `public-listing.params.ts` dùng
 * `Math.floor(parsed / PAGE_SIZE) * PAGE_SIZE` với `PAGE_SIZE = 20` hard-coded,
 * nhưng `listingPageSize` runtime (từ HomepageSettings) có thể là 6-50 (mặc
 * định 12). Khi `listingPageSize = 12`:
 *   - User click "Trang 2" → `pageHref(2) = buildListingHref(params, (2-1)*12) = ?offset=12`
 *   - Parser đọc `?offset=12` → `Math.floor(12/20) * 20 = 0` → về trang 1
 *
 * Fix: `cleanOffset(raw, pageSize: number)` nhận dynamic pageSize; page.tsx
 * truyền `listingPageSize` xuống.
 *
 * Test này cover integration giữa parser + builder round-trip với pageSize=12
 * (default thực tế) + filter retention. Nó nằm trong
 * `app/(jobs)/viec-lam/__tests__/` thay vì `src/domains/job-board/__tests__/`
 * vì nó là page-level integration, không phải unit test của params module.
 */
import { describe, it, expect } from 'vitest';
import {
  PAGE_SIZE,
  parseListingSearchParams,
  buildListingHref,
} from '@/src/domains/job-board/public-listing.params';
import type { SalaryBucket } from '@/src/domains/job-board/public-listing.params';

/**
 * Type cho bốn trường whitelist của `/viec-lam`: `q`, `salary`, `area`,
 * `offset`. `ListingParams` trong module là `type` cục bộ (không export) —
 * khai inline ở đây để giữ test độc lập với internal type, đồng thời
 * ghìm bề mặt hợp đồng mà test kiểm tra. `salary` dùng `SalaryBucket` để
 * tương thích với `buildListingHref`.
 */
type ListingParams = {
  q: string | undefined;
  salary: SalaryBucket | undefined;
  area: string | undefined;
  offset: number;
};

/** pageSize thực tế từ HomepageSettings, default = 12. */
const RUNTIME_PAGE_SIZE = 12;

describe('hrp-t2-public-paging-tone-hotfix / RQ-08 — pagination integration', () => {
  describe('regression: round-trip với pageSize=12 (runtime default)', () => {
    it('?offset=12 với pageSize=12 KHÔNG bị kéo về 0', () => {
      // Đây là kịch bản click "Trang 2" trên trang có listingPageSize=12.
      // Trước fix: cleanOffset(12, 20) = 0 → về trang 1. Sau fix: cleanOffset(12, 12) = 12.
      const params = parseListingSearchParams({ offset: '12' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(12);
    });

    it('?offset=24 với pageSize=12 giữ nguyên 24 (bội đúng)', () => {
      const params = parseListingSearchParams({ offset: '24' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(24);
    });

    it('?offset=30 với pageSize=12 bị kéo xuống bội gần nhất 24', () => {
      // Không chia hết → kéo xuống 24 (giống behavior cũ với PAGE_SIZE=20, offset 25→20)
      const params = parseListingSearchParams({ offset: '30' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(24);
    });

    it('?offset=7 với pageSize=12 bị kéo về 0 (< pageSize)', () => {
      const params = parseListingSearchParams({ offset: '7' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(0);
    });

    it('?offset=100 với pageSize=12 bị kéo xuống 96 (bội gần nhất)', () => {
      const params = parseListingSearchParams({ offset: '100' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(96);
    });

    it('?offset=-40 với pageSize=12 vẫn kẹp về 0 (giữ behavior cũ)', () => {
      const params = parseListingSearchParams({ offset: '-40' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(0);
    });

    it('?offset=abc với pageSize=12 vẫn kẹp về 0 (giữ behavior cũ)', () => {
      const params = parseListingSearchParams({ offset: 'abc' }, RUNTIME_PAGE_SIZE);
      expect(params.offset).toBe(0);
    });
  });

  describe('regression: page builder round-trip với pageSize=12', () => {
    it('buildListingHref(params, 12) → parse trở lại offset=12', () => {
      // Kịch bản thực tế: pageHref(2) sinh URL, user click, server re-parse.
      // ListingParams hiện tại whitelist 4 tên: q, salary, area, offset.
      const initial: ListingParams = { q: 'bao ve', salary: undefined, area: undefined, offset: 0 };
      const href = buildListingHref(initial, 12);
      expect(href).toContain('offset=12');
      // Parse lại URL — phải nhận đúng offset 12 (không về 0).
      const url = new URL(href, 'http://localhost');
      const reParsed = parseListingSearchParams(
        { q: url.searchParams.get('q') ?? undefined, offset: url.searchParams.get('offset') ?? undefined },
        RUNTIME_PAGE_SIZE,
      );
      expect(reParsed.offset).toBe(12);
    });

    it('filter retention khi chuyển trang: q + salary + area giữ nguyên', () => {
      // Module hiện tại whitelist 4 tên: q, salary, area, offset (shift bị bỏ
      // từ hrp-t2-public-site-hotfix / T2 / STEP-03). Round-trip phải giữ
      // đủ 3 filter qua page 3.
      const filters: ListingParams = {
        q: 'cong nhan',
        salary: '10-15',
        area: 'Bac Ninh',
        offset: 0,
      };
      // Trang 3 với pageSize=12 → offset=24
      const page3Href = buildListingHref(filters, 24);
      expect(page3Href).toContain('q=cong+nhan');
      expect(page3Href).toContain('salary=10-15');
      expect(page3Href).toContain('area=Bac+Ninh');
      expect(page3Href).toContain('offset=24');

      // Parse lại — filter phải còn nguyên.
      const url = new URL(page3Href, 'http://localhost');
      const reParsed = parseListingSearchParams(
        {
          q: url.searchParams.get('q') ?? undefined,
          salary: url.searchParams.get('salary') ?? undefined,
          area: url.searchParams.get('area') ?? undefined,
          offset: url.searchParams.get('offset') ?? undefined,
        },
        RUNTIME_PAGE_SIZE,
      );
      expect(reParsed.q).toBe('cong nhan');
      expect(reParsed.salary).toBe('10-15');
      expect(reParsed.area).toBe('Bac Ninh');
      expect(reParsed.offset).toBe(24);
    });

    it('pageHref(2) cho total=30, pageSize=12: offset=12, link next dẫn tới trang 3 (offset=24)', () => {
      // Mô phỏng logic trong page.tsx: pageHref(n) = buildListingHref(params, (n-1) * listingPageSize)
      const filters: ListingParams = { q: undefined, salary: undefined, area: undefined, offset: 0 };
      const page2Href = buildListingHref(filters, (2 - 1) * RUNTIME_PAGE_SIZE);
      const page3Href = buildListingHref(filters, (3 - 1) * RUNTIME_PAGE_SIZE);
      expect(page2Href).toContain('offset=12');
      expect(page3Href).toContain('offset=24');
    });
  });

  describe('backward compat: pageSize=20 (PAGE_SIZE constant) vẫn hoạt động', () => {
    it('parseListingSearchParams(raw, 20) parse đúng cho các giá trị cũ', () => {
      expect(parseListingSearchParams({ offset: '20' }, 20).offset).toBe(20);
      expect(parseListingSearchParams({ offset: '25' }, 20).offset).toBe(20);
      expect(parseListingSearchParams({ offset: '40' }, 20).offset).toBe(40);
      expect(parseListingSearchParams({ offset: '41' }, 20).offset).toBe(40);
    });

    it('PAGE_SIZE constant còn export = 20 cho backward compat với caller khác', () => {
      expect(PAGE_SIZE).toBe(20);
    });
  });

  describe('regression: total/page math mô phỏng page.tsx', () => {
    it('total=30, pageSize=12 → totalPages=3, currentPage=1 khi offset=0', () => {
      const total = 30;
      const totalPages = Math.max(1, Math.ceil(total / RUNTIME_PAGE_SIZE));
      const params = parseListingSearchParams({}, RUNTIME_PAGE_SIZE);
      const currentPage = Math.floor(params.offset / RUNTIME_PAGE_SIZE) + 1;
      expect(totalPages).toBe(3);
      expect(currentPage).toBe(1);
    });

    it('total=30, pageSize=12, offset=12 → currentPage=2', () => {
      const params = parseListingSearchParams({ offset: '12' }, RUNTIME_PAGE_SIZE);
      const currentPage = Math.floor(params.offset / RUNTIME_PAGE_SIZE) + 1;
      expect(currentPage).toBe(2);
    });

    it('total=30, pageSize=12, offset=24 → currentPage=3, beyondLastPage = false (vẫn còn 6 jobs)', () => {
      // jobs.slice(24, 36) trên total=30 → 6 jobs còn lại → beyondLastPage = false
      const total = 30;
      const params = parseListingSearchParams({ offset: '24' }, RUNTIME_PAGE_SIZE);
      const currentPage = Math.floor(params.offset / RUNTIME_PAGE_SIZE) + 1;
      const pageSize = RUNTIME_PAGE_SIZE;
      const pageLength = Math.max(0, Math.min(pageSize, total - params.offset));
      const beyondLastPage = params.offset > 0 && total > 0 && pageLength === 0;
      expect(currentPage).toBe(3);
      expect(pageLength).toBe(6);
      expect(beyondLastPage).toBe(false);
    });

    it('total=30, pageSize=12, offset=36 → beyondLastPage=true (vượt total)', () => {
      const total = 30;
      const params = parseListingSearchParams({ offset: '36' }, RUNTIME_PAGE_SIZE);
      const pageLength = Math.max(0, Math.min(RUNTIME_PAGE_SIZE, total - params.offset));
      const beyondLastPage = params.offset > 0 && total > 0 && pageLength === 0;
      expect(pageLength).toBe(0);
      expect(beyondLastPage).toBe(true);
    });
  });
});
