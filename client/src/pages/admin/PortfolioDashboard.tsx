import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Bell, Download, FileSpreadsheet, FileText, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";

// Donut Chart Component
function DonutChart({ percentage, size = 160 }: { percentage: number; size?: number }) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${Math.min(percentage, 100) * circumference / 100} ${circumference}`;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E1E5EC"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</p>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  subtitle, 
  variant = "primary" 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  variant?: "primary" | "secondary" 
}) {
  const valueColor = variant === "primary" ? "text-blue-900" : "text-gray-600";
  const titleColor = variant === "primary" ? "text-gray-700" : "text-gray-500";
  
  return (
    <div className="bg-white rounded-lg border border-[#E1E5EC] shadow-[0_2px_8px_rgba(15,35,52,0.08)] p-5">
      <p className={`text-xs font-medium ${titleColor} uppercase tracking-wide mb-2`}>{title}</p>
      <p className={`text-2xl lg:text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
    </div>
  );
}

export default function PortfolioDashboard() {
  const [, setLocation] = useLocation();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedState, setSelectedState] = useState<string>("all");
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"annual" | "ytd">("annual");
  const [isExporting, setIsExporting] = useState(false);
  
  const getCurrentFY = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 6 ? year + 1 : year;
  };
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  
  const { data: metrics, isLoading, refetch } = trpc.dashboard.getMetrics.useQuery({
    month: selectedMonth,
    year: selectedYear,
    state: selectedState,
    financialYear: selectedFY,
  });
  
  const { data: availableStates } = trpc.dashboard.getAvailableStates.useQuery();
  const { data: fyBudgetMetrics } = trpc.dashboard.getFYBudgetMetrics.useQuery({
    financialYear: selectedFY,
    state: selectedState,
  });
  
  const { data: annualBreakdown, isLoading: isLoadingAnnualBreakdown } = trpc.dashboard.getCentreBreakdown.useQuery({
    financialYear: selectedFY,
    breakdownType: 'annual',
    state: selectedState,
  });
  
  const { data: ytdBreakdown, isLoading: isLoadingYtdBreakdown } = trpc.dashboard.getCentreBreakdown.useQuery({
    financialYear: selectedFY,
    breakdownType: 'ytd',
    state: selectedState,
  });
  
  const centreBreakdown = breakdownType === 'annual' ? annualBreakdown : ytdBreakdown;
  const isLoadingBreakdown = breakdownType === 'annual' ? isLoadingAnnualBreakdown : isLoadingYtdBreakdown;
  
  const exportMutation = trpc.dashboard.exportBudgetReport.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExporting(false);
    },
    onError: (error) => {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      setIsExporting(false);
    },
  });
  
  const handleExport = (format: 'pdf' | 'excel') => {
    setIsExporting(true);
    exportMutation.mutate({
      financialYear: selectedFY,
      state: selectedState === 'all' ? undefined : selectedState,
      format,
    });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU').format(num);
  };
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const yearOptions = [selectedYear, selectedYear - 1, selectedYear - 2];
  const fyOptions = [getCurrentFY() - 1, getCurrentFY(), getCurrentFY() + 1];
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#F5F7FA] p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  if (!metrics) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#F5F7FA] p-6 lg:p-8">
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-600">No dashboard data available</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }
  
  const annualActual = metrics.thisYear.ytd.totalRevenue;
  const annualBudget = fyBudgetMetrics?.annualBudget || 0;
  const annualPercentage = annualBudget > 0 ? (annualActual / annualBudget) * 100 : 0;
  
  const ytdActual = metrics.thisYear.ytd.totalRevenue;
  const ytdBudget = fyBudgetMetrics?.ytdBudget || 0;
  const ytdPercentage = ytdBudget > 0 ? (ytdActual / ytdBudget) * 100 : 0;
  
  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#F5F7FA]">
        {/* Header Section */}
        <div className="bg-white border-b border-[#E1E5EC] px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-semibold text-blue-900">Portfolio Dashboard</h1>
                <p className="text-sm text-gray-500">Real Casual Leasing</p>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {availableStates?.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedFY.toString()} onValueChange={(v) => setSelectedFY(parseInt(v))}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fyOptions.map((fy) => (
                    <SelectItem key={fy} value={fy.toString()}>
                      FY {fy - 1}-{fy.toString().slice(-2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isExporting} className="h-9">
                      <Download className="h-4 w-4 mr-1" />
                      {isExporting ? 'Exporting...' : 'Export'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    refetch();
                    toast.success("Data Updated", {
                      description: "Portfolio dashboard data has been refreshed."
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6 lg:p-8">
          {/* KPI Grid - Top 60% */}
          <div className="space-y-6 mb-8">
            {/* Row 1 - YTD Priority (Larger Cards) */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Year to Date</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard 
                  title="YTD All Centres $" 
                  value={formatCurrency(metrics.thisYear.ytd.totalRevenue)} 
                />
                <KPICard 
                  title="YTD Booked Days" 
                  value={formatNumber(metrics.thisYear.ytd.totalBookedDays)} 
                />
                <KPICard 
                  title="YTD Top Site $" 
                  value={formatCurrency((metrics.thisYear.ytd.topSite as any)?.revenue || 0)}
                  subtitle={(metrics.thisYear.ytd.topSite as any)?.siteName ? 
                    `${(metrics.thisYear.ytd.topSite as any)?.siteName} - ${(metrics.thisYear.ytd.topSite as any)?.centreName}` : 
                    undefined
                  }
                />
              </div>
            </div>
            
            {/* Row 2 - This Month */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">This Month - {monthNames[selectedMonth - 1]}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                  title="Month All Centres $" 
                  value={formatCurrency(metrics.thisYear.month.totalRevenue)} 
                />
                <KPICard 
                  title="Month Booked Days" 
                  value={formatNumber(metrics.thisYear.month.totalBookedDays)} 
                />
                <KPICard 
                  title="Month Top Site $" 
                  value={formatCurrency((metrics.thisYear.month.topSite as any)?.revenue || 0)}
                  subtitle={(metrics.thisYear.month.topSite as any)?.siteName ? 
                    `${(metrics.thisYear.month.topSite as any)?.siteName} - ${(metrics.thisYear.month.topSite as any)?.centreName}` : 
                    undefined
                  }
                />
                <KPICard 
                  title="Month Top Site Days" 
                  value={formatNumber((metrics.thisYear.month.topSite as any)?.bookedDays || 0)}
                  subtitle={(metrics.thisYear.month.topSite as any)?.siteName ? 
                    `${(metrics.thisYear.month.topSite as any)?.siteName}` : 
                    undefined
                  }
                />
              </div>
            </div>
            
            {/* Row 3 - Last Year (Lighter styling) */}
            <div>
              <h2 className="text-lg font-semibold text-gray-500 mb-3">Last Year - {monthNames[selectedMonth - 1]} & YTD</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                  title="LY Month $" 
                  value={formatCurrency(metrics.lastYear.month.totalRevenue)} 
                  variant="secondary"
                />
                <KPICard 
                  title="LY Month Days" 
                  value={formatNumber(metrics.lastYear.month.totalBookedDays)} 
                  variant="secondary"
                />
                <KPICard 
                  title="LY YTD $" 
                  value={formatCurrency(metrics.lastYear.ytd.totalRevenue)} 
                  variant="secondary"
                />
                <KPICard 
                  title="LY YTD Days" 
                  value={formatNumber(metrics.lastYear.ytd.totalBookedDays)} 
                  variant="secondary"
                />
              </div>
            </div>
            
            {/* Quick Actions Card - positioned at bottom-right of KPI grid */}
            <div className="flex justify-end">
              <div className="bg-white rounded-lg border border-[#E1E5EC] shadow-[0_2px_8px_rgba(15,35,52,0.08)] p-4 w-full sm:w-auto sm:min-w-[280px]">
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">Quick Actions</p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setLocation('/admin/bookings')}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Pending Approvals
                  {metrics.pendingApprovalsCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {metrics.pendingApprovalsCount}
                    </Badge>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Last updated: {format(new Date(metrics.lastUpdated), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Budget Rail - Bottom 40% */}
          <div className="bg-[#EEF2F7] rounded-lg p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-6">Budget Performance</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Annual Budget Card */}
              <div 
                className="bg-white rounded-lg border border-[#E1E5EC] shadow-[0_2px_8px_rgba(15,35,52,0.08)] p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => { setBreakdownType("annual"); setShowBudgetBreakdown(true); }}
              >
                <h3 className="text-base font-semibold text-gray-800 text-center mb-4">Annual Budget</h3>
                <div className="flex flex-col items-center">
                  <DonutChart percentage={annualPercentage} />
                  
                  {/* Progress Bar */}
                  <div className="w-full mt-6">
                    <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(annualPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="w-full mt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(annualActual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(annualBudget)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-gray-600">% of Budget</span>
                      <span className="font-bold text-blue-600">{Math.round(annualPercentage)}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400 mt-4">Click for detailed breakdown</p>
              </div>
              
              {/* YTD Budget Card */}
              <div 
                className="bg-white rounded-lg border border-[#E1E5EC] shadow-[0_2px_8px_rgba(15,35,52,0.08)] p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => { setBreakdownType("ytd"); setShowBudgetBreakdown(true); }}
              >
                <h3 className="text-base font-semibold text-gray-800 text-center mb-4">YTD Budget</h3>
                <div className="flex flex-col items-center">
                  <DonutChart percentage={ytdPercentage} />
                  
                  {/* Progress Bar */}
                  <div className="w-full mt-6">
                    <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(ytdPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="w-full mt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">YTD Actual</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ytdActual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">YTD Budget</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ytdBudget)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-gray-600">% of Budget</span>
                      <span className="font-bold text-blue-600">{Math.round(ytdPercentage)}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400 mt-4">Click for detailed breakdown</p>
              </div>
            </div>
          </div>
          
          {/* Budget Breakdown Tables */}
          <div className="mt-8 space-y-8">
            {/* Annual Budget Breakdown by Centre */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Annual Budget Breakdown by Centre (FY {selectedFY - 1}-{selectedFY.toString().slice(-2)})</h2>
              <div className="bg-white rounded-lg border border-[#E1E5EC] shadow-[0_2px_8px_rgba(15,35,52,0.08)] overflow-hidden">
                {isLoadingAnnualBreakdown ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : !annualBreakdown || annualBreakdown.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No budget data available. Add centre budgets in Budget Management.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Centre</TableHead>
                        <TableHead className="font-semibold">State</TableHead>
                        <TableHead className="text-right font-semibold">Annual Budget</TableHead>
                        <TableHead className="text-right font-semibold">Actual</TableHead>
                        <TableHead className="text-right font-semibold">Variance</TableHead>
                        <TableHead className="text-right font-semibold">% Achieved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {annualBreakdown.map((centre: any) => {
                        const varianceColor = centre.variance >= 0 ? 'text-green-600' : 'text-red-600';
                        const percentColor = centre.percentAchieved >= 100 ? 'text-green-600' : centre.percentAchieved >= 80 ? 'text-yellow-600' : 'text-red-600';
                        
                        return (
                          <TableRow key={centre.centreId}>
                            <TableCell className="font-medium">{centre.centreName}</TableCell>
                            <TableCell>{centre.centreState}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centre.budget)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centre.actual)}</TableCell>
                            <TableCell className={`text-right font-semibold ${varianceColor}`}>
                              {centre.variance >= 0 ? '+' : ''}{formatCurrency(centre.variance)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${percentColor}`}>
                              {Math.round(centre.percentAchieved)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(annualBreakdown.reduce((sum: number, c: any) => sum + c.budget, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(annualBreakdown.reduce((sum: number, c: any) => sum + c.actual, 0))}
                        </TableCell>
                        <TableCell className={`text-right ${annualBreakdown.reduce((sum: number, c: any) => sum + c.variance, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {annualBreakdown.reduce((sum: number, c: any) => sum + c.variance, 0) >= 0 ? '+' : ''}
                          {formatCurrency(annualBreakdown.reduce((sum: number, c: any) => sum + c.variance, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round((annualBreakdown.reduce((sum: number, c: any) => sum + c.actual, 0) / annualBreakdown.reduce((sum: number, c: any) => sum + c.budget, 0)) * 100) || 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
            
            {/* YTD Budget Breakdown by Centre */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">YTD Budget Breakdown by Centre (FY {selectedFY - 1}-{selectedFY.toString().slice(-2)})</h2>
              <div className="bg-white rounded-lg border border-[#E1E5EC] shadow-[0_2px_8px_rgba(15,35,52,0.08)] overflow-hidden">
                {isLoadingYtdBreakdown ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : !ytdBreakdown || ytdBreakdown.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No budget data available. Add centre budgets in Budget Management.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Centre</TableHead>
                        <TableHead className="font-semibold">State</TableHead>
                        <TableHead className="text-right font-semibold">YTD Budget</TableHead>
                        <TableHead className="text-right font-semibold">YTD Actual</TableHead>
                        <TableHead className="text-right font-semibold">Variance</TableHead>
                        <TableHead className="text-right font-semibold">% Achieved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ytdBreakdown.map((centre: any) => {
                        const varianceColor = centre.variance >= 0 ? 'text-green-600' : 'text-red-600';
                        const percentColor = centre.percentAchieved >= 100 ? 'text-green-600' : centre.percentAchieved >= 80 ? 'text-yellow-600' : 'text-red-600';
                        
                        return (
                          <TableRow key={centre.centreId}>
                            <TableCell className="font-medium">{centre.centreName}</TableCell>
                            <TableCell>{centre.centreState}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centre.budget)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centre.actual)}</TableCell>
                            <TableCell className={`text-right font-semibold ${varianceColor}`}>
                              {centre.variance >= 0 ? '+' : ''}{formatCurrency(centre.variance)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${percentColor}`}>
                              {Math.round(centre.percentAchieved)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ytdBreakdown.reduce((sum: number, c: any) => sum + c.budget, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ytdBreakdown.reduce((sum: number, c: any) => sum + c.actual, 0))}
                        </TableCell>
                        <TableCell className={`text-right ${ytdBreakdown.reduce((sum: number, c: any) => sum + c.variance, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {ytdBreakdown.reduce((sum: number, c: any) => sum + c.variance, 0) >= 0 ? '+' : ''}
                          {formatCurrency(ytdBreakdown.reduce((sum: number, c: any) => sum + c.variance, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round((ytdBreakdown.reduce((sum: number, c: any) => sum + c.actual, 0) / ytdBreakdown.reduce((sum: number, c: any) => sum + c.budget, 0)) * 100) || 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Budget Breakdown Modal */}
        <Dialog open={showBudgetBreakdown} onOpenChange={setShowBudgetBreakdown}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {breakdownType === "annual" ? "Annual" : "YTD"} Budget Breakdown by Centre
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Detailed breakdown showing budget vs actual performance for each centre
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centre</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">% Achieved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBreakdown ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : !centreBreakdown || centreBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No budget data available for this period. Add centre budgets in Budget Management.
                        </TableCell>
                      </TableRow>
                    ) : (
                      centreBreakdown.map((centre: any) => {
                        const varianceColor = centre.variance >= 0 ? 'text-green-600' : 'text-red-600';
                        const percentColor = centre.percentAchieved >= 100 ? 'text-green-600' : centre.percentAchieved >= 80 ? 'text-yellow-600' : 'text-red-600';
                        
                        return (
                          <TableRow key={centre.centreId}>
                            <TableCell className="font-medium">{centre.centreName}</TableCell>
                            <TableCell>{centre.centreState}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centre.budget)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centre.actual)}</TableCell>
                            <TableCell className={`text-right font-semibold ${varianceColor}`}>
                              {centre.variance >= 0 ? '+' : ''}{formatCurrency(centre.variance)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${percentColor}`}>
                              {Math.round(centre.percentAchieved)}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
