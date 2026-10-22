import { inflateRawSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAttendanceExportWorkbook,
  collectAttendanceExportData,
} from './attendance-export.service';

describe('attendance-export.service', () => {
  it('merges TimesheetLine and GPS AttendanceEvents across all workers with attendance and computes shift workdays', async () => {
    const fakeTx = {
      timesheetLine: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'line-1',
            periodId: 'period-1',
            workerId: 'w-1',
            projectId: 'proj-1',
            assignmentId: 'asg-1',
            workDate: new Date('2026-10-20T00:00:00.000Z'),
            shiftCode: 'CA1',
            regularHours: 8,
            ot15Hours: 2,
            ot20Hours: 0,
            ot30Hours: 0,
            source: 'GPS_SELFIE',
            anomalyType: null,
            createdAt: new Date('2026-10-20T16:00:00.000Z'),
          },
        ]),
      },
      attendanceEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'ev-1-in',
            workerId: 'w-1',
            projectId: 'proj-1',
            assignmentId: 'asg-1',
            siteId: 'site-1',
            mobileAction: 'CHECK_IN',
            workDate: new Date('2026-10-20T00:00:00.000Z'),
            checkInTime: '06:00',
            checkOutTime: null,
            shiftCode: 'CA1',
            source: 'GPS',
            receivedAt: new Date('2026-10-20T06:00:00.000Z'),
            site: { id: 'site-1', name: 'Nhà máy Bắc Ninh' },
          },
          {
            id: 'ev-1-out',
            workerId: 'w-1',
            projectId: 'proj-1',
            assignmentId: 'asg-1',
            siteId: 'site-1',
            mobileAction: 'CHECK_OUT',
            workDate: new Date('2026-10-20T00:00:00.000Z'),
            checkInTime: null,
            checkOutTime: '16:30',
            shiftCode: 'CA1',
            source: 'GPS',
            receivedAt: new Date('2026-10-20T16:30:00.000Z'),
            site: { id: 'site-1', name: 'Nhà máy Bắc Ninh' },
          },
          // Worker 2 only has GPS events (not yet in timesheet_lines)
          {
            id: 'ev-2-in',
            workerId: 'w-2',
            projectId: 'proj-1',
            assignmentId: 'asg-2',
            siteId: 'site-1',
            mobileAction: 'CHECK_IN',
            workDate: new Date('2026-10-21T00:00:00.000Z'),
            checkInTime: '14:00',
            checkOutTime: null,
            shiftCode: null,
            source: 'GPS',
            receivedAt: new Date('2026-10-21T07:00:00.000Z'),
            site: { id: 'site-1', name: 'Nhà máy Bắc Ninh' },
          },
          {
            id: 'ev-2-out',
            workerId: 'w-2',
            projectId: 'proj-1',
            assignmentId: 'asg-2',
            siteId: 'site-1',
            mobileAction: 'CHECK_OUT',
            workDate: new Date('2026-10-21T00:00:00.000Z'),
            checkInTime: null,
            checkOutTime: '22:00',
            shiftCode: null,
            source: 'GPS',
            receivedAt: new Date('2026-10-21T15:00:00.000Z'),
            site: { id: 'site-1', name: 'Nhà máy Bắc Ninh' },
          },
        ]),
      },
      worker: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'w-1',
            userId: 'USR-001',
            fullName: 'Nguyễn Văn An',
            phone: '0912345678',
            cccdNumber: '001099001122',
            account: null,
          },
          {
            id: 'w-2',
            userId: 'USR-002',
            fullName: null,
            phone: null,
            cccdNumber: '001099003344',
            account: { name: 'Trần Thị Bình', phone: '0987654321' },
          },
        ]),
      },
      projectAssignment: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'asg-1',
            workerId: 'w-1',
            projectId: 'proj-1',
            employeeCode: 'BN-001',
            shiftCode: 'CA1',
            status: 'ACTIVE',
          },
          {
            id: 'asg-2',
            workerId: 'w-2',
            projectId: 'proj-1',
            employeeCode: 'BN-002',
            shiftCode: 'CA2',
            status: 'ACTIVE',
          },
        ]),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'proj-1', code: 'PRJ-BN01', name: 'Dự án Điện tử Bắc Ninh' },
        ]),
      },
      projectShift: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'shift-1',
            projectId: 'proj-1',
            code: 'CA1',
            name: 'Ca 1 (Sáng)',
            startTime: '06:00',
            endTime: '14:00',
            isOvernight: false,
            breakMinutes: 30,
            standardHours: 8,
            graceLateMinutes: 15,
            graceEarlyMinutes: 15,
            isActive: true,
          },
          {
            id: 'shift-2',
            projectId: 'proj-1',
            code: 'CA2',
            name: 'Ca 2 (Chiều)',
            startTime: '14:00',
            endTime: '22:00',
            isOvernight: false,
            breakMinutes: 0,
            standardHours: 8,
            graceLateMinutes: 15,
            graceEarlyMinutes: 15,
            isActive: true,
          },
        ]),
      },
    } as unknown as Parameters<typeof collectAttendanceExportData>[0];

    const result = await collectAttendanceExportData(fakeTx, {});

    expect(result.summaryRows).toHaveLength(2);
    expect(result.detailRows).toHaveLength(2);

    const w1Summary = result.summaryRows.find((r) => r.workerId === 'w-1')!;
    expect(w1Summary).toMatchObject({
      workerUserId: 'USR-001',
      employeeCode: 'BN-001',
      workerName: 'Nguyễn Văn An',
      workerPhone: '0912345678',
      projectCode: 'PRJ-BN01',
      projectName: 'Dự án Điện tử Bắc Ninh',
      shiftCode: 'CA1',
      shiftName: 'Ca 1 (Sáng) (06:00 - 14:00)',
      totalDays: 1,
      totalWorkdays: 1,
      totalRegularHours: 8,
      totalOtHours: 2,
      totalHours: 10,
    });

    const w2Summary = result.summaryRows.find((r) => r.workerId === 'w-2')!;
    expect(w2Summary).toMatchObject({
      workerUserId: 'USR-002',
      employeeCode: 'BN-002',
      workerName: 'Trần Thị Bình',
      workerPhone: '0987654321',
      projectCode: 'PRJ-BN01',
      shiftCode: 'CA2',
      shiftName: 'Ca 2 (Chiều) (14:00 - 22:00)',
      totalDays: 1,
      totalWorkdays: 1,
      totalRegularHours: 8,
      totalOtHours: 0,
      totalHours: 8,
    });

    const xlsxBuf = buildAttendanceExportWorkbook(result);
    // Verify ZIP magic header PK\x03\x04
    expect(xlsxBuf.subarray(0, 4).toString('binary')).toBe('PK\x03\x04');
    expect(xlsxBuf.toString('utf8')).toContain('xl/workbook.xml');
    expect(xlsxBuf.toString('utf8')).toContain('xl/worksheets/sheet1.xml');
    expect(xlsxBuf.toString('utf8')).toContain('xl/worksheets/sheet2.xml');

    // Decompress first entry ([Content_Types].xml) to verify valid deflate stream
    const nameLen = xlsxBuf.readUInt16LE(26);
    const compressedSize = xlsxBuf.readUInt32LE(18);
    const dataStart = 30 + nameLen;
    const inflated = inflateRawSync(xlsxBuf.subarray(dataStart, dataStart + compressedSize)).toString('utf8');
    expect(inflated).toContain('spreadsheetml.sheet.main+xml');
  });
});
