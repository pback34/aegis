/**
 * Distance Calculator using Haversine Formula
 * Calculates the great-circle distance between two points on Earth
 */

const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param point1 First coordinate
 * @param point2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate estimated time of arrival in minutes
 * Assumes average speed of 40 km/h in urban areas
 * @param distanceKm Distance in kilometers
 * @returns ETA in minutes
 */
export function calculateETA(distanceKm: number): number {
  const AVERAGE_SPEED_KMH = 40;
  const timeHours = distanceKm / AVERAGE_SPEED_KMH;
  const timeMinutes = Math.ceil(timeHours * 60);
  return timeMinutes;
}

/**
 * Check if a point is within a circular radius
 * @param center Center point
 * @param point Point to check
 * @param radiusKm Radius in kilometers
 * @returns true if point is within radius
 */
export function isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
}
