import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InventoryItem } from './InventoryTable';

const formSchema = z.object({
  name: z.string()
    .min(2, 'Asset name must be at least 2 characters')
    .max(80, 'Asset name must not exceed 80 characters'),
  quantity_on_hand: z.coerce
    .number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative'),
  price_per_item: z.coerce
    .number()
    .min(0, 'Unit price cannot be negative')
    .refine((val) => {
      // Check for max 2 decimal places
      const decimalPart = val.toString().split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    }, 'Unit price can have at most 2 decimal places'),
});

type FormData = z.infer<typeof formSchema>;

interface InventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => Promise<void>;
  item?: InventoryItem | null;
  loading?: boolean;
}

export function InventoryDialog({
  open,
  onOpenChange,
  onSubmit,
  item,
  loading = false,
}: InventoryDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      quantity_on_hand: 0,
      price_per_item: 0,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        quantity_on_hand: item.quantity_on_hand,
        price_per_item: item.price_per_item,
      });
    } else {
      form.reset({
        name: '',
        quantity_on_hand: 0,
        price_per_item: 0,
      });
    }
  }, [item, form]);

  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
    form.reset();
  };

  const quantity = form.watch('quantity_on_hand') || 0;
  const unitPrice = form.watch('price_per_item') || 0;
  const totalValue = quantity * unitPrice;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update inventory item details.' : 'Add a new item to the inventory.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter asset name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity_on_hand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_per_item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price (₹) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Value:</span>
                <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.formState.isValid}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
