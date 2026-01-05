import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MapPin, DollarSign, Ruler } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

interface Site {
  id: number;
  siteNumber: string;
  description: string | null;
  size: string | null;
  pricePerDay: string;
  pricePerWeek: string;
  imageUrl1: string | null;
  mapMarkerX: number | null;
  mapMarkerY: number | null;
  floorLevelId: number | null;
}

interface InteractiveMapProps {
  centreId: number;
  mapUrl?: string; // Legacy single-level map URL
  sites: Site[];
  centreName: string;
}

export default function InteractiveMap({ centreId, mapUrl, sites, centreName }: InteractiveMapProps) {
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

  // Filter sites for current floor (or all sites if single-level)
  const sitesWithMarkers = sites.filter((site: Site) => {
    const hasMarkers = site.mapMarkerX !== null && site.mapMarkerY !== null;
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

  const handleMarkerClick = (siteId: number) => {
    setLocation(`/site/${siteId}`);
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
          className="w-full h-auto max-h-[600px] object-contain"
          draggable={false}
        />
        
        {/* Site Markers */}
        {sitesWithMarkers.map((site: Site) => (
           <div
            key={site.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
            style={{
              left: `${site.mapMarkerX}%`,
              top: `${site.mapMarkerY}%`,
            }}
            onMouseEnter={(e) => handleMarkerHover(site, e)}
            onMouseLeave={() => setHoveredSite(null)}
            onClick={() => handleMarkerClick(site.id)}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#123047', color: '#F5F7FA' }}>
              {site.siteNumber}
            </div>
          </div>
        ))}

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
                    alt={`Site ${hoveredSite.siteNumber}`}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}

              {/* Site Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-900 text-lg">
                    {hoveredSite.siteNumber}
                  </h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                    Available
                  </span>
                </div>

                {hoveredSite.description && (
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {hoveredSite.description}
                  </p>
                )}

                {hoveredSite.size && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Ruler className="h-4 w-4" />
                    <span>{hoveredSite.size}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Per Week:</span>
                    <span className="font-bold text-blue-900 text-base flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {hoveredSite.pricePerWeek
                        ? Number(hoveredSite.pricePerWeek).toFixed(2)
                        : "750.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Per Day:</span>
                    <span className="font-semibold text-gray-700 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {hoveredSite.pricePerDay
                        ? Number(hoveredSite.pricePerDay).toFixed(2)
                        : "150.00"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-blue-600 font-medium">
                    Click marker to view details & book →
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" fill="currentColor" />
              <span className="text-gray-700">Available Site</span>
            </div>
            <span className="text-gray-500">
              {sitesWithMarkers.length} of {isMultiLevel ? sites.filter(s => s.floorLevelId === selectedFloorId).length : sites.length} sites shown
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
