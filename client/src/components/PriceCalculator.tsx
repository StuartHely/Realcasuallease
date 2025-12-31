import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-semibold text-lg text-gray-900">Price Breakdown</h3>
        
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

          {hasSeasonalRates && (
            <div className="pt-2 border-t border-blue-200">
              <div className="text-xs font-semibold text-blue-700 mb-1">Seasonal Pricing Applied:</div>
              {preview.seasonalDays.map((day: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-blue-600">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {day.name}
                  </span>
                  <span className="font-medium text-blue-700">${day.rate}/day</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-blue-300 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${preview.subtotal.toFixed(2)}</span>
          </div>
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
