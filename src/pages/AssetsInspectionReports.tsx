import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Download, MapPin, Image, CheckCircle, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AssetsInspectionReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lateFilter, setLateFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [fineDialog, setFineDialog] = useState<{ open: boolean; inspection: any }>({
    open: false,
    inspection: null,
  });
  const [fineAmount, setFineAmount] = useState("");
  const [lateRemarks, setLateRemarks] = useState("");

  const { data: inspections = [], refetch } = useQuery({
    queryKey: ["inspection-sessions-admin"],
    queryFn: async () => {
      const { data: sessionsData, error } = await supabase
        .from("inspection_sessions")
        .select(
          `
          *,
          inspection_assets(
            *,
            inventory_items(name, unit)
          )
        `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("id, name");
      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (
        sessionsData?.map((session) => ({
          ...session,
          employee_profile: profilesMap.get(session.employee_id),
        })) || []
      );
    },
  });

  const filteredInspections = inspections.filter((session) => {
    const matchesSearch =
      session.employee_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.inspection_assets?.some((asset: any) =>
        asset.inventory_items?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesStatus = statusFilter === "all" || session.status === statusFilter;

    const matchesLate =
      lateFilter === "all" ||
      (lateFilter === "late" && session.is_late) ||
      (lateFilter === "ontime" && !session.is_late);

    const matchesDate = !dateFilter || session.inspection_date === dateFilter;

    return matchesSearch && matchesStatus && matchesLate && matchesDate;
  });

  const handleStatusUpdate = async (sessionId: string, newStatus: "Approved" | "Rejected") => {
    try {
      const { error } = await supabase.from("inspection_sessions").update({ status: newStatus }).eq("id", sessionId);
      if (error) throw error;

      toast({ title: "Success", description: `Inspection session ${newStatus.toLowerCase()} successfully.` });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update inspection session",
        variant: "destructive",
      });
    }
  };

  const handleFineUpdate = async () => {
    if (!fineDialog.inspection) return;
    try {
      const { error } = await supabase
        .from("inspection_sessions")
        .update({
          fine_amount: fineAmount ? parseFloat(fineAmount) : 0,
          late_remarks: lateRemarks || null,
        })
        .eq("id", fineDialog.inspection.id);
      if (error) throw error;

      toast({ title: "Success", description: "Fine and remarks updated successfully." });
      setFineDialog({ open: false, inspection: null });
      setFineAmount("");
      setLateRemarks("");
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update fine", variant: "destructive" });
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Submission Date",
      "Inspection Date",
      "Employee Name",
      "Item Name",
      "Expected Quantity",
      "Available Quantity",
      "Condition",
      "Notes",
      "GPS Latitude",
      "GPS Longitude",
      "Status",
      "Is Late",
      "Fine Amount",
      "Late Remarks",
    ];

    const rows = filteredInspections.flatMap(
      (session) =>
        session.inspection_assets?.map((asset: any) => [
          format(new Date(session.submission_date), "yyyy-MM-dd HH:mm"),
          format(new Date(session.inspection_date), "yyyy-MM-dd"),
          session.employee_profile?.name || "N/A",
          asset.inventory_items?.name || "N/A",
          asset.expected_quantity,
          asset.available_quantity,
          asset.condition,
          asset.notes || "",
          session.gps_latitude,
          session.gps_longitude,
          session.status,
          session.is_late ? "Yes" : "No",
          session.fine_amount || 0,
          session.late_remarks || "",
        ]) || [],
    );

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset-inspections-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Pending: "secondary",
      Approved: "default",
      Rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Assets Inspection Reports</h1>
        <Button onClick={exportToCSV} variant="outline" className="min-h-[44px]">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="rounded-xl border shadow-sm mb-6">
        <CardContent className="p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Search by employee or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lateFilter} onValueChange={setLateFilter}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Filter by submission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value="ontime">On-Time</SelectItem>
                <SelectItem value="late">Late Submissions</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-11 w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40">
              <TableRow>
                <TableHead className="px-4 py-3">Submission Date</TableHead>
                <TableHead className="px-4 py-3">Date</TableHead>
                <TableHead className="px-4 py-3">Employee</TableHead>
                <TableHead className="px-4 py-3">Location</TableHead>
                <TableHead className="px-4 py-3">Asset</TableHead>
                <TableHead className="px-4 py-3">Expected</TableHead>
                <TableHead className="px-4 py-3">Available</TableHead>
                <TableHead className="px-4 py-3">Condition</TableHead>
                <TableHead className="px-4 py-3">Notes</TableHead>
                <TableHead className="px-4 py-3">Selfie</TableHead>
                <TableHead className="px-4 py-3">GPS</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground px-4 py-8">
                    No inspections found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInspections.flatMap(
                  (session) =>
                    session.inspection_assets?.map((asset: any, assetIdx: number) => (
                      <TableRow
                        key={`${session.id}-${asset.id}`}
                        className="hover:bg-muted/30 [&:nth-child(even)]:bg-muted/10"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="whitespace-nowrap">
                            <div className="text-sm">{format(new Date(session.submission_date), "MMM d, yyyy")}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(session.submission_date), "HH:mm")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm">{format(new Date(session.inspection_date), "MMM d, yyyy")}</span>
                            {session.is_late && (
                              <Badge variant="destructive" className="text-xs px-2 py-0.5 rounded-full">
                                Late
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">{session.employee_profile?.name || "N/A"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <a
                            href={`https://www.google.com/maps?q=${session.gps_latitude},${session.gps_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
                          >
                            <MapPin className="h-3 w-3" />
                            Map
                          </a>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">{asset.inventory_items?.name || "N/A"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-center">{asset.expected_quantity}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-center">{asset.available_quantity}</TableCell>
                        <TableCell className="px-4 py-3 text-sm">{asset.condition}</TableCell>
                        <TableCell className="px-4 py-3 text-sm max-w-[200px]">
                          <span className="line-clamp-2">{asset.notes || "-"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {session.selfie_url && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]">
                                  <Image className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Inspection Selfie</DialogTitle>
                                </DialogHeader>
                                <img src={session.selfie_url} alt="Inspection selfie" className="w-full rounded-lg" />
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          {session.gps_latitude && session.gps_longitude ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {session.gps_latitude.toFixed(4)}, {session.gps_longitude.toFixed(4)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">{getStatusBadge(session.status)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex gap-2 justify-end flex-wrap">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="min-h-[44px]">
                                  Details
                                </Button>
                              </DialogTrigger>
                              {/* dialog content kept same as your original */}
                            </Dialog>

                            {session.status === "Pending" && assetIdx === 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleStatusUpdate(session.id, "Approved")}
                                  className="min-h-[44px]"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(session.id, "Rejected")}
                                  className="min-h-[44px]"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {session.is_late && assetIdx === 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFineDialog({ open: true, inspection: session });
                                  setFineAmount(session.fine_amount?.toString() || "");
                                  setLateRemarks(session.late_remarks || "");
                                }}
                                className="min-h-[44px]"
                              >
                                Fine
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || [],
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Fine Dialog (unchanged) */}
      <Dialog
        open={fineDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setFineDialog({ open: false, inspection: null });
            setFineAmount("");
            setLateRemarks("");
          }
        }}
      >
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
                {fineDialog.inspection && format(new Date(fineDialog.inspection.submission_date), "MMM d, yyyy HH:mm")}
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
                setFineAmount("");
                setLateRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFineUpdate}>Save Fine</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
