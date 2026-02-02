import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileText, Upload, X, Loader2 } from "lucide-react";

interface EditCentreDialogProps {
  centre: {
    id: number;
    name: string;
    address?: string | null;
    suburb?: string | null;
    state?: string | null;
    postcode?: string | null;
    description?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    operatingHours?: string | null;
    policies?: string | null;
    pdfUrl1?: string | null;
    pdfName1?: string | null;
    pdfUrl2?: string | null;
    pdfName2?: string | null;
    pdfUrl3?: string | null;
    pdfName3?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCentreDialog({ centre, open, onOpenChange }: EditCentreDialogProps) {
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    name: centre.name || "",
    address: centre.address || "",
    suburb: centre.suburb || "",
    state: centre.state || "",
    postcode: centre.postcode || "",
    description: centre.description || "",
    contactPhone: centre.contactPhone || "",
    contactEmail: centre.contactEmail || "",
    operatingHours: centre.operatingHours || "",
    policies: centre.policies || "",
    pdfUrl1: centre.pdfUrl1 || "",
    pdfName1: centre.pdfName1 || "",
    pdfUrl2: centre.pdfUrl2 || "",
    pdfName2: centre.pdfName2 || "",
    pdfUrl3: centre.pdfUrl3 || "",
    pdfName3: centre.pdfName3 || "",
  });

  const [uploadingPdf, setUploadingPdf] = useState<number | null>(null);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Reset form data when centre changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: centre.name || "",
        address: centre.address || "",
        suburb: centre.suburb || "",
        state: centre.state || "",
        postcode: centre.postcode || "",
        description: centre.description || "",
        contactPhone: centre.contactPhone || "",
        contactEmail: centre.contactEmail || "",
        operatingHours: centre.operatingHours || "",
        policies: centre.policies || "",
        pdfUrl1: centre.pdfUrl1 || "",
        pdfName1: centre.pdfName1 || "",
        pdfUrl2: centre.pdfUrl2 || "",
        pdfName2: centre.pdfName2 || "",
        pdfUrl3: centre.pdfUrl3 || "",
        pdfName3: centre.pdfName3 || "",
      });
    }
  }, [centre, open]);

  const uploadPdfMutation = trpc.centres.uploadPdf.useMutation({
    onSuccess: (data, variables) => {
      const slot = variables.slot;
      setFormData(prev => ({
        ...prev,
        [`pdfUrl${slot}`]: data.url,
        [`pdfName${slot}`]: prev[`pdfName${slot}` as keyof typeof prev] || data.originalName,
      }));
      toast.success("PDF uploaded successfully");
      setUploadingPdf(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload PDF");
      setUploadingPdf(null);
    },
  });

  const updateMutation = trpc.centres.update.useMutation({
    onSuccess: () => {
      toast.success("Centre updated successfully");
      utils.centres.list.invalidate();
      utils.centres.getById.invalidate({ id: centre.id });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update centre");
    },
  });

  const handlePdfUpload = async (slot: 1 | 2 | 3, file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("PDF file must be less than 10MB");
      return;
    }

    setUploadingPdf(slot);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadPdfMutation.mutate({
        centreId: centre.id,
        slot,
        base64Pdf: base64,
        originalName: file.name,
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploadingPdf(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = (slot: 1 | 2 | 3) => {
    setFormData(prev => ({
      ...prev,
      [`pdfUrl${slot}`]: "",
      [`pdfName${slot}`]: "",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      toast.error("Centre name is required");
      return;
    }

    if (formData.contactEmail && !formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }

    updateMutation.mutate({
      id: centre.id,
      ...formData,
    });
  };

  const renderPdfUpload = (slot: 1 | 2 | 3) => {
    const urlKey = `pdfUrl${slot}` as keyof typeof formData;
    const nameKey = `pdfName${slot}` as keyof typeof formData;
    const pdfUrl = formData[urlKey];
    const pdfName = formData[nameKey];
    const isUploading = uploadingPdf === slot;

    return (
      <div className="space-y-2">
        <Label>PDF Document {slot}</Label>
        <div className="flex items-center gap-2">
          {pdfUrl ? (
            <div className="flex items-center gap-2 flex-1 p-2 border rounded-md bg-muted/50">
              <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
              <Input
                value={pdfName}
                onChange={(e) => setFormData(prev => ({ ...prev, [nameKey]: e.target.value }))}
                placeholder="Display name for this PDF"
                className="flex-1 h-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePdf(slot)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Input
                ref={fileInputRefs[slot - 1]}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(slot, file);
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRefs[slot - 1].current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF {slot}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View current PDF
          </a>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shopping Centre</DialogTitle>
          <DialogDescription>
            Update the details for {centre.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Centre Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div>
              <Label htmlFor="suburb">Suburb</Label>
              <Input
                id="suburb"
                value={formData.suburb}
                onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g., NSW, VIC, QLD"
              />
            </div>

            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="e.g., (02) 1234 5678"
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contact@centre.com.au"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Use the toolbar to apply bold, italic, or underline formatting to selected text.
              </p>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Brief description of the shopping centre"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="operatingHours">Operating Hours</Label>
              <Textarea
                id="operatingHours"
                value={formData.operatingHours}
                onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                placeholder="e.g., Mon-Fri: 9am-5pm, Sat-Sun: 10am-4pm"
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="policies">Policies & Guidelines</Label>
              <Textarea
                id="policies"
                value={formData.policies}
                onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                placeholder="Centre policies, booking guidelines, terms and conditions"
                rows={4}
              />
            </div>

            {/* PDF Upload Section */}
            <div className="col-span-2 space-y-4 pt-4 border-t">
              <div>
                <h3 className="font-medium text-sm">PDF Documents</h3>
                <p className="text-xs text-muted-foreground">
                  Upload up to 3 PDF files with custom display names. These will appear as links in the search results.
                </p>
              </div>
              {renderPdfUpload(1)}
              {renderPdfUpload(2)}
              {renderPdfUpload(3)}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
