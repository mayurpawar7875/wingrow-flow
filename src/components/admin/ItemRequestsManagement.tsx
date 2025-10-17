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
import { ExternalLink, CheckCircle, XCircle, Loader2, FileCheck, IndianRupee, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function ItemRequestsManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | null>(null);
  const [managerComment, setManagerComment] = useState('');
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-item-requests'],
    queryFn: async () => {
      const { data: requestsData, error: requestsError } = await supabase
        .from('item_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (requestsError) throw requestsError;

      // Fetch inventory items to get prices
      const itemNames = [...new Set(requestsData?.map(r => r.title))];
      const { data: inventoryItems, error: invError } = await supabase
        .from('inventory_items')
        .select('name, price_per_item');
      
      if (invError) throw invError;
      
      const inventoryMap = new Map(inventoryItems?.map(item => [item.name, item.price_per_item || 0]));

      // Fetch user profiles
      const userIds = [...new Set(requestsData?.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;

      // Fetch collections
      const requestIds = requestsData?.map(r => r.id) || [];
      let collections: any[] = [];
      if (requestIds.length > 0) {
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .in('item_request_id', requestIds)
          .order('recorded_at', { ascending: false });
        
        if (collectionsError) throw collectionsError;
        collections = collectionsData || [];
      }

      // Merge the data
      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      return requestsData?.map(request => {
        const requestCollections = collections.filter(c => c.item_request_id === request.id);
        const totalReceived = requestCollections.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const pricePerItem = inventoryMap.get(request.title) || 0;
        const totalDue = pricePerItem * request.quantity;
        const pendingAmount = Math.max(0, totalDue - totalReceived);

        return {
          ...request,
          profile: profilesMap.get(request.user_id),
          collections: requestCollections,
          totalDue,
          totalReceived,
          pendingAmount,
        };
      });
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

  const filteredRequests = requests?.filter(req => {
    const matchesSearch = 
      req.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesMarket = marketFilter === 'all' || req.market_or_location === marketFilter;
    
    return matchesSearch && matchesStatus && matchesMarket;
  });

  const uniqueMarkets = [...new Set(requests?.map(r => r.market_or_location).filter(Boolean))];
  
  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setDetailsSheetOpen(true);
  };

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
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search by employee name, email, or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Submitted">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketFilter} onValueChange={setMarketFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {uniqueMarkets.map((market) => (
                <SelectItem key={market} value={market || ''}>
                  {market}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
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
                    <TableCell>
                      {request.market_or_location || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{request.quantity} {request.unit}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                      {request.is_settled && (
                        <Badge variant="outline" className="ml-1 bg-success/20 text-success">
                          Settled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === 'Approved' ? (
                        <div className="space-y-1 min-w-[150px]">
                          <div className="text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Due:</span>
                              <span className="font-semibold">₹{request.totalDue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Received:</span>
                              <span className="font-semibold text-success">₹{request.totalReceived.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pending:</span>
                              <span className="font-semibold text-destructive">₹{request.pendingAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Sheet open={detailsSheetOpen && selectedRequest?.id === request.id} onOpenChange={(open) => {
                          setDetailsSheetOpen(open);
                          if (!open) setSelectedRequest(null);
                        }}>
                          <SheetTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(request)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Details
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Request Details</SheetTitle>
                            </SheetHeader>
                            {selectedRequest && (
                              <div className="space-y-6 py-4">
                                {/* Employee & Request Info */}
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-muted-foreground">Employee</Label>
                                      <p className="font-medium">{selectedRequest.profile?.name}</p>
                                      <p className="text-sm text-muted-foreground">{selectedRequest.profile?.email}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Market Name</Label>
                                      <p className="font-medium">{selectedRequest.market_or_location || '—'}</p>
                                    </div>
                                  </div>
                                  
                                  <Separator />
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-muted-foreground">Item Name</Label>
                                      <p className="font-medium">{selectedRequest.title}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Category</Label>
                                      <Badge variant="outline">{selectedRequest.category}</Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <Label className="text-muted-foreground">Quantity</Label>
                                      <p className="font-medium">{selectedRequest.quantity} {selectedRequest.unit}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Unit Price</Label>
                                      <p className="font-medium">₹{(selectedRequest.totalDue / selectedRequest.quantity).toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Status</Label>
                                      <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                                    </div>
                                  </div>
                                  
                                  {selectedRequest.description && (
                                    <div>
                                      <Label className="text-muted-foreground">Description</Label>
                                      <p className="text-sm">{selectedRequest.description}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Payment Summary */}
                                {selectedRequest.status === 'Approved' && (
                                  <>
                                    <Separator />
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">Payment Summary</h3>
                                      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Total Due</p>
                                          <p className="text-xl font-bold flex items-center">
                                            <IndianRupee className="h-5 w-5" />
                                            {selectedRequest.totalDue.toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Received</p>
                                          <p className="text-xl font-bold text-success flex items-center">
                                            <IndianRupee className="h-5 w-5" />
                                            {selectedRequest.totalReceived.toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Pending</p>
                                          <p className="text-xl font-bold text-destructive flex items-center">
                                            <IndianRupee className="h-5 w-5" />
                                            {selectedRequest.pendingAmount.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Collections History */}
                                    {selectedRequest.collections && selectedRequest.collections.length > 0 && (
                                      <>
                                        <Separator />
                                        <div className="space-y-4">
                                          <h3 className="font-semibold">Collections History</h3>
                                          <div className="space-y-3">
                                            {selectedRequest.collections.map((collection: any) => (
                                              <div key={collection.id} className="border rounded-lg p-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <div>
                                                    <p className="font-semibold text-lg">₹{parseFloat(collection.amount).toFixed(2)}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                      {format(new Date(collection.recorded_at), 'PPP')}
                                                    </p>
                                                  </div>
                                                  {collection.receipt_url && (
                                                    <Button variant="outline" size="sm" asChild>
                                                      <a href={collection.receipt_url} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        View Receipt
                                                      </a>
                                                    </Button>
                                                  )}
                                                </div>
                                                {collection.remarks && (
                                                  <div className="pt-2 border-t">
                                                    <Label className="text-muted-foreground">Remarks</Label>
                                                    <p className="text-sm">{collection.remarks}</p>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Manager Comment */}
                                {selectedRequest.manager_comment && (
                                  <>
                                    <Separator />
                                    <div>
                                      <Label className="text-muted-foreground">Manager Comment</Label>
                                      <p className="text-sm mt-1">{selectedRequest.manager_comment}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>
                        
                        {request.status === 'Submitted' && (
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
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
