import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function MyBookings() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  const { data: bookings, isLoading } = trpc.bookings.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
              <h1 className="text-2xl font-bold text-blue-900">Casual Lease</h1>
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
          <div className="space-y-4">
            {bookings.map((booking) => {
              const statusColors = {
                pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
                confirmed: "bg-green-100 text-green-800 border-green-200",
                cancelled: "bg-red-100 text-red-800 border-red-200",
                completed: "bg-blue-100 text-blue-800 border-blue-200",
              };

              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Booking #{booking.bookingNumber}
                          <Badge variant="outline" className={statusColors[booking.status]}>
                            {booking.status.toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {booking.requiresApproval && (
                            <span className="text-orange-600 font-semibold">Awaiting Approval</span>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setLocation(`/site/${booking.siteId}`)}
                      >
                        View Site
                      </Button>
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
                          <span className="font-semibold">Total Amount:</span> ${booking.totalAmount}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">GST:</span> ${booking.gstAmount}
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
        )}
      </main>
    </div>
  );
}
