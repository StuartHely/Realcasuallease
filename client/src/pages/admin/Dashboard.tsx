import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Calendar, DollarSign, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/AdminLayout";
import { useTenant } from "@/contexts/TenantContext";

export default function AdminDashboard() {
  const tenant = useTenant();
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
      value: `$${(stats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "All streams combined",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "CL Revenue",
      value: `$${(stats?.clRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "Casual Leasing all-time",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "VS Revenue",
      value: `$${(stats?.vsRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "Vacant Shops all-time",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "TLI Revenue",
      value: `$${(stats?.tliRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "Third Line Income all-time",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "This Month",
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: "Revenue this month (all streams)",
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
            Welcome to the {tenant.brandName} admin dashboard
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
                          ${booking.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <CardTitle>Needs Attention</CardTitle>
              <CardDescription>Items requiring action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stats?.pendingCount ?? 0) > 0 && (
                <a href="/admin/pending-approvals" className="block rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-amber-600" />
                      <p className="font-medium text-amber-900">Bookings awaiting approval</p>
                    </div>
                    <Badge className="bg-amber-600">{stats?.pendingCount}</Badge>
                  </div>
                </a>
              )}
              {(stats?.unpaidOverdue ?? 0) > 0 && (
                <a href="/admin/bookings?status=unpaid" className="block rounded-lg border border-red-200 bg-red-50 p-3 hover:bg-red-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-red-600" />
                      <p className="font-medium text-red-900">Overdue invoices</p>
                    </div>
                    <Badge className="bg-red-600">{stats?.unpaidOverdue}</Badge>
                  </div>
                </a>
              )}
              {!(stats?.pendingCount) && !(stats?.unpaidOverdue) && (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All clear — nothing needs attention</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
