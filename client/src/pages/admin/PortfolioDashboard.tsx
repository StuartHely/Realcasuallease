import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function PortfolioDashboard() {
  const [, setLocation] = useLocation();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedState, setSelectedState] = useState<string>("all");
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"annual" | "ytd">("annual");
  
  // Calculate current financial year (July-June)
  const getCurrentFY = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    return month >= 6 ? year + 1 : year;
  };
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  
  const { data: metrics, isLoading, refetch } = trpc.dashboard.getMetrics.useQuery({
    month: selectedMonth,
    year: selectedYear,
    state: selectedState,
  });
  
  const { data: availableStates } = trpc.dashboard.getAvailableStates.useQuery();
  
  // FY Budget metrics
  const { data: fyBudgetMetrics } = trpc.dashboard.getFYBudgetMetrics.useQuery({
    financialYear: selectedFY,
    state: selectedState,
  });
  
  const { data: siteBreakdown, isLoading: isLoadingBreakdown } = trpc.dashboard.getSiteBreakdown.useQuery(
    {
      year: selectedYear,
      breakdownType,
      state: selectedState,
    },
    {
      enabled: showBudgetBreakdown, // Only fetch when modal is open
    }
  );
  
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
  
  // Generate year options (current year and previous 2 years)
  const yearOptions = [selectedYear, selectedYear - 1, selectedYear - 2];
  
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-600">No dashboard data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Calculate budget percentages for pie charts - using FY budget data
  const annualActual = metrics.thisYear.ytd.totalRevenue;
  const annualBudget = fyBudgetMetrics?.annualBudget || 0;
  const annualPercentage = annualBudget > 0 ? (annualActual / annualBudget) * 100 : 0;
  
  const ytdActual = metrics.thisYear.ytd.totalRevenue;
  const ytdBudget = fyBudgetMetrics?.ytdBudget || 0;
  const ytdPercentage = ytdBudget > 0 ? (ytdActual / ytdBudget) * 100 : 0;
  
  // Generate FY options
  const fyOptions = [getCurrentFY() - 1, getCurrentFY(), getCurrentFY() + 1];
  
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Portfolio Dashboard</h1>
        <p className="text-gray-600">
          Real-time performance metrics across your portfolio
        </p>
      </div>
      
      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 mb-8 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[150px]">
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
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Year:</label>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
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
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">State:</label>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[150px]">
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
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Financial Year:</label>
          <Select value={selectedFY.toString()} onValueChange={(v) => setSelectedFY(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
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
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Update
        </Button>
      </div>
      
      {/* Metrics Grid */}
      <div className="space-y-8">
        {/* This Year - YTD */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">This Year - Year to Date</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD All Centres $</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(metrics.thisYear.ytd.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD All Centres # Booked Days</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(metrics.thisYear.ytd.totalBookedDays)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD Top Site $</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.thisYear.ytd.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency((metrics.thisYear.ytd.topSite as any)?.revenue || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.thisYear.ytd.topSite as any)?.siteName} - {(metrics.thisYear.ytd.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD Top Site Days Booked</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.thisYear.ytd.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatNumber((metrics.thisYear.ytd.topSite as any)?.bookedDays || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.thisYear.ytd.topSite as any)?.siteName} - {(metrics.thisYear.ytd.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Last Year - YTD */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Last Year - Year to Date</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD All Centres $</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-700">
                  {formatCurrency(metrics.lastYear.ytd.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD All Centres Booked Days</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-700">
                  {formatNumber(metrics.lastYear.ytd.totalBookedDays)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD Top Site $</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.lastYear.ytd.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-gray-700">
                      {formatCurrency((metrics.lastYear.ytd.topSite as any)?.revenue || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.lastYear.ytd.topSite as any)?.siteName} - {(metrics.lastYear.ytd.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">YTD Top Site # Booked Days</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.lastYear.ytd.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-gray-700">
                      {formatNumber((metrics.lastYear.ytd.topSite as any)?.bookedDays || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.lastYear.ytd.topSite as any)?.siteName} - {(metrics.lastYear.ytd.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* This Year - Month */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">This Year - {monthNames[selectedMonth - 1]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month All Centres $</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(metrics.thisYear.month.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month All Centres # Booked Days</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(metrics.thisYear.month.totalBookedDays)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month Top Site $</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.thisYear.month.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency((metrics.thisYear.month.topSite as any)?.revenue || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.thisYear.month.topSite as any)?.siteName} - {(metrics.thisYear.month.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month Top Site Days Booked</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.thisYear.month.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatNumber((metrics.thisYear.month.topSite as any)?.bookedDays || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.thisYear.month.topSite as any)?.siteName} - {(metrics.thisYear.month.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Last Year - Month */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Last Year - {monthNames[selectedMonth - 1]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month All Centres $</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-700">
                  {formatCurrency(metrics.lastYear.month.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month All Centres Booked Days</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-700">
                  {formatNumber(metrics.lastYear.month.totalBookedDays)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month Top Site $</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.lastYear.month.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-gray-700">
                      {formatCurrency((metrics.lastYear.month.topSite as any)?.revenue || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.lastYear.month.topSite as any)?.siteName} - {(metrics.lastYear.month.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Month Top Site # Booked Days</CardTitle>
              </CardHeader>
              <CardContent>
                {(metrics.lastYear.month.topSite as any) ? (
                  <>
                    <p className="text-2xl font-bold text-gray-700">
                      {formatNumber((metrics.lastYear.month.topSite as any)?.bookedDays || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(metrics.lastYear.month.topSite as any)?.siteName} - {(metrics.lastYear.month.topSite as any)?.centreName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Budget Charts and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Annual Budget Pie Chart */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setBreakdownType("annual"); setShowBudgetBreakdown(true); }}>
            <CardHeader>
              <CardTitle className="text-center">Annual Budget</CardTitle>
              <p className="text-xs text-center text-gray-500 mt-1">Click for detailed breakdown</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#1e40af"
                    strokeWidth="20"
                  />
                  {/* Actual amount */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="20"
                    strokeDasharray={`${Math.min(annualPercentage, 100) * 2.51} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(annualPercentage)}%</p>
                  <p className="text-xs text-gray-600">achieved</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-center">
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-yellow-400 rounded mr-2"></span>
                  Actual: {formatCurrency(annualActual)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-blue-800 rounded mr-2"></span>
                  Budget: {formatCurrency(annualBudget)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* YTD Budget Pie Chart */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setBreakdownType("ytd"); setShowBudgetBreakdown(true); }}>
            <CardHeader>
              <CardTitle className="text-center">YTD Budget</CardTitle>
              <p className="text-xs text-center text-gray-500 mt-1">Click for detailed breakdown</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#1e40af"
                    strokeWidth="20"
                  />
                  {/* Actual amount */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="20"
                    strokeDasharray={`${Math.min(ytdPercentage, 100) * 2.51} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(ytdPercentage)}%</p>
                  <p className="text-xs text-gray-600">achieved</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-center">
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-yellow-400 rounded mr-2"></span>
                  YTD Actual: {formatCurrency(ytdActual)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-blue-800 rounded mr-2"></span>
                  YTD Budget: {formatCurrency(ytdBudget)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 items-center justify-center h-full">
              <Button
                className="w-full"
                variant="default"
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
              
              <div className="text-center text-sm text-gray-600 mt-4">
                <p>Last updated:</p>
                <p className="font-medium">
                  {format(new Date(metrics.lastUpdated), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget Breakdown Modal */}
      <Dialog open={showBudgetBreakdown} onOpenChange={setShowBudgetBreakdown}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {breakdownType === "annual" ? "Annual" : "YTD"} Budget Breakdown by Site
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-4">
              Detailed breakdown showing budget vs actual performance for each site
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Centre</TableHead>
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
                  ) : !siteBreakdown || siteBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No budget data available for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    siteBreakdown.map((site) => {
                      const varianceColor = site.variance >= 0 ? 'text-green-600' : 'text-red-600';
                      const percentColor = site.percentAchieved >= 100 ? 'text-green-600' : site.percentAchieved >= 80 ? 'text-yellow-600' : 'text-red-600';
                      
                      return (
                        <TableRow key={site.siteId}>
                          <TableCell className="font-medium">{site.siteName}</TableCell>
                          <TableCell>{site.centreName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(site.budget)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(site.actual)}</TableCell>
                          <TableCell className={`text-right font-semibold ${varianceColor}`}>
                            {site.variance >= 0 ? '+' : ''}{formatCurrency(site.variance)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${percentColor}`}>
                            {Math.round(site.percentAchieved)}%
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
  );
}
