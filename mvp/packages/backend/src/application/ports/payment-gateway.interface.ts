import { Money } from '../../domain/value-objects/money.value-object';

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
}

export interface PaymentCaptureResult {
  paymentIntentId: string;
  status: string;
  amountCaptured: Money;
}

/**
 * Payment Gateway interface (Port)
 * Implementations should be in the infrastructure layer (e.g., StripePaymentGateway)
 */
export interface IPaymentGateway {
  /**
   * Authorize a payment (create payment intent)
   * This holds the funds but doesn't charge the customer yet
   */
  authorizePayment(
    amount: Money,
    customerId: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult>;

  /**
   * Capture a previously authorized payment
   * This actually charges the customer
   */
  capturePayment(
    paymentIntentId: string,
    amount?: Money,
  ): Promise<PaymentCaptureResult>;

  /**
   * Cancel a payment intent
   */
  cancelPayment(paymentIntentId: string): Promise<void>;

  /**
   * Refund a captured payment
   */
  refundPayment(
    paymentIntentId: string,
    amount?: Money,
  ): Promise<{ refundId: string; status: string }>;

  /**
   * Get payment status
   */
  getPaymentStatus(paymentIntentId: string): Promise<string>;
}
