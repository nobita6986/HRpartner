'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewLaborProfilePage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = (e: React.FormEvent) => {
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
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
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
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Hệ thống sẽ tự động đối chiếu SĐT và CCCD để tìm hồ sơ đã có. Nếu tìm thấy, bạn sẽ được chuyển đến hồ sơ cũ.
                </p>
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
