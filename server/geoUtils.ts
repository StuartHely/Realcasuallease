/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
  // Convert degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Find centres within a specified radius of a given centre
 * @param centres Array of all centres with coordinates
 * @param targetCentreId ID of the centre to find nearby centres for
 * @param radiusKm Maximum distance in kilometers (default: 10)
 * @returns Array of nearby centres with distances, sorted by distance
 */
export function findNearbyCentres(
  centres: Array<{
    id: number;
    name: string;
    latitude: string | null;
    longitude: string | null;
    address?: string | null;
    state?: string | null;
  }>,
  targetCentreId: number,
  radiusKm: number = 10
): Array<{
  id: number;
  name: string;
  address: string | null;
  state: string | null;
  latitude: string;
  longitude: string;
  distance: number;
}> {
  // Find the target centre
  const targetCentre = centres.find((c) => c.id === targetCentreId);
  
  if (!targetCentre || !targetCentre.latitude || !targetCentre.longitude) {
    return [];
  }

  const targetLat = parseFloat(targetCentre.latitude);
  const targetLon = parseFloat(targetCentre.longitude);

  if (isNaN(targetLat) || isNaN(targetLon)) {
    return [];
  }

  // Calculate distances to all other centres
  const nearbyCentres = centres
    .filter((c) => c.id !== targetCentreId && c.latitude && c.longitude)
    .map((c) => {
      const lat = parseFloat(c.latitude!);
      const lon = parseFloat(c.longitude!);
      
      if (isNaN(lat) || isNaN(lon)) {
        return null;
      }

      const distance = calculateDistance(targetLat, targetLon, lat, lon);

      return {
        id: c.id,
        name: c.name,
        address: c.address || null,
        state: c.state || null,
        latitude: c.latitude!,
        longitude: c.longitude!,
        distance,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return nearbyCentres;
}
