import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SettingsTabs } from './settings-tabs';

describe('SettingsTabs', () => {
  it('shows the public settings groups and the protected OTP integration group', () => {
    const markup = renderToStaticMarkup(
      <SettingsTabs active="homepage" onChange={() => undefined} />,
    );

    expect(markup.match(/role="tab"/g)).toHaveLength(4);
    expect(markup).toContain('Trang chủ');
    expect(markup).toContain('Thông báo công khai');
    expect(markup).toContain('Liên hệ công khai');
    expect(markup).toContain('Tích hợp OTP');
    expect(markup).not.toContain('Hệ thống');
    expect(markup).not.toContain('Tài khoản');
    expect(markup).toContain('aria-controls="settings-tab-panel-homepage"');
    expect(markup).toContain('aria-selected="true"');
  });
});
