import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ArrowLeft, MapPin, Calendar, CalendarDays, ChevronLeft, ChevronRight, X, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import Logo from "@/components/Logo";
import { format, getDaysInMonth, getDay, addDays, subDays, isSameDay, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { PriceCalculator } from "@/components/PriceCalculator";
import { cleanHtmlDescription } from "@/lib/htmlUtils";
import BusinessDetailsGate from "@/components/BusinessDetailsGate";

export default function SiteDetail() {
  const [, params] = useRoute("/site/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const siteId = params?.id ? parseInt(params.id) : 0;
  
  const { data: site, isLoading } = trpc.sites.getById.useQuery({ id: siteId }, { enabled: siteId > 0 });
  const { data: centre } = trpc.centres.getById.useQuery(
    { id: site?.centreId || 0 },
    { enabled: !!site?.centreId }
  );
  const { data: usageCategories } = trpc.usageCategories.list.useQuery();
  const { data: siteApprovedCategories } = trpc.sites.getApprovedCategories.useQuery(
    { siteId },
    { enabled: siteId > 0 }
  );
  const { data: profile, refetch: refetchProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const [showBusinessGate, setShowBusinessGate] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const calendarDays = 14;
  const now = new Date();
  const [calStartDate, setCalStartDate] = useState(startOfDay(now));
  const calEndDate = addDays(calStartDate, calendarDays - 1);
  const { data: monthAvail } = trpc.sites.checkAvailability.useQuery(
    { siteId, startDate: calStartDate, endDate: calEndDate },
    { enabled: siteId > 0 }
  );
  const dateRange = Array.from({ length: calendarDays }, (_, i) => addDays(calStartDate, i));

  // Fetch seasonal rates for the visible calendar range
  const calStartStr = format(calStartDate, 'yyyy-MM-dd');
  const calEndStr = format(calEndDate, 'yyyy-MM-dd');
  const { data: calSeasonalRates } = trpc.sites.getSeasonalRates.useQuery(
    { siteId, startDate: calStartStr, endDate: calEndStr },
    { enabled: siteId > 0 }
  );

  // Build a map of date string → seasonal rate for quick lookup
  const seasonalRateMap = new Map<string, { name: string; weekdayRate: string | null; weekendRate: string | null }>();
  if (calSeasonalRates) {
    for (const rate of calSeasonalRates) {
      const rStart = new Date(rate.startDate + 'T00:00:00');
      const rEnd = new Date(rate.endDate + 'T00:00:00');
      const rangeStart = rStart > calStartDate ? rStart : calStartDate;
      const rangeEnd = rEnd < calEndDate ? rEnd : calEndDate;
      let cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        const ds = format(cur, 'yyyy-MM-dd');
        if (!seasonalRateMap.has(ds)) {
          seasonalRateMap.set(ds, { name: rate.name, weekdayRate: rate.weekdayRate, weekendRate: rate.weekendRate });
        }
        cur = addDays(cur, 1);
      }
    }
  }

  // Calendar click-to-select state (start/end date picking)
  const [calSelection, setCalSelection] = useState<{
    start: Date | null;
    end: Date | null;
    isSelecting: boolean;
  }>({ start: null, end: null, isSelecting: false });

  // Read pre-filled dates from URL parameters (from calendar selection)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prefillStart = urlParams.get('startDate');
    const prefillEnd = urlParams.get('endDate');
    if (prefillStart) setStartDate(prefillStart);
    if (prefillEnd) setEndDate(prefillEnd);
    const prefillCategory = urlParams.get('categoryId');
    if (prefillCategory) setUsageCategoryId(prefillCategory);
  }, []);
  const [usageCategoryId, setUsageCategoryId] = useState<string>("");
  const [additionalCategoryText, setAdditionalCategoryText] = useState("");
  const [customUsage, setCustomUsage] = useState("");
  const [tablesRequested, setTablesRequested] = useState<string>("");
  const [chairsRequested, setChairsRequested] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showTableLimitDialog, setShowTableLimitDialog] = useState(false);
  const [showCentreEquipmentDialog, setShowCentreEquipmentDialog] = useState(false);
  const [showUsageNotPermittedDialog, setShowUsageNotPermittedDialog] = useState(false);
  const [centreEquipmentMessage, setCentreEquipmentMessage] = useState("");
  const [pendingBookingData, setPendingBookingData] = useState<{
    siteId: number;
    startDate: Date;
    endDate: Date;
    usageCategoryId: number;
    additionalCategoryText?: string;
    tablesRequested: number;
    chairsRequested: number;
    bringingOwnTables?: boolean;
  } | null>(null);
  
  const trackViewMutation = trpc.admin.trackImageView.useMutation();
  const trackClickMutation = trpc.admin.trackImageClick.useMutation();
  
  // Get all available images
  const images = [
    site?.imageUrl1,
    site?.imageUrl2,
    site?.imageUrl3,
    site?.imageUrl4,
  ].filter(Boolean) as string[];

  // Track image views when images are displayed
  useEffect(() => {
    if (site && images.length > 0) {
      trackViewMutation.mutate({ siteId: site.id, imageSlot: currentImageIndex + 1 });
    }
  }, [site?.id, currentImageIndex]);

  const checkoutMutation = trpc.bookings.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error("Payment redirect failed: " + error.message);
    },
  });

  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: (data) => {
      const { costBreakdown, equipmentWarning, paymentMethod } = data;
      const outgoingsLine = costBreakdown.outgoingsPerDay > 0 ? `\nOutgoings: ${costBreakdown.weekdayCount + costBreakdown.weekendCount} days @ $${costBreakdown.outgoingsPerDay.toFixed(2)}/day = $${costBreakdown.totalOutgoings.toFixed(2)}` : '';
      const breakdownMessage = `\n\nCost Breakdown:\n${costBreakdown.weekdayCount} weekdays @ $${costBreakdown.weekdayRate}/day${costBreakdown.weekendCount > 0 ? `\n${costBreakdown.weekendCount} weekend days @ $${costBreakdown.weekendRate}/day` : ''}\nSubtotal: $${costBreakdown.subtotal.toFixed(2)}${outgoingsLine}\nGST: $${costBreakdown.gstAmount.toFixed(2)}\nTotal: $${costBreakdown.total.toFixed(2)}`;
      
      const equipmentMessage = equipmentWarning ? `\n\n⚠️ ${equipmentWarning}` : '';
      
      if (paymentMethod === 'invoice') {
        // Invoice booking messages
        let successMessage: string;
        if (data.requiresApproval) {
          successMessage = "Booking request submitted! You should be advised if your request has been approved within 3 days." + breakdownMessage + equipmentMessage;
        } else {
          successMessage = "Booking confirmed! Booking number: " + data.bookingNumber + "\n\nAn invoice will be sent to your email shortly." + breakdownMessage + equipmentMessage;
        }
        toast.success(successMessage);
        setLocation("/my-bookings");
      } else {
        // Stripe booking — redirect to checkout if auto-confirmed (no approval needed)
        if (!data.requiresApproval) {
          toast.info("Redirecting to payment...");
          checkoutMutation.mutate({ bookingId: data.bookingId });
        } else {
          toast.success("Booking request submitted! You'll be able to pay once approved." + breakdownMessage + equipmentMessage);
          setLocation("/my-bookings");
        }
      }
    },
    onError: (error) => {
      toast.error("Booking failed: " + error.message);
    },
  });

  const handleBooking = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("returnUrl", window.location.pathname + window.location.search);
      window.location.href = "/login";
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (!usageCategoryId) {
      toast.error("Please select a usage category");
      return;
    }

    // Check if business details are complete — gate first booking
    if (isAuthenticated && profile && !profile.companyName) {
      setShowBusinessGate(true);
      return;
    }

    // Check if the selected usage category is approved for this site
    const selectedCatId = parseInt(usageCategoryId);
    if (siteApprovedCategories && siteApprovedCategories.length > 0) {
      const isApproved = siteApprovedCategories.some((cat: any) => cat.id === selectedCatId);
      if (!isApproved) {
        const requestedTables = parseInt(tablesRequested) || 0;
        const requestedChairs = parseInt(chairsRequested) || 0;
        setPendingBookingData({
          siteId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          usageCategoryId: selectedCatId,
          additionalCategoryText: additionalCategoryText || undefined,
          tablesRequested: requestedTables,
          chairsRequested: requestedChairs,
        });
        setShowUsageNotPermittedDialog(true);
        return;
      }
    }

    const requestedTables = parseInt(tablesRequested) || 0;
    const requestedChairs = parseInt(chairsRequested) || 0;
    const maxTables = site?.maxTables || 0;

    // Check if requested tables exceed site maximum
    if (requestedTables > maxTables && maxTables > 0) {
      // Store the booking data with the max tables value for potential confirmation
      setPendingBookingData({
        siteId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        usageCategoryId: parseInt(usageCategoryId),
        additionalCategoryText: additionalCategoryText || undefined,
        tablesRequested: maxTables, // Will be adjusted to max if user confirms
        chairsRequested: requestedChairs,
      });
      setShowTableLimitDialog(true);
      return;
    }

    // Check centre-level equipment availability
    const centreTablesAvailable = centre?.totalTablesAvailable || 0;
    const centreChairsAvailable = centre?.totalChairsAvailable || 0;
    
    if (requestedTables > centreTablesAvailable && centreTablesAvailable > 0) {
      setCentreEquipmentMessage(
        `The centre only has ${centreTablesAvailable} table${centreTablesAvailable !== 1 ? 's' : ''} in total available. Do you still wish to proceed with your own tables?`
      );
      setPendingBookingData({
        siteId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        usageCategoryId: parseInt(usageCategoryId),
        additionalCategoryText: additionalCategoryText || undefined,
        tablesRequested: requestedTables,
        chairsRequested: requestedChairs,
        bringingOwnTables: true,
      });
      setShowCentreEquipmentDialog(true);
      return;
    }

    // Proceed with booking if tables are within limit
    createBookingMutation.mutate({
      siteId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageCategoryId: parseInt(usageCategoryId),
      additionalCategoryText: additionalCategoryText || undefined,
      tablesRequested: requestedTables,
      chairsRequested: requestedChairs,
    });
  };

  const handleTableLimitConfirm = () => {
    if (pendingBookingData) {
      createBookingMutation.mutate(pendingBookingData);
      setShowTableLimitDialog(false);
      setPendingBookingData(null);
    }
  };

  const handleTableLimitCancel = () => {
    setShowTableLimitDialog(false);
    setPendingBookingData(null);
    // Navigate back to centre calendar on the originally requested date
    if (site?.centreId && startDate) {
      setLocation(`/centre/${centre?.slug || site.centreId}?date=${startDate}`);
    }
  };

  const handleCentreEquipmentConfirm = () => {
    if (pendingBookingData) {
      createBookingMutation.mutate(pendingBookingData);
      setShowCentreEquipmentDialog(false);
      setPendingBookingData(null);
    }
  };

  const handleCentreEquipmentCancel = () => {
    setShowCentreEquipmentDialog(false);
    setPendingBookingData(null);
    // Navigate back to home/search
    setLocation('/');
  };

  const handleUsageNotPermittedProceed = () => {
    if (pendingBookingData) {
      createBookingMutation.mutate(pendingBookingData);
      setShowUsageNotPermittedDialog(false);
      setPendingBookingData(null);
    }
  };

  const handleUsageNotPermittedFindAnother = () => {
    setShowUsageNotPermittedDialog(false);
    setPendingBookingData(null);
    setStartDate("");
    setEndDate("");
    setUsageCategoryId("");
    setAdditionalCategoryText("");
    setTablesRequested("0");
    setChairsRequested("0");
    setCalSelection({ start: null, end: null, isSelecting: false });
    setLocation('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading site details...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Site not found</p>
            <Button onClick={() => setLocation("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation("/")}
            >
              <Logo height={48} width={144} className="h-12" />
            </div>
          </div>
          <nav className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setLocation("/")}>Home</Button>
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" onClick={() => setLocation("/my-bookings")}>My Bookings</Button>
                  <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setLocation("/login")}>Log In</Button>
                  <Button variant="outline" onClick={() => setLocation("/register")}>Register</Button>
                </>
              )}
            </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Site Image Gallery Carousel */}
        {images.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="relative">
                {/* Main Image */}
                <div 
                  className="relative h-96 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => {
                    trackClickMutation.mutate({ siteId: site.id, imageSlot: currentImageIndex + 1 });
                    setIsLightboxOpen(true);
                  }}
                >
                  <img
                    src={images[currentImageIndex]}
                    alt={`Site ${site.siteNumber} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </div>
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                      onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
                
                {/* Thumbnail Navigation */}
                {images.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex ? 'border-blue-600' : 'border-gray-300 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Lightbox Modal */}
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
            <div className="relative w-full h-full bg-black">
              <img
                src={images[currentImageIndex]}
                alt={`Site ${site.siteNumber} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => setIsLightboxOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Site Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Site {site.siteNumber}</CardTitle>
                <CardDescription>{centre?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{cleanHtmlDescription(site.description)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Size</h4>
                    <p>{site.size}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Max Tables</h4>
                    <p>{site.maxTables || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Power</h4>
                    <p>{site.powerAvailable}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Instant Booking</h4>
                    <p>{site.instantBooking ? "Yes" : "No"}</p>
                  </div>
                </div>

                {site.restrictions && (
                  <div>
                    <h3 className="font-semibold mb-2">Restrictions</h3>
                    <p className="text-gray-600">{site.restrictions}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Pricing</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Mon-Fri</p>
                      <p className="text-lg font-semibold text-gray-700">${site.pricePerDay}/day</p>
                    </div>
                    {site.weekendPricePerDay && site.weekendPricePerDay !== site.pricePerDay && (
                      <div>
                        <p className="text-sm text-gray-600">Weekend (Sat-Sun)</p>
                        <p className="text-lg font-semibold text-gray-700">${site.weekendPricePerDay}/day</p>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-600">Weekly Rate</p>
                      <p className="text-lg font-semibold text-gray-700">${site.pricePerWeek}/week</p>
                    </div>
                    {parseFloat(site.outgoingsPerDay || "0") > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-gray-600">Outgoings</p>
                        <p className="text-lg font-semibold text-gray-700">${site.outgoingsPerDay}/day</p>
                      </div>
                    )}
                    {calSeasonalRates && calSeasonalRates.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-amber-600" />
                          <p className="text-sm font-semibold text-amber-700">Seasonal Pricing Active</p>
                        </div>
                        {calSeasonalRates.map((sr) => (
                          <div key={sr.id} className="text-xs text-amber-600 ml-6">
                            {sr.name}: {sr.weekdayRate ? `$${sr.weekdayRate}/day` : ''}{sr.weekendRate && sr.weekendRate !== sr.weekdayRate ? ` (wknd $${sr.weekendRate})` : ''} — {sr.startDate} to {sr.endDate}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form — beside site details on the right */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Book This Space
                </CardTitle>
                <CardDescription>
                  {isAuthenticated
                    ? "Fill in the details below to make a booking"
                    : "Please log in to make a booking"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAuthenticated && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center space-y-2">
                    <p className="text-blue-800 font-medium">Log in or register to complete your booking</p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => { sessionStorage.setItem("returnUrl", window.location.pathname + window.location.search); window.location.href = "/login"; }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Log In
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { sessionStorage.setItem("returnUrl", window.location.pathname + window.location.search); window.location.href = "/register"; }}
                      >
                        Register
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  {startDate && endDate ? (
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-semibold">Start:</span> {format(new Date(startDate), "EEEE, d MMMM yyyy")}</p>
                      <p className="text-sm"><span className="font-semibold">End:</span> {format(new Date(endDate), "EEEE, d MMMM yyyy")}</p>
                      <p className="text-xs text-blue-600 mt-1">Click the calendar below to change dates</p>
                    </div>
                  ) : (
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Click on the availability calendar below to select your dates
                    </p>
                  )}
                </div>

                    <div>
                      <Label htmlFor="usageCategory">Usage Category *</Label>
                      <Select value={usageCategoryId} onValueChange={setUsageCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select usage category" />
                        </SelectTrigger>
                        <SelectContent>
                          {usageCategories?.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}{category.isFree && " (FREE)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {usageCategoryId && (
                      <div>
                        <Label htmlFor="additionalCategoryText">Additional Details (optional)</Label>
                        <Textarea
                          id="additionalCategoryText"
                          placeholder="Provide any additional information about your usage..."
                          value={additionalCategoryText}
                          onChange={(e) => setAdditionalCategoryText(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Equipment Request — always show when site has maxTables or centre has equipment */}
                    {((site?.maxTables && site.maxTables > 0) || (centre && ((centre.totalTablesAvailable || 0) > 0 || (centre.totalChairsAvailable || 0) > 0))) && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h3 className="font-semibold text-sm">Equipment Request (Optional)</h3>
                        
                        {((site?.maxTables && site.maxTables > 0) || (centre?.totalTablesAvailable || 0) > 0) && (
                          <div>
                            <Label htmlFor="tablesRequested">
                              Tables Required (Max: {site?.maxTables || 0} for this site)
                            </Label>
                            <Input
                              id="tablesRequested"
                              type="number"
                              min="0"
                              max={site?.maxTables || 0}
                              value={tablesRequested}
                              onChange={(e) => setTablesRequested(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}
                        
                        {(centre && (centre.totalChairsAvailable || 0) > 0) && (
                          <div>
                            <Label htmlFor="chairsRequested">Chairs Required</Label>
                            <Input
                              id="chairsRequested"
                              type="number"
                              min="0"
                              value={chairsRequested}
                              onChange={(e) => setChairsRequested(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          Equipment availability will be checked when you submit your booking.
                        </p>
                      </div>
                    )}

                    {/* Price Calculator */}
                    {startDate && endDate && (
                      <PriceCalculator
                        siteId={siteId}
                        startDate={new Date(startDate)}
                        endDate={new Date(endDate)}
                      />
                    )}

                    {centre?.paymentMode === "invoice_only" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                          This centre processes payments by invoice. You will receive an invoice once your booking is confirmed.
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleBooking}
                      disabled={createBookingMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {!isAuthenticated ? "Log In to Book" :
                        createBookingMutation.isPending ? "Processing..." : 
                        centre?.paymentMode === "invoice_only" ? "Submit Booking Request" : "Confirm Booking"}
                    </Button>
              </CardContent>
            </Card>
          </div>

          {/* Availability Calendar — 14-day heatmap (full width below) */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex items-center gap-6 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded"></div>
                    <span className="text-sm font-medium">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500 rounded"></div>
                    <span className="text-sm font-medium">Booked</span>
                  </div>
                  {seasonalRateMap.size > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-amber-500 rounded"></div>
                      <span className="text-sm font-medium">Seasonal Pricing</span>
                    </div>
                  )}
                </div>

                {/* Date Range Indicator */}
                <div className="text-center mb-3">
                  <span className="text-sm text-muted-foreground">
                    Viewing <span className="font-medium text-foreground">{format(dateRange[0], 'MMM d')}</span> – <span className="font-medium text-foreground">{format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}</span>
                  </span>
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          New Date
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={calStartDate}
                          onSelect={(date) => {
                            if (date) setCalStartDate(startOfDay(date));
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCalStartDate(startOfDay(new Date()))}
                      className="flex items-center gap-1"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Today
                    </Button>
                  </div>
                </div>

                {/* Date selection instruction */}
                {calSelection.isSelecting && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Click on another date to set your end date
                    </p>
                  </div>
                )}

                {/* Heatmap Table */}
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <table className="w-full border-separate border-spacing-0">
                      <thead>
                        {/* Navigation row */}
                        <tr>
                          <th className="sticky left-0 bg-white z-10 px-1 py-1 border-r-2"></th>
                          <th className="px-1 py-1 text-left" colSpan={1}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCalStartDate(subDays(calStartDate, 7))}
                              className="flex items-center gap-1 text-xs"
                              disabled={isBefore(subDays(calStartDate, 7), startOfDay(new Date()))}
                            >
                              <ChevronLeft className="h-3 w-3" />
                              Previous Week
                            </Button>
                          </th>
                          <th colSpan={dateRange.length > 2 ? dateRange.length - 2 : 1}></th>
                          <th className="px-1 py-1 text-right" colSpan={1}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCalStartDate(addDays(calStartDate, 7))}
                              className="flex items-center gap-1 text-xs"
                            >
                              Next Week
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </th>
                        </tr>
                        {/* Date headers */}
                        <tr>
                          <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2">
                            Site
                          </th>
                          {dateRange.map((date, idx) => {
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isToday = isSameDay(date, new Date());
                            const isMonday = dayOfWeek === 1;
                            const isSunday = dayOfWeek === 0;
                            const isWeekBoundaryLeft = isMonday || idx === 0;
                            const isWeekBoundaryRight = isSunday || idx === dateRange.length - 1;

                            return (
                              <th
                                key={idx}
                                className={`px-2 py-2 text-center text-xs font-medium min-w-[80px] border border-gray-200 ${
                                  isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-100' : ''
                                } ${
                                  '!border-t-[3px] !border-t-green-700 !border-solid'
                                } ${
                                  isWeekBoundaryLeft ? '!border-l-[3px] !border-l-green-700 !border-solid' : ''
                                } ${
                                  isWeekBoundaryRight ? '!border-r-[3px] !border-r-green-700 !border-solid' : ''
                                } ${
                                  isToday ? 'border-l-4 border-r-4 border-blue-500' : ''
                                }`}
                              >
                                {isToday && (
                                  <div className="text-blue-600 font-bold text-[10px] mb-1">TODAY</div>
                                )}
                                <div className={isToday ? 'font-bold text-blue-700' : isWeekend ? 'font-semibold' : ''}>{format(date, "dd/MM")}</div>
                                <div className={isToday ? 'text-blue-600' : isWeekend ? 'text-gray-700 font-medium' : 'text-gray-500'}>{format(date, "EEE")}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50">
                          <td className="sticky left-0 bg-white z-10 px-3 py-2 font-medium border-r-2 border-b">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold">{site.siteNumber}</span>
                              <div className="flex gap-2 text-xs text-gray-600">
                                {site.size && <span>{site.size}</span>}
                                {site.maxTables ? <span>• {site.maxTables} tables</span> : null}
                              </div>
                            </div>
                          </td>
                          {dateRange.map((date, dateIdx) => {
                            const isBooked = monthAvail?.bookings?.some((b: any) => {
                              const s = new Date(b.startDate); s.setHours(0, 0, 0, 0);
                              const e = new Date(b.endDate); e.setHours(0, 0, 0, 0);
                              return date >= s && date <= e;
                            });
                            const isToday = isSameDay(date, new Date());
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isMonday = dayOfWeek === 1;
                            const isSunday = dayOfWeek === 0;
                            const isWeekBoundaryLeft = isMonday || dateIdx === 0;
                            const isWeekBoundaryRight = isSunday || dateIdx === dateRange.length - 1;
                            const seasonalInfo = seasonalRateMap.get(format(date, 'yyyy-MM-dd'));
                            const rate = seasonalInfo
                              ? (isWeekend && seasonalInfo.weekendRate ? seasonalInfo.weekendRate : seasonalInfo.weekdayRate || (isWeekend && site.weekendPricePerDay ? site.weekendPricePerDay : site.pricePerDay))
                              : (isWeekend && site.weekendPricePerDay ? site.weekendPricePerDay : site.pricePerDay);
                            const weeklyStr = site.pricePerWeek ? ` | $${site.pricePerWeek}/wk` : '';

                            // Selection state for this cell
                            const isStartDate = calSelection.start && isSameDay(date, calSelection.start);
                            const isEndDate = calSelection.end && isSameDay(date, calSelection.end);
                            const isInRange = calSelection.start && calSelection.end &&
                              date >= calSelection.start && date <= calSelection.end;
                            const isSelectingStart = calSelection.isSelecting && calSelection.start && isSameDay(date, calSelection.start);

                            // Check if this date falls within the booking dates entered in the form
                            const formStart = startDate ? startOfDay(new Date(startDate)) : null;
                            const formEnd = endDate ? startOfDay(new Date(endDate)) : null;
                            const isBookingDate = formStart && formEnd && date >= formStart && date <= formEnd;
                            const isBookingEdge = (formStart && isSameDay(date, formStart)) || (formEnd && isSameDay(date, formEnd));

                            return (
                              <td
                                key={dateIdx}
                                className={`border border-gray-200 border-solid p-0 ${
                                  isBookingDate ? 'ring-2 ring-inset ring-blue-600' : ''
                                } ${
                                  isBookingEdge ? 'ring-[3px] ring-inset ring-blue-700' : ''
                                } ${
                                  isToday && !isBookingDate ? 'border-l-4 border-r-4 border-blue-500' : ''
                                } ${
                                  isWeekBoundaryLeft ? '!border-l-[3px] !border-l-green-700 !border-solid' : ''
                                } ${
                                  isWeekBoundaryRight ? '!border-r-[3px] !border-r-green-700 !border-solid' : ''
                                } ${
                                  '!border-b-[3px] !border-b-green-700 !border-solid' + (isWeekend ? ' bg-gray-50' : '')
                                }`}
                                onClick={() => {
                                  if (isBooked) return;
                                  if (!calSelection.isSelecting) {
                                    // First click — set start date
                                    setCalSelection({ start: date, end: null, isSelecting: true });
                                    setStartDate(format(date, 'yyyy-MM-dd'));
                                    setEndDate('');
                                  } else {
                                    // Second click — set end date
                                    const s = calSelection.start!;
                                    const finalStart = s <= date ? s : date;
                                    const finalEnd = s <= date ? date : s;
                                    setCalSelection({ start: finalStart, end: finalEnd, isSelecting: false });
                                    setStartDate(format(finalStart, 'yyyy-MM-dd'));
                                    setEndDate(format(finalEnd, 'yyyy-MM-dd'));
                                  }
                                }}
                              >
                                <div
                                  className={`h-12 w-full relative ${
                                    isBooked
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : isInRange || isSelectingStart
                                        ? 'bg-blue-500 hover:bg-blue-600'
                                        : seasonalInfo
                                          ? 'bg-amber-500 hover:bg-amber-600'
                                          : 'bg-green-500 hover:bg-green-600'
                                  } transition-colors cursor-pointer`}
                                  title={(() => {
                                    if (isSelectingStart) return 'Start date selected — click another date to set end date';
                                    if (isBooked) return `Site ${site.siteNumber} - ${format(date, "dd/MM/yyyy")} - Booked`;
                                    const rateStr = `$${rate}/day`;
                                    const seasonalStr = seasonalInfo ? ` (${seasonalInfo.name})` : '';
                                    return `Site ${site.siteNumber} - ${format(date, "dd/MM/yyyy")} - Available - ${rateStr}${seasonalStr}${weeklyStr}`;
                                  })()}
                                >
                                  {(isStartDate || isEndDate) && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        {isStartDate && isEndDate ? 'START/END' : isStartDate ? 'START' : 'END'}
                                      </span>
                                    </div>
                                  )}
                                  {isSelectingStart && !isEndDate && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">START</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>


        </div>
      </main>

      {/* Table Limit Confirmation Dialog */}
      <Dialog open={showTableLimitDialog} onOpenChange={setShowTableLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Table Limit Exceeded
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              This site can take a maximum of <span className="font-semibold text-foreground">{site?.maxTables || 0} tables</span>.
              <br /><br />
              Would you like to proceed with {site?.maxTables || 0} tables?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleTableLimitCancel}
              className="flex-1 sm:flex-none"
            >
              No
            </Button>
            <Button
              onClick={handleTableLimitConfirm}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? "Processing..." : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Centre Equipment Availability Dialog */}
      <Dialog open={showCentreEquipmentDialog} onOpenChange={setShowCentreEquipmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Limited Equipment Available
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {centreEquipmentMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCentreEquipmentCancel}
              className="flex-1 sm:flex-none"
            >
              No - Return to search
            </Button>
            <Button
              onClick={handleCentreEquipmentConfirm}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? "Processing..." : "Yes - Proceed with my own tables"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Not Permitted Dialog */}
      <Dialog open={showUsageNotPermittedDialog} onOpenChange={setShowUsageNotPermittedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Usage Not Permitted
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Sorry but your selected location does not accept the requested usage and your booking is unlikely to be approved.
              <br /><br />
              Would you still like to put in the booking request or choose another site or centre?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleUsageNotPermittedFindAnother}
              className="flex-1 sm:flex-none"
            >
              Find a different location
            </Button>
            <Button
              onClick={handleUsageNotPermittedProceed}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? "Processing..." : "Proceed with request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Details Gate — shown on first booking if profile incomplete */}
      <BusinessDetailsGate
        open={showBusinessGate}
        onComplete={() => {
          setShowBusinessGate(false);
          refetchProfile();
          // Re-trigger booking after profile is saved
          handleBooking();
        }}
        onCancel={() => setShowBusinessGate(false)}
      />
    </div>
  );
}
