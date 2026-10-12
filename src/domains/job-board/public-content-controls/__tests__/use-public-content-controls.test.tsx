/**
 * public-content-controls/__tests__/use-public-content-controls.test.tsx —
 * Phase B / UI2 client hook tests using `createRoot` + `act` (the repo's
 * convention — no `@testing-library/react`).
 */

// @vitest-environment jsdom

import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PUBLIC_CONTENT_CONTROLS_DEFAULTS,
  usePublicContentControls,
} from '../use-public-content-controls';

afterEach(() => {
  vi.restoreAllMocks();
});

interface RenderedState {
  current: ReturnType<typeof usePublicContentControls>;
}

function renderHook(): { container: HTMLDivElement; read: () => RenderedState['current'] } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const ref: RenderedState = { current: PUBLIC_CONTENT_CONTROLS_DEFAULTS };
  const Probe = () => {
    ref.current = usePublicContentControls();
    return null;
  };
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(Probe));
  });
  return {
    container,
    read: () => ref.current,
  };
}

describe('usePublicContentControls (Phase B / UI2)', () => {
  it('returns the open defaults before the first fetch resolves', () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    const { read } = renderHook();
    expect(read().loaded).toBe(false);
    expect(read().newsSectionEnabled).toBe(true);
    expect(read().stickyAnnouncement.enabled).toBe(false);
  });

  it('returns newsSectionEnabled=false when the API says so', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ newsSectionEnabled: false, stickyAnnouncement: null }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { read } = renderHook();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(read().loaded).toBe(true);
    expect(read().newsSectionEnabled).toBe(false);
  });

  it('projects a valid stickyAnnouncement', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        newsSectionEnabled: true,
        stickyAnnouncement: {
          enabled: true,
          message: 'Hello',
          ctaLabel: null,
          ctaUrl: null,
          dismissible: true,
          textColor: 'on-primary',
          font: 'SANS',
          emphasis: 'BOLD',
          animation: 'NONE',
          contentRevision: 'rev-abc',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { read } = renderHook();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(read().loaded).toBe(true);
    expect(read().stickyAnnouncement.enabled).toBe(true);
    expect(read().stickyAnnouncement.contentRevision).toBe('rev-abc');
  });

  it('falls back to defaults on HTTP failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);
    const { read } = renderHook();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(read().loaded).toBe(true);
    expect(read().newsSectionEnabled).toBe(PUBLIC_CONTENT_CONTROLS_DEFAULTS.newsSectionEnabled);
  });

  it('falls back to defaults on network error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const { read } = renderHook();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(read().loaded).toBe(true);
    expect(read().newsSectionEnabled).toBe(true);
    expect(read().stickyAnnouncement.enabled).toBe(false);
  });
});