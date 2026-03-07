import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, ChevronRight, ChevronDown, Building2, CalendarDays, BarChart3, DollarSign } from "lucide-react";
import { format, subDays } from "date-fns";

type AssetTypeValue = "cl" | "vs" | "tli";

const ASSET_TYPES: { value: AssetTypeValue; label: string }[] = [
  { value: "cl", label: "Casual Leasing (CL)" },
  { value: "vs", label: "Vacant Shops (VS)" },
  { value: "tli", label: "Third Line Income (TLI)" },
];

function occupancyColor(percent: number): string {
  if (percent >= 70) return "text-green-600";
  if (percent >= 30) return "text-amber-600";
  return "text-red-600";
}

export default function OccupancyReport() {
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(() => new Date());
  const [assetTypes, setAssetTypes] = useState<Set<AssetTypeValue>>(() => new Set<AssetTypeValue>(["cl", "vs", "tli"]));
  const [expandedCentres, setExpandedCentres] = useState<Set<number>>(new Set());

  const { data, isLoading } = trpc.reports.occupancy.useQuery({
    startDate,
    endDate,
    assetTypes: Array.from(assetTypes),
  });

  const toggleAssetType = (type: AssetTypeValue, checked: boolean) => {
    setAssetTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(type);
      else next.delete(type);
      return next;
    });
  };

  const toggleCentre = (centreId: number) => {
    setExpandedCentres((prev) => {
      const next = new Set(prev);
      if (next.has(centreId)) next.delete(centreId);
      else next.add(centreId);
      return next;
    });
  };

  const exportCSV = () => {
    if (!data) return;

    let csv = "Occupancy Report\n";
    csv += `Generated: ${format(new Date(), "PPP")}\n`;
    csv += `Date Range: ${format(startDate, "PPP")} - ${format(endDate, "PPP")}\n`;
    csv += `Asset Types: ${Array.from(assetTypes).join(", ")}\n\n`;

    csv += "Summary\n";
    csv += "Metric,Value\n";
    csv += `Total Assets,${data.summary.totalAssets}\n`;
    csv += `Available Days,${data.summary.availableDays}\n`;
    csv += `Booked Days,${data.summary.bookedDays}\n`;
    csv += `Occupancy Rate,${data.summary.occupancyPercent.toFixed(1)}%\n`;
    csv += `Revenue,$${data.summary.revenue.toLocaleString()}\n\n`;

    csv += "Centre,Portfolio,Owner,Total Assets,Available Days,Booked Days,Occupancy %,Revenue\n";
    for (const centre of data.centres) {
      csv += `"${centre.centreName}","${centre.portfolioName}","${centre.ownerName}",${centre.totalAssets},${centre.availableDays},${centre.bookedDays},${centre.occupancyPercent.toFixed(1)}%,$${centre.revenue.toLocaleString()}\n`;
    }

    csv += "\nAsset Details\n";
    csv += "Centre,Asset Label,Asset Type,Available Days,Booked Days,Occupancy %,Revenue\n";
    for (const centre of data.centres) {
      for (const asset of centre.assets) {
        csv += `"${centre.centreName}","${asset.assetLabel}","${asset.assetType}",${asset.availableDays},${asset.bookedDays},${asset.occupancyPercent.toFixed(1)}%,$${asset.revenue.toLocaleString()}\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `occupancy-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Occupancy Report</h1>
            <p className="text-gray-600 mt-1">View occupancy rates across centres and assets</p>
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={isLoading || !data}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={format(startDate, "yyyy-MM-dd")}
                    onChange={(e) => setStartDate(new Date(e.target.value + "T00:00:00"))}
                    className="border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={format(endDate, "yyyy-MM-dd")}
                    onChange={(e) => setEndDate(new Date(e.target.value + "T00:00:00"))}
                    className="border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Asset Types</label>
                <div className="flex items-center gap-4">
                  {ASSET_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`asset-type-${type.value}`}
                        checked={assetTypes.has(type.value)}
                        onCheckedChange={(checked) => toggleAssetType(type.value, checked as boolean)}
                      />
                      <label htmlFor={`asset-type-${type.value}`} className="text-sm cursor-pointer">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.centres.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-600">No data found for the selected filters</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalAssets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${occupancyColor(data.summary.occupancyPercent)}`}>
                    {data.summary.occupancyPercent.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data.summary.revenue.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Booked Days</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.bookedDays.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    of {data.summary.availableDays.toLocaleString()} available
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Centres Table */}
            <Card>
              <CardHeader>
                <CardTitle>Centre Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Centre</TableHead>
                      <TableHead>Portfolio</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Booked</TableHead>
                      <TableHead className="text-right">Occupancy</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.centres.map((centre) => (
                      <>
                        <TableRow
                          key={`centre-${centre.centreId}`}
                          className="cursor-pointer"
                          onClick={() => toggleCentre(centre.centreId)}
                        >
                          <TableCell>
                            {expandedCentres.has(centre.centreId) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{centre.centreName}</TableCell>
                          <TableCell>{centre.portfolioName}</TableCell>
                          <TableCell>{centre.ownerName}</TableCell>
                          <TableCell className="text-right">{centre.totalAssets}</TableCell>
                          <TableCell className="text-right">{centre.availableDays.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{centre.bookedDays.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${occupancyColor(centre.occupancyPercent)}`}>
                            {centre.occupancyPercent.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">${centre.revenue.toLocaleString()}</TableCell>
                        </TableRow>

                        {expandedCentres.has(centre.centreId) &&
                          centre.assets.map((asset) => (
                            <TableRow key={`asset-${centre.centreId}-${asset.assetId}`} className="bg-muted/30">
                              <TableCell></TableCell>
                              <TableCell className="pl-8 text-muted-foreground">{asset.assetLabel}</TableCell>
                              <TableCell>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{asset.assetType}</span>
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right text-muted-foreground">{asset.availableDays.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{asset.bookedDays.toLocaleString()}</TableCell>
                              <TableCell className={`text-right font-semibold ${occupancyColor(asset.occupancyPercent)}`}>
                                {asset.occupancyPercent.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">${asset.revenue.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
