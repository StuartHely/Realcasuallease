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
  const { data: preview, isLoading } = trpc.bookings.calculatePreview.useQuery(
    { siteId, startDate, endDate },
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

  const hasSeasonalRates = preview.seasonalDays && preview.seasonalDays.length > 0;
  const totalDays = preview.weekdayCount + preview.weekendCount;
  const seasonalDaysCount = preview.seasonalDays?.length || 0;
  const baseDaysCount = totalDays - seasonalDaysCount;

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
        </div>
        
        {/* Summary */}
        <div className="bg-white/60 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Booking Duration: {totalDays} day{totalDays > 1 ? 's' : ''}</span>
          </div>
          {hasSeasonalRates && (
            <div className="text-xs text-blue-600 ml-6">
              {seasonalDaysCount} day{seasonalDaysCount > 1 ? 's' : ''} with seasonal pricing, {baseDaysCount} day{baseDaysCount > 1 ? 's' : ''} at base rate
            </div>
          )}
        </div>

        {/* Base Rate Days */}
        {!hasSeasonalRates && (
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
                          {isWeekend ? 'Weekend' : 'Weekday'}
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
            <span className="text-gray-600">GST (10%)</span>
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
