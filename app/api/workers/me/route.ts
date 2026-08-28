/**
 * GET /api/workers/me — Phase 2 / RQ-06 / DEC-07
 *
 * Worker self-profile: chỉ role WORKER mới đọc được.
 * Role khác → 403.
 *
 * Auth: cookie hrp_token (Phase 1).
 * 401: thiếu/sai token.
 * 403: role không phải WORKER.
 * 404: worker không tồn tại (đã tạo user nhưng chưa có worker profile — edge case).
 *
 * L1 + L2 đều pass. Response chỉ chứa CHÍNH MÌNH.
 * V5-M1-09A (DEC-05): action='SELF_PROFILE' → WORKER LUÔN thấy CCCD/bank của chính mình
 *   (canSeeSensitive=true, không cần CAN_VIEW_WORKER_SENSITIVE). cccdChipData vẫn LUÔN
 *   bị omit khỏi HTTP kể cả self. Response đi qua allowlist DTO (projectWorker).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { projectWorker } from '@/src/shared/auth/worker-projection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to build auth context' },
      { status: 500 },
    );
  }

  // Role gate — chỉ WORKER
  if (ctx.role !== 'WORKER') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Endpoint chỉ dành cho role WORKER' },
      { status: 403 },
    );
  }

  // Worker phải có workerId trong session (lookup qua accountUserId trong getAuthContext)
  if (!ctx.workerId) {
    return NextResponse.json(
      { error: 'WORKER_PROFILE_NOT_FOUND', message: 'Worker profile chưa được tạo' },
      { status: 404 },
    );
  }

  const prisma = getPrisma();

  let row;
  try {
    row = await withDbContext(prisma, ctx, async (tx) => {
      // L2 RLS qua GUC. L1: chỉ chính mình, không cần scope registry.
      return tx.worker.findUnique({
        where: { id: ctx.workerId },
      });
    });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: 403 },
      );
    }
    console.error('[api/workers/me] query error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to query worker' },
      { status: 500 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: 'WORKER_NOT_FOUND', message: 'Worker không tồn tại' },
      { status: 404 },
    );
  }

  // SELF_PROFILE (DEC-05): WORKER luôn thấy CCCD/bank của CHÍNH MÌNH (canSeeSensitive=true),
  // KHÔNG phụ thuộc CAN_VIEW_WORKER_SENSITIVE; cccdChipData vẫn LUÔN omit.
  const effPerms = await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role });
  const hasSensitive = effPerms.has('CAN_VIEW_WORKER_SENSITIVE');

  const projected = projectWorker(row, { hasSensitivePermission: hasSensitive, action: 'SELF_PROFILE' });
  return NextResponse.json({ worker: projected });
}