import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, MapPin, Search, ArrowUpDown, ArrowUpAZ } from "lucide-react";
import { useLocation } from "wouter";

function OwnerCentresContent() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  // Fetch all shopping centres
  const { data: centres = [], isLoading } = trpc.centres.list.useQuery();

  // Filter and sort centres
  const processedCentres = centres
    .filter((centre: any) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        centre.name?.toLowerCase().includes(query) ||
        centre.suburb?.toLowerCase().includes(query) ||
        centre.city?.toLowerCase().includes(query) ||
        centre.state?.toLowerCase().includes(query)
      );
    })
    .sort((a: any, b: any) => {
      if (sortAlphabetically) {
        return (a.name || '').localeCompare(b.name || '');
      }
      // Default: sort by ID (creation order)
      return (a.id || 0) - (b.id || 0);
    });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopping Centres</h1>
        <p className="text-muted-foreground mt-2">
          Manage your shopping centres and their details
        </p>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search centres by name, suburb, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort Button */}
            <Button
              variant={sortAlphabetically ? "default" : "outline"}
              onClick={() => setSortAlphabetically(!sortAlphabetically)}
              className="whitespace-nowrap"
            >
              <ArrowUpAZ className="mr-2 h-4 w-4" />
              {sortAlphabetically ? "Sorted A-Z" : "Sort Alphabetically"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Centres List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading shopping centres...</p>
        </div>
      ) : processedCentres.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No shopping centres found</p>
            <p className="text-muted-foreground mt-2">
              {searchQuery ? "Try adjusting your search query" : "No centres available"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {processedCentres.map((centre: any) => (
            <Card key={centre.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {centre.name}
                    </CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {centre.address && `${centre.address}, `}
                      {centre.suburb && `${centre.suburb}, `}
                      {centre.city && `${centre.city}, `}
                      {centre.state} {centre.postcode}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{centre.state}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Centre Code</p>
                    <p className="font-medium">{centre.centreCode || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Sites</p>
                    <p className="font-medium">{centre.totalSites || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active Bookings</p>
                    <p className="font-medium">{centre.activeBookings || 0}</p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/centre/${centre.id}`)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && processedCentres.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {processedCentres.length} of {centres.length} shopping centre{centres.length !== 1 ? 's' : ''}
          {sortAlphabetically && " (sorted alphabetically)"}
        </div>
      )}
    </div>
  );
}

export default function OwnerCentres() {
  return (
    <DashboardLayout>
      <OwnerCentresContent />
    </DashboardLayout>
  );
}
