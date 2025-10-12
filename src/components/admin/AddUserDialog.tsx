import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9]+$/, 'Phone number must contain only digits'),
  designation: z.string().min(2, 'Designation must be at least 2 characters'),
  location: z.enum(['Pune', 'Mumbai']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
});

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    designation: '',
    location: 'Pune' as 'Pune' | 'Mumbai',
    password: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
  });
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Validate data
      userSchema.parse(data);

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Check if phone number already exists
      const { data: existingPhone } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('phone_number', data.phone_number)
        .maybeSingle();

      if (existingPhone) {
        throw new Error('Phone number already exists');
      }

      // Create employee via Edge Function (uses service role; does not switch session)
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-employee', {
        body: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone_number: data.phone_number,
          designation: data.designation,
          location: data.location,
          password: data.password,
          role: data.role,
        },
      });

      if (fnError) throw fnError;
      if (!fnData?.success) throw new Error(fnData?.message || 'Failed to create employee');

      return { id: fnData.userId } as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('✅ Employee added successfully. They can now log in with their email.');
      onOpenChange(false);
      setFormData({
        name: '',
        email: '',
        phone_number: '',
        designation: '',
        location: 'Pune',
        password: '',
        role: 'EMPLOYEE',
      });
    },
    onError: (error: any) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message?.includes('Email already exists')) {
        toast.error('This email is already registered');
      } else if (error.message?.includes('Phone number already exists')) {
        toast.error('This phone number is already registered');
      } else if (error.message?.includes('already registered')) {
        toast.error('This employee is already registered');
      } else {
        toast.error('Failed to add employee');
        console.error(error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new user account to access the inventory system
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Employee Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) =>
                  setFormData({ ...formData, designation: e.target.value })
                }
                placeholder="Sales Manager"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                placeholder="9876543210"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john.doe@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Employee will use this to log in
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value: 'Pune' | 'Mumbai') =>
                  setFormData({ ...formData, location: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'ADMIN' | 'MANAGER' | 'EMPLOYEE') =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Saving...' : 'Save Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
