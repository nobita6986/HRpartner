'use client';

/**
 * /admin/settings form — client component for editing HomepageSettings.
 *
 * Sub-component of `page.tsx` (server) which fetches initial state and
 * passes it as a prop. This file only contains the form UI + submit logic.
 *
 * POSTs to `/api/admin/homepage-settings` and invalidates the public cache
 * via the server (revalidateTag) on success.
 *
 * UX contract (v1.1 — Owner visual review):
 *   - Live client-side validation mirrors server validation
 *     (allow-list for bestJobsPageSize, range for listingPageSize).
 *   - Field-level error display via aria-invalid + aria-describedby.
 *   - "Đặt lại" (Reset) button restores last-saved values.
 *   - BestJobs dropdown shows friendly label "N việc" + grid hint.
 *   - Last-updated timestamp reflects post-save value (not stale initial).
 */
import * as React from 'react';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Save } from 'lucide-react';
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
  /** Present when the settings schema is not ready on the deployed database. */
  unavailableReason?: string;
}

/** Field-level validators — must mirror server-side `validateBody` in admin route. */
function validateBestJobs(value: number): string | null {
  if (!Number.isFinite(value)) return 'Giá trị không hợp lệ.';
  if (!(BEST_JOBS_PAGE_SIZES as readonly number[]).includes(Math.floor(value))) {
    return `Số việc tốt nhất/trang phải là một trong {${BEST_JOBS_PAGE_SIZES.join(', ')}}.`;
  }
  return null;
}

function validateListing(value: number): string | null {
  if (!Number.isFinite(value)) return 'Giá trị không hợp lệ.';
  if (value < LISTING_PAGE_SIZE_MIN || value > LISTING_PAGE_SIZE_MAX) {
    return `Số việc/trang phải nằm trong [${LISTING_PAGE_SIZE_MIN}, ${LISTING_PAGE_SIZE_MAX}].`;
  }
  return null;
}

export default function AdminSettingsForm({ initialSettings, unavailableReason }: AdminSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Track last-saved snapshot so Reset can revert + "updated at" shows the latest.
  const [savedSnapshot, setSavedSnapshot] = useState<HomepageSettingsDto>(initialSettings);
  const [bestJobsPageSize, setBestJobsPageSize] = useState<number>(initialSettings.bestJobsPageSize);
  const [listingPageSize, setListingPageSize] = useState<number>(initialSettings.listingPageSize);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bestJobsError = validateBestJobs(bestJobsPageSize);
  const listingError = validateListing(listingPageSize);
  const hasFieldError = bestJobsError !== null || listingError !== null;

  const hasChanges =
    bestJobsPageSize !== savedSnapshot.bestJobsPageSize ||
    listingPageSize !== savedSnapshot.listingPageSize;

  // Clear stale success/error when user edits again.
  useEffect(() => {
    if (success || error) {
      setSuccess(null);
      setError(null);
    }
  }, [bestJobsPageSize, listingPageSize, success, error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (unavailableReason) {
      setError(unavailableReason);
      return;
    }

    if (hasFieldError) {
      setError(bestJobsError ?? listingError ?? 'Có trường chưa hợp lệ.');
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
        if (data?.settings) {
          setSavedSnapshot(data.settings);
          // Sync local state to the server-canonicalized values (handles clamping).
          setBestJobsPageSize(data.settings.bestJobsPageSize);
          setListingPageSize(data.settings.listingPageSize);
          setSuccess('Đã lưu cài đặt homepage.');
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi không xác định.');
      }
    });
  }

  function handleReset() {
    setBestJobsPageSize(savedSnapshot.bestJobsPageSize);
    setListingPageSize(savedSnapshot.listingPageSize);
    setError(null);
    setSuccess(null);
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
        noValidate
        className="mb-8 rounded-lg border p-6"
        style={{
          background: 'var(--surface-container-lowest)',
          borderColor: 'var(--outline-variant)',
        }}
        data-testid="homepage-settings-form"
      >
        {unavailableReason && (
          <div
            role="alert"
            className="mb-5 rounded-lg border p-3 text-sm"
            style={{
              background: 'var(--warning-container)',
              color: 'var(--on-warning-container)',
              borderColor: 'var(--warning)',
            }}
          >
            {unavailableReason} Các giá trị mặc định bên dưới chỉ để tham khảo.
          </div>
        )}
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
            style={{
              background: unavailableReason ? 'var(--warning-container)' : 'var(--secondary-container)',
              color: unavailableReason ? 'var(--on-warning-container)' : 'var(--on-secondary-container)',
            }}
            className="rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {unavailableReason ? 'AV1 · CHỜ MIGRATION' : 'AV1 · ACTIVE'}
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
              disabled={Boolean(unavailableReason)}
              aria-invalid={bestJobsError !== null}
              aria-describedby="bestJobsPageSize-help bestJobsPageSize-error"
              className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
              style={{
                borderColor: bestJobsError ? 'var(--error)' : 'var(--outline-variant)',
                color: 'var(--on-surface)',
              }}
              data-testid="bestJobsPageSize-select"
            >
              {BEST_JOBS_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} việc
                </option>
              ))}
            </select>
            <p
              id="bestJobsPageSize-help"
              style={{ color: 'var(--on-surface-variant)' }}
              className="mt-1 text-xs"
            >
              Bội của 3 để đảm bảo layout grid 3 cột. Tùy chọn: {BEST_JOBS_PAGE_SIZES.join(', ')}.
            </p>
            {bestJobsError && (
              <p
                id="bestJobsPageSize-error"
                role="alert"
                style={{ color: 'var(--error)' }}
                className="mt-1 text-xs font-medium"
              >
                {bestJobsError}
              </p>
            )}
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
              disabled={Boolean(unavailableReason)}
              aria-invalid={listingError !== null}
              aria-describedby="listingPageSize-help listingPageSize-error"
              className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
              style={{
                borderColor: listingError ? 'var(--error)' : 'var(--outline-variant)',
                color: 'var(--on-surface)',
              }}
              data-testid="listingPageSize-input"
            />
            <p
              id="listingPageSize-help"
              style={{ color: 'var(--on-surface-variant)' }}
              className="mt-1 text-xs"
            >
              Khoảng [{LISTING_PAGE_SIZE_MIN}, {LISTING_PAGE_SIZE_MAX}]. Mặc định 12.
            </p>
            {listingError && (
              <p
                id="listingPageSize-error"
                role="alert"
                style={{ color: 'var(--error)' }}
                className="mt-1 text-xs font-medium"
              >
                {listingError}
              </p>
            )}
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
            aria-live="polite"
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

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <p style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
            {unavailableReason
              ? 'Chưa có dữ liệu cấu hình trên database'
              : `Cập nhật lần cuối: ${new Date(savedSnapshot.updatedAt).toLocaleString('vi-VN')}`}
          </p>
          <button
            type="button"
            onClick={handleReset}
            disabled={Boolean(unavailableReason) || isPending || !hasChanges}
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            className="hrp-focus inline-flex items-center gap-2 rounded-lg border border-[var(--outline-variant)] px-4 py-2 text-sm font-semibold disabled:opacity-40"
            data-testid="settings-reset-button"
          >
            <RotateCcw className="h-4 w-4" />
            Đặt lại
          </button>
          <button
            type="submit"
            disabled={Boolean(unavailableReason) || isPending || !hasChanges || hasFieldError}
            className="hrp-btn-primary hrp-focus inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
            data-testid="settings-save-button"
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
