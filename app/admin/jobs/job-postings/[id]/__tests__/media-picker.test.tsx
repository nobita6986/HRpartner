/**
 * media-picker.test.tsx — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-12, AC-3).
 *
 * Render-shape test cho MediaPicker drawer. KHÔNG có @testing-library/react
 * nên dùng renderToStaticMarkup. Test chỉ verify wrapper render open/close.
 *
 * Sau hotfix:
 * - Không còn folder select (kho chung).
 * - Tab upload dùng MediaBulkUpload.
 * - Picker đọc chung toàn bộ Media PUBLIC (status filter giữ).
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MediaPicker } from '../media-picker';

describe('MediaPicker (render shape — global pool)', () => {
  it('does not render the inner content when closed (drawer hides children)', () => {
    const html = renderToStaticMarkup(
      createElement(MediaPicker, {
        open: false,
        onClose: () => undefined,
        onPick: () => undefined,
      }),
    );
    expect(html).not.toContain('data-testid="media-picker-tab-library"');
    expect(html).not.toContain('data-testid="media-picker-tab-upload"');
  });

  it('renders both library + upload tabs when open; no folder select', () => {
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
    // hrp-t1c-media-global-pool-bulk-upload-hotfix: bỏ folder select
    expect(html).not.toContain('data-testid="media-picker-folder"');
    // Status filter vẫn còn
    expect(html).toContain('data-testid="media-picker-status"');
  });

  it('shows the empty state when the library list is empty (initially)', () => {
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

  it('does not read defaultFolder (picker uses global pool)', () => {
    // Picker hiện vẫn chấp nhận prop defaultFolder để backward-compat
    // nhưng KHÔNG dùng nó. Render không lỗi và không có folder label.
    const html = renderToStaticMarkup(
      createElement(MediaPicker, {
        open: true,
        onClose: () => undefined,
        onPick: () => undefined,
        defaultFolder: 'job-postings',
      }),
    );
    // Không có label "Thư mục" trong markup
    expect(html).not.toMatch(/>\s*Thư mục\s*</);
  });

  it('source imports MediaBulkUpload and uses it in upload tab', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const src = readFileSync(
      join(process.cwd(), 'app/admin/jobs/job-postings/[id]/media-picker.tsx'),
      'utf8',
    );
    // Upload tab render MediaBulkUpload (RQ-12, AC-3)
    expect(src).toMatch(/<MediaBulkUpload\b/);
    // KHÔNG truyền `folder` query cho /api/admin/media (RQ-12, AC-12)
    expect(src).not.toMatch(/params\.set\(['"]folder['"]/);
    // Bỏ MediaFolderLabel dependency
    expect(src).not.toMatch(/mediaFolderLabel\s*\(/);
  });
});
