/**
 * Statement Service -- Phase 4 Slice 4C STEP-13 (RQ-11).
 *
 * Generate 2 luong doc lap tu timesheet LOCKED:
 *   - VendorStatement (payable): rate tu VendorRateCard
 *   - ClientStatement (receivable): rate tu ClientRateCard
 *
 * DEC-05: rate snapshot tai thoi diem cong (cot `rate` tren statement line).
 * ADR-010: BigInt VND nguyen (khong Decimal/Float tien).
 * DEC-07: Statement SM DRAFT -> SENT -> DISPUTED -> CONFIRMED -> LOCKED -> PAID.
 * Chan generate khi timesheet chua LOCKED -> 409.
 */

import { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';
import { multiplyDecimalByVnd } from '@/src/shared/utils/money';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateStatementInput {
  timesheetPeriodId: string;
}

export class StatementServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'PERMISSION_DENIED'
      | 'ALREADY_EXISTS'
      | 'NO_LINES',
    message: string,
  ) {
    super(message);
    this.name = 'StatementServiceError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Chon rate tu VendorRateCard/ClientRateCard hieu luc tai workDate.
 * Ưu tiên rate có workType/siteId khớp trước, fallback rate generic.
 * DEC-05: snapshot rate -- tra ve BigInt.
 */
async function resolveRate(
  tx: Prisma.TransactionClient,
  contractId: string,
  workDate: Date,
  kind: 'VENDOR' | 'CLIENT',
): Promise<bigint> {
  const table = kind === 'VENDOR' ? 'vendor_rate_cards' : 'client_rate_cards';

  // Specific: siteId set, workType set, valid for date
  const rows = await tx.$queryRawUnsafe<Array<{ price: bigint }>>(
    `SELECT price FROM ${table}
     WHERE contract_id = $1
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to >= $2)
     ORDER BY (work_type IS NOT NULL) DESC, (site_id IS NOT NULL) DESC
     LIMIT 1`,
    contractId,
    workDate,
  );

  if (!rows.length) {
    throw new StatementServiceError(
      'NO_LINES',
      `Khong tim thay rate card cho contract ${contractId} tai ${workDate.toISOString().slice(0, 10)}`,
    );
  }
  return rows[0].price;
}

/**
 * Group timesheet lines theo worker, tinh tong hours.
 */
interface WorkerHours {
  workerId: string;
  assignmentId: string | null;
  totalHours: Prisma.Decimal;
}

function decimalHours(value: unknown): Prisma.Decimal {
  return new Prisma.Decimal(String(value));
}

function sumDecimalHours(...values: unknown[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(decimalHours(value)),
    new Prisma.Decimal(0),
  );
}

function aggregateHours(lines: Array<{ workerId: string; assignmentId: string | null; hours: unknown }>): WorkerHours[] {
  const map = new Map<string, WorkerHours>();
  for (const line of lines) {
    const key = `${line.workerId}::${line.assignmentId ?? ''}`;
    const hours = decimalHours(line.hours);
    const current = map.get(key);
    map.set(key, {
      workerId: line.workerId,
      assignmentId: line.assignmentId,
      totalHours: current ? current.totalHours.plus(hours) : hours,
    });
  }
  return [...map.values()];
}

// ─── Generate VendorStatement ──────────────────────────────────────────────────

/**
 * Generate VendorStatement (payable) tu timesheet LOCKED.
 *
 * Lay lines tu TimesheetLine -> resolve VendorRateCard theo assignment.contractId
 * -> tinh amount = rate * hours (BigInt).
 */
export async function generateVendorStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: GenerateStatementInput,
) {
  // Verify timesheet period LOCKED
  const period = await tx.timesheetPeriod.findUnique({
    where: { id: input.timesheetPeriodId },
    select: { id: true, status: true, month: true, year: true },
  });

  if (!period) {
    throw new StatementServiceError('NOT_FOUND', `Timesheet period ${input.timesheetPeriodId} khong tim thay`);
  }
  if (period.status !== 'LOCKED') {
    throw new StatementServiceError(
      'INVALID_STATE',
      `Timesheet period ${period.status} chua LOCKED -- can lock truoc khi generate statement`,
    );
  }

  // Get timesheet lines (with assignment -> contract -> vendor)
  const lines = await tx.timesheetLine.findMany({
    where: { periodId: input.timesheetPeriodId },
  });

  if (!lines.length) {
    throw new StatementServiceError('NO_LINES', 'Timesheet period khong co line nao');
  }

  // Aggregate per worker -- totalHours = regular + OT tiers
  const workerHours = aggregateHours(
    lines.map(l => ({
      workerId: l.workerId,
      assignmentId: l.assignmentId,
      hours: sumDecimalHours(
        l.regularHours,
        l.ot15Hours,
        l.ot20Hours,
        l.ot30Hours,
      ),
    })),
  );

  // Resolve vendor from assignment -> project (MVP: lay vendor first via simple query)
  // Production: assignment -> staffing_order -> contract -> vendor (DEC-08)
  // MVP simplified: lay 1 vendor tu DB de generate statement (mock data)
  const assignmentIds = workerHours.map(w => w.assignmentId).filter((x): x is string => !!x);
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({
        where: { id: { in: assignmentIds } },
        select: { id: true, workerId: true, projectId: true, staffingOrderId: true },
      })
    : [];

  // MVP: lay vendorId qua stub — production can chain qua StaffingOrder -> Contract -> Vendor
  const firstVendor = await tx.vendor.findFirst({ select: { id: true } });
  const vendorId = firstVendor?.id ?? '__NO_VENDOR__';
  const assignmentMap = new Map<string, { projectId: string }>();
  for (const a of assignments) {
    assignmentMap.set(a.id, { projectId: a.projectId });
  }

  // MVP: lay contract vendor de resolve rate. Production: assignment -> staffing_order -> contract.
  // Hien tai lay 1 contract vendor + 1 contract client de demo.
  const vendorContract = await tx.contract.findFirst({
    where: { type: 'VENDOR_FRAMEWORK', status: 'ACTIVE' },
    select: { id: true },
  });
  if (!vendorContract) {
    throw new StatementServiceError('NO_LINES', 'Khong tim thay contract VENDOR_FRAMEWORK ACTIVE');
  }

  // Resolve rates (snapshot per workDate)
  const workDate = new Date(period.year, period.month - 1, 1);
  const rate = await resolveRate(tx, vendorContract.id, workDate, 'VENDOR');

  // Build lines + total
  const statementLines = workerHours.map(item => ({
    workerId: item.workerId,
    assignmentId: item.assignmentId,
    totalHours: item.totalHours,
    rate,
    amount: multiplyDecimalByVnd(item.totalHours, rate), // ADR-010A: round only after multiplication
  }));
  const totalAmount = statementLines.reduce((acc, l) => acc + l.amount, 0n);

  // Check unique constraint vendor + period + version
  const existing = await tx.vendorStatement.findFirst({
    where: { vendorId, periodMonth: period.month, periodYear: period.year, version: 1 },
  });
  if (existing) {
    throw new StatementServiceError('ALREADY_EXISTS', `VendorStatement da ton tai (${existing.id})`);
  }

  // Create statement
  const statement = await tx.vendorStatement.create({
    data: {
      vendorId,
      periodMonth: period.month,
      periodYear: period.year,
      totalAmount,
      status: 'DRAFT',
      version: 1,
      lines: {
        create: statementLines.map(l => ({
          workerId: l.workerId,
          assignmentId: l.assignmentId,
          totalHours: l.totalHours,
          rate: l.rate,
          amount: l.amount,
        })),
      },
    },
    include: { lines: true },
  });

  // Audit + outbox
  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'VendorStatement',
    entityId: statement.id,
    action: 'CREATE',
    reason: `Generate tu timesheet ${period.month}/${period.year}`,
    diff: { before: {}, after: { vendorId, totalAmount: totalAmount.toString() } },
  });

  await enqueueOutbox(tx, {
    eventType: 'VendorStatementGenerated',
    aggregateId: statement.id,
    payload: { statementId: statement.id, vendorId, totalAmount: totalAmount.toString() },
  });

  return statement;
}

// ─── Generate ClientStatement ──────────────────────────────────────────────────

/**
 * Generate ClientStatement (receivable) tu timesheet LOCKED.
 *
 * Tuong tu vendor nhung rate tu ClientRateCard, clientId tu project.clientCompanyId.
 */
export async function generateClientStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: GenerateStatementInput,
) {
  const period = await tx.timesheetPeriod.findUnique({
    where: { id: input.timesheetPeriodId },
    select: { id: true, status: true, month: true, year: true, projectId: true },
  });

  if (!period) {
    throw new StatementServiceError('NOT_FOUND', `Timesheet period ${input.timesheetPeriodId} khong tim thay`);
  }
  if (period.status !== 'LOCKED') {
    throw new StatementServiceError(
      'INVALID_STATE',
      `Timesheet period ${period.status} chua LOCKED`,
    );
  }
  if (!period.projectId) {
    throw new StatementServiceError('INVALID_STATE', 'Timesheet period khong co project_id');
  }

  // Get project + client
  const project = await tx.project.findUnique({
    where: { id: period.projectId },
    select: { id: true, clientCompanyId: true },
  });

  if (!project || !project.clientCompanyId) {
    throw new StatementServiceError('INVALID_STATE', 'Project khong co client_company_id');
  }

  const lines = await tx.timesheetLine.findMany({ where: { periodId: input.timesheetPeriodId } });
  if (!lines.length) {
    throw new StatementServiceError('NO_LINES', 'Timesheet period khong co line nao');
  }

  const workerHours = aggregateHours(
    lines.map(l => ({
      workerId: l.workerId,
      assignmentId: l.assignmentId,
      hours: sumDecimalHours(
        l.regularHours,
        l.ot15Hours,
        l.ot20Hours,
        l.ot30Hours,
      ),
    })),
  );

  // Resolve client contract from contract.projectId = project.id
  const contract = await tx.contract.findFirst({
    where: { projectId: project.id, type: 'CLIENT_SUPPLY', status: 'ACTIVE' },
    select: { id: true },
  });

  if (!contract) {
    throw new StatementServiceError('NO_LINES', `Khong tim thay contract CLIENT_SUPPLY cho project ${project.id}`);
  }

  const workDate = new Date(period.year, period.month - 1, 1);
  const rate = await resolveRate(tx, contract.id, workDate, 'CLIENT');

  const statementLines = workerHours.map(item => ({
    workerId: item.workerId,
    assignmentId: item.assignmentId,
    totalHours: item.totalHours,
    rate,
    amount: multiplyDecimalByVnd(item.totalHours, rate),
  }));
  const totalAmount = statementLines.reduce((acc, l) => acc + l.amount, 0n);

  const clientId = project.clientCompanyId;
  const existing = await tx.clientStatement.findFirst({
    where: { clientId, periodMonth: period.month, periodYear: period.year, version: 1 },
  });
  if (existing) {
    throw new StatementServiceError('ALREADY_EXISTS', `ClientStatement da ton tai (${existing.id})`);
  }

  const statement = await tx.clientStatement.create({
    data: {
      clientId,
      periodMonth: period.month,
      periodYear: period.year,
      totalAmount,
      status: 'DRAFT',
      version: 1,
      lines: {
        create: statementLines.map(l => ({
          workerId: l.workerId,
          assignmentId: l.assignmentId,
          totalHours: l.totalHours,
          rate: l.rate,
          amount: l.amount,
        })),
      },
    },
    include: { lines: true },
  });

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'ClientStatement',
    entityId: statement.id,
    action: 'CREATE',
    reason: `Generate tu timesheet ${period.month}/${period.year}`,
    diff: { before: {}, after: { clientId, totalAmount: totalAmount.toString() } },
  });

  await enqueueOutbox(tx, {
    eventType: 'ClientStatementGenerated',
    aggregateId: statement.id,
    payload: { statementId: statement.id, clientId, totalAmount: totalAmount.toString() },
  });

  return statement;
}

/**
 * Lay statement lines (vendor) theo period -- phuc vu lineage drawer (RQ-14).
 */
export async function getVendorStatementLineage(
  tx: Prisma.TransactionClient,
  vendorStatementId: string,
) {
  const statement = await tx.vendorStatement.findUnique({
    where: { id: vendorStatementId },
    include: { lines: true },
  });
  if (!statement) return null;

  // Trace line -> assignment -> timesheet -> event
  const assignmentIds = statement.lines.map(l => l.assignmentId).filter((x): x is string => !!x);
  // KHONG select quan he `worker`: quan he BAT BUOC + policy con khong dung predicate cua policy cha
  // => `Inconsistent query result` TRUOC mapper (xem ghi chu day du o margin.service.ts, DEC-05).
  // Hang assignment van doc day du truong vo huong nen HINH DANG response khong doi; chi nguon cua
  // khoa `worker` doi, va khoa ay thanh `null` khi hang cha khong doc duoc — khoa VAN CON.
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({ where: { id: { in: assignmentIds } } })
    : [];
  const lineageWorkerIds = [...new Set(assignments.map(a => a.workerId))];
  const lineageWorkers = lineageWorkerIds.length
    ? await tx.worker.findMany({
        where: { id: { in: lineageWorkerIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const workerById = new Map(lineageWorkers.map(w => [w.id, w]));
  const assignmentMap = new Map(
    assignments.map(a => [a.id, { ...a, worker: workerById.get(a.workerId) ?? null }]),
  );

  return {
    statement,
    lines: statement.lines.map(l => ({
      ...l,
      assignment: l.assignmentId ? assignmentMap.get(l.assignmentId) : null,
    })),
  };
}

/**
 * Lay statement lines (client) theo period -- phuc vu lineage drawer (RQ-14).
 */
export async function getClientStatementLineage(
  tx: Prisma.TransactionClient,
  clientStatementId: string,
) {
  const statement = await tx.clientStatement.findUnique({
    where: { id: clientStatementId },
    include: { lines: true },
  });
  if (!statement) return null;

  const assignmentIds = statement.lines.map(l => l.assignmentId).filter((x): x is string => !!x);
  // KHONG select quan he `worker`: quan he BAT BUOC + policy con khong dung predicate cua policy cha
  // => `Inconsistent query result` TRUOC mapper (xem ghi chu day du o margin.service.ts, DEC-05).
  // Hang assignment van doc day du truong vo huong nen HINH DANG response khong doi; chi nguon cua
  // khoa `worker` doi, va khoa ay thanh `null` khi hang cha khong doc duoc — khoa VAN CON.
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({ where: { id: { in: assignmentIds } } })
    : [];
  const lineageWorkerIds = [...new Set(assignments.map(a => a.workerId))];
  const lineageWorkers = lineageWorkerIds.length
    ? await tx.worker.findMany({
        where: { id: { in: lineageWorkerIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const workerById = new Map(lineageWorkers.map(w => [w.id, w]));
  const assignmentMap = new Map(
    assignments.map(a => [a.id, { ...a, worker: workerById.get(a.workerId) ?? null }]),
  );

  return {
    statement,
    lines: statement.lines.map(l => ({
      ...l,
      assignment: l.assignmentId ? assignmentMap.get(l.assignmentId) : null,
    })),
  };
}