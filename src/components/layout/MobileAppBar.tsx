import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileAppBarProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'Item Requests',
  '/employee': 'My Requests',
  '/reimbursements': 'Reimbursements',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/employees': 'Employees',
  '/assets-inspection-reports': 'Assets Inspection',
  '/admin': 'Admin Panel',
  '/profile': 'Profile',
};

export function MobileAppBar({ onMenuClick }: MobileAppBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const pageTitle = pageTitles[location.pathname] || 'Wingrow';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="flex-1 text-center text-base font-semibold lg:text-left lg:ml-4">
          {pageTitle}
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
