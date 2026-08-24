import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  executeScreeningAction,
  ScreeningCommandError,
  type ScreeningCommandInput,
} from '@/src/domains/applications/screening.service';
import type { ScreeningAction } from '@/src/domains/applications/status-machine';

export async function handleScreeningAction(
  req: NextRequest,
  id: string,
  action: ScreeningAction,
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  let body: Partial<ScreeningCommandInput> & { note?: string };
  try {
    body = (await req.json()) as Partial<ScreeningCommandInput> & { note?: string };
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }
  const reason = body.reason ?? body.note ?? '';
  if (body.expectedVersion !== undefined && (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0)) {
    return NextResponse.json({ error: 'VALIDATION', message: 'expectedVersion must be a non-negative integer' }, { status: 400 });
  }

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      executeScreeningAction(tx, ctx, id, action, {
        reason,
        expectedVersion: body.expectedVersion,
      }),
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ScreeningCommandError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.httpStatus });
    }
    console.error(`[api/admin/applications/:id/actions/${action}] error:`, error);
    return NextResponse.json({ error: 'INTERNAL', message: `Failed to ${action} application` }, { status: 500 });
  }
}