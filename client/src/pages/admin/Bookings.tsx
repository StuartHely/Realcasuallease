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
import { CheckCircle, XCircle, Clock, Calendar, DollarSign, User, MapPin, Search, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type BookingStatus = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "unpaid";

export default function AdminBookings() {
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
    if (!allBookings) return { all: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0, unpaid: 0 };
    
    return {
      all: allBookings.length,
      pending: allBookings.filter(b => b.status === 'pending').length,
      confirmed: allBookings.filter(b => b.status === 'confirmed').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      unpaid: allBookings.filter(b => b.paymentMethod === 'invoice' && !b.paidAt).length,
    };
  }, [allBookings]);

  // Filter bookings based on search query
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!searchQuery.trim()) return bookings;

    const query = searchQuery.toLowerCase().trim();
    return bookings.filter((booking) => {
      const bookingNumber = booking.bookingNumber?.toLowerCase() || "";
      const customerName = booking.customerName?.toLowerCase() || "";
      const customerEmail = booking.customerEmail?.toLowerCase() || "";
      
      return bookingNumber.includes(query) || 
             customerName.includes(query) ||
             customerEmail.includes(query);
    });
  }, [bookings, searchQuery]);

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
      cancelled: { variant: "destructive" as const, icon: XCircle, label: "Cancelled" },
      completed: { variant: "outline" as const, icon: CheckCircle, label: "Completed" },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
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
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by booking number or customer name..."
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
      </div>

      <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as BookingStatus)}>
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
                        <TableHead>Booking #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        {selectedStatus === "unpaid" && <TableHead>Due Date</TableHead>}
                        <TableHead>Created</TableHead>
                        {selectedStatus === "pending" && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{booking.customerName}</div>
                                <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{booking.siteName}</div>
                                <div className="text-sm text-muted-foreground">{booking.centreName}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div className="text-sm">
                                <div>{format(new Date(booking.startDate), "MMM d, yyyy")}</div>
                                <div className="text-muted-foreground">
                                  to {format(new Date(booking.endDate), "MMM d, yyyy")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <div className="font-medium">${booking.totalAmount}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(booking.status as BookingStatus)}
                              {booking.paymentMethod === 'invoice' && !booking.paidAt && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600 w-fit">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Unpaid Invoice
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {selectedStatus === "unpaid" && (
                            <TableCell>
                              {booking.paymentDueDate ? (
                                <div className="text-sm">
                                  {(() => {
                                    const dueDate = new Date(booking.paymentDueDate);
                                    const today = new Date();
                                    const isOverdue = dueDate < today;
                                    const daysOverdue = isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                    
                                    return (
                                      <div className={isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                                        <div>{format(dueDate, "MMM d, yyyy")}</div>
                                        {isOverdue && (
                                          <div className="text-xs mt-0.5">
                                            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(booking.createdAt), "MMM d, yyyy")}
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
                      ))}
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
