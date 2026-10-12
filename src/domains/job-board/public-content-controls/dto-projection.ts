/**
 * public-content-controls/dto-projection.ts — Phase B / UI2 DTO projection
 * helpers.
 *
 * Thin layer that re-exports the Phase A `safeStickyAnnouncement` and adds
 * a Zod-driven projection for the `sticky_announcement` JSONB column.
 *
 * Lives in the Phase A module (in-scope `src/domains/job-board/public-content-controls/**`)
 * so the Admin API and the Admin form share the same projection shape.
 *
 * No third-party dependency added: Zod is already in the repo at 3.24.x.
 */

import {
  StickyAnnouncementSchema,
  safeStickyAnnouncement,
  type StickyAnnouncementDto,
} from './types';

export { safeStickyAnnouncement, StickyAnnouncementSchema };
export type { StickyAnnouncementDto };

/**
 * Project an arbitrary value (typically the result of `JSON.parse` on the
 * `sticky_announcement` JSONB column) into the Phase A `StickyAnnouncementDto`.
 *
 *   - `null` / `undefined`            → safe defaults with `enabled: false`.
 *   - `{}` / non-array object         → parsed through `StickyAnnouncementSchema`;
 *                                        on failure, safe defaults are returned
 *                                        (defense-in-depth at the projection boundary).
 *   - non-object values               → safe defaults.
 *
 * The function is pure and never throws. The schema is the single source of
 * truth for the field shape.
 */
export function toStickyAnnouncementDto(value: unknown): StickyAnnouncementDto {
  if (value === null || value === undefined) {
    return safeStickyAnnouncement(null);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return safeStickyAnnouncement(null);
  }
  const parsed = StickyAnnouncementSchema.safeParse(value);
  if (!parsed.success) {
    return safeStickyAnnouncement(null);
  }
  return safeStickyAnnouncement(parsed.data);
}
