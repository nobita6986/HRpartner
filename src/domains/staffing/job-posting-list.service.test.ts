/**
 * job-posting-list.service.test.ts — AV2 JobPosting editor shell (read-only).
 *
 * Unit test cho `listJobPostingsForAdmin` + `getJobPostingForAdmin` +
 * `clampPositiveInt`. Mục tiêu: bảo đảm service đọc đúng field, sort, phân
 * trang, ánh xạ Date, VÀ đồng bộ ranh giới quyền theo Phase 2 RLS.
 *
 * Phạm vi test:
 *  - `clampPositiveInt`: NaN/null/undefined/-10/0/1.5/1.999/MAX+1 → default/cap.
 *  - `listJobPostingsForAdmin`: default take/skip, status filter, Date serialize,
 *    orphan row, Prisma throw bubble-up, take/skip clamp edge cases.
 *  - `getJobPostingForAdmin`: id empty/null guard, not-found, Date mapping,
 *    orphan (jobOpening null), Prisma throw bubble-up.
 *
 * KHÔNG test: RLS filtering ở DB level — đó là integration test chạy trên
 * test DB có policy + GUC. Service chỉ chịu trách nhiệm đọc DTO đúng và
 * không leak field; ranh giới quyền thực tế do RLS Phase 2 enforce ở DB.
 * Service không có cách nào bypass `applyRlsContext` — caller phải wrap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  listJobPostingsForAdmin,
  getJobPostingForAdmin,
  clampPositiveInt,
} from './job-posting-list.service';

type MockTx = {
  jobPosting: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function makeMockTx(opts: {
  rows?: any[];
  total?: number;
  uniqueRow?: any | null;
  uniqueError?: Error;
  listError?: Error;
}): MockTx {
  const findMany = vi.fn();
  if (opts.listError) {
    findMany.mockRejectedValue(opts.listError);
  } else {
    findMany.mockResolvedValue(opts.rows ?? []);
  }
  const count = vi.fn();
  count.mockResolvedValue(opts.total ?? (opts.rows ?? []).length);
  const findUnique = vi.fn();
  if (opts.uniqueError) {
    findUnique.mockRejectedValue(opts.uniqueError);
  } else {
    findUnique.mockResolvedValue(opts.uniqueRow ?? null);
  }
  return {
    jobPosting: { findMany, count, findUnique },
  } as unknown as MockTx;
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'jp-1',
    jobOpeningId: 'jo-1',
    slug: 'cong-nhan-dong-goi',
    revision: 1,
    status: 'DRAFT',
    publishedAt: null,
    archivedAt: null,
    createdAt: new Date('2026-09-12T10:00:00.000Z'),
    updatedAt: new Date('2026-09-12T11:00:00.000Z'),
    jobOpening: {
      id: 'jo-1',
      status: 'OPEN',
      staffingOrder: { code: 'SO-001' },
    },
    ...overrides,
  };
}

describe('clampPositiveInt', () => {
  it('undefined → default', () => {
    expect(clampPositiveInt(undefined, { default: 25, max: 100 })).toBe(25);
  });
  it('null → default', () => {
    expect(clampPositiveInt(null as unknown as number, { default: 25, max: 100 })).toBe(25);
  });
  it('NaN → default', () => {
    expect(clampPositiveInt(Number.NaN, { default: 25, max: 100 })).toBe(25);
  });
  it('Infinity → default', () => {
    expect(clampPositiveInt(Number.POSITIVE_INFINITY, { default: 25, max: 100 })).toBe(25);
  });
  it('0 → default (số không dương)', () => {
    expect(clampPositiveInt(0, { default: 25, max: 100 })).toBe(25);
  });
  it('-5 → default', () => {
    expect(clampPositiveInt(-5, { default: 25, max: 100 })).toBe(25);
  });
  it('1.5 → Math.trunc = 1 (vẫn dương → pass)', () => {
    expect(clampPositiveInt(1.5, { default: 25, max: 100 })).toBe(1);
  });
  it('1.999 → Math.trunc = 1', () => {
    expect(clampPositiveInt(1.999, { default: 25, max: 100 })).toBe(1);
  });
  it('50 → pass-through (trong khoảng)', () => {
    expect(clampPositiveInt(50, { default: 25, max: 100 })).toBe(50);
  });
  it('101 → cap về 100', () => {
    expect(clampPositiveInt(101, { default: 25, max: 100 })).toBe(100);
  });
  it('9999 → cap về 100', () => {
    expect(clampPositiveInt(9999, { default: 25, max: 100 })).toBe(100);
  });
});

describe('listJobPostingsForAdmin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('không truyền options → defaults take=25, skip=0, không lọc status', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any);
    expect(tx.jobPosting.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { updatedAt: 'desc' },
      take: 25,
      skip: 0,
      include: {
        jobOpening: {
          select: {
            id: true,
            staffingOrder: { select: { code: true } },
            status: true,
          },
        },
      },
    });
  });

  it('truyền take > MAX_TAKE (100) → clamp xuống 100', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { take: 9999 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('truyền take âm → về default 25', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { take: -5 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].take).toBe(25);
  });

  it('truyền take=0 hoặc NaN → về default 25', async () => {
    const tx1 = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx1 as any, { take: 0 });
    expect(tx1.jobPosting.findMany.mock.calls[0][0].take).toBe(25);
    const tx2 = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx2 as any, { take: Number.NaN });
    expect(tx2.jobPosting.findMany.mock.calls[0][0].take).toBe(25);
  });

  it('truyền take=1.5 (số thực) → Math.trunc = 1', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { take: 1.5 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].take).toBe(1);
  });

  it('truyền status=DRAFT → where filter đúng', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { status: 'DRAFT' });
    expect(tx.jobPosting.findMany.mock.calls[0][0].where).toEqual({ status: 'DRAFT' });
  });

  it('truyền skip âm → về 0', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { skip: -10 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].skip).toBe(0);
  });

  it('truyền skip=1.7 (số thực) → Math.trunc = 1', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { skip: 1.7 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].skip).toBe(1);
  });

  it('truyền skip=2_000_000 (vượt max) → cap về 1_000_000', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { skip: 2_000_000 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].skip).toBe(1_000_000);
  });

  it('truyền take=25, skip=75 → pass-through', async () => {
    const tx = makeMockTx({ rows: [], total: 0 });
    await listJobPostingsForAdmin(tx as any, { take: 25, skip: 75 });
    expect(tx.jobPosting.findMany.mock.calls[0][0].take).toBe(25);
    expect(tx.jobPosting.findMany.mock.calls[0][0].skip).toBe(75);
  });

  it('rows có Date → DTO serialize thành ISO string', async () => {
    const row = makeRow();
    const tx = makeMockTx({ rows: [row], total: 1 });
    const page = await listJobPostingsForAdmin(tx as any);
    expect(page.items).toHaveLength(1);
    const item = page.items[0];
    expect(item.id).toBe('jp-1');
    expect(item.createdAt).toBe('2026-09-12T10:00:00.000Z');
    expect(item.updatedAt).toBe('2026-09-12T11:00:00.000Z');
    expect(item.publishedAt).toBeNull();
    expect(item.openingStaffingOrderCode).toBe('SO-001');
    expect(item.openingStatus).toBe('OPEN');
  });

  it('row null jobOpening (orphan) → opening fields = null', async () => {
    const row = makeRow({ jobOpening: null });
    const tx = makeMockTx({ rows: [row], total: 1 });
    const [item] = (await listJobPostingsForAdmin(tx as any)).items;
    expect(item.openingStaffingOrderCode).toBeNull();
    expect(item.openingStatus).toBeNull();
  });

  it('row status PUBLISHED + publishedAt set → serialize đúng', async () => {
    const row = makeRow({
      status: 'PUBLISHED',
      publishedAt: new Date('2026-09-12T12:00:00.000Z'),
      archivedAt: null,
    });
    const tx = makeMockTx({ rows: [row], total: 1 });
    const [item] = (await listJobPostingsForAdmin(tx as any)).items;
    expect(item.status).toBe('PUBLISHED');
    expect(item.publishedAt).toBe('2026-09-12T12:00:00.000Z');
    expect(item.archivedAt).toBeNull();
  });

  it('total phản ánh count độc lập với take/skip', async () => {
    const tx = makeMockTx({ rows: [], total: 999 });
    const page = await listJobPostingsForAdmin(tx as any, { take: 10, skip: 0 });
    expect(page.total).toBe(999);
    expect(page.take).toBe(10);
    expect(page.skip).toBe(0);
  });

  it('Prisma throws → bubble up (KHÔNG nuốt lỗi)', async () => {
    const tx = makeMockTx({ listError: new Error('db down') });
    await expect(listJobPostingsForAdmin(tx as any)).rejects.toThrow('db down');
  });
});

describe('getJobPostingForAdmin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('id rỗng → return null mà KHÔNG gọi Prisma', async () => {
    const tx = makeMockTx({});
    const result = await getJobPostingForAdmin(tx as any, '');
    expect(result).toBeNull();
    expect(tx.jobPosting.findUnique).not.toHaveBeenCalled();
  });

  it('id không phải string → return null mà KHÔNG gọi Prisma', async () => {
    const tx = makeMockTx({});
    const result = await getJobPostingForAdmin(tx as any, undefined as unknown as string);
    expect(result).toBeNull();
    expect(tx.jobPosting.findUnique).not.toHaveBeenCalled();
  });

  it('không tìm thấy → return null', async () => {
    const tx = makeMockTx({ uniqueRow: null });
    const result = await getJobPostingForAdmin(tx as any, 'jp-missing');
    expect(result).toBeNull();
  });

  it('tìm thấy → map đầy đủ field', async () => {
    const row = {
      id: 'jp-2',
      jobOpeningId: 'jo-2',
      slug: 'ke-toan-vien',
      revision: 3,
      status: 'ARCHIVED',
      publishedAt: new Date('2026-08-01T00:00:00.000Z'),
      archivedAt: new Date('2026-09-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      jobOpening: {
        id: 'jo-2',
        status: 'FILLED',
        openedAt: new Date('2026-07-15T00:00:00.000Z'),
        closedAt: new Date('2026-09-01T00:00:00.000Z'),
        staffingOrderId: 'so-99',
        staffingOrderSlotId: 'slot-1',
        staffingOrder: { code: 'SO-099' },
      },
    };
    const tx = makeMockTx({ uniqueRow: row });
    const dto = await getJobPostingForAdmin(tx as any, 'jp-2');
    expect(dto).not.toBeNull();
    expect(dto?.id).toBe('jp-2');
    expect(dto?.status).toBe('ARCHIVED');
    expect(dto?.publishedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(dto?.archivedAt).toBe('2026-09-01T00:00:00.000Z');
    expect(dto?.opening).toEqual({
      id: 'jo-2',
      status: 'FILLED',
      openedAt: '2026-07-15T00:00:00.000Z',
      closedAt: '2026-09-01T00:00:00.000Z',
      staffingOrderId: 'so-99',
      staffingOrderCode: 'SO-099',
      staffingOrderSlotId: 'slot-1',
    });
  });

  it('orphan (jobOpening null) → opening = null', async () => {
    const row = {
      id: 'jp-orphan',
      jobOpeningId: 'jo-missing',
      slug: 'orphan',
      revision: 1,
      status: 'DRAFT',
      publishedAt: null,
      archivedAt: null,
      createdAt: new Date('2026-09-12T10:00:00.000Z'),
      updatedAt: new Date('2026-09-12T10:00:00.000Z'),
      jobOpening: null,
    };
    const tx = makeMockTx({ uniqueRow: row });
    const dto = await getJobPostingForAdmin(tx as any, 'jp-orphan');
    expect(dto?.opening).toBeNull();
    // DetailDto không có `openingStaffingOrderCode` (chỉ `opening.staffingOrderCode`)
  });

  it('Prisma throws → bubble up', async () => {
    const tx = makeMockTx({ uniqueError: new Error('timeout') });
    await expect(getJobPostingForAdmin(tx as any, 'jp-x')).rejects.toThrow('timeout');
  });
});
