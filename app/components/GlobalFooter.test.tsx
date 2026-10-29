/**
 * app/components/GlobalFooter.test.tsx — server-render test for
 * the public-portal footer.
 *
 * Scope (T1A hotfix `hrp-t1a-sticky-announcement-hotfix`):
 *   - AC-09: iframe `src` chứa Google Maps embed URL cho toạ độ
 *     `21.314035, 105.680883` (was OpenStreetMap, replaced because
 *     the user explicitly required Google Maps for consistency with
 *     their other Google properties; OSM was a T0-pick from r9 of the
 *     prior `hrp-v6-ui-04c1-r9-footer-map-osm` task).
 *   - AC-10: địa chỉ text trong cột 1 giữ nguyên nguyên văn.
 *   - AC-11: regression fence — title, loading, width, height được
 *     preserve, không thêm API key vào env.
 *
 * Server-render only: the footer is a pure static component with no
 * client-side state, so `renderToStaticMarkup` is enough.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { GlobalFooter } from './GlobalFooter';

function render(): string {
  return renderToStaticMarkup(createElement(GlobalFooter));
}

describe('GlobalFooter — T1A hotfix map embed', () => {
  it('AC-09: iframe src chứa Google Maps embed URL cho cùng toạ độ marker', () => {
    const html = render();
    expect(html).toContain(
      'https://maps.google.com/maps?q=21.314035,105.680883&amp;hl=vi&amp;z=15&amp;output=embed',
    );
  });

  it('AC-09 (negative): iframe KHÔNG còn dùng OpenStreetMap endpoint', () => {
    const html = render();
    expect(html).not.toContain('openstreetmap.org/export/embed.html');
  });

  it('AC-10: text địa chỉ cột 1 giữ nguyên nguyên văn và hiển thị MST ngay bên dưới', () => {
    const html = render();
    const address =
      'Địa chỉ: Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam';
    const taxCode = 'MST: 2500754513';
    expect(html).toContain(address);
    expect(html).toContain(taxCode);
    expect(html.indexOf(address)).toBeLessThan(html.indexOf(taxCode));
  });

  it('AC-11: iframe attributes preserve title, loading, width, height', () => {
    const html = render();
    expect(html).toContain('title="HRP Việt Nam - Bản đồ"');
    expect(html).toContain('loading="lazy"');
    expect(html).toMatch(/width="100%"/);
    expect(html).toMatch(/height="220"/);
  });

  it('AC-12: không thêm Google Maps API key vào src (chỉ embed public endpoint)', () => {
    const html = render();
    // Embed endpoint phải KHÔNG chứa `key=` (sẽ chỉ ra việc vô tình
    // hardcode API key vào URL).
    expect(html).not.toMatch(/[?&]key=/);
    expect(html).not.toMatch(/[?&]api_key=/);
  });

  it('column 3 giữ heading "BẢN ĐỒ"', () => {
    const html = render();
    expect(html).toContain('BẢN ĐỒ');
  });
});
