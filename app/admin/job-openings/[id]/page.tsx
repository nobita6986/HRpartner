/**
 * app/admin/job-openings/[id]/page.tsx — P1-A0.5 (canonical, contract v1.3 §STEP-06).
 *
 * Server Component page for a single JobOpening. Renders the action island
 * `JobOpeningActions` (Client Component) with server-derived flags.
 *
 * Outer role admission (P1-A0.5 / LOCK-04 / v1.2 §I-04):
 *   - ADMIN / HR_MANAGER / DIRECTOR / PM: page visible, read-only for DIRECTOR/PM.
 *   - HR_STAFF: page visible ONLY when an ACTIVE StaffingOrderRecruiterAssignment
 *     exists for the parent StaffingOrder (P1-A0.4 RLS predicate). Otherwise
 *     `notFound()` (fail-closed).
 *
 * Server-derived flags (the page computes these — Client NEVER re-derives):
 *   - `canClassify`: ADMIN/HR_MANAGER + status === 'DRAFT' + placementCount === 0.
 *   - `canOpen`: ADMIN/HR_MANAGER (unconditional) ∪ HR_STAFF with active
 *     assignment + ALL preconditions met:
 *     (a) status === 'DRAFT'
 *     (b) serviceModel !== null
 *     (c) parent StaffingOrder.status === 'OPEN' (STRICT; CLOSING_SOON is
 *         NOT accepted — pre-audit correction batch 1/1 §D)
 *     (d) StaffingOrder.deadlineDate null OR >= now
 *     (e) StaffingOrderSlot.validTo null OR >= now
 *     (f) slotsFilled < slotsNeeded
 *
 * The Client Component `JobOpeningActions` receives ONLY:
 *   - `opening.id` (URL-derived)
 *   - server-derived `flags` (canClassify / canOpen / blockedReason /
 *     currentStatus / currentServiceModel)
 * NO actor / assignment metadata / PII / DB internals reaches the client.
 */
import { notFound, redirect } from 'next/navigation';
import type { ServiceModel } from '@prisma/client';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getJobOpeningDetail } from '@/src/domains/staffing/job-opening-read.service';
import { assertActiveRecruiterForOrder } from '@/src/domains/talent/recruiter-assignment.service';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { RelatedObjects } from '@/src/shared/ui/data-display/related-objects';
import { EmptyState } from '@/src/shared/ui/data-display/empty-state';
import {
  JobOpeningActions,
  type JobOpeningActionsFlags,
} from './job-opening-actions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HR_STAFF_OPEN_BLOCKED_REASON =
  'Bạn cần được phân công vào StaffingOrder để mở JobOpening này';

export default async function JobOpeningDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession();
  if (!session) {
    // No session → redirect to login. The Client Component never sees this
    // branch because the page is a Server Component.
    redirect(`/login?callback=/admin/job-openings/${params.id}`);
  }

  // ── Outer role admission (pre-audit correction batch 1/1 §G) ───────────
  // Reject unsupported roles BEFORE querying opening data so we never
  // touch the DB on behalf of a caller who can never be admitted.
  const isAdminOrHrManager = session.role === 'ADMIN' || session.role === 'HR_MANAGER';
  const isDirectorOrPm = session.role === 'DIRECTOR' || session.role === 'PM';
  const isHrStaff = session.role === 'HR_STAFF';

  if (!isAdminOrHrManager && !isDirectorOrPm && !isHrStaff) {
    // Unsupported role (VENDOR_*, WORKER, etc.) → fail closed.
    notFound();
  }

  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();

  const opening = await withDbContext(prisma, ctx, async (tx) => {
    return getJobOpeningDetail(tx, params.id);
  });

  if (!opening) {
    notFound();
  }

  // ── HR_STAFF scoped admission (pre-audit §G, 2nd half) ─────────────────
  // HR_STAFF requires an ACTIVE StaffingOrderRecruiterAssignment on the
  // parent StaffingOrder. We REUSE `assertActiveRecruiterForOrder`
  // (P1-A0.4 carryover) and catch the failure → notFound() so the page
  // does not leak the unassigned/revoked state to the Client.
  // ADMIN/HR_MANAGER/DIRECTOR/PM bypass inside `assertActiveRecruiterForOrder`.
  if (isHrStaff) {
    let assigned = false;
    try {
      await withDbContext(prisma, ctx, async (tx) => {
        await assertActiveRecruiterForOrder(
          tx,
          session.userId,
          session.role,
          opening.staffingOrder.id,
        );
        assigned = true;
      });
    } catch {
      assigned = false;
    }
    if (!assigned) {
      // Unassigned / revoked / role-not-permitted HR_STAFF → fail closed
      // with the SAME notFound() envelope so we don't leak assignment state.
      notFound();
    }
  }

  // ── Server-derived flags ─────────────────────────────────────────────────
  const now = new Date();
  const isDraft = opening.status === 'DRAFT';
  const hasServiceModel = opening.serviceModel !== null;
  const orderStatus = opening.staffingOrder.status;
  // Pre-audit correction batch 1/1 §D — parent StaffingOrder.status must be
  // exactly OPEN for the opening path. CLOSING_SOON is rejected with
  // ORDER_NOT_OPEN (409) at the service layer. The selector for authoring
  // legitimately accepts OPEN|CLOSING_SOON; the OPENING predicate is
  // narrower.
  const orderStrictlyOpen = orderStatus === 'OPEN';
  const deadlineOk =
    opening.staffingOrder.deadlineDate === null ||
    new Date(opening.staffingOrder.deadlineDate) >= now;
  const slotValidToOk =
    opening.slot === null ||
    opening.slot.validTo === null ||
    new Date(opening.slot.validTo) >= now;
  const slotCapacityOk =
    opening.slot === null ||
    opening.slot.slotsFilled < opening.slot.slotsNeeded;
  const slotExists = opening.slot !== null;

  // canClassify — ADMIN/HR_MANAGER + DRAFT + no placements yet.
  const canClassify = isAdminOrHrManager && isDraft && opening.placementCount === 0;

  // canOpen — full 7-precondition set + caller authority.
  //   ADMIN/HR_MANAGER: unconditional when all preconditions met.
  //   HR_STAFF: same preconditions + active assignment already verified above.
  //   DIRECTOR/PM: never (no authority).
  const allPreconditionsMet =
    isDraft &&
    hasServiceModel &&
    orderStrictlyOpen &&
    slotExists &&
    deadlineOk &&
    slotValidToOk &&
    slotCapacityOk;
  const callerHasOpenAuthority =
    isAdminOrHrManager || (isHrStaff /* assignment already verified above */);
  const canOpen = callerHasOpenAuthority && allPreconditionsMet;

  // blockedReason — only shown when canOpen === false; explains why.
  let blockedReason: string | null = null;
  if (!canOpen) {
    if (!callerHasOpenAuthority) {
      blockedReason = HR_STAFF_OPEN_BLOCKED_REASON;
    } else if (!isDraft) {
      blockedReason = `Trạng thái hiện tại là ${opening.status}; chỉ JobOpening ở trạng thái DRAFT mới có thể mở`;
    } else if (!hasServiceModel) {
      blockedReason = 'Cần phân loại ServiceModel trước khi mở';
    } else if (!orderStrictlyOpen) {
      // Pre-audit correction batch 1/1 §D — strict OPEN wording.
      blockedReason = `StaffingOrder ở trạng thái ${orderStatus}; cần OPEN (CLOSING_SOON không đủ điều kiện mở)`;
    } else if (!slotExists) {
      blockedReason = 'JobOpening không liên kết với StaffingOrderSlot — không thể mở';
    } else if (!deadlineOk) {
      blockedReason = `StaffingOrder đã quá hạn nộp (deadlineDate < now)`;
    } else if (!slotValidToOk) {
      blockedReason = 'StaffingOrderSlot đã quá hạn (validTo < now)';
    } else if (!slotCapacityOk) {
      blockedReason = 'StaffingOrderSlot đã đủ chỉ tiêu';
    } else {
      blockedReason = 'Không đủ điều kiện mở JobOpening';
    }
  }

  const flags: JobOpeningActionsFlags = {
    canClassify,
    canOpen,
    blockedReason,
    currentStatus: opening.status,
    currentServiceModel: (opening.serviceModel ?? null) as ServiceModel | null,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const formatter = new Intl.DateTimeFormat('vi-VN');
  const opened = opening.openedAt ? formatter.format(new Date(opening.openedAt)) : '—';
  const closed = opening.closedAt ? formatter.format(new Date(opening.closedAt)) : '—';

  const postingItems = opening.jobPosting ? [{
    id: opening.jobPosting.id,
    title: `Job Posting: ${opening.jobPosting.slug}`,
    subtitle: `Khóa đăng tuyển công khai`,
    statusLabel: opening.jobPosting.status,
    href: `/admin/jobs/job-postings/${opening.jobPosting.id}`,
  }] : [];

  const slotItems = opening.associatedSlots.map((s) => ({
    id: s.id,
    title: s.positionTitle,
    subtitle: `Mã vị trí: ${s.positionCode}`,
    statusLabel: '',
    href: undefined,
  }));

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <header className="mb-8">
        <Breadcrumb items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Dự án', href: '/admin/projects' },
          { label: opening.staffingOrder.project.name, href: `/admin/projects/${opening.staffingOrder.project.id}` },
          { label: `Job Opening: ${opening.id.substring(0, 8)}`, href: `/admin/job-openings/${opening.id}` },
        ]} />
        <h1 className="text-3xl font-semibold mt-4" style={{ color: 'var(--on-surface)' }}>
          Tuyển dụng (Opening)
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <span>Order: {opening.staffingOrder.code}</span>
          <span>Dự án: {opening.staffingOrder.project.name}</span>
          <span>Mở: {opened}</span>
          <span>Đóng: {closed}</span>
          <span className="font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-container)' }}>
            {opening.status}
          </span>
          {opening.serviceModel && (
            <span
              className="font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' }}
              data-testid="opening-service-model-chip"
            >
              {opening.serviceModel}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Candidate Submissions" value={opening.metrics.submissionsCount} />
        <MetricCard label="Project Assignments" value={opening.metrics.assignmentsCount} />
        <MetricCard label="Placements" value={opening.placementCount} />
      </div>

      {/* Action island — narrow Client Component. Server-derived flags. */}
      <section className="mb-8">
        <JobOpeningActions opening={{ id: opening.id }} flags={flags} />
      </section>

      <section aria-labelledby="opening-posting" className="mb-8">
        <h2 id="opening-posting" className="text-xl font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Đăng tuyển (Job Posting)
        </h2>
        {postingItems.length > 0 ? (
          <RelatedObjects
            title="Job Posting"
            emptyState="Chưa có Job Posting nào kết nối."
            items={postingItems}
          />
        ) : (
          <EmptyState
            title="Chưa có Job Posting"
            description="Vị trí này chưa được đăng tuyển công khai."
          />
        )}
      </section>

      <section aria-labelledby="opening-slots">
        <h2 id="opening-slots" className="text-xl font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Vị trí (Slots)
        </h2>
        {slotItems.length > 0 ? (
          <RelatedObjects
            title="Vị trí (Slots)"
            emptyState="Chưa liên kết slot nào."
            items={slotItems}
          />
        ) : (
          <EmptyState
            title="Chưa có vị trí liên kết"
            description="Job Opening này chưa được gắn với Slot nào từ đơn tuyển dụng."
          />
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>{label}</div>
      <div className="text-2xl font-semibold mt-1" style={{ color: 'var(--on-surface)' }}>{value.toLocaleString()}</div>
    </div>
  );
}
