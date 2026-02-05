import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, DollarSign, Search, X, FileText, Pencil, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLocation } from "wouter";

type BookingStatus = "all" | "pending" | "confirmed" | "rejected" | "completed" | "unpaid";

export default function AdminBookings() {
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>("pending");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookings, isLoading, refetch } = trpc.bookings.list.useQuery({
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });

  // Fetch all bookings to calculate counts for each status
  const { data: allBookings } = trpc.bookings.list.useQuery({
    status: undefined, // Get all bookings for count calculation
  });

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    if (!allBookings) return { all: 0, pending: 0, confirmed: 0, rejected: 0, completed: 0, unpaid: 0 };
    
    return {
      all: allBookings.length,
      pending: allBookings.filter(b => b.status === 'pending').length,
      confirmed: allBookings.filter(b => b.status === 'confirmed').length,
      rejected: allBookings.filter(b => b.status === 'rejected').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      // Unpaid should exclude rejected bookings - rejected bookings are not eligible for payment
      unpaid: allBookings.filter(b => b.paymentMethod === 'invoice' && !b.paidAt && b.status !== 'rejected').length,
    };
  }, [allBookings]);

  // Filter and sort bookings based on search query
  const filteredBookings = useMemo(() => {
    // For booking number search, search across ALL bookings regardless of current tab
    const query = searchQuery.trim();
    const isBookingNumberSearch = /^[A-Z0-9]+-\d{8,}-[A-Z0-9]+$/i.test(query) || /^BK\d+[A-Z]+$/i.test(query);
    
    // Use allBookings for booking number search to find across all statuses
    const searchSource = isBookingNumberSearch && allBookings ? allBookings : (bookings || []);
    
    if (!searchSource || searchSource.length === 0) return [];
    if (!query) return bookings || [];

    if (isBookingNumberSearch) {
      // Search for booking number across ALL bookings (all statuses)
      return searchSource.filter((booking) => 
        booking.bookingNumber?.toUpperCase().includes(query.toUpperCase())
      );
    }
    
    // Company name or trading name search (partial, case-insensitive)
    const lowerQuery = query.toLowerCase();
    const matchedBookings = (bookings || []).filter((booking) => {
      const companyName = booking.companyName?.toLowerCase() || "";
      const tradingName = booking.tradingName?.toLowerCase() || "";
      return companyName.includes(lowerQuery) || tradingName.includes(lowerQuery);
    });
    
    // Sort by centre name alphabetically for company name searches
    return matchedBookings.sort((a, b) => {
      const centreA = a.centreName?.toLowerCase() || "";
      const centreB = b.centreName?.toLowerCase() || "";
      return centreA.localeCompare(centreB);
    });
  }, [bookings, searchQuery, allBookings]);

  const approveMutation = trpc.bookings.approve.useMutation({
    onSuccess: () => {
      toast.success("Booking approved successfully");
      setApproveDialogOpen(false);
      setSelectedBookingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to approve booking: ${error.message}`);
    },
  });

  const rejectMutation = trpc.bookings.reject.useMutation({
    onSuccess: () => {
      toast.success("Booking rejected");
      setRejectDialogOpen(false);
      setSelectedBookingId(null);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject booking: ${error.message}`);
    },
  });

  const handleApprove = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setApproveDialogOpen(true);
  };

  const handleReject = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedBookingId) {
      approveMutation.mutate({ bookingId: selectedBookingId });
    }
  };

  const confirmReject = () => {
    if (selectedBookingId) {
      rejectMutation.mutate({ 
        bookingId: selectedBookingId,
        reason: rejectionReason || "No reason provided"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      confirmed: { variant: "default" as const, icon: CheckCircle, label: "Confirmed" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
      cancelled: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
      completed: { variant: "outline" as const, icon: CheckCircle, label: "Completed" },
    };

    const config = variants[status];
    if (!config) return null;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Check if booking has been amended (updatedAt differs from createdAt by more than 1 minute)
  const isAmended = (createdAt: Date | string, updatedAt: Date | string | null | undefined) => {
    if (!updatedAt) return false;
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    return (updated - created) > 60000; // More than 1 minute difference
  };

  // Handle Invoice PDF button click
  const handleInvoicePDF = (bookingId: number) => {
    // Open invoice in new tab
    window.open(`/api/invoice/${bookingId}`, '_blank');
  };

  // Handle Edit button click
  const handleEdit = (bookingId: number, centreId: number | undefined) => {
    // Navigate to admin booking page with the booking selected
    if (centreId) {
      setLocation(`/admin/admin-booking?centreId=${centreId}&bookingId=${bookingId}`);
    } else {
      toast.error("Cannot edit: Centre information not available");
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  // Handle export to Excel
  const handleExportExcel = async () => {
    if (!filteredBookings || filteredBookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }

    setIsExporting(true);
    try {
      // Dynamically import ExcelJS
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Bookings');

      // Define columns matching the table
      worksheet.columns = [
        { header: 'Booking Number', key: 'bookingNumber', width: 25 },
        { header: 'Company Name', key: 'companyName', width: 25 },
        { header: 'Trading Name', key: 'tradingName', width: 25 },
        { header: 'Centre Name', key: 'centreName', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Site Number', key: 'siteNumber', width: 15 },
        { header: 'Site Description', key: 'siteDescription', width: 30 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Date Entered', key: 'dateEntered', width: 15 },
        { header: 'Amended', key: 'amended', width: 10 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'GST', key: 'gst', width: 12 },
        { header: 'Total', key: 'total', width: 12 },
        { header: 'Paid?', key: 'paid', width: 8 },
        { header: 'Status', key: 'status', width: 12 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      filteredBookings.forEach((booking) => {
        const subtotal = Number(booking.totalAmount || 0) - Number(booking.gstAmount || 0);
        // For rejected bookings, show "R" instead of Y/N for paid status
        const isRejected = booking.status === 'rejected';
        const paidValue = isRejected ? 'R' : (booking.paidAt ? 'Y' : 'N');
        
        worksheet.addRow({
          bookingNumber: booking.bookingNumber || '',
          companyName: booking.companyName || '',
          tradingName: booking.tradingName || booking.companyName || '',
          centreName: booking.centreName || '',
          category: booking.productCategory || '',
          siteNumber: booking.siteNumber || '',
          siteDescription: booking.siteName || '',
          startDate: booking.startDate ? format(new Date(booking.startDate), 'dd/MM/yy') : '',
          endDate: booking.endDate ? format(new Date(booking.endDate), 'dd/MM/yy') : '',
          dateEntered: booking.createdAt ? format(new Date(booking.createdAt), 'dd/MM/yy') : '',
          amended: isAmended(booking.createdAt, booking.updatedAt) ? 'Y' : '',
          amount: `$${subtotal.toFixed(2)}`,
          gst: `$${Number(booking.gstAmount || 0).toFixed(2)}`,
          total: `$${Number(booking.totalAmount || 0).toFixed(2)}`,
          paid: paidValue,
          status: booking.status || '',
        });
      });

      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      link.download = `bookings-export-${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredBookings.length} bookings to Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export bookings');
    } finally {
      setIsExporting(false);
    }
  };

  // Get the payment status badge for a booking
  const getPaymentBadge = (booking: { status: string; paidAt: Date | string | null; paymentMethod: string | null }) => {
    // Rejected bookings show black "R" badge - they are not eligible for payment
    if (booking.status === 'rejected') {
      return (
        <Badge variant="outline" className="bg-gray-900 text-white border-gray-900 font-bold">R</Badge>
      );
    }
    
    // For non-rejected bookings, show Y (paid) or N (unpaid)
    const isPaid = !!booking.paidAt || booking.paymentMethod === 'stripe';
    if (isPaid) {
      return (
        <Badge variant="default" className="bg-green-600">Y</Badge>
      );
    }
    return (
      <Badge variant="destructive">N</Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage booking requests from customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by booking number, company name, or trading name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting || !filteredBookings || filteredBookings.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      <Tabs value={selectedStatus} onValueChange={(v) => {
          setSearchQuery(""); // Clear search when switching tabs
          setSelectedStatus(v as BookingStatus);
        }}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.pending})</span>
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmed
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.confirmed})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.rejected})</span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.completed})</span>
          </TabsTrigger>
          <TabsTrigger value="unpaid">
            <DollarSign className="h-4 w-4 mr-2" />
            Unpaid
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.unpaid})</span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All Bookings
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.all})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedStatus === "all" ? "All" : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Bookings</CardTitle>
              <CardDescription>
                {isLoading ? "Loading bookings..." : (
                  searchQuery 
                    ? `${filteredBookings.length} of ${bookings?.length || 0} booking(s) match "${searchQuery}"`
                    : `${bookings?.length || 0} booking(s) found`
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? `No bookings match "${searchQuery}"`
                    : `No ${selectedStatus} bookings found`}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking Number</TableHead>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Trading Name</TableHead>
                        <TableHead>Centre Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Site Number</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Date Entered</TableHead>
                        <TableHead>Amended</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Paid?</TableHead>
                        <TableHead>Invoice PDF</TableHead>
                        <TableHead>Edit</TableHead>
                        {selectedStatus === "pending" && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => {
                        const amount = parseFloat(booking.totalAmount?.toString() || "0");
                        const gst = parseFloat(booking.gstAmount?.toString() || "0");
                        const total = amount + gst;
                        const amended = isAmended(booking.createdAt, booking.updatedAt);
                        
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium whitespace-nowrap">{booking.bookingNumber}</TableCell>
                            <TableCell>
                              {booking.customerId ? (
                                <button
                                  onClick={() => setLocation(`/admin/customer/${booking.customerId}`)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  {booking.companyName || "—"}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              ) : (
                                booking.companyName || "—"
                              )}
                            </TableCell>
                            <TableCell>{booking.tradingName || booking.companyName || "—"}</TableCell>
                            <TableCell>{booking.centreName || "—"}</TableCell>
                            <TableCell>{booking.productCategory || "—"}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{booking.siteNumber || "—"}</div>
                                <div className="text-sm text-muted-foreground">{booking.siteName}</div>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(booking.startDate), "dd/MM/yy")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(booking.endDate), "dd/MM/yy")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(booking.createdAt), "dd/MM/yy")}
                            </TableCell>
                            <TableCell>
                              {amended ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Y</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">${amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">${gst.toFixed(2)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap font-medium">${total.toFixed(2)}</TableCell>
                            <TableCell>
                              {getPaymentBadge(booking)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInvoicePDF(booking.id)}
                                className="gap-1"
                              >
                                <FileText className="h-3 w-3" />
                                Invoice PDF
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(booking.id, booking.centreId)}
                                className="gap-1"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            </TableCell>
                            {selectedStatus === "pending" && (
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(booking.id)}
                                    className="gap-1"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(booking.id)}
                                    className="gap-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this booking? The customer will receive a confirmation email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this booking. The customer will receive an email with your explanation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Site is unavailable due to maintenance..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}
