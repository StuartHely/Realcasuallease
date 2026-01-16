import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MapPin, Save, X, Store, Zap } from "lucide-react";

type AssetType = "vacant_shops" | "third_line";

interface AssetMarker {
  assetId: number;
  assetType: AssetType;
  x: number;
  y: number;
  displayNumber: string;
}

export default function AssetMapPlacement() {
  const [selectedCentreId, setSelectedCentreId] = useState<number>(0);
  const [selectedFloorLevelId, setSelectedFloorLevelId] = useState<number | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>("vacant_shops");
  const [markers, setMarkers] = useState<AssetMarker[]>([]);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [dragOccurred, setDragOccurred] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string>("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Fetch centres
  const { data: centres = [] } = trpc.centres.list.useQuery();

  // Fetch selected centre details
  const { data: centre } = trpc.centres.getById.useQuery(
    { id: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Fetch floor levels for selected centre
  const { data: floorLevels = [] } = trpc.admin.getFloorLevels.useQuery(
    { centreId: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Fetch vacant shops for selected centre
  const { data: vacantShops = [], refetch: refetchVacantShops } = trpc.vacantShops.getByCentre.useQuery(
    { centreId: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Fetch third line income for selected centre
  const { data: thirdLineIncome = [], refetch: refetchThirdLine } = trpc.thirdLineIncome.getByCentre.useQuery(
    { centreId: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Mutations for updating markers
  const updateVacantShopMutation = trpc.vacantShops.update.useMutation({
    onSuccess: () => refetchVacantShops(),
    onError: (error) => toast.error(`Failed to save marker: ${error.message}`),
  });

  const updateThirdLineMutation = trpc.thirdLineIncome.update.useMutation({
    onSuccess: () => refetchThirdLine(),
    onError: (error) => toast.error(`Failed to save marker: ${error.message}`),
  });

  // Get assets for current floor level and asset type
  const getFilteredAssets = () => {
    let assets: any[] = [];
    
    if (selectedAssetType === "vacant_shops") {
      assets = vacantShops;
    } else {
      assets = thirdLineIncome;
    }

    // Filter by floor level if multi-level centre
    if (floorLevels.length > 0 && selectedFloorLevelId) {
      assets = assets.filter((a: any) => a.floorLevelId === selectedFloorLevelId);
    }

    return assets;
  };

  // Load map and markers when floor level changes
  useEffect(() => {
    if (floorLevels.length > 0 && selectedFloorLevelId) {
      const currentFloor = floorLevels.find((fl: any) => fl.id === selectedFloorLevelId);
      if (currentFloor?.mapImageUrl) {
        setMapPreviewUrl(currentFloor.mapImageUrl);
      } else {
        setMapPreviewUrl("");
      }
    } else if (floorLevels.length === 0 && centre?.mapImageUrl) {
      setMapPreviewUrl(centre.mapImageUrl);
    } else {
      setMapPreviewUrl("");
    }
  }, [centre?.mapImageUrl, selectedFloorLevelId, floorLevels]);

  // Load existing markers when assets change
  useEffect(() => {
    const assets = getFilteredAssets();
    const existingMarkers: AssetMarker[] = assets
      .filter((asset: any) => asset.mapMarkerX !== null && asset.mapMarkerY !== null)
      .map((asset: any) => ({
        assetId: asset.id,
        assetType: selectedAssetType,
        x: asset.mapMarkerX,
        y: asset.mapMarkerY,
        displayNumber: selectedAssetType === "vacant_shops" ? asset.shopNumber : asset.assetNumber,
      }));
    setMarkers(existingMarkers);
  }, [vacantShops, thirdLineIncome, selectedAssetType, selectedFloorLevelId]);

  // Auto-select first floor level when floor levels are loaded
  useEffect(() => {
    if (floorLevels.length > 0 && !selectedFloorLevelId) {
      setSelectedFloorLevelId(floorLevels[0].id);
    } else if (floorLevels.length === 0) {
      setSelectedFloorLevelId(null);
    }
  }, [floorLevels, selectedFloorLevelId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragOccurred) {
      setDragOccurred(false);
      return;
    }
    
    if (!imageRef.current) return;

    const assets = getFilteredAssets();
    if (assets.length === 0) {
      toast.info("No assets available for this centre/floor. Add assets first.");
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    // Find an unmapped asset
    const unmappedAsset = assets.find(
      (asset: any) => !markers.some((m) => m.assetId === asset.id && m.assetType === selectedAssetType)
    );

    if (unmappedAsset) {
      const newMarker: AssetMarker = {
        assetId: unmappedAsset.id,
        assetType: selectedAssetType,
        x: Math.round(xPercent * 10) / 10,
        y: Math.round(yPercent * 10) / 10,
        displayNumber: selectedAssetType === "vacant_shops" ? unmappedAsset.shopNumber : unmappedAsset.assetNumber,
      };
      setMarkers([...markers, newMarker]);
      toast.success(`Marker added for ${newMarker.displayNumber}`);
    } else {
      toast.info("All assets already have markers. Remove a marker to add a new one.");
    }
  };

  const handleMarkerDragStart = (assetId: number) => {
    setIsDragging(assetId);
    setDragOccurred(false);
  };

  const handleMarkerDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging === null || !imageRef.current) return;

    setDragOccurred(true);

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    setMarkers(
      markers.map((m) =>
        m.assetId === isDragging && m.assetType === selectedAssetType
          ? { ...m, x: Math.round(xPercent * 10) / 10, y: Math.round(yPercent * 10) / 10 }
          : m
      )
    );
  };

  const handleMarkerDragEnd = () => {
    setIsDragging(null);
  };

  const handleRemoveMarker = (assetId: number) => {
    setMarkers(markers.filter((m) => !(m.assetId === assetId && m.assetType === selectedAssetType)));
    
    // Also clear from database
    if (selectedAssetType === "vacant_shops") {
      updateVacantShopMutation.mutate({ id: assetId, mapMarkerX: null, mapMarkerY: null });
    } else {
      updateThirdLineMutation.mutate({ id: assetId, mapMarkerX: null, mapMarkerY: null });
    }
  };

  const handleSaveMarkers = async () => {
    if (markers.length === 0) {
      toast.error("No markers to save");
      return;
    }

    const markersToSave = markers.filter((m) => m.assetType === selectedAssetType);
    
    try {
      for (const marker of markersToSave) {
        if (selectedAssetType === "vacant_shops") {
          await updateVacantShopMutation.mutateAsync({
            id: marker.assetId,
            mapMarkerX: marker.x,
            mapMarkerY: marker.y,
          });
        } else {
          await updateThirdLineMutation.mutateAsync({
            id: marker.assetId,
            mapMarkerX: marker.x,
            mapMarkerY: marker.y,
          });
        }
      }
      toast.success(`${markersToSave.length} marker(s) saved successfully`);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const getMarkerColor = (assetType: AssetType) => {
    return assetType === "vacant_shops" ? "#16a34a" : "#9333ea"; // green for vacant shops, purple for third line
  };

  const assets = getFilteredAssets();
  const currentMarkers = markers.filter((m) => m.assetType === selectedAssetType);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Asset Map Placement</h1>
          <p className="text-muted-foreground mt-1">
            Position Vacant Shops and Third Line Income assets on centre floor plans
          </p>
        </div>

        {/* Centre Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Shopping Centre</CardTitle>
            <CardDescription>Choose a centre to manage asset map markers</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCentreId.toString()}
              onValueChange={(value) => {
                setSelectedCentreId(parseInt(value));
                setSelectedFloorLevelId(null);
                setMapPreviewUrl("");
                setMarkers([]);
              }}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a centre" />
              </SelectTrigger>
              <SelectContent>
                {centres.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((centre: any) => (
                  <SelectItem key={centre.id} value={centre.id.toString()}>
                    {centre.name} - {centre.suburb}, {centre.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCentreId > 0 && (
          <>
            {/* Asset Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Type</CardTitle>
                <CardDescription>Select which type of assets to place on the map</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant={selectedAssetType === "vacant_shops" ? "default" : "outline"}
                    onClick={() => setSelectedAssetType("vacant_shops")}
                    className="flex items-center gap-2"
                  >
                    <Store className="h-4 w-4" />
                    Vacant Shops
                    <Badge variant="secondary" className="ml-1">
                      {vacantShops.filter((s: any) => 
                        floorLevels.length === 0 || !selectedFloorLevelId || s.floorLevelId === selectedFloorLevelId
                      ).length}
                    </Badge>
                  </Button>
                  <Button
                    variant={selectedAssetType === "third_line" ? "default" : "outline"}
                    onClick={() => setSelectedAssetType("third_line")}
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Third Line Income
                    <Badge variant="secondary" className="ml-1">
                      {thirdLineIncome.filter((a: any) => 
                        floorLevels.length === 0 || !selectedFloorLevelId || a.floorLevelId === selectedFloorLevelId
                      ).length}
                    </Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Floor Level Selection (if multi-level) */}
            {floorLevels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Floor Level</CardTitle>
                  <CardDescription>Select a floor level to place markers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs 
                    value={selectedFloorLevelId?.toString() || ""} 
                    onValueChange={(val) => setSelectedFloorLevelId(parseInt(val))}
                  >
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${floorLevels.length}, 1fr)` }}>
                      {floorLevels.map((floor: any) => (
                        <TabsTrigger key={floor.id} value={floor.id.toString()}>
                          {floor.levelName}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Map Canvas */}
            {mapPreviewUrl ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Position {selectedAssetType === "vacant_shops" ? "Vacant Shop" : "Third Line Income"} Markers
                  </CardTitle>
                  <CardDescription>
                    Click on the map to add markers. Drag markers to reposition them. Click the X to remove.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getMarkerColor(selectedAssetType) }} />
                        <span>{selectedAssetType === "vacant_shops" ? "Vacant Shops" : "Third Line Income"}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {currentMarkers.length} of {assets.length} assets marked
                      </span>
                    </div>

                    {/* Map */}
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 overflow-auto">
                      <div
                        ref={canvasRef}
                        className="relative inline-block cursor-crosshair"
                        onClick={handleCanvasClick}
                        onMouseMove={handleMarkerDrag}
                        onMouseUp={handleMarkerDragEnd}
                        onMouseLeave={handleMarkerDragEnd}
                      >
                        <img
                          ref={imageRef}
                          src={mapPreviewUrl}
                          alt="Floor plan"
                          className="max-w-full h-auto"
                          draggable={false}
                        />
                        {currentMarkers.map((marker) => (
                          <div
                            key={`${marker.assetType}-${marker.assetId}`}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move group"
                            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                            onMouseDown={() => handleMarkerDragStart(marker.assetId)}
                          >
                            <div className="relative">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                                style={{ backgroundColor: getMarkerColor(marker.assetType) }}
                              >
                                {marker.displayNumber.length > 3 ? marker.displayNumber.slice(0, 3) : marker.displayNumber}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMarker(marker.assetId);
                                }}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unmapped Assets List */}
                    {assets.length > currentMarkers.length && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                          Unmapped {selectedAssetType === "vacant_shops" ? "Shops" : "Assets"} ({assets.length - currentMarkers.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {assets
                            .filter((asset: any) => !currentMarkers.some((m) => m.assetId === asset.id))
                            .map((asset: any) => (
                              <Badge key={asset.id} variant="outline">
                                {selectedAssetType === "vacant_shops" ? asset.shopNumber : asset.assetNumber}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveMarkers}
                        disabled={currentMarkers.length === 0 || updateVacantShopMutation.isPending || updateThirdLineMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateVacantShopMutation.isPending || updateThirdLineMutation.isPending 
                          ? "Saving..." 
                          : `Save ${currentMarkers.length} Marker(s)`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No floor plan map available for this {floorLevels.length > 0 ? "floor level" : "centre"}.</p>
                    <p className="text-sm mt-2">
                      Please upload a map in the <strong>Floor Plan Maps</strong> section first.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
