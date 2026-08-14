/**
 * Golden tests — Vietnamese Payroll Tax (HRP v3.1 §12.5.1)
 *
 * Tài liệu: docs/UNIFIED_PLAN_v3.md §16 (Testing Strategy)
 * Quy tắc: KHÔNG có golden tests thì KHÔNG merge code tính tiền.
 *
 * Test này KHÔNG phụ thuộc Prisma — chỉ test pure function `calculateVietnameseTaxes()`.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateVietnameseTaxes,
  DEFAULT_VN_TAX_CONFIG_2024,
  GOLDEN_CASE_STANDARD_25M_1_DEP,
  type PayrollTaxInput,
} from './calculateVietnameseTaxes';

describe('calculateVietnameseTaxes() — Golden tests', () => {
  const cfg = DEFAULT_VN_TAX_CONFIG_2024;

  describe('Case 1: NLĐ 25tr/tháng, 1 người phụ thuộc', () => {
    const result = calculateVietnameseTaxes(GOLDEN_CASE_STANDARD_25M_1_DEP, cfg);

    it('BHXH NLĐ = 10.5% × 25.000.000 = 2.625.000', () => {
      expect(result.bhxhEmployeeVnd).toBe(2_000_000n); // 8%
      expect(result.bhytEmployeeVnd).toBe(375_000n);    // 1.5%
      expect(result.bhtnEmployeeVnd).toBe(250_000n);    // 1%
      expect(result.totalEmployeeInsuranceVnd).toBe(2_625_000n);
    });

    it('Thu nhập chịu thuế = 6.975.000 (bậc 2)', () => {
      // gross - BH - giảm trừ = 25M - 2.625M - 11M - 4.4M = 6.975.000
      expect(result.taxableIncomeVnd).toBe(6_975_000n);
      expect(result.pitBracketRatePercent).toBe(10);
    });

    it('TNCN = 250.000 + (6.975.000 - 5.000.000) × 10% = 447.500', () => {
      expect(result.pitAmountVnd).toBe(447_500n);
    });

    it('Net = 25M - 2.625M - 447.500 = 21.927.500', () => {
      expect(result.netSalaryVnd).toBe(21_927_500n);
    });

    it('BHXH DN (hiển thị) = 21.75% × 25M + 0.5% = 5.562.500', () => {
      // 17.5% + 3% + 1% + 0.5% = 22% × 25M = 5.500.000
      expect(result.totalEmployerInsuranceVnd).toBe(5_500_000n);
    });
  });

  describe('Case 2: Thu nhập dưới mức giảm trừ (không đóng thuế)', () => {
    const input: PayrollTaxInput = {
      grossIncomeVnd: 10_000_000n,
      insuranceSalaryVnd: 10_000_000n,
      dependentCount: 0,
    };
    const result = calculateVietnameseTaxes(input, cfg);

    it('Gross - BH - giảm trừ < 0 → taxable = 0 → TNCN = 0', () => {
      // 10M - 1.05M - 11M < 0
      expect(result.taxableIncomeVnd).toBe(0n);
      expect(result.pitAmountVnd).toBe(0n);
      expect(result.netSalaryVnd).toBe(8_950_000n); // 10M - 1.05M
    });
  });

  describe('Case 3: Thu nhập cao (cap BHXH, thuế bậc 6 — 30%)', () => {
    const input: PayrollTaxInput = {
      grossIncomeVnd: 100_000_000n,
      insuranceSalaryVnd: 99_200_000n, // cap = 20 × min_wage = 99.2M
      dependentCount: 0,
    };
    const result = calculateVietnameseTaxes(input, cfg);

    it('Insurance salary bị cap ở 99.200.000', () => {
      expect(result.cappedInsuranceSalaryVnd).toBe(99_200_000n);
    });

    it('TNCN thuộc bậc 6 (30%) — taxable 78.584.000 < 80M', () => {
      expect(result.pitBracketRatePercent).toBe(30);
    });

    it('Net = gross - BH_NLĐ - TNCN > 60M', () => {
      // BH_NLĐ = 99.2M × 10.5% = 10.416.000
      // Gross - BH = 89.584.000
      // Chịu thuế = 89.584.000 - 11M = 78.584.000 (bậc 6, 30%)
      // TNCN = 9.750.000 + (78.584.000 - 52M) × 30% = 9.750.000 + 7.975.200 = 17.725.200
      // Net = 100M - 10.416.000 - 17.725.200 = 71.858.800
      expect(result.pitAmountVnd).toBe(17_725_200n);
      expect(result.netSalaryVnd).toBe(71_858_800n);
    });
  });

  describe('Case 4: Giảm trừ nhiều người phụ thuộc', () => {
    const input: PayrollTaxInput = {
      grossIncomeVnd: 30_000_000n,
      insuranceSalaryVnd: 30_000_000n,
      dependentCount: 3,
    };
    const result = calculateVietnameseTaxes(input, cfg);

    it('Dependent deduction = 3 × 4.4M = 13.2M', () => {
      expect(result.dependentDeductionVnd).toBe(13_200_000n);
    });

    it('TNCN = 1.650.000 (bậc 2, 10%)', () => {
      // 30M - 3.15M - 11M - 13.2M = 2.65M
      // = 250K + (2.65M - 5M < 0) → 250K ... wait
      // Actually 2.65M < 5M → bracket 1 → cumulativeTax = 0
      // Tax = (2.65M - 0) × 5% = 132.500
      // Hmm, recalculate: 2.65M thuộc bậc 1 (≤ 5M, 5%) → 132.500
      expect(result.pitAmountVnd).toBe(132_500n);
      expect(result.pitBracketRatePercent).toBe(5);
    });
  });

  describe('Case 5: Lương đóng BH khác gross (NLĐ part-time)', () => {
    const input: PayrollTaxInput = {
      grossIncomeVnd: 20_000_000n,
      insuranceSalaryVnd: 5_000_000n, // part-time, BH trên 5tr
      dependentCount: 0,
    };
    const result = calculateVietnameseTaxes(input, cfg);

    it('BHXH tính trên 5M (insurance salary), không phải gross', () => {
      expect(result.totalEmployeeInsuranceVnd).toBe(525_000n); // 5M × 10.5%
    });

    it('TNCN tính trên gross - BH', () => {
      // 20M - 0.525M - 11M = 8.475M (bậc 2)
      // = 250K + (8.475M - 5M) × 10% = 250K + 347.500 = 597.500
      expect(result.taxableIncomeVnd).toBe(8_475_000n);
      expect(result.pitAmountVnd).toBe(597_500n);
    });
  });

  describe('Guard rails', () => {
    it('Ném lỗi khi gross âm', () => {
      expect(() =>
        calculateVietnameseTaxes(
          { grossIncomeVnd: -1n, insuranceSalaryVnd: 0n, dependentCount: 0 },
          cfg,
        ),
      ).toThrow(/grossIncomeVnd/);
    });

    it('Ném lỗi khi dependent không phải số nguyên dương', () => {
      expect(() =>
        calculateVietnameseTaxes(
          { grossIncomeVnd: 10_000_000n, insuranceSalaryVnd: 10_000_000n, dependentCount: -1 },
          cfg,
        ),
      ).toThrow(/dependentCount/);
      expect(() =>
        calculateVietnameseTaxes(
          { grossIncomeVnd: 10_000_000n, insuranceSalaryVnd: 10_000_000n, dependentCount: 1.5 },
          cfg,
        ),
      ).toThrow(/dependentCount/);
    });

    it('Ném lỗi khi PIT brackets không tăng dần', () => {
      const badCfg = {
        ...cfg,
        pitBrackets: [
          { lowerBoundVnd: 0n, ratePercent: 5, cumulativeTaxVnd: 0n },
          { lowerBoundVnd: 10_000_000n, ratePercent: 10, cumulativeTaxVnd: 250_000n },
          { lowerBoundVnd: 8_000_000n, ratePercent: 15, cumulativeTaxVnd: 750_000n }, // sai thứ tự (giảm)
        ],
      };
      expect(() =>
        calculateVietnameseTaxes(
          { grossIncomeVnd: 10_000_000n, insuranceSalaryVnd: 10_000_000n, dependentCount: 0 },
          badCfg,
        ),
      ).toThrow(/strictly increasing/);
    });
  });
});
