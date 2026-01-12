import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Analytics</h1>
        <p className="text-muted-foreground">
          Track user search behavior, popular queries, and failed searches
        </p>
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
  );
}
