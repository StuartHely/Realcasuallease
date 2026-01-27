import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Calendar, ChevronLeft, ChevronRight, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PriceCalculator } from "@/components/PriceCalculator";

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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usageCategoryId, setUsageCategoryId] = useState<string>("");
  const [additionalCategoryText, setAdditionalCategoryText] = useState("");
  const [customUsage, setCustomUsage] = useState("");
  const [tablesRequested, setTablesRequested] = useState<string>("0");
  const [chairsRequested, setChairsRequested] = useState<string>("0");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showTableLimitDialog, setShowTableLimitDialog] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<{
    siteId: number;
    startDate: Date;
    endDate: Date;
    usageCategoryId: number;
    additionalCategoryText?: string;
    tablesRequested: number;
    chairsRequested: number;
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

  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: (data) => {
      const { costBreakdown, equipmentWarning, paymentMethod } = data;
      const breakdownMessage = `\n\nCost Breakdown:\n${costBreakdown.weekdayCount} weekdays @ $${costBreakdown.weekdayRate}/day${costBreakdown.weekendCount > 0 ? `\n${costBreakdown.weekendCount} weekend days @ $${costBreakdown.weekendRate}/day` : ''}\nSubtotal: $${costBreakdown.subtotal.toFixed(2)}\nGST: $${costBreakdown.gstAmount.toFixed(2)}\nTotal: $${costBreakdown.total.toFixed(2)}`;
      
      const equipmentMessage = equipmentWarning ? `\n\n⚠️ ${equipmentWarning}` : '';
      
      // Different messages for invoice vs Stripe bookings
      let successMessage: string;
      
      if (paymentMethod === 'invoice') {
        // Invoice booking messages
        if (data.requiresApproval) {
          successMessage = "Booking request submitted! You should be advised if your request has been approved within 3 days." + breakdownMessage + equipmentMessage;
        } else {
          successMessage = "Booking confirmed! Booking number: " + data.bookingNumber + "\n\nAn invoice will be sent to your email shortly." + breakdownMessage + equipmentMessage;
        }
      } else {
        // Stripe booking messages (existing logic)
        successMessage = data.requiresApproval
          ? "Booking request submitted! Awaiting approval." + breakdownMessage + equipmentMessage
          : "Booking confirmed! Booking number: " + data.bookingNumber + breakdownMessage + equipmentMessage;
      }
      
      toast.success(successMessage);
      setLocation("/my-bookings");
    },
    onError: (error) => {
      toast.error("Booking failed: " + error.message);
    },
  });

  const handleBooking = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
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

    const requestedTables = parseInt(tablesRequested) || 0;
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
        chairsRequested: parseInt(chairsRequested) || 0,
      });
      setShowTableLimitDialog(true);
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
      chairsRequested: parseInt(chairsRequested) || 0,
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
      setLocation(`/centre/${site.centreId}?date=${startDate}`);
    }
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
              <img src="/logo.png" alt="Real Casual Leasing" className="h-12" />
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")}>Home</Button>
            <Button variant="ghost" onClick={() => setLocation("/my-bookings")}>My Bookings</Button>
            <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
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
                  className="relative h-96 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
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
                <CardTitle className="text-2xl">Site {site.siteNumber}</CardTitle>
                <CardDescription>{centre?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{site.description}</p>
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
                      <p className="text-2xl font-bold text-blue-600">${site.pricePerDay}/day</p>
                    </div>
                    {site.weekendPricePerDay && site.weekendPricePerDay !== site.pricePerDay && (
                      <div>
                        <p className="text-sm text-gray-600">Weekend (Sat-Sun)</p>
                        <p className="text-2xl font-bold text-purple-600">${site.weekendPricePerDay}/day</p>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-600">Weekly Rate</p>
                      <p className="text-lg font-semibold text-gray-700">${site.pricePerWeek}/week</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
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
                  <Button
                    onClick={() => (window.location.href = getLoginUrl())}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Log In to Book
                  </Button>
                )}

                {isAuthenticated && (
                  <>
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
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

                    {/* Equipment Request */}
                    {centre && ((centre.totalTablesAvailable || 0) > 0 || (centre.totalChairsAvailable || 0) > 0) && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h3 className="font-semibold text-sm">Equipment Request (Optional)</h3>
                        
                        {(centre.totalTablesAvailable || 0) > 0 && (
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
                            />
                          </div>
                        )}
                        
                        {(centre.totalChairsAvailable || 0) > 0 && (
                          <div>
                            <Label htmlFor="chairsRequested">Chairs Required</Label>
                            <Input
                              id="chairsRequested"
                              type="number"
                              min="0"
                              value={chairsRequested}
                              onChange={(e) => setChairsRequested(e.target.value)}
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

                    <Button
                      onClick={handleBooking}
                      disabled={createBookingMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {createBookingMutation.isPending ? "Processing..." : "Confirm Booking"}
                    </Button>
                  </>
                )}
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
    </div>
  );
}
