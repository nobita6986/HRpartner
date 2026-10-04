/**
 * public-content-controls/use-public-content-controls.ts — Phase B / UI2 client
 * gate hook.
 *
 * Reads `/api/public/homepage-settings` and exposes the admin-managed
 * `newsSectionEnabled` toggle and the `stickyAnnouncement` DTO to client
 * components (navbar, news section wrapper, public layout).
 *
 * The hook:
 *   - is a Client Component hook (`'use client'`);
 *   - is a thin SWR-less fetch wrapper (the public projection route is
 *     cached at 60s on the server, so client-side polling is unnecessary);
 *   - returns a `PUBLIC_CONTENT_CONTROLS_DEFAULTS` projection when the
 *     network is unavailable, the row is missing, or the schema is invalid;
 *   - never throws.
 *
 * The default is `newsSectionEnabled: true` so the public-render state is
 * preserved when the network/DB is down.
 */

'use client';

import { useEffect, useState } from 'react';
import type { StickyAnnouncementDto } from './types';
import { safeStickyAnnouncement } from './types';

export interface PublicContentControlsState {
  /** `true` once the first fetch has completed (success or failure). */
  loaded: boolean;
  /**
   * Admin-managed news section toggle. `true` until proven otherwise — the
   * default preserves the public-render state when the gate is unavailable.
   */
  newsSectionEnabled: boolean;
  /**
   * The sticky announcement DTO projected from the server. Defaults to
   * `enabled: false` so the bar does not render when no announcement is
   * configured.
   */
  stickyAnnouncement: StickyAnnouncementDto;
}

export const PUBLIC_CONTENT_CONTROLS_DEFAULTS: PublicContentControlsState = {
  loaded: false,
  newsSectionEnabled: true,
  stickyAnnouncement: safeStickyAnnouncement(null),
};

interface RawResponse {
  newsSectionEnabled?: unknown;
  stickyAnnouncement?: unknown;
}

function projectResponse(payload: RawResponse | null): PublicContentControlsState {
  if (payload === null) return { ...PUBLIC_CONTENT_CONTROLS_DEFAULTS, loaded: true };
  return {
    loaded: true,
    newsSectionEnabled: typeof payload.newsSectionEnabled === 'boolean'
      ? payload.newsSectionEnabled
      : true,
    stickyAnnouncement: safeStickyAnnouncement(
      (payload.stickyAnnouncement ?? null) as Parameters<typeof safeStickyAnnouncement>[0],
    ),
  };
}

/**
 * `usePublicContentControls` — client hook that reads the admin-managed
 * public content controls.
 *
 * The hook always returns `newsSectionEnabled: true` until the first
 * successful fetch completes; this is the "fail open" default that
 * preserves the public-render state when the API is unavailable.
 */
export function usePublicContentControls(): PublicContentControlsState {
  const [state, setState] = useState<PublicContentControlsState>(PUBLIC_CONTENT_CONTROLS_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/homepage-settings', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<RawResponse>;
      })
      .then((payload) => {
        if (cancelled) return;
        setState(projectResponse(payload));
      })
      .catch(() => {
        if (cancelled) return;
        setState({ ...PUBLIC_CONTENT_CONTROLS_DEFAULTS, loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
