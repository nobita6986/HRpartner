/**
 * benefits-section.tsx — UI04d D.A
 *
 * Render BenefitItem list (kèm bonus items) cho trang chi tiết. source:
 * REAL | INTEGRATION_PENDING. Khi INTEGRATION_PENDING → render skeleton.
 */
import type { BenefitItem, SalarySectionContent } from '../../public-types';

export function BenefitsSection({ content }: { content: SalarySectionContent }) {
  if (!content.enabled) return null;

  if (content.source === 'INTEGRATION_PENDING') {
    return <BenefitsSkeleton />;
  }

  return (
    <section
      data-section="benefits"
      data-source={content.source}
      aria-label="Lương thưởng và phúc lợi"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        Lương thưởng và phúc lợi
      </h2>

      <div className="mb-4 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        Loại lương: <strong>{salaryTypeLabel(content.salaryType)}</strong>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {content.benefitItems.map((item, idx) => (
          <BenefitCard key={idx} item={item} />
        ))}
      </div>

      <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: 'var(--color-on-surface)' }}>
        Thưởng
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {content.bonusItems.map((item, idx) => (
          <BenefitCard key={idx} item={item} />
        ))}
      </div>
    </section>
  );
}

function BenefitCard({ item }: { item: BenefitItem }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border"
      style={{
        backgroundColor: 'var(--color-surface-container-low)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <span
        className="material-symbols-outlined text-xl flex-shrink-0"
        aria-hidden="true"
        style={{ color: 'var(--color-primary-dark)' }}
      >
        {item.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
            {item.title}
          </h4>
          {item.value && (
            <span
              className="text-xs font-semibold whitespace-nowrap"
              style={{ color: 'var(--color-primary-dark)' }}
            >
              {item.value}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

function BenefitsSkeleton() {
  return (
    <section
      data-section="benefits"
      data-source="INTEGRATION_PENDING"
      aria-label="Lương thưởng và phúc lợi"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        Lương thưởng và phúc lợi
      </h2>
      <div
        className="h-20 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface-container-low)' }}
        aria-label="Đang cập nhật"
      />
    </section>
  );
}

function salaryTypeLabel(type: 'BASIC' | 'EXPECTED' | 'NEGOTIABLE'): string {
  if (type === 'BASIC') return 'Lương cơ bản';
  if (type === 'EXPECTED') return 'Lương dự kiến';
  return 'Lương thương lượng';
}
