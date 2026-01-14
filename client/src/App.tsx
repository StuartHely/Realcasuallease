import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Centres from "./pages/Centres";
import CentreDetail from "./pages/CentreDetail";
import SiteDetail from "./pages/SiteDetail";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCentres from "./pages/admin/Centres";
import AdminSites from "./pages/admin/Sites";
import Maps from "./pages/admin/Maps";
import SystemConfig from "./pages/admin/SystemConfig";
import ImageAnalytics from "./pages/admin/ImageAnalytics";
import AdminSiteAssignment from "./pages/admin/SiteAssignment";
import Equipment from "./pages/admin/Equipment";
import SeasonalRates from "./pages/admin/SeasonalRates";
import PendingApprovals from "./pages/admin/PendingApprovals";
import AdminBookings from "./pages/admin/Bookings";
import AdminUsers from "./pages/admin/Users";
import AdminOwners from "./pages/admin/Owners";
import AdminFinancials from "./pages/admin/Financials";
import AdminAudit from "./pages/admin/Audit";
import AdminSettings from "./pages/admin/Settings";
import UsageCategories from "./pages/admin/UsageCategories";
import CentreCodes from "./pages/admin/CentreCodes";
import Payments from "./pages/admin/Payments";
import InvoiceDashboard from "./pages/admin/InvoiceDashboard";
import SearchAnalytics from "./pages/admin/SearchAnalytics";
import PortfolioDashboard from "./pages/admin/PortfolioDashboard";
import BudgetManagement from "./pages/admin/BudgetManagement";
import FYBudgetManagement from "./pages/admin/FYBudgetManagement";
import OwnerApprovals from "./pages/OwnerApprovals";
import OwnerCentres from "./pages/OwnerCentres";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/centres" component={Centres} />
      <Route path="/centre/:id" component={CentreDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/portfolio" component={PortfolioDashboard} />
      <Route path="/admin/budgets" component={BudgetManagement} />
      <Route path="/admin/fy-budgets" component={FYBudgetManagement} />
      <Route path="/admin/centres" component={AdminCentres} />
      <Route path="/admin/sites" component={AdminSites} />
           <Route path="/admin/maps" component={Maps} />
          <Route path="/admin/system-config" component={SystemConfig} />
          <Route path="/admin/image-analytics" component={ImageAnalytics} />
      <Route path="/admin/search-analytics" component={SearchAnalytics} />
      <Route path="/admin/site-assignment" component={AdminSiteAssignment} />
      <Route path="/admin/equipment" component={Equipment} />
      <Route path="/admin/seasonal-rates" component={SeasonalRates} />
      <Route path="/admin/usage-categories" component={UsageCategories} />
      <Route path="/admin/centre-codes" component={CentreCodes} />
      <Route path="/admin/pending-approvals" component={PendingApprovals} />
        <Route path="/owner/approvals" component={OwnerApprovals} />
        <Route path="/owner/centres" component={OwnerCentres} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/payments" component={Payments} />
      <Route path="/admin/invoice-dashboard" component={InvoiceDashboard} />
      <Route path="/admin/owners" component={AdminOwners} />
      <Route path="/admin/financials" component={AdminFinancials} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/site/:id" component={SiteDetail} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
