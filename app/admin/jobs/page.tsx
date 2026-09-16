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
import Link from 'next/link';
import JobOpeningStatusCard from './job-opening-status-card';



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
              Danh sách nhu cầu
            </h1>
            <p className='mt-1' style={{ color: 'var(--on-surface-variant)' }}>
              Quản lý danh sách nhu cầu (Project) và trạng thái publish
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Link
              href='/admin/jobs/job-postings'
              className='rounded border px-3 py-2 text-sm font-medium'
              style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
            >
              AV2 — Soạn JobPosting (bản nháp)
            </Link>
          </div>
        </div>

        {/* V6 Phase 1: 4 badge đếm JobOpening theo status */}
            <JobOpeningStatusCard />
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
                    <tr key={job.id} className='transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]' style={{ borderTop: idx > 0 ? '1px solid var(--outline)' : 'none' }}>
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
      </div>
    </div>
  );
}
