# -*- coding: utf-8 -*-
# STEP-05 cua hrp-v5-go-live-18: dua limiter vao loadJob, TREN withPublicDb.
import io, re

P = "app/(jobs)/viec-lam/[slug]/page.tsx"
raw = io.open(P, "rb").read().decode("utf-8")
EOL = "\r\n" if "\r\n" in raw else "\n"
t0 = raw.replace("\r\n", "\n")

DOC_OLD = u""" * nên trang này không tự gọi mạng và không tự dựng form thứ hai.
 */"""

DOC_NEW = u""" * nên trang này không tự gọi mạng và không tự dựng form thứ hai.
 *
 * go-live-18 / RQ-02, RQ-03, RQ-04 / DEC-01..DEC-04: đường đọc DB của trang đi qua limiter TRƯỚC
 * khi chạm DB. Limiter nằm TRONG `loadJob`, phía trên `withPublicDb`, vì `loadJob` là đường duy
 * nhất tới DB và được CẢ `generateMetadata` lẫn thân trang dùng lại: đặt ở thân trang thôi thì
 * lượt render metadata vẫn truy vấn, còn gọi hai lần thì đếm đôi cùng một ngân sách `JOB_BROWSE`
 * — rule đó dùng CHUNG cho danh sách và chi tiết (`EV-03`, `DEC-02`).
 *
 * Giới hạn CÓ TÊN (`DEC-03`, `RQ-04`): Server Component của Next `15.1` KHÔNG đặt được status
 * code, nên nhánh bị từ chối vẫn trả HTTP `200` kèm một khối thông báo. Điều được bảo đảm là ZERO
 * truy vấn DB ở nhánh đó, KHÔNG phải một mã `429`.
 */"""

IMP_OLD = u"""import type { Metadata } from 'next';
import Link from 'next/link';"""

IMP_NEW = u"""import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';"""

IMP2_OLD = u"""import { getPublicJobDetail } from '@/src/domains/job-board/public.service';"""

IMP2_NEW = u"""import { getPublicJobDetail } from '@/src/domains/job-board/public.service';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { evaluateRateLimits, RATE_LIMITED_MESSAGE } from '@/src/shared/security/rate-limit-guard';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';"""

LOAD_OLD = u"""/**
 * `cache` của React gộp hai lần gọi trong CÙNG một request render (metadata và thân trang) thành
 * một truy vấn. Đây không phải cache giữa các request nên `force-dynamic` giữ nguyên hiệu lực.
 */
const loadJob = cache(async (slug: string) =>
  withPublicDb(getPrisma(), (tx) => getPublicJobDetail(tx, slug)),
);"""

LOAD_NEW = u"""/** Route class TĨNH cho log của limiter: template, KHÔNG phải URL thật (`DEC-12` của ops-06a). */
const ROUTE_CLASS = 'GET /viec-lam/[slug]';

/** Tiêu đề của nhánh bị từ chối. KHÔNG dùng lại nhãn 404, vì đó là nói sai sự thật (`RQ-03`). */
const RATE_LIMITED_TITLE = 'Bạn thao tác quá nhanh';

/** Lấy kiểu từ chính service, nên không có khai báo thứ hai nào phải giữ đồng bộ bằng tay. */
type LoadedJob = NonNullable<Awaited<ReturnType<typeof getPublicJobDetail>>>;

/** Ba kết cục PHÂN BIỆT được: có việc, không có việc, và bị limiter từ chối (`RQ-03`). */
type JobLoadResult =
  | { readonly kind: 'ok'; readonly job: LoadedJob }
  | { readonly kind: 'missing' }
  | { readonly kind: 'throttled' };

/**
 * `cache` của React gộp hai lần gọi trong CÙNG một request render (metadata và thân trang) thành
 * một truy vấn. Đây không phải cache giữa các request nên `force-dynamic` giữ nguyên hiệu lực.
 *
 * Vì gộp, limiter đặt ở ĐÂY chạy ĐÚNG một lần mỗi request render và chặn cả hai đường vào DB một
 * lượt (`RQ-02`). Dùng `evaluateRateLimits` — điểm vào chỉ-trả-quyết-định của `DEC-01` — vì một
 * Server Component không trả được `NextResponse`.
 */
const loadJob = cache(async (slug: string): Promise<JobLoadResult> => {
  const requestHeaders = await headers();
  const outcome = await evaluateRateLimits({
    buckets: [
      { rule: RATE_LIMIT_RULES.JOB_BROWSE, value: clientIpFromHeaders(requestHeaders, process.env) },
    ],
    routeClass: ROUTE_CLASS,
    requestId: getCorrelationId(requestHeaders),
  });
  // Cả `rate-limited` lẫn `unavailable` đều KHÔNG được chạm DB: fail-closed (`DEC-02`).
  if (outcome.kind !== 'allowed') return { kind: 'throttled' };

  const job = await withPublicDb(getPrisma(), (tx) => getPublicJobDetail(tx, slug));
  return job ? { kind: 'ok', job } : { kind: 'missing' };
});"""

META_OLD = u"""  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) return { title: PUBLIC_JOB_NOT_FOUND_TITLE };"""

META_NEW = u"""  const { slug } = await params;
  const result = await loadJob(slug);
  // `RQ-03`: nhánh bị từ chối không được nói việc làm không tồn tại, kể cả trong thẻ tiêu đề.
  if (result.kind === 'throttled') return { title: RATE_LIMITED_TITLE };

  const job = result.kind === 'ok' ? result.job : null;
  if (!job) return { title: PUBLIC_JOB_NOT_FOUND_TITLE };"""

NOTICE = u"""/**
 * Nhánh bị limiter từ chối (`RQ-03`, `AC-06`). KHÔNG nhận một prop nào, nên không có đường nào để
 * slug, IP hay bất kỳ giá trị request nào lọt lên màn hình. Cũng KHÔNG gọi `notFound()`: nói rằng
 * việc làm không tồn tại là nói sai sự thật về một bản ghi chưa hề được đọc.
 */
function ThrottledNotice() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: 'var(--color-primary-dark)' }}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Quay lại danh sách việc làm
      </Link>

      <section
        className="mt-4 rounded-xl border p-5 sm:p-6"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
        aria-live="polite"
      >
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
          {RATE_LIMITED_TITLE}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          {RATE_LIMITED_MESSAGE}
        </p>
      </section>
    </div>
  );
}

export default async function PublicJobDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await loadJob(slug);
  if (result.kind === 'throttled') return <ThrottledNotice />;

  const job = result.kind === 'ok' ? result.job : null;
  if (!job) notFound();"""

BODY_OLD = u"""export default async function PublicJobDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) notFound();"""

t = t0
for old, new in [(DOC_OLD, DOC_NEW), (IMP_OLD, IMP_NEW), (IMP2_OLD, IMP2_NEW),
                 (LOAD_OLD, LOAD_NEW), (META_OLD, META_NEW), (BODY_OLD, NOTICE)]:
    n = t.count(old)
    assert n == 1, "count=%d for %r" % (n, old[:70])
    t = t.replace(old, new, 1)

# --- Hang rao public-detail.static.test.ts la tep NGOAI pham vi: phai con xanh ---
for b in ['clientCompany', '$transaction', 'applyRlsContext', 'set_config', 'hourlyRate', 'description']:
    assert b not in t, "BANNED: " + b
assert not re.search(r"industry", t, re.I) and 'icon="factory"' not in t
assert not re.search(r"\bfetch\(", t) and not re.search(r"^\s*'use client'", t, re.M)
assert t.index("withPublicDb(") < t.index("getPublicJobDetail(")
assert re.search(r"export\s+const\s+dynamic\s*=\s*'force-dynamic'", t)
assert re.search(r"export\s+const\s+runtime\s*=\s*'nodejs'", t)
assert re.search(r"if\s*\(!job\)\s*return\s*\{\s*title:\s*PUBLIC_JOB_NOT_FOUND_TITLE\s*\}", t)
assert 'twitter' not in t and not re.search(r"images:\s*\[", t)
assert re.search(r"canonical:\s*`\$\{CANONICAL_ORIGIN\}", t) and 'href="/"' in t
assert 'Quay lại danh sách việc làm' in t

code = re.sub(r"//.*$", "", re.sub(r"/\*[\s\S]*?\*/", "", t), flags=re.M)
assert len(re.findall(r"notFound\(\)", code)) == 1, "notFound() != 1"
assert re.search(r"if\s*\(!job\)\s*notFound\(\);", code)
assert not re.search(r"availableSlots[^\n]*notFound", code)
assert not re.search(r"salary|luong|lương|\bVND\b", code, re.I)
assert 'HRP Partners' not in code

anchor = '<div className="mt-4 flex flex-wrap items-center gap-2">'
row = t[t.index(anchor):]
row = row[:row.index("</div>")]
assert row.count("<Chip ") == 3, "chip row %d" % row.count("<Chip ")
assert '<Chip icon="work" label={JOB_TYPE_LABELS[job.jobType]} />' in row
assert t.count("<Chip ") == 5, "chip total %d" % t.count("<Chip ")

# --- RQ-02/AC-04: limiter dung TRUOC moi loi goi DB, ngay trong loadJob ---
assert t.index("evaluateRateLimits({") < t.index("withPublicDb(getPrisma()")
assert "RATE_LIMIT_RULES.JOB_BROWSE" in t and "clientIpFromHeaders(requestHeaders, process.env)" in t
assert t.count("evaluateRateLimits(") == 1  # dung MOT loi goi cho ca metadata va than trang
assert t.count("enforceRateLimits") == 0

io.open(P, "wb").write(t.replace("\n", EOL).encode("utf-8"))
print("STEP-05 OK", len(t0), "->", len(t), "| eol", repr(EOL))
