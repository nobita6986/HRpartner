/**
 * PUT /api/projects/[id]/sites/[siteId] — hrp-t1a-android-gps-project-site-config.
 *
 * Admin/BoD cập nhật địa chỉ / latitude / longitude / radiusMeters của Site
 * thuộc Project (T0 §B4). Validation: lat+lng cùng có hoặc cùng vắng; miền
 * -90..90 / -180..180; radius integer 1..2000; allowlist field; projectId/siteId
 * LẤY TỪ ROUTE PARAM — không tin body.
 *
 * Role: CHỈ `PROJECT_GEO_CONFIG_ROLES` (ADMIN/DIRECTOR). Lưu toạ độ hợp lệ ⇒
 * set `geoConfirmedAt/geoConfirmedById`; bỏ toạ độ ⇒ clear markers (T0 §5).
 * Audit: `Site/GPS_UPDATE` before/after trong cùng tx (service).
 *
 * Không idempotency — mutation hiện hành không idempotent-key (audit đủ).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { extractRequestMeta } from '@/src/shared/auth/session-adapter';
import { updateSiteGps, PROJECT_GEO_CONFIG_ROLES, SiteGpsServiceError } from '@/src/domains/crm/site-gps.service';
import { mapSiteGpsError } from '@/src/domains/crm/site-gps-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; siteId: string }> },
) {
  let ctx: AuthContext | undefined;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  // Route-level role gate (defense-in-depth: service cũng tự gate).
  if (!(PROJECT_GEO_CONFIG_ROLES as ReadonlyArray<string>).includes(ctx.role)) {
    return NextResponse.json(
      {
        error: 'PERMISSION_DENIED',
        message: `Chỉ Admin/BoD (ADMIN/DIRECTOR) mới được cấu hình GPS của Site. Vai trò hiện tại: ${ctx.role}.`,
      },
      { status: 403 },
    );
  }

  const { id, siteId } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON.' }, { status: 400 });
  }

  const prisma = getPrisma();
  const auditMeta = extractRequestMeta(req);

  try {
    const site = await withDbContext(prisma, ctx, (tx) =>
      updateSiteGps(tx, ctx, id, siteId, raw, auditMeta),
    );
    return NextResponse.json({ site });
  } catch (e) {
    if (e instanceof SiteGpsServiceError) {
      return mapSiteGpsError(e);
    }
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/projects/[id]/sites/[siteId] PUT] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể cập nhật cấu hình GPS của Site.' }, { status: 500 });
  }
}
