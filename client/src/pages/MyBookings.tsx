import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ArrowLeft, DollarSign, TrendingUp, Star, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";

export default function MyBookings() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  const { data: bookings, isLoading } = trpc.bookings.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
            <Button onClick={() => (window.location.href = getLoginUrl())} className="bg-blue-600 hover:bg-blue-700">
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
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Real Casual Leasing</h1>
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
                  const statusColors = {
                    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
                    confirmed: "bg-green-100 text-green-800 border-green-200",
                    cancelled: "bg-red-100 text-red-800 border-red-200",
                    completed: "bg-blue-100 text-blue-800 border-blue-200",
                    rejected: "bg-red-100 text-red-800 border-red-200",
                  };

                  return (
                    <Card key={booking.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              Booking {booking.bookingNumber}
                              <Badge variant="outline" className={statusColors[booking.status]}>
                                {booking.status.toUpperCase()}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {booking.centreName} - {booking.siteName}
                              {booking.requiresApproval && (
                                <span className="block text-orange-600 font-semibold mt-1">Awaiting Approval</span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/site/${booking.siteId}`)}
                              className="flex items-center gap-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Rebook
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/site/${booking.siteId}`)}
                            >
                              View Site
                            </Button>
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
    </div>
  );
}
