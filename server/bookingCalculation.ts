/**
 * Calculate booking cost with support for different weekday and weekend rates.
 * Uses a unified segment-based algorithm:
 *   1. Map each day to its seasonal rate (or base)
 *   2. Group consecutive days sharing the same rate type into segments
 *   3. Price each segment: weekly blocks where possible, then daily remainder
 *
 * Priority: Seasonal rates > Weekend rates > Base rates
 */

import { getSeasonalRatesForDateRange } from './seasonalRatesDb';

interface Site {
  id: number;
  pricePerDay: string | number | null;
  pricePerWeek: string | number | null;
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
): Promise<{ totalAmount: number; weekdayCount: number; weekendCount: number; seasonalDays?: { date: string; rate: number; name: string; isSeasonalRate: boolean }[] }> {
  const basePricePerDay = Number(site.pricePerDay ?? 150);
  const pricePerWeek = Number(site.pricePerWeek ?? 0);
  const baseWeekendPricePerDay = site.weekendPricePerDay ? Number(site.weekendPricePerDay) : basePricePerDay;

  // Normalize dates to UTC
  const startNorm = new Date(startDate);
  startNorm.setUTCHours(0, 0, 0, 0);
  const endNorm = new Date(endDate);
  endNorm.setUTCHours(0, 0, 0, 0);

  // 1. Fetch seasonal rates
  const startDateStr = startNorm.toISOString().split('T')[0];
  const endDateStr = endNorm.toISOString().split('T')[0];
  const seasonalRatesInRange = await getSeasonalRatesForDateRange(site.id, startDateStr, endDateStr);

  // 2. Build dateToSeasonalRate map
  const dateToSeasonalRate = new Map<string, SeasonalRate>();
  for (const rate of seasonalRatesInRange) {
    const rateStart = new Date(rate.startDate + 'T00:00:00Z');
    const rateEnd = new Date(rate.endDate + 'T00:00:00Z');
    const tempDate = new Date(Math.max(rateStart.getTime(), startNorm.getTime()));
    tempDate.setUTCHours(0, 0, 0, 0);
    const tempEndDate = new Date(Math.min(rateEnd.getTime(), endNorm.getTime()));
    tempEndDate.setUTCHours(0, 0, 0, 0);

    while (tempDate <= tempEndDate) {
      const dateStr = tempDate.toISOString().split('T')[0];
      if (!dateToSeasonalRate.has(dateStr)) {
        dateToSeasonalRate.set(dateStr, rate);
      }
      tempDate.setUTCDate(tempDate.getUTCDate() + 1);
    }
  }

  // 3. Build ordered list of days with their rate info
  interface DayInfo {
    dateStr: string;
    isWeekend: boolean;
    seasonalRate: SeasonalRate | null;
    segmentKey: string;
  }

  const days: DayInfo[] = [];
  let weekdayCount = 0;
  let weekendCount = 0;
  const cursor = new Date(startNorm);

  while (cursor <= endNorm) {
    const dateStr = cursor.toISOString().split('T')[0];
    const dayOfWeek = cursor.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) weekendCount++;
    else weekdayCount++;

    const sr = dateToSeasonalRate.get(dateStr) || null;
    days.push({
      dateStr,
      isWeekend,
      seasonalRate: sr,
      segmentKey: sr ? `seasonal-${sr.id}` : 'base',
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // 4. Group consecutive days into segments
  interface Segment {
    key: string;
    seasonalRate: SeasonalRate | null;
    days: DayInfo[];
  }

  const segments: Segment[] = [];
  for (const day of days) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg && lastSeg.key === day.segmentKey) {
      lastSeg.days.push(day);
    } else {
      segments.push({ key: day.segmentKey, seasonalRate: day.seasonalRate, days: [day] });
    }
  }

  // 5. Price each segment
  let totalAmount = 0;
  const allDaysInfo: { date: string; rate: number; name: string; isSeasonalRate: boolean }[] = [];

  for (const seg of segments) {
    // Determine weekly rate for this segment
    let segWeeklyRate: number | null = null;
    if (seg.seasonalRate && seg.seasonalRate.weeklyRate) {
      segWeeklyRate = Number(seg.seasonalRate.weeklyRate);
    } else if (!seg.seasonalRate && pricePerWeek > 0) {
      segWeeklyRate = pricePerWeek;
    }

    const segDays = seg.days;
    let consumed = 0;

    // Consume complete 7-day weeks if weekly rate available
    if (segWeeklyRate !== null && segDays.length >= 7) {
      const fullWeeks = Math.floor(segDays.length / 7);
      totalAmount += fullWeeks * segWeeklyRate;
      consumed = fullWeeks * 7;

      for (let i = 0; i < consumed; i++) {
        const d = segDays[i];
        allDaysInfo.push({
          date: d.dateStr,
          rate: segWeeklyRate / 7,
          name: seg.seasonalRate ? `${seg.seasonalRate.name} (Weekly)` : 'Weekly Rate',
          isSeasonalRate: !!seg.seasonalRate,
        });
      }
    }

    // Price remaining days at daily rates
    for (let i = consumed; i < segDays.length; i++) {
      const d = segDays[i];
      let dayRate: number;

      if (seg.seasonalRate) {
        const sr = seg.seasonalRate;
        if (d.isWeekend && sr.weekendRate) {
          dayRate = Number(sr.weekendRate);
        } else if (!d.isWeekend && sr.weekdayRate) {
          dayRate = Number(sr.weekdayRate);
        } else if (sr.weekdayRate) {
          dayRate = Number(sr.weekdayRate);
        } else if (sr.weekendRate) {
          dayRate = Number(sr.weekendRate);
        } else {
          dayRate = d.isWeekend ? baseWeekendPricePerDay : basePricePerDay;
        }

        allDaysInfo.push({
          date: d.dateStr,
          rate: dayRate,
          name: sr.name,
          isSeasonalRate: true,
        });
      } else {
        dayRate = d.isWeekend ? baseWeekendPricePerDay : basePricePerDay;
        allDaysInfo.push({
          date: d.dateStr,
          rate: dayRate,
          name: d.isWeekend ? 'Weekend' : 'Weekday',
          isSeasonalRate: false,
        });
      }

      totalAmount += dayRate;
    }
  }

  return { totalAmount, weekdayCount, weekendCount, seasonalDays: allDaysInfo };
}
