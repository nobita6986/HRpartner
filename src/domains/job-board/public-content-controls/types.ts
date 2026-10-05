/**
 * public-content-controls/types.ts — UI2 public content controls (Phase A).
 *
 * Single source of truth for the typed contracts that the Phase A
 * `<StickyAnnouncement>` and `<NewsSectionGate>` consume.
 *
 * Phase A does NOT persist these types — they are DTOs that Phase B will
 * project from the canonical `HomepageSettings` row after T1B's UI V1 merge.
 * Living in a new module keeps `src/domains/job-board/public-types.ts`
 * (T1B-owned) untouched.
 *
 * Mirrors the AV1 pattern: a frozen `Dto`, a typed enums for each admin
 * control, and pure helpers that downstream components compose.
 *
 * No third-party dependencies. No HTML / JSX strings.
 */

import { z } from 'zod';

/* ─── Sticky announcement ──────────────────────────────────────────────── */

export const STICKY_ANIMATIONS = ['NONE', 'BLINK', 'MARQUEE'] as const;
export type StickyAnimation = (typeof STICKY_ANIMATIONS)[number];

/**
 * Text color allow-list. The component renders these as a `color: var(--*)`
 * CSS variable from the existing palette; arbitrary hex is rejected.
 */
export const STICKY_TEXT_COLORS = [
  'on-primary',
  'on-surface',
  'on-secondary-container',
] as const;
export type StickyTextColor = (typeof STICKY_TEXT_COLORS)[number];

/** Font style allow-list. */
export const STICKY_FONTS = ['SANS', 'SERIF'] as const;
export type StickyFont = (typeof STICKY_FONTS)[number];

/** Font weight allow-list. The component maps to a Tailwind class. */
export const STICKY_EMPHASIS = ['NORMAL', 'BOLD', 'EXTRA_BOLD'] as const;
export type StickyEmphasis = (typeof STICKY_EMPHASIS)[number];

/**
 * StickyAnnouncementDto — the safe, public-facing projection. The admin write
 * path (Phase B) writes through these same fields; the public read path
 * (Phase B) projects through `toStickyAnnouncementView`.
 */
export interface StickyAnnouncementDto {
  /** Master switch. When false, the component renders null. */
  enabled: boolean;
  /** Plain text message. Rendered as text node — no HTML, no entities. */
  message: string;
  /** CTA label. Required only when ctaUrl is set; otherwise null. */
  ctaLabel: string | null;
  /**
   * CTA URL. Validated by `normalizeCtaUrl`: relative pathnames or `https://`
   * absolute URLs only. Null disables the CTA entirely.
   */
  ctaUrl: string | null;
  /** Whether the user may dismiss the bar. */
  dismissible: boolean;
  /** Background opacity percentage. Text and controls remain fully opaque. */
  backgroundOpacity: number;
  /** Duration of one marquee cycle in seconds. */
  marqueeDurationSeconds: number;
  /** Text color enum. */
  textColor: StickyTextColor;
  /** Font style enum. */
  font: StickyFont;
  /** Font weight enum. */
  emphasis: StickyEmphasis;
  /** Animation enum. */
  animation: StickyAnimation;
  /**
   * Stable, admin-published revision identifier. The dismiss state is keyed
   * by this; a new revision reappears for users who dismissed the prior one.
   * Phase A uses a hash; Phase B will store an admin-editable counter or
   * timestamp alongside.
   */
  contentRevision: string;
}

/* ─── News section toggle ─────────────────────────────────────────────── */

/**
 * NewsSectionToggle — the boolean read from the canonical `HomepageSettings`
 * row in Phase B. Default true preserves the current public state.
 */
export interface NewsSectionToggle {
  newsSectionEnabled: boolean;
}

/**
 * NewsSectionGate — the resolved view-model that the existing
 * `if (!content.enabled) return null` policy in `news-section.tsx` already
 * understands. The component is untouched in Phase A; the gate is composed
 * alongside it in Phase B.
 */
export interface NewsSectionGate {
  enabled: boolean;
  source: 'REAL' | 'INTEGRATION_PENDING';
}

/* ─── Zod schemas (single source for both client + server validation) ─── */

export const StickyAnnouncementSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(280),
  ctaLabel: z.string().max(60).nullable(),
  ctaUrl: z.string().max(2048).nullable(),
  dismissible: z.boolean(),
  backgroundOpacity: z.number().int().min(0).max(100).default(100),
  marqueeDurationSeconds: z.number().int().min(5).max(60).default(18),
  textColor: z.enum(STICKY_TEXT_COLORS),
  font: z.enum(STICKY_FONTS),
  emphasis: z.enum(STICKY_EMPHASIS),
  animation: z.enum(STICKY_ANIMATIONS),
  contentRevision: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, {
      message: 'contentRevision chỉ chứa chữ, số, gạch dưới và gạch ngang.',
    }),
});

export const NewsSectionToggleSchema = z.object({
  newsSectionEnabled: z.boolean(),
});

/* ─── Default factories ────────────────────────────────────────────────── */

export const STICKY_ANNOUNCEMENT_DEFAULTS: Omit<
  StickyAnnouncementDto,
  'message' | 'contentRevision'
> = {
  enabled: false,
  ctaLabel: null,
  ctaUrl: null,
  dismissible: true,
  backgroundOpacity: 100,
  marqueeDurationSeconds: 18,
  textColor: 'on-primary',
  font: 'SANS',
  emphasis: 'BOLD',
  animation: 'NONE',
};

/**
 * `safeStickyAnnouncement` — pure helper that fills in a full DTO with the
 * default factory when the input is missing fields. Used by the public
 * projection (Phase B) and by the unit tests.
 */
export function safeStickyAnnouncement(
  partial: Partial<StickyAnnouncementDto> | null | undefined,
): StickyAnnouncementDto {
  const base: StickyAnnouncementDto = {
    ...STICKY_ANNOUNCEMENT_DEFAULTS,
    message: '',
    contentRevision: 'rev-0',
    ...(partial ?? {}),
  };
  // Normalize empty-string fields to null where appropriate.
  return {
    ...base,
    ctaLabel: base.ctaLabel && base.ctaLabel.length > 0 ? base.ctaLabel : null,
    ctaUrl: base.ctaUrl && base.ctaUrl.length > 0 ? base.ctaUrl : null,
    message: base.message ?? '',
  };
}
