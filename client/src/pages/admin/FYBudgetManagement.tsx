import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Save, AlertCircle } from "lucide-react";

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

export default function FYBudgetManagement() {
  const [selectedFY, setSelectedFY] = useState<number>(getCurrentFY());
  const [percentages, setPercentages] = useState<Record<MonthKey, string>>(DEFAULT_PERCENTAGES);
  const [showAddCentreDialog, setShowAddCentreDialog] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [newAnnualBudget, setNewAnnualBudget] = useState<string>("");

  // Fetch FY percentages
  const { data: fyPercentagesData, isLoading: loadingPercentages, refetch: refetchPercentages } = 
    trpc.budgets.getFyPercentages.useQuery({ financialYear: selectedFY });

  // Fetch centre budgets for selected FY
  const { data: centreBudgets, isLoading: loadingBudgets, refetch: refetchBudgets } = 
    trpc.budgets.getCentreBudgetsForYear.useQuery({ financialYear: selectedFY });

  // Fetch all centres for dropdown
  const { data: allCentres } = trpc.budgets.getAllCentresForBudget.useQuery();

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
      setShowAddCentreDialog(false);
      setSelectedCentreId("");
      setNewAnnualBudget("");
    },
    onError: (error) => {
      alert(`Error saving budget: ${error.message}`);
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
                <CardTitle>Centre Annual Budgets</CardTitle>
                <Button onClick={() => setShowAddCentreDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Centre
                </Button>
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
                    Click "Add Centre" to start adding budgets.
                  </div>
                )}
              </CardContent>
            </Card>
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
      </div>
    </AdminLayout>
  );
}
