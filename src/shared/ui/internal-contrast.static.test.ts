/**
 * internal-contrast.static.test.ts — go-live-16 / RQ-08, RQ-09, RQ-10 / STEP-07 / AC-08..AC-10.
 *
 * Vì sao hàng rào này ĐO thay vì LIỆT KÊ. Máy quét cũ
 * (`scratch/ui-contrast-scan.py`, xem `EV-10`) ghim sẵn bốn nền và đo mọi màu
 * chữ với nền TỐI NHẤT trong bốn nền đó, nên nó báo `41` chỗ trượt ở tám trang
 * admin trong khi sự thật là `3` chỗ và `0` chỗ ở `app/admin/`. Cùng lúc đó,
 * hàng rào của go-live-08 lại liệt kê tay từng cặp màu mà round đó VỪA THÊM,
 * nên nút chính của chính nó sống ở `3.153:1` với bộ test xanh `100%`. Hai lỗi
 * ngược dấu, cùng một nguyên nhân: tập cặp màu không được đọc từ nguồn.
 *
 * File này đọc CẢ BA bề mặt nội bộ, trích mọi cặp chữ-nền có thật trong cây
 * JSX, lấy nền của đúng thẻ bao quanh, và tự tính tỉ số. Thêm một dòng chữ mờ
 * vào ba tệp đó là hàng rào ĐỎ, không cần ai cập nhật danh sách.
 *
 * Bốn quy tắc đo, cả bốn đều là bài học đã trả giá:
 *   1. Nền lấy từ khối `@theme` của `app/globals.css`, KHÔNG ghim trong test
 *      (`RQ-09`). Ghim là tái lập đúng khuyết điểm của `EV-10`.
 *   2. `--color-surface-tint` KHÔNG phải một nền. Nó là màu tint cho độ nâng và
 *      trùng `--color-primary-dark`; gộp nó vào tập nền kéo sàn mọi phép đo
 *      xuống `1.000` (`DEC-07`, `RISK-04`).
 *   3. `var(--x, #hex)` mà `--x` CÓ khai báo thì giá trị thật là `--x`, không
 *      phải nhánh dự phòng (`EV-07`). Nhánh dự phòng chỉ sống khi `--x` chết.
 *   4. Ngưỡng theo cỡ chữ THẬT đọc từ `className`: `4.5:1` cho chữ thường,
 *      `3:1` chỉ khi `>= 24px` hoặc `>= 18.66px` VÀ đậm (`ASM-01`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = 'app/globals.css';
const SURFACES = ['app/worker/page.tsx', 'app/ctv/page.tsx', 'app/login/login-form.tsx'] as const;

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

/** Bản CSS đã bóc comment: một chuỗi nằm trong comment thì chết trong bundle. */
const cssCode = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '');

// ---------------------------------------------------------------------------
// 1. Bảng token đọc từ chính app/globals.css
// ---------------------------------------------------------------------------

/** Khối bắt đầu ở `head` tới dấu ngoặc nhọn cân bằng — chịu được lồng nhau. */
function balancedBlock(source: string, head: string): string {
  const start = source.indexOf(head);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

function declarationsIn(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of source.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+);/g)) {
    if (!out.has(m[1])) out.set(m[1], m[2].trim());
  }
  return out;
}

/** Mọi khai báo trong tệp, kể cả lớp tương thích `--on-surface-variant: var(--color-on-surface-variant)`. */
const DECLS = declarationsIn(cssCode);
/** Chỉ các khai báo NẰM TRONG `@theme` — tập nền của hệ phải đến từ đây (`RQ-09`). */
const THEME = declarationsIn(balancedBlock(cssCode, '@theme'));

const NAMED_COLORS: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
};

/** Từ khoá KHÔNG phải một màu đặc: `transparent` để lộ nền của thẻ bao quanh,
 *  nên coi nó là "chưa có nền" và đi tiếp lên trên. Đây là lỗi mà một máy quét
 *  đọc-chuỗi không thấy: nút tab không hoạt động ở `worker` có
 *  `background: 'transparent'`, nền thật của nó là nền của thanh tab. */
const NOT_A_SOLID_COLOR = ['transparent', 'none', 'inherit', 'initial', 'unset', 'currentcolor'];

/** `#abc` → `#aabbcc`; `rgb(1,2,3)` → `#010203`; `var()` lần theo chuỗi. */
function resolveColor(raw: string | undefined, depth = 0): string | null {
  if (raw === undefined || depth > 12) return null;
  const v = raw.trim().replace(/\s*!important$/, '');
  if (v === '') return null;

  const lower = v.toLowerCase();
  if (NOT_A_SOLID_COLOR.includes(lower)) return null;
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower];

  const hex = lower.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    return h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
  }

  const rgb = lower.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) {
    const to2 = (n: string) => Math.round(Number(n)).toString(16).padStart(2, '0');
    return `#${to2(rgb[1])}${to2(rgb[2])}${to2(rgb[3])}`;
  }

  // var(--x) và var(--x, du-phong). Quy tắc 3: token có khai báo thì thắng.
  const varMatch = v.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,([\s\S]+))?\)$/);
  if (varMatch) {
    const declared = DECLS.get(varMatch[1]);
    if (declared !== undefined) return resolveColor(declared, depth + 1);
    return resolveColor(varMatch[2], depth + 1);
  }
  return null;
}

/** Độ chói tương đối theo WCAG 2.x. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const lin = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratioHex(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const round3 = (n: number): string => n.toFixed(3);

// ---------------------------------------------------------------------------
// 2. Tập nền của hệ — đọc từ @theme, loại --color-surface-tint (RQ-09, DEC-07)
// ---------------------------------------------------------------------------

const TINT = '--color-surface-tint';

const BACKGROUND_TOKENS = [...THEME.keys()]
  .filter((name) => /^--color-(background|surface)/.test(name))
  .filter((name) => name !== TINT)
  .sort();

const SYSTEM_BACKGROUNDS: string[] = BACKGROUND_TOKENS.map((n) => resolveColor(`var(${n})`)).filter(
  (c): c is string => c !== null,
);

/** Nền của trang khi một dòng chữ không nằm trong thẻ nào có nền: `body` dùng
 *  `var(--color-background)`, nên đây là nền THẬT chứ không phải giả định. */
const PAGE_BACKGROUND = resolveColor('var(--color-background)') ?? '#ffffff';

/** Sàn của một màu trên MỌI nền của hệ — dùng cho token vòng focus. */
function floorAcrossSurfaces(color: string): number {
  return Math.min(...SYSTEM_BACKGROUNDS.map((bg) => ratioHex(color, bg)));
}

// ---------------------------------------------------------------------------
// 3. Trích cặp chữ-nền từ cây JSX
// ---------------------------------------------------------------------------

interface Element {
  index: number;
  line: number;
  tag: string;
  attrs: string;
  /** Chỉ số của các thẻ ĐANG MỞ tại thời điểm thẻ này mở, gốc trước con sau. */
  parents: number[];
}

/**
 * Mọi thẻ mở trong nguồn, kèm vùng thuộc tính đã cắt đúng dấu `>` ở độ sâu 0 và
 * kèm chuỗi thẻ tổ tiên THẬT.
 *
 * Quan hệ cha-con dựng bằng ngăn xếp thẻ mở/đóng, KHÔNG bằng thụt lề. Thụt lề
 * đọc sai ở đúng chỗ nguy hiểm nhất: một thẻ em cùng mức thụt với thẻ anh đã
 * đóng vẫn trông như con của nó, nên nền bị lấy từ một khối đã kết thúc. Lần đo
 * đầu của hàng rào này báo `worker:331` nằm trên nền của thanh tab ở `:222` —
 * một khối đã đóng từ lâu — và suýt sinh ra một báo động giả.
 */
function parseElements(src: string): Element[] {
  const out: Element[] = [];
  const stack: number[] = [];
  const lineStarts: number[] = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (pos: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '<') continue;

    // Thẻ đóng: nhả ngăn xếp tới đúng thẻ cùng tên.
    const closing = /^<\/([A-Za-z][\w.]*)\s*>/.exec(src.slice(i, i + 60));
    if (closing) {
      for (let s = stack.length - 1; s >= 0; s--) {
        if (out[stack[s]].tag === closing[1]) {
          stack.length = s;
          break;
        }
      }
      i += closing[0].length - 1;
      continue;
    }

    const nameMatch = /^<([A-Za-z][\w.]*)/.exec(src.slice(i, i + 40));
    if (!nameMatch) continue;

    let j = i + nameMatch[0].length;
    let depth = 0;
    let quote = '';
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote !== '') {
        if (c === quote && src[j - 1] !== '\\') quote = '';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') { depth++; continue; }
      if (c === '}') { depth--; continue; }
      if (c === '>' && depth === 0) break;
    }
    if (j >= src.length) continue;

    const rawAttrs = src.slice(i + nameMatch[0].length, j);
    const selfClosing = /\/\s*$/.test(rawAttrs);
    const index = out.length;
    out.push({
      index,
      line: lineOf(i),
      tag: nameMatch[1],
      attrs: rawAttrs.replace(/\/\s*$/, ''),
      parents: [...stack],
    });
    if (!selfClosing) stack.push(index);
    i = j;
  }
  return out;
}

/** Nội dung giữa `style={{` và dấu `}}` cân bằng. */
function styleText(attrs: string): string | null {
  const at = attrs.indexOf('style={{');
  if (at < 0) return null;
  const open = at + 'style={'.length;
  let depth = 0;
  for (let i = open; i < attrs.length; i++) {
    if (attrs[i] === '{') depth++;
    else if (attrs[i] === '}') {
      depth--;
      if (depth === 0) return attrs.slice(open + 1, i);
    }
  }
  return null;
}

/** `className="..."` dạng chuỗi tĩnh. `className={...}` động trả về null. */
function classNameOf(attrs: string): string | null {
  const m = attrs.match(/className\s*=\s*"([^"]*)"/);
  return m ? m[1] : null;
}

/** Mọi màu đứng ở thuộc tính `prop` — nhiều giá trị khi nguồn dùng biểu thức ba ngôi. */
function colorsOfProperty(style: string, props: string[]): string[] {
  const found: string[] = [];
  for (const prop of props) {
    const re = new RegExp(`(?:^|[,{\\s])${prop}\\s*:`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(style)) !== null) {
      let depth = 0;
      let quote = '';
      let end = style.length;
      for (let i = m.index + m[0].length; i < style.length; i++) {
        const c = style[i];
        if (quote !== '') {
          if (c === quote && style[i - 1] !== '\\') quote = '';
          continue;
        }
        if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
        if (c === '(' || c === '{' || c === '[') { depth++; continue; }
        if (c === ')' || c === '}' || c === ']') { depth--; continue; }
        if (c === ',' && depth === 0) { end = i; break; }
      }
      const slice = style.slice(m.index + m[0].length, end);
      for (const lit of slice.matchAll(/'([^']*)'|"([^"]*)"/g)) {
        const c = resolveColor(lit[1] ?? lit[2]);
        if (c !== null && !found.includes(c)) found.push(c);
      }
    }
  }
  return found;
}

const TEXT_SIZE_PX: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
};
const BOLD_CLASSES = ['font-bold', 'font-extrabold', 'font-black', 'font-semibold'];

interface Metrics {
  px: number;
  bold: boolean;
}

/** Cỡ và độ đậm THẬT của một phần tử, thừa kế từ thẻ bao quanh khi thẻ con im lặng. */
function metricsOf(chain: Element[]): Metrics {
  let px = 16; // mặc định Tailwind: 1rem
  let bold = false;
  for (const el of chain) {
    const cls = classNameOf(el.attrs);
    if (cls === null) continue;
    for (const tok of cls.split(/\s+/)) {
      if (TEXT_SIZE_PX[tok] !== undefined) px = TEXT_SIZE_PX[tok];
      if (BOLD_CLASSES.includes(tok)) bold = true;
    }
  }
  return { px, bold };
}

/** WCAG 1.4.3: chữ lớn là `>= 24px`, hoặc `>= 18.66px` và đậm. */
function thresholdFor({ px, bold }: Metrics): number {
  return px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
}

interface Pair {
  file: string;
  line: number;
  fg: string;
  bg: string;
  ratio: number;
  threshold: number;
  px: number;
  bold: boolean;
  bgSource: string;
}

/** Chuỗi thẻ từ gốc tới `el` — dựng từ ngăn xếp thẻ, nên mọi phần tử trong đó
 *  thật sự còn MỞ tại vị trí của `el`. */
function ancestorChain(elements: Element[], at: number): Element[] {
  return [...elements[at].parents.map((p) => elements[p]), elements[at]];
}

function extractPairs(file: string, src: string): Pair[] {
  const elements = parseElements(src);
  const pairs: Pair[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const style = styleText(el.attrs);
    if (style === null) continue;
    const colors = colorsOfProperty(style, ['color']);
    if (colors.length === 0) continue;

    const chain = ancestorChain(elements, i);
    const metrics = metricsOf(chain);

    // Nền THẬT: của chính thẻ nếu có, nếu không thì của thẻ bao quanh gần nhất.
    let backgrounds: string[] = colorsOfProperty(style, ['background', 'backgroundColor']);
    let bgSource = `${file}:${el.line} (chính thẻ)`;
    if (backgrounds.length === 0) {
      for (let k = chain.length - 2; k >= 0; k--) {
        const parentStyle = styleText(chain[k].attrs);
        const parentBg = parentStyle === null ? [] : colorsOfProperty(parentStyle, ['background', 'backgroundColor']);
        if (parentBg.length > 0) {
          backgrounds = parentBg;
          bgSource = `${file}:${chain[k].line} (thẻ bao quanh)`;
          break;
        }
      }
    }
    if (backgrounds.length === 0) {
      backgrounds = [PAGE_BACKGROUND];
      bgSource = 'body → var(--color-background)';
    }

    // Cùng số nhánh ⇒ ghép theo chỉ số: một biểu thức ba ngôi đặt CẢ chữ và nền
    // thì nhánh `ok` không bao giờ gặp nền của nhánh lỗi. Ghép chéo ở đây là
    // sinh ra cặp không tồn tại, tức báo động giả.
    const combos: Array<[string, string]> =
      colors.length > 1 && colors.length === backgrounds.length
        ? colors.map((c, idx): [string, string] => [c, backgrounds[idx]])
        : colors.flatMap((c) => backgrounds.map((b): [string, string] => [c, b]));

    for (const [fg, bg] of combos) {
      pairs.push({
        file,
        line: el.line,
        fg,
        bg,
        ratio: ratioHex(fg, bg),
        threshold: thresholdFor(metrics),
        px: metrics.px,
        bold: metrics.bold,
        bgSource,
      });
    }
  }
  return pairs;
}

const violationsOf = (pairs: Pair[]): Pair[] => pairs.filter((p) => p.ratio < p.threshold);

const describePair = (p: Pair): string =>
  `${p.file}:${p.line}  ${p.fg} trên ${p.bg} = ${round3(p.ratio)}:1 < ${p.threshold}:1 ` +
  `(${p.px}px${p.bold ? ' đậm' : ''}, nền từ ${p.bgSource})`;

const ALL_PAIRS: Pair[] = SURFACES.flatMap((f) => extractPairs(f, read(f)));

/**
 * Bảng đo đầy đủ, in ra khi chạy với `CONTRAST_TABLE=1`. Vitest cắt ngắn diff
 * của một assertion dài, nên nếu không có đường này thì vòng audit không có
 * cách nào thấy trọn `${ALL_PAIRS.length}` phép đo mà chỉ thấy vài dòng đầu.
 * Đây là bề mặt để Tier 3 tự chạy lại và tự đọc số, không phải để test dùng.
 */
if (process.env.CONTRAST_TABLE === '1') {
  const table = ALL_PAIRS.map(
    (p) =>
      `${p.ratio < p.threshold ? 'FAIL' : 'ok  '} ${p.file}:${p.line}  ${p.fg} / ${p.bg} = ` +
      `${round3(p.ratio)}:1 (ngưỡng ${p.threshold}, ${p.px}px${p.bold ? ' đậm' : ''}) ← ${p.bgSource}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    [
      `--- tập nền từ @theme (${BACKGROUND_TOKENS.length}, đã loại ${TINT}) ---`,
      BACKGROUND_TOKENS.join(' '),
      SYSTEM_BACKGROUNDS.join(' '),
      `PAGE_BACKGROUND = ${PAGE_BACKGROUND}`,
      `--- ${ALL_PAIRS.length} cặp chữ-nền trên ${SURFACES.length} bề mặt ---`,
      ...table,
    ].join('\n'),
  );
}

// ---------------------------------------------------------------------------
// 4. Ngoại lệ ĐÃ KHAI — không phải điểm mù
// ---------------------------------------------------------------------------

/**
 * Sáu cặp DƯỚI ngưỡng mà contract 16 không cho sửa. Cả sáu đều là vi phạm THẬT,
 * đo được, và cả sáu đều nằm ngoài `§4.2` — `§4.2` chỉ mở đúng `worker:341`,
 * `worker:358` và `ctv:273`. `RISK-05` phạt đúng hành vi sửa ngoài phạm vi, nên
 * Tier 2 KHAI ra thay vì tự sửa hoặc tự im.
 *
 * Năm trong sáu cặp là cùng một nguyên nhân: bề mặt NỘI BỘ vẫn dùng
 * `--primary` (`#f26522`), đúng token mà go-live-08 đã đo được `3.153:1` và
 * go-live-15 đã thay bằng `--primary-dark` cho bề mặt CÔNG KHAI. Lượt thay đó
 * không đi vào `worker` và `ctv`. Máy quét ở `EV-10` không thấy chúng vì nó chỉ
 * đọc chuỗi hex, còn năm chỗ này viết bằng `var()`.
 *
 * Bảng này được KHOÁ theo cả tỉ số: sửa xong một chỗ mà quên xoá dòng tương ứng
 * là ĐỎ; xuất hiện một vi phạm thứ bảy cũng ĐỎ. Không có lối nào để nó mục.
 */
interface DeclaredException {
  file: string;
  line: number;
  fg: string;
  bg: string;
  ratio: string;
  note: string;
}

const DECLARED_EXCEPTIONS: DeclaredException[] = [
  {
    file: 'app/worker/page.tsx',
    line: 229,
    fg: '#f26522',
    bg: '#ffffff',
    ratio: '3.153',
    note: 'Nhãn tab ĐANG chọn: var(--primary) trên nền white của chính nút, 14px. Sửa đúng: --primary-dark.',
  },
  {
    file: 'app/ctv/page.tsx',
    line: 150,
    fg: '#ffffff',
    bg: '#f26522',
    ratio: '3.153',
    note: 'Nút "Gửi yêu cầu" trong modal rút tiền: var(--on-primary) trên var(--primary), 14px đậm.',
  },
  {
    file: 'app/ctv/page.tsx',
    line: 234,
    fg: '#f26522',
    bg: '#efeeec',
    ratio: '2.719',
    note: 'Mã giới thiệu <code>: var(--primary) trên var(--surface-container). Biên độ trượt lớn nhất trong sáu chỗ.',
  },
  {
    file: 'app/ctv/page.tsx',
    line: 237,
    fg: '#f26522',
    bg: '#ffffff',
    ratio: '3.153',
    note: 'Nút Copy: var(--primary) trên nền card var(--surface-container-lowest), 12px.',
  },
  {
    file: 'app/ctv/page.tsx',
    line: 278,
    fg: '#ffffff',
    bg: '#f26522',
    ratio: '3.153',
    note: 'Nút "Rút tiền" ở nhánh còn số dư: var(--on-primary) trên var(--primary), 14px đậm.',
  },
  {
    file: 'app/ctv/page.tsx',
    line: 288,
    fg: '#dc2626',
    bg: '#fef2f2',
    ratio: '4.415',
    note: 'Nhánh lỗi của hộp thông báo — đúng cặp màu EV-02 ở 14px. Sửa đúng: var(--color-error).',
  },
];

const isDeclared = (p: Pair): boolean =>
  DECLARED_EXCEPTIONS.some((e) => e.file === p.file && e.line === p.line && e.fg === p.fg && e.bg === p.bg);

// ---------------------------------------------------------------------------
// 5. Fixture âm (RQ-10) — chứng minh hàng rào biết ĐỎ
// ---------------------------------------------------------------------------

const NEGATIVE_FIXTURE = `
export default function Bia() {
  return (
    <div style={{ background: 'white' }}>
      <p className="text-xs" style={{ color: '#bbbbbb' }}>Chu mo bia ra de chung minh hang rao biet DO</p>
    </div>
  );
}
`;

const POSITIVE_FIXTURE = NEGATIVE_FIXTURE.replace("'#bbbbbb'", "'var(--color-on-surface-variant)'");

/** `var(--x, hex)` với `--x` CÓ khai báo: giá trị thật là `--x` (`EV-07`). */
const VAR_FALLBACK_FIXTURE = `
    <div style={{ background: 'white' }}>
      <p className="text-xs" style={{ color: 'var(--on-surface-variant, #94a3b8)' }}>Da co token that</p>
    </div>
`;

// ===========================================================================

describe('go-live-16 / RQ-09 — tập nền đọc từ @theme, không ghim trong test', () => {
  it('khối @theme có thật và đủ token nền để đo', () => {
    expect(THEME.size).toBeGreaterThan(40);
    expect(BACKGROUND_TOKENS.length).toBeGreaterThanOrEqual(5);
    expect(SYSTEM_BACKGROUNDS.length).toBe(BACKGROUND_TOKENS.length);
  });

  it('--color-surface-tint bị loại khỏi tập nền, và lý do loại là đo được', () => {
    expect(THEME.has(TINT)).toBe(true);
    expect(BACKGROUND_TOKENS).not.toContain(TINT);

    // RISK-04: token này trùng --color-primary-dark, tức trùng luôn màu vòng
    // focus. Gộp nó vào tập nền thì sàn của vòng focus tụt xuống 1.000.
    const tint = resolveColor(`var(${TINT})`);
    const ring = resolveColor('var(--color-focus-ring)');
    expect(tint).not.toBeNull();
    expect(ring).not.toBeNull();
    expect(ratioHex(tint as string, ring as string)).toBeCloseTo(1, 3);
    expect(Math.min(floorAcrossSurfaces(ring as string), ratioHex(ring as string, tint as string))).toBeCloseTo(1, 3);
  });

  it('ASM-01 — @theme không khai báo khóa --text-* nào, nên cỡ chữ Tailwind mặc định còn đúng', () => {
    expect([...THEME.keys()].filter((k) => k.startsWith('--text-'))).toEqual([]);
  });

  it('ba token thay thế của round này phân giải đúng giá trị EV-08', () => {
    expect(resolveColor('var(--color-on-surface-variant)')).toBe('#594138');
    expect(resolveColor('var(--color-error)')).toBe('#ba1a1a');
    expect(resolveColor('var(--color-focus-ring)')).toBe('#a63b00');
  });

  it('EV-09 — --color-outline đạt 3:1 nhưng KHÔNG đạt 4.5:1, nên cấm dùng làm màu chữ', () => {
    const outline = resolveColor('var(--color-outline)') as string;
    expect(floorAcrossSurfaces(outline)).toBeGreaterThanOrEqual(3);
    expect(floorAcrossSurfaces(outline)).toBeLessThan(4.5);
  });
});

describe('go-live-16 / RQ-08 — hàng rào phủ cả ba bề mặt theo cặp chữ-nền', () => {
  it('trích được cặp ở CẢ BA tệp, không chỉ ở tệp vừa sửa', () => {
    for (const f of SURFACES) {
      expect(ALL_PAIRS.filter((p) => p.file === f).length).toBeGreaterThan(0);
    }
  });

  it('số cặp đo được lớn hơn nhiều so với ba dòng mà round này sửa', () => {
    // Ba dòng đã sửa: worker:341, worker:358, ctv:273. Nếu con số này tụt về ~3
    // thì bộ trích đã hỏng và hàng rào quay lại đúng điểm mù của EV-10.
    expect(ALL_PAIRS.length).toBeGreaterThanOrEqual(20);
  });

  it('có đo những chỗ round này KHÔNG chạm — nền thật, không phải nền ghim', () => {
    // worker:307 pill nguồn chấm công: #475569 trên nền #f1f5f9 của chính nó.
    const pill = ALL_PAIRS.find((p) => p.file === 'app/worker/page.tsx' && p.fg === '#475569');
    expect(pill).toBeDefined();
    expect((pill as Pair).bg).toBe('#f1f5f9');

    // ctv:268/:269 panel số dư: nền #f0fdf4 của thẻ bao quanh, không phải nền trang.
    const balance = ALL_PAIRS.find((p) => p.file === 'app/ctv/page.tsx' && p.fg === '#15803d');
    expect(balance).toBeDefined();
    expect((balance as Pair).bg).toBe('#f0fdf4');
  });

  it('RQ-01 — hai dòng chữ mờ ở worker đã lên 9.383:1 trên thẻ trắng', () => {
    // Đúng hai dòng mà §4.2 mở: :341 và :358. Nền của cả hai là thẻ card ở :335
    // (`background: 'white'`), một literal nên không đổi theo bất kỳ @theme nào.
    for (const line of [341, 358]) {
      const p = ALL_PAIRS.find((q) => q.file === 'app/worker/page.tsx' && q.line === line);
      expect(p, `không trích được cặp nào ở worker:${line}`).toBeDefined();
      expect((p as Pair).fg).toBe('#594138');
      expect((p as Pair).bg).toBe('#ffffff');
      expect(round3((p as Pair).ratio)).toBe('9.383');
      expect((p as Pair).px).toBe(12);
    }
    // Không còn một cặp nào mang màu cũ, kể cả ở nhánh dự phòng đã phân giải.
    expect(ALL_PAIRS.some((p) => p.fg === '#94a3b8')).toBe(false);
  });

  it('RQ-02 — số nợ hoa hồng ở ctv đã lên 5.906:1 trên panel #fef2f2', () => {
    const debt = ALL_PAIRS.find(
      (p) => p.file === 'app/ctv/page.tsx' && p.fg === '#ba1a1a' && p.bg === '#fef2f2',
    );
    expect(debt).toBeDefined();
    expect(round3((debt as Pair).ratio)).toBe('5.906');
    expect((debt as Pair).threshold).toBe(4.5); // 18px đậm CHƯA phải chữ lớn
  });

  it('mọi cặp chữ-nền của ba bề mặt đạt ngưỡng của cỡ chữ đó', () => {
    const open = violationsOf(ALL_PAIRS).filter((p) => !isDeclared(p));
    expect(open.map(describePair)).toEqual([]);
  });
});

describe('go-live-16 / RQ-08 — ngoại lệ phải được KHAI, và không được mục', () => {
  it('tập vi phạm còn mở KHỚP CHÍNH XÁC bảng đã khai, không thừa không thiếu', () => {
    const measured = violationsOf(ALL_PAIRS)
      .map((p) => `${p.file}:${p.line} ${p.fg}/${p.bg} ${round3(p.ratio)}`)
      .sort();
    const declared = DECLARED_EXCEPTIONS.map((e) => `${e.file}:${e.line} ${e.fg}/${e.bg} ${e.ratio}`).sort();
    // Lệch theo chiều nào cũng ĐỎ: thêm vi phạm mới, hay sửa xong mà quên xoá dòng.
    expect(measured).toEqual(declared);
  });

  it('sáu ngoại lệ, năm trong đó cùng một nguyên nhân --primary trên bề mặt nội bộ', () => {
    expect(DECLARED_EXCEPTIONS).toHaveLength(6);
    const primary = resolveColor('var(--color-primary)') as string;
    const byPrimary = DECLARED_EXCEPTIONS.filter((e) => e.fg === primary || e.bg === primary);
    expect(primary).toBe('#f26522');
    expect(byPrimary).toHaveLength(5);
  });

  it('mọi ngoại lệ nằm NGOÀI ba dòng mà §4.2 mở cho round này', () => {
    const inScope = ['app/worker/page.tsx:341', 'app/worker/page.tsx:358', 'app/ctv/page.tsx:273'];
    for (const e of DECLARED_EXCEPTIONS) {
      expect(inScope).not.toContain(`${e.file}:${e.line}`);
    }
  });
});

describe('go-live-16 / RQ-10 — fixture âm chứng minh hàng rào biết ĐỎ', () => {
  it('cặp bịa dưới ngưỡng bị bắt', () => {
    const v = violationsOf(extractPairs('fixture-am.tsx', NEGATIVE_FIXTURE));
    expect(v).toHaveLength(1);
    expect(v[0].fg).toBe('#bbbbbb');
    expect(v[0].bg).toBe('#ffffff');
    expect(v[0].threshold).toBe(4.5);
    expect(v[0].ratio).toBeLessThan(2);
  });

  it('cùng fixture đó, đổi sang token thật thì XANH', () => {
    const pairs = extractPairs('fixture-duong.tsx', POSITIVE_FIXTURE);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].fg).toBe('#594138');
    expect(violationsOf(pairs)).toEqual([]);
  });

  it('EV-07 — var(--x, hex) với --x có khai báo KHÔNG bị báo lỗi', () => {
    const pairs = extractPairs('fixture-var.tsx', VAR_FALLBACK_FIXTURE);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].fg).toBe('#594138'); // KHÔNG phải nhánh dự phòng #94a3b8
    expect(violationsOf(pairs)).toEqual([]);
  });

  it('nhánh ba ngôi ghép theo chỉ số, không ghép chéo thành cặp không tồn tại', () => {
    const ternary = `
      <div className="text-sm" style={{
        background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
        color: msg.type === 'ok' ? '#15803d' : '#111111',
      }}>x</div>
    `;
    const pairs = extractPairs('fixture-ba-ngoi.tsx', ternary);
    expect(pairs).toHaveLength(2);
    expect(pairs.map((p) => `${p.fg}/${p.bg}`)).toEqual(['#15803d/#f0fdf4', '#111111/#fef2f2']);
  });
});

describe('go-live-16 / RQ-03, RQ-04 — vòng focus 2px màu var(--color-focus-ring)', () => {
  const RING = 'focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]';

  it('hai ô nhập trang đăng nhập đều có vòng focus, không còn outline-none trần', () => {
    const src = read('app/login/login-form.tsx');
    const inputs = parseElements(src).filter((el) => el.tag === 'input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    for (const el of inputs) {
      const cls = classNameOf(el.attrs) ?? '';
      expect(cls, `input dòng ${el.line} thiếu vòng focus`).toContain(RING);
    }
  });

  it('ba chỗ focus trong hai primitive dùng cùng token, và ba mẫu cam cũ đã đi', () => {
    const table = read('src/shared/ui/data-table/data-table.tsx');
    const card = read('src/shared/ui/entity-card/entity-card.tsx');

    // Chỉ ba chuỗi className mà §4.2 mở, không phải mọi màu cam trong tệp: hai
    // primitive này còn nhiều lớp cam thương hiệu hợp lệ ngoài phạm vi round này
    // (`ring-orange-500` của checkbox, `ring-orange-300` của focus-within card).
    expect(table).not.toContain('focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200');
    expect(table).not.toContain('focus:border-orange-400 focus:outline-none"');
    expect(card).not.toContain('"block w-full text-left focus:outline-none"');

    expect([...table.matchAll(/ring-\[var\(--color-focus-ring\)\]/g)]).toHaveLength(2);
    expect([...card.matchAll(/ring-\[var\(--color-focus-ring\)\]/g)]).toHaveLength(1);
    for (const src of [table, card]) {
      expect([...src.matchAll(/focus-visible:ring-2/g)].length).toBeGreaterThan(0);
    }
  });

  it('màu vòng focus đạt ngưỡng thành phần 3:1 trên MỌI nền của hệ', () => {
    const ring = resolveColor('var(--color-focus-ring)') as string;
    expect(floorAcrossSurfaces(ring)).toBeGreaterThanOrEqual(3);
  });
});
