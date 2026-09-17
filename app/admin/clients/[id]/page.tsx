import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getClientDetail } from '@/src/domains/crm/client-read.service';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { RelatedObjects } from '@/src/shared/ui/data-display/related-objects';
import { EmptyState } from '@/src/shared/ui/data-display/empty-state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?callback=/admin/clients/${params.id}`);
  }

  // Audience constraint from W3: Only ADMIN, HR_MANAGER, DIRECTOR, PM allowed.
  if (!['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'PM'].includes(session.role)) {
    notFound(); // Fallback to not-found as per rule: No info leakage.
  }

  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();

  const client = await withDbContext(prisma, ctx, async (tx) => {
    return getClientDetail(tx, ctx, params.id);
  });

  if (!client) {
    notFound();
  }

  const projectItems = client.projects.map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: `Mã: ${p.code}`,
    statusLabel: p.status,
    href: `/admin/projects/${p.id}`,
  }));

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <header className="mb-8">
        <Breadcrumb items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Khách hàng', href: '/admin/clients' },
          { label: client.name, href: `/admin/clients/${client.id}` },
        ]} />
        <h1 className="text-3xl font-semibold mt-4" style={{ color: 'var(--on-surface)' }}>
          {client.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <span>Mã KH: {client.code}</span>
          {client.taxCode && <span>MST: {client.taxCode}</span>}
          {client.industry && <span>Ngành: {client.industry}</span>}
          <span className="font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-container)' }}>
            {client.status}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Staffing Orders" value={client.metrics.ordersCount} />
        <MetricCard label="Slots" value={client.metrics.slotsCount} />
        <MetricCard label="Job Openings" value={client.metrics.openingsCount} />
        <MetricCard label="Assignments" value={client.metrics.assignmentsCount} />
      </div>

      <section aria-labelledby="client-projects">
        <h2 id="client-projects" className="text-xl font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Dự án ({client.projects.length})
        </h2>
        {projectItems.length > 0 ? (
          <RelatedObjects
            title="Dự án liên quan"
            emptyState="Chưa có dự án nào."
            items={projectItems}
          />
        ) : (
          <EmptyState
            title="Chưa có dự án"
            description="Khách hàng này hiện chưa có dự án nào."
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
