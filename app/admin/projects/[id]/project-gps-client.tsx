'use client';

/**
 * project-gps-client.tsx — hrp-t1a-android-gps-project-site-config.
 *
 * Section "Cấu hình GPS (Geofence)" của trang /admin/projects/[id].
 * Mount như một SIBLING của ProjectDetailClient (từ page.tsx) — không đụng
 * project-detail-client.tsx (static-guard terminology/capability giữ nguyên).
 *
 * Nghiệp vụ (T0 §B4 + §5):
 *  - Bảng Site của Project: tên, địa chỉ, lat, lng, radius + nhãn trạng thái
 *    rõ ("Đã Admin xác nhận" / "Chưa được Admin xác nhận" / "Chưa có tọa độ").
 *  - capability.canConfig CHỈ true cho role ADMIN/DIRECTOR (mapping thật —
 *    mirror `PROJECT_GEO_CONFIG_ROLES` từ service). Role khác: banner chỉ đọc.
 *  - Chỉnh sửa Site (modal): địa chỉ, latitude, longitude, radiusMeters;
 *    validation client mirror (lat/lng cùng có hoặc cùng vắng; miền giá trị;
 *    radius nguyên 1..2000) — server validate lại; lỗi server hiển thị.
 *  - "Bỏ toạ độ" gửi cả lat + lng null (server clear confirm markers).
 *  - "Thêm Site mới" (modal): name + optional address + optional coords +
 *    radius; header x-idempotency-key; server tạo Site gắn Project hiện hữu.
 *  - KHÔNG có chức năng xoá Site; KHÔNG tự điền/suy toạ độ gợi ý.
 */
import { useMemo, useState } from 'react';
import type { SiteGpsDto } from '@/src/domains/crm/site-gps.service';

export interface GpsConfigCapability {
  canConfig: boolean;
}

interface Props {
  projectId: string;
  projectCode: string;
  sites: SiteGpsDto[];
  capability: GpsConfigCapability;
}

type Flash = { kind: 'success' | 'error'; text: string } | null;

function gpsStatusLabel(site: SiteGpsDto): string {
  if (site.gpsStatus === 'CONFIRMED') return 'Đã Admin xác nhận';
  if (site.gpsStatus === 'UNCONFIRMED') return 'Chưa được Admin xác nhận';
  return 'Chưa có tọa độ';
}

function gpsStatusTone(site: SiteGpsDto): string {
  if (site.gpsStatus === 'CONFIRMED') return '#197a56';
  if (site.gpsStatus === 'UNCONFIRMED') return '#b45309';
  return '#c62828';
}

function describeErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === 'object') {
    const j = json as { message?: unknown; error?: unknown };
    if (typeof j.message === 'string' && j.message.trim()) return j.message;
    if (typeof j.error === 'string' && j.error.trim()) return j.error;
  }
  return fallback;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function fmtCoord(value: number | null): string {
  return value == null ? '—' : String(value);
}

function validateLatLongFields(
  latText: string,
  lngText: string,
): { valid: true; lat: number | null; lng: number | null } | { valid: false; error: string } {
  const latNorm = latText.trim();
  const lngNorm = lngText.trim();
  const latEmpty = latNorm === '';
  const lngEmpty = lngNorm === '';
  if (latEmpty !== lngEmpty) {
    return { valid: false, error: 'Latitude và Longitude phải được điền cùng nhau hoặc cùng bỏ trống.' };
  }
  if (latEmpty) return { valid: true, lat: null, lng: null };

  const latNum = Number(latNorm);
  const lngNum = Number(lngNorm);
  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    return { valid: false, error: 'Latitude phải là số trong khoảng -90..90.' };
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
    return { valid: false, error: 'Longitude phải là số trong khoảng -180..180.' };
  }
  return { valid: true, lat: Math.round(latNum * 1e7) / 1e7, lng: Math.round(lngNum * 1e7) / 1e7 };
}

function validateRadiusField(radiusText: string): { valid: true; radius: number } | { valid: false; error: string } {
  const radiusNorm = radiusText.trim();
  // T0 correction: bán kính là trường Admin phải chủ động nhập/chọn —
  // để trống (không prefill giá trị mặc định) ⇒ báo lỗi, không tự 200.
  if (radiusNorm === '') {
    return { valid: false, error: 'Bán kính geofence là bắt buộc — Admin phải chủ động chọn bán kính (không dùng giá trị mặc định).' };
  }
  if (!/^\d+$/.test(radiusNorm)) {
    return { valid: false, error: 'Bán kính geofence phải là số nguyên dương.' };
  }
  const radius = Number(radiusNorm);
  if (radius < 1 || radius > 2000) {
    return { valid: false, error: 'Bán kính geofence phải từ 1 đến 2000 mét.' };
  }
  return { valid: true, radius };
}

// ─── Site create/edit modal ────────────────────────────────────────────────

type SiteFormMode = 'create' | 'edit';
type SiteFormState = { mode: SiteFormMode; site?: SiteGpsDto };

function SiteFormModal({
  formState,
  projectId,
  onClose,
  onSaved,
}: {
  formState: SiteFormState;
  projectId: string;
  onClose: () => void;
  onSaved: (flashText: string) => void;
}) {
  const site = formState.site;
  const isCreate = formState.mode === 'create';

  const [name, setName] = useState(site?.name ?? '');
  const [address, setAddress] = useState(site?.address ?? '');
  const [latText, setLatText] = useState(site?.latitude == null ? '' : String(site.latitude));
  const [lngText, setLngText] = useState(site?.longitude == null ? '' : String(site.longitude));
  // T0 correction: create KHÔNG prefill 200 — Admin phải chủ động nhập bán kính.
  const [radiusText, setRadiusText] = useState(site == null ? '' : String(site.radiusMeters));
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const clearCoordinates = () => {
    setLatText('');
    setLngText('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const latLong = validateLatLongFields(latText, lngText);
    if (!latLong.valid) {
      setErr(latLong.error);
      return;
    }
    const radius = validateRadiusField(radiusText);
    if (!radius.valid) {
      setErr(radius.error);
      return;
    }

    setSubmitting(true);
    setErr('');
    try {
      if (isCreate) {
        const body = {
          name: name.trim(),
          address: address.trim() || null,
          latitude: latLong.lat,
          longitude: latLong.lng,
          radiusMeters: radius.radius,
        };
        const idemKey =
          typeof globalThis.crypto?.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const res = await fetch(`/api/projects/${projectId}/sites`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', 'x-idempotency-key': idemKey },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(describeErrorMessage(data, `Lỗi ${res.status}`));
          return;
        }
        onSaved(
          latLong.lat == null
            ? 'Đã tạo Site (chưa có tọa độ). Check-in GPS cho Site này đang fail-closed đến khi cấu hình toạ độ.'
            : 'Đã tạo Site mới và xác nhận GPS ngay khi toạ độ đầy đủ.',
        );
      } else {
        const body = {
          address: address.trim() || null,
          latitude: latLong.lat,
          longitude: latLong.lng,
          radiusMeters: radius.radius,
        };
        const res = await fetch(`/api/projects/${projectId}/sites/${site!.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(describeErrorMessage(data, `Lỗi ${res.status}`));
          return;
        }
        onSaved(
          latLong.lat == null
            ? 'Đã bỏ toạ độ Site. Chấm công GPS sẽ fail-closed cho đến khi cấu hình toạ độ mới.'
            : 'Đã lưu cấu hình GPS. Toạ độ + bán kính hiện tại được đánh dấu "Admin đã xác nhận".',
        );
      }
      onClose();
    } catch {
      setErr('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    color: 'var(--on-surface)',
    borderColor: 'var(--outline-variant)',
  } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-gps-form-title"
      data-testid="site-gps-form-modal"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        style={{ background: 'var(--surface)', borderColor: 'var(--outline-variant)' }}
        className="w-[560px] max-w-full rounded-lg border shadow-xl"
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
          <h3 id="site-gps-form-title" style={{ color: 'var(--on-surface)' }} className="text-base font-semibold">
            {isCreate ? 'Thêm Site mới' : `Cấu hình GPS — ${site?.name ?? ''}`}
          </h3>
        </div>
        <form onSubmit={submit} className="px-4 py-4">
          {isCreate && (
            <label className="mb-3 block text-sm">
              <span style={{ color: 'var(--on-surface-variant)' }}>Tên Site *</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                data-testid="site-gps-name"
                className="mt-1 w-full rounded border px-2 py-1"
                style={inputStyle}
              />
            </label>
          )}
          <label className="mb-3 block text-sm">
            <span style={{ color: 'var(--on-surface-variant)' }}>Địa chỉ</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={500}
              data-testid="site-gps-address"
              className="mt-1 w-full rounded border px-2 py-1"
              style={inputStyle}
            />
          </label>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span style={{ color: 'var(--on-surface-variant)' }}>Latitude</span>
              <input
                type="text"
                inputMode="decimal"
                value={latText}
                onChange={(e) => setLatText(e.target.value)}
                data-testid="site-gps-latitude"
                placeholder="vd 21.4925"
                className="mt-1 w-full rounded border px-2 py-1"
                style={inputStyle}
              />
            </label>
            <label className="block text-sm">
              <span style={{ color: 'var(--on-surface-variant)' }}>Longitude</span>
              <input
                type="text"
                inputMode="decimal"
                value={lngText}
                onChange={(e) => setLngText(e.target.value)}
                data-testid="site-gps-longitude"
                placeholder="vd 105.8239"
                className="mt-1 w-full rounded border px-2 py-1"
                style={inputStyle}
              />
            </label>
          </div>
          <label className="mb-3 block text-sm">
            <span style={{ color: 'var(--on-surface-variant)' }}>Bán kính geofence (mét) * — Admin phải chủ động chọn</span>
            <input
              type="text"
              inputMode="numeric"
              value={radiusText}
              onChange={(e) => setRadiusText(e.target.value)}
              data-testid="site-gps-radius"
              placeholder="vd 800"
              className="mt-1 w-32 rounded border px-2 py-1"
              style={inputStyle}
            />
          </label>
          {!isCreate && (
            <button
              type="button"
              onClick={clearCoordinates}
              disabled={submitting}
              data-testid="site-gps-clear-coords"
              className="mb-3 text-xs underline"
              style={{ color: '#b45309' }}
            >
              Bỏ toạ độ (chấm công GPS sẽ fail-closed cho Site này)
            </button>
          )}
          {err && (
            <div
              className="mb-3 rounded border p-2 text-sm"
              style={{ background: '#ffebee', color: '#c62828', borderColor: '#c62828' }}
              data-testid="site-gps-form-error"
            >
              {err}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              data-testid="site-gps-cancel"
              style={{ color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}
              className="rounded border px-4 py-2 text-sm"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="site-gps-submit"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
              className="rounded px-4 py-2 text-sm font-semibold"
            >
              {submitting ? 'Đang lưu…' : isCreate ? 'Tạo Site' : 'Lưu cấu hình GPS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectGpsClient({ projectId, projectCode, sites, capability }: Props) {
  const [dialog, setDialog] = useState<SiteFormState | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  const canConfig = capability.canConfig;
  const confirmedCount = useMemo(
    () => sites.filter((s) => s.gpsStatus === 'CONFIRMED').length,
    [sites],
  );

  return (
    <section aria-labelledby="project-gps-heading" className="mb-8" data-testid="project-gps-section">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2
          id="project-gps-heading"
          style={{ color: 'var(--on-surface)' }}
          className="text-lg font-semibold"
        >
          Cấu hình GPS (Geofence) ({sites.length})
        </h2>
        <span data-testid="project-gps-confirmed-count" style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
          {confirmedCount}/{sites.length} đã Admin xác nhận
        </span>
        {canConfig && (
          <button
            type="button"
            data-testid="project-gps-add"
            onClick={() => setDialog({ mode: 'create' })}
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            className="ml-auto rounded px-3 py-1.5 text-sm font-semibold"
          >
            Thêm Site mới
          </button>
        )}
      </div>

      {flash && (
        <div
          role="status"
          data-testid={`project-gps-flash-${flash.kind}`}
          className="mb-3 rounded border p-3 text-sm"
          style={{
            background: flash.kind === 'success' ? '#e8f5e9' : '#ffebee',
            color: flash.kind === 'success' ? '#197a56' : '#c62828',
            borderColor: flash.kind === 'success' ? '#197a56' : '#c62828',
          }}
        >
          {flash.text}
        </div>
      )}

      {!canConfig && (
        <div
          data-testid="project-gps-readonly-banner"
          className="mb-3 rounded border px-3 py-2 text-xs"
          style={{
            background: 'var(--surface-container)',
            color: 'var(--on-surface-variant)',
            borderColor: 'var(--outline-variant)',
          }}
        >
          Vai trò hiện tại chỉ được XEM cấu hình GPS. Chỉ Quản trị (ADMIN) và Ban Giám đốc (DIRECTOR) được cấu hình
          toạ độ/bán kính geofence.
        </div>
      )}

      <p className="mb-3 text-xs" style={{ color: 'var(--on-surface-variant)' }} data-testid="project-gps-hint">
        Site đủ điều kiện chấm công GPS phải có toạ độ (lat + lng) VÀ nhãn "Đã Admin xác nhận". Chấm công đang
        fail-closed đối với Site chưa cấu hình/toạ độ chưa được xác nhận.
      </p>

      {sites.length === 0 ? (
        <div
          style={{
            background: 'var(--surface-container-lowest)',
            color: 'var(--on-surface-variant)',
            borderColor: 'var(--outline-variant)',
          }}
          className="rounded-lg border p-6 text-center text-sm"
          data-testid="project-gps-empty"
        >
          Dự án {projectCode} chưa có Site nào.{' '}
          {canConfig
            ? 'Dùng "Thêm Site mới" ở trên để tạo Site gắn vào dự án này.'
            : 'Quản trị/Ban Giám đốc sẽ tạo Site + cấu hình GPS geofence.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--outline-variant)' }}>
          <table className="w-full text-sm" data-testid="project-gps-table">
            <thead>
              <tr style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                {['Tên Site', 'Địa chỉ', 'Latitude', 'Longitude', 'Bán kính (m)', 'Trạng thái GPS', 'Xác nhận lần cuối', 'Hành động'].map(
                  (h) => (
                    <th key={h} style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} data-testid={`project-gps-row-${site.id}`} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                  <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 font-medium">
                    {site.name}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                    {site.address ?? '—'}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 font-mono text-xs">
                    {fmtCoord(site.latitude)}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 font-mono text-xs">
                    {fmtCoord(site.longitude)}
                  </td>
                  <td style={{ color: 'var(--on-surface)' }} className="px-3 py-2 text-xs">
                    {site.radiusMeters}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      data-testid={`project-gps-status-${site.id}`}
                      className="rounded px-2 py-0.5"
                      style={{ color: '#fff', background: gpsStatusTone(site) }}
                    >
                      {gpsStatusLabel(site)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)' }} className="px-3 py-2 text-xs">
                    {site.geoConfirmedAt ? formatDate(site.geoConfirmedAt) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {canConfig ? (
                      <button
                        type="button"
                        data-testid={`project-gps-edit-${site.id}`}
                        onClick={() => setDialog({ mode: 'edit', site })}
                        style={{ color: 'var(--primary)' }}
                        className="hover:underline"
                      >
                        Chỉnh sửa
                      </button>
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

      {dialog && (
        <SiteFormModal
          formState={dialog}
          projectId={projectId}
          onClose={() => setDialog(null)}
          onSaved={(text) => {
            setDialog(null);
            setFlash({ kind: 'success', text });
            // Refresh server component để bảng + metrics lấy DTO mới.
            window.location.reload();
          }}
        />
      )}
    </section>
  );
}
