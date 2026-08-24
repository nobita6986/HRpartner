export const OPERATIONS_FIXTURE_VERSION = 'v5-g0-05.1' as const;

export type OperationScenarioKey =
  | 'fullMonth'
  | 'midMonthTransfer'
  | 'nightShift'
  | 'overtime'
  | 'correction'
  | 'dispute';

export interface OperationAttendanceLine {
  id: string;
  workerId: string;
  projectId: string;
  workDate: string;
  shiftStartedAt: string;
  shiftEndedAt: string;
  regularHours: number;
  nightHours: number;
  ot15Hours: number;
  ot20Hours: number;
  ot30Hours: number;
}

export interface OperationCorrection {
  lineId: string;
  originalRegularHours: number;
  correctedRegularHours: number;
  reasonCode: 'MISSING_PUNCH';
}

export interface OperationDispute {
  statementId: string;
  statementAmountVnd: string;
  disputedAmountVnd: string;
  round: 1;
  reasonCode: 'HOURS_MISMATCH';
}

export interface OperationScenario {
  key: OperationScenarioKey;
  period: '2026-09';
  workerId: string;
  lines: OperationAttendanceLine[];
  correction?: OperationCorrection;
  dispute?: OperationDispute;
}

const SEPTEMBER_2026_WORKDAYS = [
  '01', '02', '03', '04', '07', '08', '09', '10', '11', '14', '15',
  '16', '17', '18', '21', '22', '23', '24', '25', '28', '29', '30',
] as const;

function dayLine(
  scenario: string,
  day: string,
  projectId: string,
  overrides: Partial<OperationAttendanceLine> = {},
): OperationAttendanceLine {
  const workDate = `2026-09-${day}`;
  return {
    id: `g005:${scenario}:line:${day}`,
    workerId: `g005:worker:${scenario}`,
    projectId,
    workDate,
    shiftStartedAt: `${workDate}T08:00:00+07:00`,
    shiftEndedAt: `${workDate}T16:00:00+07:00`,
    regularHours: 8,
    nightHours: 0,
    ot15Hours: 0,
    ot20Hours: 0,
    ot30Hours: 0,
    ...overrides,
  };
}

const fullMonthLines = SEPTEMBER_2026_WORKDAYS.map((day) =>
  dayLine('full-month', day, 'g005:project:a'),
);

const transferLines = SEPTEMBER_2026_WORKDAYS.slice(0, 20).map((day, index) =>
  dayLine('mid-month-transfer', day, index < 10 ? 'g005:project:a' : 'g005:project:b'),
);

export const OPERATION_FIXTURES: Readonly<Record<OperationScenarioKey, OperationScenario>> = {
  fullMonth: {
    key: 'fullMonth',
    period: '2026-09',
    workerId: 'g005:worker:full-month',
    lines: fullMonthLines,
  },
  midMonthTransfer: {
    key: 'midMonthTransfer',
    period: '2026-09',
    workerId: 'g005:worker:mid-month-transfer',
    lines: transferLines,
  },
  nightShift: {
    key: 'nightShift',
    period: '2026-09',
    workerId: 'g005:worker:night-shift',
    lines: [dayLine('night-shift', '15', 'g005:project:a', {
      shiftStartedAt: '2026-09-15T22:00:00+07:00',
      shiftEndedAt: '2026-09-16T06:00:00+07:00',
      nightHours: 8,
    })],
  },
  overtime: {
    key: 'overtime',
    period: '2026-09',
    workerId: 'g005:worker:overtime',
    lines: [dayLine('overtime', '18', 'g005:project:a', {
      shiftEndedAt: '2026-09-18T19:00:00+07:00',
      ot15Hours: 2,
      ot20Hours: 1,
    })],
  },
  correction: {
    key: 'correction',
    period: '2026-09',
    workerId: 'g005:worker:correction',
    lines: [dayLine('correction', '21', 'g005:project:a')],
    correction: {
      lineId: 'g005:correction:line:21',
      originalRegularHours: 7.5,
      correctedRegularHours: 8,
      reasonCode: 'MISSING_PUNCH',
    },
  },
  dispute: {
    key: 'dispute',
    period: '2026-09',
    workerId: 'g005:worker:dispute',
    lines: [dayLine('dispute', '22', 'g005:project:a')],
    dispute: {
      statementId: 'g005:statement:vendor:2026-09',
      statementAmountVnd: '12000000',
      disputedAmountVnd: '800000',
      round: 1,
      reasonCode: 'HOURS_MISMATCH',
    },
  },
};

export function materializeOperationFixtures(): Record<OperationScenarioKey, OperationScenario> {
  return JSON.parse(JSON.stringify(OPERATION_FIXTURES)) as Record<OperationScenarioKey, OperationScenario>;
}

export function summarizeOperationScenario(scenario: OperationScenario) {
  const projectHours: Record<string, number> = {};
  let regularHours = 0;
  let nightHours = 0;
  let overtimeHours = 0;

  for (const line of scenario.lines) {
    const total = line.regularHours + line.ot15Hours + line.ot20Hours + line.ot30Hours;
    projectHours[line.projectId] = (projectHours[line.projectId] ?? 0) + total;
    regularHours += line.regularHours;
    nightHours += line.nightHours;
    overtimeHours += line.ot15Hours + line.ot20Hours + line.ot30Hours;
  }

  return { regularHours, nightHours, overtimeHours, totalHours: regularHours + overtimeHours, projectHours };
}
