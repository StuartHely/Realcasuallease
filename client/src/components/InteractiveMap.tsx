import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MapPin, DollarSign, Ruler, Store, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

type AssetType = "casual_leasing" | "vacant_shops" | "third_line" | "all";

interface Site {
  id: number | string;
  originalId?: number; // For non-casual-leasing assets
  siteNumber?: string;
  shopNumber?: string;
  assetNumber?: string;
  displayNumber?: string;
  displayLabel?: string;
  assetType?: AssetType;
  categoryName?: string;
  description: string | null;
  size?: string | null;
  totalSizeM2?: string | null;
  dimensions?: string | null;
  pricePerDay?: string;
  pricePerWeek?: string;
  pricePerMonth?: string;
  weekendPricePerDay?: string | null;
  imageUrl1: string | null;
  mapMarkerX: number | null;
  mapMarkerY: number | null;
  floorLevelId: number | null;
  powered?: boolean;
}

interface InteractiveMapProps {
  centreId: number;
  mapUrl?: string; // Legacy single-level map URL
  sites: Site[];
  centreName: string;
  assetTypeFilter?: AssetType;
}

// Asset type colors
const ASSET_COLORS = {
  casual_leasing: { bg: "#123047", text: "#F5F7FA", border: "#2563eb" }, // Blue
  vacant_shops: { bg: "#166534", text: "#F5F7FA", border: "#22c55e" }, // Green
  third_line: { bg: "#7c3aed", text: "#F5F7FA", border: "#a855f7" }, // Purple
};

export default function InteractiveMap({ centreId, mapUrl, sites, centreName, assetTypeFilter = "casual_leasing" }: InteractiveMapProps) {
  const [, setLocation] = useLocation();
  const [hoveredSite, setHoveredSite] = useState<Site | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch floor levels for this centre
  const { data: floorLevels = [] } = trpc.admin.getFloorLevels.useQuery({ centreId });

  // Auto-select first floor level
  useEffect(() => {
    if (floorLevels.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floorLevels[0].id);
    }
  }, [floorLevels, selectedFloorId]);

  // Determine which map to show
  const isMultiLevel = floorLevels.length > 0;
  const currentFloor = isMultiLevel && selectedFloorId 
    ? floorLevels.find((fl: any) => fl.id === selectedFloorId)
    : null;
  const displayMapUrl = currentFloor?.mapImageUrl || mapUrl;

  // Filter sites for current floor (or all sites if single-level) and by asset type
  const sitesWithMarkers = sites.filter((site: Site) => {
    const hasMarkers = site.mapMarkerX !== null && site.mapMarkerY !== null;
    const siteAssetType = site.assetType || "casual_leasing";
    
    // Filter by asset type
    if (assetTypeFilter !== "all" && siteAssetType !== assetTypeFilter) {
      return false;
    }
    
    if (!isMultiLevel) return hasMarkers;
    return hasMarkers && site.floorLevelId === selectedFloorId;
  });

  const handleMarkerHover = (site: Site, event: React.MouseEvent) => {
    setHoveredSite(site);
    
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setTooltipPosition({ x, y });
    }
  };

  const handleMarkerLeave = () => {
    setHoveredSite(null);
  };

  const handleMarkerClick = (site: Site) => {
    const assetType = site.assetType || "casual_leasing";
    
    if (assetType === "casual_leasing") {
      setLocation(`/site/${site.id}`);
    } else {
      // For vacant shops and third line income, show alert for now
      const identifier = site.displayLabel || site.displayNumber || site.id;
      alert(`${identifier} - Contact centre for enquiries`);
    }
  };

  const getMarkerColor = (site: Site) => {
    const assetType = site.assetType || "casual_leasing";
    if (assetType === "all") return ASSET_COLORS.casual_leasing;
    return ASSET_COLORS[assetType] || ASSET_COLORS.casual_leasing;
  };

  const getMarkerLabel = (site: Site) => {
    if (site.displayNumber) return site.displayNumber;
    if (site.siteNumber) return site.siteNumber;
    if (site.shopNumber) return site.shopNumber;
    if (site.assetNumber) return site.assetNumber;
    return String(site.id);
  };

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case "vacant_shops": return <Store className="h-4 w-4" />;
      case "third_line": return <Layers className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  if (!displayMapUrl) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-600">Map Coming Shortly</p>
        <p className="text-sm text-gray-500 mt-2">
          The floor plan for this centre will be available soon
        </p>
      </div>
    );
  }

  const MapContent = () => (
    <div className="bg-white rounded-lg border-2 border-gray-200">
      <div 
        ref={mapContainerRef} 
        className="relative w-full"
        onMouseLeave={handleMarkerLeave}
      >
        <img
          src={displayMapUrl}
          alt={`${centreName} floor plan`}
          className="max-w-full h-auto"
          draggable={false}
        />
        
        {/* Site Markers */}
        {sitesWithMarkers.map((site: Site) => {
          const colors = getMarkerColor(site);
          const label = getMarkerLabel(site);
          
          return (
            <div
              key={site.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
              style={{
                left: `${site.mapMarkerX}%`,
                top: `${site.mapMarkerY}%`,
              }}
              onMouseEnter={(e) => handleMarkerHover(site, e)}
              onMouseLeave={() => setHoveredSite(null)}
              onClick={() => handleMarkerClick(site)}
            >
              <div 
                className="min-w-8 h-8 px-2 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2"
                style={{ 
                  backgroundColor: colors.bg, 
                  color: colors.text,
                  borderColor: colors.border,
                }}
              >
                {label.length > 4 ? label.substring(0, 4) : label}
              </div>
            </div>
          );
        })}

        {/* Hover Tooltip */}
        {hoveredSite && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 15}px`,
              top: `${tooltipPosition.y - 10}px`,
            }}
          >
            <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-4 min-w-[280px] max-w-[320px]">
              {/* Site Image */}
              {hoveredSite.imageUrl1 && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img
                    src={hoveredSite.imageUrl1}
                    alt={hoveredSite.displayLabel || `Asset ${hoveredSite.id}`}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}

              {/* Site Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-900 text-lg">
                    {hoveredSite.displayLabel || hoveredSite.siteNumber || hoveredSite.shopNumber || hoveredSite.assetNumber}
                  </h4>
                  <span 
                    className="text-xs px-2 py-1 rounded font-semibold"
                    style={{
                      backgroundColor: getMarkerColor(hoveredSite).bg + "20",
                      color: getMarkerColor(hoveredSite).bg,
                    }}
                  >
                    {hoveredSite.assetType === "vacant_shops" ? "Vacant Shop" :
                     hoveredSite.assetType === "third_line" ? (hoveredSite.categoryName || "Third Line") :
                     "Available"}
                  </span>
                </div>

                {hoveredSite.description && (
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {hoveredSite.description}
                  </p>
                )}

                {(hoveredSite.size || hoveredSite.totalSizeM2 || hoveredSite.dimensions) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Ruler className="h-4 w-4" />
                    <span>
                      {hoveredSite.size || 
                       (hoveredSite.totalSizeM2 ? `${hoveredSite.totalSizeM2} m²` : null) ||
                       hoveredSite.dimensions}
                    </span>
                  </div>
                )}

                {hoveredSite.powered && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span className="text-green-500">⚡</span>
                    <span>Power Available</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200">
                  {/* Casual Leasing pricing */}
                  {hoveredSite.assetType === "casual_leasing" || !hoveredSite.assetType ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mon-Fri:</span>
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {hoveredSite.pricePerDay
                            ? Number(hoveredSite.pricePerDay).toFixed(2)
                            : "150.00"}/day
                        </span>
                      </div>
                      {hoveredSite.weekendPricePerDay && hoveredSite.weekendPricePerDay !== hoveredSite.pricePerDay && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-gray-600">Weekend:</span>
                          <span className="font-semibold text-purple-700 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {Number(hoveredSite.weekendPricePerDay).toFixed(2)}/day
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600">Weekly:</span>
                        <span className="font-bold text-blue-900 flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {hoveredSite.pricePerWeek
                            ? Number(hoveredSite.pricePerWeek).toFixed(2)
                            : "750.00"}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Vacant Shops and Third Line pricing */
                    <>
                      {hoveredSite.pricePerWeek && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Weekly:</span>
                          <span className="font-semibold text-gray-700 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {Number(hoveredSite.pricePerWeek).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {hoveredSite.pricePerMonth && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-gray-600">Monthly:</span>
                          <span className="font-bold flex items-center gap-1" style={{ color: getMarkerColor(hoveredSite).bg }}>
                            <DollarSign className="h-4 w-4" />
                            {Number(hoveredSite.pricePerMonth).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium" style={{ color: getMarkerColor(hoveredSite).bg }}>
                    {hoveredSite.assetType === "casual_leasing" || !hoveredSite.assetType
                      ? "Click marker to view details & book →"
                      : "Click marker to enquire →"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            {(assetTypeFilter === "casual_leasing" || assetTypeFilter === "all") && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ASSET_COLORS.casual_leasing.bg }} />
                <span className="text-gray-700">Casual Leasing</span>
              </div>
            )}
            {(assetTypeFilter === "vacant_shops" || assetTypeFilter === "all") && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ASSET_COLORS.vacant_shops.bg }} />
                <span className="text-gray-700">Vacant Shops</span>
              </div>
            )}
            {(assetTypeFilter === "third_line" || assetTypeFilter === "all") && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ASSET_COLORS.third_line.bg }} />
                <span className="text-gray-700">Third Line Income</span>
              </div>
            )}
            <span className="text-gray-500">
              {sitesWithMarkers.length} markers shown
            </span>
          </div>
          <p className="text-gray-600 italic">Hover over markers for details</p>
        </div>
      </div>
    </div>
  );

  // Multi-level centre with tabs
  if (isMultiLevel && floorLevels.length > 0) {
    return (
      <div className="space-y-4">
        <Tabs value={selectedFloorId?.toString() || ""} onValueChange={(val) => setSelectedFloorId(parseInt(val))}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${floorLevels.length}, 1fr)` }}>
            {floorLevels.map((floor: any) => (
              <TabsTrigger key={floor.id} value={floor.id.toString()}>
                {floor.levelName}
              </TabsTrigger>
            ))}
          </TabsList>
          {floorLevels.map((floor: any) => (
            <TabsContent key={floor.id} value={floor.id.toString()}>
              <MapContent />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Single-level centre (legacy)
  return <MapContent />;
}
