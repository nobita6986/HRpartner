/**
 * employer-sidebar.tsx — UI04d D.A
 *
 * Sidebar thông tin đơn vị tuyển dụng: tên công ty (project.name), địa chỉ,
 * map link. source: REAL dùng PublicJobDetailDto.
 */
import type { EmployerSidebarContent } from '../../public-types';

export function EmployerSidebar({ content }: { content: EmployerSidebarContent }) {
  if (!content.enabled) return null;

  return (
    <aside
      data-section="employer-sidebar"
      data-source={content.source}
      aria-label="Đơn vị tuyển dụng"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        Đơn vị tuyển dụng
      </h3>

      <div className="flex items-start gap-3 mb-3">
        {content.logoUrl ? (
          <img
            src={content.logoUrl}
            alt=""
            className="w-12 h-12 rounded object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div
            className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-surface-container)' }}
            aria-label="Logo đang cập nhật"
          >
            <span
              className="material-symbols-outlined text-xl"
              aria-hidden="true"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              factory
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
            {content.companyName}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
        <span className="material-symbols-outlined text-base flex-shrink-0" aria-hidden="true">
          location_on
        </span>
        <span>{content.address}</span>
      </div>

      {content.mapUrl && (
        <a
          href={content.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium mt-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--color-primary-dark)' }}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            map
          </span>
          Xem trên bản đồ
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            open_in_new
          </span>
        </a>
      )}
    </aside>
  );
}
