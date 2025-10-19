import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const inspectionSchema = z.object({
  item_id: z.string().min(1, 'Please select an item'),
  available_quantity: z.number().min(0, 'Quantity must be positive'),
  condition: z.enum(['New', 'Old']),
  notes: z.string().optional(),
  selfie: z.any().refine((file) => file?.length > 0, 'Selfie is required'),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

export function AssetsInspectionForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [todayInspection, setTodayInspection] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      condition: 'New',
    },
  });

  const itemId = watch('item_id');

  // Check if today is Wednesday
  const isWednesday = () => {
    const today = new Date();
    return today.getDay() === 3; // 0 = Sunday, 3 = Wednesday
  };

  // Fetch inventory items
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('name');

      if (!error && data) {
        setInventoryItems(data);
      }
    };

    fetchInventory();
  }, []);

  // Check if already submitted today
  useEffect(() => {
    const checkTodaySubmission = async () => {
      if (!user) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('asset_inspections')
        .select('*, inventory_items(name), profiles(name)')
        .eq('employee_id', user.id)
        .eq('inspection_date', today)
        .maybeSingle();

      if (!error && data) {
        setTodayInspection(data);
      }
    };

    checkTodaySubmission();
  }, [user]);

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to get your location. Please enable GPS.',
            variant: 'destructive',
          });
        }
      );
    }
  }, []);

  // Update selected item details
  useEffect(() => {
    if (itemId) {
      const item = inventoryItems.find((i) => i.id === itemId);
      setSelectedItem(item);
    }
  }, [itemId, inventoryItems]);

  const onSubmit = async (data: InspectionFormData) => {
    if (!location) {
      toast({
        title: 'Location Required',
        description: 'Please enable GPS to capture your location.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    const isLate = !isWednesday();

    setIsSubmitting(true);

    try {
      // Upload selfie
      const file = data.selfie[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection-selfies')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-selfies')
        .getPublicUrl(fileName);

      // Insert inspection record
      const { error: insertError } = await supabase
        .from('asset_inspections')
        .insert({
          employee_id: user.id,
          item_id: data.item_id,
          expected_quantity: selectedItem?.quantity_on_hand || 0,
          available_quantity: data.available_quantity,
          condition: data.condition,
          notes: data.notes || null,
          selfie_url: publicUrl,
          gps_latitude: location.latitude,
          gps_longitude: location.longitude,
          is_late: isLate,
          submission_date: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: isLate 
          ? 'Late inspection submitted. This will be marked as a late submission.'
          : 'Asset inspection submitted successfully.',
        variant: isLate ? 'default' : 'default',
      });

      queryClient.invalidateQueries({ queryKey: ['asset-inspections'] });
      
      // Refresh to show submitted status
      window.location.reload();
    } catch (error: any) {
      console.error('Error submitting inspection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit inspection',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const lateWarning = !isWednesday() && (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
      <p className="text-sm text-destructive font-medium">
        ⚠️ Late Submission Warning
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Asset inspection is mandatory every Wednesday. Submitting on any other day will be marked as <strong>Late Submission</strong> and may be subject to a fine.
      </p>
    </div>
  );

  if (todayInspection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Assets Inspection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-green-600 font-medium">✓ Inspection submitted for today</p>
              {todayInspection.is_late && (
                <Badge variant="destructive" className="text-xs">Late Submission</Badge>
              )}
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium">{todayInspection.inventory_items?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Qty:</span>
                <span>{todayInspection.expected_quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available Qty:</span>
                <span>{todayInspection.available_quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition:</span>
                <span>{todayInspection.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${
                  todayInspection.status === 'Approved' ? 'text-green-600' :
                  todayInspection.status === 'Rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {todayInspection.status}
                </span>
              </div>
              {todayInspection.fine_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fine Amount:</span>
                  <span className="font-medium text-destructive">₹{todayInspection.fine_amount}</span>
                </div>
              )}
              {todayInspection.late_remarks && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Admin Remarks:</span>
                  <p className="text-sm mt-1">{todayInspection.late_remarks}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Assets Inspection - {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lateWarning}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="item_id">Item Name *</Label>
            <Select
              value={watch('item_id')}
              onValueChange={(value) => setValue('item_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.item_id && (
              <p className="text-sm text-destructive mt-1">{errors.item_id.message}</p>
            )}
          </div>

          {selectedItem && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <span className="font-medium">Expected Quantity:</span> {selectedItem.quantity_on_hand} {selectedItem.unit}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="available_quantity">Available Quantity *</Label>
            <Input
              id="available_quantity"
              type="number"
              {...register('available_quantity', { valueAsNumber: true })}
              placeholder="Enter available quantity"
            />
            {errors.available_quantity && (
              <p className="text-sm text-destructive mt-1">{errors.available_quantity.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="condition">Condition *</Label>
            <Select
              value={watch('condition')}
              onValueChange={(value: 'New' | 'Old') => setValue('condition', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Old">Old</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="selfie">Upload Selfie *</Label>
            <Input
              id="selfie"
              type="file"
              accept="image/*"
              capture="user"
              {...register('selfie')}
            />
            {errors.selfie && (
              <p className="text-sm text-destructive mt-1">{errors.selfie.message as string}</p>
            )}
          </div>

          <div className="bg-muted p-3 rounded-md flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <p className="text-sm">
              {location
                ? `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : 'Getting location...'}
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting || !location} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
