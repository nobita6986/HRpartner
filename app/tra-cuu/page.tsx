'use client';

import { useState } from 'react';
import { Search, Calendar as CalendarIcon, Clock, AlertCircle, Receipt } from 'lucide-react';
import { fetchPortalTimesheet } from './actions';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type DailyStatus = 'WORKING' | 'OVERTIME' | 'LATE' | 'ABSENT';

interface DailyData {
  date: string;
  status: DailyStatus;
  in?: string;
  out?: string;
  ot?: number;
}

interface PayrollItem {
  name: string;
  qty: number | null;
  rate: number | null;
  total: number;
}

interface PayrollData {
  salaryItems: PayrollItem[];
  allowances: PayrollItem[];
  deductions: PayrollItem[];
  summary: {
    totalSalary: number;
    totalAllowance: number;
    grossIncome: number;
    totalDeduction: number;
    netIncome: number;
  };
}

interface TimesheetData {
  id: string;
  employeeCode: string;
  fullName: string;
  project: string;
  totalWorkDays: number;
  otHours: number;
  absentDays: number;
  dailyData?: DailyData[];
  payrollData?: PayrollData;
  updatedAt: string;
}

export default function TraCuuPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [data, setData] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'PAYSLIP'>('CALENDAR');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode) return;
    
    setLoading(true);
    setError('');
    setData(null);

    const result = await fetchPortalTimesheet(employeeCode);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setData(result.data);
    }
    
    setLoading(false);
  };

  const getStatusColor = (status: DailyStatus) => {
    switch (status) {
      case 'WORKING': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'OVERTIME': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'LATE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ABSENT': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  const getStatusLabel = (status: DailyStatus) => {
    switch (status) {
      case 'WORKING': return 'Đi làm';
      case 'OVERTIME': return 'Tăng ca';
      case 'LATE': return 'Vào trễ/Ra sớm';
      case 'ABSENT': return 'Nghỉ';
      default: return '';
    }
  };

  const formatMoney = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '';
    return amount.toLocaleString('vi-VN');
  };

  const days = data?.dailyData || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Search */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Tra cứu Bảng Công Cá Nhân
          </h1>
          <p className="text-slate-500">Tra cứu nhanh dữ liệu chấm công và bảng lương từ dự án của bạn.</p>
        </div>

        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="block w-full rounded-xl border-0 py-3 pl-10 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none sm:text-sm sm:leading-6"
                placeholder="Nhập Mã thẻ / ID nhân viên..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang tìm...' : 'Tra cứu'}
            </button>
          </form>
        </div>

        {error && (
          <div className="max-w-md mx-auto rounded-xl bg-red-50 p-4 border border-red-100">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3 text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Results Area */}
        {data && (
          <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500">
            {/* User Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{data.fullName}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                  <span className="font-medium bg-slate-100 px-3 py-1 rounded-md text-slate-800 border border-slate-200">
                    Mã: {data.employeeCode}
                  </span>
                  <span className="flex items-center gap-1">
                    Dự án: <strong className="text-slate-800">{data.project}</strong>
                  </span>
                </div>
              </div>
              <div className="text-right md:border-l md:border-slate-200 pl-6">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Cập nhật lần cuối</p>
                <p className="font-semibold text-slate-700">
                  {new Date(data.updatedAt).toLocaleDateString('vi-VN')} lúc {new Date(data.updatedAt).toLocaleTimeString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-fit mx-auto">
              <button
                onClick={() => setActiveTab('CALENDAR')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  activeTab === 'CALENDAR' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <CalendarIcon className="w-4 h-4" /> Lịch Chấm Công
              </button>
              <button
                onClick={() => setActiveTab('PAYSLIP')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  activeTab === 'PAYSLIP' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Receipt className="w-4 h-4" /> Phiếu Lương Chi Tiết
              </button>
            </div>

            {/* Content: CALENDAR */}
            {activeTab === 'CALENDAR' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Tổng Công (Ngày)</p>
                      <p className="text-3xl font-extrabold text-slate-900">{data.totalWorkDays}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-4 bg-rose-50 rounded-xl text-rose-600">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Tăng ca (Giờ)</p>
                      <p className="text-3xl font-extrabold text-slate-900">{data.otHours}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-4 bg-slate-100 rounded-xl text-slate-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Số ngày Nghỉ</p>
                      <p className="text-3xl font-extrabold text-slate-900">{data.absentDays}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-blue-500" />
                      Chi tiết Lịch làm việc {days.length > 0 && `- ${new Date(days[0].date).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`}
                    </h3>
                    
                    <div className="flex gap-4 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Đi làm</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Tăng ca</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Nghỉ</div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-slate-50/50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                      {days.map((day, idx) => {
                        const d = new Date(day.date);
                        const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' });
                        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        
                        return (
                        <div 
                          key={idx} 
                          className={cn(
                            "relative flex flex-col rounded-xl p-3 border shadow-sm transition-all hover:shadow-md",
                            getStatusColor(day.status)
                          )}
                        >
                          <div className="text-[11px] font-bold mb-1.5 opacity-80 flex justify-between uppercase tracking-wider">
                            <span>{weekday}</span>
                            <span>{dateStr}</span>
                          </div>
                          
                          <div className="font-extrabold text-sm mb-3">{getStatusLabel(day.status)}</div>
                          
                          {day.status !== 'ABSENT' && (
                            <div className="mt-auto flex justify-between items-end text-xs opacity-90">
                              <div className="flex flex-col gap-0.5">
                                <span>In: <span className="font-semibold">{day.in}</span></span>
                                <span>Out: <span className="font-semibold">{day.out}</span></span>
                              </div>
                              {day.ot ? <span className="font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded">+{day.ot}h</span> : null}
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content: PAYSLIP */}
            {activeTab === 'PAYSLIP' && (
              <div className="animate-in fade-in duration-300">
                {!data.payrollData ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Chưa có dữ liệu tính lương cho nhân viên này.</p>
                  </div>
                ) : (
                  <div className="bg-white shadow-md border border-slate-300 max-w-4xl mx-auto overflow-hidden">
                    {/* Payslip Header */}
                    <div className="p-6 border-b-2 border-blue-600 bg-blue-50/50 text-slate-800">
                      <h1 className="text-xl font-bold uppercase text-blue-800 tracking-tight">CÔNG TY TNHH HRP VIỆT NAM</h1>
                      <p className="text-xs text-slate-600 mb-6">Địa chỉ: Khu đất DV Tân Ngọc, tdp Thống Nhất, xã Bình Tuyền, tỉnh Phú Thọ</p>
                      
                      <div className="bg-emerald-200/50 text-emerald-900 text-center font-bold py-2 mb-4 uppercase tracking-widest text-lg">
                        BẢNG LƯƠNG CHI TIẾT THÁNG 06/2026_{data.project.toUpperCase()}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                        <div className="border border-slate-300 bg-amber-100/50 p-2 col-span-2">Người giới thiệu:</div>
                        <div className="border border-slate-300 p-2 flex"><span className="w-24">Họ tên:</span> <span className="font-bold">{data.fullName}</span></div>
                        <div className="border border-slate-300 p-2 flex"><span className="w-32">Mã Nhân viên:</span> <span className="font-bold">{data.employeeCode}</span></div>
                        <div className="border border-slate-300 p-2 flex"><span className="w-24">Ngày vào:</span> </div>
                        <div className="border border-slate-300 p-2 flex"><span className="w-32">Ngày nghỉ:</span> </div>
                      </div>
                    </div>

                    {/* Payslip Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-blue-100/50 text-slate-700 text-center">
                            <th className="border border-slate-300 p-2 w-16">STT</th>
                            <th className="border border-slate-300 p-2">Nội dung</th>
                            <th className="border border-slate-300 p-2 w-28">Số lượng</th>
                            <th className="border border-slate-300 p-2 w-32">Đơn giá</th>
                            <th className="border border-slate-300 p-2 w-36">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Phần A */}
                          <tr className="bg-blue-400 text-white font-bold text-left">
                            <td colSpan={5} className="border border-slate-300 p-2 uppercase">A. Các khoản tính lương</td>
                          </tr>
                          {data.payrollData.salaryItems.filter(item => item.total > 0 || (item.qty && item.qty > 0)).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 font-medium">
                              <td className="border border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-300 p-2">{item.name}</td>
                              <td className="border border-slate-300 p-2 text-center text-slate-700">{item.qty || ''}</td>
                              <td className="border border-slate-300 p-2 text-right text-slate-600">{formatMoney(item.rate)}</td>
                              <td className="border border-slate-300 p-2 text-right font-semibold">{formatMoney(item.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-orange-100 text-orange-900 font-bold uppercase text-right">
                            <td colSpan={4} className="border border-slate-300 p-2">Tổng lương:</td>
                            <td className="border border-slate-300 p-2">{formatMoney(data.payrollData.summary.totalSalary)}</td>
                          </tr>

                          {/* Phần B */}
                          <tr className="bg-blue-400 text-white font-bold text-left">
                            <td colSpan={5} className="border border-slate-300 p-2 uppercase">B. Các khoản Thưởng/ Phụ cấp</td>
                          </tr>
                          {data.payrollData.allowances.filter(item => item.total > 0 || (item.qty && item.qty > 0)).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 font-medium">
                              <td className="border border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-300 p-2">{item.name}</td>
                              <td className="border border-slate-300 p-2 text-center text-slate-700">{item.qty || ''}</td>
                              <td className="border border-slate-300 p-2 text-right text-slate-600">{formatMoney(item.rate)}</td>
                              <td className="border border-slate-300 p-2 text-right font-semibold">{formatMoney(item.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-orange-100 text-orange-900 font-bold uppercase text-right">
                            <td colSpan={4} className="border border-slate-300 p-2">Tổng Thưởng/ Phụ cấp:</td>
                            <td className="border border-slate-300 p-2">{formatMoney(data.payrollData.summary.totalAllowance)}</td>
                          </tr>

                          {/* Phần C */}
                          <tr className="bg-blue-300 text-blue-900 font-extrabold uppercase text-right text-base">
                            <td colSpan={4} className="border border-slate-300 p-3">C. Tổng Thu Nhập : A+B</td>
                            <td className="border border-slate-300 p-3">{formatMoney(data.payrollData.summary.grossIncome)}</td>
                          </tr>

                          {/* Phần D */}
                          <tr className="bg-blue-400 text-white font-bold text-left">
                            <td colSpan={5} className="border border-slate-300 p-2 uppercase">D. Các khoản Khấu trừ</td>
                          </tr>
                          {data.payrollData.deductions.filter(item => item.total > 0 || (item.qty && item.qty > 0)).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 font-medium">
                              <td className="border border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-300 p-2">{item.name}</td>
                              <td className="border border-slate-300 p-2 text-center text-slate-700">{item.qty || ''}</td>
                              <td className="border border-slate-300 p-2 text-right text-slate-600">{formatMoney(item.rate)}</td>
                              <td className="border border-slate-300 p-2 text-right font-semibold text-rose-600">{formatMoney(item.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-orange-100 text-orange-900 font-bold uppercase text-right">
                            <td colSpan={4} className="border border-slate-300 p-2">Tổng các khoản Khấu trừ:</td>
                            <td className="border border-slate-300 p-2 text-rose-700">{formatMoney(data.payrollData.summary.totalDeduction)}</td>
                          </tr>

                          {/* Phần E */}
                          <tr className="bg-amber-400 text-amber-950 font-black uppercase text-right text-lg">
                            <td colSpan={4} className="border border-slate-400 p-4">E. THỰC NHẬN : C-D</td>
                            <td className="border border-slate-400 p-4">{formatMoney(data.payrollData.summary.netIncome)} VNĐ</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
