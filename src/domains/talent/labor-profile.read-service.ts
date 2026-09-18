import { Prisma } from '@prisma/client';
import { AuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { maskCccd, maskPhone } from '@/src/shared/privacy/mask';

export interface LaborProfileListFilter {
  search?: string;
  completeness?: string;
  identityVerification?: string;
  view?: 'MY_PROFILES' | 'EXPIRING_SOON' | 'COMMON_POOL' | 'INCOMPLETE' | 'UNVERIFIED' | 'NEVER_WORKED' | 'WORKING' | 'TERMINATED';
  skip?: number;
  take?: number;
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

export interface LaborProfileListResponse {
  items: LaborProfileListDto[];
  total: number;
}

export async function getLaborProfilesList(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  filter: LaborProfileListFilter = {},
): Promise<LaborProfileListResponse> {
  const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const canSeeSensitive = ctx.role === 'ADMIN' || permissions.has('CAN_VIEW_WORKER_SENSITIVE');

  const where: Prisma.LaborProfileWhereInput = {};
  
  if (filter.search) {
    where.OR = [
      { fullName: { contains: filter.search, mode: 'insensitive' } },
      { phone: { contains: filter.search } },
      { cccdNumber: { contains: filter.search } },
    ];
  }
  
  if (filter.completeness) {
    where.completeness = filter.completeness;
  }
  
  if (filter.identityVerification) {
    where.identityVerification = filter.identityVerification;
  }

  if (filter.view) {
    switch (filter.view) {
      case 'MY_PROFILES':
        where.intakes = { some: { capturedByUserId: ctx.userId } }; // proxy for N2 handler
        break;
      case 'COMMON_POOL':
        where.NOT = { intakes: { some: { capturedByUserId: ctx.userId } } }; // proxy for N2 pool
        break;
      case 'EXPIRING_SOON':
        // proxy: consentAt > 5 months ago, soon reaching 6 months
        where.consentAt = { lt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000) };
        break;
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
        where.episodes = { some: { status: 'ENDED' } }; // Or any non-active status
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

  return {
    items: items.map(item => ({
      ...item,
      phone: canSeeSensitive ? item.phone : (item.phone ? maskPhone(item.phone) : null),
      createdAt: item.createdAt.toISOString(),
    })),
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
}

export async function getLaborProfileDetail(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
): Promise<LaborProfileDetailDto | null> {
  const permissions = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const canSeeSensitive = ctx.role === 'ADMIN' || permissions.has('CAN_VIEW_WORKER_SENSITIVE');

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
    },
  });

  if (!profile) {
    return null;
  }

  return {
    ...profile,
    phone: canSeeSensitive ? profile.phone : (profile.phone ? maskPhone(profile.phone) : null),
    cccdNumber: canSeeSensitive ? profile.cccdNumber : (profile.cccdNumber ? maskCccd(profile.cccdNumber) : null),
    consentAt: profile.consentAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    intakes: profile.intakes.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })),
    submissions: profile.submissions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
  };
}
