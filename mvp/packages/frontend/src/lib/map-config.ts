import { apiClient } from './api-client';

export interface MapConfig {
  mapboxToken: string;
  ablyKey: string;
}

let cachedConfig: MapConfig | null = null;

/**
 * Fetch map configuration from the backend
 * This includes Mapbox token and Ably API key
 */
export async function getMapConfig(): Promise<MapConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await apiClient.get<MapConfig>('/map/config');
    cachedConfig = response.data;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to fetch map config:', error);
    throw new Error('Unable to load map configuration. Please try again later.');
  }
}

/**
 * Clear the cached config (useful for testing or if config changes)
 */
export function clearMapConfigCache(): void {
  cachedConfig = null;
}
