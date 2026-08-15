import { listPublicJobs } from '@hrp/job-board';

export const revalidate = 300;

const BADGE_TEXT: Record<string, string> = {
  TUYEN_GAP: 'Tuyen gap',
  DA_NHAN_DU: 'Da nhan du',
  DANG_TUYEN: 'Dang tuyen',
};

const FILTERS_LOCATION = ['Tat ca', 'Bac Ninh', 'Bac Giang'];
const FILTERS_SHIFT = ['Tat ca', 'HC', 'D1', 'D2', 'N1', 'T1'];

export default function JobBoardPage() {
  const jobs = listPublicJobs();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F7F8FA', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 28, padding: '0 40px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <span style={{ fontWeight: 700, color: '#0F4C81' }}>HRP</span>
        <nav style={{ display: 'flex', gap: 20 }}>
          <span style={{ fontWeight: 600, color: '#111827', borderBottom: '2px solid #0F4C81', paddingBottom: 2 }}>Viec lam</span>
          <span style={{ color: '#6B7280' }}>Ve HRP</span>
          <span style={{ color: '#6B7280' }}>Lien he</span>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button style={{ fontWeight: 600, fontSize: 13, color: '#0F4C81', background: 'transparent', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 16px' }} type="button">Dang nhap</button>
          <button style={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF', background: '#0F4C81', border: 0, borderRadius: 8, padding: '8px 16px' }} type="button">Dang ky</button>
        </div>
        <span style={{ position: 'absolute', top: 12, right: 12, background: '#FEF3C7', color: '#92400E', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>DU LIEU MINH HOA</span>
      </header>

      <main style={{ flex: 1, padding: '28px 40px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>Tim viec tai cac nha may, kho van khu cong nghiep</h1>
          <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 640, margin: '10px 0 0' }}>Viec lam van hanh theo du an — ca lam ro rang, bang cong minh bach, doi soat cong khai voi don vi cung ung. So lieu tren trang la minh hoa.</p>
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Dia diem</span>
            {FILTERS_LOCATION.map((f, i) => (
              <span key={f} style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? '#0F4C81' : '#6B7280', background: i === 0 ? '#E0EBF5' : '#FFFFFF', border: '1px solid ' + (i === 0 ? '#0F4C81' : '#D1D5DB'), borderRadius: 999, padding: '5px 12px' }}>{f}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Ca</span>
            {FILTERS_SHIFT.map((f, i) => (
              <span key={f} style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? '#0F4C81' : '#6B7280', background: i === 0 ? '#E0EBF5' : '#FFFFFF', border: '1px solid ' + (i === 0 ? '#0F4C81' : '#D1D5DB'), borderRadius: 999, padding: '5px 12px' }}>{f}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {jobs.map((job) => {
            const remaining = job.totalNeeded - job.totalFilled;
            const pct = Math.round((job.totalFilled / job.totalNeeded) * 100);
            const badgeColor = job.badge === 'TUYEN_GAP' ? { bg: '#FEF3C7', fg: '#92400E' } : job.badge === 'DA_NHAN_DU' ? { bg: '#D1FAE5', fg: '#065F46' } : { bg: '#E5E7EB', fg: '#374151' };
            return (
              <article key={job.projectCode} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: badgeColor.fg, background: badgeColor.bg, padding: '2px 8px', borderRadius: 4 }}>{BADGE_TEXT[job.badge]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '.04em' }}>{job.projectCode}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{job.name}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>📍 {job.location}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {job.shifts.map((s) => (
                    <span key={s.code} style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', borderRadius: 6, padding: '3px 8px' }}>{s.code} · {s.hours}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 18, paddingTop: 4, borderTop: '1px solid #E5E7EB' }}>
                  <div><b style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#111827' }}>{job.totalNeeded}</b><span style={{ fontSize: 11, color: '#6B7280' }}>Can</span></div>
                  <div><b style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#111827' }}>{job.totalFilled}</b><span style={{ fontSize: 11, color: '#6B7280' }}>Da nhan</span></div>
                  <div><b style={{ display: 'block', fontSize: 16, fontWeight: 700, color: remaining > 0 ? '#0F4C81' : '#111827' }}>{remaining}</b><span style={{ fontSize: 11, color: '#6B7280' }}>Con thieu</span></div>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                  <i style={{ display: 'block', height: '100%', background: pct >= 100 ? '#10B981' : '#0F4C81', width: `${Math.min(pct, 100)}%` }} />
                </div>
                <button disabled style={{ width: '100%', fontSize: 14, fontWeight: 600, color: '#FFFFFF', background: '#0F4C81', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'not-allowed', opacity: 0.6 }} type="button" title="A-05 thuoc Wave 3">Ung tuyen</button>
              </article>
            );
          })}
        </div>
      </main>

      <footer style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 40px', borderTop: '1px solid #E5E7EB', background: '#FFFFFF', fontSize: 12, color: '#6B7280' }}>
        <span>🌐 Trang tim viec cong khai — Phase 0 demo (A-04). Khong co flow ung tuyen (A-05 thuoc Wave 3).</span>
        <span style={{ marginLeft: 'auto' }}>© 2026 HRP · DU LIEU MINH HOA</span>
      </footer>
    </div>
  );
}
