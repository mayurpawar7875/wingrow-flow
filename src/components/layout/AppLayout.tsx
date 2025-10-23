import { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileAppBar } from './MobileAppBar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex flex-col flex-1 min-w-0">
        <MobileAppBar onMenuClick={toggleSidebar} />
        
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
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}
