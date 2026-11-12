import type { Gender, Prisma, PrismaClient } from '@prisma/client';
import { normalizePhone } from '@/src/domains/applications/apply-helpers';
import { hashPassword } from '@/src/shared/auth/password';
import { SYSTEM_BI_SYNC, withSystemDb } from '@/src/shared/auth/with-system-db';
import { buildBiProjectCode } from './bi-jobs-feed.service';
import {
  decryptBiSyncSecret,
  encryptBiSyncSecret,
  encryptWorkerInitialPassword,
  generateWorkerInitialPassword,
} from './bi-credential-vault';
import {
  DEFAULT_BI_SYNC_BASE_URL,
  fetchBiCatalog,
  fetchBiWorkerEpisodesPage,
  normalizeBiApiBaseUrl,
  type BiCatalogProject,
  type BiSyncConnectionConfig,
  type NormalizedBiWorkerEpisodeItem,
} from './bi-sync-client';

export const BI_SOURCE_SYSTEM = 'MINI_BI';
const BI_CLIENT_CODE = 'CLI-MINI-BI';
const BI_CLIENT_NAME = 'Dự án đồng bộ từ Mini-BI';
const MAX_EPISODE_PAGES = 200;

export type BiSyncMode = 'INCREMENTAL' | 'FULL_RESYNC';
export type BiSyncTriggerSource = 'CRON' | 'ADMIN_MANUAL';

export interface RunBiWorkerSyncOptions {
  prisma: PrismaClient;
  triggerSource: BiSyncTriggerSource;
  mode?: BiSyncMode;
  actorUserId?: string;
  fetchImpl?: typeof fetch;
  connectionOverride?: BiSyncConnectionConfig;
}

export interface BiWorkerSyncRunSummary {
  runId: string;
  triggerSource: BiSyncTriggerSource;
  mode: BiSyncMode;
  status: 'SUCCEEDED' | 'PARTIAL_WITH_EXCEPTIONS' | 'FAILED';
  checkpointBefore: string | null;
  checkpointAfter: string | null;
  catalogProjectsSynced: number;
  episodesFetched: number;
  episodesApplied: number;
  episodesSkipped: number;
  tombstonesProcessed: number;
  exceptionsOpened: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string;
}

export class BiSyncConflictError extends Error {
  readonly code = 'BI_SYNC_ALREADY_RUNNING';
  constructor() {
    super('Đang có một tiến trình đồng bộ BI khác chạy. Vui lòng đợi hoàn tất.');
    this.name = 'BiSyncConflictError';
  }
}

export class BiSyncConfigurationError extends Error {
  readonly code = 'BI_SYNC_NOT_CONFIGURED';
  constructor(message = 'Chưa cấu hình BI API Key để đồng bộ nhân sự.') {
    super(message);
    this.name = 'BiSyncConfigurationError';
  }
}

let activeSyncInProcess = false;

function parseIsoDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const parsed = new Date(iso);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function mapBiGender(raw: string | null | undefined): Gender | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'MALE' || upper === 'NAM') return 'MALE';
  if (upper === 'FEMALE' || upper === 'NU' || upper === 'NỮ') return 'FEMALE';
  if (upper === 'OTHER' || upper === 'KHAC' || upper === 'KHÁC') return 'OTHER';
  return null;
}

function mapEmploymentType(providerType: string | null, laborType: string | null): string {
  const provider = (providerType ?? '').trim().toLowerCase();
  if (provider === 'vendor') return 'OUTSOURCED';
  const lt = (laborType ?? '').trim().toUpperCase();
  if (lt === 'REFERRAL' || lt === 'REFERRED_OUT') return 'REFERRED_OUT';
  return 'HRP_EMPLOYED';
}

async function ensureBiClientCompanyInTx(tx: Prisma.TransactionClient): Promise<{ id: string }> {
  const existing = await tx.clientCompany.findUnique({
    where: { code: BI_CLIENT_CODE },
    select: { id: true },
  });
  if (existing) return existing;

  return tx.clientCompany.create({
    data: {
      code: BI_CLIENT_CODE,
      name: BI_CLIENT_NAME,
      status: 'ACTIVE',
    },
    select: { id: true },
  });
}

async function upsertSyncExceptionInTx(
  tx: Prisma.TransactionClient,
  input: {
    exceptionType:
      | 'MISSING_OR_INVALID_CCCD'
      | 'DUPLICATE_ON'
      | 'ACCOUNT_CONFLICT'
      | 'PROJECT_LOCATION_MISSING';
    externalId: string;
    projectExternalId?: string | null;
    lastSyncVersion: bigint;
    summary: string;
    details?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.biSyncException.upsert({
    where: {
      exceptionType_externalId: {
        exceptionType: input.exceptionType,
        externalId: input.externalId,
      },
    },
    create: {
      exceptionType: input.exceptionType,
      externalId: input.externalId,
      projectExternalId: input.projectExternalId ?? null,
      status: 'OPEN',
      lastSyncVersion: input.lastSyncVersion,
      summary: input.summary,
      details: input.details ?? {},
      resolvedAt: null,
    },
    update: {
      projectExternalId: input.projectExternalId ?? null,
      status: 'OPEN',
      lastSyncVersion: input.lastSyncVersion,
      summary: input.summary,
      details: input.details ?? {},
      resolvedAt: null,
    },
  });
}

async function resolveSyncExceptionInTx(
  tx: Prisma.TransactionClient,
  exceptionType:
    | 'MISSING_OR_INVALID_CCCD'
    | 'DUPLICATE_ON'
    | 'ACCOUNT_CONFLICT'
    | 'PROJECT_LOCATION_MISSING',
  externalId: string,
  lastSyncVersion?: bigint,
): Promise<void> {
  await tx.biSyncException.updateMany({
    where: {
      exceptionType,
      externalId,
      status: 'OPEN',
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      ...(lastSyncVersion !== undefined ? { lastSyncVersion } : {}),
    },
  });
}

async function resolveAllEpisodeExceptionsInTx(
  tx: Prisma.TransactionClient,
  episodeId: string,
  lastSyncVersion: bigint,
): Promise<void> {
  await tx.biSyncException.updateMany({
    where: {
      externalId: episodeId,
      status: 'OPEN',
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      lastSyncVersion,
    },
  });
}

/**
 * Đồng bộ 1 dự án từ `/v1/catalog` và áp dụng quy tắc #4 (Location fail-closed).
 */
export async function syncBiCatalogProjectInTx(
  tx: Prisma.TransactionClient,
  catalogProject: BiCatalogProject,
): Promise<{ hrpProjectId: string; locationExceptionOpened: boolean }> {
  const existingLink = await tx.externalEntityLink.findUnique({
    where: {
      sourceSystem_entityType_externalId: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'PROJECT',
        externalId: catalogProject.projectId,
      },
    },
  });

  const candidateCode = buildBiProjectCode(catalogProject.projectId, catalogProject.displayName);

  let hrpProject = existingLink?.hrpId
    ? await tx.project.findUnique({
        where: { id: existingLink.hrpId },
        select: { id: true, code: true, name: true },
      })
    : null;

  if (!hrpProject) {
    hrpProject = await tx.project.findFirst({
      where: {
        OR: [
          { code: candidateCode },
          { name: { equals: catalogProject.displayName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, name: true },
    });
  }

  if (!hrpProject) {
    const client = await ensureBiClientCompanyInTx(tx);
    hrpProject = await tx.project.create({
      data: {
        code: candidateCode,
        name: catalogProject.displayName,
        clientCompanyName: BI_CLIENT_NAME,
        clientCompanyId: client.id,
        startDate: new Date(),
        status: catalogProject.active ? 'ACTIVE' : 'PAUSED',
        isPublic: true,
        siteAddress: catalogProject.location?.address ?? catalogProject.displayName,
      },
      select: { id: true, code: true, name: true },
    });
  } else {
    await tx.project.update({
      where: { id: hrpProject.id },
      data: {
        name: catalogProject.displayName,
        ...(catalogProject.location?.address
          ? { siteAddress: catalogProject.location.address }
          : {}),
      },
    });
  }

  await tx.externalEntityLink.upsert({
    where: {
      sourceSystem_entityType_externalId: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'PROJECT',
        externalId: catalogProject.projectId,
      },
    },
    create: {
      sourceSystem: BI_SOURCE_SYSTEM,
      entityType: 'PROJECT',
      externalId: catalogProject.projectId,
      hrpId: hrpProject.id,
      lastSyncVersion: BigInt(catalogProject.version),
      isTombstoned: false,
      metadata: {
        displayName: catalogProject.displayName,
        active: catalogProject.active,
      },
    },
    update: {
      hrpId: hrpProject.id,
      lastSyncVersion: BigInt(catalogProject.version),
      isTombstoned: false,
      metadata: {
        displayName: catalogProject.displayName,
        active: catalogProject.active,
      },
    },
  });

  // Quy tắc #4: Đọc tọa độ dự án duy nhất từ Catalog; tuyệt đối không tự suy đoán tọa độ.
  const loc = catalogProject.location;
  const confirmedAtDate = parseIsoDateOrNull(loc?.confirmedAt);
  const hasConfirmedCoordinates =
    loc !== null &&
    loc.latitude !== null &&
    loc.longitude !== null &&
    confirmedAtDate !== null;

  const existingSite = await tx.site.findUnique({
    where: {
      sourceSystem_externalRef: {
        sourceSystem: BI_SOURCE_SYSTEM,
        externalRef: catalogProject.projectId,
      },
    },
    select: { id: true },
  });

  if (hasConfirmedCoordinates && loc) {
    const radiusMeters =
      loc.radiusMeters && loc.radiusMeters > 0 ? Math.round(loc.radiusMeters) : 200;
    if (existingSite) {
      await tx.site.update({
        where: { id: existingSite.id },
        data: {
          projectId: hrpProject.id,
          name: catalogProject.displayName,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusMeters,
          geoConfirmedAt: confirmedAtDate,
        },
      });
    } else {
      await tx.site.create({
        data: {
          projectId: hrpProject.id,
          sourceSystem: BI_SOURCE_SYSTEM,
          externalRef: catalogProject.projectId,
          name: catalogProject.displayName,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusMeters,
          geoConfirmedAt: confirmedAtDate,
        },
      });
    }
    await resolveSyncExceptionInTx(
      tx,
      'PROJECT_LOCATION_MISSING',
      catalogProject.projectId,
      BigInt(catalogProject.version),
    );
    return { hrpProjectId: hrpProject.id, locationExceptionOpened: false };
  }

  // Location là null hoặc chưa xác nhận (confirmedAt === null): fail-closed, geoConfirmedAt = null
  if (existingSite) {
    await tx.site.update({
      where: { id: existingSite.id },
      data: {
        projectId: hrpProject.id,
        name: catalogProject.displayName,
        address: loc?.address ?? null,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        radiusMeters:
          loc?.radiusMeters && loc.radiusMeters > 0 ? Math.round(loc.radiusMeters) : 200,
        geoConfirmedAt: null,
      },
    });
  } else {
    await tx.site.create({
      data: {
        projectId: hrpProject.id,
        sourceSystem: BI_SOURCE_SYSTEM,
        externalRef: catalogProject.projectId,
        name: catalogProject.displayName,
        address: loc?.address ?? null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        geoConfirmedAt: null,
      },
    });
  }

  await upsertSyncExceptionInTx(tx, {
    exceptionType: 'PROJECT_LOCATION_MISSING',
    externalId: catalogProject.projectId,
    projectExternalId: catalogProject.projectId,
    lastSyncVersion: BigInt(catalogProject.version),
    summary: `Dự án "${catalogProject.displayName}" (${catalogProject.projectId}) chưa có tọa độ GPS đã xác nhận trên BI Catalog.`,
    details: {
      projectId: catalogProject.projectId,
      displayName: catalogProject.displayName,
      hasLocationObject: loc !== null,
      confirmedAt: loc?.confirmedAt ?? null,
    },
  });

  return { hrpProjectId: hrpProject.id, locationExceptionOpened: true };
}

async function resolveOrCreateBiProjectIdInTx(
  tx: Prisma.TransactionClient,
  projectExternalId: string | null,
): Promise<string> {
  const extId = projectExternalId?.trim() || 'bi-unassigned-project';
  const link = await tx.externalEntityLink.findUnique({
    where: {
      sourceSystem_entityType_externalId: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'PROJECT',
        externalId: extId,
      },
    },
    select: { hrpId: true },
  });
  if (link?.hrpId) return link.hrpId;

  const synced = await syncBiCatalogProjectInTx(tx, {
    projectId: extId,
    displayName: extId,
    active: true,
    version: 1,
    updatedAt: null,
    location: null,
  });
  return synced.hrpProjectId;
}

/**
 * Tính lại trạng thái phân công khi 1 NLĐ có nhiều đợt ON (DEC-07) và tính lại
 * `Worker.employmentStatus` (DEC-06):
 * - Nếu có >1 phân công nguồn BI đang ở trạng thái mong muốn ON (status IN ('ACTIVE', 'PAUSED')),
 *   chỉ giữ phân công có `validFrom` mới nhất là `ACTIVE`, các đợt còn lại chuyển `PAUSED` và mở `DUPLICATE_ON`.
 * - Nếu còn <=1 đợt ON (ví dụ sau khi đợt mới bị OFF hoặc tombstone), kích hoạt đợt `PAUSED` còn lại lên `ACTIVE` và đóng `DUPLICATE_ON`.
 * - Cập nhật `Worker.employmentStatus = 'ACTIVE'` nếu còn >=1 assignment `ACTIVE`, ngược lại `'TERMINATED'`.
 */
async function reconcileWorkerAssignmentsAndStatusInTx(
  tx: Prisma.TransactionClient,
  workerId: string,
  syncVersion: bigint,
): Promise<{ duplicateExceptionOpened: boolean }> {
  const allAssignments = await tx.projectAssignment.findMany({
    where: { workerId },
    orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      validFrom: true,
      sourceSystem: true,
      externalRef: true,
      projectId: true,
    },
  });

  const onCandidates = allAssignments.filter(
    (a) => a.sourceSystem === BI_SOURCE_SYSTEM && (a.status === 'ACTIVE' || a.status === 'PAUSED'),
  );

  let duplicateExceptionOpened = false;

  if (onCandidates.length > 1) {
    const [winner, ...losers] = onCandidates;
    if (winner.status !== 'ACTIVE') {
      await tx.projectAssignment.update({
        where: { id: winner.id },
        data: { status: 'ACTIVE', isPrimary: true },
      });
    }
    for (const loser of losers) {
      if (loser.status !== 'PAUSED') {
        await tx.projectAssignment.update({
          where: { id: loser.id },
          data: { status: 'PAUSED', isPrimary: false },
        });
      }
      if (loser.externalRef) {
        await upsertSyncExceptionInTx(tx, {
          exceptionType: 'DUPLICATE_ON',
          externalId: loser.externalRef,
          lastSyncVersion: syncVersion,
          summary: `NLĐ có nhiều đợt đang làm việc (ON) đồng thời; đợt cũ hơn (${loser.externalRef}) được tạm dừng (PAUSED).`,
          details: {
            activeEpisodeId: winner.externalRef,
            pausedEpisodeId: loser.externalRef,
          },
        });
        duplicateExceptionOpened = true;
      }
    }
  } else if (onCandidates.length === 1) {
    const onlyOne = onCandidates[0];
    if (onlyOne.status !== 'ACTIVE') {
      await tx.projectAssignment.update({
        where: { id: onlyOne.id },
        data: { status: 'ACTIVE', isPrimary: true },
      });
    }
    for (const a of allAssignments) {
      if (a.externalRef) {
        await resolveSyncExceptionInTx(tx, 'DUPLICATE_ON', a.externalRef, syncVersion);
      }
    }
  } else {
    for (const a of allAssignments) {
      if (a.externalRef) {
        await resolveSyncExceptionInTx(tx, 'DUPLICATE_ON', a.externalRef, syncVersion);
      }
    }
  }

  const activeCount = await tx.projectAssignment.count({
    where: { workerId, status: 'ACTIVE' },
  });

  await tx.worker.update({
    where: { id: workerId },
    data: {
      profileStatus: 'VERIFIED',
      employmentStatus: activeCount > 0 ? 'ACTIVE' : 'TERMINATED',
    },
  });

  return { duplicateExceptionOpened };
}

/**
 * Áp dụng 1 phần tử `episode` (hồ sơ sống hoặc tombstone) trong transaction.
 * Tuân thủ chặt Quy tắc #1 (`sync_version`) và Quy tắc #3 (`tombstone` idempotent giữ lịch sử).
 */
export async function applyBiWorkerEpisodeInTx(
  tx: Prisma.TransactionClient,
  item: NormalizedBiWorkerEpisodeItem,
  env: Record<string, string | undefined> = process.env,
): Promise<{
  outcome: 'SKIPPED_BY_VERSION' | 'TOMBSTONE_APPLIED' | 'EXCEPTION_OPENED' | 'APPLIED';
  exceptionsOpenedDelta: number;
}> {
  const existingLink = await tx.externalEntityLink.findUnique({
    where: {
      sourceSystem_entityType_externalId: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'WORKER_EPISODE',
        externalId: item.episodeId,
      },
    },
  });

  // Quy tắc #1: Chỉ bỏ qua khi sync_version nhận được <= last_sync_version đã lưu.
  if (existingLink && item.syncVersion <= existingLink.lastSyncVersion) {
    return { outcome: 'SKIPPED_BY_VERSION', exceptionsOpenedDelta: 0 };
  }

  // Quy tắc #3: Xử lý Tombstone idempotent & bảo toàn lịch sử.
  if (item.isTombstone) {
    await resolveAllEpisodeExceptionsInTx(tx, item.episodeId, item.syncVersion);

    let existingAssignment = existingLink?.hrpId
      ? await tx.projectAssignment.findUnique({
          where: { id: existingLink.hrpId },
          select: { id: true, workerId: true, projectId: true, status: true, validTo: true },
        })
      : null;

    if (!existingAssignment) {
      existingAssignment = await tx.projectAssignment.findUnique({
        where: {
          sourceSystem_externalRef: {
            sourceSystem: BI_SOURCE_SYSTEM,
            externalRef: item.episodeId,
          },
        },
        select: { id: true, workerId: true, projectId: true, status: true, validTo: true },
      });
    }

    if (existingAssignment) {
      const [attendanceCount, timesheetCount] = await Promise.all([
        tx.attendanceEvent.count({
          where: {
            OR: [
              { assignmentId: existingAssignment.id },
              {
                workerId: existingAssignment.workerId,
                projectId: existingAssignment.projectId,
              },
            ],
          },
        }),
        tx.timesheetLine.count({
          where: { assignmentId: existingAssignment.id },
        }),
      ]);

      const hasAttendanceHistory = attendanceCount > 0 || timesheetCount > 0;
      const nextStatus = hasAttendanceHistory ? 'ENDED' : 'CANCELLED';
      const deletedAtDate = parseIsoDateOrNull(item.deletedAt) ?? new Date();

      await tx.projectAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          status: nextStatus,
          isPrimary: false,
          validTo: existingAssignment.validTo ?? deletedAtDate,
          transferReason: `TOMBSTONE:${item.tombstoneReason ?? 'DELETED'}`,
        },
      });

      await reconcileWorkerAssignmentsAndStatusInTx(
        tx,
        existingAssignment.workerId,
        item.syncVersion,
      );
    }

    await tx.externalEntityLink.upsert({
      where: {
        sourceSystem_entityType_externalId: {
          sourceSystem: BI_SOURCE_SYSTEM,
          entityType: 'WORKER_EPISODE',
          externalId: item.episodeId,
        },
      },
      create: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'WORKER_EPISODE',
        externalId: item.episodeId,
        hrpId: existingAssignment?.id ?? existingLink?.hrpId ?? null,
        lastSyncVersion: item.syncVersion,
        isTombstoned: true,
        metadata: {
          tombstoneReason: item.tombstoneReason ?? 'DELETED',
          deletedAt: item.deletedAt,
        },
      },
      update: {
        hrpId: existingAssignment?.id ?? existingLink?.hrpId ?? null,
        lastSyncVersion: item.syncVersion,
        isTombstoned: true,
        metadata: {
          tombstoneReason: item.tombstoneReason ?? 'DELETED',
          deletedAt: item.deletedAt,
        },
      },
    });

    return { outcome: 'TOMBSTONE_APPLIED', exceptionsOpenedDelta: 0 };
  }

  // Đợt sống nhưng thiếu hoặc sai CCCD (DEC-03 / AC-03) -> không tạo User, mở ngoại lệ
  if (item.nationalIdState !== 'VALID' || !item.nationalId) {
    await upsertSyncExceptionInTx(tx, {
      exceptionType: 'MISSING_OR_INVALID_CCCD',
      externalId: item.episodeId,
      projectExternalId: item.projectId,
      lastSyncVersion: item.syncVersion,
      summary: `Đợt làm việc ${item.employeeCode ?? item.episodeId} thiếu hoặc sai định dạng CCCD (${item.nationalIdState}).`,
      details: {
        episodeId: item.episodeId,
        employeeCode: item.employeeCode,
        nationalIdState: item.nationalIdState,
        projectId: item.projectId,
      },
    });

    await tx.externalEntityLink.upsert({
      where: {
        sourceSystem_entityType_externalId: {
          sourceSystem: BI_SOURCE_SYSTEM,
          entityType: 'WORKER_EPISODE',
          externalId: item.episodeId,
        },
      },
      create: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'WORKER_EPISODE',
        externalId: item.episodeId,
        hrpId: existingLink?.hrpId ?? null,
        lastSyncVersion: item.syncVersion,
        isTombstoned: false,
        metadata: {
          nationalIdState: item.nationalIdState,
          employeeCode: item.employeeCode,
        },
      },
      update: {
        lastSyncVersion: item.syncVersion,
        isTombstoned: false,
        metadata: {
          nationalIdState: item.nationalIdState,
          employeeCode: item.employeeCode,
        },
      },
    });

    return { outcome: 'EXCEPTION_OPENED', exceptionsOpenedDelta: 1 };
  }

  // CCCD hợp lệ -> tự động đóng ngoại lệ MISSING_OR_INVALID_CCCD nếu từng mở trước đó
  await resolveSyncExceptionInTx(tx, 'MISSING_OR_INVALID_CCCD', item.episodeId, item.syncVersion);

  const canonicalCccd = item.nationalId;
  const hrpProjectId = await resolveOrCreateBiProjectIdInTx(tx, item.projectId);
  const rawPhone = item.person?.phone ?? null;
  const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;
  const validNormalizedPhone =
    normalizedPhone && /^0\d{9}$/.test(normalizedPhone) ? normalizedPhone : null;

  let exceptionsOpenedDelta = 0;

  // Tìm Worker theo CCCD canonical
  let worker = await tx.worker.findUnique({
    where: { cccdNumber: canonicalCccd },
    select: {
      id: true,
      userId: true,
      accountUserId: true,
      fullName: true,
      phone: true,
      selfEditedFields: true,
    },
  });

  // Kiểm tra xung đột SĐT với Worker khác (DEC-10)
  let canUsePhoneOnWorker = Boolean(validNormalizedPhone);
  if (validNormalizedPhone) {
    const phoneOwnerWorker = await tx.worker.findUnique({
      where: { phone: validNormalizedPhone },
      select: { id: true, cccdNumber: true },
    });
    if (phoneOwnerWorker && phoneOwnerWorker.cccdNumber !== canonicalCccd) {
      canUsePhoneOnWorker = false;
      await upsertSyncExceptionInTx(tx, {
        exceptionType: 'ACCOUNT_CONFLICT',
        externalId: item.episodeId,
        projectExternalId: item.projectId,
        lastSyncVersion: item.syncVersion,
        summary: `SĐT trên đợt ${item.employeeCode ?? item.episodeId} đang gắn với một hồ sơ NLĐ khác trên HRP.`,
        details: {
          episodeId: item.episodeId,
          employeeCode: item.employeeCode,
          conflictingWorkerId: phoneOwnerWorker.id,
        },
      });
      exceptionsOpenedDelta += 1;
    } else {
      await resolveSyncExceptionInTx(tx, 'ACCOUNT_CONFLICT', item.episodeId, item.syncVersion);
    }
  }

  if (!worker) {
    // Kiểm tra xem đã có User tự đăng ký theo SĐT chưa gắn Worker nào khác không (DEC-10)
    let accountUser: { id: string } | null = null;
    let initialPlainPassword: string | null = null;

    if (validNormalizedPhone && canUsePhoneOnWorker) {
      const existingPhoneUser = await tx.user.findFirst({
        where: { phone: validNormalizedPhone },
        select: {
          id: true,
          role: true,
          workerAccount: { select: { id: true } },
        },
      });
      if (existingPhoneUser) {
        if (existingPhoneUser.role === 'WORKER' && !existingPhoneUser.workerAccount) {
          accountUser = { id: existingPhoneUser.id };
        } else {
          canUsePhoneOnWorker = false;
          await upsertSyncExceptionInTx(tx, {
            exceptionType: 'ACCOUNT_CONFLICT',
            externalId: item.episodeId,
            projectExternalId: item.projectId,
            lastSyncVersion: item.syncVersion,
            summary: `SĐT trên đợt ${item.employeeCode ?? item.episodeId} trùng với tài khoản hệ thống hiện hữu.`,
            details: {
              episodeId: item.episodeId,
              employeeCode: item.employeeCode,
            },
          });
          exceptionsOpenedDelta += 1;
        }
      }
    }

    if (!accountUser) {
      initialPlainPassword = generateWorkerInitialPassword(10);
      const passwordHash = await hashPassword(initialPlainPassword);
      accountUser = await tx.user.create({
        data: {
          phone: canUsePhoneOnWorker ? validNormalizedPhone : null,
          name: item.person?.fullName ?? item.employeeCode ?? canonicalCccd,
          passwordHash,
          role: 'WORKER',
          isActive: true,
          mustChangePassword: true,
        },
        select: { id: true },
      });
    }

    const dob = parseIsoDateOrNull(item.person?.dateOfBirth);
    const issuedDate = parseIsoDateOrNull(item.person?.nationalIdIssuedAt);
    const gender = mapBiGender(item.person?.gender);

    worker = await tx.worker.create({
      data: {
        userId: `BI-${canonicalCccd}`,
        accountUserId: accountUser.id,
        cccdNumber: canonicalCccd,
        fullName: item.person?.fullName ?? item.employeeCode ?? canonicalCccd,
        phone: canUsePhoneOnWorker ? validNormalizedPhone : null,
        dateOfBirth: dob,
        gender,
        permanentAddress: item.person?.address ?? null,
        currentAddress: item.person?.address ?? null,
        cccdIssuedDate: issuedDate,
        cccdIssuedPlace: item.person?.nationalIdIssuedPlace ?? null,
        profileStatus: 'VERIFIED',
        employmentStatus: item.status?.value === 'ON' ? 'ACTIVE' : 'TERMINATED',
        selfEditedFields: [],
      },
      select: {
        id: true,
        userId: true,
        accountUserId: true,
        fullName: true,
        phone: true,
        selfEditedFields: true,
      },
    });

    if (initialPlainPassword) {
      const ciphertext = encryptWorkerInitialPassword(initialPlainPassword, env);
      await tx.workerInitialCredential.upsert({
        where: { userId: accountUser.id },
        create: {
          userId: accountUser.id,
          workerId: worker.id,
          projectId: hrpProjectId,
          ciphertext,
        },
        update: {
          workerId: worker.id,
          projectId: hrpProjectId,
          ciphertext,
        },
      });
    }
  } else {
    // Worker đã tồn tại -> đảm bảo có accountUserId, và chỉ cập nhật các trường KHÔNG nằm trong selfEditedFields (DEC-08)
    let accountUserId = worker.accountUserId;
    if (!accountUserId) {
      const initialPlainPassword = generateWorkerInitialPassword(10);
      const passwordHash = await hashPassword(initialPlainPassword);
      const createdUser = await tx.user.create({
        data: {
          phone: null,
          name: worker.fullName ?? item.person?.fullName ?? canonicalCccd,
          passwordHash,
          role: 'WORKER',
          isActive: true,
          mustChangePassword: true,
        },
        select: { id: true },
      });
      accountUserId = createdUser.id;
      const ciphertext = encryptWorkerInitialPassword(initialPlainPassword, env);
      await tx.workerInitialCredential.upsert({
        where: { userId: createdUser.id },
        create: {
          userId: createdUser.id,
          workerId: worker.id,
          projectId: hrpProjectId,
          ciphertext,
        },
        update: {
          workerId: worker.id,
          projectId: hrpProjectId,
          ciphertext,
        },
      });
    }

    const editedSet = new Set(worker.selfEditedFields ?? []);
    const workerUpdate: Prisma.WorkerUpdateInput = {
      account: { connect: { id: accountUserId } },
      profileStatus: 'VERIFIED',
    };

    if (!editedSet.has('fullName') && item.person?.fullName) {
      workerUpdate.fullName = item.person.fullName;
    }
    if (!editedSet.has('phone') && canUsePhoneOnWorker && validNormalizedPhone && !worker.phone) {
      workerUpdate.phone = validNormalizedPhone;
    }
    const dob = parseIsoDateOrNull(item.person?.dateOfBirth);
    if (!editedSet.has('dateOfBirth') && dob) {
      workerUpdate.dateOfBirth = dob;
    }
    const gender = mapBiGender(item.person?.gender);
    if (!editedSet.has('gender') && gender) {
      workerUpdate.gender = gender;
    }
    if (!editedSet.has('permanentAddress') && item.person?.address) {
      workerUpdate.permanentAddress = item.person.address;
    }
    if (!editedSet.has('currentAddress') && item.person?.address) {
      workerUpdate.currentAddress = item.person.address;
    }
    const issuedDate = parseIsoDateOrNull(item.person?.nationalIdIssuedAt);
    if (issuedDate) {
      workerUpdate.cccdIssuedDate = issuedDate;
    }
    if (item.person?.nationalIdIssuedPlace) {
      workerUpdate.cccdIssuedPlace = item.person.nationalIdIssuedPlace;
    }

    await tx.worker.update({
      where: { id: worker.id },
      data: workerUpdate,
    });
  }

  // Ánh xạ trạng thái phân công (DEC-06): ON -> ACTIVE, UNCONFIRMED -> PLANNED, OFF -> ENDED
  const biStatus = item.status?.value ?? 'UNCONFIRMED';
  const validFromDate =
    parseIsoDateOrNull(item.firstWorkDate) ??
    parseIsoDateOrNull(item.status?.effectiveDate) ??
    new Date();
  const leaveDate = parseIsoDateOrNull(item.status?.leaveDate);

  let mappedStatus: 'ACTIVE' | 'PLANNED' | 'ENDED' = 'PLANNED';
  let validToDate: Date | null = null;
  if (biStatus === 'ON') {
    mappedStatus = 'ACTIVE';
    validToDate = null;
  } else if (biStatus === 'OFF') {
    mappedStatus = 'ENDED';
    validToDate = leaveDate ?? parseIsoDateOrNull(item.status?.effectiveDate) ?? new Date();
  } else {
    mappedStatus = 'PLANNED';
    validToDate = null;
  }

  const employeeCode = item.employeeCode?.trim() || `BI-${item.episodeId.slice(0, 8)}`;
  const employmentType = mapEmploymentType(item.providerType, item.laborType);

  let assignment = await tx.projectAssignment.findUnique({
    where: {
      sourceSystem_externalRef: {
        sourceSystem: BI_SOURCE_SYSTEM,
        externalRef: item.episodeId,
      },
    },
    select: { id: true },
  });

  if (!assignment) {
    // Phòng trường hợp trùng (projectId, employeeCode) có sẵn
    const byProjectCode = await tx.projectAssignment.findUnique({
      where: {
        projectId_employeeCode: {
          projectId: hrpProjectId,
          employeeCode,
        },
      },
      select: { id: true },
    });
    assignment = byProjectCode;
  }

  if (assignment) {
    assignment = await tx.projectAssignment.update({
      where: { id: assignment.id },
      data: {
        workerId: worker.id,
        projectId: hrpProjectId,
        employeeCode,
        employmentType,
        workSetting: 'PHOTHONG',
        validFrom: validFromDate,
        validTo: validToDate,
        status: mappedStatus,
        isPrimary: mappedStatus === 'ACTIVE',
        sourceSystem: BI_SOURCE_SYSTEM,
        externalRef: item.episodeId,
        recruiterExternalId: item.recruiter?.recruiterId ?? null,
        recruiterName: item.recruiter?.displayName ?? null,
        recruiterCode: item.recruiter?.personnelCode ?? null,
      },
      select: { id: true },
    });
  } else {
    assignment = await tx.projectAssignment.create({
      data: {
        workerId: worker.id,
        projectId: hrpProjectId,
        employeeCode,
        employmentType,
        workSetting: 'PHOTHONG',
        validFrom: validFromDate,
        validTo: validToDate,
        status: mappedStatus,
        isPrimary: mappedStatus === 'ACTIVE',
        sourceSystem: BI_SOURCE_SYSTEM,
        externalRef: item.episodeId,
        recruiterExternalId: item.recruiter?.recruiterId ?? null,
        recruiterName: item.recruiter?.displayName ?? null,
        recruiterCode: item.recruiter?.personnelCode ?? null,
      },
      select: { id: true },
    });
  }

  const reconcileRes = await reconcileWorkerAssignmentsAndStatusInTx(
    tx,
    worker.id,
    item.syncVersion,
  );
  if (reconcileRes.duplicateExceptionOpened) {
    exceptionsOpenedDelta += 1;
  }

  await tx.externalEntityLink.upsert({
    where: {
      sourceSystem_entityType_externalId: {
        sourceSystem: BI_SOURCE_SYSTEM,
        entityType: 'WORKER_EPISODE',
        externalId: item.episodeId,
      },
    },
    create: {
      sourceSystem: BI_SOURCE_SYSTEM,
      entityType: 'WORKER_EPISODE',
      externalId: item.episodeId,
      hrpId: assignment.id,
      lastSyncVersion: item.syncVersion,
      isTombstoned: false,
      metadata: {
        employeeCode,
        biStatus,
        projectId: item.projectId,
      },
    },
    update: {
      hrpId: assignment.id,
      lastSyncVersion: item.syncVersion,
      isTombstoned: false,
      metadata: {
        employeeCode,
        biStatus,
        projectId: item.projectId,
      },
    },
  });

  return { outcome: 'APPLIED', exceptionsOpenedDelta };
}

/**
 * Lưu cấu hình kết nối BI (Base URL + Bearer API key mã hóa AES-256-GCM).
 */
export async function saveBiSyncCredentials(
  prisma: PrismaClient,
  input: {
    baseUrl: string;
    apiKey?: string;
    updatedByUserId: string;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<{ baseUrl: string; hasApiKey: boolean; updatedAt: string }> {
  const normalizedUrl = normalizeBiApiBaseUrl(input.baseUrl);
  return withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
    const existing = await tx.biSyncCredential.findUnique({
      where: { id: 'primary' },
    });

    const trimmedKey = input.apiKey?.trim();
    const apiKeyCiphertext = trimmedKey
      ? encryptBiSyncSecret(trimmedKey, env)
      : existing?.apiKeyCiphertext;

    if (!apiKeyCiphertext) {
      throw new BiSyncConfigurationError('Vui lòng nhập BI Sync API Key (tối thiểu 32 ký tự).');
    }

    const saved = await tx.biSyncCredential.upsert({
      where: { id: 'primary' },
      create: {
        id: 'primary',
        baseUrl: normalizedUrl,
        apiKeyCiphertext,
        updatedByUserId: input.updatedByUserId,
      },
      update: {
        baseUrl: normalizedUrl,
        apiKeyCiphertext,
        updatedByUserId: input.updatedByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.updatedByUserId,
        actorRole: 'ADMIN',
        action: 'UPDATE_BI_SYNC_CONFIG',
        entityType: 'BI_SYNC_CREDENTIAL',
        entityId: 'primary',
        diff: {
          baseUrl: normalizedUrl,
          apiKeyRotated: Boolean(trimmedKey),
        },
      },
    });

    return {
      baseUrl: saved.baseUrl,
      hasApiKey: Boolean(saved.apiKeyCiphertext),
      updatedAt: saved.updatedAt.toISOString(),
    };
  });
}

/**
 * Thực thi toàn bộ chu trình đồng bộ BI → HRP (Catalog + Worker Episodes nhiều trang).
 * Tuân thủ chặt 4 nguyên tắc T0 BI & T0 HRP:
 * 1. Chỉ skip theo `sync_version <= last_sync_version`.
 * 2. Opaque `pageCursor` & `checkpoint`; chỉ lưu `checkpoint` mới khi `hasMore === false`.
 * 3. Tombstone idempotent giữ nguyên lịch sử công/hồ sơ.
 * 4. Tọa độ dự án đọc từ Catalog, không tự suy đoán khi `location = null`.
 */
export async function runBiWorkerSync(
  options: RunBiWorkerSyncOptions,
): Promise<BiWorkerSyncRunSummary> {
  if (activeSyncInProcess) {
    throw new BiSyncConflictError();
  }
  activeSyncInProcess = true;

  const {
    prisma,
    triggerSource,
    mode = 'INCREMENTAL',
    fetchImpl = fetch,
    connectionOverride,
  } = options;
  const startedAt = new Date();

  try {
    // Bước 1: Đọc cấu hình kết nối & checkpoint hiện tại, tạo dòng BiSyncRun RUNNING
    const boot = await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
      const storedCred = await tx.biSyncCredential.findUnique({
        where: { id: 'primary' },
      });

      const baseUrl = normalizeBiApiBaseUrl(
        connectionOverride?.baseUrl ??
          storedCred?.baseUrl ??
          process.env.BI_HRP_SYNC_BASE_URL ??
          DEFAULT_BI_SYNC_BASE_URL,
      );
      const apiKey =
        connectionOverride?.apiKey?.trim() ||
        (storedCred?.apiKeyCiphertext ? decryptBiSyncSecret(storedCred.apiKeyCiphertext) : '') ||
        process.env.BI_HRP_SYNC_API_KEY?.trim() ||
        '';

      if (!apiKey) {
        throw new BiSyncConfigurationError();
      }

      const checkpointBefore =
        mode === 'FULL_RESYNC' ? null : (storedCred?.workerSyncCheckpoint ?? null);

      const run = await tx.biSyncRun.create({
        data: {
          triggerSource,
          mode,
          status: 'RUNNING',
          checkpointBefore,
          startedAt,
        },
        select: { id: true },
      });

      return {
        runId: run.id,
        baseUrl,
        apiKey,
        checkpointBefore,
        hadStoredCredential: Boolean(storedCred),
      };
    });

    const connConfig: BiSyncConnectionConfig = {
      baseUrl: boot.baseUrl,
      apiKey: boot.apiKey,
      timeoutMs: connectionOverride?.timeoutMs,
      maxRetries: connectionOverride?.maxRetries,
    };

    let catalogProjectsSynced = 0;
    let episodesFetched = 0;
    let episodesApplied = 0;
    let episodesSkipped = 0;
    let tombstonesProcessed = 0;
    let exceptionsOpened = 0;
    let checkpointAfter: string | null = boot.checkpointBefore;

    try {
      // Bước 2: Đồng bộ `/v1/catalog`
      const catalog = await fetchBiCatalog(connConfig, fetchImpl);
      await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
        for (const project of catalog.projects) {
          const synced = await syncBiCatalogProjectInTx(tx, project);
          catalogProjectsSynced += 1;
          if (synced.locationExceptionOpened) {
            exceptionsOpened += 1;
          }
        }
      });

      // Bước 3: Duyệt phân trang `/v1/worker-episodes` bằng opaque checkpoint / pageCursor
      let pageIndex = 0;
      let nextPageCursor: string | null = null;
      let latestPageCheckpoint: string | null = boot.checkpointBefore;

      while (pageIndex < MAX_EPISODE_PAGES) {
        const page = await fetchBiWorkerEpisodesPage(
          connConfig,
          pageIndex === 0
            ? { checkpoint: boot.checkpointBefore, limit: 500 }
            : { pageCursor: nextPageCursor, limit: 500 },
          fetchImpl,
        );

        episodesFetched += page.items.length;
        if (page.checkpoint) {
          latestPageCheckpoint = page.checkpoint;
        }

        await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
          for (const item of page.items) {
            const res = await applyBiWorkerEpisodeInTx(tx, item);
            exceptionsOpened += res.exceptionsOpenedDelta;
            if (res.outcome === 'SKIPPED_BY_VERSION') {
              episodesSkipped += 1;
            } else if (res.outcome === 'TOMBSTONE_APPLIED') {
              tombstonesProcessed += 1;
              episodesApplied += 1;
            } else if (res.outcome === 'APPLIED') {
              episodesApplied += 1;
            }
          }
        });

        pageIndex += 1;

        if (!page.hasMore) {
          checkpointAfter = latestPageCheckpoint;
          break;
        }

        if (!page.nextPageCursor) {
          throw new Error(
            'BI worker-episodes response returned hasMore=true without nextPageCursor',
          );
        }
        nextPageCursor = page.nextPageCursor;
      }

      // Quy tắc #2: Chỉ lưu checkpoint mới vào DB sau khi toàn bộ các trang đã hoàn tất!
      const finishedAt = new Date();
      const finalStatus: 'SUCCEEDED' | 'PARTIAL_WITH_EXCEPTIONS' =
        exceptionsOpened > 0 ? 'PARTIAL_WITH_EXCEPTIONS' : 'SUCCEEDED';

      await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
        if (checkpointAfter) {
          const existingCred = await tx.biSyncCredential.findUnique({
            where: { id: 'primary' },
          });
          if (existingCred) {
            await tx.biSyncCredential.update({
              where: { id: 'primary' },
              data: { workerSyncCheckpoint: checkpointAfter },
            });
          } else {
            await tx.biSyncCredential.create({
              data: {
                id: 'primary',
                baseUrl: boot.baseUrl,
                apiKeyCiphertext: encryptBiSyncSecret(boot.apiKey),
                workerSyncCheckpoint: checkpointAfter,
              },
            });
          }
        }

        await tx.biSyncRun.update({
          where: { id: boot.runId },
          data: {
            status: finalStatus,
            checkpointAfter,
            catalogProjectsSynced,
            episodesFetched,
            episodesApplied,
            episodesSkipped,
            tombstonesProcessed,
            exceptionsOpened,
            finishedAt,
          },
        });
      });

      return {
        runId: boot.runId,
        triggerSource,
        mode,
        status: finalStatus,
        checkpointBefore: boot.checkpointBefore,
        checkpointAfter,
        catalogProjectsSynced,
        episodesFetched,
        episodesApplied,
        episodesSkipped,
        tombstonesProcessed,
        exceptionsOpened,
        errorCode: null,
        errorMessage: null,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      };
    } catch (syncErr) {
      // Nếu lỗi ở bất kỳ trang nào: giữ nguyên worker_sync_checkpoint cũ (không cập nhật)!
      const finishedAt = new Date();
      const errorCode =
        typeof syncErr === 'object' && syncErr !== null && 'errorCode' in syncErr
          ? String((syncErr as { errorCode: unknown }).errorCode)
          : 'BI_SYNC_FAILED';
      const errorMessage =
        syncErr instanceof Error ? syncErr.message.slice(0, 500) : 'Lỗi đồng bộ BI không xác định';

      await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
        await tx.biSyncRun.update({
          where: { id: boot.runId },
          data: {
            status: 'FAILED',
            checkpointAfter: boot.checkpointBefore,
            catalogProjectsSynced,
            episodesFetched,
            episodesApplied,
            episodesSkipped,
            tombstonesProcessed,
            exceptionsOpened,
            errorCode,
            errorMessage,
            finishedAt,
          },
        });
      });

      return {
        runId: boot.runId,
        triggerSource,
        mode,
        status: 'FAILED',
        checkpointBefore: boot.checkpointBefore,
        checkpointAfter: boot.checkpointBefore,
        catalogProjectsSynced,
        episodesFetched,
        episodesApplied,
        episodesSkipped,
        tombstonesProcessed,
        exceptionsOpened,
        errorCode,
        errorMessage,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      };
    }
  } finally {
    activeSyncInProcess = false;
  }
}
