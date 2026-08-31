'use client';

/**
 * detail-apply-cta.tsx — go-live-12 / RQ-07 / DEC-04, DEC-13, DEC-14.
 *
 * Nút Ứng tuyển của trang chi tiết `/viec-lam/{code}`. Đảo client nhỏ nhất có thể: trang là Server
 * Component nên phần duy nhất cần state (mở form, giữ mã tra cứu) được tách ra đây, còn toàn bộ
 * phần đọc DB và render dữ liệu vẫn chạy trên server.
 *
 * Dùng lại ĐÚNG `ApplyModal` và `SuccessModal` đã tách ở `RQ-09`: một form, một endpoint canonical,
 * một map lỗi, một màn thành công kèm mã tra cứu. Không có `fetch` nào ở file này — mọi lời gọi
 * mạng vẫn nằm trong `ApplyModal`, nên trang chi tiết không thể lệch khỏi `/` về hợp đồng nộp đơn.
 *
 * `DEC-13`: trên màn hình hẹp nút nằm trong thanh dính cạnh dưới, trên màn hình rộng nút nằm trong
 * luồng nội dung. Hai chỗ đặt dùng CHUNG một hàm render nên nhãn, trạng thái và handler không thể
 * lệch nhau. Ẩn/hiện bằng `hidden`/`sm:hidden` (tức `display`) chứ không bằng `opacity`: phần tử
 * `display:none` rời khỏi cây trợ năng, nên không bao giờ có hai nút cùng nhãn được đọc lên.
 *
 * `DEC-14`: hết chỗ thì nút vô hiệu với ĐÚNG nhãn đang dùng trên card ở `/`, trang vẫn mở `200`.
 */
import { useState } from 'react';
import { ApplyModal, type ApplyModalJob } from './apply-modal';
import { SuccessModal } from './success-modal';

/** Đúng ba nhãn của nút trên card `/` — cùng thứ tự ưu tiên: hết chỗ, đã nộp, còn nhận. */
const LABEL_FULL = 'Đã đủ chỉ tiêu';
const LABEL_APPLIED = 'Đã ứng tuyển';
const LABEL_APPLY = 'Ứng tuyển';

export function DetailApplyCta({ job, isFull }: { job: ApplyModalJob; isFull: boolean }) {
  const [formOpen, setFormOpen] = useState(false);
  const [successCode, setSuccessCode] = useState('');
  const [applied, setApplied] = useState(false);

  const disabled = isFull || applied;
  const label = isFull ? LABEL_FULL : applied ? LABEL_APPLIED : LABEL_APPLY;

  /** Một nguồn cho cả nút trong luồng và nút trong thanh dính. */
  const button = (extraClassName: string) => (
    <button
      type="button"
      onClick={() => setFormOpen(true)}
      disabled={disabled}
      className={`font-semibold px-6 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${extraClassName}`}
      style={
        isFull
          ? { backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)', cursor: 'not-allowed' }
          : applied
            ? { backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)', cursor: 'default' }
            : { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }
      }
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Màn hình rộng: nút nằm trong luồng nội dung. */}
      <div className="hidden sm:flex items-center gap-3">
        {button('')}
        {isFull && (
          <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
            Việc làm này đã đủ chỉ tiêu. Bạn có thể xem các việc làm khác đang tuyển.
          </span>
        )}
      </div>

      {/* Màn hình hẹp: chừa chỗ để thanh dính không che nội dung cuối trang. */}
      <div className="h-20 sm:hidden" aria-hidden="true" />
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3 sm:hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
      >
        {button('w-full')}
      </div>

      {formOpen && (
        <ApplyModal
          job={job}
          onClose={() => setFormOpen(false)}
          onSuccess={(code) => {
            setFormOpen(false);
            setApplied(true);
            setSuccessCode(code);
          }}
        />
      )}

      {successCode && <SuccessModal code={successCode} onClose={() => setSuccessCode('')} />}
    </>
  );
}
