/**
 * scopes/index.ts — Phase 2 / RQ-04 / DEC-06
 *
 * Registry — map từ Prisma model name → builder function.
 * with-auth-scope dùng registry này để lookup builder khi extension chạy.
 *
 * Quy tắc §5.3:
 *   - Model con của Worker dùng worker scope qua relation filter.
 *   - Phase 2 chỉ khai báo 4 model builder chính: Worker, Project, Vendor, CandidateSubmission.
 *   - VendorStatement xài builder riêng (ctv.scope.ts export buildVendorStatementScope).
 *   - SourceClaim xài builder riêng (ctv.scope.ts export buildCtvSourceClaimScope).
 *   - Models khác (User, Dependent, Ticket, ProjectAssignment, ...): DENY-BY-DEFAULT
 *     trong extension nếu không có builder.
 */
import type { Prisma } from '@prisma/client';
import type { AuthContext } from '../auth-context';
import { buildWorkerScope } from './worker.scope';
import { buildProjectScope } from './project.scope';
import { buildVendorScope } from './vendor.scope';
import {
  buildCandidateSubmissionScope,
  buildVendorStatementScope,
  buildCtvSourceClaimScope,
  buildCtvWithdrawalScope,
  buildCommissionLedgerScope,
  buildCommissionDebtScope,
  buildUserSelfScope,
} from './ctv.scope';
import { buildStaffingOrderScope, buildStaffingOrderSlotScope } from './staffing.scope';
import {
  buildTicketScope,
  buildAttendanceEventScope,
  buildSiteScope,
} from './worker-portal.scope';
import { buildClientStatementScope, buildPayrollConfigScope } from './finance.scope';

export type ScopeBuilder = (ctx: AuthContext) => Prisma.Args<unknown, 'findMany'>['where'];

export const SCOPE_REGISTRY: Record<string, ScopeBuilder> = {
  Worker: buildWorkerScope,
  Project: buildProjectScope,
  Vendor: buildVendorScope,
  CandidateSubmission: buildCandidateSubmissionScope,
  VendorStatement: buildVendorStatementScope,
  VendorStatementLine: buildVendorStatementScope,
  SourceClaim: buildCtvSourceClaimScope,
  // Phase 4 slice 4A — DEC-15 / STEP-02
  StaffingOrder: buildStaffingOrderScope,
  StaffingOrderSlot: buildStaffingOrderSlotScope,
  // V5-M1-06a — CTV self-scope cho account/finance model (RQ-04 / DEC-06).
  User: buildUserSelfScope,
  CtvWithdrawalRequest: buildCtvWithdrawalScope,
  CommissionLedger: buildCommissionLedgerScope,
  CommissionDebt: buildCommissionDebtScope,
  // V5-M1-06b — worker-portal + attendance read scope (RQ-02 / DEC-08).
  Ticket: buildTicketScope,
  AttendanceEvent: buildAttendanceEventScope,
  Site: buildSiteScope,
  // V5-M1-06d — finance global-read L1 capability (RQ-07 / DEC-11 / DEC-12).
  // ClientStatement(+Line): margin aggregate cần L1 thật; PayrollConfig: ACCOUNTANT global-read.
  ClientStatement: buildClientStatementScope,
  ClientStatementLine: buildClientStatementScope,
  PayrollConfig: buildPayrollConfigScope,
};

export {
  buildWorkerScope,
  buildProjectScope,
  buildVendorScope,
  buildCandidateSubmissionScope,
  buildVendorStatementScope,
  buildCtvSourceClaimScope,
  buildCtvWithdrawalScope,
  buildCommissionLedgerScope,
  buildCommissionDebtScope,
  buildUserSelfScope,
  buildTicketScope,
  buildAttendanceEventScope,
  buildSiteScope,
  buildClientStatementScope,
  buildPayrollConfigScope,
};