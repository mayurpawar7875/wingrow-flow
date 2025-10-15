import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { ReimbursementDialog } from '@/components/reimbursements/ReimbursementDialog';
import { ReimbursementTable } from '@/components/reimbursements/ReimbursementTable';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Reimbursements() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ['reimbursements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reimbursements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reimbursements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast.success('Reimbursement deleted successfully');
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete reimbursement: ' + error.message);
    },
  });

  const handleEdit = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    setSelectedReimbursement(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reimbursements</h1>
          <p className="text-muted-foreground">
            Submit and track reimbursement requests
          </p>
        </div>
        <Button onClick={() => {
          setSelectedReimbursement(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <ReimbursementTable
        reimbursements={reimbursements || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ReimbursementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
        reimbursement={selectedReimbursement}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reimbursement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reimbursement request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}