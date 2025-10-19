import { useState, useMemo } from 'react';
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
import { CheckCircle, XCircle, Eye, FileText, ExternalLink, Package } from 'lucide-react';
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
  const [approvedQuantity, setApprovedQuantity] = useState(0);
  const [approvedUnitPrice, setApprovedUnitPrice] = useState<number | null>(null);
  const [linkedInventoryItemId, setLinkedInventoryItemId] = useState<string>('new');
  const [linkedInventoryItemName, setLinkedInventoryItemName] = useState('');
  const [updateInventoryOnApprove, setUpdateInventoryOnApprove] = useState(true);
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

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-items-autocomplete'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit, quantity_on_hand, item_version, price_per_item')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      return data || [];
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
    setApprovedQuantity(request.quantity);
    setApprovedUnitPrice(request.estimated_price_per_unit || null);
    
    // Try to find matching inventory item by name
    const matchingItem = inventoryItems.find(
      item => item.name.toLowerCase() === request.item_name.toLowerCase()
    );
    
    if (matchingItem) {
      setLinkedInventoryItemId(matchingItem.id);
      setLinkedInventoryItemName(matchingItem.name);
    } else {
      setLinkedInventoryItemId('new');
      setLinkedInventoryItemName(request.item_name);
    }
    
    setUpdateInventoryOnApprove(true);
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

    // Validation
    if (approvedQuantity <= 0 || !Number.isInteger(approvedQuantity)) {
      toast({
        title: 'Error',
        description: 'Approved quantity must be a positive integer',
        variant: 'destructive',
      });
      return;
    }

    // Idempotency check
    if (selectedRequest.added_to_inventory) {
      toast({
        title: 'Error',
        description: 'This request has already been processed. Inventory was already updated.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let finalInventoryItemId = linkedInventoryItemId;
      let itemName = linkedInventoryItemName;

      // Handle inventory update if checkbox is selected
      if (updateInventoryOnApprove) {
        if (linkedInventoryItemId === 'new') {
          // Create new inventory item
          const { data: newItem, error: createError } = await supabase
            .from('inventory_items')
            .insert({
              name: linkedInventoryItemName,
              sku: `AUTO-${Date.now()}`,
              unit: selectedRequest.unit,
              quantity_on_hand: approvedQuantity,
              price_per_item: approvedUnitPrice || 0,
              reorder_level: null,
              is_archived: false,
              created_by: user.id,
              tags: [selectedRequest.category],
            })
            .select()
            .single();

          if (createError) throw createError;
          finalInventoryItemId = newItem.id;
          itemName = newItem.name;

          // Create stock movement for new item
          await supabase.from('inventory_transactions').insert({
            item_id: newItem.id,
            type: 'Inbound',
            quantity: approvedQuantity,
            prev_quantity: 0,
            new_quantity: approvedQuantity,
            reason: `New item request approved: ${selectedRequest.item_name}`,
            reference: selectedRequest.id,
            performed_by: user.id,
          });
        } else {
          // Update existing inventory item with optimistic locking
          const existingItem = inventoryItems.find(item => item.id === linkedInventoryItemId);
          if (!existingItem) throw new Error('Inventory item not found');

          const { data: updateResult, error: updateError } = await supabase.rpc(
            'update_stock_with_version',
            {
              _item_id: linkedInventoryItemId,
              _current_version: existingItem.item_version,
              _quantity_delta: approvedQuantity,
              _movement_type: 'Inbound',
              _reason: `New item request approved: ${selectedRequest.item_name}`,
              _performed_by: user.id,
              _reference_id: selectedRequest.id,
            }
          );

          if (updateError) {
            if (updateError.code === 'P0001') {
              throw new Error('Version conflict: Item was updated by another user. Please refresh and try again.');
            } else if (updateError.code === 'P0002') {
              throw new Error('Insufficient inventory');
            }
            throw updateError;
          }

          // Update price if provided
          if (approvedUnitPrice !== null && approvedUnitPrice > 0) {
            await supabase
              .from('inventory_items')
              .update({ price_per_item: approvedUnitPrice })
              .eq('id', linkedInventoryItemId);
          }

          itemName = existingItem.name;
        }
      }

      // Update the new item request
      const { error: requestUpdateError } = await supabase
        .from('new_item_requests')
        .update({
          status: 'Approved',
          reviewed_by: user.id,
          admin_comment: approveComment || null,
          added_to_inventory: updateInventoryOnApprove,
          inventory_item_id: finalInventoryItemId !== 'new' ? finalInventoryItemId : null,
          approved_quantity: approvedQuantity,
          approved_at: new Date().toISOString(),
          approved_unit_price: approvedUnitPrice,
        })
        .eq('id', selectedRequest.id);

      if (requestUpdateError) throw requestUpdateError;

      toast({
        title: 'Success',
        description: updateInventoryOnApprove
          ? `Inventory updated: +${approvedQuantity} to ${itemName}`
          : 'Request approved successfully.',
      });

      queryClient.invalidateQueries({ queryKey: ['new-item-requests-admin'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items-autocomplete'] });
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
                  <TableHead>Inventory</TableHead>
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
                        {request.added_to_inventory && (
                          <Badge variant="default" className="gap-1">
                            <Package className="h-3 w-3" />
                            Updated
                          </Badge>
                        )}
                      </TableCell>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="approved-quantity">Approved Quantity *</Label>
                <Input
                  id="approved-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={approvedQuantity}
                  onChange={(e) => setApprovedQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="approved-unit-price">Unit Price (Optional)</Label>
                <Input
                  id="approved-unit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={approvedUnitPrice || ''}
                  onChange={(e) => setApprovedUnitPrice(e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="linked-inventory-item">Link to Inventory Item *</Label>
              <Select 
                value={linkedInventoryItemId} 
                onValueChange={(value) => {
                  setLinkedInventoryItemId(value);
                  if (value !== 'new') {
                    const item = inventoryItems.find(i => i.id === value);
                    if (item) setLinkedInventoryItemName(item.name);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <span className="font-medium">Create New Item: {selectedRequest?.item_name}</span>
                  </SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity_on_hand} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedInventoryItemId === 'new' && (
                <div className="mt-2">
                  <Label htmlFor="new-item-name">New Item Name</Label>
                  <Input
                    id="new-item-name"
                    value={linkedInventoryItemName}
                    onChange={(e) => setLinkedInventoryItemName(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-inventory"
                checked={updateInventoryOnApprove}
                onCheckedChange={(checked) => setUpdateInventoryOnApprove(checked as boolean)}
              />
              <Label htmlFor="update-inventory" className="text-sm font-medium leading-none">
                Update Inventory on Approve
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
