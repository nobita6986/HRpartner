'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewLaborProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [source, setSource] = useState('OFFLINE');
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [possibleMatches, setPossibleMatches] = useState<any[]>([]);
  const [forceNew, setForceNew] = useState(false);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConsent) {
      setError('Bắt buộc phải có sự đồng ý của người lao động.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/labor-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          cccdNumber: cccdNumber.trim() || undefined,
          source,
          consent: hasConsent,
          forceNew,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (data.error === 'POSSIBLE_MATCH') {
          setPossibleMatches(data.candidates || []);
          setStep(3); // Go to possible match resolution step
          setLoading(false);
          return;
        }
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Lỗi hệ thống');
      }

      const data = await res.json();
      router.push(`/admin/labor-profiles/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleForceNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setForceNew(true);
    // Directly submit again with forceNew = true
    await handleSubmit(e);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin/labor-profiles" className="text-sm font-medium text-blue-600 hover:underline flex items-center mb-4">
          &larr; Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Tiếp nhận hồ sơ</h1>
        <p className="text-gray-500 mt-2 text-sm">Nhập thông tin cơ bản để lưu hồ sơ người lao động.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-4 mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
            1
          </div>
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 2 ? 'bg-blue-600 text-white' : step > 2 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            2
          </div>
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            3
          </div>
        </div>
        
        <div className="mb-6 flex justify-between px-2 text-xs text-gray-500 font-medium">
          <span>Tiếp nhận nhanh</span>
          <span>Nguồn & Pháp lý</span>
          <span>Đối chiếu (Nếu có)</span>
        </div>

        <form onSubmit={step === 1 ? handleNextStep1 : step === 2 ? handleSubmit : handleForceNew} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-gray-900">Tiếp nhận nhanh</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0912345678"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-gray-900">Nguồn & Pháp lý</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số CCCD (không bắt buộc)</label>
                <input
                  type="text"
                  value={cccdNumber}
                  onChange={(e) => setCccdNumber(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="001099123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn tiếp nhận *</label>
                <select 
                  value={source} 
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="OFFLINE">Trực tiếp (Offline)</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="ZALO">Zalo</option>
                  <option value="REFERRAL">Giới thiệu (Referral)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <input 
                  type="checkbox" 
                  id="consent" 
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                  required
                />
                <label htmlFor="consent" className="text-sm font-medium text-gray-700">
                  Xác nhận người lao động đã đồng ý cung cấp thông tin *
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-gray-900">Phát hiện hồ sơ có thể trùng lặp! (POSSIBLE_MATCH)</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 mb-3">Hệ thống phát hiện {possibleMatches.length} hồ sơ có thể thuộc về người lao động này, nhưng có dữ liệu xung đột. Vui lòng kiểm tra kỹ trước khi tạo mới.</p>
                <ul className="space-y-2 mb-4">
                  {possibleMatches.map((m, idx) => (
                    <li key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-yellow-100">
                      <div>
                        <span className="block font-medium">Hồ sơ ID: {m.laborProfileId}</span>
                        <span className="text-xs text-gray-500">Trùng: {m.signalsMatched?.join(', ')}</span>
                      </div>
                      <Link href={`/admin/labor-profiles/${m.laborProfileId}`} target="_blank" className="text-blue-600 hover:underline font-medium">
                        Xem chi tiết
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step === 3 ? 2 : 1)}
                className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Quay lại
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              onClick={step === 3 ? handleForceNew : undefined}
              className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : step === 3 ? 'Bỏ qua & Tạo mới' : step === 2 ? 'Lưu hồ sơ' : 'Tiếp tục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
