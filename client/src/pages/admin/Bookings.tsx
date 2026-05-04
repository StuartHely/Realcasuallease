import { useState, useMemo, useEffect } from "react";
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

import { CheckCircle, XCircle, Clock, DollarSign, Search, X, FileText, Pencil, Download, ExternalLink, FileSignature, Mail, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { cleanHtmlDescription } from "@/lib/htmlUtils";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type BookingStatus = "all" | "pending" | "confirmed" | "cancelled" | "rejected" | "completed" | "unpaid";

export default function AdminBookings() {
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [licenceDialogOpen, setLicenceDialogOpen] = useState(false);
  const [licenceBookingId, setLicenceBookingId] = useState<number | null>(null);

  const { data: bookings, isLoading, refetch } = trpc.bookings.list.useQuery({
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });

  // Search box should look across ALL bookings, not just the active status tab.
  // This second query is fetched only when there's an active search query.
  const { data: allBookings } = trpc.bookings.list.useQuery(
    { status: undefined },
    { enabled: searchQuery.trim().length > 0 && selectedStatus !== "all" },
  );

  const { data: countData } = trpc.bookings.statusCounts.useQuery();

  const statusCounts = countData ?? { all: 0, pending: 0, confirmed: 0, cancelled: 0, rejected: 0, completed: 0, unpaid: 0 };

  const invoiceStats = {
    totalOutstanding: countData?.totalOutstanding ?? 0,
    totalOverdue: countData?.totalOverdue ?? 0,
    outstandingCount: countData?.outstandingCount ?? 0,
    overdueCount: countData?.overdueCount ?? 0,
  };

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptBookingId, setReceiptBookingId] = useState<number | null>(null);
  const [receiptEmails, setReceiptEmails] = useState("");

  const [paymentConfirm, setPaymentConfirm] = useState<{ bookingId: number; bookingNumber: string } | null>(null);

  const recordPaymentMutation = trpc.admin.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      refetch();
      setPaymentConfirm(null);
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });

  const receiptHistory = trpc.admin.getReceiptHistory.useQuery(
    { bookingId: receiptBookingId! },
    { enabled: receiptDialogOpen && receiptBookingId !== null }
  );

  const previewReceiptMutation = trpc.admin.previewReceipt.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    },
    onError: (error: any) => toast.error(`Preview failed: ${error.message}`),
  });

  const sendReceiptMutation = trpc.admin.sendReceipt.useMutation({
    onSuccess: (data) => {
      toast.success(`Receipt ${data.receiptNumber} sent to ${data.sentTo.join(', ')}`);
      receiptHistory.refetch();
      setReceiptEmails("");
    },
    onError: (error: any) => toast.error(`Failed to send receipt: ${error.message}`),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status && ['all','pending','confirmed','cancelled','rejected','completed','unpaid'].includes(status)) {
      setSelectedStatus(status as BookingStatus);
    }
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  // Filter and sort bookings based on search query.
  // When the user types a search, look across ALL bookings (any status), not
  // just the active tab — typing a booking number from any status should find it.
  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return bookings || [];

    const searchSource = (selectedStatus === "all" ? bookings : allBookings) || bookings || [];
    if (searchSource.length === 0) return [];

    // Free-text search across the fields a user is likely to recall:
    // booking number, company / trading name, customer name + email,
    // centre, site number, product category.
    const lowerQuery = query.toLowerCase();
    const matchedBookings = searchSource.filter((booking) => {
      const haystack = [
        booking.bookingNumber,
        booking.companyName,
        booking.tradingName,
        (booking as any).customerName,
        (booking as any).customerEmail,
        booking.centreName,
        booking.siteNumber,
        (booking as any).productCategory,
      ]
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .join(" \u2002 ")
        .toLowerCase();
      return haystack.includes(lowerQuery);
    });

    // Sort matches by centre name alphabetically for easier scanning
    return matchedBookings.sort((a, b) => {
      const centreA = a.centreName?.toLowerCase() || "";
      const centreB = b.centreName?.toLowerCase() || "";
      return centreA.localeCompare(centreB);
    });
  }, [bookings, allBookings, searchQuery, selectedStatus]);

  const licenceStatus = trpc.licence.getStatus.useQuery(
    { bookingId: licenceBookingId!, assetType: "cl" },
    { enabled: licenceDialogOpen && licenceBookingId !== null }
  );

  const resendMutation = trpc.licence.resendSigningLink.useMutation({
    onSuccess: () => {
      toast.success("Signing link resent successfully");
      licenceStatus.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to resend: ${error.message}`);
    },
  });

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

  // Handle Licence PDF button click — opens latest licence (signed copy if signed)
  const handleLicencePDF = (bookingId: number) => {
    window.open(`/api/licence/${bookingId}`, '_blank');
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
          siteDescription: cleanHtmlDescription(booking.siteName) || '',
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

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoiceStats.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceStats.outstandingCount} invoice{invoiceStats.outstandingCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(invoiceStats.totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceStats.overdueCount} invoice{invoiceStats.overdueCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoiceStats.totalOutstanding + invoiceStats.totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceStats.outstandingCount + invoiceStats.overdueCount} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoiceStats.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overdue invoices need follow-up
            </p>
          </CardContent>
        </Card>
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
          <TabsTrigger value="cancelled">
            <XCircle className="h-4 w-4 mr-2" />
            Cancelled
            <span className="ml-1.5 text-xs opacity-70">({statusCounts.cancelled})</span>
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
                    ? selectedStatus === "all"
                      ? `${filteredBookings.length} of ${bookings?.length || 0} booking(s) match "${searchQuery}"`
                      : `${filteredBookings.length} booking(s) match "${searchQuery}" (across all statuses)`
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
                        <TableHead className="w-[90px]">Site #</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Date Entered</TableHead>
                        <TableHead>Amended</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Paid?</TableHead>
                        {selectedStatus === "unpaid" && <TableHead>Due Date</TableHead>}
                        <TableHead>Licence</TableHead>
                        <TableHead>Invoice PDF</TableHead>
                        <TableHead>Licence PDF</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Edit</TableHead>
                        {selectedStatus === "pending" && <TableHead>Actions</TableHead>}
                        {selectedStatus === "unpaid" && <TableHead>Actions</TableHead>}
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
                            <TableCell className="w-[90px] max-w-[90px]">
                              <div className="font-medium whitespace-nowrap">{booking.siteNumber || "—"}</div>
                              <div
                                className="text-xs text-muted-foreground truncate"
                                title={cleanHtmlDescription(booking.siteName)}
                              >
                                {cleanHtmlDescription(booking.siteName)}
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
                            {selectedStatus === "unpaid" && (
                              <TableCell>
                                {booking.approvedAt ? (() => {
                                  const dueDate = new Date(booking.approvedAt);
                                  dueDate.setDate(dueDate.getDate() + 14);
                                  const daysUntilDue = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  return (
                                    <div>
                                      <div>{format(dueDate, "dd/MM/yy")}</div>
                                      <div className={`text-xs ${daysUntilDue < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                        {daysUntilDue < 0
                                          ? `${Math.abs(daysUntilDue)}d overdue`
                                          : `${daysUntilDue}d remaining`}
                                      </div>
                                    </div>
                                  );
                                })() : '—'}
                              </TableCell>
                            )}
                            <TableCell>
                              <button
                                onClick={() => {
                                  setLicenceBookingId(booking.id);
                                  setLicenceDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                {booking.licenceSignedAt ? (
                                  <Badge variant="default" className="bg-green-600 gap-1">
                                    <FileSignature className="h-3 w-3" />
                                    Signed
                                  </Badge>
                                ) : booking.licenceSignatureToken ? (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300 gap-1">
                                    <FileSignature className="h-3 w-3" />
                                    Sent
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground gap-1">
                                    <FileSignature className="h-3 w-3" />
                                    N/A
                                  </Badge>
                                )}
                              </button>
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
                                onClick={() => handleLicencePDF(booking.id)}
                                className={`gap-1 ${booking.licenceSignedAt ? 'border-green-300 text-green-700' : ''}`}
                                title={booking.licenceSignedAt ? 'View signed licence' : 'View latest licence (unsigned)'}
                              >
                                <FileSignature className="h-3 w-3" />
                                Licence PDF
                              </Button>
                            </TableCell>
                            <TableCell>
                              {booking.paidAt && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setReceiptBookingId(booking.id);
                                    setReceiptEmails(booking.customerEmail || "");
                                    setReceiptDialogOpen(true);
                                  }}
                                  className="gap-1 text-emerald-600 border-emerald-300"
                                >
                                  <Mail className="h-3 w-3" />
                                  Receipt
                                </Button>
                              )}
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation('/admin/pending-approvals')}
                                  className="text-amber-600 border-amber-300"
                                >
                                  Review
                                </Button>
                              </TableCell>
                            )}
                            {selectedStatus === "unpaid" && !booking.paidAt && (
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300"
                                  onClick={() => setPaymentConfirm({ bookingId: booking.id, bookingNumber: booking.bookingNumber })}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Mark Paid
                                </Button>
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

      {/* Licence Detail Dialog */}
      <Dialog open={licenceDialogOpen} onOpenChange={setLicenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Licence Agreement Status</DialogTitle>
            <DialogDescription>
              Signing details for this booking's licence agreement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {licenceStatus.isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : licenceStatus.data?.signedAt ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle className="h-5 w-5" />
                  Licence Signed
                </div>
                <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Signed By</div>
                    <div className="font-medium">{licenceStatus.data.signedByName}</div>
                    <div className="text-muted-foreground">Signed At</div>
                    <div className="font-medium">{new Date(licenceStatus.data.signedAt).toLocaleString('en-AU')}</div>
                    <div className="text-muted-foreground">IP Address</div>
                    <div className="font-mono text-xs">{licenceStatus.data.signedByIp}</div>
                  </div>
                </div>
              </div>
            ) : licenceStatus.data?.token ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-600 font-medium">
                  <Clock className="h-5 w-5" />
                  Awaiting Signature
                </div>
                <p className="text-sm text-muted-foreground">
                  The licence agreement has been sent but has not been signed yet.
                </p>
                <Button
                  onClick={() => resendMutation.mutate({ bookingId: licenceBookingId!, assetType: "cl" })}
                  disabled={resendMutation.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {resendMutation.isPending ? "Resending..." : "Resend Signing Link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <FileSignature className="h-5 w-5" />
                  Not Yet Sent
                </div>
                <p className="text-sm text-muted-foreground">
                  The licence agreement has not been dispatched for this booking.
                  Click below to generate a signing link and email it to the customer.
                </p>
                <Button
                  onClick={() => resendMutation.mutate({ bookingId: licenceBookingId!, assetType: "cl" })}
                  disabled={resendMutation.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {resendMutation.isPending ? "Sending..." : "Send Signing Link"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLicenceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={(open) => {
        setReceiptDialogOpen(open);
        if (!open) {
          setReceiptBookingId(null);
          setReceiptEmails("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Payment Receipt</DialogTitle>
            <DialogDescription>
              Generate and email a payment receipt for this booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Recipient Email(s)</label>
              <input
                type="text"
                value={receiptEmails}
                onChange={(e) => setReceiptEmails(e.target.value)}
                placeholder="email@example.com, another@example.com"
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Up to 5 email addresses, comma-separated
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => receiptBookingId && previewReceiptMutation.mutate({ bookingId: receiptBookingId })}
                disabled={previewReceiptMutation.isPending}
                className="gap-1"
              >
                <FileText className="h-4 w-4" />
                {previewReceiptMutation.isPending ? "Generating..." : "Preview PDF"}
              </Button>
              <Button
                onClick={() => {
                  if (receiptBookingId && receiptEmails.trim()) {
                    sendReceiptMutation.mutate({
                      bookingId: receiptBookingId,
                      recipientEmails: receiptEmails.trim(),
                    });
                  }
                }}
                disabled={sendReceiptMutation.isPending || !receiptEmails.trim()}
                className="gap-1"
              >
                <Mail className="h-4 w-4" />
                {sendReceiptMutation.isPending ? "Sending..." : "Send Receipt"}
              </Button>
            </div>

            {/* Receipt History */}
            {receiptHistory.data && receiptHistory.data.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-3">Receipt History</h4>
                <div className="space-y-2">
                  {receiptHistory.data.map((receipt) => (
                    <div key={receipt.id} className="flex items-start justify-between text-sm p-2 bg-muted/50 rounded">
                      <div>
                        <div className="font-medium">{receipt.receiptNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          Sent by {receipt.sentByName || 'Admin'} • {new Date(receipt.createdAt).toLocaleString('en-AU')}
                        </div>
                        <div className="text-xs text-muted-foreground">To: {receipt.recipientEmails}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => previewReceiptMutation.mutate({ bookingId: receiptBookingId! })}
                        className="text-xs"
                      >
                        Regenerate
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!paymentConfirm}
        onOpenChange={(open) => { if (!open) setPaymentConfirm(null); }}
        title="Record Payment"
        description={`Mark booking ${paymentConfirm?.bookingNumber} as paid? This will trigger payment splits and commission calculations.`}
        confirmLabel="Record Payment"
        variant="default"
        onConfirm={() => {
          if (paymentConfirm) recordPaymentMutation.mutate({ bookingId: paymentConfirm.bookingId });
        }}
      />
      </div>
    </AdminLayout>
  );
}
