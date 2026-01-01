/**
 * Calculate booking cost with support for different weekday and weekend rates
 * Priority: Seasonal rates > Weekend rates > Base rates
 */

import { getSeasonalRatesForDateRange } from './seasonalRatesDb';

interface Site {
  id: number;
  pricePerDay: string | number;
  pricePerWeek: string | number;
  weekendPricePerDay?: string | number | null;
}

interface SeasonalRate {
  id: number;
  siteId: number;
  name: string;
  startDate: string;
  endDate: string;
  weekdayRate: string | null;
  weekendRate: string | null;
  weeklyRate: string | null;
  createdAt: Date | null;
}

export async function calculateBookingCost(
  site: Site,
  startDate: Date,
  endDate: Date
): Promise<{ totalAmount: number; weekdayCount: number; weekendCount: number; seasonalDays?: { date: string; rate: number; name: string }[] }> {
  const basePricePerDay = Number(site.pricePerDay);
  const pricePerWeek = Number(site.pricePerWeek);
  const baseWeekendPricePerDay = site.weekendPricePerDay ? Number(site.weekendPricePerDay) : basePricePerDay;

  // Calculate total days (inclusive of both start and end dates)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Check if booking is 7+ days and if weekly rate should be used
  if (totalDays >= 7) {
    // Fetch seasonal rates to check for weekly rate
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const seasonalRatesInRange = await getSeasonalRatesForDateRange(site.id, startDateStr, endDateStr);
    
    // Check if there's a seasonal rate that covers the entire booking period with a weekly rate
    for (const rate of seasonalRatesInRange) {
      const rateStart = new Date(rate.startDate + 'T00:00:00Z');
      const rateEnd = new Date(rate.endDate + 'T00:00:00Z');
      
      // Check if this seasonal rate covers the entire booking period
      if (rateStart <= startDate && rateEnd >= endDate && rate.weeklyRate) {
        const weeklyRate = Number(rate.weeklyRate);
        const weeks = Math.floor(totalDays / 7);
        const remainingDays = totalDays % 7;
        
        // Calculate cost: full weeks at weekly rate + remaining days at daily rate
        let totalAmount = weeks * weeklyRate;
        
        // Add remaining days (use seasonal daily rates if available)
        if (remainingDays > 0) {
          const dailyRate = rate.weekdayRate ? Number(rate.weekdayRate) : basePricePerDay;
          totalAmount += remainingDays * dailyRate;
        }
        
        // Count weekdays/weekends for display
        let weekdayCount = 0;
        let weekendCount = 0;
        const tempDate = new Date(startDate);
        tempDate.setUTCHours(0, 0, 0, 0);
        const tempEndDate = new Date(endDate);
        tempEndDate.setUTCHours(0, 0, 0, 0);
        
        while (tempDate <= tempEndDate) {
          const dayOfWeek = tempDate.getUTCDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendCount++;
          } else {
            weekdayCount++;
          }
          tempDate.setUTCDate(tempDate.getUTCDate() + 1);
        }
        
        return {
          totalAmount,
          weekdayCount,
          weekendCount,
          seasonalDays: [{ date: startDateStr, rate: weeklyRate, name: `${rate.name} (Weekly Rate)` }],
        };
      }
    }
    
    // No seasonal weekly rate found, use base weekly rate if available
    if (pricePerWeek && pricePerWeek > 0) {
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      
      let totalAmount = weeks * pricePerWeek;
      
      // Add remaining days at base daily rate
      if (remainingDays > 0) {
        totalAmount += remainingDays * basePricePerDay;
      }
      
      // Count weekdays/weekends for display
      let weekdayCount = 0;
      let weekendCount = 0;
      const tempDate = new Date(startDate);
      tempDate.setUTCHours(0, 0, 0, 0);
      const tempEndDate = new Date(endDate);
      tempEndDate.setUTCHours(0, 0, 0, 0);
      
      while (tempDate <= tempEndDate) {
        const dayOfWeek = tempDate.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendCount++;
        } else {
          weekdayCount++;
        }
        tempDate.setUTCDate(tempDate.getUTCDate() + 1);
      }
      
      return {
        totalAmount,
        weekdayCount,
        weekendCount,
      };
    }
  }

  // Collect seasonal rates for each day
  const seasonalDays: { date: string; rate: number; name: string; isWeekend: boolean }[] = [];
  let weekdayCount = 0;
  let weekendCount = 0;

  const currentDate = new Date(startDate);
  currentDate.setUTCHours(0, 0, 0, 0); // Normalize to start of day in UTC
  
  const endDateNormalized = new Date(endDate);
  endDateNormalized.setUTCHours(0, 0, 0, 0);
  
  // Fetch all seasonal rates for the date range (single query)
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  const seasonalRatesInRange = await getSeasonalRatesForDateRange(site.id, startDateStr, endDateStr);
  
  // Build a map of dates to seasonal rates
  const dateToSeasonalRate = new Map<string, SeasonalRate>();
  
  // For each seasonal rate, mark all dates it covers
  for (const rate of seasonalRatesInRange) {
    // Parse dates as UTC to avoid timezone issues
    const rateStart = new Date(rate.startDate + 'T00:00:00Z');
    const rateEnd = new Date(rate.endDate + 'T00:00:00Z');
    const tempDate = new Date(Math.max(rateStart.getTime(), startDate.getTime()));
    tempDate.setUTCHours(0, 0, 0, 0);
    const tempEndDate = new Date(Math.min(rateEnd.getTime(), endDate.getTime()));
    tempEndDate.setUTCHours(0, 0, 0, 0);
    
    while (tempDate <= tempEndDate) {
      const dateStr = tempDate.toISOString().split('T')[0];
      // Only set if not already set (priority to earlier created rates)
      if (!dateToSeasonalRate.has(dateStr)) {
        dateToSeasonalRate.set(dateStr, rate);
      }
      tempDate.setUTCDate(tempDate.getUTCDate() + 1);
    }
  }
  
  // Reset current date for counting
  currentDate.setTime(startDate.getTime());
  currentDate.setUTCHours(0, 0, 0, 0);
  
  // Count weekdays and weekends
  while (currentDate <= endDateNormalized) {
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend) {
      weekendCount++;
    } else {
      weekdayCount++;
    }
    
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // Calculate cost with seasonal rate priority
  // Priority: Seasonal rates > Weekend rates > Base rates
  let totalAmount = 0;
  const seasonalDaysInfo: { date: string; rate: number; name: string }[] = [];

  // Reset current date for calculation
  currentDate.setTime(startDate.getTime());
  currentDate.setUTCHours(0, 0, 0, 0);

  while (currentDate <= endDateNormalized) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const seasonalRate = dateToSeasonalRate.get(dateStr);
    
    let dayRate: number;
    
    if (seasonalRate) {
      // Priority 1: Seasonal rate
      if (isWeekend && seasonalRate.weekendRate) {
        dayRate = Number(seasonalRate.weekendRate);
      } else if (!isWeekend && seasonalRate.weekdayRate) {
        dayRate = Number(seasonalRate.weekdayRate);
      } else if (seasonalRate.weekdayRate) {
        // If only weekday rate is set, use it for both
        dayRate = Number(seasonalRate.weekdayRate);
      } else if (seasonalRate.weekendRate) {
        // If only weekend rate is set, use it for both
        dayRate = Number(seasonalRate.weekendRate);
      } else {
        // Fallback to base rates if seasonal rate exists but no rates are set
        dayRate = isWeekend ? baseWeekendPricePerDay : basePricePerDay;
      }
      
      seasonalDaysInfo.push({
        date: dateStr,
        rate: dayRate,
        name: seasonalRate.name,
      });
    } else {
      // Priority 2 & 3: Weekend rate or base rate
      dayRate = isWeekend ? baseWeekendPricePerDay : basePricePerDay;
    }
    
    totalAmount += dayRate;
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return {
    totalAmount,
    weekdayCount,
    weekendCount,
    seasonalDays: seasonalDaysInfo.length > 0 ? seasonalDaysInfo : undefined,
  };
}
