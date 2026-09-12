/**
 * GET /api/public/media — Public projection of PUBLIC media for an owner.
 *
 * NO AUTH — public endpoint for rendering assigned media on public pages.
 * Trả về các media PUBLIC gán cho (ownerType, ownerId).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { listPublicMediaForOwner } from '@/src/domains/media/media.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const ownerType = url.searchParams.get('ownerType');
  const ownerId = url.searchParams.get('ownerId');

  if (!ownerType || !ownerId) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'ownerType và ownerId là bắt buộc.' },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const result = await listPublicMediaForOwner(prisma, ownerType, ownerId);
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    },
  });
}
