import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import {
  enrichUsersWithWorkerSummary,
  linkOrAssignWorkerAccountByAdmin,
  onboardLaborProfileByAdmin,
  onboardWorkerAccountByAdmin,
  unlinkWorkerAccountByAdmin,
} from './worker-onboarding.service';

const mocks = vi.hoisted(() => ({
  nextBusinessCode: vi.fn(),
  writeAuditLog: vi.fn(),
  enqueueOutbox: vi.fn(),
}));

vi.mock('@/src/shared/business-code/business-code', () => ({
  nextBusinessCode: mocks.nextBusinessCode,
}));
vi.mock('@/src/shared/integrity/audit', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));
vi.mock('@/src/shared/integrity/outbox', () => ({
  enqueueOutbox: mocks.enqueueOutbox,
}));

const ADMIN_CTX: AuthContext = {
  userId: 'admin-1',
  role: 'ADMIN' as never,
};

function makeTx() {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    $queryRawUnsafe: vi.fn().mockResolvedValue([
      {
        id: 'slot-1',
        staffing_order_id: 'order-1',
        position_code: 'OP-01',
        position_title: 'Công nhân lắp ráp',
        slots_needed: 10,
        slots_filled: 2,
        valid_from: new Date('2026-01-01T00:00:00Z'),
        valid_to: null,
      },
    ]),
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'u-worker-1',
        name: 'Nguyễn Văn A',
        phone: '0987654321',
        phoneVerified: false,
        role: 'WORKER',
        isActive: true,
        passwordHash: 'hashed',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'u-created-1',
        name: data.name,
        phone: data.phone,
        phoneVerified: data.phoneVerified,
        role: data.role,
        isActive: data.isActive,
      })),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    worker: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'w-new-1',
        userId: data.userId,
        fullName: data.fullName,
        phone: data.phone,
        profileStatus: data.profileStatus,
        employmentStatus: data.employmentStatus,
        accountUserId: data.accountUserId,
      })),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: where.id,
        userId: 'USR-EMP-001',
        fullName: 'Nguyễn Văn A',
        phone: '0987654321',
        profileStatus: data.profileStatus ?? 'VERIFIED',
        employmentStatus: data.employmentStatus ?? 'ACTIVE',
        accountUserId: data.accountUserId ?? 'u-worker-1',
      })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    laborProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({
        id: 'lp-1',
        fullName: 'Duc Nguyen',
        phone: '0987654321',
        cccdNumber: null,
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
        workerId: null,
      }),
      create: vi.fn().mockResolvedValue({ id: 'lp-1' }),
      update: vi.fn().mockResolvedValue({ id: 'lp-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    sourceClaim: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'sc-1' }),
    },
    laborProfileHandlingAssignment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    staffingOrder: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'order-1',
        code: 'SO-001',
        status: 'OPEN',
        projectId: 'proj-1',
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    project: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'proj-1',
        code: 'PRJ-001',
        name: 'Nhà máy Samsung',
        status: 'ACTIVE',
        quota: 50,
        filled: 10,
      }),
      findMany: vi.fn().mockResolvedValue([
        { id: 'proj-1', code: 'PRJ-001', name: 'Nhà máy Samsung' },
      ]),
      update: vi.fn().mockResolvedValue({ filled: 11, quota: 50 }),
    },
    staffingOrderSlot: {
      update: vi.fn().mockResolvedValue({ slotsFilled: 3, slotsNeeded: 10 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    projectAssignment: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'asg-1',
        projectId: data.projectId,
        staffingOrderId: data.staffingOrderId,
        staffingOrderSlotId: data.staffingOrderSlotId,
        employeeCode: data.employeeCode,
        employmentType: data.employmentType,
        workSetting: data.workSetting,
        validFrom: data.validFrom,
      })),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('worker-onboarding.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.nextBusinessCode.mockResolvedValue('USR-EMP-001');
    mocks.writeAuditLog.mockResolvedValue({ id: 'audit-1' });
    mocks.enqueueOutbox.mockResolvedValue(undefined);
  });

  it('onboardWorkerAccountByAdmin: tự động xác minh SĐT + tạo Worker + LaborProfile + SourceClaim + gán dự án ACTIVE trong 1 giao dịch', async () => {
    const tx = makeTx();

    const result = await onboardWorkerAccountByAdmin(tx as never, ADMIN_CTX, {
      userId: 'u-worker-1',
      slotId: 'slot-1',
      employeeCode: 'NV-001',
      employmentType: 'HRP_EMPLOYED',
      workSetting: 'PHOTHONG',
      reason: 'Xác thực thủ công và phân công vào dự án Samsung',
    });

    expect(result).toEqual({
      userId: 'u-worker-1',
      phoneVerified: true,
      workerId: 'w-new-1',
      workerCode: 'USR-EMP-001',
      workerCreated: true,
      profileStatus: 'VERIFIED',
      employmentStatus: 'ACTIVE',
      assignment: {
        id: 'asg-1',
        projectId: 'proj-1',
        projectCode: 'PRJ-001',
        projectName: 'Nhà máy Samsung',
        staffingOrderId: 'order-1',
        staffingOrderSlotId: 'slot-1',
        employeeCode: 'NV-001',
        employmentType: 'HRP_EMPLOYED',
        workSetting: 'PHOTHONG',
        validFrom: expect.any(String),
      },
    });

    // 1. SĐT được xác minh thủ công
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u-worker-1' },
      data: { phoneVerified: true, phoneVerifiedAt: expect.any(Date) },
    });

    // 2. Worker mới được tạo với trạng thái VERIFIED + ACTIVE và gắn accountUserId
    expect(tx.worker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'USR-EMP-001',
          fullName: 'Nguyễn Văn A',
          phone: '0987654321',
          profileStatus: 'VERIFIED',
          employmentStatus: 'ACTIVE',
          accountUserId: 'u-worker-1',
        }),
      }),
    );

    // 3. LaborProfile & SourceClaim được tạo
    expect(tx.laborProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workerId: 'w-new-1',
          normalizedPhone: '987654321',
          identityVerification: 'VERIFIED',
        }),
      }),
    );
    expect(tx.sourceClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workerId: 'w-new-1',
          claimType: 'HRP_DIRECT',
          registrationChannel: 'HR_ADDED',
          accepted: true,
        }),
      }),
    );

    // 4. ProjectAssignment ACTIVE + bộ đếm + Outbox
    expect(tx.projectAssignment.create).toHaveBeenCalledTimes(1);
    expect(tx.staffingOrderSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { slotsFilled: { increment: 1 } },
      select: { slotsFilled: true, slotsNeeded: true },
    });
    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { filled: { increment: 1 } },
      select: { filled: true, quota: true },
    });
    expect(mocks.enqueueOutbox).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: 'AssignmentActivated',
        aggregateId: 'asg-1',
      }),
    );
  });

  it('linkOrAssignWorkerAccountByAdmin: cho phép liên kết tài khoản vào Worker chưa có assignment và tự động nâng trạng thái VERIFIED/ACTIVE', async () => {
    const tx = makeTx();
    tx.worker.findUnique.mockResolvedValue({
      id: 'w-existing-1',
      userId: 'USR-EMP-009',
      fullName: 'Nguyễn Văn A',
      phone: '0987654321',
      profileStatus: 'INCOMPLETE',
      employmentStatus: 'NONE',
      accountUserId: null,
    });

    const result = await linkOrAssignWorkerAccountByAdmin(tx as never, ADMIN_CTX, {
      workerId: 'w-existing-1',
      userId: 'u-worker-1',
      reason: 'Liên kết tài khoản cho NLĐ mới tiếp nhận',
    });

    expect(result).toEqual({
      workerId: 'w-existing-1',
      userId: 'u-worker-1',
      phoneVerified: true,
      profileStatus: 'VERIFIED',
      employmentStatus: 'ACTIVE',
      assignment: null,
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u-worker-1' },
      data: { phoneVerified: true, phoneVerifiedAt: expect.any(Date) },
    });
    expect(tx.worker.updateMany).toHaveBeenCalledWith({
      where: { id: 'w-existing-1', accountUserId: null },
      data: {
        accountUserId: 'u-worker-1',
        profileStatus: 'VERIFIED',
        employmentStatus: 'ACTIVE',
      },
    });
  });

  it('unlinkWorkerAccountByAdmin: gỡ liên kết tài khoản và ghi AuditLog LOGIN_ACCOUNT_UNLINKED', async () => {
    const tx = makeTx();
    tx.worker.findUnique.mockResolvedValue({
      id: 'w-existing-1',
      accountUserId: 'u-worker-1',
    });

    const res = await unlinkWorkerAccountByAdmin(tx as never, ADMIN_CTX, {
      workerId: 'w-existing-1',
      reason: 'Gỡ tài khoản liên kết nhầm',
    });

    expect(res).toEqual({
      workerId: 'w-existing-1',
      unlinkedUserId: 'u-worker-1',
    });
    expect(tx.worker.update).toHaveBeenCalledWith({
      where: { id: 'w-existing-1' },
      data: { accountUserId: null },
    });
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_ACCOUNT_UNLINKED',
        entityType: 'Worker',
        entityId: 'w-existing-1',
      }),
    );
  });

  it('enrichUsersWithWorkerSummary: tương thích ngược khi tx.worker không được mock trong unit test cũ', async () => {
    const rows = [{ id: 'u1', role: 'WORKER' }];
    const out = await enrichUsersWithWorkerSummary({} as never, rows);
    expect(out).toEqual(rows);
  });

  it('onboardLaborProfileByAdmin: xác minh SĐT tài khoản đăng nhập App sẵn có + tạo Worker + liên kết LaborProfile + gán dự án', async () => {
    const tx = makeTx();
    tx.user.findFirst.mockResolvedValue({
      id: 'u-worker-1',
      name: 'Duc Nguyen',
      phone: '0987654321',
      phoneVerified: false,
      role: 'WORKER',
      isActive: true,
    });

    const result = await onboardLaborProfileByAdmin(tx as never, ADMIN_CTX, {
      laborProfileId: 'lp-1',
      slotId: 'slot-1',
      employeeCode: 'NV-321',
      employmentType: 'HRP_EMPLOYED',
      workSetting: 'PHOTHONG',
      reason: 'Duyệt ứng viên Duc Nguyen thành NLĐ HRP và gán dự án',
    });

    expect(result).toEqual({
      laborProfileId: 'lp-1',
      userId: 'u-worker-1',
      accountCreated: false,
      temporaryPassword: null,
      phoneVerified: true,
      workerId: 'w-new-1',
      workerCode: 'USR-EMP-001',
      workerCreated: true,
      profileStatus: 'VERIFIED',
      employmentStatus: 'ACTIVE',
      assignment: expect.objectContaining({
        id: 'asg-1',
        projectCode: 'PRJ-001',
        employeeCode: 'NV-321',
      }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u-worker-1' },
      data: { phoneVerified: true, phoneVerifiedAt: expect.any(Date) },
    });
    expect(tx.laborProfile.update).toHaveBeenCalledWith({
      where: { id: 'lp-1' },
      data: {
        workerId: 'w-new-1',
        identityVerification: 'VERIFIED',
        completeness: 'SUFFICIENT',
        normalizedPhone: '987654321',
      },
    });
  });

  it('onboardLaborProfileByAdmin: tự động khởi tạo tài khoản đăng nhập App (createAccountIfMissing=true) khi ứng viên chưa đăng ký trên App', async () => {
    const tx = makeTx();
    tx.user.findFirst.mockResolvedValue(null);

    const result = await onboardLaborProfileByAdmin(tx as never, ADMIN_CTX, {
      laborProfileId: 'lp-1',
      createAccountIfMissing: true,
      reason: 'Tạo tài khoản App và duyệt ứng viên thành NLĐ HRP',
    });

    expect(result.accountCreated).toBe(true);
    expect(result.temporaryPassword).toBeTruthy();
    expect(result.userId).toBe('u-created-1');
    expect(result.phoneVerified).toBe(true);
    expect(result.workerCode).toBe('USR-EMP-001');
  });
});
