import { Prisma } from '@prisma/client';

export interface LaborProfileListFilter {
  search?: string;
  completeness?: string;
  identityVerification?: string;
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
  filter: LaborProfileListFilter = {},
): Promise<LaborProfileListResponse> {
  const where: Prisma.LaborProfileWhereInput = {};
  
  if (filter.search) {
    where.OR = [
      { fullName: { contains: filter.search, mode: 'insensitive' } },
      { phone: { contains: filter.search } },
    ];
  }
  
  if (filter.completeness) {
    where.completeness = filter.completeness;
  }
  
  if (filter.identityVerification) {
    where.identityVerification = filter.identityVerification;
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
  }[];
  
  placementCases: {
    id: string;
    status: string;
  }[];
}

export async function getLaborProfileDetail(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<LaborProfileDetailDto | null> {
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
    consentAt: profile.consentAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    intakes: profile.intakes.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })),
    submissions: profile.submissions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
  };
}
