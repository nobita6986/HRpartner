import { Search, Globe } from 'lucide-react';
import { getPrisma } from '@/src/lib/db';
import { listPublicJobProjection } from '@/src/domains/job-board/public.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function JobBoardPage() {
  const prisma = getPrisma();
  const { jobs } = await prisma.$transaction((tx) => listPublicJobProjection(tx, { limit: 20 }));

  return (
    <div className="pub">
      <header className="pub-header">
        <span className="logo">HR<em>P</em></span>
        <nav className="pub-nav"><span className="on">Việc làm</span><span>Về HRP</span><span>Liên hệ</span></nav>
        <div className="pub-auth"><button className="pub-btn-ghost" type="button">Đăng nhập</button><button className="pub-btn-primary" type="button">Đăng ký</button></div>
      </header>
      <main className="pub-main">
        <div className="hero">
          <h1>Tìm việc tại các nhà máy, kho vận khu công nghiệp</h1>
          <p className="sub">Các vị trí đang tuyển được HRP công khai theo dự án, ca làm và địa điểm.</p>
          <div className="search-bar"><Search size={20} aria-hidden="true" /><span>Tìm theo vị trí, địa điểm</span></div>
        </div>
        <section className="job-grid" aria-label="Việc làm đang tuyển">
          {jobs.length === 0 ? <p>Hiện chưa có việc làm đang tuyển.</p> : jobs.map((job) => (
            <article key={job.id} className="job-card">
              <div className="job-top"><span className="badge badge-neutral">{job.statusLabel}</span><span className="job-code">{job.slug}</span></div>
              <div className="job-name">{job.title}</div>
              <div className="job-meta">{job.location ?? 'Liên hệ HRP để biết địa điểm'}</div>
              <div className="job-shifts">{job.position}{job.shift ? ` · ${job.shift}` : ''}</div>
              <div className="job-counts"><div className="count miss"><b>{job.availableSlots}</b><span>Vị trí còn trống</span></div></div>
              <a className="apply-btn" href={`/api/jobs/${encodeURIComponent(job.slug)}`}>Xem chi tiết</a>
            </article>
          ))}
        </section>
      </main>
      <footer className="pub-foot"><Globe size={15} aria-hidden="true" /><span>Trang tìm việc công khai của HRP.</span><span className="push-right">© 2026 HRP</span></footer>
    </div>
  );
}
