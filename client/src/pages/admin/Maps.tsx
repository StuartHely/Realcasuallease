import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { useDefaultCentre } from "@/hooks/useDefaultCentre";
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
  const { selectedCentreId, setSelectedCentreId, centres } = useDefaultCentre();
  const [selectedFloorLevelId, setSelectedFloorLevelId] = useState<number | null>(null);
  const [mapImage, setMapImage] = useState<File | null>(null);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [showUnhideConfirm, setShowUnhideConfirm] = useState(false);
  const [floorToHide, setFloorToHide] = useState<{ id: number; name: string } | null>(null);
  const [floorToUnhide, setFloorToUnhide] = useState<{ id: number; name: string } | null>(null);
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [editingFloorName, setEditingFloorName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<{ id: number; name: string; siteCount: number } | null>(null);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string>("");
  const [markers, setMarkers] = useState<Array<{ siteId: number; x: number; y: number; siteNumber: string }>>([]);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [dragOccurred, setDragOccurred] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const utils = trpc.useUtils();

  // Fetch selected centre details
  const { data: centre } = trpc.centres.getById.useQuery(
    { id: selectedCentreId! },
    { enabled: !!selectedCentreId && selectedCentreId > 0 }
  );

  // Fetch floor levels for selected centre
  const { data: floorLevels = [], refetch: refetchFloorLevels } = trpc.admin.getFloorLevels.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId && selectedCentreId > 0 }
  );

  // Fetch sites for selected floor level
  const { data: floorSites = [] } = trpc.admin.getSitesByFloorLevel.useQuery(
    { floorLevelId: selectedFloorLevelId! },
    { enabled: !!selectedFloorLevelId && selectedFloorLevelId > 0 }
  );
  // Also fetch all centre sites to include unassigned ones
  const { data: allCentreSites = [] } = trpc.centres.getSites.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId && selectedCentreId > 0 }
  );
  // When a floor level is selected, show floor-assigned sites + unassigned sites (no floorLevelId)
  // When no floor levels exist, show all centre sites
  // Sort naturally so markers are placed in order (e.g. Site 2 before Site 10)
  const sites = (selectedFloorLevelId
    ? [
        ...floorSites,
        ...allCentreSites.filter((s: any) => !s.floorLevelId && !floorSites.some((fs: any) => fs.id === s.id)),
      ]
    : allCentreSites
  ).sort((a: any, b: any) => (a.siteNumber || "").localeCompare(b.siteNumber || "", undefined, { numeric: true, sensitivity: "base" }));

  // Create floor level mutation
  const createFloorLevelMutation = trpc.admin.createFloorLevel.useMutation({
    onSuccess: () => {
      toast.success("Floor level created successfully");
      refetchFloorLevels();
      setNewFloorName("");
    },
    onError: (error: any) => {
      toast.error(`Failed to create floor level: ${error.message}`);
    },
  });

  // Hide floor level mutation
  const hideFloorLevelMutation = trpc.admin.hideFloorLevel.useMutation({
    onSuccess: () => {
      toast.success("Floor level hidden successfully. Historical data preserved.");
      refetchFloorLevels();
    },
    onError: (error: any) => {
      toast.error(`Failed to hide floor level: ${error.message}`);
    },
  });

  // Unhide floor level mutation
  const unhideFloorLevelMutation = trpc.admin.unhideFloorLevel.useMutation({
    onSuccess: () => {
      toast.success("Floor level restored to public view.");
      refetchFloorLevels();
    },
    onError: (error: any) => {
      toast.error(`Failed to unhide floor level: ${error.message}`);
    },
  });

  // Rename floor level mutation
  const renameFloorLevelMutation = trpc.admin.renameFloorLevel.useMutation({
    onSuccess: () => {
      toast.success("Floor level renamed successfully");
      refetchFloorLevels();
      setEditingFloorId(null);
      setEditingFloorName("");
    },
    onError: (error: any) => {
      toast.error(`Failed to rename floor level: ${error.message}`);
    },
  });

  // Delete floor level mutation (also clears map markers on affected sites server-side)
  const deleteFloorLevelMutation = trpc.admin.deleteFloorLevel.useMutation({
    onSuccess: () => {
      toast.success("Floor level deleted. Affected sites are now unassigned.");
      refetchFloorLevels();
      setSelectedFloorLevelId(null);
      setMarkers([]);
      utils.centres.getSites.invalidate();
      utils.admin.getSitesByFloorLevel.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete floor level: ${error.message}`);
    },
  });

  // Upload map mutation (for both single-level and multi-level)
  const uploadMapMutation = trpc.admin.uploadCentreMap.useMutation({
    onSuccess: (data: any) => {
      toast.success("Map uploaded successfully");
      setMapPreviewUrl(data.url);
      setMapImage(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to upload map: ${error.message}`);
    },
  });

  const uploadFloorLevelMapMutation = trpc.admin.uploadFloorLevelMap.useMutation({
    onSuccess: (data: any) => {
      toast.success("Floor plan uploaded successfully");
      setMapPreviewUrl(data.url);
      setMapImage(null);
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
      // Invalidate sites queries so the next load picks up saved positions
      utils.centres.getSites.invalidate();
      utils.admin.getSitesByFloorLevel.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to save markers: ${error.message}`);
    },
  });

  // Reset site marker mutation
  const resetSiteMarkerMutation = trpc.admin.resetSiteMarker.useMutation({
    onSuccess: () => {
      toast.success("Marker removed successfully");
      utils.centres.getSites.invalidate();
      utils.admin.getSitesByFloorLevel.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to remove marker: ${error.message}`);
    },
  });

  // Migrate centre-level map to floor level
  const migrateCentreMapMutation = trpc.admin.migrateCentreMap.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        toast.success("Map migrated to 'Ground Floor' level");
        setSelectedFloorLevelId(data.floorLevelId);
        refetchFloorLevels();
        utils.centres.getById.invalidate({ id: selectedCentreId! });
      }
    },
  });

  // Auto-migrate centre-level maps to floor levels (Rockdale, Highlands, etc.)
  useEffect(() => {
    if (
      selectedCentreId && selectedCentreId > 0 &&
      centre?.mapImageUrl &&
      floorLevels.length === 0 &&
      !migrateCentreMapMutation.isPending
    ) {
      migrateCentreMapMutation.mutate({ centreId: selectedCentreId! });
    }
  }, [selectedCentreId, centre?.mapImageUrl, floorLevels.length]);

  // Load map and markers when floor level changes
  useEffect(() => {
    if (floorLevels.length > 0 && selectedFloorLevelId) {
      // Multi-level: only show the selected floor's own map.
      // Never fall back to another floor's map — markers are % positioned
      // relative to a specific image, so cross-floor fallback gives wrong positions.
      const currentFloor = floorLevels.find((fl: any) => fl.id === selectedFloorLevelId);
      setMapPreviewUrl(currentFloor?.mapImageUrl || "");
    } else if (centre?.mapImageUrl) {
      // Single-level centre or no floor level selected yet
      setMapPreviewUrl(centre.mapImageUrl);
    } else if (floorLevels.length > 0) {
      // Centre has no mapImageUrl but floor levels exist — pick the selected or first with map
      const anyFloorWithMap = floorLevels.find((fl: any) => fl.mapImageUrl);
      setMapPreviewUrl(anyFloorWithMap?.mapImageUrl || "");
    } else {
      setMapPreviewUrl("");
    }

    // Load existing markers from sites
    if (sites.length > 0) {
      const existingMarkers = sites
        .filter((site: any) => {
          if (site.mapMarkerX == null || site.mapMarkerY == null) return false;
          const x = parseFloat(site.mapMarkerX);
          const y = parseFloat(site.mapMarkerY);
          return !isNaN(x) && !isNaN(y);
        })
        .map((site: any) => ({
          siteId: site.id,
          x: parseFloat(site.mapMarkerX),
          y: parseFloat(site.mapMarkerY),
          siteNumber: site.siteNumber,
        }));
      
      setMarkers((prevMarkers) => {
        // Only overwrite if the set of markers or their DB positions actually changed
        // (e.g. centre switch or fresh data after save). Never overwrite user edits
        // just because the effect re-ran due to unrelated dependency changes.
        const prevIds = prevMarkers.map(m => m.siteId).sort().join(',');
        const newIds = existingMarkers.map(m => m.siteId).sort().join(',');
        if (prevIds !== newIds) return existingMarkers;
        return prevMarkers;
      });
    } else {
      setMarkers((prevMarkers) => prevMarkers.length > 0 ? [] : prevMarkers);
    }
  }, [centre?.mapImageUrl, centre?.id, sites, selectedCentreId, selectedFloorLevelId, floorLevels]);

  // Reset floor level selection when centre changes so auto-select can re-fire
  useEffect(() => {
    setSelectedFloorLevelId(null);
    setMapPreviewUrl("");
    setMarkers([]);
  }, [selectedCentreId]);

  // Auto-select first floor level when floor levels are loaded
  // Prefer a floor that has a map image so the map canvas appears immediately
  useEffect(() => {
    if (floorLevels.length > 0 && !selectedFloorLevelId) {
      const floorWithMap = floorLevels.find((fl: any) => fl.mapImageUrl);
      setSelectedFloorLevelId(floorWithMap?.id ?? floorLevels[0].id);
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
    if (!mapImage || !selectedCentreId) {
      toast.error("Please select a centre and choose a map image");
      return;
    }

    // Validate floor has a name before upload
    if (selectedFloorLevelId) {
      const selectedFloor = floorLevels.find((f: any) => f.id === selectedFloorLevelId);
      if (!selectedFloor?.levelName || selectedFloor.levelName.trim() === '') {
        toast.error("⚠️ Please name this floor level before uploading", {
          description: "Go to 'Add New Floor Level' section below to set a name first"
        });
        return;
      }
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
      } else if (floorLevels.length === 0) {
        // No floor levels exist — auto-create "Ground Floor" and upload map to it
        try {
          const newFloor = await createFloorLevelMutation.mutateAsync({
            centreId: selectedCentreId,
            levelName: "Ground Floor",
            levelNumber: "1",
            displayOrder: 0,
          });
          const floorId = (newFloor as any)?.id;
          if (floorId) {
            await uploadFloorLevelMapMutation.mutateAsync({
              floorLevelId: floorId,
              imageData: base64,
              fileName: mapImage.name,
            });
            setSelectedFloorLevelId(floorId);
            toast.success("Created 'Ground Floor' and uploaded map");
          }
        } catch {
          toast.error("Failed to auto-create floor level");
        }
      } else {
        // Upload to centre (single-level fallback)
        await uploadMapMutation.mutateAsync({
          centreId: selectedCentreId,
          imageData: base64,
          fileName: mapImage.name,
        });
      }
    };
    reader.readAsDataURL(mapImage);
  };

  const handleHideFloorLevel = (floorLevelId: number, levelName: string) => {
    setFloorToHide({ id: floorLevelId, name: levelName });
    setShowHideConfirm(true);
  };

  const confirmHideFloor = async () => {
    if (!floorToHide) return;
    try {
      await hideFloorLevelMutation.mutateAsync({ floorLevelId: floorToHide.id });
      toast.success(`Floor "${floorToHide.name}" has been hidden`);
    } catch (error) {
      console.error('Hide mutation failed:', error);
      toast.error('Failed to hide floor');
    }
    setShowHideConfirm(false);
    setFloorToHide(null);
  };

  const handleUnhideFloorLevel = (floorLevelId: number, levelName: string) => {
    setFloorToUnhide({ id: floorLevelId, name: levelName });
    setShowUnhideConfirm(true);
  };

  const confirmUnhideFloor = async () => {
    if (!floorToUnhide) return;
    try {
      await unhideFloorLevelMutation.mutateAsync({ floorLevelId: floorToUnhide.id });
      toast.success(`Floor "${floorToUnhide.name}" has been restored to public view`);
    } catch (error) {
      console.error('Unhide mutation failed:', error);
      toast.error('Failed to restore floor');
    }
    setShowUnhideConfirm(false);
    setFloorToUnhide(null);
  };

  const handleStartRename = (floorId: number, currentName: string) => {
    setEditingFloorId(floorId);
    setEditingFloorName(currentName);
  };

  const handleConfirmRename = async () => {
    if (!editingFloorId || !editingFloorName.trim()) return;
    await renameFloorLevelMutation.mutateAsync({
      floorLevelId: editingFloorId,
      levelName: editingFloorName.trim(),
    });
  };

  const handleCancelRename = () => {
    setEditingFloorId(null);
    setEditingFloorName("");
  };

  const handleDeleteFloorLevel = (floorId: number, levelName: string) => {
    const siteCount = sites.length;
    setFloorToDelete({ id: floorId, name: levelName, siteCount });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteFloor = async () => {
    if (!floorToDelete) return;
    try {
      await deleteFloorLevelMutation.mutateAsync({ floorLevelId: floorToDelete.id });
    } catch (error) {
      console.error('Delete mutation failed:', error);
    }
    setShowDeleteConfirm(false);
    setFloorToDelete(null);
  };

  const handleCreateFloorLevel = async () => {
    if (!newFloorName || !selectedCentreId) {
      toast.error("Please enter floor name");
      return;
    }

    await createFloorLevelMutation.mutateAsync({
      centreId: selectedCentreId,
      levelName: newFloorName,
      levelNumber: `${floorLevels.length + 1}`, // Auto-generate sequential number
      displayOrder: floorLevels.length,
    });
  };

  /** Persist markers to DB without blocking the UI. */
  const autoSaveMarkers = (currentMarkers: typeof markers) => {
    if (!selectedCentreId || currentMarkers.length === 0) return;
    saveMarkersMutation.mutate({
      centreId: selectedCentreId,
      markers: currentMarkers.map((m) => ({
        siteId: m.siteId,
        x: m.x,
        y: m.y,
      })),
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
      const newMarker = {
        siteId: unmappedSite.id,
        x: Math.round(xPercent * 10) / 10, // Round to 1 decimal
        y: Math.round(yPercent * 10) / 10,
        siteNumber: unmappedSite.siteNumber,
      };
      const updatedMarkers = [...markers, newMarker];
      setMarkers(updatedMarkers);
      // Auto-save immediately so the marker survives navigation
      autoSaveMarkers(updatedMarkers);
      toast.success(`Marker placed for ${unmappedSite.siteNumber}`);
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
    if (isDragging !== null && dragOccurred) {
      // Use functional update to get the latest markers after drag
      setMarkers((currentMarkers) => {
        autoSaveMarkers(currentMarkers);
        return currentMarkers;
      });
    }
    setIsDragging(null);
  };

  const handleRemoveMarker = async (siteId: number) => {
    // Remove from local state immediately for instant feedback
    setMarkers((prev) => prev.filter((m) => m.siteId !== siteId));
    
    // Also remove from database
    try {
      await resetSiteMarkerMutation.mutateAsync({ siteId });
    } catch (error) {
      // If database update fails, revert the local change
      console.error("Failed to reset marker in database:", error);
    }
  };

  const handleSaveMarkers = async () => {
    if (!selectedCentreId || markers.length === 0) {
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
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Map Management</h1>
        </div>

        <div className="space-y-6">
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
                  value={selectedCentreId?.toString() ?? ""}
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
                    {centres.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((centre: any) => (
                      <SelectItem key={centre.id} value={centre.id.toString()}>
                        {centre.name} - {centre.suburb}, {centre.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCentreId && selectedCentreId > 0 && (
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

        {selectedCentreId && selectedCentreId > 0 && (
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
                    <div className="space-y-2">
                      <Tabs value={selectedFloorLevelId?.toString() || ""} onValueChange={(val) => setSelectedFloorLevelId(parseInt(val))}>
                        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${floorLevels.length}, 1fr)` }}>
                          {floorLevels.map((floor: any) => (
                            <TabsTrigger key={floor.id} value={floor.id.toString()} className={floor.isHidden ? "opacity-50 line-through" : ""}>
                              {floor.levelName}
                              {floor.isHidden && (
                                <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">Hidden</span>
                              )}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                      {selectedFloorLevelId && (
                        <div className="space-y-3">
                          {(() => {
                            const floor = floorLevels.find((f: any) => f.id === selectedFloorLevelId);
                            if (!floor) return null;

                            if (editingFloorId === floor.id) {
                              return (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingFloorName}
                                    onChange={(e) => setEditingFloorName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleConfirmRename();
                                      if (e.key === "Escape") handleCancelRename();
                                    }}
                                    className="max-w-xs"
                                    autoFocus
                                  />
                                  <Button size="sm" onClick={handleConfirmRename} disabled={renameFloorLevelMutation.isPending}>
                                    {renameFloorLevelMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelRename}>
                                    Cancel
                                  </Button>
                                </div>
                              );
                            }

                            return (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartRename(floor.id, floor.levelName)}
                                >
                                  Rename
                                </Button>
                                {floor.isHidden ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnhideFloorLevel(floor.id, floor.levelName)}
                                    disabled={unhideFloorLevelMutation.isPending}
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                  >
                                    {unhideFloorLevelMutation.isPending ? "Restoring..." : "Restore to Public"}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleHideFloorLevel(floor.id, floor.levelName)}
                                    disabled={hideFloorLevelMutation.isPending}
                                  >
                                    {hideFloorLevelMutation.isPending ? "Hiding..." : "Hide Floor"}
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteFloorLevel(floor.id, floor.levelName)}
                                  disabled={deleteFloorLevelMutation.isPending}
                                >
                                  Delete Floor
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add New Floor Level */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Add New Floor Level</h4>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="floor-name">Floor Name</Label>
                        <Input
                          id="floor-name"
                          placeholder="e.g., Ground Floor, Level 1, Mezzanine"
                          value={newFloorName}
                          onChange={(e) => setNewFloorName(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleCreateFloorLevel}
                          disabled={createFloorLevelMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
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
                    <p className="text-sm text-gray-500 mt-1">Choose a file and then click Upload Map to save it.</p>
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
                    {sites.length > 0
                      ? "Click on the map to place the next unplaced site. Drag markers to reposition them."
                      : "No sites have been created yet. Create sites first, then return here to place them on the map."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sites.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                        <MapPin className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                        <p className="text-amber-800 font-medium mb-2">No sites to place on this map</p>
                        <p className="text-sm text-amber-700 mb-4">
                          Sites need to be created before they can be positioned on the floor plan.
                        </p>
                        <Button
                          onClick={() => setLocation(`/admin/sites?centreId=${selectedCentreId}`)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Go to Site Management
                        </Button>
                      </div>
                    ) : (
                      <>
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
                              onError={() => {
                                // Try proxying through the image proxy if direct URL fails
                                const src = mapPreviewUrl;
                                if (!src.startsWith("data:") && !src.startsWith("/api/image-proxy")) {
                                  setMapPreviewUrl(`/api/image-proxy?url=${encodeURIComponent(src)}`);
                                }
                              }}
                            />
                            {markers.map((marker) => (
                              <div
                                key={marker.siteId}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move group"
                                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                onMouseDown={() => handleMarkerDragStart(marker.siteId)}
                              >
                                <div className="relative">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#123047', color: '#F5F7FA' }}>
                                    {marker.siteNumber}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveMarker(marker.siteId);
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

                        {/* Unmapped sites list */}
                        {(() => {
                          const unmappedSites = sites.filter(
                            (site: any) => !markers.some((m) => m.siteId === site.id)
                          );
                          if (unmappedSites.length === 0) return null;
                          return (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-blue-800 mb-1">
                                Unplaced sites ({unmappedSites.length}):
                              </p>
                              <p className="text-sm text-blue-700">
                                {unmappedSites.map((s: any) => s.siteNumber).join(", ")}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Click on the map to place the next site: <strong>{unmappedSites[0]?.siteNumber}</strong>
                              </p>
                            </div>
                          );
                        })()}

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
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      </div>

      {/* Hide Floor Confirmation Dialog */}
      {showHideConfirm && floorToHide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Hide Floor</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to hide "{floorToHide.name}"? Hidden floors won't appear in public views but all historical data will be preserved.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowHideConfirm(false); setFloorToHide(null); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmHideFloor} disabled={hideFloorLevelMutation.isPending}>
                {hideFloorLevelMutation.isPending ? "Hiding..." : "Hide Floor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unhide Floor Confirmation Dialog */}
      {showUnhideConfirm && floorToUnhide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Restore Floor</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to restore "{floorToUnhide.name}" to public view?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowUnhideConfirm(false); setFloorToUnhide(null); }}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={confirmUnhideFloor} disabled={unhideFloorLevelMutation.isPending}>
                {unhideFloorLevelMutation.isPending ? "Restoring..." : "Restore Floor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Floor Confirmation Dialog */}
      {showDeleteConfirm && floorToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Delete Floor Level</h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to permanently delete "{floorToDelete.name}"?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This will permanently remove this floor level. Sites assigned to it will become unassigned and their map markers will be cleared. This cannot be undone.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Consider using "Hide Floor" instead if you want to preserve historical data.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setFloorToDelete(null); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteFloor} disabled={deleteFloorLevelMutation.isPending}>
                {deleteFloorLevelMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
