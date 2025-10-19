import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, MapPin, Calendar, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const assetItemSchema = z.object({
  item_id: z.string().min(1, 'Please select an item'),
  available_quantity: z.number().min(0, 'Quantity must be positive'),
  condition: z.enum(['New', 'Old']),
  notes: z.string().optional(),
});

const inspectionSchema = z.object({
  assets: z.array(assetItemSchema).min(1, 'At least one asset must be inspected'),
  selfie: z.any().refine((file) => file?.length > 0, 'Selfie is required'),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

export function AssetsInspectionForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [todayInspections, setTodayInspections] = useState<any[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      assets: [{ item_id: '', available_quantity: 0, condition: 'New', notes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assets',
  });

  // Check if today is Wednesday
  const isWednesday = () => {
    const today = new Date();
    return today.getDay() === 3;
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
        .eq('inspection_date', today);

      if (!error && data && data.length > 0) {
        setTodayInspections(data);
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

  const getItemDetails = (itemId: string) => {
    return inventoryItems.find((i) => i.id === itemId);
  };

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

      // Insert all inspection records with the same selfie and GPS
      const inspectionRecords = data.assets.map((asset) => {
        const item = getItemDetails(asset.item_id);
        return {
          employee_id: user.id,
          item_id: asset.item_id,
          expected_quantity: item?.quantity_on_hand || 0,
          available_quantity: asset.available_quantity,
          condition: asset.condition,
          notes: asset.notes || null,
          selfie_url: publicUrl,
          gps_latitude: location.latitude,
          gps_longitude: location.longitude,
          is_late: isLate,
          submission_date: new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabase
        .from('asset_inspections')
        .insert(inspectionRecords);

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: isLate 
          ? `Late inspection submitted for ${data.assets.length} asset(s). This will be marked as a late submission.`
          : `Asset inspection submitted successfully for ${data.assets.length} asset(s).`,
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
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium">⚠️ Late Submission Warning</p>
        <p className="text-sm mt-1">
          Asset inspection is mandatory every Wednesday. Submitting on any other day will be marked as <strong>Late Submission</strong> and may be subject to a fine.
        </p>
      </AlertDescription>
    </Alert>
  );

  if (todayInspections.length > 0) {
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
              <p className="text-green-600 font-medium">✓ Inspection(s) submitted for today ({todayInspections.length} asset{todayInspections.length > 1 ? 's' : ''})</p>
              {todayInspections[0]?.is_late && (
                <Badge variant="destructive" className="text-xs">Late Submission</Badge>
              )}
            </div>
            <div className="space-y-3">
              {todayInspections.map((inspection, idx) => (
                <div key={inspection.id} className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">Asset #{idx + 1}: {inspection.inventory_items?.name}</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Qty:</span>
                      <span>{inspection.expected_quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Qty:</span>
                      <span>{inspection.available_quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition:</span>
                      <span>{inspection.condition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`font-medium ${
                        inspection.status === 'Approved' ? 'text-green-600' :
                        inspection.status === 'Rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {inspection.status}
                      </span>
                    </div>
                    {inspection.fine_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fine Amount:</span>
                        <span className="font-medium text-destructive">₹{inspection.fine_amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Assets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Assets to Inspect</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ item_id: '', available_quantity: 0, condition: 'New', notes: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </div>

            {fields.map((field, index) => {
              const selectedItem = getItemDetails(watch(`assets.${index}.item_id`));
              
              return (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Asset #{index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label>Item Name *</Label>
                    <Select
                      value={watch(`assets.${index}.item_id`)}
                      onValueChange={(value) => setValue(`assets.${index}.item_id`, value)}
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
                    {errors.assets?.[index]?.item_id && (
                      <p className="text-sm text-destructive mt-1">{errors.assets[index]?.item_id?.message}</p>
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
                    <Label>Available Quantity *</Label>
                    <Input
                      type="number"
                      {...register(`assets.${index}.available_quantity`, { valueAsNumber: true })}
                      placeholder="Enter available quantity"
                    />
                    {errors.assets?.[index]?.available_quantity && (
                      <p className="text-sm text-destructive mt-1">{errors.assets[index]?.available_quantity?.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Condition *</Label>
                    <Select
                      value={watch(`assets.${index}.condition`)}
                      onValueChange={(value: 'New' | 'Old') => setValue(`assets.${index}.condition`, value)}
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
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      {...register(`assets.${index}.notes`)}
                      placeholder="Any additional notes..."
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Final Section: Selfie & GPS */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Final Verification</h3>
            
            <div>
              <Label htmlFor="selfie">Upload Selfie *</Label>
              <Input
                id="selfie"
                type="file"
                accept="image/*"
                capture="user"
                {...register('selfie')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This selfie will be used for all assets inspected above
              </p>
              {errors.selfie && (
                <p className="text-sm text-destructive mt-1">{errors.selfie.message as string}</p>
              )}
            </div>

            <div className="bg-muted p-3 rounded-md flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-sm font-medium">GPS Location</p>
                <p className="text-xs text-muted-foreground">
                  {location
                    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                    : 'Getting location...'}
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !location} className="w-full">
            {isSubmitting ? 'Submitting...' : `Submit Inspection (${fields.length} asset${fields.length > 1 ? 's' : ''})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
