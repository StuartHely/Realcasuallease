import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, ArrowLeft, Calendar, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, CalendarDays, Store, Zap, Layers } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse, addDays, isSameDay, subDays, isBefore, startOfDay } from "date-fns";
import InteractiveMap from "@/components/InteractiveMap";
import { NearbyCentresMap } from "@/components/NearbyCentresMap";
import { SearchSkeleton } from "@/components/SearchSkeleton";
import { parseSearchQuery } from "@/../../shared/queryParser";

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState<{ query: string; date: Date } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ siteIndex: number; dateIndex: number } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showOnlyAutoApproved, setShowOnlyAutoApproved] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<"casual_leasing" | "vacant_shops" | "third_line" | "all">("casual_leasing");
  const calendarDays = 14; // Fixed 14-day view

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query") || params.get("centre"); // Support both for backwards compatibility
    const dateStr = params.get("date");
    const categoryParam = params.get("category");
    const autoApprovedParam = params.get("autoApproved");

    if (query && dateStr) {
      try {
        const parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
        setSearchParams({ query, date: parsedDate });
      } catch (e) {
        console.error("Invalid date format", e);
      }
    }

    // Restore category filter from URL
    if (categoryParam) {
      setSelectedCategoryId(parseInt(categoryParam));
    }

    // Restore auto-approved filter from URL
    if (autoApprovedParam === "true") {
      setShowOnlyAutoApproved(true);
    }
  }, []);

  const { data, isLoading } = trpc.search.smart.useQuery(
    {
      query: searchParams?.query || "",
      date: searchParams?.date || new Date(),
    },
    { enabled: !!searchParams }
  );

  // Fetch all usage categories for filter dropdown
  const { data: allCategories } = trpc.usageCategories.list.useQuery();

  // Fetch vacant shops and third line income for the searched centres
  const centreIds = data?.centres?.map((c: any) => c.id) || [];
  const { data: vacantShops } = trpc.vacantShops.getByCentre.useQuery(
    { centreId: centreIds[0] || 0 },
    { enabled: centreIds.length > 0 && (selectedAssetType === "vacant_shops" || selectedAssetType === "all") }
  );
  const { data: thirdLineIncome } = trpc.thirdLineIncome.getByCentre.useQuery(
    { centreId: centreIds[0] || 0 },
    { enabled: centreIds.length > 0 && (selectedAssetType === "third_line" || selectedAssetType === "all") }
  );

  // Determine if a site is matched by the search query
  const isMatchedSite = (siteId: number) => {
    if (!data?.matchedSiteIds || !Array.isArray(data.matchedSiteIds)) return false;
    return (data.matchedSiteIds as number[]).includes(siteId);
  };

  // Auto-scroll to matched site when data loads
  useEffect(() => {
    if (data && data.matchedSiteIds && data.matchedSiteIds.length > 0) {
      // Wait a bit for the DOM to render
      setTimeout(() => {
        const firstMatchedId = data.matchedSiteIds[0];
        const element = document.getElementById(`site-${firstMatchedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [data]);

  // Generate date range for heatmap (14 or 30 days)
  const generateDateRange = () => {
    if (!searchParams?.date) return [];
    const dates = [];
    const startDate = searchParams.date;
    for (let i = 0; i < calendarDays; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  };

  const dateRange = generateDateRange();
  
  // Parse query to check if filters are applied
  const parsedQuery = searchParams?.query ? parseSearchQuery(searchParams.query) : { minSizeM2: undefined, productCategory: undefined };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data?.sites || data.sites.length === 0) return;
      
      // Only handle arrow keys
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      e.preventDefault();
      
      // Initialize focus if not set
      if (!focusedCell) {
        setFocusedCell({ siteIndex: 0, dateIndex: 0 });
        return;
      }
      
      const { siteIndex, dateIndex } = focusedCell;
      let newSiteIndex = siteIndex;
      let newDateIndex = dateIndex;
      
      switch (e.key) {
        case 'ArrowUp':
          newSiteIndex = Math.max(0, siteIndex - 1);
          break;
        case 'ArrowDown':
          newSiteIndex = Math.min(data.sites.length - 1, siteIndex + 1);
          break;
        case 'ArrowLeft':
          newDateIndex = Math.max(0, dateIndex - 1);
          break;
        case 'ArrowRight':
          newDateIndex = Math.min(dateRange.length - 1, dateIndex + 1);
          break;
      }
      
      setFocusedCell({ siteIndex: newSiteIndex, dateIndex: newDateIndex });
      
      // Scroll to keep focused cell in view
      setTimeout(() => {
        const cellId = `cell-${newSiteIndex}-${newDateIndex}`;
        const element = document.getElementById(cellId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }, 0);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, focusedCell, dateRange]);

  if (!searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading search parameters...</p>
      </div>
    );
  }



  // Check if a site is booked on a specific date
  const isBookedOnDate = (siteId: number, date: Date) => {
    if (!data?.availability) return false;
    const siteAvailability = data.availability.find(a => a.siteId === siteId);
    if (!siteAvailability) return false;

    // Combine both week's bookings
    const allBookings = [...siteAvailability.week1Bookings, ...siteAvailability.week2Bookings];
    
    // Normalize the check date to midnight for comparison
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return allBookings.some(booking => {
      const bookingStart = new Date(booking.startDate);
      bookingStart.setHours(0, 0, 0, 0);
      const bookingEnd = new Date(booking.endDate);
      bookingEnd.setHours(0, 0, 0, 0);
      
      // Check if the date falls within the booking range (inclusive)
      return checkDate >= bookingStart && checkDate <= bookingEnd;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation("/")}
            >
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Real Casual Leasing</h1>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/my-bookings")}>My Bookings</Button>
            <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Summary */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">Search Results</h2>
          <p className="text-gray-600">
            Searching for: <span className="font-semibold">{searchParams.query}</span> on{" "}
            <span className="font-semibold">{format(searchParams.date, "dd/MM/yyyy")}</span>
          </p>
          {(() => {
            const parsed = parseSearchQuery(searchParams.query);
            const hasRequirements = parsed.minSizeM2 !== undefined || parsed.minTables !== undefined;
            if (hasRequirements) {
              return (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span key="label" className="text-sm text-gray-600">Filtering by:</span>
                  {parsed.minSizeM2 !== undefined && (
                    <Badge key="size" variant="secondary" className="bg-blue-100 text-blue-700">
                      Minimum {parsed.minSizeM2}m² site size
                    </Badge>
                  )}
                  {parsed.minTables !== undefined && (
                    <Badge key="tables" variant="secondary" className="bg-green-100 text-green-700">
                      Minimum {parsed.minTables} tables
                    </Badge>
                  )}
                </div>
              );
            }
            return null;
          })()}
          
          {/* Asset Type Filter */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Asset Type:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedAssetType === "casual_leasing" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("casual_leasing")}
                className="flex items-center gap-1.5"
              >
                <MapPin className="h-4 w-4" />
                Casual Leasing
              </Button>
              <Button
                variant={selectedAssetType === "vacant_shops" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("vacant_shops")}
                className="flex items-center gap-1.5"
              >
                <Store className="h-4 w-4" />
                Vacant Shops
              </Button>
              <Button
                variant={selectedAssetType === "third_line" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("third_line")}
                className="flex items-center gap-1.5"
              >
                <Zap className="h-4 w-4" />
                Third Line Income
              </Button>
              <Button
                variant={selectedAssetType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("all")}
                className="flex items-center gap-1.5"
              >
                <Layers className="h-4 w-4" />
                All Assets
              </Button>
            </div>
          </div>
          
          {/* Show smart size suggestion if exact match not available */}
          {data?.sizeNotAvailable && data?.closestMatch && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">
                <Info className="inline h-4 w-4 mr-1" />
                Your exact size isn't available, but we found a close match: {data.closestMatch.widthM}m × {data.closestMatch.lengthM}m ({data.closestMatch.sizeM2}m²)
                {' '}({Math.round((data.closestMatch.difference / (data.closestMatch.sizeM2 - data.closestMatch.difference)) * 100)}% larger)
              </p>
            </div>
          )}
          {/* Show generic message if no close matches */}
          {data?.sizeNotAvailable && !data?.closestMatch && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium">
                Your requested size is not available. Let me show you the other sites.
              </p>
            </div>
          )}
        </div>

        {isLoading && <SearchSkeleton />}

        {data && data.centres.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">No shopping centres found matching your search.</p>
              </div>
              
              {/* Search Suggestions */}
              {data.suggestions && data.suggestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-center">Did you mean?</h3>
                  <div className="space-y-2 max-w-md mx-auto">
                    {data.suggestions.map((suggestion: any, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start text-left"
                        onClick={() => {
                          const params = new URLSearchParams(window.location.search);
                          params.set('query', suggestion.centreName);
                          // Force full page reload to trigger new search
                          window.location.href = `/search?${params.toString()}`;
                        }}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{suggestion.centreName}</span>
                          <span className="text-sm text-muted-foreground">{suggestion.reason}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <Button onClick={() => setLocation("/")}>Try Another Search</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {data && data.centres.length > 0 && (
          <div className="space-y-8">
            {/* Vacant Shops Section */}
            {(selectedAssetType === "vacant_shops" || selectedAssetType === "all") && vacantShops && vacantShops.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl mb-1 flex items-center gap-2">
                    <Store className="h-6 w-6 text-green-600" />
                    Vacant Shops at {data.centres[0]?.name}
                  </CardTitle>
                  <CardDescription>
                    Short-term vacant shop tenancies available for weekly or monthly booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {vacantShops.filter((shop: any) => shop.isActive).map((shop: any) => (
                      <Card key={`vs-${shop.id}`} className="border-green-200 bg-green-50/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Store className="h-4 w-4 text-green-600" />
                            Shop {shop.shopNumber}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {shop.totalSizeM2 && <p><span className="font-medium">Size:</span> {shop.totalSizeM2}m²</p>}
                          {shop.dimensions && <p><span className="font-medium">Dimensions:</span> {shop.dimensions}</p>}
                          <p><span className="font-medium">Powered:</span> {shop.powered ? "Yes" : "No"}</p>
                          {shop.pricePerWeek && <p><span className="font-medium">Price:</span> ${shop.pricePerWeek}/week</p>}
                          {shop.pricePerMonth && <p className="text-muted-foreground">${shop.pricePerMonth}/month</p>}
                          {shop.description && <p className="text-muted-foreground text-xs mt-2">{shop.description}</p>}
                          <Button
                            size="sm"
                            className="w-full mt-3 bg-green-600 hover:bg-green-700"
                            onClick={() => setLocation(`/vacant-shop/${shop.id}`)}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Third Line Income Section */}
            {(selectedAssetType === "third_line" || selectedAssetType === "all") && thirdLineIncome && thirdLineIncome.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl mb-1 flex items-center gap-2">
                    <Zap className="h-6 w-6 text-purple-600" />
                    Third Line Income at {data.centres[0]?.name}
                  </CardTitle>
                  <CardDescription>
                    Non-tenancy assets such as vending machines, signage, and installations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {thirdLineIncome.filter((asset: any) => asset.isActive).map((asset: any) => (
                      <Card key={`3rdl-${asset.id}`} className="border-purple-200 bg-purple-50/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-4 w-4 text-purple-600" />
                            {asset.assetNumber}
                          </CardTitle>
                          {asset.categoryName && (
                            <Badge variant="secondary" className="w-fit">{asset.categoryName}</Badge>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {asset.dimensions && <p><span className="font-medium">Dimensions:</span> {asset.dimensions}</p>}
                          <p><span className="font-medium">Powered:</span> {asset.powered ? "Yes" : "No"}</p>
                          {asset.pricePerWeek && <p><span className="font-medium">Price:</span> ${asset.pricePerWeek}/week</p>}
                          {asset.pricePerMonth && <p className="text-muted-foreground">${asset.pricePerMonth}/month</p>}
                          {asset.description && <p className="text-muted-foreground text-xs mt-2">{asset.description}</p>}
                          <Button
                            size="sm"
                            className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                            onClick={() => setLocation(`/third-line/${asset.id}`)}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Heatmap - Casual Leasing Sites */}
            {(selectedAssetType === "casual_leasing" || selectedAssetType === "all") && data.centres.map((centre) => {
              let centreSites = data.sites.filter((s) => s.centreId === centre.id);
              
              // Filter by selected category if one is chosen
              if (selectedCategoryId && data.siteCategories) {
                centreSites = centreSites.filter((site) => {
                  const siteCategories = data.siteCategories[site.id];
                  // If no categories configured (empty array), site accepts all categories
                  if (!siteCategories || siteCategories.length === 0) return true;
                  // Otherwise check if selected category is in the approved list
                  return siteCategories.some((cat: any) => cat.id === selectedCategoryId);
                });
              }

              // Further filter by auto-approved if checkbox is checked
              if (showOnlyAutoApproved && selectedCategoryId && data.siteCategories) {
                centreSites = centreSites.filter((site) => {
                  const siteCategories = data.siteCategories[site.id];
                  // Empty array means all categories approved (auto-approve all)
                  if (!siteCategories || siteCategories.length === 0) return true;
                  // Check if selected category is explicitly approved
                  return siteCategories.some((cat: any) => cat.id === selectedCategoryId);
                });
              }
              
              // Skip this centre if no sites match the filter
              if (centreSites.length === 0) return null;
              
              return (
                <Card key={`centre-casual-${centre.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl mb-1">{centre.name}</CardTitle>
                    <CardDescription>
                      {centre.majors && <span key={`${centre.id}-majors`} className="block">Major Stores: {centre.majors}</span>}
                      {centre.numberOfSpecialties && (
                        <span key={`${centre.id}-specialties`} className="block">Specialty Stores: {centre.numberOfSpecialties}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-1">
                    {/* Legend */}
                    <div className="flex items-center gap-6 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded"></div>
                        <span className="text-sm font-medium">Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-500 rounded"></div>
                        <span className="text-sm font-medium">Booked</span>
                      </div>
                    </div>
                    
                    {/* Filter explanation notice */}
                    {(parsedQuery.minSizeM2 !== undefined || parsedQuery.productCategory) && (() => {
                      const hasSizeFilter = parsedQuery.minSizeM2 !== undefined;
                      const hasCategoryFilter = parsedQuery.productCategory;
                      
                      let noticeText = '';
                      if (hasSizeFilter && hasCategoryFilter) {
                        noticeText = 'Sites below meet your stated SIZE requirement and USAGE.';
                      } else if (hasSizeFilter) {
                        noticeText = 'Sites below meet your stated SIZE requirement.';
                      } else if (hasCategoryFilter) {
                        noticeText = 'Sites below meet your stated USAGE requirement.';
                      }
                      
                      const handleShowAllSites = (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Extract just the centre name from the query
                        // For "Chullora Marketplace uggs", we want "Chullora Marketplace"
                        // Always strip size patterns and product categories from the query
                        let centreName = (parsedQuery.centreName || searchParams.query)
                          .replace(/\d+\s*x\s*\d+m?/gi, '') // Remove size patterns like "3x4m"
                          .replace(/\b(shoes?|footwear|clothing|food|electronics|ugg|uggs|ugg boots)\b/gi, '') // Remove common categories
                          .trim();
                        
                        const params = new URLSearchParams();
                        params.set('query', centreName);
                        params.set('date', format(searchParams.date, 'yyyy-MM-dd'));
                        const newUrl = `/search?${params.toString()}`;
                        // Don't preserve category or auto-approved filters - show ALL sites
                        setLocation(newUrl);
                      };
                      
                      return (
                        <div className="mb-4 space-y-2">
                          <div className="text-base text-red-600 italic">
                            {noticeText}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleShowAllSites}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Show me all sized sites in this centre
                          </Button>
                        </div>
                      );
                    })()}

                    {/* Calendar Heatmap */}
                    {/* Date Range Indicator */}
                    {dateRange.length > 0 && (
                      <div className="text-center mb-3">
                        <span className="text-sm text-muted-foreground">
                          Viewing <span className="font-medium text-foreground">{format(dateRange[0], 'MMM d')}</span> - <span className="font-medium text-foreground">{format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}</span>
                        </span>
                      </div>
                    )}
                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (!searchParams) return;
                                  const newDate = subDays(searchParams.date, 7);
                                  const params = new URLSearchParams(window.location.search);
                                  params.set('date', format(newDate, 'yyyy-MM-dd'));
                                  window.location.search = params.toString();
                                }}
                                className="flex items-center gap-1"
                                disabled={searchParams ? isBefore(subDays(searchParams.date, 7), startOfDay(new Date())) : false}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous Week
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {searchParams && isBefore(subDays(searchParams.date, 7), startOfDay(new Date())) && (
                            <TooltipContent>
                              <p>Cannot view past dates</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!searchParams) return;
                          const newDate = addDays(searchParams.date, 7);
                          const params = new URLSearchParams(window.location.search);
                          params.set('date', format(newDate, 'yyyy-MM-dd'));
                          window.location.search = params.toString();
                        }}
                        className="flex items-center gap-1"
                      >
                        Next Week
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="h-4 w-4" />
                            New Date
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={searchParams?.date}
                            onSelect={(date) => {
                              if (date && searchParams) {
                                const params = new URLSearchParams(window.location.search);
                                params.set('date', format(date, 'yyyy-MM-dd'));
                                window.location.search = params.toString();
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!searchParams) return;
                          const params = new URLSearchParams(window.location.search);
                          params.set('date', format(new Date(), 'yyyy-MM-dd'));
                          window.location.search = params.toString();
                        }}
                        className="flex items-center gap-1"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Today
                      </Button>
                      </div>
                    </div>
                    {/* Top scrollbar */}
                    <div 
                      className="overflow-x-auto mb-2" 
                      ref={(el) => {
                        if (el) {
                          const bottomScroll = el.nextElementSibling as HTMLElement;
                          if (bottomScroll) {
                            el.addEventListener('scroll', () => {
                              bottomScroll.scrollLeft = el.scrollLeft;
                            });
                            bottomScroll.addEventListener('scroll', () => {
                              el.scrollLeft = bottomScroll.scrollLeft;
                            });
                          }
                        }
                      }}
                    >
                      <div style={{ width: 'max-content', height: '1px' }}>
                        {/* Spacer to create scrollbar width matching table */}
                        <div style={{ width: `${centreSites.length > 0 ? 80 * calendarDays + 200 : 1000}px` }}></div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2">
                                Site
                              </th>
                              {dateRange.map((date, idx) => {
                                const isSearchedDate = isSameDay(date, searchParams.date);
                                return (
                                <th 
                                  key={idx} 
                                  className={`px-2 py-2 text-center text-xs font-medium border-b-2 min-w-[80px] ${
                                    isSearchedDate ? 'bg-blue-50 border-l-4 border-r-4 border-blue-500' : ''
                                  }`}
                                >
                                  {isSearchedDate && (
                                    <div className="text-blue-600 font-bold text-[10px] mb-1">SEARCHED</div>
                                  )}
                                  <div className={isSearchedDate ? 'font-bold text-blue-700' : ''}>{format(date, "dd/MM")}</div>
                                  <div className={isSearchedDate ? 'text-blue-600' : 'text-gray-500'}>{format(date, "EEE")}</div>
                                </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {centreSites.map((site, siteIdx) => {
                              const isMatched = isMatchedSite(site.id);
                              return (
                              <tr 
                                key={`site-casual-${centre.id}-${site.id}`} 
                                className={`hover:bg-gray-50 ${isMatched ? 'bg-yellow-50' : ''}`}
                                id={`site-${site.id}`}
                              >
                                <td className={`sticky left-0 z-10 px-3 py-2 font-medium border-r-2 border-b ${
                                  isMatched ? 'bg-yellow-50' : 'bg-white'
                                }`}>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      {isMatched && (
                                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                                          Matched
                                        </Badge>
                                      )}
                                      <span className="text-sm font-semibold">{site.siteNumber}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setLocation(`/site/${site.id}`)}
                                      >
                                        View
                                      </Button>
                                    </div>
                                    <div className="flex gap-2 text-xs text-gray-600">
                                      {site.size && <span key={`${site.id}-size`}>{site.size}</span>}
                                      {site.maxTables && <span key={`${site.id}-tables`}>• {site.maxTables} tables</span>}
                                    </div>
                                  </div>
                                </td>
                                {dateRange.map((date, dateIdx) => {
                                  const isBooked = isBookedOnDate(site.id, date);
                                  const isSearchedDate = isSameDay(date, searchParams.date);
                                  const isFocused = focusedCell?.siteIndex === siteIdx && focusedCell?.dateIndex === dateIdx;
                                  return (
                                    <td 
                                      key={dateIdx}
                                      id={`cell-${siteIdx}-${dateIdx}`}
                                      className={`border border-gray-200 p-0 ${
                                        isSearchedDate ? 'border-l-4 border-r-4 border-blue-500' : ''
                                      } ${
                                        isFocused ? 'ring-4 ring-purple-500 ring-inset' : ''
                                      }`}
                                      onClick={() => setFocusedCell({ siteIndex: siteIdx, dateIndex: dateIdx })}
                                    >
                                      <div 
                                        className={`h-12 w-full ${
                                          isBooked 
                                            ? 'bg-red-500 hover:bg-red-600' 
                                            : 'bg-green-500 hover:bg-green-600'
                                        } transition-colors cursor-pointer`}
                                        title={(() => {
                                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                          const rate = isWeekend && site.weekendPricePerDay 
                                            ? `$${site.weekendPricePerDay}` 
                                            : `$${site.pricePerDay}`;
                                          return `Site ${site.siteNumber} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? 'Booked' : 'Available'} - ${rate}/day`;
                                        })()}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Site Details Below Heatmap */}
                    <div className="mt-8 space-y-4">
                      <h3 className="text-lg font-semibold">Site Details</h3>
                      {centreSites.map((site) => {
                        const availability = data.availability.find((a) => a.siteId === site.id);
                        
                        return (
                          <Card 
                            key={`site-detail-casual-${centre.id}-${site.id}`} 
                            className={`border-l-4 ${
                              isMatchedSite(site.id) 
                                ? 'border-l-yellow-500 bg-yellow-50 shadow-lg' 
                                : 'border-l-blue-500'
                            }`}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                {/* Site Image */}
                                <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                  {site.imageUrl1 ? (
                                    <img
                                      src={site.imageUrl1}
                                      alt={`Site ${site.siteNumber}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 text-center p-2">
                                      Image coming soon
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CardTitle className="text-lg">Site {site.siteNumber}</CardTitle>
                                    {/* Show size match badge */}
                                    {site.sizeMatch === 'perfect' && (
                                      <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Perfect Match
                                      </Badge>
                                    )}
                                    {site.sizeMatch === 'larger' && (
                                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Larger Available
                                      </Badge>
                                    )}
                                    {/* Show checkmark badge if site accepts selected category */}
                                    {selectedCategoryId && data.siteCategories && data.siteCategories[site.id] && (() => {
                                      const siteCategories = data.siteCategories[site.id];
                                      // Empty array means all categories accepted
                                      const acceptsCategory = siteCategories.length === 0 || 
                                        siteCategories.some((cat: any) => cat.id === selectedCategoryId);
                                      return acceptsCategory ? (
                                        <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Accepts Your Category
                                        </Badge>
                                      ) : null;
                                    })()}
                                  </div>
                                  <CardDescription className="mt-2">
                                    {site.description}
                                  </CardDescription>

                                </div>
                                <Button
                                  onClick={() => setLocation(`/site/${site.id}`)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  View Details & Book
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <p className="text-sm">
                                    <span className="font-semibold">Size:</span> {site.size}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-semibold">Max Tables:</span> {site.maxTables || "N/A"}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-semibold">Power:</span> {site.powerAvailable}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm">
                                    <span className="font-semibold">Price:</span> ${site.pricePerDay}/day
                                    {site.weekendPricePerDay && ` (Mon-Fri), $${site.weekendPricePerDay}/day (Sat-Sun)`}
                                    {' '}or ${site.pricePerWeek}/week
                                  </p>
                                  {site.restrictions && (
                                    <p className="text-sm">
                                      <span className="font-semibold">Restrictions:</span> {site.restrictions}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {/* Show "Show me all sized sites" link if size filter is active and results are filtered */}
                      {(() => {
                        const parsed = parseSearchQuery(searchParams.query);
                        const hasSizeFilter = parsed.minSizeM2 !== undefined;
                        if (hasSizeFilter && centreSites.length > 0) {
                          return (
                            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  // Remove size requirements from query
                                  const newQuery = parsed.centreName || searchParams.query.split(/\d/)[0].trim();
                                  const params = new URLSearchParams();
                                  params.set('query', newQuery);
                                  params.set('date', format(searchParams.date, 'yyyy-MM-dd'));
                                  if (selectedCategoryId) {
                                    params.set('category', selectedCategoryId.toString());
                                  }
                                  if (showOnlyAutoApproved) {
                                    params.set('autoApproved', 'true');
                                  }
                                  setLocation(`/search?${params.toString()}`);
                                  window.location.href = `/search?${params.toString()}`;
                                }}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Show me all sized sites in this centre
                              </Button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Centre Floor Plan Map - Show below sites listing */}
            {data.floorLevels && data.floorLevels.length > 0 && data.floorLevels.some((fl: any) => fl.mapImageUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>Centre Floor Plan</CardTitle>
                  <CardDescription>
                    Click on any site marker to view details and book
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveMap
                    centreId={data.centres[0].id}
                    mapUrl={data.floorLevels.find((fl: any) => fl.mapImageUrl)?.mapImageUrl || ''}
                    sites={data.sites}
                    centreName={data.centres[0].name}
                    assetTypeFilter={selectedAssetType}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Nearby Centres Map */}
            {data.centres.length > 0 && data.centres[0].latitude && data.centres[0].longitude && (
              <div className="mt-8">
                <NearbyCentresMap 
                  centreId={data.centres[0].id} 
                  centreName={data.centres[0].name}
                  centreLatitude={data.centres[0].latitude}
                  centreLongitude={data.centres[0].longitude}
                  radiusKm={10}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
