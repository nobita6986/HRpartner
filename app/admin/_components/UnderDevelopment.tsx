/**
 * UnderDevelopment — placeholder cho route mà Chợ việc làm hiện tại chưa mở
 * trong giai đoạn vận hành. Component này dùng chung cho mọi trang `disabled`
 * trong sidebar admin (vd. Chính sách hoa hồng, Sổ cái hoa hồng).
 *
 * Quyết định thiết kế:
 * - Server Component (không cần state, không cần client interaction). Đây là
 *   phần render thuần túy; nút quay lại là native anchor `<a>` thay vì
 *   `next/link` để tương thích với cả layout không có client provider.
 * - Tiêu đề + mô tả cố định theo chỉ đạo Owner; không tham số hóa nội dung
 *   để tránh trôi message.
 * - Layout dùng `surface` / `on-surface` / `outline` tokens đã có để khớp với
 *   các trang admin khác, không hardcode màu mới.
 */
import * as React from 'react';

export interface UnderDevelopmentProps {
  /**
   * Mục đích chính của trang (vd. "Chính sách hoa hồng"). Hiển thị phụ đề
   * phía dưới tiêu đề chính để người dùng biết họ đang mở đúng chỗ.
   */
  feature?: string;
  /**
   * Đường dẫn quay lại. Mặc định là `/admin` (Tổng quan).
   */
  backHref?: string;
}

export function UnderDevelopment({
  feature,
  backHref = '/admin',
}: UnderDevelopmentProps): React.ReactElement {
  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--surface)' }}
      data-under-development="true"
    >
      <div className="max-w-2xl mx-auto mt-12">
        <div
          className="rounded-lg p-8"
          style={{
            backgroundColor: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline)',
          }}
        >
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--on-surface)' }}
            data-testid="under-development-title"
          >
            Tính năng đang phát triển
          </h1>
          {feature ? (
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
              data-testid="under-development-feature"
            >
              {feature}
            </p>
          ) : null}
          <p
            className="mt-4 text-base leading-relaxed"
            style={{ color: 'var(--on-surface-variant)' }}
            data-testid="under-development-body"
          >
            Chức năng này chưa được mở trong giai đoạn vận hành Chợ việc làm hiện tại.
          </p>
          <div className="mt-8">
            <a
              href={backHref}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary, white)',
              }}
              data-testid="under-development-back"
            >
              ← Quay lại Tổng quan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
