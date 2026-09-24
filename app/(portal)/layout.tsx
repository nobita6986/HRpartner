import { GlobalNavbar } from '@/app/components/GlobalNavbar';
import { GlobalFooter } from '@/app/components/GlobalFooter';
import { FloatingChatActions } from '@/app/components/FloatingChatActions';

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
    </div>
  );
}
