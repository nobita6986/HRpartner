/**
 * marketplace-inventory.static.test.ts — V5-OPS-06A / RQ-01/07/08 / STEP-04 / AC-06/07.
 *
 * Detector tĩnh chạy trên cây nguồn THẬT (đọc file, không mô phỏng):
 *   - RQ-08: đúng MỘT đường ghi ẩn danh — chỉ canonical apply route gọi
 *     `submitPublicApplication`; hai legacy write chỉ còn stub 410 (không nhận req,
 *     không Prisma); mọi route mutating khác đều có auth marker, hoặc uỷ quyền sang
 *     module `handler` có auth marker.
 *   - RQ-01: `src/domains/applications/rate-limit.ts` (Map RAM per-instance) đã bị xoá,
 *     không còn file nào tham chiếu; tracking route dùng `enforceRateLimits`.
 *   - RQ-07/DEC-09: hai UI apply không còn surface CV và POST đúng canonical contract
 *     (idempotency key + consent).
 *
 * go-live-12 / RQ-09 / STEP-02: `ApplyModal` và `SuccessModal` đã tách sang
 * `src/domains/job-board/components/`. Ba `it` của khối `RQ-07/DEC-11` nay đọc chính file chứa mã
 * thay vì `app/(portal)/page.tsx`, và các khẳng định phủ định quét cả bốn bề mặt apply
 * (`APPLY_UI_FILES`, gồm cả đảo client của trang chi tiết) để việc dời mã không để lại kẽ hở ở vị
 * trí mới. Ngưỡng không đổi một chữ.
 *   - DEC-11: `/` là UI marketplace duy nhất; `/jobs` và `/job-board` chỉ redirect.
 *   - DEC-06: adapter Upstash tắt analytics/protection. DEC-12/PLN-04: không `console.` trong
 *     guard/identity NÊN CẢ trong service apply; canonical route chỉ còn đúng một marker lỗi
 *     cố định (không nội suy PII của request).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const API_DIR = join(ROOT, 'app/api');
const CANONICAL_APPLY = join(API_DIR, 'public/jobs/[slug]/applications/route.ts');
const LEGACY_JOBS = join(API_DIR, 'jobs/route.ts');
const LEGACY_APPLY = join(API_DIR, 'jobs/apply/route.ts');
const TRACKING = join(API_DIR, 'public/applications/[trackingCode]/route.ts');
const LOGOUT = join(API_DIR, 'auth/logout/route.ts');
const LEGACY_JOBS_PAGE = join(ROOT, 'app/(jobs)/jobs/page.tsx');
const LEGACY_JOB_BOARD_PAGE = join(ROOT, 'app/job-board/page.tsx');
const PORTAL_PAGE = join(ROOT, 'app/(portal)/page.tsx');
// go-live-12 / RQ-09: hai modal apply/success đã rời `app/(portal)/page.tsx` sang thư mục dùng
// chung để trang chi tiết `/viec-lam/{code}` dùng lại đúng một bản. Detector đi theo mã, không
// nới lỏng: mọi khẳng định cũ trên `PORTAL_PAGE` giờ chạy trên chính file chứa mã, và các khẳng
// định phủ định chạy trên HỢP của cả ba file để không mở kẽ hở ở vị trí mới.
const APPLY_MODAL = join(ROOT, 'src/domains/job-board/components/apply-modal.tsx');
const SUCCESS_MODAL = join(ROOT, 'src/domains/job-board/components/success-modal.tsx');
// go-live-12 / RQ-07: trang chi tiết `/viec-lam/{code}` mở form qua đảo client này. Nó là bề mặt
// apply THỨ TƯ, nên phải nằm trong hợp `APPLY_UI_FILES`; để ngoài là chừa đúng một chỗ cho CV hay
// endpoint legacy quay lại mà không detector nào thấy.
const DETAIL_APPLY_CTA = join(ROOT, 'src/domains/job-board/components/detail-apply-cta.tsx');
const APPLY_UI_FILES = [PORTAL_PAGE, APPLY_MODAL, SUCCESS_MODAL, DETAIL_APPLY_CTA];
const TRACK_PAGE = join(ROOT, 'app/(jobs)/track/page.tsx');
const ADMIN_NAV = join(ROOT, 'src/shared/ui/role-guard/role-guard-layout.tsx');
const PUBLIC_JOB_SERVICE = join(ROOT, 'src/domains/job-board/public.service.ts');
const BODY_HELPER = join(ROOT, 'src/shared/security/request-body.ts');
const UPSTASH = join(ROOT, 'src/shared/security/rate-limit-upstash.ts');
const GUARD = join(ROOT, 'src/shared/security/rate-limit-guard.ts');
const IDENTITY = join(ROOT, 'src/shared/security/rate-limit-identity.ts');
const RAM_LIMITER = join(ROOT, 'src/domains/applications/rate-limit.ts');
const APPLY_SERVICE = join(ROOT, 'src/domains/applications/application.service.ts');

const read = (p: string) => readFileSync(p, 'utf8');
/** Bỏ comment: detector không được để chú thích "đánh lừa". */
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const rel = (p: string) => relative(ROOT, p).split(sep).join('/');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const API_FILES = walk(API_DIR).filter((p) => p.endsWith('.ts'));
const MUTATING = /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/;
const AUTH_MARKER =
  /getAuthContext|requireAuth|withDbContext|applyRlsContext|resolvePerms|requirePermission|assertPermission|getSessionUser|verifySession/;
// Ba route marketplace ẩn danh có chủ đích: 1 canonical apply + 2 stub 410.
const MARKETPLACE_ANON = [
  'app/api/public/jobs/[slug]/applications/route.ts',
  'app/api/jobs/route.ts',
  'app/api/jobs/apply/route.ts',
];
// Vòng đời phiên: login xác thực credential, logout chỉ xoá cookie (không ghi business).
const SESSION_ROUTES = ['app/api/auth/login/route.ts', 'app/api/auth/logout/route.ts'];

/** Có auth marker trực tiếp, hoặc uỷ quyền sang module `handler` cùng cây có marker. */
function guarded(file: string): boolean {
  const code = strip(read(file));
  if (AUTH_MARKER.test(code)) return true;
  const delegate = code.match(/from\s+'(\.{1,2}\/(?:[^']*\/)?handler)'/);
  if (!delegate) return false;
  const target = join(file, '..', `${delegate[1]}.ts`);
  return existsSync(target) && AUTH_MARKER.test(strip(read(target)));
}

/** Stub 410: KHÔNG nhận `req` ⇒ về mặt cấu trúc không thể parse body. */
const RETIRED_POST =
  /export\s+function\s+POST\s*\(\s*\)\s*:\s*NextResponse\s*\{\s*return\s+retiredApplyEndpointResponse\(\);\s*\}/;

describe('RQ-08 — inventory đường ghi ẩn danh', () => {
  it('đúng MỘT file dưới app/api gọi submitPublicApplication', () => {
    const callers = API_FILES.filter((p) => strip(read(p)).includes('submitPublicApplication'));
    expect(callers.map(rel)).toEqual(['app/api/public/jobs/[slug]/applications/route.ts']);
  });

  it('không còn file nào dưới app/api dùng service apply legacy', () => {
    const legacy = API_FILES.filter((p) => /applyForJob|createJobApplication/.test(strip(read(p))));
    expect(legacy.map(rel)).toEqual([]);
  });

  it('DEC-10: hai legacy write chỉ là stub 410 — không req, không Prisma, không service', () => {
    for (const file of [LEGACY_JOBS, LEGACY_APPLY]) {
      const code = strip(read(file));
      expect(code, rel(file)).toMatch(RETIRED_POST);
      expect(code, rel(file)).not.toContain('submitPublicApplication');
      expect(code, rel(file)).not.toMatch(/redirect|NextResponse\.redirect/);
    }
    // apply stub thuần: không chạm DB ở bất kỳ handler nào trong file.
    expect(strip(read(LEGACY_APPLY))).not.toContain('getPrisma');
    // logout chỉ xoá cookie ⇒ không phải write ẩn danh.
    expect(strip(read(LOGOUT))).not.toContain('getPrisma');
  });

  it('mọi route mutating khác đều có auth marker (trực tiếp hoặc qua handler)', () => {
    const allowed = new Set([...MARKETPLACE_ANON, ...SESSION_ROUTES]);
    const mutating = API_FILES.filter((p) => MUTATING.test(strip(read(p))));
    expect(mutating.map(rel)).toEqual(expect.arrayContaining(MARKETPLACE_ANON));
    const unguarded = mutating.filter((p) => !allowed.has(rel(p))).filter((p) => !guarded(p));
    expect(unguarded.map(rel)).toEqual([]);
  });
});
describe('RQ-01/DEC-01 — limiter RAM per-instance đã rời production path', () => {
  it('module Map limiter đã bị xoá và không còn file app/api nào tham chiếu', () => {
    expect(existsSync(RAM_LIMITER)).toBe(false);
    const referrers = API_FILES.filter((p) => strip(read(p)).includes('applications/rate-limit'));
    expect(referrers.map(rel)).toEqual([]);
  });

  it('tracking route dùng enforceRateLimits, không tự giữ Map/counter trong module', () => {
    const code = strip(read(TRACKING));
    expect(code).toContain('enforceRateLimits');
    expect(code).not.toMatch(/new\s+Map\s*[(<]/);
    expect(code).not.toMatch(/^\s*(const|let)\s+\w*(hits|buckets|counters)\w*\s*=/m);
  });

  // go-live-04 / STEP-07: mốc "chạm DB" đổi từ `$transaction` sang `getPrisma(` — bền với
  // refactor. Hai route browse nay đi qua `withPublicDb` nên không còn `$transaction` trần,
  // `indexOf` sẽ trả -1 và assert cũ vỡ. Ý nghĩa giữ nguyên: limiter chạy TRƯỚC khi lấy
  // client DB, và cả hai chỉ số phải là chỉ số THẬT của cùng một handler.
  it('cả bốn route public đều gọi guard trước khi chạm DB', () => {
    for (const file of [CANONICAL_APPLY, LEGACY_JOBS, TRACKING, join(API_DIR, 'jobs/[slug]/route.ts')]) {
      const code = strip(read(file));
      expect(code, rel(file)).toContain('enforceRateLimits');
      const handler = code.slice(code.search(/export\s+(async\s+)?function\s+GET|export\s+async\s+function\s+POST/));
      const limiterAt = handler.indexOf('enforceRateLimits');
      const dbAt = handler.indexOf('getPrisma(');
      expect(limiterAt, rel(file)).toBeGreaterThanOrEqual(0);
      expect(dbAt, rel(file)).toBeGreaterThan(0);
      expect(limiterAt, rel(file)).toBeLessThan(dbAt);
    }
  });
});

describe('RQ-06/07/DEC-09 — canonical apply: trần body, media gate, CV tắt', () => {
  const code = strip(read(CANONICAL_APPLY));
  const handler = code.slice(code.indexOf('export async function POST'));

  it('limiter IP chạy TRƯỚC khi đọc body (thứ tự tĩnh khớp bằng chứng runtime)', () => {
    expect(handler.indexOf('enforceRateLimits')).toBeLessThan(handler.indexOf('readCappedJson'));
  });

  it('dùng readCappedJson (trần + media-type gate), không có đường formData', () => {
    expect(code).toContain('readCappedJson');
    expect(code).not.toContain('formData');
    expect(code).not.toContain('multipart');
    // Route uỷ quyền trần cho helper (gọi không tham số ⇒ dùng default), nên trần
    // 16 KiB và hai nhánh gate phải được chứng minh tại chính request-body.ts.
    const helper = strip(read(BODY_HELPER));
    expect(helper).toMatch(/APPLY_MAX_BODY_BYTES\s*=\s*16\s*\*\s*1024/);
    expect(helper).toContain('PAYLOAD_TOO_LARGE');
    expect(helper).toContain('UNSUPPORTED_MEDIA_TYPE');
  });

  it('cv non-null ⇒ CV_UPLOAD_DISABLED và luôn forward cv: null xuống service', () => {
    expect(code).toContain('CV_UPLOAD_DISABLED');
    expect(code).toMatch(/cv:\s*null/);
  });
});
describe('RQ-07/DEC-11 — một UI apply canonical, hai URL cũ chỉ redirect', () => {
  const CANONICAL_FETCH = '/api/public/jobs/${encodeURIComponent(job.slug)}/applications';

  it('UI apply (trang + hai modal đã tách + đảo client trang chi tiết) không còn surface CV nào', () => {
    for (const file of APPLY_UI_FILES) {
      const code = strip(read(file));
      expect(code, rel(file)).not.toMatch(/type=['"]file['"]/);
      expect(code, rel(file)).not.toContain('CV_MIME');
      // Chỉ chặn API multipart THẬT. `ApplyFormData` là tên kiểu state của form —
      // `\b` không khớp `ApplyFormData(` nên detector không tự đánh lừa bằng tên kiểu.
      expect(code, rel(file)).not.toMatch(/new\s+FormData\b/);
      expect(code, rel(file)).not.toMatch(/\bFormData\s*\(/);
      expect(code, rel(file)).not.toContain('multipart');
      expect(code, rel(file)).not.toMatch(/\bcv\s*:/);
      expect(code, rel(file)).not.toMatch(/setCv|cvFile|cvMimeType|cvSizeBytes/);
    }
  });

  it('UI apply POST canonical path + idempotency key + consent', () => {
    const code = strip(read(APPLY_MODAL));
    expect(code).toContain(CANONICAL_FETCH);
    expect(code).toContain("'idempotency-key'");
    expect(code).toMatch(/consent:\s*true/);
    // GET /api/jobs (list) vẫn được; POST tới /api/jobs hoặc /api/jobs/apply thì không.
    for (const file of APPLY_UI_FILES) {
      const ui = strip(read(file));
      expect(ui, rel(file)).not.toMatch(/fetch\(\s*'\/api\/jobs'\s*,/);
      expect(ui, rel(file)).not.toContain('/api/jobs/apply');
    }
  });

  it('/jobs và /job-board redirect vĩnh viễn về /, không giữ UI/query/apply riêng', () => {
    for (const file of [LEGACY_JOBS_PAGE, LEGACY_JOB_BOARD_PAGE]) {
      const code = strip(read(file));
      expect(code, rel(file)).toContain("from 'next/navigation'");
      expect(code, rel(file)).toContain("permanentRedirect('/')");
      expect(code, rel(file)).not.toContain('/api/jobs');
      expect(code, rel(file)).not.toContain('getPrisma');
      expect(code, rel(file)).not.toContain('submitPublicApplication');
    }
  });

  it('success modal cho sao chép riêng mã và URL tra cứu, không đưa mã vào URL', () => {
    const code = strip(read(SUCCESS_MODAL));
    expect(code).toContain("const TRACKING_URL = `${CANONICAL_ORIGIN}/track`");
    expect(code).toContain("handleCopy('code', code)");
    expect(code).toContain("handleCopy('url', TRACKING_URL)");
    expect(code).toContain('aria-live="polite"');
    for (const file of APPLY_UI_FILES) {
      expect(strip(read(file)), rel(file)).not.toMatch(/\/track\?(?:code|trackingCode)=/);
    }
  });

  it('admin sidebar có Đơn ứng tuyển với đúng các role được queue cho phép', () => {
    const code = strip(read(ADMIN_NAV));
    expect(code).toMatch(
      /href:\s*['"]\/admin\/applications['"],\s*label:\s*['"]Đơn ứng tuyển['"],[\s\S]*?roles:\s*\[['"]ADMIN['"],\s*['"]HR_MANAGER['"],\s*['"]SALE['"],\s*['"]DIRECTOR['"]\]/,
    );
  });

  it('job card không dựng dữ liệu giả và đọc summary thật từ projection công khai', () => {
    const code = strip(read(PORTAL_PAGE));
    expect(code).not.toContain('job.salary');
    expect(code).not.toContain('availableSlots * 1.5');
    // go-live-05 / RQ-03, DEC-02: `'HRP Partners'` là tên một công ty không tồn tại, đặt đúng vào chỗ
    // tên nhà tuyển dụng — ứng viên đọc card không có cách nào biết đó là chữ bịa. Nhãn thay thế nói
    // đúng vai của HRPartner và vẫn không tiết lộ danh tính Client.
    expect(code).not.toContain('HRP Partners');
    expect(code).toContain("recruiter: 'Tuyển dụng qua HRPartner'");
    // go-live-05 / RQ-02, RQ-04: ba trường mô tả của card đến từ ba mảng summary do service tính trên
    // TẤT CẢ slot còn hiệu lực, không từ `slots[0]` theo thứ tự DB.
    expect(code).toContain('positions: job.positionTitles');
    expect(code).toContain('locations: job.locations');
    expect(code).toContain('shifts: job.shifts');
    // DEC-04: rỗng thì nói "đang cập nhật" — nhãn trung tính, không phải một giá trị bịa.
    expect(code).toContain("summaryLabel(job.locations, 'Địa điểm đang cập nhật')");
    expect(code).toContain("summaryLabel(job.shifts, 'Thời gian đang cập nhật')");
  });

  it('nút Tìm kiếm chuyển ba bộ lọc thật vào API, không còn control trang trí', () => {
    const page = strip(read(PORTAL_PAGE));
    const route = strip(read(LEGACY_JOBS));
    const service = strip(read(PUBLIC_JOB_SERVICE));
    expect(page).toContain("params.set('q', q)");
    expect(page).toContain("params.set('area', filters.area)");
    expect(page).toContain("params.set('shift', filters.shift)");
    expect(page).not.toMatch(/setTimeout\(\(\)\s*=>\s*setSearching/);
    // go-live-05 / RQ-07, DEC-07: hai nhóm checkbox `shiftType`/`jobType` đã bị loại khỏi UI. Chúng
    // gửi giá trị SUY DIỄN (`jobType` suy từ độ dài ca) và một giá trị không còn tồn tại (`xoay_ca`),
    // nên là control không có dữ liệu canonical chống lưng. Route vẫn parse chúng (out of scope) và
    // service vẫn lọc được — chỉ UI thôi không chào ra thứ nó không chứng minh được.
    expect(page).not.toMatch(/params\.append\('(?:shiftType|jobType)'/);
    expect(page).not.toContain('xoay_ca');
    expect(page).not.toMatch(/type="checkbox"/);
    // DEC-08: không còn danh sách tỉnh/ngành/ca gắn cứng trong UI.
    expect(page).not.toMatch(/const\s+(?:LOCATIONS|INDUSTRIES|WORK_TYPES|JOB_TYPES)\s*=/);
    expect(page).toContain('options={facets.areas}');
    expect(page).toContain('options={facets.shifts}');
    expect(route).toContain("searchParams.getAll('shiftType')");
    expect(route).toContain("searchParams.getAll('jobType')");
    expect(service).toContain('opts.shiftTypes.includes(job.shiftType)');
    expect(service).toContain('opts.jobTypes.includes(job.jobType)');
  });

  // go-live-05 v1.2 / DEC-13, RQ-18, AC-18 — control ngành nghề bị BỎ ở cả ba lớp (UI, route,
  // service). Lý do không phải thẩm mỹ: nó không có cột canonical đứng sau. `ClientCompany.industry`
  // có thật, nhưng `client_companies` bị FORCE RLS và principal công khai không có policy đọc
  // (`EV-09`), nên giá trị duy nhất từng chào ra dropdown là nhãn do một hàm regex suy ra từ văn bản
  // tự do. Khối này FAIL nếu bất kỳ lớp nào nối lại, kể cả bằng một facet suy diễn mang tên khác.
  it('không lớp nào chào ra facet/param ngành nghề, và không facet nào dựng từ hàm suy diễn', () => {
    const page = strip(read(PORTAL_PAGE));
    const route = strip(read(LEGACY_JOBS));
    const service = strip(read(PUBLIC_JOB_SERVICE));
    // Lớp UI: không dropdown, không state, không tham số gửi lên.
    expect(page).not.toMatch(/heading="Ngành nghề"/);
    expect(page).not.toMatch(/facets\.industries/);
    expect(page).not.toMatch(/industry/i);
    // Lớp route: không parse tham số đó nữa ⇒ không còn đường nào chuyển nó xuống service.
    expect(route).not.toMatch(/industry/i);
    // Lớp service: không khóa facet, không nhánh lọc theo tham số đó.
    expect(service).not.toMatch(/industries/);
    expect(service).not.toMatch(/opts\.industry\b/);
    // Payload facets phải mang ĐÚNG hai khóa, cả hai `summarize` từ mảng của DTO. Nối thêm một khóa
    // thứ ba — dù tên gì — là vỡ cả interface lẫn phép đếm dưới đây.
    expect(service).toMatch(/export interface PublicJobFacets \{\s*areas: string\[\];\s*shifts: string\[\];\s*\}/);
    const fromFacets = service.slice(service.indexOf('const facets: PublicJobFacets = {'));
    const facetsObject = fromFacets.slice(0, fromFacets.indexOf('};') + 2);
    expect(facetsObject).toContain('areas: summarize(eligible.flatMap(({ job }) => job.locations))');
    expect(facetsObject).toContain('shifts: summarize(eligible.flatMap(({ job }) => job.shifts))');
    expect(facetsObject.match(/\w+: summarize\(/g)).toHaveLength(2);
    // Hàng rào thật của `RQ-18`: không facet nào được dựng từ một hàm `infer*`.
    expect(facetsObject).not.toMatch(/infer/i);
    // go-live-14 / RQ-02, RQ-03, DEC-05 — ranh giới ĐỔI DẤU. Hai dòng cũ ở đây khẳng định
    // `function inferIndustry(` và `industry: inferIndustry(searchableText, null)` VẪN PHẢI CÒN, tức
    // chúng khoá chính defect vào chỗ; chúng đã được thay bằng bốn phủ định dưới đây, không xoá trắng.
    // Hai dòng cuối là hàng rào chống-đổi-tên của `RQ-03`: một hàm `inferSector` trả nguyên năm nhãn
    // cũ vẫn FAIL, vì bằng chứng là sự VẮNG MẶT của regex từ khoá và của năm nhãn cứng, không phải
    // sự vắng mặt của một cái tên. `service` đã bỏ comment nên chú thích không đổi được kết luận.
    expect(service).not.toMatch(/industry/i);
    expect(service).not.toMatch(/infer/i);
    expect(service).not.toMatch(/may mac|thuc pham|van tai|logistic|warehouse|garment|sewing/);
    expect(service).not.toMatch(/Kho vận|May mặc|Thực phẩm|Điện tử|Công nghiệp chế tạo/);
  });

  it('phân trang của trang việc làm đọc `nextOffset` thật, không có spinner hẹn giờ', () => {
    const page = strip(read(PORTAL_PAGE));
    // go-live-05 / RQ-17: khẳng định sai "API doesn't support pagination yet" đã bị xoá — `route.ts`
    // parse `offset`/`limit` từ trước, nên niềm tin đó sai ngay lúc được viết ra.
    expect(page).not.toMatch(/API doesn't support pagination/i);
    expect(page).not.toMatch(/setHasMore\(false\)/);
    // RQ-08: spinner cũ chỉ là `setTimeout(…, 800)` rồi tự tắt, không tải thêm một dòng nào.
    expect(page).not.toMatch(/setTimeout\(\(\)\s*=>\s*setLoadingMore/);
    expect(page).toContain("void runQuery(appliedFilters, nextOffset, 'append')");
    expect(page).toContain('dedupeById([...prev, ...incoming])');
    expect(page).toContain('nextOffset === null');
    // DEC-09: hai lớp chống race, và `total` in ra là số của API.
    expect(page).toContain('new AbortController()');
    expect(page).toContain('generation !== generationRef.current');
    expect(page).toMatch(/Tìm thấy \$\{total\} kết quả/);
  });

  it('trang track có nút Tra cứu nhìn thấy được và render ba field đối chiếu', () => {
    const code = strip(read(TRACK_PAGE));
    expect(code).toContain("backgroundColor: 'var(--color-primary-dark)'");
    expect(code).toContain("{loading ? 'Đang tra...' : 'Tra cứu'}");
    expect(code).toContain('{result.fullName}');
    expect(code).toContain("{result.phoneMasked || 'Không cung cấp'}");
    expect(code).toContain("{result.cccdMasked || 'Không cung cấp'}");
  });
});

describe('DEC-06/DEC-12 — adapter kín và không log identifier', () => {
  it('Upstash tắt analytics + protection (SDK không nhận raw IP)', () => {
    const code = strip(read(UPSTASH));
    expect(code).toMatch(/analytics:\s*false/);
    expect(code).toMatch(/enableProtection:\s*false/);
  });

  it('guard/identity không có console.*; identity không import logger', () => {
    expect(strip(read(GUARD))).not.toMatch(/console\./);
    expect(strip(read(IDENTITY))).not.toMatch(/console\./);
    // Raw IP/phone/tracking code chỉ đi qua identity ⇒ module này không được có kênh log.
    expect(strip(read(IDENTITY))).not.toContain('observability/logger');
  });

  it('PLN-04: service apply/tracking KHÔNG có kênh console nào', () => {
    // Chốt tĩnh cho finding PLN-04 (round 3): một dòng debug in fullName + phone + trackingCode
    // đã bị xoá. Detector này fail NGAY nếu ai đó thêm lại bất kỳ `console.` nào vào service —
    // rẻ hơn và sớm hơn mọi assertion runtime.
    expect(strip(read(APPLY_SERVICE))).not.toMatch(/console\./);
  });

  it('PLN-04: canonical apply route chỉ có ĐÚNG 1 console — marker cố định, không nội suy PII', () => {
    const calls = strip(read(CANONICAL_APPLY)).match(/console\.\w+\([^)]*\)?/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('[public apply] unexpected error');
    // Marker là literal cố định: không template, không field request nào bị nối vào.
    expect(calls[0]).not.toMatch(/fullName|phone|cccd|tracking|consent|body|payload|\$\{/i);
  });

  it('.env.example chỉ khai TÊN biến, giá trị để rỗng (không commit secret)', () => {
    const env = read(join(ROOT, '.env.example'));
    for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RATE_LIMIT_HASH_SECRET']) {
      expect(env, name).toMatch(new RegExp(`^${name}=\\s*$`, 'm'));
    }
  });
});
