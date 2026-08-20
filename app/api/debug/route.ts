import { NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const prisma = getPrisma();
  
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':***@');
  
  const workerUser = await prisma.user.findFirst({ where: { phone: '0910000002' } });
  
  let worker = null;
  if (workerUser) {
    worker = await prisma.worker.findUnique({
      where: { accountUserId: workerUser.id }
    });
  }
  
  return NextResponse.json({
    env: process.env.NODE_ENV,
    dbUrl: maskedUrl,
    workerUser,
    worker,
  });
}
