/**
 * project-shift.service.ts
 *
 * Quản lý danh mục Ca làm việc (ProjectShift) cho từng Dự án (`outsourcing_projects`).
 * Phục vụ cấu hình nhiều ca (Ca Sáng / Ca Tối, Ca 1 / Ca 2 / Ca 3, Ca Hành chính...)
 * và đối chiếu tự động/thủ công khi chấm công & tính công cho công nhân.
 */
import type { Prisma } from '@prisma/client';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import type { AuthContext } from '@/src/shared/auth/auth-context';

export const PROJECT_SHIFT_CONFIG_ROLES = ['ADMIN', 'DIRECTOR', 'HR_MANAGER', 'PM'] as const;

export type ProjectShiftServiceErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'VALIDATION'
  | 'CONFLICT';

export class ProjectShiftServiceError extends Error {
  constructor(
    public readonly code: ProjectShiftServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProjectShiftServiceError';
  }
}

export interface ProjectShiftDto {
  id: string;
  projectId: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  breakMinutes: number;
  standardHours: number;
  graceLateMinutes: number;
  graceEarlyMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectShiftAuditMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ProjectShiftInput {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  breakMinutes: number;
  standardHours: number;
  graceLateMinutes: number;
  graceEarlyMinutes: number;
  isActive: boolean;
}

const TIME_HH_MM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SHIFT_CODE_RE = /^[A-Z0-9_-]{1,32}$/;

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toDto(row: {
  id: string;
  projectId: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  breakMinutes: number;
  standardHours: unknown;
  graceLateMinutes: number;
  graceEarlyMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProjectShiftDto {
  const stdHours = Number(row.standardHours);
  return {
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    isOvernight: row.isOvernight,
    breakMinutes: row.breakMinutes,
    standardHours: Number.isFinite(stdHours) ? stdHours : 8,
    graceLateMinutes: row.graceLateMinutes,
    graceEarlyMinutes: row.graceEarlyMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function validateProjectShiftPayload(
  raw: unknown,
  existing?: ProjectShiftDto,
): { ok: true; value: ProjectShiftInput } | { ok: false; error: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Body phải là object JSON.' };
  }
  const body = raw as Record<string, unknown>;

  const rawCode = body.code !== undefined ? body.code : existing?.code;
  if (typeof rawCode !== 'string' || !rawCode.trim()) {
    return { ok: false, error: 'Mã ca (code) là bắt buộc.' };
  }
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, '_');
  if (!SHIFT_CODE_RE.test(code)) {
    return {
      ok: false,
      error: 'Mã ca chỉ gồm chữ in hoa, số, dấu gạch dưới hoặc gạch ngang (tối đa 32 ký tự, VD: CA1, CA_SANG).',
    };
  }

  const rawName = body.name !== undefined ? body.name : existing?.name;
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return { ok: false, error: 'Tên ca làm việc là bắt buộc.' };
  }
  const name = rawName.trim();
  if (name.length > 120) {
    return { ok: false, error: 'Tên ca làm việc tối đa 120 ký tự.' };
  }

  const rawStart = body.startTime !== undefined ? body.startTime : existing?.startTime;
  if (typeof rawStart !== 'string' || !TIME_HH_MM_RE.test(rawStart.trim())) {
    return { ok: false, error: 'Giờ bắt đầu (startTime) phải theo định dạng HH:mm (VD: 06:00, 08:00, 22:00).' };
  }
  const startTime = rawStart.trim();

  const rawEnd = body.endTime !== undefined ? body.endTime : existing?.endTime;
  if (typeof rawEnd !== 'string' || !TIME_HH_MM_RE.test(rawEnd.trim())) {
    return { ok: false, error: 'Giờ kết thúc (endTime) phải theo định dạng HH:mm (VD: 14:00, 17:00, 06:00).' };
  }
  const endTime = rawEnd.trim();

  const breakMinutesRaw =
    body.breakMinutes !== undefined ? Number(body.breakMinutes) : (existing?.breakMinutes ?? 60);
  if (!Number.isInteger(breakMinutesRaw) || breakMinutesRaw < 0 || breakMinutesRaw > 240) {
    return { ok: false, error: 'Thời gian nghỉ giữa ca (breakMinutes) phải là số nguyên từ 0 đến 240 phút.' };
  }

  const standardHoursRaw =
    body.standardHours !== undefined ? Number(body.standardHours) : (existing?.standardHours ?? 8);
  if (!Number.isFinite(standardHoursRaw) || standardHoursRaw < 0.5 || standardHoursRaw > 24) {
    return { ok: false, error: 'Giờ công chuẩn (standardHours) phải từ 0.5 đến 24 giờ.' };
  }
  const standardHours = Math.round(standardHoursRaw * 100) / 100;

  const graceLateRaw =
    body.graceLateMinutes !== undefined
      ? Number(body.graceLateMinutes)
      : (existing?.graceLateMinutes ?? 15);
  if (!Number.isInteger(graceLateRaw) || graceLateRaw < 0 || graceLateRaw > 180) {
    return { ok: false, error: 'Dung sai đi muộn phải là số nguyên từ 0 đến 180 phút.' };
  }

  const graceEarlyRaw =
    body.graceEarlyMinutes !== undefined
      ? Number(body.graceEarlyMinutes)
      : (existing?.graceEarlyMinutes ?? 15);
  if (!Number.isInteger(graceEarlyRaw) || graceEarlyRaw < 0 || graceEarlyRaw > 180) {
    return { ok: false, error: 'Dung sai về sớm phải là số nguyên từ 0 đến 180 phút.' };
  }

  const isOvernight =
    typeof body.isOvernight === 'boolean'
      ? body.isOvernight
      : timeToMinutes(endTime) <= timeToMinutes(startTime);

  const isActive =
    typeof body.isActive === 'boolean' ? body.isActive : (existing?.isActive ?? true);

  return {
    ok: true,
    value: {
      code,
      name,
      startTime,
      endTime,
      isOvernight,
      breakMinutes: breakMinutesRaw,
      standardHours,
      graceLateMinutes: graceLateRaw,
      graceEarlyMinutes: graceEarlyRaw,
      isActive,
    },
  };
}

function assertShiftConfigRole(ctx: AuthContext): void {
  if (!(PROJECT_SHIFT_CONFIG_ROLES as ReadonlyArray<string>).includes(ctx.role)) {
    throw new ProjectShiftServiceError(
      'PERMISSION_DENIED',
      `Vai trò ${ctx.role} không có quyền cấu hình ca làm việc của dự án.`,
    );
  }
}

export async function listProjectShifts(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<ProjectShiftDto[]> {
  const delegate = (tx as unknown as { projectShift?: Prisma.ProjectShiftDelegate }).projectShift;
  if (!delegate?.findMany) return [];

  const rows = await delegate.findMany({
    where: { projectId },
    orderBy: [{ startTime: 'asc' }, { code: 'asc' }],
  });
  return rows.map(toDto);
}

export async function createProjectShift(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
  raw: unknown,
  auditMeta?: ProjectShiftAuditMeta,
): Promise<ProjectShiftDto> {
  assertShiftConfigRole(ctx);

  const validated = validateProjectShiftPayload(raw);
  if (!validated.ok) {
    throw new ProjectShiftServiceError('VALIDATION', validated.error);
  }
  const input = validated.value;

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    throw new ProjectShiftServiceError('NOT_FOUND', 'Không tìm thấy dự án hoặc nằm ngoài phạm vi truy cập.');
  }

  const duplicate = await tx.projectShift.findFirst({
    where: { projectId, code: input.code },
    select: { id: true },
  });
  if (duplicate) {
    throw new ProjectShiftServiceError(
      'CONFLICT',
      `Mã ca "${input.code}" đã tồn tại trong dự án này.`,
    );
  }

  const created = await tx.projectShift.create({
    data: {
      projectId,
      code: input.code,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      isOvernight: input.isOvernight,
      breakMinutes: input.breakMinutes,
      standardHours: input.standardHours,
      graceLateMinutes: input.graceLateMinutes,
      graceEarlyMinutes: input.graceEarlyMinutes,
      isActive: input.isActive,
    },
  });

  const dto = toDto(created);
  await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: auditMeta?.ipAddress ?? undefined,
      userAgent: auditMeta?.userAgent ?? undefined,
    },
    entityType: 'ProjectShift',
    entityId: created.id,
    action: 'SHIFT_CREATE',
    diff: { before: null, after: dto },
  });

  return dto;
}

export async function updateProjectShift(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
  shiftId: string,
  raw: unknown,
  auditMeta?: ProjectShiftAuditMeta,
): Promise<ProjectShiftDto> {
  assertShiftConfigRole(ctx);

  const existingRow = await tx.projectShift.findFirst({
    where: { id: shiftId, projectId },
  });
  if (!existingRow) {
    throw new ProjectShiftServiceError('NOT_FOUND', 'Không tìm thấy ca làm việc trong dự án.');
  }
  const beforeDto = toDto(existingRow);

  const validated = validateProjectShiftPayload(raw, beforeDto);
  if (!validated.ok) {
    throw new ProjectShiftServiceError('VALIDATION', validated.error);
  }
  const input = validated.value;

  if (input.code !== existingRow.code) {
    const duplicate = await tx.projectShift.findFirst({
      where: { projectId, code: input.code, id: { not: shiftId } },
      select: { id: true },
    });
    if (duplicate) {
      throw new ProjectShiftServiceError(
        'CONFLICT',
        `Mã ca "${input.code}" đã tồn tại trong dự án này.`,
      );
    }
  }

  const updated = await tx.projectShift.update({
    where: { id: shiftId },
    data: {
      code: input.code,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      isOvernight: input.isOvernight,
      breakMinutes: input.breakMinutes,
      standardHours: input.standardHours,
      graceLateMinutes: input.graceLateMinutes,
      graceEarlyMinutes: input.graceEarlyMinutes,
      isActive: input.isActive,
    },
  });

  const afterDto = toDto(updated);
  await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: auditMeta?.ipAddress ?? undefined,
      userAgent: auditMeta?.userAgent ?? undefined,
    },
    entityType: 'ProjectShift',
    entityId: updated.id,
    action: 'SHIFT_UPDATE',
    diff: { before: beforeDto, after: afterDto },
  });

  return afterDto;
}

export async function deleteProjectShift(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
  shiftId: string,
  auditMeta?: ProjectShiftAuditMeta,
): Promise<{ id: string }> {
  assertShiftConfigRole(ctx);

  const existingRow = await tx.projectShift.findFirst({
    where: { id: shiftId, projectId },
  });
  if (!existingRow) {
    throw new ProjectShiftServiceError('NOT_FOUND', 'Không tìm thấy ca làm việc trong dự án.');
  }
  const beforeDto = toDto(existingRow);

  await tx.projectShift.delete({
    where: { id: shiftId },
  });

  await writeAuditLog({
    prisma: tx,
    actor: {
      id: ctx.userId,
      role: ctx.role,
      ipAddress: auditMeta?.ipAddress ?? undefined,
      userAgent: auditMeta?.userAgent ?? undefined,
    },
    entityType: 'ProjectShift',
    entityId: shiftId,
    action: 'SHIFT_DELETE',
    diff: { before: beforeDto, after: null },
  });

  return { id: shiftId };
}
