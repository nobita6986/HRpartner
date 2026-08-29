import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(req: NextRequest): boolean {
  const expected = process.env.DB_DIAG_TOKEN ?? '';
  const supplied = req.headers.get('x-db-diag-token') ?? '';
  if (!expected || expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const rawUrl = process.env.DATABASE_URL ?? '';
  let target = { hostDigest: 'invalid', database: 'unknown', role: 'unknown' };
  try {
    const parsed = new URL(rawUrl);
    target = {
      hostDigest: createHash('sha256').update(parsed.hostname).digest('hex').slice(0, 12),
      database: parsed.pathname.replace(/^\//, ''),
      role: decodeURIComponent(parsed.username),
    };
  } catch {
    // The diagnostic never returns the raw URL.
  }

  const rows = await getPrisma().$queryRawUnsafe<Array<{
    current_role: string;
    current_schema: string | null;
    candidate_table: string | null;
  }>>(`
    SELECT
      current_user::text AS current_role,
      current_schema()::text AS current_schema,
      to_regclass('public.candidate_submissions')::text AS candidate_table
  `);

  return NextResponse.json(
    {
      target,
      runtime: {
        role: rows[0]?.current_role ?? null,
        schema: rows[0]?.current_schema ?? null,
        candidateSubmissionsPresent: rows[0]?.candidate_table === 'candidate_submissions',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
