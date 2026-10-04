/**
 * public-content-controls/revision.test.ts — content revision hashing.
 *
 * The hash is the first 16 hex chars of SHA-256 over a canonical string of
 * observable DTO fields. Two DTOs that are byte-identical must produce
 * the same hash; differing DTOs must produce different hashes.
 */

import { describe, expect, it } from 'vitest';
import {
  CONTENT_REVISION_LENGTH,
  buildRevisionInput,
  compareContentRevisions,
  computeContentRevision,
  isCurrentlyDismissed,
} from './revision';
import {
  safeStickyAnnouncement,
  type StickyAnnouncementDto,
} from './types';

function baseDto(overrides: Partial<StickyAnnouncementDto> = {}): StickyAnnouncementDto {
  return safeStickyAnnouncement({
    enabled: true,
    message: 'Hỗ trợ tư vấn 24/7 — gọi HRP ngay hôm nay!',
    ctaLabel: 'Gọi HRP',
    ctaUrl: 'tel:+849064984866',
    dismissible: true,
    textColor: 'on-primary',
    font: 'SANS',
    emphasis: 'BOLD',
    animation: 'NONE',
    contentRevision: 'rev-2026-10-04T09:00:00.000Z',
    ...overrides,
  });
}

describe('buildRevisionInput', () => {
  it('orders fields deterministically', () => {
    const dto = baseDto();
    const input = buildRevisionInput(dto);
    const fields = input.split('\u001f');
    expect(fields[0]).toBe(dto.message);
    expect(fields[1]).toBe(dto.ctaLabel);
    expect(fields[2]).toBe(dto.ctaUrl);
    expect(fields[3]).toBe('1'); // dismissible boolean
  });

  it('encodes null ctaLabel / ctaUrl as <null>', () => {
    const dto = baseDto({ ctaLabel: null, ctaUrl: null });
    const input = buildRevisionInput(dto);
    expect(input).toContain('<null>\u001f<null>');
  });
});

describe('computeContentRevision', () => {
  it('returns a 16-char lowercase hex string', () => {
    const rev = computeContentRevision(baseDto());
    expect(rev).toMatch(/^[0-9a-f]{16}$/);
    expect(rev.length).toBe(CONTENT_REVISION_LENGTH);
  });

  it('is deterministic for identical DTOs', () => {
    const a = computeContentRevision(baseDto());
    const b = computeContentRevision(baseDto());
    expect(a).toBe(b);
  });

  it('changes when the message changes', () => {
    const a = computeContentRevision(baseDto({ message: 'message A' }));
    const b = computeContentRevision(baseDto({ message: 'message B' }));
    expect(a).not.toBe(b);
  });

  it('changes when the CTA URL changes', () => {
    const a = computeContentRevision(baseDto({ ctaUrl: 'https://hrpartner.vn/a' }));
    const b = computeContentRevision(baseDto({ ctaUrl: 'https://hrpartner.vn/b' }));
    expect(a).not.toBe(b);
  });

  it('changes when the animation enum changes', () => {
    const a = computeContentRevision(baseDto({ animation: 'NONE' }));
    const b = computeContentRevision(baseDto({ animation: 'BLINK' }));
    const c = computeContentRevision(baseDto({ animation: 'MARQUEE' }));
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  it('does NOT change when the contentRevision field itself changes', () => {
    // The hash is over the OBSERVABLE fields, not the contentRevision field,
    // because the revision is the hash result, not its input. The admin
    // form can pre-compute a hash and write it as contentRevision; changing
    // contentRevision alone must not change the hash of an unchanged DTO.
    const a = computeContentRevision(baseDto({ contentRevision: 'rev-1' }));
    const b = computeContentRevision(baseDto({ contentRevision: 'rev-2' }));
    expect(a).toBe(b);
  });
});

describe('compareContentRevisions', () => {
  it('returns true for equal revisions', () => {
    expect(compareContentRevisions('abc123', 'abc123')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(compareContentRevisions('ABC123', 'abc123')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(compareContentRevisions(' abc123 ', 'abc123')).toBe(true);
  });

  it('returns false for non-equal revisions', () => {
    expect(compareContentRevisions('abc123', 'def456')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(compareContentRevisions(null as unknown as string, 'abc')).toBe(false);
    expect(compareContentRevisions('abc', undefined as unknown as string)).toBe(false);
  });
});

describe('isCurrentlyDismissed', () => {
  it('returns true when dismissedRevision matches dto.contentRevision', () => {
    const dto = baseDto({ contentRevision: 'rev-1' });
    expect(isCurrentlyDismissed(dto, 'rev-1')).toBe(true);
  });

  it('returns false when dismissedRevision differs (new revision reappears)', () => {
    const dto = baseDto({ contentRevision: 'rev-2' });
    expect(isCurrentlyDismissed(dto, 'rev-1')).toBe(false);
  });

  it('returns false when dismissedRevision is null / empty', () => {
    const dto = baseDto();
    expect(isCurrentlyDismissed(dto, null)).toBe(false);
    expect(isCurrentlyDismissed(dto, '')).toBe(false);
  });
});
