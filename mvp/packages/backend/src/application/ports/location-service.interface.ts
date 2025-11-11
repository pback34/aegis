import { GeoLocation } from '../../domain/value-objects/geo-location.value-object';

export interface LocationUpdatePayload {
  bookingId: string;
  guardId: string;
  location: GeoLocation;
  timestamp: Date;
}

/**
 * Location Service interface (Port)
 * Implementations should be in the infrastructure layer (e.g., AblyLocationService)
 * Responsible for publishing real-time location updates
 */
export interface ILocationService {
  /**
   * Publish a location update to the real-time channel
   * Channel format: jobs:{jobId}:location
   */
  publishLocationUpdate(payload: LocationUpdatePayload): Promise<void>;

  /**
   * Subscribe to location updates for a specific booking
   * Returns an unsubscribe function
   */
  subscribeToLocationUpdates(
    bookingId: string,
    callback: (payload: LocationUpdatePayload) => void,
  ): Promise<() => void>;
}
