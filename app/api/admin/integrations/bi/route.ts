import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { SYSTEM_BI_SYNC, withSystemDb } from '@/src/shared/auth/with-system-db';
import { DEFAULT_BI_SYNC_BASE_URL } from '@/src/domains/integrations/bi/bi-sync-client';
import {
  BI_SOURCE_SYSTEM,
  BiSyncConfigurationError,
  saveBiSyncCredentials,
} from '@/src/domains/integrations/bi/bi-worker-sync.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateConfigSchema = z.object({
  baseUrl: z.string().trim().url('Base URL phải là đường dẫn hợp lệ.').optional(),
  apiKey: z.string().trim().min(16, 'BI API Key phải có ít nhất 16 ký tự.').optional(),
});

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (err) {
    if (err instanceof AuthSessionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER' && ctx.role !== 'PM') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Bạn không có quyền truy cập trang tích hợp BI.' },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const data = await withSystemDb(prisma, SYSTEM_BI_SYNC, async (tx) => {
    const cred = await tx.biSyncCredential.findUnique({
      where: { id: 'primary' },
    });

    const runs =
      ctx.role === 'PM'
        ? []
        : await tx.biSyncRun.findMany({
            orderBy: { startedAt: 'desc' },
            take: 15,
          });

    const exceptions =
      ctx.role === 'PM'
        ? []
        : await tx.biSyncException.findMany({
            where: { status: 'OPEN' },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          });

    const projectLinks =
      ctx.role === 'PM'
        ? []
        : await tx.externalEntityLink.findMany({
            where: {
              sourceSystem: BI_SOURCE_SYSTEM,
              entityType: 'PROJECT',
            },
            orderBy: { updatedAt: 'desc' },
          });

    const linkedHrpIds = projectLinks
      .map((l) => l.hrpId)
      .filter((id): id is string => typeof id === 'string');

    const linkedProjects =
      linkedHrpIds.length > 0
        ? await tx.project.findMany({
            where: { id: { in: linkedHrpIds } },
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              siteAddress: true,
              sites: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                  radiusMeters: true,
                  geoConfirmedAt: true,
                },
              },
            },
          })
        : [];

    const projectById = new Map(linkedProjects.map((p) => [p.id, p]));

    const scopedProjects = await tx.project.findMany({
      where:
        ctx.role === 'PM'
          ? {
              OR: [
                { pmUserId: ctx.userId },
                { subPmUserId1: ctx.userId },
                { subPmUserId2: ctx.userId },
              ],
            }
          : {},
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });

    return {
      role: ctx.role,
      config: {
        baseUrl: cred?.baseUrl ?? process.env.BI_HRP_SYNC_BASE_URL ?? DEFAULT_BI_SYNC_BASE_URL,
        hasApiKey: Boolean(cred?.apiKeyCiphertext || process.env.BI_HRP_SYNC_API_KEY),
        workerSyncCheckpoint: cred?.workerSyncCheckpoint ?? null,
        updatedAt: cred?.updatedAt ? cred.updatedAt.toISOString() : null,
      },
      runs: runs.map((r) => ({
        id: r.id,
        triggerSource: r.triggerSource,
        mode: r.mode,
        status: r.status,
        checkpointBefore: r.checkpointBefore,
        checkpointAfter: r.checkpointAfter,
        catalogProjectsSynced: r.catalogProjectsSynced,
        episodesFetched: r.episodesFetched,
        episodesApplied: r.episodesApplied,
        episodesSkipped: r.episodesSkipped,
        tombstonesProcessed: r.tombstonesProcessed,
        exceptionsOpened: r.exceptionsOpened,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
      exceptions: exceptions.map((ex) => ({
        id: ex.id,
        exceptionType: ex.exceptionType,
        externalId: ex.externalId,
        projectExternalId: ex.projectExternalId,
        status: ex.status,
        lastSyncVersion: ex.lastSyncVersion.toString(),
        summary: ex.summary,
        details: ex.details,
        updatedAt: ex.updatedAt.toISOString(),
      })),
      projectMappings: projectLinks.map((link) => {
        const hrpProject = link.hrpId ? projectById.get(link.hrpId) : null;
        const confirmedSite = hrpProject?.sites.find(
          (s) => s.latitude !== null && s.longitude !== null && s.geoConfirmedAt !== null,
        );
        return {
          externalProjectId: link.externalId,
          lastSyncVersion: link.lastSyncVersion.toString(),
          hrpProjectId: hrpProject?.id ?? null,
          hrpProjectCode: hrpProject?.code ?? null,
          hrpProjectName: hrpProject?.name ?? null,
          hasConfirmedGps: Boolean(confirmedSite),
          geoConfirmedAt: confirmedSite?.geoConfirmedAt
            ? confirmedSite.geoConfirmedAt.toISOString()
            : null,
          radiusMeters: confirmedSite?.radiusMeters ?? null,
        };
      }),
      projects: scopedProjects,
    };
  });

  return NextResponse.json({ ok: true, ...data });
}

export async function PUT(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (err) {
    if (err instanceof AuthSessionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (ctx.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Chỉ ADMIN mới được cập nhật cấu hình API Key tích hợp BI.' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  const parsed = updateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Cấu hình không hợp lệ.',
      },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  try {
    const saved = await saveBiSyncCredentials(prisma, {
      baseUrl: parsed.data.baseUrl ?? DEFAULT_BI_SYNC_BASE_URL,
      apiKey: parsed.data.apiKey,
      updatedByUserId: ctx.userId,
    });
    return NextResponse.json({ ok: true, config: saved });
  } catch (err) {
    if (err instanceof BiSyncConfigurationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Không thể lưu cấu hình tích hợp BI.' },
      { status: 500 },
    );
  }
}
