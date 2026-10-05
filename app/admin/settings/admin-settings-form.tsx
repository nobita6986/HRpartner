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
import {
  STICKY_ANIMATIONS,
  STICKY_EMPHASIS,
  STICKY_FONTS,
  STICKY_TEXT_COLORS,
  safeStickyAnnouncement,
  type StickyAnimation,
  type StickyEmphasis,
  type StickyFont,
  type StickyTextColor,
} from '@/src/domains/job-board/public-content-controls/types';
import { InvalidCtaUrlError, normalizeCtaUrl } from '@/src/domains/job-board/public-content-controls/url-safety';
import {
  InvalidChatUrlError,
  InvalidPhoneNumberError,
  normalizeChatUrl,
  normalizePhoneNumber,
} from '@/src/domains/job-board/chat-links';
import { buildHomepageSettingsPatch } from './homepage-settings-patch';
import { actionLabel } from '@/src/shared/i18n/action-dictionary';

const STICKY_TEXT_COLOR_LABELS: Readonly<Record<StickyTextColor, string>> = {
  'on-primary': 'Trên nền màu chính',
  'on-surface': 'Trên nền nội dung',
  'on-secondary-container': 'Trên nền màu phụ',
};

const STICKY_FONT_LABELS: Readonly<Record<StickyFont, string>> = {
  SANS: 'Không chân (Sans-serif)',
  SERIF: 'Có chân (Serif)',
};

const STICKY_EMPHASIS_LABELS: Readonly<Record<StickyEmphasis, string>> = {
  NORMAL: 'Thông thường',
  BOLD: 'Đậm',
  EXTRA_BOLD: 'Rất đậm',
};

const STICKY_ANIMATION_LABELS: Readonly<Record<StickyAnimation, string>> = {
  NONE: 'Không có',
  BLINK: 'Nhấp nháy',
  MARQUEE: 'Chạy chữ',
};

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
      { label: 'Thông báo đẩy', description: 'Bật hoặc tắt thông báo trên ứng dụng' },
    ],
  },
  {
    title: 'Tích hợp',
    items: [
      { label: 'Khóa API', description: 'Quản lý khóa API dùng cho dịch vụ bên thứ ba' },
      { label: 'Webhook', description: 'Cấu hình webhook để nhận sự kiện' },
      { label: 'Đăng nhập một lần (SSO)', description: 'Kết nối LDAP / SAML / OAuth' },
    ],
  },
  {
    title: 'Nhật ký hệ thống',
    items: [
      { label: 'Nhật ký kiểm toán', description: 'Xem lịch sử các thay đổi quan trọng' },
      { label: 'Nhật ký lỗi', description: 'Xem các lỗi hệ thống gần đây' },
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

function validateChatUrl(value: string, channel: 'zalo' | 'messenger'): string | null {
  try {
    normalizeChatUrl(value, channel);
    return null;
  } catch (error) {
    if (error instanceof InvalidChatUrlError) return error.message;
    return 'URL không hợp lệ.';
  }
}

function validatePhoneNumber(value: string): string | null {
  try {
    normalizePhoneNumber(value);
    return null;
  } catch (error) {
    if (error instanceof InvalidPhoneNumberError) return error.message;
    return 'Số điện thoại không hợp lệ.';
  }
}

/**
 * Compute a new, monotonic contentRevision from the prior one.
 *
 * The DB row keeps a `{ contentRevision, ... }` JSON; the prior counter is the
 * last token after `rev-`. We bump it by 1 and keep the prefix stable. Falls
 * back to a fresh timestamp-derived id if the prior value is malformed.
 */
function nextContentRevision(prior: string): string {
  const match = /^rev-(\d+)$/.exec(prior);
  if (match) {
    const n = Number.parseInt(match[1]!, 10);
    return `rev-${n + 1}`;
  }
  return `rev-${Date.now()}`;
}

function validateCtaUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    normalizeCtaUrl(trimmed);
    return null;
  } catch (error) {
    if (error instanceof InvalidCtaUrlError) return error.message;
    return 'URL không hợp lệ.';
  }
}

export default function AdminSettingsForm({ initialSettings, unavailableReason }: AdminSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Track last-saved snapshot so Reset can revert + "updated at" shows the latest.
  const [savedSnapshot, setSavedSnapshot] = useState<HomepageSettingsDto>(initialSettings);
  const [bestJobsPageSize, setBestJobsPageSize] = useState<number>(initialSettings.bestJobsPageSize);
  const [listingPageSize, setListingPageSize] = useState<number>(initialSettings.listingPageSize);
  const [zaloChatUrl, setZaloChatUrl] = useState(initialSettings.zaloChatUrl ?? '');
  const [messengerChatUrl, setMessengerChatUrl] = useState(initialSettings.messengerChatUrl ?? '');
  const [phoneCallNumber, setPhoneCallNumber] = useState(initialSettings.phoneCallNumber ?? '');

  // ── UI2 / Phase B state ────────────────────────────────────────────────
  // Pull initial values from `initialSettings.stickyAnnouncement` (already
  // projected through `safeStickyAnnouncement` server-side).
  const stickyInitial = safeStickyAnnouncement(initialSettings.stickyAnnouncement ?? null);
  const [newsSectionEnabled, setNewsSectionEnabled] = useState<boolean>(initialSettings.newsSectionEnabled);
  const [stickyEnabled, setStickyEnabled] = useState<boolean>(stickyInitial.enabled);
  const [stickyMessage, setStickyMessage] = useState<string>(stickyInitial.message);
  const [stickyCtaLabel, setStickyCtaLabel] = useState<string>(stickyInitial.ctaLabel ?? '');
  const [stickyCtaUrl, setStickyCtaUrl] = useState<string>(stickyInitial.ctaUrl ?? '');
  const [stickyDismissible, setStickyDismissible] = useState<boolean>(stickyInitial.dismissible);
  const [stickyBackgroundOpacity, setStickyBackgroundOpacity] = useState<number>(stickyInitial.backgroundOpacity);
  const [stickyTextColor, setStickyTextColor] = useState<StickyTextColor>(stickyInitial.textColor);
  const [stickyFont, setStickyFont] = useState<StickyFont>(stickyInitial.font);
  const [stickyEmphasis, setStickyEmphasis] = useState<StickyEmphasis>(stickyInitial.emphasis);
  const [stickyAnimation, setStickyAnimation] = useState<StickyAnimation>(stickyInitial.animation);
  const [stickyContentRevision, setStickyContentRevision] = useState<string>(stickyInitial.contentRevision);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bestJobsError = validateBestJobs(bestJobsPageSize);
  const listingError = validateListing(listingPageSize);
  const zaloChatUrlError = validateChatUrl(zaloChatUrl, 'zalo');
  const messengerChatUrlError = validateChatUrl(messengerChatUrl, 'messenger');
  const phoneCallNumberError = validatePhoneNumber(phoneCallNumber);
  const stickyMessageError =
    stickyMessage.length > 280 ? 'Nội dung thông báo tối đa 280 ký tự.' : null;
  const stickyCtaLabelError =
    stickyCtaLabel.length > 60 ? 'Nhãn nút hành động tối đa 60 ký tự.' : null;
  const stickyCtaUrlError = validateCtaUrl(stickyCtaUrl);
  const hasFieldError =
    bestJobsError !== null ||
    listingError !== null ||
    zaloChatUrlError !== null ||
    messengerChatUrlError !== null ||
    phoneCallNumberError !== null ||
    stickyMessageError !== null ||
    stickyCtaLabelError !== null ||
    stickyCtaUrlError !== null;

  const hasChanges =
    bestJobsPageSize !== savedSnapshot.bestJobsPageSize ||
    listingPageSize !== savedSnapshot.listingPageSize ||
    zaloChatUrl !== (savedSnapshot.zaloChatUrl ?? '') ||
    messengerChatUrl !== (savedSnapshot.messengerChatUrl ?? '') ||
    phoneCallNumber !== (savedSnapshot.phoneCallNumber ?? '') ||
    newsSectionEnabled !== savedSnapshot.newsSectionEnabled ||
    stickyEnabled !== savedSnapshot.stickyAnnouncement.enabled ||
    stickyMessage !== savedSnapshot.stickyAnnouncement.message ||
    stickyCtaLabel !== (savedSnapshot.stickyAnnouncement.ctaLabel ?? '') ||
    stickyCtaUrl !== (savedSnapshot.stickyAnnouncement.ctaUrl ?? '') ||
    stickyDismissible !== savedSnapshot.stickyAnnouncement.dismissible ||
    stickyBackgroundOpacity !== savedSnapshot.stickyAnnouncement.backgroundOpacity ||
    stickyTextColor !== savedSnapshot.stickyAnnouncement.textColor ||
    stickyFont !== savedSnapshot.stickyAnnouncement.font ||
    stickyEmphasis !== savedSnapshot.stickyAnnouncement.emphasis ||
    stickyAnimation !== savedSnapshot.stickyAnnouncement.animation ||
    stickyContentRevision !== savedSnapshot.stickyAnnouncement.contentRevision;

  // Clear stale success/error when user edits again.
  useEffect(() => {
    if (success || error) {
      setSuccess(null);
      setError(null);
    }
  }, [
    bestJobsPageSize,
    listingPageSize,
    zaloChatUrl,
    messengerChatUrl,
    phoneCallNumber,
    newsSectionEnabled,
    stickyEnabled,
    stickyMessage,
    stickyCtaLabel,
    stickyCtaUrl,
    stickyDismissible,
    stickyBackgroundOpacity,
    stickyTextColor,
    stickyFont,
    stickyEmphasis,
    stickyAnimation,
    stickyContentRevision,
    success,
    error,
  ]);

  function buildPayload(): Record<string, unknown> {
    const trimmedCtaUrl = stickyCtaUrl.trim();
    const trimmedCtaLabel = stickyCtaLabel.trim();
    return buildHomepageSettingsPatch({
      bestJobsPageSize,
      listingPageSize,
      zaloChatUrl,
      messengerChatUrl,
      phoneCallNumber,
      newsSectionEnabled,
      stickyAnnouncement: stickyEnabled
        ? {
            enabled: true,
            message: stickyMessage,
            ctaLabel: trimmedCtaLabel.length > 0 ? trimmedCtaLabel : null,
            ctaUrl: trimmedCtaUrl.length > 0 ? trimmedCtaUrl : null,
            dismissible: stickyDismissible,
            backgroundOpacity: stickyBackgroundOpacity,
            textColor: stickyTextColor,
            font: stickyFont,
            emphasis: stickyEmphasis,
            animation: stickyAnimation,
            contentRevision: stickyContentRevision,
          }
        : null,
    }, savedSnapshot);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (unavailableReason) {
      setError(unavailableReason);
      return;
    }

    if (hasFieldError) {
      setError(
        bestJobsError ??
          listingError ??
          zaloChatUrlError ??
          messengerChatUrlError ??
          phoneCallNumberError ??
          stickyMessageError ??
          stickyCtaLabelError ??
          stickyCtaUrlError ??
          'Có trường chưa hợp lệ.',
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/homepage-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            res.status < 500 && typeof data.message === 'string'
              ? data.message
              : 'Không thể lưu cài đặt. Vui lòng thử lại.',
          );
          return;
        }
        const data = await res.json();
        if (data?.settings) {
          setSavedSnapshot(data.settings);
          // Sync local state to the server-canonicalized values (handles clamping).
          setBestJobsPageSize(data.settings.bestJobsPageSize);
          setListingPageSize(data.settings.listingPageSize);
          setZaloChatUrl(data.settings.zaloChatUrl ?? '');
          setMessengerChatUrl(data.settings.messengerChatUrl ?? '');
          setPhoneCallNumber(data.settings.phoneCallNumber ?? '');
          setNewsSectionEnabled(data.settings.newsSectionEnabled);
          const snap = safeStickyAnnouncement(data.settings.stickyAnnouncement ?? null);
          setStickyEnabled(snap.enabled);
          setStickyMessage(snap.message);
          setStickyCtaLabel(snap.ctaLabel ?? '');
          setStickyCtaUrl(snap.ctaUrl ?? '');
          setStickyDismissible(snap.dismissible);
          setStickyBackgroundOpacity(snap.backgroundOpacity);
          setStickyTextColor(snap.textColor);
          setStickyFont(snap.font);
          setStickyEmphasis(snap.emphasis);
          setStickyAnimation(snap.animation);
          setStickyContentRevision(snap.contentRevision);
          setSuccess('Đã lưu cài đặt trang chủ và kênh liên hệ.');
        }
        router.refresh();
      } catch {
        setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
      }
    });
  }

  function handleReset() {
    setBestJobsPageSize(savedSnapshot.bestJobsPageSize);
    setListingPageSize(savedSnapshot.listingPageSize);
    setZaloChatUrl(savedSnapshot.zaloChatUrl ?? '');
    setMessengerChatUrl(savedSnapshot.messengerChatUrl ?? '');
    setPhoneCallNumber(savedSnapshot.phoneCallNumber ?? '');
    setNewsSectionEnabled(savedSnapshot.newsSectionEnabled);
    const snap = safeStickyAnnouncement(savedSnapshot.stickyAnnouncement ?? null);
    setStickyEnabled(snap.enabled);
    setStickyMessage(snap.message);
    setStickyCtaLabel(snap.ctaLabel ?? '');
    setStickyCtaUrl(snap.ctaUrl ?? '');
    setStickyDismissible(snap.dismissible);
    setStickyBackgroundOpacity(snap.backgroundOpacity);
    setStickyTextColor(snap.textColor);
    setStickyFont(snap.font);
    setStickyEmphasis(snap.emphasis);
    setStickyAnimation(snap.animation);
    setStickyContentRevision(snap.contentRevision);
    setError(null);
    setSuccess(null);
  }

  function handlePublish() {
    // Bump the content revision so prior user dismissals no longer suppress
    // the new bar. The server stores the new value on next save.
    setStickyContentRevision((prev) => nextContentRevision(prev));
  }

  return (
    <div style={{ background: 'var(--surface)' }} className="px-6 py-8 lg:px-8">
      <div className="mb-6">
        <h1 style={{ color: 'var(--on-surface)' }} className="text-2xl font-semibold">
          Cài đặt
        </h1>
        <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-sm">
          Cấu hình hệ thống. Nhóm cài đặt trang chủ bên dưới đã có hiệu lực; các nhóm khác sẽ sớm khả dụng.
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
              background: 'var(--secondary-container)',
              color: 'var(--on-secondary-container)',
              borderColor: 'var(--warning)',
            }}
          >
            {unavailableReason} Các giá trị mặc định bên dưới chỉ để tham khảo.
          </div>
        )}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 style={{ color: 'var(--on-surface)' }} className="text-base font-semibold">
              Cài đặt trang chủ
            </h2>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 text-xs">
              Thay đổi tại đây có hiệu lực trên trang chủ sau khi lưu.
            </p>
          </div>
          <span
            style={{
              background: 'var(--secondary-container)',
              color: 'var(--on-secondary-container)',
            }}
            className="rounded-full px-2 py-0.5 text-xs font-medium"
          >
            AV1 · ĐANG HOẠT ĐỘNG
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

          <div className="sm:col-span-2">
            <label htmlFor="stickyBackgroundOpacity" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
              Độ trong suốt nền
            </label>
            <div className="flex items-center gap-4">
              <input
                id="stickyBackgroundOpacity"
                type="range"
                min={0}
                max={100}
                step={1}
                value={stickyBackgroundOpacity}
                onChange={(e) => setStickyBackgroundOpacity(Number(e.target.value))}
                aria-valuetext={`${stickyBackgroundOpacity}%`}
                className="hrp-focus min-h-11 flex-1 accent-[var(--color-primary)]"
                data-testid="sticky-background-opacity-input"
              />
              <output
                htmlFor="stickyBackgroundOpacity"
                className="w-12 text-right text-sm tabular-nums"
                style={{ color: 'var(--on-surface)' }}
                data-testid="sticky-background-opacity-value"
              >
                {stickyBackgroundOpacity}%
              </output>
            </div>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
              Chỉ làm trong suốt nền; nội dung và nút vẫn rõ. Mặc định 100%.
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

        <div
          className="mt-6 border-t pt-6"
          style={{ borderColor: 'var(--outline-variant)' }}
        >
          <div className="mb-4">
            <h3 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">
              Kênh liên hệ công khai
            </h3>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
              Để trống để ẩn kênh tương ứng. Số điện thoại và URL đều được kiểm tra trước khi hiển thị.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <label htmlFor="phoneCallNumber" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Số điện thoại
              </label>
              <input
                id="phoneCallNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneCallNumber}
                onChange={(event) => setPhoneCallNumber(event.target.value)}
                disabled={Boolean(unavailableReason)}
                placeholder="0901234567 hoặc +84901234567"
                aria-invalid={phoneCallNumberError !== null}
                aria-describedby="phoneCallNumber-help phoneCallNumber-error"
                className="hrp-focus min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{
                  borderColor: phoneCallNumberError ? 'var(--error)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                data-testid="phoneCallNumber-input"
              />
              <p id="phoneCallNumber-help" style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                7–15 chữ số; có thể dùng mã quốc gia với dấu +.
              </p>
              {phoneCallNumberError && (
                <p id="phoneCallNumber-error" role="alert" style={{ color: 'var(--error)' }} className="mt-1 text-xs font-medium">
                  {phoneCallNumberError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="zaloChatUrl" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                URL Zalo OA
              </label>
              <input
                id="zaloChatUrl"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={zaloChatUrl}
                onChange={(event) => setZaloChatUrl(event.target.value)}
                disabled={Boolean(unavailableReason)}
                placeholder="https://zalo.me/oa-id"
                aria-invalid={zaloChatUrlError !== null}
                aria-describedby="zaloChatUrl-help zaloChatUrl-error"
                className="hrp-focus min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{
                  borderColor: zaloChatUrlError ? 'var(--error)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                data-testid="zaloChatUrl-input"
              />
              <p id="zaloChatUrl-help" style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Cho phép: zalo.me, oa.zalo.me hoặc chat.zalo.me.
              </p>
              {zaloChatUrlError && (
                <p id="zaloChatUrl-error" role="alert" style={{ color: 'var(--error)' }} className="mt-1 text-xs font-medium">
                  {zaloChatUrlError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="messengerChatUrl" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                URL Trang Messenger
              </label>
              <input
                id="messengerChatUrl"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={messengerChatUrl}
                onChange={(event) => setMessengerChatUrl(event.target.value)}
                disabled={Boolean(unavailableReason)}
                placeholder="https://m.me/page-id"
                aria-invalid={messengerChatUrlError !== null}
                aria-describedby="messengerChatUrl-help messengerChatUrl-error"
                className="hrp-focus min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                style={{
                  borderColor: messengerChatUrlError ? 'var(--error)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                data-testid="messengerChatUrl-input"
              />
              <p id="messengerChatUrl-help" style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Cho phép: m.me, messenger.com hoặc www.messenger.com.
              </p>
              {messengerChatUrlError && (
                <p id="messengerChatUrl-error" role="alert" style={{ color: 'var(--error)' }} className="mt-1 text-xs font-medium">
                  {messengerChatUrlError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── UI2 / Phase B — News section toggle ───────────────────────── */}
        <div
          className="mt-6 border-t pt-6"
          style={{ borderColor: 'var(--outline-variant)' }}
          data-testid="ui2-news-section-block"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">
                Tin tức &amp; Cẩm nang
              </h3>
              <p style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 text-xs">
                Khi tắt, mục &quot;Tin tức&quot; sẽ ẩn khỏi điều hướng và trang chủ. Dữ liệu bài viết vẫn được giữ nguyên.
              </p>
            </div>
            <span
              style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
            >
              NỘI DUNG TRANG CHỦ
            </span>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={newsSectionEnabled}
              onChange={(e) => setNewsSectionEnabled(e.target.checked)}
              disabled={Boolean(unavailableReason)}
              className="hrp-focus mt-1 h-4 w-4 rounded border"
              data-testid="news-section-toggle"
            />
            <span>
              <span style={{ color: 'var(--on-surface)' }} className="block text-sm font-medium">
                Hiển thị &quot;Tin tức &amp; Cẩm nang&quot; trên trang chủ công khai
              </span>
              <span style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 block text-xs">
                Mặc định BẬT để giữ nguyên hành vi hiện tại.
              </span>
            </span>
          </label>
        </div>

        {/* ── UI2 / Phase B — Sticky bottom announcement ────────────────── */}
        <div
          className="mt-6 border-t pt-6"
          style={{ borderColor: 'var(--outline-variant)' }}
          data-testid="ui2-sticky-announcement-block"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">
                Thông báo cuối trang
              </h3>
              <p style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 text-xs">
                Thanh thông báo cố định ở cuối màn hình. Nút hành động chỉ hỗ trợ đường dẫn nội bộ hoặc HTTPS.
              </p>
            </div>
            <span
              style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
            >
              THÔNG BÁO CỐ ĐỊNH
            </span>
          </div>

          <label className="mb-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={stickyEnabled}
              onChange={(e) => setStickyEnabled(e.target.checked)}
              disabled={Boolean(unavailableReason)}
              className="hrp-focus mt-1 h-4 w-4 rounded border"
              data-testid="sticky-enabled-toggle"
            />
            <span>
              <span style={{ color: 'var(--on-surface)' }} className="block text-sm font-medium">
                Bật thanh thông báo
              </span>
              <span style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 block text-xs">
                Khi tắt, thanh thông báo và nút hành động sẽ không hiển thị trên trang công khai.
              </span>
            </span>
          </label>

          <fieldset
            disabled={!stickyEnabled || Boolean(unavailableReason)}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label htmlFor="stickyMessage" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Nội dung thông báo
              </label>
              <textarea
                id="stickyMessage"
                rows={2}
                maxLength={280}
                value={stickyMessage}
                onChange={(e) => setStickyMessage(e.target.value)}
                aria-invalid={stickyMessageError !== null}
                aria-describedby="stickyMessage-help stickyMessage-error"
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{
                  borderColor: stickyMessageError ? 'var(--error)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                data-testid="sticky-message-input"
              />
              <p id="stickyMessage-help" style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Tối đa 280 ký tự. Chỉ hỗ trợ văn bản thường, không có định dạng nâng cao.
              </p>
              {stickyMessageError && (
                <p id="stickyMessage-error" role="alert" style={{ color: 'var(--error)' }} className="mt-1 text-xs font-medium">
                  {stickyMessageError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="stickyCtaLabel" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Nhãn nút hành động
              </label>
              <input
                id="stickyCtaLabel"
                type="text"
                maxLength={60}
                value={stickyCtaLabel}
                onChange={(e) => setStickyCtaLabel(e.target.value)}
                aria-invalid={stickyCtaLabelError !== null}
                aria-describedby="stickyCtaLabel-help stickyCtaLabel-error"
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{
                  borderColor: stickyCtaLabelError ? 'var(--error)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                data-testid="sticky-cta-label-input"
              />
              <p id="stickyCtaLabel-help" style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Để trống nếu không cần nút hành động.
              </p>
              {stickyCtaLabelError && (
                <p id="stickyCtaLabel-error" role="alert" style={{ color: 'var(--error)' }} className="mt-1 text-xs font-medium">
                  {stickyCtaLabelError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="stickyCtaUrl" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Đường dẫn nút hành động
              </label>
              <input
                id="stickyCtaUrl"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={stickyCtaUrl}
                onChange={(e) => setStickyCtaUrl(e.target.value)}
                aria-invalid={stickyCtaUrlError !== null}
                aria-describedby="stickyCtaUrl-help stickyCtaUrl-error"
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{
                  borderColor: stickyCtaUrlError ? 'var(--error)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                data-testid="sticky-cta-url-input"
              />
              <p id="stickyCtaUrl-help" style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Dùng đường dẫn nội bộ (ví dụ /viec-lam) hoặc địa chỉ HTTPS.
              </p>
              {stickyCtaUrlError && (
                <p id="stickyCtaUrl-error" role="alert" style={{ color: 'var(--error)' }} className="mt-1 text-xs font-medium">
                  {stickyCtaUrlError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="stickyTextColor" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Màu chữ
              </label>
              <select
                id="stickyTextColor"
                value={stickyTextColor}
                onChange={(e) => setStickyTextColor(e.target.value as StickyTextColor)}
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                data-testid="sticky-text-color-select"
              >
                {STICKY_TEXT_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {STICKY_TEXT_COLOR_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stickyFont" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Kiểu chữ
              </label>
              <select
                id="stickyFont"
                value={stickyFont}
                onChange={(e) => setStickyFont(e.target.value as StickyFont)}
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                data-testid="sticky-font-select"
              >
                {STICKY_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {STICKY_FONT_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stickyEmphasis" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Độ đậm
              </label>
              <select
                id="stickyEmphasis"
                value={stickyEmphasis}
                onChange={(e) => setStickyEmphasis(e.target.value as StickyEmphasis)}
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                data-testid="sticky-emphasis-select"
              >
                {STICKY_EMPHASIS.map((em) => (
                  <option key={em} value={em}>
                    {STICKY_EMPHASIS_LABELS[em]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stickyAnimation" className="mb-1 block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Hiệu ứng
              </label>
              <select
                id="stickyAnimation"
                value={stickyAnimation}
                onChange={(e) => setStickyAnimation(e.target.value as StickyAnimation)}
                className="hrp-focus w-full rounded-lg border bg-white px-3 py-2 text-sm min-h-11"
                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                data-testid="sticky-animation-select"
              >
                {STICKY_ANIMATIONS.map((a) => (
                  <option key={a} value={a}>
                    {STICKY_ANIMATION_LABELS[a]}
                  </option>
                ))}
              </select>
              <p style={{ color: 'var(--on-surface-variant)' }} className="mt-1 text-xs">
                Hiệu ứng nhấp nháy và chạy chữ tự tắt khi thiết bị bật chế độ giảm chuyển động.
              </p>
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={stickyDismissible}
                  onChange={(e) => setStickyDismissible(e.target.checked)}
                  className="hrp-focus mt-1 h-4 w-4 rounded border"
                  data-testid="sticky-dismissible-toggle"
                />
                <span>
                  <span style={{ color: 'var(--on-surface)' }} className="block text-sm font-medium">
                    Cho phép người dùng đóng thanh
                  </span>
                  <span style={{ color: 'var(--on-surface-variant)' }} className="mt-0.5 block text-xs">
                    Người dùng đã đóng sẽ thấy lại thông báo khi nội dung được đăng lại.
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!stickyEnabled || Boolean(unavailableReason)}
                style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
                className="hrp-focus inline-flex items-center gap-2 rounded-lg border border-[var(--outline-variant)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
                data-testid="sticky-publish-button"
              >
                Hiển thị lại thông báo
              </button>
            </div>

            <p style={{ color: 'var(--on-surface-variant)' }} className="sm:col-span-2 text-xs">
              Phiên bản thông báo hiện tại
            </p>
          </fieldset>
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
              ? 'Chưa thể chỉnh sửa vì dữ liệu cài đặt chưa sẵn sàng.'
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
            {actionLabel('save')}
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
          Phiên bản hệ thống HRP <span className="font-mono text-xs">v1.0.0</span> — Các nhóm cài đặt chi tiết khác đang được phát triển.
        </p>
      </div>
    </div>
  );
}
