import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { convertApplication, ConversionError } from '@/src/domains/applications/conversion.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ConvertBody {
  reason?: string;
  expectedVersion?: number;
  existingWorkerId?: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  let body: ConvertBody;
  try {
    body = (await req.json()) as ConvertBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }
  if (body.expectedVersion !== undefined && (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0)) {
    return NextResponse.json({ error: 'VALIDATION', message: 'expectedVersion must be a non-negative integer' }, { status: 400 });
  }

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) => convertApplication(tx, ctx, id, {
      reason: body.reason ?? '',
      expectedVersion: body.expectedVersion,
      existingWorkerId: body.existingWorkerId?.trim() || undefined,
    }));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConversionError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/applications/:id/actions/convert] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to convert application' }, { status: 500 });
  }
}