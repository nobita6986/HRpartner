/**
 * Layout trong suốt cho /track — chỉ tồn tại để khai báo `metadata.title` (DEC-07).
 * Trang /track là Client Component nên không tự export metadata được.
 * KHÔNG thêm markup/provider/CSS: layout này phải không đổi UI hiện tại.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tra cứu hồ sơ ứng tuyển',
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
