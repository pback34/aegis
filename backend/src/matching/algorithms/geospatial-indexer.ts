/**
 * Geospatial Indexer using H3 Hexagonal Grid System
 * Used by Uber for geospatial indexing and distance calculations
 */

import { geoToH3, h3ToGeo, kRing, h3Distance } from 'h3-js';

// H3 resolution 9 gives ~0.1 km² hexagons (ideal for city-level matching)
const H3_RESOLUTION = 9;

export interface H3Location {
  h3Index: string;
  latitude: number;
  longitude: number;
}

/**
 * Convert latitude/longitude to H3 index
 * @param latitude
 * @param longitude
 * @param resolution H3 resolution level (default 9)
 * @returns H3 index string
 */
export function coordinatesToH3(
  latitude: number,
  longitude: number,
  resolution: number = H3_RESOLUTION,
): string {
  return geoToH3(latitude, longitude, resolution);
}

/**
 * Convert H3 index back to latitude/longitude
 * @param h3Index H3 index string
 * @returns [latitude, longitude]
 */
export function h3ToCoordinates(h3Index: string): [number, number] {
  return h3ToGeo(h3Index);
}

/**
 * Get nearby hexagons within k rings
 * k=1 gives 6 neighbors, k=2 gives 18, k=3 gives 36, etc.
 * @param h3Index Center hexagon
 * @param k Number of rings to expand
 * @returns Array of H3 indexes
 */
export function getNearbyHexagons(h3Index: string, k: number = 2): string[] {
  return kRing(h3Index, k);
}

/**
 * Calculate distance between two H3 indexes in number of hexagons
 * @param h3Index1 First H3 index
 * @param h3Index2 Second H3 index
 * @returns Number of hexagons between them
 */
export function getH3Distance(h3Index1: string, h3Index2: string): number {
  return h3Distance(h3Index1, h3Index2);
}

/**
 * Get H3 indexes for expanding search radius
 * Starts with k=1 and expands until reaching desired radius
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param maxRadiusKm Maximum search radius in km
 * @returns Array of H3 indexes to search
 */
export function getSearchHexagons(
  latitude: number,
  longitude: number,
  maxRadiusKm: number = 10,
): string[] {
  const centerH3 = coordinatesToH3(latitude, longitude);

  // Approximate: each ring at resolution 9 is ~0.3km
  // So k = Math.ceil(maxRadiusKm / 0.3)
  const k = Math.min(Math.ceil(maxRadiusKm / 0.3), 10); // Cap at k=10 for performance

  return getNearbyHexagons(centerH3, k);
}

/**
 * Create Redis key for storing guards in H3 hexagon
 * @param h3Index H3 index
 * @returns Redis key
 */
export function getH3RedisKey(h3Index: string): string {
  return `h3:guards:${h3Index}`;
}
