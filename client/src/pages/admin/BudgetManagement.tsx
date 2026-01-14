import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, DollarSign, Upload, FileText } from "lucide-react";


export default function BudgetManagement() {

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    siteId: "",
    month: "",
    year: new Date().getFullYear().toString(),
    budgetAmount: "",
  });

  const { data: budgets, isLoading, refetch } = trpc.budgets.list.useQuery();
  const { data: sites } = trpc.sites.list.useQuery();
  
  const createMutation = trpc.budgets.create.useMutation({
    onSuccess: () => {
      alert("Budget created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.budgets.update.useMutation({
    onSuccess: () => {
      alert("Budget updated successfully");
      setIsEditDialogOpen(false);
      setEditingBudget(null);
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      alert("Budget deleted successfully");
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const importMutation = trpc.budgets.bulkImport.useMutation({
    onSuccess: (result) => {
      refetch();
      setImportResult(result);
    },
    onError: (error) => {
      alert(`Failed to import budgets: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      siteId: "",
      month: "",
      year: new Date().getFullYear().toString(),
      budgetAmount: "",
    });
  };

  const handleCreate = () => {
    if (!formData.siteId || !formData.month || !formData.year || !formData.budgetAmount) {
      alert("Error: All fields are required");
      return;
    }

    createMutation.mutate({
      siteId: parseInt(formData.siteId),
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      budgetAmount: formData.budgetAmount,
    });
  };

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingBudget || !editingBudget.budgetAmount) {
      alert("Error: Budget amount is required");
      return;
    }

    updateMutation.mutate({
      id: editingBudget.id,
      budgetAmount: editingBudget.budgetAmount,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this budget?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      alert("Please select a CSV file");
      return;
    }

    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      alert("CSV file is empty or invalid");
      return;
    }

    // Parse CSV (expecting: siteId,month,year,budgetAmount)
    const budgets = [];
    for (let i = 1; i < lines.length; i++) {
      const [siteId, month, year, budgetAmount] = lines[i].split(',').map(s => s.trim());
      budgets.push({
        siteId: parseInt(siteId),
        month: parseInt(month),
        year: parseInt(year),
        budgetAmount: budgetAmount,
      });
    }

    importMutation.mutate({ budgets });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  Budget Management
                </CardTitle>
                <CardDescription>
                  Set and manage monthly budget targets for each site
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
                  Import CSV
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading budgets...</div>
            ) : budgets && budgets.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Centre</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">Budget Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium">{budget.siteName}</TableCell>
                        <TableCell>{budget.centreName}</TableCell>
                        <TableCell>{monthNames[budget.month - 1]}</TableCell>
                        <TableCell>{budget.year}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(budget.budgetAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(budget)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(budget.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No budgets set</p>
                <p className="text-sm mb-4">Start by adding monthly budget targets for your sites</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Budget
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Budget Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget</DialogTitle>
            <DialogDescription>
              Set a monthly budget target for a site
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="site">Site</Label>
              <Select
                value={formData.siteId}
                onValueChange={(value) => setFormData({ ...formData, siteId: value })}
              >
                <SelectTrigger id="site">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.siteNumber} - {site.centreName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="month">Month</Label>
              <Select
                value={formData.month}
                onValueChange={(value) => setFormData({ ...formData, month: value })}
              >
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={formData.year}
                onValueChange={(value) => setFormData({ ...formData, year: value })}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budgetAmount">Budget Amount (AUD)</Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                placeholder="10000.00"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update the budget amount for {editingBudget?.siteName} - {editingBudget && monthNames[editingBudget.month - 1]} {editingBudget?.year}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editBudgetAmount">Budget Amount (AUD)</Label>
              <Input
                id="editBudgetAmount"
                type="number"
                step="0.01"
                value={editingBudget?.budgetAmount || ""}
                onChange={(e) => setEditingBudget({ ...editingBudget, budgetAmount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingBudget(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setCsvFile(null);
          setImportResult(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Budgets from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with columns: siteId, month, year, budgetAmount
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="csvFile">CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-gray-500">
                Expected format: siteId,month,year,budgetAmount (e.g., 1,1,2026,10000.00)
              </p>
            </div>
            
            {importResult && (
              <div className="rounded-md border p-4">
                <h4 className="font-semibold mb-2">Import Results</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-green-600">✓ Imported: {importResult.imported}</p>
                  <p className="text-yellow-600">⚠ Skipped: {importResult.skipped}</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="list-disc list-inside">
                        {importResult.errors.slice(0, 5).map((err: any, i: number) => (
                          <li key={i} className="text-red-600">
                            Row {err.row}: {err.error}
                          </li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li className="text-gray-500">... and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setCsvFile(null);
              setImportResult(null);
            }}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button onClick={handleCSVUpload} disabled={!csvFile || importMutation.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                {importMutation.isPending ? "Importing..." : "Import"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
