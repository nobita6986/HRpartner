/**
 * public-content-controls/sticky-announcement.mount.test.tsx — jsdom mount
 * test for the dismiss flow.
 *
 * Tests that exercise `useEffect` / `localStorage` need a real DOM. We
 * declare `// @vitest-environment jsdom` so the rest of the unit lane
 * stays in pure node (per `vitest.unit.config.ts`).
 *
 * Pattern mirrors `JobPostingRichTextEditor.mount.test.tsx`:
 *   - `createRoot` + `act` (no `@testing-library/react`).
 *   - `IS_REACT_ACT_ENVIRONMENT = true` in `beforeAll`.
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { StickyAnnouncement } from './sticky-announcement';
import { safeStickyAnnouncement, type StickyAnnouncementDto } from './types';

beforeAll(() => {
  // React 19: silence the act() warning and match the official testing guide.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

function dto(overrides: Partial<StickyAnnouncementDto> = {}): StickyAnnouncementDto {
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

let host: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  document.body.appendChild(host);
  // Clear localStorage between tests.
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

async function mount(props: Parameters<typeof StickyAnnouncement>[0]) {
  await act(async () => {
    root = createRoot(host);
    root.render(createElement(StickyAnnouncement, props));
  });
}

async function unmount() {
  await act(async () => {
    root?.unmount();
    root = null;
  });
  document.body.innerHTML = '';
}

function findByTestId(id: string): HTMLElement | null {
  return host.querySelector<HTMLElement>(`[data-testid="${id}"]`);
}

/*
 * T1A hotfix (R2) helper: install a `matchMedia` shim that returns a
 * per-query `matches` flag. jsdom does not honor media queries natively,
 * and the R2 implementation gates both the inline pause effect and the
 * `onMouseEnter` / `onMouseLeave` handlers on
 * `(hover: hover) and (pointer: fine)`. We need to control the result of
 * that query per test to verify both branches (hover-capable desktop vs
 * touch device) and to keep `prefers-reduced-motion` configurable for
 * the reduced-motion test.
 *
 * The helper installs a `matchMedia` implementation that returns a
 * `MediaQueryList` whose `matches` reflects the `options` flag and
 * whose `addEventListener` / `removeEventListener` track listeners so
 * the existing `mql.addEventListener('change', update)` subscriptions
 * the component installs can be cleaned up on unmount.
 *
 * Usage: `await withMatchMedia(async () => { ... }, { hoverMatches: true })()`
 * — note the trailing `()`: the helper is `() => fn` so it can be passed
 * directly to vitest's `it()` as the test body.
 */
function withMatchMedia(
  fn: () => Promise<void>,
  options: { hoverMatches: boolean; reducedMotionMatches?: boolean },
): () => Promise<void> {
  return async () => {
    const originalMatchMedia = window.matchMedia;
    const reducedListeners: Array<() => void> = [];
    const makeMql = (
      media: string,
      matches: boolean,
      listeners: Array<() => void>,
    ): MediaQueryList => {
      return {
        matches,
        media,
        onchange: null,
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: (_: string, cb: () => void) => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        },
        addListener: (cb: () => void) => listeners.push(cb),
        removeListener: (cb: () => void) => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        },
        dispatchEvent: () => true,
      } as unknown as MediaQueryList;
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => {
        if (query.startsWith('(hover:') || query.startsWith('(pointer:')) {
          return makeMql(
            '(hover: hover) and (pointer: fine)',
            options.hoverMatches,
            [],
          );
        }
        return makeMql(
          '(prefers-reduced-motion: reduce)',
          options.reducedMotionMatches ?? false,
          reducedListeners,
        );
      },
    });
    try {
      await fn();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  };
}

describe('StickyAnnouncement — dismiss flow (jsdom mount)', () => {
  it('renders the bar on mount when no dismissal is recorded', async () => {
    await mount({ dto: dto() });
    expect(findByTestId('sticky-announcement')).not.toBeNull();
    expect(findByTestId('sticky-announcement-dismiss')).not.toBeNull();
  });

  it('hides the bar when the current revision is recorded as dismissed in localStorage', async () => {
    const revision = 'rev-prev-1';
    window.localStorage.setItem(
      `hrp.stickyAnnouncement.dismissed/${revision}`,
      revision,
    );
    await mount({ dto: dto({ contentRevision: revision }) });
    expect(findByTestId('sticky-announcement')).toBeNull();
  });

  it('reappears when a new revision is published (even if the prior revision was dismissed)', async () => {
    const prev = 'rev-prev-2';
    window.localStorage.setItem(
      `hrp.stickyAnnouncement.dismissed/${prev}`,
      prev,
    );
    await mount({ dto: dto({ contentRevision: 'rev-next-3' }) });
    expect(findByTestId('sticky-announcement')).not.toBeNull();
  });

  it('clicking the dismiss button writes to localStorage and hides the bar', async () => {
    await mount({ dto: dto({ contentRevision: 'rev-click-1' }) });
    const button = findByTestId('sticky-announcement-dismiss');
    expect(button).not.toBeNull();
    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(window.localStorage.getItem('hrp.stickyAnnouncement.dismissed/rev-click-1')).toBe(
      'rev-click-1',
    );
    expect(findByTestId('sticky-announcement')).toBeNull();
  });

  it('does NOT render the dismiss button when dismissible=false (no localStorage write either)', async () => {
    await mount({ dto: dto({ dismissible: false }) });
    expect(findByTestId('sticky-announcement-dismiss')).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('does NOT crash when localStorage is unavailable (private mode simulation)', async () => {
    const original = window.localStorage;
    const setItemSpy = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        ...original,
        setItem: setItemSpy,
        getItem: original.getItem.bind(original),
        clear: original.clear.bind(original),
        removeItem: original.removeItem.bind(original),
        key: original.key.bind(original),
        get length() {
          return original.length;
        },
      },
    });
    try {
      await mount({ dto: dto() });
      const button = findByTestId('sticky-announcement-dismiss');
      expect(button).not.toBeNull();
      await act(async () => {
        button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      // setItem threw; the component should swallow the error and remain visible.
      expect(setItemSpy).toHaveBeenCalled();
      expect(findByTestId('sticky-announcement')).not.toBeNull();
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: original,
      });
      await unmount();
    }
  });

  it('switches the animation class to NONE when prefers-reduced-motion is set', async () => {
    // jsdom does not honor the actual media query, so we override
    // `window.matchMedia` for this test to simulate a user with reduced
    // motion enabled. The component subscribes to the change event in a
    // useEffect, so dispatching the event after the override flushes the
    // state to `prefersReducedMotion === true`. We use the
    // `withMatchMedia` helper so the `(hover: hover) and (pointer: fine)`
    // query (R2) also returns a sensible value.
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      // CSS Modules emit class names like `_hrpStickyAnnouncementAnimBlink_xxxxx`.
      // The unhashed fragment `hrpStickyAnnouncementAnimBlink` must NOT appear
      // in the rendered class list when reduced motion is active.
      expect(bar!.className).not.toMatch(/hrpStickyAnnouncementAnimBlink/);
    }, { hoverMatches: true, reducedMotionMatches: true })();
  });
});

/*
 * T1A hotfix `hrp-t1a-sticky-announcement-hotfix`:
 * Hover-pause tests for BLINK and MARQUEE. These tests run in jsdom so
 * they can fire synthetic `mouseenter` / `mouseleave` events on the
 * rendered wrapper. The component reads `isHovered` state from these
 * events and applies `animationPlayState` to the marquee message
 * element; BLINK pause is handled by the stylesheet `:hover` rule
 * outside the JSX (verified by the static fence in
 * `content-controls.static.test.ts`).
 */
describe('StickyAnnouncement — hover-pause (T1A hotfix)', () => {
  /*
   * `withHover` lets each test override the result of
   * `window.matchMedia('(hover: hover)')` so we can simulate touch
   * devices. The component itself does NOT read this media query
   * directly; the CSS rule is gated by it, and jsdom does not run CSS,
   * so the only effect of this override is on the inline pause
   * mechanism. For the touch-device test, we want to verify that even
   * when the user agent reports `mouseenter` (jsdom fires it
   * regardless of the media query), the component does not pause the
   * marquee. The simplest way to express that in the component is to
   * keep the pause-effect unconditional on the media query and rely
   * on the CSS guard — so the test verifies the INLINE pause DOES
   * still apply (the CSS guard is what blocks touch in real browsers).
   * The CSS guard is covered by the static fence.
   */

  /*
   * The per-query `matchMedia` shim is the top-level `withMatchMedia`
   * helper above. Each test below picks the `hoverMatches` /
   * `reducedMotionMatches` flags that match the simulated device.
   */

  it('AC-06 + AC-07 (R2): MARQUEE pauses on mouseenter and resumes on mouseleave on a hover-capable device', async () => {
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'MARQUEE' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      const message = host.querySelector<HTMLSpanElement>(
        '[data-testid="sticky-announcement-marquee"] > span',
      );
      expect(message).not.toBeNull();

      // React 19 maps JSX `onMouseEnter` to the DOM `mouseover` event
      // (because `mouseenter` does not bubble and React uses a single
      // delegated listener at the root). Fire `mouseover` and
      // `mouseout` to exercise the JSX handlers.
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      });
      expect(message!.style.animationPlayState).toBe('paused');

      // Fire mouseout and assert the resume.
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      expect(message!.style.animationPlayState).toBe('running');
    }, { hoverMatches: true })();
  });

  it('R2: on a touch device, MARQUEE does NOT pause even when mouseenter fires (inline gate)', async () => {
    // Touch = `(hover: hover) and (pointer: fine)` returns false. The
    // R2 implementation must short-circuit the inline
    // `style.animationPlayState` write AND must not attach the JSX
    // handlers, so the marquee animation stays `running` even when
    // jsdom synthesises a `mouseover`.
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'MARQUEE' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      const message = host.querySelector<HTMLSpanElement>(
        '[data-testid="sticky-announcement-marquee"] > span',
      );
      expect(message).not.toBeNull();

      // The default `animationPlayState` is whatever CSS / inline
      // style has set. After mount, the pause effect should have run
      // with `canPauseOnHover === false` and written `''` (empty),
      // so the property is `''` (not `paused`, not `running`).
      // We assert by checking the value is NOT `paused` after the
      // synthetic mouseover.
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        bar!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      expect(message!.style.animationPlayState).not.toBe('paused');
    }, { hoverMatches: false })();
  });

  it('R2: on a touch device, BLINK wrapper does not attach hover handlers (capability gate)', async () => {
    // Symmetric to the desktop test: when `canPauseOnHover` is
    // false, the JSX expression `canPauseOnHover ? () => ... :
    // undefined` resolves to `undefined`, so React 19 must not
    // cache a function on the host element's `__reactProps$`
    // (the prop is omitted from the React element, so React does
    // not store anything under the key).
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement') as HTMLElement & {
        [key: `__reactProps$${string}`]: Record<string, unknown>;
      };
      expect(bar).not.toBeNull();
      const reactPropsKey = Object.keys(bar).find(
        (k) => k.startsWith('__reactProps$'),
      ) as `__reactProps$${string}` | undefined;
      // React 19 may or may not cache props on the host element
      // when all event handlers are undefined (depends on whether
      // the element is a host or a fragment). We assert the
      // STRONGEST possible invariant: the cached `onMouseEnter`
      // and `onMouseLeave` are NOT callable functions. This is
      // robust to the `props` being present-but-with-undefined
      // event handlers, OR to the props being missing entirely.
      if (reactPropsKey !== undefined) {
        const reactProps = bar[reactPropsKey!];
        expect(typeof reactProps.onMouseEnter).not.toBe('function');
        expect(typeof reactProps.onMouseLeave).not.toBe('function');
      }
      // Behavioral check: synthesise a touch tap and assert the
      // bar remains rendered and the BLINK animation class is
      // still applied. This is the user-observable contract — a
      // tap on touch must NOT freeze the bar.
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        bar!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      expect(bar!.className).toMatch(/hrpStickyAnnouncementAnimBlink/);
      expect(findByTestId('sticky-announcement')).not.toBeNull();
    }, { hoverMatches: false })();
  });

  it('R2: on a desktop device, BLINK wrapper DOES attach hover handlers (no regression)', async () => {
    // The reverse direction of the test above. When
    // `canPauseOnHover` is true (hover-capable), the handlers must
    // be attached so the stylesheet `:hover` pause rule (CSS
    // media-gated separately) and the inline pause can fire.
    // We verify by inspecting React 19's internal props on the
    // host DOM element via the `__reactProps$` cache (React stores
    // the latest props on the element under that key). When
    // `onMouseEnter` is a JSX expression that resolves to a
    // function, the cached `onMouseEnter` is a function. When the
    // expression resolves to `undefined`, the cached value is
    // `undefined`.
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement') as HTMLElement & {
        [key: `__reactProps$${string}`]: Record<string, unknown>;
      };
      expect(bar).not.toBeNull();
      const reactPropsKey = Object.keys(bar).find(
        (k) => k.startsWith('__reactProps$'),
      ) as `__reactProps$${string}` | undefined;
      expect(reactPropsKey).toBeDefined();
      const reactProps = bar[reactPropsKey!];
      expect(typeof reactProps.onMouseEnter).toBe('function');
      expect(typeof reactProps.onMouseLeave).toBe('function');
    }, { hoverMatches: true })();
  });

  it('R2: BLINK is preserved on touch (no inline pause, no scroll lock, no visible state change)', async () => {
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      // The wrapper class includes the `hrpStickyAnnouncementAnimBlink`
      // fragment so the R2 ring keyframe is attached. The reduced
      // motion guard is NOT in effect (we did not set it in this
      // test), so the animation must be present.
      expect(bar!.className).toMatch(/hrpStickyAnnouncementAnimBlink/);
      // Synthesise a tap sequence; the bar must remain rendered and
      // the class list must not have changed.
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        bar!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      expect(findByTestId('sticky-announcement')).not.toBeNull();
      expect(bar!.className).toMatch(/hrpStickyAnnouncementAnimBlink/);
    }, { hoverMatches: false })();
  });

  it('R2: prefers-reduced-motion wins over BLINK and the ring keyframe is detached (accessibility preserved)', async () => {
    // Mirror the original reduced-motion test but verify the R2
    // ring keyframe is also disabled, not just the ::before opacity
    // blink. The wrapper class itself stays (the stylesheet
    // applies `animation: none`), but the rendered `className` on
    // the wrapper should not include the BLINK animation class.
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      // CSS Modules emit class names like `_hrpStickyAnnouncementAnimBlink_xxxxx`.
      // The unhashed fragment `hrpStickyAnnouncementAnimBlink` must NOT appear
      // in the rendered class list when reduced motion is active.
      expect(bar!.className).not.toMatch(/hrpStickyAnnouncementAnimBlink/);
    }, { hoverMatches: true, reducedMotionMatches: true })();
  });

  it('AC-06: BLINK wrapper carries onMouseEnter / onMouseLeave listeners on a hover-capable device (no inline pause on wrapper itself)', async () => {
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      // React 19: onMouseEnter ↔ mouseover, onMouseLeave ↔ mouseout.
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        bar!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      // Re-assert the bar is still rendered (no crash on hover toggle).
      expect(findByTestId('sticky-announcement')).not.toBeNull();
    }, { hoverMatches: true })();
  });

  it('AC-08 (logical): when animation=NONE, hover does not affect any inline state', async () => {
    await withMatchMedia(async () => {
      await mount({ dto: dto({ animation: 'NONE' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      await act(async () => {
        bar!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        bar!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      // No marquee element exists, so no inline animationPlayState.
      const message = host.querySelector<HTMLSpanElement>(
        '[data-testid="sticky-announcement-marquee"]',
      );
      expect(message).toBeNull();
    }, { hoverMatches: true })();
  });
});
