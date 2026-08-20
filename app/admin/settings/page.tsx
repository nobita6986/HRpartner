'use client';

import * as React from 'react';

const SETTINGS_GROUPS = [
  {
    title: 'Cài đặt chung',
    items: [
      { label: 'Thông tin tổ chức', description: 'Tên công ty, logo, múi giờ', href: '#' },
      { label: 'Ngôn ngữ & vùng', description: 'Ngôn ngữ giao diện, định dạng ngày/tháng', href: '#' },
    ],
  },
  {
    title: 'Bảo mật',
    items: [
      { label: 'Đổi mật khẩu', description: 'Thay đổi mật khẩu tài khoản', href: '#' },
      { label: 'Xác thực hai yếu tố (2FA)', description: 'Bật/tắt xác thực 2 lớp', href: '#' },
      { label: 'Lịch sử đăng nhập', description: 'Xem các phiên đăng nhập gần đây', href: '#' },
    ],
  },
  {
    title: 'Thông báo',
    items: [
      { label: 'Email thông báo', description: 'Cấu hình email nhận thông báo', href: '#' },
      { label: 'SMS / Zalo', description: 'Cấu hình kênh SMS và Zalo OA', href: '#' },
      { label: 'App Push', description: 'Bật/tắt thông báo trên ứng dụng', href: '#' },
    ],
  },
  {
    title: 'Tích hợp',
    items: [
      { label: 'API Keys', description: 'Quản lý API keys cho bên thứ ba', href: '#' },
      { label: 'Webhook', description: 'Cấu hình webhook nhận sự kiện', href: '#' },
      { label: 'Single Sign-On (SSO)', description: 'Kết nối LDAP / SAML / OAuth', href: '#' },
    ],
  },
  {
    title: 'Nhật ký hệ thống',
    items: [
      { label: 'Audit Log', description: 'Xem lịch sử thay đổi quan trọng', href: '#' },
      { label: 'Error Log', description: 'Các lỗi hệ thống gần đây', href: '#' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Cài đặt</h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Module M7 — Cấu hình hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {SETTINGS_GROUPS.map((group) => (
          <div
            key={group.title}
            style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            className="rounded-lg border"
          >
            <div
              style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}
              className="px-4 py-3"
            >
              <h2 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">{group.title}</h2>
            </div>
            <div className="divide-y divide-solid" style={{ borderColor: 'var(--outline-variant)' }}>
              {group.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-3 transition-colors hover:opacity-80"
                >
                  <div style={{ color: 'var(--on-surface)' }} className="text-sm font-medium">{item.label}</div>
                  <div style={{ color: 'var(--on-surface-variant)' }} className="text-xs mt-0.5">{item.description}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}
        className="mt-8 rounded-lg border p-4 text-center"
      >
        <p style={{ color: 'var(--on-surface-variant)' }} className="text-sm">
          Phiên bản hệ thống HRP <span className="font-mono text-xs">v1.0.0</span> — Các module cài đặt chi tiết đang được phát triển.
        </p>
      </div>
    </div>
  );
}
