import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Package, FileText, CheckCircle, Clock, DollarSign } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");

  // Fetch all data
  const { data: requests, isLoading } = useQuery({
    queryKey: ["reports-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const { data: profiles } = await supabase.from("profiles").select("id, name");
      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      // Fetch collections for each request
      const requestsWithCollections = await Promise.all(
        (data || []).map(async (req) => {
          const { data: collections } = await supabase
            .from("collections")
            .select("amount")
            .eq("item_request_id", req.id);

          const receivedAmount = collections?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
          // For now, use a placeholder for totalDue - this would need to be calculated based on actual purchase
          const totalDue = 0;
          const pendingAmount = totalDue - receivedAmount;

          return {
            ...req,
            employeeName: profileMap.get(req.user_id) || "Unknown",
            itemName: req.title || "Unknown",
            pricePerUnit: 0,
            totalDue,
            receivedAmount,
            pendingAmount,
          };
        })
      );

      return requestsWithCollections;
    },
  });

  const { data: inventoryCount } = useQuery({
    queryKey: ["inventory-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .eq("is_archived", false);
      return count || 0;
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!requests) return null;

    const totalRequests = requests.length;
    const approvedRequests = requests.filter((r) => r.status === "Approved").length;
    const pendingRequests = requests.filter((r) => r.status === "Submitted").length;
    const totalCollected = requests.reduce((sum, r) => sum + r.receivedAmount, 0);
    const totalPending = requests.reduce((sum, r) => sum + r.pendingAmount, 0);

    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      totalCollected,
      totalPending,
    };
  }, [requests]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!requests) return [];

    return requests.filter((req) => {
      const matchesSearch =
        req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesMarket =
        marketFilter === "all" || req.market_or_location === marketFilter;

      return matchesSearch && matchesStatus && matchesMarket;
    });
  }, [requests, searchTerm, statusFilter, marketFilter]);

  // Get unique markets
  const markets = useMemo(() => {
    if (!requests) return [];
    const uniqueMarkets = [...new Set(requests.map((r) => r.market_or_location).filter(Boolean))];
    return uniqueMarkets;
  }, [requests]);

  // Chart data
  const statusChartData = useMemo(() => {
    if (!requests) return [];
    const statusCounts = requests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [requests]);

  const marketChartData = useMemo(() => {
    if (!requests) return [];
    const marketTotals = requests.reduce((acc, req) => {
      const market = req.market_or_location || "No Market";
      acc[market] = (acc[market] || 0) + req.receivedAmount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(marketTotals)
      .map(([market, total]) => ({
        name: market,
        total: Number(total.toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [requests]);

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredData.length) return;

    const headers = [
      "Employee Name",
      "Market Name",
      "Item Name",
      "Quantity",
      "Price per Unit",
      "Total Due",
      "Received Amount",
      "Pending Amount",
      "Status",
      "Date",
    ];

    const rows = filteredData.map((req) => [
      req.employeeName,
      req.market_or_location || "—",
      req.itemName,
      req.quantity,
      req.pricePerUnit.toFixed(2),
      req.totalDue.toFixed(2),
      req.receivedAmount.toFixed(2),
      req.pendingAmount.toFixed(2),
      req.status,
      format(new Date(req.created_at), "yyyy-MM-dd"),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">View analytics and download reports</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedRequests || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingRequests || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.totalCollected.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.totalPending.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Requests by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Markets by Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marketChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Reports</CardTitle>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by employee or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {markets.map((market) => (
                    <SelectItem key={market} value={market}>
                      {market}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price/Unit</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.employeeName}</TableCell>
                    <TableCell>{req.market_or_location || "—"}</TableCell>
                    <TableCell>{req.itemName}</TableCell>
                    <TableCell className="text-right">{req.quantity}</TableCell>
                    <TableCell className="text-right">₹{req.pricePerUnit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{req.totalDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{req.receivedAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{req.pendingAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          req.status === "Approved"
                            ? "bg-green-50 text-green-700"
                            : req.status === "Rejected"
                            ? "bg-red-50 text-red-700"
                            : req.status === "Submitted"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(req.created_at), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
