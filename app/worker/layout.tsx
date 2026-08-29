/**
 * Worker Portal layout — P1 Portals STEP-04.
 *
 * Wraps /worker/* with PWA metadata + service worker registration.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Người lao động',
  description: 'Cổng người lao động HRPartner — chấm công, phiếu công việc',
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
