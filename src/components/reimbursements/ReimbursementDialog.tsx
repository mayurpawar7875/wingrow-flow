import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';

const reimbursementSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Travel', 'Food', 'Stationery', 'Misc'], {
    errorMap: () => ({ message: 'Please select a valid expense type' }),
  }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be greater than 0',
  }),
  market_or_location: z.string().min(2, 'Market/Location must be at least 2 characters'),
  notes: z.string().optional(),
});

type ReimbursementFormData = z.infer<typeof reimbursementSchema>;

interface ReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  reimbursement?: any;
}

export function ReimbursementDialog({
  open,
  onOpenChange,
  onSuccess,
  reimbursement,
}: ReimbursementDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!reimbursement;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReimbursementFormData>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: reimbursement
      ? {
          date: reimbursement.date,
          category: reimbursement.category,
          amount: reimbursement.amount.toString(),
          market_or_location: reimbursement.market_or_location || '',
          notes: reimbursement.notes || '',
        }
      : {},
  });

  const category = watch('category');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setFile(selectedFile);
  };

  const uploadReceipt = async (userId: string): Promise<string | null> => {
    if (!file) return reimbursement?.bill_file_url || null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('reimbursement-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reimbursement-receipts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error('Failed to upload receipt: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ReimbursementFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const receiptUrl = await uploadReceipt(user.id);
      if (!receiptUrl && !reimbursement?.bill_file_url) {
        toast.error('Receipt upload is required');
        return;
      }

      const reimbursementData = {
        user_id: user.id,
        date: data.date,
        category: data.category as 'Travel' | 'Food' | 'Stationery' | 'Misc',
        amount: parseFloat(data.amount),
        market_or_location: data.market_or_location,
        notes: data.notes || null,
        bill_file_url: receiptUrl,
        status: 'Submitted' as const,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('reimbursements')
          .update(reimbursementData)
          .eq('id', reimbursement.id);

        if (error) throw error;
        toast.success('Reimbursement updated successfully');
      } else {
        const { error } = await supabase
          .from('reimbursements')
          .insert([reimbursementData]);

        if (error) throw error;
        toast.success('Reimbursement submitted successfully');
      }

      reset();
      setFile(null);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save reimbursement');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'New'} Reimbursement Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Expense Date *</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Expense Type *</Label>
              <Select 
                value={category as 'Travel' | 'Food' | 'Stationery' | 'Misc' | undefined} 
                onValueChange={(value) => setValue('category', value as 'Travel' | 'Food' | 'Stationery' | 'Misc')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Stationery">Stationery</SelectItem>
                  <SelectItem value="Misc">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="market_or_location">Market/Location *</Label>
              <Input
                id="market_or_location"
                placeholder="e.g., Mumbai Central"
                {...register('market_or_location')}
              />
              {errors.market_or_location && (
                <p className="text-sm text-destructive">{errors.market_or_location.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about the expense"
              rows={3}
              {...register('notes')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">
              Receipt Upload * (JPG, PNG, PDF - Max 5MB)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {reimbursement?.bill_file_url && !file && (
                <a
                  href={reimbursement.bill_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View current
                </a>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
                setFile(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : isEdit ? 'Update' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
