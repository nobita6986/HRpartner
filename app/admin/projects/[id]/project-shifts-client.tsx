'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectShiftDto } from '@/src/domains/crm/project-shift.service';

export interface ShiftConfigCapability {
  canConfig: boolean;
}

interface Props {
  projectId: string;
  projectCode: string;
  shifts: ProjectShiftDto[];
  capability: ShiftConfigCapability;
}

type Flash = { kind: 'success' | 'error'; text: string } | null;

interface PresetShift {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  standardHours: number;
}

const PRESETS: Record<string, { label: string; shifts: PresetShift[] }> = {
  TWO_SHIFTS: {
    label: '+ Mẫu 2 ca (Ca Sáng / Ca Tối)',
    shifts: [
      { code: 'CA_SANG', name: 'Ca Sáng (08:00 - 17:00)', startTime: '08:00', endTime: '17:00', breakMinutes: 60, standardHours: 8 },
      { code: 'CA_TOI', name: 'Ca Tối (20:00 - 05:00)', startTime: '20:00', endTime: '05:00', breakMinutes: 60, standardHours: 8 },
    ],
  },
  THREE_SHIFTS: {
    label: '+ Mẫu 3 ca (Ca 1 / Ca 2 / Ca 3)',
    shifts: [
      { code: 'CA1', name: 'Ca 1 (06:00 - 14:00)', startTime: '06:00', endTime: '14:00', breakMinutes: 30, standardHours: 8 },
      { code: 'CA2', name: 'Ca 2 (14:00 - 22:00)', startTime: '14:00', endTime: '22:00', breakMinutes: 30, standardHours: 8 },
      { code: 'CA3', name: 'Ca 3 - Đêm (22:00 - 06:00)', startTime: '22:00', endTime: '06:00', breakMinutes: 30, standardHours: 8 },
    ],
  },
  OFFICE_SHIFT: {
    label: '+ Ca Hành chính (08:00 - 17:00)',
    shifts: [
      { code: 'HC', name: 'Ca Hành chính (08:00 - 17:00)', startTime: '08:00', endTime: '17:00', breakMinutes: 60, standardHours: 8 },
    ],
  },
};

function describeErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === 'object') {
    const j = json as { message?: unknown; error?: unknown };
    if (typeof j.message === 'string' && j.message.trim()) return j.message;
    if (typeof j.error === 'string' && j.error.trim()) return j.error;
  }
  return fallback;
}

function ShiftModal({
  projectId,
  initial,
  onClose,
  onSaved,
}: {
  projectId: string;
  initial?: ProjectShiftDto;
  onClose: () => void;
  onSaved: (shift: ProjectShiftDto, isCreate: boolean) => void;
}) {
  const isCreate = !initial;
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '17:00');
  const [breakMinutes, setBreakMinutes] = useState(String(initial?.breakMinutes ?? 60));
  const [standardHours, setStandardHours] = useState(String(initial?.standardHours ?? 8));
  const [graceLateMinutes, setGraceLateMinutes] = useState(String(initial?.graceLateMinutes ?? 15));
  const [graceEarlyMinutes, setGraceEarlyMinutes] = useState(String(initial?.graceEarlyMinutes ?? 15));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        breakMinutes: Number(breakMinutes),
        standardHours: Number(standardHours),
        graceLateMinutes: Number(graceLateMinutes),
        graceEarlyMinutes: Number(graceEarlyMinutes),
        isActive,
      };
      const url = isCreate
        ? `/api/projects/${projectId}/shifts`
        : `/api/projects/${projectId}/shifts/${initial.id}`;
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(describeErrorMessage(data, `Lỗi ${res.status}`));
        return;
      }
      onSaved(data.shift as ProjectShiftDto, isCreate);
      onClose();
    } catch {
      setErr('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border p-6 shadow-xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--outline-variant)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
          {isCreate ? 'Thêm ca làm việc cho dự án' : `Chỉnh sửa ca ${initial.code}`}
        </h3>
        <form onSubmit={submit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Mã ca <span style={{ color: '#c62828' }}>*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: CA1, CA_SANG, HC"
                className="w-full rounded border px-3 py-2 font-mono"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Tên hiển thị <span style={{ color: '#c62828' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Ca 1 (Sáng)"
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Giờ vào
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Giờ tan ca
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Nghỉ giữa ca (phút)
              </label>
              <input
                type="number"
                min={0}
                max={240}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Giờ chuẩn (=1 công)
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={24}
                value={standardHours}
                onChange={(e) => setStandardHours(e.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Dung sai đi muộn (phút)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={graceLateMinutes}
                onChange={(e) => setGraceLateMinutes(e.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" style={{ color: 'var(--on-surface)' }}>
                Dung sai về sớm (phút)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={graceEarlyMinutes}
                onChange={(e) => setGraceEarlyMinutes(e.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ borderColor: 'var(--outline)', background: 'var(--surface-container-lowest)' }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ color: 'var(--on-surface)' }}>Đang áp dụng chấm công cho ca này</span>
          </label>

          {err && (
            <div className="rounded border p-2 text-xs" style={{ borderColor: '#c62828', color: '#c62828', background: '#ffebee' }}>
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 text-sm"
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded px-4 py-2 text-sm font-semibold"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              {submitting ? 'Đang lưu…' : 'Lưu ca làm việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectShiftsClient({
  projectId,
  projectCode,
  shifts: initialShifts,
  capability,
}: Props) {
  const router = useRouter();
  const [shifts, setShifts] = useState<ProjectShiftDto[]>(initialShifts);
  const [flash, setFlash] = useState<Flash>(null);
  const [modalState, setModalState] = useState<{ open: boolean; shift?: ProjectShiftDto }>({ open: false });
  const [busyPreset, setBusyPreset] = useState(false);

  const applyPreset = async (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setBusyPreset(true);
    setFlash(null);
    let addedCount = 0;
    const nextShifts = [...shifts];

    try {
      for (const item of preset.shifts) {
        if (nextShifts.some((s) => s.code === item.code)) continue;
        const res = await fetch(`/api/projects/${projectId}/shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shift) {
            nextShifts.push(data.shift as ProjectShiftDto);
            addedCount++;
          }
        }
      }
      setShifts(nextShifts);
      setFlash({
        kind: 'success',
        text: addedCount > 0 ? `Đã thêm ${addedCount} ca mẫu vào dự án ${projectCode}.` : 'Các mã ca mẫu đã tồn tại trong dự án.',
      });
      router.refresh();
    } catch {
      setFlash({ kind: 'error', text: 'Không thể tạo ca mẫu.' });
    } finally {
      setBusyPreset(false);
    }
  };

  const handleDelete = async (shift: ProjectShiftDto) => {
    if (!window.confirm(`Xoá ca "${shift.code} - ${shift.name}" khỏi dự án ${projectCode}?`)) return;
    setFlash(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/shifts/${shift.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFlash({ kind: 'error', text: describeErrorMessage(data, 'Không thể xoá ca làm việc.') });
        return;
      }
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      setFlash({ kind: 'success', text: `Đã xoá ca ${shift.code}.` });
      router.refresh();
    } catch {
      setFlash({ kind: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  return (
    <section
      aria-labelledby="project-shifts-heading"
      data-testid="project-shifts-section"
      className="mb-8 rounded-lg border p-5"
      style={{
        borderColor: 'var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="project-shifts-heading"
            className="text-lg font-semibold"
            style={{ color: 'var(--on-surface)' }}
          >
            Phân ca & Khung giờ chấm công ({shifts.length})
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Thiết lập các ca làm việc của dự án (Ca Sáng/Tối, Ca 1/2/3, Hành chính). Chấm công từ App GPS và File máy chấm công sẽ tự động đối chiếu theo ca của dự án để tính giờ công chuẩn và OT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/attendance/export?projectId=${encodeURIComponent(projectId)}`}
            data-testid="project-attendance-export-btn"
            className="rounded border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: '#197a56',
              color: '#197a56',
              background: '#e8f5e9',
            }}
          >
            Xuất Excel chấm công dự án
          </a>
          {capability.canConfig && (
            <>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  disabled={busyPreset}
                  onClick={() => void applyPreset(key)}
                  className="rounded border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: 'var(--outline)',
                    color: 'var(--on-surface)',
                    background: 'var(--surface)',
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                data-testid="project-shift-add-btn"
                onClick={() => setModalState({ open: true })}
                className="rounded px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              >
                + Thêm ca tuỳ chỉnh
              </button>
            </>
          )}
        </div>
      </div>

      {flash && (
        <div
          role="status"
          className="mb-3 rounded border px-3 py-2 text-xs"
          style={{
            background: flash.kind === 'success' ? '#e8f5e9' : '#ffebee',
            color: flash.kind === 'success' ? '#197a56' : '#c62828',
            borderColor: flash.kind === 'success' ? '#197a56' : '#c62828',
          }}
        >
          {flash.text}
        </div>
      )}

      {shifts.length === 0 ? (
        <div
          className="rounded border p-6 text-center text-sm"
          style={{
            borderColor: 'var(--outline-variant)',
            color: 'var(--on-surface-variant)',
          }}
        >
          Dự án chưa cấu hình ca làm việc cụ thể (đang áp dụng định mức mặc định 8.0 giờ/công). Hãy bấm các nút mẫu phía trên hoặc thêm ca tuỳ chỉnh.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--outline-variant)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--surface-container)',
                  borderBottom: '1px solid var(--outline-variant)',
                }}
              >
                {['Mã ca', 'Tên ca', 'Khung giờ', 'Nghỉ giữa ca', 'Giờ chuẩn (1 công)', 'Trạng thái', 'Hành động'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr
                  key={s.id}
                  data-testid={`project-shift-row-${s.code}`}
                  style={{ borderTop: '1px solid var(--outline-variant)' }}
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                    {s.code}
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--on-surface)' }}>
                    {s.name}
                    {s.isOvernight && (
                      <span
                        className="ml-2 rounded px-1.5 py-0.5 text-[11px]"
                        style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
                      >
                        Qua đêm
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--on-surface)' }}>
                    {s.startTime} – {s.endTime}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                    {s.breakMinutes} phút
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>
                    {s.standardHours} giờ
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      style={{ color: s.isActive ? '#197a56' : '#c62828' }}
                      className="font-medium"
                    >
                      {s.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {capability.canConfig ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setModalState({ open: true, shift: s })}
                          style={{ color: 'var(--primary)' }}
                          className="hover:underline"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(s)}
                          style={{ color: '#c62828' }}
                          className="hover:underline"
                        >
                          Xoá
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--on-surface-variant)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalState.open && (
        <ShiftModal
          projectId={projectId}
          initial={modalState.shift}
          onClose={() => setModalState({ open: false })}
          onSaved={(saved, isCreate) => {
            setShifts((prev) =>
              isCreate ? [...prev, saved] : prev.map((x) => (x.id === saved.id ? saved : x)),
            );
            setFlash({
              kind: 'success',
              text: isCreate ? `Đã thêm ca ${saved.code}.` : `Đã cập nhật ca ${saved.code}.`,
            });
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
