/**
 * Worker Portal layout — P1 Portals STEP-04.
 *
 * Wraps /worker/* with PWA metadata + service worker registration.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HRPartner Worker',
  description: 'Worker PWA - Check-in, attendance, and tickets',
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
