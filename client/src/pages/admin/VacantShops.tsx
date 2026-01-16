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
import { Plus, Pencil, Trash2, Store, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function VacantShops() {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [formData, setFormData] = useState({
    shopNumber: "",
    totalSizeM2: "",
    dimensions: "",
    powered: true,
    description: "",
    imageUrl1: "",
    imageUrl2: "",
    pricePerWeek: "",
    pricePerMonth: "",
    floorLevelId: null as number | null,
    isActive: true,
  });

  const { data: centres } = trpc.centres.list.useQuery();
  const { data: shops, isLoading, refetch } = trpc.vacantShops.getByCentre.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );
  const { data: floorLevels } = trpc.admin.getFloorLevels.useQuery(
    { centreId: selectedCentreId! },
    { enabled: !!selectedCentreId }
  );

  const createMutation = trpc.vacantShops.create.useMutation({
    onSuccess: () => {
      toast.success("Vacant shop created successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.vacantShops.update.useMutation({
    onSuccess: () => {
      toast.success("Vacant shop updated successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.vacantShops.delete.useMutation({
    onSuccess: () => {
      toast.success("Vacant shop deleted successfully");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      shopNumber: "",
      totalSizeM2: "",
      dimensions: "",
      powered: true,
      description: "",
      imageUrl1: "",
      imageUrl2: "",
      pricePerWeek: "",
      pricePerMonth: "",
      floorLevelId: null,
      isActive: true,
    });
    setEditingShop(null);
  };

  const handleOpenDialog = (shop?: any) => {
    if (shop) {
      setEditingShop(shop);
      setFormData({
        shopNumber: shop.shopNumber || "",
        totalSizeM2: shop.totalSizeM2 || "",
        dimensions: shop.dimensions || "",
        powered: shop.powered ?? true,
        description: shop.description || "",
        imageUrl1: shop.imageUrl1 || "",
        imageUrl2: shop.imageUrl2 || "",
        pricePerWeek: shop.pricePerWeek || "",
        pricePerMonth: shop.pricePerMonth || "",
        floorLevelId: shop.floorLevelId || null,
        isActive: shop.isActive ?? true,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.shopNumber.trim()) {
      toast.error("Shop number is required");
      return;
    }

    if (editingShop) {
      updateMutation.mutate({ id: editingShop.id, ...formData });
    } else {
      createMutation.mutate({ centreId: selectedCentreId!, ...formData });
    }
  };

  const handleDelete = (id: number, shopNumber: string) => {
    if (confirm(`Are you sure you want to delete shop "${shopNumber}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const selectedCentre = centres?.find((c: any) => c.id === selectedCentreId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vacant Shops</h1>
            <p className="text-muted-foreground">
              Manage short-term vacant shop tenancies available for weekly or monthly booking
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
                <Store className="h-5 w-5" />
                Vacant Shops at {selectedCentre?.name} ({shops?.length || 0})
              </CardTitle>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vacant Shop
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading shops...</div>
              ) : shops && shops.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop #</TableHead>
                      <TableHead>Size (m²)</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Price/Week</TableHead>
                      <TableHead>Price/Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((shop: any) => (
                      <TableRow key={shop.id}>
                        <TableCell className="font-medium">{shop.shopNumber}</TableCell>
                        <TableCell>{shop.totalSizeM2 || "-"}</TableCell>
                        <TableCell>{shop.dimensions || "-"}</TableCell>
                        <TableCell>{shop.floorLevelName || "-"}</TableCell>
                        <TableCell>{shop.pricePerWeek ? `$${shop.pricePerWeek}` : "-"}</TableCell>
                        <TableCell>{shop.pricePerMonth ? `$${shop.pricePerMonth}` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={shop.isActive ? "default" : "secondary"}>
                            {shop.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(shop)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(shop.id, shop.shopNumber)}>
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
                  No vacant shops found for this centre. Add your first vacant shop to get started.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingShop ? "Edit Vacant Shop" : "Add Vacant Shop"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shopNumber">Shop Number *</Label>
                <Input
                  id="shopNumber"
                  value={formData.shopNumber}
                  onChange={(e) => setFormData({ ...formData, shopNumber: e.target.value })}
                  placeholder="e.g., 101, G-15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSizeM2">Total Size (m²)</Label>
                <Input
                  id="totalSizeM2"
                  value={formData.totalSizeM2}
                  onChange={(e) => setFormData({ ...formData, totalSizeM2: e.target.value })}
                  placeholder="e.g., 50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="e.g., 5m x 10m"
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
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerMonth">Price per Month ($)</Label>
                <Input
                  id="pricePerMonth"
                  value={formData.pricePerMonth}
                  onChange={(e) => setFormData({ ...formData, pricePerMonth: e.target.value })}
                  placeholder="e.g., 1800"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the vacant shop..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl1">Image URL 1</Label>
                <Input
                  id="imageUrl1"
                  value={formData.imageUrl1}
                  onChange={(e) => setFormData({ ...formData, imageUrl1: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl2">Image URL 2</Label>
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
                {editingShop ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
