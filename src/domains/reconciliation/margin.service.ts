/**
 * Margin + Vendor Preview -- Phase 4 Slice 4C STEP-14 (RQ-12, RQ-14).
 *
 * DEC-06 (D10): Margin visibility = ADMIN + ACCOUNTANT (CAN_VIEW_STATEMENT_MARGIN).
 * PM an. Vendor KHONG thay margin (D08).
 *
 * Margin = SUM(client_receivable) - SUM(vendor_payable) cho cung period.
 *
 * Vendor preview (D08): vendor thay statement cua minh -- rate + qty + amount,
 * line trace <- timesheet <- event (lineage).
 */

import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';

// ─── Types ────────────────────────────────────────────────────────────────────

export class MarginPermissionError extends Error {
  constructor(
    public readonly code: 'PERMISSION_DENIED',
    message: string,
  ) {
    super(message);
    this.name = 'MarginPermissionError';
  }
}

export interface MarginBreakdown {
  periodMonth: number;
  periodYear: number;
  totalClientReceivable: bigint;
  totalVendorPayable: bigint;
  margin: bigint;
  vendorStatementCount: number;
  clientStatementCount: number;
}

// ─── Margin calculation ───────────────────────────────────────────────────────

/**
 * Tinh margin cho 1 ky.
 * Yeu cau CAN_VIEW_STATEMENT_MARGIN (DEC-06/D10).
 *
 * Note: BigInt subtraction co the am -- semantically margin < 0 = loi.
 */
export async function calculateMargin(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  periodMonth: number,
  periodYear: number,
): Promise<MarginBreakdown> {
  // Permission gate
  if (!(await hasPermission({ userId: ctx.userId, role: ctx.role }, 'CAN_VIEW_STATEMENT_MARGIN'))) {
    throw new MarginPermissionError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} khong co quyen xem margin (CAN_VIEW_STATEMENT_MARGIN)`,
    );
  }

  const [vendorAgg, clientAgg, vendorCount, clientCount] = await Promise.all([
    tx.vendorStatement.aggregate({
      where: { periodMonth, periodYear },
      _sum: { totalAmount: true },
    }),
    tx.clientStatement.aggregate({
      where: { periodMonth, periodYear },
      _sum: { totalAmount: true },
    }),
    tx.vendorStatement.count({ where: { periodMonth, periodYear } }),
    tx.clientStatement.count({ where: { periodMonth, periodYear } }),
  ]);

  const totalVendor = BigInt(vendorAgg._sum.totalAmount ?? 0);
  const totalClient = BigInt(clientAgg._sum.totalAmount ?? 0);

  return {
    periodMonth,
    periodYear,
    totalClientReceivable: totalClient,
    totalVendorPayable: totalVendor,
    margin: totalClient - totalVendor,
    vendorStatementCount: vendorCount,
    clientStatementCount: clientCount,
  };
}

// ─── Vendor preview ───────────────────────────────────────────────────────────

/**
 * Vendor preview -- chi vendor xem statement cua minh.
 * KHONG tra margin (D08).
 * Tra ve lines + rate + qty + amount + lineage (worker + assignment).
 */
export interface VendorPreviewLine {
  id: string;
  workerId: string;
  workerName: string | null;
  assignmentId: string | null;
  totalHours: number;
  rate: bigint;
  amount: bigint;
}

export interface VendorPreviewStatement {
  id: string;
  vendorId: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  totalAmount: bigint;
  disputeCount: number;
  confirmDeadlineAt: Date | null;
  sentAt: Date | null;
  lines: VendorPreviewLine[];
}

export class VendorPreviewError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'PERMISSION_DENIED',
    message: string,
  ) {
    super(message);
    this.name = 'VendorPreviewError';
  }
}

/**
 * Vendor xem statement cua minh.
 * Vendor scope: chi vendorId match.
 */
export async function vendorPreviewStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  statementId: string,
): Promise<VendorPreviewStatement> {
  // Vendor scope: ctx.vendorId (VENDOR_ADMIN | VENDOR_STAFF co tu User.vendorId)
  const vendorScopeId = ctx.vendorId;
  if (ctx.role === 'VENDOR_ADMIN' || ctx.role === 'VENDOR_STAFF') {
    if (!vendorScopeId) {
      throw new VendorPreviewError('PERMISSION_DENIED', 'Vendor scope khong co vendorId');
    }
  }

  const statement = await tx.vendorStatement.findUnique({
    where: { id: statementId },
    include: { lines: true },
  });

  if (!statement) {
    throw new VendorPreviewError('NOT_FOUND', `VendorStatement ${statementId} khong tim thay`);
  }

  // Scope check: vendor chi thay statement cua minh
  if ((ctx.role === 'VENDOR_ADMIN' || ctx.role === 'VENDOR_STAFF') && statement.vendorId !== vendorScopeId) {
    throw new VendorPreviewError(
      'PERMISSION_DENIED',
      'Vendor chi xem statement cua minh (D08/DEC-06)',
    );
  }

  // Lineage: line.assignmentId -> assignment.worker
  const assignmentIds = statement.lines.map(l => l.assignmentId).filter((x): x is string => !!x);
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({
        where: { id: { in: assignmentIds } },
        include: { worker: { select: { id: true, fullName: true } } },
      })
    : [];
  const assignmentMap = new Map(assignments.map(a => [a.id, a]));

  return {
    id: statement.id,
    vendorId: statement.vendorId,
    periodMonth: statement.periodMonth,
    periodYear: statement.periodYear,
    status: statement.status,
    totalAmount: statement.totalAmount,
    disputeCount: statement.disputeCount,
    confirmDeadlineAt: statement.confirmDeadlineAt,
    sentAt: statement.sentAt,
    lines: statement.lines.map(l => ({
      id: l.id,
      workerId: l.workerId,
      workerName: l.assignmentId ? assignmentMap.get(l.assignmentId)?.worker?.fullName ?? null : null,
      assignmentId: l.assignmentId,
      totalHours: Number(l.totalHours),
      rate: l.rate,
      amount: l.amount,
    })),
  };
}

/**
 * Filter helper: co thay margin khong? Dung cho UI role-guard.
 */
export function canViewMargin(role: string): boolean {
  return role === 'ADMIN' || role === 'ACCOUNTANT' || role === 'DIRECTOR';
}