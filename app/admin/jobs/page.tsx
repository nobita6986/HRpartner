/**
 * /admin/jobs — đã được hợp nhất vào /admin/projects.
 *
 * hrp-t1a-introduce-hrp-and-menu-cleanup (T0 directive §B.1..§B.5):
 * - Cột "Slot trống", trạng thái công bố và thao tác công bố/bỏ công bố
 *   chuyển sang /admin/projects.
 * - "Danh sách nhu cầu" bị bỏ khỏi sidebar.
 * - URL cũ `/admin/jobs` phải redirect an toàn sang /admin/projects để
 *   bookmark cũ không bị 404.
 *
 * Server component — Next.js `redirect()` throws NEXT_REDIRECT và framework
 * trả về HTTP 307 với header `Location: /admin/projects`.
 */
import { redirect } from 'next/navigation';

export default function AdminJobsPage(): never {
  redirect('/admin/projects');
}
