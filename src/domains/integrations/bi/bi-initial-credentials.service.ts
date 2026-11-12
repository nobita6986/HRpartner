import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { hashPassword } from '@/src/shared/auth/password';
import { SYSTEM_BI_SYNC, withSystemDb } from '@/src/shared/auth/with-system-db';
import {
  decryptWorkerInitialPassword,
  encryptWorkerInitialPassword,
  generateWorkerInitialPassword,
} from './bi-credential-vault';

export interface WorkerInitialCredentialItem {
  userId: string;
  workerId: string;
  fullName: string;
  cccdNumber: string;
  phone: string | null;
  employeeCode: string;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  recruiterName: string | null;
  recruiterCode: string | null;
  validFrom: string | null;
  initialPassword: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

export class CredentialAccessError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CredentialAccessError';
  }
}

export async function listWorkerInitialCredentials(
  prisma: PrismaClient,
  ctx: AuthContext,
  options: {
    projectId?: string | null;
    auditAction?: 'VIEW_INITIAL_CREDENTIALS' | 'EXPORT_INITIAL_CREDENTIALS';
  } = {},
  env: Record<string, string | undefined> = process.env,
): Promise<WorkerInitialCredentialItem[]> {
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER' && ctx.role !== 'PM') {
    throw new CredentialAccessError(
      403,
      'FORBIDDEN',
      'Chỉ ADMIN, HR_MANAGER hoặc QLDA (PM) mới được xem/xuất mật khẩu ban đầu của NLĐ.',
    );
  }

  return withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
    let allowedProjectIds: string[] | null = null;
    if (ctx.role === 'PM') {
      const pmProjects = await tx.project.findMany({
        where: {
          OR: [
            { pmUserId: ctx.userId },
            { subPmUserId1: ctx.userId },
            { subPmUserId2: ctx.userId },
          ],
        },
        select: { id: true },
      });
      allowedProjectIds = pmProjects.map((p) => p.id);
      if (allowedProjectIds.length === 0) {
        return [];
      }
      if (options.projectId && !allowedProjectIds.includes(options.projectId)) {
        throw new CredentialAccessError(
          403,
          'PROJECT_OUT_OF_SCOPE',
          'Bạn chỉ được xem/xuất mật khẩu ban đầu của dự án do mình quản lý.',
        );
      }
    }

    const whereProjectId = options.projectId
      ? options.projectId
      : allowedProjectIds
        ? { in: allowedProjectIds }
        : undefined;

    const rows = await tx.workerInitialCredential.findMany({
      where: {
        ...(whereProjectId !== undefined ? { projectId: whereProjectId } : {}),
        user: {
          mustChangePassword: true,
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { id: true, mustChangePassword: true },
        },
        worker: {
          select: {
            id: true,
            fullName: true,
            cccdNumber: true,
            phone: true,
            assignments: {
              orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: {
                employeeCode: true,
                validFrom: true,
                recruiterName: true,
                recruiterCode: true,
                project: {
                  select: { id: true, code: true, name: true },
                },
              },
            },
          },
        },
        project: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    const items: WorkerInitialCredentialItem[] = [];
    for (const row of rows) {
      let initialPassword = '';
      try {
        initialPassword = decryptWorkerInitialPassword(row.ciphertext, env);
      } catch {
        continue;
      }

      const latestAssignment = row.worker.assignments[0] ?? null;
      const proj = row.project ?? latestAssignment?.project ?? null;

      items.push({
        userId: row.userId,
        workerId: row.workerId,
        fullName: row.worker.fullName ?? 'Chưa cập nhật',
        cccdNumber: row.worker.cccdNumber ?? '',
        phone: row.worker.phone ?? null,
        employeeCode: latestAssignment?.employeeCode ?? '',
        projectId: proj?.id ?? row.projectId ?? null,
        projectCode: proj?.code ?? null,
        projectName: proj?.name ?? null,
        recruiterName: latestAssignment?.recruiterName ?? null,
        recruiterCode: latestAssignment?.recruiterCode ?? null,
        validFrom: latestAssignment?.validFrom
          ? latestAssignment.validFrom.toISOString().slice(0, 10)
          : null,
        initialPassword,
        mustChangePassword: row.user.mustChangePassword,
        updatedAt: row.updatedAt.toISOString(),
      });
    }

    const auditAction = options.auditAction ?? 'VIEW_INITIAL_CREDENTIALS';
    await tx.auditLog.create({
      data: {
        actorId: ctx.userId,
        actorRole: ctx.role,
        action: auditAction,
        entityType: 'WORKER_INITIAL_CREDENTIAL',
        entityId: options.projectId ?? 'ALL_SCOPED_PROJECTS',
        diff: {
          projectId: options.projectId ?? null,
          count: items.length,
        },
      },
    });

    return items;
  });
}

export async function regenerateWorkerInitialCredential(
  prisma: PrismaClient,
  ctx: AuthContext,
  workerId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{
  workerId: string;
  userId: string;
  initialPassword: string;
}> {
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER') {
    throw new CredentialAccessError(
      403,
      'FORBIDDEN',
      'Chỉ ADMIN hoặc HR_MANAGER mới được cấp lại mật khẩu ban đầu.',
    );
  }

  return withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
    const worker = await tx.worker.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        accountUserId: true,
        assignments: {
          orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { projectId: true },
        },
      },
    });

    if (!worker || !worker.accountUserId) {
      throw new CredentialAccessError(
        404,
        'WORKER_NOT_FOUND',
        'Không tìm thấy hồ sơ NLĐ hoặc tài khoản liên kết.',
      );
    }

    const initialPassword = generateWorkerInitialPassword(10);
    const passwordHash = await hashPassword(initialPassword);
    const ciphertext = encryptWorkerInitialPassword(initialPassword, env);
    const latestProjectId = worker.assignments[0]?.projectId ?? null;

    await tx.user.update({
      where: { id: worker.accountUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    await tx.workerInitialCredential.upsert({
      where: { userId: worker.accountUserId },
      create: {
        userId: worker.accountUserId,
        workerId: worker.id,
        projectId: latestProjectId,
        ciphertext,
      },
      update: {
        workerId: worker.id,
        projectId: latestProjectId,
        ciphertext,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: ctx.userId,
        actorRole: ctx.role,
        action: 'REGENERATE_INITIAL_CREDENTIAL',
        entityType: 'WORKER',
        entityId: worker.id,
        diff: {
          userId: worker.accountUserId,
          mustChangePassword: true,
        },
      },
    });

    return {
      workerId: worker.id,
      userId: worker.accountUserId,
      initialPassword,
    };
  });
}
