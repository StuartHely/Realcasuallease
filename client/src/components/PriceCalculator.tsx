import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PriceCalculatorProps {
  siteId: number;
  startDate: Date;
  endDate: Date;
}

export function PriceCalculator({ siteId, startDate, endDate }: PriceCalculatorProps) {
  // Stabilise Date objects so tRPC query key doesn't change every render
  const stableStart = useMemo(() => startDate, [startDate.getTime()]);
  const stableEnd = useMemo(() => endDate, [endDate.getTime()]);
  const { data: preview, isLoading } = trpc.bookings.calculatePreview.useQuery(
    { siteId, startDate: stableStart, endDate: stableEnd },
    { enabled: siteId > 0 && !!startDate && !!endDate }
  );

  if (isLoading) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Calculating price...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const hasSeasonalRates = preview.seasonalDays?.some((d: any) => d.isSeasonalRate) || false;
  const totalDays = preview.weekdayCount + preview.weekendCount;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900">Price Breakdown</h3>
          {hasSeasonalRates && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
              <TrendingUp className="h-3 w-3 mr-1" />
              Seasonal Pricing
            </Badge>
          )}
          {preview.weeklyRateApplied && !hasSeasonalRates && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
              Weekly Rate Applied
            </Badge>
          )}
        </div>
        
        {/* Summary */}
        <div className="bg-white/60 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Booking Duration: {totalDays} day{totalDays > 1 ? 's' : ''}</span>
          </div>
          {hasSeasonalRates && (
            <div className="text-xs text-blue-600 ml-6">
              Includes seasonal pricing adjustments
            </div>
          )}
        </div>

        {/* Weekly Rate Breakdown (non-seasonal) */}
        {preview.weeklyRateApplied && !hasSeasonalRates && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {preview.weeksApplied} week{preview.weeksApplied > 1 ? 's' : ''} @ ${preview.weeklyRate?.toFixed(2)}/week
              </span>
              <span className="font-medium text-green-700">
                ${(preview.weeksApplied * (preview.weeklyRate || 0)).toFixed(2)}
              </span>
            </div>
            {preview.remainderDays > 0 && (
              <>
                {/* Show remainder days at daily rates */}
                {preview.seasonalDays?.slice(preview.weeksApplied * 7).map((day: any, idx: number) => {
                  const date = new Date(day.date);
                  return (
                    <div key={idx} className="flex justify-between text-xs ml-2">
                      <span className="text-gray-500">
                        {date.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' '}— {day.name}
                      </span>
                      <span className="font-medium">${day.rate.toFixed(2)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Base Rate Days (no weekly rate, no seasonal) */}
        {!preview.weeklyRateApplied && !hasSeasonalRates && (
          <div className="space-y-2 text-sm">
            {preview.weekdayCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {preview.weekdayCount} weekday{preview.weekdayCount > 1 ? 's' : ''} @ ${preview.weekdayRate}/day
                </span>
                <span className="font-medium">${(preview.weekdayCount * preview.weekdayRate).toFixed(2)}</span>
              </div>
            )}
            
            {preview.weekendCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {preview.weekendCount} weekend day{preview.weekendCount > 1 ? 's' : ''} @ ${preview.weekendRate}/day
                </span>
                <span className="font-medium text-purple-600">${(preview.weekendCount * preview.weekendRate).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Detailed Day-by-Day Breakdown with Seasonal Rates */}
        {hasSeasonalRates && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Day-by-Day Breakdown
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
              {preview.seasonalDays.map((day: any, idx: number) => {
                const date = new Date(day.date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 w-20">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-gray-500">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      {day.isSeasonalRate ? (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                          {day.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {day.name.includes('Weekly') ? day.name : (isWeekend ? 'Weekend' : 'Weekday')}
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${day.isSeasonalRate ? 'text-blue-600' : 'text-gray-700'}`}>
                      ${day.rate.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Seasonal Rate Summary */}
            <div className="bg-blue-50 rounded-lg p-3 space-y-1">
              <div className="text-xs font-semibold text-blue-800 mb-2">Seasonal Rate Summary</div>
              {Object.entries(
                preview.seasonalDays
                  .filter((day: any) => day.isSeasonalRate)
                  .reduce((acc: any, day: any) => {
                    if (!acc[day.name]) {
                      acc[day.name] = { count: 0, rate: day.rate, total: 0 };
                    }
                    acc[day.name].count++;
                    acc[day.name].total += day.rate;
                    return acc;
                  }, {})
              ).map(([name, data]: [string, any]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="text-blue-700">
                    {name} ({data.count} day{data.count > 1 ? 's' : ''} @ ${data.rate.toFixed(2)}/day)
                  </span>
                  <span className="font-semibold text-blue-800">${data.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Calculation */}
        <div className="pt-3 border-t border-blue-300 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Rent Subtotal</span>
            <span className="font-medium">${preview.subtotal.toFixed(2)}</span>
          </div>
          {preview.outgoingsPerDay > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Outgoings ({totalDays} day{totalDays > 1 ? 's' : ''} @ ${preview.outgoingsPerDay.toFixed(2)}/day)
              </span>
              <span className="font-medium">${preview.totalOutgoings.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST ({preview.gstPercentage}%)</span>
            <span className="font-medium">${preview.gstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-300">
            <span className="text-gray-900">Total</span>
            <span className="text-blue-600">${preview.total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
