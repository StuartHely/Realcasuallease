import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, ArrowLeft, Calendar, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, CalendarDays, Store, Zap, Layers, FileText, Search as SearchIcon, Star, HelpCircle, DollarSign, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse, addDays, isSameDay, subDays, isBefore, startOfDay } from "date-fns";
import InteractiveMap from "@/components/InteractiveMap";
import { NearbyCentresMap } from "@/components/NearbyCentresMap";
import { SearchSkeleton } from "@/components/SearchSkeleton";
import { parseSearchQuery } from "@/../../shared/queryParser";
import { ImageWithFallback } from "@/components/ImageWithFallback";

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState<{ query: string; date: Date } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ siteIndex: number; dateIndex: number } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showOnlyAutoApproved, setShowOnlyAutoApproved] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<"casual_leasing" | "vacant_shops" | "third_line" | "all">("casual_leasing");
  const calendarDays = 14; // Fixed 14-day view
  
  // State for calendar date selection and expanded site tile
  const [dateSelection, setDateSelection] = useState<{
    siteId: number | string;
    assetType: "casual_leasing" | "vacant_shops" | "third_line";
    startDate: Date | null;
    endDate: Date | null;
    isSelecting: boolean;
  } | null>(null);
  const [expandedSiteId, setExpandedSiteId] = useState<number | string | null>(null);
  const expandedSiteRef = useRef<HTMLDivElement>(null);
  const expandedVSRef = useRef<HTMLDivElement>(null);
  const expandedTLIRef = useRef<HTMLDivElement>(null);

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
    { enabled: centreIds.length > 0 }
  );
  const { data: thirdLineIncome } = trpc.thirdLineIncome.getByCentre.useQuery(
    { centreId: centreIds[0] || 0 },
    { enabled: centreIds.length > 0 }
  );
  
  // Fetch availability calendars for VS and TLI
  const { data: vsAvailability } = trpc.vacantShopBookings.getAvailabilityCalendar.useQuery(
    { 
      centreId: centreIds[0] || 0,
      startDate: searchParams?.date || new Date(),
      endDate: addDays(searchParams?.date || new Date(), calendarDays - 1)
    },
    { enabled: centreIds.length > 0 && (selectedAssetType === "vacant_shops" || selectedAssetType === "all") }
  );
  const { data: tliAvailability } = trpc.thirdLineBookings.getAvailabilityCalendar.useQuery(
    { 
      centreId: centreIds[0] || 0,
      startDate: searchParams?.date || new Date(),
      endDate: addDays(searchParams?.date || new Date(), calendarDays - 1)
    },
    { enabled: centreIds.length > 0 && (selectedAssetType === "third_line" || selectedAssetType === "all") }
  );
  
  // Fetch CL sites when search was for VS/3rdL but user switches to CL tab
  const needsCLSites = !!(data?.assetType && data.assetType !== 'casual' && (selectedAssetType === "casual_leasing" || selectedAssetType === "all"));
  const { data: casualLeasingSites } = trpc.centres.getSites.useQuery(
    { centreId: centreIds[0] || 0 },
    { enabled: centreIds.length > 0 && needsCLSites }
  );

  // Combine all asset types for the interactive map
  const combinedSites = useMemo(() => {
    const sites = [];
    
    // Add sites from search results (respecting their existing assetType)
    if (data?.sites) {
      sites.push(...data.sites.map((site: any) => ({
        ...site,
        // Preserve existing assetType from API, default to casual_leasing only if not set
        assetType: site.assetType || "casual_leasing" as const
      })));
    }
    
    // Add CL sites fetched separately (when search was for VS/3rdL)
    if (casualLeasingSites) {
      sites.push(...casualLeasingSites.map((site: any) => ({
        ...site,
        assetType: "casual_leasing" as const
      })));
    }
    
    // Add vacant shops
    if (vacantShops) {
      sites.push(...vacantShops.map((shop: any) => ({
        ...shop,
        id: `vs-${shop.id}`,
        originalId: shop.id,
        displayNumber: shop.shopNumber,
        assetType: "vacant_shops" as const
      })));
    }
    
    // Add third line income
    if (thirdLineIncome) {
      sites.push(...thirdLineIncome.map((asset: any) => ({
        ...asset,
        id: `tli-${asset.id}`,
        originalId: asset.id,
        displayNumber: asset.assetNumber,
        assetType: "third_line" as const
      })));
    }
    
    return sites;
  }, [data?.sites, casualLeasingSites, vacantShops, thirdLineIncome]);

  // Determine if a site is matched by the search query
  const isMatchedSite = (siteId: number) => {
    if (!data?.matchedSiteIds || !Array.isArray(data.matchedSiteIds)) return false;
    return (data.matchedSiteIds as number[]).includes(siteId);
  };

  // Auto-select asset type based on search response
  useEffect(() => {
    if (data?.assetType) {
      if (data.assetType === 'vacant_shop') {
        setSelectedAssetType('vacant_shops');
      } else if (data.assetType === 'third_line') {
        setSelectedAssetType('third_line');
      }
    }
  }, [data?.assetType]);

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

  // Count available sites by type
  const casualLeasingCount = useMemo(() => {
    const clSites = data?.sites?.filter((s: any) => s.assetType === 'casual_leasing' || !s.assetType) || [];
    const fetchedCLSites = casualLeasingSites || [];
    return clSites.length + fetchedCLSites.length;
  }, [data?.sites, casualLeasingSites]);

  const vacantShopsCount = vacantShops?.length || 0;
  const thirdLineCount = thirdLineIncome?.length || 0;

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
              <img src="/logo.png" alt="Real Casual Leasing" className="h-12" />
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
          
          {/* Search Interpretation Banner */}
          {data?.searchInterpretation && (
            (() => {
              const interp = data.searchInterpretation;
              const hasMeaningfulInterpretation = interp.productCategory || interp.location || interp.state || interp.budget || interp.dateRange;
              if (!hasMeaningfulInterpretation) return null;
              
              const parts: string[] = [];
              if (interp.productCategory) {
                parts.push(interp.productCategory.charAt(0).toUpperCase() + interp.productCategory.slice(1));
              }
              if (interp.location) {
                const loc = interp.location + (interp.state ? `, ${interp.state}` : '');
                parts.push(`in ${loc}`);
              } else if (interp.state) {
                parts.push(`in ${interp.state}`);
              }
              
              return (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <SearchIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">
                        Showing: {parts.join(' ') || searchParams.query}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {interp.productCategory && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Category: {interp.productCategory}
                          </Badge>
                        )}
                        {(interp.location || interp.state) && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <MapPin className="h-3 w-3 mr-1" />
                            {interp.location || interp.state}
                          </Badge>
                        )}
                        {interp.dateRange ? (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            <Calendar className="h-3 w-3 mr-1" />
                            {interp.dateRange.end
                              ? `${interp.dateRange.start} to ${interp.dateRange.end}`
                              : interp.dateRange.start}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            This week
                          </Badge>
                        )}
                        {interp.budget && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {interp.budget.maxPerDay
                              ? `Under $${interp.budget.maxPerDay}/day`
                              : interp.budget.maxPerWeek
                              ? `Under $${interp.budget.maxPerWeek}/week`
                              : `Budget $${interp.budget.maxTotal}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setLocation("/")}
                    >
                      Edit Search
                    </Button>
                  </div>
                </div>
              );
            })()
          )}

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
          
          {/* Asset Type Filter - only show if there are sites available */}
          {(casualLeasingCount > 0 || vacantShopsCount > 0 || thirdLineCount > 0) && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Asset Type:</span>
            <div className="flex flex-wrap gap-2">
              {casualLeasingCount > 0 && (
              <Button
                variant={selectedAssetType === "casual_leasing" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("casual_leasing")}
                className="flex items-center gap-1.5"
              >
                <MapPin className="h-4 w-4" />
                Casual Leasing
              </Button>
              )}
              {vacantShopsCount > 0 && (
              <Button
                variant={selectedAssetType === "vacant_shops" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("vacant_shops")}
                className="flex items-center gap-1.5"
              >
                <Store className="h-4 w-4" />
                Vacant Shops
              </Button>
              )}
              {thirdLineCount > 0 && (
              <Button
                variant={selectedAssetType === "third_line" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("third_line")}
                className="flex items-center gap-1.5"
              >
                <Zap className="h-4 w-4" />
                Third Line Income
              </Button>
              )}
              {(casualLeasingCount > 0 && vacantShopsCount > 0) || (casualLeasingCount > 0 && thirdLineCount > 0) || (vacantShopsCount > 0 && thirdLineCount > 0) ? (
              <Button
                variant={selectedAssetType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType("all")}
                className="flex items-center gap-1.5"
              >
                <Layers className="h-4 w-4" />
                All Assets
              </Button>
              ) : null}
            </div>
          </div>
          )}
          
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
          {data?.sizeNotAvailable && !data?.closestMatch && !data?.categoryNotAvailable && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium text-2xl">
                Your requested size is not available. Let me show you the other sites.
              </p>
            </div>
          )}
          {/* Show message when category is not available at this centre */}
          {data?.categoryNotAvailable && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium text-lg">
                This product category is not permitted at this centre. Please try a different centre or search without the category filter.
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
            {/* Vacant Shops Section with Calendar */}
            {(selectedAssetType === "vacant_shops" || selectedAssetType === "all") && vsAvailability && vsAvailability.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl mb-1 flex items-center gap-2">
                    <Store className="h-6 w-6 text-green-600" />
                    Vacant Shops at {data.centres[0]?.name}
                  </CardTitle>
                  <CardDescription>
                    Short-term vacant shop tenancies available for weekly or monthly booking. Click on calendar dates to select your booking period.
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
                  
                  {/* Calendar Heatmap */}
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <table className="w-full border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2">
                              Shop
                            </th>
                            {dateRange.map((date, idx) => {
                              const isSearchedDate = searchParams && isSameDay(date, searchParams.date);
                              const dayOfWeek = date.getDay();
                              const isSaturday = dayOfWeek === 6;
                              const isSunday = dayOfWeek === 0;
                              const isWeekend = isSaturday || isSunday;
                              const prevDate = idx > 0 ? dateRange[idx - 1] : null;
                              const nextDate = idx < dateRange.length - 1 ? dateRange[idx + 1] : null;
                              const isPrevWeekend = prevDate ? (prevDate.getDay() === 0 || prevDate.getDay() === 6) : false;
                              const isNextWeekend = nextDate ? (nextDate.getDay() === 0 || nextDate.getDay() === 6) : false;
                              
                              return (
                              <th 
                                key={idx} 
                                className={`px-2 py-2 text-center text-xs font-medium min-w-[80px] border border-gray-200 ${
                                  isSearchedDate ? 'bg-blue-50' : isWeekend ? 'bg-gray-100' : ''
                                } ${
                                  isWeekend ? '!border-t-[3px] !border-t-green-700 !border-solid' : 'border-b-2'
                                } ${
                                  isWeekend && !isPrevWeekend ? '!border-l-[3px] !border-l-green-700 !border-solid' : ''
                                } ${
                                  isWeekend && !isNextWeekend ? '!border-r-[3px] !border-r-green-700 !border-solid' : ''
                                }`}
                              >
                                <div className={isWeekend ? 'font-semibold' : ''}>{format(date, "dd/MM")}</div>
                                <div className={isWeekend ? 'text-gray-700 font-medium' : 'text-gray-500'}>{format(date, "EEE")}</div>
                              </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {vsAvailability.map((shop: any, shopIdx: number) => {
                            const shopId = `vs-${shop.id}`;
                            return (
                            <tr key={shopId} className="hover:bg-gray-50">
                              <td className="sticky left-0 bg-white z-10 px-3 py-2 font-medium border-r-2 border-b">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Store className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-semibold">Shop {shop.shopNumber}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setLocation(`/vacant-shop/${shop.id}`)}
                                    >
                                      View
                                    </Button>
                                  </div>
                                  <div className="flex gap-2 text-xs text-gray-600">
                                    {shop.totalSizeM2 && <span>{shop.totalSizeM2}m²</span>}
                                    {shop.pricePerWeek && <span>• ${shop.pricePerWeek}/week</span>}
                                  </div>
                                </div>
                              </td>
                              {dateRange.map((date, dateIdx) => {
                                const checkDate = new Date(date);
                                checkDate.setHours(0, 0, 0, 0);
                                const isBooked = shop.bookings?.some((b: any) => {
                                  const bookingStart = new Date(b.startDate);
                                  bookingStart.setHours(0, 0, 0, 0);
                                  const bookingEnd = new Date(b.endDate);
                                  bookingEnd.setHours(0, 0, 0, 0);
                                  return checkDate >= bookingStart && checkDate <= bookingEnd;
                                });
                                const dayOfWeek = date.getDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const prevDate = dateIdx > 0 ? dateRange[dateIdx - 1] : null;
                                const nextDate = dateIdx < dateRange.length - 1 ? dateRange[dateIdx + 1] : null;
                                const isPrevWeekend = prevDate ? (prevDate.getDay() === 0 || prevDate.getDay() === 6) : false;
                                const isNextWeekend = nextDate ? (nextDate.getDay() === 0 || nextDate.getDay() === 6) : false;
                                const isLastRow = shopIdx === vsAvailability.length - 1;
                                
                                // Check if this cell is part of the current selection
                                const isStartDate = dateSelection?.siteId === shopId && dateSelection?.startDate && isSameDay(date, dateSelection.startDate);
                                const isEndDate = dateSelection?.siteId === shopId && dateSelection?.endDate && isSameDay(date, dateSelection.endDate);
                                const isInRange = dateSelection?.siteId === shopId && dateSelection?.startDate && dateSelection?.endDate &&
                                  date >= dateSelection.startDate && date <= dateSelection.endDate;
                                const isSelectingStart = dateSelection?.siteId === shopId && dateSelection?.isSelecting && dateSelection?.startDate && isSameDay(date, dateSelection.startDate);
                                
                                return (
                                  <td 
                                    key={dateIdx}
                                    className={`p-0 border border-gray-200 ${
                                      isWeekend && !isPrevWeekend ? '!border-l-[3px] !border-l-green-700 !border-solid' : ''
                                    } ${
                                      isWeekend && !isNextWeekend ? '!border-r-[3px] !border-r-green-700 !border-solid' : ''
                                    } ${
                                      isWeekend && isLastRow ? '!border-b-[3px] !border-b-green-700 !border-solid' : ''
                                    }`}
                                    onClick={() => {
                                      if (!isBooked) {
                                        if (!dateSelection || dateSelection.siteId !== shopId || !dateSelection.isSelecting || dateSelection.assetType !== "vacant_shops") {
                                          // Start new selection (or restart if different site/asset type)
                                          setDateSelection({
                                            siteId: shopId,
                                            assetType: "vacant_shops",
                                            startDate: date,
                                            endDate: null,
                                            isSelecting: true
                                          });
                                        } else if (dateSelection.isSelecting && dateSelection.startDate && dateSelection.siteId === shopId) {
                                          // Complete selection (only if same site)
                                          const start = dateSelection.startDate;
                                          const end = date;
                                          const finalStart = start <= end ? start : end;
                                          const finalEnd = start <= end ? end : start;
                                          setDateSelection({
                                            siteId: shopId,
                                            assetType: "vacant_shops",
                                            startDate: finalStart,
                                            endDate: finalEnd,
                                            isSelecting: false
                                          });
                                          setExpandedSiteId(shopId);
                                          setTimeout(() => {
                                            expandedVSRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }, 100);
                                        }
                                      }
                                    }}
                                  >
                                    <div 
                                      className={`h-12 w-full relative ${
                                        isBooked 
                                          ? 'bg-red-500 hover:bg-red-600' 
                                          : isInRange || isSelectingStart
                                            ? 'bg-blue-500 hover:bg-blue-600'
                                            : 'bg-green-500 hover:bg-green-600'
                                      } transition-colors cursor-pointer`}
                                      title={`Shop ${shop.shopNumber} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? 'Booked' : 'Available - Click to select'}`}
                                    >
                                      {(isStartDate || isEndDate) && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">
                                            {isStartDate && isEndDate ? 'START/END' : isStartDate ? 'START' : 'END'}
                                          </span>
                                        </div>
                                      )}
                                      {isSelectingStart && !isEndDate && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">START</span>
                                        </div>
                                      )}
                                    </div>
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
                  
                  {/* Scroll Down Instruction */}
                  <div className="mt-8 mb-6 text-center">
                    <p className="text-lg font-semibold text-blue-900">
                      Scroll Down for Site Details and Centre Map
                    </p>
                  </div>

                  {/* Site Details Below Heatmap */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Shop Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                    {/* Date selection instruction */}
                    {dateSelection?.assetType === "vacant_shops" && dateSelection?.isSelecting && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 font-medium flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Click on another date in the calendar above to set your end date
                        </p>
                      </div>
                    )}
                    {vsAvailability.map((shop: any) => {
                      const shopId = `vs-${shop.id}`;
                      const isExpanded = expandedSiteId === shopId;
                      const hasSelectedDates = dateSelection?.siteId === shopId && dateSelection?.startDate && dateSelection?.endDate;
                      
                      return (
                        <Card 
                          key={`shop-detail-${shop.id}`} 
                          ref={isExpanded ? expandedVSRef : null}
                          className={`border-l-4 transition-all duration-300 ${
                            isExpanded 
                              ? 'border-l-blue-600 ring-2 ring-blue-300 shadow-xl' 
                              : 'border-l-green-500'
                          }`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              {/* Shop Image */}
                              <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                <ImageWithFallback
                                  src={shop.imageUrl1}
                                  alt={`Shop ${shop.shopNumber}`}
                                  className="w-full h-full object-cover"
                                  containerClassName="w-full h-full"
                                  placeholder={{ type: "shop", number: shop.shopNumber || "", size: shop.totalSizeM2 || "" }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Store className="h-5 w-5 text-green-600" />
                                    Shop {shop.shopNumber}
                                  </CardTitle>
                                  {hasSelectedDates && (
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Dates Selected
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription className="mt-2">
                                  {shop.description}
                                </CardDescription>
                              </div>
                              <Button
                                onClick={() => setLocation(`/vacant-shop/${shop.id}`)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                View Details
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold">Size:</span> {shop.totalSizeM2 ? `${shop.totalSizeM2}m²` : 'N/A'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Dimensions:</span> {shop.dimensions || 'N/A'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Powered:</span> {shop.powered ? 'Yes' : 'No'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold">Price:</span> ${shop.pricePerWeek}/week or ${shop.pricePerMonth}/month
                                </p>
                                {parseFloat(shop.outgoingsPerDay || "0") > 0 && (
                                  <p className="text-sm">
                                    <span className="font-semibold">Outgoings:</span> ${shop.outgoingsPerDay}/day
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Expanded Booking Section */}
                            {hasSelectedDates && isExpanded && (
                              <div className="mt-6 pt-6 border-t border-green-200 bg-green-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                                <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                                  <Calendar className="h-5 w-5" />
                                  Complete Your Booking
                                </h4>
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">Start Date:</span>
                                      <span className="text-sm font-semibold text-green-800">
                                        {dateSelection.startDate && format(dateSelection.startDate, "dd/MM/yyyy (EEE)")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">End Date:</span>
                                      <span className="text-sm font-semibold text-green-800">
                                        {dateSelection.endDate && format(dateSelection.endDate, "dd/MM/yyyy (EEE)")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">Duration:</span>
                                      <span className="text-sm font-semibold text-green-800">
                                        {dateSelection.startDate && dateSelection.endDate && 
                                          `${Math.ceil((dateSelection.endDate.getTime() - dateSelection.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                                        }
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">Weekly Rate:</span>
                                      <span className="text-sm font-semibold">${shop.pricePerWeek}/week</span>
                                    </div>
                                    {(() => {
                                      if (!dateSelection.startDate || !dateSelection.endDate) return null;
                                      const days = Math.ceil((dateSelection.endDate.getTime() - dateSelection.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                      const weeks = Math.ceil(days / 7);
                                      const subtotal = weeks * (shop.pricePerWeek || 0);
                                      const outgoingsRate = parseFloat(shop.outgoingsPerDay || "0");
                                      const totalOutgoings = outgoingsRate * days;
                                      const gst = (subtotal + totalOutgoings) * 0.1;
                                      const total = subtotal + totalOutgoings + gst;
                                      return (
                                        <>
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700 w-24">Subtotal:</span>
                                            <span className="text-sm">${subtotal.toFixed(2)} ({weeks} week{weeks > 1 ? 's' : ''})</span>
                                          </div>
                                          {totalOutgoings > 0 && (
                                            <div className="flex items-center gap-3">
                                              <span className="text-sm font-medium text-gray-700 w-24">Outgoings:</span>
                                              <span className="text-sm">{days} × ${outgoingsRate.toFixed(2)} = ${totalOutgoings.toFixed(2)}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700 w-24">GST (10%):</span>
                                            <span className="text-sm">${gst.toFixed(2)}</span>
                                          </div>
                                          <div className="flex items-center gap-3 pt-2 border-t border-green-300">
                                            <span className="text-sm font-bold text-gray-700 w-24">Total:</span>
                                            <span className="text-lg font-bold text-green-700">${total.toFixed(2)}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                  <Button
                                    onClick={() => {
                                      const params = new URLSearchParams();
                                      if (dateSelection.startDate) params.set('startDate', format(dateSelection.startDate, 'yyyy-MM-dd'));
                                      if (dateSelection.endDate) params.set('endDate', format(dateSelection.endDate, 'yyyy-MM-dd'));
                                      setLocation(`/vacant-shop/${shop.id}?${params.toString()}`);
                                    }}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                  >
                                    Proceed to Book
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setDateSelection(null);
                                      setExpandedSiteId(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Third Line Income Section with Calendar */}
            {(selectedAssetType === "third_line" || selectedAssetType === "all") && tliAvailability && tliAvailability.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl mb-1 flex items-center gap-2">
                    <Zap className="h-6 w-6 text-purple-600" />
                    Third Line Income at {data.centres[0]?.name}
                  </CardTitle>
                  <CardDescription>
                    Non-tenancy assets such as vending machines, signage, and installations. Click on calendar dates to select your booking period.
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
                  
                  {/* Calendar Heatmap */}
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <table className="w-full border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2">
                              Asset
                            </th>
                            {dateRange.map((date, idx) => {
                              const isSearchedDate = searchParams && isSameDay(date, searchParams.date);
                              const dayOfWeek = date.getDay();
                              const isSaturday = dayOfWeek === 6;
                              const isSunday = dayOfWeek === 0;
                              const isWeekend = isSaturday || isSunday;
                              const prevDate = idx > 0 ? dateRange[idx - 1] : null;
                              const nextDate = idx < dateRange.length - 1 ? dateRange[idx + 1] : null;
                              const isPrevWeekend = prevDate ? (prevDate.getDay() === 0 || prevDate.getDay() === 6) : false;
                              const isNextWeekend = nextDate ? (nextDate.getDay() === 0 || nextDate.getDay() === 6) : false;
                              
                              return (
                              <th 
                                key={idx} 
                                className={`px-2 py-2 text-center text-xs font-medium min-w-[80px] border border-gray-200 ${
                                  isSearchedDate ? 'bg-blue-50' : isWeekend ? 'bg-gray-100' : ''
                                } ${
                                  isWeekend ? '!border-t-[3px] !border-t-purple-700 !border-solid' : 'border-b-2'
                                } ${
                                  isWeekend && !isPrevWeekend ? '!border-l-[3px] !border-l-purple-700 !border-solid' : ''
                                } ${
                                  isWeekend && !isNextWeekend ? '!border-r-[3px] !border-r-purple-700 !border-solid' : ''
                                }`}
                              >
                                <div className={isWeekend ? 'font-semibold' : ''}>{format(date, "dd/MM")}</div>
                                <div className={isWeekend ? 'text-gray-700 font-medium' : 'text-gray-500'}>{format(date, "EEE")}</div>
                              </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {tliAvailability.map((asset: any, assetIdx: number) => {
                            const assetId = `tli-${asset.id}`;
                            return (
                            <tr key={assetId} className="hover:bg-gray-50">
                              <td className="sticky left-0 bg-white z-10 px-3 py-2 font-medium border-r-2 border-b">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-semibold">{asset.assetNumber}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setLocation(`/third-line/${asset.id}`)}
                                    >
                                      View
                                    </Button>
                                  </div>
                                  <div className="flex gap-2 text-xs text-gray-600">
                                    {asset.categoryName && <span>{asset.categoryName}</span>}
                                    {asset.pricePerWeek && <span>• ${asset.pricePerWeek}/week</span>}
                                  </div>
                                </div>
                              </td>
                              {dateRange.map((date, dateIdx) => {
                                const checkDate = new Date(date);
                                checkDate.setHours(0, 0, 0, 0);
                                const isBooked = asset.bookings?.some((b: any) => {
                                  const bookingStart = new Date(b.startDate);
                                  bookingStart.setHours(0, 0, 0, 0);
                                  const bookingEnd = new Date(b.endDate);
                                  bookingEnd.setHours(0, 0, 0, 0);
                                  return checkDate >= bookingStart && checkDate <= bookingEnd;
                                });
                                const dayOfWeek = date.getDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const prevDate = dateIdx > 0 ? dateRange[dateIdx - 1] : null;
                                const nextDate = dateIdx < dateRange.length - 1 ? dateRange[dateIdx + 1] : null;
                                const isPrevWeekend = prevDate ? (prevDate.getDay() === 0 || prevDate.getDay() === 6) : false;
                                const isNextWeekend = nextDate ? (nextDate.getDay() === 0 || nextDate.getDay() === 6) : false;
                                const isLastRow = assetIdx === tliAvailability.length - 1;
                                
                                // Check if this cell is part of the current selection
                                const isStartDate = dateSelection?.siteId === assetId && dateSelection?.startDate && isSameDay(date, dateSelection.startDate);
                                const isEndDate = dateSelection?.siteId === assetId && dateSelection?.endDate && isSameDay(date, dateSelection.endDate);
                                const isInRange = dateSelection?.siteId === assetId && dateSelection?.startDate && dateSelection?.endDate &&
                                  date >= dateSelection.startDate && date <= dateSelection.endDate;
                                const isSelectingStart = dateSelection?.siteId === assetId && dateSelection?.isSelecting && dateSelection?.startDate && isSameDay(date, dateSelection.startDate);
                                
                                return (
                                  <td 
                                    key={dateIdx}
                                    className={`p-0 border border-gray-200 ${
                                      isWeekend && !isPrevWeekend ? '!border-l-[3px] !border-l-purple-700 !border-solid' : ''
                                    } ${
                                      isWeekend && !isNextWeekend ? '!border-r-[3px] !border-r-purple-700 !border-solid' : ''
                                    } ${
                                      isWeekend && isLastRow ? '!border-b-[3px] !border-b-purple-700 !border-solid' : ''
                                    }`}
                                    onClick={() => {
                                      if (!isBooked) {
                                        if (!dateSelection || dateSelection.siteId !== assetId || !dateSelection.isSelecting || dateSelection.assetType !== "third_line") {
                                          // Start new selection (or restart if different site/asset type)
                                          setDateSelection({
                                            siteId: assetId,
                                            assetType: "third_line",
                                            startDate: date,
                                            endDate: null,
                                            isSelecting: true
                                          });
                                        } else if (dateSelection.isSelecting && dateSelection.startDate && dateSelection.siteId === assetId) {
                                          // Complete selection (only if same site)
                                          const start = dateSelection.startDate;
                                          const end = date;
                                          const finalStart = start <= end ? start : end;
                                          const finalEnd = start <= end ? end : start;
                                          setDateSelection({
                                            siteId: assetId,
                                            assetType: "third_line",
                                            startDate: finalStart,
                                            endDate: finalEnd,
                                            isSelecting: false
                                          });
                                          setExpandedSiteId(assetId);
                                          setTimeout(() => {
                                            expandedTLIRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }, 100);
                                        }
                                      }
                                    }}
                                  >
                                    <div 
                                      className={`h-12 w-full relative ${
                                        isBooked 
                                          ? 'bg-red-500 hover:bg-red-600' 
                                          : isInRange || isSelectingStart
                                            ? 'bg-purple-500 hover:bg-purple-600'
                                            : 'bg-green-500 hover:bg-green-600'
                                      } transition-colors cursor-pointer`}
                                      title={`${asset.assetNumber} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? 'Booked' : 'Available - Click to select'}`}
                                    >
                                      {(isStartDate || isEndDate) && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">
                                            {isStartDate && isEndDate ? 'START/END' : isStartDate ? 'START' : 'END'}
                                          </span>
                                        </div>
                                      )}
                                      {isSelectingStart && !isEndDate && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">START</span>
                                        </div>
                                      )}
                                    </div>
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
                  
                  {/* Scroll Down Instruction */}
                  <div className="mt-8 mb-6 text-center">
                    <p className="text-lg font-semibold text-blue-900">
                      Scroll Down for Site Details and Centre Map
                    </p>
                  </div>

                  {/* Asset Details Below Heatmap */}
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold">Asset Details</h3>
                    {/* Date selection instruction */}
                    {dateSelection?.assetType === "third_line" && dateSelection?.isSelecting && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-purple-800 font-medium flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Click on another date in the calendar above to set your end date
                        </p>
                      </div>
                    )}
                    {tliAvailability.map((asset: any) => {
                      const assetId = `tli-${asset.id}`;
                      const isExpanded = expandedSiteId === assetId;
                      const hasSelectedDates = dateSelection?.siteId === assetId && dateSelection?.startDate && dateSelection?.endDate;
                      
                      return (
                        <Card 
                          key={`asset-detail-${asset.id}`} 
                          ref={isExpanded ? expandedTLIRef : null}
                          className={`border-l-4 transition-all duration-300 ${
                            isExpanded 
                              ? 'border-l-purple-600 ring-2 ring-purple-300 shadow-xl' 
                              : 'border-l-purple-500'
                          }`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              {/* Asset Image */}
                              <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                <ImageWithFallback
                                  src={asset.imageUrl1}
                                  alt={asset.assetNumber}
                                  className="w-full h-full object-cover"
                                  containerClassName="w-full h-full"
                                  placeholder={{ type: "asset", number: asset.assetNumber || "", label: asset.categoryName || "" }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-purple-600" />
                                    {asset.assetNumber}
                                  </CardTitle>
                                  {asset.categoryName && (
                                    <Badge variant="secondary">{asset.categoryName}</Badge>
                                  )}
                                  {hasSelectedDates && (
                                    <Badge className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Dates Selected
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription className="mt-2">
                                  {asset.description}
                                </CardDescription>
                              </div>
                              <Button
                                onClick={() => setLocation(`/third-line/${asset.id}`)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                View Details
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold">Dimensions:</span> {asset.dimensions || 'N/A'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Powered:</span> {asset.powered ? 'Yes' : 'No'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold">Price:</span> ${asset.pricePerWeek}/week or ${asset.pricePerMonth}/month
                                </p>
                                {parseFloat(asset.outgoingsPerDay || "0") > 0 && (
                                  <p className="text-sm">
                                    <span className="font-semibold">Outgoings:</span> ${asset.outgoingsPerDay}/day
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Expanded Booking Section */}
                            {hasSelectedDates && isExpanded && (
                              <div className="mt-6 pt-6 border-t border-purple-200 bg-purple-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                                <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                                  <Calendar className="h-5 w-5" />
                                  Complete Your Booking
                                </h4>
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">Start Date:</span>
                                      <span className="text-sm font-semibold text-purple-800">
                                        {dateSelection.startDate && format(dateSelection.startDate, "dd/MM/yyyy (EEE)")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">End Date:</span>
                                      <span className="text-sm font-semibold text-purple-800">
                                        {dateSelection.endDate && format(dateSelection.endDate, "dd/MM/yyyy (EEE)")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">Duration:</span>
                                      <span className="text-sm font-semibold text-purple-800">
                                        {dateSelection.startDate && dateSelection.endDate && 
                                          `${Math.ceil((dateSelection.endDate.getTime() - dateSelection.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                                        }
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 w-24">Weekly Rate:</span>
                                      <span className="text-sm font-semibold">${asset.pricePerWeek}/week</span>
                                    </div>
                                    {(() => {
                                      if (!dateSelection.startDate || !dateSelection.endDate) return null;
                                      const days = Math.ceil((dateSelection.endDate.getTime() - dateSelection.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                      const weeks = Math.ceil(days / 7);
                                      const subtotal = weeks * (asset.pricePerWeek || 0);
                                      const outgoingsRate = parseFloat(asset.outgoingsPerDay || "0");
                                      const totalOutgoings = outgoingsRate * days;
                                      const gst = (subtotal + totalOutgoings) * 0.1;
                                      const total = subtotal + totalOutgoings + gst;
                                      return (
                                        <>
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700 w-24">Subtotal:</span>
                                            <span className="text-sm">${subtotal.toFixed(2)} ({weeks} week{weeks > 1 ? 's' : ''})</span>
                                          </div>
                                          {totalOutgoings > 0 && (
                                            <div className="flex items-center gap-3">
                                              <span className="text-sm font-medium text-gray-700 w-24">Outgoings:</span>
                                              <span className="text-sm">{days} × ${outgoingsRate.toFixed(2)} = ${totalOutgoings.toFixed(2)}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700 w-24">GST (10%):</span>
                                            <span className="text-sm">${gst.toFixed(2)}</span>
                                          </div>
                                          <div className="flex items-center gap-3 pt-2 border-t border-purple-300">
                                            <span className="text-sm font-bold text-gray-700 w-24">Total:</span>
                                            <span className="text-lg font-bold text-purple-700">${total.toFixed(2)}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                  <Button
                                    onClick={() => {
                                      const params = new URLSearchParams();
                                      if (dateSelection.startDate) params.set('startDate', format(dateSelection.startDate, 'yyyy-MM-dd'));
                                      if (dateSelection.endDate) params.set('endDate', format(dateSelection.endDate, 'yyyy-MM-dd'));
                                      setLocation(`/third-line/${asset.id}?${params.toString()}`);
                                    }}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                  >
                                    Proceed to Book
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setDateSelection(null);
                                      setExpandedSiteId(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Heatmap - Casual Leasing Sites */}
            {(selectedAssetType === "casual_leasing" || selectedAssetType === "all") && data.centres.map((centre) => {
              // Use casualLeasingSites if fetched (when search was for VS/3rdL), otherwise filter from data.sites
              const sitesSource = casualLeasingSites || data.sites;
              let centreSites = sitesSource.filter((s: any) => s.centreId === centre.id && (!s.assetType || s.assetType === 'casual_leasing'));
              
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
                      {centre.majors && <span key={`${centre.id}-majors`} className="block font-bold">Major Stores: {centre.majors}</span>}
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
                          <div className="text-2xl text-red-600 italic font-semibold">
                            {noticeText}
                          </div>
                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleShowAllSites}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Show me all sized sites in this centre
                            </Button>
                          </div>
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
                    {/* Calendar Navigation - Center buttons only */}
                    <div className="flex items-center justify-center mb-3">
                      <div className="flex items-center gap-2">
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
                        <table className="w-full border-separate border-spacing-0">
                          <thead>
                            {/* Navigation row with Previous/Next Week buttons */}
                            <tr>
                              <th className="sticky left-0 bg-white z-10 px-1 py-1 border-r-2">
                                {/* Empty cell above Site column */}
                              </th>
                              <th className="px-1 py-1 text-left" colSpan={1}>
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
                                          className="flex items-center gap-1 text-xs"
                                          disabled={searchParams ? isBefore(subDays(searchParams.date, 7), startOfDay(new Date())) : false}
                                        >
                                          <ChevronLeft className="h-3 w-3" />
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
                              </th>
                              <th colSpan={dateRange.length > 2 ? dateRange.length - 2 : 1}></th>
                              <th className="px-1 py-1 text-right" colSpan={1}>
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
                                  className="flex items-center gap-1 text-xs"
                                >
                                  Next Week
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </th>
                            </tr>
                            {/* Date headers row */}
                            <tr>
                              <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2">
                                Site
                              </th>
                              {dateRange.map((date, idx) => {
                                const isSearchedDate = isSameDay(date, searchParams.date);
                                const dayOfWeek = date.getDay();
                                const isSaturday = dayOfWeek === 6;
                                const isSunday = dayOfWeek === 0;
                                const isWeekend = isSaturday || isSunday;
                                // Check if previous/next day is also weekend for border styling
                                const prevDate = idx > 0 ? dateRange[idx - 1] : null;
                                const nextDate = idx < dateRange.length - 1 ? dateRange[idx + 1] : null;
                                const isPrevWeekend = prevDate ? (prevDate.getDay() === 0 || prevDate.getDay() === 6) : false;
                                const isNextWeekend = nextDate ? (nextDate.getDay() === 0 || nextDate.getDay() === 6) : false;
                                
                                return (
                                <th 
                                  key={idx} 
                                  className={`px-2 py-2 text-center text-xs font-medium min-w-[80px] border border-gray-200 ${
                                    isSearchedDate ? 'bg-blue-50' : isWeekend ? 'bg-gray-100' : ''
                                  } ${
                                    isWeekend ? '!border-t-[3px] !border-t-green-700 !border-solid' : 'border-b-2'
                                  } ${
                                    isWeekend && !isPrevWeekend ? '!border-l-[3px] !border-l-green-700 !border-solid' : ''
                                  } ${
                                    isWeekend && !isNextWeekend ? '!border-r-[3px] !border-r-green-700 !border-solid' : ''
                                  } ${
                                    isSearchedDate ? 'border-l-4 border-r-4 border-blue-500' : ''
                                  }`}
                                >
                                  {isSearchedDate && (
                                    <div className="text-blue-600 font-bold text-[10px] mb-1">SEARCHED</div>
                                  )}
                                  <div className={isSearchedDate ? 'font-bold text-blue-700' : isWeekend ? 'font-semibold' : ''}>{format(date, "dd/MM")}</div>
                                  <div className={isSearchedDate ? 'text-blue-600' : isWeekend ? 'text-gray-700 font-medium' : 'text-gray-500'}>{format(date, "EEE")}</div>
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
                                  const dayOfWeek = date.getDay();
                                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                  const prevDate = dateIdx > 0 ? dateRange[dateIdx - 1] : null;
                                  const nextDate = dateIdx < dateRange.length - 1 ? dateRange[dateIdx + 1] : null;
                                  const isPrevWeekend = prevDate ? (prevDate.getDay() === 0 || prevDate.getDay() === 6) : false;
                                  const isNextWeekend = nextDate ? (nextDate.getDay() === 0 || nextDate.getDay() === 6) : false;
                                  const isLastRow = siteIdx === centreSites.length - 1;
                                  return (
                                    <td 
                                      key={dateIdx}
                                      id={`cell-${siteIdx}-${dateIdx}`}
                                      className={`border border-gray-200 border-solid p-0 ${
                                        isSearchedDate ? 'border-l-4 border-r-4 border-blue-500' : ''
                                      } ${
                                        isFocused ? 'ring-4 ring-purple-500 ring-inset' : ''
                                      } ${
                                        isWeekend && !isPrevWeekend ? '!border-l-[3px] !border-l-green-700 !border-solid' : ''
                                      } ${
                                        isWeekend && !isNextWeekend ? '!border-r-[3px] !border-r-green-700 !border-solid' : ''
                                      } ${
                                        isWeekend && isLastRow ? '!border-b-[3px] !border-b-green-700 !border-solid' : ''
                                      } ${
                                        isWeekend ? 'bg-gray-50' : ''
                                      }`}
                                      onClick={() => {
                                        setFocusedCell({ siteIndex: siteIdx, dateIndex: dateIdx });
                                        // Handle date selection for booking
                                        if (!isBooked) {
                                          if (!dateSelection || dateSelection.siteId !== site.id || !dateSelection.isSelecting || dateSelection.assetType !== "casual_leasing") {
                                            // Start new selection - set start date (or restart if different site/asset type)
                                            setDateSelection({
                                              siteId: site.id,
                                              assetType: "casual_leasing",
                                              startDate: date,
                                              endDate: null,
                                              isSelecting: true
                                            });
                                          } else if (dateSelection.isSelecting && dateSelection.startDate && dateSelection.siteId === site.id) {
                                            // Complete selection - set end date (only if same site)
                                            const start = dateSelection.startDate;
                                            const end = date;
                                            // Ensure start is before end
                                            const finalStart = start <= end ? start : end;
                                            const finalEnd = start <= end ? end : start;
                                            setDateSelection({
                                              siteId: site.id,
                                              assetType: "casual_leasing",
                                              startDate: finalStart,
                                              endDate: finalEnd,
                                              isSelecting: false
                                            });
                                            // Expand the site tile and scroll to it
                                            setExpandedSiteId(site.id);
                                            setTimeout(() => {
                                              expandedSiteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }, 100);
                                          }
                                        }
                                      }}
                                    >
                                      {(() => {
                                        // Check if this cell is part of the current selection
                                        const isStartDate = dateSelection?.siteId === site.id && dateSelection?.startDate && isSameDay(date, dateSelection.startDate);
                                        const isEndDate = dateSelection?.siteId === site.id && dateSelection?.endDate && isSameDay(date, dateSelection.endDate);
                                        const isInRange = dateSelection?.siteId === site.id && dateSelection?.startDate && dateSelection?.endDate &&
                                          date >= dateSelection.startDate && date <= dateSelection.endDate;
                                        const isSelectingStart = dateSelection?.siteId === site.id && dateSelection?.isSelecting && dateSelection?.startDate && isSameDay(date, dateSelection.startDate);
                                        
                                        return (
                                          <div 
                                            className={`h-12 w-full relative ${
                                              isBooked 
                                                ? 'bg-red-500 hover:bg-red-600' 
                                                : isInRange || isSelectingStart
                                                  ? 'bg-blue-500 hover:bg-blue-600'
                                                  : 'bg-green-500 hover:bg-green-600'
                                            } transition-colors cursor-pointer`}
                                            title={(() => {
                                              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                              const rate = isWeekend && site.weekendPricePerDay 
                                                ? `$${site.weekendPricePerDay}` 
                                                : `$${site.pricePerDay}`;
                                              if (isSelectingStart) {
                                                return `Start date selected - Click another date to set end date`;
                                              }
                                              return `Site ${site.siteNumber} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? 'Booked' : 'Available - Click to select'} - ${rate}/day`;
                                            })()}
                                          >
                                            {(isStartDate || isEndDate) && (
                                              <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">
                                                  {isStartDate && isEndDate ? 'START/END' : isStartDate ? 'START' : 'END'}
                                                </span>
                                              </div>
                                            )}
                                            {isSelectingStart && !isEndDate && (
                                              <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">START</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
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

                    {/* Scroll Down Instruction */}
                    <div className="mt-8 mb-6 text-center">
                      <p className="text-lg font-semibold text-blue-900">
                        Scroll Down for Site Details and Centre Map
                      </p>
                    </div>

                    {/* Site Details Below Heatmap — grouped by relevance */}
                    <div className="mt-8">
                      {/* Date selection instruction */}
                      {dateSelection?.isSelecting && (
                        <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 font-medium flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Click on another date in the calendar above to set your end date
                          </p>
                        </div>
                      )}
                      {(() => {
                        const scores = data.siteScores || {};
                        const hasScores = Object.keys(scores).length > 0;
                        
                        const bestMatches = hasScores
                          ? centreSites.filter((s: any) => (scores[s.id]?.total ?? 0) >= 70)
                          : centreSites;
                        const goodMatches = hasScores
                          ? centreSites.filter((s: any) => { const t = scores[s.id]?.total ?? 0; return t >= 40 && t < 70; })
                          : [];
                        const otherOptions = hasScores
                          ? centreSites.filter((s: any) => (scores[s.id]?.total ?? 0) < 40)
                          : [];
                        
                        const renderSiteCard = (site: any) => {
                          const siteAvailability = data.availability.find((a: any) => a.siteId === site.id);
                          const isExpanded = expandedSiteId === site.id;
                          const hasSelectedDates = dateSelection?.siteId === site.id && dateSelection?.startDate && dateSelection?.endDate;
                          const score = scores[site.id];

                        return (
                          <Card 
                            key={`site-detail-casual-${centre.id}-${site.id}`} 
                            ref={isExpanded ? expandedSiteRef : null}
                            className={`border-l-4 transition-all duration-300 ${
                              isExpanded 
                                ? 'border-l-blue-600 ring-2 ring-blue-300 shadow-xl' 
                                : isMatchedSite(site.id) 
                                  ? 'border-l-yellow-500 bg-yellow-50 shadow-lg' 
                                  : 'border-l-blue-500'
                            }`}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                {/* Site Image */}
                                <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                  <ImageWithFallback
                                    src={site.imageUrl1}
                                    alt={`Site ${site.siteNumber}`}
                                    className="w-full h-full object-cover"
                                    containerClassName="w-full h-full"
                                    placeholder={{ type: "site", number: site.siteNumber || "", size: site.size || "", powered: site.powered }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CardTitle className="text-lg">Site {site.siteNumber}</CardTitle>
                                    {/* Score badge */}
                                    {score && hasScores && (
                                      <Badge className={`${
                                        score.total >= 70 ? 'bg-green-600 hover:bg-green-700' :
                                        score.total >= 40 ? 'bg-amber-500 hover:bg-amber-600' :
                                        'bg-gray-500 hover:bg-gray-600'
                                      } text-white`}>
                                        {score.total >= 70 ? '⭐ ' : ''}{score.total}/100
                                      </Badge>
                                    )}
                                    {/* "Why this result?" tooltip */}
                                    {score && score.reasons.length > 0 && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                              <HelpCircle className="h-3.5 w-3.5" />
                                              Why this result?
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="max-w-xs">
                                            <div className="space-y-1 text-xs">
                                              {score.reasons.map((reason: string, i: number) => (
                                                <p key={i}>{reason}</p>
                                              ))}
                                              <div className="border-t border-gray-200 pt-1 mt-1 text-[10px] text-gray-400">
                                                Category {score.categoryMatch}/30 · Location {score.locationMatch}/25 · Availability {score.availability}/20 · Price {score.priceMatch}/15 · Size {score.sizeMatch}/10
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {/* Show selected dates badge */}
                                    {hasSelectedDates && (
                                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Dates Selected
                                      </Badge>
                                    )}
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
                                    {site.description?.replace(/<[^>]*>/g, '')}
                                  </CardDescription>

                                </div>
                                <Button
                                  onClick={() => setLocation(`/site/${site.id}`)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  View Details
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
                                  {parseFloat(site.outgoingsPerDay || "0") > 0 && (
                                    <p className="text-sm">
                                      <span className="font-semibold">Outgoings:</span> ${site.outgoingsPerDay}/day
                                    </p>
                                  )}
                                  {site.restrictions && (
                                    <p className="text-sm">
                                      <span className="font-semibold">Restrictions:</span> {site.restrictions}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Expanded Booking Section - shows when dates are selected from calendar */}
                              {hasSelectedDates && isExpanded && (
                                <div className="mt-6 pt-6 border-t border-blue-200 bg-blue-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Complete Your Booking
                                  </h4>
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <div className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 font-medium">
                                          {dateSelection.startDate ? format(dateSelection.startDate, 'EEEE, d MMMM yyyy') : '—'}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <div className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 font-medium">
                                          {dateSelection.endDate ? format(dateSelection.endDate, 'EEEE, d MMMM yyyy') : '—'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                                        <h5 className="font-semibold text-gray-900 mb-2">Booking Summary</h5>
                                        <div className="space-y-1 text-sm">
                                          <p><span className="text-gray-600">Site:</span> {site.siteNumber}</p>
                                          {(() => {
                                            if (!dateSelection.startDate || !dateSelection.endDate) return <p><span className="text-gray-600">Duration:</span> —</p>;
                                            const start = dateSelection.startDate;
                                            const end = dateSelection.endDate;
                                            let weekdays = 0;
                                            let weekends = 0;
                                            const current = new Date(start);
                                            while (current <= end) {
                                              const day = current.getDay();
                                              if (day === 0 || day === 6) {
                                                weekends++;
                                              } else {
                                                weekdays++;
                                              }
                                              current.setDate(current.getDate() + 1);
                                            }
                                            const totalDays = weekdays + weekends;
                                            const weekdayRate = Number(site.pricePerDay) || 0;
                                            const weekendRate = Number(site.weekendPricePerDay) || weekdayRate;
                                            const subtotal = (weekdays * weekdayRate) + (weekends * weekendRate);
                                            const outgoingsRate = parseFloat(site.outgoingsPerDay || "0");
                                            const totalOutgoings = outgoingsRate * totalDays;
                                            const gst = (subtotal + totalOutgoings) * 0.1;
                                            const total = subtotal + totalOutgoings + gst;
                                            return (
                                              <>
                                                <p><span className="text-gray-600">Duration:</span> {totalDays} day{totalDays > 1 ? 's' : ''}</p>
                                                {weekdays > 0 && <p><span className="text-gray-600">Weekdays:</span> {weekdays} × ${weekdayRate.toFixed(2)} = ${(weekdays * weekdayRate).toFixed(2)}</p>}
                                                {weekends > 0 && <p><span className="text-gray-600">Weekends:</span> {weekends} × ${weekendRate.toFixed(2)} = ${(weekends * weekendRate).toFixed(2)}</p>}
                                                <div className="border-t border-gray-200 mt-2 pt-2">
                                                  <p><span className="text-gray-600">Subtotal:</span> ${subtotal.toFixed(2)}</p>
                                                  {totalOutgoings > 0 && <p><span className="text-gray-600">Outgoings:</span> {totalDays} × ${outgoingsRate.toFixed(2)} = ${totalOutgoings.toFixed(2)}</p>}
                                                  <p><span className="text-gray-600">GST (10%):</span> ${gst.toFixed(2)}</p>
                                                  <p className="font-semibold text-blue-700"><span className="text-gray-700">Total:</span> ${total.toFixed(2)}</p>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      <div className="flex gap-3">
                                        <Button
                                          onClick={() => {
                                            // Navigate to site detail page with pre-filled dates
                                            const params = new URLSearchParams();
                                            if (dateSelection.startDate) params.set('startDate', format(dateSelection.startDate, 'yyyy-MM-dd'));
                                            if (dateSelection.endDate) params.set('endDate', format(dateSelection.endDate, 'yyyy-MM-dd'));
                                            setLocation(`/site/${site.id}?${params.toString()}`);
                                          }}
                                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        >
                                          Proceed to Book
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setDateSelection(null);
                                            setExpandedSiteId(null);
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                        };

                        return (
                          <>
                            {/* Best Matches */}
                            {bestMatches.length > 0 && (
                              <div className="mb-6">
                                {hasScores && (goodMatches.length > 0 || otherOptions.length > 0) && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <Star className="h-5 w-5 text-green-600" />
                                    <h3 className="text-lg font-semibold text-green-800">Best Matches</h3>
                                    <Badge className="bg-green-100 text-green-700">{bestMatches.length}</Badge>
                                  </div>
                                )}
                                {!hasScores && (
                                  <h3 className="text-lg font-semibold mb-4">Site Details</h3>
                                )}
                                <div className="grid md:grid-cols-2 gap-4">
                                  {bestMatches.map(renderSiteCard)}
                                </div>
                              </div>
                            )}

                            {/* Good Matches */}
                            {goodMatches.length > 0 && (
                              <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <CheckCircle className="h-5 w-5 text-amber-500" />
                                  <h3 className="text-lg font-semibold text-amber-700">Good Matches</h3>
                                  <Badge className="bg-amber-100 text-amber-700">{goodMatches.length}</Badge>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {goodMatches.map(renderSiteCard)}
                                </div>
                              </div>
                            )}

                            {/* Other Options — collapsed by default */}
                            {otherOptions.length > 0 && (
                              <div className="mb-6">
                                <button
                                  className="flex items-center gap-2 mb-3 group cursor-pointer"
                                  onClick={(e) => {
                                    const target = e.currentTarget.nextElementSibling;
                                    if (target) {
                                      target.classList.toggle('hidden');
                                      e.currentTarget.querySelector('.chevron-icon')?.classList.toggle('rotate-180');
                                    }
                                  }}
                                >
                                  <Info className="h-5 w-5 text-gray-400" />
                                  <h3 className="text-lg font-semibold text-gray-500">Other Options</h3>
                                  <Badge className="bg-gray-100 text-gray-500">{otherOptions.length}</Badge>
                                  <ChevronDown className="h-4 w-4 text-gray-400 transition-transform chevron-icon" />
                                </button>
                                <div className="hidden">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    {otherOptions.map(renderSiteCard)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
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
            {((data.floorLevels && data.floorLevels.length > 0 && data.floorLevels.some((fl: any) => fl.mapImageUrl)) || data.centres[0]?.mapImageUrl) && (
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
                    mapUrl={data.floorLevels?.find((fl: any) => fl.mapImageUrl)?.mapImageUrl || data.centres[0]?.mapImageUrl || ''}
                    sites={combinedSites}
                    centreName={data.centres[0].name}
                    assetTypeFilter={selectedAssetType}
                  />
                  
                  {/* Centre Description - Show below the map */}
                  {data.centres[0]?.description && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">About {data.centres[0].name}</h3>
                      <div className="text-gray-600 whitespace-pre-line leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: data.centres[0].description }} />
                      {/* PDF Document Links */}
                      {(data.centres[0].pdfUrl1 || data.centres[0].pdfUrl2 || data.centres[0].pdfUrl3) && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {data.centres[0].pdfUrl1 && (
                            <a
                              href={data.centres[0].pdfUrl1}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {data.centres[0].pdfName1 || 'Document 1'}
                            </a>
                          )}
                          {data.centres[0].pdfUrl2 && (
                            <a
                              href={data.centres[0].pdfUrl2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {data.centres[0].pdfName2 || 'Document 2'}
                            </a>
                          )}
                          {data.centres[0].pdfUrl3 && (
                            <a
                              href={data.centres[0].pdfUrl3}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {data.centres[0].pdfName3 || 'Document 3'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Centre Description - Show as standalone card if no floor plan map */}
            {data.centres[0]?.description && (!data.floorLevels || data.floorLevels.length === 0 || !data.floorLevels.some((fl: any) => fl.mapImageUrl)) && (
              <Card>
                <CardHeader>
                  <CardTitle>About {data.centres[0].name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-600 whitespace-pre-line leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: data.centres[0].description }} />
                  {/* PDF Document Links */}
                  {(data.centres[0].pdfUrl1 || data.centres[0].pdfUrl2 || data.centres[0].pdfUrl3) && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {data.centres[0].pdfUrl1 && (
                        <a
                          href={data.centres[0].pdfUrl1}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {data.centres[0].pdfName1 || 'Document 1'}
                        </a>
                      )}
                      {data.centres[0].pdfUrl2 && (
                        <a
                          href={data.centres[0].pdfUrl2}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {data.centres[0].pdfName2 || 'Document 2'}
                        </a>
                      )}
                      {data.centres[0].pdfUrl3 && (
                        <a
                          href={data.centres[0].pdfUrl3}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {data.centres[0].pdfName3 || 'Document 3'}
                        </a>
                      )}
                    </div>
                  )}
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
