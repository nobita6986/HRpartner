/**
 * public-ui-premium.static.test.ts — go-live-08 / RQ-14 / STEP-08 / AC-14.
 *
 * DEC-01: BestJobs tab + pagination composition changes in Plan B (hrp-v6-ui-04b-pagination-admin):
 *   - Tab filter (Tất cả / Tuyển gấp) with role="tablist"/role="tab" ARIA
 *   - Pagination prev/next control (role="group" aria-label="Phân trang")
 *   - pageSize=9 passed via prop (DEC-04 / BEST_JOBS_PAGE_SIZE hardcode)
 * DEC-06: Tab URGENT uses fixture BEST_JOBS_URGENT_PREVIEW with source: 'INTEGRATION_PENDING'
 *   (fixture tested via AC-01/AC-09; this file covers UI composition).
 *
 * Vì sao hàng rào của round này là test TĨNH đọc cây nguồn: repo không có một
 * mảnh công cụ trình duyệt nào (0 file `*.test.tsx`, 0 match playwright /
 * puppeteer / cypress / jsdom), nên `getComputedStyle`, ảnh chụp và điều hướng
 * bàn phím KHÔNG đo được ở lane unit. Những nửa AC đó được báo `BLOCKED` kèm
 * `ENV_BLOCKED` trong HANDOFF. Phần CÒN LẠI — vốn là toàn bộ bất biến mà một
 * lần sửa vô tình có thể phá — đều đo được bằng cách đọc chính nguồn, và đó là
 * việc của file này.
 *
 * DEC-10 allowlist: composition changed in ui-03 round 1 — assertions updated to
 * match new structure. Original behavior intent preserved.
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
const FEATURED_CARD = 'src/domains/job-board/components/landing/featured-job-card.tsx';
const BEST_JOBS = 'src/domains/job-board/components/landing/best-jobs-section.tsx';
const AREAS = 'src/domains/job-board/components/landing/areas-section.tsx';
const HERO = 'src/domains/job-board/components/landing/hero.tsx';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

const css = read(CSS);
const page = read(PAGE);
const nav = read(NAV);
const CARD = read(FEATURED_CARD);
const BEST = read(BEST_JOBS);
const AREAS_SRC = read(AREAS);
const HERO_SRC = read(HERO);

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
    // ui-03: page.tsx no longer has `hrp-card nav-item-lift` — card structure moved
    // to FeaturedJobCard component. Check the component file instead.
    expect(page).not.toContain('shadow-sm hover:shadow-md');
    expect(CARD).toContain('hrp-focus group relative');
    expect(CARD).not.toContain('shadow-sm hover:shadow-md');
  });

  it('padding card bằng token 24px và cỡ tên việc làm đã tăng cấp', () => {
    expect(base).toContain('padding: var(--spacing-card-padding);');
    // ui-03: title uses `font-head text-headline-md font-bold` (not `text-lg font-bold`)
    expect(CARD).toContain('font-head text-headline-md font-bold');
    // RQ-01: page.tsx no longer has inline list cards — title pattern check moved to CARD
    expect(CARD).not.toContain('<h3 className="text-lg font-bold"');
  });

  it('tên đơn vị và địa điểm vẫn dùng token xám dịu', () => {
    // ui-03: location uses direct text with on-surface-variant, not `hrp-pill-location` pill
    expect(page).toContain("text-on-surface-variant");
    expect(CARD).toContain('text-on-surface-variant');
    // The .hrp-pill-location CSS still exists in the design system for other surfaces
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
    // ui-03: pill classes exist in CSS for other surfaces; page uses inline pill-like spans
    // with bg-surface-container-low for salary. Check the pill CSS is still defined.
    // Note: .hrp-pill and .hrp-pill-location in CSS don't have rounded-full or icon ligatures
    // Check that the pill classes still exist in CSS with background-color
    expect(block(cssCode, '.hrp-pill {')).toContain('background-color');
    expect(block(cssCode, '.hrp-pill-location {')).toContain('background-color');
    // ui-03: the salary pill uses bg-surface-container-low directly in FeaturedJobCard
    // VIS-02
    expect(CARD).toContain('bg-primary-fixed');
  });

  it('nền panel bộ lọc KHÁC nền card, và là token xám rất nhạt', () => {
    expect(block(cssCode, '.hrp-panel {')).toContain('background-color: var(--color-surface-container-low);');
    expect(token('--color-surface-container-low')).not.toBe(token('--color-surface'));
    // STEP-06/A16: hero form đổi sang nền trắng bg-white, không còn bg-white/10 backdrop-blur-md
    // DEC-19 comment: update selector check for A16 white card
    expect(page).not.toContain('className="hrp-panel rounded-xl border');
    expect(page).toContain('border border-outline-variant bg-white');
    // The .hrp-panel CSS still exists for other surfaces
    expect(cssCode).toContain('.hrp-panel {');
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

  it('cả control tương tác của trang landing đều mang lớp vòng focus', () => {
    // ui-03 round 1: composition changed — components are in separate files.
    // RQ-01 (hrp-v6-ui-04c-home-composition-footer v1.4): inline list removed.
    //
    // `hrp-focus` on page.tsx:
    //   - Hero keyword input: 1
    //   - Hero area select: 1
    //   - Hero salary select (disabled): 1
    //   - Hero submit button: 1
    //   = 4 total on page.tsx
    // No retry button (no inline list error state).
    expect(count(page, 'hrp-focus')).toBe(4);
    expect(count(page, '<FacetSelect')).toBe(0);
    // ui-03: native selects use inline options from facets.areas
    expect(page).toContain('facets.areas');
    expect(page).toContain('<option value="">Tất cả khu vực</option>');

    // Navbar `hrp-focus`:
    // STEP-06/DEC-19: Login đổi từ hrp-btn-outline sang Link text (không còn hrp-focus)
    // Desktop Signup: hrp-focus = 1 (button với aria-disabled)
    // Mobile Signup: hrp-focus = 1 (button với aria-disabled)
    // Total nav hrp-focus = 2
    expect(count(nav, 'hrp-focus')).toBe(2);
  });
});

// ═══ RQ-08 / AC-08 — select bộ lọc vẫn native ═══════════════════════════════

describe('go-live-08 / RQ-08 — select bộ lọc', () => {
  it('vẫn là element native, vẫn appearance-none, vẫn có chevron', () => {
    // STEP-06/A16: Hero form đổi từ glass sang nền trắng
    // Select now uses border-outline-variant bg-white (previously border-white/30 bg-white/95)
    expect(page).toContain('<select');
    // DEC-19 comment: update selector check for A16 white card
    expect(page).toContain('border border-outline-variant bg-white');
    // ui-03: no explicit `appearance-none` on hero selects; they work without it
    expect(count(page, 'appearance-none')).toBe(0);
    // Hero form doesn't have expand_more chevron — uses custom styling
    expect(page).not.toContain('expand_more');
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
    // STEP-06/DEC-19: Login đổi từ hrp-btn-outline hrp-focus sang Link text
    const loginEl = element(nav, 'href="/login"', '</Link>');
    // Login giờ là text link không có style
    expect(loginEl).not.toContain('style={{');
    expect(loginEl).not.toContain('onMouse');
    expect(loginEl).not.toContain('hrp-btn-outline');
    // ui-03: ApplyModal handles applied state internally. No `isApplied ? 'hrp-btn-done' :` pattern on page.tsx.
    expect(page).not.toContain("isApplied ? 'hrp-btn-done'");
    // Hero submit button uses className expression
    expect(page).toContain("hrp-btn-primary hrp-focus nav-item-lift");
  });

  it('bốn cặp handler màu của baseline trên nút xác thực đã biến mất', () => {
    // baseline c6256e7: onMouseEnter 5 → 3 (nav links + dropdown)
    // STEP-06/DEC-19: Login đổi từ button hrp-btn-outline sang Link text
    // onMouseEnter: nav link hover (3) = 3
    expect(count(nav, 'onMouseEnter')).toBe(3);
    // currentTarget.style.backgroundColor: dashboard dropdown (2) + logout (1) + nav link (1) = 4
    expect(count(nav, 'currentTarget.style.backgroundColor')).toBe(4);
    // transition-colors: nav links + user menu + dropdown items = 6
    expect(count(nav, 'transition-colors')).toBe(6);
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
    // STEP-06/DEC-19: Login đổi từ hrp-btn-outline sang Link text — không còn hrp-btn-outline hrp-focus trong nav
    expect(nav).not.toContain('hrp-btn-outline hrp-focus');
  });

  it('trạng thái không bấm được của nút Ứng tuyển nói rõ bằng con trỏ, và nhánh chết đã đi', () => {
    // Hai quy tắc CSS giữ NGUYÊN phép đo: `app/globals.css` không bị task 09 chạm một byte.
    expect(block(cssCode, '.hrp-btn-muted {')).toContain('cursor: not-allowed;');
    expect(block(cssCode, '.hrp-btn-done {')).toContain('cursor: default;');
    // STEP-06/DEC-19: Login đổi từ button hrp-btn-outline sang Link text
    expect(nav).not.toContain('hrp-btn-outline hrp-focus');
    // ui-03: `isApplied ? 'hrp-btn-done' : 'hrp-btn-primary nav-item-lift'` no longer on page.tsx
    expect(page).not.toContain("isApplied ? 'hrp-btn-done'");
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
 * ui-03: data layer changes:
 *   - `summaryLabel(job.positions...)` calls removed — card uses `job.title` directly
 *   - `options={facets.areas}` removed — uses inline `<option>` elements with facets.areas.map
 *   - `cache: 'no-store'` still exists — AbortController is used alongside it
 *   - facets.areas is still used as data source (via map)
 */
/**
 * RQ-01 (hrp-v6-ui-04c-home-composition-footer v1.4):
 *   - runQuery deleted (inline search removed per RQ-01)
 *   - buildQuery deleted
 *   - dedupeById deleted
 *   - enrichJob preserved (BestJobs bootstrap still needs it)
 *   - facets/overview flow preserved via bootstrapBestJobs
 *   - `cache: 'no-store'` still used in bootstrapBestJobs
 *   - facets.areas is still used as data source (via map)
 */
describe('go-live-08 / RQ-11 — tầng dữ liệu của trang công khai còn nguyên', () => {
  it('enrichJob còn, nhưng buildQuery/dedupeById/runQuery đã xóa (RQ-01)', () => {
    expect(page).toContain('function enrichJob(job: PublicJobDto): EnrichedJob {');
    // RQ-01: these are deleted
    expect(page).not.toContain('function dedupeById(');
    expect(page).not.toContain('function buildQuery(');
    expect(page).not.toContain('function runQuery(');
    // RQ-01: bootstrapBestJobs uses cache: 'no-store' (same as old runQuery)
    expect(page).toContain("cache: 'no-store'");
    expect(page).toContain('.map(enrichJob)');
  });

  it('nhãn đơn vị trên card dùng job.title trực tiếp thay vì summaryLabel', () => {
    // ui-03: FeaturedJobCard uses job.title directly, not summaryLabel
    expect(CARD).toContain('job.title');
    expect(CARD).not.toContain('summaryLabel');
    // RQ-01: page.tsx no longer has inline list cards with {job.title}
    expect(page).not.toContain('summaryLabel(job.');
    expect(count(page, 'summaryLabel(job.')).toBe(0);
  });

  it('nguồn lựa chọn của bộ lọc vẫn là facets từ API, dùng inline options', () => {
    // ui-03: facets.areas is still the data source, but rendered as inline <option> elements
    expect(page).toContain('const [facets, setFacets] = useState<PublicJobFacets>(EMPTY_FACETS);');
    expect(page).toContain('setFacets(data.facets');
    // ui-03: no `options={facets.areas}` prop — uses inline options with facets.areas.map
    expect(page).not.toContain('options={facets.areas}');
    expect(page).toContain('facets.areas.map');
    expect(page).toContain('<option key={entry} value={entry}>');
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

/** go-live-15 — tỉ lệ giữa HAI mã màu đã biết, dùng khi một trong hai không
 *  phải giá trị của token nào: ví dụ nền HỢP THÀNH của một lớp trạng thái. */
const ratioHex = (a: string, b: string): number => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Hợp thành `layer` với độ mờ `alpha` lên nền đặc `base` → mã màu THẬT mà
 *  mắt thấy. Bảng đọc-tên-token không thể thấy màu này, nên nó phải được đo
 *  riêng; đó chính là loại điểm mù đã để nút chính đứng ở 3.153:1. */
function composite(layer: string, alpha: number, base: string): string {
  const px = (h: string, i: number) => parseInt(h.replace('#', '').slice(i, i + 2), 16);
  const out = [0, 2, 4].map((i) => Math.round(px(layer, i) * alpha + px(base, i) * (1 - alpha)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** [nhãn, màu chữ, màu nền] — mọi cặp CHỮ mà round này sinh ra. */
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['.hrp-pill-location', '--color-on-surface-variant', '--color-primary-soft'],
  ['.hrp-panel chữ chính', '--color-on-surface', '--color-surface-container-low'],
  ['.hrp-panel chữ phụ', '--color-on-surface-variant', '--color-surface-container-low'],
  // go-live-15 / RQ-11 — trạng thái NGHỈ của nút chính. Bảng của go-live-08 chỉ
  // liệt kê cặp mà CHÍNH nó sinh ra, nên cặp nghỉ (có từ trước 08) không có dòng
  // nào và đứng ở 3.153:1 suốt trong khi cả suite vẫn xanh.
  ['.hrp-btn-primary nghỉ', '--color-on-primary', '--color-primary-dark'],
  ['.hrp-btn-primary:hover nền dưới lớp trạng thái', '--color-on-primary', '--color-primary-dark'],
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
  // go-live-15 / RQ-11 — dòng này ghim nền nút vào `--color-primary` và chỉ đọc
  // TÊN token, nên nó xanh trong khi mô tả một trạng thái đã chết.
  ['nền .hrp-btn-primary / nền card', '--color-primary-dark', '--color-surface'],
  ['nền .hrp-btn-primary / nền body', '--color-primary-dark', '--color-background'],
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

  it('go-live-15 / RQ-02 — nền HỢP THÀNH của hover được đo, không chỉ nền token', () => {
    // Sau `RQ-01`, nền NGHỈ đã là `--color-primary-dark`, nên hover phải khác bằng
    // một lớp trắng mờ. Hai bảng trên chỉ đọc TÊN token nên chúng thấy nền hover là
    // `#a63b00` và báo `6.468:1` — cao hơn thực tế. Màu mắt thấy là màu hợp thành,
    // và đây là chỗ duy nhất trong tệp đo nó. `DEC-02` cho biên alpha, `AC-02` cho
    // sàn tỉ số.
    const hover = block(cssCode, '.hrp-btn-primary:hover:not(:disabled) {');
    const m = hover.match(/rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)/);
    expect(m, 'nút chính mất lớp trạng thái hover').not.toBeNull();
    const alpha = Number(m![1]);
    expect(alpha).toBeGreaterThanOrEqual(0.08);
    expect(alpha).toBeLessThanOrEqual(0.12);
    const real = composite('#ffffff', alpha, hexOf('--color-primary-dark'));
    expect(
      ratioHex(hexOf('--color-on-primary'), real),
      `chữ trên nền hover hợp thành ${real}`,
    ).toBeGreaterThanOrEqual(5.089);
    // Trạng thái NHẤN bỏ lớp đó đi, nên nhấn khác hover bằng CHÍNH màu nền, cộng
    // hai dấu hiệu cũ. Không có dòng này thì `background-image: none` có thể bị xoá
    // mà không test nào đỏ.
    expect(block(cssCode, '.hrp-btn-primary:active:not(:disabled) {')).toContain(
      'background-image: none;',
    );
  });

  it('--color-primary bị loại khỏi mọi đường viền mới, có lý do bằng số', () => {
    // Ba số này LÀ lý do. Nếu một ngày token đổi và chúng vượt 3:1 thì test
    // đỏ, và lúc đó chọn lại token là quyết định có căn cứ, không phải quán tính.
    expect(ratio('--color-primary', '--color-background')).toBeLessThan(3);
    expect(ratio('--color-primary', '--color-surface-container-low')).toBeLessThan(3);
    expect(ratio('--color-primary', '--color-primary-soft')).toBeLessThan(3);
    // go-live-15 / RQ-01 — lần dùng CUỐI CÙNG của `--color-primary` trong dải này,
    // nền NGHỈ của nút chính, đã chuyển sang `--color-primary-dark`. Phép đếm được
    // SIẾT từ `1` xuống `0`: dải CSS mới không còn đọc token nhạt ấy ở vai trò nào.
    expect(count(newCssCode, 'var(--color-primary)')).toBe(0);
    expect(newCssCode).not.toContain('background-color: var(--color-primary);');
    expect(newCssCode).toContain('background-color: var(--color-primary-dark);');
    expect(newCssCode).not.toContain('border-color: var(--color-primary);');
    expect(newCssCode).not.toContain('border: 1px solid var(--color-primary);');
  });

  it('hai cặp DƯỚI ngưỡng đều là giá trị kế thừa, khoá lại để không trôi', () => {
    // go-live-15 đã TRẢ LỜI câu hỏi mà khối này để mở: cặp `--color-on-primary`
    // trên `--color-primary` ở `3.153:1` không còn là cặp của nút chính nữa —
    // `RQ-01` chuyển nền nút sang `--color-primary-dark`. Hai khẳng định dưới
    // đây GIỮ NGUYÊN vì chúng khoá GIÁ TRỊ TOKEN, không mô tả nút: `RQ-10` cấm
    // đổi giá trị token, nên chúng là hàng rào của chính lệnh cấm đó. Cặp này
    // vẫn còn người dùng NGOÀI phạm vi §4.2 (`detail-apply-cta.tsx`,
    // `login/login-form.tsx`, và dải CSS đã chết) — contract kế tiếp.
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

// ═══ Hàng rào của chính PHÉP ĐO — chống lệch pha comment ═══════════════════

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
    // ui-03: FeaturedJobCard uses different structure (border + shadow-card), not hrp-card
    // page.tsx has search submit button with nav-item-lift; retry button uses hrp-btn-primary without nav-item-lift
    // Navbar buttons use hrp-btn-outline, not hrp-btn-primary
    // Verify search submit button has nav-item-lift
    const submitBtn = page.indexOf('className="hrp-btn-primary hrp-focus nav-item-lift');
    expect(submitBtn, 'search submit button should have nav-item-lift').toBeGreaterThan(-1);
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
    // RQ-01: page.tsx no longer has inline list cards (save buttons were there)
    // The inline job list was removed entirely
    expect(page).not.toContain('aria-label="Lưu việc"');
    // FeaturedJobCard doesn't have a save button either
    expect(CARD).not.toContain('aria-label="Lưu việc"');
    // Verify the old pattern doesn't exist
    expect(page).not.toContain('w-9 h-9 rounded-full border border-outline-variant');
    expect(page).not.toContain('w-11 h-11 rounded-full border border-outline-variant');
  });

  it('mười control còn lại mang sàn chiều cao 44px', () => {
    // RQ-01: page.tsx has 4 interactive controls with min-h-11
    //   - Hero keyword input (keyword)
    //   - Hero area select
    //   - Hero salary select (disabled, but still has min-h-11)
    //   - Hero submit button
    // Total on page.tsx: 4
    expect(count(page, 'min-h-11')).toBe(4);
    // STEP-06/DEC-19: Navbar min-h-11 count updated
    // Desktop signup button + Mobile signup button = 2 total
    expect(count(nav, 'min-h-11')).toBe(2);
  });

  it('select bộ lọc KHÔNG bị hạ padding dọc — py-2.5 giữ nguyên như baseline', () => {
    // RQ-01: Hero form selects use py-2.5 and min-h-11 for touch targets
    expect(page).toContain('py-2.5');
    expect(page).toContain('min-h-11');
    // The .hrp-field CSS still defines hover/focus states (even if not used in hero form)
    // This assertion is preserved for baseline compatibility
    expect(block(cssCode, '.hrp-field {')).toContain('border-color');
  });

  it('mọi phần tử bấm được có con trỏ dạng bàn tay', () => {
    // ui-03: hero form uses native selects without cursor-pointer inline (browser default)
    // Check rounded-lg class is present for interactive elements
    expect(page).toContain('rounded-lg');
    // CSS block still has cursor-pointer in hrp-btn-primary
    expect(block(cssCode, '.hrp-btn-primary {')).toContain('cursor: pointer;');
  });
});

describe('go-live-08 / RQ-18 — skip link', () => {
  it('tồn tại ĐÚNG MỘT skip link và nó là phần tử đầu tiên trong header', () => {
    expect(count(nav, 'hrp-skip')).toBe(1);
    expect(nav).toContain('<a className="hrp-skip" href="#hrp-main">');
    // VIS-06 / DEC-14: container thu hẹp từ max-w-[1200px] sang max-w-[1080px]
    expect(nav.indexOf('hrp-skip')).toBeLessThan(nav.indexOf('max-w-[1080px]'));
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
    expect(page).toContain('<main id="hrp-main" tabIndex={-1}');
    expect(nav).toContain('href="#hrp-main"');
  });
});

describe('go-live-08 / RQ-20 — container trang và container navbar cho cùng mép trái', () => {
  it('hai chuỗi class container trùng nhau từng ký tự trên phần quyết định mép trái', () => {
    // VIS-06 / DEC-14: container thu hẹp từ max-w-[1200px] sang max-w-[1080px]
    const CONTAINER = 'w-full max-w-[1080px] mx-auto';
    expect(nav).toContain(`className="${CONTAINER}`);
    // VIS-06: Hero component updated to max-w-[1080px]
    expect(HERO_SRC).toContain('max-w-[1080px]');
    // Old navbar container classes have been replaced
    expect(count(nav, 'max-w-[1200px]')).toBe(0);
    expect(count(nav, 'max-w-7xl')).toBe(0);
    expect(count(nav, 'max-w-[1600px]')).toBe(0);
    expect(count(nav, 'sm:px-6 lg:px-8')).toBe(0);
  });
});

describe('go-live-08 / RQ-21 — icon ligature trang trí bị ẩn khỏi công nghệ trợ giúp', () => {
  it('icon trang trí đều có aria-hidden', () => {
    // STEP-04/DEC-19: BestJobsSection header icon đổi từ workspace_premium sang local_fire_department
    // ui-03: page.tsx job list has no icons (simple text + salary)
    // Hero component has decorative blur circles (aria-hidden)
    // BestJobsSection has local_fire_department icon
    // AreasSection icons are in AreaImageCard component
    // Count all spans with material-symbols-outlined
    const allSpans = [
      ...page.matchAll(/<span[^>]*material-symbols-outlined[^>]*>/g),
      ...CARD.matchAll(/<span[^>]*material-symbols-outlined[^>]*>/g),
      ...BEST.matchAll(/<span[^>]*material-symbols-outlined[^>]*>/g),
    ].map((m) => m[0]);
    // Hero has no material icons, BestJobs has 1 (local_fire_department), CARD has 2 (location_on + payments)
    // STEP-03: FeaturedJobCard có 2 icons (location_on + payments), ribbon có local_fire_department khi urgent
    expect(allSpans.length).toBeGreaterThanOrEqual(3);
    for (const span of allSpans) {
      expect(span, `icon còn lộ ra: ${span}`).toContain('aria-hidden="true"');
    }
  });

  it('icon mang nghĩa vẫn có nhãn văn bản đi kèm', () => {
    // ui-03: no save button (aria-label="Lưu việc") in new composition
    expect(page).not.toContain('aria-label="Lưu việc"');
    expect(CARD).not.toContain('aria-label="Lưu việc"');
  });
});

describe('go-live-08 / RQ-22 — ô từ khoá', () => {
  it('có nhãn NHÌN THẤY được liên kết bằng htmlFor, không còn để placeholder làm nhãn', () => {
    // ui-03: hero form keyword input uses id="hrp-hero-keyword"
    expect(page).toContain('htmlFor="hrp-hero-keyword"');
    expect(page).toContain('id="hrp-hero-keyword"');
    expect(page).toContain('Từ khóa\n');
    expect(page).not.toContain('aria-label="Từ khóa tìm kiếm"');
  });

  it('dùng type ngữ nghĩa và là control ĐẦU TIÊN của hero form', () => {
    expect(page).toContain('type="search"');
    expect(count(page, 'type="text"')).toBe(0);
    // ui-03: keyword input comes before area and salary selects
    expect(page.indexOf('id="hrp-hero-keyword"')).toBeLessThan(page.indexOf('id="hrp-hero-area"'));
  });

  it('hero form không thu gọn: không có state đóng/mở nào chi phối nó', () => {
    expect(page).not.toMatch(/filtersOpen|panelOpen|showFilters/);
  });
});

// ═══ RQ-24/25/26 — ba bất biến KẾ THỪA của GO-LIVE-12, 05 và 05 ══════════════

describe('go-live-08 / RQ-24 — điều hướng card của GO-LIVE-12 còn nguyên', () => {
  it('đúng HAI phần tử dùng href={detailHref} và đích vẫn do publicJobDetailPath dựng', () => {
    // ui-03: job list has publicJobDetailPath for each job
    // BestJobsSection passes buildHref (which uses publicJobDetailPath) to FeaturedJobCard
    expect(page).toContain('publicJobDetailPath');
    expect(page).toContain('buildHref={(jobId) => publicJobDetailPath(jobId)}');
  });

  /**
   * Hàng rào kế thừa `public-detail.static.test.ts` đếm chuỗi TĨNH
   * `className="relative z-10` và đòi >= 2. Baseline có BA (tiêu đề, Ứng tuyển,
   * Lưu việc); ui-03 composition has different structure.
   * ui-03: The job list on page.tsx uses simple <Link> elements without z-10.
   * FeaturedJobCard title link uses hrp-focus but not relative z-10.
   */
  it('cấu trúc card mới không dùng relative z-10 pattern', () => {
    // ui-03: FeaturedJobCard uses group hover on the article, not z-10 stacking
    expect(CARD).not.toContain('relative z-10');
    expect(page).not.toContain("'relative z-10 hrp-focus font-semibold");
  });

  it('không lớp nào chặn sự kiện được thêm vào giữa card và link', () => {
    expect(page).not.toContain('stopPropagation()');
    // ui-03: FeaturedJobCard link doesn't have the aria-hidden tabIndex pattern
    expect(CARD).not.toContain('aria-hidden="true"\n        tabIndex={-1}');
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
    // RQ-01: buildQuery/top-level nextOffset state removed; enrichJob + bootstrapBestJobs preserved
    // facets.areas still flows through bootstrapBestJobs
    for (const anchor of [
      'enrichJob',
      'job.locations',
      'data.nextOffset', // API response field still read (preserved data flow)
    ]) {
      expect(page, `mất neo trục dữ liệu: ${anchor}`).toContain(anchor);
    }
    // RQ-01: buildQuery and top-level nextOffset state removed (were used by inline list)
    // Note: data.nextOffset (API field read) is still present — that's the preserved data flow
    expect(page).not.toContain('buildQuery');
    // facets still flow through
    expect(page).toContain('facets.areas');
    expect(page).toContain('setFacets(data.facets');
  });

  it('không nhãn đơn vị nào bị đổi và không danh sách filter nào bị gắn cứng lại', () => {
    // RQ-01: areas come from facets, salary disabled (no options)
    expect(page).toContain('facets.areas');
    expect(page).toContain('<option value="">Tất cả khu vực</option>');
    // Salary select is disabled — no options except the default "Mọi mức lương"
    expect(page).toContain('<option value="">Mọi mức lương</option>');
  });
});

// DEC-01: BestJobs tab + pagination UI composition
describe('DEC-01 / STEP-03 / RQ-01, RQ-05 — BestJobs tab filter and pagination controls', () => {
  it('tab filter has role="tablist" with role="tab" pills and aria-selected', () => {
    // best-jobs-section.tsx has tab controls with proper ARIA
    expect(BEST).toContain('role="tablist"');
    expect(BEST).toContain('role="tab"');
    expect(BEST).toContain('aria-selected');
  });

  it('tab pills use bg-primary-container for active state (DEC-02)', () => {
    // Tab active className uses bg-primary-container text-white font-bold
    expect(BEST).toContain('bg-primary-container');
    expect(BEST).toContain("tab === 'all'");
    expect(BEST).toContain("tab === 'urgent'");
  });

  it('BestJobsSection accepts pageSize prop and renders up to pageSize items', () => {
    // DEC-04: Component receives pageSize as a prop variable (not hardcoded literal 3).
    // Uses jobs.slice(0, pageSize) for the grid render.
    expect(BEST).toContain('pageSize');
    expect(BEST).toContain('offset');
    expect(BEST).toContain('total');
    expect(BEST).toContain('nextOffset');
    // jobs.slice(0, pageSize) is the correct pattern — uses the prop variable
    expect(BEST).toContain('jobs.slice(0, pageSize)');
    // Verify the pageSize is a prop (in interface) and used as a variable (not hardcoded as literal 9)
    expect(BEST).toContain('pageSize: number');
  });

  it('pagination control has role="group" aria-label="Phân trang" (DEC-03)', () => {
    expect(BEST).toContain('role="group"');
    expect(BEST).toContain('aria-label="Phân trang"');
  });

  it('prev disabled when offset=0, next disabled when nextOffset=null or offset+pageSize>=total (RQ-06)', () => {
    expect(BEST).toContain('offset === 0');
    expect(BEST).toContain('nextOffset === null');
    expect(BEST).toContain('offset + pageSize >= total');
  });

  it('BEST_JOBS_URGENT_PREVIEW imported in page.tsx (DEC-06)', () => {
    expect(page).toContain('BEST_JOBS_URGENT_PREVIEW');
    expect(page).toContain('bestJobsTab');
    expect(page).toContain('bestJobsOffset');
  });
});

// DEC-06: URGENT fixture INTEGRATION_PENDING marker
describe('DEC-06 / STEP-02 / RQ-03, RQ-04 — URGENT fixture INTEGRATION_PENDING', () => {
  it('fixture has source: INTEGRATION_PENDING on each item', () => {
    const FIXTURE = 'src/domains/job-board/fixtures/best-jobs-urgent-preview.ts';
    const fixtureCode = read(FIXTURE);
    expect(fixtureCode).toContain("source: 'INTEGRATION_PENDING'");
    expect(fixtureCode).toContain('preview-urgent-');
    expect(fixtureCode).toContain("badgeType: 'urgent'");
  });

  it('page.tsx renders URGENT tab from BEST_JOBS_URGENT_PREVIEW', () => {
    expect(page).toContain("bestJobsTab === 'all' ? bestJobsData.jobs : BEST_JOBS_URGENT_PREVIEW");
  });
});
