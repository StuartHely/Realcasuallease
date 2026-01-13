import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminDashboard() {
  const { data: stats } = trpc.admin.getStats.useQuery();

  const statCards = [
    {
      title: "Total Centres",
      value: stats?.totalCentres || 0,
      icon: Building2,
      description: "Shopping centres in system",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Sites",
      value: stats?.totalSites || 0,
      icon: MapPin,
      description: "Available retail spaces",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Active Bookings",
      value: stats?.activeBookings || 0,
      icon: Calendar,
      description: "Current and upcoming",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Revenue",
      value: `$${((stats?.totalRevenue || 0) / 100).toLocaleString()}`,
      icon: DollarSign,
      description: "All-time earnings",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "This Month",
      value: `$${((stats?.monthlyRevenue || 0) / 100).toLocaleString()}`,
      icon: TrendingUp,
      description: "Revenue this month",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: "Registered customers",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Real Casual Leasing admin dashboard
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest booking activity</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentBookings.map((booking: any) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{booking.siteName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.startDate).toLocaleDateString()} -{" "}
                          {new Date(booking.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${(booking.totalPrice / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {booking.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent bookings</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/admin/centres"
                className="block rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Manage Centres</p>
                    <p className="text-xs text-muted-foreground">
                      Add or edit shopping centres
                    </p>
                  </div>
                </div>
              </a>
              <a
                href="/admin/sites"
                className="block rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Manage Sites</p>
                    <p className="text-xs text-muted-foreground">
                      Update site details and images
                    </p>
                  </div>
                </div>
              </a>
              <a
                href="/admin/bookings"
                className="block rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Review Bookings</p>
                    <p className="text-xs text-muted-foreground">
                      Approve or manage bookings
                    </p>
                  </div>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
