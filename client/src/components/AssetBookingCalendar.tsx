import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWithinInterval, addWeeks, subWeeks, startOfDay } from "date-fns";

interface Booking {
  id: number;
  startDate: Date;
  endDate: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "rejected";
}

interface AssetBookingCalendarProps {
  assetId: number;
  assetType: "vacant_shop" | "third_line";
  assetName: string;
  bookings: Booking[];
  onDateSelect?: (startDate: Date, endDate: Date) => void;
  isLoading?: boolean;
  pricePerWeek?: string | null;
  pricePerMonth?: string | null;
}

export function AssetBookingCalendar({
  assetId,
  assetType,
  assetName,
  bookings,
  onDateSelect,
  isLoading,
  pricePerWeek,
  pricePerMonth,
}: AssetBookingCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);

  // Generate days for current week view
  const weekDays = useMemo(() => {
    const start = currentWeekStart;
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeekStart]);

  // Check if a date is booked
  const isDateBooked = (date: Date) => {
    const dayStart = startOfDay(date);
    return bookings.some(booking => {
      if (booking.status === "cancelled" || booking.status === "rejected") return false;
      const bookingStart = startOfDay(new Date(booking.startDate));
      const bookingEnd = startOfDay(new Date(booking.endDate));
      return isWithinInterval(dayStart, { start: bookingStart, end: bookingEnd });
    });
  };

  // Check if a date is in the past
  const isDatePast = (date: Date) => {
    return startOfDay(date) < startOfDay(new Date());
  };

  // Get booking status for a date
  const getBookingStatus = (date: Date) => {
    const dayStart = startOfDay(date);
    const booking = bookings.find(b => {
      if (b.status === "cancelled" || b.status === "rejected") return false;
      const bookingStart = startOfDay(new Date(b.startDate));
      const bookingEnd = startOfDay(new Date(b.endDate));
      return isWithinInterval(dayStart, { start: bookingStart, end: bookingEnd });
    });
    return booking?.status;
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (isDateBooked(date) || isDatePast(date)) return;

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      setSelectedStartDate(date);
      setSelectedEndDate(null);
    } else {
      // Complete selection
      if (date < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(date);
      } else {
        setSelectedEndDate(date);
      }
    }
  };

  // Check if date is in selected range
  const isDateSelected = (date: Date) => {
    if (!selectedStartDate) return false;
    if (!selectedEndDate) return isSameDay(date, selectedStartDate);
    const dayStart = startOfDay(date);
    return isWithinInterval(dayStart, { 
      start: startOfDay(selectedStartDate), 
      end: startOfDay(selectedEndDate) 
    });
  };

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  // Get day cell class
  const getDayClass = (date: Date) => {
    const baseClass = "h-16 flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer";
    
    if (isDatePast(date)) {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }
    
    const bookingStatus = getBookingStatus(date);
    if (bookingStatus === "confirmed") {
      return `${baseClass} bg-red-100 text-red-700 cursor-not-allowed border-red-200`;
    }
    if (bookingStatus === "pending") {
      return `${baseClass} bg-yellow-100 text-yellow-700 cursor-not-allowed border-yellow-200`;
    }
    
    if (isDateSelected(date)) {
      const color = assetType === "vacant_shop" ? "green" : "purple";
      return `${baseClass} bg-${color}-500 text-white border-${color}-600`;
    }
    
    return `${baseClass} bg-white hover:bg-gray-50 border-gray-200`;
  };

  const colorClass = assetType === "vacant_shop" ? "green" : "purple";

  return (
    <Card className={`border-l-4 border-l-${colorClass}-500`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg text-${colorClass}-900 flex items-center gap-2`}>
            <Calendar className="h-5 w-5" />
            {assetName} - Availability
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek} className="text-xs">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev Week
            </Button>
            <span className="text-sm font-medium text-gray-600">
              {format(currentWeekStart, "MMM d")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
            </span>
            <Button variant="ghost" size="sm" onClick={goToNextWeek} className="text-xs">
              Next Week
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {/* Week calendar grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="text-center">
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={getDayClass(day)}
                    onClick={() => handleDateClick(day)}
                  >
                    <span className="text-sm font-semibold">{format(day, "d")}</span>
                    {getBookingStatus(day) === "confirmed" && (
                      <span className="text-xs">Booked</span>
                    )}
                    {getBookingStatus(day) === "pending" && (
                      <span className="text-xs">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs mb-4 border-t pt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-white border border-gray-200"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-100"></div>
                <span>Past</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded bg-${colorClass}-500`}></div>
                <span>Selected</span>
              </div>
            </div>

            {/* Selection summary and action */}
            {selectedStartDate && (
              <div className={`bg-${colorClass}-50 rounded-lg p-4 border border-${colorClass}-200`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium text-${colorClass}-900`}>
                      Selected Period
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4" />
                      {format(selectedStartDate, "EEE, MMM d, yyyy")}
                      {selectedEndDate && selectedEndDate !== selectedStartDate && (
                        <> - {format(selectedEndDate, "EEE, MMM d, yyyy")}</>
                      )}
                    </p>
                    {(pricePerWeek || pricePerMonth) && (
                      <div className="flex gap-4 mt-2 text-sm">
                        {pricePerWeek && (
                          <span className="text-gray-600">
                            Weekly: <span className="font-semibold">${Number(pricePerWeek).toFixed(2)}</span>
                          </span>
                        )}
                        {pricePerMonth && (
                          <span className="text-gray-600">
                            Monthly: <span className="font-semibold">${Number(pricePerMonth).toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStartDate(null);
                        setSelectedEndDate(null);
                      }}
                    >
                      Clear
                    </Button>
                    {selectedEndDate && onDateSelect && (
                      <Button
                        size="sm"
                        className={`bg-${colorClass}-600 hover:bg-${colorClass}-700`}
                        onClick={() => onDateSelect(selectedStartDate, selectedEndDate)}
                      >
                        Request Booking
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!selectedStartDate && (
              <p className="text-sm text-gray-500 text-center">
                Click on dates to select your booking period
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AssetBookingCalendar;
