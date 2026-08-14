/**
 * Payroll domain barrel — HRP v3.0 §6 (M8 Payroll & Billing)
 *
 * Sub-modules:
 *   - calculateVietnameseTaxes — pure service tính BHXH/TNCN BigInt
 *   - payrollConfigRepo        — load effective-dated snapshot
 */
export * from './calculateVietnameseTaxes';
export * from './payrollConfigRepo';
