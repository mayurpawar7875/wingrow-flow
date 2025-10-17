import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Filter } from 'lucide-react';
import { format } from 'date-fns';

export function EmployeeRequestsList() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch item requests
  const { data: itemRequests, isLoading: itemsLoading } = useQuery({
    queryKey: ['employee-item-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reimbursements
  const { data: reimbursements, isLoading: reimbursementsLoading } = useQuery({
    queryKey: ['employee-reimbursements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reimbursements')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Combine and transform data
  const allRequests = [
    ...(itemRequests || []).map(item => ({
      id: item.id,
      type: 'Item Request',
      name: item.title,
      quantityOrAmount: `${item.quantity} ${item.unit}`,
      date: item.created_at,
      status: item.status,
      attachmentUrl: item.attachment_url,
    })),
    ...(reimbursements || []).map(reimb => ({
      id: reimb.id,
      type: 'Reimbursement',
      name: reimb.category,
      quantityOrAmount: `₹${reimb.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      date: reimb.created_at,
      status: reimb.status,
      attachmentUrl: reimb.bill_file_url,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply filters
  const filteredRequests = allRequests.filter(req => {
    const matchesType = typeFilter === 'all' || req.type.toLowerCase().includes(typeFilter);
    const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Draft: 'secondary',
      Submitted: 'secondary',
      Approved: 'default',
      Rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const isLoading = itemsLoading || reimbursementsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          My Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Request Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="item">Item Requests</SelectItem>
                <SelectItem value="reimbursement">Reimbursements</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No requests found</p>
            <p className="text-sm mt-2">Submit your first request using the form above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{request.type}</Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        <h3 className="font-semibold text-lg">{request.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.quantityOrAmount}
                        </p>
                      </div>
                      {request.attachmentUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={request.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(request.date), 'dd MMM yyyy, hh:mm a')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
