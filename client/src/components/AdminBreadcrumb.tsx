import { useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/centres': 'Shopping Centres',
  '/admin/sites': 'Casual Leasing Sites',
  '/admin/vacant-shops': 'Vacant Shops',
  '/admin/third-line-income': 'Third Line Income',
  '/admin/bookings': 'Bookings',
  '/admin/admin-booking': 'Admin Booking',
  '/admin/pending-approvals': 'Pending Approvals',
  '/admin/vs-bookings': 'VS Bookings',
  '/admin/third-line-bookings': '3rdL Bookings',
  '/admin/maps': 'Floor Plan Maps',
  '/admin/asset-map-placement': 'Asset Map Placement',
  '/admin/site-assignment': 'Site Assignment',
  '/admin/equipment': 'Equipment',
  '/admin/usage-categories': 'Usage Categories',
  '/admin/centre-codes': 'Centre Codes',
  '/admin/third-line-categories': '3rdL Categories',
  '/admin/seasonal-rates': 'Seasonal Pricing',
  '/admin/fy-budgets': 'Budget Management',
  '/admin/financials': 'Financial Reports',
  '/admin/remittance': 'Remittance Report',
  '/admin/payments': 'Record Payments',
  '/admin/eft-payments': 'EFT Payment Matching',
  '/admin/occupancy-report': 'Occupancy Report',
  '/admin/aged-debtors': 'Aged Debtors',
  '/admin/gst-report': 'GST Report',
  '/admin/users': 'Users',
  '/admin/owners': 'Owners & Managers',
  '/admin/operators': 'Operators',
  '/admin/portfolios': 'Portfolios',
  '/admin/portfolio': 'Portfolio Dashboard',
  '/admin/manage-faq': 'Manage FAQs',
  '/admin/logo-management': 'Logo Management',
  '/admin/owner-logo-allocation': 'Owner Logo Allocation',
  '/admin/search-analytics': 'Search Analytics',
  '/admin/image-analytics': 'Image Analytics',
  '/admin/pricing-analytics': 'Pricing Analytics',
  '/admin/feedback': 'Feedback',
  '/admin/audit': 'Audit Log',
  '/admin/settings': 'Settings',
  '/admin/weekly-report': 'Weekly Report',
  '/admin/owner-viewer': 'Owner Dashboard',
};

export function AdminBreadcrumb() {
  const [location, setLocation] = useLocation();
  const basePath = location.split('?')[0];
  const label = ROUTE_LABELS[basePath];
  const dynamicLabel = !label && basePath.startsWith('/admin/customer/') ? 'Customer Profile' : label;
  
  if (basePath === '/admin') return null;
  
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <button
        onClick={() => setLocation('/admin')}
        className="hover:text-foreground transition-colors flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
        Admin
      </button>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{dynamicLabel || basePath.split('/').pop()}</span>
    </nav>
  );
}
