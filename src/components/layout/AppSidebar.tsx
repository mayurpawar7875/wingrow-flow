import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Package,
  Store,
  BarChart3,
  Settings,
  User,
  LogOut,
  Menu,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { title: 'Item Requests', url: '/requests', icon: FileText, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { title: 'Reimbursements', url: '/reimbursements', icon: Receipt, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { title: 'Inventory', url: '/inventory', icon: Package, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { title: 'Reports', url: '/reports', icon: BarChart3, roles: ['MANAGER', 'ADMIN'] },
];

const adminNavItems = [
  { title: 'Onboarded Employees', url: '/employees', icon: Users, roles: ['ADMIN'] },
  { title: 'Assets Inspection', url: '/assets-inspection-reports', icon: ClipboardCheck, roles: ['ADMIN'] },
  { title: 'Admin', url: '/admin', icon: Settings, roles: ['ADMIN'] },
];

export function AppSidebar() {
  const { state, closeSidebar } = useSidebar();
  const location = useLocation();
  const { userRole, signOut, signingOut } = useAuth();
  const isMobile = useIsMobile();

  const handleNavClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground';

  const filteredMainNav = mainNavItems.filter(
    (item) => userRole && item.roles.includes(userRole)
  );

  const filteredAdminNav = adminNavItems.filter(
    (item) => userRole && item.roles.includes(userRole)
  );

  return (
    <Sidebar 
      className="border-r border-sidebar-border"
      collapsible={isMobile ? "offcanvas" : "icon"}
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            Wingrow Inventory
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredAdminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/profile" className={getNavCls} onClick={handleNavClick}>
                <User className="h-4 w-4" />
                <span>Profile</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={() => {
                  handleNavClick();
                  signOut();
                }}
                disabled={signingOut}
                className="w-full hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
              >
                <LogOut className="h-4 w-4" />
                <span>{signingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
