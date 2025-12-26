import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowLeft, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format, parse, addDays, isSameDay } from "date-fns";

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState<{ centre: string; date: Date } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const centre = params.get("centre");
    const dateStr = params.get("date");

    if (centre && dateStr) {
      try {
        const parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
        setSearchParams({ centre, date: parsedDate });
      } catch (e) {
        console.error("Invalid date format", e);
      }
    }
  }, []);

  const { data, isLoading } = trpc.search.byNameAndDate.useQuery(
    {
      centreName: searchParams?.centre || "",
      date: searchParams?.date || new Date(),
    },
    { enabled: !!searchParams }
  );

  if (!searchParams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading search parameters...</p>
      </div>
    );
  }

  // Generate date range for heatmap (2 weeks)
  const generateDateRange = () => {
    if (!data?.requestedWeek) return [];
    const dates = [];
    const startDate = data.requestedWeek.start;
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
            Searching for: <span className="font-semibold">{searchParams.centre}</span> on{" "}
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
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Sites</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{data.sites.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Available (Week 1)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {data.availability.filter(a => a.week1Available).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Available (Week 2)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {data.availability.filter(a => a.week2Available).length}
                  </div>
                </CardContent>
              </Card>
            </div>

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
                            {centreSites.map((site) => (
                              <tr key={site.id} className="hover:bg-gray-50">
                                <td className="sticky left-0 bg-white z-10 px-3 py-2 font-medium border-r-2 border-b">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{site.siteNumber}</span>
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
                            ))}
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
                          <Card key={site.id} className="border-l-4 border-l-blue-500">
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
          </div>
        )}
      </main>
    </div>
  );
}
