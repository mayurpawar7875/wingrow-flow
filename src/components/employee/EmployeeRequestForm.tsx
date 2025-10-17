import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload } from 'lucide-react';

const itemRequestSchema = z.object({
  inventoryItemId: z.string().min(1, 'Please select an item'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  market_or_location: z.string().optional(),
  remarks: z.string().optional(),
});

const reimbursementSchema = z.object({
  category: z.enum(['Travel', 'Food', 'Stationery', 'Misc']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  market_or_location: z.string().optional(),
  remarks: z.string().optional(),
});

interface EmployeeRequestFormProps {
  onSuccess: () => void;
}

export function EmployeeRequestForm({ onSuccess }: EmployeeRequestFormProps) {
  const [requestType, setRequestType] = useState<'item' | 'reimbursement'>('item');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory-items-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const itemForm = useForm<z.infer<typeof itemRequestSchema>>({
    resolver: zodResolver(itemRequestSchema),
    defaultValues: {
      inventoryItemId: '',
      quantity: 1,
      market_or_location: '',
      remarks: '',
    },
  });

  const reimbursementForm = useForm<z.infer<typeof reimbursementSchema>>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: {
      category: 'Travel',
      amount: 0,
      market_or_location: '',
      remarks: '',
    },
  });

  // Handle inventory item selection
  useEffect(() => {
    const itemId = itemForm.watch('inventoryItemId');
    if (itemId) {
      const item = inventoryItems.find(i => i.id === itemId);
      setSelectedInventoryItem(item);
    } else {
      setSelectedInventoryItem(null);
    }
  }, [itemForm.watch('inventoryItemId'), inventoryItems]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const uploadFile = async (userId: string, bucket: string): Promise<string | null> => {
    if (!file) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

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

  const onItemSubmit = async (values: z.infer<typeof itemRequestSchema>) => {
    if (!selectedInventoryItem) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileUrl = await uploadFile(user.id, 'attachments');

      const { error } = await supabase.from('item_requests').insert([{
        user_id: user.id,
        title: selectedInventoryItem.name,
        category: (selectedInventoryItem.tags?.[0] || 'Misc') as 'Stationery' | 'Transport' | 'Packaging' | 'Misc',
        quantity: values.quantity,
        unit: selectedInventoryItem.unit,
        description: values.remarks || null,
        market_or_location: values.market_or_location || null,
        attachment_url: fileUrl,
        status: 'Submitted',
        priority: 'Medium',
      }]);

      if (error) throw error;

      toast.success('Request submitted successfully!');
      itemForm.reset();
      setFile(null);
      setSelectedInventoryItem(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    }
  };

  const onReimbursementSubmit = async (values: z.infer<typeof reimbursementSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!file) {
        toast.error('Receipt upload is required for reimbursements');
        return;
      }

      const fileUrl = await uploadFile(user.id, 'reimbursement-receipts');
      if (!fileUrl) return;

      const { error } = await supabase.from('reimbursements').insert([{
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        category: values.category,
        amount: values.amount,
        market_or_location: values.market_or_location || '',
        notes: values.remarks || null,
        bill_file_url: fileUrl,
        status: 'Submitted',
      }]);

      if (error) throw error;

      toast.success('Request submitted successfully!');
      reimbursementForm.reset();
      setFile(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    }
  };

  const isSubmitting = itemForm.formState.isSubmitting || reimbursementForm.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit New Request</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Request Type */}
          <div className="space-y-2">
            <Label>Request Type *</Label>
            <Select
              value={requestType}
              onValueChange={(value) => {
                setRequestType(value as 'item' | 'reimbursement');
                setFile(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item">Item Request</SelectItem>
                <SelectItem value="reimbursement">Reimbursement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === 'item' ? (
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
              {/* Item Name Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="item-name">Item Name *</Label>
                <Select
                  value={itemForm.watch('inventoryItemId')}
                  onValueChange={(value) => itemForm.setValue('inventoryItemId', value)}
                  disabled={loadingInventory}
                >
                  <SelectTrigger id="item-name">
                    <SelectValue placeholder={loadingInventory ? "Loading items..." : "Select an item"} />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {itemForm.formState.errors.inventoryItemId && (
                  <p className="text-sm text-destructive">{itemForm.formState.errors.inventoryItemId.message}</p>
                )}
              </div>

              {/* Show selected item details */}
              {selectedInventoryItem && (
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-sm"><span className="font-medium">Category:</span> {selectedInventoryItem.tags?.[0] || 'Misc'}</p>
                  <p className="text-sm"><span className="font-medium">Unit:</span> {selectedInventoryItem.unit}</p>
                  {selectedInventoryItem.description && (
                    <p className="text-sm text-muted-foreground">{selectedInventoryItem.description}</p>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="item-quantity">Quantity *</Label>
                <Input
                  id="item-quantity"
                  type="number"
                  {...itemForm.register('quantity', { valueAsNumber: true })}
                  placeholder="0"
                />
                {itemForm.formState.errors.quantity && (
                  <p className="text-sm text-destructive">{itemForm.formState.errors.quantity.message}</p>
                )}
              </div>

              {/* Market/Location */}
              <div className="space-y-2">
                <Label htmlFor="item-location">Market/Location</Label>
                <Input
                  id="item-location"
                  {...itemForm.register('market_or_location')}
                  placeholder="e.g., Mumbai Central"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="item-file">Upload Receipt (Optional)</Label>
                <Input
                  id="item-file"
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    {file.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, or PDF (max 5MB). Use camera for mobile.
                </p>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="item-remarks">Remarks (Optional)</Label>
                <Textarea
                  id="item-remarks"
                  {...itemForm.register('remarks')}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                size="lg"
                disabled={isSubmitting || uploading || !selectedInventoryItem}
              >
                {(isSubmitting || uploading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? 'Uploading...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={reimbursementForm.handleSubmit(onReimbursementSubmit)} className="space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="reimb-category">Category *</Label>
                <Select
                  value={reimbursementForm.watch('category')}
                  onValueChange={(value) => reimbursementForm.setValue('category', value as any)}
                >
                  <SelectTrigger id="reimb-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Stationery">Stationery</SelectItem>
                    <SelectItem value="Misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
                {reimbursementForm.formState.errors.category && (
                  <p className="text-sm text-destructive">{reimbursementForm.formState.errors.category.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="reimb-amount">Amount (₹) *</Label>
                <Input
                  id="reimb-amount"
                  type="number"
                  step="0.01"
                  {...reimbursementForm.register('amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {reimbursementForm.formState.errors.amount && (
                  <p className="text-sm text-destructive">{reimbursementForm.formState.errors.amount.message}</p>
                )}
              </div>

              {/* Market/Location */}
              <div className="space-y-2">
                <Label htmlFor="reimb-location">Market/Location</Label>
                <Input
                  id="reimb-location"
                  {...reimbursementForm.register('market_or_location')}
                  placeholder="e.g., Mumbai Central"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="reimb-file">Upload Receipt *</Label>
                <Input
                  id="reimb-file"
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    {file.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, or PDF (max 5MB). Use camera for mobile.
                </p>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="reimb-remarks">Remarks (Optional)</Label>
                <Textarea
                  id="reimb-remarks"
                  {...reimbursementForm.register('remarks')}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                size="lg"
                disabled={isSubmitting || uploading}
              >
                {(isSubmitting || uploading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? 'Uploading...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
