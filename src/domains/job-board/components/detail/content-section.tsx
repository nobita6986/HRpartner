/**
 * content-section.tsx — UI04d D.A
 *
 * Generic content section dùng cho introduction, requirements,
 * apply-instructions, ctv-info. Render mảng StructuredContent[].
 */
import type { ContentSectionContent, CtvInfoSectionContent } from '../../public-types';
import { StructuredContentRenderer } from './structured-content';

export function ContentSection({ content }: { content: ContentSectionContent }) {
  if (!content.enabled) return null;
  return (
    <section
      data-section={`content-${content.id}`}
      data-source={content.source}
      aria-label={content.title}
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        {content.title}
      </h2>
      <StructuredContentRenderer blocks={content.blocks} />
    </section>
  );
}

export function CtvInfoSection({
  content,
  visible,
}: {
  content: CtvInfoSectionContent;
  visible: boolean;
}) {
  if (!content.enabled || !visible) return null;
  return (
    <section
      data-section="ctv-info"
      data-source={content.source}
      aria-label={content.title}
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface-container-low)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        {content.title}
      </h2>
      <StructuredContentRenderer blocks={content.blocks} />
    </section>
  );
}
