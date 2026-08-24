import { NextRequest } from 'next/server';
import { handleScreeningAction } from '../handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleScreeningAction(req, id, 'reject');
}