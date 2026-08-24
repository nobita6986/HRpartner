import { NextRequest, NextResponse } from 'next/server';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  if (ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  return NextResponse.json({ status: 'ok' });
}