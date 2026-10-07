'use client';

/**
 * JobPostingMediaCard — hrp-t1c-jobposting-media-youtube (RQ-05..RQ-09, DEC-05..DEC-07).
 *
 * Card gallery media cho JobPosting editor shell:
 *   - List media assignment (cover-first, order ASC) — server trả về JobPostingMediaAssignmentDto.
 *   - Mở MediaPicker để chọn ảnh PUBLIC từ thư viện hoặc tải lên ảnh mới.
 *   - POST `/api/admin/jobs/job-postings/[id]/media/assign` để attach.
 *   - POST `/api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover` để set cover.
 *   - POST `/api/admin/jobs/job-postings/[id]/media/reorder` để reorder.
 *   - DELETE `/api/admin/jobs/job-postings/[id]/media/[assignmentId]` để detach.
 *
 * Authoritative: server validates mọi quyền + idempotency. UI chỉ là affordance.
 */
import * as React from 'react';
import { Image as ImageIcon, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { MediaPicker } from './media-picker';

export interface JobPostingMediaAssignment {
  assignmentId: string;
  mediaId: string;
  url: string;
  alt: string;
  caption: string | null;
  mimeType: string;
  order: number;
  cover: boolean;
  createdAt: string;
}

export interface JobPostingMediaCardProps {
  jobPostingId: string;
  initialItems: JobPostingMediaAssignment[];
  canMutate: boolean;
  isSaving: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  onPatched?: () => void;
  onError?: (label: string) => void;
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readErrorLabel(
  res: Response,
  fallback: string,
): Promise<string> {
  return res
    .json()
    .then((body) => {
      const m = (body as { message?: string; error?: string } | null)?.message;
      if (m && m.length < 200) return m;
      return fallback;
    })
    .catch(() => fallback);
}

export function JobPostingMediaCard({
  jobPostingId,
  initialItems,
  canMutate,
  isSaving,
  status,
  onPatched,
  onError,
}: JobPostingMediaCardProps) {
  const [items, setItems] = React.useState<JobPostingMediaAssignment[]>(initialItems);
  const [pickerOpen, setPickerOpen] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [cardError, setCardError] = React.useState<string | null>(null);
  const [cardInfo, setCardInfo] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  // Sync props to state if parent refreshes the page
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const disabledReason = React.useMemo<string | null>(() => {
    if (!canMutate) return 'Tài khoản hiện tại không có quyền chỉnh sửa media JobPosting.';
    if (status === 'ARCHIVED') return 'Tin tuyển dụng đã được lưu trữ; không chỉnh sửa được.';
    if (status === 'PUBLISHED') {
      return 'Tin tuyển dụng đang được đăng; gỡ tin trước khi sửa gallery.';
    }
    if (isSaving || busy) return 'Đang lưu…';
    return null;
  }, [canMutate, status, isSaving, busy]);

  const inputDisabled = disabledReason !== null;

  async function refreshFromServer() {
    try {
      const res = await fetch(`/api/admin/jobs/job-postings/${jobPostingId}/media`, {
        headers: { 'Cache-Control': 'no-store' },
      });
      if (!res.ok) {
        const label = await readErrorLabel(
          res,
          'Không thể tải lại danh sách media.',
        );
        setCardError(label);
        if (onError) onError(label);
        return;
      }
      const json = (await res.json()) as { items: JobPostingMediaAssignment[] };
      setItems(json.items);
      onPatched?.();
    } catch {
      setCardError('Không thể kết nối máy chủ.');
    }
  }

  async function onPick(mediaId: string) {
    setCardError(null);
    setCardInfo(null);
    if (onError) onError('');
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/job-postings/${jobPostingId}/media/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': makeIdempotencyKey(),
          },
          body: JSON.stringify({ mediaId }),
        },
      );
      if (!res.ok) {
        const label = await readErrorLabel(
          res,
          'Không thể gán media cho tin tuyển dụng.',
        );
        setCardError(label);
        if (onError) onError(label);
        return;
      }
      const json = (await res.json()) as {
        assignment: JobPostingMediaAssignment;
        replayed?: boolean;
      };
      // Optimistic: chèn vào list, refresh từ server để đảm bảo order/cover canonical.
      setItems((prev) => {
        if (prev.some((p) => p.assignmentId === json.assignment.assignmentId)) {
          return prev.map((p) =>
            p.assignmentId === json.assignment.assignmentId ? json.assignment : p,
          );
        }
        return [...prev, json.assignment];
      });
      setCardInfo(json.replayed ? 'Ảnh đã được gán trước đó.' : 'Đã gán ảnh vào tin.');
      await refreshFromServer();
    } catch {
      const label = 'Không thể kết nối máy chủ.';
      setCardError(label);
      if (onError) onError(label);
    } finally {
      setBusy(false);
    }
  }

  async function onSetCover(assignmentId: string) {
    setCardError(null);
    setCardInfo(null);
    if (onError) onError('');
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/job-postings/${jobPostingId}/media/${assignmentId}/cover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': makeIdempotencyKey(),
          },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const label = await readErrorLabel(
          res,
          'Không thể đặt ảnh bìa.',
        );
        setCardError(label);
        if (onError) onError(label);
        return;
      }
      await refreshFromServer();
      setCardInfo('Đã đặt ảnh bìa.');
    } catch {
      const label = 'Không thể kết nối máy chủ.';
      setCardError(label);
      if (onError) onError(label);
    } finally {
      setBusy(false);
    }
  }

  async function onDetach(assignmentId: string) {
    setCardError(null);
    setCardInfo(null);
    if (onError) onError('');
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Gỡ ảnh này khỏi tin tuyển dụng?');
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/job-postings/${jobPostingId}/media/${assignmentId}`,
        {
          method: 'DELETE',
        },
      );
      if (!res.ok) {
        const label = await readErrorLabel(
          res,
          'Không thể gỡ ảnh.',
        );
        setCardError(label);
        if (onError) onError(label);
        return;
      }
      // Optimistic: remove ngay rồi refresh canonical.
      setItems((prev) => prev.filter((p) => p.assignmentId !== assignmentId));
      setCardInfo('Đã gỡ ảnh.');
      await refreshFromServer();
    } catch {
      const label = 'Không thể kết nối máy chủ.';
      setCardError(label);
      if (onError) onError(label);
    } finally {
      setBusy(false);
    }
  }

  async function commitReorder(nextOrder: JobPostingMediaAssignment[]) {
    setBusy(true);
    setCardError(null);
    setCardInfo(null);
    if (onError) onError('');
    try {
      const res = await fetch(
        `/api/admin/jobs/job-postings/${jobPostingId}/media/reorder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': makeIdempotencyKey(),
          },
          body: JSON.stringify({
            orderedAssignmentIds: nextOrder.map((i) => i.assignmentId),
          }),
        },
      );
      if (!res.ok) {
        const label = await readErrorLabel(
          res,
          'Không thể sắp xếp lại gallery.',
        );
        setCardError(label);
        if (onError) onError(label);
        return;
      }
      await refreshFromServer();
      setCardInfo('Đã cập nhật thứ tự gallery.');
    } catch {
      const label = 'Không thể kết nối máy chủ.';
      setCardError(label);
      if (onError) onError(label);
    } finally {
      setBusy(false);
    }
  }

  function onDragStart(assignmentId: string) {
    if (inputDisabled) return;
    setDragId(assignmentId);
  }

  function onDragOver(e: React.DragEvent<HTMLLIElement>, assignmentId: string) {
    if (inputDisabled || !dragId || dragId === assignmentId) return;
    e.preventDefault();
    setOverId(assignmentId);
  }

  function onDrop(assignmentId: string) {
    if (inputDisabled || !dragId || dragId === assignmentId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const from = items.findIndex((i) => i.assignmentId === dragId);
    const to = items.findIndex((i) => i.assignmentId === assignmentId);
    if (from < 0 || to < 0) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);
    setOverId(null);
    void commitReorder(next);
  }

  function onMove(direction: -1 | 1, assignmentId: string) {
    if (inputDisabled) return;
    const idx = items.findIndex((i) => i.assignmentId === assignmentId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setItems(next);
    void commitReorder(next);
  }

  return (
    <section
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}
      data-testid="media-card"
      data-source="REAL"
      data-job-posting-id={jobPostingId}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--on-surface)' }}
          data-testid="media-card-title"
        >
          Gallery ảnh JobPosting
        </h2>
        <span
          className="text-xs"
          style={{ color: 'var(--on-surface-variant)' }}
          data-testid="media-card-count"
        >
          {items.length} ảnh
        </span>
      </header>

      <p className="mb-3 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        Ảnh bìa sẽ hiện ở vị trí đầu tiên trên trang công khai. Kéo thả hoặc dùng mũi tên để sắp xếp.
        Ảnh INTERNAL không hiển thị trên trang công khai — chỉ ảnh PUBLIC mới gán được.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={inputDisabled}
          data-testid="media-card-add"
          aria-label="Thêm ảnh vào gallery"
          className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm font-medium disabled:opacity-50"
          style={{
            borderColor: 'var(--color-primary)',
            backgroundColor: 'var(--color-primary-soft)',
            color: 'var(--color-primary-dark)',
          }}
        >
          <Plus size={14} />
          Thêm ảnh
        </button>
        {disabledReason && (
          <span
            className="text-xs italic"
            style={{ color: 'var(--on-surface-variant)' }}
            data-testid="media-card-disabled-reason"
          >
            {disabledReason}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded border p-4 text-sm"
          style={{
            borderColor: 'var(--outline-variant)',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--on-surface-variant)',
          }}
          data-testid="media-card-empty"
        >
          <ImageIcon size={28} />
          <div>Chưa có ảnh nào trong gallery. Bấm "Thêm ảnh" để chọn từ thư viện hoặc tải lên.</div>
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="media-card-list"
        >
          {items.map((item, idx) => {
            const isDragging = dragId === item.assignmentId;
            const isOver = overId === item.assignmentId;
            return (
              <li
                key={item.assignmentId}
                data-testid="media-card-item"
                data-assignment-id={item.assignmentId}
                data-media-id={item.mediaId}
                data-cover={item.cover ? 'true' : 'false'}
                draggable={!inputDisabled}
                onDragStart={() => onDragStart(item.assignmentId)}
                onDragOver={(e) => onDragOver(e, item.assignmentId)}
                onDrop={() => onDrop(item.assignmentId)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className="flex flex-col gap-1 rounded border p-2 text-xs"
                style={{
                  borderColor: isOver
                    ? 'var(--color-primary)'
                    : 'var(--outline-variant)',
                  backgroundColor: isDragging
                    ? 'var(--color-surface-container)'
                    : 'var(--color-surface)',
                  opacity: isDragging ? 0.6 : 1,
                }}
              >
                <div
                  className="flex h-28 w-full items-center justify-center overflow-hidden rounded"
                  style={{ backgroundColor: 'var(--surface-container-lowest)' }}
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.alt}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span style={{ color: 'var(--on-surface-variant)' }}>(không có ảnh)</span>
                  )}
                </div>
                <div
                  className="truncate font-medium"
                  style={{ color: 'var(--on-surface)' }}
                  data-testid="media-card-item-alt"
                >
                  {item.alt || '(không có alt)'}
                </div>
                <div
                  className="truncate text-[10px]"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  {item.mimeType} · {item.assignmentId.slice(0, 8)}…
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {item.cover && (
                    <span
                      data-testid="media-card-item-cover-badge"
                      className="inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] font-semibold"
                      style={{
                        borderColor: 'var(--color-primary)',
                        backgroundColor: 'var(--color-primary-soft)',
                        color: 'var(--color-primary-dark)',
                      }}
                    >
                      <Star size={10} /> Ảnh bìa
                    </span>
                  )}
                  <span
                    className="rounded border px-1 py-0.5 text-[10px]"
                    style={{
                      borderColor: 'var(--outline-variant)',
                      color: 'var(--on-surface-variant)',
                    }}
                    data-testid="media-card-item-order"
                  >
                    #{idx + 1}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void onMove(-1, item.assignmentId)}
                      disabled={inputDisabled || idx === 0}
                      data-testid="media-card-item-up"
                      aria-label="Di chuyển lên"
                      className="rounded border px-1 py-0.5 text-[10px] disabled:opacity-50"
                      style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void onMove(1, item.assignmentId)}
                      disabled={inputDisabled || idx === items.length - 1}
                      data-testid="media-card-item-down"
                      aria-label="Di chuyển xuống"
                      className="rounded border px-1 py-0.5 text-[10px] disabled:opacity-50"
                      style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSetCover(item.assignmentId)}
                      disabled={inputDisabled || item.cover}
                      data-testid="media-card-item-cover"
                      aria-label="Đặt làm ảnh bìa"
                      className="rounded border px-1 py-0.5 text-[10px] disabled:opacity-50"
                      style={{
                        borderColor: item.cover
                          ? 'var(--color-primary)'
                          : 'var(--outline)',
                        color: 'var(--on-surface)',
                      }}
                    >
                      Đặt bìa
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDetach(item.assignmentId)}
                      disabled={inputDisabled}
                      data-testid="media-card-item-detach"
                      aria-label="Gỡ ảnh khỏi gallery"
                      className="inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] disabled:opacity-50"
                      style={{
                        borderColor: '#f5b5b5',
                        color: '#8a1c1c',
                      }}
                    >
                      <Trash2 size={10} /> Gỡ
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {busy && (
        <div
          className="mt-2 flex items-center gap-1 text-xs"
          style={{ color: 'var(--on-surface-variant)' }}
          data-testid="media-card-busy"
        >
          <Loader2 size={12} className="animate-spin" /> Đang cập nhật…
        </div>
      )}

      {cardError && (
        <div
          role="alert"
          data-testid="media-card-error"
          className="mt-3 rounded border p-2 text-xs"
          style={{
            borderColor: '#f5b5b5',
            backgroundColor: '#fdecec',
            color: '#8a1c1c',
          }}
        >
          {cardError}
        </div>
      )}
      {cardInfo && !cardError && (
        <div
          role="status"
          data-testid="media-card-info"
          className="mt-3 rounded border p-2 text-xs"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--on-surface)',
          }}
        >
          {cardInfo}
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(mediaId) => void onPick(mediaId)}
        defaultFolder="job-postings"
      />
    </section>
  );
}
