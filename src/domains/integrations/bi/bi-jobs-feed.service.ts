/**
 * bi-jobs-feed.service.ts — hrp-bi-jobs-feed-sync-v1 (RQ-02, DEC-02, DEC-03, DEC-04)
 *
 * Pulls and reconciles the canonical BI Public Jobs Feed
 * (`https://bi.hrpartner.vn/feeds/jobs.v1.json`) into HRP's database chain:
 *   ClientCompany → Project → StaffingOrder → StaffingOrderSlot → JobOpening → JobPosting
 *
 * Invariants:
 *  - Network fetch happens OUTSIDE the DB transaction.
 *  - DB writes execute inside `withSystemDb(prisma, SYSTEM_CRON)` with a transaction-local
 *    Postgres advisory lock (`pg_try_advisory_xact_lock(20261112, 1)`).
 *  - Fail-closed: if the feed HTTP call or schema validation fails, zero existing jobs
 *    are modified or archived.
 *  - Withdrawn jobs (previously synced `BIFEED-<brief_id>` no longer present in `feed.jobs[]`)
 *    transition cleanly to `JobPosting.status = 'ARCHIVED'`, `JobOpening.status = 'CANCELLED'`,
 *    `StaffingOrder.status = 'CLOSED'` while preserving all candidate submissions.
 */

import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { SYSTEM_CRON, withSystemDb } from '@/src/shared/auth/with-system-db';
import {
  parseBiJobsPublicFeedV1,
  type RecruitmentPostPublicFeedV1,
  type RecruitmentPostPublicJobItemV1,
} from './bi-jobs-feed-contract';
import {
  buildBiFeedOrderDescription,
  buildBiJobPostingSlug,
  compileStandardBriefToJobPosting,
  parseBiFeedSyncMarker,
} from './bi-jobs-feed-mapper';

export const DEFAULT_BI_JOBS_FEED_URL = 'https://bi.hrpartner.vn/feeds/jobs.v1.json';
export const BI_JOBS_FEED_STATE_KEY = 'bi_jobs_feed_sync_state_v1';
export const BI_FEED_ORDER_PREFIX = 'BIFEED-';

export interface BiJobsFeedSyncStats {
  feedUrl: string;
  syncedAt: string;
  totalInFeed: number;
  created: number;
  updated: number;
  unchanged: number;
  archived: number;
}

export type BiJobsFeedSyncResult =
  | ({ ok: true } & BiJobsFeedSyncStats)
  | {
      ok: false;
      code: 'FEED_FETCH_FAILED' | 'INVALID_FEED_PAYLOAD' | 'SYNC_ALREADY_RUNNING' | 'SYNC_INTERNAL_ERROR';
      message: string;
    };

export function resolveBiJobsFeedUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.BI_JOBS_FEED_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BI_JOBS_FEED_URL;
}

export async function fetchBiJobsPublicFeed(
  feedUrl: string = resolveBiJobsFeedUrl(),
): Promise<
  | { ok: true; feedUrl: string; data: RecruitmentPostPublicFeedV1 }
  | { ok: false; code: 'FEED_FETCH_FAILED' | 'INVALID_FEED_PAYLOAD'; message: string }
> {
  let rawJson: unknown;
  try {
    const response = await fetch(feedUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        code: 'FEED_FETCH_FAILED',
        message: `BI Feed trả về HTTP ${response.status}`,
      };
    }

    rawJson = await response.json();
  } catch (err) {
    return {
      ok: false,
      code: 'FEED_FETCH_FAILED',
      message: err instanceof Error ? err.message : 'Lỗi kết nối tới BI Feed',
    };
  }

  const parsed = parseBiJobsPublicFeedV1(rawJson);
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    feedUrl,
    data: parsed.data,
  };
}

function normalizeCustomerKey(name: string): string {
  return name
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildBiClientCompanyCode(customerName: string): string {
  const hash = createHash('sha256')
    .update(normalizeCustomerKey(customerName))
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
  return `BICC-${hash}`;
}

export function buildBiProjectCode(industrialParkCode: string, customerName: string): string {
  const cleanPark =
    industrialParkCode
      .replace(/[^A-Za-z0-9_]/g, '')
      .slice(0, 16)
      .toUpperCase() || 'PARK';
  const hash = createHash('sha256')
    .update(normalizeCustomerKey(customerName))
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  return `BIPRJ-${cleanPark}-${hash}`;
}

async function ensureBiClientCompany(
  tx: Prisma.TransactionClient,
  job: RecruitmentPostPublicJobItemV1,
): Promise<{ id: string; name: string }> {
  const customerName = job.general.customer_name.trim();
  const code = buildBiClientCompanyCode(customerName);
  const industry = job.general.manufacturing_industry?.trim() || null;

  const existing = await tx.clientCompany.findFirst({
    where: {
      OR: [
        { code },
        { name: { equals: customerName, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, status: true, industry: true },
  });

  if (existing) {
    if (existing.status !== 'ACTIVE' || (!existing.industry && industry)) {
      await tx.clientCompany.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          ...(existing.industry ? {} : { industry }),
        },
      });
    }
    return { id: existing.id, name: customerName };
  }

  const created = await tx.clientCompany.create({
    data: {
      code,
      name: customerName,
      industry,
      status: 'ACTIVE',
    },
    select: { id: true, name: true },
  });

  return created;
}

async function ensureBiProject(
  tx: Prisma.TransactionClient,
  clientCompany: { id: string; name: string },
  job: RecruitmentPostPublicJobItemV1,
): Promise<{ id: string; code: string }> {
  const parkCode = job.location.industrial_park_code.trim();
  const parkName = job.location.industrial_park_name.trim();
  const provinceName = job.location.province_name.trim();
  const siteAddress = `${parkName}, ${provinceName}`;
  const projectCode = buildBiProjectCode(parkCode, clientCompany.name);
  const projectName = `${clientCompany.name} — ${parkName}`.slice(0, 180);

  const existing = await tx.project.findFirst({
    where: {
      OR: [
        { code: projectCode },
        {
          clientCompanyId: clientCompany.id,
          OR: [
            { siteAddress: { contains: parkName, mode: 'insensitive' } },
            { name: { contains: parkName, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      code: true,
      status: true,
      isPublic: true,
      siteAddress: true,
      clientCompanyName: true,
    },
  });

  if (existing) {
    if (
      existing.status !== 'ACTIVE' ||
      !existing.isPublic ||
      existing.clientCompanyName !== clientCompany.name ||
      !existing.siteAddress
    ) {
      await tx.project.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          isPublic: true,
          clientCompanyName: clientCompany.name,
          siteAddress: existing.siteAddress || siteAddress,
        },
      });
    }
    return { id: existing.id, code: existing.code };
  }

  const startDate = new Date(job.published_at);
  const validStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;

  const created = await tx.project.create({
    data: {
      code: projectCode,
      clientCompanyId: clientCompany.id,
      clientCompanyName: clientCompany.name,
      name: projectName,
      siteAddress,
      startDate: validStartDate,
      status: 'ACTIVE',
      isPublic: true,
      quota: Math.max(1, job.general.expected_headcount ?? 50),
    },
    select: { id: true, code: true },
  });

  return created;
}

async function resolveUniquePostingSlug(
  tx: Prisma.TransactionClient,
  desiredSlug: string,
  currentOpeningId: string,
): Promise<string> {
  const existing = await tx.jobPosting.findUnique({
    where: { slug: desiredSlug },
    select: { jobOpeningId: true },
  });
  if (!existing || existing.jobOpeningId === currentOpeningId) {
    return desiredSlug;
  }
  const suffix = currentOpeningId.replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase();
  return `${desiredSlug.slice(0, 110)}-${suffix}`;
}

export interface SyncBiJobsPublicFeedOptions {
  feedUrl?: string;
  forceUpdate?: boolean;
  actorId?: string;
  actorRole?: string;
  prefetchedFeed?: RecruitmentPostPublicFeedV1;
}

export async function syncBiJobsPublicFeed(
  prisma: PrismaClient,
  options: SyncBiJobsPublicFeedOptions = {},
): Promise<BiJobsFeedSyncResult> {
  const feedUrl = options.feedUrl ?? resolveBiJobsFeedUrl();

  let feed: RecruitmentPostPublicFeedV1;
  if (options.prefetchedFeed) {
    feed = options.prefetchedFeed;
  } else {
    const fetched = await fetchBiJobsPublicFeed(feedUrl);
    if (!fetched.ok) {
      return fetched;
    }
    feed = fetched.data;
  }

  try {
    return await withSystemDb(prisma, SYSTEM_CRON, async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(20261112, 1) AS locked
      `;
      if (!lockRows[0]?.locked) {
        return {
          ok: false,
          code: 'SYNC_ALREADY_RUNNING',
          message: 'Một tiến trình đồng bộ BI Jobs Feed khác đang chạy.',
        };
      }

      const now = new Date();
      let created = 0;
      let updated = 0;
      let unchanged = 0;
      let archived = 0;

      const activeOrderCodes = new Set<string>();

      for (const job of feed.jobs) {
        const orderCode = `${BI_FEED_ORDER_PREFIX}${job.brief_id}`;
        activeOrderCodes.add(orderCode);

        const clientCompany = await ensureBiClientCompany(tx, job);
        const project = await ensureBiProject(tx, clientCompany, job);
        const compiled = compileStandardBriefToJobPosting(job);
        const orderDescription = buildBiFeedOrderDescription(job, {
          briefId: job.brief_id,
          version: job.version,
        });
        const publishedAtDate = new Date(job.published_at);
        const validPublishedAt = Number.isNaN(publishedAtDate.getTime()) ? now : publishedAtDate;
        const desiredSlug = buildBiJobPostingSlug(
          job.general.customer_name,
          job.location.industrial_park_name,
          job.brief_id,
        );

        const existingOrder = await tx.staffingOrder.findUnique({
          where: { code: orderCode },
          include: {
            slots: { orderBy: { createdAt: 'asc' }, take: 1 },
            jobOpenings: {
              orderBy: { createdAt: 'asc' },
              take: 1,
              include: { posting: true },
            },
          },
        });

        if (!existingOrder) {
          const newOrder = await tx.staffingOrder.create({
            data: {
              projectId: project.id,
              code: orderCode,
              title: compiled.title,
              description: orderDescription,
              status: 'OPEN',
            },
            select: { id: true },
          });

          const newSlot = await tx.staffingOrderSlot.create({
            data: {
              staffingOrderId: newOrder.id,
              positionCode: compiled.positionCode,
              positionTitle: compiled.positionTitle,
              slotsNeeded: compiled.slotsNeeded,
              slotsFilled: 0,
              hourlyRateVnd: compiled.monthlyIncomeRefVnd,
              shiftStart: compiled.shiftStart,
              shiftEnd: compiled.shiftEnd,
              validFrom: validPublishedAt,
              workLocation: compiled.workLocation,
            },
            select: { id: true },
          });

          const newOpening = await tx.jobOpening.create({
            data: {
              staffingOrderId: newOrder.id,
              staffingOrderSlotId: newSlot.id,
              status: 'OPEN',
              openedAt: validPublishedAt,
              serviceModel: 'STAFFING_SUPPLY',
            },
            select: { id: true },
          });

          await tx.staffingOrderSlot.update({
            where: { id: newSlot.id },
            data: { jobOpeningId: newOpening.id },
          });

          const slug = await resolveUniquePostingSlug(tx, desiredSlug, newOpening.id);

          await tx.jobPosting.create({
            data: {
              jobOpeningId: newOpening.id,
              slug,
              revision: Math.max(1, job.version),
              status: 'PUBLISHED',
              publishedAt: validPublishedAt,
              title: compiled.title,
              salaryDisplay: compiled.salaryDisplay,
              descriptionJson: compiled.descriptionJson as unknown as Prisma.InputJsonValue,
              requirementsJson: compiled.requirementsJson as unknown as Prisma.InputJsonValue,
              benefitsJson: compiled.benefitsJson as unknown as Prisma.InputJsonValue,
              applicationInstructionsJson:
                compiled.applicationInstructionsJson as unknown as Prisma.InputJsonValue,
              contentSchemaVersion: compiled.contentSchemaVersion,
            },
          });

          created += 1;
          continue;
        }

        const existingSlot = existingOrder.slots[0] ?? null;
        const existingOpening = existingOrder.jobOpenings[0] ?? null;
        const existingPosting = existingOpening?.posting ?? null;
        const marker = parseBiFeedSyncMarker(existingOrder.description);

        const isUpToDate =
          !options.forceUpdate &&
          marker !== null &&
          marker.version >= job.version &&
          existingOrder.status === 'OPEN' &&
          existingOpening?.status === 'OPEN' &&
          existingPosting?.status === 'PUBLISHED' &&
          existingSlot !== null;

        if (isUpToDate) {
          unchanged += 1;
          continue;
        }

        await tx.staffingOrder.update({
          where: { id: existingOrder.id },
          data: {
            projectId: project.id,
            title: compiled.title,
            description: orderDescription,
            status: 'OPEN',
          },
        });

        const slotId = existingSlot
          ? (
              await tx.staffingOrderSlot.update({
                where: { id: existingSlot.id },
                data: {
                  positionCode: compiled.positionCode,
                  positionTitle: compiled.positionTitle,
                  slotsNeeded: Math.max(compiled.slotsNeeded, existingSlot.slotsFilled + 1),
                  hourlyRateVnd: compiled.monthlyIncomeRefVnd,
                  shiftStart: compiled.shiftStart,
                  shiftEnd: compiled.shiftEnd,
                  workLocation: compiled.workLocation,
                  validTo: null,
                },
                select: { id: true },
              })
            ).id
          : (
              await tx.staffingOrderSlot.create({
                data: {
                  staffingOrderId: existingOrder.id,
                  positionCode: compiled.positionCode,
                  positionTitle: compiled.positionTitle,
                  slotsNeeded: compiled.slotsNeeded,
                  slotsFilled: 0,
                  hourlyRateVnd: compiled.monthlyIncomeRefVnd,
                  shiftStart: compiled.shiftStart,
                  shiftEnd: compiled.shiftEnd,
                  validFrom: validPublishedAt,
                  workLocation: compiled.workLocation,
                },
                select: { id: true },
              })
            ).id;

        const openingId = existingOpening
          ? (
              await tx.jobOpening.update({
                where: { id: existingOpening.id },
                data: {
                  staffingOrderSlotId: slotId,
                  status: 'OPEN',
                  openedAt: existingOpening.openedAt ?? validPublishedAt,
                  closedAt: null,
                  serviceModel: existingOpening.serviceModel ?? 'STAFFING_SUPPLY',
                },
                select: { id: true },
              })
            ).id
          : (
              await tx.jobOpening.create({
                data: {
                  staffingOrderId: existingOrder.id,
                  staffingOrderSlotId: slotId,
                  status: 'OPEN',
                  openedAt: validPublishedAt,
                  serviceModel: 'STAFFING_SUPPLY',
                },
                select: { id: true },
              })
            ).id;

        await tx.staffingOrderSlot.update({
          where: { id: slotId },
          data: { jobOpeningId: openingId },
        });

        const slug = await resolveUniquePostingSlug(tx, desiredSlug, openingId);

        if (existingPosting) {
          await tx.jobPosting.update({
            where: { id: existingPosting.id },
            data: {
              slug,
              status: 'PUBLISHED',
              publishedAt: existingPosting.publishedAt ?? validPublishedAt,
              archivedAt: null,
              revision: Math.max(existingPosting.revision + 1, job.version),
              title: compiled.title,
              salaryDisplay: compiled.salaryDisplay,
              descriptionJson: compiled.descriptionJson as unknown as Prisma.InputJsonValue,
              requirementsJson: compiled.requirementsJson as unknown as Prisma.InputJsonValue,
              benefitsJson: compiled.benefitsJson as unknown as Prisma.InputJsonValue,
              applicationInstructionsJson:
                compiled.applicationInstructionsJson as unknown as Prisma.InputJsonValue,
              contentSchemaVersion: compiled.contentSchemaVersion,
            },
          });
        } else {
          await tx.jobPosting.create({
            data: {
              jobOpeningId: openingId,
              slug,
              revision: Math.max(1, job.version),
              status: 'PUBLISHED',
              publishedAt: validPublishedAt,
              title: compiled.title,
              salaryDisplay: compiled.salaryDisplay,
              descriptionJson: compiled.descriptionJson as unknown as Prisma.InputJsonValue,
              requirementsJson: compiled.requirementsJson as unknown as Prisma.InputJsonValue,
              benefitsJson: compiled.benefitsJson as unknown as Prisma.InputJsonValue,
              applicationInstructionsJson:
                compiled.applicationInstructionsJson as unknown as Prisma.InputJsonValue,
              contentSchemaVersion: compiled.contentSchemaVersion,
            },
          });
        }

        updated += 1;
      }

      // Archive previously synced BI Feed postings that have been withdrawn from the feed
      const allBiOrders = await tx.staffingOrder.findMany({
        where: {
          code: { startsWith: BI_FEED_ORDER_PREFIX },
        },
        select: {
          id: true,
          code: true,
          status: true,
          jobOpenings: {
            select: {
              id: true,
              status: true,
              posting: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      for (const order of allBiOrders) {
        if (activeOrderCodes.has(order.code)) continue;

        let orderArchived = false;
        for (const opening of order.jobOpenings) {
          if (opening.posting && opening.posting.status !== 'ARCHIVED') {
            await tx.jobPosting.update({
              where: { id: opening.posting.id },
              data: {
                status: 'ARCHIVED',
                archivedAt: now,
              },
            });
            orderArchived = true;
          }
          if (opening.status !== 'CANCELLED' && opening.status !== 'FILLED') {
            await tx.jobOpening.update({
              where: { id: opening.id },
              data: {
                status: 'CANCELLED',
                closedAt: now,
              },
            });
          }
        }

        if (order.status !== 'CLOSED' && order.status !== 'CANCELLED') {
          await tx.staffingOrder.update({
            where: { id: order.id },
            data: { status: 'CLOSED' },
          });
          orderArchived = true;
        }

        if (orderArchived) {
          archived += 1;
        }
      }

      const stats: BiJobsFeedSyncStats = {
        feedUrl,
        syncedAt: now.toISOString(),
        totalInFeed: feed.jobs.length,
        created,
        updated,
        unchanged,
        archived,
      };

      try {
        await tx.$executeRawUnsafe('SAVEPOINT sp_bi_feed_meta');
        await tx.payrollConfig.upsert({
          where: {
            key_version: {
              key: BI_JOBS_FEED_STATE_KEY,
              version: 1,
            },
          },
          update: {
            valueJson: stats as unknown as Prisma.InputJsonValue,
            isActive: true,
          },
          create: {
            key: BI_JOBS_FEED_STATE_KEY,
            version: 1,
            valueType: 'STRING',
            description: 'Trạng thái đồng bộ BI Public Jobs Feed (30 phút/lần)',
            effectiveFrom: now,
            isActive: true,
            valueJson: stats as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: options.actorId ?? 'system:cron',
            actorRole: options.actorRole ?? 'ADMIN',
            entityType: 'BiJobsFeedSync',
            entityId: BI_JOBS_FEED_STATE_KEY,
            action: 'SYNC',
            metadata: stats as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.$executeRawUnsafe('RELEASE SAVEPOINT sp_bi_feed_meta');
      } catch {
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT sp_bi_feed_meta').catch(() => undefined);
      }

      return {
        ok: true,
        ...stats,
      };
    }, { maxWait: 15_000, timeout: 60_000 });
  } catch (err) {
    return {
      ok: false,
      code: 'SYNC_INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Lỗi nội bộ khi đồng bộ BI Jobs Feed',
    };
  }
}

export async function getBiJobsFeedSyncState(
  prisma: PrismaClient,
): Promise<BiJobsFeedSyncStats | null> {
  try {
    const row = await withSystemDb(prisma, SYSTEM_CRON, async (tx) =>
      tx.payrollConfig.findUnique({
        where: {
          key_version: {
            key: BI_JOBS_FEED_STATE_KEY,
            version: 1,
          },
        },
        select: { valueJson: true },
      }),
    );
    if (!row || typeof row.valueJson !== 'object' || row.valueJson === null) {
      return null;
    }
    const val = row.valueJson as Record<string, unknown>;
    if (typeof val.syncedAt !== 'string') return null;
    return {
      feedUrl: typeof val.feedUrl === 'string' ? val.feedUrl : resolveBiJobsFeedUrl(),
      syncedAt: val.syncedAt,
      totalInFeed: typeof val.totalInFeed === 'number' ? val.totalInFeed : 0,
      created: typeof val.created === 'number' ? val.created : 0,
      updated: typeof val.updated === 'number' ? val.updated : 0,
      unchanged: typeof val.unchanged === 'number' ? val.unchanged : 0,
      archived: typeof val.archived === 'number' ? val.archived : 0,
    };
  } catch {
    return null;
  }
}
