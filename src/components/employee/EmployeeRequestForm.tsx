import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Camera, Upload } from 'lucide-react';

const requestSchema = z.object({
  requestType: z.enum(['item', 'reimbursement']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  quantityOrAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Must be greater than 0',
  }),
  category: z.string().optional(),
  unit: z.string().optional(),
  market_or_location: z.string().optional(),
  remarks: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface EmployeeRequestFormProps {
  onSuccess: () => void;
}

export function EmployeeRequestForm({ onSuccess }: EmployeeRequestFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  const requestType = watch('requestType');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setFile(selectedFile);
  };

  const uploadFile = async (userId: string): Promise<string | null> => {
    if (!file) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const bucket = requestType === 'reimbursement' ? 'reimbursement-receipts' : 'attachments';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileUrl = await uploadFile(user.id);

      if (data.requestType === 'reimbursement') {
        if (!fileUrl) {
          toast.error('Receipt upload is required for reimbursements');
          return;
        }

        const { error } = await supabase.from('reimbursements').insert([{
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          category: data.category as 'Travel' | 'Food' | 'Stationery' | 'Misc',
          amount: parseFloat(data.quantityOrAmount),
          market_or_location: data.market_or_location || '',
          notes: data.remarks || null,
          bill_file_url: fileUrl,
          status: 'Submitted' as const,
        }]);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('item_requests').insert([{
          user_id: user.id,
          title: data.name,
          category: data.category as 'Stationery' | 'Transport' | 'Packaging' | 'Misc',
          quantity: parseInt(data.quantityOrAmount),
          unit: data.unit || 'pcs',
          description: data.remarks || null,
          attachment_url: fileUrl,
          status: 'Draft' as const,
          priority: 'Medium' as const,
        }]);

        if (error) throw error;
      }

      toast.success('Request submitted successfully!');
      reset();
      setFile(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit New Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Request Type */}
          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type *</Label>
            <Select
              value={requestType}
              onValueChange={(value) => setValue('requestType', value as 'item' | 'reimbursement')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item">Item Request</SelectItem>
                <SelectItem value="reimbursement">Reimbursement</SelectItem>
              </SelectContent>
            </Select>
            {errors.requestType && (
              <p className="text-sm text-destructive">{errors.requestType.message}</p>
            )}
          </div>

          {requestType && (
            <>
              {/* Name/Expense Type */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {requestType === 'item' ? 'Item Name' : 'Expense Name'} *
                </Label>
                <Input
                  id="name"
                  placeholder={requestType === 'item' ? 'e.g., Printer Paper' : 'e.g., Travel Expense'}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestType === 'item' ? (
                      <>
                        <SelectItem value="Stationery">Stationery</SelectItem>
                        <SelectItem value="Transport">Transport</SelectItem>
                        <SelectItem value="Packaging">Packaging</SelectItem>
                        <SelectItem value="Misc">Miscellaneous</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Stationery">Stationery</SelectItem>
                        <SelectItem value="Misc">Miscellaneous</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity or Amount */}
              <div className="space-y-2">
                <Label htmlFor="quantityOrAmount">
                  {requestType === 'item' ? 'Quantity' : 'Amount (₹)'} *
                </Label>
                <Input
                  id="quantityOrAmount"
                  type="number"
                  step={requestType === 'reimbursement' ? '0.01' : '1'}
                  placeholder={requestType === 'item' ? 'Enter quantity' : '0.00'}
                  {...register('quantityOrAmount')}
                />
                {errors.quantityOrAmount && (
                  <p className="text-sm text-destructive">{errors.quantityOrAmount.message}</p>
                )}
              </div>

              {/* Unit (for items only) */}
              {requestType === 'item' && (
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., pcs, kg, liters"
                    {...register('unit')}
                  />
                </div>
              )}

              {/* Market/Location (for reimbursement only) */}
              {requestType === 'reimbursement' && (
                <div className="space-y-2">
                  <Label htmlFor="market_or_location">Market/Location</Label>
                  <Input
                    id="market_or_location"
                    placeholder="e.g., Mumbai Central"
                    {...register('market_or_location')}
                  />
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt">
                  {requestType === 'reimbursement' ? 'Receipt *' : 'Attachment'} (JPG, PNG, PDF - Max 5MB)
                </Label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => document.getElementById('receipt')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  {file && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {file.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Additional details..."
                  rows={3}
                  {...register('remarks')}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || uploading}
              >
                {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? 'Uploading...' : 'Submit Request'}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
