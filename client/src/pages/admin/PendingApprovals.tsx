import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Calendar, MapPin, User, DollarSign, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { InsuranceStatusDisplay, INSURANCE_REJECTION_TEMPLATES } from "@/components/InsuranceStatusDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function PendingApprovals() {
  const [, setLocation] = useLocation();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
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

  const rejectBookingMutation = trpc.bookings.reject.useMutation({
    onSuccess: () => {
      toast.success("Booking rejected and customer notified");
      refetch();
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedTemplate("");
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
    setSelectedBookingId(bookingId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!selectedBookingId) return;
    
    const finalReason = selectedTemplate || rejectionReason;
    
    if (!finalReason.trim()) {
      toast.error("Please select a template or enter a rejection reason");
      return;
    }
    
    rejectBookingMutation.mutate({ 
      bookingId: selectedBookingId,
      reason: finalReason
    });
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
          <h1 className="text-3xl font-bold">Pending Confirmation - Requiring Manual Review</h1>
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
                {/* Insurance Status */}
                <InsuranceStatusDisplay
                  insuranceScan={booking.insuranceScan}
                  insuranceValidation={booking.insuranceValidation}
                  insuranceDocumentUrl={booking.insuranceDocumentUrl}
                />

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
                        <button
                          onClick={() => setLocation(`/admin/customer/${booking.customerId}`)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {booking.customerName}
                          <ExternalLink className="h-3 w-3" />
                        </button>
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

                    <div>
                      <p className="font-semibold text-gray-900">Equipment Request</p>
                      <p className="text-sm text-gray-600">
                        {booking.tablesRequested ?? 0} tables, {booking.chairsRequested ?? 0} chairs
                      </p>
                    </div>

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

      {/* Rejection Dialog with Templates */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Select a template reason or write a custom message to send to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quick Templates (Click to select)</Label>
              <RadioGroup value={selectedTemplate} onValueChange={(value) => {
                setSelectedTemplate(value);
                setRejectionReason(""); // Clear custom text when template selected
              }}>
                {INSURANCE_REJECTION_TEMPLATES.map((template, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <RadioGroupItem value={template} id={`template-${idx}`} />
                    <Label 
                      htmlFor={`template-${idx}`} 
                      className="cursor-pointer text-sm leading-relaxed font-normal"
                    >
                      {template}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Or Write Custom Reason</Label>
              <Textarea
                id="custom-reason"
                placeholder="Enter a custom rejection reason..."
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setSelectedTemplate(""); // Clear template when typing
                }}
                rows={4}
              />
            </div>
            
            {(selectedTemplate || rejectionReason) && (
              <div className="p-3 bg-gray-50 rounded text-sm">
                <p className="font-semibold mb-1">Customer will receive:</p>
                <p className="text-gray-700">{selectedTemplate || rejectionReason}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={!selectedTemplate && !rejectionReason.trim()}
            >
              Send Rejection Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </AdminLayout>
  );
}
