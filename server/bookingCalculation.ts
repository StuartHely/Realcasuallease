/**
 * Calculate booking cost with support for different weekday and weekend rates
 */

interface Site {
  pricePerDay: string | number;
  pricePerWeek: string | number;
  weekendPricePerDay?: string | number | null;
}

export function calculateBookingCost(
  site: Site,
  startDate: Date,
  endDate: Date
): { totalAmount: number; weekdayCount: number; weekendCount: number } {
  const pricePerDay = Number(site.pricePerDay);
  const pricePerWeek = Number(site.pricePerWeek);
  const weekendPricePerDay = site.weekendPricePerDay ? Number(site.weekendPricePerDay) : pricePerDay;

  // Calculate total days (inclusive of both start and end dates)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Count weekdays and weekend days (inclusive)
  let weekdayCount = 0;
  let weekendCount = 0;

  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const endDateNormalized = new Date(endDate);
  endDateNormalized.setHours(0, 0, 0, 0);
  
  while (currentDate <= endDateNormalized) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount++;
    } else {
      weekdayCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate cost
  // Check if we can use weekly rate (7 consecutive days)
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  let totalAmount = 0;

  if (weeks > 0) {
    // Use weekly rate for full weeks
    totalAmount += weeks * pricePerWeek;

    // Calculate remaining days
    const remainingDate = new Date(startDate);
    remainingDate.setDate(remainingDate.getDate() + (weeks * 7));

    for (let i = 0; i < remainingDays; i++) {
      const dayOfWeek = remainingDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totalAmount += weekendPricePerDay;
      } else {
        totalAmount += pricePerDay;
      }
      remainingDate.setDate(remainingDate.getDate() + 1);
    }
  } else {
    // All daily rates
    totalAmount = (weekdayCount * pricePerDay) + (weekendCount * weekendPricePerDay);
  }

  return {
    totalAmount,
    weekdayCount,
    weekendCount,
  };
}
