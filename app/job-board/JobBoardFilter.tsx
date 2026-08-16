'use client';

/**
 * JobBoardFilter — sidebar filter trai 240px cho /job-board (STEP-10/AC-12, DEC-32).
 *
 * Client-side that tren 3 card canonical (khong cham DB): 4 nhom filter
 * (Dia diem / Ca lam / Loai hinh / Trang thai tuyen), "Tat ca" = default,
 * "Xoa bo loc" reset. So dem tung muc tinh tu data (`listPublicJobs()`).
 * Layout + class bam mockup S05 v2 (docs/tasks/hrp-v4-bod-mockup/mockup/
 * S05_JobBoard_Public_1440.html), token Warm Professionalism o globals.css.
 */

import { useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import {
  matchesFilters,
  type PublicJobCard,
  type PublicJobFilters,
  type RecruitStatus,
} from '@hrp/job-board';

type FilterGroupId = keyof PublicJobFilters;

interface FilterOption {
  value: string;
  label: string;
}

const TAT_CA = 'TAT_CA';

/** Thu tu option bam mockup S05 v2 (nhan nhan; label tieng Viet co dau). So dem khong nam o day - tinh tu data. */
const FILTER_GROUPS: ReadonlyArray<{ id: FilterGroupId; label: string; options: ReadonlyArray<FilterOption> }> = [
  {
    id: 'province',
    label: 'Địa điểm',
    options: [
      { value: TAT_CA, label: 'Tất cả' },
      { value: 'BAC_NINH', label: 'Bắc Ninh' },
      { value: 'BAC_GIANG', label: 'Bắc Giang' },
    ],
  },
  {
    id: 'shift',
    label: 'Ca làm',
    options: [
      { value: TAT_CA, label: 'Tất cả' },
      { value: 'HC', label: 'HC' },
      { value: 'D1', label: 'D1' },
      { value: 'D2', label: 'D2' },
      { value: 'N1', label: 'N1' },
      { value: 'T1', label: 'T1' },
    ],
  },
  {
    id: 'type',
    label: 'Loại hình',
    options: [
      { value: TAT_CA, label: 'Tất cả' },
      { value: 'NHA_MAY', label: 'Nhà máy' },
      { value: 'KHO_VAN', label: 'Kho vận' },
    ],
  },
  {
    id: 'status',
    label: 'Trạng thái tuyển',
    options: [
      { value: TAT_CA, label: 'Tất cả' },
      { value: 'TUYEN_GAP', label: 'Tuyển gấp' },
      { value: 'DANG_TUYEN', label: 'Đang tuyển' },
      { value: 'DA_NHAN_DU', label: 'Đã nhận đủ' },
    ],
  },
];

const BADGE_TEXT: Record<RecruitStatus, string> = {
  TUYEN_GAP: 'Tuyển gấp',
  DA_NHAN_DU: 'Đã nhận đủ',
  DANG_TUYEN: 'Đang tuyển',
};

const BADGE_CLASS: Record<RecruitStatus, string> = {
  TUYEN_GAP: 'badge-warning',
  DA_NHAN_DU: 'badge-success',
  DANG_TUYEN: 'badge-neutral',
};

/** Chuyen selection dang UI (TAT_CA = khong loc) sang PublicJobFilters (undefined = khong loc). */
function toFilters(selected: Record<FilterGroupId, string>): PublicJobFilters {
  const filters: PublicJobFilters = {};
  const entry = filters as Record<string, string | undefined>;
  for (const group of FILTER_GROUPS) {
    const value = selected[group.id];
    if (value !== TAT_CA) entry[group.id] = value;
  }
  return filters;
}

/** So dem that tinh tu data (khong hardcode) - "Tat ca" = tong so job hien co. */
function countForOption(jobs: ReadonlyArray<PublicJobCard>, groupId: FilterGroupId, value: string): number {
  if (value === TAT_CA) return jobs.length;
  return jobs.filter((job) => matchesFilters(job, { [groupId]: value } as PublicJobFilters)).length;
}

export default function JobBoardFilter({ jobs }: { jobs: ReadonlyArray<PublicJobCard> }) {
  const [selected, setSelected] = useState<Record<FilterGroupId, string>>({
    province: TAT_CA,
    shift: TAT_CA,
    type: TAT_CA,
    status: TAT_CA,
  });

  const filters = toFilters(selected);
  const visibleJobs = jobs.filter((job) => matchesFilters(job, filters));
  const isAllDefault = FILTER_GROUPS.every((group) => selected[group.id] === TAT_CA);

  const select = (groupId: FilterGroupId, value: string) => {
    setSelected((prev) => (prev[groupId] === value ? prev : { ...prev, [groupId]: value }));
  };

  const clearAll = () => {
    setSelected({ province: TAT_CA, shift: TAT_CA, type: TAT_CA, status: TAT_CA });
  };

  return (
    <div className="pub-body">
      <aside className="filter-panel" aria-label="Bộ lọc việc làm">
        <div className="filter-head">
          <span className="filter-title">Bộ lọc</span>
          <button className="filter-clear" type="button" onClick={clearAll} disabled={isAllDefault}>
            Xóa bộ lọc
          </button>
        </div>

        {FILTER_GROUPS.map((group) => (
          <div key={group.id} className="fgroup">
            <span className="filter-label">{group.label}</span>
            {group.options.map((opt) => {
              const active = selected[group.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`fopt${active ? ' on' : ''}`}
                  onClick={() => select(group.id, opt.value)}
                >
                  <span className={`fcheck${active ? ' on' : ''}`}>
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="fopt-label">{opt.label}</span>
                  <span className="fcount">{countForOption(jobs, group.id, opt.value)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="job-grid">
        {visibleJobs.map((job) => {
          const remaining = job.totalNeeded - job.totalFilled;
          const pct = Math.round((job.totalFilled / job.totalNeeded) * 100);
          return (
            <article key={job.projectCode} className="job-card">
              <div className="job-top">
                <span className={`badge ${BADGE_CLASS[job.badge]}`}>{BADGE_TEXT[job.badge]}</span>
                <span className="job-code">{job.projectCode}</span>
              </div>
              <div className="job-name">{job.name}</div>
              <div className="job-meta">
                <MapPin size={17} aria-hidden="true" />
                {job.location}
              </div>
              <div className="job-shifts">
                {job.shifts.map((s) => (
                  <span key={s.code} className="shift-chip">{s.code} · {s.hours}</span>
                ))}
              </div>
              <div className="job-counts">
                <div className="count"><b>{job.totalNeeded}</b><span>Cần</span></div>
                <div className="count"><b>{job.totalFilled}</b><span>Đã nhận</span></div>
                <div className={`count${remaining > 0 ? ' miss' : ''}`}><b>{remaining}</b><span>Còn thiếu</span></div>
              </div>
              <div className="job-progress">
                <i className={pct >= 100 ? 'full' : undefined} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <button className="apply-btn" disabled type="button" title="Tính năng Ứng tuyển thuộc Wave 3 (A-05)">Ứng tuyển</button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
