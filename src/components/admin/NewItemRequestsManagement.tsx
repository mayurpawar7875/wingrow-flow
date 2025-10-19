import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle, Eye, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export function NewItemRequestsManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Approve form state
  const [approveItemName, setApproveItemName] = useState('');
  const [approveCategory, setApproveCategory] = useState('');
  const [approveUnit, setApproveUnit] = useState('');
  const [approvePrice, setApprovePrice] = useState(0);
  const [createInInventory, setCreateInInventory] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  
  // Reject form state
  const [rejectReason, setRejectReason] = useState('');

  const { data: requests = [] } = useQuery({
    queryKey: ['new-item-requests-admin'],
    queryFn: async () => {
      const { data: requestsData, error } = await supabase
        .from('new_item_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name');

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return requestsData?.map(request => ({
        ...request,
        employee_profile: profilesMap.get(request.employee_id)
      })) || [];
    },
  });

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.employee_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.market_or_location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openApproveDialog = (request: any) => {
    setSelectedRequest(request);
    setApproveItemName(request.item_name);
    setApproveCategory(request.category);
    setApproveUnit(request.unit);
    setApprovePrice(request.estimated_price_per_unit || 0);
    setCreateInInventory(false);
    setApproveComment('');
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (request: any) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const openDetailsDialog = (request: any) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;

    try {
      let inventoryItemId = null;

      // Create inventory item if checkbox is selected
      if (createInInventory) {
        const { data: inventoryItem, error: inventoryError } = await supabase
          .from('inventory_items')
          .insert({
            name: approveItemName,
            sku: `AUTO-${Date.now()}`,
            unit: approveUnit,
            quantity_on_hand: 0,
            price_per_item: approvePrice,
            reorder_level: 10,
            max_level: 100,
            created_by: user.id,
            tags: [approveCategory],
          })
          .select()
          .single();

        if (inventoryError) throw inventoryError;
        inventoryItemId = inventoryItem.id;
      }

      // Update request
      const { error: updateError } = await supabase
        .from('new_item_requests')
        .update({
          status: 'Approved',
          reviewed_by: user.id,
          admin_comment: approveComment || null,
          added_to_inventory: createInInventory,
          inventory_item_id: inventoryItemId,
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: createInInventory
          ? 'Request approved and item added to inventory.'
          : 'Request approved successfully.',
      });

      queryClient.invalidateQueries({ queryKey: ['new-item-requests-admin'] });
      setApproveDialogOpen(false);
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user || !rejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('new_item_requests')
        .update({
          status: 'Rejected',
          reviewed_by: user.id,
          admin_comment: rejectReason,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request rejected successfully.',
      });

      queryClient.invalidateQueries({ queryKey: ['new-item-requests-admin'] });
      setRejectDialogOpen(false);
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Submitted: 'secondary',
      Approved: 'default',
      Rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Search by employee, item, or market..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Est. Price</TableHead>
                  <TableHead>Needed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.employee_profile?.name || 'N/A'}</TableCell>
                      <TableCell>{request.market_or_location}</TableCell>
                      <TableCell className="font-medium">{request.item_name}</TableCell>
                      <TableCell>{request.category}</TableCell>
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell>{request.unit}</TableCell>
                      <TableCell>
                        {request.estimated_price_per_unit > 0
                          ? `₹${request.estimated_price_per_unit}`
                          : '—'}
                      </TableCell>
                      <TableCell>{format(new Date(request.needed_by), 'MMM d')}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailsDialog(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === 'Submitted' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openApproveDialog(request)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(request)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve New Item Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approve-item-name">Item Name</Label>
              <Input
                id="approve-item-name"
                value={approveItemName}
                onChange={(e) => setApproveItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="approve-category">Category</Label>
                <Select value={approveCategory} onValueChange={setApproveCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Packaging">Packaging</SelectItem>
                    <SelectItem value="Stationery">Stationery</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="approve-unit">Unit</Label>
                <Input
                  id="approve-unit"
                  value={approveUnit}
                  onChange={(e) => setApproveUnit(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="approve-price">Price per Unit</Label>
              <Input
                id="approve-price"
                type="number"
                step="0.01"
                value={approvePrice}
                onChange={(e) => setApprovePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-inventory"
                checked={createInInventory}
                onCheckedChange={(checked) => setCreateInInventory(checked as boolean)}
              />
              <Label htmlFor="create-inventory" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Create in Inventory now
              </Label>
            </div>
            <div>
              <Label htmlFor="approve-comment">Comment (Optional)</Label>
              <Textarea
                id="approve-comment"
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="Add any notes or comments..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject New Item Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for Rejection *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{selectedRequest.employee_profile?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Item Name</p>
                  <p className="font-medium">{selectedRequest.item_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedRequest.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{selectedRequest.quantity} {selectedRequest.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Price</p>
                  <p className="font-medium">
                    {selectedRequest.estimated_price_per_unit > 0
                      ? `₹${selectedRequest.estimated_price_per_unit}/${selectedRequest.unit}`
                      : 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Market</p>
                  <p className="font-medium">{selectedRequest.market_or_location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Needed By</p>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.needed_by), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="mt-1">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.vendor_suggestion && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Suggestion</p>
                  <p className="mt-1">{selectedRequest.vendor_suggestion}</p>
                </div>
              )}

              {selectedRequest.admin_comment && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">Admin Comment</p>
                  <p>{selectedRequest.admin_comment}</p>
                </div>
              )}

              {selectedRequest.added_to_inventory && (
                <div className="p-3 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-md">
                  <p className="text-sm font-medium">✓ Added to Inventory</p>
                </div>
              )}

              {selectedRequest.attachment_url && (
                <div>
                  <Button
                    variant="outline"
                    asChild
                  >
                    <a
                      href={selectedRequest.attachment_url}
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

              <div className="text-xs text-muted-foreground">
                <p>Submitted: {format(new Date(selectedRequest.created_at), 'MMM d, yyyy HH:mm')}</p>
                {selectedRequest.updated_at !== selectedRequest.created_at && (
                  <p>Updated: {format(new Date(selectedRequest.updated_at), 'MMM d, yyyy HH:mm')}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
