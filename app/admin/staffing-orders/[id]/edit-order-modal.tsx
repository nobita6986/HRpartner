'use client';

/**
 * EditOrderModal — t1a-staffing-order-management.
 *
 * Modal sửa Nhu cầu tuyển dụng. Cho phép cập nhật:
 *   - title
 *   - description
 *   - deadlineDate
 *   - slots[] (thêm mới, sửa, đánh dấu xoá)
 *
 * Validation client-side là lớp đầu; backend (`PUT /api/staffing/orders/[id]`)
 * là authority — backend enforce tất cả guards. Modal phản ánh đúng guards
 * của backend: không cho `slotsNeeded < slotsFilled`, không cho xoá slot có
 * JobOpening/Submission/Assignment, hiển thị lỗi typed từ server.
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { StaffingOrderDetailDto, StaffingOrderSlotDto } from './order-management-client';

interface DraftSlot {
  /** Slot id hiện tại nếu đang sửa; trống nếu là slot mới. */
  id: string | null;
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  hourlyRateVnd: number | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  validFrom: string;
  validTo: string | null;
  workLocation: string | null;
  _delete: boolean;
  /** Lock flag cho biết slot có phụ thuộc — không xoá. */
  locked: boolean;
}

export interface EditOrderModalProps {
  order: StaffingOrderDetailDto;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function toDraft(slot: StaffingOrderSlotDto): DraftSlot {
  return {
    id: slot.id,
    positionCode: slot.positionCode,
    positionTitle: slot.positionTitle,
    slotsNeeded: slot.slotsNeeded,
    hourlyRateVnd: slot.hourlyRateVnd,
    shiftStart: slot.shiftStart,
    shiftEnd: slot.shiftEnd,
    validFrom: slot.validFrom ? slot.validFrom.slice(0, 10) : '',
    validTo: slot.validTo ? slot.validTo.slice(0, 10) : null,
    workLocation: slot.workLocation,
    _delete: false,
    locked:
      (slot._count?.submissions ?? 0) > 0 ||
      (slot._count?.assignments ?? 0) > 0 ||
      slot.jobOpening != null ||
      (slot.neoJobOpenings?.length ?? 0) > 0,
  };
}

function emptyDraft(): DraftSlot {
  return {
    id: null,
    positionCode: 'GEN',
    positionTitle: '',
    slotsNeeded: 1,
    hourlyRateVnd: null,
    shiftStart: null,
    shiftEnd: null,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: null,
    workLocation: null,
    _delete: false,
    locked: false,
  };
}

export function EditOrderModal({ order, canEdit, onClose, onSaved }: EditOrderModalProps) {
  const [title, setTitle] = useState(order.title);
  const [description, setDescription] = useState(order.description ?? '');
  const [deadlineDate, setDeadlineDate] = useState(
    order.deadlineDate ? order.deadlineDate.slice(0, 10) : '',
  );
  const [drafts, setDrafts] = useState<DraftSlot[]>(() => order.slots.map(toDraft));
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Idempotency key — duy nhất cho mỗi lần submit. */
  const [idemKey] = useState<string>(() => newIdempotencyKey());

  // Reset state khi order đổi.
  useEffect(() => {
    setTitle(order.title);
    setDescription(order.description ?? '');
    setDeadlineDate(order.deadlineDate ? order.deadlineDate.slice(0, 10) : '');
    setDrafts(order.slots.map(toDraft));
  }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasDeletedLocked = useMemo(
    () => drafts.some((d) => d._delete && d.locked),
    [drafts],
  );

  const updateDraft = useCallback((idx: number, patch: Partial<DraftSlot>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }, []);

  const addDraft = useCallback(() => {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }, []);

  const removeNewDraft = useCallback((idx: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canEdit) return;
      setErr(null);

      // Client-side guard: số lượng cần tuyển không được giảm xuống dưới số đã tuyển.
      for (const d of drafts) {
        if (d._delete) continue;
        if (d.id) {
          const current = order.slots.find((s) => s.id === d.id);
          if (current && d.slotsNeeded < current.slotsFilled) {
            setErr(`Vị trí "${current.positionTitle}" đã tuyển ${current.slotsFilled} người; không thể giảm số lượng cần tuyển xuống ${d.slotsNeeded}.`);
            return;
          }
        }
        if (!d.positionCode.trim() || !d.positionTitle.trim()) {
          setErr('Mỗi vị trí cần có mã và tên.');
          return;
        }
        if (!Number.isInteger(d.slotsNeeded) || d.slotsNeeded < 0) {
          setErr('Số lượng cần tuyển phải là số nguyên không âm.');
          return;
        }
        if (!d.validFrom) {
          setErr('Mỗi vị trí cần có ngày bắt đầu hiệu lực.');
          return;
        }
      }

      if (hasDeletedLocked) {
        setErr('Một vị trí đang được đánh dấu xoá nhưng đã phát sinh nghiệp vụ (vị trí tuyển nội bộ, đơn ứng tuyển hoặc placement) — không thể xoá.');
        return;
      }

      setPending(true);
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() ? description : null,
          deadlineDate: deadlineDate || null,
          slots: drafts
            .filter((d) => !(d._delete && !d.id)) // bỏ slot mới chưa từng tồn tại
            .map((d) => ({
              id: d.id ?? undefined,
              positionCode: d.positionCode.trim(),
              positionTitle: d.positionTitle.trim(),
              slotsNeeded: d.slotsNeeded,
              hourlyRateVnd: d.hourlyRateVnd,
              shiftStart: d.shiftStart,
              shiftEnd: d.shiftEnd,
              validFrom: d.validFrom,
              validTo: d.validTo,
              workLocation: d.workLocation,
              _delete: d._delete || undefined,
            })),
        };
        const res = await fetch(`/api/staffing/orders/${order.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
            'x-idempotency-key': idemKey,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(`${data.error ?? 'ERROR'}: ${data.message ?? `HTTP ${res.status}`}`);
          return;
        }
        onSaved();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Lỗi kết nối');
      } finally {
        setPending(false);
      }
    },
    [canEdit, drafts, hasDeletedLocked, title, description, deadlineDate, idemKey, order.id, order.slots, onSaved],
  );

  return (
    <div
      data-testid="edit-order-modal"
      role="dialog"
      aria-labelledby="edit-order-title"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        style={{ background: 'var(--surface-container-lowest)' }}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border p-6 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2
          id="edit-order-title"
          style={{ color: 'var(--on-surface)' }}
          className="mb-4 text-lg font-semibold"
        >
          Sửa nhu cầu tuyển dụng
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">
              Tiêu đề *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="edit-title"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="edit-description"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface)' }} className="mb-1 block text-sm font-medium">
              Hạn tuyển
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              data-testid="edit-deadline"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label style={{ color: 'var(--on-surface-variant)' }} className="mb-1 block text-sm font-medium">
              Dự án (không thể đổi)
            </label>
            <input
              value={`${order.project.code} — ${order.project.name}`}
              readOnly
              disabled
              data-testid="edit-project-readonly"
              style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
              className="w-full rounded border px-3 py-2 text-sm opacity-70"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">
              Vị trí ({drafts.length})
            </h3>
            <button
              type="button"
              onClick={addDraft}
              data-testid="edit-add-slot"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="rounded px-3 py-1 text-xs font-semibold"
            >
              + Thêm vị trí
            </button>
          </div>

          <ul data-testid="edit-slot-list" className="space-y-3">
            {drafts.map((d, idx) => {
              const current = d.id ? order.slots.find((s) => s.id === d.id) : null;
              const filled = current?.slotsFilled ?? 0;
              return (
                <li
                  key={d.id ?? `new-${idx}`}
                  data-testid={`edit-slot-row-${idx}`}
                  style={{ borderColor: 'var(--outline-variant)' }}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: 'var(--on-surface)' }} className="text-sm font-semibold">
                      {d.id ? `Slot #${idx + 1} (${d.positionCode})` : `Slot mới #${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      {d.id && d.locked && (
                        <span
                          title="Vị trí đã phát sinh nghiệp vụ (vị trí tuyển nội bộ, đơn ứng tuyển hoặc placement) — không thể xoá"
                          data-testid={`edit-slot-locked-${idx}`}
                          style={{ color: '#c62828' }}
                        >
                          🔒 đã phát sinh
                        </span>
                      )}
                      {d.id && !d.locked && (
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={d._delete}
                            onChange={(e) => updateDraft(idx, { _delete: e.target.checked })}
                            data-testid={`edit-slot-delete-${idx}`}
                          />
                          <span style={{ color: '#c62828' }}>Đánh dấu xoá</span>
                        </label>
                      )}
                      {!d.id && (
                        <button
                          type="button"
                          onClick={() => removeNewDraft(idx)}
                          data-testid={`edit-slot-remove-new-${idx}`}
                          style={{ color: '#c62828' }}
                          className="text-xs"
                        >
                          Bỏ
                        </button>
                      )}
                    </div>
                  </div>
                  {d._delete ? (
                    <p
                      style={{ color: 'var(--on-surface-variant)' }}
                      className="mt-2 text-xs italic"
                    >
                      Slot này sẽ bị xoá khi lưu.
                    </p>
                  ) : (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Mã *</span>
                        <input
                          value={d.positionCode}
                          onChange={(e) => updateDraft(idx, { positionCode: e.target.value })}
                          required
                          data-testid={`edit-slot-code-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 font-mono text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs sm:col-span-2 lg:col-span-1">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Tên vị trí *</span>
                        <input
                          value={d.positionTitle}
                          onChange={(e) => updateDraft(idx, { positionTitle: e.target.value })}
                          required
                          data-testid={`edit-slot-title-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>
                          Số lượng (đã tuyển {filled})
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={d.slotsNeeded}
                          onChange={(e) => updateDraft(idx, { slotsNeeded: parseInt(e.target.value, 10) || 0 })}
                          required
                          data-testid={`edit-slot-needed-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Lương/giờ (VND)</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={d.hourlyRateVnd ?? ''}
                          onChange={(e) => updateDraft(idx, { hourlyRateVnd: e.target.value === '' ? null : Number(e.target.value) })}
                          data-testid={`edit-slot-rate-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Giờ vào</span>
                        <input
                          type="time"
                          value={d.shiftStart ?? ''}
                          onChange={(e) => updateDraft(idx, { shiftStart: e.target.value || null })}
                          data-testid={`edit-slot-start-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Giờ ra</span>
                        <input
                          type="time"
                          value={d.shiftEnd ?? ''}
                          onChange={(e) => updateDraft(idx, { shiftEnd: e.target.value || null })}
                          data-testid={`edit-slot-end-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs sm:col-span-2 lg:col-span-1">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Địa điểm</span>
                        <input
                          value={d.workLocation ?? ''}
                          onChange={(e) => updateDraft(idx, { workLocation: e.target.value || null })}
                          data-testid={`edit-slot-location-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Hiệu lực từ *</span>
                        <input
                          type="date"
                          value={d.validFrom}
                          onChange={(e) => updateDraft(idx, { validFrom: e.target.value })}
                          required
                          data-testid={`edit-slot-validfrom-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                      <label className="text-xs">
                        <span style={{ color: 'var(--on-surface-variant)' }}>Đến ngày</span>
                        <input
                          type="date"
                          value={d.validTo ?? ''}
                          onChange={(e) => updateDraft(idx, { validTo: e.target.value || null })}
                          data-testid={`edit-slot-validto-${idx}`}
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          style={{ borderColor: 'var(--outline)', background: 'var(--surface-container)' }}
                        />
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {err && (
          <p
            role="alert"
            data-testid="edit-error"
            style={{ color: '#c62828' }}
            className="mt-3 text-sm"
          >
            {err}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            data-testid="edit-cancel"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            className="rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={pending}
            data-testid="edit-submit"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}

function newIdempotencyKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
