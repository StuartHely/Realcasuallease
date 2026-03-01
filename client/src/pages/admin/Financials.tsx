import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Loader2,
} from "lucide-react";

function formatAUD(value: string | number | null | undefined): string {
  const num = parseFloat(String(value ?? "0"));
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(num);
}

export default function AdminFinancials() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centreId, setCentreId] = useState<number | undefined>();

  const { data: centres } = trpc.centres.list.useQuery();
  const { data, isLoading } = trpc.financials.summary.useQuery(
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      centreId,
    },
  );

  const totals = data?.totals;
  const revenueByCentre = data?.revenueByCentre ?? [];
  const revenueByMonth = data?.revenueByMonth ?? [];
  const paymentBreakdown = data?.paymentBreakdown ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">
            View revenue, commissions, and payment reports
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Centre</label>
                <Select
                  value={centreId ? String(centreId) : "all"}
                  onValueChange={(v) =>
                    setCentreId(v === "all" ? undefined : Number(v))
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="All Centres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Centres</SelectItem>
                    {centres?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCentreId(undefined);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && totals && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue (ex GST)
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAUD(
                      parseFloat(String(totals.totalRevenue)) -
                        parseFloat(String(totals.totalGst)),
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    GST Collected
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAUD(totals.totalGst)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Platform Commission
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAUD(totals.totalPlatformFee)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Owner Payments
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAUD(totals.totalOwnerAmount)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Bookings
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totals.bookingCount}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Paid Bookings
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totals.paidCount ?? 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Method Breakdown */}
            {paymentBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Breakdown</CardTitle>
                  <CardDescription>
                    Confirmed bookings by payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6">
                    {paymentBreakdown.map((pm) => (
                      <div key={pm.paymentMethod} className="flex items-center gap-3">
                        <Badge variant={pm.paymentMethod === "stripe" ? "default" : "secondary"}>
                          {pm.paymentMethod === "stripe" ? "Stripe" : "Invoice"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pm.count} bookings
                        </span>
                        <span className="font-semibold">
                          {formatAUD(pm.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue by Centre */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Centre</CardTitle>
                <CardDescription>
                  Breakdown of confirmed bookings per shopping centre
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByCentre.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No booking data found for the selected filters.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Centre Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">
                          Platform Fee
                        </TableHead>
                        <TableHead className="text-right">
                          Owner Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueByCentre.map((row) => (
                        <TableRow key={row.centreId}>
                          <TableCell className="font-medium">
                            {row.centreName ?? "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.state ?? "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.bookingCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAUD(row.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAUD(row.totalGst)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAUD(row.platformFee)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAUD(row.ownerAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Month */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Month</CardTitle>
                <CardDescription>
                  Monthly revenue trend for confirmed bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No monthly data found for the selected filters.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">
                          Platform Fee
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueByMonth.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">
                            {row.month}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.bookingCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAUD(row.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAUD(row.platformFee)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
