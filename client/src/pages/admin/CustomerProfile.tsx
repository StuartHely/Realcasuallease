import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Building2, Mail, Phone, Globe, FileText, Calendar, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function CustomerProfile() {
  const [, params] = useRoute("/admin/customer/:id");
  const [, setLocation] = useLocation();
  const customerId = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, error } = trpc.users.getById.useQuery(
    { userId: customerId },
    { enabled: customerId > 0 }
  );

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return format(new Date(date), "dd/MM/yyyy");
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "$0.00";
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Pending" },
      confirmed: { className: "bg-green-100 text-green-800 border-green-300", label: "Confirmed" },
      rejected: { className: "bg-red-100 text-red-800 border-red-300", label: "Rejected" },
      completed: { className: "bg-blue-100 text-blue-800 border-blue-300", label: "Completed" },
      cancelled: { className: "bg-gray-100 text-gray-800 border-gray-300", label: "Cancelled" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="py-8 text-center text-muted-foreground">Loading customer profile...</div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="py-8 text-center">
          <p className="text-red-600 mb-4">Customer not found</p>
          <Button variant="outline" onClick={() => setLocation("/admin/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const { user, profile, bookings } = data;

  // Calculate booking statistics
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const totalSpent = bookings
    .filter(b => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + parseFloat(b.totalAmount?.toString() || "0"), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Customer Profile</h1>
            <p className="text-muted-foreground">View customer details and booking history</p>
          </div>
        </div>

        {/* Customer Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{user.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Payment</p>
                  <Badge variant={user.canPayByInvoice ? "default" : "secondary"}>
                    {user.canPayByInvoice ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p className="font-medium">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{profile.companyName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trading Name</p>
                    <p className="font-medium">{profile.tradingName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ABN</p>
                    <p className="font-medium">{profile.abn || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Product/Service</p>
                    <p className="font-medium">{profile.productCategory || profile.productDetails || "—"}</p>
                  </div>
                  {profile.website && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-4 w-4" />
                        {profile.website}
                      </a>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[profile.streetAddress, profile.city, profile.state, profile.postcode].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No company profile on file</p>
              )}
            </CardContent>
          </Card>

          {/* Insurance Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Insurance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.insuranceCompany ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Insurance Company</p>
                    <p className="font-medium">{profile.insuranceCompany}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Policy Number</p>
                    <p className="font-medium">{profile.insurancePolicyNo || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coverage Amount</p>
                    <p className="font-medium">
                      {profile.insuranceAmount 
                        ? `$${(parseFloat(profile.insuranceAmount) / 1000000).toFixed(1)}M`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className={`font-medium ${profile.insuranceExpiry && new Date(profile.insuranceExpiry) < new Date() ? 'text-red-600' : ''}`}>
                      {formatDate(profile.insuranceExpiry)}
                      {profile.insuranceExpiry && new Date(profile.insuranceExpiry) < new Date() && (
                        <Badge variant="destructive" className="ml-2">Expired</Badge>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No insurance details on file</p>
              )}
            </CardContent>
          </Card>

          {/* Booking Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Booking Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{totalBookings}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed/Completed</p>
                  <p className="text-2xl font-bold text-green-600">{confirmedBookings}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingBookings}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking History
            </CardTitle>
            <CardDescription>All bookings made by this customer</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No bookings found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking #</TableHead>
                      <TableHead>Centre</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {booking.centreName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.siteNumber}</div>
                            {booking.siteName && (
                              <div className="text-sm text-muted-foreground">{booking.siteName}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(booking.startDate)}</TableCell>
                        <TableCell>{formatDate(booking.endDate)}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(booking.totalAmount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(booking.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
