import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Portfolios() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    ownerId: 0,
    name: "",
    bankBsb: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });

  const { data: portfolios, refetch } = trpc.portfolios.list.useQuery();
  const { data: owners } = trpc.owners.list.useQuery();

  const createMutation = trpc.portfolios.create.useMutation({
    onSuccess: () => {
      toast.success("Portfolio created");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.portfolios.update.useMutation({
    onSuccess: () => {
      toast.success("Portfolio updated");
      setIsEditOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.portfolios.delete.useMutation({
    onSuccess: () => {
      toast.success("Portfolio deleted");
      setIsDeleteOpen(false);
      setSelectedId(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({ ownerId: 0, name: "", bankBsb: "", bankAccountNumber: "", bankAccountName: "" });
  };

  const handleEdit = (p: any) => {
    setSelectedId(p.id);
    setFormData({
      ownerId: p.ownerId,
      name: p.name,
      bankBsb: p.bankBsb || "",
      bankAccountNumber: p.bankAccountNumber || "",
      bankAccountName: p.bankAccountName || "",
    });
    setIsEditOpen(true);
  };

  const getOwnerName = (ownerId: number) => {
    return owners?.find((o: any) => o.id === ownerId)?.name || "Unknown";
  };

  // Group portfolios by owner
  const grouped = (portfolios || []).reduce((acc: Record<number, any[]>, p: any) => {
    if (!acc[p.ownerId]) acc[p.ownerId] = [];
    acc[p.ownerId].push(p);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolios</h1>
            <p className="text-muted-foreground">Group centres under portfolios with optional bank overrides</p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Portfolio
          </Button>
        </div>

        {Object.entries(grouped).map(([ownerId, items]) => (
          <Card key={ownerId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {getOwnerName(Number(ownerId))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Portfolio Name</TableHead>
                    <TableHead>Centres</TableHead>
                    <TableHead>Bank Override</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items as any[]).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.centreCount} centre{p.centreCount !== 1 ? "s" : ""}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.bankBsb ? `BSB ${p.bankBsb} / ${p.bankAccountNumber}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedId(p.id); setIsDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {(!portfolios || portfolios.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No portfolios yet. Click "Add Portfolio" to create one.
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Portfolio</DialogTitle>
              <DialogDescription>Group centres under a portfolio with optional bank details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Owner *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.ownerId || ""}
                  onChange={(e) => setFormData({ ...formData, ownerId: parseInt(e.target.value) || 0 })}
                  required
                >
                  <option value="">Select owner...</option>
                  {owners?.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Portfolio Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Sydney Metro" />
              </div>
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Bank Override (optional)</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>BSB</Label>
                    <Input value={formData.bankBsb} onChange={(e) => setFormData({ ...formData, bankBsb: e.target.value })} placeholder="062-000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={formData.bankAccountNumber} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} placeholder="12345678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input value={formData.bankAccountName} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })} placeholder="Company Pty Ltd" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  ownerId: formData.ownerId,
                  name: formData.name,
                  bankBsb: formData.bankBsb || null,
                  bankAccountNumber: formData.bankAccountNumber || null,
                  bankAccountName: formData.bankAccountName || null,
                })}
                disabled={!formData.ownerId || !formData.name || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Portfolio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Portfolio Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Bank Override</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>BSB</Label>
                    <Input value={formData.bankBsb} onChange={(e) => setFormData({ ...formData, bankBsb: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={formData.bankAccountNumber} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input value={formData.bankAccountName} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => selectedId && updateMutation.mutate({
                  id: selectedId,
                  name: formData.name,
                  bankBsb: formData.bankBsb || null,
                  bankAccountNumber: formData.bankAccountNumber || null,
                  bankAccountName: formData.bankAccountName || null,
                })}
                disabled={!formData.name || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Portfolio</DialogTitle>
              <DialogDescription>
                This will only succeed if no centres are assigned to this portfolio.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => selectedId && deleteMutation.mutate({ id: selectedId })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
