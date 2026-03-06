import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Globe, Plus, Trash2, Star, Palette } from "lucide-react";

export default function OperatorManagement() {
  const { data: operators, refetch } = trpc.tenant.listOperators.useQuery();

  const addDomain = trpc.tenant.addDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain added");
      refetch();
      setDomainDialogOpen(false);
      setNewHostname("");
      setNewIsPrimary(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeDomain = trpc.tenant.removeDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain removed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const setPrimary = trpc.tenant.setPrimaryDomain.useMutation({
    onSuccess: () => {
      toast.success("Primary domain updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateBranding = trpc.tenant.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Branding updated");
      refetch();
      setBrandingDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Domain dialog state
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [domainOwnerId, setDomainOwnerId] = useState(0);
  const [newHostname, setNewHostname] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);

  // Domain list dialog state
  const [domainsDialogOpen, setDomainsDialogOpen] = useState(false);
  const [domainsOwner, setDomainsOwner] = useState<any>(null);

  // Branding dialog state
  const [brandingDialogOpen, setBrandingDialogOpen] = useState(false);
  const [brandingOwnerId, setBrandingOwnerId] = useState(0);
  const [brandingForm, setBrandingForm] = useState({
    brandName: "",
    brandPrimaryColor: "#123047",
    brandAccentColor: "#2e7d32",
    supportEmail: "",
    supportPhone: "",
  });

  const openDomainsDialog = (operator: any) => {
    setDomainsOwner(operator);
    setDomainsDialogOpen(true);
  };

  const openAddDomainDialog = (ownerId: number) => {
    setDomainOwnerId(ownerId);
    setNewHostname("");
    setNewIsPrimary(false);
    setDomainDialogOpen(true);
  };

  const openBrandingDialog = (operator: any) => {
    setBrandingOwnerId(operator.id);
    setBrandingForm({
      brandName: operator.brandName || operator.name || "",
      brandPrimaryColor: operator.brandPrimaryColor || "#123047",
      brandAccentColor: operator.brandAccentColor || "#2e7d32",
      supportEmail: operator.supportEmail || "",
      supportPhone: operator.supportPhone || "",
    });
    setBrandingDialogOpen(true);
  };

  const handleAddDomain = () => {
    if (!newHostname.trim()) {
      toast.error("Hostname is required");
      return;
    }
    addDomain.mutate({
      ownerId: domainOwnerId,
      hostname: newHostname.trim(),
      isPrimary: newIsPrimary,
    });
  };

  const handleUpdateBranding = () => {
    updateBranding.mutate({
      ownerId: brandingOwnerId,
      brandName: brandingForm.brandName || undefined,
      brandPrimaryColor: brandingForm.brandPrimaryColor || null,
      brandAccentColor: brandingForm.brandAccentColor || null,
      supportEmail: brandingForm.supportEmail || null,
      supportPhone: brandingForm.supportPhone || null,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operator Management</h1>
          <p className="text-muted-foreground">Manage operator domains and branding for multi-tenant sites</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Operators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domains</TableHead>
                  <TableHead>Primary Domain</TableHead>
                  <TableHead>Branding Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators?.map((op: any) => {
                  const primaryDomain = op.domains?.find((d: any) => d.isPrimary);
                  const hasBranding = !!(op.brandName || op.brandPrimaryColor);
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => openDomainsDialog(op)}
                        >
                          {op.domains?.length || 0} domain{op.domains?.length !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {primaryDomain ? (
                          <span className="text-sm">{primaryDomain.hostname}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasBranding ? "default" : "outline"}>
                          {hasBranding ? "Configured" : "Default"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDomainsDialog(op)}
                        >
                          <Globe className="h-4 w-4 mr-1" />
                          Domains
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBrandingDialog(op)}
                        >
                          <Palette className="h-4 w-4 mr-1" />
                          Branding
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!operators || operators.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No operators found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Domains Dialog */}
      <Dialog open={domainsDialogOpen} onOpenChange={setDomainsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Domains — {domainsOwner?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {domainsOwner?.domains?.length > 0 ? (
              domainsOwner.domains.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{d.hostname}</span>
                    {d.isPrimary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!d.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimary.mutate({ domainId: d.id })}
                        disabled={setPrimary.isPending}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain.mutate({ domainId: d.id })}
                      disabled={removeDomain.isPending}
                      title="Remove domain"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No domains configured</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDomainsDialogOpen(false);
                openAddDomainDialog(domainsOwner?.id);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Domain Dialog */}
      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                placeholder="e.g. bookings.example.com"
                value={newHostname}
                onChange={(e) => setNewHostname(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={newIsPrimary}
                onChange={(e) => setNewIsPrimary(e.target.checked)}
                className="rounded border"
              />
              <Label htmlFor="isPrimary">Set as primary domain</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={addDomain.isPending}>
              {addDomain.isPending ? "Adding..." : "Add Domain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branding Dialog */}
      <Dialog open={brandingDialogOpen} onOpenChange={setBrandingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Branding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={brandingForm.brandName}
                onChange={(e) => setBrandingForm({ ...brandingForm, brandName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brandPrimaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandPrimaryColor"
                    value={brandingForm.brandPrimaryColor}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, brandPrimaryColor: e.target.value })
                    }
                    placeholder="#123047"
                  />
                  <input
                    type="color"
                    value={brandingForm.brandPrimaryColor}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, brandPrimaryColor: e.target.value })
                    }
                    className="h-9 w-9 rounded border cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandAccentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandAccentColor"
                    value={brandingForm.brandAccentColor}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, brandAccentColor: e.target.value })
                    }
                    placeholder="#2e7d32"
                  />
                  <input
                    type="color"
                    value={brandingForm.brandAccentColor}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, brandAccentColor: e.target.value })
                    }
                    className="h-9 w-9 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={brandingForm.supportEmail}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, supportEmail: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input
                id="supportPhone"
                value={brandingForm.supportPhone}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, supportPhone: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBranding} disabled={updateBranding.isPending}>
              {updateBranding.isPending ? "Saving..." : "Save Branding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}