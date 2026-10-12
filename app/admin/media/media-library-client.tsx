'use client';

/**
 * MediaLibraryClient — Client component cho /admin/media.
 *
 * UI scope (sau hrp-t1c-media-global-pool-bulk-upload-hotfix):
 * - KHÔNG còn sidebar/filter/selector "Thư mục" — toàn bộ media là một kho chung.
 * - KHÔNG hiển thị tên folder trên Media card.
 * - Search + status filter (PUBLIC/INTERNAL) giữ nguyên.
 * - Grid 4-col responsive + pagination.
 * - UploadModal → MediaBulkUpload (multiple files, bounded concurrency, partial success).
 * - EditModal: chỉ PATCH alt/caption/status/cover (bỏ folder).
 *
 * Out of scope (defer):
 * - Bulk actions khác (multi-select delete, etc.)
 * - Drag-reorder trong library
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
  X,
} from 'lucide-react';
import type {
  MediaItemDto,
  MediaStatusEnum,
} from '@/src/domains/media/media.types';
import { mediaStatusLabel } from '@/src/domains/media/media-ui';
import { actionLabel } from '@/src/shared/i18n/action-dictionary';
import { formLabel } from '@/src/shared/i18n/form-dictionary';
import { MediaBulkUpload } from './media-bulk-upload';

interface MediaLibraryClientProps {
  initialItems: MediaItemDto[];
  total: number;
  take: number;
  page: number;
  /** hrp-t1c-media-global-pool-bulk-upload-hotfix: luôn rỗng; giữ prop để type stable. */
  folderFilter: string;
  statusFilter: string;
  searchFilter: string;
}

export function MediaLibraryClient({
  initialItems,
  total,
  take,
  page,
  folderFilter: _folderFilter,
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

  function navigate(next: { status?: string; search?: string; page?: string }) {
    const params = new URLSearchParams();
    // folder bị bỏ — không truyền vào URL nữa (RQ-12)
    const s = next.status ?? statusFilter;
    const q = next.search ?? searchFilter;
    const p = next.page ?? '1';
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
    if (!confirm(`Xóa ${item.filename}? Thao tác này cũng xóa tệp trên Vercel Blob và ${item.assignmentCount} liên kết.`)) {
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
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
            Thư viện tệp và ảnh
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
            {total} tệp — Kho Media dùng chung; tải lên hàng loạt qua Vercel Blob.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          data-testid="media-library-upload-button"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-on-primary)' }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Tải lên tệp mới
        </button>
      </header>

      <div className="space-y-3">
        <form onSubmit={onSearch} className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 min-w-0"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
          >
            <Search className="h-4 w-4" aria-hidden style={{ color: 'var(--color-on-surface-variant)' }} />
            <input
              type="search"
              placeholder="Tìm theo tên tệp / văn bản thay thế / chú thích…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--color-on-surface)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => navigate({ status: e.target.value, page: '1' })}
            data-testid="media-library-status-filter"
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PUBLIC">{mediaStatusLabel('PUBLIC')}</option>
            <option value="INTERNAL">{mediaStatusLabel('INTERNAL')}</option>
          </select>
          <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>
            {formLabel('search')}
          </button>
        </form>

        {items.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
          >
            <ImageIcon className="h-10 w-10 mx-auto mb-2" aria-hidden style={{ color: 'var(--color-on-surface-variant)' }} />
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              Chưa có tệp nào trong thư viện. Hãy tải tệp lên để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
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

      {showUpload && (
        <MediaBulkUpload
          onUploaded={(created) => {
            setItems((prev) => [created, ...prev]);
          }}
          onClose={() => {
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
            Ảnh bìa
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
          {mediaStatusLabel(item.status)}
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
          {/* hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-12): bỏ tên folder; chỉ hiển thị assignmentCount */}
          <span className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
            {item.assignmentCount} liên kết
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

/* ─── EditModal (folder bỏ — chỉ alt/caption/status/cover) ─────────── */

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
  const [status, setStatus] = React.useState<MediaStatusEnum>(item.status);
  const [cover, setCover] = React.useState(item.cover);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (status === 'PUBLIC' && !alt.trim()) {
      setError('Văn bản thay thế là bắt buộc khi trạng thái là Công khai.');
      return;
    }
    setBusy(true);
    try {
      // hrp-t1c-media-global-pool-bulk-upload-hotfix: PATCH không còn folder
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt,
          caption: caption || null,
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

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            {formLabel('status')}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MediaStatusEnum)}
            data-testid="media-edit-status"
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          >
            <option value="PUBLIC">{mediaStatusLabel('PUBLIC')}</option>
            <option value="INTERNAL">{mediaStatusLabel('INTERNAL')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Văn bản thay thế (alt text) {status === 'PUBLIC' && <span className="text-red-600">*</span>}
          </label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={500}
            data-testid="media-edit-alt"
            className="w-full rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-on-surface)' }}>
            Chú thích
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
          Đánh dấu làm ảnh bìa
        </label>

        <footer className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
          >
            {formLabel('cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-on-primary)' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            {busy ? 'Đang lưu…' : actionLabel('save')}
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
            Xóa tệp?
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          Xóa <strong>{item.filename}</strong> sẽ xóa tệp trên Vercel Blob và {item.assignmentCount} liên kết.
        </p>
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
          >
            {formLabel('cancel')}
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