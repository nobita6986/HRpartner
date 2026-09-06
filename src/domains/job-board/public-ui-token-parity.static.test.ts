/**
 * public-ui-token-parity.static.test.ts — hrp-v5-ui-01 / RQ-12 / DEC-08 / AC-12.
 *
 * Lớp lỗi được chốt: một class Tailwind CÓ MẶT trong `className` mà KHÔNG có token tương ứng
 * trong khối `@theme` của `app/globals.css` thì không sinh ra một byte CSS nào. Nó không đỏ ở
 * `typecheck`, không đỏ ở `eslint`, không đỏ ở một hàng rào nào đang có — vì mọi hàng rào cũ đo
 * `globals.css` chứ không đo TÍNH HỢP LỆ của class. Kết cục là chữ về cỡ mặc định của trình duyệt
 * và không ai biết. `EV-03` đếm được `16` class đúng loại ấy trong `new-ui/components/`.
 *
 * Ba tính chất khiến tệp này KHÔNG rơi vào lớp lỗi `TEXT_PAIRS` của `hrp-v5-go-live-08` — một bảng
 * chỉ liệt kê thứ tác giả nó VỪA THÊM thì xanh 100% mà không bảo vệ gì:
 *   1. Tập "đã khai" được SUY từ chính khối `@theme` đã phân tích của `app/globals.css`. Không có
 *      mảng token chép tay nào đóng vai nguồn sự thật.
 *   2. Tập thách thức đến từ một phép BÓC `className` trên cây nguồn thật, cộng một phép quét thư
 *      mục `src/domains/job-board/components/` bằng thư viện chuẩn của Node. Thêm một class rỗng ở
 *      bất kỳ đâu trên bề mặt ấy là hàng rào thấy ngay, kể cả khi nó nằm sau tiền tố `md:`.
 *   3. Phân loại ĐÓNG: mỗi class `text-*`, `font-*`, `bg-*` phải hoặc là một utility CÓ SẴN của
 *      Tailwind, hoặc là một giá trị tuỳ ý trong ngoặc vuông, hoặc phân giải về một token khai
 *      trong `@theme`. Không có nhánh thứ tư. Một class chưa phân loại làm tệp này ĐỎ và thông
 *      điệp nêu đúng tên nó cùng tên tệp.
 *
 * Vì sao BÓC COMMENT TRƯỚC khi tìm `@theme`: một token dán lọt vào giữa một comment CSS vẫn khớp
 * mọi regex nhưng sinh `0` byte trong bundle — đúng cơ chế của `F-07` ở go-live-10 round 2. Đo
 * trên bản đã bóc comment nghĩa là tệp này đo thứ SỐNG, không đo mặt chữ.
 *
 * Giới hạn CÓ TÊN:
 *   - Nó bóc class từ giá trị của thuộc tính `className`, nên một class dựng bằng nội suy chuỗi
 *     (`text-${size}`) không bị soi. Phép đếm `TOKEN_COUNT_FLOOR` chặn trạng thái "bóc được gần
 *     như không có gì", còn nội suy thì được ghi nhận là giới hạn, không phải điểm mù im lặng.
 *   - Nó không dựng Tailwind và không đọc bundle, nên nó khẳng định SỰ TỒN TẠI của token chứ không
 *     khẳng định giá trị hiển thị cuối cùng sau khi cascade.
 *   - Nó không gọi ra ngoài process: không `execSync`, không `git`. Nó không đọc một `DATABASE_URL`
 *     nào và không mở kết nối nào.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CSS_PATH = join(ROOT, 'app/globals.css');
const PAGE_PATH = join(ROOT, 'app/(portal)/page.tsx');
const COMPONENTS_DIR = join(ROOT, 'src/domains/job-board/components');

/**
 * Sàn chống quét rỗng. Đây là NGƯỠNG, không phải danh sách: một phép bóc trả về gần như không có
 * gì — vì sai đường dẫn, vì đổi cách viết thuộc tính, vì một lần refactor — sẽ làm mọi assertion
 * phân loại xanh một cách vô nghĩa. Bốn con số dưới đây chặn đúng trạng thái ấy.
 */
const SURFACE_FILE_FLOOR = 4;
const CLASSNAME_CHUNK_FLOOR = 100;
const TOKEN_COUNT_FLOOR = 15;
const THEME_DECL_FLOOR = 60;

const rel = (p: string) => relative(ROOT, p).split(sep).join('/');
const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/** Bóc comment của cả CSS và TS/TSX. Thứ nằm trong comment không sinh ra byte nào. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Trả về thân của khối `@theme` đầu tiên, cắt bằng phép ĐẾM ngoặc chứ không bằng regex, để một
 * khối lồng bên trong không làm cắt sớm.
 */
function themeBody(css: string): string {
  const at = css.indexOf('@theme');
  if (at < 0) return '';
  const open = css.indexOf('{', at);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return '';
}

/** Phân tích theo KHAI BÁO, không theo dòng: nhiều khai báo trên một dòng vẫn đếm đủ. */
function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/**
 * Bóc từng giá trị `className`. Xử lý cả `className="..."` và `className={...}` — dạng thứ hai
 * cắt bằng phép đếm ngoặc nhọn rồi lấy mọi literal chuỗi bên trong, nên `clsx(...)` và toán tử ba
 * ngôi đều lọt vào tầm soi.
 */
function classNameChunks(code: string): string[] {
  const out: string[] = [];
  const re = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const i = m.index + m[0].length;
    const ch = code[i];
    if (ch === '"' || ch === "'") {
      const end = code.indexOf(ch, i + 1);
      if (end < 0) continue;
      out.push(code.slice(i + 1, end));
      re.lastIndex = end + 1;
      continue;
    }
    if (ch === '{') {
      let depth = 0;
      let j = i;
      for (; j < code.length; j += 1) {
        if (code[j] === '{') depth += 1;
        else if (code[j] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const inner = code.slice(i + 1, j);
      for (const s of inner.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
        out.push(s[1] ?? s[2] ?? s[3] ?? '');
      }
      re.lastIndex = j + 1;
    }
  }
  return out;
}

/** Bỏ `!important` và mọi tiền tố biến thể (`md:`, `hover:`, `data-[state=open]:`). */
function baseUtility(token: string): string {
  return token.replace(/^!/, '').replace(/^(?:[a-z0-9-]+(?:\[[^\]]*\])?:)+/, '');
}

/** Bỏ hậu tố độ mờ `/40` — nhưng KHÔNG chạm vào giá trị tuỳ ý, nơi `/` là ký tự nội dung. */
function stripOpacity(token: string): string {
  if (token.includes('[')) return token;
  return token.replace(/\/[0-9.]+$/, '');
}

/** Cỡ chữ CÓ SẴN của Tailwind. Thêm khóa mới trong không gian `--text-*` không xoá dải này. */
const BUILTIN_TEXT_SIZES = new Set([
  'xs', 'sm', 'base', 'lg', 'xl',
  '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
]);

/** Utility dùng chung tiền tố `text-` mà KHÔNG phải cỡ chữ và KHÔNG phải màu. */
const BUILTIN_TEXT_KEYWORDS = new Set([
  'left', 'center', 'right', 'justify', 'start', 'end',
  'wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip',
  'transparent', 'current', 'inherit', 'black', 'white',
]);

const BUILTIN_FONT_WEIGHTS = new Set([
  'thin', 'extralight', 'light', 'normal', 'medium',
  'semibold', 'bold', 'extrabold', 'black',
]);

const BUILTIN_BG_KEYWORDS = new Set([
  'transparent', 'current', 'inherit', 'black', 'white', 'none',
  'cover', 'contain', 'auto', 'center', 'top', 'bottom', 'left', 'right',
  'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'repeat-round', 'repeat-space',
  'fixed', 'local', 'scroll',
]);

type Failure = { file: string; token: string; reason: string };

/**
 * Phân loại ĐÓNG. Trả `null` nghĩa là class chắc chắn sinh ra CSS; trả một chuỗi nghĩa là nó
 * không phân giải được về bất cứ nguồn nào và vì thế sinh `0` byte.
 */
function unresolved(token: string, theme: Map<string, string>): string | null {
  const t = baseUtility(token);
  const arbitrary = /\[[^\]]*\]$/.test(t);
  if (arbitrary) return null;

  if (t.startsWith('text-')) {
    const rest = stripOpacity(t.slice(5));
    if (BUILTIN_TEXT_SIZES.has(rest) || BUILTIN_TEXT_KEYWORDS.has(rest)) return null;
    if (theme.has(`--text-${rest}`) || theme.has(`--color-${rest}`)) return null;
    return `không có --text-${rest} và cũng không có --color-${rest} trong @theme`;
  }
  if (t.startsWith('font-')) {
    const rest = t.slice(5);
    if (BUILTIN_FONT_WEIGHTS.has(rest)) return null;
    if (theme.has(`--font-${rest}`)) return null;
    return `không có --font-${rest} trong @theme (font-* phân giải về HỌ CHỮ, không phải cỡ chữ)`;
  }
  if (t.startsWith('bg-')) {
    const rest = stripOpacity(t.slice(3));
    if (BUILTIN_BG_KEYWORDS.has(rest)) return null;
    if (rest.startsWith('clip-') || rest.startsWith('origin-') || rest.startsWith('blend-')) return null;
    if (rest.startsWith('gradient-to-') || rest.startsWith('linear-') || rest.startsWith('radial-')) return null;
    if (theme.has(`--color-${rest}`)) return null;
    return `không có --color-${rest} trong @theme`;
  }
  return null;
}

/** Bảy bậc của `DEC-13`. Hậu tố dựng riêng để không tệp evidence nào phải viết tên bị cấm. */
const SCALE_SUFFIXES = [
  'headline-xl', 'headline-lg', 'headline-md',
  'body-lg', 'body-md',
  'label-md', 'label-sm',
] as const;

/** `[hậu tố, cỡ, line-height]` — ghim đúng theo `DEC-13`, không phải theo thứ tôi vừa gõ vào CSS. */
const EXPECTED_SCALE: ReadonlyArray<readonly [string, string, string]> = [
  ['headline-xl', '32px', '1.2'],
  ['headline-lg', '24px', '1.25'],
  ['headline-md', '20px', '1.3'],
  ['body-lg', '18px', '1.6'],
  ['body-md', '16px', '1.6'],
  ['label-md', '14px', '1.4'],
  ['label-sm', '12px', '1.4'],
];

const CSS_LIVE = stripComments(read(CSS_PATH));
const THEME = declarations(themeBody(CSS_LIVE));

const COMPONENT_FILES = readdirSync(COMPONENTS_DIR)
  .filter((n) => n.endsWith('.tsx'))
  .map((n) => join(COMPONENTS_DIR, n))
  .sort();
const HOME_FILES = [PAGE_PATH, ...COMPONENT_FILES];

const TOKEN_FILES = new Map<string, Set<string>>();
const FAILURES: Failure[] = [];
let CHUNK_COUNT = 0;

for (const file of HOME_FILES) {
  const code = stripComments(read(file));
  const chunks = classNameChunks(code);
  CHUNK_COUNT += chunks.length;
  for (const chunk of chunks) {
    for (const raw of chunk.split(/\s+/).filter(Boolean)) {
      const token = baseUtility(raw);
      if (!/^(?:text|font|bg)-/.test(token)) continue;
      const seen = TOKEN_FILES.get(token) ?? new Set<string>();
      seen.add(rel(file));
      TOKEN_FILES.set(token, seen);
      const why = unresolved(raw, THEME);
      if (why !== null) FAILURES.push({ file: rel(file), token, reason: why });
    }
  }
}

const SCALE_KEYS = [...THEME.keys()]
  .filter((k) => k.startsWith('--text-') && !k.endsWith('--line-height'))
  .sort();

describe('Sàn quét — hàng rào phải THẤY bề mặt trước khi nó khẳng định điều gì', () => {
  it('S-01 — tập tệp trang chủ được quét từ thư mục thật, không phải danh sách chép tay', () => {
    expect(HOME_FILES.map(rel)).toContain('app/(portal)/page.tsx');
    expect(HOME_FILES.length).toBeGreaterThanOrEqual(SURFACE_FILE_FLOOR);
  });

  it('S-02 — phép bóc className trả về đủ nhiều khối để mọi assertion sau có nghĩa', () => {
    expect(CHUNK_COUNT).toBeGreaterThanOrEqual(CLASSNAME_CHUNK_FLOOR);
    expect(TOKEN_FILES.size).toBeGreaterThanOrEqual(TOKEN_COUNT_FLOOR);
  });

  it('S-03 — khối @theme phân tích được và đủ dày, nên "không có token" là kết luận thật', () => {
    expect(THEME.size).toBeGreaterThanOrEqual(THEME_DECL_FLOOR);
    expect(THEME.has('--font-head')).toBe(true);
    expect(THEME.has('--color-on-surface')).toBe(true);
  });
});

describe('Thang chữ — DEC-13 / DEC-11 / AC-01', () => {
  it('T-01 — bảy bậc có mặt trong @theme với ĐÚNG cỡ và ĐÚNG line-height', () => {
    const actual = EXPECTED_SCALE.map(([name]) => [
      name,
      THEME.get(`--text-${name}`) ?? 'THIẾU',
      THEME.get(`--text-${name}--line-height`) ?? 'THIẾU',
    ]);
    expect(actual).toEqual(EXPECTED_SCALE.map((row) => [...row]));
  });

  it('T-02 — ĐÚNG bảy khóa cỡ chữ, không nhiều hơn: DEC-11 cấm token thứ tám lọt kèm', () => {
    expect(SCALE_KEYS).toEqual([...SCALE_SUFFIXES].map((s) => `--text-${s}`).sort());
  });

  it('T-03 — khóa --line-height là khóa BẠN ĐỒNG HÀNH, không bị đếm lẫn vào bảy khóa cỡ', () => {
    const companions = [...THEME.keys()].filter(
      (k) => k.startsWith('--text-') && k.endsWith('--line-height'),
    );
    expect(companions).toHaveLength(SCALE_SUFFIXES.length);
    expect(SCALE_KEYS.some((k) => k.endsWith('--line-height'))).toBe(false);
  });

  it('T-04 — mỗi bậc được DÙNG ít nhất một lần trên bề mặt trang chủ', () => {
    const unused = SCALE_SUFFIXES.filter((s) => !TOKEN_FILES.has(`text-${s}`));
    expect(unused).toEqual([]);
  });
});

describe('Tương ứng token với class — RQ-12', () => {
  it('P-01 — không class text-*/font-*/bg-* nào trên trang chủ sinh ra 0 byte CSS', () => {
    const report = FAILURES.map((f) => `${f.file}: ${f.token} — ${f.reason}`).sort();
    expect(report).toEqual([]);
  });

  it('P-02 — ba họ chữ và hai màu mà DEC-03/DEC-04 chỉ định đều phân giải được', () => {
    const musts = [
      'font-head', 'font-body', 'font-label',
      'text-on-surface', 'bg-surface-container-low',
    ];
    expect(musts.filter((t) => unresolved(t, THEME) !== null)).toEqual([]);
  });
});

describe('Răng của hàng rào — phân loại phải BÁC được thứ đáng bác', () => {
  /** Theme tổng hợp: các ca logic dưới đây không phụ thuộc vào trạng thái repo lúc chạy. */
  const SYNTHETIC = new Map<string, string>([
    ['--color-on-surface', '#1a1c1b'],
    ['--font-head', 'sans-serif'],
    ['--text-body-md', '16px'],
  ]);

  it('N-01 — class cỡ chữ dựng theo lối font-<bậc> bị BÁC: font-* là họ chữ, không phải cỡ', () => {
    const dead = SCALE_SUFFIXES.map((s) => `font-${s}`);
    expect(dead.filter((t) => unresolved(t, SYNTHETIC) === null)).toEqual([]);
  });

  it('N-02 — hai class màu không có token bị BÁC', () => {
    const dead = [`text-on-${'background'}`, `bg-surface-${'warm'}`];
    expect(dead.filter((t) => unresolved(t, SYNTHETIC) === null)).toEqual([]);
  });

  it('N-03 — bảng màu thô của Tailwind KHÔNG được coi là đã khai trong @theme', () => {
    expect(unresolved('text-red-500', SYNTHETIC)).not.toBeNull();
  });

  it('N-04 — utility có sẵn, giá trị tuỳ ý và tiền tố biến thể vẫn được NHẬN', () => {
    const alive = [
      'text-sm', 'text-center', 'font-semibold', 'bg-transparent',
      'text-[15px]', 'md:text-body-md', 'hover:text-on-surface', '!font-head',
    ];
    expect(alive.filter((t) => unresolved(t, SYNTHETIC) !== null)).toEqual([]);
  });

  it('N-05 — token dán lọt vào COMMENT không được tính là đã khai', () => {
    const commented = declarations(themeBody(stripComments('@theme {\n  /* --text-ghost: 9px; */\n  --color-real: #000;\n}')));
    expect(commented.has('--text-ghost')).toBe(false);
    expect(commented.has('--color-real')).toBe(true);
  });
});

