import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  });

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
      });
    }
  }, [centre, open]);

  const updateMutation = trpc.centres.update.useMutation({
    onSuccess: () => {
      toast.success("Centre updated successfully");
      utils.centres.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update centre");
    },
  });

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
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the shopping centre"
                rows={3}
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
