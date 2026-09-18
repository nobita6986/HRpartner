import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLaborProfilesList, getLaborProfileDetail } from './labor-profile.read-service';
import type { Prisma } from '@prisma/client';
import * as permResolver from '@/src/shared/auth/permission-resolver';
import type { AuthContext } from '@/src/shared/auth/auth-context';

vi.mock('@/src/shared/auth/permission-resolver', () => ({
  resolveEffectivePermissions: vi.fn(),
}));

describe('LaborProfile Read Service', () => {
  let mockFindMany: any;
  let mockCount: any;
  let mockFindUnique: any;
  let mockTx: any;
  let adminCtx: AuthContext;
  let staffCtx: AuthContext;

  beforeEach(() => {
    mockFindMany = vi.fn().mockResolvedValue([]);
    mockCount = vi.fn().mockResolvedValue(0);
    mockFindUnique = vi.fn().mockResolvedValue(null);
    mockTx = {
      laborProfile: {
        findMany: mockFindMany,
        count: mockCount,
        findUnique: mockFindUnique,
      },
    } as unknown as Prisma.TransactionClient;

    adminCtx = { userId: 'admin-1', role: 'ADMIN' } as AuthContext;
    staffCtx = { userId: 'staff-1', role: 'HR_STAFF' } as AuthContext;
    
    vi.mocked(permResolver.resolveEffectivePermissions).mockImplementation(async (user) => {
      if (user.role === 'ADMIN') return new Set(['CAN_VIEW_WORKER_SENSITIVE']);
      return new Set([]);
    });
  });

  describe('Masking & Permissions', () => {
    it('masks phone and CCCD for staff without CAN_VIEW_WORKER_SENSITIVE', async () => {
      mockFindUnique.mockResolvedValue({
        id: '123',
        phone: '0912345678',
        cccdNumber: '001099123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        intakes: [],
        submissions: [],
        episodes: [],
        placementCases: [],
      });

      const result = await getLaborProfileDetail(mockTx, staffCtx, '123');
      expect(result?.phone).toBe('091****678');
      expect(result?.cccdNumber).toBe('********3456');
    });

    it('shows full phone and CCCD for admin if they have CAN_VIEW_WORKER_SENSITIVE', async () => {
      // For Admin WITH permission
      vi.mocked(permResolver.resolveEffectivePermissions).mockImplementationOnce(async () => new Set(['CAN_VIEW_WORKER_SENSITIVE']));
      
      mockFindUnique.mockResolvedValue({
        id: '123',
        phone: '0912345678',
        cccdNumber: '001099123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        intakes: [],
        submissions: [],
        episodes: [],
        placementCases: [],
      });

      const result = await getLaborProfileDetail(mockTx, adminCtx, '123');
      expect(result?.phone).toBe('0912345678');
      expect(result?.cccdNumber).toBe('001099123456');
    });

    it('masks phone and CCCD for admin if they lack CAN_VIEW_WORKER_SENSITIVE (no fallback)', async () => {
      // For Admin WITHOUT permission
      vi.mocked(permResolver.resolveEffectivePermissions).mockImplementationOnce(async () => new Set());
      
      mockFindUnique.mockResolvedValue({
        id: '123',
        phone: '0912345678',
        cccdNumber: '001099123456',
        createdAt: new Date(),
        updatedAt: new Date(),
        intakes: [],
        submissions: [],
        episodes: [],
        placementCases: [],
      });

      const result = await getLaborProfileDetail(mockTx, adminCtx, '123');
      expect(result?.phone).toBe('091****678');
      expect(result?.cccdNumber).toBe('********3456');
    });
  });

  describe('Behavior & Filters', () => {
    it('applies WORKING filter correctly via episodes', async () => {
      await getLaborProfilesList(mockTx, adminCtx, { view: 'WORKING' });
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          episodes: { some: { status: 'ACTIVE' } }
        })
      }));
    });

    it('applies TERMINATED filter correctly via episodes ensuring precedence', async () => {
      await getLaborProfilesList(mockTx, adminCtx, { view: 'TERMINATED' });
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            { episodes: { none: { status: 'ACTIVE' } } },
            { episodes: { some: { status: 'ENDED' } } }
          ]
        })
      }));
    });
  });
});
