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
} from './ctv.scope';
import { buildStaffingOrderScope, buildStaffingOrderSlotScope } from './staffing.scope';

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
};

export {
  buildWorkerScope,
  buildProjectScope,
  buildVendorScope,
  buildCandidateSubmissionScope,
  buildVendorStatementScope,
  buildCtvSourceClaimScope,
};