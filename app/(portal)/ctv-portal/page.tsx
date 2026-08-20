import Link from 'next/link';

const PROCESS_STEPS = [
  {
    icon: 'ads_click',
    title: 'Bước 1: Đăng ký tham gia',
    desc: 'Nhập thông tin để tạo tài khoản thành viên trên hệ thống Website hoặc Mobile App.',
  },
  {
    icon: 'person_search',
    title: 'Bước 2: Tìm ứng viên',
    desc: 'Tiến hành tìm kiếm ứng viên phù hợp với yêu cầu tuyển dụng của các doanh nghiệp.',
  },
  {
    icon: 'description',
    title: 'Bước 3: Nhập hồ sơ ứng viên lên hệ thống',
    desc: 'Nhân viên tư vấn của HRP sẽ hỗ trợ chăm sóc ứng viên.',
  },
  {
    icon: 'monitoring',
    title: 'Bư�c 4: Theo dõi trạng thái ứng viên',
    desc: 'Bám sát trạng thái ứng viên trên hệ thống và hỗ trợ kịp thời trong quá trình tuyển dụng.',
  },
  {
    icon: 'payments',
    title: 'Bước 5: Nhận tiền hoa hồng',
    desc: 'Nhận hoa hồng cho mỗi ứng viên đi làm đủ thời gian theo quy định.',
  },
];

export default function CTVPage() {
  return (
    <div className="flex flex-col">

      {/* Hero Section */}
      <section
        className="rounded-3xl overflow-hidden relative mb-16 shadow-inner mx-4 sm:mx-6 lg:mx-8 mt-8"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-soft) 0%, #f9a174 100%)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-8 lg:px-16 py-12 lg:py-20 relative z-10">

          {/* Text */}
          <div className="max-w-xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-on-surface leading-tight mb-4">
              Giới thiệu thành viên,<br />
              nhận tiền ngay dễ dàng
            </h1>
            <p className="text-lg text-on-surface mb-8 max-w-md">
              Chương trình cộng tác viên với hoa hồng hấp dẫn, không giới hạn thu nhập, không mất phí
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/register"
                className="inline-block bg-primary text-on-primary font-semibold px-8 py-3.5 rounded-full hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
              >
                Đăng ký tham gia miễn phí
              </Link>
              <Link
                href="/video-huong-dan"
                className="inline-flex items-center gap-2 text-on-surface font-medium hover:text-primary transition-colors"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface shadow-sm text-primary">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                Video hướng dẫn
              </Link>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative h-64 lg:h-96 flex justify-center items-center">
            <span
              className="material-symbols-outlined text-[160px] lg:text-[220px] text-primary/15 select-none"
              aria-hidden
            >
              groups
            </span>
            {/* Floating coin */}
            <div
              className="absolute top-10 left-10 text-primary bg-surface rounded-full w-10 h-10 flex items-center justify-center shadow-md font-bold animate-bounce"
              style={{ animationDuration: '3s' }}
            >
              ₫
            </div>
            <div
              className="absolute bottom-20 right-10 text-primary bg-surface rounded-full w-8 h-8 flex items-center justify-center shadow-md font-bold animate-bounce"
              style={{ animationDuration: '4s' }}
            >
              ₫
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-8 mb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h2 className="text-3xl font-bold text-center text-on-surface mb-12">
          5 bước đơn giản để có thu nhập hấp dẫn
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.title}
              className="bg-surface border border-primary/20 rounded-2xl p-6 shadow-card h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-soft text-primary mb-4">
                <span className="material-symbols-outlined text-xl">{step.icon}</span>
              </div>
              <h3 className="font-bold text-on-surface text-lg mb-3">{step.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed flex-grow">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
