import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";

interface SeasonalRate {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  weekdayRate: string | null;
  weekendRate: string | null;
  weeklyRate: string | null;
}

interface SeasonalRateCalendarProps {
  seasonalRates: SeasonalRate[];
  month: Date;
  onMonthChange: (date: Date) => void;
  onEditRate: (rate: SeasonalRate) => void;
  onDeleteRate: (id: number) => void;
}

export function SeasonalRateCalendar({
  seasonalRates,
  month,
  onMonthChange,
  onEditRate,
  onDeleteRate,
}: SeasonalRateCalendarProps) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  
  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const getRatesForDate = (day: number) => {
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return seasonalRates.filter(rate => {
      return dateStr >= rate.startDate && dateStr <= rate.endDate;
    });
  };
  
  const prevMonth = () => {
    const newMonth = new Date(month);
    newMonth.setMonth(month.getMonth() - 1);
    onMonthChange(newMonth);
  };
  
  const nextMonth = () => {
    const newMonth = new Date(month);
    newMonth.setMonth(month.getMonth() + 1);
    onMonthChange(newMonth);
  };
  
  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-[100px]" />;
          }
          
          const rates = getRatesForDate(day);
          const isWeekend = index % 7 === 0 || index % 7 === 6;
          
          return (
            <div
              key={day}
              className={`min-h-[100px] border rounded-lg p-2 ${
                isWeekend ? 'bg-gray-50' : 'bg-white'
              } ${rates.length > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="text-sm font-semibold mb-1">{day}</div>
              {rates.length > 0 && (
                <div className="space-y-1">
                  {rates.map(rate => (
                    <div
                      key={rate.id}
                      className="text-xs bg-blue-100 border border-blue-200 rounded px-1 py-0.5"
                    >
                      <div className="font-medium truncate" title={rate.name}>
                        {rate.name}
                      </div>
                      <div className="text-blue-700">
                        {rate.weekdayRate && `$${rate.weekdayRate}`}
                        {rate.weekendRate && rate.weekdayRate !== rate.weekendRate && ` / $${rate.weekendRate}`}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => onEditRate(rate)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDeleteRate(rate.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-200 bg-white rounded"></div>
          <span>Weekday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-200 bg-gray-50 rounded"></div>
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-blue-300 bg-blue-50 rounded"></div>
          <span>Seasonal Rate Active</span>
        </div>
      </div>
    </div>
  );
}
