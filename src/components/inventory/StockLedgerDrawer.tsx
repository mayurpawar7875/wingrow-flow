import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface StockLedgerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemName: string;
}

export function StockLedgerDrawer({ open, onOpenChange, itemId, itemName }: StockLedgerDrawerProps) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', itemId],
    queryFn: async () => {
      if (!itemId) return [];

      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, profiles:performed_by(name)')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!itemId && open,
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ISSUE':
        return 'bg-destructive/20 text-destructive';
      case 'RETURN':
        return 'bg-success/20 text-success';
      case 'ADJUSTMENT_CREATE':
        return 'bg-primary/20 text-primary';
      case 'ADJUSTMENT_EDIT':
        return 'bg-warning/20 text-warning';
      case 'ADJUSTMENT_ARCHIVE':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock Ledger - {itemName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">Loading movements...</div>
          ) : movements && movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Prev</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(movement.type)} variant="outline">
                        {movement.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {movement.quantity > 0 ? (
                          <ArrowUp className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={movement.quantity > 0 ? 'text-success' : 'text-destructive'}>
                          {Math.abs(movement.quantity)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{movement.prev_quantity ?? '-'}</TableCell>
                    <TableCell className="font-medium">{movement.new_quantity ?? '-'}</TableCell>
                    <TableCell>{movement.profiles?.name || 'System'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No movements found</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
