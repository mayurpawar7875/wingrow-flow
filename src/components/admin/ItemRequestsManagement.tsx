import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ItemRequestsManagement() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-item-requests'],
    queryFn: async () => {
      const { data: requestsData, error: requestsError } = await supabase
        .from('item_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (requestsError) throw requestsError;

      // Fetch user profiles separately
      const userIds = [...new Set(requestsData?.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;

      // Merge the data
      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      return requestsData?.map(request => ({
        ...request,
        profile: profilesMap.get(request.user_id),
      }));
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
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
            {requests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{request.profile?.name}</div>
                    <div className="text-sm text-muted-foreground">{request.profile?.email}</div>
                  </div>
                </TableCell>
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
      </CardContent>
    </Card>
  );
}
