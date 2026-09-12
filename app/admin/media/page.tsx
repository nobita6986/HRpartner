/**
 * /admin/media — AV4 Media Library page (Server Component shell).
 *
 * Server-side:
 * - Verify CAN_MANAGE_MEDIA permission (gate trước khi render)
 * - Read initial library state qua `listMedia`
 * - Pass vào MediaLibraryClient (UI stateful)
 *
 * Client (`media-library-client.tsx`):
 * - Folder sidebar + grid + upload modal + edit modal
 * - Gọi /api/admin/media/* để CRUD
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { listMedia } from '@/src/domains/media/media.service';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import type { MediaItemDto } from '@/src/domains/media/media.types';
import { MediaLibraryClient } from './media-library-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Thư viện Media — HRP Admin',
};

interface PageProps {
  searchParams: Promise<{ folder?: string; status?: string; search?: string; page?: string }>;
}

export default async function AdminMediaPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin/media');
  }

  const allowed = await hasPermission({ userId: session.userId, role: session.role }, 'CAN_MANAGE_MEDIA');
  if (!allowed) {
    redirect('/forbidden');
  }

  const params = await searchParams;
  const take = 24;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const skip = (page - 1) * take;

  const prisma = getPrisma();
  const result = await listMedia(prisma, {
    folder: params.folder,
    status: params.status === 'PUBLIC' || params.status === 'INTERNAL' ? params.status : undefined,
    search: params.search,
    take,
    skip,
  });

  // Serialize Date → ISO string cho client component
  const items: MediaItemDto[] = result.items.map((i) => ({ ...i, createdAt: i.createdAt }));

  return (
    <MediaLibraryClient
      initialItems={items}
      total={result.total}
      take={result.take}
      page={page}
      folderFilter={params.folder ?? ''}
      statusFilter={params.status ?? ''}
      searchFilter={params.search ?? ''}
    />
  );
}
