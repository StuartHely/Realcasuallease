import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function OccupancyDonut({ percentage, size = 100 }: { percentage: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${Math.min(percentage, 100) * circumference / 100} ${circumference}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E1E5EC" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2563eb" strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-lg font-bold text-gray-900">{percentage}%</p>
      </div>
    </div>
  );
}

export default function OwnerViewerDashboard() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data, isLoading, refetch } = trpc.dashboard.getOwnerViewerMetrics.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const yearOptions = [selectedYear, selectedYear - 1, selectedYear - 2];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-teal-600" />
              Owner Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Read-only overview of centre performance</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : !data || data.centres.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-600">No centres assigned to your account</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.centres.map((centre) => (
              <Card key={centre.centreId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{centre.centreName}</CardTitle>
                  <p className="text-sm text-gray-500">{centre.siteCount} site{centre.siteCount !== 1 ? 's' : ''}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Bookings</p>
                      <p className="text-3xl font-bold text-gray-900">{centre.totalBookings}</p>
                    </div>
                    <OccupancyDonut percentage={centre.occupancyPercent} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Occupancy</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(centre.occupancyPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{centre.bookedDays} booked days this month</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status Breakdown</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Pending: {centre.pending}
                      </Badge>
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Confirmed: {centre.confirmed}
                      </Badge>
                      <Badge variant="default" className="bg-red-100 text-red-800 hover:bg-red-100">
                        Cancelled: {centre.cancelled}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
