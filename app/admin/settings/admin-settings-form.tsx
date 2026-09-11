'use client';

/**
 * /admin/settings form — client component for editing HomepageSettings.
 *
 * Sub-component of `page.tsx` (server) which fetches initial state and
 * passes it as a prop. This file only contains the form UI + submit logic.
 *
 * POSTs to `/api/admin/homepage-settings` and invalidates the public cache
 * via the server (revalidateTag) on success.
 */
import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import {
  BEST_JOBS_PAGE_SIZES,
  LISTING_PAGE_SIZE_MAX,
  LISTING_PAGE_SIZE_MIN,
  type HomepageSettingsDto,
} from '@/src/domains/job-board/public-types';

const PLACEHOLDER_GROUPS = [
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

export interface AdminSettingsFormProps {
  /** Server-side fetched initial settings. */
  initialSettings: HomepageSettingsDto;
}

export default function AdminSettingsForm({ initialSettings }: AdminSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bestJobsPageSize, setBestJobsPageSize] = useState<number>(initialSettings.bestJobsPageSize);
  const [listingPageSize, setListingPageSize] = useState<number>(initialSettings.listingPageSize);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges =
    bestJobsPageSize !== initialSettings.bestJobsPageSize ||
    listingPageSize !== initialSettings.listingPageSize;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (listingPageSize < LISTING_PAGE_SIZE_MIN || listingPageSize > LISTING_PAGE_SIZE_MAX) {
      setError(`Số việc/trang phải nằm trong [${LISTING_PAGE_SIZE_MIN}, ${LISTING_PAGE_SIZE_MAX}].`);
      return;
    }
    if (![3, 6, 9, 12].includes(bestJobsPageSize)) {
      setError('Số việc tốt nhất/trang phải là một trong {3, 6, 9, 12}.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/homepage-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bestJobsPageSize, listingPageSize }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message ?? `Lỗi ${res.status}`);
          return;
        }
        const data = await res.json();
        setSuccess('Đã lưu cài đặt homepage.');
        if (data?.settings?.bestJobsPageSize) setBestJobsPageSize(data.settings.bestJobsPageSize);
        if (data?.settings?.listingPageSize) setListingPageSize(data.settings.listingPageSize);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi không xác định.');
      }
    });
  }

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">
          Cài đặt
        </h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Cấu hình hệ thống. Nhóm AV1 bên dưới đã có hiệu lực; các nhóm khác đang liệt kê để biết sẽ có gì.
        </p>
      </div>

      {/* AV1 — HomepageSettings (Plan UI B integration) */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border p-6"
        style={{
          background: 'var(--surface-container-lowest)',
          borderColor: 'var(--outline-variant)',
        }}
        data-testid="homepage-settings-form"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 style={{ color: 'var(--on-surface)' }} className="text-base font-semibold">
              Homepage Settings
            </h2>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 text-xs">
              Singleton — chỉ một row id=&apos;default&apos;. Cập nhật ảnh hưởng homepage ngay lập tức.
            </p>
          </div>
          <span
            style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
            className="rounded-full px-2 py-0.5 text-xs font-medium"
          >
            AV1 · ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="bestJobsPageSize"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface)' }}
            >
              Số việc tốt nhất / trang
            </label>
            <select
              id="bestJobsPageSize"
              value={bestJobsPageSize}
              onChange={(e) => setBestJobsPageSize(Number(e.target.value))}
              className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
              style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
            >
              {BEST_JOBS_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} (BestJobs)
                </option>
              ))}
            </select>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
              Bội của 3 để đảm bảo layout grid 3 cột.
            </p>
          </div>

          <div>
            <label
              htmlFor="listingPageSize"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface)' }}
            >
              Số việc / trang (trang /viec-lam)
            </label>
            <input
              id="listingPageSize"
              type="number"
              min={LISTING_PAGE_SIZE_MIN}
              max={LISTING_PAGE_SIZE_MAX}
              step={1}
              value={listingPageSize}
              onChange={(e) => setListingPageSize(Number(e.target.value))}
              className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
              style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
            />
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
              Khoảng [{LISTING_PAGE_SIZE_MIN}, {LISTING_PAGE_SIZE_MAX}]. Mặc định 12.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border p-3 text-sm"
            style={{
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              borderColor: 'var(--error)',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="mt-4 rounded-lg border p-3 text-sm"
            style={{
              background: 'var(--secondary-container)',
              color: 'var(--on-secondary-container)',
              borderColor: 'var(--outline-variant)',
            }}
          >
            {success}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
            Cập nhật lần cuối: {new Date(initialSettings.updatedAt).toLocaleString('vi-VN')}
          </p>
          <button
            type="submit"
            disabled={isPending || !hasChanges}
            className="hrp-btn-primary hrp-focus inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thay đổi
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {PLACEHOLDER_GROUPS.map((group) => (
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
