import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Calendar, ChevronLeft, ChevronRight, X, Store } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";


export default function VacantShopDetail() {
  const [, params] = useRoute("/vacant-shop/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [bookedDates, setBookedDates] = useState<{ startDate: Date; endDate: Date }[]>([]);
  
  const shopId = params?.id ? parseInt(params.id) : 0;
  
  const { data: shop, isLoading } = trpc.vacantShops.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );
  const { data: centre } = trpc.centres.getById.useQuery(
    { id: shop?.centreId || 0 },
    { enabled: !!shop?.centreId }
  );
  
  // Fetch booked dates for this shop
  const { data: bookings } = trpc.vacantShopBookings.getByShop.useQuery(
    { vacantShopId: shopId },
    { enabled: shopId > 0 }
  );
  
  useEffect(() => {
    if (bookings) {
      const booked = bookings
        .filter((b: any) => b.status === 'confirmed' || b.status === 'pending')
        .map((b: any) => ({
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate)
        }));
      setBookedDates(booked);
    }
  }, [bookings]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Check if a date is booked
  const isDateBooked = (date: Date): boolean => {
    return bookedDates.some(booking => {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const bookStart = new Date(booking.startDate);
      bookStart.setHours(0, 0, 0, 0);
      const bookEnd = new Date(booking.endDate);
      bookEnd.setHours(0, 0, 0, 0);
      return checkDate >= bookStart && checkDate <= bookEnd;
    });
  };
  


  // Get all available images
  const images = [
    shop?.imageUrl1,
    shop?.imageUrl2,
  ].filter(Boolean) as string[];

  const createEnquiryMutation = trpc.vacantShopBookings.create.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Enquiry submitted! Booking number: ${data.bookingNumber}`);
      setStartDate("");
      setEndDate("");
      setEnquiryMessage("");
      setLocation("/my-bookings");
    },
    onError: (error: any) => {
      toast.error("Enquiry failed: " + error.message);
    },
  });

  const handleEnquiry = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (!shop) return;
    
    // For now, create a basic booking with placeholder pricing
    // In a real scenario, you'd calculate these based on shop pricing
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeklyRate = shop.pricePerWeek ? parseFloat(shop.pricePerWeek.toString()) : 0;
    const totalAmount = (weeklyRate * days / 7).toFixed(2);
    const gstAmount = (parseFloat(totalAmount) * 0.1).toFixed(2);
    
    createEnquiryMutation.mutate({
      vacantShopId: shopId,
      startDate: start,
      endDate: end,
      totalAmount,
      gstAmount,
      gstPercentage: "10",
      ownerAmount: totalAmount,
      platformFee: "0",
      customerNotes: enquiryMessage || undefined,
      paymentMethod: "invoice",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading shop details...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Shop not found</p>
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
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Real Casual Leasing</h1>
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
        {/* Shop Image Gallery Carousel */}
        {images.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="relative">
                {/* Main Image */}
                <div 
                  className="relative h-96 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img
                    src={images[currentImageIndex]}
                    alt={`Shop ${shop.shopNumber} - Image ${currentImageIndex + 1}`}
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
                          idx === currentImageIndex ? 'border-green-600' : 'border-gray-300 opacity-60 hover:opacity-100'
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
                alt={`Shop ${shop.shopNumber} - Image ${currentImageIndex + 1}`}
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
          {/* Shop Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Store className="h-6 w-6 text-green-600" />
                  Shop {shop.shopNumber}
                </CardTitle>
                <CardDescription>{centre?.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shop.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-600">{shop.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {shop.totalSizeM2 && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-500">Size</h4>
                      <p>{shop.totalSizeM2}m²</p>
                    </div>
                  )}
                  {shop.dimensions && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-500">Dimensions</h4>
                      <p>{shop.dimensions}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Powered</h4>
                    <p>{shop.powered ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Pricing</h3>
                  <div className="space-y-2">
                    {shop.pricePerWeek && (
                      <div>
                        <p className="text-sm text-gray-600">Weekly Rate</p>
                        <p className="text-2xl font-bold text-green-600">${shop.pricePerWeek}/week</p>
                      </div>
                    )}
                    {shop.pricePerMonth && (
                      <div>
                        <p className="text-sm text-gray-600">Monthly Rate</p>
                        <p className="text-2xl font-bold text-green-600">${shop.pricePerMonth}/month</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enquiry Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Make an Enquiry
                </CardTitle>
                <CardDescription>
                  {isAuthenticated
                    ? "Fill in the details below to submit an enquiry"
                    : "Please log in to make an enquiry"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAuthenticated && (
                  <Button
                    onClick={() => (window.location.href = getLoginUrl())}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Log In to Enquire
                  </Button>
                )}

                {isAuthenticated && (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Availability Status</p>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span>Booked</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      {startDate && isDateBooked(new Date(startDate)) && (
                        <p className="text-xs text-red-600 mt-1">⚠️ This date is booked</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                      {endDate && isDateBooked(new Date(endDate)) && (
                        <p className="text-xs text-red-600 mt-1">⚠️ This date is booked</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="message">Additional Message (Optional)</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us about your business or any special requirements..."
                        value={enquiryMessage}
                        onChange={(e) => setEnquiryMessage(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={handleEnquiry}
                      disabled={createEnquiryMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {createEnquiryMutation.isPending ? "Submitting..." : "Submit Enquiry"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
