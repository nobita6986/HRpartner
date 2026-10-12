'use client';

/**
 * settings-tabs.tsx — hrp-t2-public-site-hotfix (T2 / STEP-07).
 *
 * Tab 4 nhóm: Giao diện, Liên hệ, Hệ thống, Tài khoản & Quyền.
 * Component nhận `active` + `onChange` từ parent — state cục bộ của form
 * (`useState`); route KHÔNG đổi URL (giữ /admin/settings đơn giản, không
 * hash). Khi user reload trang, tab reset về mặc định `interface` —
 * chấp nhận được vì đây là UI grouping, không phải data.
 */
import Link from 'next/link';
import * as React from 'react';

export type SettingsTabId = 'interface' | 'contact' | 'system' | 'account';

interface SettingsTabsProps {
  active: SettingsTabId;
  onChange: (next: SettingsTabId) => void;
  /** Test hooks — đặt ở root cho fence testid dễ đọc. */
  testId?: string;
}

interface TabSpec {
  id: SettingsTabId;
  label: string;
  description: string;
}

const TAB_SPECS: readonly TabSpec[] = [
  {
    id: 'interface',
    label: 'Giao diện',
    description: 'Cỡ trang, tin tức, ảnh nền, thông báo cuối trang.',
  },
  {
    id: 'contact',
    label: 'Liên hệ công khai',
    description: 'Số điện thoại, Zalo OA, Messenger Page.',
  },
  {
    id: 'system',
    label: 'Hệ thống',
    description: 'Bảo mật, thông báo, tích hợp, nhật ký (chưa khả dụng).',
  },
  {
    id: 'account',
    label: 'Tài khoản & Quyền',
    description: 'Đi đến trang quản lý tài khoản.',
  },
];

export function SettingsTabs({ active, onChange, testId = 'settings-tabs' }: SettingsTabsProps) {
  return (
    <nav
      role="tablist"
      aria-label="Nhóm cài đặt"
      data-testid={testId}
      className="mb-6 flex flex-wrap gap-2 border-b"
      style={{ borderColor: 'var(--outline-variant)' }}
    >
      {TAB_SPECS.map((spec) => {
        const isActive = spec.id === active;
        return (
          <button
            key={spec.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`settings-tab-panel-${spec.id}`}
            data-testid={`settings-tab-${spec.id}`}
            onClick={() => onChange(spec.id)}
            className="hrp-focus -mb-px inline-flex flex-col gap-0.5 rounded-t-lg border-b-2 px-4 py-2 text-left text-sm transition"
            style={{
              borderColor: isActive ? 'var(--color-primary)' : 'transparent',
              background: isActive ? 'var(--surface-container-lowest)' : 'transparent',
              color: isActive ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
            }}
          >
            <span className="font-semibold">{spec.label}</span>
            <span className="text-xs opacity-80">{spec.description}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Card đơn lẻ cho tab `account`. CHỈ điều hướng tới `/admin/users` qua
 * `<Link>` Next.js (KHÔNG form, KHÔNG state local — task scope cấm CRUD).
 */
export function AccountTabPanel() {
  return (
    <section
      role="tabpanel"
      id="settings-tab-panel-account"
      aria-labelledby="settings-tab-account"
      data-testid="settings-tab-panel-account"
      className="rounded-lg border p-6"
      style={{
        background: 'var(--surface-container-lowest)',
        borderColor: 'var(--outline-variant)',
      }}
    >
      <h2 style={{ color: 'var(--on-surface)' }} className="text-base font-semibold">
        Quản lý tài khoản
      </h2>
      <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
        Đổi mật khẩu, phân quyền, audit log tài khoản nằm ở trang Tài khoản &amp; Quyền.
      </p>
      <Link
        href="/admin/users"
        className="hrp-btn-primary hrp-focus mt-4 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold"
        data-testid="settings-go-to-users"
      >
        Đi đến Tài khoản &amp; Quyền
      </Link>
    </section>
  );
}