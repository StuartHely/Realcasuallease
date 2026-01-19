import { useState, useCallback, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MapPin, Save, X, Store, Zap, AlertTriangle } from "lucide-react";

type AssetType = "vacant_shops" | "third_line";

interface AssetMarker {
  assetId: number;
  assetType: AssetType;
  x: number;
  y: number;
  displayNumber: string;
}

export default function AssetMapPlacement() {
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [selectedFloorLevelId, setSelectedFloorLevelId] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>("vacant_shops");
  const [markers, setMarkers] = useState<AssetMarker[]>([]);

  const centreIdNum = selectedCentreId ? parseInt(selectedCentreId) : 0;
  const floorLevelIdNum = selectedFloorLevelId ? parseInt(selectedFloorLevelId) : null;

  // Fetch centres
  const { data: centres = [] } = trpc.centres.list.useQuery();

  // Fetch selected centre details
  const { data: centre } = trpc.centres.getById.useQuery(
    { id: centreIdNum },
    { enabled: centreIdNum > 0 }
  );

  // Fetch floor levels for selected centre
  const { data: floorLevels = [] } = trpc.admin.getFloorLevels.useQuery(
    { centreId: centreIdNum },
    { enabled: centreIdNum > 0 }
  );

  // Fetch vacant shops for selected centre
  const { data: vacantShops = [], refetch: refetchVacantShops } = trpc.vacantShops.getByCentre.useQuery(
    { centreId: centreIdNum },
    { enabled: centreIdNum > 0 }
  );

  // Fetch third line income for selected centre
  const { data: thirdLineIncome = [], refetch: refetchThirdLine } = trpc.thirdLineIncome.getByCentre.useQuery(
    { centreId: centreIdNum },
    { enabled: centreIdNum > 0 }
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

  // Compute map URL
  const mapPreviewUrl = useMemo(() => {
    if (floorLevels.length > 0 && floorLevelIdNum) {
      const currentFloor = floorLevels.find((fl: any) => fl.id === floorLevelIdNum);
      return currentFloor?.mapImageUrl || "";
    } else if (floorLevels.length === 0 && centre?.mapImageUrl) {
      return centre.mapImageUrl;
    }
    return "";
  }, [centre?.mapImageUrl, floorLevelIdNum, floorLevels]);

  // Get assets for current floor level and asset type
  const filteredAssets = useMemo(() => {
    let assets: any[] = selectedAssetType === "vacant_shops" ? vacantShops : thirdLineIncome;
    
    // Filter by floor level if multi-level centre
    if (floorLevels.length > 0 && floorLevelIdNum) {
      assets = assets.filter((a: any) => a.floorLevelId === floorLevelIdNum);
    }

    return assets;
  }, [selectedAssetType, vacantShops, thirdLineIncome, floorLevels.length, floorLevelIdNum]);

  // Load existing markers when assets change
  const existingMarkers = useMemo(() => {
    return filteredAssets
      .filter((asset: any) => asset.mapMarkerX !== null && asset.mapMarkerY !== null)
      .map((asset: any) => ({
        assetId: asset.id,
        assetType: selectedAssetType,
        x: asset.mapMarkerX,
        y: asset.mapMarkerY,
        displayNumber: selectedAssetType === "vacant_shops" ? asset.shopNumber : asset.assetNumber,
      }));
  }, [filteredAssets, selectedAssetType]);

  // Combine existing markers with newly placed markers
  const currentMarkers = useMemo(() => {
    const newMarkers = markers.filter(m => m.assetType === selectedAssetType);
    const existingIds = new Set(existingMarkers.map(m => m.assetId));
    const newOnlyMarkers = newMarkers.filter(m => !existingIds.has(m.assetId));
    return [...existingMarkers, ...newOnlyMarkers];
  }, [markers, existingMarkers, selectedAssetType]);

  // Auto-select first floor level when centre is selected
  useEffect(() => {
    if (floorLevels.length > 0 && !selectedFloorLevelId) {
      setSelectedFloorLevelId(floorLevels[0].id.toString());
    }
  }, [floorLevels, selectedFloorLevelId]);

  const handleCentreChange = useCallback((value: string) => {
    setSelectedCentreId(value);
    setSelectedFloorLevelId("");
    setMarkers([]);
  }, []);

  const handleFloorLevelChange = useCallback((value: string) => {
    setSelectedFloorLevelId(value);
    setMarkers([]);
  }, []);

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    if (filteredAssets.length === 0) {
      toast.info("No assets available for this centre/floor. Add assets first.");
      return;
    }

    // Find an unmapped asset
    const unmappedAsset = filteredAssets.find(
      (asset: any) => !currentMarkers.some((m) => m.assetId === asset.id)
    );

    if (unmappedAsset) {
      const newMarker: AssetMarker = {
        assetId: unmappedAsset.id,
        assetType: selectedAssetType,
        x: Math.round(xPercent * 10) / 10,
        y: Math.round(yPercent * 10) / 10,
        displayNumber: selectedAssetType === "vacant_shops" ? unmappedAsset.shopNumber : unmappedAsset.assetNumber,
      };
      setMarkers(prev => [...prev, newMarker]);
      toast.success(`Marker added for ${newMarker.displayNumber}`);
    } else {
      toast.info("All assets already have markers. Remove a marker to add a new one.");
    }
  }, [filteredAssets, currentMarkers, selectedAssetType]);

  const handleRemoveMarker = useCallback((assetId: number) => {
    setMarkers(prev => prev.filter((m) => !(m.assetId === assetId && m.assetType === selectedAssetType)));
    
    // Also clear from database
    if (selectedAssetType === "vacant_shops") {
      updateVacantShopMutation.mutate({ id: assetId, mapMarkerX: null, mapMarkerY: null });
    } else {
      updateThirdLineMutation.mutate({ id: assetId, mapMarkerX: null, mapMarkerY: null });
    }
  }, [selectedAssetType, updateVacantShopMutation, updateThirdLineMutation]);

  const handleSaveMarkers = useCallback(async () => {
    const markersToSave = currentMarkers.filter(m => 
      markers.some(nm => nm.assetId === m.assetId && nm.assetType === m.assetType)
    );
    
    if (markersToSave.length === 0) {
      toast.info("No new markers to save");
      return;
    }

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
      setMarkers([]);
      toast.success(`${markersToSave.length} marker(s) saved successfully`);
    } catch (error) {
      // Error already handled by mutation
    }
  }, [currentMarkers, markers, selectedAssetType, updateVacantShopMutation, updateThirdLineMutation]);

  const getMarkerColor = (assetType: AssetType) => {
    return assetType === "vacant_shops" ? "#16a34a" : "#9333ea";
  };

  const sortedCentres = useMemo(() => {
    return [...centres].sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [centres]);

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
            <Select value={selectedCentreId} onValueChange={handleCentreChange}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a centre" />
              </SelectTrigger>
              <SelectContent>
                {sortedCentres.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name} - {c.suburb}, {c.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {centreIdNum > 0 && (
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
                        floorLevels.length === 0 || !floorLevelIdNum || s.floorLevelId === floorLevelIdNum
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
                        floorLevels.length === 0 || !floorLevelIdNum || a.floorLevelId === floorLevelIdNum
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
                  <div className="flex flex-wrap gap-2">
                    {floorLevels.map((floor: any) => (
                      <Button
                        key={floor.id}
                        variant={floorLevelIdNum === floor.id ? "default" : "outline"}
                        onClick={() => handleFloorLevelChange(floor.id.toString())}
                      >
                        {floor.levelName}
                      </Button>
                    ))}
                  </div>
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
                    Click on the map to add markers. Click the X to remove.
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
                        {currentMarkers.length} of {filteredAssets.length} assets marked
                      </span>
                    </div>

                    {/* Map */}
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 overflow-auto">
                      <div className="relative inline-block">
                        <img
                          src={mapPreviewUrl}
                          alt="Floor plan"
                          className="max-w-full h-auto cursor-crosshair"
                          draggable={false}
                          onClick={handleMapClick}
                        />
                        {currentMarkers.map((marker) => (
                          <div
                            key={`${marker.assetType}-${marker.assetId}`}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
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
                    {filteredAssets.length > currentMarkers.length && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <p className="text-base font-semibold text-red-800">
                            {filteredAssets.length - currentMarkers.length} Unmapped {selectedAssetType === "vacant_shops" ? "Shop" : "Asset"}{filteredAssets.length - currentMarkers.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="text-sm text-red-700 mb-3">
                          Click on the map to place markers for the following assets:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {filteredAssets
                            .filter((asset: any) => !currentMarkers.some((m) => m.assetId === asset.id))
                            .map((asset: any) => (
                              <Badge key={asset.id} className="bg-red-100 text-red-800 border-red-300 font-semibold">
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
                        disabled={markers.length === 0 || updateVacantShopMutation.isPending || updateThirdLineMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateVacantShopMutation.isPending || updateThirdLineMutation.isPending 
                          ? "Saving..." 
                          : `Save Markers`}
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
                      {floorLevels.length > 0 && !floorLevelIdNum 
                        ? "Please select a floor level above."
                        : "Please upload a map in the Floor Plan Maps section first."}
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
