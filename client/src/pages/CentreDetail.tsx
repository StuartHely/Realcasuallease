import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, ArrowLeft, Calendar, DollarSign, Ruler, Zap, Store, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import InteractiveMap from "@/components/InteractiveMap";
import { NearbyCentresMap } from "@/components/NearbyCentresMap";

type AssetType = "casual_leasing" | "vacant_shops" | "third_line" | "all";

export default function CentreDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/centre/:id");
  const centreId = params?.id ? parseInt(params.id) : 0;
  const [assetType, setAssetType] = useState<AssetType>("casual_leasing");

  const { data: centre, isLoading: centreLoading } = trpc.centres.getById.useQuery(
    { id: centreId },
    { enabled: centreId > 0 }
  );

  // Casual Leasing Sites
  const { data: sites = [], isLoading: sitesLoading } = trpc.centres.getSites.useQuery(
    { centreId },
    { enabled: centreId > 0 }
  );

  // Vacant Shops
  const { data: vacantShops = [], isLoading: vacantShopsLoading } = trpc.vacantShops.getActiveByCentre.useQuery(
    { centreId },
    { enabled: centreId > 0 }
  );

  // Third Line Income
  const { data: thirdLineAssets = [], isLoading: thirdLineLoading } = trpc.thirdLineIncome.getActiveByCentre.useQuery(
    { centreId },
    { enabled: centreId > 0 }
  );

  const isLoading = centreLoading || sitesLoading || vacantShopsLoading || thirdLineLoading;

  // Combine all assets for the map based on selected type
  const mapAssets = useMemo(() => {
    const allAssets: any[] = [];
    
    if (assetType === "casual_leasing" || assetType === "all") {
      sites.forEach((site: any) => {
        allAssets.push({
          ...site,
          assetType: "casual_leasing",
          displayNumber: site.siteNumber,
          displayLabel: `Site ${site.siteNumber}`,
        });
      });
    }
    
    if (assetType === "vacant_shops" || assetType === "all") {
      vacantShops.forEach((shop: any) => {
        allAssets.push({
          ...shop,
          id: `vs-${shop.id}`,
          originalId: shop.id,
          assetType: "vacant_shops",
          displayNumber: shop.shopNumber,
          displayLabel: `Shop ${shop.shopNumber}`,
          mapMarkerX: shop.mapMarkerX,
          mapMarkerY: shop.mapMarkerY,
        });
      });
    }
    
    if (assetType === "third_line" || assetType === "all") {
      thirdLineAssets.forEach((asset: any) => {
        allAssets.push({
          ...asset,
          id: `tli-${asset.id}`,
          originalId: asset.id,
          assetType: "third_line",
          displayNumber: asset.assetNumber,
          displayLabel: `${asset.categoryName || "Asset"} ${asset.assetNumber}`,
          mapMarkerX: asset.mapMarkerX,
          mapMarkerY: asset.mapMarkerY,
        });
      });
    }
    
    return allAssets;
  }, [sites, vacantShops, thirdLineAssets, assetType]);

  // Get counts for the dropdown
  const assetCounts = {
    casual_leasing: sites.length,
    vacant_shops: vacantShops.length,
    third_line: thirdLineAssets.length,
    all: sites.length + vacantShops.length + thirdLineAssets.length,
  };

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

  const getAssetTypeLabel = (type: AssetType) => {
    switch (type) {
      case "casual_leasing": return "Casual Leasing";
      case "vacant_shops": return "Vacant Shops";
      case "third_line": return "Third Line Income";
      case "all": return "All Assets";
    }
  };

  const getAssetTypeIcon = (type: AssetType) => {
    switch (type) {
      case "casual_leasing": return <MapPin className="h-4 w-4" />;
      case "vacant_shops": return <Store className="h-4 w-4" />;
      case "third_line": return <Layers className="h-4 w-4" />;
      case "all": return <Building2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-2xl font-bold text-blue-900 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation("/")}
            >Real Casual Leasing</h1>
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
                    {centre.address && <div key="address">{centre.address}</div>}
                    <div key="location">
                      {[centre.suburb, centre.state, centre.postcode]
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
            {/* Asset Type Selector */}
            <div className="mb-6 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <Select value={assetType} onValueChange={(value: AssetType) => setAssetType(value)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual_leasing">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>Casual Leasing</span>
                      <Badge variant="secondary" className="ml-2">{assetCounts.casual_leasing}</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="vacant_shops">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-green-600" />
                      <span>Vacant Shops</span>
                      <Badge variant="secondary" className="ml-2">{assetCounts.vacant_shops}</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="third_line">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" />
                      <span>Third Line Income</span>
                      <Badge variant="secondary" className="ml-2">{assetCounts.third_line}</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-600" />
                      <span>All Assets</span>
                      <Badge variant="secondary" className="ml-2">{assetCounts.all}</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Interactive Centre Map
                {assetType !== "all" && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    - Showing {getAssetTypeLabel(assetType)}
                  </span>
                )}
              </h3>
              {centre.mapImageUrl ? (
                <InteractiveMap
                  centreId={centre.id}
                  mapUrl={centre.mapImageUrl}
                  sites={mapAssets}
                  centreName={centre.name}
                  assetTypeFilter={assetType}
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
                  <span className="font-semibold text-gray-900">{mapAssets.length}</span>{" "}
                  {assetType === "all" ? "total assets" : getAssetTypeLabel(assetType).toLowerCase()}{" "}
                  available
                </p>
              </div>
              {assetType === "casual_leasing" && (
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Assets based on selected type */}
        <div>
          <h2 className="text-2xl font-bold text-blue-900 mb-6">
            {assetType === "all" ? "All Available Assets" : `Available ${getAssetTypeLabel(assetType)}`}
          </h2>
          
          {/* Casual Leasing Sites */}
          {(assetType === "casual_leasing" || assetType === "all") && sites.length > 0 && (
            <div className={assetType === "all" ? "mb-8" : ""}>
              {assetType === "all" && (
                <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Casual Leasing Sites ({sites.length})
                </h3>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((site: any) => (
                  <Card
                    key={site.id}
                    className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-l-blue-500"
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
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-blue-900">
                          Site {site.siteNumber}
                        </CardTitle>
                        <Badge className="bg-blue-100 text-blue-800">Casual Leasing</Badge>
                      </div>
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
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Mon-Fri:</span>
                          <span className="font-semibold text-gray-900">
                            ${site.pricePerDay ? Number(site.pricePerDay).toFixed(2) : "150.00"}/day
                          </span>
                        </div>
                        {site.weekendPricePerDay && site.weekendPricePerDay !== site.pricePerDay && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Weekend:</span>
                            <span className="font-semibold text-purple-700">
                              ${Number(site.weekendPricePerDay).toFixed(2)}/day
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Weekly:</span>
                          <span className="font-bold text-blue-900">
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
            </div>
          )}

          {/* Vacant Shops */}
          {(assetType === "vacant_shops" || assetType === "all") && vacantShops.length > 0 && (
            <div className={assetType === "all" ? "mb-8" : ""}>
              {assetType === "all" && (
                <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Vacant Shops ({vacantShops.length})
                </h3>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vacantShops.map((shop: any) => (
                  <Card
                    key={shop.id}
                    className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-green-500"
                  >
                    {shop.imageUrl1 && (
                      <div className="w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={shop.imageUrl1}
                          alt={`Shop ${shop.shopNumber}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-green-900">
                          Shop {shop.shopNumber}
                        </CardTitle>
                        <Badge className="bg-green-100 text-green-800">Vacant Shop</Badge>
                      </div>
                      <CardDescription>{shop.description || "Short-term retail tenancy"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {shop.totalSizeM2 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Ruler className="h-4 w-4" />
                          <span>{shop.totalSizeM2} m²</span>
                        </div>
                      )}
                      {shop.dimensions && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Ruler className="h-4 w-4" />
                          <span>{shop.dimensions}</span>
                        </div>
                      )}
                      {shop.powered && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Zap className="h-4 w-4" />
                          <span>Power Available</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        {shop.pricePerWeek && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Weekly:</span>
                            <span className="font-semibold text-gray-900">
                              ${Number(shop.pricePerWeek).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {shop.pricePerMonth && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Monthly:</span>
                            <span className="font-bold text-green-900">
                              ${Number(shop.pricePerMonth).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 mt-4"
                        onClick={() => {
                          // TODO: Navigate to vacant shop detail page when implemented
                          // For now, show a toast
                          alert(`Vacant Shop ${shop.shopNumber} - Contact centre for enquiries`);
                        }}
                      >
                        Enquire Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Third Line Income */}
          {(assetType === "third_line" || assetType === "all") && thirdLineAssets.length > 0 && (
            <div>
              {assetType === "all" && (
                <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Third Line Income ({thirdLineAssets.length})
                </h3>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {thirdLineAssets.map((asset: any) => (
                  <Card
                    key={asset.id}
                    className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-purple-500"
                  >
                    {asset.imageUrl1 && (
                      <div className="w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={asset.imageUrl1}
                          alt={`Asset ${asset.assetNumber}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-purple-900">
                          {asset.assetNumber}
                        </CardTitle>
                        <Badge className="bg-purple-100 text-purple-800">
                          {asset.categoryName || "Third Line"}
                        </Badge>
                      </div>
                      <CardDescription>{asset.description || "Non-tenancy asset"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {asset.dimensions && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Ruler className="h-4 w-4" />
                          <span>{asset.dimensions}</span>
                        </div>
                      )}
                      {asset.powered && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Zap className="h-4 w-4" />
                          <span>Power Available</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        {asset.pricePerWeek && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Weekly:</span>
                            <span className="font-semibold text-gray-900">
                              ${Number(asset.pricePerWeek).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {asset.pricePerMonth && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Monthly:</span>
                            <span className="font-bold text-purple-900">
                              ${Number(asset.pricePerMonth).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
                        onClick={() => {
                          // TODO: Navigate to third line asset detail page when implemented
                          alert(`${asset.categoryName || "Asset"} ${asset.assetNumber} - Contact centre for enquiries`);
                        }}
                      >
                        Enquire Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {mapAssets.length === 0 && (
            <Card className="shadow-lg">
              <CardContent className="py-12 text-center">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No assets available</h3>
                <p className="text-gray-500">
                  There are currently no {getAssetTypeLabel(assetType).toLowerCase()} at this centre.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Nearby Centres Map */}
        {centre.latitude && centre.longitude && (
          <div className="mt-12">
            <NearbyCentresMap 
              centreId={centre.id} 
              centreName={centre.name}
              centreLatitude={centre.latitude}
              centreLongitude={centre.longitude}
              radiusKm={10}
            />
          </div>
        )}
      </div>
    </div>
  );
}
