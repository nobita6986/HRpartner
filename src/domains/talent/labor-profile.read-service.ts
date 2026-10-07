import { Prisma } from '@prisma/client';
import { AuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions, AuthError } from '@/src/shared/auth/permission-resolver';
import { maskCccd, maskPhone } from '@/src/shared/privacy/mask';
import { normalizePhone } from '@/src/domains/talent/normalize';
import { laborProfileIntakeChannelLabel } from '@/src/domains/labor-profile/labor-profile-ui';

export interface LaborProfileListFilter {
  search?: string;
  exactPhone?: string;
  completeness?: string;
  identityVerification?: string;
  view?: 'INCOMPLETE' | 'UNVERIFIED' | 'NEVER_WORKED' | 'WORKING' | 'TERMINATED' | 'COMPANY_POOL';
  skip?: number;
  take?: number;
  /**
   * DEC-P2-01 — `/admin/labor-profiles` mặc định chỉ liệt kê intake candidates
   * (chưa liên kết Worker, `workerId: null`). Hồ sơ đã chuyển đổi thuộc về
   * `/admin/workers` và KHÔNG xuất hiện lại ở intake list.
   *
   * Callers hợp lệ duy nhất để truyền `includeLinked: true` là những nơi cần
   * đọc cả row đã linked (vd: PATCH route cần guard 409 trước khi UPDATE).
   * Default: false.
   */
  includeLinked?: boolean;
}

export interface LaborProfileListDto {
  id: string;
  fullName: string | null;
  phone: string | null;
  identityVerification: string;
  completeness: string;
  createdAt: string;
  workerId: string | null;
}

/**
 * DEC-T1B-OPS-10 — LaborProfile list DTO mở rộng cho `/admin/labor-profiles`.
 *
 * Canonical data sources:
 *   - `latestJob` = `CandidateSubmission` (theo `laborProfileId=X` hoặc
 *     `workerId=profile.workerId`) ORDER BY createdAt DESC LIMIT 1.
 *   - `applicationCount` = `COUNT(CandidateSubmission)` lọc tương tự.
 *   - `handler` = `LaborProfileHandlingAssignment WHERE status='ACTIVE'` →
 *     `assigneeUser.name` (bỏ qua `TRANSFERRED`/`REVOKED`/`EXPIRED`).
 *   - `intakeSource` = `LaborProfileIntake` ORDER BY createdAt DESC LIMIT 1
 *     → `channel` mapped qua `laborProfileIntakeChannelLabel`.
 *   - `currentStatus` = `{ identityVerification, completeness }` — đã có
 *     sẵn trên LaborProfile (mirror field).
 *   - `intakeDate` = `LaborProfile.createdAt` (ISO) — là cast một bản ghi
 *     intake; vì intake createdAt không ổn định giữa các source channels,
 *     dùng `LaborProfile.createdAt` làm canonical.
 */
export interface LaborProfileListEnrichedDto {
  id: string;
  fullName: string | null;
  phone: string | null;
  identityVerification: string;
  completeness: string;
  createdAt: string;
  workerId: string | null;
  // DEC-T1B-OPS-10 enriched
  latestJob: { id: string; code: string | null; name: string | null } | null;
  applicationCount: number;
  handler: string | null;
  intakeSource: string | null;
  intakeDate: string | null;
}

export interface LaborProfileListResponse {
  items: LaborProfileListEnrichedDto[];
  total: number;
}

export async function getLaborProfilesList(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: LaborProfileListFilter = {},
): Promise<LaborProfileListResponse> {
  const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const canSeeSensitive = permissions.has('CAN_VIEW_WORKER_SENSITIVE');

  const where: Prisma.LaborProfileWhereInput = {};

  // DEC-P2-01: mặc định loại bỏ hồ sơ đã chuyển thành Worker khỏi intake list.
  // Hồ sơ linked vẫn tồn tại và truy cập được qua deep-link `/admin/labor-profiles/[id]`,
  // nhưng không nằm trong danh sách `/admin/labor-profiles` mặc định.
  if (filter.includeLinked !== true) {
    where.workerId = null;
  }

  if (filter.search) {
    const searchOr: Prisma.LaborProfileWhereInput[] = [
      { fullName: { contains: filter.search, mode: 'insensitive' } },
      { phone: { contains: filter.search } },
    ];
    if (canSeeSensitive) {
      searchOr.push({ cccdNumber: { contains: filter.search } });
    }
    where.OR = searchOr;
  }
  
  if (filter.exactPhone) {
    if (!canSeeSensitive) {
      throw new AuthError('PERMISSION_DENIED', 'Cannot use exact lookup without sensitive permission');
    }
    const normalized = normalizePhone(filter.exactPhone);
    if (normalized) {
      where.phone = normalized;
    } else {
      where.phone = filter.exactPhone;
    }
  }
  
  if (filter.completeness) {
    where.completeness = filter.completeness;
  }
  
  if (filter.identityVerification) {
    where.identityVerification = filter.identityVerification;
  }

  if (filter.view) {
    switch (filter.view) {
      case 'INCOMPLETE':
        where.completeness = 'MINIMAL';
        break;
      case 'UNVERIFIED':
        where.identityVerification = 'UNVERIFIED';
        break;
      case 'NEVER_WORKED':
        where.episodes = { none: {} };
        break;
      case 'WORKING':
        where.episodes = { some: { status: 'ACTIVE' } };
        break;
      case 'TERMINATED':
        where.AND = [
          { episodes: { none: { status: 'ACTIVE' } } },
          { episodes: { some: { status: 'ENDED' } } }
        ];
        break;
      case 'COMPANY_POOL':
        where.AND = [
          {
            OR: [
              { handlingAssignments: { none: { status: 'ACTIVE' } } },
              { handlingAssignments: { some: { status: 'ACTIVE', expiresAt: { lt: new Date() } } } }
            ]
          }
        ];
        break;
    }
  }

  const [total, items] = await Promise.all([
    tx.laborProfile.count({ where }),
    tx.laborProfile.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phone: true,
        identityVerification: true,
        completeness: true,
        createdAt: true,
        workerId: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: filter.skip || 0,
      take: filter.take || 20,
    }),
  ]);

  // T1B-OPS: enrich per-profile (latestJob, applicationCount, handler,
  // intakeSource). Batched query cho tất cả profile IDs → không loop per row.
  const profileIds = items.map((it) => it.id);
  const workerIds = items.map((it) => it.workerId).filter((id): id is string => id !== null);

  const [submissions, latestSubsByProfile, handlersByProfile, intakesByProfile] =
    profileIds.length === 0
      ? [[], new Map<string, { id: string; projectId: string | null; project: { id: string; code: string; name: string } | null; createdAt: Date }>(), new Map<string, string>(), new Map<string, { channel: string; createdAt: Date }>()]
      : await Promise.all([
          // T1B-OPS: total count of submissions per profile (via laborProfileId OR workerId).
          tx.candidateSubmission.findMany({
            where: {
              OR: [
                { laborProfileId: { in: profileIds } },
                ...(workerIds.length > 0 ? [{ workerId: { in: workerIds } }] : []),
              ],
            },
            select: {
              id: true,
              laborProfileId: true,
              workerId: true,
              projectId: true,
              project: { select: { id: true, code: true, name: true } },
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          // T1B-OPS: empty placeholder; populate below
          Promise.resolve(new Map<string, { id: string; projectId: string | null; project: { id: string; code: string; name: string } | null; createdAt: Date }>()),
          // T1B-OPS: ACTIVE handler per profile
          tx.laborProfileHandlingAssignment.findMany({
            where: {
              laborProfileId: { in: profileIds },
              status: 'ACTIVE',
            },
            select: {
              laborProfileId: true,
              assigneeUser: { select: { name: true } },
            },
          }),
          // T1B-OPS: most recent intake per profile
          tx.laborProfileIntake.findMany({
            where: { laborProfileId: { in: profileIds } },
            orderBy: { createdAt: 'desc' },
            select: { laborProfileId: true, channel: true, createdAt: true },
          }),
        ]);

  // T1B-OPS: build latest-submission index (per profile, latest by createdAt).
  const latestMap = new Map<string, { id: string; projectId: string | null; project: { id: string; code: string; name: string } | null; createdAt: Date }>();
  for (const sub of submissions as Array<{
    id: string;
    laborProfileId: string | null;
    workerId: string | null;
    projectId: string | null;
    project: { id: string; code: string; name: string } | null;
    createdAt: Date;
  }>) {
    const pid = sub.laborProfileId;
    if (!pid) continue;
    const prev = latestMap.get(pid);
    if (!prev || sub.createdAt > prev.createdAt) {
      latestMap.set(pid, sub);
    }
  }

  // T1B-OPS: count submissions per profile (across both laborProfileId and workerId links).
  const countByProfile = new Map<string, number>();
  for (const sub of submissions as Array<{ laborProfileId: string | null; workerId: string | null }>) {
    if (sub.laborProfileId) {
      countByProfile.set(sub.laborProfileId, (countByProfile.get(sub.laborProfileId) ?? 0) + 1);
    }
    if (sub.workerId) {
      // Map workerId → profileId for count too.
      const profile = items.find((it) => it.workerId === sub.workerId);
      if (profile) {
        countByProfile.set(profile.id, (countByProfile.get(profile.id) ?? 0) + 1);
      }
    }
  }

  const handlerByProfile = new Map<string, string>();
  for (const h of handlersByProfile as Array<{ laborProfileId: string; assigneeUser: { name: string | null } | null }>) {
    if (h.assigneeUser?.name) {
      handlerByProfile.set(h.laborProfileId, h.assigneeUser.name);
    }
  }

  const intakeByProfile = new Map<string, { channel: string; createdAt: Date }>();
  for (const i of intakesByProfile as Array<{ laborProfileId: string; channel: string; createdAt: Date }>) {
    if (!intakeByProfile.has(i.laborProfileId)) {
      intakeByProfile.set(i.laborProfileId, { channel: i.channel, createdAt: i.createdAt });
    }
  }

  return {
    items: items.map((item) => {
      const latest = latestMap.get(item.id);
      const intake = intakeByProfile.get(item.id);
      const intakeSource = intake
        ? laborProfileIntakeChannelLabel(intake.channel)
        : null;
      return {
        ...item,
        phone: canSeeSensitive ? item.phone : (item.phone ? maskPhone(item.phone) : null),
        createdAt: item.createdAt.toISOString(),
        latestJob: latest
          ? {
              id: latest.id,
              code: latest.project?.code ?? null,
              name: latest.project?.name ?? null,
            }
          : null,
        applicationCount: countByProfile.get(item.id) ?? 0,
        handler: handlerByProfile.get(item.id) ?? null,
        intakeSource,
        intakeDate: intake ? intake.createdAt.toISOString() : item.createdAt.toISOString(),
      };
    }),
    total,
  };
}

export interface LaborProfileDetailDto {
  id: string;
  fullName: string | null;
  phone: string | null;
  cccdNumber: string | null;
  identityVerification: string;
  completeness: string;
  consentAt: string | null;
  createdAt: string;
  updatedAt: string;
  workerId: string | null;
  
  intakes: {
    id: string;
    channel: string;
    createdAt: string;
  }[];
  
  submissions: {
    id: string;
    createdAt: string;
  }[];
  
  episodes: {
    id: string;
    status: string;
  }[];
  
  placementCases: {
    id: string;
    status: string;
  }[];
  
  activeHandlingAssignment: {
    id: string;
    assigneeUserId: string;
    assigneeName: string | null;
    source: string;
    startsAt: string;
    expiresAt: string | null;
  } | null;
}

export async function getLaborProfileDetail(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
): Promise<LaborProfileDetailDto | null> {
  const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const canSeeSensitive = permissions.has('CAN_VIEW_WORKER_SENSITIVE');

  const profile = await tx.laborProfile.findUnique({
    where: { id },
    include: {
      intakes: {
        select: {
          id: true,
          channel: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      submissions: {
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      episodes: {
        select: {
          id: true,
          status: true,
        }
      },
      placementCases: {
        select: {
          id: true,
          status: true,
        }
      },
      handlingAssignments: {
        where: { status: 'ACTIVE' },
        include: { assigneeUser: { select: { name: true } } },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const activeAssignment = profile.handlingAssignments?.[0];

  return {
    ...profile,
    phone: canSeeSensitive ? profile.phone : (profile.phone ? maskPhone(profile.phone) : null),
    cccdNumber: canSeeSensitive ? profile.cccdNumber : (profile.cccdNumber ? maskCccd(profile.cccdNumber) : null),
    consentAt: profile.consentAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    intakes: profile.intakes.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })),
    submissions: profile.submissions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
    activeHandlingAssignment: activeAssignment ? {
      id: activeAssignment.id,
      assigneeUserId: activeAssignment.assigneeUserId,
      assigneeName: activeAssignment.assigneeUser?.name ?? null,
      source: activeAssignment.source,
      startsAt: activeAssignment.startsAt.toISOString(),
      expiresAt: activeAssignment.expiresAt?.toISOString() ?? null,
    } : null,
  };
}
