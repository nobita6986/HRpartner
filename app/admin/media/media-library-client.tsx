'use client';

/**
 * MediaLibraryClient — Client component cho /admin/media.
 *
 * UI scope (MVP):
 * - Folder sidebar (filter)
 * - Search input
 * - Grid 4-col responsive + pagination
 * - Card mỗi item: thumbnail + alt + caption + actions
 * - Upload modal: drag-drop + alt input + folder selector
 * - Edit modal: alt + caption + folder + tags + status + cover
 *
 * Out of scope (defer):
 * - Bulk actions, multi-select
 * - Drag-reorder trong library (chỉ reorder assignment khi picker dùng ở AV2/AV6)
 * - Image transformation (DEC-02)
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  MediaItemDto,
  MediaStatusEnum,
} from '@/src/domains/media/media.types';
import {
  MAX_UPLOAD_BYTES,
  MEDIA_ALLOWED_MIME_TYPES,
} from '@/src/domains/media/media.types';

interface MediaLibraryClientProps {
  initialItems: MediaItemDto[];
  total: number;
  take: number;
  page: number;
  folderFilter: string;
  statusFilter: string;
  searchFilter: string;
}

const FOLDERS = [
  { value: '', label: 'Tất cả' },
  { value: 'uncategorized', label: 'Chưa phân loại' },
  { value: 'job-postings', label: 'Job Postings' },
  { value: 'homepage', label: 'Homepage' },
  { value: 'news', label: 'Tin tức' },
  { value: 'banners', label: 'Banner' },
] as const;

const FOLDER_OPTIONS = [
  'uncategorized',
  'job-postings',
  'homepage',
  'news',
  'banners',
];

export function MediaLibraryClient({
  initialItems,
  total,
  take,
  page,
  folderFilter,
  statusFilter,
  searchFilter,
}: MediaLibraryClientProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<MediaItemDto[]>(initialItems);
  const [showUpload, setShowUpload] = React.useState(false);
  const [editing, setEditing] = React.useState<MediaItemDto | null>(null);
  const [deleting, setDeleting] = React.useState<MediaItemDto | null>(null);
  const [searchTerm, setSearchTerm] = React.useState(searchFilter);
  const [pageState, setPageState] = React.useState(page);

  // Sync props to state khi router refresh (after filter change)
  React.useEffect(() => {
    setItems(initialItems);
    setPageState(page);
  }, [initialItems, page]);

  const totalPages = Math.ceil(total / take);

  function navigate(next: { folder?: string; status?: string; search?: string; page?: string }) {
    const params = new URLSearchParams();
    const f = next.folder ?? folderFilter;
    const s = next.status ?? statusFilter;
    const q = next.search ?? searchFilter;
    const p = next.page ?? '1';
    if (f) params.set('folder', f);
    if (s) params.set('status', s);
    if (q) params.set('search', q);
    if (p !== '1') params.set('page', p);
    const qs = params.toString();
    router.push(`/admin/media${qs ? `?${qs}` : ''}`);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: searchTerm, page: '1' });
  }

  async function onDelete(item: MediaItemDto) {
    if (!confirm(`Xóa ${item.filename}? Hành động này xóa cả trên Vercel Blob và assignments.`)) {
      return;
    }
    const res = await fetch(`/api/admin/media/${item.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setDeleting(null);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Xóa thất bại: ${err.message ?? res.statusText}`);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
            Thư viện Media
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
            {total} asset{total === 1 ? '' : 's'} — Upload qua Vercel Blob, dùng cho Job Postings, Homepage, News.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-on-primary)' }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Upload mới
        </button>
      </header>

      {/* Folder sidebar + filters */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <aside
          className="rounded-xl border p-4 space-y-3"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
        >
          <h2 className="text-xs font-bold uppercase" style={{ color: 'var(--color-on-surface-variant)' }}>
            Folder
          </h2>
          <ul className="space-y-1">
            {FOLDERS.map((f) => (
              <li key={f.value || 'all'}>
                <button
                  type="button"
                  onClick={() => navigate({ folder: f.value, page: '1' })}
                  className="w-full text-left rounded px-2 py-1 text-sm"
                  style={{
                    backgroundColor: folderFilter === f.value ? 'var(--color-primary-soft)' : 'transparent',
                    color: folderFilter === f.value ? 'var(--color-primary-dark)' : 'var(--color-on-surface)',
                    fontWeight: folderFilter === f.value ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-3">
          <form onSubmit={onSearch} className="flex items-center gap-2">
            <div
              className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
            >
              <Search className="h-4 w-4" aria-hidden style={{ color: 'var(--color-on-surface-variant)' }} />
              <input
                type="search"
                placeholder="Tìm filename / alt / caption…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--color-on-surface)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => navigate({ status: e.target.value, page: '1' })}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNAL">INTERNAL</option>
            </select>
            <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>
              Tìm
            </button>
          </form>

          {/* Grid */}
          {items.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
            >
              <ImageIcon className="h-10 w-10 mx-auto mb-2" aria-hidden style={{ color: 'var(--color-on-surface-variant)' }} />
              <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                Chưa có media nào trong folder này. Upload để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleting(item)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={pageState <= 1}
                onClick={() => navigate({ page: String(pageState - 1) })}
                className="rounded px-3 py-1 text-sm disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
              >
                ← Trước
              </button>
              <span className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                Trang {pageState} / {totalPages}
              </span>
              <button
                type="button"
                disabled={pageState >= totalPages}
                onClick={() => navigate({ page: String(pageState + 1) })}
                className="rounded px-3 py-1 text-sm disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal
          defaultFolder={folderFilter || 'uncategorized'}
          onClose={() => setShowUpload(false)}
          onUploaded={(created) => {
            setItems((prev) => [created, ...prev]);
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {deleting && (
        <DeleteConfirm
          item={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => onDelete(deleting)}
        />
      )}
    </div>
  );
}

/* ─── MediaCard ───────────────────────────────────────────────────────── */

function MediaCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MediaItemDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className="group rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={item.url}
          alt={item.alt || item.filename}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {item.cover && (
          <span
            className="absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-on-primary)' }}
          >
            Cover
          </span>
        )}
        <span
          className="absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          style={
            item.status === 'PUBLIC'
              ? { backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)' }
              : { backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }
          }
        >
          {item.status}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-on-surface)' }} title={item.filename}>
          {item.filename}
        </p>
        {item.alt && (
          <p className="text-xs line-clamp-2" style={{ color: 'var(--color-on-surface-variant)' }}>
            {item.alt}
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
            {item.folder} · {item.assignmentCount} gán
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Sửa"
              className="rounded p-1 hover:bg-gray-100"
            >
              <Edit2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Xóa"
              className="rounded p-1 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── UploadModal ─────────────────────────────────────────────────────── */

function UploadModal({
  defaultFolder,
  onClose,
  onUploaded,
}: {
  defaultFolder: string;
  onClose: () => void;
  onUploaded: (item: MediaItemDto) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [alt, setAlt] = React.useState('');
  const [caption, setCaption] = React.useState('');
  const [folder, setFolder] = React.useState(defaultFolder);
  const [status, setStatus] = React.useState<MediaStatusEnum>('PUBLIC');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Chưa chọn file.');
      return;
    }
    if (status === 'PUBLIC' && !alt.trim()) {
      setError('Alt text là bắt buộc khi status = PUBLIC (accessibility).');
      return;
    }

    setBusy(true);
    try {
      // Step 1: upload lên Vercel Blob qua /api/admin/media/upload-url
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const uploadRes = await fetch('/api/admin/media/upload-url', { method: 'POST', body: fd });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(`Upload Blob fail: ${err.message ?? uploadRes.statusText}`);
      }
      const uploaded = (await uploadRes.json()) as { blobUrl: string; pathname: string; size: number; mimeType: string };

      // Step 2: confirm Media record
      const confirmRes = await fetch('/api/admin/media/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: uploaded.blobUrl,
          alt,
          caption: caption || null,
          folder,
          tags: [],
          status,
          cover: false,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
        }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(`Confirm fail: ${err.message ?? confirmRes.statusText}`);
      }
      const created = (await confirmRes.json()) as MediaItemDto;
      onUploaded(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
      >
        <header className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-on-surface)' }}>
            Upload media mới
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {error && (
          <div
            className="rounded-lg border p-3 text-sm flex items-start gap-2"
            style={{ backgroundColor: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            File (image)
          </label>
          <input
            type="file"
            accept={MEDIA_ALLOWED_MIME_TYPES.join(',')}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
            required
          />
          <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
            JPEG/PNG/WebP/GIF — tối đa {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Folder
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
            >
              {FOLDER_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MediaStatusEnum)}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
            >
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNAL">INTERNAL</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Alt text {status === 'PUBLIC' && <span className="text-red-600">*</span>}
          </label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={500}
            placeholder="Mô tả ngắn cho ảnh (accessibility)"
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Caption (optional)
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>

        <footer className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-on-primary)' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            {busy ? 'Đang upload…' : 'Upload'}
          </button>
        </footer>
      </form>
    </div>
  );
}

/* ─── EditModal ───────────────────────────────────────────────────────── */

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: MediaItemDto;
  onClose: () => void;
  onSaved: (updated: MediaItemDto) => void;
}) {
  const [alt, setAlt] = React.useState(item.alt);
  const [caption, setCaption] = React.useState(item.caption ?? '');
  const [folder, setFolder] = React.useState(item.folder);
  const [status, setStatus] = React.useState<MediaStatusEnum>(item.status);
  const [cover, setCover] = React.useState(item.cover);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (status === 'PUBLIC' && !alt.trim()) {
      setError('Alt text là bắt buộc khi status = PUBLIC.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt,
          caption: caption || null,
          folder,
          status,
          cover,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? res.statusText);
      }
      const updated = (await res.json()) as MediaItemDto;
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
      >
        <header className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-on-surface)' }}>
            Sửa metadata
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {error && (
          <div
            className="rounded-lg border p-3 text-sm flex items-start gap-2"
            style={{ backgroundColor: 'var(--color-surface-container-high)', borderColor: 'var(--color-outline-variant)' }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Folder
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
            >
              {FOLDER_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MediaStatusEnum)}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
            >
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNAL">INTERNAL</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Alt text {status === 'PUBLIC' && <span className="text-red-600">*</span>}
          </label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={500}
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Caption
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-on-surface)' }}>
          <input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} />
          Đánh dấu là cover
        </label>

        <footer className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-on-primary)' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </footer>
      </form>
    </div>
  );
}

/* ─── DeleteConfirm ───────────────────────────────────────────────────── */

function DeleteConfirm({
  item,
  onClose,
  onConfirm,
}: {
  item: MediaItemDto;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
      >
        <header className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-on-surface)' }}>
            Xóa media?
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          Xóa <strong>{item.filename}</strong> sẽ xóa cả trên Vercel Blob và {item.assignmentCount} assignment.
        </p>
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold"
            style={{ backgroundColor: '#dc2626', color: '#fff' }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Xóa
          </button>
        </footer>
      </div>
    </div>
  );
}
