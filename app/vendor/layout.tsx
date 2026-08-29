/**
 * Vendor Portal layout — P1 Portals STEP-06.
 */
export const metadata = {
  title: 'Nhà cung cấp',
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
