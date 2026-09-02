import { describe, expect, it, vi } from 'vitest';
import { publishJob, PublishJobServiceError } from './publish.service';
import { listPublicJobProjection } from './public.service';

const ADMIN = { userId: 'admin-1', role: 'ADMIN' as const };

/**
 * go-live-09 / RQ-01 — `publicSelect` nay select cả `staffingOrders.createdAt`, nên fixture của
 * đường đọc công khai phải mang field đó để còn là hình dạng dòng THẬT. Mốc cố định, không
 * `new Date()`: fixture phải cho cùng một kết quả ở mọi lần chạy và mọi múi giờ.
 */
const SEEDED_AT = new Date('2026-01-15T00:00:00.000Z');

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
 * Biến duy nhất giữa hai case là TEXT của dự án. go-live-14: chính vì đó là biến duy nhất mà hai
 * case phải cho CÙNG một tập khóa công khai — nhãn ngành từng là thứ duy nhất đổi theo chữ, và nó
 * đã bị bỏ khỏi DTO.
 */
function publicProjectionTx(projectName: string) {
  return {
    project: {
      findMany: vi.fn().mockResolvedValue([{
        id: 'project-9', code: 'PRJ-009', name: projectName, siteAddress: 'Bac Ninh',
        staffingOrders: [{ status: 'OPEN', title: 'Cong nhan lap rap', description: null, deadlineDate: null, createdAt: SEEDED_AT, slots: [{ positionCode: 'ASSY', positionTitle: 'Cong nhan lap rap', slotsNeeded: 4, slotsFilled: 1, shiftStart: '07:00', shiftEnd: '16:00', validTo: null, workLocation: 'Site A' }] }],
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
          staffingOrders: [{ status: 'OPEN', title: 'Warehouse picker', description: null, deadlineDate: null, createdAt: SEEDED_AT, slots: [{ positionCode: 'PICKER', positionTitle: 'Picker', slotsNeeded: 4, slotsFilled: 1, shiftStart: '07:00', shiftEnd: '16:00', validTo: null, workLocation: 'Site A' }] }],
        }]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as any;

    const result = await listPublicJobProjection(tx, {
      q: 'Warehouse',
      area: 'Bac Ninh',
      // go-live-05 v1.2 / DEC-13: opts không còn khóa ngành. go-live-14: và nhãn 'Kho vận' mà
      // assertion dưới từng chờ cũng không còn — nó do regex đọc chữ 'Warehouse' trong tên dự án
      // fixture mà suy ra, không có cột nào đứng sau.
      shift: '07:00',
      shiftTypes: ['ca_ngay'],
      jobTypes: ['toan_thoi_gian'],
    });
    expect(result.jobs).toEqual([expect.objectContaining({
      id: 'project-1', slug: 'PRJ-001', availableSlots: 3, position: 'Picker',
      shiftType: 'ca_ngay', jobType: 'toan_thoi_gian',
    })]);
    expect(result.jobs[0]).not.toHaveProperty('clientCompanyId');
    expect(result.jobs[0]).not.toHaveProperty('hourlyRateVnd');
    expect(result.jobs[0]).not.toHaveProperty('internalNotes');
    // go-live-14 / RQ-02, DEC-05 — khóa industry trong `objectContaining` ở trên đã bị bỏ và ĐỔI DẤU
    // thành phủ định dưới đây. `objectContaining` không bắt được khóa THỪA, nên nếu thiếu dòng này
    // thì khóa đó quay lại mà case vẫn xanh.
    expect(result.jobs[0]).not.toHaveProperty('industry');
  });

  // `client_companies` ở posture FORCE RLS và principal công khai `MKT` không có policy SELECT
  // nào trên bảng đó. Hotfix-02 xử lý bằng cách KHÔNG select quan hệ đó nữa, nên trạng thái
  // "quan hệ bị che" không còn đường nào làm sập truy vấn. go-live-14 bỏ luôn phần "đường fallback
  // vẫn trả nhãn là string hợp lệ": khi quan hệ bị che thì đúng hơn là KHÔNG có nhãn nào, chứ không
  // phải bù vào một nhãn mặc định do hàm suy diễn đặt ra.
  it('projects a public job when the client company relation is hidden by RLS', async () => {
    const tx = publicProjectionTx('Lap rap bang mach');

    const result = await listPublicJobProjection(tx, {});

    expect(result.total).toBe(1);
    // go-live-14 / RQ-02, DEC-05 — hai khẳng định cũ (typeof là string, và nhãn mặc định
    // 'Cong nghiep che tao') đã ĐỔI DẤU thành phủ định dưới đây.
    expect(result.jobs[0]).not.toHaveProperty('industry');
  });

  // go-live-14 / EV-11 — tên cũ của case này là "still uses the client company industry when the
  // relation is readable", và đó là một BẢN KHAI SAI: sau hotfix-02 quan hệ khách hàng không còn được
  // select, nên nhãn không hề đến từ bảng khách hàng; nguồn duy nhất là keyword trong text của dự án.
  // Nay cả nhãn cũng không còn, nên case đổi tên theo đúng thứ nó đo.
  it('gives the same public key set for two different project texts, with no industry label', async () => {
    const tx = publicProjectionTx('Lap rap bang mach dien tu');

    const result = await listPublicJobProjection(tx, {});

    expect(result.total).toBe(1);
    // go-live-14 / RQ-02, RQ-03, DEC-05 — ba khẳng định cũ (typeof là string, và nhãn 'Dien tu') đã
    // ĐỔI DẤU. Hàng rào thay thế: HAI văn bản dự án khác nhau — một mang keyword ngành, một không —
    // phải cho ĐÚNG một tập khóa công khai, và tập đó không mang khóa nhãn ngành. Chỉ phép so tập
    // khóa giữa hai văn bản mới chứng minh được nhãn không còn suy ra từ chữ.
    const plain = await listPublicJobProjection(publicProjectionTx('Lap rap bang mach'), {});
    expect(Object.keys(result.jobs[0]).sort()).toEqual(Object.keys(plain.jobs[0]).sort());
    expect(result.jobs[0]).not.toHaveProperty('industry');
    expect(plain.jobs[0]).not.toHaveProperty('industry');
  });
});
