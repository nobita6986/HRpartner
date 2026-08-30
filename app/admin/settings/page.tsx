'use client';

import * as React from 'react';

/**
 * /admin/settings — hiện tại là bản phác thảo: liệt kê những nhóm cấu hình sẽ có,
 * chưa nhóm nào bấm được. Vì vậy mỗi nhóm gắn nhãn "Chưa khả dụng" và các dòng
 * KHÔNG phải link — thà nói thật còn hơn để link `#` giả vờ bấm được.
 */
const SETTINGS_GROUPS = [
  {
    title: 'Cài đặt chung',
    items: [
      { label: 'Thông tin tổ chức', description: 'Tên công ty, logo, múi giờ' },
      { label: 'Ngôn ngữ & vùng', description: 'Ngôn ngữ giao diện, định dạng ngày/tháng' },
    ],
  },
  {
    title: 'Bảo mật',
    items: [
      { label: 'Đổi mật khẩu', description: 'Thay đổi mật khẩu tài khoản' },
      { label: 'Xác thực hai yếu tố (2FA)', description: 'Bật/tắt xác thực 2 lớp' },
      { label: 'Lịch sử đăng nhập', description: 'Xem các phiên đăng nhập gần đây' },
    ],
  },
  {
    title: 'Thông báo',
    items: [
      { label: 'Email thông báo', description: 'Cấu hình email nhận thông báo' },
      { label: 'SMS / Zalo', description: 'Cấu hình kênh SMS và Zalo OA' },
      { label: 'App Push', description: 'Bật/tắt thông báo trên ứng dụng' },
    ],
  },
  {
    title: 'Tích hợp',
    items: [
      { label: 'API Keys', description: 'Quản lý API keys cho bên thứ ba' },
      { label: 'Webhook', description: 'Cấu hình webhook nhận sự kiện' },
      { label: 'Single Sign-On (SSO)', description: 'Kết nối LDAP / SAML / OAuth' },
    ],
  },
  {
    title: 'Nhật ký hệ thống',
    items: [
      { label: 'Audit Log', description: 'Xem lịch sử thay đổi quan trọng' },
      { label: 'Error Log', description: 'Các lỗi hệ thống gần đây' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">Cài đặt</h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Cấu hình hệ thống — các nhóm dưới đây chưa mở, đang liệt kê để biết sẽ có gì.
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
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <h2 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">{group.title}</h2>
              <span
                style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)' }}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
              >
                Chưa khả dụng
              </span>
            </div>
            <div className="divide-y divide-solid" style={{ borderColor: 'var(--outline-variant)' }}>
              {group.items.map((item) => (
                <div key={item.label} className="block px-4 py-3 opacity-60">
                  <div style={{ color: 'var(--on-surface)' }} className="text-sm font-medium">{item.label}</div>
                  <div style={{ color: 'var(--on-surface-variant)' }} className="text-xs mt-0.5">{item.description}</div>
                </div>
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
