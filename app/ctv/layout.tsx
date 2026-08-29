/**
 * CTV Dashboard layout — P1 Portals STEP-08.
 */
export const metadata = {
  title: 'Cộng tác viên',
};

export default function CtvLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
