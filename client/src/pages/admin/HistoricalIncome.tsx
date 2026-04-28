import { useState, useRef, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Download, Plus, Trash2, Loader2, FileSpreadsheet } from "lucide-react";

const ASSET_TYPES = [
  { value: "casual_leasing", label: "Casual Leasing" },
  { value: "vacant_shops", label: "Vacant Shops" },
  { value: "third_line", label: "Third Line Income" },
] as const;

type AssetType = (typeof ASSET_TYPES)[number]["value"];

const MONTHS = [
  { num: 1, label: "Jan" },
  { num: 2, label: "Feb" },
  { num: 3, label: "Mar" },
  { num: 4, label: "Apr" },
  { num: 5, label: "May" },
  { num: 6, label: "Jun" },
  { num: 7, label: "Jul" },
  { num: 8, label: "Aug" },
  { num: 9, label: "Sep" },
  { num: 10, label: "Oct" },
  { num: 11, label: "Nov" },
  { num: 12, label: "Dec" },
] as const;

const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type HistoricalRecord = {
  id: number;
  centreId: number;
  assetType: string;
  assetId: number | null;
  month: number;
  year: number;
  amount: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type YearRow = {
  year: number;
  months: Record<number, HistoricalRecord | undefined>;
  total: number;
};

export default function HistoricalIncome() {
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>("casual_leasing");
  const [editDialog, setEditDialog] = useState<{ open: boolean; year: number; month: number; amount: string; notes: string }>({
    open: false, year: new Date().getFullYear(), month: 1, amount: "", notes: "",
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvRows, setCsvRows] = useState<Array<{ year: number; month: number; amount: string; assetId?: number | null; notes?: string }>>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: centres } = trpc.centres.list.useQuery();

  const centreId = selectedCentreId ? parseInt(selectedCentreId) : undefined;

  const { data: records, isLoading, refetch } = trpc.historicalIncome.list.useQuery(
    { centreId: centreId!, assetType: selectedAssetType },
    { enabled: !!centreId },
  );

  const upsertMutation = trpc.historicalIncome.upsert.useMutation({
    onSuccess: () => {
      refetch();
      setEditDialog((prev) => ({ ...prev, open: false }));
      toast.success("Record saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.historicalIncome.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Record deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkImportMutation = trpc.historicalIncome.bulkImport.useMutation({
    onSuccess: (result) => {
      refetch();
      setShowImportDialog(false);
      setCsvRows([]);
      setCsvErrors([]);
      toast.success(`Import complete: ${result.created} created, ${result.updated} updated${result.errors.length ? `, ${result.errors.length} errors` : ""}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Group records by year
  const yearRows = useMemo((): YearRow[] => {
    if (!records || records.length === 0) return [];
    const map = new Map<number, YearRow>();
    for (const rec of records) {
      if (!map.has(rec.year)) {
        map.set(rec.year, { year: rec.year, months: {}, total: 0 });
      }
      const row = map.get(rec.year)!;
      row.months[rec.month] = rec;
      row.total += parseFloat(rec.amount ?? "0");
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [records]);

  const openEditDialog = (year: number, month: number, existing?: HistoricalRecord) => {
    setEditDialog({
      open: true,
      year,
      month,
      amount: existing ? existing.amount : "",
      notes: existing?.notes ?? "",
    });
  };

  const handleSaveEdit = () => {
    if (!centreId) return;
    upsertMutation.mutate({
      centreId,
      assetType: selectedAssetType,
      month: editDialog.month,
      year: editDialog.year,
      amount: editDialog.amount,
      notes: editDialog.notes || null,
    });
  };

  const handleDeleteRecord = (id: number) => {
    if (!confirm("Delete this record?")) return;
    deleteMutation.mutate({ id });
  };

  // CSV parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvErrors(["CSV must have a header row and at least one data row"]);
        return;
      }

      const rows: typeof csvRows = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const year = parseInt(cols[0]);
        const month = parseInt(cols[1]);
        const amount = parseFloat(cols[2]?.replace(/[$,]/g, ""));
        const assetId = cols[3] ? parseInt(cols[3]) : null;
        const notes = cols[4] || undefined;

        if (isNaN(year) || year < 2000 || year > 2100) {
          errors.push(`Row ${i + 1}: Invalid year "${cols[0]}"`);
          continue;
        }
        if (isNaN(month) || month < 1 || month > 12) {
          errors.push(`Row ${i + 1}: Invalid month "${cols[1]}" (must be 1-12)`);
          continue;
        }
        if (isNaN(amount) || amount < 0) {
          errors.push(`Row ${i + 1}: Invalid amount "${cols[2]}"`);
          continue;
        }

        rows.push({
          year,
          month,
          amount: amount.toFixed(2),
          assetId: assetId && !isNaN(assetId) ? assetId : null,
          notes,
        });
      }

      setCsvRows(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!centreId || csvRows.length === 0) return;
    bulkImportMutation.mutate({
      centreId,
      assetType: selectedAssetType,
      rows: csvRows,
    });
  };

  const handleDownloadTemplate = () => {
    const csv = "Year,Month,Amount,Asset ID,Notes\n2025,1,10000.00,,January income\n2025,2,12000.00,,February income\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historical-income-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Historical Income</h1>
            <p className="text-muted-foreground">
              View and manage historical income data by centre and asset type
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Centre:</Label>
              <Select value={selectedCentreId} onValueChange={setSelectedCentreId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Asset type tabs */}
        <Tabs value={selectedAssetType} onValueChange={(v) => setSelectedAssetType(v as AssetType)}>
          <TabsList>
            {ASSET_TYPES.map((at) => (
              <TabsTrigger key={at.value} value={at.value}>
                {at.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!centreId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a centre to view historical income data
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Actions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Income Data — {ASSET_TYPES.find((a) => a.value === selectedAssetType)?.label}
                  </CardTitle>
                  <CardDescription>
                    {yearRows.length > 0
                      ? `${records?.length ?? 0} records across ${yearRows.length} year(s)`
                      : "No records yet"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV Template
                  </Button>
                  <Button variant="outline" onClick={() => { setCsvRows([]); setCsvErrors([]); setShowImportDialog(true); }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button onClick={() => openEditDialog(new Date().getFullYear(), new Date().getMonth() + 1)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {yearRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">Year</TableHead>
                          {MONTHS.map((m) => (
                            <TableHead key={m.num} className="text-right text-xs min-w-[90px]">
                              {m.label}
                            </TableHead>
                          ))}
                          <TableHead className="text-right font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearRows.map((yr) => (
                          <TableRow key={yr.year}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">
                              {yr.year}
                            </TableCell>
                            {MONTHS.map((m) => {
                              const rec = yr.months[m.num];
                              return (
                                <TableCell
                                  key={m.num}
                                  className="text-right text-sm cursor-pointer hover:bg-accent transition-colors group relative"
                                  onClick={() => openEditDialog(yr.year, m.num, rec)}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    {rec ? (
                                      <>
                                        <span>{formatCurrency(parseFloat(rec.amount))}</span>
                                        <button
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteRecord(rec.id); }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                  {rec?.notes && (
                                    <Badge variant="outline" className="text-[10px] mt-0.5 px-1">
                                      {rec.notes.length > 15 ? rec.notes.slice(0, 15) + "…" : rec.notes}
                                    </Badge>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-bold">
                              {formatCurrency(yr.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No historical income records for this centre and asset type.
                    <br />
                    Click "Add Entry" or "Import CSV" to start adding data.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Edit/Add Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editDialog.amount ? "Edit" : "Add"} Income Entry
              </DialogTitle>
              <DialogDescription>
                {ASSET_TYPES.find((a) => a.value === selectedAssetType)?.label} —{" "}
                {MONTHS.find((m) => m.num === editDialog.month)?.label} {editDialog.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={editDialog.year}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, year: parseInt(e.target.value) || prev.year }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={editDialog.month.toString()}
                    onValueChange={(v) => setEditDialog((prev) => ({ ...prev, month: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.num} value={m.num.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editDialog.amount}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g., 15000.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={editDialog.notes}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., Adjusted for refund"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog((prev) => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editDialog.amount || upsertMutation.isPending}>
                {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Historical Income from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV with columns: Year, Month (1-12), Amount, Asset ID (optional), Notes (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select a CSV file to import
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>

              {csvErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-2">Validation Errors:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {csvErrors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {csvRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {csvRows.length} valid row(s) ready to import
                  </p>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Asset ID</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.year}</TableCell>
                            <TableCell>{MONTHS.find((m) => m.num === row.month)?.label}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(row.amount))}</TableCell>
                            <TableCell>{row.assetId ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{row.notes ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={csvRows.length === 0 || bulkImportMutation.isPending}
              >
                {bulkImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Import {csvRows.length} Row{csvRows.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
