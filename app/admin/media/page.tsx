/**
 * /admin/media — AV4 Media Library page (Server Component shell).
 *
 * Server-side:
 * - Verify CAN_MANAGE_MEDIA permission (gate trước khi render)
 * - Read initial library state qua `listMedia`
 * - Pass vào MediaLibraryClient (UI stateful)
 *
 * Client (`media-library-client.tsx`):
 * - Grid + upload modal + edit modal (folder UI bỏ theo
 *   hrp-t1c-media-global-pool-bulk-upload-hotfix RQ-12)
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
  title: 'Thư viện tệp và ảnh — HRP Admin',
};

interface PageProps {
  // hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-11): folder không còn là param
  // nghiệp vụ. URL cũ `/admin/media?folder=homepage` vẫn render kho chung (folder
  // param bị ignore ở route + service).
  searchParams: Promise<{ status?: string; search?: string; page?: string; folder?: string }>;
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
    // folder bị ignore ở service (RQ-10); truyền xuống chỉ để type stable.
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
      folderFilter=""  // hằng số — không filter ở client (RQ-12)
      statusFilter={params.status ?? ''}
      searchFilter={params.search ?? ''}
    />
  );
}
