import { UserId } from '../../domain/value-objects/user-id.value-object';
import { GeoLocation } from '../../domain/value-objects/geo-location.value-object';

export interface LocationUpdate {
  id: string;
  bookingId: string;
  guardId: UserId;
  location: GeoLocation;
  accuracyMeters?: number;
  timestamp: Date;
}

/**
 * Repository interface for location updates
 * Implementations should be in the infrastructure layer
 */
export interface ILocationRepository {
  /**
   * Save a new location update
   */
  save(locationUpdate: Omit<LocationUpdate, 'id'>): Promise<LocationUpdate>;

  /**
   * Get the latest location for a guard on a specific booking
   */
  getLatestLocationForBooking(bookingId: string): Promise<LocationUpdate | null>;

  /**
   * Get all location updates for a booking (for history/debugging)
   */
  findByBookingId(bookingId: string): Promise<LocationUpdate[]>;

  /**
   * Delete old location updates (cleanup for MVP - optional)
   */
  deleteOlderThan(date: Date): Promise<void>;
}
