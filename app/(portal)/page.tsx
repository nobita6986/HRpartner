'use client';

import { useState } from 'react';

const MOCK_JOBS = [
  {
    id: 1,
    title: 'Công nhân lắp ráp linh kiện',
    company: 'Công ty TNHH An Phát',
    icon: 'precision_manufacturing',
    salary: '8 - 10 Triệu',
    location: 'Bắc Ninh',
    schedule: 'Ca ngày',
    badge: 'Tuyển gấp',
    badgeType: 'urgent',
    filled: '47/50',
    remaining: 3,
    applied: false,
  },
  {
    id: 2,
    title: 'Công nhân may mặc',
    company: 'Công ty CP Yên Phong',
    icon: 'checkroom',
    salary: '7 - 9 Triệu',
    location: 'Bắc Giang',
    schedule: 'Ca ngày',
    badge: 'Đã tuyển đủ',
    badgeType: 'full',
    filled: '80/80',
    remaining: 0,
    applied: true,
  },
  {
    id: 3,
    title: 'Công nhân cơ khí',
    company: 'Công ty CP Sao Việt',
    icon: 'hardware',
    salary: '8 - 11 Triệu',
    location: 'Hà Nội',
    schedule: 'Ca đêm',
    badge: 'Tuyển gấp',
    badgeType: 'urgent',
    filled: '32/35',
    remaining: 3,
    applied: false,
  },
  {
    id: 4,
    title: 'Vận hành máy CNC',
    company: 'Công ty TNHH An Phát',
    icon: 'build',
    salary: '9 - 12 Triệu',
    location: 'Bắc Ninh',
    schedule: 'Xoay ca',
    badge: null,
    badgeType: null,
    filled: null,
    remaining: 0,
    applied: false,
  },
  {
    id: 5,
    title: 'Nhân viên kho vận',
    company: 'Công ty CP Yên Phong',
    icon: 'inventory_2',
    salary: '7,5 - 9,5 Triệu',
    location: 'Bắc Giang',
    schedule: 'Ca ngày',
    badge: null,
    badgeType: null,
    filled: null,
    remaining: 0,
    applied: false,
  },
  {
    id: 6,
    title: 'QA/QC linh kiện',
    company: 'Công ty CP Sao Việt',
    icon: 'verified',
    salary: '8 - 10 Triệu',
    location: 'Hà Nội',
    schedule: 'Ca ngày',
    badge: null,
    badgeType: null,
    filled: null,
    remaining: 0,
    applied: false,
  },
  {
    id: 7,
    title: 'Thợ bảo trì điện',
    company: 'Công ty TNHH An Phát',
    icon: 'electrical_services',
    salary: '9 - 11 Triệu',
    location: 'Bắc Ninh',
    schedule: 'Xoay ca',
    badge: null,
    badgeType: null,
    filled: null,
    remaining: 0,
    applied: false,
  },
  {
    id: 8,
    title: 'Công nhân đóng gói',
    company: 'Công ty CP Yên Phong',
    icon: 'package_2',
    salary: '7 - 8 Triệu',
    location: 'Bắc Giang',
    schedule: 'Ca đêm',
    badge: null,
    badgeType: null,
    filled: null,
    remaining: 0,
    applied: false,
  },
];

const LOCATIONS = ['Tất cả tỉnh/thành', 'Bắc Ninh', 'Bắc Giang', 'Hà Nội'];
const INDUSTRIES = ['Tất cả ngành nghề', 'Công nghiệp chế tạo', 'May mặc', 'Kho vận'];
const WORK_TYPES = [
  { id: 'ca_ngay', label: 'Ca ngày' },
  { id: 'ca_dem', label: 'Ca đêm' },
  { id: 'xoay_ca', label: 'Xoay ca' },
];
const JOB_TYPES = [
  { id: 'toan_thoi_gian', label: 'Toàn thời gian' },
  { id: 'ban_thoi_gian', label: 'Bán thời gian' },
  { id: 'thoi_vu', label: 'Thời vụ' },
];

export default function JobsPage() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [applied, setApplied] = useState<number[]>([]);

  const toggleCheckbox = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setTimeout(() => setSearching(false), 400);
  }

  function handleApply(jobId: number) {
    setApplied((prev) => [...prev, jobId]);
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 md:px-[5%] py-8 flex flex-col lg:flex-row gap-8">

      {/* Left Sidebar Filters */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <form onSubmit={handleSearch} className="bg-surface rounded-xl border border-outline-variant/50 shadow-sm flex flex-col p-6 space-y-5">

          <div className="mb-2">
            <h2 className="text-xl font-semibold text-on-surface">Bộ lọc tìm kiếm</h2>
            <p className="text-sm text-on-surface-variant mt-1">Tìm kiệm việc làm phù hợp</p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              search
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên công việc, vị trí..."
              aria-label="Từ khóa tìm kiếm"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Vị trí */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">location_on</span>
              Vị trí
            </h3>
            <div className="relative">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Tỉnh/thành"
                className="w-full appearance-none bg-surface border border-outline-variant text-on-surface py-2.5 pl-4 pr-10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Ngành nghề */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">work</span>
              Ngành nghề
            </h3>
            <div className="relative">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Ngành nghề"
                className="w-full appearance-none bg-surface border border-outline-variant text-on-surface py-2.5 pl-4 pr-10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Ca làm việc */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">schedule</span>
              Ca làm việc
            </h3>
            <div className="space-y-2">
              {WORK_TYPES.map((wt) => (
                <label key={wt.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={workTypes.includes(wt.id)}
                    onChange={() => toggleCheckbox(wt.id, workTypes, setWorkTypes)}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary transition-colors cursor-pointer"
                  />
                  <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                    {wt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Loại công việc */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">category</span>
              Loại công việc
            </h3>
            <div className="space-y-2">
              {JOB_TYPES.map((jt) => (
                <label key={jt.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={jobTypes.includes(jt.id)}
                    onChange={() => toggleCheckbox(jt.id, jobTypes, setJobTypes)}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary transition-colors cursor-pointer"
                  />
                  <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                    {jt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-outline-variant/50">
            <button
              type="submit"
              className="w-full bg-primary text-on-primary font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors flex justify-center items-center gap-2"
            >
              {searching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tìm...
                </>
              ) : (
                'Tìm kiếm'
              )}
            </button>
          </div>

        </form>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Việc làm nổi bật</h1>
          <span className="text-sm text-on-surface-variant whitespace-nowrap">
            Tìm thấy {MOCK_JOBS.length} kết quả
          </span>
        </div>

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {MOCK_JOBS.map((job) => {
            const isApplied = applied.includes(job.id);
            const isFull = job.badgeType === 'full';

            return (
              <div
                key={job.id}
                className="bg-surface border border-outline-variant/50 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 relative h-full p-4"
              >
                {/* Accent top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container rounded-t-xl" />

                <div className="flex items-start gap-4 pt-2">
                  {/* Company icon */}
                  <div className="w-12 h-12 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl text-primary-container">
                      {job.icon}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      {job.badge && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            job.badgeType === 'urgent'
                              ? 'text-error bg-error-container/40'
                              : 'text-on-surface-variant bg-surface-container-high'
                          }`}
                        >
                          {job.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{job.company}</p>
                    {job.filled && (
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {job.filled.includes('/')
                          ? `Cần ${job.remaining} vị trí · còn ${job.remaining} (${job.filled})`
                          : job.filled}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full">
                    {job.salary}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {job.schedule}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40 mt-auto">
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={isApplied || isFull}
                    className={`font-semibold px-6 py-2 rounded-lg transition-colors ${
                      isFull
                        ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                        : isApplied
                          ? 'bg-success-soft text-success cursor-default'
                          : 'bg-primary text-on-primary hover:bg-primary-dark'
                    }`}
                  >
                    {isFull ? 'Đã đủ chỉ tiêu' : isApplied ? 'Đã ứng tuyển' : 'Ứng tuyển'}
                  </button>
                  <button
                    aria-label="Lưu việc"
                    className="w-9 h-9 rounded-full border border-outline-variant text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">favorite</span>
                  </button>
                </div>
              </div>
            );
          })}

        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-8 gap-3 w-full">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant text-sm">Đang tải thêm việc làm...</p>
        </div>

      </div>
    </div>
  );
}
