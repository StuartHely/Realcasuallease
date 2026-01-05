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
import { trpc } from "@/lib/trpc";
import { Building2, Edit, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCentres() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<any>(null);
  
  const { data: centres, refetch } = trpc.centres.list.useQuery();
  const createMutation = trpc.admin.createCentre.useMutation();
  const updateMutation = trpc.admin.updateCentre.useMutation();
  const deleteMutation = trpc.admin.deleteCentre.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    suburb: "",
    city: "",
    state: "",
    postcode: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      suburb: "",
      city: "",
      state: "",
      postcode: "",
      description: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      toast.success("Shopping centre created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create centre");
    }
  };

  const handleEdit = (centre: any) => {
    setSelectedCentre(centre);
    setFormData({
      name: centre.name,
      address: centre.address || "",
      suburb: centre.suburb || "",
      city: centre.city || "",
      state: centre.state || "",
      postcode: centre.postcode || "",
      description: centre.description || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentre) return;
    
    try {
      await updateMutation.mutateAsync({
        id: selectedCentre.id,
        ...formData,
      });
      toast.success("Shopping centre updated successfully");
      setIsEditOpen(false);
      setSelectedCentre(null);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update centre");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated sites.`)) {
      return;
    }
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Shopping centre deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete centre");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Shopping Centres</h1>
            <p className="text-muted-foreground">
              Manage shopping centres and their details
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Centre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Shopping Centre</DialogTitle>
                  <DialogDescription>
                    Add a new shopping centre to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Centre Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="suburb">Suburb</Label>
                      <Input
                        id="suburb"
                        value={formData.suburb}
                        onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={formData.postcode}
                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Centre"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Edit Shopping Centre</DialogTitle>
                <DialogDescription>
                  Update shopping centre details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Centre Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Street Address</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-suburb">Suburb</Label>
                    <Input
                      id="edit-suburb"
                      value={formData.suburb}
                      onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-postcode">Postcode</Label>
                    <Input
                      id="edit-postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Centre"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Centres List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {centres?.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((centre) => (
            <Card key={centre.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{centre.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(centre)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(centre.id, centre.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {centre.suburb && centre.city
                    ? `${centre.suburb}, ${centre.city}`
                    : centre.suburb || centre.city || "No location"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {centre.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{centre.address}</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => window.location.href = `/admin/sites?centreId=${centre.id}`}
                >
                  Manage Sites
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {centres?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shopping centres yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first shopping centre
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Centre
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
