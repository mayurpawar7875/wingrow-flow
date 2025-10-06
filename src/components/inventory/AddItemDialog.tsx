import { useState } from 'react';
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

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddItemDialog({ open, onOpenChange, onSuccess }: AddItemDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      quantity: 0,
      pricePerItem: 0,
      unit: 'pcs',
      reorderLevel: 10,
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Insert the item
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .insert({
          name: values.name,
          sku: values.sku || null,
          quantity_on_hand: values.quantity,
          price_per_item: values.pricePerItem,
          unit: values.unit,
          reorder_level: values.reorderLevel || null,
          notes: values.notes || null,
          item_version: 0,
          is_archived: false,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Create initial stock movement
      if (values.quantity > 0) {
        const { error: movementError } = await supabase
          .from('inventory_transactions')
          .insert({
            item_id: item.id,
            type: 'ADJUSTMENT_CREATE' as any,
            quantity: values.quantity,
            prev_quantity: 0,
            new_quantity: values.quantity,
            reason: 'Initial stock',
            performed_by: user.id,
          } as any);

        if (movementError) throw movementError;
      }

      toast.success('Item added successfully');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast.error(error.message || 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
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
                    <FormLabel>Initial Quantity *</FormLabel>
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
                {isLoading ? 'Adding...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
