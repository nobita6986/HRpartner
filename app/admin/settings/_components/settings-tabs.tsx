'use client';

import * as React from 'react';

export type SettingsTabId = 'homepage' | 'announcement' | 'contact';

interface SettingsTabsProps {
  active: SettingsTabId;
  onChange: (next: SettingsTabId) => void;
  testId?: string;
}

interface TabSpec {
  id: SettingsTabId;
  label: string;
  description: string;
}

const TAB_SPECS: readonly TabSpec[] = [
  {
    id: 'homepage',
    label: 'Trang chủ',
    description: 'Cỡ trang, ảnh Hero và mục Tin tức.',
  },
  {
    id: 'announcement',
    label: 'Thông báo công khai',
    description: 'Nội dung và cách hiển thị thông báo cuối trang.',
  },
  {
    id: 'contact',
    label: 'Liên hệ công khai',
    description: 'Số điện thoại, Zalo OA và Messenger.',
  },
];

export function SettingsTabs({ active, onChange, testId = 'settings-tabs' }: SettingsTabsProps) {
  return (
    <nav
      role="tablist"
      aria-label="Nhóm cài đặt công khai"
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
            className="hrp-focus -mb-px inline-flex min-h-11 flex-col justify-center gap-0.5 rounded-t-lg border-b-2 px-4 py-2 text-left text-sm transition"
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
