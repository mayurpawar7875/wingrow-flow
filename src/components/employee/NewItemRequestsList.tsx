import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export function NewItemRequestsList() {
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['new-item-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_item_requests')
        .select('*')
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Submitted: 'secondary',
      Approved: 'default',
      Rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading requests...
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No new item requests found. Submit your first request above!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{request.item_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.quantity} {request.unit} • {request.category}
                </p>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Market:</p>
                  <p className="font-medium">{request.market_or_location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Needed By:</p>
                  <p className="font-medium">
                    {format(new Date(request.needed_by), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted:</p>
                  <p className="font-medium">
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {request.estimated_price_per_unit > 0 && (
                  <div>
                    <p className="text-muted-foreground">Est. Price:</p>
                    <p className="font-medium">₹{request.estimated_price_per_unit}/{request.unit}</p>
                  </div>
                )}
              </div>

              {request.reason && (
                <div className="mt-3">
                  <p className="text-muted-foreground">Reason:</p>
                  <p className="mt-1">{request.reason}</p>
                </div>
              )}

              {request.vendor_suggestion && (
                <div>
                  <p className="text-muted-foreground">Vendor Suggestion:</p>
                  <p className="mt-1">{request.vendor_suggestion}</p>
                </div>
              )}

              {request.admin_comment && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-muted-foreground text-xs mb-1">Admin Comment:</p>
                  <p>{request.admin_comment}</p>
                </div>
              )}

              {request.added_to_inventory && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-md">
                  <p className="text-sm font-medium">✓ This item has been added to inventory</p>
                </div>
              )}

              {request.attachment_url && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={request.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Attachment
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
