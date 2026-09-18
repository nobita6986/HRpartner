'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewLaborProfilePage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [channel, setChannel] = useState('OFFLINE');
  const [hasConsent, setHasConsent] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dedupMatches, setDedupMatches] = useState<any[]>([]);

  const checkDedup = async () => {
    try {
      const res = await fetch(`/api/admin/labor-profiles?search=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setDedupMatches(data.items || []);
      }
    } catch (e) {
      console.error('Dedup check failed', e);
    }
  };

  const handleNext = async (e: React.FormEvent) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Xử lý nghiệp vụ: Chuyển hướng tới trang chi tiết của profile vừa tạo/match
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
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            2
          </div>
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold bg-gray-100 text-gray-500">
            3
          </div>
        </div>
        
        <div className="mb-6 flex justify-between px-2 text-xs text-gray-500 font-medium">
          <span>Tiếp nhận nhanh</span>
          <span>Hoàn thiện & Đối chiếu</span>
          <span>Xử lý nghiệp vụ</span>
        </div>

        <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6">
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
              
              {dedupMatches.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2">Phát hiện hồ sơ trùng lặp!</h3>
                  <p className="text-sm text-yellow-700 mb-3">Đã tìm thấy {dedupMatches.length} hồ sơ khớp với số điện thoại này.</p>
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
                  <p className="text-xs text-yellow-600 mt-3 italic">Bạn vẫn có thể tiếp tục lưu, hệ thống sẽ tự động ghép (merge) vào hồ sơ hiện có.</p>
                </div>
              )}

              <h2 className="text-lg font-semibold text-gray-900">Hoàn thiện thông tin</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn tiếp nhận</label>
                <select 
                  value={channel} 
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="OFFLINE">Trực tiếp (Offline)</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="ZALO">Zalo</option>
                  <option value="REFERRAL">Giới thiệu (Referral)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="consent" 
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  Người lao động đồng ý cung cấp thông tin (Consent)
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
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
              {loading ? 'Đang xử lý...' : step === 1 ? 'Tiếp tục' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
