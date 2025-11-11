import { StripePaymentGatewayAdapter } from './stripe-payment-gateway.adapter';
import { Money } from '../../domain/value-objects/money.value-object';
import Stripe from 'stripe';

// Mock the Stripe module
jest.mock('stripe');

describe('StripePaymentGatewayAdapter', () => {
  let adapter: StripePaymentGatewayAdapter;
  let mockPaymentIntentsCreate: jest.Mock;
  let mockPaymentIntentsCapture: jest.Mock;
  let mockPaymentIntentsCancel: jest.Mock;
  let mockPaymentIntentsRetrieve: jest.Mock;
  let mockRefundsCreate: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock functions
    mockPaymentIntentsCreate = jest.fn();
    mockPaymentIntentsCapture = jest.fn();
    mockPaymentIntentsCancel = jest.fn();
    mockPaymentIntentsRetrieve = jest.fn();
    mockRefundsCreate = jest.fn();

    // Mock Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      paymentIntents: {
        create: mockPaymentIntentsCreate,
        capture: mockPaymentIntentsCapture,
        cancel: mockPaymentIntentsCancel,
        retrieve: mockPaymentIntentsRetrieve,
      },
      refunds: {
        create: mockRefundsCreate,
      },
    }));

    // Create adapter instance
    adapter = new StripePaymentGatewayAdapter('sk_test_fake_key');
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new StripePaymentGatewayAdapter('')).toThrow(
        'Stripe API key is required',
      );
    });

    it('should initialize Stripe with correct API version', () => {
      expect(Stripe).toHaveBeenCalledWith('sk_test_fake_key', {
        apiVersion: '2025-10-29.clover',
      });
    });
  });

  describe('authorizePayment', () => {
    it('should create payment intent with manual capture', async () => {
      const amount = new Money(50.0, 'USD');
      const customerId = 'cust_123';
      const metadata = { bookingId: 'booking_123' };

      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret_abc',
      };

      mockPaymentIntentsCreate.mockResolvedValue(
        mockPaymentIntent as Stripe.PaymentIntent,
      );

      const result = await adapter.authorizePayment(amount, customerId, metadata);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 5000, // $50.00 in cents
        currency: 'usd',
        capture_method: 'manual',
        metadata: {
          customerId: 'cust_123',
          bookingId: 'booking_123',
        },
      });

      expect(result).toEqual({
        paymentIntentId: 'pi_123',
        clientSecret: 'pi_123_secret_abc',
        status: 'requires_payment_method',
      });
    });

    it('should handle payment authorization without metadata', async () => {
      const amount = new Money(25.5, 'USD');
      const customerId = 'cust_456';

      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_456',
        status: 'requires_payment_method',
        client_secret: 'pi_456_secret_xyz',
      };

      mockPaymentIntentsCreate.mockResolvedValue(
        mockPaymentIntent as Stripe.PaymentIntent,
      );

      const result = await adapter.authorizePayment(amount, customerId);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 2550, // $25.50 in cents
        currency: 'usd',
        capture_method: 'manual',
        metadata: {
          customerId: 'cust_456',
        },
      });

      expect(result.paymentIntentId).toBe('pi_456');
    });

    it('should handle different currencies', async () => {
      const amount = new Money(100.0, 'EUR');
      const customerId = 'cust_789';

      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_789',
        status: 'requires_payment_method',
        client_secret: 'pi_789_secret',
      };

      mockPaymentIntentsCreate.mockResolvedValue(
        mockPaymentIntent as Stripe.PaymentIntent,
      );

      await adapter.authorizePayment(amount, customerId);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          currency: 'eur',
        }),
      );
    });

    it('should handle Stripe errors gracefully', async () => {
      const amount = new Money(50.0, 'USD');
      const customerId = 'cust_123';

      const stripeError = new Stripe.errors.StripeError({
        type: 'card_error',
      });
      Object.defineProperty(stripeError, 'message', {
        value: 'Card declined',
        writable: false,
      });

      mockPaymentIntentsCreate.mockRejectedValue(stripeError);

      await expect(
        adapter.authorizePayment(amount, customerId),
      ).rejects.toThrow('Payment gateway error: Card declined');
    });

    it('should handle generic errors', async () => {
      const amount = new Money(50.0, 'USD');
      const customerId = 'cust_123';

      mockPaymentIntentsCreate.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        adapter.authorizePayment(amount, customerId),
      ).rejects.toThrow('Network error');
    });
  });

  describe('capturePayment', () => {
    it('should capture payment without specifying amount', async () => {
      const paymentIntentId = 'pi_123';

      const mockCapturedIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        status: 'succeeded',
        amount_received: 5000, // $50.00 in cents
        currency: 'usd',
      };

      mockPaymentIntentsCapture.mockResolvedValue(
        mockCapturedIntent as Stripe.PaymentIntent,
      );

      const result = await adapter.capturePayment(paymentIntentId);

      expect(mockPaymentIntentsCapture).toHaveBeenCalledWith(
        paymentIntentId,
        {},
      );

      expect(result).toEqual({
        paymentIntentId: 'pi_123',
        status: 'succeeded',
        amountCaptured: new Money(50.0, 'USD'),
      });
    });

    it('should capture payment with partial amount', async () => {
      const paymentIntentId = 'pi_123';
      const partialAmount = new Money(30.0, 'USD');

      const mockCapturedIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        status: 'succeeded',
        amount_received: 3000, // $30.00 in cents
        currency: 'usd',
      };

      mockPaymentIntentsCapture.mockResolvedValue(
        mockCapturedIntent as Stripe.PaymentIntent,
      );

      const result = await adapter.capturePayment(paymentIntentId, partialAmount);

      expect(mockPaymentIntentsCapture).toHaveBeenCalledWith(
        paymentIntentId,
        { amount_to_capture: 3000 },
      );

      expect(result.amountCaptured.getAmount()).toBe(30.0);
    });

    it('should handle capture errors', async () => {
      const paymentIntentId = 'pi_123';

      const stripeError = new Stripe.errors.StripeError({
        type: 'invalid_request_error',
      });
      Object.defineProperty(stripeError, 'message', {
        value: 'Payment intent already captured',
        writable: false,
      });

      mockPaymentIntentsCapture.mockRejectedValue(stripeError);

      await expect(adapter.capturePayment(paymentIntentId)).rejects.toThrow(
        'Payment gateway error: Payment intent already captured',
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment intent', async () => {
      const paymentIntentId = 'pi_123';

      const mockCancelledIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        status: 'canceled',
      };

      mockPaymentIntentsCancel.mockResolvedValue(
        mockCancelledIntent as Stripe.PaymentIntent,
      );

      await adapter.cancelPayment(paymentIntentId);

      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith(
        paymentIntentId,
      );
    });

    it('should handle cancellation errors', async () => {
      const paymentIntentId = 'pi_123';

      mockPaymentIntentsCancel.mockRejectedValue(
        new Error('Cannot cancel succeeded payment'),
      );

      await expect(adapter.cancelPayment(paymentIntentId)).rejects.toThrow(
        'Cannot cancel succeeded payment',
      );
    });
  });

  describe('refundPayment', () => {
    it('should refund full payment', async () => {
      const paymentIntentId = 'pi_123';

      const mockRefund: Partial<Stripe.Refund> = {
        id: 're_123',
        status: 'succeeded',
      };

      mockRefundsCreate.mockResolvedValue(
        mockRefund as Stripe.Refund,
      );

      const result = await adapter.refundPayment(paymentIntentId);

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
      });

      expect(result).toEqual({
        refundId: 're_123',
        status: 'succeeded',
      });
    });

    it('should refund partial amount', async () => {
      const paymentIntentId = 'pi_123';
      const refundAmount = new Money(20.0, 'USD');

      const mockRefund: Partial<Stripe.Refund> = {
        id: 're_456',
        status: 'succeeded',
      };

      mockRefundsCreate.mockResolvedValue(
        mockRefund as Stripe.Refund,
      );

      const result = await adapter.refundPayment(paymentIntentId, refundAmount);

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        amount: 2000, // $20.00 in cents
      });

      expect(result.refundId).toBe('re_456');
    });

    it('should handle refund errors', async () => {
      const paymentIntentId = 'pi_123';

      const stripeError = new Stripe.errors.StripeError({
        type: 'invalid_request_error',
      });
      Object.defineProperty(stripeError, 'message', {
        value: 'Charge already refunded',
        writable: false,
      });

      mockRefundsCreate.mockRejectedValue(stripeError);

      await expect(adapter.refundPayment(paymentIntentId)).rejects.toThrow(
        'Payment gateway error: Charge already refunded',
      );
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment intent status', async () => {
      const paymentIntentId = 'pi_123';

      const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
        id: 'pi_123',
        status: 'succeeded',
      };

      mockPaymentIntentsRetrieve.mockResolvedValue(
        mockPaymentIntent as Stripe.PaymentIntent,
      );

      const status = await adapter.getPaymentStatus(paymentIntentId);

      expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith(
        paymentIntentId,
      );
      expect(status).toBe('succeeded');
    });

    it('should handle different statuses', async () => {
      const statuses: Stripe.PaymentIntent.Status[] = [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'succeeded',
        'canceled',
      ];

      for (const expectedStatus of statuses) {
        const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
          id: 'pi_test',
          status: expectedStatus,
        };

        mockPaymentIntentsRetrieve.mockResolvedValue(
          mockPaymentIntent as Stripe.PaymentIntent,
        );

        const status = await adapter.getPaymentStatus('pi_test');
        expect(status).toBe(expectedStatus);
      }
    });

    it('should handle retrieval errors', async () => {
      const paymentIntentId = 'pi_invalid';

      mockPaymentIntentsRetrieve.mockRejectedValue(
        new Error('Payment intent not found'),
      );

      await expect(adapter.getPaymentStatus(paymentIntentId)).rejects.toThrow(
        'Payment intent not found',
      );
    });
  });

  describe('currency conversion', () => {
    it('should correctly convert dollars to cents', async () => {
      const testCases = [
        { dollars: 1.0, cents: 100 },
        { dollars: 10.5, cents: 1050 },
        { dollars: 99.99, cents: 9999 },
        { dollars: 0.01, cents: 1 },
        { dollars: 1234.56, cents: 123456 },
      ];

      for (const { dollars, cents } of testCases) {
        const amount = new Money(dollars, 'USD');
        const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
          id: 'pi_test',
          status: 'requires_payment_method',
          client_secret: 'secret',
        };

        mockPaymentIntentsCreate.mockResolvedValue(
          mockPaymentIntent as Stripe.PaymentIntent,
        );

        await adapter.authorizePayment(amount, 'cust_test');

        expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
          expect.objectContaining({ amount: cents }),
        );
      }
    });

    it('should correctly convert cents to Money', async () => {
      const testCases = [
        { cents: 100, dollars: 1.0 },
        { cents: 1050, dollars: 10.5 },
        { cents: 9999, dollars: 99.99 },
        { cents: 1, dollars: 0.01 },
      ];

      for (const { cents, dollars } of testCases) {
        const mockCapturedIntent: Partial<Stripe.PaymentIntent> = {
          id: 'pi_test',
          status: 'succeeded',
          amount_received: cents,
          currency: 'usd',
        };

        mockPaymentIntentsCapture.mockResolvedValue(
          mockCapturedIntent as Stripe.PaymentIntent,
        );

        const result = await adapter.capturePayment('pi_test');

        expect(result.amountCaptured.getAmount()).toBe(dollars);
      }
    });
  });
});
