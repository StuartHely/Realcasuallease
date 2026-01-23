import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addMonths, subMonths } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Building2, User, DollarSign, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminBooking() {
  // State for form
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [tablesRequested, setTablesRequested] = useState(0);
  const [chairsRequested, setChairsRequested] = useState(0);
  const [invoiceOverride, setInvoiceOverride] = useState(false);
  const [adminComments, setAdminComments] = useState("");
  const [overrideAmount, setOverrideAmount] = useState<string>("");
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  const createBookingMutation = trpc.adminBooking.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} created successfully!`);
      // Reset form
      setSelectedSiteId(null);
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setSelectedUserId(null);
      setTablesRequested(0);
      setChairsRequested(0);
      setInvoiceOverride(false);
      setAdminComments("");
      setOverrideAmount("");
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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
    return availabilityData.bookings.find(
      (b) =>
        b.siteId === siteId &&
        isWithinInterval(day, { start: new Date(b.startDate), end: new Date(b.endDate) })
    );
  };

  // Check if day is in selected range
  const isInSelectedRange = (day: Date) => {
    if (!selectedStartDate) return false;
    if (!selectedEndDate) return isSameDay(day, selectedStartDate);
    return isWithinInterval(day, { start: selectedStartDate, end: selectedEndDate });
  };

  // Handle day click for date selection
  const handleDayClick = (siteId: number, day: Date) => {
    const booking = getBookingForDay(siteId, day);
    if (booking) return; // Can't select booked days

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
      invoiceOverride,
      adminComments: adminComments || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Booking</h1>
          <p className="text-muted-foreground">Create bookings on behalf of customers</p>
        </div>

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
                        <div>Subtotal: ${costPreview.totalAmount.toFixed(2)}</div>
                        <div>GST ({costPreview.gstPercentage}%): ${costPreview.gstAmount.toFixed(2)}</div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="font-semibold text-lg">
                          Calculated Total: ${costPreview.totalAmount.toFixed(2)} + GST
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

                  {/* Invoice Override */}
                  {selectedUser && !selectedUser.canPayByInvoice && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="invoiceOverride"
                        checked={invoiceOverride}
                        onCheckedChange={(checked) => setInvoiceOverride(!!checked)}
                      />
                      <Label htmlFor="invoiceOverride" className="cursor-pointer">
                        Override to Invoice (for phone requests or $0 admin blocks)
                      </Label>
                    </div>
                  )}

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
                <div><strong>Payment:</strong> {invoiceOverride || selectedUser?.canPayByInvoice ? "Invoice" : "Stripe"}</div>
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
      </div>
    </DashboardLayout>
  );
}
