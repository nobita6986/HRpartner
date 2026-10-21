'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface CandidateUserOption {
  id: string;
  name: string | null;
  phone: string | null;
  phoneVerified: boolean;
  isActive: boolean;
  matchedByPhone: boolean;
}

interface OpenSlotOption {
  slotId: string;
  positionCode: string;
  positionTitle: string;
  workLocation: string | null;
  slotsNeeded: number;
  slotsFilled: number;
  remaining: number;
  staffingOrderId: string;
  staffingOrderCode: string;
  staffingOrderTitle: string;
  projectId: string;
  projectCode: string;
  projectName: string;
}

interface ActiveAssignmentSummary {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  employeeCode: string;
  employmentType: string;
  workSetting: string | null;
}

interface AccountContextResponse {
  worker: {
    id: string;
    userId: string;
    fullName: string | null;
    phone: string | null;
    profileStatus: string;
    employmentStatus: string;
    accountUserId: string | null;
    activeAssignment: ActiveAssignmentSummary | null;
  };
  linkedUser: CandidateUserOption | null;
  candidateUsers: CandidateUserOption[];
  openSlots: OpenSlotOption[];
}

export function WorkerAccountLink({
  workerId,
  accountUserId: initialAccountUserId,
}: {
  workerId: string;
  accountUserId: string | null;
}) {
  const [ctx, setCtx] = useState<AccountContextResponse | null>(null);
  const [userId, setUserId] = useState('');
  const [allowPhoneUpdate, setAllowPhoneUpdate] = useState(true);
  const [slotId, setSlotId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [employmentType, setEmploymentType] = useState('HRP_EMPLOYED');
  const [workSetting, setWorkSetting] = useState('PHOTHONG');
  const [replaceActiveAssignment, setReplaceActiveAssignment] = useState(false);
  const [reason, setReason] = useState('');
  const [unlinkReason, setUnlinkReason] = useState('');
  const [showUnlink, setShowUnlink] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadContext = async () => {
    try {
      const res = await fetch(`/api/admin/workers/${encodeURIComponent(workerId)}/account`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as AccountContextResponse;
      setCtx(data);
      if (!data.worker.accountUserId && data.candidateUsers.length > 0) {
        const matched = data.candidateUsers.find((u) => u.matchedByPhone);
        if (matched) setUserId(matched.id);
      }
      if (data.worker.activeAssignment?.employeeCode) {
        setEmployeeCode(data.worker.activeAssignment.employeeCode);
      } else if (data.worker.userId) {
        setEmployeeCode(data.worker.userId);
      }
    } catch {
      // Fallback: vẫn cho phép nhập thủ công nếu tải gợi ý thất bại
    }
  };

  useEffect(() => {
    void loadContext();
  }, [workerId]);

  const currentAccountId = ctx ? ctx.worker.accountUserId : initialAccountUserId;

  async function submitLinkOrAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setErrorMsg('');
    try {
      const response = await fetch(`/api/admin/workers/${encodeURIComponent(workerId)}/account`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim() || null,
          autoVerifyAndActivate: true,
          allowPhoneUpdate,
          slotId: slotId || null,
          employeeCode: slotId ? employeeCode.trim() : null,
          employmentType: slotId ? employmentType : null,
          workSetting: slotId ? workSetting : null,
          replaceActiveAssignment,
          reason: reason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể cập nhật liên kết / phân công.');
      setMessage('Đã cập nhật liên kết tài khoản / phân công dự án thành công. Hãy tải lại trang để đồng bộ toàn bộ thông tin.');
      setReason('');
      setSlotId('');
      await loadContext();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể cập nhật liên kết tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink() {
    if (!unlinkReason.trim()) return;
    setLoading(true);
    setMessage('');
    setErrorMsg('');
    try {
      const response = await fetch(`/api/admin/workers/${encodeURIComponent(workerId)}/account`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: unlinkReason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể gỡ liên kết tài khoản.');
      setMessage('Đã gỡ liên kết tài khoản đăng nhập.');
      setShowUnlink(false);
      setUnlinkReason('');
      await loadContext();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể gỡ liên kết tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mt-4 rounded-lg border p-3 space-y-3"
      style={{ borderColor: 'var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--on-surface)]">
          Quản trị Tài khoản đăng nhập & Phân công dự án (Toàn quyền Admin)
        </p>
        {currentAccountId && (
          <button
            type="button"
            onClick={() => setShowUnlink((v) => !v)}
            className="rounded border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            {showUnlink ? 'Đóng gỡ liên kết' : 'Gỡ liên kết tài khoản'}
          </button>
        )}
      </div>

      {currentAccountId && (
        <div className="text-xs text-[var(--on-surface-variant)] space-y-1">
          <p>
            Tài khoản đăng nhập: <code className="font-mono text-[var(--primary)]">{currentAccountId}</code>
            {ctx?.linkedUser && (
              <>
                {' · '}
                {ctx.linkedUser.name ?? '—'} ({ctx.linkedUser.phone ?? '—'}) ·{' '}
                <strong>{ctx.linkedUser.phoneVerified ? 'Đã xác minh SĐT' : 'Chưa xác minh SĐT'}</strong>
              </>
            )}
          </p>
        </div>
      )}

      {showUnlink && currentAccountId && (
        <div
          className="rounded border p-2.5 space-y-2"
          style={{ borderColor: 'var(--error)', background: 'var(--surface)' }}
        >
          <label className="block text-xs">
            Lý do gỡ liên kết tài khoản
            <input
              value={unlinkReason}
              onChange={(e) => setUnlinkReason(e.target.value)}
              maxLength={500}
              placeholder="Nhập lý do gỡ liên kết…"
              className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs"
            />
          </label>
          <button
            type="button"
            disabled={loading || !unlinkReason.trim()}
            onClick={handleUnlink}
            style={{ background: 'var(--error)', color: 'var(--on-primary)' }}
            className="rounded px-3 py-1 text-xs font-semibold disabled:opacity-50"
          >
            Xác nhận gỡ liên kết
          </button>
        </div>
      )}

      <form onSubmit={submitLinkOrAssign} className="space-y-2.5">
        {!currentAccountId && (
          <>
            <p className="text-xs text-[var(--on-surface-variant)]">
              Chọn tài khoản đăng ký (vai trò WORKER) hoặc nhập ID tài khoản. Hệ thống sẽ tự động xác minh SĐT và kích hoạt hồ sơ ở trạng thái Đã xác minh / Đang làm việc.
            </p>
            {ctx && ctx.candidateUsers.length > 0 && (
              <label className="block text-xs">
                Chọn nhanh tài khoản WORKER chưa liên kết
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs"
                >
                  <option value="">— Chọn tài khoản hoặc nhập ID bên dưới —</option>
                  {ctx.candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.matchedByPhone ? '[Trùng SĐT] ' : ''}
                      {u.name ?? 'Chưa có tên'} — {u.phone ?? '—'} (
                      {u.phoneVerified ? 'Đã xác minh SĐT' : 'Chưa xác minh OTP'}) [{u.id.slice(0, 8)}…]
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-xs">
              ID tài khoản WORKER
              <input
                required={!slotId}
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="UUID tài khoản WORKER"
                className="mt-1 w-full rounded border px-3 py-1.5 text-xs font-mono"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
              <input
                type="checkbox"
                checked={allowPhoneUpdate}
                onChange={(e) => setAllowPhoneUpdate(e.target.checked)}
              />
              Cho phép đồng bộ số điện thoại từ tài khoản đăng nhập sang hồ sơ nếu khác nhau
            </label>
          </>
        )}

        {ctx && (
          <div className="space-y-2 pt-1">
            <label className="block text-xs">
              Gán vào Dự án / Vị trí đang mở (tùy chọn)
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className="mt-1 w-full rounded border px-2.5 py-1.5 text-xs"
              >
                <option value="">
                  {ctx.worker.activeAssignment
                    ? `— Giữ nguyên phân công hiện tại (${ctx.worker.activeAssignment.projectCode}) —`
                    : '— Không gán dự án ngay (chỉ liên kết / kích hoạt tài khoản) —'}
                </option>
                {ctx.openSlots.map((s) => (
                  <option key={s.slotId} value={s.slotId}>
                    [{s.projectCode}] {s.projectName} · Đơn {s.staffingOrderCode}: {s.positionTitle} (Còn {s.remaining}/{s.slotsNeeded} chỗ)
                  </option>
                ))}
              </select>
            </label>

            {slotId && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="block text-xs">
                  Mã NV tại dự án
                  <input
                    required
                    maxLength={64}
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs font-mono"
                  />
                </label>
                <label className="block text-xs">
                  Hình thức
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  >
                    <option value="HRP_EMPLOYED">Biên chế HRP</option>
                    <option value="OUTSOURCED">Thuê ngoài / Khoán</option>
                    <option value="REFERRED_OUT">Giới thiệu</option>
                  </select>
                </label>
                <label className="block text-xs">
                  Môi trường
                  <select
                    value={workSetting}
                    onChange={(e) => setWorkSetting(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  >
                    <option value="PHOTHONG">Phổ thông</option>
                    <option value="CONGXUONG">Công xưởng</option>
                    <option value="VANPHONG">Văn phòng</option>
                  </select>
                </label>
              </div>
            )}

            {slotId && ctx.worker.activeAssignment && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={replaceActiveAssignment}
                  onChange={(e) => setReplaceActiveAssignment(e.target.checked)}
                />
                Kết thúc phân công hiện tại ({ctx.worker.activeAssignment.projectCode}) để chuyển sang vị trí mới
              </label>
            )}
          </div>
        )}

        <label className="block text-xs">
          Lý do liên kết / phân công
          <input
            required
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="VD: Admin xác thực thủ công và gán dự án cho người lao động"
            className="mt-1 w-full rounded border px-3 py-1.5 text-xs"
          />
        </label>

        <button
          disabled={loading || (!currentAccountId && !userId.trim() && !slotId)}
          className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--on-primary)] disabled:opacity-50"
        >
          {loading
            ? 'Đang xử lý…'
            : !currentAccountId && slotId
              ? 'Liên kết tài khoản & Gán dự án'
              : !currentAccountId
                ? 'Liên kết tài khoản & Kích hoạt'
                : 'Cập nhật phân công / Kích hoạt'}
        </button>

        {message && (
          <p role="status" className="text-xs font-medium" style={{ color: '#197a56' }}>
            {message}
          </p>
        )}
        {errorMsg && (
          <p role="alert" className="text-xs font-medium" style={{ color: 'var(--error)' }}>
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}
