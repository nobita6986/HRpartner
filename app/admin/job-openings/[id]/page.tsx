import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getJobOpeningDetail } from '@/src/domains/staffing/job-opening-read.service';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { RelatedObjects } from '@/src/shared/ui/data-display/related-objects';
import { EmptyState } from '@/src/shared/ui/data-display/empty-state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function JobOpeningDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?callback=/admin/job-openings/${params.id}`);
  }

  if (!['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'PM'].includes(session.role)) {
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
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Candidate Submissions" value={opening.metrics.submissionsCount} />
        <MetricCard label="Project Assignments" value={opening.metrics.assignmentsCount} />
      </div>

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
