import { GlobalNavbar } from '@/app/components/GlobalNavbar';
import { GlobalFooter } from '@/app/components/GlobalFooter';
import { FloatingChatActions } from '@/app/components/FloatingChatActions';
import { PublicStickyAnnouncement } from '@/src/domains/job-board/public-content-controls';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <GlobalNavbar />
      <main className="flex-1">{children}</main>
      <GlobalFooter />
      <FloatingChatActions />
      {/* Phase B / UI2 — sticky bottom announcement. Mounted once at the
          public-portal layout only. Admin / recruiter / worker / CTV / login
          / /forbidden layouts do NOT include this file, so the bar is
          suppressed in those routes. */}
      <PublicStickyAnnouncement />
    </div>
  );
}
