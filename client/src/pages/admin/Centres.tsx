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
import { Building2, Edit, Eye, EyeOff, MapPin, Plus, Trash2, Upload, FileText, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

export default function AdminCentres() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState<number | null>(null);
  const pdfInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  
  const { data: centres, refetch } = trpc.centres.list.useQuery();
  const createMutation = trpc.admin.createCentre.useMutation();
  const updateMutation = trpc.admin.updateCentre.useMutation();
  const deleteMutation = trpc.admin.deleteCentre.useMutation();
  const uploadPdfMutation = trpc.centres.uploadPdf.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    description: "",
    includeInMainSite: true,
    pdfUrl1: "",
    pdfName1: "",
    pdfUrl2: "",
    pdfName2: "",
    pdfUrl3: "",
    pdfName3: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
      description: "",
      includeInMainSite: true,
      pdfUrl1: "",
      pdfName1: "",
      pdfUrl2: "",
      pdfName2: "",
      pdfUrl3: "",
      pdfName3: "",
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
      state: centre.state || "",
      postcode: centre.postcode || "",
      description: centre.description || "",
      includeInMainSite: centre.includeInMainSite ?? true,
      pdfUrl1: centre.pdfUrl1 || "",
      pdfName1: centre.pdfName1 || "",
      pdfUrl2: centre.pdfUrl2 || "",
      pdfName2: centre.pdfName2 || "",
      pdfUrl3: centre.pdfUrl3 || "",
      pdfName3: centre.pdfName3 || "",
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

  const handlePdfUpload = async (slotIndex: number, file: File) => {
    if (!selectedCentre) return;
    
    setUploadingPdf(slotIndex);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await uploadPdfMutation.mutateAsync({
          centreId: selectedCentre.id,
          originalName: file.name,
          base64Pdf: base64,
          slot: slotIndex + 1,
        });
        
        // Update form data with the new URL
        const urlKey = `pdfUrl${slotIndex + 1}` as keyof typeof formData;
        const nameKey = `pdfName${slotIndex + 1}` as keyof typeof formData;
        setFormData(prev => ({
          ...prev,
          [urlKey]: result.url,
          [nameKey]: prev[nameKey] || file.name.replace('.pdf', ''),
        }));
        
        toast.success("PDF uploaded successfully");
        setUploadingPdf(null);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload PDF");
      setUploadingPdf(null);
    }
  };

  const removePdf = (slotIndex: number) => {
    const urlKey = `pdfUrl${slotIndex + 1}` as keyof typeof formData;
    const nameKey = `pdfName${slotIndex + 1}` as keyof typeof formData;
    setFormData(prev => ({
      ...prev,
      [urlKey]: "",
      [nameKey]: "",
    }));
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
                  <div className="grid gap-2">
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      value={formData.suburb}
                      onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                    />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid gap-2">
                  <Label htmlFor="edit-suburb">Suburb</Label>
                  <Input
                    id="edit-suburb"
                    value={formData.suburb}
                    onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  />
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
                  <Label>Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Enter centre description..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Select text and click Bold, Italic, or Underline to format
                  </p>
                </div>
                
                {/* PDF Upload Section */}
                <div className="grid gap-4 pt-4 border-t">
                  <Label className="text-base font-semibold">PDF Documents</Label>
                  <p className="text-sm text-muted-foreground -mt-2">
                    Upload up to 3 PDF documents that will be displayed in search results
                  </p>
                  
                  {[0, 1, 2].map((index) => {
                    const urlKey = `pdfUrl${index + 1}` as keyof typeof formData;
                    const nameKey = `pdfName${index + 1}` as keyof typeof formData;
                    const hasFile = !!formData[urlKey];
                    
                    return (
                      <div key={index} className="grid gap-2 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Document {index + 1}</Label>
                          {hasFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePdf(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        {hasFile ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <a
                              href={formData[urlKey] as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate flex-1"
                            >
                              {formData[nameKey] || `Document ${index + 1}`}
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              ref={pdfInputRefs[index]}
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePdfUpload(index, file);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => pdfInputRefs[index].current?.click()}
                              disabled={uploadingPdf === index}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingPdf === index ? "Uploading..." : "Upload PDF"}
                            </Button>
                          </div>
                        )}
                        
                        {hasFile && (
                          <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">Display Name</Label>
                            <Input
                              value={formData[nameKey] as string}
                              onChange={(e) => setFormData({ ...formData, [nameKey]: e.target.value })}
                              placeholder="Enter display name for this document"
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-includeInMainSite" className="text-base font-medium">
                      Include in Live Site
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, this centre will appear in search results on the public site
                    </p>
                  </div>
                  <Switch
                    id="edit-includeInMainSite"
                    checked={formData.includeInMainSite}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeInMainSite: checked })}
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
            <Card key={centre.id} className={!centre.includeInMainSite ? "opacity-60 border-dashed" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{centre.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {!centre.includeInMainSite && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Hidden</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(centre)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(centre.id, centre.name || '')}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {centre.suburb || "No location"}
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
                  className="w-full"
                  onClick={() => window.location.href = `/admin/sites?centreId=${centre.id}`}
                >
                  Manage Sites
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
