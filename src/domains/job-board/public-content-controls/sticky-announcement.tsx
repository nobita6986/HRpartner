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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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

type StickyAnnouncementStyle = CSSProperties & {
  '--sticky-background-opacity': string;
  '--sticky-marquee-duration': string;
  /**
   * Two px CSS custom properties published by the marquee effect in
   * `sticky-announcement.tsx`:
   *   marqueeShiftStartPx = viewport.width  (px)
   *   marqueeShiftEndPx   = message.width   (px)
   * The keyframe consumes them so the message starts fully outside the
   * right edge and exits fully off the left edge. The props are optional
   * because they are only published at runtime by a ResizeObserver, not
   * on the SSR pass.
   */
  '--marquee-shift-start'?: string;
  '--marquee-shift-end'?: string;
};

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

  const [dismissedRevision, setDismissedRevision] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const marqueeViewportRef = useRef<HTMLDivElement | null>(null);
  const marqueeMessageRef = useRef<HTMLSpanElement | null>(null);

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

  // CSS also enforces this preference before the browser state is available.
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

  // `showMarqueeTrack` is hoisted BEFORE the marquee-shift effect so the
  // effect can depend on it without hitting a TDZ on the very first
  // render (which is what the server-render tests exercise).
  const showMarqueeTrack =
    normalized.animation === 'MARQUEE' && message.length > 0 && !prefersReducedMotion;

  // T1C CORRECTION 1/1 (v1.2): the marquee message must start fully outside
  // the right edge of the viewport and exit fully off the left edge. The
  // keyframe consumes two px CSS custom properties (declared inline by the
  // CSS module) at 0% and 100%; the px values are computed at mount / on
  // resize as the translations needed to put the message's left edge at the
  // right edge of the viewport (start) and the message's right edge at 0
  // (end). The pre-transform measurement uses `messageEl.offsetLeft` + the
  // parent's bounding rect (offsetLeft is unaffected by transforms), so
  // the measurement is NOT contaminated by the animation that has already
  // applied a translation. The animation is applied INLINE on the message
  // element (via `style.animation`) instead of via a CSS class — this
  // sidesteps CSS Modules class-name hashing so the browser-check can
  // match the unhashed class name. A ResizeObserver re-runs the
  // measurement on viewport / message resize; on resize, the inline
  // animation is cleared and re-applied to reset the keyframe from the new
  // t=0 position.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!showMarqueeTrack) return undefined;
    const viewportEl = marqueeViewportRef.current;
    const messageEl = marqueeMessageRef.current;
    if (!viewportEl || !messageEl) return undefined;
    const durationSec = normalized.marqueeDurationSeconds;
    const armAnimation = () => {
      // Pre-transform measurements: `offsetLeft` is the message's position
      // within its offsetParent, unaffected by any transform on the message
      // itself. Combine with the viewport's bounding rect (also unaffected
      // because the viewport does not have a transform) to get the natural
      // screen-space left position of the message.
      const parentRect = viewportEl.getBoundingClientRect();
      const naturalLeft = parentRect.left + messageEl.offsetLeft;
      const messageWidth = messageEl.offsetWidth;
      const viewportWidth =
        typeof window.innerWidth === 'number' && window.innerWidth > 0
          ? window.innerWidth
          : viewportEl.clientWidth;
      const startShift = viewportWidth - naturalLeft;
      const endShift = naturalLeft + messageWidth;
      viewportEl.style.setProperty('--marquee-shift-start', `${startShift}px`);
      viewportEl.style.setProperty('--marquee-shift-end', `${endShift}px`);
      // Apply the animation inline so we don't depend on CSS Modules
      // class-name hashing. The keyframe name is hashed in the compiled
      // stylesheet, but the message element references it via
      // `getComputedStyle(...).animationName` which the browser-check
      // matches against the (partial) substring.
      const computed = window.getComputedStyle(messageEl);
      const keyframeName = computed.animationName;
      // animationName reads from any previously-applied class; if the keyframe
      // hasn't been resolved yet (no class applied) it returns 'none'. We
      // can't reliably read the hashed keyframe name without a class, so we
      // publish a SECOND CSS variable on the message element with the
      // resolved keyframe name from the stylesheet. The effect that sets
      // the inline animation uses that.
      const resolvedKeyframe =
        viewportEl.style.getPropertyValue('--marquee-keyframe-name') ||
        `hrpStickyAnnouncementMarquee`;
      messageEl.style.animation = `${resolvedKeyframe} ${durationSec}s linear infinite`;
    };
    // Read the resolved keyframe name from the stylesheet so the inline
    // animation references the hashed name. We do this lazily (after the
    // first paint) by scanning all CSSKeyframesRules on the document for
    // the one whose name contains "hrpStickyAnnouncementMarquee".
    const resolveKeyframeName = () => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try {
          rules = sheet.cssRules ?? [];
        } catch {
          rules = [];
        }
        for (const rule of Array.from(rules)) {
          if (
            rule instanceof CSSKeyframesRule &&
            /hrpStickyAnnouncementMarquee/.test(rule.name)
          ) {
            viewportEl.style.setProperty('--marquee-keyframe-name', rule.name);
            return rule.name;
          }
        }
      }
      return 'hrpStickyAnnouncementMarquee';
    };
    resolveKeyframeName();
    // The CSS animation only fires when the message has no transform
    // applied; otherwise the resize loop would feed back into itself.
    // `requestAnimationFrame` runs the recompute before the first
    // animation frame reads the variables.
    const raf = window.requestAnimationFrame(armAnimation);
    let roMessage: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function') {
      roMessage = new ResizeObserver(() => {
        messageEl.style.animation = 'none';
        window.requestAnimationFrame(() => {
          armAnimation();
        });
      });
      roMessage.observe(messageEl);
    }
    const onResize = () => {
      messageEl.style.animation = 'none';
      window.requestAnimationFrame(() => {
        armAnimation();
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (roMessage) roMessage.disconnect();
      viewportEl.style.removeProperty('--marquee-shift-start');
      viewportEl.style.removeProperty('--marquee-shift-end');
      viewportEl.style.removeProperty('--marquee-keyframe-name');
      messageEl.style.removeProperty('animation');
    };
  }, [showMarqueeTrack, message, normalized.marqueeDurationSeconds]);

  const animationClass = styles[getAnimationClass(normalized.animation, prefersReducedMotion)];
  const emphasisClass = getEmphasisClass(normalized.emphasis);
  const fontClass = getFontClass(normalized.font);
  const textColorVar = getTextColorVar(normalized.textColor);
  const announcementStyle: StickyAnnouncementStyle = {
    color: `var(${textColorVar})`,
    '--sticky-background-opacity': `${normalized.backgroundOpacity}%`,
    '--sticky-marquee-duration': `${normalized.marqueeDurationSeconds}s`,
  };

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
      /*
       * Single-text marquee (T1C CORRECTION 1/1, v1.2 — viewport-aware):
       *   - One copy of the message is rendered, NOT two.
       *   - The viewport clips overflow; the message itself is never
       *     truncated and can be longer than the viewport.
       *   - The JS effect above publishes two px CSS custom properties on
       *     the viewport: shiftStartPx = viewport.width  (so the message's
       *     left edge lands at the right edge of the viewport) and
       *     shiftEndPx = message.width  (so the message's right edge lands
       *     at 0). The CSS keyframe translates the message by shiftStartPx
       *     at 0% and by -shiftEndPx at 100%. Each cycle therefore starts
       *     completely off-screen on the right, runs through the entire
       *     viewport, and disappears completely on the left before the next
       *     cycle begins. The px distance is measured against the ACTUAL
       *     viewport, so the same code path is correct for messages
       *     shorter than the viewport (desktop 1440px, mobile 390px) and
       *     for messages longer than the viewport. No duplicate group, no
       *     overlap, no jump on the loop seam.
       */
      return (
        <div
          ref={marqueeViewportRef}
          className={[
            styles.hrpStickyAnnouncementViewport,
            styles.hrpStickyAnnouncementMarquee,
          ].join(' ')}
          data-testid="sticky-announcement-marquee"
        >
          <span
            ref={marqueeMessageRef}
            className={[
              styles.hrpStickyAnnouncementMessage,
              styles.hrpStickyAnnouncementMessageMarquee,
            ].join(' ')}
          >
            {message}
          </span>
        </div>
      );
    }
    return (
      <span
        className={[styles.hrpStickyAnnouncementViewport, styles.hrpStickyAnnouncementMessage].join(' ')}
      >
        {message}
      </span>
    );
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
      style={announcementStyle}
    >
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
    </div>
  );
}

export default StickyAnnouncement;
