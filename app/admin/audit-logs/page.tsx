/**
 * /admin/audit-logs page entry — T1B-OPS.
 *
 * Server Component wrapper: chỉ render nếu `session.role === 'ADMIN'`.
 * Non-ADMIN (HR_MANAGER, ...) → redirect `/admin`.
 *
 * Audit viewer chỉ dành cho ADMIN vì:
 *   - Audit log chứa `actorId`/`actorRole` của nhiều role.
 *   - Diff có thể chứa thông tin nghiệp vụ nhạy cảm (đã được redact PII ở
 *     service nhưng vẫn có thể leak chiến lược vận hành).
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import AuditLogsPage from './audit-logs-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Nhật ký kiểm toán - Quản trị',
};

export default async function AuditLogsPageEntry() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin/audit-logs');
  }
  if (session.role !== 'ADMIN') {
    redirect('/admin');
  }
  return <AuditLogsPage />;
}