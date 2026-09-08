export function BestJobsSection() {
  return (
    <section
      aria-labelledby="hrp-best-jobs-heading"
      aria-busy="true"
      className="w-full rounded-3xl bg-surface-container-low px-5 py-8 md:px-8"
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="font-label text-label-sm font-bold uppercase tracking-widest text-primary-dark">
          Gợi ý cho bạn
        </p>
        <h2 id="hrp-best-jobs-heading" className="font-head text-headline-lg font-bold text-on-surface">
          Việc làm tốt nhất
        </h2>
        <p className="max-w-2xl font-body text-body-md text-on-surface-variant">
          Dữ liệu việc làm mới đang được đồng bộ. Bạn vẫn có thể tìm kiếm danh sách đang tuyển bên dưới.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-outline-variant/50 bg-surface p-5 shadow-card"
          >
            <div className="mb-5 h-11 w-11 rounded-xl bg-primary-fixed" />
            <div className="mb-3 h-4 w-4/5 rounded-full bg-surface-container-highest" />
            <div className="mb-6 h-3 w-3/5 rounded-full bg-surface-container-high" />
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded-full bg-primary-fixed-dim" />
              <div className="h-7 w-20 rounded-full bg-tertiary-fixed" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Đang đồng bộ dữ liệu việc làm tốt nhất.</span>
    </section>
  );
}
