'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon, Clock, AlertCircle, Receipt } from 'lucide-react';
import { fetchPortalTimesheet, fetchOptions } from './actions';
import type { DailyData, DailyStatus, DailyBreakdown, PayrollItem, PayrollData } from './types';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface TimesheetData {
  id: string;
  employeeCode: string;
  fullName: string;
  project: string;
  periodMonth?: number | null;
  periodYear?: number | null;
  totalWorkDays: number;
  otHours: number;
  absentDays: number;
  dailyData?: DailyData[];
  payrollData?: PayrollData;
  updatedAt: string;
  source?: string;
}

export default function TraCuuPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [timesheets, setTimesheets] = useState<TimesheetData[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'PAYSLIP'>('CALENDAR');
  const [selectedDay, setSelectedDay] = useState<DailyData | null>(null);

  const [projects, setProjects] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    async function loadOptions() {
      const { projects, periods } = await fetchOptions();
      setProjects(projects);
      setPeriods(periods);
      if (projects.length > 0) setSelectedProject(projects[0]);
      if (periods.length > 0) setSelectedPeriod(periods[0]);
    }
    loadOptions();
  }, []);

  const data = timesheets.find(t => t.id === activeId) || null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode || !selectedProject || !selectedPeriod) {
      setError('Vui lòng chọn Dự án, Kỳ lương và nhập Mã nhân viên.');
      return;
    }
    
    setLoading(true);
    setError('');
    setTimesheets([]);
    setActiveId('');

    const result = await fetchPortalTimesheet(employeeCode, selectedProject, selectedPeriod);
    if (result.error) {
      setError(result.error);
    } else if (result.data && Array.isArray(result.data)) {
      setTimesheets(result.data);
      if (result.data.length > 0) {
        setActiveId(result.data[0].id);
      }
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

  const generateCalendarGrid = (daysList: DailyData[]) => {
    if (!daysList || daysList.length === 0) return [];
    
    const grid: (DailyData & { isPadding?: boolean })[] = [];
    const [sYear, sMonth, sDay] = daysList[0].date.split('-').map(Number);
    const startDate = new Date(sYear, sMonth - 1, sDay);
    const startDayOfWeek = startDate.getDay(); 
    
    for (let i = 0; i < startDayOfWeek; i++) {
      const padDate = new Date(sYear, sMonth - 1, sDay - (startDayOfWeek - i));
      const pYear = padDate.getFullYear();
      const pMonth = String(padDate.getMonth() + 1).padStart(2, '0');
      const pDate = String(padDate.getDate()).padStart(2, '0');
      grid.push({
        date: `${pYear}-${pMonth}-${pDate}`,
        status: 'WORKING',
        isPadding: true
      });
    }
    
    daysList.forEach(day => grid.push(day));
    
    const lastDay = daysList[daysList.length - 1];
    const [eYear, eMonth, eDay] = lastDay.date.split('-').map(Number);
    const endDate = new Date(eYear, eMonth - 1, eDay);
    
    const remainder = grid.length % 7;
    if (remainder !== 0) {
      const paddingEnd = 7 - remainder;
      for (let i = 1; i <= paddingEnd; i++) {
        const padDate = new Date(eYear, eMonth - 1, eDay + i);
        const pYear = padDate.getFullYear();
        const pMonth = String(padDate.getMonth() + 1).padStart(2, '0');
        const pDate = String(padDate.getDate()).padStart(2, '0');
        grid.push({
          date: `${pYear}-${pMonth}-${pDate}`,
          status: 'WORKING',
          isPadding: true
        });
      }
    }
    
    return grid;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Search */}
        <div className="text-center space-y-4">
          <img src="/logo.png" alt="HRP Logo" className="h-14 w-auto mx-auto drop-shadow-sm" />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Tra cứu Bảng Công Cá Nhân
          </h1>
          <p className="text-slate-500">Tra cứu nhanh dữ liệu chấm công và bảng lương từ dự án của bạn.</p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="block w-full md:w-1/3 rounded-xl border-0 py-3 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none sm:text-sm"
            >
              <option value="" disabled>Chọn dự án...</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="block w-full md:w-1/4 rounded-xl border-0 py-3 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none sm:text-sm"
            >
              <option value="" disabled>Kỳ lương...</option>
              {periods.map(p => <option key={p} value={p}>Tháng {p}</option>)}
            </select>

            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="block w-full rounded-xl border-0 py-3 pl-10 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none sm:text-sm sm:leading-6"
                placeholder="Mã NV..."
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
                </div>
                
                {/* Dropdown Chọn Kỳ Lương - Đã chuyển lên form tra cứu bên trên */}
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
                  
                  <div className="p-4 md:p-6 bg-slate-50/50">
                    {/* Mobile View: Vertical List */}
                    <div className="flex flex-col gap-3 md:hidden">
                      {days.map((day, idx) => {
                        const [, mStr, dStr] = day.date.split('-');
                        const dateNum = parseInt(dStr, 10);
                        const monthNum = parseInt(mStr, 10);
                        
                        // Parse date properly handling timezone issues by using the parts
                        const dayOfWeek = new Date(parseInt(day.date.split('-')[0]), monthNum - 1, dateNum).getDay();
                        const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                        
                        return (
                          <div 
                            key={`mob-${idx}`} 
                            onClick={() => !day.isPadding && setSelectedDay(day)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border shadow-sm cursor-pointer hover:shadow-md transition-all",
                              getStatusColor(day.status)
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center justify-center min-w-[50px] min-h-[50px] bg-white/60 rounded-lg shadow-sm border border-black/5">
                                <span className="text-lg font-bold">{dateNum}</span>
                                <span className="text-[10px] uppercase font-semibold opacity-70">{dayNames[dayOfWeek]}</span>
                              </div>
                              <div>
                                <div className="font-extrabold text-[14px]">{getStatusLabel(day.status)}</div>
                                {day.status !== 'ABSENT' && (
                                  <div className="text-[12px] opacity-90 mt-1 flex gap-3">
                                    <span>In: <span className="font-semibold">{day.in}</span></span>
                                    <span>Out: <span className="font-semibold">{day.out}</span></span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {day.ot ? (
                              <div className="font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-1 rounded-md text-sm whitespace-nowrap">
                                +{day.ot}h
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View: Grid */}
                    <div className="hidden md:block overflow-x-auto pb-2">
                      <div className="min-w-[800px] grid grid-cols-7 gap-3">
                        {/* Headers */}
                        {['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(dayName => (
                          <div key={dayName} className="text-center font-bold text-sm text-slate-500 pb-2 border-b border-slate-200">
                            {dayName}
                          </div>
                        ))}
                        
                        {/* Grid Cells */}
                        {generateCalendarGrid(days).map((day, idx) => {
                          const [, mStr, dStr] = day.date.split('-');
                          const dateNum = parseInt(dStr, 10);
                          const monthNum = parseInt(mStr, 10);
                          
                          if (day.isPadding) {
                            return (
                              <div key={`pad-${idx}`} className="flex flex-col rounded-xl p-3 border border-transparent opacity-40 bg-slate-200/50 items-center justify-center min-h-[110px]">
                                <span className="text-2xl font-extrabold text-slate-400">{dateNum}/{monthNum}</span>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={idx} 
                              onClick={() => !day.isPadding && setSelectedDay(day)}
                              className={cn(
                                "relative flex flex-col rounded-xl p-3 border shadow-sm transition-all hover:shadow-md min-h-[110px] cursor-pointer",
                                getStatusColor(day.status)
                              )}
                            >
                              <div className="text-[13px] font-bold mb-1.5 opacity-80 flex justify-between uppercase tracking-wider">
                                <span className="text-lg">{dateNum}/{monthNum}</span>
                              </div>
                              
                              <div className="font-extrabold text-[13px] mb-3">{getStatusLabel(day.status)}</div>
                              
                              {day.status !== 'ABSENT' && (
                                <div className="mt-auto flex justify-between items-end text-[11px] opacity-90">
                                  <div className="flex flex-col gap-0.5">
                                    <span>In: <span className="font-semibold">{day.in}</span></span>
                                    <span>Out: <span className="font-semibold">{day.out}</span></span>
                                  </div>
                                  {day.ot ? <span className="font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1 py-0.5 rounded">+{day.ot}h</span> : null}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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

      {/* Modal Chi tiết Ngày Công */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                Chi tiết ngày {new Date(selectedDay.date).toLocaleDateString('vi-VN')}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600">
                <span className="text-3xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-center w-full">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Giờ Vào</p>
                  <p className="text-2xl font-bold text-slate-800">{selectedDay.in || '--:--'}</p>
                </div>
                <div className="h-12 w-px bg-slate-200 mx-4"></div>
                <div className="text-center w-full">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Giờ Ra</p>
                  <p className="text-2xl font-bold text-slate-800">{selectedDay.out || '--:--'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Phân tích Giờ Công</h4>
                <table className="w-full text-sm border-collapse border border-slate-200">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="border border-slate-200 p-2 text-left">Nội dung</th>
                      <th className="border border-slate-200 p-2 text-center w-20">Số giờ</th>
                      <th className="border border-slate-200 p-2 text-center w-20">Tỷ lệ</th>
                      <th className="border border-slate-200 p-2 text-right w-32">Thành tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDay.breakdown && selectedDay.breakdown.length > 0 ? (
                      selectedDay.breakdown.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-200 p-2 font-medium">{item.name}</td>
                          <td className="border border-slate-200 p-2 text-center font-bold text-slate-700">{item.hours}h</td>
                          <td className="border border-slate-200 p-2 text-center font-bold text-blue-600">{item.rate ? `${item.rate}%` : '-'}</td>
                          <td className="border border-slate-200 p-2 text-right text-slate-600">
                            {item.rate 
                              ? formatMoney((data?.payrollData?.salaryItems?.[0]?.rate || 0) * (item.rate / 100) * item.hours)
                              : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-slate-200 p-4 text-center text-slate-500">Chưa có dữ liệu phân tích chi tiết</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-3">* Đơn giá cơ sở được lấy từ thông số lương: <strong className="text-slate-600">{formatMoney(data?.payrollData?.salaryItems?.[0]?.rate || 0)} đ/giờ</strong></p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedDay(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
