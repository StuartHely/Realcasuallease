import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Calendar, MapPin, User, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function PendingApprovals() {
  const { data: pendingBookings, isLoading, refetch } = trpc.admin.getPendingApprovals.useQuery();
  const approveBookingMutation = trpc.admin.approveBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking approved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to approve booking: " + error.message);
    },
  });

  const rejectBookingMutation = trpc.admin.rejectBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking rejected successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to reject booking: " + error.message);
    },
  });

  const handleApprove = (bookingId: number) => {
    if (confirm("Are you sure you want to approve this booking?")) {
      approveBookingMutation.mutate({ bookingId });
    }
  };

  const handleReject = (bookingId: number) => {
    if (confirm("Are you sure you want to reject this booking? This action cannot be undone.")) {
      rejectBookingMutation.mutate({ bookingId });
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading pending approvals...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve or reject bookings that require manual approval
          </p>
        </div>

      {!pendingBookings || pendingBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No pending approvals at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingBookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      Booking {booking.bookingNumber}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Submitted on {formatDate(booking.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    PENDING APPROVAL
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column: Booking Details */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">{booking.centreName}</p>
                        <p className="text-sm text-gray-600">Site {booking.siteNumber}</p>
                        {booking.siteDescription && (
                          <p className="text-sm text-gray-500">{booking.siteDescription}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Booking Period</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Customer</p>
                        <p className="text-sm text-gray-600">{booking.customerName}</p>
                        {booking.customerEmail && (
                          <p className="text-sm text-gray-500">{booking.customerEmail}</p>
                        )}
                      </div>
                    </div>

                    {booking.usageTypeName && (
                      <div>
                        <p className="font-semibold text-gray-900">Usage Type</p>
                        <p className="text-sm text-gray-600">{booking.usageTypeName}</p>
                        {booking.customUsage && (
                          <p className="text-sm text-gray-500 italic">{booking.customUsage}</p>
                        )}
                      </div>
                    )}

                    {((booking.tablesRequested && booking.tablesRequested > 0) || (booking.chairsRequested && booking.chairsRequested > 0)) && (
                      <div>
                        <p className="font-semibold text-gray-900">Equipment Request</p>
                        <p className="text-sm text-gray-600">
                          {booking.tablesRequested && booking.tablesRequested > 0 && `${booking.tablesRequested} tables`}
                          {booking.tablesRequested && booking.tablesRequested > 0 && booking.chairsRequested && booking.chairsRequested > 0 && ", "}
                          {booking.chairsRequested && booking.chairsRequested > 0 && `${booking.chairsRequested} chairs`}
                        </p>
                      </div>
                    )}

                    {booking.approvalReason && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-semibold text-amber-900">Approval Reason</p>
                        <p className="text-sm text-amber-700">
                          {booking.approvalReason}
                          {booking.insuranceExpired && (
                            <span className="block mt-1 text-xs">
                              Customer's insurance expires before booking end date
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial & Actions */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Payment Details</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Subtotal: ${(Number(booking.totalAmount) - Number(booking.gstAmount)).toFixed(2)}</p>
                          <p>GST: ${Number(booking.gstAmount).toFixed(2)}</p>
                          <p className="font-semibold text-gray-900">
                            Total: ${Number(booking.totalAmount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t flex gap-3">
                      <Button
                        onClick={() => handleApprove(booking.id)}
                        disabled={approveBookingMutation.isPending || rejectBookingMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(booking.id)}
                        disabled={approveBookingMutation.isPending || rejectBookingMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
