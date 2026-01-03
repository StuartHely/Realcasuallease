import * as db from "./db";

/**
 * Calculate equipment availability for a centre on a specific date
 * Returns remaining tables and chairs after accounting for all bookings on that date
 */
export async function getEquipmentAvailability(
  centreId: number,
  date: Date,
  excludeBookingId?: number
): Promise<{
  tablesAvailable: number;
  chairsAvailable: number;
  totalTables: number;
  totalChairs: number;
}> {
  // Get centre's total equipment
  const centre = await db.getShoppingCentreById(centreId);
  if (!centre) {
    throw new Error("Centre not found");
  }

  const totalTables = centre.totalTablesAvailable || 0;
  const totalChairs = centre.totalChairsAvailable || 0;

  // Get all confirmed bookings for this centre on this date
  const sites = await db.getSitesByCentreId(centreId);
  const siteIds = sites.map(s => s.id);

  // Calculate used equipment across all sites
  let tablesUsed = 0;
  let chairsUsed = 0;

  for (const siteId of siteIds) {
    const bookings = await db.getBookingsBySiteId(siteId, date, date);
    
    for (const booking of bookings) {
      // Skip the booking we're updating (if any)
      if (excludeBookingId && booking.id === excludeBookingId) {
        continue;
      }
      
      // Only count confirmed bookings
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        tablesUsed += booking.tablesRequested || 0;
        chairsUsed += booking.chairsRequested || 0;
      }
    }
  }

  return {
    tablesAvailable: Math.max(0, totalTables - tablesUsed),
    chairsAvailable: Math.max(0, totalChairs - chairsUsed),
    totalTables,
    totalChairs,
  };
}

/**
 * Check if requested equipment is available for a date range
 * Returns availability info and warnings
 */
export async function checkEquipmentAvailability(
  centreId: number,
  startDate: Date,
  endDate: Date,
  tablesRequested: number,
  chairsRequested: number,
  excludeBookingId?: number
): Promise<{
  available: boolean;
  tablesShortfall: number;
  chairsShortfall: number;
  message?: string;
}> {
  // Check each date in the range
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  let maxTablesShortfall = 0;
  let maxChairsShortfall = 0;

  for (const date of dates) {
    const availability = await getEquipmentAvailability(centreId, date, excludeBookingId);
    
    const tablesShortfall = Math.max(0, tablesRequested - availability.tablesAvailable);
    const chairsShortfall = Math.max(0, chairsRequested - availability.chairsAvailable);
    
    maxTablesShortfall = Math.max(maxTablesShortfall, tablesShortfall);
    maxChairsShortfall = Math.max(maxChairsShortfall, chairsShortfall);
  }

  const available = maxTablesShortfall === 0 && maxChairsShortfall === 0;
  
  let message: string | undefined;
  if (!available) {
    const parts: string[] = [];
    if (maxTablesShortfall > 0) {
      parts.push(`only ${tablesRequested - maxTablesShortfall} tables are available (you requested ${tablesRequested})`);
    }
    if (maxChairsShortfall > 0) {
      parts.push(`only ${chairsRequested - maxChairsShortfall} chairs are available (you requested ${chairsRequested})`);
    }
    message = `Unfortunately, ${parts.join(' and ')}. You will need to provide the shortfall.`;
  }

  return {
    available,
    tablesShortfall: maxTablesShortfall,
    chairsShortfall: maxChairsShortfall,
    message,
  };
}
