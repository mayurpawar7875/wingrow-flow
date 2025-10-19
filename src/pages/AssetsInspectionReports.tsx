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
    queryKey: ['inspection-sessions-admin'],
    queryFn: async () => {
      const { data: sessionsData, error } = await supabase
        .from('inspection_sessions')
        .select(`
          *,
          inspection_assets(
            *,
            inventory_items(name, unit)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name');

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return sessionsData?.map(session => ({
        ...session,
        employee_profile: profilesMap.get(session.employee_id)
      })) || [];
    },
  });

  const filteredInspections = inspections.filter((session) => {
    const matchesSearch =
      session.employee_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.inspection_assets?.some((asset: any) =>
        asset.inventory_items?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    const matchesLate = 
      lateFilter === 'all' || 
      (lateFilter === 'late' && session.is_late) ||
      (lateFilter === 'ontime' && !session.is_late);

    const matchesDate = !dateFilter || session.inspection_date === dateFilter;

    return matchesSearch && matchesStatus && matchesLate && matchesDate;
  });

  const handleStatusUpdate = async (sessionId: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('inspection_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Inspection session ${newStatus.toLowerCase()} successfully.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update inspection session',
        variant: 'destructive',
      });
    }
  };

  const handleFineUpdate = async () => {
    if (!fineDialog.inspection) return;

    try {
      const { error } = await supabase
        .from('inspection_sessions')
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

    const rows = filteredInspections.flatMap((session) =>
      session.inspection_assets?.map((asset: any) => [
        format(new Date(session.submission_date), 'yyyy-MM-dd HH:mm'),
        format(new Date(session.inspection_date), 'yyyy-MM-dd'),
        session.employee_profile?.name || 'N/A',
        asset.inventory_items?.name || 'N/A',
        asset.expected_quantity,
        asset.available_quantity,
        asset.condition,
        asset.notes || '',
        session.gps_latitude,
        session.gps_longitude,
        session.status,
        session.is_late ? 'Yes' : 'No',
        session.fine_amount || 0,
        session.late_remarks || '',
      ]) || []
    );

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
                    <TableHead>Assets Inspected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No inspections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInspections.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <div>{format(new Date(session.submission_date), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(session.submission_date), 'HH:mm')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(session.inspection_date), 'MMM d, yyyy')}
                            {session.is_late && (
                              <Badge variant="destructive" className="text-xs">Late</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{session.employee_profile?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {session.inspection_assets?.map((asset: any, idx: number) => (
                              <div key={asset.id} className="text-sm">
                                {idx + 1}. {asset.inventory_items?.name}
                              </div>
                            )) || 'No assets'}
                            <div className="text-xs text-muted-foreground">
                              {session.inspection_assets?.length || 0} asset(s)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Inspection Session Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Employee</p>
                                      <p className="font-medium">{session.employee_profile?.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Submission Date</p>
                                      <div className="font-medium">
                                        {format(new Date(session.submission_date), 'MMM d, yyyy HH:mm')}
                                        {session.is_late && (
                                          <Badge variant="destructive" className="ml-2 text-xs">Late</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Inspection Date</p>
                                      <p className="font-medium">
                                        {format(new Date(session.inspection_date), 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Status</p>
                                      {getStatusBadge(session.status)}
                                    </div>
                                    {session.fine_amount > 0 && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">Fine Amount</p>
                                        <p className="font-medium text-destructive">₹{session.fine_amount}</p>
                                      </div>
                                    )}
                                  </div>

                                  {session.late_remarks && (
                                    <div className="border-t pt-4">
                                      <p className="text-sm text-muted-foreground">Late Submission Remarks</p>
                                      <p className="mt-1">{session.late_remarks}</p>
                                    </div>
                                  )}

                                  <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Inspected Assets ({session.inspection_assets?.length || 0})</h3>
                                    <div className="space-y-3">
                                      {session.inspection_assets?.map((asset: any, idx: number) => (
                                        <div key={asset.id} className="border rounded-lg p-3">
                                          <h4 className="font-medium mb-2">
                                            {idx + 1}. {asset.inventory_items?.name}
                                          </h4>
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                              <span className="text-muted-foreground">Expected Qty:</span>
                                              <span className="ml-2 font-medium">{asset.expected_quantity}</span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Available Qty:</span>
                                              <span className="ml-2 font-medium">{asset.available_quantity}</span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Condition:</span>
                                              <span className="ml-2 font-medium">{asset.condition}</span>
                                            </div>
                                            {asset.notes && (
                                              <div className="col-span-2">
                                                <span className="text-muted-foreground">Notes:</span>
                                                <p className="mt-1 text-sm">{asset.notes}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground mb-2">GPS Location</p>
                                    <a
                                      href={`https://www.google.com/maps?q=${session.gps_latitude},${session.gps_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                      <MapPin className="h-4 w-4" />
                                      {session.gps_latitude}, {session.gps_longitude}
                                    </a>
                                  </div>

                                  <div className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground mb-2">Selfie</p>
                                    <img
                                      src={session.selfie_url}
                                      alt="Inspection selfie"
                                      className="w-full max-w-md rounded-md"
                                    />
                                  </div>

                                  {session.status === 'Pending' && (
                                    <div className="flex gap-2 pt-4 border-t">
                                      <Button
                                        onClick={() => handleStatusUpdate(session.id, 'Approved')}
                                        className="flex-1"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve Session
                                      </Button>
                                      <Button
                                        onClick={() => handleStatusUpdate(session.id, 'Rejected')}
                                        variant="destructive"
                                        className="flex-1"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject Session
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            {session.is_late && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFineDialog({ open: true, inspection: session });
                                  setFineAmount(session.fine_amount?.toString() || '');
                                  setLateRemarks(session.late_remarks || '');
                                }}
                              >
                                Fine
                              </Button>
                            )}

                            {session.status === 'Pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(session.id, 'Approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(session.id, 'Rejected')}
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
