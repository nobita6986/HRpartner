/**
 * bi-auto-scheduler.ts — In-process production scheduler for HRP ↔ Mini-BI
 *
 * Ensures that on VPS Production (`hrp-app` container):
 *  1. Immediately after startup (first healthcheck / login hit), HRP pulls and posts
 *     all active jobs from `https://bi.hrpartner.vn/feeds/jobs.v1.json`.
 *  2. Every 30 minutes (`30 * 60 * 1000` ms), HRP refreshes the BI Public Jobs Feed.
 *  3. At 06:00, 10:00, 14:00, 18:00 (Asia/Ho_Chi_Minh, UTC+7), HRP runs the incremental
 *     BI Worker & Project Catalog sync (`runBiWorkerSync`).
 *
 * Both jobs also acquire PostgreSQL transaction-local advisory locks, so they are safe
 * alongside external cron/systemd triggers.
 */

import { revalidatePath } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { parseBiJobsPublicFeedV1 } from './bi-jobs-feed-contract';
import biJobsFeedSnapshot from './bi-jobs-feed-snapshot.json';
import { syncBiJobsPublicFeed } from './bi-jobs-feed.service';
import {
  BiSyncConfigurationError,
  BiSyncConflictError,
  runBiWorkerSync,
} from './bi-worker-sync.service';

const FEED_POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const WORKER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // check 4h window every 5 minutes
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
const SCHEDULED_VN_HOURS = new Set([6, 10, 14, 18]);

interface BiSchedulerGlobalState {
  initialized: boolean;
  feedSyncPromise: Promise<void> | null;
  lastFeedSyncAtMs: number;
  workerSyncInFlight: boolean;
  lastWorkerSlotKey: string | null;
}

const globalForBiScheduler = globalThis as unknown as {
  __hrpBiSchedulerState?: BiSchedulerGlobalState;
};

function getSchedulerState(): BiSchedulerGlobalState {
  if (!globalForBiScheduler.__hrpBiSchedulerState) {
    globalForBiScheduler.__hrpBiSchedulerState = {
      initialized: false,
      feedSyncPromise: null,
      lastFeedSyncAtMs: 0,
      workerSyncInFlight: false,
      lastWorkerSlotKey: null,
    };
  }
  return globalForBiScheduler.__hrpBiSchedulerState;
}

function isProductionRuntime(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  if (process.env.VITEST) return false;
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl || dbUrl.includes('ci_dummy')) return false;
  return true;
}

async function runBootstrapSnapshotSeedIfNeeded(): Promise<void> {
  const state = getSchedulerState();
  if (state.lastFeedSyncAtMs > 0) return;

  try {
    const parsedSnapshot = parseBiJobsPublicFeedV1(biJobsFeedSnapshot);
    if (!parsedSnapshot.ok) return;

    const prisma = getPrisma();
    const snapRes = await syncBiJobsPublicFeed(prisma, {
      actorId: 'system:cron',
      actorRole: 'ADMIN',
      prefetchedFeed: parsedSnapshot.data,
    });
    if (snapRes.ok) {
      state.lastFeedSyncAtMs = Date.now();
      if (snapRes.created > 0 || snapRes.updated > 0 || snapRes.archived > 0) {
        try {
          revalidatePath('/viec-lam');
          revalidatePath('/');
          revalidatePath('/admin/jobs/job-postings');
        } catch {
          // Ignore if called outside request context
        }
      }
    } else {
      console.error('[bi-auto-scheduler] snapshot seed error:', {
        code: snapRes.code,
        message: snapRes.message,
      });
    }
  } catch (err) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : 'SNAPSHOT_SEED_ERROR';
    console.error('[bi-auto-scheduler] snapshot seed exception:', { code });
  }
}

function runSafeFeedSync(): Promise<void> {
  const state = getSchedulerState();
  if (state.feedSyncPromise) return state.feedSyncPromise;

  const p = (async () => {
    try {
      const prisma = getPrisma();
      const res = await syncBiJobsPublicFeed(prisma, {
        actorId: 'system:cron',
        actorRole: 'ADMIN',
      });

      if (res.ok) {
        state.lastFeedSyncAtMs = Date.now();
        if (res.created > 0 || res.updated > 0 || res.archived > 0) {
          try {
            revalidatePath('/viec-lam');
            revalidatePath('/');
            revalidatePath('/admin/jobs/job-postings');
          } catch {
            // Ignore if called outside request context
          }
        }
      } else {
        console.error('[bi-auto-scheduler] jobs feed sync returned error:', {
          code: res.code,
          message: res.message,
        });
      }
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'FEED_SCHEDULER_ERROR';
      console.error('[bi-auto-scheduler] jobs feed sync error:', { code });
    } finally {
      state.feedSyncPromise = null;
    }
  })();

  state.feedSyncPromise = p;
  return p;
}

function currentVietnamFourHourSlotKey(nowMs: number = Date.now()): string | null {
  const vnDate = new Date(nowMs + VIETNAM_OFFSET_MS);
  const hour = vnDate.getUTCHours();
  if (!SCHEDULED_VN_HOURS.has(hour)) {
    return null;
  }
  const yyyy = vnDate.getUTCFullYear();
  const mm = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getUTCDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}`;
}

async function runSafeWorkerSyncIfDue(): Promise<void> {
  const state = getSchedulerState();
  if (state.workerSyncInFlight) return;

  const slotKey = currentVietnamFourHourSlotKey();
  if (!slotKey || state.lastWorkerSlotKey === slotKey) {
    return;
  }

  state.workerSyncInFlight = true;
  state.lastWorkerSlotKey = slotKey;

  try {
    const prisma = getPrisma();
    await runBiWorkerSync({
      prisma,
      triggerSource: 'CRON',
      mode: 'INCREMENTAL',
    });
  } catch (err) {
    if (err instanceof BiSyncConfigurationError || err instanceof BiSyncConflictError) {
      return;
    }
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : 'WORKER_SCHEDULER_ERROR';
    console.error('[bi-auto-scheduler] worker sync error:', { code });
  } finally {
    state.workerSyncInFlight = false;
  }
}

export async function ensureBiSchedulersStarted(): Promise<void> {
  if (!isProductionRuntime()) return;

  const state = getSchedulerState();
  const now = Date.now();

  if (!state.initialized) {
    state.initialized = true;

    const feedTimer = setInterval(() => {
      void runSafeFeedSync();
    }, FEED_POLL_INTERVAL_MS);
    if (typeof feedTimer.unref === 'function') {
      feedTimer.unref();
    }

    const workerTimer = setInterval(() => {
      void runSafeWorkerSyncIfDue();
    }, WORKER_CHECK_INTERVAL_MS);
    if (typeof workerTimer.unref === 'function') {
      workerTimer.unref();
    }
  }

  if (state.lastFeedSyncAtMs === 0) {
    await Promise.race([
      runBootstrapSnapshotSeedIfNeeded(),
      new Promise<void>((resolve) => setTimeout(resolve, 6_000)),
    ]);
    void runSafeFeedSync();
  } else if (now - state.lastFeedSyncAtMs >= FEED_POLL_INTERVAL_MS) {
    void runSafeFeedSync();
  }

  void runSafeWorkerSyncIfDue();
}
