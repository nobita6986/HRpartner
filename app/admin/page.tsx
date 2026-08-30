/**
 * /admin — trang tổng quan của portal điều hành.
 *
 * Server Component: chỉ render danh sách lối vào các nghiệp vụ, không truy vấn DB.
 * Số liệu thật (đơn đang mở, kỳ công chờ chốt, ...) sẽ gắn sau, khi có nguồn đếm
 * đủ nhanh để render trong request.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SECTION_CARDS = [
  {
    id: 'staffing',
    label: 'Đơn tuyển dụng',
    group: 'Điều hành',
    href: '/admin/staffing',
    description:
      'Tạo đơn tuyển dụng cho dự án, khai vị trí cần người và điều phối nhân sự giữa các dự án.',
  },
  {
    id: 'attendance',
    label: 'Chấm công',
    group: 'Điều hành',
    href: '/admin/attendance',
    description: 'Nhập bảng chấm công, soát lỗi giờ công và chốt kỳ công theo dự án.',
  },
  {
    id: 'reconciliation',
    label: 'Đối soát',
    group: 'Tài chính',
    href: '/admin/reconciliation',
    description:
      'Đối soát công nợ với nhà cung ứng và khách hàng, theo dõi chênh lệch của từng dự án.',
  },
  {
    id: 'jobs',
    label: 'Tin tuyển dụng',
    group: 'Điều hành',
    href: '/admin/jobs',
    description:
      'Đăng tin tuyển dụng lên trang công khai, tắt tin khi tuyển đủ và xem hồ sơ ứng viên gửi về.',
  },
  {
    id: 'projects',
    label: 'Dự án',
    group: 'Dữ liệu nền',
    href: '/admin/projects',
    description: 'Danh sách dự án: mã, khách hàng, địa điểm làm việc và chỉ tiêu nhân sự.',
  },
  {
    id: 'workers',
    label: 'Nhân viên',
    group: 'Dữ liệu nền',
    href: '/admin/workers',
    description: 'Danh sách nhân viên đang làm việc, lọc theo trạng thái hồ sơ.',
  },
  {
    id: 'clients',
    label: 'Khách hàng',
    group: 'Dữ liệu nền',
    href: '/admin/clients',
    description: 'Danh sách công ty khách hàng và thông tin liên hệ.',
  },
  {
    id: 'payroll',
    label: 'Cấu hình lương',
    group: 'Tài chính',
    href: '/admin/payroll',
    description: 'Tham số tính lương: bảo hiểm xã hội, thuế thu nhập cá nhân, lương tối thiểu.',
  },
  {
    id: 'tickets',
    label: 'Phản ánh',
    group: 'Điều hành',
    href: '/admin/tickets',
    description: 'Xử lý đề nghị của người lao động: khiếu nại giờ công, nghỉ phép, tạm ứng lương.',
  },
] as const;

export default function AdminOverviewPage() {
  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10" style={{ background: 'var(--surface)' }}>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--on-surface)' }}>
          Tổng quan
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Chọn một nghiệp vụ để bắt đầu. Mỗi thẻ dưới đây là một khu vực làm việc riêng.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTION_CARDS.map((card) => (
          <a
            key={card.id}
            href={card.href}
            className="block rounded-lg border p-5 transition-shadow hover:shadow-md"
            style={{
              background: 'var(--surface-container-lowest)',
              borderColor: 'var(--outline-variant)',
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold" style={{ color: 'var(--on-surface)' }}>
                {card.label}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                }}
              >
                {card.group}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
              {card.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
