'use client';

import { useCallback, useEffect, useState } from 'react';

interface BiConfigSummary {
  baseUrl: string;
  hasApiKey: boolean;
  workerSyncCheckpoint: string | null;
  updatedAt: string | null;
}

interface BiRunItem {
  id: string;
  triggerSource: string;
  mode: string;
  status: string;
  checkpointBefore: string | null;
  checkpointAfter: string | null;
  catalogProjectsSynced: number;
  episodesFetched: number;
  episodesApplied: number;
  episodesSkipped: number;
  tombstonesProcessed: number;
  exceptionsOpened: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface BiExceptionItem {
  id: string;
  exceptionType: string;
  externalId: string;
  projectExternalId: string | null;
  status: string;
  lastSyncVersion: string;
  summary: string;
  updatedAt: string;
}

interface BiProjectMappingItem {
  externalProjectId: string;
  lastSyncVersion: string;
  hrpProjectId: string | null;
  hrpProjectCode: string | null;
  hrpProjectName: string | null;
  hasConfirmedGps: boolean;
  geoConfirmedAt: string | null;
  radiusMeters: number | null;
}

interface ScopedProjectOption {
  id: string;
  code: string;
  name: string;
}

interface InitialCredentialRow {
  userId: string;
  workerId: string;
  fullName: string;
  cccdNumber: string;
  phone: string | null;
  employeeCode: string;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  recruiterName: string | null;
  recruiterCode: string | null;
  validFrom: string | null;
  initialPassword: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

export default function AdminBiIntegrationPage() {
  const [role, setRole] = useState<string>('');
  const [config, setConfig] = useState<BiConfigSummary | null>(null);
  const [baseUrlInput, setBaseUrlInput] = useState('https://bi.hrpartner.vn/api/integrations/hrp/v1');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [runs, setRuns] = useState<BiRunItem[]>([]);
  const [exceptions, setExceptions] = useState<BiExceptionItem[]>([]);
  const [projectMappings, setProjectMappings] = useState<BiProjectMappingItem[]>([]);
  const [projects, setProjects] = useState<ScopedProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [credentials, setCredentials] = useState<InitialCredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingMode, setSyncingMode] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/integrations/bi', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: 'err', text: data.message || 'Không thể tải dữ liệu tích hợp BI.' });
        return;
      }
      setRole(data.role || '');
      if (data.config) {
        setConfig(data.config);
        setBaseUrlInput(data.config.baseUrl);
      }
      setRuns(Array.isArray(data.runs) ? data.runs : []);
      setExceptions(Array.isArray(data.exceptions) ? data.exceptions : []);
      setProjectMappings(Array.isArray(data.projectMappings) ? data.projectMappings : []);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setNotice({ type: 'err', text: 'Lỗi kết nối khi tải trang tích hợp BI.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCredentials = useCallback(async (projectId: string) => {
    try {
      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      const res = await fetch(`/api/admin/integrations/bi/credentials${qs}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setCredentials(data.items);
      }
    } catch {
      // Keep current list on transient error
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadCredentials(selectedProjectId);
  }, [selectedProjectId, loadCredentials]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/integrations/bi', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrlInput.trim(),
          ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: 'err', text: data.message || 'Không thể lưu cấu hình.' });
        return;
      }
      setApiKeyInput('');
      setNotice({ type: 'ok', text: 'Đã lưu cấu hình kết nối BI vào Vault an toàn.' });
      await loadDashboard();
    } catch {
      setNotice({ type: 'err', text: 'Lỗi mạng khi lưu cấu hình BI.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunSync = async (mode: 'INCREMENTAL' | 'FULL_RESYNC') => {
    setSyncingMode(mode);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/integrations/bi/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          type: 'err',
          text:
            data.summary?.errorMessage ||
            data.message ||
            'Đồng bộ BI thất bại. Vui lòng kiểm tra lịch sử lượt chạy.',
        });
      } else {
        const s = data.summary;
        setNotice({
          type: 'ok',
          text: `Đồng bộ hoàn tất (${s.status}): ${s.catalogProjectsSynced} dự án, ${s.episodesApplied} đợt áp dụng, ${s.episodesSkipped} đợt bỏ qua, ${s.tombstonesProcessed} tombstone.`,
        });
      }
      await loadDashboard();
      await loadCredentials(selectedProjectId);
    } catch {
      setNotice({ type: 'err', text: 'Lỗi mạng khi kích hoạt đồng bộ BI.' });
    } finally {
      setSyncingMode(null);
    }
  };

  const handleRegeneratePassword = async (workerId: string, fullName: string) => {
    setNotice(null);
    try {
      const res = await fetch('/api/admin/integrations/bi/credentials', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: 'err', text: data.message || 'Không thể cấp lại mật khẩu.' });
        return;
      }
      setNotice({
        type: 'ok',
        text: `Đã cấp lại mật khẩu ban đầu mới cho NLĐ ${fullName}: ${data.credential.initialPassword}`,
      });
      await loadCredentials(selectedProjectId);
    } catch {
      setNotice({ type: 'err', text: 'Lỗi kết nối khi cấp lại mật khẩu.' });
    }
  };

  const exportUrl = selectedProjectId
    ? `/api/admin/integrations/bi/credentials/export?projectId=${encodeURIComponent(selectedProjectId)}`
    : '/api/admin/integrations/bi/credentials/export';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tích hợp Mini-BI → HRP (Đồng bộ Nhân sự, Dự án & Mật khẩu ban đầu)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Lịch tự động: 06:00, 10:00, 14:00, 18:00 hằng ngày (4h/lần) · Hỗ trợ đăng nhập bằng CCCD + mật khẩu ban đầu
          </p>
        </div>

        {(role === 'ADMIN' || role === 'HR_MANAGER') && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleRunSync('INCREMENTAL')}
              disabled={syncingMode !== null}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
            >
              {syncingMode === 'INCREMENTAL' ? 'Đang đồng bộ…' : 'Đồng bộ ngay (Từ Checkpoint)'}
            </button>
            <button
              type="button"
              onClick={() => handleRunSync('FULL_RESYNC')}
              disabled={syncingMode !== null}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncingMode === 'FULL_RESYNC' ? 'Đang đối soát…' : 'Đối soát từ đầu (Full Resync)'}
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            notice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Khu vực 1: Mật khẩu ban đầu cho QLDA / HR / Admin */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              1. Danh sách Mật khẩu ban đầu NLĐ (Chưa đổi mật khẩu lần đầu)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              QLDA xuất Excel để gửi tài khoản (Số CCCD + Mật khẩu ban đầu) cho NLĐ. Ngay khi NLĐ đổi mật khẩu lần đầu, mật khẩu ban đầu sẽ tự động xóa khỏi bảng này.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
            >
              <option value="">Tất cả dự án trong phạm vi quản lý</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>

            <a
              href={exportUrl}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
            >
              Xuất Excel (.xlsx)
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3">Dự án</th>
                <th className="py-2.5 px-3">Mã NV</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Số CCCD (TK đăng nhập)</th>
                <th className="py-2.5 px-3">Mật khẩu ban đầu</th>
                <th className="py-2.5 px-3">Người tuyển</th>
                <th className="py-2.5 px-3">Ngày vào</th>
                {(role === 'ADMIN' || role === 'HR_MANAGER') && (
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {credentials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    {loading
                      ? 'Đang tải danh sách…'
                      : 'Không có NLĐ nào đang chờ cấp phát mật khẩu ban đầu trong phạm vi đã chọn.'}
                  </td>
                </tr>
              ) : (
                credentials.map((item) => (
                  <tr key={item.userId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {item.projectName || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                      {item.employeeCode}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{item.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-900">{item.cccdNumber}</td>
                    <td className="py-2.5 px-3">
                      <code className="px-2 py-1 rounded bg-amber-50 border border-amber-200 font-mono text-xs font-bold text-amber-900">
                        {item.initialPassword}
                      </code>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.recruiterName
                        ? `${item.recruiterName}${item.recruiterCode ? ` (${item.recruiterCode})` : ''}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.validFrom || '—'}</td>
                    {(role === 'ADMIN' || role === 'HR_MANAGER') && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRegeneratePassword(item.workerId, item.fullName)}
                          className="text-xs font-semibold text-orange-600 hover:underline"
                        >
                          Cấp lại MK
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Khu vực 2: Cấu hình kết nối API BI (Chỉ ADMIN) */}
      {role === 'ADMIN' && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            2. Cấu hình kết nối M2M Mini-BI & Trạng thái Checkpoint
          </h2>
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                BI Base URL
              </label>
              <input
                type="url"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://bi.hrpartner.vn/api/integrations/hrp/v1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Bearer API Key ({config?.hasApiKey ? 'Đã lưu trong Vault — nhập để xoay key' : 'Chưa cấu hình'})
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nhập HRP_SYNC_API_KEY từ bên BI…"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
              >
                {savingConfig ? 'Đang lưu…' : 'Lưu cấu hình Vault'}
              </button>
            </div>
          </form>

          <div className="text-xs text-slate-600 flex flex-wrap gap-6 pt-2 border-t border-slate-100">
            <span>
              <strong>Opaque Checkpoint hiện tại:</strong>{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                {config?.workerSyncCheckpoint || 'Chưa có (sẽ kéo từ đầu)'}
              </code>
            </span>
            <span>
              <strong>Cập nhật lần cuối:</strong> {config?.updatedAt || '—'}
            </span>
          </div>
        </section>
      )}

      {/* Khu vực 3: Ngoại lệ đồng bộ đang mở */}
      {role !== 'PM' && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            3. Ngoại lệ đồng bộ cần lưu ý ({exceptions.length} đang mở)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-2 px-3">Loại ngoại lệ</th>
                  <th className="py-2 px-3">Mã đối tượng BI</th>
                  <th className="py-2 px-3">Dự án BI</th>
                  <th className="py-2 px-3">sync_version</th>
                  <th className="py-2 px-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500">
                      Không có ngoại lệ nào đang mở.
                    </td>
                  </tr>
                ) : (
                  exceptions.map((ex) => (
                    <tr key={ex.id}>
                      <td className="py-2 px-3 font-mono text-xs font-semibold text-amber-800">
                        {ex.exceptionType}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{ex.externalId}</td>
                      <td className="py-2 px-3 font-mono text-xs">{ex.projectExternalId || '—'}</td>
                      <td className="py-2 px-3 font-mono text-xs">{ex.lastSyncVersion}</td>
                      <td className="py-2 px-3 text-slate-700">{ex.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Khu vực 4: Ánh xạ dự án BI ↔ Dự án HRP & tọa độ GPS */}
      {role !== 'PM' && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            4. Ánh xạ Dự án BI Catalog ↔ Dự án HRP & Trạng thái GPS Check-in
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-2 px-3">Mã dự án BI</th>
                  <th className="py-2 px-3">Mã dự án HRP</th>
                  <th className="py-2 px-3">Tên dự án HRP</th>
                  <th className="py-2 px-3">Trạng thái tọa độ GPS (Catalog)</th>
                  <th className="py-2 px-3">Bán kính</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectMappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500">
                      Chưa có dự án nào được đồng bộ từ BI Catalog.
                    </td>
                  </tr>
                ) : (
                  projectMappings.map((pm) => (
                    <tr key={pm.externalProjectId}>
                      <td className="py-2 px-3 font-mono text-xs">{pm.externalProjectId}</td>
                      <td className="py-2 px-3 font-mono text-xs">{pm.hrpProjectCode || '—'}</td>
                      <td className="py-2 px-3 font-medium">{pm.hrpProjectName || '—'}</td>
                      <td className="py-2 px-3">
                        {pm.hasConfirmedGps ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                            Đã xác nhận GPS ({pm.geoConfirmedAt?.slice(0, 10)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700">
                            Chưa có tọa độ xác nhận (Khóa check-in an toàn)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {pm.radiusMeters ? `${pm.radiusMeters}m` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Khu vực 5: Lịch sử lượt chạy đồng bộ */}
      {role !== 'PM' && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            5. Lịch sử các lượt chạy đồng bộ (`bi_sync_runs`)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3">Nguồn / Chế độ</th>
                  <th className="py-2 px-3">Trạng thái</th>
                  <th className="py-2 px-3">Dự án</th>
                  <th className="py-2 px-3">Đợt áp dụng / Bỏ qua / Tombstone</th>
                  <th className="py-2 px-3">Lỗi (nếu có)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-slate-500">
                      Chưa có lượt chạy đồng bộ nào.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 text-xs text-slate-600">{r.startedAt}</td>
                      <td className="py-2 px-3 text-xs font-mono">
                        {r.triggerSource} / {r.mode}
                      </td>
                      <td className="py-2 px-3 text-xs font-semibold">{r.status}</td>
                      <td className="py-2 px-3 text-xs">{r.catalogProjectsSynced}</td>
                      <td className="py-2 px-3 text-xs">
                        {r.episodesApplied} áp dụng · {r.episodesSkipped} skip · {r.tombstonesProcessed}{' '}
                        tombstone
                      </td>
                      <td className="py-2 px-3 text-xs text-rose-700">
                        {r.errorMessage ? `${r.errorCode}: ${r.errorMessage}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
