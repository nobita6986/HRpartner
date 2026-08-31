/**
 * layout.tsx — go-live-12 / DEC-08.
 *
 * Trang chi tiết là bề mặt công khai, nên nó phải nằm trong ĐÚNG khung của bề mặt công khai:
 * `GlobalNavbar` cộng `GlobalFooter`, cùng lớp và cùng token với `app/(portal)/layout.tsx`. Nhóm
 * `(jobs)` không có layout riêng, nên không có file này thì `/viec-lam/{code}` render trần trong
 * root layout: không thanh điều hướng, không chân trang, lệch hẳn khỏi `/` mà nó đi ra từ đó.
 *
 * Dùng lại, không định nghĩa mới: không token mới, không khối `prefers-reduced-motion` mới, không
 * provider mới. `/track` cố tình không dùng khung này (layout ở đó trong suốt) nên phạm vi file này
 * dừng ở `viec-lam`, không nâng lên mức nhóm `(jobs)`.
 */
import { GlobalNavbar } from '@/app/components/GlobalNavbar';
import { GlobalFooter } from '@/app/components/GlobalFooter';

export default function PublicJobDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <GlobalNavbar />
      <main className="flex-1">{children}</main>
      <GlobalFooter />
    </div>
  );
}
