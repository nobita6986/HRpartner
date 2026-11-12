import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import {
  CredentialAccessError,
  listWorkerInitialCredentials,
  regenerateWorkerInitialCredential,
} from '@/src/domains/integrations/bi/bi-initial-credentials.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const regenerateSchema = z.object({
  workerId: z.string().trim().min(1),
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

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim() || null;
  const prisma = getPrisma();

  try {
    const items = await listWorkerInitialCredentials(prisma, ctx, {
      projectId,
      auditAction: 'VIEW_INITIAL_CREDENTIALS',
    });
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    if (err instanceof CredentialAccessError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Không thể tải danh sách mật khẩu ban đầu.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (err) {
    if (err instanceof AuthSessionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const parsed = regenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Thiếu workerId.' },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  try {
    const regenerated = await regenerateWorkerInitialCredential(
      prisma,
      ctx,
      parsed.data.workerId,
    );
    return NextResponse.json({ ok: true, credential: regenerated });
  } catch (err) {
    if (err instanceof CredentialAccessError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Không thể cấp lại mật khẩu ban đầu.' },
      { status: 500 },
    );
  }
}
