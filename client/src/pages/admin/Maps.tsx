import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Upload, MapPin, Save, X, ArrowLeft, Plus } from "lucide-react";

export default function AdminMaps() {
  const [, setLocation] = useLocation();
  const [selectedCentreId, setSelectedCentreId] = useState<number>(0);
  const [selectedFloorLevelId, setSelectedFloorLevelId] = useState<number | null>(null);
  const [mapImage, setMapImage] = useState<File | null>(null);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string>("");
  const [markers, setMarkers] = useState<Array<{ siteId: number; x: number; y: number; siteNumber: string }>>([]);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [dragOccurred, setDragOccurred] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorNumber, setNewFloorNumber] = useState("");
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
  const { data: floorLevels = [], refetch: refetchFloorLevels } = trpc.admin.getFloorLevels.useQuery(
    { centreId: selectedCentreId },
    { enabled: selectedCentreId > 0 }
  );

  // Fetch sites for selected floor level (or all sites if no floor level selected)
  const { data: sites = [] } = selectedFloorLevelId
    ? trpc.admin.getSitesByFloorLevel.useQuery(
        { floorLevelId: selectedFloorLevelId },
        { enabled: selectedFloorLevelId > 0 }
      )
    : trpc.centres.getSites.useQuery(
        { centreId: selectedCentreId },
        { enabled: selectedCentreId > 0 && floorLevels.length === 0 }
      );

  // Create floor level mutation
  const createFloorLevelMutation = trpc.admin.createFloorLevel.useMutation({
    onSuccess: () => {
      toast.success("Floor level created successfully");
      refetchFloorLevels();
      setNewFloorName("");
      setNewFloorNumber("");
    },
    onError: (error: any) => {
      toast.error(`Failed to create floor level: ${error.message}`);
    },
  });

  // Upload map mutation (for both single-level and multi-level)
  const uploadMapMutation = trpc.admin.uploadCentreMap.useMutation({
    onSuccess: (data: any) => {
      toast.success("Map uploaded successfully");
      setMapPreviewUrl(data.mapUrl);
    },
    onError: (error: any) => {
      toast.error(`Failed to upload map: ${error.message}`);
    },
  });

  const uploadFloorLevelMapMutation = trpc.admin.uploadFloorLevelMap.useMutation({
    onSuccess: (data: any) => {
      toast.success("Floor plan uploaded successfully");
      setMapPreviewUrl(data.mapUrl);
      refetchFloorLevels();
    },
    onError: (error: any) => {
      toast.error(`Failed to upload floor plan: ${error.message}`);
    },
  });

  // Save markers mutation
  const saveMarkersMutation = trpc.admin.saveSiteMarkers.useMutation({
    onSuccess: () => {
      toast.success("Site markers saved successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to save markers: ${error.message}`);
    },
  });

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
      // Single-level centre
      setMapPreviewUrl(centre.mapImageUrl);
    } else {
      setMapPreviewUrl("");
    }

    // Load existing markers from sites
    if (sites.length > 0) {
      const existingMarkers = sites
        .filter((site: any) => site.mapMarkerX !== null && site.mapMarkerY !== null)
        .map((site: any) => ({
          siteId: site.id,
          x: site.mapMarkerX,
          y: site.mapMarkerY,
          siteNumber: site.siteNumber,
        }));
      
      setMarkers((prevMarkers) => {
        const hasChanged = 
          prevMarkers.length !== existingMarkers.length ||
          existingMarkers.some((marker, idx) => 
            prevMarkers[idx]?.siteId !== marker.siteId ||
            prevMarkers[idx]?.x !== marker.x ||
            prevMarkers[idx]?.y !== marker.y
          );
        return hasChanged ? existingMarkers : prevMarkers;
      });
    } else {
      setMarkers((prevMarkers) => prevMarkers.length > 0 ? [] : prevMarkers);
    }
  }, [centre?.mapImageUrl, centre?.id, sites.length, selectedCentreId, selectedFloorLevelId, floorLevels]);

  // Auto-select first floor level when floor levels are loaded
  useEffect(() => {
    if (floorLevels.length > 0 && !selectedFloorLevelId) {
      setSelectedFloorLevelId(floorLevels[0].id);
    } else if (floorLevels.length === 0) {
      setSelectedFloorLevelId(null);
    }
  }, [floorLevels, selectedFloorLevelId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMapImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setMapPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadMap = async () => {
    if (!mapImage || selectedCentreId === 0) {
      toast.error("Please select a centre and choose a map image");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      if (selectedFloorLevelId) {
        // Upload to specific floor level
        await uploadFloorLevelMapMutation.mutateAsync({
          floorLevelId: selectedFloorLevelId,
          imageData: base64,
          fileName: mapImage.name,
        });
      } else {
        // Upload to centre (single-level)
        await uploadMapMutation.mutateAsync({
          centreId: selectedCentreId,
          imageData: base64,
          fileName: mapImage.name,
        });
      }
    };
    reader.readAsDataURL(mapImage);
  };

  const handleCreateFloorLevel = async () => {
    if (!newFloorName || !newFloorNumber || selectedCentreId === 0) {
      toast.error("Please enter floor name and number");
      return;
    }

    const levelNum = parseInt(newFloorNumber);
    if (isNaN(levelNum)) {
      toast.error("Floor number must be a valid number");
      return;
    }

    await createFloorLevelMutation.mutateAsync({
      centreId: selectedCentreId,
      levelName: newFloorName,
      levelNumber: levelNum,
      displayOrder: floorLevels.length,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't process clicks if a drag just occurred
    if (dragOccurred) {
      setDragOccurred(false);
      return;
    }
    
    if (!imageRef.current || sites.length === 0) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage of image dimensions
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    const unmappedSite = sites.find(
      (site: any) => !markers.some((m) => m.siteId === site.id)
    );

    if (unmappedSite) {
      setMarkers([
        ...markers,
        {
          siteId: unmappedSite.id,
          x: Math.round(xPercent * 10) / 10, // Round to 1 decimal
          y: Math.round(yPercent * 10) / 10,
          siteNumber: unmappedSite.siteNumber,
        },
      ]);
      toast.success(`Marker added for ${unmappedSite.siteNumber}`);
    } else {
      toast.info("All sites already have markers. Remove a marker to add a new one.");
    }
  };

  const handleMarkerDragStart = (siteId: number) => {
    setIsDragging(siteId);
    setDragOccurred(false);
  };

  const handleMarkerDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging === null || !imageRef.current) return;

    // Mark that a drag occurred
    setDragOccurred(true);

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage of image dimensions
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    setMarkers(
      markers.map((m) =>
        m.siteId === isDragging ? { 
          ...m, 
          x: Math.round(xPercent * 10) / 10, // Round to 1 decimal
          y: Math.round(yPercent * 10) / 10 
        } : m
      )
    );
  };

  const handleMarkerDragEnd = () => {
    setIsDragging(null);
  };

  const handleRemoveMarker = (siteId: number) => {
    setMarkers(markers.filter((m) => m.siteId !== siteId));
  };

  const handleSaveMarkers = async () => {
    if (selectedCentreId === 0 || markers.length === 0) {
      toast.error("Please select a centre and add at least one marker");
      return;
    }

    await saveMarkersMutation.mutateAsync({
      centreId: selectedCentreId,
      markers: markers.map((m) => ({
        siteId: m.siteId,
        x: m.x,
        y: m.y,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-900">Admin - Map Management</h1>
            <Button
              onClick={() => setLocation("/admin")}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Centre Selection */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Select Shopping Centre</CardTitle>
            <CardDescription>Choose a centre to manage its floor plan map and site markers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="centre">Shopping Centre</Label>
                <Select
                  value={selectedCentreId.toString()}
                  onValueChange={(value) => {
                    setSelectedCentreId(parseInt(value));
                    setSelectedFloorLevelId(null);
                    setMapPreviewUrl("");
                    setMarkers([]);
                  }}
                >
                  <SelectTrigger id="centre">
                    <SelectValue placeholder="Select a centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {centres.map((centre: any) => (
                      <SelectItem key={centre.id} value={centre.id.toString()}>
                        {centre.name} - {centre.suburb}, {centre.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCentreId > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>{sites.length}</strong> sites available{selectedFloorLevelId ? " on this floor" : " for this centre"}
                  </p>
                  {floorLevels.length > 0 && (
                    <p className="text-sm text-green-700 mt-2">
                      ✓ Multi-level centre with {floorLevels.length} floor(s)
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedCentreId > 0 && (
          <>
            {/* Floor Level Management */}
            <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle>Floor Levels</CardTitle>
                <CardDescription>
                  {floorLevels.length === 0
                    ? "This is a single-level centre. Add floor levels if this centre has multiple floors."
                    : "Select a floor level to manage its map and markers."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {floorLevels.length > 0 && (
                    <Tabs value={selectedFloorLevelId?.toString() || ""} onValueChange={(val) => setSelectedFloorLevelId(parseInt(val))}>
                      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${floorLevels.length}, 1fr)` }}>
                        {floorLevels.map((floor: any) => (
                          <TabsTrigger key={floor.id} value={floor.id.toString()}>
                            {floor.levelName}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}

                  {/* Add New Floor Level */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Add New Floor Level</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="floor-name">Floor Name</Label>
                        <Input
                          id="floor-name"
                          placeholder="e.g., Ground Floor, Level 1"
                          value={newFloorName}
                          onChange={(e) => setNewFloorName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="floor-number">Floor Number</Label>
                        <Input
                          id="floor-number"
                          type="number"
                          placeholder="0 for ground, 1 for level 1"
                          value={newFloorNumber}
                          onChange={(e) => setNewFloorNumber(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleCreateFloorLevel}
                          disabled={createFloorLevelMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {createFloorLevelMutation.isPending ? "Creating..." : "Add Floor"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Map */}
            <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle>Upload Floor Plan Map</CardTitle>
                <CardDescription>
                  Upload a floor plan image {selectedFloorLevelId ? "for the selected floor level" : "for this centre"} (PNG, JPG, or JPEG)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="map-file">Floor Plan Image</Label>
                    <Input
                      id="map-file"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button
                    onClick={handleUploadMap}
                    disabled={!mapImage || uploadMapMutation.isPending || uploadFloorLevelMapMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadMapMutation.isPending || uploadFloorLevelMapMutation.isPending ? "Uploading..." : "Upload Map"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Map Canvas */}
            {mapPreviewUrl && (
              <Card className="mb-8 shadow-lg">
                <CardHeader>
                  <CardTitle>Position Site Markers</CardTitle>
                  <CardDescription>
                    Click on the map to add markers for each site. Drag markers to reposition them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
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
                        {markers.map((marker) => (
                          <div
                            key={marker.siteId}
                            className="absolute transform -translate-x-1/2 -translate-y-full cursor-move group"
                            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                            onMouseDown={() => handleMarkerDragStart(marker.siteId)}
                          >
                            <div className="relative">
                              <MapPin className="h-8 w-8 text-red-600 drop-shadow-lg" fill="currentColor" />
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Site {marker.siteNumber}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMarker(marker.siteId);
                                }}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {markers.length} of {sites.length} sites marked
                      </div>
                      <Button
                        onClick={handleSaveMarkers}
                        disabled={markers.length === 0 || saveMarkersMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saveMarkersMutation.isPending ? "Saving..." : "Save Markers"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
