import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Layers, Building2, Upload, RotateCw } from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

// Helper function to create cropped image
const createCroppedImage = async (imageSrc: string, pixelCrop: Area, rotation: number): Promise<Blob> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (error) => reject(error));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
    0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/jpeg', 0.95);
  });
};

export default function ThirdLineIncome() {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Image preview and crop states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewSlot, setPreviewSlot] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [formData, setFormData] = useState({
    assetNumber: "",
    categoryId: null as number | null,
    dimensions: "",
    powered: false,
    description: "",
    imageUrl1: "",
    imageUrl2: "",
    pricePerWeek: "",
    pricePerMonth: "",
    floorLevelId: null as number | null,
    isActive: true,
  });

  const { data: centres } = trpc.centres.list.useQuery();
  const { data: categories } = trpc.thirdLineCategories.listActive.useQuery();
  const { data: assets, isLoading, refetch } = trpc.thirdLineIncome.getByCentre.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );
  const { data: floorLevels } = trpc.admin.getFloorLevels.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );

  const createMutation = trpc.thirdLineIncome.create.useMutation({
    onSuccess: (newAsset) => {
      toast.success("Third Line Income asset created successfully");
      // Set editingAsset to the newly created asset so user can upload images
      setEditingAsset(newAsset);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.thirdLineIncome.update.useMutation({
    onSuccess: () => {
      toast.success("Third Line Income asset updated successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.thirdLineIncome.delete.useMutation({
    onSuccess: () => {
      toast.success("Third Line Income asset deleted successfully");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const uploadImageMutation = trpc.thirdLineIncome.uploadImage.useMutation();

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (file: File, slot: number) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      setPreviewSlot(slot);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
  };

  const handleCropConfirm = async () => {
    if (!previewImage || !editingAsset || previewSlot === null || !croppedAreaPixels) {
      toast.error("Missing required data for upload");
      return;
    }

    setUploadingImage(true);
    try {
      const croppedBlob = await createCroppedImage(previewImage, croppedAreaPixels, rotation);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(croppedBlob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
      });

      const result = await uploadImageMutation.mutateAsync({
        assetId: editingAsset.id,
        imageSlot: previewSlot,
        base64Image: base64,
      });

      // Update editingAsset with the new image URL so it displays immediately
      setEditingAsset((prev: any) => ({
        ...prev,
        [`imageUrl${previewSlot}`]: result.url,
      }));

      toast.success("Image uploaded successfully");
      refetch();
      setPreviewImage(null);
      setPreviewSlot(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload original image without cropping
  const handleUploadOriginal = async () => {
    if (!previewImage || !editingAsset || previewSlot === null) {
      toast.error("Missing required data for upload");
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadImageMutation.mutateAsync({
        assetId: editingAsset.id,
        imageSlot: previewSlot,
        base64Image: previewImage, // Use original image directly
      });

      setEditingAsset((prev: any) => ({
        ...prev,
        [`imageUrl${previewSlot}`]: result.url,
      }));

      toast.success("Image uploaded successfully");
      refetch();
      setPreviewImage(null);
      setPreviewSlot(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      assetNumber: "",
      categoryId: null,
      dimensions: "",
      powered: false,
      description: "",
      imageUrl1: "",
      imageUrl2: "",
      pricePerWeek: "",
      pricePerMonth: "",
      floorLevelId: null,
      isActive: true,
    });
    setEditingAsset(null);
  };

  const handleOpenDialog = (asset?: any) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        assetNumber: asset.assetNumber || "",
        categoryId: asset.categoryId || null,
        dimensions: asset.dimensions || "",
        powered: asset.powered ?? false,
        description: asset.description || "",
        imageUrl1: asset.imageUrl1 || "",
        imageUrl2: asset.imageUrl2 || "",
        pricePerWeek: asset.pricePerWeek || "",
        pricePerMonth: asset.pricePerMonth || "",
        floorLevelId: asset.floorLevelId || null,
        isActive: asset.isActive ?? true,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.assetNumber.trim()) {
      toast.error("Asset number is required");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Category is required");
      return;
    }

    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, ...formData, categoryId: formData.categoryId! });
    } else {
      createMutation.mutate({ centreId: selectedCentreId!, ...formData, categoryId: formData.categoryId! });
    }
  };

  const handleDelete = (id: number, assetNumber: string) => {
    if (confirm(`Are you sure you want to delete asset "${assetNumber}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const selectedCentre = centres?.find((c: any) => c.id === selectedCentreId);
  const getCategoryName = (categoryId: number) => {
    const category = categories?.find((c: any) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Third Line Income</h1>
            <p className="text-muted-foreground">
              Manage non-tenancy assets like ATMs, vending machines, signage, and other income sources
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Shopping Centre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCentreId?.toString() || ""}
              onValueChange={(value) => setSelectedCentreId(parseInt(value))}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a shopping centre..." />
              </SelectTrigger>
              <SelectContent>
                {centres?.map((centre: any) => (
                  <SelectItem key={centre.id} value={centre.id.toString()}>
                    {centre.name} ({centre.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCentreId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Third Line Income at {selectedCentre?.name} ({assets?.length || 0})
              </CardTitle>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading assets...</div>
              ) : assets && assets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Asset #</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Price/Week</TableHead>
                      <TableHead>Price/Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset: any) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          {asset.imageUrl1 ? (
                            <img src={asset.imageUrl1} alt={asset.assetNumber} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Layers className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{asset.assetNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.categoryName || getCategoryName(asset.categoryId)}</Badge>
                        </TableCell>
                        <TableCell>{asset.dimensions || "-"}</TableCell>
                        <TableCell>{asset.floorLevelName || "-"}</TableCell>
                        <TableCell>{asset.pricePerWeek ? `$${asset.pricePerWeek}` : "-"}</TableCell>
                        <TableCell>{asset.pricePerMonth ? `$${asset.pricePerMonth}` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={asset.isActive ? "default" : "secondary"}>
                            {asset.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(asset)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id, asset.assetNumber)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No Third Line Income assets found for this centre. Add your first asset to get started.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAsset ? "Edit Third Line Income Asset" : "Add Third Line Income Asset"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="assetNumber">Asset Number *</Label>
                <Input
                  id="assetNumber"
                  value={formData.assetNumber}
                  onChange={(e) => setFormData({ ...formData, assetNumber: e.target.value })}
                  placeholder="e.g., ATM-01, VND-05"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  value={formData.categoryId?.toString() || ""}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="e.g., 1.5m x 0.8m"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floorLevel">Floor Level</Label>
                <Select
                  value={formData.floorLevelId?.toString() || "none"}
                  onValueChange={(value) => setFormData({ ...formData, floorLevelId: value === "none" ? null : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No floor assigned</SelectItem>
                    {floorLevels?.map((level: any) => (
                      <SelectItem key={level.id} value={level.id.toString()}>
                        {level.levelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerWeek">Price per Week ($)</Label>
                <Input
                  id="pricePerWeek"
                  value={formData.pricePerWeek}
                  onChange={(e) => setFormData({ ...formData, pricePerWeek: e.target.value })}
                  placeholder="e.g., 200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerMonth">Price per Month ($)</Label>
                <Input
                  id="pricePerMonth"
                  value={formData.pricePerMonth}
                  onChange={(e) => setFormData({ ...formData, pricePerMonth: e.target.value })}
                  placeholder="e.g., 750"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the asset location and details..."
                  rows={3}
                />
              </div>

              {/* Image Upload Section - Show when editing or after creating */}
              {editingAsset && (
                <div className="col-span-2 space-y-2">
                  <Label>Asset Images</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((slot) => {
                      const imageUrl = editingAsset?.[`imageUrl${slot}`];
                      return (
                        <div key={slot} className="border rounded-lg p-3">
                          <div className="text-sm font-medium mb-2">Image {slot}</div>
                          {imageUrl ? (
                            <div className="relative">
                              <img
                                src={imageUrl}
                                alt={`Asset image ${slot}`}
                                className="w-full h-32 object-contain rounded-md bg-gray-100"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1"
                                disabled={updateMutation.isPending}
                                onClick={async () => {
                                  try {
                                    await updateMutation.mutateAsync({
                                      id: editingAsset.id,
                                      [`imageUrl${slot}`]: "",
                                    } as any);
                                    toast.success(`Image ${slot} removed`);
                                    refetch();
                                  } catch (error: any) {
                                    toast.error(error.message || "Failed to remove image");
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="border-2 border-dashed rounded-md p-4 text-center hover:border-blue-400 transition-colors"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleFileSelect(file, slot);
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`tli-image-upload-${slot}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileSelect(file, slot);
                                }}
                              />
                              <label htmlFor={`tli-image-upload-${slot}`} className="cursor-pointer">
                                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <div className="text-sm text-gray-600">Click or drag to upload</div>
                                <div className="text-xs text-gray-400 mt-1">Max 5MB</div>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {uploadingImage && (
                    <div className="text-sm text-blue-600">Uploading image...</div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="powered">Powered</Label>
                <Switch
                  id="powered"
                  checked={formData.powered}
                  onCheckedChange={(checked) => setFormData({ ...formData, powered: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAsset ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview and Crop Modal */}
        <Dialog open={previewImage !== null} onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null);
            setPreviewSlot(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Crop and Rotate Image</DialogTitle>
              <DialogDescription>
                Adjust the image before uploading.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative h-[400px] bg-gray-100 rounded-lg overflow-hidden">
                {previewImage && (
                  <Cropper
                    image={previewImage}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={undefined}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    showGrid={true}
                  />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm flex items-center gap-2">
                    <span>Zoom</span>
                    <span className="text-gray-500 text-xs">{zoom.toFixed(1)}x</span>
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    <span>Rotation</span>
                    <span className="text-gray-500 text-xs">{rotation}°</span>
                  </Label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setRotation((r) => (r - 90 + 360) % 360)}>
                      Rotate Left 90°
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)}>
                      Rotate Right 90°
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewImage(null)}>Cancel</Button>
              <Button variant="secondary" onClick={handleUploadOriginal} disabled={uploadingImage}>
                {uploadingImage ? "Uploading..." : "Use Original"}
              </Button>
              <Button onClick={handleCropConfirm} disabled={uploadingImage}>
                {uploadingImage ? "Uploading..." : "Upload Cropped"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
