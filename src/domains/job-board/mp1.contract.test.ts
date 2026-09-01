import { describe, expect, it, vi } from 'vitest';
import { publishJob, PublishJobServiceError } from './publish.service';
import { listPublicJobProjection } from './public.service';

const ADMIN = { userId: 'admin-1', role: 'ADMIN' as const };

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    code: 'PRJ-001',
    name: 'Warehouse Operators',
    status: 'ACTIVE',
    isPublic: false,
    version: 3,
    staffingOrders: [{
      status: 'OPEN',
      deadlineDate: null,
      slots: [{ slotsNeeded: 5, slotsFilled: 2, validTo: null }],
    }],
    ...overrides,
  };
}

function publishTx(row = project()) {
  return {
    project: {
      findFirst: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
  } as any;
}

/**
 * Đúng hình dạng dòng mà `publicSelect` trả về SAU hotfix-02: chỉ scalar của `Project` cộng
 * nhánh `staffingOrders`, KHÔNG field quan hệ nào. Đó là điều kiện để query engine của Prisma
 * không phải materialize bảng bị RLS che và không ném `Inconsistent query result`.
 * Biến duy nhất giữa hai case là TEXT của dự án, vì sau khi bỏ quan hệ thì `industry` chỉ còn
 * đường suy ra từ text với fallback `null`.
 */
function publicProjectionTx(projectName: string) {
  return {
    project: {
      findMany: vi.fn().mockResolvedValue([{
        id: 'project-9', code: 'PRJ-009', name: projectName, siteAddress: 'Bac Ninh',
        staffingOrders: [{ status: 'OPEN', title: 'Cong nhan lap rap', description: null, deadlineDate: null, slots: [{ positionCode: 'ASSY', positionTitle: 'Cong nhan lap rap', slotsNeeded: 4, slotsFilled: 1, shiftStart: '07:00', shiftEnd: '16:00', validTo: null, workLocation: 'Site A' }] }],
      }]),
      count: vi.fn().mockResolvedValue(1),
    },
  } as any;
}

describe('MP-1 publish and public job contracts', () => {
  it('publishes an active project with available slots and writes audit', async () => {
    const tx = publishTx();
    const result = await publishJob(tx, ADMIN, { projectId: 'project-1', isPublic: true, expectedVersion: 3 });

    expect(result).toEqual({
      project: { id: 'project-1', code: 'PRJ-001', name: 'Warehouse Operators', isPublic: true, version: 4 },
      changed: true,
    });
    expect(tx.project.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'project-1', version: 3 }),
      data: { isPublic: true, version: { increment: 1 } },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });

  it('returns a safe no-op when the requested state is already set', async () => {
    const tx = publishTx(project({ isPublic: true }));
    const result = await publishJob(tx, ADMIN, { projectId: 'project-1', isPublic: true });

    expect(result.changed).toBe(false);
    expect(tx.project.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects stale versions and unavailable projects', async () => {
    const staleTx = publishTx();
    await expect(publishJob(staleTx, ADMIN, { projectId: 'project-1', isPublic: true, expectedVersion: 2 }))
      .rejects.toMatchObject({ code: 'STALE_VERSION' } satisfies Partial<PublishJobServiceError>);

    const unavailableTx = publishTx(project({ staffingOrders: [{ status: 'OPEN', deadlineDate: null, slots: [{ slotsNeeded: 1, slotsFilled: 1, validTo: null }] }] }));
    await expect(publishJob(unavailableTx, ADMIN, { projectId: 'project-1', isPublic: true }))
      .rejects.toMatchObject({ code: 'INVALID_STATE' } satisfies Partial<PublishJobServiceError>);
  });

  it('projects only public open jobs and excludes internal fields', async () => {
    const tx = {
      project: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'project-1', code: 'PRJ-001', name: 'Warehouse Operators', siteAddress: 'Bac Ninh',
          staffingOrders: [{ status: 'OPEN', title: 'Warehouse picker', description: null, deadlineDate: null, slots: [{ positionCode: 'PICKER', positionTitle: 'Picker', slotsNeeded: 4, slotsFilled: 1, shiftStart: '07:00', shiftEnd: '16:00', validTo: null, workLocation: 'Site A' }] }],
        }]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as any;

    const result = await listPublicJobProjection(tx, {
      q: 'Warehouse',
      area: 'Bac Ninh',
      // go-live-05 v1.2 / DEC-13: opts không còn khóa ngành. Nhãn ở assertion dưới vẫn là
      // 'Kho vận' vì nó do văn bản của fixture suy ra, không do bộ lọc.
      shift: '07:00',
      shiftTypes: ['ca_ngay'],
      jobTypes: ['toan_thoi_gian'],
    });
    expect(result.jobs).toEqual([expect.objectContaining({
      id: 'project-1', slug: 'PRJ-001', availableSlots: 3, position: 'Picker',
      industry: 'Kho vận', shiftType: 'ca_ngay', jobType: 'toan_thoi_gian',
    })]);
    expect(result.jobs[0]).not.toHaveProperty('clientCompanyId');
    expect(result.jobs[0]).not.toHaveProperty('hourlyRateVnd');
    expect(result.jobs[0]).not.toHaveProperty('internalNotes');
  });

  // `client_companies` ở posture FORCE RLS và principal công khai `MKT` không có policy SELECT
  // nào trên bảng đó. Hotfix-02 xử lý bằng cách KHÔNG select quan hệ đó nữa, nên trạng thái
  // "quan hệ bị che" không còn đường nào làm sập truy vấn. Case này giữ nguyên tên và assertion
  // của hotfix-01 để chốt rằng đường fallback vẫn trả `industry` là string hợp lệ.
  it('projects a public job when the client company relation is hidden by RLS', async () => {
    const tx = publicProjectionTx('Lap rap bang mach');

    const result = await listPublicJobProjection(tx, {});

    expect(result.total).toBe(1);
    expect(typeof result.jobs[0].industry).toBe('string');
    expect(result.jobs[0].industry).toBe('Công nghiệp chế tạo');
  });

  // Nhánh đối xứng. Sau hotfix-02, ngành KHÔNG còn đến từ bảng khách hàng; nguồn duy nhất là
  // keyword trong text của dự án. Tên case giữ nguyên theo yêu cầu contract (STEP-04) dù cơ chế
  // đã đổi — xem limitation trong HANDOFF. Giá trị khẳng định vẫn là `Điện tử`, không nới.
  it('still uses the client company industry when the relation is readable', async () => {
    const tx = publicProjectionTx('Lap rap bang mach dien tu');

    const result = await listPublicJobProjection(tx, {});

    expect(result.total).toBe(1);
    expect(typeof result.jobs[0].industry).toBe('string');
    expect(result.jobs[0].industry).toBe('Điện tử');
  });
});
