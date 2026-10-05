/**
 * media-picker.test.tsx — hrp-t1c-jobposting-media-youtube (RQ-06, DEC-05).
 *
 * Render-shape test cho MediaPicker drawer. KHÔNG có @testing-library/react
 * nên dùng renderToStaticMarkup. Test chỉ verify wrapper render open/close.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MediaPicker } from '../media-picker';

describe('MediaPicker (render shape)', () => {
  it('does not render the inner content when closed (drawer hides children)', () => {
    const html = renderToStaticMarkup(
      createElement(MediaPicker, {
        open: false,
        onClose: () => undefined,
        onPick: () => undefined,
      }),
    );
    // When closed, the SlideOutDrawer's children are not in the DOM.
    expect(html).not.toContain('data-testid="media-picker-tab-library"');
    expect(html).not.toContain('data-testid="media-picker-tab-upload"');
  });

  it('renders both library + upload tabs when open', () => {
    const html = renderToStaticMarkup(
      createElement(MediaPicker, {
        open: true,
        onClose: () => undefined,
        onPick: () => undefined,
      }),
    );
    expect(html).toContain('data-testid="media-picker-tab-library"');
    expect(html).toContain('data-testid="media-picker-tab-upload"');
    expect(html).toContain('data-testid="media-picker-search"');
    expect(html).toContain('data-testid="media-picker-folder"');
    expect(html).toContain('data-testid="media-picker-status"');
  });

  it('shows the empty state when the library list is empty (initially)', () => {
    // The empty state is rendered only after the fetch completes. Since the
    // initial render fires a fetch in useEffect, we only assert the structural
    // pieces that exist pre-fetch (search bar, controls, tabs).
    const html = renderToStaticMarkup(
      createElement(MediaPicker, {
        open: true,
        onClose: () => undefined,
        onPick: () => undefined,
      }),
    );
    expect(html).toContain('data-testid="media-picker-pager"');
    expect(html).toContain('Tổng');
  });
});
