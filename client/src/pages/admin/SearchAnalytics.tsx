import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Search, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function SearchAnalytics() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: summary, isLoading: summaryLoading } = trpc.searchAnalytics.getSummary.useQuery({
    startDate,
    endDate,
  });

  const { data: popularSearches, isLoading: popularLoading } = trpc.searchAnalytics.getPopularSearches.useQuery({
    limit: 10,
    startDate,
    endDate,
  });

  const { data: failedSearches, isLoading: failedLoading } = trpc.searchAnalytics.getFailedSearches.useQuery({
    limit: 10,
    startDate,
    endDate,
  });

  const { data: suggestionCTR, isLoading: ctrLoading } = trpc.searchAnalytics.getSuggestionClickThroughRate.useQuery({
    startDate,
    endDate,
  });

  const isLoading = summaryLoading || popularLoading || failedLoading || ctrLoading;

  const exportToCSV = () => {
    if (!summary || !popularSearches || !failedSearches || !suggestionCTR) return;

    // Create CSV content
    let csvContent = "Search Analytics Report\n";
    csvContent += `Generated: ${format(new Date(), "PPP")}\n`;
    if (startDate || endDate) {
      csvContent += `Date Range: ${startDate ? format(startDate, "PPP") : "All"} - ${endDate ? format(endDate, "PPP") : "All"}\n`;
    }
    csvContent += "\n";

    // Summary
    csvContent += "Summary\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Searches,${summary.totalSearches}\n`;
    csvContent += `Successful Searches,${summary.successfulSearches}\n`;
    csvContent += `Failed Searches,${summary.failedSearches}\n`;
    csvContent += `Success Rate,${summary.successRate.toFixed(1)}%\n`;
    csvContent += `Average Results Per Search,${summary.avgResultsPerSearch}\n`;
    csvContent += "\n";

    // Popular Searches
    csvContent += "Popular Searches\n";
    csvContent += "Query,Search Count,Avg Results\n";
    popularSearches.forEach(search => {
      csvContent += `"${search.query}",${search.count},${search.avgResultsCount}\n`;
    });
    csvContent += "\n";

    // Failed Searches
    csvContent += "Failed Searches\n";
    csvContent += "Query,Attempt Count,Last Searched\n";
    failedSearches.forEach(search => {
      csvContent += `"${search.query}",${search.count},${format(new Date(search.lastSearched), "MMM d, yyyy")}\n`;
    });
    csvContent += "\n";

    // Suggestion CTR
    csvContent += "Suggestion Click-Through Rate\n";
    csvContent += "Metric,Value\n";
    csvContent += `Searches with Suggestions,${suggestionCTR.totalSearchesWithSuggestions}\n`;
    csvContent += `Suggestion Clicks,${suggestionCTR.totalClicks}\n`;
    csvContent += `Click-Through Rate,${suggestionCTR.clickThroughRate.toFixed(1)}%\n`;

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `search-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    if (!summary || !popularSearches || !failedSearches || !suggestionCTR) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Search Analytics Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      startDate || endDate ? [`Date Range: ${startDate ? format(startDate, "PPP") : "All"} - ${endDate ? format(endDate, "PPP") : "All"}`] : [],
      [],
      ["Summary"],
      ["Metric", "Value"],
      ["Total Searches", summary.totalSearches],
      ["Successful Searches", summary.successfulSearches],
      ["Failed Searches", summary.failedSearches],
      ["Success Rate", `${summary.successRate.toFixed(1)}%`],
      ["Average Results Per Search", summary.avgResultsPerSearch],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Popular Searches sheet
    const popularData = [
      ["Popular Searches"],
      [],
      ["Query", "Search Count", "Avg Results"],
      ...popularSearches.map(s => [s.query, s.count, s.avgResultsCount])
    ];
    const popularSheet = XLSX.utils.aoa_to_sheet(popularData);
    XLSX.utils.book_append_sheet(wb, popularSheet, "Popular Searches");

    // Failed Searches sheet
    const failedData = [
      ["Failed Searches"],
      [],
      ["Query", "Attempt Count", "Last Searched"],
      ...failedSearches.map(s => [s.query, s.count, format(new Date(s.lastSearched), "MMM d, yyyy")])
    ];
    const failedSheet = XLSX.utils.aoa_to_sheet(failedData);
    XLSX.utils.book_append_sheet(wb, failedSheet, "Failed Searches");

    // Suggestion CTR sheet
    const ctrData = [
      ["Suggestion Click-Through Rate"],
      [],
      ["Metric", "Value"],
      ["Searches with Suggestions", suggestionCTR.totalSearchesWithSuggestions],
      ["Suggestion Clicks", suggestionCTR.totalClicks],
      ["Click-Through Rate", `${suggestionCTR.clickThroughRate.toFixed(1)}%`],
    ];
    const ctrSheet = XLSX.utils.aoa_to_sheet(ctrData);
    XLSX.utils.book_append_sheet(wb, ctrSheet, "Suggestion CTR");

    // Download
    XLSX.writeFile(wb, `search-analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <AdminLayout>
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search Analytics</h1>
          <p className="text-muted-foreground">
            Track user search behavior, popular queries, and failed searches
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV()}
            disabled={isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToExcel()}
            disabled={isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Filter analytics by date range (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {(startDate || endDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">Loading analytics...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalSearches || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time searches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.successRate.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.successfulSearches || 0} successful searches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Searches</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.failedSearches || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Searches with no results
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Results</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.avgResultsPerSearch || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sites per search
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Popular Searches */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Searches</CardTitle>
                <CardDescription>Most frequently searched queries</CardDescription>
              </CardHeader>
              <CardContent>
                {popularSearches && popularSearches.length > 0 ? (
                  <div className="space-y-4">
                    {popularSearches.map((search, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{search.query}</p>
                          <p className="text-sm text-muted-foreground">
                            Avg {search.avgResultsCount} results
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{search.count}</p>
                          <p className="text-xs text-muted-foreground">searches</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No search data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Failed Searches */}
            <Card>
              <CardHeader>
                <CardTitle>Failed Searches</CardTitle>
                <CardDescription>Queries that returned no results</CardDescription>
              </CardHeader>
              <CardContent>
                {failedSearches && failedSearches.length > 0 ? (
                  <div className="space-y-4">
                    {failedSearches.map((search, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-red-600">{search.query}</p>
                          <p className="text-sm text-muted-foreground">
                            Last: {format(new Date(search.lastSearched), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{search.count}</p>
                          <p className="text-xs text-muted-foreground">attempts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No failed searches</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Suggestion Click-Through Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Suggestion Click-Through Rate</CardTitle>
              <CardDescription>
                How often users click on search suggestions when no results are found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Searches with Suggestions</p>
                  <p className="text-2xl font-bold">{suggestionCTR?.totalSearchesWithSuggestions || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suggestion Clicks</p>
                  <p className="text-2xl font-bold">{suggestionCTR?.totalClicks || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Click-Through Rate</p>
                  <p className="text-2xl font-bold">{suggestionCTR?.clickThroughRate.toFixed(1) || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
    </AdminLayout>
  );
}
