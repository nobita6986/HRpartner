'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function HandlingAssignmentManager({
  laborProfileId,
  activeAssignment,
}: {
  laborProfileId: string;
  activeAssignment: {
    id: string;
    assigneeUserId: string;
    assigneeName: string | null;
    source: string;
    startsAt: string;
    expiresAt: string | null;
  } | null;
}) {
  const router = useRouter();
  const [isManaging, setIsManaging] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [assignableUsers, setAssignableUsers] = useState<{ id: string; name: string | null; role: string }[]>([]);
  
  const [newAssigneeUserId, setNewAssigneeUserId] = useState('');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<string>('');

  const isExpired = activeAssignment?.expiresAt && new Date(activeAssignment.expiresAt) < new Date();
  
  const isCompanyPool = !activeAssignment || isExpired;

  useEffect(() => {
    if (isManaging && assignableUsers.length === 0) {
      fetch('/api/admin/handling-assignable-users')
        .then(res => res.json())
        .then(data => {
          if (data.users) setAssignableUsers(data.users);
        })
        .catch(err => console.error('Error fetching users', err));
    }
  }, [isManaging, assignableUsers.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      alert('Vui lòng nhập lý do (Reason).');
      return;
    }

    setLoading(true);
    try {
      // AFF-05A-R2: the route treats `days` as property-presence. Only include
      // it when the user picked a new assignee; the server picks the default
      // when the property is absent. For new assignees, send the parsed
      // integer (or omit the property when the input is blank so the server
      // falls back to the 7-day default — never pre-coerce at the client).
      const daysPayload = newAssigneeUserId
        ? days.trim() === ''
          ? undefined
          : Number(days)
        : undefined;
      const res = await fetch(`/api/admin/labor-profiles/${laborProfileId}/handling-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAssigneeUserId: newAssigneeUserId || null,
          reason,
          ...(daysPayload === undefined ? {} : { days: daysPayload }),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Có lỗi xảy ra');
      }

      setIsManaging(false);
      setNewAssigneeUserId('');
      setReason('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'AFF_INITIAL': return 'Giao ban đầu (Affiliate)';
      case 'MANAGER_ASSIGNMENT': return 'Quản lý giao';
      case 'CASE_RESOLUTION': return 'Độ phân giải Case';
      default: return src;
    }
  };

  const [history, setHistory] = useState<Record<string, any>[] | null | undefined>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = async () => {
    if (history === null) {
      try {
        const res = await fetch(`/api/admin/labor-profiles/${laborProfileId}/handling-assignment-history`);
        if (res.status === 403) {
          setHistory(undefined); // Special state for forbidden
        } else {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${isCompanyPool ? 'border-gray-300' : 'border-l-4 border-l-blue-500'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Người phụ trách (Handling)</h2>
          {isCompanyPool ? (
            <div className="mt-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded inline-block font-medium">
              Kho chung (Company Pool)
              {isExpired && ' - Hết hạn'}
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-900">
              <span className="font-semibold">{activeAssignment.assigneeName || 'Không có quyền xem'}</span>
              <span className="text-gray-500 ml-2">({getSourceLabel(activeAssignment.source)})</span>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={fetchHistory}
            className="text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors border border-gray-200"
          >
            {showHistory ? 'Đóng lịch sử' : 'Lịch sử'}
          </button>
          <button 
            onClick={() => setIsManaging(!isManaging)}
            className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {isManaging ? 'Đóng quản lý' : 'Quản lý'}
          </button>
        </div>
      </div>

      {!isCompanyPool && activeAssignment && (
        <div className="text-sm text-gray-500 mb-4">
          Thời hạn: {activeAssignment.expiresAt ? new Date(activeAssignment.expiresAt).toLocaleDateString('vi-VN') : 'Vô thời hạn'} 
          {activeAssignment.expiresAt && (
            <span className="ml-2">({Math.ceil((new Date(activeAssignment.expiresAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} ngày còn lại)</span>
          )}
        </div>
      )}

      {showHistory && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold mb-3">Lịch sử giao nhận</h3>
          {history === undefined ? (
            <p className="text-sm text-gray-500 italic">Không có quyền xem lịch sử.</p>
          ) : history === null ? (
            <p className="text-sm text-gray-500">Đang tải...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có lịch sử.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((h, i) => (
                <li key={h.id} className="text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between font-medium">
                    <span>{h.assigneeUser?.name || 'Không rõ'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${h.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Nguồn: {getSourceLabel(h.source)} | Ngày: {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                  {h.reason && <div className="text-xs text-gray-600 mt-1 italic">"{h.reason}"</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isManaging && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Hành động Gán / Chuyển giao / Thu hồi</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Người phụ trách mới (Để trống để thu hồi về Kho chung)</label>
              <select 
                value={newAssigneeUserId} 
                onChange={e => setNewAssigneeUserId(e.target.value)}
                className="w-full text-sm border-blue-200 rounded-md p-2 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Chọn người phụ trách --</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name || 'Không có tên'} ({u.role})</option>
                ))}
              </select>
            </div>
            
            {newAssigneeUserId && (
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Số ngày thời hạn (1–30, để trống = mặc định 7 ngày)</label>
                <input
                  type="number"
                  value={days}
                  onChange={e => setDays(e.target.value)}
                  min="1"
                  max="30"
                  step="1"
                  className="w-full text-sm border-blue-200 rounded-md p-2 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">Lý do (bắt buộc)</label>
              <input 
                type="text" 
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                placeholder="Ví dụ: Gán theo yêu cầu..."
                className="w-full text-sm border-blue-200 rounded-md p-2 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : (newAssigneeUserId ? 'Gán / Chuyển giao' : 'Thu hồi về Kho chung')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
