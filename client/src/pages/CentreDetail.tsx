import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2, ArrowLeft, Calendar, DollarSign, Ruler, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import InteractiveMap from "@/components/InteractiveMap";

export default function CentreDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/centre/:id");
  const centreId = params?.id ? parseInt(params.id) : 0;

  const { data: centre, isLoading: centreLoading } = trpc.centres.getById.useQuery(
    { id: centreId },
    { enabled: centreId > 0 }
  );

  const { data: sites = [], isLoading: sitesLoading } = trpc.centres.getSites.useQuery(
    { centreId },
    { enabled: centreId > 0 }
  );

  const isLoading = centreLoading || sitesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading centre details...</p>
        </div>
      </div>
    );
  }

  if (!centre) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Centre not found</h3>
              <p className="text-gray-500 mb-6">The shopping centre you're looking for doesn't exist.</p>
              <Button onClick={() => setLocation("/")} className="bg-blue-600 hover:bg-blue-700">
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-900">Casual Lease</h1>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Centre Information */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl text-blue-900 mb-2">{centre.name}</CardTitle>
                <CardDescription className="flex items-start gap-2 text-base">
                  <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>
                    {centre.address && <div>{centre.address}</div>}
                    <div>
                      {[centre.suburb, centre.city, centre.state, centre.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </span>
                </CardDescription>
              </div>
              <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg font-semibold">
                {centre.state}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive Centre Map</h3>
              {centre.mapImageUrl ? (
                <InteractiveMap
                  centreId={centre.id}
                  mapUrl={centre.mapImageUrl}
                  sites={sites}
                  centreName={centre.name}
                />
              ) : (
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Map Coming Shortly</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Interactive floor plan will be available soon
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">{sites.length}</span> casual leasing
                  sites available
                </p>
              </div>
              <Button
                onClick={() => {
                  const today = format(new Date(), "yyyy-MM-dd");
                  setLocation(`/search?centre=${encodeURIComponent(centre.name)}&date=${today}`);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Check Availability
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Sites */}
        <div>
          <h2 className="text-2xl font-bold text-blue-900 mb-6">Available Sites</h2>
          {sites.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-12 text-center">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No sites available</h3>
                <p className="text-gray-500">
                  There are currently no casual leasing sites at this centre.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site: any) => (
                <Card
                  key={site.id}
                  className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/site/${site.id}`)}
                >
                  {site.imageUrl1 && (
                    <div className="w-full h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={site.imageUrl1}
                        alt={`Site ${site.siteNumber}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl text-blue-900">
                      Site {site.siteNumber}
                    </CardTitle>
                    <CardDescription>{site.description || "Casual leasing site"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Ruler className="h-4 w-4" />
                      <span>{site.size || "Size TBA"}</span>
                    </div>
                    {site.powerAvailable && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Zap className="h-4 w-4" />
                        <span>Power Available</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Per Day:</span>
                        <span className="font-semibold text-blue-900">
                          ${site.pricePerDay ? Number(site.pricePerDay).toFixed(2) : "150.00"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Per Week:</span>
                        <span className="font-semibold text-blue-900">
                          ${site.pricePerWeek ? Number(site.pricePerWeek).toFixed(2) : "750.00"}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/site/${site.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
