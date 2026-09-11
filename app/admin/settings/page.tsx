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
import {
  BEST_JOBS_PAGE_SIZE_DEFAULT,
  LISTING_PAGE_SIZE_DEFAULT,
  type HomepageSettingsDto,
} from '@/src/domains/job-board/public-types';
import AdminSettingsForm from './admin-settings-form';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminSettingsPage() {
  const prisma = getPrisma();
  let initialSettings: HomepageSettingsDto;
  let unavailableReason: string | undefined;

  try {
    // Server-side initial state. If the row doesn't exist, the bootstrap
    // path inside getHomepageSettings will create it with defaults.
    initialSettings = await getHomepageSettings(prisma);
  } catch (error) {
    // A deployment can briefly run newer application code before its additive
    // migration is applied. Keep the Admin shell usable and make the operational
    // problem visible instead of failing the entire route with Prisma P2021.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021') {
      initialSettings = {
        id: 'default',
        bestJobsPageSize: BEST_JOBS_PAGE_SIZE_DEFAULT,
        listingPageSize: LISTING_PAGE_SIZE_DEFAULT,
        updatedAt: new Date(0).toISOString(),
      };
      unavailableReason =
        'Cấu hình trang chủ đang tạm khóa vì migration HomepageSettings chưa được áp dụng trên cơ sở dữ liệu.';
    } else {
      throw error;
    }
  }

  return (
    <AdminSettingsForm
      initialSettings={initialSettings}
      unavailableReason={unavailableReason}
    />
  );
}
