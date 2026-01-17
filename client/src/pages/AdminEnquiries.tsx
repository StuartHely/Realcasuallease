import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminEnquiries() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<"vs" | "3rdl">("vs");
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch pending VS bookings
  const { data: vsBookings, refetch: refetchVS } =
    trpc.vacantShopBookings.list.useQuery({ status: "pending" });

  // Fetch pending 3rdL bookings
  const { data: thirdLineBookings, refetch: refetch3rdL } =
    trpc.thirdLineBookings.list.useQuery({ status: "pending" });

  // Approve VS booking
  const approveVSMutation = trpc.vacantShopBookings.updateStatus.useMutation({
    onSuccess: () => {
      console.log({
        title: "Success",
        description: "Vacant Shop booking approved",
      });
      refetchVS();
      setSelectedEnquiry(null);
    },
    onError: (error) => {
      console.log({
        title: "Error",
        description: error.message || "Failed to approve booking",
        variant: "destructive",
      });
    },
  });

  // Reject VS booking
  const rejectVSMutation = trpc.vacantShopBookings.updateStatus.useMutation({
    onSuccess: () => {
      console.log({
        title: "Success",
        description: "Vacant Shop booking rejected",
      });
      refetchVS();
      setSelectedEnquiry(null);
      setRejectionReason("");
    },
    onError: (error) => {
      console.log({
        title: "Error",
        description: error.message || "Failed to reject booking",
        variant: "destructive",
      });
    },
  });

  // Approve 3rdL booking
  const approve3rdLMutation = trpc.thirdLineBookings.updateStatus.useMutation({
    onSuccess: () => {
      console.log({
        title: "Success",
        description: "Third Line booking approved",
      });
      refetch3rdL();
      setSelectedEnquiry(null);
    },
    onError: (error) => {
      console.log({
        title: "Error",
        description: error.message || "Failed to approve booking",
        variant: "destructive",
      });
    },
  });

  // Reject 3rdL booking
  const reject3rdLMutation = trpc.thirdLineBookings.updateStatus.useMutation({
    onSuccess: () => {
      console.log({
        title: "Success",
        description: "Third Line booking rejected",
      });
      refetch3rdL();
      setSelectedEnquiry(null);
      setRejectionReason("");
    },
    onError: (error) => {
      console.log({
        title: "Error",
        description: error.message || "Failed to reject booking",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!selectedEnquiry) return;

    if (selectedTab === "vs") {
      approveVSMutation.mutate({
        id: selectedEnquiry.id,
        status: "confirmed",
      });
    } else {
      approve3rdLMutation.mutate({
        id: selectedEnquiry.id,
        status: "confirmed",
      });
    }
  };

  const handleReject = () => {
    if (!selectedEnquiry || !rejectionReason.trim()) {
      console.log({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    if (selectedTab === "vs") {
      rejectVSMutation.mutate({
        id: selectedEnquiry.id,
        status: "rejected",
        rejectionReason,
      });
    } else {
      reject3rdLMutation.mutate({
        id: selectedEnquiry.id,
        status: "rejected",
        rejectionReason,
      });
    }
  };

  // Check if user is admin
  if (!user || !["owner_super_admin", "mega_admin"].includes(user.role)) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage Enquiries</h1>
        <p className="text-gray-600">
          Review and approve or reject pending VS and 3rdL enquiries
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "vs" | "3rdl")}>
        <TabsList>
          <TabsTrigger value="vs">
            Vacant Shops ({vsBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="3rdl">
            Third Line Income ({thirdLineBookings?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vs" className="mt-6">
          {vsBookings && vsBookings.length > 0 ? (
            <div className="grid gap-4">
              {vsBookings.map((booking: any) => (
                <Card key={booking.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Booking #{booking.bookingNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {booking.customerEmail}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-medium">
                        {new Date(booking.startDate).toLocaleDateString(
                          "en-AU"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">End Date</p>
                      <p className="font-medium">
                        {new Date(booking.endDate).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-medium">
                        ${Number(booking.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payment Method</p>
                      <p className="font-medium capitalize">
                        {booking.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {booking.customerNotes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Customer Notes</p>
                      <p className="text-sm">{booking.customerNotes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedEnquiry(booking);
                        setIsDialogOpen(true);
                      }}
                      variant="default"
                      size="sm"
                    >
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No pending Vacant Shop enquiries</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="3rdl" className="mt-6">
          {thirdLineBookings && thirdLineBookings.length > 0 ? (
            <div className="grid gap-4">
              {thirdLineBookings.map((booking: any) => (
                <Card key={booking.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Booking #{booking.bookingNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {booking.customerEmail}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-medium">
                        {new Date(booking.startDate).toLocaleDateString(
                          "en-AU"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">End Date</p>
                      <p className="font-medium">
                        {new Date(booking.endDate).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-medium">
                        ${Number(booking.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payment Method</p>
                      <p className="font-medium capitalize">
                        {booking.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {booking.customerNotes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Customer Notes</p>
                      <p className="text-sm">{booking.customerNotes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedEnquiry(booking);
                        setIsDialogOpen(true);
                      }}
                      variant="default"
                      size="sm"
                    >
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No pending Third Line enquiries</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Enquiry</DialogTitle>
            <DialogDescription>
              Approve or reject this booking request
            </DialogDescription>
          </DialogHeader>

          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Booking Number</p>
                <p className="font-medium">{selectedEnquiry.bookingNumber}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Customer Email</p>
                <p className="font-medium">{selectedEnquiry.customerEmail}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Dates</p>
                <p className="font-medium">
                  {new Date(selectedEnquiry.startDate).toLocaleDateString(
                    "en-AU"
                  )}{" "}
                  to{" "}
                  {new Date(selectedEnquiry.endDate).toLocaleDateString("en-AU")}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium">
                  ${Number(selectedEnquiry.totalAmount).toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  placeholder="Enter rejection reason if rejecting this booking..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="h-24"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleApprove}
                  variant="default"
                  className="flex-1"
                  disabled={
                    approveVSMutation.isPending || approve3rdLMutation.isPending
                  }
                >
                  Approve
                </Button>
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                  disabled={
                    rejectVSMutation.isPending || reject3rdLMutation.isPending
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
