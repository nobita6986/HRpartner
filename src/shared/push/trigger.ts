/**
 * Push trigger — P1 Portals STEP-05 (RQ-05).
 *
 * Called by ticket status-change events. Uses VAPID + Web Push (web-push lib).
 * Graceful when VAPID missing — logs and returns without sending.
 */
import webpush from 'web-push';
import { isPushAvailable } from '../feature-flags';
import { getPrisma } from '@/src/lib/db';

if (isPushAvailable()) {
  webpush.setVapidDetails(
    'mailto:admin@hrpartner.vn',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send push to all subscriptions for a user.
 * Returns count of notifications sent.
 */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushAvailable()) {
    return 0;
  }

  const prisma = getPrisma();
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: any) {
      // 410 = subscription gone (delete from DB)
      if (err?.statusCode === 410) {
        await prisma.pushSubscription.delete({
          where: { userId_endpoint: { userId, endpoint: sub.endpoint } },
        }).catch(() => {});
      }
      console.error('[push] send error', err?.statusCode ?? err);
    }
  }
  return sent;
}

/**
 * Notify worker that ticket status changed.
 * Called by ticket approve/reject/cancel routes.
 */
export async function notifyTicketStatusChange(
  workerId: string,
  ticketTitle: string,
  newStatus: string,
): Promise<void> {
  if (!workerId) return;
  const prisma = getPrisma();
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { userId: true },
  });
  if (!worker?.userId) return;

  await pushToUser(worker.userId, {
    title: `Phiếu ${newStatus}`,
    body: `${ticketTitle} đã được ${newStatus.toLowerCase()}`,
    url: '/worker',
    tag: 'ticket-status',
  });
}
