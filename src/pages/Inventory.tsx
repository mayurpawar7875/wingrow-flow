import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Archive, ArchiveRestore, Edit, History, Download } from 'lucide-react';
import { AddItemDialog } from '@/components/inventory/AddItemDialog';
import { EditItemDialog } from '@/components/inventory/EditItemDialog';
import { StockLedgerDrawer } from '@/components/inventory/StockLedgerDrawer';
import { toast } from 'sonner';

export default function Inventory() {
  const { userRole, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ledgerDrawerOpen, setLedgerDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ['inventory-items', showArchived, searchTerm, showLowStock],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (!showArchived) {
        query = query.eq('is_archived', false);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];
      if (showLowStock) {
        filteredData = filteredData.filter(
          (item) => item.quantity_on_hand <= (item.reorder_level || 0)
        );
      }

      return filteredData;
    },
  });

  const handleArchive = async (item: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_archived: !item.is_archived })
        .eq('id', item.id);

      if (error) throw error;

      // Log the archive action
      await supabase.from('inventory_transactions').insert({
        item_id: item.id,
        type: 'ADJUSTMENT_ARCHIVE' as any,
        quantity: 0,
        prev_quantity: item.quantity_on_hand,
        new_quantity: item.quantity_on_hand,
        reason: item.is_archived ? 'Unarchived' : 'Archived',
        performed_by: user.id,
      } as any);

      toast.success(item.is_archived ? 'Item restored' : 'Item archived');
      refetch();
    } catch (error: any) {
      console.error('Error archiving item:', error);
      toast.error(error.message || 'Failed to archive item');
    }
  };

  const exportToCSV = () => {
    if (!items || items.length === 0) {
      toast.error('No items to export');
      return;
    }

    const headers = ['Item Name', 'SKU', 'Quantity', 'Unit', 'Price/Item', 'Reorder Level', 'Status'];
    const rows = items.map((item) => [
      item.name,
      item.sku || '',
      item.quantity_on_hand,
      item.unit,
      Number(item.price_per_item).toFixed(2),
      item.reorder_level || '',
      item.is_archived ? 'Archived' : 'Active',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage stock items and track movements</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showLowStock ? 'default' : 'outline'}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              Low Stock
            </Button>
            <Button
              variant={showArchived ? 'default' : 'outline'}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">Loading...</div>
          ) : items && items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Price/Item</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const isLowStock = item.quantity_on_hand <= (item.reorder_level || 0);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {isLowStock && !item.is_archived && (
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          )}
                          {item.is_archived && (
                            <Badge variant="secondary" className="text-xs">
                              Archived
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.sku || '-'}</TableCell>
                      <TableCell className="font-medium">{item.quantity_on_hand}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>₹{Number(item.price_per_item).toFixed(2)}</TableCell>
                      <TableCell>{item.reorder_level || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setLedgerDrawerOpen(true);
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              {!item.is_archived && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(item)}
                              >
                                {item.is_archived ? (
                                  <ArchiveRestore className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No items found</div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <AddItemDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={refetch}
          />
          <EditItemDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={refetch}
            item={selectedItem}
          />
        </>
      )}

      <StockLedgerDrawer
        open={ledgerDrawerOpen}
        onOpenChange={setLedgerDrawerOpen}
        itemId={selectedItem?.id}
        itemName={selectedItem?.name || ''}
      />
    </div>
  );
}
