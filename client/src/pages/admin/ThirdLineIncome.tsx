import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Layers, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function ThirdLineIncome() {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
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
    onSuccess: () => {
      toast.success("Third Line Income asset created successfully");
      setIsDialogOpen(false);
      resetForm();
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
              <div className="space-y-2">
                <Label htmlFor="imageUrl1">Image File Location 1</Label>
                <Input
                  id="imageUrl1"
                  value={formData.imageUrl1}
                  onChange={(e) => setFormData({ ...formData, imageUrl1: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl2">Image File Location 2</Label>
                <Input
                  id="imageUrl2"
                  value={formData.imageUrl2}
                  onChange={(e) => setFormData({ ...formData, imageUrl2: e.target.value })}
                  placeholder="https://..."
                />
              </div>
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
      </div>
    </AdminLayout>
  );
}
