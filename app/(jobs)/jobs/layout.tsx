/**
 * Layout trong suốt cho /jobs — chỉ tồn tại để khai báo `metadata.title` (DEC-07).
 * Trang /jobs là Client Component nên không tự export metadata được.
 * KHÔNG thêm markup/provider/CSS: layout này phải không đổi UI hiện tại.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Việc làm',
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
