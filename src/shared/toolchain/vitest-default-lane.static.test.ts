/**
 * vitest-default-lane.static.test.ts — hrp-v5-rf-06 / RQ-06 / DEC-05.
 *
 * Hàng rào này là GIÁ của `DEC-01`: `npm test` và `npx vitest run` trần trở thành default
 * regression lane AN TOÀN, tương đương unit lane về biên DB. Trước RF-06, `vitest.config.ts` đọc
 * `.env` rồi fallback `process.env.DATABASE_URL`, nên một lượt chạy trần có thể mở kết nối tới
 * database DEV/PROD trong im lặng (RF-05 audit round 1, `AUD-001`), và test component chết với
 * `React is not defined` vì esbuild dùng JSX runtime cổ điển.
 *
 * Bốn tính chất khiến tệp này KHÔNG rơi vào lớp lỗi `TEXT_PAIRS` của `hrp-v5-go-live-08` — một bảng
 * chỉ liệt kê thứ tác giả nó VỪA THÊM thì xanh 100% mà không bảo vệ gì:
 *   1. Mọi phép so sánh chống-lệch lấy giá trị MONG ĐỢI từ `vitest.unit.config.ts` — một tệp RF-06
 *      bị CẤM chạm (`§4.2`). Không có bảng hằng số chép tay nào đóng vai nguồn sự thật ở đây.
 *   2. Danh sách file mở DB được ĐỌC từ `vitest.integration-files.ts` bằng `import` thật, rồi đối
 *      chiếu với mảng `exclude` đã phân tích của default config. Thêm một file integration mới là
 *      hàng rào thấy ngay, không cần sửa tệp này.
 *   3. Có phép ÂM tường minh: `describe('rang cua hang rao')` chạy đúng các bộ trích xuất trên
 *      chuỗi config BỊA có lỗi và đòi chúng BÁO lỗi. Một extractor mù (luôn trả `null`, hay regex
 *      khớp mọi thứ) làm khối ấy đỏ.
 *   4. Có một phép đo RUNTIME: `process.env.DATABASE_URL` lúc chạy phải bằng sentinel bất khả kết
 *      nối. Nó bắt được cả trường hợp văn bản config đúng mà lane vẫn nhận URL thật từ nơi khác.
 *
 * Giới hạn CÓ TÊN: tệp này phân tích config bằng cách đọc VĂN BẢN, không import default export của
 * chúng. Đó là chủ ý — `import` một config sẽ chạy `defineConfig` và không cho thấy `.env` có bị
 * đọc hay không. Cái giá: nếu ai viết lại config theo lối cú pháp khác (tách hằng số ra module
 * khác, hoặc build env bằng vòng lặp) thì các extractor trả `null` và hàng rào ĐỎ nêu đúng tên
 * khoá không trích được — một vết đỏ to tiếng, không phải một điểm mù im lặng.
 *
 * Nó không gọi ra ngoài process: không `execSync`, không `git`. Nó không mở kết nối DB nào.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { INTEGRATION_TEST_FILES } from '../../../vitest.integration-files';

/** Ba glob mà `RQ-05` gọi TÊN. Đây là mặt chữ của contract, không phải nguồn sự thật chống lệch. */
const RQ05_INCLUDE_GLOBS = ['src/**/*.test.ts', 'packages/**/*.test.ts', 'prisma/**/*.test.ts'];

/**
 * Dấu hiệu của một đường chạm DB ngoài ý muốn trong default config (`RQ-02`). Mỗi mẫu là một cách
 * đã THẤY hoặc dễ thấy để một URL thật lọt vào lane: đọc `.env` từ đĩa, mượn biến môi trường sẵn
 * có, hay nạp bằng helper của Vite.
 */
const FORBIDDEN_DB_SOURCE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['ambient DATABASE_URL', /process\.env\.DATABASE_URL/],
  ['doc tep tu dia', /readFileSync|readFile\(|node:fs|from 'fs'|require\(/],
  ['tep .env', /'\.env'|"\.env"|\.env['"]|dotenv/],
  ['loadEnv cua Vite', /loadEnv/],
];

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');

/**
 * Sàn chống-đọc-nhầm-gốc. Một đường dẫn gốc sai làm `readFileSync` throw, nhưng một gốc ĐÚNG-MỘT-NỬA
 * (ví dụ về sau ai di chuyển tệp này) có thể đọc được tệp cùng tên ở nơi khác. Ba tệp dưới đây phải
 * cùng tồn tại tại gốc suy ra, kèm `package.json`, trước khi bất kỳ phép đo nào có nghĩa.
 */
const CONFIG_FILES = {
  default: 'vitest.config.ts',
  unit: 'vitest.unit.config.ts',
  inventory: 'vitest.integration-files.ts',
} as const;

function readAtRoot(relative: string): string {
  const absolute = join(REPO_ROOT, relative);
  if (!existsSync(absolute)) {
    throw new Error(
      `Khong thay ${relative} tai goc suy ra ${REPO_ROOT}. Hang ro nay doc VAN BAN config, ` +
        'nen mot goc sai lam moi phep do vo nghia. Sua REPO_ROOT truoc.',
    );
  }
  return readFileSync(absolute, 'utf8');
}

/* ------------------------------------------------------------------------------------------------
 * Bộ trích xuất. Mỗi hàm nhận VĂN BẢN config và trả về giá trị đã phân tích, hoặc `null` khi không
 * trích được. `null` luôn dẫn tới một assertion đỏ ở dưới — không hàm nào âm thầm trả mặc định.
 * Chúng được dùng cho CẢ default config, unit config, và cho chuỗi BỊA ở khối phép âm.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Vị trí ký tự MỞ của một khối `<key>: <open>`, tìm bằng cách QUÉT KÝ TỰ chứ không bằng `RegExp`.
 * Lý do rất thực, và chính vòng chạy đầu của `STEP-03` đã trả giá: một mẫu dựng bằng `new RegExp`
 * từ template literal đòi backslash KÉP, và mất một bậc backslash thì mẫu vẫn HỢP LỆ nhưng khớp
 * thứ KHÁC — `excludes*:s*[` thay cho `exclude\s*:\s*\[`. Đúng loại điểm mù im lặng mà hàng
 * rào này tồn tại để chặn, nên nó không được dùng chính cơ chế ấy: quét ký tự không có bậc escape
 * nào để mất.
 */
const WORD_CHARS = /[A-Za-z0-9_$]/;

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n';
}

function findOpenerIndex(source: string, key: string, open: '{' | '['): number {
  let from = 0;
  for (;;) {
    const at = source.indexOf(key, from);
    if (at < 0) return -1;
    from = at + key.length;
    // Chặn khớp giữa một danh từ dài hơn: `exclude` không được khớp bên trong `myExclude`.
    const before = at === 0 ? '' : source[at - 1];
    if (before !== '' && WORD_CHARS.test(before)) continue;
    let i = from;
    while (i < source.length && isSpace(source[i])) i += 1;
    if (source[i] !== ':') continue;
    i += 1;
    while (i < source.length && isSpace(source[i])) i += 1;
    // Không phải ký tự mở mong đợi thì đây chỉ là một lần NHẮC tên khoá, ví dụ trong doc comment:
    // bỏ qua và tìm tiếp, chứ không kết luận là "không có".
    if (source[i] !== open) continue;
    return i;
  }
}

/** Thân của khối, cắt bằng cách ĐẾM ngoặc — `poolOptions` có ngoặc lồng nên regex tham lam sai chỗ. */
function sliceBalanced(source: string, key: string, open: '{' | '['): string | null {
  const start = findOpenerIndex(source, key, open);
  if (start < 0) return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return null;
}

function sliceBlock(source: string, key: string): string | null {
  return sliceBalanced(source, key, '{');
}

function sliceArray(source: string, key: string): string | null {
  return sliceBalanced(source, key, '[');
}

/** `RQ-01`: cặp `jsx` / `jsxImportSource` của khối `esbuild`. */
function extractJsxRuntime(source: string): { jsx: string; jsxImportSource: string } | null {
  const body = sliceBlock(source, 'esbuild');
  if (!body) return null;
  const jsx = /jsx\s*:\s*'([^']*)'/.exec(body);
  const importSource = /jsxImportSource\s*:\s*'([^']*)'/.exec(body);
  if (!jsx || !importSource) return null;
  return { jsx: jsx[1], jsxImportSource: importSource[1] };
}

/** `RQ-02`: chuỗi sentinel khai bằng `const BLOCKED_DB_URL`. */
function extractSentinel(source: string): string | null {
  const match = /const\s+BLOCKED_DB_URL\s*=\s*'([^']*)'/.exec(source);
  return match ? match[1] : null;
}

/** `RQ-02`, `RQ-03`: từng cặp khoá/giá trị NGUYÊN VĂN trong khối `env`. */
function extractEnvEntries(source: string): Map<string, string> | null {
  const body = sliceBlock(source, 'env');
  if (!body) return null;
  const entries = new Map<string, string>();
  for (const line of body.split('\n')) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*:\s*(.+?),?\s*$/.exec(line);
    if (match) entries.set(match[1], match[2].trim());
  }
  return entries.size > 0 ? entries : null;
}

/** Khoá được BLANK, tức giá trị đúng là chuỗi rỗng viết trực tiếp. */
function blankedKeys(entries: Map<string, string>): Set<string> {
  const blanks = new Set<string>();
  for (const [key, value] of entries) {
    if (value === "''" || value === '""') blanks.add(key);
  }
  return blanks;
}

/** `RQ-05`: các glob trong `include`. */
function extractStringLiterals(arrayBody: string): string[] {
  return [...arrayBody.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function extractInclude(source: string): string[] | null {
  const body = sliceArray(source, 'include');
  if (!body) return null;
  const globs = extractStringLiterals(body);
  return globs.length > 0 ? globs : null;
}

/**
 * `RQ-04`: hình dạng của `exclude`. Ba con số, mỗi con số trả lời một câu khác nhau:
 *   - `spreadsDefaults` / `spreadsInventory`: có DÙNG hai nguồn dùng chung hay không
 *   - `hardcodedTestFiles`: có CHÉP TAY đường dẫn test nào vào mảng hay không (`DEC-04` cấm)
 */
function analyseExclude(source: string): {
  found: boolean;
  spreadsDefaults: boolean;
  spreadsInventory: boolean;
  hardcodedTestFiles: string[];
} {
  const body = sliceArray(source, 'exclude');
  if (body === null) {
    return { found: false, spreadsDefaults: false, spreadsInventory: false, hardcodedTestFiles: [] };
  }
  return {
    found: true,
    spreadsDefaults: /\.\.\.\s*configDefaults\.exclude/.test(body),
    spreadsInventory: /\.\.\.\s*INTEGRATION_TEST_FILES/.test(body),
    hardcodedTestFiles: extractStringLiterals(body).filter((literal) => literal.includes('.test.ts')),
  };
}

/** `RQ-04`: default config phải IMPORT inventory dùng chung, không tự khai lại danh sách. */
function importsInventory(source: string): boolean {
  return /import\s*\{[^}]*INTEGRATION_TEST_FILES[^}]*\}\s*from\s*'\.\/vitest\.integration-files'/.test(source);
}

/** `RQ-02`: mọi cách một URL thật có thể lọt vào lane. Trả về TÊN từng mẫu khớp, không chỉ đếm. */
function forbiddenDbSources(source: string): string[] {
  return FORBIDDEN_DB_SOURCE_PATTERNS.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

function difference(left: Iterable<string>, right: Iterable<string>): string[] {
  const rightSet = new Set(right);
  return sorted([...left].filter((value) => !rightSet.has(value)));
}

/* ------------------------------------------------------------------------------------------------
 * Nguồn đọc một lần. `unitSource` là giá trị MONG ĐỢI của mọi phép chống-lệch: RF-06 bị cấm chạm
 * `vitest.unit.config.ts`, nên không thể làm hàng rào xanh bằng cách sửa phía mong đợi.
 * ---------------------------------------------------------------------------------------------- */
const defaultSource = readAtRoot(CONFIG_FILES.default);
const unitSource = readAtRoot(CONFIG_FILES.unit);

describe('vitest.config.ts — default lane fail-closed (RF-06)', () => {
  it('AC-01 / RQ-01: khai automatic JSX y het unit lane', () => {
    const fromDefault = extractJsxRuntime(defaultSource);
    const fromUnit = extractJsxRuntime(unitSource);
    expect(fromUnit, 'khong trich duoc esbuild.jsx cua unit config').not.toBeNull();
    expect(fromDefault, 'khong trich duoc esbuild.jsx cua default config').not.toBeNull();
    expect(fromDefault).toEqual({ jsx: 'automatic', jsxImportSource: 'react' });
    expect(fromDefault).toEqual(fromUnit);
  });

  it('AC-02 / RQ-02: sentinel giong unit lane tung byte va env DUNG sentinel do', () => {
    const fromDefault = extractSentinel(defaultSource);
    const fromUnit = extractSentinel(unitSource);
    expect(fromUnit, 'khong trich duoc BLOCKED_DB_URL cua unit config').not.toBeNull();
    expect(fromDefault, 'khong trich duoc BLOCKED_DB_URL cua default config').not.toBeNull();
    expect(fromDefault).toBe(fromUnit);
    expect(fromDefault).toMatch(/^postgresql:\/\/[^@]+@127\.0\.0\.1:1\//);

    const entries = extractEnvEntries(defaultSource);
    expect(entries, 'khong trich duoc khoi env cua default config').not.toBeNull();
    expect(entries?.get('DATABASE_URL')).toBe('BLOCKED_DB_URL');
  });

  it('AC-02 / RQ-02: khong con duong nao doc .env hay ambient DATABASE_URL', () => {
    expect(forbiddenDbSources(defaultSource)).toEqual([]);
  });

  it('AC-03 / RQ-03: moi bien admin/test/LIVE cua unit lane deu bi blank o default', () => {
    const defaultEntries = extractEnvEntries(defaultSource);
    const unitEntries = extractEnvEntries(unitSource);
    expect(defaultEntries).not.toBeNull();
    expect(unitEntries).not.toBeNull();

    const unitBlanks = blankedKeys(unitEntries!);
    const defaultBlanks = blankedKeys(defaultEntries!);
    expect(unitBlanks.size, 'unit config phai co it nhat vai bien bi blank').toBeGreaterThan(5);
    expect(difference(unitBlanks, defaultBlanks), 'MISSING: co o unit ma khong blank o default').toEqual([]);
    expect(difference(defaultBlanks, unitBlanks), 'EXTRA: blank o default ma unit khong co').toEqual([]);

    const notBlankedAtDefault = sorted(
      [...defaultEntries!.keys()].filter((key) => key !== 'DATABASE_URL' && !defaultBlanks.has(key)),
    );
    expect(notBlankedAtDefault, 'moi khoa env ngoai DATABASE_URL phai la chuoi rong').toEqual([]);
  });
});

describe('vitest.config.ts — exclusion va include (RF-06)', () => {
  it('AC-04 / RQ-04: import va spread INTEGRATION_TEST_FILES, khong chep list', () => {
    const exclude = analyseExclude(defaultSource);
    expect(exclude.found, 'default config khong co khoi exclude').toBe(true);
    expect(importsInventory(defaultSource), 'thieu import INTEGRATION_TEST_FILES').toBe(true);
    expect(exclude.spreadsInventory, 'exclude khong spread INTEGRATION_TEST_FILES').toBe(true);
    expect(exclude.spreadsDefaults, 'exclude khong spread configDefaults.exclude').toBe(true);
    expect(exclude.hardcodedTestFiles, 'exclude chep tay duong dan test — DEC-04 cam').toEqual([]);
  });

  it('AC-04 / RQ-04: inventory dung chung con SONG va tro toi tep that', () => {
    // Sàn chống inventory rỗng: một mảng bị làm rỗng khiến `exclude` vẫn đúng cú pháp mà default
    // lane thu lại toàn bộ test mở DB, trong khi mọi assertion cấu trúc ở trên vẫn xanh.
    expect(INTEGRATION_TEST_FILES.length).toBeGreaterThanOrEqual(15);
    const missing = INTEGRATION_TEST_FILES.filter((relative) => !existsSync(join(REPO_ROOT, relative)));
    expect(missing, 'inventory tro toi tep khong ton tai — exclude da lac hau').toEqual([]);
    const badShape = INTEGRATION_TEST_FILES.filter((relative) => !relative.endsWith('.test.ts'));
    expect(badShape).toEqual([]);
  });

  it('AC-05 / RQ-05: include khop ba glob cua RQ-05 va khop unit lane hai chieu', () => {
    const fromDefault = extractInclude(defaultSource);
    const fromUnit = extractInclude(unitSource);
    expect(fromDefault, 'khong trich duoc include cua default config').not.toBeNull();
    expect(fromUnit, 'khong trich duoc include cua unit config').not.toBeNull();
    expect(sorted(fromDefault!)).toEqual(sorted(RQ05_INCLUDE_GLOBS));
    expect(difference(fromUnit!, fromDefault!), 'unit thu ma default khong thu').toEqual([]);
    expect(difference(fromDefault!, fromUnit!), 'default thu ma unit khong thu').toEqual([]);
  });

  it('4.3: giu single-thread va fileParallelism nhu truoc', () => {
    const pool = sliceBlock(defaultSource, 'poolOptions');
    expect(pool, 'mat khoi poolOptions').not.toBeNull();
    expect(pool).toMatch(/maxThreads:\s*1/);
    expect(pool).toMatch(/minThreads:\s*1/);
    expect(pool).toMatch(/maxForks:\s*1/);
    expect(defaultSource).toMatch(/fileParallelism:\s*false/);
  });
});

describe('phep do RUNTIME — lane dang chay nhan dung sentinel (RF-06)', () => {
  it('AC-02 / RQ-02: process.env.DATABASE_URL luc chay la sentinel bat kha ket noi', () => {
    // Đây là phép đo duy nhất KHÔNG đọc văn bản: nó bắt cả trường hợp config đúng từng chữ mà lane
    // vẫn nhận URL thật từ nơi khác (shell, setupFiles, một plugin nạp .env).
    const sentinel = extractSentinel(defaultSource);
    expect(sentinel).not.toBeNull();
    expect(process.env.DATABASE_URL, 'lane dang chay KHONG dung sentinel — co the dang tro DB that').toBe(
      sentinel,
    );
    for (const key of ['DATABASE_URL_ADMIN', 'DATABASE_URL_TEST', 'DATABASE_URL_ADMIN_TEST']) {
      expect(process.env[key] ?? '', `${key} phai rong trong lane nay`).toBe('');
    }
  });
});

/* ------------------------------------------------------------------------------------------------
 * RANG CUA HANG RAO (`RQ-06`, `AC-06`). Khối này KHÔNG đọc tệp thật. Nó cho các bộ trích xuất ăn
 * chuỗi config BỊA có đúng những lỗi RF-06 sinh ra để chặn, rồi đòi chúng BÁO lỗi. Một extractor mù
 * — regex khớp mọi thứ, hay hàm luôn trả `null` — làm khối này đỏ. Đây là phép ÂM tĩnh, độc lập với
 * phép mutation trên đĩa ở `STEP-04`; hai thứ chứng minh hai điều khác nhau.
 * ---------------------------------------------------------------------------------------------- */
const DRIFTED_CONFIG = `
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: ['src/shared/auth/rls-context.test.ts', 'src/shared/auth/matrix-scope.test.ts'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? readFileSync('.env', 'utf8'),
      DATABASE_URL_ADMIN: process.env.DATABASE_URL_ADMIN,
      MP2_LIVE_SECURITY_CHECK: '1',
    },
    poolOptions: { threads: { maxThreads: 8, minThreads: 4 } },
  },
});
`;

describe('rang cua hang rao — phep am tren config BIA (AC-06)', () => {
  it('phat hien thieu automatic JSX', () => {
    expect(extractJsxRuntime(DRIFTED_CONFIG)).toBeNull();
    expect(extractJsxRuntime("esbuild: { jsx: 'transform', jsxImportSource: 'react' }")).toEqual({
      jsx: 'transform',
      jsxImportSource: 'react',
    });
    // Cùng một extractor, cùng một chuỗi: giá trị 'transform' KHÔNG được coi là hợp lệ ở AC-01.
    expect(extractJsxRuntime("esbuild: { jsx: 'transform', jsxImportSource: 'react' }")).not.toEqual({
      jsx: 'automatic',
      jsxImportSource: 'react',
    });
  });

  it('phat hien thieu sentinel va phat hien duong doc DB that', () => {
    expect(extractSentinel(DRIFTED_CONFIG)).toBeNull();
    expect(sorted(forbiddenDbSources(DRIFTED_CONFIG))).toEqual(
      sorted(['ambient DATABASE_URL', 'doc tep tu dia', 'tep .env']),
    );
    // Phía dương của cùng phép đo: config thật không khớp mẫu nào.
    expect(forbiddenDbSources(defaultSource)).toEqual([]);
  });

  it('phat hien bien LIVE khong bi blank', () => {
    const entries = extractEnvEntries(DRIFTED_CONFIG);
    expect(entries).not.toBeNull();
    expect(entries?.get('MP2_LIVE_SECURITY_CHECK')).toBe("'1'");
    expect(sorted(blankedKeys(entries!)), 'config BIA khong blank bien nao').toEqual([]);
  });

  it('phat hien exclude chep tay va thieu spread', () => {
    const exclude = analyseExclude(DRIFTED_CONFIG);
    expect(exclude.found).toBe(true);
    expect(exclude.spreadsInventory).toBe(false);
    expect(exclude.spreadsDefaults).toBe(false);
    expect(exclude.hardcodedTestFiles.length).toBe(2);
    expect(importsInventory(DRIFTED_CONFIG)).toBe(false);
  });

  it('phat hien include thieu glob va poolOptions bi noi long', () => {
    const globs = extractInclude(DRIFTED_CONFIG);
    expect(globs).not.toBeNull();
    expect(difference(RQ05_INCLUDE_GLOBS, globs!)).toEqual(['prisma/**/*.test.ts']);
    expect(sliceBlock(DRIFTED_CONFIG, 'poolOptions')).toMatch(/maxThreads:\s*8/);
  });

  it('mo phong DUNG phep mutation cua STEP-04 tren ban sao trong bo nho', () => {
    // Xoá đúng một dòng `esbuild:` khỏi văn bản config THẬT. Nếu extractor vẫn trả về giá trị sau
    // phép xoá này thì mutation trên đĩa ở STEP-04 cũng sẽ không làm hàng rào đỏ.
    const withoutJsx = defaultSource.replace(/^\s*esbuild:.*$/m, '');
    expect(withoutJsx, 'phep xoa khong doi gi — regex mutation sai').not.toBe(defaultSource);
    expect(extractJsxRuntime(withoutJsx)).toBeNull();

    const withoutInventory = defaultSource.replace(/\.\.\.INTEGRATION_TEST_FILES/, '');
    expect(withoutInventory).not.toBe(defaultSource);
    expect(analyseExclude(withoutInventory).spreadsInventory).toBe(false);
  });
});
