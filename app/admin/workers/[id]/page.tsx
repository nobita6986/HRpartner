import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { getWorkerDetail } from '@/src/domains/workforce/worker.service';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { WorkerEditForm } from './worker-edit-form';
import { WorkerStatusForm } from './worker-status-form';
import { WorkerDeleteButton } from './worker-delete-button';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Chi tiết người lao động - Quản trị',
};

const ALLOWED_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR',
]);
const WRITER_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

/**
 * `/admin/workers/[id]` — T1B Worker detail surface (RQ-03).
 *
 * 7 section theo schema hiện có (KHÔNG thêm field/schema):
 *   1. Nhận diện (fullName, userId, dateOfBirth, gender, maritalStatus, nationality)
 *   2. Liên hệ (phone, permanentAddress, currentAddress, hometown)
 *   3. Giấy tờ (cccdNumber, cccdIssuedDate/Place, cccdExpiryDate, taxCode, insuranceCode)
 *   4. Việc làm (profileStatus, employmentStatus, riskStatus, owner/assignedTo/manager)
 *   5. Ngân hàng (bankAccount, bankName, bankBranch)
 *   6. Liên kết Hồ sơ tiếp nhận + Phân công dự án (laborProfile, assignments)
 *   7. Audit cơ bản (createdAt, updatedAt)
 *
 * Permission: HR_STAFF/PM/SALE xem theo row scope; ADMIN/HR_MANAGER sửa;
 * CAN_VIEW_WORKER_SENSITIVE mở khóa CCCD/bank.
 */
export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/auth/login?returnUrl=/admin/workers/${id}`);
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return (
      <div className="p-8 text-red-600">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }
  const permissions = await resolveEffectivePermissions({
    userId: session.userId,
    role: session.role,
  });
  const canSeeSensitive = permissions.has('CAN_VIEW_WORKER_SENSITIVE');
  const canEdit = WRITER_ROLES.has(session.role) && canSeeSensitive;
  const canDelete = session.role === 'ADMIN';

  const prisma = getPrisma();
  const detail = await withDbContext(prisma, session as never, async (tx) => {
    return getWorkerDetail(tx, session as never, id);
  });
  if (!detail) {
    notFound();
  }

  const fmt = (v: string | null | undefined, mask: '***' | 'show' = 'show') => {
    if (!canSeeSensitive && mask === 'show') return '***';
    if (v === null || v === undefined || v === '') return '—';
    return v;
  };
  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return '—';
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('vi-VN');
  };
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      NONE: 'Chưa rõ',
      ACTIVE: 'Đang làm',
      SUSPENDED: 'Tạm ngưng',
      TERMINATED: 'Đã nghỉ',
      INCOMPLETE: 'Chưa đủ',
      PENDING_VERIFY: 'Chờ xác minh',
      VERIFIED: 'Đã xác minh',
      REJECTED: 'Bị từ chối',
      NORMAL: 'Bình thường',
      REVIEW: 'Cần xem xét',
      BLOCKED: 'Bị chặn',
    };
    return map[s] ?? s;
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <Breadcrumb
        items={[
          { label: 'Người lao động', href: '/admin/workers' },
          { label: detail.fullName || detail.userId || 'Chi tiết' },
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--on-surface)]">
            {detail.fullName ?? '(chưa có họ tên)'}
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)] mt-1">
            Mã: <span className="font-mono">{detail.userId}</span>
            {' · '}
            Trạng thái: <strong>{statusLabel(detail.employmentStatus)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <WorkerDeleteButton workerId={detail.id} workerName={detail.fullName} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Nhận diện */}
        <Section title="1. Nhận diện">
          <Field label="Họ tên" value={detail.fullName} />
          <Field label="Mã" value={detail.userId} mono />
          <Field label="Ngày sinh" value={fmtDate(detail.dateOfBirth)} />
          <Field label="Giới tính" value={detail.gender} />
          <Field label="Hôn nhân" value={detail.maritalStatus} />
          <Field label="Quốc tịch" value={detail.nationality} />
        </Section>

        {/* 2. Liên hệ */}
        <Section title="2. Liên hệ">
          <Field label="Điện thoại" value={detail.phone} mono />
          <Field label="Địa chỉ thường trú" value={detail.permanentAddress} />
          <Field label="Địa chỉ hiện tại" value={detail.currentAddress} />
          <Field label="Quê quán" value={detail.hometown} />
        </Section>

        {/* 3. Giấy tờ */}
        <Section title="3. Giấy tờ">
          <Field
            label="Số CCCD"
            value={canSeeSensitive ? detail.cccdNumber : detail.cccdNumber ? '***' : '—'}
            mono
            sensitive
          />
          <Field
            label="Ngày cấp"
            value={canSeeSensitive ? fmtDate(detail.cccdIssuedDate) : '***'}
            sensitive
          />
          <Field
            label="Nơi cấp"
            value={canSeeSensitive ? detail.cccdIssuedPlace : '***'}
            sensitive
          />
          <Field
            label="Hạn CCCD"
            value={canSeeSensitive ? fmtDate(detail.cccdExpiryDate) : '***'}
            sensitive
          />
          <Field
            label="Mã số thuế"
            value={canSeeSensitive ? detail.taxCode : detail.taxCode ? '***' : '—'}
            mono
            sensitive
          />
          <Field
            label="Mã BHXH"
            value={canSeeSensitive ? detail.insuranceCode : detail.insuranceCode ? '***' : '—'}
            mono
            sensitive
          />
        </Section>

        {/* 4. Việc làm */}
        <Section title="4. Việc làm">
          <Field label="Trạng thái hồ sơ" value={statusLabel(detail.profileStatus)} />
          <Field label="Trạng thái làm việc" value={statusLabel(detail.employmentStatus)} />
          <Field label="Rủi ro" value={statusLabel(detail.riskStatus)} />
          <Field label="Chủ sở hữu (owner)" value={detail.owner?.name ?? '—'} />
          <Field label="Phụ trách (assignedTo)" value={detail.assignedTo?.name ?? '—'} />
          <Field label="Quản lý (manager)" value={detail.manager?.name ?? '—'} />
          {canEdit && (
            <div className="pt-2">
              <WorkerStatusForm
                workerId={detail.id}
                currentProfileStatus={detail.profileStatus}
                currentEmploymentStatus={detail.employmentStatus}
                currentRiskStatus={detail.riskStatus}
              />
            </div>
          )}
        </Section>

        {/* 5. Ngân hàng */}
        <Section title="5. Ngân hàng">
          <Field
            label="Số tài khoản"
            value={canSeeSensitive ? detail.bankAccount : detail.bankAccount ? '***' : '—'}
            mono
            sensitive
          />
          <Field
            label="Ngân hàng"
            value={canSeeSensitive ? detail.bankName : detail.bankName ? '***' : '—'}
            sensitive
          />
          <Field
            label="Chi nhánh"
            value={canSeeSensitive ? detail.bankBranch : detail.bankBranch ? '***' : '—'}
            sensitive
          />
        </Section>

        {/* 6. Liên kết */}
        <Section title="6. Liên kết Hồ sơ tiếp nhận & phân công dự án">
          {detail.laborProfile ? (
            <Link
              href={`/admin/labor-profiles/${detail.laborProfile.id}`}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Hồ sơ tiếp nhận #{detail.laborProfile.id} ({detail.laborProfile.fullName ?? '—'})
            </Link>
          ) : (
            <p className="text-sm text-[var(--on-surface-variant)]">
              Không liên kết Hồ sơ tiếp nhận (Worker rác / orphan).
            </p>
          )}
          <div className="mt-2">
            <p className="text-sm font-medium text-[var(--on-surface)]">Phân công dự án hiện hành</p>
            {detail.assignments.length === 0 ? (
              <p className="text-sm text-[var(--on-surface-variant)]">Chưa có phân công.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {detail.assignments.map(a => (
                  <li key={a.id} className="text-[var(--on-surface-variant)]">
                    [{a.status}] {a.projectName ?? a.projectCode ?? a.projectId}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {detail.episodes.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-[var(--on-surface)]">Lịch sử episodes</p>
              <ul className="mt-1 space-y-1 text-xs">
                {detail.episodes.map(e => (
                  <li key={e.id} className="text-[var(--on-surface-variant)]">
                    [{e.status}] {fmtDate(e.startedAt)} → {e.endedAt ? fmtDate(e.endedAt) : '…'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>

      {/* 7. Audit */}
      <Section title="7. Audit cơ bản">
        <Field label="Ngày tạo" value={fmtDate(detail.createdAt)} />
        <Field label="Cập nhật lần cuối" value={fmtDate(detail.updatedAt)} />
      </Section>

      {/* Edit form (full panel; dirty tracking + sensitive gate) */}
      {canEdit && (
        <Section title="Sửa hồ sơ người lao động">
          <WorkerEditForm
            workerId={detail.id}
            initial={{
              fullName: detail.fullName,
              phone: detail.phone,
              dateOfBirth:
                detail.dateOfBirth instanceof Date
                  ? detail.dateOfBirth.toISOString().slice(0, 10)
                  : null,
              gender: detail.gender,
              maritalStatus: detail.maritalStatus,
              permanentAddress: detail.permanentAddress,
              currentAddress: detail.currentAddress,
              hometown: detail.hometown,
              ethnicGroup: detail.ethnicGroup,
              religion: detail.religion,
              nationality: detail.nationality,
              cccdNumber: detail.cccdNumber,
              cccdIssuedDate:
                detail.cccdIssuedDate instanceof Date
                  ? detail.cccdIssuedDate.toISOString().slice(0, 10)
                  : null,
              cccdIssuedPlace: detail.cccdIssuedPlace,
              cccdExpiryDate:
                detail.cccdExpiryDate instanceof Date
                  ? detail.cccdExpiryDate.toISOString().slice(0, 10)
                  : null,
              taxCode: detail.taxCode,
              insuranceCode: detail.insuranceCode,
              bankAccount: detail.bankAccount,
              bankName: detail.bankName,
              bankBranch: detail.bankBranch,
            }}
            canSeeSensitive={canSeeSensitive}
            updatedAt={detail.updatedAt instanceof Date ? detail.updatedAt.toISOString() : null}
          />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl border p-5"
      style={{
        background: 'var(--surface-container-lowest)',
        borderColor: 'var(--outline-variant)',
      }}
    >
      <h2 className="text-sm font-semibold text-[var(--on-surface)] mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
  sensitive,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  sensitive?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-40 shrink-0 text-xs text-[var(--on-surface-variant)]">{label}</span>
      <span
        className={`flex-1 text-sm text-[var(--on-surface)] ${mono ? 'font-mono' : ''} ${
          sensitive ? 'sensitive-cell' : ''
        }`}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}
