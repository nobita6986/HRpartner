/**
 * payslip-projection.ts — M8 allowlist projection ch-hotfix (T1A dùng chung).
 *
 * Payslip là JSON tiền-tính từ cache webhook (KHÔNG phải Prisma). DTO strict
 * allowlist — KHÔNG cho cache-extra đi ké ra HTTP. Dùng chung bởi:
 *   - GET /api/webhook/payslip  (GET projection hiện hành — giữ nguyên shape).
 *   - GET /api/worker/payroll/latest (T1A Android contract — cùng allowlist).
 *
 * NOTE (T1A RQ-09): nguồn cache hiện là process-local (src/lib/cache.ts dùng
 * Map module-level). KHÔNG quảng bá thành dữ liệu bền vững/production-ready —
 * block BLK ghi trong HANDOFF; payroll schema mới là out-of-scope T1A.
 */

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const toFiniteNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** GET: DTO allowlist — TOLERANT với cache thiếu field (partial). Không bao giờ throw. */
export function projectPayslipForResponse(raw: unknown) {
  const r = isPlainObject(raw) ? raw : {};
  return {
    workerId: r.workerId == null ? null : String(r.workerId),
    periodMonth: r.periodMonth == null ? null : toFiniteNumber(r.periodMonth),
    periodYear: r.periodYear == null ? null : toFiniteNumber(r.periodYear),
    grossSalary: r.grossSalary == null ? null : toFiniteNumber(r.grossSalary),
    netSalary: r.netSalary == null ? null : toFiniteNumber(r.netSalary),
    deductions: isPlainObject(r.deductions) ? r.deductions : {},
    earned: isPlainObject(r.earned) ? r.earned : {},
    computedAt: r.computedAt == null ? null : String(r.computedAt),
  };
}
