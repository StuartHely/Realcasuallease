import { useState } from "react";
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
import { CheckCircle, XCircle, Clock, Calendar, DollarSign, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export default function AdminBookings() {
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>("pending");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: bookings, isLoading, refetch } = trpc.bookings.list.useQuery({
    status: selectedStatus,
  });

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

  const getStatusBadge = (status: BookingStatus) => {
    const variants = {
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
      <div>
        <h1 className="text-3xl font-bold">Booking Management</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage booking requests from customers
        </p>
      </div>

      <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as BookingStatus)}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmed
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            <XCircle className="h-4 w-4 mr-2" />
            Cancelled
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Bookings</CardTitle>
              <CardDescription>
                {isLoading ? "Loading bookings..." : `${bookings?.length || 0} booking(s) found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !bookings || bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {selectedStatus} bookings found
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
                        <TableHead>Created</TableHead>
                        {selectedStatus === "pending" && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
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
                          <TableCell>{getStatusBadge(booking.status as BookingStatus)}</TableCell>
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
