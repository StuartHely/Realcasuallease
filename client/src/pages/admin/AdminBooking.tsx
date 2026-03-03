import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfDay, eachDayOfInterval, isSameDay, isWithinInterval, addMonths, subMonths } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Building2, User, DollarSign, Info, AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminBooking() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  
  // Parse URL parameters
  const urlParams = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return {
      month: params.get('month'),
      centreId: params.get('centreId'),
      bookingId: params.get('bookingId'),
    };
  }, [searchString]);

  // Parse month from URL
  const initialMonth = useMemo(() => {
    if (urlParams.month) {
      const [year, month] = urlParams.month.split('-').map(Number);
      if (year && month) {
        return new Date(year, month - 1, 1);
      }
    }
    return new Date();
  }, [urlParams.month]);
  
  // State for form
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [tablesRequested, setTablesRequested] = useState(0);
  const [chairsRequested, setChairsRequested] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"stripe" | "invoice">("stripe");
  const [adminComments, setAdminComments] = useState("");
  const [overrideAmount, setOverrideAmount] = useState<string>("");
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Edit/Cancel booking state
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editFormData, setEditFormData] = useState({
    tablesRequested: 0,
    chairsRequested: 0,
    totalAmount: "",
    adminComments: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  // Queries
  const { data: centres } = trpc.centres.list.useQuery();
  const { data: users } = trpc.adminBooking.getUsers.useQuery();
  
  const { data: availabilityData, isLoading: loadingAvailability } = trpc.adminBooking.getAvailabilityGrid.useQuery(
    {
      centreId: selectedCentreId!,
      year: selectedMonth.getFullYear(),
      month: selectedMonth.getMonth() + 1,
    },
    { enabled: !!selectedCentreId }
  );

  const { data: costPreview, isLoading: loadingCost } = trpc.adminBooking.calculateCost.useQuery(
    {
      siteId: selectedSiteId!,
      startDate: selectedStartDate!,
      endDate: selectedEndDate!,
    },
    { enabled: !!selectedSiteId && !!selectedStartDate && !!selectedEndDate }
  );

  const { data: overlaps } = trpc.adminBooking.checkOverlaps.useQuery(
    {
      siteId: selectedSiteId!,
      startDate: selectedStartDate!,
      endDate: selectedEndDate!,
    },
    { enabled: !!selectedSiteId && !!selectedStartDate && !!selectedEndDate }
  );

  // Auto-set payment method based on centre's payment mode
  useEffect(() => {
    if (costPreview?.paymentMode) {
      if (costPreview.paymentMode === "invoice_only") {
        setSelectedPaymentMethod("invoice");
      } else if (costPreview.paymentMode === "stripe") {
        setSelectedPaymentMethod("stripe");
      } else if (costPreview.paymentMode === "stripe_with_exceptions") {
        setSelectedPaymentMethod("stripe");
      }
    }
  }, [costPreview?.paymentMode]);

  const utils = trpc.useUtils();

  const createBookingMutation = trpc.adminBooking.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} created successfully!`);
      // Invalidate availability grid to show new booking immediately
      utils.adminBooking.getAvailabilityGrid.invalidate();
      // Reset form
      setSelectedSiteId(null);
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setSelectedUserId(null);
      setTablesRequested(0);
      setChairsRequested(0);
      setSelectedPaymentMethod("stripe");
      setAdminComments("");
      setOverrideAmount("");
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateBookingMutation = trpc.adminBooking.update.useMutation({
    onSuccess: () => {
      toast.success("Booking amended successfully!");
      utils.adminBooking.getAvailabilityGrid.invalidate();
      setShowEditDialog(false);
      setEditingBookingId(null);
      // If we came from Booking Management (via URL params), redirect back
      if (urlParams.bookingId) {
        setLocation('/admin/bookings');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelBookingMutation = trpc.adminBooking.cancel.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} cancelled successfully!`);
      utils.adminBooking.getAvailabilityGrid.invalidate();
      utils.adminBooking.getPendingRefunds.invalidate();
      setShowCancelDialog(false);
      setEditingBookingId(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Pending refunds (mega admin only)
  const isMegaAdmin = user?.role === 'mega_admin' || user?.role === 'mega_state_admin';
  const { data: pendingRefunds } = trpc.adminBooking.getPendingRefunds.useQuery(
    undefined,
    { enabled: isMegaAdmin },
  );
  const processRefundMutation = trpc.adminBooking.processRefund.useMutation({
    onSuccess: (data) => {
      toast.success(`Refund ${data.refundStatus === 'processed' ? 'processed via Stripe' : 'marked as manually refunded'}`);
      utils.adminBooking.getPendingRefunds.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Auto-load centre and booking from URL parameters (for editing from Booking Management)
  useEffect(() => {
    if (urlParams.centreId && centres) {
      const centreId = parseInt(urlParams.centreId, 10);
      if (!isNaN(centreId) && centres.some(c => c.id === centreId)) {
        setSelectedCentreId(centreId);
      }
    }
  }, [urlParams.centreId, centres]);

  useEffect(() => {
    if (urlParams.bookingId && selectedCentreId) {
      const bookingId = parseInt(urlParams.bookingId, 10);
      if (!isNaN(bookingId)) {
        setEditingBookingId(bookingId);
        setShowEditDialog(true);
      }
    }
  }, [urlParams.bookingId, selectedCentreId]);

  // Sort centres alphabetically
  const sortedCentres = useMemo(() => {
    if (!centres) return [];
    return [...centres].sort((a, b) => a.name.localeCompare(b.name));
  }, [centres]);

  // Sort users alphabetically
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      const nameA = a.companyName || a.name || a.email || "";
      const nameB = b.companyName || b.name || b.email || "";
      return nameA.localeCompare(nameB);
    });
  }, [users]);

  // Get selected user details
  const selectedUser = useMemo(() => {
    if (!selectedUserId || !users) return null;
    return users.find((u) => u.id === selectedUserId);
  }, [selectedUserId, users]);

  // Get selected centre
  const selectedCentre = useMemo(() => {
    if (!selectedCentreId || !centres) return null;
    return centres.find((c) => c.id === selectedCentreId);
  }, [selectedCentreId, centres]);

  // Days in month for grid
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  // Calculate final amount
  const finalAmount = useMemo(() => {
    if (overrideAmount && !isNaN(parseFloat(overrideAmount))) {
      return parseFloat(overrideAmount);
    }
    return costPreview?.totalAmount || 0;
  }, [overrideAmount, costPreview]);

  // Check if a day is booked for a site
  const getBookingForDay = (siteId: number, day: Date) => {
    if (!availabilityData) return null;
    const dayStart = startOfDay(day);
    const found = availabilityData.bookings.find((b) => {
      if (b.siteId !== siteId) return false;
      const bookingStart = startOfDay(new Date(b.startDate));
      const bookingEnd = startOfDay(new Date(b.endDate));
      // Check if day is within booking range (inclusive)
      return dayStart >= bookingStart && dayStart <= bookingEnd;
    });
    return found;
  };

  // Check if day is in selected range
  const isInSelectedRange = (day: Date) => {
    if (!selectedStartDate) return false;
    if (!selectedEndDate) return isSameDay(day, selectedStartDate);
    return isWithinInterval(day, { start: selectedStartDate, end: selectedEndDate });
  };

  // Handle booking click for edit/cancel
  const handleBookingClick = (booking: NonNullable<typeof availabilityData>["bookings"][0]) => {
    setEditingBookingId(booking.bookingId);
    setEditFormData({
      tablesRequested: booking.tablesRequested,
      chairsRequested: booking.chairsRequested,
      totalAmount: "", // Will be loaded from booking details
      adminComments: "",
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
    });
    setShowEditDialog(true);
  };

  // Handle day click for date selection
  const handleDayClick = (siteId: number, day: Date) => {
    const booking = getBookingForDay(siteId, day);
    if (booking) {
      // Click on booked day opens edit dialog
      handleBookingClick(booking);
      return;
    }

    if (selectedSiteId !== siteId) {
      // Switching to a different site - start fresh
      setSelectedSiteId(siteId);
      setSelectedStartDate(day);
      setSelectedEndDate(null);
    } else if (!selectedStartDate) {
      // No start date yet - set it
      setSelectedStartDate(day);
      setSelectedEndDate(null);
    } else if (!selectedEndDate) {
      // Have start date, need end date
      if (isSameDay(day, selectedStartDate)) {
        // Clicking same day - set single day booking
        setSelectedEndDate(day);
      } else if (day < selectedStartDate) {
        // Clicked before start - swap dates
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(day);
      } else {
        // Clicked after start - set end date
        setSelectedEndDate(day);
      }
    } else {
      // Already have both dates - start new selection on same site
      setSelectedStartDate(day);
      setSelectedEndDate(null);
    }
  };

  // Format booking info for cell display
  const formatBookingInfo = (booking: NonNullable<typeof availabilityData>["bookings"][0]) => {
    return (
      <div className="text-xs leading-tight">
        <div className="font-bold truncate">{booking.companyName || booking.customerName}</div>
        <div className="truncate">{booking.productCategory || "N/A"}</div>
        <div className="truncate">{booking.customerName}</div>
        <div className="truncate">{booking.contactPhone}</div>
        <div className="truncate">{booking.contactEmail}</div>
        <div className="truncate">
          {format(new Date(booking.startDate), "dd/MM")} - {format(new Date(booking.endDate), "dd/MM")}
        </div>
        <div className="font-bold truncate">
          T:{booking.tablesRequested} C:{booking.chairsRequested}
        </div>
        {booking.paymentMethod === "invoice" && (
          <div className={booking.paidAt ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
            {booking.paidAt ? "✓ PAID" : "⚠ UNPAID"}
          </div>
        )}
      </div>
    );
  };

  const handleConfirmBooking = () => {
    if (!selectedCentreId || !selectedSiteId || !selectedUserId || !selectedStartDate || !selectedEndDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    createBookingMutation.mutate({
      centreId: selectedCentreId,
      siteId: selectedSiteId,
      customerId: selectedUserId,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      totalAmount: finalAmount,
      tablesRequested,
      chairsRequested,
      paymentMethod: selectedPaymentMethod,
      adminComments: adminComments || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Booking</h1>
          <p className="text-muted-foreground">Create bookings on behalf of customers</p>
        </div>

        {/* Pending Refunds Banner (mega admin only) */}
        {isMegaAdmin && pendingRefunds && pendingRefunds.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                Refunds Pending — {pendingRefunds.length} cancelled booking{pendingRefunds.length !== 1 ? 's' : ''} require refund processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-left py-2 pr-4 font-medium">Booking</th>
                      <th className="text-left py-2 pr-4 font-medium">Customer</th>
                      <th className="text-left py-2 pr-4 font-medium">Centre / Site</th>
                      <th className="text-left py-2 pr-4 font-medium">Cancelled</th>
                      <th className="text-right py-2 pr-4 font-medium">Amount</th>
                      <th className="text-left py-2 pr-4 font-medium">Payment</th>
                      <th className="text-right py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRefunds.map((refund: any) => (
                      <tr key={refund.bookingId} className="border-b border-amber-100">
                        <td className="py-2 pr-4 font-medium">{refund.bookingNumber}</td>
                        <td className="py-2 pr-4">{refund.customerName}</td>
                        <td className="py-2 pr-4">{refund.centreName} — Site {refund.siteNumber}</td>
                        <td className="py-2 pr-4">{refund.cancelledAt ? format(new Date(refund.cancelledAt), 'dd/MM/yyyy') : '—'}</td>
                        <td className="py-2 pr-4 text-right">${Number(refund.totalAmount).toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className={refund.stripePaymentIntentId ? 'border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600'}>
                            {refund.stripePaymentIntentId ? 'Stripe' : 'Invoice'}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant={refund.stripePaymentIntentId ? "default" : "outline"}
                            disabled={processRefundMutation.isPending}
                            onClick={() => processRefundMutation.mutate({ bookingId: refund.bookingId })}
                          >
                            {processRefundMutation.isPending ? 'Processing...' : refund.stripePaymentIntentId ? 'Process Refund' : 'Mark as Refunded'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Centre Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Centre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCentreId?.toString() || ""}
              onValueChange={(v) => {
                setSelectedCentreId(parseInt(v));
                setSelectedSiteId(null);
                setSelectedStartDate(null);
                setSelectedEndDate(null);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a shopping centre..." />
              </SelectTrigger>
              <SelectContent>
                {sortedCentres.map((centre) => (
                  <SelectItem key={centre.id} value={centre.id.toString()}>
                    {centre.name} ({centre.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCentreId && (
          <>
            {/* Month Navigation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Site Availability Grid</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="font-semibold min-w-[150px] text-center">
                      {format(selectedMonth, "MMMM yyyy")}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={showAllDetails ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAllDetails(!showAllDetails)}
                  >
                    {showAllDetails ? "Hide Details" : "Show All Details"}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" /> Booked
                    <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded ml-2" /> Selected
                    <div className="w-4 h-4 bg-green-50 border border-green-200 rounded ml-2" /> Available
                    <div className="w-auto h-4 bg-green-200 text-green-800 text-[9px] font-bold px-1 rounded ml-2 flex items-center">PAID</div>
                    <div className="w-auto h-4 bg-amber-200 text-amber-800 text-[9px] font-bold px-1 rounded ml-2 flex items-center">UNPAID</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAvailability ? (
                  <div className="text-center py-8">Loading availability...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border p-2 bg-muted sticky left-0 z-10 min-w-[120px]">Site</th>
                          <th className="border p-2 bg-muted min-w-[100px]">Rates</th>
                          {daysInMonth.map((day) => (
                            <th
                              key={day.toISOString()}
                              className={cn(
                                "border p-1 bg-muted min-w-[40px] text-center",
                                [0, 6].includes(day.getDay()) && "bg-muted/70"
                              )}
                            >
                              <div>{format(day, "d")}</div>
                              <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {availabilityData?.sites.map((site) => (
                          <tr key={site.id}>
                            <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                              Site {site.siteNumber}
                            </td>
                            <td className="border p-1 text-xs">
                              <div>${site.pricePerDay}/day</div>
                              {site.weekendPricePerDay && <div>${site.weekendPricePerDay}/wknd</div>}
                              <div>${site.pricePerWeek}/wk</div>
                              {parseFloat(site.outgoingsPerDay || "0") > 0 && (
                                <p className="text-xs text-muted-foreground">Outgoings: ${site.outgoingsPerDay}/day</p>
                              )}
                            </td>
                            {daysInMonth.map((day) => {
                              const booking = getBookingForDay(site.id, day);
                              const isSelected = selectedSiteId === site.id && isInSelectedRange(day);

                              return (
                                <TooltipProvider key={day.toISOString()}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <td
                                        className={cn(
                                          "border p-1 cursor-pointer transition-colors min-h-[60px]",
                                          booking && "bg-red-100 hover:bg-red-200",
                                          isSelected && "bg-blue-100 hover:bg-blue-200 ring-2 ring-blue-500",
                                          !booking && !isSelected && "bg-green-50 hover:bg-green-100",
                                          [0, 6].includes(day.getDay()) && !booking && !isSelected && "bg-green-100/50"
                                        )}
                                        onClick={() => handleDayClick(site.id, day)}
                                      >
                                        {booking && showAllDetails && (
                                          <div className="text-[10px] leading-tight overflow-hidden max-h-[80px]">
                                            <div className="font-bold truncate">{booking.companyName || booking.customerName}</div>
                                            <div className="truncate">{booking.productCategory}</div>
                                            <div className="font-bold">T:{booking.tablesRequested} C:{booking.chairsRequested}</div>
                                          </div>
                                        )}
                                        {booking && booking.paymentMethod === "invoice" && (
                                          <div className={cn(
                                            "text-[9px] font-bold px-0.5 rounded text-center mt-0.5",
                                            booking.paidAt
                                              ? "bg-green-200 text-green-800"
                                              : booking.status === "confirmed"
                                                ? "bg-amber-200 text-amber-800"
                                                : ""
                                          )}>
                                            {booking.paidAt ? "PAID" : booking.status === "confirmed" ? "UNPAID" : ""}
                                          </div>
                                        )}
                                      </td>
                                    </TooltipTrigger>
                                    {booking && (
                                      <TooltipContent side="top" className="max-w-[300px]">
                                        {formatBookingInfo(booking)}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Form */}
            {selectedSiteId && selectedStartDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Booking Details</CardTitle>
                  <CardDescription>
                    Site {availabilityData?.sites.find((s) => s.id === selectedSiteId)?.siteNumber} at{" "}
                    {selectedCentre?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <div className="p-2 border rounded bg-muted">
                        {format(selectedStartDate, "dd/MM/yyyy")}
                      </div>
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <div className="p-2 border rounded bg-muted">
                        {selectedEndDate ? format(selectedEndDate, "dd/MM/yyyy") : "Click another day to set end date"}
                      </div>
                    </div>
                  </div>

                  {/* Overlap Warning */}
                  {overlaps && overlaps.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-red-700">Booking Conflict Detected</div>
                        <div className="text-sm text-red-600">
                          This date range conflicts with:
                          {overlaps.map((o) => (
                            <div key={o.bookingId}>
                              {o.bookingNumber} - {o.customerName} ({format(new Date(o.startDate), "dd/MM")} -{" "}
                              {format(new Date(o.endDate), "dd/MM")})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Selection */}
                  <div>
                    <Label>Customer</Label>
                    <Select
                      value={selectedUserId?.toString() || ""}
                      onValueChange={(v) => setSelectedUserId(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Search/select customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.companyName || user.name || user.email} 
                            {user.canPayByInvoice && " (Invoice)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Customer Details */}
                  {selectedUser && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-semibold">{selectedUser.companyName || selectedUser.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">Email: {selectedUser.email}</div>
                      <div className="text-sm">
                        Payment Method:{" "}
                        <span className={selectedUser.canPayByInvoice ? "text-blue-600" : "text-green-600"}>
                          {selectedUser.canPayByInvoice ? "Invoice" : "Stripe"}
                        </span>
                      </div>
                      {selectedUser.insuranceExpiry && (
                        <div className="text-sm">
                          Insurance Expiry:{" "}
                          <span
                            className={
                              new Date(selectedUser.insuranceExpiry) < (selectedEndDate || selectedStartDate)
                                ? "text-red-600 font-semibold"
                                : "text-green-600"
                            }
                          >
                            {format(new Date(selectedUser.insuranceExpiry), "dd/MM/yyyy")}
                            {new Date(selectedUser.insuranceExpiry) < (selectedEndDate || selectedStartDate) &&
                              " (EXPIRED)"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Furniture Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tables Requested</Label>
                      <Select value={tablesRequested.toString()} onValueChange={(v) => setTablesRequested(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Chairs Requested</Label>
                      <Select value={chairsRequested.toString()} onValueChange={(v) => setChairsRequested(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cost Preview */}
                  {costPreview && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">Cost Breakdown</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Weekdays: {costPreview.weekdayCount} × ${costPreview.pricePerDay}</div>
                        <div>Weekends: {costPreview.weekendCount} × ${costPreview.weekendPricePerDay || costPreview.pricePerDay}</div>
                        <div>Rent Subtotal: ${costPreview.totalAmount.toFixed(2)}</div>
                        {costPreview.outgoingsPerDay > 0 && (
                          <div>Outgoings: {costPreview.weekdayCount + costPreview.weekendCount} days × ${costPreview.outgoingsPerDay}/day = ${(costPreview.outgoingsPerDay * (costPreview.weekdayCount + costPreview.weekendCount)).toFixed(2)}</div>
                        )}
                        <div>GST ({costPreview.gstPercentage}%): ${((costPreview.totalAmount + costPreview.outgoingsPerDay * (costPreview.weekdayCount + costPreview.weekendCount)) * costPreview.gstPercentage / 100).toFixed(2)}</div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="font-semibold text-lg">
                          Calculated Total: ${(costPreview.totalAmount + costPreview.outgoingsPerDay * (costPreview.weekdayCount + costPreview.weekendCount)).toFixed(2)} + GST
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Override Amount */}
                  <div>
                    <Label>Override Amount (leave blank to use calculated)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={overrideAmount}
                        onChange={(e) => setOverrideAmount(e.target.value)}
                        placeholder={costPreview?.totalAmount.toFixed(2)}
                        className="max-w-[200px]"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label>Payment Method</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value as "stripe" | "invoice")}
                      disabled={costPreview?.paymentMode === "invoice_only"}
                    >
                      <option value="stripe">Stripe</option>
                      <option value="invoice">Invoice</option>
                    </select>
                    {costPreview?.paymentMode && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Info className="h-3 w-3 inline mr-1" />
                        Centre payment mode: {costPreview.paymentMode === "invoice_only" ? "Invoice Only" : costPreview.paymentMode === "stripe_with_exceptions" ? "Stripe with Invoice Exceptions" : "Stripe"}
                      </p>
                    )}
                  </div>

                  {/* Admin Comments */}
                  <div>
                    <Label>Internal Admin Comments</Label>
                    <Textarea
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      placeholder="Internal notes (not shown on invoices/emails)..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="h-3 w-3 inline mr-1" />
                      These comments are for internal use only and will never appear on customer communications.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold mb-2">Booking Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Centre: {selectedCentre?.name}</div>
                      <div>Site: {availabilityData?.sites.find((s) => s.id === selectedSiteId)?.siteNumber}</div>
                      <div>
                        Dates: {format(selectedStartDate, "dd/MM/yyyy")} -{" "}
                        {selectedEndDate ? format(selectedEndDate, "dd/MM/yyyy") : "TBD"}
                      </div>
                      <div>Customer: {selectedUser?.companyName || selectedUser?.name || "Not selected"}</div>
                      <div>Tables: {tablesRequested}</div>
                      <div>Chairs: {chairsRequested}</div>
                      <div className="col-span-2 font-semibold text-lg pt-2 border-t">
                        Final Amount: ${finalAmount.toFixed(2)} + GST
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={
                        !selectedUserId ||
                        !selectedEndDate ||
                        (overlaps && overlaps.length > 0) ||
                        createBookingMutation.isPending
                      }
                      className="flex-1"
                    >
                      Review & Confirm Booking
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSiteId(null);
                        setSelectedStartDate(null);
                        setSelectedEndDate(null);
                        setSelectedUserId(null);
                        setOverrideAmount("");
                        setAdminComments("");
                      }}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div><strong>Centre:</strong> {selectedCentre?.name}</div>
                <div><strong>Site:</strong> {availabilityData?.sites.find((s) => s.id === selectedSiteId)?.siteNumber}</div>
                <div>
                  <strong>Dates:</strong> {selectedStartDate && format(selectedStartDate, "dd/MM/yyyy")} -{" "}
                  {selectedEndDate && format(selectedEndDate, "dd/MM/yyyy")}
                </div>
                <div><strong>Customer:</strong> {selectedUser?.companyName || selectedUser?.name}</div>
                <div><strong>Email:</strong> {selectedUser?.email}</div>
                <div><strong>Tables/Chairs:</strong> {tablesRequested} / {chairsRequested}</div>
                <div><strong>Payment:</strong> {selectedPaymentMethod === "invoice" ? "Invoice" : "Stripe"}</div>
                <div className="pt-2 border-t font-semibold text-lg">
                  <strong>Total:</strong> ${finalAmount.toFixed(2)} + GST
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This will create the booking, send a confirmation email to the customer, and generate an invoice.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmBooking} disabled={createBookingMutation.isPending}>
                {createBookingMutation.isPending ? "Creating..." : "Confirm & Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Booking Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingBookingId(null);
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Booking
              </DialogTitle>
            </DialogHeader>
            {editingBookingId && (
              <EditBookingContent
                bookingId={editingBookingId}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                onSave={() => {
                  updateBookingMutation.mutate({
                    bookingId: editingBookingId,
                    startDate: editFormData.startDate || undefined,
                    endDate: editFormData.endDate || undefined,
                    tablesRequested: editFormData.tablesRequested,
                    chairsRequested: editFormData.chairsRequested,
                    totalAmount: editFormData.totalAmount ? parseFloat(editFormData.totalAmount) : undefined,
                    adminComments: editFormData.adminComments || undefined,
                  });
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setShowCancelDialog(true);
                }}
                isPending={updateBookingMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Booking Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={(open) => {
          setShowCancelDialog(open);
          if (!open) {
            setEditingBookingId(null);
            setCancelReason("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Cancel Booking
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              <div>
                <Label>Cancellation Reason (optional)</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (editingBookingId) {
                    cancelBookingMutation.mutate({
                      bookingId: editingBookingId,
                      reason: cancelReason || undefined,
                    });
                  }
                }}
                disabled={cancelBookingMutation.isPending}
              >
                {cancelBookingMutation.isPending ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// Separate component for edit booking content to handle data fetching
function EditBookingContent({
  bookingId,
  editFormData,
  setEditFormData,
  onSave,
  onCancel,
  isPending,
}: {
  bookingId: number;
  editFormData: { tablesRequested: number; chairsRequested: number; totalAmount: string; adminComments: string; startDate: Date | null; endDate: Date | null };
  setEditFormData: React.Dispatch<React.SetStateAction<typeof editFormData>>;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [datesChanged, setDatesChanged] = useState(false);
  const { data: bookingDetails, isLoading, refetch: refetchDetails } = trpc.adminBooking.getBookingDetails.useQuery({ bookingId });
  const { data: statusHistory, refetch: refetchHistory } = trpc.adminBooking.getStatusHistory.useQuery({ bookingId });
  const utils = trpc.useUtils();

  const convertToInvoiceMutation = trpc.adminBooking.convertToInvoice.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} converted to invoice payment.`);
      refetchDetails();
      refetchHistory();
      utils.adminBooking.getAvailabilityGrid.invalidate();
    },
    onError: (error) => {
      toast.error("Conversion failed: " + error.message);
    },
  });
  
  // Calculate price when dates change
  const { data: calculatedPrice, isLoading: isPriceLoading } = trpc.adminBooking.calculatePrice.useQuery(
    {
      siteId: bookingDetails?.siteId || 0,
      startDate: editFormData.startDate ? format(editFormData.startDate, "yyyy-MM-dd") : "",
      endDate: editFormData.endDate ? format(editFormData.endDate, "yyyy-MM-dd") : "",
    },
    {
      enabled: !!bookingDetails?.siteId && !!editFormData.startDate && !!editFormData.endDate && datesChanged,
    }
  );

  // Initialize form data when booking details load
  useEffect(() => {
    if (bookingDetails) {
      setEditFormData({
        tablesRequested: bookingDetails.tablesRequested || 0,
        chairsRequested: bookingDetails.chairsRequested || 0,
        totalAmount: bookingDetails.totalAmount || "",
        adminComments: bookingDetails.adminComments || "",
        startDate: new Date(bookingDetails.startDate),
        endDate: new Date(bookingDetails.endDate),
      });
    }
  }, [bookingDetails, setEditFormData]);

  if (isLoading) {
    return <div className="py-8 text-center">Loading booking details...</div>;
  }

  if (!bookingDetails) {
    return <div className="py-8 text-center text-red-500">Booking not found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Booking Info */}
      <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
        <div><strong>Booking #:</strong> {bookingDetails.bookingNumber}</div>
        <div><strong>Centre:</strong> {bookingDetails.centreName}</div>
        <div><strong>Site:</strong> {bookingDetails.siteNumber}</div>
        <div><strong>Customer:</strong> {bookingDetails.companyName || bookingDetails.customerName}</div>
        <div><strong>Status:</strong> <span className={cn(
          "px-2 py-0.5 rounded text-xs font-medium",
          bookingDetails.status === "confirmed" && "bg-green-100 text-green-800",
          bookingDetails.status === "cancelled" && "bg-red-100 text-red-800",
          bookingDetails.status === "pending" && "bg-yellow-100 text-yellow-800"
        )}>{bookingDetails.status}</span></div>
        <div className="flex items-center gap-2">
          <strong>Payment:</strong>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            bookingDetails.paymentMethod === "stripe" && "bg-blue-100 text-blue-800",
            bookingDetails.paymentMethod === "invoice" && "bg-amber-100 text-amber-800"
          )}>{bookingDetails.paymentMethod === "stripe" ? "STRIPE" : "INVOICE"}</span>
          {bookingDetails.paidAt && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">PAID</span>}
          {!bookingDetails.paidAt && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">UNPAID</span>}
        </div>
        {bookingDetails.status === "confirmed" && bookingDetails.paymentMethod === "stripe" && !bookingDetails.paidAt && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => convertToInvoiceMutation.mutate({ bookingId })}
              disabled={convertToInvoiceMutation.isPending}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              {convertToInvoiceMutation.isPending ? "Converting..." : "Convert to Invoice"}
            </Button>
          </div>
        )}
      </div>

      {/* Editable Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !editFormData.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {editFormData.startDate ? format(editFormData.startDate, "dd/MM/yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={editFormData.startDate || undefined}
                onSelect={(date) => {
                  if (date) {
                    setEditFormData(prev => ({
                      ...prev,
                      startDate: date,
                      // If end date is before new start date, update it
                      endDate: prev.endDate && prev.endDate < date ? date : prev.endDate
                    }));
                    setDatesChanged(true);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !editFormData.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {editFormData.endDate ? format(editFormData.endDate, "dd/MM/yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={editFormData.endDate || undefined}
                onSelect={(date) => {
                  if (date) {
                    setEditFormData(prev => ({
                      ...prev,
                      endDate: date,
                      // If start date is after new end date, update it
                      startDate: prev.startDate && prev.startDate > date ? date : prev.startDate
                    }));
                    setDatesChanged(true);
                  }
                }}
                disabled={(date) => editFormData.startDate ? date < editFormData.startDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Status History Timeline */}
      {statusHistory && statusHistory.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status History
          </h4>
          <div className="space-y-2">
            {statusHistory.map((entry, idx) => (
              <div key={entry.id} className="flex items-start gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    entry.newStatus === "confirmed" && "bg-green-500",
                    entry.newStatus === "rejected" && "bg-red-500",
                    entry.newStatus === "cancelled" && "bg-gray-500",
                    entry.newStatus === "pending" && "bg-yellow-500",
                    entry.newStatus === "completed" && "bg-blue-500"
                  )} />
                  {idx < statusHistory.length - 1 && <div className="w-0.5 h-8 bg-gray-300" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-medium",
                      entry.newStatus === "confirmed" && "bg-green-100 text-green-800",
                      entry.newStatus === "rejected" && "bg-red-100 text-red-800",
                      entry.newStatus === "cancelled" && "bg-gray-100 text-gray-800",
                      entry.newStatus === "pending" && "bg-yellow-100 text-yellow-800",
                      entry.newStatus === "completed" && "bg-blue-100 text-blue-800"
                    )}>
                      {entry.previousStatus ? `${entry.previousStatus} → ` : ""}{entry.newStatus}
                    </span>
                    <span className="text-gray-500">
                      {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    {entry.changedByName && <span>by {entry.changedByName}</span>}
                    {entry.reason && <span className="ml-1">- {entry.reason}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tables</Label>
          <Input
            type="number"
            min={0}
            value={editFormData.tablesRequested}
            onChange={(e) => setEditFormData(prev => ({ ...prev, tablesRequested: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <Label>Chairs</Label>
          <Input
            type="number"
            min={0}
            value={editFormData.chairsRequested}
            onChange={(e) => setEditFormData(prev => ({ ...prev, chairsRequested: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {/* Price Calculation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Total Amount ($)</Label>
          {datesChanged && calculatedPrice && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
            >
              {showPriceBreakdown ? "Hide breakdown" : "Show breakdown"}
            </Button>
          )}
        </div>
        
        {/* Show calculated price when dates changed */}
        {datesChanged && calculatedPrice && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-800">Calculated Price:</span>
              <span className="font-bold text-blue-900">${calculatedPrice.baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-blue-700">
              <span>+ GST ({calculatedPrice.gstRate}%):</span>
              <span>${calculatedPrice.gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-blue-200 pt-2">
              <span className="font-semibold text-blue-900">Total (inc. GST):</span>
              <span className="font-bold text-blue-900">${calculatedPrice.totalWithGst.toFixed(2)}</span>
            </div>
            
            {showPriceBreakdown && (
              <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-700 space-y-1">
                <div><strong>Duration:</strong> {calculatedPrice.totalDays} days ({calculatedPrice.weekdayCount} weekdays, {calculatedPrice.weekendCount} weekend days)</div>
                {calculatedPrice.weeks > 0 && (
                  <div><strong>Weekly rate applied:</strong> {calculatedPrice.weeks} week(s) + {calculatedPrice.remainingDays} day(s)</div>
                )}
                <div><strong>Site rates:</strong> ${calculatedPrice.dailyRate}/day, ${calculatedPrice.weeklyRate}/week</div>
                {calculatedPrice.weekendRate && <div><strong>Weekend rate:</strong> ${calculatedPrice.weekendRate}/day</div>}
              </div>
            )}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setEditFormData(prev => ({ ...prev, totalAmount: calculatedPrice.baseAmount.toFixed(2) }))}
            >
              Apply calculated price (${calculatedPrice.baseAmount.toFixed(2)})
            </Button>
          </div>
        )}
        
        {isPriceLoading && datesChanged && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            Calculating price...
          </div>
        )}
        
        <Input
          type="number"
          step="0.01"
          min={0}
          value={editFormData.totalAmount}
          onChange={(e) => setEditFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
          placeholder={bookingDetails.totalAmount}
        />
        <p className="text-xs text-muted-foreground">
          {datesChanged 
            ? "Enter amount manually or click 'Apply calculated price' above" 
            : "Leave empty to keep current amount"}
        </p>
      </div>

      <div>
        <Label>Admin Comments</Label>
        <Textarea
          value={editFormData.adminComments}
          onChange={(e) => setEditFormData(prev => ({ ...prev, adminComments: e.target.value }))}
          placeholder="Internal notes (not visible to customer)..."
          rows={3}
        />
      </div>

      <DialogFooter className="flex gap-2">
        <Button variant="destructive" onClick={onCancel} className="mr-auto">
          <Trash2 className="h-4 w-4 mr-2" />
          Cancel Booking
        </Button>
        <Button variant="outline" onClick={() => setEditFormData(prev => ({ ...prev }))}>
          Close
        </Button>
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}
