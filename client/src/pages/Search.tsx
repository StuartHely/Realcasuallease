import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowLeft, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format, parse, addDays, isSameDay } from "date-fns";
import InteractiveMap from "@/components/InteractiveMap";
import { NearbyCentresMap } from "@/components/NearbyCentresMap";

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState<{ query: string; date: Date } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query") || params.get("centre"); // Support both for backwards compatibility
    const dateStr = params.get("date");

    if (query && dateStr) {
      try {
        const parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
        setSearchParams({ query, date: parsedDate });
      } catch (e) {
        console.error("Invalid date format", e);
      }
    }
  }, []);

  const { data, isLoading } = trpc.search.smart.useQuery(
    {
      query: searchParams?.query || "",
      date: searchParams?.date || new Date(),
    },
    { enabled: !!searchParams }
  );

  // Determine if a site is matched by the search query
  const isMatchedSite = (siteId: number) => {
    if (!data?.matchedSiteIds) return false;
    return data.matchedSiteIds.includes(siteId);
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

  if (!searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading search parameters...</p>
      </div>
    );
  }

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

  // Check if a site is booked on a specific date
  const isBookedOnDate = (siteId: number, date: Date) => {
    if (!data?.availability) return false;
    const siteAvailability = data.availability.find(a => a.siteId === siteId);
    if (!siteAvailability) return false;

    // Combine both week's bookings
    const allBookings = [...siteAvailability.week1Bookings, ...siteAvailability.week2Bookings];
    
    return allBookings.some(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      return date >= bookingStart && date <= bookingEnd;
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
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading results...</p>
          </div>
        )}

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
              const centreSites = data.sites.filter((s) => s.centreId === centre.id);
              
              return (
                <Card key={centre.id}>
                  <CardHeader>
                    <CardTitle className="text-2xl">{centre.name}</CardTitle>
                    <CardDescription>
                      {centre.majors && <span className="block">Major Stores: {centre.majors}</span>}
                      {centre.numberOfSpecialties && (
                        <span className="block">Specialty Stores: {centre.numberOfSpecialties}</span>
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
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2">
                                Site
                              </th>
                              {dateRange.map((date, idx) => (
                                <th 
                                  key={idx} 
                                  className="px-2 py-2 text-center text-xs font-medium border-b-2 min-w-[80px]"
                                >
                                  <div>{format(date, "dd/MM")}</div>
                                  <div className="text-gray-500">{format(date, "EEE")}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {centreSites.map((site) => {
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
                                </td>
                                {dateRange.map((date, idx) => {
                                  const isBooked = isBookedOnDate(site.id, date);
                                  return (
                                    <td 
                                      key={idx} 
                                      className="border border-gray-200 p-0"
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
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">Site {site.siteNumber}</CardTitle>
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
                                    <span className="font-semibold">Price:</span> ${site.pricePerDay}/day or $
                                    {site.pricePerWeek}/week
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
