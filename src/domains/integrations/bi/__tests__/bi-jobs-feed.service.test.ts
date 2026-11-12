import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { syncBiJobsPublicFeed } from '../bi-jobs-feed.service';
import type { RecruitmentPostPublicFeedV1 } from '../bi-jobs-feed-contract';

const BASE_FEED: RecruitmentPostPublicFeedV1 = {
  schema_version: 1,
  jobs: [
    {
      id: '78bf806c-c3a9-4e14-a578-3eb69de5b20d',
      brief_id: '78bf806c-c3a9-4e14-a578-3eb69de5b20d',
      version: 1,
      published_at: '2026-11-11T10:00:00.000Z',
      updated_at: '2026-11-11T10:00:00.000Z',
      location: {
        province_code: 'VINH_PHUC',
        province_name: 'Vĩnh Phúc',
        industrial_park_code: 'VP_BA_THIEN_1',
        industrial_park_name: 'KCN Bá Thiện 1',
      },
      general: {
        customer_name: 'Công Ty TNHH In Điện Tử Minh Đức',
        investment_origin: 'Trung Quốc',
        manufacturing_industry: 'In ấn linh kiện điện tử',
        job_description: 'Kiểm tra ngoại quan, đóng gói sản phẩm',
        environment_types: ['CLEAN_ROOM'],
        work_postures: ['SITTING'],
        shift_pattern: 'TWO_SHIFTS',
        shift_details: '08:00 - 20:00',
        labor_types: [{ labor_type_key: 'TEMPORARY', display_name: 'Thời vụ' }],
        supply_schedule_text: 'Tuyển liên tục',
        expected_headcount: 100,
      },
      candidate: {
        age_min: 18,
        age_max: 40,
        gender_requirement: 'ANY',
        gender_label: 'Nam/Nữ',
        education_requirement: 'NONE',
        experience_required: false,
        experience_details: null,
        accept_former_customer_workers: true,
        entry_assessment_text: null,
        other_requirements_text: null,
      },
      compensation: {
        base_salary_vnd: '5000000',
        base_salary_conditions: null,
        attendance_bonus_vnd: null,
        attendance_bonus_conditions: null,
        living_allowance_vnd: null,
        living_allowance_conditions: null,
        seniority_allowance_vnd: null,
        seniority_allowance_conditions: null,
        eyesight_allowance_vnd: null,
        eyesight_allowance_conditions: null,
        other_allowance_text: null,
        average_income_min_vnd: '9000000',
        average_income_max_vnd: '11000000',
        salary_payment_schedule: null,
        salary_advance_available: false,
        salary_advance_amount_vnd: null,
        salary_advance_schedule: null,
        weekly_salary_available: false,
        weekly_salary_payment_schedule: null,
        day_shift_8h_vnd: null,
        day_shift_11h_vnd: '350000',
        night_shift_8h_vnd: null,
        night_shift_11h_vnd: '390000',
        sunday_day_11h_vnd: null,
        sunday_night_11h_vnd: null,
        holiday_day_11h_vnd: null,
        holiday_night_11h_vnd: null,
        ppe_provided: true,
        ppe_details: null,
        other_benefits: null,
      },
      documents: {
        require_original_cccd_and_copy: true,
        require_certified_resume: false,
        require_health_certificate_within_6_months: false,
        require_photo_3x4: false,
        require_degree_or_certificate: false,
        require_social_insurance_book: false,
        require_other_documents: false,
        other_documents_text: null,
      },
    },
  ],
};

function createInMemoryPrismaMock(lockAvailable = true) {
  const companies = new Map<string, { id: string; code: string; name: string; status: string; industry: string | null }>();
  const projects = new Map<
    string,
    {
      id: string;
      code: string;
      clientCompanyId: string;
      clientCompanyName: string | null;
      name: string;
      siteAddress: string | null;
      status: string;
      isPublic: boolean;
    }
  >();
  const orders = new Map<
    string,
    {
      id: string;
      code: string;
      projectId: string;
      title: string;
      description: string | null;
      status: string;
      slotId: string | null;
      openingId: string | null;
    }
  >();
  const slots = new Map<
    string,
    {
      id: string;
      staffingOrderId: string;
      jobOpeningId: string | null;
      positionCode: string;
      positionTitle: string;
      slotsNeeded: number;
      slotsFilled: number;
      hourlyRateVnd: bigint | null;
      shiftStart: string | null;
      shiftEnd: string | null;
      workLocation: string | null;
      createdAt: Date;
    }
  >();
  const openings = new Map<
    string,
    {
      id: string;
      staffingOrderId: string;
      staffingOrderSlotId: string | null;
      status: string;
      openedAt: Date | null;
      closedAt: Date | null;
      serviceModel: string | null;
      createdAt: Date;
      postingId: string | null;
    }
  >();
  const postings = new Map<
    string,
    {
      id: string;
      jobOpeningId: string;
      slug: string;
      revision: number;
      status: string;
      publishedAt: Date | null;
      archivedAt: Date | null;
      title: string | null;
      salaryDisplay: string | null;
      isHot: boolean;
      isUrgent: boolean;
      isHighReward: boolean;
      isExpiringSoon: boolean;
    }
  >();

  let seq = 1;
  const nextId = (prefix: string) => `${prefix}-${seq++}`;

  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([{ locked: lockAvailable }]),
    clientCompany: {
      findFirst: vi.fn(async () => {
        const first = [...companies.values()][0] ?? null;
        return first;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = companies.get(where.id)!;
        const updated = { ...cur, ...data };
        companies.set(where.id, updated);
        return updated;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = nextId('cc');
        const rec = {
          id,
          code: String(data.code),
          name: String(data.name),
          status: String(data.status ?? 'ACTIVE'),
          industry: (data.industry as string | null) ?? null,
        };
        companies.set(id, rec);
        return rec;
      }),
    },
    project: {
      findFirst: vi.fn(async () => {
        const first = [...projects.values()][0] ?? null;
        return first;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = projects.get(where.id)!;
        const updated = { ...cur, ...data };
        projects.set(where.id, updated);
        return updated;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = nextId('prj');
        const rec = {
          id,
          code: String(data.code),
          clientCompanyId: String(data.clientCompanyId),
          clientCompanyName: (data.clientCompanyName as string | null) ?? null,
          name: String(data.name),
          siteAddress: (data.siteAddress as string | null) ?? null,
          status: String(data.status ?? 'ACTIVE'),
          isPublic: Boolean(data.isPublic),
        };
        projects.set(id, rec);
        return rec;
      }),
    },
    staffingOrder: {
      findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
        const found = [...orders.values()].find((o) => o.code === where.code);
        if (!found) return null;
        const slot = found.slotId ? slots.get(found.slotId) ?? null : null;
        const opening = found.openingId ? openings.get(found.openingId) ?? null : null;
        const posting = opening?.postingId ? postings.get(opening.postingId) ?? null : null;
        return {
          ...found,
          slots: slot ? [slot] : [],
          jobOpenings: opening ? [{ ...opening, posting }] : [],
        };
      }),
      findMany: vi.fn(async () => {
        return [...orders.values()].map((o) => {
          const opening = o.openingId ? openings.get(o.openingId) ?? null : null;
          const posting = opening?.postingId ? postings.get(opening.postingId) ?? null : null;
          return {
            id: o.id,
            code: o.code,
            status: o.status,
            jobOpenings: opening ? [{ id: opening.id, status: opening.status, posting }] : [],
          };
        });
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = nextId('so');
        const rec = {
          id,
          code: String(data.code),
          projectId: String(data.projectId),
          title: String(data.title),
          description: (data.description as string | null) ?? null,
          status: String(data.status ?? 'OPEN'),
          slotId: null,
          openingId: null,
        };
        orders.set(id, rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = orders.get(where.id)!;
        const updated = { ...cur, ...data };
        orders.set(where.id, updated);
        return updated;
      }),
    },
    staffingOrderSlot: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = nextId('slot');
        const rec = {
          id,
          staffingOrderId: String(data.staffingOrderId),
          jobOpeningId: null,
          positionCode: String(data.positionCode),
          positionTitle: String(data.positionTitle),
          slotsNeeded: Number(data.slotsNeeded),
          slotsFilled: Number(data.slotsFilled ?? 0),
          hourlyRateVnd: (data.hourlyRateVnd as bigint | null) ?? null,
          shiftStart: (data.shiftStart as string | null) ?? null,
          shiftEnd: (data.shiftEnd as string | null) ?? null,
          workLocation: (data.workLocation as string | null) ?? null,
          createdAt: new Date(),
        };
        slots.set(id, rec);
        const order = orders.get(rec.staffingOrderId)!;
        order.slotId = id;
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = slots.get(where.id)!;
        const updated = { ...cur, ...data };
        slots.set(where.id, updated);
        return updated;
      }),
    },
    jobOpening: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = nextId('open');
        const rec = {
          id,
          staffingOrderId: String(data.staffingOrderId),
          staffingOrderSlotId: (data.staffingOrderSlotId as string | null) ?? null,
          status: String(data.status ?? 'OPEN'),
          openedAt: (data.openedAt as Date | null) ?? new Date(),
          closedAt: null,
          serviceModel: (data.serviceModel as string | null) ?? 'STAFFING_SUPPLY',
          createdAt: new Date(),
          postingId: null,
        };
        openings.set(id, rec);
        const order = orders.get(rec.staffingOrderId)!;
        order.openingId = id;
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = openings.get(where.id)!;
        const updated = { ...cur, ...data };
        openings.set(where.id, updated);
        return updated;
      }),
    },
    jobPosting: {
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) => {
        return [...postings.values()].find((p) => p.slug === where.slug) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = nextId('post');
        const rec = {
          id,
          jobOpeningId: String(data.jobOpeningId),
          slug: String(data.slug),
          revision: Number(data.revision ?? 1),
          status: String(data.status ?? 'PUBLISHED'),
          publishedAt: (data.publishedAt as Date | null) ?? new Date(),
          archivedAt: null,
          title: (data.title as string | null) ?? null,
          salaryDisplay: (data.salaryDisplay as string | null) ?? null,
          isHot: Boolean(data.isHot),
          isUrgent: Boolean(data.isUrgent),
          isHighReward: Boolean(data.isHighReward),
          isExpiringSoon: Boolean(data.isExpiringSoon),
        };
        postings.set(id, rec);
        const opening = openings.get(rec.jobOpeningId)!;
        opening.postingId = id;
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = postings.get(where.id)!;
        const updated = { ...cur, ...data };
        postings.set(where.id, updated);
        return updated;
      }),
    },
    payrollConfig: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (cb: (txClient: unknown) => Promise<unknown>) => cb(tx)),
  } as unknown as PrismaClient;

  return { prisma, postings, openings, orders, projects };
}

describe('syncBiJobsPublicFeed service lifecycle (AC-02)', () => {
  it('creates full chain on first sync, skips unchanged version, updates on version bump, and archives withdrawn jobs', async () => {
    const { prisma, postings, orders, projects } = createInMemoryPrismaMock(true);

    // 1. Initial sync -> created = 1
    const res1 = await syncBiJobsPublicFeed(prisma, {
      prefetchedFeed: BASE_FEED,
    });
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.created).toBe(1);
      expect(res1.updated).toBe(0);
      expect(res1.unchanged).toBe(0);
      expect(res1.archived).toBe(0);
    }
    expect(projects.size).toBe(1);
    expect(postings.size).toBe(1);
    expect([...postings.values()][0].status).toBe('PUBLISHED');

    // 2. Second sync with identical version -> unchanged = 1
    const res2 = await syncBiJobsPublicFeed(prisma, {
      prefetchedFeed: BASE_FEED,
    });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.created).toBe(0);
      expect(res2.updated).toBe(0);
      expect(res2.unchanged).toBe(1);
      expect(res2.archived).toBe(0);
    }

    // 3. Version bump (version = 2) -> updated = 1
    const bumpedFeed: RecruitmentPostPublicFeedV1 = {
      schema_version: 1,
      jobs: [{ ...BASE_FEED.jobs[0], version: 2 }],
    };
    const res3 = await syncBiJobsPublicFeed(prisma, {
      prefetchedFeed: bumpedFeed,
    });
    expect(res3.ok).toBe(true);
    if (res3.ok) {
      expect(res3.created).toBe(0);
      expect(res3.updated).toBe(1);
      expect(res3.unchanged).toBe(0);
      expect(res3.archived).toBe(0);
    }
    expect([...postings.values()][0].revision).toBe(2);

    // 4. Job withdrawn from feed (empty jobs[]) -> archived = 1
    const emptyFeed: RecruitmentPostPublicFeedV1 = {
      schema_version: 1,
      jobs: [],
    };
    const res4 = await syncBiJobsPublicFeed(prisma, {
      prefetchedFeed: emptyFeed,
    });
    expect(res4.ok).toBe(true);
    if (res4.ok) {
      expect(res4.archived).toBe(1);
    }
    expect([...postings.values()][0].status).toBe('ARCHIVED');
    expect([...orders.values()][0].status).toBe('CLOSED');
  });

  it('returns SYNC_ALREADY_RUNNING when advisory lock is held by another worker', async () => {
    const { prisma } = createInMemoryPrismaMock(false);
    const res = await syncBiJobsPublicFeed(prisma, {
      prefetchedFeed: BASE_FEED,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('SYNC_ALREADY_RUNNING');
    }
  });
});
