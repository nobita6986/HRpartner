/**
 * public-ui-premium.static.test.ts — go-live-08 / RQ-14 / STEP-08 / AC-14.
 *
 * Vì sao hàng rào của round này là test TĨNH đọc cây nguồn: repo không có một
 * mảnh công cụ trình duyệt nào (0 file `*.test.tsx`, 0 match playwright /
 * puppeteer / cypress / jsdom), nên `getComputedStyle`, ảnh chụp và điều hướng
 * bàn phím KHÔNG đo được ở lane unit. Những nửa AC đó được báo `BLOCKED` kèm
 * `ENV_BLOCKED` trong HANDOFF. Phần CÒN LẠI — vốn là toàn bộ bất biến mà một
 * lần sửa vô tình có thể phá — đều đo được bằng cách đọc chính nguồn, và đó là
 * việc của file này.
 *
 * Hai quy tắc đo của dự án được tuân thủ ở đây:
 *   1. Comment KHÔNG được đổi kết luận của phép đo. Mọi phép đếm trên CSS chạy
 *      trên bản đã bóc comment (`cssCode`), vì một chuỗi nằm trong comment thì
 *      chết trong bundle. Ngoại lệ duy nhất là phép băm vùng được bảo vệ — ở
 *      đó comment LÀ phần của bằng chứng nên phải giữ nguyên văn.
 *   2. Mọi phép băm chuẩn hoá LF. Cây làm việc Windows có CRLF
 *      (`core.autocrlf=true`) còn index là LF; không chuẩn hoá thì test chỉ
 *      xanh trên một trong hai.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = 'app/globals.css';
const PAGE = 'app/(portal)/page.tsx';
const NAV = 'app/components/GlobalNavbar.tsx';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

const css = read(CSS);
const page = read(PAGE);
const nav = read(NAV);

/** Bản CSS đã bóc comment — dùng cho MỌI phép đếm và mọi phép đọc quy tắc. */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Dải CSS do round này thêm vào: từ tiêu đề khối tới ngay trước vùng bị khoá.
 *
 * Khối này KHÔNG nằm ở cuối tệp. Hàng rào `R2-02` của
 * `src/shared/ui/design-tokens.static.test.ts` cắt CSS từ khối @media giảm
 * chuyển động tới HẾT TỆP rồi đòi mọi quy tắc trong dải đó huỷ transform bằng
 * `!important`; tiền đề của nó là khối hàng rào nằm cuối tệp (baseline `:360` =
 * EOF). Nên dải của round này phải đứng TRƯỚC vùng khoá `RQ-12`, và mọi phép
 * đếm ở đây phải cắt đúng dải đó — không được trùm sang CSS đã chết.
 */
const NEW_HEAD = 'GO-LIVE-08 — LỚP TRÌNH BÀY CHO BỀ MẶT CÔNG KHAI ĐANG SỐNG';
const DEAD_HEAD = 'Public job board (layout bam S05_JobBoard_Public_1440.html';
const newCssCode = (() => {
  const i = css.indexOf(NEW_HEAD);
  expect(i, `${CSS}: không tìm thấy tiêu đề khối của round này`).toBeGreaterThanOrEqual(0);
  const d = css.indexOf(DEAD_HEAD);
  expect(d, `${CSS}: không tìm thấy tiêu đề vùng CSS đã chết`).toBeGreaterThan(i);
  const end = css.lastIndexOf('/*', d);
  // Bắt đầu SAU dấu đóng của comment tiêu đề. Cắt từ chính chuỗi tiêu đề thì
  // dải mở ra ở GIỮA một comment: phần thân còn lại không còn `/*` mở đầu nên
  // phép bóc comment lệch pha và văn xuôi lọt vào chỗ đo. Đó là cách một phép
  // đếm có thể fail-OPEN mà vẫn xanh.
  const start = css.indexOf('*/', i) + 2;
  expect(start, `${CSS}: comment tiêu đề khối không đóng`).toBeGreaterThan(i);
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
})();

/** Trích khối từ `head` tới dấu ngoặc nhọn cân bằng — chịu được @media lồng. */
function block(source: string, head: string): string {
  const i = source.indexOf(head);
  expect(i, `không tìm thấy khối "${head}"`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let j = i; j < source.length; j += 1) {
    if (source[j] === '{') depth += 1;
    else if (source[j] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(i, j + 1);
    }
  }
  throw new Error(`khối "${head}" không đóng`);
}

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/** Thân của phần tử mang `anchor`, tính tới thẻ đóng `close` — đủ để thấy mọi
 *  attribute của chính phần tử đó mà không phải cân bằng JSX. */
function element(source: string, anchor: string, close: string): string {
  const i = source.indexOf(anchor);
  expect(i, `không tìm thấy phần tử mang "${anchor}"`).toBeGreaterThanOrEqual(0);
  const j = source.indexOf(close, i);
  expect(j, `phần tử "${anchor}" không đóng bằng ${close}`).toBeGreaterThan(i);
  return source.slice(i, j);
}

// ═══ RQ-01 / AC-01 — ba nhóm token mới, không token cũ nào đổi giá trị ═══════

/** Giá trị token đọc từ khối theme. */
function token(name: string): string {
  const m = cssCode.match(new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, 'm'));
  expect(m, `${CSS}: không tìm thấy token ${name}`).not.toBeNull();
  return m![1].trim();
}

describe('go-live-08 / RQ-01 — token mới cộng bảo toàn token cũ', () => {
  it('thêm đúng ba nhóm token: bậc bóng hover, màu vòng focus, thời lượng thứ hai', () => {
    expect(token('--shadow-card-hover')).toBe(
      '0 2px 6px rgba(26, 28, 27, 0.06), 0 14px 32px rgba(242, 101, 34, 0.14)',
    );
    expect(token('--color-focus-ring')).toBe('var(--color-primary-dark)');
    expect(token('--t-medium')).toBe('220ms');
  });

  it('mọi token cũ mà round này dựa vào vẫn giữ nguyên giá trị', () => {
    expect(token('--t-fast')).toBe('150ms');
    expect(token('--shadow-card')).toBe(
      '0 1px 2px rgba(26, 28, 27, 0.04), 0 6px 18px rgba(242, 101, 34, 0.08)',
    );
    expect(token('--spacing-card-padding')).toBe('24px');
    expect(token('--color-primary')).toBe('#f26522');
    expect(token('--color-primary-dark')).toBe('#a63b00');
    expect(token('--color-primary-soft')).toBe('#fdf1ec');
    expect(token('--color-surface')).toBe('#ffffff');
    expect(token('--color-surface-container')).toBe('#efeeec');
    expect(token('--color-surface-container-low')).toBe('#f4f3f1');
    expect(token('--ease-out')).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('mọi biến mà dải CSS mới tham chiếu đều được khai báo — không var() chết', () => {
    const used = [...newCssCode.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThanOrEqual(20);
    const declared = new Set([...cssCode.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)].map((m) => m[1]));
    expect([...new Set(used)].filter((v) => !declared.has(v))).toEqual([]);
  });
});

// ═══ RQ-02/03/04 / AC-02/03/04 — card việc làm ══════════════════════════════

describe('go-live-08 / RQ-02, RQ-03, RQ-04 — card việc làm', () => {
  const base = block(cssCode, '.hrp-card {');
  const hover = block(cssCode, '.hrp-card:hover {');

  it('bóng nghỉ là token của design system, không phải bóng mặc định framework', () => {
    expect(base).toContain('box-shadow: var(--shadow-card);');
    // Utility bóng của framework đã bị BỎ khỏi className thay vì để chồng lên nhau.
    expect(page).not.toContain('shadow-sm hover:shadow-md');
    expect(page).toContain('className="hrp-card nav-item-lift');
  });

  it('padding card bằng token 24px và cỡ tên việc làm đã tăng cấp', () => {
    expect(base).toContain('padding: var(--spacing-card-padding);');
    expect(page).toContain('<h3 className="text-lg font-bold"');
    expect(page).not.toContain('<h3 className="text-base font-bold"');
  });

  it('tên đơn vị và địa điểm vẫn dùng token xám dịu', () => {
    expect(page).toContain("<p className=\"text-xs truncate\" style={{ color: 'var(--color-on-surface-variant)' }}>");
    expect(block(cssCode, '.hrp-pill-location {')).toContain('color: var(--color-on-surface-variant);');
  });

  it('hover có ĐỒNG THỜI ba hiệu ứng trong CÙNG một quy tắc', () => {
    expect(hover).toContain('transform: translateY(-2px);');
    expect(hover).toContain('box-shadow: var(--shadow-card-hover);');
    // primary-dark, KHONG primary: 2.997:1 tren --color-background thieu nguong 3:1.
    expect(hover).toContain('border-color: var(--color-primary-dark);');
  });

  it('transition phủ đủ ba thuộc tính và thời lượng vào tối đa 250ms', () => {
    const props = block(cssCode, '.hrp-card {').match(/transition-property:\s*([^;]+);/)![1];
    expect(props.split(',').map((p) => p.trim()).sort()).toEqual(
      ['border-color', 'box-shadow', 'transform'],
    );
    expect(base).toContain('transition-duration: var(--t-fast);');
    expect(hover).toContain('transition-duration: var(--t-medium);');
    const enter = Number(token('--t-medium').replace('ms', ''));
    const exit = Number(token('--t-fast').replace('ms', ''));
    expect(enter).toBeLessThanOrEqual(250);
    // rule `exit-faster-than-enter`: chiều ra tối đa 70% chiều vào.
    expect(exit).toBeLessThanOrEqual(enter * 0.7);
  });
});

// ═══ RQ-05/06 / AC-05/06 — pill và panel bộ lọc ═════════════════════════════

describe('go-live-08 / RQ-05, RQ-06 — phân hoá nền', () => {
  it('pill địa điểm dùng nền cam rất nhạt, pill ca làm giữ nền trung tính', () => {
    const neutral = block(cssCode, '.hrp-pill {');
    const location = block(cssCode, '.hrp-pill-location {');
    expect(neutral).toContain('background-color: var(--color-surface-container);');
    expect(location).toContain('background-color: var(--color-primary-soft);');
    expect(token('--color-primary-soft')).not.toBe(token('--color-surface-container'));
  });

  it('cả hai pill vẫn bo tròn hết cạnh và vẫn giữ icon', () => {
    expect(page).toContain('className="hrp-pill-location flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"');
    expect(count(page, 'className="hrp-pill flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"')).toBe(2);
    for (const ligature of ['badge', 'location_on', 'schedule']) {
      expect(page).toContain(`className="material-symbols-outlined text-[14px]">${ligature}</span>`);
    }
  });

  it('nền panel bộ lọc KHÁC nền card, và là token xám rất nhạt', () => {
    expect(block(cssCode, '.hrp-panel {')).toContain('background-color: var(--color-surface-container-low);');
    expect(token('--color-surface-container-low')).not.toBe(token('--color-surface'));
    expect(page).toContain('className="hrp-panel rounded-xl border border-outline-variant/50');
    expect(page).not.toContain('className="bg-surface rounded-xl border');
  });
});

// ═══ RQ-07 / AC-07 — vòng focus ═════════════════════════════════════════════

describe('go-live-08 / RQ-07 — vòng focus phủ đủ mọi control', () => {
  it('vòng focus toàn cục (tài sản của 474f3dc) còn nguyên trong nguồn', () => {
    // Neo bằng ĐẦU DÒNG: ':focus-visible {' là chuỗi con của
    // '.hrp-focus:focus-visible {' và '.hrp-field:focus-visible {' (3 lần khớp), mà
    // dải của round này nằm TRƯỚC quy tắc toàn cục — tìm theo chuỗi con bắt nhầm.
    expect(block(cssCode, '\n:focus-visible {')).toBe(
      '\n:focus-visible {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 2px;\n}',
    );
  });

  it('lớp vòng focus của bề mặt công khai dùng token màu riêng, dày 2px', () => {
    const r = block(cssCode, '.hrp-focus:focus-visible {');
    expect(r).toContain('outline: 2px solid var(--color-focus-ring);');
    expect(r).toContain('outline-offset: 2px;');
  });

  it('không một control nào bị tắt vòng focus — phép đo BẢO TOÀN, trước và sau đều 0', () => {
    expect(count(page, 'outline-none')).toBe(0);
    expect(count(nav, 'outline-none')).toBe(0);
    expect(count(css, 'outline: none')).toBe(0);
  });

  it('cả 15 control tương tác của trang landing đều mang lớp vòng focus', () => {
    // go-live-09 / RQ-22 — hai phép đếm dưới đây được NÂNG, kèm itemise từng control mới.
    //
    // `hrp-focus` 8 → 12. Tám của go-live-08 còn nguyên: tiêu đề card, Ứng tuyển, Lưu việc, thân
    // `FacetSelect`, ô từ khoá của panel, Tìm kiếm, Thử lại, Xem thêm. Bốn control MỚI của 09:
    //   1. `page:459`  nút `Ứng tuyển ngay` của card nổi bật nửa phải Hero (`RQ-08`)
    //   2. `page:497`  nút tag của hai dải theo trục — khu vực và ca làm (`RQ-13`, `RQ-14`)
    //   3. `page:781`  ô từ khoá của Hero (`RQ-05`) — id riêng, KHÔNG phải ô của panel
    //   4. `page:813`  nút `Tìm việc` của Hero (`RQ-05`)
    //
    // `<FacetSelect` 2 → 4: Hero thêm ô khu vực và ô mức lương tối thiểu (`RQ-05`, `RQ-07`,
    // `DEC-12`). Cả hai dùng LẠI đúng component này thay vì dựng `<select>` thứ hai, nên phép đếm
    // element native ở `RQ-08` không bị chạm.
    //
    // Số control khi render: 12 lần xuất hiện trong nguồn, trong đó thân `FacetSelect` được dùng
    // bốn lần ⇒ 12 - 1 + 4 = 15.
    expect(count(page, 'hrp-focus')).toBe(12);
    expect(count(page, '<FacetSelect')).toBe(4);
    expect(count(nav, 'hrp-focus')).toBe(4);
  });
});

// ═══ RQ-08 / AC-08 — select bộ lọc vẫn native ═══════════════════════════════

describe('go-live-08 / RQ-08 — select bộ lọc', () => {
  it('vẫn là element native, vẫn appearance-none, vẫn có chevron', () => {
    expect(page).toContain('<select');
    expect(count(page, 'appearance-none')).toBe(1);
    expect(page).toContain('expand_more');
    expect(page).toContain('hrp-field hrp-focus w-full appearance-none');
  });

  it('hover và focus cho hai giá trị border-color KHÁC nhau', () => {
    expect(block(cssCode, '.hrp-field:hover {')).toContain('border-color: var(--color-outline);');
    expect(block(cssCode, '.hrp-field:focus-visible {')).toContain('border-color: var(--color-primary-dark);');
    expect(token('--color-outline')).not.toBe(token('--color-primary-dark'));
    // Bac nghi ke thua tu baseline; ba bac phai la ba gia tri khac nhau.
    expect(token('--color-outline-variant')).not.toBe(token('--color-outline'));
  });

  it('checkbox không còn tồn tại trên bề mặt này — trước và sau đều 0 (EV-31, DEC-18)', () => {
    expect(count(page, 'type="checkbox"')).toBe(0);
  });
});

// ═══ RQ-09 / AC-09 — nút biểu đạt bằng class token, không inline style ═══════

describe('go-live-08 / RQ-09 — trạng thái nút', () => {
  it('bốn nút xác thực và hai nút hành động không còn đặt màu tương tác bằng inline style', () => {
    // Đo THEO PHẦN TỬ, không theo tệp: avatar (:31) và menu người dùng vẫn dùng
    // cơ chế inline cũ của chúng, nằm NGOÀI phạm vi RQ-09 và không được sửa.
    for (const anchor of ['href="/login"', 'href="/register"']) {
      const el = element(nav, anchor, '</Link>');
      expect(el, `${anchor} còn inline style`).not.toContain('style={{');
      expect(el, `${anchor} còn onMouse`).not.toContain('onMouse');
      expect(el).toMatch(/hrp-btn-(outline|primary)/);
    }
    // Neo vào attribute ĐẦU TIÊN của phần tử, không vào className: slice tính xuôi
    // nên neo giữa thẻ sẽ bỏ sót mọi attribute đứng trước — kể cả style={{}}.
    for (const el of [
      element(page, 'onClick={() => onApply(job)}', '</button>'),
      element(page, 'type="submit"', '</button>'),
    ]) {
      expect(el).not.toContain('style={{');
      expect(el).not.toContain('onMouse');
    }
  });

  it('bốn cặp handler màu của baseline trên nút xác thực đã biến mất', () => {
    // baseline c6256e7: onMouseEnter 5 → 3, currentTarget.style.backgroundColor 8 → 4.
    // Bốn cái còn lại thuộc menu người dùng + nút đăng xuất, có từ trước round này.
    expect(count(nav, 'onMouseEnter')).toBe(3);
    expect(count(nav, 'currentTarget.style.backgroundColor')).toBe(4);
    // `transition-colors` 6 → 4: bỏ đúng hai cái trên nút xác thực (transition-colors
    // của Tailwind gồm cả `color`, ngoài allowlist RQ-23). Bốn cái còn lại nằm trên
    // nav link + menu người dùng — ngoài phạm vi, không được chạm.
    expect(count(nav, 'transition-colors')).toBe(4);
    expect(count(page, 'transition-colors')).toBe(0);
  });

  it('nút chính có hover đậm lên cộng scale rất nhẹ, và có trạng thái nhấn riêng', () => {
    const hover = block(cssCode, '.hrp-btn-primary:hover:not(:disabled) {');
    expect(hover).toContain('background-color: var(--color-primary-dark);');
    expect(hover).toContain('transform: scale(1.02);');
    const active = block(cssCode, '.hrp-btn-primary:active:not(:disabled) {');
    // Nhấn KHÔNG được mang transform: hàng rào giảm chuyển động chỉ phủ :hover.
    expect(active).toContain('transform: none;');
    expect(active).toContain('background-color: var(--color-primary-dark);');
  });

  it('nút outline được fill nền khi hover và có trạng thái nhấn', () => {
    expect(block(cssCode, '.hrp-btn-outline {')).toContain('background-color: transparent;');
    expect(block(cssCode, '.hrp-btn-outline:hover {')).toContain('background-color: var(--color-primary-soft);');
    expect(block(cssCode, '.hrp-btn-outline:active {')).toContain('background-color: var(--color-primary-fixed);');
    expect(nav).toContain('hrp-btn-outline hrp-focus');
  });

  it('trạng thái không bấm được của nút Ứng tuyển nói rõ bằng con trỏ, và nhánh chết đã đi', () => {
    // Hai quy tắc CSS giữ NGUYÊN phép đo: `app/globals.css` không bị task 09 chạm một byte.
    expect(block(cssCode, '.hrp-btn-muted {')).toContain('cursor: not-allowed;');
    expect(block(cssCode, '.hrp-btn-done {')).toContain('cursor: default;');
    // go-live-09 / RQ-23 — mặt chữ được ghim ở đây ĐỔI vì `isFull` là nhánh không bao giờ chạy được:
    // `toDto` chỉ trả việc CÒN chỗ (`EV-09`), nên `availableSlots === 0` không tới được UI. Phép đo
    // được SIẾT, không nới: một `toContain` cũ thành HAI khẳng định. Vế dưới là vế mạnh hơn — nó cấm
    // lớp của nhánh chết quay lại trang, điều bản cũ không cấm được vì bản cũ ĐÒI chuỗi đó có mặt.
    expect(page).toContain("isApplied ? 'hrp-btn-done' : 'hrp-btn-primary nav-item-lift'");
    expect(page).not.toContain('hrp-btn-muted');
  });
});

// ═══ RQ-11 / AC-11 — lớp trình bày KHÔNG chạm tầng dữ liệu ═══════════════════

/**
 * Vì sao bảo toàn tầng dữ liệu cần assertion riêng: round này sửa 91 dòng của
 * `app/(portal)/page.tsx` và mọi dòng đều là class/attribute. Nhưng "tôi chỉ
 * định sửa class" không phải hàng rào — `git diff` của một lần sửa sau này có
 * thể chạm vào chính những hàm dưới đây mà không một AC nào khác đỏ, vì các AC
 * còn lại chỉ đo bề mặt trình bày. Nên các mỏ neo dữ liệu được khoá bằng chuỗi
 * nguyên văn: hàm làm giàu, hàm khử trùng, hàm dựng query, đường gọi API, nhãn
 * đơn vị trên card, và HAI nguồn lựa chọn của bộ lọc.
 *
 * `facets` là chi tiết quan trọng: sau go-live-05, dropdown KHÔNG còn danh sách
 * gắn cứng trong trang — mọi lựa chọn đến từ facets do API tính trên toàn tập
 * public hợp lệ. Khoá `options={facets.areas}` / `options={facets.shifts}` là
 * khoá đúng bất biến đó, chứ không phải khoá một mảng hằng đã bị xoá.
 */
describe('go-live-08 / RQ-11 — tầng dữ liệu của trang công khai còn nguyên', () => {
  it('ba hàm dữ liệu và đường gọi API giữ nguyên chữ ký', () => {
    expect(page).toContain('function enrichJob(job: PublicJobDto): EnrichedJob {');
    expect(page).toContain('function dedupeById(list: EnrichedJob[]): EnrichedJob[] {');
    expect(page).toContain('function buildQuery(filters: JobSearchFilters, offset: number): string {');
    expect(page).toContain('await fetch(`/api/jobs?${buildQuery(filters, offset)}`');
    expect(page).toContain("{ cache: 'no-store', signal: controller.signal }");
    expect(page).toContain('.map(enrichJob)');
    expect(page).toContain("dedupeById([...prev, ...incoming])");
  });

  it('nhãn đơn vị trên card vẫn là ba lời gọi summaryLabel với nguyên văn fallback', () => {
    expect(page).toContain("summaryLabel(job.positions, 'Vị trí đang cập nhật')");
    expect(page).toContain("summaryLabel(job.locations, 'Địa điểm đang cập nhật')");
    expect(page).toContain("summaryLabel(job.shifts, 'Thời gian đang cập nhật')");
    expect(count(page, 'summaryLabel(job.')).toBe(3);
  });

  it('nguồn lựa chọn của bộ lọc vẫn là facets từ API, không phải mảng gắn cứng', () => {
    expect(page).toContain('const [facets, setFacets] = useState<PublicJobFacets>(EMPTY_FACETS);');
    expect(page).toContain('setFacets(data.facets ?? EMPTY_FACETS);');
    expect(page).toContain('options={facets.areas}');
    expect(page).toContain('options={facets.shifts}');
    expect(page).toContain('allLabel="Tất cả tỉnh/thành"');
    expect(page).toContain('allLabel="Tất cả ca làm việc"');
    // EV-02 của go-live-05: nhãn ca làm việc là dữ liệu, không phải trình bày.
    // Xoá nó ở lane này là sửa sai bề mặt và bị cấm đích danh.
    expect(page).toContain('EMPTY_FACETS: PublicJobFacets = { areas: [], shifts: [] }');
  });
});

// ═══ RQ-13 / AC-13 — tương phản đo bằng SỐ, không bằng lời văn ══════════════

/**
 * Vì sao tỉ số tương phản được TÍNH trong test chứ không chỉ chép vào HANDOFF:
 * mọi con số viết trong văn bản đều mục ngay khi ai đó đổi một token, và
 * `RISK-08` của contract nói đúng rằng lane này có thói quen audit bằng lời
 * văn. Đặt phép tính vào hàng rào thì ngưỡng 4.5:1 và 3:1 trở thành thứ CHẠY
 * được, và mã màu thật được đọc từ chính `app/globals.css` thay vì viết lại.
 *
 * Hai mép của một đường viền kề HAI màu khác nhau (nền của chính phần tử ở
 * trong, nền của phần tử cha ở ngoài) nên mỗi viền có hai dòng trong bảng.
 * Đó là lý do `--color-primary` bị loại khỏi mọi đường viền mới: nó đạt
 * 3.15:1 trên nền trắng nhưng chỉ 2.997:1 trên nền body và 2.84:1 trên nền
 * panel — dưới ngưỡng 3:1 ở đúng những mép mà bề mặt này thật sự có.
 */

/** Độ chói tương đối theo WCAG 2.x. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const lin = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Mã màu thật của một token, lần theo cả `var(--x)` gián tiếp. */
function hexOf(name: string): string {
  const v = token(name);
  const m = v.match(/^var\((--[a-z0-9-]+)\)$/);
  return m ? hexOf(m[1]) : v;
}

const ratio = (a: string, b: string): number => {
  const [la, lb] = [luminance(hexOf(a)), luminance(hexOf(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** [nhãn, màu chữ, màu nền] — mọi cặp CHỮ mà round này sinh ra. */
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['.hrp-pill-location', '--color-on-surface-variant', '--color-primary-soft'],
  ['.hrp-panel chữ chính', '--color-on-surface', '--color-surface-container-low'],
  ['.hrp-panel chữ phụ', '--color-on-surface-variant', '--color-surface-container-low'],
  ['.hrp-btn-primary:hover', '--color-on-primary', '--color-primary-dark'],
  ['.hrp-btn-outline nghỉ', '--color-primary-dark', '--color-surface'],
  ['.hrp-btn-outline:hover', '--color-primary-dark', '--color-primary-soft'],
  ['.hrp-btn-outline:active', '--color-primary-dark', '--color-primary-fixed'],
  ['.hrp-btn-ghost:hover', '--color-primary-dark', '--color-primary-soft'],
  ['.hrp-btn-muted', '--color-on-surface-variant', '--color-surface-container'],
  ['.hrp-skip', '--color-primary-dark', '--color-surface'],
];

/** [nhãn, màu biên hoặc chỉ báo, màu kề nó] — hai mép ⇒ hai dòng mỗi viền. */
const UI_PAIRS: Array<[string, string, string]> = [
  ['vòng focus / nền surface', '--color-focus-ring', '--color-surface'],
  ['vòng focus / nền body', '--color-focus-ring', '--color-background'],
  ['vòng focus / nền panel', '--color-focus-ring', '--color-surface-container-low'],
  ['vòng focus / nền primary-soft', '--color-focus-ring', '--color-primary-soft'],
  ['viền .hrp-card:hover mép trong', '--color-primary-dark', '--color-surface'],
  ['viền .hrp-card:hover mép ngoài', '--color-primary-dark', '--color-background'],
  ['viền .hrp-field:hover mép trong', '--color-outline', '--color-surface'],
  ['viền .hrp-field:hover mép ngoài', '--color-outline', '--color-surface-container-low'],
  ['viền .hrp-field:focus mép trong', '--color-primary-dark', '--color-surface'],
  ['viền .hrp-field:focus mép ngoài', '--color-primary-dark', '--color-surface-container-low'],
  ['viền .hrp-btn-outline:hover trong', '--color-primary-dark', '--color-primary-soft'],
  ['viền .hrp-btn-outline:hover ngoài', '--color-primary-dark', '--color-surface'],
  ['viền .hrp-btn-outline:active trong', '--color-primary-dark', '--color-primary-fixed'],
  ['viền .hrp-skip mép trong', '--color-primary-dark', '--color-surface'],
  ['nền .hrp-btn-primary / nền card', '--color-primary', '--color-surface'],
];

describe('go-live-08 / RQ-13 — tương phản của mọi cặp màu MỚI', () => {
  it('mọi cặp chữ trên nền mới đạt tối thiểu 4.5:1', () => {
    for (const [label, fg, bg] of TEXT_PAIRS) {
      expect(ratio(fg, bg), `${label}: ${fg} trên ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('mọi thành phần giao diện mới đạt tối thiểu 3:1 trên CẢ HAI mép', () => {
    for (const [label, fg, bg] of UI_PAIRS) {
      expect(ratio(fg, bg), `${label}: ${fg} kề ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('--color-primary bị loại khỏi mọi đường viền mới, có lý do bằng số', () => {
    // Ba số này LÀ lý do. Nếu một ngày token đổi và chúng vượt 3:1 thì test
    // đỏ, và lúc đó chọn lại token là quyết định có căn cứ, không phải quán tính.
    expect(ratio('--color-primary', '--color-background')).toBeLessThan(3);
    expect(ratio('--color-primary', '--color-surface-container-low')).toBeLessThan(3);
    expect(ratio('--color-primary', '--color-primary-soft')).toBeLessThan(3);
    // Trong CẢ dải CSS mới, --color-primary chỉ còn ĐÚNG MỘT lần dùng, và đó là
    // NỀN của nút chính — không phải một đường biên. Đếm trên dải đã bỏ comment.
    expect(count(newCssCode, 'var(--color-primary)')).toBe(1);
    expect(newCssCode).toContain('background-color: var(--color-primary);');
    expect(newCssCode).not.toContain('border-color: var(--color-primary);');
    expect(newCssCode).not.toContain('border: 1px solid var(--color-primary);');
  });

  it('hai cặp DƯỚI ngưỡng đều là giá trị kế thừa, khoá lại để không trôi', () => {
    // Nút chính ở trạng thái NGHỈ: chữ trắng trên --color-primary. Baseline
    // c6256e7 đã sơn đúng cặp này bằng inline style; RQ-09 yêu cầu CHUYỂN nó
    // sang class, không yêu cầu đổi giá trị, và đổi giá trị token nằm ngoài
    // scope §4.2. Hạ nó xuống dưới 3:1 hoặc lặng lẽ đổi màu thương hiệu đều
    // là sai; ghi số ra đây để Tier 1 quyết.
    expect(ratio('--color-on-primary', '--color-primary')).toBeGreaterThan(3);
    expect(ratio('--color-on-primary', '--color-primary')).toBeLessThan(4.5);
    // Nút Ứng tuyển ở trạng thái ĐÃ NỘP: cũng là cặp của baseline.
    expect(ratio('--color-success', '--color-success-soft')).toBeGreaterThan(4.4);
    expect(ratio('--color-success', '--color-success-soft')).toBeLessThan(4.5);
    // Cả hai cặp phải KHỚP baseline từng mã màu — bằng chứng là kế thừa.
    expect(hexOf('--color-primary')).toBe('#f26522');
    expect(hexOf('--color-on-primary')).toBe('#ffffff');
    expect(hexOf('--color-success')).toBe('#16803a');
    expect(hexOf('--color-success-soft')).toBe('#e7f4ec');
  });
});

// ═══ Hàng rào của chính PHÉP ĐO — chống lệch pha comment ════════════════════

/**
 * Một phép đếm trên CSS chỉ đáng tin khi việc bóc comment không lệch pha. Ba
 * bất biến dưới đây khoá đúng chỗ đó: số dấu mở bằng số dấu đóng, và sau khi
 * bóc thì KHÔNG còn mảnh comment nào trong hai dải đang được đo. Trước khi có
 * chúng, một dấu mở comment lọt vào văn xuôi đã kéo văn bản vào vùng đo và làm
 * một phép đếm transform ra 3 thay vì 2 — xanh, nhưng sai theo chiều mở.
 */
describe('go-live-08 — phép đo tự bảo vệ khỏi lệch pha comment', () => {
  it('số dấu mở comment bằng số dấu đóng trong app/globals.css', () => {
    expect(count(css, '/*')).toBe(count(css, '*/'));
  });

  it('hai dải đang đo không còn mảnh comment nào sau khi bóc', () => {
    for (const [name, code] of [
      ['cssCode', cssCode],
      ['newCssCode', newCssCode],
    ] as const) {
      expect(code, `${name}: còn dấu mở comment`).not.toContain('/*');
      expect(code, `${name}: còn dấu đóng comment`).not.toContain('*/');
    }
  });

  it('dải CSS mới chứa khai báo, không chứa văn xuôi của comment tiêu đề', () => {
    expect(newCssCode).toContain('.hrp-card {');
    expect(newCssCode).not.toContain('ĐO TRÊN BẢN BIÊN DỊCH');
  });
});

// ═══ RQ-10/12/19 / AC-10/12/19 — bảo toàn vùng 189–360 của baseline ═════════

/**
 * Vùng được bảo vệ = từ `.pub-header {` (baseline `:189`) tới hết hàng rào giảm
 * chuyển động (baseline `:360`). Nó gồm CẢ khối lớp thủ công đã chết (RQ-12) VÀ
 * hai tài sản do `474f3dc` để lại: vòng focus toàn cục và hàng rào (DEC-19).
 * Phép đo là băm nguyên văn, KHÔNG đếm dòng diff — vì thêm token vào khối theme
 * đẩy toàn bộ vùng này xuống 19 dòng (EV-26).
 */
const PROTECTED_SHA = 'b000fb06f5e752462b1f86233ab4f272577eaaea4cb3fb968c143f9633aebd57';
const PROTECTED_START = '.pub-header {';
const PROTECTED_END = '  .nav-item-lift:hover {\n    transform: none !important;\n  }\n}\n';

function protectedSlice(): string {
  const i = css.indexOf(PROTECTED_START);
  const j = css.indexOf(PROTECTED_END);
  expect(i, `${CSS}: mất neo .pub-header`).toBeGreaterThanOrEqual(0);
  expect(j, `${CSS}: mất neo hàng rào .nav-item-lift:hover`).toBeGreaterThan(i);
  return css.slice(i, j + PROTECTED_END.length);
}

describe('go-live-08 / RQ-12, RQ-10 — vùng bảo vệ nguyên vẹn và liền mạch', () => {
  it('băm nguyên văn vùng 189–360 của baseline khớp từng byte', () => {
    expect(createHash('sha256').update(protectedSlice(), 'utf8').digest('hex')).toBe(PROTECTED_SHA);
  });

  it('vùng đó xuất hiện LIỀN MẠCH và đúng một lần', () => {
    expect(count(css, protectedSlice())).toBe(1);
  });

  it('bốn neo selector của khối đã chết còn đủ và đúng thứ tự', () => {
    const at = ['.pub-header {', '.filter-panel {', '.job-card {', '.pub-foot {'].map((s) => css.indexOf(s));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('số khối giảm chuyển động vẫn đúng bằng 1 — kể cả trong comment', () => {
    expect(count(css, 'prefers-reduced-motion')).toBe(1);
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {');
  });

  it('không mở chế độ tối: 0 khai báo prefers-color-scheme, 0 biến thể token tối', () => {
    expect(count(css, 'prefers-color-scheme')).toBe(0);
    expect(count(css, '.dark')).toBe(0);
  });
});

// ═══ RQ-23 / AC-23 — trần chuyển động ═══════════════════════════════════════

describe('go-live-08 / RQ-23 — trần chuyển động và danh sách thuộc tính', () => {
  const ALLOWED = ['transform', 'opacity', 'box-shadow', 'border-color', 'background-color'];

  it('mọi khai báo transition-property mới chỉ nêu thuộc tính được phép', () => {
    const decls = [...newCssCode.matchAll(/transition-property:\s*([^;]+);/g)].map((m) => m[1]);
    expect(decls.length).toBeGreaterThanOrEqual(5);
    for (const decl of decls) {
      for (const prop of decl.split(',').map((p) => p.trim())) {
        expect(ALLOWED, `transition-property không được phép: ${prop}`).toContain(prop);
      }
    }
  });

  it('không một transition mới nào chạm thuộc tính gây reflow', () => {
    for (const bad of ['width', 'height', 'top', 'left', 'all']) {
      expect(newCssCode).not.toMatch(new RegExp(`transition-property:[^;]*\\b${bad}\\b`));
    }
    // Không dùng thuộc tính rút gọn `transition:` để lách allowlist.
    expect(newCssCode).not.toMatch(/^\s*transition:\s/m);
  });

  it('đúng HAI nhóm phần tử mang biến hình, không hơn', () => {
    const movers = [...newCssCode.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => {
        const decl = m[2].match(/transform:\s*([^;]+);/);
        return decl !== null && decl[1].trim() !== 'none';
      })
      .map((m) => m[1].trim().replace(/\s+/g, ' '));
    expect(movers).toEqual(['.hrp-card:hover', '.hrp-btn-primary:hover:not(:disabled)']);
  });

  it('mọi phần tử mang biến hình đều được gắn .nav-item-lift để hàng rào phủ tới', () => {
    // `.nav-item-lift:hover { transform: none !important }` là khai báo !important nên
    // thắng mọi khai báo thường; đây là cách phủ hàng rào mà KHÔNG thêm khối thứ hai.
    for (const source of [page, nav]) {
      for (const cls of ['hrp-card', 'hrp-btn-primary']) {
        const hits = [...source.matchAll(new RegExp(`[^"'\\s]*\\b${cls}\\b[^"']*`, 'g'))].map((m) => m[0]);
        for (const hit of hits) {
          expect(hit, `thiếu nav-item-lift cạnh ${cls}: ${hit}`).toContain('nav-item-lift');
        }
      }
    }
  });

  it('thiết bị cảm ứng được trung hoà phần biến hình mà không thêm khối giảm chuyển động', () => {
    const touch = block(cssCode, '@media (hover: none), (pointer: coarse) {');
    expect(touch).toContain('transform: none;');
    expect(touch).toContain('.hrp-card:hover');
    expect(touch).not.toContain('prefers-reduced-motion');
  });
});

// ═══ RQ-17/18/20/21/22 — vùng chạm, skip link, container, icon, ô từ khoá ════

describe('go-live-08 / RQ-17 — vùng chạm 44px', () => {
  it('nút Lưu việc lên 44px và không còn kích thước 36px', () => {
    expect(page).toContain('w-11 h-11 rounded-full border border-outline-variant');
    expect(page).not.toContain('w-9 h-9 rounded-full border border-outline-variant');
  });

  it('mười control còn lại mang sàn chiều cao 44px', () => {
    // Sáu của go-live-08: Ứng tuyển, select bộ lọc, Tìm kiếm, Thử lại, Xem thêm, ô từ khoá.
    // go-live-09 / RQ-17, RQ-22 — nâng 6 → 10, bốn control MỚI, cùng bốn vị trí của phép đếm vòng
    // focus ở trên: `Ứng tuyển ngay` của card nổi bật, nút tag của hai dải theo trục, ô từ khoá của
    // Hero, nút `Tìm việc` của Hero. Không control mới nào nằm ngoài danh sách đó.
    expect(count(page, 'min-h-11')).toBe(10);
    // Đăng nhập và Đăng ký, cả bản desktop và bản mobile.
    expect(count(nav, 'min-h-11')).toBe(4);
  });

  it('select bộ lọc KHÔNG bị hạ padding dọc — py-2.5 giữ nguyên như baseline', () => {
    expect(page).toContain('min-h-11 py-2.5 pl-4 pr-10 rounded-lg cursor-pointer');
  });

  it('mọi phần tử bấm được có con trỏ dạng bàn tay', () => {
    for (const cls of ['.hrp-btn-primary {', '.hrp-btn-outline {', '.hrp-btn-ghost {']) {
      expect(block(cssCode, cls)).toContain('cursor: pointer;');
    }
    expect(page).toContain('cursor-pointer transition-[border-color] hover:border-error');
    expect(page).toContain('rounded-lg cursor-pointer');
  });
});

describe('go-live-08 / RQ-18 — skip link', () => {
  it('tồn tại ĐÚNG MỘT skip link và nó là phần tử đầu tiên trong header', () => {
    expect(count(nav, 'hrp-skip')).toBe(1);
    expect(nav).toContain('<a className="hrp-skip" href="#hrp-main">');
    expect(nav.indexOf('hrp-skip')).toBeLessThan(nav.indexOf('max-w-[1600px]'));
  });

  it('ẩn khỏi bố cục khi không có tiêu điểm, hiện rõ khi nhận tiêu điểm', () => {
    const rest = block(cssCode, '.hrp-skip {');
    expect(rest).toContain('position: absolute;');
    expect(rest).toContain('left: -9999px;');
    // KHÔNG dùng display:none — sẽ loại phần tử khỏi luồng bàn phím.
    expect(rest).not.toContain('display: none');
    const focused = block(cssCode, '.hrp-skip:focus {');
    expect(focused).toContain('top: 16px;');
    expect(focused).toContain('left: 16px;');
  });

  it('đích của skip link tồn tại và nhận được tiêu điểm theo cách lập trình', () => {
    expect(page).toContain('<div id="hrp-main" tabIndex={-1}');
    expect(nav).toContain('href="#hrp-main"');
  });
});

describe('go-live-08 / RQ-20 — container trang và container navbar cho cùng mép trái', () => {
  it('hai chuỗi class container trùng nhau từng ký tự trên phần quyết định mép trái', () => {
    const CONTAINER = 'w-full max-w-[1600px] mx-auto px-6 md:px-[5%]';
    expect(page).toContain(`className="${CONTAINER} py-8`);
    expect(nav).toContain(`className="${CONTAINER}">`);
    // Chuỗi cũ của navbar (max-w-7xl cộng thang padding khác) đã biến mất hoàn toàn.
    expect(count(nav, 'max-w-7xl')).toBe(0);
    expect(count(nav, 'sm:px-6 lg:px-8')).toBe(0);
  });
});

describe('go-live-08 / RQ-21 — icon ligature trang trí bị ẩn khỏi công nghệ trợ giúp', () => {
  it('cả 9 icon trang trí của trang landing đều có aria-hidden', () => {
    const spans = [...page.matchAll(/<span[^>]*material-symbols-outlined[^>]*>/g)].map((m) => m[0]);
    expect(spans).toHaveLength(9);
    for (const span of spans) {
      expect(span, `icon còn lộ ra: ${span}`).toContain('aria-hidden="true"');
    }
  });

  it('icon mang nghĩa vẫn có nhãn văn bản đi kèm', () => {
    // Nút Lưu việc chỉ có icon nên nhãn của nó nằm ở aria-label.
    expect(page).toContain('aria-label="Lưu việc"');
  });
});

describe('go-live-08 / RQ-22 — ô từ khoá', () => {
  it('có nhãn NHÌN THẤY được liên kết bằng htmlFor, không còn để placeholder làm nhãn', () => {
    expect(page).toContain('htmlFor="hrp-keyword"');
    expect(page).toContain('id="hrp-keyword"');
    expect(page).toContain('Từ khóa tìm kiếm\n            </label>');
    expect(page).not.toContain('aria-label="Từ khóa tìm kiếm"');
  });

  it('dùng type ngữ nghĩa và là control ĐẦU TIÊN của panel bộ lọc', () => {
    expect(page).toContain('type="search"');
    expect(count(page, 'type="text"')).toBe(0);
    const panel = page.indexOf('className="hrp-panel');
    expect(page.indexOf('id="hrp-keyword"', panel)).toBeLessThan(page.indexOf('<FacetSelect', panel));
  });

  it('panel bộ lọc không thu gọn: không có state đóng/mở nào chi phối nó', () => {
    expect(page).not.toMatch(/filtersOpen|panelOpen|showFilters/);
  });
});

// ═══ RQ-24/25/26 — ba bất biến KẾ THỪA của GO-LIVE-12, 05 và 05 ══════════════

describe('go-live-08 / RQ-24 — điều hướng card của GO-LIVE-12 còn nguyên', () => {
  it('đúng HAI phần tử dùng href={detailHref} và đích vẫn do publicJobDetailPath dựng', () => {
    expect(count(page, 'href={detailHref}')).toBe(2);
    expect(count(page, 'const detailHref = publicJobDetailPath(job.slug);')).toBe(1);
    expect(count(page, 'publicJobDetailPath')).toBe(2); // một import, một chỗ dùng
  });

  /**
   * Hàng rào kế thừa `public-detail.static.test.ts` đếm chuỗi TĨNH
   * `className="relative z-10` và đòi >= 2. Baseline có BA (tiêu đề, Ứng tuyển,
   * Lưu việc); nay còn HAI vì className của nút Ứng tuyển buộc phải thành biểu
   * thức — `RQ-09` cấm đặt màu trạng thái bằng inline style nên ba biến thể
   * muted/done/primary phải chọn bằng class. Hàng rào đó vẫn xanh, nhưng nó
   * KHÔNG còn nhìn thấy nút Ứng tuyển; case dưới đây khoá lại đúng phần thực
   * chất mà nó mất tầm nhìn: cả hai nút vẫn được nâng trên phần phủ.
   */
  it('cả hai nút vẫn mang relative z-10, kể cả nút có className là biểu thức', () => {
    const apply = element(page, 'onClick={() => onApply(job)}', '</button>');
    expect(page).toContain("'relative z-10 hrp-focus font-semibold px-6 min-h-11 rounded-lg '");
    expect(apply).toContain('relative z-10 hrp-focus font-semibold');
    // go-live-09 / RQ-23 — cùng một phép SIẾT như khối con trỏ ở trên, đo trên chính khối nút
    // Ứng tuyển đã cắt ra: mặt chữ còn sống được ghim, và lớp của nhánh chết bị cấm trong khối đó.
    expect(apply).toContain("isApplied ? 'hrp-btn-done' : 'hrp-btn-primary nav-item-lift'");
    expect(apply).not.toContain('hrp-btn-muted');
    const save = element(page, 'aria-label="Lưu việc"', '</button>');
    expect(save).toContain('className="relative z-10 hrp-focus w-11 h-11');
    expect(count(page, 'className="relative z-10')).toBe(2);
    expect(count(page, 'relative z-10')).toBe(4); // ba phần tử cộng một comment của baseline
  });

  it('không lớp nào chặn sự kiện được thêm vào giữa card và link', () => {
    expect(page).not.toContain('stopPropagation()');
    expect(page).toContain('aria-hidden="true"\n        tabIndex={-1}');
  });
});

describe('go-live-08 / RQ-25 — ApplyModal vẫn là component đã tách', () => {
  it('vẫn import từ đúng đường dẫn và vẫn được render', () => {
    expect(page).toContain("import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';");
    expect(page).toContain('<ApplyModal');
    expect(page).toContain('onSuccess={handleApplySuccess}');
  });
});

describe('go-live-08 / RQ-26 — sự thật dữ liệu của GO-LIVE-05 còn nguyên', () => {
  it('trục dữ liệu của trang landing không bị round trình bày chạm tới', () => {
    for (const anchor of [
      'summaryLabel(job.positions',
      'summaryLabel(job.locations',
      'summaryLabel(job.shifts',
      'facets.areas',
      'facets.shifts',
      'nextOffset',
      '{job.recruiter}',
      'Còn {job.remaining} vị trí',
    ]) {
      expect(page, `mất neo trục dữ liệu: ${anchor}`).toContain(anchor);
    }
  });

  it('không nhãn đơn vị nào bị đổi và không danh sách filter nào bị gắn cứng lại', () => {
    expect(page).toContain("allLabel=\"Tất cả tỉnh/thành\"");
    expect(page).toContain("allLabel=\"Tất cả ca làm việc\"");
    expect(page).not.toMatch(/const\s+(AREAS|SHIFTS|PROVINCES)\s*=/);
  });
});
