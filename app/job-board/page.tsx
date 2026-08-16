import { Search, MapPin, Globe } from 'lucide-react';
import { listPublicJobs } from '@hrp/job-board';

export const revalidate = 300;

const BADGE_TEXT: Record<string, string> = {
  TUYEN_GAP: 'Tuyển gấp',
  DA_NHAN_DU: 'Đã nhận đủ',
  DANG_TUYEN: 'Đang tuyển',
};

const BADGE_CLASS: Record<string, string> = {
  TUYEN_GAP: 'badge-warning',
  DA_NHAN_DU: 'badge-success',
  DANG_TUYEN: 'badge-neutral',
};

const FILTERS_LOCATION = ['Tất cả', 'Bắc Ninh', 'Bắc Giang'];
const FILTERS_SHIFT = ['Tất cả', 'HC', 'D1', 'D2', 'N1', 'T1'];

export default function JobBoardPage() {
  const jobs = listPublicJobs();

  return (
    <div className="pub">
      <header className="pub-header">
        <span className="logo">
          HR<em>P</em>
        </span>
        <nav className="pub-nav">
          <span className="on">Việc làm</span>
          <span>Về HRP</span>
          <span>Liên hệ</span>
        </nav>
        <div className="pub-auth">
          <button className="pub-btn-ghost" type="button">Đăng nhập</button>
          <button className="pub-btn-primary" type="button">Đăng ký</button>
        </div>
        <span className="watermark-badge">DỮ LIỆU MINH HỌA</span>
      </header>

      <main className="pub-main">
        <div className="hero">
          <h1>Tìm việc tại các nhà máy, kho vận khu công nghiệp</h1>
          <p className="sub">
            Việc làm vận hành theo dự án — ca làm rõ ràng, bảng công minh bạch, đối soát công khai với đơn vị cung ứng. Số liệu trên trang là minh họa.
          </p>
          <div className="search-bar">
            <Search size={20} aria-hidden="true" />
            <input type="search" placeholder="Tìm theo vị trí, địa điểm…" aria-label="Tìm kiếm việc làm" />
          </div>
        </div>

        {/* Filter minh họa (STEP-09 — không hoạt động) */}
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">Địa điểm</span>
            {FILTERS_LOCATION.map((f, i) => (
              <span key={f} className={`fchip${i === 0 ? ' on' : ''}`}>{f}</span>
            ))}
          </div>
          <div className="filter-group">
            <span className="filter-label">Ca</span>
            {FILTERS_SHIFT.map((f, i) => (
              <span key={f} className={`fchip${i === 0 ? ' on' : ''}`}>{f}</span>
            ))}
          </div>
        </div>

        <div className="job-grid">
          {jobs.map((job) => {
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
      </main>

      <footer className="pub-foot">
        <Globe size={15} aria-hidden="true" />
        <span>Trang tìm việc công khai — Phase 0 demo (A-04). Không có flow ứng tuyển (A-05 thuộc Wave 3).</span>
        <span className="push-right">© 2026 HRP · DỮ LIỆU MINH HỌA</span>
      </footer>
    </div>
  );
}
