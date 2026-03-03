import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Pencil, Trash2, Mail, DollarSign, Users, Search, Building } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { WeeklyReportSettingsDialog } from "@/components/WeeklyReportSettingsDialog";

interface Owner {
  id: number;
  name: string;
  companyAbn: string | null;
  contactName: string | null;
  contactTitle: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  secondaryContactName: string | null;
  secondaryContactTitle: string | null;
  secondaryAddress: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankBsb: string | null;
  bankAccountNumber: string | null;
  monthlyFee: string;
  commissionPercentage: string;
  commissionCl: string | null;
  commissionVs: string | null;
  commissionTli: string | null;
  remittanceType: "per_booking" | "monthly";
  invoiceEmail1: string | null;
  invoiceEmail2: string | null;
  invoiceEmail3: string | null;
  remittanceEmail1: string | null;
  remittanceEmail2: string | null;
  remittanceEmail3: string | null;
  remittanceEmail4: string | null;
  remittanceEmail5: string | null;
  isAgency: boolean;
  parentAgencyId: number | null;
}

export default function AdminOwners() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCentreForReport, setSelectedCentreForReport] = useState<any>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Owner>>({
    name: "",
    companyAbn: "",
    contactName: "",
    contactTitle: "",
    address: "",
    email: "",
    phone: "",
    secondaryContactName: "",
    secondaryContactTitle: "",
    secondaryAddress: "",
    secondaryEmail: "",
    secondaryPhone: "",
    bankName: "",
    bankAccountName: "",
    bankBsb: "",
    bankAccountNumber: "",
    monthlyFee: "0.00",
    commissionPercentage: "0.00",
    commissionCl: null,
    commissionVs: null,
    commissionTli: null,
    remittanceType: "monthly",
    invoiceEmail1: "",
    invoiceEmail2: "",
    invoiceEmail3: "",
    remittanceEmail1: "",
    remittanceEmail2: "",
    remittanceEmail3: "",
    remittanceEmail4: "",
    remittanceEmail5: "",
    isAgency: false,
    parentAgencyId: null,
  });

  const { data: owners, isLoading: ownersLoading, refetch: refetchOwners } = trpc.owners.list.useQuery();
  const { data: centres } = trpc.centres.list.useQuery();
  
  const createOwnerMutation = trpc.owners.create.useMutation({
    onSuccess: () => {
      toast.success("Owner created successfully");
      refetchOwners();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateOwnerMutation = trpc.owners.update.useMutation({
    onSuccess: () => {
      toast.success("Owner updated successfully");
      refetchOwners();
      setIsEditDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteOwnerMutation = trpc.owners.delete.useMutation({
    onSuccess: () => {
      toast.success("Owner deleted successfully");
      refetchOwners();
      setIsDeleteDialogOpen(false);
      setSelectedOwner(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      companyAbn: "",
      contactName: "",
      contactTitle: "",
      address: "",
      email: "",
      phone: "",
      secondaryContactName: "",
      secondaryContactTitle: "",
      secondaryAddress: "",
      secondaryEmail: "",
      secondaryPhone: "",
      bankName: "",
      bankAccountName: "",
      bankBsb: "",
      bankAccountNumber: "",
      monthlyFee: "0.00",
      commissionPercentage: "0.00",
      commissionCl: null,
      commissionVs: null,
      commissionTli: null,
      remittanceType: "monthly",
      invoiceEmail1: "",
      invoiceEmail2: "",
      invoiceEmail3: "",
      remittanceEmail1: "",
      remittanceEmail2: "",
      remittanceEmail3: "",
      remittanceEmail4: "",
      remittanceEmail5: "",
      isAgency: false,
      parentAgencyId: null,
    });
  };

  const handleEdit = (owner: Owner) => {
    setSelectedOwner(owner);
    setFormData(owner);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (owner: Owner) => {
    setSelectedOwner(owner);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    if (!formData.name) {
      toast.error("Company name is required");
      return;
    }
    createOwnerMutation.mutate({
      name: formData.name,
      companyAbn: formData.companyAbn || null,
      contactName: formData.contactName || null,
      contactTitle: formData.contactTitle || null,
      address: formData.address || null,
      email: formData.email || null,
      phone: formData.phone || null,
      secondaryContactName: formData.secondaryContactName || null,
      secondaryContactTitle: formData.secondaryContactTitle || null,
      secondaryAddress: formData.secondaryAddress || null,
      secondaryEmail: formData.secondaryEmail || null,
      secondaryPhone: formData.secondaryPhone || null,
      bankName: formData.bankName || null,
      bankAccountName: formData.bankAccountName || null,
      bankBsb: formData.bankBsb || null,
      bankAccountNumber: formData.bankAccountNumber || null,
      monthlyFee: formData.monthlyFee || "0.00",
      commissionPercentage: formData.commissionPercentage || "0.00",
      commissionCl: formData.commissionCl || null,
      commissionVs: formData.commissionVs || null,
      commissionTli: formData.commissionTli || null,
      remittanceType: formData.remittanceType || "monthly",
      invoiceEmail1: formData.invoiceEmail1 || null,
      invoiceEmail2: formData.invoiceEmail2 || null,
      invoiceEmail3: formData.invoiceEmail3 || null,
      remittanceEmail1: formData.remittanceEmail1 || null,
      remittanceEmail2: formData.remittanceEmail2 || null,
      remittanceEmail3: formData.remittanceEmail3 || null,
      remittanceEmail4: formData.remittanceEmail4 || null,
      remittanceEmail5: formData.remittanceEmail5 || null,
      isAgency: formData.isAgency || false,
      parentAgencyId: formData.parentAgencyId || null,
    });
  };

  const handleSubmitUpdate = () => {
    if (!selectedOwner || !formData.name) return;
    updateOwnerMutation.mutate({
      id: selectedOwner.id,
      name: formData.name,
      companyAbn: formData.companyAbn || null,
      contactName: formData.contactName || null,
      contactTitle: formData.contactTitle || null,
      address: formData.address || null,
      email: formData.email || null,
      phone: formData.phone || null,
      secondaryContactName: formData.secondaryContactName || null,
      secondaryContactTitle: formData.secondaryContactTitle || null,
      secondaryAddress: formData.secondaryAddress || null,
      secondaryEmail: formData.secondaryEmail || null,
      secondaryPhone: formData.secondaryPhone || null,
      bankName: formData.bankName || null,
      bankAccountName: formData.bankAccountName || null,
      bankBsb: formData.bankBsb || null,
      bankAccountNumber: formData.bankAccountNumber || null,
      monthlyFee: formData.monthlyFee || "0.00",
      commissionPercentage: formData.commissionPercentage || "0.00",
      commissionCl: formData.commissionCl || null,
      commissionVs: formData.commissionVs || null,
      commissionTli: formData.commissionTli || null,
      remittanceType: formData.remittanceType || "monthly",
      invoiceEmail1: formData.invoiceEmail1 || null,
      invoiceEmail2: formData.invoiceEmail2 || null,
      invoiceEmail3: formData.invoiceEmail3 || null,
      remittanceEmail1: formData.remittanceEmail1 || null,
      remittanceEmail2: formData.remittanceEmail2 || null,
      remittanceEmail3: formData.remittanceEmail3 || null,
      remittanceEmail4: formData.remittanceEmail4 || null,
      remittanceEmail5: formData.remittanceEmail5 || null,
      isAgency: formData.isAgency || false,
      parentAgencyId: formData.parentAgencyId || null,
    });
  };

  const filteredOwners = owners?.filter((owner: Owner) =>
    owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    owner.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getCentresForOwner = (ownerId: number) => {
    return centres?.filter((c: any) => c.ownerId === ownerId) || [];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Owners & Managers</h1>
            <p className="text-muted-foreground mt-1">
              Manage shopping centre owners, bank details, and weekly report settings
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Owner
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search owners by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Owners ({filteredOwners.length})
            </CardTitle>
            <CardDescription>
              View and manage shopping centre owners with their bank details and commission settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ownersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading owners...</div>
            ) : filteredOwners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No owners found matching your search" : "No owners found. Add your first owner."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Centres</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOwners.map((owner: Owner) => {
                    const ownerCentres = getCentresForOwner(owner.id);
                    return (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">
                          {owner.name}
                          {owner.isAgency && <Badge variant="outline" className="ml-2 text-xs">Agency</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {owner.email && <div>{owner.email}</div>}
                            {owner.phone && <div className="text-muted-foreground">{owner.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {owner.bankName ? (
                            <div className="text-sm">
                              <div>{owner.bankName}</div>
                              <div className="text-muted-foreground">
                                BSB: {owner.bankBsb || "—"} | Acc: {owner.bankAccountNumber || "—"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not configured</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            <div>CL: {owner.commissionCl ?? owner.commissionPercentage}%</div>
                            <div>VS: {owner.commissionVs ?? owner.commissionPercentage}%</div>
                            <div>TLI: {owner.commissionTli ?? owner.commissionPercentage}%</div>
                            <div className="text-muted-foreground">
                              Fee: ${owner.monthlyFee}/mo
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ownerCentres.length > 0 ? (
                              ownerCentres.slice(0, 3).map((centre: any) => (
                                <Badge key={centre.id} variant="secondary" className="text-xs">
                                  {centre.name.length > 15 ? centre.name.slice(0, 15) + "..." : centre.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No centres</span>
                            )}
                            {ownerCentres.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{ownerCentres.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(owner)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(owner)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Weekly Report Settings by Centre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Weekly Report Email Settings
            </CardTitle>
            <CardDescription>
              Configure automated Friday 3pm booking reports for each centre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centre</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Report Recipients</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centres?.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((centre: any) => {
                  const owner = owners?.find((o: Owner) => o.id === centre.ownerId);
                  const emailCount = [
                    centre.weeklyReportEmail1, centre.weeklyReportEmail2, centre.weeklyReportEmail3,
                    centre.weeklyReportEmail4, centre.weeklyReportEmail5, centre.weeklyReportEmail6,
                    centre.weeklyReportEmail7, centre.weeklyReportEmail8, centre.weeklyReportEmail9,
                    centre.weeklyReportEmail10
                  ].filter(Boolean).length;
                  
                  return (
                    <TableRow key={centre.id}>
                      <TableCell className="font-medium">{centre.name}</TableCell>
                      <TableCell>{owner?.name || "—"}</TableCell>
                      <TableCell>
                        {emailCount > 0 ? (
                          <Badge variant="secondary">{emailCount} recipient{emailCount > 1 ? "s" : ""}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCentreForReport(centre);
                            setIsReportDialogOpen(true);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Owner Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Owner</DialogTitle>
            <DialogDescription>Create a new shopping centre owner with bank and commission details</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="emails">Email Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-6 mt-4">
              <div>
                <Label className="text-base font-semibold">Company Details</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input id="name" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAbn">Company ABN</Label>
                    <Input id="companyAbn" value={formData.companyAbn || ""} onChange={(e) => setFormData({ ...formData, companyAbn: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Agency Settings</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      id="isAgency"
                      checked={!!formData.isAgency}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAgency: checked, parentAgencyId: checked ? null : formData.parentAgencyId })}
                    />
                    <div>
                      <Label htmlFor="isAgency">Is Agency</Label>
                      <p className="text-xs text-muted-foreground">This owner manages centres on behalf of others</p>
                    </div>
                  </div>
                  {!formData.isAgency && (
                    <div className="space-y-2">
                      <Label>Managed By Agency</Label>
                      <Select
                        value={formData.parentAgencyId?.toString() || "none"}
                        onValueChange={(v) => setFormData({ ...formData, parentAgencyId: v === "none" ? null : parseInt(v) })}
                      >
                        <SelectTrigger><SelectValue placeholder="No agency" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No agency</SelectItem>
                          {owners?.filter((o: any) => o.isAgency && o.id !== selectedOwner?.id).map((o: any) => (
                            <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Primary Contact</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input id="contactName" value={formData.contactName || ""} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactTitle">Contact Title</Label>
                    <Input id="contactTitle" value={formData.contactTitle || ""} onChange={(e) => setFormData({ ...formData, contactTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Secondary Contact</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactName">Contact Name</Label>
                    <Input id="secondaryContactName" value={formData.secondaryContactName || ""} onChange={(e) => setFormData({ ...formData, secondaryContactName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactTitle">Contact Title</Label>
                    <Input id="secondaryContactTitle" value={formData.secondaryContactTitle || ""} onChange={(e) => setFormData({ ...formData, secondaryContactTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryAddress">Address</Label>
                    <Input id="secondaryAddress" value={formData.secondaryAddress || ""} onChange={(e) => setFormData({ ...formData, secondaryAddress: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryEmail">Email</Label>
                    <Input id="secondaryEmail" type="email" value={formData.secondaryEmail || ""} onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryPhone">Phone</Label>
                    <Input id="secondaryPhone" value={formData.secondaryPhone || ""} onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Fees & Commission</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="commissionCl">Casual Leasing %</Label>
                    <Input id="commissionCl" type="number" step="0.01" placeholder={formData.commissionPercentage || "0.00"} value={formData.commissionCl ?? ""} onChange={(e) => setFormData({ ...formData, commissionCl: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commissionVs">Vacant Shops %</Label>
                    <Input id="commissionVs" type="number" step="0.01" placeholder={formData.commissionPercentage || "0.00"} value={formData.commissionVs ?? ""} onChange={(e) => setFormData({ ...formData, commissionVs: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commissionTli">Third Line Income %</Label>
                    <Input id="commissionTli" type="number" step="0.01" placeholder={formData.commissionPercentage || "0.00"} value={formData.commissionTli ?? ""} onChange={(e) => setFormData({ ...formData, commissionTli: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyFee">Monthly Fee ($)</Label>
                    <Input id="monthlyFee" type="number" step="0.01" value={formData.monthlyFee || "0.00"} onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remittanceType">Remittance Type</Label>
                    <Select value={formData.remittanceType} onValueChange={(v: "per_booking" | "monthly") => setFormData({ ...formData, remittanceType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="per_booking">Per Booking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" value={formData.bankName || ""} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">Account Name</Label>
                  <Input id="bankAccountName" value={formData.bankAccountName || ""} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankBsb">BSB</Label>
                  <Input id="bankBsb" value={formData.bankBsb || ""} onChange={(e) => setFormData({ ...formData, bankBsb: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account Number</Label>
                  <Input id="bankAccountNumber" value={formData.bankAccountNumber || ""} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="emails" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Invoice Emails</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input placeholder="Email 1" value={formData.invoiceEmail1 || ""} onChange={(e) => setFormData({ ...formData, invoiceEmail1: e.target.value })} />
                    <Input placeholder="Email 2" value={formData.invoiceEmail2 || ""} onChange={(e) => setFormData({ ...formData, invoiceEmail2: e.target.value })} />
                    <Input placeholder="Email 3" value={formData.invoiceEmail3 || ""} onChange={(e) => setFormData({ ...formData, invoiceEmail3: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-base font-semibold">Remittance Emails</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input placeholder="Email 1" value={formData.remittanceEmail1 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail1: e.target.value })} />
                    <Input placeholder="Email 2" value={formData.remittanceEmail2 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail2: e.target.value })} />
                    <Input placeholder="Email 3" value={formData.remittanceEmail3 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail3: e.target.value })} />
                    <Input placeholder="Email 4" value={formData.remittanceEmail4 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail4: e.target.value })} />
                    <Input placeholder="Email 5" value={formData.remittanceEmail5 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail5: e.target.value })} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCreate} disabled={createOwnerMutation.isPending}>
              {createOwnerMutation.isPending ? "Creating..." : "Create Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Owner</DialogTitle>
            <DialogDescription>Update owner details, bank information, and email settings</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="emails">Email Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-6 mt-4">
              <div>
                <Label className="text-base font-semibold">Company Details</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Company Name *</Label>
                    <Input id="edit-name" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-companyAbn">Company ABN</Label>
                    <Input id="edit-companyAbn" value={formData.companyAbn || ""} onChange={(e) => setFormData({ ...formData, companyAbn: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Agency Settings</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      id="edit-isAgency"
                      checked={!!formData.isAgency}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAgency: checked, parentAgencyId: checked ? null : formData.parentAgencyId })}
                    />
                    <div>
                      <Label htmlFor="edit-isAgency">Is Agency</Label>
                      <p className="text-xs text-muted-foreground">This owner manages centres on behalf of others</p>
                    </div>
                  </div>
                  {!formData.isAgency && (
                    <div className="space-y-2">
                      <Label>Managed By Agency</Label>
                      <Select
                        value={formData.parentAgencyId?.toString() || "none"}
                        onValueChange={(v) => setFormData({ ...formData, parentAgencyId: v === "none" ? null : parseInt(v) })}
                      >
                        <SelectTrigger><SelectValue placeholder="No agency" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No agency</SelectItem>
                          {owners?.filter((o: any) => o.isAgency && o.id !== selectedOwner?.id).map((o: any) => (
                            <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Primary Contact</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contactName">Contact Name</Label>
                    <Input id="edit-contactName" value={formData.contactName || ""} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contactTitle">Contact Title</Label>
                    <Input id="edit-contactTitle" value={formData.contactTitle || ""} onChange={(e) => setFormData({ ...formData, contactTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input id="edit-address" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input id="edit-email" type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input id="edit-phone" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Secondary Contact</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-secondaryContactName">Contact Name</Label>
                    <Input id="edit-secondaryContactName" value={formData.secondaryContactName || ""} onChange={(e) => setFormData({ ...formData, secondaryContactName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-secondaryContactTitle">Contact Title</Label>
                    <Input id="edit-secondaryContactTitle" value={formData.secondaryContactTitle || ""} onChange={(e) => setFormData({ ...formData, secondaryContactTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-secondaryAddress">Address</Label>
                    <Input id="edit-secondaryAddress" value={formData.secondaryAddress || ""} onChange={(e) => setFormData({ ...formData, secondaryAddress: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-secondaryEmail">Email</Label>
                    <Input id="edit-secondaryEmail" type="email" value={formData.secondaryEmail || ""} onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-secondaryPhone">Phone</Label>
                    <Input id="edit-secondaryPhone" value={formData.secondaryPhone || ""} onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Fees & Commission</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-commissionCl">Casual Leasing %</Label>
                    <Input id="edit-commissionCl" type="number" step="0.01" placeholder={formData.commissionPercentage || "0.00"} value={formData.commissionCl ?? ""} onChange={(e) => setFormData({ ...formData, commissionCl: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-commissionVs">Vacant Shops %</Label>
                    <Input id="edit-commissionVs" type="number" step="0.01" placeholder={formData.commissionPercentage || "0.00"} value={formData.commissionVs ?? ""} onChange={(e) => setFormData({ ...formData, commissionVs: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-commissionTli">Third Line Income %</Label>
                    <Input id="edit-commissionTli" type="number" step="0.01" placeholder={formData.commissionPercentage || "0.00"} value={formData.commissionTli ?? ""} onChange={(e) => setFormData({ ...formData, commissionTli: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-monthlyFee">Monthly Fee ($)</Label>
                    <Input id="edit-monthlyFee" type="number" step="0.01" value={formData.monthlyFee || "0.00"} onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-remittanceType">Remittance Type</Label>
                    <Select value={formData.remittanceType} onValueChange={(v: "per_booking" | "monthly") => setFormData({ ...formData, remittanceType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="per_booking">Per Booking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-bankName">Bank Name</Label>
                  <Input id="edit-bankName" value={formData.bankName || ""} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankAccountName">Account Name</Label>
                  <Input id="edit-bankAccountName" value={formData.bankAccountName || ""} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankBsb">BSB</Label>
                  <Input id="edit-bankBsb" value={formData.bankBsb || ""} onChange={(e) => setFormData({ ...formData, bankBsb: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankAccountNumber">Account Number</Label>
                  <Input id="edit-bankAccountNumber" value={formData.bankAccountNumber || ""} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="emails" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Invoice Emails</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input placeholder="Email 1" value={formData.invoiceEmail1 || ""} onChange={(e) => setFormData({ ...formData, invoiceEmail1: e.target.value })} />
                    <Input placeholder="Email 2" value={formData.invoiceEmail2 || ""} onChange={(e) => setFormData({ ...formData, invoiceEmail2: e.target.value })} />
                    <Input placeholder="Email 3" value={formData.invoiceEmail3 || ""} onChange={(e) => setFormData({ ...formData, invoiceEmail3: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-base font-semibold">Remittance Emails</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input placeholder="Email 1" value={formData.remittanceEmail1 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail1: e.target.value })} />
                    <Input placeholder="Email 2" value={formData.remittanceEmail2 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail2: e.target.value })} />
                    <Input placeholder="Email 3" value={formData.remittanceEmail3 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail3: e.target.value })} />
                    <Input placeholder="Email 4" value={formData.remittanceEmail4 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail4: e.target.value })} />
                    <Input placeholder="Email 5" value={formData.remittanceEmail5 || ""} onChange={(e) => setFormData({ ...formData, remittanceEmail5: e.target.value })} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitUpdate} disabled={updateOwnerMutation.isPending}>
              {updateOwnerMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Owner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedOwner?.name}"? This action cannot be undone.
              All associated centres will need to be reassigned to a different owner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => selectedOwner && deleteOwnerMutation.mutate({ id: selectedOwner.id })} disabled={deleteOwnerMutation.isPending}>
              {deleteOwnerMutation.isPending ? "Deleting..." : "Delete Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weekly Report Settings Dialog */}
      {selectedCentreForReport && (
        <WeeklyReportSettingsDialog
          centre={selectedCentreForReport}
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
        />
      )}
    </AdminLayout>
  );
}
