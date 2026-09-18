import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import {
  createInitialAffiliateAssignment,
  getActiveHandlingAssignment,
  managerAssign,
  ASSIGNMENT_STATUS,
  ASSIGNMENT_SOURCE,
} from './handling-assignment.service';

const mockTx = {
  laborProfileHandlingAssignment: {
    updateMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  }
} as unknown as Prisma.TransactionClient;

describe('handling-assignment.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create initial affiliate assignment correctly', async () => {
    const laborProfileId = 'lp-1';
    const referrerUserId = 'user-1';

    // Mock create to return what it receives
    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => ({
      id: 'assignment-1',
      ...args.data,
    }));

    const assignment = await createInitialAffiliateAssignment(mockTx, {
      laborProfileId,
      referrerUserId,
    });

    expect(mockTx.laborProfileHandlingAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        laborProfileId,
        status: ASSIGNMENT_STATUS.ACTIVE,
      },
      data: {
        status: ASSIGNMENT_STATUS.REVOKED,
        reason: 'Replaced by initial affiliate assignment',
        updatedAt: expect.any(Date),
      },
    });

    expect(assignment.laborProfileId).toBe(laborProfileId);
    expect(assignment.assigneeUserId).toBe(referrerUserId);
    expect(assignment.assignedByUserId).toBeNull();
    expect(assignment.source).toBe(ASSIGNMENT_SOURCE.AFF_INITIAL);
    expect(assignment.status).toBe(ASSIGNMENT_STATUS.ACTIVE);
    expect(assignment.expiresAt).toBeDefined();
  });

  it('should return null for expired assignment', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago

    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue({
      id: 'assignment-old',
      expiresAt: pastDate,
      status: ASSIGNMENT_STATUS.ACTIVE,
    });

    const active = await getActiveHandlingAssignment(mockTx, 'lp-2');
    expect(active).toBeNull();
  });

  it('should manager assign and revoke previous assignment', async () => {
    const activeAssignment = { id: 'old-1' };
    (mockTx.laborProfileHandlingAssignment.findFirst as any).mockResolvedValue(activeAssignment);
    (mockTx.laborProfileHandlingAssignment.create as any).mockImplementation(async (args: any) => args.data);
    (mockTx.user.findUnique as any).mockResolvedValue({ role: 'HR_STAFF' });

    const newAssignment = await managerAssign(mockTx, {
      laborProfileId: 'lp-3',
      newAssigneeUserId: 'user-2',
      managerUserId: 'manager-1',
      days: 30,
      reason: 'Manual assign',
    });

    expect(mockTx.laborProfileHandlingAssignment.update).toHaveBeenCalledWith({
      where: { id: 'old-1' },
      data: {
        status: ASSIGNMENT_STATUS.TRANSFERRED,
        reason: 'Manager reassigned',
        updatedAt: expect.any(Date),
      },
    });

    expect(newAssignment.assigneeUserId).toBe('user-2');
    expect(newAssignment.previousAssignmentId).toBe('old-1');
    expect(newAssignment.source).toBe(ASSIGNMENT_SOURCE.MANAGER_ASSIGNMENT);
  });
});
