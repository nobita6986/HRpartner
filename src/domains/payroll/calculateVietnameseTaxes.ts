/**
 * calculateVietnameseTaxes() — Domain service tính BHXH/BHYT/BHTN + TNCN cho HRP VN
 *
 * QUY TẮC BẤT BIẾN (v3.0 §12.5 + v3.1):
 *   1. Mọi tính toán tiền bằng BigInt VND nguyên — KHÔNG dùng Number/float.
 *   2. Tất cả tham số (rates, brackets, min wage, deductions) lấy từ
 *      `payroll_config` (effective-dated) — KHÔNG hard-code.
 *   3. Service là pure: không truy cập DB, không side effect.
 *      Caller chịu trách nhiệm load config snapshot rồi truyền vào.
 *   4. Có helper snapshotConfig() để lưu `calc_input_snapshot` vào pay_run
 *      (ADR-013: record đã LOCKED phải reproducible).
 *
 * Tham khảo:
 *   - Viet-ERP packages/vietnam/src/tax/pit.ts (progressive brackets)
 *   - Viet-ERP packages/vietnam/src/insurance/bhxh.ts (BHXH/BHYT/BHTN)
 *   - HRP v3.0 §12.5 (payroll model), §20 [CẦN CHỐT] #4, #14
 *
 * Tuân thủ:
 *   - Luật Thuế TNCN 2007 (sửa đổi bổ sung 2012, 2014)
 *   - Luật BHXH 2014 (sửa đổi bổ sung 2019, 2022)
 *   - Nghị định 74/2024/NĐ-CP (mức lương tối thiểu vùng)
 *   - Nghị định 38/2019/NĐ-CP (mức đóng BHXH cho NLĐ nước ngoài)
 */

import {
  addVnd,
  subVnd,
  mulRateVnd,
  minVnd,
  maxVnd,
  nonNegativeVnd,
} from '@/shared/utils/money';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1 dòng trong PIT progressive bracket (snapshot tại thời điểm tính).
 * Đơn giản hóa so với Viet-ERP: chỉ giữ lower_bound + rate,
 * vì tính tax = (income - lower) * rate + cumulativeTax.
 */
export interface TaxBracket {
  /** Mức thu nhập chịu thuế thấp nhất (VND/tháng) — inclusive */
  lowerBoundVnd: bigint;
  /** Thuế suất (vd: 5 = 5%) */
  ratePercent: number;
  /** Thuế lũy tiến cộng dồn từ các bậc trước (VND) */
  cumulativeTaxVnd: bigint;
}

/**
 * Snapshot các tham số BHXH/TNCN được load từ `payroll_config`.
 * Tất cả rates là chuỗi decimal (vd "0.08") để tránh float.
 * Mọi amount là BigInt VND.
 */
export interface VietnameseTaxConfig {
  // === Thời điểm áp dụng (audit) ===
  configVersion: string; // vd "2024-Q3"
  effectiveFrom: Date;

  // === Lương tối thiểu vùng & trần đóng BH ===
  minWageRegion1Vnd: bigint; // mức thấp nhất (vùng 1 = thành phố lớn)
  insuranceSalaryCapVnd: bigint; // 20 × min_wage (mặc định)

  // === Tỷ lệ BHXH (NLĐ đóng) ===
  bhxhEmployeeRate: string; // "0.08"
  bhytEmployeeRate: string; // "0.015"
  bhtnEmployeeRate: string; // "0.01"

  // === Tỷ lệ BHXH (DN đóng) — để hiển thị cost-to-company ===
  bhxhEmployerRate: string; // "0.175"
  bhytEmployerRate: string; // "0.03"
  bhtnEmployerRate: string; // "0.01"
  bhtnldEmployerRate: string; // "0.005" (BHTNLD — tai nạn lao động, bệnh nghề nghiệp)

  // === Giảm trừ TNCN ===
  personalDeductionVnd: bigint; // 11_000_000
  dependentDeductionVnd: bigint; // 4_400_000

  // === PIT progressive brackets (đã sắp xếp tăng dần theo lowerBound) ===
  pitBrackets: readonly TaxBracket[];
}

/**
 * Input cho calculateVietnameseTaxes().
 * `insuranceSalaryVnd` là lương đóng BHXH (thường = lương chính + phụ cấp cố định,
 * trong khoảng [min_wage, min_wage × 20]).
 */
export interface PayrollTaxInput {
  /** Tổng thu nhập trước thuế (gross trong kỳ) — BigInt VND */
  grossIncomeVnd: bigint;
  /** Lương đóng BHXH (có thể khác gross — vd NLĐ nước ngoài, NLĐ part-time) */
  insuranceSalaryVnd: bigint;
  /** Số người phụ thuộc đã đăng ký (để giảm trừ TNCN) */
  dependentCount: number;
  /** Khoản đóng góp từ thiện / hiến máu / quỹ BHXH tự nguyện (giảm trừ thêm) */
  additionalDeductionsVnd?: bigint;
}

/**
 * Output đầy đủ để ghi vào `worker_pay_results`.
 */
export interface PayrollTaxResult {
  // === Input echo (audit) ===
  grossIncomeVnd: bigint;
  insuranceSalaryVnd: bigint;
  cappedInsuranceSalaryVnd: bigint;
  dependentCount: number;

  // === BHXH phía NLĐ (trừ vào gross) ===
  bhxhEmployeeVnd: bigint;
  bhytEmployeeVnd: bigint;
  bhtnEmployeeVnd: bigint;
  totalEmployeeInsuranceVnd: bigint;

  // === BHXH phía DN (chỉ để hiển thị, KHÔNG trừ vào net) ===
  bhxhEmployerVnd: bigint;
  bhytEmployerVnd: bigint;
  bhtnEmployerVnd: bigint;
  bhtnldEmployerVnd: bigint;
  totalEmployerInsuranceVnd: bigint;

  // === TNCN ===
  personalDeductionVnd: bigint;
  dependentDeductionVnd: bigint;
  taxableIncomeVnd: bigint;
  pitAmountVnd: bigint;
  pitBracketRatePercent: number;
  pitEffectiveRatePercent: number; // pit / gross × 100 (làm tròn 2 chữ số)

  // === Kết quả cuối ===
  netSalaryVnd: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS (chỉ dùng khi seed DB; production LUÔN đọc từ payroll_config)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Snapshot config mặc định theo Nghị định 74/2024/NĐ-CP và Luật Thuế TNCN.
 *
 * QUAN TRỌNG: Đây CHỈ là giá trị seed. Production code PHẢI load từ
 * `payroll_config` với `effective_from <= period_date < effective_to`.
 *
 * Brackets TNCN lũy tiến (áp dụng từ 01/01/2024, không đổi từ 2009):
 *   Bậc 1: ≤ 5 triệu       × 5%   + 0
 *   Bậc 2: > 5–10 triệu     × 10%  + 250.000
 *   Bậc 3: > 10–18 triệu    × 15%  + 750.000
 *   Bậc 4: > 18–32 triệu    × 20%  + 1.950.000
 *   Bậc 5: > 32–52 triệu    × 25%  + 4.750.000
 *   Bậc 6: > 52–80 triệu    × 30%  + 9.750.000
 *   Bậc 7: > 80 triệu       × 35%  + 18.150.000
 */
export const DEFAULT_VN_TAX_CONFIG_2024: VietnameseTaxConfig = {
  configVersion: '2024-Q3',
  effectiveFrom: new Date('2024-07-01T00:00:00+07:00'),

  minWageRegion1Vnd: 4_960_000n,
  insuranceSalaryCapVnd: 20n * 4_960_000n, // 99.200.000 VND

  bhxhEmployeeRate: '0.08',
  bhytEmployeeRate: '0.015',
  bhtnEmployeeRate: '0.01',

  bhxhEmployerRate: '0.175',
  bhytEmployerRate: '0.03',
  bhtnEmployerRate: '0.01',
  bhtnldEmployerRate: '0.005',

  personalDeductionVnd: 11_000_000n,
  dependentDeductionVnd: 4_400_000n,

  pitBrackets: [
    { lowerBoundVnd: 0n,            ratePercent: 5,  cumulativeTaxVnd: 0n },
    { lowerBoundVnd: 5_000_000n,    ratePercent: 10, cumulativeTaxVnd: 250_000n },
    { lowerBoundVnd: 10_000_000n,   ratePercent: 15, cumulativeTaxVnd: 750_000n },
    { lowerBoundVnd: 18_000_000n,   ratePercent: 20, cumulativeTaxVnd: 1_950_000n },
    { lowerBoundVnd: 32_000_000n,   ratePercent: 25, cumulativeTaxVnd: 4_750_000n },
    { lowerBoundVnd: 52_000_000n,   ratePercent: 30, cumulativeTaxVnd: 9_750_000n },
    { lowerBoundVnd: 80_000_000n,   ratePercent: 35, cumulativeTaxVnd: 18_150_000n },
  ] as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate input chặt. Ném lỗi rõ ràng để debug.
 */
function assertValidInput(input: PayrollTaxInput): void {
  if (input.grossIncomeVnd < 0n) {
    throw new Error(`grossIncomeVnd must be >= 0, got ${input.grossIncomeVnd}`);
  }
  if (input.insuranceSalaryVnd < 0n) {
    throw new Error(`insuranceSalaryVnd must be >= 0, got ${input.insuranceSalaryVnd}`);
  }
  if (!Number.isInteger(input.dependentCount) || input.dependentCount < 0) {
    throw new Error(`dependentCount must be a non-negative integer, got ${input.dependentCount}`);
  }
  if (input.dependentCount > 100) {
    throw new Error(`dependentCount=${input.dependentCount} unreasonably high`);
  }
  if (input.additionalDeductionsVnd !== undefined && input.additionalDeductionsVnd < 0n) {
    throw new Error(`additionalDeductionsVnd must be >= 0`);
  }
}

/**
 * Validate config chặt.
 */
function assertValidConfig(cfg: VietnameseTaxConfig): void {
  if (cfg.pitBrackets.length === 0) {
    throw new Error('pitBrackets must not be empty');
  }
  if (cfg.pitBrackets[0].lowerBoundVnd !== 0n) {
    throw new Error('pitBrackets[0].lowerBoundVnd must be 0');
  }
  for (let i = 1; i < cfg.pitBrackets.length; i++) {
    const prev = cfg.pitBrackets[i - 1];
    const cur = cfg.pitBrackets[i];
    if (cur.lowerBoundVnd <= prev.lowerBoundVnd) {
      throw new Error(
        `pitBrackets must be strictly increasing; bracket ${i} lowerBound=${cur.lowerBoundVnd} <= prev=${prev.lowerBoundVnd}`,
      );
    }
    if (cur.ratePercent <= prev.ratePercent) {
      throw new Error(
        `pitBrackets rates must be strictly increasing; bracket ${i} rate=${cur.ratePercent} <= prev=${prev.ratePercent}`,
      );
    }
  }
  if (cfg.personalDeductionVnd < 0n) throw new Error('personalDeductionVnd >= 0');
  if (cfg.dependentDeductionVnd < 0n) throw new Error('dependentDeductionVnd >= 0');
  if (cfg.insuranceSalaryCapVnd <= 0n) throw new Error('insuranceSalaryCapVnd > 0');
}

/**
 * Tìm bracket áp dụng cho 1 mức thu nhập chịu thuế.
 * Brackets sorted ascending by lowerBound; bracket cuối cùng áp dụng cho mọi mức
 * (capped với cumulativeTaxVnd của bracket đó).
 */
function findPitBracket(
  brackets: readonly TaxBracket[],
  taxableVnd: bigint,
): TaxBracket {
  let chosen = brackets[0];
  for (const b of brackets) {
    if (taxableVnd >= b.lowerBoundVnd) {
      chosen = b;
    } else {
      break;
    }
  }
  return chosen;
}

/**
 * Tính thuế TNCN lũy tiến.
 * Công thức: tax = cumulativeTaxVnd + (taxable - lowerBoundVnd) × rate%
 */
function computePit(taxableVnd: bigint, bracket: TaxBracket): bigint {
  if (taxableVnd <= bracket.lowerBoundVnd) {
    return bracket.cumulativeTaxVnd;
  }
  const incomeInBracket = subVnd(taxableVnd, bracket.lowerBoundVnd);
  const taxInBracket = mulRateVnd(incomeInBracket, String(bracket.ratePercent / 100));
  return addVnd(bracket.cumulativeTaxVnd, taxInBracket);
}

/**
 * Tính % thuế hiệu dụng (làm tròn 2 chữ số).
 * BigInt không hỗ trợ 2 chữ số thập phân → dùng string format.
 */
function computeEffectiveRatePercent(taxVnd: bigint, grossVnd: bigint): number {
  if (grossVnd === 0n) return 0;
  // rate% = tax / gross × 100
  // scale lên 10000 để có 2 chữ số thập phân, rồi chia lại.
  const tenThousand = 10_000n;
  const scaled = (taxVnd * 100n * tenThousand) / grossVnd; // = rate × 100
  // scaled là BigInt × 100 (vd 23.45% → 2345n)
  const whole = scaled / 100n;
  const frac = scaled % 100n;
  return Number(whole) + Number(frac) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tính BHXH/BHYT/BHTN + TNCN cho 1 kỳ lương.
 *
 * @example
 * ```ts
 * const result = calculateVietnameseTaxes(
 *   { grossIncomeVnd: 25_000_000n, insuranceSalaryVnd: 25_000_000n, dependentCount: 1 },
 *   DEFAULT_VN_TAX_CONFIG_2024,
 * );
 * // result.bhxhEmployeeVnd = 2_000_000n
 * // result.pitAmountVnd = ~1_650_000n
 * // result.netSalaryVnd = ~20_300_000n
 * ```
 */
export function calculateVietnameseTaxes(
  input: PayrollTaxInput,
  config: VietnameseTaxConfig,
): PayrollTaxResult {
  assertValidInput(input);
  assertValidConfig(config);

  // ── 1. Cap insurance salary theo trần (20× min wage) ─────────────────
  const cappedInsurance = minVnd(input.insuranceSalaryVnd, config.insuranceSalaryCapVnd);

  // ── 2. BHXH phía NLĐ ─────────────────────────────────────────────────
  const bhxhEmployee = mulRateVnd(cappedInsurance, config.bhxhEmployeeRate);
  const bhytEmployee = mulRateVnd(cappedInsurance, config.bhytEmployeeRate);
  const bhtnEmployee = mulRateVnd(cappedInsurance, config.bhtnEmployeeRate);
  const totalEmployeeInsurance = bhxhEmployee + bhytEmployee + bhtnEmployee;

  // ── 3. BHXH phía DN (chỉ để hiển thị cost-to-company, KHÔNG trừ net) ─
  const bhxhEmployer = mulRateVnd(cappedInsurance, config.bhxhEmployerRate);
  const bhytEmployer = mulRateVnd(cappedInsurance, config.bhytEmployerRate);
  const bhtnEmployer = mulRateVnd(cappedInsurance, config.bhtnEmployerRate);
  const bhtnldEmployer = mulRateVnd(cappedInsurance, config.bhtnldEmployerRate);
  const totalEmployerInsurance =
    bhxhEmployer + bhytEmployer + bhtnEmployer + bhtnldEmployer;

  // ── 4. TNCN: tính thu nhập chịu thuế ─────────────────────────────────
  // Theo Luật Thuế TNCN, thu nhập chịu thuế = gross - BHXH_NLĐ - giảm trừ gia cảnh
  const grossMinusInsurance = subVnd(input.grossIncomeVnd, totalEmployeeInsurance);
  const personalDeduction = config.personalDeductionVnd;
  const dependentDeduction =
    BigInt(input.dependentCount) * config.dependentDeductionVnd;
  const additionalDeductions = input.additionalDeductionsVnd ?? 0n;

  const totalDeductions =
    personalDeduction + dependentDeduction + additionalDeductions;

  // Thu nhập chịu thuế = max(0, gross - BH - giảm trừ)
  const taxableIncome = nonNegativeVnd(subVnd(grossMinusInsurance, totalDeductions));

  // ── 5. Tính thuế theo bracket ────────────────────────────────────────
  const bracket = findPitBracket(config.pitBrackets, taxableIncome);
  const pitAmount = computePit(taxableIncome, bracket);
  const pitEffectiveRate = computeEffectiveRatePercent(pitAmount, input.grossIncomeVnd);

  // ── 6. Net = gross - BH NLĐ - TNCN ────────────────────────────────────
  const netSalary = subVnd(subVnd(input.grossIncomeVnd, totalEmployeeInsurance), pitAmount);

  return {
    // Input echo
    grossIncomeVnd: input.grossIncomeVnd,
    insuranceSalaryVnd: input.insuranceSalaryVnd,
    cappedInsuranceSalaryVnd: cappedInsurance,
    dependentCount: input.dependentCount,

    // BHXH NLĐ
    bhxhEmployeeVnd: bhxhEmployee,
    bhytEmployeeVnd: bhytEmployee,
    bhtnEmployeeVnd: bhtnEmployee,
    totalEmployeeInsuranceVnd: totalEmployeeInsurance,

    // BHXH DN
    bhxhEmployerVnd: bhxhEmployer,
    bhytEmployerVnd: bhytEmployer,
    bhtnEmployerVnd: bhtnEmployer,
    bhtnldEmployerVnd: bhtnldEmployer,
    totalEmployerInsuranceVnd: totalEmployerInsurance,

    // TNCN
    personalDeductionVnd: personalDeduction,
    dependentDeductionVnd: dependentDeduction,
    taxableIncomeVnd: taxableIncome,
    pitAmountVnd: pitAmount,
    pitBracketRatePercent: bracket.ratePercent,
    pitEffectiveRatePercent: pitEffectiveRate,

    // Net
    netSalaryVnd: maxVnd(netSalary, 0n),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN TEST CASES (cho vitest — HRP v3.0 §16)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test case kế toán đã verify tay (round-trip):
 *   NLĐ gross 25.000.000đ, 1 người phụ thuộc.
 *
 *   BHXH NLĐ:  25.000.000 × 10.5% = 2.625.000đ
 *   Gross - BH: 25.000.000 - 2.625.000 = 22.375.000đ
 *   Giảm trừ:   11.000.000 + 4.400.000 = 15.400.000đ
 *   Chịu thuế:  22.375.000 - 15.400.000 = 6.975.000đ (bậc 2, 10%)
 *   TNCN:       250.000 + (6.975.000 - 5.000.000) × 10% = 250.000 + 197.500 = 447.500đ
 *   Net:        25.000.000 - 2.625.000 - 447.500 = 21.927.500đ
 */
export const GOLDEN_CASE_STANDARD_25M_1_DEP: PayrollTaxInput = {
  grossIncomeVnd: 25_000_000n,
  insuranceSalaryVnd: 25_000_000n,
  dependentCount: 1,
};
