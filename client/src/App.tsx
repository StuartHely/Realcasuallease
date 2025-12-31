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
import SeasonalRates from "./pages/admin/SeasonalRates";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/centres" component={Centres} />
      <Route path="/centre/:id" component={CentreDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/centres" component={AdminCentres} />
      <Route path="/admin/sites" component={AdminSites} />
           <Route path="/admin/maps" component={Maps} />
          <Route path="/admin/system-config" component={SystemConfig} />
          <Route path="/admin/image-analytics" component={ImageAnalytics} />
      <Route path="/admin/site-assignment" component={AdminSiteAssignment} />
      <Route path="/admin/seasonal-rates" component={SeasonalRates} />
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
