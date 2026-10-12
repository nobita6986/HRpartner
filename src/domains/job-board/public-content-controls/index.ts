/**
 * public-content-controls/index.ts — public surface of the
 * `public-content-controls` module.
 *
 * Phase B imports from `@/src/domains/job-board/public-content-controls`
 * to mount the StickyAnnouncement and to project the NewsSection gate.
 * Keeping a single re-export file means Phase B does not need to know
 * which file each symbol lives in, and internal file moves are safe.
 */

export { StickyAnnouncement, default } from './sticky-announcement';
export type { StickyAnnouncementProps } from './sticky-announcement';

export { resolveNewsSectionGate } from './news-section-gate';

export {
  normalizeCtaUrl,
  resolveCtaHref,
  isExternalUrl,
  InvalidCtaUrlError,
} from './url-safety';

export {
  compareContentRevisions,
  isCurrentlyDismissed,
  buildRevisionInput,
  CONTENT_REVISION_LENGTH,
} from './revision';
// `computeContentRevision` lives in `revision.server.ts` (server-only).
// It is NOT re-exported from this barrel on purpose: any client that
// pulls the barrel would inadvertently drag `node:crypto` into its
// bundle. Server callers must import it directly from
// `@/src/domains/job-board/public-content-controls/revision.server`.

export {
  getAnimationClass,
  getEmphasisClass,
  getFontClass,
  getTextColorVar,
  STICKY_ANIMATION_CLASS,
} from './animation';
export type { StickyAnimationClass } from './animation';

export {
  safeStickyAnnouncement,
  STICKY_ANNOUNCEMENT_DEFAULTS,
  StickyAnnouncementSchema,
  NewsSectionToggleSchema,
  STICKY_ANIMATIONS,
  STICKY_TEXT_COLORS,
  STICKY_FONTS,
  STICKY_EMPHASIS,
} from './types';
export type {
  StickyAnnouncementDto,
  StickyAnimation,
  StickyTextColor,
  StickyFont,
  StickyEmphasis,
  NewsSectionToggle,
  NewsSectionGate,
} from './types';

// Phase B / UI2 — re-exports for the canonical final-delivery surface.
export { NewsSectionWrapper } from './news-section-wrapper';
export { PublicStickyAnnouncement } from './public-sticky-announcement';
export { usePublicContentControls, PUBLIC_CONTENT_CONTROLS_DEFAULTS } from './use-public-content-controls';
export type { PublicContentControlsState } from './use-public-content-controls';
export { toStickyAnnouncementDto } from './dto-projection';
