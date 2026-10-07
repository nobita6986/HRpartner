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
    // state to `prefersReducedMotion === true`.
    const originalMatchMedia = window.matchMedia;
    const listeners: Array<(event: Event) => void> = [];
    const fakeMql = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_: string, cb: (event: Event) => void) => {
        listeners.push(cb);
      },
      removeEventListener: (_: string, cb: (event: Event) => void) => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      },
      addListener: (cb: (event: Event) => void) => listeners.push(cb),
      removeListener: (cb: (event: Event) => void) => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      },
      dispatchEvent: () => true,
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => fakeMql,
    });
    try {
      await mount({ dto: dto({ animation: 'BLINK' }) });
      const bar = findByTestId('sticky-announcement');
      expect(bar).not.toBeNull();
      // CSS Modules emit class names like `_hrpStickyAnnouncementAnimBlink_xxxxx`.
      // The unhashed fragment `hrpStickyAnnouncementAnimBlink` must NOT appear
      // in the rendered class list when reduced motion is active.
      expect(bar!.className).not.toMatch(/hrpStickyAnnouncementAnimBlink/);
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
});
