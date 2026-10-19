'use client';

import { useEffect, useState } from 'react';

type Feedback = { id: string; category: string; content: string; status: string; adminResponse: string | null; createdAt: string; user: { name: string | null; phone: string | null } };
type Program = { id: string; policyVersion: string; title: string; isEnabled: boolean; effectiveFrom: string | null; effectiveUntil: string | null };
type Referral = { id: string; referredName: string; referredPhone: string; jobInterest: string | null; status: string; benefitStatus: string; benefitAmountVnd: string | null; createdAt: string; referrerUser: { name: string | null; phone: string | null } };

export default function WorkerMobileAdminPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [policies, setPolicies] = useState<Program[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ policyVersion: '', title: '', eligibilityCriteria: '', successEventDescription: '', rewardPolicyDescription: '', termsAndConditions: '', effectiveFrom: '', effectiveUntil: '', publish: false });
  const reload = async () => {
    const [f, p, r] = await Promise.all([
      fetch('/api/admin/worker-mobile/feedback').then((x) => x.json()),
      fetch('/api/admin/worker-mobile/referrals/policy').then((x) => x.json()),
      fetch('/api/admin/worker-mobile/referrals').then((x) => x.json()),
    ]);
    setFeedback(f.items ?? []); setPolicies(p.policies ?? []); setReferrals(r.referrals ?? []);
  };
  useEffect(() => { void reload(); }, []);
  const submitPolicy = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    const response = await fetch('/api/admin/worker-mobile/referrals/policy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, effectiveFrom: new Date(form.effectiveFrom).toISOString(), effectiveUntil: form.effectiveUntil ? new Date(form.effectiveUntil).toISOString() : null }) });
    setMessage(response.ok ? 'Đã lưu chính sách.' : 'Không lưu được. Kiểm tra quyền hoặc dữ liệu.'); if (response.ok) { setForm({ policyVersion: '', title: '', eligibilityCriteria: '', successEventDescription: '', rewardPolicyDescription: '', termsAndConditions: '', effectiveFrom: '', effectiveUntil: '', publish: false }); await reload(); }
  };
  const respond = async (id: string, status: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED') => {
    const adminResponse = window.prompt('Nội dung phản hồi cho người lao động (có thể để trống):') ?? '';
    await fetch(`/api/admin/worker-mobile/feedback/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, adminResponse }) }); await reload();
  };
  const updateReferral = async (referral: Referral) => {
    const status = window.prompt('Trạng thái: IN_REVIEW, QUALIFIED, REWARD_APPROVED, PAID hoặc REJECTED', referral.status);
    if (!status || !['IN_REVIEW', 'QUALIFIED', 'REWARD_APPROVED', 'PAID', 'REJECTED'].includes(status)) return;
    const amount = window.prompt('Mức quyền lợi VND đã được duyệt (để trống nếu chưa duyệt):', referral.benefitAmountVnd ?? '');
    const candidateSubmissionId = window.prompt('ID hồ sơ ứng viên canonical (để trống nếu chưa đối soát):', '');
    const benefitStatus = status === 'PAID' ? 'PAID' : status === 'REWARD_APPROVED' ? 'APPROVED' : undefined;
    const response = await fetch(`/api/admin/worker-mobile/referrals/${referral.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, benefitStatus, ...(amount !== null ? { benefitAmountVnd: amount || null } : {}), ...(candidateSubmissionId ? { candidateSubmissionId } : {}) }) });
    setMessage(response.ok ? 'Đã cập nhật giới thiệu.' : 'Không cập nhật được giới thiệu.'); await reload();
  };
  const setPolicyEnabled = async (policy: Program, isEnabled: boolean) => {
    const response = await fetch('/api/admin/worker-mobile/referrals/policy', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ policyId: policy.id, isEnabled }) });
    setMessage(response.ok ? (isEnabled ? 'Đã công bố chính sách.' : 'Đã đóng chương trình giới thiệu.') : 'Không cập nhật được chính sách.'); await reload();
  };
  return <main className="mx-auto max-w-6xl space-y-8 p-6">
    <header><h1 className="text-2xl font-bold">Người lao động trên ứng dụng</h1><p className="text-sm text-slate-600">Quản lý góp ý và chính sách giới thiệu. Chính sách chỉ mở khi được Owner/Admin công bố.</p></header>
    {message && <p role="status" className="rounded bg-blue-50 p-3">{message}</p>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">Góp ý</h2>{feedback.map((item) => <article key={item.id} className="space-y-2 rounded border bg-white p-4"><p className="text-sm">{item.category} · {item.status} · {new Date(item.createdAt).toLocaleString('vi-VN')}</p><p>{item.content}</p><p className="text-sm text-slate-600">{item.user.name ?? 'NLĐ'} · {item.user.phone ?? 'Không có số điện thoại'}</p><div className="flex gap-2"><button className="rounded border px-3 py-1" onClick={() => void respond(item.id, 'IN_REVIEW')}>Đang xử lý</button><button className="rounded bg-emerald-700 px-3 py-1 text-white" onClick={() => void respond(item.id, 'RESOLVED')}>Đã giải quyết</button><button className="rounded border px-3 py-1" onClick={() => void respond(item.id, 'REJECTED')}>Từ chối</button></div></article>)}</section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Chính sách giới thiệu</h2><p className="text-sm text-slate-600">Không có mức hoa hồng mặc định. Tạo nháp trước; chỉ bật công bố khi chính sách được Owner phê duyệt.</p><ul>{policies.map((p) => <li key={p.id} className="flex items-center justify-between border-b py-2">{p.policyVersion} · {p.title} · {p.isEnabled ? 'Đang mở' : 'Nháp/đóng'}<button className="rounded border px-3 py-1" onClick={() => void setPolicyEnabled(p, !p.isEnabled)}>{p.isEnabled ? 'Đóng chương trình' : 'Công bố phiên bản'}</button></li>)}</ul>
      <form onSubmit={submitPolicy} className="grid gap-3 rounded border p-4 md:grid-cols-2">
        {(['policyVersion','title','eligibilityCriteria','successEventDescription','rewardPolicyDescription','termsAndConditions'] as const).map((key) => <label key={key} className="grid gap-1 text-sm">{key}<textarea required={key !== 'policyVersion' && key !== 'title' ? true : undefined} className="rounded border p-2" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <label className="grid gap-1 text-sm">Hiệu lực từ<input required type="datetime-local" className="rounded border p-2" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></label>
        <label className="grid gap-1 text-sm">Hiệu lực đến<input type="datetime-local" className="rounded border p-2" value={form.effectiveUntil} onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} />Công bố ngay</label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Lưu phiên bản chính sách</button>
      </form>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Giới thiệu người làm</h2>{referrals.map((r) => <article key={r.id} className="rounded border p-4"><strong>{r.referredName}</strong> · {r.referredPhone}<p>{r.jobInterest ?? 'Chưa chọn vị trí'} · {r.status} · Người giới thiệu: {r.referrerUser.name ?? r.referrerUser.phone ?? 'NLĐ'}</p><p>Quyền lợi: {r.benefitStatus} {r.benefitAmountVnd ? `· ${Number(r.benefitAmountVnd).toLocaleString('vi-VN')} ₫` : ''}</p><button className="mt-2 rounded border px-3 py-1" onClick={() => void updateReferral(r)}>Cập nhật đối soát</button></article>)}</section>
  </main>;
}
