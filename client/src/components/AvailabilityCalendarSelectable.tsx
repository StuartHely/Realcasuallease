import { useState, useMemo } from "react";
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
  pricePerDay?: number | string | null;
  pricePerWeek?: number | string | null;
  weekendRate?: number | string | null;
  weekendPricePerDay?: number | string | null;
  size?: string | null;
  maxTables?: number | null;
  description?: string | null;
}

interface DateSelection {
  assetId: number;
  startDate: Date | null;
  endDate: Date | null;
}

interface AvailabilityCalendarSelectableProps {
  title: string;
  titleColor?: string;
  accentColor?: 'blue' | 'green' | 'purple';
  description?: string;
  assets: Asset[];
  bookings: Booking[];
  getAssetBookings: (assetId: number) => Booking[];
  getAssetLabel: (asset: Asset) => string;
  getBookingTooltip: (booking: Booking) => { title: string; subtitle?: string };
  calendarMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
  onAssetClick?: (assetId: number) => void;
  onDateSelect?: (assetId: number, startDate: Date, endDate: Date) => void;
  enableDateSelection?: boolean;
  assetType?: 'casual_leasing' | 'vacant_shop' | 'third_line';
}

export function AvailabilityCalendarSelectable({
  title,
  titleColor = "text-blue-900",
  accentColor = "blue",
  description,
  assets,
  bookings,
  getAssetBookings,
  getAssetLabel,
  getBookingTooltip,
  calendarMonth,
  onMonthChange,
  onAssetClick,
  onDateSelect,
  enableDateSelection = false,
  assetType = "casual_leasing",
}: AvailabilityCalendarSelectableProps) {
  // Color classes based on accent color
  const colorClasses = {
    blue: {
      selected: 'bg-blue-500 hover:bg-blue-600',
      border: 'border-blue-300 ring-blue-200',
      text: 'text-blue-800',
      bg: 'bg-blue-50',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    green: {
      selected: 'bg-green-500 hover:bg-green-600',
      border: 'border-green-300 ring-green-200',
      text: 'text-green-800',
      bg: 'bg-green-50',
      button: 'bg-green-600 hover:bg-green-700',
    },
    purple: {
      selected: 'bg-purple-500 hover:bg-purple-600',
      border: 'border-purple-300 ring-purple-200',
      text: 'text-purple-800',
      bg: 'bg-purple-50',
      button: 'bg-purple-600 hover:bg-purple-700',
    },
  };
  const colors = colorClasses[accentColor];
  const [dateSelection, setDateSelection] = useState<DateSelection | null>(null);
  
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

  const handleCellClick = (assetId: number, date: Date) => {
    if (!enableDateSelection) {
      // If date selection is disabled, just navigate to asset
      if (onAssetClick) {
        onAssetClick(assetId);
      }
      return;
    }

    // Check if date is booked
    if (isBookedOnDate(assetId, date)) {
      return; // Can't select booked dates
    }

    if (!dateSelection || dateSelection.assetId !== assetId) {
      // Start new selection for this asset
      setDateSelection({
        assetId,
        startDate: date,
        endDate: null,
      });
    } else if (dateSelection.startDate && !dateSelection.endDate) {
      // Complete the selection
      const start = dateSelection.startDate;
      const end = date;
      
      // Ensure start is before end
      const finalStart = start <= end ? start : end;
      const finalEnd = start <= end ? end : start;
      
      // Check if any date in range is booked
      let hasBookedDate = false;
      const current = new Date(finalStart);
      while (current <= finalEnd) {
        if (isBookedOnDate(assetId, current)) {
          hasBookedDate = true;
          break;
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (hasBookedDate) {
        // Reset selection if range contains booked dates
        setDateSelection({
          assetId,
          startDate: date,
          endDate: null,
        });
        return;
      }
      
      setDateSelection({
        assetId,
        startDate: finalStart,
        endDate: finalEnd,
      });
      
      // Trigger callback
      if (onDateSelect) {
        onDateSelect(assetId, finalStart, finalEnd);
      }
    } else {
      // Reset and start new selection
      setDateSelection({
        assetId,
        startDate: date,
        endDate: null,
      });
    }
  };

  const isDateSelected = (assetId: number, date: Date): 'start' | 'end' | 'range' | null => {
    if (!dateSelection || dateSelection.assetId !== assetId) return null;
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (dateSelection.startDate) {
      const start = new Date(dateSelection.startDate);
      start.setHours(0, 0, 0, 0);
      
      if (isSameDay(checkDate, start)) return 'start';
      
      if (dateSelection.endDate) {
        const end = new Date(dateSelection.endDate);
        end.setHours(0, 0, 0, 0);
        
        if (isSameDay(checkDate, end)) return 'end';
        if (checkDate > start && checkDate < end) return 'range';
      }
    }
    
    return null;
  };

  const getSelectedAsset = () => {
    if (!dateSelection) return null;
    return assets.find(a => a.id === dateSelection.assetId);
  };

  const calculateEstimate = () => {
    if (!dateSelection?.startDate || !dateSelection?.endDate) return null;
    
    const asset = getSelectedAsset();
    if (!asset) return null;
    
    const start = dateSelection.startDate;
    const end = dateSelection.endDate;
    let weekdays = 0;
    let weekends = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const day = current.getDay();
      if (day === 0 || day === 6) {
        weekends++;
      } else {
        weekdays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    const weekdayRate = Number(asset.pricePerDay) || 0;
    const weekendRate = Number(asset.weekendRate || asset.weekendPricePerDay) || weekdayRate;
    const weeklyRate = Number(asset.pricePerWeek) || 0;
    const totalDays = weekdays + weekends;

    let subtotal: number;
    let weeksApplied = 0;
    let weeklyRateApplied = false;

    if (weeklyRate > 0 && totalDays >= 7) {
      weeksApplied = Math.floor(totalDays / 7);
      const remainderDays = totalDays - weeksApplied * 7;
      // Remainder days priced at simple daily average (exact split requires server-side calc)
      const avgDailyRate = totalDays > 0 ? ((weekdays * weekdayRate) + (weekends * weekendRate)) / totalDays : weekdayRate;
      subtotal = (weeksApplied * weeklyRate) + (remainderDays * avgDailyRate);
      weeklyRateApplied = true;
    } else {
      subtotal = (weekdays * weekdayRate) + (weekends * weekendRate);
    }

    const gst = subtotal * 0.1;
    const total = subtotal + gst;
    
    return {
      weekdays,
      weekends,
      totalDays,
      weekdayRate,
      weekendRate,
      weeklyRate,
      weeksApplied,
      weeklyRateApplied,
      subtotal,
      gst,
      total,
    };
  };

  if (assets.length === 0) {
    return null;
  }

  const selectedAsset = getSelectedAsset();
  const estimate = calculateEstimate();

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
        {enableDateSelection && (
          <p className="text-sm text-blue-600 mt-2">
            Click on a green cell to select start date, then click another cell to select end date
          </p>
        )}
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
                  
                  const isWeekBoundaryLeft = dayOfWeek === 1 || i === 0;
                  const isWeekBoundaryRight = dayOfWeek === 0 || i === daysInMonth - 1;

                  return (
                    <th
                      key={i}
                      className={`px-1 py-2 text-center text-xs font-medium min-w-[40px] border border-gray-200 ${
                        isWeekend ? "bg-gray-100" : ""
                      } ${
                        "!border-t-[3px] !border-t-green-700 !border-solid"
                      } ${
                        isWeekBoundaryLeft ? "!border-l-[3px] !border-l-green-700 !border-solid" : ""
                      } ${
                        isWeekBoundaryRight ? "!border-r-[3px] !border-r-green-700 !border-solid" : ""
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
                      <div className="flex flex-col gap-0.5">
                        {onAssetClick ? (
                          <Button
                            variant="link"
                            className={`p-0 h-auto justify-start ${accentColor === 'green' ? 'text-green-600 hover:text-green-800' : accentColor === 'purple' ? 'text-purple-600 hover:text-purple-800' : 'text-blue-600 hover:text-blue-800'}`}
                            onClick={() => onAssetClick(asset.id)}
                          >
                            {getAssetLabel(asset)}
                          </Button>
                        ) : (
                          <span className={accentColor === 'green' ? 'text-green-600' : accentColor === 'purple' ? 'text-purple-600' : 'text-blue-600'}>{getAssetLabel(asset)}</span>
                        )}
                        {(asset.size || asset.maxTables) && (
                          <div className="flex gap-2 text-xs text-gray-600">
                            {asset.size && <span>{asset.size}</span>}
                            {asset.maxTables && <span>• {asset.maxTables} tables</span>}
                          </div>
                        )}
                        {asset.description && (
                          <span className="text-xs text-gray-500 truncate max-w-[160px]" title={asset.description}>
                            {asset.description.replace(/<[^>]*>/g, '').slice(0, 25)}
                          </span>
                        )}
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const date = new Date(calendarMonth.year, calendarMonth.month - 1, i + 1);
                      const dayOfWeek = getDay(date);
                      const isSaturday = dayOfWeek === 6;
                      const isSunday = dayOfWeek === 0;
                      const isWeekend = isSaturday || isSunday;
                      const booking = isBookedOnDate(asset.id, date);
                      const isBooked = !!booking;
                      const selectionState = isDateSelected(asset.id, date);

                      const isWeekBoundaryLeft = dayOfWeek === 1 || i === 0;
                      const isWeekBoundaryRight = dayOfWeek === 0 || i === daysInMonth - 1;

                      return (
                        <TooltipProvider key={i}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <td
                                className={`p-0 border border-gray-200 border-solid ${
                                  isWeekend ? "bg-gray-50" : ""
                                } ${
                                  isWeekBoundaryLeft ? "!border-l-[3px] !border-l-green-700 !border-solid" : ""
                                } ${
                                  isWeekBoundaryRight ? "!border-r-[3px] !border-r-green-700 !border-solid" : ""
                                } ${
                                  isLastRow ? "!border-b-[3px] !border-b-green-700 !border-solid" : ""
                                }`}
                                onClick={() => handleCellClick(asset.id, date)}
                              >
                                <div
                                  className={`h-10 w-full flex items-center justify-center cursor-pointer transition-colors relative ${
                                    isBooked
                                      ? "bg-red-500 hover:bg-red-600 cursor-not-allowed"
                                      : selectionState
                                      ? colors.selected
                                      : "bg-green-500 hover:bg-green-600"
                                  }`}
                                  title={(() => {
                                    const weekendRateVal = Number(asset.weekendRate || asset.weekendPricePerDay) || 0;
                                    const weekdayRateVal = Number(asset.pricePerDay) || 0;
                                    const dayRate = isWeekend && weekendRateVal ? weekendRateVal : weekdayRateVal;
                                    const weeklyRateVal = Number(asset.pricePerWeek) || 0;
                                    const rateStr = dayRate > 0 ? ` - $${dayRate.toFixed(2)}/day` : '';
                                    const weeklyStr = weeklyRateVal > 0 ? ` | $${weeklyRateVal.toFixed(2)}/week` : '';
                                    return `${getAssetLabel(asset)} - ${format(date, "dd/MM/yyyy")} - ${isBooked ? "Booked" : "Available"}${rateStr}${weeklyStr}`;
                                  })()}
                                >
                                  {selectionState === 'start' && (
                                    <span className="text-white text-[10px] font-bold">START</span>
                                  )}
                                  {selectionState === 'end' && (
                                    <span className="text-white text-[10px] font-bold">END</span>
                                  )}
                                </div>
                              </td>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isBooked && booking ? (
                                <div className="text-sm">
                                  <p className="font-semibold">{getBookingTooltip(booking).title}</p>
                                  {getBookingTooltip(booking).subtitle && (
                                    <p className="text-xs text-white/80">{getBookingTooltip(booking).subtitle}</p>
                                  )}
                                  <p className="text-xs text-white/80">
                                    {format(new Date(booking.startDate), "dd/MM")} -{" "}
                                    {format(new Date(booking.endDate), "dd/MM")}
                                  </p>
                                </div>
                              ) : selectionState ? (
                                <p>{selectionState === 'start' ? 'Start Date' : selectionState === 'end' ? 'End Date' : 'Selected'}</p>
                              ) : (
                                <div className="text-sm">
                                  <p className="font-semibold">{format(date, "EEE dd MMM")}</p>
                                  {(() => {
                                    const weekendRateVal = Number(asset.weekendRate || asset.weekendPricePerDay) || 0;
                                    const weekdayRateVal = Number(asset.pricePerDay) || 0;
                                    const dayRate = isWeekend && weekendRateVal ? weekendRateVal : weekdayRateVal;
                                    const weeklyRateVal = Number(asset.pricePerWeek) || 0;
                                    return (
                                      <>
                                        {dayRate > 0 && (
                                          <p className="text-xs text-white">
                                            {isWeekend ? "Weekend" : "Weekday"} rate: ${dayRate.toFixed(2)}/day
                                          </p>
                                        )}
                                        {weeklyRateVal > 0 && (
                                          <p className="text-xs text-white">
                                            Weekly rate: ${weeklyRateVal.toFixed(2)}/week
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                  <p className="text-xs text-green-300 mt-1">Click to select</p>
                                </div>
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
        <div className="mt-4 flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-green-500 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-red-500 rounded" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-4 rounded ${colors.selected.split(' ')[0]}`} />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-gray-100 border-2 border-green-700 rounded" />
            <span>Week</span>
          </div>
        </div>

        {/* Booking Summary Panel */}
        {enableDateSelection && dateSelection?.startDate && dateSelection?.endDate && selectedAsset && estimate && (
          <div className={`mt-6 p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
            <h4 className={`text-lg font-semibold ${colors.text} mb-4 flex items-center gap-2`}>
              <Calendar className="h-5 w-5" />
              Booking Summary
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p><span className="text-gray-600 font-medium">{assetType === 'casual_leasing' ? 'Site' : assetType === 'vacant_shop' ? 'Shop' : 'Asset'}:</span> {getAssetLabel(selectedAsset)}</p>
                <p><span className="text-gray-600 font-medium">Start Date:</span> {format(dateSelection.startDate, 'EEEE, d MMMM yyyy')}</p>
                <p><span className="text-gray-600 font-medium">End Date:</span> {format(dateSelection.endDate, 'EEEE, d MMMM yyyy')}</p>
                <p><span className="text-gray-600 font-medium">Duration:</span> {estimate.totalDays} day{estimate.totalDays > 1 ? 's' : ''}</p>
              </div>
              <div className="space-y-2 text-sm">
                {estimate.weeklyRateApplied ? (
                  <>
                    <p><span className="text-gray-600">Weekly Rate:</span> {estimate.weeksApplied} week{estimate.weeksApplied > 1 ? 's' : ''} × ${estimate.weeklyRate.toFixed(2)} = ${(estimate.weeksApplied * estimate.weeklyRate).toFixed(2)}</p>
                    {estimate.totalDays - estimate.weeksApplied * 7 > 0 && (
                      <p><span className="text-gray-600">Remaining Days:</span> {estimate.totalDays - estimate.weeksApplied * 7} day{estimate.totalDays - estimate.weeksApplied * 7 > 1 ? 's' : ''} at daily rate</p>
                    )}
                  </>
                ) : (
                  <>
                    {estimate.weekdays > 0 && (
                      <p><span className="text-gray-600">Weekdays:</span> {estimate.weekdays} × ${estimate.weekdayRate.toFixed(2)} = ${(estimate.weekdays * estimate.weekdayRate).toFixed(2)}</p>
                    )}
                    {estimate.weekends > 0 && (
                      <p><span className="text-gray-600">Weekends:</span> {estimate.weekends} × ${estimate.weekendRate.toFixed(2)} = ${(estimate.weekends * estimate.weekendRate).toFixed(2)}</p>
                    )}
                  </>
                )}
                <div className={`border-t pt-2 mt-2 ${colors.border}`}>
                  <p><span className="text-gray-600">Subtotal:</span> ${estimate.subtotal.toFixed(2)}</p>
                  <p><span className="text-gray-600">GST (10%):</span> ${estimate.gst.toFixed(2)}</p>
                  <p className={`font-semibold text-base ${colors.text}`}><span className="text-gray-700">Total:</span> ${estimate.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => {
                  if (dateSelection.startDate && dateSelection.endDate) {
                    // Navigate to asset detail with dates based on asset type
                    const params = new URLSearchParams();
                    params.set('startDate', format(dateSelection.startDate, 'yyyy-MM-dd'));
                    params.set('endDate', format(dateSelection.endDate, 'yyyy-MM-dd'));
                    const path = assetType === 'vacant_shop' ? `/vacant-shop/${selectedAsset.id}` 
                      : assetType === 'third_line' ? `/third-line/${selectedAsset.id}` 
                      : `/site/${selectedAsset.id}`;
                    window.location.href = `${path}?${params.toString()}`;
                  }
                }}
                className={colors.button}
              >
                Proceed to Book
              </Button>
              <Button
                variant="outline"
                onClick={() => setDateSelection(null)}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
