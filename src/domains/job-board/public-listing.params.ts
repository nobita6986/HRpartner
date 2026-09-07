/**
 * public-listing.params.ts — go-live-20 / RQ-02, RQ-03, RQ-05, RQ-06 / STEP-01, mục 4.4.
 *
 * Bốn tham số của `/viec-lam` và một hàm ghép URL, tách khỏi `page.tsx` có chủ ý: đây là chỗ DUY
 * NHẤT quyết định một trạng thái lọc trông như thế nào trên thanh địa chỉ, nên nó phải đo được
 * bằng phép gọi hàm trần. Nếu logic này nằm trong thân Server Component thì cách duy nhất để đo là
 * render với `searchParams`, rate-limit và DB đều mock — và một bài test như thế vẫn xanh khi hàm
 * ghép URL đánh rơi một bộ lọc lúc sang trang.
 *
 * Hai luật của hợp đồng, cả hai đều là luật về URL chứ không về hiển thị:
 *   - KHÔNG ghi `offset` khi nó bằng 0, nên trang một của một bộ lọc là ĐÚNG MỘT chuỗi (`RQ-06`).
 *     Thiếu luật này thì `/viec-lam?q=a` và `/viec-lam?q=a&offset=0` là hai URL cho cùng một nội
 *     dung, và canonical của `DEC-08` mất nghĩa.
 *   - CHỈ bốn tên `q`, `area`, `shift`, `offset` được đọc và được phát ra. Mọi tên khác bị loại
 *     trong im lặng (`RQ-03`), gồm bốn tên mà bề mặt cũ từng hứa mà không có vị từ chống lưng:
 *     `salary`, `limit`, `shiftType`, `jobType`.
 *
 * Ba xử lý `offset` KHÁC nhau, đừng gộp: âm hoặc không phải số thì KẸP về 0 (`RQ-02`); không chia
 * hết `PAGE_SIZE` thì KÉO XUỐNG bội gần nhất, vì `RQ-02` chỉ liệt kê ba ca reset-về-0 và ca này
 * không nằm trong đó; còn ca vượt `total` thuộc về trang, vì module này không biết `total`.
 */

/** Đúng hình dạng `searchParams` của Next.js sau khi await. */
type RawSearchParams = Record<string, string | string[] | undefined>;

/** Kích thước trang. Nguồn DUY NHẤT: trang, phân trang và test đều đọc hằng này. */
export const PAGE_SIZE = 20;

/** Đường dẫn chính tắc của trang danh sách công khai. */
export const LISTING_PATH = '/viec-lam';

/** Next.js cho một khoá xuất hiện nhiều lần; hợp đồng chọn phần tử đầu. */
function firstValue(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw.length > 0 ? raw[0] : undefined;
  return raw;
}

/**
 * Chuỗi rỗng, hoặc chuỗi chỉ có khoảng trắng, xử như VẮNG MẶT — đó là hình dạng của `?area=` khi
 * form GET submit lúc người dùng chưa chọn gì. Giữ chuỗi rỗng lại thì `listingIsIndexable` tắt
 * index trên một URL vốn sạch. Giá trị được giữ NGUYÊN VĂN khi có nội dung: giá trị của select
 * vùng và select ca đến từ `facets` của DB, không phải do người dùng gõ, nên không cắt gọt.
 */
function presentValue(raw: string | string[] | undefined): string | undefined {
  const value = firstValue(raw);
  if (value === undefined) return undefined;
  return value.trim() === '' ? undefined : value;
}

/** Bội của `PAGE_SIZE`, không âm. Mọi rác đều thành 0. */
function cleanOffset(raw: string | string[] | undefined): number {
  const value = firstValue(raw);
  if (value === undefined) return 0;
  const trimmed = value.trim();
  // Chỉ nhận chuỗi số nguyên thuần: `Number('4e1')` ra 40 và `Number(' ')` ra 0, cả hai đều là
  // đường im lặng biến rác thành một trang có thật.
  if (!/^-?\d+$/.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed / PAGE_SIZE) * PAGE_SIZE;
}

/**
 * Bộ bốn trường đã làm sạch. Bốn khoá LUÔN có mặt kể cả khi giá trị là `undefined`, để phía gọi
 * đọc được `params.q` mà không phải kiểm tồn tại, và để test đếm được bề mặt bằng `Object.keys`.
 */
export function parseListingSearchParams(raw: RawSearchParams): {
  q: string | undefined;
  area: string | undefined;
  shift: string | undefined;
  offset: number;
} {
  const q = presentValue(raw.q);
  return {
    q: q === undefined ? undefined : q.trim(),
    area: presentValue(raw.area),
    shift: presentValue(raw.shift),
    offset: cleanOffset(raw.offset),
  };
}

/** Kiểu cục bộ, KHÔNG export: mục 4.4 chốt bề mặt của module này là đúng năm thứ. */
type ListingParams = ReturnType<typeof parseListingSearchParams>;

/**
 * Đường tương đối cho mọi liên kết của trang: hai nút phân trang, liên kết xoá lọc, và canonical.
 * `offsetOverride` là cách hai nút Trước/Sau đổi trang mà giữ nguyên bộ lọc — phía gọi truyền
 * `params.offset ± PAGE_SIZE`, không tự ghép chuỗi.
 */
export function buildListingHref(params: ListingParams, offsetOverride?: number): string {
  const offset = offsetOverride ?? params.offset;
  const search = new URLSearchParams();
  // Thứ tự ghi là hợp đồng: cùng một trạng thái lọc phải cho cùng một chuỗi, ở mọi chỗ gọi.
  if (params.q) search.set('q', params.q);
  if (params.area) search.set('area', params.area);
  if (params.shift) search.set('shift', params.shift);
  if (offset > 0) search.set('offset', String(offset));
  const query = search.toString();
  return query === '' ? LISTING_PATH : `${LISTING_PATH}?${query}`;
}

/**
 * `DEC-08`: chỉ URL sạch được index. Mọi tổ hợp lọc và mọi trang từ hai trở đi là nội dung dẫn
 * xuất, nên `robots` phải `noindex` để chúng không cạnh tranh với chính `/viec-lam`.
 */
export function listingIsIndexable(params: ListingParams): boolean {
  return (
    params.q === undefined &&
    params.area === undefined &&
    params.shift === undefined &&
    params.offset === 0
  );
}
