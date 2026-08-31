'use client';

/**
 * apply-modal.tsx — go-live-12 / RQ-09 / DEC-04.
 *
 * Tách nguyên trạng khỏi `app/(portal)/page.tsx` để trang chi tiết `/viec-lam/{code}` dùng lại
 * đúng một form, đúng một endpoint canonical, đúng một map lỗi. Giữ hành vi từng dòng: cùng danh
 * sách props, cùng chuỗi tiếng Việt, cùng thứ tự và ràng buộc field, cùng cách sinh idempotency
 * key theo payload.
 *
 * `'use client'` là bắt buộc, không phải trang trí: trang chi tiết là Server Component và không
 * import được component có state nếu module không tự khai báo biên client.
 */
import { useState, useEffect } from 'react';

/** Đúng hai trường mà form cần. `EnrichedJob` của `/` thỏa cấu trúc này nên call site cũ không đổi. */
export interface ApplyModalJob {
  /** `PublicJobDto.slug` (= `project.code`) — khóa của canonical apply endpoint. */
  slug: string;
  title: string;
}

interface ApplyFormData {
  fullName: string;
  phone: string;
  cccdNumber: string;
}

// OPS-06A / RQ-07: landing page dùng ĐÚNG canonical apply contract
// (slug-keyed + idempotency key + consent), không còn gọi legacy POST /api/jobs.
const APPLY_ERRORS: Record<string, string> = {
  DUPLICATE_APPLICATION: 'Bạn đã ứng tuyển vị trí này rồi. Hãy dùng mã tra cứu để xem trạng thái.',
  JOB_NOT_AVAILABLE: 'Vị trí này hiện không còn nhận hồ sơ.',
  CONSENT_REQUIRED: 'Vui lòng đồng ý cho phép xử lý thông tin.',
  IDEMPOTENCY_PAYLOAD_MISMATCH: 'Thông tin đã thay đổi so với lần gửi trước, vui lòng gửi lại.',
  IDEMPOTENCY_KEY_REQUIRED: 'Không thể gửi đơn, vui lòng tải lại trang.',
  VALIDATION: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  INVALID_INPUT: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  RATE_LIMITED: 'Bạn gửi quá nhiều lần. Vui lòng thử lại sau ít phút.',
  RATE_LIMIT_UNAVAILABLE: 'Hệ thống đang tạm thời quá tải. Vui lòng thử lại sau ít phút.',
  PAYLOAD_TOO_LARGE: 'Dữ liệu gửi lên quá lớn. Vui lòng rút ngắn thông tin.',
  APPLY_ENDPOINT_RETIRED: 'Không thể gửi đơn, vui lòng tải lại trang.',
};

export function ApplyModal({
  job,
  onClose,
  onSuccess,
}: {
  job: ApplyModalJob;
  onClose: () => void;
  onSuccess: (code: string) => void;
}) {
  const [form, setForm] = useState<ApplyFormData>({ fullName: '', phone: '', cccdNumber: '' });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Một idempotency key cho mỗi payload: retry y nguyên sẽ replay server-side,
  // sửa thông tin rồi gửi lại được coi là đơn mới (MP-2 DEC-03/04).
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setIdemKey(crypto.randomUUID());
  }, [form.fullName, form.phone, form.cccdNumber, consent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (!consent) {
      setError('Vui lòng đồng ý cho phép xử lý thông tin trước khi gửi.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/public/jobs/${encodeURIComponent(job.slug)}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'idempotency-key': idemKey },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          cccdNumber: form.cccdNumber.trim() || null,
          consent: true,
        }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const code = typeof data?.error === 'string' ? data.error : '';
        throw new Error(
          APPLY_ERRORS[code] ?? (typeof data?.message === 'string' ? data.message : 'Có lỗi xảy ra'),
        );
      }
      // Chỉ báo thành công sau khi server trả 201 + tracking code.
      onSuccess(String(data.trackingCode ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-on-surface)' }}>
            Ứng tuyển: {job.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Họ và tên <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border"
              style={{ borderColor: 'var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Số điện thoại <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border"
              style={{ borderColor: 'var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
              placeholder="0912345678"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Số CCCD
            </label>
            <input
              type="text"
              value={form.cccdNumber}
              onChange={(e) => setForm((f) => ({ ...f, cccdNumber: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border"
              style={{ borderColor: 'var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
              placeholder="123456789012"
              maxLength={12}
            />
          </div>
          <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>Tôi đồng ý cho phép thu thập và xử lý thông tin cá nhân phục vụ mục đích tuyển dụng.</span>
          </label>
          {error && (
            <p className="text-sm" role="alert" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {loading ? 'Đang gửi...' : 'Gửi đơn ứng tuyển'}
          </button>
        </form>
      </div>
    </div>
  );
}
