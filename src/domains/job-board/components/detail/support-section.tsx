/**
 * support-section.tsx — UI04d D.A
 *
 * Section hỗ trợ từ HRP. source: DEMO.
 */
import type { SupportSectionContent } from '../../public-types';

export function SupportSection({ content }: { content: SupportSectionContent }) {
  if (!content.enabled) return null;

  return (
    <section
      data-section="support"
      data-source={content.source}
      aria-label="Hỗ trợ từ HRP"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        Hỗ trợ từ HRP
      </h2>
      <ul className="flex flex-col gap-2">
        {content.items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-3 p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-surface-container-low)',
              borderColor: 'var(--color-outline-variant)',
              opacity: item.available ? 1 : 0.6,
            }}
          >
            <span
              className="material-symbols-outlined text-xl flex-shrink-0"
              aria-hidden="true"
              style={{ color: item.available ? 'var(--color-primary-dark)' : 'var(--color-on-surface-variant)' }}
            >
              {item.icon}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                  {item.label}
                </h4>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={
                    item.available
                      ? { color: 'var(--color-primary-dark)', backgroundColor: 'var(--color-primary-soft)' }
                      : { color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container-high)' }
                  }
                >
                  {item.available ? 'Có hỗ trợ' : 'Tùy vị trí'}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
