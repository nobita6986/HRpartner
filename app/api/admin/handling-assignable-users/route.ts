import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER']);

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prisma = getPrisma();
  
  try {
    const users = await withDbContext(prisma, session, async (tx) => {
      // Just fetch STAFF and MANAGER roles for assignment dropdown
      return tx.user.findMany({
        where: {
          role: { in: ['HR_STAFF', 'HR_MANAGER'] },
          isActive: true,
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
    });
    
    return NextResponse.json({ users });
  } catch (err) {
    console.error('Error fetching assignable users:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
