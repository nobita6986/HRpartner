/**
 * public-content-controls/__tests__/dto-projection.test.ts — Phase B / UI2
 * DTO projection helper tests.
 */

import { describe, expect, it } from 'vitest';
import { toStickyAnnouncementDto } from '../dto-projection';

describe('toStickyAnnouncementDto (Phase B / UI2)', () => {
  it('returns safe defaults for null', () => {
    const dto = toStickyAnnouncementDto(null);
    expect(dto.enabled).toBe(false);
    expect(dto.message).toBe('');
    expect(dto.ctaLabel).toBeNull();
    expect(dto.ctaUrl).toBeNull();
    expect(dto.dismissible).toBe(true);
    expect(dto.backgroundOpacity).toBe(100);
    expect(dto.contentRevision).toBe('rev-0');
  });

  it('returns safe defaults for undefined', () => {
    const dto = toStickyAnnouncementDto(undefined);
    expect(dto.enabled).toBe(false);
  });

  it('returns safe defaults for non-object values', () => {
    expect(toStickyAnnouncementDto('hello').enabled).toBe(false);
    expect(toStickyAnnouncementDto(42).enabled).toBe(false);
    expect(toStickyAnnouncementDto([1, 2, 3]).enabled).toBe(false);
  });

  it('parses a valid Phase A DTO and returns it', () => {
    const dto = toStickyAnnouncementDto({
      enabled: true,
      message: 'Hello world',
      ctaLabel: 'Open',
      ctaUrl: '/contact',
      dismissible: true,
      backgroundOpacity: 64,
      textColor: 'on-primary',
      font: 'SANS',
      emphasis: 'BOLD',
      animation: 'NONE',
      contentRevision: 'rev-1234',
    });
    expect(dto.enabled).toBe(true);
    expect(dto.message).toBe('Hello world');
    expect(dto.ctaLabel).toBe('Open');
    expect(dto.ctaUrl).toBe('/contact');
    expect(dto.backgroundOpacity).toBe(64);
    expect(dto.contentRevision).toBe('rev-1234');
  });

  it('returns safe defaults for an object that fails schema validation', () => {
    // contentRevision regex violation: contains a space.
    const dto = toStickyAnnouncementDto({
      enabled: true,
      message: 'X',
      ctaLabel: null,
      ctaUrl: null,
      dismissible: true,
      textColor: 'on-primary',
      font: 'SANS',
      emphasis: 'BOLD',
      animation: 'NONE',
      contentRevision: 'rev with space',
    });
    expect(dto.enabled).toBe(false);
  });

  it('returns safe defaults when message exceeds 280 chars', () => {
    const dto = toStickyAnnouncementDto({
      enabled: true,
      message: 'X'.repeat(300),
      ctaLabel: null,
      ctaUrl: null,
      dismissible: true,
      textColor: 'on-primary',
      font: 'SANS',
      emphasis: 'BOLD',
      animation: 'NONE',
      contentRevision: 'rev-1',
    });
    expect(dto.enabled).toBe(false);
  });

  it.each([-1, 101, 50.5])('rejects invalid background opacity %s', (backgroundOpacity) => {
    expect(
      toStickyAnnouncementDto({
        enabled: true,
        message: 'Hello',
        ctaLabel: null,
        ctaUrl: null,
        dismissible: true,
        backgroundOpacity,
        textColor: 'on-primary',
        font: 'SANS',
        emphasis: 'BOLD',
        animation: 'NONE',
        contentRevision: 'rev-1',
      }).enabled,
    ).toBe(false);
  });
});
