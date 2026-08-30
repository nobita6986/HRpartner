/**
 * /admin/jobs — quản lý tin tuyển dụng công khai.
 *
 * 3 tab: danh sách dự án (bật/tắt tin), hồ sơ ứng viên gửi về, và claim nguồn.
 *
 * Cột "Slot trống" tính đúng công thức mà API publish dùng
 * (src/domains/job-board/publish.service.ts): chỉ đơn OPEN/CLOSING_SOON còn hạn,
 * chỉ slot còn hiệu lực, cộng max(0, cần - đã có). Chưa đọc đủ đơn thì để dấu
 * gạch, KHÔNG in 0 — vì 0 là tín hiệu "không publish được".
 */
'use client';

import { useState, useEffect } from 'react';

type Tab = 'jobs' | 'submissions' | 'claims';

interface Job {
  id: string;
  title: string;
  projectCode: string;
  status: string;
  isPublic: boolean;
  version: number;
}

interface OrderSlot {
  slotsNeeded: number;
  slotsFilled: number;
  validTo: string | null;
}

interface StaffingOrderRow {
  id: string;
  projectId: string;
  status: string;
  deadlineDate: string | null;
  slots: OrderSlot[];
}

/** Giống PUBLISHABLE_ORDER_STATUSES trong publish.service.ts. */
const PUBLISHABLE_ORDER_STATUSES = new Set(['OPEN', 'CLOSING_SOON']);
/** API chặn take ≤ 50 và trả `total` → phải phân trang mới cộng đủ. */
const ORDERS_PAGE_SIZE = 50;
const ORDERS_MAX_PAGES = 10;

/** Số slot còn trống của từng dự án. Không có khoá = dự án không có đơn hợp lệ. */
function freeSlotsByProject(orders: StaffingOrderRow[], now: Date): Map<string, number> {
  const byProject = new Map<string, number>();
  for (const order of orders) {
    if (!PUBLISHABLE_ORDER_STATUSES.has(order.status)) continue;
    if (order.deadlineDate && new Date(order.deadlineDate) < now) continue;
    let free = 0;
    for (const slot of order.slots ?? []) {
      if (slot.validTo && new Date(slot.validTo) < now) continue;
      free += Math.max(0, (slot.slotsNeeded ?? 0) - (slot.slotsFilled ?? 0));
    }
    byProject.set(order.projectId, (byProject.get(order.projectId) ?? 0) + free);
  }
  return byProject;
}

interface Submission {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  projectName: string | null;
  status: string;
  createdAt: string;
}

interface Claim {
  id: string;
  workerId: string;
  workerName: string | null;
  claimType: string;
  accepted: boolean;
  acceptedBy: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  TUYEN_GAP: 'bg-red-100 text-red-700',
  DA_NHAN_DU: 'bg-green-100 text-green-700',
  DANG_TUYEN: 'bg-blue-100 text-blue-700',
  NEW: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  SCREENING: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-gray-100 text-gray-700',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={'px-2 py-1 rounded-full text-xs font-medium ' + colorClass}>
      {status}
    </span>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function AdminJobsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  /** Lỗi khi tải danh sách — bảng không có gì để hiện, in trong lòng bảng. */
  const [listError, setListError] = useState('');
  /** Lỗi khi bật/tắt tin — bảng vẫn còn dữ liệu, in thành dải cảnh báo phía trên. */
  const [actionError, setActionError] = useState('');
  /**
   * Slot trống theo project id. `null` = chưa đọc đủ đơn tuyển dụng nên chưa biết
   * (in dấu gạch), khác hoàn toàn với "biết chắc là 0".
   */
  const [freeSlots, setFreeSlots] = useState<Map<string, number> | null>(null);
  const [slotsNote, setSlotsNote] = useState('');

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState('');

  // Claims state
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState('');

  // ── Fetch jobs (public) ────────────────────────────────────────────────
  useEffect(() => {
    setJobsLoading(true);
    fetch('/api/projects?take=50')
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok) throw new Error(payload.message ?? payload.error ?? 'Không thể tải danh sách project');
        return payload;
      })
      .then((d) => {
        if (d.projects && Array.isArray(d.projects)) {
          setJobs(d.projects.map((project: any) => ({
            id: project.id,
            title: project.name,
            projectCode: project.code,
            status: project.status,
            isPublic: Boolean(project.isPublic),
            version: project.version ?? 1,
          })));
        }
      })
      .catch((e) => setListError(e instanceof Error ? e.message : String(e)))
      .finally(() => setJobsLoading(false));
  }, []);

  // ── Slot trống: cộng từ đơn tuyển dụng, phân trang cho đủ `total` ──────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const collected: StaffingOrderRow[] = [];
      let skip = 0;
      let total = 0;
      let pages = 0;

      try {
        for (;;) {
          const response = await fetch(`/api/staffing/orders?take=${ORDERS_PAGE_SIZE}&skip=${skip}`);
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message ?? payload.error ?? 'Không thể tải đơn tuyển dụng');
          }
          const page: StaffingOrderRow[] = Array.isArray(payload.orders) ? payload.orders : [];
          collected.push(...page);
          total = Number(payload.total ?? collected.length);
          skip += ORDERS_PAGE_SIZE;
          pages += 1;
          if (collected.length >= total || page.length === 0) break;
          if (pages >= ORDERS_MAX_PAGES) {
            // Chưa phủ hết → thà để dấu gạch còn hơn in một con số thiếu.
            if (!cancelled) {
              setFreeSlots(null);
              setSlotsNote(
                `Mới đọc ${collected.length}/${total} đơn tuyển dụng nên chưa tính được slot trống. Hãy lọc bớt đơn đã đóng rồi tải lại.`,
              );
            }
            return;
          }
        }
        if (cancelled) return;
        setFreeSlots(freeSlotsByProject(collected, new Date()));
        setSlotsNote('');
      } catch (error) {
        if (cancelled) return;
        setFreeSlots(null);
        setSlotsNote(
          error instanceof Error
            ? `Không đọc được đơn tuyển dụng để tính slot trống: ${error.message}`
            : 'Không đọc được đơn tuyển dụng để tính slot trống.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch submissions (auth required) ──────────────────────────────────
  const fetchSubmissions = () => {
    setSubmissionsLoading(true);
    fetch('/api/jobs/submissions?tab=submissions')
      .then((r) => r.json())
      .then((d) => {
        if (d.rows) setSubmissions(d.rows);
      })
      .catch((e) => setSubmissionsError(String(e)))
      .finally(() => setSubmissionsLoading(false));
  };

  // ── Fetch claims (auth required) ──────────────────────────────────────
  const fetchClaims = () => {
    setClaimsLoading(true);
    fetch('/api/jobs/submissions?tab=claims')
      .then((r) => r.json())
      .then((d) => {
        if (d.rows) setClaims(d.rows);
      })
      .catch((e) => setClaimsError(String(e)))
      .finally(() => setClaimsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'submissions') fetchSubmissions();
    else if (activeTab === 'claims') fetchClaims();
  }, [activeTab]);

  /** Dịch mã lỗi của API sang câu tiếng Việt mà người điều hành đọc được. */
  const publishErrorText = (job: Job, code: string, message?: string) => {
    switch (code) {
      case 'INVALID_STATE':
        return `Dự án ${job.projectCode} chưa có đơn tuyển dụng đang mở còn slot trống nên chưa đăng tin được.`;
      case 'STALE_VERSION':
        return `Dự án ${job.projectCode} vừa được người khác sửa. Hãy tải lại trang rồi thử lại.`;
      case 'NOT_FOUND':
        return `Không còn thấy dự án ${job.projectCode} trong hệ thống.`;
      case 'FORBIDDEN':
        return `Tài khoản hiện tại không có quyền đăng/tắt tin của dự án ${job.projectCode}.`;
      default:
        return `Không cập nhật được tin của dự án ${job.projectCode}${message ? `: ${message}` : '.'}`;
    }
  };

  const handlePublish = async (job: Job) => {
    const turningOn = !job.isPublic;
    const key = `admin-job-${job.id}-${job.version}-${turningOn ? 'publish' : 'unpublish'}`;
    try {
      const response = await fetch(`/api/projects/${job.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': key },
        body: JSON.stringify({
          isPublic: turningOn,
          expectedVersion: job.version,
          reason: turningOn ? 'Đăng tin từ trang quản trị' : 'Tắt tin từ trang quản trị',
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(publishErrorText(job, String(payload.error ?? ''), payload.message));
      }
      setJobs((current) => current.map((item) => item.id === job.id ? { ...item, isPublic: payload.project.isPublic, version: payload.project.version } : item));
      // Thao tác sau thành công thì dải cảnh báo cũ phải tắt.
      setActionError('');
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : `Không cập nhật được tin của dự án ${job.projectCode}.`,
      );
    }
  };

  return (
    <div className='min-h-screen p-6' style={{ backgroundColor: 'var(--surface)' }}>
      <div className='max-w-7xl mx-auto'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold' style={{ color: 'var(--on-surface)' }}>
              Admin Job Board
            </h1>
            <p className='mt-1' style={{ color: 'var(--on-surface-variant)' }}>
              Quan ly tuyen dung
            </p>
          </div>
          <button
            onClick={() => setActiveTab('jobs')}
            className='flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors'
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}
          >
            Quản lý trạng thái publish
          </button>
        </div>

        <div className='flex gap-1 mb-6' style={{ borderBottom: '2px solid var(--outline)' }}>
          {(['jobs', 'submissions', 'claims'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className='px-4 py-2 font-medium transition-colors'
              style={{
                color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >
              {tab === 'jobs' ? 'All Jobs' : tab === 'submissions' ? 'Submissions' : 'Claims'}
            </button>
          ))}
        </div>

        {/* ── Jobs Tab ──────────────────────────────────────────────── */}
        {activeTab === 'jobs' && (
          <>
            {actionError && (
              <div
                role='alert'
                className='mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm'
                style={{ borderColor: '#f5b5b5', backgroundColor: '#fdecec', color: '#8a1c1c' }}
              >
                <span>{actionError}</span>
                <button
                  type='button'
                  onClick={() => setActionError('')}
                  className='shrink-0 font-medium underline'
                >
                  Đóng
                </button>
              </div>
            )}
            {slotsNote && (
              <div
                className='mb-4 rounded-lg border px-4 py-3 text-sm'
                style={{ borderColor: 'var(--outline)', color: 'var(--on-surface-variant)' }}
              >
                {slotsNote}
              </div>
            )}
            <div className='rounded-lg overflow-hidden' style={{ border: '1px solid var(--outline)' }}>
            <table className='w-full'>
              <thead style={{ backgroundColor: 'var(--primary-container)' }}>
                <tr>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Project</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Code</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Slot trống</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Status</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Publish</th>
                </tr>
              </thead>
              <tbody>
                {jobsLoading ? (
                  <LoadingRow cols={5} />
                ) : listError ? (
                  <tr><td colSpan={5} className='px-4 py-3 text-red-500 text-sm'>{listError}</td></tr>
                ) : jobs.length === 0 ? (
                  <tr><td colSpan={5} className='px-4 py-8 text-center text-sm' style={{ color: 'var(--on-surface-variant)' }}>Chưa có job public nào.</td></tr>
                ) : (
                  jobs.map((job, idx) => {
                    // undefined = chưa/không đọc được đơn hợp lệ của dự án → in dấu gạch.
                    // 0 = đơn hợp lệ đã xác nhận hết slot → chặn luôn nút Publish.
                    const knownFree = freeSlots?.get(job.id);
                    const blockPublish = !job.isPublic && knownFree === 0;
                    return (
                    <tr key={job.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{job.title}</td>
                      <td className='px-4 py-3 font-mono text-sm' style={{ color: 'var(--on-surface-variant)' }}>{job.projectCode}</td>
                      <td
                        className='px-4 py-3 text-center'
                        style={{ color: 'var(--on-surface-variant)' }}
                        title={knownFree === undefined ? 'Chưa đọc được đơn tuyển dụng hợp lệ của dự án này.' : 'Tổng slot còn trống của các đơn đang mở, còn hạn.'}
                      >
                        {knownFree === undefined ? '—' : knownFree}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <StatusBadge status={job.isPublic ? 'Published' : job.status === 'CLOSED' ? 'Closed' : 'Unpublished'} />
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <button
                          type='button'
                          onClick={() => handlePublish(job)}
                          disabled={blockPublish}
                          title={blockPublish ? 'Dự án chưa có đơn tuyển dụng đang mở còn slot trống.' : undefined}
                          className='px-3 py-1 text-sm font-medium rounded border disabled:cursor-not-allowed disabled:opacity-50'
                          style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
                        >
                          {job.isPublic ? 'Unpublish' : 'Publish'}
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </>
        )}

        {/* ── Submissions Tab ───────────────────────────────────────── */}
        {activeTab === 'submissions' && (
          <div className='rounded-lg overflow-hidden' style={{ border: '1px solid var(--outline)' }}>
            <table className='w-full'>
              <thead style={{ backgroundColor: 'var(--primary-container)' }}>
                <tr>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Code</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Name</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Phone</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Project</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Status</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {submissionsLoading ? (
                  <LoadingRow cols={6} />
                ) : submissionsError ? (
                  <tr><td colSpan={6} className='px-4 py-3 text-red-500 text-sm'>{submissionsError}</td></tr>
                ) : submissions.length === 0 ? (
                  <tr><td colSpan={6} className='px-4 py-8 text-center text-sm' style={{ color: 'var(--on-surface-variant)' }}>Chua co don ung tuyen nao.</td></tr>
                ) : (
                  submissions.map((sub, idx) => (
                    <tr key={sub.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                      <td className='px-4 py-3 font-mono text-sm' style={{ color: 'var(--on-surface)' }}>{sub.code ?? sub.id}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{sub.fullName}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{sub.phone}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{sub.projectName ?? '-'}</td>
                      <td className='px-4 py-3 text-center'>
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Claims Tab ────────────────────────────────────────────── */}
        {activeTab === 'claims' && (
          <div className='rounded-lg overflow-hidden' style={{ border: '1px solid var(--outline)' }}>
            <table className='w-full'>
              <thead style={{ backgroundColor: 'var(--primary-container)' }}>
                <tr>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Worker</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Type</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Accepted</th>
                  <th className='text-left px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Accepted By</th>
                  <th className='text-center px-4 py-3 font-semibold' style={{ color: 'var(--on-surface)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {claimsLoading ? (
                  <LoadingRow cols={5} />
                ) : claimsError ? (
                  <tr><td colSpan={5} className='px-4 py-3 text-red-500 text-sm'>{claimsError}</td></tr>
                ) : claims.length === 0 ? (
                  <tr><td colSpan={5} className='px-4 py-8 text-center text-sm' style={{ color: 'var(--on-surface-variant)' }}>Chua co claim nao.</td></tr>
                ) : (
                  claims.map((claim, idx) => (
                    <tr key={claim.id} style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface)' }}>{claim.workerName ?? claim.workerId}</td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{claim.claimType}</td>
                      <td className='px-4 py-3 text-center'>
                        {claim.accepted ? (
                          <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>Yes</span>
                        ) : (
                          <span className='px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700'>Pending</span>
                        )}
                      </td>
                      <td className='px-4 py-3' style={{ color: 'var(--on-surface-variant)' }}>{claim.acceptedBy ?? '-'}</td>
                      <td className='px-4 py-3 text-center' style={{ color: 'var(--on-surface-variant)' }}>
                        {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
