import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
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
  CalendarPlus
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { trpc } from "@/lib/trpc";

// Define menu sections with grouped items
type MenuSection = {
  title: string;
  items: Array<{ icon: any; label: string; path: string }>;
};

const getMenuSections = (userRole: string): MenuSection[] => {
  // Mega Admin and Owner Super Admin see everything
  if (userRole === "mega_admin" || userRole === "owner_super_admin") {
    return [
      {
        title: "Overview",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
          { icon: TrendingUp, label: "Portfolio Dashboard", path: "/admin/portfolio" },
        ],
      },
      {
        title: "Content Management",
        items: [
          { icon: Building2, label: "Shopping Centres", path: "/admin/centres" },
          { icon: MapPin, label: "Sites", path: "/admin/sites" },
          { icon: Store, label: "Vacant Shops", path: "/admin/vacant-shops" },
          { icon: Layers, label: "Third Line Income", path: "/admin/third-line-income" },
          { icon: Tag, label: "Third Line Categories", path: "/admin/third-line-categories" },
          { icon: Map, label: "Floor Plan Maps", path: "/admin/maps" },
          { icon: MapPin, label: "Asset Map Placement", path: "/admin/asset-map-placement" },
          { icon: MapPin, label: "Site Assignment", path: "/admin/site-assignment" },
          { icon: Package, label: "Equipment", path: "/admin/equipment" },
          { icon: Tag, label: "Usage Categories", path: "/admin/usage-categories" },
          { icon: Hash, label: "Centre Codes", path: "/admin/centre-codes" },
        ],
      },
      {
        title: "Operations",
        items: [
          { icon: CheckCircle, label: "Pending Approvals", path: "/admin/pending-approvals" },
          { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
          { icon: CalendarPlus, label: "Admin Booking", path: "/admin/admin-booking" },
          { icon: Store, label: "VS Bookings", path: "/admin/vs-bookings" },
          { icon: Layers, label: "3rdL Bookings", path: "/admin/third-line-bookings" },
          { icon: TrendingUp, label: "Seasonal Pricing", path: "/admin/seasonal-rates" },
        ],
      },
      {
        title: "Financial",
        items: [
          { icon: DollarSign, label: "Budget Management", path: "/admin/fy-budgets" },
          { icon: DollarSign, label: "Financial Reports", path: "/admin/financials" },
          { icon: DollarSign, label: "Invoice Dashboard", path: "/admin/invoice-dashboard" },
          { icon: DollarSign, label: "Record Payments", path: "/admin/payments" },
        ],
      },
      {
        title: "System",
        items: [
          { icon: Users, label: "Users", path: "/admin/users" },
          { icon: Users, label: "Owners & Managers", path: "/admin/owners" },
          { icon: Search, label: "Search Analytics", path: "/admin/search-analytics" },
          { icon: Image, label: "Image Analytics", path: "/admin/image-analytics" },
          { icon: FileText, label: "Audit Log", path: "/admin/audit" },
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
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
          { icon: TrendingUp, label: "Portfolio Dashboard", path: "/admin/portfolio" },
        ],
      },
      {
        title: "Management",
        items: [
          { icon: Building2, label: "My Centres", path: "/admin/centres" },
          { icon: MapPin, label: "Sites", path: "/admin/sites" },
          { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
          { icon: DollarSign, label: "Reports", path: "/admin/financials" },
        ],
      },
    ];
  }

  // Marketing managers
  if (userRole === "owner_marketing_manager") {
    return [
      {
        title: "Overview",
        items: [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
          { icon: TrendingUp, label: "Portfolio Dashboard", path: "/admin/portfolio" },
        ],
      },
      {
        title: "Content",
        items: [
          { icon: Building2, label: "Centres", path: "/admin/centres" },
          { icon: MapPin, label: "Sites", path: "/admin/sites" },
          { icon: FileText, label: "Content", path: "/admin/content" },
        ],
      },
    ];
  }

  // Default (shouldn't reach here for non-admin users)
  return [
    {
      title: "Overview",
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

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = getLoginUrl();
    }
    if (!loading && user && user.role === "customer") {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

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

  const menuSections = getMenuSections(user.role);
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="none">
        <SidebarHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="font-bold text-lg">Real Casual Leasing</h2>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {menuSections.map((section) => (
            <div key={section.title} className="py-2">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => setLocation(item.path)}
                      isActive={location === item.path}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{user.name || "User"}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
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
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
