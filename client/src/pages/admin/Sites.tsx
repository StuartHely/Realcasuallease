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
import { Edit, Image as ImageIcon, MapPin, Plus, Trash2, Upload, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import BulkImageImport from "@/components/BulkImageImport";
import { ManageSiteCategoriesDialog } from "@/components/ManageSiteCategoriesDialog";
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

  const { data: centres } = trpc.centres.list.useQuery();
  const { data: sites, refetch } = trpc.sites.getByCentreId.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );
  
  const createMutation = trpc.admin.createSite.useMutation();
  const updateMutation = trpc.admin.updateSite.useMutation();
  const deleteMutation = trpc.admin.deleteSite.useMutation();
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
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Upload via tRPC
        await uploadImageMutation.mutateAsync({
          siteId,
          imageSlot,
          base64Image: base64,
        });
        
        toast.success("Image uploaded and resized successfully");
        refetch();
      };
      reader.onerror = () => {
        throw new Error("Failed to read file");
      };
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
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
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
                  <CardDescription>{site.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {site.imageUrl1 && (
                    <img
                      src={site.imageUrl1}
                      alt={`Site ${site.siteNumber}`}
                      className="w-full h-32 object-contain rounded-md bg-gray-100"
                    />
                  )}
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
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
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
                            <img
                              src={imageUrl}
                              alt={`Site image ${slot}`}
                              className="w-full h-32 object-contain rounded-md bg-gray-100"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1"
                              onClick={async () => {
                                await updateMutation.mutateAsync({
                                  id: selectedSite.id,
                                  [`imageUrl${slot}`]: null,
                                } as any);
                                refetch();
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-md p-4 text-center">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`image-upload-${slot}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedSite) {
                                  handleImageUpload(selectedSite.id, slot, file);
                                }
                              }}
                            />
                            <label htmlFor={`image-upload-${slot}`} className="cursor-pointer">
                              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <div className="text-sm text-gray-600">Click to upload</div>
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
