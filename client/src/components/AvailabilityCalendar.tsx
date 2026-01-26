import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, getDaysInMonth, getDay, isSameDay } from "date-fns";

interface Booking {
  startDate: Date | string;
  endDate: Date | string;
  companyName?: string | null;
  customerName?: string | null;
  shopNumber?: string | null;
  assetName?: string | null;
}

interface Asset {
  id: number;
  siteNumber?: string;
  shopNumber?: string;
  assetName?: string;
}

interface AvailabilityCalendarProps {
  title: string;
  titleColor?: string;
  description?: string;
  assets: Asset[];
  bookings: Booking[];
  getAssetBookings: (assetId: number) => Booking[];
  getAssetLabel: (asset: Asset) => string;
  getBookingTooltip: (booking: Booking) => { title: string; subtitle?: string };
  calendarMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
  onAssetClick?: (assetId: number) => void;
}

export function AvailabilityCalendar({
  title,
  titleColor = "text-blue-900",
  description,
  assets,
  bookings,
  getAssetBookings,
  getAssetLabel,
  getBookingTooltip,
  calendarMonth,
  onMonthChange,
  onAssetClick,
}: AvailabilityCalendarProps) {
  const monthStartDate = useMemo(
    () => new Date(calendarMonth.year, calendarMonth.month - 1, 1),
    [calendarMonth]
  );
  const daysInMonth = getDaysInMonth(monthStartDate);

  const handlePrevMonth = () => {
    const prev = new Date(calendarMonth.year, calendarMonth.month - 2, 1);
    onMonthChange({ year: prev.getFullYear(), month: prev.getMonth() + 1 });
  };

  const handleNextMonth = () => {
    const next = new Date(calendarMonth.year, calendarMonth.month, 1);
    onMonthChange({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  const isBookedOnDate = (assetId: number, date: Date): Booking | undefined => {
    const assetBookings = getAssetBookings(assetId);
    return assetBookings.find((b) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    });
  };

  if (assets.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-xl ${titleColor} flex items-center gap-2`}>
            <Calendar className="h-5 w-5" />
            {title} - {format(monthStartDate, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 min-w-max">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-semibold border-b-2 border-r-2 min-w-[100px]">
                  {assets[0]?.siteNumber !== undefined
                    ? "Site"
                    : assets[0]?.shopNumber !== undefined
                    ? "Shop"
                    : "Asset"}
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const date = new Date(calendarMonth.year, calendarMonth.month - 1, i + 1);
                  const dayOfWeek = getDay(date);
                  const isSaturday = dayOfWeek === 6;
                  const isSunday = dayOfWeek === 0;
                  const isWeekend = isSaturday || isSunday;
                  const isToday = isSameDay(date, new Date());
                  
                  // Check prev/next for weekend border continuity
                  const prevDayOfWeek = i > 0 ? getDay(new Date(calendarMonth.year, calendarMonth.month - 1, i)) : null;
                  const nextDayOfWeek = i < daysInMonth - 1 ? getDay(new Date(calendarMonth.year, calendarMonth.month - 1, i + 2)) : null;
                  const isPrevWeekend = prevDayOfWeek !== null && (prevDayOfWeek === 0 || prevDayOfWeek === 6);
                  const isNextWeekend = nextDayOfWeek !== null && (nextDayOfWeek === 0 || nextDayOfWeek === 6);

                  return (
                    <th
                      key={i}
                      className={`px-1 py-2 text-center text-xs font-medium min-w-[40px] border border-gray-200 ${
                        isWeekend ? "bg-gray-100" : ""
                      } ${
                        isWeekend ? "!border-t-[3px] !border-t-green-700 !border-solid" : ""
                      } ${
                        isWeekend && !isPrevWeekend ? "!border-l-[3px] !border-l-green-700 !border-solid" : ""
                      } ${
                        isWeekend && !isNextWeekend ? "!border-r-[3px] !border-r-green-700 !border-solid" : ""
                      } ${
                        isToday ? "bg-blue-50 !border-blue-500 !border-2" : ""
                      }`}
                    >
                      <div className={isWeekend ? "font-semibold" : ""}>{i + 1}</div>
                      <div className={`text-[10px] ${isWeekend ? "text-gray-700" : "text-gray-500"}`}>
                        {format(date, "EEE")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, assetIdx) => {
                const isLastRow = assetIdx === assets.length - 1;
                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2 font-medium border-r-2 border-b">
                      {onAssetClick ? (
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-600 hover:text-blue-800"
                          onClick={() => onAssetClick(asset.id)}
                        >
                          {getAssetLabel(asset)}
                        </Button>
                      ) : (
                        <span className="text-blue-600">{getAssetLabel(asset)}</span>
                      )}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const date = new Date(calendarMonth.year, calendarMonth.month - 1, i + 1);
                      const dayOfWeek = getDay(date);
                      const isSaturday = dayOfWeek === 6;
                      const isSunday = dayOfWeek === 0;
                      const isWeekend = isSaturday || isSunday;
                      const booking = isBookedOnDate(asset.id, date);
                      const isBooked = !!booking;

                      // Check prev/next for weekend border continuity
                      const prevDayOfWeek = i > 0 ? getDay(new Date(calendarMonth.year, calendarMonth.month - 1, i)) : null;
                      const nextDayOfWeek = i < daysInMonth - 1 ? getDay(new Date(calendarMonth.year, calendarMonth.month - 1, i + 2)) : null;
                      const isPrevWeekend = prevDayOfWeek !== null && (prevDayOfWeek === 0 || prevDayOfWeek === 6);
                      const isNextWeekend = nextDayOfWeek !== null && (nextDayOfWeek === 0 || nextDayOfWeek === 6);

                      return (
                        <TooltipProvider key={i}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <td
                                className={`p-0 border border-gray-200 border-solid ${
                                  isWeekend ? "bg-gray-50" : ""
                                } ${
                                  isWeekend && !isPrevWeekend ? "!border-l-[3px] !border-l-green-700 !border-solid" : ""
                                } ${
                                  isWeekend && !isNextWeekend ? "!border-r-[3px] !border-r-green-700 !border-solid" : ""
                                } ${
                                  isWeekend && isLastRow ? "!border-b-[3px] !border-b-green-700 !border-solid" : ""
                                }`}
                              >
                                <div
                                  className={`h-10 w-full flex items-center justify-center cursor-pointer transition-colors ${
                                    isBooked
                                      ? "bg-red-500 hover:bg-red-600"
                                      : "bg-green-500 hover:bg-green-600"
                                  }`}
                                  title={`${getAssetLabel(asset)} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? "Booked" : "Available"}`}
                                />
                              </td>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isBooked && booking ? (
                                <div className="text-sm">
                                  <p className="font-semibold">{getBookingTooltip(booking).title}</p>
                                  {getBookingTooltip(booking).subtitle && (
                                    <p className="text-xs text-gray-500">{getBookingTooltip(booking).subtitle}</p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(booking.startDate), "dd/MM")} -{" "}
                                    {format(new Date(booking.endDate), "dd/MM")}
                                  </p>
                                </div>
                              ) : (
                                <p>Available</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-green-500 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-red-500 rounded" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-gray-100 border-2 border-green-700 rounded" />
            <span>Weekend</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
