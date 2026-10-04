/**
 * public-content-controls/sticky-announcement.tsx — UI2 Sticky Announcement
 * component (Phase A).
 *
 * Fixed-bottom, safe-area-aware announcement bar. Pure CSS animations
 * (NONE / BLINK / MARQUEE) gated behind `prefers-reduced-motion`.
 * Dismissible state is versioned by `contentRevision` so a new revision
 * reappears for users who dismissed the prior one.
 *
 * Phase A ships the component but does NOT mount it. Phase B mounts it
 * from `app/(portal)/layout.tsx` (or the post-T1B-V1-merge public layout
 * surface), strictly excluding admin, recruiter, vendor, worker, CTV,
 * `/login`, and `/forbidden` layouts.
 *
 * Security: this component never accepts `dangerouslySetInnerHTML`, never
 * renders `<script>`, never renders `<marquee>`. The CTA URL is normalized
 * by `normalizeCtaUrl`. The message is rendered as a plain text node.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StickyAnnouncementDto } from './types';
import { safeStickyAnnouncement } from './types';
import { isCurrentlyDismissed } from './revision';
import {
  getAnimationClass,
  getEmphasisClass,
  getFontClass,
  getTextColorVar,
} from './animation';
import {
  isExternalUrl,
  normalizeCtaUrl,
  resolveCtaHref,
} from './url-safety';
import styles from './sticky-announcement.module.css';

const DISMISS_STORAGE_PREFIX = 'hrp.stickyAnnouncement.dismissed/';

export interface StickyAnnouncementProps {
  /** DTO. Optional for render safety; missing fields fall back to defaults. */
  dto?: Partial<StickyAnnouncementDto> | null;
  /**
   * Test-only escape hatch. When true, the component renders in a
   * "controlled" state and never reads or writes `localStorage`. Phase B
   * mounts do not pass this prop; the unit tests do.
   */
  __testDisablePersistence?: boolean;
}

export function StickyAnnouncement({
  dto,
  __testDisablePersistence = false,
}: StickyAnnouncementProps): React.ReactElement | null {
  const normalized = useMemo(() => safeStickyAnnouncement(dto), [dto]);
  const message = normalized.message.trim();
  const ctaHref = resolveCtaHref(normalized.ctaUrl);
  const ctaLabel = normalized.ctaLabel?.trim() ?? '';
  const ctaRequiresLabel = ctaHref !== null;
  const showCta = ctaHref !== null && ctaLabel.length > 0;
  const showMarqueeTrack = normalized.animation === 'MARQUEE' && message.length > 0;

  const [dismissedRevision, setDismissedRevision] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Read the dismissed revision on mount. SSR is always non-dismissed.
  useEffect(() => {
    if (__testDisablePersistence) {
      setMounted(true);
      return;
    }
    if (typeof window === 'undefined' || !normalized.dismissible) {
      setMounted(true);
      return;
    }
    try {
      const key = DISMISS_STORAGE_PREFIX + normalized.contentRevision;
      const stored = window.localStorage.getItem(key);
      setDismissedRevision(stored);
    } catch {
      // localStorage can throw in private mode / sandboxed contexts.
      setDismissedRevision(null);
    } finally {
      setMounted(true);
    }
  }, [normalized.contentRevision, normalized.dismissible, __testDisablePersistence]);

  const isDismissed = useMemo(() => {
    if (!normalized.dismissible) return false;
    return isCurrentlyDismissed(normalized, dismissedRevision);
  }, [normalized, dismissedRevision]);

  const handleDismiss = useCallback(() => {
    if (!normalized.dismissible) return;
    if (__testDisablePersistence) {
      setDismissedRevision(normalized.contentRevision);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const key = DISMISS_STORAGE_PREFIX + normalized.contentRevision;
      window.localStorage.setItem(key, normalized.contentRevision);
      setDismissedRevision(normalized.contentRevision);
    } catch {
      // Ignore storage failures; treat as a no-op.
    }
  }, [normalized.contentRevision, normalized.dismissible, __testDisablePersistence]);

  // Compute animation class on render. The reduced-motion preference is
  // read at render time (CSS handles the override too; both layers).
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mql.matches);
    update();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }
    return undefined;
  }, []);

  const animationClass = getAnimationClass(normalized.animation, prefersReducedMotion);
  const emphasisClass = getEmphasisClass(normalized.emphasis);
  const fontClass = getFontClass(normalized.font);
  const textColorVar = getTextColorVar(normalized.textColor);

  // Suppression predicates. Order matters: a missing message is a hard no;
  // a dismissed current revision is a soft no (the bar reappears when the
  // admin publishes a new revision).
  if (!normalized.enabled) return null;
  if (message.length === 0) return null;
  if (mounted && isDismissed) return null;
  if (ctaRequiresLabel && !showCta) {
    // ctaUrl is set but the label is empty: treat the CTA as mis-configured
    // and suppress the bar rather than render a label-less button.
    return null;
  }

  const externalCta = ctaHref !== null ? isExternalUrl(ctaHref) : false;
  const ctaTarget = externalCta ? '_blank' : '_self';
  const ctaRel = externalCta ? 'noopener noreferrer' : undefined;

  // Re-validate the URL at render time as a defense-in-depth layer. This is
  // a no-op when the projection above accepted the value, but a future
  // change to `resolveCtaHref` cannot regress into rendering an unsafe URL.
  let safeCtaHref: string | null = null;
  try {
    safeCtaHref = ctaHref !== null ? normalizeCtaUrl(ctaHref) : null;
  } catch {
    safeCtaHref = null;
  }

  const renderMessage = () => {
    if (showMarqueeTrack) {
      // Doubled track: render the message twice for a seamless loop. The
      // CSS animation translates by -50% to wrap without a visible jump.
      return (
        <>
          <span className={styles.hrpStickyAnnouncementMessage}>{message}</span>
          <span
            className={styles.hrpStickyAnnouncementMessage}
            aria-hidden="true"
            data-testid="sticky-announcement-marquee-tail"
          >
            {message}
          </span>
        </>
      );
    }
    return <span className={styles.hrpStickyAnnouncementMessage}>{message}</span>;
  };

  return (
    <div
      role="region"
      aria-label="Thông báo"
      aria-live="polite"
      data-testid="sticky-announcement"
      className={[
        styles.hrpStickyAnnouncement,
        animationClass,
        emphasisClass,
        fontClass,
      ].join(' ')}
      style={{ color: `var(${textColorVar})` }}
    >
      {renderMessage()}
      {showCta && safeCtaHref ? (
        <a
          className={styles.hrpStickyAnnouncementCta}
          href={safeCtaHref}
          target={ctaTarget}
          rel={ctaRel}
          data-testid="sticky-announcement-cta"
        >
          {ctaLabel}
        </a>
      ) : null}
      {normalized.dismissible ? (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Đóng thông báo"
          data-testid="sticky-announcement-dismiss"
          className={styles.hrpStickyAnnouncementDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export default StickyAnnouncement;
