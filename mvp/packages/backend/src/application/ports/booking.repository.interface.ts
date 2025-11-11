import { Booking, BookingStatus } from '../../domain/entities/booking.entity';
import { UserId } from '../../domain/value-objects/user-id.value-object';

/**
 * Repository interface for Booking entity (Port)
 * Implementations should be in the infrastructure layer
 */
export interface IBookingRepository {
  /**
   * Save a new booking
   */
  save(booking: Booking): Promise<Booking>;

  /**
   * Find booking by ID
   */
  findById(id: string): Promise<Booking | null>;

  /**
   * Update existing booking
   */
  update(booking: Booking): Promise<Booking>;

  /**
   * Find all bookings for a customer
   */
  findByCustomerId(customerId: UserId): Promise<Booking[]>;

  /**
   * Find all bookings for a guard
   */
  findByGuardId(guardId: UserId): Promise<Booking[]>;

  /**
   * Find bookings by status
   */
  findByStatus(status: BookingStatus): Promise<Booking[]>;

  /**
   * Find active booking for a guard (IN_PROGRESS status)
   */
  findActiveBookingForGuard(guardId: UserId): Promise<Booking | null>;

  /**
   * Find all available bookings (REQUESTED status)
   */
  findAvailableBookings(): Promise<Booking[]>;
}
