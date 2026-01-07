import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import { toast } from "sonner";

export default function OwnerApprovals() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedBooking, setSelectedBooking] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch pending bookings
  const { data: bookings, isLoading, refetch } = trpc.bookings.getPendingApprovals.useQuery({
    status: statusFilter as "pending" | "confirmed" | "rejected" | "all",
  });

  // Approve booking mutation
  const approveMutation = trpc.bookings.approve.useMutation({
    onSuccess: () => {
      toast.success("Booking approved successfully");
      refetch();
      setSelectedBooking(null);
      setActionType(null);
    },
    onError: (error) => {
      toast.error(`Failed to approve booking: ${error.message}`);
    },
  });

  // Reject booking mutation
  const rejectMutation = trpc.bookings.reject.useMutation({
    onSuccess: () => {
      toast.success("Booking rejected successfully");
      refetch();
      setSelectedBooking(null);
      setActionType(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to reject booking: ${error.message}`);
    },
  });

  const handleApprove = (bookingId: number) => {
    setSelectedBooking(bookingId);
    setActionType("approve");
  };

  const handleReject = (bookingId: number) => {
    setSelectedBooking(bookingId);
    setActionType("reject");
  };

  const confirmApprove = () => {
    if (selectedBooking) {
      approveMutation.mutate({ bookingId: selectedBooking });
    }
  };

  const confirmReject = () => {
    if (selectedBooking && rejectionReason.trim()) {
      rejectMutation.mutate({ 
        bookingId: selectedBooking, 
        reason: rejectionReason 
      });
    } else {
      toast.error("Please provide a reason for rejection");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Booking Approvals</h1>
        <p className="text-muted-foreground">
          Review and manage booking requests for your shopping centres
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {bookings && bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No bookings found</p>
              <p className="text-sm">There are no bookings matching your filter criteria.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings?.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Booking #{booking.bookingNumber}
                      {getStatusBadge(booking.status)}
                    </CardTitle>
                    <CardDescription>
                      {new Date(booking.createdAt).toLocaleDateString("en-AU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </div>
                  {booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleApprove(booking.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(booking.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{booking.customerName}</p>
                    <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{booking.centreName}</p>
                    <p className="text-sm text-muted-foreground">Site {booking.siteNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dates</p>
                    <p className="font-medium">
                      {new Date(booking.startDate).toLocaleDateString("en-AU", { month: "short", day: "numeric" })} - {new Date(booking.endDate).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">${Number(booking.totalAmount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Your share: ${Number(booking.ownerAmount).toFixed(2)}
                    </p>
                  </div>
                </div>

                {booking.categoryName && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Business Category</p>
                    <Badge variant="secondary">{booking.categoryName}</Badge>
                    {booking.additionalCategoryText && (
                      <p className="text-sm mt-2 text-muted-foreground">
                        Additional details: {booking.additionalCategoryText}
                      </p>
                    )}
                  </div>
                )}

                {booking.requiresApproval && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-yellow-600 font-medium">
                      ⚠️ Manual approval required
                    </p>
                  </div>
                )}

                {booking.rejectionReason && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-600">{booking.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this booking? The customer will be notified via email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this booking. The customer will receive this message.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g., Site not available for this category, conflicting booking, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
