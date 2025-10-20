import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, UserX, UserCheck } from 'lucide-react';
import { AddUserDialog } from './AddUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { toast } from 'sonner';
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  is_active: boolean;
  created_at: string;
}
export function UserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const {
    data: users,
    isLoading
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const {
        data: profiles,
        error
      } = await supabase.from('profiles').select('id, name, email, role, is_active, created_at').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return profiles as User[];
    }
  });
  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const {
        error
      } = await supabase.from('profiles').update({
        is_active: isActive
      }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-users']
      });
      toast.success('User status updated successfully');
    },
    onError: error => {
      toast.error('Failed to update user status');
      console.error(error);
    }
  });
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'MANAGER':
        return 'default';
      default:
        return 'secondary';
    }
  };
  return (
    <>
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl font-semibold">User Management</CardTitle>
              <CardDescription className="text-sm md:text-base">Add and manage employees</CardDescription>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="h-10 md:h-11 px-4 md:px-5 rounded-lg shadow-sm w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm md:text-base">Loading users...</p>
            </div>
          ) : users && users.length > 0 ? (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden sm:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs md:text-sm uppercase tracking-wide font-semibold">Name</TableHead>
                      <TableHead className="text-xs md:text-sm uppercase tracking-wide font-semibold">Email</TableHead>
                      <TableHead className="text-xs md:text-sm uppercase tracking-wide font-semibold">Role</TableHead>
                      <TableHead className="text-xs md:text-sm uppercase tracking-wide font-semibold">Status</TableHead>
                      <TableHead className="text-xs md:text-sm uppercase tracking-wide font-semibold">Created</TableHead>
                      <TableHead className="text-xs md:text-sm uppercase tracking-wide font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow 
                        key={user.id}
                        className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/30 transition-colors`}
                      >
                        <TableCell className="font-medium text-sm md:text-base py-3 md:py-4">{user.name}</TableCell>
                        <TableCell className="text-sm md:text-base py-3 md:py-4">{user.email}</TableCell>
                        <TableCell className="py-3 md:py-4">
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 md:py-4">
                          <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-xs">
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm md:text-base py-3 md:py-4">
                          {new Date(user.created_at).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right py-3 md:py-4">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingUser(user)}
                              className="h-9 w-9 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => toggleActiveMutation.mutate({
                                userId: user.id,
                                isActive: !user.is_active
                              })}
                              className="h-9 w-9 p-0"
                            >
                              {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View - Visible only on mobile */}
              <div className="sm:hidden space-y-4">
                {users.map((user) => (
                  <Card key={user.id} className="rounded-lg shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditingUser(user)}
                            className="h-9 w-9 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => toggleActiveMutation.mutate({
                              userId: user.id,
                              isActive: !user.is_active
                            })}
                            className="h-9 w-9 p-0"
                          >
                            {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                          <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-xs">
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created</p>
                          <p className="text-sm">{new Date(user.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm md:text-base">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {editingUser && (
        <EditUserDialog 
          user={editingUser} 
          open={!!editingUser} 
          onOpenChange={(open) => !open && setEditingUser(null)} 
        />
      )}
    </>
  );
}