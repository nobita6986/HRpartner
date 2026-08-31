'use client';

/**
 * success-modal.tsx — go-live-12 / RQ-09 / DEC-04.
 *
 * Tách nguyên trạng khỏi `app/(portal)/page.tsx` cùng với `ApplyModal`: sau khi nộp đơn từ trang
 * chi tiết, người dùng phải thấy ĐÚNG hộp thoại đã có trên `/`, cùng mã tra cứu, cùng hai nút sao
 * chép, cùng thông báo `aria-live`. Giữ hành vi từng dòng, kể cả nhánh fallback `execCommand` cho
 * WebView cũ và trạng thái `copyError`.
 */
import { useState } from 'react';
import { CANONICAL_ORIGIN } from '@/src/shared/routing/portal-landing';

const TRACKING_URL = `${CANONICAL_ORIGIN}/track`;

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback cho WebView/trình duyệt cũ chưa hỗ trợ Clipboard API.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('Clipboard unavailable');
}

export function SuccessModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState<'code' | 'url' | null>(null);
  const [copyError, setCopyError] = useState(false);

  async function handleCopy(target: 'code' | 'url', value: string) {
    try {
      await copyTextToClipboard(value);
      setCopied(target);
      setCopyError(false);
    } catch {
      setCopied(null);
      setCopyError(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="w-full max-w-sm rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)' }}>
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-success-soft)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-on-surface)' }}>
          Đơn ứng tuyển đã được gửi!
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>
          Vui lòng lưu lại mã này để tra cứu trạng thái hồ sơ. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.
        </p>

        <div
          className="mb-5 space-y-3 rounded-xl p-3 text-left"
          style={{ backgroundColor: 'var(--color-surface-variant)', border: '1px solid var(--color-outline-variant)' }}
        >
          {code && (
            <div>
              <p className="mb-1 text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                Mã tra cứu
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm font-semibold select-all" style={{ color: 'var(--color-on-surface)' }}>
                  {code}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy('code', code)}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                  aria-label="Sao chép mã tra cứu"
                >
                  {copied === 'code' ? 'Đã sao chép' : 'Sao chép mã'}
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
              Trang tra cứu
            </p>
            <div className="flex items-center gap-2">
              <a
                href="/track"
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 break-all text-sm underline underline-offset-2"
                style={{ color: 'var(--color-primary)' }}
              >
                {TRACKING_URL}
              </a>
              <button
                type="button"
                onClick={() => handleCopy('url', TRACKING_URL)}
                className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                aria-label="Sao chép đường dẫn tra cứu"
              >
                {copied === 'url' ? 'Đã sao chép' : 'Sao chép link'}
              </button>
            </div>
          </div>
        </div>

        <p className="min-h-5 text-xs" role="status" aria-live="polite" style={{ color: copyError ? 'var(--color-error)' : 'var(--color-success)' }}>
          {copyError
            ? 'Không thể tự động sao chép. Vui lòng nhấn giữ nội dung để sao chép.'
            : copied === 'code'
              ? 'Đã sao chép mã tra cứu.'
              : copied === 'url'
                ? 'Đã sao chép đường dẫn tra cứu.'
                : ''}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 px-6 py-2.5 rounded-lg font-semibold"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
