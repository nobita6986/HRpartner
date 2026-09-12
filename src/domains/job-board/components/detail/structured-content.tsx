/**
 * structured-content.tsx — UI04d D.A
 *
 * Render mảng `StructuredContent[]` thành React elements. Không dùng
 * inline HTML markup; mỗi block render bằng React element phù hợp.
 */
import type { StructuredContent } from '../../public-types';

export function StructuredContentRenderer({ blocks }: { blocks: StructuredContent[] }) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <StructuredBlock key={index} block={block} />
      ))}
    </div>
  );
}

function StructuredBlock({ block }: { block: StructuredContent }) {
  if (block.type === 'heading') {
    const className = headingClass(block.level);
    const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
    return (
      <Tag
        className={className}
        style={{ color: 'var(--color-on-surface)' }}
      >
        {block.text}
      </Tag>
    );
  }
  if (block.type === 'paragraph') {
    return (
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {block.text}
      </p>
    );
  }
  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    const listClass = block.ordered
      ? 'list-decimal list-inside flex flex-col gap-1.5 text-sm'
      : 'list-disc list-inside flex flex-col gap-1.5 text-sm';
    return (
      <ListTag
        className={listClass}
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {block.items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ListTag>
    );
  }
  if (block.type === 'callout') {
    const calloutStyles = calloutStyle(block.variant);
    return (
      <div
        className="rounded-lg border p-3 text-sm"
        style={calloutStyles}
      >
        <span className="material-symbols-outlined text-base align-middle mr-1" aria-hidden="true">
          {calloutIcon(block.variant)}
        </span>
        {block.text}
      </div>
    );
  }
  return null;
}

function headingClass(level: 2 | 3 | 4): string {
  if (level === 2) return 'text-lg font-bold';
  if (level === 3) return 'text-base font-semibold';
  return 'text-sm font-semibold';
}

function calloutIcon(variant: 'info' | 'warning' | 'success'): string {
  if (variant === 'info') return 'info';
  if (variant === 'warning') return 'warning';
  return 'check_circle';
}

function calloutStyle(variant: 'info' | 'warning' | 'success'): React.CSSProperties {
  const baseBorder = 'var(--color-outline-variant)';
  if (variant === 'info') {
    return {
      backgroundColor: 'var(--color-primary-soft)',
      borderColor: baseBorder,
      color: 'var(--color-primary-dark)',
    };
  }
  if (variant === 'warning') {
    return {
      backgroundColor: 'var(--color-surface-container-high)',
      borderColor: baseBorder,
      color: 'var(--color-on-surface)',
    };
  }
  return {
    backgroundColor: 'var(--color-surface-container-low)',
    borderColor: baseBorder,
    color: 'var(--color-on-surface)',
  };
}
