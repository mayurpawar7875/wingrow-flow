import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Download, MapPin, Image, CheckCircle, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AssetsInspectionReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lateFilter, setLateFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [fineDialog, setFineDialog] = useState<{ open: boolean; inspection: any }>({
    open: false,
    inspection: null,
  });
  const [fineAmount, setFineAmount] = useState('');
  const [lateRemarks, setLateRemarks] = useState('');

  const { data: inspections = [], refetch } = useQuery({
    queryKey: ['asset-inspections-admin'],
    queryFn: async () => {
      const { data: inspectionsData, error } = await supabase
        .from('asset_inspections')
        .select('*, inventory_items(name, unit)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name');

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return inspectionsData?.map(inspection => ({
        ...inspection,
        employee_profile: profilesMap.get(inspection.employee_id)
      })) || [];
    },
  });

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.employee_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inventory_items?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    
    const matchesLate = 
      lateFilter === 'all' || 
      (lateFilter === 'late' && inspection.is_late) ||
      (lateFilter === 'ontime' && !inspection.is_late);

    const matchesDate = !dateFilter || inspection.inspection_date === dateFilter;

    return matchesSearch && matchesStatus && matchesLate && matchesDate;
  });

  const handleStatusUpdate = async (inspectionId: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('asset_inspections')
        .update({ status: newStatus })
        .eq('id', inspectionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Inspection ${newStatus.toLowerCase()} successfully.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update inspection',
        variant: 'destructive',
      });
    }
  };

  const handleFineUpdate = async () => {
    if (!fineDialog.inspection) return;

    try {
      const { error } = await supabase
        .from('asset_inspections')
        .update({
          fine_amount: fineAmount ? parseFloat(fineAmount) : 0,
          late_remarks: lateRemarks || null,
        })
        .eq('id', fineDialog.inspection.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Fine and remarks updated successfully.',
      });

      setFineDialog({ open: false, inspection: null });
      setFineAmount('');
      setLateRemarks('');
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update fine',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Submission Date',
      'Inspection Date',
      'Employee Name',
      'Item Name',
      'Expected Quantity',
      'Available Quantity',
      'Condition',
      'Notes',
      'GPS Latitude',
      'GPS Longitude',
      'Status',
      'Is Late',
      'Fine Amount',
      'Late Remarks',
    ];

    const rows = filteredInspections.map((inspection) => [
      format(new Date(inspection.submission_date), 'yyyy-MM-dd HH:mm'),
      format(new Date(inspection.inspection_date), 'yyyy-MM-dd'),
      inspection.employee_profile?.name || 'N/A',
      inspection.inventory_items?.name || 'N/A',
      inspection.expected_quantity,
      inspection.available_quantity,
      inspection.condition,
      inspection.notes || '',
      inspection.gps_latitude,
      inspection.gps_longitude,
      inspection.status,
      inspection.is_late ? 'Yes' : 'No',
      inspection.fine_amount || 0,
      inspection.late_remarks || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-inspections-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Pending: 'secondary',
      Approved: 'default',
      Rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Assets Inspection Reports</h1>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Search by employee or item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={lateFilter} onValueChange={setLateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by submission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Submissions</SelectItem>
                    <SelectItem value="ontime">On-Time</SelectItem>
                    <SelectItem value="late">Late Submissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Expected Qty</TableHead>
                    <TableHead>Available Qty</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No inspections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInspections.map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell>
                          <div>
                            <div>{format(new Date(inspection.submission_date), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(inspection.submission_date), 'HH:mm')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                            {inspection.is_late && (
                              <Badge variant="destructive" className="text-xs">Late</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{inspection.employee_profile?.name || 'N/A'}</TableCell>
                        <TableCell>{inspection.inventory_items?.name || 'N/A'}</TableCell>
                        <TableCell>{inspection.expected_quantity}</TableCell>
                        <TableCell>{inspection.available_quantity}</TableCell>
                        <TableCell>{inspection.condition}</TableCell>
                        <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Inspection Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Employee</p>
                                      <p className="font-medium">{inspection.employee_profile?.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Submission Date</p>
                                      <div className="font-medium">
                                        {format(new Date(inspection.submission_date), 'MMM d, yyyy HH:mm')}
                                        {inspection.is_late && (
                                          <Badge variant="destructive" className="ml-2 text-xs">Late</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Inspection Date</p>
                                      <p className="font-medium">
                                        {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Item</p>
                                      <p className="font-medium">{inspection.inventory_items?.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Status</p>
                                      {getStatusBadge(inspection.status)}
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Expected Qty</p>
                                      <p className="font-medium">{inspection.expected_quantity}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Available Qty</p>
                                      <p className="font-medium">{inspection.available_quantity}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Condition</p>
                                      <p className="font-medium">{inspection.condition}</p>
                                    </div>
                                    {inspection.fine_amount > 0 && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">Fine Amount</p>
                                        <p className="font-medium text-destructive">₹{inspection.fine_amount}</p>
                                      </div>
                                    )}
                                  </div>

                                  {inspection.notes && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">Notes</p>
                                      <p className="mt-1">{inspection.notes}</p>
                                    </div>
                                  )}

                                  {inspection.late_remarks && (
                                    <div className="border-t pt-4">
                                      <p className="text-sm text-muted-foreground">Late Submission Remarks</p>
                                      <p className="mt-1">{inspection.late_remarks}</p>
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">GPS Location</p>
                                    <a
                                      href={`https://www.google.com/maps?q=${inspection.gps_latitude},${inspection.gps_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                      <MapPin className="h-4 w-4" />
                                      {inspection.gps_latitude}, {inspection.gps_longitude}
                                    </a>
                                  </div>

                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Selfie</p>
                                    <img
                                      src={inspection.selfie_url}
                                      alt="Inspection selfie"
                                      className="w-full max-w-md rounded-md"
                                    />
                                  </div>

                                  {inspection.status === 'Pending' && (
                                    <div className="flex gap-2 pt-4">
                                      <Button
                                        onClick={() => handleStatusUpdate(inspection.id, 'Approved')}
                                        className="flex-1"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => handleStatusUpdate(inspection.id, 'Rejected')}
                                        variant="destructive"
                                        className="flex-1"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            {inspection.is_late && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFineDialog({ open: true, inspection });
                                  setFineAmount(inspection.fine_amount?.toString() || '');
                                  setLateRemarks(inspection.late_remarks || '');
                                }}
                              >
                                Fine
                              </Button>
                            )}

                            {inspection.status === 'Pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(inspection.id, 'Approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(inspection.id, 'Rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={fineDialog.open} onOpenChange={(open) => {
          if (!open) {
            setFineDialog({ open: false, inspection: null });
            setFineAmount('');
            setLateRemarks('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Late Submission Fine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee</p>
                <p className="font-medium">{fineDialog.inspection?.employee_profile?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submission Date</p>
                <p className="font-medium">
                  {fineDialog.inspection && format(new Date(fineDialog.inspection.submission_date), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <Label htmlFor="fineAmount">Fine Amount (₹)</Label>
                <Input
                  id="fineAmount"
                  type="number"
                  step="0.01"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="lateRemarks">Remarks</Label>
                <Textarea
                  id="lateRemarks"
                  value={lateRemarks}
                  onChange={(e) => setLateRemarks(e.target.value)}
                  placeholder="Add remarks about the late submission..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFineDialog({ open: false, inspection: null });
                  setFineAmount('');
                  setLateRemarks('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleFineUpdate}>
                Save Fine
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
