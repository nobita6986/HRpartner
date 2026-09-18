import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { managerAssign, releaseHandlingAssignment } from '@/src/domains/talent/handling-assignment.service';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const laborProfileId = resolvedParams.id;
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { newAssigneeUserId, days, reason } = body;

  if (!reason || typeof reason !== 'string') {
    return NextResponse.json({ error: 'Reason is required and must be a string' }, { status: 400 });
  }

  const prisma = getPrisma();

  try {
    const result = await withDbContext(prisma, session, async (tx) => {
      if (newAssigneeUserId) {
        return await managerAssign(tx, {
          laborProfileId,
          newAssigneeUserId,
          managerUserId: session.userId,
          days: days ? Number(days) : null,
          reason,
        });
      } else {
        return await releaseHandlingAssignment(tx, {
          laborProfileId,
          actorId: session.userId,
          reason,
        });
      }
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Conflict: Assignment was modified concurrently.' }, { status: 409 });
    }
    console.error('Error handling assignment:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
