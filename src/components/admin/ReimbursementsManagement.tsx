import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, X, ExternalLink, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ReimbursementsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; reimbursement: any; action: 'approve' | 'reject' | null }>({
    open: false,
    reimbursement: null,
    action: null,
  });
  const [reviewComment, setReviewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ['admin-reimbursements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reimbursements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Combine data
      return data.map(r => ({
        ...r,
        profile: profiles?.find(p => p.id === r.user_id)
      }));
    },
  });

  const updateReimbursementMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: 'Approved' | 'Rejected'; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('reimbursements')
        .update({
          status: status as 'Approved' | 'Rejected',
          manager_comment: comment || null,
          reviewed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reimbursements'] });
      toast.success(
        variables.status === 'Approved'
          ? 'Reimbursement approved'
          : 'Reimbursement rejected'
      );
      setReviewDialog({ open: false, reimbursement: null, action: null });
      setReviewComment('');
    },
    onError: (error: any) => {
      toast.error('Failed to update reimbursement: ' + error.message);
    },
  });

  const handleReview = (reimbursement: any, action: 'approve' | 'reject') => {
    setReviewDialog({ open: true, reimbursement, action });
  };

  const confirmReview = () => {
    if (!reviewDialog.reimbursement || !reviewDialog.action) return;

    updateReimbursementMutation.mutate({
      id: reviewDialog.reimbursement.id,
      status: reviewDialog.action === 'approve' ? 'Approved' : 'Rejected',
      comment: reviewComment,
    });
  };

  const filteredReimbursements = reimbursements?.filter((r: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      r.profile?.name?.toLowerCase().includes(searchLower) ||
      r.profile?.email?.toLowerCase().includes(searchLower) ||
      r.category?.toLowerCase().includes(searchLower) ||
      r.market_or_location?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Submitted: 'secondary',
      Approved: 'default',
      Rejected: 'destructive',
    };

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee, type, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expense Type</TableHead>
              <TableHead>Amount (₹)</TableHead>
              <TableHead>Market/Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReimbursements?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No reimbursement requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredReimbursements?.map((reimbursement) => (
                <TableRow key={reimbursement.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{reimbursement.profile?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{reimbursement.profile?.email || '-'}</p>
                  </div>
                </TableCell>
                  <TableCell>{format(new Date(reimbursement.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{reimbursement.category}</TableCell>
                  <TableCell>
                    ₹{reimbursement.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{reimbursement.market_or_location}</TableCell>
                  <TableCell>{getStatusBadge(reimbursement.status)}</TableCell>
                  <TableCell>
                    {reimbursement.bill_file_url && (
                      <a
                        href={reimbursement.bill_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {reimbursement.status === 'Submitted' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleReview(reimbursement, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReview(reimbursement, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, reimbursement: null, action: null });
          setReviewComment('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Reimbursement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <p className="text-sm">{reviewDialog.reimbursement?.profile?.name || 'Unknown'}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <p className="text-sm">
                ₹{reviewDialog.reimbursement?.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Review Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add any comments or notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialog({ open: false, reimbursement: null, action: null });
                setReviewComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={confirmReview}
              disabled={updateReimbursementMutation.isPending}
            >
              {updateReimbursementMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm {reviewDialog.action === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
