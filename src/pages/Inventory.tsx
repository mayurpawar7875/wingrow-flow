import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Inventory() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            View and manage inventory items
          </p>
        </div>
        {(userRole === 'MANAGER' || userRole === 'ADMIN') && (
          <Button onClick={() => navigate('/inventory/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Inventory items will be displayed here
        </p>
      </div>
    </div>
  );
}
