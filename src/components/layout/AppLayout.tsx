import { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileAppBar } from './MobileAppBar';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <MobileAppBar onMenuClick={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        
        <main className="flex-1 overflow-auto">
          <div className="container max-w-[1200px] py-4 md:py-6 px-4 md:px-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}
