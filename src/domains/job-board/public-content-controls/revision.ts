/**
 * public-content-controls/revision.ts — pure content-revision helpers.
 *
 * The sticky announcement's dismiss state is keyed by `contentRevision`.
 * A new revision reappears for users who dismissed the prior one. The
 * helpers in this file are deliberately free of `node:` imports so they
 * can be safely bundled into Client Components.
 *
 * The actual SHA-256 hashing used to *derive* a revision lives in
 * `revision.server.ts` (server-only). On the client, callers either
 * compare two existing revisions (no hashing) or accept a revision that
 * the admin form has already incremented via `nextContentRevision`.
 */

import type { StickyAnnouncementDto } from './types';

/** Maximum length of the `contentRevision` string. */
export const CONTENT_REVISION_LENGTH = 16;

const REVISION_FIELDS: ReadonlyArray<keyof StickyAnnouncementDto> = [
  'message',
  'ctaLabel',
  'ctaUrl',
  'dismissible',
  'backgroundOpacity',
  'marqueeDurationSeconds',
  'textColor',
  'font',
  'emphasis',
  'animation',
];

/**
 * Build the canonical input string for the revision hash. Two DTOs whose
 * canonical input is byte-identical are the same revision.
 */
export function buildRevisionInput(dto: StickyAnnouncementDto): string {
  return REVISION_FIELDS.map((field) => {
    const value = dto[field];
    if (value === null || value === undefined) return '<null>';
    if (typeof value === 'boolean') return value ? '1' : '0';
    return String(value);
  }).join('\u001f');
}

/** Compare two revisions for equality. Trims and lowercases. */
export function compareContentRevisions(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** True when `dismissedRevision` matches the current `dto.contentRevision`. */
export function isCurrentlyDismissed(
  dto: StickyAnnouncementDto,
  dismissedRevision: string | null | undefined,
): boolean {
  if (!dismissedRevision) return false;
  return compareContentRevisions(dto.contentRevision, dismissedRevision);
}

/** FNV-1a 32-bit hash, lowercase hex, zero-padded to 8 chars. Doubled to 16
 *  chars by concatenation (the suffix is the same hash over the prefix).
 *  Pure JS — usable in any runtime, including the browser. */
export function fnv1a32Hex(input: string): string {
  const first = fnv1a32(input);
  const second = fnv1a32(first);
  return (first + second).toLowerCase();
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Equivalent to multiplying by FNV prime 0x01000193 with 32-bit wrap.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}