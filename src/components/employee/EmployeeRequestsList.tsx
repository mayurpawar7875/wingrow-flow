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
import { ExternalLink, Loader2, Filter, Upload, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function EmployeeRequestsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofRemarks, setProofRemarks] = useState('');

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

  // Upload proof of payment mutation
  const uploadProofMutation = useMutation({
    mutationFn: async ({ requestId, file, remarks }: { requestId: string; file: File; remarks: string }) => {
      // Upload file
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/proof-${requestId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      // Update item request with proof
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
      proofOfPaymentUrl: item.proof_of_payment_url,
      canUploadProof: item.status === 'Approved' && !item.proof_of_payment_url,
      hasProof: !!item.proof_of_payment_url,
    })),
    ...(reimbursements || []).map(reimb => ({
      id: reimb.id,
      type: 'Reimbursement',
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
