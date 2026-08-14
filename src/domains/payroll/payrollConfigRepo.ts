/**
 * payrollConfigRepo — Load effective-dated payroll_config snapshot
 *
 * Tuân thủ ADR-013: mọi tham số tính tiền phải reproducible.
 * Service `calculateVietnameseTaxes()` KHÔNG truy cập DB — caller phải:
 *   1. Gọi `loadTaxConfig(asOfDate)` để lấy snapshot tại thời điểm `asOfDate`.
 *   2. Truyền snapshot vào `calculateVietnameseTaxes()`.
 *   3. Lưu snapshot vào `worker_pay_results.calc_input_snapshot` (JSONB).
 */

import type { VietnameseTaxConfig, TaxBracket } from './calculateVietnameseTaxes';
import { DEFAULT_VN_TAX_CONFIG_2024 } from './calculateVietnameseTaxes';

/**
 * DB row shape (khớp với `payroll_config` table — v3.1 §12.5.1 B4).
 * Actual Prisma type sẽ được generate, đây là local typing.
 */
export interface PayrollConfigRow {
  key: string;
  valueJson: unknown;
  valueType: 'NUMBER' | 'PERCENT' | 'MONEY' | 'BOOLEAN' | 'STRING';
  version: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
}

/**
 * PrismaClient shape tối thiểu cần cho hàm này.
 * Tránh import trực tiếp @prisma/client để giảm coupling test.
 */
type ConfigLoader = {
  payrollConfig: {
    findMany: (args: {
      where: {
        isActive: true;
        effectiveFrom: { lte: Date };
        OR: Array<{ effectiveTo: null } | { effectiveTo: { gt: Date } }>;
      };
      orderBy: { effectiveFrom: 'desc' };
    }) => Promise<PayrollConfigRow[]>;
  };
  taxBracket: {
    findMany: (args: {
      where: {
        isActive: true;
        effectiveFrom: { lte: Date };
        OR: Array<{ effectiveTo: null } | { effectiveTo: { gt: Date } }>;
      };
      orderBy: { ordinal: 'asc' };
    }) => Promise<TaxBracketRow[]>;
  };
};

/** DB row shape cho `tax_brackets` (V4 F25 — bảng là nguồn sự thật cho PIT brackets) */
export interface TaxBracketRow {
  ordinal: number;
  lowerBoundVnd: bigint;
  upperBoundVnd: bigint | null;
  ratePercent: unknown; // Prisma.Decimal
  cumulativeTaxVnd: bigint;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
}

/**
 * Load tax config có hiệu lực tại `asOfDate`.
 *
 * Quy tắc:
 *   - Mỗi key chỉ lấy version mới nhất đang active tại `asOfDate`.
 *   - Nếu DB không có config cho 1 key bắt buộc → trả về DEFAULT_VN_TAX_CONFIG_2024
 *     (fail-safe: luôn có giá trị để chạy, nhưng ghi log cảnh báo).
 *   - Caller PHẢI lưu `calc_input_snapshot` để audit.
 */
export async function loadTaxConfig(
  db: ConfigLoader,
  asOfDate: Date,
): Promise<VietnameseTaxConfig> {
  const rows = await db.payrollConfig.findMany({
    where: {
      isActive: true,
      effectiveFrom: { lte: asOfDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  // Group rows by key, giữ bản mới nhất
  const latestByKey = new Map<string, PayrollConfigRow>();
  for (const row of rows) {
    if (!latestByKey.has(row.key)) latestByKey.set(row.key, row);
  }

  // Nếu thiếu key bắt buộc → trả default + log
  const requiredKeys = [
    'BHXH_RATE_EMPLOYEE',
    'BHYT_RATE_EMPLOYEE',
    'BHTN_RATE_EMPLOYEE',
    'BHXH_RATE_EMPLOYER',
    'BHYT_RATE_EMPLOYER',
    'BHTN_RATE_EMPLOYER',
    'BHTNLD_RATE_EMPLOYER',
    'INSURANCE_SALARY_CAP',
    'TNCN_GIAM_TRU_BAN_THAN',
    'TNCN_GIAM_TRU_NGUOI_PHUC_THUOC',
  ];
  const missing = requiredKeys.filter((k) => !latestByKey.has(k));
  if (missing.length > 0) {
    console.warn(
      `[payrollConfigRepo] Missing payroll_config keys for asOfDate=${asOfDate.toISOString()}: ` +
        `${missing.join(', ')}. Falling back to DEFAULT_VN_TAX_CONFIG_2024.`,
    );
    return DEFAULT_VN_TAX_CONFIG_2024;
  }

  // V4 (F25): PIT brackets đọc từ BẢNG tax_brackets (canonical) — không còn key JSON PIT_BRACKETS
  const bracketRows = await db.taxBracket.findMany({
    where: {
      isActive: true,
      effectiveFrom: { lte: asOfDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
    },
    orderBy: { ordinal: 'asc' },
  });
  const pitBrackets: TaxBracket[] = bracketRows.map((b) => ({
    lowerBoundVnd: b.lowerBoundVnd,
    ratePercent: Number(b.ratePercent),
    cumulativeTaxVnd: b.cumulativeTaxVnd,
  }));

  return buildConfigFromRows(latestByKey, pitBrackets, asOfDate);
}

function buildConfigFromRows(
  rows: Map<string, PayrollConfigRow>,
  pitBrackets: readonly TaxBracket[], // V4 (F25): từ bảng tax_brackets, không từ JSON
  asOfDate: Date,
): VietnameseTaxConfig {
  const get = (key: string): PayrollConfigRow => {
    const r = rows.get(key);
    if (!r) throw new Error(`Missing payroll_config key: ${key}`);
    return r;
  };

  return {
    configVersion: `${asOfDate.getFullYear()}-Q${Math.ceil((asOfDate.getMonth() + 1) / 3)}`,
    effectiveFrom: asOfDate,
    minWageRegion1Vnd: BigInt(get('MIN_WAGE_REGION_1').valueJson as number),
    insuranceSalaryCapVnd: BigInt(get('INSURANCE_SALARY_CAP').valueJson as number),
    bhxhEmployeeRate: get('BHXH_RATE_EMPLOYEE').valueJson as string,
    bhytEmployeeRate: get('BHYT_RATE_EMPLOYEE').valueJson as string,
    bhtnEmployeeRate: get('BHTN_RATE_EMPLOYEE').valueJson as string,
    bhxhEmployerRate: get('BHXH_RATE_EMPLOYER').valueJson as string,
    bhytEmployerRate: get('BHYT_RATE_EMPLOYER').valueJson as string,
    bhtnEmployerRate: get('BHTN_RATE_EMPLOYER').valueJson as string,
    bhtnldEmployerRate: get('BHTNLD_RATE_EMPLOYER').valueJson as string,
    personalDeductionVnd: BigInt(get('TNCN_GIAM_TRU_BAN_THAN').valueJson as number),
    dependentDeductionVnd: BigInt(get('TNCN_GIAM_TRU_NGUOI_PHUC_THUOC').valueJson as number),
    pitBrackets,
  };
}

/**
 * Serialize snapshot config để lưu vào `worker_pay_results.calc_input_snapshot` (JSONB).
 * BigInt → string để Prisma serialize được.
 */
export function serializeConfigSnapshot(cfg: VietnameseTaxConfig): unknown {
  return {
    configVersion: cfg.configVersion,
    effectiveFrom: cfg.effectiveFrom.toISOString(),
    minWageRegion1Vnd: cfg.minWageRegion1Vnd.toString(),
    insuranceSalaryCapVnd: cfg.insuranceSalaryCapVnd.toString(),
    bhxhEmployeeRate: cfg.bhxhEmployeeRate,
    bhytEmployeeRate: cfg.bhytEmployeeRate,
    bhtnEmployeeRate: cfg.bhtnEmployeeRate,
    bhxhEmployerRate: cfg.bhxhEmployerRate,
    bhytEmployerRate: cfg.bhytEmployerRate,
    bhtnEmployerRate: cfg.bhtnEmployerRate,
    bhtnldEmployerRate: cfg.bhtnldEmployerRate,
    personalDeductionVnd: cfg.personalDeductionVnd.toString(),
    dependentDeductionVnd: cfg.dependentDeductionVnd.toString(),
    pitBrackets: cfg.pitBrackets.map((b) => ({
      lowerBoundVnd: b.lowerBoundVnd.toString(),
      ratePercent: b.ratePercent,
      cumulativeTaxVnd: b.cumulativeTaxVnd.toString(),
    })),
  };
}
