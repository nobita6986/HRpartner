/**
 * tracking-pii-containment.static.test.ts — hrp-v5-go-live-18 / RQ-11, RQ-12 / DEC-10..DEC-13.
 *
 * Quy ước "đường tra cứu công khai không để giá trị THÔ ra khỏi service" trước task này đúng nhờ
 * hai lệnh gọi che viết tay, không nhờ một phép kiểm nào (`EV-12`..`EV-14`). Tệp này biến nó thành
 * ba mệnh đề ĐẾM ĐƯỢC của `DEC-11`:
 *   1. tập tệp không phải test tham chiếu hàm SQL tra cứu có đúng `1` phần tử;
 *   2. trong tệp đó, mỗi khoá thô xuất hiện đúng `1` lần và lần ấy nằm TRONG hàm che tương ứng;
 *   3. thân `PublicTrackingDto` không có khoá nào khớp `phone` hay `cccd` ngoài hai khoá đã che.
 *
 * Mệnh đề ba chặn đúng lớp mà `tsc` mù: consumer trong repo này tự khai interface cục bộ rồi cast
 * `res.json()`, nên thêm một khoá thô vào DTO vẫn typecheck sạch.
 *
 * `DEC-10`: tệp này KHÔNG nhập vào `marketplace-inventory.static.test.ts` — tệp kia canh những gì
 * trang IN RA, tệp này canh những gì service ĐỌC RA. Walker dưới đây trùng với walker của hàng rào
 * limiter là CÓ Ý: `4.2` của contract chỉ mở đúng hai tệp mới, không mở một module helper thứ ba.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Hàm SQL `SECURITY DEFINER` là cửa duy nhất của đường tra cứu công khai. */
const SQL_FUNCTION = 'hrp_public_tracking_profile';

const DTO_NAME = 'PublicTrackingDto';

/**
 * Neo vào khoá THÔ của hàng SQL, KHÔNG neo vào chuỗi `phone` trần (`DEC-12`): `normalizedPhone`
 * tồn tại thật ở đường nộp hồ sơ trong cùng tệp (`EV-14`), nên một assertion rộng sẽ ĐỎ trên mã
 * ĐÚNG — và đó là cách nhanh nhất để ai đó tắt hàng rào đi.
 */
const RAW_FIELDS = [
  { raw: 'row.phone', masker: 'maskPhone' },
  { raw: 'row.cccd_number', masker: 'maskCccd' },
] as const;

const SCAN_ROOTS = ['src', 'app'] as const;

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

/** Hai sàn chống rỗng: walker hỏng hoặc parse DTO hỏng thì KHÔNG được phép xanh. */
const MIN_SCANNED_FILES = 150;
const MIN_DTO_KEYS = 8;

interface SourceEntry {
  readonly path: string;
  readonly source: string;
}

function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path) || path.includes('/__tests__/');
}

/** Quét đệ quy `src/` và `app/`, trả đường dẫn dùng `/` để assertion không phụ thuộc HĐH. */
function collectSources(roots: readonly string[]): SourceEntry[] {
  const out: SourceEntry[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(rel);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || isTestFile(rel)) continue;
      out.push({ path: rel, source: readFileSync(join(process.cwd(), rel), 'utf8') });
    }
  };

  for (const root of roots) walk(root);
  return out;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function escapeRe(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOf(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

/** Số lần một khoá thô được dùng, và số lần nó được dùng NGAY TRONG hàm che của nó. */
function usageOf(source: string, field: (typeof RAW_FIELDS)[number]): { uses: number; wrapped: number } {
  const code = stripComments(source);
  const raw = escapeRe(field.raw);
  return {
    uses: countOf(code, new RegExp(`${raw}\\b`, 'g')),
    wrapped: countOf(code, new RegExp(`${escapeRe(field.masker)}\\(\\s*${raw}\\b`, 'g')),
  };
}

/**
 * DETECTOR — đúng hàm mà fixture âm của `RQ-12` bắn thẳng vào. Một khoá thô được dùng NHIỀU hơn số
 * lần nó được bọc nghĩa là có ít nhất một lần dùng TRẦN. Nhận nguồn qua tham số nên cùng MỘT logic
 * chấm cả tệp thật lẫn chuỗi giả: không có bản thứ hai để lệch nhau.
 */
function rawPiiEscapes(source: string): string[] {
  return RAW_FIELDS.filter((field) => {
    const { uses, wrapped } = usageOf(source, field);
    return uses > wrapped;
  }).map((field) => field.raw);
}

/** Khoá của một interface, suy từ chính nguồn — không có danh sách khoá nào bị dán tay. */
function dtoKeys(source: string, name: string): string[] {
  const code = stripComments(source);
  const start = code.indexOf(`interface ${name} {`);
  if (start < 0) return [];
  const open = code.indexOf('{', start);
  const close = code.indexOf('\n}', open);
  if (close < 0) return [];
  return code
    .slice(open + 1, close)
    .split('\n')
    .map((line) => /^\s*(?:readonly\s+)?([A-Za-z0-9_]+)\??\s*:/.exec(line)?.[1])
    .filter((key): key is string => Boolean(key));
}

describe('đường tra cứu công khai: giá trị PII thô không ra khỏi service', () => {
  const scanned = collectSources(SCAN_ROOTS);
  const readers = scanned.filter((entry) => entry.source.includes(SQL_FUNCTION));

  it('quét được cả hai cây, không phải một tập rỗng', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES);
    for (const root of SCAN_ROOTS) {
      expect(scanned.some((entry) => entry.path.startsWith(`${root}/`))).toBe(true);
    }
  });

  it('mệnh đề MỘT: đúng một tệp không phải test gọi hàm SQL tra cứu (EV-11)', () => {
    expect(readers.map((entry) => entry.path)).toHaveLength(1);
    // Literal này chỉ ĐỐI CHIẾU kết quả quét, không thay cho phép quét (`AC-17`).
    expect(readers[0]?.path).toBe('src/domains/applications/application.service.ts');
  });

  it('mệnh đề HAI: mỗi khoá thô dùng đúng 1 lần và lần ấy nằm trong hàm che (EV-12, EV-13)', () => {
    const source = readers[0]?.source ?? '';
    expect(source).not.toBe('');
    for (const field of RAW_FIELDS) {
      const { uses, wrapped } = usageOf(source, field);
      expect({ field: field.raw, uses, wrapped }).toEqual({ field: field.raw, uses: 1, wrapped: 1 });
    }
    expect(rawPiiEscapes(source)).toEqual([]);
  });

  it('mệnh đề BA: thân DTO công khai không có khoá thô nào (EV-13)', () => {
    const keys = dtoKeys(readers[0]?.source ?? '', DTO_NAME);
    expect(keys.length).toBeGreaterThanOrEqual(MIN_DTO_KEYS);
    expect(keys).toContain('phoneMasked');
    expect(keys).toContain('cccdMasked');
    const leaking = keys.filter((key) => /phone|cccd/i.test(key) && !/Masked$/.test(key));
    expect(leaking).toEqual([]);
  });
});

/**
 * FIXTURE ÂM (`RQ-12`, `DEC-13`). Không có khối này thì một detector luôn trả rỗng cũng xanh. Mọi
 * chuỗi dưới đây là nguồn BỊA, không phải một dòng nào của mã thật.
 */
describe('fixture âm: detector phải BẮT một lần dùng khoá thô TRẦN', () => {
  const wrapped = 'phoneMasked: maskPhone(row.phone),\n  cccdMasked: maskCccd(row.cccd_number),';

  it('bắt được nguồn giả dùng row.phone trần', () => {
    expect(rawPiiEscapes('return { phone: row.phone };')).toEqual(['row.phone']);
  });

  it('bắt được nguồn giả dùng row.cccd_number trần', () => {
    expect(rawPiiEscapes('return { cccd: row.cccd_number };')).toEqual(['row.cccd_number']);
  });

  it('không bắt oan nguồn giả đã bọc cả hai khoá', () => {
    expect(rawPiiEscapes(wrapped)).toEqual([]);
  });

  it('bắt được hồi quy THẬT: một dòng thô thêm vào BÊN CẠNH dòng đã bọc', () => {
    expect(rawPiiEscapes(`${wrapped}\n  debugPhone: row.phone,`)).toEqual(['row.phone']);
  });

  it('KHÔNG đỏ trên đường nộp hồ sơ: normalizedPhone không phải khoá thô của hàng SQL (DEC-12)', () => {
    const applyPath = 'const normalizedPhone = normalizePhone(input.phone);\nphone: normalizedPhone,';
    expect(rawPiiEscapes(`${wrapped}\n${applyPath}`)).toEqual([]);
  });

  it('một cái tên khoá thô chỉ nằm trong comment thì không bị tính là lần dùng', () => {
    expect(rawPiiEscapes(`// row.phone không bao giờ được in trần\n${wrapped}`)).toEqual([]);
  });

  it('parse DTO trả rỗng khi không tìm thấy interface, nên sàn khoá là hàng rào thật', () => {
    expect(dtoKeys('export interface Other { a: string; }', DTO_NAME)).toEqual([]);
  });
});
