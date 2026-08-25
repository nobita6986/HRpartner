/**
 * Admin application detail DTO — MP-3 additions (STEP-06 / RQ-08, AC-07).
 *
 * Asserts the three things the contract cares about:
 *   1. the MP-3 facts are present (version, workerId, source claim, dedup, assignment),
 *   2. no forbidden field rides along (no rate/margin/internal source evidence),
 *   3. the reader boundary is UNCHANGED — ADMIN/HR_MANAGER/DIRECTOR/SALE read,
 *      everyone else (incl. HR_STAFF) gets a stable FORBIDDEN.
 */
import { describe, expect, it, vi } from 'vitest';
import { getApplicationDetail, AdminApplicationError } from './application-queue.service';

const ROW = {
  id: 'sub-1',
  fullName: 'Ứng viên A',
  phone: '0909000111',
  status: 'CONVERTED',
  slotId: 'slot-1',
  projectId: 'project-1',
  publicTrackingCode: 'APP-ABCD-EFGH',
  vendorId: 'vendor-1',
  ctvId: null,
  createdAt: new Date('2026-08-20T00:00:00.000Z'),
  cccdNumber: '079123456789',
  dateOfBirth: new Date('1995-05-05T00:00:00.000Z'),
  gender: 'MALE',
  experience: '3 năm',
  cvFileName: 'cv.pdf',
  cvMimeType: 'application/pdf',
  cvSizeBytes: 12345,
  consentAt: new Date('2026-08-20T00:00:00.000Z'),
  version: 4,
  workerId: 'worker-1',
  dedupWorkerId: 'worker-9',
  mergedWorkerId: null,
  blockCode: 'IN_7D_WINDOW',
  overrideCase: 'S2',
  project: { name: 'Project One' },
  statusHistory: [
    { id: 'h1', fromStatus: 'QUALIFIED', toStatus: 'CONVERTED', actorUserId: 'hr-1', reason: 'ok', createdAt: new Date('2026-08-21T00:00:00.000Z') },
  ],
  sourceClaims: [
    { id: 'claim-1', claimType: 'VENDOR_SUPPLIED', registrationChannel: 'VENDOR_ADDED', accepted: true, workerId: 'worker-1' },
  ],
  assignment: {
    id: 'assign-1', status: 'ACTIVE', projectId: 'project-1', staffingOrderId: 'order-1',
    staffingOrderSlotId: 'slot-1', employeeCode: 'PRJ1-001', employmentType: 'OUTSOURCED',
    validFrom: new Date('2026-08-25T00:00:00.000Z'), validTo: null,
  },
};

function tx(row: unknown = ROW) {
  return {
    candidateSubmission: { findUnique: vi.fn(async () => row) },
  } as never;
}

describe('getApplicationDetail — MP-3 projection (RQ-08)', () => {
  it('exposes version, canonical workerId, accepted source claim, dedup facts and the placement', async () => {
    const detail = await getApplicationDetail(tx(), { userId: 'hr-1', role: 'HR_MANAGER' } as never, 'sub-1');

    expect(detail.version).toBe(4);
    expect(detail.workerId).toBe('worker-1');
    expect(detail.sourceClaim).toEqual({
      id: 'claim-1', claimType: 'VENDOR_SUPPLIED', registrationChannel: 'VENDOR_ADDED', accepted: true,
    });
    expect(detail.dedup).toEqual({
      dedupWorkerId: 'worker-9', mergedWorkerId: null, blockCode: 'IN_7D_WINDOW', overrideCase: 'S2',
    });
    expect(detail.assignment).toEqual({
      assignmentId: 'assign-1', status: 'ACTIVE', projectId: 'project-1', staffingOrderId: 'order-1',
      staffingOrderSlotId: 'slot-1', employeeCode: 'PRJ1-001', employmentType: 'OUTSOURCED',
      validFrom: ROW.assignment.validFrom, validTo: null,
    });
  });

  it('keeps the MP-2 fields intact (no regression)', async () => {
    const detail = await getApplicationDetail(tx(), { userId: 'a', role: 'ADMIN' } as never, 'sub-1');
    expect(detail).toMatchObject({
      id: 'sub-1', fullName: 'Ứng viên A', status: 'CONVERTED', source: 'VENDOR',
      projectName: 'Project One', publicTrackingCode: 'APP-ABCD-EFGH', cvFileName: 'cv.pdf',
    });
    expect(detail.statusHistory).toHaveLength(1);
  });

  it('returns nulls when the application has no claim and no placement yet', async () => {
    const detail = await getApplicationDetail(
      tx({ ...ROW, status: 'NEW', workerId: null, sourceClaims: [], assignment: null, version: 0 }),
      { userId: 'a', role: 'ADMIN' } as never, 'sub-1',
    );
    expect(detail.workerId).toBeNull();
    expect(detail.sourceClaim).toBeNull();
    expect(detail.assignment).toBeNull();
    expect(detail.version).toBe(0);
  });

  it('never leaks rate, margin or internal source evidence', async () => {
    const detail = await getApplicationDetail(tx(), { userId: 'a', role: 'ADMIN' } as never, 'sub-1');
    const keys = JSON.stringify(detail).toLowerCase();
    for (const forbidden of ['hourlyrate', 'hourly_rate', 'margin', 'salary', 'ratecard', 'acceptedby', 'claimedby']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it.each(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE'])('keeps %s as a reader (DEC-06 unchanged)', async (role) => {
    await expect(getApplicationDetail(tx(), { userId: 'u', role } as never, 'sub-1')).resolves.toBeDefined();
  });

  it.each(['HR_STAFF', 'PM', 'ACCOUNTANT', 'VENDOR_ADMIN', 'CTV', 'WORKER', 'MKT'])(
    'still denies %s with FORBIDDEN', async (role) => {
      await expect(getApplicationDetail(tx(), { userId: 'u', role } as never, 'sub-1'))
        .rejects.toMatchObject({ name: 'AdminApplicationError', code: 'FORBIDDEN', httpStatus: 403 });
    },
  );

  it('404s a missing or out-of-scope application', async () => {
    await expect(getApplicationDetail(tx(null), { userId: 'a', role: 'ADMIN' } as never, 'nope'))
      .rejects.toBeInstanceOf(AdminApplicationError);
  });
});
