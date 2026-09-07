/**
 * public-listing.labels.ts — go-live-20 / RQ-12 / STEP-02, mục 4.4.
 *
 * Hai hàm nhãn cho thẻ việc phía SERVER. Trang chủ `app/(portal)/page.tsx` là `'use client'` nên
 * hai hàm của nó nằm trong module client và không dùng lại được từ một Server Component; đây là
 * bản dùng cho `/viec-lam`, chuỗi lấy đúng từ baseline `b68d25b:"app/(portal)/page.tsx"` ở `:85`
 * và `:101`.
 *
 * VÌ SAO không import từ trang chủ, và vì sao đây KHÔNG phải sao chép mù: mục 4.2 cấm chạm
 * `app/(portal)/page.tsx` vì `hrp-v5-ui-01-new-ui-home-integration` đang viết lại chính tệp đó
 * (`PLN-64`). Cái giá của một nguồn thứ hai được trả bằng một hàng rào: `AC-14` buộc
 * `public-listing.static.test.ts` đọc CẢ HAI tệp bằng `readFileSync` và đòi mọi chuỗi nhãn ở đây
 * có mặt y hệt bên trang chủ. Ngày nào ui-01 đổi một chuỗi, hàng rào đó đỏ, và việc gộp về một
 * nguồn duy nhất được xử ở `R-06`/`Q-02` sau khi ui-01 ACCEPTED — không phải bây giờ, vì gộp
 * ngay có nghĩa là hai hợp đồng cùng ghi một tệp.
 *
 * `Intl.NumberFormat('vi-VN')` được giữ nguyên như bản trang chủ chứ không tự ghép dấu chấm:
 * runtime `nodejs` của trang này đo được — `node -v` là v24.19.0, `resolvedOptions().locale` trả
 * đúng `vi-VN` và `format(30000)` trả `30.000`, tức trùng khít bản chạy trên trình duyệt. Ghi ở
 * HANDOFF `STEP-02`.
 */

/** DEC-04: card in tối đa ba giá trị rồi `+N`. Rỗng thì nói "đang cập nhật", không bịa một giá trị. */
const CARD_SUMMARY_LIMIT = 3;

export function summaryLabel(values: string[], fallback: string): string {
  const shown = values.slice(0, CARD_SUMMARY_LIMIT);
  if (shown.length === 0) return fallback;
  const rest = values.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} +${rest}` : shown.join(' · ');
}

/**
 * go-live-09 / RQ-10, DEC-03 — ĐÚNG một chỗ trên trang nói về tiền.
 *
 * `null` không được in thành `0`: `"0 đ/giờ"` là một khẳng định SAI về tiền, còn
 * `"Lương thương lượng"` là mô tả đúng trạng thái "đơn chưa công bố lương". Hai đầu bằng nhau thì in
 * một số chứ không in dải `30.000 – 30.000`.
 */
const VND_FORMAT = new Intl.NumberFormat('vi-VN');

export function salaryLabel(min: number | null, max: number | null): string {
  if (min === null) return 'Lương thương lượng';
  const from = VND_FORMAT.format(min);
  if (max !== null && max !== min) return `${from} – ${VND_FORMAT.format(max)} đ/giờ`;
  return `${from} đ/giờ`;
}
