import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowLeft, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format, parse } from "date-fns";

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
            {/* Availability Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl">Availability Summary</CardTitle>
                <CardDescription>Quick overview of available spaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Week 1 Summary */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Week Starting {data.requestedWeek && format(data.requestedWeek.start, "dd/MM/yyyy")}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Available</span>
                          <span className="text-2xl font-bold text-green-600">
                            {data.availability.filter(a => a.week1Available).length}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{
                              width: `${(data.availability.filter(a => a.week1Available).length / data.availability.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Booked</span>
                          <span className="text-2xl font-bold text-red-600">
                            {data.availability.filter(a => !a.week1Available).length}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 transition-all"
                            style={{
                              width: `${(data.availability.filter(a => !a.week1Available).length / data.availability.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Week 2 Summary */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Week Starting {data.followingWeek && format(data.followingWeek.start, "dd/MM/yyyy")}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Available</span>
                          <span className="text-2xl font-bold text-green-600">
                            {data.availability.filter(a => a.week2Available).length}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{
                              width: `${(data.availability.filter(a => a.week2Available).length / data.availability.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Booked</span>
                          <span className="text-2xl font-bold text-red-600">
                            {data.availability.filter(a => !a.week2Available).length}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 transition-all"
                            style={{
                              width: `${(data.availability.filter(a => !a.week2Available).length / data.availability.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Sites Info */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total Sites Found:</span>
                    <span className="text-lg font-bold text-blue-600">{data.sites.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="font-medium">Shopping Centres:</span>
                    <span className="text-lg font-bold text-blue-600">{data.centres.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Centre Results */}
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Week Starting {data.requestedWeek && format(data.requestedWeek.start, "dd/MM/yyyy")}
                          </h4>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Week Starting {data.followingWeek && format(data.followingWeek.start, "dd/MM/yyyy")}
                          </h4>
                        </div>
                      </div>

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
                                  View Details
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
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

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  {availability?.week1Available ? (
                                    <>
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Available
                                      </Badge>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-5 w-5 text-red-600" />
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        Booked
                                      </Badge>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {availability?.week2Available ? (
                                    <>
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Available
                                      </Badge>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-5 w-5 text-red-600" />
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        Booked
                                      </Badge>
                                    </>
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
