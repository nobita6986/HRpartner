/**
 * public-content-controls/public-sticky-announcement.tsx — Phase B / UI2
 * client wrapper for the public-portal layout.
 *
 * Fetches the admin-managed sticky announcement DTO from
 * `/api/public/homepage-settings` and forwards it to the Phase A
 * `<StickyAnnouncement>`. Falls back to "no announcement" on network
 * failure so the public-render surface remains clean.
 *
 * Lives in the Phase A module (in-scope
 * `src/domains/job-board/public-content-controls/**`).
 */

'use client';

import { StickyAnnouncement } from './sticky-announcement';
import { usePublicContentControls } from './use-public-content-controls';

export function PublicStickyAnnouncement() {
  const { stickyAnnouncement } = usePublicContentControls();
  return <StickyAnnouncement dto={stickyAnnouncement} />;
}

export default PublicStickyAnnouncement;
