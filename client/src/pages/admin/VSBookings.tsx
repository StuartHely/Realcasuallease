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
import { CheckCircle, XCircle, Clock, Calendar, DollarSign, User, MapPin, Search, X, Store } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type BookingStatus = "all" | "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

export default function VSBookings() {
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>("pending");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookings, isLoading, refetch } = trpc.vacantShopBookings.list.useQuery({
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });

  // Fetch all bookings to calculate counts for each status
  const { data: allBookings } = trpc.vacantShopBookings.list.useQuery({
    status: undefined,
  });

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    if (!allBookings) return { all: 0, pending: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0 };
    
    return {
      all: allBookings.length,
      pending: allBookings.filter(b => b.status === 'pending').length,
      confirmed: allBookings.filter(b => b.status === 'confirmed').length,
      rejected: allBookings.filter(b => b.status === 'rejected').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
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

  const approveMutation = trpc.vacantShopBookings.updateStatus.useMutation({
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

  const rejectMutation = trpc.vacantShopBookings.updateStatus.useMutation({
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
      approveMutation.mutate({ id: selectedBookingId, status: "confirmed" });
    }
  };

  const confirmReject = () => {
    if (selectedBookingId) {
      rejectMutation.mutate({ 
        id: selectedBookingId,
        status: "rejected",
        rejectionReason: rejectionReason || "No reason provided",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: typeof Clock, label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      confirmed: { variant: "default", icon: CheckCircle, label: "Confirmed" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
      completed: { variant: "outline", icon: CheckCircle, label: "Completed" },
    };

    const config = variants[status] || variants.pending;
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Store className="h-8 w-8" />
              VS Booking Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage Vacant Shop booking requests
            </p>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by booking number or customer..."
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
            <TabsTrigger value="rejected">
              <XCircle className="h-4 w-4 mr-2" />
              Rejected
              <span className="ml-1.5 text-xs opacity-70">({statusCounts.rejected})</span>
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
            <TabsTrigger value="all">
              All Bookings
              <span className="ml-1.5 text-xs opacity-70">({statusCounts.all})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{selectedStatus === "all" ? "All" : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} VS Bookings</CardTitle>
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
                          <TableHead>Vacant Shop</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
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
                                  <div className="font-medium">{booking.customerName || "N/A"}</div>
                                  <div className="text-sm text-muted-foreground">{booking.customerEmail || "N/A"}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-green-600" />
                                <div>
                                  <div className="font-medium">{booking.shopName || `Shop #${booking.vacantShopId}`}</div>
                                  <div className="text-sm text-muted-foreground">{booking.centreName || "N/A"}</div>
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
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
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
                Are you sure you want to approve this Vacant Shop booking? The customer will be notified.
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
                Please provide a reason for rejecting this booking. The customer will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmReject} 
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
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
