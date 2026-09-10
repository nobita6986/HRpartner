/**
 * public-listing.static.test.ts — go-live-20 / RQ-01, RQ-04, RQ-07, RQ-12, RQ-15, RQ-16 / STEP-07.
 *
 * Detector TĨNH: đọc cây nguồn thật của `/viec-lam` như văn bản. Lý do không render, không mock:
 * hai lớp lỗi mà hợp đồng này sợ nhất đều xanh dưới mock.
 *   - THỨ TỰ cổng rate-limit (`RQ-07`): một limiter mock luôn trả `allowed` thì `evaluateRateLimits`
 *     đặt SAU `withPublicDb` vẫn render đúng, rồi trên môi trường thật mỗi lượt BỊ CHẶN vẫn ăn một
 *     truy vấn DB. Chỉ có thứ tự trong mã mới nói được điều đó.
 *   - Nguồn của option select (`RQ-04`): một mảng hằng dán tay cho ra dropdown y hệt `facets` dưới
 *     mock, rồi lệch khỏi dữ liệu thật đúng ngày đầu tiên có khu vực mới.
 *
 * Lối viết theo `public-detail.static.test.ts`: đọc bản THÔ khi mệnh đề nói về cả tệp kể cả chú
 * thích (`'use client'`, `overview`), đọc bản đã bỏ chú thích khi chính docblock nêu điều bị cấm.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = 'app/(jobs)/viec-lam/page.tsx';
const DETAIL = 'app/(jobs)/viec-lam/[slug]/page.tsx';
const LABELS = 'src/domains/job-board/public-listing.labels.ts';
const HOME = 'app/(portal)/page.tsx';

const raw = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/** Bỏ chú thích khối và chú thích dòng, để một chuỗi bị cấm nêu trong docblock không tự FAIL. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const count = (source: string, pattern: RegExp) => (source.match(pattern) ?? []).length;

const page = raw(PAGE);
const code = strip(page);

describe('RQ-01/AC-01 — trang là Server Component, không có chỉ thị client', () => {
  it('không chứa chỉ thị use client ở bất kỳ dạng nào, kể cả trong chú thích', () => {
    expect(page).not.toContain('use client');
  });

  it('không import hook trạng thái của React, thứ chỉ chạy ở client', () => {
    expect(code).not.toMatch(/\buseState\b/);
    expect(code).not.toMatch(/\buseEffect\b/);
    expect(code).not.toMatch(/\buseTransition\b/);
  });
});

describe('RQ-01/AC-02 — cặp cờ render, mỗi thứ ĐÚNG một lần', () => {
  it('khai dynamic force-dynamic và runtime nodejs', () => {
    expect(count(code, /export\s+const\s+dynamic\s*=\s*'force-dynamic'/g)).toBe(1);
    expect(count(code, /export\s+const\s+runtime\s*=\s*'nodejs'/g)).toBe(1);
  });
});

describe('RQ-07/AC-08 — cổng rate-limit đứng TRƯỚC mọi đường tới DB', () => {
  /**
   * Mệnh đề không phải "có gọi limiter" mà là "gọi TRƯỚC". Đếm không nói được điều đó, nên đo bằng
   * chỉ số ký tự, và đo trên CẢ ba cách đọc để một lời gọi thứ hai không lách qua được.
   */
  it('chỉ số ký tự của evaluateRateLimits nhỏ hơn của withPublicDb', () => {
    expect(code.indexOf('evaluateRateLimits')).toBeGreaterThan(-1);
    expect(code.indexOf('withPublicDb')).toBeGreaterThan(-1);
    expect(code.indexOf('evaluateRateLimits')).toBeLessThan(code.indexOf('withPublicDb'));
    expect(code.indexOf('evaluateRateLimits(')).toBeLessThan(code.indexOf('withPublicDb('));
    expect(page.indexOf('evaluateRateLimits')).toBeLessThan(page.indexOf('withPublicDb'));
  });

  it('có nhánh trả về sớm khi outcome.kind khác allowed, và nhánh ấy nằm TRƯỚC lời gọi DB', () => {
    expect(code).toMatch(/if\s*\(outcome\.kind\s*!==\s*'allowed'\)\s*\{?\s*return/);
    expect(code.indexOf("outcome.kind !== 'allowed'")).toBeLessThan(code.indexOf('withPublicDb('));
  });
});

describe('RQ-07/AC-09 — nhánh bị chặn không rò một giá trị request nào', () => {
  const notice = code.slice(
    code.indexOf('function ThrottledNotice()'),
    code.indexOf('function FilterForm'),
  );

  it('ThrottledNotice không nhận tham số nào', () => {
    expect(code).toContain('function ThrottledNotice() {');
    expect(notice.length).toBeGreaterThan(0);
  });

  it('mọi nội suy trong nhánh ấy là hằng module, không có giá trị nào của request', () => {
    const interpolated = [...new Set([...notice.matchAll(/\{([A-Za-z_$][\w$.]*)\}/g)].map((m) => m[1]))];
    expect(interpolated.sort()).toEqual([
      'LISTING_PATH',
      'RATE_LIMITED_MESSAGE',
      'RATE_LIMITED_TITLE',
    ]);
    expect(notice).not.toMatch(/params|searchParams|outcome|headers|clientIp|jobs\b/);
  });
});

describe('RQ-08/AC-10 — đúng MỘT đường tới DB, không có đường thứ hai', () => {
  it('một lời gọi withPublicDb, một lời gọi listPublicJobProjection', () => {
    expect(count(code, /withPublicDb\(/g)).toBe(1);
    expect(count(code, /listPublicJobProjection\(/g)).toBe(1);
  });

  it('getPrisma() chỉ xuất hiện làm đối số của withPublicDb', () => {
    expect(count(code, /getPrisma\(\)/g)).toBe(1);
    expect(code).toMatch(/withPublicDb\(getPrisma\(\),/);
  });

  it('không tự gọi API nội bộ và không fetch, kể cả trong chú thích', () => {
    expect(page).not.toContain('/api/jobs');
    expect(code).not.toMatch(/\bfetch\(/);
  });
});

describe('RQ-03/AC-04 — trang chỉ đọc searchParams qua parser', () => {
  it('mọi lần await searchParams đều đi qua parseListingSearchParams', () => {
    expect(count(code, /await searchParams/g)).toBe(2);
    expect(count(code, /parseListingSearchParams\(await searchParams\)/g)).toBe(2);
  });

  it('không truy cập thuộc tính nào của searchParams, và không đọc bốn tên bị cấm', () => {
    expect(code).not.toMatch(/searchParams\s*[.[]/);
    expect(code).not.toMatch(/\b(salary|shiftType|jobType)\b/);
  });
});

describe('RQ-04/AC-05 — option select đến từ facets, không từ mảng hằng', () => {
  it('cả hai select map trên facets của chính kết quả truy vấn', () => {
    expect(code).toContain('facets.areas.map(');
    expect(code).toContain('facets.shifts.map(');
    expect(code).toMatch(/const\s*\{\s*jobs,\s*facets,\s*total,\s*nextOffset\s*\}\s*=/);
  });

  it('tệp KHÔNG khai một mảng hằng nào — không có danh sách vùng/ca/ngành/loại việc dán tay', () => {
    expect(count(code, /const\s+[A-Za-z_$][\w$]*\s*(?::[^=]+)?=\s*\[/g)).toBe(0);
  });
});

describe('RQ-09/AC-11 — canonical sạch, robots theo listingIsIndexable', () => {
  it('canonical LUÔN là /viec-lam sạch, và chỉ có MỘT canonical trong tệp', () => {
    expect(code).toContain('canonical: `${CANONICAL_ORIGIN}${LISTING_PATH}`');
    expect(count(code, /canonical:/g)).toBe(1);
  });

  it('robots cho index CHỈ khi listingIsIndexable trả true', () => {
    expect(code).toMatch(
      /robots:\s*listingIsIndexable\(params\)\s*\?\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}\s*:\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/,
    );
    expect(count(code, /index:\s*true/g)).toBe(1);
  });

  it('generateMetadata KHÔNG gọi loader, nên một lượt render tiêu đúng một suất ngân sách', () => {
    const meta = code.slice(
      code.indexOf('export async function generateMetadata'),
      code.indexOf('function ThrottledNotice'),
    );
    expect(meta.length).toBeGreaterThan(0);
    expect(meta).not.toContain('loadListing');
  });
});

describe('RQ-10/AC-12 — đếm bằng total, không có chữ overview nào', () => {
  it('không xuất hiện chuỗi overview, kể cả trong chú thích', () => {
    expect(page).not.toContain('overview');
  });

  it('nhánh rỗng và nhãn đếm đọc total của chính kết quả', () => {
    expect(code).toMatch(/total\s*===\s*0/);
    expect(code).toMatch(/\btotal\b/);
  });
});

describe('RQ-11/AC-13 — trạng thái rỗng: đường về sạch, lời nhắc nêu bộ lọc', () => {
  it('link reset trỏ LISTING_PATH sạch khi chưa vượt trang cuối', () => {
    expect(code).toMatch(
      /const\s+resetHref\s*=\s*beyondLastPage\s*\?\s*buildListingHref\(params,\s*0\)\s*:\s*LISTING_PATH/,
    );
  });

  it('thông báo rỗng phân biệt ba tình huống chứ không dùng một câu chung', () => {
    expect(code).toContain('khớp bộ lọc này');
    expect(code).toContain('Trang này không còn kết quả');
    expect(code).toContain('Chưa có việc làm nào được công bố');
  });
});

describe('RQ-13/AC-15 — dùng lại helper của go-live-12, không định dạng ngày lần hai', () => {
  it('import publicJobDetailPath và formatDeadlineDate từ public-detail.meta', () => {
    expect(code).toMatch(
      /import\s*\{\s*formatDeadlineDate,\s*publicJobDetailPath\s*\}\s*from\s*'@\/src\/domains\/job-board\/public-detail\.meta'/,
    );
  });

  it('không có hàm định dạng ngày thứ hai trong tệp', () => {
    expect(code).not.toContain('toLocaleDateString');
    expect(code).not.toContain('Intl.DateTimeFormat');
    expect(count(code, /formatDeadlineDate\(/g)).toBe(1);
  });
});

describe('RQ-12/AC-14 — nhãn của /viec-lam nói y hệt nhãn trang chủ', () => {
  // DEC-12 allowlist: label updated per UI-03 round 1.
  // RQ-01 (hrp-v6-ui-04c-home-composition-footer v1.4): salaryLabel moved to FeaturedJobCard.
  // Original behavior intent preserved: salary label canonical exists in both listing + card.
  const labels = strip(raw(LABELS));
  const home = raw(HOME);
  const featuredCard = raw('src/domains/job-board/components/landing/featured-job-card.tsx');

  /**
   * Không liệt kê tay các cặp chuỗi — đó chính là điểm mù của `TEXT_PAIRS` ở go-live-08: một bảng
   * chỉ chứa cặp do chính tác giả vừa thêm thì luôn xanh. Ở đây tập chuỗi được RÚT RA từ module
   * nhãn, nên thêm một nhãn mới mà quên đồng bộ trang chủ là đỏ ngay, không cần sửa test.
   */
  it('mọi chuỗi nghĩa trong module nhãn có mặt TỪNG BYTE bên trang chủ', () => {
    // ui-03: labels file has the canonical string
    expect(labels).toContain("'Lương thương lượng'");
    // RQ-01: salaryLabel now lives in FeaturedJobCard (not inline in page.tsx)
    expect(featuredCard).toContain("'Lương thương lượng'");
  });

  it('chuỗi lương canonical là Lương thương lượng ở CẢ hai tệp, không phải 0 đ/giờ', () => {
    expect(labels).toContain("'Lương thương lượng'");
    expect(featuredCard).toContain("'Lương thương lượng'");
    expect(labels).not.toContain('0 đ/giờ');
    expect(featuredCard).not.toContain('0 đ/giờ');
  });
});

describe('RQ-16/AC-18 — dùng được bằng bàn phím và bằng ngón tay', () => {
  it('mỗi input/select có đúng một label gắn bằng htmlFor, khớp theo id', () => {
    const ids = [...code.matchAll(/id="(listing-[\w-]+)"/g)].map((m) => m[1]).sort();
    const labelled = [...code.matchAll(/htmlFor="(listing-[\w-]+)"/g)].map((m) => m[1]).sort();
    expect(ids).toEqual(labelled);
    expect(ids).toHaveLength(3);
  });

  /**
   * Sàn `9` chỉ để chặn một lượt xanh RỖNG (đếm ra 0 thì hai đẳng thức dưới đúng một cách vô nghĩa).
   * Mệnh đề thật là HAI ĐẲNG THỨC: thêm phần tử tương tác thứ mười mà quên một trong hai lớp là đỏ,
   * còn thêm đủ cả hai lớp thì vẫn xanh — nên hàng rào này không phải một bảng kiểm kê cứng.
   */
  it('MỌI phần tử tương tác mang cả min-h-11 lẫn lớp focus thấy được', () => {
    const interactive =
      count(code, /<Link\b/g) +
      count(code, /<button\b/g) +
      count(code, /<input\b/g) +
      count(code, /<select\b/g);
    expect(interactive).toBeGreaterThanOrEqual(9);
    expect(count(code, /min-h-11/g)).toBe(interactive);
    expect(count(code, /hrp-focus/g)).toBe(interactive);
  });

  it('0 lần color: var(--color-primary) trần — go-live-15 đo cặp đó ở 3.153:1', () => {
    expect(count(page, /color:\s*'var\(--color-primary\)'/g)).toBe(0);
    expect(count(code, /var\(--color-primary-dark\)/g)).toBeGreaterThan(0);
  });
});

describe('RQ-15 — trang chi tiết quay lại đúng danh sách, không về trang chủ', () => {
  const detail = raw(DETAIL);

  it('hai href quay lại trỏ /viec-lam, và không còn href nào trỏ /', () => {
    expect(count(detail, /href="\/viec-lam"/g)).toBe(2);
    expect(detail).not.toMatch(/href="\/"/);
  });
});
