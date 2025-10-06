import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, Receipt, Package, TrendingUp, Plus, UserPlus, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export default function Dashboard() {
  const {
    user,
    userRole
  } = useAuth();
  const navigate = useNavigate();
  const {
    data: requestsCount
  } = useQuery({
    queryKey: ['requests-count', user?.id],
    queryFn: async () => {
      if (userRole === 'EMPLOYEE') {
        const {
          count
        } = await supabase.from('item_requests').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user?.id);
        return count || 0;
      } else {
        const {
          count
        } = await supabase.from('item_requests').select('*', {
          count: 'exact',
          head: true
        });
        return count || 0;
      }
    }
  });
  const {
    data: reimbursementsCount
  } = useQuery({
    queryKey: ['reimbursements-count', user?.id],
    queryFn: async () => {
      if (userRole === 'EMPLOYEE') {
        const {
          count
        } = await supabase.from('reimbursements').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user?.id);
        return count || 0;
      } else {
        const {
          count
        } = await supabase.from('reimbursements').select('*', {
          count: 'exact',
          head: true
        });
        return count || 0;
      }
    }
  });
  const {
    data: inventoryCount
  } = useQuery({
    queryKey: ['inventory-count'],
    queryFn: async () => {
      const {
        count
      } = await supabase.from('inventory_items').select('*', {
        count: 'exact',
        head: true
      });
      return count || 0;
    }
  });
  const {
    data: lowStockCount
  } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('inventory_items').select('quantity_on_hand, reorder_level');
      const lowStock = data?.filter(item => item.quantity_on_hand <= item.reorder_level);
      return lowStock?.length || 0;
    }
  });

  const { data: approvedClaimsCount } = useQuery({
    queryKey: ['approved-claims-count', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('reimbursements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');
      
      if (userRole === 'EMPLOYEE') {
        query.eq('user_id', user?.id);
      }
      
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: rejectedClaimsCount } = useQuery({
    queryKey: ['rejected-claims-count', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('reimbursements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Rejected');
      
      if (userRole === 'EMPLOYEE') {
        query.eq('user_id', user?.id);
      }
      
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: approvedItemsCount } = useQuery({
    queryKey: ['approved-items-count', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('item_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');
      
      if (userRole === 'EMPLOYEE') {
        query.eq('user_id', user?.id);
      }
      
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: paidClaimsCount } = useQuery({
    queryKey: ['paid-claims-count', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('reimbursements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Paid');
      
      if (userRole === 'EMPLOYEE') {
        query.eq('user_id', user?.id);
      }
      
      const { count } = await query;
      return count || 0;
    },
  });

  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Item Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsCount}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'EMPLOYEE' ? 'Your requests' : 'Total requests'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reimbursements</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reimbursementsCount}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'EMPLOYEE' ? 'Your reimbursements' : 'Total reimbursements'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryCount}</div>
            <p className="text-xs text-muted-foreground">Total items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below reorder level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedClaimsCount}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'EMPLOYEE' ? 'Your approved claims' : 'Total approved'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Claims</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedClaimsCount}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'EMPLOYEE' ? 'Your rejected claims' : 'Total rejected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Items</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedItemsCount}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'EMPLOYEE' ? 'Your approved requests' : 'Total approved'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Received</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidClaimsCount}</div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'EMPLOYEE' ? 'Your paid claims' : 'Total paid'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userRole === 'ADMIN' ? <>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/admin')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/reimbursements')}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Approve Claims
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/requests')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Approve Item Requests
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory')}>
                  <Package className="mr-2 h-4 w-4" />
                  Update Inventory
                </Button>
              </> : <>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/admin')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
                
                {userRole === 'MANAGER' && <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Inventory Item
                  </Button>}
              </>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
}