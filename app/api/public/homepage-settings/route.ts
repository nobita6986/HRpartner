/**
 * GET /api/public/homepage-settings — AV1 public projection.
 *
 * NO auth. Anonymous read of the singleton HomepageSettings row.
 * Used by homepage and /viec-lam to know their page sizes.
 *
 * Cache: `unstable_cache` with tag `homepage-settings`, TTL 60s.
 * The tag is invalidated on admin write via `revalidateTag('homepage-settings')`.
 */
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getPrisma } from '@/src/lib/db';
import { getHomepageSettings } from '@/src/domains/job-board/public-settings.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60;

/**
 * Cached read. The settings row is a global singleton with no tenant data,
 * so no RLS context is needed — `getPrisma()` reads directly.
 *
 * The cached function returns a plain DTO; the `unstable_cache` dedupes
 * concurrent reads within the TTL window.
 */
const getCachedSettings = unstable_cache(
  async () => {
    const prisma = getPrisma();
    return getHomepageSettings(prisma);
  },
  ['homepage-settings-v1'],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ['homepage-settings'],
  },
);

export async function GET(): Promise<NextResponse> {
  try {
    const dto = await getCachedSettings();
    return NextResponse.json(dto, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`,
      },
    });
  } catch (err) {
    console.error('[public/homepage-settings] error:', err);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to read homepage settings' },
      { status: 500 },
    );
  }
}
