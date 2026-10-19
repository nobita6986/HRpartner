/**
 * POST /api/projects/[id]/sites — hrp-t1a-android-gps-project-site-config.
 *
 * Tạo Site gắn vào Project HIỆN HỮU (T0 §B4). KHÔNG tạo Project mới,
 * KHÔNG seed, KHÔNG tự suy toạ độ. Body chỉ nhận { name, address?, latitude?,
 * longitude?, radiusMeters? }; projectId LẤY TỪ ROUTE PARAM — không tin body.
 *
 * Role: CHỈ `PROJECT_GEO_CONFIG_ROLES` từ site-gps.service (ADMIN/DIRECTOR).
 * Idempotency: header `x-idempotency-key` + withIdempotency (route
 * `POST:/api/projects/${id}/sites`) — cùng key + cùng payload ⇒ replay,
 * khác payload ⇒ 409.
 *
 * Audit: `Site/GPS_CREATE` (before null / after DTO) trong cùng tx qua service.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency } from '@/src/shared/integrity/idempotency';
import { extractRequestMeta } from '@/src/shared/auth/session-adapter';
import { createSiteForProject, PROJECT_GEO_CONFIG_ROLES, SiteGpsServiceError } from '@/src/domains/crm/site-gps.service';
import { mapSiteGpsError } from '@/src/domains/crm/site-gps-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx: AuthContext | undefined;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  // Route-level role gate (defense-in-depth: service cũng tự gate quyết định).
  if (!(PROJECT_GEO_CONFIG_ROLES as ReadonlyArray<string>).includes(ctx.role)) {
    return NextResponse.json(
      {
        error: 'PERMISSION_DENIED',
        message: `Chỉ Admin/BoD (ADMIN/DIRECTOR) mới được cấu hình GPS của Site. Vai trò hiện tại: ${ctx.role}.`,
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON.' }, { status: 400 });
  }

  const prisma = getPrisma();
  const idempotencyKey = req.headers.get('x-idempotency-key') ?? '';
  const auditMeta = extractRequestMeta(req);

  const runOnce = async (): Promise<{ body: unknown; statusCode: number }> => ({
    body: {
      site: await withDbContext(prisma, ctx!, (tx) => createSiteForProject(tx, ctx!, id, raw, auditMeta)),
    },
    statusCode: 201,
  });

  try {
    if (!idempotencyKey) {
      const result = await runOnce();
      return NextResponse.json(result.body, { status: result.statusCode });
    }
    const result = await withIdempotency({
      prisma,
      route: `POST:/api/projects/${id}/sites`,
      actorId: ctx!.userId,
      key: idempotencyKey,
      requestBody: raw,
      handler: runOnce,
    });
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (e) {
    if (e instanceof SiteGpsServiceError) {
      return mapSiteGpsError(e);
    }
    if (e instanceof Error && e.name === 'IdempotencyConflictError') {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    console.error('[api/projects/[id]/sites POST] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể tạo Site.' }, { status: 500 });
  }
}
