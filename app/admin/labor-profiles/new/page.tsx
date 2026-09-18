'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewLaborProfilePage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [channel, setChannel] = useState('OFFLINE');
  const [hasConsent, setHasConsent] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dedupMatches, setDedupMatches] = useState<any[]>([]);

  const checkDedup = async () => {
    try {
      const res = await fetch(`/api/admin/labor-profiles?exactPhone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setDedupMatches(data.items || []);
      }
    } catch (e) {
      console.error('Dedup check failed', e);
    }
  };

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }
    setError('');
    setLoading(true);
    await checkDedup();
    setLoading(false);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          cccdNumber: cccdNumber.trim() || undefined,
          channel,
          consent: hasConsent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đã có lỗi xảy ra');
      }

      router.push(`/admin/labor-profiles/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tiếp nhận NLD mới</h1>
        <p className="text-gray-500 mt-2 text-sm">Nhập thông tin cơ bản để tạo hồ sơ hoặc đối chiếu trùng lặp với hệ thống.</p>
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
          <span>Đối chiếu trùng lặp</span>
          <span>Ghi nhận thông tin</span>
        </div>

        <form onSubmit={step === 1 ? handleNextStep1 : step === 2 ? handleNextStep2 : handleSubmit} className="space-y-6">
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
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-gray-900">Đối chiếu trùng lặp</h2>
              
              {dedupMatches.length > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2">Phát hiện hồ sơ trùng lặp!</h3>
                  <p className="text-sm text-yellow-700 mb-3">Đã tìm thấy {dedupMatches.length} hồ sơ khớp chính xác với số điện thoại <strong>{phone}</strong>.</p>
                  <ul className="space-y-2">
                    {dedupMatches.map(m => (
                      <li key={m.id} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-yellow-100">
                        <span>{m.fullName} - {m.phone}</span>
                        <Link href={`/admin/labor-profiles/${m.id}`} className="text-blue-600 hover:underline font-medium">
                          Xem hồ sơ
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-600 mt-3 italic">Bạn vẫn có thể tiếp tục, hệ thống sẽ tự động ghép (merge) vào hồ sơ hiện có.</p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-green-800 mb-2">Không có trùng lặp</h3>
                  <p className="text-sm text-green-700">Hệ thống không tìm thấy hồ sơ nào khớp với số điện thoại <strong>{phone}</strong>. Bạn đang tạo mới một hồ sơ an toàn.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold text-gray-900">Ghi nhận thông tin (Tùy chọn & Pháp lý)</h2>
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
                  value={channel} 
                  onChange={(e) => setChannel(e.target.value)}
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
              className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : step === 3 ? 'Lưu hồ sơ' : 'Tiếp tục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
