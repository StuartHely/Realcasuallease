import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, BarChart3, Target, Building2, Calendar, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PricingAnalytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [centreId, setCentreId] = useState<number | undefined>();

  const { data: centres } = trpc.centres.list.useQuery();

  const { data: analytics, isLoading: analyticsLoading } = trpc.pricingAnalytics.getSiteAnalytics.useQuery({
    centreId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: recommendations, isLoading: recsLoading } = trpc.pricingAnalytics.getRecommendations.useQuery({
    centreId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
  };

  const getOccupancyColor = (rate: number) => {
    if (rate > 60) return "bg-green-500";
    if (rate > 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getOccupancyTextColor = (rate: number) => {
    if (rate > 60) return "text-green-700";
    if (rate > 30) return "text-yellow-700";
    return "text-red-700";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pricing Analytics</h1>
            <p className="text-muted-foreground">
              Occupancy data, revenue trends, and AI-powered pricing recommendations
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
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
              value={centreId?.toString() ?? "all"}
              onValueChange={(val) => setCentreId(val === "all" ? undefined : Number(val))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Centres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centres</SelectItem>
                {centres?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(startDate || endDate || centreId) && (
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
          )}
        </div>

        {/* Summary Cards */}
        {analyticsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : analytics?.summary ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.summary.totalSites}</div>
                  <p className="text-xs text-muted-foreground">Across selected centres</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.summary.totalBookings}</div>
                  <p className="text-xs text-muted-foreground">
                    In {analytics.summary.totalDaysInRange} day range
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analytics.summary.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">Confirmed bookings</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.summary.avgOccupancy.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Across all sites</p>
                </CardContent>
              </Card>
            </div>

            {/* Occupancy Table */}
            <Card>
              <CardHeader>
                <CardTitle>Site Occupancy & Revenue</CardTitle>
                <CardDescription>
                  Occupancy rates and revenue by site for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.sites.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No sites found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Centre</TableHead>
                        <TableHead className="text-right">Current Rate</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Occupancy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.sites.map((site) => (
                        <TableRow key={site.siteId}>
                          <TableCell className="font-medium">{site.siteNumber}</TableCell>
                          <TableCell>{site.centreName}</TableCell>
                          <TableCell className="text-right">
                            {site.pricePerDay ? formatCurrency(Number(site.pricePerDay)) : "—"}
                          </TableCell>
                          <TableCell className="text-right">{site.bookingCount}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(site.totalRevenue)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getOccupancyColor(site.occupancyRate)}`}
                                  style={{ width: `${Math.min(100, site.occupancyRate)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${getOccupancyTextColor(site.occupancyRate)}`}>
                                {site.occupancyRate.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* AI Recommendations */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">AI Pricing Recommendations</h2>
            <p className="text-muted-foreground">
              Suggestions based on occupancy trends — for admin review only
            </p>
          </div>

          {recsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => (
                <Card key={rec.siteId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Site {rec.siteNumber}</CardTitle>
                      <Badge
                        className={
                          rec.action === "increase"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }
                      >
                        {rec.action === "increase" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {rec.action === "increase" ? "Increase" : "Decrease"}
                      </Badge>
                    </div>
                    <CardDescription>{rec.centreName}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Rate</p>
                        <p className="text-lg font-semibold">{formatCurrency(rec.currentRate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Suggested Rate</p>
                        <p className={`text-lg font-semibold ${rec.action === "increase" ? "text-green-700" : "text-amber-700"}`}>
                          {formatCurrency(rec.suggestedRate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{rec.occupancy}% occupancy</span>
                      <span>{rec.bookingCount} bookings</span>
                    </div>
                    <p className="text-sm">{rec.reasoning}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => toast.info("Feature coming soon — seasonal rate creation from recommendations")}
                    >
                      Apply as Seasonal Rate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  No actionable pricing recommendations at this time. All sites are within healthy occupancy ranges.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
