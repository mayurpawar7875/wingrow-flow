import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Requests() {
  const { user, userRole } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['item-requests', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('item_requests')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: requestsData, error: requestsError } = await query;
      if (requestsError) throw requestsError;

      // Fetch user profiles for all rows
      const userIds = [...new Set((requestsData ?? []).map(r => r.user_id))];
      if (userIds.length === 0) return requestsData;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      return (requestsData ?? []).map(request => ({
        ...request,
        profile: profilesMap.get(request.user_id),
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Item Requests</h1>
        <p className="text-muted-foreground">Manage and track item requests</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">Loading...</div>
          ) : requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Market Name</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.profile?.name || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {/* TODO: Confirm source of Market Name. Placeholder for now. */}
                      -
                    </TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
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
