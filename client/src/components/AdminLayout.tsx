import { useAuth } from "@/_core/hooks/useAuth";
import Logo from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  LayoutDashboard,
  Building2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Settings,
  Home,
  LogOut,
  Map,
  TrendingUp,
  Package,
  CheckCircle,
  Tag,
  Hash,
  Search,
  Image,
  Store,
  Layers,
  CalendarPlus,
  BarChart3,
  Globe,
  MessageSquare,
  Banknote,
  ChevronRight,
  AlertCircle,
  Target,
  ArrowRightLeft,
  Calculator,
  CreditCard,
  Receipt,
  FolderOpen,
  Palette,
  Landmark,
  Clock,
  Mail,
  HelpCircle,
  ScrollText,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { trpc } from "@/lib/trpc";
import { AdminBreadcrumb } from "./AdminBreadcrumb";

// Define menu sections with grouped items
type MenuItem = { icon: any; label: string; path: string; badge?: number };
type MenuSection = {
  title: string;
  icon: any;
  collapsible: boolean;
  defaultOpen?: boolean;
  items: MenuItem[];
};

const getMenuSections = (userRole: string, pendingCount: number): MenuSection[] => {
  // Mega Admin and Owner Super Admin see everything
  if (userRole === "mega_admin" || userRole === "owner_super_admin") {
    return [
      {
        title: "Overview",
        icon: LayoutDashboard,
        collapsible: false,
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
          { icon: TrendingUp, label: "Portfolio Dashboard", path: "/admin/portfolio" },
        ],
      },
      {
        title: "Centres & Assets",
        icon: Building2,
        collapsible: true,
        defaultOpen: true,
        items: [
          { icon: Building2, label: "Shopping Centres", path: "/admin/centres" },
          { icon: MapPin, label: "CL Sites", path: "/admin/sites" },
          { icon: Store, label: "Vacant Shops", path: "/admin/vacant-shops" },
          { icon: Layers, label: "Third Line Income", path: "/admin/third-line-income" },
          { icon: Package, label: "Equipment", path: "/admin/equipment" },
        ],
      },
      {
        title: "Content Setup",
        icon: Tag,
        collapsible: true,
        defaultOpen: false,
        items: [
          { icon: Map, label: "Floor Plan Maps", path: "/admin/maps" },
          { icon: Target, label: "Asset Map Placement", path: "/admin/asset-map-placement" },
          { icon: ArrowRightLeft, label: "Site Assignment", path: "/admin/site-assignment" },
          { icon: Tag, label: "Usage Categories", path: "/admin/usage-categories" },
          { icon: Layers, label: "Third Line Categories", path: "/admin/third-line-categories" },
          { icon: Hash, label: "Centre Codes", path: "/admin/centre-codes" },
        ],
      },
      {
        title: "Bookings",
        icon: Calendar,
        collapsible: true,
        defaultOpen: true,
        items: [
          { icon: CheckCircle, label: "Pending Approvals", path: "/admin/pending-approvals", badge: pendingCount },
          { icon: Calendar, label: "CL Bookings", path: "/admin/bookings" },
          { icon: Store, label: "VS Bookings", path: "/admin/vs-bookings" },
          { icon: Layers, label: "3rdL Bookings", path: "/admin/third-line-bookings" },
          { icon: CalendarPlus, label: "Admin Booking Calendar", path: "/admin/admin-booking" },
          { icon: TrendingUp, label: "Seasonal Pricing", path: "/admin/seasonal-rates" },
        ],
      },
      {
        title: "Financial",
        icon: DollarSign,
        collapsible: true,
        defaultOpen: false,
        items: [
          { icon: Calculator, label: "Budget Management", path: "/admin/fy-budgets" },
          { icon: DollarSign, label: "Financial Reports", path: "/admin/financials" },
          { icon: Landmark, label: "Remittance Report", path: "/admin/remittance" },
          { icon: CreditCard, label: "Record Payments", path: "/admin/bookings?status=unpaid" },
          { icon: Banknote, label: "EFT Payment Matching", path: "/admin/eft-payments" },
          { icon: BarChart3, label: "Occupancy Report", path: "/admin/occupancy-report" },
          { icon: Clock, label: "Aged Debtors", path: "/admin/aged-debtors" },
          { icon: Receipt, label: "GST Report", path: "/admin/gst-report" },
        ],
      },
      {
        title: "Reports & Analytics",
        icon: BarChart3,
        collapsible: true,
        defaultOpen: false,
        items: [
          { icon: Mail, label: "Weekly Report Preview", path: "/admin/weekly-report" },
          { icon: Search, label: "Search Analytics", path: "/admin/search-analytics" },
          { icon: Image, label: "Image Analytics", path: "/admin/image-analytics" },
          { icon: BarChart3, label: "Pricing Analytics", path: "/admin/pricing-analytics" },
        ],
      },
      {
        title: "System",
        icon: Settings,
        collapsible: true,
        defaultOpen: false,
        items: [
          { icon: Users, label: "Users", path: "/admin/users" },
          { icon: Users, label: "Owners & Managers", path: "/admin/owners" },
          { icon: Globe, label: "Operators", path: "/admin/operators" },
          { icon: FolderOpen, label: "Portfolios", path: "/admin/portfolios" },
          { icon: HelpCircle, label: "Manage FAQs", path: "/admin/manage-faq" },
          { icon: Image, label: "Logo Management", path: "/admin/logo-management" },
          { icon: Palette, label: "Owner Logo Allocation", path: "/admin/owner-logo-allocation" },
          { icon: MessageSquare, label: "Feedback", path: "/admin/feedback" },
          { icon: ScrollText, label: "Audit Log", path: "/admin/audit" },
          { icon: Settings, label: "Settings", path: "/admin/settings" },
        ],
      },
    ];
  }

  // State/Regional/Centre admins see limited views
  if (
    userRole === "owner_state_admin" ||
    userRole === "owner_regional_admin" ||
    userRole === "owner_centre_manager"
  ) {
    return [
      {
        title: "Overview",
        icon: LayoutDashboard,
        collapsible: false,
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
          { icon: TrendingUp, label: "Portfolio Dashboard", path: "/admin/portfolio" },
        ],
      },
      {
        title: "Management",
        icon: Building2,
        collapsible: true,
        defaultOpen: true,
        items: [
          { icon: Building2, label: "My Centres", path: "/admin/centres" },
          { icon: MapPin, label: "Casual Leasing Sites", path: "/admin/sites" },
          { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
          { icon: DollarSign, label: "Reports", path: "/admin/financials" },
          { icon: BarChart3, label: "Occupancy Report", path: "/admin/occupancy-report" },
          { icon: FileText, label: "Aged Debtors", path: "/admin/aged-debtors" },
          { icon: DollarSign, label: "GST Report", path: "/admin/gst-report" },
        ],
      },
    ];
  }

  // Owner viewer - read-only dashboard
  if (userRole === "owner_viewer") {
    return [
      {
        title: "Overview",
        icon: LayoutDashboard,
        collapsible: false,
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin/owner-viewer" },
        ],
      },
    ];
  }

  // Marketing managers
  if (userRole === "owner_marketing_manager") {
    return [
      {
        title: "Overview",
        icon: LayoutDashboard,
        collapsible: false,
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
          { icon: TrendingUp, label: "Portfolio Dashboard", path: "/admin/portfolio" },
        ],
      },
      {
        title: "Content",
        icon: Building2,
        collapsible: true,
        defaultOpen: true,
        items: [
          { icon: Building2, label: "Centres", path: "/admin/centres" },
          { icon: MapPin, label: "Casual Leasing Sites", path: "/admin/sites" },
          { icon: FileText, label: "Content", path: "/admin/content" },
        ],
      },
    ];
  }

  // Default (shouldn't reach here for non-admin users)
  return [
    {
      title: "Overview",
      icon: LayoutDashboard,
      collapsible: false,
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      ],
    },
  ];
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const { data: pendingData } = trpc.admin.getPendingCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const pendingCount = pendingData?.count ?? 0;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
    if (!loading && user && user.role === "customer") {
      setLocation("/");
    }
    if (!loading && user && user.role === "owner_viewer" && location === "/admin") {
      setLocation("/admin/owner-viewer");
    }
  }, [loading, user, location, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Check if user has admin role
  const isAdmin = user.role !== "customer";
  if (!isAdmin) {
    return null;
  }

  const menuSections = getMenuSections(user.role, pendingCount);
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Logo height={40} width={150} className="h-10" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Admin Dashboard</p>
        </SidebarHeader>
        <SidebarContent>
          {menuSections.map((section) => {
            const isActive = section.items.some(item => location === item.path || location.startsWith(item.path + '/'));

            if (!section.collapsible) {
              return (
                <SidebarGroup key={section.title}>
                  <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton onClick={() => setLocation(item.path)} isActive={location === item.path}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              );
            }

            return (
              <Collapsible key={section.title} defaultOpen={section.defaultOpen || isActive} className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center gap-2">
                      <section.icon className="h-4 w-4" />
                      {section.title}
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton onClick={() => setLocation(item.path)} isActive={location === item.path} className="pl-6">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <SidebarMenuBadge className="bg-red-500 text-white">{item.badge}</SidebarMenuBadge>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </SidebarContent>
        <SidebarFooter className="border-t p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setLocation("/")}>
                <Home className="h-4 w-4" />
                <span>Back to Website</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <AdminBreadcrumb />
          <div className="flex-1" />
          {pendingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700"
              onClick={() => setLocation('/admin/pending-approvals')}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">{user.name || "User"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/")}>
                <Home className="mr-2 h-4 w-4" />
                Back to Website
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
