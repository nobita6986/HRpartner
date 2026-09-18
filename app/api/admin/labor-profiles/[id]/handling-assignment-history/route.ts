import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getHandlingAssignmentHistory } from '@/src/domains/talent/handling-assignment.service';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

export async function GET(
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

  const prisma = getPrisma();

  try {
    const history = await withDbContext(prisma, session, async (tx) => {
      return getHandlingAssignmentHistory(tx, laborProfileId);
    });

    return NextResponse.json({ history });
  } catch (err) {
    console.error('Error fetching history:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
