interface RecruitmentHighlightProps {
  className?: string;
}

export function RecruitmentHighlight({ className = '' }: RecruitmentHighlightProps) {
  return (
    <div
      data-testid="recruitment-highlight"
      className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-6 text-on-primary shadow-card backdrop-blur-md ${className}`}
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-label text-label-sm font-bold uppercase tracking-widest text-white/80">
            Quy trình rõ ràng
          </p>
          <h3 className="mt-1 font-head text-headline-md font-bold text-on-primary">
            Cùng HRP tuyển nhanh
          </h3>
        </div>
        <ul className="flex flex-col gap-3 text-body-md text-white/90">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base" aria-hidden="true">
              check_circle
            </span>
            <span>Đăng công việc trong 5 phút, không cần tài khoản doanh nghiệp.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base" aria-hidden="true">
              check_circle
            </span>
            <span>HRP lọc hồ sơ theo tiêu chí địa điểm, ca làm, mức lương thực tế.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base" aria-hidden="true">
              check_circle
            </span>
            <span>Bạn chỉ gặp ứng viên đã được sàng lọc và đồng ý phỏng vấn.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
