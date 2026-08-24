import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { requirePermission, AuthError } from '@/src/shared/auth/require-permission';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import { publishJob, PublishJobServiceError } from '@/src/domains/job-board/publish.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PUBLISH_SCOPE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR']);

type RouteParams = { params: Promise<{ id: string }> };

type PublishBody = {
  isPublic?: boolean;
  expectedVersion?: number;
  reason?: string;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
    if (!PUBLISH_SCOPE_ROLES.has(ctx.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: `Role ${ctx.role} is outside the publish scope` }, { status: 403 });
    }
    await requirePermission(ctx, 'CAN_PUBLISH_JOB');
  } catch (error) {
    if (error instanceof AuthSessionError) return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    if (error instanceof AuthError) return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  let body: PublishBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Body must be valid JSON' }, { status: 400 });
  }
  if (typeof body.isPublic !== 'boolean') {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'isPublic must be boolean' }, { status: 400 });
  }

  const { id } = await params;
  const prisma = getPrisma();
  const requestBody = { projectId: id, ...body };
  const idempotencyKey = req.headers.get('x-idempotency-key');

  try {
    const execute = async () => {
      const result = await withDbContext(prisma, ctx, (tx) => publishJob(tx, ctx, {
        projectId: id,
        isPublic: body.isPublic!,
        expectedVersion: body.expectedVersion,
        reason: body.reason,
      }));
      return { body: { ...result, replayed: false }, statusCode: 200 };
    };
    if (!idempotencyKey) return NextResponse.json((await execute()).body);
    const result = await withIdempotency({
      prisma,
      route: `POST:/api/projects/${id}/publish`,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody,
      handler: execute,
    });
    return NextResponse.json({ ...(result.body as Record<string, unknown>), replayed: result.replayed }, { status: result.statusCode });
  } catch (error) {
    if (error instanceof PublishJobServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'STALE_VERSION' ? 409 : 400;
      return NextResponse.json({ error: error.code, message: error.message }, { status });
    }
    if (error instanceof IdempotencyConflictError) return NextResponse.json({ error: 'IDEMPOTENCY_PAYLOAD_MISMATCH', message: error.message }, { status: 409 });
    console.error('[api/projects/[id]/publish] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to publish job' }, { status: 500 });
  }
}
