import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteImageCarousel } from "@/components/SiteImageCarousel";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Edit, Image as ImageIcon, MapPin, Plus, Trash2, Upload, Tag, X, RotateCw, Crop } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import BulkImageImport from "@/components/BulkImageImport";
import { ManageSiteCategoriesDialog } from "@/components/ManageSiteCategoriesDialog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminSites() {
  const [location] = useLocation();
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  
  // Update selectedCentreId when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1]);
    const centreIdParam = urlParams.get('centreId');
    if (centreIdParam) {
      setSelectedCentreId(parseInt(centreIdParam));
    }
  }, [location]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [categoriesSite, setCategoriesSite] = useState<any>(null);
  
  // Image preview and crop states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewSlot, setPreviewSlot] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { data: centres } = trpc.centres.list.useQuery();
  const { data: sites, refetch } = trpc.sites.getByCentreId.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );
  
  const createMutation = trpc.admin.createSite.useMutation();
  const updateMutation = trpc.admin.updateSite.useMutation();
  const deleteMutation = trpc.admin.deleteSite.useMutation();
  const uploadPanorama = trpc.admin.uploadSitePanorama.useMutation({
    onSuccess: () => {
      refetch();
    }
  });
  const removePanorama = trpc.admin.removeSitePanorama.useMutation({
    onSuccess: () => {
      refetch();
    }
  });
  const uploadImageMutation = trpc.admin.uploadSiteImage.useMutation();

  const [formData, setFormData] = useState({
    siteNumber: "",
    description: "",
    size: "",
    maxTables: "",
    powerAvailable: "No",
    restrictions: "",
    dailyRate: "",
    weeklyRate: "",
    weekendRate: "",
    instantBooking: false,
  });

  const resetForm = () => {
    setFormData({
      siteNumber: "",
      description: "",
      size: "",
      maxTables: "",
      powerAvailable: "No",
      restrictions: "",
      dailyRate: "",
      weeklyRate: "",
      weekendRate: "",
      instantBooking: false,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentreId) {
      toast.error("Please select a shopping centre first");
      return;
    }
    
    try {
      await createMutation.mutateAsync({
        centreId: selectedCentreId,
        ...formData,
        maxTables: formData.maxTables ? parseInt(formData.maxTables) : undefined,
      });
      toast.success("Site created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create site");
    }
  };

  const handleEdit = (site: any) => {
    setSelectedSite(site);
    setFormData({
      siteNumber: site.siteNumber,
      description: site.description || "",
      size: site.size || "",
      maxTables: site.maxTables?.toString() || "",
      powerAvailable: site.powerAvailable || "No",
      restrictions: site.restrictions || "",
      dailyRate: site.pricePerDay || "",
      weeklyRate: site.pricePerWeek || "",
      weekendRate: site.weekendPricePerDay || "",
      instantBooking: site.instantBooking || false,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    
    try {
      await updateMutation.mutateAsync({
        id: selectedSite.id,
        ...formData,
        maxTables: formData.maxTables ? parseInt(formData.maxTables) : undefined,
      });
      toast.success("Site updated successfully");
      setIsEditOpen(false);
      setSelectedSite(null);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update site");
    }
  };

  const handleDelete = async (id: number, siteNumber: string) => {
    if (!confirm(`Are you sure you want to delete site "${siteNumber}"?`)) {
      return;
    }
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Site deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete site");
    }
  };

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

    // Show preview modal
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      setPreviewFile(file);
      setPreviewSlot(slot);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
  };

  const handleCropConfirm = async () => {
    if (!previewImage || !previewFile || !selectedSite || previewSlot === null || !croppedAreaPixels) {
      toast.error("Missing required data for upload");
      return;
    }

    setUploadingImage(true);
    try {
      // Create cropped image
      const croppedBlob = await createCroppedImage(previewImage, croppedAreaPixels, rotation);
      
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(croppedBlob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
      });
      
      // Upload via tRPC
      await uploadImageMutation.mutateAsync({
        siteId: selectedSite.id,
        imageSlot: previewSlot,
        base64Image: base64,
      });
      
      toast.success("Image uploaded and resized successfully");
      refetch();
      
      // Close preview
      setPreviewImage(null);
      setPreviewFile(null);
      setPreviewSlot(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (siteId: number, imageSlot: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    
    try {
      // Convert file to base64 using Promise
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
      });
      
      // Upload via tRPC
      await uploadImageMutation.mutateAsync({
        siteId,
        imageSlot,
        base64Image: base64,
      });
      
      toast.success("Image uploaded and resized successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const selectedCentre = centres?.find((c) => c.id === selectedCentreId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sites</h1>
            <p className="text-muted-foreground">
              Manage retail sites and spaces
            </p>
          </div>
          <div className="flex gap-2">
            {selectedCentreId && (
              <BulkImageImport centreId={selectedCentreId} onComplete={refetch} />
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedCentreId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Site
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Site</DialogTitle>
                  <DialogDescription>
                    Add a new retail site to {selectedCentre?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="siteNumber">Site Number *</Label>
                      <Input
                        id="siteNumber"
                        value={formData.siteNumber}
                        onChange={(e) => setFormData({ ...formData, siteNumber: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="size">Size</Label>
                      <Input
                        id="size"
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        placeholder="e.g., 3m x 2m"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      placeholder="Enter site description..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Select text and click Bold, Italic, or Underline to format
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="maxTables">Max Tables</Label>
                      <Input
                        id="maxTables"
                        type="number"
                        value={formData.maxTables}
                        onChange={(e) => setFormData({ ...formData, maxTables: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="powerAvailable">Power Available</Label>
                      <Select
                        value={formData.powerAvailable}
                        onValueChange={(value) => setFormData({ ...formData, powerAvailable: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Upon Request">Upon Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="restrictions">Restrictions</Label>
                    <Textarea
                      id="restrictions"
                      value={formData.restrictions}
                      onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dailyRate">Mon-Fri Daily Rate ($) *</Label>
                      <Input
                        id="dailyRate"
                        value={formData.dailyRate}
                        onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                        placeholder="150.00"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="weekendRate">Weekend Daily Rate ($)</Label>
                      <Input
                        id="weekendRate"
                        value={formData.weekendRate}
                        onChange={(e) => setFormData({ ...formData, weekendRate: e.target.value })}
                        placeholder="Leave empty to use Mon-Fri rate"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weeklyRate">Weekly Rate ($) *</Label>
                    <Input
                      id="weeklyRate"
                      value={formData.weeklyRate}
                      onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                      placeholder="750.00"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="instantBooking"
                      checked={formData.instantBooking}
                      onCheckedChange={(checked) => setFormData({ ...formData, instantBooking: checked })}
                    />
                    <Label htmlFor="instantBooking">Enable Instant Booking</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Site"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Centre Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Shopping Centre</CardTitle>
            <CardDescription>Choose a centre to view and manage its sites</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCentreId?.toString() || ""}
              onValueChange={(value) => setSelectedCentreId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a shopping centre..." />
              </SelectTrigger>
              <SelectContent>
                {centres?.sort((a, b) => a.name.localeCompare(b.name)).map((centre) => (
                  <SelectItem key={centre.id} value={centre.id.toString()}>
                    {centre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Sites List */}
        {selectedCentreId && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites?.map((site) => (
              <Card key={site.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">Site {site.siteNumber}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCategoriesSite(site);
                          setIsCategoriesOpen(true);
                        }}
                        title="Manage Categories"
                      >
                        <Tag className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(site)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(site.id, site.siteNumber)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription><span dangerouslySetInnerHTML={{ __html: site.description || "No description" }} /></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full aspect-[3/2] rounded-md overflow-hidden">
                    <SiteImageCarousel
                      images={[site.imageUrl1, site.imageUrl2, site.imageUrl3, site.imageUrl4]}
                      siteNumber={site.siteNumber || ""}
                      size={site.size || ""}
                      powered={site.powerAvailable === "Powered Site" || site.powerAvailable === "Power Available"}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <p className="font-medium">{site.size || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Power:</span>
                      <p className="font-medium">{site.powerAvailable || "No"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weekday:</span>
                      <p className="font-medium">${site.pricePerDay}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weekend:</span>
                      <p className="font-medium">${site.weekendPricePerDay || site.pricePerDay}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weekly:</span>
                      <p className="font-medium">${site.pricePerWeek}</p>
                    </div>
                  </div>
                  {site.instantBooking && (
                    <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                      ✓ Instant Booking
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedCentreId && sites?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first site to {selectedCentre?.name}
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog - Similar to Create but with edit functionality */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Site</DialogTitle>
              <DialogDescription>Update site details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Same form fields as create */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-siteNumber">Site Number *</Label>
                  <Input
                    id="edit-siteNumber"
                    value={formData.siteNumber}
                    onChange={(e) => setFormData({ ...formData, siteNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-size">Size</Label>
                  <Input
                    id="edit-size"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Enter site description..."
                />
                <p className="text-xs text-muted-foreground">
                  Select text and click Bold, Italic, or Underline to format
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-maxTables">Max Tables</Label>
                  <Input
                    id="edit-maxTables"
                    type="number"
                    value={formData.maxTables}
                    onChange={(e) => setFormData({ ...formData, maxTables: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-powerAvailable">Power Available</Label>
                  <Select
                    value={formData.powerAvailable}
                    onValueChange={(value) => setFormData({ ...formData, powerAvailable: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Upon Request">Upon Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-restrictions">Restrictions</Label>
                <Textarea
                  id="edit-restrictions"
                  value={formData.restrictions}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-dailyRate">Mon-Fri Daily Rate ($)</Label>
                  <Input
                    id="edit-dailyRate"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-weekendRate">Weekend Daily Rate ($)</Label>
                  <Input
                    id="edit-weekendRate"
                    value={formData.weekendRate}
                    onChange={(e) => setFormData({ ...formData, weekendRate: e.target.value })}
                    placeholder="Leave empty to use Mon-Fri rate"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-weeklyRate">Weekly Rate ($)</Label>
                <Input
                  id="edit-weeklyRate"
                  value={formData.weeklyRate}
                  onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-instantBooking"
                  checked={formData.instantBooking}
                  onCheckedChange={(checked) => setFormData({ ...formData, instantBooking: checked })}
                />
                <Label htmlFor="edit-instantBooking">Enable Instant Booking</Label>
              </div>
              
              {/* Image Upload Section */}
              <div className="grid gap-2">
                <Label>Site Images</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((slot) => {
                    const imageUrl = selectedSite?.[`imageUrl${slot}`];
                    return (
                      <div key={slot} className="border rounded-lg p-3">
                        <div className="text-sm font-medium mb-2">Image {slot}</div>
                        {imageUrl ? (
                          <div className="relative">
                            <ImageWithFallback
                              src={imageUrl}
                              alt={`Site image ${slot}`}
                              className="w-full h-32 object-contain rounded-md"
                              containerClassName="w-full h-32 bg-gray-100 rounded-md"
                              placeholder={{ type: "site", number: selectedSite?.siteNumber || "", size: selectedSite?.size || "" }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1"
                              disabled={updateMutation.isPending}
                              onClick={async () => {
                                console.log(`Attempting to remove image ${slot} for site ${selectedSite.id}`);
                                try {
                                  const payload = {
                                    id: selectedSite.id,
                                    [`imageUrl${slot}`]: null,
                                  };
                                  console.log('Mutation payload:', payload);
                                  const result = await updateMutation.mutateAsync(payload);
                                  console.log('Mutation result:', result);
                                  toast.success(`Image ${slot} removed successfully`);
                                  await refetch();
                                  console.log('Refetch completed');
                                } catch (error) {
                                  console.error('Image removal error:', error);
                                  toast.error(`Failed to remove image: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                              }}
                            >
                              {updateMutation.isPending ? 'Removing...' : 'Remove'}
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
                              if (file && selectedSite) {
                                handleFileSelect(file, slot);
                              }
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`image-upload-${slot}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedSite) {
                                  handleFileSelect(file, slot);
                                }
                              }}
                            />
                            <label htmlFor={`image-upload-${slot}`} className="cursor-pointer">
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
                  <div className="text-sm text-blue-600">Uploading and resizing image...</div>
                )}
              </div>
            </div>
	    
            {/* 360° Panorama Upload */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">360° Panorama Image</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload an equirectangular panorama image (2:1 aspect ratio recommended)
              </p>
              
              {selectedSite?.panoramaImageUrl && (
                           <div className="mb-4 relative">
                  <img 
                    src={selectedSite.panoramaImageUrl} 
                    alt="Current panorama"
                    className="w-full max-w-md h-32 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={async () => {
                      if (!selectedSite) return;
                      try {
                        await removePanorama.mutateAsync({ siteId: selectedSite.id });
                        toast.success('Panorama removed');
                        refetch();
                      } catch (error) {
                        toast.error('Failed to remove panorama');
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !selectedSite) return;
                  
                  console.log('PANORAMA UPLOAD:', file.name, file.size);
                  
                  // Validate file size (20MB max)
                  if (file.size > 20 * 1024 * 1024) {
                    toast.error("Panorama image must be less than 20MB");
                    return;
                  }
                  
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    const base64 = event.target?.result as string;
                    try {
                      await uploadPanorama.mutateAsync({
                        siteId: selectedSite.id,
                        base64Image: base64,
                      });
                      toast.success('Panorama uploaded successfully');
                      refetch();
                    } catch (error) {
                      toast.error('Failed to upload panorama');
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Site"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview and Crop Modal */}
      <Dialog open={previewImage !== null} onOpenChange={(open) => {
        if (!open) {
          setPreviewImage(null);
          setPreviewFile(null);
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
              Adjust the image before uploading. You can zoom, rotate, and crop to get the perfect shot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cropper */}
            <div className="relative h-[400px] bg-gray-100 rounded-lg overflow-hidden">
              {previewImage && (
                <Cropper
                  image={previewImage}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={4 / 3}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>
            
            {/* Controls */}
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  >
                    Rotate Left 90°
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    Rotate Right 90°
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreviewImage(null);
                setPreviewFile(null);
                setPreviewSlot(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropConfirm}
              disabled={uploadingImage}
            >
              {uploadingImage ? 'Uploading...' : 'Upload Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      {categoriesSite && (
        <ManageSiteCategoriesDialog
          open={isCategoriesOpen}
          onOpenChange={setIsCategoriesOpen}
          siteId={categoriesSite.id}
          siteNumber={categoriesSite.siteNumber}
          centreName={selectedCentre?.name || ""}
        />
      )}
    </AdminLayout>
  );
}
