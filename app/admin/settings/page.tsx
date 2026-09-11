/**
 * /admin/settings — AV1 HomepageSettings form (Plan UI B integration).
 *
 * Server component that fetches the current singleton settings via
 * `getHomepageSettings` and passes them to the client form below.
 *
 * The placeholder groups (Bảo mật, Thông báo, Tích hợp, Nhật ký) are kept
 * as informational cards — they don't have writable fields yet.
 */
import { getPrisma } from '@/src/lib/db';
import { getHomepageSettings } from '@/src/domains/job-board/public-settings.service';
import AdminSettingsForm from './admin-settings-form';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminSettingsPage() {
  const prisma = getPrisma();
  // Server-side initial state. If the row doesn't exist, the bootstrap
  // path inside getHomepageSettings will create it with defaults.
  const initialSettings = await getHomepageSettings(prisma);

  return <AdminSettingsForm initialSettings={initialSettings} />;
}
