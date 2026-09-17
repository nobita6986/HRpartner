import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getProjectDetail } from '@/src/domains/crm/project-read.service';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { RelatedObjects } from '@/src/shared/ui/data-display/related-objects';
import { EmptyState } from '@/src/shared/ui/data-display/empty-state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?callback=/admin/projects/${params.id}`);
  }

  if (!['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'PM'].includes(session.role)) {
    notFound();
  }

  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();

  const project = await withDbContext(prisma, ctx, async (tx) => {
    return getProjectDetail(tx, params.id);
  });

  if (!project) {
    notFound();
  }

  const orderItems = project.staffingOrders.map((so) => ({
    id: so.id,
    title: so.title,
    subtitle: `Mã: ${so.code}`,
    statusLabel: so.status,
    // Just a placeholder since W3 doesn't have Order Detail route
    href: undefined,
  }));

  const openingsMap = new Map<string, { id: string; title: string }>();
  project.staffingOrders.forEach((so) => {
    so.slots.forEach((slot) => {
      if (slot.jobOpeningId) {
        if (!openingsMap.has(slot.jobOpeningId)) {
          openingsMap.set(slot.jobOpeningId, {
            id: slot.jobOpeningId,
            title: slot.positionTitle || 'Job Opening',
          });
        }
      }
    });
  });

  const openingItems = Array.from(openingsMap.values()).map((op) => ({
    id: op.id,
    title: op.title,
    subtitle: `Opening ID: ${op.id}`,
    href: `/admin/job-openings/${op.id}`,
  }));

  const formatter = new Intl.DateTimeFormat('vi-VN');
  const start = formatter.format(new Date(project.startDate));
  const end = project.endDate ? formatter.format(new Date(project.endDate)) : '—';

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <header className="mb-8">
        <Breadcrumb items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Khách hàng', href: '/admin/clients' },
          { label: project.clientCompany.name, href: `/admin/clients/${project.clientCompany.id}` },
          { label: project.name, href: `/admin/projects/${project.id}` },
        ]} />
        <h1 className="text-3xl font-semibold mt-4" style={{ color: 'var(--on-surface)' }}>
          {project.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <span>Mã DA: {project.code}</span>
          <span>Khách hàng: {project.clientCompany.name}</span>
          <span>Thời gian: {start} - {end}</span>
          <span className="font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-container)' }}>
            {project.status}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Candidate Submissions" value={project.metrics.submissionsCount} />
        <MetricCard label="Project Assignments" value={project.metrics.assignmentsCount} />
      </div>

      <section aria-labelledby="project-orders" className="mb-8">
        <h2 id="project-orders" className="text-xl font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Staffing Orders ({project.staffingOrders.length})
        </h2>
        {orderItems.length > 0 ? (
          <RelatedObjects 
          title="Staffing Orders" 
          emptyState="Chưa có yêu cầu cung ứng." 
          items={orderItems}
        />
        ) : (
          <EmptyState
            title="Chưa có yêu cầu nhân sự"
            description="Dự án này chưa có Staffing Order nào."
          />
        )}
      </section>

      <section aria-labelledby="project-openings">
        <h2 id="project-openings" className="text-xl font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Job Openings ({openingItems.length})
        </h2>
        {openingItems.length > 0 ? (
          <RelatedObjects 
            title="Job Openings" 
            emptyState="Chưa có Job Opening nào." 
            items={openingItems}
          />
        ) : (
          <EmptyState
            title="Chưa có Job Opening"
            description="Dự án này chưa có Job Opening nào liên kết."
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
