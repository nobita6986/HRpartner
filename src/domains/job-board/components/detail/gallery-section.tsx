/**
 * gallery-section.tsx — UI04d D.A
 *
 * Gallery section cho detail page. source: REAL | INTEGRATION_PENDING.
 * Khi INTEGRATION_PENDING → render skeleton với placeholder image.
 */
import type { GallerySectionContent, MediaItem } from '../../public-types';

export function GallerySection({ content }: { content: GallerySectionContent }) {
  if (!content.enabled) return null;

  if (content.source === 'INTEGRATION_PENDING' || content.media.length === 0) {
    return <GallerySkeleton />;
  }

  return <RealGallery media={content.media} />;
}

function GallerySkeleton() {
  return (
    <section
      data-section="gallery"
      data-source="INTEGRATION_PENDING"
      aria-label="Thư viện ảnh"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        Thư viện ảnh
      </h2>
      <div
        className="aspect-[16/9] rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-container-low)' }}
        aria-label="Ảnh placeholder đang cập nhật"
      >
        <span
          className="material-symbols-outlined text-4xl"
          aria-hidden="true"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          image
        </span>
      </div>
    </section>
  );
}

function RealGallery({ media }: { media: MediaItem[] }) {
  const cover = media.find((m) => m.cover) ?? media[0];
  const others = media.filter((m) => m.id !== cover.id).slice(0, 3);

  return (
    <section
      data-section="gallery"
      data-source="REAL"
      aria-label="Thư viện ảnh"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        Thư viện ảnh
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <img
          src={cover.url}
          alt={cover.alt}
          className="rounded-lg aspect-[16/9] w-full object-cover lg:col-span-2"
          loading="lazy"
        />
        {others.map((m) => (
          <img
            key={m.id}
            src={m.url}
            alt={m.alt}
            className="rounded-lg aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
        ))}
      </div>
    </section>
  );
}
