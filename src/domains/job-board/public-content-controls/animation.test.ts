/**
 * public-content-controls/animation.test.ts — animation class resolver.
 */

import { describe, expect, it } from 'vitest';
import {
  STICKY_ANIMATION_CLASS,
  getAnimationClass,
  getEmphasisClass,
  getFontClass,
  getTextColorVar,
} from './animation';

describe('getAnimationClass', () => {
  it('returns NONE class for NONE regardless of reduced motion', () => {
    expect(getAnimationClass('NONE', false)).toBe(STICKY_ANIMATION_CLASS.NONE);
    expect(getAnimationClass('NONE', true)).toBe(STICKY_ANIMATION_CLASS.NONE);
  });

  it('returns BLINK class for BLINK when motion is allowed', () => {
    expect(getAnimationClass('BLINK', false)).toBe(STICKY_ANIMATION_CLASS.BLINK);
  });

  it('returns MARQUEE class for MARQUEE when motion is allowed', () => {
    expect(getAnimationClass('MARQUEE', false)).toBe(STICKY_ANIMATION_CLASS.MARQUEE);
  });

  it('collapses BLINK and MARQUEE to NONE when prefers-reduced-motion is set', () => {
    expect(getAnimationClass('BLINK', true)).toBe(STICKY_ANIMATION_CLASS.NONE);
    expect(getAnimationClass('MARQUEE', true)).toBe(STICKY_ANIMATION_CLASS.NONE);
  });
});

describe('getEmphasisClass', () => {
  it('maps emphasis to a Tailwind font-weight class', () => {
    expect(getEmphasisClass('NORMAL')).toBe('font-normal');
    expect(getEmphasisClass('BOLD')).toBe('font-semibold');
    expect(getEmphasisClass('EXTRA_BOLD')).toBe('font-extrabold');
  });
});

describe('getFontClass', () => {
  it('maps font to a Tailwind font-family class', () => {
    expect(getFontClass('SANS')).toBe('font-sans');
    expect(getFontClass('SERIF')).toBe('font-serif');
  });
});

describe('getTextColorVar', () => {
  it('maps text color to a CSS variable name', () => {
    expect(getTextColorVar('on-primary')).toBe('--color-on-primary');
    expect(getTextColorVar('on-surface')).toBe('--color-on-surface');
    expect(getTextColorVar('on-secondary-container')).toBe(
      '--color-on-secondary-container',
    );
  });
});
