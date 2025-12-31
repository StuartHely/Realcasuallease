import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { BarChart3, Eye, MousePointerClick, TrendingUp } from "lucide-react";

export default function ImageAnalytics() {
  const { data: topImages, isLoading } = trpc.admin.getTopPerformingImages.useQuery({ limit: 20 });

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const formatCTR = (ctr: number) => {
    return `${ctr.toFixed(2)}%`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Image Analytics</h1>
            <p className="text-muted-foreground">
              Track image performance and optimize for conversions
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topImages?.reduce((sum, img) => sum + img.viewCount, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all site images
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topImages?.reduce((sum, img) => sum + img.clickCount, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Image interactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topImages && topImages.length > 0
                  ? formatCTR(
                      topImages.reduce((sum, img) => sum + img.clickThroughRate, 0) /
                        topImages.length
                    )
                  : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                Click-through rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Images Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Images</CardTitle>
            <CardDescription>
              Images ranked by view count and engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading analytics...
              </div>
            ) : !topImages || topImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No image analytics data yet. Images will be tracked as users view site detail pages.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Conv. Rate</TableHead>
                      <TableHead>Last Viewed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topImages.map((image, index) => (
                      <TableRow key={`${image.siteId}-${image.imageSlot}`}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>{image.siteName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {image.imageUrl ? (
                              <img
                                src={image.imageUrl}
                                alt={`${image.siteName} - Image ${image.imageSlot}`}
                                className="h-12 w-16 object-contain bg-gray-100 rounded"
                              />
                            ) : (
                              <div className="h-12 w-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                No image
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">
                              Slot {image.imageSlot}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {image.viewCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {image.clickCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              image.clickThroughRate > 10
                                ? "text-green-600"
                                : image.clickThroughRate > 5
                                ? "text-yellow-600"
                                : "text-gray-600"
                            }`}
                          >
                            {formatCTR(image.clickThroughRate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {image.bookingCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              image.conversionRate > 5
                                ? "text-green-600"
                                : image.conversionRate > 2
                                ? "text-yellow-600"
                                : "text-gray-600"
                            }`}
                          >
                            {formatCTR(image.conversionRate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(image.lastViewedAt)}
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
