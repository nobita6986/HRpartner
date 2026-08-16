import { Search, Globe } from 'lucide-react';
import { listPublicJobs } from '@hrp/job-board';
import JobBoardFilter from './JobBoardFilter';

export const revalidate = 300;

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

        {/* STEP-10/AC-12 (DEC-32): sidebar filter trai 240px + grid - client-side that */}
        <JobBoardFilter jobs={jobs} />
      </main>

      <footer className="pub-foot">
        <Globe size={15} aria-hidden="true" />
        <span>Trang tìm việc công khai — Phase 0 demo (A-04). Không có flow ứng tuyển (A-05 thuộc Wave 3).</span>
        <span className="push-right">© 2026 HRP · DỮ LIỆU MINH HỌA</span>
      </footer>
    </div>
  );
}
