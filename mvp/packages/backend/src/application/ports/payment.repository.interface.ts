import { Payment, PaymentStatus } from '../../domain/entities/payment.entity';
import { UserId } from '../../domain/value-objects/user-id.value-object';

/**
 * Repository interface for Payment entity (Port)
 * Implementations should be in the infrastructure layer
 */
export interface IPaymentRepository {
  /**
   * Save a new payment
   */
  save(payment: Payment): Promise<Payment>;

  /**
   * Find payment by ID
   */
  findById(id: string): Promise<Payment | null>;

  /**
   * Update existing payment
   */
  update(payment: Payment): Promise<Payment>;

  /**
   * Find payment by booking ID
   */
  findByBookingId(bookingId: string): Promise<Payment | null>;

  /**
   * Find payments by customer ID
   */
  findByCustomerId(customerId: UserId): Promise<Payment[]>;

  /**
   * Find payments by guard ID
   */
  findByGuardId(guardId: UserId): Promise<Payment[]>;

  /**
   * Find payments by status
   */
  findByStatus(status: PaymentStatus): Promise<Payment[]>;

  /**
   * Find payment by Stripe payment intent ID
   */
  findByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<Payment | null>;
}
