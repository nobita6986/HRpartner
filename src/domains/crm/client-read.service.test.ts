import { describe, it, expect, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { getClientDetail } from './client-read.service';
import type { AuthContext } from '../../shared/auth/auth-context';

function makeMockTx(overrides: any = {}): Prisma.TransactionClient {
  return {
    clientCompany: {
      findUnique: vi.fn().mockResolvedValue(overrides.client ?? null),
    },
    project: {
      findFirst: vi.fn().mockResolvedValue(overrides.visibleProject ?? null),
      findMany: vi.fn().mockResolvedValue(overrides.projects ?? []),
    },
    staffingOrder: { count: vi.fn().mockResolvedValue(overrides.ordersCount ?? 0) },
    staffingOrderSlot: { count: vi.fn().mockResolvedValue(overrides.slotsCount ?? 0) },
    jobOpening: { count: vi.fn().mockResolvedValue(overrides.openingsCount ?? 0) },
    projectAssignment: { count: vi.fn().mockResolvedValue(overrides.assignmentsCount ?? 0) },
  } as unknown as Prisma.TransactionClient;
}

describe('getClientDetail', () => {
  const viewerAdmin: AuthContext = { userId: 'admin1', role: 'ADMIN' };
  const viewerPM: AuthContext = { userId: 'pm1', role: 'PM' };
  
  const mockClient = {
    id: 'client-1', code: 'C01', name: 'Client 1', taxCode: '123', industry: 'IT', status: 'ACTIVE'
  };
  const mockProjects = [
    { id: 'p1', code: 'P01', name: 'Proj 1', status: 'ACTIVE' }
  ];

  it('trả về null nếu ID không tồn tại', async () => {
    const tx = makeMockTx({ client: null });
    const result = await getClientDetail(tx, viewerAdmin, 'invalid-id');
    expect(result).toBeNull();
  });

  it('PM bị chặn (trả null) nếu không có project nào visible', async () => {
    // client tồn tại nhưng PM không thấy project nào
    const tx = makeMockTx({ client: mockClient, visibleProject: null });
    const result = await getClientDetail(tx, viewerPM, 'client-1');
    expect(result).toBeNull();
    // findFirst được gọi
    expect((tx.project.findFirst as any).mock.calls.length).toBe(1);
  });

  it('PM lấy được client nếu có project visible', async () => {
    const tx = makeMockTx({
      client: mockClient,
      visibleProject: { id: 'p1' },
      projects: mockProjects,
      ordersCount: 2, slotsCount: 5, openingsCount: 1, assignmentsCount: 3
    });
    const result = await getClientDetail(tx, viewerPM, 'client-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('client-1');
    expect(result?.projects.length).toBe(1);
    expect(result?.metrics.ordersCount).toBe(2);
  });

  it('ADMIN bỏ qua guard và lấy dữ liệu thành công', async () => {
    const tx = makeMockTx({
      client: mockClient,
      projects: mockProjects,
    });
    const result = await getClientDetail(tx, viewerAdmin, 'client-1');
    expect(result).not.toBeNull();
    // ADMIN không gọi findFirst
    expect((tx.project.findFirst as any).mock.calls.length).toBe(0);
    expect(result?.name).toBe('Client 1');
  });
});
