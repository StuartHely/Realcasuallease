import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, ArrowLeft, DollarSign, TrendingUp, Star, RefreshCw, CreditCard, XCircle, Repeat } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function MyBookings() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user, isAuthenticated, loading } = useAuth();
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRecurringGroupId, setCancelRecurringGroupId] = useState<string | null>(null);

  const { data: siteBookings, isLoading, refetch } = trpc.bookings.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: vsBookingsRaw, refetch: refetchVs } = trpc.vacantShopBookings.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: tlBookingsRaw, refetch: refetchTl } = trpc.thirdLineBookings.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Handle Stripe return URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const payment = params.get("payment");
    const booking = params.get("booking");
    if (payment === "success" && booking) {
      toast.success(`Payment successful for booking ${booking}!`);
      refetch(); refetchVs(); refetchTl();
      // Clean up URL
      window.history.replaceState({}, "", "/my-bookings");
    } else if (payment === "cancelled" && booking) {
      toast.info(`Payment was cancelled for booking ${booking}. You can pay later from this page.`);
      window.history.replaceState({}, "", "/my-bookings");
    }
  }, [searchString, refetch, refetchVs, refetchTl]);

  const checkoutMutation = trpc.bookings.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error("Payment failed: " + error.message);
    },
  });

  const vsCheckoutMutation = trpc.vacantShopBookings.createCheckoutSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (error) => { toast.error("Payment failed: " + error.message); },
  });

  const tlCheckoutMutation = trpc.thirdLineBookings.createCheckoutSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (error) => { toast.error("Payment failed: " + error.message); },
  });

  const cancelMutation = trpc.bookings.customerCancel.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} has been cancelled.`);
      setCancelBookingId(null);
      setCancelReason("");
      refetch();
    },
    onError: (error) => {
      toast.error("Cancellation failed: " + error.message);
    },
  });

  const vsCancelMutation = trpc.vacantShopBookings.customerCancel.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} has been cancelled.`);
      setCancelBookingId(null);
      setCancelReason("");
      refetchVs();
    },
    onError: (error) => { toast.error("Cancellation failed: " + error.message); },
  });

  const tlCancelMutation = trpc.thirdLineBookings.customerCancel.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking ${data.bookingNumber} has been cancelled.`);
      setCancelBookingId(null);
      setCancelReason("");
      refetchTl();
    },
    onError: (error) => { toast.error("Cancellation failed: " + error.message); },
  });

  const cancelRecurringMutation = trpc.bookings.cancelRecurringFuture.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.cancelled} future recurring bookings cancelled.`);
      setCancelRecurringGroupId(null);
      refetch();
    },
    onError: (error) => { toast.error("Failed to cancel recurring bookings: " + error.message); },
  });

  // Track which booking type is being cancelled
  const [cancelBookingType, setCancelBookingType] = useState<"site" | "vs" | "tl">("site");

  // Unified bookings list combining all booking types
  type UnifiedBooking = {
    id: number;
    bookingNumber: string;
    bookingType: "site" | "vs" | "tl";
    assetLabel: string;
    centreName: string;
    startDate: Date;
    endDate: Date;
    totalAmount: string;
    gstAmount: string;
    status: string;
    requiresApproval: boolean;
    paymentMethod: string;
    paidAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    siteId?: number;
    customUsage?: string | null;
    recurrenceGroupId?: string | null;
  };

  const bookings = useMemo<UnifiedBooking[]>(() => {
    const result: UnifiedBooking[] = [];
    if (siteBookings) {
      for (const b of siteBookings) {
        result.push({
          id: b.id,
          bookingNumber: b.bookingNumber,
          bookingType: "site",
          assetLabel: b.siteName || `Site ${b.siteNumber}`,
          centreName: b.centreName,
          startDate: b.startDate,
          endDate: b.endDate,
          totalAmount: b.totalAmount,
          gstAmount: b.gstAmount,
          status: b.status,
          requiresApproval: b.requiresApproval,
          paymentMethod: b.paymentMethod,
          paidAt: b.paidAt,
          rejectionReason: b.rejectionReason,
          createdAt: b.createdAt,
          siteId: b.siteId,
          customUsage: b.customUsage,
          recurrenceGroupId: b.recurrenceGroupId,
        });
      }
    }
    if (vsBookingsRaw) {
      for (const b of vsBookingsRaw) {
        result.push({
          id: b.id,
          bookingNumber: b.bookingNumber,
          bookingType: "vs",
          assetLabel: `Shop ${b.shopNumber}`,
          centreName: b.centreName,
          startDate: b.startDate,
          endDate: b.endDate,
          totalAmount: b.totalAmount,
          gstAmount: b.gstAmount,
          status: b.status,
          requiresApproval: b.requiresApproval,
          paymentMethod: b.paymentMethod,
          paidAt: b.paidAt,
          rejectionReason: b.rejectionReason,
          createdAt: b.createdAt,
        });
      }
    }
    if (tlBookingsRaw) {
      for (const b of tlBookingsRaw) {
        result.push({
          id: b.id,
          bookingNumber: b.bookingNumber,
          bookingType: "tl",
          assetLabel: `${b.categoryName || "Asset"} ${b.assetNumber}`,
          centreName: b.centreName,
          startDate: b.startDate,
          endDate: b.endDate,
          totalAmount: b.totalAmount,
          gstAmount: b.gstAmount,
          status: b.status,
          requiresApproval: b.requiresApproval,
          paymentMethod: b.paymentMethod,
          paidAt: b.paidAt,
          rejectionReason: b.rejectionReason,
          createdAt: b.createdAt,
        });
      }
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [siteBookings, vsBookingsRaw, tlBookingsRaw]);

  // Calculate analytics from bookings
  const analytics = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return {
        totalSpent: 0,
        averageBookingValue: 0,
        totalBookings: 0,
        favoriteCentres: [],
        recentBookings: [],
      };
    }

    const totalSpent = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const averageBookingValue = totalSpent / bookings.length;
    
    // Count bookings by centre
    const centreCount: Record<string, { name: string; count: number }> = {};
    bookings.forEach((booking) => {
      const centreName = booking.centreName || "Unknown Centre";
      if (!centreCount[centreName]) {
        centreCount[centreName] = { name: centreName, count: 0 };
      }
      centreCount[centreName].count++;
    });

    const favoriteCentres = Object.values(centreCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalSpent,
      averageBookingValue,
      totalBookings: bookings.length,
      favoriteCentres,
      recentBookings,
    };
  }, [bookings]);

  const canCancel = (status: string) =>
    status === "pending" || status === "confirmed";

  const canPay = (booking: { paymentMethod: string; paidAt: Date | null; status: string }) =>
    booking.paymentMethod === "stripe" && !booking.paidAt &&
    (booking.status === "confirmed" || booking.status === "pending");

  const handlePayNow = (booking: UnifiedBooking) => {
    if (booking.bookingType === "vs") {
      vsCheckoutMutation.mutate({ bookingId: booking.id });
    } else if (booking.bookingType === "tl") {
      tlCheckoutMutation.mutate({ bookingId: booking.id });
    } else {
      checkoutMutation.mutate({ bookingId: booking.id });
    }
  };

  const handleCancelClick = (booking: UnifiedBooking) => {
    setCancelBookingId(booking.id);
    setCancelBookingType(booking.bookingType);
  };

  const handleCancelConfirm = () => {
    if (!cancelBookingId) return;
    const payload = { bookingId: cancelBookingId, reason: cancelReason || undefined };
    if (cancelBookingType === "vs") {
      vsCancelMutation.mutate(payload);
    } else if (cancelBookingType === "tl") {
      tlCancelMutation.mutate(payload);
    } else {
      cancelMutation.mutate(payload);
    }
  };

  const isAnyCancelPending = cancelMutation.isPending || vsCancelMutation.isPending || tlCancelMutation.isPending;
  const isAnyCheckoutPending = checkoutMutation.isPending || vsCheckoutMutation.isPending || tlCheckoutMutation.isPending;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Please log in to view your bookings</p>
            <Button onClick={() => (window.location.href = "/login")} className="bg-blue-600 hover:bg-blue-700">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation("/")}
            >
              <img src="/logo.png" alt="Real Casual Leasing" className="h-12" />
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")}>Home</Button>
            <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">My Bookings</h2>
          <p className="text-gray-600">View and manage your space bookings</p>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        )}

        {bookings && bookings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">You don't have any bookings yet.</p>
              <Button onClick={() => setLocation("/")} className="bg-blue-600 hover:bg-blue-700">
                Search for Spaces
              </Button>
            </CardContent>
          </Card>
        )}

        {bookings && bookings.length > 0 && (
          <div className="space-y-8">
            {/* Analytics Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">
                    ${analytics.totalSpent.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Across {analytics.totalBookings} booking{analytics.totalBookings !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Average Booking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">
                    ${analytics.averageBookingValue.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Per booking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Favorite Centre
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-900 truncate">
                    {analytics.favoriteCentres[0]?.name || "N/A"}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {analytics.favoriteCentres[0]?.count || 0} booking{analytics.favoriteCentres[0]?.count !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Favorite Centres */}
            {analytics.favoriteCentres.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Your Favorite Centres
                  </CardTitle>
                  <CardDescription>
                    Shopping centres you've booked most frequently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.favoriteCentres.map((centre, index) => (
                      <div key={centre.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{centre.name}</p>
                            <p className="text-sm text-gray-500">{centre.count} booking{centre.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/search?query=${encodeURIComponent(centre.name)}`)}
                        >
                          Book Again
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Bookings */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">All Bookings</h3>
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
                    confirmed: "bg-green-100 text-green-800 border-green-200",
                    cancelled: "bg-red-100 text-red-800 border-red-200",
                    completed: "bg-blue-100 text-blue-800 border-blue-200",
                    rejected: "bg-red-100 text-red-800 border-red-200",
                  };

                  const typeLabel = booking.bookingType === "vs" ? "Vacant Shop" : booking.bookingType === "tl" ? "Third Line" : "";

                  return (
                    <Card key={`${booking.bookingType}-${booking.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              Booking {booking.bookingNumber}
                              <Badge variant="outline" className={statusColors[booking.status] || ""}>
                                {booking.status.toUpperCase()}
                              </Badge>
                              {typeLabel && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                  {typeLabel.toUpperCase()}
                                </Badge>
                              )}
                              {booking.paymentMethod === "stripe" && booking.paidAt && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                  PAID
                                </Badge>
                              )}
                              {booking.paymentMethod === "invoice" && !booking.paidAt && booking.status === "confirmed" && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                  INVOICE PENDING
                                </Badge>
                              )}
                              {booking.recurrenceGroupId && (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                                  <Repeat className="h-3 w-3 mr-1" />
                                  RECURRING
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {booking.centreName} - {booking.assetLabel}
                              {booking.requiresApproval && booking.status === "pending" && (
                                <span className="block text-orange-600 font-semibold mt-1">Awaiting Approval</span>
                              )}
                              {booking.status === "rejected" && booking.rejectionReason && (
                                <span className="block text-red-600 text-sm mt-1">
                                  Reason: {booking.rejectionReason}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {canPay(booking) && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handlePayNow(booking)}
                                disabled={isAnyCheckoutPending}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                {isAnyCheckoutPending ? "..." : "Pay Now"}
                              </Button>
                            )}
                            {canCancel(booking.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleCancelClick(booking)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                            {booking.recurrenceGroupId && canCancel(booking.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                onClick={() => setCancelRecurringGroupId(booking.recurrenceGroupId!)}
                              >
                                <Repeat className="h-3 w-3 mr-1" />
                                Cancel All Future
                              </Button>
                            )}
                            {booking.bookingType === "site" && booking.siteId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/site/${booking.siteId}`)}
                                className="flex items-center gap-1"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Rebook
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">Start:</span>
                              <span>{format(new Date(booking.startDate), "dd/MM/yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">End:</span>
                              <span>{format(new Date(booking.endDate), "dd/MM/yyyy")}</span>
                            </div>
                            {booking.customUsage && (
                              <div className="text-sm">
                                <span className="font-semibold">Usage:</span> {booking.customUsage}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="font-semibold">Total Amount:</span> ${Number(booking.totalAmount).toFixed(2)}
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold">GST:</span> ${Number(booking.gstAmount).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Booked on {format(new Date(booking.createdAt), "dd/MM/yyyy HH:mm")}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelBookingId !== null} onOpenChange={(open) => { if (!open) { setCancelBookingId(null); setCancelReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
              {bookings?.find(b => b.id === cancelBookingId && b.bookingType === cancelBookingType)?.paidAt && (
                <span className="block mt-2 text-amber-600 font-medium">
                  A refund request will be submitted for review by the centre manager.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleCancelConfirm}
              disabled={isAnyCancelPending}
            >
              {isAnyCancelPending ? "Cancelling..." : "Yes, Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Recurring Confirmation Dialog */}
      <AlertDialog open={cancelRecurringGroupId !== null} onOpenChange={(open) => { if (!open) setCancelRecurringGroupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel All Future Recurring Bookings</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel all future bookings in this recurring series that haven't started yet. Past and in-progress bookings will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Bookings</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (cancelRecurringGroupId) {
                  cancelRecurringMutation.mutate({ recurrenceGroupId: cancelRecurringGroupId });
                }
              }}
              disabled={cancelRecurringMutation.isPending}
            >
              {cancelRecurringMutation.isPending ? "Cancelling..." : "Yes, Cancel All Future"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
