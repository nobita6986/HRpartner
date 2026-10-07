/**
 * hero-slides-service.test.ts — hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-10).
 *
 * Unit fence tests cho service `buildHeroSlidesPublic` + schema `HeroSlidesSchema`.
 * Đảm bảo:
 *   - Parse null/undefined → mảng rỗng (fallback hardcoded).
 *   - Parse fail (length ≠ 5, field out-of-range) → mảng rỗng (không vỡ public).
 *   - Parse OK với 5 mediaId hợp lệ → join media, gắn URL + alt.
 *   - mediaId null vẫn join thành công (URL null, alt = '').
 *   - Media row missing → trả về với URL null (không vỡ carousel).
 */
import { describe, expect, it, vi } from 'vitest';
import {
  HERO_SLIDE_DESC_MAX,
  HERO_SLIDE_TITLE_MAX,
  HERO_SLIDES_COUNT,
  HeroSlidesSchema,
} from '@/src/domains/job-board/public-types';
import { buildHeroSlidesPublic } from '@/src/domains/job-board/public-settings.service';

function makePrisma(mediaRows: Array<{ id: string; url: string; alt: string; caption: string | null }>) {
  return {
    homepageSettings: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    media: {
      findMany: vi.fn().mockResolvedValue(mediaRows),
      findUnique: vi.fn(),
    },
  } as unknown as Extract<Parameters<typeof buildHeroSlidesPublic>[1], { media: object }>;
}

describe('HeroSlidesSchema', () => {
  it('rejects arrays shorter than 5', () => {
    expect(HeroSlidesSchema.safeParse([]).success).toBe(false);
    expect(HeroSlidesSchema.safeParse([{ mediaId: null, title: 'a', desc: '' }]).success).toBe(false);
  });

  it('rejects arrays longer than 5', () => {
    const arr = Array.from({ length: 6 }, () => ({ mediaId: null, title: 'a', desc: '' }));
    expect(HeroSlidesSchema.safeParse(arr).success).toBe(false);
  });

  it('rejects empty title', () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, () => ({ mediaId: null, title: '', desc: '' }));
    expect(HeroSlidesSchema.safeParse(arr).success).toBe(false);
  });

  it('rejects title over max', () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, () => ({
      mediaId: null,
      title: 'a'.repeat(HERO_SLIDE_TITLE_MAX + 1),
      desc: '',
    }));
    expect(HeroSlidesSchema.safeParse(arr).success).toBe(false);
  });

  it('rejects desc over max', () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, () => ({
      mediaId: null,
      title: 'ok',
      desc: 'a'.repeat(HERO_SLIDE_DESC_MAX + 1),
    }));
    expect(HeroSlidesSchema.safeParse(arr).success).toBe(false);
  });

  it('accepts exactly 5 well-formed slots', () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, (_, i) => ({
      mediaId: null,
      title: `Slide ${i + 1}`,
      desc: '',
    }));
    expect(HeroSlidesSchema.safeParse(arr).success).toBe(true);
  });
});

describe('buildHeroSlidesPublic', () => {
  it('returns [] when column is null', async () => {
    const prisma = makePrisma([]);
    expect(await buildHeroSlidesPublic(null, prisma)).toEqual([]);
    expect((prisma.media as unknown as { findMany: ReturnType<typeof vi.fn> }).findMany).not.toHaveBeenCalled();
  });

  it('returns [] when column is undefined', async () => {
    const prisma = makePrisma([]);
    expect(await buildHeroSlidesPublic(undefined as never, prisma)).toEqual([]);
  });

  it('returns [] when JSON parse fails (length mismatch)', async () => {
    const prisma = makePrisma([]);
    expect(await buildHeroSlidesPublic([{ mediaId: null, title: 'a', desc: '' }] as never, prisma)).toEqual([]);
  });

  it('returns 5 slots with joined media URL/alt when media rows present', async () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, (_, i) => ({
      mediaId: `media-${i + 1}`,
      title: `Slide ${i + 1}`,
      desc: `desc ${i + 1}`,
    }));
    const mediaRows = arr.map((s, i) => ({
      id: s.mediaId,
      url: `https://cdn/${i + 1}.jpg`,
      alt: `alt ${i + 1}`,
      caption: null,
    }));
    const prisma = makePrisma(mediaRows);
    const out = await buildHeroSlidesPublic(arr, prisma);
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({
      index: 1,
      mediaId: 'media-1',
      url: 'https://cdn/1.jpg',
      alt: 'alt 1',
      title: 'Slide 1',
      desc: 'desc 1',
    });
    expect(out[4].mediaId).toBe('media-5');
  });

  it('returns null url/empty alt when mediaId is null (slot not picked)', async () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, () => ({
      mediaId: null,
      title: 'ok',
      desc: '',
    }));
    const prisma = makePrisma([]);
    const out = await buildHeroSlidesPublic(arr, prisma);
    expect(out).toHaveLength(5);
    expect(out[0]?.url).toBeNull();
    expect(out[0]?.alt).toBe('');
  });

  it('returns null url when media row was deleted (no match in mediaMap)', async () => {
    const arr = Array.from({ length: HERO_SLIDES_COUNT }, () => ({
      mediaId: 'media-deleted',
      title: 'ok',
      desc: '',
    }));
    const prisma = makePrisma([]);
    const out = await buildHeroSlidesPublic(arr, prisma);
    expect(out[0]?.url).toBeNull();
    expect(out[0]?.alt).toBe('');
    expect(out[0]?.mediaId).toBe('media-deleted');
  });

  it('deduplicates mediaIds before lookup', async () => {
    const arr = [
      { mediaId: 'media-1', title: 'a', desc: '' },
      { mediaId: 'media-1', title: 'b', desc: '' },
      { mediaId: null, title: 'c', desc: '' },
      { mediaId: null, title: 'd', desc: '' },
      { mediaId: null, title: 'e', desc: '' },
    ];
    const findMany = vi.fn().mockResolvedValue([{ id: 'media-1', url: 'https://x/1.jpg', alt: 'a1', caption: null }]);
    const prisma = {
      homepageSettings: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
      media: { findMany, findUnique: vi.fn() },
    } as unknown as Extract<Parameters<typeof buildHeroSlidesPublic>[1], { media: object }>;
    const out = await buildHeroSlidesPublic(arr, prisma);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['media-1'] } } }),
    );
    expect(out).toHaveLength(5);
    expect(out[0]?.url).toBe('https://x/1.jpg');
    expect(out[1]?.url).toBe('https://x/1.jpg');
  });
});