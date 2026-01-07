import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, ArrowLeft, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format, parse, addDays, isSameDay } from "date-fns";
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

  // Generate date range for heatmap (2 weeks)
  const generateDateRange = () => {
    if (!searchParams?.date) return [];
    const dates = [];
    const startDate = searchParams.date;
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  };

  const dateRange = generateDateRange();

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
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Casual Lease</h1>
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
          {/* Show message if size requirement not met */}
          {data?.sizeNotAvailable && (
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
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No shopping centres found matching your search.</p>
              <Button onClick={() => setLocation("/")}>Try Another Search</Button>
            </CardContent>
          </Card>
        )}

        {data && data.centres.length > 0 && (
          <div className="space-y-8">
            {/* Category Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filter by Business Category</CardTitle>
                <CardDescription>
                  Show only sites that accept your business type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  <Select
                    value={selectedCategoryId?.toString() || "all"}
                    onValueChange={(value) => {
                      const newCategoryId = value === "all" ? null : parseInt(value);
                      setSelectedCategoryId(newCategoryId);
                      
                      // Update URL
                      const params = new URLSearchParams(window.location.search);
                      if (newCategoryId) {
                        params.set("category", newCategoryId.toString());
                      } else {
                        params.delete("category");
                      }
                      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
                    }}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {allCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} {category.isFree && "(Free)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategoryId && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedCategoryId(null);
                      const params = new URLSearchParams(window.location.search);
                      params.delete("category");
                      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
                    }}>
                      Clear Filter
                    </Button>
                  )}
                </div>
                {selectedCategoryId && (
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="autoApproved"
                      checked={showOnlyAutoApproved}
                      onCheckedChange={(checked) => {
                        setShowOnlyAutoApproved(checked as boolean);
                        const params = new URLSearchParams(window.location.search);
                        if (checked) {
                          params.set("autoApproved", "true");
                        } else {
                          params.delete("autoApproved");
                        }
                        window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
                      }}
                    />
                    <label
                      htmlFor="autoApproved"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Show only sites with instant approval for this category
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Interactive Map - Show if centre has a map */}
            {data.centres[0]?.mapImageUrl && (
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
                    mapUrl={data.centres[0].mapImageUrl}
                    sites={data.sites}
                    centreName={data.centres[0].name}
                  />
                </CardContent>
              </Card>
            )}

            {/* Calendar Heatmap */}
            {data.centres.map((centre) => {
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
                <Card key={centre.id}>
                  <CardHeader>
                    <CardTitle className="text-2xl">{centre.name}</CardTitle>
                    <CardDescription>
                      {centre.majors && <span key="majors" className="block">Major Stores: {centre.majors}</span>}
                      {centre.numberOfSpecialties && (
                        <span key="specialties" className="block">Specialty Stores: {centre.numberOfSpecialties}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Legend */}
                    <div className="flex items-center gap-6 mb-4 pb-4 border-b">
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
                        <div style={{ width: `${centreSites.length > 0 ? 80 * 14 + 200 : 1000}px` }}></div>
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
                                key={site.id} 
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
                                      {site.size && <span key="size">{site.size}</span>}
                                      {site.maxTables && <span key="tables">• {site.maxTables} tables</span>}
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
                                        title={`Site ${site.siteNumber} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? 'Booked' : 'Available'}`}
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
                            key={site.id} 
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
                                  <CardTitle className="text-lg">Site {site.siteNumber}</CardTitle>
                                  <CardDescription className="mt-2">
                                    {site.description}
                                  </CardDescription>
                                  {/* Approved Categories */}
                                  {data.siteCategories && data.siteCategories[site.id] && (
                                    <div className="mt-3">
                                      <p className="text-xs font-semibold text-gray-700 mb-1">Accepts:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {data.siteCategories[site.id].length === 0 ? (
                                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                            All Categories
                                          </Badge>
                                        ) : (
                                          <>
                                            {data.siteCategories[site.id].slice(0, 5).map((cat: any) => (
                                              <Badge 
                                                key={cat.id} 
                                                variant="secondary" 
                                                className={`text-xs ${
                                                  cat.isFree 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}
                                              >
                                                {cat.name}
                                              </Badge>
                                            ))}
                                          </>
                                        )}
                                        {data.siteCategories[site.id].length > 5 && (
                                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                            +{data.siteCategories[site.id].length - 5} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
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
