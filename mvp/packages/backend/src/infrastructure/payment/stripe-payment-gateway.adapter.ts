import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IPaymentGateway,
  PaymentIntentResult,
  PaymentCaptureResult,
} from '../../application/ports/payment-gateway.interface';
import { Money } from '../../domain/value-objects/money.value-object';

/**
 * Stripe Payment Gateway Adapter
 * Implements IPaymentGateway using Stripe API
 */
@Injectable()
export class StripePaymentGatewayAdapter implements IPaymentGateway {
  private readonly logger = new Logger(StripePaymentGatewayAdapter.name);
  private readonly stripe: Stripe;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-10-29.clover',
    });

    this.logger.log('Stripe Payment Gateway initialized');
  }

  /**
   * Authorize a payment (create payment intent with manual capture)
   * This holds the funds but doesn't charge the customer yet
   */
  async authorizePayment(
    amount: Money,
    customerId: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    try {
      const amountInCents = this.convertToSmallestUnit(amount);
      const currency = amount.getCurrency().toLowerCase();

      this.logger.log(
        `Authorizing payment: ${amount.toString()} for customer ${customerId}`,
      );

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        capture_method: 'manual', // Don't capture immediately
        metadata: {
          customerId,
          ...metadata,
        },
      });

      this.logger.log(`Payment authorized: ${paymentIntent.id}`);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        status: paymentIntent.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to authorize payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleStripeError(error);
    }
  }

  /**
   * Capture a previously authorized payment
   * This actually charges the customer
   */
  async capturePayment(
    paymentIntentId: string,
    amount?: Money,
  ): Promise<PaymentCaptureResult> {
    try {
      this.logger.log(`Capturing payment: ${paymentIntentId}`);

      const captureParams: Stripe.PaymentIntentCaptureParams = {};
      if (amount) {
        captureParams.amount_to_capture = this.convertToSmallestUnit(amount);
      }

      const paymentIntent =
        await this.stripe.paymentIntents.capture(paymentIntentId, captureParams);

      this.logger.log(`Payment captured: ${paymentIntent.id}`);

      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amountCaptured: this.convertFromSmallestUnit(
          paymentIntent.amount_received,
          paymentIntent.currency,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to capture payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleStripeError(error);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPayment(paymentIntentId: string): Promise<void> {
    try {
      this.logger.log(`Cancelling payment: ${paymentIntentId}`);

      await this.stripe.paymentIntents.cancel(paymentIntentId);

      this.logger.log(`Payment cancelled: ${paymentIntentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleStripeError(error);
    }
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: Money,
  ): Promise<{ refundId: string; status: string }> {
    try {
      this.logger.log(`Refunding payment: ${paymentIntentId}`);

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = this.convertToSmallestUnit(amount);
      }

      const refund = await this.stripe.refunds.create(refundParams);

      this.logger.log(`Payment refunded: ${refund.id}`);

      return {
        refundId: refund.id,
        status: refund.status || 'unknown',
      };
    } catch (error) {
      this.logger.error(
        `Failed to refund payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleStripeError(error);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    try {
      this.logger.log(`Getting payment status: ${paymentIntentId}`);

      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return paymentIntent.status;
    } catch (error) {
      this.logger.error(
        `Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleStripeError(error);
    }
  }

  /**
   * Convert Money to smallest currency unit (cents for USD)
   * Stripe expects amounts in the smallest currency unit
   */
  private convertToSmallestUnit(money: Money): number {
    return Math.round(money.getAmount() * 100);
  }

  /**
   * Convert from smallest currency unit to Money
   */
  private convertFromSmallestUnit(
    amountInCents: number,
    currency: string,
  ): Money {
    const amountInDollars = amountInCents / 100;
    return new Money(amountInDollars, currency.toUpperCase());
  }

  /**
   * Handle Stripe errors and convert them to domain errors
   */
  private handleStripeError(error: unknown): Error {
    if (error instanceof Stripe.errors.StripeError) {
      const message = error.message || 'Stripe error occurred';
      return new Error(`Payment gateway error: ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown payment gateway error');
  }
}
