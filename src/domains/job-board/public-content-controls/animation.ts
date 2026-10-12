/**
 * public-content-controls/animation.ts — animation envelope.
 *
 * Maps the typed animation enum to a CSS class name on the component.
 * The component itself never references the animation as a string literal
 * other than through this resolver, which keeps the static analysis fence
 * (AC-12) honest.
 *
 * Reduced motion: the resolver returns the `NONE` class regardless of the
 * DTO's `animation` value, so users who opt out of motion never see
 * BLINK or MARQUEE. The CSS module also pins the override at the
 * `@media (prefers-reduced-motion: reduce)` rule.
 */

import type { StickyAnimation } from './types';

/** Animation class names exported by `sticky-announcement.module.css`. */
export const STICKY_ANIMATION_CLASS = {
  NONE: 'hrpStickyAnnouncementAnimNone',
  BLINK: 'hrpStickyAnnouncementAnimBlink',
  MARQUEE: 'hrpStickyAnnouncementAnimMarquee',
} as const;

export type StickyAnimationClass =
  (typeof STICKY_ANIMATION_CLASS)[keyof typeof STICKY_ANIMATION_CLASS];

/**
 * Return the CSS class for the given animation, honoring
 * `prefers-reduced-motion` by collapsing BLINK and MARQUEE to NONE.
 */
export function getAnimationClass(
  animation: StickyAnimation,
  prefersReducedMotion: boolean,
): StickyAnimationClass {
  if (prefersReducedMotion) {
    return STICKY_ANIMATION_CLASS.NONE;
  }
  switch (animation) {
    case 'BLINK':
      return STICKY_ANIMATION_CLASS.BLINK;
    case 'MARQUEE':
      return STICKY_ANIMATION_CLASS.MARQUEE;
    case 'NONE':
    default:
      return STICKY_ANIMATION_CLASS.NONE;
  }
}

/** Tailwind class fragment for the chosen emphasis. */
export function getEmphasisClass(
  emphasis: 'NORMAL' | 'BOLD' | 'EXTRA_BOLD',
): 'font-normal' | 'font-semibold' | 'font-extrabold' {
  switch (emphasis) {
    case 'EXTRA_BOLD':
      return 'font-extrabold';
    case 'NORMAL':
      return 'font-normal';
    case 'BOLD':
    default:
      return 'font-semibold';
  }
}

/** Tailwind class fragment for the chosen font. */
export function getFontClass(
  font: 'SANS' | 'SERIF',
): 'font-sans' | 'font-serif' {
  switch (font) {
    case 'SERIF':
      return 'font-serif';
    case 'SANS':
    default:
      return 'font-sans';
  }
}

/** CSS variable name for the chosen text color. */
export function getTextColorVar(
  textColor: 'on-primary' | 'on-surface' | 'on-secondary-container',
): string {
  switch (textColor) {
    case 'on-surface':
      return '--color-on-surface';
    case 'on-secondary-container':
      return '--color-on-secondary-container';
    case 'on-primary':
    default:
      return '--color-on-primary';
  }
}
