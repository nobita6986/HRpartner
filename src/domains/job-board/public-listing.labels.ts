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

/**
 * hrp-t2-public-site-hotfix (T2 / STEP-03): 6 khoảng lương cố định theo
 * `salaryMinVnd` (VND/tháng). Mỗi bucket mã hoá chuỗi hyphen-range để URL
 * ngắn gọn (`?salary=10-15`). Thứ tự trong tuple cố định; UI hiển thị theo
 * thứ tự đã khai. Các giá trị `1_000_000` này khớp DEC-01: 1 triệu VND.
 *
 * `null` job (không có `salaryMinVnd`) bị ẩn khỏi tập lọc khi bucket được
 * chọn — đó là `formatPublicSalary` fallback "Lương thương lượng" và sẽ nói
 * sai trong một dải lọc cụ thể.
 *
 * Tuple và type PHẢI đồng bộ với `SALARY_BUCKETS` trong
 * `public-listing.params.ts` — parser là canonical (parser whitelist),
 * labels là phái sinh (display). Test `public-listing.params.test.ts` ép
 * cả hai cùng đi qua.
 */
export type SalaryBucket = '<5' | '5-10' | '10-15' | '15-20' | '20-30' | '>30';
const SALARY_BUCKETS_TUPLE: readonly SalaryBucket[] = [
  '<5',
  '5-10',
  '10-15',
  '15-20',
  '20-30',
  '>30',
];

const SALARY_BUCKET_LABELS: Readonly<Record<SalaryBucket, string>> = {
  '<5': 'Dưới 5 triệu',
  '5-10': '5 – 10 triệu',
  '10-15': '10 – 15 triệu',
  '15-20': '15 – 20 triệu',
  '20-30': '20 – 30 triệu',
  '>30': 'Trên 30 triệu',
};

/**
 * Label hiển thị cho option của select. Bất kỳ bucket nào không có trong
 * whitelist sẽ có label rỗng (UI không bao giờ hiển thị chúng — parser
 * whitelist `SALARY_BUCKETS`).
 */
export function salaryBucketLabel(bucket: SalaryBucket): string {
  return SALARY_BUCKET_LABELS[bucket];
}

/**
 * hrp-ui-v1-public-card-truth-correction (T1A / DEC-09, DEC-10, RQ-11) — MỘT resolver cho cả
 * homepage FeaturedJobCard, public listing `/viec-lam`, public detail `/viec-lam/[slug]`, và
 * related-jobs card. Thứ tự ưu tiên:
 *
 *   1. Nếu `salaryDisplay.trim()` khác rỗng: render nguyên văn plain text của người soạn.
 *      - KHÔNG thêm `đ/giờ` — đó là chuỗi HR/Owner tự gõ (vd "20 triệu", "Thỏa thuận").
 *      - React render plain text qua `<p>{...}</p>` ⇒ không HTML injection.
 *   2. Nếu `salaryDisplay` null/rỗng và `salaryMinVnd != null`: dùng hourly/range fallback
 *      hiện tại (`salaryLabel`). Hai đầu bằng nhau ⇒ in một số; `null` ⇒ "Lương thương lượng".
 *   3. Cả hai không có: "Lương thương lượng".
 *
 * Pure function: không I/O, không `Date.now()`, không `Math.random()`. Hai lần gọi cùng
 * input cho cùng output.
 */
export function formatPublicSalary(input: {
  salaryDisplay: string | null;
  salaryMinVnd: number | null;
  salaryMaxVnd: number | null;
}): string {
  const trimmed = input.salaryDisplay?.trim();
  if (trimmed) return trimmed;
  return salaryLabel(input.salaryMinVnd, input.salaryMaxVnd);
}
