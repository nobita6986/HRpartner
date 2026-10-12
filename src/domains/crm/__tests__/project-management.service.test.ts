/**
 * project-management.service.test.ts — T1A PRE-P2 PROJECT MANAGEMENT HOTFIX.
 *
 * Pure unit tests cho `project-management.service`:
 *   - state machine + terminal guard (DRAFT/ACTIVE/PAUSED → COMPLETED/CANCELLED
 *     ⇒ không transition ngược).
 *   - deleteProject() chỉ ADMIN (PERMISSION_DENIED nếu khác).
 *   - deleteProject() scan đầy đủ relation; 4 relation > 0 ⇒ PROJECT_NOT_DELETABLE.
 *   - deleteProject() orphan (count = 0 hết) ⇒ delete thành công.
 *   - updateProjectStatus: stale lock re-read; same status no-op; non-ADMIN 403.
 *   - validateProjectUpdateInput: strict allowlist, date round-trip, quota safe int.
 *   - RQ-05: RACE — concurrent inserter giữa lock acquire & delete phải thấy
 *     dep mới (mock tx $executeRaw trả 1, findUnique trả count mới).
 *
 * Vitest unit lane (DB fail-closed). Mocks toàn bộ `tx`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PROJECT_DELETE_ROLES,
  PROJECT_STATUSES,
  PROJECT_TRANSITIONS,
  PROJECT_UPDATE_ROLES,
  ProjectManagementServiceError,
  canTransitionProjectStatus,
  deleteProject,
  describeBlockingDependencies,
  scanProjectDependencies,
  updateProjectStatus,
  validateProjectUpdateInput,
  type ProjectLifecycleStatus,
} from '../project-management.service';

function makeTx(opts: {
  projectRow?: { id: string; code: string; status: string } | null;
  counts?: Partial<{
    staffingOrders: number;
    candidateSubmissions: number;
    projectAssignments: number;
    sites: number;
    placements: number;
  }>;
  throwOnDelete?: Error;
} = {}) {
  const counts = {
    staffingOrders: 0,
    candidateSubmissions: 0,
    projectAssignments: 0,
    sites: 0,
    placements: 0,
    ...(opts.counts ?? {}),
  };

  const tx: any = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    project: {
      findUnique: vi.fn().mockResolvedValue(
        opts.projectRow === undefined ? { id: 'p1', code: 'PRJ-1', status: 'DRAFT' } : opts.projectRow,
      ),
      delete: vi.fn().mockImplementation(() => {
        if (opts.throwOnDelete) throw opts.throwOnDelete;
        return Promise.resolve({ id: 'p1' });
      }),
      update: vi.fn().mockResolvedValue({ id: 'p1', status: 'ACTIVE' }),
    },
    staffingOrder: { count: vi.fn().mockResolvedValue(counts.staffingOrders) },
    candidateSubmission: { count: vi.fn().mockResolvedValue(counts.candidateSubmissions) },
    projectAssignment: { count: vi.fn().mockResolvedValue(counts.projectAssignments) },
    site: { count: vi.fn().mockResolvedValue(counts.sites) },
    placement: { count: vi.fn().mockResolvedValue(counts.placements) },
  };
  return tx;
}

describe('project-management.service — state machine & helpers', () => {
  it('canTransitionProjectStatus cho phép non-terminal ↔ non-terminal', () => {
    expect(canTransitionProjectStatus('DRAFT', 'ACTIVE')).toBe(true);
    expect(canTransitionProjectStatus('DRAFT', 'PAUSED')).toBe(true);
    expect(canTransitionProjectStatus('ACTIVE', 'PAUSED')).toBe(true);
    expect(canTransitionProjectStatus('PAUSED', 'ACTIVE')).toBe(true);
    expect(canTransitionProjectStatus('ACTIVE', 'DRAFT')).toBe(true);
  });

  it('canTransitionProjectStatus cho phép mọi non-terminal → COMPLETED/CANCELLED', () => {
    for (const from of ['DRAFT', 'ACTIVE', 'PAUSED'] as ProjectLifecycleStatus[]) {
      expect(canTransitionProjectStatus(from, 'COMPLETED')).toBe(true);
      expect(canTransitionProjectStatus(from, 'CANCELLED')).toBe(true);
    }
  });

  it('COMPLETED và CANCELLED là terminal — KHÔNG transition ra ngoài', () => {
    for (const to of PROJECT_STATUSES) {
      expect(canTransitionProjectStatus('COMPLETED', to)).toBe(false);
      expect(canTransitionProjectStatus('CANCELLED', to)).toBe(false);
    }
  });

  it('enum unknown ⇒ canTransitionProjectStatus trả false', () => {
    expect(canTransitionProjectStatus('UNKNOWN', 'ACTIVE')).toBe(false);
    expect(canTransitionProjectStatus('DRAFT', 'XYZ')).toBe(false);
  });

  it('PROJECT_TRANSITIONS map mirror schema contract', () => {
    expect(PROJECT_TRANSITIONS.DRAFT).toEqual(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.ACTIVE).toEqual(['DRAFT', 'PAUSED', 'COMPLETED', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.PAUSED).toEqual(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.COMPLETED).toEqual([]);
    expect(PROJECT_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('PROJECT_UPDATE_ROLES = ADMIN/HR_MANAGER/PM; PROJECT_DELETE_ROLES = ADMIN only', () => {
    expect(Array.from(PROJECT_UPDATE_ROLES)).toEqual(['ADMIN', 'HR_MANAGER', 'PM']);
    expect(Array.from(PROJECT_DELETE_ROLES)).toEqual(['ADMIN']);
  });
});

describe('project-management.service — describeBlockingDependencies', () => {
  it('zero mọi thứ ⇒ danh sách rỗng', () => {
    expect(describeBlockingDependencies({
      staffingOrderCount: 0,
      candidateSubmissionCount: 0,
      projectAssignmentCount: 0,
      siteCount: 0,
      placementsCount: 0,
    })).toEqual([]);
  });

  it('mỗi relation > 0 ⇒ vi-VN label xuất hiện trong danh sách', () => {
    const facts = describeBlockingDependencies({
      staffingOrderCount: 2,
      candidateSubmissionCount: 5,
      projectAssignmentCount: 1,
      siteCount: 3,
      placementsCount: 0,
    });
    expect(facts).toContain('2 nhu cầu tuyển dụng');
    expect(facts).toContain('5 đơn ứng tuyển');
    expect(facts).toContain('1 phân công người lao động');
    expect(facts).toContain('3 địa điểm công trường');
    expect(facts).toHaveLength(4);
  });

  it('placementsCount > 0 ⇒ "bố trí việc làm" xuất hiện (canonical VI theo glossary)', () => {
    // Correction #1: placement là blocking thật (giữ nguyên liên kết),
    // KHÔNG còn là "audit only". Đảm bảo VI label khớp glossary canonical.
    const facts = describeBlockingDependencies({
      staffingOrderCount: 0,
      candidateSubmissionCount: 0,
      projectAssignmentCount: 0,
      siteCount: 0,
      placementsCount: 4,
    });
    expect(facts).toContain('4 bố trí việc làm');
    expect(facts).toHaveLength(1);
  });

  it('mixed (nhiều relation > 0) — placement label đứng cùng các blocking khác', () => {
    const facts = describeBlockingDependencies({
      staffingOrderCount: 1,
      candidateSubmissionCount: 2,
      projectAssignmentCount: 0,
      siteCount: 0,
      placementsCount: 3,
    });
    expect(facts).toEqual([
      '1 nhu cầu tuyển dụng',
      '2 đơn ứng tuyển',
      '3 bố trí việc làm',
    ]);
  });
});

describe('project-management.service — scanProjectDependencies', () => {
  it('trả về counts đầy đủ từ 5 relation blocking', async () => {
    const tx = makeTx({
      counts: {
        staffingOrders: 1,
        candidateSubmissions: 2,
        projectAssignments: 3,
        sites: 4,
        placements: 5,
      },
    });
    const report = await scanProjectDependencies(tx, 'p1');
    expect(report).toEqual({
      staffingOrderCount: 1,
      candidateSubmissionCount: 2,
      projectAssignmentCount: 3,
      siteCount: 4,
      placementsCount: 5,
    });
    // Đảm bảo tất cả 5 delegate `count` được gọi với đúng where.
    expect(tx.staffingOrder.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    expect(tx.candidateSubmission.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    expect(tx.projectAssignment.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    expect(tx.site.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    expect(tx.placement.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
  });
});

describe('project-management.service — updateProjectStatus', () => {
  const ctx = (role: string) => ({ userId: 'u-1', role: role as any });

  it('non-ADMIN/HR_MANAGER/PM ⇒ PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(updateProjectStatus(tx, ctx('HR_STAFF'), 'p1', 'ACTIVE')).rejects.toMatchObject({
      name: 'ProjectManagementServiceError',
      code: 'PERMISSION_DENIED',
    });
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('lock acquire chạy TRƯỚC khi đọc row', async () => {
    const order: string[] = [];
    const tx = makeTx();
    tx.$executeRawUnsafe.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve(1);
    });
    tx.project.findUnique.mockImplementation(() => {
      order.push('findUnique');
      return Promise.resolve({ id: 'p1', code: 'PRJ-1', status: 'DRAFT' });
    });
    await updateProjectStatus(tx, ctx('ADMIN'), 'p1', 'ACTIVE');
    expect(order).toEqual(['lock', 'findUnique']);
    // Lock key MUST là canonical p1a04:project:<id> + bit-masked signature.
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )',
      'p1a04:project:p1',
    );
  });

  it('no-op khi cùng status', async () => {
    const tx = makeTx({ projectRow: { id: 'p1', code: 'PRJ-1', status: 'ACTIVE' } });
    const updated = await updateProjectStatus(tx, ctx('ADMIN'), 'p1', 'ACTIVE');
    expect(updated).toEqual({ id: 'p1', status: 'ACTIVE' });
    expect(tx.project.update).not.toHaveBeenCalled();
  });

  it('transition hợp lệ ⇒ update thành công', async () => {
    const tx = makeTx({ projectRow: { id: 'p1', code: 'PRJ-1', status: 'DRAFT' } });
    const updated = await updateProjectStatus(tx, ctx('PM'), 'p1', 'ACTIVE');
    expect(updated).toEqual({ id: 'p1', status: 'ACTIVE' });
    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'ACTIVE' },
      select: { id: true, status: true },
    });
  });

  it('transition ngược từ COMPLETED ⇒ INVALID_TRANSITION', async () => {
    const tx = makeTx({ projectRow: { id: 'p1', code: 'PRJ-1', status: 'COMPLETED' } });
    await expect(updateProjectStatus(tx, ctx('ADMIN'), 'p1', 'ACTIVE')).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
    expect(tx.project.update).not.toHaveBeenCalled();
  });

  it('project không tồn tại ⇒ NOT_FOUND', async () => {
    const tx = makeTx({ projectRow: null });
    await expect(updateProjectStatus(tx, ctx('ADMIN'), 'missing', 'ACTIVE')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('project-management.service — deleteProject', () => {
  const adminCtx = () => ({ userId: 'admin-1', role: 'ADMIN' as any });
  const hrCtx = () => ({ userId: 'h-1', role: 'HR_MANAGER' as any });

  it('non-ADMIN ⇒ PERMISSION_DENIED', async () => {
    const tx = makeTx();
    await expect(deleteProject(tx, hrCtx(), 'p1')).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('orphan (zero deps) ⇒ xoá thành công', async () => {
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'DRAFT' },
      counts: { staffingOrders: 0, candidateSubmissions: 0, projectAssignments: 0, sites: 0, placements: 0 },
    });
    const result = await deleteProject(tx, adminCtx(), 'p1');
    expect(result).toEqual({ id: 'p1', deleted: true });
    expect(tx.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('StaffingOrder > 0 ⇒ PROJECT_NOT_DELETABLE + guidance "Hoàn thành/Huỷ dự án"', async () => {
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'ACTIVE' },
      counts: { staffingOrders: 2 },
    });
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
    let caught: ProjectManagementServiceError | null = null;
    try {
      await deleteProject(tx, adminCtx(), 'p1');
    } catch (e) {
      caught = e as ProjectManagementServiceError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toMatch(/nhu cầu tuyển dụng/);
    expect(caught!.message).toMatch(/Hoàn thành dự án|Huỷ dự án/);
    expect(tx.project.delete).not.toHaveBeenCalled();
  });

  it('CandidateSubmission > 0 ⇒ PROJECT_NOT_DELETABLE', async () => {
    const tx = makeTx({
      counts: { candidateSubmissions: 1 },
    });
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
  });

  it('ProjectAssignment > 0 ⇒ PROJECT_NOT_DELETABLE', async () => {
    const tx = makeTx({ counts: { projectAssignments: 1 } });
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
  });

  it('Site > 0 ⇒ PROJECT_NOT_DELETABLE', async () => {
    const tx = makeTx({ counts: { sites: 1 } });
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
  });

  // Correction #1 (T0 directive, budget 1): placement phải block deletion
  // để giữ nguyên liên kết — KHÔNG cho phép SetNull ngầm qua DB cascade.
  it('CORR1: placementsCount > 0 ⇒ PROJECT_NOT_DELETABLE + VI "bố trí việc làm"', async () => {
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'ACTIVE' },
      counts: { placements: 3 },
    });
    let caught: ProjectManagementServiceError | null = null;
    try {
      await deleteProject(tx, adminCtx(), 'p1');
    } catch (e) {
      caught = e as ProjectManagementServiceError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.code).toBe('PROJECT_NOT_DELETABLE');
    expect(caught!.message).toMatch(/3 bố trí việc làm/);
    expect(caught!.message).toMatch(/Hoàn thành dự án|Huỷ dự án/);
    // KHÔNG gọi project.delete; KHÔNG SetNull ở placement.
    expect(tx.project.delete).not.toHaveBeenCalled();
    // Vẫn scan placements (audit trail đầy đủ + block dựa trên count).
    expect(tx.placement.count).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
  });

  it('CORR1: placementsCount > 0 + các relation khác = 0 ⇒ vẫn PROJECT_NOT_DELETABLE', async () => {
    // Đảm bảo placement MỘT MÌNH đã block (không cần relation khác đi kèm).
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'ACTIVE' },
      counts: {
        staffingOrders: 0,
        candidateSubmissions: 0,
        projectAssignments: 0,
        sites: 0,
        placements: 1,
      },
    });
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
    expect(tx.project.delete).not.toHaveBeenCalled();
  });

  it('CORR1: orphan (placements = 0 + 4 relation kia = 0) ⇒ vẫn delete được', async () => {
    // Regression: khi placementsCount = 0, KHÔNG cản trở orphan delete path.
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'DRAFT' },
      counts: {
        staffingOrders: 0,
        candidateSubmissions: 0,
        projectAssignments: 0,
        sites: 0,
        placements: 0,
      },
    });
    const result = await deleteProject(tx, adminCtx(), 'p1');
    expect(result).toEqual({ id: 'p1', deleted: true });
    expect(tx.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('CORR1: RACE — placementsCount 0 ở snapshot nhưng > 0 sau re-read ⇒ PROJECT_NOT_DELETABLE', async () => {
    // Phase 1: lock → findUnique(project) → re-read counts (sau lock) →
    // placementsCount bỗng dưng > 0 do concurrent inserter đã COMMIT ngay
    // trước khi ta acquire lock ⇒ typed 409.
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'DRAFT' },
      counts: {
        staffingOrders: 0,
        candidateSubmissions: 0,
        projectAssignments: 0,
        sites: 0,
        placements: 0,
      },
    });
    tx.placement.count.mockResolvedValueOnce(2);
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
    expect(tx.project.delete).not.toHaveBeenCalled();
  });

  it('CORR1: placement count nằm DƯỚI advisory lock (sau findUnique)', async () => {
    // lockSequence đảm bảo placement count được gọi SAU findUnique (dưới lock)
    // — chống race-condition. Nếu thứ tự sai, scan có thể bị race với
    // concurrent inserter đã bypass lock.
    const order: string[] = [];
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'DRAFT' },
      counts: {
        staffingOrders: 0,
        candidateSubmissions: 0,
        projectAssignments: 0,
        sites: 0,
        placements: 0,
      },
    });
    tx.$executeRawUnsafe.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve(1);
    });
    tx.project.findUnique.mockImplementation(() => {
      order.push('findUnique');
      return Promise.resolve({ id: 'p1', code: 'PRJ-1', status: 'DRAFT' });
    });
    tx.placement.count.mockImplementation(() => {
      order.push('placement.count');
      return Promise.resolve(0);
    });
    await deleteProject(tx, adminCtx(), 'p1');
    expect(order).toEqual(['lock', 'findUnique', 'placement.count']);
  });

  it('project không tồn tại ⇒ NOT_FOUND', async () => {
    const tx = makeTx({ projectRow: null });
    await expect(deleteProject(tx, adminCtx(), 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('RACE: lock acquire + findUnique (snapshot) rồi re-read (counts) — khi concurrent inserter đã COMMIT', async () => {
    // Phase 1: lock → findUnique(0 deps) → re-read(>0 deps) → typed 409.
    const tx = makeTx({
      projectRow: { id: 'p1', code: 'PRJ-1', status: 'DRAFT' },
      counts: { staffingOrders: 0, candidateSubmissions: 0, projectAssignments: 0, sites: 0, placements: 0 },
    });
    // Simulate race: Phase 1 findUnique(project) trả zero deps; Phase 2
    // re-read counts (sau lock) bỗng nhiên thấy 1 staffingOrder do concurrent
    // inserter đã COMMIT ngay trước khi ta acquire lock.
    tx.staffingOrder.count.mockResolvedValueOnce(1);
    await expect(deleteProject(tx, adminCtx(), 'p1')).rejects.toMatchObject({
      code: 'PROJECT_NOT_DELETABLE',
    });
    expect(tx.project.delete).not.toHaveBeenCalled();
  });
});

describe('project-management.service — validateProjectUpdateInput', () => {
  it('body null ⇒ fail', () => {
    const r = validateProjectUpdateInput(null);
    expect(r.ok).toBe(false);
  });

  it('unknown field bị từ chối (allowlist strict)', () => {
    const r = validateProjectUpdateInput({ name: 'X', foo: 'bar' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Trường không hợp lệ: foo/);
  });

  it('name rỗng ⇒ fail', () => {
    const r = validateProjectUpdateInput({ name: '   ' });
    expect(r.ok).toBe(false);
  });

  it('name hợp lệ ⇒ trim & ok', () => {
    const r = validateProjectUpdateInput({ name: '  Dự án Y  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Dự án Y');
  });

  it('startDate invalid (Date round-trip fail) ⇒ fail', () => {
    const r = validateProjectUpdateInput({ startDate: '2026-02-30' });
    expect(r.ok).toBe(false);
  });

  it('endDate < startDate ⇒ fail', () => {
    const r = validateProjectUpdateInput({ startDate: '2026-12-01', endDate: '2026-01-01' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/kết thúc/);
  });

  it('endDate = null OK', () => {
    const r = validateProjectUpdateInput({ endDate: null });
    expect(r.ok).toBe(true);
  });

  it('status ngoài enum ⇒ fail', () => {
    const r = validateProjectUpdateInput({ status: 'FROZEN' });
    expect(r.ok).toBe(false);
  });

  it('quota âm ⇒ fail', () => {
    const r = validateProjectUpdateInput({ quota: -1 });
    expect(r.ok).toBe(false);
  });

  it('quota > MAX_SAFE_INTEGER ⇒ fail', () => {
    const r = validateProjectUpdateInput({ quota: Number.MAX_SAFE_INTEGER + 2 });
    expect(r.ok).toBe(false);
  });

  it('quota = 0 OK; quota = null OK', () => {
    expect(validateProjectUpdateInput({ quota: 0 }).ok).toBe(true);
    expect(validateProjectUpdateInput({ quota: null }).ok).toBe(true);
  });

  it('pmUserId null OK; pmUserId string OK', () => {
    expect(validateProjectUpdateInput({ pmUserId: null }).ok).toBe(true);
    expect(validateProjectUpdateInput({ pmUserId: 'u-1' }).ok).toBe(true);
  });

  it('siteAddress null OK', () => {
    expect(validateProjectUpdateInput({ siteAddress: null }).ok).toBe(true);
  });

  it('multi-field hợp lệ ⇒ trả về object đầy đủ', () => {
    const r = validateProjectUpdateInput({
      name: '  PRJ-2026  ',
      clientCompanyId: 'c-1',
      pmUserId: 'u-9',
      siteAddress: 'KCN X',
      startDate: '2026-01-01',
      endDate: null,
      status: 'ACTIVE',
      quota: 25,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        name: 'PRJ-2026',
        clientCompanyId: 'c-1',
        pmUserId: 'u-9',
        siteAddress: 'KCN X',
        startDate: '2026-01-01',
        endDate: null,
        status: 'ACTIVE',
        quota: 25,
      });
    }
  });
});