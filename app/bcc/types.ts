/**
 * Shared types giữa `app/bcc/page.tsx` và `actions.ts`
 */

export type DailyStatus = 'WORKING' | 'OVERTIME' | 'LATE' | 'ABSENT';

export interface DailyBreakdown {
  name: string;
  hours: number;
  rate: number | null;
}

export interface DailyData {
  date: string;
  status: DailyStatus;
  in?: string;
  out?: string;
  ot?: number;
  shiftType?: string;
  dayType?: string;
  breakdown?: DailyBreakdown[];
  isPadding?: boolean;
}

export interface PayrollItem {
  name: string;
  qty: number | null;
  rate: number | null;
  total: number;
}

export interface PayrollSummary {
  totalSalary: number;
  totalAllowance: number;
  grossIncome: number;
  totalDeduction: number;
  netIncome: number;
}

export interface PayrollData {
  salaryItems: PayrollItem[];
  allowances: PayrollItem[];
  deductions: PayrollItem[];
  summary: PayrollSummary;
}
