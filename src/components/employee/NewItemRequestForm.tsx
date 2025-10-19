import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackagePlus, Upload } from 'lucide-react';
import { format } from 'date-fns';

const newItemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  category: z.enum(['Packaging', 'Stationery', 'Equipment', 'Other']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required'),
  estimated_price_per_unit: z.number().min(0, 'Price must be positive').optional(),
  needed_by: z.string().min(1, 'Needed by date is required'),
  market_or_location: z.string().min(1, 'Market name is required'),
  reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
  vendor_suggestion: z.string().optional(),
  attachment: z.any().optional(),
});

type NewItemFormData = z.infer<typeof newItemSchema>;

interface NewItemRequestFormProps {
  onSuccess?: () => void;
}

export function NewItemRequestForm({ onSuccess }: NewItemRequestFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NewItemFormData>({
    resolver: zodResolver(newItemSchema),
    defaultValues: {
      category: 'Other',
      quantity: 1,
      estimated_price_per_unit: 0,
    },
  });

  const onSubmit = async (data: NewItemFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      let attachmentUrl = null;

      // Upload attachment if provided
      if (data.attachment?.[0]) {
        const file = data.attachment[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('new-item-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('new-item-attachments')
          .getPublicUrl(fileName);

        attachmentUrl = publicUrl;
      }

      // Insert new item request
      const { error: insertError } = await supabase
        .from('new_item_requests')
        .insert({
          employee_id: user.id,
          item_name: data.item_name,
          category: data.category,
          quantity: data.quantity,
          unit: data.unit,
          estimated_price_per_unit: data.estimated_price_per_unit || 0,
          needed_by: data.needed_by,
          market_or_location: data.market_or_location,
          reason: data.reason,
          vendor_suggestion: data.vendor_suggestion || null,
          attachment_url: attachmentUrl,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'New item request submitted successfully.',
      });

      reset();
      queryClient.invalidateQueries({ queryKey: ['new-item-requests'] });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5" />
          Request New Inventory Item
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="item_name">Item Name *</Label>
            <Input
              id="item_name"
              {...register('item_name')}
              placeholder="Enter item name"
            />
            {errors.item_name && (
              <p className="text-sm text-destructive mt-1">{errors.item_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={watch('category')}
              onValueChange={(value: any) => setValue('category', value)}
            >
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
            {errors.category && (
              <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="Enter quantity"
              />
              {errors.quantity && (
                <p className="text-sm text-destructive mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                {...register('unit')}
                placeholder="pcs, kg, liters"
              />
              {errors.unit && (
                <p className="text-sm text-destructive mt-1">{errors.unit.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="estimated_price_per_unit">Estimated Price per Unit (Optional)</Label>
            <Input
              id="estimated_price_per_unit"
              type="number"
              step="0.01"
              {...register('estimated_price_per_unit', { valueAsNumber: true })}
              placeholder="Enter estimated price"
            />
            {errors.estimated_price_per_unit && (
              <p className="text-sm text-destructive mt-1">{errors.estimated_price_per_unit.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="needed_by">Needed By *</Label>
            <Input
              id="needed_by"
              type="date"
              {...register('needed_by')}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.needed_by && (
              <p className="text-sm text-destructive mt-1">{errors.needed_by.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="market_or_location">Market Name / Location *</Label>
            <Input
              id="market_or_location"
              {...register('market_or_location')}
              placeholder="Enter market or location"
            />
            {errors.market_or_location && (
              <p className="text-sm text-destructive mt-1">{errors.market_or_location.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reason">Reason / Justification *</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              placeholder="Explain why this item is needed..."
              rows={4}
            />
            {errors.reason && (
              <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vendor_suggestion">Vendor Suggestion (Optional)</Label>
            <Input
              id="vendor_suggestion"
              {...register('vendor_suggestion')}
              placeholder="Suggest a vendor if you have one"
            />
          </div>

          <div>
            <Label htmlFor="attachment">Attachment (Optional)</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              {...register('attachment')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload quote, sample image, or related document
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
