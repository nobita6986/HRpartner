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

  it('app/(portal)/page.tsx không còn surface CV nào', () => {
    const code = strip(read(PORTAL_PAGE));
    expect(code).not.toMatch(/type=['"]file['"]/);
    expect(code).not.toContain('CV_MIME');
    // Chỉ chặn API multipart THẬT. `ApplyFormData` là tên kiểu state của form —
    // `\b` không khớp `ApplyFormData(` nên detector không tự đánh lừa bằng tên kiểu.
    expect(code).not.toMatch(/new\s+FormData\b/);
    expect(code).not.toMatch(/\bFormData\s*\(/);
    expect(code).not.toContain('multipart');
    expect(code).not.toMatch(/\bcv\s*:/);
    expect(code).not.toMatch(/setCv|cvFile|cvMimeType|cvSizeBytes/);
  });

  it('app/(portal)/page.tsx POST canonical path + idempotency key + consent', () => {
    const code = strip(read(PORTAL_PAGE));
    expect(code).toContain(CANONICAL_FETCH);
    expect(code).toContain("'idempotency-key'");
    expect(code).toMatch(/consent:\s*true/);
    // GET /api/jobs (list) vẫn được; POST tới /api/jobs hoặc /api/jobs/apply thì không.
    expect(code).not.toMatch(/fetch\(\s*'\/api\/jobs'\s*,/);
    expect(code).not.toContain('/api/jobs/apply');
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
    const code = strip(read(PORTAL_PAGE));
    expect(code).toContain("const TRACKING_URL = `${CANONICAL_ORIGIN}/track`");
    expect(code).toContain("handleCopy('code', code)");
    expect(code).toContain("handleCopy('url', TRACKING_URL)");
    expect(code).toContain('aria-live="polite"');
    expect(code).not.toMatch(/\/track\?(?:code|trackingCode)=/);
  });

  it('admin sidebar có Đơn ứng tuyển với đúng các role được queue cho phép', () => {
    const code = strip(read(ADMIN_NAV));
    expect(code).toMatch(
      /href:\s*['"]\/admin\/applications['"],\s*label:\s*['"]Đơn ứng tuyển['"],[\s\S]*?roles:\s*\[['"]ADMIN['"],\s*['"]HR_MANAGER['"],\s*['"]SALE['"],\s*['"]DIRECTOR['"]\]/,
    );
  });

  it('job card không dựng lương giả từ số slot và dùng location/shift thật từ API', () => {
    const code = strip(read(PORTAL_PAGE));
    expect(code).not.toContain('job.salary');
    expect(code).not.toContain('availableSlots * 1.5');
    expect(code).toContain("location: job.location?.trim() || 'Địa điểm đang cập nhật'");
    expect(code).toContain("schedule: job.shift?.trim() || 'Thời gian đang cập nhật'");
  });

  it('nút Tìm kiếm chuyển đủ năm nhóm filter vào API, không còn spinner giả 300 ms', () => {
    const page = strip(read(PORTAL_PAGE));
    const route = strip(read(LEGACY_JOBS));
    const service = strip(read(PUBLIC_JOB_SERVICE));
    expect(page).toContain("params.set('q', q)");
    expect(page).toContain("params.set('area', filters.location)");
    expect(page).toContain("params.set('industry', filters.industry)");
    expect(page).toContain("params.append('shiftType', shiftType)");
    expect(page).toContain("params.append('jobType', jobType)");
    expect(page).not.toMatch(/setTimeout\(\(\)\s*=>\s*setSearching/);
    expect(route).toContain("searchParams.getAll('shiftType')");
    expect(route).toContain("searchParams.getAll('jobType')");
    expect(service).toContain('opts.shiftTypes.includes(job.shiftType)');
    expect(service).toContain('opts.jobTypes.includes(job.jobType)');
  });

  it('trang track có nút Tra cứu nhìn thấy được và render ba field đối chiếu', () => {
    const code = strip(read(TRACK_PAGE));
    expect(code).toContain("backgroundColor: 'var(--color-primary)'");
    expect(code).toContain("{loading ? 'Đang tra...' : 'Tra cứu'}");
    expect(code).toContain('{result.fullName}');
    expect(code).toContain('{result.phone}');
    expect(code).toContain("{result.cccdNumber || 'Không cung cấp'}");
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
