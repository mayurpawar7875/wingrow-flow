import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(0, 'Quantity must be 0 or greater'),
  pricePerItem: z.coerce.number().min(0, 'Price must be 0 or greater'),
  unit: z.string().min(1, 'Unit is required'),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item: any;
}

export function EditItemDialog({ open, onOpenChange, onSuccess, item }: EditItemDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (item && open) {
      form.reset({
        name: item.name || '',
        sku: item.sku || '',
        quantity: item.quantity_on_hand || 0,
        pricePerItem: Number(item.price_per_item) || 0,
        unit: item.unit || 'pcs',
        reorderLevel: item.reorder_level || 10,
        notes: item.notes || '',
      });
    }
  }, [item, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !item) return;
    setIsLoading(true);

    try {
      const quantityDelta = values.quantity - item.quantity_on_hand;

      // Use the version-checking function for atomic update
      const { data, error } = await supabase.rpc('update_stock_with_version', {
        _item_id: item.id,
        _current_version: item.item_version,
        _quantity_delta: quantityDelta,
        _movement_type: 'ADJUSTMENT_EDIT',
        _reason: 'Manual adjustment via edit',
        _performed_by: user.id,
      });

      if (error) {
        if (error.code === 'P0001') {
          toast.error('Item was updated by another user. Please refresh and try again.');
          onSuccess();
          return;
        }
        throw error;
      }

      // Update other fields (non-quantity)
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          name: values.name,
          sku: values.sku || null,
          price_per_item: values.pricePerItem,
          unit: values.unit,
          reorder_level: values.reorderLevel || null,
          notes: values.notes || null,
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      const result = data as any;
      if (result?.lowStock) {
        toast.warning('Item is now below reorder level!');
      } else {
        toast.success('Item updated successfully');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error(error.message || 'Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter item name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter SKU" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="0" step="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., pcs, kg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="0" step="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pricePerItem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Item *</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} min="0" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
