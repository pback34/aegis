import { Payment, PaymentStatus } from '../../../domain/entities/payment.entity';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { PaymentEntity } from '../../database/entities/payment.entity';

export class PaymentMapper {
  static toDomain(entity: PaymentEntity): Payment {
    return new Payment({
      id: entity.id,
      bookingId: entity.booking_id,
      customerId: new UserId(entity.customer_id),
      guardId: new UserId(entity.guard_id),
      amount: new Money(entity.amount),
      platformFee: new Money(entity.platform_fee),
      guardPayout: new Money(entity.guard_payout),
      status: entity.status as PaymentStatus,
      stripePaymentIntentId: entity.stripe_payment_intent_id || undefined,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toPersistence(payment: Payment): Partial<PaymentEntity> {
    return {
      id: payment.getId(),
      booking_id: payment.getBookingId(),
      customer_id: payment.getCustomerId().getValue(),
      guard_id: payment.getGuardId().getValue(),
      amount: payment.getAmount().getAmount(),
      platform_fee: payment.getPlatformFee().getAmount(),
      guard_payout: payment.getGuardPayout().getAmount(),
      status: payment.getStatus(),
      stripe_payment_intent_id: payment.getStripePaymentIntentId() || null,
      created_at: payment.getCreatedAt(),
      updated_at: payment.getUpdatedAt(),
    };
  }
}
