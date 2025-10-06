import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Requests() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['item-requests', user?.id, userRole],
    queryFn: async () => {
      console.log('User role in Requests:', userRole);
      console.log('User ID:', user?.id);
      
      let query = supabase
        .from('item_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // If employee, show only their requests
      if (userRole === 'EMPLOYEE') {
        console.log('Filtering by user_id for EMPLOYEE');
        query = query.eq('user_id', user?.id);
      } else {
        console.log('Showing all requests for ADMIN/MANAGER');
      }

      const { data: requestsData, error: requestsError } = await query;
      
      if (requestsError) throw requestsError;

      // Fetch user profiles for manager/admin view
      if (userRole !== 'EMPLOYEE' && requestsData) {
        const userIds = [...new Set(requestsData.map(r => r.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        if (profilesError) throw profilesError;

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));
        return requestsData.map(request => ({
          ...request,
          profile: profilesMap.get(request.user_id),
        }));
      }

      return requestsData;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-success/20 text-success';
      case 'Rejected':
        return 'bg-destructive/20 text-destructive';
      case 'Submitted':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Item Requests</h1>
          <p className="text-muted-foreground">
            Manage and track item requests
          </p>
        </div>
        <Button onClick={() => navigate('/requests/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">Loading...</div>
          ) : requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {userRole !== 'EMPLOYEE' && <TableHead>Employee</TableHead>}
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request: any) => (
                  <TableRow key={request.id}>
                    {userRole !== 'EMPLOYEE' && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.profile?.name}</div>
                          <div className="text-sm text-muted-foreground">{request.profile?.email}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>{request.unit}</TableCell>
                    <TableCell>{request.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(request.created_at), 'MMM dd, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No item requests found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
