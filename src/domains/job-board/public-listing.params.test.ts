/**
 * public-listing.params.test.ts — go-live-20 / RQ-02, RQ-03, RQ-05, RQ-06 / STEP-01.
 *
 * Test này viết TRƯỚC module (`STEP-01` đòi một cửa sổ ĐỎ có bản ghi rồi mới tới XANH), nên lần
 * chạy đầu tiên FAIL ở tầng import: `public-listing.params.ts` chưa tồn tại. Đó là kết quả MONG
 * ĐỢI của lượt một và được lưu ở `evidence/ac03-params-red.txt`.
 *
 * VÌ SAO bốn tham số phải có một module riêng, thuần, không chạm Next.js: cả `AC-03`, `AC-04`,
 * `AC-06` và `AC-07` đều là mệnh đề về CHUỖI URL và về giá trị đã làm sạch. Nếu logic ấy nằm trong
 * thân `page.tsx` thì cách duy nhất để đo là render một Server Component — tức mock `searchParams`,
 * mock rate-limit, mock DB — và một bài test như thế xanh cả khi hàm ghép URL sai, đúng lớp lỗi mà
 * `hrp-golive05` đã ghi. Tách ra thì bốn AC đo được bằng phép gọi hàm trần, không mock gì.
 *
 * Ranh giới của module (đọc từ mục 4.4 cộng `RQ-02`): parser KẸP `offset` về 0 khi âm hoặc không
 * phải số, và KÉO XUỐNG bội gần nhất khi không chia hết `PAGE_SIZE` — hai xử lý khác nhau, vì
 * `RQ-02` chỉ liệt kê ba ca reset-về-0 là âm, không-phải-số, và vượt `total`. Ca "vượt `total`"
 * KHÔNG đo được ở đây vì parser không biết `total`; nó là việc của trang sau khi truy vấn xong, và
 * `AC-06` đo nó qua ba mốc `offset` chứ không qua parser.
 */
import { describe, it, expect } from 'vitest';
import * as listingParamsModule from './public-listing.params';
import {
  PAGE_SIZE,
  LISTING_PATH,
  parseListingSearchParams,
  buildListingHref,
  listingIsIndexable,
} from './public-listing.params';

/** Bốn tên tham số mà `RQ-03` cấm phát ra, kể cả khi người dùng tự gõ vào URL. */
const BANNED_PARAMS = ['salary', 'limit', 'shiftType', 'jobType'] as const;

describe('mục 4.4 — hai hằng số là nguồn duy nhất', () => {
  it('PAGE_SIZE bằng 20 và LISTING_PATH bằng /viec-lam', () => {
    expect(PAGE_SIZE).toBe(20);
    expect(LISTING_PATH).toBe('/viec-lam');
  });
});

describe('RQ-02/AC-03 — parseListingSearchParams làm sạch bốn trường', () => {
  it('searchParams rỗng cho bộ mặc định: ba trường vắng, offset 0', () => {
    const params = parseListingSearchParams({});
    expect(params).toEqual({ q: undefined, area: undefined, shift: undefined, offset: 0 });
  });

  it('q chỉ có khoảng trắng thì bị bỏ, q có khoảng trắng hai đầu thì bị cắt', () => {
    expect(parseListingSearchParams({ q: '   ' }).q).toBeUndefined();
    expect(parseListingSearchParams({ q: '\t\n ' }).q).toBeUndefined();
    expect(parseListingSearchParams({ q: '  bao ve  ' }).q).toBe('bao ve');
  });

  it('area và shift giữ nguyên chuỗi khi có mặt, và bị bỏ khi rỗng', () => {
    const params = parseListingSearchParams({ area: 'Ha Noi', shift: 'Ca dem' });
    expect(params.area).toBe('Ha Noi');
    expect(params.shift).toBe('Ca dem');
    // `?area=` từ một form GET vừa submit khi người dùng chưa chọn gì: coi như vắng mặt, cùng
    // luật với `q`. Nếu giữ chuỗi rỗng thì `listingIsIndexable` tắt index trên một URL vốn SẠCH.
    expect(parseListingSearchParams({ area: '', shift: '' })).toEqual({
      q: undefined,
      area: undefined,
      shift: undefined,
      offset: 0,
    });
    expect(parseListingSearchParams({ area: '   ' }).area).toBeUndefined();
    expect(parseListingSearchParams({ shift: '  \t ' }).shift).toBeUndefined();
  });

  it('offset âm bị kẹp về 0', () => {
    expect(parseListingSearchParams({ offset: '-40' }).offset).toBe(0);
    expect(parseListingSearchParams({ offset: '-1' }).offset).toBe(0);
  });

  it('offset không phải số bị kẹp về 0', () => {
    for (const raw of ['abc', '', ' ', '4e1x', 'NaN', 'Infinity', '1.5.2']) {
      expect(parseListingSearchParams({ offset: raw }).offset, raw).toBe(0);
    }
  });

  it('offset không chia hết PAGE_SIZE bị kéo xuống bội gần nhất, không reset về 0', () => {
    expect(parseListingSearchParams({ offset: '25' }).offset).toBe(20);
    expect(parseListingSearchParams({ offset: '19' }).offset).toBe(0);
    expect(parseListingSearchParams({ offset: '41' }).offset).toBe(40);
    // Bội đúng thì đi qua nguyên vẹn.
    expect(parseListingSearchParams({ offset: '40' }).offset).toBe(40);
    // Và mọi giá trị trả ra đều là bội của PAGE_SIZE.
    for (const raw of ['0', '7', '20', '25', '99', '100', '-8']) {
      expect(parseListingSearchParams({ offset: raw }).offset % PAGE_SIZE, raw).toBe(0);
    }
  });

  it('giá trị dạng mảng lấy phần tử đầu', () => {
    const params = parseListingSearchParams({
      q: ['bao ve', 'khac'],
      area: ['Ha Noi', 'Da Nang'],
      shift: ['Ca dem', 'Ca ngay'],
      offset: ['40', '80'],
    });
    expect(params).toEqual({ q: 'bao ve', area: 'Ha Noi', shift: 'Ca dem', offset: 40 });
  });

  it('mảng rỗng xử như vắng mặt', () => {
    const params = parseListingSearchParams({ q: [], area: [], shift: [], offset: [] });
    expect(params).toEqual({ q: undefined, area: undefined, shift: undefined, offset: 0 });
  });
});

describe('RQ-03/AC-04 — mọi khoá ngoài bốn tên bị bỏ qua trong im lặng', () => {
  it('parse trả về ĐÚNG bốn khoá, không mang theo khoá lạ nào', () => {
    const params = parseListingSearchParams({
      q: 'bao ve',
      salary: '10000000',
      limit: '999',
      shiftType: 'dem',
      jobType: 'thoi_vu',
      industry: 'nha_hang',
      page: '3',
    });
    expect(Object.keys(params).sort()).toEqual(['area', 'offset', 'q', 'shift']);
    expect(params.q).toBe('bao ve');
  });

  it('buildListingHref không bao giờ phát ra bốn tên bị cấm, kể cả khi input mang chúng', () => {
    // Cast có chủ ý: kiểu của hàm đã cấm bốn khoá này, nên ca duy nhất còn lại là một object
    // thừa khoá đến từ runtime — đúng thứ xảy ra khi người dùng tự gõ tham số vào URL.
    const polluted = {
      q: 'bao ve',
      area: 'Ha Noi',
      shift: 'Ca dem',
      offset: 40,
      salary: '10000000',
      limit: '999',
      shiftType: 'dem',
      jobType: 'thoi_vu',
    } as unknown as Parameters<typeof buildListingHref>[0];

    const href = buildListingHref(polluted);
    for (const name of BANNED_PARAMS) {
      expect(href, name).not.toContain(name);
    }
    expect(href).toContain('q=');
    expect(href).toContain('area=');
    expect(href).toContain('shift=');
  });

  it('href luôn bắt đầu bằng LISTING_PATH, không phải URL tuyệt đối', () => {
    expect(buildListingHref(parseListingSearchParams({}))).toBe(LISTING_PATH);
    expect(buildListingHref(parseListingSearchParams({ q: 'a' }))).toMatch(/^\/viec-lam\?/);
    expect(buildListingHref(parseListingSearchParams({ q: 'a' }))).not.toMatch(/^https?:/);
  });
});

describe('RQ-06/AC-07 — trang một của một bộ lọc là ĐÚNG MỘT URL', () => {
  it('offset bằng 0 thì tên tham số offset không xuất hiện', () => {
    const clean = parseListingSearchParams({});
    expect(buildListingHref(clean)).toBe(LISTING_PATH);
    expect(buildListingHref(clean)).not.toContain('offset');

    const filtered = parseListingSearchParams({ q: 'bao ve', area: 'Ha Noi' });
    expect(buildListingHref(filtered)).not.toContain('offset');
  });

  it('offset ghi đè bằng 0 cũng không ghi tham số, dù params đang ở trang khác', () => {
    const page3 = parseListingSearchParams({ q: 'bao ve', offset: '40' });
    expect(page3.offset).toBe(40);
    expect(buildListingHref(page3)).toContain('offset=40');
    expect(buildListingHref(page3, 0)).not.toContain('offset');
    // Và về đúng cùng một chuỗi với trang một sinh từ chính bộ lọc đó.
    expect(buildListingHref(page3, 0)).toBe(buildListingHref(parseListingSearchParams({ q: 'bao ve' })));
  });

  it('chỉ ghi tham số có giá trị: bộ lọc vắng thì không có khoá rỗng nào', () => {
    const href = buildListingHref(parseListingSearchParams({ area: 'Ha Noi' }));
    expect(href).toBe('/viec-lam?area=Ha+Noi');
    expect(href).not.toContain('q=');
    expect(href).not.toContain('shift=');
  });
});

describe('RQ-05/AC-06 — phân trang giữ nguyên bộ lọc ở ba mốc offset', () => {
  /** Một bộ lọc đang bật cả ba trường, để mất một tham số là thấy ngay trên chuỗi. */
  const filters = { q: 'bao ve', area: 'Ha Noi', shift: 'Ca dem' };
  const TOTAL = 100;
  const LAST_OFFSET = 80;

  it('mốc đầu, offset 0: link Sau mang đủ ba bộ lọc và offset 20', () => {
    const params = parseListingSearchParams(filters);
    expect(params.offset).toBe(0);
    const next = buildListingHref(params, params.offset + PAGE_SIZE);
    expect(next).toBe('/viec-lam?q=bao+ve&area=Ha+Noi&shift=Ca+dem&offset=20');
  });

  it('mốc giữa, offset 40: cả Trước và Sau giữ đủ ba bộ lọc', () => {
    const params = parseListingSearchParams({ ...filters, offset: '40' });
    expect(buildListingHref(params, params.offset - PAGE_SIZE)).toBe(
      '/viec-lam?q=bao+ve&area=Ha+Noi&shift=Ca+dem&offset=20',
    );
    expect(buildListingHref(params, params.offset + PAGE_SIZE)).toBe(
      '/viec-lam?q=bao+ve&area=Ha+Noi&shift=Ca+dem&offset=60',
    );
  });

  it('mốc cuối, offset 80 trên total 100: Trước về 60, và không còn trang sau', () => {
    const params = parseListingSearchParams({ ...filters, offset: String(LAST_OFFSET) });
    expect(buildListingHref(params, params.offset - PAGE_SIZE)).toBe(
      '/viec-lam?q=bao+ve&area=Ha+Noi&shift=Ca+dem&offset=60',
    );
    // Mệnh đề "trang cuối không có link Sau" là mệnh đề về TRANG, không về hàm ghép URL: nó được
    // hàng rào tĩnh của `STEP-07` canh. Ở đây chỉ ghim phần hàm này chịu trách nhiệm — số học mốc
    // cuối theo đúng `PAGE_SIZE` và `total`, tức bội cuối cùng nhỏ hơn `total`.
    expect(LAST_OFFSET + PAGE_SIZE).toBeGreaterThanOrEqual(TOTAL);
    expect(LAST_OFFSET % PAGE_SIZE).toBe(0);
  });

  it('sang trang rồi quay lại trang một thì URL trùng khít URL của chính bộ lọc đó', () => {
    const page1 = parseListingSearchParams(filters);
    const page5 = parseListingSearchParams({ ...filters, offset: '80' });
    expect(buildListingHref(page5, 0)).toBe(buildListingHref(page1));
  });
});

describe('DEC-08 — listingIsIndexable chỉ true khi cả bốn trường ở mặc định', () => {
  it('URL sạch thì cho index', () => {
    expect(listingIsIndexable(parseListingSearchParams({}))).toBe(true);
    // Tham số lạ bị parser loại nên URL mang chúng vẫn là URL sạch.
    expect(listingIsIndexable(parseListingSearchParams({ salary: '1', jobType: 'thoi_vu' }))).toBe(true);
  });

  it('mỗi một trường rời mặc định là đủ để tắt index', () => {
    expect(listingIsIndexable(parseListingSearchParams({ q: 'bao ve' }))).toBe(false);
    expect(listingIsIndexable(parseListingSearchParams({ area: 'Ha Noi' }))).toBe(false);
    expect(listingIsIndexable(parseListingSearchParams({ shift: 'Ca dem' }))).toBe(false);
    expect(listingIsIndexable(parseListingSearchParams({ offset: '20' }))).toBe(false);
  });

  it('tham số rác bị kẹp về mặc định thì KHÔNG tắt index, vì URL sạch', () => {
    // `offset=-40` và `offset=abc` đều thành 0, và một trang đã sạch thì cho index; nếu không,
    // một liên kết rác từ bên ngoài sẽ tự tay tắt index của chính `/viec-lam`.
    expect(listingIsIndexable(parseListingSearchParams({ offset: '-40' }))).toBe(true);
    expect(listingIsIndexable(parseListingSearchParams({ offset: 'abc' }))).toBe(true);
    // Nhưng `q` chỉ có khoảng trắng cũng vậy: bị bỏ nên URL vẫn sạch.
    expect(listingIsIndexable(parseListingSearchParams({ q: '   ' }))).toBe(true);
    expect(listingIsIndexable(parseListingSearchParams({ area: '', shift: '' }))).toBe(true);
  });
});

describe('mục 4.4 — bề mặt export đúng NĂM thứ, không hơn', () => {
  it('module export đúng năm tên đã ghi trong hợp đồng', () => {
    // Đo bằng chính bề mặt runtime của module, không bằng grep chuỗi `export` trên nguồn: một
    // `export type` không sinh giá trị runtime nên grep sẽ đếm lệch, còn `Object.keys` trên
    // namespace thì đếm đúng thứ hợp đồng gọi là "thứ được export".
    expect(Object.keys(listingParamsModule).sort()).toEqual([
      'LISTING_PATH',
      'PAGE_SIZE',
      'buildListingHref',
      'listingIsIndexable',
      'parseListingSearchParams',
    ]);
  });
});
