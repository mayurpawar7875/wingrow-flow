import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ExternalLink, CheckCircle, XCircle, Loader2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export function ItemRequestsManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | null>(null);
  const [managerComment, setManagerComment] = useState('');

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, comment }: { requestId: string; status: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('item_requests')
        .update({
          status: status as any,
          manager_comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-item-requests'] });
      toast.success('Request status updated successfully');
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewAction(null);
      setManagerComment('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update request');
    },
  });

  const handleReview = () => {
    if (!selectedRequest || !reviewAction) return;
    
    updateStatusMutation.mutate({
      requestId: selectedRequest.id,
      status: reviewAction,
      comment: managerComment,
    });
  };

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

  const filteredRequests = requests?.filter(req => 
    req.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <CardTitle>Item Requests for Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by employee name, email, or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests && filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.profile?.name}</div>
                        <div className="text-xs text-muted-foreground">{request.profile?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{request.quantity} {request.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {request.attachment_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={request.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.proof_of_payment_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={request.proof_of_payment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-1"
                          >
                            <FileCheck className="h-4 w-4 text-success" />
                            View
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {request.status === 'Approved' ? 'Pending' : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === 'Submitted' ? (
                        <div className="flex gap-1">
                          <Dialog open={reviewDialogOpen && selectedRequest?.id === request.id} onOpenChange={(open) => {
                            setReviewDialogOpen(open);
                            if (!open) {
                              setSelectedRequest(null);
                              setReviewAction(null);
                              setManagerComment('');
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setReviewAction('Approved');
                                }}
                                className="gap-1"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  {reviewAction === 'Approved' ? 'Approve' : 'Reject'} Request
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <p className="text-sm">
                                    <span className="font-medium">Employee:</span> {request.profile?.name}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Item:</span> {request.title}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Quantity:</span> {request.quantity} {request.unit}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="manager-comment">Comment (Optional)</Label>
                                  <Textarea
                                    id="manager-comment"
                                    value={managerComment}
                                    onChange={(e) => setManagerComment(e.target.value)}
                                    placeholder="Add review comments..."
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      setReviewAction('Approved');
                                      handleReview();
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    variant="default"
                                    className="flex-1"
                                  >
                                    {updateStatusMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setReviewAction('Rejected');
                                      handleReview();
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    {updateStatusMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request);
                              setReviewAction('Rejected');
                              setReviewDialogOpen(true);
                            }}
                            className="gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
