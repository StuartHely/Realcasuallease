import { useState, useMemo, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Save, AlertCircle, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";

// Financial year months in order (July to June)
const FY_MONTHS = [
  { key: "july", label: "Jul" },
  { key: "august", label: "Aug" },
  { key: "september", label: "Sep" },
  { key: "october", label: "Oct" },
  { key: "november", label: "Nov" },
  { key: "december", label: "Dec" },
  { key: "january", label: "Jan" },
  { key: "february", label: "Feb" },
  { key: "march", label: "Mar" },
  { key: "april", label: "Apr" },
  { key: "may", label: "May" },
  { key: "june", label: "Jun" },
] as const;

type MonthKey = typeof FY_MONTHS[number]["key"];

// Default percentages (equal distribution)
const DEFAULT_PERCENTAGES: Record<MonthKey, string> = {
  july: "8.33",
  august: "8.33",
  september: "8.33",
  october: "8.33",
  november: "8.33",
  december: "8.33",
  january: "8.33",
  february: "8.33",
  march: "8.33",
  april: "8.33",
  may: "8.33",
  june: "8.37",
};

// Get current financial year (July-June)
function getCurrentFY(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  // If July or later, we're in FY ending next year
  return month >= 6 ? year + 1 : year;
}

type ImportResult = {
  imported: Array<{ centreId: number; centreName: string; annualBudget: string }>;
  unmatched: Array<{ centreName: string; annualBudget: string }>;
  updated: number;
  created: number;
};

export default function FYBudgetManagement() {
  const [selectedFY, setSelectedFY] = useState<number>(getCurrentFY());
  const [percentages, setPercentages] = useState<Record<MonthKey, string>>(DEFAULT_PERCENTAGES);
  const [showAddCentreDialog, setShowAddCentreDialog] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [newAnnualBudget, setNewAnnualBudget] = useState<string>("");
  
  // Bulk upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadedData, setUploadedData] = useState<Array<{ centreName: string; annualBudget: string }>>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch FY percentages
  const { data: fyPercentagesData, isLoading: loadingPercentages, refetch: refetchPercentages } = 
    trpc.budgets.getFyPercentages.useQuery({ financialYear: selectedFY });

  // Fetch centre budgets for selected FY
  const { data: centreBudgets, isLoading: loadingBudgets, refetch: refetchBudgets } = 
    trpc.budgets.getCentreBudgetsForYear.useQuery({ financialYear: selectedFY });

  // Fetch all centres for dropdown
  const { data: allCentres } = trpc.budgets.getAllCentresForBudget.useQuery();
  
  // Fetch centres without budget
  const { data: centresWithoutBudget, refetch: refetchCentresWithoutBudget } = 
    trpc.budgets.getCentresWithoutBudget.useQuery({ financialYear: selectedFY });

  // Mutations
  const savePercentagesMutation = trpc.budgets.saveFyPercentages.useMutation({
    onSuccess: () => {
      refetchPercentages();
      alert("Percentages saved successfully!");
    },
    onError: (error) => {
      alert(`Error saving percentages: ${error.message}`);
    },
  });

  const saveCentreBudgetMutation = trpc.budgets.saveCentreBudget.useMutation({
    onSuccess: () => {
      refetchBudgets();
      refetchCentresWithoutBudget();
      setShowAddCentreDialog(false);
      setSelectedCentreId("");
      setNewAnnualBudget("");
    },
    onError: (error) => {
      alert(`Error saving budget: ${error.message}`);
    },
  });

  const bulkImportMutation = trpc.budgets.bulkImportCentreBudgets.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      refetchBudgets();
      refetchCentresWithoutBudget();
    },
    onError: (error) => {
      alert(`Error importing budgets: ${error.message}`);
    },
  });

  // Update local percentages when data loads
  useMemo(() => {
    if (fyPercentagesData) {
      setPercentages({
        july: fyPercentagesData.july,
        august: fyPercentagesData.august,
        september: fyPercentagesData.september,
        october: fyPercentagesData.october,
        november: fyPercentagesData.november,
        december: fyPercentagesData.december,
        january: fyPercentagesData.january,
        february: fyPercentagesData.february,
        march: fyPercentagesData.march,
        april: fyPercentagesData.april,
        may: fyPercentagesData.may,
        june: fyPercentagesData.june,
      });
    } else {
      setPercentages(DEFAULT_PERCENTAGES);
    }
  }, [fyPercentagesData]);

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return FY_MONTHS.reduce((sum, month) => {
      return sum + parseFloat(percentages[month.key] || "0");
    }, 0);
  }, [percentages]);

  // Handle percentage change
  const handlePercentageChange = (month: MonthKey, value: string) => {
    setPercentages((prev) => ({ ...prev, [month]: value }));
  };

  // Save percentages
  const handleSavePercentages = () => {
    savePercentagesMutation.mutate({
      financialYear: selectedFY,
      ...percentages,
    });
  };

  // Calculate monthly budget from annual budget
  const calculateMonthlyBudget = (annualBudget: string, monthKey: MonthKey): number => {
    const annual = parseFloat(annualBudget) || 0;
    const pct = parseFloat(percentages[monthKey]) || 0;
    return (annual * pct) / 100;
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle adding a new centre budget
  const handleAddCentreBudget = () => {
    if (!selectedCentreId || !newAnnualBudget) {
      alert("Please select a centre and enter an annual budget");
      return;
    }
    saveCentreBudgetMutation.mutate({
      centreId: parseInt(selectedCentreId),
      financialYear: selectedFY,
      annualBudget: newAnnualBudget,
    });
  };

  // Handle inline budget update
  const handleBudgetUpdate = (centreId: number, annualBudget: string) => {
    saveCentreBudgetMutation.mutate({
      centreId,
      financialYear: selectedFY,
      annualBudget,
    });
  };

  // Get centres not yet in budget
  const availableCentres = useMemo(() => {
    if (!allCentres || !centreBudgets) return [];
    const budgetedCentreIds = new Set(centreBudgets.map((b) => b.centreId));
    return allCentres.filter((c) => !budgetedCentreIds.has(c.id));
  }, [allCentres, centreBudgets]);

  // Generate FY options (current year ± 2 years)
  const fyOptions = useMemo(() => {
    const currentFY = getCurrentFY();
    return [currentFY - 1, currentFY, currentFY + 1, currentFY + 2];
  }, []);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadedData([]);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      // Parse the data - look for centre name and budget columns
      const parsedData: Array<{ centreName: string; annualBudget: string }> = [];
      
      for (const row of jsonData) {
        // Try to find centre name column (case-insensitive)
        const centreNameKey = Object.keys(row).find(
          (k) => k.toLowerCase().includes("centre") || k.toLowerCase().includes("center") || k.toLowerCase().includes("name")
        );
        
        // Try to find budget column (case-insensitive)
        const budgetKey = Object.keys(row).find(
          (k) => k.toLowerCase().includes("budget") || k.toLowerCase().includes("annual") || k.toLowerCase().includes("total") || k.toLowerCase().includes("amount") || k.toLowerCase() === "$"
        );

        if (centreNameKey && budgetKey) {
          const centreName = String(row[centreNameKey] || "").trim();
          let budgetValue = row[budgetKey];
          
          // Clean up budget value - remove currency symbols, commas, etc.
          if (typeof budgetValue === "string") {
            budgetValue = budgetValue.replace(/[$,\s]/g, "");
          }
          
          const annualBudget = String(parseFloat(budgetValue) || 0);
          
          if (centreName && annualBudget !== "0") {
            parsedData.push({ centreName, annualBudget });
          }
        }
      }

      setUploadedData(parsedData);
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Error parsing file. Please ensure it's a valid CSV or Excel file.");
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle import confirmation
  const handleConfirmImport = () => {
    if (uploadedData.length === 0) return;
    
    bulkImportMutation.mutate({
      financialYear: selectedFY,
      data: uploadedData,
    });
  };

  // Reset upload dialog
  const handleCloseUploadDialog = () => {
    setShowUploadDialog(false);
    setUploadedData([]);
    setImportResult(null);
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      { "Centre Name": "Example Shopping Centre", "Annual Budget $": 100000 },
      { "Centre Name": "Another Centre", "Annual Budget $": 150000 },
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget Template");
    XLSX.writeFile(wb, `budget-template-FY${selectedFY}.xlsx`);
  };

  const isLoading = loadingPercentages || loadingBudgets;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financial Year Budget Management</h1>
            <p className="text-muted-foreground">
              Set monthly percentage distribution and annual budgets per centre
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Label>Financial Year:</Label>
            <Select
              value={selectedFY.toString()}
              onValueChange={(v) => setSelectedFY(parseInt(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyOptions.map((fy) => (
                  <SelectItem key={fy} value={fy.toString()}>
                    FY {fy - 1}-{fy.toString().slice(-2)} (Jul {fy - 1} - Jun {fy})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Monthly Percentages Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Monthly Percentage Distribution</CardTitle>
                <div className="flex items-center gap-4">
                  <div className={`text-sm font-medium ${Math.abs(totalPercentage - 100) < 0.1 ? "text-green-600" : "text-red-600"}`}>
                    Total: {totalPercentage.toFixed(2)}%
                    {Math.abs(totalPercentage - 100) >= 0.1 && (
                      <AlertCircle className="inline ml-1 h-4 w-4" />
                    )}
                  </div>
                  <Button
                    onClick={handleSavePercentages}
                    disabled={savePercentagesMutation.isPending}
                  >
                    {savePercentagesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Percentages
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-2">
                  {FY_MONTHS.map((month) => (
                    <div key={month.key} className="text-center">
                      <Label className="text-xs font-medium">{month.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={percentages[month.key]}
                        onChange={(e) => handlePercentageChange(month.key, e.target.value)}
                        className="text-center text-sm mt-1"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Centre Budgets Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Centre Annual Budgets</CardTitle>
                  {centresWithoutBudget && centresWithoutBudget.length > 0 && (
                    <CardDescription className="text-orange-600 mt-1">
                      <AlertTriangle className="inline h-4 w-4 mr-1" />
                      {centresWithoutBudget.length} centre{centresWithoutBudget.length > 1 ? "s" : ""} without budget
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <Button onClick={() => setShowAddCentreDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Centre
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {centreBudgets && centreBudgets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">Centre</TableHead>
                          <TableHead className="text-right">Annual Budget</TableHead>
                          {FY_MONTHS.map((month) => (
                            <TableHead key={month.key} className="text-right text-xs">
                              {month.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {centreBudgets.map((budget) => (
                          <TableRow key={budget.id}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">
                              {budget.centreName}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({budget.centreState})
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="1000"
                                min="0"
                                value={budget.annualBudget}
                                onChange={(e) => handleBudgetUpdate(budget.centreId, e.target.value)}
                                className="w-32 text-right"
                              />
                            </TableCell>
                            {FY_MONTHS.map((month) => (
                              <TableCell key={month.key} className="text-right text-sm">
                                {formatCurrency(calculateMonthlyBudget(budget.annualBudget, month.key))}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No centre budgets set for FY {selectedFY - 1}-{selectedFY.toString().slice(-2)}.
                    <br />
                    Click "Add Centre" or "Bulk Upload" to start adding budgets.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Centres Without Budget Warning */}
            {centresWithoutBudget && centresWithoutBudget.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Centres Without Budget for FY {selectedFY - 1}-{selectedFY.toString().slice(-2)}
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    The following centres do not have a budget assigned for this financial year
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {centresWithoutBudget.map((centre) => (
                      <Badge key={centre.id} variant="outline" className="border-orange-300 text-orange-800">
                        {centre.name} ({centre.state})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Add Centre Dialog */}
        <Dialog open={showAddCentreDialog} onOpenChange={setShowAddCentreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Centre Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Centre</Label>
                <Select value={selectedCentreId} onValueChange={setSelectedCentreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCentres.map((centre) => (
                      <SelectItem key={centre.id} value={centre.id.toString()}>
                        {centre.name} ({centre.state})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Annual Budget ($)</Label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  value={newAnnualBudget}
                  onChange={(e) => setNewAnnualBudget(e.target.value)}
                  placeholder="e.g., 120000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCentreDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCentreBudget}
                disabled={saveCentreBudgetMutation.isPending}
              >
                {saveCentreBudgetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={handleCloseUploadDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulk Upload Centre Budgets</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file with centre names and annual budget amounts for FY {selectedFY - 1}-{selectedFY.toString().slice(-2)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* File Upload Section */}
              {!importResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Download a sample template to see the expected format
                    </span>
                  </div>
                  
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a CSV or Excel file with columns for Centre Name and Annual Budget
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="budget-file-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                    >
                      {isProcessingFile ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Select File
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview Data */}
              {uploadedData.length > 0 && !importResult && (
                <div className="space-y-4">
                  <Alert>
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertTitle>File Parsed Successfully</AlertTitle>
                    <AlertDescription>
                      Found {uploadedData.length} centre budget{uploadedData.length > 1 ? "s" : ""} in the file
                    </AlertDescription>
                  </Alert>
                  
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Centre Name</TableHead>
                          <TableHead className="text-right">Annual Budget</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadedData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.centreName}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(parseFloat(row.annualBudget))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-2xl font-bold text-green-700">{importResult.imported.length}</p>
                            <p className="text-sm text-green-600">Imported</p>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          {importResult.created} created, {importResult.updated} updated
                        </p>
                      </CardContent>
                    </Card>
                    
                    {importResult.unmatched.length > 0 && (
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-orange-600" />
                            <div>
                              <p className="text-2xl font-bold text-orange-700">{importResult.unmatched.length}</p>
                              <p className="text-sm text-orange-600">Unmatched</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Imported Centres */}
                  {importResult.imported.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-green-700">Successfully Imported:</h4>
                      <div className="max-h-40 overflow-y-auto border border-green-200 rounded-lg bg-green-50">
                        <Table>
                          <TableBody>
                            {importResult.imported.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-green-800">{item.centreName}</TableCell>
                                <TableCell className="text-right text-green-800">
                                  {formatCurrency(parseFloat(item.annualBudget))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Unmatched Centres */}
                  {importResult.unmatched.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-orange-700">
                        Unmatched Centres (not found in system):
                      </h4>
                      <div className="max-h-40 overflow-y-auto border border-orange-200 rounded-lg bg-orange-50">
                        <Table>
                          <TableBody>
                            {importResult.unmatched.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-orange-800">{item.centreName}</TableCell>
                                <TableCell className="text-right text-orange-800">
                                  {formatCurrency(parseFloat(item.annualBudget))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-sm text-orange-600 mt-2">
                        Please check the spelling of these centre names or add them to the system first.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {!importResult ? (
                <>
                  <Button variant="outline" onClick={handleCloseUploadDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={uploadedData.length === 0 || bulkImportMutation.isPending}
                  >
                    {bulkImportMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Import {uploadedData.length} Budget{uploadedData.length !== 1 ? "s" : ""}
                  </Button>
                </>
              ) : (
                <Button onClick={handleCloseUploadDialog}>
                  Done
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
