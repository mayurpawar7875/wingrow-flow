import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Loader2, Filter, Upload, CheckCircle2, IndianRupee, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function EmployeeRequestsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofRemarks, setProofRemarks] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionRemarks, setCollectionRemarks] = useState('');
  const [collectionFile, setCollectionFile] = useState<File | null>(null);

  // Fetch item requests
  const { data: itemRequests, isLoading: itemsLoading } = useQuery({
    queryKey: ['employee-item-requests', user?.id],
    queryFn: async () => {
      const { data: requestsData, error } = await supabase
        .from('item_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch inventory prices
      const itemNames = [...new Set(requestsData?.map(r => r.title))];
      const { data: inventoryItems } = await supabase
        .from('inventory_items')
        .select('name, price_per_item');
      
      const inventoryMap = new Map(inventoryItems?.map(item => [item.name, item.price_per_item || 0]));

      // Fetch collections
      const requestIds = requestsData?.map(r => r.id) || [];
      let collections: any[] = [];
      if (requestIds.length > 0) {
        const { data: collectionsData } = await supabase
          .from('collections')
          .select('*')
          .in('item_request_id', requestIds)
          .order('recorded_at', { ascending: false });
        collections = collectionsData || [];
      }

      return requestsData?.map(request => {
        const requestCollections = collections.filter(c => c.item_request_id === request.id);
        const totalReceived = requestCollections.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const pricePerItem = inventoryMap.get(request.title) || 0;
        const totalDue = pricePerItem * request.quantity;
        const pendingAmount = Math.max(0, totalDue - totalReceived);

        return {
          ...request,
          collections: requestCollections,
          totalDue,
          totalReceived,
          pendingAmount,
        };
      }) || [];
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

  // Upload proof of payment mutation
  const uploadProofMutation = useMutation({
    mutationFn: async ({ requestId, file, remarks }: { requestId: string; file: File; remarks: string }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/proof-${requestId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('item_requests')
        .update({
          proof_of_payment_url: publicUrl,
          proof_of_payment_remarks: remarks,
          proof_uploaded_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-item-requests'] });
      toast.success('Proof of payment uploaded successfully!');
      setUploadDialogOpen(false);
      setProofFile(null);
      setProofRemarks('');
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload proof');
    },
  });

  // Record collection mutation
  const recordCollectionMutation = useMutation({
    mutationFn: async ({ requestId, amount, receiptUrl, remarks }: { requestId: string; amount: number; receiptUrl: string | null; remarks: string }) => {
      const { error } = await supabase
        .from('collections')
        .insert({
          item_request_id: requestId,
          amount,
          receipt_url: receiptUrl,
          remarks: remarks || null,
          recorded_by: user?.id,
        });

      if (error) throw error;

      // Check if fully settled
      const request = itemRequests?.find(r => r.id === requestId);
      if (request) {
        const newTotalReceived = request.totalReceived + amount;
        if (newTotalReceived >= request.totalDue) {
          await supabase
            .from('item_requests')
            .update({ is_settled: true })
            .eq('id', requestId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-item-requests'] });
      toast.success('Collection saved');
      setCollectionDialogOpen(false);
      setSelectedRequest(null);
      setCollectionAmount('');
      setCollectionRemarks('');
      setCollectionFile(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save collection');
    },
  });

  const handleCollectionSubmit = async () => {
    if (!selectedRequest || !collectionAmount) return;

    const amount = parseFloat(collectionAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedRequest.pendingAmount) {
      toast.error(`Amount must be between 0 and ${selectedRequest.pendingAmount}`);
      return;
    }

    try {
      let receiptUrl = null;

      if (collectionFile) {
        const fileExt = collectionFile.name.split('.').pop();
        const fileName = `${user?.id}/${selectedRequest.id}-collection-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('reimbursement-receipts')
          .upload(fileName, collectionFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('reimbursement-receipts')
          .getPublicUrl(fileName);

        receiptUrl = publicUrl;
      }

      recordCollectionMutation.mutate({
        requestId: selectedRequest.id,
        amount,
        receiptUrl,
        remarks: collectionRemarks,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipt');
    }
  };

  // Combine and transform data
  const allRequests = [
    ...(itemRequests || []).map(item => ({
      ...item,
      type: 'Item Request' as const,
      name: item.title,
      quantityOrAmount: `${item.quantity} ${item.unit}`,
      date: item.created_at,
      status: item.status,
      attachmentUrl: item.attachment_url,
      proofOfPaymentUrl: item.proof_of_payment_url,
      canUploadProof: item.status === 'Approved' && !item.proof_of_payment_url,
      hasProof: !!item.proof_of_payment_url,
      totalDue: item.totalDue,
      totalReceived: item.totalReceived,
      pendingAmount: item.pendingAmount,
      collections: item.collections,
      is_settled: item.is_settled,
    })),
    ...(reimbursements || []).map(reimb => ({
      id: reimb.id,
      type: 'Reimbursement' as const,
      name: reimb.category,
      quantityOrAmount: `₹${reimb.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      date: reimb.created_at,
      status: reimb.status,
      attachmentUrl: reimb.bill_file_url,
      proofOfPaymentUrl: null,
      canUploadProof: false,
      hasProof: false,
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

  const handleUploadProof = () => {
    if (!proofFile || !selectedRequest) return;
    
    uploadProofMutation.mutate({
      requestId: selectedRequest.id,
      file: proofFile,
      remarks: proofRemarks,
    });
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
          My Requests / Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Request Type</Label>
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
            <Label className="text-sm font-medium">Status</Label>
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
                          {request.hasProof && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Proof Uploaded
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{request.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.quantityOrAmount}
                        </p>
                      </div>
                      <div className="flex gap-2">
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
                              Receipt
                            </a>
                          </Button>
                        )}
                        {request.proofOfPaymentUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={request.proofOfPaymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gap-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Proof
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Collections Section for Item Requests */}
                    {request.type === 'Item Request' && request.status === 'Approved' && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Total Due</p>
                              <p className="font-semibold flex items-center">
                                <IndianRupee className="h-3 w-3" />
                                {request.totalDue?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Received</p>
                              <p className="font-semibold text-success flex items-center">
                                <IndianRupee className="h-3 w-3" />
                                {request.totalReceived?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Pending</p>
                              <p className="font-semibold text-destructive flex items-center">
                                <IndianRupee className="h-3 w-3" />
                                {request.pendingAmount?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>

                          {!request.is_settled && request.pendingAmount > 0 && (
                            <Dialog open={collectionDialogOpen && selectedRequest?.id === request.id} onOpenChange={(open) => {
                              setCollectionDialogOpen(open);
                              if (!open) {
                                setSelectedRequest(null);
                                setCollectionAmount('');
                                setCollectionRemarks('');
                                setCollectionFile(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => setSelectedRequest(request)}
                                  className="w-full gap-1"
                                >
                                  <Receipt className="h-4 w-4" />
                                  Record Collection
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Record Collection</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <p className="text-sm">
                                      <span className="font-medium">Item:</span> {request.name}
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Pending Amount:</span> ₹{request.pendingAmount?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="collection-amount">Amount Received *</Label>
                                    <Input
                                      id="collection-amount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={request.pendingAmount}
                                      value={collectionAmount}
                                      onChange={(e) => setCollectionAmount(e.target.value)}
                                      placeholder="Enter amount"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="collection-receipt">Upload Receipt (Optional)</Label>
                                    <Input
                                      id="collection-receipt"
                                      type="file"
                                      accept="image/*,application/pdf"
                                      capture="environment"
                                      onChange={(e) => setCollectionFile(e.target.files?.[0] || null)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="collection-remarks">Remarks (Optional)</Label>
                                    <Textarea
                                      id="collection-remarks"
                                      value={collectionRemarks}
                                      onChange={(e) => setCollectionRemarks(e.target.value)}
                                      placeholder="Add any remarks..."
                                      rows={3}
                                    />
                                  </div>
                                  <Button
                                    onClick={handleCollectionSubmit}
                                    disabled={recordCollectionMutation.isPending || !collectionAmount}
                                    className="w-full"
                                  >
                                    {recordCollectionMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Receipt className="mr-2 h-4 w-4" />
                                    )}
                                    Save Collection
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {request.is_settled && (
                            <Badge variant="outline" className="bg-success/20 text-success w-full justify-center">
                              Settled
                            </Badge>
                          )}

                          {/* Collections History */}
                          {request.collections && request.collections.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Collections History:</p>
                              {request.collections.map((collection: any) => (
                                <div key={collection.id} className="text-xs border-l-2 border-primary/20 pl-2 py-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">₹{parseFloat(collection.amount).toFixed(2)}</span>
                                    <span className="text-muted-foreground">{format(new Date(collection.recorded_at), 'MMM dd, yyyy')}</span>
                                  </div>
                                  {collection.receipt_url && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      asChild
                                      className="h-auto p-0 text-xs"
                                    >
                                      <a href={collection.receipt_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View Receipt
                                      </a>
                                    </Button>
                                  )}
                                  {collection.remarks && (
                                    <p className="text-muted-foreground italic">{collection.remarks}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Submitted: {format(new Date(request.date), 'dd MMM yyyy, hh:mm a')}
                      </div>
                      {request.canUploadProof && (
                        <Dialog open={uploadDialogOpen && selectedRequest?.id === request.id} onOpenChange={(open) => {
                          setUploadDialogOpen(open);
                          if (!open) {
                            setSelectedRequest(null);
                            setProofFile(null);
                            setProofRemarks('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setSelectedRequest(request)}
                              className="gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Upload Proof
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Upload Proof of Payment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="proof-file">Upload File *</Label>
                                <Input
                                  id="proof-file"
                                  type="file"
                                  accept="image/*,.pdf"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 5 * 1024 * 1024) {
                                        toast.error('File size must be less than 5MB');
                                        e.target.value = '';
                                        return;
                                      }
                                      setProofFile(file);
                                    }
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  JPG, PNG, or PDF (max 5MB). Use camera for mobile.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="proof-remarks">Remarks (Optional)</Label>
                                <Textarea
                                  id="proof-remarks"
                                  value={proofRemarks}
                                  onChange={(e) => setProofRemarks(e.target.value)}
                                  placeholder="Add any notes about the payment..."
                                  rows={3}
                                />
                              </div>
                              <Button
                                onClick={handleUploadProof}
                                disabled={!proofFile || uploadProofMutation.isPending}
                                className="w-full"
                              >
                                {uploadProofMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Proof
                                  </>
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
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
