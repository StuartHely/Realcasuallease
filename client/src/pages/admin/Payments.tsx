import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, CheckCircle, DollarSign, Calendar, Building2, User } from "lucide-react";

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Only search when searchTerm is set
  const { data: searchResults = [], isLoading: isSearching } = trpc.admin.searchInvoiceBookings.useQuery(
    { query: searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  const recordPaymentMutation = trpc.admin.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      // Clear search
      setSearchQuery("");
      setSearchTerm("");
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a booking number or company name");
      return;
    }
    setSearchTerm(searchQuery);
  };

  const handleRecordPayment = async (bookingId: number) => {
    if (!confirm("Are you sure you want to mark this booking as paid? This will trigger payment splits.")) {
      return;
    }

    await recordPaymentMutation.mutateAsync({ bookingId });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Record Invoice Payments</h1>
          <p className="text-muted-foreground mt-2">
            Search for invoice bookings by booking number or company name, then mark them as paid
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Invoice Bookings</CardTitle>
            <CardDescription>
              Enter a booking number (e.g., "CampbelltownMall-20260115-001") or company name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by booking number or company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Found {searchResults.length} {searchResults.length === 1 ? "booking" : "bookings"}
            </h2>

            {searchResults.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        Booking #{booking.bookingNumber}
                      </CardTitle>
                      <CardDescription>
                        {booking.centreName} - Site {booking.siteNumber}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        booking.paidAt
                          ? "default"
                          : booking.status === "confirmed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {booking.paidAt ? "Paid" : booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Customer</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customerName}
                        </p>
                        {booking.customerEmail && (
                          <p className="text-xs text-muted-foreground">
                            {booking.customerEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    {booking.companyName && (
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Company</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.companyName}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Booking Dates</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Total Amount</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(Number(booking.totalAmount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Incl. GST: {formatCurrency(Number(booking.gstAmount))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status */}
                  {booking.paidAt ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <p className="font-medium">Payment Recorded</p>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Paid on {formatDate(booking.paidAt)}
                        {booking.paymentRecordedBy && ` by ${booking.paymentRecordedBy}`}
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleRecordPayment(booking.id)}
                        disabled={recordPaymentMutation.isPending}
                        size="lg"
                      >
                        {recordPaymentMutation.isPending ? "Recording..." : "Mark as Paid"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
