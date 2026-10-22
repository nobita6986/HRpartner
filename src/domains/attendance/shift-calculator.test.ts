import { describe, expect, it } from 'vitest';
import {
  calculateShiftAttendanceHours,
  matchProjectShift,
  type ShiftDefinitionLike,
} from './shift-calculator';

const THREE_SHIFTS: ShiftDefinitionLike[] = [
  { code: 'CA1', name: 'Ca 1 (Sáng)', startTime: '06:00', endTime: '14:00', breakMinutes: 30, standardHours: 8, isActive: true },
  { code: 'CA2', name: 'Ca 2 (Chiều)', startTime: '14:00', endTime: '22:00', breakMinutes: 30, standardHours: 8, isActive: true },
  { code: 'CA3', name: 'Ca 3 (Đêm)', startTime: '22:00', endTime: '06:00', isOvernight: true, breakMinutes: 30, standardHours: 8, isActive: true },
];

describe('shift-calculator', () => {
  it('matches explicit shiftCode first, then auto-matches by checkInTime', () => {
    expect(matchProjectShift(THREE_SHIFTS, '06:05', 'CA2', null)?.code).toBe('CA2');
    expect(matchProjectShift(THREE_SHIFTS, '05:50', null, null)?.code).toBe('CA1');
    expect(matchProjectShift(THREE_SHIFTS, '13:55', null, null)?.code).toBe('CA2');
    expect(matchProjectShift(THREE_SHIFTS, '21:45', null, null)?.code).toBe('CA3');
  });

  it('calculates regularHours, ot15Hours, and workdays for day shift with break deduction', () => {
    const officeShift: ShiftDefinitionLike = {
      code: 'HC',
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 60,
      standardHours: 8,
    };

    // 08:00 -> 17:00 = 9h gross - 1h break = 8.0h regular, 0h OT, 1.0 workday
    const std = calculateShiftAttendanceHours({
      checkInTime: '08:00',
      checkOutTime: '17:00',
      shift: officeShift,
      workDate: new Date('2026-10-22T00:00:00.000Z'), // Thursday
    });
    expect(std).toMatchObject({
      shiftCode: 'HC',
      regularHours: 8,
      ot15Hours: 0,
      otHours: 0,
      workdays: 1,
      isComplete: true,
    });

    // 08:00 -> 19:30 = 11.5h gross - 1h break = 10.5h net -> 8.0h regular + 2.5h OT15
    const withOt = calculateShiftAttendanceHours({
      checkInTime: '08:00',
      checkOutTime: '19:30',
      shift: officeShift,
      workDate: new Date('2026-10-22T00:00:00.000Z'),
    });
    expect(withOt).toMatchObject({
      shiftCode: 'HC',
      regularHours: 8,
      ot15Hours: 2.5,
      otHours: 2.5,
      workdays: 1,
    });
  });

  it('calculates overnight shift across midnight (22:00 -> 06:30)', () => {
    const res = calculateShiftAttendanceHours({
      checkInTime: '22:00',
      checkOutTime: '06:30',
      shift: THREE_SHIFTS[2], // breakMinutes = 30, standardHours = 8
      workDate: new Date('2026-10-22T00:00:00.000Z'),
    });
    expect(res).toMatchObject({
      shiftCode: 'CA3',
      regularHours: 8,
      otHours: 0,
      workdays: 1,
      isComplete: true,
    });
  });
});
