/**
 * /bod — Ban Giám đốc Control Tower (M10 RQ-01, RQ-02, RQ-03).
 *
 * Adapted từ docs/tasks/hrp-v4-bod-mockup/mockup/S01_ControlTower_Default_1440.html.
 * Sử dụng mock data (DEC-01) — chưa tích hợp API thật.
 *
 * Tailwind utilities thay vì CSS-in-JS để tránh đụng độ Design System M1 (RISK-01).
 */
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bvp',
  display: 'swap',
});

// ── Mock data (DEC-01) ──────────────────────────────────────────
const KPI_STRIP = [
  {
    label: 'Active',
    icon: 'groups',
    value: '1.842',
    unit: 'người',
    sub: 'Lao động đang làm việc toàn miền',
    delta: { sign: 'up' as const, text: '+132 · 8 tuần' },
    href: '#proj',
  },
  {
    label: 'Thiếu',
    icon: 'person_off',
    value: '126',
    unit: 'người',
    sub: 'Nhu cầu − ACTIVE toàn miền',
    delta: null,
    href: '#proj',
  },
  {
    label: 'Công hoàn chỉnh',
    icon: 'task_alt',
    value: '97,8',
    unit: '%',
    sub: 'Bảng công đã khớp & duyệt',
    delta: null,
    href: '#proj',
  },
  {
    label: 'ĐS sẵn sàng',
    icon: 'send',
    value: '12',
    unit: '/15',
    sub: 'Bộ đối soát sẵn sàng gửi',
    delta: null,
    href: '#proj',
  },
];

const QUEUE_ITEMS = [
  {
    severity: 'danger' as const,
    icon: 'error',
    title: 'An Phát — thiếu 3 người',
    sub: '47/50 ACTIVE · cần bố trí đủ nhu cầu 50',
    href: '/admin/staffing',
  },
  {
    severity: 'warning' as const,
    icon: 'error',
    title: 'An Phát — 7 ngoại lệ công chờ xử lý',
    sub: 'Batch PREVIEWED 08:14 · xử lý trước khi khóa kỳ',
    href: '/admin/attendance',
  },
  {
    severity: 'warning' as const,
    icon: 'schedule',
    title: 'Bắc Việt · phản hồi còn 2 ngày',
    sub: 'Statement kỳ 08/2026 · hạn 18/08 18:00',
    href: '/admin/reconciliation',
  },
  {
    severity: 'info' as const,
    icon: 'person_search',
    title: '2 hồ sơ nguồn mới cần review',
    sub: 'Chờ HR xác minh trước khi vào Talent Pool',
    href: '/admin/staffing',
  },
];

const FILL_RATE = [
  { name: 'An Phát', pct: 94, label: '47/50 · 94,0%' },
  { name: 'Yên Phong', pct: 100, label: '80/80 · 100,0%' },
  { name: 'Sao Việt', pct: 91.4, label: '32/35 · 91,4%' },
];

const PRIORITY_PROJECTS = [
  {
    name: 'Nhà máy Điện tử An Phát',
    code: 'DA-2026-018',
    pm: 'Nguyễn Thùy Linh',
    needActive: '47/50',
    needBadge: { kind: 'danger', icon: 'error', text: 'Thiếu 3' },
    timesheetBadge: { kind: 'warning', icon: 'error', text: '7 ngoại lệ' },
    statementBadge: { kind: 'info', icon: 'send', text: 'Đã gửi' },
    margin: { money: '186.360.000 ₫', pct: '20,37%' },
    cta: { kind: 'primary', icon: 'group_add', text: 'Bố trí người' },
    highlight: true,
  },
  {
    name: 'Kho vận Yên Phong',
    code: 'DA-2026-022',
    pm: 'Trần Quốc Bảo',
    needActive: '80/80',
    needBadge: { kind: 'success', icon: 'check_circle', text: 'Đủ' },
    timesheetBadge: { kind: 'success', icon: 'lock', text: 'Đã khóa' },
    statementBadge: { kind: 'success', icon: 'check_circle', text: 'Đã xác nhận' },
    margin: { money: '108.100.000 ₫', pct: '17,42%' },
    cta: null,
    highlight: false,
  },
  {
    name: 'Nhà máy Sao Việt',
    code: 'PRJ-SV-014',
    pm: 'Nguyễn Hữu Tâm',
    needActive: '32/35',
    needBadge: { kind: 'warning', icon: 'error', text: 'Thiếu 3' },
    timesheetBadge: null,
    statementBadge: { kind: 'neutral', icon: 'draft', text: 'Nháp' },
    margin: { money: '36.300.000 ₫', pct: '11,89%' },
    cta: { kind: 'secondary', icon: 'group_add', text: 'Bố trí người' },
    highlight: false,
  },
];

// ── Helpers ─────────────────────────────────────────────────────
const BADGE_KIND_STYLES: Record<string, string> = {
  danger: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
};

const SEVERITY_ICON_STYLES: Record<string, string> = {
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info: 'bg-blue-100 text-blue-600',
};

function MaterialIcon({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) {
  return <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>;
}

function Badge({ kind, icon, text }: { kind: string; icon: string; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_KIND_STYLES[kind] ?? BADGE_KIND_STYLES.neutral}`}>
      <MaterialIcon name={icon} className="text-base leading-none" />
      {text}
    </span>
  );
}

// ── Inline SVG line chart (xu hướng ACTIVE 8 tuần) ──────────────
function TrendChart() {
  const points = [
    { x: 34, y: 100.6, label: '1.710', weekLabel: 'T-7' },
    { x: 76, y: 87.9, label: '', weekLabel: '' },
    { x: 118, y: 75.6, label: '', weekLabel: 'T-5' },
    { x: 160, y: 63.2, label: '', weekLabel: '' },
    { x: 202, y: 55, label: '', weekLabel: 'T-3' },
    { x: 244, y: 60.5, label: '1.798', weekLabel: '' },
    { x: 286, y: 47.7, label: '', weekLabel: '' },
    { x: 328, y: 40.4, label: '1.842', weekLabel: 'Hôm nay' },
  ];
  const linePath = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  return (
    <svg viewBox="0 0 340 150" className="w-full" role="img" aria-label="ACTIVE 8 tuần">
      <g stroke="var(--outline-variant)" strokeWidth="1">
        <line x1="34" y1="105.2" x2="328" y2="105.2" />
        <line x1="34" y1="82.4" x2="328" y2="82.4" />
        <line x1="34" y1="59.6" x2="328" y2="59.6" />
        <line x1="34" y1="36.8" x2="328" y2="36.8" />
      </g>
      <g fill="var(--on-surface-variant)" fontSize="9" textAnchor="end">
        <text x="30" y="108.2">1.700</text>
        <text x="30" y="85.4">1.750</text>
        <text x="30" y="62.6">1.800</text>
        <text x="30" y="39.8">1.850</text>
      </g>
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3"
          fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
      ))}
      <circle cx="328" cy="40.4" r="7" fill="rgba(242,101,34,0.18)" />
      <circle cx="328" cy="40.4" r="4.5" fill="var(--primary)" />
      <g fontSize="10.5" fill="var(--on-surface)" fontWeight={600}>
        {points.filter(p => p.label).map((p, i) => (
          <text key={i} x={p.x} y={p.label === '1.842' ? 30 : (p.y - 8)} textAnchor={p.label === '1.842' ? 'end' : 'middle'}>{p.label}</text>
        ))}
      </g>
      <g fontSize="9.5" fill="var(--on-surface-variant)" textAnchor="middle">
        {points.filter(p => p.weekLabel).map((p, i) => (
          <text key={i} x={p.x} y={146}
            textAnchor={p.weekLabel === 'Hôm nay' ? 'end' : 'middle'}>{p.weekLabel}</text>
        ))}
      </g>
    </svg>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default function BodPage() {
  return (
    <div className={`${beVietnamPro.variable} max-w-[1440px] mx-auto px-4 sm:px-6 py-6`} style={{ fontFamily: 'var(--font-bvp), system-ui, sans-serif' }}>
      {/* Page head */}
      <div className="mb-6">
        <div className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          Vận hành <span className="mx-1">/</span> Tổng quan
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--on-surface)' }}>
              Tổng quan vận hành
            </h1>
            <div className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
              Dữ liệu cập nhật 15/08/2026 · 08:42 · DỮ LIỆU MINH HỌA
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-container, transparent)' }}>
              <MaterialIcon name="domain" className="text-base" />
              Miền Bắc
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface-variant)' }}>
              <MaterialIcon name="calendar_month" className="text-base" />
              08/2026
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-50"
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>
              <MaterialIcon name="refresh" className="text-base" />
              Tải lại
            </button>
          </div>
        </div>
      </div>

      {/* Watermark banner */}
      <div className="mb-4 rounded-md border px-3 py-2 text-xs font-medium"
        style={{ borderColor: '#fcd34d', background: '#fef3c7', color: '#92400e' }}>
        DỮ LIỆU MINH HỌA — Khi này dùng Mock JSON. Production cần tích hợp API tính toán KPI thật.
      </div>

      {/* KPI strip — flat band, 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" aria-label="Chỉ số vận hành toàn miền">
        {KPI_STRIP.map(k => (
          <a key={k.label} href={k.href}
            className="block rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
            style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
              <MaterialIcon name={k.icon} className="text-base" />
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>
              {k.value} <span className="text-sm font-normal" style={{ color: 'var(--on-surface-variant)' }}>{k.unit}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{k.sub}</div>
            {k.delta && (
              <div className={`inline-flex items-center gap-1 mt-1 text-xs font-medium ${
                k.delta.sign === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                <MaterialIcon name="trending_up" className="text-sm" />
                {k.delta.text}
              </div>
            )}
          </a>
        ))}
      </div>

      {/* Queue + Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-3 mb-6">
        {/* Hàng đợi cần xử lý */}
        <section className="rounded-xl border shadow-sm overflow-hidden"
          style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
          <header className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--outline-variant)' }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
              <MaterialIcon name="bolt" className="text-base" />
              Hàng đợi cần xử lý
            </div>
            <span className="rounded-full border px-2 py-0.5 text-xs"
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface-variant)' }}>
              {QUEUE_ITEMS.length} việc
            </span>
          </header>
          <ul className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
            {QUEUE_ITEMS.map((q, i) => (
              <li key={i}>
                <a href={q.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${SEVERITY_ICON_STYLES[q.severity]}`}>
                    <MaterialIcon name={q.icon} className="text-base" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--on-surface)' }}>{q.title}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>{q.sub}</div>
                  </div>
                  <MaterialIcon name="chevron_right" className="text-base" style={{ color: 'var(--on-surface-variant)' }} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Charts: Trend + Fill rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <section className="rounded-xl border shadow-sm"
            style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
            <header className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--outline-variant)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                <MaterialIcon name="show_chart" className="text-base" />
                Xu hướng 8 tuần — ACTIVE
              </div>
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>toàn miền</span>
            </header>
            <div className="px-4 py-4">
              <TrendChart />
              <p className="text-xs mt-2" style={{ color: 'var(--on-surface-variant)' }}>
                1.842 ACTIVE · <b style={{ color: 'var(--on-surface)' }}>+132 (+7,7%)</b> trong 8 tuần · cao nhất kỳ
              </p>
            </div>
          </section>

          <section className="rounded-xl border shadow-sm"
            style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
            <header className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--outline-variant)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                <MaterialIcon name="donut_small" className="text-base" />
                Fill rate — kỳ này
              </div>
            </header>
            <div className="px-4 py-4 space-y-3">
              {FILL_RATE.map(f => (
                <div key={f.name} className="grid grid-cols-[110px_1fr_108px] items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>{f.name}</span>
                  <div className="h-2 rounded-full overflow-hidden relative" style={{ background: 'var(--surface-container)' }}>
                    <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: 'var(--primary)' }} />
                  </div>
                  <span className="text-xs font-mono text-right" style={{ color: 'var(--on-surface)' }}>{f.label}</span>
                </div>
              ))}
              <p className="text-xs pt-2" style={{ color: 'var(--on-surface-variant)' }}>
                Fill rate = ACTIVE / Nhu cầu · vạch đứt = target 100%
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Danh mục dự án ưu tiên */}
      <section id="proj" className="rounded-xl border shadow-sm overflow-hidden"
        style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        <header className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--outline-variant)' }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            <MaterialIcon name="work" className="text-base" />
            Danh mục dự án ưu tiên
          </div>
          <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Click CTA để bố trí người</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--surface-container)' }}>
              <tr className="text-left">
                <th className="px-4 py-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>Dự án</th>
                <th className="px-4 py-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>PM</th>
                <th className="px-4 py-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>Nhu cầu / Active</th>
                <th className="px-4 py-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>Công</th>
                <th className="px-4 py-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>Statement</th>
                <th className="px-4 py-2 font-medium text-right" style={{ color: 'var(--on-surface-variant)' }}>Margin dự kiến</th>
                <th className="px-4 py-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>CTA</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITY_PROJECTS.map(p => (
                <tr key={p.code}
                  className={p.highlight ? 'bg-amber-50/40' : ''}
                  style={{ borderTop: '1px solid var(--outline-variant)' }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: 'var(--on-surface)' }}>{p.name}</div>
                    <div className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{p.code}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--on-surface)' }}>{p.pm}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{p.needActive}</span>{' '}
                    <Badge kind={p.needBadge.kind} icon={p.needBadge.icon} text={p.needBadge.text} />
                  </td>
                  <td className="px-4 py-3">
                    {p.timesheetBadge ? (
                      <Badge kind={p.timesheetBadge.kind} icon={p.timesheetBadge.icon} text={p.timesheetBadge.text} />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge kind={p.statementBadge.kind} icon={p.statementBadge.icon} text={p.statementBadge.text} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold" style={{ color: 'var(--on-surface)' }}>{p.margin.money}</div>
                    <div className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{p.margin.pct}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.cta ? (
                      <a href="/admin/staffing"
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                          p.cta.kind === 'primary'
                            ? 'text-white'
                            : 'border'
                        }`}
                        style={p.cta.kind === 'primary'
                          ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                          : { borderColor: 'var(--outline)', color: 'var(--on-surface)' }}>
                        <MaterialIcon name={p.cta.icon} className="text-base" />
                        {p.cta.text}
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Đã đủ người</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className="px-4 py-2 text-xs text-center" style={{ color: 'var(--on-surface-variant)' }}>
                  … và 2 dự án khác (ẩn gộp) — danh mục đầy đủ tại màn Dự án · hàng nền nhạt = ưu tiên demo
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Material Symbols font (for icons) */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      <style>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal; font-style: normal;
          font-size: 24px; line-height: 1;
          letter-spacing: normal; text-transform: none;
          display: inline-block; white-space: nowrap; word-wrap: normal;
          direction: ltr; -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}